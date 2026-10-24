# Forfeit: extracción técnica de la landing

Fecha de captura: 24 de octubre de 2026. Fuente: https://www.forfeit.app/

## Qué se ha guardado

- `index.html`: HTML público descargado, conservado sin reescribir enlaces.
- `js/`: 26 scripts inline y dos archivos externos (`privacy.js`, `navbar.js`). En total, 28 archivos JavaScript y 204.172 bytes.
- `js/inline-06.json`, `inline-07.json`, `inline-26.json`: tres bloques JSON-LD, separados del código ejecutable.
- `css/`: 18 bloques inline y cuatro hojas externas; 22 archivos y 389.648 bytes.
- `screenshots/`: cinco capturas del navegador estrecho usado para la inspección.
- `manifest.json`: procedencia, atributos originales, línea de inicio en HTML, tamaño y SHA-256 de los archivos.
- `dom-map.json`: encabezados, manejadores de eventos HTML y recuento de SVG/estilos inline.
- `analysis.json`: inventario de funciones, mecanismos de animación, breakpoints, keyframes y referencias a recursos.
- `syntax-check.json`: comprobación de sintaxis de los 28 archivos JS con Node; todos pasan. No se ejecutaron los scripts descargados con Node.

El HTML mide 766.978 bytes. Los tamaños JS/CSS incluyen código inline ya contenido en ese HTML; no deben sumarse como si fueran transferencias adicionales. No se han descargado imágenes ni fuentes: se conservan sus referencias y los SVG/data URIs ya presentes en el código. No se ha descargado el script externo de Google Tag Manager ni scripts que otros inicializadores puedan cargar dinámicamente. Esta es una extracción del frontend público de la landing, no del backend ni de las apps nativas. Tampoco es una copia offline autocontenida: el HTML conserva sus rutas originales.

## Arquitectura observada

La respuesta pública sirve una landing de HTML con CSS y JavaScript mayoritariamente inline. No aparecen bundles de React/Next ni bibliotecas GSAP, Lottie o Swiper en los scripts incluidos en esta captura. El movimiento se implementa con CSS, clases de estado, timers, `IntersectionObserver`, `ResizeObserver` y `requestAnimationFrame`.

Esto describe esta landing. Un comentario del script de conversión menciona un onboarding React servido por Express, pero ese código no se ha inspeccionado; no prueba la arquitectura del resto del producto.

Las conversaciones y el bloqueo Mac son demostraciones con escenarios precargados. Su aspecto no demuestra que la landing ejecute un agente de IA ni que bloquee aplicaciones realmente.

## Layout, de arriba abajo

1. Barra superior sticky con marca, enlaces centrales y accesos a la cuenta/tiendas. Fondo blanco translúcido con blur de 14px. En <=640px se ocultan los enlaces centrales y las insignias de tienda de esa barra.
2. Hero de dos columnas: texto a la izquierda y formulario dentro de un teléfono a la derecha. La capa final fija un ancho máximo de 1140px, columnas `1.05fr 1fr`, separación de 64px y padding exterior `64px 24px 96px`.
3. Estadísticas y testimonios: tres cifras grandes en escritorio; testimonios en una pista horizontal nativa con scroll-snap. Las tarjetas miden 360px de base, 320px bajo 980px y 280px bajo 768px.
4. Explicación del funcionamiento: seis pestañas (Photo, Timelapse, Apple Health, Web Tracking, Self-Verify, GPS), timeline de tres pasos y teléfono sincronizado. El stage usa dos columnas con gap 80px; bajo 900px pasa a una columna y el teléfono aparece antes del timeline.
5. Flexibilidad: filas numeradas que combinan texto y pequeñas escenas de producto, incluyendo apelaciones, calendario, nivel de exigencia y verificación.
6. Penalizaciones: tarjetas con distintos acentos semánticos, entre ellos azul, verde, púrpura, naranja y rojo.
7. Overlord: bloque oscuro a todo el ancho, con ejemplos de conversación controlados por scroll. Después aparece un bento de señales/integraciones y escenas de intervención.
8. Demostración Mac: navegador simulado, capa de bloqueo, texto contextual y chips de respuesta; nueve escenarios seleccionables.
9. Casos de uso: acordeón con catorce filas; una abierta a la vez.
10. Preguntas frecuentes, llamada final de descarga y pie legal.

## Sistema visual actual

- Fuente principal: **Figtree**, autoalojada; pesos variables 300–900 y `font-display: swap`.
- Paleta: blanco `#ffffff`, texto `#0b0b0c`, secundarios `#5a5a5f` y `#8a8a90`, bordes `#e6e6e8`, superficies `#f4f4f5`, acento `#2f5bff` y fondo oscuro `#0a0a0c`.
- Título del hero: 72px, peso 700, tracking -0.035em, interlineado 1.05. Bajo 980px pasa a 64px; bajo 600px, a 44px.
- Subtítulo: 21px e interlineado 1.5; bajo 600px pasa a 16px.
- Hero bajo 980px: una columna y gap de 48px. Bajo 600px, padding `40px 20px 64px`.
- Bordes redondeados frecuentes: 9–18px para controles y tarjetas; radios mayores para teléfonos. Las tarjetas bento usan transparencia blanca, borde tenue y blur de 20px.
- Las burbujas dentro del teléfono se fuerzan a blanco, con sombra suave y radio 16px; una esquina inferior queda en 4px para distinguir emisor.
- El bento usa una retícula de 12 columnas en escritorio con spans variables; bajo 900px se convierte en una sola columna.

Los valores anteriores proceden de reglas CSS y su orden de sobreescritura. Las capturas documentan la vista estrecha; no se hizo una captura independiente de escritorio ni una prueba en dispositivos físicos.

## Animaciones e interacciones

| Elemento | Implementación y tiempos | Referencia |
| --- | --- | --- |
| Formulario del hero | `NewForfeitWidget.mount`, con `cycleMs:4200`; ese valor ajusta la pausa, no garantiza un ciclo total exacto, porque escribir/borrar depende de la longitud del texto. | `js/inline-11.js`, `js/inline-13.js` |
| Máquina de escribir | Escritura base de 50ms por carácter y borrado de 30ms por carácter. | `js/inline-11.js:321` |
| Chips del formulario | Rodillo vertical de 1.2em en 380ms; ancho del contenedor cambia a la vez; curva `cubic-bezier(0.4,0,0.2,1)`. El keyframe `nfw-roll` se inyecta desde JS. | `js/inline-11.js:51`, `:414` |
| Secciones al entrar | Opacidad 0→1 y desplazamiento vertical 50→0px; 800ms en escritorio y 400ms bajo 768px. Observer con threshold 0.05; se deja de observar tras revelarlas. | `css/inline-02.css:1472`, `js/inline-27.js` |
| Timeline de verificación | Avanza un paso cada 4200ms, actualiza progreso y cambia de método. El observer pausa el timer cuando la sección no está visible. | `js/inline-14.js:135` |
| Entrada de los pasos | Fade previo de 200ms; entrada de cada paso en 280ms, con retrasos 0/100/200ms. | `css/inline-07.css:19` |
| Mensajes de coaching | Rotación cada 3200ms; sólo se mantiene el timer mientras el bloque está visible. | `js/inline-15.js` |
| Política de apelaciones | Cinco posiciones; cambio cada 3200ms y sustitución del texto tras 200ms. También acepta pulsar los puntos. | `js/inline-16.js` |
| Cifras de estadísticas | Rodillos por dígito: 2400ms para el primero y +350ms por cada siguiente; curva `cubic-bezier(.16,.68,.12,1)`. Se ejecutan una vez al entrar en pantalla. | `js/inline-29.js` |
| Tarjetas bento | Opacidad y translateY(14px) durante 600ms; cada tarjeta añade `--i * 60ms`. La entrada se repite si sale y vuelve a entrar. | `css/inline-14.css:78`, `js/inline-18.js` |
| Conversaciones Overlord por scroll | Panel sticky dentro de un recorrido de 700vh; paso de ejemplo cada 0.7 de la altura del panel; banda de 24px para evitar cambios rápidos en el límite. Un ResizeObserver escala el teléfono entre 0.5 y 1 según el espacio disponible. | `js/inline-25.js:230` |
| Barra de navegación | Clase `is-dark` cuando el bloque oscuro pasa bajo la barra; transición de fondo/borde de 220ms. | `js/inline-30.js`, `css/inline-02.css` |
| Entrada al bloque oscuro | Overlay cuya altura/opacidad se calcula por scroll y se actualiza con requestAnimationFrame. Se omite en <=992px o puntero táctil. | `js/inline-31.js` |
| Snap a Overlord | En escritorio >=900px y sin reduced motion, espera 120ms de inactividad y ajusta el scroll si el bloque entra en el primer 22% del viewport. | `js/inline-32.js` |
| Casos de uso y FAQ | Clases open/active y ajustes de altura; el acordeón de casos de uso sincroniza aria-expanded. | `js/inline-19.js`, `js/inline-25.js:169` |

## Código histórico que no debe confundirse con el diseño visible

La landing conserva una primera capa CSS de 5782 líneas. Después hay una capa que elimina el tema CRT/ASCII y otra que sustituye el hero. Hay 26 nombres distintos de keyframes en las hojas extraídas; eso **no** significa que los 26 se ejecuten o sean visibles. Además existen keyframes inyectados por JavaScript.

`css/inline-03.css:25` oculta ASCII, matrix, scanlines y brackets con `display:none !important`. `css/inline-04.css:39` oculta el ojo, el fondo del hero y la lava. Los scripts `inline-21` a `inline-24` siguen conteniendo esos efectos. Algunos retornan si no encuentran su nodo; otros podrían seguir calculando sobre un nodo oculto. No se ha realizado un perfil de CPU para afirmar su coste efectivo.

`inline-27.js` indica que la palabra azul del título ya es estática: su antigua rotación está retirada. También quedan código de chips flotantes y un carrusel anterior del hero, pero el formulario `NewForfeitWidget` es la demostración que se vio en el navegador.

La hoja de fuentes declara también Fragment Mono, Instrument Serif, Orbitron y Rajdhani. Que estén declaradas no significa que sean la fuente principal del diseño actual.

## Adaptación y rendimiento

- Existen breakpoints a 480, 600, 640, 760, 768, 900, 980, 992, 1188 y 1200px; proceden de capas y componentes distintos, no de un único sistema de breakpoints.
- En <=992px el recorrido sticky cambia a `700svh` y su panel a `100svh`, buscando evitar saltos por la barra de Safari.
- Varios timers se pausan mediante IntersectionObserver. No todos los scripts tienen esa pausa, por lo que no debe suponerse que todo se detiene fuera de pantalla.
- `accessibility.css` reduce duraciones CSS a 0.01ms y anula smooth scroll cuando se pide movimiento reducido; los rodillos y el snap tienen además comprobaciones JS. Esto no acredita por sí solo una auditoría completa de accesibilidad.
- El HTML y las sobreescrituras son voluminosos. Para una implementación propia conviene extraer sólo los componentes visuales vigentes y su lógica necesaria; no trasladar las capas históricas completas.

## Servicios externos y alcance

El código referencia PostHog, Meta Pixel, Google Analytics, funciones de Firebase y un contador alojado en Railway. El indicador live consulta estadísticas cada 5000ms si se permite analytics; deja de repetir tras tres fallos. Sin datos sustituye el placeholder a los 5s por un texto estático. Por eso el texto live observado no prueba una conexión de datos en directo.

Las direcciones y referencias están en el código original. No se enviaron formularios de correo ni se probaron pagos, acceso a cuentas o acciones de producto. La inspección visual rechazó las cookies opcionales y probó pestañas, un escenario Mac y una pregunta frecuente.

## Índice de JavaScript

| Archivo | Líneas | Función |
| --- | ---: | --- |
| [js/inline-02.js](./js/inline-02.js) | 10 | Detecta la variante /signup mediante una clase HTML. |
| [js/inline-03.js](./js/inline-03.js) | 32 | Precarga del onboarding; respeta ahorro de datos y conexiones 2G. |
| [js/inline-04.js](./js/inline-04.js) | 18 | Inicializador de Meta Pixel condicionado a marketing y a /signup. |
| [js/inline-05.js](./js/inline-05.js) | 24 | Inicializador de PostHog condicionado a consentimiento. |
| [js/inline-09.js](./js/inline-09.js) | 7 | Configuración de Google Analytics, sujeta a consentimiento. |
| [js/inline-10.js](./js/inline-10.js) | 256 | OverlordUI: constructor compartido de burbujas/acciones y antiguo ciclo de chips del hero. |
| [js/inline-11.js](./js/inline-11.js) | 733 | NewForfeitWidget: formulario demostrativo, máquina de escribir, rodillos, mapa SVG y API mount/setPair/destroy. |
| [js/inline-12.js](./js/inline-12.js) | 95 | Eventos propios de adquisición, identificadores de sesión/dispositivo y parámetros UTM. |
| [js/inline-13.js](./js/inline-13.js) | 10 | Monta NewForfeitWidget en el hero con cycleMs=4200. |
| [js/inline-14.js](./js/inline-14.js) | 305 | Seis métodos de verificación, timeline de tres pasos, progreso y sincronización del teléfono. |
| [js/inline-15.js](./js/inline-15.js) | 23 | Rotación de mensajes de coaching cada 3200ms, pausada fuera del viewport. |
| [js/inline-16.js](./js/inline-16.js) | 68 | Demostración del nivel de apelaciones: cinco posiciones, cambio cada 3200ms. |
| [js/inline-17.js](./js/inline-17.js) | 61 | Simulador de bloqueo Mac con nueve escenarios y respuestas precargadas. |
| [js/inline-18.js](./js/inline-18.js) | 24 | Entradas escalonadas de tarjetas bento, repetidas al volver a entrar en pantalla. |
| [js/inline-19.js](./js/inline-19.js) | 26 | Acordeón de casos de uso; mantiene una fila abierta y actualiza aria-expanded. |
| [js/inline-21.js](./js/inline-21.js) | 318 | Antiguo ojo ASCII con ruido y renderizado progresivo; oculto por la capa visual actual. |
| [js/inline-22.js](./js/inline-22.js) | 57 | Antiguos fondos ASCII en cuadrícula; no confundir con efectos visibles actuales. |
| [js/inline-23.js](./js/inline-23.js) | 53 | Antiguo fondo ASCII de lava; oculto por el rediseño. |
| [js/inline-24.js](./js/inline-24.js) | 69 | Antiguas burbujas de lava movidas con requestAnimationFrame; contenedor oculto. |
| [js/inline-25.js](./js/inline-25.js) | 574 | Controlador general: pestañas, carrusel antiguo, FAQ, scroll de Overlord, modales y formulario de correo. |
| [js/inline-27.js](./js/inline-27.js) | 107 | Revelado de secciones al hacer scroll, indicador live y consulta de estadísticas con consentimiento. |
| [js/inline-28.js](./js/inline-28.js) | 251 | Variante /signup: enlaces al onboarding y ejemplos específicos de conversión. |
| [js/inline-29.js](./js/inline-29.js) | 84 | Contadores de estadísticas con rodillos y frenado escalonado por dígito. |
| [js/inline-30.js](./js/inline-30.js) | 20 | Barra superior oscura cuando cruza el bloque de Overlord. |
| [js/inline-31.js](./js/inline-31.js) | 43 | Transición oscura al aproximarse a Overlord; desactivada en pantallas <=992px y puntero táctil. |
| [js/inline-32.js](./js/inline-32.js) | 41 | Ajuste automático del scroll al inicio de Overlord en escritorio; respeta reduced motion. |
| [js/navbar.js](./js/navbar.js) | 116 | Carga navbar.html e inicializa modales de navegación heredados; el contenedor está oculto en esta landing. |
| [js/privacy.js](./js/privacy.js) | 319 | Preferencias de privacidad, bloqueo de analítica/marketing y gestión del diálogo de consentimiento. |

## Capturas

- `screenshots/01-hero.png`: cabecera y propuesta visual.
- `screenshots/02-form-widget.png`: formulario enmarcado en teléfono.
- `screenshots/03-verification-gps.png`: método GPS con mapa de demostración.
- `screenshots/04-mac-blocker.png`: navegación oscura y selectores del bloque Mac.
- `screenshots/05-dark-demo.png`: escena de bloqueo de Hacker News seleccionada durante la inspección.

## Verificación

Extracción verificada contra el manifiesto y sus hashes; los seis recursos externos descargados respondieron HTTP 200. Los 28 archivos `.js` pasan la comprobación de sintaxis. La verificación de sintaxis no es una prueba funcional del producto. Los resultados de lint y typecheck del proyecto se registran en `project-checks.txt`.

Typecheck del proyecto: correcto. Lint: detecta dos errores `react/no-unescaped-entities` en `app/jury/round1.tsx:98`, fuera de los archivos de esta extracción. No se ha modificado ese archivo.
