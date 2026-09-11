# E2-09 — Informe de implementación

Fecha de cierre técnico: 2026-09-10

Rama de trabajo: `feat/e2-09-membership-reactivation`

Base, `HEAD` y merge-base recuperados: `31805fa9a7bf99c0b77cf0695e5a89d248b971ab`

## 1. Recuperación del checkpoint interrumpido

La implementación se retomó sobre el working tree existente, sin reiniciar la tarea ni descartar cambios. Antes de editar se verificó:

- rama `feat/e2-09-membership-reactivation` y upstream `origin/feat/e2-09-membership-reactivation`;
- divergencia inicial `0/0`;
- `HEAD`, upstream y merge-base en `31805fa9a7bf99c0b77cf0695e5a89d248b971ab`;
- ausencia de commits posteriores a esa base, índice vacío y lista de stashes vacía;
- inventario de recuperación de 35 archivos tracked modificados y 2 nuevos, todos atribuibles a E2-09;
- ausencia de cambios en Auth/UAT, AUD-C05, otros documentos de arquitectura, índices, lockfiles y rama preservada.

Se inspeccionó el diff completo contra `HEAD`, con atención especial al parche incompleto de `groupJoinRequestDecisionE2.test.js`. No se hizo reset, checkout, stash, reformateo masivo ni modificación de configuración global de Git.

## 2. Alcance materializado

E2-09 introduce reactivación de una Membresía finalizada como efecto autorizado de aprobar una Solicitud, preservando la identidad de la Membresía y toda su historia de vigencia. También evoluciona la creación nueva para persistir directamente el agregado v3.

Quedaron materializados:

- raíz Membresía v3 y subcolección `validityPeriods`;
- creación con período ordinal 1 abierto;
- finalización v1 y v3, con materialización/cierre del período 1 para v1;
- reactivación de v2 y v3, conservación de períodos y múltiples ciclos;
- IDs, ordinales y hashes deterministas;
- `approvalEffect` (`CREATE_MEMBERSHIP` o `REACTIVATE_MEMBERSHIP`);
- Solicitud v3 como evidencia durable del resultado aprobado;
- intent de decisión v2 consumible y coordinación v2 transitoria;
- errores `MEMBERSHIP_SEASON_NOT_REACTIVATABLE` y `MEMBERSHIP_REACTIVATION_SUPERSEDED`;
- lectura histórica desde Solicitud aunque la Membresía ya no esté activa;
- compatibilidad de readers con raíces v1/v2/v3 sin exponer períodos en DTO;
- UX diferenciada para primera incorporación, reactivación y reactivación superada;
- reglas deny-all para acceso cliente directo a Períodos de Vigencia.

## 3. Modelo persistido

### 3.1 Membresía v3

La raíz activa contiene exactamente `personId`, `groupId`, `seasonId`, `estado`, `fechaIngreso`, `createdAt`, `latestPeriodId`, `periodCount` y `schemaVersion: 3`. La raíz finalizada agrega `fechaEgreso`. `fechaIngreso` y `createdAt` originales se conservan a través de las reactivaciones.

Las raíces v1/v2 continúan siendo legibles. Sólo una creación, finalización o reactivación autorizada puede evolucionarlas a v3; no existe migración oportunista desde readers.

### 3.2 Períodos de Vigencia

Ruta: `memberships/{membershipId}/validityPeriods/{periodId}`.

- abierto: `ordinal`, `estado: "abierto"`, `startedAt`, `periodSchemaVersion: 1`;
- cerrado: los mismos campos más `endedAt` y `estado: "cerrado"`;
- `periodId` deriva determinísticamente de `membershipId` y ordinal;
- `ordinal` comienza en 1 y aumenta exactamente de a uno;
- cada raíz v3 referencia el último período y su cardinalidad;
- como máximo existe un período abierto y siempre coincide con el guard activo v2.

No se inventan fechas: una evolución legacy reutiliza `fechaIngreso`/`fechaEgreso`; cada transición nueva usa una única marca temporal para raíz, período y guard correlacionados.

### 3.3 Guards, intents y coordinación

El guard activo v2 registra ordinal y fecha de activación, más hashes deterministas de idempotencia y solicitud. El guard de ciclo de vida v2 registra el último ordinal cerrado y `finalizedAt`. Ambos validan correlación estricta con raíz/período; los formatos v1 siguen siendo aceptados únicamente junto con sus agregados legacy correspondientes.

El intent de aprobación v2 pasa de `pending` a `consumed` y conserva el outcome. La coordinación v2 contiene efecto, Membresía, Temporada y ordinal esperado; se elimina en todos los terminales. Guards y coordinación mantienen unicidad y recuperación técnica, pero no se usan como historia funcional.

## 4. Flujos y consistencia

La aprobación se ejecuta en tres fronteras independientes:

1. Solicitud: autoriza, fija intent/coordinación y el efecto esperado.
2. Membresía: crea o reactiva de forma transaccional e idempotente.
3. Solicitud: confirma el resultado durable v3 y consume el intent.

No existe una transacción global entre Solicitud y Membresía. Todas las lecturas de cada transacción preceden sus escrituras. Los retries recuperan la misma activación sin duplicar períodos.

Si la reactivación fue finalizada antes de la confirmación, el ordinal esperado aparece cerrado y se produce `MEMBERSHIP_REACTIVATION_SUPERSEDED`: el intent queda consumido, la coordinación se libera y el retry con la misma clave no reactiva otra vez. Una decisión humana posterior requiere una clave nueva y abre el ordinal siguiente.

La reactivación exige que siga abierta la Temporada original de la Membresía. Un cierre concurrente converge a uno de los dos órdenes válidos: reactivación confirmada antes del cierre, o `MEMBERSHIP_SEASON_NOT_REACTIVATABLE` sin activación. Las carreras aprobación–finalización convergen sin confirmaciones históricas falsas y con cardinalidades persistidas consistentes.

## 5. Cambios sobre incrementos existentes

- CU-027 / finalización: soporta raíces activas v1 y v3, materializa/cierra historia legacy, cierra el último período v3 y reemplaza el guard activo por lifecycle guard v2.
- E2-03 / creación: crea directamente raíz v3, período 1 y guard activo v2 en una sola transacción.
- E2-07 / decisión: agrega `approvalEffect`, Solicitud v3, intent v2 consumido, coordinación v2, reactivación recuperable y lectura histórica desde la Solicitud.

`listMyCurrentGroupMemberships` conserva el orden por `fechaIngreso` e ID descendentes, cursor estable y compatibilidad v1/v2/v3. Los DTO públicos no incluyen `periodCount`, `latestPeriodId` ni documentos de períodos.

## 6. Seguridad y efectos colaterales

`firestore.rules` niega toda lectura y escritura cliente directa sobre `memberships/{membershipId}/validityPeriods/{periodId}`. El frontend usa callables/servicios y no escribe Firestore directamente.

Las pruebas confirman ausencia de cambios en Grupo, `memberIds`, `adminIds`, arrays legacy, Actividad y notificaciones. Temporada sólo se consulta como autoridad; Solicitud es la evidencia histórica del resultado.

## 7. Incidencias encontradas y correcciones

1. El fixture Emulator E2-07 inconcluso persistía coordinación v1. Se convirtió a intent/coordinación v2 y se actualizaron sólo expectativas reemplazadas por los contratos v3.
2. La recuperación tras transferencia de ownership exigía erróneamente que una clave auxiliar coincidiera con el ID del intent canónico de la coordinación. Se corrigió producción para validar la coordinación canónica y preservar `decidedBy`, permitiendo asistencia del Owner vigente.
3. La liberación de una aprobación sobre Membresía v2 finalizada intentaba validar el agregado como v3 antes de demostrar que la activación esperada no existía. Se añadió el contexto exacto de v2 finalizada/ordinal 2, manteniendo validación cerrada de períodos inesperados.
4. Caracterizaciones antiguas esperaban raíz v1/v2, guards v1 o intents durables antes de superar el pre-check. Se adaptaron a v3/v2 sólo donde la normativa E2-09 reemplaza el contrato.
5. La primera prueba de carrera de Temporada introducía un bloqueo artificial al esperar una escritura externa dentro del callback transaccional. Se sustituyó por una carrera real de transacciones independientes y aserciones sobre ambos órdenes válidos.

No se ocultó ni reclasificó ninguna falla de producción.

## 8. Archivos

### Nuevos

- `volley-ranking-system/functions/src/memberships/domain/membershipValidityPeriod.js`
- `volley-ranking-system/functions/test/unit/membershipValidityPeriod.test.js`
- `volley-ranking-system/functions/test/emulator/membershipReactivationE2.test.js`
- `docs/implementacion/etapa-2/E2-09-informe-implementacion.md`

### Modificados

- Frontend: `PendingGroupJoinRequestsSection.tsx`, `groupJoinRequestDecisionMachine.d.mts`, `groupJoinRequestDecisionMachine.mjs`, `MyCurrentGroupMembershipsSection.tsx`, `groupJoinRequestsService.ts`, `GroupJoinRequest.ts`.
- Reglas: `volley-ranking-system/firestore.rules`.
- Solicitudes: `groupJoinRequestDto.js`, `groupJoinRequestErrors.js`, `groupJoinRequestHashing.js`, `groupJoinRequestService.js`, `groupJoinRequest.js`, `firestoreGroupJoinRequestRepository.js`, `firestoreGroupJoinRequestStore.js`, `groupJoinRequestCallable.js`.
- Capacidades Grupo/Temporada: `groupJoinRequestSeasonCapability.js`.
- Membresías: `membershipErrors.js`, `membershipHashing.js`, `membership.js`, `firestoreActiveMembershipGuard.js`, `firestoreMembershipLifecycleGuard.js`, `firestoreMembershipRepository.js`, `firestoreMyCurrentGroupMembershipsReader.js`, `firestoreMyMembershipReader.js`, `membershipCandidateContext.js`, `groupJoinRequestMembershipCapability.js`.
- Pruebas/runner: `groupJoinRequestDecisionE2.test.js`, `groupJoinRequestDecisionGapsE2.test.js`, `membershipE2.test.js`, `run-emulator-tests.js`, `groupJoinRequestArchitecture.test.js`, `groupJoinRequestDecisionE2.test.js`, `groupJoinRequestService.test.js`, `membershipArchitecture.test.js`, `membershipDomain.test.js`, `membershipGuard.test.js`, `membershipHashing.test.js`, `membershipLifecycle.test.js`.

No se eliminaron archivos.

## 9. Pruebas y gates

Todos los comandos se ejecutaron desde el repositorio con sus scripts reales. Los Emulator usaron `demo-sportexa-e0-02`, hosts loopback, sólo Auth/Firestore/Functions locales y proxies salientes dirigidos a `127.0.0.1:9`.

| Gate | Comando | Resultado |
| --- | --- | --- |
| Unitarias completas | `npm run test:infra:unit` (en `volley-ranking-system/functions`) | 255/255 |
| Contractuales/focalizadas unitarias | `node --test --test-concurrency=1` sobre 9 suites E2-09/arquitectura | 67/67 |
| Emulator E2-07 | `E2_07_FOCAL=1 npm run test:infra:emulators` | 11/11 |
| Emulator gaps E2-07 | `E2_07_GAPS_FOCAL=1 npm run test:infra:emulators` | 6/6 |
| Emulator E2-09 | `E2_09_FOCAL=1 npm run test:infra:emulators` | 7/7 |
| Emulator E2-03/E2-05 | `E2_07_CLEANUP_FOCAL=1 npm run test:infra:emulators` | 18/18 |
| Emulator completa | `npm run test:infra:emulators` | 137/137 |
| Sintaxis Functions | `npm run quality:functions:syntax` | 251/251 archivos |
| Lint baseline | `npm run quality:lint` | aprobado; 6 hallazgos resueltos, 39 errores y 9 warnings conocidos sin incremento |
| Typecheck | `npm run quality:typecheck` | aprobado |
| Build | `npm run quality:build` | aprobado; 21/21 páginas generadas |
| Mantenimiento/reglas | `npm run test:maintenance` | 7/7 |
| Higiene de diff | `git diff --check` | aprobado |

El aviso de `caniuse-lite` desactualizado y el aviso de Firebase Functions 4.9 sobre Extensions son warnings preexistentes/no bloqueantes y no requieren cambios de dependencias para E2-09.

## 10. Cobertura demostrada

La cobertura unitaria, contractual, arquitectónica y Emulator demuestra creación v3/período 1; finalización v1/v3; reactivación v2/v3; preservación de historia; múltiples ciclos; un único período abierto; retries sin duplicados; determinismo de IDs, ordinales y hashes; ambos `approvalEffect`; Solicitud v3 durable; consulta histórica posterior a finalización; guards sin historia funcional; coordinación v2 y liberación terminal; ambos errores nuevos y sus retries; nueva decisión con nueva clave; carreras de finalización y Temporada; concurrencia/cardinalidades; readers v1/v2/v3; orden/cursor del listado; DTO sin períodos; deny-all de períodos; ausencia de efectos colaterales; y UX de creación, reactivación y superación.

## 11. UAT manual e inspección persistente

La UAT se ejecutó sobre Auth, Firestore y Functions Emulator locales en el namespace `demo-sportexa-e2-04`. Participaron:

- Owner A: `4A0WpbCGWctmvgLe1bhzXHW3Thdd`;
- Usuario B: `lNTFIxvK85CUizt68SHqmfJ8CqTN`;
- Persona B: `oU5Un45ukpIdjzWmpFdH`;
- Grupo: `5wFTdyffFBgihOp9iOJ4`;
- Temporada abierta: `Mpmare4BsQkAmWKprv0k`;
- Membresía estable: `tFkWeNVsa2mGp03VJKnL`.

### 11.1 Clasificación final

| UAT | Resultado |
| --- | --- |
| UAT-01 | `APROBADA MANUALMENTE` |
| UAT-02 | `NO RECORRIBLE MANUALMENTE — ACEPTADA POR EVIDENCIA AUTOMATIZADA` |
| UAT-03 | `APROBADA MANUALMENTE` |
| UAT-04 | `APROBADA MANUALMENTE` |
| UAT-05 | `APROBADA POR INSPECCIÓN PERSISTENTE` |
| UAT-06 | `NO RECORRIBLE MANUALMENTE — ACEPTADA POR EVIDENCIA AUTOMATIZADA` |
| UAT-07 | `APROBADA MANUALMENTE Y POR COBERTURA AUTOMATIZADA` |
| UAT-08 | `APROBADA MANUALMENTE Y POR INSPECCIÓN PERSISTENTE` |

UAT-01 confirmó la primera incorporación de B por aprobación del Owner. UAT-03 y UAT-04 recorrieron desde la UI la nueva Solicitud de B y su aprobación con reactivación por A. UAT-05 comprobó la conservación de la primera aprobación como hecho histórico independiente. UAT-07 verificó visualmente “Primera incorporación” y la fecha original. UAT-08 cerró la inspección de cardinalidades, correlación y ausencia de efectos colaterales.

### 11.2 Limitación manual de CU-027 y preparación de datos

UAT-02 y UAT-06 no son fallas de E2-09. CU-027 permanece limitado a finalización Owner/self-scoped: sólo el Owner actual, sólo su propia Persona, mediante `OwnMembershipSection` y la acción “Finalizar mi Membresía”. No existe todavía salida voluntaria general para una integrante no Owner, finalización de Membresías de terceros, roster ni administración general de integrantes.

Para preparar la precondición de UAT-03 se realizó una fixture local controlada, no un recorrido funcional de CU-027. Una única transacción Firestore Emulator con Admin SDK local reutilizó `finalizeMembership` y `firestoreMembershipRepository.persistTransition`. La marca temporal única fue `2026-09-11T14:27:18.030Z` y se aplicó a `fechaEgreso`, `endedAt` del período 1 y `finalizedAt` del lifecycle guard. No se invocó CU-027, no se simuló autorización y no se modificaron Grupo, Temporada o Solicitud.

### 11.3 Evidencia persistente anterior y posterior

Antes de la fixture existía una raíz activa v3 con `fechaIngreso: 2026-09-11T13:43:29.416Z`, un período 1 abierto y un active guard v2. La transacción conservó identidad y fechas originales, cerró ese período, reemplazó el active guard por lifecycle guard v2 y no creó otro período. Después de que B creó otra Solicitud y A aprobó la reactivación, la inspección final confirmó:

- una sola raíz `tFkWeNVsa2mGp03VJKnL`, activa v3, sin `fechaEgreso`, con `periodCount: 2`;
- `fechaIngreso` original e inmutable `2026-09-11T13:43:29.416Z`;
- período 1 `92f3a1503f9b3ed6deb2f5cb58691ff15fb2c0ab0cd0e5fa396de32bf4ca3570`, cerrado desde `2026-09-11T13:43:29.416Z` hasta `2026-09-11T14:27:18.030Z`;
- período 2 `463e3c54cf5db5d47f13c7245901dc50921b204635425572900f081000778f5e`, abierto desde `2026-09-11T14:36:44.037Z` y referenciado por `latestPeriodId`;
- exactamente un período abierto y ningún período adicional;
- exactamente un active guard v2 correlacionado con ordinal 2; cero lifecycle guards, pending request guards y coordinaciones;
- dos request intents correlacionados y dos decision intents v2 consumidos con outcome `APPROVED`;
- Grupo y Temporada sin cambios, arrays legacy ausentes, Actividad y notificaciones con cardinalidad cero, sin duplicados ni referencias huérfanas.

### 11.4 Aprobaciones históricas independientes

La primera Solicitud `KTA9XFHGgzctcU6Plz86` permanece `aprobada`, v3, con `approvalEffect: CREATE_MEMBERSHIP`, ordinal 1, decision intent `a4659a4b348db32d547546450144845efc0c8c00ca748c2deccdd3de66339840` y `decidedAt: 2026-09-11T13:43:29.546Z`.

La Solicitud de reactivación `RtYVZcjixsEpIj3d3hD5` permanece `aprobada`, v3, con `approvalEffect: REACTIVATE_MEMBERSHIP`, ordinal 2, decision intent propio `31a340992133fe86eff387ecfca57131679fcd3c209058fc580b319d32c6ea1b` y `decidedAt: 2026-09-11T14:36:44.193Z`.

Ambas conservan el mismo `membershipId` y `seasonId`, pero son documentos históricos separados. La consulta de la primera aprobación no depende del active guard vigente ni de un lifecycle guard.

## 12. Riesgos residuales y exclusiones

Riesgos residuales reales:

- el despliegue futuro debe mantener Functions y reglas compatibles durante toda la ventana de transición;
- un cierre real de Temporada deberá conservar la precondición ya ejercitada mediante su autoridad persistida;
- la recuperación de coordinaciones inciertas sigue dependiendo de consulta o retry; no existe worker automático;
- intents durables no poseen TTL en este incremento.

Quedaron fuera de alcance: deploy, migración masiva, backfill general, cambios o integración de Auth/UAT, cambios en AUD-C05, salida general de integrantes, roster, renovación, cierre de Temporada, rediseño de Actividad/notificaciones y escritura cliente de Firestore.

Los escenarios de múltiples ciclos, retries, carreras y cardinalidades adicionales no se repitieron manualmente: ya están cubiertos por las pruebas unitarias y Emulator aprobadas.

## 13. Confirmación operacional y veredicto

La implementación y la UAT se realizaron sólo con emuladores loopback. No hubo deploy ni acceso a Firebase remoto. La rama `chore/preserve-auth-emulator-uat-changes` y su commit `fc7135e358902a17372d44f20df50883603520ce` permanecieron fuera de E2-09.

La evidencia técnica, funcional y persistente es consistente. E2-09 está apto para versionarse e integrarse.

**UAT E2-09 APROBADA — LISTA PARA ACTUALIZAR INFORME Y VERSIONAR**
