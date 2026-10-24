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
| 3 | API y datos reales (Supabase) | ⬜ |
| 4 | Pagos con Whop | ⬜ |
| 5 | Agente auditor + jurado Terac + antes/después | ⬜ |
| 6 | Copilot con IA y Pax reactivo | ⬜ |
| 7 | Vault y Trust Score reales | ⬜ |
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

Los seis flujos de *Windows & Flows* funcionan con un store en memoria (`lib/store/pacts.tsx`).

- ✅ 01 Crear pacto → `app/pact/new.tsx`
- ✅ 02 Pacto activo (cuenta atrás, pasos, "I'm stuck") → `app/pact/[id]/index.tsx`
- ✅ 03 Prueba en vivo → `app/pact/[id]/proof.tsx`
- ✅ 04 Copilot → `app/(tabs)/copilot.tsx`
- ✅ 05 Revisión de testigo (invitado, sin cuenta) → `app/witness/[id].tsx`
- ✅ 06 Resultado (cumplido / fallado) → `app/pact/[id]/result.tsx`
- ✅ Pestañas: Home, Pacts (Today/Upcoming/Completed), Copilot, Progress.
- ✅ Verificado en el navegador (ancho móvil): crear pacto → pacto activo → prueba (modo demo) → revisión → testigo → "Pact kept". Typecheck limpio y `expo export -p web` genera las 16 rutas.
- 🟡 Revisión visual en móvil real (Expo Go) y en distintos anchos. La cámara real solo se ha probado hasta el estado "sin cámara" (modo demo).
- 🟡 Enlaces directos en Vercel (`/pact/<id>`, `/kit`): el `vercel.json` los reescribe a `index.html` y el router los resuelve en cliente; falta comprobarlo ya desplegado.
- ⬜ Estados vacíos y de error más pulidos; accesibilidad (lector de pantalla, foco).

## Fase 3 · API y datos reales ⬜

- ⬜ Cliente Postgres en `lib/server/db.ts` (`pg` + `DATABASE_URL`, esquema `pacta`).
- ⬜ `POST /api/pacts`, `GET /api/pacts`, `POST /api/proofs` (URL firmada al bucket `proofs`).
- ⬜ Sustituir el store en memoria por React Query + estas rutas.
- ⬜ Identidad: usuario de demo sembrado (`DEMO_USER_ID`) y, después, token de Whop.
- ⬜ Proyección de la máquina de estados del servidor (DRAFT, ACTIVE, AI_REVIEW…) a los cinco estados de la UI.

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

- ⬜ `pact-engine.transition` escribe `trust_events` y `vault_ledger`.
- ⬜ Rendimiento simulado (4.85% APY) y desbloqueo por tramos ([docs/01](docs/01-producto.md)).
- ⬜ Pantalla de Vault con historial y rescate.

## Fase 8 · Embeber en Whop y pulido ⬜

- ⬜ URL del iframe + verificación del token de usuario de Whop.
- ⬜ Datos de demo sembrados (Vault con saldo, historial de Trust).
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
