# E2-23 — Ficha de Incremento Implementable: archivo de Grupo / CU-014

## Estado

- **Incremento:** E2-23.
- **Caso de uso:** CU-014 — Archivar un Grupo.
- **Fecha de consolidación y revisión:** 2026-10-01.
- **Base examinada:** `dev == origin/dev == c9b857b327e2a2cbb5d10be52da9fa33dd18500d`.
- **Estado:** `CONSOLIDADA Y REVISADA — LISTA PARA VERSIONAR`.
- **Decisión funcional:** [addendum E2-23](../../arquitectura/Documento-2-addendum-E2-23-archivo-grupo.md).
- **Implementación:** no iniciada ni autorizada por esta ficha.
- **Plan:** E2-14 y Etapa 2 siguen abiertas; E3 permanece deshabilitada; Auth/UAT continúa aislada.

Esta ficha incorpora las decisiones expresamente aprobadas P1-A, P2-A, P3-A, P4-A, P5-A, P6-A
y P7-B. Autoriza definición documental, no código, deploy, cierre de etapa ni cambios comerciales.

## 1. Objetivo y resultado funcional

Permitir que el Owner vigente archive un Grupo activo cuando ya no exista actividad organizativa
abierta o pendiente. El archivo realiza únicamente la transición terminal de este incremento:

```text
activo --archiveOwnGroup--> archivado
```

El Grupo archivado conserva identidad, nombre, deporte, Owner, fecha de creación, información e
historia. Continúa consultable por el Owner y por las consultas históricas propias ya autorizadas,
pero desaparece del descubrimiento y de las superficies operativas. No admite mutaciones; sólo se
permite recuperar de forma idempotente el archivo ya confirmado con la misma intención.

No existe desarchivo en E2-23. RF-25 permite que una eventual reactivación sea considerada en el
futuro, pero requerirá decisión funcional, contrato e incremento propios.

## 2. Fuentes y precedencia

### 2.1 Norma vigente

| Fuente | Regla aplicada |
| --- | --- |
| [Documento 1](../../arquitectura/Documento-1-Arquitectura-del-Producto-y-Modelo-de-Dominio-6.5.pdf), §§3.4 y 6 | Grupo administra su ciclo organizativo; Temporada y Membresía conservan ciclos propios |
| [Documento 1.5](../../arquitectura/Documento-1.5-Modelo-Conceptual-del-Dominio-AUD-C03.pdf), §§2.5 y 2.8–2.10 | Un recurso tiene un Owner vigente; identidad e historia sobreviven a cambios administrativos; Membresía representa Persona–Grupo |
| [Documento 2](../../arquitectura/Documento-2-Modelo-Funcional-y-Casos-de-Uso-AUD-C04.pdf), PF-02, RF-12, RF-16, RF-23–25 y CU-011–CU-019 | Un Grupo con actividad o historia finaliza su ciclo mediante archivo/inactivación y no por borrado físico; Comercial no ejecuta la operación deportiva |
| [Addendum E2-23](../../arquitectura/Documento-2-addendum-E2-23-archivo-grupo.md) | Concreta actor, transición, precondiciones, visibilidad y no efectos de CU-014; prevalece prospectivamente para este caso |
| [Documento 3 AUD-C05](../../arquitectura/Documento-3-Arquitectura-Funcional-y-Dise-o-Tecnico-AUD-C05.pdf), Agregado Grupo y §§10–11 | Archivo modifica sólo Grupo; `GrupoArchivado` es un hecho de lifecycle, no una orden a otros Agregados |
| [Documento 4 AUD-C05](../../arquitectura/Documento-4-Dise-o-de-la-Arquitectura-de-Software-AUD-C05.pdf), §§2–7 y 10–13 | Grupo, Temporada, Membresía y Solicitud conservan Aggregate Roots, repositorios y unidades de consistencia separados |
| [Documento 5](../../transicion/Documento%205%20-%20Plan%20de%20Implementación%20y%20Transición%20Técnica-borrador.md), §§3, 5, 7.4 y D5-024/025/030/033–035/041 | Privacidad por defecto, autorización contextual, persistencia por caso, retiro por flujo, frontend y reglas explícitas antes de programar |

Las versiones AUD-C04 de Documentos 3 y 4 fueron contrastadas como antecedente. Prevalecen AUD-C05
y sus aclaraciones de Períodos de Vigencia. El addendum E2-23 complementa Documento 2 sin reescribir
los Documentos 1–5 ni cierres históricos.

### 2.2 Decisiones e incrementos relacionados

| Fuente | Relación preservada |
| --- | --- |
| [E2-14](./E2-14-informe-auditoria-consolidada-etapa-2.md) y [corrección CU-030](./E2-14-correccion-resolucion-CU-030.md) | CU-014 era un pendiente bloqueante; esta definición no cierra el hallazgo sin implementación y reevaluación |
| [E2-20 ficha](./E2-20-ficha-edicion-minima-grupo.md) y [cierre](./E2-20-cierre.md) | Renombrar modifica sólo `nombre` y sólo sobre Grupo activo; estado pertenece a CU-014 |
| [DEC-E2-21](./DEC-E2-21-propuesta-decision-funcional.md), [plan](./DEC-E2-21-propuesta-ajuste-documento-5.md) y [addendum](../../arquitectura/Documento-2-addendum-DEC-E2-21-diferimiento-CU-013.md) | CU-013 diferido no condiciona ni satisface CU-014; D5-041 no se extiende a E2-23 |
| [E2-15 ficha](./E2-15-ficha-cierre-temporada.md) y [cierre](./E2-15-cierre.md) | Cerrar Temporada exige cero Membresías activas, no finaliza Membresías y preserva Solicitudes; E2-23 exige resolverlas después por sus contratos |
| [E2-18](./E2-18-ficha-renovacion-intertemporada-membership.md) y [E2-19](./E2-19-ficha-historial-propio-grupos-memberships.md) | Membresía conserva lifecycle e historia; la historia propia compone contexto mínimo de Grupo sin adquirir acciones operativas |
| [E2-22A ficha](./E2-22-ficha-edicion-atributos-membresia.md), [addendum](../../arquitectura/Documento-2-addendum-E2-22A-cargo-descriptivo-membresia.md) y [cierre](./E2-22A-cierre.md) | Cargo sigue privado y editable sólo con Grupo activo, Membresía activa y Temporada abierta; E2-23 no amplía su visibilidad |
| E2-06 a E2-09 | Solicitud es independiente; crear, cancelar, rechazar, aprobar y coordinar conservan contratos propios |

## 3. Decisiones aprobadas y trazabilidad P/D

| Decisión | Contenido aprobado | Cierra |
| --- | --- | --- |
| P1-A | Única transición E2-23: `activo → archivado`; sin desarchivo; eventual reactivación futura separada | D01, D03 |
| P2-A | Sólo Owner vigente puede archivar | D02 |
| P3-A | Cero Temporadas abiertas, Membresías activas, active guards y coordinaciones capaces de activar; resolución previa por contratos existentes, sin cascadas | D04, D05 y parte operativa de D07 |
| P4-A | Cero Solicitudes pendientes y cero coordinaciones en curso | D06 |
| P5-A | Consultable por Owner e historia propia autorizada; oculto del descubrimiento; sin mutaciones salvo retry/recovery | D07, D08 |
| P6-A/T | No implementar ni habilitar transferencia de Grupo archivado | D11 |
| P6-A/L | Archivar no libera el límite provisional de creación | D10 |
| P6-A/E | CU-015 continúa independiente; archivo no habilita eliminación | Parte de D07 relativa a eliminación |
| P7-B | Grupo persiste `archivedAt`; actor sólo en receipt privado; no existe `archivedBy` en la raíz | D09 |

No quedan D01–D11 abiertas. P6 se separa deliberadamente en transferencia, límite provisional y
eliminación para que ninguna consecuencia se infiera de otra. La regla de cupo describe el límite
provisional E2 vigente: no constituye una política comercial definitiva ni modifica Plan/Suscripción.

## 4. Alcance incluido

- transición específica y terminal `activo → archivado`;
- preparación Owner-scoped con elegibilidad autoritativa;
- confirmación transaccional, idempotencia durable y recovery;
- schema canónico archivado y DTO Owner mínimo;
- listado/detalle Owner read-only de archivados;
- continuidad de Temporadas cerradas e información histórica mediante contratos existentes;
- ocultamiento de descubrimiento y retiro de acciones operativas;
- adaptación explícita de todos los consumidores canónicos que hoy suponen `activo`;
- frontend accesible, pruebas focales, regresión y UAT en el eventual incremento técnico.

## 5. Exclusiones y no efectos

E2-23 no:

- desarchiva o reactiva Grupos;
- edita nombre, deporte, Owner, configuración o cualquier otro atributo al archivar;
- cierra, reabre, edita o elimina Temporadas;
- finaliza, reactiva, renueva, edita o elimina Membresías o Períodos;
- cancela, rechaza, aprueba, migra o elimina Solicitudes;
- crea, consume o repara coordinaciones de otros flujos;
- implementa transferencia ni habilita el tombstone legacy correspondiente;
- libera cupo para crear otro Grupo;
- elimina Grupo, referencias, historia o receipts; CU-015 permanece pendiente;
- expone cargo u otros datos privados en historia o superficies nuevas;
- modifica Plan/Suscripción ni convierte un límite provisional en política comercial final;
- crea evento, trigger, proyección, job, migración masiva, backfill, TTL o reparación silenciosa;
- habilita escrituras cliente, deploy, Firebase remoto, E3 o integración de Auth/UAT.

## 6. Estado, precondiciones e invariantes

### 6.1 Máquina de estados

```text
activo + precondiciones satisfechas --archiveOwnGroup--> archivado
archivado + mismo receipt/intención --archiveOwnGroup--> EXISTING_IDEMPOTENT
archivado + otra intención --archiveOwnGroup--> GROUP_ALREADY_ARCHIVED
archivado --mutación operativa--> rechazo cerrado
archivado --desarchivo--> contrato inexistente en E2-23
```

`archivado` es un estado válido y terminal para los contratos de este incremento, no un alias de
ausencia, eliminación, `activo: false` legacy ni Temporada cerrada.

### 6.2 Precondiciones de confirmación

Dentro de la confirmación autoritativa deben cumplirse simultáneamente:

1. actor autenticado y Cuenta canónica compatible;
2. Grupo existente, schema activo compatible y `ownerId == auth.uid`;
3. token vigente para la misma raíz activa;
4. cero `openSeasonGuards` y cero Temporadas `abierta` del Grupo, con correlación íntegra;
5. cero raíces de Membresía `activa` y cero `activeMembershipGuards` del Grupo;
6. cero Solicitudes `pendiente` y cero `pendingGroupJoinRequestGuards` del Grupo;
7. cero `groupJoinRequestApprovalCoordinations` capaces de crear, reactivar o renovar Membresía;
8. artefactos consultados íntegros y compatibles.

Un estado correlacionado válido pero no vacío es bloqueo funcional. Una divergencia entre raíz y
guard, duplicados, referencias imposibles, schema desconocido o coordinación corrupta es
`GROUP_INCOMPATIBLE`, no un bloqueo que la UX pueda “resolver” automáticamente.

La UX explica cada bloqueo y enlaza/orienta hacia las operaciones ya existentes —finalizar
Membresías, cerrar Temporada, decidir Solicitudes— sin ejecutarlas ni encadenarlas. Las coordinaciones
en curso deben terminar mediante su recovery vigente antes de volver a preparar el archivo.

### 6.3 Invariantes

1. Sólo Grupo cambia en el commit funcional de archivo.
2. `groupId`, `nombre`, `deporte`, `ownerId` y `createdAt` permanecen invariantes.
3. `archivedAt` es timestamp UTC autoritativo del commit y existe sólo en Grupo archivado.
4. `archivedBy` no existe en Grupo; el actor se conserva exclusivamente en receipt privado.
5. Temporada, Membresía, Período y Solicitud mantienen sus Aggregate Roots y fuentes de verdad.
6. Receipt, token, guard, log y evento no son fuente del estado de Grupo.
7. Archivo no elimina ni altera información histórica o terminal.
8. Ningún estado inválido se corrige, adopta o reescribe al archivar.
9. Un eventual `GrupoArchivado` sólo describiría el hecho; E2-23 no requiere publicarlo ni permite
   que consumidores lo usen para cascadas.

## 7. Matriz cerrada de operaciones y visibilidad

| Superficie u operación | Grupo activo | Grupo archivado | Regla cerrada |
| --- | --- | --- | --- |
| Detalle Owner | Lectura y acciones vigentes | Lectura read-only, estado y `archivedAt` visibles | Autorización Owner y no enumeración |
| Listado de Grupos propios | Incluido como operativo | Incluido en sección/filtro “Archivados” | No desaparece de administración |
| Dashboard operativo | Incluido | Excluido de acciones y conteos operativos; acceso read-only desde archivados | No aparenta capacidad vigente |
| Descubrimiento, preview de ingreso y API pública | Según contrato vigente | Oculto/no disponible | P5-A y privacidad por defecto |
| Historia propia por Membresía | Disponible | Disponible sin acciones nuevas | Conserva DTO y privacidad existentes; no agrega cargo ni estado interno de Grupo salvo necesidad ya autorizada |
| Información Owner de Temporadas | Apertura/edición/cierre e historia según estado | Sólo consulta de Temporadas cerradas e historia ya disponible | No puede existir Temporada abierta al archivar |
| Resultados terminales de Solicitud | Consulta según autorización vigente | Consulta preservada según el mismo contrato y minimización | No permite crear, decidir ni recuperar coordinación activa |
| Editar nombre | Permitido por E2-20 | Bloqueado | Archivo vuelve read-only al Grupo |
| Archivar | Permitido si es elegible | Sólo recovery con mismo receipt; otra intención devuelve ya archivado | Sin toggle |
| Desarchivar | No aplica | Sin contrato | Incremento futuro requerido |
| Abrir/editar/cerrar Temporada | Según contratos vigentes | Bloqueado | Las cerradas siguen consultables |
| Crear/reactivar/renovar/finalizar/editar Membresía | Según contratos vigentes | Bloqueado | Deben quedar resueltas antes del archivo |
| Editar o consultar cargo administrativo | Según E2-22A | Mutación bloqueada; no se amplía visibilidad histórica | Cargo no se agrega a nuevas proyecciones |
| Crear/cancelar/rechazar/aprobar Solicitud | Según contratos vigentes | Bloqueado | No quedan pendientes al archivar; terminales sólo lectura autorizada |
| Transferir ownership | Sin contrato canónico actual | No implementado ni habilitado | Tombstone legacy permanece |
| Crear otro Grupo | Límite provisional vigente | El archivado sigue contando | No es política comercial definitiva |
| Eliminar Grupo | CU-015 pendiente | CU-015 pendiente | Archivo no concede eliminabilidad |

Las consultas Owner de información conservada incluyen el propio detalle de Grupo, sus Temporadas
cerradas mediante `listSeasonsForOwnedGroup` y los datos históricos/terminales que los contratos
existentes ya autorizan. No se crea una API histórica general ni se amplían campos privados.

## 8. Schema, DTO y persistencia mínima

### 8.1 Schemas cerrados de Grupo

Schema activo v1, sin cambios:

```text
nombre
deporte
ownerId
estado: "activo"
createdAt
schemaVersion: 1
```

Schema archivado v2 exacto:

```text
nombre
deporte
ownerId
estado: "archivado"
createdAt
archivedAt
schemaVersion: 2
```

La transición actualiza exclusivamente `estado`, agrega `archivedAt` y fija `schemaVersion: 2` en el
mismo commit que crea el receipt. No reemplaza el documento completo. No agrega `archivedBy`,
`updatedAt`, motivo, flags, arrays, configuración ni snapshot de otros Agregados.

No hay migración ni backfill: los activos continúan v1 hasta ser archivados. El hydrator admite sólo
las dos formas exactas y rechaza extras, campos condicionales ausentes, `archivedAt` en v1,
`archivedBy` en cualquier versión y estados/versiones cruzados.

### 8.2 DTOs

- `OwnGroup` pasa a una unión discriminada:
  - activo: campos vigentes y sin `archivedAt`;
  - archivado: mismos campos públicos Owner, `estado: "archivado"` y `archivedAt` ISO-8601 UTC.
- `DashboardGroup` continúa representando sólo activos; no recibe campos opcionales ambiguos.
- la sección Owner de archivados usa la proyección Owner, no documentos Firestore.
- DTOs públicos/candidatos excluyen archivados.
- DTOs históricos existentes conservan su minimización. E2-23 no agrega `ownerUserId`, actor,
  `archivedAt`, cargo, receipt, schema ni IDs internos donde hoy no existen.

### 8.3 Receipt y retención

Colección técnica propuesta: `groupArchiveReceipts`, deny-all por Rules. Documento exacto:

```text
action: "ARCHIVE_GROUP"
actorUserId
groupId
requestHash
appliedState: "archivado"
archivedAt
outcome: "ARCHIVED"
receiptVersion: 1
```

El ID es SHA-256 length-prefixed de namespace + actor + idempotency key; la key cruda no se persiste.
El receipt se crea sólo junto con una transición aplicada. Se retiene indefinidamente porque es la
evidencia durable necesaria para recovery estable. Un TTL, archivo o eliminación futura de receipts
requerirá decisión adicional coordinada con CU-015 y con la garantía de idempotencia; esa política
futura no bloquea E2-23 y no se anticipa aquí.

## 9. Contratos cerrados

### 9.1 `prepareOwnGroupArchive`

Payload exacto:

```text
{ groupId }
```

Respuesta exitosa para Grupo activo propio:

```text
{
  group: OwnGroupActive,
  archiveToken,
  eligibility:
    { status: "ELIGIBLE", blockers: [] }
    | { status: "BLOCKED", blockers: [<bloqueo funcional>, ...] }
}
```

La preparación reautoriza, valida integridad y evalúa las mismas categorías que la confirmación. No
expone IDs, cantidades, nombres de terceros ni documentos bloqueantes. `blockers` es un conjunto
ordenado, sin duplicados, del enum cerrado `ACTIVE_MEMBERSHIPS_EXIST`, `OPEN_SEASON_EXISTS`,
`PENDING_REQUESTS_EXIST`, `APPROVAL_IN_PROGRESS`; permite explicar todos los pasos previos sin
ejecutarlos. No escribe y no crea/consume idempotency key. Un Grupo archivado devuelve
`GROUP_ALREADY_ARCHIVED`; uno inexistente o ajeno converge en `GROUP_NOT_ACCESSIBLE`.

### 9.2 Token

`archiveToken` es un SHA-256 hexadecimal length-prefixed bajo
`sportexa:E2-23:group-archive-token:v1` y liga, en orden:

1. `contract-v1`;
2. `groupId`;
3. `ownerId`;
4. `nombre`;
5. `deporte`;
6. `estado` (`activo`);
7. `schemaVersion` (`1`);
8. representación canónica de `createdAt`.

El token protege el contexto mostrado y se invalida por rename, transferencia futura, cambio de
estado, schema o sustitución de raíz. No codifica la ausencia de otros Agregados: todos los bloqueos
se releen en confirmación. No se reutiliza `editToken` de E2-20.

`idempotencyKey` usa el patrón cerrado vigente `[A-Za-z0-9._:-]{16,128}` y nunca se persiste en
claro. `expectedArchiveToken` admite exactamente 64 caracteres hexadecimales minúsculos. El
`requestHash` del receipt es SHA-256 length-prefixed bajo
`sportexa:E2-23:group-archive-request:v1` y liga `contract-v1`, actor, `groupId`, token esperado e
idempotency key. El `receiptId` usa el namespace independiente
`sportexa:E2-23:group-archive-receipt:v1`, actor e idempotency key.

### 9.3 `archiveOwnGroup`

Payload exacto:

```text
{
  groupId,
  expectedArchiveToken,
  idempotencyKey
}
```

Resultado al aplicar o recuperar la misma intención:

```text
{
  outcome: "ARCHIVED" | "EXISTING_IDEMPOTENT",
  recovered: boolean,
  appliedEffect: { outcome: "ARCHIVED", archivedAt },
  currentGroup: OwnGroupArchived
}
```

El cliente no aporta estado, timestamp, actor, motivo, patch ni field mask. `appliedEffect` describe
el commit histórico ligado al receipt; `currentGroup` describe la raíz actual. E2-23 no posee una
transición posterior, pero la separación evita convertir el receipt en fuente de estado y mantiene
el patrón seguro ante futuras decisiones.

### 9.4 Resultados, escrituras e idempotency key

| Situación | Resultado/error | Escrituras de este intento | Efecto sobre la key presentada |
| --- | --- | ---: | --- |
| Activo elegible, token vigente, key nueva | `ARCHIVED` | Grupo v2 + receipt, atómicos | Consumida por el receipt |
| Mismo actor, key y request con receipt íntegro | `EXISTING_IDEMPOTENT` | 0 | Ya estaba consumida; se recupera |
| Misma key con request distinto | `IDEMPOTENCY_CONFLICT` | 0 | Ya estaba consumida por la intención original |
| Grupo archivado sin receipt coincidente | `GROUP_ALREADY_ARCHIVED` | 0 | No consumida por este intento |
| Token no coincide sobre Grupo aún activo | `STALE_ARCHIVE` | 0 | No consumida |
| Temporada abierta | `OPEN_SEASON_EXISTS` | 0 | No consumida |
| Membresía/active guard válido presente | `ACTIVE_MEMBERSHIPS_EXIST` | 0 | No consumida |
| Solicitud/pending guard válido presente | `PENDING_REQUESTS_EXIST` | 0 | No consumida |
| Coordinación válida presente | `APPROVAL_IN_PROGRESS` | 0 | No consumida |
| Inexistente/ajeno | `GROUP_NOT_ACCESSIBLE` | 0 | No consumida |
| Schema, guard, raíz o correlación inválidos | `GROUP_INCOMPATIBLE` | 0 | No consumida |
| Payload/token/key inválidos | `VALIDATION_FAILED` | 0 | No consumida |
| Sin autenticación o Cuenta compatible | `UNAUTHENTICATED` / `ACCOUNT_REQUIRED` | 0 | No consumida |
| Contención transaccional agotada | `CONFLICT` | 0 confirmado por la operación | No consumida salvo que recovery encuentre receipt |
| Dependencia transitoria | `DEPENDENCY_UNAVAILABLE` | 0 confirmado por la operación | No consumida salvo que recovery encuentre receipt |
| Fallo interno sin receipt recuperable | `INTERNAL_ERROR` | 0 confirmado | No consumida; se reintenta la misma intención antes de reemplazarla |

No existe `NO_CHANGES`: activo→archivado aplica; archivado con la misma intención recupera; archivado
por otra intención se distingue expresamente. Errores no confirmados no crean receipt ni reservan la
key. Ante respuesta incierta, el cliente reintenta exactamente la misma intención antes de generar otra.

Mapeo público: validación usa `invalid-argument`; no accesible usa `permission-denied`; Cuenta,
bloqueos, ya archivado e incompatible usan `failed-precondition`; stale, conflicto e idempotency
conflict usan `aborted`; dependencia usa `unavailable`; fallos no clasificados usan `internal`.

### 9.5 Autorización de recovery y privacidad

Recovery primero relee Cuenta y Grupo, valida schema archivado y exige que el actor siga siendo el
Owner vigente. Sólo entonces lee/devuelve el receipt privado. Si ya no es Owner, responde
`GROUP_NOT_ACCESSIBLE` aunque la persona haya sido quien archivó. El actor del receipt nunca aparece
en DTO, historia propia, UI pública ni errores.

## 10. Concurrencia y punto de serialización

### 10.1 Regla

La confirmación se ejecuta en una transacción Firestore que:

1. lee Cuenta y `groups/{groupId}`;
2. busca/hidrata el receipt de la key;
3. valida ownership, schema, token y estado;
4. lee y valida los controles/consultas de Temporada, Membresía, Solicitud y coordinación;
5. actualiza Grupo y crea receipt en el mismo commit.

El documento Grupo es el punto común de serialización: archivo lo escribe y toda operación
contrapuesta capaz de abrir Temporada, crear/reactivar/renovar/modificar Membresía, crear/decidir
Solicitud o iniciar/asistir coordinación debe leer el mismo documento dentro de su transacción y
exigir explícitamente `estado === "activo"`. Si la operación contrapuesta gana, el retry de archivo
observa el bloqueo; si archivo gana, la otra transacción reintenta, observa `archivado` y falla sin
escribir.

### 10.2 Consultas vacías y guards existentes

No se adopta la afirmación absoluta de que toda consulta vacía necesita un guard determinista nuevo.
Una consulta transaccional vacía, por sí sola, no se usa como única barrera contra inserciones
contrapuestas. La serialización se demuestra mediante la lectura común de Grupo y su escritura por
archivo, complementada por controles vigentes:

- `openSeasonGuards/{groupId}` serializa la única Temporada abierta;
- `activeMembershipGuards` y la query de raíces activas verifican ausencia e integridad;
- `pendingGroupJoinRequestGuards` y la query de pendientes verifican ausencia e integridad;
- `groupJoinRequestApprovalCoordinations` detecta procesos capaces de activar Membresía;
- todos sus writers contrapuestos deben releer Grupo activo dentro de la misma transacción.

No se agrega un guard global, lock, Saga o infraestructura nueva mientras esta demostración sea
válida. Si la implementación descubre un writer capaz de confirmar sin leer Grupo dentro de su
transacción, debe corregirse ese writer dentro del flujo afectado o justificar una coordinación mínima;
no puede aprobarse con una carrera conocida ni inventar una unidad multi-Agregado.

### 10.3 Matriz de carreras

| Carrera | Resultado obligatorio |
| --- | --- |
| Archivo vs rename E2-20 | Rename primero invalida token; archivo primero hace que rename falle por estado; nunca se sobrescriben campos |
| Archivo vs archivo, misma key | Una transición y recovery `EXISTING_IDEMPOTENT` |
| Archivo vs archivo, keys distintas | Un ganador; el otro recibe `GROUP_ALREADY_ARCHIVED` |
| Archivo vs cambio futuro de Owner | Sólo Owner al commit; token ligado a Owner; transferencia archivada no se habilita |
| Archivo vs apertura de Temporada | Un orden por lectura común de Grupo y guard; nunca Grupo archivado con apertura confirmada concurrente |
| Archivo vs lifecycle/cargo de Membresía | Un orden por lectura común de Grupo; archivo no modifica la Membresía |
| Archivo vs creación/decisión de Solicitud | Un orden por lectura común de Grupo; coordinación existente bloquea archivo |
| Finalización/cierre/rechazo previo vs archivo | La operación previa confirma primero; un nuevo prepare/token permite reintentar archivo |
| Respuesta perdida después del commit | Misma key recupera receipt sin reescribir y con reautorización |

## 11. Inventario técnico exhaustivo

Admitir v2 archivado exige revisar cada consumidor; ampliar `hydrateGroup` sin guards explícitos
habilitaría operaciones accidentalmente.

### 11.1 Dominio, aplicación, infraestructura y exports de Grupo

- `groups/domain/group.js`: schemas v1/v2, estados, `archiveGroup` y validación de `archivedAt`.
- `groupContract.js`, `groupDto.js`, `groupErrors.js`, `groupHashing.js`, `groupService.js` y
  `groupCallable.js`: contratos, unión DTO, errores, token/hashes, preparación/confirmación y mapeo.
- `firestoreGroupRepository.js`: hidratación de ambas versiones y update exclusivo de tres field paths.
- `firestoreOwnGroupsReader.js`: todos los propios para administración; sólo activos para dashboard;
  `hasAnyByOwner` sigue contando v1/v2.
- `firestoreGroupCreationGuard.js`: límite provisional no ignora archivados.
- `firestoreGroupNameUpdateStore.js`: relectura transaccional y rechazo explícito de v2.
- nuevo store y hydrator de `groupArchiveReceipts` con schema cerrado.
- `groupModule.js`, callables nuevas y `functions/index.js`: wiring/export sin tocar tombstones.
- `firestoreMemberContext.js` y `memberContextModule.js`: sólo activo para contexto operativo.
- `ownMembershipHistoryContextCapability.js`: admite v2 únicamente como composición histórica mínima.

Un retry de rename ya confirmado puede conservar el recovery histórico que E2-20 autoriza, siempre
que reautorice al Owner, no escriba y separe el efecto aplicado del Grupo archivado actual. Una nueva
edición, un no-op preparado o una intención sin receipt se rechazan por estado.

### 11.2 Temporada dentro del Módulo Grupos

- `firestoreOpenSeasonGuard.js`: abrir exige v1 activo dentro de transacción.
- `firestoreOpenSeasonReader.js`: lectura operativa exige activo; no se usa para historia archivada.
- `firestoreSeasonUpdateStore.js` y `firestoreSeasonClosureStore.js`: exigen activo explícito.
- `firestoreSeasonHistoryReader.js`: permite Owner vigente sobre v1/v2 y sólo expone proyección
  histórica; un v2 con Temporada abierta es incompatible.
- `seasonService.js`, `seasonDto.js`, `seasonModule.js` y callables de apertura, edición, cierre,
  consulta vigente e historial: enrutan correctamente operativo versus histórico.
- `groupJoinRequestSeasonCapability.js`: no ofrece contexto abierto para v2; conserva lectura cerrada
  mínima sólo donde un resultado terminal ya autorizado la necesite.

### 11.3 Capabilities públicas de Grupo

- `groupJoinRequestGroupCapability.js`: candidata/creación/decisión exigen activo; lectura terminal
  Owner autorizada debe separarse de capacidad operativa, sin reutilizar `available`.
- `groupRosterContextCapability.js`: roster y cargo requieren activo y Temporada abierta.
- `administrativeMembershipFinalizationContextCapability.js`: finalización requiere activo.
- `ownMembershipHistoryContextCapability.js`: historia propia acepta activo/archivado y no concede
  acciones ni datos Owner.

Los estados públicos deben distinguir `active`, `archived`, `not_available`, `not_accessible` e
`incompatible` sólo cuando el consumidor necesita esa distinción. Candidatas y actores ajenos no
reciben un oracle de archivo.

### 11.4 Membresía

- `firestoreActiveMembershipGuard.js` y `groupJoinRequestMembershipCapability.js`: altas,
  reactivaciones y renovaciones exigen Grupo activo dentro de transacción.
- `firestoreMembershipSelfExitStore.js`, `firestoreMembershipAdministrativeFinalizationStore.js` y
  `firestoreMembershipCargoStore.js`: finalización/salida/cargo exigen activo explícito.
- `firestoreMembershipLifecycleGuard.js`: conserva integridad; no se borra ni transforma al archivar.
- `membershipExternalContexts.js`, `membershipModule.js` y capacidades de contexto: no tratan v2
  válido como corrupción, pero lo rechazan para mutación.
- `firestoreMyMembershipReader.js`, `firestoreMyCurrentGroupMembershipsReader.js` y
  `firestoreActiveGroupMembersForOwnerReader.js`: superficies operativas excluyen archivados.
- `firestoreOwnGroupMembershipHistoryReader.js`: compone v2 como historia mínima sin ampliar cargo,
  Owner, actor, schema o IDs internos.

Un receipt de cargo ya confirmado conserva únicamente el recovery histórico read-only previsto por
E2-22A si el contrato puede reautorizar ownership sobre v2. No habilita una edición nueva, no expone
el cargo en otras superficies y no escribe sobre la Membresía.

### 11.5 Solicitud

- `firestoreGroupJoinRequestStore.js`: preview/create/approve/reject/listado pendiente e inicio/asistencia
  de coordinación exigen Grupo activo dentro de sus transacciones.
- `firestoreGroupJoinRequestRepository.js`: queries de pendiente se usan para elegibilidad sin mutar.
- `groupJoinRequestGroupCapability.js`, `groupJoinRequestSeasonCapability.js` y
  `groupJoinRequestMembershipCapability.js`: separan operación activa de consulta terminal.
- `getGroupJoinRequestDecisionResult`: preserva resultados terminales autorizados sobre archivado,
  con la misma autenticación/minimización; no recupera una coordinación en curso porque P4 exige cero.
- guards, intents y coordinaciones permanecen deny-all y no son historia de Grupo.

### 11.6 Rules, API y legacy

- `firestore.rules`: `groups` y `groupArchiveReceipts` continúan sin escritura cliente; receipt es
  deny-all. La condición legacy actual `schemaVersion != 1` deja de ser segura porque v2 será
  canónico: debe excluir explícitamente schemas canónicos v1/v2 o usar un discriminador legacy
  comprobable, sin abrir get/list de v2 a app admin, integrantes o consultas generales.
- Rules de Temporadas, Membresías, Períodos, Solicitudes, guards, intents y receipts siguen deny-all.
- `httpApi.js` y rutas públicas de Grupo deben excluir v1/v2 canónicos y no considerar v2 como
  documento público legacy.
- consumidores legacy de partidos/torneos que usan `activo`, `memberIds`, `adminIds` o documento
  completo no reciben autoridad sobre v2 y deben fallar cerrado.
- `toggleGroupActivo`, `editGroup` y `transferGroupOwnership` permanecen tombstones con
  `LEGACY_GROUP_CAPABILITY_RETIRED`.

### 11.7 Frontend

- `OwnGroup.ts`: unión discriminada v1/v2 y tipo separado para dashboard activo.
- `groupsService.ts`: preparación, confirmación, resultados y mensajes de bloqueo/error.
- dashboard, listado y detalle Owner: sección archivados, badge/fecha, modo read-only y navegación.
- `EditGroupNameDialog`, Temporadas, roster, Solicitudes y cargo: acciones ausentes/bloqueadas en v2;
  pérdida de ownership retira todo el detalle y navega fuera sin enumerar.
- páginas públicas, join/candidate y listados de pertenencias operativas: v2 oculto.
- historia propia y Temporadas cerradas: preservan contratos y privacidad actuales.
- confirmación accesible: explica que E2-23 no ofrece desarchivo, sus precondiciones y cero cascadas,
  single-flight, foco, teclado, `aria-live`, móvil y zoom.

### 11.8 Índices

No se aprueba un índice especulativo. Las queries concretas de elegibilidad por `groupId + estado` y
coordinaciones por `groupId` deben contrastarse con `firestore.indexes.json`; se agrega sólo el índice
mínimo que Emulator/plan de query demuestre necesario. El listado Owner puede consultar por
`ownerId` y separar estados en backend/UI sin alterar el límite provisional.

## 12. Autorización, privacidad y no enumeración

- sólo `groups/{groupId}.ownerId == auth.uid` dentro de confirmación autoriza;
- Owner no necesita Persona ni Membresía propia;
- Administrador, integrante, cargo, permiso no implementado, rol global, app admin, array legacy,
  Plan, Suscripción o conocimiento del ID no autorizan;
- inexistente y ajeno convergen en `GROUP_NOT_ACCESSIBLE`;
- `GROUP_ALREADY_ARCHIVED` sólo se devuelve después de acreditar ownership actual;
- bloqueos no revelan sujetos, IDs ni cantidades;
- actor, receipt, hashes, guards y detalles de corrupción no salen del backend;
- cargo continúa únicamente en superficies E2-22A Owner-scoped vigentes; archivo no lo incorpora a
  detalle de Grupo, historia propia, Solicitud ni API pública;
- consultas históricas preservadas revalidan su autorización en cada llamada/página.

## 13. Criterios de aceptación y pruebas

### 13.1 Dominio, schema y contratos

1. v1 activo y v2 archivado hidratan sólo con campos exactos.
2. `archiveGroup` preserva campos invariantes y fija estado/schema/timestamp aprobados.
3. No existe desarchivo, toggle, PATCH, `archivedBy` ni estado adicional.
4. Payloads cerrados rechazan extras y valores elegidos por cliente.
5. token, receipt ID y request hash son deterministas, namespaced y length-prefixed.
6. DTOs cumplen presencia condicional y no filtran metadata privada.
7. Todos los resultados de §9.4 acreditan cero escrituras/consumo según la matriz.

### 13.2 Unitarias y arquitectura

- transición, invariantes, timestamps y combinaciones versión/estado inválidas;
- autorización, no enumeración, taxonomía de error y recovery reautorizado;
- cada writer operativo valida explícitamente Grupo activo después de admitir v2;
- readers históricos admiten v2 sin conceder acciones;
- Rules no clasifican v2 como legacy y receipt permanece deny-all;
- ausencia de cascadas, trigger, evento obligatorio, PATCH, migración o repositorio cruzado;
- tombstones legacy intactos;
- retención de receipt y separación applied/current verificables;
- análisis estático del punto común de serialización en writers contrapuestos.

### 13.3 Emulator focal eventual

- archivo exitoso: sólo tres field paths de Grupo y un receipt; cero cambios en otros Agregados;
- Cuenta ausente, ajeno/inexistente, schema incompatible y token stale;
- cada bloqueo funcional y cada inconsistencia de guard/query;
- carreras de §10.3, incluidas inserciones contrapuestas desde otra Persona;
- mismo retry, otra key sobre archivado, key conflictiva y respuesta perdida;
- consultas Owner e históricas permitidas; descubrimiento y mutaciones bloqueados;
- Rules de v1/v2, legacy y receipts;
- inspección persistente antes/después de Grupo, Temporadas, Membresías, Períodos, Solicitudes,
  guards, intents, coordinaciones y receipts.

### 13.4 Regresión

- creación/listado/detalle y rename E2-01/E2-20;
- apertura, edición, cierre e historia de Temporada E2-02/E2-15–17;
- alta, salida, finalización, reactivación, renovación, roster, cargo e historia de Membresía;
- creación, cancelación, rechazo, aprobación y recovery de Solicitud;
- contratos públicos/legacy allowlisted sin exposición de v2;
- lint sin regresión, typecheck, sintaxis, build y suites focales/proporcionales cuando se autorice
  implementación. Esta consolidación documental no las ejecuta.

### 13.5 UAT eventual

1. Owner de Grupo elegible prepara y confirma; ve badge “Archivado” y `archivedAt`.
2. Cada bloqueo explica la operación previa existente sin ejecutarla.
3. Después de resolver Membresías, Temporada y Solicitudes, una preparación nueva resulta elegible.
4. Archivado aparece read-only al Owner y no en dashboard operativo/descubrimiento/join.
5. Temporadas cerradas, historia propia y resultados terminales autorizados siguen consultables.
6. Cargo y demás datos privados no aparecen en superficies nuevas.
7. Rename concurrente produce stale; archivo concurrente produce una transición; pérdida de ownership
   retira acceso.
8. Retry con misma intención recupera; otra intención recibe ya archivado; no hay doble receipt.
9. Teclado, foco, `aria-live`, `aria-busy`, single-flight, móvil y zoom.
10. Inspección persistente confirma cero cascadas y schema/receipt exactos.

## 14. Revisión adversarial documental

| Eje | Resultado |
| --- | --- |
| Coherencia normativa | Aprobada: CU-014 preserva historia y sólo modifica Grupo; addendum concreta vacíos sin contradecir Documentos 1–5 |
| Procesos sin salida | Aprobada: archivo exige resolver previamente toda actividad mediante contratos existentes; no congela Temporada, Membresía o Solicitud |
| E2-20 | Aprobada: rename sólo activo; token propio; carrera serializada; no se restauran nombres |
| E2-22A/lifecycle | Aprobada: cargo y lifecycle se resuelven antes; archivo no edita ni expone Membresía |
| Autorización/privacidad | Aprobada: Owner vigente, no enumeración, receipt privado, descubrimiento oculto e historia mínima |
| Concurrencia | Aprobada documentalmente: Grupo es punto común; guards existentes apoyan integridad; no se introduce lock especulativo |
| Contratos | Aprobada: preparación/confirmación específicas, resultados diferenciados y matriz de cero escrituras/keys comprobable |
| Persistencia | Aprobada: v2 mínimo, `archivedAt` sin actor, receipt estrictamente necesario, sin backfill |
| Alcance | Aprobada: transferencia, cupo comercial definitivo, eliminación, desarchivo y cascadas quedan fuera |

Correcciones incorporadas durante la revisión:

1. se reemplazó la regla absoluta sobre consultas vacías por una demostración concreta de
   serialización mediante lectura común de Grupo y controles existentes;
2. se identificó y cerró el riesgo de que Rules trate schema v2 canónico como legacy por usar
   `schemaVersion != 1`;
3. se separaron explícitamente las tres consecuencias de P6;
4. se distinguieron retry con receipt, archivo por otra intención, stale, bloqueo e incompatibilidad;
5. se fijó cero escritura y consumo/no consumo de key para cada resultado;
6. se preservaron lecturas Owner de Temporadas cerradas e historia sin ampliar cargo ni datos privados.

No se identifican decisiones funcionales adicionales bloqueantes. La retención futura distinta de
indefinida y una eventual reactivación, transferencia, eliminación o política comercial definitiva
requieren decisiones futuras, pero no forman parte de E2-23.

## 15. Riesgos y controles

1. **Habilitación accidental al ampliar hydrator:** pruebas arquitectónicas exigen estado activo en
   cada writer y separan readers históricos.
2. **Exposición por Rules legacy:** v2 debe excluirse expresamente de toda regla `schemaVersion != 1`.
3. **Carrera con nuevos recursos:** toda operación contrapuesta relee Grupo en su transacción; pruebas
   concurrentes demuestran ambos órdenes.
4. **Corrupción presentada como bloqueo:** correlaciones inválidas devuelven incompatible y nunca se
   reparan desde E2-23.
5. **Historia convertida en operación:** DTOs históricos permanecen mínimos y sin acciones.
6. **Cupo interpretado como política final:** documentación y UX lo nombran límite provisional E2.
7. **Receipt sin retención suficiente:** conservación indefinida hasta decisión que preserve recovery.
8. **Confusión con CU-015:** ninguna eliminación, tombstone de ausencia o limpieza se incorpora.

## 16. Definición de terminado del futuro incremento técnico

E2-23 podrá cerrarse técnicamente sólo cuando:

- ficha y addendum estén versionados antes del código;
- dominio, contratos, persistencia, Rules, frontend y consumidores cumplan esta definición;
- la auditoría demuestre cero cascadas y punto de serialización completo;
- pruebas unitarias, arquitectura, Emulator focal, regresión y gates proporcionales aprueben;
- UAT e inspección persistente registren evidencia honesta;
- informe y cierre posteriores documenten SHA, límites y ausencia de deploy si correspondiera.

Ese cierre futuro no cerrará automáticamente E2-14 o Etapa 2, no resolverá CU-015, no ampliará
CU-026 y no habilitará E3.

## 17. Veredicto

Las decisiones P1-A a P7-B cierran la semántica necesaria, la revisión adversarial no identifica
otra decisión funcional bloqueante y el diseño queda listo para versionado documental. No se
implementó código ni se ejecutaron pruebas o acceso remoto.

`E2-23 CONSOLIDADO Y REVISADO — LISTO PARA VERSIONAR`
