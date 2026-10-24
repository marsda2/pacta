import { query, withTransaction } from '../../lib/server/db';
import { allow, api, HttpError } from '../../lib/server/http';
import { completionUrl, getSubmission } from '../../lib/server/terac';
import type { JuryVote } from '../../lib/shared/rules';

// Ronda 1 de calibración (docs/04): un único juez de Terac revisa TODO el set de evaluación en
// una sola página. Los votos se guardan en jury_tasks.raw igual que en el jurado normal, pero
// aquí NO se cierra el caso ni se toca ningún pacto: son pruebas de evaluación, no reales.
// (Una ruta estática gana a api/jury/[id].ts.)
const VERDICTS: readonly JuryVote[] = ['APPROVE', 'REJECT', 'CHEAT'];

interface CaseRow {
  id: string;
  title: string;
  day_code: string;
  proof_id: string;
  emotional_state: string;
}

const casesOf = (opportunityId: string) =>
  query<CaseRow>(
    `select jt.id, pc.title, pc.day_code, p.id as proof_id, p.emotional_state
       from pacta.jury_tasks jt
       join pacta.proofs p on p.id = jt.proof_id
       join pacta.pacts pc on pc.id = p.pact_id
      where jt.terac_task_id = $1 and jt.raw ->> 'round' = '1'
      order by md5(jt.id::text)`,
    [opportunityId],
  );

// GET  /api/jury/round1 → los casos (foto, título, código y si el usuario dice estar agobiado).
// POST /api/jury/round1 → {votes: {<caseId>: {verdict, reason?}}, teracSubmissionId, taskId}.
export default api(async (req, res) => {
  allow(req, 'GET', 'POST');
  const opportunityId = process.env.TERAC_ROUND1_OPPORTUNITY_ID;
  if (!opportunityId) throw new HttpError(503, 'round_not_configured');
  const { rows } = await casesOf(opportunityId);

  if (req.method === 'GET') {
    return res.status(200).json({
      cases: rows.map((c) => ({
        id: c.id,
        title: c.title,
        dayCode: c.day_code,
        overwhelmed: c.emotional_state === 'overwhelmed',
        photoUrl: `/api/proofs/${c.proof_id}/image`,
      })),
    });
  }

  const { votes, teracSubmissionId, taskId } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof teracSubmissionId !== 'string' || !teracSubmissionId || teracSubmissionId.length > 100) {
    throw new HttpError(400, 'missing_submission');
  }
  const given = (votes ?? {}) as Record<string, { verdict?: unknown; reason?: unknown }>;
  // Hay que votar todos los casos: un juez a medias no cobra.
  if (!rows.length || rows.some((c) => !VERDICTS.includes(given[c.id]?.verdict as JuryVote))) {
    throw new HttpError(400, 'incomplete_votes');
  }

  // Solo vota quien Terac ha enviado a ESTE estudio.
  const submission = await getSubmission(teracSubmissionId).catch(() => null);
  if (submission?.opportunity_id !== opportunityId || !['screen_passed', 'in_progress'].includes(submission.status)) {
    throw new HttpError(403, 'not_a_juror');
  }

  const at = new Date().toISOString();
  await withTransaction(async (q) => {
    for (const c of rows) {
      const vote = given[c.id];
      await q(
        `update pacta.jury_tasks
            set raw = coalesce(raw, '{}'::jsonb)
                      || jsonb_build_object('votes', coalesce(raw -> 'votes', '{}'::jsonb)
                                                     || jsonb_build_object($2::text, $3::jsonb))
          where id = $1`,
        [c.id, teracSubmissionId, JSON.stringify({ verdict: vote.verdict, reason: typeof vote.reason === 'string' ? vote.reason.slice(0, 500) : null, at })],
      );
    }
  });

  return res.status(200).json({
    ok: true,
    completionUrl: typeof taskId === 'string' && taskId ? completionUrl(teracSubmissionId, taskId) : null,
  });
});
