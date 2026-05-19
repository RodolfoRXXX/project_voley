# Bugs, seguridad y performance: listado priorizado de mejoras

Este documento registra el backlog priorizado de mejoras detectadas en la auditoría técnica, excluyendo el punto de escalamiento de privilegios por onboarding/cambio de rol. También mantiene el progreso de las reparaciones iniciadas.

## Estado general de progreso

| Prioridad | Punto | Estado | Última actualización |
|---|---|---|---|
| P1 | `joinMatch` con transacción, ID determinístico y validación de estado | ✅ Implementado | 2026-05-18 |
| P1 | Bug de `rankingService` por `functions` no importado | ✅ Implementado | 2026-05-18 |
| P1 | Variable global accidental en `requestTournamentRegistration` | ✅ Implementado | 2026-05-18 |
| P1 | Acceso correcto a grupos privados para miembros | ✅ Implementado | 2026-05-18 |
| P2 | Restringir lectura pública de `users` | ⏳ Pendiente | 2026-05-18 |
| P2 | Revisar reglas públicas de colecciones sensibles | ⏳ Pendiente | 2026-05-18 |
| P2 | Restringir CORS | ✅ Implementado | 2026-05-18 |
| P2 | Validar URLs de push notifications | ✅ Implementado | 2026-05-19 |
| P2 | Codificar parámetros en rutas proxy | ✅ Implementado | 2026-05-19 |
| P3 | Optimizar N+1 en `recalcularRanking` | ⏳ Pendiente | 2026-05-18 |
| P3 | Reducir transacción pesada en `onMatchStart` | ⏳ Pendiente | 2026-05-18 |
| P3 | Desnormalizar conteo de matches en grupos | ⏳ Pendiente | 2026-05-18 |
| P3 | Paginación en detalle de grupo | ⏳ Pendiente | 2026-05-18 |
| P3 | Limitar concurrencia de push | ⏳ Pendiente | 2026-05-18 |
| P4 | Validaciones completas en edición de torneos | ✅ Implementado | 2026-05-18 |
| P4 | Tests reales para Cloud Functions y reglas Firestore | ⏳ Pendiente | 2026-05-18 |
| P4 | Lint para backend | ⏳ Pendiente | 2026-05-18 |
| P4 | Fuentes locales para builds reproducibles | ✅ Implementado | 2026-05-18 |
| P4 | Reducir logs excesivos en jobs recurrentes | ⏳ Pendiente | 2026-05-18 |

## Reparaciones realizadas


### 2026-05-19 — P2: endurecimiento de navegación push, rutas proxy y retención de suscripciones

Se implementaron los puntos 2.4, 2.5 y 2.6 del backlog.

Acciones aplicadas:

- Se reforzó el service worker para parsear `payload.url` con `new URL(..., self.location.origin)` y forzar navegación solo a mismo origen.
- Se normaliza cualquier URL inválida o externa al fallback `/` antes de `client.navigate` y `clients.openWindow`.
- Se añadió validación/normalización en backend para URLs push salientes, emitiendo solo rutas internas cuando la URL no pertenece al origen permitido.
- Se codificaron con `encodeURIComponent` los parámetros dinámicos (`groupId`, `userId`) en las rutas proxy de Next hacia Functions.
- Se incorporó limpieza automática de suscripciones push por usuario: retención de 180 días y límite máximo de 5 suscripciones activas por usuario, eliminando excedentes antiguas.

Por qué se hizo:

- Evita redirecciones inesperadas desde notificaciones push.
- Reduce errores/bypasses en rutas proxy ante IDs con caracteres especiales.
- Disminuye exposición de datos sensibles al limitar persistencia de endpoints y claves antiguas.
- Controla crecimiento de datos y posibles costos operativos de push.


### 2026-05-18 — P1: endurecimiento de `joinMatch`

Se inició por el primer punto de prioridad: hacer que la inscripción a partidos sea idempotente y consistente.

Acciones aplicadas:

- Se reemplazó la creación con ID aleatorio por un documento determinístico `participations/{matchId}_{userId}`.
- Se envolvió la validación y creación en una transacción de Firestore.
- Se agregó validación server-side de estado del partido:
  - el match debe existir;
  - `estado` debe ser `abierto`;
  - `horaInicio` debe existir y ser futura;
  - el match no debe estar bloqueado con `lock === true`.
- Se mantuvo la validación de membresía para partidos `group_only`.
- Se mantiene una consulta de compatibilidad para detectar participaciones antiguas creadas con ID aleatorio y evitar duplicados durante la transición.

Por qué se hizo:

- Evita duplicados por doble click, reintentos del cliente o llamadas concurrentes.
- Evita inscripciones tardías en partidos ya iniciados o no inscribibles.
- Evita crear participaciones mientras el ranking está bloqueado, caso que podía dejar usuarios en estado `pendiente` sin recálculo.
- Facilita futuras migraciones porque el ID de participación pasa a ser predecible e idempotente.


### 2026-05-18 — P1: import faltante y global accidental

Se implementaron los puntos 1.3 y 1.4 del backlog.

Acciones aplicadas:

- Se importó `firebase-functions/v1` en `rankingService.js` para que el error `functions.https.HttpsError` por match inexistente no derive en `ReferenceError`.
- Se eliminó la asignación no declarada de `acceptedTournamentName` dentro de `requestTournamentRegistration`, ya que ese valor no se utiliza en el flujo de creación de inscripción.

Por qué se hizo:

- Preserva el error funcional esperado cuando el partido no existe.
- Evita contaminar el scope global de Cloud Functions entre invocaciones.
- Reduce riesgos de comportamiento no determinista y mejora compatibilidad con lint/modo estricto.


### 2026-05-18 — Verificación P1: puntos 1.1 a 1.4

Se verificó que los puntos 1.1, 1.2, 1.3 y 1.4 siguen correctamente implementados.

Evidencia revisada:

- `joinMatch` usa `participations/{matchId}_{userId}` como ID determinístico y ejecuta la creación dentro de `db.runTransaction`.
- `joinMatch` valida dentro del flujo transaccional que el partido exista, esté `abierto`, tenga `horaInicio` futura y no esté bloqueado.
- `rankingService.js` importa `firebase-functions/v1` antes de usar `functions.https.HttpsError`.
- `requestTournamentRegistration` no mantiene asignaciones globales accidentales; el nombre de torneo aceptado que existe en el service está declarado localmente en el flujo de revisión de inscripciones.


### 2026-05-18 — P1: acceso a grupos privados para miembros

Se implementó el punto 1.5 del backlog.

Acciones aplicadas:

- Se renombró `getPublicGroupOrAdmin` a `getGroupVisibleToAuthContext` para reflejar que ya no solo contempla grupos públicos o system admins.
- Se permite cargar un grupo privado cuando el usuario autenticado es integrante (`memberIds`) o administrador (`adminIds`, `admins` u `ownerId`).
- Se mantuvo el comportamiento de ocultar grupos privados a visitantes y usuarios sin relación con el grupo.

Por qué se hizo:

- Evita que miembros legítimos de grupos privados reciban 404 antes de que `handleGroupDetail` pueda verificar su membresía.
- Mantiene una única regla de visibilidad reutilizable por detalle, solicitudes y endpoints administrativos.



### 2026-05-18 — P2/P1.7: fuentes locales y CORS restringido

Se implementaron los puntos 1.7 y 2.2 del backlog.

Acciones aplicadas:

- Se eliminó `next/font/google` del layout principal para evitar descargas en build.
- Se reemplazaron las fuentes remotas por stacks de sistema definidos localmente en el layout para eliminar descargas externas y evitar assets binarios en el repositorio.
- Se definieron familias fallback para las variables `--font-outfit` y `--font-arizonia`.
- La HTTP Cloud Function ahora valida `Origin` contra una allowlist.
- `Access-Control-Allow-Origin` solo se responde cuando el origen está permitido.
- Se permite configurar orígenes adicionales por entorno con `HTTP_API_ALLOWED_ORIGINS` y `WEB_APP_URL`; el emulador conserva orígenes locales de desarrollo.
- Se agregan logs de advertencia para orígenes rechazados.

Por qué se hizo:

- El build del frontend ya no depende de Google Fonts ni de red externa para resolver fuentes.
- La API HTTP deja de combinar `Access-Control-Allow-Origin: *` con el header `Authorization`.
- Se reduce la superficie de abuso desde sitios externos sin bloquear llamadas server-to-server que no envían `Origin`.


### 2026-05-18 — P4: validaciones completas al editar torneos

Se implementó el punto 1.6 del backlog.

Acciones aplicadas:

- `editTournament` ahora fusiona el estado actual del torneo con el payload permitido según estado antes de validar.
- Se valida el objeto final completo para impedir invariantes rotos como `minTeams > maxTeams` o `maxPlayers < minPlayers`.
- Se rechazan valores inválidos explícitos en campos críticos, reglas, fechas, estructura y formato.
- Las reglas parciales se fusionan con las reglas existentes en lugar de reemplazar el objeto completo.
- La estructura parcial del torneo se normaliza mediante un merge centralizado antes de recalcular fases y reglas de avance.

Por qué se hizo:

- Evita que updates parciales dejen torneos imposibles de iniciar, cerrar o avanzar.
- Reduce riesgos de perder claves de `rules` cuando la UI envía solo una configuración parcial.
- Alinea edición y creación bajo validaciones de dominio equivalentes para campos críticos.

---

# 1. Errores lógicos y bugs potenciales

## 1.1. `joinMatch` permite duplicados y condiciones de carrera

**Importancia:** Muy alta.
**Estado:** ✅ Implementado.

El callable `joinMatch` consultaba si existía una participación y luego creaba otra con `.add()`, fuera de transacción. Eso permitía duplicados bajo concurrencia.

Acciones:

- Usar un ID determinístico para la participación: `${matchId}_${userId}`.
- Crear o validar la participación dentro de una transacción.
- Rechazar la inscripción si el documento ya existe.
- Validar dentro de la misma transacción que el match sigue en estado válido.
- Agregar tests de concurrencia contra el emulador de Firestore.

Por qué hacerlo:

- Evita que dos llamadas simultáneas creen dos participaciones para el mismo usuario.
- Reduce inconsistencias en ranking, cupos y estado de pagos.
- Hace que el flujo sea idempotente.
- Mejora la confiabilidad ante doble click, reintentos del cliente o mala conectividad.

## 1.2. `joinMatch` no valida suficientemente el estado del partido

**Importancia:** Muy alta.
**Estado:** ✅ Implementado.

`joinMatch` validaba existencia del match y membresía si el match era `group_only`, pero no validaba explícitamente que estuviera abierto o que la hora de inicio no hubiera pasado.

Acciones:

- Verificar que `match.estado === "abierto"`.
- Verificar que `match.horaInicio` exista.
- Rechazar la inscripción si `match.horaInicio <= now`.
- Definir una regla clara para estados `verificando`, `cerrado`, `jugado` y `cancelado`.
- Centralizar esta validación en una función de dominio.

Por qué hacerlo:

- Evita que usuarios se anoten en partidos cerrados, cancelados o ya iniciados.
- Reduce errores posteriores en triggers de cierre y ranking.
- Hace que la regla de negocio esté explícita en backend, no solo en la UI.

## 1.3. `rankingService` puede lanzar `ReferenceError` al manejar un match inexistente

**Importancia:** Alta.
**Estado:** ✅ Implementado.

`rankingService.js` usaba `functions.https.HttpsError`, pero no importaba `firebase-functions/v1`.

Acciones:

- Se importó `functions` en `rankingService.js`.
- O reemplazar `HttpsError` por errores de dominio internos.
- Agregar un test unitario para el caso `matchId` inexistente.
- Revisar otros services para detectar referencias no importadas.

Por qué hacerlo:

- El error actual oculta la causa real del problema.
- Dificulta debugging en producción.
- Puede hacer fallar flujos administrativos como edición de match o recálculo de ranking.

## 1.4. Variable global accidental en `requestTournamentRegistration`

**Importancia:** Alta.
**Estado:** ✅ Implementado.

Dentro de `requestTournamentRegistration`, se asignaba `acceptedTournamentName` sin declaración previa.

Acciones:

- Se eliminó la asignación porque no se usa en el flujo de solicitud de inscripción.
- O declarar la variable localmente con `let` / `const`.
- Activar lint para el código de Cloud Functions.
- Agregar regla ESLint `no-undef`.
- Ejecutar lint también en `volley-ranking-system/functions`.

Por qué hacerlo:

- Evita contaminación de scope global.
- Previene bugs difíciles de reproducir entre invocaciones de Cloud Functions.
- Mejora compatibilidad con modo estricto y herramientas modernas.
- Reduce riesgo de comportamiento no determinista.

## 1.5. Usuarios miembros de grupos privados pueden quedar bloqueados por la API HTTP

**Importancia:** Alta.
**Estado:** ✅ Implementado.

`getPublicGroupOrAdmin` devuelve el grupo solo si el usuario es system admin o si el grupo es público. Después, `handleGroupDetail` intenta verificar si el usuario es miembro, pero esa validación puede no ejecutarse porque el grupo privado ya fue descartado.

Acciones:

- Cambiar `getPublicGroupOrAdmin` para contemplar membresía.
- Permitir acceso si el grupo es público, el usuario es system admin, el usuario está en `memberIds` o el usuario está en `adminIds`.
- Renombrar la función para expresar mejor su comportamiento.
- Agregar tests para visitantes, miembros, admins de grupo y system admins.

Por qué hacerlo:

- Corrige un bug funcional importante para grupos privados.
- Evita que usuarios legítimos reciban 404/403 incorrectos.
- Reduce inconsistencias entre reglas Firestore, UI y API HTTP.

## 1.6. Validaciones de edición de torneo pueden romper invariantes

**Importancia:** Media/alta.
**Estado:** ✅ Implementado.

`validateTournamentUpdate` permite updates parciales de campos críticos, pero no revalida completamente el estado final del torneo como sí ocurre durante la creación.

Acciones:

- Fusionar el estado actual del torneo con el payload de actualización.
- Validar el objeto final completo.
- Rechazar casos como `minTeams > maxTeams`, `maxPlayers < minPlayers`, formatos inválidos o estructuras inválidas.
- Evitar reemplazar objetos completos como `rules` si solo llega una clave parcial.
- Agregar tests para edición en estados `draft`, `open` y `closed`.

Por qué hacerlo:

- Evita torneos imposibles de cerrar, iniciar o finalizar.
- Previene errores en fixture, standings y avance de fases.
- Reduce bugs causados por updates parciales desde la UI.

## 1.7. El build depende de Google Fonts en tiempo de compilación

**Importancia:** Media.
**Estado:** ✅ Implementado.

El layout importa fuentes mediante `next/font/google`, lo que hace que el build dependa de una descarga externa.

Acciones:

- Eliminar `next/font/google` del layout.
- Definir fuentes locales mediante stacks de sistema en variables CSS.
- Mantener fallback fonts explícitas.
- Validar el build en CI sin depender de red externa.

Por qué hacerlo:

- Hace el build reproducible.
- Evita fallos de deploy por red, DNS, bloqueo externo o disponibilidad temporal de Google Fonts.
- Mejora control sobre assets críticos de UI.

## 1.8. Falta suite de tests real para Cloud Functions

**Importancia:** Media.
**Estado:** ⏳ Pendiente.

El package de functions define `npm test` como un comando que falla intencionalmente.

Acciones:

- Agregar Jest, Vitest o una suite basada en Firebase Emulator.
- Crear tests para servicios puros.
- Crear tests de integración para callables críticos.
- Cubrir inscripción a matches, inscripción a torneos, edición de torneos, permisos de grupos privados, cierre automático y ranking.

Por qué hacerlo:

- Actualmente muchos bugs solo se detectarían manualmente o en producción.
- Las reglas de negocio son complejas y merecen tests de regresión.
- Facilita refactors seguros.

---

# 2. Vulnerabilidades de seguridad críticas

## 2.1. Lectura pública amplia de documentos de usuarios

**Importancia:** Muy alta.
**Estado:** ⏳ Pendiente.

Las reglas permiten leer cualquier documento de `/users/{userId}` públicamente, y la API puede exponer email, foto, nombre y posiciones en ciertos payloads.

Acciones:

- Cambiar `/users/{userId}` para permitir lectura solo al propietario o administradores.
- Crear una colección separada `publicProfiles`.
- Guardar en `publicProfiles` solo datos estrictamente públicos.
- Evitar exponer email salvo en vistas administrativas autorizadas.
- Revisar todos los componentes que leen `users` directamente.

Por qué hacerlo:

- Reduce exposición de PII.
- Evita enumeración de usuarios.
- Alinea el modelo de datos con el principio de mínimo privilegio.
- Facilita cumplir requisitos básicos de privacidad.

## 2.2. CORS abierto en la HTTP Cloud Function

**Importancia:** Alta.
**Estado:** ✅ Implementado.

La función HTTP responde con `Access-Control-Allow-Origin: *` y permite el header `Authorization`.

Acciones:

- Definir allowlist de orígenes permitidos.
- Validar `req.headers.origin`.
- Responder `Access-Control-Allow-Origin` solo si el origen está permitido.
- Separar configuración por entorno.
- Añadir logs para orígenes rechazados.
- Considerar Firebase App Check para endpoints sensibles.

Por qué hacerlo:

- Reduce superficie de abuso desde sitios externos.
- Protege mejor endpoints que aceptan tokens Bearer.
- Ayuda a limitar llamadas automatizadas desde orígenes no controlados.

## 2.3. Reglas Firestore demasiado permisivas para datos de dominio

**Importancia:** Alta.
**Estado:** ⏳ Pendiente.

Varias colecciones de dominio permiten lectura pública, incluyendo grupos, matches, participaciones, stats, torneos, registrations y teams.

Acciones:

- Clasificar cada colección como pública, autenticada, miembro de grupo, admin de grupo, admin de torneo o privada.
- Crear proyecciones públicas para datos visibles.
- Restringir colecciones internas.
- Revisar especialmente `participations`, `tournamentRegistrations` y `groupStats`.
- Añadir tests de reglas Firestore.

Por qué hacerlo:

- Minimiza fuga de información operacional.
- Evita exposición innecesaria de pagos, participaciones o estadísticas.
- Permite evolucionar privacidad sin romper la UI pública.

## 2.4. Service worker navega a URLs de notificaciones sin validar origen

**Importancia:** Media/alta.
**Estado:** ✅ Implementado.

El service worker usa `payload.url` para navegar o abrir ventanas.

Acciones:

- Parsear la URL con `new URL(targetUrl, self.location.origin)`.
- Rechazar URLs cuyo `origin` no coincida con `self.location.origin`.
- Normalizar URLs externas a `/`.
- Validar también en backend antes de enviar push.
- Agregar test manual o unitario del service worker.

Por qué hacerlo:

- Evita navegación inesperada a dominios externos.
- Reduce riesgo si alguna notificación queda mal formada.
- Protege contra abuso futuro si el payload push se vuelve más dinámico.

## 2.5. Parámetros de rutas proxy interpolados sin `encodeURIComponent`

**Importancia:** Media.
**Estado:** ✅ Implementado.

Las rutas Next proxy interpolan parámetros directamente al construir URLs upstream.

Acciones:

- Aplicar `encodeURIComponent` a `groupId`, `userId`, `matchId` y cualquier parámetro dinámico.
- Crear helper compartido para construir URLs hacia Functions.
- Revisar todas las rutas bajo `src/app/api`.
- Agregar tests simples para IDs con caracteres especiales.

Por qué hacerlo:

- Evita rutas malformadas.
- Reduce errores por caracteres especiales.
- Hace más robusto el proxy interno.
- Previene posibles bypasses de routing por valores inesperados.

## 2.6. Suscripciones push almacenan secretos de endpoints en Firestore

**Importancia:** Media.
**Estado:** ✅ Implementado.

Las suscripciones push almacenan `endpoint`, `p256dh_key` y `auth_key`. Las reglas bloquean lectura/escritura directa, pero estos datos siguen siendo sensibles.

Acciones:

- Mantener la colección completamente privada.
- Añadir retención/limpieza de suscripciones viejas.
- Evitar logs de endpoints.
- Considerar cifrado de campos sensibles si el riesgo lo justifica.
- Limitar el número de suscripciones por usuario/dispositivo.

Por qué hacerlo:

- Reduce impacto ante acceso indebido a Firestore/Admin SDK.
- Evita acumulación de datos obsoletos.
- Controla costos y abuso de notificaciones.

---

# 3. Cuellos de botella de rendimiento

## 3.1. N+1 lecturas en `recalcularRanking`

**Importancia:** Muy alta.
**Estado:** ⏳ Pendiente.

`recalcularRanking` obtiene participaciones y luego, para cada una, lee el usuario y las estadísticas del grupo de forma secuencial.

Acciones:

- Recolectar todos los `userId`.
- Leer usuarios con `db.getAll(...refs)`.
- Leer `groupStats` con `db.getAll(...refs)`.
- Procesar en memoria.
- Mantener un único batch de escritura.
- Considerar guardar campos necesarios de ranking directamente en la participación.

Por qué hacerlo:

- Reduce latencia de forma importante.
- Baja costos de lectura.
- Evita timeouts con partidos grandes.
- Hace que el ranking escale mejor.

## 3.2. Transacción pesada en `onMatchStart`

**Importancia:** Muy alta.
**Estado:** ⏳ Pendiente.

`onMatchStart` ejecuta una transacción que consulta participaciones titulares, lee stats y usuarios por cada participación, actualiza stats, usuarios, grupo y match.

Acciones:

- Reducir la transacción al cambio atómico de estado del match.
- Usar `FieldValue.increment(1)` para contadores.
- Procesar estadísticas fuera de la transacción de estado.
- Hacer el proceso idempotente con un flag como `statsAppliedAt`.
- Si el volumen crece, mover procesamiento a Cloud Tasks o Pub/Sub.

Por qué hacerlo:

- Disminuye retries y conflictos.
- Reduce riesgo de timeouts.
- Hace el cierre de partidos más confiable.
- Mejora escalabilidad con muchos titulares o muchos matches simultáneos.

## 3.3. Listado de grupos hace un conteo de matches por cada grupo

**Importancia:** Alta.
**Estado:** ⏳ Pendiente.

`handleListPublicGroups` lista grupos y `buildGroupPayload` ejecuta un count query sobre `matches` para cada grupo.

Acciones:

- Agregar campo desnormalizado `matchesCount` o `totalMatches` en `groups`.
- Incrementarlo al crear match.
- Decrementarlo o recalcularlo al eliminar match.
- Usar triggers o lógica de servicio para mantenerlo consistente.
- Evitar count queries en listados públicos.

Por qué hacerlo:

- Evita patrón N+1 en el endpoint de grupos.
- Reduce latencia de la pantalla pública.
- Reduce costos de Firestore.
- Mejora experiencia de usuario en listados con muchos grupos.

## 3.4. `handleGroupDetail` carga todos los matches del grupo sin paginación

**Importancia:** Alta.
**Estado:** ⏳ Pendiente.

`handleGroupDetail` consulta todos los matches del grupo ordenados por `horaInicio desc`.

Acciones:

- Agregar `limit`.
- Implementar paginación con cursor.
- Separar resumen de grupo de historial completo de matches.
- En la UI, cargar historial bajo demanda.
- Definir límites razonables por defecto, por ejemplo 20 o 50 matches.

Por qué hacerlo:

- Evita respuestas grandes.
- Reduce latencia y consumo de memoria.
- Mejora el rendimiento de grupos con mucho historial.
- Hace más estable el endpoint público/protegido.

## 3.5. Fan-out push sin límite de concurrencia

**Importancia:** Media/alta.
**Estado:** ⏳ Pendiente.

`sendToManyUsers` ejecuta `Promise.all` sobre todos los usuarios, y cada usuario consulta sus suscripciones.

Acciones:

- Procesar usuarios en lotes.
- Limitar concurrencia, por ejemplo 5, 10 o 20 envíos simultáneos.
- Agrupar queries de suscripciones cuando sea posible.
- Mover envíos masivos a Cloud Tasks.
- Registrar métricas de enviados/fallidos.

Por qué hacerlo:

- Evita picos de carga.
- Reduce riesgo de rate limiting.
- Mejora estabilidad de Cloud Functions.
- Facilita observabilidad y reintentos.

## 3.6. Logs excesivos en procesos programados y ranking

**Importancia:** Media.
**Estado:** ⏳ Pendiente.

`onMatchDeadline` y `rankingService` tienen múltiples `console.log` por ejecución y por match.

Acciones:

- Cambiar logs detallados a nivel debug controlado por variable de entorno.
- Mantener logs de error y eventos clave.
- Evitar logs por documento en loops de alto volumen.
- Estructurar logs con campos útiles: `matchId`, `groupId`, `stage`.

Por qué hacerlo:

- Reduce costos de logging.
- Mejora legibilidad de logs en producción.
- Evita ruido durante jobs recurrentes.
- Facilita diagnóstico real de incidentes.

## 3.7. Build frontend no es completamente reproducible por dependencia de red

**Importancia:** Media.
**Estado:** ⏳ Pendiente.

El build depende de la descarga externa de fuentes desde Google Fonts.

Acciones:

- Migrar fuentes a assets locales.
- Cachear dependencias de build en CI.
- Evitar recursos externos en tiempo de compilación.
- Validar build en modo offline si es posible.

Por qué hacerlo:

- Reduce fallos intermitentes en CI/CD.
- Acelera builds.
- Aumenta confiabilidad del despliegue.
