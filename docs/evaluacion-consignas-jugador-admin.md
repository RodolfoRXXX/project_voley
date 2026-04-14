# Evaluación de cobertura funcional (Jugador/Admin)

Fecha de análisis: 2026-03-30.

## Resumen ejecutivo

La plataforma **sí cubre el core operativo** de organización de partidos y torneos (grupos, partidos, inscripciones, ranking titular/suplente, pagos administrativos, armado de equipos y módulo de torneos con fixture/standings). Sin embargo, **no cubre todavía varios diferenciales de crecimiento**: chat/mensajería, notificaciones push in-app, descubrimiento geolocalizado, gamificación social (logros/MVP/contenido), reputación y skill matching.

## Matriz de cobertura

### 1) Jugador

| Necesidad | Estado | Evidencia |
|---|---|---|
| Ver partidos próximos (fecha/hora/lugar lógico del grupo) | ✅ Cumple | Dashboard muestra próximos partidos y estado, más torneos programados. |
| Confirmar asistencia (RSVP) | ✅ Cumple | El jugador puede unirse/salir de partido (`joinMatch`/`leaveMatch`). |
| Saber quién juega / quién falta | ✅ Cumple (sin capa social enriquecida) | En detalle de match hay tablas de participaciones por estado. |
| Chat de equipo / grupo | ❌ No cumple | No existe módulo/callable de chat ni vistas dedicadas. |
| Notificaciones por cambios/cancelaciones | 🟡 Parcial | Hay envío por email en deadlines al admin; no se ve push in-app al jugador. |
| Mensajes directos o grupales | ❌ No cumple | No hay entidades/rutas de mensajes directos o grupales. |
| Inscribirse a partidos/torneos | ✅ Cumple | Join/leave de partidos + inscripción de grupo a torneos. |
| Ver equipos armados | ✅ Cumple | Flujo de generación y visualización de equipos. |
| Historial de partidos jugados | ✅ Cumple | Perfil con historial y filtros por estado de partido. |
| Perfiles (foto/nivel/posición) | 🟡 Parcial | Hay perfil con foto, rol, compromiso y posiciones preferidas; no hay nivel competitivo explícito. |
| Ranking / estadísticas personales avanzadas (ganados/rendimiento) | 🟡 Parcial | Hay compromiso e historial; no se ve métricas personales completas de rendimiento/ganados. |
| Logros (MVP, puntos, cartas, etc.) | ❌ No cumple | No aparecen estructuras de logros/gamificación. |
| Fotos o contenido del partido | ❌ No cumple | No hay módulo de media/subidas. |
| Jugar en varios grupos | ✅ Cumple | Modelo y vistas soportan membresía múltiple. |
| Unirse a nuevos grupos/torneos | ✅ Cumple | Hay listados públicos + flujo de unión/solicitud de ingreso y registro en torneos. |
| Descubrir partidos cercanos (geolocalización) | ❌ No cumple | No hay ubicación geográfica, lat/lng ni búsqueda por cercanía. |

### 2) Administrador

| Necesidad | Estado | Evidencia |
|---|---|---|
| Crear grupos/equipos, invitar jugadores, roles/admin | ✅ Cumple | Alta y gestión de grupos, miembros y admins. |
| Control de acceso | ✅ Cumple | Checks por `adminIds`/roles y guardas en frontend/backend. |
| Crear partidos (fecha, reglas operativas, cupos) | ✅ Cumple | Alta de partido con fecha/hora, formación, suplentes, visibilidad. |
| Armar equipos automático/manual | 🟡 Parcial-alto | Hay armado automático y rehacer; no se observa editor manual fino de alineaciones. |
| Gestión de torneos (liga/eliminación/mixto) | ✅ Cumple | Alta y administración de torneos con fases. |
| Fixture automático | ✅ Cumple | Preview/confirm de fixture y manejo por fase. |
| Tabla de posiciones y resultados | ✅ Cumple | Standings y carga de resultados en panel admin. |
| Control de asistencia, lista de espera, reemplazos | ✅ Cumple (con semántica titular/suplente) | Participaciones titular/suplente + promoción automática de suplente ante baja. |
| Comunicación masiva (push/anuncios in-app) | 🟡 Parcial | Se observa email por deadlines, no canal push in-app robusto. |
| Gestión económica (cobros/estado pagos/integración pagos) | 🟡 Parcial | Estado y montos de pago soportados; no integración explícita con pasarela de pago. |
| Estadísticas y seguimiento de torneos | ✅ Cumple | Standings, fixtures y fases con avance competitivo. |
| Escalabilidad operativa (múltiples grupos/torneos, panel) | ✅ Cumple | Hay paneles admin para grupos y torneos, y soporte multi-entidad. |

## Gaps prioritarios para mejorar el producto

1. **Comunicación integrada real** (chat de grupo/match + mensajería directa + anuncios admin).
2. **Notificaciones push multi-canal** (push móvil/web + email + in-app inbox con preferencias).
3. **Descubrimiento geográfico** (partidos cercanos, filtros por zona/horario/nivel).
4. **Skill matchmaking** (nivel declarado + rating dinámico + balance automático de equipos).
5. **Reputación comunitaria** (puntualidad, asistencia, fair play, no-show score).
6. **Gamificación** (logros, MVP, rachas, badges, progreso).
7. **Pagos integrados** (pasarela local/internacional, conciliación, recordatorios y deuda).
8. **Métricas personales avanzadas** (ganados/perdidos, set ratio, evolución por posición, comparación por período).
9. **Moderación y seguridad social** (reportes, bloqueos, reglas de convivencia, auditoría de acciones críticas).
10. **Automatización de operación** (recordatorios automáticos configurables, plantillas de torneos, SLA operativos para admins).

## Conclusión

- Para el problema “**organizar partidos y torneos sin caos operativo**”, el repositorio está **bien encaminado y funcional en el core**.
- Para el problema “**escalar como red deportiva y retener usuarios por experiencia social**”, faltan componentes clave (chat, push, descubrimiento, reputación, gamificación, pagos integrados).
