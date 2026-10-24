import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

import { CHEAT_SIGNALS, type AgentAudit, type AgentVerdict, type CheatSignal } from '../shared/rules';
import { query } from './db';

// Agente auditor (docs/04): mira la foto de la prueba y devuelve un veredicto estructurado.
// La decisión de aprobar sin humano NO se toma aquí sino en shouldAutoApprove (rules.ts).
// El proveedor se deduce del modelo: `gemini-*` usa Google; el resto, Anthropic.

// Por defecto, el más barato que ve bien. Se cambia con AGENT_MODEL (p. ej. claude-sonnet-5-5).
export const DEFAULT_MODEL = process.env.AGENT_MODEL ?? 'gemini-3.6-flash';

export const BASELINE_VERSION = 'v1-baseline';

// v1: instrucciones genéricas, a propósito. No conoce los trucos (foto de una pantalla,
// pruebas viejas); v2-terac añade reglas aprendidas de los votos de Terac.
const BASELINE_PROMPT = `You verify proof photos for a habit-accountability app. A user staked money on a habit and must send a photo showing they did it.

You receive the habit title, a short code the user should have written by hand in the photo, and the photo. Decide whether the photo shows the user really did the habit.

Return your verdict: APPROVE if it looks genuine, REJECT if it clearly does not show the habit, UNSURE if you cannot tell. Give a confidence from 0 to 1 and one short sentence of reasoning.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['task_match', 'day_code_visible', 'cheat_signals', 'confidence', 'verdict', 'reason'],
  properties: {
    task_match: { type: 'boolean', description: 'The photo shows the habit described in the title.' },
    day_code_visible: { type: 'boolean', description: 'The expected code is visible and handwritten in the photo.' },
    cheat_signals: {
      type: 'array',
      items: { type: 'string', enum: [...CHEAT_SIGNALS] },
      description: 'Signs of cheating, or ["none"] if there are none.',
    },
    confidence: { type: 'number', description: 'From 0 to 1.' },
    verdict: { type: 'string', enum: ['APPROVE', 'UNSURE', 'REJECT'] },
    reason: { type: 'string', description: 'One short sentence.' },
  },
} as const;

interface RawAudit {
  task_match: boolean;
  day_code_visible: boolean;
  cheat_signals: string[];
  confidence: number;
  verdict: AgentVerdict;
  reason: string;
}

// El prompt vive en pacta.agent_prompts, versionado. v1 se siembra solo la primera vez.
export async function loadPrompt(version: string): Promise<{ version: string; content: string; fewShots: unknown[] }> {
  if (version === BASELINE_VERSION) {
    await query('insert into pacta.agent_prompts (version, content) values ($1, $2) on conflict (version) do nothing', [
      BASELINE_VERSION,
      BASELINE_PROMPT,
    ]);
  }
  const { rows } = await query<{ content: string; few_shots: unknown[] }>(
    'select content, few_shots from pacta.agent_prompts where version = $1',
    [version],
  );
  if (!rows[0]) throw new Error(`Prompt desconocido: ${version}`);
  return { version, content: rows[0].content, fewShots: rows[0].few_shots };
}

export interface AuditInput {
  image: { mime: string; data: Buffer };
  title: string;
  dayCode: string;
  emotionalState: 'normal' | 'overwhelmed';
  locationName?: string;
  gpsSummary?: string;
  promptVersion?: string;
  model?: string;
}

export interface AuditResult {
  audit: AgentAudit;
  promptVersion: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

interface ModelCall {
  // null si el modelo no dio una respuesta usable (rechazo, bloqueo, corte por longitud).
  text: string | null;
  stopReason: string;
  usage: { inputTokens: number; outputTokens: number };
}

type Photo = AuditInput['image'];
const userText = (input: AuditInput) =>
  [
    `Habit: ${input.title}`,
    input.locationName ? `Expected location/place: ${input.locationName}` : null,
    input.gpsSummary ? `Device GPS check-in: ${input.gpsSummary}` : null,
    `Expected handwritten code: ${input.dayCode}`,
    `User's state: ${input.emotionalState}`,
  ]
    .filter(Boolean)
    .join('\n');

async function callAnthropic(model: string, system: string, photo: Photo, text: string): Promise<ModelCall> {
  const response = await new Anthropic().messages.create({
    model,
    max_tokens: 1024,
    system,
    // Sin forced tool_choice (400 en Sonnet 5.5): la salida va por structured outputs.
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: photo.mime as 'image/jpeg' | 'image/png' | 'image/webp', data: photo.data.toString('base64') } },
          { type: 'text', text },
        ],
      },
    ],
  });
  const block = response.content.find((b) => b.type === 'text');
  const usable = response.stop_reason === 'end_turn' && block?.type === 'text';
  return {
    text: usable ? block.text : null,
    stopReason: response.stop_reason ?? 'unknown',
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}

async function callGemini(model: string, system: string, photo: Photo, text: string): Promise<ModelCall> {
  const response = await new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }).models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: photo.mime, data: photo.data.toString('base64') } }, { text }] }],
    config: {
      systemInstruction: system,
      responseMimeType: 'application/json',
      responseJsonSchema: SCHEMA,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      maxOutputTokens: 2048,
    },
  });
  const finish = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason ?? 'unknown';
  const usage = response.usageMetadata;
  return {
    text: finish === 'STOP' ? (response.text ?? null) : null,
    stopReason: String(finish),
    // Los tokens de razonamiento se facturan como salida.
    usage: { inputTokens: usage?.promptTokenCount ?? 0, outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0) },
  };
}

// Los proveedores devuelven 429/5xx en picos de demanda: se reintenta con espera creciente
// antes de rendirse (si se rinde, el pacto queda en AI_REVIEW y nunca se aprueba por error).
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = (error as { status?: number }).status ?? 0;
      if (attempt >= attempts || ![429, 500, 502, 503, 529].includes(status)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}

export async function auditProof(input: AuditInput): Promise<AuditResult> {
  const prompt = await loadPrompt(input.promptVersion ?? process.env.AGENT_PROMPT_VERSION ?? BASELINE_VERSION);
  const model = input.model ?? DEFAULT_MODEL;
  const call = model.startsWith('gemini') ? callGemini : callAnthropic;
  const result = await withRetry(() => call(model, prompt.content, input.image, userText(input)));
  const base = { promptVersion: prompt.version, model, usage: result.usage };

  // Un rechazo o un bloqueo no es una prueba válida: que lo decida el jurado.
  if (!result.text) {
    return {
      ...base,
      audit: { taskMatch: false, dayCodeVisible: false, cheatSignals: ['none'], confidence: 0, verdict: 'UNSURE', reason: `model_${result.stopReason}` },
    };
  }

  const raw = JSON.parse(result.text) as RawAudit;
  const signals = raw.cheat_signals.filter((s): s is CheatSignal => (CHEAT_SIGNALS as readonly string[]).includes(s));
  return {
    ...base,
    audit: {
      taskMatch: raw.task_match,
      dayCodeVisible: raw.day_code_visible,
      cheatSignals: signals.length ? signals : ['none'],
      confidence: Math.min(1, Math.max(0, raw.confidence)),
      verdict: raw.verdict,
      reason: raw.reason.slice(0, 300),
    },
  };
}
