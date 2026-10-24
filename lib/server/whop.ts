import { WhopClient } from '@whop/sdk';

import type { CheckoutLinkDto } from '../shared/types';
import { PASS_BILLING_DAYS, PASS_PRICE_CENTS } from '../shared/vault';
import { HttpError } from './http';

// Cliente de la API de Whop, solo en el servidor. La clave nunca llega al navegador.
let client: WhopClient | undefined;

function whop() {
  const token = process.env.WHOP_API_KEY;
  if (!token) throw new HttpError(503, 'payments_not_configured');
  client ??= new WhopClient({ token, apiVersionDate: '2026-10-15-1' });
  return client;
}

function accountId() {
  const id = process.env.WHOP_COMPANY_ID;
  if (!id) throw new HttpError(503, 'payments_not_configured');
  return id;
}

const appUrl = () => process.env.PUBLIC_APP_URL ?? 'https://pacta-theta.vercel.app';

function toLink(checkout: { id: string; purchase_url?: string | null; plan?: { id: string } | null }): CheckoutLinkDto {
  if (!checkout.purchase_url) throw new HttpError(502, 'checkout_without_url');
  return { url: checkout.purchase_url, checkoutId: checkout.id, planId: checkout.plan?.id };
}

// Checkout de un pacto: un cobro único por el importe del stake. La metadata pact_id llega al webhook
// (api/webhooks/whop.ts) y de ahí se activa el pacto.
export async function createStakeCheckout(pactId: string, stakeCents: number, title: string): Promise<CheckoutLinkDto> {
  const checkout = await whop().checkoutConfigurations.create({
    account_id: accountId(),
    mode: 'payment',
    plan: {
      currency: 'usd',
      initial_price: stakeCents / 100,
      plan_type: 'one_time',
      product_id: process.env.WHOP_STAKE_PRODUCT_ID ?? null,
      metadata: { kind: 'pact_stake' },
    },
    metadata: { kind: 'pact_stake', pact_id: pactId, title },
    redirect_url: `${appUrl()}/pact/${pactId}`,
  });
  return toLink(checkout);
}

// High-Yield Pass: suscripción de $9 cada 30 días. metadata.user_id llega a la membresía y a sus
// pagos, y el webhook sube al usuario a high_yield. Con WHOP_PASS_PLAN_ID usa un plan ya creado.
export async function createPassCheckout(userId: string): Promise<CheckoutLinkDto> {
  const planId = process.env.WHOP_PASS_PLAN_ID;
  const checkout = await whop().checkoutConfigurations.create({
    account_id: accountId(),
    mode: 'payment',
    ...(planId
      ? { plan_id: planId }
      : {
          plan: {
            currency: 'usd',
            plan_type: 'renewal',
            initial_price: PASS_PRICE_CENTS / 100,
            renewal_price: PASS_PRICE_CENTS / 100,
            billing_period: PASS_BILLING_DAYS,
            title: 'High-Yield Pass',
            product_id: process.env.WHOP_PASS_PRODUCT_ID ?? null,
            metadata: { kind: 'high_yield_pass' },
          },
        }),
    metadata: { kind: 'high_yield_pass', user_id: userId },
    redirect_url: `${appUrl()}/vault`,
  });
  return toLink(checkout);
}

// Devolución del stake. Sin importe, Whop devuelve lo que quede del pago (reembolsar no cuesta
// nada, pero su comisión del cobro no vuelve). Con `partialCents`, solo esa parte: es el rescate
// de un tramo del Vault.
export async function refundStakePayment(paymentId: string, partialCents?: number): Promise<void> {
  await whop().payments.refund({ id: paymentId, partial_amount: partialCents === undefined ? undefined : partialCents / 100 });
}

// Enlace de pago de un checkout ya creado, para reintentar el cobro de un pacto AWAITING_PAYMENT.
export async function stakeCheckoutLink(checkoutId: string): Promise<CheckoutLinkDto> {
  return toLink(await whop().checkoutConfigurations.retrieve({ id: checkoutId }));
}
