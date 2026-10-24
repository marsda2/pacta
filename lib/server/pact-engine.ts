import { randomInt, randomUUID } from 'node:crypto';

import {
  AI_REVIEW_FALLBACK_HOURS,
  APPEAL_MAX_EXTRA_PHOTOS,
  APPEAL_NOTE_MAX_CHARS,
  APPEAL_PANEL_SIZE,
  APPEALS_PER_MONTH_PASS,
  CREDIT_STAKE_MIN_CENTS,
  appealBondCents,
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
import { holdStake, releaseStake } from './wallet';
import { createStakeCheckout, refundStakePayment, stakeCheckoutLink } from './whop';
import { maybeLaunchBatch } from './appeal-study';
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
  day_code: string;
  status: string;
  proof_methods: string[];
  created_at: Date;
  resolved_at: Date | null;
  proof_id: string | null;
  storage_path: string | null;
  proof_at: Date | null;
  ai_reason: string | null;
  ai_cheat_signals: string[] | null;
  proof_count: string;
  ai_reviewed: boolean | null;
  jury_open: boolean;
  user_tier: string;
  appeals_used: string;
}

interface DayCodeMeta {
  code: string;
  targetDays: number;
  completedDays: number;
  locationName?: string;
}

export function encodeDayCodeMeta(meta: DayCodeMeta): string {
  const code = meta.code.slice(0, 4);
  const target = Math.max(1, Math.min(7, Math.floor(meta.targetDays || 1)));
  const done = Math.max(0, Math.min(target, Math.floor(meta.completedDays || 0)));
  const loc = (meta.locationName ?? '').replace(/\|/g, ' ').trim().slice(0, 60);
  if (target === 1 && done === 0 && !loc) return code;
  return `${code}|${target}|${done}|${loc}`;
}

export function decodeDayCodeMeta(raw: string): DayCodeMeta {
  const [code = '', t, d, ...rest] = (raw ?? '').split('|');
  const targetDays = Math.max(1, Math.min(7, Number.parseInt(t ?? '1', 10) || 1));
  const completedDays = Math.max(0, Math.min(targetDays, Number.parseInt(d ?? '0', 10) || 0));
  const loc = rest.join('|').trim();
  return {
    code: code.slice(0, 4),
    targetDays,
    completedDays,
    locationName: loc || undefined,
  };
}

// Apelaciones que el usuario del pacto ya abrió este mes (cuentan para el cupo del Pass).
const APPEALS_USED_SQL = `(select count(*) from pacta.jury_tasks j
          join pacta.proofs r on r.id = j.proof_id join pacta.pacts pc on pc.id = r.pact_id
         where pc.user_id = p.user_id and j.raw ->> 'appeal' = 'true' and j.created_at >= date_trunc('month', now()))`;

const PACT_SELECT = `
  select p.id, p.title, p.stake_cents, p.deadline, p.day_code, p.status, p.proof_methods, p.created_at, p.resolved_at,
         pr.id as proof_id, pr.storage_path, pr.created_at as proof_at, pr.ai_reason, pr.ai_cheat_signals,
         (select count(*) from pacta.proofs where pact_id = p.id) as proof_count,
         (select bool_or(ai_verdict is not null) from pacta.proofs where pact_id = p.id) as ai_reviewed,
         exists (select 1 from pacta.jury_tasks j join pacta.proofs x on x.id = j.proof_id where x.pact_id = p.id) as jury_open,
         (select tier from pacta.users where id = p.user_id) as user_tier,
         ${APPEALS_USED_SQL} as appeals_used
    from pacta.pacts p
    left join lateral (
      select id, storage_path, created_at, ai_reason, ai_cheat_signals from pacta.proofs where pact_id = p.id order by created_at desc limit 1
    ) pr on true`;

function toDto(row: PactRow): PactDto {
  const status = UI_STATUS[row.status] ?? 'scheduled';
  const spanSec = Math.floor((row.deadline.getTime() - row.created_at.getTime()) / 1000);
  const meta = decodeDayCodeMeta(row.day_code);
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
    dayCode: meta.code,
    targetDays: meta.targetDays,
    completedDays: status === 'verified' ? meta.targetDays : meta.completedDays,
    locationName: meta.locationName,
    proofImagePath: row.proof_id && row.storage_path?.startsWith('db:') ? `/api/proofs/${row.proof_id}/image` : undefined,
    proofAt: row.proof_at?.getTime(),
    completedAt: row.resolved_at && status === 'verified' ? row.resolved_at.getTime() : undefined,
    review: reviewOf(row),
  };
}

const freeAppeals = () => process.env.FREE_APPEALS === 'true';
const passCovers = (tier: string, usedThisMonth: number) => tier === 'high_yield' && usedThisMonth < APPEALS_PER_MONTH_PASS;

// Mismas reglas que submitProof y appealPact, para que la app solo ofrezca lo que el servidor acepta.
function reviewOf(row: PactRow): PactReviewDto | undefined {
  if (row.status !== 'AI_REVIEW' && row.status !== 'JURY_PENDING') return undefined;
  const aiReviewed = row.ai_reviewed === true;
  const open = row.status === 'AI_REVIEW' && aiReviewed && !row.jury_open;
  const expiresAt = row.proof_at ? row.proof_at.getTime() + AI_REVIEW_FALLBACK_HOURS * 3600_000 : 0;
  const bond = appealBondCents(row.stake_cents, passCovers(row.user_tier, Number(row.appeals_used)), freeAppeals());
  const signals = Array.isArray(row.ai_cheat_signals) ? row.ai_cheat_signals : [];
  const missingDayCode =
    aiReviewed &&
    (signals.includes('missing_day_code') || Boolean(row.ai_reason && /code.*(not|missing|absent|cannot|couldn't)/i.test(row.ai_reason)));
  return {
    aiReviewed,
    juryOpen: row.jury_open,
    canRetry: open && Number(row.proof_count) < MAX_PROOFS_PER_PACT && expiresAt > Date.now(),
    canAppeal: open && bond !== null,
    appealBondCents: open && bond !== null ? bond : undefined,
    hoursLeft: open ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 3600_000)) : undefined,
    aiReason: aiReviewed && row.ai_reason ? row.ai_reason : undefined,
    missingDayCode: missingDayCode || undefined,
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
  day_code: string;
  whop_payment_id: string | null;
  paid_with_credit: boolean;
}

async function lockPact(q: Queryable, userId: string, pactId: string): Promise<LockedPact> {
  const { rows } = await q<LockedPact>(
    'select id, user_id, stake_cents, status, deadline, day_code, whop_payment_id, paid_with_credit from pacta.pacts where id = $1 and user_id = $2 for update',
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

// APPROVED → REFUNDED (o avanza 1 día en hábitos semanales hasta alcanzar targetDays).
// Primero se devuelve el stake en Whop; si Whop falla, el pacto no cambia de estado.
// Pagado con el saldo prepagado, vuelve al saldo. Los pactos sin pago (datos de demo) solo se registran.
async function refundPact(q: Queryable, pact: LockedPact, points: number, reason: string) {
  const meta = decodeDayCodeMeta(pact.day_code);
  const nextDone = meta.completedDays + 1;
  if (meta.targetDays > 1 && nextDone < meta.targetDays) {
    const nextCode = Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
    const encoded = encodeDayCodeMeta({ ...meta, code: nextCode, completedDays: nextDone });
    await q("update pacta.pacts set status = 'ACTIVE', day_code = $2 where id = $1", [pact.id, encoded]);
    await addTrust(q, pact.user_id, TRUST_DELTA.mercyTaskCompleted, `${reason}_day_${nextDone}_of_${meta.targetDays}`, pact.id);
    return;
  }
  const finalMeta = meta.targetDays > 1 ? encodeDayCodeMeta({ ...meta, completedDays: meta.targetDays }) : pact.day_code;
  if (pact.whop_payment_id) await refundStakePayment(pact.whop_payment_id);
  else if (pact.paid_with_credit && pact.stake_cents > 0) await releaseStake(q, pact.user_id, pact.id, pact.stake_cents);
  await q("update pacta.pacts set status = 'REFUNDED', day_code = $2, resolved_at = now() where id = $1", [pact.id, finalMeta]);
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
  await maybeLaunchBatch(); // las apelaciones que llevan esperando ya pueden salir en un lote
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
  targetDays?: unknown;
  locationName?: unknown;
  reputationOnly?: unknown;
  // 'credit': se paga con el saldo prepagado (desde $1, sin Whop); si no, con tarjeta en Whop.
  payWith?: unknown;
}

export async function createPact(userId: string, input: NewPact): Promise<PactDto> {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length < 1 || title.length > 80) throw new HttpError(400, 'bad_title');

  // Pacto sin dinero (onboarding y demo): solo se arriesga reputación y no pasa por Whop.
  const reputationOnly = input.reputationOnly === true;
  const withCredit = !reputationOnly && input.payWith === 'credit';
  const stake = reputationOnly ? 0 : input.stakeCents;
  const minStake = withCredit ? CREDIT_STAKE_MIN_CENTS : STAKE_MIN_CENTS;
  if (!reputationOnly && (!Number.isInteger(stake) || (stake as number) < minStake || (stake as number) > STAKE_MAX_CENTS)) {
    throw new HttpError(400, 'bad_stake');
  }

  const dueAt = input.dueAt;
  const inMs = typeof dueAt === 'number' ? dueAt - Date.now() : NaN;
  if (!(inMs > 60_000 && inMs < 14 * 24 * 3600_000)) throw new HttpError(400, 'bad_deadline');

  const requested = Array.isArray(input.methods) ? input.methods : [];
  const methods = METHODS.filter((m) => m === 'photo' || requested.includes(m));

  const targetDays = typeof input.targetDays === 'number' && Number.isInteger(input.targetDays) ? Math.max(1, Math.min(7, input.targetDays)) : 1;
  const locationName = typeof input.locationName === 'string' && methods.includes('location') ? input.locationName.trim().slice(0, 60) : undefined;
  const rawCode = Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  const dayCode = encodeDayCodeMeta({ code: rawCode, targetDays, completedDays: 0, locationName });
  if (reputationOnly) {
    const freeId = randomUUID();
    await query(
      `insert into pacta.pacts (id, user_id, title, stake_cents, deadline, day_code, status, proof_methods)
       values ($1, $2, $3, 0, to_timestamp($4 / 1000.0), $5, 'ACTIVE', $6)`,
      [freeId, userId, title, dueAt, dayCode, methods],
    );
    return getPact(userId, freeId);
  }
  if (withCredit) {
    // Con el saldo no hay checkout: el stake se retiene y el pacto nace ACTIVE.
    const creditId = randomUUID();
    await withTransaction(async (q) => {
      await q('select id from pacta.users where id = $1 for update', [userId]);
      await q(
        `insert into pacta.pacts (id, user_id, title, stake_cents, deadline, day_code, status, proof_methods, paid_with_credit)
         values ($1, $2, $3, $4, to_timestamp($5 / 1000.0), $6, 'ACTIVE', $7, true)`,
        [creditId, userId, title, stake, dueAt, dayCode, methods],
      );
      await holdStake(q, userId, creditId, stake as number);
    });
    return getPact(userId, creditId);
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
  gps?: unknown;
}

export async function submitProof(userId: string, pactId: string, input: NewProof): Promise<PactDto> {
  const emotional = input.emotionalState === 'overwhelmed' ? 'overwhelmed' : 'normal';
  const rawGps = input.gps && typeof input.gps === 'object' ? (input.gps as { lat?: unknown; lng?: unknown; accuracy?: unknown }) : undefined;
  const gpsSummary =
    rawGps && typeof rawGps.lat === 'number' && typeof rawGps.lng === 'number' && Number.isFinite(rawGps.lat) && Number.isFinite(rawGps.lng)
      ? `${rawGps.lat.toFixed(5)}, ${rawGps.lng.toFixed(5)}${typeof rawGps.accuracy === 'number' ? ` (±${Math.round(rawGps.accuracy)}m)` : ''}`
      : undefined;

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
    await reviewProof(userId, pactId, proofId, image, emotional, gpsSummary).catch((error) => console.error('ai_review_failed', error));
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
  gpsSummary?: string,
) {
  const { rows } = await query<{ title: string; day_code: string }>('select title, day_code from pacta.pacts where id = $1', [pactId]);
  const meta = decodeDayCodeMeta(rows[0].day_code);
  const { audit, promptVersion } = await auditProof({
    image,
    title: rows[0].title,
    dayCode: meta.code,
    emotionalState: emotional,
    locationName: meta.locationName,
    gpsSummary,
  });

  await withTransaction(async (q) => {
    const pact = await lockPact(q, userId, pactId);
    if (pact.status !== 'AI_REVIEW') return;
    const storedSignals = audit.dayCodeVisible ? audit.cheatSignals : [...audit.cheatSignals, 'missing_day_code'];
    await q(
      `update pacta.proofs
          set ai_prompt_version = $2, ai_verdict = $3, ai_confidence = $4, ai_cheat_signals = $5, ai_reason = $6
        where id = $1`,
      [proofId, promptVersion, audit.verdict, audit.confidence, JSON.stringify(storedSignals), audit.reason],
    );
    if (shouldAutoApprove(audit, emotional, pact.stake_cents)) {
      await refundPact(q, pact, TRUST_DELTA.aiApproved, 'ai_approved');
      return;
    }
    // Si el único problema es que no se detectó el código escrito a mano y aún le queda un
    // intento de foto, lo dejamos en AI_REVIEW para que pueda repetir la foto con el código.
    if (!audit.dayCodeVisible) {
      const count = await q<{ n: string }>('select count(*) as n from pacta.proofs where pact_id = $1', [pactId]);
      if (Number(count.rows[0].n) < MAX_PROOFS_PER_PACT) return;
    }
    // Un humano cuesta más que la comisión de un pacto pequeño: con stake bajo la duda se queda
    // en AI_REVIEW (segunda prueba, testigo o apelación) y caduca hacia el Vault.
    const minStake = Number(process.env.HUMAN_REVIEW_MIN_STAKE_CENTS) || HUMAN_REVIEW_MIN_STAKE_CENTS;
    if (!needsHumanReview(pact.stake_cents, false, minStake)) return;
    await openJuryCase(q, pactId, proofId, { appeal: false });
  });
}

// AI_REVIEW → JURY_PENDING con un caso para el jurado de Terac. Sin TERAC_JURY_OPPORTUNITY_ID
// el caso espera y no acepta votos. Devuelve el id del caso.
async function openJuryCase(
  q: Queryable,
  pactId: string,
  proofId: string,
  extra: { appeal: boolean; panel?: number; bondCents?: number; note?: string } = { appeal: false },
): Promise<string> {
  await q("update pacta.pacts set status = 'JURY_PENDING' where id = $1", [pactId]);
  const { rows } = await q<{ id: string }>(
    'insert into pacta.jury_tasks (proof_id, terac_task_id, raw) values ($1, $2, $3) returning id',
    // Las apelaciones no tienen estudio propio: esperan en la cola de lotes (appeal-study.ts).
    [proofId, extra.appeal ? null : (process.env.TERAC_JURY_OPPORTUNITY_ID ?? null), JSON.stringify(extra)],
  );
  return rows[0].id;
}

export interface AppealInput {
  note?: unknown;
  // Hasta APPEAL_MAX_EXTRA_PHOTOS fotos extra, en base64.
  imagesBase64?: unknown;
}

// Apelación con fianza: el usuario que cree haber cumplido pide un panel de APPEAL_PANEL_SIZE
// jueces humanos y puede añadir fotos y una nota. El Pass la cubre (APPEALS_PER_MONTH_PASS al
// mes, sin fianza); en Free exige un stake ≥ APPEAL_MIN_STAKE_CENTS y deja en juego la fianza:
// si pierde, se descuenta del stake que va al Vault (closeJuryTask).
export async function appealPact(userId: string, pactId: string, input: AppealInput = {}): Promise<PactDto> {
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, APPEAL_NOTE_MAX_CHARS) : '';
  const rawImages = Array.isArray(input.imagesBase64) ? input.imagesBase64 : [];
  if (rawImages.length > APPEAL_MAX_EXTRA_PHOTOS) throw new HttpError(400, 'too_many_photos');
  const images = rawImages.map((value) => {
    const data = typeof value === 'string' ? Buffer.from(value, 'base64') : Buffer.alloc(0);
    if (data.length === 0) throw new HttpError(400, 'bad_image');
    if (data.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'image_too_large');
    const mime = sniffMime(data);
    if (!mime) throw new HttpError(415, 'unsupported_image');
    return { data, mime };
  });

  await withTransaction(async (q) => {
    const pact = await lockPact(q, userId, pactId);
    if (pact.status !== 'AI_REVIEW') throw new HttpError(409, 'not_appealable');

    const { rows } = await q<{ proof_id: string; assigned: boolean; created_at: Date }>(
      `select r.id as proof_id, r.created_at,
              exists (select 1 from pacta.jury_tasks j join pacta.proofs x on x.id = j.proof_id where x.pact_id = $1) as assigned
         from pacta.proofs r where r.pact_id = $1 and r.ai_verdict is not null
        order by r.created_at desc limit 1`,
      [pactId],
    );
    if (!rows[0] || rows[0].assigned) throw new HttpError(409, 'not_appealable');
    // La ventana de apelación es la misma que la del reintento: AI_REVIEW_FALLBACK_HOURS.
    if (rows[0].created_at.getTime() < Date.now() - AI_REVIEW_FALLBACK_HOURS * 3600_000) throw new HttpError(409, 'review_expired');

    const user = await q<{ tier: string; used: string }>(
      `select u.tier, (select count(*) from pacta.jury_tasks j
                 join pacta.proofs r on r.id = j.proof_id join pacta.pacts pc on pc.id = r.pact_id
                where pc.user_id = u.id and j.raw ->> 'appeal' = 'true'
                  and j.created_at >= date_trunc('month', now())) as used
         from pacta.users u where u.id = $1`,
      [userId],
    );
    const bond = appealBondCents(pact.stake_cents, passCovers(user.rows[0].tier, Number(user.rows[0].used)), freeAppeals());
    if (bond === null) throw new HttpError(402, 'appeal_requires_pass');

    const id = await openJuryCase(q, pactId, rows[0].proof_id, { appeal: true, panel: APPEAL_PANEL_SIZE, bondCents: bond, note: note || undefined });
    for (const image of images) {
      await q('insert into pacta.appeal_evidence (jury_task_id, mime, data) values ($1, $2, $3)', [id, image.mime, image.data]);
    }
    return id;
  });

  // El caso espera en la cola de apelaciones y se revisa en un lote (ver launchBatch); el
  // lanzamiento automático está apagado por defecto porque cada lote gasta saldo de Terac.
  await maybeLaunchBatch();
  return getPact(userId, pactId);
}

export async function proofImage(proofId: string): Promise<{ mime: string; data: Buffer } | undefined> {
  const { rows } = await query<{ mime: string; data: Buffer }>(
    `select mime, data from pacta.proof_images where proof_id = $1
     union all select mime, data from pacta.appeal_evidence where id = $1`,
    [proofId],
  );
  return rows[0];
}

// --- Veredicto -------------------------------------------------------------------------------
// Veredicto manual (testigo o control de prototipo). Los veredictos de la IA y de Terac usarán
// la misma función con otros puntos y motivos.
export async function resolvePact(userId: string, pactId: string, kept: boolean, source: 'witness' | 'demo', witnessedProofId?: string): Promise<PactDto> {
  if (source === 'demo' && (process.env.NODE_ENV === 'production' || process.env.VERCEL)) throw new HttpError(403, 'prototype_disabled');
  if (source === 'witness' && !witnessedProofId) throw new HttpError(403, 'witness_link_required');
  await withTransaction(async (q) => {
    const pact = await lockPact(q, userId, pactId);
    if (!REVIEW_STATUSES.includes(pact.status)) throw new HttpError(409, 'not_in_review');
    if (source === 'witness') {
      if (pact.status !== 'AI_REVIEW') throw new HttpError(409, 'not_in_review');
      const latest = await q<{ id: string }>('select id from pacta.proofs where pact_id = $1 order by created_at desc limit 1', [pactId]);
      if (latest.rows[0]?.id !== witnessedProofId) throw new HttpError(404, 'witness_link_invalid');
    }
    if (kept) await refundPact(q, pact, TRUST_DELTA.aiApproved, `${source}_approved`);
    else await vaultPact(q, pact, `${source}_rejected`);
  });
  return getPact(userId, pactId);
}

// Cierra un caso del jurado de Terac y aplica su veredicto al pacto. Idempotente: si el caso ya
// estaba cerrado no hace nada.
export async function closeJuryTask(juryTaskId: string, verdict: JuryVote): Promise<void> {
  await withTransaction(async (q) => {
    const closed = await q<{ proof_id: string; raw: { appeal?: boolean; bondCents?: number } | null }>(
      `update pacta.jury_tasks set status = 'done', verdict = $2, resolved_at = now()
        where id = $1 and status = 'pending' returning proof_id, raw`,
      [juryTaskId, verdict],
    );
    if (!closed.rows[0]) return;

    const { rows } = await q<{ id: string; user_id: string }>(
      'select pc.id, pc.user_id from pacta.proofs p join pacta.pacts pc on pc.id = p.pact_id where p.id = $1',
      [closed.rows[0].proof_id],
    );
    const pact = await lockPact(q, rows[0].user_id, rows[0].id);
    if (!REVIEW_STATUSES.includes(pact.status)) return;

    // Apelación perdida: el stake va al Vault y la fianza se descuenta (type 'fee') para pagar a Terac.
    const bond = closed.rows[0].raw?.appeal ? (closed.rows[0].raw.bondCents ?? 0) : 0;
    const chargeBond = async () => {
      if (bond > 0) await q("insert into pacta.vault_ledger (user_id, type, amount_cents, pact_id) values ($1, 'fee', $2, $3)", [pact.user_id, bond, pact.id]);
    };

    if (verdict === 'APPROVE') {
      await refundPact(q, pact, TRUST_DELTA.juryApproved, 'jury_approved');
    } else if (verdict === 'CHEAT') {
      await vaultPact(q, pact, 'cheat_confirmed', TRUST_DELTA.cheatConfirmed);
      await chargeBond();
      await q('update pacta.users set withdrawals_locked_until = now() + make_interval(days => $2) where id = $1', [
        pact.user_id,
        WITHDRAWAL_LOCK_DAYS_AFTER_CHEAT,
      ]);
    } else {
      await vaultPact(q, pact, 'jury_rejected');
      await chargeBond();
    }
  });
}
