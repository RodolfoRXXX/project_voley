# E2-16 — Informe de implementación del historial canónico de Temporadas

## Estado

`IMPLEMENTADO, VALIDADO Y UAT CONSOLIDADA — LISTO PARA VERSIONADO`

Este informe documenta exclusivamente CU-019. No cierra E2-14 ni Etapa 2, no habilita E3 y no inicia E2-17/E2-18.

## 1. Preflight

- Rama confirmada: `feat/e2-16-season-history`.
- HEAD, `dev`, `origin/dev`, upstream y merge-base confirmados inicialmente en `edd4a93f681590b9325826db07ddf9a130ad88e8`; divergencia `0/0`.
- Working tree e índice iniciales limpios; cero stashes.
- La ficha E2-16 versionada es idéntica a `dev` y permanece intacta.
- No existían implementación, informe ni cierre E2-16 previos.
- Auth/UAT permanece aislada en `chore/preserve-auth-emulator-uat-changes`, commit `fc7135e358902a17372d44f20df50883603520ce`.
- Se revisaron el diff, el historial reciente y los cierres E2-02/E2-15 para no duplicar contratos ni persistencia.
- No apareció ninguna contradicción material con la ficha.
- No se usó Firebase remoto ni se realizó deploy, commit, push, merge, stash o cambio de rama.

## 2. Inventario previo exacto

- Dominio de Temporada: `functions/src/groups/domain/season.js`; hidratación cerrada de abierta v1 y cerrada v2, con `fechaInicio` civil ISO obligatoria.
- Aplicación: `seasonContract.js`, `seasonDto.js`, `seasonErrors.js`, `seasonHashing.js` y `seasonService.js`.
- Persistencia existente: repository de Temporada, guard/reader de abierta, store de cierre y receipts de apertura/cierre.
- Callables E2-02/E2-15: creación/apertura, lectura de contexto abierto, lectura por ID y cierre.
- Cursor/paginación de referencia: E2-04 y E2-11, con cursores cerrados, contexto, lookahead y reautorización.
- Grupo canónico: detalle Owner-scoped en `/dashboard/groups/[groupId]`, abastecido por callables.
- Configuración: `firestore.rules`, `firestore.maintenance.rules`, `firestore.indexes.json` y `firebase.test.json`.
- Pruebas/runners: Node Test unitario, arquitectura/mantenimiento, Emulator Suite aislada y runner focal por variable de entorno.
- Frontend: tipos y servicio de Temporada, detalle canónico y `OpenSeasonSection` para lifecycle.
- Convención pública: razones estables en `HttpsError.details.reason`, mensajes sanitizados y sin IDs internos.
- Confirmación física: abierta canónica sólo v1; cerrada canónica sólo v2; abierta v2 inválida; `fechaInicio` obligatoria y string civil canónica `YYYY-MM-DD`.

## 3. Inventario de cambios

El inventario técnico final contiene 23 archivos: 15 modificados y 8 nuevos. Este informe y el cierre son los únicos dos archivos documentales nuevos. No hay eliminaciones.

### Frontend

- Modificados: `volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx`, `src/components/seasons/OpenSeasonSection.tsx`, `src/services/seasonsService.ts` y `src/types/OwnSeason.ts`.
- Nuevos: `src/components/seasons/SeasonHistorySection.tsx` y `src/types/SeasonHistory.ts`.

### Backend y configuración

- Modificados: `volley-ranking-system/firestore.indexes.json`, `functions/index.js`, `functions/src/groups/application/seasonContract.js`, `seasonDto.js`, `seasonErrors.js`, `seasonService.js`, `functions/src/groups/infrastructure/seasonCallable.js` y `seasonModule.js`.
- Nuevos: `functions/callables/listSeasonsForOwnedGroup.js`, `functions/src/groups/application/seasonHistoryCursor.js` y `functions/src/groups/infrastructure/firestoreSeasonHistoryReader.js`.

### Pruebas y runners

- Modificados: `functions/test/helpers/runnerTools.js`, `functions/test/run-emulator-tests.js` y `functions/test/unit/seasonArchitecture.test.js`.
- Nuevos: `functions/test/emulator/seasonHistoryE2.test.js`, `functions/test/unit/seasonHistory.test.js` y `functions/test/unit/seasonHistoryArchitecture.test.js`.

La ficha E2-16, E2-14, Documento 5, documentos de arquitectura, Auth/UAT y E2-17 permanecen sin cambios.

Clasificación final: las 23 entradas técnicas pertenecen a la implementación E2-16; `E2-16-informe-implementacion.md` y `E2-16-cierre.md` son documentación; no existen correcciones versionables del entorno UAT, temporales, accidentales ni archivos fuera de alcance. La inspección anterior a editar documentación coincidió con las 24 entradas informadas al terminar la implementación: 23 técnicas más este informe.

## 4. Diseño implementado

### Contrato y autorización

`listSeasonsForOwnedGroup({ groupId, pageSize?, cursor? })` acepta sólo esas claves. `pageSize` usa default `20` y admite exclusivamente enteros `1..20`; el cursor es opcional, no vacío y acotado a 2048 caracteres. Se rechazan coerciones, propiedades desconocidas, UID, owner, roles, Persona, estado, filtros, orden, dirección, offset y referencias Firestore.

Cada llamada exige Auth, resuelve la Cuenta propia y reautoriza el ownership vigente del Grupo. Persona, Membresía y roles globales no participan. Grupo inexistente y Grupo ajeno convergen en `GROUP_NOT_ACCESSIBLE`; sólo un Owner puede observar `GROUP_INCOMPATIBLE` para un documento canónico inválido.

La lectura completa de cada página ocurre en una transacción read-only. No existe writer, migración, receipt, proyección, cursor persistido, marca de lectura ni actualización de Agregados.

### Consultas

La actual se consulta en cada página con:

```text
where(groupId == groupId)
where(estado == abierta)
limit(2)
```

Cero abiertas es válido. Una debe hidratar exactamente como abierta v1. Dos abiertas, abierta v2, estado/schema desconocido, campos extra/faltantes y tipos o fechas inválidos fallan cerrados.

Las cerradas usan exactamente:

```text
where(groupId == groupId)
where(estado == cerrada)
orderBy(fechaInicio DESC)
orderBy(__name__ DESC)
startAfter(last.fechaInicio, last.seasonId) // sólo continuación
limit(pageSize + 1)
```

Se valida también el lookahead. Se entregan como máximo `pageSize`, `hasMore` sólo refleja la fila extra y `nextCursor` se ancla en la última fila entregada, nunca en el lookahead.

### Índice y Rules

Se agregó una sola definición compuesta `seasons(groupId ASC, estado ASC, fechaInicio DESC)`, en el formato real del repositorio. El desempate explícito por document ID descendente concuerda con `__name__` implícito. No se desplegó el índice.

Las Rules existentes ya niegan toda lectura/escritura cliente de `seasons`, guards y receipts; no fue necesario ampliar permisos ni modificar Rules. La arquitectura prueba el deny-all y que Presentación no importa Firestore.

Un `failed-precondition` con la señal canónica de índice requerido se traduce estrictamente a `DEPENDENCY_NOT_CONFIGURED`; otros fallos transitorios se traducen a `DEPENDENCY_UNAVAILABLE`, y los desconocidos se sanitizan como error interno.

## 5. Cursor

El cursor es JSON UTF-8 canónico con claves ordenadas, codificado base64url canónico y sin padding. Contiene únicamente:

- versión explícita `1`;
- contrato `listSeasonsForOwnedGroup:v1`;
- `groupId`;
- SHA-256 base64url no secreto del actor bajo el dominio `sportexa:E2-16:list-seasons-for-owned-group:subject:v1`;
- ID de la abierta observada o `null`;
- tupla completa `{ fechaInicio, seasonId }` de la última cerrada entregada.

No usa HMAC, secretos ni expiración. El decoder valida longitud, alfabeto y round-trip base64url, UTF-8, JSON canónico, claves exactas, versión, contrato, Grupo, actor, IDs y fecha.

En continuación se relee el ancla y debe seguir existiendo como cerrada v2 del mismo Grupo con idéntica `fechaInicio`; también se repite la consulta de abierta y se compara su identidad. Forma o contexto inválidos producen `CURSOR_INVALID`. Ancla desaparecida/modificada o cambio de abierta producen `CURSOR_STALE`.

## 6. DTO y compatibilidad

La respuesta pública exacta es `{ currentSeason, closedSeasons, nextCursor, hasMore }`.

- Actual: `{ id, nombre, fechaInicio, estado: "abierta", isCurrent: true }`.
- Cerrada: `{ id, nombre, fechaInicio, estado: "cerrada", closedAt, isCurrent: false }`.

Sólo se aceptan abierta v1 y cerrada v2. Se rechazan abierta v2, cerrada v1, schemas/estados desconocidos, fechas/timestamps inválidos y documentos materializados incompatibles. No se exponen `groupId`, `createdAt`, `closedBy`, UID, roles, schema, guards, receipts, hashes ni datos de Membresía, Solicitud, Partido o Torneo.

## 7. Frontend

El detalle canónico integra una única sección `Temporadas`:

- `Actual` representa separadamente la abierta, con nombre, estado y fecha, o su vacío independiente.
- `Anteriores` representa sólo cerradas, en orden total descendente, o su vacío independiente.
- La abierta se muestra una sola vez y no consume el tamaño de página.
- Hay carga inicial, carga incremental, `Cargar más`, error inicial, error incremental conservando filas, retry y single-flight.
- `CURSOR_STALE`, `CURSOR_INVALID` o un ID duplicado descartan acumulación y reinician con anuncio comprensible.
- Un cambio rápido de Grupo invalida respuestas tardías mediante una generación de solicitud; la pérdida de ownership retira datos visibles.
- Semántica de secciones/lista/fechas, `aria-live`, `aria-busy`, alertas, foco posterior a carga, botón de 44 px, teclado y grilla responsive.

`OpenSeasonSection` quedó como hijo dedicado sólo al cierre de la actual; no gobierna la lectura ni la paginación histórica. No se agregaron acciones de edición, reapertura, renovación, invitación o administración de integrantes.

## 8. Pruebas y gates

Resultados finales:

| Gate | Resultado |
|---|---:|
| Unitarias focales E2-16 | 13/13 |
| Emulator focal E2-16 | 7/7 |
| Suite unitaria completa | 301/301 |
| Emulator Suite completa | 180/180, 20 suites superiores |
| Mantenimiento y Rules | 7/7 |
| Helpers del runner | 9/9 |
| Sintaxis Functions | 282/282 |
| Lint baseline | sin regresiones; conserva 36 errores y 9 warnings conocidos y 9 hallazgos resueltos |
| Typecheck | aprobado |
| Build | aprobado, 21/21 |
| `git diff --check` | aprobado al cierre |
| UTF-8/BOM/newline/whitespace | aprobado al cierre |
| Puertos Emulator | sin listeners al cierre |

Las pruebas cubren contrato y DTO cerrados, schemas v1/v2, fechas, cursor, contexto actor/Grupo, obsolescencia, consultas exactas, orden/desempate, lookahead, autorización por página, errores de dependencia, cero escrituras y arquitectura. Emulator cubre vacío, actual/cerradas, 20/21, segunda página, no repetición del lookahead, ancla y N/N+1 modificados, ownership transferido, incompatibilidades, deny cliente y ausencia de efectos laterales.

La prueba frontend disponible en el repositorio es arquitectónica/estática: comprueba integración callable-only, estados, retry, reinicio, single-flight, descarte por Grupo, accesibilidad y ausencia de comandos fuera de alcance. Typecheck y build validan la composición React final; la interacción visual queda además cubierta por la UAT siguiente.

## 9. Incidencias

1. La primera focal unitaria dio 10/11 por un detector arquitectónico demasiado amplio que confundía el nombre legítimo del reader con acceso Firestore desde Presentación. Se acotó el detector a llamadas reales de colección; repetición verde.
2. La primera suite unitaria completa dio 298/299 porque una prueba histórica sólo inspeccionaba `OpenSeasonForm` y `OpenSeasonSection`. Se actualizó su inventario al nuevo padre canónico y quedó verde; resultado final 300/300.
3. Las primeras ejecuciones Emulator focales aprobaron las aserciones funcionales pero Windows mantuvo un handle temporal más de los 45 segundos históricos del teardown (`EBUSY`). Se confirmó que no había listeners, se redujeron fixtures, se ordenó el teardown y se amplió exclusivamente el retry de limpieza a 60 segundos, conservando fallo cerrado. Helpers 9/9, focal 7/7 y suites completas posteriores 180/180 con teardown exitoso.
4. Firebase CLI no pudo consultar su MOTD/config remota por el proxy bloqueado del runner. Es un warning no fatal; confirma el aislamiento y no afectó los emuladores locales.
5. Next.js informó `caniuse-lite` con ocho meses de antigüedad. No afecta typecheck/build y no se actualizó dependencia por estar fuera de alcance.

No se relajaron aserciones para obtener verde.

## 10. Incidente del entorno UAT

Durante la preparación apareció un fallo local de inicialización de Cuenta acompañado por respuestas `401` y mensajes CORS entre Frontend, Auth Emulator y Functions Emulator. La UAT pudo completarse, pero la evidencia disponible no permite atribuir con certeza el desbloqueo a un único cambio de comando, project ID, orden de arranque, proceso residual o sesión local.

Se clasifica como **C — causa no demostrada**, con estas conclusiones verificables:

- no dejó cambios versionables ni archivos adicionales: el inventario posterior conserva exactamente las 24 entradas previas, y `firebase.ts`/`authService.ts` sólo permanecen en la rama Auth/UAT aislada;
- no se agregó middleware CORS, excepción de Auth ni relajación de autorización;
- no se presenta como defecto de E2-16;
- no bloquea reproducibilidad: el repositorio conserva la ruta canónica segura con project ID explícito `demo-*`, Auth/Firestore/Functions Emulator y variables frontend alineadas; no debe usarse el alias remoto por defecto de `.firebaserc`;
- la falta de una causa raíz única queda registrada como limitación operativa y no como corrección técnica.

## 11. Matriz final de UAT

La UAT queda aprobada con clasificación fiel. No se afirma ejecución manual de UAT-09, UAT-10 ni UAT-17 a UAT-20.

| UAT | Resultado | Clasificación |
|---|---|---|
| UAT-01 | Confirmada | APROBADA MANUALMENTE |
| UAT-02 | Confirmada | APROBADA MANUALMENTE |
| UAT-03 | Confirmada | APROBADA MANUALMENTE |
| UAT-04 | Confirmada | APROBADA MANUALMENTE |
| UAT-05 | Confirmada | APROBADA MANUALMENTE |
| UAT-06 | Confirmada | APROBADA MANUALMENTE |
| UAT-07 | Confirmada | APROBADA MANUALMENTE |
| UAT-08 | Confirmada | APROBADA MANUALMENTE |
| UAT-09 | No pudo provocarse manualmente el estado de error recuperable/retry | NO RECORRIBLE MANUALMENTE — CUBIERTA POR PRUEBAS FRONTEND/EMULATOR E2-16 |
| UAT-10 | No pudo comprobarse manualmente single-flight/doble solicitud | NO RECORRIBLE MANUALMENTE — CUBIERTA POR PRUEBAS FRONTEND/EMULATOR E2-16 |
| UAT-11 | Confirmada | APROBADA MANUALMENTE |
| UAT-12 | Confirmada | APROBADA MANUALMENTE |
| UAT-13 | Confirmada | APROBADA MANUALMENTE |
| UAT-14 | Confirmada | APROBADA MANUALMENTE |
| UAT-15 | Confirmada | APROBADA MANUALMENTE |
| UAT-16 | Confirmada | APROBADA MANUALMENTE |
| UAT-17 | Paginación 20/21, lookahead, ancla y desempate | NO RECORRIBLE MANUALMENTE — CUBIERTA POR EMULATOR E2-16 |
| UAT-18 | Transferencia de ownership entre páginas | NO RECORRIBLE MANUALMENTE — CUBIERTA POR EMULATOR E2-16 |
| UAT-19 | Cambio de abierta/ancla y `CURSOR_STALE` | NO RECORRIBLE MANUALMENTE — CUBIERTA POR EMULATOR E2-16 |
| UAT-20 | Corrupción, índice ausente, carreras y cero escrituras | CUBIERTA POR EMULATOR, PRUEBAS E INSPECCIÓN |

## 12. Limitaciones, riesgos residuales y deuda

- No existe snapshot multipágina: modificaciones concurrentes distintas de la abierta y del ancla podrían reordenar otra cerrada y causar duplicados u omisiones. El frontend reinicia si detecta duplicados; no promete aislamiento global.
- Un documento físicamente corrupto que carezca de campos indexados puede no ser retornado por la consulta. CU-019 no es una auditoría global ni realiza scans/reparaciones.
- Firestore Emulator demuestra conducta de consulta y Rules, pero no demuestra que el índice compuesto esté desplegado o disponible en un proyecto real. La configuración se valida estáticamente y la ausencia se cubre con dobles.
- La causa raíz única del incidente local Auth/Functions/Cuenta no pudo reconstruirse; no dejó cambios en E2-16 y la ruta canónica `demo-*` sigue definida.
- La actualización de `caniuse-lite` y la actualización del SDK `firebase-functions` sugerida por Emulator permanecen fuera de alcance.
- No queda deuda funcional E2-16 conocida. E2-17/E2-18, E2-14, Etapa 2, E3 y deuda E4 permanecen separados.

## 13. Estado Git previo al versionado

- Rama: `feat/e2-16-season-history`.
- HEAD, `dev`, `origin/dev`, upstream, merge-base y `origin/feat/e2-16-season-history`: `edd4a93f681590b9325826db07ddf9a130ad88e8`; divergencia feature/upstream `0/0` después de `fetch`.
- La inspección previa a documentación encontró las 24 entradas exactas informadas; tras crear este cierre hay 23 técnicas y 2 documentales, todas sin stage; índice vacío y cero stashes.
- Sin commit, push, merge, cambio de rama, deploy ni Firebase remoto.
- Ficha intacta; E2-14, Documento 5, arquitectura y Auth/UAT intactos.
- Auth/UAT sigue aislada en `chore/preserve-auth-emulator-uat-changes` (`fc7135e358902a17372d44f20df50883603520ce`) y no está integrada.
- E2-17/E2-18 no iniciados; E2-14 y Etapa 2 siguen abiertas; E3 sigue deshabilitada.
- Sin emuladores escuchando al finalizar.
