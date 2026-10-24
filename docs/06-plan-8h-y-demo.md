# 06 · Plan de ejecución, recortes, riesgos y demo

> **Documento histórico.** Es el plan de las 8 horas del hackathon, escrito antes de construir. El avance real está en el [ROADMAP](../ROADMAP.md), cómo funciona hoy el sistema en [COMO-FUNCIONA.md](../COMO-FUNCIONA.md) y el guion y los pasos de la demo vigentes en `docs/09-demo-y-entrega.md` (en `main`). Cambios respecto a este plan: el agente de visión es **Gemini** (no Claude), el stake mínimo es **$5**, Terac se integra por **REST + una página de jueces nuestra** (no por una tarea con foto y opciones) y la revisión humana depende del stake (ver docs/04 §4).

> Actualizado el 2026-10-24 a las 11:00. El bloque de código empezó a las 10:45 y se han ido ~30 min en planificar (incluido el consejo sobre retos en grupo). El cronograma está recalculado para empezar a las **11:15** y entregar a las **18:45**. Lo recortado sale del pulido, no del núcleo.

## Roles (si hay equipo; si vas solo, sigue el orden de las filas)

| Rol | Se ocupa de | Carpetas |
|---|---|---|
| **A · App** | Pantallas Expo, cámara, dashboard, calibración; pantalla del círculo si da tiempo | `app/`, `components/` |
| **B · Dinero** | Whop (checkout, webhooks, reembolsos), Vault, Trust, `pact-engine`; tablas de Circles si da tiempo | `api/pacts`, `api/webhooks/whop`, `api/vault`, `lib/server/whop.ts`, `pact-engine.ts` |
| **C · Agente** | Visión, Terac, set de evaluación, calibración | `lib/server/vision-agent.ts`, `terac.ts`, `api/proofs`, `api/jury`, `api/admin`, `eval/` |

## Arranque: 11:15–11:45 (en paralelo)

Cada rol termina su lista y lo dice en voz alta antes de las 11:45.

**B · Dinero (Whop)**
- [ ] `whop login` → `whop quickstart` → `whop auth status`
- [ ] App de Whop creada, API key con permisos mínimos, `WHOP_COMPANY_ID`
- [ ] Producto **PACTA Stake** y plan **High-Yield Pass**
- [ ] **Verificar (03):** checkout configuration con importe + `metadata.pact_id` (§3), nombres de los eventos del webhook (§5), **comisión devuelta al reembolsar** (§6), ventana de reembolso / transferencias / promo codes para el rescate (§7)
- [ ] Decidir **Vercel o `whop apps deploy`** (máximo 10 min, sin volver atrás)

**A · App (infra)**
- [ ] Repo en GitHub + scaffold de Expo (`expo-router`, TypeScript) + primer deploy en Vercel con dominio fijo
- [ ] Proyecto de Supabase + migración del esquema de 02 + bucket `proofs`
- [ ] `.env.example` y variables en Vercel (05 §4)

**C · Agente**
- [ ] Clave de Anthropic + una llamada de visión de prueba
- [ ] Credenciales de Terac + **verificar (04 §2):** cómo se crea una tarea, si hay webhook o hay que hacer polling, y cuánto tardan los humanos
- [ ] Empezar a hacer las **8–10 fotos del set de evaluación** (04 §3): legítimas, foto de una pantalla, foto vieja, una que no tiene nada que ver, y una apelación de agobio

## Cronograma (11:15 → 18:45)

| Hora | Objetivo | Hecho cuando… |
|---|---|---|
| **11:15–11:45** | Arranque (lista de arriba) | Web vacía desplegada y todos los **[verificar]** de Whop y Terac contestados |
| **11:45–12:45** | B: crear pacto → checkout → webhook → `ACTIVE`. A: dashboard con datos falsos + pantalla de cámara con el código del día. C: subida de la prueba + agente **v1** | Pago real que pone un pacto en ACTIVE; foto → veredicto JSON en `proofs` |
| **12:45–13:00** | 🚨 C: **lanzar la ronda 1 en Terac** con el set de evaluación. No se retrasa: los humanos tardan | Tareas creadas y sus IDs guardados |
| **13:00–15:00** | C: crear la tarea en Terac desde el flujo + recibir el veredicto (webhook o polling). B: `pact-engine` completo: reembolso, Vault, Trust. A: pantalla del jurado | Un pacto recorre el camino feliz y el de fallo de extremo a extremo |
| **15:00–16:00** | A: las 3 tarjetas con datos reales y el rendimiento simulado en vivo. B: rescate del Vault (una opción de 03 §7) + High-Yield Pass (webhook de membership) | Un rescate real funcionando una vez |
| **16:00–17:00** | C: calibración v1 → v2 con los votos de Terac + `eval_runs`. A: pantalla de calibración. B: limpieza de bugs del flujo de dinero | Tabla del antes/después con números reales |
| **17:00–17:30** | Embeber en Whop (URL del iframe + verificación del token) y sembrar los datos de demo (Vault con saldo, historial de Trust) | La app abre dentro de Whop con datos creíbles |
| **17:30–18:00** | **Opcional: Pact Circles** (07) si pasó la puerta de las 16:00; si no, pulido y bugs | Pantalla del círculo con 4 usuarios sembrados, o la demo sin bugs |
| **18:00–18:35** | Ensayar la demo 3 veces y grabar el vídeo de respaldo | Vídeo de 2 min grabado |
| **18:35–18:45** | Entrega: repo, URL, vídeo y descripción | Enviado |

## Puertas de decisión (go / no-go)

| Hora | Pregunta | Si NO |
|---|---|---|
| **11:45** | ¿Funciona el checkout con metadata y sabemos cómo llegan los veredictos de Terac? | Usar los planes fijos de $1/$5/$10/$20 (03 §3 B) y el polling para Terac |
| **13:00** | ¿Está lanzada la ronda 1 en Terac? | Lanzarla **ya** con las fotos que haya (mínimo 5); todo lo demás espera |
| **15:00** | ¿Un pacto real pasa por pago → foto → IA → Terac → reembolso/Vault? | Parar lo nuevo; los tres roles arreglan el flujo central |
| **16:00** | ¿El flujo central es estable? | **Pact Circles queda fuera** (solo diapositiva). El rescate real pasa a ledger + promo code |
| **17:30** | ¿La app abre dentro de Whop? | Hacer la demo desde la URL de Vercel y contar la integración en el pitch |

## Orden de recorte (si vamos tarde, se corta desde arriba)
0. Pact Circles → se queda en una diapositiva de visión.
1. NFC NTAG 424 DNA (necesita un dev build) → se menciona en el pitch como "siguiente paso".
2. Micro-tareas generadas por el agente → solo las de Terac.
3. Rescate real del Vault → se muestra con el ledger y un promo code.
4. High-Yield Pass funcional → plan creado en Whop + lógica del 90/100% solo en la UI.
5. App nativa → solo web (cámara del navegador con `expo-camera` en web).

**Nunca se recorta:** pago con Whop → veredicto de IA → Terac → reembolso o Vault, y la tabla del antes/después.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Whop no tiene sandbox: dinero real | Stakes pequeños, reembolsar todo al final, una sola tarjeta de prueba del equipo |
| Comisión de Whop no devuelta al reembolsar stakes pequeños | Verificarlo en el arranque (03 §6); si es así, stake mínimo de $5 o PACTA absorbe la comisión |
| Ventana de reembolso o importes en los rescates | Verificarlo en el arranque (03 §7); tener el promo code como respaldo |
| Terac tarda en responder | Ronda 1 antes de las 13:00; polling; casos ya resueltos para la demo |
| La API de Terac o Whop difiere de lo esperado | Todo lo marcado **[verificar]** se contesta antes de las 11:45; los clientes están aislados en `lib/server/*` |
| **Legal**: custodiar fondos y mostrar rendimiento puede estar regulado (transmisión de dinero o valores) | El APY se etiqueta como **simulado**; el dinero lo cobra Whop como compra y lo devuelve como reembolso; en el pitch: "producción requeriría un socio regulado" |
| Alguien propone un bote competitivo entre usuarios | Fuera de alcance: rompe la promesa del Vault y tiene riesgo legal (07) |
| Votos de amigos sesgados contaminan la calibración | Solo Terac es la verdad de referencia; los votos del círculo van aparte (04 §5) |
| Privacidad de las fotos (terceros en el gym, casas) | En la demo, solo fotos del equipo; consentimiento y desenfoque en el roadmap |
| El Wi-Fi del evento falla | Vídeo de respaldo grabado y datos sembrados |

## Guion de la demo (2 minutos)

1. **(0:00) Problema**: "Forfeit te quita $20, te enfadas y borras la app."
2. **(0:15) Pacto**: creo "Gimnasio hoy", stake de $5 → checkout de Whop dentro de Whop → tarjeta *Active Stake* con la cuenta atrás.
3. **(0:35) Trampa**: subo una foto de mi monitor. Con **v1** el agente la aprobaría (lo enseño). Con **v2-terac**: 🔒 trampa detectada → jurado de Terac → $5 al **Vault**, Trust −50.
4. **(1:00) Antes/después**: tabla real (precisión, trampas detectadas, aprobaciones falsas) "gracias a N veredictos humanos de Terac".
5. **(1:20) Vault**: "No has perdido tus $60: rinden un 4.85% (simulado). 2 pactos verificados más y desbloqueas $20." Prueba legítima en vivo → aprobada → reembolso real en Whop → la barra de Trust sube.
6. **(1:40) Negocio y visión**: High-Yield Pass de $9/mes en Whop y 10% de comisión en los rescates Free. Diapositiva **"PACTA Circles para comunidades de Whop"**: retos de grupo cooperativos, donde nadie gana a costa de otro (si está construido, 5 s de la pantalla del círculo). Cero empleados: IA + humanos de Terac a demanda.
7. **(1:55) Cierre**: la frase del pitch del README.

## Material para la entrega
- URL de Vercel (y de la app en Whop), repo de GitHub, vídeo de 2 minutos.
- Captura de la tabla de calibración y de la lista de tareas de Terac.
- Este README como descripción técnica.
- Después de entregar: reembolsar los pagos de prueba que queden (03 §10).
