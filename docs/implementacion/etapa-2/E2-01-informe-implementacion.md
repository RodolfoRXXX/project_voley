# E2-01 — Informe de implementación de Grupo propio y ownership

## 1. Rama, HEAD inicial y checkpoint documental

- Repositorio: `C:/Users/Rodolfo/Documents/projectoVoley`.
- Rama de implementación: `feat/e2-01-grupo-ownership`.
- HEAD inicial: `5d507b83c2404562c2db727abd77c6c7cab4b971`.
- Commit de implementación: `4fba1ae7d01801d33ec7d83070da715083c84dc3` (`feat(e2-01): implementar grupo propio y ownership`).
- Upstream comprobado al iniciar: `dev` y `origin/dev` coincidían, divergencia `0/0`.
- El HEAD solicitado originalmente en la ficha de trabajo (`e1f2272f7a42e04dff8d53869142e9a8ad015294`) había sido adelantado en `dev` por `5d507b83` (`update`). Se comprobó que ese commit contiene exclusivamente `docs/implementacion/etapa-2/E2-01-ficha-grupo-ownership.md` y el usuario lo aceptó expresamente como checkpoint documental.
- No se creó un segundo commit documental para no duplicar el checkpoint aceptado. El mensaje del checkpoint difiere del sugerido, sin diferencia de contenido ni de alcance.

## 2. Estado Git inicial

- `dev` estaba limpio en `5d507b83` después de reconocer la ficha ya incluida en el checkpoint.
- La ficha fue leída íntegramente: contiene 22 secciones numeradas y el veredicto `E2-01 LISTO PARA IMPLEMENTAR`.
- La rama `feat/e2-01-grupo-ownership` fue creada desde ese HEAD.
- No había otros cambios locales que preservar o mezclar.

## 3. Baseline

Entorno registrado antes de programar:

- Node.js `20.14.0`.
- npm `10.7.0`.
- Firebase CLI `15.18.0`.
- Windows 10 Home 22H2, compilación `19045.6456`.
- Proyecto aislado `demo-sportexa-e0-02`, Emulator Suite en hosts loopback y datos sintéticos.
- Unitarias: `72/72`.
- Emulator Suite: `43/43`.
- Sintaxis: `126/126`.
- Build: `19/19`.
- Mantenimiento: `7/7`.
- Lint: deuda conocida de `39` errores y `9` warnings; `6` hallazgos históricos resueltos y `0` regresiones.
- Typecheck y `git diff --check`: correctos.

No se consultó, modificó ni desplegó Firebase remoto. La configuración de las pruebas fuerza proyecto `demo-*`, emuladores loopback y bloqueo de acceso remoto.

## 4. Archivos modificados y nuevos

### Backend nuevo

- `functions/src/groups/domain/group.js`.
- `functions/src/groups/application/{groupContract,groupDto,groupErrors,groupHashing,groupService}.js`.
- `functions/src/groups/infrastructure/{firestoreGroupCreationGuard,firestoreGroupRepository,firestoreOwnGroupsReader,firestoreSelfAccountReader,groupCallable,groupModule}.js`.
- `functions/callables/{createOwnGroup,listOwnGroups,getOwnGroup,getOwnGroupsDashboard}.js`.
- Exportación de callables en `functions/index.js`.

### Frontend nuevo

- Rutas `dashboard/groups`, `dashboard/groups/new` y `dashboard/groups/[groupId]` bajo el layout protegido.
- Componentes `GroupCard`, `GroupLoading` y `GroupPageShell`.
- Servicio `groupsService.ts` y tipos `OwnGroup.ts`.

### Adaptaciones e aislamiento

- `firestore.rules`.
- Dashboard protegido y `AppSidebar`.
- Páginas administrativas legadas de alta/listado de Grupos.
- `httpApi.js`, `adminAccessService.js`, `adminGroupService.js`, `groupAdminsService.js` y `onGroupPendingAlertsSync.js`.

### Pruebas

- Cinco archivos unitarios E2-01.
- `test/emulator/groupE2.test.js`.
- Inclusión en `test/run-emulator-tests.js`.

No se modificaron dependencias, lockfiles ni índices.

### Inventario Git exacto antes del versionado

`git status --porcelain=v1 -uall` mostró `43` archivos físicos: `12` rastreados modificados y `31` nuevos. No había staged, eliminados ni renombrados.

Los `12` rastreados modificados fueron:

- `volley-ranking-frontend/src/app/(admin)/admin/groups/new/page.tsx`;
- `volley-ranking-frontend/src/app/(admin)/admin/groups/page.tsx`;
- `volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx`;
- `volley-ranking-frontend/src/components/layout/AppSidebar.tsx`;
- `volley-ranking-system/firestore.rules`;
- `volley-ranking-system/functions/index.js`;
- `volley-ranking-system/functions/src/httpApi.js`;
- `volley-ranking-system/functions/src/services/adminAccessService.js`;
- `volley-ranking-system/functions/src/services/adminGroupService.js`;
- `volley-ranking-system/functions/src/services/groupAdminsService.js`;
- `volley-ranking-system/functions/src/triggers/onGroupPendingAlertsSync.js`;
- `volley-ranking-system/functions/test/run-emulator-tests.js`.

Los `31` nuevos fueron:

- `docs/implementacion/etapa-2/E2-01-informe-implementacion.md`;
- `volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx`;
- `volley-ranking-frontend/src/app/(protected)/dashboard/groups/new/page.tsx`;
- `volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx`;
- `volley-ranking-frontend/src/components/groups/GroupCard.tsx`;
- `volley-ranking-frontend/src/components/groups/GroupLoading.tsx`;
- `volley-ranking-frontend/src/components/groups/GroupPageShell.tsx`;
- `volley-ranking-frontend/src/services/groupsService.ts`;
- `volley-ranking-frontend/src/types/OwnGroup.ts`;
- `volley-ranking-system/functions/callables/createOwnGroup.js`;
- `volley-ranking-system/functions/callables/getOwnGroup.js`;
- `volley-ranking-system/functions/callables/getOwnGroupsDashboard.js`;
- `volley-ranking-system/functions/callables/listOwnGroups.js`;
- `volley-ranking-system/functions/src/groups/application/groupContract.js`;
- `volley-ranking-system/functions/src/groups/application/groupDto.js`;
- `volley-ranking-system/functions/src/groups/application/groupErrors.js`;
- `volley-ranking-system/functions/src/groups/application/groupHashing.js`;
- `volley-ranking-system/functions/src/groups/application/groupService.js`;
- `volley-ranking-system/functions/src/groups/domain/group.js`;
- `volley-ranking-system/functions/src/groups/infrastructure/firestoreGroupCreationGuard.js`;
- `volley-ranking-system/functions/src/groups/infrastructure/firestoreGroupRepository.js`;
- `volley-ranking-system/functions/src/groups/infrastructure/firestoreOwnGroupsReader.js`;
- `volley-ranking-system/functions/src/groups/infrastructure/firestoreSelfAccountReader.js`;
- `volley-ranking-system/functions/src/groups/infrastructure/groupCallable.js`;
- `volley-ranking-system/functions/src/groups/infrastructure/groupModule.js`;
- `volley-ranking-system/functions/test/emulator/groupE2.test.js`;
- `volley-ranking-system/functions/test/unit/groupArchitecture.test.js`;
- `volley-ranking-system/functions/test/unit/groupContract.test.js`;
- `volley-ranking-system/functions/test/unit/groupCreationGuard.test.js`;
- `volley-ranking-system/functions/test/unit/groupDomain.test.js`;
- `volley-ranking-system/functions/test/unit/groupService.test.js`.

La cifra anterior de `28 elementos modificados` no era un conteo de archivos físicos: correspondía a las `28` entradas compactas de `git status --short` sin cabecera (`12` modificados + `16` rutas nuevas), donde Git colapsó directorios nuevos completos. La revisión visual expandida y `--porcelain=v1 -uall` mostraron los `43` archivos físicos. Para el primer commit se excluye exclusivamente este informe: `42` archivos de implementación (`12` modificados + `30` nuevos).

## 5. Arquitectura implementada

- Dominio puro de Grupo, sin Firebase, con creación e hidratación estricta del schema v1.
- Servicio de Aplicación que coordina autenticación, `self-account`, política transitoria, repositorio, reader owner-scoped y DTO.
- Repositorio específico de Grupo y reader específico de Grupos propios.
- Puerto/adaptador técnico separado para `groupCreationGuards`.
- Adaptadores Firestore confinados a infraestructura.
- Callables delgados y composición explícita.
- DTO y proyección de dashboard sin tipos de persistencia.
- Presentación consumiendo exclusivamente callables, sin imports de Firestore en las rutas nuevas.

No se introdujeron repositorio/coordinador genéricos, Saga, outbox, transacción global ni Aggregate Root artificial.

## 6. Contratos finales

- Crear Grupo propio: input cerrado `{ nombre, deporte, idempotencyKey }`; salida `{ outcome: "created" | "existing", group }`.
- Listar Grupos propios: input vacío; salida `{ items: group[] }`.
- Obtener Grupo propio: input cerrado `{ groupId }`; salida `{ group }`.
- Dashboard: input vacío; salida `{ items: [{ id, nombre, deporte, estado }] }`.
- DTO de Grupo: `{ id, nombre, deporte, estado, ownerUserId, createdAt }`, con `createdAt` ISO-8601.
- Razones estables: `UNAUTHENTICATED`, `ACCOUNT_REQUIRED`, `NOT_AUTHORIZED`, `NOT_FOUND`, `VALIDATION_FAILED`, `PROVISIONAL_LIMIT_REACHED`, `CONFLICT`, `DEPENDENCY_UNAVAILABLE` e `INTERNAL_ERROR`.

El contrato rechaza propiedades desconocidas. El nombre se normaliza NFC, recorta, colapsa espacios, rechaza controles y admite 1–80 puntos de código. El único deporte v1 es `voleibol`. La clave conserva identidad exacta, admite 16–128 caracteres y sólo `[A-Za-z0-9._:-]`.

## 7. Persistencia final

- Canónico: `groups/{groupId}` con ID aleatorio, opaco y generado por backend.
- Campos exactos: `nombre`, `deporte`, `ownerId`, `estado`, `createdAt`, `schemaVersion`.
- `ownerId` procede exclusivamente del UID autenticado; `estado = "activo"`; `schemaVersion = 1`; `createdAt` usa timestamp de servidor.
- El ID no se duplica dentro del documento; no existe `updatedAt` ni campos postergados.
- Control técnico: `groupCreationGuards/{firebaseUid}` con campos exactos `groupId`, `idempotencyKeyHash`, `requestHash`, `createdAt`, `guardVersion`.
- Los hashes SHA-256 usan separación de contexto y UID; nunca se persiste la clave cruda.

Crear Grupo no escribe Usuario, Persona, Membresía, Temporada, Solicitud, Plan, Suscripción, Actividad ni proyecciones de dashboard.

## 8. Idempotencia y concurrencia

- Una transacción por UID lee primero el guard y serializa las creaciones del Usuario.
- Misma clave y mismo payload recuperan el Grupo confirmado con outcome `existing`.
- Misma clave y payload diferente producen `CONFLICT`.
- Clave diferente con Grupo confirmado produce `PROVISIONAL_LIMIT_REACHED`.
- Sin guard se comprueba adicionalmente cualquier Grupo atribuible por `ownerId`; si no existe, Grupo y guard se confirman atómicamente.
- Guard inválido, referencia inexistente o Grupo incompatible fallan cerrados y nunca se reparan silenciosamente.
- Conflictos agotados y dependencias no disponibles se traducen a razones estables.

Las pruebas demuestran respuesta perdida, solicitudes iguales y diferentes simultáneas, un único Grupo resultante y ausencia de estado parcial.

## 9. Autorización y reglas

- Crear exige token verificado, cuenta propia válida mediante `self-account` y capacidad transitoria disponible.
- Consultar exige igualdad entre UID autenticado y `Grupo.ownerId`.
- No se consulta Persona ni `users.roles`; un `admin` global no Owner no obtiene autoridad.
- Lecturas y escrituras directas cliente sobre Grupos schema v1 están denegadas.
- Lecturas y escrituras cliente sobre `groupCreationGuards` están denegadas.
- La compatibilidad de reglas legada queda limitada a documentos no schema v1; no se abrieron permisos públicos ni colecciones ajenas.

## 10. Frontend

- Listado con estado inicial, loading, error, vacío y CTA “Crear Grupo”.
- Formulario accesible de nombre y deporte, con `crypto.randomUUID()`, bloqueo de doble envío y conservación de la clave mientras el payload no cambie.
- Confirmación basada en respuesta persistida y navegación al detalle.
- Feedback diferenciado para validación, autorización, límite, conflicto y dependencia.
- Detalle organizativo responsive que explica el acceso por ownership y que Persona, Membresías y Temporada no son requisitos.
- No hay actualización optimista, onboarding deportivo ni acciones postergadas.

## 11. Tratamiento del legado

- Retirado: escritor directo administrativo de alta y función backend legada `crearGrupo`, después de verificar consumidores.
- Redirigido: `/admin/groups/new` y `/admin/groups` hacia el flujo protegido owner-scoped.
- Adaptado/reutilizado: layout, navegación, estilos visuales y dashboard.
- Aislado: administración, HTTP API, helpers de admins y trigger de alertas rechazan o ignoran documentos schema v1.
- Preservado tras revisión independiente: las consultas cliente legadas por `memberIds`/`adminIds` continúan autorizadas únicamente para documentos que contienen esos arrays; schema v1 exacto no los contiene y no puede aparecer en esos resultados. Se añadió una regresión Emulator específica.
- Fuera de alcance y sin migración global: detalle admin, perfiles, vistas públicas, edición, transferencia, solicitudes, integrantes y arrays embebidos.

## 12. Pruebas ejecutadas

Resultado final:

- Unitarias específicas E2-01: `23/23`.
- Suite unitaria completa: `95/95`.
- Emulator Suite completa: `55/55`; incluye `11/11` escenarios E2-01 después de agregar la regresión de listado legado aislado.
- Sintaxis final: `148/148` archivos JavaScript.
- Typecheck: correcto.
- Lint: sin regresiones frente a baseline (`39` errores y `9` warnings conocidos; `6` resueltos).
- Build: `21/21` páginas generadas; incluye las tres rutas protegidas E2-01.
- Mantenimiento: `7/7`.
- Gate `quality:stage0`: correcto de extremo a extremo.
- `git diff --check`: código `0`, sin hallazgos de whitespace. El comando emitió avisos informativos de futura conversión LF→CRLF en 12 archivos rastreados; no son hallazgos de `--check`.

Cobertura E2-01: dominio, contrato cerrado, DTO, autenticación/cuenta, ausencia de Persona, rol global ignorado, coordinación y fallos cerrados; creación/consulta/listado/dashboard; atomicidad, reintento, concurrencia y guard roto; reglas; aislamiento legado; arquitectura y ausencia de efectos colaterales. Los AC-01 a AC-20 quedan trazados por estas suites.

## 13. Diferencias respecto de la ficha

- Sin diferencias funcionales conocidas.
- Diferencia procedimental aceptada: el checkpoint documental preexistía como commit `5d507b83` con mensaje `update`; el usuario autorizó expresamente utilizarlo en lugar de crear otro commit.
- No fue necesario agregar un índice Firestore para el corte de un Grupo provisional.
- La revisión independiente precommit ajustó de forma mínima `allow list` para no bloquear consultas legadas por arrays. El cambio no amplía acceso a schema v1 y quedó cubierto por Emulator Suite. Se realizó después de UAT; durante UAT no se modificó código.

## 14. Riesgos y deuda residual

- El máximo de un Grupo por Usuario es deliberadamente transitorio y debe sustituirse antes de habilitar un segundo Grupo o implementar Comercial.
- Los flujos legados permanecen fuera de alcance y sólo están aislados frente a schema v1; una migración futura deberá inventariarlos nuevamente.
- La deuda lint histórica se mantiene en el nivel de baseline y no fue ampliada.
- UAT fue aprobada con una observación no bloqueante: UAT-18 no se ejecutó manualmente.
- Durante los gates precommit se detectó otra instancia local del mismo proyecto demo; los runners mantuvieron sus puertos aislados y todas las suites aprobaron. No hubo tráfico Firebase remoto.

## 15. Rollback

Tras el versionado, el rollback debe revertir por separado el commit documental y el commit de implementación, preservando el checkpoint documental `5d507b83` y cualquier trabajo posterior ajeno. No se requiere rollback de datos remotos porque no hubo despliegue ni acceso remoto.

## 16. Estado de Firebase remoto

- No consultado.
- No modificado.
- No desplegado.
- Todas las pruebas Firebase utilizaron Emulator Suite, proyecto `demo-*`, loopback y datos sintéticos.

## 17. UAT

UAT manual realizada en navegador con Emulator Suite, proyecto `demo-sportexa-e0-02`, hosts loopback, frontend local y datos sintéticos. No se usó Firebase remoto, no se modificó código y no se ejecutaron acciones de limpieza, importación o deploy.

| ID | Resultado | Evidencia observada | Observaciones |
| --- | --- | --- | --- |
| UAT-01 | APROBADA | Sesión válida de Usuario A, cuenta inicializada y dashboard accesible sin Persona ni rol global. | Sin errores inesperados confirmados. |
| UAT-02 | APROBADA | `/dashboard/groups` accesible desde el dashboard/sidebar; estado vacío claro y acción “Crear Grupo” visible. | Sin loading permanente, `permission-denied` ni Grupos ajenos. |
| UAT-03 | APROBADA | Usuario A sin `personaId`; la creación no solicitó Persona, posición, dorsal, cargo ni rol. | No se creó Persona automáticamente. |
| UAT-04 | APROBADA | Formulario mínimo con nombre y selector con única opción Vóley; nombre vacío rechazado. | No se observaron campos adicionales ni escritura inválida. |
| UAT-05 | APROBADA | Se creó un único Grupo, con nombre normalizado y persistido, deporte Vóley y navegación al detalle. | `groupId`: `QwDe7yL31LkaNIhjYizA`. |
| UAT-06 | APROBADA | Detalle con nombre, deporte, estado `activo` y estado deportivo vacío. | Sin Owner visible, operaciones ni acciones postergadas; sólo cajas informativas. |
| UAT-07 | APROBADA | `groups/QwDe7yL31LkaNIhjYizA` contiene exactamente los campos del schema v1. | No aparecen `memberIds`, `adminIds` ni `admins`, ni otros campos prohibidos. |
| UAT-08 | APROBADA | `groupCreationGuards/{uidUsuarioA}` contiene exactamente los campos esperados; `groupId` coincide y hashes no vacíos. | No se observó clave cruda, roles, permisos ni copia del Grupo. El guard no fue alterado. |
| UAT-09 | APROBADA | No se creó Persona ni se modificó `users`; tampoco aparecieron relaciones o agregados colaterales. | Sin Membresía, Temporada, Solicitud, Plan, Suscripción, Actividad o dashboard persistido. |
| UAT-10 | APROBADA | “Mis Grupos” muestra exactamente el Grupo creado y permite abrir su detalle. | Red y contrato backend local observados; sin lecturas directas de Firestore desde frontend. |
| UAT-11 | APROBADA | Tras recarga y nueva sesión, el mismo Grupo e ID se recuperaron correctamente. | No se creó duplicado ni quedó estado optimista residual. |
| UAT-12 | APROBADA | Un nuevo intento de creación no generó un segundo Grupo. | Se conservó exactamente un Grupo; no se manipuló el guard. |
| UAT-13 | APROBADA | Usuario B recibió estado no autorizado al abrir el detalle de A y no vio información; su listado permaneció vacío. | Sin modificaciones de documentos. |
| UAT-14 | APROBADA | Tras agregar temporalmente `roles: "admin"` a B en Firestore Emulator, B continuó sin acceso al Grupo de A. | El rol global no concedió ownership ni acciones. Dato sintético de UAT. |
| UAT-15 | APROBADA | `/admin/groups` y `/admin/groups/new` condujeron al flujo owner-scoped esperado. | No apareció formulario legado ni creación con arrays embebidos. |
| UAT-16 | APROBADA | El Grupo canónico no apareció en superficies públicas ni de perfil basadas en Membresía. | No se expusieron miembros, Owner ni datos internos; no se rompieron otras páginas. |
| UAT-17 | APROBADA | El doble envío produjo una sola intención, un solo Grupo y una sola navegación. | El botón quedó bloqueado durante el envío. |
| UAT-18 | NO EJECUTADA MANUALMENTE | No se simuló fallo de Functions ni reintento desde navegador. | Observación no bloqueante. Sus aspectos críticos —fallo antes/después del commit, respuesta perdida e idempotencia— están cubiertos automáticamente; no se afirma aprobación manual. |
| UAT-19 | APROBADA | Estado vacío/listado, formulario, detalle y mensaje de límite se observaron en escritorio, notebook y móvil de 375–390 px. | Sin scroll horizontal, recortes ni problemas funcionales de interacción. |
| UAT-20 | APROBADA | Navegación por teclado, labels, foco, validación, carga y resultado fueron observados durante el flujo. | Operación comprensible sin depender exclusivamente del color. |
| UAT-21 | APROBADA | Consola y red sólo mostraron servicios locales y contratos backend previstos. | Sin Firebase remoto, escrituras directas de frontend, `permission-denied`, solicitudes duplicadas ni errores inesperados. |

Resultado UAT: `UAT E2-01 APROBADA CON OBSERVACIONES NO BLOQUEANTES`, con 20 pruebas aprobadas, ningún defecto y UAT-18 `NO EJECUTADA MANUALMENTE`.

## 18. Verificación final y veredicto técnico

Se ejecutaron correctamente las pruebas específicas, la suite unitaria completa, Emulator Suite, el gate `quality:stage0`, build, sintaxis, mantenimiento y el control Git normativo. La revisión independiente leyó completamente ficha, informe, los 12 diffs rastreados y los 31 archivos nuevos.

Evidencia de whitespace precommit:

- `git diff --check`: código `0`, sin hallazgos de whitespace. No se utilizó `git diff --no-index` como sustituto.
- `git diff --cached --check` sobre los 42 archivos del commit de implementación: código `0`, salida vacía.

La revisión confirmó schema v1 exacto, Owner único, guard separado y atomicidad; idempotencia y límite; autorización sólo por token/cuenta/ownership; frontend protegido sin Firestore directo; y aislamiento de las superficies legadas. El único ajuste derivado de la revisión fue preservar listas legadas por arrays sin conceder acceso a schema v1, con prueba automática nueva.

El commit de implementación quedó registrado como `4fba1ae7d01801d33ec7d83070da715083c84dc3`. Este informe se versiona en un commit documental separado; su SHA y el resultado del push se registran en la entrega operativa para evitar una autorreferencia imposible del documento.

No hubo merge, tag, pull request, consulta Firebase remota ni despliegue. No se creó `E2-01-cierre.md` ni se modificó Documento 5.

**E2-01 IMPLEMENTADO, VERIFICADO Y CON UAT APROBADA CON OBSERVACIONES NO BLOQUEANTES — NO CERRADO FORMALMENTE**
