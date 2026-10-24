import { getAccessToken, expireSession } from '@/lib/auth/tokens';
import { apiBase } from './base';

export { apiBase } from './base';

// Cliente HTTP de la API de PACTA (rutas /api/* de Vercel).
// En la web publicada la API está en el mismo origen y se llama con rutas relativas: dentro del
// iframe de Whop solo así llega la cabecera x-whop-user-token (docs/03 §2).
// EXPO_PUBLIC_API_URL sirve al móvil y al desarrollo (`npm run dev:api`, http://localhost:3000).
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export async function apiFetch<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const token = await getAccessToken();
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      method: init.method ?? 'GET',
      headers: { ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, 'network_error');
  }
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    if (response.status === 401) await expireSession(token);
    throw new ApiError(response.status, typeof json.error === 'string' ? json.error : 'request_failed');
  }
  return json as T;
}
