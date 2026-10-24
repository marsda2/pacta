import { createHmac, timingSafeEqual } from 'node:crypto';

import { AI_REVIEW_FALLBACK_HOURS } from '../shared/rules';
import { query } from './db';
import { HttpError } from './http';
import { getPact, resolvePact } from './pact-engine';

interface Invitation { userId: string; pactId: string; proofId: string; exp: number }

function signature(payload: string) {
  const secret = process.env.WITNESS_TOKEN_SECRET || process.env.WHOP_API_KEY;
  if (!secret) throw new HttpError(503, 'auth_not_configured');
  return createHmac('sha256', secret).update(`pacta-witness-v1:${payload}`).digest('base64url');
}

export function readWitnessToken(token: unknown, pactId: string): Invitation {
  if (typeof token !== 'string' || token.length > 2048) throw new HttpError(404, 'witness_link_invalid');
  const [payload, supplied, extra] = token.split('.');
  if (!payload || !supplied || extra) throw new HttpError(404, 'witness_link_invalid');
  const expected = Buffer.from(signature(payload));
  const given = Buffer.from(supplied);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new HttpError(404, 'witness_link_invalid');
  let invitation: Invitation;
  try { invitation = JSON.parse(Buffer.from(payload, 'base64url').toString()); }
  catch { throw new HttpError(404, 'witness_link_invalid'); }
  if (invitation.pactId !== pactId || typeof invitation.exp !== 'number' || invitation.exp <= Date.now() || typeof invitation.userId !== 'string' || typeof invitation.proofId !== 'string') throw new HttpError(404, 'witness_link_invalid');
  return invitation;
}

export async function createWitnessLink(userId: string, pactId: string) {
  const pact = await getPact(userId, pactId);
  if (pact.rawStatus !== 'AI_REVIEW') throw new HttpError(409, 'not_in_review');
  const { rows } = await query<{ id: string; created_at: Date }>('select id, created_at from pacta.proofs where pact_id = $1 order by created_at desc limit 1', [pactId]);
  if (!rows[0]) throw new HttpError(409, 'not_in_review');
  const invitation: Invitation = { userId, pactId, proofId: rows[0].id, exp: rows[0].created_at.getTime() + AI_REVIEW_FALLBACK_HOURS * 3600_000 };
  if (invitation.exp <= Date.now()) throw new HttpError(409, 'review_expired');
  const payload = Buffer.from(JSON.stringify(invitation)).toString('base64url');
  return { path: `/witness/${pactId}?token=${encodeURIComponent(`${payload}.${signature(payload)}`)}` };
}

export async function witnessReview(pactId: string, token: unknown) {
  const invitation = readWitnessToken(token, pactId);
  const pact = await getPact(invitation.userId, pactId);
  const { rows } = await query<{ id: string; day_code: string }>(
    'select r.id, p.day_code from pacta.proofs r join pacta.pacts p on p.id = r.pact_id where p.id = $1 order by r.created_at desc limit 1', [pactId],
  );
  if (rows[0]?.id !== invitation.proofId) throw new HttpError(404, 'witness_link_invalid');
  return { title: pact.title, dayCode: rows[0].day_code, photoUrl: pact.proofImagePath, closed: pact.rawStatus !== 'AI_REVIEW' };
}

export async function witnessVote(pactId: string, token: unknown, kept: unknown) {
  const invitation = readWitnessToken(token, pactId);
  if (typeof kept !== 'boolean') throw new HttpError(400, 'bad_verdict');
  await resolvePact(invitation.userId, pactId, kept, 'witness', invitation.proofId);
  return { kept };
}
