# E2-05 — Informe de implementación de finalización de Membresía propia del Owner

## 1. Identificación, rama y checkpoint

- Incremento: `E2-05 — Finalización explícita de la Membresía propia del Owner`.
- Ficha vinculante: `docs/implementacion/etapa-2/E2-05-ficha-finalizacion-membership-owner-self.md`, estado `LISTA PARA IMPLEMENTAR`.
- Rama de trabajo: `feat/e2-05-finalize-owner-membership`.
- HEAD base y merge-base con `dev`: `da5db2ecd49bd59f56fbb52ef735f2bfe3b4d824`.
- Commits posteriores: `0`.
- Upstream propio: ninguno.
- Implementación mantenida sin commit, push, merge ni despliegue.

El preflight confirmó la ficha introducida por el checkpoint autorizado, el árbol inicial esperado, las convenciones del repositorio y las capacidades públicas de Grupo, ownership y Temporada implantadas por E2-01/E2-02. También se revisaron la ficha, informe y cierre de E2-03 y E2-04, y las secciones aplicables del Documento 5. No se modificaron la ficha normativa, Documento 5 ni artefactos de incrementos anteriores fuera de la compatibilidad E2-03/E2-04 expresamente aprobada.

## 2. Objetivo y alcance entregado

Se implementó un único comando público nuevo:

```text
finalizeMyMembershipForOwnedGroup({ groupId })
```

El actor se deriva exclusivamente del token, de `users/{uid}.personaId`, del Grupo v1 activo y de su ownership vigente. La operación sólo puede finalizar la Membresía de esa Persona para ese Grupo y para la Temporada exacta abierta durante la primera transición.

Quedaron fuera de alcance salida general, acciones sobre terceros, reactivación, renovación, cierre de Temporada, roster, roles, motivos, escritura de arrays legacy y cualquier implementación de CU-028/CU-029.

## 3. Arquitectura y fronteras

La implementación conserva las fronteras actuales:

- dominio de Membresía puro y sin Firebase;
- aplicación con contratos, DTO, errores y dependencias explícitas;
- persistencia Firestore encapsulada en infraestructura;
- Grupo y ownership consumidos mediante la capacidad aprobada;
- Temporada consumida mediante su capacidad existente;
- frontend exclusivamente mediante callables;
- ninguna importación de repositorios privados de Grupo o Temporada desde Membresías.

La composición del módulo incorpora el lifecycle guard como coordinación técnica. No se modificaron los Agregados Usuario, Persona, Grupo o Temporada.

## 4. Archivos creados

### Producción e integración

- `volley-ranking-system/functions/callables/finalizeMyMembershipForOwnedGroup.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipObservability.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipLifecycleGuard.js`.
- `volley-ranking-frontend/src/components/memberships/membershipFinalizationMachine.mjs`.
- `volley-ranking-frontend/src/components/memberships/membershipFinalizationMachine.d.mts`.

### Pruebas

- `volley-ranking-system/functions/test/unit/membershipFinalizationMachine.test.js`.
- `volley-ranking-system/functions/test/unit/membershipLifecycle.test.js`.
- `volley-ranking-system/functions/test/unit/membershipObservability.test.js`.
- `volley-ranking-system/functions/test/unit/membershipSeasonContext.test.js`.

### Documentación

- `docs/implementacion/etapa-2/E2-05-informe-implementacion.md`.

## 5. Archivos modificados

### Frontend

- `volley-ranking-frontend/src/components/memberships/OwnMembershipSection.tsx`.
- `volley-ranking-frontend/src/services/membershipsService.ts`.
- `volley-ranking-frontend/src/types/OwnMembership.ts`.

### Backend y reglas

- `volley-ranking-system/firestore.rules`.
- `volley-ranking-system/functions/callables/createMyMembershipForOwnedGroup.js`.
- `volley-ranking-system/functions/callables/getMyMembershipForOwnedGroup.js`.
- `volley-ranking-system/functions/index.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipContract.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipDto.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipErrors.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipHashing.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipService.js`.
- `volley-ranking-system/functions/src/memberships/domain/membership.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreActiveMembershipGuard.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipRepository.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipCallable.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipModule.js`.

### Pruebas e infraestructura de prueba

- `volley-ranking-system/functions/test/emulator/membershipE2.test.js`.
- `volley-ranking-system/functions/test/run-emulator-tests.js`.
- `volley-ranking-system/functions/test/unit/membershipArchitecture.test.js`.
- `volley-ranking-system/functions/test/unit/membershipCallable.test.js`.
- `volley-ranking-system/functions/test/unit/membershipContract.test.js`.
- `volley-ranking-system/functions/test/unit/membershipDomain.test.js`.
- `volley-ranking-system/functions/test/unit/membershipGuard.test.js`.
- `volley-ranking-system/functions/test/unit/membershipHashing.test.js`.
- `volley-ranking-system/functions/test/unit/membershipService.test.js`.

## 6. Modelo de dominio y transición

El Aggregate Root Membresía quedó como unión discriminada estricta:

- activa v1: `personId`, `groupId`, `seasonId`, `estado: "activa"`, `fechaIngreso`, `createdAt`, `schemaVersion: 1`;
- finalizada v2: los mismos campos de identidad y referencia, `estado: "finalizada"`, `fechaEgreso`, `createdAt`, `schemaVersion: 2`.

La hidratación rechaza campos extra, estados/versiones cruzados, timestamps inválidos y esquemas incompletos. `finalize(finalizedAt)` conserva identidad, Persona, Grupo, Temporada, ingreso y creación; exige `fechaEgreso >= fechaIngreso`; produce v2 y rechaza una segunda mutación. Las activas existentes no se migran ni reescriben hasta que ejecutan la transición aprobada.

## 7. Contratos públicos, DTO y errores

El payload de finalización es un objeto plano y cerrado con únicamente `groupId`. UID, Persona, Membresía, Temporada, estado, fechas, motivo, roles, permisos e idempotency key no se aceptan desde cliente.

Outcomes:

- `FINALIZED` para la primera transición confirmada;
- `ALREADY_FINALIZED` para la recuperación íntegra de una transición ya persistida.

El DTO finalizado expone exactamente `id`, `groupId`, `seasonId`, `estado`, `fechaIngreso` y `fechaEgreso`. El DTO activo owner-scoped permanece compatible con E2-03. Se agregaron los reasons `MEMBERSHIP_NOT_FOUND` (`not-found`) y `MEMBERSHIP_REACTIVATION_REQUIRED` (`failed-precondition`). Las respuestas públicas conservan mensaje sanitizado y sólo `details.reason`.

`getMyMembershipForOwnedGroup` devuelve activa, finalizada o `null` de acuerdo con la coordinación vigente. `listMyCurrentGroupMemberships` conserva entrada, DTO, cursor e índice E2-04 y continúa listando exclusivamente activas.

## 8. Autorización y privacidad

El orden observable permanece autenticación, cuenta, Persona, Grupo, ownership y recién después Membresía. El Grupo se relee dentro de la transacción y durante recuperaciones autoritativas. Si el actor dejó de ser Owner no se expone el DTO, incluso cuando la finalización ya estaba persistida.

La observabilidad permanente registra sólo operación, etapa estable, reason final, código estructurado, clase/nombre técnico e intento cuando existe. Sus pruebas verifican ausencia de UID, Persona, Grupo, Membresía, email, token, claves, hashes, payloads, documentos, snapshots y stack en la respuesta pública. No transforma excepciones ni participa de decisiones funcionales.

## 9. Persistencia y lifecycle guard

La colección `membershipLifecycleGuards` utiliza ID determinista con el dominio y orden de hashing aprobados para Persona–Grupo. Su esquema exacto es:

```text
membershipId
personId
groupId
seasonId
creationIdempotencyKeyHash
creationRequestHash
finalizedAt
lifecycleGuardVersion: 1
```

Es coordinación técnica vigente y tombstone posterior a E2-05; no es Aggregate Root, historial ni autoridad funcional. Sólo un futuro caso aprobado de reactivación/renovación podrá consumirlo o reemplazarlo. La implementación no convierte su presencia en requisito eterno de cada Membresía finalizada histórica.

En la primera finalización se actualiza la misma Membresía a v2, se elimina el active guard y se crea el lifecycle guard en un único commit. No hay reparación, adopción, deducción ni borrado automático ante estados incompletos.

## 10. Máquina transaccional y timestamp

Las lecturas preceden a las escrituras. La resolución relee Grupo y ownership, active guard, lifecycle guard, la Membresía referenciada y consultas de integridad; luego clasifica `active-only`, `lifecycle-only`, `none` o `both`.

- `active-only`: valida activa v1, correlación, unicidad y Temporada exacta abierta; transiciona atómicamente y devuelve `FINALIZED`.
- `lifecycle-only`: valida finalizada v2 y correlación completa; no exige Temporada todavía abierta, no escribe y devuelve `ALREADY_FINALIZED`.
- `both`: falla cerrado con `INCOMPATIBLE_STATE`.
- `none`: distingue inexistencia legítima de huérfanas, duplicados, mezcla o corrupción sin reparar.

Dentro de cada intento se genera exactamente un `Timestamp.now()`. El mismo valor se entrega a `membership.finalize`, queda en `fechaEgreso` y se persiste en `lifecycle.finalizedAt`. No se usa timestamp cliente ni `serverTimestamp()` para la finalización.

## 11. Idempotencia, CU-025 y concurrencia

CU-025 lee active guard y lifecycle guard dentro de su coordinación transaccional:

- antes de finalizar, misma intención conserva `EXISTING_IDEMPOTENT` y otra intención conserva `MEMBERSHIP_ALREADY_EXISTS`;
- con lifecycle vigente, cualquier clave devuelve `MEMBERSHIP_REACTIVATION_REQUIRED`;
- nunca recrea una activa ni fabrica un DTO activo después de finalizar.

La relectura autoritativa confirma Grupo, ownership, ambos guards, Membresía, hashes y correlación. Puede resolver la misma intención activa, otra intención activa o lifecycle finalizado sólo cuando el estado completo lo demuestra. Corrupción devuelve `INCOMPATIBLE_STATE`; ausencia o estado ambiguo conserva el error no confirmado. No se agregó `code: 3` a los clasificadores genéricos de dependencia o contención.

## 12. Incidente concurrente y diagnóstico

### Observación inicial no reproducida

Una primera falla concurrente CU-025 apareció sin conservar su excepción interna. Dos corridas funcionales posteriores y cuarenta carreras adicionales convergieron correctamente: una Membresía, un active guard, cero lifecycle guards, `CREATED_ACTIVE` y `MEMBERSHIP_ALREADY_EXISTS`. Esa fase se registró como `OBSERVADA — CAUSA NO REPRODUCIDA` y no produjo una corrección especulativa de CU-025.

### Reproducción posterior

Una Emulator Suite canónica posterior reprodujo HTTP 500/`INTERNAL_ERROR` en la concurrencia de `membershipE2.test.js`, con operación `create`, etapa general `transaction`, primer intento y causa `Error` con `code: 3` numérico. La corrida diagnóstica única, con evidencia persistente fuera del repositorio, localizó la operación exacta en `finalized-membership-query`. Antes de evaluar outcomes se comprobó finalmente una Membresía activa, un active guard, cero lifecycle guards y correlación íntegra.

### Causa raíz confirmada y clasificación

Clasificación: **A — regresión E2-05 en coordinación lifecycle**.

E2-05 había incorporado las consultas de integridad activa y finalizada en paralelo dentro de la transacción. Bajo contención, el intento podía quedar cerrado mientras la consulta finalizada pendiente todavía utilizaba esa transacción. El error estructurado provenía de esa operación, no del mapper, callable, hidratación de lifecycle ni construcción del DTO.

### Corrección aplicada

Las consultas activa y finalizada ahora se ejecutan secuencialmente. Una etiqueta privada en `WeakMap` se asigna sólo al objeto de error que sale de `finalized-membership-query`. El código 3 se reconoce únicamente junto con esa etiqueta; no se inspecciona texto libre, no se amplían mappers generales y no se transforma indiscriminadamente `UNKNOWN`, `INTERNAL` o cualquier error transaccional.

Cuando esa forma exacta aparece, se ejecuta relectura autoritativa read-only. Misma intención activa coordinada devuelve `EXISTING_IDEMPOTENT`; otra intención activa coordinada, `MEMBERSHIP_ALREADY_EXISTS`; lifecycle finalizado coordinado, `MEMBERSHIP_REACTIVATION_REQUIRED`; corrupción, `INCOMPATIBLE_STATE`. Si no existe estado confirmatorio, se relanza el error original y el servicio conserva `INTERNAL_ERROR` sanitizado.

Las pruebas deterministas cubren código 3 etiquetado con ganador confirmado, misma y distinta intención, lifecycle finalizado, corrupción, ausencia sin confirmación, cardinalidad exacta y ausencia de DTO activo falso.

## 13. Frontend

`OwnMembershipSection` implementa estados activa y finalizada, confirmación explícita, explicación de que el ownership se conserva, cancelación sin callable, single-flight, estado finalizando, outcomes `FINALIZED`/`ALREADY_FINALIZED`, retry recuperable, no autorizado e incompatible. No hay actualización optimista.

Después de finalizar persiste la representación finalizada, se informa que la reactivación todavía no está disponible y no se vuelve a ofrecer CU-025. La máquina ejecutable separa la evidencia funcional del chequeo estructural. Se conservaron foco posterior al resultado, anuncios accesibles, teclado, cierre por Escape y presentación responsive. No se agregaron controles de terceros.

## 14. Reglas, índices y legado

`firestore.rules` añade únicamente:

```text
match /membershipLifecycleGuards/{guardId} {
  allow read, write: if false;
}
```

Membresías, active guards y lifecycle guards permanecen backend-only. `firestore.indexes.json` está intacto respecto de HEAD, es JSON válido y conserva 10 índices y 0 overrides. Emulator confirmó que el diseño aprobado no necesita un índice nuevo.

No se escriben arrays legacy ni se modifican los contratos, cursores o índices de E2-04. E2-02 permanece sin cambios. Las adaptaciones de E2-03 se limitan a leer lifecycle y resolver el punto de contención compartido; no se declara corregida ninguna deuda general independiente de E2-03.

## 15. Pruebas agregadas y evidencia

La cobertura añadida incluye:

- dominio activo v1/finalizado v2, campos exactos, versiones cruzadas, timestamps, transición, inmutabilidad y segunda transición;
- payload cerrado, DTOs, outcomes, errores HTTPS y sanitización;
- lifecycle ID/esquema, timestamp único, atomicidad, rollback, correlación y cero reparación;
- máquina `active-only`, `lifecycle-only`, `none`, `both`, huérfanas, duplicados y corrupción;
- doble finalización, respuesta perdida, alta contra finalización, transferencia de ownership y cero recreación;
- regresión E2-03/E2-04 y exclusión de finalizadas del listado actual;
- deny-all directo sobre las tres colecciones y fronteras arquitectónicas;
- máquina de estados frontend ejecutable y prueba estructural diferenciada;
- cleanup exclusivamente registral, preservación de fixtures ajenos y proyecto Emulator `demo-*`.

La observación posterior de severidad baja consistía únicamente en que la aserción de `CREATED_ACTIVE` se presentaba antes que la aserción de cardinalidad/correlación, aunque ambas ocurrían después de las mismas lecturas. Se reordenaron mecánicamente esas dos líneas sin cambiar condiciones, valores esperados, fixtures, timeouts, producción o semántica. La sintaxis y la suite Emulator focalizada aprobaron después del reordenamiento.

## 16. Gates y resultados

| Gate | Resultado |
| --- | --- |
| Unitarias focalizadas E2-05 | Aprobado, `34/34` |
| Unitarias completas | Aprobado, `199/199` |
| Emulator focalizada posterior original | Aprobado, `18/18` |
| Emulator canónica posterior a la corrección | Aprobado, `94/94` |
| Mantenimiento/reglas | Aprobado, `7/7` |
| Sintaxis Functions | Aprobado, `210/210` |
| Typecheck | Aprobado |
| Build independiente | Aprobado, 21 páginas |
| Lint baseline | Aprobado; 39 errores y 9 warnings conocidos, con 6 hallazgos menos que el baseline |
| Reglas | Aprobado en Emulator y revisión semántica |
| Índices JSON/semántica | Aprobado; archivo intacto, 10 índices, 0 overrides |
| `git diff --check` / `npm run quality:diff` | Aprobado, código 0 |
| Sintaxis focal posterior al reordenamiento | Aprobado, `node --check`, código 0 |
| Emulator focalizada posterior al reordenamiento | Aprobado, código 0 |

El gate final se considera satisfecho mediante componentes canónicos e independientes equivalentes. La ejecución agregada fue interrumpida por el wrapper local después de aprobar la Emulator Suite; el build y quality:diff aprobaron independientemente.

La interrupción no fue un fallo del repositorio ni del build. El wrapper PowerShell de captura tenía `ErrorActionPreference=Stop` y promovió un warning no bloqueante de Browserslist a `NativeCommandError` mientras comenzaba el build. `quality:stage0` no se presenta como una ejecución monolítica completada y no se repitió. La Emulator incluida en esa ejecución había aprobado `94/94`, y los componentes restantes fueron acreditados por sus comandos canónicos independientes.

## 17. Efectos colaterales ausentes

- Sin Firebase remoto, credenciales reales ni red de datos remota.
- Sin commit, push, merge o deploy.
- Sin cambios en índices, dependencias o lockfiles.
- Sin cambios en E2-02, ficha E2-05 o Documento 5.
- Sin `E2-05-cierre.md`.
- Sin escrituras legacy, migraciones, reactivación o terceros.
- Sin instrumentación diagnóstica temporal, logs versionables, listeners o procesos Emulator residuales.
- Los logs diagnósticos se conservaron fuera del repositorio y no forman parte del inventario versionable.

## 18. Limitaciones, deuda y exclusiones

- Reactivación y renovación requieren futuros CU-028/CU-029 aprobados.
- La observación inicial no reproducida no prueba la inexistencia de deuda independiente en E2-03; la corrección documentada se limita a la interacción introducida por lifecycle E2-05.
- Se conservan las deudas E2-04 ya documentadas: N+1 acotado, páginas físicas filtradas y ausencia de snapshot multipágina.
- Los warnings históricos del lint baseline y la advertencia de datos Browserslist desactualizados no se modificaron ni se reclasificaron como deuda E2-05.

## 19. Riesgos y UAT pendiente

UAT debe validar en navegador real:

- confirmación y cancelación sin invocación accidental;
- single-flight y estado visual durante latencia;
- foco posterior, anuncios de lector de pantalla, teclado y Escape;
- persistencia visual de la Membresía finalizada al recargar;
- desaparición del Grupo de “Grupos que integrás” tras reconsulta;
- mensajes de no autorización, incompatibilidad, retry y reactivación no disponible;
- comportamiento responsive en los breakpoints usados por el dashboard.

UAT no debe probar reactivación, salida general ni acciones sobre terceros porque siguen fuera de alcance.

## 20. UAT manual ejecutada

### 20.1 Entorno e identificadores sintéticos

- Proyecto local: `demo-e205-uat`.
- Frontend: `http://127.0.0.1:3000`.
- Emulator UI: `http://127.0.0.1:4000`.
- UID Google Emulator: `1lwkrr5E7xgcLTey4JIkZslObGrT`.
- `personId`: `nIpKUihwv7t6GQcaVxnS`.
- `groupId`: `vnR6pTwuT3YYw80PTkFe`.
- `seasonId`: `MGjJaKkLK6CITcM751Mc`.
- `membershipId`: `xkGblHGvei11QULYO9vU`.
- La navegación se realizó mediante el dashboard, sin editar documentos desde Emulator UI.

### 20.2 Resultado por caso

| Caso | Resultado | Evidencia manual |
| --- | --- | --- |
| UAT-01 Presentación inicial | Aprobado | Membresía activa visible con Grupo, Temporada, acción de finalización y explicación comprensible; sin datos técnicos internos ni errores relevantes observados. |
| UAT-02 Cancelación | Aprobado | La confirmación se canceló; la Membresía continuó activa, sin cambios de contexto ni guards lifecycle. |
| UAT-03 Confirmación y single-flight | Aprobado | Confirmación única; botón bloqueado, progreso visible, sin éxito optimista ni duplicados; resultado accesible. |
| UAT-04 Persistencia | Aprobado | Tras recarga, navegación y nueva consulta, el estado finalizado persistió; Grupo y ownership continuaron accesibles. |
| UAT-05 Reintento | Aprobado | El estado finalizado se mantuvo, no se ofreció una finalización inválida ni se duplicó el efecto; no hubo mensajes técnicos crudos. |
| UAT-06 Accesibilidad y responsive | Aprobado | Teclado, foco, anuncios, nombres de controles, foco visible, 360 px, 768 px y escritorio verificados sin scroll horizontal ni acciones táctiles inutilizables. No se utilizó lector de pantalla; queda registrada esa limitación. |

### 20.3 Evidencia persistida antes y después

Antes de UAT-03: una Membresía `xkGblHGvei11QULYO9vU` en `activa`, un `activeMembershipGuard`, cero `membershipLifecycleGuards` y cero documentos en `requests`, `payments` y `activity`.

Después de UAT-05/UAT-06: la misma única Membresía quedó en `finalizada`, `schemaVersion: 2`, con `fechaEgreso`; `activeMembershipGuards: 0`; un único lifecycle guard `3c66565f87e3bc4b5fd044a6e7b730f27c1b400bda31eb340d57f9c56bf61b51`, correlacionado con la Membresía, Persona, Grupo y Temporada; y cero documentos en `requests`, `payments` y `activity`.

Grupo, Persona, Temporada y ownership permanecieron intactos. No se creó otra Membresía, no quedó active guard obsoleto y no se observaron efectos colaterales.

### 20.4 Errores, warnings y Git

- Logs funcionales locales: sin errores funcionales no explicados.
- Warnings observados: aviso histórico de `caniuse-lite` desactualizado y advertencias de conversión LF/CRLF de Git; ninguno bloqueó la UAT.
- `git diff --check`: aprobado.
- `git status --short`: conserva únicamente las rutas de implementación, pruebas e informe de E2-05; la UAT no añadió archivos.
- No se ejecutaron suites automatizadas adicionales.
- Los emuladores y el frontend fueron detenidos después de la inspección final.

### 20.5 Recomendación

Los seis casos manuales aprobaron. La implementación queda lista para revisión y versionado; no corresponde crear el cierre ni versionar todavía.

## 21. Estado Git

Antes de crear este informe el árbol contenía 26 rutas modificadas y 9 nuevas. Este documento agrega una décima ruta nueva. HEAD continúa en `da5db2ecd49bd59f56fbb52ef735f2bfe3b4d824`, con cero commits posteriores y sin upstream propio. La implementación queda local y sin versionar para revisión.

## 22. Veredicto

**E2-05 IMPLEMENTADO Y UAT APROBADA — LISTO PARA VERSIONAR**
