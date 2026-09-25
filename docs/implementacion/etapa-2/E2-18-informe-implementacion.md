# E2-18 — Informe de implementación

## Preflight

- `fetch --prune origin` completado antes de modificar archivos.
- Rama `feat/e2-18-membership-renewal`; HEAD, upstream y merge-base `3b222a5dd601ff1385aa0ae69ea67fc76a203776`; divergencia inicial `0/0`.
- Árbol e índice inicialmente limpios; cero stashes.
- Ficha idéntica al blob aprobado `6c4ab8415d7cefa036a11ebb033745121d2fefd6`.
- No existían implementación, informe ni cierre E2-18 previos.
- E2-17 cerrado e integrado. E2-14 y Etapa 2 abiertas. E3 deshabilitada.
- Auth/UAT aislada en `chore/preserve-auth-emulator-uat-changes`, commit `fc7135e358902a17372d44f20df50883603520ce`, no integrada en HEAD.
- Sin procesos ni puertos Emulator residuales al inicio.

## Inventario exacto

### Modificados

- `volley-ranking-frontend/src/components/groupJoinRequests/PendingGroupJoinRequestsSection.tsx`
- `volley-ranking-frontend/src/services/groupJoinRequestsService.ts`
- `volley-ranking-frontend/src/types/GroupJoinRequest.ts`
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestErrors.js`
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestHashing.js`
- `volley-ranking-system/functions/src/groupJoinRequests/domain/groupJoinRequest.js`
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestRepository.js`
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore.js`
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/groupJoinRequestCallable.js`
- `volley-ranking-system/functions/src/groups/public/groupJoinRequestSeasonCapability.js`
- `volley-ranking-system/functions/src/memberships/application/membershipErrors.js`
- `volley-ranking-system/functions/src/memberships/domain/membership.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreActiveGroupMembersForOwnerReader.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreActiveMembershipGuard.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipAdministrativeFinalizationStore.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipLifecycleGuard.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipRepository.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipSelfExitStore.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMyCurrentGroupMembershipsReader.js`
- `volley-ranking-system/functions/src/memberships/public/groupJoinRequestMembershipCapability.js`
- `volley-ranking-system/functions/src/memberships/public/seasonClosureMembershipCapability.js`
- `volley-ranking-system/functions/test/emulator/groupJoinRequestDecisionE2.test.js`
- `volley-ranking-system/functions/test/emulator/groupJoinRequestDecisionGapsE2.test.js`
- `volley-ranking-system/functions/test/emulator/groupJoinRequestE2.test.js`
- `volley-ranking-system/functions/test/emulator/membershipE2.test.js`
- `volley-ranking-system/functions/test/emulator/membershipReactivationE2.test.js`
- `volley-ranking-system/functions/test/run-emulator-tests.js`

### Nuevos

- `docs/implementacion/etapa-2/E2-18-informe-implementacion.md`
- `volley-ranking-system/functions/test/emulator/membershipRenewalE2.test.js`
- `volley-ranking-system/functions/test/unit/membershipRenewalE2.test.js`

### Eliminados

- Ninguno.

## Diseño implementado

CU-029 continúa entrando exclusivamente por la aprobación de una Solicitud pendiente mediante `approveGroupJoinRequest`; no se agregó callable pública de renovación. El backend deriva `CREATE_MEMBERSHIP`, `REACTIVATE_MEMBERSHIP` o `RENEW_MEMBERSHIP` desde el lifecycle guard y el contexto de Temporada. El cliente no aporta Temporada, Membresía anterior ni efecto.

La renovación crea una raíz v4 nueva para la Temporada abierta, su Período ordinal 1, active guard y lifecycle guard v3 activo. La predecesora finalizada queda intacta y la nueva raíz la referencia mediante `previousMembershipId`.

## Schemas y compatibilidad

- Se conservan Membresía v1 activa legacy, v2 finalizada legacy y v3 activa/finalizada con Períodos.
- Membresía v4 exige `previousMembershipId`, rechaza campos extra y referencias propias, y preserva el lineage al finalizar o reactivar.
- Lifecycle v1/v2 válido sigue siendo legible. Toda escritura autorizada afectada lo evoluciona a v3; no existe backfill ni reparación incidental.
- Lifecycle v3 representa `active` o `finalized`, siempre apunta a la última raíz autoritativa y usa `lastActivationOrdinal` dentro de esa raíz.
- No se incorporaron arrays, contador de raíces, historia embebida, metadata no aprobada ni migración global.

## Contratos y persistencia

- Solicitud aprobada con `RENEW_MEMBERSHIP` usa schema v4; alta/reactivación conservan sus contratos previos.
- Coordinación v3 fija target, predecesora, Temporada, ordinal 1 y hashes. Intent v3 admite los outcomes aprobados, incluido `MEMBERSHIP_RENEWAL_SUPERSEDED`.
- El repositorio persiste la versión validada de Solicitud, evitando degradar una aprobación v4 a v3.
- El effect hash liga request, Persona–Grupo, Temporada, target, predecesora, ordinal y efecto.
- La selección de predecesora usa sólo lifecycle. La consulta de sucesora es defensiva: igualdad por `previousMembershipId` y `limit(2)`.
- `previousMembershipId` conserva indexación automática; `fieldOverrides` permanece vacío y no se agregó índice compuesto.

## Concurrencia, idempotencia y recovery

- Claim, efecto y terminalización serializan por lifecycle y guards compartidos dentro de transacciones acotadas.
- Dos aprobaciones concurrentes convergen en un target; respuesta perdida y retry recuperan el mismo resultado.
- Una alias existente se valida aun con Solicitud terminal: misma clave con payload/acción distinta produce `IDEMPOTENCY_CONFLICT`. Un Owner vigente sin esa alias puede recuperar el resultado tras transferencia.
- Cada entrada y unidad confirmatoria revalida ownership. Una transferencia no revierte efecto durable; el Owner anterior pierde autoridad y el Owner vigente puede asistir la coordinación exacta sin cambiar `requestedBy`/`decidedBy`.
- Estados lifecycle ausentes, cruzados, incompatibles o con active guard coexistente con finalizado fallan cerrados.
- La búsqueda defensiva detecta dos sucesoras y nunca sustituye al lifecycle como fuente de verdad.
- `MEMBERSHIP_RENEWAL_SUPERSEDED` consume el intento, libera coordinación, preserva historia y no crea ni reactiva otra raíz implícitamente.
- Se mantienen los presupuestos físicos de la ficha: sin scans históricos y con unidades transaccionales dentro de sus máximos de snapshots/escrituras.

## Capacidades adaptadas

- E2-03 crea lifecycle v3 activo.
- E2-04 y E2-11 resuelven la raíz actual por lifecycle sin confundir múltiples finalizadas con corrupción.
- E2-05, E2-10 y E2-12 finalizan v4 preservando `previousMembershipId` y dejando lifecycle v3 finalizado.
- E2-09 reactiva la misma raíz y conserva lineage.
- E2-15 reconoce v4 y lifecycle v3 al bloquear/serializar cierre de Temporada.

## Frontend

El flujo existente de Solicitudes muestra incorporación a la Temporada abierta y distingue alta, reactivación o renovación sólo con la clasificación segura devuelta por backend. La renovación incluye advertencia intertemporada. Se mantienen confirmación, single-flight, clave estable para retry, refresh autoritativo de Solicitud/roster/contexto, foco, teclado, `aria-live`, estados de carga/éxito/error y layout responsive. No se exponen IDs internos, selectores de predecesora/Temporada, renovación masiva, historia E2-19, correos ni notificaciones.

## Rules, índices y arquitectura

- No se ampliaron permisos cliente; las persistencias internas continúan deny-all.
- Los contratos son cerrados y rechazan propiedades desconocidas.
- `firestore.rules` y `firestore.indexes.json` no requirieron cambios.
- No se alteraron Partido/Torneo ni deuda E4.
- La Emulator Suite valida comportamiento/configuración local, no despliegue remoto de índices.

## Pruebas y resultados

- Sintaxis focal inicial y control completo final: `289/289` archivos JavaScript.
- Unitarias focales E2-18: verdes.
- Unitarias/contratos/arquitectura completas finales: `314/314`.
- Emulator focal E2-18 final: `1/1`; cubre renovación durable, concurrencia de aprobaciones, respuesta perdida/retry, temporada intermedia, lineage, cardinalidad y misma clave con otro request.
- Regresiones focales E2-03/E2-05/E2-07/E2-09/E2-10/E2-12/E2-15: verdes. Focales adicionales E2-04, E2-06 y E2-07 gaps: `10/10`, `13/13` y `6/6`.
- Emulator Suite completa inicial: `186/192`. Los seis conteos TAP fueron cuatro subtests fallidos más sus dos suites contenedoras: dos expectativas E2-06 y una E2-07 todavía exigían `NOT_AUTHORIZED` donde el contrato normativo requiere `GROUP_NOT_ACCESSIBLE`; el cuarto subtest expuso una regresión productiva porque una Solicitud terminal no validaba una alias existente y devolvía `DECISION_ALREADY_REJECTED` en lugar de `IDEMPOTENCY_CONFLICT`. Se actualizaron las tres expectativas y se restauró la validación condicional de alias terminal. Al repetir sólo E2-07 gaps apareció además un fixture latente que intentaba crear lifecycle v2 sobre el lifecycle v3 ya materializado; se adaptó a `set` de lifecycle v3 finalizado. Las focales E2-06 (`13/13`), E2-07 gaps (`6/6`) y E2-18 (`1/1`) quedaron verdes.
- Gate consolidado posterior a las correcciones: una única Emulator Suite completa fresca con `22` grupos de nivel superior, `192` pruebas, `192` aprobadas, `0` fallidas, `0` canceladas, `0` omitidas y `0` pendientes. Node TAP informó `# suites 0`; duración `285011.537 ms`; exit code `0`.
- El runner aislado inició Auth, Firestore y Functions sin datos residuales y completó teardown de Functions, Firestore, Auth, Eventarc, Tasks, Hub y Logging. El gate completo final quedó verde.
- Durante una focal E2-06 diagnóstica, una transacción concurrente agotó reintentos del Emulator a los 9 s; la repetición diagnóstica inmediata pasó `13/13`, sin cambio funcional asociado.
- Rules/mantenimiento: `7/7`.
- Lint baseline: OK, con `36` errores y `9` warnings históricos conocidos y `9` hallazgos resueltos respecto del baseline.
- Typecheck: verde.
- Build Next.js de producción: verde, 21 páginas estáticas generadas y rutas dinámicas compiladas.
- `git diff --check` e higiene UTF-8/BOM/whitespace/newline: verificados en el cierre de este informe.

## Incidencias, deuda y riesgos

- Incidencias funcionales corregidas: persistencia accidental de Solicitud v4 como v3; aceptación silenciosa de lifecycle finalizado junto con active guard; omisión de conflicto para alias existente sobre Solicitud terminal.
- La corrida consolidada posterior aprobó `192/192`; no fue necesaria ninguna modificación productiva ni repetición adicional durante el gate final.
- El warning de `caniuse-lite` desactualizado y la deuda del lint baseline son preexistentes; no se actualizaron dependencias.
- No hubo acceso Firebase remoto, deploy, commit, push, merge ni cambios Auth/UAT.

## Resultados UAT y clasificación de evidencia

La UAT manual de E2-18 fue satisfactoria. El recorrido confirmó que el Owner ve la Solicitud pendiente y la advertencia «Renovación intertemporada: se creará una nueva Membresía para la Temporada abierta actual. La clasificación se revalidará al confirmar.». La UI no permite elegir Temporada, Membresía predecesora, efecto, Período ni campos internos de lineage.

Se abrió la confirmación y se volvió mediante `Cancelar/Volver`: la Solicitud permaneció pendiente y no se observó efecto. Luego se rechazó una Solicitud y dejó de estar pendiente para Owner y candidata, conforme a la semántica terminal. Se creó otra Solicitud para continuar el recorrido; al aprobarla, la Persona apareció exactamente una vez en el roster, pudo consultar que integra el Grupo y la Solicitud dejó de estar pendiente. La renovación N→N+1 funcionó correctamente. Refresh y cambios de sesión conservaron el estado; un no-Owner fue rechazado; accesibilidad y responsive quedaron confirmados.

Clasificación obligatoria de la evidencia:

- **Aprobada manualmente:** renovación N→N+1; cancelación del diálogo sin escritura; rechazo terminal; aprobación y creación de la nueva Membresía; roster y consulta propia.
- **Inspección persistente:** nueva raíz y lineage; Período inicial; guards y lifecycle; persistencia tras refresh/cambios de sesión; ausencia de duplicados ante repetición.
- **Pruebas/Emulator:** salto N→N+2 o con varias Temporadas intermedias; concurrencia; transferencias; recovery; corrupción; bifurcaciones; `MEMBERSHIP_RENEWAL_SUPERSEDED`; schemas históricos y límites físicos.
- **Exclusión esperada de E2-18:** no existe historial completo de Membresías en la UI; corresponde a CU-010 en E2-19 y no constituye un defecto de E2-18.

No se atribuyen a la UAT manual escenarios que sólo fueron acreditados mediante inspección persistente o pruebas automatizadas.

## Estado previo al versionado

- Rama `feat/e2-18-membership-renewal`; HEAD, upstream y merge-base permanecen en `3b222a5dd601ff1385aa0ae69ea67fc76a203776`; divergencia `0/0`.
- Índice vacío; todos los cambios E2-18 están locales y sin stage; cero stashes.
- Ficha intacta con blob `6c4ab8415d7cefa036a11ebb033745121d2fefd6`.
- Sin archivos eliminados, sin E2-19, sin emuladores escuchando y sin procesos Emulator residuales.
- No hubo deploy ni acceso Firebase remoto; E2-14, Etapa 2, E3 y Auth/UAT permanecen en el estado constatado en preflight.
