# E2-15 — Ficha de cierre canónico de Temporada

## Estado

`APROBADA — LISTA PARA VERSIONAR`

La revisión final distingue las precondiciones autoritativas de CU-018, las invariantes internas que protege el Aggregate Root Membresía y la corrupción histórica preexistente fuera de esas autoridades. No se cambia la decisión normativa de bloqueo por Membresías activas ni se convierte a Temporada en auditor global de subentidades de otro Agregado.

## 1. Identificación

- **Incremento:** E2-15.
- **Caso de uso:** CU-018 — Cerrar una Temporada.
- **Rama de preparación:** `feat/e2-15-season-close`.
- **Base documental y de código inspeccionada:** `a721badc1ec7c307898d623b54c10251489b12f7`.
- **Resultado normativo seleccionado:** `CIERRE BLOQUEADO HASTA RESOLVER MEMBRESÍAS ACTIVAS`.
- **Alcance temporal:** cierre terminal de la única Temporada abierta de un Grupo y adaptación mínima de la apertura para permitir el ciclo N+1 sin perder la idempotencia histórica de N.

## 2. Objetivo

Implementar el cierre terminal, autorizado, idempotente y transaccional de la Temporada abierta de un Grupo. El cierre debe preservar toda la historia, liberar el único slot abierto y permitir una apertura posterior, pero sólo después de demostrar que no queda una Membresía activa, un Período de Vigencia abierto representable por un Agregado válido ni una coordinación de aprobación capaz de crear o reactivar una Membresía.

El incremento no finaliza Membresías, no decide Solicitudes pendientes, no renueva pertenencias y no fabrica un estado derivado que contradiga el estado persistido.

## 3. Fuentes, precedencia y citas determinantes

Se aplicó la precedencia aprobada: Documentos 1, 1.5 y 2; Documentos 3 y 4 con AUD-C05 y adendas; Documento 5; E2-14; cierres E2-02 a E2-13; correctivos de concurrencia; auditoría técnica; código de `dev` sólo como evidencia; historial Git.

### 3.1 Citas normativas exactas

| Fuente | Cita exacta | Consecuencia para E2-15 |
|---|---|---|
| Documento 1, §3.4 | “Una Temporada representa un ciclo operativo definido por el Owner del Grupo.” | Temporada es el límite temporal operativo del Grupo. |
| Documento 1, §3.4 | “Puede comenzar y finalizar en cualquier momento.” | El cierre no depende del año calendario ni exige una fecha civil aportada por el cliente. |
| Documento 1, §3.4 | “El historial nunca se elimina al cerrar una Temporada. Simplemente comienza un nuevo ciclo.” | No hay eliminación física ni sobrescritura histórica; debe quedar habilitable el ciclo N+1. |
| Documento 1.5, §2.3 | “Membresía constituye el contexto operativo de pertenencia y participación de una Persona dentro de ese Grupo.” | `activa` no puede reinterpretarse como una marca histórica carente de vigencia. |
| Documento 1.5, §2.10 | “La Membresía posee un ciclo de vida propio, determinado por su estado y por las fechas de ingreso y egreso.” | Estado y fechas deben converger; no es válido dejar `activa` sin salida definitiva. |
| Documento 2, PF-02 | “Una Temporada cerrada queda bloqueada para nuevas operaciones y modificaciones.” | El cierre es terminal y no admite mutaciones posteriores sobre la Temporada. |
| Documento 2, PF-02 | “No pueden crearse nuevas Membresías ni modificarse las existentes dentro de una Temporada cerrada.” | Una Membresía activa no podría finalizarse después del cierre. |
| Documento 2, PF-02 | “La reincorporación de una Persona después del cierre de una Temporada requiere una Membresía correspondiente a una nueva Temporada.” | CU-029 recibe una pertenencia anterior ya terminada y crea la participación de N+1; E2-15 no la renueva. |
| Documento 2, RF-17 | “El cierre de una Temporada bloquea de forma absoluta las nuevas operaciones y modificaciones sobre dicha Temporada.” | No se incorpora reapertura ni fase de corrección posterior. |
| Documento 2, RF-18 | “Una Temporada cerrada conserva la información registrada para consulta histórica.” | La raíz cerrada es inmutable y no se elimina. |
| Documento 2, RF-19 | “Las nuevas Membresías solo pueden crearse o renovarse para Temporadas abiertas.” | Toda activación debe revalidar el slot abierto dentro de su transacción. |
| Documento 2, RF-20 | “Una Membresía correspondiente a una Temporada cerrada no puede reactivarse ni modificarse.” | Cerrar con una Membresía activa congelaría un estado que ya no podría finalizarse. |
| Documento 2, CU-028 | “La reactivación solo puede realizarse mientras la Membresía corresponda a una Temporada abierta.” | Una reactivación y el cierre necesitan serialización común. |
| Documento 2, CU-029 | “La renovación genera una nueva participación de la Persona en una nueva Temporada y conserva la trazabilidad con la Membresía anterior y los registros históricos asociados a dicha participación.” | La entrada de CU-029 debe ser una Membresía anterior finalizada, no una raíz falsamente activa. |
| Documento 3 AUD-C05, página PDF 42 | “el cierre de una Temporada modifica exclusivamente el estado y la información propia correspondiente a su ciclo de vida” | Consultar Membresías como precondición no autoriza escribirlas desde cierre. |
| Documento 3 AUD-C05, página PDF 42 | “El cierre de Temporada no requiere modificar automáticamente los Agregados consumidores.” | Se descarta la finalización masiva, no la validación externa. |
| Documento 4 AUD-C05, página PDF 80 | “El cierre de una Temporada modifica exclusivamente el Agregado Temporada.” | La única raíz de dominio mutada por CU-018 es Temporada. |
| Documento 4 AUD-C05, página PDF 80 | “No deberá utilizarse una transacción distribuida para modificar automáticamente Membresías, Entrenamientos, Partidos, Pagos, Estadísticas, Actividad u otros Agregados como consecuencia del cierre.” | La coordinación masiva queda prohibida; el bloqueo estricto respeta el límite. |
| Documento 3, adenda AUD-C05, §4.1 | “una Membresía activa posee exactamente un Período de Vigencia abierto” | Raíz activa y Período abierto son una misma verdad de vigencia. |
| Documento 3, adenda AUD-C05, §4.1 | “una Membresía finalizada no posee Períodos de Vigencia abiertos” | El cierre sólo puede ocurrir cuando no quede ninguna raíz activa válida. |
| Documento 3, adenda AUD-C05, §4.2 | “Cada Período de Vigencia es una entidad interna subordinada al Agregado Membresía. No posee Aggregate Root, Repositorio, autorización, escritura, consulta, contrato público ni ciclo de vida independientes.” | CU-018 no consulta Períodos como autoridad paralela ni amplía el Agregado Temporada. |
| Documento 4, adenda AUD-C05, §3.1 | “una Membresía activa tiene exactamente un Período de Vigencia abierto” | `endedAt` ausente no puede quedar como resultado terminal de una pertenencia activa congelada. |
| Documento 4, adenda AUD-C05, §4 | “Las pruebas no deben imponer una representación física específica mientras puedan verificar estas invariantes y los límites del Agregado.” | AUD-C05 exige probar los writers y el Agregado Membresía; no ordena un barrido físico global desde CU-018. |
| E2-05, §27.1 | “RF-20 impide modificarla una vez cerrada, mientras la unicidad Persona–Grupo impide otra activa.” | La tensión estaba expresamente diferida al incremento de cierre y no constituye permiso para el estado inconsistente. |
| E2-10, precondiciones | La Temporada exacta debe continuar abierta para finalizar la Membresía. | CU-027 no recupera una Membresía activa después del cierre. |
| E2-12, cierre técnico | “Temporada cerrada antes del commit consume rechazo sin transición; un retry ya confirmado no exige Temporada abierta.” | La finalización nueva no puede ganar después del cierre; sólo se recupera un resultado ya confirmado. |

Las citas de las adendas se encuentran además en `docs/arquitectura/Documento-3-AUD-C05-aclaracion-periodos-vigencia.md:77-78` y `docs/arquitectura/Documento-4-AUD-C05-aclaracion-periodos-vigencia.md:58-59`. Las restricciones RF-17 a RF-20 están en Documento 2, página PDF 26; PF-02, en página PDF 13; CU-027 a CU-029, en página PDF 32.

### 3.2 Evidencia aprobada previa y evidencia actual

- E2-04 distingue una Membresía físicamente `activa` de su proyección operativa en el contexto abierto. Esa regla de lectura excluye una referencia fuera de la Temporada abierta; no autoriza a producir ni conservar indefinidamente un Agregado activo no finalizable.
- E2-05, E2-10 y E2-12 sólo finalizan si la Temporada exacta permanece abierta dentro de la transacción. E2-09 sólo reactiva dentro de esa misma Temporada abierta.
- E2-11 incluye en roster únicamente raíz activa, guard activo y Período abierto de la Temporada abierta actual. Por tanto, una raíz activa de una Temporada cerrada desaparecería del roster sin dejar de bloquear por guard la futura pertenencia Persona–Grupo.
- `activeMembershipGuards` tiene identidad determinista Persona–Grupo y contiene `seasonId`; expresa unicidad activa transversal a Temporadas. No es un guard por Temporada y bloquearía una activación en N+1.
- `pendingGroupJoinRequestGuards` tiene identidad Persona–Grupo y no contiene `seasonId`. Expresa una Solicitud pendiente al Grupo, no a una Temporada.
- El código actual de aprobación valida el contexto abierto en fase A para creación inicial, pero no para la rama de reactivación; la fase de activación sí lo valida. E2-15 debe cerrar esa ventana antes de crear o recuperar la coordinación.
- El rechazo actual relee ownership, Solicitud, pending guard, decision intent y coordinación dentro de su transacción; no exige Temporada abierta.

### 3.3 Base técnica de la serialización

Firestore garantiza aislamiento serializable por orden de commit y reintenta una transacción cuando cambia un documento leído. E2-15 no depende de que una consulta vacía proteja frente a phantoms: el documento común `openSeasonGuards/{groupId}` se lee dentro de toda transacción que pueda activar, finalizar o cerrar y el cierre lo elimina. Las consultas acotadas comprueban los bloqueos existentes; el guard común impide que aparezca una activación nueva con contexto obsoleto.

Referencias técnicas: documentación oficial de Firestore, “Transaction serializability and isolation” y “Transactions and batched writes”.

## 4. Contradicción evaluada y resolución

La proposición “cerrar sin modificar Membresías, no bloquear por activas y derivar inoperatividad” es contradictoria con el modelo aprobado:

1. `estado == "activa"` significa vigencia actual y exige exactamente un Período abierto.
2. El active guard afirma esa misma activación y reserva la pareja Persona–Grupo, también frente a otra Temporada.
3. RF-20 y los comandos E2-05/E2-10/E2-12 impiden finalizar después del cierre.
4. E2-11 dejaría de mostrarla, pero E2-06/E2-07/E2-09 seguirían encontrando el guard o la raíz activa y bloquearían ingreso/aprobación/renovación.
5. `endedAt` y `fechaEgreso` quedarían ausentes indefinidamente y CU-029 recibiría una pertenencia anterior aún activa.

La distinción E2-04 entre estado físico y operatividad contextual es válida para consultas defensivas, no como transición de ciclo de vida. Por ello el cierre consulta otros Agregados como precondición, pero no los modifica.

## 5. Matriz de alternativas

| Alternativa | Evaluación normativa | Evaluación técnica | Decisión |
|---|---|---|---|
| A — Bloqueo estricto | Preserva `activa` = vigencia, AUD-C05 y RF-20; obliga a finalizar mientras N sigue abierta. | Viable con lecturas acotadas y `openSeasonGuard` como serializador común; sin batch ni mutación distribuida. | **Seleccionada**. |
| B — Estado derivado inoperativo | E2-04 permite excluir de una proyección, pero ninguna autoridad transforma `activa`, Período abierto y active guard en historia terminada. | Readers y comandos divergirían; el guard bloquearía N+1 y el estado sería irrecuperable. | Rechazada. |
| C — Coordinación de cierre | Documento 3/4 asigna al cierre el cambio de la Temporada; no ordena finalizar Membresías automáticamente. | Mutación multiagregado no acotada, batch parcial y reintentos complejos; alcance desproporcionado. | Rechazada. |
| D — Estado `closing` | No existe en Documentos 1, 1.5, 2, AUD-C05 ni incrementos aprobados. | Añade recuperación, UX, timeouts y nuevas carreras sin necesidad: el slot abierto ya serializa una transacción corta. | Rechazada. |

Consultar otro Agregado no equivale a modificarlo. La precondición de cero activas preserva invariantes y se ejecuta dentro de la unidad transaccional del cierre.

## 6. Alcance

### 6.1 Incluido

- Transición terminal `abierta -> cerrada` de la Temporada exacta.
- Registro inmutable de `closedAt` y `closedBy`.
- Autorización por Cuenta y ownership vigente.
- Precondición estricta de ausencia de Membresías activas y coordinaciones de aprobación.
- Preservación de Membresías finalizadas, Períodos cerrados y lifecycle guards.
- Liberación atómica del slot `openSeasonGuards/{groupId}`.
- Recibo durable e idempotente del cierre.
- Separación entre exclusión del slot abierto y recibo durable de apertura.
- Compatibilidad y materialización del recibo de una apertura E2-02 v1 al cerrar.
- Adaptación mínima de apertura y de las capacidades que activan/finalizan para compartir el serializador.
- Acción frontend Owner-scoped y guía UAT de CU-018.

### 6.2 Exclusiones

- CU-019 e historial paginado: E2-16.
- CU-017 y edición general de Temporada: E2-17.
- CU-029, renovación e historia intertemporada, y porción aprobada de CU-010: E2-18.
- Reapertura, backdating o fecha efectiva aportada por cliente.
- Finalización, cancelación, rechazo o migración automática de otros Agregados.
- Nuevos roles administrativos, transferencia de ownership, edición de Membresía o Solicitud.
- Cambios en Partido, Torneo, Equipo, `matches`, `participations` o sus consumidores E4.
- Actualización del Documento 5, deploy, acceso remoto o cambios Auth/UAT.

## 7. Semántica terminal

1. La única transición es `estado: "abierta"` a `estado: "cerrada"`.
2. La transición ocurre en el commit atómico exitoso; `closedAt` es el instante UTC autoritativo del cierre y a la vez su timestamp técnico. No existe una fecha civil de cierre separada ni retroactiva.
3. `closedBy` es el UID de la Cuenta autenticada que era Owner vigente en el punto de serialización.
4. No existe reapertura. Un nuevo ciclo se representa mediante otra Temporada.
5. Después del cierre son inmutables todos los campos de la Temporada; se prohíbe eliminación física.
6. `nombre`, `fechaInicio`, `groupId`, `createdAt`, `closedAt`, `closedBy` y `schemaVersion` no se editan desde CU-018.
7. La nueva Temporada puede abrirse después del commit, no dentro del cierre.
8. Cerrar no crea ni modifica Persona, Grupo, Membresía, Período, Solicitud, Partido o Torneo.

## 8. Autorización

El callable exige, en este orden lógico y nuevamente dentro de la transacción:

- actor autenticado;
- Cuenta canónica compatible;
- Grupo canónico existente, activo y de schema soportado;
- `group.ownerId == auth.uid` en el commit;
- Temporada existente, compatible, perteneciente al Grupo y coincidente con el slot abierto.

No se exige Persona propia ni Membresía propia. Ser integrante, poseer rol global `admin` o claims globales no concede autoridad. `Cuenta != Persona != Owner != integrante` permanece explícito.

Una transferencia de ownership que escriba el Grupo obliga a reintentar la transacción: si gana antes, el Owner anterior recibe `NOT_AUTHORIZED`; si el cierre confirma primero, queda registrado el Owner válido en ese commit. Mientras no exista una capacidad pública de transferencia, el escenario es automatizado y preventivo.

## 9. Invariantes y precondiciones

### 9.1 Invariantes de Temporada

- Existe como máximo una Temporada abierta por Grupo.
- Una Temporada cerrada no vuelve a abrirse y nunca se elimina.
- Un guard presente correlaciona exactamente una Temporada abierta del mismo Grupo.
- Un Grupo sin guard no posee Temporada abierta.
- El cierre exacto y la liberación del slot son atómicos.

### 9.2 Precondición de Membresías

El cierre exige simultáneamente, pero no confunde, las siguientes autoridades:

- cero raíces `memberships` activas de **todo el Grupo**, no sólo de la Temporada que se cierra;
- cero `activeMembershipGuards` Persona–Grupo cuyo `groupId` sea el Grupo;
- cero coordinación de aprobación del Grupo capaz de crear o reactivar una Membresía.

No basta comprobar sólo la Temporada N: el active guard tiene identidad Persona–Grupo y una activa de otra Temporada impediría legítimamente una activación en N+1. Para un estado válido, raíz activa y active guard conducen al Agregado Membresía y permiten validar su único Período abierto. El Período continúa como entidad interna subordinada; no se consulta como autoridad independiente de CU-018.

### 9.3 Consultas autoritativas acotadas y clasificación

| Control | Colección, filtro y límite | Índice | Cardinalidad válida para cerrar / error | Máximo materializado | Interacción transaccional |
|---|---|---|---|---:|---|
| Q1 — raíz activa | `memberships`, `groupId == G`, `estado == "activa"`, `limit(1)` | `memberships(groupId ASC, estado ASC)` | `0`; una raíz íntegra de N: `ACTIVE_MEMBERSHIPS_EXIST`; de otra Temporada: `MEMBERSHIP_SEASON_INCOMPATIBLE`; schema/guard/Período alcanzable incompatible: reason específico o `INCOMPATIBLE_STATE` | 1 raíz + 1 guard + hasta 3 Períodos distintos, con máximo 4 lecturas de Período por posible solapamiento entre first/latest/query | Lee dentro del cierre. Una activación concurrente también lee el open guard que el cierre elimina. |
| Q2 — active guard residual | `activeMembershipGuards`, `groupId == G`, `limit(1)` | campo simple `groupId` | `0`; cualquier resultado con Q1 vacía: `MEMBERSHIP_ACTIVE_GUARD_INCOMPATIBLE` | 1 guard + su raíz referenciada | Lee dentro del cierre; guard huérfano, raíz no activa o Temporada distinta fallan cerrados. |
| Q3 — aprobación bloqueante | `groupJoinRequestApprovalCoordinations`, `groupId == G`, `limit(1)` | campo simple `groupId` | `0`; coordinación íntegra: `APPROVAL_IN_PROGRESS`; inválida/huérfana: `INCOMPATIBLE_STATE` | 1 coordinación + request e intent referenciados | Lee dentro del cierre; las fases que crean/usan coordinación releen el open guard antes de escribir activación. |
| Q4 — única Temporada abierta | `seasons`, `groupId == G`, `estado == "abierta"`, `limit(2)` | `seasons(groupId ASC, estado ASC)` si index merging no alcanza | exactamente `1`, igual a command y guard; `0` o distinta: error de estado/guard; `2`: `SEASON_GUARD_INCOMPATIBLE` | 2 | Lee después de raíz exacta y guard y antes de bloqueadores; concreta la unicidad de Temporada, no busca Períodos. |

`limit(1)` basta para Q1–Q3 porque las precondiciones son existenciales: un único documento bloquea. No se necesita contar ni identificar todos los bloqueadores. `limit(2)` sólo se usa en Q4 para distinguir la cardinalidad inválida de más de una abierta. La UI obtiene el roster mediante E2-11, no desde CU-018. No se carga el roster completo, no se agrega contador y no se consulta un collection group de Períodos.

La transacción puede terminar inmediatamente después de clasificar un resultado bloqueante íntegro o corrupto; no ejecuta consultas posteriores para acumular todos los problemas. El Owner recibe un único reason estable y vuelve a intentar después de resolverlo.

Si Q1 encuentra una raíz activa, la transacción hidrata esa raíz, deriva el active guard determinista y valida su integridad interna: una activa v3 debe tener exactamente un Período abierto y primer/último Período coherentes; una activa v1 aplica la compatibilidad AUD-C05. Raíz activa sin Período, con más de uno, sin guard o con guard cruzado falla cerrada. Q2 detecta un guard residual aun cuando Q1 esté vacía. Esas corrupciones son alcanzables desde las autoridades normales y nunca equivalen a cero activas.

### 9.4 Separación de autoridad y corrupción preexistente

AUD-C05 impone al Aggregate Root Membresía, no a Temporada, las invariantes raíz–Períodos–guards y ordena probar que los writers las confirman en una unidad de consistencia. Documentos 3 y 4 establecen a la vez que el cierre modifica exclusivamente Temporada y no amplía automáticamente otros Agregados. Ninguna fuente exige que CU-018 audite físicamente todos los hijos históricos de cada Membresía finalizada.

La prueba lógica aplicada por CU-018 se limita a estados que respetan las autoridades del Agregado:

1. toda raíz activa válida posee exactamente un Período abierto;
2. toda raíz finalizada válida posee cero Períodos abiertos;
3. todo active guard válido corresponde a una raíz activa;
4. Q1 detecta cualquier raíz autoritativamente activa del Grupo;
5. Q2 detecta cualquier active guard residual del Grupo;
6. por lo tanto, Q1 y Q2 vacías significan que no existe ninguna Membresía autoritativamente activa ni ningún Período legítimamente abierto.

CU-018 no afirma que “no existe físicamente ningún documento Período abierto en toda la base”. No agrega `groupId`, `seasonId` ni `membershipId` al Período; no crea repositorio, guard o contador paralelo; no migra historia ni escanea raíces finalizadas.

El estado raíz `finalizada` + Período abierto + ausencia de active guard + hijo sin referencias indexables se clasifica internamente como `MEMBERSHIP_INTERNAL_INTEGRITY_VIOLATION_PREEXISTING`. No puede ser producido por los writers canónicos: finalización cierra raíz, único Período, resumen y guards en la misma transacción; Rules impide escritura cliente. No es localizable mediante Q1/Q2. El hijo huérfano no participa en guards ni exclusiones; la raíz finalizada y su lifecycle conservan por separado su papel canónico. CU-018 no crea, agrava ni modifica ese estado, que tampoco era reparable por un comando público antes del cierre. Lo preserva byte-equivalente, no promete detectarlo y no publica un error imposible.

Su detección y reparación pertenecen a una intervención administrativa futura, separada y auditada. Una eventual herramienta puede hacer barridos fuera del camino transaccional, pero no será autoridad de negocio, API pública ni precondición recurrente de CU-018.

### 9.5 Cómo resolver legítimamente el bloqueo operativo

- E2-05 finaliza la Membresía propia del Owner cuando corresponda.
- E2-10 permite la salida voluntaria de la Persona.
- E2-12 permite al Owner finalizar la Membresía activa de un tercero, incluso si el Owner no posee Persona.
- Todas deben confirmar mientras la Temporada sigue abierta.
- Al finalizar: la raíz pasa a `finalizada`, se cierra el único Período, se define `fechaEgreso`/`endedAt`, se elimina el active guard y se crea el lifecycle guard de forma atómica.

Por tanto, después de un cierre válido no existe ninguna Membresía autoritativamente activa, ningún active guard ni ningún Período legítimamente abierto conforme a las invariantes del Agregado. Permanecen inmutables las raíces finalizadas válidas, sus Períodos cerrados y lifecycle guards. CU-029 recibe historia canónica finalizada y ninguna reserva activa Persona–Grupo. Esta garantía no equivale a una certificación física global de datos manipulados fuera de contratos canónicos.

## 10. Solicitudes e intents

### 10.1 Naturaleza actual

Una Solicitud pendiente v1 contiene `personId`, `groupId`, `estado`, `createdAt` y `schemaVersion`; no contiene `seasonId`. Su pending guard contiene `requestId`, `personId`, `groupId`, `createdAt` y `guardVersion`; tampoco contiene `seasonId`. El guard determinista Persona–Grupo bloquea otra Solicitud pendiente al mismo Grupo, no una Solicitud de una Temporada futura.

### 10.2 Política de cierre

- Una Solicitud meramente pendiente **no bloquea** el cierre.
- No se cancela, rechaza, migra ni consume automáticamente.
- Continúa cancelable por su candidata y rechazable por el Owner, incluso sin Temporada abierta; el rechazo no exige hoy contexto de Temporada.
- CU-031/CU-032 modelan una solicitud de ingreso al Grupo, no a una Temporada. Por ello una Solicitud creada durante N puede aprobarse durante N+1: la decisión usa siempre la única Temporada abierta autoritativa en el instante del claim y la vuelve a comprobar al activar, nunca la fecha de creación para inferir N.
- Que `createdAt` sea anterior a `fechaInicio` de N+1 es aceptable y se conserva como fecha histórica de la solicitud. No se agrega `seasonId` ni se reescribe `createdAt`.
- La UI de pendientes debe advertir “La solicitud se aprobará para la Temporada abierta actual” cuando exista N+1; debe mostrar ausencia de Temporada abierta cuando no exista, sin mostrar IDs.
- La aprobación exige una Temporada abierta en su punto de claim y en la activación.
- Sin Temporada abierta, aprobar devuelve `OPEN_SEASON_REQUIRED`, conserva la Solicitud pendiente y no crea coordinación ni decision intent pendiente.
- Una vez abierta N+1, una Solicitud sin pertenencia previa puede aprobarse para N+1. Si existe una Membresía finalizada en N, E2-09 no puede reactivarla y devuelve `MEMBERSHIP_SEASON_NOT_REACTIVATABLE`; la Solicitud permanece pendiente hasta cancelación/rechazo o hasta que E2-18 defina CU-029. E2-15 no la renueva ni altera.
- La permanencia pendiente sin vencimiento es un estado ya permitido; no existe regla normativa de expiración.
- El request intent y el pending guard Persona–Grupo permanecen correlacionados con la Solicitud durante el cambio N→N+1; continúan impidiendo una segunda Solicitud pendiente al mismo Grupo.

### 10.3 Coordinaciones e intents

- Cualquier `groupJoinRequestApprovalCoordinations` íntegra del Grupo, sea `CREATE_MEMBERSHIP` o `REACTIVATE_MEMBERSHIP` y esté ligada a N, bloquea con `APPROVAL_IN_PROGRESS` porque todavía puede escribir o confirmar activación.
- Antes de crear o recuperar esa coordinación, fase A debe revalidar dentro de su transacción la Temporada exacta y `openSeasonGuard` tanto para `CREATE_MEMBERSHIP` como para `REACTIVATE_MEMBERSHIP`.
- Los request intents de creación permanecen como recibos de su operación.
- Los decision intents consumidos permanecen como historia idempotente.
- Un decision intent pendiente correlacionado con coordinación bloquea hasta que el flujo E2-07/E2-09 recupere la aprobación, confirme la activación, o consuma/libere la coordinación por un outcome ya aprobado. CU-018 nunca la aborta.
- Intent o coordinación huérfanos, incompatibles o no recuperables producen `INCOMPATIBLE_STATE`; el cierre no los repara.

## 11. Open-season guard e idempotencia histórica de apertura

### 11.1 Problema v1

`openSeasonGuards/{groupId}` v1 contiene `seasonId`, `idempotencyKeyHash`, `requestHash`, `createdAt` y `guardVersion: 1`. Es simultáneamente:

1. exclusión del único slot abierto;
2. referencia autoritativa al ciclo actual;
3. único recibo de la apertura E2-02.

Eliminarlo sin reemplazo perdería el resultado de apertura: un retry de N ya cerrada podría intentar crear N+1, confundir el resultado o colisionar con el guard de N+1.

### 11.2 Separación obligatoria

- `openSeasonGuards/{groupId}` evoluciona a responsabilidad exclusiva de slot y contexto abierto.
- `seasonOpeningReceipts/{receiptId}` conserva de forma durable el resultado de apertura.
- `seasonClosureReceipts/{receiptId}` conserva de forma durable el resultado de cierre.
- Los recibos no tienen TTL mientras exista la Temporada correlacionada.
- No se reutiliza el guard efímero como recibo del cierre ni de aperturas anteriores.

### 11.3 Guard v2

Campos exactos:

| Campo | Tipo | Regla |
|---|---|---|
| `seasonId` | string | Temporada abierta exacta del Grupo del ID documental. |
| `openedAt` | Timestamp | Instante confirmado de apertura. |
| `guardVersion` | number | `2`. |

El ID sigue siendo `groupId`. Los consumidores deben aceptar guard v1 íntegro durante transición y v2 íntegro, siempre correlacionado con una única raíz `abierta`.

### 11.4 Recibo de apertura

Para nuevas aperturas, `receiptId` es SHA-256 length-prefixed de `sportexa:E2-15:season-opening-receipt:v2`, `actorUserId` e `idempotencyKey` exacta. Grupo, nombre y fecha pertenecen al `requestHash`, no al ID: así reutilizar la misma clave del actor con otro payload encuentra el mismo receipt y produce conflicto. La clave cruda nunca se persiste.

Campos exactos v2:

| Campo | Tipo / valor |
|---|---|
| `action` | `"OPEN_SEASON"` |
| `actorUserId` | UID autenticado |
| `groupId` | Grupo exacto |
| `seasonId` | resultado histórico exacto |
| `idempotencyKeyHash` | SHA-256 contextual |
| `requestHash` | hash de versión, actor, Grupo, `nombre` y `fechaInicio` |
| `outcome` | `"OPENED"` |
| `openedAt` | Timestamp |
| `confirmedAt` | mismo Timestamp que `openedAt` |
| `receiptVersion` | `2` |

El propósito exclusivo del receipt es responder de forma durable a la apertura idempotente; no indica cuál Temporada está abierta ni autoriza operaciones. La apertura crea raíz, guard v2 y receipt v2 en una transacción. Tras autenticar, relee Cuenta/ownership y consulta primero el receipt: misma clave y mismo payload devuelve la Temporada histórica aunque ya esté cerrada; misma clave y payload distinto produce `IDEMPOTENCY_CONFLICT`. El retry no lee ni modifica el slot N+1 una vez resuelto su receipt.

Al cerrar una Temporada abierta bajo guard v1, la misma transacción realiza un **backfill transaccional diferido del receipt de apertura**; “legacy” describe sólo su schema de compatibilidad. Su ID es SHA-256 length-prefixed de `sportexa:E2-15:season-opening-legacy-receipt:v1`, `groupId` y `guard.idempotencyKeyHash`. Se deriva únicamente después de validar guard v1 y Temporada v1 correlacionados. Contiene exactamente `action: "OPEN_SEASON"`, `groupId`, `seasonId`, `idempotencyKeyHash`, `requestHash`, `outcome: "OPENED"`, `openedAt: guard.createdAt`, `confirmedAt: guard.createdAt` y `receiptVersion: 1`. No contiene ni inventa `actorUserId`, porque E2-02 no lo persistió.

Si el receipt v1 ya existe, todos sus campos deben coincidir exactamente con guard y Temporada; de lo contrario el cierre devuelve `INCOMPATIBLE_STATE` y conserva el guard. La recuperación v1 recalcula `hashSeasonIdempotencyKey(groupId, key)`, deriva ese ID, exige ownership vigente y compara `requestHash` según E2-02. Una fixture v1 es compatible sólo si conserva los cinco campos exactos exigidos por E2-02, incluido `createdAt`; si carece de cualquier metadato no se inventa ni se cierra.

La apertura N+1 deja de aplicar la comprobación E2-02 “cualquier Temporada del Grupo impide abrir”: comprueba sólo recibo idempotente, guard y cualquier raíz `abierta`. Las cerradas son historia legítima.

## 12. Idempotencia del cierre

### 12.1 Clave e identidad

El cliente genera una `idempotencyKey` estable al abrir la confirmación y la reutiliza hasta obtener resultado autoritativo. Formato: `^[A-Za-z0-9._:-]{16,128}$`.

`receiptId` es SHA-256 length-prefixed de:

- `sportexa:E2-15:season-closure-receipt:v1`;
- `actorUserId`;
- clave exacta.

`requestHash` incluye `contract-v1`, actor, Grupo y Temporada. La misma clave del actor siempre deriva el mismo receipt; si se reutiliza para otro Grupo o Temporada, el hash difiere y se devuelve `IDEMPOTENCY_CONFLICT`. Esto impide que una clave cierre otra Temporada.

### 12.2 Schema exacto del recibo

| Campo | Tipo / valor |
|---|---|
| `action` | `"CLOSE_SEASON"` |
| `actorUserId` | UID autenticado |
| `groupId` | Grupo exacto |
| `seasonId` | Temporada exacta |
| `idempotencyKeyHash` | SHA-256 de namespace, actor y clave; coincide con la identidad del receipt |
| `requestHash` | SHA-256 contextual |
| `outcome` | `"CLOSED"` |
| `closedAt` | mismo Timestamp que la raíz |
| `confirmedAt` | mismo Timestamp que `closedAt` |
| `receiptVersion` | `1` |

No hay estado `pending`: el cierre es una única transacción. No se crea recibo ante bloqueo o error previo al commit.

`seasonId` es la identidad canónica del ciclo; no existe ordinal de Temporada aprobado y no se inventa uno. El receipt se retiene sin TTL mientras se retenga la Temporada y no se elimina al abrir N+1.

### 12.3 Resultados

- Misma clave, actor y payload: `EXISTING_IDEMPOTENT` con la misma Temporada cerrada.
- Misma clave con payload distinto: `IDEMPOTENCY_CONFLICT`, sin escritura.
- Otra clave después de un cierre confirmado: `SEASON_ALREADY_CLOSED`, sin segundo recibo.
- Respuesta perdida después del commit: el retry recupera el recibo.
- Fallo antes del commit: no existe efecto ni recibo; el mismo request puede reintentarse.
- Retry de cierre N después de abrir N+1: devuelve N desde su recibo y no lee, cierra ni elimina el guard de N+1.
- El camino de retry, después de autenticar y reautorizar, lee receipt y Temporada N antes de consultar el open guard. Un receipt íntegro permite responder aunque el guard de N haya desaparecido; nunca se sustituye `seasonId` por “la actualmente abierta”.
- La recuperación vuelve a exigir Cuenta y ownership actuales; un antiguo Owner no conserva autoridad por conocer una clave.

## 13. Persistencia

### 13.1 Temporada cerrada v2

`seasons/{seasonId}` cerrado contiene exactamente:

| Campo | Regla |
|---|---|
| `groupId` | referencia autoritativa al Grupo |
| `nombre` | valor existente, inmutable |
| `fechaInicio` | `YYYY-MM-DD` existente, inmutable |
| `estado` | `"cerrada"` |
| `createdAt` | timestamp original |
| `closedAt` | timestamp del commit de cierre |
| `closedBy` | UID del Owner autorizado en el commit |
| `schemaVersion` | `2` |

Una Temporada abierta v1 compatible migra a v2 sólo al cerrarse. No hay backfill global. Una raíz con campos desconocidos, estado no soportado, versión incompatible o correlación inválida falla cerrada.

### 13.2 Colecciones afectadas

| Colección | Lectura | Escritura |
|---|---|---|
| `users` | Cuenta del actor mediante la capacidad pública de Cuentas | ninguna |
| `groups` | existencia, schema, estado, ownership | ninguna |
| `seasons` | raíz exacta y abiertas del Grupo | transición exacta a v2 |
| `openSeasonGuards` | slot y correlación | eliminación al cerrar; v2 en futura apertura |
| `seasonOpeningReceipts` | retry/apertura histórica | creación v2 o backfill transaccional diferido v1 |
| `seasonClosureReceipts` | retry de cierre | creación v1 |
| `memberships` | existencia acotada de activa e integridad | ninguna |
| `memberships/{membershipId}/validityPeriods` | sólo integridad del Agregado alcanzado desde Q1/Q2 | ninguna; schema y campos sin cambios |
| `activeMembershipGuards` | existencia e integridad | ninguna |
| `membershipLifecycleGuards` | correlación sólo cuando sea necesaria para diagnosticar | ninguna |
| `groupJoinRequestApprovalCoordinations` | existencia por Grupo | ninguna |
| Solicitudes e intents | correlación de una coordinación encontrada | ninguna |

No se copian datos de Grupo, Persona o Membresía dentro de Temporada. `closedBy` registra el actor del evento y no duplica ownership como estado vigente.

### 13.3 Índices

- Reutilizar el índice de roster `memberships(groupId, seasonId, estado, fechaIngreso)` para consultas exactas cuando corresponda.
- Agregar el índice mínimo `memberships(groupId ASC, estado ASC)` para detectar cualquier activa del Grupo con `limit(1)` de manera determinista.
- Declarar `seasons(groupId ASC, estado ASC)` para Q4 si la configuración efectiva no satisface esa consulta por index merging; la ficha exige verificarlo en Emulator antes de habilitar el callable.
- `groupJoinRequestApprovalCoordinations(groupId ==, limit(1))` y `activeMembershipGuards(groupId ==, limit(1))` usan índices de campo simple, salvo que la implementación demuestre la necesidad de uno compuesto.
- No se agrega índice de historial de Temporadas; corresponde a E2-16.
- Un error Firestore `failed-precondition` que identifica índice requerido se traduce a `DEPENDENCY_NOT_CONFIGURED`, no a ausencia de activas ni a `DEPENDENCY_UNAVAILABLE`. La capacidad no se habilita hasta que el índice declarado esté disponible.

### 13.4 Cota de coste y tamaño transaccional

El camino exitoso usa sólo lecturas puntuales y cuatro consultas con `limit(1)`/`limit(2)`. No pagina ni carga roster. El presupuesto contractual máximo es doce documentos materializados en una tentativa y cuatro escrituras: actualización de Temporada, creación de receipt de cierre, creación opcional del receipt v1 de apertura y eliminación del guard. Un retry confirmado termina después de Cuenta, Grupo, receipt y Temporada histórica y no ejecuta consultas de bloqueadores.

Agregar scan, contador, campos de correlación a Período, migración o batch excede esta ficha y exige volver a revisión documental; no puede incorporarse como detalle de implementación.

### 13.5 Seguridad

Rules mantiene deny-all explícito para escritura y lectura cliente en `seasons`, `openSeasonGuards`, ambos recibos y controles técnicos. El Owner usa exclusivamente callables. Admin SDK no reemplaza autorización de aplicación.

## 14. Contrato público

### 14.1 `closeSeason`

Input cerrado:

| Campo | Regla |
|---|---|
| `groupId` | ID opaco válido |
| `seasonId` | ID opaco válido |
| `idempotencyKey` | clave válida y estable |

No acepta UID, owner UID, Persona, Membresía, roles, estado, fechas, timestamps, guards, hashes, contadores, motivo ni propiedades desconocidas.

Respuesta cerrada:

| Campo | Regla |
|---|---|
| `outcome` | `"CLOSED"` o `"EXISTING_IDEMPOTENT"` |
| `season` | `{ id, groupId, nombre, fechaInicio, estado: "cerrada", closedAt }` |

No expone `closedBy`, `createdAt`, schema, receipt ID, hashes, bloqueadores individuales ni documentos internos.

No se agrega preparación pública: el modal confirma una Temporada ya cargada y `closeSeason` revalida todo autoritativamente. Un preflight no vinculante aumentaría superficie sin evitar carreras.

## 15. Errores públicos estables

| Reason | Semántica |
|---|---|
| `UNAUTHENTICATED` | falta token válido |
| `ACCOUNT_REQUIRED` | Cuenta ausente o incompatible |
| `VALIDATION_FAILED` | payload, ID, clave, tamaño o propiedad inválidos |
| `GROUP_NOT_FOUND` | Grupo no existente |
| `GROUP_INCOMPATIBLE` | Grupo inactivo o schema no soportado |
| `NOT_AUTHORIZED` | actor no es Owner vigente |
| `SEASON_NOT_FOUND` | Temporada inexistente o no perteneciente al Grupo sin revelar recurso ajeno |
| `SEASON_NOT_OPEN` | raíz exacta válida pero su estado no permite el primer cierre |
| `SEASON_ALREADY_CLOSED` | cierre previo sin recibo idempotente coincidente |
| `SEASON_GUARD_MISSING` | N figura abierta pero falta el guard del Grupo |
| `SEASON_GUARD_INCOMPATIBLE` | guard corrupto, schema desconocido o apuntando a otra raíz |
| `ACTIVE_MEMBERSHIPS_EXIST` | quedan pertenencias activas resolubles |
| `MEMBERSHIP_SEASON_INCOMPATIBLE` | una raíz activa del Grupo pertenece a otra Temporada |
| `MEMBERSHIP_PERIOD_INCOMPATIBLE` | una raíz activa localizada por Q1/Q2 no respeta las invariantes AUD-C05 de sus Períodos; no promete descubrir hijos huérfanos de raíces finalizadas |
| `MEMBERSHIP_ACTIVE_GUARD_INCOMPATIBLE` | active guard residual, huérfano o discordante |
| `APPROVAL_IN_PROGRESS` | existe coordinación capaz de activar |
| `IDEMPOTENCY_CONFLICT` | misma identidad idempotente y payload distinto |
| `OWNERSHIP_CHANGED` | el actor dejó de ser Owner antes del commit; no revela el nuevo Owner |
| `INCOMPATIBLE_STATE` | agregado o coordinación irrecuperable que no posee un reason específico más seguro |
| `CONFLICT` | contención agotada sin resultado autoritativo demostrable |
| `DEPENDENCY_NOT_CONFIGURED` | falta un índice requerido o configuración equivalente |
| `DEPENDENCY_UNAVAILABLE` | Firestore no disponible |
| `INTERNAL_ERROR` | falla no clasificada, sin detalles internos |

Los mensajes son sanitizados y sólo `details.reason` es estable.

## 16. Transacción de cierre

Todas las lecturas ocurren antes de las escrituras:

1. derivar IDs/hashes sin confiar en campos internos del cliente;
2. iniciar transacción;
3. leer Cuenta y releer Grupo; autorizar ownership vigente;
4. leer el receipt de cierre por actor+clave;
5. si existe, validar `requestHash`, leer la Temporada histórica exacta y devolver recovery sin leer ni escribir el guard vigente;
6. si no existe, releer la raíz `seasons/{seasonId}` indicada por el command;
7. releer `openSeasonGuards/{groupId}`;
8. ejecutar Q4 y comprobar incompatibilidades entre command, Grupo, Temporada, guard y única abierta;
9. ejecutar Q1, Q2 y Q3 y comprobar ausencia de activaciones/coordinaciones bloqueantes;
10. si hay bloqueo, terminar sin escribir;
11. si el guard es v1, leer y validar o preparar el backfill transaccional de receipt de apertura;
12. elegir un único `Timestamp.now()` para `closedAt`/`confirmedAt`;
13. actualizar exclusivamente la raíz a v2 cerrada;
14. crear el receipt de cierre y, cuando corresponda, el receipt v1 de apertura;
15. eliminar el open guard;
16. commit.

Ausencia del guard devuelve `SEASON_GUARD_MISSING`. Guard que apunta a otra Temporada, más de una raíz abierta, guard huérfano o schema desconocido devuelven `SEASON_GUARD_INCOMPATIBLE`; no hay recuperación heurística.

## 17. Matriz de carreras

En la tabla, “slot” significa `openSeasonGuards/{groupId}` leído dentro de la transacción. Toda capacidad indicada debe cumplir esa lectura; una validación anterior a la transacción no cuenta.

| Carrera | Lecturas / escrituras del competidor | Revalidación y conflicto | Ganador durable | Perdedor estable / escritura obsoleta |
|---|---|---|---|---|
| Cierre vs apertura N+1 | Ambas leen slot y Grupo; cierre cierra N/elimina slot, apertura crea N+1/slot/receipt. | Mismo slot; Firestore reintenta. | Si cierre confirma, apertura reintenta y crea N+1. Mientras N está abierta, apertura obtiene `OPEN_SEASON_ALREADY_EXISTS`. | El cierre nunca puede borrar slot N+1: su `seasonId` exacto se revalida; retry histórico usa receipt N. |
| Cierre vs creación inicial de Membresía | Alta lee Grupo, Temporada, slot, active guard; escribe raíz/Período/active guard. Cierre lee slot y busca activas. | Mismo slot leído; la alta debe revalidarlo en su transacción. | Alta primero: queda activa y cierre devuelve `ACTIVE_MEMBERSHIPS_EXIST`. Cierre primero: alta reintenta y devuelve `OPEN_SEASON_REQUIRED`/`SEASON_INCOMPATIBLE`. | No existe alta posterior con contexto N obsoleto. |
| Cierre vs aprobación con creación | Fase A lee ownership/Solicitud/slot y crea coordination/decision intent; fase B relee slot y activa; fase C confirma Solicitud. | Slot común; además cierre consulta coordinación y activa. | Aprobación activada primero bloquea cierre hasta finalización. Cierre primero hace fallar fase A/B. | Solicitud queda pendiente; no se confirma sin activación. |
| Cierre vs aprobación con reactivación | Igual, sobre Membresía finalizada y lifecycle guard. | E2-15 obliga a fase A y B a releer slot exacto de la Membresía. | Reactivación primero crea Período/active guard y bloquea cierre. | Cierre primero produce `MEMBERSHIP_SEASON_NOT_REACTIVATABLE`; coordinación se libera/consume según E2-09 y la Solicitud sigue pendiente. |
| Cierre vs salida voluntaria | Salida lee slot, raíz, Período y guards; escribe finalización/intent. | Ambos leen slot; cierre además observa activa. | Salida primero finaliza y el cierre reintenta/pasa. Si cierre evalúa primero, no puede confirmar porque aún hay activa. | Resultado estable es bloqueo de cierre o finalización; nunca cierre con activa congelada. |
| Cierre vs finalización administrativa | E2-12 lee ownership, slot, activación exacta; escribe raíz/Período/guards/intent. | Grupo y slot comunes. | Finalización primero permite cierre. | Cierre no puede ganar mientras la activa exista; devuelve `ACTIVE_MEMBERSHIPS_EXIST`. |
| Cierre vs rechazo | Rechazo lee Grupo/ownership, Solicitud, pending guard, decision intent y coordination; escribe Solicitud/intent/elimina pending guard. No usa slot. | Si no hay coordinación, operaciones conmutan. Si la hay, cierre y rechazo se bloquean conforme a su contrato. | Cualquier orden deja Temporada cerrada y Solicitud rechazada, o aprobación en recuperación. | No hay escritura de Temporada desde rechazo ni decisión silenciosa desde cierre. |
| Cierre vs transferencia de ownership | Transferencia futura debe leer/escribir Grupo; cierre lee Grupo. | El documento Grupo fuerza reintento. | Transferencia primero autoriza sólo al nuevo Owner; cierre primero registra actor válido al commit. | Owner anterior obtiene `NOT_AUTHORIZED`; no hay confirmación con ownership obsoleto. |

### 17.1 Dos cierres

- Misma clave/payload: uno confirma; el otro reintenta y devuelve `EXISTING_IDEMPOTENT`.
- Claves diferentes: uno confirma; el otro devuelve `SEASON_ALREADY_CLOSED` sin crear recibo.
- No se admite “uno gana” sin outcome: ambos obtienen uno de esos resultados o `CONFLICT` si se agota la contención sin lectura autoritativa.

### 17.2 Capacidades que deben releer en transacción

La inspección de código en `dev` distingue validaciones previas de lecturas protectoras reales:

| Operación | Transacción que confirma | Lee open guard dentro | Lee Temporada dentro | Lee ownership dentro | Escritura/conflicto con cierre | Adaptación E2-15 |
|---|---|---|---|---|---|---|
| Apertura E2-02 | `firestoreOpenSeasonGuard.confirmOpenSeason` | Sí; lo crea | Sólo raíz referenciada si ya hay guard; consulta existencia al crear | Sí, Grupo | crea el mismo guard que cierre elimina | Separar receipt/slot, consultar sólo abiertas y soportar N+1. |
| Creación inicial E2-03 | `firestoreActiveMembershipGuard.confirmActiveMembership` | **No**; el contexto se obtuvo antes | **No** | Sí | crea raíz/Período/active guard, pero hoy no comparte documento con cierre | Debe leer guard y Temporada exacta dentro de esta transacción antes de crear. |
| Aprobación `CREATE_MEMBERSHIP` | fase A de `firestoreGroupJoinRequestStore` y fase B `createOrRecoverForGroupJoinRequest` | Sí al crear claim en A y en B; recovery de A retorna coordinación sin escribir | Sí al crear claim en A y en B | Sí en fase A | fase A crea coordinación; fase B crea raíz/Período/active guard | Mantener revalidación antes de cada escritura nueva; una coordinación recuperada bloquea cierre y fase B relee antes de activar. |
| Aprobación `REACTIVATE_MEMBERSHIP` | mismas fases A/B | **No en fase A actual**; sí en B | **No en fase A actual**; sí en B | Sí en A | A crea coordinación; B actualiza raíz/abre Período/crea active guard | Añadir guard+Temporada exacta en fase A antes de coordination; mantener fase B. |
| Salida voluntaria E2-10 | `firestoreMembershipSelfExitStore.confirm` | Sí | Sí | Lee Grupo/contexto propio dentro | finaliza raíz/Período, elimina active guard | Conservar; no aceptar preflight externo como sustituto. |
| Finalización Owner/self E2-05 | `firestoreMembershipLifecycleGuard.finalizeForOwner` | **No**; recibe `openSeasonId` de lectura previa | **No** | Sí | finaliza raíz/Período, elimina active guard | Debe leer guard y Temporada exacta dentro de la transacción; el parámetro previo no protege. |
| Finalización administrativa E2-12 | `firestoreMembershipAdministrativeFinalizationStore.execute` | Sí mediante `getExactOpenSeason` | Sí | Sí | finaliza raíz/Período, elimina active guard y crea lifecycle/intent | Conservar revalidación; recovery de receipt confirmado puede devolver historia sin exigir apertura. |
| Rechazo E2-07 | `firestoreGroupJoinRequestStore.reject` | No, por diseño | No, por diseño | Sí | modifica Solicitud/intent/pending guard; no activa ni toca Temporada | Sin adaptación de slot: rechazo y cierre conmutan. Debe seguir rechazando coordination existente con `APPROVAL_IN_PROGRESS`. |

Leer sólo la Temporada o pasar un `seasonId` obtenido antes de `runTransaction` no serializa. Para las operaciones que crean, reactivan o finalizan Membresía, la lectura del guard dentro de la transacción hace conflicto con la eliminación del cierre. Rechazo es la excepción deliberada porque no puede crear una activación y sus escrituras son disjuntas.

## 18. Frontend

- La acción “Cerrar Temporada” aparece en `OpenSeasonSection`, dentro del detalle Owner-scoped del Grupo, sólo cuando hay Temporada abierta válida.
- La visibilidad no sustituye autorización backend.
- Abre un diálogo accesible que identifica por nombre la Temporada y advierte: cierre terminal, historia preservada, necesidad de finalizar integrantes activos, Solicitudes pendientes no rechazadas automáticamente y ausencia de renovación.
- Genera una clave estable al abrir el diálogo; doble click y doble submit quedan deshabilitados durante la petición.
- Estados explícitos: carga, confirmación, enviando, bloqueo por activas, bloqueo por aprobación, conflicto/retry, éxito y error recuperable.
- `ACTIVE_MEMBERSHIPS_EXIST` enlaza o desplaza foco al roster y explica que cada pertenencia debe finalizarse mientras la Temporada siga abierta.
- `APPROVAL_IN_PROGRESS` dirige a Solicitudes pendientes para recuperar o completar la decisión; no ofrece cancelar técnicamente una coordinación.
- Ante `ACTIVE_MEMBERSHIPS_EXIST`, el diálogo no promete finalización automática: conserva el nombre de N, cierra al navegar al roster y refresca Temporada+roster. Al volver a confirmar la misma N puede reutilizar la clave aún vigente en la sesión o generar una nueva, porque el bloqueo no creó receipt; nunca reutiliza una clave si cambió `seasonId`.
- Ante timeout, `DEPENDENCY_UNAVAILABLE` o respuesta perdida se conserva obligatoriamente la misma clave y el command exacto hasta recuperar outcome. Ante `SEASON_ALREADY_CLOSED`, `IDEMPOTENCY_CONFLICT` o cambio de Temporada no se reenvía automáticamente.
- Guards, Períodos o coordinaciones incompatibles muestran “No se puede cerrar por una inconsistencia; contactá soporte”, con foco en el resumen y sin IDs, hashes ni rutas Firestore.
- En éxito se refrescan Grupo, contexto abierto, roster y Solicitudes. Se muestra confirmación con la fecha; no se crea una pantalla de historial.
- Teclado: foco inicial en el título/advertencia, tabulado contenido, Escape antes del envío, retorno de foco al disparador, `aria-live` para resultado.
- Responsive sin IDs técnicos ni hashes. Owner sin Persona puede cerrar si no existen bloqueos.

## 19. Compatibilidad y legado

| Elemento | Clasificación | Tratamiento |
|---|---|---|
| Temporada abierta v1 | adaptar | cerrar a v2 sólo al escribir |
| Guard abierto v1 | adaptar | aceptar, materializar receipt legacy y eliminar al cerrar |
| Guard abierto v2 | conservar | slot exclusivo del ciclo vigente |
| Membresías v1/v2/v3 | conservar/adaptar lectura | activa de cualquier versión bloquea; E2-15 no migra raíz |
| Períodos AUD-C05 | conservar | no mutar; su coherencia deriva del Agregado |
| Active/lifecycle guards | conservar | active bloquea; lifecycle histórico no bloquea |
| Solicitudes, pending guards, request/decision intents | conservar | pendiente simple no bloquea; coordination sí |
| Arrays `activeSeason`, temporadas/años embebidos | aislar | no son autoridad ni se leen/escriben |
| Rutas administrativas/callables/BFF | adaptar sólo superficie de Temporada | sin bypass cliente |
| Rules | adaptar | deny-all de nuevas colecciones |
| Índices | adaptar mínimamente | sin índice de historial |
| Fixtures/scripts | adaptar sólo preparación automatizada | no simular cierre con escritura administrativa en el caso principal |
| Partido/Torneo/Equipo y cuatro consumidores E4 | fuera de alcance | cero mutación, retiro o `seasonId` inventado |
| Tombstones E2-13 | conservar | no restaurar superficies retiradas |

## 20. Pruebas requeridas

No se ejecutan durante la revisión documental. La implementación futura debe cubrir:

### 20.1 Dominio y contratos

- transición única abierta-cerrada, terminalidad e inmutabilidad;
- schema v1 abierto y v2 cerrado estrictos;
- payload exacto, límites UTF-8, IDs, clave y propiedades desconocidas;
- DTO cerrado y ausencia de campos internos;
- hashes length-prefixed y separación apertura/cierre.

### 20.2 Servicio y persistencia

- autorización Cuenta/Owner sin Persona;
- comprobaciones acotadas de activas, guards y coordinaciones;
- backfill transaccional diferido del receipt de apertura v1;
- receipt de cierre y timestamp único;
- evolución de Temporada v1 a v2 sólo al cerrar, sin migración de Membresías/Períodos y con rechazo de schemas desconocidos;
- recuperación después de respuesta perdida y ausencia de parciales antes del commit.

### 20.3 Concurrencia y Emulator

- cada fila de la matriz §17 con barreras deterministas;
- dos cierres misma/diferente clave;
- apertura N+1 y retries históricos de apertura/cierre N;
- Solicitud creada en N aprobada en N+1 para alta inicial, y rechazo sin Temporada abierta;
- carreras con alta, aprobación-create, aprobación-reactivate, salida, finalización, rechazo y cambio de ownership;
- **corrupción alcanzable:** guard ausente/corrupto/apuntando a otra Temporada, activa de otra Temporada, raíz activa sin Período o con dos abiertos, raíz activa sin active guard, active guard sin raíz activa y coordinación huérfana; cada una rechaza con reason estable;
- índice requerido ausente mapeado a `DEPENDENCY_NOT_CONFIGURED`, sin interpretar la consulta como vacía;
- **corrupción interna inalcanzable:** fixture raíz finalizada+Período abierto+sin active guard; demuestra que ningún writer canónico la produce, que CU-018 no promete localizarla, que el cierre no modifica raíz/hijo y que no se expone una falsa garantía de saneamiento global;
- operación real por callable y Admin SDK productivo; las escrituras administrativas se limitan al setup explícito de corrupción.

### 20.4 Rules, frontend y arquitectura

- denegación directa para visitante, autenticado, Owner y global admin;
- modal, foco, teclado, `aria-live`, responsive, single-flight y retry estable;
- bloqueos accionables y Owner sin Persona;
- módulos no importan repositorios internos ajenos; activaciones consumen capacidad pública de Temporada;
- tests de arquitectura impiden mutar Persona, Grupo, Membresía, Solicitud, Partido o Torneo desde cierre.

### 20.5 Mantenimiento y regresión

- E2-02 a E2-13, incluidos lectores E2-04/E2-11, finalizaciones E2-05/E2-10/E2-12 y decisiones E2-06/E2-07/E2-09;
- mantenimiento de hashes, schemas, colecciones e índices declarados;
- cero referencias a nombres anteriores de ficha combinada y cero resurrección de tombstones.

## 21. UAT numerada

### 21.1 Datos y actores

- **A:** Cuenta Google Owner de Grupo G, deliberadamente sin Persona.
- **B:** Cuenta Google con Persona y Membresía activa en G durante Temporada N.
- **C:** Cuenta Google con Persona y Solicitud pendiente a G, sin Membresía activa.
- G activo y canónico; N abierta; datos deportivos opcionales que no serán modificados.

No se fabrican roles globales, estados corruptos ni documentos legacy en UAT manual.

### 21.2 Recorrido manual

1. A abre el detalle de G y confirma que N muestra la acción de cierre aunque A no posea Persona.
2. A intenta cerrar con B activa. Debe recibir el bloqueo comprensible; N, B, su Período y guards no cambian.
3. A finaliza a B mediante la UI pública E2-12. Se comprueba B finalizada y ausente del roster activo.
4. C crea por UI pública una Solicitud pendiente a G. A no la aprueba.
5. A abre el diálogo, revisa advertencias y cierra N una sola vez.
6. La UI confirma N cerrada, deja de mostrar slot abierto y no ofrece reapertura.
7. A consulta Solicitudes y verifica que la misma Solicitud de C continúa pendiente y que el rechazo sigue disponible; no la decide todavía.
8. B crea, si la UI E2-06 lo permite para su estado finalizado, otra Solicitud al Grupo; A la rechaza sin Temporada abierta para comprobar que rechazo no depende del slot. Si esa candidatura no está disponible por una regla pública vigente, este subcaso queda automatizado y no se fabrica estado.
9. Se inspecciona mediante capacidad autorizada disponible: N cerrada con `closedAt`; B finalizada con todos sus Períodos cerrados y lifecycle guard; cero active guards; Solicitud de C todavía pendiente; ownership y documento Grupo sin cambios; Personas y datos deportivos sin cambios.
10. A abre N+1 mediante la UI E2-02 adaptada. Debe ser posible sin borrar N.
11. A vuelve a la Solicitud original de C. La UI advierte que se aprobará para la Temporada abierta actual; si C no tiene historia previa, A la aprueba y el resultado referencia N+1, no N ni la fecha de creación.
12. Se confirma que la historia finalizada de B en N permanece idéntica y que ninguna acción creó renovación automática.

### 21.3 Exclusivo de Emulator

- carreras, respuestas perdidas, fallos pre/post commit y keys incompatibles;
- no-Owner, global admin sin ownership y transferencia concurrente;
- guard ausente/corrupto/ajeno, schemas incompatibles y coordinaciones huérfanas;
- retry histórico de apertura N después de N+1;
- retry de cierre N después de N+1 con la clave original, porque la UI ya no presenta el botón de N; debe devolver receipt N sin leer/escribir el guard N+1;
- escritura directa cliente y ausencia de efectos en Partido/Torneo;
- aprobación concurrente con creación/reactivación.

No se exige manualmente historial paginado, consulta pública de cerradas, transferencia de ownership, reapertura ni corrupción, porque no existe superficie pública aprobada para ellas.

## 22. Criterios de aceptación Dado/Cuando/Entonces

1. **Dada** una N abierta íntegra, sin activas ni coordinación, **cuando** el Owner cierra, **entonces** N queda v2 cerrada, se libera el slot y se crean los receipts aplicables.
2. **Dado** un Owner sin Persona, **cuando** cumple las mismas precondiciones, **entonces** cierra exitosamente.
3. **Dado** un no-Owner, **cuando** intenta cerrar, **entonces** recibe `NOT_AUTHORIZED` sin escritura.
4. **Dado** un global admin sin ownership, **cuando** intenta cerrar, **entonces** no obtiene autoridad.
5. **Dada** una Temporada inexistente, **cuando** se solicita cierre, **entonces** se devuelve `SEASON_NOT_FOUND`.
6. **Dada** una Temporada de otro Grupo, **cuando** se combina con G, **entonces** no se filtra información y no se escribe.
7. **Dado** un Grupo inexistente, **cuando** se cierra, **entonces** se devuelve `GROUP_NOT_FOUND`.
8. **Dado** un Grupo incompatible, **cuando** se cierra, **entonces** se devuelve `GROUP_INCOMPATIBLE`.
9. **Dada** una Temporada ya cerrada sin receipt coincidente, **cuando** se vuelve a cerrar, **entonces** se devuelve `SEASON_ALREADY_CLOSED`.
10. **Dado** un cierre confirmado, **cuando** se reintenta misma clave/payload/actor, **entonces** se devuelve `EXISTING_IDEMPOTENT` con N.
11. **Dada** la misma identidad idempotente, **cuando** cambia Grupo o Temporada, **entonces** se devuelve `IDEMPOTENCY_CONFLICT`.
12. **Dados** dos cierres simultáneos con igual clave, **cuando** compiten, **entonces** uno confirma y ambos observan el mismo cierre.
13. **Dada** una respuesta perdida post-commit, **cuando** se reintenta, **entonces** el receipt recupera el resultado.
14. **Dado** un fallo antes del commit, **cuando** se inspecciona, **entonces** no hay raíz, guard ni receipt parcial.
15. **Dada** transferencia concurrente de ownership, **cuando** cambia Grupo antes del commit, **entonces** el actor anterior no confirma.
16. **Dado** guard ausente con N abierta, **cuando** se cierra, **entonces** `INCOMPATIBLE_STATE` y cero reparación.
17. **Dado** guard corrupto, **cuando** se cierra, **entonces** falla cerrado.
18. **Dado** guard que apunta a otra Temporada, **cuando** se cierra N, **entonces** no toca ninguna de ambas.
19. **Dado** cierre concurrente con apertura, **cuando** se serializan, **entonces** N cierra antes de que N+1 abra o la apertura observa N aún abierta.
20. **Dado** cierre concurrente con alta inicial, **cuando** compiten, **entonces** alta primero bloquea cierre o cierre primero impide alta.
21. **Dado** cierre concurrente con reactivación, **cuando** compiten, **entonces** reactivación primero bloquea o cierre primero impide reactivar.
22. **Dado** cierre concurrente con aprobación, **cuando** compiten, **entonces** no se aprueba sin activación ni se cierra con coordinación/activa.
23. **Dada** cualquier Membresía activa de G, **cuando** se cierra, **entonces** `ACTIVE_MEMBERSHIPS_EXIST` y todo queda intacto.
24. **Dada** una Solicitud pendiente sin coordinación, **cuando** se cierra, **entonces** no bloquea ni se modifica y sigue rechazable/cancelable.
25. **Dada** una coordinación de aprobación, **cuando** se cierra, **entonces** `APPROVAL_IN_PROGRESS` sin efectos.
26. **Dado** un Período abierto correlacionado con raíz activa, **cuando** se cierra, **entonces** la raíz bloquea y `endedAt` no se falsifica.
27. **Dada** historia finalizada válida, **cuando** se cierra, **entonces** raíces, Períodos y lifecycle guards no cambian.
28. **Dada** N cerrada, **cuando** se abre N+1, **entonces** el slot admite N+1 y N se conserva.
29. **Dado** un retry de apertura N después de N+1, **cuando** usa la clave original, **entonces** devuelve N y no afecta N+1.
30. **Dada** una escritura cliente directa, **cuando** apunta a raíz, guard o receipt, **entonces** Rules la deniega.
31. **Dado** un cierre, **cuando** confirma, **entonces** Grupo no recibe campos ni modificaciones arbitrarias.
32. **Dado** un Owner sin Persona, **cuando** cierra, **entonces** no se crea ni modifica Persona.
33. **Dado** un cierre exitoso, **cuando** se inspeccionan Membresías, **entonces** no existe renovación automática.
34. **Dado** Partido/Torneo existente, **cuando** se cierra, **entonces** permanece byte-equivalente en sus documentos.
35. **Dado** un payload con propiedad desconocida, **cuando** se valida, **entonces** `VALIDATION_FAILED` antes de persistir.
36. **Dado** payload excesivo, ID o key inválidos, **cuando** se valida, **entonces** se rechaza sin acceso de negocio.
37. **Dada** dependencia no disponible, **cuando** falla la operación, **entonces** `DEPENDENCY_UNAVAILABLE` y retry seguro.
38. **Dada** N abierta v1 íntegra, **cuando** se cierra, **entonces** migra sólo N a v2 y preserva campos originales.
39. **Dado** cierre confirmado, **cuando** se consulta el contexto abierto, **entonces** queda ausente y una apertura posterior es válida.
40. **Dada** Cuenta Google Owner sin Persona, **cuando** ejecuta UAT, **entonces** puede completar el cierre tras resolver las activas.
41. **Dada** salida voluntaria concurrente, **cuando** finaliza primero, **entonces** el cierre reintenta y puede confirmar.
42. **Dada** finalización administrativa concurrente, **cuando** finaliza primero, **entonces** no queda Período abierto al cerrar.
43. **Dado** rechazo concurrente sin coordinación, **cuando** confirma en cualquier orden, **entonces** Solicitud rechazada y Temporada cerrada son compatibles.
44. **Dada** una activa de otra Temporada, **cuando** se cierra, **entonces** `MEMBERSHIP_SEASON_INCOMPATIBLE`; **dado** un active guard huérfano, **entonces** `MEMBERSHIP_ACTIVE_GUARD_INCOMPATIBLE`.
45. **Dado** schema incompatible de receipt v1, **cuando** se intenta cerrar, **entonces** no se elimina el único guard/recibo de apertura disponible.
46. **Dada** una Solicitud creada en N y todavía pendiente, **cuando** se aprueba con N+1 abierta y sin historia previa, **entonces** la Membresía creada referencia N+1 y `createdAt` de la Solicitud no cambia.
47. **Dada** una Solicitud creada en N y una Membresía finalizada en N, **cuando** se intenta aprobar en N+1 antes de E2-18, **entonces** recibe `MEMBERSHIP_SEASON_NOT_REACTIVATABLE` y la Solicitud continúa pendiente.
48. **Dado** un índice requerido ausente, **cuando** se intenta cerrar, **entonces** `DEPENDENCY_NOT_CONFIGURED`, cero escrituras y nunca un falso resultado de ausencia.
49. **Dada** una raíz activa localizada cuyo Período contradice AUD-C05, **cuando** Q1 valida su Agregado, **entonces** devuelve `MEMBERSHIP_PERIOD_INCOMPATIBLE` y no cierra.
50. **Dado** un retry de cierre N después de abrir N+1, **cuando** receipt N coincide, **entonces** se devuelve N sin leer, eliminar ni actualizar el guard de N+1.
51. **Dada** una fixture administrativa `MEMBERSHIP_INTERNAL_INTEGRITY_VIOLATION_PREEXISTING`, sin raíz activa ni active guard, **cuando** CU-018 cierra, **entonces** no afirma detectarla, no modifica raíz ni hijo y el resultado sólo garantiza ausencia de activación autoritativa.
52. **Dados** los writers canónicos de alta, reactivación y finalización, **cuando** se prueban sus commits y fallos, **entonces** nunca persisten raíz finalizada con Período abierto ni separan raíz/Período/guards en commits parciales.

## 23. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Phantom entre consulta vacía y activación | slot común leído por toda activación y eliminado por cierre dentro de transacciones serializables |
| Grupo grande | consultas `limit(1)`, índice por Grupo/estado; sin roster completo ni batch |
| Active guard semánticamente falso | bloqueo/fallo cerrado; nunca se elimina desde cierre |
| Coordinación abandonada | bloqueo visible y recuperación por flujo E2-07/E2-09; cierre no la fuerza |
| Pérdida de idempotencia de apertura | receipt durable antes de eliminar guard v1 |
| Retry N afecta N+1 | receipts ligados a actor/Grupo/Temporada y revalidación exacta del guard |
| Rollback después de datos v2 | compatibilidad de lectura obligatoria y estrategia roll-forward |
| UX costosa por muchas activas | roster E2-11 + finalización E2-12; coste humano explícito preferido a estado falso |
| Datos históricos o manipulados fuera de contratos canónicos | `E2-DATA-INTEGRITY-01`: CU-018 garantiza autoridades y estados alcanzables, no auditoría global; futura herramienta administrativa puede barrer/diagnosticar fuera del camino transaccional y sin convertirse en API o autoridad de negocio |

### 23.1 Deuda `E2-DATA-INTEGRITY-01`

La deuda es no bloqueante para CU-018 porque conjuntamente se demuestra que: ningún writer productivo actual puede persistir esa combinación mediante un commit parcial; el hijo huérfano no participa en guards ni exclusiones de activación; cerrar no lo crea, reescribe ni vuelve menos accesible para una herramienta administrativa; y ninguna fuente normativa exige su detección exhaustiva durante CU-018. Si cualquiera de esas premisas cambia, la deuda vuelve a ser bloqueante y exige revisión antes de desplegar el cambio correspondiente.

## 24. Rollback

- Antes de cualquier cierre confirmado, el rollback de despliegue puede retirar callable/UI y conservar datos v1.
- Después de un cierre confirmado, retirar la capacidad no revierte el hecho: la Temporada continúa cerrada y sus receipts se conservan.
- No existe rollback funcional por reapertura, no se restaura manualmente `openSeasonGuards/{groupId}` para N y no se cambia `estado` a `abierta`.
- Una apertura N+1 confirmada tampoco se revierte ni se reemplaza por N.
- No se eliminan `seasonOpeningReceipts` ni `seasonClosureReceipts`; un binario anterior que no comprenda v2/receipts no es rollback seguro.
- La recuperación ordinaria es roll-forward: corregir compatibilidad o disponibilidad, reintentar por receipt y mantener Rules deny-all.
- Una inconsistencia de raíz, Período, guard, coordinación o receipt exige procedimiento separado, explícito y auditado; CU-018 no contiene reparación administrativa.
- Índices nuevos pueden retirarse sólo después de retirar la capacidad y comprobar ausencia de tráfico; los documentos de dominio y receipts no se eliminan.

## 25. Dependencias posteriores

- **E2-16 / CU-019:** listará abiertas/cerradas y definirá orden, cursor, snapshot y acceso histórico; consume `closedAt`, no cambia cierre.
- **E2-17 / CU-017:** sólo podrá editar conforme a RF-17 y nunca una cerrada; no reabre.
- **E2-18 / CU-029 y CU-010 aprobado:** recibe Temporada anterior cerrada, Membresía anterior finalizada, Períodos cerrados, lifecycle guard preservado, ausencia de active guard y nueva Temporada abierta. Debe decidir identidad/trazabilidad intertemporada sin reutilizar implícitamente CU-028.

## 26. Decisiones cerradas y decisiones abiertas

Quedan cerradas:

- bloqueo estricto por activas;
- ausencia de mutación masiva;
- Solicitud pendiente simple no bloqueante y recuperable;
- coordinación de aprobación bloqueante;
- terminalidad sin reapertura;
- serialización común por open guard;
- receipts durables separados para apertura y cierre;
- evolución de Temporada v1 a v2 sólo al cerrar, sin migración de Membresías o Períodos;
- autorización Owner sin Persona;
- raíz/active guard como autoridades del bloqueo y Período como subentidad validada sólo al alcanzar su Agregado;
- corrupción interna preexistente fuera de Q1/Q2 registrada como `E2-DATA-INTEGRITY-01`, no bloqueante y sin falsa garantía;
- CU-018 como único caso de uso.

No quedan decisiones fundamentales abiertas para CU-018. Los detalles de historial, edición y renovación siguen deliberadamente asignados a E2-16, E2-17 y E2-18; no se reabre la división.

## 27. Definición de terminado

E2-15 puede declararse terminado sólo cuando:

- código, contratos, schemas, índices y Rules cumplen esta ficha;
- todas las activaciones y finalizaciones relevantes leen el slot dentro de su transacción;
- no es posible confirmar cierre con raíz autoritativamente activa, active guard residual o coordinación de aprobación; toda raíz activa alcanzada valida además su Período interno;
- retries de apertura y cierre históricos son durables y no afectan N+1;
- no hay mutaciones colaterales ni reapertura;
- pasan pruebas unitarias, Emulator, Rules, frontend, arquitectura, mantenimiento y regresión E2-02–E2-13;
- UAT manual completa el recorrido público con Owner Google sin Persona;
- inspección persistente confirma Temporada/guard/receipts y Agregados Membresía alcanzados coherentes, sin declarar auditoría física global;
- informe y cierre posteriores registran evidencia, sin confundir fixtures con operación real.
