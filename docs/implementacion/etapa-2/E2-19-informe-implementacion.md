# E2-19 — Informe de implementación

## Preflight

- Se ejecutó `fetch --prune origin` antes de modificar archivos.
- Rama exacta `feat/e2-19-own-group-history`.
- HEAD, upstream, `dev` y merge-base coincidían en `176d71626c31c54357af01e0cef900ec2b057a5f`; divergencia inicial `0/0`.
- Árbol e índice inicialmente limpios y cero stashes.
- La ficha coincidía con el blob aprobado `ae15f64a8198978e1f37eb2e543508eb97698cba`; también se verificaron el commit documental `0958044a854a8a2731b52cd526d581eeeba20141` y su merge `176d71626c31c54357af01e0cef900ec2b057a5f`.
- No existían implementación, informe ni cierre E2-19.
- E2-18 estaba cerrado e integrado. E2-14 y Etapa 2 continuaban abiertas; E3 seguía deshabilitada.
- Auth/UAT permanecía aislada en `chore/preserve-auth-emulator-uat-changes`, commit `fc7135e358902a17372d44f20df50883603520ce`, no integrado en HEAD.
- No había procesos ni puertos Emulator escuchando al inicio.

## Inventario exacto

### Modificados

- `volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx`
- `volley-ranking-frontend/src/services/membershipsService.ts`
- `volley-ranking-frontend/src/types/OwnMembership.ts`
- `volley-ranking-system/firestore.indexes.json`
- `volley-ranking-system/functions/index.js`
- `volley-ranking-system/functions/src/memberships/application/membershipContract.js`
- `volley-ranking-system/functions/src/memberships/application/membershipDto.js`
- `volley-ranking-system/functions/src/memberships/application/membershipErrors.js`
- `volley-ranking-system/functions/src/memberships/application/membershipService.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipCallable.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipModule.js`
- `volley-ranking-system/functions/test/run-emulator-tests.js`

### Nuevos

- `docs/implementacion/etapa-2/E2-19-cierre.md`
- `docs/implementacion/etapa-2/E2-19-informe-implementacion.md`
- `volley-ranking-frontend/src/components/memberships/OwnGroupMembershipHistorySection.tsx`
- `volley-ranking-frontend/src/types/OwnGroupMembershipHistory.ts`
- `volley-ranking-system/functions/callables/listMyGroupMembershipHistory.js`
- `volley-ranking-system/functions/src/groups/public/ownMembershipHistoryContextCapability.js`
- `volley-ranking-system/functions/src/memberships/application/ownGroupMembershipHistoryCursor.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreOwnGroupMembershipHistoryReader.js`
- `volley-ranking-system/functions/src/persons/public/ownMembershipHistoryPersonCapability.js`
- `volley-ranking-system/functions/test/emulator/ownGroupMembershipHistoryE2.test.js`
- `volley-ranking-system/functions/test/unit/ownGroupMembershipHistory.test.js`
- `volley-ranking-system/functions/test/unit/ownGroupMembershipHistoryArchitecture.test.js`

### Eliminados

- Ninguno.

## Contrato y autorización

Se agregó la callable `listMyGroupMembershipHistory({ pageSize?, cursor? })`. El contrato sólo acepta esas dos propiedades, usa `pageSize` 20 por defecto y como máximo, y rechaza propiedades desconocidas. No recibe `personId`, UID, estado, orden, `membershipId`, `previousMembershipId`, referencias internas ni parámetros administrativos.

Cada página deriva y revalida dentro de la transacción read-only el UID autenticado, su Cuenta y la Persona vinculada. Cuenta y Persona son obligatorias. No existe autorización por ownership, rol global ni datos del cursor; tampoco se agregó consulta de historia ajena. Los errores estables distinguen validación, `ACCOUNT_REQUIRED`, `PERSON_REQUIRED`, `PERSON_INCOMPATIBLE`, `CURSOR_INVALID`, `CURSOR_STALE`, `INCOMPATIBLE_STATE`, dependencia no configurada/no disponible e interno, sin enumerar recursos ajenos.

La respuesta cerrada es `{ items, nextCursor, hasMore }`, con hasta 20 elementos y cursor sólo cuando existe lookahead.

## Consulta, índice y unidad read-only

La consulta implementada es exactamente `where(personId == derivedPersonId)`, `orderBy(fechaIngreso DESC)`, `orderBy(__name__ DESC)` y `limit(pageSize + 1)`. En continuaciones usa `startAfter(last.fechaIngreso, last.membershipId)`. No filtra por estado.

`firestore.indexes.json` agrega sólo el índice de colección `memberships` con `personId ASCENDING` y `fechaIngreso DESCENDING`; `__name__ DESC` queda en la representación implícita de Firestore. No se agregó ningún índice E2-19 por estado.

La unidad usa explícitamente `runTransaction(..., { readOnly: true })`, compatible con la versión instalada. Cuenta intentos y exige uno, no invoca writers y reporta cero escrituras. No crea receipts, intents, migraciones, backfills, reparaciones ni proyecciones persistidas. La consistencia garantizada corresponde a una página; no se afirma snapshot multipágina.

## Schemas y compatibilidad

- v1 activa: no consulta Períodos, proyecta `CURRENT`, conteo 1 e `INITIAL`.
- v2 finalizada: no consulta Períodos, proyecta `HISTORICAL`, conteo 1 e `INITIAL`.
- v3 activa/finalizada: valida resumen y fronteras de Períodos, deriva estado y proyecta `INITIAL`.
- v4 activa/finalizada: aplica la misma validación y proyecta `RENEWAL`; valida la declaración de lineage como parte del schema, pero nunca recorre ni lee la predecesora.

Todas las raíces requieren `fechaIngreso` como `Timestamp`. Una reactivación permanece en la misma raíz/fila; una renovación v4 aparece como una raíz/fila nueva. Una raíz incompatible —incluido el lookahead— hace fallar la página completa, sin resultados parciales ni reparación.

Para v3/v4 se valida `periodCount`, `latestPeriodId`, el Período ordinal 1 y la última frontera mediante IDs deterministas. Si ambas fronteras coinciden se realiza una sola lectura. No se leen Períodos intermedios ni se infiere el conteo enumerando la subcolección.

## Lookahead, cursor y composición

La raíz `pageSize + 1` se hidrata estrictamente y valida schema, estado, Persona y campos ordenables. Sólo determina `hasMore`: no compone Grupo, Temporada o Períodos, no produce DTO y nunca se entrega ni se usa como cursor. El cursor queda anclado en la última fila entregada.

El cursor v1 usa JSON UTF-8 canónico y base64url canónico sin padding. Su payload cerrado contiene contrato `listMyGroupMembershipHistory:v1`, orden `fechaIngreso:desc,__name__:desc`, hashes contextuales del actor y Persona, timestamp exacto y `membershipId` de ancla. El ancla se relee puntualmente y debe conservar Persona y timestamp. No usa HMAC, checksum, secreto, expiración ni persistencia; no concede autoridad.

Antes del I/O de composición se deduplican IDs. Cada Grupo y Temporada se carga como máximo una vez por página, y una frontera coincidente se lee una sola vez. Se componen únicamente nombre/ID vigentes de Grupo y Temporada al snapshot de la página. Ausencia, incompatibilidad o cruce Temporada–Grupo falla toda la página. No se leen guards, intents, coordinaciones, receipts, predecesoras, lineage completo ni documentos deportivos.

## Presupuesto real de lecturas

La instrumentación suma Cuenta/Persona, ancla, raíces, fronteras de Período, Grupos y Temporadas; expone además contadores de intentos, lineage y escrituras. Las pruebas acreditan:

- continuación mínima de 20: 26 lecturas;
- continuación representativa: 84 lecturas;
- continuación peor caso: 104 lecturas;
- primera página peor caso: 103 lecturas;
- lineage: 0 lecturas;
- escrituras: 0;
- intentos de transacción: 1.

La implementación no supera los techos aprobados.

## DTO y frontend

Cada elemento contiene únicamente `rowKey`, contexto mínimo de `group` y `season`, `status`, `joinedAt`, `leftAt` condicional, `validityPeriodCount` y `continuity`. `rowKey` es la derivación opaca aprobada; el `membershipId` crudo sólo existe dentro del cursor opaco. No salen Persona/UID, schema, hashes, guards, intents, lineage, documentos completos ni metadata adicional.

En `/dashboard/groups` se agregó “Historial de grupos” separado de “Grupos que integrás”, con la explicación de que una fila actual también puede figurar en la superficie operativa. La sección es sólo informativa: no contiene navegación legacy ni acciones de Membresía. Incluye carga inicial, vacío, error, retry, acumulación segura, error incremental que conserva páginas confirmadas, “Cargar más”, single-flight, descarte por generación de respuestas tardías, reinicio por cursor inválido/obsoleto o `rowKey` duplicada, limpieza ante cambio de sesión/Persona, foco de la primera fila agregada, teclado, `aria-live`, `aria-busy` y layout responsive.

Después de la UAT funcional, la card separa explícitamente dos conceptos: `Origen: Alta inicial` o `Origen: Renovación intertemporada` describe cómo nació la raíz, mientras `Período de vigencia: 1` / `Períodos de vigencia: N` describe cuántos Períodos contiene. La reactivación dentro de la misma Temporada sólo incrementa el segundo dato: no cambia el origen, no se denomina renovación y no crea otra card.

E2-04 conserva sin cambios conceptuales la superficie operativa actual.

## Rules, arquitectura e índices

- `firestore.rules` conserva deny-all para cliente en raíces, Períodos y guards; el Admin SDK es el único lector de E2-19.
- Los detectores verifican consulta, transacción read-only, ausencia de writers/lineage, registro de callable, índice mínimo, Rules, DTO y marcadores de accesibilidad/frontend.
- No se creó repositorio histórico, writer, receipt, intent ni proyección.
- No se modificaron permisos de Partido/Torneo ni deuda E4.
- Emulator valida comportamiento y configuración local; no demuestra que el índice esté desplegado remotamente. No hubo deploy.

## Pruebas y resultados

- Sintaxis afectada: verde. Control completo final: `297/297` archivos JavaScript.
- Unitarias focales E2-19: `14/14`, verdes.
- Emulator focal E2-19: `7/7`, verde.
- Regresiones E2-04/E2-09/E2-16/E2-18: `25/25`, verdes.
- Unitarias, contratos y arquitectura completas: `328/328`, verdes.
- Una única Emulator Suite completa fresca: 23 grupos de nivel superior, `199/199` pruebas aprobadas, 0 fallidas/canceladas/omitidas/pendientes; duración `290979.0208 ms`; exit code 0 y teardown de Functions, Firestore, Auth, Eventarc, Tasks, Hub y Logging.
- Rules/mantenimiento: `7/7`, verdes.
- Lint baseline: verde.
- Typecheck: verde.
- Build Next.js de producción: verde; 21 páginas estáticas y rutas dinámicas compiladas.
- `git diff --check` e higiene UTF-8/BOM/whitespace/newline: verificados en el control final.
- Corrección de microcopy posterior a UAT: focal E2-19 `14/14`, lint baseline y typecheck verdes. Por ser un cambio exclusivo de presentación no se repitió la Emulator Suite completa ni se ejecutaron operaciones remotas.

La cobertura E2-19 incluye v1–v4, activas/finalizadas, varias Temporadas del mismo Grupo, reactivación, renovación, orden/desempate, 20/21, lookahead incompatible, cursor inválido/obsoleto y otro actor/Persona, vínculo cambiado entre páginas, referencias ausentes, deduplicación, presupuestos mínimo/representativo/máximo, cero lineage, cero escrituras, no enumeración, Rules, índice/configuración, arquitectura, frontend, accesibilidad y descarte de respuestas tardías.

## Incidencias, riesgos y deuda

- La UAT funcional fue satisfactoria, pero UAT-05/UAT-08/UAT-10 detectaron que la presentación compacta `2 vigencias · Renovación` podía interpretarse como dos renovaciones. Se corrigió exclusivamente la microcopy frontend, separando origen de raíz y cantidad de Períodos con singular/plural explícito. Persistencia, backend, callable, DTO, cursor, contratos, schemas y composición quedaron intactos. El retest manual confirmó la corrección y cerró el hallazgo.
- Una aserción inicial del detector arquitectónico focal no coincidía con el literal de instrumentación `lineage: 0`; se corrigió el detector sin relajar el contrato y la focal quedó `14/14`.
- El entorno restringido de ejecución requirió autorización para Node/npm por un `EPERM` de lectura del directorio padre; no produjo cambios funcionales.
- Firebase CLI no pudo obtener MOTD/configuración remota durante mantenimiento; fue un warning no fatal y la suite local aprobó `7/7`.
- Build informó `caniuse-lite` desactualizado ocho meses. Es deuda preexistente y no se actualizaron dependencias.
- Riesgo operativo restante: el índice compuesto debe desplegarse por el flujo autorizado antes de UAT contra un proyecto remoto; esta tarea no realizó deploy ni acceso Firebase remoto.
- No quedan migraciones, backfills, proyecciones o ampliaciones de alcance pendientes dentro de E2-19.

## Resultados finales de UAT

- UAT-01 a UAT-07: aprobadas manualmente.
- UAT-08: aprobada manualmente después de la corrección de microcopy; se verificaron `Origen: Alta inicial` y `Origen: Renovación intertemporada` como propiedades de la raíz, separadas del conteo.
- UAT-09 a UAT-19: aprobadas manualmente según el reporte recibido.

El retest confirmó `Período de vigencia: 1` / `Períodos de vigencia: N`, una única card al finalizar y reactivar dentro de la misma Temporada, incremento del conteo sin cambio de origen, ausencia de cards por Período y continuidad operativa/separada de “Grupos que integrás”.

Los escenarios de volumen 20/21, compatibilidad integral v1–v4, cursores inválidos u obsoletos, corrupción, concurrencia, transferencia, referencias ausentes, coste máximo y cero escrituras conservan clasificación de pruebas, Emulator o inspección. No se declaran manuales.

## Guía UAT ejecutada

1. Iniciar sesión con una Cuenta válida vinculada a Persona y abrir `/dashboard/groups`.
2. Confirmar que “Historial de grupos” aparece separado de “Grupos que integrás” y explica la posible duplicación informativa de la pertenencia actual.
3. Verificar una fila `CURRENT`: Grupo/Temporada vigentes, ingreso, conteo de períodos y origen; confirmar que no ofrece acciones ni navegación de Membresía.
4. Verificar una fila `HISTORICAL`: debe mostrar egreso y mantenerse sólo informativa.
5. Preparar evidencia de una raíz reactivada y confirmar una sola fila con conteo mayor; preparar una renovación v4 y confirmar una fila adicional marcada como renovación.
6. Con más de 20 raíces, usar “Cargar más”; comprobar orden descendente, ausencia de duplicados, foco en la primera fila nueva y anuncio accesible.
7. Simular un error incremental y confirmar que las filas previas permanecen, aparece retry y no se incorporan resultados parciales.
8. Invalidar u obsoletar el cursor entre páginas; confirmar anuncio, descarte de acumulación y reinicio desde la primera página.
9. Cambiar de Persona o cerrar/cambiar sesión durante una respuesta; confirmar limpieza inmediata y descarte de la respuesta tardía.
10. Revisar estados inicial, vacío y error; operar sólo con teclado y comprobar foco visible, `aria-live`, `aria-busy` y responsive móvil/escritorio.
11. Inspeccionar persistencia antes y después: no deben existir escrituras, receipts, intents, reparaciones, migraciones ni lecturas/creaciones de predecesoras.
12. Confirmar que Cuenta o Persona ausentes fallan con el estado estable correspondiente y que otro actor no puede reutilizar el cursor.

### Clasificación de evidencia

- **Manual aprobada definitivamente:** UAT-01 a UAT-19 conforme al reporte recibido; UAT-08 quedó aprobada después del retest de microcopy. Incluye una card por raíz, origen separado del conteo, finalización/reactivación intratemporada sin nueva card, singular/plural y separación respecto de “Grupos que integrás”.
- **Inspección:** payload/DTO cerrados, consulta exacta, índice mínimo, cursor canónico, ausencia de acciones/writers/lineage, Rules deny-all y límites arquitectónicos.
- **Pruebas/Emulator:** volumen 20/21, compatibilidad integral v1–v4, cursores inválidos/obsoletos, corrupción, concurrencia, transferencia, referencias incompatibles/ausentes, no enumeración, deduplicación, coste máximo, cero escrituras y regresiones.

No se atribuyen a la UAT manual escenarios acreditados únicamente por inspección o Emulator.

## Estado previo al versionado documental

- Commit técnico `441d9e1ee38133a443c28e9615da9ef04ceeda9d` en `feat/e2-19-own-group-history`.
- Merge técnico no fast-forward `8113091e0bd4248e0b946547918e1adec92167f3` integrado y publicado en `dev`.
- Informe y cierre se preparan en la rama separada `docs/e2-19-close`, basada en el merge técnico.
- Ficha intacta en el blob `ae15f64a8198978e1f37eb2e543508eb97698cba`; cero stashes y sin archivos eliminados.
- Sin deploy, acceso Firebase remoto ni incremento posterior iniciado.
- Sin listeners Emulator al finalizar los gates.
- E2-14 y Etapa 2 continúan abiertas; E3 deshabilitada; Auth/UAT intacta y aislada.
