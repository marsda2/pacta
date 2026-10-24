import type { VercelRequest, VercelResponse } from '@vercel/node';
import { unwrapWebhook, WebhookVerificationError } from '@whop/sdk/helpers';

import { withTransaction } from '../../lib/server/db';
import { activatePaidPact } from '../../lib/server/pact-engine';

// Cuerpo sin parsear: la firma cubre los bytes exactos que envía Whop.
async function rawBody(req: VercelRequest) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Uint8Array));
  return Buffer.concat(chunks).toString('utf8');
}

const header = (req: VercelRequest, name: string) => {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

interface WhopEvent {
  id: string;
  type: string;
  data?: { id?: string; metadata?: { pact_id?: unknown } | null };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/webhooks/whop
// Firma Standard Webhooks (webhook-id, webhook-timestamp, webhook-signature). Idempotencia por webhook-id.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = await rawBody(req);
  const eventId = header(req, 'webhook-id');

  let event: WhopEvent;
  try {
    event = unwrapWebhook<WhopEvent>(body, {
      headers: {
        'webhook-id': eventId ?? '',
        'webhook-timestamp': header(req, 'webhook-timestamp') ?? '',
        'webhook-signature': header(req, 'webhook-signature') ?? '',
      },
      key: process.env.WHOP_WEBHOOK_SECRET,
    });
  } catch (error) {
    const reason = error instanceof WebhookVerificationError ? 'verification' : 'missing_key_or_parse';
    console.warn(`whop webhook: ${reason}: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(401).json({ error: 'bad_signature' });
  }

  // Solo payment.succeeded cambia el estado del pacto. Lo demás se acepta y se ignora.
  if (!eventId || event.type !== 'payment.succeeded') return res.status(200).json({ ok: true, ignored: true });

  const pactId = event.data?.metadata?.pact_id;
  const paymentId = event.data?.id;
  if (typeof pactId !== 'string' || !UUID.test(pactId) || typeof paymentId !== 'string') {
    console.warn('whop webhook: payment.succeeded sin metadata.pact_id válido; payment:', paymentId);
    return res.status(200).json({ ok: true, ignored: true });
  }

  const outcome = await withTransaction(async (q) => {
    const fresh = await q(
      `insert into pacta.webhook_events (id, source, payload) values ($1, 'whop', $2)
       on conflict (id) do nothing returning id`,
      [eventId, body],
    );
    if (fresh.rowCount === 0) return 'duplicate';
    return (await activatePaidPact(q, pactId, paymentId)) ? 'activated' : 'no_pending_pact';
  });

  res.status(200).json({ ok: true, outcome });
}
