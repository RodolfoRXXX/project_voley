# IUX — Evaluación arquitectónica de proyección de lectura para el dashboard

## Estado y alcance

- **Estado:** `ARQUITECTURA ADOPTADA POR D5-061 — IMPLEMENTACIÓN NO AUTORIZADA`.
- **Fecha:** 2026-10-25.
- **Checkpoint:** rama `dev`, HEAD `c02f0afea067dcf4a757c68a9ef5bcd590682c24`.
- **Cobertura funcional aprobada:** `IUX-N20` + `IUX-N31`.
- **Implementación:** no autorizada.

Este documento fundamenta la solución adoptada y conserva la comparación con el barrido directo
como historia. No modifica las fuentes de verdad, permisos ni decisiones D5-058–D5-060. N30, Torneos legacy,
prioridades, campana, notificaciones y agenda no integran este corte.

## 1. Recomendación ejecutiva

D5-061 adopta una **proyección derivada por usuario** con:

1. **outbox mínimo y revisión de proyección por Grupo escritos atómicamente por cada writer
   canónico**;
2. **proyector idempotente** que relee fuentes y autorizaciones vigentes antes de escribir;
3. **tareas y contadores materializados por usuario y Grupo**, versionados por generación;
4. **consulta backend-only** que revalida todos los contextos que participan del listado y del total;
5. **reconciliación y reconstrucción por generación** como reparación, no como efecto de consultar.

No se recomienda escribir directamente las cards desde cada comando: es viable para algún caso
simple de N20, pero no para el fan-out y los cambios de audiencia de N31, y crearía dos garantías
distintas. Tampoco se recomiendan triggers Firestore como mecanismo primario: observan cambios
después del commit y no pueden impedir que el estado figure `READY` si no existe una invalidación
atómica. El bus `EventEmitter` vigente no es durable.

El barrido directo acotado queda descartado como implementación y se conserva como alternativa A
histórica y baseline de costo. La dirección B es la arquitectura adoptada.

## 2. Garantías y límites en lenguaje de producto

La arquitectura debe garantizar, una vez implementada y habilitada:

- una tarea por Solicitud N20 accionable y una por Entrega N31 revisable;
- ausencia de duplicados si una cuenta reúne ownership y capability;
- autorización actual comprobada antes de cada respuesta nueva;
- cards visibles revalidadas contra su recurso original;
- badge separado de la página y de notificaciones no leídas;
- ninguna escritura, resolución o recovery como efecto de abrir/refrescar el dashboard;
- ausencia de cero o total vigente cuando cobertura/salud no pueden demostrarse.

No garantiza sincronización instantánea. `asOf` declara el estado de proyección usado; un cambio
posterior puede no estar incorporado todavía. Una revocación no puede retirar información que la
persona ya vio, pero una nueva respuesta no devuelve el contexto revocado y la interfaz lo limpia al
refrescar. El destino siempre vuelve a autorizar y puede informar que la tarea ya fue resuelta.

## 3. Evidencia de writers y puntos de integración

Todos los puntos siguientes ya escriben dentro de transacciones Firestore. La integración propuesta
agrega en la **misma transacción exitosa**: incremento de
`dashboardTaskScopes/{groupId}.sourceRevision`, estado `DIRTY` y un evento outbox determinista. Si
esas escrituras fallan, también falla el comando; así `READY` no puede sobrevivir a un cambio
canónico sin señal durable.

### 3.1 Fuentes de tarea

| Cambio | Writer real | Integración propuesta | Repetición, desorden y ventana |
| --- | --- | --- | --- |
| Crear N20 | `groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore.js:359-391` | Evento `JOIN_REQUEST_CHANGED` con `requestId` y Grupo | ID derivado de request+fingerprint. Sin ventana entre fuente y dirty/outbox; la proyección converge por relectura |
| Cancelar N20 | mismo store `:396-415` | Mismo evento tras transición terminal | Retry terminal no duplica; un evento anterior relee `cancelada` y no reactiva |
| Rechazar N20 | mismo store `:417-440` | Mismo evento en la transacción de request/intent/guard | Receipt/intent y task ID estable hacen idempotente el efecto |
| Aprobar/recuperar N20 | `:185-349` (`phaseA`, `phaseC`, `releaseClaim`) y `memberships/public/groupJoinRequestMembershipCapability.js:100-148` | Emitir al crear/quitar coordinación y al confirmar terminal; el evento final pertenece a la transacción que actualiza Solicitud | Durante coordinación la tarea sigue vigente con `APPROVAL_IN_PROGRESS`. El proyector relee Solicitud, guard, intent y coordinación; nunca infiere terminalidad de la Membresía sola |
| Informar N31 | `paymentDeliveries/infrastructure/firestorePaymentDeliveryStore.js:127-152` | Evento `PAYMENT_DELIVERY_CHANGED`, `deliveryId`, revisión 1 | ID desde command receipt/revisión. Fuente y dirty/outbox son atómicos |
| Confirmar/rechazar N31 | mismo store `:155-175` | Mismo evento con revisión nueva | Entrega posee `revision`; versión vieja es no-op después de releer la actual |
| Resolver N31 por recepción administrativa | `administrativeReceipts/infrastructure/firestoreAdministrativeReceiptStore.js:33-35` | Un evento de comando con los `resolvedNoticeIds` o uno determinista por Entrega, dentro de la transacción | Cubre el writer alternativo que cambia a `RESOLVED_BY_ADMINISTRATIVE_RECEIPT`; límite vigente de 20 IDs |

La reversión de una Entrega ya `CONFIRMED` no reabre `decisionState=REPORTED`; no crea N31. Cambios de
saldo que impiden confirmar tampoco resuelven N31 porque aún puede rechazarse.

### 3.2 Cambios de audiencia/autorización

| Cambio | Writer real y regla efectiva | Integración y resultado |
| --- | --- | --- |
| Conceder/revocar `GROUP_PAYMENT_NOTICE_REVIEW` | `firestorePaymentDeliveryStore.js:289-303`; grant/slot/receipt atómicos | Evento `PAYMENT_REVIEW_AUDIENCE_CHANGED` para recalcular todas las N31 `REPORTED` del Grupo para la cuenta. Revocación deja de autorizar inmediatamente en backend, aunque la limpieza física llegue después |
| Finalización administrativa de Membresía | `memberships/infrastructure/firestoreMembershipAdministrativeFinalizationStore.js:180-238` | Evento de lifecycle para el Grupo/Persona; retira review delegado ligado a esa activación |
| Salida propia | `firestoreMembershipSelfExitStore.js:145-258` | Igual invalidación. El Owner no pierde N31 por carecer de Membresía |
| Finalización del Owner de su propia Membresía | `firestoreMembershipLifecycleGuard.js:71-129`, usado por `membershipService.js:144-174` | Igual invalidación para grants basados en esa Membresía; ownership sigue independiente |
| Reactivación/renovación | `groupJoinRequestMembershipCapability.js:100-148` durante aprobación N20 | Evento de lifecycle. Un grant viejo **no revive**: `validityAnchor`/Membresía/Temporada deben coincidir y se requiere una concesión vigente nueva |
| Cierre de Temporada | `groups/infrastructure/firestoreSeasonClosureStore.js:34-108` | Evento de contexto. Reviewer delegado deja de cumplir Temporada abierta; Owner conserva N31 según el módulo actual |
| Archivo de Grupo | `groups/infrastructure/firestoreGroupArchiveStore.js:143-192` | Evento de contexto. N20 ya debe ser cero por precondición; reviewer delegado pierde acceso. Owner conserva revisión N31 prearchivo |
| Cambio de ownership | El callable `functions/callables/transferGroupOwnership.js` está retirado y responde `LEGACY_GROUP_CAPABILITY_RETIRED`; no hay writer canónico habilitado | No implementar transferencia en IUX. Cualquier writer futuro debe incrementar `ownershipRevision`, emitir outbox atómico y reproyectar Owner anterior/nuevo antes de habilitarse |

Rules niegan escritura cliente sobre Solicitudes, Entregas, grants/slots y fuentes canónicas. Scripts
Admin, consola o migraciones pueden saltar los writers: quedan prohibidos como operación ordinaria de
esta arquitectura. Un cambio excepcional exige emitir la misma señal o ejecutar reconciliación y
mantener el scope fuera de `READY`.

### 3.3 Mecanismos descartados como primarios

| Mecanismo | Resolución |
| --- | --- |
| Actualización directa de tareas en cada comando | No elegida: N31 requiere descubrir varios destinatarios y cambios de audiencia; aumenta escrituras/lecturas dentro de transacciones ya complejas |
| Trigger reforzado + reconciliación | No elegido como garantía primaria: detecta después del commit y no evita por sí solo un `READY` falso. Puede usarse sólo como detector transicional, sin ser autoridad |
| Outbox sin dirty/revisión de scope | Insuficiente: un evento pendiente no sería visible de forma barata para la consulta |
| Bus en memoria | Descartado: pérdida posible ante reinicio/fallo y handlers sin retry durable |

## 4. Modelo físico adoptado

Todas las colecciones son server-only.

```text
dashboardTaskScopes/{groupId}
dashboardTaskOutbox/{eventId}
dashboardTaskManifests/{taskId}

users/{accountId}/dashboardTaskProjection/N20_N31_V1
users/{accountId}/dashboardTaskSets/{generationId}
users/{accountId}/dashboardTaskSets/{generationId}/items/{taskDocumentId}
users/{accountId}/dashboardTaskSets/{generationId}/contexts/{groupId}
```

### 4.1 Scope y outbox

`dashboardTaskScopes`: `groupId`, `coverageVersion`, `sourceRevision`, `projectedRevision`,
`status=DIRTY|PROCESSING|READY|DEGRADED|REBUILDING`, `dirtyAt`, `projectedAt`, `lastEventId`,
`lastErrorAt?`, `rebuildGeneration?`, `schemaVersion`.

`dashboardTaskOutbox`: `eventId`, `groupId`, `scopeRevision`, `eventKind`, `resourceType`,
`resourceIds`, `sourceFingerprint`, `status=PENDING|PROCESSING|APPLIED|FAILED`, `availableAt`,
`leaseUntil?`, `attempts`, `createdAt`, `processedAt?`, `lastErrorCode?`, `schemaVersion`.

El payload no contiene nombres, email, líneas ni snapshots funcionales. El proyector siempre relee.

`dashboardTaskManifests` conserva `taskId`, tipo, fuente, Grupo, fingerprint/revisión observada,
destinatarios actuales y estado. Permite retirar destinatarios anteriores sin convertirlo en fuente
de verdad.

### 4.2 Proyección por usuario

Estado del usuario: `coverageVersion`, `activeGeneration`, `status`, `lastProjectedAt`,
`lastReconciledAt`, `schemaVersion`.

Item mínimo:

- `taskId`, `taskType=JOIN_REQUEST_DECISION|PAYMENT_DELIVERY_REVIEW`;
- `sourceType`, `resourceId`, `sourceRevision?`, `sourceFingerprint`;
- `groupId`, `seasonId?`, `actionableAt`;
- `projectionState=ACTIVE|INACTIVE`, `projectedAt`, `scopeRevision`, `schemaVersion`;
- destino tipado, no URL libre.

No se persisten nombre/email de Persona, importes, líneas, grants ni cargo. El backend relee la
fuente y compone presentación sólo para los 10/20 items de la página. El Grupo ya se leyó para
autorizar; la Temporada se compone sólo cuando corresponda.

Contexto por usuario/Grupo: `groupId`, `coverageVersion`, `counts.{N20,N31,total}`,
`scopeRevision`, `generationId`, `updatedAt`, `schemaVersion`. El contador es materializado por
contexto, no un contador global ciego.

### 4.3 Identidades, orden e índices

- N20: `JOIN_REQUEST_DECISION:{requestId}`.
- N31: `PAYMENT_DELIVERY_REVIEW:{deliveryId}`.
- `taskDocumentId`: hash determinista de cobertura+taskId.
- La misma identidad se usa para Owner y reviewer; la ruta por usuario evita colisiones entre cuentas.
- Orden: `projectionState == ACTIVE`, `actionableAt DESC`, `taskType ASC`, `taskId ASC`.
- Cursor firmado/opaco: generación + los tres campos de orden + cuenta.
- Página inicial 10; máximo 20.

Índices adoptados para implementación futura:

1. items: `projectionState ASC, actionableAt DESC, taskType ASC, taskId ASC`;
2. outbox worker: `status ASC, availableAt ASC, createdAt ASC`;
3. outbox/scope: `groupId ASC, status ASC, scopeRevision ASC`;
4. manifests de reparación: `groupId ASC, projectionState ASC, taskType ASC`.

Rules propuestas: `allow read, write: if false` para scopes, outbox, manifests y todas las
subcolecciones de proyección. Sólo callables/backend Admin autorizados devuelven DTO minimizado.

### 4.4 Retención adoptada

- items inactivos/tombstones y generaciones sustituidas: 30 días;
- outbox procesado: 30 días;
- outbox fallido: hasta reparación y luego 30 días;
- manifests activos: mientras la fuente pueda generar tarea; terminales 30 días;
- borrado de cuenta: purga de proyección según la política de Cuenta que se adopte.

Una tarea que continúa vigente y accionable, su item `ACTIVE` y el manifest necesario para mantenerla
**nunca expiran por antigüedad**. Los 30 días alcanzan únicamente registros operativos ya procesados,
items inactivos/tombstones, manifests terminales y generaciones sustituidas. Es la política adoptada
por D5-061 para una implementación futura; no autoriza todavía crear o purgar datos.

## 5. Producción, idempotencia y salud

### 5.1 Protocolo normal

1. El writer relee `dashboardTaskScopes/{groupId}`, incrementa `sourceRevision`, marca `DIRTY` y
   crea el outbox en la misma transacción que la fuente.
2. El worker reclama con lease; repetir el claim no cambia identidad.
3. Relee recurso, guardas/coordinación y autorización actuales; calcula audiencia completa.
4. Compara manifest y escribe altas/retiros. Cada transición de item lee su estado anterior y aplica
   delta al contador sólo en `INACTIVE↔ACTIVE`; en la misma unidad idempotente marca su revisión
   `APPLIED`.
5. Procesar una revisión no autoriza saltar las anteriores. Una transacción de avance parte del
   `projectedRevision=p` actual y sólo avanza hasta la mayor revisión contigua `h` para la cual existen
   completions `APPLIED` de **cada** revisión `p+1..h`. Puede hacerlo en lotes acotados; si existe un
   hueco, se detiene antes del hueco.
6. El Grupo sólo pasa a `READY` si `h == sourceRevision`, no hay evento faltante, `PROCESSING` o
   `FAILED` en el intervalo, y schema, generación y backfill están completos. Si aparece una revisión
   concurrente, continúa `DIRTY` aunque el evento procesado haya aplicado correctamente.
7. Un evento repetido puede ser no-op sólo si su completion y el efecto idempotente del recurso ya
   existen. La comparación `scopeRevision <= projectedRevision` por sí sola no permite omitirlo sin
   haber establecido antes la continuidad.

Entregas duplicadas y fuera de orden convergen porque el evento no transporta el estado publicable.
Una Entrega resuelta por otro administrador se relee terminal y desaparece de todos los usuarios.

Caso obligatorio de prueba: recurso A genera revisión 1 y recurso B revisión 2. Si B se procesa
primero, sus efectos quedan aplicados pero `projectedRevision` no supera 0 y el Grupo no queda
`READY`. Al aplicar A, la transacción verifica 1 y 2 contiguas, avanza a 2 y sólo marca `READY` si
`sourceRevision` continúa en 2. Variantes cubren fallo permanente de A, duplicado de B y una revisión
3 concurrente; ninguna permite omitir A ni publicar salud completa antes de converger.

### 5.2 Definición precisa de estados

| Estado | Significado | Interfaz |
| --- | --- | --- |
| `READY` | Backfill completo; schema/generación activos; para todos los scopes autorizados observados `projectedRevision == sourceRevision`; no hay fallo registrado; reconciliación dentro del objetivo operativo | Badge y lista normales, con `asOf` disponible en metadatos/accesibilidad |
| Actualización normal | Existe revisión nueva conocida y el evento está pendiente/procesando dentro del umbral | Conservar última respuesta ya autorizada como “N tareas · Actualizando…”. No afirmar que N sea vigente; si no hay respuesta previa, mostrar carga |
| `REBUILDING` o cobertura incompleta | Generación nueva/backfill sin switch o falta un contexto actual | Sin badge/zero. “Estamos preparando tus tareas.” La generación anterior sólo se muestra como última actualización si fue reautorizada |
| `DEGRADED` | Evento supera umbral, agota retries, health/reconciliación falla o hay drift | Sin total vigente; banner “No pudimos actualizar todas tus tareas”, última lista autorizada identificada como anterior y reintento |
| Error de consulta | El backend no pudo autenticar/componer la respuesta | No equivale a cero. Mantener datos de la misma sesión como anteriores, mostrar error y reintento |

`asOf` es el timestamp de la proyección completa más antigua entre los scopes incluidos en la
respuesta. Garantiza hasta qué actualización proyectada se compuso; no garantiza que ninguna fuente
haya cambiado después ni un snapshot simultáneo global.

El fallo al crear outbox/dirty aborta el writer. Fallos del worker dejan `sourceRevision` por delante,
lease vencido/evento pendiente o `FAILED`; métricas y alarma comparan edad del evento, revisiones y
errores. Por eso un cambio canónico cubierto no deja `READY` aparentemente vigente.

Objetivos operativos provisionales adoptados, aún no medidos:

- 95 % de eventos normales aplicados en **30 segundos**;
- degradar cuando el evento pendiente más antiguo supera **5 minutos**;
- reconciliación de cobertura completa al menos cada **24 horas**.

Son objetivos provisionales adoptados por D5-061, no garantías demostradas. Deben medirse durante
IUX-02A/B; costo y rendimiento son gates de habilitación, no bloqueantes para iniciar el trabajo que
permita obtener esa evidencia una vez autorizado.

La cadencia de pantalla ya confirmada es independiente: consultar al entrar al dashboard, al regresar
desde una sección contextual y por acción manual. No se usa polling periódico, listener en tiempo
real ni refresh automático por focus. Por separado, los cambios de dominio actualizan la proyección
y el reconciliador operativo detecta/repara drift.

## 6. Autorización del listado y del total

### 6.1 Contextos actuales por apertura

El backend deriva la cuenta autenticada y enumera únicamente:

1. Grupos cuyo `ownerId` actual es la cuenta;
2. slots `GROUP_PAYMENT_NOTICE_REVIEW` de la cuenta.

Para cada slot relee Grupo, grant, Persona propia, Membresía/Período, Temporada, `validityAnchor` y
`ownershipRevision`, aplicando exactamente `reviewerAuthorization`. Deduplica Grupo si también es
Owner. N20 exige Owner y Grupo activo. N31 admite Owner de Grupo activo/archivado; reviewer sólo en
Grupo activo y nunca para Entrega de su propia Persona.

No existe transferencia canónica habilitada. Si se habilita, la enumeración por `ownerId` refleja el
nuevo Owner inmediatamente y los grants viejos fallan por `ownershipRevision`.

### 6.2 Listado

El backend consulta la generación activa y filtra por contextos reautorizados. Para cada item que va
a devolver, relee Solicitud/guard/coordinación o Entrega y confirma que continúa accionable. Si queda
resuelto o deja de estar autorizado, lo omite y continúa el cursor físico hasta completar la página
o agotar. La consulta no escribe, no emite eventos y no solicita reparación durable; la convergencia
corresponde al procesamiento de cambios de dominio y a la reconciliación independiente.

Detectar al menos una card proyectada no accionable invalida la coherencia del contador derivado:
la respuesta usa `health=UPDATING`, `complete=false` y omite `totalTasks`, incluso si logró completar
la página con otros items revalidados. No responde `READY`, no infiere cero y no devuelve como vigente
el contador que todavía incluye la copia descartada. La interfaz puede conservar sólo su valor
anterior de la misma sesión con el calificador “Actualizando…”.

### 6.3 Total

Se recomienda **contador materializado por usuario/Grupo** y no count agregado global:

- el backend revalida **todos** los contextos que aportan al total;
- excluye el contexto revocado antes de sumar, aunque sus items aún existan;
- suma `counts.total` de una sola generación y sólo de scopes con salud suficiente;
- no usa `items.length` ni cuenta sólo la página;
- si falta un contexto actual, hay generaciones mezcladas o un scope está `REBUILDING/DEGRADED`, no
  entrega total vigente.

Un count agregado de todos los items del usuario sería exacto dentro de la colección, pero incluiría
copias de contextos revocados hasta su limpieza. Agregar filtros por todos los Grupos requiere
chunks/índices y no resuelve el health. El contador contextual mueve trabajo al proyector y permite
exclusión segura antes del reprocesamiento.

Idempotencia: la transacción del proyector compara estado anterior/nuevo del item y modifica el
contador sólo por delta. Un retry no vuelve a incrementar. La reconstrucción calcula contadores en
una generación nueva y los publica al hacer switch; nunca los suma sobre la generación activa.

Exactitud:

- `totalTasks` es exacto para los items activos de la generación y scopes incluidos en `asOf`;
- no es promesa de igualdad instantánea con fuentes modificadas después;
- durante actualización normal el backend omite un total vigente; el cliente puede conservar el
  número de su respuesta `READY` anterior acompañado de “Actualizando…”;
- sólo `READY` permite presentar `N tareas` sin calificador.

### 6.4 Revocación y sesión abierta

Después de revocar, cerrar/finalizar o archivar, una nueva respuesta relee la autoridad y excluye el
contexto tanto de lista como de suma. Entre el commit y el reprocesamiento puede quedar una copia
física, pero no se devuelve. Una respuesta ya cargada puede permanecer hasta la próxima consulta; no
se promete retirar lo ya visto. Al recibir la respuesta nueva, el frontend elimina items/contextos,
cierra detalles y descarta cursores relacionados. Si la persona abre antes una card desactualizada,
el destino revalida y comunica que ya fue resuelta o que no existe acceso.

Logout/cambio de cuenta limpia inmediatamente items, total, cursores y cache. Cada request lleva
`uid`, generación de sesión y request ID; respuestas tardías incompatibles se descartan.

### 6.5 Contrato de entrada y cursor

La entrada admite `coverage="N20_N31_V1"` obligatoria y `cursor` opaco opcional. Cuenta, Persona,
contextos, tamaño de página, rol y prioridad nunca son autoridad suministrada por el cliente. El
cursor firmado liga:

- cuenta autenticada y coverage;
- `generationId` activo y versión de schema/orden;
- última tupla `(actionableAt, taskType, taskId)` examinada.

El backend valida firma, tamaño, cuenta, coverage, generación y orden antes de leer. Alteración o
mezcla de cuenta responde `INVALID_CURSOR`; generación reemplazada responde `CURSOR_EXPIRED`. En
ambos casos el cliente descarta el cursor y reinicia desde la primera página. `nextCursor` conserva
el último documento físico examinado, no sólo el último item visible, para evitar duplicados u
omisiones cuando la revalidación descarta cards.

## 7. Costos estimados

Escenarios ilustrativos, no mediciones:

| Escenario | Grupos Owner | Contextos reviewer | Tareas activas `C` | Destinatarios medios N31 `R` | Página |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pequeño | 2 | 1 | 12 | 2 | 10 |
| Medio | 10 | 10 | 200 | 3 | 20 |
| Crecimiento | 50 | 50 | 2.000 | 5 | 20 |

### 7.1 Apertura

Estimación conservadora: `O(G+S)` para enumerar contextos; hasta cinco lecturas adicionales por
contexto reviewer (grant, grupo, identidad/Membresía/Temporada, con deduplicación posible); una
lectura de scope y contexto-contador por Grupo; `P+1` items y hasta `P` fuentes/presentaciones.

| Escenario | Orden de lecturas estimado por apertura |
| --- | ---: |
| Pequeño | 30–45 |
| Medio | 140–190 |
| Crecimiento | 580–750 |

El costo de crecimiento sigue siendo relevante por autorización, pero no recorre 2.000 tareas ni
sus guardas en cada apertura. Debe medirse con emulador y datos representativos antes de aprobar el
presupuesto. Caches sólo pueden reducir presentación; no pueden extender autorización tras revocar.

### 7.2 Cambio de dominio

- writer canónico: una lectura adicional de scope y **2 escrituras** adicionales (scope + outbox);
- cambio de una tarea: manifest + aproximadamente `2R` escrituras de item/contador, más finalización
  de outbox/scope;
- N20 suele tener `R=1`; N31 produce Owner + reviewers efectivos;
- grant/revocación para un reviewer con `D` Entregas activas: hasta `D` items y manifests revisados,
  con el contador consolidado por batch/transaction; el scope permanece no READY hasta completar.

Son estimaciones lógicas; retries, límites de batch y contención del contador/revisión de Grupo deben
medirse. `dashboardTaskScopes/{groupId}` es un hotspot deliberado: si la tasa real supera su
capacidad, deberá particionarse antes de producción, no después de perder eventos.

### 7.3 Backfill y reparación

Un rebuild lee las fuentes una vez y escribe por destinatario. Ejemplo superior ilustrativo:

| Escenario | Lecturas base de fuentes | Items derivados aproximados `C×R` |
| --- | ---: | ---: |
| Pequeño | 12 + autorización | 24 |
| Medio | 200 + autorización | 600 |
| Crecimiento | 2.000 + autorización | 10.000 |

N20 reduce el promedio porque sólo tiene Owner. Una reconciliación sin drift lee fuentes/manifests y
escribe únicamente checkpoint; con drift escribe faltantes, sobrantes y contadores reparados.

## 8. Reconstrucción, reconciliación y rollback

1. Crear generación nueva `REBUILDING` con schema/coverage version.
2. Escanear Solicitudes N20 y Entregas N31 por cursor físico; N31 avanza por documento crudo, no por
   el cursor visible que hoy puede perder una página de auto-revisión.
3. Recalcular audiencia y escribir items/contextos/contadores en batches idempotentes.
4. Conservar el outbox activo; registrar high-water mark y reproducir revisiones posteriores.
5. Comparar fuentes, manifests e items: faltantes, sobrantes, duplicados, audiencia y conteos.
6. Cambiar `activeGeneration` por usuario sólo al completar su conjunto; luego scope `READY`.
7. Conservar la generación anterior durante los 30 días adoptados y limpiarla posteriormente.

Rollback: deshabilitar el lector nuevo y volver al consumidor anterior mediante configuración/diff
revisado; detener el proyector; conservar/reconstruir datos derivados. Nunca revertir Solicitudes,
Entregas, grants, Membresías, Temporadas o Grupos.

## 9. Deep-links y presentación

### 9.1 N20

Destino definido:
`/dashboard/groups/{groupId}?joinRequestId={requestId}#pending-group-join-requests`.

Ajuste mínimo: agregar un reader/callable Owner exacto por `groupId+requestId` que reutilice la
composición de `listOwned` y devuelva el mismo `PendingGroupJoinRequestForOwner`. El actual
`getGroupJoinRequestDecisionResult` revalida estado/Owner pero no entrega Persona ni
`approvalEffect`; no debe deformarse como listado. La página lee el parámetro, enfoca/realza la fila
y deja aprobar/rechazar/recuperar al componente actual. Terminal, inexistente o sin acceso muestran
estado no disponible sin ejecutar acción.

### 9.2 N31

Destino definido:
`/dashboard/groups/{groupId}/economy?tab=notices&deliveryId={deliveryId}#payment-deliveries`.

`getGroupPaymentDelivery` y `PaymentDeliveriesAdminSection` ya permiten carga exacta y revalidan
estado/autorización. El ajuste mínimo es derivar `deliveryId` de `useSearchParams`, pasarlo al
componente y limpiar el parámetro después de procesarlo para no reabrir el modal. Los links de tabs
no deben arrastrar un ID ajeno. Recurso resuelto, inexistente o sin acceso usa el error vigente y
limpia el detalle.

El dashboard permanece contraído inicialmente, sólo navega, muestra Grupo/Temporada cuando aplica,
no asigna prioridad y no ofrece acciones administrativas. Consulta al entrar, al regresar desde el
contexto y mediante control manual; no consulta por polling, listener ni evento de focus.

## 10. División implementable mínima

`IUX-02` sigue siendo una sola ficha/contrato y se ejecutaría en dos cortes internos, no dos fichas
independientes:

### IUX-02A — Producción y operación de la proyección

- modelo, Rules e índices server-only;
- scope revision, outbox e integración de todos los writers enumerados;
- proyector, manifests, contadores contextuales, retries, métricas y alarmas;
- backfill, reconciliación, rebuild y rollback;
- sin consumidor productivo del dashboard.

Aceptación: ningún writer canónico deja `READY` sin evento; duplicados/desorden convergen; una
revisión posterior de otro recurso no salta una anterior sin aplicar; N20/N31 y cambios de audiencia
reparan faltantes/sobrantes; backfill completa generación; consulta no produce writes ni solicita
reparación; costo y SLO medidos.

### IUX-02B — Consulta segura y destinos

- enumeración/revalidación actual de contextos;
- listado paginado, total contextual, health y `asOf`;
- readers/deep-links N20/N31;
- sesión, consultas al entrar/regresar/manual, estados y pruebas negativas;
- contrato consumible por IUX-01.

Aceptación: revocación excluye lista y total en la respuesta siguiente; auto-revisión nunca aparece;
badge no cuenta página; una card descartada produce `UPDATING` sin total vigente; deep-links
revalidan; errores/rebuild no son cero; no hay polling/focus/listener; respuestas tardías se descartan.

### IUX-01 — Integración visual

Puede avanzar visualmente con datos controlados no publicables. Se habilita junto con IUX-02B sólo
cuando IUX-02A esté backfilled/READY y hayan pasado gates. Retira el consumidor de `pendingAlerts` y
consultas de Torneos sólo del dashboard; no elimina rutas/productores externos.

Pruebas mínimas: varios Grupos y ambos tipos; Owner+capability; auto-revisión; grant revocado;
finalización/reactivación; Temporada cerrada; Grupo archivado; resolución administrativa; eventos
repetidos/fuera de orden, incluidos dos recursos con revisiones contiguas aplicadas en orden inverso;
paginación/cursor ligado a cuenta-generación-orden; conteo; card stale; fallo/rebuild; cambio de
sesión; deep-links; cero writes/eventos/repair requests al consultar; emulador/Rules/índices; UAT
móvil/escritorio. Gates productivos E3 permanecen intactos.

## 11. Extensiones futuras

Notificaciones y agenda pueden reutilizar outbox, contexto y operación, pero deben tener
subcolecciones, IDs, contadores y ciclos de vida propios. Una notificación puede referir `taskId`;
`readAt/hiddenAt` nunca resuelve la tarea. Agenda ordena por `scheduledFor`. No se seleccionan
catálogo, prioridad, push, correo, recurrencia ni actividades.

## 12. Comparación final

| Dimensión | A. Barrido directo descartado | B. Proyección adoptada |
| --- | --- | --- |
| Apertura | `O(contextos + todas las tareas + validaciones)` | `O(contextos de autorización + página)`; total por contadores contextuales |
| Cambio de dominio | Sin writes derivados | Scope+outbox atómicos y fan-out asíncrono |
| Consistencia | Fuentes recientes, composición cara y sin snapshot global simple | Eventual declarada con revision/health/`asOf` |
| Revocación | Revalida al abrir | También revalida al abrir; no confía en limpieza de proyección |
| Operación | Menor infraestructura, costo por usuario variable | Worker, retries, reconciliación y rebuild |
| Crecimiento | Techos pueden impedir total/cero | Escrituras crecen con destinatarios; apertura no con todas las tareas |
| Futuras superficies | Repite composición por módulo | Comparte infraestructura sin mezclar schemas/semánticas |

## 13. Decisiones adoptadas y gates de ejecución

| ID | Decisión material | Estado |
| --- | --- | --- |
| IUX-02-D01 | Adoptar arquitectura B y descartar A como implementación | **Adoptada por D5-061** |
| IUX-02-D02 | Objetivos provisionales 30 s / degradación 5 min / reconciliación 24 h | **Adoptada por D5-061; medición pendiente** |
| IUX-02-D03 | Retención de 30 días sólo para procesados/inactivos y generaciones sustituidas | **Adoptada por D5-061; tareas vigentes nunca expiran** |
| IUX-02-D04 | Addendum y cambios normativos | **Adoptada por D5-061** |
| IUX-02-D05 | Habilitación coordinada IUX-01/IUX-02 | **Adoptada; condicionada a backfill, seguridad, rendimiento, UAT y gates** |
| IUX-02-D06 | Consulta al entrar, regresar y manual; sin polling/listener/focus | **Adoptada por D5-061** |

Outbox, contador contextual, backend-only, deep-links y división IUX-02A/B quedan adoptados y no se
devuelven como menú de diseño. No quedan decisiones arquitectónicas bloqueantes.

## 14. Impacto documental adoptado

- **Documento 2:** caso de consulta global, semántica de tarea/total/health y comportamiento ante
  revocación.
- **Documento 3:** proyección derivada, fuentes originales, identidades, estados, conteos,
  consistencia y privacidad.
- **Documento 4:** outbox/scope revision, proyector, backend-only, índices/Rules, secuencias,
  reconciliación, SLO y rollback.
- **Documento 5:** adopción de IUX-02A/B como cortes internos, dependencias, gates, habilitación
  coordinada y preservación de E3.

El [addendum](../../arquitectura/Documento-2-3-4-addendum-IUX-02-proyeccion-dashboard.md) queda
adoptado por D5-061. La adopción documental no autoriza implementación ni producción.
