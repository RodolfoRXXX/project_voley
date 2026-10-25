# IUX-02 — Consulta global de tareas accionables del dashboard

## Estado de la ficha

- **Incremento:** `IUX-02`.
- **Estado:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Implementación:** no autorizada.
- **Fecha:** 2026-10-25.
- **Responsable:** pendiente de asignación.
- **Rama/checkpoint de partida:** `dev` en `c02f0afea067dcf4a757c68a9ef5bcd590682c24`.
- **Etapa:** Interetapa UX móvil (`IUX`) entre E3 y E4.
- **Selección funcional expresa:** `IUX-N20` + `IUX-N31`; `IUX-N30` y todos los demás tipos fuera.
- **Dirección técnica adoptada por D5-061:** alternativa B, proyección derivada por usuario con
  outbox transaccional, contador contextual y lectura backend.
- **Alcance documental:** especificar y comparar alternativas físicas, integración y validación. No autoriza
  código, Functions, Rules, índices, datos, dependencias, despliegue ni cierre de E3.

## 1. Identificación

- **ID:** `IUX-02`.
- **Nombre:** **Consulta global de tareas accionables del dashboard**.
- **Casos incluidos:** enumerar y presentar solicitudes de ingreso que la cuenta Owner puede decidir
  (`IUX-N20`) y entregas de pago que puede revisar como Owner o reviewer efectivo (`IUX-N31`).
- **Casos excluidos:** N30, Torneos legacy, próximos eventos, información, notificaciones, campana,
  destacados, prioridad, vigencia, acciones administrativas y cualquier tarea no seleccionada.
- **Fuentes:** Documento 5 §§5.2–5.18 y §7.5A, D5-059/D5-060, ficha IUX-01, relevamiento,
  inventario IUX, [evaluación de proyección](IUX-evaluacion-arquitectura-proyeccion-dashboard.md) y
  [addendum adoptado](../../arquitectura/Documento-2-3-4-addendum-IUX-02-proyeccion-dashboard.md).
- **Brecha:** no existe una consulta global con cobertura N20+N31, total con garantía declarada y autorización por
  recurso; las consultas vigentes son por Grupo.

## 2. Objetivo funcional

Entregar al dashboard una lectura global de las tareas N20 y N31 que la cuenta puede completar, sin
crear una nueva fuente de verdad ni modificar recursos al consultar. La respuesta debe distinguir el
total de la cobertura N20+N31 de la cantidad visible y debe fallar cerrada cuando no pueda demostrar
la salud y completitud prometidas. D5-061 adopta la proyección derivada; el barrido directo se
conserva sólo como antecedente y baseline comparativo.

## 3. Actores

| Actor | Participación | Contexto | Resultado esperado |
| --- | --- | --- | --- |
| Cuenta autenticada | Actor principal | Uno o más Grupos relevantes | Consulta tareas realmente accionables y navega a su contexto |
| Owner canónico | Autorización N20/N31 | Grupo propio compatible | Ve cada tarea una vez |
| Reviewer efectivo | Autorización N31 | Grupo activo, grant y contexto vigentes | Ve entregas de terceros; nunca la propia |
| Sistema | Coordinador read-only | Fuentes de Solicitud, Entrega y autorización | Compone, deduplica, ordena y responde sin writes |

Cargo descriptivo, roles globales, `GROUP_TREASURY` y `GROUP_DIRECT_PAYMENT_RECORD` no conceden
ningún acceso de este incremento.

## 4. Precondiciones

1. Sesión Firebase válida y Cuenta canónica disponible.
2. IUX-01 conserva el bloque cerrado y no publica cero antes de recibir cobertura completa.
3. N20 exige Grupo activo, ownership canónico y Solicitud autoritativamente pendiente.
4. N31 exige Grupo compatible y ownership, o Grupo activo más slot/grant/cuenta/Persona/Membresía,
   Temporada, `validityAnchor` y `ownershipRevision` vigentes.
5. La entrega de un reviewer no pertenece a su propia Persona.
6. IUX-02-D01–D06 están adoptadas por D5-061; iniciar implementación requiere autorización separada.
7. Los gates productivos de E3 permanecen pendientes y no se satisfacen con esta consulta.

## 5. Flujo principal

1. El dashboard solicita la cobertura cerrada `JOIN_REQUEST_DECISION` + `PAYMENT_DELIVERY_REVIEW`.
2. Backend autentica y deriva `accountId`; el cliente no envía Persona, roles ni Grupos.
3. Según la arquitectura adoptada, el backend enumera ownership y slots reviewer
   actuales, revalida todos los contextos y lee la generación activa de la proyección.
4. Para cada item visible relee la fuente y confirma accionabilidad; ownership y capability
   coincidentes no duplican la tarea.
5. Suma contadores materializados sólo de contextos autorizados y saludables. Devuelve orden,
   cursor, health, `asOf` y total únicamente con la garantía declarada.
6. El frontend muestra badge únicamente si el total está disponible, permite navegar y consulta al
   entrar, al regresar desde una sección contextual o por acción manual; no decide ni escribe.

La consulta no inicia recuperaciones, consume intents, repara proyecciones, resuelve coordinaciones
ni modifica estados. La producción/reconciliación eventual de una proyección es un proceso separado.

## 6. Flujos alternativos y errores

| Condición | Respuesta funcional | Estado resultante | Feedback | Reintento |
| --- | --- | --- | --- | --- |
| Sin sesión | `UNAUTHENTICATED` | Sin datos | “Tu sesión venció.” | Tras autenticar |
| Contexto revocado durante lectura | Excluir si se confirma antes de responder; si impide cobertura, `COVERAGE_CHANGED` | Sin cero ni total | “Los accesos cambiaron. Actualizá.” | Sí |
| Actualización normal dentro del umbral | Última respuesta autorizada + `UPDATING` | No es total vigente | “Actualizando…” | Próxima consulta o manual |
| Proyección `REBUILDING` o incompleta | Sin total vigente | No presentar vacío | “Estamos preparando tus tareas.” | Próxima consulta o manual |
| Proyección `DEGRADED` | Sin total vigente; última respuesta identificada como anterior | No presentar vacío | “No pudimos actualizar todas tus tareas.” | Manual + operación |
| Dependencia parcial | `DEPENDENCY_UNAVAILABLE`, sin respuesta parcial publicable | Datos anteriores se invalidan | Error con “Reintentar” | Sí |
| Recurso incompatible | `INCOMPATIBLE_STATE` con observabilidad interna, sin filtrar silenciosamente | Sin total | Error general | Tras corrección |
| Tarea resuelta antes del destino | Destino informa no vigente y vuelve a lista | Sin mutación adicional | “La tarea ya no está pendiente.” | Consultar al regresar |
| Recurso inexistente/sin acceso | Respuesta indistinguible `TASK_NOT_ACCESSIBLE` | Limpia detalle | “La tarea no está disponible.” | Consultar al regresar |
| Card proyectada que la revalidación descarta | Omitir card, `UPDATING`, `complete=false`, sin `totalTasks` vigente | Lista revalidada sin cero inferido | “Actualizando…” | Próxima consulta o manual |
| Respuesta de otra sesión | Cliente la descarta por generación de sesión/request | Estado actual intacto | Ninguno o estado vigente | Nueva consulta |

## 7. Postcondiciones y criterios de aceptación

### Postcondiciones

- Solicitudes, Entregas, grants, slots, Grupos, Membresías y Temporadas no cambian.
- Consultar no crea eventos, alertas, proyecciones ni recibos.
- La respuesta representa únicamente N20+N31 de la cuenta según la garantía temporal y de salud
  declarada por la alternativa física elegida.

### Criterios de aceptación

1. **Dado** un Owner con solicitudes en varios Grupos, **cuando** consulta, **entonces** obtiene una
   tarea por Solicitud autoritativamente pendiente.
2. **Dada** una cuenta Owner y reviewer del mismo Grupo, **entonces** cada Entrega aparece una vez.
3. **Dado** un reviewer, **entonces** su propia Entrega no aparece y las de terceros sí, si el resto
   del contexto continúa vigente.
4. **Dado** un grant revocado, una Solicitud cancelada o una Entrega resuelta por otro actor,
   **entonces** el recurso no integra una respuesta nueva.
5. **Dada** cobertura `READY`, `totalTasks` coincide con la suma de N20+N31 deduplicadas de los
   contextos actualmente autorizados en esa generación y no con `items.length`; el DTO declara `asOf`.
6. **Dada** cobertura incompleta o error, no se devuelve ni presenta `0 tareas` ni badge total.
7. Ninguna combinación de consulta, paginación, refresh o navegación produce escrituras.
8. Páginas visuales no repiten `taskId` y conservan orden estable.
9. Un item descartado al revalidar impide responder `READY` y omite `totalTasks`; lista, total y
   health no se contradicen.
10. Los eventos de dos recursos distintos procesados fuera de orden no permiten avanzar
    `projectedRevision` sobre una revisión todavía no aplicada ni marcar el Grupo `READY`.

## 8. Frontend

### Pantallas y rutas

- Modificada coordinadamente: `/dashboard` mediante IUX-01.
- N20 definido: `/dashboard/groups/{groupId}?joinRequestId={requestId}#integrantes`.
- N31 definido: `/dashboard/groups/{groupId}/economy?tab=notices&deliveryId={deliveryId}`.

### Presentación

- Lista global, no agrupada; cada fila muestra tipo, Grupo y Temporada cuando corresponda.
- Orden v1: `actionableAt DESC`, luego `kind ASC`, luego `resourceId ASC`.
- No se presenta urgencia/media/baja.
- Badge: `N tareas` sólo en `READY`. En actualización normal puede conservar el valor anterior como
  **“N tareas · Actualizando…”**, sin presentarlo como vigente. Rebuild/degradación/error no son cero.
- Ayuda: **“Incluye solicitudes de ingreso y entregas de pago por revisar.”**
- Carga y error son independientes; ninguno equivale a cero.
- Primera página: 10; máximo backend: 20; “Ver más” usa cursor de la misma generación.
- Consulta al entrar al dashboard, al regresar desde una sección contextual y mediante control
  manual. No hay polling periódico, listener en tiempo real ni refresh automático por focus.
- Una pantalla abierta puede conservar una card resuelta por otro administrador hasta la siguiente
  consulta; al abrirla, el destino revalida estado y autorización y comunica resolución o falta de acceso.
- Cada request lleva una generación local ligada al `uid`; logout/cambio de sesión aborta o invalida
  resultados tardíos.

No se publican datos ficticios. Datos controlados sólo se admiten en pruebas, Storybook o entorno no
productivo claramente identificado.

## 9. Servicio de Aplicación responsable

- **Módulo coordinador definido:** `dashboardTasks` como coordinación/proyección derivada; no como dominio.
- **Servicio:** `DashboardTaskQueryService` o equivalente.
- **Operación:** `listMyDashboardTasks`.
- **Autorizaciones:** capacidades públicas de ownership, Solicitudes y review de Entregas.
- **Habilitación comercial:** no aplica.
- **Contratos consumidos:** lectores N20/N31, autorización canónica y estado de
  proyección; no documentos sin validar.
- **Respuesta:** cobertura, salud/as-of, total cuando pueda afirmarse, página ordenada y cursor.

El coordinador no reimplementa invariantes: cada módulo debe exponer una capacidad de lectura apta
para composición o reutilizar su validación existente sin atravesar Repositorios internos ajenos.

## 10. Agregados y reglas

| Agregado/fuente | Participación | Operación | Invariantes | ¿Se modifica? |
| --- | --- | --- | --- | --- |
| Solicitud de ingreso | Fuente N20 | Lectura de estado, guard y coordinación | Un par Persona–Grupo pendiente; estado autoritativo | No |
| Grupo | Contexto | Ownership, estado y nombre | Owner canónico; activo para N20/reviewer | No |
| Entrega | Fuente N31 | Lectura de `REPORTED` | Una tarea por `deliveryId`; entrega completa | No |
| Grant/slot + Membresía/Temporada | Contexto reviewer | Validación efectiva | Capability exacta, vigencia y no auto-revisión | No |

Identidad estable:

- N20: `JOIN_REQUEST_DECISION:{requestId}`.
- N31: `PAYMENT_DELIVERY_REVIEW:{deliveryId}`.

La misma identidad se conserva aunque la cuenta reúna ownership y capability. Un aviso informativo
produce cero tareas.

## 11. Alternativas físicas y costo

### 11.1 Consultas disponibles sin índices nuevos

| Paso | Consulta | Índice actual | Costo asintótico |
| --- | --- | --- | --- |
| Grupos propios | `groups where ownerId == accountId`, paginada por ID | Índice simple automático | `O(G)` lecturas |
| Slots candidatos | `groupCapabilityGrantSlots where accountId == accountId`, paginada por ID; filtra capability en backend | Índice simple automático | `O(S)`; incluye slots de otras capabilities |
| N20 por Grupo | `groupId == G AND estado == pendiente ORDER BY createdAt DESC` | Compuesto vigente | `O(J)` candidatos + validaciones |
| N31 por Grupo | `groupId == G AND decisionState == REPORTED ORDER BY reportedAt ASC` | Compuesto vigente | `O(D)` candidatos + validaciones |

`G` es cantidad de Grupos propios, `S` slots de la cuenta, `J` Solicitudes candidatas y `D` Entregas
candidatas. El callable **no elimina** el fan-out: lo mueve al backend y permite autorizarlo de forma
uniforme.

Para N31 delegado, la paginación física debe avanzar con el último documento **crudo** leído y
continuar aunque una página sólo contenga Entregas de la Persona propia. El filtrado post-query del
listado actual no puede reutilizarse sin adaptación porque una página completamente autoexcluida no
entrega cursor y podría ocultar candidatos posteriores.

La comprobación N20 actual puede sumar guard, coordinación, consulta del par pendiente, Persona y
contexto de Membresía/Temporada por candidato. N31 amortiza autorización por Grupo, pero suma la
presentación de Persona por Entrega. Por eso el peor caso supera ampliamente `G+S+J+D`; con 500
candidatos predominantemente N20 puede aproximarse a varios miles de lecturas en una apertura.

### 11.2 Alternativa A — barrido directo acotado (descartada como implementación)

La propuesta anterior de 50 contextos, 500 candidatos/tareas y paginación sólo visual se conserva
como trazabilidad y baseline de medición. **No está aprobada ni recomendada para implementación en
este estado.** Reutiliza fuentes e índices actuales, pero paga `O(G+S+J+D)` y validaciones auxiliares
en cada apertura; sus techos pueden impedir demostrar lista, cero y total en cuentas crecientes.

Una página backend con total recalculado, consultas `in` por lotes o un callable no eliminan por sí
solos el fan-out. El fan-out frontend continúa descartado por exposición de coordinación, N+1 y
errores parciales.

### 11.3 Alternativa B — arquitectura adoptada

La [evaluación arquitectónica](IUX-evaluacion-arquitectura-proyeccion-dashboard.md) sustenta la
decisión D5-061: outbox+revisión de scope atómicos en writers canónicos, proyector idempotente,
generaciones por usuario, contadores materializados por usuario/Grupo y consulta backend que
revalida **todos** los contextos del total. Triggers y escritura directa de cards no son la garantía
primaria.

La apertura mantiene `O(contextos de autorización + página)` y evita recorrer todas las tareas. El
costo pasa a writers y worker: dos escrituras adicionales por comando canónico, más fan-out por
destinatario y operación/reconciliación. Escenarios de evaluación: 30–45, 140–190 y 580–750 lecturas
estimadas por apertura para 3, 20 y 100 contextos; son estimaciones a medir, no presupuesto aprobado.

### 11.4 Adopción y límites

D5-061 adopta B y mantiene A sólo como antecedente/baseline. No se permite degradar a total
aproximado. Los objetivos 30 s / 5 min / 24 h son provisionales y deben medirse; presupuesto,
rendimiento, backfill, seguridad y UAT son gates para habilitar, no decisiones de diseño pendientes
ni impedimentos para iniciar el trabajo expresamente autorizado que produzca esa evidencia.

## 12. DTO de entrada y salida

### Entrada cerrada

| Campo | Tipo | Obligatorio | Validación | Origen |
| --- | --- | --- | --- | --- |
| `coverage` | literal `N20_N31_V1` | Sí | Único valor admitido | Frontend |
| `cursor` | string opaco | No | Firma, tamaño y versión válidos; ligado a cuenta autenticada, coverage, generación y orden | `nextCursor` anterior |

`accountId`, Persona, contextos, page size y prioridad no son inputs del cliente.

El cursor codifica de forma opaca la generación y la última tupla
`(actionableAt, kind, resourceId)` del orden v1. El backend rechaza alteración, cuenta distinta,
coverage/orden incompatibles o generación sustituida; ante cursor vencido el cliente reinicia desde
la primera página. Nunca se acepta un cursor de otra sesión como autoridad.

### Salida propuesta

| Campo | Tipo | Semántica | Consumidor |
| --- | --- | --- | --- |
| `coverage.version` | `N20_N31_V1` | Tipos evaluados | Dashboard |
| `coverage.complete` | booleano | Garantía de la evaluación/generación elegida | Estados/badge |
| `coverage.health` | `READY|UPDATING|REBUILDING|DEGRADED` | Salud para publicar o calificar datos | Estados |
| `coverage.asOf` | ISO server time | Momento de la lectura/proyección; no sincronía futura | Actualización |
| `coverage.generationId` | string opcional | Invalida cursores si hay rebuild | Paginación |
| `totalTasks` | entero opcional | Total contextual presente sólo si `health=READY` y `complete=true` | Badge |
| `items` | `DashboardTask[]` | Página ordenada | Lista |
| `nextCursor` | string opcional | Cursor opaco ligado a orden, cuenta y generación | Paginación |

`DashboardTask`: `taskId`, `kind`, `resourceId`, `actionableAt`, `group{id,name}`,
`season{id,name}?`, `summary`, `decisionStatus?` y `destination`. No incluye UID, email, grants,
paths Firestore ni prioridad.

Conteos de contextos, candidatos, lecturas, tiempo, memoria y payload se registran como evidencia de
prueba/observabilidad backend; no forman parte del DTO público.

### Errores contractuales

| Código | Significado | Frontend |
| --- | --- | --- |
| `UNAUTHENTICATED` | Sesión ausente | Limpiar y autenticar |
| `COVERAGE_LIMIT_EXCEEDED` | Alternativa A no probó agotamiento | Sin badge/cero; informar y reintentar |
| `PROJECTION_NOT_READY` | Proyección atrasada, incompleta o reconstruyéndose | Sin badge/cero; informar/actualizar |
| `COVERAGE_CHANGED` | Contextos cambiaron durante evaluación | Descartar y refrescar |
| `INCOMPATIBLE_STATE` | Fuente no validable | Sin datos parciales |
| `DEPENDENCY_UNAVAILABLE` | Lectura incompleta | Error y reintento |
| `INVALID_CURSOR` | Cursor alterado o ligado a otra cuenta/coverage/orden | Descartar y reiniciar primera página |
| `CURSOR_EXPIRED` | La generación del cursor ya no es activa | Descartar y reiniciar primera página |

## 13. Diseño físico Firestore

### 13.1 Fuentes vigentes y proyección propuesta

| Ruta | Finalidad | Autoridad | Estado |
| --- | --- | --- | --- |
| `groups` | ownership/contexto | Grupo | Vigente |
| `groupJoinRequests` y guardas/coordinaciones | N20 | Solicitud y coordinación | Vigente |
| `paymentDeliveries` | N31 | Entrega | Vigente |
| `groupCapabilityGrantSlots`/`groupCapabilityGrants` | review efectivo | Capability | Vigente |
| `memberships`, `seasons`, `users`, `personas` | vigencia/presentación | Módulos vigentes | Vigente |
| `dashboardTaskScopes/{groupId}` | revisión/health por scope | Control derivado | Adoptada; no implementada |
| `dashboardTaskOutbox/{eventId}` | entrega durable mínima | Evidencia operativa | Adoptada; no implementada |
| `dashboardTaskManifests/{taskId}` | destinatarios proyectados | Nunca autoridad | Adoptada; no implementada |
| `users/{uid}/dashboardTaskProjection/N20_N31_V1` | generación activa | Nunca autoridad | Adoptada; no implementada |
| `users/{uid}/dashboardTaskSets/{generationId}/items/{taskId}` | tareas derivadas | Nunca autoridad | Adoptada; no implementada |
| `users/{uid}/dashboardTaskSets/{generationId}/contexts/{groupId}` | conteos N20/N31 por contexto | Nunca autoridad | Adoptada; no implementada |

`pendingAlerts` no se lee ni migra como fuente.

### 13.2 Campos y referencias

Se conservan identidad/tipo, referencia original, `groupId/seasonId?`, fecha accionable,
versión/fingerprint, revisión de scope, generación, estado derivado y destino tipado. Persona,
email, importe, líneas, grants y cargo no se persisten: el backend los compone sólo para la página.

### 13.3 Datos originales y derivados

Solicitud/Entrega y sus contextos son originales. Items, manifests, contadores, revisiones,
generación, health y total son derivados/reconstruibles y nunca deciden el estado de la fuente.

### 13.4 Índices

| Consulta | Índice | Estado |
| --- | --- | --- |
| N20 por Grupo/estado/fecha | `groupId ASC, estado ASC, createdAt DESC` | Vigente |
| N31 por Grupo/estado/fecha | `groupId ASC, decisionState ASC, reportedAt ASC` | Vigente |
| Grupos por Owner | simple `ownerId` | Vigente automático |
| Slots por cuenta | simple `accountId` y filtro backend | Vigente automático; costo a medir |
| Slot por cuenta + capability | `accountId + capabilityId` | No vigente; optimización condicionada a medición, no bloquea iniciar |
| Items activos ordenados | `projectionState ASC, actionableAt DESC, taskType ASC, taskId ASC` | Propuesto |
| Outbox worker | `status ASC, availableAt ASC, createdAt ASC` | Propuesto |
| Outbox por scope | `groupId ASC, status ASC, scopeRevision ASC` | Propuesto |
| Manifests por scope | `groupId ASC, projectionState ASC, taskType ASC` | Propuesto |

IUX-02 no autoriza modificar índices. Los cuatro índices de proyección adoptados y cualquier índice
compuesto de slots justificado por medición forman parte de una implementación futura expresamente
autorizada. Notificaciones y agenda tendrán
índices separados cuando sus contratos sean seleccionados.

## 14. Seguridad y autorización

| Operación | Visitante | Usuario sin contexto | Owner | Reviewer efectivo | Otros roles/capabilities |
| --- | --- | --- | --- | --- | --- |
| Listar N20 | Denegado | Vacío autorizado/completo | Permitido en Grupo activo propio | Denegado | Denegado |
| Listar N31 | Denegado | Vacío autorizado/completo | Permitido en Grupo propio compatible | Permitido en Grupo activo, salvo propia Persona | Denegado |
| Decidir desde dashboard | Denegado | Denegado | Denegado | Denegado | Denegado |

La operación se propone backend-only y las Rules futuras deniegan toda lectura/escritura cliente de
proyección/outbox. El backend enumera ownership/slots actuales y revalida todos los contextos que
aportan a lista **y total**. Una copia obsoleta se excluye antes de limpiarse. Cada item visible y cada
destino vuelven a autorizar estado y actor. Un cargo descriptivo o ID conocido no concede acceso. Pruebas negativas:
Grupo ajeno, ex-Owner, grant revocado, slot/grant divergentes, Temporada cerrada, Membresía
finalizada, ownership revision distinta, Persona propia y rol global legacy.

## 15. Repositorios y adaptadores

| Componente | Capa | Contrato | Implementación propuesta | Tipo |
| --- | --- | --- | --- | --- |
| DashboardTaskQueryService | Aplicación | `listMyDashboardTasks` | Coordinador nuevo | Consulta |
| Group contexts reader | Pública/infra | Enumerar ownership/review candidatos | Adaptar capacidades vigentes | Consulta |
| Join request capability | Pública | Enumerar/validar N20 | Extraer sin duplicar invariantes | Consulta de Solicitud |
| Payment review capability | Pública | Enumerar/validar N31 | Extraer de reviewerAuthorization/listPending | Consulta de Entrega |
| Projection outbox writer | Infra compartida | `markDashboardTaskScopeDirty` | Una revisión+evento en transacción del writer | Escritura derivada |
| DashboardTaskProjector | Aplicación/infra | Procesar evento y releer fuente/audiencia | Worker idempotente con lease | Proyección |
| DashboardTaskReconciler | Aplicación/operación | Rebuild/verificar por generación | Cursor/batches; separado de consulta | Reparación |

No se permite que el coordinador importe Repositorios Firestore internos de otros módulos como atajo.

## 16. Transacción y unidad de consistencia

- **Consulta:** no modifica Aggregate Roots ni dispara reparación; actualizar la pantalla nunca decide tareas.
- **Alternativa A:** lectura compuesta sin snapshot global barato; un fallo parcial invalida total y
  vacío.
- **Alternativa B adoptada:** cada writer confirma fuente+scope+outbox atómicamente. El fan-out
  queda fuera del request, relee fuente y tolera repetición/fuera de orden. La transición de item y
  delta de contador forman una transacción idempotente.
- **Avance seguro:** aplicar un evento marca su revisión completada, pero `projectedRevision` avanza
  sólo sobre revisiones contiguas desde su valor actual. Un evento de otro recurso con revisión 2
  procesado antes de la revisión 1 no permite saltarla ni marcar el Grupo `READY`.
- **Fallo parcial:** no se publica respuesta parcial como completa ni se presenta cero.
- **Recuperación:** corresponde a proyector/reconciliador separado, nunca como efecto de consultar.

## 17. Eventos y efectos posteriores

Consultar no emite eventos, push, correo, notificaciones ni escrituras. Si se adopta B, los cambios
canónicos producen **outbox durable + revisión `DIRTY` en la misma transacción**. Triggers no son la
garantía primaria y el bus en memoria vigente queda descartado. Retry, leases, métricas,
reconciliación y retención pertenecen a IUX-02A.

La retención de 30 días queda adoptada exclusivamente para outbox procesado, items
inactivos/tombstones, manifests terminales y generaciones sustituidas. Una tarea vigente, su item
activo y su manifest necesario no expiran por antigüedad.

Son tres mecanismos separados: (1) writers/proyector actualizan el estado derivado ante cambios de
dominio; (2) el dashboard lo consulta sólo al entrar, regresar o por acción manual; y (3) el
reconciliador verifica y repara inconsistencias fuera de la consulta.

## 18. Plan de pruebas

| Nivel | Casos mínimos | Entorno | Evidencia futura |
| --- | --- | --- | --- |
| Dominio/semántica | Una tarea por recurso; identidad estable; información excluida | Unit | Matriz N20/N31 |
| Aplicación | Varios Grupos y ambos tipos; ownership+capability coincidentes | Unit | Conteo/deduplicación |
| Autorización | Auto-revisión, capability revocada, ex-Owner, Grupo ajeno | Unit/emulador | Permitidos/denegados |
| Estado | Solicitud cancelada/resuelta; Entrega resuelta por otro admin | Emulador | Ausencia en la consulta siguiente |
| Paginación | Más de 10, empates temporales, sin duplicados, total separado | Unit/frontend | Orden y páginas |
| Cursor | Cuenta/coverage/generación/orden correctos; alterado, cruzado de cuenta y generación sustituida | Unit/integración | Continuidad o rechazo explícito |
| Límites | Página 10/20, muchos contextos y items stale intercalados | Emulador | Cursor estable sin fuga |
| Fallos | Dependencia parcial, cambio de sesión y respuesta tardía | Integración/frontend | Datos descartados |
| Navegación | Deep-link exacto, ya resuelto, inexistente y sin acceso | E2E | Feedback y revalidación |
| No mutación | Antes/después de todas las colecciones | Emulador | Cero writes |
| Costo | Escenarios 3/20/100 contextos y 12/200/2.000 tareas | Emulador/perfilado | Lecturas, writes, tiempo, contención, payload |
| Proyección | Eventos de dos recursos en revisiones 1/2 procesados 2→1, duplicado, hueco, versión vieja, fan-out y resolución por otro admin | Unit/emulador | Sin salto de revisión ni `READY` prematuro; convergencia sin reactivación |
| Cadencia de pantalla | Entrada, regreso contextual y actualización manual; focus/paso del tiempo no consultan | Frontend/E2E | Tres disparadores permitidos; sin polling/listener |
| Revocación | Grant, Membresía, Temporada, Grupo y ownership futuro | Emulador/seguridad | Respuesta siguiente excluye lista y total antes de limpieza |
| Rebuild | Escrituras concurrentes, faltantes/sobrantes, cambio de esquema y switch | Emulador/operación | Generación verificada y rollback |

Gates futuros: baseline `quality:lint`, `quality:typecheck`, syntax Functions si aplica,
`quality:test`, emuladores focales, `quality:build`, `quality:diff`, UAT móvil/escritorio y presupuesto
de lectura aprobado.

## 19. Componentes actuales reutilizados

| Componente | Reutilización | Adaptación | Riesgo |
| --- | --- | --- | --- |
| N20 store/capabilities | Autoridad y validación | Exponer consulta componible | Alto costo por candidato |
| N31 reviewerAuthorization/listPending/getPending | Autorización y detalle | Separar contexto de escaneo | Filtrado post-query puede ocultar páginas si no avanza por documento crudo |
| `getGroupPaymentDelivery` | Deep-link N31 | Leer `deliveryId` desde URL | Ya resuelto/sin acceso |
| PendingGroupJoinRequestsSection | Destino N20 | Deep-link y lectura exacta | Falta get Owner por ID con presentación |
| IUX-01 PendingTasksSection | Presentación | Consumir DTO y estados | Acoplamiento prematuro |

## 20. Estructuras anteriores retiradas

| Estructura | Tratamiento | Condición de retiro |
| --- | --- | --- |
| Panel `AlertsPanel`/`pendingAlerts` en dashboard | No es fuente IUX-02 | Retirar consumidor sólo cuando IUX-01+IUX-02 pasen gates y cobertura real esté habilitada |
| Consultas de Torneos del dashboard | Retiro corresponde a IUX-01 | Independiente de la activación de N20/N31 |

No se borran `pendingAlerts`, productores, rutas ni funcionalidades fuera del dashboard.

## 21. Checkpoint y rollback

- **Commit inicial:** `c02f0afea067dcf4a757c68a9ef5bcd590682c24`.
- **Rama:** `dev`; esta ficha no crea ni cambia rama.
- **Rollback futuro:** deshabilitar el lector de proyección o volver al consumidor anterior mediante
  diff/configuración revisada; nunca modificar recursos originales. Las escrituras derivadas pueden
  detenerse y reconstruirse.
- **Datos de prueba:** únicamente fixtures/emulador, sin datos productivos ni persistencia ficticia.
- **Interrumpir si:** se requiere ampliar permisos, ocultar cobertura parcial, mutar al consultar,
  usar `pendingAlerts` o apartarse de la arquitectura adoptada. Un resultado de costo/rendimiento
  inviable obliga a revisar antes de habilitar, no a inventar otra solución silenciosamente.

## 22. Evidencia de cierre futura

- trazabilidad de D5-061, addendum adoptado y contrato final;
- medición de lecturas, latencia, memoria y payload en límites;
- pruebas N20/N31 y negativas de autorización;
- evidencia de total/paginación sin duplicados;
- evidencia de cero writes y respuestas tardías descartadas;
- deep-links y refresco post-destino;
- validación visual móvil/escritorio coordinada con IUX-01;
- gates de repositorio y aclaración de que E3 continúa con gates productivos pendientes.

## 23. Relación IUX-01 / IUX-02 y secuencia adoptada

1. Ejecutar IUX-02 como una sola ficha en dos cortes internos: IUX-02A (scope/outbox, productores,
   proyector, seguridad, backfill/reconciliación y health) e IUX-02B (consulta, contador contextual,
   deep-links e integración). No crear contratos o fichas duplicados.
2. Completar backfill y reconciliación, cubrir writers y revocaciones, y medir costo/lag antes de
   habilitar el lector.
3. Implementar en IUX-02B los deep-links exactos, consulta y estados terminales.
4. Integrar visualmente IUX-01 con respuesta real; validar carga, error, vacío, tres disparadores de
   consulta y cambio de sesión. Los fixtures controlados sirven sólo para revisión no productiva:
   nunca se publican datos ficticios ni un cero sin consulta real.
5. Retirar el consumidor anterior sólo con N20+N31 `READY`, seguridad verificada y smoke sin
   regresiones. No borrar `pendingAlerts` ni funcionalidades externas.
6. Habilitar IUX-01+IUX-02 coordinadamente tras revisión separada; no publicar datos ficticios ni
   cero durante una activación parcial.

La entrega coordinada está adoptada como orden de trabajo y condición de habilitación. No constituye
autorización de implementación, despliegue ni producción.

## 24. Decisiones adoptadas y gates pendientes

| ID | Decisión | Estado |
| --- | --- | --- |
| IUX-02-D01 | Adoptar B y descartar A como implementación | **Adoptada por D5-061** |
| IUX-02-D02 | Objetivos provisionales de proyección 30 s / 5 min / 24 h, sujetos a medición | **Adoptada por D5-061** |
| IUX-02-D03 | Retención de 30 días sólo para procesados/inactivos y generaciones sustituidas; nunca tareas vigentes | **Adoptada por D5-061** |
| IUX-02-D04 | Adoptar addendum a Documentos 2/3/4 y registrarlo en D5 | **Adoptada por D5-061** |
| IUX-02-D05 | Habilitación coordinada y retiro del consumidor legacy tras gates | **Adoptada por D5-061; ejecución pendiente** |
| IUX-02-D06 | Consulta al entrar, al regresar desde contexto y manual; sin polling/listener/focus | **Adoptada por D5-061** |

No quedan decisiones de diseño bloqueantes. Permanecen como evidencia futura las mediciones de
costo/rendimiento y, para habilitar, backfill, seguridad, UAT y gates técnicos. Obtener esas
mediciones forma parte de IUX-02A/B y no bloquea iniciar una implementación posteriormente autorizada.

## Declaración final

- **Estado final:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Implementación:** todavía no iniciada ni autorizada.
- **Gates pendientes para habilitar:** mediciones de presupuesto/rendimiento, backfill, seguridad,
  pruebas técnicas y UAT.
- **Deuda aceptada:** ninguna por esta ficha.
- **Responsable de aprobación:** pendiente.
- **Fecha de cierre:** no aplica.
