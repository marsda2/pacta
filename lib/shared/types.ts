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
  // Motivo devuelto por la IA cuando tuvo dudas al revisar la foto.
  aiReason?: string;
  // True cuando la IA rechazó o dudó específicamente porque no detectó el código escrito a mano.
  missingDayCode?: boolean;
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
  // Código de 4 caracteres que debe escribirse a mano en la foto en vivo.
  dayCode?: string;
  // Hábitos semanales: días objetivo (1 = pacto único, 2–7 = hábito semanal) y días ya verificados.
  targetDays?: number;
  completedDays?: number;
  // Lugar asociado cuando se activa la verificación por ubicación (ej. "SmartFit Gym").
  locationName?: string;
  // Ruta relativa a la imagen de la prueba y cuándo se subió, si la hay.
  proofImagePath?: string;
  proofAt?: number;
  completedAt?: number;
  // Solo mientras el pacto espera un veredicto.
  review?: PactReviewDto;
  // Solo en la respuesta de creación: dónde se paga el stake en Whop.
  checkout?: CheckoutLinkDto;
}

// Enlace de pago de Whop. Fuera de Whop la app abre `url`; dentro del iframe de Whop abre el
// modal de pago con `checkoutId` + `planId` (inAppPurchase del iframe SDK).
export interface CheckoutLinkDto {
  url: string;
  checkoutId: string;
  planId?: string;
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

// Redemption Vault tal y como lo devuelve /api/vault/summary.
export interface VaultEntryDto {
  id: string;
  type: 'lock' | 'unlock' | 'fee' | 'yield';
  amountCents: number;
  at: number;
  pactTitle?: string;
  // Reembolso de Whop que devolvió el dinero; sin él, el movimiento solo está en el ledger.
  whopRef?: string;
}

export interface VaultDto {
  balanceCents: number;
  // Rendimiento simulado acumulado (céntimos con decimales) y lo que añade al día.
  yieldCents: number;
  dailyYieldCents: number;
  apy: number;
  tier: 'free' | 'high_yield';
  trustScore: number;
  verifiedSinceReset: number;
  unlock: {
    eligible: boolean;
    trancheCents: number;
    payoutCents: number;
    feeCents: number;
    yieldCents: number;
    trustNeeded: number;
    pactsNeeded: number;
    lockedUntil?: number;
  };
  entries: VaultEntryDto[];
}

export interface RedeemResultDto {
  vault: VaultDto;
  payoutCents: number;
  feeCents: number;
  yieldCents: number;
  // 'whop': reembolso real de los stakes fallados; 'credit': vuelve al saldo prepagado;
  // 'ledger': stakes sin pago (datos de demo).
  method: 'whop' | 'credit' | 'ledger';
}

// Saldo prepagado tal y como lo devuelve /api/vault/wallet.
export interface WalletEntryDto {
  id: string;
  type: 'topup' | 'hold' | 'release' | 'vault_unlock' | 'withdraw';
  amountCents: number;
  at: number;
  pactTitle?: string;
}

export interface WalletDto {
  balanceCents: number;
  // Stakes retenidos en pactos que siguen abiertos.
  heldCents: number;
  entries: WalletEntryDto[];
}

export interface WithdrawResultDto {
  wallet: WalletDto;
  withdrawnCents: number;
  // 'whop': reembolso a la tarjeta de las recargas; 'ledger': recargas sin pago (datos de demo).
  method: 'whop' | 'ledger';
}
