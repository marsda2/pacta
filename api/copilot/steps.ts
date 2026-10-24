import { allow, api, HttpError } from '../../lib/server/http';
import { BLOCKERS, suggestMicroSteps, type Blocker } from '../../lib/server/copilot-agent';

// POST /api/copilot/steps → { blocker: 'big' | 'distracted' | 'clarity', task?: string } → { steps: string[] }
export default api(async (req, res) => {
  allow(req, 'POST');
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!BLOCKERS.includes(body.blocker as Blocker)) throw new HttpError(400, 'bad_blocker');
  const task = typeof body.task === 'string' ? body.task.trim().slice(0, 80) : undefined;
  return res.status(200).json({ steps: await suggestMicroSteps(body.blocker as Blocker, task) });
});
