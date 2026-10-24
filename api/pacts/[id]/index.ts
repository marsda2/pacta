import { allow, api, uuidParam } from '../../../lib/server/http';
import { requestUserId } from '../../../lib/server/identity';
import { getPact, userSummary } from '../../../lib/server/pact-engine';

// GET /api/pacts/:id → un pacto y el resumen del usuario.
export default api(async (req, res) => {
  allow(req, 'GET');
  const userId = await requestUserId(req);
  const [pact, summary] = await Promise.all([getPact(userId, uuidParam(req.query.id)), userSummary(userId)]);
  return res.status(200).json({ pact, summary });
});
