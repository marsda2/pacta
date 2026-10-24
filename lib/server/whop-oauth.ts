import { createHash, randomBytes } from 'node:crypto';

import type { LoginAttempt, WhopTokens } from '../shared/auth';
import { HttpError } from './http';

const OAUTH = 'https://api.whop.com/oauth';

function appId() {
  const id = process.env.WHOP_APP_ID;
  if (!id) throw new HttpError(503, 'auth_not_configured');
  return id;
}

export function validateRedirect(value: unknown): string {
  if (typeof value !== 'string') throw new HttpError(400, 'bad_redirect');
  const allowed = new Set([
    `${(process.env.PUBLIC_APP_URL || 'https://pacta-theta.vercel.app').replace(/\/$/, '')}/auth/callback`,
    'pacta://auth/callback',
    ...(process.env.WHOP_OAUTH_REDIRECT_URIS || '').split(',').map((uri) => uri.trim()).filter(Boolean),
  ]);
  // Localhost callbacks are only accepted by the local development server.
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    for (const port of [8081, 8082]) {
      allowed.add(`http://localhost:${port}/auth/callback`);
      allowed.add(`http://127.0.0.1:${port}/auth/callback`);
    }
  }
  if (!allowed.has(value)) throw new HttpError(400, 'bad_redirect');
  return value;
}

export function startWhopLogin(redirect: unknown): LoginAttempt {
  const redirectUri = validateRedirect(redirect);
  const codeVerifier = randomBytes(32).toString('base64url');
  const state = randomBytes(24).toString('base64url');
  const nonce = randomBytes(24).toString('base64url');
  const params = new URLSearchParams({
    response_type: 'code', client_id: appId(), redirect_uri: redirectUri,
    scope: 'openid profile email', state, nonce,
    code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
    code_challenge_method: 'S256',
  });
  return { url: `${OAUTH}/authorize?${params}`, state, nonce, codeVerifier, redirectUri, createdAt: Date.now() };
}

async function tokenRequest(body: Record<string, string>): Promise<WhopTokens & { id_token?: string }> {
  const response = await fetch(`${OAUTH}/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, client_id: appId(), ...(process.env.WHOP_CLIENT_SECRET ? { client_secret: process.env.WHOP_CLIENT_SECRET } : {}) }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => { throw new HttpError(503, 'auth_unavailable'); });
  if (!response.ok) {
    const unavailable = response.status >= 500 || response.status === 429;
    throw new HttpError(unavailable ? 503 : 401, unavailable ? 'auth_unavailable' : 'login_expired');
  }
  const tokens = await response.json() as Partial<WhopTokens> & { id_token?: string };
  if (typeof tokens.access_token !== 'string' || typeof tokens.refresh_token !== 'string' || typeof tokens.expires_in !== 'number' || tokens.expires_in <= 0) {
    throw new HttpError(502, 'auth_unavailable');
  }
  return { access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_in: tokens.expires_in, obtained_at: Date.now(), id_token: tokens.id_token };
}

export async function exchangeWhopCode(body: Record<string, unknown>) {
  const redirectUri = validateRedirect(body.redirectUri);
  if (typeof body.code !== 'string' || !body.code || typeof body.codeVerifier !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(body.codeVerifier) || typeof body.nonce !== 'string' || !body.nonce) {
    throw new HttpError(400, 'bad_login');
  }
  const tokens = await tokenRequest({ grant_type: 'authorization_code', code: body.code, code_verifier: body.codeVerifier, redirect_uri: redirectUri });
  // The ID token is received directly from Whop over TLS, never from the client.
  // User identity is independently verified against Whop's userinfo endpoint below.
  let claims: { nonce?: string; sub?: string; aud?: string | string[]; exp?: number };
  try { claims = JSON.parse(Buffer.from(tokens.id_token?.split('.')[1] || '', 'base64url').toString()); }
  catch { throw new HttpError(401, 'bad_user_token'); }
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.nonce !== body.nonce || !audience.includes(appId()) || typeof claims.exp !== 'number' || claims.exp <= Date.now() / 1000) throw new HttpError(401, 'bad_user_token');
  const profile = await whopUserInfo(tokens.access_token);
  if (profile.sub !== claims.sub) throw new HttpError(401, 'bad_user_token');
  const { id_token: _idToken, ...credentials } = tokens;
  return credentials;
}

export async function refreshWhopLogin(value: unknown) {
  if (typeof value !== 'string' || !value) throw new HttpError(400, 'bad_login');
  const { id_token: _idToken, ...tokens } = await tokenRequest({ grant_type: 'refresh_token', refresh_token: value });
  return tokens;
}

export async function revokeWhopLogin(value: unknown) {
  if (typeof value !== 'string' || !value) throw new HttpError(400, 'bad_login');
  const response = await fetch(`${OAUTH}/revoke`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: value, client_id: appId(), ...(process.env.WHOP_CLIENT_SECRET ? { client_secret: process.env.WHOP_CLIENT_SECRET } : {}) }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => undefined);
  if (!response?.ok) throw new HttpError(503, 'auth_unavailable');
}

export async function whopUserInfo(accessToken: string): Promise<{ sub: string; name?: string; preferred_username?: string; email?: string; picture?: string }> {
  const response = await fetch(`${OAUTH}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000),
  }).catch(() => { throw new HttpError(503, 'auth_unavailable'); });
  if (!response.ok) throw new HttpError(response.status >= 500 || response.status === 429 ? 503 : 401, response.status >= 500 || response.status === 429 ? 'auth_unavailable' : 'bad_user_token');
  const profile = await response.json();
  if (typeof profile.sub !== 'string' || !profile.sub.startsWith('user_')) throw new HttpError(401, 'bad_user_token');
  return profile;
}
