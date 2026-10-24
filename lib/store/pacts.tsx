import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Pact, ProofMethod } from '@/lib/shared/types';

// Store en memoria para el prototipo. Se sustituirá por /api/pacts (Supabase + Whop)
// cuando el flujo de dinero esté conectado (ver ROADMAP.md, fase 4).
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function seed(now = Date.now()): Pact[] {
  return [
    {
      id: 'finish-proposal',
      title: 'Finish the proposal',
      stakeCents: 2000,
      dueAt: now + 45 * MIN,
      status: 'progress',
      methods: ['photo', 'location', 'witness'],
      focusTotalSec: 45 * 60,
      focusRemainingSec: 45 * 60,
      stepIndex: 1,
    },
    {
      id: 'gym-session',
      title: 'Go to the gym',
      stakeCents: 1000,
      dueAt: now + 20 * HOUR,
      status: 'scheduled',
      methods: ['photo', 'location'],
      focusTotalSec: 60 * 60,
      focusRemainingSec: 60 * 60,
      stepIndex: 0,
    },
    {
      id: 'write-500',
      title: 'Write 500 words',
      stakeCents: 500,
      dueAt: now - 20 * HOUR,
      status: 'verified',
      methods: ['photo'],
      focusTotalSec: 30 * 60,
      focusRemainingSec: 0,
      stepIndex: 2,
      completedAt: now - 21 * HOUR,
    },
    {
      id: 'clear-inbox',
      title: 'Clear the inbox',
      stakeCents: 1000,
      dueAt: now - 44 * HOUR,
      status: 'missed',
      methods: ['photo', 'witness'],
      focusTotalSec: 30 * 60,
      focusRemainingSec: 30 * 60,
      stepIndex: 1,
    },
  ];
}

export interface NewPactInput {
  title: string;
  stakeCents: number;
  dueAt: number;
  methods: ProofMethod[];
}

interface PactsContextValue {
  pacts: Pact[];
  getPact: (id: string) => Pact | undefined;
  createPact: (input: NewPactInput) => Pact;
  setFocusRemaining: (id: string, seconds: number) => void;
  submitProof: (id: string, proofUri?: string) => void;
  resolvePact: (id: string, kept: boolean) => void;
}

const PactsContext = createContext<PactsContextValue | null>(null);

export function PactsProvider({ children }: { children: ReactNode }) {
  const [pacts, setPacts] = useState<Pact[]>(() => seed());

  const update = useCallback((id: string, patch: (pact: Pact) => Pact) => {
    setPacts((list) => list.map((pact) => (pact.id === id ? patch(pact) : pact)));
  }, []);

  const value = useMemo<PactsContextValue>(
    () => ({
      pacts,
      getPact: (id) => pacts.find((pact) => pact.id === id),
      createPact: (input) => {
        const now = Date.now();
        const focusSec = Math.max(5 * 60, Math.min(45 * 60, Math.floor((input.dueAt - now) / 1000)));
        const pact: Pact = {
          id: Math.random().toString(36).slice(2, 8),
          title: input.title.trim() || 'Untitled pact',
          stakeCents: input.stakeCents,
          dueAt: input.dueAt,
          methods: input.methods,
          status: 'progress',
          focusTotalSec: focusSec,
          focusRemainingSec: focusSec,
          stepIndex: 0,
        };
        setPacts((list) => [pact, ...list]);
        return pact;
      },
      setFocusRemaining: (id, seconds) =>
        update(id, (pact) => ({ ...pact, focusRemainingSec: Math.max(0, seconds), stepIndex: Math.max(pact.stepIndex, 1) })),
      submitProof: (id, proofUri) => update(id, (pact) => ({ ...pact, proofUri, status: 'pending', stepIndex: 2 })),
      resolvePact: (id, kept) =>
        update(id, (pact) => ({
          ...pact,
          status: kept ? 'verified' : 'missed',
          completedAt: kept ? Date.now() : undefined,
        })),
    }),
    [pacts, update],
  );

  return <PactsContext.Provider value={value}>{children}</PactsContext.Provider>;
}

export function usePacts(): PactsContextValue {
  const ctx = useContext(PactsContext);
  if (!ctx) throw new Error('usePacts must be used inside <PactsProvider>');
  return ctx;
}
