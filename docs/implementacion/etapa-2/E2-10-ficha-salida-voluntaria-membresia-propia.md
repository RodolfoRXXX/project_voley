# E2-10 — Salida voluntaria de la Membresía propia

## Estado de la ficha

- **Identificador:** E2-10.
- **Título:** Salida voluntaria de la Membresía propia.
- **Estado:** `Aprobada documentalmente — lista para versionar`.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Tipo de corte:** capacidad funcional vertical, pequeña y verificable.
- **Checkpoint documental:** `dev` en `a10d3c72d7edbac7871bafbd3f1989f4b1dcaff5`, coincidente con `origin/dev`, divergencia `0/0`, índice limpio, sin stashes y con esta ficha sin seguimiento como único cambio local al iniciar; `chore/preserve-auth-emulator-uat-changes` intacta en `fc7135e358902a17372d44f20df50883603520ce`.
- **Fuente de verdad principal:** Membresía y sus Períodos de Vigencia.
- **Caso de uso principal:** CU-009 — Abandonar un Grupo.
- **Operación de dominio reutilizada:** CU-027 — Finalizar una Membresía.
- **Veredicto documental:** `E2-10 APROBADO — LISTO PARA VERSIONAR`.

Esta ficha define exclusivamente E2-10. No implementa el alcance, no crea una rama y no autoriza commit, push, merge, deploy, acceso a Firebase remoto ni integración de la rama `chore/preserve-auth-emulator-uat-changes`.

## 1. Identificación, título y estado

E2-10 incorpora la salida voluntaria iniciada por la Persona autenticada respecto de su propia Membresía activa. El nombre operativo no replica la fila preliminar E2-10 del Documento 5 porque la numeración efectiva fue consumida por cortes más pequeños durante E2-01 a E2-09.

El incremento queda `Aprobado documentalmente — listo para versionar`: no persiste una decisión funcional o arquitectónica material sin resolver.

## 2. Alcance derivado y fundamento

### 2.1 Fuentes normativas y de transición consultadas

Se contrastaron, en orden de autoridad:

1. Documento 1 aprobado: Grupo como unidad principal, Temporada como ciclo operativo, Owner como máxima autoridad del recurso y separación de responsabilidades entre dominios.
2. Documento 1.5 aprobado: Membresía como relación Persona–Grupo–Temporada, unicidad activa Persona–Grupo, ciclo de vida propio, historia preservada y roles/permisos contextuales no globales.
3. Documento 2 aprobado: CU-009 permite abandonar un Grupo; CU-027 finaliza una Membresía; CU-028 reactiva la misma Membresía sólo en Temporada abierta; CU-029 crea una nueva Membresía para una nueva Temporada; RF-17 bloquea absolutamente operaciones y modificaciones sobre una Temporada cerrada y RF-20 dispone específicamente que una Membresía de esa Temporada no puede reactivarse ni modificarse.
4. Documentos 3 y 4 AUD-C04 con adendas AUD-C05 aprobadas: Membresía es Aggregate Root y unidad de consistencia; los Períodos de Vigencia son entidades internas subordinadas; finalizar cierra el único período abierto; Persona, Grupo y Temporada permanecen fuera del Agregado; v1/v2/v3 evolucionan sólo por escritura autorizada.
5. Documento 5: avance por caso de uso y fuente de verdad, frontend en el mismo incremento, retiro por flujo, ausencia de doble autoridad y obligación de subdividir los cortes preliminares grandes.
6. Fichas, informes y cierres E2-04 a E2-09: consulta member-scoped, finalización Owner/self, Solicitud, decisión, retiro parcial legacy y reactivación v3 están integrados y no se reabren.
7. Código actual de `dev`, sólo como evidencia técnica: existe finalización owner/self sobre Membresía v1/v3; existe listado canónico propio; la salida legacy aún modifica arrays de Grupo; no existe salida canónica general para una integrante no Owner.

### 2.2 Reconstrucción de la secuencia efectiva

| Incremento | Corte efectivamente cerrado |
| --- | --- |
| E2-01 | Grupo mínimo, ownership y acceso Owner |
| E2-02 | alta y apertura mínima de Temporada |
| E2-03 | alta explícita de Membresía propia del Owner |
| E2-04 | consulta de Grupos propios por Membresía activa |
| E2-05 | finalización de la Membresía propia del Owner |
| E2-06 | Solicitud propia de ingreso |
| E2-07 | decisión Owner y coordinación Solicitud–Membresía |
| E2-08 | retiro del ingreso legacy por arrays |
| E2-09 | reactivación de la misma Membresía por Solicitud y Períodos de Vigencia |

La fila preliminar E2-10 del Documento 5 —administración e historial de Temporadas— continúa como trabajo futuro, pero no conserva prioridad automática ni obliga a agrupar CU-017, CU-018 y CU-019 bajo la numeración ya utilizada.

### 2.3 Matriz breve de alternativas

| Alternativa | Caso normativo | Valor, dependencias y UAT humana | Agregado y autorización | Persistencia y frontend | Mezcla, legacy y tamaño | Futuro que desbloquea |
| --- | --- | --- | --- | --- | --- | --- |
| Salida voluntaria propia | CU-009; reutiliza CU-027 | Valor inmediato alto; depende de E1-01/E1-02 y E2-03/E2-04/E2-05/E2-09; vuelve recorrible la preparación humana de reingreso | Membresía; autenticación + Cuenta + Persona propia + correlación de la Membresía, sin rol global | transición v3 y un intent técnico idempotente; acción acotada en “Grupos que integrás” | Bajo acoplamiento; retira la salida legacy equivalente; tamaño pequeño/medio | UAT completa de ciclos salida–Solicitud–reactivación y retiro posterior de consumidores legacy |
| Finalización administrativa por Owner | CU-027 dentro de gestión de Membresías | Valor alto; requiere selección segura de tercera Persona/Membresía; sin roster la UAT depende de IDs técnicos | Membresía; ownership vigente o capacidad canónica futura | misma transición, contrato por `membershipId`, UI administrativa inexistente | Riesgo alto de mezclar expulsión, baja administrativa, motivo y roster; tamaño medio/alto | disciplina, administración y roles posteriores |
| Listado canónico de integrantes | soporte de gestión de integrantes y CU-026/CU-027/CU-030; no tiene CU autónomo explícito | Valor medio; depende de E2-03/E2-09; UAT directa, pero no ejecuta la salida faltante | modelo de lectura de Membresía; visibilidad Owner o member-safe por definir | sin escritura; consulta paginada, DTO mínimo y nueva superficie Owner | Bajo riesgo de Agregado, pero abre decisiones de privacidad; tamaño medio | baja administrativa, roles, convocatorias y administración de plantel |
| Renovación | CU-029 | Valor alto de cambio de ciclo; depende de cierre/historia de Temporadas y nueva Temporada abierta; UAT hoy no es íntegramente canónica | nueva Membresía; actor y autorización todavía deben fijarse en su ficha | nueva raíz, trazabilidad con anterior, guards e interfaz específica | Alto riesgo de confundir CU-028/CU-029; tamaño alto | continuidad intertemporada y actividad de nueva Temporada |
| Administración del Grupo | CU-012 a CU-015 | Valor amplio, pero no una dependencia inmediata de E2-09; UAT sólo es clara por subcaso | Grupo; ownership vigente | varios comandos, schemas y superficies | Mezcla edición, configuración, archivo y eliminación; tamaño grande | configuración, archivo, Club y administración general |
| Siguiente dependencia preliminar de Documento 5: Temporadas | CU-017 a CU-019 | Cierre e historia desbloquean CU-029; depende de E2-02 y debe coordinar carreras con Membresía | Temporada; ownership vigente | edición/cierre/listado tienen escrituras y readers distintos | Debe separarse al menos cierre de consulta/edición; tamaño medio/alto por corte | renovación, historia y cierre del ciclo operativo |
| Retiro de consumidores legacy restantes | D5-030 y TECH-GAP-04/08/09 | Valor técnico alto; depende de reemplazos canónicos por consumidor; UAT es negativa | varios límites; no admite una autorización común | elimina readers/writers heterogéneos | Riesgo máximo de barrido horizontal; tamaño grande si no se acota | cierre de Etapa 2 y ausencia de doble autoridad |

### 2.4 Selección

Se selecciona la salida voluntaria de la Membresía propia porque ofrece la mejor combinación de continuidad normativa, dependencia inmediata, valor observable, bajo acoplamiento y UAT real. CU-009 es explícito; la transición de CU-027 y los Períodos de Vigencia ya existen; la identidad propia y el listado member-scoped ya están disponibles; y el writer legacy equivalente puede retirarse dentro del mismo flujo.

No se seleccionan roster ni finalización administrativa como atajos. Requieren visibilidad y autorización distintas. Tampoco se adelanta CU-029: una nueva Temporada canónica posterior al cierre todavía no puede recorrerse sin capacidades propias de Temporada.

## 3. Casos de uso incluidos

1. **CU-009 — Abandonar un Grupo**, limitado a una acción voluntaria sobre la Membresía activa de la Persona propia autenticada.
2. **CU-027 — Finalizar una Membresía**, sólo como transición ya aprobada que materializa la salida: se conserva la misma raíz, se cierra el único Período de Vigencia abierto y se preserva la historia.
3. Consulta E2-04 `listMyCurrentGroupMemberships`, sólo como reader que presenta la acción y confirma el estado posterior.

CU-009 define la intención del actor; CU-027 define el cambio de ciclo de vida. No se crea una segunda semántica de finalización en el dominio.

## 4. Objetivo funcional

Permitir que una Persona autenticada salga voluntariamente de un Grupo que integra mediante una Membresía activa, sin intervención del Owner, sin modificar Grupo ni arrays legacy y con resultado idempotente aun frente a doble envío, respuesta perdida, reactivación posterior o retry tardío.

## 5. Problema que resuelve

El producto sólo expone hoy CU-027 al Owner actual sobre la Membresía de su propia Persona. Una integrante no Owner puede ingresar y reingresar por Solicitud, pero no puede cerrar voluntariamente su propia pertenencia mediante el modelo canónico.

La ausencia obligó a preparar por fixture local la Membresía finalizada usada en UAT-02/UAT-06 de E2-09. La salida legacy no resuelve la brecha: modifica `groups.memberIds`, puede alterar arrays administrativos y no opera sobre la fuente de verdad Membresía.

## 6. Actores y autorización

| Actor | Participación | Autorización |
| --- | --- | --- |
| Usuario autenticado con Persona vinculada | inicia la salida voluntaria | UID sólo del token; Cuenta propia compatible; `users/{uid}.personaId` autoritativo; `membership.personId` debe coincidir |
| Integrante no Owner | caso principal | la Membresía propia activa autoriza exclusivamente su salida |
| Owner que además posee Membresía | también puede salir de su pertenencia deportiva | usa la misma autoridad self-person; ownership no es requisito ni se modifica |
| Owner sin Membresía | no tiene relación de pertenencia que finalizar | `MEMBERSHIP_NOT_FOUND` |
| Sistema | confirma una unidad de consistencia de Membresía | no agrega discrecionalidad ni rol funcional |

La operación no se autoriza mediante ownership, `users.roles`, claims globales, `memberIds`, `adminIds`, `admins`, Plan, Suscripción, email ni datos enviados por el cliente.

Un Owner puede finalizar su propia Membresía porque ownership y pertenencia son relaciones independientes, decisión ya confirmada por E2-05. La salida no transfiere ni elimina ownership: el Owner conserva administración del Grupo aunque deje de integrarlo deportivamente. La superficie owner/self de E2-05 permanece compatible y separada.

## 7. Precondiciones

- token Firebase verificado;
- Cuenta propia existente y compatible;
- Persona propia vinculada y compatible;
- payload contractual cerrado y clave de idempotencia válida;
- `groupId` público mínimo recibido desde el DTO member-scoped E2-04; no se recibe `membershipId` ni `seasonId`;
- active guard determinista Persona–Grupo que selecciona una sola Membresía activa, propia y correlacionada con el `groupId`;
- unicidad activa Persona–Grupo íntegra;
- active guard v1/v2 íntegro y correlacionado;
- raíz v1 o v3 compatible y, para v3, exactamente un Período de Vigencia abierto;
- Grupo canónico v1 existente y activo;
- Temporada exacta de la Membresía existente, íntegra y abierta, coincidente con el open guard vigente;
- ausencia de lifecycle guard simultáneo o de estado parcial incompatible.

La exigencia de Temporada abierta se conserva después de revisión adversarial. Aunque la salida reduce participación y no modifica el Agregado Temporada, CU-009 materializa CU-027 y sí modifica la Membresía. El fundamento exacto es Documento 2, RF-20: “Una Membresía correspondiente a una Temporada cerrada no puede reactivarse ni modificarse”; RF-17 refuerza el bloqueo absoluto de nuevas operaciones y modificaciones y Documento 3 AUD-C05 conserva esa invariante del Agregado Membresía. No existe una excepción aprobada para la salida voluntaria. Por eso, en la primera ejecución se valida dentro de la transacción que la Temporada exacta exista, sea schema compatible, pertenezca al Grupo y continúe abierta con su open guard correlacionado. Una salida ya confirmada se recupera desde el intent aunque después se cierre la Temporada o cambie la vigencia del Grupo, sin nueva escritura. La posible Membresía activa congelada por un cierre futuro queda como responsabilidad del incremento de cierre de Temporada: E2-10 no puede contradecir RF-20 ni modificar la Temporada.

## 8. Flujo principal

1. La Persona abre “Grupos que integrás”.
2. El reader E2-04 devuelve una Membresía propia activa y el Grupo mínimo correlacionado; agrega `group.viewerIsOwner`, derivado en backend, sólo para microcopy y nunca como autoridad.
3. La Persona selecciona “Salir del Grupo”.
4. La UI explica que dejará de integrar el Grupo, que la historia se conserva y que una futura reincorporación requiere una nueva Solicitud. Si `group.viewerIsOwner` es verdadero, advierte expresamente que seguirá siendo Owner y administrando el Grupo; nunca presenta la acción como abandono o transferencia de propiedad.
5. La Persona confirma; la UI conserva una clave de idempotencia estable para esa intención y bloquea doble envío.
6. El callable deriva UID, Cuenta y Persona; no acepta identidad ni autoridad desde el cliente.
7. En una transacción Firestore se releen el vínculo Cuenta–Persona y la Persona exacta y se lee primero el intent determinista. Si no existe, el active guard Persona–Grupo selecciona `membershipId`, `seasonId` y ordinal autoritativos; entonces se leen la raíz exacta, el lifecycle guard, las consultas de cardinalidad, sus Períodos necesarios, el Grupo y la Temporada/open guard exactos.
8. Se verifica ownership funcional de los datos: la Persona propia es la de la Membresía; Grupo y Temporada sólo aportan contexto y no se modifican.
9. El Aggregate Root ejecuta la finalización v3: cierra el único Período de Vigencia abierto con una marca temporal autoritativa del servidor y conserva los anteriores.
10. La misma transacción actualiza la raíz, persiste el período cerrado, elimina el active guard, crea el lifecycle guard v2 y registra el intent técnico consumido.
11. La respuesta devuelve el efecto de salida confirmado, no un snapshot que prometa que la Membresía seguirá finalizada para siempre.
12. La UI reconsulta desde la primera página; la Membresía deja de aparecer si continúa finalizada y muestra éxito confirmado sin actualización optimista.

## 9. Alternativas y errores

| Situación | Resultado |
| --- | --- |
| La Persona cancela el diálogo | cero invocaciones y cero escrituras |
| Falta sesión | `UNAUTHENTICATED` |
| Falta Cuenta | `ACCOUNT_REQUIRED` |
| Falta Persona vinculada | `PERSON_REQUIRED` |
| No existe active guard/Membresía para Persona propia + `groupId` | `MEMBERSHIP_NOT_FOUND`, sin revelar Membresías de terceros |
| Grupo ausente, archivado o incompatible | `GROUP_INCOMPATIBLE` |
| Temporada ausente, cerrada, cambiada o no coincidente | `MEMBERSHIP_SEASON_NOT_MODIFIABLE` |
| Membresía ya finalizada por otra intención u operación | `MEMBERSHIP_NOT_ACTIVE`; no se atribuye esa salida al actor actual |
| Estado, cardinalidad, guard o período incompatible | `INCOMPATIBLE_STATE`, sin reparación |
| Misma clave con otro request | `IDEMPOTENCY_CONFLICT` |
| Contención sin confirmación autoritativa | `CONFLICT` |
| Dependencia transitoria caída | `DEPENDENCY_UNAVAILABLE` |
| Error desconocido | `INTERNAL_ERROR` sanitizado |
| Respuesta perdida después del commit | el retry con la misma clave devuelve el mismo efecto confirmado |
| Retry viejo después de una reactivación posterior | devuelve el efecto histórico del intent; no cierra la nueva activación |

## 10. Alcance incluido

- callable canónico self-person para salida voluntaria;
- payload cerrado con sólo `groupId` e `idempotencyKey`;
- intent técnico durable e idempotente por actor y clave;
- reutilización de `finalizeMembership` y de Períodos de Vigencia;
- finalización atómica de activa v1/v3 hacia finalizada v3;
- validación transaccional de Persona, Grupo y Temporada exactos;
- resultado de efecto estable y sanitizado;
- acción, confirmación, single-flight, retry y reconsulta en “Grupos que integrás”;
- compatibilidad de la superficie owner/self E2-05;
- retiro del endpoint legacy `/groups/{groupId}/join` usado para salida y de sus botones/BFF equivalentes;
- pruebas unitarias, contractuales, Emulator, arquitectura y frontend del corte.

## 11. Exclusiones explícitas

- finalización, expulsión o baja administrativa de la Membresía de otra Persona;
- roster o listado canónico de integrantes del Grupo;
- selección de terceros por UID, Persona o `membershipId`;
- motivos, sanciones, disciplina o clasificación de causales de egreso;
- CU-026, CU-028 autónomo, CU-029, CU-030 y estados adicionales;
- transferencia de ownership, remoción de administradores, roles, cargos o permisos;
- cierre, reapertura, edición o historia de Temporadas;
- creación automática de Solicitud, reactivación o renovación después de salir;
- notificaciones, Actividad, alertas, email o push;
- migración, backfill, adopción, conversión o limpieza global de arrays;
- retiro de alta/baja administrativa legacy, solicitudes administrativas o consumidores de Torneos;
- Plan, Suscripción y habilitación comercial;
- deploy, acceso Firebase remoto o integración Auth/UAT.

## 12. Agregados y fuentes de verdad

| Concepto | Responsabilidad en E2-10 |
| --- | --- |
| Membresía | único Aggregate Root modificado; fuente de verdad de estado, referencias y ciclo de vida |
| Período de Vigencia | entidad interna subordinada; conserva el intervalo activo cerrado por la salida |
| Grupo | Agregado externo de contexto; valida identidad y estado; no se escribe |
| Temporada | Agregado externo de contexto; valida que la Membresía aún sea modificable; no se escribe |
| Usuario/Cuenta | identidad digital y precondición de acceso; no se escribe |
| Persona | identidad deportiva propia derivada; no se escribe |
| Solicitud | no participa en la salida; puede aparecer sólo en un flujo posterior iniciado expresamente |
| Intent de salida | coordinación técnica e idempotencia; no es Agregado ni fuente de verdad de pertenencia |

`memberIds`, `adminIds`, `admins` y `pendingAdminRequestIds` no son fuentes de verdad ni proyecciones canónicas de E2-10.

## 13. Invariantes

1. Sólo la Persona propia puede iniciar la salida de su Membresía.
2. Una salida nunca modifica una Membresía ajena.
3. Una Membresía activa posee exactamente un Período de Vigencia abierto.
4. La salida cierra exactamente ese período y no altera períodos anteriores.
5. La raíz finalizada no posee períodos abiertos y conserva `fechaIngreso` inmutable.
6. `fechaEgreso` coincide con `endedAt` del último período y con `finalizedAt` del lifecycle guard/intento confirmado.
7. Activa v1 evoluciona a finalizada v3 usando su `fechaIngreso` autoritativa; activa v3 conserva toda su historia.
8. Raíz, período, active guard, lifecycle guard e intent se confirman en una única transacción de Membresía.
9. El mismo intent no cierra más de una activación.
10. Un retry antiguo nunca finaliza una activación posterior.
11. Grupo, Temporada, Persona, Usuario y Solicitud no se modifican.
12. Ownership sobrevive a la salida y no se transfiere.
13. No se escriben `memberIds`, `adminIds`, `admins`, `pendingRequestIds`, `pendingAdminRequestIds`, intents de Solicitud, notificaciones, Actividad ni otros Agregados.
14. Un estado incompatible falla cerrado, sin adopción o reparación.

## 14. Contratos de entrada y salida

### 14.1 Entrada

Callable público exacto: `leaveMyGroupMembership`. No se reutiliza `finalizeMyMembershipForOwnedGroup`: ese contrato conserva autorización Owner/self y semántica de E2-05; sólo se comparte la transición de dominio `finalizeMembership`.

Payload exacto:

| Campo | Tipo | Regla |
| --- | --- | --- |
| `groupId` | string | opaco de 1 a 1500 bytes UTF-8, trim canónico, sin `/`, obtenido del reader propio |
| `idempotencyKey` | string | 16–128 caracteres, patrón exacto `^[A-Za-z0-9._:-]{16,128}$`; estable durante toda la intención |

El objeto debe ser plano, con prototipo normal o nulo, y tener exactamente esas dos propiedades. Se rechazan `null`, arrays, instancias, propiedades desconocidas y, de forma expresa, `uid`, `personId`, `membershipId`, `seasonId`, estado, fechas, ordinal, actor alternativo, Owner, roles, permisos, guards y motivo. `groupId` identifica el Grupo, no concede autoridad ni selecciona una Persona.

La selección es inequívoca sin `seasonId`: después de derivar la Persona propia, el backend calcula los IDs deterministas de active y lifecycle guard Persona–Grupo. Para una primera salida, el active guard debe existir, ser v1/v2 íntegro y apuntar a una única raíz activa de la misma Persona y Grupo; la raíz aporta `membershipId` y `seasonId`, y el guard v2 aporta el ordinal. Las consultas `estado == activa` y `estado == finalizada`, ambas con `limit(2)`, verifican cardinalidad y evitan selección arbitraria. Para v1 el ordinal autoritativo es `1` y se valida con la materialización del primer Período prevista por E2-09. Ausencia de ambos guards y de raíces para el par produce `MEMBERSHIP_NOT_FOUND`; un lifecycle v1/v2 íntegro con su única raíz finalizada produce `MEMBERSHIP_NOT_ACTIVE`; raíz sin guard, guard sin raíz, coexistencia, duplicados o correlación rota producen `INCOMPATIBLE_STATE`. Un intent confirmado se resuelve antes y recupera su resultado según §17.

### 14.2 Salida

Respuesta exacta:

| Campo | Tipo | Semántica |
| --- | --- | --- |
| `outcome` | `EXIT_CONFIRMED` | mismo valor en primera confirmación y retry del mismo intent |
| `exit.membershipId` | string | raíz afectada |
| `exit.groupId` | string | Grupo de la relación |
| `exit.seasonId` | string | Temporada de la Membresía |
| `exit.activationOrdinal` | entero positivo | activación exacta cerrada; control de correlación, no exposición de períodos |
| `exit.endedAt` | ISO-8601 UTC | timestamp autoritativo de finalización |
| `exit.actorWasOwner` | boolean | indica si el actor era Owner al commit; sólo confirma que ownership se preservó |

No se devuelven `personId`, UID, `ownerId`, roles, permisos, causa interna, paths, documentos, hashes, guards, intent ID, stack ni contenido de los Períodos de Vigencia.

## 15. Outcomes y errores sanitizados

El único outcome exitoso es `EXIT_CONFIRMED`. La estabilidad se refiere al efecto identificado por actor + clave + request, no al estado vigente perpetuo de la raíz.

Los reasons públicos quedan limitados a:

- existentes: `UNAUTHENTICATED`, `ACCOUNT_REQUIRED`, `PERSON_REQUIRED`, `PERSON_INCOMPATIBLE`, `GROUP_INCOMPATIBLE`, `VALIDATION_FAILED`, `MEMBERSHIP_NOT_FOUND`, `IDEMPOTENCY_CONFLICT`, `INCOMPATIBLE_STATE`, `CONFLICT`, `DEPENDENCY_UNAVAILABLE`, `INTERNAL_ERROR`;
- nuevos y acotados: `MEMBERSHIP_NOT_ACTIVE` y `MEMBERSHIP_SEASON_NOT_MODIFIABLE`.

Ausencia y pertenencia ajena comparten `MEMBERSHIP_NOT_FOUND`. No se filtran identificadores, cardinalidades, estados internos, versión de schema ni diferencias entre Temporada ausente/cerrada/cambiada.

Mapping HTTPS cerrado:

| Código callable | `details.reason` |
| --- | --- |
| `unauthenticated` | `UNAUTHENTICATED` |
| `invalid-argument` | `VALIDATION_FAILED` |
| `not-found` | `MEMBERSHIP_NOT_FOUND` |
| `failed-precondition` | `ACCOUNT_REQUIRED`, `PERSON_REQUIRED`, `PERSON_INCOMPATIBLE`, `GROUP_INCOMPATIBLE`, `MEMBERSHIP_NOT_ACTIVE`, `MEMBERSHIP_SEASON_NOT_MODIFIABLE`, `INCOMPATIBLE_STATE` |
| `aborted` | `IDEMPOTENCY_CONFLICT`, `CONFLICT` |
| `unavailable` | `DEPENDENCY_UNAVAILABLE` |
| `internal` | `INTERNAL_ERROR` |

Cada mensaje público es fijo, no incluye IDs ni causas. Errores desconocidos se convierten en `internal` + `INTERNAL_ERROR`; los detalles técnicos quedan sólo en observabilidad server-side sanitizada.

## 16. Persistencia y schemas afectados

### 16.1 Reutilización

- `memberships/{membershipId}`: raíz v1/v3 activa a v3 finalizada según E2-09.
- `memberships/{membershipId}/validityPeriods/{periodId}`: cierre del período vigente v1.
- `activeMembershipGuards/{personGroupGuardId}`: eliminación del guard correlacionado.
- `membershipLifecycleGuards/{personGroupGuardId}`: creación v2 con `membershipId`, `personId`, `groupId`, `seasonId`, `lastActivationOrdinal`, `finalizedAt` y `lifecycleGuardVersion: 2`.

### 16.2 Nueva coordinación técnica mínima

`membershipSelfExitIntents/{intentId}` usa schema cerrado v1:

| Campo | Valor |
| --- | --- |
| `userId` | UID derivado del token |
| `personId` | Persona propia derivada |
| `membershipId` | Membresía objetivo |
| `groupId` | Grupo correlacionado |
| `seasonId` | Temporada de la raíz confirmada |
| `activationOrdinal` | activación cerrada |
| `idempotencyKeyHash` | SHA-256 con separación de dominio; nunca clave cruda |
| `requestHash` | hash canónico del comando: versión contractual, actor, Persona y Grupo |
| `status` | `confirmed` |
| `outcome` | `EXIT_CONFIRMED` |
| `actorWasOwner` | boolean derivado del Grupo en la transacción |
| `createdAt` | timestamp autoritativo de creación del intent |
| `finalizedAt` | mismo timestamp autoritativo usado por raíz/período/lifecycle |
| `completedAt` | timestamp autoritativo de confirmación; coincide con `finalizedAt` en v1 |
| `intentVersion` | `1` |

`intentId` es el SHA-256 hexadecimal del encoding length-prefixed de `['sportexa:E2-10:membership-self-exit-intent:v1', userId, idempotencyKey]`. `idempotencyKeyHash` aplica el mismo algoritmo a `['sportexa:E2-10:membership-self-exit-key:v1', userId, idempotencyKey]`. `requestHash` lo aplica a `['sportexa:E2-10:membership-self-exit-request:v1', 'contract-v1', userId, personId, groupId]`. Tras resolver el active guard, el intent fija además `membershipId`, `seasonId` y `activationOrdinal`; esos campos no provienen del cliente. La misma clave reutilizada para otro Grupo o tras cambiar la Persona produce `IDEMPOTENCY_CONFLICT`.

El intent se crea sólo junto con un cierre confirmado; `status: confirmed` es terminal y equivale a intención consumida. Permanece inmutable y durable, sin TTL ni borrado durante el horizonte funcional de retries. Una política futura sólo podrá archivarlo si conserva un índice/tombstone consultable por el mismo `intentId` y el mismo resultado; no puede habilitar la reutilización de la clave. Esto impide que un retry viejo cierre una reactivación posterior. El intent no contiene motivo, snapshot personal ni historia deportiva.

No se agregan índices: el comando usa referencias deterministas y consultas ya existentes de integridad con `limit(2)`.

## 17. Idempotencia

- primera clave + request válidos: confirma `EXIT_CONFIRMED` y conserva el intent;
- misma clave + mismo request: valida el intent cerrado y devuelve el mismo `EXIT_CONFIRMED` desde sus campos persistidos, sin exigir que la raíz siga finalizada ni realizar escrituras;
- misma clave + request distinto: `IDEMPOTENCY_CONFLICT`;
- doble envío concurrente con misma clave: converge a un único período cerrado, lifecycle guard e intent;
- claves diferentes contra la misma activación: sólo una confirma; la perdedora, tras relectura autoritativa del cierre ajeno, devuelve `MEMBERSHIP_NOT_ACTIVE` y no crea intent ni se atribuye el efecto;
- retry tras respuesta perdida: recupera el intent confirmado;
- retry viejo tras reactivación: devuelve el cierre histórico del ordinal almacenado y no toca el período actualmente abierto;
- nueva salida después de una reactivación: exige nueva confirmación humana y nueva clave; crea otro intent para el nuevo ordinal.

El intent no reemplaza los Períodos de Vigencia como historia funcional. Su referencia a ordinal y timestamp sólo prueba qué efecto idempotente debe recuperarse.

## 18. Concurrencia y unidad de consistencia

La unidad de consistencia modificada sigue siendo una Membresía. Firestore puede almacenar en la misma transacción la raíz, su entidad interna, guards e intent técnico sin incorporar Grupo o Temporada al Agregado. Cuenta, Persona, Grupo, open guard y Temporada se releen sólo como contexto; no se escriben. No existe transacción global con Solicitud, Temporada, Grupo u otro Aggregate Root.

La transacción debe leer antes de escribir:

- intent determinista;
- Cuenta propia, vínculo `users/{uid}.personaId` y Persona exacta compatibles;
- active/lifecycle guards deterministas Persona–Grupo;
- raíz por el `membershipId` resuelto desde el active guard;
- consultas `active` y `finalized` con `limit(2)`;
- primer y último período y consulta de abiertos cuando corresponda;
- Grupo exacto;
- open guard y Temporada exacta.

Carreras obligatorias:

- **salida/salida, misma clave:** una confirmación y un resultado recuperado;
- **salida/salida, claves distintas:** un solo cierre;
- **salida/CU-027:** si E2-10 confirma primero, CU-027 observa la raíz finalizada según su contrato; si CU-027 confirma primero, E2-10 devuelve `MEMBERSHIP_NOT_ACTIVE` y no crea un intent que se atribuya el cierre ajeno;
- **salida/reactivación o aprobación E2-09:** una reactivación sólo puede seguir a un cierre confirmado; la serialización sobre raíz, período y guards produce o bien salida del ordinal N seguida de reactivación N+1, o rechazo/superación según E2-09. Un retry del intent N sólo recupera N y jamás cierra N+1;
- **salida después de finalización ajena:** sin intent E2-10 correlacionado devuelve `MEMBERSHIP_NOT_ACTIVE`; no convierte el lifecycle guard en historial de decisiones ni reclama el efecto;
- **salida/cierre de Temporada:** ambas releen Temporada y open guard; o E2-10 confirma antes del cierre o, si el cierre confirma primero, E2-10 devuelve `MEMBERSHIP_SEASON_NOT_MODIFIABLE` sin escribir;
- **salida/transferencia de ownership:** no hay conflicto funcional; ownership no autoriza la salida y se preserva cualquiera sea el orden. `actorWasOwner` refleja el orden serializado observado por E2-10 y no altera el resultado.

No existe transacción compartida con Solicitud ni rollback de una reactivación o cierre válidos ajenos.

En ningún orden la operación cierra dos períodos, abre un período de activación, borra historia, afecta un ordinal posterior ni modifica Grupo, Solicitud o Temporada. La única creación de documento de Período admitida es la materialización compatible del período 1 de una raíz activa v1, usando exclusivamente su `fechaIngreso` autoritativa y dejándolo cerrado en el mismo commit; no representa una activación nueva. Para v3 siempre se actualiza exactamente el Período abierto existente.

## 19. Guards o coordinaciones necesarios

Se reutilizan:

- active guard v1/v2 para unicidad y activación vigente;
- lifecycle guard v2 para la finalización actual;
- open season guard para demostrar la precondición normativa de Temporada abierta exacta.

Se agrega sólo `membershipSelfExitIntents` para identidad durable del comando. No se agrega Saga, outbox, cola, lock global, guard de Owner, cron, TTL ni coordinador multi-Agregado.

La implementación puede extraer un store de transición self-scoped o parametrizar la persistencia existente, pero no debe debilitar la validación owner/self de E2-05 ni duplicar `finalizeMembership`.

## 20. Compatibilidad v1/v2/v3

- activa v1 íntegra: se materializa período 1 desde `fechaIngreso`, se lo cierra con timestamp de servidor y la raíz pasa atómicamente a finalizada v3;
- activa v3 íntegra: se cierra el último período abierto, se conserva `periodCount` y la raíz queda finalizada v3;
- finalizada v2 o v3: el intent de la misma clave y `requestHash` devuelve el resultado persistido; la misma clave con otro hash devuelve `IDEMPOTENCY_CONFLICT`; sin intent E2-10 correlacionado devuelve `MEMBERSHIP_NOT_ACTIVE` y no se atribuye una finalización ajena;
- readers E2-03/E2-04/E2-05/E2-07/E2-09 deben continuar tolerando las combinaciones aprobadas;
- los readers nunca migran, reparan ni escriben documentos;
- no se ejecuta migración global ni backfill;
- no se inventan fechas desde `createdAt`, logs, guards o intents;
- documentos cruzados o incompatibles fallan cerrados;
- una reactivación posterior continúa exclusivamente bajo E2-09, con nueva Solicitud/decisión y nuevo ordinal; E2-10 no reactiva ni renueva;
- el DTO de listado E2-04 conserva sus IDs y agrega únicamente `group.viewerIsOwner: boolean`, calculado desde el UID autenticado y el Grupo vigente para elegir la advertencia de confirmación; no expone `ownerId`, roles, permisos, `periodCount` ni Períodos de Vigencia, y el booleano no autoriza la escritura.

## 21. Reglas Firestore y seguridad

- `memberships`, `validityPeriods`, active guards y lifecycle guards conservan deny-all para lectura/escritura cliente.
- `membershipSelfExitIntents/{intentId}` debe declarar deny-all explícito para visitante, autenticado, integrante, Owner y global admin.
- el frontend accede sólo mediante callable.
- Admin SDK no sustituye autorización: el Servicio de Aplicación deriva y valida actor/Persona antes de persistir.
- ninguna regla admite `users.roles`, arrays legacy o ownership como permiso para esta operación.
- no se amplía lectura pública ni privada de Grupo, Persona o Membresía.

## 22. Readers, DTO y frontend

### 22.1 Readers y DTO

Se conserva `listMyCurrentGroupMemberships`, su orden, cursor y paginación. Su item evoluciona de forma aditiva para incluir `group.viewerIsOwner: boolean`; `membership.id` y `membership.seasonId` continúan siendo informativos y no se reenvían al comando. La acción envía sólo `group.id` y la clave. Antes de confirmar, el backend vuelve a resolver identidad, Membresía, Temporada e integridad; el DTO nunca concede autoridad.

El resultado de salida es un DTO de efecto separado y mínimo. No se incorpora historia, períodos, Persona ni atributos administrativos al listado.

### 22.2 Frontend

La única nueva superficie canónica se agrega a `MyCurrentGroupMembershipsSection`:

- botón “Salir del Grupo” por Membresía activa visible;
- diálogo `alertdialog` con nombre/descripción accesibles;
- explicación de historia conservada y nueva Solicitud posterior;
- si `group.viewerIsOwner` es verdadero, advertencia inequívoca: “Vas a dejar de integrar el Grupo, pero seguirás siendo Owner y podrás administrarlo”; jamás lenguaje de abandono de propiedad;
- cancelar sin invocación;
- single-flight y control de doble click;
- clave estable durante retry de resultado incierto;
- renovación de clave sólo cuando la Persona, después de un estado autoritativo nuevo, realiza otra confirmación humana; nunca por timeout, remount, error o retry;
- ausencia de actualización optimista;
- éxito seguido de reconsulta autoritativa desde la primera página;
- error diferenciado, foco de retorno, región anunciable, Escape, teclado y controles de al menos 44 px;
- verificación responsive en 360 px, 768 px y escritorio.

La acción no se agrega a un roster, detalle administrativo ni pantalla de roles. La sección Owner E2-05 permanece operativa y no se fusiona con la sección member-scoped.

## 23. Tratamiento del legado

E2-08 preservó la rama `POST /groups/{groupId}/join` exclusivamente para salida por arrays, pero `/join` también nombra la superficie compartida y todavía autorizada `/join/groups/[groupId]` para preview, creación, consulta y cancelación de Solicitudes E2-06/E2-09. E2-10 retira sólo el writer de salida y conserva la infraestructura compartida:

| Archivo o consumidor inspeccionado | Disposición | Alcance exacto |
| --- | --- | --- |
| `volley-ranking-system/functions/src/httpApi.js` | `adaptar` | retirar sólo `handleLeaveGroup` y el dispatch `POST /groups/{groupId}/join`; conservar el export HTTP `api`, lecturas públicas, alta/baja administrativa, administración y restantes endpoints |
| `volley-ranking-frontend/src/app/api/groups/[groupId]/join/route.ts` | `retirar` | el archivo sólo proxifica el POST de salida; no conserva otra conducta autorizada |
| `volley-ranking-frontend/src/app/(public)/groups/page.tsx` | `adaptar` | retirar `leaveGroup`, su botón/estado y llamada al BFF; conservar listado público y enlace `/join/groups/[groupId]` de Solicitudes |
| `volley-ranking-frontend/src/app/(protected)/profile/groups/page.tsx` | `adaptar` | retirar `leaveGroup`, su botón/estado y llamada al BFF; conservar las lecturas y navegación legacy todavía fuera del corte |
| `volley-ranking-frontend/src/app/(protected)/join/groups/[groupId]/page.tsx` y `volley-ranking-frontend/src/components/groupJoinRequests/GroupJoinRequestCandidate.tsx` | `conservar` | superficie canónica E2-06/E2-09; no ejecuta salida por `memberIds` |
| `volley-ranking-frontend/src/services/groupJoinRequestsService.ts`, `PendingGroupJoinRequestsSection.tsx` y callables `getKnownGroupJoinPreview`, `createMyGroupJoinRequest`, `getMyCurrentGroupJoinRequest`, `cancelMyGroupJoinRequest`, `listPendingGroupJoinRequestsForOwnedGroup`, `approveGroupJoinRequest`, `rejectGroupJoinRequest`, `getGroupJoinRequestDecisionResult` | `conservar` | preview, crear, consultar, cancelar, aprobar, rechazar y recuperar decisiones E2-06/E2-09 |
| `handleGroupMemberAdd`, `handleGroupMemberRemoval`; BFF `members/[userId]/add`, `members/[userId]/remove`, `members/search`; ramas/BFF `admin-request` y `admin-requests` | `fuera de alcance` | alta/baja de terceros y administración legacy no se reinterpretan como CU-009 |
| `functions/src/services/tournamentRegistrationService.js`, callables `createMatch.js`/`eliminarMatch.js`, `TournamentEntryDetail.tsx`, `RegisterTournamentModal.tsx`, `tournamentRegistrationHelpModal.tsx` y `services/tournaments/tournamentQueries.ts` | `fuera de alcance` | lectores/writers de Torneos/Partidos que aún consumen `memberIds`, sin reemplazo en E2-10 |
| `legacyJoinRetirementArchitecture.test.js` y `legacyJoinRetirementE2.test.js` | `adaptar` | reemplazar expectativas de preservación de salida por ausencia/404 y cero escrituras, conservando regresiones de Solicitudes, administración y Torneos |

Tras retirar el dispatch, el upstream responde el `404` común a `POST /groups/{groupId}/join`; el BFF específico deja de existir. No se redirige esa ruta al callable porque el contrato legacy identifica Usuario/arrays y carece de clave idempotente. No se elimina la ruta de página `/join/groups/[groupId]`, el HTTP API completo ni el BFF de ninguna capacidad compartida.

No se borran, modifican, adoptan ni limpian valores existentes de `memberIds`, `adminIds`, `admins`, `pendingRequestIds` o `pendingAdminRequestIds`. Se preservan solicitudes administrativas, aprobación/rechazo canónicos y toda capacidad ajena. La retirada debe demostrar cero caminos de salida propia que escriban esos arrays.

## 24. Observabilidad mínima

Registrar sólo:

- operación `membership.self-exit`;
- etapa sanitizada: `account`, `person`, `transaction`, `authoritative-reread`, `dto` o `callable`;
- outcome/reason estable;
- número de intento transaccional y clasificación de contención;
- identificadores correlacionables únicamente en forma hash o ya técnica según el patrón E2-09.

No registrar clave de idempotencia cruda, UID, `personId`, nombre, email, payload completo, paths, documentos, períodos, stack en respuesta ni datos legacy. Los errores inesperados se registran server-side con causa encadenada y se responden como `INTERNAL_ERROR`.

## 25. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Retry viejo cierra una reactivación nueva | intent durable por actor/clave, ordinal confirmado y recuperación sin escritura |
| Salida de Membresía ajena | el cliente no envía `membershipId`; Persona derivada + `groupId` resuelven el active guard y toda correlación es transaccional |
| Pérdida de historia | reutilizar finalización v3 y Períodos de Vigencia en la misma transacción |
| Doble cierre concurrente | active/lifecycle guards, intent y relectura autoritativa |
| Cierre contra Temporada cerrada o stale | leer open guard + Temporada exacta dentro de la transacción |
| Confundir salida con expulsión | actor siempre self-person; no aceptar Persona o membresía de terceros |
| Alterar ownership al salir un Owner | cero escrituras a Grupo y prueba explícita de ownership preservado |
| Nueva doble autoridad | retirar writer `/join`; pruebas estáticas y Emulator de cero arrays |
| Convertir intent en historia funcional | resultado se valida contra raíz/período; Membresía continúa como fuente de verdad |
| Expandir frontend a roster/administración | inventario vinculante y montaje exclusivo en sección member-scoped |

## 26. Rollback

Antes de cualquier deploy, el rollback documental o de implementación futura será por revert explícito y revisado, sin rebase, reset, force push ni doble escritura.

Si el incremento hubiera sido desplegado:

- no se restaurará el writer legacy de arrays como fallback;
- podrá ocultarse temporalmente la acción y deshabilitarse el callable mientras se aplica una corrección forward-compatible;
- el código anterior E2-09 ya comprende raíces y períodos v3, por lo que las Membresías finalizadas siguen legibles;
- los intents v1 permanecen deny-all e ignorados, sin limpieza destructiva;
- no se reabre un Período de Vigencia ni se deshace una salida válida;
- los datos Emulator se retiran sólo por IDs de fixture registrados, nunca borrando colecciones completas.

## 27. Pruebas unitarias, contractuales, Emulator y frontend

### 27.1 Dominio y persistencia

- activa v1 y activa v3 finalizan correctamente;
- períodos previos son inmutables y sólo se cierra el abierto;
- `fechaIngreso`, `fechaEgreso`, `endedAt` y guards mantienen correlación;
- cero/dos períodos abiertos, guards coexistentes, duplicados u huérfanos fallan cerrados;
- mismo intent no agrega períodos; nueva activación + nueva intención cierra el ordinal nuevo;
- retry viejo tras reactivación no escribe.

### 27.2 Contratos y aplicación

- objeto plano cerrado `{ groupId, idempotencyKey }`; límites y patrón exactos; rechazo de campos extra, `membershipId`, `seasonId` e identidades/autoridad cliente;
- autenticación, Cuenta y Persona requeridas;
- salida exitosa de integrante no Owner;
- Membresía propia ausente o ya finalizada sanitizada; ningún `groupId` permite alcanzar Membresías ajenas;
- Owner con Membresía puede salir y conserva ownership; Owner sin Membresía no puede;
- Temporada exacta abierta requerida para la primera confirmación; Temporada cerrada rechazada por RF-20 sin modificarla ni modificar la Membresía;
- intent confirmado recuperable aun si luego cambian Temporada, ownership o estado vigente;
- errores y códigos HTTPS estables.

### 27.3 Emulator y concurrencia

- primera salida, doble envío, respuesta perdida y retry;
- retry idéntico, misma clave con payload distinto y claves distintas contra la misma activación;
- salida frente a CU-027, reactivación/aprobación E2-09, transferencia de ownership y cierre de Temporada;
- salida cuando otra operación ya finalizó, y retry del intent anterior después de una reactivación;
- activa v1 y v3 con uno y varios ciclos;
- Temporada abierta exitosa y Temporada cerrada rechazada según RF-20;
- inspección exacta de raíz, períodos, guards e intent;
- cero escrituras a Grupo, Persona, Temporada, Solicitud, arrays, Actividad, alertas y notificaciones;
- reglas deny-all para intent y recursos de Membresía;
- endpoint/BFF legacy ausentes o 404, sin escritura.

### 27.4 Frontend y arquitectura

- máquina de estado de confirmación, single-flight, retry estable y reconsulta;
- cancelar produce cero llamada;
- mensajes de salida voluntaria sin lenguaje de expulsión;
- advertencia Owner derivada de `viewerIsOwner`, ownership preservado y ausencia de controles de terceros;
- teclado, foco, anuncios y responsive;
- sin Firestore directo;
- un único Aggregate Root, sin repositorio de Períodos ni imports privados de Agregados externos;
- ausencia de `memberIds`, `adminIds`, `roles`, Plan y Suscripción en el módulo nuevo;
- regresión de E2-01 a E2-09, en especial listado, finalización Owner y reactivación.

## 28. UAT manual recorrible

La UAT futura se ejecutará sólo con Auth, Firestore y Functions Emulator, loopback, proyecto `demo-*` y fixtures sintéticos por IDs explícitos. El recorrido básico obligatorio, completo desde UI y actuado por una integrante B no Owner, es:

1. B solicita ingresar al Grupo desde `/join/groups/[groupId]` y el Owner aprueba.
2. B ve la Membresía activa en “Grupos que integrás”.
3. B abre “Salir del Grupo”, verifica la confirmación y confirma.
4. B comprueba por reconsulta/recarga que la Membresía dejó de aparecer como activa y que el éxito provino del resultado persistido.
5. B vuelve a solicitar ingreso con una decisión humana nueva.
6. El Owner aprueba y E2-09 reactiva la misma raíz con el ordinal siguiente.
7. B vuelve a salir con nueva confirmación y nueva clave; se cierra sólo el ordinal nuevo.
8. Se repite el retry de la primera salida y se comprueba que sólo recupera su outcome histórico, sin alterar ni atribuirse la segunda activación/salida.

Además, la UAT manual cubre cancelación sin llamada, estado cargando, doble click, retry conservando clave, error recuperable, Owner con Membresía y advertencia de ownership preservado, Owner sin Membresía, usuario sin Persona, teclado, Escape, foco, anuncios y 360/768/escritorio. La inspección persistente confirma raíz v3, un único período cerrado por salida, guards correlacionados, intents separados por ordinal y ausencia de cambios en Grupo, Temporada, Solicitud, Persona, Cuenta, arrays, Actividad y notificaciones.

Los casos de activa v1, Membresía inexistente/ya finalizada, payload conflictivo, schemas desconocidos, Temporada cerrada, carreras con CU-027/E2-09/transferencia/cierre de Temporada, claves concurrentes y deny-all pueden acreditarse mediante pruebas unitarias y Emulator. El flujo básico de ocho pasos no puede sustituirse por fixture ni aceptarse sólo por automatización.

Esta UAT vuelve recorrible sin fixture el ciclo que E2-09 sólo pudo acreditar automatizadamente: incorporación → salida propia → nueva Solicitud → reactivación. No reabre ni reejecuta la UAT cerrada de E2-09.

## 29. Inventario exacto de archivos candidatos

El inventario es vinculante por responsabilidad. `crear` habilita un archivo nuevo, `adaptar` limita un archivo existente a los cambios indicados, `conservar` exige no retirar la capacidad y `fuera de alcance` prohíbe intervenir por E2-10. Cualquier ruta adicional durante implementación deberá justificarse en revisión.

### 29.1 Backend Functions

| Archivo | Disposición candidata |
| --- | --- |
| `volley-ranking-system/functions/callables/leaveMyGroupMembership.js` | `crear`: callable delgado exacto |
| `volley-ranking-system/functions/index.js` | `adaptar`: exportar el callable; conservar el export compartido `api` |
| `volley-ranking-system/functions/src/memberships/application/membershipContract.js` | `adaptar`: agregar `{ groupId, idempotencyKey }` cerrado |
| `volley-ranking-system/functions/src/memberships/application/membershipDto.js` | `adaptar`: DTO de efecto y `group.viewerIsOwner` en el item propio |
| `volley-ranking-system/functions/src/memberships/application/membershipErrors.js` | `adaptar`: agregar dos reasons acotados |
| `volley-ranking-system/functions/src/memberships/application/membershipObservability.js` | `adaptar`: reconocer operación/etapas sin PII |
| `volley-ranking-system/functions/src/memberships/application/membershipService.js` | `adaptar`: coordinar salida self-person y flag Owner del reader |
| `volley-ranking-system/functions/src/memberships/infrastructure/membershipCallable.js` | `adaptar`: mapear nuevos reasons HTTPS |
| `volley-ranking-system/functions/src/memberships/infrastructure/membershipModule.js` | `adaptar`: cablear store y capacidades públicas |
| `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipSelfExitStore.js` | `crear`: transición e intent en una transacción |
| `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipRepository.js` | `conservar`; `adaptar` sólo si falta una lectura exacta encapsulada ya exigida |
| `volley-ranking-system/functions/src/memberships/infrastructure/firestoreActiveMembershipGuard.js` | `conservar`: reutilizar ID, hidratación y correlación; sin cambiar autoridad |
| `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipLifecycleGuard.js` | `conservar`: reutilizar schema/correlación; no duplicar transición de dominio |
| `volley-ranking-system/functions/src/groups/public/groupJoinRequestGroupCapability.js` | `adaptar`: extraer/generalizar contexto exacto y `viewerIsOwner`, sin ampliar datos públicos |
| `volley-ranking-system/functions/src/groups/public/groupJoinRequestSeasonCapability.js` | `adaptar`: extraer/generalizar validación de Temporada/open guard exactos |
| `volley-ranking-system/functions/src/httpApi.js` | `adaptar`: retirar sólo `handleLeaveGroup` y dispatch `POST /groups/{groupId}/join` |

`membership.js` y `membershipValidityPeriod.js` deben reutilizarse sin cambio funcional salvo que una prueba demuestre una brecha real; no se crea otra operación de dominio.

### 29.2 Pruebas backend

| Archivo | Disposición candidata |
| --- | --- |
| `volley-ranking-system/functions/test/unit/membershipContract.test.js` | `adaptar`: contrato self-exit |
| `volley-ranking-system/functions/test/unit/membershipService.test.js` | `adaptar`: actor, precondiciones y resultados |
| `volley-ranking-system/functions/test/unit/membershipCallable.test.js` | `adaptar`: identidad y errores HTTPS |
| `volley-ranking-system/functions/test/unit/membershipObservability.test.js` | `adaptar`: sanitización |
| `volley-ranking-system/functions/test/unit/membershipArchitecture.test.js` | `adaptar`: límites, frontend y retiro legacy |
| `volley-ranking-system/functions/test/unit/membershipSelfExitStore.test.js` | `crear`: schemas, intent, transición y recuperación |
| `volley-ranking-system/functions/test/unit/membershipSelfExitMachine.test.js` | `crear`: máquina frontend |
| `volley-ranking-system/functions/test/unit/legacyJoinRetirementArchitecture.test.js` | `adaptar`: sustituir preservación de salida por ausencia y conservar el resto |
| `volley-ranking-system/functions/test/emulator/membershipSelfExitE2.test.js` | `crear`: E2-10, reglas y carreras |
| `volley-ranking-system/functions/test/emulator/membershipReactivationE2.test.js` | `adaptar`: regresión salida–Solicitud–reactivación |
| `volley-ranking-system/functions/test/emulator/legacyJoinRetirementE2.test.js` | `adaptar`: 404/cero arrays y regresión de capacidades preservadas |

### 29.3 Frontend

| Archivo | Disposición candidata |
| --- | --- |
| `volley-ranking-frontend/src/services/membershipsService.ts` | `adaptar`: callable, tipos de resultado y mensajes |
| `volley-ranking-frontend/src/types/MyCurrentGroupMembership.ts` | `adaptar`: agregar `group.viewerIsOwner: boolean` |
| `volley-ranking-frontend/src/components/memberships/MyCurrentGroupMembershipsSection.tsx` | `adaptar`: acción, advertencia Owner, diálogo, retry y reconsulta |
| `volley-ranking-frontend/src/components/memberships/membershipSelfExitMachine.mjs` | `crear`: estado e intención estable |
| `volley-ranking-frontend/src/components/memberships/membershipSelfExitMachine.d.mts` | `crear`: tipos de la máquina |
| `volley-ranking-frontend/src/app/api/groups/[groupId]/join/route.ts` | `retirar`: BFF exclusivo de salida legacy |
| `volley-ranking-frontend/src/app/(public)/groups/page.tsx` | `adaptar`: retirar sólo helper/botón legacy de salida; conservar listado y enlace de ingreso |
| `volley-ranking-frontend/src/app/(protected)/profile/groups/page.tsx` | `adaptar`: retirar sólo helper/botón legacy de salida; preservar resto |
| `volley-ranking-frontend/src/app/(protected)/join/groups/[groupId]/page.tsx` | `conservar`: entrada E2-06/E2-09 |

`OwnMembershipSection.tsx`, `finalizeMyMembershipForOwnedGroup` y la superficie E2-05 se conservan sin fusionarse con CU-009.

### 29.4 Infraestructura

| Archivo | Disposición candidata |
| --- | --- |
| `volley-ranking-system/firestore.rules` | `adaptar`: deny-all explícito para `membershipSelfExitIntents` |
| `volley-ranking-system/firestore.indexes.json` | `conservar`: sin índices nuevos previstos |

No se modifican dependencias, lockfiles, Firebase config, scripts de deploy, documentos anteriores ni archivos Auth/UAT.

## 30. Criterios de aceptación Dado/Cuando/Entonces

1. **Dado** una Persona con Membresía propia activa v3 y Temporada exacta abierta, **cuando** confirma la salida, **entonces** la misma raíz queda finalizada, se cierra un solo período y no cambia otro Agregado.
2. **Dado** una activa v1 íntegra, **cuando** sale, **entonces** evoluciona a v3 sin inventar fechas y el primer período queda reconstruido/cerrado atómicamente.
3. **Dado** un `groupId` sin Membresía activa de la Persona propia, **cuando** el actor intenta salir, **entonces** recibe `MEMBERSHIP_NOT_FOUND`; el contrato no admite un `membershipId` ajeno ni permite enumerar Membresías.
4. **Dado** un Owner con Membresía propia, **cuando** sale, **entonces** conserva ownership y administración del Grupo.
5. **Dado** un Owner sin Membresía, **cuando** intenta salir, **entonces** no se crea ni finaliza relación alguna.
6. **Dado** el mismo intent enviado dos veces, **cuando** ambas solicitudes compiten, **entonces** existe un solo cierre, lifecycle guard e intent y ambas convergen al mismo efecto.
7. **Dado** la misma clave con payload distinto, **cuando** se reintenta, **entonces** se devuelve `IDEMPOTENCY_CONFLICT` sin escritura.
8. **Dado** una respuesta perdida después del commit, **cuando** se reintenta, **entonces** se recupera el mismo `EXIT_CONFIRMED`.
9. **Dado** una salida confirmada y una reactivación posterior, **cuando** llega un retry viejo, **entonces** recupera el cierre anterior y no modifica la activación nueva.
10. **Dado** una reactivación posterior, **cuando** la Persona confirma otra salida con nueva clave, **entonces** se cierra exclusivamente el nuevo ordinal.
11. **Dado** una Temporada cerrada, cambiada o incompatible, **cuando** se intenta la primera salida, **entonces** no se modifica la Membresía y se devuelve un error estable sanitizado.
12. **Dado** estado parcial, duplicado o guard/período incompatible, **cuando** se intenta salir, **entonces** falla cerrado sin reparar ni adoptar.
13. **Dado** una salida confirmada, **cuando** la Persona inicia una nueva Solicitud, **entonces** E2-10 no la crea automáticamente y los contratos E2-06/E2-09 determinan su resultado.
14. **Dado** una nueva Solicitud en la misma Temporada abierta, **cuando** el Owner aprueba, **entonces** E2-09 reactiva la misma Membresía y conserva la salida anterior.
15. **Dado** una nueva Solicitud con Temporada cerrada o distinta, **cuando** se intenta aprobar, **entonces** no se renueva ni reactiva automáticamente.
16. **Dado** el flujo E2-10, **cuando** termina o falla, **entonces** no escribe `memberIds`, `adminIds`, `admins`, `pendingAdminRequestIds`, Solicitud, notificaciones, alertas ni Actividad.
17. **Dado** el release E2-10, **cuando** se invoca la antigua salida `/join`, **entonces** no existe camino que modifique arrays y el frontend no ofrece sus botones.
18. **Dado** la UI member-scoped, **cuando** se cancela, confirma, reintenta o navega por teclado, **entonces** mantiene foco, anuncios, single-flight y estado autoritativo.

## 31. Dependencias futuras desbloqueadas

- recorrido humano completo de salida → nueva Solicitud → reactivación dentro de la misma Temporada abierta;
- eliminación definitiva del writer legacy de salida sobre `memberIds`;
- UAT futura de reactivaciones múltiples sin fixture administrativa;
- definición separada de roster canónico con foco exclusivo en lectura/privacidad;
- definición separada de finalización administrativa por Owner con selección inequívoca;
- retiro posterior de otros consumidores de pertenencia legacy por flujo;
- base más limpia para CU-029, sin confundir salida/reactivación con renovación.

E2-10 no desbloquea por sí solo expulsión, roles ni renovación: sólo elimina la dependencia de una fixture para que una Persona finalice voluntariamente su propia relación.

## 32. Decisiones pendientes

No quedan decisiones pendientes ni bloqueantes. Los nombres privados de helpers, la distribución interna de pruebas y ajustes de microcopy son detalles reversibles de implementación que no cambian el significado funcional, la autorización, los schemas públicos ni los límites de Agregado y, por lo tanto, no se registran como decisiones pendientes.

## Declaración final

E2-10 queda definido como una sola capacidad: salida voluntaria de la Membresía propia. Mantiene Membresía como fuente de verdad, reutiliza la finalización v3 y los Períodos de Vigencia, selecciona la relación sólo desde Persona propia + `groupId`, permite salir a integrantes Owner y no Owner por identidad propia, conserva ownership, exige nueva intención para cada activación, permite luego una nueva Solicitud explícita y retira únicamente el writer legacy equivalente. Por prohibición expresa de RF-20, la primera salida exige Temporada abierta; el retry de un resultado ya confirmado no.

No se mezclan roster, terceros, expulsión, baja administrativa, roles, renovación, notificaciones, administración general, migración ni deploy.

`E2-10 APROBADO — LISTO PARA VERSIONAR`
