import { apiBase } from '@/lib/api/base';
import type { WhopTokens } from '@/lib/shared/auth';

import { authStorage } from './storage';

const KEY = 'pacta.auth.tokens';
let tokens: WhopTokens | null = null;
let initialized: Promise<void> | undefined;
let refreshing: Promise<string | null> | undefined;
let revision = 0;
let storageWrites: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function writeStorage(operation: () => Promise<void>) {
  const pending = storageWrites.catch(() => undefined).then(operation);
  storageWrites = pending;
  return pending;
}

export async function authRequest<T>(action: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBase()}/api/vault/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000),
  }).catch(() => { throw new Error('network_error'); });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'auth_unavailable');
  return result;
}

async function initialize() {
  initialized ??= (async () => {
    try {
      const saved = await authStorage.getItem(KEY);
      const parsed = saved ? JSON.parse(saved) as WhopTokens : null;
      if (parsed && typeof parsed.access_token === 'string' && typeof parsed.refresh_token === 'string' && typeof parsed.expires_in === 'number' && typeof parsed.obtained_at === 'number') tokens = parsed;
    } catch { tokens = null; }
  })();
  await initialized;
}

export function onSessionExpired(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function saveTokens(next: WhopTokens, expectedRevision?: number) {
  await initialize();
  if (expectedRevision !== undefined && expectedRevision !== revision) return false;
  const savedRevision = ++revision;
  tokens = next;
  try { await writeStorage(() => authStorage.setItem(KEY, JSON.stringify(next))); }
  catch (error) {
    if (savedRevision === revision) tokens = null;
    throw error;
  }
  return savedRevision === revision;
}

export async function expireSession(expectedToken?: string | null) {
  await initialize();
  if (expectedToken !== undefined && expectedToken !== (tokens?.access_token ?? null)) return;
  revision++;
  tokens = null;
  listeners.forEach((listener) => listener());
  await writeStorage(() => authStorage.removeItem(KEY));
}

export async function clearTokens() {
  await initialize();
  const previous = tokens;
  await expireSession();
  return previous;
}

export async function getAccessToken(): Promise<string | null> {
  await initialize();
  if (!tokens) return null;
  if (Date.now() < tokens.obtained_at + tokens.expires_in * 1000 - 60_000) return tokens.access_token;
  // Whop rotates refresh tokens: one refresh for all concurrent requests.
  refreshing ??= (async () => {
    const currentRevision = revision;
    const current = tokens!;
    try {
      const next = await authRequest<WhopTokens>('auth-refresh', { refreshToken: current.refresh_token });
      if (currentRevision !== revision) return null;
      const saved = await saveTokens(next, currentRevision);
      return saved ? next.access_token : null;
    } catch (error) {
      if (error instanceof Error && ['login_expired', 'bad_user_token'].includes(error.message)) await expireSession(current.access_token);
      throw error;
    }
  })().finally(() => { refreshing = undefined; });
  return refreshing;
}
