# E2-02 — Cierre formal

## 1. Identificación

- **Incremento:** `E2-02 — Alta y apertura mínima de Temporada como Agregado independiente`.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Fecha de cierre:** 2026-08-27.
- **Rama de implementación:** `feat/e2-02-temporada-apertura`.
- **Rama de cierre:** `docs/e2-02-cierre`.
- **Ficha normativa:** `docs/implementacion/etapa-2/E2-02-ficha-temporada-apertura.md`.
- **Informe de implementación y UAT:** `docs/implementacion/etapa-2/E2-02-informe-implementacion.md`.
- **Estado final:** implementación versionada, integrada y publicada; gates post-merge aprobados; UAT aprobada con observaciones.

Este documento cierra exclusivamente E2-02. No cierra la Etapa 2, no implementa E2-03 y no autoriza despliegues Firebase.

## 2. Estado final

E2-02 está implementado, verificado, publicado en `dev` y formalmente cerrado. La observación de trazabilidad UAT-09 y el `404 /season/new` no constituyen defectos funcionales. E2-03 queda habilitado únicamente para crear y revisar su propia ficha.

## 3. Ficha normativa

La implementación responde a `E2-02-ficha-temporada-apertura.md`, commit documental `8faae80887e06db27daa5d56283ae32bd1e24775`, integrado en `dev` mediante `d60c34ca7a60063963749bc5fac7ea8a0a89a2b7`.

Se preservaron las decisiones de Documento 5: Temporada es un Agregado independiente dentro del Módulo Grupos, ciclo temporal de un Grupo y fuente de verdad propia. No se inventaron Temporadas a partir del legado.

## 4. Objetivo cumplido

Un Owner autenticado y con cuenta válida puede consultar el contexto temporal de su Grupo, observar el vacío válido, crear una Temporada mínima directamente abierta y recuperar la Temporada confirmada. La solución garantiza como máximo una abierta por Grupo y retries sin duplicación.

## 5. Alcance entregado

- creación y apertura mediante un único comando;
- consulta owner-scoped del contexto abierto;
- consulta owner-scoped por ID;
- Aggregate Root Temporada puro;
- Servicio de Aplicación y puertos específicos;
- repositorio, reader y guard transaccional;
- persistencia y mappers estrictos;
- callables, DTO y errores estables;
- reglas backend-only;
- frontend integrado en la vista del Grupo;
- pruebas de dominio, contratos, aplicación, persistencia, reglas, frontend y arquitectura;
- contrato contextual disponible para el futuro E2-03.

## 6. Exclusiones preservadas

No se implementaron cierre, reapertura, borrador, historial, listado, fecha final, edición, Membresía, Solicitud, Persona, administradores delegados, operaciones deportivas, Comercial, Club, migración, backfill ni doble escritura. No se modificó Documento 5 ni el legado.

## 7. Arquitectura resultante

La solución separa Dominio, Aplicación, Infraestructura y Presentación. Temporada es un Agregado independiente de Grupo y Membresía. Grupo sólo se referencia y valida; no contiene Temporada ni referencia activa. El repositorio de Temporadas no recupera Grupo como parte del Agregado y el Servicio de Aplicación no importa Firebase.

El guard abierto es coordinación técnica separada, no Agregado, proyección ni fuente de verdad. E2-03 deberá consumir `getOpenSeasonContext`, no repositorio, guard ni Firestore.

## 8. Esquema persistente

`seasons/{seasonId}` contiene exactamente:

- `groupId`;
- `nombre`;
- `fechaInicio`;
- `estado: "abierta"`;
- `createdAt`;
- `schemaVersion: 1`.

`openSeasonGuards/{groupId}` contiene exactamente `seasonId`, `idempotencyKeyHash`, `requestHash`, `createdAt` y `guardVersion: 1`.

El ID es opaco y generado por backend. La fecha de inicio permanece como fecha civil ISO. No se persisten clave cruda, Owner, fecha de cierre, `updatedAt`, arrays ni datos ajenos.

## 9. Contratos públicos

- `createAndOpenSeason({ groupId, nombre, fechaInicio, idempotencyKey })`.
- `getOpenSeasonContext({ groupId })`.
- `getOwnSeason({ groupId, seasonId })`.

El DTO público contiene sólo `id`, `groupId`, `nombre`, `estado`, `fechaInicio` y `createdAt`. No expone schema, guard, hashes, documentos, stacks ni detalles transaccionales.

## 10. Autorización por ownership

El UID proviene exclusivamente del token verificado. Cada operación exige cuenta mediante `self-account`, Grupo v1 compatible y activo, y coincidencia con el ownership vigente. Grupo y ownership se releen transaccionalmente durante la creación.

`users.roles` se ignora: un global admin no Owner no tiene autoridad. La ausencia de Persona o Membresía no bloquea ni genera altas colaterales.

## 11. Idempotencia y concurrencia

Temporada y guard se confirman atómicamente. El mismo retry y payload recuperan la misma Temporada; la misma clave con payload distinto falla establemente; otra intención frente a una abierta informa existencia funcional. Solicitudes simultáneas iguales convergen y solicitudes diferentes dejan como máximo una abierta.

Una respuesta perdida es recuperable, los fallos previos no dejan documentos parciales y los conflictos agotados o dependencias caídas no afirman éxito. Un guard ausente o inconsistente falla cerrado sin reparación automática.

## 12. Reglas Firestore

Toda lectura y escritura cliente sobre `seasons` y `openSeasonGuards` está explícitamente denegada para visitante, autenticado, Owner y global admin. El backend es el único escritor mediante Admin SDK y callables autorizados.

## 13. Frontend

La vista owner-scoped del Grupo muestra carga, error recuperable, vacío válido y Temporada abierta. Incluye acción “Crear y abrir temporada”, formulario mínimo, validación, clave estable por intención normalizada, bloqueo de doble envío y confirmación desde persistencia.

La interfaz explica que abrir la Temporada establece el ciclo temporal, no incorpora integrantes y no habilita operaciones deportivas. Incluye labels, teclado, foco, regiones vivas, controles táctiles y presentación responsive.

## 14. Pruebas agregadas

La cobertura incluye invariantes y reconstrucción de dominio; payload y DTO cerrados; autenticación, cuenta y ownership; global admin ignorado; ausencia de Persona/Membresía; atomicidad, concurrencia, retry y respuesta perdida; guard inconsistente; reglas negativas; frontend y accesibilidad por guardas; límites arquitectónicos y ausencia de efectos colaterales.

## 15. Resultados automatizados previos

Antes del versionado aprobaron:

| Gate | Resultado |
|---|---|
| Sintaxis Functions | 168/168 |
| Unitarias y arquitectura | 120/120 |
| Emulator Suite | 66/66 |
| Reglas/mantenimiento | 7/7 |
| TypeScript | Correcto |
| Build | 21/21 |
| Lint baseline | Sin regresiones |
| `quality:stage0` | Correcto |
| `git diff --check` | Correcto |

## 16. UAT completa

Resultado: `UAT E2-02 APROBADA CON OBSERVACIONES`.

| Caso | Resultado | Evidencia |
|---|---|---|
| UAT-01 | APROBADO | Owner accede al contexto del Grupo. |
| UAT-02 | APROBADO | Vacío sin Temporada es válido. |
| UAT-03 | APROBADO | Formulario mínimo owner-scoped. |
| UAT-04 | APROBADO | Validaciones de nombre y fecha. |
| UAT-05 | APROBADO | Creación directa abierta confirmada. |
| UAT-06 | APROBADO | Nombre, fecha y estado visibles. |
| UAT-07 | APROBADO | Consulta/recarga recupera persistencia. |
| UAT-08 | APROBADO | Doble envío/retry sin duplicado. |
| UAT-09 | BLOQUEADO EN UAT MANUAL — CUBIERTO POR PRUEBA AUTOMATIZADA | Global admin no Owner rechazado. |
| UAT-10 | APROBADO | Sin Persona/Membresía no bloquea. |
| UAT-11 | APROBADO | Correlación Grupo–Temporada–guard correcta. |
| UAT-12 | APROBADO | Navegación, accesibilidad y responsive. |

## 17. Repetición focalizada

El fixture inicial fue descartado durante un reinicio manual de datos locales. La repetición focalizada se ejecutó establemente sobre un único Grupo en `demo-sportexa-e2-02`, hosts loopback y datos sintéticos.

Se verificaron exactamente un Grupo, una Temporada abierta y un guard correlacionado; cero Personas, Membresías, Solicitudes, Planes, Suscripciones, actividad y dashboards; Grupo sin Temporada embebida y cero escrituras del no Owner. Esta observación de trazabilidad no es un defecto funcional.

## 18. Tratamiento de UAT-09

UAT-09 no fue aprobada manualmente y no se declara como tal. Su cobertura automática está identificada en `seasonE2.test.js`, caso `Owner y admin no Owner concurrentes: sólo el Owner confirma`.

La prueba exige una única confirmación del Owner y `NOT_AUTHORIZED` para un global admin sin ownership. Aprobó dentro de Emulator Suite 66/66 y fue aceptada como cobertura técnica de la observación.

## 19. Observación `404 /season/new`

La búsqueda estática y revisión preversionado no encontraron enlace, redirect, router, formulario, prueba ni navegación productiva hacia la ruta singular. La única ruta implementada y confirmada por build es `/dashboard/groups/[groupId]/seasons/new`.

El `404 /season/new` fue una navegación manual o solicitud externa aislada, sin impacto funcional.

## 20. Gate posterior al merge

El merge de implementación se validó en `dev` antes de publicarlo:

| Gate | Resultado post-merge |
|---|---|
| Lint baseline | Correcto: 39 errores y 9 warnings históricos; 6 hallazgos resueltos |
| TypeScript | Correcto |
| Sintaxis Functions | 168/168 |
| Unitarias y arquitectura | 120/120 |
| Emulator Suite | 66/66 |
| Reglas/mantenimiento | 7/7 |
| Build frontend | 21/21 |
| `quality:stage0` | Correcto |
| `git diff --check` | Correcto |

Los emuladores usaron `demo-sportexa-e0-02`, Auth, Firestore y Functions en loopback y datos sintéticos. No hubo Firebase remoto.

## 21. Commit de implementación

- SHA: `a43139fb862b25b46fe443819447366a78b0b271`.
- Mensaje: `feat(e2-02): implementar apertura mínima de temporada`.
- Contenido: 31 archivos; implementación, pruebas, reglas e informe como unidad auditable.

## 22. Merge de implementación en `dev`

- SHA: `54674d8e29ab46fb91589c3f5724aed1acd69897`.
- Mensaje: `merge: integrar E2-02 apertura mínima de temporada`.
- Padres: `d60c34ca7a60063963749bc5fac7ea8a0a89a2b7` y `a43139fb862b25b46fe443819447366a78b0b271`.
- Estrategia: merge no fast-forward, sin squash, rebase ni conflictos.

## 23. Estado de publicación

El merge de implementación fue publicado en `origin/dev`. `dev` local y remoto quedaron exactamente en `54674d8e29ab46fb91589c3f5724aed1acd69897`, divergencia `0/0`, antes de crear esta rama documental.

## 24. Firebase y despliegues

No hubo consulta, escritura ni despliegue sobre Firebase remoto. Todas las verificaciones Firebase utilizaron Emulator Suite, proyectos `demo-*`, hosts loopback y datos sintéticos. No se desplegó frontend, Functions, reglas ni índices.

## 25. Deuda y exclusiones futuras

- UAT-09 mantiene la observación de no ejecución manual.
- Persisten warnings históricos de lint, dependencias, Browserslist, Firebase Functions SDK, Pub/Sub y perfil PowerShell.
- Cierre, reapertura e historial de Temporada requieren incrementos futuros.
- Membresía y Solicitud siguen sin implementarse.
- El legado permanece aislado y no migrado.
- E2-03 deberá preservar ownership, separación de Agregados y consumo del contrato contextual.

Estas observaciones no son defectos bloqueantes de E2-02 y no se declaran resueltas.

## 26. Habilitación del siguiente incremento

E2-02 deja disponible una Temporada abierta autoritativa y el contrato `getOpenSeasonContext` requerido para evaluar Membresía.

Queda habilitada únicamente la **definición** de E2-03 mediante una Ficha de Incremento Implementable propia, completa y aprobada. E2-03 no está implementado ni se declara listo para implementar.

## 27. Veredicto formal

La implementación está versionada, integrada y publicada; los gates post-merge aprobaron; la UAT fue aceptada con observaciones registradas honestamente; no existen defectos funcionales conocidos dentro del alcance aprobado.

`E2-02 CERRADO — E2-03 HABILITADO PARA DEFINICIÓN`
