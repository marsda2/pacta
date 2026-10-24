// Estado de un pacto tal y como lo muestra la UI. La máquina de estados del servidor
// (ACTIVE, AI_REVIEW, JURY_PENDING, ...) se proyecta sobre estos cinco valores.
export type PactUiStatus = 'scheduled' | 'progress' | 'pending' | 'verified' | 'missed';

export type ProofMethod = 'photo' | 'location' | 'witness';

// Qué puede hacer el usuario mientras el pacto espera un veredicto (AI_REVIEW / JURY_PENDING).
export interface PactReviewDto {
  // La IA ya opinó y no aprobó (si no, sigue revisando o no está disponible).
  aiReviewed: boolean;
  // Un jurado humano de Terac tiene el caso.
  juryOpen: boolean;
  // Puede subir una segunda prueba.
  canRetry: boolean;
  // Puede pedir un panel de jueces humanos.
  canAppeal: boolean;
  // Fianza que deja en juego si apela (0 = cubierta por el Pass). Solo si canAppeal.
  appealBondCents?: number;
  // Horas que quedan antes de que el stake pase al Vault si nadie lo resuelve.
  hoursLeft?: number;
}

// Pacto tal y como lo devuelve /api/pacts.
export interface PactDto {
  id: string;
  title: string;
  stakeCents: number;
  // Fecha límite en ms desde epoch.
  dueAt: number;
  status: PactUiStatus;
  // Estado de la máquina de estados del servidor (docs/02).
  rawStatus: string;
  methods: ProofMethod[];
  focusTotalSec: number;
  // Índice del paso: 0 Outline, 1 Draft, 2 Review.
  stepIndex: number;
  // Ruta relativa a la imagen de la prueba y cuándo se subió, si la hay.
  proofImagePath?: string;
  proofAt?: number;
  completedAt?: number;
  // Solo mientras el pacto espera un veredicto.
  review?: PactReviewDto;
  // Solo en la respuesta de creación: URL de Whop donde se paga el stake.
  checkoutUrl?: string;
}

export interface UserSummary {
  trustScore: number;
  vaultCents: number;
  verifiedStreak: number;
}

export interface PactsResponse {
  pacts: PactDto[];
  summary: UserSummary;
}

// Pacto en la app: el DTO más el estado local de la sesión de foco.
export interface Pact extends PactDto {
  focusRemainingSec: number;
  proofUri?: string;
}
