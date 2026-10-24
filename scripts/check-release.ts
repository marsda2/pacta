// Integration of the merged branches: real DB, disposable accounts, no external payments.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { query, withTransaction } from '../lib/server/db';
import { appealPact, createPact, getPact, resolvePact } from '../lib/server/pact-engine';
import { recordQueueVotes, type CaseRow } from '../lib/server/jury-queue';
import { redeemTranche, vaultSummary } from '../lib/server/vault';
import { walletSummary } from '../lib/server/wallet';
import { createWitnessLink, readWitnessToken, witnessReview, witnessVote } from '../lib/server/witness';

let checks = 0;
const ok = (label: string, condition: unknown) => { assert.ok(condition, label); checks++; console.log(`OK ${label}`); };
const rejected = async (label: string, promise: Promise<unknown>, pattern: RegExp) => { await assert.rejects(promise, pattern); checks++; console.log(`OK ${label}`); };
const whopId = `user_qa_release_${randomUUID()}`;
const previousAutoLaunch = process.env.TERAC_AUTO_LAUNCH;
process.env.TERAC_AUTO_LAUNCH = 'false';

async function proof(userId: string, pactId: string) {
  const id = randomUUID();
  await withTransaction(async (q) => {
    await q(`insert into pacta.proofs (id, pact_id, storage_path, captured_live, ai_verdict, ai_confidence) values ($1, $2, $3, true, 'UNSURE', 0.7)`, [id, pactId, `db:${id}`]);
    await q(`update pacta.pacts set status = 'AI_REVIEW' where id = $1 and user_id = $2`, [pactId, userId]);
  });
  return id;
}

async function main() {
  const schema = await query<{ appeal: string | null; wallet: string | null }>("select to_regclass('pacta.appeal_evidence')::text as appeal, to_regclass('pacta.wallet_ledger')::text as wallet");
  ok('required wallet and appeal migrations exist', schema.rows[0].appeal && schema.rows[0].wallet);
  const user = await query<{ id: string }>('insert into pacta.users (whop_user_id) values ($1) returning id', [whopId]);
  const u = user.rows[0].id;
  const create = (stakeCents: number) => createPact(u, { title: 'QA release integration', stakeCents, dueAt: Date.now() + 3600_000, methods: ['photo', 'witness'], payWith: 'credit' });
  try {
    await query("insert into pacta.wallet_ledger (user_id, type, amount_cents) values ($1, 'topup', 2000)", [u]);
    const p = await create(100);
    const held = await walletSummary(u);
    ok('$1 balance pact activates and holds exactly $1', p.rawStatus === 'ACTIVE' && held.balanceCents === 1900 && held.heldCents === 100 && !p.checkout);
    await proof(u, p.id);
    const { path } = await createWitnessLink(u, p.id);
    const token = new URL(path, 'https://qa.example').searchParams.get('token')!;
    const view = await witnessReview(p.id, token);
    ok('guest invitation opens only the selected proof', view.title === p.title && view.closed === false);
    assert.throws(() => readWitnessToken(`${token}bad`, p.id), /witness_link_invalid/); checks++; console.log('OK tampered witness signature rejected');
    assert.throws(() => readWitnessToken(token, randomUUID()), /witness_link_invalid/); checks++; console.log('OK invitation cannot be used for a different pact');
    await rejected('direct witness verdict without invitation rejected', resolvePact(u, p.id, true, 'witness'), /witness_link_required/);
    const priorNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try { await rejected('production demo verdict rejected', resolvePact(u, p.id, true, 'demo'), /prototype_disabled/); }
    finally { if (priorNodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV'); else process.env.NODE_ENV = priorNodeEnv; }
    const concurrent = await Promise.allSettled([witnessVote(p.id, token, true), witnessVote(p.id, token, true)]);
    ok('concurrent witness votes settle the pact once', concurrent.filter((result) => result.status === 'fulfilled').length === 1);
    const returned = await walletSummary(u);
    ok('approved witness returns the stake to balance once', returned.balanceCents === 2000 && returned.heldCents === 0);
    ok('completed invitation becomes read-only', (await witnessReview(p.id, token)).closed);
    await rejected('replayed witness vote rejected', witnessVote(p.id, token, true), /not_in_review/);

    const replaced = await create(100);
    await proof(u, replaced.id);
    const oldLink = await createWitnessLink(u, replaced.id);
    const oldToken = new URL(oldLink.path, 'https://qa.example').searchParams.get('token');
    await proof(u, replaced.id);
    await rejected('new proof invalidates the old invitation', witnessVote(replaced.id, oldToken, true), /witness_link_invalid/);

    // Return this independent $1 hold before exercising the $15 appeal branch.
    const freshLink = await createWitnessLink(u, replaced.id);
    await witnessVote(replaced.id, new URL(freshLink.path, 'https://qa.example').searchParams.get('token'), true);
    const appealed = await create(1500);
    await proof(u, appealed.id);
    const beforePanelLink = await createWitnessLink(u, appealed.id);
    const beforePanelToken = new URL(beforePanelLink.path, 'https://qa.example').searchParams.get('token');
    const pending = await appealPact(u, appealed.id, { note: 'QA: proof submitted in good faith' });
    ok('$15 balance appeal opens a human panel with $7.50 bond', pending.rawStatus === 'JURY_PENDING');
    const task = await query<{ id: string; bond: number }>("select id, (raw ->> 'bondCents')::int as bond from pacta.jury_tasks where proof_id in (select id from pacta.proofs where pact_id = $1)", [appealed.id]);
    ok('bond stored correctly after combining branches', task.rows[0].bond === 750);
    await rejected('witness cannot override an open human panel', witnessVote(appealed.id, beforePanelToken, true), /not_in_review/);
    const { closeJuryTask } = await import('../lib/server/pact-engine');
    await closeJuryTask(task.rows[0].id, 'REJECT');
    const vaulted = await vaultSummary(u);
    ok('lost credit appeal places stake minus bond in Vault', vaulted.balanceCents === 750 && (await walletSummary(u)).balanceCents === 500);
    await query('update pacta.users set trust_score = 70 where id = $1', [u]);
    for (let i = 0; i < 3; i++) await query("insert into pacta.pacts (user_id,title,stake_cents,deadline,day_code,status,proof_methods,resolved_at) values ($1,'QA release streak',0,now(),'QAQA','REFUNDED','{photo}',now()+interval '1 second')", [u]);
    const redeemed = await redeemTranche(u);
    ok('Vault redeems credit appeal funds to balance with the correct fee', redeemed.method === 'credit' && redeemed.payoutCents === 675 && redeemed.feeCents === 75 && (await walletSummary(u)).balanceCents === 1175);
    ok('no remaining Vault balance after full redemption', (await vaultSummary(u)).balanceCents === 0);

    await query("insert into pacta.wallet_ledger (user_id,type,amount_cents) values ($1,'topup',1000)", [u]);
    const won = await create(1500);
    const proofId = await proof(u, won.id);
    await appealPact(u, won.id, {});
    const caseId = (await query<{ id: string }>('select id from pacta.jury_tasks where proof_id = $1', [proofId])).rows[0].id;
    const cases: CaseRow[] = [{ id: caseId, title: won.title, day_code: 'QAQA', proof_id: proofId, emotional_state: 'normal', raw: { appeal: true, panel: 3 } }];
    await recordQueueVotes(cases, 'qa-reviewer-a', { [caseId]: { verdict: 'APPROVE' } });
    await recordQueueVotes(cases, 'qa-reviewer-a', { [caseId]: { verdict: 'APPROVE' } });
    await recordQueueVotes(cases, 'qa-reviewer-b', { [caseId]: { verdict: 'REJECT' } });
    ok('duplicate reviewer does not count twice and two votes do not close a panel of three', (await getPact(u, won.id)).rawStatus === 'JURY_PENDING');
    await recordQueueVotes(cases, 'qa-reviewer-c', { [caseId]: { verdict: 'APPROVE' } });
    ok('three-person majority approves and returns the entire credit stake', (await getPact(u, won.id)).rawStatus === 'REFUNDED' && (await walletSummary(u)).balanceCents === 2175);
    console.log(`${checks} release integration checks passed. No payment or paid Terac study was created.`);
  } finally {
    await withTransaction(async (q) => {
      await q('delete from pacta.trust_events where user_id = $1', [u]);
      await q('delete from pacta.vault_ledger where user_id = $1', [u]);
      await q('delete from pacta.wallet_ledger where user_id = $1', [u]);
      await q('delete from pacta.pacts where user_id = $1', [u]);
      await q('delete from pacta.users where id = $1', [u]);
    });
    if (previousAutoLaunch === undefined) delete process.env.TERAC_AUTO_LAUNCH; else process.env.TERAC_AUTO_LAUNCH = previousAutoLaunch;
    console.log('Release QA account and related data removed.');
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : 'Release check failed'); process.exit(1); });
