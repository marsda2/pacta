import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/session';
import type { CheckoutLinkDto, WalletDto, WithdrawResultDto } from '@/lib/shared/types';
import { openCheckout } from '@/lib/whop';

// Saldo prepagado desde /api/vault/wallet. Los pactos (lib/store/pacts.tsx) invalidan esta
// consulta cuando crean un pacto con el saldo o un veredicto lo devuelve.
export function useWallet() {
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['wallet'],
    queryFn: () => apiFetch<WalletDto>('/api/vault/wallet'),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  // El saldo sube cuando llega el webhook de Whop; al cerrar el pago se vuelve a pedir.
  const topup = useMutation({
    mutationFn: async (amountCents: number) =>
      openCheckout(await apiFetch<CheckoutLinkDto>('/api/vault/topup', { method: 'POST', body: { amountCents } })),
    onSettled: () => client.invalidateQueries({ queryKey: ['wallet'] }),
  });

  const withdraw = useMutation({
    mutationFn: () => apiFetch<WithdrawResultDto>('/api/vault/withdraw', { method: 'POST', body: {} }),
    onSuccess: (result) => client.setQueryData(['wallet'], result.wallet),
  });

  return {
    wallet: query.data,
    loading: query.isPending,
    error: query.error,
    refetch: () => void query.refetch(),
    topup,
    withdraw,
  };
}
