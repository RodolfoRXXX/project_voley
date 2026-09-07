# Ficha de Incremento Implementable E2-07 — Decisión de Solicitud de ingreso y coordinación con Membresía

## Estado de la ficha

- **Estado:** `LISTA PARA VERSIONAR`.
- **Fecha de definición:** 2026-09-07.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Corte aprobado:** decisión owner-scoped de Solicitudes de ingreso y coordinación recuperable de la aprobación con Membresía.
- **Fuentes de verdad:** Solicitud para la decisión; Membresía para el vínculo Persona–Grupo.
- **Actor:** Owner vigente del Grupo.
- **Casos de uso atendidos:** CU-032 — aprobar Solicitud; CU-033 — rechazar Solicitud; consulta mínima del resultado.
- **Checkpoint documental:** rama `dev`, HEAD y `origin/dev` en `2aaa2500bd746769b30c189f9237688bc4d34ba9`, sin cambios al iniciar.
- **Archivo único autorizado:** `docs/implementacion/etapa-2/E2-07-ficha-decision-solicitud-ingreso.md`.

Esta ficha define exclusivamente E2-07. No implementa código, no autoriza una rama de implementación y no modifica reglas, índices, dependencias, lockfiles, documentos anteriores ni Firebase remoto. Una implementación posterior requiere autorización expresa.

## 1. Objetivo y alcance

Permitir al Owner vigente de un Grupo:

1. listar sus Solicitudes pendientes;
2. aprobar una Solicitud pendiente;
3. rechazar una Solicitud pendiente;
4. consultar un resultado autoritativo y estable;
5. crear o recuperar, como efecto de una aprobación, la única Membresía correspondiente;
6. reintentar después de concurrencia, fallo parcial o respuesta perdida sin duplicar decisiones ni Membresías.

El incremento completa el circuito mínimo iniciado por E2-06. El listado ya integrado se conserva y evoluciona sólo para exponer si una aprobación está en coordinación. No se declara una Solicitud `aprobada` hasta que Membresías haya confirmado una Membresía correlacionada.

### 1.1 Resultado observable

- Una decisión de rechazo queda confirmada en un único commit de Solicitud.
- Una aprobación se coordina en fases recuperables y termina con una única Solicitud `aprobada` referenciando una única Membresía.
- Una respuesta perdida se resuelve mediante reconsulta o retry; nunca mediante éxito optimista.
- Una Solicitud `cancelada` o `rechazada` nunca origina Membresía.
- Ante corrupción o estado parcial no demostrable, el sistema falla cerrado y conserva evidencia.

## 2. Exclusiones

Quedan fuera de E2-07:

- creación, edición, búsqueda o reclamación de Personas;
- invitaciones y solicitudes administrativas;
- motivos o comentarios de aprobación y rechazo;
- notificaciones, email, Actividad o auditoría de producto adicional;
- pagos, Plan, Suscripción o habilitación comercial;
- roles deportivos, cargo, permisos, posición o dorsal;
- baja, finalización, reactivación o renovación de Membresía;
- cierre, reapertura, edición o historial de Temporadas;
- edición, archivo, eliminación o transferencia de Grupo;
- migración, lectura o escritura de arrays legacy;
- directorio público de Grupos o exposición de Personas;
- reparación automática, adopción de Membresías ajenas a esta aprobación o borrado de corrupción;
- jobs periódicos, colas, TTL o cleanup de intents;
- cualquier capacidad sucesora de E2-08 o posterior que no sea necesaria para decidir y coordinar este flujo mínimo;
- transacción global entre Solicitud y Membresía;
- deploy, Firebase remoto y datos reales.

## 3. Fundamentos y decisiones vinculantes

### 3.1 Fuentes

- E2-03 materializó Membresía como vínculo Persona–Grupo, con Temporada abierta obligatoria, unicidad activa y guard propio.
- E2-04 consolidó modelos de lectura sin convertir Grupo ni arrays en autoridad.
- E2-05 agregó el estado `finalizada` y el lifecycle guard; una nueva alta sobre ese par requiere el caso de reactivación todavía no implementado.
- E2-06 materializó Solicitud, su guard pendiente, su intent de creación y el listado Owner. Estableció que crear Solicitud no requiere Temporada, pero aprobar y crear Membresía quedaron para E2-07.
- Documento 5 exige Agregados separados, backend como escritor único, contratos explícitos, frontend en el mismo incremento y coordinación recuperable cuando intervienen varios Agregados.

### 3.2 Decisiones cerradas

1. Solicitud y Membresía permanecen Aggregate Roots independientes.
2. Solicitud decide; Membresía representa pertenencia.
3. Los estados funcionales de Solicitud son `pendiente`, `cancelada`, `rechazada` y `aprobada`.
4. `cancelada`, `rechazada` y `aprobada` son terminales.
5. La aprobación no agrega un estado funcional intermedio. Mientras se crea la Membresía, la Solicitud continúa `pendiente` y un documento técnico declara `APPROVAL_IN_PROGRESS`.
6. El claim de aprobación no es una decisión final, no es otro Agregado y no concede pertenencia.
7. El punto de aceptación de autoridad es el commit del claim: allí se comprueba el Owner vigente y se fija quién inició la decisión.
8. Un cambio posterior de Owner no invalida ese claim ya aceptado. El proceso en curso puede terminar; sólo el Owner vigente puede iniciar una nueva llamada o asistir su recuperación.
9. Rechazar es una transición local de Solicitud y no usa el claim de aprobación.
10. Aprobar exige Temporada abierta porque crea una Membresía; crear la Solicitud sigue sin exigirla.
11. Una Membresía activa previa ajena a la operación no se adopta y bloquea la aprobación.
12. Una Membresía creada por la misma operación de aprobación sí se recupera autoritativamente.
13. El guard activo de Membresía conserva su responsabilidad: unicidad activa Persona–Grupo. No se duplica con un guard E2-07.
14. El nuevo claim técnico conserva otra responsabilidad: serializar y recuperar la coordinación de aprobación de una Solicitud concreta.
15. No se crea una transacción multi-Agregado. Cada commit escribe una sola fuente funcional.

## 4. Actores, precondiciones y autorización

| Concepto | Autoridad | Participación |
|---|---|---|
| UID autenticado | token verificado | identifica al actor |
| Owner vigente | `groups/{groupId}.ownerId` | lista, decide, consulta y recupera |
| Persona candidata | `groupJoinRequests/{requestId}.personId` | sujeto inmutable de la Solicitud |
| Solicitud | estado persistido | autoridad de la decisión |
| Membresía | documento y controles propios | autoridad del vínculo Persona–Grupo |
| Temporada | contexto abierto del Grupo | precondición de alta de Membresía |
| backend | capacidades públicas entre módulos | único coordinador y escritor |

Precondiciones comunes:

- token válido;
- Cuenta compatible; el Owner no necesita Persona ni Membresía;
- Grupo canónico schema v1;
- actor igual al `ownerId` vigente al aceptar o consultar la operación;
- payload cerrado;
- Solicitud perteneciente al Grupo indicado y con schema compatible;
- controles técnicos correlacionados.

No autorizan:

- `users.roles`;
- un rol global `admin`;
- claims no aprobados;
- una Membresía, incluso activa;
- arrays `admins`, `adminIds`, `memberIds` o solicitudes embebidas;
- haber sido Owner anteriormente;
- conocer `groupId` o `requestId`.

El frontend no accede a Firestore. Todos los reads y writes del flujo pasan por callables backend y capacidades públicas mínimas.

## 5. Modelo de estados de Solicitud

### 5.1 Estados y terminalidad

| Estado | Schema | Terminal | Significado |
|---|---:|---|---|
| `pendiente` | 1 | No | espera una decisión; puede existir o no una coordinación de aprobación válida |
| `cancelada` | 1 | Sí | la Persona retiró la Solicitud antes de una decisión |
| `rechazada` | 2 | Sí | el Owner rechazó la Solicitud |
| `aprobada` | 2 | Sí | el Owner aprobó y la Membresía correlacionada fue confirmada previamente |

`APPROVAL_IN_PROGRESS` es un estado de coordinación de la consulta, no un valor de `estado` dentro del Aggregate Root.

### 5.2 Transiciones permitidas

```text
[creación E2-06] -> pendiente
pendiente -> cancelada
pendiente -> rechazada
pendiente --claim técnico--> pendiente + APPROVAL_IN_PROGRESS
pendiente + APPROVAL_IN_PROGRESS --Membresía confirmada--> aprobada
pendiente + APPROVAL_IN_PROGRESS --fallo definitivo sin Membresía--> pendiente

cancelada -> [sin transición]
rechazada -> [sin transición]
aprobada -> [sin transición]
```

El último retorno a `pendiente` no revierte una decisión: libera un claim cuya aprobación nunca fue confirmada. Sólo es válido si una relectura del Módulo Membresías demuestra que esa operación no creó ni controla una Membresía.

### 5.3 Invariantes

1. Una Solicitud conserva `personId`, `groupId` y `createdAt` durante toda su vida.
2. Como máximo existe una Solicitud no terminal por Persona–Grupo, protegida por el guard pendiente E2-06.
3. Una Solicitud terminal no posee guard pendiente ni coordinación de aprobación.
4. Una Solicitud pendiente sin coordinación admite aprobar, rechazar o cancelar.
5. Una Solicitud pendiente con coordinación válida sólo admite continuar o consultar esa aprobación.
6. `aprobada` exige `membershipId`, intent de decisión correlacionado y evidencia autoritativa de Membresía creada por esa operación.
7. `rechazada` exige intent de decisión correlacionado y no admite `membershipId`.
8. `cancelada` conserva el schema E2-06 y no posee intent de decisión E2-07.
9. Una acción terminal nunca se aplica dos veces.
10. Ningún estado de Solicitud concede ownership o pertenencia por sí solo.

## 6. Persistencia exacta y schemas versionados

### 6.1 `groupJoinRequests/{requestId}`

Los schemas v1 existentes permanecen sin cambio.

`pendiente`, schema 1:

```text
personId: string
groupId: string
estado: "pendiente"
createdAt: Timestamp
schemaVersion: 1
```

`cancelada`, schema 1:

```text
personId: string
groupId: string
estado: "cancelada"
createdAt: Timestamp
cancelledAt: Timestamp
schemaVersion: 1
```

`rechazada`, schema 2:

```text
personId: string
groupId: string
estado: "rechazada"
createdAt: Timestamp
decisionIntentId: string
decidedBy: string
decidedAt: Timestamp
schemaVersion: 2
```

`aprobada`, schema 2:

```text
personId: string
groupId: string
estado: "aprobada"
createdAt: Timestamp
decisionIntentId: string
decidedBy: string
decidedAt: Timestamp
membershipId: string
schemaVersion: 2
```

Reglas exactas:

- no hay campos opcionales dentro de cada variante;
- todos los IDs son canónicos, no vacíos, sin `/` y de hasta 1500 bytes UTF-8;
- `decidedAt >= createdAt` y `cancelledAt >= createdAt`;
- `decidedBy` proviene del UID que obtuvo el claim o confirmó el rechazo;
- `decisionIntentId` referencia el intent de la operación terminal;
- `membershipId` aparece sólo en `aprobada`;
- el intent canónico posee los mismos request, Persona, Grupo, acción y `requestedBy == decidedBy`, con `intent.createdAt <= decidedAt`;
- `schemaVersion` discrimina el schema, pero nunca sustituye `estado`.

`decidedBy` se justifica como evidencia privada del actor cuya autoridad fue aceptada: en rechazo es el Owner del commit terminal; en aprobación es el Owner del commit de claim. No concede permisos, no se toma de claims globales y nunca aparece en DTO, logs o métricas.

### 6.2 `groupJoinRequestDecisionIntents/{intentId}`

Finalidad: vincular una clave de idempotencia del Owner con una operación de decisión exacta. Es técnico, durable, privado y no es autoridad de la decisión.

`intentId` es SHA-256 hexadecimal de la codificación length-prefixed:

```text
["sportexa:E2-07:decision-intent:v1", ownerUid, idempotencyKey]
```

Schema exacto v1:

```text
requestId: string
personId: string
groupId: string
action: "approve" | "reject"
requestedBy: string
requestHash: string SHA-256 hexadecimal
createdAt: Timestamp
intentVersion: 1
```

`requestHash` se calcula sobre:

```text
["sportexa:E2-07:decision-request:v1", "contract-v1", requestId, personId, groupId, action]
```

La clave cruda nunca se persiste ni registra. Todo intent que alcanzó un commit se conserva sin TTL, incluso si una aprobación termina en un fallo funcional definitivo antes de crear Membresía. El claim puede liberarse, pero el intent no: la misma clave continúa ligada al mismo request, Persona, Grupo y acción; un retry compatible puede adquirir un claim nuevo y una reutilización incompatible continúa devolviendo `IDEMPOTENCY_CONFLICT`. Así una respuesta perdida de liberación nunca permite reinterpretar la clave.

Un intent `approve` sin claim y con Solicitud todavía `pendiente` es un intento durable liberado, no corrupción ni decisión. Puede ser retomado con la misma clave y por el Owner vigente, o quedar como evidencia si otra intención válida decide después la Solicitud. También pueden existir intents compatibles adicionales cuando claves distintas asistieron o recuperaron la misma acción: sólo el intent referenciado por el claim o el terminal es canónico. Un claim siempre debe referenciar exactamente un intent; el inverso no es obligatorio.

### 6.3 `groupJoinRequestApprovalCoordinations/{requestId}`

Finalidad: claim técnico exclusivo para una aprobación multi-paso. No es Agregado, decisión, historial ni fuente de pertenencia. El ID exacto es el `requestId`.

Schema exacto v1:

```text
requestId: string
personId: string
groupId: string
seasonId: string
decisionIntentId: string
requestedBy: string
createdAt: Timestamp
coordinationVersion: 1
```

Correlación obligatoria:

- ID del documento igual a `requestId`;
- Solicitud existente, `pendiente`, misma Persona y Grupo;
- intent existente, `action: "approve"`, mismos IDs y `requestedBy`;
- `seasonId` corresponde al contexto abierto seleccionado al adquirir el claim;
- guard pendiente E2-06 existente y correlacionado;
- `createdAt` coincide exactamente con el timestamp backend único usado al crear el claim y su intent en ese intento; si se retoma un intent liberado, el claim nuevo usa su propio `createdAt` y no exige igualdad con el timestamp histórico del intent;
- ausencia de cualquier campo adicional.

La coordinación se elimina sólo al confirmar `aprobada` o al demostrar un fallo definitivo sin Membresía propia de la operación. Una ausencia, duplicado, huérfano, referencia distinta o schema inválido produce `INCOMPATIBLE_STATE`; no se repara automáticamente.

### 6.4 Persistencia de Membresía reutilizada

E2-07 no agrega campos a `memberships`, `activeMembershipGuards` ni `membershipLifecycleGuards`.

- una Membresía nueva conserva schema activo v1 de E2-03;
- el `activeMembershipGuard` conserva schema y unicidad Persona–Grupo;
- sus hashes se calculan con namespaces E2-07 y la identidad de la Solicitud;
- una Membresía finalizada y su lifecycle guard conservan schema E2-05 y bloquean esta alta hasta un incremento de reactivación.

Hash interno de idempotencia de admisión:

```text
["sportexa:E2-07:request-membership-idempotency:v1", requestId, personId, groupId]
```

Hash interno de request de admisión:

```text
["sportexa:E2-07:request-membership:v1", "contract-v1", requestId, personId, groupId, seasonId]
```

Estos hashes distinguen una Membresía creada por esta aprobación de una alta directa. Reutilizar el guard activo responde a su responsabilidad existente de unicidad y recuperación; no convierte el guard en autoridad de Solicitud.

## 7. Contratos públicos

Se agregan tres callables separados:

```text
approveGroupJoinRequest({ groupId, requestId, idempotencyKey })
rejectGroupJoinRequest({ groupId, requestId, idempotencyKey })
getGroupJoinRequestDecisionResult({ groupId, requestId })
```

Se conserva y evoluciona:

```text
listPendingGroupJoinRequestsForOwnedGroup({ groupId, pageSize?, cursor? })
```

No se combinan aprobar y rechazar en un payload con `action`; la separación evita comandos ambiguos, simplifica autorización, telemetría y pruebas, y hace que la clave incompatible tenga semántica verificable.

### 7.1 Validación cerrada

- objeto plano con prototipo normal o nulo;
- rechazo de `null`, arrays, instancias, campos faltantes y propiedades desconocidas;
- `groupId` y `requestId`: string canónico no vacío, sin `/`, máximo 1500 bytes UTF-8;
- `idempotencyKey`: `^[A-Za-z0-9._:-]{16,128}$`;
- `pageSize`: entero 1–20, default 20;
- `cursor`: base64url canónico no vacío, máximo 2048 caracteres;
- nunca se aceptan UID, `personId`, `membershipId`, `seasonId`, estado, fecha, rol, motivo ni permisos desde cliente.

### 7.2 DTO de aprobación

```ts
type ApproveGroupJoinRequestResult = {
  outcome: "APPROVED" | "ALREADY_APPROVED";
  decision: {
    requestId: string;
    estado: "aprobada";
    decidedAt: string;
    membership: {
      id: string;
      seasonId: string;
    };
  };
};
```

`APPROVED` indica que esta ejecución confirmó la transición. `ALREADY_APPROVED` indica recuperación autoritativa de la misma decisión ya confirmada. Ninguno afirma que la Membresía seguirá activa para siempre; sólo identifica la Membresía confirmada al decidir.

### 7.3 DTO de rechazo

```ts
type RejectGroupJoinRequestResult = {
  outcome: "REJECTED" | "ALREADY_REJECTED";
  decision: {
    requestId: string;
    estado: "rechazada";
    decidedAt: string;
  };
};
```

### 7.4 DTO de consulta de resultado

```ts
type GroupJoinRequestDecisionResult =
  | {
      status: "PENDING";
      request: { id: string; estado: "pendiente"; createdAt: string };
    }
  | {
      status: "APPROVAL_IN_PROGRESS";
      request: { id: string; estado: "pendiente"; createdAt: string };
      startedAt: string;
    }
  | {
      status: "CANCELLED";
      request: { id: string; estado: "cancelada"; createdAt: string; cancelledAt: string };
    }
  | {
      status: "REJECTED";
      request: { id: string; estado: "rechazada"; createdAt: string; decidedAt: string };
    }
  | {
      status: "APPROVED";
      request: { id: string; estado: "aprobada"; createdAt: string; decidedAt: string };
      membership: { id: string; seasonId: string };
    };
```

Todas las fechas públicas son ISO-8601 UTC. No se exponen `personId`, UID, `decidedBy`, hashes, claves, intents, claims, guards ni documentos Firestore.

### 7.5 DTO del listado Owner

El item E2-06 agrega un único discriminante:

```ts
type PendingGroupJoinRequestForOwner = {
  id: string;
  estado: "pendiente";
  decisionStatus: "PENDING" | "APPROVAL_IN_PROGRESS";
  createdAt: string;
  person: { firstName: string; lastName: string };
};
```

El orden, cursor, tamaño máximo y forma `{ items, nextCursor }` permanecen iguales. El listado sigue seleccionando Solicitudes `pendiente`; el claim sólo determina acciones disponibles.

Por cada item se leen, de forma secuencial dentro de la misma transacción, la consulta autoritativa Persona–Grupo, el pending guard, la Persona y el claim; si hay claim, también su decision intent. Con `pageSize <= 20`, el costo adicional queda estrictamente acotado a dos lecturas documentales por item sobre el N+1 aprobado en E2-06. Un solo request, guard, Persona, claim o intent incompatible hace fallar la página completa con `INCOMPATIBLE_STATE`; no se omite ni filtra ningún item.

### 7.6 Evolución exacta de contratos E2-06

Los payloads de E2-06 no cambian. Su comportamiento compatible queda cerrado así:

- `createMyGroupJoinRequest` conserva sus outcomes y agrega `EXISTING_APPROVED` y `EXISTING_REJECTED` cuando el mismo intent de creación apunta a una Solicitud resuelta; nunca crea otra Solicitud;
- toda representación pública propia `pendiente` agrega `decisionStatus: "PENDING" | "APPROVAL_IN_PROGRESS"`; una creación nueva devuelve siempre `PENDING`;
- las representaciones propias `aprobada` y `rechazada` exponen sólo `id`, `groupId`, `estado`, `createdAt` y `decidedAt`; no exponen `membershipId`, `decidedBy` ni datos del Owner;
- `getMyCurrentGroupJoinRequest({ groupId })` sigue significando “vigente”: devuelve la pendiente propia con su `decisionStatus`, incluso con claim, o `null` para cualquier terminal;
- `cancelMyGroupJoinRequest({ groupId, requestId })` conserva `CANCELLED | ALREADY_CANCELLED`; ante claim válido devuelve `APPROVAL_IN_PROGRESS` sin escribir y ante `aprobada` o `rechazada` devuelve `REQUEST_NOT_PENDING`;
- la cancelación evolucionada lee Solicitud, consulta pendiente, pending guard, approval coordination y, si existe, su decision intent antes de cualquier write. Claim y cancelación comparten al menos Solicitud, pending guard y documento de coordination, por lo que Firestore reintenta una de las transacciones y sólo un orden puede ganar;
- `getKnownGroupJoinPreview` y el cursor no cambian.

DTO propio pendiente exacto:

```ts
type PendingOwnGroupJoinRequest = {
  id: string;
  groupId: string;
  estado: "pendiente";
  decisionStatus: "PENDING" | "APPROVAL_IN_PROGRESS";
  createdAt: string;
};
```

DTO propio terminal de decisión exacto:

```ts
type DecidedOwnGroupJoinRequest = {
  id: string;
  groupId: string;
  estado: "aprobada" | "rechazada";
  createdAt: string;
  decidedAt: string;
};
```

## 8. Outcomes y errores estables

| Código | Significado | Tratamiento UI |
|---|---|---|
| `UNAUTHENTICATED` | falta identidad | solicitar inicio de sesión |
| `ACCOUNT_REQUIRED` | Cuenta ausente/incompatible | bloquear y orientar |
| `VALIDATION_FAILED` | payload inválido | no reintentar automáticamente |
| `NOT_AUTHORIZED` | no es Owner vigente | retirar acciones y recargar contexto |
| `GROUP_INCOMPATIBLE` | Grupo propio con schema inválido | fallar cerrado |
| `REQUEST_NOT_FOUND` | Solicitud no existe en el Grupo propio | recargar listado |
| `REQUEST_NOT_PENDING` | cancelación candidata sobre una aprobada/rechazada | mostrar que ya no admite cancelación |
| `REQUEST_CANCELLED` | ya fue cancelada | mostrar resultado terminal |
| `DECISION_ALREADY_APPROVED` | se intentó rechazar una aprobada | mostrar aprobación estable |
| `DECISION_ALREADY_REJECTED` | se intentó aprobar una rechazada | mostrar rechazo estable |
| `APPROVAL_IN_PROGRESS` | existe claim válido | consultar o reintentar aprobación |
| `OPEN_SEASON_REQUIRED` | no hay Temporada abierta | mantener pendiente; orientar al Owner |
| `SEASON_INCOMPATIBLE` | contexto temporal inválido | fallar cerrado |
| `ACTIVE_MEMBERSHIP_EXISTS` | existe activa ajena a la operación | mantener pendiente; no adoptar |
| `MEMBERSHIP_REACTIVATION_REQUIRED` | lifecycle E2-05 bloquea nueva alta | mantener pendiente; función futura |
| `IDEMPOTENCY_CONFLICT` | misma clave ligada a request/acción distintos | generar clave sólo para una intención nueva |
| `INCOMPATIBLE_STATE` | estado parcial, huérfano, duplicado o corrupto | no reparar; escalar |
| `CONFLICT` | contención no resuelta | reconsultar y permitir retry |
| `DEPENDENCY_UNAVAILABLE` | no puede confirmarse una dependencia | estado incierto; consultar antes de repetir |
| `INTERNAL_ERROR` | fallo no clasificado y sanitizado | estado incierto; consultar |

Los terminales iguales son outcomes, no errores: aprobar una ya aprobada devuelve `ALREADY_APPROVED`; rechazar una ya rechazada devuelve `ALREADY_REJECTED`, siempre después de validar la integridad completa.

Mapping callable exacto:

| Reason | Código `HttpsError` |
|---|---|
| `UNAUTHENTICATED` | `unauthenticated` |
| `ACCOUNT_REQUIRED`, `GROUP_INCOMPATIBLE`, `REQUEST_NOT_PENDING`, `REQUEST_CANCELLED`, `DECISION_ALREADY_APPROVED`, `DECISION_ALREADY_REJECTED`, `APPROVAL_IN_PROGRESS`, `OPEN_SEASON_REQUIRED`, `SEASON_INCOMPATIBLE`, `MEMBERSHIP_REACTIVATION_REQUIRED`, `INCOMPATIBLE_STATE` | `failed-precondition` |
| `VALIDATION_FAILED` | `invalid-argument` |
| `NOT_AUTHORIZED` | `permission-denied` |
| `REQUEST_NOT_FOUND` | `not-found` |
| `ACTIVE_MEMBERSHIP_EXISTS`, `IDEMPOTENCY_CONFLICT` | `already-exists` |
| `CONFLICT` | `aborted` |
| `DEPENDENCY_UNAVAILABLE` | `unavailable` |
| `INTERNAL_ERROR` | `internal` |

Los errores públicos contienen mensaje estable y únicamente `details.reason`. `REQUEST_NOT_FOUND` sólo puede emitirse después de confirmar ownership del Grupo, para no crear un oráculo de enumeración.

## 9. Idempotencia

### 9.1 Regla por operación

- Cada click confirmado genera una clave nueva.
- El frontend conserva esa clave durante todos los retries de la misma acción.
- Aprobar y rechazar usan dominios de request distintos aunque reciban la misma forma de clave.
- El intent vincula clave, actor, Solicitud, Persona, Grupo y acción.
- Una clave ya vinculada al mismo request y acción recupera el resultado.
- Una clave ya vinculada a otro request o acción devuelve `IDEMPOTENCY_CONFLICT`.
- Una clave nueva sobre una decisión terminal igual crea, en una transacción autoritativa, un intent compatible que la vincula durablemente y devuelve `ALREADY_*`; no cambia la Solicitud.
- Una clave nueva sobre el terminal opuesto devuelve el error terminal correspondiente y no crea intent.
- Una clave nueva mientras existe un claim de aprobación válido crea un intent compatible adicional antes de asistir la misma coordinación, pero no sustituye el intent canónico ni el claim. Si esa clave ya está vinculada de forma incompatible, falla antes de asistir.
- Una clave de un intent `approve` liberado sólo puede reintentar `approve` sobre el mismo payload autoritativo. No puede usarse para `reject`, otra Solicitud, otra Persona o Grupo.
- El orden de clasificación siempre hidrata y valida primero el intent encontrado por la clave; por ello un terminal no oculta una reutilización incompatible.

### 9.2 Idempotencia interna de Membresía

La operación interna usa `requestId`, Persona y Grupo como identidad estable; no reutiliza la clave cruda del Owner. El mismo request siempre recupera la misma Membresía si el active guard posee los hashes E2-07 exactos. Un active guard de otra operación produce `ACTIVE_MEMBERSHIP_EXISTS`, no éxito idempotente.

## 10. Coordinación de aprobación y recuperación

### 10.1 Fase A — preflight y claim de Solicitud

1. Validar payload, token y Cuenta.
2. En una transacción del Módulo Solicitudes, leer antes de escribir:
   - Grupo y ownership vigente mediante capacidad pública transaccional;
   - Solicitud por ID;
   - guard pendiente y consulta autoritativa Persona–Grupo con `limit(2)`;
   - decision intent por clave;
   - approval coordination por request ID.
3. Confirmar ownership antes de revelar Solicitud, intent, claim o Temporada.
4. Validar schemas y correlación completa.
5. Hidratar primero cualquier intent encontrado por la clave y rechazar una vinculación incompatible. Si existe el terminal `aprobada`, crear un intent alias compatible cuando la clave aún no estaba vinculada y devolver `ALREADY_APPROVED` sin exigir Temporada abierta ni cambiar la Solicitud. Los terminales opuestos se devuelven sin crear intent.
6. Si existe claim válido, continuar con su `seasonId` sin seleccionar otra Temporada. Una clave fresca crea un intent compatible adicional en esa transacción, pero no reemplaza el claim ni cambia su `requestedBy`.
7. Sólo para una pendiente sin claim, obtener dentro de la misma transacción una Temporada abierta mediante capacidad pública owner-scoped. Si no existe, devolver `OPEN_SEASON_REQUIRED` sin escribir.
8. Reutilizar un intent compatible encontrado por la misma clave o crear uno nuevo, y crear coordination con la Temporada seleccionada en el mismo commit.

El commit de claim es el punto donde la autoridad del Owner queda aceptada. Todavía no existe aprobación funcional.

### 10.2 Fase B — crear o recuperar Membresía

Solicitudes invoca una capacidad pública interna de Membresías equivalente a:

```text
createOrRecoverMembershipForGroupJoinRequest({
  requestId,
  personId,
  groupId,
  seasonId
})
```

La capacidad no es callable, no acepta datos directos del cliente y no expone repositorios. Dentro de la unidad de Membresías, todas las lecturas preceden a los writes:

1. valida IDs y la forma cerrada del contexto confiable;
2. lee active guard, lifecycle guard, la Membresía referenciada y consultas activa/finalizada con `limit(2)`;
3. si encuentra hashes E2-07 exactos para el mismo request, recupera primero la Membresía correlacionada con el `seasonId` fijado en el claim, aunque la Temporada haya dejado de estar abierta después de aquel commit;
4. si encuentra una activa de otra operación, devuelve `ACTIVE_MEMBERSHIP_EXISTS`;
5. si encuentra lifecycle vigente, devuelve `MEMBERSHIP_REACTIVATION_REQUIRED` y nunca lo consume;
6. sólo si no existe efecto propio previo, valida Grupo activo y la Temporada exacta todavía abierta mediante capacidades públicas de sólo lectura;
7. si el contexto sigue válido, crea una Membresía activa v1 y su active guard en un único commit de Membresías;
8. devuelve un receipt mínimo `{ membershipId, personId, groupId, seasonId, outcome }`.

No modifica Solicitud. El receipt no es persistencia ni nueva autoridad.

### 10.3 Fase C — confirmar la decisión

En una nueva transacción del Módulo Solicitudes:

1. releer Solicitud, guard pendiente, decision intent y approval coordination;
2. validar que la Solicitud sigue `pendiente` y todo correlaciona;
3. verificar, mediante capacidad pública de Membresías dentro de la lectura consistente, que `membershipId` existe, pertenece a Persona, Grupo y Temporada del claim, está activa y posee los hashes E2-07 de este request;
4. construir la transición `pendiente → aprobada` con un único `decidedAt` backend;
5. actualizar sólo la Solicitud a schema 2;
6. eliminar guard pendiente y approval coordination en el mismo commit;
7. conservar decision intent;
8. devolver `APPROVED` o, tras relectura, `ALREADY_APPROVED`.

La Membresía se confirma antes de `aprobada`. El commit de la Solicitud no escribe ni corrige Membresía.

### 10.4 Fallos por frontera

| Punto de fallo | Estado posible | Recuperación obligatoria |
|---|---|---|
| antes del claim | todo sin cambio | devolver error estable |
| respuesta perdida del claim | pendiente con intent/claim o sin ellos | relectura exacta; continuar sólo si correlaciona |
| antes del commit de Membresía | pendiente con claim | retry de Fase B |
| commit de Membresía rechazado definitivamente | pendiente con claim, sin Membresía propia | relectura de Membresías; liberar sólo el claim si la ausencia propia está demostrada; conservar intent |
| respuesta perdida tras commit de Membresía | pendiente con claim y Membresía activa | capacidad de Membresías recupera por hashes y continúa Fase C |
| antes del commit final | pendiente con claim y Membresía activa | revalidar y repetir Fase C |
| respuesta perdida tras commit final | aprobada, sin guard/claim | consulta autoritativa devuelve aprobación estable |
| error ambiguo sin estado demostrable | cualquiera | conservar evidencia, `DEPENDENCY_UNAVAILABLE`/`INTERNAL_ERROR`, consultar; no liberar ni recrear |

### 10.5 Liberación segura

Sólo errores funcionales definitivos permiten intentar liberar el claim: Grupo definitivamente ausente/inactivo/incompatible, ausencia de la Temporada exacta abierta, activa ajena o reactivación requerida. La transacción de liberación debe:

- releer y correlacionar Solicitud pendiente, guard, claim e intent;
- consultar a Membresías y demostrar que no existe una Membresía controlada por los hashes de este request;
- eliminar únicamente el claim;
- conservar el intent durable para que la clave no pueda cambiar de significado;
- conservar Solicitud y guard pendiente sin cambios.

Corrupción, timeout, `UNKNOWN`, `INTERNAL`, `ABORTED` sin resolución o dependencia caída nunca habilitan liberación automática.

Si se pierde la respuesta del commit de liberación, la consulta autoritativa distingue sin inferencias: claim presente significa `APPROVAL_IN_PROGRESS`; claim ausente con Solicitud y pending guard íntegros significa `PENDING`. El intent liberado no cambia ninguno de esos estados y un retry con su misma clave puede adquirir un claim nuevo.

### 10.6 Rechazo

Rechazar se resuelve en una única transacción de Solicitud:

1. validar Owner vigente antes de revelar la Solicitud;
2. leer Solicitud, guard pendiente, consulta autoritativa, intent por clave y approval coordination;
3. hidratar primero el intent de la clave y devolver `IDEMPOTENCY_CONFLICT` si no corresponde exactamente a este rechazo;
4. si la Solicitud ya está `rechazada`, crear un intent alias compatible cuando la clave aún no estaba vinculada y devolver `ALREADY_REJECTED` sin cambiarla; ante otro terminal devolver su error estable sin crear intent;
5. si existe approval coordination, devolver `APPROVAL_IN_PROGRESS` sin escribir;
6. reutilizar un decision intent `reject` compatible o crear uno nuevo;
7. generar un único timestamp backend y persistirlo como `intent.createdAt` y `request.decidedAt` cuando ambos documentos nacen en este commit; si el intent ya existía, exigir `intent.createdAt <= decidedAt`;
8. aplicar `pendiente → rechazada`;
9. eliminar el guard pendiente;
10. confirmar todo en el mismo commit.

No consulta Temporada y no toca Membresía. Una respuesta perdida se resuelve releyendo Solicitud, intent y ausencia de guard/claim.

## 11. Concurrencia

| Carrera | Resultado permitido |
|---|---|
| dos aprobaciones, misma clave | un claim, una Membresía, una aprobación; ambas recuperan `APPROVED/ALREADY_APPROVED` |
| dos aprobaciones, claves distintas | un claim y un intent canónico ganan; la otra clave queda en un intent compatible y asiste o recupera; nunca crea segundo claim, decisión ni Membresía |
| aprobación contra rechazo | el primer commit sobre request/claim ordena; claim ganador bloquea rechazo, rechazo ganador impide claim |
| aprobación contra cancelación | claim ganador bloquea cancelación; cancelación ganadora deja terminal y aprobación no crea Membresía |
| aprobación contra alta directa de Membresía | el active guard ordena; si alta directa gana, no se adopta y aprobación vuelve a pendiente; si aprobación gana, alta directa ve existente |
| cambio de Owner antes del claim | Owner anterior denegado; Owner nuevo puede decidir |
| cambio de Owner después del claim | el claim aceptado puede concluir; Owner anterior no inicia retries nuevos, Owner vigente puede consultar o asistir |
| Membresía activa previa | `ACTIVE_MEMBERSHIP_EXISTS`; Solicitud permanece pendiente, sin claim final |
| lifecycle finalizado vigente | `MEMBERSHIP_REACTIVATION_REQUIRED`; no se crea ni reactiva |
| duplicados activos o pendientes | `INCOMPATIBLE_STATE`; cero escritura |
| Solicitud/guard asimétricos | `INCOMPATIBLE_STATE`; cero reparación |
| intent o claim huérfano/incompatible | `INCOMPATIBLE_STATE`; cero decisión |
| active guard/Membresía asimétricos | `INCOMPATIBLE_STATE`; cero aprobación |
| respuesta perdida en cualquier commit | relectura autoritativa por frontera; nunca inferir éxito del error |

Todas las garantías de esta tabla requieren escenarios Emulator deterministas con barreras o hooks controlados en puntos de commit. Repeticiones probabilísticas, sleeps y búsqueda textual no acreditan estas carreras.

La exclusión real se apoya en documentos compartidos, no sólo en chequeos previos: claim, rechazo y cancelación leen la misma Solicitud y el mismo pending guard; rechazo y cancelación además leen el documento de coordination que el claim crea. Si cancelación o rechazo escribe primero, el intento de claim reintenta sobre un terminal y no llega a Membresías. Si el claim escribe primero, la operación opuesta reintenta, observa el claim y no modifica la Solicitud. Fase C vuelve a leer esos documentos y sólo puede aprobar la pendiente todavía protegida por el mismo claim. Por lo tanto no existe un orden legítimo que cree Membresía después de una cancelación/rechazo ganadora ni que termine con Membresía E2-07 y Solicitud terminal opuesta.

La “continuación interna aceptada” se limita a la ejecución backend que ya confirmó el claim mientras el actor era Owner: esa ejecución porta el contexto inmutable del claim y puede completar Fases B y C sin una segunda concesión al actor. Cualquier nueva invocación —incluido un retry con la misma clave— empieza validando el Owner vigente. Tras una transferencia, el Owner anterior recibe `NOT_AUTHORIZED`; no puede consultar, asistir, liberar ni completar. El Owner nuevo puede asistir el claim existente sin alterar `requestedBy` ni `decidedBy`, que registran al actor autorizado en el punto de claim. Esta política es verificable forzando la transferencia antes del claim, después del claim dentro de la misma ejecución y antes de una invocación de recuperación.

## 12. Temporada abierta

La normativa existente obliga a que toda nueva Membresía refiera una Temporada abierta. Por ello:

- la Solicitud pendiente no contiene `seasonId` y puede existir sin Temporada abierta;
- aprobar sin Temporada abierta devuelve `OPEN_SEASON_REQUIRED` y no crea claim ni decisión;
- el claim fija la Temporada abierta seleccionada para que retries no cambien silenciosamente de contexto;
- Membresías revalida esa Temporada antes de crear;
- si deja de estar abierta antes del commit de Membresía, no se crea y el claim puede liberarse tras ausencia demostrada;
- si la Membresía ya fue confirmada y luego cambia el contexto temporal, la recuperación usa la evidencia persistida y no crea otra Membresía en una Temporada nueva;
- E2-07 no implementa cierre de Temporada ni presupone su atomicidad futura.

## 13. Consulta autoritativa e integridad

La consulta de resultado valida una matriz exacta:

| Solicitud | Guard pendiente | Claim | Intent | Membresía | Resultado |
|---|---|---|---|---|---|
| pendiente | correlacionado | ausente | no requerido | no consultada | `PENDING` |
| pendiente | correlacionado | correlacionado | approve correlacionado | ausente o correlacionada | `APPROVAL_IN_PROGRESS` |
| cancelada | ausente | ausente | ninguno referenciado; intents liberados se toleran | no consultada | `CANCELLED` |
| rechazada | ausente | ausente | reject correlacionado | no consultada | `REJECTED` |
| aprobada | ausente | ausente | approve correlacionado | correlacionada | `APPROVED` |

Cualquier otra combinación es `INCOMPATIBLE_STATE`. Para `APPROVAL_IN_PROGRESS`, una Membresía ausente es un estado parcial válido anterior a Fase B y una Membresía exacta es un estado parcial válido anterior a Fase C; una activa ajena no se presenta como propia. Un decision intent durable sin claim no participa del resultado salvo que la operación llegue con su misma clave o que una Solicitud terminal lo referencie: no es un huérfano por esa sola ausencia.

Una aprobación sigue siendo estable aunque en un incremento futuro la Membresía pase legítimamente a `finalizada`; la consulta verifica identidad y correlación histórica y no redefine la decisión. Durante E2-07, la única creación resultante es activa v1.

## 14. Reglas Firestore e índices

### 14.1 Reglas conservadoras

Permanecen `allow read, write: if false` para:

- `groupJoinRequests`;
- `pendingGroupJoinRequestGuards`;
- `groupJoinRequestIntents`;
- `memberships`;
- `activeMembershipGuards`;
- `membershipLifecycleGuards`.

Se agrega deny-all explícito para:

```text
match /groupJoinRequestDecisionIntents/{intentId} {
  allow read, write: if false;
}

match /groupJoinRequestApprovalCoordinations/{requestId} {
  allow read, write: if false;
}
```

No se habilita lectura Owner directa: la privacidad, composición y validación de integridad requieren backend.

### 14.2 Índices mínimos

No se prevé un índice nuevo.

- El listado reutiliza el índice E2-06 `groupId ASC, estado ASC, createdAt DESC`.
- La consulta pendiente Persona–Grupo y la activa de Membresía reutilizan las consultas e índice ya cerrados.
- Solicitud, intent, claim, guards y Membresía correlacionada se leen por ID.
- No se introduce consulta por `decisionIntentId`, `membershipId`, `decidedAt` o estado terminal.

La implementación deberá demostrar en Emulator que las consultas exactas funcionan. Un índice sólo podrá agregarse si un fallo reproducible de Firestore muestra que es necesario, documentando su consulta consumidora.

## 15. Frontend Owner

La superficie se integra en `PendingGroupJoinRequestsSection` del detalle canónico del Grupo.

### 15.1 Presentación y acciones

- cada fila muestra sólo nombre, apellido y fecha ya autorizados;
- `PENDING` ofrece “Aprobar” y “Rechazar”;
- `APPROVAL_IN_PROGRESS` deshabilita decisiones opuestas y ofrece “Consultar resultado”/“Continuar recuperación”;
- aprobar requiere confirmación explícita que informa que creará una Membresía en la Temporada abierta;
- rechazar requiere confirmación explícita y aclara que no crea Membresía;
- no se solicita motivo;
- después de terminal, la fila sale del listado pendiente sólo tras respuesta confirmada o reconsulta.

### 15.2 Single-flight, retry y estado incierto

- single-flight por `requestId`; no bloquea innecesariamente otras filas;
- mientras una acción está en vuelo, ambos botones de esa fila quedan deshabilitados;
- la clave se conserva en memoria durante la intención y sus retries;
- no hay actualización optimista ni eliminación anticipada;
- ante `DEPENDENCY_UNAVAILABLE`, `CONFLICT`, `INTERNAL_ERROR` o pérdida de respuesta se muestra “No pudimos confirmar el resultado” y se ejecuta/expone la consulta de resultado;
- `APPROVAL_IN_PROGRESS` no se presenta como éxito;
- `APPROVED`, `REJECTED` y `CANCELLED` reemplazan el estado local sólo con DTO autoritativo;
- una clave nueva se genera únicamente para una nueva confirmación real, no para un retry.

### 15.3 Accesibilidad y responsive

- controles con nombre accesible que incluya acción y candidata;
- diálogo accesible con foco inicial, retorno de foco, Escape y cancelación clara;
- progreso y resultados en regiones `aria-live`; errores con `role="alert"`;
- foco dirigido al resultado después de una respuesta;
- navegación completa por teclado y foco visible;
- botones con objetivo táctil mínimo vigente;
- layouts verificados a 360 px, 768 px y escritorio, sin scroll horizontal;
- color nunca es el único indicador de estado.

La superficie candidata E2-06 sólo requiere una adaptación de compatibilidad: si su propia Solicitud posee claim válido, muestra “Aprobación en proceso”, no permite cancelar ni crear otra y puede reconsultar. No se le exponen datos del Owner, Temporada, Membresía ni controles administrativos.

## 16. Privacidad y efectos colaterales

- El listado conserva sólo nombre y apellido; no agrega email, UID, `personId` ni datos deportivos.
- La consulta Owner no expone `decidedBy`, hashes o estructuras técnicas.
- Los errores fuera de un Grupo propio no permiten enumerar Solicitudes.
- Logs y métricas no incluyen IDs de Persona, Grupo, Solicitud, Membresía, UID, clave, hash, payload, snapshot ni email.
- Aprobar escribe únicamente Membresía y sus controles dentro de Membresías, y Solicitud/intents/claim/guard dentro de Solicitudes.
- Rechazar escribe únicamente Solicitud, decision intent y eliminación de su guard pendiente.
- Nunca se modifican Grupo, Persona, Usuario o Temporada.
- Nunca se escriben arrays legacy, notificaciones, Actividad, pagos o roles.

## 17. Observabilidad

Eventos estructurados allowlisted:

```text
operation: approve | reject | get-result | list
stage: authorization | claim | membership | finalize | authoritative-reread | release
classification: first-attempt | retry | recovery | contention | uncertain | incompatible
outcome?: código estable
reason?: código estable
durationMs
```

Requisitos:

- un log por cierre de etapa relevante, sin duplicar por cada helper;
- clasificación separada de fallo funcional, contención, dependencia y corrupción;
- métricas mínimas de `APPROVAL_IN_PROGRESS`, recuperaciones y fallos de Fase C;
- observabilidad nunca altera outcomes ni consume errores;
- excepciones públicas sanitizadas y stacks sólo en el mecanismo seguro existente, no en DTO.

## 18. Legado y compatibilidad posterior

- `pendingRequestIds`, `pendingAdminRequestIds`, `memberIds`, `adminIds`, `admins` y solicitudes embebidas permanecen sin lectura ni escritura.
- No se adapta API HTTP legacy ni rutas `/api/groups/.../requests/...`; esas superficies no reciben autoridad nueva.
- Los callables E2-06 conservan nombres. Su hidratador evoluciona para schemas 2 y su cancelación reconoce el claim.
- `getMyCurrentGroupJoinRequest` debe representar una pendiente en coordinación sin interpretarla como ausencia o corrupción.
- El cursor y orden del listado permanecen compatibles.
- Schemas v1 existentes siguen hidratándose estrictamente.
- Los estados terminales y `membershipId` permiten futuras consultas históricas sin duplicar la fuente de pertenencia.
- Una futura finalización/reactivación de Membresía no modifica retroactivamente la decisión.
- Notificaciones futuras consumirán resultados confirmados, nunca el claim.
- Un futuro cleanup de intents requiere ficha, retención y pruebas propias.

## 19. Repositorios, capacidades y límites arquitectónicos

| Componente | Responsabilidad |
|---|---|
| Aggregate Root Solicitud | transiciones `reject` y `approveAfterMembership` |
| Repositorio Solicitudes | hidratación estricta y writes de una Solicitud |
| Store/coordinador Solicitudes | claim, fases, relectura y liberación |
| decision intent adapter | idempotencia pública de la decisión |
| approval coordination adapter | exclusión y recuperación multi-paso |
| capacidad pública Grupos | ownership vigente y Grupo activo |
| capacidad pública Temporadas | Temporada exacta abierta |
| capacidad pública Membresías | crear/recuperar y verificar correlación |
| Repositorio Membresías | única persistencia del Aggregate Root Membresía |
| active guard Membresías | unicidad y recuperación Persona–Grupo |
| callable adapter | validación, mapping HTTPS y observabilidad |
| reader Owner | listado y resultado mínimo, sin documentos internos |

Solicitudes no importa Repositorios de Membresías, Grupos, Personas o Temporadas. Membresías no muta Solicitud. Los adaptadores pueden compartir una transacción como contexto de lectura de una capacidad, pero ningún Repositorio ajeno queda expuesto.

Contratos inter-módulo mínimos previstos, exportados desde superficies `public`:

```text
Grupos.getOwnedContext({ unitOfWork?, groupId, userId })
Temporadas.getOpenContextForOwnedGroup({ unitOfWork?, groupId, userId })
Grupos.getGroupContextForMembership({ unitOfWork?, groupId })
Temporadas.assertOpenSeasonForMembership({ unitOfWork?, groupId, seasonId })
Membresías.createOrRecoverForGroupJoinRequest({ requestId, personId, groupId, seasonId })
Membresías.getGroupJoinRequestMembershipContext({ unitOfWork?, requestId, personId, groupId, seasonId, membershipId? })
Personas.getOwnerProjection({ unitOfWork?, personId })
```

Las capacidades de Membresías reciben IDs exclusivamente desde una Solicitud y un claim ya hidratados por backend, devuelven DTO/estado mínimo y encapsulan active/lifecycle guards, hashes, queries y Repositorio. Las dos capacidades owner-scoped se usan antes y durante el claim. Las capacidades de contexto para Membresías sólo validan Grupo activo y Temporada exacta abierta: no vuelven a autorizar al actor ni invalidan una ejecución cuyo claim ya fue aceptado. Ninguna superficie `public` exporta referencias Firestore, snapshots, Aggregate Roots o adaptadores privados.

## 20. Plan de pruebas obligatorio

### 20.1 Dominio y schemas

- hidratar las cuatro variantes exactas;
- rechazar campos faltantes, extra, versiones cruzadas y estados desconocidos;
- transiciones permitidas y terminalidad;
- timestamps y referencias inválidos;
- `aprobada` sin `membershipId` y `rechazada` con `membershipId` rechazados;
- inmutabilidad de Persona, Grupo y creación.

### 20.2 Contratos, DTO y errores

- payload exacto para cada callable;
- rechazo de propiedades extra e identidades cliente;
- patrón y longitud de idempotency key;
- uniones DTO exactas y fechas UTC;
- mapping HTTPS estable y sanitización;
- ausencia de IDs privados, hashes y campos técnicos.

### 20.3 Aplicación y autorización

- Owner vigente aprueba, rechaza, lista y consulta;
- visitante, usuario común, integrante, admin global y Owner anterior denegados;
- Owner sin Persona/Membresía permitido;
- Grupo/request inexistente o incompatible sin filtración;
- una Membresía no concede autoridad.

### 20.4 Persistencia e idempotencia

- schemas exactos de decision intent y approval coordination;
- misma clave/misma acción recupera;
- misma clave/otro request o acción entra en conflicto;
- clave distinta sobre mismo terminal queda vinculada por un intent alias y devuelve `ALREADY_*` sin cambiar la Solicitud;
- respuesta perdida de rechazo;
- liberación segura elimina sólo claim y conserva intent, pendiente y guard;
- retry con intent liberado retoma la misma acción, mientras reutilización para otra acción/payload entra en conflicto;
- claim huérfano, duplicado o incompatible falla cerrado; intent sin claim se reconoce como intento liberado válido.

### 20.5 Coordinación y recuperación

- éxito completo con orden claim → Membresía → aprobación;
- fallo antes y después de cada commit;
- respuesta perdida tras cada commit;
- retry con Membresía ya creada por el mismo request;
- activa ajena no adoptada;
- lifecycle vigente no reactivado;
- no Temporada abierta y cambio de Temporada entre fases;
- Fase C nunca escribe `aprobada` sin verificación de Membresía;
- consulta distingue pendiente, en progreso y terminales.

### 20.6 Emulator concurrente determinista

Cada caso usa barreras controladas, inspección de cardinalidad y estado final:

1. dos aprobaciones con la misma clave;
2. dos aprobaciones con claves distintas;
3. aprobación contra rechazo, forzando cada orden ganador;
4. aprobación contra cancelación E2-06, forzando cada orden;
5. aprobación contra alta directa de Membresía, forzando cada commit ganador;
6. transferencia de Owner antes y después del claim;
7. respuesta perdida después del commit de Membresía;
8. respuesta perdida después del commit final;
9. Membresía activa previa propia de otra operación;
10. Solicitud/guard duplicado o huérfano;
11. active guard/Membresía duplicado, huérfano o incompatible;
12. intent y claim parciales o cruzados;
13. cancelación E2-06 contra creación del claim, forzando cancelación primero y claim primero;
14. rechazo contra creación del claim, forzando rechazo primero y claim primero;
15. Temporada ausente antes del claim, cerrada/cambiada antes del commit de Membresía y cambiada después de ese commit;
16. liberación confirmada y respuesta perdida de liberación, seguida por retry con la misma clave;
17. transferencia posterior al claim con continuación de la misma ejecución, retry del Owner anterior denegado y asistencia del Owner nuevo.

Cada escenario afirma exactamente: cantidad de Solicitudes por estado, Membresías activas, pending guards, active guards, decision intents y approval coordinations; IDs y hashes correlacionados; cero efectos en colecciones excluidas. No se acepta sólo un status HTTP.

### 20.7 Reglas, índices y arquitectura

- deny-all directo para ambas colecciones nuevas y todas las existentes involucradas;
- actores visitante, autenticado, candidata, Owner, integrante y admin global no leen/escriben Firestore directamente;
- callables funcionan con Admin SDK en Emulator;
- listado ejecuta con el índice existente;
- pruebas de frontera impiden imports de Repositorios ajenos y Firestore desde frontend;
- pruebas conductuales separadas de checks textuales.

### 20.8 Frontend

- confirmaciones de aprobar/rechazar y cancelación del diálogo;
- single-flight por fila;
- conservación/rotación correcta de clave;
- loading, vacío, éxito, error, in-progress e incierto;
- reconsulta después de respuesta perdida;
- desaparición sólo tras resultado terminal;
- teclado, foco, anuncios, labels y responsive;
- candidata ve aprobación en proceso sin acción inválida.

### 20.9 Regresión

- creación, consulta, cancelación y nueva intención E2-06;
- listado paginado, empate de timestamps y página posterior vacía;
- alta/finalización/consulta de Membresías E2-03–E2-05;
- Temporada abierta E2-02;
- cero doble escritura legacy.

## 21. UAT mínima

UAT posterior exclusivamente local, en navegador real, Emulator Suite, loopback, proyecto `demo-*`, Google Auth y datos sintéticos. Un fixture automatizado por Admin SDK crea Cuentas, Personas, Grupo, Temporada, Solicitudes y controles usando IDs registrados; las variantes se preparan mediante helpers versionados de fixture, nunca editando documentos a mano ni usando Emulator UI. No forma parte de esta definición documental.

Casos obligatorios:

1. Owner ve dos pendientes con datos mínimos.
2. Cancela el diálogo de aprobación y no cambia nada.
3. Aprueba una, observa progreso no optimista y luego confirmación.
4. Recarga y consulta el resultado `APPROVED` con la misma Membresía.
5. Simula respuesta incierta y recupera sin duplicados.
6. Rechaza otra y recarga el terminal `REJECTED`.
7. Verifica que rechazo no creó Membresía.
8. Verifica ausencia de Temporada abierta: la Solicitud permanece pendiente.
9. Verifica Owner transferido: anterior denegado y vigente autorizado.
10. Verifica teclado, foco, anuncios, 360 px, 768 px y escritorio.
11. Inspecciona cardinalidad y ausencia de escrituras en estructuras excluidas.

Fixtures y cleanup usan IDs registrados explícitamente; no borran colecciones completas, no dependen del orden de datos previos, no usan edición manual ni Emulator UI como preparación autoritativa y no dejan procesos residuales.

## 22. Criterios de aceptación Dado/Cuando/Entonces

1. **Dado** un Owner vigente y una Solicitud pendiente íntegra, **cuando** rechaza, **entonces** queda una única Solicitud `rechazada`, sin guard pendiente, con intent correlacionado y sin Membresía.
2. **Dado** el mismo rechazo confirmado, **cuando** se repite con la misma o una clave fresca compatible, **entonces** devuelve `ALREADY_REJECTED` sin escribir otra decisión.
3. **Dado** una Solicitud pendiente y Temporada abierta, **cuando** el Owner aprueba, **entonces** primero se confirma una única Membresía activa y después la Solicitud queda `aprobada` referenciándola.
4. **Dado** un fallo tras crear Membresía y antes de confirmar Solicitud, **cuando** se reintenta o asiste la coordinación, **entonces** se recupera esa misma Membresía y se confirma una sola aprobación.
5. **Dado** una respuesta perdida tras el commit final, **cuando** se consulta, **entonces** devuelve `APPROVED` estable sin repetir efectos.
6. **Dado** una Solicitud cancelada o rechazada, **cuando** se intenta aprobar, **entonces** no se crea Membresía y se devuelve el terminal estable.
7. **Dado** aprobación y rechazo concurrentes, **cuando** ambas alcanzan la frontera transaccional, **entonces** sólo una gana y jamás coexisten rechazo y Membresía creada por aprobación.
8. **Dado** aprobación y cancelación concurrentes, **cuando** compiten, **entonces** la ganadora bloquea a la otra y una cancelada nunca origina Membresía.
9. **Dado** dos aprobaciones concurrentes, **cuando** usan cualquier combinación de claves válidas, **entonces** existe como máximo un claim, una Membresía y una decisión.
10. **Dado** una Membresía activa ajena a la aprobación, **cuando** se intenta aprobar, **entonces** no se adopta, no se duplica y la Solicitud queda pendiente sin claim definitivo.
11. **Dado** un lifecycle finalizado, **cuando** se intenta aprobar, **entonces** devuelve `MEMBERSHIP_REACTIVATION_REQUIRED` y no reactiva ni crea.
12. **Dado** que no hay Temporada abierta, **cuando** se aprueba, **entonces** devuelve `OPEN_SEASON_REQUIRED` y no cambia Solicitud ni Membresía.
13. **Dado** un cambio de Owner antes del claim, **cuando** actúa el Owner anterior, **entonces** es denegado; **cuando** actúa el vigente, **entonces** puede decidir.
14. **Dado** un claim confirmado antes de transferir ownership, **cuando** continúa la coordinación, **entonces** puede converger; sólo el Owner vigente puede iniciar una nueva llamada de recuperación.
15. **Dado** un estado huérfano, duplicado o incompatible, **cuando** se lista, decide o consulta, **entonces** falla cerrado sin reparación ni éxito falso.
16. **Dado** una clave ya ligada a otra acción o Solicitud, **cuando** se reutiliza, **entonces** devuelve `IDEMPOTENCY_CONFLICT` y no escribe.
17. **Dado** cualquier actor no Owner, **cuando** usa callables o Firestore directo, **entonces** no obtiene ni modifica datos.
18. **Dado** una pantalla estrecha o navegación por teclado, **cuando** el Owner decide y recupera, **entonces** todos los estados y controles siguen siendo perceptibles y operables.

## 23. Riesgos y deuda aceptada

- No hay worker automático: una coordinación incierta converge cuando el Owner vigente consulta o reintenta. Es suficiente para el flujo mínimo, pero queda como deuda operativa observable.
- Decision intents no tienen TTL ni cleanup; su retención evita perder idempotencia.
- El N+1 del listado crece en hasta dos lecturas técnicas por item —claim e intent sólo cuando corresponde— y sigue acotado a páginas de 20. Optimizarlo requerirá medición y una ficha, no denormalización anticipada.
- No existe snapshot consistente entre páginas; se conserva la semántica E2-06.
- Una activa ajena puede dejar una Solicitud pendiente que sólo puede rechazarse o cancelarse; no se decide automáticamente.
- La reactivación continúa bloqueada por E2-05.
- El futuro cierre de Temporada deberá coordinar su carrera con altas de Membresía sin reinterpretar decisiones ya confirmadas.
- La eliminación o corrupción manual requiere intervención separada; E2-07 no repara datos.
- La UAT con lector de pantalla real podrá registrarse como limitación si no se dispone de esa herramienta; teclado, foco y anuncios siguen siendo obligatorios.

## 24. Inventario previsto de implementación

### 24.1 Backend a modificar

- `volley-ranking-system/functions/src/groupJoinRequests/domain/groupJoinRequest.js`
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestContract.js`
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestDto.js`
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestErrors.js`
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestHashing.js`
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestService.js`
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestRepository.js`
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore.js`
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/groupJoinRequestCallable.js`
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/groupJoinRequestModule.js`
- `volley-ranking-system/functions/src/memberships/public/groupJoinRequestMembershipCapability.js`
- infraestructura interna de Membresías estrictamente necesaria para la admisión por Solicitud;
- archivo de exports de Functions donde se registran los callables.

### 24.2 Frontend a modificar o agregar

- `volley-ranking-frontend/src/types/GroupJoinRequest.ts`
- `volley-ranking-frontend/src/services/groupJoinRequestsService.ts`
- `volley-ranking-frontend/src/components/groupJoinRequests/PendingGroupJoinRequestsSection.tsx`
- máquina/helper testeable de decisión y recuperación, si se separa del componente;
- adaptación mínima de `GroupJoinRequestCandidate` para `APPROVAL_IN_PROGRESS`.

### 24.3 Infraestructura y pruebas

- `volley-ranking-system/firestore.rules`
- `volley-ranking-system/firestore.indexes.json` sólo si Emulator demuestra un índice nuevo; expectativa: sin cambio;
- unitarias de dominio, contrato, DTO, service, store, hashing, callable, observabilidad y arquitectura;
- Emulator focal de decisión y regresión E2-06/Membresías;
- pruebas frontend de máquina/estado y checks de arquitectura.

No se prevén dependencias nuevas ni cambios de lockfile. El inventario puede ajustar nombres internos reversibles sin alterar contratos, schemas o responsabilidades fijados aquí.

## 25. Checkpoint, rollback y evidencia futura

- **Base:** `dev` en `2aaa2500bd746769b30c189f9237688bc4d34ba9`.
- **Rama futura sugerida:** `feat/e2-07-group-join-request-decision`.
- **Rollback de código:** revertir el incremento completo; no habilitar doble escritura legacy.
- **Datos locales de prueba:** cleanup por IDs explícitos.
- **Interrupción obligatoria:** contradicción funcional nueva, corrupción no clasificable, necesidad de mutar otro Agregado fuera de la coordinación definida o imposibilidad de demostrar carreras críticas.

El informe futuro deberá registrar commits, diff, schemas reales, contratos, resultados unitarios, Emulator, reglas, arquitectura, frontend, UAT, warnings históricos separados, cardinalidad final y ausencia de efectos colaterales. El cierre futuro deberá confirmar integración y habilitar el siguiente incremento sólo para definición.

## 26. Definición de terminado

E2-07 podrá declararse implementado y luego cerrado únicamente cuando:

- los tres contratos nuevos y el listado evolucionado coincidan exactamente con esta ficha;
- los cuatro estados de Solicitud y sus schemas estén implementados con hidratación estricta;
- rechazo sea atómico dentro de Solicitud;
- aprobación respete el orden claim → Membresía confirmada → Solicitud aprobada;
- no exista transacción de escritura multi-Agregado;
- retries, claves incompatibles y respuestas perdidas converjan autoritativamente;
- todas las carreras críticas tengan escenario Emulator determinista y cardinalidad exacta;
- reglas deny-all y ausencia de Firestore frontend estén verificadas;
- no haya índice nuevo salvo evidencia reproducible;
- UX Owner y compatibilidad candidata cumplan single-flight, incertidumbre, accesibilidad y responsive;
- no se modifiquen Grupo, Persona, Usuario, Temporada, arrays legacy ni capacidades excluidas;
- pruebas, UAT y controles de calidad autorizados en la futura implementación estén aprobados;
- el informe y cierre documenten riesgos residuales sin declarar garantías no probadas.

## Veredicto documental

**E2-07 APROBADO — LISTO PARA VERSIONAR**
