import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { apiBase, apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/session';
import { prepareProofImage } from '@/lib/api/image';
import { TRUST_START_SCORE } from '@/lib/shared/rules';
import type { Pact, PactDto, PactsResponse, ProofMethod, UserSummary } from '@/lib/shared/types';

export interface GpsCheckin {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface NewPactInput {
  title: string;
  stakeCents: number;
  dueAt: number;
  methods: ProofMethod[];
  targetDays?: number;
  scheduledDays?: number[];
  locationName?: string;
  // Pacto sin dinero: se arriesga solo reputación (el servidor ignora stakeCents).
  reputationOnly?: boolean;
  // 'credit': se paga con el saldo prepagado (desde $1); si no, con tarjeta en Whop.
  payWith?: 'credit' | 'card';
}

interface PactsContextValue {
  pacts: Pact[];
  summary: UserSummary;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  getPact: (id: string) => Pact | undefined;
  createPact: (input: NewPactInput) => Promise<Pact>;
  // La sesión de foco es local al dispositivo: no se guarda en el servidor.
  setFocusRemaining: (id: string, seconds: number) => void;
  // `imageUri` sin valor = captura de demostración (sin foto).
  submitProof: (id: string, imageUri?: string, gps?: GpsCheckin) => Promise<void>;
  resolvePact: (id: string, kept: boolean, source?: 'witness' | 'demo') => Promise<void>;
  // Apelación con fianza: panel de jueces humanos de Terac, con hasta 2 fotos extra y una nota.
  appealPact: (id: string, input?: { note?: string; imageUris?: string[] }) => Promise<void>;
}

const EMPTY_SUMMARY: UserSummary = { trustScore: TRUST_START_SCORE, vaultCents: 0, verifiedStreak: 0 };
const PactsContext = createContext<PactsContextValue | null>(null);

export function PactsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [focus, setFocus] = useState<Record<string, number>>({});

  const query = useQuery({
    queryKey: ['pacts'],
    queryFn: () => apiFetch<PactsResponse>('/api/pacts'),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const toPact = useCallback(
    (dto: PactDto): Pact => {
      const started = dto.id in focus && dto.status === 'progress';
      return {
        ...dto,
        focusRemainingSec: focus[dto.id] ?? dto.focusTotalSec,
        stepIndex: started ? Math.max(dto.stepIndex, 1) : dto.stepIndex,
        proofUri: dto.proofImagePath ? `${apiBase()}${dto.proofImagePath}` : undefined,
      };
    },
    [focus],
  );

  const apply = useCallback(
    (data: { pact: PactDto; summary?: UserSummary }) => {
      client.setQueryData<PactsResponse>(['pacts'], (old) => {
        const list = old?.pacts ?? [];
        const exists = list.some((p) => p.id === data.pact.id);
        return {
          pacts: exists ? list.map((p) => (p.id === data.pact.id ? data.pact : p)) : [data.pact, ...list],
          summary: data.summary ?? old?.summary ?? EMPTY_SUMMARY,
        };
      });
      client.invalidateQueries({ queryKey: ['pacts'] });
      // Un veredicto puede mover el stake al Vault o completar la racha que lo desbloquea, y un
      // pacto pagado con el saldo lo retiene o lo devuelve.
      client.invalidateQueries({ queryKey: ['vault'] });
      client.invalidateQueries({ queryKey: ['wallet'] });
    },
    [client],
  );

  const create = useMutation({
    mutationFn: (input: NewPactInput) => apiFetch<{ pact: PactDto }>('/api/pacts', { method: 'POST', body: input }),
    onSuccess: apply,
  });
  const proof = useMutation({
    mutationFn: async ({ id, imageUri, gps }: { id: string; imageUri?: string; gps?: GpsCheckin }) => {
      const imageBase64 = imageUri ? await prepareProofImage(imageUri) : undefined;
      return apiFetch<{ pact: PactDto; summary: UserSummary }>(`/api/pacts/${id}/proof`, { method: 'POST', body: { imageBase64, gps } });
    },
    onSuccess: apply,
  });
  const resolve = useMutation({
    mutationFn: ({ id, kept, source }: { id: string; kept: boolean; source: 'witness' | 'demo' }) =>
      apiFetch<{ pact: PactDto; summary: UserSummary }>(`/api/pacts/${id}/resolve`, { method: 'POST', body: { kept, source } }),
    onSuccess: apply,
  });

  const appeal = useMutation({
    mutationFn: async ({ id, note, imageUris = [] }: { id: string; note?: string; imageUris?: string[] }) => {
      const imagesBase64 = await Promise.all(imageUris.map((uri) => prepareProofImage(uri)));
      return apiFetch<{ pact: PactDto; summary: UserSummary }>(`/api/pacts/${id}/appeal`, { method: 'POST', body: { note, imagesBase64 } });
    },
    onSuccess: apply,
  });

  const pacts = useMemo(() => (query.data?.pacts ?? []).map(toPact), [query.data, toPact]);

  const value = useMemo<PactsContextValue>(
    () => ({
      pacts,
      summary: query.data?.summary ?? EMPTY_SUMMARY,
      loading: query.isLoading,
      error: query.error,
      refetch: () => void query.refetch(),
      getPact: (id) => pacts.find((pact) => pact.id === id),
      createPact: async (input) => toPact((await create.mutateAsync(input)).pact),
      setFocusRemaining: (id, seconds) => setFocus((prev) => ({ ...prev, [id]: Math.max(0, seconds) })),
      submitProof: async (id, imageUri, gps) => void (await proof.mutateAsync({ id, imageUri, gps })),
      resolvePact: async (id, kept, source = 'demo') => void (await resolve.mutateAsync({ id, kept, source })),
      appealPact: async (id, input) => void (await appeal.mutateAsync({ id, ...input })),
    }),
    [pacts, query, toPact, create, proof, resolve, appeal],
  );

  return <PactsContext.Provider value={value}>{children}</PactsContext.Provider>;
}

export function usePacts(): PactsContextValue {
  const ctx = useContext(PactsContext);
  if (!ctx) throw new Error('usePacts must be used inside <PactsProvider>');
  return ctx;
}
