# Plan de implementación de pendientes del dashboard

## Estado implementado

1. **Frontend base**
   - `PendingAlertsSection` muestra pendientes por severidad y CTA.
   - El dashboard se suscribe a `users/{uid}/pendingAlerts`, filtra `status == active`, ordena por `priority ASC` + `updatedAt DESC` y limita a 20 pendientes.
   - Al iniciar una nueva suscripción se limpian las alertas previas para evitar mostrar datos de otro usuario durante cambios de sesión.

2. **Backend producer mínimo viable**
   - `complete_profile`: se sincroniza desde cambios en `users/{userId}.onboarded`.
   - `group_join_requests_pending`: se sincroniza desde cambios en `groups/{groupId}.pendingRequestIds` para admins del grupo.
   - `group_admin_requests_pending`: se sincroniza desde cambios en `groups/{groupId}.pendingAdminRequestIds` para el owner del grupo.
   - Todos los producers escriben con upsert idempotente en `users/{uid}/pendingAlerts/{alertId}` y resuelven el pendiente cuando la condición deja de aplicar.

3. **Backfill inicial**
   - `cd volley-ranking-system/functions && npm run backfill:pending-alerts` ejecuta el relevamiento en modo dry-run.
   - `cd volley-ranking-system/functions && npm run backfill:pending-alerts:write` genera `complete_profile`, `group_join_requests_pending` y `group_admin_requests_pending` para datos ya cargados antes de desplegar los triggers.

4. **Reglas e índices de Firestore**
   - Se agregó una regla específica para que cada usuario autenticado lea solo `users/{uid}/pendingAlerts/*`.
   - La escritura cliente queda bloqueada porque los producers usan Admin SDK.
   - Se agregó el índice compuesto `status ASC, priority ASC, updatedAt DESC` para la query final del dashboard.

5. **Pendientes informativos de grupos**
   - `group_membership_result` se crea cuando una solicitud de ingreso a grupo es aprobada o rechazada.
   - El aviso expira a los 14 días mediante `expiresAt`.
   - Si la solicitud fue aprobada, el CTA apunta al detalle público del grupo; si fue rechazada, apunta al listado de grupos.

## Siguientes pasos

1. **Pendientes de torneos**
   - Crear producers para torneos en `draft`, `inscripciones_abiertas`, `inscripciones_cerradas` y `activo`.
   - Crear alerta para grupo aceptado en torneo no cancelado/finalizado.
   - Crear alerta para resultados pendientes en torneos activos.

2. **Limpieza y mantenimiento**
   - Agregar job programado para cerrar o borrar alertas expiradas/resueltas antiguas.
   - Agregar métricas/logs para controlar cantidad de pendientes activos por usuario.

3. **Permisos globales de Firestore**
   - Reemplazar la regla catch-all temporal heredada por reglas específicas para el resto de colecciones de la app.
   - Mantener `pendingAlerts` como subcolección de solo lectura para el usuario dueño.
