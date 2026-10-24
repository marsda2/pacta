# 04 · Agente auditor + jurado humano en Terac

> El 40% de la nota es demostrar una **mejora medible impulsada por humanos**. Este documento es el núcleo de eso.

Los nombres de las tools, campos y callbacks de Terac están marcados con **[verificar]**: confírmalos con la documentación o el equipo de Terac en el evento.

## 1. Agente auditor (Claude visión)

**Entrada:** URL firmada de la foto, título del pacto, `day_code` esperado, `emotional_state` y la hora de captura.

**Salida estructurada (JSON schema / tool use):**

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

**Regla de oro (en `pact-engine`, no en el prompt):**
- `verdict = APPROVE` **y** `confidence ≥ 0.88` **y** `cheat_signals = ["none"]` **y** `emotional_state != overwhelmed` → aprobado por el agente.
- En cualquier otro caso → **duda**, y quién la resuelve depende del stake (sección 7). **No va siempre a Terac.**
- El umbral (0.88) es una constante en `lib/shared/rules.ts`.

**Prompts versionados** en la tabla `agent_prompts`:
- `v1-baseline`: instrucciones genéricas. A propósito, se deja engañar por fotos de una pantalla o por pruebas viejas.
- `v2-terac`: v1 + reglas aprendidas + ejemplos few-shot sacados de los votos de Terac (sección 4).

Modelo: `gemini-3.6-flash` por defecto (≈ $0.002 por foto y ~3 s); se cambia con `AGENT_MODEL` (`gemini-*` usa Google, el resto Anthropic). Compáralos con `npm run eval -- v1-baseline <modelo> <modelo>`.

## 2. Conexión con Terac MCP

Dos maneras de conectarse (elige la que Terac soporte):

- **A. Cliente MCP en el servidor:** `lib/server/terac.ts` abre una sesión MCP (`@modelcontextprotocol/sdk`) contra la URL del servidor MCP de Terac con `TERAC_API_KEY` y llama directamente a la tool de crear tarea. Es determinista: recomendada para el flujo de dinero.
- **B. Conector MCP de la API de Claude:** se le pasa el servidor MCP de Terac al agente y es Claude quien decide crear la tarea. Luce más "autónomo", pero es menos predecible. Úsala solo para la generación de micro-tareas, si sobra tiempo.

**Verificado en la doc de Terac (oct 2026, API v2 beta):**

- MCP: `https://terac.com/api/mcp` (HTTP streamable, OAuth al conectar, sin API key). Configurado en `.mcp.json`; se autentica con `/mcp`.
- Tools del MCP: `terac_request_feasibility` → `terac_get_feasibility_request` (hasta `PRICED`, da `cpi_usd`) → `terac_launch_draft_opportunity`; después `terac_get_submissions`, `terac_get_context`, `terac_pause_opportunity`, `terac_list_opportunities`.
- REST (para el servidor en Vercel): base `https://terac.com/api/external/v2`, `Authorization: Bearer <API key>`. Spec: `https://terac.com/docs/developers/openapi.json`.
- **Terac no tiene "tarea con foto + opciones".** Contrata personas (`opportunity`) y estas hacen una `task`: `interview` con `task_url` (una página tuya donde el humano ve la foto y vota), o `file_upload`. Por tanto, PACTA debe alojar una página de jurado (`/jury/[id]`) y usar `review_type: "manual_review"`; el veredicto lo guarda la propia app y se aprueba la submission con `POST /submissions/{id}/approve`. Terac añade `submissionId`/`teracSubmissionId`/`taskId` a la URL.
- Webhooks: eventos `submission.status.change` y `submission.approved`; firma `base64(HMAC-SHA256(secret, X-Terac-Request-Timestamp + cuerpo))`. Hay sandbox (`POST /opportunities/{id}/test-submissions`) para probarlos sin pagar.

**Tarea que se crea** (la forma de abajo es el diseño original; adáptala a lo anterior):

```
title:        "Audit proof for pact #<id>"
instructions: "El usuario apostó $<stake> a: '<título>'. Debe verse el código <day_code> escrito a mano.
               ¿Lo cumplió de verdad o es una prueba falsa o de bajo esfuerzo?
               Si pide clemencia por agobio, propón una micro-tarea de 10 minutos demostrable con foto."
media:        URL firmada de la foto (validez suficiente para que la revisen: 2–4 h)
options:      APPROVE | REJECT | CHEAT | MICRO_TASK (+ texto libre para la micro-tarea)
callback:     https://pacta.vercel.app/api/webhooks/terac   (si Terac admite webhooks)
```

**Recepción del veredicto:**
- Con webhook: `/api/webhooks/terac` → verificar la firma → `jury_tasks.verdict` → `pact-engine.transition`.
- Sin webhook (respaldo): la pantalla `jury.tsx` hace polling a `GET /api/jury/:id` cada 10 s, y el servidor consulta el estado de la tarea en Terac.
- **Timeout:** si en la demo no hay respuesta en N minutos, el pacto queda en `JURY_PENDING` y se enseña un caso ya resuelto de antes. Nunca dependas de un voto en vivo para la demo.

## 3. Ronda 1 en Terac (lanzar a las 13:00 a más tardar)

Las respuestas humanas tardan, así que se lanzan **pronto**.

Set de **8–10 pruebas reales** guardado en `eval/set.json`, cada una con su etiqueta "verdad":

| # | Prueba | Etiqueta esperada |
|---|---|---|
| 1–3 | Legítimas (gimnasio, libro abierto, comida sana) con el código visible | APPROVE |
| 4 | Foto de una **pantalla de otro monitor** con la tarea | CHEAT |
| 5 | Apunte viejo o foto reutilizada (sin código o con un código incorrecto) | CHEAT |
| 6 | Escena que no tiene nada que ver | REJECT |
| 7 | Legítima pero ambigua (mala luz) | APPROVE |
| 8 | "Estoy agobiado, no pude" → pide clemencia | MICRO_TASK |

Preguntas a los humanos: **(A)** ¿legítima o trampa?, y por qué; **(B)** si pide clemencia, ¿qué micro-tarea de 10 minutos le exigirías?

## 4. "After": calibración del agente (16:00)

`POST /api/admin/calibrate`:
1. Lee los veredictos y motivos de Terac de la ronda 1.
2. Le pide a Claude que los resuma en **reglas** ("si la imagen tiene muaré o bordes de pantalla → screen_photo") y elige 3–4 ejemplos few-shot.
3. Guarda `agent_prompts.v2-terac`.
4. Ejecuta **el mismo set** con v1 y con v2 y guarda `eval_runs` para cada uno.

Métricas para la pantalla `admin/calibration.tsx`:

| Métrica | v1-baseline | v2-terac |
|---|---|---|
| Precisión frente a las etiquetas humanas | ej. 5/8 | ej. 8/8 |
| Trampas detectadas | 0/2 | 2/2 |
| Aprobaciones falsas (dinero liberado a un tramposo) | 2 | 0 |
| % de casos derivados a humanos | — | — |

Además, **una demo en vivo**: la misma foto de pantalla pasa con v1 (✅ se liberaría el dinero) y queda bloqueada con v2 (🔒 Vault + jurado). Es el momento clave del pitch.

> No inventes números: la tabla tiene que salir de `eval_runs` reales. Si v2 no mejora, ajusta las reglas y vuelve a ejecutar. Ese ciclo también es una historia válida.

## 5. Votos de amigos (Pact Circles) frente a Terac

Si se construye Pact Circles (ver 07), los votos del círculo son **etiquetas débiles**. No entran en `eval/set.json` ni en la calibración: la verdad de referencia es siempre Terac. Se guardan en `circle_votes` y sirven para una métrica aparte, la **tasa de acuerdo entre amigos y Terac**.

## 6. Micro-tareas de clemencia
- Ronda 1: las proponen los humanos de Terac.
- Después de calibrar: el agente genera micro-tareas al estilo de las humanas (few-shot con las propuestas de Terac), y Terac solo revisa la prueba de la micro-tarea si hay dudas.

## 7. Cuándo interviene un humano (coste)

Un juez de Terac cuesta más que la comisión de un pacto pequeño: el incentivo mínimo por estudio es $5 y Terac añade un 50% (≈ $7.50 por estudio). Con **lotes** el coste por caso baja a $1–2: la ronda 1 son 12 fotos por $16.50 (≈ $1.38 por foto).

| Situación | Quién decide | Dónde vive |
|---|---|---|
| La IA está segura (`shouldAutoApprove`) | La IA, gratis | `rules.ts` |
| Duda y stake **< `HUMAN_REVIEW_MIN_STAKE_CENTS`** | Sin humano: **segunda prueba** (máx. 2), **testigo** o apelación. Si en 48 h nadie lo resuelve → Vault (−30 de Trust, no −50) | `reviewProof`, `submitProof`, `expireOverdue` |
| Duda y stake **≥ umbral** | Jurado de Terac (caso abierto al instante) | `reviewProof` → `openJuryCase` |
| **Apelación** del usuario | Jurado de Terac | `POST /api/pacts/:id/appeal` |
| Trampa | Solo se castiga (−50 y 7 días sin retiros) si el jurado vota `CHEAT`; la sospecha de la IA sola nunca lo hace | `closeJuryTask` |

- Equivocarse con un stake bajo sale barato: el dinero no se pierde, pasa al Vault y se recupera reconstruyendo el Trust.
- El umbral por defecto es **$20** (el stake máximo actual, por la falta de sandbox en Whop). En producción súbelo a $30–40 con `HUMAN_REVIEW_MIN_STAKE_CENTS`. La demo usa apelaciones y trampas para enseñar al jurado.
- **Apelaciones:** el High-Yield Pass incluye `APPEALS_PER_MONTH_PASS` (2) al mes. En Free una apelación exigirá un pago con Whop (fase 4); hasta entonces responde `402 appeal_requires_pass` salvo con `FREE_APPEALS=true` (demo).
- La caducidad de 48 h solo cuenta si la IA llegó a opinar: una caída del proveedor no penaliza al usuario.
- **Lotes (pendiente):** los casos de stake alto abren hoy un `jury_task` individual. Para abaratar, un estudio permanente de Terac debe servir una cola (`/jury/queue`, como la ronda 1) y crearse un estudio nuevo cuando haya N casos pendientes.
