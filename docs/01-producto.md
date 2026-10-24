# 01 · Producto: mecánica de PACTA

## El problema que resolvemos

En apps tipo Forfeit, si fallas pierdes el dinero para siempre, te enfadas y borras la app (churn inmediato). PACTA convierte esa pérdida en un **motivo para quedarse**: el dinero sigue siendo tuyo, pero está congelado hasta que demuestres disciplina.

## Conceptos

### Pacto
- Título del hábito o tarea ("Ir al gimnasio", "Escribir 500 palabras").
- **Stake**: importe en juego. En la demo, **$1–$5** (la CLI de Whop no tiene sandbox, así que todo es dinero real; ver 03-whop.md).
- **Deadline**: fecha límite para entregar la prueba.
- **Tipo de prueba**: foto en vivo (obligatoria) y, opcionalmente, un tap en un chip NFC.

### Prueba
- Solo cámara en vivo, **sin selector de galería**.
- **Código del día**: la app muestra un código de 4 caracteres (generado por el servidor para ese pacto) que debe aparecer escrito en un papel dentro de la foto. Anti-trampa barato y muy fácil de explicar en la demo.
- Campo opcional de "estado": `normal` o `overwhelmed` (apelación emocional, pido clemencia).

### Trust Score (0–100)

| Evento | Puntos |
|---|---|
| Prueba aprobada directamente por la IA | +15 |
| Prueba aprobada por el jurado de Terac | +20 |
| Pacto fallado o expirado | −30 |
| Trampa confirmada por Terac | −50 y **bloqueo de retiros 7 días** |
| Micro-tarea de clemencia completada (ver abajo) | +5 y el stake no se pierde |

Usuario nuevo empieza en **50**. Límites: mínimo 0, máximo 100.

### Micro-tarea de clemencia
Si el usuario marca `overwhelmed`, no se le cobra en ese momento: el jurado de Terac (y después el agente calibrado) propone una **micro-tarea de 10 minutos** demostrable con foto. Si la entrega, recupera el stake con +5 de Trust. Es la parte "humana" que más luce en la demo.

### Redemption Vault
- Todo stake perdido pasa a `vault_locked_balance`.
- **Rendimiento simulado**: 4.85% APY, calculado como `saldo × APY × días / 365` y mostrado en tiempo real en la UI con la etiqueta *"rendimiento simulado"*.
- **Regla de desbloqueo** (ajustable):
  - Trust Score ≥ **70** **y** 3 pactos verificados seguidos desde el último fallo → se desbloquea un tramo de `min($20, saldo)` más su rendimiento.
  - Sin bloqueo de retiros activo (el de los 7 días por trampa).
- El desbloqueo se ejecuta como un reembolso o una transferencia en Whop (ver 03-whop.md).

### Niveles (monetización con Whop)

| Nivel | Precio | Recuperación del Vault |
|---|---|---|
| Free | $0 | 90% del tramo (PACTA cobra un 10% de comisión), sin rendimiento |
| **High-Yield Pass** | $9/mes (suscripción en Whop) | 100% del tramo + rendimiento |

Ingresos: comisión del 10% sobre los rescates Free, suscripciones al Pass y los stakes que nunca se rescatan (abandono).

## UI: pantalla principal (tres tarjetas grandes)

1. **Active Stake**: `$5.00 en juego · vence en 02:14:00`
2. **Frozen Redemption Vault**: `$60.00 + $1.42 rendimiento (4.85% APY simulado)`
   - Subtexto: *"No has perdido tus $60. Te faltan 2 pactos verificados y 15 puntos de Trust para desbloquear $20."*
3. **Trust Score**: barra 0–100 con el historial de eventos debajo.

Pantallas secundarias: Nuevo pacto, Entregar prueba (cámara), Estado del jurado (esperando a Terac), Vault (historial), Calibración (pantalla para jueces: antes/después).

## Fuera de alcance para el hackathon
- Inversión real del dinero (Treasury o fondos): solo simulación.
- KYC y cumplimiento financiero.
- Botes competitivos entre usuarios (el que falla paga al que cumple). Los retos en grupo se hacen como **Pact Circles** cooperativos, sin dinero entre usuarios (ver [07-pact-circles.md](07-pact-circles.md)).
