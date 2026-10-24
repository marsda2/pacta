import { GoogleGenAI, ThinkingLevel } from '@google/genai';

import { HttpError } from './http';

// Pax (Copilot) usa el mismo proveedor que el revisor de fotos: Gemini, con GEMINI_API_KEY.
export const BLOCKERS = ['big', 'distracted', 'clarity'] as const;
export type Blocker = (typeof BLOCKERS)[number];

const MODEL = process.env.COPILOT_MODEL ?? process.env.AGENT_MODEL ?? 'gemini-3.6-flash';

const BLOCKER_HINT: Record<Blocker, string> = {
  big: 'The task feels too big to start.',
  distracted: 'The person keeps getting distracted.',
  clarity: 'The person does not know what the first concrete action is.',
};

const SYSTEM = [
  'You are Pax, a calm companion that shrinks a task into the next small steps.',
  'Return 3 steps. Each step is one concrete action, starts with a verb, and is at most 60 characters.',
  'Write the steps in English. Do not add advice, greetings or explanations.',
].join(' ');

const SCHEMA = {
  type: 'object',
  properties: { steps: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 } },
  required: ['steps'],
};

// Pasos para un bloqueo. Si Gemini falla o responde algo inválido, lanza y el cliente usa sus pasos de respaldo.
export async function suggestMicroSteps(blocker: Blocker, task?: string): Promise<string[]> {
  if (!process.env.GEMINI_API_KEY) throw new HttpError(503, 'copilot_not_configured');

  const text = [BLOCKER_HINT[blocker], task ? `Task: ${task}` : 'No task title was given.'].join('\n');
  const response = await new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }).models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: 'application/json',
      responseJsonSchema: SCHEMA,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      maxOutputTokens: 512,
    },
  });

  const parsed = JSON.parse(response.text ?? '{}') as { steps?: unknown };
  const steps = Array.isArray(parsed.steps)
    ? parsed.steps.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter((s) => s.length > 0 && s.length <= 80)
    : [];
  if (steps.length < 2) throw new HttpError(502, 'copilot_bad_response');
  return steps.slice(0, 5);
}
