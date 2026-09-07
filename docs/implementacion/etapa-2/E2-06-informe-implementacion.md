# E2-06 — Informe de implementación de Solicitud propia de ingreso a Grupo

## 1. Identificación, ficha y objetivo

- Incremento: `E2-06 — Solicitud propia de ingreso a Grupo`.
- Ficha normativa: `docs/implementacion/etapa-2/E2-06-ficha-solicitud-ingreso.md`.
- Rama: `feat/e2-06-group-join-request`.
- HEAD documental original y merge-base inicial: `d9e84d782cfaf67194a8596d6d35519b4f62e0d2`.
- HEAD base final sincronizado: `c1ba65399ddf0fb3ca8c88cd1541a2ce615194bf`.

El objetivo implementado es el flujo mínimo completo de una Solicitud propia: preview autenticado y candidate-safe de un Grupo canónico conocido, creación idempotente, consulta de la pendiente vigente, cancelación propia y listado paginado de pendientes para el Owner vigente. Solicitud es un Aggregate Root y la única fuente de verdad funcional. No se implementaron aprobación, rechazo ni creación de Membresía.

## 2. Prerrequisitos incorporados en la base

La rama se sincronizó por fast-forward con `dev` después de integrar dos correcciones concurrentes preexistentes necesarias para acreditar la suite combinada:

- E2-03/E2-05: recuperación estrecha de creación concurrente de Membresía, commit correctivo `0f59d38bbd8bd6dd61a1e619f282013af87962d6`, incorporado previamente en la base `7dd60fef12919f8f7b24338d36286230bda2abae`.
- E2-02: recuperación estrecha de apertura concurrente de Temporada, commit correctivo `75e077cd0074c3183015e1ce947535df40f35bcf`, integrado en `dev` mediante `c1ba65399ddf0fb3ca8c88cd1541a2ce615194bf`.

Ambas correcciones pertenecen a la base versionada. No forman parte del diff local E2-06 ni modifican su alcance funcional.

## 3. Arquitectura y capacidades públicas

La solución conserva las fronteras del repositorio:

- dominio puro para el Aggregate Root Solicitud, sin Firebase;
- aplicación con contratos cerrados, DTO explícitos, errores estables, hashing y servicio sin Admin SDK;
- infraestructura Firestore encapsulada en repositorio, store coordinador, readers, callable adapter y composición;
- presentación web exclusivamente mediante callables, sin importaciones de Firestore;
- coordinación entre Agregados mediante capacidades públicas mínimas, sin compartir repositorios privados.

Las capacidades públicas incorporadas para E2-06 son:

- Cuenta: resolución autoritativa del vínculo UID–Persona;
- Persona: compatibilidad y proyección mínima de nombre y apellido;
- Grupo: contexto canónico, actividad y ownership vigente;
- Membresía: verificación autoritativa de Membresía activa para la Persona y el Grupo.

La capacidad de Membresía reutiliza la composición pública sin alterar la dependencia ni el camino transaccional de creación de Membresía. E2-07 podrá consumir capacidades públicas o coordinación de aplicación, no internals privados de E2-06.

## 4. Hallazgos H01–H04 y correcciones

- **H01 — fronteras públicas:** se sustituyeron accesos cruzados a internals por capacidades públicas específicas de Cuenta, Persona, Grupo y Membresía, con un adapter privado limitado al contexto candidato.
- **H02 — recuperación frontend:** la máquina de estado conserva la clave de idempotencia ante respuesta incierta y sólo la rota cuando la persona inicia expresamente una nueva intención después de cancelar o descartar la anterior.
- **H03 — cobertura conductual:** se agregaron pruebas deterministas de contratos, servicio, persistencia, concurrencia, reglas, efectos colaterales y estado frontend; las garantías críticas no descansan sólo en búsquedas de texto.
- **H04 — observabilidad:** se agregó telemetría allowlisted por operación, etapa, clasificación, outcome o reason y duración, sin UID, IDs de dominio, payload, clave, hash, documentos, snapshots ni stack en respuestas públicas.

Las cuatro correcciones fueron aprobadas focalmente antes de la sincronización final y permanecen incluidas en la validación combinada.

## 5. Inventario E2-06

### Archivos modificados

- `volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx`.
- `volley-ranking-system/firestore.indexes.json`.
- `volley-ranking-system/firestore.rules`.
- `volley-ranking-system/functions/index.js`.
- `volley-ranking-system/functions/test/run-emulator-tests.js`.

### Archivos nuevos de frontend

- `volley-ranking-frontend/src/app/(protected)/join/groups/[groupId]/page.tsx`.
- `volley-ranking-frontend/src/components/groupJoinRequests/GroupJoinRequestCandidate.tsx`.
- `volley-ranking-frontend/src/components/groupJoinRequests/PendingGroupJoinRequestsSection.tsx`.
- `volley-ranking-frontend/src/components/groupJoinRequests/groupJoinRequestCandidateState.ts`.
- `volley-ranking-frontend/src/services/groupJoinRequestsService.ts`.
- `volley-ranking-frontend/src/types/GroupJoinRequest.ts`.

### Callables

- `volley-ranking-system/functions/callables/getKnownGroupJoinPreview.js`.
- `volley-ranking-system/functions/callables/createMyGroupJoinRequest.js`.
- `volley-ranking-system/functions/callables/getMyCurrentGroupJoinRequest.js`.
- `volley-ranking-system/functions/callables/cancelMyGroupJoinRequest.js`.
- `volley-ranking-system/functions/callables/listPendingGroupJoinRequestsForOwnedGroup.js`.

### Dominio, aplicación e infraestructura

- `volley-ranking-system/functions/src/groupJoinRequests/domain/groupJoinRequest.js`.
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestContract.js`.
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestCursor.js`.
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestDto.js`.
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestErrors.js`.
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestHashing.js`.
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestService.js`.
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestRepository.js`.
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore.js`.
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/groupJoinRequestCallable.js`.
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/groupJoinRequestModule.js`.

### Capacidades públicas

- `volley-ranking-system/functions/src/users/public/groupJoinRequestAccountCapability.js`.
- `volley-ranking-system/functions/src/persons/public/groupJoinRequestPersonCapability.js`.
- `volley-ranking-system/functions/src/groups/public/groupJoinRequestGroupCapability.js`.
- `volley-ranking-system/functions/src/memberships/public/groupJoinRequestMembershipCapability.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipCandidateContext.js`.

### Pruebas

- `volley-ranking-system/functions/test/emulator/groupJoinRequestE2.test.js`.
- `volley-ranking-system/functions/test/unit/groupJoinRequestArchitecture.test.js`.
- `volley-ranking-system/functions/test/unit/groupJoinRequestCallable.test.js`.
- `volley-ranking-system/functions/test/unit/groupJoinRequestCandidateState.test.js`.
- `volley-ranking-system/functions/test/unit/groupJoinRequestContract.test.js`.
- `volley-ranking-system/functions/test/unit/groupJoinRequestDomain.test.js`.
- `volley-ranking-system/functions/test/unit/groupJoinRequestIntegrity.test.js`.
- `volley-ranking-system/functions/test/unit/groupJoinRequestService.test.js`.

Este informe agrega `docs/implementacion/etapa-2/E2-06-informe-implementacion.md`. El inventario final local queda en 5 archivos modificados y 36 nuevos, incluido el informe.

## 6. Schemas persistentes

### `groupJoinRequests`

Pendiente v1:

```text
personId
groupId
estado: "pendiente"
createdAt
schemaVersion: 1
```

Cancelada v1 conserva los campos anteriores y agrega:

```text
estado: "cancelada"
cancelledAt
```

### `pendingGroupJoinRequestGuards`

```text
requestId
personId
groupId
createdAt
guardVersion: 1
```

### `groupJoinRequestIntents`

```text
requestId
personId
groupId
requestHash
createdAt
intentVersion: 1
```

Los timestamps son generados autoritativamente por el backend como `Timestamp` de Firestore. No se persisten UID, email, `seasonId`, `membershipId`, roles, clave cruda ni `idempotencyKeyHash`. Solicitud es autoridad funcional; el guard sólo contiene la unicidad pendiente Persona–Grupo y el intent conserva recuperación durable.

## 7. Contratos, DTO y errores

Los cinco callables públicos son exactamente:

- `getKnownGroupJoinPreview`;
- `createMyGroupJoinRequest`;
- `getMyCurrentGroupJoinRequest`;
- `cancelMyGroupJoinRequest`;
- `listPendingGroupJoinRequestsForOwnedGroup`.

Los payloads son planos y cerrados. Preview y consulta propia aceptan sólo `groupId`; creación, `groupId` e `idempotencyKey`; cancelación, `groupId` y `requestId`; listado, `groupId` y opcionalmente `pageSize` y `cursor`. Toda propiedad desconocida se rechaza. UID, Persona, Owner, roles y estado siempre se derivan autoritativamente y nunca se aceptan desde cliente.

Los límites aplicados son: IDs opacos sin `/` y de hasta 1500 bytes UTF-8; clave ASCII de 16 a 128 caracteres; página por defecto y máxima de 20; cursor base64url de hasta 2048 caracteres.

DTO públicos:

- preview: `id`, `nombre`, `deporte`;
- Solicitud pendiente propia: `id`, `groupId`, `estado`, `createdAt`;
- Solicitud cancelada propia: los campos anteriores más `cancelledAt`;
- item Owner: `id`, `estado`, `createdAt`, `person: { firstName, lastName }`;
- página Owner: `{ items, nextCursor }`.

Los outcomes y reasons forman conjuntos cerrados. El adapter callable sanitiza errores y no expone documentos Firestore, guards, intents, hashes, claves, stack traces ni detalles internos.

## 8. Autorización y privacidad

El UID proviene exclusivamente del token. Cuenta y Persona se derivan mediante lecturas autoritativas. El flujo candidato exige Persona compatible y Grupo canónico activo; rechaza al Owner vigente y a quien ya tiene Membresía activa. No usa `users.roles`, por lo que un rol global `admin` no elude las condiciones.

El listado exige ownership vigente del Grupo. Una Membresía no concede administración. El preview no revela Owner, integrantes, emails, Temporada, configuración ni datos internos. El listado sólo compone nombre y apellido de Persona; no expone email, UID, `personId`, roles ni documentos completos. Ninguna pantalla o API legacy constituye un camino alternativo hacia estos contratos.

## 9. Idempotencia

El identificador durable de intención sigue la fórmula normativa:

```text
intentId = hash(dominio técnico estable + userId autenticado + idempotencyKey)
```

No incluye `groupId`, `personId` ni payload. `requestHash` cubre versión contractual, Persona autoritativamente derivada y Grupo. Así, la misma clave y contexto recupera idempotentemente; la misma clave con otro contexto devuelve `IDEMPOTENCY_CONFLICT`; actores distintos generan intents distintos.

La clave cruda no se persiste ni se registra. La cancelación conserva el intent; una intención posterior requiere una clave nueva. No hay TTL ni cleanup de intents.

## 10. Integridad Solicitud–guard–intent

La consulta autoritativa filtra `personId`, `groupId` y `estado == "pendiente"` con límite 2. Se ejecuta en creación, consulta propia, cancelación y validación de cada item del listado Owner.

La matriz aplicada es cerrada:

- cero pendientes y guard ausente: ausencia legítima;
- una pendiente y guard único exactamente correlacionado: estado válido;
- cualquier asimetría, duplicado, huérfana, correlación incorrecta o schema incompatible: `INCOMPATIBLE_STATE`.

No se selecciona arbitrariamente entre duplicados, no se filtra corrupción, no se adopta un documento y no se repara ni borra estado automáticamente. La cancelación conserva la Solicitud, la transiciona a `cancelada`, registra sólo `cancelledAt`, elimina únicamente el guard y conserva el intent.

## 11. Concurrencia

Las transacciones reúnen todas sus lecturas antes de la primera escritura y no lanzan queries concurrentes dentro del callback. No se reutiliza una transacción cerrada.

La cobertura comprueba claves iguales y distintas, misma Persona–Grupo, misma clave con otro Grupo, respuesta perdida, errores antes y después del commit, Membresía activa concurrente, cancelación contra retry, doble cancelación y nueva intención posterior. La recuperación sólo devuelve outcome cuando una relectura autoritativa demuestra el estado completo; corrupción nunca se interpreta como ausencia.

E2-06 no promete atomicidad multi-Agregado entre Solicitud y Membresía. La capacidad de Membresía aporta la garantía real aprobada, y las correcciones E2-03/E2-05 y E2-02 de la base eliminan los HTTP 500 espurios de sus respectivos contendientes perdedores sin ampliar clasificadores globales.

## 12. Paginación e índice

El listado ordena por `createdAt DESC` y `documentId DESC`, solicita `pageSize + 1` y emite cursor opaco con timestamp e ID. El cursor valida forma, versión y ambos componentes. El desempate por ID evita omisiones con timestamps iguales; una página sin resultados devuelve exactamente `{ "items": [], "nextCursor": null }`, incluida una página posterior vacía.

Cada item exige Solicitud, guard y Persona compatibles. Un único item inválido hace fallar toda la página; no existe filtrado silencioso. El máximo de 20 limita el N+1 autorizado.

El único cambio en `firestore.indexes.json` es el índice aprobado:

```text
groupId ASC
estado ASC
createdAt DESC
```

Firestore utiliza `__name__ DESC` como desempate físico coherente con la consulta. La consulta autoritativa de igualdad con límite 2 funcionó con índices automáticos en Emulator; no se agregó otro índice ni se modificaron overrides.

## 13. Reglas Firestore

Las colecciones `groupJoinRequests`, `pendingGroupJoinRequestGuards` y `groupJoinRequestIntents` permanecen deny-all para clientes. Las pruebas negativas cubren visitante, autenticado, candidata, Owner, integrante y administrador global, tanto para lectura y escritura de Solicitudes como para acceso directo a guards e intents. El backend opera con Admin SDK; las reglas no se abrieron para el frontend ni para facilitar pruebas.

## 14. Frontend

La ruta candidata es `/join/groups/[groupId]` y sólo usa los callables E2-06. Presenta preview mínimo, ausencia, creación, pendiente, confirmación de cancelación y recuperación ante respuesta incierta. Bloquea doble envío, conserva la clave durante retry y la rota únicamente para una nueva intención explícita.

La sección Owner pagina pendientes, diferencia carga, vacío, error y retry, y sólo muestra nombre y apellido. No incluye botones de aprobar o rechazar ni enlaza pantallas legacy. El enlace compartible apunta a la ruta opaca aprobada y no concede acceso al detalle privado del Grupo.

Las superficies incorporan labels, navegación por teclado, foco o anuncio de error y éxito, confirmación accesible, regiones asíncronas anunciables, controles táctiles y estilos responsive sin scroll horizontal.

## 15. Observabilidad

La observabilidad registra exclusivamente campos allowlisted: operación, etapa estable, clasificación, outcome o reason y duración. No registra clave de idempotencia, UID, `personId`, `groupId`, `requestId`, hashes, emails, payloads, documentos, snapshots ni stack. No altera la semántica funcional ni convierte excepciones en outcomes.

## 16. Legado preservado

No hay doble lectura, fallback ni doble escritura. Permanecen aislados los arrays de solicitudes de Grupo, `memberIds`, `adminIds`, `admins`, API HTTP y búsqueda legacy, pantallas públicas y administrativas legacy, solicitudes administrativas, partidos, Torneos, notificaciones y roles globales. No se escribe `pendingRequestIds`, `pendingAdminRequestIds` ni se embebe Solicitud en Grupo.

## 17. Fixtures y cleanup

Las pruebas usan proyectos `demo-*`, loopback, datos sintéticos e IDs registrados explícitamente. El cleanup opera por IDs literales de los fixtures y no borra colecciones completas. No se preparó estado mediante Emulator UI, no se usaron credenciales o proyectos remotos y no quedaron procesos residuales.

## 18. Efectos colaterales ausentes

La implementación no crea ni modifica Membresía, Grupo, Temporada, Persona, Usuario, actividad, notificaciones, pagos, arrays legacy ni otros Agregados. Sólo escribe Solicitud, su guard pendiente y su intent durable de acuerdo con la transición aprobada. No se agregaron dependencias ni se modificaron lockfiles.

## 19. Pruebas agregadas y calidad real

La cobertura incluye dominio, schemas, contratos cerrados, DTO, errores, hashing, servicio, callables, arquitectura, máquina frontend y Emulator. Los escenarios conductuales verifican pendiente y guard huérfanos, duplicados autoritativos, intent incompatible, misma clave con otro Grupo, respuesta perdida, cancelación y nueva intención, ownership cambiado, Persona incompatible, timestamps iguales, cursores inválidos, página vacía, deny-all y ausencia de efectos colaterales.

Las aserciones de persistencia comprueban cardinalidad y correlación reales; las pruebas concurrentes usan coordinación determinista del runner o transacciones reales en Emulator, no sleeps o reintentos probabilísticos como criterio primario. Las comprobaciones estructurales complementan, pero no sustituyen, las pruebas conductuales.

## 20. Resultados previos

Antes de las correcciones H01–H04 se habían aprobado sintaxis `233/233`, unitarias `213/213`, Emulator `103/103`, focal E2-06 `9/9`, mantenimiento `7/7`, typecheck, build de 21 páginas, lint baseline, `quality:diff` y `git diff --check`.

Después de H01–H04 aprobaron focales unitarias `12/12` y Emulator E2-06 `13/13`; sintaxis `239/239`, unitarias `218/218`, mantenimiento `7/7`, typecheck, build de 21 páginas, lint baseline y quality checks. La suite Emulator de esa etapa expuso defectos concurrentes preexistentes de Membresía y luego Temporada, corregidos separadamente y versionados en `dev` antes de esta validación combinada.

## 21. Validación combinada final

| Gate | Resultado |
| --- | --- |
| Sintaxis Functions | Aprobado, `239/239` |
| Unitarias focales Temporada | Aprobado, `10/10` |
| Unitarias focales Membresía | Aprobado, `19/19` |
| Unitarias focales E2-06 | Aprobado, `19/19` |
| Emulator focal Temporada | Aprobado, `11/11` |
| Emulator focal Membresía | Aprobado, `18/18` |
| Emulator focal E2-06 | Aprobado, `13/13` |
| Unitarias completas combinadas | Aprobado, `231/231` |
| Emulator Suite completa combinada | Aprobado, `107/107` |
| Mantenimiento/reglas | Aprobado, `7/7` |
| Typecheck | Aprobado |
| `quality:diff` | Aprobado |
| `git diff --check` | Aprobado |
| Lint baseline | Evidencia previa aprobada; no repetido por instrucción |
| Build | Evidencia previa aprobada, 21 páginas; no repetido por instrucción |

El caso concurrente histórico de E2-03 aprobó sin HTTP 500, con exactamente una Membresía activa, un active guard y correlación íntegra. El caso concurrente E2-02 también aprobó con exactamente una Temporada abierta y su guard correlacionado.

La primera Emulator Suite combinada fue interrumpida por el límite de uso mientras aún se ejecutaba y no dejó resultado final verificable. Se confirmó ausencia de runner o Emulator activo y de una salida persistente completa. La interrupción se clasificó como infraestructura, no como fallo técnico. Conforme al criterio autorizado, la suite se ejecutó una única vez adicional y terminó con código 0 y `107/107`; no se repitieron focales ni se realizaron intentos sucesivos.

## 22. Warnings históricos

Se conservaron separados de fallos reales los avisos históricos de Browserslist/`caniuse-lite`, conversión LF/CRLF, perfil PowerShell sin `fnm`, mensaje informativo de Firebase CLI, versión antigua del SDK `firebase-functions` y snapshots del Emulator sin `readTime`. Ninguno cambió el código de salida ni invalidó un gate.

## 23. Riesgos y deuda

- El listado Owner mantiene el N+1 expresamente acotado a 20; una optimización futura requeriría nueva decisión normativa.
- No existe snapshot consistente entre páginas; el cursor evita omisiones por empate dentro del orden físico, pero altas concurrentes entre páginas conservan la semántica normal de paginación Firestore.
- Los intents no tienen TTL ni cleanup por decisión explícita de E2-06.
- Aprobación, rechazo, creación de Membresía, notificaciones y actividad permanecen fuera de alcance.
- Las correcciones concurrentes de Membresía y Temporada son prerrequisitos versionados y documentados separadamente; no implican atomicidad entre Agregados.

## 24. UAT ejecutada

UAT manual ejecutada y aprobada en navegador real contra Emulator Suite local, loopback y proyecto sintético `demo-sportexa-e2-06`, sin acceso remoto. La autenticación se realizó exclusivamente mediante Google Auth. El fixture mínimo incluyó Cuenta, Persona y Grupo sintéticos; el enlace probado fue `/join/groups/[groupId]`.

Casos ejecutados:

- preview candidate-safe del Grupo: **APROBADO**;
- creación de Solicitud pendiente: **APROBADO**;
- bloqueo de doble envío: **APROBADO**;
- persistencia tras recarga: **APROBADO**;
- cancelación confirmada: **APROBADO**;
- preparación explícita de una nueva Solicitud: **APROBADO**;
- listado para el Owner: **APROBADO**;
- privacidad: el Owner observó solamente nombre y apellido: **APROBADO**;
- estados de carga y vacío: **APROBADO**;
- estado de error, reintento y reconsulta: **APROBADO**;
- teclado, foco, anuncios, controles táctiles y responsive: **APROBADO**;
- ausencia de aprobar, rechazar o crear Membresía: **APROBADO**.

La inspección final local confirmó 3 Solicitudes conservadas, 1 pendiente y 2 canceladas; cada Solicitud pendiente tuvo guard e intent correlacionados, no hubo duplicados pendientes y los efectos colaterales fueron cero en `memberships`, `activeMembershipGuards`, `seasons`, `activities` y `notifications`. No se observaron escrituras de aprobación, rechazo ni creación de Membresía.

## 25. Estado Git y operaciones externas

La rama permanece `feat/e2-06-group-join-request`, con HEAD y upstream en `c1ba65399ddf0fb3ca8c88cd1541a2ce615194bf` y divergencia `0/0` antes del diff local. La implementación y este informe permanecen sin commit y sin staging. No queda stash temporal ni conflicto.

No se realizó commit de E2-06, merge final, deploy ni acceso a Firebase remoto. La UAT se ejecutó únicamente con Emulator local, loopback y proyectos `demo-*`. Las únicas publicaciones fueron las bases correctivas y el avance de la rama a la base sincronizada expresamente autorizados.

## 26. Veredicto

**E2-06 IMPLEMENTADO, REVISADO Y VALIDADO EN UAT — APROBADO**
