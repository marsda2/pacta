// Datos de demo: restablece al usuario de demo con un historial creíble (un pacto cumplido,
// uno fallado con su stake en el Vault y uno activo). Uso: npm run seed
import { query, withTransaction } from '../lib/server/db';
import { demoUserId } from '../lib/server/pact-engine';
import { TRUST_DELTA, TRUST_START_SCORE } from '../lib/shared/rules';

const HOUR = 3600_000;

async function main() {
  const userId = await demoUserId();
  const now = Date.now();

  await withTransaction(async (q) => {
    // Orden por dependencias: lo que cuelga de los pactos primero.
    await q('delete from pacta.trust_events where user_id = $1', [userId]);
    await q('delete from pacta.vault_ledger where user_id = $1', [userId]);
    await q('delete from pacta.pacts where user_id = $1', [userId]);

    const insert = (title: string, stake: number, createdAgoH: number, dueInH: number, status: string, methods: string[], code: string) =>
      q<{ id: string }>(
        `insert into pacta.pacts (user_id, title, stake_cents, deadline, day_code, status, proof_methods, created_at, resolved_at)
         values ($1, $2, $3, to_timestamp($4 / 1000.0), $5, $6, $7, to_timestamp($8 / 1000.0),
                 case when $6 in ('REFUNDED', 'VAULTED') then to_timestamp($9 / 1000.0) end)
         returning id`,
        [userId, title, stake, now + dueInH * HOUR, code, status, methods, now - createdAgoH * HOUR, now + (dueInH + 0.5) * HOUR],
      );

    const kept = (await insert('Write 500 words', 500, 30, -20, 'REFUNDED', ['photo'], 'K7QD')).rows[0].id;
    const missed = (await insert('Clear the inbox', 1000, 60, -44, 'VAULTED', ['photo', 'witness'], 'M3XT')).rows[0].id;
    await insert('Finish the proposal', 2000, 0.1, 6, 'ACTIVE', ['photo', 'location', 'witness'], 'P9RA');

    await q("insert into pacta.vault_ledger (user_id, type, amount_cents, pact_id) values ($1, 'lock', 1000, $2)", [userId, missed]);
    await q("insert into pacta.trust_events (user_id, delta, reason, pact_id, created_at) values ($1, $2, 'witness_approved', $3, now() - interval '20 hours')", [userId, TRUST_DELTA.aiApproved, kept]);
    await q("insert into pacta.trust_events (user_id, delta, reason, pact_id, created_at) values ($1, $2, 'deadline_missed', $3, now() - interval '44 hours')", [userId, TRUST_DELTA.failedOrExpired, missed]);
    await q('update pacta.users set trust_score = $2, verified_streak = 1 where id = $1', [
      userId,
      TRUST_START_SCORE + TRUST_DELTA.aiApproved + TRUST_DELTA.failedOrExpired,
    ]);
  });

  const { rows } = await query<{ status: string; n: string }>('select status, count(*) as n from pacta.pacts where user_id = $1 group by status order by status', [userId]);
  console.log('Seed listo:', rows.map((r) => `${r.status}=${r.n}`).join(', '));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
