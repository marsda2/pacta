# Vídeo de pitch de PACTA · 2 minutos

Preparado el **2026-10-24** en el proyecto independiente `../PACTA-Demo-Video`, con Remotion y audio de ElevenLabs. No cambia el funcionamiento de la app, sus pagos, sus despliegues ni los interruptores de Terac.

- Idioma: inglés en voz, rótulos, interfaz ilustrativa y subtítulos.
- Formato: 1920×1080, 30 fps, 120 segundos.
- Ocho capítulos: procrastinación, stake, pruebas, Pax, micro-pasos, arquitectura, Whop/Vault y cierre.
- Estética: fondo negro, crimson/emerald, tipografía cinética, notificaciones que estallan, temporizadores, tarjetas flotantes, orb de Pax y árbol de arquitectura con paquetes animados.
- Audio: ocho tomas de voz completas, música electrónica instrumental solicitada a 124 BPM y tres efectos de interfaz, generados con ElevenLabs.
- Fuente del contenido: `COMO-FUNCIONA.md`, `ROADMAP.md`, `README.md` y el código de reglas, Pax y pruebas.

## Qué se ajustó del storyboard propuesto

| Propuesta | Tratamiento del vídeo |
|---|---|
| Hold de $50 | Stake ilustrativo de $20; rango actual $5–$20, cobrado con Whop |
| Terac como cómputo de IA | Gemini para la IA, Vercel para la API, Supabase para los datos y Terac para la revisión humana |
| Bloqueo de apps y GPS en segundo plano ya activos | Conceptos futuros, rotulados y narrados como no disponibles en la versión actual |
| Stripe directo y escrow | Integración de comercio con Whop, sin inventar una integración directa con Stripe |
| Disponible en Whop y lanzamiento completado | Se señala que quedan comprobaciones de producción; la llamada final apunta a la URL pública de PACTA |
| Castigo que hace desaparecer el dinero | Vault recuperable mediante Trust y racha de pactos verificados |

Las pantallas y los importes son **ilustrativos**. No son una grabación de un pago real, un voto real de Terac o una prueba de que la integración completa esté validada. La fase 9 sigue parcial hasta ensayar la demo y completar las verificaciones reales pendientes.

## Archivos

| Archivo | Uso |
|---|---|
| `../PACTA-Demo-Video/content/film-120-en.json` | Guion y adaptaciones factuales |
| `../PACTA-Demo-Video/content/film120-timing.json` | Escenas y subtítulos sincronizados |
| `../PACTA-Demo-Video/src/film120/` | Motion graphics y montaje |
| `../PACTA-Demo-Video/reference/film120-audio.json` | Procedencia de voz, música y efectos |
| `../PACTA-Demo-Video/docs/FILM-120.md` | Guía de producción y reproducción |
| `../PACTA-Demo-Video/out/pacta-film-120s-en-final.mp4` | Entrega final |

Para reproducir: `npm run render:film` desde `../PACTA-Demo-Video`.
