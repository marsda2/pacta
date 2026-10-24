import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { apiFetch } from '@/lib/api/client';
import type { LoginAttempt, SessionUser, WhopTokens } from '@/lib/shared/auth';
import { insideWhop } from '@/lib/whop';

import { authStorage } from './storage';
import { callbackCode } from './callback';
import { authRequest, clearTokens, expireSession, onSessionExpired, saveTokens } from './tokens';

const ATTEMPT_KEY = 'pacta.auth.login';
const SIGNED_OUT_KEY = 'pacta.auth.signed-out';
let completing: Promise<SessionUser> | undefined;
let completionKey: string | undefined;

async function exchangeCallback(url: string): Promise<SessionUser> {
  const params = new URL(url).searchParams;
  const key = `${params.get('state')}:${params.get('code')}:${params.get('error')}`;
  if (completionKey !== key) completing = undefined;
  completionKey = key;
  completing ??= (async () => {
    let credentialsSaved = false;
    try {
      const saved = await authStorage.getItem(ATTEMPT_KEY);
      const attempt = saved ? JSON.parse(saved) as LoginAttempt : null;
      const code = callbackCode(url, attempt);
      if (!attempt) throw new Error('login_expired');
      const credentials = await authRequest<WhopTokens>('auth-exchange', {
        code, codeVerifier: attempt.codeVerifier, nonce: attempt.nonce, redirectUri: attempt.redirectUri,
      });
      await saveTokens(credentials);
      credentialsSaved = true;
      const { user } = await apiFetch<{ user: SessionUser }>('/api/vault/session');
      await authStorage.removeItem(SIGNED_OUT_KEY);
      return user;
    } catch (error) {
      if (credentialsSaved) await expireSession();
      throw error;
    } finally {
      await authStorage.removeItem(ATTEMPT_KEY);
    }
  })();
  return completing;
}

interface AuthValue {
  user: SessionUser | null;
  loading: boolean;
  busy: boolean;
  error: unknown;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  completeLogin: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = onSessionExpired(() => { if (active) setUser(null); });
    void (async () => {
      if (await authStorage.getItem(SIGNED_OUT_KEY)) return;
      const result = await apiFetch<{ user: SessionUser }>('/api/vault/session');
      if (active) setUser(result.user);
    })().catch((e) => {
      if (active && e?.status !== 401) setError(e);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, []);

  const completeLogin = useCallback(async (url: string) => {
    setUser(await exchangeCallback(url));
    setError(null);
  }, []);

  const signIn = useCallback(async () => {
    completing = undefined;
    completionKey = undefined;
    setBusy(true);
    setError(null);
    try {
      // An iframe session is accepted only after the server verifies Whop's JWT.
      if (insideWhop()) {
        try {
          const result = await apiFetch<{ user: SessionUser }>('/api/vault/session');
          await authStorage.removeItem(SIGNED_OUT_KEY);
          setUser(result.user);
          return true;
        } catch (e) { if (!(e instanceof Error && 'status' in e && e.status === 401)) throw e; }
      }
      const redirectUri = Platform.OS === 'web' ? `${window.location.origin}/auth/callback` : 'pacta://auth/callback';
      const attempt = await authRequest<LoginAttempt>('auth-start', { redirectUri });
      await authStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
      if (Platform.OS === 'web') { window.location.assign(attempt.url); return false; }
      const result = await WebBrowser.openAuthSessionAsync(attempt.url, redirectUri);
      if (result.type === 'success') { await completeLogin(result.url); return true; }
      else { await authStorage.removeItem(ATTEMPT_KEY); setError(new Error('login_cancelled')); }
    } catch (e) { setError(e); }
    finally { setBusy(false); }
    return false;
  }, [completeLogin]);

  const signOut = useCallback(async () => {
    completing = undefined;
    completionKey = undefined;
    // Persist this before clearing state so an iframe cannot sign straight back in on reload.
    await authStorage.setItem(SIGNED_OUT_KEY, '1');
    const previous = await clearTokens();
    setUser(null);
    setError(null);
    await authStorage.removeItem(ATTEMPT_KEY);
    if (previous?.refresh_token) {
      await authRequest('auth-logout', { refreshToken: previous.refresh_token }).catch(() => {
        // Local credentials have already been removed, including when offline.
      });
    }
  }, []);

  return <AuthContext.Provider value={{ user, loading, busy, error, signIn, signOut, completeLogin }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
