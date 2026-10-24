import { createHmac, timingSafeEqual } from 'node:crypto';

// Cliente REST de Terac (API externa v2, beta). Solo servidor: usa TERAC_API_KEY.
// Spec: https://terac.com/docs/developers/openapi.json
const BASE_URL = 'https://terac.com/api/external/v2';

export type TeracSubmissionStatus =
  | 'screen_passed'
  | 'screened_out'
  | 'in_progress'
  | 'awaiting_review'
  | 'approved'
  | 'rejected'
  | 'abandoned';

export interface TeracSubmission {
  id: string;
  opportunity_id: string;
  status: TeracSubmissionStatus;
  participant_id: string;
  created_at: string;
  updated_at: string;
}

export class TeracError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.TERAC_API_KEY;
  if (!key) throw new Error('Falta TERAC_API_KEY');

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;
  if (!res.ok) {
    const message = (data as { message?: string } | undefined)?.message ?? res.statusText;
    throw new TeracError(res.status, message);
  }
  return data as T;
}

interface JuryOpportunityInput {
  title: string;
  projectId: string;
  // Página pública donde el humano ve la prueba y vota (Terac le añade ?teracSubmissionId=…).
  taskUrl: string;
  participants: number;
  minutes: number;
}

// Cuestionario de los jueces: Terac no lanza estudios sin él. Filtra por familiaridad con fotos
// editadas y por inglés, sin revelar el criterio ni preguntar nada del estudio (no se paga).
const JUROR_SCREENER = [
  {
    key: 'activity',
    text: 'Which of these do you do at least once a week?',
    pick: 'any',
    answers: [
      { text: 'Edit or retouch photos with an app', qualify_logic: 'must_one_of' },
      { text: 'Check whether an image or claim online is real before sharing it', qualify_logic: 'must_one_of' },
      { text: 'Write product reviews or moderate an online community', qualify_logic: 'must_one_of' },
      { text: 'Post photos on social media', qualify_logic: 'must_one_of' },
      { text: 'None of these', qualify_logic: 'reject' },
    ],
  },
  {
    key: 'english',
    text: 'How comfortable are you reading instructions in English?',
    pick: 'one',
    answers: [
      { text: 'Native or fluent', qualify_logic: 'must' },
      { text: 'I can read simple English only', qualify_logic: 'reject' },
      { text: 'I do not read English', qualify_logic: 'reject' },
    ],
  },
];

// Crea un borrador (gratis, sin reclutar). El review es manual: el pago al juez solo
// sale cuando PACTA llama a approveSubmission tras recibir su voto.
export function createJuryOpportunity(input: JuryOpportunityInput) {
  return call<{ id: string }>('POST', '/opportunities', {
    title: input.title,
    description: 'Look at a photo that someone sent as proof of a habit and say if it is real, not done, or fake.',
    project_id: input.projectId,
    num_participants: input.participants,
    business_type: 'b2c',
    unrestricted_audience: true,
    screening_questions: JUROR_SCREENER,
    tasks: [
      {
        sequence: 1,
        task_type: 'interview',
        review_type: 'manual_review',
        task_url: input.taskUrl,
        title: input.title,
        description: 'Open the page, look at the photo and any extra evidence, and give your verdict.',
        duration_minutes: input.minutes,
      },
    ],
  });
}

export const getOpportunity = (id: string) =>
  call<{ status: string; pricing: { total_cost_cents: number; cost_per_participant_cents: number } }>('GET', `/opportunities/${id}`);

// Solo para borradores: se usa para probar el payload sin gastar nada.
export const deleteOpportunity = (id: string) => call('DELETE', `/opportunities/${id}`);

// Compromete dinero real y empieza el reclutamiento: solo con confirmación del usuario.
export const launchOpportunity = (id: string) => call('POST', `/opportunities/${id}/launch`);
export const getSubmission = (id: string) => call<TeracSubmission>('GET', `/submissions/${id}`);
export const approveSubmission = (id: string) => call('POST', `/submissions/${id}/approve`);
export const rejectSubmission = (id: string, reason: string) =>
  call('POST', `/submissions/${id}/reject`, { rejection_category: 'other', rejection_reason: reason });

// Al terminar, el juez vuelve a Terac por esta URL y su respuesta pasa a AWAITING_REVIEW.
export const completionUrl = (submissionId: string, taskId: string) =>
  `https://terac.com/api/external/callback?${new URLSearchParams({
    teracSubmissionId: submissionId,
    submissionId,
    taskId,
    result: 'completed',
  })}`;

// base64(HMAC-SHA256(secret, X-Terac-Request-Timestamp + cuerpo crudo)).
export function verifyTeracSignature(secret: string, timestamp: string, rawBody: string, signature: string) {
  const expected = createHmac('sha256', secret).update(timestamp + rawBody).digest();
  const received = Buffer.from(signature, 'base64');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
