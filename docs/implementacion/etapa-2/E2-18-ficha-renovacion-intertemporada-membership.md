# Ficha de Incremento Implementable E2-18 — Renovación intertemporada de Membresía

## Estado de la ficha

- **Estado:** `APROBADA — LISTA PARA VERSIONAR`.
- **Fecha:** 2026-09-25.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Rama de definición:** `feat/e2-18-membership-renewal`.
- **Checkpoint de partida:** `dev` y `origin/dev` en `04de2d58cbbb56049cb094b0064d4851e73dbb47`.
- **Caso de uso principal:** CU-029 — Renovar Membresía.
- **Caso de uso adaptado:** porción mínima de CU-032 — Aprobar Solicitud, exclusivamente para coordinar `RENEW_MEMBERSHIP`.
- **Fuente de verdad funcional:** raíces Membresía y sus Períodos de Vigencia.
- **Puntero técnico autoritativo del estado más reciente del linaje:** lifecycle guard Persona–Grupo.
- **Entrada pública:** aprobación explícita de una Solicitud pendiente por el Owner vigente.

Esta ficha no implementa código ni aprueba por sí misma el inicio de implementación. Cierra un corte documental implementable y queda sin versionar. E2-19, correspondiente a CU-010, queda fuera de este archivo y todavía no se crea.

## 1. Objetivo y resultado observable

Permitir que el Owner vigente apruebe la Solicitud pendiente de una Persona que perteneció antes al mismo Grupo en una Temporada ya cerrada. La aprobación crea una **nueva raíz Membresía**, activa en la Temporada abierta actual, enlazada de forma inmutable con la última raíz finalizada autoritativa del mismo linaje.

El resultado observable es:

- una Solicitud aprobada sólo después de confirmar el efecto durable;
- una nueva Membresía activa con identidad propia y `approvalEffect: "RENEW_MEMBERSHIP"`;
- la Membresía anterior íntegra e inmutable;
- un único active guard Persona–Grupo apuntando a la nueva raíz;
- un lifecycle guard Persona–Grupo avanzado a la nueva raíz;
- ningún historial completo, Temporada ni predecesora elegible desde el cliente.

## 2. Fundamento normativo y fuentes contrastadas

### 2.1 Fuentes normativas

1. **Documento 1 y Documento 1.5:** Persona, Grupo, Temporada y Membresía conservan identidades y responsabilidades separadas; Membresía representa la participación Persona–Grupo contextualizada por Temporada y no habilita autoridad por rol global.
2. **Documento 2, casos de uso y reglas funcionales:**
   - CU-028 reactiva la misma Membresía sólo dentro de una Temporada abierta;
   - CU-029 genera una nueva participación en una nueva Temporada y preserva trazabilidad con la Membresía anterior;
   - CU-032 aprueba una Solicitud sólo si el estado de pertenencia lo permite;
   - una Membresía de Temporada cerrada no se reactiva ni modifica;
   - las altas y renovaciones requieren Temporada abierta.
3. **Documentos 3 y 4, revisión AUD-C05 y adendas de Períodos de Vigencia:** Membresía es Aggregate Root; sus Períodos son entidades internas subordinadas; Solicitud y Membresía son agregados distintos coordinados sin transacción global; la recuperación debe conservar el efecto exacto y no reescribir historia.
4. **Documento 5:** se usa como mapa de transición y criterio de corte vertical, no como sustituto de los CU normativos ni como numeración definitiva.
5. **Auditoría técnica original y auditoría consolidada E2-14:** constatan deuda de coexistencia entre modelo canónico y legacy, exigen frontend dentro del incremento y reservan E2-14 para repetir la auditoría al terminar los incrementos funcionales pendientes.

### 2.2 Evidencia de incrementos ya cerrados

Se contrastaron ficha, informe y cierre de E2-02, E2-09, E2-15, E2-16 y E2-17, además de E2-03 a E2-13 donde condicionan Membresías, Solicitudes, guards, intents, ownership y autorización. En particular:

- E2-02 provee la Temporada abierta independiente y el open-season guard.
- E2-03 crea una primera Membresía y garantiza unicidad activa Persona–Grupo.
- E2-04 consulta sólo pertenencias actuales; no es historial.
- E2-05, E2-10 y E2-12 finalizan activaciones mediante Períodos y lifecycle guard.
- E2-06 y E2-07 proveen Solicitud pendiente, consentimiento, decision intent y coordinación recuperable.
- E2-09 limita `REACTIVATE_MEMBERSHIP` a la misma raíz y la misma Temporada todavía abierta. Cuando la raíz finalizada pertenece a otra Temporada devuelve `MEMBERSHIP_SEASON_NOT_REACTIVATABLE`, consume establemente ese intento y deja la Solicitud pendiente.
- E2-11 lista sólo integrantes activos del Grupo.
- E2-15 exige finalizar explícitamente las Membresías antes del cierre, permite que Solicitudes pendientes atraviesen N→N+1 y prohíbe renovación automática o masiva.
- E2-16 sólo consulta historial de Temporadas.
- E2-17 edita la Temporada abierta sin cambiar pertenencias.
- Los correctivos de recuperación por `code=3` exigen releer estado autoritativo antes de atribuir éxito a un fallo ambiguo.

### 2.3 Evidencia física vigente

La inspección de dominio, repositories, Rules, índices, frontend, pruebas e historial Git encontró:

- raíces Membresía v1 activas, v2 finalizadas y v3 activas/finalizadas con Períodos;
- active guard v1/v2 y lifecycle guard v1/v2 actualmente mutuamente excluyentes;
- `finalizedPairQuery(...).limit(2)` y varios comandos que fallan si existe más de una finalizada Persona–Grupo;
- `groupJoinRequestApprovalCoordinations` v2 y decision intents v2 con sólo `CREATE_MEMBERSHIP` y `REACTIVATE_MEMBERSHIP`;
- Solicitudes aprobadas v3 sin `RENEW_MEMBERSHIP`;
- `PendingGroupJoinRequestsSection` distingue alta de reactivación, pero no renovación;
- Firestore Rules niegan toda lectura/escritura cliente sobre Membresías, Períodos, guards, Solicitudes, intents y coordinaciones;
- índices actuales para activas/finalizadas Persona–Grupo y listados actuales, sin consulta de linaje.

La incompatibilidad no se resuelve relajando cardinalidad de manera aislada: exige que el lifecycle guard deje de significar «única raíz finalizada» y pase a significar «última raíz del linaje».

## 3. Alcance incluido

- CU-029 para una Persona y un Grupo identificados por una Solicitud pendiente.
- Adaptación mínima de CU-032 para derivar, coordinar y confirmar `RENEW_MEMBERSHIP`.
- Nueva raíz Membresía en la Temporada abierta actual.
- Nuevo Período inicial abierto, active guard y avance del lifecycle guard en una misma transacción de Membresía.
- Referencia inmutable a la predecesora inmediata.
- Soporte de intervalos sin participación durante una o más Temporadas intermedias.
- Evolución compatible de readers y comandos E2-03, E2-04, E2-05, E2-09, E2-10, E2-11 y E2-12.
- Idempotencia, recuperación, concurrencia, errores, frontend Owner, pruebas focales y UAT local.

## 4. Exclusiones

- CU-010 y cualquier pantalla o DTO de historial propio; corresponden a E2-19.
- callable pública independiente para renovar, autorrenovación o renovación administrativa.
- elección manual de Temporada, `membershipId` anterior o cualquier raíz histórica.
- renovación automática al abrir una Temporada, renovación masiva, invitaciones, correos y notificaciones.
- administradores delegados, rol global como autoridad, roles de plantel, permisos, dorsal, posición u otros atributos no normados.
- arrays de historial, copias completas de raíces, backlinks, listas embebidas o contadores para reconstruir historia.
- creación de raíces o Períodos vacíos por Temporadas sin participación.
- reparación, backfill o migración global de estados corruptos.
- cambios de Grupo, Persona, Cuenta, Temporada, Partido, Torneo, Plan, Suscripción o datos deportivos.
- retiro global de writers/consumidores legacy no demostrado por este flujo.
- deploy, acceso Firebase remoto e integración de Auth/UAT.

## 5. Actores y autorización

| Actor | Participación | Autoridad |
| --- | --- | --- |
| Persona candidata | Crea o conserva la Solicitud Persona–Grupo; ésta expresa consentimiento de reincorporación | No ejecuta renovación ni elige Temporada/predecesora |
| Owner vigente | Confirma explícitamente la aprobación | `groups/{groupId}.ownerId`, releído autoritativamente; no claims ni roles globales |
| Sistema | Coordina Solicitud, Membresía, Grupo, Persona y Temporada | Capacidades públicas internas y estado técnico; no agrega autoridad |

Precondiciones de identidad:

- actor autenticado y Cuenta del actor disponible conforme al contrato de decisión vigente;
- Grupo canónico activo y actor Owner vigente;
- Solicitud canónica `pendiente`, guard pendiente íntegro y Persona candidata correlacionada;
- Cuenta/Persona candidata todavía compatibles con el origen canónico de la Solicitud;
- ningún `personId`, `seasonId`, `membershipId`, `previousMembershipId`, efecto o fecha controlable por payload Owner.

El ownership se valida al reclamar la decisión, antes del primer efecto de Membresía y en toda llamada pública de consulta, retry o continuación. Si cambia antes de crear la nueva raíz, no hay renovación. Si cambia después del efecto durable, el efecto no se revierte, pero el Owner anterior pierde acceso: no puede consultar, continuar ni terminalizar. Sólo el Owner vigente puede asistir **esa coordinación exacta**; una continuación iniciada por el Owner anterior debe detenerse al volver a cruzar una unidad confirmatoria si la transferencia ya es visible. La asistencia del Owner nuevo no cambia `requestedBy` ni `decidedBy`, que preservan al Owner que reclamó válidamente la decisión, y no permite cambiar target, efecto, hashes ni payload. No hay worker o autoridad sistémica autónoma incorporados por E2-18.

## 6. Modelo de renovación

### 6.1 Distinción de operaciones

| Situación | Efecto | Identidad | Temporada | Períodos |
| --- | --- | --- | --- | --- |
| No existe raíz previa | `CREATE_MEMBERSHIP` | Nueva primera raíz | Abierta actual | Período 1 abierto |
| Última raíz finalizada pertenece a la abierta actual | `REACTIVATE_MEMBERSHIP` | Misma raíz | Misma Temporada | Nuevo Período, ordinal siguiente |
| Última raíz finalizada pertenece a una Temporada cerrada | `RENEW_MEMBERSHIP` | **Nueva raíz** | Abierta actual | Período 1 abierto |

CU-029 no extiende el Período anterior, no reactiva la raíz anterior y no crea una relación paralela distinta de Membresía. Crea una nueva Membresía enlazada a la predecesora inmediata.

### 6.2 Temporadas intermedias

No se exige adyacencia N→N+1. La Temporada de la predecesora puede ser N y la actual N+k. Las Temporadas intermedias sin participación no generan raíces, Períodos ni marcadores. La predecesora siempre es la última raíz autoritativa señalada por el lifecycle guard, nunca una selección del cliente.

## 7. Invariantes

1. A lo sumo una Membresía activa simultánea por Persona–Grupo.
2. El lifecycle guard determinista Persona–Grupo señala exactamente la última raíz canónica del linaje.
3. El active guard existe sólo cuando esa última raíz está activa y apunta a la misma raíz que el lifecycle guard v3.
4. Una renovación sólo parte de la última raíz finalizada; nunca de una raíz desplazada.
5. La Temporada de la predecesora está cerrada y la Temporada destino está abierta al commit.
6. La nueva raíz referencia exactamente a su predecesora inmediata y no a una raíz arbitraria.
7. La predecesora no cambia: `seasonId`, estado, fechas, Períodos, schema y documentos subordinados permanecen íntegros.
8. Toda raíz renovada empieza activa, con Período ordinal 1 abierto, y `fechaIngreso == createdAt == period.startedAt` usando un timestamp autoritativo.
9. `previousMembershipId` es inmutable durante finalización y reactivaciones posteriores de esa raíz.
10. Una reactivación posterior dentro de la misma Temporada opera sobre la raíz renovada; no crea otra raíz.
11. No hay bifurcaciones: un predecesor no puede adquirir dos sucesoras canónicas.
12. Guards, intents y coordinaciones no son historial funcional ni sustituyen las raíces/Períodos.
13. El lifecycle guard nunca retrocede a una raíz anterior durante retry, recuperación o consulta histórica.
14. Solicitud sólo se aprueba después de releer el efecto durable exacto.
15. Un efecto ajeno, una raíz posterior o una activación posterior nunca se adoptan como éxito del intento.
16. Grupo, Persona, Cuenta y Temporadas son contexto leído, no agregado modificado por CU-029.
17. Partido y Torneo no cambian ni se usan para inferir pertenencia.
18. Corrupción, ambigüedad o versión desconocida fallan cerradas y no se reparan en este flujo.

## 8. Schema físico mínimo

### 8.1 Nueva raíz Membresía v4

El nombre físico aprobado es `previousMembershipId`.

**Activa v4 — campos exactos:**

```text
personId
groupId
seasonId
estado = "activa"
fechaIngreso
createdAt
latestPeriodId
periodCount = 1
previousMembershipId
schemaVersion = 4
```

**Finalizada v4:** los mismos campos, `estado = "finalizada"` y `fechaEgreso`; la finalización no elimina `previousMembershipId`.

Reglas de correlación:

- `previousMembershipId != membershipId`;
- la raíz referenciada existe, está finalizada, comparte `personId` y `groupId`, y su `seasonId` identifica una Temporada cerrada;
- la raíz nueva usa la Temporada abierta actual y no copia otros atributos;
- la predecesora puede ser v2, v3 o v4 íntegra;
- v1/v2/v3 siguen siendo legibles bajo sus schemas exactos;
- una primera alta continúa como v3 sin `previousMembershipId`; sólo una renovación crea v4.

Una v4 se finaliza sólo por E2-05/E2-10/E2-12: cierra su último Período, agrega `fechaEgreso`, conserva `previousMembershipId`, elimina active guard y deja lifecycle v3 `finalized` apuntando a esa misma raíz/ordinal. Mientras esa misma Temporada continúe abierta, E2-09 puede reactivarla: elimina `fechaEgreso`, abre el Período siguiente, conserva `previousMembershipId`, recrea active guard v2 y actualiza lifecycle v3 a `active`. No crea otra raíz. Si permanece finalizada cuando su Temporada ya está cerrada y existe una nueva Temporada abierta, esa v4 sí puede ser la predecesora inmediata de una renovación posterior; el nuevo enlace siempre es uno-a-uno hacia atrás y la autoridad sigue siendo el lifecycle guard.

La versión es v4, y no una variante de v3, porque v3 tiene schema cerrado y representa una raíz sin enlace de predecesora. Agregar `previousMembershipId` cambia el conjunto exacto de campos y la semántica de identidad histórica; conservar `schemaVersion = 3` haría que readers v3 aceptaran dos formas incompatibles o ignoraran lineage.

### 8.2 Matriz exacta de raíces y capacidades

| Versión / estado | Campos obligatorios exactos | Campos prohibidos | Significado |
| --- | --- | --- | --- |
| v1 activa | `personId`, `groupId`, `seasonId`, `estado`, `fechaIngreso`, `createdAt`, `schemaVersion = 1` | `fechaEgreso`, `latestPeriodId`, `periodCount`, `previousMembershipId` y cualquier extra | raíz activa legacy sin Períodos materializados |
| v2 finalizada | campos v1 más `fechaEgreso`, `estado = "finalizada"`, `schemaVersion = 2` | `latestPeriodId`, `periodCount`, `previousMembershipId` y cualquier extra | raíz finalizada legacy; su único intervalo se deriva de ingreso/egreso sólo durante una transición autorizada |
| v3 activa | campos v1 más `latestPeriodId`, `periodCount >= 1`, `schemaVersion = 3` | `fechaEgreso`, `previousMembershipId` y cualquier extra | raíz sin predecesora con Períodos materializados |
| v3 finalizada | campos v3 más `fechaEgreso`, `estado = "finalizada"` | `previousMembershipId` y cualquier extra | misma raíz v3 con último Período cerrado |
| v4 activa | campos activos de 8.1, incluido `previousMembershipId`, `schemaVersion = 4` | `fechaEgreso` y cualquier extra | raíz nacida por renovación, con predecesora inmediata |
| v4 finalizada | campos activos v4 más `fechaEgreso`, `estado = "finalizada"` | cualquier extra | misma raíz renovada finalizada; conserva predecesora |

No existen v1 finalizada, v2 activa ni v4 sin `previousMembershipId` válidas. Todos los schemas son cerrados. En v3/v4, `latestPeriodId` es el ID determinista del Período `periodCount`; activa exige exactamente un Período abierto, el último, y finalizada exige cero abiertos y `latestPeriod.endedAt == fechaEgreso`.

| Capacidad | v1 activa | v2 finalizada | v3 activa | v3 finalizada | v4 activa | v4 finalizada |
| --- | --- | --- | --- | --- | --- | --- |
| Hidratador raíz/repositorio | lee exacta | lee exacta | lee exacta | lee exacta | **agregar lectura exacta** | **agregar lectura exacta** |
| E2-03 alta owner/self | recupera su alta exacta; puede finalizarse luego | bloquea alta: requiere Solicitud | recupera su alta exacta | bloquea alta: requiere Solicitud | bloquea alta | bloquea alta |
| E2-04 actuales | lista si active guard v1 correlaciona | no lista | lista si active guard v2 correlaciona | no lista | lista si active guard v2 + lifecycle v3 activo correlacionan | no lista |
| E2-05/E2-10/E2-12 finalización | eleva a v3 y materializa/cierra Período 1 | no modifica salvo recovery exacto histórico | cierra último Período | no modifica salvo recovery exacto | cierra último Período y preserva `previousMembershipId` | no modifica salvo recovery exacto |
| CU-032 preparación | `ACTIVE_MEMBERSHIP_EXISTS` | reactivación si misma Temporada abierta; renovación si cerrada | `ACTIVE_MEMBERSHIP_EXISTS` | reactivación si misma Temporada abierta; renovación si cerrada | `ACTIVE_MEMBERSHIP_EXISTS` | reactivación si misma Temporada abierta; renovación si cerrada |
| E2-09 reactivación | no aplica por activa | eleva la misma raíz a v3 | no aplica por activa | reactiva la misma raíz v3 | no aplica por activa | reactiva la misma raíz v4 y conserva `previousMembershipId` |
| E2-11 roster | lista si íntegra y de Temporada abierta actual | no lista | lista si íntegra y de Temporada abierta actual | no lista | lista si íntegra y de Temporada abierta actual | no lista |
| E2-15 cierre | detecta y bloquea si activa íntegra | ignora por finalizada | detecta/valida y bloquea | ignora por finalizada | **detecta/valida y bloquea** | ignora por finalizada |

“Lee” nunca significa aceptar campos desconocidos. Las capacidades que mutan v4 deben reconstruir el documento desde el schema v4 correspondiente y copiar `previousMembershipId` sin alterarlo; no pueden proyectarlo mediante un DTO v3 que lo descarte.

### 8.3 Período y active guard

- Período de Vigencia conserva schema vigente y se crea como ordinal 1 abierto bajo la nueva raíz.
- active guard conserva schema v2 exacto: `membershipId`, `personId`, `groupId`, `seasonId`, `activationOrdinal`, `activatedAt`, `activationIdempotencyHash`, `activationRequestHash`, `guardVersion = 2`; no admite `previousMembershipId` ni campos extra. Para v4, `activationOrdinal = 1`, `activatedAt == fechaIngreso == createdAt == period.startedAt`, `activationIdempotencyHash` deriva de decision intent + target + ordinal y `activationRequestHash` es el effect hash que cubre request, Persona, Grupo, Temporada, target, predecesora, ordinal y `RENEW_MEMBERSHIP`.
- no se crea un receipt adicional: decision intent, coordinación, active guard, raíz y Período proporcionan correlación durable suficiente.

### 8.4 Lifecycle guard v3

El documento es `membershipLifecycleGuards/{membershipLifecycleGuardId(groupId, personId)}`; el ID conserva la derivación determinista SHA-256 length-prefixed ya vigente y no constituye autoridad por sí mismo. Existe como máximo uno por Persona–Grupo. El lifecycle guard deja de desaparecer durante el estado activo. Sus variantes exactas son:

**Puntero activo:**

```text
membershipId
personId
groupId
seasonId
rootState = "active"
lastActivationOrdinal
lifecycleGuardVersion = 3
```

**Puntero finalizado:** los mismos campos con `rootState = "finalized"` y `finalizedAt` obligatorio.

Cada campo responde a una invariante:

- IDs: correlación del par y acceso directo O(1) a la última raíz;
- `seasonId`: correlación cerrada con la raíz y el contexto temporal;
- `rootState`: distingue puntero activo/finalizado y define si debe coexistir active guard;
- `lastActivationOrdinal`: ordinal del último Período de Vigencia dentro de **la raíz apuntada**; coincide con `root.periodCount` y `latestPeriod.ordinal`. No cuenta raíces, generaciones ni renovaciones;
- `finalizedAt`: sólo en estado finalizado y coincidente con raíz/último Período;
- versión: lectura exacta y compatibilidad explícita.

En variante activa, `finalizedAt` está prohibido; en variante finalizada es obligatorio. En ambas están prohibidos `previousMembershipId`, hashes, arrays, contador de raíces, historial, backlinks y cualquier campo extra. El guard no sustituye Persona ni Grupo: sus IDs deben existir en el contexto ya validado, coincidir con el ID determinista y con la raíz apuntada; no concede permisos.

### 8.5 Estados compatibles y transición sin backfill

Los schemas históricos también permanecen cerrados:

| Lifecycle | Campos exactos | Significado |
| --- | --- | --- |
| v1 | `membershipId`, `personId`, `groupId`, `seasonId`, `creationIdempotencyKeyHash`, `creationRequestHash`, `finalizedAt`, `lifecycleGuardVersion = 1` | puntero de finalización legacy a una raíz v2; hashes describen su creación original |
| v2 | `membershipId`, `personId`, `groupId`, `seasonId`, `lastActivationOrdinal`, `finalizedAt`, `lifecycleGuardVersion = 2` | puntero de finalización a una raíz v3 y su último Período cerrado |
| v3 active | campos de 8.4 sin `finalizedAt`, `rootState = "active"` | última raíz autoritativa activa; coexiste con active guard correlacionado |
| v3 finalized | campos de 8.4 con `finalizedAt`, `rootState = "finalized"` | última raíz autoritativa finalizada; no coexiste con active guard |

Todo campo no listado está prohibido. v1/v2 nunca representan una raíz activa y sólo pueden apuntar respectivamente a v2/v3 finalizadas; v3 puede apuntar a raíz v3 o v4 según el schema exacto de ésta.

| Estado persistido | Validez |
| --- | --- |
| active guard v1/v2 sin lifecycle | Legacy activo válido si raíz y cardinalidad activa correlacionan |
| lifecycle v1/v2 finalizado sin active guard | Legacy finalizado válido; puede ser predecesora de la primera renovación |
| active guard v2 + lifecycle v3 `active`, misma raíz | Estado canónico nuevo activo |
| lifecycle v3 `finalized` sin active guard | Estado canónico nuevo finalizado |
| active guard + lifecycle v1/v2 | Incompatible |
| lifecycle v3 `active` sin active guard, o IDs/estado distintos | Incompatible |

Las escrituras autorizadas elevan sólo el par tocado; no hay backfill. Altas nuevas E2-03/CU-032 crean lifecycle v3 activo junto con el active guard. Finalización de legacy activo crea lifecycle v3 `finalized`; finalización nueva actualiza el mismo guard. Reactivación desde lifecycle v1/v2 lo reemplaza atómicamente por v3 `active`; desde v3 lo actualiza. Renovación desde lifecycle v1/v2/v3 escribe sobre **el mismo documento determinista** una v3 activa que apunta a la raíz nueva. Esa transacción también crea raíz v4, Período 1 y active guard v2; si falla, no cambia ninguno.

La resolución cerrada es:

| Observación | Resultado |
| --- | --- |
| No existe guard y no existe raíz del par en las consultas acotadas de activa/finalizada | ausencia válida; sólo `CREATE_MEMBERSHIP` |
| Lifecycle v1/v2 apunta a única raíz finalizada correlacionada | legado válido; reactivar o renovar según la Temporada |
| Lifecycle v3 apunta a raíz finalizada y no hay active guard | finalizada válida |
| Lifecycle v3 apunta a raíz activa y active guard v2 coincide | activa válida |
| Cualquier lifecycle apunta a raíz activa bajo una combinación no admitida | `MEMBERSHIP_INCOMPATIBLE_STATE` |
| Guard y raíz discrepan en ID, Persona, Grupo, Temporada, estado, ordinal o timestamps | `MEMBERSHIP_INCOMPATIBLE_STATE` |
| Guard apunta a raíz histórica desplazada o la consulta defensiva encuentra sucesora no reflejada | `MEMBERSHIP_PREDECESSOR_INCOMPATIBLE` |
| Existen una o más raíces pero falta lifecycle, salvo el estado legacy activo expresamente admitido con active guard | `MEMBERSHIP_INCOMPATIBLE_STATE`; no se elige la “más nueva” por query |
| `lifecycleGuardVersion` o schema de raíz futuro/desconocido | `MEMBERSHIP_INCOMPATIBLE_STATE` |

CU-029 no crea guards faltantes para raíces existentes, no corrige punteros y no adopta huérfanas. Las consultas `limit(2)` sólo demuestran ausencia/presencia o ambigüedad en los casos legacy; nunca ordenan ni seleccionan una raíz autoritativa.

## 9. Lineage y selección acotada de predecesora

Para una decisión nueva, la selección se resuelve así:

1. leer por ID determinista el lifecycle guard Persona–Grupo;
2. leer por `membershipId` la raíz señalada;
3. validar que la raíz comparte Persona y Grupo, está finalizada, que su Temporada está cerrada, que no es la Temporada abierta actual y que no existe active guard;
4. validar schema, Períodos, ordinal y timestamps del guard contra la raíz;
5. para lifecycle v1/v2, conservar la comprobación acotada que admite sólo la única finalizada representable por ese modelo;
6. consultar `previousMembershipId == predecessorId`, con `limit(2)`, para detectar una sucesora ya confirmada que vuelva obsoleto el puntero, o reconocer exclusivamente el target fijado durante recovery.

El lifecycle guard es la única autoridad para determinar la predecesora de una decisión nueva. En recovery no se vuelve a elegir: la coordinación fija `previousMembershipId` y target, y el lifecycle guard debe apuntar al target exacto si el efecto ya confirmó, o todavía a la predecesora exacta si no confirmó. Cualquier tercer estado falla cerrado. La consulta de sucesoras no selecciona raíz, no desempata y no constituye una segunda fuente de verdad: es sólo un detector defensivo de bifurcación o de estado desplazado. Una escritura canónica no puede crear una raíz posterior sin leer y escribir el lifecycle guard determinista; ésa es la garantía primaria. La consulta usa únicamente `previousMembershipId == predecessorId`, sin filtros por `personId`, `groupId`, estado o schema y sin orden; cada documento materializado se hidrata y correlaciona luego. Una raíz manipulada fuera de los contratos no se incorpora ni se repara: cualquier divergencia observada falla cerrada.

E2-18 no recorre recursivamente la cadena ni la expone. Esa consulta pertenece a E2-19.

## 10. Matriz de estados y efectos

| Último estado autoritativo | Temporada de la raíz | Efecto |
| --- | --- | --- |
| Sin raíz | — | `CREATE_MEMBERSHIP` |
| Finalizada | abierta actual | `REACTIVATE_MEMBERSHIP` |
| Finalizada | cerrada anterior | `RENEW_MEMBERSHIP` |
| Activa | cualquiera | `ACTIVE_MEMBERSHIP_EXISTS` |
| Ambiguo/corrupto | — | error estable fail-closed |

Esta derivación ocurre dentro del claim con Solicitud pendiente, pending guard, decision intent/alias, Grupo/ownership, Persona, open-season guard y lifecycle revalidados. El backend fija target, Temporada, efecto y hashes; el cliente sólo aporta `groupId`, `requestId` y clave. Una coordinación histórica v2 conserva `CREATE_MEMBERSHIP` o `REACTIVATE_MEMBERSHIP` y su target original durante recovery; nunca se promueve a renovación. La coordinación v3 es necesaria únicamente para fijar además `previousMembershipId` en `RENEW_MEMBERSHIP`. Ésta es la adaptación mínima de CU-032: no cambia creación, cancelación, rechazo, listado general ni autoridad de Solicitud fuera de agregar el tercer efecto y su terminalización.

| Última raíz / contexto al confirmar | Efecto derivado | Resultado |
| --- | --- | --- |
| Sin raíz, sin guards ni Membresía huérfana | `CREATE_MEMBERSHIP` | Alta inicial vigente |
| Activa íntegra en la Temporada abierta | Ninguno | `ACTIVE_MEMBERSHIP_EXISTS`; Solicitud continúa pendiente |
| Finalizada íntegra en la Temporada abierta actual | `REACTIVATE_MEMBERSHIP` | E2-09, misma raíz y ordinal siguiente |
| Finalizada íntegra en una Temporada cerrada y existe otra abierta actual | `RENEW_MEMBERSHIP` | E2-18, nueva raíz v4 y ordinal 1 |
| Finalizada en Temporada cerrada, sin Temporada abierta actual | Ninguno | `OPEN_SEASON_REQUIRED` |
| Finalizada cuya Temporada no está cerrada ni es la abierta actual | Ninguno | `MEMBERSHIP_PREDECESSOR_INCOMPATIBLE` |
| Lifecycle apunta a raíz activa pero active guard falta/no coincide | Ninguno | `MEMBERSHIP_INCOMPATIBLE_STATE` |
| Lifecycle apunta a raíz desplazada, hay bifurcación/sucesora ajena o múltiples activas | Ninguno | `MEMBERSHIP_PREDECESSOR_INCOMPATIBLE` |
| No hay lifecycle pero existen raíces del par | Ninguno | `MEMBERSHIP_INCOMPATIBLE_STATE` |
| Target exacto ya creado y todavía activo con ordinal 1 | Recuperación | Confirmar la Solicitud sin nueva escritura de Membresía |
| Target exacto creado pero su ordinal 1 fue cerrado antes de confirmar Solicitud | Ninguno nuevo | `MEMBERSHIP_RENEWAL_SUPERSEDED`; Solicitud pendiente |
| Target exacto fue luego reactivado o existe una raíz posterior | Ninguno nuevo | El intento viejo recupera su outcome histórico; nunca modifica/adopta el estado posterior |

`MEMBERSHIP_RENEWAL_SUPERSEDED` consume el decision intent exacto y elimina la coordinación; no elimina la Solicitud ni su pending guard. El intento viejo queda terminal y nunca crea otra raíz ni reactiva. Desde ese estado hay salidas funcionales concretas:

- el Owner vigente puede rechazar la Solicitud porque ya no existe coordinación en curso;
- la candidata puede cancelarla por la misma razón;
- el Owner vigente puede iniciar una nueva aprobación con clave nueva; backend deriva nuevamente desde estado actual;
- no puede crearse otra Solicitud mientras ésta siga pendiente; después de rechazo/cancelación, una nueva Solicitud sigue el contrato ordinario;
- si la raíz renovada está finalizada y su Temporada continúa abierta, la nueva aprobación es `REACTIVATE_MEMBERSHIP` sobre esa raíz, no otra renovación;
- si esa Temporada ya cerró y existe otra abierta, una nueva aprobación válida puede producir una renovación posterior cuya predecesora es la raíz v4 ahora autoritativa.

Así, la historia confirmada se preserva y la Solicitud no queda permanentemente irresoluble. “Retry exacto” sólo recupera `MEMBERSHIP_RENEWAL_SUPERSEDED`; las demás acciones son intenciones nuevas sujetas a autorización y precondiciones actuales.

## 11. Contrato público y coordinación

### 11.1 Superficie pública

Se conservan las callables E2-07/E2-09:

- `listPendingGroupJoinRequests` amplía `approvalEffect` con `RENEW_MEMBERSHIP`;
- `approveGroupJoinRequest` conserva payload cerrado `{ groupId, requestId, idempotencyKey }`;
- la consulta de resultado reconoce renovaciones aprobadas y outcomes consumidos;
- no se agrega callable pública de renovación.

El `approvalEffect` de la lista es informativo y puede quedar obsoleto; la aprobación lo deriva de nuevo transaccionalmente. Ningún ID interno de linaje se expone al frontend.

### 11.2 Flujo definitivo

1. Identificar la Solicitud exacta por `groupId` y `requestId`.
2. Releer Cuenta del actor, Grupo, ownership, Solicitud, pending guard, Persona y decision intent.
3. Releer la Temporada abierta actual; la Solicitud no conserva una Temporada elegida al crearse.
4. Derivar `CREATE_MEMBERSHIP`, `REACTIVATE_MEMBERSHIP` o `RENEW_MEMBERSHIP` desde el estado autoritativo.
5. Para renovación, crear/recuperar coordinación v3 con target nuevo predeterminado y predecesora exacta.
6. En transacción de Membresía, revalidar Owner previo al primer efecto, Grupo activo, Temporada destino abierta, predecesora, su Temporada cerrada, Períodos, guards y ausencia de sucesora.
7. Crear atómicamente raíz v4, Período 1, active guard v2 y lifecycle guard v3 avanzado.
8. En unidad Solicitud, reautorizar al actor contra `ownerId` vigente, releer coordinación e intento y confirmar que la activación exacta sigue abierta.
9. Sólo entonces escribir Solicitud `aprobada`, consumir decision intent como `APPROVED`, retirar pending guard y coordinación.
10. Ante respuesta perdida, releer intent/coordinación/target exactos y converger sin duplicar raíces.

### 11.3 Persistencia de Solicitud y coordinación

- Solicitud aprobada por renovación usa schema v4 con los mismos campos funcionales de aprobada v3, permitiendo `approvalEffect: "RENEW_MEMBERSHIP"`, `membershipActivationOrdinal: 1`, `membershipId` target y `seasonId` destino. No duplica `previousMembershipId`: la raíz es su fuente.
- Coordinación de renovación v3 contiene exactamente: `requestId`, `personId`, `groupId`, `seasonId`, `decisionIntentId`, `requestedBy`, `approvalEffect`, `membershipId`, `previousMembershipId`, `expectedActivationOrdinal`, `createdAt`, `coordinationVersion`.
- Para renovación, `approvalEffect == "RENEW_MEMBERSHIP"` y `expectedActivationOrdinal == 1`.
- Coordinaciones v2 existentes de alta/reactivación conservan su interpretación y recovery; no se reinterpretan como renovación.
- Decision intent v3 conserva identidad actor+clave, request hash y estado pending/consumed, y admite outcomes de renovación. Intents v1/v2 históricos siguen legibles bajo su enum original y nunca se reinterpretan. Una asistencia del Owner nuevo usa la coordinación canónica ya reclamada; no crea un intent alternativo que compita con ella.

### 11.4 DTO público mínimo

Éxito conserva `outcome: "APPROVED"` y el resumen necesario de Solicitud/Membresía ya vigente. La UI puede recibir `approvalEffect` y la Temporada destino presentable, pero no recibe `previousMembershipId`, hashes, paths, guard versions, ordinales internos distintos del ya normado ni metadata de coordinación.

## 12. Idempotencia y recuperación

- **Identidad del intento público:** UID del actor + `idempotencyKey` normalizada, como E2-07/E2-09.
- **Identidad del decision intent:** ID determinista de UID autenticado + clave normalizada; identifica la decisión pública, no la raíz.
- **Request hash público:** versión contractual, `requestId`, `personId` autoritativo de la Solicitud, `groupId` y acción `approve`; la misma clave con otro payload/contexto produce `IDEMPOTENCY_CONFLICT`.
- **Identidad de coordinación:** documento determinista por `requestId`, ligado al decision intent canónico; fija efecto, target, predecesora, Temporada y ordinal.
- **Identidad de la nueva Membresía:** `membershipId` generado por backend una vez al reclamar y persistido en la coordinación; no se vuelve a generar en retry.
- **Identidad del efecto:** `decisionIntentId`, `membershipId` target predeterminado, `previousMembershipId`, `seasonId` destino, ordinal 1 y efecto `RENEW_MEMBERSHIP`.
- **Hash del efecto:** se deriva de todos esos valores y persiste como `activeMembershipGuard.activationRequestHash`; nunca depende de una selección cliente. La coordinación permite recalcularlo y compararlo durante recovery.
- **Resultado durable:** raíz v4 + Período 1 + guards correlacionados; es independiente del estado terminal posterior de la Solicitud.
- **Estado terminal de Solicitud:** `aprobada` v4 + intent consumido `APPROVED`; se confirma sólo tras releer el efecto exacto y no es sustituible por la mera existencia de una activa.
- **Retry antes del efecto:** recupera la misma coordinación y el mismo target.
- **Retry después del efecto y antes de aprobar Solicitud:** valida target, enlace, Período y guards exactos; no crea otra raíz.
- **Retry después de aprobación:** recupera la Solicitud terminal y el mismo DTO sin releer el estado actual para reatribuir otro efecto.
- **Payload conflictivo:** falla sin tocar Solicitud, Membresía ni guards.
- **Fallo transitorio o dependencia no disponible:** deja Solicitud e intent/coordinación recuperables cuando no hubo contradicción durable.
- **Fallo estable de precondición:** consume el intento con outcome estable y deja Solicitud pendiente; un cambio posterior requiere nueva confirmación y clave.
- **Activación superada:** consume `MEMBERSHIP_RENEWAL_SUPERSEDED`, elimina la coordinación y mantiene Solicitud pendiente; un retry viejo devuelve ese outcome aunque luego haya otra activación.

La recuperación nunca hace retroceder lifecycle guard ni convierte «existe una Membresía activa» en prueba de que pertenece al intento. Un retry histórico reconoce su target por coordinación, hashes, predecesora, Temporada y ordinal aunque el estado actual haya avanzado; devuelve su outcome histórico sin adoptar otra raíz ni reabrir una activación cerrada. Una renovación posterior legítima requiere otra Solicitud/decisión o una nueva decisión permitida sobre la Solicitud aún pendiente, clave nueva y coordinación nueva después de liberar la anterior.

### 12.1 Autorización durante recovery

| Situación | Owner anterior | Owner vigente | Candidata |
| --- | --- | --- | --- |
| Efecto ya confirmado y Solicitud terminal | no puede consultar tras transferir | puede consultar el resultado terminal | usa sólo sus superficies propias ya vigentes |
| Respuesta perdida con Solicitud terminal | no recupera por callable Owner tras transferir | recupera el mismo resultado | no obtiene autoridad Owner |
| Coordinación incompleta antes del efecto | no continúa tras transferir | puede asistir la coordinación exacta, sujeta a todas las precondiciones | cancelación sigue bloqueada mientras exista coordinación |
| Efecto durable confirmado, Solicitud pendiente | no continúa ni terminaliza tras transferir | puede continuar y terminalizar la coordinación exacta | no cancela mientras la coordinación siga reclamada |
| Coordinación liberada por outcome superseded | no decide tras transferir | puede rechazar o iniciar una nueva aprobación | puede cancelar la Solicitud pendiente |

La inmutabilidad del efecto durable sólo prohíbe rollback: no prolonga la autorización del actor. Cada entrada pública (`approve`, consulta de resultado, listado/recovery y rechazo) revalida Cuenta y ownership. La unidad terminal revalida ownership cuando todavía actúa en nombre de una llamada Owner; si detecta transferencia, conserva efecto, Solicitud, intent y coordinación y devuelve `GROUP_NOT_ACCESSIBLE`. El Owner vigente puede continuar sin alterar `requestedBy`/`decidedBy`.

## 13. Concurrencia

| Carrera | Serialización / outcome |
| --- | --- |
| Renovación vs otra renovación de Solicitudes distintas | Ambas leen y escriben el **mismo lifecycle guard Persona–Grupo**. Firestore reintenta la transacción que leyó una versión desplazada; al releer observa la nueva raíz activa/guard y no puede crear otra sucesora. Intents y coordinaciones son distintos y no aportan esta garantía |
| Dos aprobaciones de la misma Solicitud | pending guard, decision intent y coordinación determinista por `requestId` son comunes; mismo intento recupera, otro informa conflicto/en curso |
| Renovación vs cierre de Temporada destino | renovación lee open-season guard y Temporada; cierre toca ese contexto y además exige cero activas. Sólo un orden serializable confirma |
| Renovación vs apertura/cierre concurrente | el destino se deriva y revalida al commit; nunca se conserva el `seasonId` de creación de Solicitud |
| Renovación vs finalización/salida | si finalización ocurre después de crear y antes de fase terminal, `MEMBERSHIP_RENEWAL_SUPERSEDED`; no rollback global |
| Renovación vs aprobación que reactiva | lifecycle guard y active guard impiden que dos efectos distintos reclamen el mismo estado |
| Renovación vs transferencia de ownership | Grupo se lee dentro de cada unidad confirmatoria. Antes del efecto, el ex Owner no escribe; después del efecto, éste permanece pero el ex Owner no continúa. Sólo el Owner vigente puede asistir la coordinación exacta |
| Respuesta perdida | intent/coordinación/target exactos permiten replay sin duplicación |

La transacción de Membresía realiza primero todas sus lecturas y después sus escrituras. Antes de escribir lee, como documentos directos, Grupo, open-season guard, Temporada destino, active guard, lifecycle guard, predecesora, Temporada de predecesora, target fijado y los Períodos primero/último necesarios; lee consultas acotadas de activas, Períodos abiertos y sucesoras, y sólo para lifecycle legacy la finalizada del par. Cada query materializa como máximo 2 documentos, excepto el bloqueo de cierre E2-15 que usa `limit(1)`. El presupuesto contractual máximo es 20 snapshots materializados —incluidos documentos directos ausentes y hasta dos resultados por query— y exactamente 4 escrituras en éxito: crea raíz v4, crea Período 1, crea active guard v2 y reemplaza lifecycle guard por v3 activa. No escribe predecesora ni coordinación.

La unidad de claim lee Solicitud, pending guard, decision intent/alias, coordinación, Grupo/ownership, Persona y contexto de Membresía/Temporada antes de crear como máximo decision intent y coordinación: presupuesto máximo 24 snapshots y 2 escrituras. La unidad terminal lee esos documentos, Grupo/ownership y la activación exacta antes de actualizar Solicitud e intent y eliminar pending guard y coordinación: presupuesto máximo 12 snapshots y 4 escrituras. Son topes de diseño verificables en pruebas de infraestructura; excederlos o agregar otra query obliga a justificar y revisar índices/alcance. No se introduce transacción global entre Solicitud y Membresía, query sin límite ni recorrido de lineage.

`limit(2)` sólo acota y detecta cardinalidad incompatible. No impide dos commits: la no bifurcación proviene de que toda renovación válida lee y escribe el lifecycle guard determinista común, incluso cuando las Solicitudes, intents y coordinaciones sean diferentes.

## 14. Lecturas acotadas e índices

Todas las lecturas del comando quedan acotadas:

- documentos directos: Solicitud, pending guard, decision intent, coordinación, Grupo, Persona/Cuenta contextual, open-season guard, Temporada, lifecycle guard, raíz señalada y target;
- consultas `limit(2)`: activas Persona–Grupo, Períodos abiertos y sucesoras por `previousMembershipId`;
- lecturas directas de primer/último Período por IDs deterministas.

No se consulta «todas las Membresías finalizadas». `finalizedPairQuery` queda sólo para validar estados legacy que, por definición anterior, admitían una única finalizada; los paths v3 usan el puntero directo.

**Configuración local verificada:** `volley-ranking-system/firestore.indexes.json` tiene `fieldOverrides: []`; por lo tanto no excluye `memberships.previousMembershipId` de la indexación automática. La consulta aprobada es exactamente un filtro de igualdad `previousMembershipId == predecessorId` más `limit(2)`, sin filtros de `personId`, `groupId`, estado o schema y sin `orderBy`; no requiere índice compuesto nuevo. La correlación de esos campos se hace después sobre los hasta dos documentos materializados. Los compuestos actuales se conservan para activas/finalizadas y listados existentes. Si la implementación combina filtros u orden, deberá agregar y probar el compuesto correspondiente y volver a revisión documental.

El Emulator usa la configuración local y puede demostrar compatibilidad de la consulta con esa configuración; no demuestra que la indexación automática o los compuestos estén desplegados en un proyecto remoto. E2-18 no accede a Firebase remoto ni afirma ese despliegue; la verificación/despliegue remoto queda para una autorización posterior.

## 15. Compatibilidad y adaptaciones necesarias

| Incremento / componente | Adaptación sin cambio de significado |
| --- | --- |
| E2-03 alta owner/self | Primera alta sigue creando raíz v3; agrega lifecycle v3 `active`. Si existe linaje finalizado no renueva ni crea otra raíz: exige flujo por Solicitud |
| E2-04 mis grupos actuales | Sigue listando sólo activas v1/v3/v4. Para v4 exige active guard v2 y lifecycle v3 activo coincidentes; nunca proyecta finalizadas ni pierde `previousMembershipId` al hidratar, aunque el DTO no lo exponga |
| E2-05 finalización owner/self | Acepta legacy activo o estado nuevo; actualiza/crea lifecycle v3 `finalized`, elimina active guard y no exige unicidad de todas las finalizadas |
| E2-09 aprobación/reactivación | Deriva reactivación sólo si última raíz finalizada pertenece a la abierta actual; deriva renovación si pertenece a cerrada. Coordinaciones v2 en curso conservan outcome original |
| E2-10 salida propia | Finaliza sólo la raíz activa señalada, reconstruye v4 finalizada preservando `previousMembershipId`, actualiza lifecycle v3 y deja raíces históricas intactas |
| E2-11 roster Owner | Continúa consultando activas v1/v3/v4 de la Temporada actual; para v4 correlaciona ambos guards y no expone historia ni descarta lineage durante hidratación |
| E2-12 finalización administrativa | Finaliza el target activo exacto; si es v4 preserva `previousMembershipId`, actualiza lifecycle v3 y nunca toma una finalizada histórica como target |
| E2-15 cierre | Su query `groupId + estado=activa + limit(1)` hidrata v1/v3/v4. Para v4 valida Período, active guard v2 y lifecycle v3 activo coincidentes; cualquier activa o inconsistencia bloquea. Tras finalización explícita ya no hay activa y puede cerrar sin leer lineage |
| Readers/hydrators | Incorporan raíz v4 y lifecycle v3 con schemas exactos; v1/v2/v3 y guards v1/v2 siguen legibles |
| Rules | Mantienen deny-all cliente; no hay nueva colección pública ni permiso por rol global |

Los chequeos actuales que deben retirarse o especializarse son los que consideran incompatible: `activeGuard && lifecycle`, `finalizedPair.size > 1`, exactamente una finalizada global o ausencia de lifecycle durante una activa nueva. Se reemplazan por las combinaciones válidas de la sección 8.5 y por correlación directa con la última raíz.

No se cambia el significado de ninguna consulta actual: sólo se elimina la suposición física de que el par Persona–Grupo puede tener una única raíz finalizada durante toda su historia.

### 15.1 Compatibilidad específica con E2-15

E2-15 no usa `previousMembershipId` ni recorre predecesoras. Su capacidad de Membresía debe reconocer v4 mediante el hidratador exacto, comprobar `groupId`, `seasonId`, estado activo, integridad del último Período, active guard v2 y lifecycle v3 `active` sobre la misma raíz/ordinal. Si encuentra una v4 activa devuelve `active` y el cierre falla; si cualquier correlación es inválida devuelve clasificación fail-closed y el cierre también falla. Sólo después de la finalización explícita —raíz v4 finalizada, último Período cerrado, active guard eliminado y lifecycle v3 `finalized`— la query de activas queda vacía y el cierre puede continuar.

El cierre de Temporada no escribe Membresías ni guards de Membresía, no necesita interpretar el lineage y deja byte-equivalentes todas las raíces ya finalizadas. En la carrera renovación–cierre, renovación lee open-season guard y Temporada dentro de su transacción; cierre lee/elimina ese mismo open-season guard y consulta activas. Si renovación confirma primero, el retry del cierre observa la activa v4 y bloquea. Si cierre confirma primero, el retry de renovación observa guard ausente/Temporada cerrada y no crea la raíz. No queda una v4 activa en Temporada cerrada.

## 16. Errores y outcomes estables

| Outcome/reason | Semántica pública |
| --- | --- |
| `APPROVED` + `CREATE_MEMBERSHIP` | Alta inicial confirmada |
| `APPROVED` + `REACTIVATE_MEMBERSHIP` | Misma raíz reactivada en la misma Temporada |
| `APPROVED` + `RENEW_MEMBERSHIP` | Nueva raíz creada en la Temporada abierta |
| `ACTIVE_MEMBERSHIP_EXISTS` | Ya existe pertenencia activa; no se aprueba esta Solicitud |
| `MEMBERSHIP_INCOMPATIBLE_STATE` | Guards/raíz/Períodos/cardinalidad incompatibles |
| `OPEN_SEASON_REQUIRED` | No existe Temporada abierta aplicable |
| `MEMBERSHIP_PREDECESSOR_INCOMPATIBLE` | La supuesta última raíz no es una predecesora finalizada válida de Temporada cerrada |
| `MEMBERSHIP_RENEWAL_SUPERSEDED` | El target del intento fue creado pero su activación inicial ya terminó antes de confirmar Solicitud |
| `APPROVAL_IN_PROGRESS` | Existe coordinación compatible todavía no terminal |
| `IDEMPOTENCY_CONFLICT` | Misma clave con payload distinto |
| `GROUP_NOT_ACCESSIBLE` | No autenticado/no Owner/ownership perdido, sin enumeración |
| `DEPENDENCY_UNAVAILABLE` | Dependencia temporalmente no disponible; retry seguro |

`MEMBERSHIP_SEASON_NOT_REACTIVATABLE` se conserva para coordinaciones E2-09 v2 ya reclamadas y para su historia. En una decisión nueva, el estado «finalizada en Temporada cerrada + Temporada actual abierta» deja de enviarse a reactivación y se deriva como renovación.

Errores no exponen UIDs, `personId`, IDs de guards/intents/coordinaciones, hashes, paths, predecesora ni metadata interna.

## 17. Frontend Owner

`PendingGroupJoinRequestsSection` y su máquina de decisión se adaptan así:

- `CREATE_MEMBERSHIP`: mantiene mensaje de alta inicial;
- `REACTIVATE_MEMBERSHIP`: mantiene mensaje de reactivar la misma Membresía;
- `RENEW_MEMBERSHIP`: muestra «Renovar Membresía y aprobar Solicitud» y advierte que se creará una nueva Membresía para la Temporada actualmente abierta;
- el encabezado común siempre expresa «aprobar el ingreso para la Temporada abierta actual»; la distinción alta/reactivación/renovación sólo se muestra cuando proviene del preview/listado autoritativo íntegro y se presenta como clasificación a revalidar, no como promesa;
- la advertencia no promete una Temporada cacheada: indica que backend la revalidará al confirmar;
- no muestra historia completa —reservada a E2-19—, `previousMembershipId`, selector de Temporada ni selector de raíz;
- conserva diálogo explícito, cancelar sin escritura, clave estable por intento, single-flight, retry de respuesta incierta y refresh autoritativo;
- un cambio de `approvalEffect` tras refresh exige nueva confirmación humana y nueva clave;
- conserva foco, teclado, Escape, `alertdialog`, anuncios `aria-live`, mensajes no dependientes sólo de color, objetivos táctiles y layouts 360/768/escritorio;
- no ofrece acción masiva, invitación, correo ni notificación.

## 18. Seguridad, privacidad y observabilidad

- Sólo Functions/Admin SDK escribe las colecciones implicadas; Rules continúan deny-all.
- Un rol global, array legacy, plan o claim no reemplaza `ownerId` vigente.
- IDs de raíz son referencias opacas, nunca permisos.
- Logs admiten operación, stage, outcome/reason, número de intento transaccional y correlación técnica no reversible.
- Logs prohíben clave cruda, nombres, email, UID/personId, payload completo, hashes persistidos, snapshots, paths y `previousMembershipId`.
- Ningún error transversal permite enumerar Grupos, Personas o Membresías.

## 19. Pruebas requeridas

### 19.1 Dominio y contratos

- hydrate exacto de Membresía v4 activa/finalizada y lifecycle v3 activo/finalizado;
- rechazo de campos faltantes/extra, backlink, array, estado/version cruzados y `previousMembershipId` propio;
- primera alta v3, reactivación misma raíz y renovación nueva raíz claramente diferenciadas;
- predecesora v2/v3/v4 válida, con cero/una/múltiples Temporadas intermedias;
- preservación byte a byte de raíz/Períodos anteriores;
- Período inicial v1, ordinal 1 y timestamps autoritativos;
- payload público cerrado y sin IDs internos;
- DTOs y outcomes mínimos, incluyendo approved v4 e intents/coordinación v3.

### 19.2 Autorización y estados

- Owner vigente, no Owner, ex Owner, admin global sin ownership, no autenticado y dependencia Cuenta ausente;
- Solicitud inexistente, ajena, no pendiente, sin guard o Persona/Cuenta incompatible;
- no raíz, activa, finalizada en abierta actual, finalizada en cerrada, Temporada intermedia y sin abierta;
- lifecycle ausente, v1/v2/v3, raíz ausente, IDs cruzados, `rootState` cruzado, active guard cruzado y schema desconocido;
- dos activas, sucesora ajena, bifurcación y raíz manipulada fallan cerradas.

### 19.3 Persistencia e idempotencia en Emulator

- commit atómico de raíz v4, Período, active guard y lifecycle v3;
- ninguna escritura en predecesora, Grupo, Persona, Cuenta, Temporada, Partido, Torneo, arrays o notificaciones;
- mismo intento antes/después de respuesta perdida produce un único target;
- misma clave/payload distinto produce conflicto;
- dos claves concurrentes y dos Solicitudes concurrentes dejan un solo avance del linaje;
- fallo entre unidad Membresía y unidad Solicitud se recupera;
- target finalizado antes de terminal produce `MEMBERSHIP_RENEWAL_SUPERSEDED` estable;
- retry viejo tras reactivación o renovación posterior no altera el estado actual;
- transferencia antes del efecto impide escribir al ex Owner; transferencia posterior conserva el efecto pero deniega consulta/continuación/terminalización al ex Owner y permite al Owner vigente asistir sólo la coordinación exacta;
- cierre/apertura concurrentes, finalización/salida concurrentes y contención Firestore convergen según la matriz;
- errores ambiguos `code=3` realizan reread autoritativo;
- consultas llevan `limit(2)` y ninguna escala con cantidad histórica;
- Rules niegan cliente y los índices locales soportan las consultas; el informe no atribuye al Emulator evidencia de deploy real.

### 19.4 Regresión focal

- E2-03 alta sin historia y bloqueo ante linaje previo;
- E2-04 sólo actuales;
- E2-05/E2-10/E2-12 finalización sobre raíz activa v3/v4;
- E2-09 reactivación same-season y coordinaciones v2 históricas;
- E2-11 roster activo;
- E2-15 cierre bloqueado por la nueva activa;
- consulta/resultado de Solicitud aprobada histórica v2/v3/v4;
- arquitectura: sin acceso directo entre agregados, sin callable nueva, sin escritura frontend/legacy.

No se exige suite completa durante definición; la implementación futura ejecutará gates unitarios, contractuales, frontend, Rules, índices y Emulator focales y luego la regresión proporcional acordada.

## 20. UAT propuesta

La UAT se ejecutará sólo en Emulator local/proyecto `demo-*`, sin datos Firebase remotos ni integración de la rama Auth/UAT aislada. Una fixture automatizada puede preparar el estado base —Owner A, candidata B, raíz finalizada en Temporada cerrada, otra Temporada abierta y Solicitud pendiente—; preparar manualmente corrupción, carreras o una secuencia artificial de múltiples Temporadas no es requisito UAT.

**Recorrible manualmente:** con el estado base ya preparado, A ve que aprobará el ingreso de B para la Temporada abierta actual y, cuando la clasificación es segura, `RENEW_MEMBERSHIP`; no ve selectores de raíz/Temporada, renovación masiva ni historia completa. Abrir/cancelar confirma cero llamada modificadora. Confirmar muestra single-flight, éxito y refresh. También se recorren foco, teclado, Escape, anuncios y 360/768/escritorio. Un integrante no Owner y un admin global sin ownership no reciben la acción.

**Inspección persistente posterior:** comprobar en Emulator Solicitud aprobada v4, raíz v4 nueva, `previousMembershipId` hacia la predecesora, Período 1 abierto, active guard v2 y lifecycle v3 activos; raíz/Períodos anteriores byte-equivalentes y ausencia de escrituras en Temporadas intermedias, Grupo, Persona, Cuenta, arrays, Actividad y notificaciones. Repetir consulta/resultado verifica que no apareció otro target.

**Emulator exclusivo automatizado:** mismo retry/clave y clave conflictiva; dos Solicitudes/renovaciones concurrentes; respuesta perdida; contención y `code=3`; transferencia antes/después del efecto; corrupción, schemas futuros y guards cruzados; múltiples Temporadas intermedias; cierre/apertura concurrentes; finalización entre efecto y terminalización; `MEMBERSHIP_RENEWAL_SUPERSEDED` y sus salidas posteriores. Estos casos se acreditan con fixtures y tests deterministas, no como recorrido manual.

## 21. Rollback y despliegue futuro

El rollback seguro es lógico, no destructivo:

- deshabilitar temporalmente la derivación de nuevas renovaciones;
- conservar readers de Membresía v4, approved request v4 y lifecycle v3;
- conservar finalización/reactivación de raíces v4 para no dejar activaciones inmanejables;
- no borrar ni reescribir raíces, Períodos, guards, intents o Solicitudes ya confirmadas;
- no volver a una versión que considere `active guard + lifecycle v3 active` corrupción.

Por ello el orden de un despliegue futuro deberá instalar primero compatibilidad de lectura y comandos de ciclo de vida, luego habilitar `RENEW_MEMBERSHIP`, frontend al final. Rules/índices se validarán en gates locales y se desplegarán sólo bajo autorización separada. Esta ficha no autoriza deploy.

## 22. Riesgos y deuda

| Riesgo | Mitigación / deuda explícita |
| --- | --- |
| Readers actuales rechazan múltiples finalizadas | Sustituir cardinalidad histórica por puntero lifecycle en todos los paths inventariados antes de habilitar renewal |
| Lifecycle guard se confunde con historial | Schema sin arrays y acceso sólo a última raíz; E2-19 leerá raíces/Períodos, no el guard como historia |
| Bifurcación por retry/concurrencia | Documento determinista leído/escrito, target fijado en coordinación y consulta de sucesora `limit(2)` |
| Renovación adopta efecto posterior | Correlación por target/predecesora/season/ordinal/hashes y outcomes históricos consumidos |
| Transferencia entre unidades | Reautorización en cada entrada/unidad confirmatoria; efecto durable no revocable, pero ex Owner sin consulta ni continuación y sólo Owner vigente puede asistir |
| UI muestra clasificación obsoleta | Revalidación backend y nueva confirmación si cambia el efecto antes de reclamar |
| Índice asumido como desplegado | Evidencia local separada de evidencia remota; no afirmar deploy por Emulator |
| Estados manipulados fuera de contrato | Fallo cerrado; reparación/backfill fuera de alcance |
| Historia propia aún ausente | E2-19 separado; E2-18 no crea DTO ni pantalla histórica |
| Writers/consumidores legacy | Se mantienen aislados; retiro requiere inventario y sustitución completos en otro corte |

## 23. Criterios de aceptación observables

1. **Dada** una Solicitud pendiente y ninguna raíz previa, **cuando** el Owner aprueba, **entonces** el efecto sigue siendo alta inicial v3, no renovación.
2. **Dada** la última raíz finalizada en la Temporada abierta, **cuando** el Owner aprueba, **entonces** E2-09 reactiva esa raíz y no crea v4.
3. **Dada** la última raíz finalizada en una Temporada cerrada y otra abierta actual, **cuando** el Owner aprueba, **entonces** se crea exactamente una raíz v4 con `previousMembershipId` correcto y Período 1.
4. **Dadas** una o más Temporadas intermedias sin participación, **cuando** se renueva, **entonces** no se crean raíces/Períodos ficticios ni se exige adyacencia.
5. **Dada** una raíz histórica que no es la última, **cuando** se intenta forzarla como predecesora, **entonces** no hay superficie para elegirla y backend falla cerrado.
6. **Dada** una Membresía activa, **cuando** se intenta aprobar otra Solicitud, **entonces** `ACTIVE_MEMBERSHIP_EXISTS` y no hay segunda activa.
7. **Dada** una predecesora válida, **cuando** confirma la renovación, **entonces** su documento, fechas, estado, `seasonId` y Períodos no cambian.
8. **Dadas** dos renovaciones concurrentes, **cuando** ambas compiten, **entonces** sólo una avanza el lifecycle guard y no hay bifurcación.
9. **Dado** cierre concurrente de la Temporada destino, **cuando** compite con renovación, **entonces** sólo un orden serializable confirma y nunca queda activa en Temporada cerrada.
10. **Dado** target creado y finalizado antes de confirmar Solicitud, **cuando** la fase terminal relee, **entonces** devuelve `MEMBERSHIP_RENEWAL_SUPERSEDED`, deja Solicitud pendiente y no crea otra raíz.
11. **Dada** respuesta perdida, **cuando** se repite la misma clave, **entonces** recupera el target/outcome exactos sin duplicar raíz ni retroceder guard.
12. **Dada** la misma clave con otro request, **cuando** se reintenta, **entonces** `IDEMPOTENCY_CONFLICT` y cero escrituras funcionales.
13. **Dada** una transferencia anterior o posterior al efecto, **cuando** el ex Owner consulta o continúa, **entonces** recibe `GROUP_NOT_ACCESSIBLE`; si el efecto ya ocurrió no se revierte y sólo el Owner vigente puede asistir la coordinación exacta preservando `requestedBy`/`decidedBy`.
14. **Dado** un rol global sin ownership, **cuando** conoce todos los IDs públicos, **entonces** no puede renovar ni enumerar estado interno.
15. **Dado** un linaje con varias finalizadas, **cuando** E2-04/E2-11 consultan estado actual, **entonces** continúan mostrando sólo la única activa y no fallan por cantidad histórica.
16. **Dada** una raíz v4 activa, **cuando** E2-05/E2-10/E2-12 la finalizan, **entonces** preservan `previousMembershipId` y actualizan lifecycle v3 a finalizada.
17. **Dada** una raíz v4 finalizada en la Temporada todavía abierta, **cuando** se aprueba una nueva Solicitud, **entonces** se reactiva esa misma raíz y conserva lineage.
18. **Dada** una confirmación cancelada, **cuando** el Owner vuelve al listado, **entonces** no hubo callable modificadora ni escritura.
19. **Dado** éxito, **cuando** la UI refresca, **entonces** muestra el estado autoritativo sin exponer historia completa ni IDs internos.
20. **Dado** el commit de renovación, **cuando** se inspeccionan recursos vecinos, **entonces** Grupo, Persona, Cuenta, Temporadas, Partido, Torneo, arrays, correos y notificaciones permanecen iguales.

## 24. Validaciones documentales y decisiones pendientes

La ficha resuelve las contradicciones solicitadas:

- distingue alta, reactivación y renovación;
- impide que E2-09 trate otra Temporada como reactivación;
- admite múltiples raíces finalizadas sin convertir el guard en historial;
- define schema físico mínimo de raíz, lineage y lifecycle guard;
- especifica estados legacy/nuevos compatibles y adaptaciones por incremento;
- resuelve target finalizado antes de la terminalización;
- fija recuperación exacta, carreras y lecturas acotadas;
- determina que no se necesita índice compuesto nuevo y separa evidencia Emulator de deploy real;
- mantiene exclusivamente el flujo público de Solicitud.

**No quedan decisiones normativas o técnicas fundamentales bloqueantes.** Nombres privados de helpers, distribución reversible de módulos y textos finales de microcopy pueden ajustarse durante implementación siempre que no alteren schemas, payloads, outcomes, invariantes ni alcance. Cualquier necesidad de otro campo persistido, índice compuesto, callable, autoridad, elección cliente o migración global obliga a volver a revisión documental antes de código.

E2-18 APROBADA — LISTA PARA VERSIONAR
