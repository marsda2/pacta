# 09 · Demo, vídeo de respaldo y entrega

> Fase 9 del [ROADMAP](../ROADMAP.md). Sustituye al guion de [06](06-plan-8h-y-demo.md) con lo que está construido de verdad. Cada paso dice en qué pantalla estás y qué pasa si falla.

## 1. Antes del ensayo (una vez, ~15 min)

Estos pasos tocan dinero, secretos o la cuenta de Whop, así que los haces tú. Todo lo demás ya está desplegado.

| # | Qué | Cómo | Hecho cuando… |
|---|---|---|---|
| 1 | Webhook de Whop en producción | `npm run whop:webhook` (crea el webhook, guarda el secreto en `.env.local` y lo sube a Vercel) y después redespliega | `whop webhooks list` muestra la URL `…/api/webhooks/whop` |
| 2 | App de Whop | Dashboard → Developer → app **PACTA** → *Hosting*: base URL `https://pacta-theta.vercel.app`, *Experience view* `/experiences/[experienceId]` | Instalada en el negocio `pacta` y visible en la barra lateral |
| 3 | Id de la app en Vercel | `WHOP_APP_ID` y `EXPO_PUBLIC_WHOP_APP_ID` = `app_…` (production) y redesplegar | Dentro de Whop, "Confirm pact" abre el modal de pago de Whop sin salir |
| 4 | Pago real de prueba | Desde la app **dentro de Whop**: pacto de $5 → pagar con tu tarjeta | El pacto pasa a *In progress* sin recargar (el webhook lo activó) |
| 5 | Reembolso real | En ese pacto: prueba aprobada por la IA, el testigo (*Approve*) o *Simulate: pact kept* en el resultado | `whop payments list` muestra el pago reembolsado |
| 6 | Datos de la demo | `npm run seed -- user_XXXX` con tu id de Whop (la app dentro de Whop) y `npm run seed` (la URL de Vercel) | Home: Trust 55, racha 2, Vault $60 y "1 more verified pact and 15 Trust points to unlock $20" |

Tu id de Whop (`user_…`) sale en `whop auth status` (campo `identity.id`).

## 2. Guion de 2 minutos

Graba y ensaya con la app **dentro de Whop** en el escritorio y el móvil al lado para la foto. Plan B en cada fila.

| Tiempo | Dices | Haces | Si falla |
|---|---|---|---|
| 0:00 | "Forfeit te quita $20, te enfadas y borras la app." | Home con Pax | — |
| 0:15 | "Pacto: gimnasio hoy, $5 en juego. Se paga con Whop, sin salir de Whop." | *Create a pact* → $5 → *Confirm pact* → modal de Whop → pagar | Enseña el pacto *Finish the proposal* ya activo (sembrado) |
| 0:35 | "La prueba es una foto en vivo con el código del día. Si la IA duda, decide un humano de Terac." | Pacto → *Add proof* → foto con el código | Foto de una pantalla: la IA no la aprueba y aparece el reintento o la apelación |
| 1:00 | "Antes y después: N veredictos humanos de Terac corrigieron al agente." | Tabla de calibración (fase 5) | Captura de la tabla y de la lista de tareas de Terac |
| 1:20 | "Si fallas, tu dinero no desaparece. Aquí están mis $60, rindiendo un 4.85 % simulado." | Home → tarjeta del Vault → pantalla del Vault | — |
| 1:30 | "Me faltaba un pacto verificado. Lo acabo de cumplir: ya puedo desbloquear $20." | Vuelve al pacto activo, prueba aprobada (o *Simulate: pact kept*) → Vault → *Unlock $18* | Con los datos sembrados el rescate va al ledger; un rescate con dinero real necesita un stake fallado pagado |
| 1:45 | "Free recupera el 90 %. El High-Yield Pass, $9 al mes en Whop, el 100 % más el rendimiento." | *Your plan* en el Vault | — |
| 1:55 | Cierre: la frase del pitch del README | — | — |

Reglas del ensayo: tres pasadas completas con cronómetro; entre pasadas, `npm run seed -- user_XXXX` para volver al estado inicial; si una pasada pasa de 2:10, recorta la frase de 1:00.

## 3. Vídeo de respaldo

Es el plan B si el Wi-Fi o Whop fallan en directo, y suele ser lo que ven los jueces después.

- **Formato**: 1080p, 2 minutos como máximo, mismo guion que arriba, voz en off grabada aparte si el directo sale con titubeos.
- **Captura**: escritorio con Win + Alt + R (Xbox Game Bar) u OBS; móvil con su grabación de pantalla nativa para el momento de la foto.
- **Planos** (en este orden, cortes limpios entre ellos):
  1. PACTA dentro de Whop, Home con Pax saludando (3 s).
  2. Crear el pacto y el modal de pago de Whop (10 s).
  3. Móvil: la foto en vivo con el código del día (8 s).
  4. Pantalla de resultado: aprobado o duda → humano de Terac (10 s).
  5. Tabla antes/después de la calibración (10 s).
  6. Vault: saldo, rendimiento simulado, progreso del tramo y *Unlock* (15 s).
  7. *Your plan*: Free 90 % frente a High-Yield Pass (5 s).
  8. Logo y la frase del pitch (5 s).
- **Texto en pantalla**: "Rendimiento simulado" siempre que se vea el APY (riesgo legal, docs/06).
- Graba dos tomas de cada plano. Monta con lo que tengas a mano (Clipchamp viene con Windows).

## 4. Entrega

- URL de Vercel, enlace de la app en Whop, repo de GitHub y el vídeo.
- Capturas: tabla de calibración, lista de tareas de Terac, pantalla del Vault.
- El README como descripción técnica.
- **Después de entregar**: reembolsa los pagos de prueba que queden (`whop payments list --format json` y `whop payments refund pay_xxx`, ver [03 §10](03-whop.md)) y cancela tu suscripción de prueba al Pass si la activaste.
