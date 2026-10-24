// Integration checks: real PACTA database, mocked Whop OAuth only. No payments.
// All QA users and pacts are removed in finally. Run: npm run check:auth
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';

import type { VercelRequest, VercelResponse } from '@vercel/node';

import pactsHandler from '../api/pacts';
import pactHandler from '../api/pacts/[id]/index';
import vaultHandler from '../api/vault/[action]';
import { query, withTransaction } from '../lib/server/db';
import { requestSession, requestUserId } from '../lib/server/identity';
import { callbackCode } from '../lib/auth/callback';
import { exchangeWhopCode, refreshWhopLogin, revokeWhopLogin, startWhopLogin } from '../lib/server/whop-oauth';

const originalFetch = globalThis.fetch;
const suffix = randomUUID();
const whopIds = [`user_qa_auth_a_${suffix}`, `user_qa_auth_b_${suffix}`];
const appId = process.env.WHOP_APP_ID || 'app_qa';
process.env.WHOP_APP_ID = appId;
delete process.env.ALLOW_DEMO_USER;
let checks = 0;
const check = (label: string, condition: unknown) => { assert.ok(condition, label); checks++; console.log(`OK ${label}`); };
const req = (headers: Record<string, string> = {}) => ({ headers }) as VercelRequest;

async function invoke(handler: typeof vaultHandler, action: string, options: { method?: string; token?: string; body?: unknown; id?: string } = {}) {
  let status = 200;
  let result: Record<string, unknown> = {};
  const headers: Record<string, unknown> = {};
  const response = {
    setHeader: (key: string, value: unknown) => { headers[key] = value; },
    status: (code: number) => { status = code; return response; },
    json: (value: Record<string, unknown>) => { result = value; return response; },
    end: () => response,
  };
  await handler({ headers: options.token ? { authorization: `Bearer ${options.token}` } : {}, method: options.method || 'GET', query: { action, id: options.id }, body: options.body } as unknown as VercelRequest, response as unknown as VercelResponse);
  return { status, result, headers };
}

async function main() {
  const login = startWhopLogin('pacta://auth/callback');
  const authorize = new URL(login.url);
  check('authorization is on Whop, with identity scopes only', authorize.origin === 'https://api.whop.com' && authorize.searchParams.get('scope') === 'openid profile email');
  check('PKCE S256 matches the verifier', authorize.searchParams.get('code_challenge') === createHash('sha256').update(login.codeVerifier).digest('base64url') && authorize.searchParams.get('code_challenge_method') === 'S256');
  const second = startWhopLogin('pacta://auth/callback');
  check('each attempt has independent state, nonce and verifier', login.state !== second.state && login.nonce !== second.nonce && login.codeVerifier !== second.codeVerifier);
  check('valid callback preserves the authorization code', callbackCode(`pacta://auth/callback?code=example&state=${login.state}`, login) === 'example');
  assert.throws(() => callbackCode('pacta://auth/callback?code=example&state=forged', login), /login_expired/); checks++; console.log('OK mismatched client state rejected');
  assert.throws(() => callbackCode(`pacta://auth/callback?code=example&state=${login.state}`, login, login.createdAt + 600_001), /login_expired/); checks++; console.log('OK expired client attempt rejected');
  assert.throws(() => callbackCode(`pacta://auth/callback?error=access_denied&state=${login.state}`, login), /login_cancelled/); checks++; console.log('OK denied consent handled');
  assert.throws(() => callbackCode(`pacta://auth/callback?code=example&state=${login.state}`, null), /login_expired/); checks++; console.log('OK callback without a saved attempt rejected');
  assert.throws(() => startWhopLogin('https://attacker.example/auth/callback'), /bad_redirect/); checks++; console.log('OK unregistered callbacks rejected');

  // Mock only Whop. Everything from identity mapping to account data uses the real DB.
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://api.whop.com/oauth/userinfo') {
      const bearer = new Headers(init?.headers).get('Authorization');
      const index = bearer === 'Bearer qa-access-a' ? 0 : bearer === 'Bearer qa-access-b' ? 1 : -1;
      return new Response(JSON.stringify(index < 0 ? { error: 'invalid_token' } : { sub: whopIds[index], name: `QA ${index}`, email: `qa-${suffix}-${index}@example.invalid` }), { status: index < 0 ? 401 : 200 });
    }
    if (url === 'https://api.whop.com/oauth/token') {
      const body = JSON.parse(String(init?.body));
      if (body.grant_type === 'refresh_token') return new Response(JSON.stringify({ access_token: 'qa-access-b', refresh_token: 'qa-refresh-rotated', expires_in: 3600 }));
      if (body.code_verifier !== login.codeVerifier) return new Response('{}', { status: 401 });
      const claims = { sub: whopIds[0], nonce: body.code === 'bad-nonce' ? 'wrong' : login.nonce, aud: appId, exp: Date.now() / 1000 + 3600 };
      const idToken = `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
      return new Response(JSON.stringify({ access_token: 'qa-access-a', refresh_token: 'qa-refresh-a', expires_in: 3600, id_token: idToken }));
    }
    if (url === 'https://api.whop.com/oauth/revoke') return new Response('{}');
    return originalFetch(input, init);
  };

  try {
    await assert.rejects(requestUserId(req()), /whop_login_required/); checks++; console.log('OK no implicit demo account');
    await assert.rejects(requestSession(req({ authorization: 'Bearer fake' })), /bad_user_token/); checks++; console.log('OK forged bearer rejected');
    await assert.rejects(requestSession(req({ authorization: 'Basic fake' })), /bad_user_token/); checks++; console.log('OK malformed authorization rejected');
    const exchangeInput = { code: 'good', redirectUri: login.redirectUri, codeVerifier: login.codeVerifier, nonce: login.nonce };
    const credentials = await exchangeWhopCode(exchangeInput);
    check('code exchange returns credentials without ID token', credentials.access_token === 'qa-access-a' && !('id_token' in credentials));
    await assert.rejects(exchangeWhopCode({ ...exchangeInput, code: 'bad-nonce' }), /bad_user_token/); checks++; console.log('OK mismatched nonce rejected');
    await assert.rejects(exchangeWhopCode({ ...exchangeInput, codeVerifier: second.codeVerifier }), /login_expired/); checks++; console.log('OK wrong PKCE verifier rejected');
    const refreshed = await refreshWhopLogin('qa-refresh-a');
    check('refresh preserves the rotated refresh token', refreshed.refresh_token === 'qa-refresh-rotated');
    await revokeWhopLogin('qa-refresh-rotated'); checks++; console.log('OK logout calls token revocation');

    const userA = await requestSession(req({ authorization: 'Bearer qa-access-a' }));
    const userB = await requestSession(req({ authorization: 'Bearer qa-access-b' }));
    check('two Whop accounts map to distinct PACTA accounts', userA.id !== userB.id);
    check('reconnecting maps to the same existing account', (await requestSession(req({ authorization: 'Bearer qa-access-a' }))).id === userA.id);
    check('profile comes from verified Whop identity', userA.name === 'QA 0' && userA.whopUserId === whopIds[0]);

    const anonymous = await invoke(pactsHandler, '');
    check('anonymous pacts request returns 401', anonymous.status === 401);
    const anonymousWallet = await invoke(vaultHandler, 'wallet');
    check('anonymous wallet request returns 401', anonymousWallet.status === 401);
    const session = await invoke(vaultHandler, 'session', { token: 'qa-access-a' });
    check('session endpoint returns the authenticated profile with no-store', session.status === 200 && (session.result.user as { id: string }).id === userA.id && session.headers['Cache-Control'] === 'no-store');
    const created = await invoke(pactsHandler, '', { method: 'POST', token: 'qa-access-a', body: { title: 'QA auth isolation', stakeCents: 0, dueAt: Date.now() + 3600_000, methods: ['photo'], reputationOnly: true } });
    check('signed-in user can create a free pact', created.status === 201);
    const pactId = (created.result.pact as { id: string }).id;
    const otherPacts = await invoke(pactsHandler, '', { token: 'qa-access-b' });
    check('another account cannot see that pact in its list', otherPacts.status === 200 && (otherPacts.result.pacts as { id: string }[]).every((pact) => pact.id !== pactId));
    const otherPact = await invoke(pactHandler, '', { token: 'qa-access-b', id: pactId });
    check('another account cannot open that pact by ID', otherPact.status === 404);
    const preflight = await invoke(vaultHandler, 'session', { method: 'OPTIONS' });
    check('CORS preflight permits mobile bearer auth', preflight.status === 204 && String(preflight.headers['Access-Control-Allow-Headers']).includes('Authorization'));
    console.log(`${checks} auth checks passed. Whop OAuth mocked; PACTA account isolation verified in the real database.`);
  } finally {
    globalThis.fetch = originalFetch;
    await withTransaction(async (q) => {
      const args = [whopIds];
      await q('delete from pacta.pacts where user_id in (select id from pacta.users where whop_user_id = any($1::text[]))', args);
      await q('delete from pacta.users where whop_user_id = any($1::text[])', args);
    });
    const remaining = await query('select id from pacta.users where whop_user_id = any($1::text[])', [whopIds]);
    assert.equal(remaining.rowCount, 0);
    console.log('QA accounts and pacts removed. No payments created.');
  }
}

main().then(() => process.exit(0)).catch((error) => { console.error(error instanceof Error ? error.message : 'Auth check failed'); process.exit(1); });
