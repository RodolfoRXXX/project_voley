# E2-12 — Finalización administrativa de la Membresía activa de un tercero por el Owner

## Estado

**APROBADA — revisión documental final.** Esta ficha define el incremento futuro, no acredita implementación, pruebas ejecutadas ni UAT realizada. Fecha de definición y aprobación documental: 2026-09-15. El corte de autoridad previo a su versionado es `dev == origin/dev == 191b3590479cad024a55db0e5d231a76438b0d7b`.

Preflight: rama `dev`, upstream `origin/dev`, divergencia `0/0`, merge-base en ese mismo SHA, árbol e índice limpios antes de crear esta ficha, cero stashes. `chore/preserve-auth-emulator-uat-changes` permanece en `fc7135e358902a17372d44f20df50883603520ce`, no ancestro de `dev`. No había ficha, rama ni commit E2-12 previo. Git requirió `git -c safe.directory=C:/Users/Rodolfo/Documents/projectoVoley` por comando; no se alteró la configuración global.

## Fuentes y prevalencia

Se revisaron, en orden: [Documento 1](../../arquitectura/Documento-1-Arquitectura-del-Producto-y-Modelo-de-Dominio-6.5.pdf), [Documento 1.5](../../arquitectura/Documento-1.5-Modelo-Conceptual-del-Dominio-AUD-C03.pdf) y [Documento 2](../../arquitectura/Documento-2-Modelo-Funcional-y-Casos-de-Uso-AUD-C04.pdf); [Documento 3 AUD-C05](../../arquitectura/Documento-3-Arquitectura-Funcional-y-Dise-o-Tecnico-AUD-C05.pdf) y su [adenda](../../arquitectura/Documento-3-AUD-C05-aclaracion-periodos-vigencia.md); [Documento 4 AUD-C05](../../arquitectura/Documento-4-Dise-o-de-la-Arquitectura-de-Software-AUD-C05.pdf) y su [adenda](../../arquitectura/Documento-4-AUD-C05-aclaracion-periodos-vigencia.md); [Documento 5 disponible](../../transicion/Documento%205%20-%20Plan%20de%20Implementación%20y%20Transición%20Técnica-borrador.md); fichas, informes y cierres [E2-01 a E2-11](.); [cierre Etapa 0](../etapa-0/E0-10-cierre-consolidado-etapa-0.md), cierres [Etapa 1](../etapa-1/), [auditoría técnica](../../transicion/Informe%20de%20auditoría%20técnica%20del%20repositorio%20actual%20producido%20por%20Codex.md) y, finalmente, código actual como evidencia técnica.

Documento 2, CU-027 y RF-20 autorizan la finalización de Membresía y exigen Temporada abierta para cambiar su estado. El modelo de ownership otorga al único Owner vigente control de administración del Grupo. AUD-C05 prevalece sobre las cláusulas identificadas de AUD-C04 para el ciclo de vida: cada finalización cierra exactamente el período abierto, conserva los períodos históricos y confirma raíz, período, resumen y guards en una unidad de consistencia. [E2-09](E2-09-cierre.md), [E2-10](E2-10-cierre.md) y [E2-11](E2-11-cierre.md) concretan schemas, reactivación, salida propia y roster; sus decisiones no se reabren. Documento 5 contiene numeración preliminar y no desplaza los cierres efectivos E2-01 a E2-11. El código sólo verifica superficies y consumidores existentes; no crea autoridad normativa.

## Objetivo, alcance y exclusiones

El Owner vigente selecciona desde `Integrantes` una referencia opaca `membershipId` de otra Persona, confirma una decisión administrativa y el backend finaliza de forma autorizada, durable e idempotente la **activación vigente exacta** de esa Membresía. Se reutiliza CU-027 y la transición de dominio `finalizeMembership`; se adapta E2-11 para selección, confirmación, feedback y recarga.

El alcance incluye activa v1/v3, revalidación completa, período, guards, intent durable, concurrencia, privacidad, pruebas y UAT local. No incluye salida propia E2-10, expulsión, sanción, suspensión, revocación de roles o acceso ajeno a la pertenencia, bloqueo de reingreso, lista negra, motivos sensibles, eliminación de Persona o historia, cambios automáticos de Solicitudes, permisos delegados, administración general de Grupo, cierre de Temporada, CU-029, Actividad, notificaciones, migraciones, limpieza global de arrays legacy, Plan/Suscripción, deploy o Firebase remoto. Tampoco integra la rama Auth/UAT aislada.

## Terminología y efecto funcional

El nombre normativo es **finalización administrativa de la Membresía activa de un tercero**. La etiqueta visible será **“Finalizar Membresía”**. “Dar de baja a un integrante” puede describir coloquialmente la desaparición del roster, pero no nombra el estado persistido. “Expulsar” implica una medida disciplinaria no definida aquí. “Suspender” implica una vigencia reversible o temporal distinta. “Revocar acceso” podría afectar roles, permisos u otros recursos y tampoco es el efecto de CU-027.

La operación termina la pertenencia actual Persona–Grupo en la Temporada exacta y conserva la raíz, `fechaIngreso`, Persona, períodos cerrados e historia externa. No altera ownership, Grupo ni Temporada; no elimina ni reescribe Solicitudes; no sanciona ni impide automáticamente una nueva Solicitud o reactivación aprobada por E2-06/E2-07/E2-09. Una finalización no declara que la Persona nunca integró el Grupo.

## Actor, sujeto y autorización

Actor: UID autenticado con Cuenta canónica compatible, Persona propia vinculada y **ownership vigente** de un Grupo canónico activo. Sujeto: una Membresía activa de **otra Persona** en ese Grupo y su Temporada abierta exacta. La Persona propia es necesaria para comprobar la prohibición de autoobjetivo; un Owner sin Persona puede consultar E2-11, pero recibe `PERSON_REQUIRED` en E2-12. Un Owner no necesita Membresía propia para administrar terceros. Si posee una, la fila propia carece de acción y el backend devuelve `TARGET_IS_SELF`; para finalizarla usa E2-10.

Un integrante común, un global admin, un claim, `users.roles`, `memberIds`, `adminIds`, `admins`, un BFF legacy o conocer `membershipId` no autoriza. Sólo existe un Owner vigente: no se introduce “otro Owner” ni rol nuevo. La propiedad se revalida junto con la raíz en la transacción; una transferencia antes del commit hace fallar al Owner anterior, y una transferencia posterior no revierte el cierre. Un retry confirmado sólo recupera el resultado para el mismo actor si conserva Cuenta, Persona propia y acceso vigente al Grupo; si perdió ownership responde `GROUP_NOT_ACCESSIBLE`, sin escritura ni exposición del efecto. El intent histórico queda intacto. Un nuevo Owner puede iniciar su **propia** decisión con clave nueva sobre una activación que siga activa; no adopta el intent anterior.

## Contrato público cerrado

Callables autenticadas definitivas:

```text
prepareActiveGroupMemberFinalizationForOwnedGroup({ groupId, membershipId })
→ { person: { firstName, lastName }, activationRef }

finalizeActiveGroupMemberForOwnedGroup({ groupId, membershipId, activationRef, idempotencyKey })
```

“Member” identifica la selección en el roster; el efecto y la fuente de verdad siguen siendo Membresía. Ambas entradas son objetos planos con prototipo normal o nulo y propiedades **exactamente** enumeradas; se rechazan `null`, arrays, instancias y extras. `groupId` y `membershipId` son strings sin `/`, sin espacios extremos y de 1 a 1500 bytes UTF-8, consistentes con IDs de documento opacos; `idempotencyKey` cumple `^[A-Za-z0-9._:-]{16,128}$`; `activationRef` es un SHA-256 hexadecimal minúsculo de 64 caracteres emitido por `prepare`. Todos los campos de cada contrato son obligatorios. Errores de forma: `VALIDATION_FAILED`. No se aceptan UID objetivo, `personId`, `seasonId`, estado, ordinal, timestamps, guards, roles, permisos, `decidedBy`, `fechaEgreso`, filtros ni ruta Firestore. `reason` **se excluye**: CU-027 y los cierres no definen catálogo, necesidad ni política para texto sensible; no se persiste texto libre ni se inventa historial disciplinario.

`prepare` es read-only, revalida Cuenta, Persona propia, Grupo/ownership, Membresía, Persona objetivo, Temporada, guards y período de la activación actual, y devuelve nombre/apellido canónicos más una referencia opaca. `activationRef` es el SHA-256 con dominio `sportexa:E2-12:administrative-finalization-activation-ref:v1` del encoding length-prefixed de actor UID, Persona propia, Grupo, Membresía, Persona objetivo, Temporada, ordinal, ID del período vigente y versión del active guard. El digest no expone esos valores. No es firma de autoridad: un cliente capaz de conocerlo o fabricarlo sigue sin poder omitir ninguna validación backend. Si cualquier correlación cambia entre `prepare` y `finalize`, el backend devuelve `MEMBERSHIP_ACTIVATION_CHANGED` sin cerrar la nueva activación. Una nueva reactivación exige repetir `prepare`, mostrar la nueva confirmación humana y generar clave nueva. La referencia no se añade al DTO cerrado E2-11 ni modifica su reader.

Salida exitosa cerrada:

```json
{ "outcome": "MEMBERSHIP_FINALIZATION_CONFIRMED", "effect": { "membershipId": "opaque-membership-id", "finalizedAt": "ISO-8601 UTC" } }
```

El retry de la misma decisión devuelve esa misma forma y los mismos valores, incluso si luego hubo reactivación o cierre de Temporada, siempre que el actor conserve acceso al Grupo. `effect` identifica un **cierre histórico**, no promete que la raíz siga finalizada hoy. No se expone ordinal, UID, `personId`, `seasonId`, Owner, guards, hashes, intent ID, paths, documentos ni períodos. Errores tienen forma cerrada `{ reason, message }` con mensaje genérico estable y sin PII; `membershipId` ajeno no se confirma ni refleja.

## Resolución autoritativa y dominio

La primera ejecución lee el intent determinista y revalida Cuenta, vínculo Cuenta–Persona, Persona propia, Grupo activo y `ownerId == uid` dentro de la transacción. Si no existe un intent terminal correlacionado, lee la raíz por el `membershipId` recibido como **referencia**, comprueba `groupId` exacto y `personId` objetivo distinto del propio, valida Persona objetivo canónica compatible y `seasonId` de la raíz, no del cliente. La Persona objetivo ausente o incompatible impide una nueva finalización; la política tolerante de presentación `UNAVAILABLE` de E2-11 no autoriza una escritura. Antes de invocar CU-027 recomputa `activationRef` desde la activación vigente autoritativa y exige igualdad con la referencia confirmada; un token viejo jamás selecciona el ordinal nuevo.

La raíz debe ser activa v1 o v3 estricta, única activa de la pareja Persona–Grupo mediante consulta acotada `limit(2)`; se verifica también la ausencia de duplicados o lifecycle incompatible en la coordinación vigente. El active guard determinista para la pareja debe existir con schema v1/v2 compatible, apuntar a la misma raíz, Persona, Grupo y Temporada y expresar la activación exacta. En v1 el ordinal vigente es 1 y no debe haber períodos inesperados; en v3, `activationOrdinal == periodCount`, `latestPeriodId` determinista, exactamente un período abierto, primer/último período y resumen íntegros. Los períodos cerrados previos no se tocan. Se exige ausencia de active y lifecycle simultáneos, huérfanos, referencias cruzadas o corrupción. Schema desconocido falla cerrado; nunca se adopta ni repara una raíz.

Se consulta mediante capacidad pública de Grupos el open season guard y la Temporada **exacta** de esa Membresía, dentro de la misma transacción: Grupo correspondiente, schema compatible, estado `abierta` y correlación completa. Un active guard de otra Temporada es `INCOMPATIBLE_STATE`, no selección de Temporada alternativa. Los datos visuales conservados por el frontend, incluso `isOwner`, `person` y `joinedAt`, no participan en la autorización ni en el timestamp.

El dominio reutiliza `finalizeMembership`/CU-027: estado `finalizada`, `fechaEgreso` generado una sola vez por intento transaccional en backend, `fechaIngreso` inmutable, `fechaEgreso >= fechaIngreso` y `fechaEgreso == endedAt == lifecycle.finalizedAt`. Se permite `startedAt == endedAt`, como en E2-09/E2-10; no se inventan fechas. Una activa v1 materializa el primer período ordinal 1 usando exclusivamente `fechaIngreso` y lo cierra en el mismo commit, elevando la raíz a v3. Una activa v3 sólo cierra el período abierto existente. No se crea otra Membresía ni una nueva activación.

## Persistencia e intent administrativo

Estructuras de Membresía existentes: `memberships/{membershipId}` v3 finalizada, `memberships/{membershipId}/validityPeriods/{periodId}` cerrado, retiro de `activeMembershipGuards/{personGroupGuardId}` y creación de `membershipLifecycleGuards/{personGroupGuardId}` v2 con ordinal finalizado y mismo timestamp. Se conserva el ID determinista de período y guards aprobado por E2-09; no se agrega índice para el comando, que usa refs deterministas y consultas de integridad existentes.

Nueva colección técnica específica: `membershipAdministrativeFinalizationIntents/{intentId}`. Schema cerrado `schemaVersion: 1`, `action: "FINALIZE_ACTIVE_THIRD_PARTY_MEMBERSHIP"`, `actorUserId` derivado, `actorPersonId` derivado, `groupId`, `membershipId`, `targetPersonId` derivado, `seasonId` derivado, `activationOrdinal` derivado sólo cuando la activación confirmada por la referencia puede correlacionarse autoritativamente, `activationRefHash`, `idempotencyKeyHash`, `requestHash`, `status: "consumed"`, `outcome`, `createdAt`, `completedAt` y, sólo en éxito, `finalizedAt`. Un rechazo por referencia obsoleta no registra como ordinal de esa decisión el ordinal vigente N+1. El campo `targetPersonId` es correlación técnica privada, no dato público ni snapshot. El intent no es Agregado, período, historia funcional, motivo ni autoridad de pertenencia.

`intentId` es SHA-256 hexadecimal del encoding length-prefixed de `['sportexa:E2-12:membership-administrative-finalization-intent:v1', actorUserId, idempotencyKey]`; el key hash usa un dominio distinto con esos dos valores. `requestHash` usa otro dominio y `['contract-v1', actorUserId, actorPersonId, groupId, membershipId, activationRef]`. `activationRefHash` usa un cuarto dominio sobre la referencia recibida; ni la clave ni la referencia crudas se persisten. **El ordinal no lo aporta el cliente**: queda fijado como campo autoritativo del intent consumido y está ligado al digest opaco confirmado. Así, misma clave y mismo payload recuperan la activación históricamente cerrada; misma clave y otro Grupo, Membresía, referencia de activación o Persona propia producen `IDEMPOTENCY_CONFLICT` antes de leer/modificar otra activación. Un intent success no puede referirse a dos ordinales.

Los intents consumidos son inmutables y sin TTL. Se conservan durante todo el horizonte funcional de retries; cualquier archivo futuro exige tombstone consultable por el mismo ID y outcome, de modo que nunca se libera una clave para una activación posterior. No hay estado “pending” fuera de transacción ni reconciliación multi Agregado: el commit confirma efecto e intent juntos o ninguno. Para una decisión válida y autorizada que pierde una carrera o encuentra un target del mismo Grupo pero ya inactivo/cambiado, se consume un intent terminal de rechazo con su outcome sanitizado y ordinal si fue resoluble; el retry de esa clave recupera ese rechazo y una nueva decisión exige confirmación y clave nueva. No se crea intent para no autenticado, Cuenta/Persona ausente, Grupo no accesible, objetivo externo o inexistente, corrupción o dependencia temporalmente indisponible: no se reclama autoridad ni se congela un diagnóstico que puede ser transitorio. `IDEMPOTENCY_CONFLICT` tampoco reescribe el intent existente.

## Atomicidad y Temporada

**Una transacción Firestore** lee todo el contexto antes de escribir y confirma, para un éxito, raíz finalizada, `fechaEgreso`, cierre del único período abierto o materialización/cierre v1, resumen `latestPeriodId`/`periodCount`, delete del active guard, create del lifecycle guard e intent `consumed` con resultado. El intent pertenece técnicamente a la misma transacción, aunque conceptualmente sea coordinación e idempotencia y no estado del Agregado. Firestore serializa conflictos sobre raíz, guard, período, Grupo, Temporada/open guard e intent leídos. Cuenta, Persona, Grupo, open guard y Temporada son contexto read-only. No se escribe en Grupo, Temporada, Persona, Cuenta, Solicitud ni sus guards o intents; no hay transacción global ni doble escritura legacy.

Una **primera** finalización sólo confirma si la Temporada exacta sigue abierta hasta el commit. Si el cierre de Temporada confirma primero, se responde `MEMBERSHIP_SEASON_NOT_MODIFIABLE` sin transición; si la finalización confirma primero, el cierre posterior no la revierte. Un retry de intent confirmado recupera el resultado sin escritura aunque esa Temporada esté cerrada. El retry no busca la Temporada vigente ni selecciona CU-029. Una active guard de otra Temporada, una renovación futura o una raíz de nueva Temporada jamás se atribuyen al intent anterior; CU-029 permanece fuera de E2-12.

## Concurrencia y recuperación

| Interleaving | Resultado definido |
| --- | --- |
| Misma clave y payload concurrentes | un commit; el otro lee intent `consumed` y devuelve mismo outcome sin escritura |
| Misma clave, payload distinto | `IDEMPOTENCY_CONFLICT`; ninguna segunda transición |
| Dos claves administrativas para la misma activación | una confirma; la otra, tras relectura, consume rechazo `TARGET_MEMBERSHIP_NOT_ACTIVE` o `MEMBERSHIP_ACTIVATION_CHANGED`, nunca éxito ajeno |
| E2-10 contra E2-12 | sólo un cierre del ordinal; el perdedor no se atribuye el efecto del ganador y conserva su outcome propio conforme a su contrato |
| Transferencia de ownership | la primera ejecución observa un único Owner vigente al commit; actor anterior pierde autoridad si la transferencia ganó; retry histórico sin ownership no expone resultado |
| E2-09 reactivación contra finalización | si reactivación N confirma primero, E2-12 puede cerrar N; E2-09 finaliza su coordinación con `MEMBERSHIP_REACTIVATION_SUPERSEDED` si aún no aprobó Solicitud; si aprobación confirmó antes, conserva su resultado histórico y el cierre posterior es válido |
| Reactivación posterior a cierre N | una nueva finalización requiere nuevo `prepare`, confirmación y clave; retry del intent N sólo devuelve N y no cierra N+1 |
| Activación reemplazada entre `prepare` y confirmación | digest opaco distinto: `MEMBERSHIP_ACTIVATION_CHANGED` sin cerrar N+1; la UI prepara otra decisión |
| Cierre de Temporada | serialización sobre Temporada/open guard: finalización previa válida o rechazo sin escritura si cierre ganó |
| Raíz finalizada, guard retirado o activación reemplazada entre lectura y commit | retry transaccional revalida; rechazo terminal correlacionable o `INCOMPATIBLE_STATE`, nunca adopción de cierre ajeno |
| Respuesta perdida tras commit | mismo actor, acceso y clave recuperan outcome/timestamp del intent, sin segundo período ni guard |

La comparación se hace con la activación exacta de raíz, guard y período, no con la impresión de la UI. Una Membresía ya finalizada por E2-10, E2-05 u otra clave administrativa **no** es éxito de este intent. Si la pérdida de respuesta es ambigua, el backend relee primero intent y contexto de autorización; si el intent correlacionado está consumido, recupera su outcome; si no, reintenta con la misma clave y validaciones completas. Nunca recalcula `finalizedAt` de un commit confirmado.

## Outcomes públicos sanitizados

| `reason` / outcome | Uso |
| --- | --- |
| `MEMBERSHIP_FINALIZATION_CONFIRMED` | único éxito; mismo valor en retry exacto |
| `UNAUTHENTICATED`, `ACCOUNT_REQUIRED`, `PERSON_REQUIRED` | autenticación o identidad canónica del actor insuficiente |
| `VALIDATION_FAILED` | payload no cerrado o inválido |
| `GROUP_NOT_ACCESSIBLE` | Grupo inexistente, ajeno, Owner transferido o no autorizado; indistinguibles |
| `TARGET_MEMBERSHIP_NOT_ACCESSIBLE` | ID inexistente o de otro Grupo tras ownership autorizado; no revela cuál |
| `TARGET_IS_SELF` | Persona objetivo igual a la propia; usar E2-10 |
| `TARGET_MEMBERSHIP_NOT_ACTIVE` | raíz propia del Grupo ya finalizada sin intent exacto correlacionado |
| `MEMBERSHIP_SEASON_NOT_MODIFIABLE` | Temporada exacta ausente/cerrada/cambiada antes de primer commit |
| `MEMBERSHIP_ACTIVATION_CHANGED` | referencia de activación confirmada no coincide con activación vigente de la misma raíz; nuevo `prepare` y confirmación requeridos |
| `IDEMPOTENCY_CONFLICT` | misma clave del actor, request distinto |
| `INCOMPATIBLE_STATE` | schema, Persona, cardinalidad, guard, período o correlación corruptos; sin reparación |
| `DEPENDENCY_UNAVAILABLE`, `INTERNAL_ERROR` | falla temporal o inesperada sanitizada; no afirmar cierre sin intent confirmado |

Los rechazos terminales consumidos por intent repiten el mismo `reason` al reintentar, sin cambios. Para Membership de otro Grupo o inexistente se usa la misma respuesta, sin indicar su pertenencia, Persona, Temporada ni estado. Una corrupción interna devuelve `INCOMPATIBLE_STATE` genérico sólo tras autorizar el Grupo y confirmar que la referencia pertenece a ese ámbito; antes de eso prevalece `TARGET_MEMBERSHIP_NOT_ACCESSIBLE` o `GROUP_NOT_ACCESSIBLE`. Los mensajes UI son claros pero no contienen detalles internos.

## Solicitudes y frontera entre Agregados

Las Solicitudes aprobadas anteriores y sus `approvalEffect`/ordinal conservan historia durable; no se borran ni reescriben aunque la Membresía se finalice. Las pendientes y sus guards no se aprueban, rechazan, cancelan ni eliminan automáticamente. Una Solicitud nueva posterior se procesa por E2-06/E2-07/E2-09 si sus reglas lo permiten; E2-12 no promete admisión ni bloqueo. Los guards de Solicitud no sustituyen estado ni guard de Membresía.

Una aprobación concurrente usa las unidades separadas de E2-09. Si Solicitud confirma aprobación antes de E2-12, la aprobación histórica permanece y E2-12 puede cerrar después. Si E2-12 cierra la activación reactivada antes de la fase terminal de Solicitud, esta queda pendiente, el decision intent de aprobación conserva `MEMBERSHIP_REACTIVATION_SUPERSEDED` y se libera coordinación; no hay rollback de la finalización. Para creación inicial concurrente, la transacción de Membresía serializa la activación: E2-12 sólo puede finalizar una raíz ya activa y correlacionada, y el flujo de Solicitud conserva su propia comprobación terminal. No se inventa una transacción global.

## UX en roster E2-11

La sección `Integrantes` de `/dashboard/groups/[groupId]` conserva su reader, paginación y DTO. Cada fila de tercero con `person.status: "AVAILABLE"` ofrece **“Finalizar Membresía de {nombre} {apellido}”** como nombre accesible del control; la fila propia (`isOwner: true`) nunca lo ofrece. Con `UNAVAILABLE`, se conserva la fila informativa pero no se habilita acción administrativa hasta poder presentar inequívocamente el objetivo; el backend tampoco finaliza si Persona objetivo está ausente o incompatible. `isOwner` y el nombre sólo orientan la UI: backend siempre revalida.

Al abrir la acción, la UI llama a `prepare` en estado loading de sólo lectura y usa el nombre canónico devuelto para el diálogo accesible; si no puede preparar la fila, anuncia error y reconsulta. El diálogo dice “Se finalizará su pertenencia actual a este Grupo. Su Persona e historia se conservan; esta acción no impide por sí sola una nueva Solicitud”, con botones “Cancelar” y “Sí, finalizar Membresía”. Cancelar/Escape no llaman a `finalize` ni realizan escrituras. Confirmar obtiene una clave nueva y envía la misma `activationRef` preparada; la UI conserva ambos durante doble click, incertidumbre y retry del **mismo** payload. Loading bloquea doble envío y anuncia progreso. El éxito anuncia `MEMBERSHIP_FINALIZATION_CONFIRMED`, cierra el diálogo y **reconsulta** roster desde la primera página; no elimina optimistamente una fila, pues un retry histórico podría corresponder a una activación anterior. Error recuperable conserva clave, referencia y selección hasta retry o cancelación; para `TARGET_MEMBERSHIP_NOT_ACTIVE`, `MEMBERSHIP_ACTIVATION_CHANGED`, `MEMBERSHIP_SEASON_NOT_MODIFIABLE` o pérdida de acceso, se cierra la intención y reconsulta antes de ofrecer nueva acción.

Al abrir el diálogo y justo antes de confirmar, la UI puede reconsultar la fila/roster para detectar que dejó de estar activa, cambió de página o perdió identidad; si no está, deshabilita confirmación y devuelve foco al listado. Esa consulta mejora la experiencia, nunca sustituye revalidación backend. Tras cancelar se devuelve foco al disparador si existe; tras éxito o desaparición de fila se enfoca el encabezado/estado de `Integrantes`. Diálogo con foco inicial, trampa de foco, Escape, etiquetas, `aria-live`, error `role=alert`, controles táctiles de al menos 44 px y layouts de 360/768/escritorio sin scroll horizontal. No se muestran UID ni `membershipId` como texto.

## Seguridad, privacidad y observabilidad

Sólo la callable backend/Admin SDK escribe Membresía, período, guards e intent. Firestore Rules conservan deny-all para lecturas y escrituras cliente; la nueva colección de intents requiere deny-all explícito en implementación futura, sin abrir reglas sobre recursos existentes. La UI no escribe Firestore ni llama HTTP/BFF legacy para este flujo. `membershipId` es referencia opaca, no permiso ni prueba de estado. Respuestas evitan enumeración transversal y no incluyen UID, `personId`, paths, guards o documentos. No se conserva motivo libre ni PII en logs. Observabilidad mínima: acción, reason/outcome, clasificación de contención/dependencia, número de retry transaccional y correlación técnica no reversible; nunca clave cruda, nombre, email, UID, Persona, payload completo, paths, hashes identificables ni snapshots. Causas detalladas quedan sólo en manejo interno restringido; respuesta inesperada es `INTERNAL_ERROR` sanitizado.

## Compatibilidad

Activa v1 + active guard v1 correlacionados: la escritura autorizada eleva raíz a v3, materializa/cierra período 1 con `fechaIngreso` original y escribe lifecycle v2. Activa v3 + active guard v2: cierra sólo período vigente y conserva períodos anteriores. Finalizada v2/v3: no se sobrescribe; sólo un intent E2-12 confirmado exacto recupera resultado, y sin él no se reclama cierre ajeno. Versiones cruzadas o desconocidas fallan cerradas. No hay migración global, backfill ni fechas tomadas de guards/intents/logs. Retry no agrega período, lifecycle guard ni raíz. Readers E2-04/E2-11 mantienen su semántica de activas; una lectura concurrente puede observar orden normal de serialización, pero tras commit una consulta nueva excluye la finalizada de ambos listados actuales.

## Inventario del legado y disposición

| Elemento | Evidencia técnica y disposición E2-12 |
| --- | --- |
| `/dashboard/groups/[groupId]`, `ActiveGroupMembersSection` | **adaptar** sección roster canónica para acción y refresh; conservar reader E2-11 |
| `/admin/groups/[groupId]` y sus botones de baja | **aislar**; usan UID/`memberIds`/`users` y rol legacy, no `membershipId`; E2-12 no demuestra reemplazo total de esa ruta |
| `/admin/groups/[groupId]/members/[memberId]` | **aislar** detalle legacy por UID; no montar decisión E2-12 |
| `/admin/groups`, sidebar/navbar por `users.roles` | **fuera de alcance** navegación global legacy; no autoriza comando |
| HTTP `functions/src/httpApi.js` `POST /groups/{groupId}/members/{userId}/remove` | **aislar** writer de `groups.memberIds`; no retirar mientras su flujo y consumidores activos no estén sustituidos completamente |
| BFF `/api/groups/[groupId]/members/[userId]/remove`, búsqueda y add | **aislar**; contrato por UID y arrays, sin intent ni transición de Membresía |
| `/groups/[groupId]` pública y controles `removeMember` | **aislar**; todavía llama BFF legacy, no trasplantar al roster Owner canónico |
| `memberIds`, `adminIds`, `admins` y composición con `users` en `/profile/groups`, detalles y servicios | **fuera de alcance** limpieza global; jamás leerlos/escribirlos en E2-12 |
| `groupAdminsService`, páginas de perfil/detalle legacy | **fuera de alcance** consumidores aún activos de arrays/roles |
| `createMatch.js`, `eliminarMatch.js`, notificaciones de Partido | **fuera de alcance** participantes/alertas legacy; no reinterpretar `eliminarJugador` como CU-027 |
| `tournamentRegistrationService.js`, `tournamentQueries.ts`, modales y `TournamentEntryDetail` | **fuera de alcance** conteos y composición por arrays; sin migración incidental |
| E2-05/E2-10 `finalizeMembership`, stores/guards; E2-09 períodos; E2-11 roster | **reutilizar/adaptar** dominio e invariantes, con store e intent administrativo propios y autorización de tercero |

El retiro de un writer legacy sólo podrá proponerse en una intervención que demuestre sustitución completa de su flujo exacto y consumidores. E2-12 no escribe arrays ni usa su remoción como “confirmación” de Membresía.

## Pruebas exigidas antes de implementación cerrada

**Dominio/contrato:** `prepare` read-only y `finalize` con payloads exactamente cerrados; Owner finaliza tercero; `reason`/UID/Persona/Temporada/ordinal/fechas prohibidos; referencia opaca ligada a actor+activación, distinta tras reactivar y sin autoridad; `fechaIngreso` inmutable, timestamp único, activa v1 elevada a v3 con período 1, activa v3 con único cierre, finalizada v2/v3 intacta, schema desconocido, período v3 cero/dos abiertos, resumen, orden, `startedAt <= endedAt`, guard ausente/cruzado/coexistente y cardinalidad duplicada fallan cerrados. Resultados no contienen identificadores privados.

**Autorización/contexto:** no autenticado; Cuenta ausente; Persona propia ausente; integrante no Owner; global admin sin ownership; Grupo inexistente/ajeno/inactivo; Owner sin Membresía propia válido; objetivo propio rechazado; `membershipId` inexistente, de otro Grupo o Temporada; Persona objetivo ausente/incompatible; active guard de otra Temporada; open guard ausente/incompatible; Temporada exacta cerrada/cambiada. Se prueba que Grupo ajeno o raíz externa no revelan existencia.

**Persistencia/Emulator:** éxito atómico de raíz, período, resumen, replace guards e intent; falla de commit no deja estados parciales; intent determinista/schema/hashes sin clave cruda ni referencia cruda, terminal, sin TTL, deny-all; retry estable y pérdida de respuesta; misma clave con payload distinto; replay de `activationRef` viejo con **clave nueva** tras N+1 rechazado sin cierre; retry antiguo N con clave original tras reactivación N+1 no finaliza N+1; nuevo `prepare`, clave y confirmación sí pueden cerrar N+1; dos claves concurrentes dejan único ganador y rechazo durable; carrera E2-10, E2-09, transferencia, cierre de Temporada, raíz finalizada entre lectura y commit y active guard retirado. Inspección antes/después verifica Solicitudes aprobadas históricas intactas, pendientes y guards sin cambio, cero escrituras en Grupo, Temporada, Persona, Cuenta, arrays, Actividad y notificaciones.

**Frontend/arquitectura:** control sólo en filas de terceros `AVAILABLE`, ausencia en propia, selección opaca, `prepare` con nombre y referencia actuales, confirmación, cancelar sin escritura/llamada modificadora, doble envío bloqueado, clave y referencia conservadas al retry, error recuperable, refresh real tras éxito, fila stale antes de confirmar, foco/Escape/teclado/anuncios y 360/768/escritorio. Pruebas de reglas para visitante, integrante, Owner, admin global y autenticado genérico; UI sin escritura Firestore ni BFF; períodos sin Repositorio o superficie pública; Solicitud y Membresía sin transacción global. Ejecutar gates focales de unitarias, contractuales, Emulator, frontend y arquitectura pertinentes; no declarar UAT por pruebas automatizadas.

## UAT futura en Emulator local

Cuentas Google existentes del Emulator: A, Owner de Grupo canónico con Persona; B, integrante activo no Owner y Persona presentable; C, autenticado no Owner. Usar proyecto `demo-*`, Functions/Auth/Firestore Emulator y navegador local; no conectar Firebase remoto ni integrar la rama Auth/UAT aislada. Registrar IDs y clave del intento de prueba **sólo en evidencia local protegida** si se necesita replay; no publicarlos en UI o logs. Preparar B activo v3 en Temporada abierta, o fixture v1 específica para prueba técnica.

Recorrido **manual**: A abre `Integrantes`, ve a B y no ve acción sobre su fila propia; abre “Finalizar Membresía” de B, comprueba nombre y texto, cancela y verifica sin cambios; abre de nuevo y confirma; observa loading, éxito y roster reconsultado sin B. B reconsulta “Grupos que integrás” y ya no ve el Grupo. Inspección Emulator comprueba misma raíz finalizada, período cerrado, guard activo retirado, lifecycle/intent exactos, Grupo/owner/Temporada y Solicitudes sin cambios. Si el flujo de E2-06 lo permite, B crea posteriormente una nueva Solicitud; esto no equivale a admisión automática. C intenta el callable y recibe `GROUP_NOT_ACCESSIBLE`; la UI común no ofrece el control. Un retry de A con la clave original recupera el mismo cierre sin duplicar transición. Verificar cancelación, error, foco, teclado, anuncios y responsive.

Escenarios **no recorribles manualmente** con esta UI —dos commits concurrentes, respuesta perdida controlada, replay del ordinal 1 tras reactivación ordinal 2, corrupción v1/v3, guard incompatible, transferencia de ownership y cierre de Temporada— se acreditan con fixtures y tests deterministas de Emulator. El informe futuro distinguirá expresamente prueba manual, inspección persistente y Emulator; no atribuirá UAT manual a los casos técnicos.

## Riesgos y mitigaciones

| Riesgo | Mitigación verificable |
| --- | --- |
| Referencia de roster stale o externa | autorización y raíz/guard/período/Temporada releídos en backend; resultado transversal genérico |
| Retry viejo sobre nueva activación | intent durable por actor+clave, ordinal confirmado y recuperación antes de cualquier mutación |
| Dos comandos reclaman cierre ajeno | serialización transaccional e intent terminal del perdedor; no inferir éxito por `finalizada` |
| Owner transferido a mitad de operación | lectura de Grupo dentro de transacción y acceso vigente exigido para retry informativo |
| Aprobación E2-09 superada | coordinación/decision intent de Solicitud conservan `MEMBERSHIP_REACTIVATION_SUPERSEDED`; sin rollback global |
| Persona `UNAVAILABLE` de E2-11 | fila informativa sin acción; backend exige Persona objetivo compatible |
| Legado aparenta sincronía por arrays | aislar BFF/writers/consumidores; no doble escritura ni retiro sin cobertura completa |
| Motivo libre sensible | payload sin `reason`; sin catálogo o disciplina inventados |

## Criterios de aceptación Dado/Cuando/Entonces

1. **Dado** A Owner vigente, B tercero con activa v3 íntegra en Temporada abierta, **cuando** A confirma con clave nueva, **entonces** un commit finaliza esa activación, cierra exactamente su período, reemplaza guards y consume intent.
2. **Dado** una activa v1 correlacionada, **cuando** confirma CU-027 administrativo, **entonces** evoluciona a v3 y materializa/cierra sólo el período 1 desde `fechaIngreso` original.
3. **Dado** una fila propia del Owner, **cuando** se presenta el roster, **entonces** no muestra acción; un payload forzado devuelve `TARGET_IS_SELF`.
4. **Dado** integrante o global admin sin ownership, **cuando** conocen `membershipId`, **entonces** reciben `GROUP_NOT_ACCESSIBLE` y no escriben.
5. **Dado** ID inexistente o externo, **cuando** un Owner intenta finalizarlo, **entonces** recibe la misma respuesta `TARGET_MEMBERSHIP_NOT_ACCESSIBLE` sin enumeración.
6. **Dado** la misma clave/payload tras respuesta perdida, **cuando** A reintenta con acceso vigente, **entonces** recupera idéntico outcome y timestamp sin escritura.
7. **Dado** clave consumida para activación N y reactivación N+1, **cuando** A repite clave y referencia originales, **entonces** recupera N y N+1 sigue activa; finalizar N+1 requiere nuevo `prepare`, confirmación y clave.
8. **Dada** referencia preparada para N y una reactivación N+1 anterior al commit, **cuando** A confirma N con una clave nueva, **entonces** `MEMBERSHIP_ACTIVATION_CHANGED` y N+1 permanece activa.
9. **Dado** misma clave con otro payload, **cuando** se reintenta, **entonces** `IDEMPOTENCY_CONFLICT` sin tocar raíz ni intent.
10. **Dado** dos claves o E2-10 concurrentes, **cuando** compiten por el mismo ordinal, **entonces** sólo una transición confirma y ninguna otra se atribuye el cierre.
11. **Dado** cierre de Temporada anterior al commit inicial, **cuando** A confirma, **entonces** recibe `MEMBERSHIP_SEASON_NOT_MODIFIABLE` sin cambiar Membresía; un retry previamente confirmado después del cierre recupera su efecto sin escribir.
12. **Dado** transferencia anterior al commit o retry, **cuando** actúa el ex Owner, **entonces** recibe `GROUP_NOT_ACCESSIBLE`; el cierre ya confirmado no se revierte.
13. **Dado** aprobación/reingreso concurrente, **cuando** E2-12 cierra antes de la fase terminal de Solicitud, **entonces** E2-09 conserva `MEMBERSHIP_REACTIVATION_SUPERSEDED`, Solicitud pendiente y finalización válida.
14. **Dado** Solicitudes históricas aprobadas y pendientes, **cuando** A finaliza B, **entonces** ninguna cambia y una Solicitud posterior usa sus propios flujos.
15. **Dado** un schema/guard/período incompatible, **cuando** se invoca el comando, **entonces** falla cerrado sin reparar ni crear período/intent de éxito.
16. **Dada** una confirmación cancelada, **cuando** A cancela, **entonces** no hay llamada modificadora ni escritura; tras éxito el roster se reconsulta y B deja de figurar como activo.
17. **Dado** el commit E2-12, **cuando** se inspeccionan documentos vecinos, **entonces** Grupo, ownership, Temporada, Persona, Cuenta, Solicitudes, arrays legacy, Actividad y notificaciones permanecen iguales.

## Definition of Done futura

La implementación futura sólo podrá cerrarse cuando: contrato y dominio coincidan con esta ficha; autorización se compruebe dentro de transacción; raíz/período/guards/intent sean atómicos; intents permitan replay viejo sin afectar nueva activación; los outcomes y DTO sean cerrados; Firestore Rules mantengan deny-all incluido intent; todas las pruebas enumeradas y gates focales aprueben en Emulator; UAT manual y casos Emulator se registren por separado; roster muestre confirmación accesible y refresh; inventario legacy demuestre aislamiento sin retiro de writer con consumidores activos; no se alteren fuentes normativas ni Auth/UAT aislada. Cualquier desviación material requiere revisión documental antes de código. Deploy y Firebase remoto no son condición ni parte de E2-12.

## Decisiones pendientes

**Ninguna decisión humana bloqueante.** Nombre privado de helpers/store, organización reversible de archivos y formato de correlación técnica interna pueden resolverse durante implementación sin cambiar contrato, semántica, autorización ni invariantes. La política futura de archivo de intents, renovación CU-029, cierre real de Temporada, disciplina y sustitución global de writers legacy son incrementos separados; no se convierten en pendientes de esta ficha.

E2-12 APROBADA PARA IMPLEMENTACIÓN
