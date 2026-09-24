# E2-17 — Ficha de edición canónica de Temporada (CU-017)

## Estado

`APROBADA — LISTA PARA VERSIONAR`

Esta ficha cierra el diseño documental de CU-017. No implementa ni versiona cambios, no cierra E2-14 ni la Etapa 2, no habilita E3, no inicia E2-18 y no integra Auth/UAT.

## 1. Preflight, alcance y hallazgos

- Rama `feat/e2-17-season-edit`.
- HEAD, `dev`, `origin/dev`, upstream y merge-base verificados en `2160863cdecdb03d0c32d3650a9031847845ff99`; divergencia `0/0`.
- Índice vacío, cero stashes y único archivo del working tree: esta ficha no trackeada.
- Auth/UAT permanece aislada en `fc7135e358902a17372d44f20df50883603520ce`.
- E2-14 y Etapa 2 continúan abiertas; E3 permanece deshabilitada; E2-18 no se inició.

Alcance aprobado: edición Owner-scoped del `nombre` de la única Temporada abierta, con autorización vigente, concurrencia optimista, recovery idempotente de cambios efectivos, frontend, pruebas, UAT y rollback. Quedan fuera fecha, objetivos, observaciones, lifecycle, renovación y todo Agregado consumidor.

Se confrontaron Documentos 1, 1.5, 2, 3 y 4 AUD-C05; aclaraciones de Períodos; Documento 5; E2-14; E2-02, E2-15 y E2-16; y schemas, writers, receipts, guards, cursores, Rules, frontend y pruebas integrados.

| Severidad | Hallazgo | Resolución |
|---|---|---|
| Bloqueante, resuelto | La propuesta permitía `fechaInicio` sin demostrar su semántica declarativa | La fecha queda fuera |
| Bloqueante, resuelto | v3/v4 multiplicaban estados físicos sin necesidad estructural | Se conservan v1/v2 |
| Bloqueante, resuelto | `revision: 0` no era observable y agregaba metadata | Token opaco emitido por consulta |
| Alta, resuelta | Un no-op creaba receipt sin efecto recuperable | `NO_CHANGES` hace cero escrituras y no consume clave |
| Alta, resuelta | Recovery confundía snapshot histórico con estado actual | `appliedEffect` y `currentSeason` separados |
| Alta, resuelta | Receipt, retención y cardinalidad estaban incompletos | Contratos y rutas cerrados en §§7, 9 y 14 |
| Media, resuelta | Objetivos/observaciones quedaban como deuda vaga | Clasificados y excluidos expresamente |
| Media, resuelta | No estaba explícita la ausencia de snapshot E2-16 | Cursor ancla identidad; la abierta se relee |

No quedan decisiones abiertas en el alcance aprobado.

## 2. Norma y decisión sobre `fechaInicio`

Temporada es el ciclo operativo temporal de un Grupo; toda actividad deportiva y administrativa pertenece a una Temporada. Nombre, estado, fechas, objetivos y observaciones son información propia. CU-017 ordena editar, pero no enumera todos los campos editables. RF-17 vuelve inmutable una cerrada y Documento 4 ubica fechas y lifecycle entre las invariantes del Aggregate Root.

`fechaInicio` es el límite civil declarado del comienzo del ciclo. No es `createdAt`, hora técnica de apertura ni etiqueta administrativa. Que E2-02 admita una fecha distinta de “hoy” no demuestra que pueda reescribirse tras existir actividad.

| Alternativa | Evaluación | Decisión |
|---|---|---|
| A — nombre y fecha siempre | Puede contradecir actividad y altera el orden histórico | Rechazada |
| B — fecha antes de toda actividad | Exige probar ausencia en múltiples Agregados y scans no acotados | Rechazada |
| C — fecha sin Membresías | Membresía no agota la actividad ni es autoridad de Temporada | Rechazada |
| D — sólo nombre | Cumple el mínimo demostrado sin coordinación externa | Aprobada |
| E — fecha declarativa sin efectos | Contradice el ciclo operativo temporal | Rechazada |

Escenarios: sin Membresías tampoco se edita; con Membresías, Períodos o aprobaciones no se edita ni se consultan; mover atrás, adelante o al futuro se rechaza; antes del cierre sólo puede cambiar nombre; retry posterior al cierre sólo recupera un nombre ya confirmado; el orden por fecha queda estable; E2-17 no crea ni resuelve igualdad de fechas entre Temporadas. Una futura edición de fecha requiere nueva decisión funcional, no una extensión implícita.

## 3. Matriz definitiva de campos

| Campo | Clasificación | Editable | Motivo |
|---|---|---:|---|
| `nombre` | Propio existente | Sí | Corrección acotada sin alterar lifecycle ni otros Agregados |
| `fechaInicio` | Límite temporal existente | No | No hay regla aprobada para reubicar un ciclo con actividad potencial |
| `objetivos` | Normativo pendiente | No | Ausente del modelo mínimo; sin forma, límites ni borrado definidos |
| `observaciones` | Normativo pendiente | No | Ausente; faltan privacidad, límites, saneamiento y borrado |
| `seasonId` | Identidad | No | Debe conservarse |
| `groupId` | Referencia externa | No | Grupo es otro Agregado |
| `estado` | Lifecycle | No | CU-018 cierra; no existe reapertura |
| `createdAt` | Metadata existente | No | Se conserva |
| `closedAt`, `closedBy` | Cierre | No | Sólo E2-15 los agrega |
| `schemaVersion` | Metadata física | No | La controla persistencia |
| `revision`, `updatedAt`, `updatedBy` | Datos inexistentes | No | Deliberadamente innecesarios; `updatedBy` no es autoridad |
| Owner, roles, Persona, Membresía | Autoridad externa | No | No pertenecen al payload ni raíz |
| referencias Firestore/desconocidos | Infraestructura/desconocido | No | Contratos y documentos cerrados |

Objetivos y observaciones pertenecen conceptualmente a Temporada, pero no a este corte. `revision` y metadata de actualización no son deuda normativa.

## 4. Schema físico

| Alternativa | Resultado | Decisión |
|---|---|---|
| A — v1 editable | Reemplazar nombre conserva schema; token derivado protege concurrencia | Aprobada |
| B — v3 unificado | Agrega forma y condicionales sin necesidad | Rechazada |
| C — v3 abierta/v4 cerrada | Duplica estados y adapta todos los rehidratadores | Rechazada |
| D — metadata externa autoritativa | Duplica autoridad y atomicidad | Rechazada |
| E — token derivado | Control optimista sin metadata persistida | Aprobada junto con A |

Formas únicas:

- abierta v1: `groupId`, `nombre`, `fechaInicio`, `estado`, `createdAt`, `schemaVersion: 1`;
- cerrada v2: v1 más `closedAt`, `closedBy`, con estado cerrada y `schemaVersion: 2`.

E2-17 actualiza sólo `nombre` con update transaccional, no hace `set` completo. No agrega ni elimina propiedades. Abierta v2, cerrada v1 y toda v3/v4 siguen incompatibles. La numeración representa evolución estructural, no cada transición o edición.

## 5. Token y concurrencia

`getOwnSeason` se adapta mínimamente: devuelve `season` y `editToken` para abierta v1; para cerrada v2, `editToken: null`. La UI relee al abrir y sólo repite el token emitido.

El token es SHA-256 opaco, length-prefixed, con namespace `sportexa:E2-17:season-edit-token:v1`, y liga versión de contrato, IDs de Temporada/Grupo, schema, estado, nombre normalizado, fecha y `createdAt` canónico (segundos y nanosegundos). No es autorización ni se persiste. El backend lo recalcula desde la raíz dentro de la transacción.

- Una v1 ya tiene token observable; no existe revisión implícita `0`.
- Primera edición compara token, cambia nombre y devuelve token resultante; sigue v1.
- La siguiente edición usa el nuevo token.
- Dos ediciones desde la misma base: una confirma y otra `STALE_UPDATE`, sin escritura.
- A→B→A puede reproducir token porque el estado ligado volvió a ser equivalente; no se promete historial y no se pisa un valor actual divergente.
- Timestamp, revisión persistida y schema/revisión se rechazan por añadir estado sin garantía necesaria.
- Edición y cierre compiten sobre la misma raíz: edición primero implica cierre v1→v2 preservando nombre; cierre primero implica `SEASON_ALREADY_CLOSED`.

## 6. Idempotencia, receipt y retención

Se exige `idempotencyKey` y receipt durable sólo para `UPDATED`. El token evita pérdida concurrente, pero no demuestra un commit cuya respuesta se perdió después de otra edición o del cierre. Intent pending e historial de comandos exceden una mutación atómica; omitir clave deja resultado incierto.

Colección: `seasonUpdateReceipts/{receiptId}`. El ID es SHA-256 length-prefixed de namespace `sportexa:E2-17:season-update-receipt:v1`, actor UID y clave. Actor+clave bajo colección/namespace exclusivos evita colisión de comandos; reutilizarla en otro Grupo/Temporada produce conflicto estable. No se almacena la clave cruda.

`requestHash` liga namespace/`contract-v1`, actor, `groupId`, `seasonId`, nombre normalizado y `expectedEditToken`.

| Campo receipt v1 | Regla |
|---|---|
| `action` | `"UPDATE_SEASON"` |
| `actorUserId`, `groupId`, `seasonId` | Contexto confirmado |
| `requestHash` | Request exacto |
| `expectedEditToken`, `resultEditToken` | Base y resultado |
| `outcome` | Sólo `"UPDATED"` |
| `confirmedAt` | Timestamp del commit |
| `receiptVersion` | `1` |

No guarda snapshot, nombre, fecha, revisión, rol, Persona ni datos sensibles. En recovery, el nombre se toma del request normalizado cuya igualdad prueba el hash. El receipt se retiene indefinidamente, sin TTL ni cleanup en este incremento. Archivo/eliminación futuros deberán preservar la clave lógica antes de retirarlo. Rules: deny-all cliente.

## 7. `NO_CHANGES`

Nombre normalizado igual y token vigente devuelve `NO_CHANGES`: cero escrituras, sin receipt, cambio de token, timestamp, auditoría ni consumo de clave. Token obsoleto prevalece como `STALE_UPDATE`, aunque el nombre coincida. La UI evita enviarlo normalmente. Una clave de no-op puede usarse luego porque no hubo comando confirmado. Rechazarlo o aumentar una revisión inventaría un efecto.

## 8. Orden transaccional y retries

Primera ejecución:

1. Validar contrato cerrado, IDs, nombre, token y clave.
2. Exigir Auth y Cuenta; no Persona/Membresía.
3. En transacción leer Grupo: ausente/ajeno → `GROUP_NOT_ACCESSIBLE`; propio malformado → `GROUP_INCOMPATIBLE`.
4. Leer receipt determinista. Si existe, validar schema/hash y recuperar.
5. Sin receipt, leer Temporada exacta: ausente/otro Grupo → `SEASON_NOT_ACCESSIBLE`.
6. Rehidratar: v2 → `SEASON_ALREADY_CLOSED`; inválida → `INCOMPATIBLE_STATE`.
7. Leer guard y abiertas `limit(2)`; exigir raíz, guard y unicidad correlacionados.
8. Comparar token; distinto → `STALE_UPDATE`.
9. Nombre igual → `NO_CHANGES`; distinto → update de nombre + create receipt atómicos.

E1 confirma T1, E2 confirma T2 y llega retry E1: se reautorizan Cuenta/ownership; el receipt E1 se valida antes de editabilidad/token actual; request distinto da `IDEMPOTENCY_CONFLICT`; la raíz actual se lee para correlación/respuesta; no se escribe ni revierte E2. Se devuelve efecto E1 histórico y estado T2 actual separados.

Tras cierre, un retry idéntico de edición confirmada recupera receipt, valida ownership y raíz, devuelve efecto histórico más cerrada actual y `currentEditToken: null`; jamás toca v2. Un intento nuevo sin receipt coincidente devuelve `SEASON_ALREADY_CLOSED`. Transferencia revoca recovery al actor anterior.

## 9. Contrato público

Operación `updateSeason`. Input exacto:

```json
{
  "groupId": "opaque",
  "seasonId": "opaque",
  "nombre": "Temporada 2027",
  "expectedEditToken": "64-hex",
  "idempotencyKey": "opaque"
}
```

Todos obligatorios. Nombre: NFC, trim, espacios colapsados, 1–80 puntos de código, sin controles. IDs opacos, sin `/` ni espacios extremos y con límite técnico vigente. Token: 64 hex minúsculas. Clave: `^[A-Za-z0-9._:-]{16,128}$`. `fechaInicio` o cualquier propiedad extra da `VALIDATION_FAILED`.

```text
{
  outcome: "UPDATED" | "NO_CHANGES" | "EXISTING_IDEMPOTENT",
  appliedEffect: null | {
    outcome: "UPDATED",
    nombre: string,
    editToken: string,
    confirmedAt: ISO-8601
  },
  currentSeason: OpenSeasonDto | ClosedSeasonDto,
  currentEditToken: string | null
}
```

`UPDATED` informa el commit nuevo; `NO_CHANGES` lleva `appliedEffect: null`; `EXISTING_IDEMPOTENT` rotula el efecto histórico mientras `currentSeason` siempre es la lectura actual y puede diferir o estar cerrada.

| Condición | Código público E2-17 |
|---|---|
| Sin Auth | `UNAUTHENTICATED` |
| Cuenta ausente/incompatible | `ACCOUNT_REQUIRED` |
| Grupo ausente/ajeno | `GROUP_NOT_ACCESSIBLE` |
| Grupo propio inválido | `GROUP_INCOMPATIBLE` |
| Temporada ausente/de otro Grupo | `SEASON_NOT_ACCESSIBLE` |
| Cerrada válida | `SEASON_ALREADY_CLOSED` |
| Token obsoleto | `STALE_UPDATE` |
| Misma clave/request distinto | `IDEMPOTENCY_CONFLICT` |
| Guard/unicidad/schema/correlación | `INCOMPATIBLE_STATE` |
| Input | `VALIDATION_FAILED` |
| Conflicto agotado | `CONFLICT` |
| Dependencia caída | `DEPENDENCY_UNAVAILABLE` |
| Falla restante sanitizada | `INTERNAL_ERROR` |

No se introducen `SEASON_NOT_EDITABLE` ni códigos duplicados. E2-17 no expone `SEASON_NOT_OPEN`, `SEASON_NOT_FOUND` o `NOT_AUTHORIZED`; los callables existentes conservan sus convenciones.

## 10. Retries históricos de apertura

La evidencia física muestra que `seasonOpeningReceipts` guarda IDs, hashes, outcome y timestamps, no snapshot. Recovery lee la raíz correlacionada actual y nunca la vuelve a crear.

- hash/receipt de apertura quedan inmutables y representan el request original;
- guard v2 sólo contiene `seasonId`, `openedAt`, versión; guard v1 conserva hashes históricos;
- tras editar, retry de apertura devuelve nombre actual;
- tras cerrar, devuelve raíz cerrada actual;
- nunca restaura nombre/fecha ni ejecuta `set` sobre raíz existente.

Esto debe fijarse con pruebas de arquitectura y Emulator.

## 11. Compatibilidad E2-15

No requiere adaptación física ni contractual. Acepta abierta v1, produce cerrada v2, preserva `groupId`, nombre editado, `fechaInicio`, `createdAt`; agrega cierre y cambia estado/schema. Prohíbe extra fields, reapertura y reescritura histórica. Receipts de cierre siguen intactos. La única interacción es la carrera sobre la misma raíz.

## 12. Compatibilidad E2-16

Lee abiertas v1 y cerradas v2, sin variantes ni cambio de DTO, índice, cursor o reader. Cerradas ordenan por `fechaInicio DESC`, ID `DESC`; el ancla se revalida por identidad, Grupo, estado, schema y fecha. El cursor valida contrato, actor, Grupo, identidad de abierta y ancla.

Editar nombre no cambia identidad de la abierta, tuplas cerradas ni conjunto paginado, por lo que no invalida cursor. Cada página relee la abierta y `currentSeason` refleja el nombre actual; no existe snapshot multipágina. Invalidar no protegería la paginación cerrada. La UI reemplaza la abierta y no la acumula como histórica.

## 13. Persistencia, Rules y cardinalidad

| Ruta | Documentos leídos/materializados | Escrituras |
|---|---|---|
| `UPDATED` canónico | Cuenta, Grupo, receipt ausente, Temporada, guard, query con 1 abierta = 6 | raíz + receipt = 2 |
| Corrupción con 2 abiertas | Cinco lecturas por ID + 2 de query = máximo 7 | 0 |
| Retry idéntico | Cuenta, Grupo, receipt, Temporada actual = 4 | 0 |
| Conflicto de clave | Cuenta, Grupo, receipt = 3 | 0 |
| `NO_CHANGES` o stale | Ruta canónica = 6 | 0 |
| Cerrada sin receipt | Cuenta, Grupo, receipt ausente, Temporada = 4 | 0 |

Reintentos internos de Firestore pueden repetir lecturas facturadas, pero no aumentan cardinalidad lógica. No se leen Membresías, Períodos, Solicitudes, approvals, Partido, Torneo ni receipts de apertura/cierre; no hay scan, batch, contador o índice nuevo. Sólo `UPDATED` cambia raíz y receipt. Rules agrega deny-all de `seasonUpdateReceipts` sin ampliar permisos de `seasons`.

## 14. Frontend y accesibilidad

- Acción sólo Owner en tarjeta `Actual`, nunca históricas; Owner sin Persona/Membresía válido, rol global no autoriza.
- Al abrir, `getOwnSeason` obtiene nombre/token frescos.
- Formulario sólo `nombre`; no muestra fecha deshabilitada ni sugiere efectos deportivos.
- Dirty state normalizado; sin cambio se inhabilita confirmar; backend tolera `NO_CHANGES`.
- Cancelar/Escape no escribe y restaura foco.
- Single-flight, controles deshabilitados, labels/errores asociados, teclado, foco, targets, responsive y `aria-live`.
- Clave creada al confirmar y conservada con request ante timeout, respuesta perdida, `CONFLICT`, indisponibilidad o error interno.
- Cambiar nombre tras error inicia clave nueva. Stale recarga sin merge; cierre cierra modal/refresca.
- Recovery explica efecto recuperado y diferencia estado actual. Éxito reconsulta; respuestas tardías se descartan por Grupo/generación.
- Navegación sólo se bloquea con dirty state; no hay borradores persistidos.

## 15. Pruebas y UAT

No se ejecutan suites ni Emulator en esta revisión documental. La implementación futura debe cubrir:

- normalización 1/80/81, Unicode, controles y contrato/unknown fields;
- v1/v2 estrictos y rechazo de combinaciones/extra fields;
- token estable/diferente, emitido sólo por query autoritativa;
- primera/segunda edición v1→v1, dos writers, stale, edición/cierre y transferencia;
- atomicidad raíz+receipt, falla sin parcialidad, receipt/hash/corrupción;
- no-op con cero escrituras/clave libre;
- retries tras otra edición/cierre y separación efecto/actual;
- Auth, Cuenta, Owner sin Persona/Membresía, no-Owner, rol global, no enumeración;
- guard/unicidad/corrupción, dependencia caída y errores sanitizados;
- cero efectos en Grupo, Membresías, Períodos, Solicitudes, Partido/Torneo y guards ajenos;
- opening retry no escritor; cierre v1→v2 preserva nombre; E2-16 conserva cursor/orden;
- Rules deny-all; backend único writer; capas/capabilities públicas;
- frontend: render, dirty, cancelar, Escape, stale, recovery, cierre, N/N+1, foco, teclado, anuncios y responsive.

UAT futura: sólo Auth/Functions/Firestore Emulator, `demo-*`, loopback y datos sintéticos; sin remoto ni Auth/UAT. Owner edita nombre y recarga; cancelar/no-op no escriben; no-Owner/admin global no acceden; cerrada no ofrece control; inspección confirma v1/v2, fecha intacta y receipt sólo para cambios. Carreras, corrupción, pérdida de respuesta y transferencia son evidencia automatizada, no simulación manual.

## 16. Criterios Dado/Cuando/Entonces

1. Dada abierta v1 y Owner, cuando cambia nombre con token vigente, entonces sólo nombre cambia y raíz+receipt confirman atómicamente.
2. Dada fecha, objetivos, observaciones, lifecycle, metadata o unknown field, cuando se envían, entonces validación falla sin escritura.
3. Dado Owner sin Persona/Membresía, cuando edita, entonces puede confirmar.
4. Dado actor no Owner/global, cuando intenta, entonces no enumera ni escribe.
5. Dada Temporada ausente/otro Grupo, entonces `SEASON_NOT_ACCESSIBLE`.
6. Dada v2, una intención nueva recibe `SEASON_ALREADY_CLOSED`.
7. Dado token obsoleto, prevalece `STALE_UPDATE` incluso con nombre igual.
8. Dados nombre igual/token vigente, resulta `NO_CHANGES`, cero escrituras y clave libre.
9. Dada misma clave/request confirmado, retry recupera sin reaplicar; distinto produce conflicto.
10. Dadas E1 y E2, retry E1 devuelve efecto E1 y estado E2 sin revertir.
11. Dada edición seguida de cierre, retry recupera efecto y v2 actual sin escribir.
12. Dada carrera edición/cierre, una confirma y la otra reevalúa un orden válido.
13. Dada transferencia, actor anterior no confirma ni recupera.
14. Dado retry de apertura tras edición/cierre, devuelve raíz actual sin restaurar.
15. Dada edición, sólo raíz/receipt cambian y fecha/otros documentos quedan intactos.
16. Dado cursor E2-16 y cambio de nombre, cursor sigue válido y abierta se relee.
17. Dado cliente Firestore, Rules niega raíz y receipt.
18. Dado rollback, v1/v2 siguen legibles por E2-15/E2-16.

## 17. Rollback

Ocultar UI y retirar/deshabilitar callable para nuevas ediciones. Mantener lectura v1/v2: no hay schema evolucionado ni migración. E2-15/E2-16 siguen sin adaptaciones. Conservar deny-all y receipts para requests en vuelo; después pueden quedar dormidos, no borrarse por rollback. No restaurar nombres: no existe historial funcional ni autoridad para elegir un valor previo. Una corrección sólo es otra edición mientras esté abierta; cerrada es inmutable.

## 18. Riesgos residuales y Definition of Done

| Riesgo/deuda | Tratamiento |
|---|---|
| Receipts sin TTL | Aceptado por recovery; archivo futuro preserva idempotencia |
| Abierta cambia entre páginas | Identidad estable, contenido actual, sin snapshot |
| Sin historial de nombres | Fuera de norma; receipt técnico no es auditoría funcional |
| Objetivos/observaciones | Campos normativos pendientes, excluidos hasta contrato aprobado |
| Fecha editable | Deliberadamente excluida hasta regla temporal aprobada |
| Corrupción histórica | Falla cerrado; E2-17 no repara |

No hay riesgo residual bloqueante. La ficha deja cerrados campos, fecha, schema, metadata, token, clave, receipt, no-op, recovery, retención, errores, compatibilidad, cardinalidad y rollback. No autoriza código, Rules, índices, pruebas, informe, cierre, commit, push, merge, suites, Emulator, build, deploy ni acceso remoto.

Validación documental requerida: único archivo modificado, UTF-8 sin BOM, fences balanceados, sin whitespace final, un newline al EOF, `git diff --check` limpio, índice/stashes vacíos y referencias Git sin cambios.

## Veredicto

`E2-17 APROBADO — LISTO PARA VERSIONAR`
