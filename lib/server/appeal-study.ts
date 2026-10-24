import { APPEAL_PANEL_SIZE, batchPlan } from '../shared/rules';
import { query } from './db';
import { createJuryOpportunity, deleteOpportunity, getOpportunity, launchOpportunity } from './terac';

// Lotes de apelaciones (docs/04 §7): las apelaciones esperan en cola (jury_tasks con
// raw.appeal = true y sin estudio de Terac) y se revisan JUNTAS en un único estudio con el panel de
// APPEAL_PANEL_SIZE jueces. Cada juez recibe la página /jury/queue con todos los casos del lote.
// Así un estudio de $13.50–$18 se reparte entre varias apelaciones y la fianza de $7.50 lo cubre.
const CLAIM = 'batch:pending';

export interface BatchResult {
  launched: boolean;
  cases: number;
  minutes: number;
  studyId?: string;
  // Precio que Terac pone al estudio (todos los jueces).
  totalCents?: number;
  reason: string;
}

interface Waiting {
  id: string;
  hours: number;
}

async function waiting(): Promise<Waiting[]> {
  const { rows } = await query<{ id: string; hours: string }>(
    `select id, extract(epoch from now() - created_at) / 3600 as hours
       from pacta.jury_tasks
      where status = 'pending' and terac_task_id is null and raw ->> 'appeal' = 'true'
      order by created_at`,
  );
  return rows.map((row) => ({ id: row.id, hours: Number(row.hours) }));
}

// Lanza (o, con dryRun, solo presupuesta) el siguiente lote de apelaciones.
//   · Sin `force`, aplica batchPlan: tamaño mínimo, espera máxima y duración de la tarea.
//   · dryRun crea el borrador en Terac para leer el precio y lo borra: no gasta nada.
// Cada lote gasta saldo de Terac al lanzarse, por eso las llamadas automáticas pasan por
// maybeLaunchBatch (TERAC_AUTO_LAUNCH=true) y las manuales por scripts/launch-batch.ts.
export async function launchBatch(opts: { dryRun?: boolean; force?: boolean } = {}): Promise<BatchResult> {
  const queue = await waiting();
  const plan = batchPlan(queue.map((c) => c.hours));
  if (!queue.length) return { launched: false, cases: 0, minutes: 0, reason: 'cola vacía' };
  if (!plan.launch && !opts.force) {
    return { launched: false, cases: plan.cases, minutes: plan.minutes, reason: `esperando más casos (${plan.cases} en cola)` };
  }

  const projectId = process.env.TERAC_PROJECT_ID;
  if (!projectId) throw new Error('Falta TERAC_PROJECT_ID');
  const appUrl = (process.env.APP_URL ?? 'https://pacta-theta.vercel.app').replace(/\/$/, '');

  // Se reservan los casos en una sola sentencia: dos lanzamientos a la vez no cogen los mismos.
  const claimed = await query<{ id: string }>(
    `update pacta.jury_tasks set terac_task_id = $2
      where id = any($1::uuid[]) and terac_task_id is null and status = 'pending' returning id`,
    [queue.slice(0, plan.cases).map((c) => c.id), CLAIM],
  );
  const ids = claimed.rows.map((row) => row.id);
  if (!ids.length) return { launched: false, cases: 0, minutes: plan.minutes, reason: 'otro proceso reservó los casos' };
  const release = () => query('update pacta.jury_tasks set terac_task_id = null where id = any($1::uuid[]) and terac_task_id = $2', [ids, CLAIM]);

  let studyId: string | undefined;
  try {
    studyId = (
      await createJuryOpportunity({
        title: 'Review habit proofs',
        projectId,
        taskUrl: `${appUrl}/jury/queue`,
        participants: APPEAL_PANEL_SIZE,
        minutes: plan.minutes,
      })
    ).id;
    const totalCents = (await getOpportunity(studyId)).pricing.total_cost_cents;

    if (opts.dryRun) {
      await deleteOpportunity(studyId);
      await release();
      return { launched: false, cases: ids.length, minutes: plan.minutes, totalCents, reason: 'simulación: borrador creado y borrado, sin gasto' };
    }

    // El id del estudio se guarda antes de lanzar: sin él los votos del panel no se aceptarían.
    await query('update pacta.jury_tasks set terac_task_id = $2 where id = any($1::uuid[])', [ids, studyId]);
    await launchOpportunity(studyId);
    return { launched: true, cases: ids.length, minutes: plan.minutes, studyId, totalCents, reason: 'lanzado' };
  } catch (error) {
    // Si no se llegó a crear el estudio, los casos vuelven a la cola. Si se creó pero falló el
    // lanzamiento, quedan atados al borrador (se lanza a mano desde el panel de Terac).
    if (!studyId) await release();
    throw error;
  }
}

// Disparador automático (al apelar y al leer pactos). Apagado salvo TERAC_AUTO_LAUNCH=true.
export async function maybeLaunchBatch(): Promise<void> {
  if (process.env.TERAC_AUTO_LAUNCH !== 'true') return;
  await launchBatch().catch((error) => console.error('batch_launch_failed', error));
}
