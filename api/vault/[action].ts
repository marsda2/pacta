import { allow, api, HttpError } from '../../lib/server/http';
import { requestUserId } from '../../lib/server/identity';
import { passCheckout, redeemTranche, vaultSummary } from '../../lib/server/vault';

// GET  /api/vault/summary → saldo, rendimiento simulado, progreso del desbloqueo e historial.
// POST /api/vault/redeem  → rescata un tramo (min $20, saldo) si se cumplen las condiciones.
// POST /api/vault/pass    → checkout del High-Yield Pass ($9/mes) → { url, checkoutId, planId }.
// Una sola función para las tres rutas: el plan Hobby de Vercel limita el número de funciones.
export default api(async (req, res) => {
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
    default:
      throw new HttpError(404, 'not_found');
  }
});
