# Avance — Mis torneos / view-model del estado del usuario

Fecha: 2026-03-20

## PASO 1 — View-model de “Mis torneos”

Se implementó el helper `getUserTournamentState(params)` en `src/services/tournaments/tournamentViewModels.ts` para derivar, desde `tournament`, `registration` y `team`, un estado resumido consumible por la UI de perfil.

### Output derivado incorporado

El helper devuelve:

- `status`: `NOT_READY | READY_PENDING_PAYMENT | UNDER_REVIEW | ACCEPTED`
- `label`
- `sublabel`
- `players.current / players.required`
- `payment.paid / payment.expected / payment.status`
- `nextAction`

### Reglas aplicadas en esta iteración

- `ACCEPTED`: ya existe `team` aceptado o la inscripción quedó aceptada.
- `NOT_READY`: todavía no alcanza el mínimo de jugadores requerido.
- `READY_PENDING_PAYMENT`: el roster ya cumple mínimo, pero el pago sigue pendiente o parcial.
- `UNDER_REVIEW`: roster y pago completos, a la espera de revisión/aprobación.

### Integración realizada

- `getProfileTournamentListView()` ahora agrega `userState` a cada row.
- La composición cruza `registration` + `team` por `tournamentId::groupId` para no perder contexto cuando el listado visible deduplica una inscripción aceptada frente a su equipo confirmado.
- `TournamentSummaryCard` soporta `variant="profile"` + `userState` y renderiza:
  - badge de estado,
  - resumen de jugadores,
  - resumen de pago,
  - próxima acción.

### Resultado funcional esperado

En “Mis torneos” el usuario puede entender rápidamente:

1. si su equipo ya fue aceptado,
2. si todavía le faltan jugadores,
3. si el pago está pendiente/parcial/completo,
4. cuál es la próxima acción recomendada.
