# Transcripción del consejo: retos en grupo para PACTA (2026-10-24)

## Pregunta original del usuario
> Podría haber retos con amigos: el que menos uso de TikTok, Instagram, etc. tenga en X tiempo (un reto para concentrarse en lograr algo) se lleva parte del dinero puesto en el fondo del grupo si es el ganador; o, si es un reto de tiempo de uso, un reparto proporcional al top % en que ha quedado. También con el gym: un grupo o comunidad que entrena 4 días a la semana, y los que no cumplen le dan dinero a los otros. Añádelo al plan o mejora la idea.

## Pregunta enmarcada
Hackathon de 8 h en Whop HQ. PACTA Autonomous Vault: stake $1–$20 con Whop Checkout (sin sandbox), foto en vivo + código del día, auditor de visión Claude, jurado humano Terac MCP en la zona gris; si cumples se reembolsa, si fallas el dinero va a un Redemption Vault (APY simulado) que se desbloquea recuperando el Trust Score. El 40% de la nota es la mejora medible del agente gracias a Terac. Propuesta: retos en grupo con bote común (foco, con ganador o reparto por percentil; gym 4 días/semana, donde los que fallan pagan a los que cumplen). ¿Cómo encaja, cómo mejorarla, qué cabe en 8 h, riesgos legales y de trampas, y cómo se refleja en los docs?

## Respuestas de los asesores

### El Contrarian (Response D)
**El fallo de fondo: esto convierte tu producto en otro producto.** PACTA se defiende en lo legal y lo narrativo con una frase: "el dinero no se pierde, va al Vault y vuelve". El bote de grupo rompe esa frase. Si el que falla paga al que cumple, el dinero sí se pierde y pasa a otra persona. Eso es un concurso de habilidad con premio en dinero entre usuarios. En EE. UU. entra en terreno de leyes estatales de juego y de money transmission, y como mínimo en una revisión de cumplimiento de Whop. No lo vas a resolver en un hackathon, y lo haces delante de los jueces de Whop, en su HQ y con dinero real porque no hay sandbox.

**El criterio que vale el 40% no gana nada.** Terac sirve para calibrar veredictos dudosos sobre fotos. El ranking de uso del móvil no tiene fotos ni casos dudosos que mandar a un jurado humano. Le quitas horas a lo que puntúa.

**Medir el uso de apps es imposible hoy.** No hay entitlement de Family Controls, Expo Go no carga módulos nativos y no da tiempo a un dev build. Lo único que queda es una captura del panel de Tiempo de uso, y eso se falsifica en 30 segundos (inspeccionar elemento, otro dispositivo, una cuenta secundaria). Además, cuando hay dinero entre amigos, aparece la colusión: dos se ponen de acuerdo, uno "falla" a propósito y se reparten el bote.

**El incentivo se pervierte.** En un bote de suma cero, quieres que tus amigos fallen. Eso es lo contrario de la "redención" que vendes.

**Qué haría:** no construir nada de esto hoy. Si quieres el ángulo social, que sea un "Pacto de grupo" sin redistribución: cada uno con su propio stake. El que falla va a su propio Vault. El grupo solo comparte el ranking del Trust Score y la presión social. Los amigos pueden hacer de jurado, como fuente extra de veredictos humanos para Terac. **En los docs:** una sección "Roadmap post-hackathon: Group Pacts" con el modelo sin redistribución, la nota legal y la medición de pantalla marcada como bloqueada por los permisos nativos. Que conste que lo descartaste a propósito y no por despiste.

### El de Primeros Principios (Response E)
Primero: ¿qué intentas ganar hoy? No un producto de apuestas sociales. Intentas demostrar, en 8 horas, que **los veredictos humanos de Terac mejoran de forma medible al agente** (el 40% de la nota). Mide cada idea nueva con esta pregunta: ¿genera más veredictos humanos etiquetados y un "antes/después" más claro? El bote común no lo hace. Añade tres problemas que no tienes resueltos: medir el uso del móvil (imposible desde Expo), la redistribución de dinero real entre usuarios (juego y transmisión de dinero) y un incentivo de colusión. Y además contradice tu propia tesis: "el dinero no se pierde, va a tu Vault".

Lo que de verdad quieres del grupo no es el bote. Es **presión social y testigos**:
- **El dinero nunca se mueve entre usuarios.** Cada uno apuesta lo suyo, se le reembolsa lo suyo y, si falla, va a su propio Vault. El grupo comparte el pacto, el ranking de Trust Score y la vergüenza.
- **El grupo es el jurado.** Los amigos votan las pruebas dudosas y Terac resuelve los desacuerdos. Más votos humanos significa más datos para calibrar al agente.
- **Foco sin Screen Time:** no midas el uso, verifica la abstinencia. Una foto del móvil dentro de una caja o cajón junto al código del día, al inicio y al final de un bloque de 2 h.
- **El ejemplo del gym encaja tal cual** con el flujo actual de foto + código.

**Viable en 8 h:** como mucho, una pantalla "Círculo" con 3–5 miembros, el ranking y el voto del grupo antes de pasar a Terac. **En los documentos:** un párrafo "Pact Circles (post-hackathon)" con la regla *ningún flujo de dinero entre usuarios*. En el pitch, una diapositiva: "los amigos también son jueces humanos".

### El Expansionista (Response A)
**El grupo no es una funcionalidad más. Convierte PACTA en un producto con distribución.** Ahora mismo PACTA es un juego de un solo jugador: cada usuario hay que captarlo uno a uno. Con un bote común, cada reto trae a 5–20 personas de golpe. Whop vive de comunidades de pago (coaches de fitness, grupos de productividad, servidores de trading). La versión grande es **"PACTA Squads for Whop Creators"**: el creador lanza un reto para sus miembros y se queda una parte de la comisión del 10%. Pasas de vender a usuarios sueltos a vender a creadores con miles de miembros.

**El uso del móvil se mide con el pipeline que ya tienes:** captura de Tiempo de uso o Bienestar digital con el código del día, Claude lee los minutos y, si sospecha una edición, el caso va a Terac. El mismo flujo sirve para Apple Health, Strava o Duolingo: un **verificador universal de hábitos**.

**Terac sale ganando aún más:** más disputas, más apelaciones, más etiquetas humanas. **Vault y Trust Score crecen con esto:** modo cooperativo, donde el bote de quienes fallan va a un *Vault de grupo* que se desbloquea cuando el grupo recupera su Trust medio; y un Trust Score social visible en Whop como requisito para retos con botes mayores.

**Para las 8 horas:** un reto "Focus Squad" sembrado con 4 usuarios demo, una clasificación y la verificación por captura. **En los documentos:** una sección "Squads" como la mayor palanca de crecimiento, una pantalla en la demo y una diapositiva de "siguiente paso".

### El Outsider (Response C)
Miro esto como un juez que llega en frío y tiene 3 minutos. El pitch ya me pide entender unos diez conceptos (stake, código del día, agente de visión, jurado Terac, Vault, APY simulado, tramos, Trust Score, High-Yield Pass, comisión del 10%). Si añades botes en grupo con percentiles, me pierdo antes de llegar a la parte que vale el 40%.

La idea contradice tu propia promesa: "si fallas, el dinero no se pierde" frente a "los que fallan pagan a los que cumplen". Un juez lo nota enseguida. El amigo invitado se pregunta: ¿qué pasa con mis $20?, ¿qué es un percentil de uso?, ¿quién decide si he usado TikTok?, ¿tengo que instalar Expo Go y pagar con dinero real a una app de hackathon? Y Terac no aparece por ningún lado.

Recomendación: (1) test de una frase: si la versión con grupos no cabe en una frase, no va en la demo; (2) si quieres algo social, un "Squad Vault" donde el dinero de quien falla va a un fondo común que el grupo desbloquea cuando todos recuperan su Trust Score, sin que nadie gane a costa de otro; (3) olvida medir el uso de apps hoy. **En los documentos:** un párrafo en Roadmap/Fuera de alcance; nada en el README ni en la demo.

### El Ejecutor (Response B)
Hoy, el bote de grupo con dinero real no se construye. Se construye una versión de demo que reutiliza lo que ya existe.

**No hagas:** medir el uso de apps con Screen Time o UsageStatsManager (entitlement + dev client = días), ni redistribuir dinero real entre usuarios por Whop (payouts P2P sin sandbox; si falla delante del jurado pierdes la demo).

**Sí cabe (≤90 min, después de que el flujo individual funcione):** tabla `groups` + `group_id` en `pacts` (15 min); el gym reutiliza el pipeline tal cual (es un `GROUP BY`); el "bote" no mueve dinero: el stake de quien falla va a su propio Vault y quien cumple recibe reembolso + bonus de Trust y un APY más alto; las disputas de grupo = más veredictos para Terac (dilo en el pitch); leaderboard con una FlatList (20 min).

**Docs:** una línea en el README, un apartado "Post-hackathon" (screen time nativo, payouts P2P, revisión legal), y Group Pacts como bloque opcional solo si el flujo individual con Whop funciona antes de las 16:00. **Primera acción:** no toques nada de grupos; termina el flujo checkout → foto → auditoría.

## Revisión por pares (anónima)

Mapeo: A = Expansionista, B = Ejecutor, C = Outsider, D = Contrarian, E = Primeros Principios.

| Revisor | Más fuerte | Mayor punto ciego | Lo que se les escapó a todos |
|---|---|---|---|
| 1 | E | A | Los votos de amigos contaminan las etiquetas; las comisiones de Whop con stakes de $1; el núcleo (APY simulado) ya tiene riesgo |
| 2 | E (B cerca) | A | La economía del reembolso en Whop (comisiones, chargebacks); el Vault individual ya custodia dinero; medir el acuerdo entre evaluadores y separar los votos del grupo de los de Terac |
| 3 | E (B segunda) | A | Fijar el conjunto de evaluación antes/después; el "APY simulado" puede leerse como promoción engañosa y un Trust opaco equivale a perder el stake; privacidad de las fotos |
| 4 | E (B segunda) | A | Votos de amigos como etiquetas débiles y Terac como verdad de referencia; set reservado; el reembolso no es íntegro; la demo en grupo es frágil (varias cuentas pagando en directo) |
| 5 | E (B como calendario) | A | Pesar los votos de amigos frente a Terac y medir la tasa de acuerdo; mecánica real de Whop (comisiones, retrasos, contracargos); privacidad de terceros en las fotos del gym |

Unanimidad: **E** es la más fuerte y **A** tiene el mayor punto ciego. **B** fue nombrada la mejor en ejecución.

## Síntesis del presidente

### Dónde coincide el consejo
- **El dinero no se mueve entre usuarios** durante el hackathon (y no sin revisión legal después). Un bote competitivo rompe la promesa central ("si fallas, tu dinero no se pierde"), entra en terreno de juego y money transmission, y crea incentivos perversos y colusión.
- **No se mide el uso de apps con APIs nativas hoy** (Family Controls / UsageStats requieren un dev build y permisos especiales).
- **El reto de gym encaja tal cual** en el pipeline actual de foto + código + IA + Terac.
- Lo valioso del grupo es la **presión social y los testigos**, no el bote.
- Nada de grupos antes de que el flujo individual funcione de extremo a extremo.

### Dónde choca el consejo
- **Peso en la demo.** El Expansionista quiere grupos en la demo y en el pitch como palanca de crecimiento ("PACTA Squads for Whop Creators"); el Outsider no quiere nada en el README ni en la demo para no sumar conceptos. Las dos posturas son razonables: los jueces de Whop valoran la distribución vía comunidades, pero una demo de 2 minutos no aguanta más conceptos. Resolución: **una sola diapositiva de visión** en el pitch y, como mucho, una pantalla opcional.
- **Verificación del foco.** El Expansionista propone leer capturas de Tiempo de uso; el Contrarian demuestra que se falsean en 30 s. Resolución: la prueba principal es **la foto del móvil guardado en una caja con el código** (Primeros Principios); la captura es como mucho una señal secundaria que siempre puede revisar Terac.

### Puntos ciegos que detectó la revisión
1. **Los votos de amigos son etiquetas débiles y sesgadas** (indulgencia, colusión). Nunca deben mezclarse con los veredictos de Terac en la métrica del antes/después. Al contrario: la **tasa de acuerdo amigos vs Terac** es una métrica nueva y potente ("los amigos aprueban el 95%; los humanos neutrales de Terac, el 70%").
2. **Comisiones de Whop en los reembolsos.** Con stakes de $1, la comisión no recuperable puede hacer que "si cumples se te reembolsa" no sea íntegro. Hay que verificarlo.
3. **El núcleo ya tiene exposición legal** (custodia de fondos + APY simulado), haya grupos o no.
4. **Privacidad:** que el círculo vea fotos ajenas (caras, casas, terceros en el gym) requiere consentimiento.
5. **La demo de grupo con varias cuentas pagando en directo es frágil** → usar usuarios sembrados.
6. (Ya cubierto en el plan: el set de evaluación fijo con v1 frente a v2 existe en 04-agente-terac.md.)

### Recomendación
Adoptar **"Pact Circles": retos en grupo cooperativos, sin dinero entre usuarios.** Cada miembro apuesta y recupera lo suyo; si falla, va a su propio Vault. El grupo comparte el reto, el ranking y un **bonus cooperativo** de Trust si todos cumplen la semana (quieres que tus amigos cumplan, no que fallen). Los amigos actúan como **testigos** que votan antes de Terac; Terac decide los desacuerdos y cualquier sospecha de trampa. El reto de foco se verifica con la foto del móvil en una caja. En el hackathon: opcional, ≤45 min, solo si el flujo central funciona a las 16:00, con usuarios sembrados. En el pitch: una diapositiva "PACTA Circles para comunidades de Whop". El modo competitivo (ganador o reparto por percentil) queda en el roadmap como **bloqueado hasta revisión legal**.

### Lo primero que hay que hacer
Escribir en el plan la regla "ningún flujo de dinero entre usuarios" junto con el diseño de Pact Circles, y no tocar nada de grupos el día del evento hasta que el flujo checkout → foto → auditoría → reembolso/Vault funcione.
