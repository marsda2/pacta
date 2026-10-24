// Siembra el set de evaluación como casos del jurado de Terac (ronda 1): un usuario "eval-set"
// con un pacto, una prueba (foto en proof_images) y un jury_task por cada item de eval/set.json.
// Es idempotente: borra los pactos de eval-set y los recrea.
// Uso: npm run seed:eval   (necesita TERAC_ROUND1_OPPORTUNITY_ID en .env.local)
import { randomInt, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { withTransaction } from '../lib/server/db';

interface Item {
  id: string;
  image: string;
  title: string;
  dayCode: string;
  emotionalState: 'normal' | 'overwhelmed';
}

const EVAL_USER = 'eval-set';
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

async function main() {
  const opportunityId = process.env.TERAC_ROUND1_OPPORTUNITY_ID;
  if (!opportunityId) throw new Error('Falta TERAC_ROUND1_OPPORTUNITY_ID');
  const items = JSON.parse(readFileSync(join(process.cwd(), 'eval/set.json'), 'utf8')) as Item[];

  await withTransaction(async (q) => {
    const user = await q<{ id: string }>(
      `insert into pacta.users (whop_user_id) values ($1)
       on conflict (whop_user_id) do update set whop_user_id = excluded.whop_user_id returning id`,
      [EVAL_USER],
    );
    const userId = user.rows[0].id;
    await q('delete from pacta.pacts where user_id = $1', [userId]); // cascada a pruebas, fotos y casos

    for (const item of items) {
      const pactId = randomUUID();
      const proofId = randomUUID();
      await q(
        `insert into pacta.pacts (id, user_id, title, stake_cents, deadline, day_code, status, proof_methods)
         values ($1, $2, $3, 500, now() + interval '7 days', $4, 'JURY_PENDING', array['photo'])`,
        [pactId, userId, item.title, item.dayCode],
      );
      await q(
        `insert into pacta.proofs (id, pact_id, storage_path, captured_live, emotional_state) values ($1, $2, $3, true, $4)`,
        [proofId, pactId, `db:${proofId}`, item.emotionalState],
      );
      await q('insert into pacta.proof_images (proof_id, mime, data) values ($1, $2, $3)', [
        proofId,
        MIME[item.image.split('.').pop()!.toLowerCase()],
        readFileSync(join(process.cwd(), 'eval', item.image)),
      ]);
      await q(`insert into pacta.jury_tasks (proof_id, terac_task_id, raw) values ($1, $2, $3)`, [
        proofId,
        opportunityId,
        JSON.stringify({ eval_id: item.id, round: 1, nonce: randomInt(1e6) }),
      ]);
    }
  });
  console.log(`Sembrados ${items.length} casos para la oportunidad ${opportunityId}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
