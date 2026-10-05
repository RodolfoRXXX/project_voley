# E2-24 — Informe de implementación, auditoría y UAT manual local

## 1. Estado y alcance

- Incremento: `E2-24 — eliminación de Grupo propio`.
- Rama: `feat/e2-24-delete-own-group`.
- HEAD auditado y usado para UAT: `403ee8424b82bc065ff91e14ba73993b4d6b5f52`.
- Proyecto UAT aislado: `demo-sportexa-e2-24-uat`.
- Fecha de UAT: 2026-10-05.
- Resultado: **UAT manual aprobada**, con los escenarios de pérdida controlada de respuesta posterior al commit y lector de pantalla real expresamente `NO EJECUTADO`.

Este informe no constituye cierre formal, commit, integración, publicación ni deploy. E2-14 y Etapa 2 continúan abiertas y E3 permanece deshabilitada. La ficha, el addendum, los Documentos 1–5 y los cierres no fueron modificados.

## 2. Implementación recibida

La implementación incorporó preparación y confirmación backend-only, borrado físico de la raíz elegible, deletion receipt privado, liberación atómica del control de creación, recuperación histórica de alta y rename, adaptación de Rules/HTTP/legacy y menú Owner compartido para editar, archivar y eliminar.

El preflight de auditoría recibió 27 archivos modificados y 8 nuevos. El preflight final recibió exactamente 28 modificados y 9 nuevos, con índice vacío, sobre la rama y HEAD indicados. Los cambios previos y la línea Auth/UAT aislada fueron preservados; no se usaron `reset`, `clean`, `stash` ni force push.

## 3. Auditoría adversarial previa

La auditoría corrigió los siguientes defectos comprobables:

1. restauró `CONFLICT` para el reuso incompatible del guard E2-01 vigente; `IDEMPOTENCY_CONFLICT` quedó reservado al recovery histórico autorizado por E2-24;
2. incorporó lectura, hidratación y correlación del `openSeasonGuard` para que un guard huérfano no sobreviva al delete;
3. liberó `sending/inFlight` cuando stale exige repreparar el diálogo de eliminación;
4. modeló `UPDATED_THEN_DELETED` en frontend y retiró detalle Owner-scoped de forma segura;
5. ligó rename a generación y `groupId` para descartar respuestas tardías A→B;
6. reforzó la exclusión de schemas canónicos presentes y futuros de superficies legacy en Rules, HTTP, triggers y pruebas.

La auditoría concluyó `E2-24 AUDITADO — LISTO PARA UAT MANUAL`, sin declarar interacción visual ni lector de pantalla aprobados.

## 4. Gates de auditoría

Ejecutados sobre el árbol corregido antes de esta UAT:

| Gate | Resultado |
| --- | --- |
| Unitarias completas | `355/355` |
| Unitarias focales de la corrección | `13/13` |
| Emulator focal E2-24 | `8/8` |
| Emulator focal E2-06 | `13/13` |
| Emulator integral secuencial | `232/232`, 27 grupos superiores, exit code `0` |
| Sintaxis Functions | `320/320` |
| TypeScript | Aprobado |
| Build frontend | Aprobado, 21 páginas |
| Lint baseline | Aprobado; 36 errores y 9 warnings históricos admitidos, 9 resueltos respecto del baseline |
| `git diff --check` | Aprobado; sólo avisos LF→CRLF |

Todos los gates Firebase utilizaron proyectos `demo-*`, loopback y datos sintéticos. No hubo acceso a datos Firebase remotos ni deploy.

### 4.1 Gates finales previos al versionado

Ejecutados el 2026-10-05 sobre el entregable final:

| Gate | Resultado |
| --- | --- |
| Lint baseline | Aprobado |
| TypeScript | Aprobado |
| Sintaxis Functions | `320/320` |
| Unitarias completas | `355/355` |
| Emulator integral completo, secuencial y aislado | `232/232`, 27 grupos superiores, exit code `0` |
| Build de producción | Aprobado; 21 páginas generadas |
| `git diff --check` | Aprobado; sólo avisos LF→CRLF |

La primera corrida integral expuso una interferencia entre fixtures: E2-10 suponía vacías dos colecciones globales que una suite E2-24 podía poblar legítimamente. La prueba se corrigió para comparar el inventario anterior y posterior de la propia suite, sin borrar datos ajenos ni reducir la garantía de ausencia de efectos laterales. La focal E2-10 aprobó `12/12`, las unitarias completas posteriores aprobaron `355/355` y el integral completo posterior aprobó `232/232`. No fue un defecto productivo ni una transferencia.

## 5. Entorno UAT local

- Frontend: `http://127.0.0.1:3000`.
- Emulator UI: `http://127.0.0.1:4000`.
- Functions Emulator: `127.0.0.1:5001`.
- Firestore Emulator: `127.0.0.1:8080`.
- Auth Emulator: `127.0.0.1:9099`.
- Proyecto: `demo-sportexa-e2-24-uat`.

El frontend se inició con variables de proceso que fijaron el project ID demo, `NEXT_PUBLIC_USE_EMULATOR=true` y Functions local. `.env.local` no fue modificado. La CLI descargó tooling público del Emulator; el project ID `demo-*` impidió alcanzar servicios no emulados. No se leyeron ni escribieron datos Firebase remotos.

Las identidades se crearon mediante el proveedor Google simulado de Auth Emulator:

- Owner: `owner.e224.uat@example.test`, UID `H4c4LsDAP9uyVmbAvitGZgDfNuvE`.
- Outsider: `outsider.e224.uat@example.test`, UID `MSfdLRBU2T82KTlyqinUDZj9pENY`.

## 6. Fixtures y clasificación de evidencia

Un helper temporal de Admin SDK, obligado a los hosts loopback exactos y al proyecto demo, creó:

- Grupo activo elegible;
- Grupo con Temporada cerrada;
- Grupo con Membresía finalizada;
- Grupo con Solicitudes pendiente, cancelada, rechazada y aprobada;
- Grupo archivado v2;
- dos Grupos para navegación A→B.

El singleton `groupCreationGuard` se apuntó programáticamente al Grupo recorrido en cada preparación. Esto fue preparación técnica de fixture, no interacción humana ni comportamiento público.

Para restablecer la precondición real de crear B después de eliminar A, los Grupos auxiliares dejaron de pertenecer al Owner mediante mutación local de `ownerId`. El primer intento de alta quedó bloqueado por “Por el momento podés administrar un único Grupo propio” porque el fixture deliberadamente daba varios Grupos al mismo Owner. Se clasificó como interferencia del fixture, no defecto E2-24. No se borraron las referencias auxiliares.

La pérdida de acceso se produjo cambiando y luego restaurando `ownerId` mediante Admin SDK local. No existió ni se declara una transferencia canónica.

Clasificación usada:

- **UAT humana:** interacción visible, teclado, foco, navegación, textos, responsive, single-flight y retiro de detalle.
- **Inspección persistente:** raíces, guards, receipts y referencias observados directamente en Firestore Emulator.
- **Programática/automatizada:** callables, retries, conflictos, recovery, privacidad de DTO e invariantes A/B.
- Ninguna observación programática se atribuye a UAT visual.

## 7. UAT humana guiada

La persona UAT reportó aprobados todos los escenarios marcados `OK`.

| Escenario | Estado | Evidencia humana |
| --- | --- | --- |
| Botón y menú Owner | `OK` | Botón `⋮` con nombre “Acciones del grupo”; orden Editar nombre / Archivar grupo / Eliminar grupo. |
| Operación del menú | `OK` | Mouse, Enter, Espacio, flechas, Home, End, Escape, Tab y clic exterior funcionaron; cierre conservó/retornó foco al disparador. |
| Menú → diálogo | `OK` | Sin conflicto de foco; Cancelar y Escape retornaron a `⋮`. |
| Rename | `OK` | El nombre se actualizó y el menú siguió operable. |
| Destructiva no sólo por color | `OK` | Texto/icono/semántica permitieron distinguir Eliminar. |
| Preparación elegible | `OK` | Estado de preparación, advertencia definitiva comprensible, foco inicial seguro y trap Tab/Shift+Tab. |
| Cancelación | `OK` | Cancelar y Escape no cambiaron persistencia y devolvieron foco. |
| Bloqueo por Temporada | `OK` | Una Temporada cerrada bloqueó sin revelar identidad, ID ni conteo. |
| Bloqueo por Membresía | `OK` | Una Membresía finalizada bloqueó sin revelar Persona, ID ni conteo. |
| Bloqueo por Solicitudes | `OK` | Solicitudes pendientes y terminales bloquearon; la UI no reveló estados, identidades ni cantidad. |
| Grupo archivado | `OK` | Sin menú, edición, archivo ni eliminación; F5 conservó read-only y datos autorizados. |
| Dos sesiones / stale por rename | `OK` | El primer delete no aplicó; se informó cambio, se repreparó con nombre vigente, se liberó `sending/inFlight` y se permitió una nueva confirmación. Se canceló la segunda decisión. |
| Navegación A→B con respuestas pendientes | `OK` | Con throttling real, preparación y rename de A no contaminaron nombre, diálogo, error ni estado de B. |
| Archivo E2-23 | `OK` | Conservó datos, quedó archivado/read-only, removió menú, dejó foco válido y persistió tras F5. |
| 360 px y zoom 200% | `OK` | Menú y diálogo operables, sin recorte horizontal bloqueante. |
| Doble activación / single-flight | `OK` | Doble activación rápida produjo una operación visible y una navegación final. |
| Delete A | `OK` | A desapareció de listado, dashboard y detalle; volver/F5 no restauró ni mostró detalle Owner-scoped. |
| Crear B con intención nueva | `OK TRAS AJUSTE DE FIXTURE` | Tras retirar ownership de Grupos auxiliares, el alta creó `Grupo UAT B posterior`, persistente tras F5, sin reaparición de A. |
| Outsider y missing | `OK` | Grupo B ajeno y A eliminado mostraron resultados indistinguibles, sin nombre, Owner, menú ni detalle. |
| Pérdida de acceso durante confirmación | `OK` | Tras mutación fixture de ownership, confirmar cerró diálogo, retiró todo el detalle, navegó a Grupos y liberó el estado de envío. |
| Pérdida controlada de respuesta posterior al commit | `NO EJECUTADO` | No se dispuso de un mecanismo que distinguiera demostrablemente pérdida posterior al commit de fallo previo al envío. Una navegación con throttling no alcanzó commit y no se reclasificó como recovery. |
| Lector de pantalla real | `NO EJECUTADO` | No se utilizó tecnología asistiva real. |

## 8. Inspección persistente

### 8.1 Caminos sin efecto

Preparación, Cancelar, Escape, blockers, stale y pérdida de ownership produjeron cero deletion receipts y conservaron las raíces/referencias correspondientes. El rename A durante navegación tardía no llegó al commit: A y B conservaron sus nombres y no apareció receipt; se clasifica como cancelación/navegación antes de confirmación efectiva.

### 8.2 Rename y archivo

El Grupo elegible acumuló exactamente dos receipts E2-20 por los dos renames humanos confirmados. El intento stale no agregó receipt de delete. El Grupo de navegación B quedó archivado v2 con nombre, deporte, Owner y `createdAt` preservados, un `archivedAt` nuevo y exactamente un archive receipt.

### 8.3 Delete humano de A

- A `e2-24-uat-eligible` quedó físicamente ausente.
- `groupCreationGuards/{ownerUid}` quedó ausente tras el commit.
- Se creó exactamente un deletion receipt con los diez campos aprobados: acción, actor, groupId, hashes de delete, hashes de creación, `deletedAt`, outcome y versión.
- El receipt no contiene nombre, deporte, Owner, snapshot, clave cruda, blockers ni referencias.
- Los dos receipts previos de rename se conservaron.
- Temporada, Membresía, cuatro Solicitudes, Grupos auxiliares y archivo permanecieron intactos; no hubo cascadas.

### 8.4 B humano

B `CZvYSZ5lRxFkTIqL7ff5` fue creado con una intención nueva. Su guard apunta exclusivamente a B y el deletion receipt histórico apunta exclusivamente a A. La pérdida de ownership creó cero receipts: antes de restaurar el fixture, B seguía activo, existente y con el mismo nombre.

## 9. Recovery programático local

Una identidad sintética independiente creó A, confirmó rename, eliminó A, creó B y ejecutó retries con claves conocidas. Resultados:

| Operación | Resultado |
| --- | --- |
| Crear A | `created` |
| Rename A | `UPDATED` |
| Delete A | `DELETED` |
| Crear B | `created` |
| Retry del mismo delete | `EXISTING_IDEMPOTENT` |
| Misma delete key con token/request incompatible | `IDEMPOTENCY_CONFLICT` |
| Otra delete key contra A eliminado | `GROUP_NOT_ACCESSIBLE` |
| Retry de creación A | `CREATED_THEN_DELETED` |
| Misma creation key con payload incompatible | `IDEMPOTENCY_CONFLICT` |
| Retry del rename confirmado de A | `UPDATED_THEN_DELETED` |
| Rename nunca confirmado sobre A | `GROUP_NOT_ACCESSIBLE` |

La inspección correlacionada confirmó A ausente, B activo, guard apuntando a B, `currentGroup: null` en ambos resultados históricos, ausencia del nombre previo y ausencia total del ID de B en el resultado histórico de A. Ningún retry recreó A, alteró B ni consumió/modificó su guard.

## 10. Hallazgos de UAT

No se encontraron defectos funcionales de producto.

Se encontraron dos interferencias de fixture. Durante UAT, los múltiples Grupos auxiliares con el mismo Owner activaron correctamente el límite provisional de alta; se corrigió la preparación retirando técnicamente su ownership, sin borrar referencias ni modificar código productivo, y el retest manual de creación B aprobó. Durante los gates finales, una aserción E2-10 asumía vacías colecciones globales compartidas; se corrigió localmente para verificar el inventario antes/después de su propia suite. Ninguna interferencia se clasifica como defecto productivo o transferencia.

No hubo correcciones productivas ni cambios de comportamiento visible posteriores a UAT; por tanto no correspondió repetir un escenario humano. Los gates finales y las revalidaciones programáticas realmente ejecutadas constan en la sección 4.

## 11. Incertidumbre E2-06

La evidencia histórica registra una focal E2-06 donde una transacción concurrente agotó reintentos del Emulator a los 9 segundos y una repetición inmediata aprobó `13/13` sin cambio funcional. En la auditoría E2-24 aprobaron tanto la focal E2-06 `13/13` como el integral posterior `232/232`.

Esas corridas verdes demuestran únicamente que la falla no se reprodujo allí. No determinan la causa histórica, no prueban que la saturación haya desaparecido y no autorizan atribuirla sólo a infraestructura.

## 12. Límites y resultado

- Durante implementación, auditoría y UAT consignadas no hubo Firebase remoto ni deploy; stage, commit, push y merge quedan fuera de esta evidencia previa al versionado.
- No se simuló observación humana.
- No se declaró recovery manual desde una simple desconexión o navegación.
- No se declaró lector de pantalla aprobado sin tecnología asistiva real.
- Los helpers temporales se retiran al cerrar la sesión y los servicios locales se detienen.

**E2-24 UAT MANUAL APROBADA**
