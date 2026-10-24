// Estado de un pacto tal y como lo muestra la UI. La máquina de estados del servidor
// (docs/02: ACTIVE, AI_REVIEW, JURY_PENDING, ...) se proyecta sobre estos cinco valores.
export type PactUiStatus = 'scheduled' | 'progress' | 'pending' | 'verified' | 'missed';

export type ProofMethod = 'photo' | 'location' | 'witness';

export interface Pact {
  id: string;
  title: string;
  stakeCents: number;
  // Fecha límite en ms desde epoch.
  dueAt: number;
  status: PactUiStatus;
  methods: ProofMethod[];
  // Segundos totales de la sesión de foco y segundos que quedan.
  focusTotalSec: number;
  focusRemainingSec: number;
  // Índice del paso: 0 Outline, 1 Draft, 2 Review.
  stepIndex: number;
  proofUri?: string;
  completedAt?: number;
}
