# Plan de implementación de pendientes del dashboard

## Estado implementado

1. **Frontend base**
   - `PendingAlertsSection` muestra pendientes por severidad y CTA.
   - El dashboard se suscribe a `users/{uid}/pendingAlerts`, filtra `status == active`, ordena por `priority ASC` + `updatedAt DESC` y limita a 20 pendientes.
   - Al iniciar una nueva suscripción se limpian las alertas previas para evitar mostrar datos de otro usuario durante cambios de sesión.
   - Los tipos del frontend reconocen los nuevos `kind` de equipos aceptados con jugadores/pago pendientes.

2. **Backend producer mínimo viable**
   - `complete_profile`: se sincroniza desde cambios en `users/{userId}.onboarded`.
   - `group_join_requests_pending`: se sincroniza desde cambios en `groups/{groupId}.pendingRequestIds` para admins del grupo.
   - `group_admin_requests_pending`: se sincroniza desde cambios en `groups/{groupId}.pendingAdminRequestIds` para el owner del grupo.
   - Todos los producers escriben con upsert idempotente en `users/{uid}/pendingAlerts/{alertId}` y resuelven el pendiente cuando la condición deja de aplicar.

3. **Backfill inicial**
   - `cd volley-ranking-system/functions && npm run backfill:pending-alerts` ejecuta el relevamiento en modo dry-run.
   - `cd volley-ranking-system/functions && npm run backfill:pending-alerts:write` genera `complete_profile`, `group_join_requests_pending`, `group_admin_requests_pending` y los pendientes de torneos para datos ya cargados antes de desplegar los triggers.

4. **Reglas e índices de Firestore**
   - Se agregó una regla específica para que cada usuario autenticado lea solo `users/{uid}/pendingAlerts/*`.
   - La escritura cliente de `pendingAlerts` queda bloqueada porque los producers usan Admin SDK.
   - Se reemplazó la regla catch-all temporal por reglas explícitas para `users`, `groups`, partidos, participaciones, torneos y colecciones auxiliares; el catch-all final ahora deniega lectura/escritura.
   - Se agregó el índice compuesto `status ASC, priority ASC, updatedAt DESC` para la query final del dashboard.
   - Se agregaron índices compuestos de soporte para queries de producers sobre `tournamentRegistrations` y `tournamentTeams`.
   - Se agregaron índices de `collectionGroup` para que el job de mantenimiento consulte `pendingAlerts` por `status + expiresAt` y `status + updatedAt`.

5. **Pendientes informativos de grupos**
   - `group_membership_result` se crea cuando una solicitud de ingreso a grupo es aprobada o rechazada.
   - El aviso expira a los 14 días mediante `expiresAt`.
   - Si la solicitud fue aprobada, el CTA apunta al detalle público del grupo; si fue rechazada, apunta al listado de grupos.

6. **Pendientes de torneos**
   - `tournament_draft_open_registrations`: se sincroniza para admins de torneo cuando el torneo está en `draft`.
   - `tournament_registrations_pending_review`: se sincroniza para admins de torneo cuando hay inscripciones `pendiente` durante `inscripciones_abiertas`.
   - `tournament_ready_to_close_registrations`: se sincroniza para admins de torneo cuando las inscripciones están abiertas y la cantidad de equipos aceptados permite cerrar.
   - `tournament_fixture_pending`: se sincroniza para admins de torneo cuando el torneo está en `inscripciones_cerradas` y la fase actual aún no tiene fixture.
   - `tournament_ready_to_start`: se sincroniza para admins de torneo cuando el torneo está en `inscripciones_cerradas` y la fase actual ya tiene fixture confirmado.
   - `tournament_registrations_closed` queda como kind legado resuelto automáticamente para reemplazar el mensaje genérico por los dos estados anteriores.
   - `tournament_active_results_pending`: se sincroniza para admins de torneo cuando el torneo está `activo` y existen partidos sin resultado completado.
   - `group_accepted_in_tournament`: se sincroniza para admins del grupo aceptado mientras el torneo no esté `cancelado` ni `finalizado`.
   - `group_tournament_team_missing_players`: se sincroniza para admins del grupo cuando una inscripción pendiente o un equipo aceptado todavía no llega al mínimo de jugadores requerido por el torneo.
   - `group_tournament_team_payment_pending`: se sincroniza para admins del grupo cuando el pago de una inscripción pendiente o de un equipo aceptado está `pendiente` o `parcial`.
   - Los nuevos avisos de inscripción/equipo se resuelven automáticamente al completar jugadores, pagar la inscripción, aceptar/rechazar la inscripción pendiente, cerrar/cancelar/finalizar el torneo o quitar admins del grupo.
   - Los producers se activan desde cambios en `tournaments`, `tournamentRegistrations`, `tournamentMatches`, `tournamentTeams` y refrescos de admins en `groups`.
   - El backfill inicial también releva torneos y equipos aceptados existentes.

7. **Limpieza y mantenimiento**
   - `onPendingAlertsMaintenance` corre cada 24 horas en la zona `America/Argentina/Buenos_Aires`.
   - El job resuelve alertas activas cuyo `expiresAt` ya venció.
   - El job borra alertas `resolved` o `dismissed` con más de 30 días desde `updatedAt`.
   - El job registra métricas/logs de pendientes activos: total activo, cantidad de usuarios con pendientes activos, distribución por `kind`, distribución por severidad y top 10 usuarios con más pendientes activos.
   - Se agregaron logs `pendingAlerts.tournamentKindChange` al activar/resolver pendientes de torneo y `pendingAlerts.tournamentKindMetrics` con conteos activos/resueltos por kind (`tournament_*`, `group_accepted_in_tournament`, `group_tournament_team_missing_players`, `group_tournament_team_payment_pending`) para detectar exceso de alertas por tipo.

## Siguientes pasos

1. **Backfill/validación operativa post-deploy**
   - Ejecutar `cd volley-ranking-system/functions && npm run backfill:pending-alerts:write` después de desplegar para que las inscripciones/equipos preexistentes generen los nuevos avisos de jugadores/pago si corresponde.
   - Revisar logs de `pendingAlerts.activeMetrics`, `pendingAlerts.tournamentKindMetrics`, `pendingAlerts.tournamentKindChange` y `pendingAlerts.cleanupSummary` durante los primeros días para ajustar límites, frecuencia o retención.

2. **Ajuste fino de reglas e información pública**
   - Auditar si `users` debe exponer únicamente campos públicos mediante endpoints HTTP/callables, ya que las reglas actuales mantienen lectura pública para no romper vistas públicas que muestran nombres/fotos de admins o miembros.
   - Validar con QA los flujos de edición directa de jugadores de `tournamentRegistrations` y `tournamentTeams`, únicos writes cliente permitidos fuera de creación de grupos.

3. **Umbrales operativos de alertas**
   - Definir umbrales concretos por kind para activar alarmas externas cuando `pendingAlerts.tournamentKindMetrics.activeByKind` o `resolvedByKind` tenga picos inusuales.
   - Confirmar si se necesita retención separada para métricas históricas de pendientes de torneos más allá de los 30 días configurados para alertas inactivas.
