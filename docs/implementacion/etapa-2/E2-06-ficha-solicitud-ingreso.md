# Ficha de Incremento Implementable E2-06 — Solicitud propia de ingreso a Grupo

## Estado de la ficha

- **Estado:** `LISTA PARA VERSIONAR`.
- **Fecha de definición:** 2026-09-03.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Corte aprobado:** creación, consulta y cancelación mínima de Solicitud propia de ingreso, con consulta de pendientes por el Owner.
- **Fuente de verdad principal:** Solicitud.
- **Actores:** Persona candidata autenticada y Owner vigente del Grupo.
- **Casos de uso atendidos:** CU-031 — Solicitar ingreso a un Grupo, incluida su cancelación propia mínima; consulta owner-scoped de pendientes necesaria para hacer observable el flujo.
- **Checkpoint documental:** rama `dev`, commit `d0d3a4774f4bd65f9c740b39d906c43207e97331`, upstream `origin/dev`, divergencia `0/0` y working tree limpio al iniciar la definición.
- **Archivo único autorizado:** `docs/implementacion/etapa-2/E2-06-ficha-solicitud-ingreso.md`.

Esta ficha define exclusivamente E2-06. No implementa código, no crea una rama y no modifica reglas, índices, dependencias, lockfiles, Documentos 1–5 ni incrementos anteriores. La implementación requerirá una autorización posterior y una rama propia.

## 1. Identificación y título

- **Identificador:** E2-06.
- **Título final:** Solicitud propia de ingreso a Grupo.
- **Objetivo resumido:** materializar Solicitud como fuente de verdad independiente y completar el autoservicio mínimo de creación, consulta y cancelación propia, permitiendo al Owner consultar pendientes sin resolverlas.
- **Resultado observable:** una Persona candidata accede mediante un Grupo opaco conocido, crea una única Solicitud pendiente, recupera su estado, puede cancelarla y posteriormente iniciar una intención nueva; el Owner vigente lista las pendientes de su Grupo.
- **Transiciones incluidas:** creación en `pendiente` y `pendiente → cancelada`.

## 2. Fuentes normativas y vinculantes

### 2.1 Documentos 1–4

1. **Documento 1 — Arquitectura del Producto y Modelo de Dominio**:
   - Grupo expone únicamente la información pública necesaria;
   - Membresía es la relación Persona–Grupo;
   - ningún dominio modifica información de otro dominio;
   - ownership y pertenencia son relaciones distintas.
2. **Documento 1.5 — Modelo Conceptual del Dominio**:
   - Solicitud representa una acción pendiente de aprobación;
   - Persona es la identidad deportiva permanente;
   - los roles contextuales pertenecen a Membresía y no a Usuario.
3. **Documento 2 — Modelo Funcional y Casos de Uso**:
   - PF-02 incluye Solicitudes de ingreso;
   - CU-031 define solicitar ingreso a un Grupo;
   - CU-032 y CU-033 definen aprobación y rechazo como casos separados;
   - una Solicitud no puede aprobarse si ya existe Membresía activa en el Grupo.
4. **Documento 3 — Arquitectura Funcional y Diseño Técnico**:
   - Solicitud es el único Aggregate Root del Agregado Solicitud;
   - el Módulo Solicitudes administra estado, decisión e historial propios;
   - Persona, Grupo y Membresía permanecen fuera del Agregado;
   - resolver una Solicitud y originar una Membresía no crea una unidad de consistencia común.
5. **Documento 4 — Diseño de la Arquitectura de Software**:
   - Solicitud es uno de los Agregados normativos cerrados;
   - cada instancia es una unidad de consistencia independiente;
   - los Repositorios, contratos y modelos de lectura no deben exponer documentos Firestore ni Aggregate Roots externos.

### 2.2 Documento 5

- Solicitud debe reemplazar solicitudes embebidas como fuente de verdad objetivo.
- Grupo, Membresía, Solicitud y Temporada conservan Agregados separados.
- No se permite doble escritura ni migración general implícita.
- El frontend forma parte del incremento.
- Cada índice, contrato, payload, regla de seguridad y decisión física se define en la ficha del incremento que lo necesita.
- La salida de Etapa 2 exige que Grupo no contenga Membresías ni Solicitudes.

### 2.3 Incrementos vinculantes

- **E1-01:** Cuenta de Usuario mínima y autenticación.
- **E1-02:** Persona propia y vínculo `users/{uid}.personaId`.
- **E1-03:** autorización contextual inicial y aislamiento de autoridad global.
- **E2-01:** Grupo canónico schema v1 y ownership actual.
- **E2-02:** Temporada abierta independiente y capacidad pública de contexto.
- **E2-03:** Membresía activa y unicidad Persona–Grupo.
- **E2-04:** consulta de Membresías activas propias y contexto member-safe.
- **E2-05:** finalización propia y lifecycle vigente sin reactivación ni renovación.

E2-05 está cerrado. Su veredicto habilita E2-06 únicamente para definición.

### 2.4 Desviación deliberada del mapa preliminar

Documento 5 ubicó preliminarmente renovación de Membresía como posible E2-06. Esa numeración era una descomposición implementable del roadmap, no una secuencia funcional inmutable.

El orden se corrige porque:

1. renovación requiere una nueva Temporada y la evolución de cierre e historial todavía no existe;
2. Solicitud es una fuente de verdad principal de Etapa 2 aún inexistente;
3. el producto canónico todavía carece de un flujo entre Personas distintas;
4. incorporar Solicitud reduce antes la brecha estructural de solicitudes embebidas;
5. no se modifica Documento 5 durante esta intervención.

Renovación, reactivación y evolución de Temporada conservan sus casos de uso y deberán recibir fichas propias.

## 3. Decisiones aprobadas materializadas

1. Solicitud es un Agregado independiente.
2. La Solicitud de este corte referencia exclusivamente `personId` y `groupId`.
3. No contiene `seasonId` ni `membershipId`.
4. Los únicos estados válidos son `pendiente` y `cancelada`.
5. Sólo la Persona candidata crea, consulta y cancela su propia Solicitud.
6. Sólo el Owner vigente consulta pendientes del Grupo.
7. El Owner no puede solicitar ingreso a su propio Grupo.
8. Una Membresía activa impide crear la Solicitud.
9. Una Membresía finalizada no impide crearla ni determina su resolución futura.
10. Existe como máximo una Solicitud pendiente por Persona–Grupo.
11. Cancelar libera esa unicidad y permite una nueva intención con una clave de idempotencia nueva.
12. El Grupo debe ser canónico schema v1 y estar activo al crear.
13. No se exige una Temporada abierta.
14. El acceso inicial usa sólo enlace compartido o `groupId` opaco conocido.
15. No existe búsqueda, directorio ni enumeración de Grupos.
16. El preview no expone Owner, integrantes, emails, Temporada, configuración ni información deportiva o comercial.
17. El Owner ve sólo nombre y apellido de la Persona candidata.
18. Aprobación, rechazo y coordinación con Membresía pertenecen a E2-07.
19. No se escribe estado en Grupo ni en arrays legacy.
20. Plan y Suscripción no participan.

## 4. Actores

| Actor | Participación | Contexto | Resultado esperado |
|---|---|---|---|
| Persona candidata | Actor principal de preview, creación, consulta y cancelación | Usuario autenticado con Cuenta y Persona propia vinculada; no Owner ni integrante activo | Controlar su intención de ingreso |
| Owner vigente | Actor principal de consulta de pendientes | Ownership actual de un Grupo canónico activo | Ver candidaturas mínimas sin resolverlas |
| Sistema | Coordina identidad, contratos, validaciones, persistencia e idempotencia | Backend confiable | Mantener unicidad, privacidad e integridad |
| Membresías | Proveedor de contexto | Consulta pública mínima sobre pertenencia activa | Impedir solicitudes de integrantes activos |
| Grupos | Proveedor de contexto | Consulta pública candidate-safe u owner-scoped | Validar Grupo, estado y ownership |
| Personas | Proveedor de contexto | Identidad propia y presentación mínima al Owner | Entregar sólo nombre y apellido |

No participan administradores delegados, integrantes, visitantes, servicios externos, notificaciones, Comercial ni Firebase cliente.

## 5. Precondiciones y dependencias

### 5.1 Persona candidata

- token Firebase válido; el UID no puede llegar en el payload;
- `users/{uid}` compatible con Cuenta;
- `users/{uid}.personaId` presente;
- Persona referenciada existente y compatible;
- Grupo indicado mediante ID opaco exacto;
- Grupo canónico schema v1 y `estado: "activo"` al crear;
- el UID no coincide con `group.ownerId`;
- no existe Membresía activa de esa Persona en ese Grupo;
- no existe otra Solicitud pendiente Persona–Grupo, salvo recuperación de la misma intención.

### 5.2 Owner

- token válido y Cuenta compatible;
- Grupo canónico compatible;
- `group.ownerId` coincide con el UID autenticado dentro de la lectura consistente del listado.

El Owner no necesita Persona ni Membresía para consultar pendientes. La Persona candidata no necesita Temporada abierta.

### 5.3 Habilitación comercial

`NO APLICA`. Plan y Suscripción no existen como capacidades operativas y no pueden sustituirse por ownership, Membresía o `users.roles`.

## 6. Casos de uso y flujo principal

### 6.1 Preview candidate-safe

1. La Persona abre `/join/groups/[groupId]` mediante un enlace conocido.
2. El frontend invoca `getKnownGroupJoinPreview({ groupId })`.
3. Backend deriva UID, Cuenta y Persona.
4. Grupos valida el documento canónico activo y que el actor no sea el Owner.
5. Membresías confirma que la Persona no posee una Membresía activa.
6. Se devuelve exclusivamente `id`, `nombre` y `deporte`.
7. El frontend consulta por separado la Solicitud vigente propia.

El preview no concede acceso a `/dashboard/groups/[groupId]`, al detalle legacy ni a ninguna operación administrativa.

### 6.2 Crear mi Solicitud

1. La Persona confirma explícitamente “Solicitar ingreso”.
2. El frontend genera una clave de idempotencia nueva para esa intención y bloquea doble envío local.
3. Invoca `createMyGroupJoinRequest({ groupId, idempotencyKey })`.
4. Aplicación valida identidad, Cuenta y Persona propia.
5. Dentro de la unidad transaccional obtiene contexto candidate-safe de Grupo y consulta el contexto activo de Membresías mediante contratos públicos.
6. Se examinan la intención persistente, la consulta autoritativa de pendientes y el control técnico de unicidad.
7. Solicitud crea un Aggregate Root nuevo en estado `pendiente` sólo si la intención es nueva y no existe otra pendiente.
8. Se persisten Solicitud, intención idempotente y guard pendiente en el mismo commit.
9. Se devuelve `CREATED_PENDING` o un outcome idempotente confirmado.
10. El frontend muestra el estado persistido sin actualización optimista.

### 6.3 Consultar mi Solicitud vigente

1. El frontend invoca `getMyCurrentGroupJoinRequest({ groupId })`.
2. Backend deriva Persona propia.
3. El reader consulta autoritativamente hasta dos Solicitudes pendientes Persona–Grupo y lee el guard determinista.
4. Aplica la matriz estricta de integridad entre resultado autoritativo y guard.
5. Devuelve la única Solicitud pendiente propia correlacionada o `null` sólo ante cero pendientes y guard ausente.

Una Solicitud cancelada no es vigente y no se devuelve mediante este contrato.

### 6.4 Cancelar mi Solicitud

1. La Persona confirma la cancelación de la Solicitud visible.
2. El frontend invoca `cancelMyGroupJoinRequest({ groupId, requestId })`.
3. Backend deriva Persona propia; no acepta identidad cliente.
4. En transacción se leen la Solicitud indicada, hasta dos pendientes autoritativas Persona–Grupo y el guard determinista.
5. El Aggregate Root aplica `pendiente → cancelada` y fija el instante backend.
6. Se actualiza la Solicitud y se elimina el guard pendiente en el mismo commit.
7. Se devuelve `CANCELLED`.
8. Un retry sobre la misma Solicitud cancelada devuelve `ALREADY_CANCELLED` sin escribir.

La intención idempotente de creación se conserva para recuperar respuestas perdidas. Una nueva solicitud exige una clave nueva.

### 6.5 Listar pendientes del Grupo propio

1. El Owner abre el detalle canónico de su Grupo.
2. El frontend invoca `listPendingGroupJoinRequestsForOwnedGroup({ groupId, pageSize?, cursor? })`.
3. Backend valida ownership vigente dentro de una lectura consistente.
4. Consulta sólo Solicitudes `pendiente` del Grupo, ordenadas por `createdAt DESC, __name__ DESC`.
5. Para cada item, dentro del límite de página, valida la consulta autoritativa Persona–Grupo con límite 2 y su guard; cualquier inconsistencia hace fallar la página completa.
6. Personas proporciona nombre y apellido para cada resultado mediante una capacidad pública mínima; una Persona ausente o incompatible hace fallar la página completa.
7. Se devuelve una página cerrada y un cursor opaco opcional.
8. No se ofrecen acciones de aprobar o rechazar.

## 7. Alcance incluido

- Agregado Solicitud de ingreso y sus dos estados mínimos;
- preview autenticado candidate-safe por Grupo conocido;
- creación propia explícita e idempotente;
- consulta de la única pendiente propia para un Grupo;
- cancelación propia pendiente;
- nueva intención posterior a cancelación;
- listado owner-scoped paginado y determinista;
- composición mínima de nombre y apellido;
- contratos backend, DTO, errores y outcomes cerrados;
- Repositorio de Solicitudes, readers, guards y adaptadores;
- reglas deny-all de nuevas colecciones;
- índice compuesto exacto del listado;
- frontend candidato y sección owner-scoped;
- pruebas unitarias, contractuales, Emulator, arquitectura y UAT;
- observabilidad sanitizada;
- aislamiento explícito del legado.

## 8. Exclusiones

- aprobar o rechazar Solicitudes;
- crear, finalizar, reactivar, renovar o modificar Membresías;
- decidir la clase de Membresía futura;
- invitaciones iniciadas por Owner;
- alta administrativa directa;
- búsqueda de Personas;
- búsqueda, directorio o enumeración de Grupos;
- acceso anónimo o público al preview;
- historial global o listado de todas las Solicitudes propias;
- consulta owner-scoped de canceladas;
- expiración o reapertura de Solicitudes;
- notificaciones, email, push o Actividad;
- roles, cargos, permisos o administradores delegados;
- Temporada y sus estados;
- Plan, Suscripción o límites comerciales;
- migración, lectura, escritura o retiro de solicitudes legacy;
- backfill, reparación automática o doble escritura;
- aprobación desde arrays o endpoints legacy;
- cambios en Documentos 1–5 o incrementos anteriores.

## 9. Modelo de dominio

### 9.1 Aggregate Root Solicitud

Cada Solicitud de ingreso constituye una unidad de consistencia independiente. Administra exclusivamente:

- identidad propia;
- referencia a Persona candidata;
- referencia a Grupo destino;
- estado propio;
- instante de creación;
- instante de cancelación cuando corresponda.

Persona, Grupo y Membresía permanecen fuera. La Solicitud no administra su información, no copia emails y no crea pertenencia.

### 9.2 Representación `pendiente` v1

El documento contiene exactamente:

```text
personId
groupId
estado: "pendiente"
createdAt
schemaVersion: 1
```

### 9.3 Representación `cancelada` v1

El documento contiene exactamente:

```text
personId
groupId
estado: "cancelada"
createdAt
cancelledAt
schemaVersion: 1
```

`cancelledAt` es el único dato temporal agregado por la cancelación. No existen resolutor, motivo, decisión administrativa, `seasonId`, `membershipId`, `updatedAt`, historial embebido ni estado técnico.

### 9.4 Hidratación estricta

- claves exactas según el discriminante `estado`;
- `schemaVersion === 1`;
- IDs no vacíos, sin trim pendiente y sin separadores inválidos;
- timestamps Firestore válidos;
- `cancelledAt >= createdAt`;
- una cancelada no puede volver a pendiente;
- estados distintos de los dos aprobados fallan como incompatibles.

E2-07 podrá evolucionar el schema mediante una unión discriminada nueva. No se anticipan hoy campos ni estados de esa evolución.

## 10. Invariantes y transiciones

1. Existe como máximo una Solicitud `pendiente` por Persona–Grupo.
2. El Owner del Grupo no puede crear una Solicitud hacia sí mismo.
3. Una Persona con Membresía activa no puede solicitar ingreso al mismo Grupo.
4. Una Membresía finalizada no impide solicitar.
5. Crear no requiere Temporada abierta.
6. Sólo la Persona referenciada puede consultar o cancelar su Solicitud.
7. Sólo `pendiente` admite cancelación.
8. Cancelar no elimina la Solicitud.
9. Cancelar no modifica Persona, Grupo ni Membresía.
10. Una cancelada permanece terminal dentro de E2-06.
11. Una nueva intención posterior crea una nueva Solicitud con identidad distinta.
12. Repetir una intención anterior nunca crea una Solicitud nueva.

Máquina de estados:

```text
[nueva intención válida] -> pendiente
pendiente -> cancelada
cancelada -> [sin transición E2-06]
```

## 11. Contratos públicos

| Contrato | Tipo | Actor | Resultado |
|---|---|---|---|
| `getKnownGroupJoinPreview` | Consulta | Persona candidata | Preview mínimo del Grupo |
| `createMyGroupJoinRequest` | Modificador | Persona candidata | Solicitud pendiente o recuperación idempotente |
| `getMyCurrentGroupJoinRequest` | Consulta | Persona candidata | Pendiente propia o `null` |
| `cancelMyGroupJoinRequest` | Modificador | Persona candidata | Solicitud cancelada confirmada |
| `listPendingGroupJoinRequestsForOwnedGroup` | Consulta paginada | Owner vigente | Página de pendientes con identidad mínima |

Ningún contrato expone documentos Firestore, Aggregate Roots, guards, hashes, UID, email o modelos internos.

### 11.1 Capacidades internas entre módulos

| Proveedor | Capacidad pública mínima | Consumidor |
|---|---|---|
| Grupos | validar y obtener contexto candidate-safe por ID conocido | Solicitudes |
| Grupos | confirmar ownership vigente en una lectura consistente | Solicitudes |
| Membresías | confirmar ausencia de Membresía activa Persona–Grupo dentro de la transacción | Solicitudes |
| Personas | resolver Persona propia desde Cuenta | Solicitudes |
| Personas | proyectar `firstName` y `lastName` de una Persona referenciada | listado Owner |

Las capacidades pueden aceptar el contexto transaccional de infraestructura necesario, pero no exponen Repositorios, guards ni documentos.

## 12. Payloads cerrados

### 12.1 Preview

```text
getKnownGroupJoinPreview({ groupId })
```

### 12.2 Crear

```text
createMyGroupJoinRequest({ groupId, idempotencyKey })
```

### 12.3 Consultar propia vigente

```text
getMyCurrentGroupJoinRequest({ groupId })
```

### 12.4 Cancelar

```text
cancelMyGroupJoinRequest({ groupId, requestId })
```

### 12.5 Listar para Owner

```text
listPendingGroupJoinRequestsForOwnedGroup({ groupId, pageSize?, cursor? })
```

Reglas comunes:

- objeto plano con prototipo normal o nulo;
- rechazo de `null`, arrays, instancias y propiedades desconocidas;
- `groupId` y `requestId`: string opaco de 1 a 1500 bytes UTF-8, trim canónico y sin `/`;
- `idempotencyKey`: `^[A-Za-z0-9._:-]{16,128}$`, conservada por el frontend durante retries de la misma intención y nunca persistida ni registrada en crudo;
- `pageSize`: entero entre 1 y 20, default 20;
- `cursor`: base64url canónico no vacío, máximo 2048 caracteres;
- UID, `personId`, estado, fechas, Owner, Temporada, Membresía, roles y permisos nunca llegan desde cliente.

## 13. DTO y outcomes

### 13.1 Preview exacto

```text
group: {
  id
  nombre
  deporte
}
```

### 13.2 Solicitud propia pendiente

```text
request: {
  id
  groupId
  estado: "pendiente"
  createdAt
}
```

### 13.3 Solicitud propia cancelada

```text
request: {
  id
  groupId
  estado: "cancelada"
  createdAt
  cancelledAt
}
```

### 13.4 Resultado de creación

```text
{
  outcome: "CREATED_PENDING" | "EXISTING_PENDING" | "EXISTING_CANCELLED",
  request: OwnGroupJoinRequest
}
```

`EXISTING_CANCELLED` sólo recupera la intención anterior. El frontend debe generar una clave nueva si la Persona decide volver a solicitar.

### 13.5 Consulta propia

```text
{ request: PendingOwnGroupJoinRequest | null }
```

### 13.6 Resultado de cancelación

```text
{
  outcome: "CANCELLED" | "ALREADY_CANCELLED",
  request: CancelledOwnGroupJoinRequest
}
```

### 13.7 Item owner-scoped

```text
{
  id
  estado: "pendiente"
  createdAt
  person: {
    firstName
    lastName
  }
}
```

No se expone `personId`, UID ni email. La salida paginada es exactamente:

```text
{
  items: PendingGroupJoinRequestForOwner[]
  nextCursor: string | null
}
```

La ausencia de resultados, tanto en la primera página como en una página posterior válida, se representa exactamente como:

```json
{
  "items": [],
  "nextCursor": null
}
```

Todas las fechas públicas se serializan como ISO-8601 UTC válido.

## 14. Autorización y privacidad

| Operación | Visitante | Usuario sin Persona | Candidata válida | Owner del destino | Integrante activo | Global admin no Owner |
|---|---|---|---|---|---|---|
| Preview | Denegado | Denegado | Permitido | Rechazo estable | Rechazo estable | Igual que cualquier candidata |
| Crear propia | Denegado | Denegado | Permitido | Denegado | Denegado | Sin privilegio adicional |
| Consultar propia | Denegado | Denegado | Sólo propia | Sólo si fuera creador, caso prohibido al alta | Sólo una solicitud propia preexistente | Sin privilegio adicional |
| Cancelar propia | Denegado | Denegado | Sólo pendiente propia | Sin privilegio por ownership | Sin privilegio por Membresía | Sin privilegio adicional |
| Listar pendientes | Denegado | No aplica Persona | Denegado | Permitido | Denegado | Denegado |

Reglas obligatorias:

- UID exclusivamente desde token verificado;
- Persona exclusivamente desde Cuenta compatible;
- ownership exclusivamente desde Grupo canónico vigente;
- `users.roles`, email, arrays legacy y claims no aprobados no autorizan;
- Membresía no concede administración de Solicitudes;
- conocer `groupId` sólo permite intentar el preview mínimo;
- inexistencia, schema incompatible o Grupo inactivo se presentan a la candidata mediante `GROUP_NOT_AVAILABLE`, sin distinguir la causa;
- el Owner que intenta solicitar recibe `OWNER_CANNOT_REQUEST`;
- la Persona con Membresía activa recibe `ACTIVE_MEMBERSHIP_EXISTS`;
- los errores no exponen Persona, Owner, existencia de otras Solicitudes, guards ni estado interno.

## 15. Persistencia física

### 15.1 Colecciones

| Colección | Finalidad | Naturaleza | Acceso cliente |
|---|---|---|---|
| `groupJoinRequests/{requestId}` | Estado original de cada Solicitud | Agregado/fuente de verdad | Deny-all |
| `pendingGroupJoinRequestGuards/{guardId}` | Unicidad pendiente Persona–Grupo | Coordinación técnica vigente | Deny-all |
| `groupJoinRequestIntents/{intentId}` | Recuperación idempotente de creación | Registro técnico persistente | Deny-all |

No se crea una colección para preview, listado, historial, Persona proyectada, notificaciones o estados técnicos.

### 15.2 Guard pendiente exacto

ID determinista, usando la codificación UTF-8 length-prefixed ya aprobada en E2-03 sobre este vector exacto:

```text
["sportexa:E2-06:pending-group-join-request-guard:v1", groupId, personId]
```

Campos exactos:

```text
requestId
personId
groupId
createdAt
guardVersion: 1
```

El guard existe exactamente mientras la Solicitud está pendiente. No es Solicitud, historial, autorización ni fuente funcional.

### 15.3 Intención idempotente exacta

Hashes e ID determinista, usando la misma codificación UTF-8 length-prefixed:

```text
intentId = sha256([
  "sportexa:E2-06:group-join-request-intent-id:v1",
  userId,
  idempotencyKey
])

requestHash = sha256([
  "sportexa:E2-06:create-my-group-join-request:v1",
  "contract-v1",
  personId,
  groupId
])
```

Campos exactos:

```text
requestId
personId
groupId
requestHash
createdAt
intentVersion: 1
```

Cada resultado SHA-256 se representa en hexadecimal minúsculo de 64 caracteres. El dominio técnico estable, el `userId` autenticado y la clave forman la identidad de intención; `intentId` no contiene `groupId`, `personId` ni payload funcional. Así, la misma clave del mismo actor siempre alcanza el mismo documento incluso si se intenta reutilizar para otro Grupo. Actores diferentes no colisionan por compartir una clave.

`requestHash` cubre la versión contractual, el `personId` autoritativamente derivado, `groupId` y todo dato funcional admitido por el comando; no cubre timestamps ni datos técnicos. Misma identidad y mismo hash recuperan el resultado; misma identidad y hash distinto producen `IDEMPOTENCY_CONFLICT`. La clave cruda nunca se persiste ni registra.

La intención se conserva tras cancelar y liberar el guard para recuperar correctamente un retry tardío. Una nueva intención exige una clave nueva. En E2-06 los intents no se actualizan, eliminan, reutilizan ni expiran; no se implementa TTL. Su crecimiento y futura política de depuración quedan como deuda explícita.

La primera creación genera una sola instancia temporal backend dentro de cada intento transaccional; el mismo valor confirmado se utiliza como `createdAt` de Solicitud, guard e intención. La cancelación genera una sola instancia temporal backend por intento y la utiliza como `cancelledAt`.

### 15.4 Identidad de Solicitud

`requestId` es opaco y generado por backend. Cada nueva intención posterior a cancelación recibe un ID nuevo. No se usa un ID determinista Persona–Grupo porque eso confundiría una nueva Solicitud con reactivación del Agregado cancelado.

### 15.5 Referencias

| Referencia | Destino | Validación | ¿Integra Solicitud? |
|---|---|---|---|
| `personId` | Persona | Propia al crear; existente/compatible al listar | No |
| `groupId` | Grupo | Canónico activo al crear; ownership al listar | No |

No existen referencias a Temporada o Membresía.

### 15.6 Datos derivados

No se persisten proyecciones. Nombre y apellido se componen al consultar desde Persona. El preview se compone desde Grupo. Un fallo de composición falla cerrado y no modifica la Solicitud.

### 15.7 Consulta autoritativa de pendiente

La Solicitud en `groupJoinRequests` es la única fuente de verdad funcional. Para un par Persona–Grupo se ejecuta esta consulta con límite estricto 2:

```text
where(personId == ...)
where(groupId == ...)
where(estado == "pendiente")
limit(2)
```

El guard determinista se lee además como control de contención, nunca como sustituto de la consulta. La matriz obligatoria es:

| Pendientes autoritativas | Guard | Resultado |
|---:|---|---|
| 0 | Ausente | Ausencia legítima |
| 1 | Ausente | `INCOMPATIBLE_STATE` |
| Más de 1 | Ausente o presente | `INCOMPATIBLE_STATE` |
| 0 | Presente | `INCOMPATIBLE_STATE` |
| 1 | Presente, pero IDs o contexto difieren | `INCOMPATIBLE_STATE` |
| 1 | Presente y correlacionado por `requestId`, `personId` y `groupId` | Estado válido |

Esta resolución se usa en creación, consulta propia vigente, cancelación y validación de cada item del listado Owner. No adopta huérfanos, repara, elimina controles, selecciona arbitrariamente entre duplicadas ni convierte corrupción en ausencia.

## 16. Índices y cursor

### 16.1 Índice nuevo exacto

Agregar únicamente:

```text
collectionGroup: groupJoinRequests
queryScope: COLLECTION
groupId: ASCENDING
estado: ASCENDING
createdAt: DESCENDING
```

El orden total contractual es `createdAt DESC, requestId DESC`; físicamente se expresa como `createdAt DESC, documentId()/__name__ DESC`. `__name__` actúa sólo como desempate documental. Se verificará en Emulator Suite si Firestore lo incorpora implícitamente con la dirección descendente del último campo del índice. El índice aprobado contiene exactamente los tres campos declarados y no incorpora un campo `__name__` manual. Si Emulator contradijera esta premisa, la implementación deberá detenerse y reportar la evidencia antes de modificar `firestore.indexes.json`.

Consulta servida:

```text
where(groupId == ...)
where(estado == "pendiente")
orderBy(createdAt, "desc")
orderBy(documentId(), "desc")
limit(pageSize + 1)
```

La consulta de igualdad con límite 2 de la sección 15.7 se probará primero con los índices automáticos de Firestore en Emulator Suite. Si Firestore exigiera un índice adicional, la implementación deberá detenerse, conservar como único compuesto aprobado el listado anterior y reportar la evidencia antes de modificar `firestore.indexes.json`. Preview, lecturas documentales de guard e intención y accesos por ID no requieren índices compuestos nuevos previstos.

### 16.2 Cursor opaco

El cursor contiene exactamente una envoltura canónica base64url con:

```text
v: 1
contract: "listPendingGroupJoinRequestsForOwnedGroup:v1"
order: "createdAt:desc,__name__:desc"
groupId
lastCreatedAt: { seconds, nanoseconds }
lastRequestId
checksum
```

El cursor representa conjuntamente `createdAt` y `requestId`. El checksum usa SHA-256 con dominio separado y JSON canónico, siguiendo E2-04. Se rechazan base64url no canónico, versión, contrato, orden, Grupo, timestamp, ID, checksum, longitud o propiedades incompatibles con `VALIDATION_FAILED`. El cursor no autoriza: ownership se verifica en cada página.

`pageSize` tiene default 20, máximo 20 y mínimo 1; ausente adopta el default y cualquier número no entero o fuera del rango se rechaza. La consulta obtiene `pageSize + 1`, devuelve a lo sumo `pageSize` y genera `nextCursor` sólo si existe un item adicional. El cursor usa ambos componentes del último item devuelto mediante `startAfter(createdAt, documentId())`, por lo que timestamps iguales no producen duplicados ni omisiones dentro del orden observado.

Una primera página o una página posterior válida sin resultados devuelve exactamente `{ "items": [], "nextCursor": null }`. Un cursor inválido falla; no se transforma en primera página. No se promete snapshot global entre páginas: inserciones, cancelaciones o cambios concurrentes pueden alterar páginas posteriores, pero cada respuesta respeta el orden total y no presenta un cursor como autorización. No se filtran silenciosamente Solicitudes corruptas ni Personas ausentes o incompatibles: falla la página completa con `INCOMPATIBLE_STATE` sanitizado.

## 17. Transacciones, idempotencia y concurrencia

### 17.1 Creación

En cada intento transaccional se leen antes de escribir:

1. Grupo canónico y ownership para excluir al Owner;
2. contexto de Membresía activa Persona–Grupo;
3. intención idempotente;
4. guard pendiente;
5. consulta autoritativa Persona–Grupo–`pendiente` con límite 2;
6. Solicitud referenciada por la intención o el guard cuando no coincida ya con el resultado autoritativo.

Ramas:

- **intención íntegra + mismo `requestHash` + Solicitud pendiente correlacionada:** `EXISTING_PENDING`, sin escritura;
- **intención íntegra + mismo `requestHash` + Solicitud cancelada:** `EXISTING_CANCELLED`, sin escritura;
- **misma identidad de intención + `requestHash` incompatible, incluido otro Grupo:** `IDEMPOTENCY_CONFLICT`;
- **otra intención + guard pendiente íntegro:** `REQUEST_ALREADY_PENDING`;
- **sin intención ni pendiente:** crear los tres documentos atómicamente;
- **Membresía activa:** `ACTIVE_MEMBERSHIP_EXISTS`, sin escritura;
- **Owner actual:** `OWNER_CANNOT_REQUEST`, sin escritura;
- **cualquier combinación inválida de consulta autoritativa, guard, intención o Solicitud:** `INCOMPATIBLE_STATE`, sin reparación.

Antes de decidir ausencia o recuperación se aplica siempre la matriz de la sección 15.7. Cero pendientes sólo habilita creación o `null` cuando el guard está ausente; una pendiente huérfana nunca permite crear otra. Las tres escrituras nuevas se realizan únicamente después de completar todas las lecturas transaccionales.

Dos creaciones concurrentes iguales convergen en una Solicitud. Dos claves distintas para Persona–Grupo dejan como máximo una pendiente: una crea y la otra obtiene `REQUEST_ALREADY_PENDING` o un conflicto recuperable que, al reintentar, produce ese resultado estable.

### 17.2 Creación concurrente con Membresía activa

La ausencia de Membresía activa se consulta mediante una capacidad pública transaccional del Módulo Membresías que verifica su estado autoritativo y correlación técnica. Una creación de Membresía que escriba el mismo control activo fuerza reintento de la transacción de Solicitud si gana primero.

Con los contratos actuales, la creación de Membresía propia exige ownership y E2-06 prohíbe al Owner solicitar; por tanto no existe un camino público E2-06 que cree ambos estados para el mismo actor. E2-07 deberá hacer que su coordinación de Membresía lea o resuelva el guard pendiente antes de crear pertenencia. E2-06 no modifica CU-025.

### 17.3 Cancelación

La cancelación lee la Solicitud indicada, ejecuta la consulta autoritativa con límite 2 y lee el guard antes de escribir. Aplica primero la matriz de la sección 15.7:

- pendiente propia + guard íntegro: actualiza a cancelada y elimina guard atómicamente;
- cancelada propia: `ALREADY_CANCELLED`, sin escritura;
- estado futuro distinto de pendiente/cancelada: `REQUEST_NOT_PENDING`, sin escritura;
- request inexistente o ajeno: `REQUEST_NOT_FOUND`, sin revelar existencia;
- pendiente sin guard, guard ajeno, huérfano, duplicado o corrupto: `INCOMPATIBLE_STATE`.

Dos cancelaciones concurrentes convergen en `CANCELLED` y `ALREADY_CANCELLED`. La Solicitud nunca se elimina.

### 17.4 Cancelación concurrente con retry de creación

- un retry con la misma intención nunca crea otro Agregado;
- si observa la transición ya confirmada devuelve `EXISTING_CANCELLED`;
- si recupera primero la pendiente, la cancelación posterior la lleva a cancelada;
- el resultado final contiene una única Solicitud para esa intención y ninguna pendiente después de confirmar la cancelación;
- una nueva clave puede recibir transitoriamente `REQUEST_ALREADY_PENDING` si la cancelación aún no confirmó; tras confirmarse puede reintentarse y crear una nueva Solicitud.

Cancelar elimina el guard en el commit de transición, pero nunca elimina ni altera el intent. Por ello un retry de la clave anterior recupera la Solicitud cancelada, mientras una intención posterior debe usar otra clave y obtiene otra identidad de Solicitud.

### 17.5 Fallos y recuperación

- fallo antes del commit: no existe estado parcial;
- fallo después del commit o respuesta perdida: intención y Solicitud, más el guard si continúa pendiente, permiten relectura autoritativa;
- error transaccional ambiguo: sólo se devuelve éxito si una relectura confirma correlación íntegra;
- sin estado confirmatorio: `CONFLICT`, `DEPENDENCY_UNAVAILABLE` o `INTERNAL_ERROR` sanitizado;
- no hay reparación, adopción de huérfanos ni borrado automático.

## 18. Errores y outcomes

| Reason | Código callable | Semántica |
|---|---|---|
| `UNAUTHENTICATED` | `unauthenticated` | Token ausente o inválido |
| `ACCOUNT_REQUIRED` | `failed-precondition` | Cuenta ausente/incompatible |
| `PERSON_REQUIRED` | `failed-precondition` | Cuenta sin Persona |
| `PERSON_INCOMPATIBLE` | `failed-precondition` | Persona propia inconsistente |
| `GROUP_NOT_AVAILABLE` | `not-found` | Grupo inexistente, incompatible o inactivo para candidata |
| `GROUP_INCOMPATIBLE` | `failed-precondition` | Grupo propio incompatible en consulta Owner |
| `OWNER_CANNOT_REQUEST` | `failed-precondition` | Owner intenta solicitar a su Grupo |
| `ACTIVE_MEMBERSHIP_EXISTS` | `already-exists` | Ya existe pertenencia activa |
| `REQUEST_ALREADY_PENDING` | `already-exists` | Otra intención ya está pendiente |
| `REQUEST_NOT_FOUND` | `not-found` | No existe una Solicitud propia identificable |
| `REQUEST_NOT_PENDING` | `failed-precondition` | Estado no admite cancelación |
| `NOT_AUTHORIZED` | `permission-denied` | Actor sin ownership para listado |
| `VALIDATION_FAILED` | `invalid-argument` | Payload o cursor inválido |
| `IDEMPOTENCY_CONFLICT` | `already-exists` | Misma identidad autenticada y clave con `requestHash` incompatible, incluso otro Grupo |
| `INCOMPATIBLE_STATE` | `failed-precondition` | Documento, guard o correlación inválidos |
| `CONFLICT` | `aborted` | Contención agotada sin confirmación |
| `DEPENDENCY_UNAVAILABLE` | `unavailable` | Dependencia transitoria no verificable |
| `INTERNAL_ERROR` | `internal` | Fallo sanitizado no clasificable |

Las respuestas públicas contienen mensaje estable y únicamente `details.reason`. No incluyen stack, causa, IDs internos, emails, hashes ni datos de terceros.

## 19. Reglas Firestore

Se agregarán matches explícitos deny-all para:

```text
/groupJoinRequests/{requestId}
/pendingGroupJoinRequestGuards/{guardId}
/groupJoinRequestIntents/{intentId}
```

Lectura y escritura cliente: `false` incluso para creador, Owner, integrante o global admin. Todo acceso ocurre mediante backend.

Las pruebas deberán confirmar:

- denegación directa autenticada y anónima;
- denegación a Owner, Persona creadora y `users.roles: "admin"`;
- ausencia de relajación sobre `groups`, `personas`, `memberships` y guards existentes;
- ausencia de uso de reglas como sustituto de autorización de aplicación.

## 20. Repositorios, readers y adaptadores

| Componente | Responsabilidad |
|---|---|
| Aggregate Root Solicitud | Crear pendiente, hidratar unión estricta y cancelar |
| Servicio de Aplicación de Solicitudes | Coordinar casos de uso y contratos externos |
| Repositorio de Solicitudes | Recuperar y persistir exclusivamente Solicitud |
| Control de pendiente | Proteger unicidad Persona–Grupo |
| Registro de intención | Resolver idempotencia de creación |
| Reader de Solicitud propia vigente | Resolver consulta autoritativa, validar guard y proyectar DTO propio |
| Reader owner-scoped | Consulta paginada, validación autoritativa por item y composición mínima de Persona |
| Adaptador de identidad | Derivar UID autenticado |
| Adaptador de Cuenta/Persona propia | Derivar `personId` confiable |
| Capacidad candidate-safe de Grupo | Validar Grupo sin exponer ownership |
| Capacidad owner-scoped de Grupo | Autorizar listado |
| Capacidad de Membresías | Confirmar ausencia activa |
| Capacidad de Persona pública mínima | Entregar nombre y apellido al Owner |

Prohibiciones:

- Solicitudes no importa Repositorios privados de Grupo, Persona o Membresía;
- frontend no importa Firestore para este flujo;
- no se usa `httpApi` legacy;
- no existe Repositorio genérico;
- los readers no mutan Agregados ni reparan datos.

## 21. Frontend mínimo

### 21.1 Ruta candidata

Nueva ruta protegida:

```text
/join/groups/[groupId]
```

No se crea `/groups` de descubrimiento ni se reutiliza la página pública legacy.

Estados obligatorios:

- autenticando;
- cargando preview y Solicitud vigente;
- Grupo disponible sin Solicitud;
- creando;
- pendiente confirmada;
- confirmación de cancelación;
- cancelando;
- cancelada confirmada;
- Owner no elegible;
- integrante activo;
- Grupo no disponible;
- Cuenta o Persona requerida;
- conflicto recuperable;
- dependencia no disponible;
- estado incompatible.

### 21.2 Acciones candidatas

- “Solicitar ingreso” sólo sin pendiente;
- “Cancelar solicitud” sólo con pendiente propia;
- confirmación explícita antes de cancelar;
- cancelar el diálogo no llama backend;
- single-flight por operación;
- sin actualización optimista;
- reconsulta autoritativa después de resultados ambiguos.

### 21.3 Superficie Owner

En `/dashboard/groups/[groupId]`:

- acción “Copiar enlace de solicitud” construida localmente desde el `groupId` ya autorizado;
- sección “Solicitudes pendientes” paginada;
- nombre, apellido y fecha de solicitud;
- sin email, `personId`, estado de Membresía ni controles de resolución;
- estado vacío explícito;
- carga incremental accesible mediante “Cargar más”.

### 21.4 Accesibilidad y feedback

- foco trasladado al resultado o error relevante;
- `role="status"` para éxito/progreso y `role="alert"` para errores;
- labels y botones comprensibles sin depender del color;
- teclado, Escape en confirmación y foco visible;
- mínimo táctil consistente con pantallas canónicas;
- responsive sin scroll horizontal en 375–390 px y escritorio;
- copiar enlace confirma éxito o fallo sin enviar datos externos.

## 22. Tratamiento del legado

Permanecen preservados, no autoritativos para E2-06 y sin cambios:

- `groups.pendingRequestIds`;
- `groups.pendingAdminRequestIds`;
- `groups.memberIds`, `adminIds` y `admins`;
- endpoint HTTP legacy de join;
- endpoints legacy de aprobación/rechazo;
- páginas legacy públicas, de perfil y administrativas;
- alertas legacy de resultado;
- búsquedas legacy de `users`;
- `users.roles`.

E2-06:

- no lee legado como fallback;
- no escribe ni sincroniza arrays;
- no convierte solicitudes legacy en Solicitudes nuevas;
- no presenta juntas ambas fuentes;
- no declara migrada la administración general de integrantes;
- no retira consumidores cuyo reemplazo todavía depende de E2-07.

La condición de retiro es que el flujo canónico de resolución y sus consumidores estén implementados y probados. El retiro será por consumidor y no una migración horizontal indiscriminada.

## 23. Efectos colaterales prohibidos

- crear o modificar Membresía;
- cambiar ownership;
- modificar Grupo o Temporada;
- crear Persona;
- modificar Cuenta;
- enviar email, push o notificación;
- publicar Actividad o eventos obligatorios;
- crear Pago, Partido, Equipo o inscripción;
- conceder roles o permisos;
- escribir datos derivados o contadores;
- invocar APIs remotas;
- reparar guards o documentos incompatibles;
- registrar claves de idempotencia o datos personales en logs.

## 24. Observabilidad

Registrar de forma estructurada y sanitizada:

- operación;
- etapa técnica estable;
- outcome o reason;
- primer intento, retry o recuperación;
- creación, consulta, cancelación o página owner-scoped;
- contención agotada o dependencia no disponible;
- duración y correlación técnica permitida por las convenciones actuales.

No registrar:

- nombre, apellido o email;
- clave de idempotencia cruda;
- contenido del cursor;
- token;
- documento Firestore completo;
- stack o causa en respuesta pública.

La observabilidad no es Actividad, historial funcional ni fuente de verdad.

## 25. Plan de pruebas obligatorio

### 25.1 Dominio

- creación exacta en `pendiente`;
- hidratación estricta de ambas variantes;
- cancelación válida;
- doble transición rechazada;
- timestamps y orden temporal;
- rechazo de estados y campos no aprobados;
- ausencia de `seasonId`, `membershipId`, motivo y resolutor.

### 25.2 Contratos y DTO

- cinco payloads cerrados;
- objetos planos admitidos y demás formas rechazadas;
- UUID v4, IDs, page size y cursor;
- DTO exacto de preview;
- DTO propio pendiente/cancelado;
- item Owner sin `personId` ni email;
- fechas ISO UTC;
- errores sanitizados y reason estable.

### 25.3 Aplicación y autorización

- UID derivado del token;
- Cuenta y Persona obligatorias para candidata;
- Owner rechazado al solicitar;
- integrante activo rechazado;
- finalizada permitida;
- ausencia de Temporada abierta permitida;
- global admin sin privilegio;
- Membresía sin privilegio administrativo;
- Owner vigente permitido para listar;
- no Owner denegado;
- cambio de ownership antes/durante la consulta falla cerrado o reintenta con el snapshot vigente.

### 25.4 Persistencia e idempotencia

- primera creación produce una Solicitud, un guard y una intención correlacionados;
- retry mismo payload/clave devuelve `EXISTING_PENDING`;
- retry después de cancelar devuelve `EXISTING_CANCELLED`;
- misma clave del mismo actor con otro Grupo alcanza el mismo intent y falla con `IDEMPOTENCY_CONFLICT`;
- misma clave usada por actores distintos no colisiona;
- la clave cruda y hashes redundantes de ella no se persisten ni registran;
- dos creaciones iguales convergen;
- dos claves distintas dejan una pendiente;
- cancelación elimina sólo el guard y preserva intención/Solicitud;
- nueva clave tras cancelación crea ID nuevo;
- intent anterior después de cancelar sigue recuperando la Solicitud cancelada;
- los intents no se actualizan, eliminan, reutilizan ni expiran en E2-06;
- la consulta con límite 2 detecta una pendiente sin guard, guard sin pendiente, correlación cruzada y duplicados autoritativos;
- una pendiente huérfana no produce `null` ni permite otra creación;
- guards/intenciones huérfanos, cruzados o corruptos fallan cerrado sin reparación;
- fallo antes del commit no deja parciales;
- respuesta perdida se recupera sin duplicar.

### 25.5 Concurrencia

- creación concurrente con Membresía activa serializa y no crea cuando la pertenencia gana;
- cancelación concurrente con retry de la misma creación converge sin duplicado;
- doble cancelación produce `CANCELLED`/`ALREADY_CANCELLED`;
- nueva intención concurrente con cancelación conserva como máximo una pendiente;
- cancelación frente a estado futuro no pendiente devuelve `REQUEST_NOT_PENDING`;
- contención agotada no afirma éxito.

### 25.6 Consultas e índice

- consulta propia devuelve pendiente o `null` sólo para cero pendientes y guard ausente;
- cancelada no aparece como vigente;
- listado filtra exactamente Grupo y `pendiente`;
- orden contractual `createdAt DESC, requestId DESC` y físico `createdAt DESC, __name__ DESC`;
- timestamps iguales se paginan sin duplicados ni omisiones;
- `pageSize + 1`, `nextCursor` y fin de listado;
- `pageSize` ausente usa 20 y valores fuera de 1–20 o no enteros se rechazan;
- primera página vacía y página posterior vacía devuelven exactamente `items: []` y `nextCursor: null`;
- cursor de otro Grupo rechazado;
- cursor alterado, truncado o incompatible rechazado;
- cambios concurrentes entre páginas respetan el orden por página sin prometer snapshot global;
- cada item Owner se valida con consulta autoritativa/guard y una Persona ausente o incompatible falla la página completa;
- no se filtran silenciosamente items corruptos ni se devuelven páginas físicas parciales;
- Emulator confirma el índice compuesto exacto;
- Emulator confirma primero que la consulta de igualdad usa índices automáticos; cualquier exigencia adicional detiene la implementación;
- se documenta semántica sin snapshot multipágina.

### 25.7 Privacidad y reglas

- preview no expone campos prohibidos;
- listado no expone email, UID ni `personId`;
- acceso directo deny-all a las tres colecciones;
- no se amplían reglas de Grupo, Persona o Membresía;
- un ID conocido no habilita detalle privado;
- mensajes no permiten enumerar estados internos.

### 25.8 Frontend

- máquina de estados candidata;
- creación/cancelación confirmadas, single-flight y retry;
- nueva intención usa clave nueva;
- listado Owner, vacío y paginación;
- copiar enlace sin servicio externo;
- ninguna importación Firestore en los componentes/servicio E2-06;
- ausencia de botones aprobar/rechazar;
- accesibilidad, foco, teclado y responsive.

### 25.9 Arquitectura y regresión

- un Repositorio por Agregado;
- imports prohibidos entre módulos;
- Grupo, Persona y Membresía sólo mediante capacidades públicas;
- Solicitud es única fuente del flujo nuevo;
- cero lectura/escritura legacy;
- contratos E2-01 a E2-05 conservados;
- 11 índices totales y 0 overrides después del cambio previsto;
- ningún cambio en dependencias o lockfiles.

## 26. UAT mínima

### 26.1 Política de fixtures locales

Entorno obligatorio: Firebase Emulator Suite con proyecto `demo-*`, Auth, Firestore y Functions locales; datos sintéticos; navegador real contra hosts loopback. Está prohibido usar Firebase remoto.

Los estados especiales se preparan exclusivamente mediante fixtures locales registrados o setup automatizado. Se prohíbe la edición manual ad hoc en Firestore Emulator UI. Cada fixture E2-06 registra todos los IDs y documentos que crea; el cleanup se limita literalmente a esos IDs y documentos y nunca borra colecciones completas. Cuando el estado final sea evidencia, se inspecciona antes del cleanup.

Esta política se aplica a Membresía activa, Membresía finalizada, Grupo sin Temporada, global admin sin ownership, cambio concurrente de ownership, guards ausentes, huérfanos o incompatibles y duplicados autoritativos. Los estados corruptos se crean sólo mediante setup automatizado de pruebas y nunca mediante el flujo productivo.

### 26.2 Casos UAT

1. Persona B abre el enlace del Grupo de A y ve sólo nombre y deporte.
2. Persona B crea la Solicitud y ve `pendiente` tras recargar.
3. Doble envío no duplica Solicitud.
4. Owner A ve a B por nombre y apellido, sin email ni controles de resolución.
5. Persona B cancela, confirma `cancelada` y tras recarga ya no posee pendiente vigente.
6. Owner A deja de verla en pendientes.
7. Persona B crea una nueva intención y obtiene una Solicitud con ID nuevo.
8. Owner A no puede solicitar a su propio Grupo y no se crea Membresía automática.
9. Una Persona con Membresía activa no puede solicitar.
10. Una Persona con Membresía finalizada sí puede solicitar.
11. Sin Temporada abierta, una candidata válida puede solicitar.
12. Usuario sin Persona recibe el estado previsto sin creación colateral.
13. Global admin no Owner no puede listar pendientes.
14. Tras cambio sintético de ownership, el Owner anterior pierde acceso y el nuevo Owner puede listar.
15. En consola y red sólo aparecen callables previstos; no hay Firestore cliente ni endpoints legacy.
16. Las tres colecciones son inaccesibles directamente aun para creador y Owner.
17. Flujo utilizable por teclado y en móvil 375–390 px, notebook y escritorio.

## 27. Criterios de aceptación

1. **Dado** un Grupo canónico activo conocido, **cuando** una candidata válida solicita, **entonces** se confirma exactamente una Solicitud pendiente independiente.
2. **Dado** el mismo retry, **cuando** se repite, **entonces** recupera el mismo ID sin escritura duplicada.
3. **Dada** la misma clave del mismo actor con payload incompatible, incluido otro Grupo, **cuando** se usa, **entonces** alcanza el mismo intent y falla con `IDEMPOTENCY_CONFLICT`.
4. **Dadas** dos claves concurrentes, **cuando** compiten, **entonces** queda como máximo una pendiente Persona–Grupo.
5. **Dado** el Owner del Grupo, **cuando** intenta solicitar, **entonces** recibe `OWNER_CANNOT_REQUEST` y no se crea ningún estado.
6. **Dada** una Membresía activa, **cuando** su Persona intenta solicitar, **entonces** recibe `ACTIVE_MEMBERSHIP_EXISTS`.
7. **Dada** una Membresía finalizada, **cuando** la Persona solicita, **entonces** no se la rechaza por ese antecedente.
8. **Dada** ausencia de Temporada abierta, **cuando** una candidata válida solicita, **entonces** la operación puede completarse.
9. **Dada** una pendiente propia, **cuando** se cancela, **entonces** la misma Solicitud queda cancelada y el guard se elimina atómicamente.
10. **Dada** una cancelación ya confirmada, **cuando** se repite, **entonces** devuelve `ALREADY_CANCELLED` sin escribir.
11. **Dada** una cancelada, **cuando** se crea una intención nueva, **entonces** se crea otro Aggregate Root con otro ID.
12. **Dada** una pendiente íntegra, **cuando** su Persona consulta, **entonces** recupera sólo su DTO propio.
13. **Dada** una cancelada y ausencia íntegra de pendiente/guard, **cuando** consulta la vigente, **entonces** obtiene `null`.
14. **Dado** el Owner vigente, **cuando** lista, **entonces** recibe sólo pendientes íntegras de su Grupo en orden total `createdAt DESC, requestId DESC`.
15. **Dado** un cambio de ownership, **cuando** el Owner anterior lista, **entonces** no recibe datos.
16. **Dado** un global admin no Owner, **cuando** lista, **entonces** se deniega.
17. **Dado** un preview válido, **cuando** se responde, **entonces** contiene exclusivamente ID, nombre y deporte.
18. **Dado** un item Owner, **cuando** se responde, **entonces** sólo contiene nombre y apellido como datos de Persona.
19. **Dado** acceso Firestore cliente, **cuando** intenta leer o escribir E2-06, **entonces** es denegado.
20. **Dada** cualquier operación E2-06, **cuando** finaliza, **entonces** no modifica Grupo, Membresía, Persona, Temporada ni legado.
21. **Dada** cualquier combinación inconsistente entre pendientes autoritativas y guard, **cuando** se detecta en creación, consulta propia, cancelación o listado, **entonces** falla cerrado con `INCOMPATIBLE_STATE` sin `null`, filtrado, creación ni reparación.
22. **Dado** un fallo después del commit, **cuando** se reintenta, **entonces** el estado confirmado se recupera sin duplicar.
23. **Dado** el frontend E2-06, **cuando** se inspecciona, **entonces** usa exclusivamente contratos backend.
24. **Dado** el listado paginado, **cuando** se ejecuta en Emulator, **entonces** utiliza el único índice nuevo declarado y desempata por `__name__ DESC` sin índice especulativo.
25. **Dada** una página sin resultados, **cuando** se responde, **entonces** devuelve exactamente `{ "items": [], "nextCursor": null }`.
26. **Dadas** fechas de creación iguales, **cuando** se recorren páginas, **entonces** el cursor con `createdAt` y `requestId` evita duplicados y omisiones según el orden observado.
27. **Dado** un item con Persona ausente o incompatible, **cuando** el Owner lista, **entonces** la página completa falla con error estable y sanitizado.
28. **Dada** una cancelación confirmada, **cuando** se reintenta la creación con su clave original, **entonces** se recupera la Solicitud cancelada; una nueva Solicitud sólo admite una clave nueva.
29. **Dada** una clave de idempotencia, **cuando** se procesa, **entonces** nunca se persiste ni registra en crudo y el intent no duplica su hash como campo.
30. **Dado** un intent confirmado, **cuando** se cancela o reintenta, **entonces** no se actualiza, elimina, reutiliza ni expira en E2-06.

## 28. Trazabilidad

| Necesidad | Decisión E2-06 | Evidencia futura |
|---|---|---|
| CU-031 | Crear Solicitud propia | Dominio, callable, Emulator y UAT |
| Autoservicio mínimo | Consultar y cancelar propia | Contratos, transición y frontend |
| Solicitud independiente | `groupJoinRequests` | Schema estricto y reglas |
| Unicidad pendiente | Guard Persona–Grupo | Pruebas concurrentes |
| Idempotencia | Intención persistente separada | Retry y respuesta perdida |
| Privacidad | Preview y Persona mínimos | DTO y pruebas negativas |
| Autoridad Owner | `group.ownerId` vigente | Casos de cambio de ownership |
| Separación de Membresía | Sólo consulta pública activa | Pruebas de cero escrituras |
| Sin doble autoridad | Cero arrays legacy | Búsqueda estática y Emulator |
| Frontend en el corte | Ruta candidata y sección Owner | Pruebas y UAT |
| Índice verificable | Uno compuesto exacto | JSON y Emulator |
| Roadmap | Solicitud antecede renovación | Ficha e informe futuros |

## 29. Deuda y riesgos postergados

- aprobación y rechazo en E2-07;
- coordinación E2-07 con Membresía como operación independiente, idempotente y recuperable;
- decisión futura entre reactivación, renovación o nueva Membresía para antecedentes finalizados;
- evolución del schema para estados `aprobada` y `rechazada` sólo cuando E2-07 lo requiera;
- crecimiento sin depuración de intenciones idempotentes: E2-06 no implementa TTL, no las elimina ni las reutiliza; una política futura deberá preservar la recuperación correcta;
- historial global de Solicitudes;
- directorio o descubrimiento público de Grupos;
- invitaciones y búsqueda segura de Personas;
- cierre e historial de Temporada;
- roles y permisos contextuales;
- migración y retiro de solicitudes/arrays legacy;
- costo N+1 acotado del listado y ausencia de snapshot multipágina; E2-06 prohíbe filtrar silenciosamente páginas físicas;
- deudas concurrentes E2-02/E2-03 ya registradas.

El N+1 del listado E2-06 queda acotado a 20 items e incluye la validación autoritativa/guard y la proyección de Persona de cada uno. Se acepta provisionalmente. Una inconsistencia o Persona incompatible hace fallar la página completa para no presentar una Solicitud sin integridad o identidad verificable.

## 30. Sucesor habilitado

El cierre satisfactorio de E2-06 habilitará únicamente la definición de:

`E2-07 — Resolución de Solicitud de ingreso`

E2-07 deberá:

- incorporar aprobación y rechazo sin reescribir el significado de cancelación;
- autorizar sólo al Owner vigente salvo decisión funcional posterior explícita;
- validar que no exista Membresía activa;
- coordinar la creación/evolución de Membresía mediante la capacidad pública correspondiente;
- preservar Solicitud y Membresía como Agregados y unidades de consistencia independientes;
- definir recuperación ante fallo parcial sin transacción global ficticia;
- retirar o adaptar el guard pendiente según la transición confirmada;
- no escribir arrays legacy.

E2-06 no autoriza su ficha ni implementación.

## 31. Checkpoint, rollback, evidencia y veredicto

### 31.1 Checkpoint y rollback futuro

- **Commit inicial:** `d0d3a4774f4bd65f9c740b39d906c43207e97331`.
- **Rama de definición:** `dev`.
- **Estado inicial:** E2-05 cerrado; `origin/dev` coincidente; divergencia `0/0`; árbol limpio.
- **Rama futura sugerida:** `feat/e2-06-solicitud-ingreso`, sólo tras aprobación documental y autorización de implementación.
- **Rollback de código:** revert explícito del futuro incremento; nunca doble escritura.
- **Datos de prueba:** fixtures locales registrados o setup automatizado en `demo-*`/loopback; cleanup literal sólo de sus IDs y documentos, nunca de colecciones completas.
- **Interrumpir si:** se necesita aprobación, rechazo, Membresía, búsqueda, exposición adicional, índice distinto no justificado, escritura legacy, reparación, Firebase remoto o una nueva decisión funcional.
- **Reanudar si:** la contradicción o ampliación queda resuelta mediante revisión documental explícita.

### 31.2 Evidencia de cierre futura

- ficha aprobada antes de implementar;
- contratos, payloads, DTO, outcomes y reasons finales;
- schemas y campos exactos;
- hashes con dominios separados y vectores deterministas;
- pruebas unitarias, integración, Emulator y frontend;
- índice único y reglas deny-all verificadas;
- evidencia de concurrencia, respuesta perdida y estados incompatibles;
- UAT completa;
- búsqueda estática de cero Firestore cliente y cero legado en el flujo;
- baseline de calidad y controles Git;
- informe de implementación y cierre separados;
- confirmación de cero Firebase remoto y deploy.

### 31.3 Declaración final de definición

- **Estado:** `LISTA PARA VERSIONAR`.
- **Decisiones funcionales fundamentales abiertas:** ninguna.
- **Alcance implementable:** cerrado por contratos, estados, persistencia, autorización, transacciones, índice, frontend, pruebas y UAT.
- **Implementación:** no iniciada ni autorizada por esta ficha.
- **Código, reglas e índices:** sin cambios durante esta intervención documental.
- **Versionado:** no realizado ni autorizado durante esta intervención.

## Veredicto documental

`E2-06 APROBADO — LISTO PARA VERSIONAR`
