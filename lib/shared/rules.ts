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

// Regla de oro: la decide el código, no el prompt. Cualquier otro caso va al jurado.
export function shouldAutoApprove(audit: AgentAudit, emotionalState: 'normal' | 'overwhelmed'): boolean {
  return (
    audit.verdict === 'APPROVE' &&
    audit.confidence >= AI_AUTO_APPROVE_CONFIDENCE &&
    audit.cheatSignals.every((signal) => signal === 'none') &&
    emotionalState !== 'overwhelmed'
  );
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

// Stake por pacto (en céntimos). Mínimo $5: Whop no devuelve su comisión al reembolsar (docs/03 §6).
export const STAKE_MIN_CENTS = 500;
export const STAKE_MAX_CENTS = 2000;
export const STAKE_STEP_CENTS = 500;
export const STAKE_PRESETS_CENTS = [500, 1000, 2000] as const;

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
