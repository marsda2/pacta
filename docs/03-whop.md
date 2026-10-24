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
3. En la sección **Hosting** de la app (verificado en la doc *App Views*): base URL `https://pacta-theta.vercel.app` y *Experience view* con la ruta `/experiences/[experienceId]`. Esa ruta existe en la app (`app/experiences/[experienceId].tsx`) y lleva al onboarding o a Home. Así PACTA se abre dentro de Whop.
4. Dentro del iframe, Whop envía el JWT del usuario en la cabecera **`x-whop-user-token`**, solo en peticiones al mismo origen (por eso la web publicada llama a la API con rutas relativas, `lib/api/client.ts`). **`@whop/sdk` 2.x ya no trae `verifyUserToken`**, así que `lib/server/identity.ts` lo verifica como los SDK oficiales de Python y Ruby: ES256 con las claves de `https://api.whop.com/.well-known/jwks.json`, emisor `urn:whopcom:exp-proxy` y audiencia = `WHOP_APP_ID`. El `sub` es el `whop_user_id`. Sin cabecera (la URL de Vercel fuera de Whop) se usa el usuario de demo, salvo `WHOP_REQUIRE_USER_TOKEN=true`.
5. Pago dentro de Whop: `@whop/iframe` (`inAppPurchase({ planId, id })`) abre el modal de pago sin salir del iframe (`lib/whop.ts`). Necesita `EXPO_PUBLIC_WHOP_APP_ID`. Fuera de Whop se abre la página del checkout.

### ¿Vercel o `whop apps deploy`?
La CLI puede alojar la app (`whop apps deploy`, `whop apps logs`). **Plan por defecto: Vercel**, porque sabemos que sirve Expo web + funciones serverless. A las 10:45, revisa `whop apps deploy --help`: si soporta nuestro stack, alojar en Whop suma puntos con los jueces de Whop. Decídelo en 10 minutos como máximo y no cambies después.

## 3. Productos y planes

En la CLI actual no existe el grupo `plans`: los planes son **variants** de un producto y se crean inline al crear el checkout.

| Producto | Plan | Uso |
|---|---|---|
| **PACTA Stake** | Pago único con precio **dinámico** por pacto ($5–$20) | El depósito del pacto |
| **High-Yield Pass** (`prod_QdKfivmFTDf6L`, creado el 2026-10-24) | Recurrente, $9 cada 30 días, creado al vuelo en el checkout (`plan_type: renewal`; Whop exige un producto para los planes recurrentes) | Nivel premium (recuperación del 100% + rendimiento) |

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
- **Atajo:** `npm run whop:webhook` (`scripts/whop-webhook.ts`) lo crea con la API key de `.env.local` para `payment.succeeded`, `membership.activated` y `membership.deactivated`, guarda el secreto en `.env.local` y lo sube a Vercel sin mostrarlo. La CLI con sesión OAuth no puede: pide `whop login --api-key`.
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

**Implementado (opción 1):** `POST /api/vault/redeem` reparte el tramo entre los stakes fallados, del más antiguo al más reciente, y hace un reembolso parcial (`partial_amount`) de cada pago original. Si Whop rechaza uno (p. ej. fuera de plazo), se para y solo se registra lo devuelto. Los stakes sin pago (datos de demo) se registran en el ledger. La ventana de reembolso sigue **[verificar]** con un stake fallado real.

## 8. High-Yield Pass
- `POST /api/vault/pass` crea el checkout con `metadata.user_id`; Whop copia esa metadata a la membresía y a sus pagos.
- El webhook `membership.activated` (o el primer `payment.succeeded` del Pass) → `users.tier = 'high_yield'`; `deactivated` → `free`. Solo cuentan las membresías con `metadata.kind = 'high_yield_pass'`: un stake de pago único también crea una membresía.
- Sirve además como prueba de "monetización recurrente en Whop" para los jueces.

## 9. Variables de entorno de Whop

```
WHOP_API_KEY=            # solo servidor
WHOP_APP_ID=
WHOP_COMPANY_ID=         # biz_3luEKKKfUOfpk8
WHOP_WEBHOOK_SECRET=     # solo servidor, ws_…
WHOP_STAKE_PRODUCT_ID=   # opcional: el stake funciona sin producto
WHOP_PASS_PRODUCT_ID=    # prod_QdKfivmFTDf6L (High-Yield Pass)
WHOP_PASS_PLAN_ID=       # opcional: reutilizar un plan ya creado
EXPO_PUBLIC_WHOP_APP_ID= # el mismo app_… que WHOP_APP_ID, para el modal de pago del iframe
WHOP_REQUIRE_USER_TOKEN= # true = la API exige el token de Whop
```

## 10. Limpieza después de la demo
```bash
whop payments list --format json     # localizar los pagos de prueba
whop payments refund pay_xxx         # reembolsar los que queden (uno por uno)
```
