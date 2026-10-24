import { CREDIT_STAKE_MIN_CENTS, TOPUP_PRESETS_CENTS } from '../shared/rules';
import type { CheckoutLinkDto, WalletDto, WalletEntryDto, WithdrawResultDto } from '../shared/types';
import { query, withTransaction, type Queryable } from './db';
import { HttpError } from './http';
import { createTopupCheckout, refundStakePayment } from './whop';

// Saldo prepagado (docs/01). El usuario recarga en Whop una vez y paga los pactos con el saldo:
// sin comisión por pacto, con stakes desde $1, y el stake de un pacto cumplido vuelve al saldo al
// momento. Retirar devuelve el saldo a la tarjeta con reembolsos parciales de las recargas.

const HISTORY_LIMIT = 30;
const OPEN_STATUSES = ['ACTIVE', 'AI_REVIEW', 'JURY_PENDING', 'MICRO_TASK_PENDING'];

const BALANCE_SQL = `
  coalesce(sum(case when type in ('topup', 'release', 'vault_unlock') then amount_cents else -amount_cents end), 0)`;

export async function walletBalanceCents(q: Queryable, userId: string): Promise<number> {
  const { rows } = await q<{ balance: string }>(`select ${BALANCE_SQL} as balance from pacta.wallet_ledger where user_id = $1`, [userId]);
  return Number(rows[0].balance);
}

async function loadWallet(q: Queryable, userId: string): Promise<WalletDto> {
  const [balanceCents, held, ledger] = await Promise.all([
    walletBalanceCents(q, userId),
    q<{ held: string }>(
      'select coalesce(sum(stake_cents), 0) as held from pacta.pacts where user_id = $1 and paid_with_credit and status = any($2)',
      [userId, OPEN_STATUSES],
    ),
    q<{ id: string; type: WalletEntryDto['type']; amount_cents: number; created_at: Date; title: string | null }>(
      `select w.id, w.type, w.amount_cents, w.created_at, p.title
         from pacta.wallet_ledger w left join pacta.pacts p on p.id = w.pact_id
        where w.user_id = $1 order by w.created_at desc limit $2`,
      [userId, HISTORY_LIMIT],
    ),
  ]);
  return {
    balanceCents,
    heldCents: Number(held.rows[0].held),
    entries: ledger.rows.map((e) => ({ id: e.id, type: e.type, amountCents: e.amount_cents, at: e.created_at.getTime(), pactTitle: e.title ?? undefined })),
  };
}

export function walletSummary(userId: string): Promise<WalletDto> {
  return loadWallet(query, userId);
}

export async function topupCheckout(userId: string, amountCents: unknown): Promise<CheckoutLinkDto> {
  if (!TOPUP_PRESETS_CENTS.includes(amountCents as (typeof TOPUP_PRESETS_CENTS)[number])) throw new HttpError(400, 'bad_topup');
  return createTopupCheckout(userId, amountCents as number);
}

// Abona una recarga pagada (webhook payment.succeeded). Idempotente por el id del pago.
export async function creditTopup(q: Queryable, userId: string, amountCents: number, paymentId: string): Promise<boolean> {
  if (!TOPUP_PRESETS_CENTS.includes(amountCents as (typeof TOPUP_PRESETS_CENTS)[number])) return false;
  const { rowCount } = await q(
    `insert into pacta.wallet_ledger (user_id, type, amount_cents, whop_ref)
     select $1, 'topup', $2, $3 where exists (select 1 from pacta.users where id = $1)
     on conflict (whop_ref) where type = 'topup' do nothing`,
    [userId, amountCents, paymentId],
  );
  return (rowCount ?? 0) > 0;
}

// Retiene el stake de un pacto pagado con el saldo. Quien llama tiene bloqueada la fila del usuario.
export async function holdStake(q: Queryable, userId: string, pactId: string, stakeCents: number) {
  if (stakeCents < CREDIT_STAKE_MIN_CENTS) throw new HttpError(400, 'bad_stake');
  if ((await walletBalanceCents(q, userId)) < stakeCents) throw new HttpError(402, 'insufficient_balance');
  await q("insert into pacta.wallet_ledger (user_id, type, amount_cents, pact_id) values ($1, 'hold', $2, $3)", [userId, stakeCents, pactId]);
}

// Pacto cumplido: el stake vuelve al saldo, sin pasar por Whop.
export async function releaseStake(q: Queryable, userId: string, pactId: string, stakeCents: number) {
  await q("insert into pacta.wallet_ledger (user_id, type, amount_cents, pact_id) values ($1, 'release', $2, $3)", [userId, stakeCents, pactId]);
}

// Tramo del Vault rescatado de un stake pagado con el saldo: vuelve al saldo.
export async function creditVaultUnlock(q: Queryable, userId: string, pactId: string | null, amountCents: number) {
  await q("insert into pacta.wallet_ledger (user_id, type, amount_cents, pact_id) values ($1, 'vault_unlock', $2, $3)", [userId, amountCents, pactId]);
}

interface TopupRow {
  whop_ref: string | null;
  remaining: string;
}

// Retira todo el saldo a la tarjeta: reembolsos parciales de las recargas, de la más reciente a la
// más antigua (más margen dentro de la ventana de reembolso de Whop). Si Whop rechaza uno, se para
// y solo se registra lo devuelto. Las recargas sin pago (datos de demo) solo se registran.
export async function withdrawBalance(userId: string): Promise<WithdrawResultDto> {
  const outcome = await withTransaction(async (q) => {
    const user = await q<{ locked: boolean }>(
      'select coalesce(withdrawals_locked_until > now(), false) as locked from pacta.users where id = $1 for update',
      [userId],
    );
    if (!user.rows[0]) throw new HttpError(404, 'not_found');
    if (user.rows[0].locked) throw new HttpError(409, 'withdrawals_locked');

    let left = await walletBalanceCents(q, userId);
    if (left <= 0) throw new HttpError(409, 'nothing_to_withdraw');

    const topups = await q<TopupRow>(
      `select t.whop_ref,
              t.amount_cents - coalesce((select sum(w.amount_cents) from pacta.wallet_ledger w
                                          where w.user_id = t.user_id and w.type = 'withdraw' and w.whop_ref = t.whop_ref), 0) as remaining
         from pacta.wallet_ledger t
        where t.user_id = $1 and t.type = 'topup' order by t.created_at desc`,
      [userId],
    );

    let withdrawnCents = 0;
    let method: WithdrawResultDto['method'] = 'ledger';
    let failure: unknown;
    for (const topup of topups.rows) {
      if (left <= 0) break;
      const chunk = Math.min(left, Number(topup.remaining));
      if (chunk <= 0) continue;
      if (topup.whop_ref) {
        try {
          await refundStakePayment(topup.whop_ref, chunk);
          method = 'whop';
        } catch (error) {
          failure = error;
          break;
        }
      }
      await q("insert into pacta.wallet_ledger (user_id, type, amount_cents, whop_ref) values ($1, 'withdraw', $2, $3)", [userId, chunk, topup.whop_ref]);
      left -= chunk;
      withdrawnCents += chunk;
    }

    if (withdrawnCents === 0) {
      if (failure) console.error('wallet_refund_failed', failure);
      throw new HttpError(failure ? 502 : 409, failure ? 'payout_failed' : 'nothing_to_withdraw');
    }
    return { withdrawnCents, method };
  });

  return { ...outcome, wallet: await walletSummary(userId) };
}
