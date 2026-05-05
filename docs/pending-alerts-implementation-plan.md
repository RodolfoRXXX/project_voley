# Plan de implementación de pendientes del dashboard

## Estado implementado

1. **Frontend base**
   - `PendingAlertsSection` muestra pendientes por severidad y CTA.
   - El dashboard se suscribe a `users/{uid}/pendingAlerts` y ordena por prioridad.
   - Al iniciar una nueva suscripción se limpian las alertas previas para evitar mostrar datos de otro usuario durante cambios de sesión.

2. **Backend producer mínimo viable**
   - `complete_profile`: se sincroniza desde cambios en `users/{userId}.onboarded`.
   - `group_join_requests_pending`: se sincroniza desde cambios en `groups/{groupId}.pendingRequestIds` para admins del grupo.
   - `group_admin_requests_pending`: se sincroniza desde cambios en `groups/{groupId}.pendingAdminRequestIds` para el owner del grupo.
   - Todos los producers escriben con upsert idempotente en `users/{uid}/pendingAlerts/{alertId}` y resuelven el pendiente cuando la condición deja de aplicar.

## Siguientes pasos

1. **Backfill inicial**
   - Crear un script administrativo para recorrer usuarios y grupos existentes.
   - Generar `complete_profile`, `group_join_requests_pending` y `group_admin_requests_pending` para datos ya cargados antes de desplegar los triggers.

2. **Reglas e índices de Firestore**
   - Agregar reglas para permitir que cada usuario lea solo `users/{uid}/pendingAlerts/*`.
   - Crear el índice compuesto para la query final si se ordena desde Firestore: `status ASC, priority ASC, updatedAt DESC`.

3. **Pendientes informativos de grupos**
   - Crear `group_membership_result` cuando una solicitud de ingreso sea aprobada o rechazada.
   - Definir expiración (`expiresAt`) para que estos avisos no queden activos indefinidamente.

4. **Pendientes de torneos**
   - Crear producers para torneos en `draft`, `inscripciones_abiertas`, `inscripciones_cerradas` y `activo`.
   - Crear alerta para grupo aceptado en torneo no cancelado/finalizado.
   - Crear alerta para resultados pendientes en torneos activos.

5. **Limpieza y mantenimiento**
   - Agregar job programado para cerrar o borrar alertas expiradas/resueltas antiguas.
   - Agregar métricas/logs para controlar cantidad de pendientes activos por usuario.
