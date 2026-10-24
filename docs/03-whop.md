# 03 · Conectar Whop

> ⚠️ **La CLI y la API de Whop no tienen sandbox ni modo de prueba.** Todo lo que se cree (productos, pagos, reembolsos) es real. Para la demo: stakes de **$1–$5** y reembolsarlos todos al terminar.

Los nombres exactos de los endpoints, campos y eventos están marcados con **[verificar]**: hay que confirmarlos con `whop <grupo> --help` y en https://docs.whop.com (índice: https://docs.whop.com/llms.txt) antes de programar.

## 1. CLI (ya instalada: v0.28.0)

```bash
whop login                 # OAuth en el navegador
whop quickstart            # elegir la empresa/negocio sobre la que actúa la CLI
whop auth status           # comprobar el perfil activo
whop --help                # ver todos los grupos de comandos
```

## 2. Crear la app de Whop

1. Dashboard de Whop → **Developer** → crear una app "PACTA".
2. Anotar: `WHOP_APP_ID`, `WHOP_COMPANY_ID` (la empresa elegida en el quickstart) y crear una **API key** con los permisos mínimos: productos, planes, checkout, pagos, reembolsos, webhooks y memberships. Lee https://docs.whop.com/developer/guides/auth-scoping.md antes de dar la key al agente.
3. Configurar la **URL de la experiencia/iframe** de la app → `https://pacta.vercel.app` (la URL de Vercel). Así PACTA se abre dentro de Whop. **[verificar]** el nombre exacto del campo en la configuración de la app.
4. Dentro del iframe, Whop envía un token del usuario en una cabecera; el servidor lo verifica con el SDK y obtiene el `whop_user_id`. Esa es nuestra autenticación: no hace falta un login propio. **[verificar]** el nombre de la cabecera y de la función de verificación del SDK.

### ¿Vercel o `whop apps deploy`?
La CLI puede alojar la app (`whop apps deploy`, `whop apps logs`). **Plan por defecto: Vercel**, porque sabemos que sirve Expo web + funciones serverless. A las 10:45, revisa `whop apps deploy --help`: si soporta nuestro stack, alojar en Whop suma puntos con los jueces de Whop. Decídelo en 10 minutos como máximo y no cambies después.

## 3. Productos y planes

| Producto | Plan | Uso |
|---|---|---|
| **PACTA Stake** | Pago único con precio **dinámico** por pacto ($1–$20) | El depósito del pacto |
| **High-Yield Pass** | Recurrente, $9/mes | Nivel premium (recuperación del 100% + rendimiento) |

Opciones para el stake con importe variable (elige una):
- **A (preferida):** crear una *checkout configuration* por pacto con el importe concreto y `metadata.pact_id`. Así el webhook nos dice exactamente qué pacto se ha pagado. **[verificar]** si una checkout configuration acepta un plan en línea con precio y metadata.
- **B (respaldo):** planes fijos de $1, $5, $10 y $20 creados con antelación. El pacto guarda el `plan_id` y se asocia al pago por usuario + plan + hora.

Comandos de referencia:

```bash
whop products create --help
whop plans create --help
whop checkout-configurations create --plan_id plan_xxx --format json
```

## 4. Flujo de pago del pacto

```
App ──POST /api/pacts──► servidor crea el pacto (DRAFT) y la checkout configuration en Whop (metadata.pact_id)
    ◄── devuelve checkout_url ── pacto → AWAITING_PAYMENT
App abre checkout_url (en la web: dentro del iframe/modal de Whop; en el móvil: expo-web-browser)
Whop ──webhook payment.succeeded──► /api/webhooks/whop
    → verificar la firma → idempotencia → leer metadata.pact_id → guardar whop_payment_id → pacto ACTIVE
```

## 5. Webhooks

- Registrar `https://pacta.vercel.app/api/webhooks/whop` en el dashboard o con `whop webhooks create --help`.
- Eventos: `payment.succeeded`, `payment.failed`, `membership.activated` / `membership.deactivated` (para el High-Yield Pass), `refund.*` si existe. **[verificar]** los nombres exactos.
- Guardar `WHOP_WEBHOOK_SECRET` y verificar la firma en cada petición.
- Responder **200 rápido** y procesar dentro de la misma función (los tiempos del hackathon lo permiten).

## 6. Resultado del pacto → dinero

| Resultado | Acción en Whop | Acción en la base de datos |
|---|---|---|
| APPROVED (IA o jurado) | **Reembolso** del `whop_payment_id` (`whop refunds create` / SDK) **[verificar]** | `REFUNDED`, Trust +15/+20 |
| FAILED | Nada: el dinero ya está en el balance de la empresa | `vault_ledger` lock, Trust −30/−50 |
| Rescate del Vault | Ver la sección 7 | `vault_ledger` unlock (+ fee del 10% si es Free) |

> **Comisiones al reembolsar [verificar]:** comprueba si Whop devuelve su comisión de procesamiento cuando se reembolsa un pago. Si no la devuelve, con un stake de $1 la comisión se come una parte del reembolso y "si cumples se te devuelve todo" deja de ser cierto. En ese caso, decide si PACTA absorbe la comisión o si se fija un stake mínimo más alto.

## 7. Rescate del Vault: riesgo técnico importante

Un reembolso normalmente solo es posible dentro de una **ventana de tiempo** y por un importe ≤ al pago original. Un rescate puede llegar días después y sumar varios pagos. Opciones en orden de preferencia (**[verificar] las tres el primer día**):

1. **Reembolso parcial** de los pagos originales fallados (si siguen dentro de la ventana). Es lo más limpio.
2. **Transferencia** al usuario (`whop transfers --help`) hacia su balance de Whop.
3. **Crédito**: un promo code del 100% (`whop promo-codes create`) para sus próximos pactos o para el High-Yield Pass. No devuelve dinero en efectivo, pero se entiende muy bien en la demo.

Para la demo basta con que **un** rescate funcione de verdad en vivo; el resto puede mostrarse con el ledger.

## 8. High-Yield Pass
- El webhook `membership.activated` → `users.tier = 'high_yield'`; `deactivated` → `free`.
- Sirve además como prueba de "monetización recurrente en Whop" para los jueces.

## 9. Variables de entorno de Whop

```
WHOP_API_KEY=            # solo servidor
WHOP_APP_ID=
WHOP_COMPANY_ID=
WHOP_WEBHOOK_SECRET=     # solo servidor
WHOP_STAKE_PRODUCT_ID=
WHOP_PASS_PLAN_ID=
```

## 10. Limpieza después de la demo
```bash
whop payments list --format json     # localizar los pagos de prueba
whop refunds create --help           # reembolsar los que queden
```
