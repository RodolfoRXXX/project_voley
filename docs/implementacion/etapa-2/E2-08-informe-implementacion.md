# E2-08 — Informe de implementación

## Veredicto

**E2-08 IMPLEMENTADO, VERIFICADO Y APROBADO EN UAT — LISTO PARA VERSIONAR**

## Checkpoint y método

- Rama verificada: `feat/e2-08-retire-legacy-join-requests`.
- HEAD, upstream y merge-base iniciales: `63e791472d3363c38abbee446ec58edd9cca70b3`.
- Divergencia inicial: `0/0`; índice y working tree inicialmente limpios.
- No se detectaron procesos residuales relevantes antes de comenzar.
- Se ejecutó una única baseline canónica completa antes de editar: `quality:stage0` verde, con lint baseline controlado, typecheck, sintaxis, `231/231` unitarias, `124/124` pruebas Emulator, build `21/21` y `git diff --check`.
- Durante la implementación sólo se ejecutaron validaciones focales E2-08. La suite completa volvió a ejecutarse una única vez como gate final.

## Inventario retirado

- Ramas de solicitud, cancelación por toggle y alta directa del endpoint legacy `POST /groups/{groupId}/join`.
- Handler y dispatch upstream de aprobación/rechazo por UID.
- BFF exclusivos `POST /api/groups/{groupId}/requests/{userId}/approve` y `reject`.
- Estado de presentación `pending`, payloads `pendingRequests`/`pendingRequestIds`, resolución de usuarios, controles y acciones legacy de ingreso.
- Listener frontend directo de `groups.pendingRequestIds`.
- Generación de alertas `group_join_requests_pending` desde el trigger y el backfill.
- Generación de resultados legacy `accepted`/`rejected` desde el helper compartido de alertas.
- Presentación de alertas históricas de ingreso pendiente o resultado `accepted`/`rejected` en dashboard y detalle administrativo.

## Inventario preservado

- Ruta, dispatch y BFF `/join`, ahora con semántica exclusivamente de salida para una identidad autenticada que ya figure en `memberIds`.
- Consumidor de salida en perfil y salida desde el listado público.
- `handleGroupMemberAdd`, incluida su limpieza colateral existente de `pendingRequestIds`, sin reinterpretarla como decisión.
- Endpoints separados de alta, baja y búsqueda de integrantes.
- Solicitudes administrativas, `pendingAdminRequestIds`, sus rutas, handlers y UI.
- Alerta de remoción `group_membership_result` con `decision: removed`.
- Responsabilidades administrativas y de Torneos del trigger, servicio y backfill compartidos.
- Export HTTP `api`, export `onGroupPendingAlertsSync`, CORS y comandos `backfill:pending-alerts*`.
- Ocho callables, servicios, tipos, componentes, schemas, idempotencia y coordinación canónica E2-06/E2-07.
- Solicitud y Membresía como fuentes independientes; Grupo, Persona y Temporada no recibieron cambios de dominio.
- Reglas, índices y configuración Firebase/Next compartida.

## Desacople y comportamiento final

| Superficie | Comportamiento final |
| --- | --- |
| `POST /groups/{groupId}/join` | Una integrante legacy puede salir. Visitante, no integrante o UID pendiente legacy recibe `404 { "error": "Not found" }` sin escrituras. |
| `POST /groups/{groupId}/requests/{userId}/approve` | Sin dispatch específico; responde el `404` genérico del API y no escribe. |
| `POST /groups/{groupId}/requests/{userId}/reject` | Sin dispatch específico; responde el `404` genérico del API y no escribe. |
| BFF `requests/{userId}/approve|reject` | Archivos eliminados; quedan a cargo del `404` del framework. |
| Listado público legacy | Sólo presenta `member`/`none`; conserva salida y enlaza a `/join/groups/{groupId}` para ingreso canónico. |
| Detalles legacy | No leen ni presentan solicitudes desde arrays; conservan integrantes y solicitudes administrativas. |
| Alertas | No se crean desde `pendingRequestIds`; históricos no se borran y los lectores omiten sólo ingreso/accepted/rejected. `removed` continúa visible y operativo. |

No se agregó fallback, traducción por UID, doble escritura, migración, adopción, limpieza o borrado de datos históricos.

## Justificación por archivo

| Archivo | Disposición y justificación |
| --- | --- |
| `volley-ranking-system/functions/src/httpApi.js` | Se aisló `handleLeaveGroup`, se retiraron ramas/decisiones legacy y sus campos de payload; se preservaron `/join`, integrantes, admins y solicitudes administrativas. |
| `volley-ranking-system/functions/src/services/pendingAlertsService.js` | El helper mixto se acotó a `createGroupRemovalAlert`; se retiraron sólo accepted/rejected. |
| `volley-ranking-system/functions/src/triggers/onGroupPendingAlertsSync.js` | Se retiró exclusivamente la sincronización derivada de solicitudes de ingreso; admin y Torneos permanecen. |
| `volley-ranking-system/functions/src/scripts/backfillPendingAlerts.js` | Se retiró exclusivamente el cómputo/backfill de ingreso; dry-run/write, admin y Torneos permanecen. |
| `volley-ranking-frontend/src/app/api/groups/[groupId]/requests/[userId]/approve/route.ts` | Eliminado por ser BFF exclusivo de una decisión retirada. |
| `volley-ranking-frontend/src/app/api/groups/[groupId]/requests/[userId]/reject/route.ts` | Eliminado por ser BFF exclusivo de una decisión retirada. |
| `volley-ranking-frontend/src/app/(public)/groups/page.tsx` | Se retiró el toggle de ingreso/cancelación/alta; se conservó salida y se señaló el acceso canónico conocido. |
| `volley-ranking-frontend/src/app/(public)/groups/[groupId]/page.tsx` | Se retiraron tipos, listener, acciones y UI de ingreso; se conservaron integrantes y admin-requests. |
| `volley-ranking-frontend/src/app/(admin)/admin/groups/[groupId]/page.tsx` | Se retiraron mapper, acciones y UI de ingreso; se preservó administración y se filtraron alertas legacy retiradas. |
| `volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx` | Se omitieron sólo alertas históricas de ingreso y resultados accepted/rejected. |
| `volley-ranking-frontend/src/types/pendingAlerts.ts` | Se conservaron discriminantes históricos y se agregó un predicado de reconocimiento sin borrar documentos. |
| `volley-ranking-system/functions/test/emulator/minimumReadPolicy.test.js` | Se adaptó únicamente la expectativa pública `pending -> none`. |
| `volley-ranking-system/functions/test/run-emulator-tests.js` | Se incorporó la suite E2-08 al runner focal y al gate completo. |
| `volley-ranking-system/functions/test/unit/legacyJoinRetirementArchitecture.test.js` | Nueva cobertura arquitectónica ejecutable de rutas, writers, lectores, alertas y preservaciones. |
| `volley-ranking-system/functions/test/emulator/legacyJoinRetirementE2.test.js` | Nueva cobertura conductual local de 404, ausencia de efectos, salida, alta/baja, admin-requests e históricos. |

## Evidencia conductual y arquitectónica

- Pruebas unitarias/arquitectura E2-08: `4/4` verdes.
- Emulator focal E2-08: `6/6` verdes.
- Se comprobó conductualmente que las decisiones retiradas y `/join` para no integrantes devuelven `404` genérico, incluso bajo concurrencia, manteniendo sin cambios el Grupo y la cardinalidad de Solicitudes, Membresías, guards, intents, coordinaciones, Actividad y notificaciones.
- Se comprobó que `/join` elimina a una integrante legacy de `memberIds` sin tocar `pendingRequestIds`.
- Se comprobó que `handleGroupMemberAdd`, la baja separada con alerta `removed` y la aprobación de una solicitud administrativa siguen operativos.
- Se comprobó que cambiar sólo `pendingRequestIds` no genera alertas y que arrays y alertas históricas permanecen físicamente intactos.
- El gate Emulator completo ejercitó creación, cancelación, listado, aprobación, rechazo, recuperación, autorización y cardinalidad canónica E2-06/E2-07 sin usar arrays legacy.
- La revisión estática ejecutable deja `pendingRequestIds` productivo únicamente dentro de `handleGroupMemberAdd`, la excepción vinculante. No quedan fetches, imports, exports, controles ni dispatch huérfanos del flujo retirado.
- El build enumera `/api/groups/[groupId]/join`, `/join/groups/[groupId]` y las rutas `admin-request(s)`; no enumera los dos BFF retirados.

## Gates

- Sintaxis focal de los JavaScript afectados: verde.
- TypeScript focal: verde. Fue necesario regenerar los tipos de rutas y retirar únicamente el artefacto ignorado `.next/dev/types` que conservaba referencias stale a los BFF eliminados; no hubo cambio de producto asociado.
- Unitarias/arquitectura focales: `4/4`.
- Emulator focal: `6/6`.
- Build focal: verde, `21/21` páginas estáticas y árbol de rutas esperado.
- Gate completo final único `quality:stage0`: verde.
  - lint baseline: `39` errores y `9` warnings históricos conocidos; `6` hallazgos resueltos respecto del baseline;
  - typecheck: verde;
  - sintaxis Functions: `248/248`;
  - unitarias: `244/244`;
  - Emulator local `demo-*`: `130/130`;
  - build: `21/21`;
  - diff check integrado: verde.
- Advertencias ambientales no causales: `fnm` ausente en el perfil de PowerShell, MOTD remoto de Firebase CLI no disponible y datos Browserslist desactualizados. Ninguna afectó el resultado.

## Persistencia, infraestructura y alcance negativo

- No se ejecutaron migraciones, backfills de escritura, limpieza de datos ni acceso a Firebase remoto.
- No se borraron ni reinterpretaron arrays o alertas históricas.
- No se modificaron `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `next.config.ts`, dependencias ni lockfiles.
- No se modificaron módulos canónicos `groupJoinRequests`, `memberships`, contratos, DTOs, schemas, reasons, idempotencia ni coordinación E2-01–E2-07.
- No se implementaron reactivación, roster, roles, notificaciones canónicas, Actividad, administración general, Plan ni Suscripción.

## UAT manual e inspección persistente final

- La UAT manual E2-08 fue aprobada en toda su extensión sobre Emulator Suite local, loopback y datos sintéticos.
- El proyecto Emulator inspeccionado fue `demo-sportexa-e2-04`; no se accedió a Firebase remoto.
- La inspección final de sólo lectura mediante Admin SDK confirmó el camino canónico Solicitud → decisión → Membresía, sin inconsistencias persistentes.
- Identidades correlacionadas: Owner A `SqgWYTb6UGJ0rYmjXurSoeWAHGHD`, candidata B `0yIra5ZXV0qfxPazIyKNxsNS0aaD` y participante adicional `KAOdJkYWpGyQbRo335Ix0FSd1CU1`.
- IDs principales: Grupo `Jr6ffROKhpcMztBYLQ8X`, Persona de B `NELOxLYNQhcC5r1n1BOZ`, Solicitud `f2NRR8yDyjWxLkEqxNvw`, Membresía `ybosAzZ19wYopEPLNWRw` y Temporada `bZR6xtgwYDF4ZNUHzMtV`.
- IDs técnicos correlacionados: creation intent `b22f82129375144dd4b81bbb300bf26d27a5f723be722023f7d7dcb98bf78140`, decision intent `f1acb6d60161d383935327281b8a5743410ca6a83ac04399197983428035848c` y active membership guard `86ae592136f48e589bc2104792b03909be9636deabc450016dcef53a256ab3db`.
- Cardinalidades relevantes: tres identidades Auth y tres Cuentas, dos Personas, un Grupo, una Temporada, una Solicitud aprobada, una Membresía activa, un creation intent, un decision intent y un active membership guard. Hubo cero Solicitudes pendientes, pending guards, coordinaciones de aprobación residuales, Activity, notificaciones y alertas relacionadas.
- No se encontraron duplicados, referencias huérfanas, estados parciales, claims incompatibles ni coordinaciones transitorias residuales.
- La advertencia `Existe una Membresía activa ajena a esta aprobación.` observada para B no bloquea el incremento: B posee una Membresía canónica única y no representa por sí misma una fixture legacy basada en `memberIds`.
- El estado final demuestra existencia, cardinalidad y correlación actuales. Los hechos que requieren comparación temporal —ausencia de escrituras nuevas sobre arrays y conservación histórica sin snapshot anterior— no se atribuyen indebidamente al snapshot final: quedan respaldados por la UAT aprobada, la evidencia automatizada y el análisis estático previo.
- Veredicto de la inspección: `INSPECCIÓN FINAL E2-08 CONSISTENTE`.

## Riesgos y alcance diferido

- Riesgo residual aceptado: continúan otros consumidores y writers legacy de pertenencia/administración expresamente excluidos; este incremento no los valida ni los retira.
- Los documentos históricos quedan deliberadamente almacenados, aunque sus alertas de ingreso ya no se presenten en las superficies adaptadas.
- Reactivación, renovación, roster canónico, retiro de los restantes arrays legacy, evolución de solicitudes administrativas, notificaciones canónicas y Actividad permanecen fuera de alcance y requieren incrementos propios.

## Estado Git

- Rama de implementación: `feat/e2-08-retire-legacy-join-requests`.
- Base de implementación: `63e791472d3363c38abbee446ec58edd9cca70b3`.
- Working tree preparado para versionar los archivos productivos y pruebas inventariados, los dos BFF eliminados y este informe actualizado con UAT e inspección final.
- Ficha, cierres anteriores, dependencias y lockfiles permanecen sin cambios.
