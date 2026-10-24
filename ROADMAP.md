# ROADMAP · PACTA

> Documento vivo. Se actualiza al cerrar cada fase o tarea relevante. Última actualización: **2026-10-24**.
> Leyenda: ✅ hecho · 🟡 en curso o parcial · ⬜ pendiente · ⛔ bloqueado.
> El plan de producto y de ejecución del hackathon está en [docs/](docs/) (ver [06-plan-8h-y-demo.md](docs/06-plan-8h-y-demo.md)). Este archivo sigue el avance real.

## Resumen

| Fase | Qué | Estado |
|---|---|---|
| 0 | Entorno e infraestructura | ✅ |
| 1 | Sistema de diseño y companion Pax | ✅ (falta comparar con el kit final) |
| 2 | Pantallas y flujos con datos de prueba | 🟡 |
| 3 | API y datos reales (Supabase) | ✅ |
| 4 | Pagos con Whop | 🟡 (código y pruebas listos; faltan webhook en producción y un pago real) |
| 5 | Agente auditor + jurado Terac + antes/después | 🟡 |
| 6 | Copilot con IA y Pax reactivo | ⬜ |
| 7 | Vault y Trust Score reales | ✅ (falta la micro-tarea de clemencia) |
| 8 | Embeber en Whop, datos de demo y pulido | 🟡 (app y OAuth configurados; integración preparada, faltan consentimiento real y pruebas móviles) |
| 9 | Demo y entrega | 🟡 (guion y checklist en docs/09) |
| Extra | Pact Circles (opcional, solo si el flujo central es estable) | ⬜ |

## Fase 0 · Entorno e infraestructura ✅

- ✅ Expo SDK 58 + expo-router + TypeScript, web en modo `static`.
- ✅ Repo privado en GitHub (`marsda2/pacta`), conectado a Vercel (cada push a `main` despliega).
- ✅ Vercel: proyecto `pacta`, producción en https://pacta-theta.vercel.app, función `/api/health`.
- ✅ Supabase (proyecto TexhCo): esquema aislado `pacta` con las 9 tablas de [docs/02](docs/02-arquitectura.md), RLS activado, bucket privado `proofs`.
- ✅ Rol `pacta_app` (solo esquema `pacta`) y `DATABASE_URL` en Vercel como secreto.
- ✅ Variables públicas `EXPO_PUBLIC_*` en Vercel.
- ⬜ Dominio fijo `pacta.vercel.app` (ocupado; decidir dominio propio o actualizar los docs).

## Fase 1 · Sistema de diseño ✅

Tokens, iconos y componentes portados del *UI Component Library* y de *Windows & Flows* a React Native (web y móvil con un solo código). Los ejemplos en React + Tailwind del diseño se usaron como referencia visual, no como código.

- ✅ Tokens: `lib/theme/tokens.ts` (paleta bosque/menta/aqua/ámbar, radios, sombras, tipografía).
- ✅ Iconos: `components/ui/Icon.tsx` (lucide, nombres del kit: Pact, Timer, Focus, Camera, Witness, Copilot…).
- ✅ Base: `Text`, `Button` (primary, mint, outline, link, disabled), `Card`/`GlassCard`, `TextField`, `SelectField`, `Checkbox`, `Segmented` (tabs y tarjetas), `StakeStepper`/`StakeChips`, `StatusBadge`, `Banner`, `ProgressBar`, `StepTracker`, `UploadDropzone`.
- ✅ Dominio: `PactCard`, `FocusSessionCard` (modo oscuro con regla ámbar), `PactResultCard`, `ProofMethodPicker`, `LiveCapture` (expo-camera, sin galería; modo demo si no hay cámara).
- ✅ Copilot: `CopilotCard`, `CopilotPlanner`.
- ✅ Navegación: `AppHeader`, `BottomTabBar` flotante.
- ✅ **Pax**, el companion: SVG portado a `react-native-svg` con expresiones (`idle`, `happy`, `talking`, `worried`, `sleeping`), saludo, parpadeo y respeto a "reducir movimiento". `PaxSays` (con globo de texto).
- ✅ Galería de componentes en la ruta `/kit`.
- ✅ Pax se presenta en su pestaña como una conversación: "Hey, I’m Pax…" → puntos de "escribiendo" → "Tell me what’s in the way…" (`PaxSays` acepta un array de mensajes).
- ✅ Landing de escritorio con QR construida anteriormente. **Cambio local del 2026-10-24:** la entrada del escritorio ahora muestra la bienvenida con Whop y la app en marco de móvil; los componentes de la landing se conservan.
- 🟡 Logo: `PactaMark` es una marca provisional; falta el SVG oficial.
- ⬜ Tipografía final (el kit parece una sans geométrica; ahora se usa la del sistema).
- ⬜ Modo oscuro completo (por ahora `userInterfaceStyle: light`; solo Focus es oscuro).

## Fase 2 · Pantallas y flujos 🟡

Los seis flujos de *Windows & Flows* están construidos. Empezaron con un store en memoria y desde la fase 3 usan la API (`lib/store/pacts.tsx`).

- ✅ 01 Crear pacto → `app/pact/new.tsx`
- ✅ 02 Pacto activo (cuenta atrás, pasos, "I'm stuck") → `app/pact/[id]/index.tsx`
- ✅ 03 Prueba en vivo → `app/pact/[id]/proof.tsx`
- ✅ 04 Copilot → `app/(tabs)/copilot.tsx`
- ✅ 05 Revisión de testigo (invitado, sin cuenta) → `app/witness/[id].tsx`
- ✅ 06 Resultado (cumplido / fallado) → `app/pact/[id]/result.tsx`
- ✅ Pestañas: Home, Pacts (Today/Upcoming/Completed), Copilot, Progress.
- ✅ **Local, 2026-10-24:** bienvenida sin sesión con acceso por Whop desde el primer paso; avatar → perfil → cerrar sesión. Rutas de cuenta protegidas y caché descartada al cambiar de usuario. También en escritorio. Pendientes despliegue, revisión visual y login completo real.
- ✅ Verificado en el navegador (ancho móvil): crear pacto → pacto activo → prueba (modo demo) → revisión → testigo → "Pact kept". Typecheck limpio y `expo export -p web` genera las 16 rutas.
- 🟡 Revisión visual en móvil real (Expo Go) y en distintos anchos. La cámara real solo se ha probado hasta el estado "sin cámara" (modo demo).
- ✅ Enlaces directos en Vercel verificados en https://pacta-theta.vercel.app (`/kit`, `/pacts`, `/pact/new`, `/pact/<id>`, `/pact/<id>/proof`, `/witness/<id>`, `/api/health`). La web se exporta como SPA (`web.output: "single"`): con pre-renderizado, Vercel servía el HTML de la home en los enlaces directos y React lanzaba el error de hidratación #418.
- ⬜ Estados vacíos y de error más pulidos; accesibilidad (lector de pantalla, foco).

## Fase 3 · API y datos reales ✅

La app ya lee y escribe en Supabase (esquema `pacta`) a través de `/api/*`.

- ✅ Cliente Postgres `lib/server/db.ts` (`pg` + `DATABASE_URL`) con `query` y `withTransaction`.
- ✅ `lib/server/pact-engine.ts`: crear pacto, subir prueba y veredicto en transacciones con bloqueo de fila; vencimiento perezoso de pactos sin prueba.
- ✅ Rutas: `GET/POST /api/pacts`, `GET /api/pacts/:id`, `POST /api/pacts/:id/proof`, `POST /api/pacts/:id/resolve`, `GET /api/proofs/:id/image`. Validación de entrada (título, stake, fecha límite, tipo real de imagen por sus primeros bytes, 1,5 MB máx.).
- ✅ Proyección de la máquina de estados del servidor a los cinco estados de la UI (`toDto`).
- ✅ Store en el cliente con React Query (`lib/store/pacts.tsx`): estados de carga y error, mutaciones, foto reducida a 1024 px antes de subirla. La sesión de foco sigue siendo local al dispositivo.
- ✅ Identidad local actual: OAuth de Whop o JWT del iframe verificados; sin credenciales → 401. Demo solo con `ALLOW_DEMO_USER=true` en API local, nunca en Vercel/production. Detalle en [COMO-FUNCIONA](COMO-FUNCIONA.md).
- ✅ Migración `pacta_pacts_methods_images`: `pacts.proof_methods` y tabla `proof_images`.
- ✅ Servidor de desarrollo de la API: `npm run dev:api` (puerto 3000, lee `.env.local`). Datos de demo: `npm run seed`.
- ✅ Verificado: 24 comprobaciones de la API contra la base real (altas, validaciones, 409 en transiciones inválidas, imagen servida, CORS, Trust y Vault) y el flujo completo en el navegador: el pacto creado desde la UI quedó `REFUNDED` en Postgres con su `trust_event`. Typecheck y lint limpios.
- 🟡 Fotos en Postgres (`proof_images`) en vez del bucket `proofs`: falta `SUPABASE_SERVICE_ROLE_KEY` para firmar URLs de Storage. `proofs.storage_path` vale `db:<proof_id>`; el jurado (`api/jury/[id].ts`) usa `signedProofUrl` y hay que adaptarlo a esa ruta o mover las fotos a Storage cuando exista la clave.
- ✅ Desplegado en Vercel (`8e16177`) y verificado en producción: las 24 comprobaciones de la API pasan contra https://pacta-theta.vercel.app, Home y un enlace directo `/pact/<uuid>` cargan datos reales sin errores de consola.

## Fase 4 · Pagos con Whop 🟡

- ✅ **Código local del saldo:** recargas $10/$20/$50, abono idempotente por webhook, pactos con Balance desde $1, devolución al saldo al cumplir y rescate del Vault hacia el origen correcto. Selector Balance / Card / No money, saldo en Home y `/wallet`. Pendiente desplegar y comprobar una recarga real.

- ✅ Cuenta de negocio `pacta` en Whop (`biz_3luEKKKfUOfpk8`) creada con `whop quickstart`; CLI con sesión OAuth.
- ✅ Verificado con el CLI y la doc: checkout con `--plan` y `metadata`, eventos del webhook, firma (`webhook-signature`, `unwrapWebhook` de `@whop/sdk`), reembolso con `whop payments refund`.
- ✅ Stake mínimo fijado en **$5**: Whop no devuelve su comisión (2,7 % + $0,30) al reembolsar, así que con $1 cada pacto cumplido costaba ≈ 33 %. Ver [docs/03](docs/03-whop.md) sección 6.
- ✅ URL del iframe y token de usuario verificados en la doc (pasan a la fase 8). La ventana de reembolso sigue sin documentar: se verá con el primer stake fallado real.
- ✅ `WHOP_API_KEY` y `WHOP_COMPANY_ID` en `.env.local` y en Vercel (production).
- ✅ Checkout por pacto en `POST /api/pacts`: el pacto nace AWAITING_PAYMENT y la respuesta trae `checkout` (`url`, `checkoutId`, `planId`). Botón "Pay stake" para reintentar un pacto sin pagar (`POST /api/pacts/:id/checkout`). Verificado contra Whop: checkout de $5 creado con su plan.
- ✅ `POST /api/webhooks/whop`: firma, idempotencia en `webhook_events`, `payment.succeeded` → ACTIVE. Probado en local con eventos firmados (pago, duplicado, firma falsa → 401).
- ✅ Reembolso al aprobar (IA, testigo o jurado) con `payments.refund`; stake al Vault al fallar.
- ✅ **High-Yield Pass**: producto `prod_QdKfivmFTDf6L` en Whop y plan recurrente de $9 cada 30 días creado al vuelo (Whop exige producto para los planes recurrentes). `POST /api/vault/pass` → checkout con `metadata.user_id`; el webhook sube o baja el nivel con `membership.activated` / `membership.deactivated` (y el primer pago del Pass). Las membresías de un stake se ignoran. Probado en local con eventos firmados.
- ⬜ **Webhook en producción**: hay uno creado a las 15:08 (`hook_M5C8XZ9HjmaQq`, todos los eventos) cuyo secreto no se guardó, así que producción responde 401 a Whop y ningún pacto pagado se activa. `npm run whop:webhook -- --replace` lo sustituye, sube `WHOP_WEBHOOK_SECRET` a Vercel sin mostrarlo y redespliega.
- ✅ App de Whop `app_3r1c2LEetOyasW`: `WHOP_APP_ID` y `EXPO_PUBLIC_WHOP_APP_ID` en Vercel (production).
- ⬜ Un pago real de $5 de punta a punta (pago → webhook → ACTIVE → prueba → reembolso) y reembolsar al terminar. Lo hace una persona con su tarjeta (ver [docs/09 §1](docs/09-demo-y-entrega.md)).

## Fase 5 · Agente auditor y jurado Terac 🟡

Cómo funciona todo junto: [COMO-FUNCIONA.md](COMO-FUNCIONA.md). Detalle y precios de Terac: [docs/04](docs/04-agente-terac.md).

- ✅ Agente de visión `lib/server/vision-agent.ts` con Gemini 3.6 Flash (y Claude, por `AGENT_MODEL`), prompts versionados en `agent_prompts` (`v1-baseline` sembrado), reintentos ante 429/5xx.
- ✅ Regla de aprobación en `pact-engine` (confianza ≥ 0.88, sin señales de trampa, no "agobiado"). Probada con la IA real: foto buena → reembolso; foto dudosa → política de abajo.
- ✅ Política de revisión humana por stake ([docs/04 §4](docs/04-agente-terac.md)): segunda prueba, testigo, apelación, caducidad a las 48 h hacia el Vault y jurado de Terac solo con stake alto (≥ `HUMAN_REVIEW_MIN_STAKE_CENTS`, hoy $20). 12 comprobaciones contra la base de datos.
- ✅ Apelación con fianza: desde $15, fianza de $7.50 que sale del stake retenido, panel de 3 jueces, hasta 2 fotos extra y una nota, ventana de 48 h. Pantalla `app/pact/[id]/appeal.tsx`. Ganar → reembolso entero; perder → al Vault menos la fianza (`vault_ledger` tipo `fee`). Con el Pass no hay fianza. 16 comprobaciones contra la base de datos y probada en producción.
- ✅ Lotes de apelaciones: `launchBatch` agrupa 3–5 apelaciones (o 2 tras 24 h, o 1 tras 48 h) en **un** estudio de Terac con el panel de 3 jueces; cada juez vota todos los casos en `/jury/queue`. `npm run batch:launch` (simulación gratis) y `-- --launch`. **Lanzamiento automático apagado** (`TERAC_AUTO_LAUNCH`) porque cada lote gasta saldo. 11 comprobaciones, incluido un borrador real de Terac.
- ✅ Jurado de Terac: `api/jury/[id]`, cola genérica en `api/jury/round1.ts`, `api/webhooks/terac` (firma verificada con un ping real), cierre del caso con Trust y Vault, pago al juez solo si dejó su voto.
- ✅ Precios de Terac medidos con borradores gratuitos: mínimo $5 de incentivo por estudio, +50 % de comisión, **$4.50 por juez** de 1 a 3 min y no admite 1 solo juez desde la API. Ver [docs/04 §2](docs/04-agente-terac.md).
- ✅ Set de evaluación de 12 fotos etiquetadas (`eval/`), `npm run eval` por modelo y prompt. `v1-baseline` con Gemini: 83 % (10/12), falla la trampa del código digital.
- 🟡 Ronda 1 en Terac lanzada el 2026-10-24 desde el panel ($16.50: $11 de incentivo + 50 %; 1 experto, 12 fotos): esperando el voto. Saldo de Terac: $83.50.
- ⬜ `POST /api/admin/calibrate` → `v2-terac` y tabla antes/después con números reales, y su pantalla para los jueces.
- ⬜ Fotos reales con el móvil para sustituir las generadas con IA (el modelo las marca por ser sintéticas).
- ⬜ Probar un lote con jueces reales; meter en la cola los casos de stake alto sin apelación; decidir cuándo activar `TERAC_AUTO_LAUNCH`.
- ⬜ Micro-tarea de clemencia (veredicto `MICRO_TASK`).

## Fase 6 · Copilot con IA y Pax reactivo 🟡

- ✅ Micro-pasos generados por Gemini a partir del bloqueo ("Too big", "Distracted", "Need clarity"): `POST /api/copilot/steps` (`lib/server/copilot-agent.ts`, modelo `COPILOT_MODEL` o `AGENT_MODEL`). La app usa pasos de respaldo si Gemini falla.
- ⬜ Pax cambia de expresión según el estado real (preocupado cerca de la fecha límite, contento al cumplir, dormido sin pactos). Ya se pone preocupado en la pantalla de duda de la IA.

## Fase 7 · Vault y Trust Score reales ✅

- ✅ El motor escribe `trust_events` y `vault_ledger` (fallo: −30 de Trust y stake al Vault; cumplido: +15 y racha). El Trust y el Vault de Home y Progress salen del servidor.
- ✅ Trampa confirmada por el jurado: −50 y bloqueo de retiros 7 días (`closeJuryTask`); el rescate lo respeta.
- ✅ Rendimiento simulado (4.85 % APY) calculado sobre el ledger (`lib/shared/vault.ts`): APY × ∫ saldo dt, con el saldo constante entre movimientos. Se muestra siempre como "simulado".
- ✅ Desbloqueo por tramos (`POST /api/vault/redeem`, `lib/server/vault.ts`): Trust ≥ 70, 3 pactos verificados seguidos desde el último fallo o rescate y sin bloqueo → tramo de min($20, saldo). Free recupera el 90 % (10 % de comisión, `fee`); el Pass, el 100 % más el rendimiento del tramo (`yield`, migración `pacta_vault_yield`). El dinero vuelve con reembolsos parciales de los stakes fallados; los stakes sin pago solo se registran.
- ✅ Pantalla del Vault (`/vault`): saldo, rendimiento, progreso del tramo, botón de rescate, Free frente a Pass e historial. Tarjeta del Vault en Home y Progress con "te faltan N pactos y M puntos".
- ✅ Verificado contra la base real con un usuario QA (borrado después): 17 comprobaciones (bloqueo antes de tiempo, rescate Free $18 + $2, racha nueva por tramo, doble rescate rechazado, Pass al 100 % con rendimiento, bloqueo por trampa) y en el navegador (Home → Vault).
- ⬜ Micro-tarea de clemencia (+5): depende del veredicto `MICRO_TASK` del jurado (fase 5).

## Fase 8 · Embeber en Whop y pulido 🟡

- ✅ **Configuración real Whop (2026-10-24):** OAuth public + PKCE con 6 callbacks guardados y releídos mediante `npm run whop:auth`. Sin client secret nuevo; autorización real responde 302 hacia el login de Whop.
- ✅ **Código local:** OAuth fuera de Whop, perfil y salida, state/nonce, renovación de tokens, SecureStore nativo / sessionStorage web, protección de rutas y separación de caché por cuenta. 27 comprobaciones con OAuth simulado y Postgres real; cuentas QA borradas. Typecheck, lint y export web pasan.
- ⬜ Desplegar bienvenida/sesión/perfil y completar login con consentimiento real; comprobar móvil. Arranque de Expo web rechazado por la revisión automática («blocked by policy»), por lo que no hay verificación visual de estos cambios en esta tarea.
- ✅ Testigo invitado con enlace firmado para una prueba, caducidad de 48 h, invalidación al repetir prueba y resolución atómica sin doble devolución. Veredictos de simulación deshabilitados en producción.

- ✅ Identidad de Whop (`lib/server/identity.ts`): verifica `x-whop-user-token` (ES256 con JWKS de Whop, emisor y audiencia) u OAuth Bearer. Cada usuario de Whop tiene su fila en `users`; sin credenciales, 401 (demo solo con opt-in local). Pactos y Vault usan esa identidad. La verificación del JWT tenía pruebas previas; la de OAuth tiene los 27 checks descritos arriba.
- ✅ La web publicada llama a la API con rutas relativas, así el iframe de Whop adjunta el token.
- ✅ Entrada `/experiences/[experienceId]`: al onboarding si el usuario no tiene pactos, a Home si los tiene. Dentro del iframe nunca sale la landing de escritorio (verificado con un iframe de 1200 px).
- ✅ Pago dentro de Whop con `@whop/iframe` (`inAppPurchase`) para el stake y el Pass; fuera de Whop, la página del checkout.
- ✅ Datos de demo (`npm run seed`, o `npm run seed -- user_XXXX` para una cuenta de Whop): dos semanas de historial, Trust 55, racha 2 y $60 en el Vault; un pacto cumplido en directo desbloquea el primer tramo.
- ✅ Pacto de ejemplo sin dinero (stake 0, solo arriesga reputación y no pasa por Whop) para el onboarding y la demo (migración `pacta_reputation_pacts`).
- ⬜ Crear la app en el dashboard de Whop (Hosting: base URL y *Experience view* `/experiences/[experienceId]`), instalarla en `pacta` y poner `WHOP_APP_ID` y `EXPO_PUBLIC_WHOP_APP_ID` en Vercel.
- ⬜ Comprobar dentro de Whop que llega el token y que el modal de pago se abre.
- ⬜ Pase de pulido: rendimiento, textos, estados de carga.

## Fase 9 · Demo y entrega 🟡

- ✅ Pasos manuales previos, guion de 2 minutos con plan B, lista de planos del vídeo y entrega en [docs/09](docs/09-demo-y-entrega.md).
- ⬜ Tres ensayos cronometrados y grabar el vídeo de respaldo.
- ✅ Vídeo animado de pitch de **2 minutos en inglés**, con Remotion, voz/música/efectos de ElevenLabs y arquitectura contrastada con el código y los docs. Entrega local en `../PACTA-Demo-Video/out/pacta-film-120s-en-final.mp4`; [guía del vídeo](docs/10-video-pitch.md). No sustituye el ensayo ni la validación de pagos y jurados reales.
- ⬜ Reembolsar los pagos de prueba y enviar repo, URL y vídeo.

## Ideas a futuro

- ⬜ Tiempo de uso del móvil como prueba o señal (p. ej. pactos de "menos pantalla"). No funciona en Expo Go: iOS exige el entitlement de Family Controls (Screen Time API) y Android el permiso `PACKAGE_USAGE_STATS`, ambos con módulo nativo propio y un dev build. Valorar tras la demo.
- ✅ En el código local, la raíz sin sesión lleva al onboarding, también si se llega desde un QR; no hace falta cambiar el enlace del QR.

## Decisiones abiertas

| Tema | Situación | Qué decidir |
|---|---|---|
| Importes del stake | Mínimo **$5** (decidido 2026-10-24: la comisión de Whop no se devuelve al reembolsar, ver [docs/03](docs/03-whop.md) §6). Máximo $20. El kit muestra $10 / $25 / $50 y la UI usa $5 / $10 / $20. | Confirmar si el kit ($25 / $50) se ajusta a este rango |
| Texto del pacto fallado | El kit dice "$25 charged". El producto dice que el dinero va al Vault. La UI usa "moved to your Vault". | Confirmar el texto |
| Logo | Marca provisional en `PactaMark`. | Entregar el SVG oficial |
| Dominio | `pacta.vercel.app` está ocupado; hoy es `pacta-theta.vercel.app`. | Dominio propio o actualizar docs y Whop |
| Idioma de la interfaz | Textos en inglés como en el kit; docs y roadmap en español. | Confirmar |

## Cómo ver el trabajo

```bash
npm install
npx expo start --web     # abre http://localhost:8081  (galería de componentes en /kit)
npm run typecheck        # tsc --noEmit
npm run build:web        # export estático a dist/
```

## Registro de cambios

- **2026-10-24:** entregado el vídeo animado de 120 segundos en inglés (Remotion + ElevenLabs). Distingue funciones actuales de conceptos futuros; la fase 9 sigue parcial. Ver [docs/10](docs/10-video-pitch.md).

| Fecha | Cambio |
|---|---|
| 2026-10-24 | En `TestWhoop-main`: bienvenida con Whop, OAuth public + PKCE, perfil/salida y aislamiento por cuenta; conserva el saldo prepagado local. Configuración OAuth real guardada; código sin desplegar. 27 checks (Whop simulado, Postgres real), QA limpiada y compilación/tipos/lint verificados. Nuevo COMO-FUNCIONA y docs de identidad actualizados. |
| 2026-10-24 | Entorno, GitHub, Vercel y Supabase (esquema `pacta`, bucket, rol y `DATABASE_URL`) listos. |
| 2026-10-24 | Sistema de diseño, Pax y los seis flujos con datos de prueba. Galería en `/kit`. Este roadmap. |
| 2026-10-24 | Subido a `main` y desplegado. Web exportada como SPA para corregir el error de hidratación en enlaces directos. |
| 2026-10-24 | Fase 3: API `/api/pacts`, motor de estados con Trust y Vault, store con React Query, seed de demo. Contraseña de `pacta_app` rotada. Desplegado y verificado en producción. |
| 2026-10-24 | Fase 4 (preparación): cuenta Whop `pacta` creada, comandos y eventos del CLI verificados, stake mínimo a $5 por la comisión no reembolsable. `docs/03` corregido (variants en vez de plans, `whop payments refund`). |
| 2026-10-24 | Pax se presenta en el chat de su pestaña; la web de escritorio muestra una landing con QR en lugar de la app. |
| 2026-10-24 | Fase 5: agente auditor (Gemini 3.6 Flash), jurado y webhook de Terac, set de evaluación de 12 fotos, ronda 1 lanzada y política de revisión humana por stake. |
| 2026-10-24 | Fases 4, 7 y 8: High-Yield Pass en Whop y webhook de membresías, Vault con rendimiento simulado y rescate por tramos, identidad con el token de Whop y pago en el iframe, seed de dos semanas. Guion de la demo en docs/09. |
| 2026-10-24 | Fase 5: apelación con fianza ($15+, $7.50, panel de 3, 2 fotos y nota), lotes de apelaciones en un solo estudio de Terac, precios de Terac medidos y política de revisión humana por stake. Lanzamiento automático de lotes apagado. |
| 2026-10-24 | Docs: nuevo [COMO-FUNCIONA.md](COMO-FUNCIONA.md) y revisión de README, docs/01, 02, 04, 05 y 06 con lo construido. |

## Integración de las dos carpetas · 2026-10-24

- Guardados ambos árboles en commits y resueltos los conflictos de sesión, saldo, landing, apelaciones, jurado y docs.
- La entrada sin sesión sigue siendo la bienvenida de Whop; la landing nueva vive en `/landing` y su botón respeta la sesión.
- Validación: 27 casos de autenticación + 20 de saldo/Vault/testigo/apelaciones; base real con QA borrada, OAuth simulado, sin cobros ni estudios pagados. Typecheck, lint y export web antes de publicar.
- La publicación se hace al integrar el PR en `main`; Vercel tiene `main` configurada como rama de producción. El estado final se comprueba en GitHub/Vercel.

## Publicación y QR · 2026-10-24

El PR [#1](https://github.com/marsda2/pacta/pull/1) quedó fusionado en `main` (`5906ba5`) y Vercel completó automáticamente la publicación de producción. Las dos carpetas y la rama remota de diseño se sincronizaron. El webhook real `hook_P3VdUdEXp0xdk` aceptó un evento de prueba firmado de Whop: **HTTP 200, success=true**, sin cobro. El secreto está almacenado como Secret en Vercel.

La comprobación visual detectó que el redirect por defecto de Expo SDK 58 elegía `/kit` al denegar la raíz privada. Corrección: `Stack.Protected` especifica `redirectTo="/onboarding"`; además, ambos QR apuntan directamente a `/onboarding`. La galería solo se abre al visitar `/kit` expresamente. Este ajuste se publica como commit posterior al merge.

## Hábitos semanales, ubicación, Pomodoro opcional y revisión Light · 2026-10-24

- ✅ Selector de frecuencia en `/pact/new`: pacto único (día y hora exactos) o hábito semanal (`2x`–`7x` días/semana) con seguimiento de progreso `completedDays / targetDays`.
- ✅ Ubicación (`locationName`) al activar `Location` y verificación GPS en `/pact/:id/proof`.
- ✅ Tarjeta de resumen real del pacto en Home y `/pact/:id` con temporizador Pomodoro / Focus opcional, código diario visible y motivo de la IA (`aiReason`) visible en `/pact/:id/result`.
- ✅ Código escrito a mano (`dayCode`) remarcado en `/pact/:id` y `/pact/:id/proof` (con overlay en cámara y confirmación obligatoria antes de enviar), y aviso específico en `/pact/:id/result` (`missingDayCode`) cuando la IA no detecta el código en la foto para volver a probar poniéndolo en pantalla.
