import { TRUST_DELTA, TRUST_MAX, TRUST_MIN } from '@/lib/shared/rules';
import type { Pact } from '@/lib/shared/types';

// Trust Score derivado del historial (prototipo). En producción lo calcula pact-engine
// en el servidor y se lee de trust_events.
export function trustScore(pacts: Pact[], start: number): number {
  const verified = pacts.filter((p) => p.status === 'verified').length;
  const missed = pacts.filter((p) => p.status === 'missed').length;
  const score = start + verified * TRUST_DELTA.aiApproved + missed * TRUST_DELTA.failedOrExpired;
  return Math.min(TRUST_MAX, Math.max(TRUST_MIN, score));
}

// Los stakes fallados no se pierden: quedan en el Redemption Vault.
export function vaultCents(pacts: Pact[]): number {
  return pacts.filter((p) => p.status === 'missed').reduce((sum, p) => sum + p.stakeCents, 0);
}
