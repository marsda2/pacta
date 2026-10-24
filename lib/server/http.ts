import type { VercelRequest, VercelResponse } from '@vercel/node';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown> | unknown;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidParam(value: unknown): string {
  const id = String(value ?? '');
  if (!UUID.test(id)) throw new HttpError(404, 'not_found');
  return id;
}

// Bearer auth works cross-origin on mobile/dev; no cookies are used by the API.
export function api(handler: Handler): Handler {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-whop-user-token');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.status(204).end();

    try {
      return await handler(req, res);
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.status).json({ error: error.code });
      console.error(error);
      return res.status(500).json({ error: 'internal_error' });
    }
  };
}

export function allow(req: VercelRequest, ...methods: string[]) {
  if (!methods.includes(req.method ?? '')) throw new HttpError(405, 'method_not_allowed');
}
