import { randomInt, randomUUID } from 'node:crypto';

import { STAKE_MAX_CENTS, STAKE_MIN_CENTS, TRUST_DELTA, TRUST_MAX, TRUST_MIN } from '../shared/rules';
import type { PactDto, PactUiStatus, ProofMethod, UserSummary } from '../shared/types';
import { query, withTransaction, type Queryable } from './db';
import { HttpError } from './http';

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
}

const PACT_SELECT = `
  select p.id, p.title, p.stake_cents, p.deadline, p.status, p.proof_methods, p.created_at, p.resolved_at,
         pr.id as proof_id, pr.storage_path, pr.created_at as proof_at
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
  };
}

// --- Usuario ---------------------------------------------------------------------------------
// Identidad de demo hasta que llegue el token de Whop (fase 8).
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
            coalesce((select sum(case type when 'lock' then amount_cents else -amount_cents end)
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
}

async function lockPact(q: Queryable, userId: string, pactId: string): Promise<LockedPact> {
  const { rows } = await q<LockedPact>(
    'select id, user_id, stake_cents, status, deadline from pacta.pacts where id = $1 and user_id = $2 for update',
    [pactId, userId],
  );
  if (!rows[0]) throw new HttpError(404, 'not_found');
  return rows[0];
}

// FAILED → VAULTED: el stake no se pierde, pasa al Redemption Vault.
async function vaultPact(q: Queryable, pact: LockedPact, reason: string) {
  await q("update pacta.pacts set status = 'VAULTED', resolved_at = now() where id = $1", [pact.id]);
  await q("insert into pacta.vault_ledger (user_id, type, amount_cents, pact_id) values ($1, 'lock', $2, $3)", [pact.user_id, pact.stake_cents, pact.id]);
  await addTrust(q, pact.user_id, TRUST_DELTA.failedOrExpired, reason, pact.id);
  await q('update pacta.users set verified_streak = 0 where id = $1', [pact.user_id]);
}

// APPROVED → REFUNDED. El reembolso real con Whop llega en la fase 4; aquí solo se registra.
async function refundPact(q: Queryable, pact: LockedPact, points: number, reason: string) {
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
}

export async function createPact(userId: string, input: NewPact): Promise<PactDto> {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length < 1 || title.length > 80) throw new HttpError(400, 'bad_title');

  const stake = input.stakeCents;
  if (!Number.isInteger(stake) || (stake as number) < STAKE_MIN_CENTS || (stake as number) > STAKE_MAX_CENTS) {
    throw new HttpError(400, 'bad_stake');
  }

  const dueAt = input.dueAt;
  const inMs = typeof dueAt === 'number' ? dueAt - Date.now() : NaN;
  if (!(inMs > 60_000 && inMs < 14 * 24 * 3600_000)) throw new HttpError(400, 'bad_deadline');

  const requested = Array.isArray(input.methods) ? input.methods : [];
  const methods = METHODS.filter((m) => m === 'photo' || requested.includes(m));

  const dayCode = Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  const { rows } = await query<{ id: string }>(
    // Sin pagos todavía (fase 4): el pacto nace ACTIVE. Con Whop nacerá AWAITING_PAYMENT.
    `insert into pacta.pacts (user_id, title, stake_cents, deadline, day_code, status, proof_methods)
     values ($1, $2, $3, to_timestamp($4 / 1000.0), $5, 'ACTIVE', $6) returning id`,
    [userId, title, stake, dueAt, dayCode, methods],
  );
  return getPact(userId, rows[0].id);
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

  await withTransaction(async (q) => {
    const pact = await lockPact(q, userId, pactId);
    if (pact.status !== 'ACTIVE') throw new HttpError(409, 'not_active');
    if (pact.deadline.getTime() < Date.now()) throw new HttpError(409, 'deadline_passed');

    const proofId = randomUUID();
    await q(
      `insert into pacta.proofs (id, pact_id, storage_path, captured_live, emotional_state)
       values ($1, $2, $3, true, $4)`,
      [proofId, pactId, image ? `db:${proofId}` : 'demo', emotional],
    );
    if (image) await q('insert into pacta.proof_images (proof_id, mime, data) values ($1, $2, $3)', [proofId, image.mime, image.data]);
    // Fase 5: aquí se llama al agente de visión; si duda o sospecha trampa pasa a JURY_PENDING.
    await q("update pacta.pacts set status = 'AI_REVIEW' where id = $1", [pactId]);
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
