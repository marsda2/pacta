# Cómo funciona PACTA por dentro

> Documento de referencia para releer en frío. Última revisión: **2026-10-24**. Escrito leyendo el código de la rama `brand/logo-iconos` **y** de `origin/main` (c667ac0). Lo que vive solo en `main` (Whop, Vault, identidad en Whop) está marcado como *(main)*. Detalle de cada parte en [docs/](docs/); avance fase a fase en el [ROADMAP](ROADMAP.md).

## 1. En una página

PACTA es un fondo de disciplina sin empleados. Apuestas dinero (**de $5 a $20**) a un hábito ("ir al gimnasio hoy") y entregas una **foto en vivo** con un **código de 4 letras escrito a mano**. Una **IA** (Gemini) mira la foto:

- Si está segura → **te devuelven el dinero** al momento.
- Si duda → decide quién según el dinero en juego: una segunda foto, un testigo, una **apelación** a humanos de **Terac**, o un jurado de Terac si el stake es alto.
- Si fallas, **el dinero no se pierde**: va al **Redemption Vault**, rinde un 4,85 % *simulado* y lo recuperas por tramos de $20 al reconstruir tu **Trust Score** (Trust ≥ 70 y 3 pactos verificados seguidos).

Negocio: 10 % de comisión al rescatar el Vault (nivel Free), **High-Yield Pass** de $9 al mes (100 % del tramo + rendimiento y 2 apelaciones al mes) y las apelaciones perdidas (fianza). Todo el dinero se mueve con **Whop**.

## 2. Las piezas

| Pieza | Qué hace | Dónde está | Estado |
|---|---|---|---|
| **App** (Expo, web + móvil) | Pantallas, cámara en vivo, Pax (el companion). En escritorio solo muestra una landing con QR | `app/`, `components/` | Hecha |
| **API** (funciones de Vercel) | Toda la lógica de dinero y veredictos. El cliente nunca decide un reembolso | `api/`, `lib/server/` | Hecha |
| **Base de datos** | Postgres de Supabase, esquema aislado `pacta`; las fotos viven ahí | `supabase/migrations/` | Hecha |
| **Whop** | Cobro del stake, reembolsos, High-Yield Pass, y la app dentro de un iframe | `lib/server/whop.ts` *(main)* | 🟡 falta webhook en producción y un pago real |
| **Agente de visión** | Mira la foto y decide si hay confianza para aprobar | `lib/server/vision-agent.ts` | Hecho (v1) |
| **Terac** | Jueces humanos pagados; solo en la duda con stake alto o en una apelación | `lib/server/terac.ts`, `api/jury/`, `api/webhooks/terac.ts` | 🟡 ronda 1 esperando juez |
| **Pax Copilot** | Convierte un bloqueo en 3 micro-pasos con Gemini | `lib/server/copilot-agent.ts`, `api/copilot/steps.ts` | Hecho (micro-pasos; falta el Pax reactivo) |

URL de producción: **https://pacta-theta.vercel.app**. Vercel Hobby limita a **12 funciones** (en `main` hay 11), por eso varias rutas comparten función.

## 3. La vida de un pacto

```
Creas el pacto ──► Whop te cobra el stake ──► ACTIVO ──► subes la foto ──► REVISIÓN DE LA IA
                                                                              │
        ┌─────────────────────────────────────────────────────────────────────┤
        ▼ IA segura                                                            ▼ IA duda
   REEMBOLSADO (+15 Trust)                         ¿cuánto dinero hay en juego? (sección 4)
                                                                              │
                  ┌──────────────────────┬────────────────────────┬───────────┴───────────┐
                  ▼ stake bajo           ▼ stake bajo             ▼ stake alto (≥ $20)    ▼ pides apelar
              2.ª foto / testigo      48 h sin resolver        JURADO de Terac (1 juez)   PANEL de Terac (3 jueces)
                                            │                          │                         │
                                            ▼                          ▼                         ▼
                                     VAULT (−30 Trust)        APRUEBA → reembolso (+20)    APRUEBA → reembolso (+20)
                                                              RECHAZA → Vault (−30)        RECHAZA → Vault menos fianza (−30)
                                                              TRAMPA → Vault (−50, 7 días  TRAMPA → Vault menos fianza (−50…)
                                                              sin retiros)
Si pasa el plazo sin subir foto ──► VAULT (−30 Trust)
```

- **Código del día:** lo genera el servidor para cada pacto; debe verse escrito a mano en la foto. Anti-trampa barato.
- **"Agobiado":** si marcas que estás abrumado, la IA nunca aprueba sola; va a revisión humana (la micro-tarea de clemencia aún no está hecha).
- **Pactos sin dinero:** stake 0, solo arriesgan reputación, no pasan por Whop; se usan en el onboarding y la demo.
- **Vencimientos "perezosos":** no hay cron; los plazos vencidos se aplican cuando alguien lee los pactos.

## 4. Quién decide si cumpliste

| Situación | Quién decide | Cuesta |
|---|---|---|
| La IA está segura (confianza ≥ 0,88, sin señales de trampa, no "agobiado") | La IA | ≈ $0.002 |
| Duda y stake **< $20** | Nadie paga a un humano: **2.ª foto** (máx. 2), **testigo** (un amigo, sin cuenta) o **apelar**. Si en **48 h** nadie lo resuelve → Vault | $0 |
| Duda y stake **≥ $20** (`HUMAN_REVIEW_MIN_STAKE_CENTS`) | **Jurado de Terac**, 1 juez, caso abierto al instante | lo paga PACTA |
| **Apelación** | **Panel de 3** jueces de Terac, en lote | fianza (sección 5) |
| Trampa | Solo cuenta (−50 y 7 días sin retiros) si el jurado vota `CHEAT`. La sospecha de la IA sola nunca castiga | — |

**Por qué así.** Un juez humano cuesta más que la comisión de un pacto pequeño. Equivocarse con un stake bajo sale barato porque el dinero no se pierde: va al Vault y se recupera. El umbral es $20 porque el stake máximo es $20; en producción se subiría a $30–40 sin tocar código.

## 5. Apelar con fianza

Para quien está seguro de haber cumplido y la IA dijo que no.

| Condición | Valor |
|---|---|
| Quién | Stake **≥ $15**; con el **Pass**, cualquier stake (2 al mes, sin fianza) |
| Cuándo | Mientras el pacto está en revisión de la IA (**48 h**) |
| Fianza | **$7.50**, descontada del stake que PACTA ya retiene (no se cobra nada nuevo) |
| Pruebas extra | Hasta **2 fotos** y una **nota** de 280 caracteres, que ven los jueces |
| Jueces | **3**, decide la mayoría estricta; sin mayoría → rechazo |
| **Gana el usuario** | Stake **entero** de vuelta, sin fianza, +20 Trust. Ese caso es un *falso rechazo* de la IA: sirve para calibrar |
| **Pierde** | El stake va al Vault **menos $7.50** (apunte `fee`), −30 Trust (−50 si es trampa) |

## 6. El jurado de Terac por dentro

### Cómo funciona (modelo mental)
Terac **no etiqueta imágenes**: **contrata personas**. Creamos un *estudio* (opportunity) y cada persona que pasa su cuestionario hace una *tarea*. La tarea es **una página nuestra** (`/jury/…`) donde el juez ve la foto y vota; Terac solo nos manda a la persona (con un `teracSubmissionId` en la URL). **El voto llega a nuestro servidor**, que lo guarda y, cuando el juez termina, lo devuelve a Terac. Entonces el webhook de Terac nos avisa y **aprobamos el pago del juez solo si dejó su voto**.

Terac es API v2 **beta**. Se usa por **REST** desde el servidor y por **MCP** (OAuth, `.mcp.json`) para trabajar desde Claude.

### Precios medidos (con borradores gratuitos)

| Dato | Valor |
|---|---|
| Incentivo mínimo por estudio | **$5** |
| Comisión de Terac | **50 %** |
| Precio por juez (tarea de 1 a 3 min) | **$4.50** (a veces $6 con 4–8 min: es una estimación automática) |
| Estudio de **1 juez** desde la API | **Rechazado** (queda por debajo de los $5) |
| 2 / **3** / 4 / 5 jueces | $9.00 / **$13.50** / $18.00 / $22.50 |
| Fijar el incentivo | Solo en el panel de Terac. La ronda 1 se hizo así: $11 + 50 % = **$16.50** |
| Lanzar sin cuestionario | Rechazado: es obligatorio |

### Los lotes (por qué una apelación no abre un estudio propio)
Un estudio de 3 jueces cuesta **$13.50**, más que la fianza de $7.50. Por eso las apelaciones **esperan en una cola** y se revisan **juntas en un solo estudio**; cada juez vota todos los casos de una página (`/jury/queue`).

| Casos en cola | Cuándo se lanza | Coste por caso |
|---|---|---|
| 3 a 5 | Al momento | $4.50 a $2.70 |
| 2 | Tras 24 h | ≈ $6.75 |
| 1 | Tras 48 h | $13.50 (lo asume PACTA) |

En todos los casos salvo el suelto, la fianza de $7.50 cubre el coste.

### Las tres cosas que gastan dinero de Terac

| Qué | Cuándo se lanza | Estado |
|---|---|---|
| **Ronda 1** (12 fotos de evaluación) | A mano, desde el panel | **Lanzada** el 24-oct 19:33 UTC, 1 juez, $16.50. 0 envíos en la última comprobación |
| **Lote de apelaciones** | `npm run batch:launch -- --launch`, o solo automático con `TERAC_AUTO_LAUNCH=true` | **Apagado.** Sin esa variable, una apelación queda en cola sin gastar nada |
| **Jurado de stake alto** | Caso individual atado a `TERAC_JURY_OPPORTUNITY_ID` | Sin automatizar del todo |

Saldo de Terac: **$83.50**. `npm run batch:launch` sin `--launch` es una **simulación gratis** (crea un borrador, lee el precio y lo borra).

## 7. El dinero

| Concepto | Cómo funciona |
|---|---|
| **Stake** | $5–$20, cobrado con **Whop** al crear el pacto. Mínimo $5 porque Whop **no devuelve su comisión (2,7 % + $0,30)** al reembolsar *(main)* |
| **Reembolso** | Primero se devuelve en Whop y luego cambia el estado; si Whop falla, el pacto no cambia |
| **Vault** | Saldo bloqueado = Σ `lock` − Σ `unlock` − Σ `fee`. `yield` es informativo |
| **Rendimiento** | **4,85 % APY simulado** sobre el libro de movimientos; siempre se muestra como "simulado". Dinero real nunca se invierte |
| **Desbloqueo** | Un **tramo de min($20, saldo)** con **Trust ≥ 70** y **3 pactos verificados seguidos** desde el último fallo o rescate, y sin bloqueo de 7 días por trampa. Se devuelve con **reembolsos parciales** de los stakes fallados *(main)* |
| **Free** | Recupera el **90 %** del tramo (10 % de comisión para PACTA), sin rendimiento |
| **High-Yield Pass** | **$9 cada 30 días** (suscripción de Whop): **100 %** del tramo + el rendimiento + 2 apelaciones al mes |

**Economía de PACTA por escenario**

| Escenario | Ingresa PACTA | Le cuesta a PACTA |
|---|---|---|
| Pacto de $5 cumplido (IA) | $0 | ≈ $0.44 de comisión no reembolsable de Whop + $0.002 de IA |
| Pacto fallado | $0 por ahora: el dinero sigue siendo del usuario, en el Vault | — |
| Rescate Free de un tramo de $20 | $2 (10 %) | — |
| Pass | $9 al mes | — |
| Apelación **perdida** | $7.50 de fianza | su parte del lote ($2.70–$6.75) |
| Apelación **ganada** | $0 | su parte del lote ($2.70–$6.75) |

## 8. Trust Score (0–100, empieza en 50)

| Evento | Puntos |
|---|---|
| Aprobado por la IA | **+15** |
| Aprobado por el jurado | **+20** |
| Pacto fallado o caducado | **−30** |
| Trampa confirmada por el jurado | **−50** y **7 días sin retiros** |
| Micro-tarea de clemencia (pendiente) | +5 |

## 9. El agente de visión y la evaluación

- **Modelo:** `gemini-3.6-flash` (≈ $0.002 y ~3 s por foto). Se cambia con `AGENT_MODEL`; con un modelo `claude-*` usa Anthropic.
- **Prompt:** `v1-baseline` (genérico, a propósito). `v2-terac`, con reglas aprendidas de los votos humanos, **está pendiente**.
- **Salida:** `task_match`, `day_code_visible`, `cheat_signals` (`screen_photo`, `old_or_reused`, `unrelated_scene`, `staged`, `none`), `confidence`, `verdict`, `reason`.
- **La regla de aprobar sola está en el código**, no en el prompt (`shouldAutoApprove`).
- **Set de evaluación:** 12 fotos etiquetadas en `eval/`. `npm run eval` mide precisión, trampas detectadas, falsas aprobaciones y coste, y guarda en `eval_runs`.
- **Resultado de v1 con Gemini:** **83 % (10/12)**, trampas 5/6, 1 aprobación falsa (código escrito digitalmente sobre la foto) y 1 derivación de más. Con solo las 8 fotos fáciles era 100 %.
- **Límite:** las 12 fotos son **generadas con IA**; Gemini a veces rechaza por eso y un humano también puede votar "fake". Hacen falta ~10 fotos reales con el móvil para una verdad de referencia defendible.

## 10. Identidad y Whop embebido *(main)*

PACTA se abre dentro de Whop en un iframe (`/experiences/[experienceId]`). Whop añade el JWT del usuario en `x-whop-user-token` (ES256, JWKS de Whop, audiencia `WHOP_APP_ID`) y el servidor lo verifica; cada usuario de Whop tiene su fila en `users`. Fuera de Whop se usa un usuario de demo (salvo `WHOP_REQUIRE_USER_TOKEN=true`). El pago se hace dentro del iframe con `@whop/iframe`.

## 11. Interruptores y cosas que cuestan dinero

| Interruptor | Valor ahora | Efecto |
|---|---|---|
| `TERAC_AUTO_LAUNCH` | **no definido (apagado)** | Con `true`, cada lote de apelaciones se lanza solo y gasta saldo de Terac |
| `HUMAN_REVIEW_MIN_STAKE_CENTS` | 2000 ($20) | Stake desde el que la duda de la IA abre un jurado de Terac |
| `FREE_APPEALS` | no definido | Con `true`, se puede apelar sin Pass ni fianza (solo demo) |
| `AGENT_MODEL` / `AGENT_PROMPT_VERSION` | `gemini-3.6-flash` / `v1-baseline` | Modelo y versión del prompt de la IA |
| `WHOP_REQUIRE_USER_TOKEN` | `false` *(main)* | Con `true`, sin token de Whop la API responde 401 |
| `TERAC_ROUND1_OPPORTUNITY_ID` | el estudio de la ronda 1 | Dónde se guardan los votos de evaluación |

Constantes de negocio (Trust, stake, apelación, lotes, Vault): **todas en `lib/shared/rules.ts`**.

## 12. Cómo se opera

| Quiero… | Comando |
|---|---|
| Ver la app | `npx expo start --web` (en escritorio ≥ 900 px sale una landing: usa el móvil) |
| Levantar la API en local | `npm run dev:api` (puerto 3000, lee `.env.local`) |
| Comprobar tipos / lint | `npm run typecheck` · `npm run lint` |
| Datos de demo | `npm run seed` (o `-- user_XXXX` con tu id de Whop) *(main)* |
| Medir la IA con el set | `npm run eval -- v1-baseline gemini-3.6-flash` |
| Sembrar el set como casos de jurado | `npm run seed:eval` |
| Presupuestar un lote de apelaciones (gratis) | `npm run batch:launch` |
| Lanzar un lote (gasta saldo) | `npm run batch:launch -- --launch` |
| Registrar el webhook de Whop | `npm run whop:webhook -- --replace` *(main)* |

## 13. Cuentas y piezas externas (ids, no secretos)

| Dónde | Dato |
|---|---|
| Vercel | proyecto `pacta` · producción `pacta-theta.vercel.app` |
| Supabase | proyecto compartido TexhCo (`ajtczfcxzxgpicyefrwa`), esquema `pacta`, rol `pacta_app` |
| Terac | organización "Pacta" (`pacta-mvmmnfkd`) · proyecto `p8dmfvdhpo83oo2hou52gbes` · estudio ronda 1 `d32resa6t76d99lnsvhxqu5w` · webhook `q0kezx9h6yjflr5kp4l9auej` (confirmado) |
| Whop *(main)* | negocio `pacta` `biz_3luEKKKfUOfpk8` · app `app_3r1c2LEetOyasW` · Pass `prod_QdKfivmFTDf6L` |

Los secretos (API keys, `DATABASE_URL`, secretos de webhooks) están solo en Vercel y en `.env.local`.

## 14. Estado y lo que falta

| Fase | Estado |
|---|---|
| 0 Entorno · 1 Diseño y Pax · 3 API y datos | ✅ |
| 2 Pantallas | 🟡 falta probar en móvil real |
| 4 Whop | 🟡 falta el webhook en producción y un pago real de $5 |
| 5 Agente + Terac | 🟡 falta la respuesta de la ronda 1, `calibrate` y `v2-terac`, y fotos reales |
| 6 Pax | 🟡 micro-pasos hechos; falta el Pax reactivo |
| 7 Vault y Trust | ✅ falta la micro-tarea de clemencia |
| 8 Embeber en Whop | 🟡 falta instalar la app en Whop y comprobar el token |
| 9 Demo | 🟡 vídeo animado local de 2 minutos en inglés preparado ([docs/10](docs/10-video-pitch.md)); faltan el ensayo y la demo con verificaciones reales |

**Decisiones abiertas:** dominio propio, logo oficial, cuándo activar `TERAC_AUTO_LAUNCH`, si subir el stake máximo (hoy $20) y el umbral de revisión humana ($30–40 en producción).

## 15. Ramas y trabajo en paralelo

Hay trabajo en `main` (fases 4, 7 y 8: Whop, Vault, identidad) y en la rama `brand/logo-iconos` (apelación con fianza, lotes, jurado, Pax con Gemini). Al integrarlas habrá conflictos pequeños en `lib/server/pact-engine.ts`, `api/pacts/[id]/[action].ts`, `lib/shared/types.ts`, `lib/shared/rules.ts`, `lib/store/pacts.tsx`, `lib/routes.ts`, `components/ui/State.tsx` y `.env.example`. **Desplegar con `vercel deploy --prod` desde una rama sube el árbol de trabajo y puede retroceder producción**: lo seguro es desplegar desde `main`.

## 16. Trampas y cosas que ya aprendimos

- **Terac** no admite 1 juez desde la API ni fijar el incentivo; crear borradores no es idempotente (un fallo de red deja duplicados); la sandbox no está disponible en esta cuenta, así que un voto real solo se prueba con un juez real.
- **Whop** no tiene sandbox (todo es dinero real) y no devuelve su comisión al reembolsar.
- **Gemini** devuelve 503 en picos: el agente reintenta con espera; si sigue fallando, el pacto queda en revisión y **nunca se aprueba por error**.
- **Si la IA se cae** no penaliza: la caducidad de 48 h solo cuenta si la IA llegó a opinar.
- **Vercel Hobby:** 12 funciones y cuerpos de petición de ~4,5 MB (las fotos se reducen a 1024 px antes de subirlas).
- **Fotos de IA en la evaluación:** contaminan la verdad de referencia (ver sección 9).

## 17. Mapa de documentos

Vídeo de pitch de 120 segundos en inglés: [docs/10-video-pitch.md](docs/10-video-pitch.md). Es motion graphics con ejemplos ilustrativos; no cambia qué funciones están en producción ni qué pagos o votos se han comprobado.

| Documento | Para qué |
|---|---|
| [README.md](README.md) | Pitch, decisiones y flujo en una imagen |
| **COMO-FUNCIONA.md** (este) | Cómo funciona todo hoy |
| [ROADMAP.md](ROADMAP.md) | Avance real fase a fase y registro de cambios |
| [docs/01-producto.md](docs/01-producto.md) | Mecánica: pactos, Trust, Vault, niveles |
| [docs/02-arquitectura.md](docs/02-arquitectura.md) | Arquitectura, estructura, datos y máquina de estados |
| [docs/03-whop.md](docs/03-whop.md) | Whop: CLI, app, productos, webhooks, reembolsos |
| [docs/04-agente-terac.md](docs/04-agente-terac.md) | Agente, Terac, precios, apelaciones, lotes, calibración |
| [docs/05-infra-github-vercel-supabase.md](docs/05-infra-github-vercel-supabase.md) | Infraestructura y variables de entorno |
| [docs/06-plan-8h-y-demo.md](docs/06-plan-8h-y-demo.md) | Plan original del hackathon (histórico) |
| [docs/07-pact-circles.md](docs/07-pact-circles.md) | Retos en grupo cooperativos (opcional) |
| `docs/09-demo-y-entrega.md` *(main)* | Pasos manuales, guion de 2 minutos y entrega |
