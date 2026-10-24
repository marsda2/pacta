// Datos de demo: restablece a un usuario con dos semanas de historial (docs/09). Deja Trust 55,
// dos pactos verificados seguidos y $60 en el Vault: un pacto cumplido en directo sube a Trust
// 70 con racha de 3 y desbloquea el primer tramo de $20.
// Uso: npm run seed                 → usuario de demo (la URL de Vercel fuera de Whop)
//      npm run seed -- user_XXXXXXX → la cuenta de ese usuario de Whop (la app dentro de Whop)
import { query, withTransaction } from '../lib/server/db';
import { demoUserId } from '../lib/server/pact-engine';
import { TRUST_DELTA, TRUST_MAX, TRUST_MIN, TRUST_START_SCORE } from '../lib/shared/rules';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

interface SeedPact {
  title: string;
  stake: number;
  daysAgo: number;
  status: 'REFUNDED' | 'VAULTED' | 'ACTIVE';
  methods: string[];
  code: string;
  delta?: number;
  reason?: string;
}

// En orden cronológico. El Trust empieza en 50: 65 → 35 → 55 → 70 → 40 → 55 → 25 → 40 → 55.
const HISTORY: SeedPact[] = [
  { title: 'Write 500 words', stake: 500, daysAgo: 13, status: 'REFUNDED', methods: ['photo'], code: 'K7QD', delta: TRUST_DELTA.aiApproved, reason: 'ai_approved' },
  { title: 'Morning run', stake: 2000, daysAgo: 12, status: 'VAULTED', methods: ['photo', 'location'], code: 'R2MN', delta: TRUST_DELTA.failedOrExpired, reason: 'deadline_missed' },
  { title: 'Gym session', stake: 1000, daysAgo: 11, status: 'REFUNDED', methods: ['photo'], code: 'G4YM', delta: TRUST_DELTA.juryApproved, reason: 'jury_approved' },
  { title: 'Read 20 pages', stake: 500, daysAgo: 10, status: 'REFUNDED', methods: ['photo'], code: 'B8KS', delta: TRUST_DELTA.aiApproved, reason: 'ai_approved' },
  { title: 'Clear the inbox', stake: 2000, daysAgo: 8, status: 'VAULTED', methods: ['photo', 'witness'], code: 'M3XT', delta: TRUST_DELTA.failedOrExpired, reason: 'jury_rejected' },
  { title: 'Call mom', stake: 0, daysAgo: 7, status: 'REFUNDED', methods: ['witness'], code: 'C5LL', delta: TRUST_DELTA.aiApproved, reason: 'witness_approved' },
  { title: 'Finish the slides', stake: 2000, daysAgo: 5, status: 'VAULTED', methods: ['photo'], code: 'S6DE', delta: TRUST_DELTA.failedOrExpired, reason: 'unverified_after_ai_doubt' },
  { title: 'Deep work, 45 min', stake: 1000, daysAgo: 3, status: 'REFUNDED', methods: ['photo'], code: 'D9WK', delta: TRUST_DELTA.aiApproved, reason: 'ai_approved' },
  { title: 'Write 500 words', stake: 500, daysAgo: 1, status: 'REFUNDED', methods: ['photo'], code: 'W1RT', delta: TRUST_DELTA.aiApproved, reason: 'ai_approved' },
  { title: 'Finish the proposal', stake: 2000, daysAgo: 0.1, status: 'ACTIVE', methods: ['photo', 'location', 'witness'], code: 'P9RA' },
];

async function targetUserId(whopUserId: string | undefined) {
  if (!whopUserId) return demoUserId();
  const { rows } = await query<{ id: string }>(
    `insert into pacta.users (whop_user_id) values ($1)
     on conflict (whop_user_id) do update set whop_user_id = excluded.whop_user_id returning id`,
    [whopUserId],
  );
  return rows[0].id;
}

async function main() {
  const whopUserId = process.argv[2];
  if (whopUserId && !/^user_[A-Za-z0-9]+$/.test(whopUserId)) throw new Error(`Id de usuario de Whop no válido: ${whopUserId}`);
  const userId = await targetUserId(whopUserId);
  const now = Date.now();

  await withTransaction(async (q) => {
    // Orden por dependencias: lo que cuelga de los pactos primero.
    await q('delete from pacta.trust_events where user_id = $1', [userId]);
    await q('delete from pacta.vault_ledger where user_id = $1', [userId]);
    await q('delete from pacta.pacts where user_id = $1', [userId]);

    let trust = TRUST_START_SCORE;
    let streak = 0;
    for (const pact of HISTORY) {
      const createdAt = now - pact.daysAgo * DAY;
      const resolvedAt = createdAt + 6 * HOUR;
      const deadline = pact.status === 'ACTIVE' ? now + 6 * HOUR : createdAt + 5 * HOUR;
      const { rows } = await q<{ id: string }>(
        `insert into pacta.pacts (user_id, title, stake_cents, deadline, day_code, status, proof_methods, created_at, resolved_at)
         values ($1, $2, $3, to_timestamp($4 / 1000.0), $5, $6, $7, to_timestamp($8 / 1000.0),
                 case when $6 in ('REFUNDED', 'VAULTED') then to_timestamp($9 / 1000.0) end)
         returning id`,
        [userId, pact.title, pact.stake, deadline, pact.code, pact.status, pact.methods, createdAt, resolvedAt],
      );
      if (pact.delta === undefined) continue;

      const pactId = rows[0].id;
      await q('insert into pacta.trust_events (user_id, delta, reason, pact_id, created_at) values ($1, $2, $3, $4, to_timestamp($5 / 1000.0))', [
        userId,
        pact.delta,
        pact.reason,
        pactId,
        resolvedAt,
      ]);
      trust = Math.min(TRUST_MAX, Math.max(TRUST_MIN, trust + pact.delta));
      if (pact.status === 'VAULTED') {
        streak = 0;
        if (pact.stake > 0) {
          await q("insert into pacta.vault_ledger (user_id, type, amount_cents, pact_id, created_at) values ($1, 'lock', $2, $3, to_timestamp($4 / 1000.0))", [
            userId,
            pact.stake,
            pactId,
            resolvedAt,
          ]);
        }
      } else {
        streak += 1;
      }
    }
    await q("update pacta.users set trust_score = $2, verified_streak = $3, tier = 'free', withdrawals_locked_until = null where id = $1", [userId, trust, streak]);
  });

  const { rows } = await query<{ status: string; n: string }>('select status, count(*) as n from pacta.pacts where user_id = $1 group by status order by status', [userId]);
  console.log(`Seed listo (${whopUserId ?? 'demo-user'}):`, rows.map((r) => `${r.status}=${r.n}`).join(', '));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
