// Reglas de negocio compartidas (cliente y servidor). Fuente: docs/01, 02 y 04.

// Confianza mínima del agente para aprobar sin jurado humano.
export const AI_AUTO_APPROVE_CONFIDENCE = 0.88;

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

// Stake por pacto (en céntimos). La demo usa $1–$5.
export const STAKE_MIN_CENTS = 100;
export const STAKE_MAX_CENTS = 2000;
