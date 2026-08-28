# E2-03 — Informe de implementación

## 1. Identificación, rama y checkpoint

- Incremento: `E2-03 — Alta explícita de Membresía propia del Owner`.
- Fecha de implementación: 2026-08-27.
- Rama inicial: `dev`.
- HEAD inicial y checkpoint documental: `2ae643c7c9ff8aaa18975297be8075987410ec33`.
- Upstream inicial: `origin/dev`.
- Divergencia inicial: `0/0`.
- Working tree inicial: limpio, sin archivos modificados o no seguidos.
- Rama de trabajo final: `feat/e2-03-membership-owner-self`.
- HEAD final: `2ae643c7c9ff8aaa18975297be8075987410ec33`; no se creó commit.

Se comprobó que el commit documental E2-03 era exactamente el HEAD inicial y, por lo tanto, estaba contenido en él. La rama de implementación se creó desde ese commit y `dev` no volvió a modificarse.

## 2. Fuentes normativas y convenciones revisadas

Se leyó íntegramente `E2-03-ficha-membership-owner-self.md`. También se revisaron, en la medida aplicable, ficha, informe y cierre de E1-02, E2-01 y E2-02; Documento 5 versionado; y código y pruebas canónicas de Usuario, Persona, Grupo y Temporada. No se encontró `AGENTS.md` en el árbol del repositorio.

Se reutilizaron estas convenciones vigentes:

- Aggregate Root puro, construcción y reconstrucción cerradas y DTO explícito de E1-02/E2.
- identidad callable derivada sólo de `context.auth.uid`, reasons estables y traducción a `HttpsError`.
- readers self-scoped y owner-scoped, puertos de aplicación y composición en infraestructura.
- auto-ID backend, timestamps de servidor y guards técnicos transaccionales.
- SHA-256 con entradas length-prefixed y dominio/versionado explícitos.
- relectura transaccional del Grupo y ownership, como en E2-01/E2-02.
- consumo de la capacidad pública `getOpenSeasonContext` de E2-02 mediante adaptador interno.
- frontend basado exclusivamente en servicios callable, clave de intención estable y single-flight.
- runner seguro de Emulator Suite sobre proyecto `demo-*`, loopback y datos sintéticos.

La ficha E2-03 gobernó las decisiones. No se reutilizó ningún contrato legacy de pertenencia.

## 3. Causa, objetivo y alcance

El producto tenía ownership canónico de Grupo y apertura canónica de Temporada, pero no una operación explícita para que el Owner incorporara su propia Persona como integrante. El incremento implementa exclusivamente esa intención owner/self-scoped.

El flujo valida cuenta y Persona canónicas, Grupo v1 activo, ownership vigente y Temporada abierta; crea una Membresía independiente activa y su guard técnico en el mismo commit; y garantiza como máximo una activa para el par Persona–Grupo entre Temporadas.

No crea ni modifica Usuario, Persona, Grupo o Temporada. Tampoco crea Solicitudes, roles, cargos, permisos, notificaciones, pagos ni entidades deportivas.

## 4. Arquitectura implementada

- **Dominio:** Aggregate Root Membresía puro, inmutable y sin Firebase; construcción inicial activa y reconstrucción estricta de schema v1.
- **Aplicación:** payloads cerrados, coordinación de cuenta/Persona/Grupo/Temporada, DTO mínimo, hashing contextual y errores estables; sin Admin SDK ni objetos internos de otros Agregados.
- **Infraestructura:** repositorio exclusivo de Membresía, reader owner/self-scoped, guard transaccional, adaptadores E1/E2, callables y composición.
- **Presentación:** servicio callable tipado y sección owner-scoped en el detalle canónico del Grupo; sin acceso directo a Firestore.

Membresías consume Temporada a través de `seasonModule.getOpenSeasonContext`. No importa `firestoreSeasonRepository`, `openSeasonGuards` ni detalles persistentes de E2-02.

## 5. Archivos creados

Backend de Membresía:

- `volley-ranking-system/functions/src/memberships/domain/membership.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipContract.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipDto.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipErrors.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipHashing.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipService.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipRepository.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreActiveMembershipGuard.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMyMembershipReader.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipExternalContexts.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipCallable.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipModule.js`.
- `volley-ranking-system/functions/callables/createMyMembershipForOwnedGroup.js`.
- `volley-ranking-system/functions/callables/getMyMembershipForOwnedGroup.js`.

Frontend:

- `volley-ranking-frontend/src/types/OwnMembership.ts`.
- `volley-ranking-frontend/src/services/membershipsService.ts`.
- `volley-ranking-frontend/src/components/memberships/OwnMembershipSection.tsx`.
- `volley-ranking-frontend/src/components/memberships/membershipIntent.mjs`.
- `volley-ranking-frontend/src/components/memberships/membershipIntent.d.mts`.

Pruebas:

- `volley-ranking-system/functions/test/unit/membershipDomain.test.js`.
- `volley-ranking-system/functions/test/unit/membershipContract.test.js`.
- `volley-ranking-system/functions/test/unit/membershipHashing.test.js`.
- `volley-ranking-system/functions/test/unit/membershipGuard.test.js`.
- `volley-ranking-system/functions/test/unit/membershipService.test.js`.
- `volley-ranking-system/functions/test/unit/membershipCallable.test.js`.
- `volley-ranking-system/functions/test/unit/membershipArchitecture.test.js`.
- `volley-ranking-system/functions/test/unit/membershipIntent.test.js`.
- `volley-ranking-system/functions/test/emulator/membershipE2.test.js`.
- `volley-ranking-system/functions/test/helpers/firestoreFixtureRegistry.js`.

Este informe es el único documento nuevo.

## 6. Archivos modificados

- `volley-ranking-system/functions/index.js`: exporta los dos callables E2-03.
- `volley-ranking-system/firestore.rules`: denegación backend-only explícita.
- `volley-ranking-system/firestore.indexes.json`: único índice compuesto requerido.
- `volley-ranking-system/functions/test/run-emulator-tests.js`: incorpora la suite E2-03 y limpia sus colecciones sintéticas.
- `volley-ranking-system/functions/test/unit/seasonArchitecture.test.js`: actualiza la expectativa estructural del detalle canónico.
- `volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx`: reemplaza la sección estática por el flujo owner/self-scoped.

No se modificaron dependencias, lockfiles, Documento 5, fichas previas, rutas legacy ni `derfgtyhj`.

## 7. Contratos públicos y DTO

- `createMyMembershipForOwnedGroup({ groupId, idempotencyKey })` devuelve `{ outcome, membership }`.
- `getMyMembershipForOwnedGroup({ groupId })` devuelve `{ membership: MembershipDto | null }`.

Los payloads son cerrados. Se rechazan UID, userId, personId, seasonId, estado, fechaIngreso, rol, cargo, permisos y cualquier propiedad adicional. La identidad se deriva exclusivamente del token.

Outcomes de creación:

- `CREATED_ACTIVE` para la primera confirmación.
- `EXISTING_IDEMPOTENT` para el retry de la misma intención y contexto.

El DTO contiene exclusivamente `id`, `personId`, `groupId`, `seasonId`, `estado` y `fechaIngreso`; `fechaIngreso` se serializa ISO-8601 UTC. No expone `createdAt`, schema, guard, hashes, clave, snapshots ni datos personales o administrativos.

Los reasons normativos se traducen a códigos HTTPS estables: autenticación, cuenta/Persona/Temporada requeridas, incompatibilidades, not-found, falta de autorización, validación, existencia, conflicto de idempotencia, estado incompatible, conflicto transaccional, dependencia no disponible e internal sanitizado.

## 8. Esquema físico de Membresía

`memberships/{membershipId}` contiene exclusivamente:

- `personId`.
- `groupId`.
- `seasonId`.
- `estado: "activa"`.
- `fechaIngreso`.
- `createdAt`.
- `schemaVersion: 1`.

`membershipId` es un auto-ID opaco generado por backend. No se deriva del UID, email, Persona, Grupo o Temporada y no puede ser aportado por cliente. `fechaIngreso` y `createdAt` usan timestamps de servidor confirmados dentro de la misma transacción.

## 9. Guard, ID y hashes

`activeMembershipGuards/{guardId}` contiene exclusivamente:

- `membershipId`.
- `personId`.
- `groupId`.
- `seasonId`.
- `idempotencyKeyHash`.
- `requestHash`.
- `createdAt`.
- `guardVersion: 1`.

El guard es sólo control técnico. Su ID y hashes se calculan con SHA-256 length-prefixed y los dominios exactos:

- guard: `sportexa:E2-03:active-membership-guard:v1`, `groupId`, `personId`;
- idempotencia: `sportexa:E2-03:idempotency:v1`, `userId`, `groupId`, `personId`, clave;
- request: `sportexa:E2-03:request:v1`, `contract-v1`, `userId`, `personId`, `groupId`, `seasonId`.

La clave cruda nunca se persiste ni registra.

## 10. Unicidad, integridad e idempotencia

La transacción relee Grupo v1, verifica `estado: "activo"` y `ownerId == UID`, lee el guard determinista y valida estrictamente su Membresía si existe. Sin guard consulta activas por `personId`, `groupId` y `estado` con `limit(2)`.

Primera intención crea Membresía y guard atómicamente. Retry con la misma clave y request devuelve la misma Membresía. Misma clave con request incompatible produce `IDEMPOTENCY_CONFLICT`; otra clave con activa existente produce `MEMBERSHIP_ALREADY_EXISTS`. Peticiones concurrentes convergen en como máximo una Membresía activa Persona–Grupo, incluso si la activa corresponde a otra Temporada.

Guard incompatible, guard sin Membresía, Membresía incompatible, activa huérfana de guard o más de una activa fallan cerrado con `INCOMPATIBLE_STATE`. No existe adopción, reparación, eliminación, backfill ni reconciliación automática.

La idempotencia queda deliberadamente acotada al guard Persona–Grupo. No se agregó colección global ni retención histórica.

## 11. Autorización

La autorización funcional usa exclusivamente `groups/{groupId}.ownerId == UID autenticado`. `users.roles`, global admin, `adminIds`, `admins`, `memberIds`, Persona, Membresía, Plan y Suscripción no conceden autoridad.

Ownership se relee dentro de la transacción antes de escribir. Un Owner sin Persona conserva la administración del Grupo y recibe `PERSON_REQUIRED`. Una Membresía activa no concede ownership ni permisos administrativos. Las pruebas rechazan expresamente al global admin no Owner y el ownership transferido antes del commit.

## 12. Reglas e índice

Las reglas deniegan explícitamente toda lectura y escritura directa sobre:

- `/memberships/{membershipId}`.
- `/activeMembershipGuards/{guardId}`.

La denegación cubre visitante, autenticado, Owner, integrante y global admin. El acceso productivo sólo ocurre mediante backend autorizado.

Se agregó exclusivamente el índice compuesto de `memberships` con `personId ASC`, `groupId ASC` y `estado ASC`. No se agregaron índices de historial, fechas, `seasonId`, roles o listados. El índice no fue desplegado.

## 13. Integración frontend

La integración existe sólo en `/dashboard/groups/[groupId]`. La sección representa carga, Persona requerida, Temporada requerida, elegibilidad, confirmación, activa, resultado idempotente, error recuperable y estado no autorizado/incompatible.

La acción `Incorporarme como integrante` es explícita y nunca se dispara al cargar, navegar, crear Grupo, abrir Temporada o vincular Persona. Un guard single-flight evita doble envío y la misma clave se conserva ante timeout, unavailable, `CONFLICT` o respuesta perdida. `IDEMPOTENCY_CONFLICT` bloquea el retry ciego: la UI exige reconsultar, confirmar ausencia y accionar explícitamente `Comenzar una nueva intención` antes de generar otra clave. Cambiar funcionalmente `groupId` invalida la intención anterior. Sólo el resultado confirmado muestra la Membresía.

La interfaz incluye región viva, alertas, traslado de foco al resultado, botón deshabilitado durante confirmación, objetivos táctiles y layout responsive. No se modificaron ni alimentaron rutas legacy.

## 14. Pruebas implementadas

Las pruebas unitarias cubren dominio, reconstrucción estricta, payloads cerrados, DTO, UID desde token, reasons/códigos HTTPS, validación de cuenta y Persona, Grupo/ownership, Temporada, hashing determinista, guard exacto, correlación, retry y restricciones arquitectónicas/frontend.

La suite Emulator E2-03 contiene 13 subtests integrados que cubren: visitante/payload; Persona requerida e incompatible; Grupo/ownership/global admin/Temporada; documento y guard exactos; timestamps y cero efectos colaterales; diagnóstico estructurado de contención; retry/respuesta perdida/claves; idempotencia por contexto; concurrencia real en 20 pares; máximo una activa; otra Temporada; activa huérfana; guard roto; múltiples activas; ownership transferido antes de invocar; transferencia sincronizada después del preflight y antes de la transacción; reglas negativas; y cleanup que preserva documentos ajenos.

El incremento corregido eleva la suite unitaria de 132 a 157 pruebas y la Emulator Suite de 67 a 80 pruebas.

## 15. Comandos y resultados

| Comando/gate | Resultado final |
| --- | --- |
| `npm --prefix volley-ranking-system/functions run test:infra:unit` | `157/157`, código 0 |
| runner Emulator Suite canónico | Validación de consolidación final `80/80`, código 0; el bloqueo histórico E2-02 queda documentado en la revisión H04-R1 |
| `npm run quality:lint` | OK: 39 errores y 9 warnings conocidos; 6 hallazgos resueltos |
| `npm run quality:typecheck` | Correcto, código 0 |
| `npm run quality:functions:syntax` | `192/192` archivos JavaScript |
| pruebas de mantenimiento | `7/7` |
| `npm run quality:build` | Correcto; compilación, TypeScript y `21/21` páginas estáticas |
| `npm run quality:stage0` | Historia conservada: expuso H04-R1 durante la corrección. Para consolidación se ejecutaron individualmente todos los gates proporcionales requeridos y aprobaron |
| `git diff --check` | Correcto, código 0 |

Durante el desarrollo inicial hubo dos fallos focalizados no productivos: un typo de fixture (`personaId`) y contaminación entre suites por limpieza incompleta de auto-IDs/guards. La primera solución a la contaminación amplió indebidamente el teardown para borrar colecciones completas; la revisión independiente rechazó esa solución y motivó H02/H04. Un intento de `npm run build` desde `volley-ranking-system` también falló porque ese directorio no posee script `build`; se repitió con el gate canónico `npm run quality:build` desde raíz y aprobó.

Warnings no bloqueantes: perfil PowerShell referencia `fnm` no instalado; `caniuse-lite` informa antigüedad; Firebase Functions SDK informa soporte limitado de Extensions; Pub/Sub no se emula porque no participa; avisos LF→CRLF. No se actualizaron dependencias para ocultarlos.

## 16. Evidencia de ausencia de efectos colaterales

Las pruebas capturan y comparan las raíces antes/después y confirman que la operación válida sólo crea un documento en `memberships` y su guard correlacionado. Los rechazos no escriben. Usuario, Persona, Grupo y Temporada permanecen byte-a-byte sin cambios funcionales; tampoco aparecen Solicitudes, notificaciones, alertas, Actividad, pagos, partidos, equipos, participaciones, planes o suscripciones.

Los emuladores se ejecutaron sobre `demo-sportexa-e0-02`, hosts loopback y datos sintéticos descartables. El runner impide targets remotos y credenciales de aplicación. No se consultó ni modificó Firebase remoto.

## 17. Legado preservado

El módulo nuevo no lee, escribe, sincroniza ni reinterpreta `memberIds`, `adminIds`, `admins`, `pendingRequestIds`, `pendingAdminRequestIds`, `playerIds`, `posicionesPreferidas` ni contratos HTTP legacy de join/search/add/remove/requests. Tampoco modifica partidos, torneos, inscripciones o consumidores deportivos.

No hay doble escritura ni declaración de migración general. El único flujo migrado es la incorporación propia del Owner en el detalle canónico del Grupo. `derfgtyhj` permanece intacto.

## 18. Riesgos, deuda y exclusiones

Quedan fuera incorporación de Personas ajenas, Solicitudes, roles/cargos/permisos, baja, reactivación, renovación, historial, retención de idempotencia, reparación de corrupción, migraciones, cierre de Temporada, consumidores deportivos y cualquier acceso cliente directo.

La futura operación de cierre de Temporada deberá coordinar explícitamente su concurrencia con la creación de Membresías. E2-03 no intenta resolver esa carrera futura ni modificar el contrato de E2-02.

El índice compuesto queda versionado pero pendiente del procedimiento de despliegue autorizado. Hasta su disponibilidad en el entorno objetivo, la consulta correspondiente puede requerirlo; no se realizó despliegue durante esta intervención.

## 19. Estado Git, restricciones y UAT

Estado inicial: `dev`, HEAD `2ae643c7c9ff8aaa18975297be8075987410ec33`, upstream `origin/dev`, divergencia `0/0`, árbol limpio.

Estado final: `feat/e2-03-membership-owner-self`, sin upstream configurado, mismo HEAD, cambios locales exclusivamente de implementación, pruebas, reglas, índice, frontend e informe E2-03. No existe commit de implementación.

UAT manual queda pendiente. No se creó cierre formal E2-03.

Durante la intervención no hubo commit, push, merge, despliegue de Functions, reglas o índices, acceso a Firebase remoto ni modificación posterior de `dev`.

## 20. Revisión técnica independiente y correcciones H01–H04

La verificación técnica independiente posterior a la primera entrega devolvió `E2-03 REQUIERE CORRECCIONES`. Por ello, la afirmación original de aprobación completa quedó refutada hasta ejecutar esta intervención correctiva. No se borró ni reinterpretó esa historia.

### E2-03-H01 — clave atrapada tras `IDEMPOTENCY_CONFLICT`

- **Causa confirmada:** `intentKeyRef.current ??=` no diferenciaba un error ambiguo reintentable de una clave probadamente incompatible. La consulta posterior tampoco poseía una transición que autorizara descartarla.
- **Corrección:** se extrajo `membershipIntent.mjs`, una máquina de intención sin React. Conserva clave ante timeout, `CONFLICT`, unavailable y respuesta perdida; bloquea nuevos envíos tras `IDEMPOTENCY_CONFLICT`; exige reconsulta, ausencia confirmada y acción explícita para crear otra clave; y resetea el contexto al cambiar `groupId`.
- **Presentación:** se agregaron los estados `idempotency-conflict` y `new-intent-required`, con acciones separadas `Reconsultar estado de Membresía` y `Comenzar una nueva intención`. Ninguna reconsulta crea Membresía.
- **Prueba de regresión:** `membershipIntent.test.js` demuestra conservación de timeout/`CONFLICT`, bloqueo del retry ciego, reemplazo sólo después de ausencia + confirmación y cambio de Grupo sin generación implícita. `membershipArchitecture.test.js` conserva como complemento single-flight, doble click y accesibilidad.
- **Resultado:** focalizadas `8/8`; typecheck, lint y build aprobados.

### E2-03-H02 — teardown destructivo

- **Causa confirmada:** el `finally` iteraba ambas colecciones completas y eliminaba todo documento, incluyendo fixtures que no pertenecieran a E2-03. La ampliación había sido introducida para ocultar la contaminación por auto-IDs no prefijados.
- **Corrección:** `firestoreFixtureRegistry.js` registra referencias antes de escrituras manuales, IDs de Membresía devueltos por callables y guard IDs deterministas. Como red de seguridad ante respuesta perdida o fallo de aserción, el `finally` consulta Membresías únicamente por los `groupId` sintéticos exclusivos de la suite. Nunca lista para borrar una colección completa ni agrega campos productivos de prueba.
- **Garantía ante fallo:** el registro se crea antes de los subtests; guards posibles quedan registrados previamente; cada respuesta callable se registra antes de devolverse al test; y el `finally` ejecuta consulta acotada y cleanup aun cuando falle un subtest.
- **Prueba de regresión:** el emulador crea documentos ajenos en ambas colecciones, ejecuta un cleanup E2-03 local y comprueba que los ajenos siguen existiendo mientras los propios desaparecen. El registro exterior los elimina al finalizar porque esos dos documentos de evidencia sí pertenecen a la suite.
- **Resultado:** subtest aprobado en todas las corridas `79/79`.

### E2-03-H03 — transferencia concurrente de ownership

- **Causa confirmada:** la prueba inicial modificaba `ownerId` antes de invocar el callable; podía fallar en el preflight y no demostraba la relectura transaccional.
- **Corrección:** se conservó ese caso con nombre explícito de autorización negativa normal y se agregó otro determinista. La prueba nueva usa el puerto `activeMembershipGuard` ya inyectable: un wrapper exclusivo del test señala que terminaron cuenta, Persona, Grupo y Temporada; pausa antes de delegar; transfiere ownership; libera; y delega al guard Firestore real.
- **Sin seam productiva:** no se agregó payload, callable, variable de entorno ni hook al código productivo. El wrapper vive únicamente en el test y usa la abstracción de infraestructura existente.
- **Secuencia probada:** Owner inicial validado → señal de preflight completo → transferencia confirmada → transacción real relee Grupo → `NOT_AUTHORIZED` → cero Membresías y cero guards.
- **Resultado:** subtest aprobado repetidamente dentro de `79/79`.

### E2-03-H04 — `quality:stage0` intermitente

- **Evidencia recibida:** dos Emulator Suite `77/77` y una corrida posterior `75/77`; fallaron el subtest E2-02 `crea atómicamente schema v1 y guard exactos sin modificar Grupo ni otros Agregados` y su suite padre, bajo la raíz declarada en `seasonE2.test.js:58`. La aserción afectada exige `memberships` globalmente vacía (`expected: 0`) y había observado un documento E2-03 (`actual: 1`) en la reproducción previa de contaminación durante el desarrollo.
- **Reproducción controlada previa a corregir:** sin procesos en los puertos del runner y desde workspace efímero, una repetición aislada aprobó `77/77`; esto confirmó que el fallo no era constante y no se usó para declararlo resuelto.
- **Causa:** dependencia entre suites por estado global. El orden efectivo de Node ejecuta `membershipE2.test.js` antes de `seasonE2.test.js`; E2-02 conserva legítimamente su aserción de cero efectos colaterales. E2-03 debía retirar todos sus auto-IDs y guards, pero la primera implementación sólo sabía hacerlo mediante borrado global. Ese límite explicaba tanto la contaminación histórica como el teardown destructivo posterior. No se encontró proceso/puerto residual en la reproducción controlada.
- **Corrección mínima:** ownership explícito de fixtures, tracking inmediato de respuestas, guard IDs derivados y consultas finales restringidas a IDs sintéticos de la suite. No se cambió ninguna expectativa E2-02, no se agregaron sleeps, retries ni limpieza de datos ajenos.
- **Evidencia histórica, posteriormente insuficiente:** tres Emulator Suite consecutivas aprobaron entonces `79/79`, `fail 0`, código 0, y dos `quality:stage0` aprobaron con `148/148` unitarias y `79/79` Emulator. La segunda reverificación independiente demostró después H04-R1, por lo que esa serie no se presenta como prueba final de estabilidad frente a contención; fue reemplazada por la matriz posterior registrada debajo.

### E2-03-H04-R1 — contención concurrente escapaba como `INTERNAL_ERROR`

- **Estado de H01–H03:** la segunda reverificación independiente los declaró cerrados. Esta intervención no modificó frontend, máquina de intención, fixture registry ni seam de ownership; sus pruebas continuaron verdes.
- **Evidencia diagnóstica exacta:** una prueba exclusiva de emulador sincronizó transacciones mediante barreras y limitó cada una a un intento. La contención de lectura/escritura entregó `error.code = 10` de tipo `number`, `error.name = "Error"`, constructor `Error`, sin `cause`, con mensaje local `10 ABORTED: Transaction lock timeout.`. La colisión determinista de dos `transaction.create` sobre el mismo documento entregó al perdedor `error.code = 6` de tipo `number`, `name = "Error"`, constructor `Error`, sin `cause`, con mensaje local `6 ALREADY_EXISTS: entity already exists: .../memberships/e2-03-contention-diagnostic`. Los mensajes sólo se capturaron sobre IDs sintéticos en diagnóstico local y no participan del mapper ni del contrato público.
- **Causa raíz confirmada:** `mapInfrastructureError()` sólo inspeccionaba el `code` del error superior mediante la abstracción heredada de Grupo. Reconocía `ABORTED`/10 directo, pero no `ALREADY_EXISTS`/6 —la forma real no reintentable observada al competir `transaction.create`— ni códigos contenidos en `cause`. El código 6 no reconocido llegaba al servicio y era sanitizado legítimamente como `INTERNAL_ERROR`, aunque la escritura competidora ya estuviera confirmada.
- **Corrección física:** `firestoreActiveMembershipGuard.js` incorpora un clasificador estructurado y acotado que recorre como máximo seis causas, evita ciclos y reconoce 10/`ABORTED` y 6/`ALREADY_EXISTS` en variantes numéricas y textuales. El SDK instalado también marca 2/`UNKNOWN` y 13/`INTERNAL` como retryables transaccionales; éstos sólo habilitan una relectura confirmatoria, nunca un mapeo directo a `CONFLICT`.
- **Relectura autoritativa:** tras 6/10, el guard determinista se relee fuera de transacción sin escribir. Tras 2/13 se usa la misma validación estricta, pero sólo se resuelve si existe un competidor autoritativamente confirmado; si no hay guard ni activa se relanza exactamente el error original y el servicio conserva `INTERNAL_ERROR`. El guard se hidrata con el esquema exacto; la Membresía se reconstruye mediante el repositorio canónico y se valida la correlación completa de IDs, par, Temporada, estado, esquema y hashes. Misma clave y request devuelven `EXISTING_IDEMPOTENT`; otra clave devuelve `MEMBERSHIP_ALREADY_EXISTS`; misma clave con request distinto conserva `IDEMPOTENCY_CONFLICT`; guard o Membresía incompatibles y activa huérfana devuelven `INCOMPATIBLE_STATE`; ausencia confirmada tras 6/10 devuelve `CONFLICT`; una dependencia transitoria estructurada devuelve `DEPENDENCY_UNAVAILABLE`. La relectura no crea, repara, adopta, elimina ni actualiza documentos.
- **Pruebas unitarias:** `membershipGuard.test.js` cubre códigos 6 y 10 numéricos, variantes textuales, errores envueltos por `cause`, cableado del catch a la relectura, misma intención, otra intención, ausencia, corrupción, orfandad, dependencia transitoria, 2/13 con y sin competidor y ausencia de puertos de escritura. `membershipService.test.js` demuestra que un error desconocido permanece `INTERNAL_ERROR` sanitizado. Focalizadas finales: `18/18`; suite unitaria completa: `157/157`.
- **Pruebas Emulator:** `membershipE2.test.js` conserva concurrencia con la misma clave y agrega 20 iteraciones consecutivas de dos claves diferentes. Cada iteración exige exactamente un `CREATED_ACTIVE`, un perdedor `MEMBERSHIP_ALREADY_EXISTS` o `CONFLICT`, nunca `INTERNAL_ERROR`, una sola Membresía, un solo guard correlacionado y ninguna escritura parcial. El diagnóstico real de códigos 10 y 6 es un subtest separado y no relaja esas expectativas.
- **Incidente de verificación corregido:** el primer intento de la serie final exigía artificialmente que una de las dos transacciones diagnósticas confirmara. Una corrida cerró `78/80` porque ambas agotaron su lock con código 10; la suite funcional no falló. Se corrigió la aserción diagnóstica para exigir al menos un rechazo y que todos los rechazos sean 10 numérico, sin aceptar errores funcionales adicionales, sleeps, retries ni mayores timeouts. La serie de estabilidad se reinició desde cero.
- **Evidencia que refutó la primera matriz:** cinco Emulator Suite consecutivas habían aprobado `80/80`, pero el `quality:stage0` inmediatamente posterior reprodujo H04-R1 en la primera iteración de dos claves: `CREATED_ACTIVE` más HTTP 500 `INTERNAL_ERROR`, Emulator `78/80`. Esto demostró que reconocer sólo 6/10 era insuficiente y esa matriz fue descartada como estabilidad final. Cinco corridas diagnósticas instrumentadas posteriores aprobaron sin reproducir la forma privada intermitente; por eso la resolución de 2/13 quedó condicionada a estado persistente confirmado y no a mensajes.
- **Bloqueo de estabilidad posterior a la corrección ampliada:** la serie final aprobó su corrida 1 con `80/80`. La corrida 2 falló antes de ejecutar E2-03, en E2-02 `dos solicitudes iguales simultáneas crean una y recuperan una`: obtuvo `CREATED_OPEN` y un segundo resultado sin outcome; Emulator `78/80`. `firestoreOpenSeasonGuard.js` y `seasonE2.test.js` son byte-equivalentes a HEAD según `git diff --exit-code HEAD -- ...`, y usan el patrón E2-02 preexistente sin relectura post-contención. Corregir E2-02 excede el alcance exclusivo H04-R1; por ello no se reinició otra serie ni se ejecutaron dos stage0 finales.
- **Archivos modificados por H04-R1:** `firestoreActiveMembershipGuard.js`, `membershipGuard.test.js`, `membershipService.test.js`, `membershipE2.test.js` y este informe. No se modificaron reglas, índices, DTOs, payloads, dependencias, lockfiles ni código aceptado de H01–H03.

### Revisión adicional

- `seasonArchitecture.test.js` no relajó protecciones de E2-02: sólo reemplazó la expectativa obsoleta del texto estático por la presencia de `OwnMembershipSection`; permanecen intactas las prohibiciones Firestore, aislamiento de Agregados, estados, accesibilidad, retry y límites owner-scoped.
- Lint conserva exactamente el baseline: 39 errores y 9 warnings históricos, con 6 hallazgos resueltos; no hay hallazgos nuevos.
- Reglas e índice no cambiaron durante las correcciones y conservan el alcance exacto E2-03.
- No se agregaron dependencias o lockfiles y no se amplió el alcance funcional.

## 21. Reverificación independiente final y UAT

El bloqueo consignado al finalizar la corrección H04-R1 quedó superado por evidencia independiente posterior. Se conserva arriba como parte de la historia real de implementación y no se reescribe como si la primera entrega hubiese aprobado sin hallazgos.

### Reverificación independiente final

Veredicto recibido: **`E2-03 APTO PARA UAT — HALLAZGO PREEXISTENTE E2-02 REGISTRADO`**.

- H01: cerrado.
- H02: cerrado.
- H03: cerrado.
- H04-R1: cerrado.
- Unitarias Functions: `157/157`.
- Intención y arquitectura H01: `8/8`.
- Concurrencia E2-03 focalizada: tres corridas aprobadas, 60 pares acumulados con claves diferentes y ningún `INTERNAL_ERROR`.
- Emulator Suite completa: `80/80`.
- Sintaxis Functions: `192/192`.
- Mantenimiento/reglas: `7/7`.
- Build: `21/21`.
- Typecheck aprobado; lint sin hallazgos nuevos respecto del baseline; `git diff --check` aprobado.

El fallo concurrente de E2-02 queda clasificado definitivamente como **`PREEXISTENTE — NO ATRIBUIBLE A E2-03`**. Sus archivos funcionales y su prueba Emulator permanecen idénticos al checkpoint documental. No se corrigió ni reinterpretó E2-02 en esta rama; se recomienda tratar su convergencia transaccional en una intervención separada.

### UAT manual

Veredicto recibido: **`UAT E2-03 APROBADO`**.

| Caso | Resultado |
| --- | --- |
| UAT-01 | APROBADO |
| UAT-02 | APROBADO |
| UAT-03 | APROBADO |
| UAT-04 | APROBADO |
| UAT-05 | APROBADO |
| UAT-06 | APROBADO |
| UAT-07 | APROBADO |
| UAT-08 | APROBADO |
| UAT-09 | APROBADO |

El UAT se ejecutó exclusivamente con Firebase Emulator Suite, proyecto `demo-sportexa-e2-03`, loopback y datos sintéticos. No hubo acceso a Firebase remoto.

Durante la preparación apareció `Vapid public key should be 65 bytes long when decoded.`. La causa fue una configuración sintética temporal inválida y se resolvió únicamente en el entorno local mediante una clave VAPID efímera válida. Fue un incidente de entorno UAT resuelto, no un defecto E2-03; no modificó archivos versionados, código, reglas, índices, dependencias, lockfiles ni configuración remota. Ninguna clave VAPID forma parte del inventario versionable.

El índice compuesto E2-03 permanece versionado en `firestore.indexes.json` y no fue desplegado.

### Estado previo al versionado

- Rama: `feat/e2-03-membership-owner-self`.
- HEAD/base y `dev`: `2ae643c7c9ff8aaa18975297be8075987410ec33`.
- Merge-base exacto con `dev`; cero commits posteriores; sin upstream.
- Working tree con implementación, frontend, reglas, índice, pruebas, correcciones H01–H04-R1 e informe E2-03 todavía sin commit.
- Los `.env`, logs y artefactos de build detectados son ignorados y quedan expresamente fuera del versionado.

### Validación final de consolidación

Ejecutada después de incorporar la evidencia independiente y UAT al informe:

| Gate | Resultado |
| --- | --- |
| Unitarias Functions | `157/157`, código 0 |
| Focalizadas intención, arquitectura, guard y servicio H01–H04-R1 | `26/26`, código 0 |
| Emulator Suite completa | `80/80`, código 0 |
| Sintaxis Functions | `192/192`, código 0 |
| Mantenimiento/reglas | `7/7`, código 0 |
| Typecheck | aprobado, código 0 |
| Build | compilación aprobada y `21/21` páginas generadas, código 0 |
| Lint baseline | 39 errores y 9 warnings conocidos; 6 hallazgos resueltos; cero hallazgos nuevos |
| `git diff --check` | aprobado, código 0 |

La única falla eventual histórica de E2-02 no reapareció en esta validación. Su clasificación permanece `PREEXISTENTE — NO ATRIBUIBLE A E2-03`; no se modificaron sus archivos ni se realizaron repeticiones ciegas. Todos los emuladores usaron proyectos `demo-*`, loopback y datos sintéticos. No hubo acceso ni despliegue Firebase remoto.

## 22. Veredicto

**E2-03 IMPLEMENTADO, REVERIFICADO Y CON UAT APROBADO — LISTO PARA VERSIONAR**
