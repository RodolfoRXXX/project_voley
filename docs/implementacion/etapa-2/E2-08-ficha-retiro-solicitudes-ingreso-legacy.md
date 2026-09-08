# Ficha de Incremento Implementable E2-08 — Retiro del flujo legacy de ingreso por arrays

## Estado de la ficha

- **Identificador:** E2-08.
- **Título:** Retiro del flujo legacy de ingreso por arrays.
- **Estado:** `APROBADA — LISTA PARA VERSIONAR`.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Tipo de corte:** transición técnica vertical, mínima y verificable.
- **Casos de uso preservados:** CU-031 — solicitar ingreso; CU-032 — aprobar Solicitud; CU-033 — rechazar Solicitud.
- **Brecha atendida:** retiro del camino alternativo que representa solicitudes e incorporación mediante arrays del documento Grupo.
- **Fuentes de verdad preservadas:** Solicitud para la intención y su decisión; Membresía para la pertenencia; Grupo exclusivamente para ownership y estado propios.
- **Checkpoint documental:** rama `dev`, HEAD y `origin/dev` en `02a79812a7b3cc9abd66459a3b1cd0989f384099`, divergencia `0/0` y árbol e índice limpios al iniciar.
- **Archivo único autorizado en esta intervención:** `docs/implementacion/etapa-2/E2-08-ficha-retiro-solicitudes-ingreso-legacy.md`.

Esta ficha define exclusivamente E2-08. No implementa el retiro, no crea una rama, no autoriza commit, push, merge, deploy ni acceso a Firebase remoto y no modifica documentos anteriores. La implementación futura requerirá aprobación documental y autorización expresas.

## 1. Alcance derivado y fundamento

### 1.1 Incremento que habilita realmente E2-07

E2-07 cerró el recorrido canónico completo de una Solicitud de ingreso:

1. E2-06 ya permitía crear, consultar y cancelar una Solicitud independiente y listar pendientes para el Owner;
2. E2-07 agregó aprobación, rechazo, consulta autoritativa y coordinación recuperable con Membresía;
3. la aprobación confirma primero la Membresía y sólo después declara la Solicitud `aprobada`;
4. el frontend canónico ya consume callables backend y no Firestore;
5. por primera vez existe reemplazo canónico para creación y resolución de solicitudes de ingreso.

La ficha E2-06 dejó una condición explícita: no retirar consumidores legacy cuyo reemplazo dependiera de E2-07 y efectuar el retiro por consumidor, no mediante una migración horizontal. Esa condición quedó satisfecha al cerrar E2-07.

Por lo tanto, el siguiente corte mínimo no es volver a implementar la “Resolución de Solicitud” que el mapa preliminar de Documento 5 numeraba E2-08. La numeración efectiva ya consumió ese corte en E2-07. Tampoco surge causalmente una obligación de incorporar notificaciones, Actividad, roles, reactivación, renovación, Plan o Suscripción.

E2-08 toma una porción acotada del retiro consolidado preliminar de Etapa 2: elimina sólo el camino legacy de ingreso y decisión basado en `groups.pendingRequestIds` y en la mutación de `groups.memberIds` desde ese mismo flujo. No retira todos los arrays ni cierra Etapa 2.

### 1.2 Por qué no reactivación ni renovación

- CU-028 — reactivar Membresía es un cambio de lifecycle sobre la misma Membresía y exige que su Temporada siga abierta.
- CU-029 — renovar Membresía crea una nueva Membresía para una nueva Temporada y preserva trazabilidad con la anterior.
- E2-05 postergó ambos casos y E2-06 dejó pendiente decidir su relación con antecedentes finalizados.
- E2-07 falla cerrado con `MEMBERSHIP_REACTIVATION_REQUIRED`; no define la transición de reactivación ni sus actores, contratos o concurrencia.
- Renovación continúa dependiendo de evolución de Temporada e historial todavía no implementada.

Definir cualquiera de esos casos como consecuencia automática de E2-07 introduciría una decisión funcional no cerrada. Permanecen candidatos a fichas posteriores independientes.

## 2. Objetivo

Eliminar la segunda autoridad técnica y funcional para solicitar ingreso y resolver solicitudes que todavía subsiste en superficies legacy, de modo que:

- CU-031, CU-032 y CU-033 sólo puedan ejecutarse mediante los contratos canónicos E2-06/E2-07;
- ninguna ruta o interfaz legacy cree una solicitud en `groups.pendingRequestIds`;
- ninguna decisión legacy incorpore una identidad a `groups.memberIds` ni retire una solicitud de un array;
- ninguna pantalla presente esos arrays como Solicitudes vigentes;
- ningún trigger o script derive alertas de solicitud desde esos arrays;
- los datos legacy preexistentes permanezcan sin adoptar, migrar, borrar ni convertir;
- el flujo canónico conserve íntegros sus contratos, schemas, recuperación y autorización.

El resultado observable es la ausencia del flujo alternativo. E2-08 no agrega una capacidad de producto: hace exclusiva la capacidad ya cerrada.

## 3. Alcance implementable

### 3.1 Incluido

1. Desacoplar del endpoint compartido `POST /groups/{groupId}/join` las ramas que solicitan ingreso, cancelan una solicitud por toggle o incorporan directamente a una no integrante. Conservar temporalmente sólo la salida de una integrante legacy ya existente.
2. Retirar del HTTP API legacy:
   - `POST /groups/{groupId}/requests/{userId}/approve`;
   - `POST /groups/{groupId}/requests/{userId}/reject`.
3. Retirar sólo las rutas BFF exclusivas de aprobación y rechazo. Conservar la ruta BFF `/join` porque también sirve al consumidor vigente de salida.
4. Retirar de las pantallas legacy los controles para solicitar, cancelar, aprobar o rechazar ingreso mediante esos endpoints.
5. Retirar de payloads y tipos de presentación legacy la representación de `pendingRequests` y `pendingRequestIds` cuando su único propósito sea el flujo eliminado.
6. Retirar el listener Firestore directo que observa `groups.pendingRequestIds`.
7. Desacoplar del trigger y del script de backfill de alertas exclusivamente el cómputo y la generación derivados de `pendingRequestIds`, preservando sus responsabilidades administrativas y de Torneos.
8. Mantener y señalar el acceso canónico existente `/join/groups/[groupId]` sólo donde exista ya un `groupId` canónico conocido y la navegación pueda enlazarse sin convertir grupos legacy.
9. Agregar pruebas de ausencia de rutas, escritores, lectores funcionales y UI legacy de solicitudes.
10. Conservar pruebas de regresión focales sobre los contratos E2-06/E2-07.

El endpoint combinado `/join` no es eliminable como archivo, ruta o dispatch en este corte: la pantalla de perfil lo utiliza para la salida de integrantes legacy, un caso aún vigente y excluido. El handler se separará conceptualmente como `handleLeaveGroup` o nombre interno equivalente. Sólo una identidad autenticada que ya figure en `memberIds` podrá ejecutar la salida existente. Para no integrantes —incluidas identidades presentes en `pendingRequestIds`— responderá `404` genérico sin escribir, sin cancelar, solicitar o incorporar, sin fallback y sin redirección canónica.

### 3.2 Inventario vinculante y disposición por pieza

| Pieza actual | Responsabilidad comprobada | Clasificación | Disposición E2-08 |
| --- | --- | --- | --- |
| `functions/src/httpApi.js` — `handleJoinGroup` | combina salida, cancelación/creación de solicitud por toggle y alta directa por `memberIds` | compartida | **Desacoplar**: conservar sólo salida de integrante ya existente; eliminar ramas de no integrante y toda escritura de `pendingRequestIds` desde este handler |
| `functions/src/httpApi.js` — `joinMatch` | dispatch de `POST /groups/:groupId/join` | compartida con salida vigente | **Conservar** y dirigir al handler leave-only |
| `functions/src/httpApi.js` — `handleJoinRequestAction` | aprueba/rechaza por UID, actualiza `memberIds`/`pendingRequestIds` y crea alerta | exclusiva del flujo reemplazado | **Eliminar** |
| `functions/src/httpApi.js` — `approveJoinRequestMatch` y `rejectJoinRequestMatch` | dispatch de decisiones legacy | exclusivas | **Eliminar**; el fallback común del API queda a cargo del `404` |
| `functions/src/httpApi.js` — `buildGroupPayload` | arma listado público y deriva `membershipStatus`, incluido `pending` | compartida | **Adaptar mínimamente**: conservar estado `member`/`none`, conteos y datos vigentes; eliminar derivación `pending` |
| `functions/src/httpApi.js` — `handleGroupDetail` | compone integrantes, solicitudes de ingreso y solicitudes administrativas | compartida | **Adaptar mínimamente**: retirar `pendingRequests`/`pendingRequestIds` y su resolución de usuarios; conservar integrantes, admins, `pendingAdminRequests` y resto del payload |
| `functions/src/httpApi.js` — `getGroupVisibleToAuthContext`, `mapUsersByIds`, `sortMembersByName`, `cleanStringArray`, `canManageGroup*` | visibilidad, lectura y utilidades usadas por múltiples rutas | utilidades compartidas | **Conservar**; sólo desaparecen invocaciones que eran exclusivas de solicitudes de ingreso |
| `functions/src/httpApi.js` — `handleGroupMemberAdd` | alta administrativa separada; además limpia el UID de `pendingRequestIds` | writer legacy todavía vigente | **Conservar sin reinterpretar**. Su limpieza colateral queda fuera; no se usa como decisión ni se modifica en E2-08 |
| `functions/src/httpApi.js` — handlers `members/remove`, `members/search`, admins y admin-requests | pertenencia, búsqueda o administración legacy distinta | otros consumidores/writers activos | **Conservar** |
| `functions/src/httpApi.js` — CORS, Auth y export HTTP | infraestructura común a todos los endpoints | utilidad compartida | **Conservar** sin cambios funcionales |
| `functions/src/services/pendingAlertsService.js` | helper `createGroupMembershipResultAlert` cubre accepted/rejected y removed; el módulo contiene más alertas | utilidad compartida | **Adaptar mínimamente**: retirar ramas accepted/rejected y conservar la alerta de remoción mediante helper interno específico o equivalente; no eliminar el archivo ni sus otros exports |
| `functions/src/triggers/onGroupPendingAlertsSync.js` | sincroniza solicitudes de ingreso, postulaciones admin y alertas de Torneos | trigger compartido | **Desacoplar**: eliminar sólo `getJoinRequestsCount`, `joinRequestsAlertId` y `syncJoinRequestsAlerts`; conservar archivo, trigger, filtro schema, admin y Torneos |
| `functions/index.js` — `onGroupPendingAlertsSync` | export del trigger compartido | export compartido vigente | **Conservar** |
| `functions/index.js` — `api` | export del HTTP API completo | export compartido vigente | **Conservar** |
| `functions/src/scripts/backfillPendingAlerts.js` | backfill de ingreso, admin y Torneos | script operativo compartido | **Desacoplar**: eliminar sólo rama/cómputo de ingreso; conservar script, dry-run/write, admin y Torneos |
| `functions/package.json` — `backfill:pending-alerts*` | comandos del script compartido | configuración operativa vigente | **Conservar** |
| `src/app/api/groups/[groupId]/requests/[userId]/approve/route.ts` | proxy BFF exclusivo de aprobación legacy | exclusiva | **Eliminar archivo** |
| `src/app/api/groups/[groupId]/requests/[userId]/reject/route.ts` | proxy BFF exclusivo de rechazo legacy | exclusiva | **Eliminar archivo** |
| `src/app/api/groups/[groupId]/join/route.ts` | proxy BFF compartido por ingreso y salida | compartida con salida vigente | **Conservar**; sólo podrá alcanzar la semántica leave-only upstream |
| `src/lib/http/readJsonSafely` | lectura segura usada por múltiples proxies BFF | utilidad compartida | **Conservar**; eliminar sólo sus imports desde los dos archivos BFF borrados |
| `src/app/(public)/groups/page.tsx` | listado público; `joinGroup` combina ingreso y salida | componente compartido | **Adaptar mínimamente**: retirar CTA/estado de solicitar y alta directa; conservar navegación y salida de miembros, renombrando el helper si corresponde |
| `src/app/(protected)/profile/groups/page.tsx` | invoca `/join` exclusivamente para salir | consumidor legacy vigente | **Conservar**; prueba de regresión obligatoria |
| `src/app/(public)/groups/[groupId]/page.tsx` | detalle, listener directo, decisiones de ingreso, integrantes y admin-requests | componente compartido | **Desacoplar**: retirar tipos, listener y UI de ingreso; conservar integrantes, admins y solicitudes administrativas |
| `src/app/(admin)/admin/groups/[groupId]/page.tsx` | mapper Firestore, UI/acciones de ingreso, integrantes, admin-requests y alertas | componente compartido | **Desacoplar** sólo solicitud de ingreso; preservar las demás responsabilidades y filtrar alertas legacy retiradas |
| `src/app/(protected)/dashboard/page.tsx` | lector/presentador compartido de `pendingAlerts` | consumidor compartido | **Adaptar mínimamente**: no presentar alertas legacy de ingreso pendientes ni resultados accepted/rejected; conservar alerta `removed` y todas las demás |
| `src/types/pendingAlerts.ts` | unión compartida, incluida hidratación de documentos históricos | tipo compartido | **Conservar** los discriminantes necesarios para reconocer y omitir históricos; no borrar datos |
| `PendingAlertsSection`, `AlertsPanel`, `AdminResourcePendingAlerts` | presentación genérica de alertas recibidas | componentes compartidos | **Conservar**; el filtrado se hace en lectores/composición, no dentro de componentes genéricos |
| callables, servicios, componentes y tipos `groupJoinRequests` | flujo canónico E2-06/E2-07 | reemplazo autoritativo | **Conservar** sin cambios contractuales |
| rutas `admin-request`/`admin-requests` y sus handlers/UI | solicitudes administrativas | exclusión expresa | **Conservar** íntegramente |
| `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `next.config.ts` | seguridad, índices y configuración compartida | infraestructura compartida | **Conservar** |
| `minimumReadPolicy.test.js` | fixture y aserciones del listado público, incluido estado `pending` | prueba compartida afectada | **Adaptar** sólo la expectativa `pending -> none` y conservar privacidad/resto de escenarios |
| pruebas E2-06/E2-07 y checks de arquitectura | protección del flujo canónico | regresión autoritativa | **Conservar** y ampliar con ausencia legacy |

No se elimina completo ningún archivo clasificado como compartido. Los nombres internos pueden variar sin cambiar estas disposiciones.

### 3.3 Inventario canónico que debe permanecer intacto

Los ocho exports y archivos callable de `functions/index.js` y `functions/callables/` son:

```text
getKnownGroupJoinPreview
createMyGroupJoinRequest
getMyCurrentGroupJoinRequest
cancelMyGroupJoinRequest
listPendingGroupJoinRequestsForOwnedGroup
approveGroupJoinRequest
rejectGroupJoinRequest
getGroupJoinRequestDecisionResult
```

Se conservan sin cambios contractuales todos los archivos bajo `functions/src/groupJoinRequests/`, la capacidad pública `functions/src/memberships/public/groupJoinRequestMembershipCapability.js`, `src/services/groupJoinRequestsService.ts`, `src/types/GroupJoinRequest.ts` y estos componentes:

```text
src/components/groupJoinRequests/GroupJoinRequestCandidate.tsx
src/components/groupJoinRequests/groupJoinRequestCandidateState.ts
src/components/groupJoinRequests/PendingGroupJoinRequestsSection.tsx
src/components/groupJoinRequests/groupJoinRequestDecisionMachine.mjs
src/components/groupJoinRequests/groupJoinRequestDecisionMachine.d.mts
```

Los puntos de montaje exactos son:

```text
src/app/(protected)/join/groups/[groupId]/page.tsx
  -> GroupJoinRequestCandidate
src/app/(protected)/dashboard/groups/[groupId]/page.tsx
  -> PendingGroupJoinRequestsSection
```

La ruta canónica `/join/groups/[groupId]` y el detalle Owner `/dashboard/groups/[groupId]` son las únicas superficies de UI habilitadas para solicitar y decidir ingreso. Ambas se conservan y deben permanecer alcanzables.

### 3.4 Exclusiones

Quedan fuera de E2-08:

- reactivación, renovación, edición o cambio de estado de Membresía;
- listado owner-scoped de integrantes o roster;
- baja propia o de terceros y administración general de integrantes;
- endpoints separados `members/add`, `members/remove` y sus consumidores;
- solicitudes o asignaciones de administración y `pendingAdminRequestIds`;
- roles, cargos, permisos o administradores delegados;
- edición, configuración, archivo, eliminación o transferencia de Grupo;
- cierre, reapertura, edición o historial de Temporadas;
- notificaciones canónicas, email, Actividad o auditoría de producto;
- mantenimiento general de alertas; sólo se elimina la derivación legacy de solicitudes de ingreso;
- búsqueda o directorio público canónico de Grupos;
- migración, conversión, backfill, adopción o eliminación de datos legacy;
- borrado físico de `pendingRequestIds` o `memberIds` en documentos existentes;
- retiro global de `memberIds`, `adminIds`, `admins` o `pendingAdminRequestIds`;
- cambios en Plan, Suscripción, pagos o habilitación comercial;
- cleanup o TTL de intents E2-06/E2-07;
- reparación de corrupción canónica;
- cambios a contratos, estados o schemas cerrados en E2-01 a E2-07;
- deploy o acceso a Firebase remoto.

## 4. Actores y autorización

E2-08 no crea actores ni permisos nuevos.

| Actor | Capacidad después del retiro | Autoridad |
| --- | --- | --- |
| Persona candidata | crear, consultar y cancelar su Solicitud canónica | token, Cuenta y Persona propias; contratos E2-06/E2-07 |
| Owner vigente | listar, aprobar, rechazar, consultar y recuperar decisiones canónicas | `groups/{groupId}.ownerId` del Grupo canónico |
| Integrante no Owner | ninguna administración de Solicitudes | no autoriza |
| Administrador global legacy | ninguna administración de Solicitudes canónicas por su rol | `users.roles` no autoriza |
| Backend canónico | único escritor de Solicitud y coordinador con Membresía | callables y capacidades públicas cerradas |
| Frontend | consumidor de callables | nunca escritor Firestore |

Las superficies retiradas no se reemplazan por checks de roles globales ni por una capa de compatibilidad. Conocer una URL legacy, un UID o un `groupId` no concede autoridad.

## 5. Fuentes de verdad y Agregados involucrados

### 5.1 Fuentes de verdad posteriores

- `groupJoinRequests/{requestId}` sigue siendo la única fuente de la intención y decisión de ingreso.
- `memberships/{membershipId}` sigue siendo la única fuente de pertenencia Persona–Grupo.
- `groups/{groupId}` conserva sólo la autoridad de Grupo, incluido su Owner; sus arrays legacy no se leen como Solicitud ni Membresía canónica.
- `seasons/{seasonId}` conserva el contexto temporal independiente.

### 5.2 Agregados

E2-08 no crea ni muta un Agregado nuevo. Solicitud, Membresía, Grupo y Temporada sólo participan como límites que deben preservarse en las regresiones.

El retiro de código legacy no convierte a Grupo en una proyección canónica ni autoriza leer sus arrays como fallback. Los handlers retirados no se redirigen internamente a callables porque sus identidades, payloads y semántica no son equivalentes: usan UID donde el modelo canónico exige Persona y Solicitud opaca.

## 6. Estados e invariantes

### 6.1 Estados canónicos preservados

Solicitud mantiene exactamente:

```text
pendiente -> cancelada
pendiente -> rechazada
pendiente --coordinación--> aprobada
```

`cancelada`, `rechazada` y `aprobada` continúan terminales. `APPROVAL_IN_PROGRESS` continúa siendo estado técnico de consulta, no estado funcional persistido.

Membresía mantiene `activa` v1 y `finalizada` v2 conforme E2-03/E2-05. E2-08 no agrega estado alguno.

### 6.2 Invariantes del retiro

1. Cero endpoint retirado y cero rama de ingreso del endpoint compartido modifican `groups.pendingRequestIds`, `groups.memberIds` u otro array.
2. Cero decisión de solicitud por UID modifica `groups.memberIds` o `groups.pendingRequestIds`.
3. Cero UI presenta `pendingRequestIds` como Solicitudes vigentes.
4. Cero listener frontend observa `pendingRequestIds`.
5. Cero alerta nueva se crea o recalcula a partir de `pendingRequestIds`; las históricas no se borran y dejan de presentarse como acción vigente.
6. Los arrays preexistentes no se convierten en documentos canónicos.
7. Los documentos canónicos no se proyectan de vuelta a arrays legacy.
8. No hay fallback cuando una Solicitud canónica está ausente.
9. Ownership no equivale a Membresía y Membresía no concede administración de Solicitudes.
10. El retiro no altera una Solicitud, Membresía, Temporada o Grupo canónico ya confirmado.
11. `handleGroupMemberAdd` y los writers de solicitudes administrativas siguen fuera del corte aunque escriban arrays; su presencia no constituye fallback del flujo retirado.
12. La salida legacy conservada sólo admite una identidad ya integrante y no limpia ni consulta una Solicitud para decidir el outcome.

## 7. Contratos, payloads, DTO y errores

### 7.1 Contratos canónicos sin cambios

Permanecen exactamente los callables cerrados:

```text
getKnownGroupJoinPreview({ groupId })
createMyGroupJoinRequest({ groupId, idempotencyKey })
getMyCurrentGroupJoinRequest({ groupId })
cancelMyGroupJoinRequest({ groupId, requestId })
listPendingGroupJoinRequestsForOwnedGroup({ groupId, pageSize?, cursor? })
approveGroupJoinRequest({ groupId, requestId, idempotencyKey })
rejectGroupJoinRequest({ groupId, requestId, idempotencyKey })
getGroupJoinRequestDecisionResult({ groupId, requestId })
```

E2-08 no agrega campos, outcomes, reasons, aliases, versiones, payloads ni DTO.

### 7.2 Contratos retirados y endpoint compartido

Dejan de existir como rutas soportadas, tanto en BFF como en el dispatch upstream:

```text
POST /api/groups/{groupId}/requests/{userId}/approve
POST /api/groups/{groupId}/requests/{userId}/reject
```

No se mantiene `410`, adaptador, redirect, proxy, mensaje de compatibilidad ni traducción UID→Persona.

Comportamiento observable obligatorio:

| Invocación | Resultado esperado | Efectos |
| --- | --- | --- |
| BFF eliminado de aprobación o rechazo | `404` propio de Next por ausencia física de cada ruta | no ejecuta fetch upstream |
| upstream directo de aprobación o rechazo, con origen permitido | `404` y body exacto `{ "error": "Not found" }` desde el fallback común de `httpApi` | cero escrituras y cero alertas |
| cualquiera de las rutas anteriores con origen rechazado | conserva el `403` CORS común previo al dispatch | cero escrituras; no implica existencia de ruta |
| `OPTIONS` con origen permitido | conserva el `204` CORS común previo al dispatch | cero escrituras; no implica existencia de ruta |
| `POST /api/groups/{groupId}/join` por integrante legacy válida | conserva proxy BFF y salida legacy; respuesta exitosa compatible con el consumidor existente | sólo las escrituras históricas propias de salida, nunca crear/cancelar solicitud ni incorporar |
| `POST /api/groups/{groupId}/join` por no integrante, pendiente legacy o visitante | `404` genérico sanitizado desde upstream, propagado por el BFF | cero escrituras, sin fallback ni redirect |

La forma exitosa de salida conservará los campos consumidos actualmente (`ok` y `membershipStatus: "none"`) y no ampliará el contrato. Los campos legacy adicionales sólo podrán conservarse si una prueba identifica un consumidor vigente; no autorizan mutar `pendingRequestIds`.

### 7.3 Payloads y DTO legacy

Los payloads legacy de detalle/listado dejan de exponer, donde correspondía al flujo retirado:

```text
pendingRequests
pendingRequestIds
membershipStatus: "pending"
```

No se redefine un DTO canónico en esas páginas. Los campos de administración distintos, entre ellos `pendingAdminRequests` y `pendingAdminRequestIds`, permanecen por estar fuera del corte.

### 7.4 Errores

- No se crea un catálogo de errores E2-08.
- Los errores canónicos E2-06/E2-07 permanecen intactos.
- Las rutas retiradas no devuelven éxito, estado de negocio ni error que revele datos.
- Las respuestas inciertas de operaciones canónicas continúan resolviéndose por consulta o retry autoritativo, nunca invocando una ruta legacy.

## 8. Persistencia y schemas

### 8.1 Cero escrituras E2-08

E2-08 no introduce comandos persistentes. Las superficies retiradas y las ramas de ingreso deshabilitadas deben producir cero escrituras en Firestore. La salida legacy conservada y los writers excluidos mantienen únicamente sus efectos previos; no se contabilizan falsamente como efectos nuevos de E2-08.

No se modifican:

- schemas v1/v2 de `groupJoinRequests`;
- `pendingGroupJoinRequestGuards`;
- `groupJoinRequestIntents`;
- `groupJoinRequestDecisionIntents`;
- `groupJoinRequestApprovalCoordinations`;
- schemas de `memberships`, `activeMembershipGuards` o `membershipLifecycleGuards`;
- schemas de Grupo o Temporada.

### 8.2 Datos legacy

Los campos legacy existentes se tratan como datos fuera del modelo canónico:

```text
groups.pendingRequestIds
groups.memberIds
```

E2-08 deja de producir y consumir el primero dentro del flujo de ingreso. No ejecuta update, delete, array transform, backfill ni conversión masiva sobre documentos existentes. `memberIds` sólo queda fuera de autoridad para este flujo; su retiro global pertenece a otros cortes.

El writer separado `handleGroupMemberAdd` se preserva y hoy elimina de `pendingRequestIds` el UID que agrega administrativamente. E2-08 no modifica esa escritura colateral porque el endpoint pertenece a administración general de integrantes y no es reemplazo de CU-032. La evidencia de “cero escrituras sobre arrays” se mide antes/después al invocar exclusivamente rutas retiradas o ramas de ingreso deshabilitadas; no se formula como inexistencia global de otros writers conocidos.

No se adopta `userId` como `personId`, no se sintetizan Solicitudes y no se crean Membresías retrospectivas.

## 9. Idempotencia, concurrencia y recuperación

### 9.1 Idempotencia

El retiro es un cambio de superficie de código y no necesita intent persistente. La idempotencia funcional continúa perteneciendo a E2-06/E2-07.

Las pruebas estáticas y conductuales deben demostrar que reintentar una URL retirada o la rama no integrante de `/join` nunca escribe. La misma URL y URLs concurrentes deben producir sólo el resultado no encontrado definido y cardinalidad sin cambios en las colecciones y campos observados.

### 9.2 Concurrencia de corte

No se diseña coexistencia ni doble escritura. Dado el estado de transición sin usuarios activos establecido por Documento 5, la futura implementación es un corte de código único:

- antes del corte, el camino legacy existe pero no es canónico;
- después del corte, ese camino no existe;
- los callables canónicos permanecen disponibles durante todo el cambio;
- no se copian operaciones en vuelo entre modelos.

Si antes de una futura implementación aparecieran usuarios activos o datos remotos que requirieran continuidad, se detiene el incremento: haría falta una decisión de producto y un plan de transición distinto.

### 9.3 Respuestas inciertas

- Una respuesta incierta de creación o decisión canónica se recupera con la misma clave o con el callable de consulta ya cerrado.
- Una respuesta incierta histórica del endpoint legacy no se interpreta como éxito y no se reconcilia contra arrays.
- El frontend retirado no conserva retries hacia endpoints eliminados.
- No se consulta simultáneamente estado canónico y legacy para “elegir” un resultado.

## 10. Reglas e índices

### 10.1 Reglas

No se espera modificar `firestore.rules`. Las colecciones canónicas y técnicas continúan deny-all para cliente y el frontend continúa sin Firestore directo.

La ausencia del listener directo sobre `groups.pendingRequestIds` reduce superficie cliente; no justifica abrir ninguna lectura nueva.

### 10.2 Índices

No se agrega, elimina ni modifica ningún índice. E2-08 no incorpora consultas Firestore. Los índices de E2-01 a E2-07 permanecen intactos.

Una necesidad de índice nuevo constituye evidencia de ampliación o de lectura no prevista y obliga a detener la implementación para revisar la ficha.

### 10.3 Firebase, exports, CORS y operación

- `functions/index.js` conserva `exports.api`, los ocho callables canónicos y `exports.onGroupPendingAlertsSync`.
- El trigger compartido se mantiene desplegable con el mismo nombre; sólo pierde la rama de alertas de ingreso.
- `firebase.json`, runtime, puertos Emulator y referencias a reglas/índices no cambian.
- La allowlist, preflight y headers CORS comunes de `httpApi.js` no cambian.
- `functions/package.json` conserva los comandos dry-run/write de `backfillPendingAlerts`; cambia el comportamiento interno del script compartido, no su entrada operativa.
- `next.config.ts` no requiere rewrite, header ni configuración nueva.
- No se modifica documentación histórica. El futuro informe de implementación deberá registrar rutas retiradas, responsabilidades preservadas, búsquedas estáticas y resultados; no deberá reescribir cierres previos.

## 11. Frontend

### 11.1 Superficies canónicas preservadas

- `/join/groups/[groupId]` continúa como única superficie candidata de Solicitud.
- La sección Owner canónica continúa listando y resolviendo Solicitudes.
- Los servicios `groupJoinRequestsService` siguen usando callables.
- La máquina de decisión conserva single-flight, clave estable, consulta autoritativa, foco y anuncios.

### 11.2 Superficies legacy retiradas o adaptadas

- El listado público legacy deja de ejecutar `/api/groups/{groupId}/join` para no integrantes y de prometer “Solicitud enviada” o alta inmediata; conserva el control de salida cuando `membershipStatus == "member"`.
- El perfil legacy conserva su uso del mismo endpoint exclusivamente para salida; es regresión obligatoria y no se reinterpreta como ingreso.
- El detalle público legacy deja de mostrar o decidir `pendingRequests` y deja de observar Firestore para `pendingRequestIds`.
- El detalle administrativo legacy deja de mostrar o decidir solicitudes de ingreso derivadas de arrays.
- Las dos rutas BFF de decisión se eliminan; la ruta BFF compartida de join se conserva para salida.

La adaptación no enlaza automáticamente un Grupo legacy con `/join/groups/[groupId]`: los documentos legacy no se reinterpretan como Grupos canónicos. Sólo puede mostrarse el acceso canónico en un contexto que ya posea un `groupId` canónico compatible.

### 11.3 UX mínima

- ninguna acción retirada queda visible, enfocables o anunciable;
- no quedan botones muertos ni mensajes de éxito legacy;
- los estados vacíos distinguen ausencia de capacidad de ausencia de datos cuando resulte necesario;
- el resto de la navegación conserva teclado, foco, objetivos táctiles y responsive;
- no se introduce acceso directo a Firestore.

## 12. Privacidad y observabilidad

### 12.1 Privacidad

El retiro reduce exposición:

- los detalles legacy dejan de resolver UIDs pendientes contra documentos `users`;
- los payloads dejan de exponer arrays o perfiles de solicitantes legacy;
- una URL retirada no diferencia Grupo inexistente, no visible o incompatible;
- no se registra UID, Persona, Grupo, Solicitud, Membresía, email, payload o snapshot.

### 12.2 Observabilidad

E2-08 no agrega eventos de negocio. Puede conservarse evidencia técnica agregada de no encontrado en la infraestructura HTTP ya existente, sin IDs ni payloads.

Se retira exclusivamente la observabilidad derivada del flujo eliminado:

- contador de solicitudes basado en `pendingRequestIds`;
- alerta legacy de solicitudes pendientes;
- alerta legacy de aceptación o rechazo emitida por el handler retirado.

Los documentos históricos de kinds `group_join_requests_pending` y `group_membership_result` con `meta.decision` `accepted`/`rejected` no se eliminan ni actualizan. Los lectores del dashboard y del detalle administrativo deben omitirlos para que no quede un enlace o acción hacia el flujo retirado. `group_membership_result` con `meta.decision: "removed"` continúa visible porque pertenece al writer vigente de remoción. Los componentes genéricos de alertas y el tipo compartido se conservan.

No se crea una notificación canónica sustituta. Una capacidad de notificaciones requiere ficha propia y deberá consumir resultados confirmados, nunca claims ni arrays.

## 13. Legado y criterio de retiro

### 13.1 Elementos retirados en este corte

- ramas de solicitar, cancelar solicitud y alta directa del handler compartido `/join`;
- escritores de aprobación/rechazo por UID;
- proxies BFF exclusivos de aprobación y rechazo;
- controles frontend que los invocan;
- lectura/presentación de solicitudes de ingreso desde arrays en esas superficies;
- listener directo específico;
- derivación de alertas desde `pendingRequestIds`.

### 13.2 Elementos legacy preservados

- datos físicos existentes;
- ruta/dispatch/BFF `/join` y su rama de salida para integrantes legacy;
- administración de integrantes por endpoints separados;
- solicitudes administrativas y `pendingAdminRequestIds`;
- arrays `memberIds`, `adminIds` y `admins` mientras tengan otros consumidores no retirados;
- páginas legacy en sus funciones no vinculadas con solicitudes de ingreso;
- alertas y notificaciones ajenas al flujo retirado.

También se preservan explícitamente `handleGroupMemberAdd` y su limpieza colateral de `pendingRequestIds`, `handleGroupMemberRemoval`, búsqueda de integrantes, administración de admins, el trigger/export compartido, los comandos `backfill:pending-alerts*`, el servicio genérico de alertas, CORS y el export HTTP `api`. Ninguno autoriza solicitud o decisión por UID después del corte.

### 13.3 Evidencia de retiro

La implementación no podrá declararse terminada si una búsqueda estática encuentra uso productivo de `pendingRequestIds` fuera del writer explícitamente preservado `handleGroupMemberAdd`, reconocimiento/filtrado de históricos y fixtures o pruebas negativas. La expectativa es cero productores, decisores y presentadores de solicitudes de ingreso por ese campo, no cero ocurrencias globales del literal.

No se declara resuelto todo TECH-GAP-04 ni completado el E2-11 preliminar.

## 14. Pruebas previstas

No se ejecutan pruebas durante esta definición. Una implementación futura deberá incorporar y ejecutar:

### 14.1 Arquitectura y búsqueda estática

- ausencia de `handleJoinRequestAction` y de los dos dispatch de decisión; conservación explícita del dispatch `/join` leave-only;
- ausencia de las dos rutas BFF exclusivas de decisión y conservación de la BFF `/join`;
- ausencia de imports o fetch frontend hacia ellas;
- cero acceso frontend productivo que presente o decida `pendingRequestIds`; sólo se tolera reconocimiento para omitir históricos si resulta necesario;
- cero escritor de `pendingRequestIds` desde endpoints retirados o desde `/join`; `handleGroupMemberAdd` queda allowlisted y sin cambios;
- cero mutación de `memberIds` originada en solicitud/decisión;
- cero derivación de alertas desde `pendingRequestIds`;
- callables canónicos exportados y sin cambios de nombre.
- exports compartidos `api` y `onGroupPendingAlertsSync` presentes;
- CORS, `firebase.json`, `next.config.ts`, reglas e índices sin cambios;
- comandos `backfill:pending-alerts` y `backfill:pending-alerts:write` presentes;
- cero imports, rutas, handlers, helpers o tipos huérfanos después del desacople.

### 14.2 Unitarias

- payloads de detalle/listado legacy ya no incluyen solicitudes por arrays;
- `membershipStatus` público no vuelve a producir `pending` y conserva `member`/`none`;
- UI legacy no construye ni presenta candidatas pendientes;
- ramas de solicitudes se eliminan sin afectar solicitudes administrativas;
- `/join` conserva salida para integrantes y devuelve no encontrado a no integrantes sin escribir;
- el servicio compartido de alertas conserva remoción y pierde sólo accepted/rejected;
- el trigger y backfill compartidos conservan admin/Torneos y pierden sólo ingreso;
- lectores de alertas ocultan históricos de ingreso, pero conservan `removed` y demás kinds;
- sanitización de no encontrado no revela existencia;
- contratos, DTO, reasons y mappers E2-06/E2-07 permanecen iguales.

### 14.3 Emulator

- invocar cada endpoint upstream retirado devuelve `404 { "error": "Not found" }` con origen permitido y no escribe Grupo, Solicitud, Membresía, guard, intent, claim, alerta ni Actividad;
- invocar las rutas BFF eliminadas devuelve el `404` del framework y no alcanza upstream;
- invocar `/join` como visitante, no integrante o pendiente legacy devuelve `404` genérico y no escribe ningún array;
- invocar `/join` como integrante legacy conserva la salida y sus efectos históricos, sin tocar `pendingRequestIds`;
- concurrencia sobre rutas retiradas mantiene cardinalidad cero;
- el flujo canónico crear → listar → aprobar continúa confirmando una Solicitud y una Membresía;
- rechazo canónico continúa sin crear Membresía;
- respuesta perdida canónica continúa recuperable;
- global admin no Owner continúa sin autoridad;
- Firestore cliente continúa denegado;
- fixtures con arrays legacy no aparecen como Solicitudes canónicas ni se modifican.
- `members/add`, `members/remove`, `admin-request` y `admin-requests` conservan sus contratos y efectos actuales;
- cambio en `pendingRequestIds` no genera alerta nueva y los documentos históricos existentes permanecen intactos.

### 14.4 Frontend y regresión

- no existen controles, imports ni rutas huérfanas de ingreso/decisión en listado o detalles legacy;
- el perfil y el listado público conservan salida de integrantes;
- solicitudes administrativas continúan visibles y operables donde ya lo eran;
- dashboard y detalle admin no enlazan alertas históricas del flujo retirado;
- la ruta candidata canónica y la sección Owner mantienen estados, accesibilidad y responsive;
- no hay llamadas a Firestore desde componentes canónicos;
- E2-01 a E2-05 conservan ownership, Temporada, creación/consulta/finalización de Membresía y sus guards;
- E2-06/E2-07 conservan cardinalidad, schemas y recuperación exactos.

Los gates completos, lint, build, typecheck y Emulator corresponden a la futura implementación y no a esta definición.

## 15. UAT mínima futura

La UAT se realizará sólo tras implementar, en navegador real, Emulator Suite, loopback, proyecto `demo-*` y datos sintéticos. No utilizará Firebase remoto.

1. Una candidata con enlace canónico conocido crea una Solicitud en `/join/groups/[groupId]`.
2. El Owner la lista y aprueba desde la superficie canónica; aparece una única Membresía.
3. Otra candidata es rechazada y no aparece Membresía.
4. Recargar ambas superficies recupera resultados confirmados.
5. Las páginas legacy ya no ofrecen enviar, cancelar, aprobar ni rechazar solicitudes de ingreso; una integrante legacy todavía puede salir desde sus consumidores existentes.
6. Las dos URLs BFF de decisión retiradas devuelven `404`, no ejecutan upstream ni revelan datos; sus dos rutas upstream directas devuelven `404 { "error": "Not found" }` con origen permitido.
7. Una fixture con `pendingRequestIds` no aparece en la UI como Solicitud y permanece físicamente intacta.
8. Solicitudes administrativas legacy siguen visibles y sus acciones conservan el comportamiento previo.
9. No aparecen alertas nuevas basadas en `pendingRequestIds`; una alerta histórica de ingreso no se muestra ni enlaza y no se borra.
10. Consola y red muestran sólo callables canónicos durante CU-031/CU-032/CU-033 y ningún Firestore cliente.
11. Teclado, foco, anuncios y responsive de las superficies canónicas permanecen utilizables.
12. Una invocación no integrante a `/join` recibe `404` genérico sin escritura; una integrante legacy conserva la salida.

## 16. Criterios Dado/Cuando/Entonces

1. **Dado** el cierre de E2-07, **cuando** se solicita y decide un ingreso, **entonces** sólo intervienen Solicitud y Membresía canónicas mediante backend.
2. **Dada** una llamada de una no integrante a `/api/groups/{groupId}/join`, **cuando** alcanza la aplicación después del retiro, **entonces** recibe no encontrado genérico y no hay escritura; una integrante legacy conserva la salida.
3. **Dada** una llamada a aprobar o rechazar por `userId`, **cuando** alcanza una ruta retirada, **entonces** no se traduce a Persona/Solicitud ni modifica arrays.
4. **Dadas** llamadas concurrentes a cualquier ruta retirada, **cuando** finalizan, **entonces** la cardinalidad de todos los documentos observados permanece igual.
5. **Dado** un Grupo legacy con `pendingRequestIds`, **cuando** se carga una pantalla adaptada, **entonces** no muestra esos UIDs como Solicitudes.
6. **Dado** ese documento legacy, **cuando** concluye el recorrido, **entonces** sus campos no fueron migrados, limpiados ni adoptados.
7. **Dada** una Solicitud canónica pendiente, **cuando** el Owner usa la sección canónica, **entonces** puede aprobarla o rechazarla con los contratos E2-07 intactos.
8. **Dada** una respuesta incierta canónica, **cuando** se reintenta o consulta, **entonces** converge autoritativamente sin leer arrays.
9. **Dado** un global admin no Owner, **cuando** intenta administrar una Solicitud, **entonces** no obtiene autoridad por su rol.
10. **Dado** cualquier frontend del corte, **cuando** se inspecciona red y código, **entonces** no escribe ni escucha Firestore para solicitudes.
11. **Dado** el trigger o backfill de alertas, **cuando** cambia sólo `pendingRequestIds`, **entonces** no crea ni actualiza una alerta de solicitud.
12. **Dadas** solicitudes administrativas, **cuando** se implementa E2-08, **entonces** `pendingAdminRequestIds` y sus capacidades quedan fuera del diff funcional.
13. **Dado** un retry antiguo de E2-06/E2-07, **cuando** se ejecuta después del retiro, **entonces** conserva su outcome y documento original.
14. **Dada** una Membresía finalizada, **cuando** una aprobación requiere reactivación, **entonces** continúa devolviendo `MEMBERSHIP_REACTIVATION_REQUIRED`; E2-08 no la reactiva.
15. **Dado** el inventario de índices y reglas, **cuando** termina E2-08, **entonces** ambos permanecen sin ampliaciones.
16. **Dado** el repositorio productivo, **cuando** se busca `pendingRequestIds`, **entonces** sólo puede aparecer en `handleGroupMemberAdd` preservado, reconocimiento para omitir históricos y pruebas/fixtures negativos; nunca como productor, decisión o presentación de Solicitud.

## 17. Riesgos y mitigaciones

| Riesgo | Consecuencia | Tratamiento vinculante |
| --- | --- | --- |
| Confundir retiro con migración | adopción de datos inválidos | cero conversión, backfill o limpieza |
| Eliminar `/join` completo | rompe la salida legacy todavía vigente | conservar BFF/dispatch y aislar un handler leave-only |
| Conservar ramas no integrante de `/join` | mantiene ingreso contradictorio por arrays | responder `404` genérico sin escrituras |
| Romper solicitudes administrativas | ampliación accidental | preservar `pendingAdminRequestIds` y rutas admin-request |
| Dejar UI o listeners huérfanos | errores y exposición stale | búsqueda estática y pruebas de componente |
| Emitir alertas desde arrays stale | falsa actividad | retirar sólo derivación de solicitud legacy |
| Hacer redirect por UID | correlación insegura | no adaptar ni traducir contratos |
| Usuarios activos antes de implementar | corte incompatible | detener y redefinir transición |
| Declarar retiro global | ocultar otros escritores legacy | inventario y veredicto limitados al flujo |
| Regresión canónica | pérdida de CU-031/032/033 | regresión focal E2-06/E2-07 |
| Aumentar reglas o índices | superficie innecesaria | expectativa de diff cero en ambos |

Riesgo residual aceptado: otros consumidores y escritores legacy de pertenencia/administración continuarán hasta sus propios cortes. E2-08 no los vuelve válidos ni declara cerrada la brecha completa.

## 18. Inventario previsto

### 18.1 Backend a modificar

- `volley-ranking-system/functions/src/httpApi.js`;
- `volley-ranking-system/functions/src/services/pendingAlertsService.js`;
- `volley-ranking-system/functions/src/triggers/onGroupPendingAlertsSync.js`;
- `volley-ranking-system/functions/src/scripts/backfillPendingAlerts.js`;
- `volley-ranking-system/functions/test/emulator/minimumReadPolicy.test.js`;
- pruebas nuevas unitarias/Emulator del HTTP API, alertas, arquitectura y ausencia de efectos.

### 18.2 Frontend a modificar

- `volley-ranking-frontend/src/app/(public)/groups/page.tsx`;
- `volley-ranking-frontend/src/app/(public)/groups/[groupId]/page.tsx`;
- `volley-ranking-frontend/src/app/(protected)/profile/groups/page.tsx`;
- `volley-ranking-frontend/src/app/(admin)/admin/groups/[groupId]/page.tsx`;
- `volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx`;
- pruebas de esas superficies y checks de arquitectura.

### 18.3 Frontend a eliminar

- `volley-ranking-frontend/src/app/api/groups/[groupId]/requests/[userId]/approve/route.ts`;
- `volley-ranking-frontend/src/app/api/groups/[groupId]/requests/[userId]/reject/route.ts`.

### 18.4 Archivos compartidos a conservar explícitamente

- `volley-ranking-frontend/src/app/api/groups/[groupId]/join/route.ts`;
- `volley-ranking-frontend/src/types/pendingAlerts.ts`;
- `volley-ranking-frontend/src/components/dashboard/PendingAlertsSection.tsx`;
- `volley-ranking-frontend/src/components/dashboard/AlertsPanel.tsx`;
- `volley-ranking-frontend/src/components/admin/AdminResourcePendingAlerts.tsx`;
- rutas BFF de `members`, `admins`, `admin-request` y `admin-requests`;
- `volley-ranking-system/functions/index.js`, incluidos exports `api` y `onGroupPendingAlertsSync`;
- `volley-ranking-system/functions/package.json`, incluidos los dos comandos de backfill;
- `volley-ranking-system/firebase.json` y configuración CORS interna de `httpApi.js`.

### 18.5 Sin cambio esperado

- módulos canónicos `groupJoinRequests` y `memberships`;
- tipos y servicios canónicos salvo ajuste mecánico de un consumidor compartido demostrado por el compilador;
- `firestore.rules`;
- `firestore.indexes.json`;
- dependencias, package files y lockfiles;
- documentos E2-01 a E2-07.

El inventario es una previsión basada en evidencia actual. Un archivo adicional sólo puede incorporarse si es consumidor directo del mismo flujo y no amplía capacidades. La necesidad de mutar dominio o persistencia canónicos obliga a detener la implementación.

## 19. Checkpoint, rollback y control de implementación

- **Base documental:** `dev` en `02a79812a7b3cc9abd66459a3b1cd0989f384099`.
- **Rama futura sugerida:** `feat/e2-08-retire-legacy-join-requests`, sólo después de aprobación.
- **Rollback de código antes del cutover o en entorno local:** revert explícito del incremento completo para recuperar el checkpoint y repetir la revisión.
- **Rollback posterior a un cutover autorizado:** no restaura writers legacy. Se detiene el acceso afectado y se aplica forward-fix sobre el flujo canónico o el desacople; reintroducir ingreso por arrays exigiría una nueva decisión excepcional.
- **Rollback de datos:** no aplica porque E2-08 no escribe ni migra datos.
- **Prohibido como rollback operativo:** reactivar doble escritura, fallback o adaptación legacy.
- **Fixtures futuras:** sólo locales, IDs registrados y cleanup literal de datos sintéticos propios.

Interrumpir la futura implementación si aparece cualquiera de estas condiciones:

- usuarios activos o continuidad productiva que exijan coexistencia;
- necesidad de convertir UID en Persona;
- necesidad de migrar o borrar arrays;
- necesidad de cambiar un contrato o schema canónico;
- dependencia funcional de reactivación, renovación, roles o notificaciones;
- modificación de reglas o índice no explicable por regresión;
- eliminación inseparable de una capacidad legacy fuera del endpoint combinado ya identificado.

## 20. Definición de terminado

E2-08 podrá declararse implementado y luego cerrado únicamente cuando:

- las dos rutas de decisión estén ausentes tanto en BFF como en dispatch upstream, sean inaccesibles y no escriban;
- no exista UI productiva que invoque decisiones legacy ni la rama de ingreso de `/join`;
- `/join` permanezca operativo sólo para salida de integrantes legacy y rechace a no integrantes con `404` sin escribir;
- `pendingRequestIds` no tenga productores, decisores o presentadores productivos para el flujo; `handleGroupMemberAdd` permanezca allowlisted y sin cambios;
- ninguna decisión de solicitud pueda escribir `memberIds`;
- ninguna alerta o backfill derive solicitudes desde arrays y ningún lector presente alertas históricas de ingreso;
- datos legacy permanezcan intactos y no adoptados;
- callables, payloads, DTO, errores, schemas, guards e invariantes E2-06/E2-07 permanezcan iguales;
- frontend canónico continúe backend-only y sin Firestore;
- ownership vigente continúe como única autorización administrativa;
- reglas e índices permanezcan sin cambio, salvo contradicción revisada documentalmente;
- exports `api`/`onGroupPendingAlertsSync`, CORS, configuración Firebase, rutas administrativas y comandos de backfill compartidos permanezcan vigentes;
- pruebas estáticas, unitarias, Emulator, frontend, regresión y UAT futuras estén aprobadas;
- inventario final distinga lo retirado de otros consumidores legacy aún pendientes;
- informe y cierre registren cardinalidad cero de efectos laterales y no declaren cerrado E2-11 ni Etapa 2;
- no haya deploy ni acceso Firebase remoto sin una autorización separada.

## 21. Decisiones fundamentales pendientes

No existe una decisión funcional fundamental pendiente dentro de este corte.

Permanecen pendientes, pero fuera de E2-08 y sin bloquear su revisión:

- actor, contrato y transición de CU-028 — reactivar Membresía;
- coordinación e historial de CU-029 — renovar Membresía;
- retiro de endpoints separados de integrantes y de arrays restantes;
- tratamiento futuro de solicitudes administrativas;
- cierre e historial de Temporadas;
- notificaciones canónicas basadas en resultados confirmados.

## Veredicto documental

**E2-08 APROBADO — LISTO PARA VERSIONAR**
