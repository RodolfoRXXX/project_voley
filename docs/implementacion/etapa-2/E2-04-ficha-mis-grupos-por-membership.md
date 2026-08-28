# Ficha de Incremento Implementable E2-04 — Consulta de mis Grupos operativos por Membresía

## Estado de la ficha

- **Estado:** `LISTA PARA IMPLEMENTAR`.
- **Fecha de definición:** 2026-08-28.
- **Responsable de definición:** Codex, sujeto a revisión y aprobación del responsable de SPORTEXA.
- **Aprobación funcional:** responsable de SPORTEXA, 2026-08-28.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Alternativa aprobada:** A — consulta propia de Membresías.
- **Fuente de verdad de pertenencia:** Membresía.
- **Actor:** Usuario autenticado con Persona propia vinculada.
- **Contrato público único:** `listMyCurrentGroupMemberships`.
- **Consumidor:** `/dashboard/groups`.
- **Checkpoint documental:** rama `dev`, commit `c219f83f46ab4ec3bdc78e8674ded05c5e56a782`, coincidente con `origin/dev`, divergencia `0/0` y árbol limpio al iniciar esta definición.
- **Rama prevista para una implementación posterior:** `feat/e2-04-my-groups-by-membership`; no se crea durante esta definición.

Esta ficha define el corte implementable. No implementa código, no modifica los Documentos 1–5 ni documentos anteriores y no autoriza rama, commit, push, merge, despliegue ni acceso a Firebase remoto.

## 1. Identificación y título

- **Identificador:** E2-04.
- **Título final:** Consulta de mis Grupos operativos por Membresía.
- **Caso de uso incluido:** consultar, con paginación, las Membresías propias que son operativamente utilizables y el contexto público mínimo de sus Grupos.
- **Resultado observable:** la Persona propia ve “Grupos que integrás” separada de “Grupos que administrás”.
- **Brechas atendidas:** ausencia de listado propio canónico, ausencia de acceso inicial member-scoped y falta de un consumidor de Membresía fuera del detalle owner-scoped.

No se adopta un listado de integrantes ni se combinan casos owner-scoped y member-scoped en un único significado. El mismo Grupo puede aparecer en ambas secciones porque ownership y pertenencia son relaciones independientes.

## 2. Fuentes normativas y técnicas

### 2.1 Fuentes normativas

1. **Documento 1 — Arquitectura del Producto y Modelo de Dominio**:
   - Membresía representa el vínculo Persona–Grupo;
   - Owner expresa propiedad funcional y no equivale a integrante;
   - el contexto temporal pertenece a la participación.
2. **Documento 1.5 — Modelo Conceptual del Dominio**:
   - Usuario, Persona y Membresía son conceptos distintos;
   - Usuario se vincula con Persona;
   - la unicidad activa se evalúa por Persona–Grupo;
   - roles contextuales no son roles globales del Usuario.
3. **Documento 2 — Modelo Funcional y Casos de Uso**:
   - la Membresía se asocia a una Temporada;
   - una Temporada no abierta no habilita operación corriente;
   - lifecycle, renovación y solicitudes son casos separados.
4. **Documento 3 — Arquitectura Funcional y Diseño Técnico**:
   - Membresía es Aggregate Root de su propio Agregado;
   - Persona, Grupo y Temporada son referencias externas;
   - la unicidad activa corresponde al Módulo Membresías.
5. **Documento 4 — Diseño de la Arquitectura de Software**:
   - contratos entre módulos exponen información mínima;
   - Repositorios no cruzan límites de Agregado;
   - autenticación, autorización y validez de dominio se verifican por separado.
6. **Documento 5 — Plan de Implementación y Transición Técnica**:
   - Membresía es autoridad Persona–Grupo;
   - la transición se realiza por flujo, sin doble escritura;
   - el frontend pertenece al mismo incremento;
   - esta ficha sigue la plantilla normativa completa.

### 2.2 Incrementos vinculantes

- **E1-02:** Persona propia y vínculo `users/{uid}.personaId`.
- **E2-01:** Grupo v1, `ownerId`, consultas owner-scoped y `/dashboard/groups` canónico.
- **E2-02:** Temporada v1, apertura única y contexto owner-scoped.
- **E2-03:** Membresía v1, guard determinista, unicidad activa Persona–Grupo y creación propia del Owner.

E2-03 quedó cerrado, integrado y publicado. Su cierre está contenido en el checkpoint de esta ficha y habilita la definición de E2-04.

### 2.3 Estado técnico de partida

- `users/{uid}` puede contener `personaId`; el UID no es `personId`.
- `personas/{personId}` es privado y posee reconstrucción estricta.
- `groups/{groupId}` v1 contiene `nombre`, `deporte`, `ownerId`, `estado`, `createdAt` y `schemaVersion`.
- `seasons/{seasonId}` v1 contiene `groupId`, `nombre`, `fechaInicio`, `estado`, `createdAt` y `schemaVersion`.
- `memberships/{membershipId}` v1 contiene `personId`, `groupId`, `seasonId`, `estado`, `fechaIngreso`, `createdAt` y `schemaVersion`.
- `activeMembershipGuards/{guardId}` protege la unicidad activa Persona–Grupo y correlaciona Membresía, Persona, Grupo y Temporada.
- las reglas Firestore niegan lectura y escritura cliente sobre estas colecciones canónicas;
- no existen listado propio paginado, cursor público ni acceso member-scoped;
- `getOwnGroup`, `getOpenSeasonContext`, `getOwnSeason` y equivalentes son owner-scoped.

## 3. Objetivo funcional

Permitir que un Usuario autenticado con Persona propia válida consulte sus pertenencias operativas actuales. Cada resultado nace de una Membresía propia físicamente activa, íntegra y única; se incluye sólo si su Grupo canónico está activo y su `seasonId` coincide exactamente con la Temporada abierta actual de ese Grupo.

El valor mínimo es habilitar acceso contextual inicial como integrante sin conceder administración, enumerar Personas ni migrar consumidores legacy.

## 4. Actores

| Actor | Participación | Contexto | Resultado esperado |
|---|---|---|---|
| Usuario autenticado con Persona propia | Principal | Consulta exclusivamente sus Membresías operativas | Lista paginada de contexto mínimo |
| Owner | Contexto independiente | Puede además aparecer en “Grupos que administrás” | Ambas secciones siguen separadas |
| Integrante no Owner | Caso positivo | Posee Membresía operativa íntegra | Grupo visible sólo como pertenencia |
| Global admin | Sin privilegio especial | No sustituye Membresía ni Persona | Cero resultados si no tiene Membresía |
| Módulo Membresías | Coordinador | Deriva Persona, pagina y valida integridad | DTO público cerrado |
| Módulo Grupos | Proveedor interno | Expone Grupo y Temporada member-safe mínimos | No concede ownership |
| Firestore backend | Persistencia | Ejecuta lecturas server-side | Cero escrituras |

## 5. Precondiciones

1. Existe una identidad Firebase autenticada y su UID es válido.
2. Existe una cuenta canónica compatible en `users/{uid}`.
3. Para la sección “Grupos que integrás”, la cuenta contiene un `personaId` válido.
4. Para esa misma sección, existe la Persona referida y su documento es compatible.
5. `personId` se deriva exclusivamente del vínculo de cuenta validado.
6. `pageSize` y `cursor`, si se envían, satisfacen el contrato cerrado.
7. Las dependencias server-side necesarias están disponibles.

Si `users/{uid}.personaId` está ausente, `listMyCurrentGroupMemberships` devuelve `PERSON_REQUIRED` antes de consultar Membresías. No se devuelve vacío, no se crea Persona, no se usa UID como sustituto y no se ejecuta consulta global. Esta precondición pertenece sólo a “Grupos que integrás”: ownership no requiere Persona ni Membresía y “Grupos que administrás” continúa funcionando.

Una lista vacía significa exclusivamente: cuenta válida, Persona válida y cero Membresías operativas dentro de la ventana física consultada y del recorrido realizado hasta ese punto. Debido al filtrado posterior, una página vacía puede tener continuación.

## 6. Semántica de pertenencia operativa

Una Membresía se incluye si y sólo si todas estas condiciones son verdaderas:

1. el documento de Membresía reconstruye estrictamente como v1;
2. `membership.personId` coincide con la Persona propia derivada;
3. `membership.estado === "activa"`;
4. existe exactamente una Membresía activa para esa Persona y ese Grupo;
5. esa única Membresía es la candidata;
6. el guard determinista existe, reconstruye estrictamente y correlaciona todos sus campos con la candidata;
7. el Grupo referido reconstruye como Grupo v1 activo;
8. existe Temporada abierta íntegra para ese Grupo;
9. la Temporada abierta pertenece al mismo Grupo;
10. `membership.seasonId` coincide exactamente con el ID de esa Temporada abierta.

“Activa” es estado físico de Membresía; “operativa” es el resultado contextual de todas las condiciones anteriores. E2-04 no crea un nuevo estado persistente ni etiqueta elementos excluidos como históricos.

## 7. Flujo principal

1. `/dashboard/groups` conserva la carga owner-scoped de “Grupos que administrás” e inicia por separado `listMyCurrentGroupMemberships`.
2. El callable valida autenticación y payload cerrado.
3. El servicio obtiene la cuenta propia y deriva `personaId`.
4. Si falta Persona, la operación member-scoped termina con `PERSON_REQUIRED` sin consultar `memberships`; la carga owner-scoped independiente no se cancela ni se oculta.
5. El servicio valida la Persona propia y transforma incompatibilidades en error estable.
6. Decodifica y valida el cursor, si existe.
7. Ejecuta la consulta primaria de Membresías activas de esa Persona con orden estable y `limit(pageSize + 1)`.
8. Separa hasta `pageSize` documentos crudos para escaneo y utiliza el documento adicional sólo como lookahead físico.
9. Por cada candidata escaneada, en orden:
   1. reconstruye estrictamente la Membresía;
   2. ejecuta la comprobación exacta Persona–Grupo–activa con `limit(2)`;
   3. exige exactamente una activa y que su ID sea el de la candidata;
   4. deriva y lee el guard determinista;
   5. valida esquema y correlación guard–Membresía;
   6. solicita al Módulo Grupos el contexto mínimo member-safe del Grupo;
   7. solicita el contexto de Temporada abierta member-safe;
   8. excluye la candidata si no hay Temporada abierta o si su `seasonId` no coincide;
   9. transforma a DTO sólo cuando todo el contexto es operativo.
10. Si hubo lookahead, genera `nextCursor` desde el último documento crudo efectivamente escaneado, aunque ese documento haya sido filtrado. El lookahead no se salta: será el primer documento elegible de la página siguiente mediante `startAfter` del último escaneado.
11. Si no hubo lookahead, devuelve `nextCursor: null`.
12. El frontend representa los items y la continuación sin mezclar propiedad con pertenencia; cada sección conserva carga, éxito y error independientes.

No se realizan ciclos adicionales para rellenar `pageSize` después del filtrado.

## 8. Flujos alternativos y errores

| Condición | Respuesta contractual | Estado resultante | Feedback | Reintento |
|---|---|---|---|---|
| Sin autenticación | `UNAUTHENTICATED` | Sin consulta | Iniciar sesión | Tras autenticarse |
| Cuenta ausente | `ACCOUNT_REQUIRED` | Sin consulta | Completar cuenta | Tras resolver cuenta |
| `personaId` ausente | `PERSON_REQUIRED` sólo en pertenencia | Sin consulta de Membresías; ownership sigue disponible | Crear/vincular Persona por el flujo existente | Tras resolver Persona |
| Persona referida incompatible o rota | `PERSON_INCOMPATIBLE` | Falla pertenencia; ownership sigue disponible | Estado de cuenta incompatible | No automático |
| Payload, `pageSize` o cursor inválido | `VALIDATION_FAILED` | Sin consulta o sin continuar | Solicitud inválida | Con entrada válida |
| Persona válida sin activas | `{ items: [], nextCursor: null }` | Vacío legítimo | Sin Grupos operativos | No requerido |
| Ventana filtrada con más datos físicos | `{ items: [], nextCursor: string }` | Vacío intermedio | Mostrar continuación | Sí, página siguiente |
| No existe contexto abierto o su ID no coincide con `membership.seasonId` | Se excluye | Sin error | No se presenta como operativa ni se clasifica su Temporada | No aplica |
| Ausencia legítima de Temporada abierta | Se excluye | Sin error | No se presenta | No aplica |
| Grupo ausente, inactivo o incompatible | `INCOMPATIBLE_STATE` | Fallo cerrado, sin lista parcial | Estado incompatible | No automático |
| Temporada abierta de otro Grupo | `INCOMPATIBLE_STATE` | Fallo cerrado | Estado incompatible | No automático |
| Contexto de Temporada o guard incompatible | `INCOMPATIBLE_STATE` | Fallo cerrado | Estado incompatible | No automático |
| Dos activas Persona–Grupo | `INCOMPATIBLE_STATE` | Fallo cerrado | Estado incompatible | No automático |
| Activa sin guard, guard ausente o roto | `INCOMPATIBLE_STATE` | Fallo cerrado | Estado incompatible | No automático |
| Dependencia temporalmente no disponible | `DEPENDENCY_UNAVAILABLE` | Sin lista parcial | Reintentar | Sí |
| Persistencia/infraestructura inesperada | `INTERNAL_ERROR` | Sin lista parcial | Error estable | Según diagnóstico |

Ningún error comprobable se degrada a omisión silenciosa. La ausencia de contexto abierto exacto es una exclusión operativa segura, no un diagnóstico sobre el estado de una Temporada anterior.

Todos los outcomes de esta tabla pertenecen a `listMyCurrentGroupMemberships` y a “Grupos que integrás”. No cancelan ni reemplazan el resultado independiente de “Grupos que administrás”.

## 9. Postcondiciones

- No cambia ningún Agregado ni documento.
- No se crean Persona, Membresía, guard, Grupo ni Temporada.
- No se actualizan arrays legacy.
- No se emiten eventos ni notificaciones.
- El cliente recibe sólo DTOs propios/contextuales mínimos.
- Membresía pasa a ser autoridad del nuevo flujo “Grupos que integrás”.
- Ownership continúa siendo autoridad independiente de “Grupos que administrás”.

## 10. Alcance incluido

- callable público paginado `listMyCurrentGroupMemberships`;
- validación de cuenta y Persona propia;
- reader server-side por Persona y estado;
- cursor opaco, versionado y ligado al orden;
- validación completa de unicidad y guard por candidata;
- capacidades internas member-safe de Grupo y Temporada;
- filtrado operacional por Grupo activo y Temporada abierta exacta;
- DTO cerrado;
- integración en `/dashboard/groups` con secciones separadas;
- pruebas unitarias, contractuales, integración, reglas, frontend y UAT.

## 11. Exclusiones

Quedan expresamente fuera:

- listado o búsqueda de integrantes;
- Personas ajenas y resolución de sus nombres;
- roster owner-scoped;
- historial o etiqueta histórica;
- cierre, renovación, reactivación o cualquier lifecycle;
- roles, cargos, permisos o administración member-scoped;
- solicitudes;
- altas de terceros;
- edición o baja de Membresías;
- migración de vistas, APIs o consumidores legacy;
- partidos, torneos, inscripciones, alertas y notificaciones;
- doble lectura o fallback desde `memberIds`, `adminIds` o `admins`;
- doble escritura;
- corrección de la intermitencia concurrente E2-02;
- nuevos callables de Grupo o Temporada;
- acceso directo cliente a Firestore.

## 12. Modelo de dominio e invariantes

### 12.1 Agregados y referencias

| Agregado | Participación | Operación | Invariantes | ¿Se modifica? |
|---|---|---|---|---|
| Membresía | Fuente de pertenencia y modelo leído | Reconstrucción estricta | Activa, Persona–Grupo única, guard correlacionado | No |
| Grupo | Referencia externa | Contexto público mínimo | v1, activo, ID correlacionado | No |
| Temporada | Referencia externa | Contexto abierto mínimo | v1, abierta, Grupo correlacionado | No |
| Persona | Referencia externa propia | Validación del vínculo | Existe y es compatible | No |
| Usuario | Identidad y vínculo | Derivación de Persona | Cuenta propia compatible | No |

No se amplían Agregados para facilitar la consulta. La composición del DTO es un modelo de lectura de aplicación.

### 12.2 Reglas fundamentales

- Owner e integrante no son equivalentes.
- `ownerId` no prueba pertenencia.
- roles globales no prueban pertenencia.
- arrays legacy no prueban pertenencia.
- email o `emailContacto` no son identidad.
- una Membresía activa de Temporada no abierta no es operativa.
- member-access no concede administración.
- el guard acredita integridad técnica, no origina el listado.
- corrupción nunca se deduplica, repara, adopta ni ignora.

## 13. Servicio de Aplicación responsable

- **Módulo propietario:** Membresías.
- **Servicio:** ampliación del servicio de aplicación de Membresías con `listMyCurrentGroupMemberships(identity, input)`.
- **Operación:** derivar Persona propia, paginar, validar integridad, consultar contextos internos y componer DTO.
- **Autorización:** identidad autenticada + cuenta propia + Persona propia + coincidencia estricta de `personId`.
- **Contratos internos consumidos:** contexto member-readable de Grupo y contexto abierto de Temporada para Membresía.
- **Reader:** reader específico de listado propio, no Repositorio genérico.
- **Respuesta:** `ListMyCurrentGroupMembershipsResult`.
- **Habilitación comercial:** no aplica.

El servicio coordina. La reconstrucción de cada entidad y la correlación del guard permanecen en sus componentes propietarios.

## 14. Contratos públicos

### 14.1 Callable público único

```ts
listMyCurrentGroupMemberships(input: {
  pageSize?: number;
  cursor?: string;
}): Promise<ListMyCurrentGroupMembershipsResult>
```

No se agrega ningún otro callable. La entrada es un objeto plano cerrado; claves desconocidas, `null`, arrays o tipos distintos se rechazan.

### 14.2 Capacidades existentes que no autorizan este flujo

No se invocan como autorización member-scoped:

- `getOwnGroup`;
- `getOpenSeasonContext`;
- `getOwnSeason`;
- `getOwnGroupsDashboard`;
- callables o servicios owner-scoped equivalentes.

Sus contratos y semántica permanecen intactos.

### 14.3 Matriz de contratos

| Proveedor | Consumidor | Capacidad | Información mínima | Errores relevantes |
|---|---|---|---|---|
| Módulo Membresías | `/dashboard/groups` | `listMyCurrentGroupMemberships` | items propios operativos y cursor | errores contractuales estables |
| Módulo Grupos | Módulo Membresías | `getMemberReadableGroupContext` | ID, nombre, deporte, estado | incompatible/no disponible |
| Módulo Grupos | Módulo Membresías | `getOpenSeasonContextForMembership` | Temporada abierta mínima o ausencia | incompatible/no disponible |
| self-account/person contexts | Módulo Membresías | capacidades internas existentes | `personId` derivado y Persona válida | requerida/incompatible |

La primera fila es el único contrato cliente nuevo. Las restantes son colaboraciones internas y no se exportan desde `functions/index.js`.

## 15. Capacidades internas member-safe del Módulo Grupos

Se fijan los siguientes nombres, compatibles con la convención actual de capacidades de contexto:

### 15.1 `getMemberReadableGroupContext({ groupId })`

- es una capacidad interna server-side, no callable;
- recibe sólo un `groupId` derivado de una Membresía propia ya validada;
- no recibe UID, `ownerId`, rol ni autoridad enviada por cliente;
- lee exactamente un Grupo por ID;
- reconstruye estrictamente Grupo v1 y exige `estado: "activo"`;
- devuelve sólo `{ id, nombre, deporte, estado }`;
- no enumera Grupos, no concede ownership y no modifica estado;
- Grupo ausente, incompatible o no correlacionado falla cerrado como `INCOMPATIBLE_STATE` para este caso de uso.

### 15.2 `getOpenSeasonContextForMembership({ groupId })`

- es una capacidad interna server-side, no callable;
- sólo se consume después de validar la Membresía propia y su guard;
- recibe el `groupId` derivado de esa Membresía;
- recupera el contexto abierto autoritativo sin aplicar ownership;
- valida esquema, estado abierto, guard de apertura y correlación con Grupo;
- devuelve `null` ante ausencia legítima de Temporada abierta;
- devuelve como máximo `{ id, groupId, estado: "abierta" }`;
- no enumera Temporadas, no modifica estado y no concede administración;
- Temporada abierta de otro Grupo, guard roto o referencia abierta rota falla como `INCOMPATIBLE_STATE`.

Estas capacidades son puertos internos del Módulo Grupos. Su uso desde Membresías no habilita acceso directo a Repositorios internos ni debilita los contratos owner-scoped.

## 16. DTO de entrada y salida

### 16.1 Entrada

| Campo | Tipo | Obligatorio | Validación | Origen |
|---|---|---|---|---|
| `pageSize` | entero | No | Entre 1 y 20; default 20 | Cliente |
| `cursor` | string | No | No vacío, longitud acotada, Base64URL y contenido exacto válido | Resultado previo |

`personId`, UID, `groupId`, `seasonId`, roles y ownership no forman parte de la entrada.

### 16.2 Salida

```ts
type MyCurrentGroupMembershipItem = {
  membership: {
    id: string;
    seasonId: string;
    estado: "activa";
    fechaIngreso: string;
  };
  group: {
    id: string;
    nombre: string;
    deporte: "voleibol";
    estado: "activo";
  };
};

type ListMyCurrentGroupMembershipsResult = {
  items: MyCurrentGroupMembershipItem[];
  nextCursor: string | null;
};
```

- `fechaIngreso` se serializa como ISO 8601 UTC válido.
- el orden de `items` conserva el orden físico de las candidatas incluidas;
- el resultado posee exactamente `items` y `nextCursor`;
- cada objeto posee exactamente las claves declaradas.

### 16.3 Datos prohibidos

No se exponen `personId`, `ownerId`, `createdAt`, `schemaVersion`, email, `emailContacto`, nombre de Persona, roles, permisos, arrays legacy, guard, hashes, snapshots, rutas Firestore ni detalles administrativos.

## 17. Cursor

### 17.1 Contenido interno v1

El cursor representa exclusivamente la posición física posterior al último documento crudo escaneado:

```ts
type MyGroupsCursorV1 = {
  v: 1;
  contract: "listMyCurrentGroupMemberships:v1";
  order: "fechaIngreso:desc,__name__:desc";
  lastFechaIngreso: {
    seconds: number;
    nanoseconds: number;
  };
  lastMembershipId: string;
};
```

El sobre codificado contiene el payload canónico y un checksum SHA-256 con separación de dominio para detectar alteraciones accidentales. Se serializa como JSON canónico UTF-8 y Base64URL sin padding. No contiene snapshots ni `personId`.

El cursor es opaco como contrato de cliente. El checksum SHA-256 sin secreto detecta truncamiento, corrupción y alteraciones que no lo recalculen, pero no es una firma ni constituye autenticación, autorización o protección criptográfica contra falsificación. Un cliente técnicamente capaz puede reconstruir un cursor y recalcular el checksum.

Un cursor caller-crafted que sea estructuralmente válido sólo reposiciona la consulta de la Persona derivada en backend. Nunca permite enviar o sustituir `personId`, leer otra Persona ni ampliar el conjunto autorizado. La seguridad depende de derivar y fijar `personId` desde el token autenticado en cada invocación. E2-04 no introduce HMAC ni secreto nuevo.

### 17.2 Validación

El backend exige:

- tamaño máximo explícito del token;
- alfabeto y decodificación Base64URL válidos;
- JSON objeto y claves exactas;
- versión, contrato y orden exactos;
- `seconds` entero en rango Firestore;
- `nanoseconds` entero entre 0 y 999.999.999;
- ID no vacío, sin `/` y con longitud válida;
- checksum coincidente.

Base64URL inválido, JSON inválido, claves incorrectas, checksum incorrecto, versión/contrato/orden incorrectos, timestamp o `membershipId` inválidos y tokens truncados o fuera de tamaño producen `VALIDATION_FAILED` antes de consultar la página. No se promete rechazo criptográfico de un cursor deliberadamente reconstruido con checksum recalculado si su estructura es válida.

### 17.3 Paginación física

- el backend reconstruye un `Timestamp` exacto desde segundos y nanosegundos;
- aplica `startAfter(timestamp, documentId)` en el mismo orden del contrato;
- solicita `pageSize + 1`;
- procesa como máximo los primeros `pageSize` documentos;
- el elemento adicional es sólo lookahead y no se valida ni se salta;
- si existe lookahead, el cursor se construye desde el último de los documentos procesados, no desde el último item incluido;
- si no existe lookahead, `nextCursor` es `null`;
- una respuesta `{ items: [], nextCursor: string }` es válida;
- no se realizan loops para completar artificialmente la página.

## 18. Diseño físico Firestore

### 18.1 Colecciones y autoridad

| Colección | Finalidad en E2-04 | Naturaleza | Escritores | Lectores |
|---|---|---|---|---|
| `users` | Derivar Persona propia | Cuenta/vínculo | Flujos existentes | Backend |
| `personas` | Validar Persona propia | Entidad canónica | Flujos existentes | Backend |
| `memberships` | Originar y paginar pertenencias | Fuente de verdad | E2-03/backend | Backend |
| `activeMembershipGuards` | Verificar integridad y unicidad | Mecanismo técnico | E2-03/backend | Backend |
| `groups` | Contexto público mínimo | Aggregate Root externo | E2-01/backend | Backend |
| `seasons` y guard de apertura | Contexto temporal operativo | Aggregate Root y control técnico | E2-02/backend | Backend |

E2-04 no agrega colecciones, campos, proyecciones ni escritores.

### 18.2 Referencias

| Referencia | Destino | Validación | Resultado ante fallo |
|---|---|---|---|
| `users.personaId` | Persona propia | ID y documento estrictos | `PERSON_REQUIRED` si falta; `PERSON_INCOMPATIBLE` si está roto |
| `membership.personId` | Persona propia | Igualdad exacta con derivada | `INCOMPATIBLE_STATE` |
| `membership.groupId` | Grupo v1 | ID y contexto interno estrictos | `INCOMPATIBLE_STATE` |
| `membership.seasonId` | Contexto abierto actual | Igualdad con el ID abierto actual | Exclusión si no existe contexto abierto o no coincide |
| guard `membershipId` | Membresía candidata | Igualdad completa | `INCOMPATIBLE_STATE` |

### 18.3 Campos leídos

| Ruta | Campos utilizados | Obligatorios | Propietario conceptual | Regla en E2-04 |
|---|---|---|---|---|
| `users/{uid}` | `personaId` y esquema vigente de cuenta | según contrato de cuenta | Usuarios | derivar Persona; nunca proyectar |
| `personas/{personId}` | esquema completo vigente | sí para Persona vinculada | Personas | validar; no proyectar datos personales |
| `memberships/{membershipId}` | `personId`, `groupId`, `seasonId`, `estado`, `fechaIngreso`, `createdAt`, `schemaVersion` | todos | Membresías | reconstrucción exacta; proyección mínima |
| `activeMembershipGuards/{guardId}` | todos los campos v1 vigentes | todos | Membresías técnico | reconstrucción/correlación; no proyectar |
| `groups/{groupId}` | `nombre`, `deporte`, `ownerId`, `estado`, `createdAt`, `schemaVersion` | todos | Grupos | reconstrucción exacta; omitir administrativos |
| `seasons/{seasonId}` y guard abierto | esquema completo vigente | todos si existe contexto | Grupos/Temporadas | validar apertura/correlación; proyectar sólo ID internamente |

No se agregan campos. Leer un documento completo para reconstrucción estricta no autoriza a reproducirlo en el DTO.

### 18.4 Datos originales y derivados

- Membresía, Grupo, Temporada, Usuario y Persona conservan sus propietarios y escritores actuales.
- `MyCurrentGroupMembershipItem` es un modelo de lectura efímero y reconstruible.
- “operativa” es una decisión de consulta, no un campo persistente.
- `nextCursor` es estado de navegación efímero, no se persiste.

## 19. Consulta primaria e índice exacto

### 19.1 Consulta

```text
collection("memberships")
  .where("personId", "==", derivedPersonId)
  .where("estado", "==", "activa")
  .orderBy("fechaIngreso", "desc")
  .orderBy(documentId(), "desc")
  .startAfter(lastFechaIngreso, lastMembershipId) // sólo con cursor
  .limit(pageSize + 1)
```

No existe consulta global: `personId` siempre se deriva y aplica antes de leer resultados.

### 19.2 Índice nuevo de listado

La implementación deberá agregar exactamente este índice compuesto de alcance `COLLECTION`:

```json
{
  "collectionGroup": "memberships",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "personId", "mode": "ASCENDING" },
    { "fieldPath": "estado", "mode": "ASCENDING" },
    { "fieldPath": "fechaIngreso", "mode": "DESCENDING" }
  ]
}
```

`__name__` no se declara explícitamente en `firestore.indexes.json`: Firestore lo agrega como orden final en la misma dirección del último campo ordenado. Como `fechaIngreso` es descendente, el índice resultante incorpora `__name__ DESC`, que coincide con la consulta. Declararlo sería necesario sólo para una dirección distinta de la predeterminada.

Esta semántica se verificó contra la documentación oficial de índices de Cloud Firestore y deberá probarse de forma ejecutable en Emulator Suite. No se agrega otro índice para el listado.

### 19.3 Índice reutilizado para integridad

Se conserva sin cambios el índice existente:

```text
memberships: personId ASC, groupId ASC, estado ASC
```

Sustenta la consulta exacta Persona–Grupo–activa `limit(2)` por candidata. No es un segundo índice nuevo de E2-04.

## 20. Integridad completa y duplicados

Para cada candidata, incluso si sus duplicados quedarían en otra página del listado:

```text
collection("memberships")
  .where("personId", "==", derivedPersonId)
  .where("groupId", "==", candidate.groupId)
  .where("estado", "==", "activa")
  .limit(2)
```

El reader debe:

1. reconstruir estrictamente cada resultado de esa consulta;
2. exigir tamaño exactamente uno;
3. exigir que el único ID coincida con la candidata;
4. calcular el ID determinista del guard con Persona y Grupo;
5. reconstruir el guard con claves exactas y versión vigente;
6. exigir igualdad de `membershipId`, `personId`, `groupId`, `seasonId` y estado;
7. fallar con `INCOMPATIBLE_STATE` ante cero resultados para una candidata, dos activas, candidata distinta, activa huérfana, guard ausente, guard roto o documento incompatible.

No se deduplica por página ni entre páginas. No se repara, adopta, ignora o elige arbitrariamente una Membresía.

La validación produce un costo N+1 aceptado: una consulta primaria más una consulta exacta y lecturas de guard/contextos por cada uno de hasta 20 documentos procesados. Es deuda explícita de rendimiento, admisible para el corte mínimo. Una optimización futura podrá agrupar o proyectar integridad sólo si conserva las mismas garantías.

## 21. Contexto de Temporada no operativo e incompatible

| Situación | Tratamiento |
|---|---|
| El Grupo no posee Temporada abierta de forma legítima | Excluir sin error |
| La Temporada abierta exacta coincide con `membership.seasonId` | Incluir si las demás condiciones cumplen |
| Existe una Temporada abierta válida del mismo Grupo cuyo ID no coincide con `membership.seasonId` | Excluir sin error |
| El contexto declara una Temporada abierta de otro Grupo | `INCOMPATIBLE_STATE` |
| Guard abierto roto, documento abierto incompatible o IDs guard/documento no correlacionados | `INCOMPATIBLE_STATE` |
| Las lecturas revelan más de una apertura incompatible con las invariantes E2-02 | `INCOMPATIBLE_STATE` |
| El Grupo está ausente, inactivo o es incompatible | `INCOMPATIBLE_STATE` |
| La dependencia devuelve una estructura imposible | `INCOMPATIBLE_STATE` |
| La dependencia no puede confirmar el contexto temporal | `DEPENDENCY_UNAVAILABLE` |

E2-04 consume sólo el contexto abierto actual. No lee directamente el historial de `seasons` para decidir si la referencia de la Membresía está cerrada, retirada, es histórica o ya no puede resolverse fuera del contexto abierto. La ausencia legítima y la indisponibilidad no son equivalentes: la primera filtra; la segunda falla la página completa y permite retry. No se devuelve lista parcial silenciosa y ninguna exclusión recibe etiqueta histórica.

Una referencia no validable nunca concede member-access; como máximo queda excluida del conjunto operativo cuando no existe un contexto abierto exacto. Si el contexto abierto que sí existe presenta corrupción comprobable, se falla cerrado con `INCOMPATIBLE_STATE`.

## 22. Autorización y privacidad

### 22.1 Matriz

| Operación | Visitante | Usuario sin Persona | Usuario con Persona | Owner | Global admin | Sistema |
|---|---|---|---|---|---|---|
| Invocar listado de pertenencia | Denegado | `PERSON_REQUIRED` local a la sección | Permitido sobre sí | Igual que Usuario | Sin bypass | Backend |
| Consultar Grupos administrados | Denegado | Permitido si es Owner | Permitido si es Owner | Contrato owner-scoped | Sin cambio | Backend |
| Leer Firestore cliente | Denegado | Denegado | Denegado | Denegado | Denegado por este flujo | Permitido por Admin SDK |
| Consultar Grupo member-safe | No | No | Sólo tras Membresía validada | Sin privilegio adicional | Sin bypass | Interno |
| Administrar Grupo | No cambia | Permitido sólo por ownership; Persona no requerida | No concedido por Membresía | Contratos owner-scoped existentes | No cambia | No aplica |

### 22.2 Relecturas obligatorias por página

En cada invocación se vuelven a validar:

- identidad autenticada;
- cuenta propia;
- vínculo `personaId` y Persona;
- payload y cursor;
- cada Membresía candidata y unicidad Persona–Grupo;
- guard determinista y correlación completa;
- Grupo activo;
- contexto de Temporada abierta exacta.

El cursor no conserva autoridad entre invocaciones. Cambios concurrentes pueden alterar el conjunto operativo, pero nunca habilitan otra Persona.

### 22.3 Privacidad

- no se enumeran Membresías ajenas;
- no se resuelven ni exponen Personas;
- `personId` nunca aparece en input, DTO ni cursor;
- el nombre de Grupo se considera contexto mínimo del Grupo que la Membresía propia habilita;
- datos administrativos y legacy permanecen privados;
- los errores no revelan IDs o existencia de pertenencias ajenas.

## 23. Reglas Firestore

Las reglas continúan backend-only:

```text
match /personas/{personaId} { allow read, write: if false; }
match /seasons/{seasonId} { allow read, write: if false; }
match /memberships/{membershipId} { allow read, write: if false; }
match /activeMembershipGuards/{guardId} { allow read, write: if false; }
```

Grupo v1 tampoco se habilita para lectura cliente mediante este incremento. No se modifican reglas. Las pruebas deben confirmar denegación directa aun para Owner, integrante y global admin, y éxito únicamente a través del callable autenticado conforme a su autorización backend.

## 24. Repositorios, readers y adaptadores

| Componente | Capa | Responsabilidad | Cambio previsto |
|---|---|---|---|
| validador de contrato de Membresías | Aplicación | payload y cursor cerrados | Ampliar |
| servicio de Membresías | Aplicación | coordinar listado propio | Ampliar |
| DTO de Membresías | Aplicación | componer respuesta mínima | Ampliar sin alterar DTO E2-03 |
| `firestoreMyMembershipReader` o reader específico equivalente | Infraestructura | listado físico e integridad por candidata | Ampliar o separar según responsabilidad |
| active membership guard | Infraestructura | hidratar y correlacionar guard | Reutilizar lógica exacta |
| adaptador de contexto member-readable | Infraestructura entre módulos | consumir capacidades internas de Grupos | Agregar |
| Módulo Grupos | Aplicación/infraestructura | Grupo y Temporada member-safe mínimos | Agregar capacidades internas |
| callable de Membresías | Presentación | identidad, errores HTTPS, resultado | Ampliar con un export público |
| servicio frontend de Membresías | Presentación | invocar y tipar listado | Ampliar |

No se crea Repositorio genérico, no se expone Admin SDK fuera de infraestructura y Membresías no accede directamente a Repositorios privados de Grupos.

## 25. Transacción, consistencia y concurrencia

- **Aggregate Root modificado:** ninguno.
- **Límite transaccional:** no aplica; es una consulta.
- **Consistencia:** lectura validada por documento, sin snapshot global entre módulos.
- **Concurrencia:** el orden físico usa `fechaIngreso DESC, __name__ DESC`; cambios entre páginas obedecen la semántica normal de cursor.
- **Idempotencia:** repetir la misma consulta sin cambios observables produce el mismo resultado; no hay clave de idempotencia.
- **Fallo parcial:** prohibido devolver items ya compuestos si una dependencia falla o aparece corrupción.
- **Escrituras:** cero.

La consulta no resuelve lifecycle ni promete snapshot estable de múltiples páginas. Sí debe probar que, con fixture inmutable, no existen duplicados ni omisiones físicas.

## 26. Eventos y efectos posteriores

**NO APLICA.** E2-04 no publica eventos, notificaciones, alertas, métricas de negocio ni efectos persistentes. Sólo pueden existir logs técnicos sanitizados.

## 27. Frontend

### 27.1 Pantalla afectada

Se modifica únicamente `/dashboard/groups`.

- “Grupos que administrás” conserva su fuente owner-scoped actual.
- “Grupos que integrás” consume `listMyCurrentGroupMemberships`.
- ambas cargas y sus estados de error son independientes;
- `PERSON_REQUIRED` afecta únicamente “Grupos que integrás” y nunca bloquea, oculta ni inutiliza los Grupos administrados;
- ownership no exige Persona ni Membresía;
- un mismo Grupo puede aparecer en ambas secciones;
- no se deduplica ni se fusionan tarjetas o significados;
- no se adaptan `/profile/groups/**`, `/admin/groups/**` ni rutas públicas.

### 27.2 Estados mínimos de pertenencia

1. cargando;
2. Persona requerida;
3. sin Grupos operativos;
4. items;
5. página siguiente disponible;
6. página vacía con cursor siguiente;
7. retry;
8. dependencia no disponible;
9. estado incompatible;
10. fin de resultados.

`PERSON_REQUIRED` debe orientar al flujo canónico existente de Persona dentro de la sección de pertenencia; nunca se representa como “sin Grupos” ni como error de página completa. Una página vacía con cursor debe conservar una acción accesible para continuar. `nextCursor: null` elimina o deshabilita la continuación y comunica fin real.

### 27.3 Navegación y acceso contextual

La tarjeta de “Grupos que integrás” no enlaza a `/dashboard/groups/[groupId]` en E2-04 porque ese detalle y `getOwnGroup` continúan owner-scoped. Tampoco enlaza a rutas legacy. La navegación UAT verifica el acceso canónico a `/dashboard/groups`, la conservación de los enlaces de “Grupos que administrás”, los controles de paginación y la ausencia de destinos administrativos desde una tarjeta member-scoped. Un detalle navegable para integrantes requiere un incremento posterior.

### 27.4 Accesibilidad y responsive

- encabezados explícitos para ambas relaciones;
- feedback legible y asociado a cada sección;
- foco visible y orden de teclado coherente;
- acción de página siguiente y retry operables con teclado;
- estados anunciables sin depender sólo de color;
- comportamiento usable en móvil y escritorio;
- carga confirmada, sin actualización optimista.

## 28. Legado y transición

| Estructura o consumidor | Estado tras E2-04 | Autoridad |
|---|---|---|
| arrays `memberIds`, `adminIds`, `admins` | Aislados; sin lectura ni escritura nueva | Legacy en sus flujos actuales |
| `/profile/groups/**` | Sin cambios | Legacy |
| `/admin/groups/**` | Sin cambios | Legacy/administración actual |
| HTTP API legacy de Grupos | Sin cambios | Legacy |
| partidos | Sin cambios | Contratos actuales |
| torneos e inscripciones | Sin cambios | Contratos actuales |
| alertas y notificaciones | Sin cambios | Contratos actuales |
| fixtures históricos | No migrados ni interpretados como Membresías | Legacy |

El único flujo nuevo que usa Membresía como autoridad es “Grupos que integrás” en `/dashboard/groups`. “Grupos que administrás” continúa por ownership. No hay doble escritura porque la consulta no escribe y no sincroniza arrays. Después de E2-04 no puede declararse migrado ningún consumidor legacy, roster, partido, torneo, inscripción, alerta o navegación general.

## 29. Observabilidad

Se permiten eventos técnicos sanitizados para inicio, éxito, error estable, cantidad física escaneada, cantidad incluida y existencia de continuación. Se prohíbe registrar Persona, email, contenido del cursor, guard, hashes, snapshots o documentos completos. Los IDs sólo podrán aparecer si la política vigente de logs los admite y son indispensables para diagnóstico; por defecto deben omitirse.

## 30. Plan de pruebas

### 30.1 Dominio, aplicación y contrato

- payload cerrado y claves desconocidas;
- `pageSize` omitido usa 20;
- mínimo 1, máximo 20, cero, negativo, decimal, string y mayor que 20;
- cursor válido;
- Base64URL inválido, JSON inválido, claves incorrectas y checksum incorrecto;
- versión, contrato u orden incorrectos;
- timestamp o `membershipId` inválidos;
- token truncado o fuera de tamaño;
- cursor caller-crafted estructuralmente válido limitado a la Persona autenticada;
- autenticación ausente;
- cuenta requerida;
- Persona requerida sin consulta global;
- Persona incompatible;
- cero Membresías;
- una y varias Membresías;
- mismo Grupo como Owner e integrante sin deduplicación entre secciones;
- actor no Owner con Membresía válida;
- global admin sin Membresía no obtiene resultados ajenos;
- DTO y error mapping cerrados;
- ausencia de campos prohibidos.

### 30.2 Integridad y contexto

- activa con Temporada exacta abierta;
- activa sin contexto abierto exacto excluida, sin inferir cierre, retiro o historia;
- ausencia legítima de Temporada abierta excluida;
- Temporada abierta de otro Grupo;
- más de una apertura incompatible con las invariantes E2-02;
- dependencia de contexto abierto con estructura imposible;
- Grupo ausente, inactivo o incompatible;
- guard ausente o roto;
- activa huérfana;
- candidata distinta de la única activa;
- dos activas del mismo Grupo aunque aparezcan en páginas distintas;
- referencias de Persona y Grupo rotas, y corrupción comprobable del guard/contexto abierto;
- documento de Membresía incompatible;
- dependencia temporal no disponible sin lista parcial;
- correlación completa de IDs y estados.

### 30.3 Consulta, índice y cursor

- consulta exacta `personId + estado + fechaIngreso DESC + __name__ DESC`;
- índice nuevo exacto sin `__name__` declarado y orden efectivo descendente en Emulator Suite;
- reutilización del índice Persona–Grupo–estado para `limit(2)`;
- empate de `fechaIngreso` resuelto por ID descendente;
- primera, intermedia y última página;
- página vacía con `nextCursor`;
- cursor basado en último documento crudo procesado, no último item incluido;
- lookahead no omitido en la página siguiente;
- paginación sin duplicados ni omisiones físicas con fixture inmutable;
- no existen loops de relleno;
- fin real con `nextCursor: null`.

### 30.4 Reglas, arquitectura y efectos

- reglas backend-only para todas las colecciones canónicas;
- integrante no recibe acceso Firestore directo;
- las capacidades internas no quedan exportadas como callables;
- owner-scoped existente no cambia ni se usa para autorización member-scoped;
- Módulo Membresías consume puertos, no Repositorios internos de Grupos;
- aislamiento de rutas, APIs y arrays legacy;
- cero escrituras y cero efectos colaterales;
- deuda E2-02 no es ejercitada como corrección.

### 30.5 Frontend

- estados cargando, Persona requerida, vacío legítimo, items y fin;
- página siguiente normal y página vacía con continuación;
- retry por dependencia no disponible;
- error incompatible separado de vacío;
- `PERSON_REQUIRED` local a pertenencia mientras ownership continúa utilizable;
- dos secciones visibles y semánticamente independientes;
- mismo Grupo visible en ambas cuando corresponde;
- navegación member-safe sin callable owner-scoped;
- teclado, foco, lectores de estado, móvil y escritorio.

### 30.6 Herramientas y evidencia

| Nivel | Entorno | Evidencia requerida |
|---|---|---|
| Dominio/aplicación | tests de Functions | resultados y casos negativos |
| Contrato | tests unitarios/callable | payloads, DTOs y errores |
| Integración | Firestore Emulator | consulta, índices, integridad y fallos |
| Reglas | Rules Unit Testing/Emulator | deny-all positivo y negativo |
| Frontend | tests de componentes y revisión manual | estados y separación visual |
| Arquitectura | tests/inspección de exports | ausencia de callables internos |
| Calidad | lint, typecheck, syntax, tests, build, diff | baseline completa |

## 31. UAT mínimo

### 31.1 Entorno y fixture

- Emulator Suite local; ningún proyecto Firebase remoto.
- fixtures canónicos explícitos y descartables;
- al menos un Owner con Persona y Membresía propia;
- un integrante no Owner con Membresía/guard íntegros;
- Membresías suficientes para varias páginas;
- casos de Temporada no abierta y, si resulta práctico, ventana completamente filtrada con continuación.

### 31.2 Casos manuales

1. **Owner sin Persona:** conserva visibles y utilizables sus Grupos administrados; únicamente la sección de pertenencia muestra `PERSON_REQUIRED`, no hay consulta de Membresías y el error no bloquea la página.
2. **Persona válida sin Membresías:** “Grupos que integrás” muestra vacío legítimo.
3. **Owner con Membresía propia:** el mismo Grupo aparece en “Grupos que administrás” y “Grupos que integrás”, sin fusión.
4. **Integrante no Owner:** el Grupo aparece sólo en “Grupos que integrás” y no obtiene controles owner-scoped.
5. **Sin contexto abierto exacto:** la Membresía no aparece como operativa y la UI no infiere cierre, retiro ni condición histórica.
6. **Múltiples páginas:** avanzar conserva orden y no duplica ni omite documentos físicos.
7. **Página vacía con continuación:** si el fixture lo permite, se puede solicitar la siguiente página.
8. **Navegación:** se puede llegar por el flujo canónico a `/dashboard/groups`; los enlaces owner-scoped existentes se conservan y las tarjetas member-scoped no abren el detalle owner-scoped ni rutas legacy.
9. **Retry:** una indisponibilidad simulada muestra feedback estable y permite reintentar sin efectos.
10. **Accesibilidad:** teclado, foco, anuncio de estados, móvil y escritorio.
11. **Inspección de efectos:** confirmar cero escrituras en todas las colecciones.

## 32. Criterios de aceptación

1. **Dado** un actor no autenticado, **cuando** invoca el contrato, **entonces** recibe `UNAUTHENTICATED` sin datos.
2. **Dado** un Owner válido sin `personaId`, **cuando** abre `/dashboard/groups`, **entonces** “Grupos que administrás” permanece visible y utilizable, sólo “Grupos que integrás” recibe `PERSON_REQUIRED`, no se consultan Membresías y no se crea Persona.
3. **Dado** un vínculo a Persona incompatible, **cuando** consulta, **entonces** recibe `PERSON_INCOMPATIBLE` y no un vacío.
4. **Dada** una Persona válida sin Membresías operativas, **cuando** termina el recorrido, **entonces** recibe `items: []` y `nextCursor: null`.
5. **Dada** una Membresía íntegra de Temporada abierta exacta y Grupo activo, **cuando** consulta su Persona, **entonces** recibe el DTO mínimo.
6. **Dada** una Membresía activa sin contexto abierto o cuyo `seasonId` no coincide con la apertura válida del mismo Grupo, **cuando** se procesa, **entonces** se excluye sin error y sin clasificar la referencia anterior.
7. **Dado** un contexto abierto con corrupción comprobable, apertura de otro Grupo, múltiples aperturas incompatibles o estructura imposible, **cuando** se procesa, **entonces** falla con `INCOMPATIBLE_STATE` sin lista parcial.
8. **Dada** corrupción de unicidad o guard, **cuando** la candidata se valida, **entonces** se devuelve `INCOMPATIBLE_STATE` aunque el duplicado esté en otra página.
9. **Dado** `pageSize` omitido, **cuando** consulta, **entonces** se procesan como máximo 20 candidatas; ningún valor mayor a 20 es aceptado.
10. **Dado** un cursor con codificación, JSON, claves, checksum, versión, contrato, orden, timestamp, ID o tamaño inválidos, **cuando** continúa, **entonces** recibe `VALIDATION_FAILED`.
11. **Dado** un cursor caller-crafted estructuralmente válido con checksum recalculado, **cuando** continúa, **entonces** sólo reposiciona la consulta fijada a la Persona autenticada y no revela datos ajenos.
12. **Dada** una ventana cuyos documentos son filtrados y existe lookahead, **cuando** responde, **entonces** puede devolver `items: []` con cursor no nulo desde el último crudo procesado.
13. **Dado** un fixture inmutable, **cuando** recorre todas las páginas, **entonces** no omite ni duplica documentos físicos.
14. **Dado** un Owner que también es integrante, **cuando** abre la pantalla, **entonces** el Grupo aparece en ambas secciones sin deduplicación contextual.
15. **Dado** un integrante no Owner, **cuando** consulta, **entonces** ve el contexto mínimo y no recibe ownership ni controles administrativos.
16. **Dado** un global admin sin Membresía, **cuando** consulta, **entonces** no enumera Membresías ni Personas ajenas.
17. **Dado** acceso cliente directo, **cuando** intenta leer colecciones canónicas, **entonces** las reglas lo deniegan.
18. **Dada** una dependencia no disponible, **cuando** no puede confirmarse integridad, **entonces** hay error estable y retry, sin lista parcial.
19. **Dada** la ejecución del flujo, **cuando** concluye con éxito o error, **entonces** no existe escritura ni efecto colateral.

## 33. Componentes actuales reutilizados

| Componente | Reutilización | Adaptación | Riesgo |
|---|---|---|---|
| identidad autenticada de callables | Derivar UID | Ninguna semántica nueva | Bajo |
| self-account reader | Cuenta y `personaId` | Preservar `PERSON_REQUIRED` | Bajo |
| self-person reader | Persona propia estricta | Mapear incompatibilidad | Bajo |
| dominio Membresía v1 | Hidratación exacta | Ninguna relajación | Bajo |
| guard activo E2-03 | ID, hidratación y correlación | Exponer uso de lectura seguro | Medio |
| índice Persona–Grupo–estado | Unicidad exacta | Ninguna | Bajo |
| dominio Grupo/Temporada | Hidratación | Capacidades internas sin owner | Medio |
| callable/error mapping Membresías | Transporte estable | Agregar operación y errores | Bajo |
| `/dashboard/groups` | Pantalla canónica | Agregar sección independiente | Medio |

Reutilizar no implica convertir un contrato owner-scoped en member-scoped.

## 34. Estructuras anteriores retiradas

No se retira ninguna estructura en E2-04. Los consumidores legacy permanecen delimitados y no reciben nuevos escritores. La condición de retiro futura exige una ficha propia por flujo, equivalencia funcional probada y evidencia de que Membresía reemplaza allí al array correspondiente.

## 35. Riesgos y deuda aceptada

1. **Costo N+1:** aceptado para máximo 20; optimización futura sin debilitar integridad.
2. **Páginas escasas o vacías:** consecuencia legítima del filtrado posterior; se mitiga con cursor y estado visual explícito.
3. **Cambios entre páginas:** no existe snapshot global; se documenta semántica normal de cursor.
4. **Corrupción preexistente:** falla cerrada y requiere intervención separada.
5. **Navegación member-safe limitada:** no autoriza migrar el detalle owner-scoped ni rutas legacy.
6. **Índice nuevo:** debe validarse localmente en Emulator Suite antes de cierre.
7. **Checksum de cursor:** detecta corrupción accidental y alteraciones sin recálculo, pero no es firma ni barrera criptográfica; no se incorpora HMAC o secreto y la seguridad depende de derivar Persona en cada llamada.

## 36. Relación con la deuda concurrente E2-02

La intermitencia rara de concurrencia durante apertura de Temporada E2-02 no bloquea E2-04:

- E2-04 no abre, cierra ni modifica Temporadas;
- sólo lee el contexto autoritativo ya persistido;
- una dependencia indisponible produce `DEPENDENCY_UNAVAILABLE` y retry;
- un contexto incompatible falla cerrado;
- no se corrige, reproduce ni amplía la deuda E2-02 dentro de este incremento.

No existe dependencia técnica real que obligue a resolver esa concurrencia para implementar la consulta.

## 37. Relación con E2-05

E2-04 habilita una base legítima de acceso contextual member-scoped y puede informar la definición de E2-05. No anticipa su corte. Roster, incorporación de terceros, solicitudes, roles, permisos, lifecycle y migración de consumidores requieren definición separada. E2-05 no debe asumir que consultar pertenencia equivale a administrar Grupo.

## 38. Checkpoint y rollback

- **Commit inicial:** `c219f83f46ab4ec3bdc78e8674ded05c5e56a782`.
- **Rama inicial:** `dev`.
- **Upstream inicial:** `origin/dev`, divergencia `0/0`.
- **Estado inicial:** limpio; E2-03 cerrado e integrado.
- **Rama futura:** `feat/e2-04-my-groups-by-membership`, sólo después de aprobar esta ficha.
- **Checkpoint intermedio futuro:** contrato/cursor/readers/capacidades internas/índice y pruebas de emulador antes de conectar UI.
- **Rollback de código futuro:** revertir exclusivamente el incremento; no usar doble escritura.
- **Datos de prueba:** fixtures locales descartables; como el flujo no escribe, no hay datos productivos de E2-04 que revertir.
- **Interrumpir si:** el índice no soporta el orden, las capacidades internas abren autoridad, aparece lista parcial o no puede garantizarse unicidad completa.
- **Reanudar si:** existe decisión documental explícita y evidencia local de la corrección.

## 39. Evidencia de cierre requerida

Una implementación posterior deberá adjuntar:

- commits y rama;
- contrato y DTO finales;
- pruebas unitarias, integración, reglas y frontend;
- evidencia Emulator Suite de ambos índices y `__name__ DESC`;
- casos de cursor y página vacía con continuación;
- evidencia de unicidad/guard en páginas distintas;
- evidencia de capacidades internas no exportadas;
- UAT de secciones separadas, Persona requerida y no Owner;
- baseline de calidad y `git diff --check`;
- inspección de cero escrituras y aislamiento legacy;
- deuda aceptada y procedimiento de rollback;
- informe de implementación y cierre separados.

## 40. Trazabilidad

| Decisión | Evidencia de implementación futura |
|---|---|
| Membresía es autoridad | consulta nace de `memberships` |
| Persona propia obligatoria | `PERSON_REQUIRED` antes de la consulta |
| Operatividad temporal | coincidencia exacta con Temporada abierta |
| Integridad completa | `limit(2)` + guard por candidata |
| Privacidad | DTO cerrado y ausencia de `personId` |
| Member-safe | capacidades internas sin ownership |
| Orden estable | `fechaIngreso DESC, __name__ DESC` |
| Filtrado posterior | cursor desde último crudo procesado |
| Backend-only | reglas sin cambios y pruebas deny-all |
| Separación conceptual | dos secciones sin deduplicación |
| Transición | cero arrays y cero doble escritura |

## 41. Decisiones cerradas

- alternativa A exclusivamente;
- Usuario autenticado con Persona propia;
- `PERSON_REQUIRED` no equivale a vacío;
- Membresía como fuente de pertenencia;
- definición estricta de operatividad;
- guard obligatorio y correlacionado;
- unicidad completa Persona–Grupo por candidata;
- N+1 aceptado hasta 20;
- callable público único;
- capacidades internas member-safe no callables;
- paginación default/máximo 20 y mínimo 1;
- cursor opaco v1 sin `personId`, con checksum no criptográfico y sin HMAC/secreto;
- cursor desde último crudo procesado;
- página vacía con continuación válida;
- índice nuevo exacto con `__name__ DESC` implícito;
- DTO mínimo aprobado;
- `/dashboard/groups` como único consumidor;
- propiedad y pertenencia separadas, sin deduplicación;
- Firestore cliente deny-all;
- deuda E2-02 no bloqueante y fuera de alcance.

## 42. Decisiones postergadas

- lifecycle y semántica histórica persistente;
- optimización del costo N+1;
- snapshot consistente entre múltiples páginas;
- roster y consulta de Personas ajenas;
- roles, cargos y permisos de Membresía;
- solicitudes y alta de terceros;
- detalle navegable member-scoped;
- migración o retiro de cada consumidor legacy;
- corte final de E2-05.

Estas decisiones no bloquean E2-04 y no pueden resolverse implícitamente durante su implementación.

## 43. Declaración final de definición

E2-04 queda definido como un único caso de consulta propia, paginado, backend-only y sin escrituras. La autorización nace de la identidad autenticada, el vínculo a Persona y cada Membresía propia validada; nunca de ownership, rol global, email, cursor o arrays legacy. La respuesta sólo contiene Membresía propia mínima y contexto público mínimo de Grupo cuando la Temporada abierta coincide exactamente.

La ficha fue revisada y aprobada. E2-04 queda listo para implementar en una intervención posterior y separada. No quedan decisiones funcionales abiertas que impidan iniciar esa implementación.

- **Estado final de implementación:** no aplica; la implementación aún no comenzó.
- **Criterios incumplidos:** pendientes de ejecución y verificación, no bloqueados por definición.
- **Deuda aceptada:** costo N+1, páginas filtradas y ausencia de snapshot global multipágina.
- **Responsable de aprobación:** responsable de SPORTEXA.
- **Fecha de cierre:** pendiente.

## Veredicto

`E2-04 FICHA APROBADA — LISTA PARA IMPLEMENTAR`
