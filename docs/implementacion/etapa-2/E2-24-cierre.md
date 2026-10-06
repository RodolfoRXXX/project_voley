# E2-24 — Cierre formal de la eliminación de Grupo propio

## Estado

- Incremento: `E2-24`.
- Caso de uso: `CU-015 — Eliminar un Grupo`.
- Estado documental: `CERRADO`.
- Alcance cerrado: eliminación física por el Owner vigente de un Grupo canónico v1 activo sin referencias funcionales.
- Implementación: `4fd7ce5d26c8148499837c8f901a06938c7ed9eb`.
- Merge no fast-forward de implementación en `dev`: `46fc2382a5133794c459c78894a8560df036725d`.
- Padres del merge: `403ee8424b82bc065ff91e14ba73993b4d6b5f52` y `4fd7ce5d26c8148499837c8f901a06938c7ed9eb`.
- Fecha de cierre documental: 2026-10-06.
- Deploy: no realizado.
- Firebase remoto: no accedido.

## Fuentes y trazabilidad

Este cierre se contrastó con:

- [`E2-24-ficha-eliminacion-grupo.md`](./E2-24-ficha-eliminacion-grupo.md), definición funcional, técnica y criterios de terminado;
- [`Documento-2-addendum-E2-24-eliminacion-grupo.md`](../../arquitectura/Documento-2-addendum-E2-24-eliminacion-grupo.md), decisión funcional prospectiva de CU-015;
- [`E2-24-informe-implementacion.md`](./E2-24-informe-implementacion.md), implementación, auditoría, gates, UAT e inspección persistente;
- [`Documento 5 - Plan de Implementación y Transición Técnica-borrador.md`](../../transicion/Documento%205%20-%20Plan%20de%20Implementaci%C3%B3n%20y%20Transici%C3%B3n%20T%C3%A9cnica-borrador.md), especialmente §§3–5, 7.4, 9 y D5-024/025/030/033–035/041;
- los cierres [`E2-20-cierre.md`](./E2-20-cierre.md), [`E2-22A-cierre.md`](./E2-22A-cierre.md) y [`E2-23-cierre.md`](./E2-23-cierre.md), como antecedentes de compatibilidad y patrón documental;
- el historial Git de definición, implementación e integración.

La ficha fue integrada por `6fd33f092346d82eb124cf904c576a1f57adbe31` y su objeto vigente es `b6d4ee5ce7af88278ea4dd9512abda44e797411d`. El addendum fue aprobado por `293edfc436d7d33ebab770f93751cc2f00c2e6af` y su objeto vigente es `69f3fd2ebc821ef5f5bd7d91e151f8f1939eef06`. El informe forma parte del commit de implementación y su objeto vigente es `be723ecb67767879a8251589b025420eed841c4d`.

El commit de implementación tiene como padre único `403ee8424b82bc065ff91e14ba73993b4d6b5f52`. El merge lo incorpora como segundo padre sobre esa misma base. La definición precede al código y la integración conserva el inventario aprobado de 38 archivos: 29 modificados y 9 nuevos, con 1.284 inserciones y 88 eliminaciones.

## Alcance funcional cerrado y decisiones D01–D08

E2-24 cierra exclusivamente CU-015 para un Grupo canónico v1 activo, propio y sin referencias funcionales de ningún estado. La decisión consolidada comprende:

| Decisión | Resultado cerrado |
| --- | --- |
| D01-A | Cero Temporadas, Membresías, Solicitudes u otras referencias funcionales; el alta mínima y la evidencia técnica válida no bloquean por sí solas. |
| D02-A | Sólo un Grupo v1 activo es elegible; un Grupo archivado v2 o legacy no se elimina. |
| D03-A | Sólo autoriza el Owner vigente, revalidado en preparación y confirmación. |
| D04-a/b/c | Toda Solicitud, incluso terminal, bloquea; crear o renombrar sin referencias no bloquea; no existe una categoría abierta de «cambios administrativos» que agregue impedimentos. |
| D05-A | El delete libera el cupo provisional de E2-01, sin habilitar múltiples Grupos ni definir una política comercial definitiva. |
| D06-A | El Grupo desaparece de las superficies públicas y Owner; sólo el mismo actor, key y request recuperan un resultado técnico mínimo. |
| D07-A | Los outcomes confirmados se retienen y los retries históricos distinguen efecto aplicado y eliminación posterior sin resucitar el Grupo. |
| D08-A | Se borra físicamente la raíz y se conserva sólo evidencia técnica privada mínima; no existe tombstone Owner-visible. |

La aclaración D04 es cerrada y material: no basta con que una Solicitud deje de estar pendiente; cualquier Solicitud existente —pendiente, cancelada, rechazada o aprobada— constituye historia funcional y bloquea. En cambio, alta y rename pertenecen al estado propio del Grupo y no lo vuelven inelegible si no existen otras referencias. No se pueden inventar bloqueos adicionales bajo una expresión administrativa genérica.

## Efecto, cupo y recovery

La confirmación válida crea el deletion receipt privado, elimina `groups/{groupId}` y libera `groupCreationGuards/{actorUserId}` en una única postcondición atómica. No elimina, finaliza, archiva, decide ni modifica otro Agregado. Temporadas, Membresías, Períodos, lineage, Solicitudes, Partidos, Torneos y demás referencias sólo participan como condiciones autoritativas de elegibilidad.

El borrado es físico y no tiene cascadas. Un Grupo con cualquier historia o referencia no se limpia para hacerlo elegible: el delete falla cerrado. Un Grupo archivado conserva identidad e historia y nunca entra en CU-015.

Después de eliminar A, una intención y key nuevas pueden crear B como único Grupo vigente. La evidencia histórica conserva los hashes mínimos del alta de A antes de liberar el guard. Por ello:

- retry del alta de A devuelve `CREATED_THEN_DELETED`, con `currentGroup: null`;
- retry de un rename confirmado de A devuelve `UPDATED_THEN_DELETED`, sin nombre ni Grupo actual;
- retry del mismo delete recupera `EXISTING_IDEMPOTENT` y el mismo `deletedAt`;
- una operación nunca confirmada sobre A no fabrica éxito ni receipt retroactivo;
- ningún retry de A recrea A, modifica, elimina, reemplaza o devuelve B.

## Privacidad, Rules y retención

Grupo inexistente y Grupo ajeno convergen en `GROUP_NOT_ACCESSIBLE`. Los blockers se exponen por categoría, sin sujetos, IDs, cantidades ni estados privados. Roles globales, app admin, integrantes, cargos, arrays legacy, Plan, Suscripción o conocer el ID no autorizan.

`groupDeletionReceipts` permanece deny-all por Rules y sólo es accesible desde stores backend canónicos. Su schema cerrado omite nombre, deporte, snapshot, clave cruda, blockers y referencias. Los receipts de delete, creación y rename se correlacionan por actor y hashes deterministas; cardinalidad o integridad incompatibles fallan cerradas.

La retención técnica es indefinida porque D07-A exige recovery histórico y no existe una ventana máxima aprobada. No es historia funcional ni una política general de auditoría. TTL, cleanup o caducidad requieren otra decisión de producto y quedan fuera de E2-24. Los dos índices incorporados corresponden exclusivamente a consultas demostradas de evidencia: `actorUserId + creationIdempotencyKeyHash` y `actorUserId + groupId`.

## Frontend y regresiones

La superficie Owner activa reemplazó los disparadores grandes independientes por un único menú `Acciones del grupo`, con tres opciones en orden: editar nombre, archivar grupo y eliminar grupo. Elegir archivar o eliminar abre su diálogo y preparación backend; nunca ejecuta directamente el efecto.

El menú implementa teclado, Escape, Tab, clic exterior, roving focus, retorno de foco y distinción destructiva no basada sólo en color. Un Grupo archivado no muestra menú. La pérdida de autorización o la navegación A→B invalidan respuestas tardías y retiran información Owner-scoped.

Las regresiones de E2-20 y E2-23 quedaron preservadas: editar nombre mantiene token, stale, single-flight, recovery y actualización del encabezado; archivar mantiene preparación, blockers, confirmación, estado v2 read-only y foco posterior. El archivo no habilita delete y delete no introduce desarchivo.

## Hallazgos, correcciones y retests

La auditoría corrigió contratos y comportamiento antes del versionado:

1. conservó `CONFLICT` para el guard E2-01 vigente y reservó `IDEMPOTENCY_CONFLICT` al recovery histórico;
2. incorporó correlación del `openSeasonGuard` para impedir evidencia huérfana;
3. liberó `sending/inFlight` al repreparar un delete stale;
4. modeló `UPDATED_THEN_DELETED` y el retiro seguro del detalle Owner-scoped;
5. ligó rename a generación y `groupId` para descartar respuestas tardías A→B;
6. reforzó la exclusión de schemas canónicos presentes y futuros en Rules, HTTP, triggers y pruebas.

La UAT no encontró defectos productivos. Hubo dos interferencias de fixtures:

- los Grupos auxiliares del recorrido humano activaron correctamente el límite provisional; se ajustó localmente su ownership y el retest humano de creación B aprobó, sin borrar referencias ni modificar producto;
- una prueba E2-10 asumía colecciones globales vacías; se corrigió para comparar el inventario anterior y posterior de su propia suite, y aprobaron la focal E2-10 `12/12`, las unitarias `355/355` y el integral `232/232`.

Estas incidencias y sus correcciones pertenecen a fixtures/pruebas; no son defectos productivos ni transferencias. Después de la UAT no hubo cambios visibles de producto, por lo que no se atribuye una repetición humana inexistente.

## Evidencia automatizada

### Gates finales previos al versionado técnico

- lint baseline: aprobado;
- TypeScript: aprobado;
- sintaxis Functions: `320/320`;
- unitarias completas: `355/355`;
- Emulator integral completo, secuencial y aislado: `232/232`, 27 grupos superiores, exit code `0`;
- build de producción: aprobado, 21 páginas generadas;
- `git diff --check`: aprobado.

Todos los gates Firebase utilizaron proyectos `demo-*`, loopback y datos sintéticos. No hubo acceso a datos Firebase remotos ni deploy.

### Verificación posterior al merge técnico

- TypeScript: aprobado;
- unitarias completas: `355/355`;
- Emulator focal E2-24: `8/8`;
- regresiones focales E2-01/E2-20 afectadas por recovery: `23/23`.

No se vuelven a ejecutar suites para este cierre porque la intervención es exclusivamente documental.

## UAT humana

La UAT humana aprobó el menú Owner, teclado y foco, apertura y cancelación de los tres diálogos, rename, archivo, blockers, stale, pérdida de acceso, navegación A→B, 360 px, zoom 200 %, single-flight, eliminación de A, nueva creación B, privacidad y no enumeración.

La creación humana de B aprobó después de corregir la interferencia del fixture. La pérdida de ownership se produjo mediante una mutación local controlada y no se presenta como transferencia canónica.

- Pérdida controlada de respuesta posterior al commit: `NO EJECUTADO`.
- Lector de pantalla real: `NO EJECUTADO`.

Estos dos escenarios no bloquean el cierre. La ficha admite que corrupción, carreras y pérdida de respuesta se demuestren programáticamente si el límite queda registrado, y Documento 5 exige evidencia proporcional al criterio, no una técnica específica inexistente. La pérdida posterior al commit está cubierta por idempotencia, receipts y recovery automatizado, pero no se atribuye a observación humana. Teclado, foco, semántica ARIA y pruebas no sustituyen ni permiten declarar una sesión con lector de pantalla real. Ambos quedan como límites de verificación honestamente declarados.

## Recovery programático

La ejecución programática local independiente confirmó crear A, renombrar A, eliminar A, crear B y recuperar delete, creación y rename históricos. También verificó conflictos por reutilización incompatible y `GROUP_NOT_ACCESSIBLE` para otra key u operación nunca confirmada.

Los resultados históricos devolvieron `currentGroup: null`, no expusieron el nombre previo ni el ID de B, y no alteraron B o su guard. Esta evidencia es programática/automatizada; no se presenta como UAT visual ni como pérdida controlada de respuesta posterior al commit observada por una persona.

## Inspección persistente

La inspección en Firestore Emulator confirmó:

- A físicamente ausente y su guard liberado;
- exactamente un deletion receipt cerrado, privado y sin campos prohibidos;
- dos receipts E2-20 previos preservados;
- B activo con un guard que apunta exclusivamente a B;
- Temporada, Membresía, Solicitudes, Grupo archivado y otros Agregados intactos;
- preparación, cancelación, blockers, stale y pérdida de ownership sin escrituras de delete;
- ausencia de cascadas y de resurrección de A.

## Incertidumbre histórica E2-06

Una ejecución histórica de la focal E2-06 agotó reintentos transaccionales del Emulator a los nueve segundos; una repetición inmediata aprobó `13/13` sin cambio funcional. En la auditoría E2-24 aprobaron la focal E2-06 `13/13` y el integral posterior `232/232`.

Las corridas verdes demuestran solamente que la falla no se reprodujo allí. La causa histórica no quedó determinada, no se atribuye exclusivamente a infraestructura y no se afirma que una condición de saturación haya desaparecido.

## Exclusiones, riesgos y estado del plan

E2-24 no habilita:

- eliminación de Grupos archivados, legacy o con actividad/historia;
- borrado en cascada, cleanup, TTL, migración, backfill o reparación silenciosa;
- desarchivo, transferencia de ownership o permisos delegados;
- creación simultánea de múltiples Grupos o una política comercial definitiva;
- modificación de Temporadas, Membresías, Períodos, Solicitudes u otros Agregados;
- deploy, acceso a Firebase remoto o habilitación de E3.

CU-015 queda cerrado únicamente dentro del alcance aprobado. E2-14 y Etapa 2 permanecen abiertas y E3 continúa deshabilitada. Conforme a D5-041, el diferimiento de CU-013 no cierra por sí solo los restantes gates ni habilita E3.

El siguiente paso es reevaluar los pendientes y gates de E2-14 sobre el estado integrado de Etapa 2. Este cierre no ejecuta esa reevaluación, no presume que todos los pendientes estén resueltos y no cierra E2-14 ni Etapa 2.

## Evaluación de cierre

La evidencia satisface los criterios comunes de salida de Documento 5: comportamiento, frontend, Functions y Rules son compatibles; Grupo conserva una única fuente de verdad; no quedan lectores o escritores anteriores necesarios para CU-015; la evidencia técnica y los retiros están justificados; los gates, UAT, recovery e inspección se clasifican por su naturaleza; y la trazabilidad identifica definición, implementación e integración.

No se detectó un gate obligatorio faltante. Los escenarios `NO EJECUTADO` permanecen expresamente como límites y no se reclasifican como aprobados.

## Veredicto

`E2-24 CERRADO — E2-14 Y ETAPA 2 ABIERTAS — E3 DESHABILITADA`
