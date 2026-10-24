import { allow, api } from '../../lib/server/http';
import { createPact, demoUserId, listPacts, userSummary } from '../../lib/server/pact-engine';

// GET  /api/pacts → pactos del usuario y su resumen (Trust y Vault).
// POST /api/pacts → crea un pacto.
export default api(async (req, res) => {
  allow(req, 'GET', 'POST');
  const userId = await demoUserId();

  if (req.method === 'POST') {
    const pact = await createPact(userId, (req.body ?? {}) as Record<string, unknown> as never);
    return res.status(201).json({ pact });
  }

  const [pacts, summary] = await Promise.all([listPacts(userId), userSummary(userId)]);
  return res.status(200).json({ pacts, summary });
});
