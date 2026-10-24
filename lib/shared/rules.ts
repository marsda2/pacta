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
export function shouldAutoApprove(audit: AgentAudit, emotionalState: 'normal' | 'overwhelmed', stakeCents = LIGHT_CHECK_BELOW_CENTS): boolean {
  if (emotionalState === 'overwhelmed' || !audit.cheatSignals.every((signal) => signal === 'none')) return false;
  if (checkLevel(stakeCents) === 'light') {
    return audit.verdict !== 'REJECT' && audit.taskMatch && audit.confidence >= AI_LIGHT_APPROVE_CONFIDENCE;
  }
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

// Jurado humano (Terac): votos necesarios para cerrar un caso. Con un stake de $5–$20 y
// ~$6 por juez, un solo voto es lo que sale a cuenta; súbelo solo para medir acuerdo.
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
