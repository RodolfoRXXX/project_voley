# E2-04 — Informe de implementación y corrección de mis Grupos por Membresía

## 1. Rama, checkpoint y preflight

- Fecha de implementación: 2026-08-31.
- Fecha de consolidación posterior a reverificación y UAT: 2026-09-01.
- Rama inicial: `dev`.
- Checkpoint inicial y HEAD de la ficha: `29027e008a1a0dabf614ab66bb041ae894c70689`.
- Upstream inicial: `origin/dev`; divergencia `0/0`; working tree limpio.
- La ficha E2-04 fue confirmada como contenida exactamente en HEAD.
- Rama creada: `feat/e2-04-my-groups-by-membership`, nacida exactamente del checkpoint indicado.
- No existía `AGENTS.md` en la raíz.
- Runtime: Node `v20.14.0`, npm `10.7.0`, Git `2.45.2.windows.1`.
- Los runners canónicos resuelven Firebase CLI desde su tooling y fuerzan proyecto `demo-sportexa-e0-02`, loopback, proxies bloqueados y datos sintéticos.

No se necesitó ni se permitió Firebase remoto.

## 2. Objetivo entregado

Se implementó `listMyCurrentGroupMemberships` para que una identidad autenticada con cuenta y Persona propias consulte, con paginación, sus Membresías físicamente activas que además resultan operativas por unicidad, guard íntegro, Grupo v1 activo y coincidencia con la Temporada abierta actual.

“Operativa” permanece como decisión efímera de consulta. No se agregó estado, proyección ni escritura persistente.

## 3. Decisiones físicas y arquitectura

- Membresías coordina identidad, cuenta, Persona, consulta primaria, integridad por candidata, filtrado temporal y DTO.
- Se agregó un reader específico de listado propio; no se creó Repositorio genérico.
- Grupo y Temporada se consumen mediante el puerto interno `memberContextModule`, no mediante callables owner-scoped ni accesos directos desde el reader E2-04.
- Las capacidades member-safe no reciben UID, ownership, roles ni permisos y no se exportan en `functions/index.js`.
- El único export callable nuevo es `listMyCurrentGroupMemberships`.
- No se modificó `firestore.rules`.
- No se modificaron dependencias ni lockfiles.
- No se modificaron `firestoreOpenSeasonGuard.js`, `seasonE2.test.js` ni la concurrencia E2-02.

## 4. Archivos creados

- `docs/implementacion/etapa-2/E2-04-informe-implementacion.md`.
- `volley-ranking-system/functions/callables/listMyCurrentGroupMemberships.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipCursor.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMyCurrentGroupMembershipsReader.js`.
- `volley-ranking-system/functions/src/groups/application/memberContextErrors.js`.
- `volley-ranking-system/functions/src/groups/infrastructure/firestoreMemberContext.js`.
- `volley-ranking-system/functions/src/groups/infrastructure/memberContextModule.js`.
- `volley-ranking-system/functions/src/shared/application/transientDependencyError.js`.
- `volley-ranking-frontend/src/types/MyCurrentGroupMembership.ts`.
- `volley-ranking-frontend/src/components/memberships/MyCurrentGroupMembershipsSection.tsx`.
- `volley-ranking-system/functions/test/unit/membershipCursor.test.js`.
- `volley-ranking-system/functions/test/unit/firestoreMemberContext.test.js`.
- `volley-ranking-system/functions/test/unit/transientDependencyError.test.js`.
- `volley-ranking-system/functions/test/emulator/membershipListE2.test.js`.

## 5. Archivos modificados

- `volley-ranking-system/functions/index.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipContract.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipDto.js`.
- `volley-ranking-system/functions/src/memberships/application/membershipService.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipExternalContexts.js`.
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipModule.js`.
- `volley-ranking-system/firestore.indexes.json`.
- `volley-ranking-frontend/src/services/membershipsService.ts`.
- `volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx`.
- `volley-ranking-system/functions/test/run-emulator-tests.js`.
- `volley-ranking-system/functions/test/unit/membershipArchitecture.test.js`.
- `volley-ranking-system/functions/test/unit/membershipContract.test.js`.
- `volley-ranking-system/functions/test/unit/membershipService.test.js`.

## 6. Contrato y DTO

Entrada cerrada:

```ts
listMyCurrentGroupMemberships({ pageSize?, cursor? })
```

`pageSize` usa default `20`, mínimo `1`, máximo `20` y exige entero. El cursor, si existe, es string no vacío de hasta 2048 caracteres. Se rechazan `null`, arrays, tipos incompatibles, propiedades desconocidas e identidad/filtros enviados por el cliente.

La salida posee exactamente `items` y `nextCursor`. Cada item contiene sólo:

```ts
{
  membership: { id, seasonId, estado: "activa", fechaIngreso },
  group: { id, nombre, deporte: "voleibol", estado: "activo" }
}
```

`fechaIngreso` se serializa en ISO-8601 UTC. No se alteraron los DTO públicos E2-03.

## 7. Cursor v1

- Payload exacto: versión `1`, contrato `listMyCurrentGroupMemberships:v1`, orden `fechaIngreso:desc,__name__:desc`, timestamp Firestore seconds/nanoseconds y último `membershipId`.
- JSON canónico UTF-8 dentro de un sobre cerrado `{ payload, checksum }`.
- Base64URL sin padding.
- Checksum SHA-256 con dominio `sportexa:E2-04:my-current-group-memberships-cursor:v1` y separación length-prefixed.
- No contiene `personId`, snapshots, rutas ni secretos.
- No usa HMAC y no concede autorización.
- Valida tamaño, alfabeto/codificación, JSON canónico, claves exactas, checksum, versión, contrato, orden, rango Firestore e ID.
- Un token caller-crafted válido sólo reposiciona la consulta fijada al `personId` derivado en backend.

## 8. Consulta e índice

La consulta implementada es:

```text
memberships
  where personId == derivedPersonId
  where estado == "activa"
  orderBy fechaIngreso DESC
  orderBy documentId() DESC
  startAfter(timestamp, membershipId) cuando existe cursor
  limit(pageSize + 1)
```

Se procesan sólo los primeros `pageSize` documentos. El adicional es lookahead y no se hidrata ni valida. Cuando existe lookahead, el cursor nace del último documento crudo procesado; no hay loops de relleno. Se probó una página vacía con continuación y que el lookahead reaparece en la página siguiente.

Se agregó exclusivamente el índice `memberships: personId ASC, estado ASC, fechaIngreso DESC`. `__name__` no fue declarado. Firestore Emulator confirmó el desempate efectivo por ID descendente. El índice E2-03 `personId ASC, groupId ASC, estado ASC` quedó intacto.

## 9. Integridad por candidata

Cada candidata se reconstruye estrictamente como Membresía v1 y se correlaciona con la Persona derivada. Luego se ejecuta la consulta Persona–Grupo–activa con `limit(2)`, se exige exactamente una activa y que sea la candidata, se deriva y lee el guard determinista E2-03 y se reutilizan su hidratación y correlación exactas.

Cero o dos activas, candidata distinta, documento incompatible, activa huérfana, guard ausente/roto o correlación inválida producen `INCOMPATIBLE_STATE` sin lista parcial y sin reparación.

## 10. Capacidades internas member-safe

- `getMemberReadableGroupContext({ groupId })`: reconstruye Grupo v1 activo y devuelve sólo `{ id, nombre, deporte, estado }`.
- `getOpenSeasonContextForMembership({ groupId })`: dentro de una transacción de sólo lectura consulta `seasons` por `groupId` y `estado == "abierta"` con `limit(2)`, reconstruye estrictamente cada resultado y lo contrasta con el guard abierto. Sólo devuelve `null` ante cero abiertas y guard ausente; sólo devuelve `{ id, groupId, estado: "abierta" }` ante exactamente una abierta y guard plenamente correlacionado. Toda otra combinación es incompatible.

Grupo ausente/inactivo/incompatible y corrupción abierta fallan como `INCOMPATIBLE_STATE`. La indisponibilidad se traduce a `DEPENDENCY_UNAVAILABLE`. Ninguna capacidad concede ownership, enumera recursos, escribe o debilita contratos owner-scoped.

## 11. Autorización y privacidad

UID se toma sólo del token. Cuenta y Persona se releen en cada llamada; `PERSON_REQUIRED` ocurre antes de consultar Membresías. Ownership, rol global, email, cursor y arrays legacy no autorizan.

Se probó integrante no Owner con Membresía válida, Owner sin Persona con listado owner-scoped todavía operativo, global admin sin resultados ajenos y cursor de otra identidad incapaz de cambiar la Persona derivada. El DTO y cursor omiten Persona, Owner, schema, timestamps administrativos, guard, hashes y roles.

## 12. Frontend

`/dashboard/groups` presenta dos secciones y cargas independientes:

1. “Grupos que administrás” conserva `listOwnGroups` y sus enlaces owner-scoped.
2. “Grupos que integrás” consume sólo el callable E2-04.

La segunda sección cubre loading, `PERSON_REQUIRED` local, vacío, items, página siguiente, página vacía con continuación, retry, dependencia no disponible, incompatible y fin. Las tarjetas member-scoped no tienen enlace ni controles administrativos. No se deduplican Grupos presentes en ambas relaciones. Se conservaron regiones anunciables, teclado, foco visible, targets mínimos y grilla responsive sin Firestore frontend ni actualización optimista.

## 13. Pruebas y conteos finales

- Focalizadas H01–H04: `35/35` aprobadas.
- Unitarias completas: `177/177` aprobadas.
- Emulator Suite E2-04 focalizada: dos ejecuciones con `10/10` casos funcionales aprobados en cada una. En ambas, el wrapper finalizó luego con `EBUSY` al limpiar su directorio temporal ya detenido; se clasificó como cleanup del runner y no como falla funcional. No se borraron directorios manualmente.
- Emulator Suite completa canónica: `90/90` aprobadas, código de salida `0`.
- Suite E2-04 dentro del Emulator canónico: `10/10` aprobadas; incluye H01, orden/índice, empate, primera/intermedia/última página, `pageSize: 20` con 20/21 documentos, lookahead, cursor realmente construido, página vacía con continuación, duplicado fuera de la primera página, identidad, integridad, Grupo, Temporada, preservación de fixture ajeno y reglas negativas.
- Suite E2-03 dentro de la reverificación: `13/13` aprobadas.
- Suite E2-02 dentro de la reverificación: `10/10` aprobadas; su implementación y sus archivos protegidos permanecieron sin cambios.
- Mantenimiento/reglas aislado: `7/7` aprobadas.
- Arquitectura: capacidades internas no callables, consulta/índice exactos, frontend callable-only y aislamiento del flujo nuevo.
- Frontend: la evidencia automatizada es estructural, de TypeScript y de build. No se agregó framework de navegador ni se afirma cobertura funcional visual; interacción, foco y responsive quedan para UAT manual.

## 14. Gates

| Gate | Resultado |
|---|---|
| Focalizadas H01–H04 | OK, `35/35` |
| Unitarias completas | OK, `177/177` |
| Emulator E2-04 focalizado, corrida 1 | Casos OK, `10/10`; `EBUSY` posterior de cleanup del wrapper |
| Emulator E2-04 focalizado, corrida 2 | Casos OK, `10/10`; `EBUSY` posterior de cleanup del wrapper |
| Emulator Suite completa | OK, `90/90`, salida `0` |
| E2-04 dentro de Emulator | OK, `10/10` |
| E2-03 dentro de Emulator | OK, `13/13` |
| E2-02 dentro de Emulator | OK, `10/10` en la reverificación |
| Reglas/mantenimiento | OK, `7/7` |
| Sintaxis Functions | OK, `203/203` archivos |
| Typecheck | OK |
| Build Next.js | OK, 21 páginas generadas |
| Lint baseline | OK, 39 errores y 9 warnings conocidos; 6 hallazgos resueltos respecto del baseline |
| JSON de índices | OK; diff `+18/-0`, sólo índice E2-04 |
| `git diff --check` | OK; sólo warnings informativos LF/CRLF |
| `quality:stage0` | OK, salida `0`; incluyó lint, typecheck, sintaxis, `177/177` unitarias, `90/90` Emulator, build y diff |

Registro histórico: durante la primera implementación, antes de esta revisión, una ejecución de `quality:stage0` había mostrado la intermitencia concurrente E2-02 documentada en `seasonE2.test.js`. No se corrigió ni modificó E2-02. En la verificación posterior a H01–H04, tanto el runner canónico independiente como `quality:stage0` aprobaron `90/90` pruebas Emulator.

Warnings no bloqueantes: intento fallido del Firebase CLI de obtener MOTD/config remota bajo proxy bloqueado; advertencia de SDK `firebase-functions` antiguo; `caniuse-lite` desactualizado; perfil PowerShell referencia `fnm` ausente. No requirieron cambios de dependencias.

## 15. Efectos, legado y escrituras

- E2-04 realiza cero escrituras de aplicación, eventos, alertas o notificaciones.
- Las escrituras observadas en integración pertenecen sólo a fixtures sintéticos y cleanup local.
- No se leen ni escriben `memberIds`, `adminIds`, `admins`, solicitudes, jugadores, posiciones, partidos, torneos, inscripciones, alertas o notificaciones en el flujo alcanzable E2-04.
- No se usan APIs/rutas legacy como fallback.
- `firestore.rules` quedó intacto y deny-all fue probado para Persona, Grupo v1, Temporada, guards y Membresía ante integrante, Owner, global admin y autenticado genérico.
- No se tocó `derfgtyhj`.

## 16. Deuda y exclusiones

Se acepta el costo N+1 hasta 20 candidatas, páginas filtradas/vacías y ausencia de snapshot global multipágina. Quedan fuera roster, Personas ajenas, detalle member-scoped, roles/permisos, lifecycle, migración general, proyección persistente, HMAC/secretos y corrección de E2-02.

## 17. Estado Git, remoto y UAT

- Los cambios quedan locales y sin commit en `feat/e2-04-my-groups-by-membership`.
- No hubo commit, push, merge, deploy ni modificación posterior de `dev`.
- No hubo lectura/escritura de Firebase remoto ni despliegue del índice.
- La reverificación técnica independiente concluyó sin nuevos hallazgos con veredicto `E2-04 APTO PARA UAT`.
- UAT-01 a UAT-11 fueron aprobados en Emulator Suite local con proyecto `demo-sportexa-e2-04`, loopback y datos sintéticos.
- Este documento es informe de implementación; no es cierre formal.

## 18. Revisión técnica independiente y correcciones

La revisión independiente posterior a la primera implementación emitió `E2-04 REQUIERE CORRECCIONES`. Se preserva ese antecedente: la primera versión no cubría H01–H04 ni toda la evidencia solicitada.

### H01 — múltiples Temporadas abiertas

- Causa: la capacidad member-safe leía sólo `openSeasonGuards/{groupId}` y la Temporada señalada, por lo que una segunda abierta huérfana podía quedar oculta.
- Archivos: `firestoreMemberContext.js`, `memberContextModule.js`, `memberContextErrors.js`, pruebas unitarias y Emulator E2-04.
- Corrección: consulta productiva real `seasons where groupId == ... where estado == "abierta" limit(2)` en transacción de sólo lectura, hidratación estricta y matriz cerrada de cardinalidad/guard. No adopta, repara, borra ni elige arbitrariamente.
- Regresión: cero abiertas sin guard, una correlacionada, dos abiertas, una sin guard, guard sin abierta, guard a otra Temporada, Temporada de otro Grupo y ausencia de escrituras.
- Índices: Emulator confirmó que no hace falta un índice adicional. `firestore.indexes.json` conserva sólo el índice nuevo E2-04; su diff real es `+18/-0`.

### H02 — objeto plano

- Causa: la validación anterior comprobaba sólo tipo/no-array y admitía `Date`, colecciones e instancias de clases.
- Archivos: `membershipContract.js` y `membershipContract.test.js`.
- Corrección: se aceptan exclusivamente objetos con prototipo `Object.prototype` o `null`; se rechazan `Date`, `Map`, `Set`, `Buffer`, arrays, funciones, clases y prototipos personalizados con `VALIDATION_FAILED`.
- Regresión: objetos normales y sin prototipo válidos, `pageSize` válido, todas las formas no planas y claves desconocidas.

### H03 — UTF-8 estricto del cursor

- Causa: `Buffer.toString("utf8")` podía sustituir bytes malformados por `U+FFFD` antes de validar el sobre.
- Archivos: `membershipCursor.js` y `membershipCursor.test.js`.
- Corrección: luego de Base64URL se exige que bytes → string UTF-8 → bytes sea idéntico antes de parsear JSON, sin cambiar canonicalización, checksum ni contrato.
- Regresión: cursor normal, UTF-8 válido, byte `0xFF`, secuencia truncada, overlong y representación inválida; todo byte inválido produce `VALIDATION_FAILED`.

### H04 — clasificación cerrada de errores

- Causa: errores desconocidos eran mapeados indiscriminadamente a `DEPENDENCY_UNAVAILABLE`, ocultando defectos internos.
- Archivos: `transientDependencyError.js`, `membershipService.js`, `membershipExternalContexts.js`, errores/capacidad de Grupo, callable y pruebas unitarias.
- Corrección: clasificación acotada y protegida contra ciclos de la cadena `cause`; sólo códigos 4/8/14 y equivalentes textuales reconocidos son dependencia transitoria. `TypeError`, `ReferenceError`, genéricos y códigos desconocidos se convierten a `MembershipInternalError`, expuesto sanitizado como `INTERNAL_ERROR`. La corrupción normativa sigue siendo `INCOMPATIBLE_STATE`.
- Regresión: códigos numéricos/textuales, error envuelto, ciclo, errores de programación/genéricos/desconocidos, corrupción, respuesta callable sanitizada y ausencia de lista parcial.

### Evidencias complementarias

Se agregaron fixtures para exactamente 20 frente a 21 documentos, cursor caller-crafted con checksum válido generado por el test, duplicado fuera de la primera página, `PERSON_REQUIRED` coexistiendo con `listOwnGroups` exitoso y cleanup registral que preserva datos ajenos. El inventario final es de 13 archivos modificados y 14 nuevos; los cuatro nuevos respecto del inventario inicial de implementación corresponden al adapter productivo H01, el clasificador H04 y sus dos suites unitarias.

Las cuatro rutas adicionales autorizadas por la corrección son:

- `volley-ranking-system/functions/src/groups/infrastructure/firestoreMemberContext.js`;
- `volley-ranking-system/functions/src/shared/application/transientDependencyError.js`;
- `volley-ranking-system/functions/test/unit/firestoreMemberContext.test.js`;
- `volley-ranking-system/functions/test/unit/transientDependencyError.test.js`.

## 19. Reverificación independiente y UAT

La reverificación independiente examinó H01–H04 y las evidencias complementarias sin encontrar nuevos hallazgos. Su dictamen fue `E2-04 APTO PARA UAT`.

El UAT se ejecutó con Auth, Firestore y Functions Emulator, proyecto `demo-sportexa-e2-04`, interfaces de loopback y datos sintéticos. No se consultó Firebase remoto.

| Caso | Clasificación | Evidencia final |
|---|---|---|
| UAT-01 — Owner sin Persona | APROBADO MANUALMENTE | “Grupos que administrás” continuó cargando y siendo utilizable; sólo “Grupos que integrás” mostró `PERSON_REQUIRED`, sin crear Persona ni bloquear la página. |
| UAT-02 — Persona sin Membresías | APROBADO MANUALMENTE | La sección de pertenencia mostró el vacío legítimo, separado de la sección owner-scoped. |
| UAT-03 — Owner con Membresía | APROBADO MANUALMENTE | El mismo Grupo apareció en ambas secciones, sin deduplicación ni fusión de relaciones. |
| UAT-04 — Integrante no Owner | APROBADO MANUALMENTE | El Grupo apareció sólo en “Grupos que integrás”, con tarjeta mínima y sin controles administrativos. |
| UAT-05 — Sin contexto abierto exacto | APROBADO MANUALMENTE | La Membresía no se presentó como operativa y la interfaz no la etiquetó como cerrada, retirada ni histórica. |
| UAT-06 — Múltiples páginas | APROBADO MANUALMENTE | La continuación conservó el orden observable y no mostró duplicados ni omisiones. |
| UAT-07 — Página vacía con continuación | APROBADO, COMPLEMENTADO TÉCNICAMENTE | El estado de continuación quedó disponible en la interfaz; la condición exacta `items: []` con `nextCursor` no nulo y la reaparición del lookahead se confirmaron además en la suite E2-04 del Emulator. No se atribuye esa inspección interna al navegador. |
| UAT-08 — Navegación | APROBADO MANUALMENTE | `/dashboard/groups` fue accesible por el flujo canónico; los enlaces owner-scoped se conservaron y las tarjetas member-scoped no navegaron a detalle administrativo ni rutas legacy. |
| UAT-09 — Retry | APROBADO MANUALMENTE | La indisponibilidad simulada produjo feedback estable y permitió reintentar sin actualización optimista ni efectos persistentes. |
| UAT-10 — Accesibilidad y responsive | APROBADO MANUALMENTE | Se verificaron teclado, foco visible, anuncios de estado y uso sin scroll horizontal en móvil y escritorio. |
| UAT-11 — Privacidad y efectos | APROBADO MANUALMENTE Y CORROBORADO TÉCNICAMENTE | La respuesta observada mantuvo el DTO mínimo y no expuso Persona, Owner, roles, guards, hashes ni rutas. La inspección de colecciones y las pruebas confirmaron cero escrituras, reparaciones, eventos o efectos laterales del flujo E2-04. |

### Incidente local de autenticación durante UAT

El frontend apuntó inicialmente a `project-groupvolley`, lo que impidió al navegador usar la identidad del entorno sintético. Se corrigió exclusivamente la configuración local ignorada en `.env.local` para alinear el frontend con `demo-sportexa-e2-04` y los emuladores de Auth, Firestore y Functions. Luego se confirmaron `ensureMyAccount` y la carga del dashboard. `.env.local` se preservó sin versionar; no hubo cambio productivo, secreto agregado, despliegue ni acceso Firebase remoto.

La deuda concurrente E2-02 permanece separada, documentada y fuera de alcance. La reverificación obtuvo `10/10` para E2-02 sin modificar `firestoreOpenSeasonGuard.js`, `seasonE2.test.js` ni sus contratos owner-scoped. Se conservan también el costo N+1, las páginas filtradas o vacías, la ausencia de snapshot global entre páginas y todas las exclusiones de la ficha.

## 20. Veredicto consolidado previo al versionado

`E2-04 IMPLEMENTADO, REVERIFICADO Y CON UAT APROBADO — LISTO PARA VERSIONAR`
