# E2-11 — Informe de implementación

## 1. Resultado

E2-11 quedó implementado localmente conforme a la ficha aprobada `E2-11-ficha-consulta-integrantes-activos-owner.md`.

El incremento agrega la consulta canónica Owner-scoped de integrantes activos, la proyección mínima de Persona, un cursor propio, la sección informativa `Integrantes` y cobertura unitaria/Emulator. No agrega comandos, escrituras, migraciones, cleanup, acceso Firestore desde el cliente ni capacidades administrativas de roster.

Estado del incremento: **IMPLEMENTACIÓN Y UAT APROBADAS; CIERRE DOCUMENTAL EN PREPARACIÓN**.

## 2. Preflight verificado

Antes de editar se comprobó:

- rama actual: `feat/e2-11-owner-active-roster`;
- upstream: `origin/feat/e2-11-owner-active-roster`;
- HEAD, upstream y merge-base: `44bfc07535d890b9d2075f7f28bff049943f5964`;
- divergencia: `0/0`;
- `dev` y `origin/dev`: `44bfc07535d890b9d2075f7f28bff049943f5964`;
- working tree previo al desarrollo: limpio; en el preflight de cierre se inventariaron 15 archivos modificados, 10 nuevos y ninguno eliminado, todos sin stage; índice vacío;
- stashes: cero;
- Auth/UAT aislada en `chore/preserve-auth-emulator-uat-changes`, commit `fc7135e358902a17372d44f20df50883603520ce`, no ancestro del incremento.

No hay commits posteriores inesperados: HEAD, upstream, `dev`, `origin/dev` y merge-base siguen en el SHA indicado. Se leyó completa la ficha E2-11 y se contrastaron las implementaciones vigentes de ownership, Temporada abierta, listado self-person, finalización, Solicitudes Owner-scoped, Membresía v3/Períodos y salida voluntaria. La ficha, AUD-C05, Documento 5, arquitectura y cierres anteriores permanecen sin cambios. Auth/UAT sigue aislada; los dos `firestore-debug.log` preexistentes y el `firebase-debug.log` local están ignorados y fuera del índice.

## 3. Inventario exacto del incremento

### 3.1 Nuevos

- `volley-ranking-system/functions/callables/listActiveGroupMembersForOwnedGroup.js`: callable pública delgada.
- `volley-ranking-system/functions/src/groups/public/groupRosterContextCapability.js`: capacidad pública mínima de Grupo/Temporada para autorización y contexto abierto.
- `volley-ranking-system/functions/src/persons/public/activeGroupMemberPersonCapability.js`: capacidad pública mínima de Persona para referencia opcional del Owner y proyección nominal.
- `volley-ranking-system/functions/src/memberships/application/ownerGroupMembersCursor.js`: contrato de cursor E2-11 independiente.
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreActiveGroupMembersForOwnerReader.js`: reader transaccional de sólo lectura.
- `volley-ranking-system/functions/test/unit/membershipOwnerRoster.test.js`: contrato, cursor, DTO, errores, observabilidad y arquitectura.
- `volley-ranking-system/functions/test/emulator/membershipOwnerRosterE2.test.js`: autorización, integridad, paginación, privacidad, reglas y ausencia de efectos.
- `volley-ranking-frontend/src/types/ActiveGroupMember.ts`: contrato frontend del roster.
- `volley-ranking-frontend/src/components/memberships/ActiveGroupMembersSection.tsx`: sección visual informativa.
- `docs/implementacion/etapa-2/E2-11-informe-implementacion.md`: este informe.

### 3.2 Modificados

- `volley-ranking-system/functions/index.js`: exporta la callable.
- `volley-ranking-system/functions/src/memberships/application/membershipContract.js`: valida entrada cerrada, `pageSize` y cursor.
- `volley-ranking-system/functions/src/memberships/application/membershipDto.js`: compone el item público exacto.
- `volley-ranking-system/functions/src/memberships/application/membershipErrors.js`: agrega `GROUP_NOT_ACCESSIBLE` y `ROSTER_CONTEXT_CHANGED`.
- `volley-ranking-system/functions/src/memberships/application/membershipObservability.js`: incorpora operación y etapas allowlisted E2-11.
- `volley-ranking-system/functions/src/memberships/application/membershipService.js`: coordina Cuenta, cursor, reader y respuesta.
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipCallable.js`: handler, mapping HTTPS y observabilidad sanitizada.
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipModule.js`: cablea capacidades y reader.
- `volley-ranking-system/functions/test/run-emulator-tests.js`: incluye E2-11 en suite completa y modo focal `E2_11_FOCAL=1`.
- `volley-ranking-system/firestore.indexes.json`: agrega sólo el índice compuesto de la query confirmada.
- `volley-ranking-system/functions/test/unit/membershipArchitecture.test.js`: conserva los índices E2-03/E2-04 por contenido, sin congelar el total futuro.
- `volley-ranking-system/functions/test/unit/groupJoinRequestArchitecture.test.js`: conserva el índice E2-07 por contenido, sin congelar el total futuro.
- `volley-ranking-frontend/src/services/membershipsService.ts`: cliente callable-only y mensajes públicos.
- `volley-ranking-frontend/src/types/OwnMembership.ts`: amplía el catálogo común de reasons.
- `volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx`: monta `Integrantes` en el detalle Owner-scoped.

### 3.3 Eliminados

Ninguno.

No se modificaron `firestore.rules`, dependencias, lockfiles, Firebase config, código Auth/UAT ni endpoints/componentes legacy.

## 4. Correspondencia con la ficha y decisiones

### 4.1 Contrato y autorización

Se expone `listActiveGroupMembersForOwnedGroup({ groupId, pageSize?, cursor? })` como callable autenticada. El validador acepta sólo objeto plano cerrado, exige `groupId`, aplica default 20 y rango 1–20, valida cursor no vacío y acotado, y rechaza identidades, `seasonId`, roles, filtros, orden y rutas aportados por cliente.

El UID proviene exclusivamente de Auth. Cuenta y ownership vigente se releen en cada página dentro de una unidad de lectura consistente. Sólo `groups/{groupId}.ownerId` autoriza: roles globales, claims, arrays legacy y Membresía no participan. Grupo inexistente, ajeno e integrante no Owner convergen en `GROUP_NOT_ACCESSIBLE`. El cursor se valida como contexto de recorrido, nunca como credencial.

Owner sin Persona está autorizado. `isOwner` sólo es verdadero cuando la Persona opcional del Owner coincide con la Persona de una Membresía activa válida; ownership por sí solo no crea una fila.

### 4.2 Temporada y consistencia

Grupo, `openSeasonGuards/{groupId}` y hasta dos Temporadas abiertas se leen server-side. La matriz aplicada es:

- cero abiertas y guard ausente: `NO_OPEN_SEASON`, lista vacía y cursor nulo;
- una abierta y guard correlacionado: `OPEN_SEASON`;
- múltiples abiertas, guard huérfano/ausente/incompatible o documento inválido: `INCOMPATIBLE_STATE`.

El cliente no aporta `seasonId`. El cursor liga la Temporada resuelta; si ésta cambia entre páginas, la respuesta es `ROSTER_CONTEXT_CHANGED`.

### 4.3 Fuente de verdad e integridad

La query usa exclusivamente `memberships`. Recupera sólo `groupId`, `seasonId` y `estado == activa`. Cada fila entregada se rehidrata con schema cerrado y se valida contra:

- unicidad Persona–Grupo mediante consulta activa con `limit(2)`;
- active guard determinista y correlacionado;
- cero Períodos inesperados para v1;
- exactamente un Período abierto, ordinal, extremos y resumen coherentes para v3.

Activas v1 y v3 conviven. Finalizadas e históricas quedan fuera por predicado. Schema desconocido, duplicado activo, guard ausente/incompatible, período v3 inválido o referencias contradictorias abortan toda la página con `INCOMPATIBLE_STATE`; no hay reparación, migración, deduplicación ni ocultamiento parcial.

### 4.4 Persona, DTO y privacidad

Membresías consume una capacidad pública de Personas; no importa su repositorio privado. La composición ocurre en backend y sólo para las filas efectivamente entregadas, nunca para lookahead.

Persona compatible produce `{ status: "AVAILABLE", firstName, lastName }`. Persona ausente o con schema incompatible conserva la fila como `{ status: "UNAVAILABLE" }`. Errores transitorios reconocidos se propagan como `DEPENDENCY_UNAVAILABLE`; no se confunden con ausencia. No existe fallback a `users`, Auth ni arrays legacy.

Cada item contiene sólo `membershipId`, `joinedAt`, `isOwner` y `person`. `membershipId` es una referencia opaca usada como identidad estable de fila: no se renderiza, no autoriza y no habilita comandos. Un comando administrativo futuro deberá revalidar actor, Cuenta, Grupo, ownership, Persona, Temporada, Membresía, guards, Períodos y estado.

No se exponen UID, email, `personId`, `seasonId`, guards, Períodos, schema, estado redundante ni timestamps técnicos.

### 4.5 Cursor, query e índice real

El cursor tiene contrato separado `listActiveGroupMembersForOwnedGroup:v1`, orden `fechaIngreso:asc,__name__:asc`, JSON canónico dentro de Base64URL canónico sin padding, UTF-8 estricto, sobre y payload cerrados, checksum SHA-256 con separación de dominio y hash separado del actor. Queda ligado a actor, Grupo, Temporada, contrato y orden.

La query probada en Emulator es:

1. `groupId == <Grupo autorizado>`;
2. `seasonId == <Temporada abierta server-side>`;
3. `estado == "activa"`;
4. `orderBy("fechaIngreso", "asc")`;
5. `orderBy(documentId(), "asc")`;
6. `startAfter(fechaIngreso, membershipId)` si hay cursor;
7. `limit(pageSize + 1)`.

Se entrega como máximo 20. El lookahead sólo determina continuidad; el cursor se ancla en la última fila incluida. El caso 20/21 con empates confirmó que no se omite el primer documento siguiente.

La query exacta y su orden justifican el único índice nuevo: `memberships: groupId ASC, seasonId ASC, estado ASC, fechaIngreso ASC`. `__name__ ASC` queda implícito en la dirección final de Firestore, conforme a la ficha. No se agregó índice por Persona.

### 4.6 Seguridad, efectos y observabilidad

El reader ejecuta una sola transacción de sólo lectura; no exige snapshot global fuera de la página ni realiza escrituras. La composición está acotada a 20 Personas. Las pruebas compararon conteos de colecciones sensibles antes/después.

Las reglas existentes ya contienen deny-all para Membresías, Personas, Temporadas, guards y Períodos; por eso `firestore.rules` no cambió. Se probaron GET y DELETE directos como visitante, Owner, integrante, tercero y actor con rol global.

Los errores inesperados se sanitizan. La telemetría E2-11 registra sólo operación, etapa/reason u outcome, tamaño solicitado, cantidad devuelta, continuidad, cantidad de identidades no disponibles y duración. No registra UID, Grupo, Membresía, Persona, nombres, cursor ni fechas.

## 5. Frontend

`/dashboard/groups/[groupId]` monta una sección `Integrantes` callable-only. Incluye:

- carga con skeleton y `aria-busy`;
- lista responsive (`1` columna en 360 px, `2` desde `sm`, integrada al grid de escritorio);
- vacío de Temporada abierta;
- estado específico sin Temporada abierta;
- error recuperable y reintento;
- `Cargar más` con bloqueo durante vuelo;
- reinicio automático desde primera página ante `ROSTER_CONTEXT_CHANGED`;
- identidad no disponible;
- badge visual `Owner`;
- controles nativos de teclado con altura táctil mínima;
- foco programático en la región y anuncios `aria-live`/roles.

No renderiza `membershipId`, IDs técnicos, email, controles de baja, menús, selección, expulsión, suspensión ni edición. No anticipa E2-12.

## 6. Legado y compatibilidad preservados

- `memberIds`, `adminIds`, `admins`, `users.roles` y claims no autorizan ni alimentan filas.
- No se migran ni evolucionan Membresías v1 durante la lectura.
- No se retiran endpoints o componentes legacy con consumidores activos.
- Partidos, Torneos, API HTTP legacy y flujos de perfil no se usan como autoridad.
- Los Agregados Grupo, Temporada, Membresía y Persona permanecen separados; el roster es una proyección.
- E2-01 a E2-10 conservaron sus contratos. Dos pruebas históricas de índices se ajustaron para verificar sus índices por contenido, sin prohibir índices aprobados por incrementos posteriores.

## 7. Cobertura implementada

La cobertura nueva verifica payload cerrado, autorización, DTO mínimo, cursor/checksum, UTF-8/Base64URL canónicos, orden, lookahead, ancla correcta, sanitización, observabilidad sin PII, Persona disponible/no disponible, dependencia transitoria, v1/v3, períodos, guards, duplicados y schemas incompatibles.

En Emulator se cubren no autenticado, Cuenta ausente, Owner, Owner sin Persona, Owner con y sin Membresía, integrante no Owner, tercero, rol global ignorado, Grupo inexistente/ajeno indistinguibles, transferencia de ownership entre páginas, Temporada ausente, múltiples abiertas, cambio entre páginas, finalizadas/históricas excluidas, 20/21, empates, deny-all y cero efectos colaterales.

La revisión estructural comprueba callable-only, límites de módulos, imports prohibidos, ausencia de Firestore cliente y ausencia de controles administrativos.

## 8. Gates y resultados exactos

### 8.1 Focales durante implementación

- focal unitaria inicial E2-11 y regresiones inmediatas: `28/28`, 0 fallos;
- focal Emulator E2-11 inicial: `8/8`, 0 fallos, `13.6247619 s`;
- focal unitaria tras índice/cobertura: primer intento `28/29`, 1 expectativa histórica E2-04; corregida y repetida `29/29`, 0 fallos, `0.5336124 s`;
- focal de arquitectura E2-07 tras ajustar expectativa histórica: `5/5`, 0 fallos, `0.0896633 s`;
- focal final de estados visuales: `7/7`, 0 fallos, `0.4283465 s`;
- focal Emulator final E2-11, incluida transferencia de ownership: `8/8`, 0 fallos, `9.6739624 s`.

### 8.2 Gates canónicos completos

- unitarias completas (`npm run test:infra:unit`): primer intento `270/271`, 1 expectativa histórica de cantidad total de índices; tras corrección, `271/271`, 0 fallos, `2.4600728 s`;
- contractuales/focalizadas E2-11: incluidas en unitarias y focales, verdes;
- Emulator E2-11: `8/8`, 0 fallos;
- regresiones Emulator E2-01–E2-10: incluidas en la suite completa, verdes;
- Emulator Suite completa (`npm run test:infra:emulators`): `157/157`, 0 fallos, `239.3350578 s`;
- sintaxis Functions (`npm run quality:functions:syntax`): `263/263` archivos JavaScript, OK;
- mantenimiento/arquitectura/reglas (`npm run test:maintenance`): `7/7`, 0 fallos, `1.8302711 s`;
- lint (`npm run quality:lint`): OK; `39` errores y `9` warnings conocidos, `6` hallazgos resueltos respecto del baseline;
- typecheck (`npm run quality:typecheck`): primer intento detectó 2 accesos no estrechados en una línea; tras corrección, exit code 0;
- build (`npm run quality:build`): exit code 0; compilación, TypeScript y `21/21` páginas estáticas completados;
- `git diff --check`: exit code 0, sin errores.

Todos los runners Firebase usaron `demo-sportexa-e0-02`, Emulator y loopback. El CLI mostró la advertencia esperada de que no pudo obtener MOTD/config remota; no fue fatal y confirmó el bloqueo de red externa. No se accedió a Firebase productivo.

## 9. Incidencias y correcciones

1. El índice E2-11 hizo fallar dos expectativas históricas que congelaban la cantidad total de índices. Se clasificaron como expectativas legítimamente reemplazadas: se ajustaron para seguir comprobando por contenido los índices E2-03/E2-04/E2-07, sin relajar su forma.
2. TypeScript no mantuvo el narrowing de la unión `person` mediante un booleano auxiliar. Se discriminó directamente por `item.person.status`; contrato y conducta no cambiaron.
3. Node dentro del sandbox devolvió `EPERM` al resolver `C:\Users\Rodolfo`. Los gates se ejecutaron fuera de ese sandbox con autorización, sin ampliar red ni alcance Firebase.
4. El CLI intentó obtener MOTD/config remota y fue bloqueado. La Suite continuó sobre proyecto demo y emuladores locales.
5. Se detectaron dos `firestore-debug.log` preexistentes e ignorados por `.gitignore`; el runner actualizó uno. No se versionan y se preservaron para no eliminar archivos locales recibidos.

No se ocultaron fallos ni se modificó un contrato aprobado para hacer pasar pruebas.

## 10. Diferencias justificadas y riesgos residuales

No hay diferencias funcionales respecto de la ficha. Los nombres privados siguen convenciones vigentes del repositorio.

Riesgos residuales:

- el índice nuevo está configurado pero no desplegado; debe acompañar un despliegue futuro autorizado;
- UAT real requiere tres cuentas Google existentes y datos canónicos compatibles;
- corrupción, v1 activa, múltiples páginas y cambio concurrente de Temporada requieren fixtures/Emulator porque no existe UI pública deliberadamente;
- la UI muestra la fecha con locale `es-AR`; el valor contractual transportado permanece ISO.

## 11. Guía UAT

### 11.1 Preparación

Usar tres cuentas Google existentes:

- **A**: Owner vigente del Grupo;
- **B**: Persona con Membresía activa válida en la Temporada abierta;
- **C**: autenticado que no es Owner (puede ser integrante o tener rol global; eso no debe autorizar).

Documentos/IDs a registrar para inspección:

- UID de A, B y C sólo para preparar/verificar fixture, nunca como salida del roster;
- `users/{uidA}`, `users/{uidB}`, `users/{uidC}`;
- `groups/{groupId}` y su `ownerId`;
- `seasons/{seasonId}` abierta;
- `openSeasonGuards/{groupId}`;
- `memberships/{membershipIdA?}` si A también integra;
- `memberships/{membershipIdB}`;
- `activeMembershipGuards/{hash(groupId, personId)}` correspondientes;
- `memberships/{membershipId}/validityPeriods/{periodId}` para v3;
- `personas/{personIdA?}` y `personas/{personIdB}`.

### 11.2 Recorrido manual

1. Iniciar sesión con A y abrir `/dashboard/groups/{groupId}`.
2. Confirmar que aparece `Integrantes`, primero carga y luego muestra el roster.
3. Confirmar nombre/apellido de B, fecha de primera incorporación y ausencia de email/IDs.
4. Si A tiene Membresía activa, confirmar su fila y badge `Owner`; si no la tiene, confirmar que ownership no crea una fila.
5. Navegar con teclado hasta `Cargar más`/`Reintentar` cuando corresponda y confirmar foco/anuncios.
6. Probar 360 px, 768 px y escritorio: sin overflow y con tarjetas legibles.
7. Con C, abrir o navegar a la misma ruta y confirmar que el roster no queda accesible.
8. Con B no Owner, confirmar que ser integrante no permite enumerar terceros.
9. En un Grupo Owner sin Temporada abierta, confirmar el mensaje específico y lista vacía.
10. Confirmar que no existen botones de baja, selección, edición, expulsión, suspensión ni menú administrativo.

Que A autorizado no vea `Integrantes` es una regresión E2-11.

### 11.3 Escenarios sólo con fixture/Emulator

Requieren fixture o evidencia automática: activa v1; v3 con Período; Persona ausente/incompatible; página 20/21 y empates; múltiples Temporadas abiertas; guard ausente/incompatible; duplicado activo; schema desconocido; v3 sin único Período abierto; cambio de Temporada entre páginas; dependencia transitoria; arrays legacy contradictorios; comprobación de cero escrituras y deny-all directo.

La falta de UI para fabricar esos estados no es un defecto del roster.

## 12. Restricciones cumplidas

Al redactar este informe, el estado Git previo al versionado conserva la rama feature en `44bfc07535d890b9d2075f7f28bff049943f5964`, upstream idéntico, divergencia `0/0`, índice vacío, 15 modificados, 10 nuevos, cero eliminados y cero stashes. No hubo deploy ni acceso a Firebase remoto. No se incorporarán datos, logs ni artefactos de Emulator. Auth/UAT continúa aislada e intacta. E2-12 no fue iniciada.

## 13. UAT definitiva y procedencia de evidencia

El usuario confirmó manualmente UAT-01 a UAT-10 y UAT-12. UAT-11 se declaró no recorrible manualmente. La sesión UAT no conserva persistencia inspeccionable en este entorno: no hay Emulator local escuchando ni snapshot recuperable, y por ello no se registran IDs, timestamps ni cantidades de esa sesión. Los logs locales ignorados no proporcionan una reconstrucción válida de esos documentos. La inspección indicada abajo es lectura del contrato, implementación, UI y pruebas existentes, no una nueva acción manual ni una inspección de la base UAT. Los casos con fixture se atribuyen únicamente a la prueba Emulator ya aprobada.

| Caso | Clasificación | Evidencia y alcance |
| --- | --- | --- |
| UAT-01 | `APROBADA MANUALMENTE` | Confirmación del usuario de la sección Owner `Integrantes`. |
| UAT-02 | `APROBADA MANUALMENTE` | Confirmación del usuario de B activo visible; no quedó persistencia UAT para inspección. |
| UAT-03 | `APROBADA MANUALMENTE Y POR INSPECCIÓN` | Confirmación del usuario de exclusión tras finalización; inspección de query `estado == activa` y prueba Emulator que excluye finalizadas. La finalización del fixture Emulator no se presenta como manual. |
| UAT-04 | `APROBADA MANUALMENTE Y POR INSPECCIÓN` | Confirmación del usuario de Owner con/sin Membresía; inspección de `isOwner` ligado a Persona de fila y prueba Emulator Owner sin Membresía. |
| UAT-05 | `APROBADA MANUALMENTE Y POR INSPECCIÓN` | Confirmación del usuario de denegación a C; inspección de autorización por `groups/{groupId}.ownerId` y prueba Emulator de tercero, integrante y rol global. |
| UAT-06 | `APROBADA MANUALMENTE` | Confirmación del usuario del vacío con Temporada abierta y sin Membresías; prueba Emulator separada. |
| UAT-07 | `APROBADA MANUALMENTE` | Confirmación del usuario del estado `NO_OPEN_SEASON`; prueba Emulator separada. |
| UAT-08 | `APROBADA MANUALMENTE` | Confirmación del usuario de ausencia de acciones administrativas. |
| UAT-09 | `APROBADA MANUALMENTE` | Confirmación del usuario de privacidad visual; el DTO cerrado y la prueba Emulator corroboran separadamente la ausencia de datos privados. |
| UAT-10 | `APROBADA MANUALMENTE` | Confirmación del usuario de teclado, foco, carga, retry y responsive. El caso excepcional 20/21 con empates, lookahead y cursor fue cubierto por Emulator E2-11; no se atribuye a recorrido manual. |
| UAT-11 | `NO RECORRIBLE MANUALMENTE — CUBIERTA POR EMULATOR E2-11` | Fixtures separadas de Persona ausente e incompatible; ambas Membresías permanecen en `items` con `person.status: "UNAVAILABLE"`, sin fallback y sin escrituras. La UI presenta “Identidad no disponible”. |
| UAT-12 | `APROBADA MANUALMENTE Y POR INSPECCIÓN` | Confirmación del usuario y lectura del DTO, reader de sólo lectura y prueba Emulator de conteos iguales antes/después; reglas deny-all corroboradas separadamente por GET/DELETE directos. |

Para UAT-11, la prueba `membershipOwnerRosterE2.test.js` crea `e2-11-mixed-03` con Persona ausente y `e2-11-mixed-04` con Persona de schema incompatible, exige ambas filas en el resultado y verifica `{ status: "UNAVAILABLE" }` para cada una. La composición `getPresentation` usa exclusivamente el repositorio de Personas: una ausencia o `InvalidPersonStateError` devuelven `unavailable`; no recurre a `users`, Auth, UID ni email de la Cuenta. El DTO transforma ese estado en `UNAVAILABLE` y conserva `membershipId`, `joinedAt` e `isOwner`; las claves de cada item se comprueban exactamente y la respuesta serializada no contiene `personId`, `seasonId` ni `emailContacto`. La UI presenta literalmente “Identidad no disponible”, sin mostrar `membershipId`. La misma prueba compara los conteos de Membresías, active guards, lifecycle guards, notificaciones y actividades antes/después de la consulta; son iguales. Las escrituras usadas para preparar y limpiar las fixtures pertenecen al runner Emulator, no a la callable. No se creó ni corrompió una Persona durante este cierre.

La UI deliberadamente no ofrece medios para fabricar una Persona ausente/incompatible, múltiples Temporadas abiertas, corrupción, transferencias concurrentes o 21 integrantes. Esos bordes se acreditan con pruebas Emulator existentes. La inspección estática permite revisar contrato y ausencia de controles, pero no sustituye una captura de la sesión UAT. La consulta e índice están configurados localmente, sin deploy; su comportamiento en Firebase remoto queda para un despliegue futuro autorizado. La baja administrativa Owner-scoped sigue siendo deuda futura y no forma parte de E2-11.
