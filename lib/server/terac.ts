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

// Crea un borrador (gratis, sin reclutar). El review es manual: el pago al juez solo
// sale cuando PACTA llama a approveSubmission tras recibir su voto.
export function createJuryOpportunity(input: JuryOpportunityInput) {
  return call<{ id: string }>('POST', '/opportunities', {
    title: input.title,
    project_id: input.projectId,
    num_participants: input.participants,
    business_type: 'b2c',
    unrestricted_audience: true,
    tasks: [
      {
        sequence: 1,
        task_type: 'interview',
        review_type: 'manual_review',
        task_url: input.taskUrl,
        title: input.title,
        duration_minutes: input.minutes,
      },
    ],
  });
}

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
