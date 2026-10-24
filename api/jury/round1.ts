import { query } from '../../lib/server/db';
import { allow, api, HttpError } from '../../lib/server/http';
import { casesOf, recordQueueVotes, votedAll, type GivenVotes } from '../../lib/server/jury-queue';
import { completionUrl, getSubmission } from '../../lib/server/terac';

// (Se llama round1 porque nació para la ronda 1, pero es la cola genérica: una sola función de
// Vercel, ya que el plan Hobby permite 12.)
// Estudio de Terac con varios casos en una sola página (docs/04 §7): cada juez ve TODOS los casos
// pendientes del estudio y los vota de una vez. Sirve a la ronda 1 de calibración y a los lotes de
// apelaciones. El estudio se deduce de la submission de Terac, así que un juez solo ve los casos
// de SU estudio.

// Solo vota (y ve casos de apelaciones) quien Terac ha enviado a ESTE estudio.
async function jurorStudy(submissionId: string): Promise<string> {
  const submission = await getSubmission(submissionId).catch(() => null);
  if (!submission || !['screen_passed', 'in_progress'].includes(submission.status)) throw new HttpError(403, 'not_a_juror');
  return submission.opportunity_id;
}

// GET  /api/jury/round1?teracSubmissionId=… → los casos del estudio de ese juez.
//      Sin submission solo muestra la ronda 1 (datos de evaluación, no privados).
// POST /api/jury/round1 → {votes: {<caseId>: {verdict, reason?}}, teracSubmissionId, taskId}.
export default api(async (req, res) => {
  allow(req, 'GET', 'POST');

  if (req.method === 'GET') {
    const submissionId = typeof req.query.teracSubmissionId === 'string' ? req.query.teracSubmissionId : '';
    const opportunityId = submissionId ? await jurorStudy(submissionId) : process.env.TERAC_ROUND1_OPPORTUNITY_ID;
    if (!opportunityId) throw new HttpError(503, 'round_not_configured');

    const { rows } = await casesOf(opportunityId);
    const evidence = rows.length
      ? await query<{ id: string; jury_task_id: string }>(
          'select id, jury_task_id from pacta.appeal_evidence where jury_task_id = any($1::uuid[]) order by created_at',
          [rows.map((c) => c.id)],
        )
      : { rows: [] };
    return res.status(200).json({
      cases: rows.map((c) => ({
        id: c.id,
        title: c.title,
        dayCode: c.day_code,
        overwhelmed: c.emotional_state === 'overwhelmed',
        photoUrl: `/api/proofs/${c.proof_id}/image`,
        appeal: c.raw?.appeal === true,
        note: c.raw?.note ?? null,
        evidence: evidence.rows.filter((e) => e.jury_task_id === c.id).map((e) => `/api/proofs/${e.id}/image`),
      })),
    });
  }

  const { votes, teracSubmissionId, taskId } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof teracSubmissionId !== 'string' || !teracSubmissionId || teracSubmissionId.length > 100) {
    throw new HttpError(400, 'missing_submission');
  }
  const opportunityId = await jurorStudy(teracSubmissionId);
  const { rows } = await casesOf(opportunityId);

  // Hay que votar todos los casos: un juez a medias no cobra.
  const given = (votes ?? {}) as GivenVotes;
  if (!votedAll(rows, given)) throw new HttpError(400, 'incomplete_votes');
  await recordQueueVotes(rows, teracSubmissionId, given);

  return res.status(200).json({
    ok: true,
    completionUrl: typeof taskId === 'string' && taskId ? completionUrl(teracSubmissionId, taskId) : null,
  });
});
