import type { VercelRequest, VercelResponse } from '@vercel/node';

import { query } from '../../lib/server/db';
import { approveSubmission, getSubmission, rejectSubmission, verifyTeracSignature } from '../../lib/server/terac';

// Cabecera con la firma. La spec no la documenta; se vio en el ping real de confirmación.
const SIGNATURE_HEADER = 'x-terac-request-signature';

async function rawBody(req: VercelRequest) {
  // Sin tocar req.body, que Vercel parsearía y estropearía la firma.
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Uint8Array));
  return Buffer.concat(chunks).toString('utf8');
}

const header = (req: VercelRequest, name: string) => {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

// POST /api/webhooks/terac
// Cuando un juez termina (AWAITING_REVIEW) se le paga solo si dejó un voto en jury_tasks.raw.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = process.env.TERAC_WEBHOOK_SECRET;
  const timestamp = header(req, 'x-terac-request-timestamp');
  const signature = header(req, SIGNATURE_HEADER);
  const eventId = header(req, 'x-event-id');
  const body = await rawBody(req);

  if (!secret || !timestamp || !signature || !verifyTeracSignature(secret, timestamp, body, signature)) {
    console.warn('terac webhook: firma no válida; cabeceras recibidas:', Object.keys(req.headers).join(','));
    return res.status(401).json({ error: 'bad_signature' });
  }

  const event = JSON.parse(body) as Record<string, unknown>;
  // Forma real del evento: { event_id, event_type, occurred_at, resource_id }, donde
  // resource_id es la submission. Lo demás (p. ej. webhook.ping) se acepta y se ignora.
  const submissionId = event.resource_id;
  if (!String(event.event_type).startsWith('submission.') || typeof submissionId !== 'string' || !eventId) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  // Idempotencia: Terac reintenta con el mismo X-Event-ID.
  const fresh = await query(
    `insert into pacta.webhook_events (id, source, payload) values ($1, 'terac', $2)
     on conflict (id) do nothing returning id`,
    [eventId, body],
  );
  if (fresh.rowCount === 0) return res.status(200).json({ ok: true, duplicate: true });

  // El estado real se pregunta a la API, no se confía en el cuerpo del webhook.
  const submission = await getSubmission(submissionId);
  if (submission.status === 'awaiting_review') {
    const voted = await query(
      `select 1 from pacta.jury_tasks where terac_task_id = $1 and raw -> 'votes' ? $2`,
      [submission.opportunity_id, submissionId],
    );
    if (voted.rowCount) await approveSubmission(submissionId);
    else await rejectSubmission(submissionId, 'No vote was recorded for this submission.');
  }

  res.status(200).json({ ok: true });
}
