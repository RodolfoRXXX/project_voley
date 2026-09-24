# E2-17 — Informe de implementación de edición canónica de Temporada (CU-017)

## Estado

`IMPLEMENTADA Y VALIDADA — UAT APROBADA`

Este informe documenta exclusivamente E2-17. No cierra E2-14 ni Etapa 2, no habilita E3, no inicia E2-18 y no modifica Documento 5 ni la rama aislada de Auth/UAT.

## 1. Preflight

- Rama: `feat/e2-17-season-edit`.
- HEAD, `dev`, `origin/dev`, upstream y merge-base: `043d1e692b0ef4834d80d291bf606b497f173287`.
- Divergencia contra `dev` y upstream: `0/0`.
- Working tree e índice inicialmente limpios; cero stashes.
- La ficha E2-17 era idéntica a `dev`.
- No existían implementación, informe ni cierre E2-17.
- E2-16 tenía ficha, implementación y cierre integrados (`2160863`, `7cb2a56`, `50aa3c4`).
- E2-14 y Etapa 2 permanecían abiertas; E3 deshabilitada; E2-18 no iniciado.
- Auth/UAT permanecía aislada en `chore/preserve-auth-emulator-uat-changes`, commit `fc7135e358902a17372d44f20df50883603520ce`.

El primer comando Git recibió la protección `dubious ownership` del usuario aislado. Se continuó con `git -c safe.directory=C:/Users/Rodolfo/Documents/projectoVoley` por invocación, sin cambiar configuración global ni el repositorio.

## 2. Inventario y compatibilidad física

- Dominio `groups/domain/season.js`: abierta v1 exacta (`groupId`, `nombre`, `fechaInicio`, `estado`, `createdAt`, `schemaVersion`) y cerrada v2 exacta con `closedAt`/`closedBy`.
- E2-02: `createAndOpenSeason`, `firestoreOpenSeasonGuard`, guard v2 (`seasonId`, `openedAt`, `guardVersion`) y opening receipt v2 sin snapshot.
- E2-15: `firestoreSeasonClosureStore`, cierre v1→v2, borrado del guard y closure receipt v1.
- E2-16: reader transaccional que relee la abierta por página; cursor ligado a identidad de abierta y ancla cerrada, no al nombre.
- `getOwnSeason`: consulta Owner-scoped de una Temporada exacta; se amplió sólo el wrapper con `editToken`.
- DTO: `toSeasonDto` continúa cerrado y sin schema, hashes, guards ni tipos Firebase.
- Hashing: helper SHA-256 length-prefixed ya existente en `seasonHashing.js`.
- Persistencia: repositorio exclusivo de Temporada; se agregó únicamente `updateName` transaccional.
- Errores/callables: `SeasonError`, `details.reason` sanitizado y mapping centralizado.
- Frontend: detalle Owner de Grupo, tarjeta `Actual`, historial E2-16 y cierre E2-15.
- Rules: `seasons`, guards y receipts previos ya eran deny-all.
- Runners: Node test runner, Emulator aislado `demo-*`, maintenance runner, lint baseline, typecheck, syntax y build.

Estructuras confirmadas: opening receipt v1 tiene `action`, `groupId`, `seasonId`, `idempotencyKeyHash`, `requestHash`, `outcome`, `openedAt`, `confirmedAt`, `receiptVersion`; v2 agrega `actorUserId`. Closure receipt v1 tiene `action`, `actorUserId`, `groupId`, `seasonId`, `idempotencyKeyHash`, `requestHash`, `outcome`, `closedAt`, `confirmedAt`, `receiptVersion`. Antes de E2-17, `getOwnSeason` devolvía `{ season: SeasonDto }`; después devuelve exactamente `{ season: SeasonDto, editToken: string | null }`.

No se encontró una decisión de la ficha incompatible con el código integrado.

## 3. Arquitectura implementada

Flujo público: contrato cerrado → identidad Auth → servicio de aplicación → store confirmatorio Firestore → repositorios/rehidratadores estrictos → DTO público.

- Callable nueva: `updateSeason`.
- Servicio: normaliza el nombre, deriva receipt ID y request hash; no contiene Firestore.
- Store nuevo: `firestoreSeasonUpdateStore.js`; concentra autorización vigente, recovery, guard/unicidad, token, no-op y commit atómico.
- Writer: `firestoreSeasonRepository.updateName`, que actualiza exclusivamente `nombre`.
- Receipt: hidratador estricto en `seasonReceipts.js`.
- Consulta: `getOwnSeason` emite token para abierta v1 y `null` para cerrada v2.
- Frontend: `EditSeasonSection`, consumido únicamente por la tarjeta `Actual`.

No se agregó índice, Aggregate Root, proyección, schema v3/v4, migración ni escritura cliente.

## 4. Contrato público

Input exacto de `updateSeason`:

```json
{
  "groupId": "opaque",
  "seasonId": "opaque",
  "nombre": "Temporada 2027",
  "expectedEditToken": "64-hex-lowercase",
  "idempotencyKey": "opaque"
}
```

- `nombre`: string, NFC, trim, espacios Unicode colapsados, 1–80 puntos de código, sin controles.
- IDs: opacos, no vacíos, sin `/` ni espacios extremos.
- `expectedEditToken`: 64 hex minúsculas.
- `idempotencyKey`: `^[A-Za-z0-9._:-]{16,128}$`.
- Cualquier propiedad desconocida, incluida `fechaInicio`, identidad, roles, Persona, Membresía, estado, schema, timestamps, revisión o referencia, produce `VALIDATION_FAILED`.

Output exacto:

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

Se publicaron literalmente `SEASON_NOT_ACCESSIBLE` y `STALE_UPDATE`; el resto conserva los códigos aprobados de la ficha.

## 5. Token de concurrencia

`seasonEditToken` usa SHA-256 length-prefixed con namespace `sportexa:E2-17:season-edit-token:v1`. Liga `contract-v1`, `groupId`, `seasonId`, schema, estado, nombre normalizado, `fechaInicio` y `createdAt` canónico como segundos/nanosegundos.

El token:

- se calcula sólo desde una raíz rehidratada estrictamente;
- es estable para el mismo estado y cambia al cambiar el nombre;
- no contiene autoridad ni secretos;
- no se persiste ni se registra;
- no reemplaza Auth, Cuenta, ownership, pertenencia, apertura, guard o schema.

## 6. Idempotencia y receipts

El receipt ID es SHA-256 length-prefixed del namespace `sportexa:E2-17:season-update-receipt:v1`, actor y clave. El request hash usa namespace propio, `contract-v1`, actor, Grupo, Temporada, nombre normalizado y token esperado.

`seasonUpdateReceipts` sólo contiene receipts v1 `UPDATED` con schema cerrado:

`action`, `actorUserId`, `groupId`, `seasonId`, `requestHash`, `expectedEditToken`, `resultEditToken`, `outcome`, `confirmedAt`, `receiptVersion`.

No guarda clave cruda, nombre, fecha, snapshot, roles, Persona, revisión ni metadata de actualización. La retención es indefinida, sin TTL. Rules niega get/list/create/update/delete al cliente.

Recovery reautoriza Cuenta y ownership, valida receipt/contexto/hash y relee la raíz actual. Devuelve `appliedEffect` histórico separado de `currentSeason`; no reejecuta, revierte ni reabre.

## 7. `NO_CHANGES`

El token se compara antes del nombre. Con token vigente y nombre normalizado igual se devuelve `NO_CHANGES`, `appliedEffect: null`, raíz y token actuales. La transacción no llama ningún writer y no crea receipt; por lo tanto la clave queda libre. Emulator comprobó igualdad byte a byte de la raíz y cardinalidad de receipts sin cambio.

## 8. Concurrencia, autorización y cardinalidad

La unidad confirmatoria relee Cuenta, Grupo, receipt, Temporada, guard y query de abiertas. Valida Owner vigente, Grupo íntegro, pertenencia, abierta v1, guard y unicidad. Dos writers con la misma base serializan: uno confirma y el otro obtiene `STALE_UPDATE`.

Cardinalidad lógica por ruta, sin contar reintentos internos de Firestore:

| Ruta | Lecturas/materializaciones | Escrituras |
|---|---:|---:|
| `UPDATED` | 6 | raíz + receipt = 2 |
| corrupción con dos abiertas | hasta 7 | 0 |
| recovery idéntico | 4 | 0 |
| conflicto de clave | 3 | 0 |
| `NO_CHANGES` | 6 | 0 |
| stale | 6 | 0 |
| cerrada sin receipt | 4 | 0 |
| guard/schema/correlación inválidos | hasta la lectura que detecta el estado | 0 |

No se leen ni escriben Persona, Membresías, Períodos, Solicitudes, Partido, Torneo, opening receipts o closure receipts.

## 9. Interacciones E2-02, E2-15 y E2-16

- E2-02 sigue creando abierta v1 y guard v2. Sus hashes y receipts no cambiaron. Retry de apertura devuelve la raíz actual editada/cerrada y no restaura el nombre original.
- E2-15 recibe la abierta editada v1, preserva el nombre y produce cerrada v2. Si cierre gana, una edición nueva falla; un recovery previo continúa disponible. Sus bloqueadores y receipts no cambiaron.
- E2-16 conserva DTO, índices, query, orden y cursor. La abierta editada continúa v1; se relee por página. El cambio de nombre no invalida cursor porque no cambia identidad ni tuplas cerradas.

## 10. Frontend

La acción “Editar” aparece sólo en la tarjeta de Temporada actual dentro de la ruta Owner-scoped. Al abrir, `getOwnSeason` recarga nombre y token autoritativos. El modal tiene un único campo `nombre`, dirty state normalizado, cancelar/Escape, foco inicial/retorno, trap de teclado, single-flight sin ventana de doble clic, `aria-live`, `aria-busy`, labels, targets mínimos y layout responsive.

La clave se conserva para retries del mismo payload/token y rota cuando cambia intencionalmente la firma. `STALE_UPDATE` recarga nombre/token, no reintenta y exige una nueva decisión explícita. Cierre concurrente y pérdida de ownership cierran/refrescan. Todo éxito reconsulta E2-16 y emite `season-context-changed`.

No se muestra ni envía `fechaInicio`; no hay controles sobre cerradas, renovación, reapertura, cierre adicional o invitaciones.

## 11. Pruebas y gates

Resultados exactos:

1. Unitarias focales E2-17: 8/8.
2. Emulator focal E2-17: 11/11 en la repetición final; 10 subtests + padre. Incluye carrera simultánea edición/cierre e inspección de agregados protegidos.
3. Regresión Emulator E2-02: 11/11.
4. Regresión Emulator E2-15: 5/5.
5. Regresión Emulator E2-16: 7/7.
6. Unitarias/contratos/arquitectura completas: 309/309 en la repetición aprobada.
7. Emulator Suite completa fresca: 191/191 en la repetición final posterior a ampliar la evidencia de UAT-17/UAT-19.
8. Mantenimiento/Rules: 7/7.
9. Sintaxis Functions: 287/287 archivos JavaScript.
10. Lint baseline: aprobado; 36 errores y 9 warnings históricos, 9 hallazgos resueltos respecto del baseline, cero regresiones.
11. Typecheck: aprobado.
12. Build Next.js: aprobado; 21 páginas estáticas generadas.
13. `git diff --check`: aprobado.
14. Higiene documental y técnica: UTF-8 válido, sin BOM, sin whitespace final y con newline al EOF.
15. Puertos Emulator `15000`, `15001`, `15002`, `18150`, `28150`, `9299`, `9300`, `9499` y `9500`: sin listeners propios al finalizar.

## 12. Incidencias

1. Git inicialmente rechazó el directorio por `dubious ownership` del usuario sandbox. Se usó `-c safe.directory=...` por comando; no se modificó configuración global.
2. Node dentro del sandbox falló con `EPERM` al resolver `C:\Users\Rodolfo`. Los gates se ejecutaron fuera del sandbox, con aprobación, sobre el mismo workspace.
3. La primera suite unitaria completa dio 308/309 por `ENOTEMPTY` en el teardown Windows de `runnerTools.test.js`. Causa: el test usaba `fs.rmSync` inmediato aunque el runner dispone de `removeTemporaryDirectory` con retry para locks. Se reemplazó el teardown y la repetición pasó 309/309; no se relajó ninguna aserción.
4. Firebase CLI no pudo consultar MOTD/config remota por red bloqueada; fue aviso no fatal y todos los emuladores usaron proyecto `demo-*` y loopback.
5. Build informó `caniuse-lite` con ocho meses de antigüedad; no afecta compilación ni contrato E2-17 y actualizar dependencias queda fuera de alcance.
6. La revisión previa al cierre detectó que UAT-17 no tenía una carrera simultánea explícita y que UAT-19 no materializaba todos los agregados nombrados. Se amplió únicamente `seasonUpdateE2.test.js`, sin relajar aserciones; el focal pasó 11/11 y la Suite Emulator completa posterior pasó 191/191.
7. Durante esa repetición, los puertos auxiliares predeterminados de Eventarc y Tasks (`9299` y `9499`) estaban ocupados por procesos externos al runner; Firebase CLI eligió `9300` y `9500`. La suite terminó correctamente y apagó todos los emuladores que inició.

## 13. Limitaciones y deuda

- Receipts sin TTL: decisión normativa para preservar recovery; una política futura debe conservar idempotencia lógica.
- No existe historial funcional de nombres; el receipt técnico no es auditoría de negocio.
- Objetivos, observaciones y edición de fecha permanecen fuera de alcance.
- No se promete snapshot multipágina E2-16.
- Corrupción histórica falla cerrada; E2-17 no migra ni repara.
- `caniuse-lite` desactualizado es mantenimiento general, no deuda funcional E2-17.

No queda riesgo bloqueante conocido dentro de E2-17.

## 14. Resultado y clasificación UAT

La persona usuaria confirmó la ejecución satisfactoria de UAT-01 a UAT-16. Las cuatro restantes se cierran con evidencia automatizada o inspección, sin presentarlas como manuales.

| UAT | Escenario | Clasificación y resultado |
|---|---|---|
| UAT-01 | Owner ve “Editar” | APROBADA MANUALMENTE |
| UAT-02 | Owner sin Persona puede editar | APROBADA MANUALMENTE |
| UAT-03 | Nombre actual precargado | APROBADA MANUALMENTE |
| UAT-04 | Cancelar no escribe | APROBADA MANUALMENTE |
| UAT-05 | Guardar nombre nuevo | APROBADA MANUALMENTE |
| UAT-06 | Persistencia después de recarga | APROBADA MANUALMENTE |
| UAT-07 | E2-16 refleja el nombre | APROBADA MANUALMENTE |
| UAT-08 | `fechaInicio` no editable | APROBADA MANUALMENTE |
| UAT-09 | Cerradas sin edición | APROBADA MANUALMENTE |
| UAT-10 | No-Owner sin acceso | APROBADA MANUALMENTE |
| UAT-11 | Rol global sin ownership | APROBADA MANUALMENTE |
| UAT-12 | Nombre inválido | APROBADA MANUALMENTE |
| UAT-13 | No-op | APROBADA MANUALMENTE |
| UAT-14 | Doble envío | APROBADA MANUALMENTE |
| UAT-15 | Retry | APROBADA MANUALMENTE |
| UAT-16 | Stale sin sobrescritura | APROBADA MANUALMENTE |
| UAT-17 | Edición contra cierre | APROBADA POR EMULATOR; carrera simultánea explícita y ambos órdenes serializables cubiertos |
| UAT-18 | Transferencia de ownership | APROBADA POR EMULATOR; reautorización y pérdida de recovery cubiertas |
| UAT-19 | Agregados ajenos intactos | APROBADA POR EMULATOR E INSPECCIÓN PERSISTENTE; Grupo, guard, Membresía, Solicitud, Partido y Torneo comparados antes/después |
| UAT-20 | Responsive, teclado y foco | APROBADA POR PRUEBAS E INSPECCIÓN; tests de frontend/arquitectura, revisión estática, typecheck y build |

La evidencia exclusiva de Emulator también cubre respuesta perdida, retry idéntico, conflicto de clave, dos ediciones concurrentes, recovery tras otra edición y tras cierre, corrupción cerrada, Rules deny-all y ausencia de writer cliente.

## 15. Inventario técnico definitivo

- Backend: callable/export `updateSeason`, contrato cerrado, servicio, hashes contextuales, store transaccional, writer mínimo y receipt estricto.
- Consulta: `getOwnSeason` conserva `SeasonDto` y agrega únicamente `editToken` nullable.
- Persistencia: raíz abierta v1 o cerrada v2; `seasonUpdateReceipts` v1 deny-all; guard/opening/closure receipts sin cambios.
- Frontend: servicio tipado, modelo de consulta, `EditSeasonSection` y montaje exclusivo sobre la Temporada actual.
- Rules: deny-all explícito para `seasonUpdateReceipts`; sin permisos nuevos sobre `seasons`.
- Pruebas: unitarias/contrato/arquitectura, Emulator E2-17 y regresiones focales E2-02/E2-15/E2-16; teardown portable del runner de tests.
- Documentación: este informe y el cierre formal separado. La ficha normativa permanece intacta.

## 16. Estado previo al versionado

- Rama técnica `feat/e2-17-season-edit`, basada en `043d1e692b0ef4834d80d291bf606b497f173287`.
- Cambios locales revisados como exclusivos de E2-17; índice vacío y cero stashes antes de separar commits.
- Ficha E2-17, E2-14, Documento 5, documentos arquitectónicos y Auth/UAT intactos.
- Sin deploy ni acceso a Firebase remoto; E2-18 no iniciado.
- El estado Git integrado y los SHA definitivos se registran en el acto de cierre y en la entrega final, evitando referencias circulares dentro del propio commit documental.
