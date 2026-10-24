import { query } from '../../lib/server/db';
import { allow, api, HttpError, uuidParam } from '../../lib/server/http';
import { closeJuryTask } from '../../lib/server/pact-engine';
import { signedProofUrl } from '../../lib/server/supabase-admin';
import { completionUrl, getSubmission } from '../../lib/server/terac';
import { JURY_QUORUM, resolveJuryVerdict, type JuryVote } from '../../lib/shared/rules';

const VERDICTS: readonly JuryVote[] = ['APPROVE', 'REJECT', 'CHEAT'];

interface JuryRow {
  status: string;
  terac_task_id: string | null;
  proof_id: string;
  storage_path: string;
  title: string;
  day_code: string;
  raw: { appeal?: boolean; panel?: number; note?: string } | null;
}

// GET  /api/jury/:id  → el caso que ve el juez (foto, título, código del día y, si es una
//                       apelación, las pruebas extra y la nota del usuario).
// POST /api/jury/:id  → el voto del juez; Terac añade su submission a la URL de la página.
// :id es jury_tasks.id. No se expone nada del stake ni del veredicto de la IA, para no sesgar.
export default api(async (req, res) => {
  allow(req, 'GET', 'POST');
  const id = uuidParam(req.query.id);

  const { rows } = await query<JuryRow>(
    `select jt.status, jt.terac_task_id, jt.raw, p.id as proof_id, p.storage_path, pc.title, split_part(pc.day_code, '|', 1) as day_code
       from pacta.jury_tasks jt
       join pacta.proofs p on p.id = jt.proof_id
       join pacta.pacts pc on pc.id = p.pact_id
      where jt.id = $1`,
    [id],
  );
  const task = rows[0];
  if (!task) throw new HttpError(404, 'not_found');
  if (task.status !== 'pending') throw new HttpError(409, 'closed');

  if (req.method === 'GET') {
    // Las fotos viven en Postgres (db:<id>) o, si se mueven, en el bucket privado `proofs`.
    const photoUrl = task.storage_path.startsWith('db:')
      ? `/api/proofs/${task.proof_id}/image`
      : await signedProofUrl(task.storage_path);
    const evidence = await query<{ id: string }>('select id from pacta.appeal_evidence where jury_task_id = $1 order by created_at', [id]);
    return res.status(200).json({
      title: task.title,
      dayCode: task.day_code,
      photoUrl,
      appeal: task.raw?.appeal === true,
      note: task.raw?.note ?? null,
      evidence: evidence.rows.map((row) => `/api/proofs/${row.id}/image`),
    });
  }

  const { verdict, reason, teracSubmissionId, taskId } = (req.body ?? {}) as Record<string, unknown>;
  if (!VERDICTS.includes(verdict as JuryVote)) throw new HttpError(400, 'bad_verdict');
  if (typeof teracSubmissionId !== 'string' || !teracSubmissionId || teracSubmissionId.length > 100) {
    throw new HttpError(400, 'missing_submission');
  }

  // Solo vota quien Terac ha enviado a ESTE jurado: evita votos inventados.
  const submission = await getSubmission(teracSubmissionId).catch(() => null);
  if (!task.terac_task_id || submission?.opportunity_id !== task.terac_task_id || !['screen_passed', 'in_progress'].includes(submission.status)) {
    throw new HttpError(403, 'not_a_juror');
  }

  const vote = {
    verdict,
    reason: typeof reason === 'string' ? reason.slice(0, 500) : null,
    at: new Date().toISOString(),
  };
  // Un solo UPDATE: concurrente y por juez, el voto de otro juez no se pisa.
  const saved = await query<{ votes: Record<string, { verdict: JuryVote }> }>(
    `update pacta.jury_tasks
        set raw = coalesce(raw, '{}'::jsonb)
                  || jsonb_build_object('votes', coalesce(raw -> 'votes', '{}'::jsonb)
                                                 || jsonb_build_object($2::text, $3::jsonb))
      where id = $1 and status = 'pending'
      returning raw -> 'votes' as votes`,
    [id, teracSubmissionId, JSON.stringify(vote)],
  );
  const votes = Object.values(saved.rows[0]?.votes ?? {}).map((v) => v.verdict);
  // Un caso normal lo cierra un juez; una apelación, la mayoría de su panel.
  const quorum = task.raw?.panel ?? JURY_QUORUM;
  if (votes.length >= quorum) await closeJuryTask(id, resolveJuryVerdict(votes));

  return res.status(200).json({
    ok: true,
    completionUrl: typeof taskId === 'string' && taskId ? completionUrl(teracSubmissionId, taskId) : null,
  });
});
