import { allow, api, HttpError, uuidParam } from '../../../lib/server/http';
import { requestUserId } from '../../../lib/server/identity';
import { appealPact, pactCheckoutLink, resolvePact, submitProof, userSummary, type NewProof } from '../../../lib/server/pact-engine';

// POST /api/pacts/:id/proof    → sube la prueba y abre la revisión (también el reintento tras una duda).
// POST /api/pacts/:id/appeal   → pide un juez humano de Terac tras la duda de la IA.
// POST /api/pacts/:id/resolve  → veredicto manual {kept: boolean, source: 'witness' | 'demo'}.
// POST /api/pacts/:id/checkout → enlace de pago de un pacto AWAITING_PAYMENT → { url, checkoutId, planId }.
export default api(async (req, res) => {
  allow(req, 'POST');
  const userId = await requestUserId(req);
  const pactId = uuidParam(req.query.id);
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (req.query.action === 'checkout') return res.status(200).json(await pactCheckoutLink(userId, pactId));

  let pact;
  switch (req.query.action) {
    case 'proof':
      pact = await submitProof(userId, pactId, body as NewProof);
      break;
    case 'resolve':
      if (typeof body.kept !== 'boolean') throw new HttpError(400, 'bad_verdict');
      pact = await resolvePact(userId, pactId, body.kept, body.source === 'witness' ? 'witness' : 'demo');
      break;
    case 'appeal':
      pact = await appealPact(userId, pactId);
      break;
    default:
      throw new HttpError(404, 'not_found');
  }
  return res.status(200).json({ pact, summary: await userSummary(userId) });
});
