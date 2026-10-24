import { randomInt, randomUUID } from 'node:crypto';

import {
  AI_REVIEW_FALLBACK_HOURS,
  APPEALS_PER_MONTH_PASS,
  HUMAN_REVIEW_MIN_STAKE_CENTS,
  MAX_PROOFS_PER_PACT,
  needsHumanReview,
  shouldAutoApprove,
  STAKE_MAX_CENTS,
  STAKE_MIN_CENTS,
  TRUST_DELTA,
  TRUST_MAX,
  TRUST_MIN,
  WITHDRAWAL_LOCK_DAYS_AFTER_CHEAT,
  type JuryVote,
} from '../shared/rules';
import type { CheckoutLinkDto, PactDto, PactReviewDto, PactUiStatus, ProofMethod, UserSummary } from '../shared/types';
import { query, withTransaction, type Queryable } from './db';
import { HttpError } from './http';
import { createStakeCheckout, refundStakePayment, stakeCheckoutLink } from './whop';
import { auditProof } from './vision-agent';

// Máquina de estados del pacto (docs/02). Todas las transiciones de dinero y de Trust viven
// aquí; el cliente nunca decide un reembolso. Los pagos de Whop (fase 4) y el veredicto de la
// IA y de Terac (fase 5) se enganchan a estas mismas funciones.

const DEMO_WHOP_USER_ID = 'demo-user';
const METHODS: readonly ProofMethod[] = ['photo', 'location', 'witness'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_IMAGE_BYTES = 1_500_000;
const MIN_FOCUS_SEC = 5 * 60;
const MAX_FOCUS_SEC = 45 * 60;

// Estados que esperan un veredicto.
const REVIEW_STATUSES = ['AI_REVIEW', 'JURY_PENDING', 'MICRO_TASK_PENDING'];

const UI_STATUS: Record<string, PactUiStatus> = {
  DRAFT: 'scheduled',
  AWAITING_PAYMENT: 'scheduled',
  ACTIVE: 'progress',
  AI_REVIEW: 'pending',
  JURY_PENDING: 'pending',
  MICRO_TASK_PENDING: 'pending',
  APPROVED: 'verified',
  REFUNDED: 'verified',
  FAILED: 'missed',
  VAULTED: 'missed',
};

const STEP_INDEX: Record<PactUiStatus, number> = { scheduled: 0, progress: 0, pending: 2, verified: 2, missed: 1 };

interface PactRow {
  id: string;
  title: string;
  stake_cents: number;
  deadline: Date;
  status: string;
  proof_methods: string[];
  created_at: Date;
  resolved_at: Date | null;
  proof_id: string | null;
  storage_path: string | null;
  proof_at: Date | null;
  proof_count: string;
  ai_reviewed: boolean | null;
  jury_open: boolean;
}

const PACT_SELECT = `
  select p.id, p.title, p.stake_cents, p.deadline, p.status, p.proof_methods, p.created_at, p.resolved_at,
         pr.id as proof_id, pr.storage_path, pr.created_at as proof_at,
         (select count(*) from pacta.proofs where pact_id = p.id) as proof_count,
         (select bool_or(ai_verdict is not null) from pacta.proofs where pact_id = p.id) as ai_reviewed,
         exists (select 1 from pacta.jury_tasks j join pacta.proofs x on x.id = j.proof_id where x.pact_id = p.id) as jury_open
    from pacta.pacts p
    left join lateral (
      select id, storage_path, created_at from pacta.proofs where pact_id = p.id order by created_at desc limit 1
    ) pr on true`;

function toDto(row: PactRow): PactDto {
  const status = UI_STATUS[row.status] ?? 'scheduled';
  const spanSec = Math.floor((row.deadline.getTime() - row.created_at.getTime()) / 1000);
  return {
    id: row.id,
    title: row.title,
    stakeCents: row.stake_cents,
    dueAt: row.deadline.getTime(),
    status,
    rawStatus: row.status,
    methods: row.proof_methods.filter((m): m is ProofMethod => METHODS.includes(m as ProofMethod)),
    focusTotalSec: Math.min(MAX_FOCUS_SEC, Math.max(MIN_FOCUS_SEC, spanSec)),
    stepIndex: STEP_INDEX[status],
    proofImagePath: row.proof_id && row.storage_path?.startsWith('db:') ? `/api/proofs/${row.proof_id}/image` : undefined,
    proofAt: row.proof_at?.getTime(),
    completedAt: row.resolved_at && status === 'verified' ? row.resolved_at.getTime() : undefined,
    review: reviewOf(row),
  };
}

// Mismas reglas que submitProof y appealPact, para que la app solo ofrezca lo que el servidor acepta.
function reviewOf(row: PactRow): PactReviewDto | undefined {
  if (row.status !== 'AI_REVIEW' && row.status !== 'JURY_PENDING') return undefined;
  const aiReviewed = row.ai_reviewed === true;
  const open = row.status === 'AI_REVIEW' && aiReviewed && !row.jury_open;
  const expiresAt = row.proof_at ? row.proof_at.getTime() + AI_REVIEW_FALLBACK_HOURS * 3600_000 : 0;
  return {
    aiReviewed,
    juryOpen: row.jury_open,
    canRetry: open && Number(row.proof_count) < MAX_PROOFS_PER_PACT && expiresAt > Date.now(),
    canAppeal: open,
    hoursLeft: open ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 3600_000)) : undefined,
  };
}

// --- Usuario ---------------------------------------------------------------------------------
// Usuario de demo: quien abre la URL de Vercel fuera de Whop (dentro de Whop, ver identity.ts).
export async function demoUserId(): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `insert into pacta.users (whop_user_id, email) values ($1, 'demo@pacta.app')
     on conflict (whop_user_id) do update set whop_user_id = excluded.whop_user_id
     returning id`,
    [DEMO_WHOP_USER_ID],
  );
  return rows[0].id;
}

export async function userSummary(userId: string): Promise<UserSummary> {
  const { rows } = await query<{ trust_score: number; verified_streak: number; vault_cents: string }>(
    `select u.trust_score, u.verified_streak,
            coalesce((select sum(case type when 'lock' then amount_cents when 'yield' then 0 else -amount_cents end)
                        from pacta.vault_ledger where user_id = u.id), 0) as vault_cents
       from pacta.users u where u.id = $1`,
    [userId],
  );
  const row = rows[0];
  return { trustScore: row.trust_score, verifiedStreak: row.verified_streak, vaultCents: Number(row.vault_cents) };
}

async function addTrust(q: Queryable, userId: string, delta: number, reason: string, pactId: string) {
  await q('insert into pacta.trust_events (user_id, delta, reason, pact_id) values ($1, $2, $3, $4)', [userId, delta, reason, pactId]);
  await q('update pacta.users set trust_score = least($4, greatest($3, trust_score + $2)) where id = $1', [userId, delta, TRUST_MIN, TRUST_MAX]);
}

// --- Transiciones ----------------------------------------------------------------------------
interface LockedPact {
  id: string;
  user_id: string;
  stake_cents: number;
  status: string;
  deadline: Date;
  whop_payment_id: string | null;
}

async function lockPact(q: Queryable, userId: string, pactId: string): Promise<LockedPact> {
  const { rows } = await q<LockedPact>(
    'select id, user_id, stake_cents, status, deadline, whop_payment_id from pacta.pacts where id = $1 and user_id = $2 for update',
    [pactId, userId],
  );
  if (!rows[0]) throw new HttpError(404, 'not_found');
  return rows[0];
}

// FAILED → VAULTED: el stake no se pierde, pasa al Redemption Vault.
async function vaultPact(q: Queryable, pact: LockedPact, reason: string, trustDelta: number = TRUST_DELTA.failedOrExpired) {
  await q("update pacta.pacts set status = 'VAULTED', resolved_at = now() where id = $1", [pact.id]);
  // Un pacto sin dinero (stake 0) no mueve el Vault: solo cuenta en la reputación.
  if (pact.stake_cents > 0) {
    await q("insert into pacta.vault_ledger (user_id, type, amount_cents, pact_id) values ($1, 'lock', $2, $3)", [pact.user_id, pact.stake_cents, pact.id]);
  }
  await addTrust(q, pact.user_id, trustDelta, reason, pact.id);
  await q('update pacta.users set verified_streak = 0 where id = $1', [pact.user_id]);
}

// APPROVED → REFUNDED. Primero se devuelve el stake en Whop; si Whop falla, el pacto no cambia de estado.
// Los pactos sin pago (datos de demo) no tienen whop_payment_id y solo se registran.
async function refundPact(q: Queryable, pact: LockedPact, points: number, reason: string) {
  if (pact.whop_payment_id) await refundStakePayment(pact.whop_payment_id);
  await q("update pacta.pacts set status = 'REFUNDED', resolved_at = now() where id = $1", [pact.id]);
  await addTrust(q, pact.user_id, points, reason, pact.id);
  await q('update pacta.users set verified_streak = verified_streak + 1 where id = $1', [pact.user_id]);
}

// Vencimiento perezoso (docs/02): se comprueba al leer, sin depender de un cron.
async function expireOverdue(userId: string) {
  const { rows } = await query<{ id: string }>(
    "select id from pacta.pacts where user_id = $1 and status = 'ACTIVE' and deadline < now()",
    [userId],
  );
  for (const { id } of rows) {
    await withTransaction(async (q) => {
      const pact = await lockPact(q, userId, id);
      if (pact.status === 'ACTIVE') await vaultPact(q, pact, 'deadline_missed');
    });
  }

  // Duda de la IA sin humano de por medio (stake bajo): si nadie la resuelve (segunda prueba,
  // testigo o apelación) en AI_REVIEW_FALLBACK_HOURS, el stake va al Vault. Solo cuenta si la IA
  // llegó a opinar: una caída del proveedor no es una duda y no penaliza al usuario.
  const stale = await query<{ id: string }>(
    `select p.id from pacta.pacts p
      where p.user_id = $1 and p.status = 'AI_REVIEW'
        and exists (select 1 from pacta.proofs r where r.pact_id = p.id and r.ai_verdict is not null)
        and not exists (select 1 from pacta.jury_tasks j join pacta.proofs r on r.id = j.proof_id where r.pact_id = p.id)
        and (select max(created_at) from pacta.proofs where pact_id = p.id) < now() - make_interval(hours => $2)`,
    [userId, AI_REVIEW_FALLBACK_HOURS],
  );
  for (const { id } of stale.rows) {
    await withTransaction(async (q) => {
      const pact = await lockPact(q, userId, id);
      if (pact.status === 'AI_REVIEW') await vaultPact(q, pact, 'unverified_after_ai_doubt');
    });
  }
}

export async function listPacts(userId: string): Promise<PactDto[]> {
  await expireOverdue(userId);
  const { rows } = await query<PactRow>(`${PACT_SELECT} where p.user_id = $1 order by p.created_at desc`, [userId]);
  return rows.map(toDto);
}

export async function getPact(userId: string, pactId: string): Promise<PactDto> {
  await expireOverdue(userId);
  const { rows } = await query<PactRow>(`${PACT_SELECT} where p.user_id = $1 and p.id = $2`, [userId, pactId]);
  if (!rows[0]) throw new HttpError(404, 'not_found');
  return toDto(rows[0]);
}

export interface NewPact {
  title: unknown;
  stakeCents: unknown;
  dueAt: unknown;
  methods: unknown;
  reputationOnly?: unknown;
}

export async function createPact(userId: string, input: NewPact): Promise<PactDto> {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length < 1 || title.length > 80) throw new HttpError(400, 'bad_title');

  // Pacto sin dinero (onboarding y demo): solo se arriesga reputación y no pasa por Whop.
  const reputationOnly = input.reputationOnly === true;
  const stake = reputationOnly ? 0 : input.stakeCents;
  if (!reputationOnly && (!Number.isInteger(stake) || (stake as number) < STAKE_MIN_CENTS || (stake as number) > STAKE_MAX_CENTS)) {
    throw new HttpError(400, 'bad_stake');
  }

  const dueAt = input.dueAt;
  const inMs = typeof dueAt === 'number' ? dueAt - Date.now() : NaN;
  if (!(inMs > 60_000 && inMs < 14 * 24 * 3600_000)) throw new HttpError(400, 'bad_deadline');

  const requested = Array.isArray(input.methods) ? input.methods : [];
  const methods = METHODS.filter((m) => m === 'photo' || requested.includes(m));

  const dayCode = Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  if (reputationOnly) {
    const freeId = randomUUID();
    await query(
      `insert into pacta.pacts (id, user_id, title, stake_cents, deadline, day_code, status, proof_methods)
       values ($1, $2, $3, 0, to_timestamp($4 / 1000.0), $5, 'ACTIVE', $6)`,
      [freeId, userId, title, dueAt, dayCode, methods],
    );
    return getPact(userId, freeId);
  }
  // El id se genera antes para que Whop lo reciba en metadata.pact_id. Si Whop falla, no se crea nada.
  // El pacto nace AWAITING_PAYMENT y pasa a ACTIVE cuando llega payment.succeeded (api/webhooks/whop.ts).
  const pactId = randomUUID();
  const checkout = await createStakeCheckout(pactId, stake as number, title);
  await query(
    `insert into pacta.pacts (id, user_id, title, stake_cents, deadline, day_code, status, proof_methods, whop_checkout_id)
     values ($1, $2, $3, $4, to_timestamp($5 / 1000.0), $6, 'AWAITING_PAYMENT', $7, $8)`,
    [pactId, userId, title, stake, dueAt, dayCode, methods, checkout.checkoutId],
  );
  return { ...(await getPact(userId, pactId)), checkout };
}

// Enlace para pagar un pacto que sigue AWAITING_PAYMENT (el checkout se cerró sin pagar).
export async function pactCheckoutLink(userId: string, pactId: string): Promise<CheckoutLinkDto> {
  const { rows } = await query<{ status: string; whop_checkout_id: string | null }>(
    'select status, whop_checkout_id from pacta.pacts where id = $1 and user_id = $2',
    [pactId, userId],
  );
  if (!rows[0]) throw new HttpError(404, 'not_found');
  if (rows[0].status !== 'AWAITING_PAYMENT' || !rows[0].whop_checkout_id) throw new HttpError(409, 'not_awaiting_payment');
  return stakeCheckoutLink(rows[0].whop_checkout_id);
}

// AWAITING_PAYMENT → ACTIVE cuando Whop confirma el cobro (webhook payment.succeeded).
// Corre dentro de la misma transacción que la idempotencia del webhook: si falla, Whop reintenta.
export async function activatePaidPact(q: Queryable, pactId: string, paymentId: string): Promise<boolean> {
  const { rowCount } = await q(
    "update pacta.pacts set status = 'ACTIVE', whop_payment_id = $2 where id = $1 and status = 'AWAITING_PAYMENT'",
    [pactId, paymentId],
  );
  return rowCount === 1;
}

// --- Prueba ----------------------------------------------------------------------------------
function sniffMime(buf: Buffer): string | undefined {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 4).toString('hex') === '89504e47') return 'image/png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return undefined;
}

export interface NewProof {
  imageBase64?: unknown;
  emotionalState?: unknown;
}

export async function submitProof(userId: string, pactId: string, input: NewProof): Promise<PactDto> {
  const emotional = input.emotionalState === 'overwhelmed' ? 'overwhelmed' : 'normal';

  let image: { data: Buffer; mime: string } | undefined;
  if (typeof input.imageBase64 === 'string' && input.imageBase64.length > 0) {
    const data = Buffer.from(input.imageBase64, 'base64');
    if (data.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'image_too_large');
    const mime = sniffMime(data);
    if (!mime) throw new HttpError(415, 'unsupported_image');
    image = { data, mime };
  }

  const proofId = randomUUID();
  await withTransaction(async (q) => {
    const pact = await lockPact(q, userId, pactId);
    if (pact.status === 'AI_REVIEW') {
      // Reintento tras la duda de la IA (stake bajo): una segunda prueba, antes de que venza el
      // plazo de resolución y sin un humano ya asignado.
      const prior = await q<{ n: string; last: Date; assigned: boolean; reviewed: boolean }>(
        `select count(*) as n, max(created_at) as last, bool_or(ai_verdict is not null) as reviewed,
                exists (select 1 from pacta.jury_tasks j join pacta.proofs r on r.id = j.proof_id where r.pact_id = $1) as assigned
           from pacta.proofs where pact_id = $1`,
        [pactId],
      );
      const { n, last, assigned, reviewed } = prior.rows[0];
      if (!reviewed || assigned) throw new HttpError(409, 'not_active');
      if (Number(n) >= MAX_PROOFS_PER_PACT) throw new HttpError(409, 'no_more_attempts');
      if (last.getTime() < Date.now() - AI_REVIEW_FALLBACK_HOURS * 3600_000) throw new HttpError(409, 'review_expired');
    } else {
      if (pact.status !== 'ACTIVE') throw new HttpError(409, 'not_active');
      if (pact.deadline.getTime() < Date.now()) throw new HttpError(409, 'deadline_passed');
    }

    await q(
      `insert into pacta.proofs (id, pact_id, storage_path, captured_live, emotional_state)
       values ($1, $2, $3, true, $4)`,
      [proofId, pactId, image ? `db:${proofId}` : 'demo', emotional],
    );
    if (image) await q('insert into pacta.proof_images (proof_id, mime, data) values ($1, $2, $3)', [proofId, image.mime, image.data]);
    await q("update pacta.pacts set status = 'AI_REVIEW' where id = $1", [pactId]);
  });

  // Fuera de la transacción: la llamada a la IA tarda segundos. Si falla (sin clave, caída del
  // proveedor) el pacto se queda en AI_REVIEW y nunca se aprueba por error.
  if (image) {
    await reviewProof(userId, pactId, proofId, image, emotional).catch((error) => console.error('ai_review_failed', error));
  }
  return getPact(userId, pactId);
}

// AI_REVIEW → REFUNDED si la IA está segura; en cualquier otro caso → JURY_PENDING (Terac).
async function reviewProof(
  userId: string,
  pactId: string,
  proofId: string,
  image: { data: Buffer; mime: string },
  emotional: 'normal' | 'overwhelmed',
) {
  const { rows } = await query<{ title: string; day_code: string }>('select title, day_code from pacta.pacts where id = $1', [pactId]);
  const { audit, promptVersion } = await auditProof({ image, title: rows[0].title, dayCode: rows[0].day_code, emotionalState: emotional });

  await withTransaction(async (q) => {
    const pact = await lockPact(q, userId, pactId);
    if (pact.status !== 'AI_REVIEW') return;
    await q(
      `update pacta.proofs
          set ai_prompt_version = $2, ai_verdict = $3, ai_confidence = $4, ai_cheat_signals = $5, ai_reason = $6
        where id = $1`,
      [proofId, promptVersion, audit.verdict, audit.confidence, JSON.stringify(audit.cheatSignals), audit.reason],
    );
    if (shouldAutoApprove(audit, emotional)) {
      await refundPact(q, pact, TRUST_DELTA.aiApproved, 'ai_approved');
      return;
    }
    // Un humano cuesta más que la comisión de un pacto pequeño: con stake bajo la duda se queda
    // en AI_REVIEW (segunda prueba, testigo o apelación) y caduca hacia el Vault.
    const minStake = Number(process.env.HUMAN_REVIEW_MIN_STAKE_CENTS) || HUMAN_REVIEW_MIN_STAKE_CENTS;
    if (!needsHumanReview(pact.stake_cents, false, minStake)) return;
    await openJuryCase(q, pactId, proofId, false);
  });
}

// AI_REVIEW → JURY_PENDING con un caso para el jurado de Terac. Sin TERAC_JURY_OPPORTUNITY_ID
// el caso espera y no acepta votos.
async function openJuryCase(q: Queryable, pactId: string, proofId: string, appeal: boolean) {
  await q("update pacta.pacts set status = 'JURY_PENDING' where id = $1", [pactId]);
  await q('insert into pacta.jury_tasks (proof_id, terac_task_id, raw) values ($1, $2, $3)', [
    proofId,
    process.env.TERAC_JURY_OPPORTUNITY_ID ?? null,
    JSON.stringify({ appeal }),
  ]);
}

// Apelación: el usuario pide un juez humano tras la duda o el rechazo de la IA. Incluida en el
// High-Yield Pass (APPEALS_PER_MONTH_PASS al mes); en Free requerirá pago con Whop (fase 4), y
// mientras tanto solo se admite con FREE_APPEALS=true (demo).
export async function appealPact(userId: string, pactId: string): Promise<PactDto> {
  await withTransaction(async (q) => {
    const pact = await lockPact(q, userId, pactId);
    if (pact.status !== 'AI_REVIEW') throw new HttpError(409, 'not_appealable');

    const { rows } = await q<{ proof_id: string; assigned: boolean }>(
      `select r.id as proof_id,
              exists (select 1 from pacta.jury_tasks j join pacta.proofs x on x.id = j.proof_id where x.pact_id = $1) as assigned
         from pacta.proofs r where r.pact_id = $1 and r.ai_verdict is not null
        order by r.created_at desc limit 1`,
      [pactId],
    );
    if (!rows[0] || rows[0].assigned) throw new HttpError(409, 'not_appealable');

    const user = await q<{ tier: string; used: string }>(
      `select u.tier,
              (select count(*) from pacta.jury_tasks j
                 join pacta.proofs r on r.id = j.proof_id join pacta.pacts pc on pc.id = r.pact_id
                where pc.user_id = u.id and j.raw ->> 'appeal' = 'true'
                  and j.created_at >= date_trunc('month', now())) as used
         from pacta.users u where u.id = $1`,
      [userId],
    );
    const covered = user.rows[0].tier === 'high_yield' && Number(user.rows[0].used) < APPEALS_PER_MONTH_PASS;
    if (!covered && process.env.FREE_APPEALS !== 'true') throw new HttpError(402, 'appeal_requires_pass');

    await openJuryCase(q, pactId, rows[0].proof_id, true);
  });
  return getPact(userId, pactId);
}

export async function proofImage(proofId: string): Promise<{ mime: string; data: Buffer } | undefined> {
  const { rows } = await query<{ mime: string; data: Buffer }>('select mime, data from pacta.proof_images where proof_id = $1', [proofId]);
  return rows[0];
}

// --- Veredicto -------------------------------------------------------------------------------
// Veredicto manual (testigo o control de prototipo). Los veredictos de la IA y de Terac usarán
// la misma función con otros puntos y motivos.
export async function resolvePact(userId: string, pactId: string, kept: boolean, source: 'witness' | 'demo'): Promise<PactDto> {
  await withTransaction(async (q) => {
    const pact = await lockPact(q, userId, pactId);
    if (!REVIEW_STATUSES.includes(pact.status)) throw new HttpError(409, 'not_in_review');
    if (kept) await refundPact(q, pact, TRUST_DELTA.aiApproved, `${source}_approved`);
    else await vaultPact(q, pact, `${source}_rejected`);
  });
  return getPact(userId, pactId);
}

// Cierra un caso del jurado de Terac y aplica su veredicto al pacto. Idempotente: si el caso ya
// estaba cerrado no hace nada.
export async function closeJuryTask(juryTaskId: string, verdict: JuryVote): Promise<void> {
  await withTransaction(async (q) => {
    const closed = await q<{ proof_id: string }>(
      `update pacta.jury_tasks set status = 'done', verdict = $2, resolved_at = now()
        where id = $1 and status = 'pending' returning proof_id`,
      [juryTaskId, verdict],
    );
    if (!closed.rows[0]) return;

    const { rows } = await q<{ id: string; user_id: string }>(
      'select pc.id, pc.user_id from pacta.proofs p join pacta.pacts pc on pc.id = p.pact_id where p.id = $1',
      [closed.rows[0].proof_id],
    );
    const pact = await lockPact(q, rows[0].user_id, rows[0].id);
    if (!REVIEW_STATUSES.includes(pact.status)) return;

    if (verdict === 'APPROVE') {
      await refundPact(q, pact, TRUST_DELTA.juryApproved, 'jury_approved');
    } else if (verdict === 'CHEAT') {
      await vaultPact(q, pact, 'cheat_confirmed', TRUST_DELTA.cheatConfirmed);
      await q('update pacta.users set withdrawals_locked_until = now() + make_interval(days => $2) where id = $1', [
        pact.user_id,
        WITHDRAWAL_LOCK_DAYS_AFTER_CHEAT,
      ]);
    } else {
      await vaultPact(q, pact, 'jury_rejected');
    }
  });
}
