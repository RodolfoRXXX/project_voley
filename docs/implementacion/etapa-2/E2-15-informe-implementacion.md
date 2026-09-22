# E2-15 — Informe de implementación del cierre canónico de Temporada

## Estado

`IMPLEMENTADO Y VALIDADO — LISTO PARA VERSIONADO`

Este informe documenta exclusivamente CU-018. No cierra E2-14 ni Etapa 2, no habilita E3 y no incorpora CU-017, CU-019 ni CU-029.

## 1. Preflight

- Rama confirmada: `feat/e2-15-season-close`.
- HEAD, `dev`, `origin/dev` y merge-base confirmados en `5823976305917f27a11b2255b09e9ee1be5cf830`.
- Upstream confirmado: `origin/feat/e2-15-season-close`; divergencia inicial `0/0`.
- Índice y working tree iniciales limpios; cero stashes.
- Auth/UAT aislada en `chore/preserve-auth-emulator-uat-changes` (`fc7135e358902a17372d44f20df50883603520ce`).
- Rama remota histórica preservada en `origin/feat/e2-15-season-close-history` (`a721badc1ec7c307898d623b54c10251489b12f7`).
- Ficha versionada sin diff frente a `dev`; blob Git coincidente con el commit documental `9515794a56de9f33732dc5cf7056082dbac90b5c` (`31550f3275743f4b59b50d573baeeb961e180a26`). La diferencia de bytes observada en el checkout era sólo la traducción CRLF de Git; el blob versionado es idéntico.
- No existía implementación parcial de `closeSeason`, `seasonOpeningReceipts` ni `seasonClosureReceipts` en HEAD.
- No se usó Firebase remoto, deploy, merge, push, stash ni cambio de rama.
- No se encontró contradicción entre la ficha aprobada y la arquitectura vigente.

## 2. Inventario previo

- Dominio y aplicación de Temporada: `season.js`, `seasonContract.js`, `seasonDto.js`, `seasonErrors.js`, `seasonHashing.js` y `seasonService.js`.
- Persistencia y composición: `firestoreSeasonRepository.js`, `firestoreOpenSeasonGuard.js`, `firestoreOpenSeasonReader.js`, `seasonModule.js` y `seasonCallable.js`.
- Callables y exports: `createAndOpenSeason.js`, `getOpenSeasonContext.js`, `getOwnSeason.js` e `index.js`.
- Writers de Membresía: alta inicial, finalización Owner/self, salida voluntaria y finalización administrativa.
- Decisiones de Solicitud: aprobación `CREATE_MEMBERSHIP`, aprobación `REACTIVATE_MEMBERSHIP`, coordinación, intents y rechazo.
- Frontend: tipos y servicio de Temporada, `OpenSeasonSection`, roster Owner y solicitudes pendientes.
- Persistencia declarativa: `firestore.rules`, `firestore.maintenance.rules` y `firestore.indexes.json`.
- Pruebas y runners: suites unitarias de Temporada/Membresía/Solicitud, Emulator E2 y runners unitario, Emulator y mantenimiento.

## 3. Mapa de impacto registrado antes de editar

1. Evolucionar Temporada abierta v1 y cerrada v2 con rehidratación cerrada, transición terminal y DTO específico.
2. Separar el slot `openSeasonGuards` de los receipts durables de apertura; mantener compatibilidad estricta del guard v1 sólo para lectura y backfill diferido.
3. Agregar store transaccional de cierre y capabilities públicas, sin que Presentación ni el Agregado Temporada importen persistencia interna de Membresía o Solicitud.
4. Implementar Q1–Q4 acotadas y validar el Agregado Membresía sólo cuando una raíz activa sea alcanzada.
5. Serializar alta E2-03, aprobaciones create/reactivate y finalizaciones E2-05/E2-10/E2-12 con la Temporada exacta o el slot dentro de su unidad confirmatoria.
6. Integrar confirmación Owner-scoped y advertencia intertemporada, sin historial ni reapertura.
7. Declarar Rules deny-all e índices mínimos; mantener Partido/Torneo, Documento 5, E2-14 y Auth/UAT intactos.

## 4. Inventario de cambios

Inventario definitivo previo al versionado: 36 archivos técnicos (30 modificados y 6 nuevos) y este informe documental. No hay archivos eliminados.

### Inventario técnico exacto

- Frontend: `volley-ranking-frontend/src/components/groupJoinRequests/PendingGroupJoinRequestsSection.tsx`, `volley-ranking-frontend/src/components/memberships/ActiveGroupMembersSection.tsx`, `volley-ranking-frontend/src/components/seasons/OpenSeasonSection.tsx`, `volley-ranking-frontend/src/services/seasonsService.ts` y `volley-ranking-frontend/src/types/OwnSeason.ts`.
- Configuración Firestore: `volley-ranking-system/firestore.indexes.json` y `volley-ranking-system/firestore.rules`.
- Exports/callables: `volley-ranking-system/functions/index.js` y el nuevo `volley-ranking-system/functions/callables/closeSeason.js`.
- Solicitudes: `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore.js` y la nueva capability `volley-ranking-system/functions/src/groupJoinRequests/public/seasonClosureApprovalCapability.js`.
- Aplicación/dominio Temporada: `seasonContract.js`, `seasonDto.js`, `seasonErrors.js`, `seasonHashing.js`, `seasonService.js` y `domain/season.js`, bajo `volley-ranking-system/functions/src/groups/`.
- Infraestructura Temporada: `firestoreOpenSeasonGuard.js`, `firestoreOpenSeasonReader.js`, `firestoreSeasonRepository.js`, `seasonCallable.js`, `seasonModule.js` y los nuevos `firestoreSeasonClosureStore.js` y `seasonReceipts.js`, bajo `volley-ranking-system/functions/src/groups/infrastructure/`.
- Membresías: `firestoreActiveMembershipGuard.js`, `firestoreMembershipLifecycleGuard.js`, `membershipModule.js` y la nueva `public/seasonClosureMembershipCapability.js`, bajo `volley-ranking-system/functions/src/memberships/`.
- Pruebas/runners: `functions/test/emulator/seasonE2.test.js`, el nuevo `functions/test/emulator/seasonClosureE2.test.js`, `functions/test/run-emulator-tests.js` y `functions/test/unit/seasonArchitecture.test.js`, `seasonContract.test.js`, `seasonDomain.test.js`, `seasonGuard.test.js` y `seasonService.test.js`.

La ficha E2-15, E2-14, Documento 5, documentos de arquitectura y Auth/UAT no forman parte del inventario y permanecen sin cambios.

### Backend y dominio

- Nueva callable `functions/callables/closeSeason.js` y export público `closeSeason`.
- Lifecycle de Temporada `abierta → cerrada`, schema cerrado v2, `closedAt` y `closedBy` derivados en backend y DTO mínimo.
- Contrato exacto `{ groupId, seasonId, idempotencyKey }`, hashing por actor/clave y request hash por Grupo/Temporada.
- Nuevo `firestoreSeasonClosureStore.js` y nuevo validador cerrado `seasonReceipts.js`.
- Nuevas capabilities públicas `seasonClosureMembershipCapability.js` y `seasonClosureApprovalCapability.js`.
- Apertura E2-02 evolucionada a slot v2 más receipt durable v2, con lectura compatible del guard v1.
- Repository, reader, módulo, callable mapping y catálogo actualizados.

### Serialización

- `firestoreActiveMembershipGuard.js`: el alta inicial relee la Temporada/slot exactos dentro de la transacción de confirmación.
- `firestoreGroupJoinRequestStore.js`: fase A y recuperación revalidan el contexto; una coordinación no confirmada se libera atómicamente si desaparece el slot y una activación ya durable se recupera sin depender del slot posterior.
- `firestoreMembershipLifecycleGuard.js`: finalización Owner/self relee el contexto de Temporada dentro de su unidad confirmatoria.
- E2-10 y E2-12 conservan sus unidades confirmatorias y contratos; el rechazo permanece sin cambios funcionales.
- `membershipModule.js` inyecta la capability acotada de Temporada sin ampliar autoridad.

### Frontend

- `OwnSeason.ts` y `seasonsService.ts`: estado cerrado, servicio `closeSeason` y catálogo de razones públicas.
- `OpenSeasonSection.tsx`: acción sólo Owner, Owner sin Persona, diálogo modal con nombre exacto, advertencia terminal, clave idempotente estable durante retry, single-flight, foco, teclado, `aria-live`, error y éxito, refresh real y navegación accesible al roster.
- `ActiveGroupMembersSection.tsx`: destino enfocable y refresh por cambio de Temporada.
- `PendingGroupJoinRequestsSection.tsx`: destino enfocable, refresh y advertencia de que la aprobación usa la Temporada abierta actual.
- No se añadió reapertura, edición ni historial paginado.

### Rules, índices y pruebas

- Deny-all cliente explícito para `seasonOpeningReceipts` y `seasonClosureReceipts`; coordinación técnica continúa exclusivamente backend/Admin SDK.
- Índices mínimos `memberships(groupId, estado)` y `seasons(groupId, estado)`.
- Nueva suite Emulator `seasonClosureE2.test.js`; ampliación de suites unitarias y E2-02.
- Runner Emulator con focal E2-15, focal de serialización y modo diagnóstico opt-in que no cambia la ejecución normal.

## 5. Diseño implementado

### Contrato y autorización

`closeSeason({ groupId, seasonId, idempotencyKey })` rechaza campos desconocidos y valores no normalizados. El actor se deriva del token. Se exige Cuenta y ownership vigente; Persona, Membresía propia y rol global no conceden ni restringen autoridad. El `seasonId` es siempre explícito.

### Transacción de cierre

La transacción lee Cuenta, Grupo/ownership, receipt de cierre, Temporada exacta, slot exacto y cardinalidad abierta. Ejecuta Q1 (raíz activa limitada), Q2 (active guard residual limitado) y Q3 (coordinación de aprobación limitada). Q4 exige exactamente una Temporada abierta y que sea la solicitada. Sólo tras validar todo escribe la Temporada cerrada, backfill v1 si corresponde, receipt de cierre y elimina el slot en el mismo commit.

No hay estado `closing`, escrituras parciales, finalización masiva, reparación ni scan global de Períodos.

### Receipts e idempotencia

- El slot v2 contiene sólo exclusión de apertura; las nuevas aperturas crean Temporada, slot y `seasonOpeningReceipts` en una transacción.
- El receipt de apertura v2 incluye actor, hashes, resultado y timestamps correlacionados. Un retry consulta primero el receipt durable.
- El backfill v1 ocurre únicamente durante un cierre válido, deriva sus campos del guard y la Temporada íntegros y falla cerrado ante ausencia o incompatibilidad.
- `seasonClosureReceipts` usa ID determinista actor+clave, request hash Grupo+Temporada, schema cerrado v1 y resultado `CLOSED`.
- Recovery reautoriza ownership, valida la Temporada histórica cerrada y devuelve `EXISTING_IDEMPOTENT` antes de consultar el slot; por eso nunca toca N+1.
- Una misma clave con payload diferente produce `IDEMPOTENCY_CONFLICT`.

### Autoridades y corrupción

Una raíz activa alcanzada valida guard y Período abierto del Agregado; corrupción alcanzable falla cerrada. No se inspeccionan raíces finalizadas ni Períodos globalmente. La deuda `E2-DATA-INTEGRITY-01` queda preservada: datos corruptos históricos no alcanzables no se leen, alteran, reparan ni migran.

## 6. Contratos públicos y errores

La respuesta de éxito expone resultado y DTO mínimo de Temporada cerrada, sin hashes, rutas, stack traces ni IDs técnicos auxiliares. Se mantienen razones estables para autenticación, Cuenta, autorización, faltantes, cierre previo, membresías activas, guards/corrupción, coordinación en curso, conflicto idempotente, dependencia no configurada, dependencia no disponible y conflicto transaccional.

En frontend, `ACTIVE_MEMBERSHIPS_EXIST` explica la finalización explícita y conduce al roster. Los errores de integridad no se ocultan bajo un mensaje de éxito o bloqueo ordinario.

## 7. Resultados de gates

Ejecutados en entorno local; los Emulator usaron exclusivamente `demo-sportexa-e0-02`, hosts loopback, secretos sintéticos y proxy saliente bloqueado.

1. Sintaxis focal durante desarrollo: exit 0.
2. Unitarias y arquitectura focal E2-15: 86/86, exit 0.
3. Emulator focal E2-15 (`E2_15_FOCAL=1`): 5/5, exit 0.
4. Unitarias completas finales (`node test/run-unit-tests.js`): 288/288, 0 fallos, exit 0.
5. Emulator de serialización focal final: 58/58, 0 fallos, exit 0.
6. Emulator Suite completa fresca final (`node test/run-emulator-tests.js`): TAP sin fallos, exit 0; emuladores apagados por el runner.
7. Mantenimiento y Rules (`node test/run-maintenance-tests.js`): 7/7, 0 fallos, exit 0.
8. Sintaxis Functions completa (`npm run quality:functions:syntax`): 276/276 archivos JavaScript, exit 0.
9. Lint baseline (`npm run quality:lint`): exit 0; 36 errores y 9 warnings históricos conocidos, con 9 hallazgos resueltos respecto del baseline.
10. Typecheck (`npm run quality:typecheck`): exit 0.
11. Build (`npm run quality:build`): exit 0; compilación de producción correcta y 21/21 páginas estáticas generadas.
12. `git diff --check`: exit 0; sólo avisos informativos de conversión LF→CRLF por configuración Git.
13. Higiene sobre 37 archivos modificados/no trackeados: UTF-8 válido, sin BOM, sin trailing whitespace y con newline final; exit 0.

## 8. Incidencias y resolución

- Git reportó `dubious ownership` bajo el usuario sandbox. Se usó `-c safe.directory=<workspace>` efímero; no se modificó configuración Git.
- Node produjo `EPERM` de `realpath` dentro del sandbox restringido. Los gates locales se reejecutaron con autorización fuera del sandbox; no se habilitó red ni Firebase remoto.
- El primer focal unitario expuso expectativas v1 obsoletas y una detección regex demasiado amplia. Se conservaron recuperación code-3 y compatibilidad histórica, se ajustaron las pruebas y el focal terminó 86/86.
- La primera Suite Emulator completa terminó con código 1. El diagnóstico focal ubicó la regresión en la liberación de coordinaciones cuando cambiaba la Temporada: la relectura nueva lanzaba antes de persistir el resultado histórico.
- Se corrigió la fase A para liberar la coordinación y consumir el intent de reactivación dentro de la transacción; si la activación ya existe, el retry recupera el resultado durable sin releer un slot posterior. E2-09 pasó 7/7, serialización 58/58 y luego la Suite completa pasó con exit 0.
- Firebase CLI no pudo obtener MOTD/config remota por el bloqueo de red; el propio CLI lo clasificó no fatal.
- Permanecen warnings históricos no bloqueantes: SDK Functions 4.9.0 sin soporte de las Extensions más nuevas, snapshots de triggers sin `readTime` en fixtures y `caniuse-lite` desactualizado.
- No se debilitaron aserciones ni se omitieron suites históricas.

## 9. Matriz final de UAT

| UAT | Resultado | Clasificación fiel |
|---|---|---|
| 01 | Aprobada: el Owner vigente visualiza el cierre aun sin Persona propia. | Manual |
| 02 | Aprobada: cancelar no confirmó el cierre y preservó foco/comportamiento. | Manual |
| 03 | Aprobada: con Membresías activas se rechazó con `Todavía hay integrantes activos. Cada Membresía debe finalizarse explícitamente antes del cierre.` | Manual |
| 04 | Aprobada: navegación al roster correcta. | Manual |
| 05 | Aprobada: las Membresías activas se finalizaron explícitamente con la capacidad administrativa existente. | Manual |
| 06 | Aprobada: resueltos los bloqueadores, la Temporada pudo cerrarse. | Manual |
| 07 | Confirmada la persistencia del cierre, receipt y liberación del slot según evidencia disponible. | UI + inspección persistente |
| 08 | Aprobada: se abrió la Temporada N+1. | Manual |
| 09 | El retry histórico de N no fue recorrible desde UI; recuperación segura frente a N+1 cubierta por idempotencia. | Emulator/automatización; no manual |
| 10 | Aprobada: la Solicitud atravesó N→N+1 sin ser descartada. | Manual |
| 11 | Aprobada: la aprobación operó sobre la Temporada abierta actual. | Manual |
| 12 | Aprobada para usuario no Owner; la variante de rol global quedó cubierta sin atribución manual. | Manual (no Owner) + Emulator/automatización (rol global) |
| 13 | Confirmado que ownership y Grupo permanecieron intactos. | Manual y/o inspección persistente |
| 14 | Confirmada la historia intacta de Membresías. | Inspección persistente |
| 15 | Partido y Torneo permanecen fuera del write-set; no existe evidencia de comparación byte a byte manual. | Inspección/automatización; no manual |
| 16 | Aprobada: E2-15 no incorpora reapertura ni historial paginado. | Manual |

No se presenta como manual ningún escenario ejecutado únicamente mediante Emulator, automatización o inspección documental/persistente.

## 10. Límites y deuda residual

- `E2-DATA-INTEGRITY-01` permanece abierta deliberadamente; CU-018 garantiza writers canónicos y falla cerrada sobre corrupción alcanzable, no saneamiento global.
- E2-14 y Etapa 2 siguen abiertas; E3 no está habilitada.
- CU-017, CU-019, CU-029, reapertura, renovación, historial paginado y reparación administrativa quedan fuera de alcance.
- Observación de producto no bloqueante: el cierre exige finalizar explícitamente cada Membresía activa y nunca la elimina. En grupos numerosos el flujo individual puede resultar tedioso.
- Evaluar en un incremento normativo separado una finalización administrativa masiva con confirmación reforzada, idempotencia, resultado por integrante y manejo de fallos parciales. No debe acoplarse implícitamente a `closeSeason`.
- Después de abrir N+1, evaluar por separado una capacidad para invitar integrantes de la Temporada anterior. Invitar o notificar no debe crear ni renovar Membresías silenciosamente.
- La renovación intertemporada pertenece a CU-029/E2-18 y debe preservar consentimiento, trazabilidad e idempotencia.
- No se implementan ahora correos, renovación automática, finalización masiva ni cambios adicionales de UX.
- Los hallazgos históricos del lint baseline y los warnings de dependencias no se retiraron por no pertenecer a E2-15.
- La UAT quedó aprobada con la clasificación de evidencia consignada en la matriz anterior.

## 11. Estado Git previo al versionado

- Rama `feat/e2-15-season-close`, HEAD `5823976305917f27a11b2255b09e9ee1be5cf830`, upstream `origin/feat/e2-15-season-close` sin divergencia `0/0` después de `fetch`.
- Implementación local no stageada; índice vacío; cero stashes.
- Ficha E2-15 idéntica al blob versionado; E2-14, Documento 5 y Auth/UAT intactos.
- Auth/UAT aislada en la rama local `chore/preserve-auth-emulator-uat-changes`, commit `fc7135e358902a17372d44f20df50883603520ce`, sin integración.
- Rama remota histórica `origin/feat/e2-15-season-close-history` preservada en `a721badc1ec7c307898d623b54c10251489b12f7`.
- Inspección de 37 archivos locales: 36 técnicos y este informe; sin eliminados, secretos reales, logs, temporales, datos de Emulator, builds, dependencias, lockfiles ni archivos ajenos. Las credenciales encontradas son exclusivamente fixtures sintéticos de Emulator.
- Revisión integral consistente con CU-018 y sus adaptaciones de serialización; `git diff --check` exit 0.
- Sin deploy, acceso Firebase remoto ni emuladores escuchando.
- E2-16 no fue iniciado.
