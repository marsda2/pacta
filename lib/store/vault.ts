import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { CheckoutLinkDto, RedeemResultDto, VaultDto } from '@/lib/shared/types';
import { openCheckout } from '@/lib/whop';

// Redemption Vault desde /api/vault/*. Los pactos (lib/store/pacts.tsx) invalidan esta consulta
// cuando un veredicto mueve dinero al Vault.
export function useVault() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['vault'],
    queryFn: () => apiFetch<VaultDto>('/api/vault/summary'),
    refetchInterval: 30_000,
  });

  const redeem = useMutation({
    mutationFn: () => apiFetch<RedeemResultDto>('/api/vault/redeem', { method: 'POST', body: {} }),
    onSuccess: (result) => {
      client.setQueryData(['vault'], result.vault);
      client.invalidateQueries({ queryKey: ['pacts'] });
    },
  });

  // El nivel cambia cuando llega el webhook de Whop; al volver del pago se vuelve a pedir.
  const pass = useMutation({
    mutationFn: async () => openCheckout(await apiFetch<CheckoutLinkDto>('/api/vault/pass', { method: 'POST', body: {} })),
    onSettled: () => client.invalidateQueries({ queryKey: ['vault'] }),
  });

  return {
    vault: query.data,
    loading: query.isPending,
    error: query.error,
    refetch: () => void query.refetch(),
    redeem,
    pass,
  };
}
