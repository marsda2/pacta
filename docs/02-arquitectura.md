# 02 · Arquitectura (React Native + Expo)

> Revisado el 2026-10-24 con lo construido. Resumen para leer de un tirón: [COMO-FUNCIONA.md](../COMO-FUNCIONA.md).

## Vista general

```
                ┌───────────────────────────── Vercel (1 proyecto) ─────────────────────────────┐
 Móvil (Expo Go)│  Web estática: Expo export web (SPA)  ──►  https://pacta-theta.vercel.app     │
 Navegador      │                                            (también dentro de un iframe de    │
 Iframe Whop ──►│                                             Whop, ruta /experiences/[id])     │
                │                                                                               │
                │  Funciones serverless /api/*  (límite del plan Hobby: 12)                     │
                │   ├─ GET/POST /api/pacts · GET /api/pacts/:id                                 │
                │   ├─ POST /api/pacts/:id/{proof,appeal,resolve,checkout}                      │
                │   ├─ GET  /api/proofs/:id/image      foto de una prueba o de una apelación    │
                │   ├─ GET  /api/vault/summary · POST /api/vault/{redeem,pass}                  │
                │   ├─ GET/POST /api/jury/:id          un caso del jurado                       │
                │   ├─ GET/POST /api/jury/round1       cola de casos (ronda 1 y lotes)          │
                │   ├─ POST /api/webhooks/whop         pagos y membresías                       │
                │   ├─ POST /api/webhooks/terac        envíos de los jueces                     │
                │   ├─ POST /api/copilot/steps         micro-pasos de Pax (Gemini)              │
                │   └─ GET  /api/health                                                         │
                └───────┬──────────────┬──────────────────┬─────────────────┬──────────────────┘
                        │              │                  │                 │
                   Supabase        Whop API          Gemini (visión    Terac (API REST v2
               (Postgres, esquema  (checkout,         y Pax; Claude     y MCP para trabajar
                `pacta`)           reembolsos,        opcional)         desde Claude)
                                   webhooks)
```

**Por qué esta forma:**
- Un único despliegue en Vercel sirve la web (Expo web) y la API, así que hay una sola URL para Whop, los jueces de Terac y los webhooks.
- La app nativa (Expo Go) apunta a la misma API. La cámara funciona en Expo Go; el NFC **no** (necesita un *development build*), por eso es opcional. La web de escritorio muestra una landing con QR hacia el móvil (la prueba se hace con la cámara en vivo).
- **Toda la lógica de dinero y de veredictos vive en el servidor.** El cliente nunca decide si se reembolsa.
- Vercel Hobby permite **12 funciones**: por eso hay rutas con varias acciones (`api/vault/[action].ts`, `api/pacts/[id]/[action].ts`) y la cola de jueces reutiliza `api/jury/round1.ts`.

## Estructura del repositorio

```
pacta/
├─ app/                          # expo-router
│  ├─ _layout.tsx                # providers, landing de escritorio (no dentro de Whop)
│  ├─ (tabs)/                    # Home, Pacts, Pax (Copilot), Progress
│  ├─ pact/new.tsx · pact/[id]/{index,proof,result,appeal}.tsx
│  ├─ vault.tsx                  # saldo, rendimiento simulado, tramos, Free vs Pass
│  ├─ experiences/[experienceId].tsx   # entrada desde Whop
│  ├─ witness/[id].tsx           # revisión de un testigo (invitado, sin cuenta)
│  ├─ jury/{[id],queue,round1}.tsx    # páginas de los jueces de Terac (task_url)
│  └─ onboarding.tsx · landing.tsx · kit.tsx
├─ api/                          # funciones de Vercel (ver arriba)
├─ lib/
│  ├─ server/                    # solo servidor (claves secretas)
│  │  ├─ pact-engine.ts          # máquina de estados, Trust, Vault, reintento, apelación
│  │  ├─ vision-agent.ts         # agente auditor (Gemini / Claude) + prompts versionados
│  │  ├─ terac.ts                # cliente REST de Terac + firma del webhook
│  │  ├─ jury-queue.ts           # votos de una cola de casos y cierre por quorum
│  │  ├─ appeal-study.ts         # lotes: agrupa apelaciones en un estudio de Terac
│  │  ├─ whop.ts · identity.ts · vault.ts · copilot-agent.ts
│  │  └─ db.ts · http.ts · supabase-admin.ts
│  ├─ shared/                    # cliente y servidor
│  │  ├─ rules.ts                # TODAS las constantes de negocio (Trust, stake, apelación, lotes…)
│  │  ├─ vault.ts · types.ts · time.ts
│  ├─ store/ · api/ · theme/     # React Query, cliente HTTP, tokens de diseño
├─ components/                   # ui/, pact/, vault/, companion/ (Pax), landing/, nav/
├─ supabase/migrations/          # SQL del esquema `pacta`
├─ eval/                         # set de 12 fotos etiquetadas (para el antes/después)
├─ scripts/                      # seed, eval, seed-eval, launch-batch, whop-webhook, dev-api
└─ docs/ · COMO-FUNCIONA.md · ROADMAP.md · vercel.json · .env.example
```

## Modelo de datos (Supabase / Postgres, esquema `pacta`)

```
users          id, whop_user_id (unique), email, trust_score int default 50,
               tier ('free'|'high_yield'), withdrawals_locked_until, verified_streak, created_at

pacts          id, user_id, title, stake_cents (0 = pacto sin dinero, solo reputación),
               deadline, day_code, proof_methods text[], status (ver máquina de estados),
               whop_checkout_id, whop_payment_id, created_at, resolved_at

proofs         id, pact_id, storage_path ('db:<id>' = foto en proof_images), captured_live,
               emotional_state, ai_prompt_version, ai_verdict, ai_confidence, ai_cheat_signals jsonb,
               ai_reason, created_at
proof_images   proof_id (pk), mime, data bytea            -- las fotos viven en Postgres

jury_tasks     id, proof_id, terac_task_id (id de la opportunity de Terac; null = en cola),
               status ('pending'|'done'|'expired'), verdict ('APPROVE'|'REJECT'|'CHEAT'|'MICRO_TASK'),
               raw jsonb  -- {appeal, panel, bondCents, note, round, votes:{<submissionId>:{verdict,reason,at}}}
appeal_evidence id, jury_task_id, mime, data bytea       -- hasta 2 fotos extra de una apelación

vault_ledger   id, user_id, type ('lock'|'unlock'|'fee'|'yield'), amount_cents, pact_id, whop_ref
               -- saldo bloqueado = Σ lock − Σ unlock − Σ fee ; 'yield' es informativo
trust_events   id, user_id, delta, reason, pact_id, created_at

agent_prompts  version pk ('v1-baseline','v2-terac'), content, few_shots jsonb
eval_runs      id, prompt_version, accuracy, cheats_caught, false_approvals, details jsonb
webhook_events id (id del evento del proveedor), source, payload jsonb   -- idempotencia

-- Pact Circles (opcional, ver 07). El dinero sigue siendo individual: no hay tabla de bote.
circles        id, name, invite_code (unique), habit, target_per_week int,
               stake_cents, starts_at, ends_at, created_by
circle_members circle_id, user_id, role ('owner'|'member'), joined_at
circle_votes   id, proof_id, voter_user_id, vote ('APPROVE'|'DOUBT'), created_at
               -- etiquetas débiles: nunca se usan como verdad en eval/calibración
pacts          + circle_id (nullable)
```

RLS está activado sin políticas de acceso de cliente: las lecturas y escrituras de PACTA pasan por `/api/*`, con el rol Postgres `pacta_app`. El servidor resuelve el `whop_user_id` verificado y filtra los datos por la cuenta de PACTA correspondiente.

### Sesión y rutas (implementación local, 2026-10-24)

`lib/auth/session.tsx` gestiona el login de Whop. `app/_layout.tsx` protege las pestañas, `pact/`, saldo, Vault, perfil y experiencia mediante `Stack.Protected`. Sin sesión la entrada es `/onboarding`; `/auth/callback` completa OAuth. El perfil se abre desde el avatar del encabezado.

`lib/server/whop-oauth.ts` gestiona PKCE, canje, refresh y revocación; `identity.ts` verifica el Bearer con Whop o el JWT del iframe. Los dos métodos hacen upsert en la misma fila de `users` por `whop_user_id`. `/api/vault/session` y `auth-start|auth-exchange|auth-refresh|auth-logout` comparten la función del Vault, sin añadir funciones de Vercel. Sesión y datos privados responden con `Cache-Control: no-store`.

Los tokens de dispositivo viven en SecureStore (nativo) o `sessionStorage` (web); las solicitudes añaden `Authorization`. Una renovación simultánea comparte el refresh para no reutilizar tokens rotados. Cada cuenta monta un QueryClient nuevo; al salir se descarta la caché anterior. No hay consultas de pactos/saldo/Vault sin sesión. Detalle y limitación de los testigos invitados: [COMO-FUNCIONA](../COMO-FUNCIONA.md).

## Máquina de estados del pacto

```
DRAFT / AWAITING_PAYMENT ──(webhook payment.succeeded)──► ACTIVE
ACTIVE ──(prueba subida)──► AI_REVIEW
ACTIVE ──(deadline sin prueba)──► VAULTED

AI_REVIEW ──(IA segura: conf ≥ 0.88, sin trampa, no "agobiado")──► REFUNDED
AI_REVIEW ──(duda, stake ≥ umbral)──► JURY_PENDING            jurado de Terac (1 juez)
AI_REVIEW ──(duda, stake bajo)──┬─ 2.ª prueba ──► AI_REVIEW (máx. 2 pruebas)
                                ├─ testigo ──► REFUNDED / VAULTED
                                ├─ apelación (stake ≥ $15, o Pass) ──► JURY_PENDING   panel de 3, con fianza
                                └─ 48 h sin resolver ──► VAULTED

JURY_PENDING ──APPROVE──► REFUNDED
JURY_PENDING ──REJECT──► VAULTED      (apelación perdida: stake al Vault menos la fianza)
JURY_PENDING ──CHEAT──► VAULTED       (−50 de Trust y 7 días sin retiros)
```

- Todas las transiciones viven en `lib/server/pact-engine.ts` y escriben `trust_events` y `vault_ledger`. El reembolso a Whop (`refundPact`) se hace antes de cambiar el estado: si Whop falla, el pacto no cambia.
- Estados de la base ≠ estados de la UI: `toDto` proyecta los diez estados del servidor en cinco (`scheduled`, `progress`, `pending`, `verified`, `missed`) y añade `review` (qué puede hacer el usuario durante la revisión).
- Los deadlines vencidos se comprueban en cada lectura ("lazy expiry"): no hace falta un cron (limitado en Hobby).

## Seguridad mínima
- Se verifica la firma de los webhooks de Whop y de Terac, y se aplica idempotencia con `webhook_events`.
- Dentro de Whop la identidad sale del JWT `x-whop-user-token` (ES256, JWKS de Whop). Fuera de Whop se usa un usuario de demo salvo `WHOP_REQUIRE_USER_TOKEN=true`.
- El `day_code` se genera en el servidor.
- Un juez solo puede votar si Terac lo ha enviado a **ese** estudio: la API comprueba la submission contra la API de Terac antes de guardar y de enseñar fotos de apelaciones.
- Las claves secretas (Whop, Gemini, Anthropic, Terac, service role de Supabase) solo están en las variables de entorno de Vercel, nunca con prefijo `EXPO_PUBLIC_`.
- Las fotos se sirven por `/api/proofs/:id/image` con un UUID aleatorio no adivinable; cuando haya identidad por usuario en esa ruta, se exigirá sesión.
