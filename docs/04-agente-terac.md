# 04 · Agente auditor y jurado humano en Terac

> El 40% de la nota es demostrar una **mejora medible impulsada por humanos**. Este documento es el núcleo de eso. Para una visión de conjunto, empieza por [COMO-FUNCIONA.md](../COMO-FUNCIONA.md). Última revisión: **2026-10-24**; todo lo marcado como "medido" o "verificado" se comprobó contra la API real de Terac.

## 1. Agente auditor (visión)

**Entrada:** la foto, el título del pacto, el `day_code` esperado y el `emotional_state` (`normal` / `overwhelmed`).

**Salida estructurada (JSON schema):**

```json
{
  "task_match": true,
  "day_code_visible": true,
  "cheat_signals": ["screen_photo" | "old_or_reused" | "unrelated_scene" | "staged" | "none"],
  "confidence": 0.0,
  "verdict": "APPROVE" | "UNSURE" | "REJECT",
  "reason": "una frase"
}
```

**Regla de oro (en `lib/shared/rules.ts` → `shouldAutoApprove`, no en el prompt):** el agente aprueba solo si `verdict = APPROVE` **y** `confidence ≥ 0.88` **y** `cheat_signals = ["none"]` **y** `emotional_state != overwhelmed`. En cualquier otro caso hay **duda**, y quién la resuelve depende del stake (§4). **No todo va a Terac.**

**Proveedor y modelo** (`lib/server/vision-agent.ts`): el proveedor se deduce del modelo. `gemini-*` usa Google (por defecto `gemini-3.6-flash`, ≈ $0.002 y ~3 s por foto); cualquier otro usa Anthropic. Se cambia con `AGENT_MODEL`. Reintenta con espera ante 429/5xx (Gemini devolvió 503 por demanda durante las pruebas). Un rechazo o bloqueo del modelo cuenta como duda, nunca como aprobación.

**Prompts versionados** en la tabla `agent_prompts` (`AGENT_PROMPT_VERSION`):
- `v1-baseline`: instrucciones genéricas, sembrado por el código la primera vez.
- `v2-terac`: v1 + reglas aprendidas + ejemplos few-shot sacados de los votos de Terac (§6). **Pendiente.**

**Resultado medido** (`npm run eval -- v1-baseline gemini-3.6-flash`, 12 fotos): precisión **83 % (10/12)**, trampas detectadas 5/6, 1 aprobación falsa (el código escrito digitalmente sobre la foto) y 1 derivación de más (una foto legítima marcada "generada por IA"). Con las 8 fotos fáciles iniciales acertaba el 100 %, por eso se añadieron 4 trampas sutiles. **Limitación:** las 12 fotos están generadas con IA, y el modelo a veces rechaza por eso; ver §5.

## 2. Cómo funciona Terac (verificado)

**Modelo mental.** Terac no "etiqueta una imagen". **Contrata personas**: se crea una *opportunity* (un estudio) y cada persona que pasa el cuestionario hace una *task*. Para nuestro caso la task es `interview` con un `task_url`: **una página nuestra** donde el juez ve la foto y vota. Terac añade `?submissionId=…&teracSubmissionId=…&taskId=…` a esa URL. El voto llega a **nuestro** servidor, no a Terac.

**Ciclo de un juez:**
1. Terac invita a quien pasa los filtros y el cuestionario (después hace una entrevista corta por voz con su IA, sin coste extra pero con más espera).
2. El juez abre `task_url` (`/jury/…`), vota y nuestra API lo guarda en `jury_tasks.raw.votes` (antes comprueba con `GET /submissions/{id}` que es de ese estudio y está `screen_passed` o `in_progress`).
3. La página lo devuelve a `https://terac.com/api/external/callback?…&result=completed`; su envío pasa a `awaiting_review`.
4. Terac manda el webhook `submission.status.change` a `POST /api/webhooks/terac`: **si el juez dejó voto, se aprueba (se le paga); si no, se rechaza.** El estado real se pregunta a la API, no se confía en el cuerpo del evento.

**Conexión:**
- **MCP** (`https://terac.com/api/mcp`, OAuth, sin API key; `.mcp.json`): para trabajar *desde Claude* (crear borradores, ver envíos, aprobar). No lo usa el servidor.
- **REST** (`https://terac.com/api/external/v2`, `Authorization: Bearer TERAC_API_KEY`; spec en `/docs/developers/openapi.json`): lo usa el servidor (`lib/server/terac.ts`). Es API v2 **beta**.
- **Webhook** `q0kezx9h6yjflr5kp4l9auej` → `https://pacta-theta.vercel.app/api/webhooks/terac`, eventos `submission.status.change` y `submission.approved`. Cuerpo `{event_id, event_type, occurred_at, resource_id}` (`resource_id` = la submission). Firma en la cabecera `x-terac-request-signature`: `base64(HMAC-SHA256(secreto, x-terac-request-timestamp + cuerpo))`. Idempotencia con `x-event-id` en `webhook_events`.
- **Sandbox:** `test-submissions` solo funciona en una organización sandbox; la nuestra no lo es. Un voto real solo se prueba con un juez real.

**Precios y límites (medidos creando borradores gratuitos):**

| Dato | Valor |
|---|---|
| Incentivo mínimo por estudio | **$5** |
| Comisión de Terac | **50 %** sobre el incentivo |
| Precio por juez, tarea de 1 a 3 min | **$4.50** ($3 de incentivo) |
| Precio por juez, tarea de 4 a 8 min | $6.00 (a veces $4.50: es una estimación automática y varía) |
| Estudio de 1 juez desde la API | **Rechazado** (el presupuesto de $3 queda por debajo de los $5) |
| Estudio de 2 / 3 / 4 / 5 jueces (1–3 min) | $9.00 / **$13.50** / $18.00 / $22.50 |
| Fijar el incentivo a mano | Solo desde el panel de Terac (la API no deja). Así se hizo la ronda 1: $11 + 50 % = **$16.50** |
| Lanzar sin cuestionario | Rechazado; el cuestionario es obligatorio |
| Crear un borrador | Gratis y **no idempotente**: un fallo de red puede dejar borradores duplicados (se borran con `DELETE /opportunities/{id}`) |

La cuenta es "Pacta" (slug `pacta-mvmmnfkd`, proyecto "Default project"), con **$83.50** de saldo tras la ronda 1.

## 3. Los tres usos del jurado

| Uso | Estudio de Terac | Jueces | Cierra el pacto |
|---|---|---|---|
| **Ronda 1** (calibración) | Uno, lanzado a mano (`d32resa6t76d99lnsvhxqu5w`), 12 fotos | 1 | No: solo guarda votos (`raw.round = 1`) |
| **Apelación** | Uno por **lote** de 3–5 apelaciones (§4) | 3 (mayoría) | Sí, con la fianza |
| **Stake alto** (duda de la IA con stake ≥ umbral) | Caso individual atado a `TERAC_JURY_OPPORTUNITY_ID` (sin automatizar del todo) | 1 | Sí |

La página de los jueces es `/jury/[id]` (un caso) o `/jury/queue` (varios casos; `/jury/round1` es el mismo componente porque ese estudio ya la tenía registrada). La API de la cola vive en `api/jury/round1.ts` (nombre histórico) para no pasar el límite de **12 funciones** de Vercel Hobby.

## 4. Revisión humana, apelaciones y coste

Un juez de Terac cuesta más que la comisión de un pacto pequeño, así que **un humano no interviene siempre**:

| Situación | Quién decide |
|---|---|
| La IA está segura | La IA, gratis |
| Duda y stake **< `HUMAN_REVIEW_MIN_STAKE_CENTS`** (hoy $20) | Sin humano: **segunda prueba** (máx. 2), **testigo** o **apelación**. Si en 48 h nadie lo resuelve → Vault (−30 de Trust, no −50) |
| Duda y stake **≥ umbral** | Jurado de Terac, caso abierto al instante (coste de PACTA) |
| **Apelación** del usuario | Panel de 3 jueces de Terac |
| Trampa | −50 de Trust y 7 días sin retiros **solo si el jurado vota `CHEAT`**; la sospecha de la IA sola nunca lo hace |

- Equivocarse con un stake bajo sale barato: el dinero no se pierde, pasa al Vault y se recupera reconstruyendo el Trust.
- El umbral es $20 porque el stake máximo es $20 (Whop no tiene sandbox). En producción, súbelo a $30–40 con `HUMAN_REVIEW_MIN_STAKE_CENTS`.
- La caducidad de 48 h solo cuenta si la IA llegó a opinar: una caída del proveedor no penaliza al usuario.

**Apelación con fianza** (`appealPact`, `lib/shared/rules.ts` → `APPEAL_*`, pantalla `app/pact/[id]/appeal.tsx`):

| Condición | Valor |
|---|---|
| Quién puede | Stake **≥ $15**; con el High-Yield Pass, cualquier stake (2 al mes, sin fianza) |
| Cuándo | Mientras el pacto está en `AI_REVIEW` (48 h desde la duda de la IA) |
| Fianza | **$7.50**, que sale del stake que PACTA ya retiene: no se cobra nada nuevo |
| Pruebas extra | Hasta **2 fotos** y una **nota** de 280 caracteres, que ven los jueces |
| Panel | **3 jueces**, mayoría estricta (sin mayoría → rechazo; trampa solo con mayoría de `CHEAT`) |
| Si gana el usuario | Stake devuelto **entero**, sin fianza, +20 de Trust. Es un falso rechazo de la IA: ejemplo para calibrar |
| Si pierde | El stake va al Vault **menos la fianza** (`vault_ledger` tipo `fee`), −30 de Trust (−50 si es trampa) |

**El problema del coste y por qué hay lotes.** Un estudio de 3 jueces cuesta **$13.50** (hasta $18), más que la fianza de $7.50. Por eso las apelaciones **esperan en una cola** (`jury_tasks` con `raw.appeal = true` y sin estudio) y `launchBatch` (`lib/server/appeal-study.ts`) las agrupa en **un solo estudio de 3 jueces**:

| Casos en la cola | Cuándo se lanza | Duración | Coste por caso (con $13.50) |
|---|---|---|---|
| 3 a 5 | Al momento | 5–8 min (1,5 min por caso) | $4.50 a $2.70 |
| 2 | Tras 24 h | 3 min | ≈ $6.75 |
| 1 | Tras 48 h | 3 min | $13.50 (lo asume PACTA) |

Cada juez vota **todos** los casos en una página; cada caso se cierra solo al llegar a 3 votos y aplica el veredicto. La fianza de $7.50 cubre el coste en todos los casos salvo el suelto.

**Lanzamiento apagado por defecto.** Cada lote gasta saldo de Terac, así que el disparador automático (al apelar y al leer pactos) solo actúa con `TERAC_AUTO_LAUNCH=true`. A mano: `npm run batch:launch` (simulación: crea un borrador, lee el precio y lo borra) y `npm run batch:launch -- --launch` (lanza de verdad; `--force` ignora el tamaño mínimo). Con el automático apagado, una apelación queda en la cola sin gastar nada.

## 5. Ronda 1 y set de evaluación

`eval/set.json` + `eval/images/`: **12 pruebas etiquetadas** (se ejecutan con `npm run eval`; se siembran como casos del jurado con `npm run seed:eval`).

| # | Prueba | Etiqueta |
|---|---|---|
| 01–03 | Legítimas (gimnasio, libro, comida) con el código visible | APPROVE |
| 04 | Foto de una pantalla de monitor (se ve el marco) | CHEAT |
| 05 | Papel con el código equivocado (W2KC, esperado H4NB) | CHEAT |
| 06 | Escena sin relación (perro en la playa) | REJECT |
| 07 | Legítima con poca luz | APPROVE |
| 08 | "Agobiado, no pude" | MICRO_TASK |
| 09 | Pantalla recortada a pantalla completa, sin marco | CHEAT |
| 10 | Gimnasio con el código escrito digitalmente encima | CHEAT |
| 11 | Foto publicitaria de estudio de otra persona | CHEAT |
| 12 | Foto de una foto impresa | CHEAT |

**Estado:** lanzada el 2026-10-24 a las 19:33 UTC desde el panel de Terac (1 juez, $16.50, ventana hasta el 31-oct). En la última comprobación había 0 envíos. El estudio pide un cuestionario corto (familiaridad con fotos editadas, inglés).

**Limitación importante:** las 12 fotos son de IA (Nano Banana y Pillow), no hechas con un móvil. Gemini marca algunas por "parecer generadas", y un humano también puede votar "fake" por eso. Para una verdad de referencia defendible hay que sustituirlas por unas 10 fotos reales (3 buenas con código, 1 con poca luz, trampas físicas como fotografiar una pantalla o una impresión, código equivocado, escena irrelevante, "agobiado").

## 6. "After": calibración del agente (pendiente)

`POST /api/admin/calibrate` (aún no existe):
1. Lee los veredictos y motivos de Terac de la ronda 1 y los **de las apelaciones ganadas** (falsos rechazos).
2. Resume los votos en **reglas** ("si la imagen tiene bordes de pantalla → `screen_photo`") y elige 3–4 ejemplos few-shot.
3. Guarda `agent_prompts.v2-terac`.
4. Ejecuta **el mismo set** con v1 y con v2 y guarda `eval_runs` para cada uno (`npm run eval -- v2-terac`).

La tabla para los jueces (precisión, trampas detectadas, aprobaciones falsas, % derivado a humanos) debe salir de `eval_runs` reales: **no se inventan números**. Si v2 no mejora, se ajustan las reglas y se repite; ese ciclo también es una historia válida. Demo en vivo: la misma foto trampa pasa con v1 y queda bloqueada con v2.

## 7. Votos de amigos (Pact Circles) frente a Terac

Si se construye Pact Circles (ver 07), los votos del círculo son **etiquetas débiles**. No entran en `eval/set.json` ni en la calibración: la verdad de referencia es siempre Terac. Se guardan en `circle_votes` y sirven para una métrica aparte, la **tasa de acuerdo entre amigos y Terac**.

## 8. Micro-tareas de clemencia (pendiente)

- Ronda 1: las proponen los humanos de Terac (la página pide una micro-tarea de 10 minutos cuando el usuario dice estar agobiado).
- Después de calibrar: el agente genera micro-tareas al estilo de las humanas (few-shot con las propuestas de Terac), y Terac solo revisa la prueba de la micro-tarea si hay dudas. El veredicto `MICRO_TASK` aún no se aplica al pacto.
