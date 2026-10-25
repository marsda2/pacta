// Reglas de negocio compartidas (cliente y servidor). Fuente: docs/01, 02 y 04.

// Confianza mínima del agente para aprobar sin jurado humano.
export const AI_AUTO_APPROVE_CONFIDENCE = 0.88;

// Auditoría de la IA (docs/04). Salida estructurada del agente de visión.
export type AgentVerdict = 'APPROVE' | 'UNSURE' | 'REJECT';
export const CHEAT_SIGNALS = ['screen_photo', 'old_or_reused', 'unrelated_scene', 'staged', 'none'] as const;
export type CheatSignal = (typeof CHEAT_SIGNALS)[number];

export interface AgentAudit {
  taskMatch: boolean;
  dayCodeVisible: boolean;
  cheatSignals: CheatSignal[];
  confidence: number;
  verdict: AgentVerdict;
  reason: string;
}

// Cuánto se invierte en verificar, según lo que hay en juego (decidido 2026-10-24). Un juez de
// Terac cuesta ~$6, así que solo se paga cuando el stake lo justifica:
//   light    menos de $5 (y los pactos sin dinero): a la IA le basta una prueba creíble sin trampa
//   standard de $5 al umbral humano: regla estricta; en la duda, reintento, testigo o apelación
//   human    desde HUMAN_REVIEW_MIN_STAKE_CENTS: la duda de la IA la decide el jurado de Terac
export type CheckLevel = 'light' | 'standard' | 'human';
export const LIGHT_CHECK_BELOW_CENTS = 500;
export const AI_LIGHT_APPROVE_CONFIDENCE = 0.6;

export function checkLevel(stakeCents: number, humanMinCents = HUMAN_REVIEW_MIN_STAKE_CENTS): CheckLevel {
  if (stakeCents < LIGHT_CHECK_BELOW_CENTS) return 'light';
  return stakeCents >= humanMinCents ? 'human' : 'standard';
}

// Regla de oro: la decide el código, no el prompt. Cualquier otro caso va al jurado. Sin stake,
// se aplica la regla estricta (la del set de evaluación).
// - En `light` (< $5 o sin dinero): no se exige código escrito a mano; basta foto en vivo creíble (o GPS verificado).
// - Desde $5 (`standard` / `human`): el código escrito a mano (`dayCodeVisible`) es obligatorio.
export function shouldAutoApprove(
  audit: AgentAudit,
  emotionalState: 'normal' | 'overwhelmed',
  stakeCents = LIGHT_CHECK_BELOW_CENTS,
  gpsVerified = false,
): boolean {
  if (emotionalState === 'overwhelmed') return false;
  if (checkLevel(stakeCents) === 'light') {
    const hardCheat = audit.cheatSignals.some(
      (signal) => signal !== 'none' && signal !== 'screen_photo' && !(gpsVerified && signal === 'unrelated_scene'),
    );
    return !hardCheat && (audit.taskMatch || gpsVerified) && audit.confidence >= AI_LIGHT_APPROVE_CONFIDENCE;
  }
  const allowedSignal = (signal: CheatSignal) => signal === 'none' || (gpsVerified && signal === 'unrelated_scene');
  if (!audit.dayCodeVisible || !audit.cheatSignals.every(allowedSignal)) return false;
  if (gpsVerified && audit.dayCodeVisible && audit.confidence >= AI_LIGHT_APPROVE_CONFIDENCE) return true;
  return audit.verdict === 'APPROVE' && audit.confidence >= AI_AUTO_APPROVE_CONFIDENCE;
}

// Cuándo interviene un humano (docs/04 §7). Un juez cuesta más que la comisión de un pacto
// pequeño, así que la duda con stake bajo se resuelve sin Terac: segunda prueba, testigo o,
// al caducar, el Vault (equivocarse sale barato porque el dinero no se pierde).
// Con el máximo en $50, la duda de los pactos de $20 a $50 va a Terac; súbelo con HUMAN_REVIEW_MIN_STAKE_CENTS.
export const HUMAN_REVIEW_MIN_STAKE_CENTS = 2000;
export const APPEALS_PER_MONTH_PASS = 2; // apelaciones incluidas en el High-Yield Pass
export const MAX_PROOFS_PER_PACT = 2; // la prueba inicial y un reintento
export const AI_REVIEW_FALLBACK_HOURS = 48; // sin resolver tras la duda de la IA → Vault

// ¿Debe revisar un humano una prueba que la IA no aprobó? Las apelaciones siempre pasan.
export function needsHumanReview(stakeCents: number, appeal = false, minStakeCents = HUMAN_REVIEW_MIN_STAKE_CENTS) {
  return appeal || stakeCents >= minStakeCents;
}

// Apelación con fianza (docs/04 §7). El usuario que cree haber cumplido pide un panel de
// jueces humanos; la fianza sale del stake que PACTA ya retiene, sin cobrar nada nuevo:
//   · gana el panel → stake devuelto entero y la fianza no se cobra;
//   · pierde       → el stake va al Vault menos la fianza, que paga a Terac (≈ un estudio).
// Con el High-Yield Pass las apelaciones van incluidas y las paga PACTA (sin fianza).
export const APPEAL_MIN_STAKE_CENTS = 1500; // por debajo, la fianza se come el stake
export const APPEAL_BOND_CENTS = 750; // ≈ incentivo mínimo de Terac ($5) + 50% de comisión
export const APPEAL_PANEL_SIZE = 3; // jueces; decide la mayoría
export const APPEAL_MAX_EXTRA_PHOTOS = 2;
export const APPEAL_NOTE_MAX_CHARS = 280;

// Lotes (docs/04 §7): las apelaciones esperan en cola y se revisan juntas en UN estudio de Terac
// con el panel de APPEAL_PANEL_SIZE jueces. Un estudio de 3 jueces cuesta $13.50 (1–3 min) o $18
// (4–8 min), así que con 2 casos sale a ≤ $6.75 por caso y con 5 a $3.60: siempre por debajo de
// la fianza de $7.50. Un caso suelto ($13.50) solo se lanza si lleva esperando demasiado.
export const BATCH_MIN_CASES = 3; // con 3 o más se lanza al momento
export const BATCH_MAX_CASES = 5; // más casos alargarían la tarea de 8 min y subirían el precio
export const BATCH_PAIR_WAIT_HOURS = 24; // con 2 casos, tras esta espera
export const BATCH_SINGLE_WAIT_HOURS = 48; // con 1 caso, tras esta espera (PACTA asume la diferencia)
export const BATCH_MINUTES_PER_CASE = 1.5; // foto + pruebas extra + nota

// Dado el tiempo que lleva esperando cada apelación en cola (horas), decide si lanzar un lote.
export function batchPlan(waitingHours: number[]): { launch: boolean; cases: number; minutes: number } {
  const cases = Math.min(waitingHours.length, BATCH_MAX_CASES);
  const oldest = waitingHours.length ? Math.max(...waitingHours) : 0;
  const launch =
    cases >= BATCH_MIN_CASES ||
    (cases >= 2 && oldest >= BATCH_PAIR_WAIT_HOURS) ||
    (cases >= 1 && oldest >= BATCH_SINGLE_WAIT_HOURS);
  // Terac cobra lo mismo de 1 a 3 min y de 4 a 8 min: se queda dentro de esos tramos.
  const minutes = Math.min(8, Math.max(3, Math.ceil(cases * BATCH_MINUTES_PER_CASE)));
  return { launch, cases, minutes };
}

// Fianza que debe asumir quien apela, o null si no puede apelar. `covered`: el Pass cubre la
// apelación; `waived`: demo (FREE_APPEALS), sin fianza a cualquier stake.
export function appealBondCents(stakeCents: number, covered: boolean, waived = false): number | null {
  if (covered || waived) return 0;
  return stakeCents >= APPEAL_MIN_STAKE_CENTS ? Math.min(APPEAL_BOND_CENTS, stakeCents) : null;
}

// Jurado humano (Terac): votos necesarios para cerrar un caso. Con un stake de $5–$20 y
// ~$6 por juez, un solo voto es lo que sale a cuenta; las apelaciones usan un panel de
// APPEAL_PANEL_SIZE y súbelo solo para medir acuerdo.
export const JURY_QUORUM = 1;

export type JuryVote = 'APPROVE' | 'REJECT' | 'CHEAT';

// Mayoría estricta de todos los votos; sin mayoría, REJECT. Una trampa solo se confirma
// con mayoría estricta, porque cuesta −50 de Trust y 7 días de bloqueo de retiros.
export function resolveJuryVerdict(votes: JuryVote[]): JuryVote {
  const count = (v: JuryVote) => votes.filter((x) => x === v).length;
  if (count('APPROVE') * 2 > votes.length) return 'APPROVE';
  if (count('CHEAT') * 2 > votes.length) return 'CHEAT';
  return 'REJECT';
}

// Trust Score
export const TRUST_START_SCORE = 50;
export const TRUST_MIN = 0;
export const TRUST_MAX = 100;
export const TRUST_DELTA = {
  aiApproved: 15,
  reputationOnlyApproved: 5,
  juryApproved: 20,
  failedOrExpired: -30,
  cheatConfirmed: -50,
  mercyTaskCompleted: 5,
  circleAllMet: 10,
} as const;

// Redemption Vault (rendimiento simulado, no es inversión real)
export const VAULT_APY_SIMULATED = 0.0485;
export const VAULT_UNLOCK_MIN_TRUST = 70;
export const VAULT_UNLOCK_VERIFIED_STREAK = 3;
export const VAULT_UNLOCK_TRANCHE_CENTS = 2000;
export const WITHDRAWAL_LOCK_DAYS_AFTER_CHEAT = 7;

// Stake por pacto (en céntimos). Con tarjeta, mínimo $5: Whop no devuelve su comisión al
// reembolsar (docs/03 §6). Con el saldo prepagado no hay comisión por pacto y basta $1.
export const STAKE_MIN_CENTS = 500;
export const CREDIT_STAKE_MIN_CENTS = 100;
export const STAKE_MAX_CENTS = 5000;
export const STAKE_STEP_CENTS = 500;
export const STAKE_PRESETS_CENTS = [500, 1000, 2000, 5000] as const;
export const CREDIT_STAKE_PRESETS_CENTS = [100, 200, 500, 1000, 2000] as const;

// Recargas del saldo prepagado: una comisión de Whop por recarga en vez de una por pacto.
export const TOPUP_PRESETS_CENTS = [1000, 2000, 5000] as const;

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
