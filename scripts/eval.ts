// Evalúa el agente auditor contra eval/set.json (pruebas con etiqueta humana) y guarda cada
// ejecución en pacta.eval_runs. Es el "antes y después" de docs/04 y, además, compara modelos.
// Uso: npm run eval -- [prompt] [modelo ...]
//   npm run eval -- v1-baseline gemini-3.6-flash claude-haiku-5-5
// Por defecto: v1-baseline con el modelo de AGENT_MODEL. Los modelos de Claude necesitan
// ANTHROPIC_API_KEY y los de Gemini, GEMINI_API_KEY; el que no tenga clave se salta.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { query } from '../lib/server/db';
import { auditProof, BASELINE_VERSION, DEFAULT_MODEL } from '../lib/server/vision-agent';
import { shouldAutoApprove, type AgentAudit } from '../lib/shared/rules';

type Label = 'APPROVE' | 'CHEAT' | 'REJECT' | 'MICRO_TASK';
interface Item {
  id: string;
  image: string;
  title: string;
  dayCode: string;
  emotionalState: 'normal' | 'overwhelmed';
  label: Label;
  note: string;
}

// USD por millón de tokens (entrada, salida). Gemini 3.6 Flash: tarifa de lanzamiento hasta el
// 31-dic-2026 (luego $1.50 / $7.50).
const PRICES: Record<string, [number, number]> = {
  'gemini-3.6-flash': [0.75, 3.75],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5],
};

const EVAL_DIR = join(process.cwd(), 'eval');
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const fmt = (a: AgentAudit) => `${a.verdict} ${a.confidence.toFixed(2)} [${a.cheatSignals.join(',')}]`;

async function runModel(model: string, version: string, items: Item[]) {
  console.log(`\n=== ${model} · ${version} ===`);
  const results = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let totalMs = 0;

  for (const item of items) {
    const data = readFileSync(join(EVAL_DIR, item.image));
    const mime = MIME[item.image.split('.').pop()!.toLowerCase()];
    const started = Date.now();
    const { audit, usage } = await auditProof({
      image: { mime, data },
      title: item.title,
      dayCode: item.dayCode,
      emotionalState: item.emotionalState,
      promptVersion: version,
      model,
    });
    totalMs += Date.now() - started;
    inputTokens += usage.inputTokens;
    outputTokens += usage.outputTokens;

    // Lo que haría PACTA: aprobar sin humano o mandarlo al jurado.
    const autoApproved = shouldAutoApprove(audit, item.emotionalState);
    const correct = autoApproved === (item.label === 'APPROVE');
    results.push({ item, audit, autoApproved, correct });
    console.log(`${correct ? 'ok ' : 'MAL'} ${item.id.padEnd(20)} ${item.label.padEnd(10)} -> ${autoApproved ? 'APROBADO ' : 'DERIVADO '} ${fmt(audit).padEnd(34)} ${audit.reason}`);
  }

  const total = results.length;
  const accuracy = results.filter((r) => r.correct).length / total;
  const cheats = results.filter((r) => r.item.label === 'CHEAT');
  const cheatsCaught = cheats.filter((r) => !r.autoApproved).length;
  const falseApprovals = results.filter((r) => r.item.label !== 'APPROVE' && r.autoApproved).length;
  const escalated = results.filter((r) => !r.autoApproved).length;
  const [inPrice, outPrice] = PRICES[model] ?? [0, 0];
  const costUsd = (inputTokens * inPrice + outputTokens * outPrice) / 1_000_000;

  await query(
    `insert into pacta.eval_runs (prompt_version, accuracy, cheats_caught, false_approvals, details) values ($1, $2, $3, $4, $5)`,
    [
      version,
      accuracy.toFixed(3),
      cheatsCaught,
      falseApprovals,
      JSON.stringify({
        model,
        inputTokens,
        outputTokens,
        costUsd,
        avgMs: Math.round(totalMs / total),
        items: results.map((r) => ({ id: r.item.id, label: r.item.label, autoApproved: r.autoApproved, audit: r.audit })),
      }),
    ],
  );

  return { model, accuracy, cheatsCaught, cheats: cheats.length, falseApprovals, escalated, total, costUsd, avgMs: Math.round(totalMs / total) };
}

async function main() {
  const [version = BASELINE_VERSION, ...requested] = process.argv.slice(2);
  const models = requested.length ? requested : [DEFAULT_MODEL];
  const items = JSON.parse(readFileSync(join(EVAL_DIR, 'set.json'), 'utf8')) as Item[];

  const summaries = [];
  for (const model of models) {
    const needsKey = model.startsWith('gemini') ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY';
    if (!process.env[needsKey]) {
      console.log(`\n=== ${model}: sin ${needsKey}, se salta ===`);
      continue;
    }
    summaries.push(await runModel(model, version, items));
  }

  console.log(`\nResumen · ${version}`);
  console.log('modelo'.padEnd(20), 'precisión', 'trampas', 'falsas aprob.', 'derivados', 'ms/foto', 'coste/foto');
  for (const s of summaries) {
    console.log(
      s.model.padEnd(20),
      `${(s.accuracy * 100).toFixed(0)}%`.padEnd(9),
      `${s.cheatsCaught}/${s.cheats}`.padEnd(7),
      String(s.falseApprovals).padEnd(13),
      `${s.escalated}/${s.total}`.padEnd(9),
      String(s.avgMs).padEnd(7),
      `$${(s.costUsd / s.total).toFixed(5)}`,
    );
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
