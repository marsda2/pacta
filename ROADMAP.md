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
| 4 | Pagos con Whop | ⬜ |
| 5 | Agente auditor + jurado Terac + antes/después | ⬜ |
| 6 | Copilot con IA y Pax reactivo | ⬜ |
| 7 | Vault y Trust Score reales | 🟡 |
| 8 | Embeber en Whop, datos de demo y pulido | ⬜ |
| 9 | Demo y entrega | ⬜ |
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
- ✅ Identidad: usuario de demo (`whop_user_id = 'demo-user'`). El token de Whop llega en la fase 8.
- ✅ Migración `pacta_pacts_methods_images`: `pacts.proof_methods` y tabla `proof_images`.
- ✅ Servidor de desarrollo de la API: `npm run dev:api` (puerto 3000, lee `.env.local`). Datos de demo: `npm run seed`.
- ✅ Verificado: 24 comprobaciones de la API contra la base real (altas, validaciones, 409 en transiciones inválidas, imagen servida, CORS, Trust y Vault) y el flujo completo en el navegador: el pacto creado desde la UI quedó `REFUNDED` en Postgres con su `trust_event`. Typecheck y lint limpios.
- 🟡 Fotos en Postgres (`proof_images`) en vez del bucket `proofs`: falta `SUPABASE_SERVICE_ROLE_KEY` para firmar URLs de Storage. `proofs.storage_path` vale `db:<proof_id>`; el jurado (`api/jury/[id].ts`) usa `signedProofUrl` y hay que adaptarlo a esa ruta o mover las fotos a Storage cuando exista la clave.
- ✅ Desplegado en Vercel (`8e16177`) y verificado en producción: las 24 comprobaciones de la API pasan contra https://pacta-theta.vercel.app, Home y un enlace directo `/pact/<uuid>` cargan datos reales sin errores de consola.

## Fase 4 · Pagos con Whop ⬜

- ⬜ Verificar los puntos marcados **[verificar]** de [docs/03-whop.md](docs/03-whop.md) (checkout con metadata, eventos del webhook, comisión al reembolsar, ventana de reembolso).
- ⬜ App, producto "PACTA Stake" y plan "High-Yield Pass" en Whop.
- ⬜ Checkout por pacto, `POST /api/webhooks/whop` con firma e idempotencia (`webhook_events`).
- ⬜ Reembolso al aprobar; stake al Vault al fallar.

## Fase 5 · Agente auditor y jurado Terac ⬜

- ⬜ `lib/server/vision-agent.ts` con Claude (prompts `v1-baseline` y `v2-terac`).
- ⬜ Regla de aprobación en `pact-engine` (confianza ≥ 0.88, sin señales de trampa).
- ⬜ Cliente MCP de Terac, creación de tareas y recepción del veredicto (webhook o polling).
- ⬜ Set de evaluación (`eval/set.json`), ronda 1 en Terac, `POST /api/admin/calibrate`, tabla antes/después con números reales.

## Fase 6 · Copilot con IA y Pax reactivo ⬜

- ⬜ Micro-pasos generados por el agente a partir del bloqueo ("Too big", "Distracted", "Need clarity"). Hoy son pasos fijos de ejemplo.
- ⬜ Pax cambia de expresión según el estado real (preocupado cerca de la fecha límite, contento al cumplir, dormido sin pactos).

## Fase 7 · Vault y Trust Score reales ⬜

- ✅ El motor escribe `trust_events` y `vault_ledger` (fallo: −30 de Trust y stake al Vault; cumplido: +15 y racha). El Trust y el Vault de Home y Progress salen del servidor.
- ⬜ Trampa confirmada: −50 y bloqueo de retiros 7 días; micro-tarea de clemencia (+5).
- ⬜ Rendimiento simulado (4.85% APY) y desbloqueo por tramos ([docs/01](docs/01-producto.md)).
- ⬜ Pantalla de Vault con historial y rescate.

## Fase 8 · Embeber en Whop y pulido ⬜

- ⬜ URL del iframe + verificación del token de usuario de Whop.
- 🟡 Datos de demo sembrados (`npm run seed`: un pacto cumplido, uno fallado con $10 en el Vault y uno activo). Falta el historial de Trust más largo para la demo.
- ⬜ Pase de pulido: rendimiento, textos, estados de carga.

## Fase 9 · Demo y entrega ⬜

- ⬜ Ensayo de la demo (guion en [docs/06](docs/06-plan-8h-y-demo.md)) y vídeo de respaldo.
- ⬜ Reembolsar los pagos de prueba y enviar repo, URL y vídeo.

## Decisiones abiertas

| Tema | Situación | Qué decidir |
|---|---|---|
| Importes del stake | El kit muestra $10 / $25 / $50. Las reglas del plan limitan el stake a $1–$20 (Whop no tiene sandbox). La UI usa $5 / $10 / $20. | Subir el máximo si la demo no mueve dinero real |
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

| Fecha | Cambio |
|---|---|
| 2026-10-24 | Entorno, GitHub, Vercel y Supabase (esquema `pacta`, bucket, rol y `DATABASE_URL`) listos. |
| 2026-10-24 | Sistema de diseño, Pax y los seis flujos con datos de prueba. Galería en `/kit`. Este roadmap. |
| 2026-10-24 | Subido a `main` y desplegado. Web exportada como SPA para corregir el error de hidratación en enlaces directos. |
| 2026-10-24 | Fase 3: API `/api/pacts`, motor de estados con Trust y Vault, store con React Query, seed de demo. Contraseña de `pacta_app` rotada. Desplegado y verificado en producción. |
