# E2-13 — Ficha de Incremento Implementable: retiro de autoridad organizativa legacy restante

## 1. Identificación y estado

- Incremento: `E2-13`.
- Nombre: `Retiro de autoridad organizativa legacy restante`.
- Tipo: retiro, neutralización y adaptación por flujo.
- Estado de esta ficha: lista para revisión documental; implementación no iniciada.
- Base obligatoria de la futura implementación: `dev` en `bad29b7ff122640e30ad16671a43c7d690875d26`.
- Predecesor: E2-12 cerrado, publicado e integrado.
- Resultado que origina el incremento: `ETAPA 2 NO LISTA PARA CIERRE — REQUIERE INCREMENTO ADICIONAL`.
- Condición Git de esta definición: no crear rama, commit, push, merge ni stash; la ficha queda sin seguimiento.

E2-13 cierra una omisión de retiro. No agrega una capacidad funcional. Su resultado es que el modelo legacy deja de poder producir o modificar autoridad organizativa, mientras los consumidores deportivos todavía no migrados quedan expresamente acotados a compatibilidad E4.

## 2. Preflight verificado

La verificación previa a cualquier escritura documental arrojó:

| Control | Resultado |
|---|---|
| Rama inicial | `dev` |
| `HEAD` | `bad29b7ff122640e30ad16671a43c7d690875d26` |
| Upstream | `origin/dev` |
| Divergencia `HEAD...origin/dev` | `0/0` |
| Merge-base `HEAD` / `origin/dev` | `bad29b7ff122640e30ad16671a43c7d690875d26` |
| `dev` | `bad29b7ff122640e30ad16671a43c7d690875d26` |
| `origin/dev` | `bad29b7ff122640e30ad16671a43c7d690875d26` |
| Índice | limpio |
| Working tree | limpio |
| Stashes | cero |
| Ficha E2-13 previa | ausente |
| Rama local o remota con `E2-13`/`e2-13` | ausente |
| Referencia Auth/UAT | rama `chore/preserve-auth-emulator-uat-changes`, commit `fc7135e358902a17372d44f20df50883603520ce` |

La referencia Auth/UAT se comprobó por historial y no se integró ni modificó.

## 3. Fuentes consultadas y precedencia

Se aplicó la precedencia solicitada:

1. Documentos aprobados 1, 1.5, 2, 3 AUD-C05 y 4 AUD-C05, incluidas sus aclaraciones de vigencia.
2. Documento 5, en especial fuentes de verdad, retiro por flujo, compatibilidad limitada, mapa preliminar de E2 y prohibición de doble escritura.
3. Cierre consolidado de Etapa 0 y cierres E1-01 a E1-03.
4. Fichas, informes y cierres E2-01 a E2-12; se revisaron especialmente los inventarios y deudas de E2-01, E2-02, E2-08, E2-10, E2-11 y E2-12.
5. Resultado aportado de la auditoría de cierre posterior a E2-12. La auditoría no dejó un archivo nuevo en el repositorio; su conclusión vinculante es la citada en la sección 1.
6. `docs/transicion/Informe de auditoría técnica del repositorio actual producido por Codex.md`.
7. Código, reglas, configuración, pruebas y rutas presentes en el SHA base.
8. Historial Git de `dev`, incluidos los cierres integrados de E2-08 a E2-12 y el historial de las superficies legacy.

La normativa aprobada prevalece sobre contratos, pruebas de caracterización y comportamiento legacy todavía presentes.

## 4. Fundamento normativo y problema a resolver

El modelo vigente exige:

- Grupo como raíz independiente y única fuente de su información organizativa propia;
- `groups/{groupId}.ownerId` como ownership contextual de un Grupo canónico v1;
- Membresía como fuente de pertenencia Persona–Grupo–Temporada;
- Solicitud como raíz independiente;
- Temporada como Agregado independiente dentro del Módulo Grupos;
- autorización deportiva contextual, no derivada de `users.roles`;
- backend como único escritor de las raíces canónicas;
- inexistencia de doble escritura o compatibilidad productiva indefinida.

El aislamiento por `schemaVersion === 1` protege al Grupo canónico de varios flujos antiguos, pero no elimina el problema: Rules, HTTP, callables y UI todavía permiten crear o administrar documentos sin `schemaVersion: 1` y convertir `memberIds`, `adminIds`, `admins`, `pendingAdminRequestIds`, restos de `pendingRequestIds` y `users.roles` en otra autoridad operativa.

El invariante de salida de E2-13 es:

> Después de integrar E2-13 no existe ningún camino alcanzable por cliente, BFF, HTTP API o callable que cree un Grupo legacy o escriba autoridad organizativa embebida en `groups`. Los arrays históricos pueden ser leídos únicamente por consumidores E4 inventariados, nunca como contrato organizativo canónico ni como permiso para mutar Organización.

## 5. Objetivo implementable

La futura implementación debe:

1. cerrar create/update cliente de `groups` para documentos canónicos, legacy y sin `schemaVersion`;
2. neutralizar de manera estable las rutas HTTP legacy conocidas;
3. eliminar las BFF exclusivas y sus controles frontend;
4. convertir los seis callables legacy exportados en rechazos estables sin lecturas ni escrituras;
5. retirar o redirigir páginas que presentan arrays como integrantes, administradores o solicitudes vigentes;
6. retirar la producción y presentación de alertas de solicitudes administrativas embebidas;
7. mantener intactos los flujos E2 canónicos;
8. mantener sólo los lectores E4 enumerados, con pruebas de que no escriben `groups` ni conceden permisos canónicos;
9. conservar físicamente los documentos y arrays históricos, sin migración, limpieza ni conversión automática.

## 6. Decisiones cerradas

### 6.1 Retirar frente a neutralizar

| Superficie | Decisión vinculante | Motivo |
|---|---|---|
| Firestore cliente `groups` create/update/delete | negar por completo | Es la barrera inmediata contra clientes actuales, antiguos, caché y escrituras directas. |
| Ocho rutas organizativas de la HTTP API | neutralizar con tombstone `410` | Puede haber clientes externos o versiones antiguas; el rechazo uniforme permite retiro inequívoco sin consultar identidad ni recurso. |
| BFF equivalentes | eliminar | Son proxies exclusivos controlados por este repositorio; mantenerlos prolongaría alcanzabilidad y contrato duplicado. |
| `addGroupAdmin`, `removeGroupAdmin`, `reorderGroupAdmins`, `transferGroupOwnership`, `editGroup`, `toggleGroupActivo` | conservar export temporal y reemplazar implementación por rechazo estable | Un callable desexportado produce un `not-found` poco distinguible y puede inducir retries. El tombstone conserva nombre por una ventana de compatibilidad, pero elimina imports de datos y capacidad de escritura. |
| Handlers, helpers y servicios exclusivamente organizativos que queden sin consumidores | eliminar como código muerto | Reduce el riesgo de reexport o reconexión accidental. |
| Lectores de Partido/Torneo/fixture/elegibilidad/alertas | conservar read-only hasta E4 | No existe reemplazo E4 en este incremento. La conservación no incluye escrituras a Grupo ni autorización canónica. |
| UI organizativa legacy | redirigir o adaptar a proyección sin acciones, según tabla de UI | No debe existir una segunda consola de Organización. |

No queda a criterio de implementación mantener activo alguno de los writers inventariados.

### 6.2 Contrato HTTP neutralizado

El orden de despacho es parte del contrato y no puede alterarse:

1. ejecutar `applyCors(req, res)` con la política y allowlist existentes;
2. si el método es `OPTIONS`, responder `204` para origen permitido o ausencia de `Origin`, y `403` para origen no permitido; terminar sin autenticar ni leer datos;
3. si CORS rechazó una petición no-`OPTIONS`, responder `403` y terminar;
4. comparar método y `req.path` contra la tabla cerrada de rutas retiradas;
5. ante coincidencia exacta, responder el tombstone `410` y terminar;
6. despachar los GET públicos y push conservados;
7. obtener identidad únicamente dentro de la rama `POST /push/subscribe`;
8. responder `404 {"error":"Not found"}` a toda ruta o método restante.

Por lo tanto, el tombstone ocurre después de CORS/preflight y antes de verificar token, leer `users`, leer `groups`, parsear semánticamente el payload o ejecutar un handler anterior. Toda coincidencia exacta con las rutas retiradas responderá:

```http
HTTP/1.1 410 Gone
Content-Type: application/json

{"error":{"code":"LEGACY_GROUP_CAPABILITY_RETIRED","message":"Esta capacidad ya no está disponible."}}
```

Propiedades obligatorias:

- misma respuesta para Grupo existente, inexistente, legacy, canónico o sin `schemaVersion`;
- misma respuesta para autenticado, no autenticado, Owner, global admin o tercero;
- cero lecturas de `groups` y `users` y cero escrituras;
- retries y doble clic devuelven el mismo resultado;
- `410` y el código estable distinguen capacidad retirada de un fallo transitorio;
- no se incluyen `groupId`, `userId`, existencia, ownership ni estado en el cuerpo o logs funcionales.

Matriz de precedencia y matching:

| Entrada | Resultado obligatorio |
|---|---|
| `OPTIONS` con `Origin` permitido, sobre ruta retirada o conservada | `204`, headers CORS existentes, sin Auth ni lecturas |
| `OPTIONS` sin `Origin` | `204`, sin Auth ni lecturas |
| `OPTIONS` con `Origin` no permitido | `403`, sin tombstone, Auth ni lecturas |
| método retirado exacto + origen permitido o sin `Origin` | `410 LEGACY_GROUP_CAPABILITY_RETIRED` con headers CORS cuando corresponda |
| método retirado exacto + origen no permitido | `403`; CORS prevalece y no se revela el contrato retirado |
| otro método sobre el mismo path | no coincide con el tombstone; continúa al dispatcher conservado y, si nadie lo atiende, `404` |
| path parecido, segmento extra, segmento faltante o recurso deportivo conservado | no coincide; continúa al dispatcher correspondiente o `404` |
| path exacto con query string | coincide, porque se compara `req.path`; la query se ignora |
| path con slash final | no coincide; no se normaliza y finaliza en `404` salvo que infraestructura lo normalice antes de `req.path` |
| payload vacío o semánticamente inválido que alcanzó la Function | `410`; el body no se valida ni se usa |
| payload grande pero aceptado por la plataforma | `410`; el body se ignora |
| JSON malformado o payload superior al límite rechazado antes de invocar el handler | respuesta `400`/`413` de infraestructura; aun así no hay Auth, lecturas ni efectos de aplicación |

Los matchers deben estar anclados (`^...$`), comparar también el método y excluir expresamente `GET /groups/public`, `GET /groups/{groupId}/public`, `/push/*`, rutas de Partido/Torneo y cualquier segmento adicional. No se incorpora normalización tolerante de slash, alias ni comodines amplios.

Rutas neutralizadas:

```text
POST /groups/{groupId}/members/{userId}/add
POST /groups/{groupId}/members/{userId}/remove
GET  /groups/{groupId}/members/search
POST /groups/{groupId}/admin-request
POST /groups/{groupId}/admin-requests/{userId}/approve
POST /groups/{groupId}/admin-requests/{userId}/reject
POST /groups/{groupId}/admins/{userId}/add
POST /groups/{groupId}/admins/{userId}/remove
```

El `api` compartido no se elimina: conserva CORS, push y las lecturas públicas aprobadas. Los handlers anteriores se eliminan; el matcher de tombstones no los envuelve ni los llama.

### 6.3 Contrato de callables neutralizados

Los seis nombres continúan exportados durante E2-13, pero cada archivo pasa a ser un tombstone sin importar `firebase-admin`, `db`, `adminAccessService`, `adminGroupService` ni `groupAdminsService`. Toda invocación autenticada o no autenticada rechaza antes de inspeccionar el payload con:

```text
HttpsError code: failed-precondition
details.reason: LEGACY_GROUP_CAPABILITY_RETIRED
message: Esta capacidad ya no está disponible.
```

La respuesta es idéntica para cualquier `groupId`; no revela existencia y no muta datos. Los nombres son:

- `addGroupAdmin`;
- `removeGroupAdmin`;
- `reorderGroupAdmins`;
- `transferGroupOwnership`;
- `editGroup`;
- `toggleGroupActivo`.

La desexportación definitiva queda para un retiro de compatibilidad posterior con evidencia de ausencia de clientes. No se permite conservar el código writer detrás de un guard de `schemaVersion`.

### 6.4 Documentos legacy existentes

- No se migran.
- No se eliminan.
- No se convierten automáticamente a schema v1.
- No se corrigen arrays corruptos, duplicados o incompletos.
- No se resuelven ni borran solicitudes administrativas pendientes.
- Un documento sin `schemaVersion` se considera legacy sólo a efectos de lectura transitoria; nunca es escribible por cliente o por las superficies retiradas.
- Un intento de mutación cliente recibe Rules deny; por HTTP recibe el `410` estable; por callable recibe `LEGACY_GROUP_CAPABILITY_RETIRED`.
- El Admin SDK podrá leerlo únicamente en los consumidores E4 enumerados. E2-13 no autoriza nuevos writers de Admin SDK.
- Ninguna UI organizativa lo presenta como fuente vigente de pertenencia, administración u ownership canónico.

### 6.5 Ownership

Se mantienen separadas cuatro nociones:

1. `ownerId` de Grupo schema v1 es ownership canónico y sigue siendo leído por las capacidades E2.
2. La escritura de `ownerId` desde `transferGroupOwnership`, reordenamiento o aprobación legacy se retira.
3. `admins` y `adminIds` no son ownership ni administración canónica; sólo sobreviven como datos históricos y lectura E4 acotada.
4. `users.roles` no concede permisos de mutación organizativa.

E2-13 no implementa transferencia canónica. La pérdida de la transferencia legacy es intencional y la operación queda no disponible hasta que un incremento futuro defina el caso canónico.

### 6.6 Solicitud administrativa

`pendingAdminRequestIds` se clasifica como funcionalidad legacy diferida, no como una variante aprobada de la Solicitud E2-06/E2-07. No existe normativa ni contrato canónico suficiente para convertir “quiero ser administrador” en una nueva raíz.

Por lo tanto:

- se retiran creación, cancelación implícita, aprobación y rechazo;
- no se traduce a `groupJoinRequests`;
- no se crean Solicitudes, Membresías o roles contextuales;
- los valores existentes permanecen físicamente intactos e inaccesibles desde UI organizativa;
- los productores de alertas derivados de ese array se retiran;
- las alertas históricas se omiten en frontend, sin borrarlas ni resolverlas masivamente.

### 6.7 Redirección de rutas con IDs legacy

La ruta `/dashboard/groups/[groupId]` invoca `getOwnGroup`, cuyo repositorio hidrata exclusivamente el schema exacto v1. Ante un documento legacy, `hydrateGroup` falla y el servicio actual lo traduce a `DEPENDENCY_UNAVAILABLE`; la UI ofrece reintento. Aunque falla cerrado y no interpreta arrays, no es un destino estable para una URL legacy porque presenta un error transitorio y fomenta retries.

La decisión es no propagar ningún ID legacy al detalle canónico. Las rutas:

```text
/admin/groups/{groupId}
/admin/groups/{groupId}/members/{memberId}
/profile/groups/{groupId}
/profile/groups
```

redirigen server-side a:

```text
/dashboard/groups?notice=legacy-group-capability-retired
```

El listado canónico mostrará un aviso accesible fijo, con `role="status"`, equivalente a “La vista anterior ya no está disponible. Usá los Grupos y Membresías vigentes.” El mensaje no repetirá IDs ni afirmará existencia, pertenencia, ownership o tipo del documento. La decisión se toma sólo por la ruta legacy, sin leer `groups`, `users`, arrays ni rol global.

Propiedades obligatorias:

- una única redirección; `/dashboard/groups` nunca vuelve a una ruta legacy;
- query desconocida o aviso desconocido se ignora de forma segura;
- el destino lista únicamente Grupos canónicos propios por su contrato existente;
- un no-Owner puede ver lista vacía y el mismo aviso, sin exposición;
- no existe consola legacy, carga infinita, retry del ID, loop ni reinterpretación de arrays;
- `/dashboard/groups/{groupId}` continúa reservado a IDs v1 conocidos por el flujo canónico y no se usa como destino del retiro.
- la redirección de `/profile/groups/{groupId}` corresponde a esa página exacta y no captura la ruta E4 conservada `/profile/groups/{groupId}/matches/{matchId}`.

### 6.8 Catálogo público y compatibilidad E4

E2-06 exige Grupo canónico schema v1 activo, acceso por enlace compartido o `groupId` opaco conocido y prohíbe búsqueda, directorio o enumeración de Grupos. El catálogo actual no es una fuente válida de IDs para ese flujo. Un Grupo legacy no puede crear una Solicitud canónica porque la capacidad de E2-06 valida schema v1 exacto.

Por lo tanto, `/groups` no se convierte en descubrimiento canónico ni enlaza a `/join/groups/{id}`:

- población: sólo documentos legacy (`schemaVersion` ausente o distinto de 1), `visibility == "public"` y `activo == true`;
- propósito: compatibilidad pública E4 para consultar Partidos públicos asociados a Grupos históricos;
- exclusión: todo Grupo schema v1, privado o inactivo;
- orden: el vigente de la proyección, sin promesa nueva de enumeración canónica;
- DTO de lista exacto: `id`, `name`, `description`, `visibility`, `active`, `totalMatches`;
- DTO de detalle exacto: `group { id, name, description, visibility, active }` y `matches[] { id, title, visibility, startsAt, status }` sólo para Partidos públicos;
- quedan prohibidos `ownerId`, Usuario, emails, arrays, integrantes, admins, solicitudes, conteos derivados, `membershipStatus`, `joinApproval`, capacidades y permisos;
- enlace permitido: sólo `/groups/{groupId}` y, desde allí, Partidos públicos E4;
- enlace prohibido: `/join/groups/{groupId}`, dashboard, perfiles o administración;
- `GET /groups/{v1Id}/public`: `404 {"error":"Grupo no encontrado"}` genérico;
- no existe otra superficie canónica de descubrimiento en E2; crearla queda fuera de E2-13.

### 6.9 Lectura cliente legacy: exposición aceptada y retiro E4

Firestore Rules no proyecta campos: todo `get` o `list` permitido entrega el documento legacy completo, incluidos arrays y otros campos presentes. “Read-only” describe ausencia de escritura, no minimización de datos. E2-13 no afirmará que Rules entrega sólo campos permitidos.

Después de retirar las páginas organizativas, los únicos consumidores frontend directos imprescindibles son:

| Consumidor | Operación | Regla necesaria | Datos técnicamente visibles | Uso permitido |
|---|---|---|---|---|
| `services/tournaments/tournamentQueries.ts:getUserManagedGroups` | query `adminIds array-contains uid` | `groups allow list` por `adminIds` | documento legacy completo devuelto por la query | selección/inscripción de Torneo E4 |
| `tournamentQueries.ts:getUserTournamentGroupIds` | queries por `memberIds` y `adminIds` | `allow list` por cada array | documento legacy completo | asociación de entradas de Torneo E4 |
| `tournamentQueries.ts:getGroupById`, consumido por `TournamentEntryDetail` | `get` por ID | `allow get` por global admin o relación embebida | documento legacy completo | detalle de inscripción/equipo E4 |
| `profile/groups/[groupId]/matches/[matchId]/page.tsx` | listener/get del Grupo del Partido | `allow get` por global admin o relación embebida | documento legacy completo | controles de Partido E4 |

No hay BFF en esas lecturas. Los GET públicos sí usan backend/BFF sanitizado y no justifican Rules cliente. Mover los cuatro consumidores a proyecciones backend implicaría adaptación E4 y queda fuera de E2-13; por ello se conserva temporalmente la exposición completa como deuda de privacidad/encapsulación aceptada, con retiro lógico obligatorio en Etapa 4.

Reglas exactas conservadas:

- `allow get` únicamente si `resource.schemaVersion != 1` y `isAppAdmin()` o `isGroupMemberByData(resource.data)`;
- `allow list` únicamente para queries demostrables `memberIds array-contains request.auth.uid` o `adminIds array-contains request.auth.uid`;
- ningún get/list de schema v1;
- ningún create/update/delete;
- ninguna cláusula nueva, ningún campo adicional y ninguna lectura por simple autenticación.

Esta lectura de compatibilidad no constituye presentación organizativa aprobada, no concede autoridad canónica, no permite escribir y no convierte arrays en fuente de verdad. Una prueba de arquitectura mantiene la allowlist por archivo/símbolo; una prueba Rules mantiene exactamente los predicados anteriores. Cualquier consumidor directo adicional bloquea el cierre.

### 6.10 Alertas históricas

Los tipos históricos filtrados se enumeran de forma cerrada:

- `kind == "group_join_requests_pending"`;
- `kind == "group_admin_requests_pending"`;
- `kind == "group_membership_result"` sólo con `meta.decision` exactamente `accepted`, `rejected` o `removed`.

El backend deja de producir esas combinaciones al retirar trigger, backfill, handlers y `createGroupRemovalAlert`, pero no lee, resuelve, actualiza ni borra documentos existentes. El frontend renombra el predicado a un nombre específico, por ejemplo `isRetiredLegacyGroupAuthorityAlert`, y lo aplica al materializar el dashboard y todo panel de alertas que sobreviva. El filtro es de presentación, no de persistencia.

Tipos desconocidos o ausentes no se coercionan a `group_membership_result` ni `group_join_requests_pending` y no se filtran por este predicado; el normalizador debe conservar una categoría desconocida segura para presentación genérica. Tampoco se filtran `group_accepted_in_tournament`, `group_rejected_from_tournament`, `group_tournament_team_missing_players`, `group_tournament_team_payment_pending` ni los tipos `tournament_*`. Los push/eventos de Partido se conservan. E2-06/E2-07 no producen `pendingAlerts` canónicas; una futura alerta de Solicitud deberá usar un `kind` nuevo y explícito, nunca reutilizar estos identificadores legacy. El filtro no consulta ni oculta documentos `groupJoinRequests`.

## 7. Inventario técnico exhaustivo y disposición

La clasificación distingue arrays de Grupo de campos homónimos de Torneo. `tournaments.adminIds`, `playerIds` y estructuras de fase no son autoridad de Grupo y no se eliminan en E2-13.

### 7.1 Firestore Rules

| Archivo y símbolo | Superficie / modo | Alcanzabilidad y tipo admitido | Autoridad y descendentes | Decisión |
|---|---|---|---|---|
| `volley-ranking-system/firestore.rules` `isAppAdmin` | lectura de `users.roles` | alcanzable por Rules | rol global; users, groups, Partido, Torneo | adaptar: no podrá participar en create/update de Grupo; lecturas E4 ajenas se inventarían sin ampliarlas |
| mismo archivo `isGroupMemberByData` | lectura | legacy y sin versión; excluye v1 | `memberIds`, `adminIds`, `ownerId`; Matches/Teams | conservar read-only hasta E4 |
| mismo archivo `isGroupAdminByData` / `isGroupAdminById` / `isMatchGroupAdmin` | lectura usada como autorización de recursos deportivos | legacy; excluye v1 | `adminIds`/`ownerId`; Partido, participación, estadísticas y Torneo | conservar hasta E4, prohibido usar para mutar `groups` o capacidades E2 |
| mismo archivo `isGroupAdmin` / `isExistingGroupAdmin` | autorización de escritura | create/update legacy | `request.resource.adminIds`, global admin | eliminar como código muerto después de cerrar writes |
| `match /groups/{groupId}` `allow create` | escritura cliente | legacy o sin versión | `users.roles` + `adminIds` | retirar: `allow create: if false` |
| mismo match `allow update` | escritura cliente | legacy o sin versión | `users.roles` + `adminIds` existente | retirar: `allow update: if false` |
| mismo match `allow delete` | escritura cliente | todos | ya deny-all | conservar deny-all |
| mismo match `allow get` | lectura cliente completa | legacy; v1 queda fuera | documento completo por global admin o relación embebida | conservar exactamente para `getGroupById`/`TournamentEntryDetail` y detalle de Partido E4; exposición completa aceptada hasta Etapa 4 |
| mismo match `allow list` | lectura cliente completa | sólo queries legacy `array-contains` | documento completo por `memberIds` o `adminIds` | conservar para tres query sites dentro de `getUserManagedGroups` y `getUserTournamentGroupIds`; sin listado libre ni schema v1; retiro en Etapa 4 |
| `tournamentRegistrations` / `tournamentTeams` update | escritura E4 sobre recursos de Torneo | Grupo legacy como contexto | `groups.adminIds` para actualizar plantel/pago del Torneo | fuera de la mutación organizativa de E2-13; conservar como deuda E4 explícita y probar que nunca escribe `groups` |

Resultado obligatorio: no debe existir excepción por campos afectados, rol, owner, array, schema ausente ni schema distinto de 1 que permita create/update/delete cliente de `groups`.

### 7.2 HTTP API y servicios backend legacy

| Archivo y símbolo | Superficie | R/W y alcance | Tipo / autoridad | Consumidores | Decisión |
|---|---|---|---|---|---|
| `functions/src/httpApi.js` `getAuthContext` | HTTP compartido | hoy verifica token y lee `users.roles` antes de todo dispatch | GET públicos, writers retirados y push subscribe | reemplazar por obtención de UID sin lectura de Usuario, invocada sólo dentro de `POST /push/subscribe`; ningún consumidor restante necesita roles |
| mismo archivo dispatcher CORS/OPTIONS/tombstones | HTTP compartido | control de precedencia | todas las rutas | aplicar orden de 6.2; tombstones antes de identidad; match exacto sin interceptar GET públicos/push/deporte |
| mismo archivo `buildGroupPayload`, `handleListPublicGroups` | `GET /groups/public` | lectura Admin SDK sin Auth | legacy público activo | `/groups` y descubrimiento de Partidos E4 | adaptar al DTO exacto de 6.8; excluir siempre v1; eliminar enlace de join y toda derivación de arrays |
| mismo archivo `getGroupVisibleToAuthContext`, `handleGroupDetail` | `GET /groups/{id}/public` | hoy usa arrays/rol | `/groups/[groupId]`, lista de Partidos E4 | reemplazar por lookup público sin contexto Auth: sólo legacy publicado/activo + partidos públicos; v1/privado/inactivo/inexistente convergen en `404` |
| mismo archivo `mapUsersByIds`, `sortMembersByName`, `getGroupAdminIds`, `canManageGroup`, `canManageGroupAsOwner` | helpers de detalle/writers | lectura | arrays, owner legacy | handlers legacy | eliminar si quedan sin consumidor; no reutilizar para contratos canónicos |
| mismo archivo `handleGroupMemberAdd` | alta administrativa | escribe `memberIds` y limpia `pendingRequestIds` | legacy; admins/owner | BFF, dos páginas, pruebas | retirar writer y reemplazar dispatch por tombstone `410` |
| mismo archivo `handleGroupMemberRemoval` | baja administrativa | escribe `memberIds`, alerta y evento | legacy; admins/owner | BFF, dos páginas | retirar writer y tombstone `410` |
| mismo archivo `handleGroupMemberSearch` | búsqueda auxiliar | lectura de Grupo/users | legacy; admins/owner | alta administrativa | retirar por ser exclusivo de un writer retirado; tombstone `410` |
| mismo archivo `handleAdminApplication` | solicitud administrativa | escribe `pendingAdminRequestIds` | legacy; global admin + member | BFF y UI pública | retirar writer y tombstone `410` |
| mismo archivo `handleAdminRequestAction` | aprobar/rechazar | escribe `admins`, `adminIds`, `ownerId`, `pendingAdminRequestIds` | legacy; owner | BFF y dos páginas | retirar writer y tombstone `410` |
| mismo archivo `handleAdminAdd` | alta admin directa | escribe `admins`, `adminIds`, `ownerId`, `pendingAdminRequestIds` | legacy; owner | BFF/UI | retirar writer y tombstone `410` |
| mismo archivo `handleAdminRemoval` | baja admin | escribe `admins`, `adminIds`, `ownerId`, `pendingAdminRequestIds` | legacy; owner | BFF/UI | retirar writer y tombstone `410` |
| `services/adminGroupService.js` `actualizarGrupo` | callable legacy | escribe nombre/descripción/activo/visibility/joinApproval | legacy; guard schema | `editGroup`, `toggleGroupActivo` | eliminar al quedar sin consumidores |
| `services/groupAdminsService.js` `assertLegacyGroup`, `normalizeGroupAdmins`, `isGroup*` | backend deportivo | lectura | arrays/owner legacy | `adminAccessService`, `joinMatch`, E4 | conservar read-only hasta E4; no podrá ser importado por tombstones ni writers de Grupo |
| `services/adminAccessService.js` `assertIsAdmin`, `assertGroupAdmin`, `assertGroupOwner` | Partido/Torneo y callables legacy | lectura | rol global + arrays | createMatch, match admin, registration; seis callables | retirar imports de los seis callables; conservar sólo para E4, sin autoridad sobre Organización |
| `functions/package.json` scripts `migrate:group-admins*` | comando local | apunta a archivo inexistente | migración legacy | ninguno | eliminar como configuración muerta; no recrear script |

Grafo HTTP final obligatorio:

| Ruta conservada | Identidad necesaria | Rol necesario | Lecturas |
|---|---|---|---|
| `GET /groups/public` | ninguna | ninguno | query Admin SDK de Grupos legacy públicos + conteo de Partidos públicos |
| `GET /groups/{id}/public` | ninguna | ninguno | Grupo legacy público/activo + Partidos públicos; nunca users |
| `GET /push/vapid-public-key` | ninguna | ninguno | configuración de push |
| `POST /push/subscribe` | UID desde token válido | ninguno | Auth token, `push_subscriptions`; nunca users/groups |
| ocho tombstones | ninguna | ninguno | cero |
| ruta/método desconocido | ninguna | ninguno | cero |

No queda consumidor de `isSystemAdmin` en `httpApi.js`. Los roles globales que continúan en callables/Rules deportivos están fuera de este grafo y permanecen acotados a deuda E4, sin ampliación.

### 7.3 Callables

| Archivo / export | Escritura actual | Alcanzabilidad | Decisión |
|---|---|---|---|
| `callables/addGroupAdmin.js` / `index.js:addGroupAdmin` | `admins`, `adminIds`, `ownerId` | pública por nombre; sin consumidor frontend hallado | tombstone exportado estable |
| `callables/removeGroupAdmin.js` / `removeGroupAdmin` | `admins`, `adminIds`, `ownerId` | pública por nombre; sin consumidor frontend hallado | tombstone exportado estable |
| `callables/reorderGroupAdmins.js` / `reorderGroupAdmins` | `admins`, `adminIds`, `ownerId` y transferencia implícita | pública por nombre; sin consumidor frontend hallado | tombstone exportado estable |
| `callables/transferGroupOwnership.js` / `transferGroupOwnership` | `admins`, `adminIds`, `ownerId` | pública por nombre; sin consumidor frontend hallado | tombstone exportado estable; no reemplazar por transferencia canónica |
| `callables/editGroup.js` / `editGroup` | campos propios del Grupo legacy | consumido por `/admin/groups/[groupId]` | tombstone exportado estable; UI redirigida |
| `callables/toggleGroupActivo.js` / `toggleGroupActivo` | `activo` legacy | consumido por `/admin/groups/[groupId]` | tombstone exportado estable; no equivale a archivado canónico |
| `callables/createMatch.js` | escribe Partido; sólo lee Grupo y `memberIds` | E4 alcanzable | fuera de writes de Organización; conservar hasta E4 y probar cero update a `groups` |
| `callables/eliminarMatch.js` | elimina Partido; lee `memberIds` para evento | E4 alcanzable | conservar read-only respecto de Grupo hasta E4 |
| `callables/joinMatch.js` y callables de administración de Partido | escriben recursos de Partido/participación; leen rol/arrays | E4 alcanzables | fuera de adaptación completa; deuda E4, nunca fuente canónica ni writer de Grupo |
| callables y servicios de Torneo | escriben Torneo; algunos leen rol/arrays de Grupo | E4 alcanzables | fuera de adaptación completa; distinguir `tournaments.adminIds` de `groups.adminIds` |

### 7.4 BFF

Los ocho archivos siguientes son exclusivos del contrato retirado y deben eliminarse:

| Archivo | Upstream | Decisión |
|---|---|---|
| `frontend/src/app/api/groups/[groupId]/members/[userId]/add/route.ts` | alta member | eliminar |
| `.../members/[userId]/remove/route.ts` | baja member | eliminar |
| `.../members/search/route.ts` | búsqueda para alta | eliminar |
| `.../admin-request/route.ts` | crear/cancelar solicitud admin | eliminar |
| `.../admin-requests/[userId]/approve/route.ts` | aprobar | eliminar |
| `.../admin-requests/[userId]/reject/route.ts` | rechazar | eliminar |
| `.../admins/[userId]/add/route.ts` | alta admin | eliminar |
| `.../admins/[userId]/remove/route.ts` | baja admin | eliminar |

Se conservan y adaptan `api/groups/public/route.ts` y `api/groups/[groupId]/public/route.ts` porque son BFF GET para la proyección pública E4. No deben aceptar métodos de mutación ni propagar arrays.

### 7.5 Frontend organizativo y navegación

| Archivo / ruta | Estado actual | Alcanzabilidad | Decisión vinculante |
|---|---|---|---|
| `app/(public)/groups/page.tsx` `/groups` | lista pública con `membersCount`/`membershipStatus` derivados | sidebar/navbar | adaptar como catálogo de compatibilidad E4 según 6.8; retirar conteos/estado/inferencia y eliminar todo enlace al join canónico |
| `app/(public)/groups/[groupId]/page.tsx` | presenta members/admins/requests y ocho controles | pública y enlazada | adaptar a Grupo + Partidos públicos read-only; retirar listener Firestore, arrays, usuarios, permisos, redirección por arrays, formularios y botones |
| `app/(admin)/admin/groups/page.tsx` | ya redirige a `/dashboard/groups` | enlaces legacy | conservar redirección |
| `app/(admin)/admin/groups/new/page.tsx` | ya redirige a `/dashboard/groups/new` | enlaces legacy | conservar redirección |
| `app/(admin)/admin/groups/[groupId]/page.tsx` | consola completa legacy | ruta directa, alertas y dashboard | reemplazar por redirección server-side sin ID a `/dashboard/groups?notice=legacy-group-capability-retired`; eliminar componente writer/lector |
| `app/(admin)/admin/groups/[groupId]/members/[memberId]/page.tsx` | autoriza por rol/`adminIds` y presenta Usuario | ruta desde consola | misma redirección sin IDs y aviso neutro; no existe perfil administrativo canónico |
| `app/(protected)/profile/groups/page.tsx` | lista por `memberIds`/`adminIds`, presenta integrantes | Navbar/sidebar | redirigir a `/dashboard/groups?notice=legacy-group-capability-retired` |
| `app/(protected)/profile/groups/[groupId]/page.tsx` | detalle y roster por arrays | ruta desde lista | misma redirección sin ID; no invocar `getOwnGroup` ni inventar detalle member-scoped canónico |
| `components/layout/Navbar.tsx` | expone `/profile/groups` y `/admin/groups` por rol global | global | retirar enlaces legacy; incorporar/enlazar `/dashboard/groups` sin condicionar por `users.roles`; conservar Torneos como deuda E4 |
| `components/layout/AppSidebar.tsx` | contiene canónico y dos enlaces legacy | global | conservar `/dashboard/groups` y `/groups`; retirar `/profile/groups` y `/admin/groups`; no usar rol global para Organización |
| `app/(protected)/dashboard/page.tsx` + `CreateMatchQuickActionModal` | consulta `groups.adminIds`, muestra grupos “admin” y abre rutas legacy | alcanzable | retirar estado/query/modal organizativo basado en arrays; la creación de Grupo permanece canónica; crear Partido queda sin acceso rápido hasta E4 si no hay otra superficie válida |
| `app/(protected)/dashboard/groups/page.tsx` | listado canónico propio | destino estable | aceptar únicamente el aviso fijo de 6.7 y mostrarlo accesiblemente; no consultar ID, arrays ni rol por la query |
| `app/(admin)/admin/groups/[groupId]/matches/new/page.tsx` | crea Partido con backend E4 | URL directa | conservar como deuda E4; no escribe Grupo ni muestra arrays; ausencia de enlace nuevo es aceptada |
| `app/(protected)/profile/groups/[groupId]/matches/[matchId]/page.tsx` | lee `adminIds/admins` y rol para controles de Partido | E4 | conservar hasta E4, read-only respecto de Organización; no reutilizar como administración de Grupo |
| `app/(public)/groups/[groupId]/matches/[matchId]/page.tsx` y `MatchCard` | navegación de Partido | E4 | conservar |

La desaparición de edición, toggle, alta/baja de integrantes, administración delegada y transferencia no constituye regresión de un flujo canónico: esas capacidades aún no fueron definidas o pertenecen a incrementos futuros.

### 7.6 Servicios y consumidores E4

| Archivo y símbolo | Consumo | R/W respecto de Organización | Descendentes | Decisión |
|---|---|---|---|---|
| `services/tournaments/tournamentQueries.ts` `getUserManagedGroups` | query directa `groups.adminIds` | lectura completa del documento | registro, ayuda, perfil de Torneo | conservar compatibilidad hasta E4; no describir como proyección de campos |
| mismo archivo `getGroupById` | get directo de Grupo y arrays | lectura completa del documento | `TournamentEntryDetail` | conservar y marcar E4; DTO no debe alimentar UI organizativa |
| mismo archivo `getUserTournamentGroupIds` | queries directas `memberIds`/`adminIds` | lectura completa del documento | perfil de Torneo | conservar hasta E4 |
| mismo archivo `getProfileTournamentEntries(..., role)` y `searchAdminsByName` | rol global / grupos gestionados | lectura | Torneos | fuera de autoridad de Grupo; deuda E4 |
| `RegisterTournamentModal.tsx` | cuenta `memberIds` y selecciona `adminIds` | lectura; luego escribe inscripción | Torneo | conservar E4; prueba de que no modifica Grupo |
| `TournamentRegistrationHelpModal.tsx` | rol global + `memberIds` | lectura | elegibilidad informativa | conservar E4; no presentar esto como membresía canónica |
| `TournamentEntryDetail.tsx` | `memberIds`/`adminIds` | lectura; actualiza equipo/inscripción | Torneo | conservar E4, read-only respecto de Grupo |
| `services/tournamentRegistrationService.js` | `assertGroupAdmin`, cantidad de `memberIds` | lectura; escribe inscripción/equipo | Torneo | conservar E4; sin update/create de Grupo |
| `createMatch.js`, `eliminarMatch.js` | `memberIds` para destinatarios | lectura | notificaciones de Partido | conservar E4 |
| `notificationHandler.js` MATCH_CREATED/MATCH_DELETED | payload `memberIds` | lectura indirecta | push de Partido | conservar E4 |
| `notificationHandler.js` GROUP_ACCEPTED_INTO_TOURNAMENT | `adminIds/admins/ownerId` | lectura | push de Torneo | conservar E4 |
| `pendingAlertsService.js` y `tournamentPendingAlertsService.js` | admins legacy para destinatarios de Torneo | lectura | alertas E4 | conservar E4; no usar en Organización canónica |
| `onMatchDeadline.js` | `admins/adminIds/ownerId` para email | lectura | alerta de Partido | conservar E4 |
| `firestore.rules` lecturas/updates de recursos E4 | arrays de Grupo como contexto temporal | lectura del Grupo; escritura fuera de Grupo | Partido/Torneo | conservar estrictamente acotado y cubierto por no-escritura |

Estos lectores llevan una allowlist de arquitectura. Toda aparición productiva adicional de los arrays al cerrar E2-13 es un fallo, salvo fixtures, pruebas negativas o tipos de datos de Torneo claramente diferenciados. Las lecturas Firestore cliente entregan documentos completos según 6.9; “read-only respecto de Organización” significa exclusivamente que no ejecutan create/update/delete de `groups`.

### 7.7 Alertas, notificaciones y mantenimiento

| Archivo / símbolo | Estado | Decisión |
|---|---|---|
| `triggers/onGroupPendingAlertsSync.js` `syncAdminRequestsAlerts` y helpers de `pendingAdminRequestIds` | produce autoridad visible legacy | eliminar sólo esa rama; conservar sincronizaciones de Torneo E4 y el export compartido |
| `scripts/backfillPendingAlerts.js` `backfillGroupAlerts` | puede recrear alertas administrativas | eliminar esa rama; conservar backfill de Torneo si sigue requerido |
| `types/pendingAlerts.ts` tipos exactos de 6.10 e `isRetiredLegacyGroupJoinAlert` | históricos todavía visibles | conservar tipos para deserializar y renombrar a `isRetiredLegacyGroupAuthorityAlert`; predicado cerrado, sin comodines |
| `dashboard/page.tsx` y cualquier panel de alertas sobreviviente | presenta históricos | aplicar sólo el predicado de 6.10 al materializar; ninguna escritura por lectura |
| `notificationHandler.js` handlers `GROUP_USER_ADDED`, `GROUP_USER_REMOVED`, `GROUP_ADMIN_ADDED` | productores retirados | eliminar handlers y, si no quedan emisores, sus constantes de `domainEvents.js` como código muerto |
| `pendingAlertsService.js` `createGroupRemovalAlert` | exclusivo de baja HTTP retirada | eliminar si el barrido confirma cero consumidores |
| alertas/notificaciones de Partido y Torneo que leen arrays | E4 | conservar según sección 7.6 |

### 7.8 Documentación operativa y falsos positivos

| Elemento | Clasificación | Decisión |
|---|---|---|
| `README.md` modelo de Grupo con arrays e instrucciones de administración | presentación vigente incorrecta | adaptar durante implementación para no documentar writers retirados; no modificar Documentos 1–5 |
| `frontend/docs/tournaments/type-domain-migration-events.md` y `types/tournaments/**` | `adminIds` de Torneo | fuera de alcance; no confundir con Grupo |
| `services/tournamentService.js` y callables de admin de Torneo | `tournaments.adminIds` | fuera de alcance de autoridad de Grupo y adaptación completa E4 |
| fixtures y pruebas con arrays | evidencia sintética | conservar cuando prueben lectura E4/denegación; retirar expectativas de writers activos |
| archivo raíz `derfgtyhj` | historial textual, no código | fuera de alcance; no modificar |

## 8. Tratamiento de pruebas existentes

Deben actualizarse, no borrarse sin reemplazo:

- `priorityAssetCharacterization.test.js`: la caracterización que hoy exige creación directa por global admin cambia a deny para admin y no admin; los fixtures posteriores se crean con Admin SDK.
- `legacyJoinRetirementE2.test.js`: deja de exigir alta/baja/admin requests operativas; pasa a verificar los ocho `410`, inmutabilidad y preservación física.
- `legacyJoinRetirementArchitecture.test.js`: invierte las expectativas que hoy obligan a conservar handlers, BFF, UI y alertas administrativas.
- `groupE2.test.js`: amplía Rules deny a create/update legacy y cambia `editGroup` de “rechaza schema v1” a tombstone uniforme para v1 y legacy.
- `minimumReadPolicy.test.js`: elimina del DTO público `membersCount` y `membershipStatus`; conserva prueba de sanitización y las lecturas E4 explícitas.
- `groupArchitecture.test.js`: deja de exigir guard de schema en el trigger administrativo retirado y agrega prohibiciones de exports writers reales, BFF y UI.
- `maintenanceRules.test.js`: conserva deny-all de mantenimiento sin convertir esa suite en sustituto de las Rules normales.
- pruebas canónicas E2-01 a E2-12: permanecen y deben aprobar sin relajar contratos.

Fixtures creadas por Admin SDK no prueban capacidad de cliente y no violan el retiro. Deben marcarse sintéticas y limpiarse como ya exige la infraestructura.

## 9. Frontera incluida

Queda incluido exclusivamente:

- deny-all cliente para create/update/delete de `groups`;
- neutralización HTTP de las ocho rutas enumeradas;
- eliminación de sus ocho BFF;
- tombstones de los seis callables;
- eliminación de handlers, helpers, servicio y scripts legacy sin consumidores;
- adaptación de los dos GET públicos a catálogo legacy E4 con DTO exacto, sin autoridad embebida ni enlace al join canónico;
- redirección sin IDs al listado canónico con aviso neutro, y retiro de páginas, enlaces, formularios y controles organizativos legacy;
- retiro de productores y presentación de alertas administrativas legacy;
- inventario y allowlist E4 de lecturas temporales, incluida la exposición completa inevitable por Rules;
- actualización de pruebas y README operativo afectado;
- barrido final de writers y regresión de todos los flujos canónicos E2.

## 10. Frontera excluida

E2-13 no implementa ni anticipa:

- transferencia canónica de ownership;
- edición canónica general de Grupo;
- archivado, toggle o eliminación canónica;
- administración delegada canónica;
- una Solicitud canónica para obtener administración;
- migración, backfill, reparación o eliminación de documentos/arrays legacy;
- conversión automática a schema v1;
- adaptación completa de Torneos, fixture, elegibilidad o Partidos;
- modelo de elegibilidad E4;
- reemplazo de todos los roles globales en operaciones deportivas E4;
- Pago;
- cierre, reapertura o edición de Temporada;
- CU-029;
- notificaciones o Actividad canónicas;
- Plan o Suscripción;
- deploy o acceso a Firebase remoto;
- modificación o limpieza de Authentication/Auth UAT;
- inicio de E3;
- cierre consolidado de Etapa 2.

La falta temporal de reemplazo para editar, activar/desactivar, delegar administración o transferir ownership es explícita y aceptada: el camino canónico actual no necesita esas operaciones para crear Grupo, abrir Temporada, gestionar Membresías o decidir Solicitudes.

## 11. Secuencia de implementación exigida

1. Crear rama de implementación sólo después de aprobar esta ficha y repetir preflight.
2. Añadir primero pruebas contractuales/arquitectónicas que fallen por writers activos.
3. Cerrar Rules de `groups` y probar create/update legacy, sin versión y v1.
4. Reordenar el dispatcher HTTP con CORS → OPTIONS → rechazo CORS → tombstones → rutas conservadas → identidad push → 404, y probar precedencia antes de retirar handlers.
5. Introducir tombstones callable antes de retirar UI, reduciendo la ventana de carrera.
6. Eliminar BFF, controles, listeners y navegación organizativa legacy; añadir redirección sin IDs y aviso neutro.
7. Adaptar proyecciones públicas al catálogo legacy E4 sin join y retirar productores/presentación exacta de alertas legacy.
8. Congelar la allowlist de cuatro consumidores frontend directos y las Rules exactas de 6.9.
9. Eliminar código muerto sólo después de confirmar consumidores con búsqueda e imports.
10. Ejecutar suite focal, suite completa y controles de calidad.
11. Realizar barrido final y UAT sólo sobre superficies recorribles.

No se debe desplegar E2-13 desde el trabajo de implementación autorizado por esta ficha.

## 12. Riesgos, carreras y respuesta requerida

| Riesgo / carrera | Respuesta |
|---|---|
| Request HTTP legacy en vuelo durante el retiro | La transacción iniciada antes de un eventual deploy no puede resolverse localmente; no diseñar rollback destructivo. Después del corte, toda nueva llamada recibe `410`. Verificar estado antes de cualquier despliegue futuro. |
| CORS o `OPTIONS` queda detrás del tombstone | El orden normativo de 6.2 es contractual; preflight válido obtiene `204`, origen rechazado obtiene `403` y ninguno autentica. |
| Matcher demasiado amplio | Regex anclada por método/path y casos negativos para GET públicos, push, deporte, slash y segmentos extra. |
| Payload inválido/excesivo | Si alcanza la Function se ignora y recibe `410`; un rechazo previo `400/413` de plataforma sigue sin efectos ni lecturas de aplicación. |
| Doble clic o retry contra endpoint neutralizado | Respuesta idéntica `410`, sin lectura ni escritura. |
| Cliente antiguo llama callable | Tombstone exportado devuelve `failed-precondition/LEGACY_GROUP_CAPABILITY_RETIRED`; no `not-found` ambiguo. |
| Caché frontend conserva controles | Backend y Rules bloquean; BFF nueva ya no existe y HTTP directo responde `410`. |
| Writer Admin SDK olvidado | Barrido AST/textual y allowlist E4; cualquier create/update de `groups` fuera del repositorio canónico es bloqueo de cierre. |
| Rule admite un subconjunto de campos | `allow create, update, delete: if false` evita excepciones por diff o schema. |
| Consumidor E4 mezcla lectura con autoridad | Tests de arquitectura exigen no importar módulos E2 ni escribir `groups`; se documenta como deuda E4. |
| Cliente E4 autorizado recibe arrays completos por Rules | Exposición aceptada y explícita hasta Etapa 4; allowlist cerrada, schema v1 excluido y writes deny-all. No afirmar minimización por campos. |
| Grupo legacy existente | Sigue legible sólo por las proyecciones/consumidores permitidos e inmutable desde superficies retiradas. |
| Grupo canónico v1 | Sigue backend-only; las rutas E2 y DTOs canónicos no cambian. |
| URL legacy redirige a detalle v1 con ID incompatible | Prohibido: todas las rutas legacy de 6.7 descartan IDs y van una sola vez al listado canónico con aviso neutro. |
| Catálogo legacy enlaza a join canónico | Prohibido: E2-06 acepta sólo v1 por ID opaco conocido; el catálogo E4 no muestra enlace de ingreso. |
| Documento sin `schemaVersion` | Se trata como legacy histórico e inmutable. No obtiene excepción de escritura. |
| Identidad con rol global | No crea/actualiza Grupo ni ejecuta writer organizativo. |
| Owner canónico sin rol global | Continúa usando todas las capacidades E2 existentes. |
| Arrays corruptos/incompletos | Lectores E4 normalizan defensivamente; no reparan ni escriben. UI organizativa no los presenta. |
| `pendingAdminRequestIds` existente | Permanece sin mutación; no genera controles ni alertas nuevas. El filtro exacto no borra ni resuelve históricos. |
| Reintroducción accidental por helper conservado | Allowlist y prueba de grafo: `groupAdminsService` sólo puede llegar a E4, nunca a HTTP/tombstones/capacidades E2. |

## 13. Criterios de aceptación Dado/Cuando/Entonces

1. **Dado** cualquier cliente, incluso global admin, **cuando** intenta crear un Grupo legacy o sin `schemaVersion`, **entonces** Rules deniega y no existe documento nuevo.
2. **Dado** un Grupo legacy, **cuando** un cliente intenta actualizar `memberIds`, **entonces** Rules deniega y el documento queda idéntico.
3. **Dado** un Grupo legacy, **cuando** un cliente intenta actualizar `adminIds`, **entonces** Rules deniega y el documento queda idéntico.
4. **Dado** un Grupo legacy, **cuando** un cliente intenta actualizar `admins`, **entonces** Rules deniega y el documento queda idéntico.
5. **Dado** un Grupo legacy, **cuando** un cliente intenta actualizar `pendingAdminRequestIds`, **entonces** Rules deniega y el documento queda idéntico.
6. **Dado** un usuario con `users.roles == "admin"`, **cuando** intenta una mutación organizativa directa, HTTP o callable, **entonces** no obtiene autoridad y no hay escritura.
7. **Dado** el endpoint HTTP de alta administrativa, **cuando** se invoca con cualquier identidad o Grupo, **entonces** responde el `410` estable sin lectura ni alta.
8. **Dado** el endpoint HTTP de baja administrativa, **cuando** se invoca o reintenta, **entonces** responde el `410` estable y no modifica arrays ni alertas.
9. **Dada** la ruta de solicitud administrativa legacy, **cuando** intenta crear o cancelar la solicitud, **entonces** responde `410` y no toca `pendingAdminRequestIds`.
10. **Dada** una solicitud administrativa histórica, **cuando** se intenta aprobar o rechazar, **entonces** responde `410` y conserva documento y arrays.
11. **Dado** cualquiera de los callables de administrador, **cuando** es invocado, **entonces** devuelve `LEGACY_GROUP_CAPABILITY_RETIRED` sin inspeccionar el Grupo.
12. **Dado** `transferGroupOwnership`, **cuando** se invoca contra Grupo legacy, v1 o inexistente, **entonces** devuelve el mismo rechazo y no cambia `ownerId`.
13. **Dado** `editGroup`, **cuando** se invoca, **entonces** devuelve el rechazo estable y no cambia ningún campo.
14. **Dado** `toggleGroupActivo`, **cuando** se invoca, **entonces** devuelve el rechazo estable y no cambia `activo` ni `estado`.
15. **Dada** una URL organizativa legacy con cualquier ID, **cuando** se abre, **entonces** descarta los IDs, redirige una vez a `/dashboard/groups?notice=legacy-group-capability-retired`, muestra aviso neutro y nunca carga la consola anterior.
16. **Dado** un Owner canónico, **cuando** recorre `/dashboard/groups/{groupId}`, **entonces** la consulta canónica de Grupo continúa funcionando.
17. **Dada** una Cuenta elegible, **cuando** ejecuta `createOwnGroup`, **entonces** la creación backend-only v1 continúa funcionando e idéntica.
18. **Dado** un Grupo v1, **cuando** abre/consulta Temporada por los contratos E2, **entonces** el flujo continúa funcionando sin arrays.
19. **Dadas** Persona, Grupo y Temporada válidos, **cuando** se crea o consulta Membresía canónica, **entonces** el flujo permanece intacto.
20. **Dado** el flujo canónico de ingreso, **cuando** crea, consulta, cancela, aprueba o rechaza una Solicitud según corresponda, **entonces** no usa rutas ni arrays legacy.
21. **Dado** un Owner, **cuando** consulta el roster canónico, **entonces** obtiene Membresías activas y no `memberIds`.
22. **Dada** una Membresía propia activa, **cuando** se ejecuta la salida propia, **entonces** se finaliza sólo la Membresía y no Grupo.
23. **Dado** un Owner y una Membresía ajena activa, **cuando** ejecuta la finalización administrativa, **entonces** el flujo E2-12 permanece operativo sin arrays.
24. **Dado** un consumidor de Torneo allowlisted, **cuando** consulta un Grupo legacy por Rules, **entonces** recibe técnicamente el documento completo, lo usa exclusivamente para su función E4 y no crea ni actualiza `groups`.
25. **Dado** un consumidor de Partido allowlisted, **cuando** consulta arrays legacy para elegibilidad/destinatarios, **entonces** no los convierte en autoridad E2 ni escribe `groups`.
26. **Dado** un Grupo legacy existente, **cuando** termina E2-13, **entonces** permanece sin migración ni conversión.
27. **Dados** arrays históricos, **cuando** se retiran las superficies, **entonces** sus valores permanecen byte/lógicamente sin modificación por E2-13.
28. **Dada** cualquier operación retirada o lectura conservada, **cuando** se ejecuta, **entonces** no crea Personas, Membresías, Solicitudes ni Temporadas.
29. **Dado** el incremento completo, **cuando** se comparan fixtures protegidas, **entonces** no se modifican pagos, partidos o torneos por E2-13.
30. **Dado** el código productivo final, **cuando** se ejecuta el barrido de escritores y grafo de consumidores, **entonces** no aparece ningún writer organizativo legacy alcanzable.

Escenarios adicionales obligatorios:

31. **Dado** un GET público, **cuando** serializa un Grupo legacy público/activo, **entonces** usa el DTO exacto de 6.8 y no incluye arrays, usuarios, ownership, conteo de integrantes ni permiso organizativo.
32. **Dada** una alerta histórica con una combinación exacta de 6.10, **cuando** carga el dashboard, **entonces** no se muestra y no se lee con intención de mutar, actualiza, resuelve ni borra.
33. **Dado** un cambio E4 que dispara alertas de Torneo, **cuando** se ejecuta el trigger adaptado, **entonces** conserva la proyección E4 sin recrear alertas administrativas.
34. **Dado** un Grupo v1 y un Grupo legacy, **cuando** un cliente intenta actualizar cualquier campo de ambos, **entonces** Rules deniega de igual forma.
35. **Dado** un preflight `OPTIONS` permitido sobre una ruta retirada, **cuando** llega, **entonces** responde `204` con CORS y no autentica, lee ni ejecuta tombstone.
36. **Dado** un origen no permitido, **cuando** llama una ruta retirada, **entonces** responde `403` antes del tombstone y no revela capacidad ni consulta datos.
37. **Dado** método/path retirado exacto con query string, **cuando** llega desde origen permitido, **entonces** responde `410`; con slash final u otro método responde `404` y nunca ejecuta writer.
38. **Dada** una ruta pública, push o deportiva conservada, **cuando** se evalúa el matcher, **entonces** no es interceptada por tombstones.
39. **Dado** payload vacío, inválido o grande aceptado por la plataforma, **cuando** llega a un método/path retirado exacto, **entonces** se ignora y responde `410`; un `400/413` previo de infraestructura tampoco produce efectos.
40. **Dado** `GET /groups/public`, **cuando** lista, **entonces** contiene sólo legacy público/activo, excluye v1 y no ofrece enlace de join.
41. **Dado** `GET /groups/{id}/public`, **cuando** el ID es v1, privado, inactivo o inexistente, **entonces** devuelve el mismo `404` genérico.
42. **Dado** un consumidor frontend directo E4, **cuando** lee por Rules, **entonces** pertenece a la allowlist exacta de 6.9; cualquier quinto consumidor falla arquitectura.
43. **Dado** un cliente autorizado por Rules legacy, **cuando** lee, **entonces** la prueba reconoce que recibe el documento completo, pero create/update/delete siguen denegados y schema v1 no se expone.
44. **Dada** una alerta desconocida o canónica futura con `kind` distinto, **cuando** se materializa el dashboard, **entonces** el predicado legacy no la filtra; las alertas de Partido/Torneo permanecen visibles según sus reglas.

## 14. Estrategia de pruebas

### 14.1 Unitarias

- tombstone HTTP: matcher, cuerpo, status y ausencia de callbacks/readers;
- dispatcher HTTP: orden CORS/OPTIONS/403/410/rutas/identidad/404;
- tombstones callable: mismo error para payloads e identidades distintas;
- DTO público: campos permitidos exactos y normalización segura;
- población de catálogo: legacy público/activo únicamente, v1 excluido y cero enlace de join;
- filtro cerrado de las combinaciones históricas de 6.10; tipos ausentes/desconocidos no coercionados y tipos E4 no filtrados;
- helpers E4 preservados, sin mutación.

### 14.2 Contractuales

- snapshot exacto del `410` en las ocho rutas;
- matriz contractual de 6.2: `OPTIONS`, CORS permitido/rechazado, query, slash final, método alternativo, ruta parecida, rutas conservadas y cuerpos aceptados;
- spies/fakes del dispatcher prueban cero invocaciones a verificación Auth, `users`, `groups`, handlers, eventos y notificaciones para preflight/tombstone;
- contrato exacto `failed-precondition` + `details.reason` en seis callables;
- ausencia física de las ocho BFF;
- redirecciones exactas sin IDs al listado canónico, query fija, aviso accesible y ausencia de loop;
- exports canónicos E2 intactos;
- export temporal de tombstones explícitamente allowlisted.

### 14.3 Arquitectura y mantenimiento

- ningún archivo productivo, salvo repositorio canónico E2, contiene create/set/update/delete sobre `groups`;
- el repositorio canónico sólo crea schema v1 con contrato exacto;
- HTTP y tombstones no importan servicios de autoridad legacy;
- páginas redirigidas no importan Firestore, Functions ni `users.roles`;
- arrays productivos restantes coinciden con la allowlist E4 por archivo y símbolo de 6.9/7.6;
- exactamente cuatro consumidores frontend directos de `groups`; no se permite un quinto;
- `httpApi.js` no contiene `isSystemAdmin`, lectura de `users` ni obtención de identidad fuera de push subscribe;
- catálogo público no contiene href/import/llamada hacia `/join/groups`;
- separar `groups.adminIds` de `tournaments.adminIds` para evitar falsos positivos;
- retirar scripts npm huérfanos;
- actualizar caracterizaciones que exigían writers, sin degradar controles E0/E1.

### 14.4 Firestore Rules y Emulator focal

Con Auth y Firestore Emulator locales:

- create de Grupo legacy por global admin: deny;
- create sin schema: deny;
- update de cada array y de un campo aparentemente inocuo: deny;
- update v1: deny;
- delete: deny;
- lecturas E4 allowlisted conservan su comportamiento mínimo;
- las lecturas E4 reciben documentos legacy completos sólo bajo los predicados exactos de 6.9, y v1 permanece denegado;
- rol global no altera el resultado de write;
- Owner canónico sin rol sigue operando por callables backend, no por Rules.

Con Functions Emulator local:

- las ocho rutas devuelven `410` para Grupo existente/inexistente, identidades distintas y retries;
- `OPTIONS` permitido devuelve `204`, origen rechazado devuelve `403`, y ambos dejan contadores instrumentados de Auth/users/groups/escrituras en cero;
- query string conserva `410`; slash final, otro método y rutas parecidas dan `404`; GET públicos y push conservan su despacho;
- cuerpos vacío/inválido/grande aceptado reciben `410`; el caso excedido por plataforma acepta `413` como infraestructura y verifica cero efectos;
- los seis callables rechazan establemente;
- los dos GET públicos devuelven DTO exacto, sólo legacy público/activo, excluyen v1 y no enlazan a join;
- triggers no producen alertas administrativas y una lectura frontend no actualiza, resuelve ni borra históricos;
- ninguna colección protegida cambia.

### 14.5 Regresión completa y calidad

Son obligatorios durante implementación, no durante esta definición:

1. unitarias focales;
2. contractuales;
3. arquitectura;
4. mantenimiento;
5. Firestore Rules;
6. Emulator focal E2-13;
7. Emulator Suite completa;
8. sintaxis Functions;
9. lint baseline;
10. typecheck;
11. build;
12. `git diff --check`;
13. barrido estático final de writers, exports, BFF, controles y arrays;
14. inspección del diff para confirmar cero cambios de datos, Auth y Firebase remoto.

No se acepta sustituir una prueba automatizable de endpoint retirado por UAT manual.

## 15. UAT manual y evidencia automatizada

La UAT se limita a superficies realmente recorribles:

| UAT | Recorrido | Resultado esperado |
|---|---|---|
| UAT-01 | sidebar/navbar → Mis Grupos | conduce a `/dashboard/groups`; no depende de rol global |
| UAT-02 | abrir URL `/admin/groups/{legacyId}` | una sola redirección a `/dashboard/groups?notice=legacy-group-capability-retired`; aviso neutro con `role="status"`, sin ID, retry, loop ni controles |
| UAT-03 | abrir `/admin/groups/{legacyId}/members/{memberId}` | mismo destino y aviso de UAT-02; no se consulta ni expone Grupo/Usuario y no aparece perfil |
| UAT-04 | abrir `/profile/groups` y `/profile/groups/{legacyId}` | ambas convergen una vez en el listado canónico con el mismo aviso; sólo aparecen Grupos v1 propios, o vacío |
| UAT-05 | recorrer `/groups` y `/groups/{legacyId}` público | catálogo legacy E4 y Partidos públicos con DTO mínimo; sin integrantes, admins, solicitudes, mutaciones ni enlace de ingreso |
| UAT-06 | Owner canónico recorre Grupo, Temporada, roster y solicitudes | flujos E2 continúan visibles y operativos |
| UAT-07 | global admin no Owner inspecciona navegación | no obtiene administración organizativa adicional |
| UAT-08 | dashboard con alertas históricas legacy | no muestra alertas retiradas; no las borra |

La evidencia automatizada, no UAT, cubre:

- Rules deny;
- HTTP `410`, CORS/preflight y precedencia del dispatcher;
- callable tombstones;
- inexistencia de BFF;
- ausencia de writers y controles;
- inmutabilidad de arrays/documentos;
- allowlist exacta de lecturas cliente completas y exclusión de v1;
- catálogo legacy sin conexión a Solicitud canónica;
- filtro exacto e inmutabilidad de alertas históricas;
- no creación de otras raíces;
- preservación de lectores E4 y flujos canónicos.

## 16. Criterio de cierre de implementación

E2-13 podrá declararse implementado sólo si:

- los treinta criterios mínimos y los catorce adicionales están cubiertos;
- ninguna Rules path permite create/update/delete cliente de `groups`;
- CORS y `OPTIONS` preceden a tombstones; los tombstones preceden a Auth y datos;
- ninguna HTTP API, BFF, callable o UI puede escribir autoridad organizativa legacy;
- todos los writers tienen decisión aplicada, no sólo guard de schema v1;
- `users.roles` no autoriza una mutación organizativa;
- las superficies públicas no presentan arrays como pertenencia/administración vigente;
- el catálogo incluye sólo legacy público/activo, excluye v1 y no enlaza al ingreso canónico;
- los documentos históricos permanecen sin migración ni limpieza;
- los lectores restantes coinciden exactamente con la allowlist E4, reconocen exposición documental completa y son read-only respecto de Organización;
- las suites canónicas E2-01 a E2-12 permanecen verdes;
- pruebas focales, completas y controles de calidad aprueban;
- el barrido final no encuentra writers alcanzables ni BFF/controles huérfanos;
- el informe de implementación documenta cualquier desviación y la revisión la resuelve antes del cierre;
- no hubo deploy, acceso remoto, cambio Auth/UAT ni inicio de E3.

## 17. Checklist documental de esta ficha

- [x] Único archivo autorizado creado: esta ficha.
- [x] Sin rama, commit, push, merge ni stash.
- [x] Sin cambios de código, Rules, configuración, Documento 5 o arquitectura.
- [x] Inventario de writers, lectores, UI, pruebas, Partido, Torneo, alertas y mantenimiento.
- [x] Decisión cerrada por writer y superficie.
- [x] Tratamiento de documentos legacy y frontera E4.
- [x] Contratos de rechazo estables.
- [x] Criterios Dado/Cuando/Entonces.
- [x] Estrategia de pruebas y UAT separadas.
- [x] Exclusiones y riesgos explícitos.
