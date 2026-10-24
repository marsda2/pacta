import { createSdk, type WhopIframeSdk } from '@whop/iframe';
import { Linking, Platform } from 'react-native';

import type { CheckoutLinkDto } from '@/lib/shared/types';

const INSIDE_WHOP_KEY = 'pacta.inside-whop';

// PACTA abierta dentro de Whop: en el iframe de whop.com o en la app móvil de Whop, que siempre
// entra por /experiences/[experienceId] (app/experiences) y lo recordamos para la sesión.
export function insideWhop(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  if (window.top !== window.self) return true;
  try {
    return globalThis.sessionStorage?.getItem(INSIDE_WHOP_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberInsideWhop() {
  try {
    globalThis.sessionStorage?.setItem(INSIDE_WHOP_KEY, '1');
  } catch {
    // Sin almacenamiento: dentro del iframe basta con la comprobación de window.top.
  }
}

let sdk: WhopIframeSdk | undefined;

function iframeSdk(): WhopIframeSdk | undefined {
  const appId = process.env.EXPO_PUBLIC_WHOP_APP_ID;
  if (!appId) return undefined;
  sdk ??= createSdk({ appId });
  return sdk;
}

// Abre el pago de Whop. Dentro de Whop, su modal de pago sin salir de la app (inAppPurchase);
// fuera, la página del checkout. 'paid' solo indica que el modal se cerró con el pago hecho: el
// estado del pacto o del Pass lo cambia siempre el webhook de Whop.
export async function openCheckout(link: CheckoutLinkDto): Promise<'paid' | 'cancelled' | 'opened'> {
  const whop = insideWhop() && link.planId ? iframeSdk() : undefined;
  if (whop && link.planId) {
    const result = await whop.inAppPurchase({ planId: link.planId, id: link.checkoutId });
    return result.status === 'ok' ? 'paid' : 'cancelled';
  }
  await Linking.openURL(link.url);
  return 'opened';
}
