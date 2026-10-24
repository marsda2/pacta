import {
  dailyYieldCents,
  lockedBalanceCents,
  simulatedYieldCents,
  trancheSplit,
  trancheYieldCents,
  unlockStatus,
  type LedgerEntry,
  type LedgerType,
  type Tier,
} from '../shared/vault';
import { VAULT_APY_SIMULATED } from '../shared/rules';
import type { CheckoutLinkDto, RedeemResultDto, VaultDto } from '../shared/types';
import { query, withTransaction, type Queryable } from './db';
import { HttpError } from './http';
import { createPassCheckout, refundStakePayment } from './whop';

// Redemption Vault (docs/01 y docs/03 §7). El saldo es Σ lock − Σ unlock − Σ fee del ledger; el
// rendimiento es simulado y se calcula al vuelo. Un rescate devuelve el dinero con un reembolso
// parcial del pago original de cada stake fallado; los stakes sin pago (datos de demo) solo se
// registran en el ledger.

const HISTORY_LIMIT = 30;

interface VaultUserRow {
  trust_score: number;
  tier: Tier;
  withdrawals_locked_until: Date | null;
  verified_since_reset: string;
}

interface LedgerRow {
  id: string;
  type: LedgerType;
  amount_cents: number;
  created_at: Date;
  whop_ref: string | null;
  title: string | null;
}

// Pactos verificados desde el último fallo o el último rescate: cada tramo pide una racha nueva.
const USER_SELECT = `
  select u.trust_score, u.tier, u.withdrawals_locked_until,
         (select count(*) from pacta.pacts p
           where p.user_id = u.id and p.status = 'REFUNDED'
             and p.resolved_at > coalesce(greatest(
                   (select max(resolved_at) from pacta.pacts where user_id = u.id and status = 'VAULTED'),
                   (select max(created_at) from pacta.vault_ledger where user_id = u.id and type = 'unlock')),
                 '-infinity'::timestamptz)) as verified_since_reset
    from pacta.users u where u.id = $1`;

async function loadVault(q: Queryable, userId: string): Promise<VaultDto> {
  const now = Date.now();
  const [user, ledger] = await Promise.all([
    q<VaultUserRow>(USER_SELECT, [userId]),
    q<LedgerRow>(
      `select l.id, l.type, l.amount_cents, l.created_at, l.whop_ref, p.title
         from pacta.vault_ledger l left join pacta.pacts p on p.id = l.pact_id
        where l.user_id = $1 order by l.created_at`,
      [userId],
    ),
  ]);
  const row = user.rows[0];
  if (!row) throw new HttpError(404, 'not_found');

  const entries: LedgerEntry[] = ledger.rows.map((e) => ({ type: e.type, amountCents: e.amount_cents, at: e.created_at.getTime() }));
  const balanceCents = lockedBalanceCents(entries);
  const yieldCents = simulatedYieldCents(entries, now);
  const verifiedSinceReset = Number(row.verified_since_reset);
  const status = unlockStatus({
    balanceCents,
    trustScore: row.trust_score,
    verifiedSinceReset,
    withdrawalsLockedUntil: row.withdrawals_locked_until?.getTime() ?? null,
    now,
  });
  const split = trancheSplit(status.trancheCents, row.tier);

  return {
    balanceCents,
    yieldCents,
    dailyYieldCents: dailyYieldCents(balanceCents),
    apy: VAULT_APY_SIMULATED,
    tier: row.tier,
    trustScore: row.trust_score,
    verifiedSinceReset,
    unlock: {
      eligible: status.eligible,
      trancheCents: status.trancheCents,
      payoutCents: split.payoutCents,
      feeCents: split.feeCents,
      yieldCents: row.tier === 'high_yield' ? trancheYieldCents(status.trancheCents, balanceCents, yieldCents) : 0,
      trustNeeded: status.trustNeeded,
      pactsNeeded: status.pactsNeeded,
      lockedUntil: status.lockedUntil ?? undefined,
    },
    entries: ledger.rows
      .slice(-HISTORY_LIMIT)
      .reverse()
      .map((e) => ({
        id: e.id,
        type: e.type,
        amountCents: e.amount_cents,
        at: e.created_at.getTime(),
        pactTitle: e.title ?? undefined,
        whopRef: e.whop_ref ?? undefined,
      })),
  };
}

export function vaultSummary(userId: string): Promise<VaultDto> {
  return loadVault(query, userId);
}

interface LockRow {
  pact_id: string | null;
  remaining: string;
  whop_payment_id: string | null;
}

// Rescata un tramo: min($20, saldo), repartido entre los stakes fallados del más antiguo al más
// reciente. Free: 90% al usuario y 10% de comisión. Pass: 100% y el rendimiento simulado del tramo.
export async function redeemTranche(userId: string): Promise<RedeemResultDto> {
  const outcome = await withTransaction(async (q) => {
    // Serializa los rescates del usuario: dos toques seguidos no pueden cobrar el mismo tramo.
    await q('select id from pacta.users where id = $1 for update', [userId]);
    const vault = await loadVault(q, userId);
    if (!vault.unlock.eligible) throw new HttpError(409, vault.unlock.lockedUntil ? 'withdrawals_locked' : 'vault_locked');

    const locks = await q<LockRow>(
      `select l.pact_id, pc.whop_payment_id,
              l.amount_cents - coalesce((select sum(x.amount_cents) from pacta.vault_ledger x
                                          where x.user_id = l.user_id and x.pact_id = l.pact_id
                                            and x.type in ('unlock', 'fee')), 0) as remaining
         from pacta.vault_ledger l left join pacta.pacts pc on pc.id = l.pact_id
        where l.user_id = $1 and l.type = 'lock' order by l.created_at`,
      [userId],
    );

    let left = vault.unlock.trancheCents;
    let payoutCents = 0;
    let feeCents = 0;
    let method: RedeemResultDto['method'] = 'ledger';
    let failure: unknown;
    for (const lock of locks.rows) {
      if (left <= 0) break;
      const chunk = Math.min(left, Number(lock.remaining));
      if (chunk <= 0) continue;
      const split = trancheSplit(chunk, vault.tier);

      // Primero el dinero: si Whop rechaza el reembolso (p. ej. fuera de plazo) paramos y solo se
      // registra lo que de verdad se devolvió.
      let whopRef: string | null = null;
      if (lock.whop_payment_id && split.payoutCents > 0) {
        try {
          await refundStakePayment(lock.whop_payment_id, split.payoutCents);
          whopRef = lock.whop_payment_id;
          method = 'whop';
        } catch (error) {
          failure = error;
          break;
        }
      }
      if (split.payoutCents > 0) {
        await q("insert into pacta.vault_ledger (user_id, type, amount_cents, pact_id, whop_ref) values ($1, 'unlock', $2, $3, $4)", [
          userId,
          split.payoutCents,
          lock.pact_id,
          whopRef,
        ]);
      }
      if (split.feeCents > 0) {
        await q("insert into pacta.vault_ledger (user_id, type, amount_cents, pact_id) values ($1, 'fee', $2, $3)", [userId, split.feeCents, lock.pact_id]);
      }
      left -= chunk;
      payoutCents += split.payoutCents;
      feeCents += split.feeCents;
    }

    if (payoutCents + feeCents === 0) {
      if (failure) console.error('vault_refund_failed', failure);
      throw new HttpError(failure ? 502 : 409, failure ? 'payout_failed' : 'vault_locked');
    }

    const yieldCents = vault.tier === 'high_yield' ? trancheYieldCents(payoutCents + feeCents, vault.balanceCents, vault.yieldCents) : 0;
    if (yieldCents > 0) {
      await q("insert into pacta.vault_ledger (user_id, type, amount_cents) values ($1, 'yield', $2)", [userId, yieldCents]);
    }
    return { payoutCents, feeCents, yieldCents, method };
  });

  return { ...outcome, vault: await vaultSummary(userId) };
}

// Checkout del High-Yield Pass ($9/mes). El webhook (membership.activated) sube el nivel.
export async function passCheckout(userId: string): Promise<CheckoutLinkDto> {
  const { rows } = await query<{ tier: Tier }>('select tier from pacta.users where id = $1', [userId]);
  if (!rows[0]) throw new HttpError(404, 'not_found');
  if (rows[0].tier === 'high_yield') throw new HttpError(409, 'already_pass');
  return createPassCheckout(userId);
}

// Enciende o apaga el High-Yield Pass desde el webhook de Whop. Busca al usuario por el
// metadata.user_id del checkout o, dentro de Whop, por su id de usuario de Whop.
export async function setPassMembership(
  q: Queryable,
  who: { userId: string | null; whopUserId: string | null },
  active: boolean,
): Promise<boolean> {
  if (!who.userId && !who.whopUserId) return false;
  const { rowCount } = await q('update pacta.users set tier = $3 where id = $1 or whop_user_id = $2', [
    who.userId,
    who.whopUserId,
    active ? 'high_yield' : 'free',
  ]);
  return (rowCount ?? 0) > 0;
}
