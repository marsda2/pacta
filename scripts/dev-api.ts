// Servidor local para api/*: reproduce el enrutado de Vercel (carpetas y [param]) sin vercel dev.
// Uso: npm run dev:api  (lee DATABASE_URL de .env.local y escucha en el puerto 3000, o en PORT).
import { readdirSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

type Handler = (req: unknown, res: unknown) => unknown;
interface Route {
  segments: string[];
  file: string;
}

const API_DIR = join(process.cwd(), 'api');
const PORT = Number(process.env.PORT) || 3000;

function collect(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? collect(path) : name.endsWith('.ts') ? [path] : [];
  });
}

const routes: Route[] = collect(API_DIR).map((file) => {
  const parts = relative(API_DIR, file).replace(/\.ts$/, '').split(sep);
  if (parts[parts.length - 1] === 'index') parts.pop();
  return { segments: ['api', ...parts], file };
});

function match(pathname: string) {
  const given = pathname.split('/').filter(Boolean);
  // Los segmentos estáticos ganan a los dinámicos, como en Vercel.
  const candidates = routes
    .filter((r) => r.segments.length === given.length)
    .map((route) => {
      const params: Record<string, string> = {};
      const ok = route.segments.every((seg, i) => {
        if (seg.startsWith('[')) {
          params[seg.slice(1, -1)] = decodeURIComponent(given[i]);
          return true;
        }
        return seg === given[i];
      });
      return ok ? { route, params, dynamic: route.segments.filter((s) => s.startsWith('[')).length } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => a.dynamic - b.dynamic);
  return candidates[0];
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Uint8Array));
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : undefined;
}

interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse;
  json(body: unknown): ApiResponse;
  send(body: Buffer | string): ApiResponse;
}

function decorate(res: ServerResponse): ApiResponse {
  const out = res as ApiResponse;
  out.status = (code: number) => {
    res.statusCode = code;
    return out;
  };
  out.json = (body: unknown) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
    return out;
  };
  out.send = (body: Buffer | string) => {
    res.end(body);
    return out;
  };
  return out;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const found = match(url.pathname);
  const out = decorate(res);
  if (!found) return void out.status(404).json({ error: 'not_found' });

  try {
    const request = req as IncomingMessage & { query: Record<string, string>; body?: unknown };
    request.query = { ...Object.fromEntries(url.searchParams), ...found.params };
    if (!url.pathname.startsWith('/api/webhooks') && req.headers['content-type']?.includes('json')) {
      request.body = await readJson(req);
    }
    const mod = (await import(pathToFileURL(found.route.file).href)) as { default: Handler };
    await mod.default(request, out);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) out.status(500).json({ error: 'internal_error' });
  }
}).listen(PORT, () => console.log(`API local en http://localhost:${PORT}`));
