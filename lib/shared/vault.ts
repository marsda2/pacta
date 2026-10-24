// Redemption Vault (docs/01): saldo bloqueado, rendimiento simulado y desbloqueo por tramos.
// Funciones puras: las usa el servidor para decidir y la app para mostrar el progreso.
import {
  VAULT_APY_SIMULATED,
  VAULT_UNLOCK_MIN_TRUST,
  VAULT_UNLOCK_TRANCHE_CENTS,
  VAULT_UNLOCK_VERIFIED_STREAK,
} from './rules';

export type Tier = 'free' | 'high_yield';

// Free recupera el 90% de cada tramo (PACTA cobra un 10%) y no cobra el rendimiento.
// El High-Yield Pass recupera el 100% más el rendimiento simulado.
export const VAULT_FREE_FEE_RATE = 0.1;
export const PASS_PRICE_CENTS = 900;
export const PASS_BILLING_DAYS = 30;

const DAY_MS = 24 * 3600_000;
const YEAR_MS = 365 * DAY_MS;

// Movimientos del Vault. lock: entra un stake fallado. unlock: se devuelve al usuario.
// fee: comisión del 10% de Free. yield: rendimiento simulado abonado al desbloquear con el Pass
// (informativo, no cambia el saldo bloqueado).
export type LedgerType = 'lock' | 'unlock' | 'fee' | 'yield';

export interface LedgerEntry {
  type: LedgerType;
  amountCents: number;
  at: number;
}

export function lockedBalanceCents(entries: LedgerEntry[]): number {
  return entries.reduce((sum, e) => (e.type === 'lock' ? sum + e.amountCents : e.type === 'yield' ? sum : sum - e.amountCents), 0);
}

// Rendimiento simulado = APY × ∫ saldo dt, con el saldo constante entre movimientos, menos lo ya
// abonado. Devuelve céntimos con decimales para que la UI pueda mostrarlo crecer.
export function simulatedYieldCents(entries: LedgerEntry[], now: number, apy: number = VAULT_APY_SIMULATED): number {
  const sorted = [...entries].sort((a, b) => a.at - b.at);
  let balance = 0;
  let accrued = 0;
  let paid = 0;
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (e.type === 'yield') paid += e.amountCents;
    else balance += e.type === 'lock' ? e.amountCents : -e.amountCents;
    const until = Math.min(now, sorted[i + 1]?.at ?? now);
    if (until > e.at && balance > 0) accrued += (balance * apy * (until - e.at)) / YEAR_MS;
  }
  return Math.max(0, accrued - paid);
}

export function dailyYieldCents(balanceCents: number, apy: number = VAULT_APY_SIMULATED): number {
  return (balanceCents * apy) / 365;
}

export interface UnlockInput {
  balanceCents: number;
  trustScore: number;
  // Pactos verificados desde el último fallo o el último desbloqueo.
  verifiedSinceReset: number;
  withdrawalsLockedUntil: number | null;
  now: number;
}

export interface UnlockStatus {
  eligible: boolean;
  trancheCents: number;
  trustNeeded: number;
  pactsNeeded: number;
  lockedUntil: number | null;
}

// Regla de desbloqueo: Trust ≥ 70, 3 pactos verificados seguidos desde el último fallo o
// desbloqueo, y sin el bloqueo de 7 días por trampa. Se libera un tramo de min($20, saldo).
export function unlockStatus(input: UnlockInput): UnlockStatus {
  const trustNeeded = Math.max(0, VAULT_UNLOCK_MIN_TRUST - input.trustScore);
  const pactsNeeded = Math.max(0, VAULT_UNLOCK_VERIFIED_STREAK - input.verifiedSinceReset);
  const lockedUntil = input.withdrawalsLockedUntil && input.withdrawalsLockedUntil > input.now ? input.withdrawalsLockedUntil : null;
  const trancheCents = Math.min(VAULT_UNLOCK_TRANCHE_CENTS, Math.max(0, input.balanceCents));
  return {
    eligible: trancheCents > 0 && trustNeeded === 0 && pactsNeeded === 0 && lockedUntil === null,
    trancheCents,
    trustNeeded,
    pactsNeeded,
    lockedUntil,
  };
}

// Reparto de un tramo: lo que vuelve al usuario y la comisión de PACTA.
export function trancheSplit(trancheCents: number, tier: Tier): { payoutCents: number; feeCents: number } {
  const feeCents = tier === 'high_yield' ? 0 : Math.round(trancheCents * VAULT_FREE_FEE_RATE);
  return { payoutCents: trancheCents - feeCents, feeCents };
}

// Parte del rendimiento que corresponde a un tramo (solo se abona con el Pass).
export function trancheYieldCents(trancheCents: number, balanceCents: number, yieldCents: number): number {
  if (balanceCents <= 0) return 0;
  return Math.floor((yieldCents * Math.min(trancheCents, balanceCents)) / balanceCents);
}

// El rendimiento de saldos pequeños son fracciones de céntimo: se muestran con 4 decimales.
export function formatYieldUsd(cents: number): string {
  return `$${(cents / 100).toFixed(cents < 100 ? 4 : 2)}`;
}

type HintInput = Pick<UnlockStatus, 'eligible' | 'trancheCents' | 'trustNeeded' | 'pactsNeeded'> & { lockedUntil?: number | null };

// "Te faltan 2 pactos verificados y 15 puntos de Trust para desbloquear $20."
export function unlockHint(status: HintInput, formatUsd: (cents: number) => string): string {
  if (status.trancheCents === 0) return 'Your Vault is empty. Keep your pacts and it stays that way.';
  if (status.lockedUntil) return `Withdrawals are paused until ${new Date(status.lockedUntil).toLocaleDateString()} after a confirmed cheat.`;
  if (status.eligible) return `You can unlock ${formatUsd(status.trancheCents)} now.`;
  const parts: string[] = [];
  if (status.pactsNeeded > 0) parts.push(`${status.pactsNeeded} more verified pact${status.pactsNeeded === 1 ? '' : 's'}`);
  if (status.trustNeeded > 0) parts.push(`${status.trustNeeded} Trust points`);
  return `${parts.join(' and ')} to unlock ${formatUsd(status.trancheCents)}.`;
}
