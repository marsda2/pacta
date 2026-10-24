# PACTA Autonomous Vault — Planning del hackathon

> Fondo de disciplina sin empleados: apuestas dinero a un hábito, una IA audita tu prueba, un jurado humano de **Terac** decide en la zona gris, y si fallas tu dinero no desaparece: queda congelado en el **Redemption Vault** hasta que recuperes tu Trust Score.

Este repositorio, por ahora, **solo contiene planificación**. No hay código todavía.

> Nota: "Whoop" en este plan significa **Whop** (la plataforma anfitriona del hackathon, whop.com), no la pulsera WHOOP.

## Pitch de 1 frase

"PACTA retiene tu dinero cuando pactas un hábito. Contrata un jurado humano en Terac en cuanto la IA duda o detecta trampa. Si fallas, tu dinero no se pierde: queda bloqueado en una hucha que solo recuperas reconstruyendo tu confianza ante humanos reales."

## Decisiones ya tomadas

| Tema | Decisión | Por qué |
|---|---|---|
| Pagos | **Solo Whop** (Checkout, Payments, Refunds, Webhooks). Sin la API de Stripe | Whop es anfitrión y sponsor; Stripe no lo es en esta edición. Whop ya usa Stripe por debajo |
| Jurado humano | **Terac MCP** | Criterio del 40%: mejora medible gracias a humanos |
| Frontend | **React Native + Expo** (expo-router, TypeScript); web y móvil desde un único código | Una URL web para jueces/iframe de Whop + Expo Go en el móvil para la cámara |
| Backend | Funciones serverless en **Vercel** (`/api/*`) | URL HTTPS pública para los webhooks de Whop y los callbacks de Terac |
| Base de datos | **Supabase** (Postgres + Storage para las fotos) | Rápido, con SDK para Expo |
| Agente de visión | **Claude** (`claude-sonnet-5-5` por velocidad, `claude-opus-5-5` si hace falta precisión) | Visión + salida estructurada |
| Rendimiento del Vault | **Simulado** (APY mostrado en la UI y calculado en la base de datos) | No invertimos dinero real; ver riesgos legales |
| Código fuente | **GitHub** + despliegue automático en Vercel | Previews por PR y demo siempre actualizada |
| Retos en grupo | **Pact Circles**: cooperativos, **sin dinero entre usuarios**; opcional en el hackathon | El bote competitivo rompe la promesa del Vault y tiene riesgo legal (ver 07) |

## Índice de documentos

1. [docs/01-producto.md](docs/01-producto.md): mecánica de pactos, Trust Score, Vault y niveles
2. [docs/02-arquitectura.md](docs/02-arquitectura.md): arquitectura, estructura del proyecto Expo, modelo de datos y máquina de estados
3. [docs/03-whop.md](docs/03-whop.md): cómo conectar Whop (CLI, app, productos, checkout, webhooks, reembolsos)
4. [docs/04-agente-terac.md](docs/04-agente-terac.md): agente auditor, Terac MCP y el "antes y después" para los jueces
5. [docs/05-infra-github-vercel-supabase.md](docs/05-infra-github-vercel-supabase.md): GitHub, Vercel, Supabase y variables de entorno
6. [docs/06-plan-8h-y-demo.md](docs/06-plan-8h-y-demo.md): cronograma de 8 horas, recortes, riesgos y guion de la demo
7. [docs/07-pact-circles.md](docs/07-pact-circles.md): retos en grupo cooperativos (gym, foco), amigos como testigos y roadmap

## Flujo en una imagen

```
[1] Pacto creado ──► Whop Checkout (stake $1–$20) ──► webhook payment.succeeded ──► ACTIVO
        │
[2] Prueba en vivo (cámara, sin galería) + código del día
        │
[3] Agente auditor (Claude visión)
   ├─ confianza ≥ 0.88 y sin señales de trampa ──► reembolso Whop + Trust +15
   └─ confianza < 0.88 / trampa sospechada / apelación emocional
             │
[4] Terac MCP: humanos reales votan
     ├─ APROBADO  ──► reembolso Whop + Trust +20
     └─ RECHAZADO / EXPIRADO ──► el stake queda en Whop + se registra en el Vault (Trust −30 / −50 si hay trampa)
             │
[5] Vault: el saldo bloqueado "rinde" un APY simulado; se desbloquea por tramos al recuperar Trust Score
```
