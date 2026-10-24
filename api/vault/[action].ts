import { allow, api, HttpError } from '../../lib/server/http';
import { requestSession, requestUserId } from '../../lib/server/identity';
import { exchangeWhopCode, refreshWhopLogin, revokeWhopLogin, startWhopLogin } from '../../lib/server/whop-oauth';
import { passCheckout, redeemTranche, vaultSummary } from '../../lib/server/vault';
import { topupCheckout, walletSummary, withdrawBalance } from '../../lib/server/wallet';

// El dinero del usuario: Vault, High-Yield Pass y saldo prepagado.
// GET  /api/vault/summary  → saldo del Vault, rendimiento simulado, progreso del desbloqueo e historial.
// POST /api/vault/redeem   → rescata un tramo (min $20, saldo) si se cumplen las condiciones.
// POST /api/vault/pass     → checkout del High-Yield Pass ($9/mes) → { url, checkoutId, planId }.
// GET  /api/vault/wallet   → saldo prepagado, lo retenido en pactos abiertos e historial.
// POST /api/vault/topup    → checkout de una recarga {amountCents: 1000 | 2000 | 5000}.
// POST /api/vault/withdraw → devuelve todo el saldo a la tarjeta (reembolso de las recargas).
// Una sola función para todas: el plan Hobby de Vercel limita el número de funciones.
export default api(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const body = (req.body ?? {}) as Record<string, unknown>;
  // Auth shares this function to stay within Vercel Hobby's function limit.
  switch (req.query.action) {
    case 'session':
      allow(req, 'GET');
      return res.status(200).json({ user: await requestSession(req) });
    case 'auth-start':
      allow(req, 'POST');
      return res.status(200).json(startWhopLogin(body.redirectUri));
    case 'auth-exchange':
      allow(req, 'POST');
      return res.status(200).json(await exchangeWhopCode(body));
    case 'auth-refresh':
      allow(req, 'POST');
      return res.status(200).json(await refreshWhopLogin(body.refreshToken));
    case 'auth-logout':
      allow(req, 'POST');
      await revokeWhopLogin(body.refreshToken);
      return res.status(200).json({ ok: true });
  }
  const userId = await requestUserId(req);
  switch (req.query.action) {
    case 'summary':
      allow(req, 'GET');
      return res.status(200).json(await vaultSummary(userId));
    case 'redeem':
      allow(req, 'POST');
      return res.status(200).json(await redeemTranche(userId));
    case 'pass':
      allow(req, 'POST');
      return res.status(200).json(await passCheckout(userId));
    case 'wallet':
      allow(req, 'GET');
      return res.status(200).json(await walletSummary(userId));
    case 'topup':
      allow(req, 'POST');
      return res.status(200).json(await topupCheckout(userId, ((req.body ?? {}) as Record<string, unknown>).amountCents));
    case 'withdraw':
      allow(req, 'POST');
      return res.status(200).json(await withdrawBalance(userId));
    default:
      throw new HttpError(404, 'not_found');
  }
});
