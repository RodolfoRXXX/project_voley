# Ficha de Incremento Implementable E2-05 — Finalización explícita de la Membresía propia del Owner

## Estado de la ficha

- **Estado:** `LISTA PARA IMPLEMENTAR`.
- **Fecha de definición:** 2026-09-01.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Corte aprobado:** alternativa D — finalización explícita de la Membresía propia del Owner.
- **Fuente de verdad principal:** Membresía.
- **Actor:** Owner actual del Grupo, actuando exclusivamente sobre la Membresía de su propia Persona vinculada.
- **Caso de uso atendido:** CU-027 — Finalizar una Membresía, limitado al corte owner/self-scoped aprobado.
- **Contrato modificador candidato:** `finalizeMyMembershipForOwnedGroup`.
- **Consulta owner-scoped compatible:** `getMyMembershipForOwnedGroup` con DTO discriminado `activa | finalizada`.
- **Consumidor frontend único:** `OwnMembershipSection` en `/dashboard/groups/[groupId]`.
- **Checkpoint documental:** rama `dev`, commit `c56d45eb276c94670fb6ddbe68c40eff12f84834`, upstream `origin/dev`, divergencia `0/0` y working tree limpio al iniciar esta definición.

Esta ficha define exclusivamente E2-05. H01–H06 fueron corregidos y la reverificación independiente confirmó su cierre, sin bloqueos remanentes dentro del alcance revisado. No implementa código, no crea rama ni modifica reglas, índices, dependencias, lockfiles, Documentos 1–5 o incrementos anteriores. Su aprobación no autoriza CU-028, CU-029, operaciones sobre terceros ni correcciones E2-02/E2-03.

## 1. Identificación y título

- **Identificador:** E2-05.
- **Título final:** Finalización explícita de la Membresía propia del Owner.
- **Objetivo resumido:** incorporar la primera transición explícita del ciclo de vida de Membresía sin abrir roster, acceso a Personas ajenas, reactivación ni renovación.
- **Resultado observable:** el Owner deja de integrar deportivamente el Grupo mediante su Membresía, conserva ownership y puede recuperar el mismo estado finalizado sin duplicación ni nueva alta.
- **Transición:** `activa v1 → finalizada v2`.

El corte no reconoce todavía un derecho general de salida voluntaria para cualquier integrante. La autoridad funcional es ownership actual y el sujeto se restringe a la Persona propia derivada.

## 2. Fuentes normativas y vinculantes

### 2.1 Documentos 1–4

1. **Documento 1 — Arquitectura del Producto y Modelo de Dominio**:
   - Membresía administra el estado y ciclo de la relación Persona–Grupo;
   - fecha de ingreso y fecha de egreso pertenecen a Membresía;
   - ownership y pertenencia son relaciones diferentes.
2. **Documento 1.5 — Modelo Conceptual del Dominio**:
   - una Persona no puede poseer más de una Membresía activa simultánea en el mismo Grupo;
   - el ciclo de vida depende del estado y de las fechas de ingreso y egreso;
   - los cambios de estado conservan Persona e historial.
3. **Documento 2 — Modelo Funcional y Casos de Uso**:
   - CU-027 define Finalizar una Membresía;
   - CU-028 Reactivar y CU-029 Renovar son casos separados;
   - una Membresía de Temporada cerrada no puede modificarse ni reactivarse;
   - renovar crea una nueva participación para una nueva Temporada y conserva trazabilidad.
4. **Documento 3 — Arquitectura Funcional y Diseño Técnico**:
   - Membresía es el Aggregate Root de su Agregado;
   - el Módulo Membresías administra estado, fecha de ingreso y fecha de egreso;
   - Persona, Grupo y Temporada permanecen fuera;
   - `MembresíaFinalizada` es un hecho de ciclo de vida, sin obligar a publicar un evento en este corte.
5. **Documento 4 — Diseño de la Arquitectura de Software**:
   - sólo una operación modificadora del Aggregate Root puede cambiar su ciclo de vida;
   - la persistencia contiene exclusivamente estado y atributos propios;
   - Repositorios y contratos no atraviesan ownership de otros módulos;
   - cierre de Temporada y finalización de Membresía no eliminan registros pertenecientes a otros conceptos.

### 2.2 Documento 5

- Membresía es la única fuente de verdad Persona–Grupo.
- E2-05 debe subdividirse si editar, finalizar y reactivar exceden un cambio funcional verificable.
- E2-06 crea una nueva Membresía para una nueva Temporada.
- No se permite doble escritura, backfill histórico ni autoridad desde arrays.
- Frontend, seguridad, pruebas, persistencia y retiro deben definirse dentro del incremento.

### 2.3 Incrementos vinculantes

- **E1-02:** Persona propia y vínculo `users/{uid}.personaId`.
- **E2-01:** Grupo v1, ownership actual y acceso owner-scoped.
- **E2-02:** Temporada v1 abierta y contratos de contexto; conserva deuda concurrente separada.
- **E2-03:** Membresía activa v1, guard determinista Persona–Grupo, alta explícita e idempotencia del CU-025.
- **E2-04:** listado propio de Membresías operativas, guard correlacionado y separación entre ownership y pertenencia.

E2-04 está cerrado, integrado y publicado en el checkpoint. Su cierre habilita exclusivamente la definición de E2-05.

## 3. Decisiones aprobadas materializadas

1. El actor es el Owner actual del Grupo.
2. Sólo puede finalizar la Membresía de su propia Persona vinculada.
3. El estado persistente terminal de este corte es exactamente `finalizada`.
4. `fechaEgreso` la fija backend al confirmar, sin valor cliente, retroactividad ni motivo.
5. La finalización reemplaza atómicamente el guard activo por el control lifecycle vigente Persona–Grupo: un tombstone consumible que bloquea CU-025 hasta un caso de uso posterior autorizado.
6. CU-025 no puede crear otra Membresía después de la finalización.
7. El reingreso futuro debe utilizar CU-028.
8. Reactivación y renovación están excluidas.
9. E2-06 deberá crear una Membresía nueva para otra Temporada y no reutilizar la finalizada.

## 4. Dependencias y precondiciones

### 4.1 Dependencias satisfechas

- identidad autenticada derivable del token;
- cuenta canónica propia;
- Persona propia vinculada y estrictamente reconstruible;
- Grupo v1 activo y ownership consultable;
- Temporada abierta exacta consultable mediante capacidad pública/interna del Módulo Grupos;
- Membresía activa v1 y guard E2-03;
- backend como único escritor;
- reglas privadas por defecto.

### 4.2 Precondiciones funcionales

Para ejecutar la primera transición:

1. el actor está autenticado;
2. su cuenta existe y es compatible;
3. posee Persona propia válida;
4. el Grupo existe, es v1, está activo y el actor es su Owner vigente;
5. existe una Membresía activa v1 para la propia Persona y el Grupo;
6. es la única activa del par Persona–Grupo;
7. existe guard activo v1 y está completamente correlacionado;
8. no existe control lifecycle vigente para el mismo par;
9. la Temporada exacta referida por la Membresía continúa abierta;
10. el payload contiene exclusivamente `groupId`.

Una Membresía cuya Temporada está cerrada no se finaliza en E2-05. Recuperar idempotentemente una Membresía ya finalizada no vuelve a modificarla: `ALREADY_FINALIZED` es una consulta del resultado confirmado, no una transición sobre la Temporada.

## 5. Flujo principal

1. El Owner abre `/dashboard/groups/{groupId}`.
2. `OwnMembershipSection` consulta `getMyMembershipForOwnedGroup({ groupId })`.
3. Si recibe una Membresía activa, muestra la acción explícita “Finalizar mi Membresía”.
4. El Owner activa la acción y la presentación muestra una confirmación que explica que ownership se conserva y que la reactivación todavía no está disponible.
5. Cancelar cierra la confirmación sin invocar backend ni escribir.
6. Confirmar invoca `finalizeMyMembershipForOwnedGroup({ groupId })` una sola vez mientras la solicitud está en vuelo.
7. El callable deriva UID del token, valida el payload y recupera cuenta y Persona propias.
8. El Servicio de Aplicación valida Grupo, ownership y contexto de Temporada abierta exacta mediante contratos públicos.
9. Infraestructura deriva los IDs deterministas de active guard y lifecycle vigente.
10. La unidad transaccional relee Grupo/ownership, ambos controles Persona–Grupo y la Membresía correlacionada.
11. El Aggregate Root ejecuta `finalize` y produce una Membresía finalizada v2.
12. El mismo commit actualiza la Membresía, elimina el active guard y crea el lifecycle vigente.
13. Backend relee o reconstruye el estado confirmado y devuelve `FINALIZED` con DTO finalizado.
14. El frontend muestra el resultado confirmado, mantiene disponibles los controles owner-scoped y no vuelve a ofrecer CU-025.
15. Una consulta E2-04 iniciada después del commit no incluye la Membresía porque ya no está físicamente activa.

## 6. Alcance incluido

- transición `activa v1 → finalizada v2`;
- `fechaEgreso` de servidor;
- modelo discriminado estricto;
- comando owner/self-scoped sin clave de idempotencia cliente;
- idempotencia semántica de doble finalización;
- control lifecycle vigente exacto, técnico, consumible y sin autoridad funcional;
- identificación del retry histórico y bloqueo de recreación, con evolución explícita del outcome público de CU-025 después del cambio de lifecycle;
- evolución concreta de `getMyMembershipForOwnedGroup`;
- integración mínima en `OwnMembershipSection`;
- compatibilidad exacta de E2-04;
- pruebas de dominio, aplicación, contrato, persistencia, concurrencia, reglas, frontend y arquitectura;
- UAT local con Emulator Suite y datos sintéticos.

## 7. Exclusiones

- salida voluntaria general de una Persona no Owner;
- finalización de Membresías de terceros;
- roster, búsqueda, listado o exposición de Personas ajenas;
- alta de terceros, invitaciones o Solicitudes;
- edición de Membresía;
- motivo de egreso;
- `fechaEgreso` aportada por cliente;
- retroactividad o backdating;
- reactivación, reingreso o CU-028;
- renovación o CU-029;
- cierre o reapertura de Temporada;
- transición automática al cerrar Temporada;
- historial consolidado o colección de historial dentro de Membresía;
- roles, cargos, permisos, posición, dorsal u observaciones;
- eventos de dominio, Actividad, alertas o notificaciones;
- adaptación de partidos, torneos, pagos, entrenamientos o consumidores legacy;
- escritura, sincronización o retiro de arrays;
- migración, backfill o reinterpretación de documentos legacy;
- corrección de E2-02 o E2-03;
- Firebase remoto y despliegue.

## 8. Modelo discriminado de Membresía

### 8.1 Activa v1

`memberships/{membershipId}` admite para una activa exactamente:

```text
personId: string
groupId: string
seasonId: string
estado: "activa"
fechaIngreso: Timestamp
createdAt: Timestamp
schemaVersion: 1
```

No admite `fechaEgreso` ni ningún otro campo.

### 8.2 Finalizada v2

Una finalizada contiene exactamente:

```text
personId: string
groupId: string
seasonId: string
estado: "finalizada"
fechaIngreso: Timestamp
fechaEgreso: Timestamp
createdAt: Timestamp
schemaVersion: 2
```

No admite motivo, actor, `updatedAt`, roles, permisos, datos descriptivos, historial embebido ni información técnica del guard.

### 8.3 Hidratación estricta

La hidratación discrimina conjuntamente por `estado` y `schemaVersion`:

| Estado | Versión | Campos exactos | Resultado |
|---|---:|---|---|
| `activa` | 1 | siete campos v1, sin `fechaEgreso` | válida |
| `finalizada` | 2 | ocho campos v2, con `fechaEgreso` | válida |
| `activa` | 2 | cualquier forma | incompatible |
| `finalizada` | 1 | cualquier forma | incompatible |
| otro estado | cualquiera | cualquier forma | incompatible |

`fechaEgreso` es obligatoria y un Timestamp válido en finalizada; está prohibida en activa. La reconstrucción rechaza propiedades faltantes, adicionales, versiones cruzadas, timestamps inválidos e IDs no canónicos.

### 8.4 Inmutabilidad y transición

Durante `finalize` permanecen inmutables:

- `membershipId`;
- `personId`;
- `groupId`;
- `seasonId`;
- `fechaIngreso`;
- `createdAt`.

Sólo cambian:

- `estado: "activa" → "finalizada"`;
- incorporación de `fechaEgreso` fijada por backend;
- `schemaVersion: 1 → 2`.

Debe cumplirse `fechaEgreso >= fechaIngreso`.

### 8.5 Justificación de `schemaVersion: 1 → 2`

La transición cambia la forma persistente cerrada: incorpora un campo funcional obligatorio y amplía el conjunto de estados admitidos. Mantener `schemaVersion: 1` haría que dos esquemas incompatibles compartieran una misma versión y debilitaría la reconstrucción estricta aprobada en E2-03.

La versión pertenece al documento individual, no a toda la colección. Por ello:

- las activas existentes permanecen v1 sin modificación;
- sólo una Membresía que finaliza pasa a v2;
- no existe backfill o migración de activas;
- los lectores discriminan ambos esquemas;
- no se reinterpretan documentos legacy ni esquemas distintos de estos dos.

## 9. Invariantes

1. Membresía sigue siendo la única fuente funcional de estado Persona–Grupo.
2. Existe como máximo una Membresía activa por Persona–Grupo.
3. Una finalizada no es operativa y no concede member-access.
4. Ownership no equivale a Membresía y permanece después de finalizar.
5. Finalizar no crea una Membresía nueva.
6. Finalizar no modifica Persona, Grupo o Temporada.
7. En el estado coordinado vigente alcanzable por E2-05 y anterior a CU-028/CU-029, una activa actual posee active guard v1 y lifecycle ausente.
8. En ese mismo horizonte, una finalizada actual pendiente de reactivación o renovación posee lifecycle v1 correlacionado y active guard ausente.
9. En el estado observable por E2-05, active guard y lifecycle simultáneos para el mismo par son incompatibles.
10. El lifecycle vigente debe apuntar a la Membresía finalizada actual y coincidir en Persona, Grupo y Temporada.
11. Ninguno de los dos controles con una Membresía actual detectable es incompatible dentro del estado alcanzable antes de una transición posterior autorizada.
12. Estas reglas no convierten en corrupta una Membresía finalizada histórica cuyo lifecycle haya sido consumido o reemplazado atómicamente por CU-028/CU-029 u otro caso futuro aprobado.
13. La corrupción observada por E2-05 nunca se repara, adopta, elimina ni reinterpreta automáticamente.
14. CU-025 queda bloqueado mientras existe el lifecycle vigente válido; reingreso y renovación requieren casos de uso posteriores.

## 10. Control lifecycle vigente exacto

### 10.1 Colección e identidad

- **Colección exacta:** `membershipLifecycleGuards`.
- **Ruta:** `membershipLifecycleGuards/{lifecycleGuardId}`.
- **Naturaleza:** control técnico del estado coordinado vigente Persona–Grupo después de E2-05 y tombstone consumible que bloquea CU-025 mientras el siguiente caso de uso autorizado no lo consuma o reemplace.
- **Versión:** `lifecycleGuardVersion: 1`.

No es Entidad, Agregado, historial, autoridad funcional ni constancia permanente uno-a-uno exigida para cada Membresía finalizada durante toda su historia. La Membresía sigue siendo la fuente funcional e histórica.

`lifecycleGuardId` es SHA-256 hexadecimal de 64 caracteres calculado con la codificación length-prefixed vigente sobre:

```text
["sportexa:E2-05:membership-lifecycle-guard:v1", groupId, personId]
```

El orden es `groupId`, `personId`, igual que el criterio Persona–Grupo ya utilizado por la coordinación activa. El dominio nuevo impide colisión semántica con el ID del guard E2-03.

### 10.2 Campos exactos

El documento lifecycle vigente contiene exactamente:

```text
membershipId: string
personId: string
groupId: string
seasonId: string
creationIdempotencyKeyHash: string SHA-256 hexadecimal de 64 caracteres
creationRequestHash: string SHA-256 hexadecimal de 64 caracteres
finalizedAt: Timestamp generado por backend
lifecycleGuardVersion: 1
```

No contiene estado funcional: éste se obtiene exclusivamente de Membresía.

### 10.3 Transferencia desde `activeMembershipGuards`

| Campo active guard v1 | Tratamiento lifecycle v1 |
|---|---|
| `membershipId` | transferido sin cambio |
| `personId` | transferido sin cambio |
| `groupId` | transferido sin cambio |
| `seasonId` | transferido sin cambio |
| `idempotencyKeyHash` | transferido como `creationIdempotencyKeyHash` |
| `requestHash` | transferido como `creationRequestHash` |
| `createdAt` | no transferido; no es necesario para correlación, identificación de la creación histórica ni unicidad |
| `guardVersion` | no transferido; se reemplaza por `lifecycleGuardVersion: 1` |

En cada intento del callback transaccional backend se genera exactamente una vez `const finalizedAt = Timestamp.now()`. Ese mismo objeto/valor se pasa a `membership.finalize(finalizedAt)` y se persiste sin transformación tanto en `membership.fechaEgreso` como en `lifecycle.finalizedAt`. Es tiempo generado por backend, nunca un valor cliente ni un transform `FieldValue.serverTimestamp()` o timestamp de commit de Firestore.

### 10.4 Correlación obligatoria

Un lifecycle vigente es válido sólo si:

- su ID coincide con el hash determinista de sus `groupId` y `personId`;
- posee exactamente ocho campos y versión 1;
- sus IDs son canónicos;
- sus hashes cumplen el formato exacto;
- apunta a una Membresía existente, estrictamente hidratada como finalizada v2;
- coinciden `membershipId`, `personId`, `groupId` y `seasonId`;
- `finalizedAt` coincide con `membership.fechaEgreso`;
- no existe guard activo para el mismo par.

En el estado coordinado vigente alcanzable antes de CU-028/CU-029, coexistencia, referencia distinta, schema inválido, hash inválido o correlación parcial produce `INCOMPATIBLE_STATE`. La ausencia de lifecycle con una finalizada actual detectable también es incompatible en ese horizonte. No se adopta una Membresía, no se reconstruye el lifecycle desde la Membresía y no se borra ninguno de los documentos para reparar.

### 10.5 Evolución posterior compatible

Una ficha futura de CU-028/CU-029 podrá evolucionar atómicamente la coordinación vigente para:

- consumir o reemplazar el lifecycle vigente;
- crear un active guard para una Membresía nueva;
- conservar la Membresía finalizada anterior como histórica, sin reutilizarla ni modificarla.

Después de esa evolución, la finalizada histórica no necesitará conservar un lifecycle individual. Esto no diseña E2-06 ni autoriza ahora la transición: sólo evita imponer una permanencia que la volvería imposible. La Membresía conservada continuará siendo la fuente histórica.

### 10.6 Seguridad

Las reglas deberán declarar explícitamente:

```text
match /membershipLifecycleGuards/{guardId} {
  allow read, write: if false;
}
```

Visitante, autenticado, Owner, integrante y global admin no pueden leer ni escribir el lifecycle mediante SDK cliente. Sólo backend autorizado participa en el caso de uso.

## 11. Contrato modificador

### 11.1 Firma

```ts
declare function finalizeMyMembershipForOwnedGroup(input: {
  groupId: string;
}): Promise<FinalizeMyMembershipResult>;
```

### 11.2 Payload cerrado

El objeto debe ser plano, contener exactamente `groupId` y cumplir las convenciones actuales de ID canónico.

No admite:

- `uid` o `userId`;
- `personId`;
- `membershipId`;
- `seasonId`;
- estado;
- `fechaEgreso`;
- motivo;
- rol o permisos;
- idempotency key;
- propiedades adicionales.

### 11.3 Ausencia de clave de idempotencia cliente

No se agrega una clave porque:

1. existe una única transición válida desde activa para el par Persona–Grupo;
2. el comando no acepta contenido funcional variable;
3. la Membresía finalizada conserva el resultado original;
4. el lifecycle vigente identifica de manera determinista el resultado confirmado mientras sea la coordinación actual;
5. repetir el comando recupera la misma Membresía y `fechaEgreso`;
6. el punto Persona–Grupo serializa finalización, alta y futuras operaciones.

Agregar una clave no aportaría una distinción funcional adicional y duplicaría información técnica.

## 12. DTO y outcomes

### 12.1 DTO finalizado exacto

```ts
type FinalizedOwnedMembershipDto = {
  id: string;
  groupId: string;
  seasonId: string;
  estado: "finalizada";
  fechaIngreso: string;
  fechaEgreso: string;
};
```

Las fechas se serializan como ISO-8601 UTC. No expone `personId`, `createdAt`, `schemaVersion`, guard, hashes, snapshots, rutas Firestore, Owner, roles o permisos.

### 12.2 Resultado

```ts
type FinalizeMyMembershipResult = {
  outcome: "FINALIZED" | "ALREADY_FINALIZED";
  membership: FinalizedOwnedMembershipDto;
};
```

- `FINALIZED`: esta ejecución confirmó la transición.
- `ALREADY_FINALIZED`: la operación recuperó una transición previamente confirmada; devuelve el mismo ID y la misma `fechaEgreso`.

## 13. Evolución exacta de `getMyMembershipForOwnedGroup`

### 13.1 Decisión de compatibilidad

Se conserva el mismo callable y payload:

```ts
declare function getMyMembershipForOwnedGroup(input: {
  groupId: string;
}): Promise<{
  membership: ActiveOwnedMembershipDto | FinalizedOwnedMembershipDto | null;
}>;
```

La respuesta continúa siendo la unión discriminada declarada en esa firma.

No se crea una segunda consulta.

### 13.2 DTO activo preservado

Para una activa se devuelve exactamente el DTO E2-03, sin campos nuevos:

```ts
type ActiveOwnedMembershipDto = {
  id: string;
  personId: string;
  groupId: string;
  seasonId: string;
  estado: "activa";
  fechaIngreso: string;
};
```

No se agrega `fechaEgreso: null`, versión o discriminador adicional. Los consumidores activos existentes conservan forma y significado.

### 13.3 Finalizada

Para una finalizada devuelve exactamente `FinalizedOwnedMembershipDto`. La ausencia de `personId` en ese DTO aplica minimización y no afecta autorización, porque Persona se deriva nuevamente en backend.

### 13.4 Resolución

La consulta owner/self-scoped:

1. valida identidad, cuenta, Persona, Grupo y ownership;
2. deriva los IDs de guard activo y lifecycle;
3. relee ambos controles;
4. si existe sólo active guard válido y la Membresía correlacionada es la activa actual, devuelve activa v1;
5. si existe sólo lifecycle válido y representa el estado coordinado vigente anterior a CU-028/CU-029, devuelve la finalizada v2 correlacionada;
6. si no existe ninguno y tampoco hay Membresía canónica para el par, devuelve `{ membership: null }`;
7. dentro del estado alcanzable por E2-05, si no existe el control exigido pero existe una activa actual o finalizada vigente, devuelve `INCOMPATIBLE_STATE`;
8. si ambos controles coexisten o cualquier correlación falla, devuelve `INCOMPATIBLE_STATE`.

Después de finalizar, `OwnMembershipSection` recibe `estado: "finalizada"`, muestra el resultado y no ofrece CU-025. No interpreta `{ membership: null }` como finalizada.

Esta resolución no establece que toda Membresía finalizada histórica deba conservar lifecycle para siempre. Una ficha posterior deberá evolucionar la consulta cuando consuma o reemplace la coordinación vigente; E2-05 no diseña esa forma futura.

### 13.5 Compatibilidad de E2-04

`listMyCurrentGroupMemberships` no cambia entrada, DTO, cursor, índices ni semántica. Continúa consultando exclusivamente `estado == "activa"` y validando active guard. Nunca devuelve finalizadas ni documentos lifecycle.

Una invocación iniciada después del commit de finalización no obtiene la Membresía. Una lectura que compite con el commit puede observar el orden normal de concurrencia, fallar cerrada o requerir retry; no se devuelve deliberadamente una finalizada como operativa ni se promete snapshot global.

## 14. Reason estable y errores

Se agrega:

| Reason | HTTPS callable | Significado | Uso frontend |
|---|---|---|---|
| `MEMBERSHIP_REACTIVATION_REQUIRED` | `failed-precondition` | existe una Membresía finalizada válida; CU-025 no puede crear otra y corresponde CU-028 | informar que reactivación aún no está disponible |
| `MEMBERSHIP_NOT_FOUND` | `not-found` | después de autorizar al Owner, no existe Membresía canónica propia para el par | mostrar ausencia legítima sin revelar terceros |

No se reutiliza `MEMBERSHIP_ALREADY_EXISTS`, que conserva el significado de una activa existente.

Otros errores:

| Reason | Condición |
|---|---|
| `UNAUTHENTICATED` | token ausente o inválido |
| `ACCOUNT_REQUIRED` | cuenta no materializada |
| `PERSON_REQUIRED` | cuenta sin Persona propia |
| `PERSON_INCOMPATIBLE` | vínculo o Persona incompatibles |
| `GROUP_NOT_FOUND` | Grupo ausente |
| `GROUP_INCOMPATIBLE` | Grupo no v1 o inactivo |
| `NOT_AUTHORIZED` | actor no es Owner vigente |
| `OPEN_SEASON_REQUIRED` | la Temporada exacta no está abierta para la primera transición |
| `SEASON_INCOMPATIBLE` | contexto temporal corrupto o no correlacionado |
| `VALIDATION_FAILED` | payload inválido |
| `INCOMPATIBLE_STATE` | documento, guard, lifecycle, unicidad o correlación incompatible |
| `CONFLICT` | contención agotada o resultado no confirmable |
| `DEPENDENCY_UNAVAILABLE` | dependencia transitoria no confirmable |
| `INTERNAL_ERROR` | fallo inesperado sanitizado |

Los errores no exponen existencia o identidad de Personas o Membresías ajenas, hashes, documentos, stack traces ni detalles Firestore.

El orden público obligatorio de validación es:

1. autenticación;
2. cuenta;
3. Persona;
4. Grupo;
5. ownership;
6. resolución de Membresía.

Por ello `MEMBERSHIP_NOT_FOUND` sólo puede emitirse después de comprobar ownership y nunca sirve para enumerar Membresías ajenas. El mapper conserva `details.reason` en una lista cerrada y sanitizada; no incorpora IDs, hashes, snapshots ni mensajes internos.

## 15. Transacción y unidad de consistencia

### 15.1 Preflight de aplicación

Antes de abrir la transacción, el Servicio de Aplicación valida en este orden:

1. token;
2. cuenta propia;
3. Persona propia;
4. Grupo v1 activo;
5. ownership;
6. contexto abierto actual necesario para una primera transición.

El preflight permite fallar temprano y usar sólo capacidades públicas de otros módulos, pero no autoriza el commit por sí solo. Grupo y ownership se releen dentro de la transacción. La resolución del contexto temporal conserva tanto el contexto abierto como su ausencia para que la máquina decida: `active-only` exige la Temporada exacta abierta; `lifecycle-only` no falla por una Temporada que haya cerrado después del resultado confirmado. Por ello la ausencia de apertura no puede cortar el flujo antes de clasificar los controles.

### 15.2 Máquina transaccional única

- **Aggregate Root modificado:** una Membresía.
- **Coordinación técnica:** active guard y lifecycle vigente del mismo par.
- **Agregados externos modificados:** ninguno.

Todas las lecturas preceden a cualquier escritura. Cada ejecución del callback sigue exactamente este algoritmo:

1. releer Grupo por ID;
2. reconstruir Grupo v1 y exigir `estado: "activo"`;
3. releer ownership actual y exigir `group.ownerId == uid`;
4. leer por sus IDs deterministas active guard y lifecycle guard;
5. clasificar exactamente una rama: `active-only`, `lifecycle-only`, `ninguno` o `ambos`;
6. resolver y validar la Membresía según esa rama;
7. ejecutar las consultas de integridad Persona–Grupo–estado exigidas por la rama;
8. validar referencias y contexto temporal exigible;
9. sólo entonces, si corresponde, escribir.

No se busca primero una activa como precondición común: la clasificación por controles determina qué Membresía se resuelve.

#### Rama `active-only`

1. hidratar estrictamente el active guard v1;
2. leer por ID su `membershipId`;
3. reconstruir la Membresía como activa v1;
4. comprobar Persona, Grupo, Temporada, ID determinista y hashes del guard;
5. consultar `personId + groupId + estado == "activa"` con `limit(2)`;
6. exigir una única activa y que sea la misma Membresía;
7. comprobar que `seasonId` corresponde a la Temporada exacta abierta validada en el preflight;
8. generar exactamente una vez para este intento `const finalizedAt = Timestamp.now()`;
9. exigir en el Aggregate Root `finalizedAt >= fechaIngreso` e invocar `membership.finalize(finalizedAt)`;
10. actualizar la misma Membresía a finalizada v2 con `fechaEgreso = finalizedAt`;
11. eliminar el active guard;
12. crear el lifecycle v1 con `finalizedAt` igual al mismo objeto/valor y los hashes transferidos;
13. confirmar las tres escrituras en un único commit.

Los pasos 10–12 son indivisibles. No existe outcome exitoso parcial. Si Firestore reintenta el callback, el intento nuevo puede generar otro `Timestamp.now()`; únicamente el valor del intento finalmente confirmado es autoritativo.

#### Rama `lifecycle-only`

1. hidratar estrictamente el lifecycle v1;
2. leer por ID su `membershipId`;
3. reconstruir la Membresía como finalizada v2;
4. validar ID, Persona, Grupo, Temporada, hashes y coincidencia exacta `finalizedAt == fechaEgreso`;
5. comprobar, dentro del horizonte previo a CU-028/CU-029, que representa el estado coordinado vigente y que no existe una activa actual para el par;
6. conservar la relectura ya realizada de Grupo/ownership como condición de autorización;
7. devolver `ALREADY_FINALIZED` con el mismo DTO y la misma `fechaEgreso`;
8. no escribir.

Esta rama no exige que la Temporada continúe abierta: recupera idempotentemente un resultado ya confirmado. No puede devolver información si el actor dejó de ser Owner.

#### Rama `ambos`

Devuelve `INCOMPATIBLE_STATE` y realiza cero escrituras.

#### Rama `ninguno`

Ejecuta consultas exactas de integridad Persona–Grupo y estado, acotadas al universo alcanzable antes de E2-06, para resolver:

- ninguna Membresía canónica para el par: `MEMBERSHIP_NOT_FOUND`;
- activa detectable sin active guard: `INCOMPATIBLE_STATE`;
- finalizada actual detectable sin lifecycle vigente: `INCOMPATIBLE_STATE`;
- duplicados, mezcla no explicable o documentos incompatibles: `INCOMPATIBLE_STATE`.

Esta resolución no declara corruptas futuras Membresías finalizadas históricas que hayan sido legítimamente desplazadas por una coordinación posterior autorizada.

La Temporada abierta se obtiene mediante contrato del Módulo Grupos durante el preflight. E2-02 no implementa cierre; una futura operación de cierre deberá coordinar su carrera sin permitir que Membresías acceda a Repositorios privados de Temporada.

## 16. Idempotencia, retries y concurrencia

| Situación | Resultado | Escrituras |
|---|---|---|
| Primera finalización válida | `FINALIZED` | update Membresía + delete guard activo + create lifecycle, un commit |
| Repetición sobre la misma finalizada | `ALREADY_FINALIZED`, mismo ID y `fechaEgreso` | ninguna |
| Dos finalizaciones concurrentes | una `FINALIZED`; la otra `ALREADY_FINALIZED` tras retry/relectura, o `CONFLICT` si no puede confirmar | una sola transición |
| Retry histórico E2-03 con misma clave tras finalizar | identifica la creación histórica, pero devuelve `MEMBERSHIP_REACTIVATION_REQUIRED`; nunca DTO activo | ninguna |
| Nueva intención CU-025 con otra clave tras finalizar | `MEMBERSHIP_REACTIVATION_REQUIRED` | ninguna |
| Guard activo ausente con activa | `INCOMPATIBLE_STATE` | ninguna |
| Lifecycle ausente con finalizada | `INCOMPATIBLE_STATE` | ninguna |
| Guard activo y lifecycle coexistentes | `INCOMPATIBLE_STATE` | ninguna |
| Lifecycle apunta a otra Membresía o no correlaciona | `INCOMPATIBLE_STATE` | ninguna |
| Finalización frente a alta | ambas contienden por el par; alta ve activa o lifecycle; máximo una activa y ninguna recreación | una unidad ganadora |
| Ownership transferido antes del commit | `NOT_AUTHORIZED` | ninguna E2-05 |
| Error ambiguo durante commit | relectura autoritativa incluyendo Grupo/ownership; lifecycle-only íntegro produce `ALREADY_FINALIZED`, active-only íntegro produce `CONFLICT`, y ownership perdido produce `NOT_AUTHORIZED` sin DTO | ninguna adicional |

### 16.1 Evolución contractual deliberada de CU-025/E2-03

E2-05 cambia intencionalmente la frontera temporal del contrato E2-03. La idempotencia de creación preserva una respuesta activa sólo mientras esa creación continúa siendo el estado coordinado vigente.

**Antes del commit de finalización**, mientras existen activa y active guard correlacionados:

- misma clave y mismo contexto CU-025: `EXISTING_IDEMPOTENT`, con el DTO activo vigente;
- otra intención con activa: `MEMBERSHIP_ALREADY_EXISTS`;
- los demás outcomes E2-03 permanecen sin cambios.

**Después del commit de finalización**, mientras existen lifecycle vigente y Membresía finalizada correlacionada:

- misma clave histórica: `MEMBERSHIP_REACTIVATION_REQUIRED`;
- otra clave: `MEMBERSHIP_REACTIVATION_REQUIRED`;
- nunca se devuelve `EXISTING_IDEMPOTENT`, DTO activo ni una Membresía nueva.

Una transición posterior confirmada impide representar el resultado anterior como activo. Los hashes históricos se conservan para correlación, identificación de la creación y diagnóstico sanitizado, no para devolver un estado funcional falso. En formulación precisa: el lifecycle preserva la identificación y bloquea recreación, pero evoluciona el outcome público después del cambio de lifecycle; no “preserva retries históricos” como si conservara su resultado activo.

`createMyMembershipForOwnedGroup` debe clasificar active guard/lifecycle dentro de su transacción: active-only conserva la semántica previa; lifecycle-only devuelve el nuevo reason; ambos o controles corruptos devuelven `INCOMPATIBLE_STATE`; ninguno sólo permite CU-025 cuando las consultas de integridad del estado vigente confirman que no existe una Membresía actual ni coordinación previa impeditiva.

Los tipos compartidos, mensajes de frontend y pruebas de regresión E2-03 deben evolucionar para reconocer `MEMBERSHIP_REACTIVATION_REQUIRED`. Esta ampliación no autoriza ni implementa CU-028 o CU-029.

### 16.2 Error ambiguo

Después de códigos de contención o commit ambiguo reconocidos, el adaptador no recalcula `fechaEgreso`. Ejecuta una relectura autoritativa, como mínimo, de:

1. Grupo;
2. ownership;
3. active guard;
4. lifecycle;
5. Membresía referenciada según la rama;
6. correlación completa.

La recuperación aplica estos resultados cerrados:

- ownership ya no vigente: `NOT_AUTHORIZED`, sin DTO;
- lifecycle-only íntegro y ownership vigente: `ALREADY_FINALIZED`, conservando exactamente la `fechaEgreso` confirmada;
- active-only íntegro: `CONFLICT`, sin afirmar finalización;
- ambos o correlación inválida: `INCOMPATIBLE_STATE`;
- ninguno sin resultado confirmado: `CONFLICT`;
- dependencia transitoria: `DEPENDENCY_UNAVAILABLE`;
- fallo desconocido: `INTERNAL_ERROR` sanitizado.

Una respuesta perdida se resuelve sólo mediante esta relectura; nunca se genera ni persiste una fecha nueva fuera de un intento transaccional que llegue a confirmarse.

## 17. Autorización, privacidad y Temporada

### 17.1 Condiciones separadas

- **Autenticación:** UID exclusivo del token.
- **Cuenta:** contrato `self-account`.
- **Persona:** derivada de `users/{uid}.personaId`, nunca del cliente.
- **Autorización:** `groups/{groupId}.ownerId == uid`.
- **Sujeto:** `membership.personId == personId` propio derivado.
- **Validez de dominio:** activa v1, guard, unicidad y Temporada exacta abierta.
- **Habilitación comercial:** `NO APLICA`.

### 17.2 Reglas expresas

- el cliente sólo aporta `groupId`;
- ownership se valida antes y dentro de la transacción;
- global admin, `users.roles`, `memberIds`, `adminIds`, `admins`, email y permisos legacy no autorizan;
- una Membresía ajena no puede consultarse ni finalizarse;
- la Temporada referida por la Membresía debe coincidir con la apertura vigente para confirmar la transición;
- una Membresía de Temporada cerrada no se finaliza;
- finalizar no transfiere ni elimina ownership;
- el nuevo Owner no adquiere ni finaliza Membresías por la transferencia;
- una Membresía finalizada no concede member-access en E2-04.

## 18. Persistencia física

| Ruta | Finalidad | Naturaleza | Escritor | Lector |
|---|---|---|---|---|
| `memberships/{membershipId}` | Aggregate Root y fuente Persona–Grupo | autoridad funcional | backend Membresías | backend por contratos |
| `activeMembershipGuards/{guardId}` | coordinación de una activa | técnico | backend Membresías | backend Membresías |
| `membershipLifecycleGuards/{lifecycleGuardId}` | coordinación vigente y tombstone consumible posterior a finalización | técnico, no autoridad ni historial | backend Membresías | backend Membresías |

No se agregan proyecciones, historial, arrays o documentos de idempotencia global.

### 18.1 Índices

No se requiere índice nuevo:

- la Membresía y ambos controles se leen por ID;
- el índice existente `personId ASC, groupId ASC, estado ASC` soporta comprobaciones exactas por estado;
- el índice E2-04 continúa soportando sólo el listado activo.

Si la implementación demuestra que Firestore exige otro índice para una consulta exactamente aprobada, deberá detenerse y actualizar esta ficha antes de modificar `firestore.indexes.json`.

## 19. Servicio, Repositorios y adaptadores

### 19.1 Componentes a ampliar

- dominio `membership.js`: unión discriminada, hidratación estricta y `finalize`;
- contrato: payload cerrado de finalización;
- DTO: finalizado exacto y unión owner-scoped;
- errores/callable mapping: nuevo reason y `MEMBERSHIP_NOT_FOUND`;
- `MembershipService`: coordinación de finalización y consulta discriminada;
- `MembershipRepository`: update finalizado y consultas exactas por estado;
- active guard: transición, contención y protección de CU-025;
- nuevo adaptador específico de `membershipLifecycleGuards` o responsabilidad claramente integrada al coordinador de guards;
- reader owner/self-scoped: activa, finalizada, ausencia e incompatibilidad;
- composición del módulo y export callable;
- tipos/servicio frontend y `OwnMembershipSection`.

### 19.2 Capacidades reutilizadas

- `self-account` y contexto de Persona propia;
- `ownedGroupContext` y relectura transaccional de Grupo;
- contexto de Temporada abierta;
- ID y hashing length-prefixed;
- Repositorio exclusivo de Membresía;
- validación/hidratación del guard E2-03;
- mapping estable de errores;
- `getMyMembershipForOwnedGroup` y `OwnMembershipSection`;
- `listMyCurrentGroupMemberships` sin alterar su frontera.

### 19.3 Dependencias prohibidas

- acceso del Módulo Membresías al Repositorio privado de Temporadas;
- repositorio genérico;
- Firebase en dominio o aplicación;
- Firestore directo desde frontend;
- lectura/escritura de arrays;
- modificación de Grupo, Persona, Usuario o Temporada;
- utilización de callables owner-scoped como autoridad member-scoped en E2-04.

## 20. Frontend mínimo

Se modifica únicamente `OwnMembershipSection` en `/dashboard/groups/[groupId]` y sus tipos/servicio directos.

### 20.1 Estados

1. cargando;
2. activa;
3. confirmación abierta;
4. cancelación sin escritura;
5. finalizando;
6. finalizada;
7. ya finalizada/idempotente;
8. reactivación requerida/no disponible;
9. error recuperable;
10. no autorizado;
11. estado incompatible.

### 20.2 Comportamiento

- la acción es explícita y sólo aparece sobre activa;
- la confirmación explica que ownership permanece;
- cancelar no invoca el callable;
- single-flight bloquea doble envío;
- éxito se muestra sólo después de backend;
- `ALREADY_FINALIZED` recupera el mismo estado y fecha;
- finalizada no vuelve a mostrar “Incorporarme como integrante”;
- se informa que reactivación aún no está disponible;
- los controles owner-scoped y navegación del Grupo permanecen;
- no se ejecuta actualización optimista;
- foco se mueve al resultado confirmado;
- confirmación, errores y estados son anunciables;
- teclado, foco visible, targets táctiles y responsive se conservan.

“Grupos que integrás” no se modifica visualmente en este incremento: desaparece la tarjeta al reconsultar porque su contrato E2-04 sólo devuelve activas operativas.

## 21. Reglas Firestore

La política permanece backend-only para:

- `memberships`;
- `activeMembershipGuards`;
- `membershipLifecycleGuards`;
- Personas, Grupos v1, Temporadas y guards de apertura.

La única modificación futura de reglas autorizable por esta ficha es agregar el `deny-all` explícito de `membershipLifecycleGuards`. No se abre lectura o escritura a ningún cliente.

## 22. Observabilidad

Se permiten logs técnicos sanitizados de operación, etapa, outcome/reason, duración y retry. Se prohíben:

- clave de idempotencia histórica cruda;
- hashes;
- email, nombres o datos de Persona;
- payload completo;
- documentos o snapshots;
- token o claims;
- stack trace en respuesta pública.

No se crea evento de dominio ni infraestructura nueva de observabilidad en E2-05.

## 23. Plan de pruebas obligatorio

### 23.1 Dominio

- construir/hidratar activa v1 exacta;
- hidratar finalizada v2 exacta;
- rechazar `fechaEgreso` en activa;
- exigir `fechaEgreso` en finalizada;
- rechazar estado/versión cruzados y campos extra;
- transición válida e inmutabilidad de identidad/referencias/fechas previas;
- `fechaEgreso >= fechaIngreso`;
- `finalize` recibe el único `Timestamp` backend generado para el intento y conserva exactamente su valor;
- rechazo de segunda transición como mutación de dominio.

### 23.2 Contrato y DTO

- payload exactamente `{ groupId }`;
- rechazo de `personId`, `membershipId`, estado, fecha, motivo, rol, permisos, clave y extras;
- DTO activo E2-03 byte/clave-compatible;
- DTO finalizado exacto sin `personId`;
- fechas ISO UTC;
- outcomes exactos y mapping HTTPS;
- mapping unitario exacto `MEMBERSHIP_NOT_FOUND → not-found`;
- mapping unitario exacto `MEMBERSHIP_REACTIVATION_REQUIRED → failed-precondition`;
- sanitización y allowlist exacta de `details.reason`, sin detalles internos;
- `MEMBERSHIP_REACTIVATION_REQUIRED` diferenciado de `MEMBERSHIP_ALREADY_EXISTS`.

### 23.3 Persistencia y coordinación

- update activa v1 a finalizada v2;
- `Timestamp.now()` fijado por backend exactamente una vez por intento del callback, nunca transform de commit;
- delete guard activo + create lifecycle + update Membresía atómicos;
- rollback total ante fallo antes del commit;
- clasificación cerrada `active-only | lifecycle-only | ninguno | ambos`, con todas las lecturas antes de escribir;
- rama `ninguno` sin Membresía canónica devuelve `MEMBERSHIP_NOT_FOUND` sólo después de autorizar;
- lifecycle ID, campos y versión exactos;
- transferencia exacta de referencias y hashes;
- misma instancia/valor `finalizedAt` en dominio, Membresía y lifecycle;
- retry transaccional puede generar un nuevo valor por intento y sólo conserva el intento confirmado;
- respuesta perdida y relectura conservan exactamente la fecha confirmada, sin recalcularla;
- lifecycle sin autoridad funcional;
- ausencia de índice nuevo.

### 23.4 Idempotencia y concurrencia

- primera finalización `FINALIZED`;
- repetición `ALREADY_FINALIZED` con mismo ID/fecha;
- lifecycle-only recupera `ALREADY_FINALIZED` aunque la Temporada ya no esté abierta;
- dos finalizaciones concurrentes;
- finalización frente a alta simultánea;
- evolución temporal E2-03: antes del commit, misma clave `EXISTING_IDEMPOTENT` y otra intención `MEMBERSHIP_ALREADY_EXISTS`;
- después del commit, retry histórico con la misma clave devuelve `MEMBERSHIP_REACTIVATION_REQUIRED`;
- después del commit, nueva intención CU-025 con otra clave devuelve `MEMBERSHIP_REACTIVATION_REQUIRED`;
- nunca DTO activo ni nueva Membresía después del cambio de lifecycle;
- respuesta perdida y commit ambiguo;
- recuperación ambigua con ownership transferido devuelve `NOT_AUTHORIZED` y ningún DTO;
- contención agotada;
- máximo una activa y ninguna recreación.

### 23.5 Integridad negativa

- activa sin guard;
- finalizada vigente sin lifecycle antes de CU-028/CU-029;
- guard activo y lifecycle coexistentes;
- lifecycle apuntando a otra Membresía;
- IDs, hashes, versión, timestamp o referencias corruptos;
- activa huérfana, finalizada huérfana y múltiples activas;
- ninguna reparación, adopción o borrado automático;
- compatibilidad futura: un caso posterior puede consumir/reemplazar el lifecycle y crear otra coordinación sin eliminar ni modificar la Membresía finalizada histórica.

### 23.6 Autorización y Temporada

- visitante;
- cuenta o Persona ausentes/incompatibles;
- global admin no Owner;
- Membresía no perteneciente a Persona propia;
- ownership transferido antes/durante la operación;
- Grupo ausente, inactivo o incompatible;
- Temporada exacta abierta;
- Temporada ausente, distinta, cerrada o corrupta;
- ownership conservado después de finalizar.

### 23.7 Consultas y E2-04

- owner query muestra activa exacta;
- rama lifecycle-only recupera finalizada sin buscar primero una activa como precondición;
- owner query muestra finalizada exacta;
- ausencia legítima devuelve `null`;
- query falla ante guard/lifecycle incompatible en el horizonte de E2-05;
- E2-04 excluye finalizada;
- E2-04 no cambia DTO/cursor/índice;
- controles de Owner permanecen.

### 23.8 Evidencia frontend por nivel

#### 23.8.1 Unitarias de máquina de estados e intención

Debe existir una máquina ejecutable, separable del render, que cubra:

- activa;
- confirmación;
- cancelación;
- single-flight;
- finalizando;
- finalizada;
- `ALREADY_FINALIZED`;
- retry;
- reactivación requerida.

#### 23.8.2 Conductual de componente o integración

Si durante la implementación existe un harness viable, debe verificar:

- cancelar no invoca el callable;
- confirmar lo invoca exactamente una vez;
- doble click no duplica;
- ramas visuales activa/finalizada;
- foco posterior al resultado.

El repositorio actual no posee runner ni dependencias de prueba de componentes frontend. Por tanto, E2-05 no puede afirmar hoy esa cobertura. Como mínimo obligatorio exige máquina de estados ejecutable, typecheck, build, evidencia estructural etiquetada y UAT manual completo. Incorporar un harness nuevo requeriría justificar su alcance antes de ampliar dependencias.

#### 23.8.3 Regex/arquitectura

La prueba arquitectónica existente puede acreditar sólo composición superficial, imports, textos esperados o ausencia de acceso prohibido. Debe etiquetarse como estructural y no puede presentarse como evidencia de invocaciones, single-flight, transiciones, foco o conducta del componente.

#### 23.8.4 UAT manual

Debe acreditar accesibilidad, foco real, teclado, anuncios, responsive e integración visual, además de los flujos funcionales enumerados en la sección 24.

### 23.9 Reglas, arquitectura y efectos

- deny-all directo de las tres colecciones;
- backend callable permitido sólo con autorización válida;
- dominio/aplicación sin Firebase;
- módulos externos por contratos;
- cero cambios en Usuario, Persona, Grupo y Temporada;
- cero escrituras en `memberIds`, `adminIds`, `admins` o solicitudes;
- cero eventos, alertas, notificaciones, pagos u operaciones deportivas;
- aislamiento de rutas y APIs legacy.

## 24. UAT mínimo

### 24.1 Entorno

- Firebase Emulator Suite local;
- proyecto `demo-sportexa-e2-05` o `demo-*` equivalente;
- Auth, Firestore y Functions en loopback;
- frontend local;
- datos sintéticos descartables;
- cero Firebase remoto.

### 24.2 Casos manuales

1. Owner con activa observa acción explícita.
2. Abrir y cancelar confirmación no produce escritura.
3. Confirmar muestra estado en curso y luego `finalizada` con ambas fechas.
4. Recargar recupera la misma finalizada.
5. Repetir recupera `ALREADY_FINALIZED` sin cambiar `fechaEgreso`.
6. Ownership, navegación y controles administrativos permanecen.
7. El Grupo deja de aparecer en “Grupos que integrás” después de reconsultar.
8. La pantalla no vuelve a ofrecer CU-025 y comunica que reactivación no está disponible.
9. Error recuperable permite retry sin actualización optimista.
10. Estado incompatible falla cerrado y no se repara.
11. Teclado, foco, anuncios y responsive son utilizables.
12. Inspección confirma finalizada v2, lifecycle v1, ausencia del guard activo y cero efectos laterales/legacy.

Los casos concurrentes, global admin, ownership transferido, Temporada cerrada, retry histórico y corrupción se cubren preferentemente de forma automatizada y no requieren manipulación manual insegura.

## 25. Criterios de aceptación

1. Dado un Owner con activa íntegra de Temporada abierta, cuando confirma, entonces la misma Membresía queda finalizada v2 en un commit atómico.
2. Dada una cancelación, no existe invocación ni escritura.
3. Dada una finalización, `fechaEgreso` proviene de backend y no puede enviarse o retrotraerse.
4. Dada la finalizada, identidad, referencias, `fechaIngreso` y `createdAt` permanecen iguales.
5. Dada una activa existente, continúa v1 y no se migra antes de finalizar.
6. Dada la transición, guard activo desaparece y lifecycle exacto aparece en el mismo commit.
7. Dada una repetición, retorna `ALREADY_FINALIZED` con el mismo ID y fecha.
8. Dadas dos finalizaciones concurrentes, existe una sola transición y ninguna corrupción.
9. Dado un retry E2-03 o nueva intención CU-025 posterior, recibe `MEMBERSHIP_REACTIVATION_REQUIRED` sin DTO activo ni creación.
10. Dentro del estado alcanzable antes de CU-028/CU-029, dada una activa actual sin active guard, una finalizada vigente sin lifecycle o coexistencia, falla `INCOMPATIBLE_STATE` sin reparación.
11. Dado un no Owner, incluso global admin, no obtiene datos ni modifica la Membresía.
12. Dada una transferencia confirmada antes del commit, el Owner anterior es rechazado.
13. Dada una Temporada no abierta exacta, la primera finalización es rechazada.
14. Dada la finalización, ownership permanece.
15. Dada una consulta owner posterior, devuelve el DTO finalizado exacto y no ofrece alta.
16. Dada una consulta E2-04 posterior, no devuelve la finalizada.
17. Dado acceso cliente directo, reglas deniegan las tres colecciones.
18. Dado cualquier resultado, no se escriben arrays ni otros Agregados y no se producen efectos laterales.
19. Dado un intento transaccional, se genera una sola vez `Timestamp.now()` y el mismo valor confirmado queda en `fechaEgreso` y `lifecycle.finalizedAt`.
20. Dado un retry del callback o una respuesta perdida, sólo la fecha del intento confirmado permanece y toda recuperación la relee sin recalcularla.
21. Dada una recuperación ambigua tras transferencia de ownership, no se devuelve DTO y el resultado es `NOT_AUTHORIZED`.
22. Dados `MEMBERSHIP_NOT_FOUND` o `MEMBERSHIP_REACTIVATION_REQUIRED`, el código HTTPS y `details.reason` coinciden exactamente con el mapping cerrado y sanitizado.
23. Dada una evolución futura autorizada, el lifecycle vigente puede consumirse o reemplazarse sin eliminar, reutilizar ni modificar la Membresía finalizada histórica.
24. La evidencia frontend distingue máquina de estados, conducta de componente si existe harness, prueba estructural y UAT; ninguna regex se presenta como conducta.

## 26. Legado y transición

E2-05 no lee, escribe, sincroniza ni usa como fallback:

- `memberIds`;
- `adminIds`;
- `admins`;
- solicitudes embebidas;
- rutas/API legacy de Grupos;
- participantes de Partido;
- Torneos o inscripciones;
- alertas o notificaciones.

`eliminarJugador` y `reincorporarJugador` son operaciones legacy ajenas y no se reinterpretan como finalizar/reactivar Membresía.

No se retira ninguna estructura legacy. El nuevo flujo sólo amplía la autoridad canónica de Membresía para su propio lifecycle.

## 27. Deudas y riesgos

### 27.1 Tensión Temporada cerrada–renovación

Una Membresía puede permanecer físicamente activa después del cierre futuro de su Temporada; RF-20 impide modificarla una vez cerrada, mientras la unicidad Persona–Grupo impide otra activa. E2-05 no resuelve esa tensión porque sólo finaliza durante la Temporada abierta. Debe resolverse explícitamente antes de E2-06 o antes de habilitar cierre de Temporada, sin transición implícita ni modificación cruzada de Agregados.

### 27.2 Deuda E2-02

La intermitencia concurrente de apertura no bloquea E2-05. El caso sólo consume contexto persistido y falla cerrado ante cardinalidad o guard incompatible. No se modifica ni corrige E2-02.

### 27.3 Deuda E2-03

La falla concurrente aislada `INTERNAL_ERROR` no bloquea la definición, pero E2-05 toca el mismo punto de contención. La implementación deberá observar y capturar de forma sanitizada finalización frente a alta y commit ambiguo. Si reaparece con evidencia atribuible, la implementación E2-05 se detendrá y el diagnóstico/corrección se realizará en una intervención separada. No se aplicará una corrección especulativa dentro de E2-05.

### 27.4 E2-04

Persisten como deuda separada N+1 hasta 20, páginas físicas filtradas y ausencia de snapshot multipágina. E2-05 no las corrige ni las agrava estructuralmente; una lectura concurrente puede requerir retry conforme a su semántica existente.

## 28. Relación exacta con E2-06

E2-05 deja una Membresía finalizada histórica y un lifecycle vigente que actúa como tombstone y bloquea CU-025 hasta que un caso posterior autorizado evolucione la coordinación.

E2-06 deberá, mediante ficha propia:

- crear una Membresía nueva para una nueva Temporada;
- no reutilizar ni reactivar la finalizada;
- conservar la Membresía finalizada anterior como histórica, sin reutilizarla ni modificarla;
- consumir o reemplazar atómicamente el lifecycle vigente y crear el active guard de la Membresía nueva;
- coordinar la unicidad Persona–Grupo durante esa sustitución;
- definir idempotencia y recuperación propias;
- resolver previamente la tensión de una activa congelada por cierre de Temporada.

Después de esa transición futura, la Membresía finalizada histórica no estará obligada a conservar un lifecycle individual: la Membresía seguirá siendo la fuente histórica. Esta ficha no diseña el esquema, contrato, referencia de trazabilidad, guard ni transacción de E2-06.

## 29. Checkpoint y rollback

- **Commit inicial:** `c56d45eb276c94670fb6ddbe68c40eff12f84834`.
- **Rama de definición:** `dev`.
- **Estado inicial:** E2-04 cerrado; upstream `origin/dev`; divergencia `0/0`; árbol limpio.
- **Rama futura sugerida:** `feat/e2-05-finalize-owner-membership`, sólo después de aprobar la ficha.
- **Rollback de código futuro:** revertir exclusivamente E2-05; no usar doble escritura.
- **Datos de prueba:** eliminar sólo fixtures E2-05 registrados en emuladores.
- **Remoto:** no aplica.
- **Interrumpir si:** se necesita finalizar terceros, cerrar Temporada, corregir E2-02/E2-03, relajar integridad, reparar datos, escribir arrays, agregar otra transición o cambiar los contratos aprobados.

## 30. Evidencia de cierre futura

- ficha aprobada antes de implementar;
- rama y commits trazables;
- modelos v1/v2 y lifecycle exactos;
- contratos, DTO, outcomes y reasons finales;
- pruebas completas y conteos;
- evidencia transaccional y concurrente;
- evidencia de identificación histórica, bloqueo de recreación y outcome público evolucionado después de finalizar;
- reglas backend-only;
- frontend y UAT aprobados;
- aislamiento legacy y cero efectos laterales;
- baseline de calidad y `git diff --check`;
- deuda E2-02/E2-03 observada sin corrección silenciosa;
- informe de implementación y cierre formal separados;
- confirmación de cero acceso, escritura o despliegue Firebase remoto.

## 31. Declaración final de definición

- **Estado:** `LISTA PARA IMPLEMENTAR`.
- **Corte funcional:** aprobado y materializado en esta ficha, sin ampliación.
- **Correcciones H01–H06:** corregidas y cerradas por reverificación independiente; sin bloqueos remanentes dentro del alcance revisado.
- **Implementación:** no iniciada ni autorizada.
- **Decisiones fundamentales abiertas:** ninguna dentro del corte aprobado.
- **Límites de la aprobación:** no autoriza CU-028, CU-029, Personas terceras, correcciones E2-02/E2-03, rama feature, implementación o despliegue.
- **Archivo autorizado en esta intervención:** únicamente `docs/implementacion/etapa-2/E2-05-ficha-finalizacion-membership-owner-self.md`.
- **Versionado documental:** se autoriza exclusivamente commit y publicación de esta ficha sobre `dev`; código, reglas, índices, archivos existentes, dependencias, lockfiles, merge, Firebase y despliegues permanecen sin cambios y no autorizados.

## Veredicto documental

`E2-05 FICHA APROBADA — LISTA PARA IMPLEMENTAR`
