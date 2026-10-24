# 02 · Arquitectura (React Native + Expo)

## Vista general

```
                ┌───────────────────────────── Vercel (1 proyecto) ─────────────────────────────┐
 Móvil (Expo Go)│  Web estática: Expo export web  ──►  https://pacta.vercel.app                 │
 Navegador      │                                       (también como iframe dentro de Whop)    │
 Iframe Whop ──►│                                                                               │
                │  Funciones serverless /api/*                                                  │
                │   ├─ POST /api/pacts               crea el pacto + checkout de Whop           │
                │   ├─ POST /api/proofs              sube la prueba → agente de visión          │
                │   ├─ GET  /api/jury/:id            estado del jurado (polling de respaldo)    │
                │   ├─ POST /api/webhooks/whop       payment.succeeded, membership.*            │
                │   ├─ POST /api/webhooks/terac      veredicto del jurado (si Terac lo admite)  │
                │   ├─ POST /api/vault/redeem        desbloqueo de un tramo                     │
                │   └─ POST /api/admin/calibrate     ingesta de Terac → prompt v2 + evaluación  │
                └───────┬──────────────┬──────────────────┬─────────────────┬──────────────────┘
                        │              │                  │                 │
                   Supabase        Whop API          Claude API        Terac MCP
               (Postgres+Storage) (checkout,        (visión, salida    (tareas a
                                   refunds,          estructurada)      humanos)
                                   webhooks)
```

**Por qué esta forma:**
- Un único despliegue en Vercel sirve la web (Expo web) y la API, así que hay una sola URL para Whop, los jueces y los webhooks.
- La app nativa (Expo Go) apunta a la misma API. La cámara funciona en Expo Go; el NFC **no** (necesita un *development build*), por eso el NFC es opcional.
- **Toda la lógica de dinero y de veredictos vive en el servidor.** El cliente nunca decide si se reembolsa.

## Estructura del repositorio (monorepo ligero)

```
pacta/
├─ app/                         # expo-router (pantallas)
│  ├─ _layout.tsx               # providers: Supabase session, React Query, tema
│  ├─ index.tsx                 # Dashboard: 3 tarjetas (Stake, Vault, Trust)
│  ├─ pact/new.tsx              # crear pacto → abre el checkout de Whop
│  ├─ pact/[id]/index.tsx       # detalle + cuenta atrás + código del día
│  ├─ pact/[id]/proof.tsx       # expo-camera, captura en vivo, toggle "overwhelmed"
│  ├─ pact/[id]/jury.tsx        # "Humanos de Terac revisando…" (polling)
│  ├─ vault.tsx                 # historial del Vault, rendimiento, botón Rescatar
│  └─ admin/calibration.tsx     # antes/después para los jueces
├─ api/                         # funciones serverless de Vercel (Node, TypeScript)
│  ├─ pacts.ts
│  ├─ proofs.ts
│  ├─ jury/[id].ts
│  ├─ vault/redeem.ts
│  ├─ webhooks/whop.ts
│  ├─ webhooks/terac.ts
│  └─ admin/calibrate.ts
├─ lib/
│  ├─ server/                   # solo servidor (claves secretas)
│  │  ├─ whop.ts                # cliente @whop/sdk
│  │  ├─ terac.ts               # cliente MCP de Terac
│  │  ├─ vision-agent.ts        # prompt versionado + llamada a Claude
│  │  ├─ pact-engine.ts         # máquina de estados + reglas de Trust/Vault
│  │  └─ supabase-admin.ts      # service role
│  └─ shared/                   # tipos y constantes compartidos (cliente y servidor)
│     ├─ types.ts
│     └─ rules.ts               # +15/+20/−30/−50, APY, umbrales
├─ components/                  # StatCard, TrustBar, Countdown, CameraCapture
├─ supabase/migrations/         # SQL del esquema
├─ eval/                        # set de pruebas etiquetadas para el antes/después
├─ vercel.json
├─ app.json
└─ .env.example
```

### Librerías previstas
- `expo`, `expo-router`, `expo-camera`, `expo-image-manipulator` (para comprimir la foto antes de subirla)
- `@supabase/supabase-js`, `@tanstack/react-query`
- `@whop/sdk` (servidor) y, si embebemos la app en Whop, el helper de verificación de token de usuario de Whop
- `@anthropic-ai/sdk` (agente de visión)
- Cliente MCP (`@modelcontextprotocol/sdk`) para Terac, o el conector MCP de la API de Claude (ver 04)
- Opcional: `react-native-nfc-manager` (solo con dev build)

## Modelo de datos (Supabase / Postgres)

```
users          id, whop_user_id (unique), email, trust_score int default 50,
               tier text ('free'|'high_yield'), withdrawals_locked_until timestamptz,
               verified_streak int default 0, created_at

pacts          id, user_id, title, stake_cents, deadline, day_code text,
               status (ver máquina de estados), whop_checkout_id, whop_payment_id,
               created_at, resolved_at

proofs         id, pact_id, storage_path, captured_live bool, emotional_state,
               ai_prompt_version, ai_verdict, ai_confidence numeric,
               ai_cheat_signals jsonb, ai_reason text, created_at

jury_tasks     id, proof_id, terac_task_id, status ('pending'|'done'|'expired'),
               verdict ('APPROVE'|'REJECT'|'CHEAT'|'MICRO_TASK'),
               micro_task text, raw jsonb, created_at, resolved_at

vault_ledger   id, user_id, type ('lock'|'unlock'|'fee'), amount_cents,
               pact_id, whop_ref, created_at
               -- saldo = Σ lock − Σ unlock − Σ fee ; el rendimiento se calcula al vuelo

trust_events   id, user_id, delta int, reason, pact_id, created_at

agent_prompts  version text pk ('v1-baseline','v2-terac'), content text,
               few_shots jsonb, created_at

eval_runs      id, prompt_version, accuracy numeric, cheats_caught int,
               false_approvals int, details jsonb, created_at

webhook_events id (id del evento del proveedor), source, payload jsonb, processed_at
               -- idempotencia: si ya existe, no se procesa dos veces

-- Pact Circles (opcional, ver 07). El dinero sigue siendo individual: no hay tabla de bote.
circles        id, name, invite_code (unique), habit, target_per_week int,
               stake_cents, starts_at, ends_at, created_by
circle_members circle_id, user_id, role ('owner'|'member'), joined_at
circle_votes   id, proof_id, voter_user_id, vote ('APPROVE'|'DOUBT'), created_at
               -- etiquetas débiles: nunca se usan como verdad en eval/calibración
pacts          + circle_id (nullable)
```

RLS: el cliente solo **lee** sus propias filas (`users`, `pacts`, `proofs`, `vault_ledger`, `trust_events`). Todas las escrituras pasan por `/api/*` con la service role.

## Máquina de estados del pacto

```
DRAFT ──(checkout creado)──► AWAITING_PAYMENT ──(webhook payment.succeeded)──► ACTIVE
ACTIVE ──(prueba subida)──► AI_REVIEW
AI_REVIEW ──(conf ≥ 0.88, sin trampa, sin apelación)──► APPROVED ──► REFUNDED
AI_REVIEW ──(si no)──► JURY_PENDING
JURY_PENDING ──APPROVE──► APPROVED ──► REFUNDED
JURY_PENDING ──MICRO_TASK──► MICRO_TASK_PENDING ──(prueba ok)──► APPROVED ──► REFUNDED
JURY_PENDING ──REJECT / CHEAT / timeout──► FAILED ──► VAULTED
ACTIVE ──(deadline sin prueba)──► FAILED ──► VAULTED
```

- Todas las transiciones viven en `lib/server/pact-engine.ts` (una sola función `transition(pact, event)`), que también escribe `trust_events` y `vault_ledger`.
- Los deadlines vencidos se comprueban en cada lectura del dashboard ("lazy expiry"). Así no dependemos de un cron, que en el plan Hobby de Vercel es limitado.

## Seguridad mínima
- Verificar la firma de los webhooks de Whop y Terac; idempotencia con `webhook_events`.
- La foto se sube a una URL firmada de Supabase Storage; el agente recibe una URL firmada temporal.
- El `day_code` se genera en el servidor y nunca se reutiliza.
- Las claves secretas (Whop, Anthropic, Terac, la service role de Supabase) solo están en las variables de entorno de Vercel, nunca con prefijo `EXPO_PUBLIC_`.
