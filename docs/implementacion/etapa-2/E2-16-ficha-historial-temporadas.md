# E2-16 — Ficha de historial canónico de Temporadas (CU-019)

## Estado

**APROBADA — LISTA PARA VERSIONAR**

Esta aprobación es exclusivamente documental. No autoriza implementar, hacer commit, merge, push, deploy, acceder a Firebase remoto ni habilitar E3.

## 1. Identificación y preflight

| Afirmación | Clasificación | Determinación |
|---|---|---|
| El incremento es `E2-16 — Historial canónico de Temporadas` y materializa CU-019. | Normativa | CU-019 es “Consultar temporadas anteriores”. |
| La rama es `feat/e2-16-season-history`. | Consecuencia técnica | Verificada antes de editar. |
| Base, `HEAD` y upstream son `915832e77f4e6608fe192e651f9179da3dc6497d`. | Consecuencia técnica | Verificados antes de editar. |
| La divergencia con upstream es `0/0`. | Consecuencia técnica | Verificada antes de editar. |
| El estado inicial tenía sólo esta ficha no trackeada, índice vacío y cero stashes. | Consecuencia técnica | Verificado antes de editar. |
| E2-15 está cerrado e integrado; E2-14 y Etapa 2 siguen abiertas; E3 no está habilitada. | Normativa | E2-16 no altera esos estados. |
| Auth/UAT permanece aislada en `fc7135e358902a17372d44f20df50883603520ce`. | Consecuencia técnica | E2-16 no consume ni modifica esa rama. |

**Consecuencia técnica.** Una diferencia material en estos datos bloquea cualquier implementación posterior hasta repetir el preflight.

## 2. Clasificación y fuentes

Toda afirmación de esta ficha usa una de estas clases:

- **Normativa:** obligación proveniente de los Documentos 1, 1.5, 2, 3, 4 o 5 y sus adendas vigentes.
- **Decisión aprobable del incremento:** elección cerrada aquí dentro del margen dejado por la norma.
- **Consecuencia técnica:** resultado necesario del schema, contratos, plataforma o implementación integrada.
- **Limitación conocida:** propiedad que E2-16 declara y no puede garantizar.
- **Deuda:** trabajo válido pero expresamente posterior y no ocultado como garantía actual.
- **Supuesto no demostrado:** afirmación sin evidencia suficiente; no puede sostener una aceptación ni una garantía.

**Normativa.** La precedencia aplicada es: Documentos 1, 1.5 y 2; Documentos 3 y 4 AUD-C05; Documento 5 Markdown; E2-14; fichas, informes y cierres E2-02/E2-15; incrementos consumidores; y por último código, contratos, persistencia, Rules, índices, frontend y pruebas integrados. El código prueba el estado actual, pero no crea norma.

## 3. Hallazgos adversariales y resolución

| Hallazgo | Clasificación | Resolución aprobada |
|---|---|---|
| Los valores físicos vigentes son exactamente `"abierta"` y `"cerrada"`; `"abierta" < "cerrada"` es sólo un accidente lexicográfico. | Consecuencia técnica | Se prohíbe usar `orderBy("estado")` para materializar “actual primero”. |
| Una evolución compatible podría incorporar otro estado o renombrar uno y romper ese orden. | Limitación conocida | Se separan la consulta acotada de abierta y la consulta paginada de cerradas. |
| El writer E2-02 abre exclusivamente schema v1; E2-15 transforma esa misma raíz a cerrada v2 durante el cierre. | Consecuencia técnica | E2-16 lee abierta v1 y cerrada v2. |
| No existe una abierta v2 válida: el rehidratador y `closeSeason` integrados la rechazan. | Consecuencia técnica | Se elimina la compatibilidad preventiva con abierta v2. Admitirla sólo en el reader crearía un estado que el lifecycle no puede operar. |
| Todos los documentos producidos por los writers canónicos poseen `fechaInicio` civil `YYYY-MM-DD`. | Consecuencia técnica | Es orden válido para cerradas canónicas. |
| `orderBy("fechaInicio")` excluye documentos que carezcan del campo. | Limitación conocida | La consulta no es una auditoría global; no se interpreta una página vacía como prueba de ausencia física de corrupción. |
| CU-019 nombra temporadas anteriores, mientras Documento 1 y E2-15 distinguen activa e historial. | Normativa | Las cerradas constituyen el historial; la abierta se devuelve separadamente como contexto actual, no como fila histórica. |
| El frontend ya posee una UI propia para la abierta. | Consecuencia técnica | La implementación debe unificar la lectura/presentación sin mostrar dos autoridades ni dos filas “actuales”. |
| Un HMAC no concede ni refuerza autorización si cada llamada reautoriza y revalida el ancla. | Decisión aprobable del incremento | El cursor no lleva HMAC ni requiere secrets; se trata como entrada no confiable. |
| Firestore Emulator ejecuta consultas válidas sin controlar índices compuestos. | Limitación conocida | No se afirma que Emulator prueba existencia/ausencia del índice; se usan revisión estática y dobles locales. Un gate remoto futuro requerirá autorización separada. |

## 4. Objetivo, alcance y fronteras

**Normativa.** CU-019 conserva y consulta la información de Temporadas cerradas sin modificar Grupo, Temporada ni Membresía. La autoridad es el Owner vigente del Grupo.

**Decisión aprobable del incremento.** Una única callable devuelve dos conceptos inequívocos:

- `currentSeason`: la Temporada abierta actual o `null`;
- `closedSeasons`: sólo Temporadas cerradas, paginadas.

La composición mejora consistencia porque ambas partes se leen desde `seasons` en la misma transacción de cada llamada y con la misma autorización. No convierte `currentSeason` en historia, no duplica persistencia y no reemplaza la autoridad de la raíz Temporada.

**Decisión aprobable del incremento.** La UI presenta una sola sección de Temporadas con subsecciones “Actual” y “Anteriores”. La actual se muestra una sola vez y conserva sus comandos existentes fuera de la lista histórica. La ausencia total, la ausencia de actual y la ausencia de anteriores son estados diferentes.

**Normativa.** Quedan excluidos CU-017, CU-018 ya cerrado, CU-029, renovación, reapertura, reparación, migración, Membresías, rosters, invitaciones, Solicitudes, Partido, Torneo y cualquier comparación intertemporada.

**Decisión aprobable del incremento.** E2-16 no crea `seasonHistory`, proyecciones, receipts, guards, caches persistentes ni “última lectura”; no migra v1, no actualiza cursores y no escribe estado de dominio. Telemetría técnica no puede convertirse en persistencia funcional ni registrar payloads o identificadores.

## 5. Compatibilidad física real

| Forma | Clasificación | Campos persistidos exactos | Compatibilidad E2-16 |
|---|---|---|---|
| Abierta v1 | Consecuencia técnica | `groupId`, `nombre`, `fechaInicio`, `estado: "abierta"`, `createdAt`, `schemaVersion: 1` | Sí; es la única apertura producida hoy por E2-02/E2-15. |
| Cerrada v2 | Consecuencia técnica | `groupId`, `nombre`, `fechaInicio`, `estado: "cerrada"`, `createdAt`, `closedAt`, `closedBy`, `schemaVersion: 2` | Sí; E2-15 la produce al cerrar una abierta v1. |
| Abierta v2 | Supuesto no demostrado | No existe writer ni schema operativo aprobado; el dominio integrado la rechaza. | No. |
| Cerrada v1 u otra combinación | Consecuencia técnica | Estado/versión incompatible. | No. |

**Consecuencia técnica.** En ambas formas compatibles, ID documental y `groupId` son IDs canónicos; `nombre` está normalizado; `fechaInicio` es obligatoria y una fecha civil real `YYYY-MM-DD`; `createdAt` es Timestamp válido; no se aceptan campos desconocidos. Cerrada v2 exige `closedAt`, `closedBy` y `closedAt >= createdAt`; abierta v1 no admite campos de cierre.

**Consecuencia técnica.** E2-16 reutiliza o extrae del mismo dominio estas reglas; no mantiene un schema divergente exclusivo del historial.

**Limitación conocida.** Se valida todo documento materializado por las consultas, incluido lookahead y abierta. Un documento recuperado incompatible hace fallar la página completa con `INCOMPATIBLE_STATE`; nunca se omite silenciosamente. Esto no certifica la ausencia global de documentos corruptos: una cerrada sin `fechaInicio`, sin `groupId` o con valores que no satisfagan los filtros puede quedar fuera del resultado indexado. E2-16 no ejecuta scans ni reparaciones.

## 6. DTO y contrato públicos

**Decisión aprobable del incremento.** El contrato exacto es:

```text
listSeasonsForOwnedGroup({ groupId, pageSize?, cursor? })
```

**Decisión aprobable del incremento.** La entrada es cerrada. `groupId` es requerido; `pageSize` y `cursor` son opcionales; propiedades desconocidas se rechazan. No acepta UID, owner, Persona, Membresía, estado, orden, fechas, filtros, offset ni referencias Firestore.

```text
OpenSeasonHistoryDto = {
  id: string,
  nombre: string,
  fechaInicio: string,
  estado: "abierta",
  isCurrent: true
}

ClosedSeasonHistoryDto = {
  id: string,
  nombre: string,
  fechaInicio: string,
  estado: "cerrada",
  closedAt: ISO-8601 UTC string,
  isCurrent: false
}

SeasonHistoryPageDto = {
  currentSeason: OpenSeasonHistoryDto | null,
  closedSeasons: ClosedSeasonHistoryDto[],
  nextCursor: string | null,
  hasMore: boolean
}
```

**Decisión aprobable del incremento.** `id` se conserva por coherencia con los DTO públicos existentes. `groupId` se minimiza porque toda la respuesta ya está contextualizada por el Grupo. No se exponen `createdAt`, `closedBy`, UID, schema, hashes, guards, receipts, snapshots ni metadatos internos.

**Decisión aprobable del incremento.** `pageSize` significa siempre cantidad máxima de `closedSeasons`, por defecto y máximo `20`; sólo admite enteros `1..20`. `currentSeason` no consume un lugar y se devuelve en cada página para verificar que el contexto actual no cambió; el frontend la representa una sola vez.

## 7. Consultas, orden e índices exactos

**Decisión aprobable del incremento.** Dentro de una misma transacción de lectura se ejecuta primero la consulta acotada de abierta:

```js
db.collection("seasons")
  .where("groupId", "==", groupId)
  .where("estado", "==", "abierta")
  .limit(2)
```

Se hidratan cero o una. Dos resultados o una fila incompatible producen `INCOMPATIBLE_STATE`. No hay `orderBy`: no se elige una abierta arbitrariamente.

**Decisión aprobable del incremento.** Las cerradas se consultan exactamente así, con `FieldPath` de `firebase-admin/firestore`:

```js
db.collection("seasons")
  .where("groupId", "==", groupId)
  .where("estado", "==", "cerrada")
  .orderBy("fechaInicio", "desc")
  .orderBy(FieldPath.documentId(), "desc")
  .startAfter(last.fechaInicio, last.seasonId) // sólo con cursor
  .limit(pageSize + 1)
```

**Consecuencia técnica.** El cursor de valores tiene exactamente dos componentes y el mismo orden/dirección que los dos `orderBy`: `fechaInicio DESC`, luego ID documental `DESC`. `seasonId` se serializa como el string de ID sin `/`; al reconstruir `startAfter` se pasan el string civil y el ID, no un `DocumentReference` ni un snapshot.

**Consecuencia técnica.** El índice existente `seasons(groupId ASC, estado ASC)` cubre la búsqueda acotada de abierta. La consulta de cerradas requiere agregar este índice de colección:

```json
{
  "collectionGroup": "seasons",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "groupId", "order": "ASCENDING" },
    { "fieldPath": "estado", "order": "ASCENDING" },
    { "fieldPath": "fechaInicio", "order": "DESCENDING" }
  ]
}
```

**Consecuencia técnica.** `groupId` y `estado` aparecen porque son filtros de igualdad; su dirección no cambia la semántica de igualdad. Firestore añade `__name__` al índice en la dirección del último campo ordenado, aquí `DESCENDING`; por eso el JSON no declara `__name__` adicional y sí respalda el `orderBy(documentId(), "desc")`. Una dirección de ID distinta exigiría otro índice.

**Consecuencia técnica.** El índice actualmente integrado no cubre la consulta paginada porque carece de `fechaInicio DESC`; E2-16 debe añadir el índice anterior. No se necesita un índice por estado: abierta usa el existente y cerradas usa el nuevo.

**Decisión aprobable del incremento.** Un error de la consulta con código Firestore `9`/`failed-precondition` y señal canónica de índice faltante se traduce a `DEPENDENCY_NOT_CONFIGURED`. Otro `failed-precondition` no se clasifica por coincidencia amplia de texto. El adapter se prueba con errores simulados; el Emulator no demuestra despliegue del índice.

## 8. Paginación, cursor y ancla

**Decisión aprobable del incremento.** La consulta cerrada pide `pageSize + 1`. Se validan todas las filas obtenidas, incluida la extra; se entregan como máximo `pageSize`; `hasMore` es verdadero sólo si existe la extra; `nextCursor` se ancla en la última cerrada entregada. La fila de lookahead no se entrega ni se omite de la página siguiente.

**Decisión aprobable del incremento.** El cursor es base64url canónico de JSON UTF-8 canónico, máximo 2048 caracteres, con claves exactas:

```text
{
  v: 1,
  contract: "listSeasonsForOwnedGroup:v1",
  groupId: string,
  subjectHash: string,
  currentSeasonId: string | null,
  last: {
    fechaInicio: string,
    seasonId: string
  }
}
```

**Decisión aprobable del incremento.** `subjectHash` es SHA-256 base64url sobre un dominio fijo de contrato y el UID. Evita cruces accidentales sin exponer el UID; no es firma ni control de seguridad, porque el cliente puede conocer y reconstruir el formato. El token no contiene secretos ni datos sensibles y no expira: su validez depende del contrato, el contexto y el estado persistido.

**Decisión aprobable del incremento.** No hay secreto, `kid`, rotación ni HMAC. Cambios de configuración criptográfica no invalidan cursores. Alterar el cursor no concede acceso ni datos adicionales: cada llamada reautoriza y la consulta queda forzada al `groupId` autorizado. Un cursor puede, como máximo, seleccionar otro punto dentro de historia que el mismo Owner ya puede leer.

**Consecuencia técnica.** Se validan tamaño, base64url canónico, JSON canónico, claves exactas, versión, contrato, `groupId`, `subjectHash`, IDs y fecha. Forma/contexto inválido produce `CURSOR_INVALID` antes de `startAfter`.

**Decisión aprobable del incremento.** En continuación se lee directamente `seasons/{last.seasonId}` dentro de la misma transacción. Debe existir, pertenecer al Grupo, hidratar como cerrada v2 y conservar `fechaInicio` y estado cerrado. Después se reconstruye `startAfter(last.fechaInicio, last.seasonId)`. Eliminación, cambio de Grupo, schema, estado o campo de orden produce `CURSOR_STALE`.

**Decisión aprobable del incremento.** La consulta acotada de abierta se repite en cada página y su ID se compara con `currentSeasonId`. Una apertura, cierre o reemplazo de la abierta produce `CURSOR_STALE`, aun si el ancla cerrada no cambió. El coste adicional es acotado y no participa en una transacción entre llamadas; sólo la llamada individual tiene snapshot consistente.

## 9. Garantías multipágina y caso N/N+1

**Consecuencia técnica.** Cada llamada revalida Cuenta, Grupo y ownership, y lee actual, ancla y página en una transacción de sólo lectura. El cursor no autoriza, no congela datos y no es un snapshot multipágina.

**Decisión aprobable del incremento.** Caso obligatorio:

1. página 1 devuelve N como `currentSeason` y cerradas paginadas;
2. N se cierra;
3. se abre N+1;
4. página 2 repite la consulta acotada, observa un ID distinto del contexto del cursor y devuelve `CURSOR_STALE`;
5. el frontend descarta la acumulación y reinicia desde página 1.

**Limitación conocida.** Sin snapshot multipágina no se prometen simultáneamente cero duplicados, cero omisiones y durabilidad frente a toda mutación. El control de `currentSeasonId` y la revalidación del ancla detectan los cambios relevantes conocidos, pero una inserción o modificación de otra cerrada puede reordenar resultados. Si el frontend detecta un ID duplicado o una respuesta incoherente, no deduplica silenciosamente: reinicia.

## 10. Autorización, privacidad y Rules

**Normativa.** En cada llamada se exige identidad autenticada, Cuenta propia compatible, Grupo existente y ownership vigente. Persona, Membresía, rol global, cargo o arrays legacy no conceden acceso.

**Decisión aprobable del incremento.** Grupo inexistente y Grupo ajeno devuelven el mismo `GROUP_NOT_ACCESSIBLE`. Sólo después de confirmar ownership se puede exponer `GROUP_INCOMPATIBLE`.

**Consecuencia técnica.** Una transferencia entre páginas hace que el Owner anterior reciba `GROUP_NOT_ACCESSIBLE`. El nuevo Owner puede iniciar su propia paginación. Un cursor del Owner anterior falla por `subjectHash`, pero aun uno reconstruido nunca evita la autorización vigente ni filtra por creador/cerrador.

**Consecuencia técnica.** La callable usa Admin SDK; el frontend no accede Firestore directamente. `seasons`, `openSeasonGuards`, `seasonOpeningReceipts` y `seasonClosureReceipts` conservan `allow read, write: if false` para clientes. La respuesta se arma por whitelist.

## 11. Errores públicos estables

| Reason | Código callable | Clasificación | Semántica |
|---|---|---|---|
| `UNAUTHENTICATED` | `unauthenticated` | Normativa | Falta identidad. |
| `ACCOUNT_REQUIRED` | `failed-precondition` | Consecuencia técnica | Cuenta propia ausente/incompatible. |
| `VALIDATION_FAILED` | `invalid-argument` | Decisión aprobable del incremento | Payload o `pageSize` inválido. |
| `CURSOR_INVALID` | `invalid-argument` | Decisión aprobable del incremento | Forma, versión o contexto inválido. |
| `CURSOR_STALE` | `aborted` | Decisión aprobable del incremento | Actual o ancla cambiaron; reiniciar. |
| `GROUP_NOT_ACCESSIBLE` | `permission-denied` | Decisión aprobable del incremento | Grupo ausente o sin ownership, indistinguibles. |
| `GROUP_INCOMPATIBLE` | `failed-precondition` | Consecuencia técnica | Grupo propio no compatible. |
| `INCOMPATIBLE_STATE` | `failed-precondition` | Consecuencia técnica | Temporada recuperada o cardinalidad incompatible. |
| `DEPENDENCY_NOT_CONFIGURED` | `failed-precondition` | Consecuencia técnica | Índice requerido no desplegado. |
| `DEPENDENCY_UNAVAILABLE` | `unavailable` | Consecuencia técnica | Dependencia transitoria. |
| `INTERNAL_ERROR` | `internal` | Consecuencia técnica | Error no clasificado y sanitizado. |

**Decisión aprobable del incremento.** Logs técnicos pueden incluir operación, reason, código técnico, cantidad y latencia; no payload, cursor, UID, IDs, nombres, documentos ni firmas inexistentes.

## 12. Frontend y accesibilidad

**Decisión aprobable del incremento.** El detalle `/dashboard/groups/[groupId]` integra una única superficie de Temporadas. “Actual” muestra `currentSeason` o “No hay una Temporada actual”; “Anteriores” muestra sólo `closedSeasons` o “Todavía no hay temporadas anteriores”. Si ambos faltan, ambos estados se comunican sin llamar “historia” a una abierta.

**Decisión aprobable del incremento.** La acción existente de cierre permanece asociada exclusivamente a la actual. La lista histórica no ofrece editar, cerrar, reabrir, renovar, eliminar, archivar, crear invitaciones, derivar integrantes ni comparar rosters; tampoco afirma que una Membresía se renovó. Sólo deja puntos de extensión futuros para E2-18/CU-029, sin diseñarlos.

**Decisión aprobable del incremento.** Carga inicial, vacío, error, reintento y “Cargar más” son explícitos. “Cargar más” es single-flight; un error recuperable conserva filas y cursor; `CURSOR_STALE`, `CURSOR_INVALID`, duplicado o cambio de Grupo descarta la acumulación y reinicia. Pérdida de ownership retira datos visibles.

**Decisión aprobable del incremento.** Se exige `section` con heading, listas semánticas, `time dateTime`, estado no dependiente del color, targets táctiles del sistema, teclado completo, foco gestionado, `aria-live="polite"` sin duplicar `role="alert"`, columna legible en móvil y ausencia de scroll horizontal.

## 13. Pruebas y UAT

**Decisión aprobable del incremento.** Las unitarias cubren schemas exactos abierta v1/cerrada v2, rechazo de abierta v2, fechas, timestamps, campos extra/faltantes, DTO exacto y fallo de página completa.

**Decisión aprobable del incremento.** Contratos y cursor cubren payload cerrado, `pageSize` 1/20 y rechazo 0/21/no entero, codificación canónica, claves extra, otro Grupo/actor/versión, manipulación no autoritativa, ancla exacta y `startAfter(fechaInicio, seasonId)`.

**Decisión aprobable del incremento.** Persistencia/aplicación cubren Owner sin Persona, no-Owner, global admin, Cuenta/Grupo incompatible, cero/una/dos abiertas, sólo cerradas, actual más cerradas, empates por ID, 20/21 cerradas, lookahead, ancla eliminada/modificada, transferencia y caso N/N+1.

**Decisión aprobable del incremento.** Arquitectura/Rules cubren Admin SDK sólo en infraestructura, deny-all directo, ausencia de colecciones duplicadas, cero acceso a otros Agregados y consulta exacta con `FieldPath.documentId()`.

**Decisión aprobable del incremento.** Emulator cubre comportamiento de consultas, transacción, paginación, Rules y cero escrituras con fixtures `demo-*`. La detección de índice faltante se prueba con doble unitario y la presencia/configuración mediante test estático de `firestore.indexes.json`; no se atribuye al Emulator una garantía que no ofrece.

**Decisión aprobable del incremento.** Frontend cubre los tres estados conceptuales, errores, retry, single-flight, reinicio, respuestas tardías, pérdida de ownership, ausencia de acciones E2-18 y accesibilidad.

**Decisión aprobable del incremento.** UAT manual recorre: Grupo sin ciclos; apertura canónica; visualización actual; finalización previa y cierre por CU-018 fuera del historial; visualización cerrada; apertura N+1; orden; error recuperable; no-Owner; móvil, teclado y lector básico. Paginación 20/21, corrupción, cursores manipulados, transferencia, concurrencia, índice simulado y auditoría de cero escrituras son automatizados/Emulator, no se presentan como pasos manuales.

## 14. Criterios Dado/Cuando/Entonces

1. **Normativa.** Dado un no autenticado, cuando consulta, entonces recibe `UNAUTHENTICATED` y cero datos.
2. **Consecuencia técnica.** Dada Cuenta ausente/incompatible, cuando consulta, entonces recibe `ACCOUNT_REQUIRED`.
3. **Decisión aprobable del incremento.** Dado Grupo ausente o ajeno, cuando consulta, entonces recibe el mismo `GROUP_NOT_ACCESSIBLE`.
4. **Normativa.** Dado Owner vigente sin Persona/Membresía, cuando consulta, entonces obtiene respuesta.
5. **Consecuencia técnica.** Dado Grupo propio incompatible, cuando consulta, entonces recibe `GROUP_INCOMPATIBLE` antes de leer historia.
6. **Decisión aprobable del incremento.** Sin Temporadas, la respuesta es `currentSeason: null`, `closedSeasons: []`, `nextCursor: null`, `hasMore: false`.
7. **Consecuencia técnica.** Una abierta v1 aparece sólo como actual; abierta v2 falla como incompatible.
8. **Decisión aprobable del incremento.** Cerradas v2 ordenan por `fechaInicio DESC`, ID documental `DESC`.
9. **Consecuencia técnica.** Dos abiertas o una fila recuperada incompatible hacen fallar la página completa.
10. **Decisión aprobable del incremento.** Con 20 cerradas se entregan 20; `hasMore` sólo es verdadero si se recupera la número 21.
11. **Decisión aprobable del incremento.** La fila 21 no se entrega; el cursor usa la tupla de la fila 20 y página 2 comienza después de ella.
12. **Decisión aprobable del incremento.** Cursor malformado/cruzado produce `CURSOR_INVALID`; actual o ancla modificados producen `CURSOR_STALE`.
13. **Consecuencia técnica.** Transferencia de ownership revoca al Owner anterior en la siguiente llamada.
14. **Decisión aprobable del incremento.** Cierre N y apertura N+1 entre páginas producen `CURSOR_STALE` y reinicio.
15. **Limitación conocida.** Un documento no indexable no es certificado ni reparado por CU-019.
16. **Consecuencia técnica.** Índice faltante reconocido produce `DEPENDENCY_NOT_CONFIGURED`; indisponibilidad produce `DEPENDENCY_UNAVAILABLE`.
17. **Normativa.** Toda consulta exitosa o fallida produce cero escrituras de dominio.
18. **Consecuencia técnica.** Rules niega lectura/escritura cliente directa aun al Owner/global admin.
19. **Decisión aprobable del incremento.** La UI distingue actual, anteriores y ausencia total, y cumple teclado, foco, anuncios y responsive.
20. **Normativa.** La UI no expone ni anticipa CU-017, CU-018, CU-029/E2-18 ni datos de otros Agregados.

## 15. Riesgos, deuda y rollback

| Elemento | Clasificación | Tratamiento |
|---|---|---|
| Reordenamiento de otra cerrada entre páginas | Limitación conocida | No prometer snapshot; detectar duplicados observables y ofrecer reinicio. |
| Documento corrupto excluido por índice | Deuda | `E2-DATA-INTEGRITY-02`: auditoría/reparación separada, nunca scan dentro de CU-019. |
| Índice local no desplegado | Deuda | Gate operativo autorizado futuro; error estable mientras falte. |
| Abierta v2 | Supuesto no demostrado | No admitirla hasta que un incremento de lifecycle cierre writer, rehidratación y transición. |
| Crecimiento | Limitación conocida | Máximo 20 cerradas, lookahead 1, consultas indexadas y coste acotado. |
| Extensión de renovación | Deuda | Sólo punto futuro E2-18/CU-029; ningún contrato o UI anticipado aquí. |

**Consecuencia técnica.** La primera página materializa como máximo dos candidatas abiertas y 21 cerradas, además de Cuenta y Grupo. Una continuación agrega una lectura puntual de ancla. No hay N+1 por item. Los reintentos internos pueden repetir lecturas y no se contabilizan como garantía exacta de facturación.

**Decisión aprobable del incremento.** Rollback retira primero UI/consumidor, luego callable/capacidad, y finalmente el índice sólo tras verificar que ningún consumidor lo usa. Conserva Rules deny-all y todos los datos. No hay rollback de datos porque CU-019 no escribe; cualquier reparación requiere intervención separada.

## 16. Definition of Done y veredicto documental

**Decisión aprobable del incremento.** La implementación posterior sólo podrá cerrar E2-16 si coincide con este contrato, consulta, índice, cursor, errores y UI; prueba compatibilidad real v1/v2, autorización por página, caso N/N+1, fallo cerrado de filas recuperadas, cero escrituras, Rules, accesibilidad y fronteras; y produce informe, inventario Git, UAT clasificada y cierre separados.

**Normativa.** E2-14 y Etapa 2 permanecen abiertas; E3 no queda habilitada. Esta ficha no autoriza implementación, versionado, commit, push, merge, deploy ni Firebase remoto.

**APROBADA — LISTA PARA VERSIONAR**
