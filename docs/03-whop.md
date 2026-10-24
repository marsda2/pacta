# 03 · Conectar Whop

> ⚠️ **La CLI y la API de Whop no tienen sandbox ni modo de prueba.** Todo lo que se cree (productos, pagos, reembolsos) es real. El stake mínimo es **$5** (ver sección 6). Para la demo: pactos de $5 y reembolsarlos todos al terminar.

Los puntos marcados **[verificar]** siguen pendientes. Los demás se comprobaron el 2026-10-24 con `whop <grupo> --help` y con la documentación de https://docs.whop.com (índice: https://docs.whop.com/llms.txt).

## 1. CLI (ya instalada: v0.28.0)

```bash
whop login                 # OAuth en el navegador (ya hecho)
whop quickstart            # crear o elegir el negocio sobre el que actúa la CLI (ya hecho: biz_3luEKKKfUOfpk8, "pacta")
whop auth account          # ver o cambiar el negocio predeterminado
whop auth status           # comprobar el perfil activo
whop --help                # ver todos los grupos de comandos
```

## 2. Crear la app de Whop

1. Dashboard de Whop → **Developer** → crear una app "PACTA".
2. Anotar: `WHOP_APP_ID`, `WHOP_COMPANY_ID` (`biz_3luEKKKfUOfpk8`) y crear una **API key** con los permisos mínimos: productos, variantes, checkout, pagos, reembolsos, webhooks y memberships. Lee https://docs.whop.com/developer/guides/auth-scoping.md antes de dar la key al agente.
3. Configurar la **URL de la experiencia/iframe** de la app → `https://pacta.vercel.app` (la URL de Vercel). Así PACTA se abre dentro de Whop. **[verificar]** el nombre exacto del campo en la configuración de la app.
4. Dentro del iframe, Whop envía un token del usuario en una cabecera; el servidor lo verifica con el SDK y obtiene el `whop_user_id`. Esa es nuestra autenticación: no hace falta un login propio. **[verificar]** el nombre de la cabecera del token de usuario y de la función de verificación (distinto del webhook, ver sección 5).

### ¿Vercel o `whop apps deploy`?
La CLI puede alojar la app (`whop apps deploy`, `whop apps logs`). **Plan por defecto: Vercel**, porque sabemos que sirve Expo web + funciones serverless. A las 10:45, revisa `whop apps deploy --help`: si soporta nuestro stack, alojar en Whop suma puntos con los jueces de Whop. Decídelo en 10 minutos como máximo y no cambies después.

## 3. Productos y planes

En la CLI actual no existe el grupo `plans`: los planes son **variants** de un producto y se crean inline al crear el checkout.

| Producto | Plan | Uso |
|---|---|---|
| **PACTA Stake** | Pago único con precio **dinámico** por pacto ($5–$20) | El depósito del pacto |
| **High-Yield Pass** | Recurrente, $9/mes | Nivel premium (recuperación del 100% + rendimiento) |

Opciones para el stake con importe variable (elige una):
- **A (preferida):** crear una *checkout configuration* por pacto con `--plan` (precio, moneda y `metadata`) y `metadata.pact_id`. **Verificado:** `whop checkout-configurations create` acepta `--plan` inline y `--metadata`, y la doc dice que el metadata se copia a los pagos.
- **B (respaldo):** variants fijos de $5, $10 y $20 creados con antelación (`whop variants create --help`). El pacto guarda el `plan_id` y se asocia al pago por usuario + plan + hora.

Comandos de referencia:

```bash
whop products create --help
whop variants create --help
whop checkout-configurations create --help
whop checkout-configurations create --plan_id plan_xxx --metadata '{"pact_id":"..."}' --format json
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

- **Dónde:** https://whop.com/dashboard/developer → *Create webhook*. Mismo resultado con `whop webhooks create --url ... --events ...`.
- **URL a registrar:** `https://pacta-theta.vercel.app/api/webhooks/whop` (producción actual; `pacta.vercel.app` está ocupado). Whop rechaza `localhost` y redes privadas.
- **Crear el webhook solo cuando el endpoint esté desplegado.** La doc no dice que Whop pruebe la URL al crear el webhook; el envío de prueba es manual (`whop webhooks test`). Si el endpoint no existe, los eventos fallan y Whop los reintenta.
- Tras crearlo, copiar el **Secret** (`ws_…`) a `WHOP_WEBHOOK_SECRET` en `.env.local` y en Vercel. La API lo muestra una sola vez.
- Eventos (verificados en `whop webhooks create --schema`): `payment.succeeded`, `payment.failed`, `payment.pending`, `payment.requires_action`, `refund.created`, `refund.updated`, `membership.activated` y `membership.deactivated` (High-Yield Pass).
- **Firma (verificada en la doc):** cabeceras `webhook-id`, `webhook-timestamp` y `webhook-signature` (`v1,<firma>`). HMAC-SHA256 con el secreto `ws_…`, que solo se muestra una vez al crear el webhook. Se guarda como `WHOP_WEBHOOK_SECRET`, sin base64. Para verificar usa `unwrapWebhook` de `@whop/sdk/helpers` (ya está en `package.json`); rechaza timestamps de más de 5 minutos.
- Responder **200 rápido** y procesar dentro de la misma función (los tiempos del hackathon lo permiten).

## 6. Resultado del pacto → dinero

| Resultado | Acción en Whop | Acción en la base de datos |
|---|---|---|
| APPROVED (IA o jurado) | **Reembolso** con `whop payments refund pay_xxx` (opcional `--partial_amount`; el SDK equivalente) | `REFUNDED`, Trust +15/+20 |
| FAILED | Nada: el dinero ya está en el balance de la empresa | `vault_ledger` lock, Trust −30/−50 |
| Rescate del Vault | Ver la sección 7 | `vault_ledger` unlock (+ fee del 10% si es Free) |

> **Comisión al reembolsar (verificado 2026-10-24):** Whop **no devuelve** la comisión de procesamiento. El reembolso devuelve el importe completo que pagó el cliente y no tiene coste extra, pero la comisión del cobro ya no se recupera. Las tarifas de tarjeta son 2,7 % + $0,30 (nacional), +1,5 % si la tarjeta es internacional y +1 % si hay conversión de divisa.
>
> | Stake | Comisión por pacto cumplido | Porcentaje |
> |---|---|---|
> | $1 | ≈ $0,33 | 33 % |
> | **$5 (mínimo)** | **≈ $0,44** | **≈ 8,7 %** |
> | $10 | ≈ $0,57 | ≈ 5,7 % |
>
> Subir el mínimo no evita la pérdida, la reduce en porcentaje. Se asume como coste de PACTA. Confirmar con `whop payments fees pay_xxx` tras el primer cobro real.

## 7. Rescate del Vault: riesgo técnico importante

Un reembolso normalmente solo es posible dentro de una **ventana de tiempo** y por un importe ≤ al pago original. La ventana **no está documentada** en la doc de reembolsos: comprobarla **[verificar]**. Un rescate puede llegar días después y sumar varios pagos. Opciones en orden de preferencia (**[verificar] las tres el primer día**):

1. **Reembolso parcial** de los pagos originales fallados (si siguen dentro de la ventana). Es lo más limpio. Los reembolsos parciales están permitidos.
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
WHOP_COMPANY_ID=         # biz_3luEKKKfUOfpk8
WHOP_WEBHOOK_SECRET=     # solo servidor, ws_…
WHOP_STAKE_PRODUCT_ID=
WHOP_PASS_PLAN_ID=
```

## 10. Limpieza después de la demo
```bash
whop payments list --format json     # localizar los pagos de prueba
whop payments refund pay_xxx         # reembolsar los que queden (uno por uno)
```
