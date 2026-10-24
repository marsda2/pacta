# Cómo funciona PACTA

> Última revisión: **2026-10-24**. Estado de la carpeta `TestWhoop-main` (rama `main`, incluidos cambios locales). No describe como desplegado lo que solo está preparado aquí. El otro checkout, `TestWhoop`, contiene trabajo independiente de diseño, jurado y apelaciones.

## Entrada e identidad

- Sin sesión se muestra `/onboarding`, con Pax, explicación breve y **Continue with Whop** desde el primer paso. No se puede saltar a los pactos o al saldo sin entrar. En escritorio también se muestra esta bienvenida, en un marco de móvil.
- Fuera de Whop, el login usa OAuth de Whop con **PKCE S256**, `state` y `nonce`; el callback es `/auth/callback` en web y `pacta://auth/callback` en una compilación nativa. El intento vence en 10 minutos. Solo se admiten callbacks registrados.
- En web, las credenciales de sesión viven en `sessionStorage` (persisten al recargar esa pestaña); en iOS/Android, en **Expo SecureStore**. Las API keys de servidor nunca entran en la app. El refresh token de Whop rota: las peticiones simultáneas comparten una renovación.
- La API verifica el Bearer mediante `https://api.whop.com/oauth/userinfo`. Dentro del iframe conserva la verificación ES256 de `x-whop-user-token`. Ambos caminos usan el mismo `whop_user_id`, de modo que una cuenta mantiene sus pactos, saldo y Vault.
- El avatar abre `/profile`: identidad, saldo, explicación y **Sign out**. Al salir se quitan las credenciales locales y se solicita a Whop revocar el refresh token. Si no hay conexión, la salida local funciona igualmente; la revocación remota no queda confirmada. En iframe se cierra la sesión de PACTA, no la cuenta de la aplicación anfitriona de Whop.
- Al cambiar de cuenta se descarta toda la caché de React Query y el foco local. Pactos, saldo y Vault no se consultan antes del login.
- Sin credenciales, la API devuelve **401**. `ALLOW_DEMO_USER=true` permite el usuario sembrado solo en una API local; Vercel/production lo ignora y la UI sigue exigiendo login. El antiguo `WHOP_REQUIRE_USER_TOKEN` ya no controla el acceso.

## Pactos y dinero

| Opción | Comportamiento local implementado |
|---|---|
| Balance | Stake desde **$1**, hasta **$50**. Se retiene del saldo y se devuelve a ese saldo al cumplir. |
| Card | Stake desde **$5**, hasta **$50**, checkout de Whop. Se activa por webhook y se reembolsa al cumplir. |
| No money | Stake 0; solo se arriesga reputación. |
| Recarga | $10 / $20 / $50. El webhook firmado `payment.succeeded`, con `metadata.kind = wallet_topup`, abona el saldo una sola vez. |
| Fallo | El stake pasa al Vault y baja el Trust. |
| Rescate del Vault | Trust ≥ 70, 3 pactos verificados seguidos y sin bloqueo por trampa. Tramo de min($20, saldo); Free recibe el 90%, Pass el 100% más rendimiento **simulado**. La parte pagada con Balance vuelve al saldo; la de tarjeta se reembolsa al pago original. |

El dinero y los veredictos los decide siempre el servidor. Las constantes están en `lib/shared/rules.ts`. La verificación se escala con el stake: menos de $5 usa comprobación ligera (confianza ≥ 0,60, prueba pertinente y sin trampa); desde $5, regla estricta (≥ 0,88); si la IA duda con stake ≥ $20 interviene Terac. El rendimiento del Vault (4,85% APY) sigue siendo simulado.

## API y operación

La función existente `api/vault/[action].ts` agrupa Vault, saldo y autenticación para no añadir funciones a Vercel Hobby:

| Ruta | Método | Uso |
|---|---|---|
| `/api/vault/session` | GET | Perfil autenticado; 401 sin sesión. |
| `/api/vault/auth-start` | POST | Genera el intento y la URL de autorización para un `redirectUri` permitido. |
| `/api/vault/auth-exchange` | POST | Canje de código + verifier; comprueba nonce, audiencia, vencimiento y usuario. |
| `/api/vault/auth-refresh` | POST | Renueva credenciales. |
| `/api/vault/auth-logout` | POST | Revoca el refresh token. |
| `/api/vault/wallet` | GET | Saldo e historial de la cuenta. |
| `/api/vault/topup` | POST | Checkout de recarga. |
| `/api/vault/withdraw` | POST | Reembolso del saldo disponible a las recargas originales. |

`npm run whop:auth` configura la app existente como cliente OAuth **public**, con PKCE, y conserva los callbacks previos. No necesita client secret. Variables y callbacks extra: [.env.example](.env.example) y [docs/05](docs/05-infra-github-vercel-supabase.md). API local: `npm run dev:api` (puerto 3000 o `PORT`). Web: `npm run web`.

En este checkout, `.env.local` queda con `PORT=3200` y `EXPO_PUBLIC_API_URL=http://localhost:3200` para usar la API de esta tarea sin tocar los procesos anteriores de los puertos 3000/3100. No se cambiaron ni mostraron secretos.

## Estado comprobado el 2026-10-24

| Pieza | Evidencia / pendiente |
|---|---|
| Whop OAuth | Configuración **real** guardada y releída: app `app_3r1c2LEetOyasW`, cliente public, 6 callbacks (producción, nativo y localhost 8081/8082). Whop real acepta la autorización y devuelve 302 hacia su login. |
| API sin credenciales / token falso | API local devuelve 401; token falso comprobado contra Whop real. |
| Login, renovación y salida | `npm run check:auth`: **27 comprobaciones**, OAuth de Whop **simulado**, aislamiento de cuentas y pactos contra Postgres **real**, QA borrada al terminar, sin cobros. |
| App | Compilación web, typecheck y lint verificados. Falta login completo con consentimiento real, revisión visual y prueba en móvil. La revisión automática rechazó arrancar el servidor web de Expo («blocked by policy»). |
| Despliegue | Estos cambios de bienvenida, sesión y perfil **no se han desplegado en esta tarea**. También sigue pendiente confirmar el flujo de recarga/pago real y el webhook en producción. |
| Invitados | La pantalla de testigo heredada dependía del usuario demo; falta un enlace de invitación con autorización propia para completar revisiones sin cuenta con el nuevo acceso protegido. Los enlaces de jurado conservan su autorización existente. |

No se modificó el código de la otra rama, no se creó un commit ni se realizaron pagos o reembolsos reales en esta tarea.
