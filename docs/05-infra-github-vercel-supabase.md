# 05 · Infraestructura: GitHub, Vercel, Supabase

> Revisado el 2026-10-24 con lo desplegado. Visión de conjunto: [COMO-FUNCIONA.md](../COMO-FUNCIONA.md).

## ¿Por qué Vercel?
Necesitamos una URL HTTPS pública y estable para los **webhooks de Whop y de Terac**, para el **iframe de Whop**, para las **páginas de los jueces de Terac** (`task_url`) y para que cualquiera abra la demo. Las funciones serverless guardan las claves secretas fuera del cliente. Expo Go en el móvil sirve para la cámara en vivo; la web en Vercel sirve para todo lo demás.

## 1. GitHub
- Repo `marsda2/pacta` (público, verificado con GitHub el 2026-10-24). Cada push a `main` despliega en Vercel; las demás ramas generan *previews*.
- Se commitea `.env.example`, **nunca** `.env*` (`.gitignore`).
- Varias sesiones de Claude trabajan en paralelo (otra rama o worktree): antes de tocar `pact-engine.ts`, `rules.ts`, `types.ts` o el ROADMAP, mira `git log origin/main` para no pisar a nadie.

## 2. Vercel
- Proyecto `pacta`, producción en **https://pacta-theta.vercel.app** (`pacta.vercel.app` está ocupado: pendiente decidir dominio propio).
- Build: `npx expo export -p web` → `dist` (web exportada como SPA, `web.output: "single"`). Las funciones de `api/` se detectan solas.
- `vercel.json`: rewrite de todo lo que no sea `/api/*` a `index.html`; `maxDuration` de 30 s para `api/pacts/**` (la visión tarda unos segundos).
- **Límite del plan Hobby: 12 funciones.** Hoy hay 11 en `main`. Por eso las rutas comparten función: `api/vault/[action].ts`, `api/pacts/[id]/[action].ts` y `api/jury/round1.ts` (que sirve la cola de casos, no solo la ronda 1). Si añades otra ruta, júntala con una existente.
- `.vercelignore` deja fuera `eval` y `scripts` del despliegue.
- **Cuidado al desplegar:** `vercel deploy --prod` sube el *árbol de trabajo*, incluidos cambios sin commitear de cualquier rama, y **sustituye** producción. Si `main` ha avanzado, un despliegue desde otra rama retrocede producción. Lo seguro es desplegar desde un commit de `main` (push).
- Las variables de entorno se añaden con `vercel env add NOMBRE production --sensitive` (el valor por stdin) o desde el panel.

## 3. Supabase
- Proyecto compartido (TexhCo); PACTA vive aislada en el esquema **`pacta`**. El servidor se conecta con el rol `pacta_app` (solo ese esquema) por el pooler (puerto 6543, `DATABASE_URL`). RLS activado en todas las tablas.
- Migraciones en `supabase/migrations/` (se aplican con el conector de Supabase): `pacta_init`, `pacta_proofs_bucket`, `pacta_pacts_methods_images` (`proof_images`), `pacta_reputation_pacts` (stake ≥ 0), `pacta_appeal_evidence` y `pacta_vault_yield` (en `main`: `vault_ledger.type` admite `yield`).
- **Las fotos viven en Postgres** (`proof_images`, `appeal_evidence`), no en Storage: `proofs.storage_path = 'db:<id>'` y se sirven por `/api/proofs/:id/image`. El bucket privado `proofs` existe pero el código solo lo usa como respaldo (`signedProofUrl`).
- Identidad: JWT de Whop en iframe u OAuth public + PKCE fuera del iframe. Supabase solo almacena datos. Sin credenciales, 401; demo solo por opt-in local.

## 4. Variables de entorno
Plantilla en `.env.example`. En **negrita**, las que hoy están en Vercel (producción).

| Grupo | Variables |
|---|---|
| Cliente (públicas) | **`EXPO_PUBLIC_API_URL`**, **`EXPO_PUBLIC_SUPABASE_URL`**, **`EXPO_PUBLIC_SUPABASE_ANON_KEY`**, **`EXPO_PUBLIC_WHOP_APP_ID`** |
| Base de datos | **`DATABASE_URL`** (rol `pacta_app`), **`SUPABASE_SERVICE_ROLE_KEY`** |
| Whop | **`WHOP_API_KEY`**, **`WHOP_APP_ID`**, **`WHOP_COMPANY_ID`**, **`WHOP_PASS_PRODUCT_ID`**, `WHOP_WEBHOOK_SECRET` (pendiente: ver docs/09 paso 1), `WHOP_STAKE_PRODUCT_ID` y `WHOP_PASS_PLAN_ID` (opcionales), `WHOP_OAUTH_REDIRECT_URIS` (callbacks exactos extra), `WHOP_CLIENT_SECRET` (opcional para otra app confidential), `WITNESS_TOKEN_SECRET` (opcional; por defecto firma con la clave de Whop), `PUBLIC_APP_URL` |
| Agente de visión y Pax | **`GEMINI_API_KEY`**, `ANTHROPIC_API_KEY` (opcional), `AGENT_MODEL` (por defecto `gemini-3.6-flash`), `AGENT_PROMPT_VERSION` (`v1-baseline`), `COPILOT_MODEL` |
| Terac | **`TERAC_API_KEY`**, **`TERAC_WEBHOOK_SECRET`**, **`TERAC_ROUND1_OPPORTUNITY_ID`**, `TERAC_JURY_OPPORTUNITY_ID`, `TERAC_PROJECT_ID`, `APP_URL` |
| Política de revisión humana | `HUMAN_REVIEW_MIN_STAKE_CENTS` (defecto 2000), `FREE_APPEALS` (demo: apelar sin Pass ni fianza), `TERAC_AUTO_LAUNCH` (**`false`**: cada lote gasta saldo de Terac) |
| Otros | `DEMO_USER_ID`, `ALLOW_DEMO_USER=false` (ignorado en Vercel/production) |

Los secretos nunca llevan prefijo `EXPO_PUBLIC_`. Los scripts leen `.env.local` (git lo ignora): `npm run dev:api`, `seed`, `eval`, `seed:eval`, `batch:launch`.

## 5. Desarrollo local
- `npx expo start --web` abre la app; `/kit` es la galería de componentes. Sin sesión se muestra la bienvenida con Whop; `/landing` conserva el marketing y su botón abre la app con la misma protección.
- `npm run dev:api` levanta `api/*` en `http://localhost:3000` (o `PORT`, 3200 en este checkout) con `.env.local` (reproduce el enrutado de Vercel). Para webhooks reales usa la URL de Vercel en lugar de un túnel.
- Comprobaciones: `npm run typecheck` y `npm run lint`.

## 6. Checklist de conexión
- [x] Repo en GitHub conectado a Vercel; build en verde
- [ ] Dominio fijo (hoy `pacta-theta.vercel.app`)
- [x] Proyecto de Supabase + migraciones (esquema `pacta`, rol `pacta_app`)
- [x] App de Whop creada y API key; checkout por pacto y High-Yield Pass
- [ ] Webhook de Whop en producción con su secreto guardado (`npm run whop:webhook -- --replace`) y un pago real de $5 de punta a punta
- [ ] Instalar la app en Whop (Hosting: base URL y `/experiences/[experienceId]`) y comprobar el token y el modal de pago
- [x] Terac: API key, webhook confirmado (firma verificada con un ping real), estudio de la ronda 1 lanzado
- [ ] Un voto real de un juez de Terac de punta a punta (esperando a la ronda 1)
- [x] Gemini: llamada de visión de prueba y evaluación (`npm run eval`)
- [ ] Decidir cuándo activar `TERAC_AUTO_LAUNCH` (y añadir `TERAC_PROJECT_ID` y `APP_URL` en Vercel)

### Login y validación de la integración

`npm run whop:auth` registra callbacks de producción, `pacta://auth/callback` y localhost/127.0.0.1 en 8081/8082. El cliente Whop es public con PKCE y no requiere un secreto nuevo. Para OAuth nativo se usa un development build con scheme `pacta` y SecureStore. En web se conserva la sesión al recargar la pestaña con sessionStorage; en nativo se usa SecureStore.

`npm run check:auth` y `npm run check:release` comprueban login, aislamiento de usuarios y el dinero de la integración. Los testigos usan invitaciones firmadas de 48 h; las rutas de invitados comparten la función de pactos existente. La API rechaza simulaciones de veredictos en producción.
