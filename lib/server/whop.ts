import { WhopClient } from '@whop/sdk';

import { HttpError } from './http';

// Cliente de la API de Whop, solo en el servidor. La clave nunca llega al navegador.
let client: WhopClient | undefined;

function whop() {
  const token = process.env.WHOP_API_KEY;
  if (!token) throw new HttpError(503, 'payments_not_configured');
  client ??= new WhopClient({ token, apiVersionDate: '2026-10-15-1' });
  return client;
}

export interface StakeCheckout {
  checkoutId: string;
  purchaseUrl: string;
}

// Checkout de un pacto: un cobro único por el importe del stake. La metadata pact_id llega al webhook
// (api/webhooks/whop.ts) y de ahí se activa el pacto.
export async function createStakeCheckout(pactId: string, stakeCents: number, title: string): Promise<StakeCheckout> {
  const accountId = process.env.WHOP_COMPANY_ID;
  if (!accountId) throw new HttpError(503, 'payments_not_configured');

  const checkout = await whop().checkoutConfigurations.create({
    account_id: accountId,
    mode: 'payment',
    plan: {
      currency: 'usd',
      initial_price: stakeCents / 100,
      plan_type: 'one_time',
      product_id: process.env.WHOP_STAKE_PRODUCT_ID ?? null,
      metadata: { kind: 'pact_stake' },
    },
    metadata: { pact_id: pactId, title },
    redirect_url: `${process.env.PUBLIC_APP_URL ?? 'https://pacta-theta.vercel.app'}/pact/${pactId}`,
  });

  if (!checkout.purchase_url) throw new HttpError(502, 'checkout_without_url');
  return { checkoutId: checkout.id, purchaseUrl: checkout.purchase_url };
}
