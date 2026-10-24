import type { LoginAttempt } from '../shared/auth';

// Keep callback validation independent of UI and storage so state, expiry and denial
// can be checked before any credentials or account data are changed.
export function callbackCode(url: string, attempt: LoginAttempt | null, now = Date.now()): string {
  const params = new URL(url).searchParams;
  if (!attempt || params.get('state') !== attempt.state || now - attempt.createdAt > 10 * 60_000 || now < attempt.createdAt) throw new Error('login_expired');
  if (params.get('error')) throw new Error(params.get('error') === 'access_denied' ? 'login_cancelled' : 'login_expired');
  const code = params.get('code');
  if (!code) throw new Error('login_expired');
  return code;
}
