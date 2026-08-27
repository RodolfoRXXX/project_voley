# E2-02 — Informe de implementación y UAT

## 1. Identificación

- Incremento: `E2-02 — Alta y apertura mínima de Temporada como Agregado independiente`.
- Etapa: 2.
- Revisión final: 2026-08-27.
- UAT: `UAT E2-02 APROBADA CON OBSERVACIONES`.

## 2. Ficha normativa

La fuente inmediata es `docs/implementacion/etapa-2/E2-02-ficha-temporada-apertura.md`, commit documental `8faae80887e06db27daa5d56283ae32bd1e24775`, integrado en `dev` mediante `d60c34ca7a60063963749bc5fac7ea8a0a89a2b7`. También se revisaron las convenciones de E2-01 y las fronteras arquitectónicas vigentes.

## 3. Rama y HEAD base

- Rama: `feat/e2-02-temporada-apertura`.
- HEAD base y actual: `d60c34ca7a60063963749bc5fac7ea8a0a89a2b7`.
- Upstream: `origin/feat/e2-02-temporada-apertura`.
- Divergencia inicial: `0/0`.
- Implementación e informe todavía sin commit.

## 4. Objetivo y alcance implementado

Se implementó la consulta owner-scoped del contexto temporal de un Grupo, el vacío válido sin Temporada, la creación directa de una Temporada abierta, su consulta por contexto e ID, el máximo de una abierta por Grupo y los retries sin duplicación. El corte incluye dominio, aplicación, persistencia, contratos, reglas, frontend y pruebas. No incluye cierre, reapertura, historial, Membresía, Persona, operaciones deportivas, Comercial ni migraciones.

## 5. Arquitectura por capas

- **Dominio:** Aggregate Root Temporada puro y sin Firebase, con invariantes y reconstrucción estricta.
- **Aplicación:** contrato cerrado, DTO explícito, errores estables, hashing contextual y Servicio de Aplicación coordinador, sin Admin SDK.
- **Infraestructura:** repositorio exclusivo de Temporadas, reader owner-scoped, guard transaccional separado, adaptador callable y composición.
- **Presentación:** tres callables y frontend que sólo consume contratos backend, sin Firestore directo.

Grupo y Temporada permanecen como Agregados independientes; no existe repositorio compartido ni Temporada embebida en Grupo.

## 6. Archivos creados y modificados

### Nuevos

- Dominio/aplicación: `season.js`, `seasonContract.js`, `seasonDto.js`, `seasonErrors.js`, `seasonHashing.js`, `seasonService.js`.
- Infraestructura: `firestoreSeasonRepository.js`, `firestoreOpenSeasonGuard.js`, `firestoreOpenSeasonReader.js`, `seasonCallable.js`, `seasonModule.js`.
- Callables: `createAndOpenSeason.js`, `getOpenSeasonContext.js`, `getOwnSeason.js`.
- Frontend: `OwnSeason.ts`, `seasonsService.ts`, `OpenSeasonSection.tsx`, `OpenSeasonForm.tsx` y `dashboard/groups/[groupId]/seasons/new/page.tsx`.
- Pruebas: `seasonDomain.test.js`, `seasonContract.test.js`, `seasonService.test.js`, `seasonGuard.test.js`, `seasonArchitecture.test.js` y `seasonE2.test.js`.

### Modificados

- `volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx`.
- `volley-ranking-system/firestore.rules`.
- `volley-ranking-system/functions/index.js`.
- `volley-ranking-system/functions/test/run-emulator-tests.js`.
- `volley-ranking-system/functions/test/unit/groupArchitecture.test.js`.

Este informe es el único documento nuevo. No se modificaron la ficha, Documentos 1–5, documentos anteriores, índices, dependencias ni lockfiles.

## 7. Modelo de Temporada

Temporada v1 utiliza un ID documental opaco generado por backend y los campos `groupId`, `nombre`, `fechaInicio`, `estado: "abierta"`, `createdAt` y `schemaVersion: 1`. El nombre aplica NFC, trim, colapso de espacios, 1–80 puntos de código y rechazo de controles. `fechaInicio` es una fecha civil real `YYYY-MM-DD`, sin timestamp ni comparación con hoy.

No existen borrador, fecha de cierre, `updatedAt`, `ownerUid`, arrays, integrantes, administradores, estadísticas ni configuración adicional.

## 8. Persistencia y guard técnico

`seasons/{seasonId}` persiste exactamente los seis campos canónicos. `openSeasonGuards/{groupId}` persiste exactamente `seasonId`, `idempotencyKeyHash`, `requestHash`, `createdAt` y `guardVersion: 1`.

El guard es un control técnico no expuesto, no reemplaza la validación de Temporada y nunca contiene la clave cruda. Guard faltante o inconsistente falla cerrado sin autorreparación. El flujo no modifica `groups/{groupId}` y no requirió índice compuesto.

## 9. Contratos públicos

- `createAndOpenSeason({ groupId, nombre, fechaInicio, idempotencyKey })` devuelve `{ outcome, season }`.
- `getOpenSeasonContext({ groupId })` devuelve `{ openSeason: SeasonDto | null }`.
- `getOwnSeason({ groupId, seasonId })` devuelve `{ season: SeasonDto }`.

`SeasonDto` expone sólo `id`, `groupId`, `nombre`, `estado`, `fechaInicio` y `createdAt`. No expone schema, guard, hashes, snapshots, claves, stacks ni detalles transaccionales.

## 10. Autorización contextual

Cada operación obtiene UID sólo del token, exige cuenta mediante `self-account`, carga Grupo v1 activo y compara con el ownership vigente. Grupo y ownership se releen dentro de la transacción de creación. `users.roles` no concede autoridad: un global admin no Owner recibe `NOT_AUTHORIZED`. Persona y Membresía no participan ni se crean.

## 11. Idempotencia y concurrencia

La transacción lee Grupo, ownership, guard y Temporada correlacionada o consulta de integridad. Primera intención crea Temporada y guard atómicamente; el mismo retry devuelve `EXISTING_IDEMPOTENT`; clave reutilizada con otro payload produce `IDEMPOTENCY_CONFLICT`; otra intención frente a una abierta produce `OPEN_SEASON_ALREADY_EXISTS`.

Solicitudes simultáneas iguales convergen, solicitudes diferentes dejan como máximo una abierta, conflictos agotados producen `CONFLICT` y dependencias caídas `DEPENDENCY_UNAVAILABLE`. Una respuesta perdida es recuperable con la misma clave. Los hashes SHA-256 incluyen versión y Grupo; la clave cruda no se persiste ni registra.

## 12. Reglas Firestore

Se deniega explícitamente toda lectura y escritura cliente sobre `/seasons/{seasonId}` y `/openSeasonGuards/{groupId}`. La denegación cubre visitante, autenticado, Owner y global admin. El backend opera mediante Admin SDK y autorización callable.

## 13. Frontend

La vista del Grupo carga el contexto y representa loading, error recuperable, vacío válido y Temporada abierta. El formulario mínimo pide nombre y fecha, usa una clave segura no editable, conserva intención y clave ante errores recuperables, bloquea doble envío y sólo renueva la clave cuando cambia el payload funcional normalizado.

El éxito se confirma consultando la Temporada persistida por ID. La interfaz explica que abrir el ciclo no incorpora integrantes ni habilita operaciones deportivas y distingue ownership de pertenencia. Incluye labels, teclado, foco, regiones vivas, objetivos táctiles y layout responsive.

## 14. Pruebas agregadas

Se cubrieron dominio, fechas, normalización, reconstrucción cerrada, contratos y DTO; autenticación, cuenta, ownership, global admin ignorado, ausencia de Persona/Membresía, errores sanitizados; atomicidad, concurrencia, retry, respuesta perdida, guard inconsistente, Grupo inalterado y cero efectos colaterales; reglas negativas; arquitectura, frontend y contrato contextual para E2-03.

## 15. Resultados completos de gates

| Gate | Resultado |
| --- | --- |
| Lint baseline | Correcto: 39 errores y 9 warnings históricos; 6 hallazgos resueltos |
| TypeScript | Correcto |
| Sintaxis Functions | `168/168` |
| Unitarias | `120/120` |
| Arquitectura | Incluida y aprobada dentro de las 120 unitarias |
| Emulator Suite | `66/66` |
| Reglas/mantenimiento | `7/7` |
| Build Next.js | Correcto; `21/21` páginas y ruta plural presente |
| `git diff --check` | Código 0, limpio |
| `quality:stage0` | Correcto de extremo a extremo |

Los gates Firebase usaron `demo-sportexa-e0-02`, hosts loopback y datos sintéticos. No se accedió a Firebase remoto.

## 16. Ejecución y entorno UAT

Resultado recibido: `UAT E2-02 APROBADA CON OBSERVACIONES`. La repetición focalizada se realizó sobre Emulator Suite, proyecto `demo-sportexa-e2-02`, loopback, un único Grupo y datos sintéticos descartables. El fixture inicial fue descartado durante un reinicio manual de los datos locales y no fue usado como autoridad posterior.

## 17. Tabla consolidada UAT-01 a UAT-12

| Caso | Resultado | Evidencia consolidada |
| --- | --- | --- |
| UAT-01 | APROBADO | Owner accede al contexto owner-scoped. |
| UAT-02 | APROBADO | Vacío sin Temporada presentado como válido. |
| UAT-03 | APROBADO | Formulario mínimo disponible tras autorización. |
| UAT-04 | APROBADO | Validaciones rechazan entrada inválida. |
| UAT-05 | APROBADO | Creación confirma una Temporada abierta. |
| UAT-06 | APROBADO | Vista muestra nombre, fecha y estado. |
| UAT-07 | APROBADO | Consulta/recarga recupera la persistida. |
| UAT-08 | APROBADO | Doble envío/retry no duplica. |
| UAT-09 | BLOQUEADO EN UAT MANUAL — CUBIERTO POR PRUEBA AUTOMATIZADA | Global admin no Owner recibe `NOT_AUTHORIZED`; sólo Owner confirma. |
| UAT-10 | APROBADO | Sin Persona/Membresía no bloquea ni crea datos. |
| UAT-11 | APROBADO | Correlación Grupo–Temporada–guard correcta. |
| UAT-12 | APROBADO | Navegación, accesibilidad y responsive funcionales. |

No se afirma ejecución manual de UAT-09.

## 18. Evidencia final focalizada

Datos sintéticos descartables:

- Proyecto: `demo-sportexa-e2-02`.
- Grupo: `4EC7fe1Wgh1JS2EgBn7q`.
- Owner/Usuario A: `mLC6SEjyBHNdiWVvXbFlw9gAO0Yp`.
- Usuario B no Owner: `SfcehfJ8ftB7W96nNJaEL1IEQZqh`.
- Temporada: `DuTfDOpPl9vu2MajEP3B`.
- Estado: `abierta`.
- Guard: `openSeasonGuards/4EC7fe1Wgh1JS2EgBn7q`.

La correlación fue correcta: exactamente un Grupo, una Temporada y un guard; Grupo sin Temporada embebida y cero escrituras de Usuario B.

## 19. Tratamiento de UAT-09

`seasonE2.test.js`, caso `Owner y admin no Owner concurrentes: sólo el Owner confirma`, ejecuta concurrentemente al Owner y a un global admin sin ownership. Comprueba una única confirmación y exige `NOT_AUTHORIZED` al no Owner. Aprobó dentro de Emulator Suite `66/66`. La observación manual permanece explícita y no se presenta como UAT ejecutada.

## 20. Ausencia de efectos colaterales

Evidencia y pruebas confirman cero Personas, Membresías, Solicitudes, Planes, Suscripciones, actividad y dashboards; Grupo inalterado y sin Temporada embebida; cero escrituras del Usuario B; backend como único escritor.

## 21. Legado preservado

Arrays legacy de Grupo, `matches`, `participations`, Torneos, inscripciones, rutas y callables ajenos permanecen sin migración, inferencia, backfill, eliminación ni doble escritura. No se incorporó `seasonId` a operaciones deportivas.

## 22. Observaciones y warnings no bloqueantes

- Fixture inicial descartado durante reinicio local; repetición focal estable sobre un único Grupo.
- UAT-09 no ejecutada manualmente y cubierta automáticamente.
- Warnings históricos de dependencias, Browserslist, Firebase Functions SDK, Pub/Sub no emulado y perfil PowerShell, sin relación con E2-02.
- Avisos LF→CRLF informativos; `git diff --check` limpio.
- Sin actualización de dependencias o lockfiles.

## 23. Tratamiento del `404 /season/new`

La búsqueda estática y la revisión completa no encontraron enlace, redirect, `router.push`, `router.replace`, formulario, prueba ni navegación productiva hacia `/season/new` o variante singular equivalente.

La única navegación E2-02 construida por el producto es `/dashboard/groups/${groupId}/seasons/new`, y el build confirma `/dashboard/groups/[groupId]/seasons/new`. El 404 se clasifica como navegación manual o solicitud externa aislada, sin impacto funcional.

## 24. Limitaciones deliberadas

Quedan fuera cierre, reapertura, historial/listado, fecha final, Membresía, Solicitud, Persona, operaciones deportivas, Comercial, migración del legado y acceso cliente directo. E2-03 deberá consumir `getOpenSeasonContext`, no repositorio, guard ni Firestore.

## 25. Estado Git

Rama y HEAD permanecen sin cambios y sin commit. El árbol contiene exclusivamente implementación, pruebas y reglas E2-02, el ajuste mínimo de aislamiento de la guarda arquitectónica E2-01 y este informe.

`firestore-debug.log` raíz fue inspeccionado como artefacto sin seguimiento generado sólo por el emulador local, sin datos de usuario, y no permanece en el estado final. El log histórico ignorado bajo `volley-ranking-system` no fue modificado.

No se modificaron ficha, Documentos 1–5, documentos anteriores, `firestore.indexes.json`, dependencias ni lockfiles.

## 26. Veredicto

La revisión final no encontró defectos bloqueantes ni ampliaciones de alcance. Arquitectura, autorización, persistencia, idempotencia, reglas, frontend y legado cumplen la ficha; gates y UAT están aprobados con las observaciones registradas.

**E2-02 IMPLEMENTADO Y UAT APROBADA CON OBSERVACIONES — LISTO PARA VERSIONAR**
