# Ficha de Incremento Implementable E2-03 — Alta explícita de Membresía propia del Owner

## Estado de la ficha

- **Estado:** `LISTA PARA IMPLEMENTAR`.
- **Fecha de definición:** 2026-08-27.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Fuente de verdad principal:** Membresía.
- **Caso de uso atendido:** CU-025 — Crear una Membresía, limitado al alta explícita de la Persona propia del Owner dentro de un Grupo propio y una Temporada abierta.
- **Alternativa aprobada:** A — Membresía propia del Owner.
- **Rama prevista para una implementación posterior:** `feat/e2-03-membership-owner-self`; no debe crearse durante la definición documental.
- **Checkpoint documental:** `dev` en `385555e10b481bc51a3d75b9cfa1280709f029a4`, coincidente con `origin/dev` al iniciar esta definición.

Esta ficha es normativa para E2-03. No implementa código, no modifica los Documentos 1–5 y no autoriza Firebase remoto, despliegues, ramas, commits, push ni merge.

### Naturaleza de las decisiones

- Los Documentos 1–4 congelados gobiernan el significado de Persona, Grupo, Temporada, Membresía, Owner y Solicitud.
- Documento 5 gobierna el corte incremental, las fuentes de verdad, la transición por flujo, la ausencia de doble escritura y la plantilla de esta ficha.
- Las fichas, informes y cierres E1-02, E2-01 y E2-02 fijan los contratos disponibles y las convenciones ya verificadas.
- El código y las pruebas describen el estado técnico de partida. Los arrays, roles, rutas y datos legacy no adquieren autoridad normativa.
- No se agregan campos, permisos, proyecciones o eventos para preparar casos de uso futuros.

## 1. Identificación y título

- **Identificador:** E2-03.
- **Título final:** Alta explícita de Membresía propia del Owner.
- **Objetivo resumido:** materializar Membresía como Aggregate Root y fuente de verdad independiente mediante el menor flujo legítimo que vincula una Persona existente, un Grupo existente y una Temporada abierta.
- **Actor iniciador:** Owner actual del Grupo, actuando sobre su propia Persona vinculada.
- **Operación principal:** `createMyMembershipForOwnedGroup`.
- **Consulta mínima complementaria:** `getMyMembershipForOwnedGroup`.

El título “Contexto mínimo Grupo–Persona–Membresía” se descarta porque omite la precondición normativa de Temporada abierta y no expresa que el alta es propia, explícita y owner-scoped.

## 2. Fuentes normativas

### 2.1 Documentos de producto y arquitectura

1. **Documento 1 — Arquitectura del Producto y Modelo de Dominio**:
   - Membresía representa el vínculo Persona–Grupo;
   - administra sólo el estado y atributos propios de esa relación;
   - el contexto de Temporada pertenece a la participación;
   - Owner es propiedad funcional del recurso, no Membresía;
   - Plan no modifica permisos deportivos.
2. **Documento 1.5 — Modelo Conceptual del Dominio**:
   - Usuario, Persona y Membresía son conceptos diferentes;
   - el Usuario se vincula con Persona, nunca con Membresía;
   - una Persona puede tener varias Membresías históricas;
   - no puede tener más de una Membresía activa simultánea en el mismo Grupo;
   - roles y permisos contextuales pertenecen a Membresía, no a Usuario global.
3. **Documento 2 — Modelo Funcional y Casos de Uso**:
   - CU-025 crea una Membresía sólo asociada a Temporada abierta;
   - una Temporada cerrada no admite creación o modificación de Membresías;
   - renovar crea una Membresía para una nueva Temporada;
   - Solicitud posee casos de uso separados.
4. **Documento 3 — Arquitectura Funcional y Diseño Técnico**:
   - Membresía es el único Aggregate Root de su Agregado;
   - Persona, Grupo y Temporada permanecen fuera;
   - la unicidad activa Persona–Grupo pertenece al Contexto de Membresías y debe protegerse al crear, reactivar o cambiar estado.
5. **Documento 4 — Diseño de la Arquitectura de Software**:
   - el Módulo Membresías encapsula estado, ciclo y atributos de la relación;
   - Repositorios operan sobre un único Aggregate Root;
   - contratos públicos no exponen Firestore ni Aggregate Roots ajenos;
   - autenticación, autorización funcional, validez de dominio y habilitación comercial son condiciones separadas.
6. **Documento 5 — Plan de Implementación y Transición Técnica**:
   - Membresía es la fuente de verdad Persona–Grupo;
   - arrays de Grupo no deben ser autoridad;
   - no hay backfill histórico ni doble escritura;
   - E2-03 crea para Persona, Grupo y Temporada abierta y garantiza unicidad activa;
   - el frontend integra el mismo incremento.

### 2.2 Incrementos anteriores vinculantes

- E1-02: ficha, informe y cierre de alta de Persona propia y vínculo `users/{uid}.personaId`.
- E2-01: ficha, informe y cierre de Grupo v1, `ownerId`, acceso owner-scoped y separación ownership–Membresía.
- E2-02: ficha, informe y cierre de Temporada independiente y `getOpenSeasonContext({ groupId })`.

### 2.3 Estado previo verificado

- E2-01 está cerrado e integrado.
- E2-02 está cerrado e integrado.
- Commit de implementación E2-02: `a43139fb862b25b46fe443819447366a78b0b271`.
- Merge de implementación E2-02 en `dev`: `54674d8e29ab46fb91589c3f5724aed1acd69897`.
- Merge del cierre documental E2-02 y HEAD de definición: `385555e10b481bc51a3d75b9cfa1280709f029a4`.
- E2-02 habilita exclusivamente la definición de E2-03.

## 3. Dependencias

### 3.1 Dependencias funcionales satisfechas

1. Usuario autenticado identificable mediante UID verificado.
2. Cuenta `users/{uid}` materializada por el contrato `self-account`.
3. Persona propia existente y vinculada mediante `users/{uid}.personaId`.
4. Grupo canónico v1 existente, activo y owner-scoped.
5. Temporada abierta autoritativa recuperable mediante `getOpenSeasonContext` o su capacidad interna equivalente.
6. Backend como único escritor y reglas privadas por defecto.

### 3.2 Dependencias que no participan

- `users.roles`;
- administradores delegados;
- Membresías previas reconstruidas desde arrays;
- Solicitud;
- Plan o Suscripción;
- Club;
- pagos, partidos, entrenamientos, torneos, estadísticas o Actividad.

## 4. Objetivo funcional

Permitir que el Owner actual de un Grupo canónico decida incorporarse deportivamente mediante la creación explícita de una Membresía para su propia Persona vinculada y la Temporada abierta del Grupo.

La operación produce una fuente de verdad real, consultable y verificable sin buscar Personas ajenas, solicitar consentimiento de terceros, crear Solicitud ni migrar consumidores legacy.

Ownership continúa siendo suficiente para administrar el Grupo. Membresía expresa pertenencia deportiva y no es una condición para conservar ownership.

## 5. Actor y caso de uso

| Actor o concepto | Participación | Autoridad | Resultado permitido |
|---|---|---|---|
| Usuario autenticado | Identidad técnica | UID del token | Iniciar la operación |
| Owner actual | Actor principal | `groups/{groupId}.ownerId == UID` | Crear la Membresía de su propia Persona |
| Persona propia | Sujeto de la relación | `users/{uid}.personaId` y Persona válida | Ser referenciada por la nueva Membresía |
| Integrante | Estado contextual resultante | Membresía activa | Quedar representado como integrante del Grupo |
| Global `admin` no Owner | Actor rechazado | Ninguna para este flujo | No lee ni crea |
| Usuario no Owner | Actor rechazado | Ninguna | No lee ni crea |
| Sistema | Coordinador confiable | Backend | Validar y confirmar atómicamente |

### 5.1 Regla de explicitud

- Crear un Grupo no crea Membresía.
- Abrir una Temporada no crea Membresía.
- Vincular una Persona no crea Membresía.
- Transferir ownership no crea, finaliza ni transfiere Membresía.
- La Membresía nace únicamente cuando el Owner activa expresamente “Incorporarme como integrante” y el comando se confirma.

## 6. Precondiciones

### 6.1 Precondiciones funcionales

1. El actor está autenticado.
2. Su cuenta existe y es compatible con los contratos E1.
3. Su cuenta contiene `personaId` válido.
4. La Persona referenciada existe y posee esquema compatible.
5. El Grupo existe con esquema v1 exacto y `estado: "activo"`.
6. El actor es el Owner vigente del Grupo.
7. Existe una Temporada abierta para ese Grupo.
8. No existe otra Membresía con `estado: "activa"` para la misma Persona y Grupo, cualquiera sea su Temporada.
9. El payload cerrado y la clave de idempotencia son válidos.

### 6.2 Ausencia de Persona

Si `users/{uid}` no contiene `personaId`, el resultado es `PERSON_REQUIRED`. No se genera ID de Membresía confirmado, no se crea guard y no se modifica Usuario, Persona, Grupo, Temporada ni ninguna estructura legacy.

Si `personaId` existe pero es inválido, apunta a una Persona ausente o la Persona tiene esquema incompatible, el resultado es `PERSON_INCOMPATIBLE`. El flujo falla cerrado y no crea una Persona sustituta.

### 6.3 Persona incompatible

E2-03 considera compatible exclusivamente una Persona recuperable por el contrato E1-02 y reconstruible con su esquema vigente. No compara email, nombre o apellido, no busca duplicados por datos descriptivos y no intenta reparar el vínculo.

## 7. Flujo principal

1. El Owner abre `/dashboard/groups/{groupId}` mediante los contratos E2-01.
2. La presentación obtiene su estado de Persona mediante el contrato E1-02.
3. La presentación obtiene la Temporada abierta mediante `getOpenSeasonContext({ groupId })`.
4. La presentación consulta `getMyMembershipForOwnedGroup({ groupId })`.
5. Ante ausencia de Membresía, Persona válida y Temporada abierta, muestra la acción explícita “Incorporarme como integrante”.
6. El actor activa la acción; el frontend conserva una `idempotencyKey` estable para esa intención.
7. El callable recibe exactamente `{ groupId, idempotencyKey }`.
8. El backend obtiene el UID sólo del token y valida la cuenta.
9. Resuelve la Persona propia mediante la capacidad E1-02; el cliente no envía `personId`.
10. Recupera el Grupo v1 y comprueba ownership.
11. Consume la capacidad interna equivalente a `getOpenSeasonContext`; no accede al Repositorio de Temporadas, al guard abierto ni a Firestore de Temporada desde el Módulo Membresías.
12. Construye una Membresía nueva con ID opaco, Persona, Grupo y Temporada referenciados, `estado: "activa"` y versión 1.
13. Calcula el ID del guard, el hash de idempotencia y el request hash.
14. Ejecuta una transacción Firestore de Membresía.
15. Dentro de la transacción relee Grupo y ownership, lee el guard del par Persona–Grupo y valida cualquier Membresía correlacionada.
16. Si el guard no existe, consulta con límite 2 y comprueba que no haya una o más Membresías activas huérfanas de guard para el mismo par.
17. Crea Membresía y guard en el mismo commit con timestamps de servidor.
18. Recupera y reconstruye la Membresía confirmada.
19. Devuelve `outcome: "CREATED_ACTIVE"` y el DTO público.
20. El frontend presenta la Membresía activa y conserva separada la leyenda de acceso por ownership.

## 8. Alcance incluido

- Aggregate Root Membresía mínimo y puro.
- Creación explícita de Membresía para la Persona propia del Owner.
- Estado inicial único `activa`.
- Referencias obligatorias a Persona, Grupo y Temporada abierta.
- `fechaIngreso` fijada por backend.
- Consulta estrictamente owner/self-scoped de la Membresía activa.
- Repositorio exclusivo del Agregado Membresía.
- Reader mínimo de contexto propio.
- Guard técnico de unicidad activa Persona–Grupo.
- Idempotencia, retry, respuesta perdida y concurrencia.
- Autorización por ownership actual.
- Contratos callable, payloads cerrados, DTO y errores estables.
- Reglas Firestore backend-only.
- Índice necesario para comprobar la unicidad y detectar corrupción sin guard.
- Sección frontend integrada en el detalle canónico del Grupo.
- Pruebas de dominio, aplicación, contrato, persistencia, seguridad, frontend, arquitectura y legado.
- UAT local con emuladores, `demo-*`, loopback y datos sintéticos.

## 9. Exclusiones

- alta administrativa de Persona ajena;
- búsqueda, listado, selección, enumeración o reclamación de Personas;
- alta o edición de Persona;
- invitaciones, consentimiento, aceptación o rechazo;
- Solicitud y sus estados;
- baja, finalización o fecha de egreso;
- reactivación o reingreso;
- renovación y vínculo con Membresía anterior;
- cambio de estado;
- rol deportivo;
- cargo;
- permisos configurables o administración delegada;
- posición;
- dorsal;
- observaciones;
- edición o backdating de `fechaIngreso`;
- múltiples Temporadas en una misma Membresía;
- historial o listado de Membresías;
- consulta de integrantes del Grupo;
- member-access general;
- transferencia de ownership;
- cierre o reapertura de Temporada;
- migración o reconstrucción histórica;
- escritura o sincronización de arrays legacy;
- doble lectura o doble escritura;
- adaptación de consumidores deportivos existentes;
- pagos, partidos, entrenamientos, torneos, estadísticas, rendimiento, Actividad y notificaciones;
- Comercial, Plan, Suscripción y Club;
- Firebase remoto y despliegues.

## 10. Modelo de dominio

### 10.1 Aggregate Root

`Membresía` es el único Aggregate Root del Agregado Membresía. Su identidad es `membershipId` y su responsabilidad en E2-03 es representar una pertenencia Persona–Grupo válida dentro de una Temporada.

### 10.2 Estado mínimo

| Atributo | Naturaleza | Incluido | Regla |
|---|---|---|---|
| `membershipId` | Identidad de la relación | Sí | Opaco, backend-only |
| `personId` | Referencia de identidad deportiva | Sí | Derivada de la Persona propia |
| `groupId` | Referencia organizativa | Sí | Grupo v1 propio y activo |
| `seasonId` | Contexto temporal | Sí | Temporada abierta del Grupo |
| `estado` | Ciclo de vida | Sí | Valor inicial exacto `activa` |
| `fechaIngreso` | Fecha funcional | Sí | Timestamp de servidor al confirmar |
| `fechaEgreso` | Ciclo futuro | No | E2-05 |
| rol deportivo | Función deportiva | No | Caso posterior |
| cargo | Función administrativa descriptiva | No | Caso posterior |
| permisos | Autorización delegada | No | Caso posterior |
| posición | Dato deportivo contextual | No | Caso posterior |
| dorsal | Dato deportivo contextual | No | Caso posterior |
| observaciones | Dato descriptivo | No | Sin necesidad actual |
| `createdAt` | Metadato técnico | Sí | Timestamp del mismo commit |
| `schemaVersion` | Compatibilidad persistente | Sí | Valor exacto `1` |

### 10.3 Separación conceptual

- **Identidad de la relación:** `membershipId`.
- **Sujetos externos:** `personId` y `groupId`.
- **Contexto temporal:** `seasonId`.
- **Ciclo de vida:** `estado` y `fechaIngreso`.
- **Autorización:** ownership valida este comando; no se persiste como permiso de Membresía.
- **Función deportiva:** no se modela en E2-03.
- **Datos descriptivos:** no se modelan en E2-03.

Persona, Grupo y Temporada no forman parte del Agregado, no se copian y no se modifican.

## 11. Invariantes

1. Toda Membresía tiene ID opaco válido.
2. `personId`, `groupId` y `seasonId` son referencias obligatorias, canónicas y sin `/`.
3. El estado inicial y único admitido por schema v1 E2-03 es `activa`.
4. `fechaIngreso` y `createdAt` son timestamps válidos fijados por servidor en el commit de creación.
5. `schemaVersion` es exactamente `1`.
6. El documento posee exactamente los campos aprobados.
7. Persona, Grupo y Temporada permanecen fuera del Agregado.
8. Como máximo existe una Membresía activa para una Persona y Grupo, incluso si existen Membresías históricas de otras Temporadas.
9. La unicidad anterior pertenece al Contexto de Membresías y se protege mediante guard y transacción; no convierte Grupo en contenedor.
10. Una Membresía de Temporada cerrada no puede modificarse ni reactivarse.
11. Ownership no equivale a Membresía.
12. Membresía no concede ownership.
13. La creación es siempre explícita.
14. No hay escritura paralela en arrays, Usuario, Persona, Grupo o Temporada.

## 12. Relación con Temporada

### 12.1 Consumo obligatorio

E2-03 consume `getOpenSeasonContext({ groupId })` o la misma capacidad pública adaptada para colaboración interna. Su finalidad es obtener un DTO mínimo autoritativo y verificar:

- que existe Temporada;
- que pertenece al Grupo;
- que su estado es `abierta`;
- que el actor conserva ownership del Grupo.

El Módulo Membresías no accede a `firestoreSeasonRepository`, `openSeasonGuards` ni documentos `seasons` directamente.

### 12.2 Cardinalidad temporal

- Cada Membresía E2-03 referencia exactamente una Temporada.
- Una Temporada puede ser referenciada por muchas Membresías.
- Una Persona puede poseer varias Membresías históricas para el mismo Grupo en distintas Temporadas.
- Nunca puede poseer más de una con estado `activa` para ese Grupo.

### 12.3 Cierre futuro de la Temporada

Cerrar una Temporada no modifica automáticamente otros Agregados. Por ello:

1. la Membresía conserva físicamente `estado: "activa"`, `seasonId` y sus fechas tal como fueron confirmados;
2. deja de ser operativamente utilizable porque su Temporada ya no está abierta;
3. queda congelada: no puede editarse ni reactivarse dentro de la Temporada cerrada;
4. el guard activo no se elimina, libera ni repara como efecto colateral del cierre;
5. no se crea automáticamente una Membresía para otra Temporada;
6. mientras la Membresía anterior permanezca con estado `activa`, la regla Persona–Grupo impide crear otra activa;
7. antes de implementar renovación, una ficha posterior deberá definir la transición explícita de la Membresía anterior mediante su Aggregate Root y la coordinación recuperable que permita crear la nueva sin doble estado activo.

E2-03 no resuelve esa transición porque E2-02 todavía no implementa cierre y E2-05/E2-06 poseen los cortes de ciclo de vida y renovación. No se autoriza interpretar el cierre de Temporada como `fechaEgreso` ni como cambio implícito de estado.

E2-02 todavía no permite cerrar Temporadas; por ello, E2-03 no tiene actualmente una carrera productiva con una operación de cierre. Esta ausencia temporal no convierte la validación previa de Temporada abierta en una solución suficiente para el futuro. Antes de habilitar el cierre, su propia ficha deberá definir la coordinación concurrente con `createMyMembershipForOwnedGroup`, el resultado cuando alta y cierre compitan y la garantía de que no se confirme una Membresía contra un contexto que dejó de admitirla. Esa coordinación futura deberá respetar los contratos públicos y las unidades de consistencia independientes: no autoriza a E2-03 a acceder al Repositorio de Temporadas ni a ampliar ahora su lifecycle.

## 13. Tratamiento de Solicitud

Solicitud es otra fuente de verdad y otro Agregado. No participa en E2-03.

El flujo es legítimo sin Solicitud porque:

- el actor decide sobre su propia Persona vinculada;
- el mismo actor es Owner del Grupo;
- no se busca, incorpora ni administra una Persona ajena;
- no existe tercero que deba aceptar una invitación;
- la acción es explícita y reversible sólo mediante un caso de uso futuro de Membresía.

La futura incorporación administrativa de terceros o el ingreso solicitado deberán definir consentimiento, privacidad, aceptación y coordinación con Solicitud en fichas separadas.

## 14. Contratos públicos

### 14.1 Comando modificador

`createMyMembershipForOwnedGroup({ groupId, idempotencyKey })`

- Callable v1 backend-only para persistencia.
- Actor derivado del token.
- Persona derivada del vínculo Usuario–Persona.
- Temporada derivada del contexto abierto.
- No admite `uid`, `userId`, `personId`, `seasonId`, estado, fecha, rol ni propiedades adicionales.
- Devuelve la Membresía confirmada, nunca un documento tentativo.

### 14.2 Consulta mínima

`getMyMembershipForOwnedGroup({ groupId })`

- Exige actor autenticado, cuenta, Persona válida, Grupo v1 y ownership actual.
- Devuelve `{ membership: null }` si no existe guard ni Membresía activa para el par.
- Devuelve la Membresía activa correlacionada si guard y documento son válidos.
- Falla cerrado ante guard o documento incompatible.
- No lista integrantes, no devuelve historial y no concede member-access general.

### 14.3 Contratos consumidos

| Proveedor | Capacidad | Información mínima | Uso |
|---|---|---|---|
| Usuarios | `self-account` | UID/cuenta válida y `personaId` opcional | Identidad y precondición |
| Personas | capacidad propia equivalente a `getMyPerson` | ID y compatibilidad de Persona | Resolver sujeto propio |
| Grupos | owner-access E2-01 | ID, estado, Owner | Existencia y autorización |
| Grupos/Temporada | `getOpenSeasonContext` | ID, `groupId`, estado abierto | Contexto temporal |
| Membresías | repositorio/reader propios | Aggregate Root o DTO | Crear y consultar |

## 15. Payloads cerrados

### 15.1 `createMyMembershipForOwnedGroup`

```ts
{
  groupId: string;
  idempotencyKey: string;
}
```

| Campo | Obligatorio | Validación | Origen |
|---|---|---|---|
| `groupId` | Sí | string no vacío, trim canónico, sin `/` | Ruta owner-scoped |
| `idempotencyKey` | Sí | `^[A-Za-z0-9._:-]{16,128}$` | Frontend por intención |

Las claves deben ser exactamente las anteriores.

### 15.2 `getMyMembershipForOwnedGroup`

```ts
{
  groupId: string;
}
```

No se aceptan propiedades adicionales.

## 16. DTO público

### 16.1 `MembershipDto`

```ts
{
  id: string;
  personId: string;
  groupId: string;
  seasonId: string;
  estado: "activa";
  fechaIngreso: string;
}
```

`fechaIngreso` se serializa como ISO-8601 UTC. El DTO no expone `createdAt`, `schemaVersion`, guard, hashes, clave de idempotencia, snapshots, referencias Firestore, email, roles, permisos ni documentos externos.

### 16.2 Resultados

```ts
type CreateMyMembershipResult = {
  outcome: "CREATED_ACTIVE" | "EXISTING_IDEMPOTENT";
  membership: MembershipDto;
};

type GetMyMembershipResult = {
  membership: MembershipDto | null;
};
```

## 17. Autorización

### 17.1 Condiciones separadas

- **Autenticación:** UID desde token verificado.
- **Cuenta:** recuperada mediante contrato `self-account`.
- **Persona:** recuperada mediante el vínculo propio; no concede administración.
- **Autorización funcional:** UID debe coincidir con `Grupo.ownerId`.
- **Validez de dominio:** Persona, Grupo, Temporada y Membresía deben ser compatibles.
- **Habilitación comercial:** `NO APLICA` en E2-03.

### 17.2 Matriz

| Operación | Visitante | Autenticado no Owner | Owner sin Persona | Owner con Persona | Global `admin` no Owner | Sistema |
|---|---|---|---|---|---|---|
| Consultar estado propio | Denegado | Denegado | `PERSON_REQUIRED` | Permitido | Denegado | Lee |
| Crear Membresía propia | Denegado | Denegado | `PERSON_REQUIRED` | Permitido con Temporada | Denegado | Escribe |
| Enviar otro `personId` | Sin contrato | Sin contrato | Sin contrato | Rechazado por payload | Sin contrato | No aplica |
| Escritura Firestore directa | Denegada | Denegada | Denegada | Denegada | Denegada | Admin SDK del caso |

### 17.3 Reglas expresas

- `users.roles` se ignora.
- Un global `admin` no Owner recibe `NOT_AUTHORIZED`.
- Una Persona por sí sola no autoriza administrar el Grupo.
- Una Membresía no concede ownership ni administración.
- Plan y Suscripción no participan.
- El frontend no infiere autorización desde estado local.
- Ownership se relee dentro de la transacción antes de escribir.
- Si ownership fue transferido antes del commit, el actor anterior es rechazado y no se escribe.
- Si ownership se transfiere después del commit, la Membresía ya creada permanece; la transferencia no la finaliza.
- El nuevo Owner puede administrar el Grupo sin crear Membresía.

## 18. Persistencia física

### 18.1 Colecciones

| Ruta | Finalidad | Naturaleza | Escritor | Lector |
|---|---|---|---|---|
| `memberships/{membershipId}` | Persistir Aggregate Root Membresía | Fuente de verdad Persona–Grupo | Backend E2-03 | Backend mediante contratos |
| `activeMembershipGuards/{guardId}` | Contender y resolver unicidad activa | Mecanismo técnico, no autoridad funcional | Backend E2-03 | Backend E2-03 |

### 18.2 Documento `memberships/{membershipId}`

Contiene exactamente:

```text
personId: string
groupId: string
seasonId: string
estado: "activa"
fechaIngreso: timestamp servidor
createdAt: timestamp servidor
schemaVersion: 1
```

No contiene Owner, UID, email, nombre de Persona/Grupo/Temporada, rol, cargo, permisos, posición, dorsal, observaciones, fecha de egreso, arrays ni idempotency data.

### 18.3 Identidad

- `membershipId` es un auto-ID Firestore opaco generado por backend antes de la transacción.
- No deriva de UID, email, Persona, Grupo o Temporada.
- No lo elige el cliente.
- No se reutiliza para futuras renovaciones.

### 18.4 Documento `activeMembershipGuards/{guardId}`

Contiene exactamente:

```text
membershipId: string
personId: string
groupId: string
seasonId: string
idempotencyKeyHash: string hex de 64 caracteres
requestHash: string hex de 64 caracteres
createdAt: timestamp servidor
guardVersion: 1
```

El guard:

- no es Agregado;
- no es Entidad de dominio;
- no es proyección ni fuente de verdad;
- no significa por sí solo que exista una Membresía válida;
- sólo es válido si su documento correlacionado se reconstruye y coincide exactamente;
- no se expone públicamente;
- no se crea, borra o repara fuera de las operaciones de ciclo de Membresía que lo gobiernen.

### 18.5 ID del guard

`guardId` es SHA-256 hexadecimal de 64 caracteres calculado con la convención length-prefixed existente sobre:

```text
["sportexa:E2-03:active-membership-guard:v1", groupId, personId]
```

El documento conserva `groupId` y `personId` para verificar colisión, corrupción o cálculo incompatible. El hash no sustituye esas referencias ni se utiliza como identidad funcional de Membresía.

## 19. Transacción y unidad de consistencia

- **Aggregate Root creado:** Membresía.
- **Límite transaccional:** nuevo documento Membresía y guard técnico del par Persona–Grupo.
- **Datos confirmados conjuntamente:** identidad y estado de Membresía, fechas de servidor, versión, correlación e idempotencia técnica.
- **Referencias externas consultadas previamente:** cuenta, Persona y Temporada abierta.
- **Referencia externa releída dentro de transacción:** Grupo v1 y ownership.
- **Agregados externos modificados:** ninguno.

La inclusión del guard en el commit no amplía el Agregado. Es una coordinación técnica necesaria para serializar una regla del Contexto de Membresías que abarca múltiples instancias.

### 19.1 Orden transaccional

1. Releer y reconstruir Grupo.
2. Verificar `estado: "activo"` y Owner vigente.
3. Leer e hidratar el guard determinista.
4. Si existe, leer e hidratar la Membresía correlacionada.
5. Si no existe, consultar por `personId`, `groupId` y `estado: "activa"` con límite 2 para distinguir ausencia, exactamente una activa huérfana y más de una activa como estado incompatible.
6. Resolver retry, existencia o incompatibilidad.
7. Crear Membresía.
8. Crear guard.
9. Confirmar un único commit.

No se escribe Usuario, Persona, Grupo, Temporada, arrays, Solicitud, Actividad, alerta o notificación.

## 20. Idempotencia y concurrencia

### 20.1 Hashes

`idempotencyKeyHash` usa SHA-256 length-prefixed sobre:

```text
["sportexa:E2-03:idempotency:v1", userId, groupId, personId, idempotencyKey]
```

`requestHash` usa SHA-256 length-prefixed sobre:

```text
["sportexa:E2-03:request:v1", "contract-v1", userId, personId, groupId, seasonId]
```

La clave cruda nunca se persiste ni registra.

La idempotencia persistida reside exclusivamente en `activeMembershipGuards/{guardId}` y queda acotada al contexto Persona–Grupo representado por ese guard. No existe ni se crea una colección global de idempotencia. `IDEMPOTENCY_CONFLICT` sólo puede garantizarse dentro de ese contexto y mientras exista el guard correlacionado. Reutilizar la misma clave en otro Grupo no se detecta ni debe declararse como conflicto global.

### 20.2 Comportamientos

| Situación | Resultado | Escrituras |
|---|---|---|
| Primera intención válida | `CREATED_ACTIVE` | Una Membresía y un guard |
| Retry misma clave y request hash | `EXISTING_IDEMPOTENT` | Ninguna |
| Misma clave con request hash distinto dentro del mismo guard Persona–Grupo | `IDEMPOTENCY_CONFLICT` | Ninguna |
| Otra clave con Membresía activa existente | `MEMBERSHIP_ALREADY_EXISTS` | Ninguna |
| Dos solicitudes iguales simultáneas | Una crea; la otra converge a la misma Membresía | Una unidad confirmada |
| Dos claves distintas simultáneas | Una crea; la otra recibe existencia o conflicto transaccional | Máximo una activa |
| Respuesta perdida | Retry recupera la misma Membresía | Ninguna adicional |
| Conflicto agotado | `CONFLICT` | No se afirma éxito |

### 20.3 Integridad y reparación

- Guard con esquema inválido: `INCOMPATIBLE_STATE`.
- Guard cuyo ID no corresponde al par: `INCOMPATIBLE_STATE`.
- Guard que apunta a Membresía ausente o incompatible: `INCOMPATIBLE_STATE`.
- Membresía activa sin guard: `INCOMPATIBLE_STATE`.
- Más de una activa para el par: `INCOMPATIBLE_STATE`.
- No existe reparación, adopción, borrado, recreación o backfill automático.
- La corrección de corrupción requiere intervención futura explícita, fuera de E2-03.

## 21. Errores y outcomes

| Reason | HTTPS | Significado | Respuesta de presentación |
|---|---|---|---|
| `UNAUTHENTICATED` | `unauthenticated` | Token ausente o inválido | Solicitar nueva sesión |
| `ACCOUNT_REQUIRED` | `failed-precondition` | Cuenta no materializada | Reintentar inicialización |
| `PERSON_REQUIRED` | `failed-precondition` | Cuenta sin Persona vinculada | Enlazar a alta propia E1-02 |
| `PERSON_INCOMPATIBLE` | `failed-precondition` | Vínculo o Persona inválidos | Fallar cerrado; soporte |
| `GROUP_NOT_FOUND` | `not-found` | Grupo ausente | No mostrar recurso |
| `GROUP_INCOMPATIBLE` | `failed-precondition` | Grupo no es v1 válido/activo | No reparar desde UI |
| `NOT_AUTHORIZED` | `permission-denied` | Actor no es Owner vigente | No exponer datos |
| `OPEN_SEASON_REQUIRED` | `failed-precondition` | No hay Temporada abierta | Ofrecer flujo E2-02 |
| `SEASON_INCOMPATIBLE` | `failed-precondition` | Contexto temporal corrupto o no correlacionado | Fallar cerrado |
| `VALIDATION_FAILED` | `invalid-argument` | Payload o clave inválidos | Corregir solicitud |
| `MEMBERSHIP_ALREADY_EXISTS` | `already-exists` | Otra intención ya posee activa | Recargar consulta |
| `IDEMPOTENCY_CONFLICT` | `aborted` | Clave reutilizada con request distinto dentro del guard Persona–Grupo vigente | Generar intención nueva sólo tras confirmación del usuario |
| `INCOMPATIBLE_STATE` | `failed-precondition` | Membresía o guard corruptos | No reparar automáticamente |
| `CONFLICT` | `aborted` | Contención agotada | Reintentar misma intención |
| `DEPENDENCY_UNAVAILABLE` | `unavailable` | No pudo confirmarse dependencia/estado | Reintentar misma intención |
| `INTERNAL_ERROR` | `internal` | Fallo no clasificable | Mensaje genérico |

Los mensajes no exponen existencia de Personas ajenas, documentos, hashes, stack traces ni detalles Firestore.

## 22. Capas y dependencias

### 22.1 Dominio

- Aggregate Root Membresía sin Firebase.
- Constructor de alta y mapper de reconstrucción estricta.
- Normalización/validación de IDs, estado, timestamps y esquema.
- Ninguna dependencia de Usuario, Persona, Grupo o Temporada como objetos internos.

### 22.2 Aplicación

- `MembershipService` coordina actor, contratos externos, creación, guard y DTO.
- Contratos cerrados y errores estables.
- Hashing técnico separado del dominio.
- No importa Admin SDK ni módulos de infraestructura.
- No implementa permisos generales ni lifecycle futuro.

### 22.3 Infraestructura

- `FirestoreMembershipRepository`, exclusivo de Membresía.
- `FirestoreMyMembershipReader`, modelo de lectura owner/self-scoped.
- `FirestoreActiveMembershipGuard`, coordinación transaccional.
- Adaptador de Persona propia sobre contratos E1.
- Adaptador de Grupo/Temporada sobre capacidades públicas E2.
- Callable adapter y composición de módulo.

### 22.4 Presentación

- Tipo `OwnMembership`.
- Servicio frontend de callables.
- Componente `OwnMembershipSection` en detalle canónico del Grupo.
- Sin SDK Firestore para Membresía.

### 22.5 Dependencias prohibidas

- Repositorio de Membresías leyendo o escribiendo Grupo/Temporada/Persona.
- Servicio de Aplicación importando Firebase.
- Módulo Membresías accediendo a `openSeasonGuards`.
- Frontend importando `collection`, `doc`, `query`, `getDoc`, `setDoc`, `updateDoc` o equivalentes para este flujo.
- Autorización mediante `users.roles`, `adminIds`, `memberIds`, Plan o campos enviados por cliente.

## 23. Repositorio y reader

### 23.1 `MembershipRepository`

Responsabilidades:

- generar ID opaco;
- recuperar una Membresía por ID;
- reconstruir el Aggregate Root con esquema exacto;
- crear el estado inicial dentro de una transacción.

No lista Personas, Grupos o Temporadas y no expone snapshots.

### 23.2 `MyMembershipReader`

Responsabilidades:

- exigir contexto owner/self-scoped ya validado;
- resolver el guard determinista;
- recuperar la Membresía correlacionada;
- devolver Aggregate Root o modelo interno mínimo al Servicio;
- devolver ausencia sólo cuando guard y consulta de integridad confirman ausencia.

No constituye Repositorio de Agregado y no atiende listados generales.

## 24. Reglas Firestore

Se añadirán en la implementación posterior:

```text
match /memberships/{membershipId} {
  allow read, write: if false;
}

match /activeMembershipGuards/{guardId} {
  allow read, write: if false;
}
```

La denegación cubre visitante, autenticado, Owner, integrante y global `admin`. Todo acceso productivo ocurre mediante callables autorizados y Admin SDK.

Las reglas legacy de `groups`, `memberIds`, `adminIds`, solicitudes, partidos y torneos no se amplían ni se reinterpretan.

## 25. Índices

La consulta de integridad exacta es:

```text
memberships
  where personId == {personId}
  where groupId == {groupId}
  where estado == "activa"
  limit 2
```

Se define un índice compuesto de colección para:

| Campo | Orden |
|---|---|
| `personId` | Ascendente |
| `groupId` | Ascendente |
| `estado` | Ascendente |

El límite 2 permite distinguir ausencia, una activa y corrupción con múltiples activas. No se agregan índices para `seasonId`, fechas, historial, rol o listados porque E2-03 no posee esas consultas.

## 26. Frontend

### 26.1 Pantalla

Se modifica únicamente el flujo canónico `/dashboard/groups/[groupId]` para sustituir la sección estática “Membresías todavía vacías” por un componente funcional owner-scoped.

Las rutas `/admin/groups/**`, `/profile/groups/**` y `/groups/**` legacy permanecen aisladas.

### 26.2 Estados visuales

| Estado | Presentación |
|---|---|
| Cargando | Mensaje accesible de contexto de Membresía |
| Sin Persona | Explica que ownership continúa; enlace al alta propia de Persona |
| Sin Temporada | Explica la precondición y enlaza al flujo E2-02 |
| Elegible sin Membresía | Botón “Incorporarme como integrante” |
| Confirmando | Botón bloqueado y región de estado |
| Activa | Estado, fecha de ingreso y Temporada referenciada |
| Existente/idempotente | Mismo estado confirmado, sin afirmar nueva creación |
| Error recuperable | Mensaje y retry con la misma clave |
| No autorizado/incompatible | Mensaje cerrado sin datos internos |

### 26.3 Explicitud y accesibilidad

- La acción no se ejecuta al cargar, navegar, crear Grupo o abrir Temporada.
- No se usa toggle ambiguo ni alta implícita.
- El control posee label explícito, foco visible, objetivo táctil mínimo y estado disabled durante envío.
- Loading, éxito y error utilizan regiones anunciables.
- El diseño funciona en móvil y escritorio sin scroll horizontal.
- La clave de idempotencia se conserva ante timeout, unavailable, conflicto recuperable y respuesta perdida.
- Sólo se genera una intención nueva tras cambio funcional confirmado o resolución de existencia.

## 27. Efectos colaterales prohibidos

Crear una Membresía no puede:

- modificar `users/{uid}` o su rol;
- crear, editar o vincular Persona;
- modificar `groups/{groupId}`;
- añadir UID a `memberIds`, `adminIds` o `admins`;
- retirar UID de solicitudes;
- modificar `seasons` u `openSeasonGuards`;
- crear Solicitud;
- enviar email, push o notificación;
- crear alerta, Actividad o dashboard persistido;
- crear pagos, participaciones, equipos, partidos o inscripciones;
- otorgar permisos de staff u ownership;
- ejecutar backfill, migración o reparación.

## 28. Tratamiento del legado y transición

### 28.1 Clasificación

| Estructura/consumidor | Clasificación | Tratamiento E2-03 |
|---|---|---|
| `groups` v1 y owner dashboard | Productivo canónico | Reutilizar por contrato; no modificar Grupo |
| `users` y `personas` E1 | Productivo canónico | Consultar por contratos; no escribir |
| `seasons` y contexto abierto E2-02 | Productivo canónico | Consultar capacidad pública; no escribir |
| `memberIds`, `adminIds`, `admins` | Legado contradictorio con consumidores | No leer ni escribir; mantener aislado |
| `pendingRequestIds`, `pendingAdminRequestIds` | Solicitud legacy embebida | No leer ni escribir |
| HTTP API de join/search/add/remove/requests/admin | Contratos legacy activos | No reutilizar, retirar ni modificar |
| Vistas admin/profile/public de Grupo | Consumidores legacy | No mostrar Membresías nuevas ni declararlos migrados |
| Partidos, participaciones y ranking por UID | Consumidores deportivos legacy | No adaptar ni inferir pertenencia |
| Inscripciones y equipos con `playerIds` | Consumidores de Torneo legacy | No adaptar |
| Alertas, notificaciones y triggers de arrays | Derivados/efectos legacy | No activar desde E2-03 |
| Fixtures `memberIds`/`adminIds` | Datos sintéticos de pruebas legacy | Preservar para regresión y aislamiento |
| Referencias `memberships` en pruebas E2 | Aserciones de ausencia | Actualizar sólo donde E2-03 cambie legítimamente la expectativa |
| Datos históricos remotos | Sin valor obligatorio a migrar según Documento 5 | No consultar, reconstruir ni migrar |
| `derfgtyhj` | Residuo sin consumidor identificado | Fuera de alcance |

### 28.2 Consumidor de la nueva fuente

El único consumidor funcional incorporado en E2-03 es `OwnMembershipSection` dentro de `/dashboard/groups/[groupId]`, mediante los nuevos contratos backend.

Esto no declara migrada la pertenencia general. Los consumidores legacy seguirán viendo únicamente sus datos legacy y no recibirán escritura compensatoria. La coexistencia es por aislamiento de flujos, no por doble autoridad sobre una misma operación.

### 28.3 Condición de retiro futuro

Los arrays sólo podrán retirarse cuando cada consumidor haya sido adaptado mediante una ficha propia y E2-11 verifique ausencia de lectores/escritores. E2-03 no adelanta ese cierre.

## 29. Observabilidad y logs

### 29.1 Eventos técnicos estructurados

Registrar únicamente:

- operación: `createMyMembershipForOwnedGroup` o `getMyMembershipForOwnedGroup`;
- etapa: validación, dependencia, transacción o respuesta;
- outcome/reason estable;
- `membershipId`, `groupId` y `seasonId` sólo cuando fueron confirmados o son necesarios para correlación técnica;
- duración y contador de retry transaccional cuando estén disponibles;
- nombre/código técnico sanitizado para errores inesperados.

### 29.2 Datos prohibidos en logs

- clave de idempotencia cruda;
- email de acceso o contacto;
- nombre o apellido;
- token, claims o payload completo;
- documento Usuario/Persona/Grupo/Temporada/Membresía;
- hashes salvo diagnóstico estrictamente controlado;
- stack trace en respuesta pública.

No se introduce plataforma nueva de observabilidad ni evento de dominio en E2-03. El alta no posee consumidor posterior obligatorio.

## 30. Plan de pruebas

| Nivel | Casos mínimos | Entorno/evidencia |
|---|---|---|
| Dominio | alta válida; IDs; estado exacto; esquema cerrado; timestamps; reconstrucción; rechazo de campos extra | Runner unitario |
| Aplicación | orden de cuenta/Persona/Grupo/Temporada; ausencia de Persona; no Owner; global admin; Temporada ausente; resultado y errores | Fakes/mocks |
| Contratos | payload exacto; propiedades desconocidas; no `personId`/`seasonId`; clave; reason/HTTPS | Unitarias |
| DTO | claves exactas; ISO UTC; sin persistencia, guard, hashes o PII | Unitarias |
| Persistencia | documento exacto; auto-ID; referencias; timestamps; schema v1; mapper incompatible | Firestore Emulator |
| Guard | ID determinista; schema exacto; correlación; colisión/incompatibilidad; no autoridad funcional | Unitarias + Emulator |
| Idempotencia | retry, respuesta perdida, misma clave/contexto, clave conflictiva, otra intención | Emulator |
| Concurrencia | iguales simultáneas; distintas simultáneas; Owner y no Owner; máximo una activa | Emulator |
| Unicidad | otra activa misma Persona–Grupo en otra Temporada bloquea; inactiva histórica no viola la consulta futura | Unitarias/fixtures controlados |
| Autorización | visitante, cuenta ausente, Persona ausente, no Owner, ownership transferido, global admin ignorado | Unitarias + Emulator |
| Temporada | abierta válida; ausencia; Grupo distinto; estado incompatible; contexto corrupto | Unitarias + Emulator |
| Reglas | lectura, lista, create, update y delete directos denegados sobre Membresía y guard para todos los actores | Rules Emulator |
| Frontend | estados, acción explícita, doble click, retry, Persona/Temporada requeridas, accesibilidad y responsive | Tests + build + UAT |
| Arquitectura | Aggregate Root independiente; repositorio exclusivo; no Firebase en dominio/aplicación; contratos públicos para externos | Guard estructural |
| Efectos colaterales | cero cambios en Usuario, Persona, Grupo, Temporada, arrays, Solicitud y demás colecciones | Emulator |
| Legado | rutas/servicios legacy continúan aislados; no nuevo lector/escritor de arrays | Búsqueda estructural + regresión |
| Gates | sintaxis Functions, unitarias, Emulator Suite, mantenimiento/reglas, TypeScript, build, lint baseline, `quality:stage0`, diff-check | Ejecución posterior completa |

### 30.1 Casos críticos de concurrencia

1. Dos llamadas idénticas producen `CREATED_ACTIVE` y `EXISTING_IDEMPOTENT`, con el mismo ID.
2. Dos claves distintas para el mismo par producen una creación y un rechazo estable.
3. Una carrera Owner/no Owner sólo permite confirmar al Owner.
4. Una transferencia de ownership confirmada antes de la transacción rechaza al Owner anterior.
5. Una Membresía activa de otra Temporada bloquea la creación.
6. Guard roto o activa huérfana fallan cerrado y no se reparan.

## 31. UAT

### 31.1 Entorno

- Firebase Emulator Suite;
- proyecto `demo-sportexa-e2-03` o `demo-*` equivalente;
- Auth, Firestore y Functions en hosts loopback;
- frontend local;
- datos completamente sintéticos;
- cero consulta o escritura Firebase remota.

### 31.2 Fixture mínimo

- Usuario A: Owner, cuenta válida y Persona vinculada.
- Usuario B: no Owner, cuenta válida y Persona vinculada.
- Usuario C: Owner sin Persona.
- Usuario D: global `admin` legacy, no Owner.
- Grupo v1 de A y Grupo v1 de C.
- Temporada abierta por Grupo cuando el caso lo requiera.
- Cero Membresías iniciales salvo casos específicos automáticos.

### 31.3 Casos manuales

| ID | Caso | Resultado esperado |
|---|---|---|
| UAT-01 | Owner abre Grupo con Persona y Temporada, sin Membresía | Ve ausencia válida y acción explícita |
| UAT-02 | Owner no activa la acción | No aparece documento ni guard |
| UAT-03 | Owner activa “Incorporarme como integrante” | Ve Membresía `activa` confirmada |
| UAT-04 | Recarga la página | Recupera la misma Membresía |
| UAT-05 | Repite la intención tras respuesta perdida simulada | No crea duplicado |
| UAT-06 | Owner sin Persona abre el Grupo | Conserva administración; alta rechazada/CTA Persona |
| UAT-07 | Grupo sin Temporada abierta | No permite alta; ofrece contexto E2-02 |
| UAT-08 | Inspección focalizada | Documento exacto, guard correlacionado, Grupo/Temporada/Persona intactos |
| UAT-09 | Navegación y accesibilidad | Teclado, foco, anuncios, móvil y escritorio correctos |

### 31.4 Casos automáticos preferidos

No se requiere modificar roles o documentos desde Emulator UI. Se cubren automáticamente:

- global `admin` no Owner;
- usuario no Owner;
- concurrencia;
- ownership transferido;
- Persona/Grupo/Temporada incompatibles;
- guard corrupto y activa huérfana;
- Membresía activa en otra Temporada;
- reglas directas negativas;
- ausencia de efectos colaterales.

## 32. Criterios de aceptación

1. Dado un Owner con cuenta, Persona y Temporada abierta, cuando ejecuta expresamente la acción, entonces se crea una Membresía activa independiente.
2. Dado un Grupo creado o una Temporada abierta, si no se ejecuta la acción, entonces no se crea Membresía.
3. Dado un Owner sin Persona, cuando intenta el alta, entonces recibe `PERSON_REQUIRED` y ningún documento cambia.
4. Dada una Persona propia válida, el cliente no envía ni puede sustituir `personId`.
5. Dada una Temporada abierta, el cliente no envía ni puede sustituir `seasonId`.
6. Dado un global `admin` no Owner, recibe `NOT_AUTHORIZED`.
7. Dada una Persona con Membresía activa en el Grupo, incluso de otra Temporada, no se crea una segunda activa.
8. Dadas solicitudes concurrentes, persiste como máximo una activa para Persona–Grupo.
9. Dado un retry idéntico, se devuelve la misma Membresía.
10. Dada una clave reutilizada con contexto distinto, se rechaza sin escritura.
11. Dado un guard incompatible o una activa huérfana, se falla cerrado sin reparación.
12. Dado el documento confirmado, contiene exactamente siete campos y no contiene datos ajenos.
13. Dado el guard confirmado, contiene exactamente ocho campos y no constituye autoridad funcional.
14. Dada una transferencia de ownership, no crea, elimina o cambia Membresía.
15. Dado un Owner sin Membresía, continúa administrando el Grupo.
16. Dada una Membresía activa, no concede ownership ni permisos de staff.
17. Dado el flujo frontend, no existe acceso Firestore directo.
18. Dado el alta, no cambian Usuario, Persona, Grupo, Temporada ni arrays legacy.
19. Dado el incremento, los consumidores legacy no se declaran migrados.
20. Dado el cierre futuro de Temporada, no se modifica automáticamente Membresía ni guard; cualquier transición exige ficha posterior.

## 33. Trazabilidad

| Decisión E2-03 | Fuente |
|---|---|
| Membresía como fuente Persona–Grupo | D1, D1.5, D3, D4, D5 §3.6/§4.2 |
| Aggregate Root independiente | D3 §8.9, D4 aplicación al Agregado Membresía, D5 §3.4 |
| Persona, Grupo y Temporada externos | D3 §8.9, D4 §§3/10, D5 §7.4.1 |
| Temporada abierta obligatoria | D2 CU-025, D5 §7.4.1/§7.4.2, cierre E2-02 |
| Unicidad activa Persona–Grupo | D1.5 §2.10, D3 §§8.9–8.10, D5 E2-03 |
| Owner no equivale a integrante | D1/D1.5, D5 D5-040, E2-01 |
| Alta explícita propia | Decisión aprobada del usuario para esta ficha |
| Persona obligatoria y propia | E1-02 + decisión aprobada |
| Estado inicial `activa` | Decisión aprobada del usuario |
| `fechaIngreso` backend | Decisión aprobada del usuario |
| Sin Solicitud | Separación de Agregados D3/D5 + corte aprobado |
| Global roles ignorados | D4 §11, D5 D5-025/D5-026, E1/E2 previos |
| Backend-only | D4, D5 §§3.10–3.13, E1/E2 previos |
| No doble escritura | D5 D5-010 y transición por flujo |
| Cierre no muta consumidores automáticamente | D4 transacciones/Temporada, cierre E2-02 |

## 34. Riesgos y deuda aceptada

| Riesgo/deuda | Impacto | Mitigación/condición futura |
|---|---|---|
| Membresía activa queda congelada al cerrar Temporada | Impide renovación mientras siga activa | E2-05/E2-06 deben definir transición explícita y recuperable |
| Futuro cierre concurrente con el alta | La validación previa de Temporada abierta podría quedar obsoleta antes del commit | La ficha que habilite cierre deberá coordinar la carrera con `createMyMembershipForOwnedGroup`; E2-03 no accede al Repositorio de Temporadas |
| Sólo alta propia del Owner | No incorpora plantel real de terceros | Corte deliberado; definir privacidad/consentimiento antes de alta ajena |
| Sin rol/cargo/permisos | Membresía no delega administración | Incorporar sólo con caso funcional y matriz de permisos |
| Consulta sólo owner/self-scoped | Integrantes no consultan todavía sus Grupos | E2-04 define lecturas contextuales generales |
| Guard técnico persistente | Debe evolucionar con lifecycle | E2-05/E2-06 lo modifican sólo junto con operaciones válidas de Membresía |
| Índice nuevo | Requiere coordinación de configuración | Versionar y probar localmente en implementación; no desplegar sin autorización |
| Consumidores legacy siguen por UID/arrays | Nueva Membresía no habilita partidos/torneos actuales | Aislamiento explícito; adaptar por flujo, sin doble escritura |
| Sin datos históricos reconstruidos | UAT comienza desde cero | Aprobado por Documento 5; usar datos sintéticos |

Ninguna deuda permite omitir la unicidad, usar arrays, conceder acceso por rol global o crear Membresía automáticamente.

## 35. Checkpoint y rollback

- **Commit inicial:** `385555e10b481bc51a3d75b9cfa1280709f029a4`.
- **Rama de definición:** `dev`; no se crea rama en esta intervención.
- **Rama sugerida de implementación:** `feat/e2-03-membership-owner-self`.
- **Estado inicial:** E2-02 cerrado e integrado; working tree limpio antes de crear esta ficha.
- **Checkpoint intermedio futuro:** dominio, contratos, guard, índice y pruebas de concurrencia antes de conectar UI.
- **Rollback de código:** revertir únicamente commits E2-03 o abandonar la rama no integrada.
- **Rollback de datos de prueba:** eliminación explícita de `memberships` y `activeMembershipGuards` sintéticos en emuladores.
- **Doble escritura como rollback:** prohibida.
- **Remoto:** no aplica.
- **Interrumpir implementación si:** se necesita Persona ajena, Solicitud, rol, escritura de arrays, acceso al repositorio de Temporadas, reparación automática, más de una activa, modificación de otro Agregado o regla fundamental no contenida aquí.
- **Reanudar si:** la causa está documentada, la ficha fue reabierta/aprobada y los gates vuelven a pasar.

## 36. Evidencia de cierre requerida

- rama y commits trazables;
- ficha aprobada antes del primer cambio de código;
- esquema y guard exactos;
- índice versionado y probado;
- contratos, DTO y errores finales;
- pruebas completas y conteos;
- reglas negativas aprobadas;
- evidencia de unicidad entre Temporadas;
- evidencia de retry, concurrencia y respuesta perdida;
- evidencia de Persona requerida, ownership y global admin rechazado;
- evidencia de ausencia de escrituras colaterales y legacy;
- frontend accesible y responsive;
- UAT y fixture sintético documentados;
- inventario final de consumidores afectados y aislados;
- rollback verificado;
- informe de implementación y cierre formal;
- confirmación de cero consultas, escrituras o despliegues Firebase remotos salvo autorización posterior expresa.

## 37. Salida y habilitación posterior

E2-03 podrá declararse cerrado cuando:

1. Membresía sea la única fuente de verdad del flujo de incorporación propia del Owner;
2. la creación sea explícita y dependa de Persona, Grupo propio y Temporada abierta;
3. exista como máximo una activa por Persona–Grupo;
4. guard y documento converjan de forma idempotente y concurrente;
5. el frontend consuma sólo contratos backend;
6. reglas, índice, pruebas, UAT y gates estén aprobados;
7. no haya escritura ni lectura del legado desde el nuevo flujo;
8. informe y cierre estén integrados en `dev`.

El cierre habilitará únicamente la definición del siguiente incremento conforme al roadmap vigente. La candidata natural es E2-04 — Consulta contextual de Grupo y Membresías, pero su habilitación exacta deberá constar en el cierre E2-03 y no se anticipa como autorización de implementación.

## 38. Decisiones cerradas

1. Alternativa A aprobada.
2. Título final: Alta explícita de Membresía propia del Owner.
3. Actor: Owner actual.
4. Persona: exclusivamente la propia vinculada.
5. Persona ausente: rechazo sin escrituras.
6. Grupo: v1, activo y propio.
7. Temporada: abierta, obligatoria y obtenida por contrato público.
8. Creación: exclusivamente explícita.
9. Estado inicial: `activa`.
10. Fecha de ingreso: timestamp de servidor.
11. Unicidad: máximo una activa por Persona–Grupo entre todas las Temporadas.
12. ID: auto-ID opaco.
13. Guard: determinista, técnico y no autoritativo.
14. Idempotencia: clave cliente estable, hashes internos y transacción.
15. Solicitud: excluida.
16. Rol, cargo, permisos, posición, dorsal y observaciones: excluidos.
17. Owner puede administrar sin Membresía.
18. Membresía no concede ownership.
19. Global `admin` no Owner: rechazado.
20. Firestore cliente: denegado.
21. Legado: aislado, sin doble escritura ni migración.
22. Cierre de Temporada: no muta Membresía ni guard automáticamente.

## 39. Decisiones postergadas

- incorporación administrativa de Persona ajena;
- privacidad y búsqueda segura de Personas;
- invitación, consentimiento y Solicitud;
- lifecycle completo de Membresía;
- fecha de egreso;
- transición necesaria antes de renovar una activa de Temporada cerrada;
- vínculo de renovación con Membresía anterior;
- retención de la información de idempotencia cuando E2-05, E2-06 u otro incremento de ciclo de vida retire o reemplace el guard;
- comportamiento de retries antiguos después de baja, finalización, renovación o retiro del guard;
- mecanismo que impida que un retry histórico cree una Membresía nueva;
- coordinación concurrente entre `createMyMembershipForOwnedGroup` y el futuro cierre de Temporada;
- roles, cargos y permisos contextuales;
- función deportiva, posición y dorsal;
- member-access y consultas generales;
- historial y paginación;
- eventos de dominio y Actividad;
- retención o retiro histórico de guards;
- adaptación y retiro de consumidores legacy;
- integración con operaciones deportivas o comerciales.

Ninguna decisión postergada bloquea el caso aprobado ni puede resolverse implícitamente durante su implementación.

## 40. Declaración final de definición

- **Estado de definición:** `LISTA PARA IMPLEMENTAR`.
- **Decisiones funcionales fundamentales abiertas:** ninguna.
- **Decisiones físicas fundamentales abiertas:** ninguna.
- **Archivo autorizado en esta intervención:** únicamente esta ficha nueva.
- **Código, reglas, índices, dependencias, lockfiles, ramas, commits, push, merge, Firebase y despliegues:** no autorizados durante la definición.
- **Condición para implementar:** ficha revisada y aprobada, rama posterior creada desde el checkpoint correcto y preflight limpio repetido.

## Veredicto

`E2-03 LISTO PARA IMPLEMENTAR`
