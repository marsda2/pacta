import { createPublicKey, verify, type KeyObject, type webcrypto } from 'node:crypto';

import type { VercelRequest } from '@vercel/node';

import { query } from './db';
import { HttpError } from './http';
import { demoUserId } from './pact-engine';

// Identidad dentro de Whop (docs/03 §2). Whop abre PACTA en un iframe y añade el JWT del usuario
// en la cabecera x-whop-user-token de cada petición al mismo origen. @whop/sdk 2.x ya no trae
// verifyUserToken, así que se verifica aquí igual que los SDK oficiales de Python y Ruby: ES256,
// claves del JWKS de Whop, emisor urn:whopcom:exp-proxy y audiencia = WHOP_APP_ID.
// Sin cabecera (la URL de Vercel abierta fuera de Whop) se usa el usuario de demo, salvo que
// WHOP_REQUIRE_USER_TOKEN=true.

const HEADER = 'x-whop-user-token';
const JWKS_URL = 'https://api.whop.com/.well-known/jwks.json';
const ISSUER = 'urn:whopcom:exp-proxy';
const JWKS_MAX_AGE_MS = 12 * 3600_000;
const JWKS_COOLDOWN_MS = 30_000;
const CLOCK_SKEW_SEC = 30;

interface Jwks {
  byKid: Map<string, KeyObject>;
  all: KeyObject[];
  fetchedAt: number;
}

let jwks: Jwks | undefined;

// Caché de 12 h; si llega un kid desconocido se vuelve a pedir, como mucho cada 30 s.
async function loadJwks(refresh: boolean): Promise<Jwks> {
  const age = jwks ? Date.now() - jwks.fetchedAt : Infinity;
  if (jwks && age < JWKS_MAX_AGE_MS && (!refresh || age < JWKS_COOLDOWN_MS)) return jwks;

  const response = await fetch(JWKS_URL, { headers: { Accept: 'application/json' } }).catch(() => undefined);
  if (!response?.ok) {
    if (jwks) return jwks;
    throw new HttpError(503, 'whop_keys_unavailable');
  }
  const body = (await response.json()) as { keys?: (webcrypto.JsonWebKey & { kid?: string })[] };
  const byKid = new Map<string, KeyObject>();
  const all: KeyObject[] = [];
  for (const jwk of body.keys ?? []) {
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') continue;
    const key = createPublicKey({ key: jwk, format: 'jwk' });
    all.push(key);
    if (jwk.kid) byKid.set(jwk.kid, key);
  }
  jwks = { byKid, all, fetchedAt: Date.now() };
  return jwks;
}

function decodePart<T>(part: string): T {
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;
  } catch {
    throw new HttpError(401, 'bad_user_token');
  }
}

interface TokenClaims {
  sub?: unknown;
  aud?: unknown;
  iss?: unknown;
  exp?: unknown;
  nbf?: unknown;
}

// Devuelve el id de usuario de Whop (user_…) si el token es válido; si no, 401.
export async function verifyWhopUserToken(token: string): Promise<{ whopUserId: string; appId: string }> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpError(401, 'bad_user_token');
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = decodePart<{ alg?: string; kid?: string }>(headerPart);
  if (header.alg !== 'ES256') throw new HttpError(401, 'bad_user_token');

  const signed = Buffer.from(`${headerPart}.${payloadPart}`);
  const signature = Buffer.from(signaturePart, 'base64url');
  const valid = (key: KeyObject) => verify('sha256', signed, { key, dsaEncoding: 'ieee-p1363' }, signature);

  let verified = false;
  for (const refresh of [false, true]) {
    const keys = await loadJwks(refresh);
    const known = header.kid ? keys.byKid.get(header.kid) : undefined;
    if (known ? valid(known) : keys.all.some(valid)) {
      verified = true;
      break;
    }
  }
  if (!verified) throw new HttpError(401, 'bad_user_token');

  const claims = decodePart<TokenClaims>(payloadPart);
  const now = Date.now() / 1000;
  if (claims.iss !== ISSUER) throw new HttpError(401, 'bad_user_token');
  if (typeof claims.exp === 'number' && claims.exp + CLOCK_SKEW_SEC < now) throw new HttpError(401, 'user_token_expired');
  if (typeof claims.nbf === 'number' && claims.nbf - CLOCK_SKEW_SEC > now) throw new HttpError(401, 'bad_user_token');
  if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.aud !== 'string' || !claims.aud) {
    throw new HttpError(401, 'bad_user_token');
  }
  const appId = process.env.WHOP_APP_ID;
  if (appId && claims.aud !== appId) throw new HttpError(401, 'wrong_whop_app');
  return { whopUserId: claims.sub, appId: claims.aud };
}

// Usuario de PACTA de la petición: el de Whop si viene el token, el de demo si no.
export async function requestUserId(req: VercelRequest): Promise<string> {
  const raw = req.headers[HEADER];
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (!token) {
    if (process.env.WHOP_REQUIRE_USER_TOKEN === 'true') throw new HttpError(401, 'whop_login_required');
    return demoUserId();
  }
  const { whopUserId } = await verifyWhopUserToken(token);
  const { rows } = await query<{ id: string }>(
    `insert into pacta.users (whop_user_id) values ($1)
     on conflict (whop_user_id) do update set whop_user_id = excluded.whop_user_id
     returning id`,
    [whopUserId],
  );
  return rows[0].id;
}
