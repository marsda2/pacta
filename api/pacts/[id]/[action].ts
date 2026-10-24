import { allow, api, HttpError, uuidParam } from '../../../lib/server/http';
import { demoUserId, resolvePact, submitProof, userSummary, type NewProof } from '../../../lib/server/pact-engine';

// POST /api/pacts/:id/proof   → sube la prueba y abre la revisión.
// POST /api/pacts/:id/resolve → veredicto manual {kept: boolean, source: 'witness' | 'demo'}.
export default api(async (req, res) => {
  allow(req, 'POST');
  const userId = await demoUserId();
  const pactId = uuidParam(req.query.id);
  const body = (req.body ?? {}) as Record<string, unknown>;

  let pact;
  switch (req.query.action) {
    case 'proof':
      pact = await submitProof(userId, pactId, body as NewProof);
      break;
    case 'resolve':
      if (typeof body.kept !== 'boolean') throw new HttpError(400, 'bad_verdict');
      pact = await resolvePact(userId, pactId, body.kept, body.source === 'witness' ? 'witness' : 'demo');
      break;
    default:
      throw new HttpError(404, 'not_found');
  }
  return res.status(200).json({ pact, summary: await userSummary(userId) });
});
