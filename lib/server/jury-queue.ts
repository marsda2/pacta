import { JURY_QUORUM, resolveJuryVerdict, type JuryVote } from '../shared/rules';
import { query, withTransaction } from './db';
import { closeJuryTask } from './pact-engine';

// Cola de casos de un estudio de Terac (ronda 1 y lotes de apelaciones): consulta y registro de
// votos. La API (api/jury/round1.ts) valida al juez; aquí vive la parte que mueve el dinero.
export const VERDICTS: readonly JuryVote[] = ['APPROVE', 'REJECT', 'CHEAT'];

export interface CaseRow {
  id: string;
  title: string;
  day_code: string;
  proof_id: string;
  emotional_state: string;
  raw: { appeal?: boolean; panel?: number; note?: string; round?: number } | null;
}

export type GivenVotes = Record<string, { verdict?: unknown; reason?: unknown }>;

// Casos pendientes de un estudio, en un orden fijo pero mezclado (no revela las etiquetas).
export const casesOf = (opportunityId: string) =>
  query<CaseRow>(
    `select jt.id, jt.raw, pc.title, pc.day_code, p.id as proof_id, p.emotional_state
       from pacta.jury_tasks jt
       join pacta.proofs p on p.id = jt.proof_id
       join pacta.pacts pc on pc.id = p.pact_id
      where jt.terac_task_id = $1 and jt.status = 'pending'
      order by md5(jt.id::text)`,
    [opportunityId],
  );

// ¿Votó el juez todos los casos con un veredicto válido?
export const votedAll = (rows: CaseRow[], given: GivenVotes) =>
  rows.length > 0 && rows.every((c) => VERDICTS.includes(given[c.id]?.verdict as JuryVote));

// Guarda los votos de un juez en todos los casos del estudio. Los casos de evaluación (ronda 1)
// solo recogen votos; los reales se cierran al llegar al quorum de su panel y aplican el
// veredicto al pacto (reembolso o Vault, con la fianza si es una apelación perdida).
export async function recordQueueVotes(rows: CaseRow[], submissionId: string, given: GivenVotes): Promise<void> {
  const at = new Date().toISOString();
  const tallies = await withTransaction(async (q) => {
    const out: Record<string, JuryVote[]> = {};
    for (const c of rows) {
      const vote = given[c.id];
      // Un solo UPDATE por caso: los votos de los otros jueces no se pisan.
      const saved = await q<{ votes: Record<string, { verdict: JuryVote }> }>(
        `update pacta.jury_tasks
            set raw = coalesce(raw, '{}'::jsonb)
                      || jsonb_build_object('votes', coalesce(raw -> 'votes', '{}'::jsonb)
                                                     || jsonb_build_object($2::text, $3::jsonb))
          where id = $1 and status = 'pending'
          returning raw -> 'votes' as votes`,
        [c.id, submissionId, JSON.stringify({ verdict: vote.verdict, reason: typeof vote.reason === 'string' ? vote.reason.slice(0, 500) : null, at })],
      );
      out[c.id] = Object.values(saved.rows[0]?.votes ?? {}).map((v) => v.verdict);
    }
    return out;
  });

  for (const c of rows) {
    if (c.raw?.round === 1) continue;
    if (tallies[c.id].length >= (c.raw?.panel ?? JURY_QUORUM)) await closeJuryTask(c.id, resolveJuryVerdict(tallies[c.id]));
  }
}
