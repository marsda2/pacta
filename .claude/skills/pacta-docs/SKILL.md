---
name: pacta-docs
description: Mantiene al día la documentación viva de PACTA (README, ROADMAP, COMO-FUNCIONA y docs/). Úsala AL EMPEZAR cualquier sesión en este repo, antes de tocar código, para leer el estado real (fase, qué está en producción o en simulación, qué cuesta dinero); y de nuevo AL TERMINAR un cambio que altere cómo funciona algo — una regla, un precio, un endpoint, una variable de entorno, la fase, algo que pasa de simulado a real, o algo que no funcionó como se pensaba — para actualizar los .md. También si el usuario dice "actualiza los docs/readmes", "recuérdame cómo funciona" o "en qué fase estamos".
---

# Documentación viva de PACTA

Los `.md` de este repo son la memoria del proyecto: varias sesiones trabajan en paralelo y ninguna recuerda a las demás. Si un doc miente, la siguiente sesión toma malas decisiones. **El código manda**: si doc y código discrepan, corrige el doc (y dilo).

## 1. Al empezar (lee antes de tocar código, ~2 min)

1. **[COMO-FUNCIONA.md](../../../COMO-FUNCIONA.md)**: cómo funciona todo hoy, condiciones, precios de Terac, interruptores.
2. **[ROADMAP.md](../../../ROADMAP.md)**: fase actual, qué falta, registro de cambios.
3. **[README.md](../../../README.md)**: pitch y decisiones ya tomadas.
4. El doc del área que vas a tocar:

| Área | Doc | Código |
|---|---|---|
| Reglas, Trust, Vault, niveles | `docs/01-producto.md` | `lib/shared/rules.ts`, `lib/shared/vault.ts` |
| Arquitectura, datos, estados | `docs/02-arquitectura.md` | `lib/server/pact-engine.ts`, `supabase/migrations/` |
| Whop (pagos, Pass, iframe) | `docs/03-whop.md` | `lib/server/whop.ts`, `identity.ts` |
| Agente de visión, Terac, jurado, apelaciones, precios | `docs/04-agente-terac.md` | `vision-agent.ts`, `terac.ts`, `jury-queue.ts`, `appeal-study.ts`, `api/jury/` |
| Infra, variables, despliegue | `docs/05-infra-github-vercel-supabase.md` | `vercel.json`, `.env.example` |
| Demo y entrega | `docs/09-demo-y-entrega.md` | — |
| Plan original del hackathon | `docs/06-plan-8h-y-demo.md` | **histórico: no se actualiza** |

5. **Otras sesiones y ramas**: `git fetch`, `git log --oneline origin/main -10` y `git status`. Hay trabajo en paralelo (otra rama o un worktree en `TestWhoop-main`); no pises sus cambios.

Si el usuario pregunta "en qué fase estamos" o "qué está en producción", responde desde estos docs y **verifica lo dudoso en el código** antes de afirmarlo.

## 2. Cuándo actualizar (disparadores)

Actualiza los docs **en la misma tarea** en que ocurre cualquiera de estas cosas:

- Algo **no funciona como pensábamos**: una API distinta a la documentada, un límite o precio medido, un diseño que hubo que cambiar. Escribe qué se creía, qué es de verdad y la fecha.
- Cambia una **regla o constante** (`lib/shared/rules.ts`), un **endpoint**, una **tabla o migración**, una **variable de entorno** o un **script npm**.
- Cambia el **estado de una fase o tarea** (✅ hecho · 🟡 parcial · ⬜ pendiente · ⛔ bloqueado).
- Algo pasa de **simulado a real** o al revés (rendimiento del Vault, pagos, sandbox), o de **producción a solo local**.
- Se **enciende o apaga un interruptor** (p. ej. `TERAC_AUTO_LAUNCH`, `FREE_APPEALS`, `WHOP_REQUIRE_USER_TOKEN`) o se **lanza algo que cuesta dinero** (un estudio de Terac, un pago de Whop) o cambia un saldo o precio.
- Se **despliega**, o se descubre qué hay realmente en producción.

## 3. Qué archivo tocar

| Cambio | Archivo(s) |
|---|---|
| Cualquier avance o retroceso | `ROADMAP.md`: estado de la fase **y** una fila nueva en el registro de cambios (fecha absoluta + qué) |
| Cambia cómo funciona algo, un número, un interruptor o el estado de una pieza | `COMO-FUNCIONA.md` (y su fecha de "Última revisión") |
| Detalle de un área | el `docs/NN-*.md` correspondiente |
| Decisión tomada o flujo general | `README.md` (tabla de decisiones, índice, flujo) |
| Variable de entorno nueva | `.env.example` con un comentario, y la tabla de `docs/05` |
| Lección aprendida / trampa | `COMO-FUNCIONA.md` §16 |

Las **constantes viven en `lib/shared/rules.ts`**: los docs las citan por nombre y valor; si cambian, actualiza ambos.

## 4. Cómo escribir

- Español, tablas cortas, hechos comprobados. Fechas absolutas (`2026-10-24`), nunca "hoy".
- Distingue siempre: **real / simulado**, **encendido / apagado**, **en producción / solo en una rama o en local**, **medido / supuesto**.
- Nada de números inventados: la tabla del antes y después sale de `eval_runs`; los precios de Terac se miden (los borradores son gratis).
- Si algo se probó y falló, escribe que falló y por qué.
- **Nunca** pongas secretos (claves, `DATABASE_URL`, secretos de webhooks). Los ids públicos (proyecto, estudio, producto) sí.
- Enlaza en vez de duplicar. No documentes como hecho algo que solo es un plan.

## 5. Flujo al terminar una tarea

1. Lista qué cambió **en comportamiento** (no en líneas de código).
2. Edita los docs afectados con cambios pequeños; no reescribas documentos enteros ni cambies su estructura.
3. Comprueba lo escrito contra el código (`grep` de la constante, el endpoint o la variable).
4. Si otra rama toca el mismo doc (`git diff origin/main -- <archivo>`), parte de su versión y añade lo tuyo, para que el merge no choque.
5. En tu resumen final, di en una línea **qué docs actualizaste**. No hagas commit salvo que te lo pidan.

## 6. No hacer

- No edites `docs/06-plan-8h-y-demo.md` (histórico) ni los informes del consejo (`council-*.md`) ni `docs/references/`.
- No cambies `AGENTS.md` salvo petición del usuario.
- No marques una fase como ✅ si falta una comprobación real (p. ej. un pago real, un voto real de Terac): pon 🟡 y di qué falta.
