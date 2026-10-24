# 07 · Pact Circles: retos en grupo

> Resultado del consejo del 2026-10-24 ([council-transcript-20261024.md](../council-transcript-20261024.md)).
> **Regla de oro: el dinero nunca se mueve entre usuarios.** Cada persona apuesta su dinero, lo recupera, y si falla va a **su propio** Vault.

## La idea original y por qué se ha cambiado

Propuesta inicial: botes de grupo en los que gana quien menos usa TikTok o Instagram (o se reparte el bote según el percentil de uso), o retos de gym en los que los que no cumplen pagan a los que cumplen.

Se descarta el **bote competitivo** por cinco motivos:
1. **Rompe la promesa central**: "si fallas, tu dinero no se pierde". Con un bote competitivo, sí se pierde, y además va a otra persona.
2. **Legal**: un premio en dinero entre usuarios según resultados es terreno de leyes de juego o concursos y de money transmission (varía por estado en EE. UU.). Requiere además una revisión de cumplimiento de Whop.
3. **Incentivo perverso y colusión**: en un juego de suma cero quieres que tus amigos fallen, y dos personas pueden pactar que una "falle" para repartirse el bote.
4. **No se puede medir hoy**: Screen Time (iOS, entitlement Family Controls) y UsageStatsManager (Android) necesitan módulos nativos y un dev build. No funcionan en Expo Go. Una captura de pantalla se falsifica en segundos.
5. **No suma al 40%** de la nota y añade conceptos a un pitch que ya tiene muchos.

## Cómo funciona Pact Circles

- **Círculo**: de 3 a 10 personas, unidas por código o enlace de invitación. Más adelante, también una comunidad de Whop entera.
- **Reto común**: hábito, frecuencia (por ejemplo, 4 días por semana), duración y stake por persona y semana.
- **Dinero individual**: cada miembro paga su stake con Whop Checkout. Si cumple, se le reembolsa; si falla, el stake va a **su** Vault. Exactamente igual que el flujo individual.
- **Bonus cooperativo**: si **todo** el círculo cumple la semana, cada miembro recibe **+10 de Trust**, lo que acelera el desbloqueo de su Vault. Así quieres que tus amigos cumplan, no que fallen.
- **Ranking**: días cumplidos, racha y Trust Score. Presión social sin dinero de por medio.
- **Amigos como testigos**: antes de ir a Terac, los miembros del círculo pueden votar una prueba dudosa (`APPROVE` / `DOUBT`).
  - IA segura + amigos de acuerdo → aprobado.
  - IA dudosa o amigos en desacuerdo → Terac.
  - **Cualquier sospecha de trampa va siempre a Terac**: los amigos nunca deciden solos en ese caso.

## Tipos de reto y cómo se verifican

| Reto | Prueba | Estado |
|---|---|---|
| Gym / entrenamiento 4×semana | Foto en vivo + código del día (pipeline actual) | Encaja ya |
| **Foco / detox de redes** | Foto del **móvil dentro de una caja o cajón** con el código del día, **al inicio y al final** de un bloque (por ejemplo, 2 h). Opcionalmente, una captura de Tiempo de uso como señal secundaria, siempre revisable por Terac | Encaja ya (casos ambiguos útiles para Terac) |
| Lectura, estudio | Foto en vivo + código | Encaja ya |
| Tiempo de uso medido automáticamente | Screen Time / UsageStats nativos | Post-hackathon (dev build + permisos) |

## Datos: votos de amigos frente a Terac (importante para el 40%)

- Los votos del círculo son **etiquetas débiles**: los amigos son indulgentes y pueden ponerse de acuerdo. **Nunca** entran en el set de evaluación ni en la calibración del agente como verdad de referencia; la verdad de referencia es Terac.
- Se guardan aparte (tabla `circle_votes`) y dan una **métrica nueva para el pitch**: la *tasa de acuerdo amigos vs Terac* (ejemplo de mensaje: "los amigos aprueban el 95%; los humanos neutrales de Terac, el 70%"). Demuestra por qué hace falta un jurado neutral.

## Alcance en el hackathon

**Opcional, bloque de 17:30 a 18:00, solo si pasa la puerta de las 16:00 (el flujo individual funciona de extremo a extremo)** (ver 06).

- Tablas `circles`, `circle_members` y `circle_votes`, más `pacts.circle_id` (ver 02).
- Pantalla `app/circle/[id].tsx`: miembros, ranking y estado del bonus cooperativo.
- **Usuarios sembrados** (4 miembros con pactos ya resueltos) para no depender de varias cuentas pagando en directo.
- Si sobra tiempo: el voto de testigos antes de Terac.

**En la demo**: como mucho 10 segundos de la pantalla del círculo. **En el pitch**: una sola diapositiva de visión, *"PACTA Circles para comunidades de Whop"*: creadores de fitness o productividad lanzan un reto para sus miembros.

## Roadmap post-hackathon

1. Círculos completos con invitaciones, notificaciones y votos de testigos.
2. **Integración con comunidades de Whop**: el creador lanza el reto para sus miembros (requiere revisar con Whop el reparto de ingresos).
3. Medición nativa del uso de apps (FamilyControls/DeviceActivity en iOS, UsageStatsManager en Android) con un dev build de Expo.
4. **Modo competitivo con bote (ganador o reparto por percentil): BLOQUEADO** hasta una revisión legal (juego y concursos de habilidad, money transmission por jurisdicción, términos de Whop).
5. **Privacidad**: consentimiento explícito para que el círculo vea las fotos y desenfoque automático de caras de terceros (gym).
