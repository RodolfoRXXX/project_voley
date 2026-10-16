# E3-04 — Informe de implementación local

## Estado y alcance

Implementación local sobre `feat/e3-04-administrative-receipts`, base inicial
`54c5bb64ad2ca03e1c5989f637496a6cea4a4e2e`, coincidente con `dev` y `origin/dev` locales.
Se aplicaron la ficha E3-04, el addendum adoptado y DEC-E3-04 / D5-049 sin modificar normativa,
sin Firebase remoto, deploy, integración Auth/UAT real ni operaciones Git de integración.

Este informe no declara cerrado E3-04 ni Etapa 3. D5-045 permanece como riesgo residual no
resuelto. D5-044 y el gate económico legacy no cambian.

## Implementación

### Dominio y contratos

- Se agregó el módulo `administrativeReceipts` con contratos cerrados, errores estables, dominio y
  unidad transaccional Firestore.
- `paymentDeliveries/{receiptId}` admite la evolución compatible: v1 es `INFORMED` implícito y v2
  discrimina `INFORMED | ADMINISTRATIVE`. Los IDs E3-03 existentes siguen siendo `deliveryId` y
  `receiptId` sin backfill.
- Una raíz administrativa contiene registrante, contexto sujeto derivado, fecha, 1–20 líneas,
  total derivado, vigencia `APPLIED | REVERSED` y avisos resueltos. No contiene declaración ni
  confirmación del sujeto.
- Las aplicaciones v2 usan `source: { kind: "ADMINISTRATIVE", receiptId }`; Pago conserva importe,
  aplicaciones, saldo, estado y `economicRevision`.
- El DTO E3-03 se amplió aditivamente con `receiptId`, `origin: INFORMED`, estado
  `RESOLVED_BY_ADMINISTRATIVE_RECEIPT` y bloque opcional `resolution`. Los endpoints, queries,
  cursores, campos previos y semántica E3-03 se preservan.

### Recorrido y avisos

- `previewAdministrativeReceipt` reautoriza, relee Pagos y obtiene todos los `REPORTED` de la
  Membresía con `limit(21)`. Cero a veinte producen revisión y digest; veintiuno bloquea sin lista
  parcial utilizable.
- `recordAdministrativeReceipt` exige la misma revisión, digest, IDs, revisiones, líneas, saldos e
  importes. `FULL` conserva `amountMinor == expectedBalanceMinor`; nunca sustituye ni redistribuye.
- Cada candidato debe quedar como `DISTINCT_REAL_RECEIPT`, `SAME_CONFIRMABLE_NOTICE`,
  `SAME_REQUIRES_ADMINISTRATIVE_RECORD` o `UNDETERMINED`. Omisión, extra, indeterminado o stale
  bloquean.
- Un aviso correcto devuelve `NOTICE_CONFIRMATION_REQUIRED` y deriva a E3-03; no crea recepción ni
  concede revisión. Una corrección exige igualdad exacta entre `correctedFields` y las diferencias
  reales de fecha y mapa `paymentId -> importe`.
- La resolución administrativa conserva declaración, agrega vínculo terminal y no crea aplicación
  propia. La reversión de la recepción no reabre el aviso y no produce doble ingreso.

### Atomicidad, guard e idempotencia

- Registro/resolución y reversión son transacciones todo-o-nada. La reversión es completa,
  motivada, Owner-only e idempotente.
- `paymentReceiptCandidateGuards/{opaque(groupId,membershipId)}` contiene sólo contexto, revisión,
  timestamps y schema. El bootstrap es lazy y transaccional; no guarda snapshot, IDs, cantidad,
  importes o autorización.
- `reportOwnPaymentDelivery`, `confirmPaymentDelivery` y `rejectPaymentDelivery` crean/incrementan
  el guard en su transición efectiva. Retry/recovery terminal retorna antes del incremento. El
  límite 20 no se aplica a esos comandos E3-03.
- El hash de intención administrativa incluye actor derivado, scope, fecha, líneas/snapshots,
  revisión/digest y todas las clasificaciones. Recovery reautoriza y valida raíz, importes,
  aplicaciones, fuentes y vínculos originales; no exige que guard, saldo o revisión económica
  actuales conserven el snapshot histórico.
- No se agregaron reservas, heurísticas de duplicación, saga, reparto automático ni confirmación
  paginada.

### Autorización y privacidad

- Owner opera por Cuenta/ownership y no requiere Persona propia.
- `GROUP_DIRECT_PAYMENT_RECORD` tiene grants, slots y receipts independientes. Se revalidan Cuenta,
  Persona única, ancla, Membresía de autorización, slot, grant, Grupo y `ownershipRevision`.
- El delegado no registra contra ninguna Membresía de su Persona, no opera en archivo, no revierte
  y no obtiene historia general. Recovery delegado es sólo por referencia propia conocida.
- Cambio de Owner, archivo, finalización, renovación o reactivación no reviven grants. Owner en
  archivo sólo opera sobre Pagos con evidencia prearchivo.
- `GROUP_TREASURY` continúa siendo exclusivamente de consulta: ahora puede abrir el detalle
  económico y sus movimientos dentro del mismo Grupo que ya consulta, sin decisiones, reversión,
  avisos pendientes ni identidad de operadores. `GROUP_PAYMENT_NOTICE_REVIEW` no recibe historia
  económica general y `GROUP_DIRECT_PAYMENT_RECORD` conserva su lectura mínima; ninguna capacidad
  se convierte en otra.
- Firestore cliente sigue deny-all para raíces, aplicaciones, guard y receipts. Los DTOs propios
  omiten actor, grants, notas internas y datos ajenos.

### Historia y frontend

- Los readers de Recepción mezclan streams físicos informado y administrativo por
  `eventAt DESC, receiptId DESC`, con anclas independientes. Sólo avanzan el ancla de elementos
  emitidos; el prefetch no emitido se relee.
- Owner dispone de historia y detalle; el sujeto, historia compatible y detalle propio; el delegado,
  sólo outcome propio por referencia.
- La UI agrega **Registrar recepción**, búsqueda focal, selección total/parcial, total derivado,
  preview, clasificación completa, modales accesibles, mensajes por operación, single-flight y
  retry con intención estable.
- La navegación del delegado explica que el permiso es independiente. Owner puede conceder,
  revocar y consultar historia de grants. La reversión advierte explícitamente que corrige el
  registro, no devuelve dinero y no reabre avisos.
- Tras registrar o revertir se refrescan historia y reader económico canónico del Grupo.

## Persistencia e índices

Colecciones nuevas o evolucionadas:

- `paymentDeliveries`: raíces v1 informadas y v2 informadas/administrativas;
- `payments/{paymentId}/deliveryApplications`: v1 informada y v2 con fuente tipada;
- `paymentDeliveryReversals`: v1 con `deliveryId`, v2 con fuente tipada;
- `paymentReceiptCandidateGuards`;
- `administrativeReceiptCommandReceipts`;
- colecciones compartidas de grants/slots/receipts, separadas por `capabilityId`.

Índices agregados: candidatos por Membresía/estado/fecha; obligaciones por Membresía/vencimiento;
historia administrativa Owner y propia por origen/fecha, incluida la variante propia filtrada por
Membresía. No hay migración ni backfill.

## Archivos principales

- Backend: `functions/src/administrativeReceipts/**`, 14 callables nuevos y exports en
  `functions/index.js`.
- Compatibilidad E3-03 y detalle económico: `paymentDelivery.js`,
  `firestorePaymentDeliveryStore.js`, `getOwnerPaymentObligationDetail.js` y
  `getTreasuryPaymentObligationDetail.js`.
- Seguridad/persistencia: `firestore.rules` y `firestore.indexes.json`.
- Frontend: `AdministrativeReceiptsSection.tsx`, `OwnerDirectPaymentAccessSection.tsx`, servicio y
  tipos administrativos, ruta delegada `dashboard/direct-payment/[groupId]` e integración en las
  vistas Owner y de Membresías; `PaymentObligationDetailDialog.tsx` reutilizado por Owner/Tesorería
  con DTOs separados y entrada desde `TreasuryEconomyView.tsx`.
- Pruebas: `administrativeReceiptE3.test.js`, `administrativeReceiptRelationsE3.test.js`,
  `administrativeReceiptPaginationE3.test.js`, `administrativeReceiptConcurrencyE3.test.js`,
  `administrativeReceiptE3.test.js` unitario, medición de presupuesto y regresión E3-03 coordinada.

## Evidencia automatizada

### Gates

- Functions syntax: `412/412` archivos JavaScript, OK.
- Unit: `382/382` antes de la medición adicional; prueba de presupuesto adicional, OK.
- Emulator focal local, proyecto `demo-sportexa-e0-02`, Auth/datos sintéticos:
  `administrativeReceiptE3`, `administrativeReceiptRelationsE3` y regresión
  `paymentDeliveryE3`, OK.
- Frontend typecheck, OK.
- Frontend lint baseline, OK.
- Frontend build Next.js 16.1.3, compilación y TypeScript, OK.
- Índices JSON parse, OK.
- `git diff --check`, OK al cierre del informe.

- Simplificación visual: typecheck, lint focal, lint baseline y build, OK; no se ejecutó Emulator ni
  backend porque no cambiaron contratos ni persistencia.
- Correctivo UAT-01: regresión monetaria focal `2/2`, typecheck, lint baseline y build, OK.
- Correctivo de paginación: contrato/dinero unitarios `5/5`; Emulator focal
  `administrativeReceiptPaginationE3` `1/1`; Functions syntax focal, índices JSON, frontend typecheck,
  lint baseline y build, OK. No se repitieron suites integrales.
- Ajustes UAT de UI/readers: unit focal E3-03/E3-04 `8/8`; Emulator local focal de relaciones,
  indicador/detalle y compatibilidad/paginación, `2/2`; Functions cargó ambos callables, índices JSON,
  frontend typecheck, lint baseline y build Next.js 16.1.3, OK. El baseline conserva 36 errores y 9
  warnings conocidos, sin hallazgos nuevos. No se ejecutaron suites integrales.
- Correctivo focal de detalle: la regresión Emulator HTTP/Auth sintética y relaciones ejecutó `2/2`;
  cargó `getOwnerPaymentObligationDetail` y `getTreasuryPaymentObligationDetail`, recorrió los cuatro
  estados económicos y revocación. Functions syntax `419/419`, frontend typecheck, lint baseline y
  build Next.js 16.1.3, y `git diff --check`, OK. El baseline conserva 36 errores y 9 warnings
  conocidos y reporta 9 hallazgos resueltos; no hubo hallazgos nuevos. No se repitieron suites
  integrales.
- Evidencia focal pendiente E3-04: `administrativeReceiptConcurrencyE3.test.js` ejecutó `7/7` en
  Emulator local `demo-sportexa-e0-02`, con datos y Auth sintéticos. La selección
  `E3_04_EVIDENCE_FOCAL=1` ejecutó sólo ese archivo; no se repitieron suites integrales verdes.
  `node --check` del caso y del selector del runner, y `git diff --check`, OK.
- Simplificación visual de clasificación: frontend typecheck y build Next.js 16.1.3, OK; lint
  baseline estable en 36 errores y 9 warnings conocidos, con 9 hallazgos resueltos y ninguno nuevo.
  No se repitió Emulator ni ninguna suite backend; se conservan los resultados focales `7/7` y sus
  límites de aborto inyectado/revalidación documentados.
- Correctivo de trazabilidad `DISTINCT_REAL_RECEIPT`: sintaxis de store, regresión y runner, OK;
  medición unitaria focal `1/1`; Emulator local demo `administrativeReceiptRelationsE3` `1/1` tras
  agregar aserciones de persistencia, recovery y privacidad. No se repitieron suites integrales ni
  los casos de concurrencia `7/7` ya verdes.

### Casos identificables

- Unit `E3-04 presenta $45.000,00...`: reader minor preservado, comando `amountMinor = 4.500.000`
  y parciales con coma/punto decimal.
- Emulator `E3-04 pagina más de 50...`: páginas `20/20/15`, orden con empate por ID, 55 IDs
  únicos, selección/registro desde páginas distintas, cursor de otro actor rechazado y
  reautorización delegada negativa después de revocar el grant. La misma regresión incluye Pago v1
  sin campos económicos, v2 pendiente, v2 parcial y excluye v2 saldado antes de paginar.
- Emulator `clasifica avisos...` extendido: reader contextual devuelve sólo la entrega cuya línea
  contiene el `paymentId`; el detalle Owner presenta economía y aplicación administrativa sin UID
  ni email, y la corrección conserva un solo ingreso. La Cuenta que sólo informó su propio pago,
  sin capability de revisión ni ownership, es rechazada por ambos readers nuevos.
- Emulator callable `E3-02 recorre callables reales...` extendido: reproduce el request real de
  detalle con Auth sintética para cero aplicaciones, parcial, saldada y reversión; Owner recibe
  presentación del responsable, Tesorería sólo `la administración`, sin avisos ni IDs de actor. El
  reader Owner rechaza al delegado y el reader Tesorería reautoriza y rechaza después de revocar.

- Unit `E3-04 contratos cerrados...`: 1/20/21 líneas, duplicados y `FULL` exacto.
- Emulator `N=20/M=20...`: 20 Pagos, 20 avisos corregidos, registro todo-o-nada, resolución sin
  ingreso propio, reversión completa, avisos no reabiertos e idempotencia.
- Emulator `cero candidatos... y exceso 21`: bootstrap sin guard, cero candidatos, detección 21 y
  rechazo E3-03 aun con exceso.
- Emulator `clasifica avisos...`: correcto deriva a E3-03, indeterminado bloquea, correctedFields
  incompleto falla y corrección exacta resuelve sin doble aplicación.
- El mismo caso focal ahora registra con un candidato `DISTINCT_REAL_RECEIPT`, comprueba evidencia
  reconstruible en la raíz, aviso `REPORTED` intacto, confirmación E3-03 posterior, recovery
  `EXISTING` sin duplicación ni conflicto por revisión posterior, preservación tras reversión y
  ausencia de la evidencia interna en DTOs Owner/propio y respuesta de registro. También simula una
  raíz local previa retirando el campo: recovery permanece compatible y no inventa ni expone una
  clasificación histórica.
- Emulator `preview queda stale frente a reportar`: preview versus writer E3-03 y guard coordinado.
- Regresión `paymentDeliveryE3`: reportar/confirmar/rechazar, Pagos compartidos, permisos,
  prearchivo, recovery y transacciones solapadas con barreras deterministas. Los abortos inyectados
  prueban retry/reautorización; no se interpretan como detección automática de Firestore.
- Emulator `grant independiente...`: concesión, consulta, auto-registro prohibido, revocación,
  historia de grants y pérdida de acceso.
- Emulator `historia v1/v2...`: cursor compuesto, no duplicación y continuación con página
  dominada por un stream. Los readers implementan empates por ID y anclas independientes.
- Emulator focal `E3-04 evidencia focal de coordinación, recovery e historia v1/v2`: seis
  subcasos cubren registro E3-04 frente a confirmación y rechazo E3-03; revocación y archivo frente
  a registro delegado; reversión frente a otro registro sobre el mismo Pago; recovery
  administrativo después de un movimiento E3-03 legítimo; y empate real de timestamps entre
  historia física v1/v2. Se verifican autorización al retry, serialización JSON del resultado,
  ausencia de raíces/receipts/aplicaciones parciales o duplicadas y recuperación de los importes
  originales. La cobertura de confirmación/rechazo sigue perteneciendo también a E3-03: el caso
  focal sólo prueba su coordinación con un registro E3-04 solapado.
- Rules: acceso cliente denegado para raíces económicas y estado técnico E3-04.

Las pruebas secuenciales se distinguen de las solapadas; no se ejecutaron matrices de estabilidad
ni contención sostenida y no se usaron sleeps como garantía de orden.

### Localización y cierre de la evidencia pendiente

La revisión previa encontró cobertura relacionada, pero no suficiente para atribuir los cruces
solicitados a E3-04:

- `administrativeReceiptRelationsE3.test.js`, caso de clasificación de avisos: demostraba en forma
  secuencial la derivación de un aviso correcto a E3-03 y la resolución de uno corregido, no una
  transacción E3-04 solapada con confirmar/rechazar.
- `paymentDeliveryE3.test.js`: ya demostraba carreras, permisos y recovery propios de E3-03 con
  barreras deterministas. Se conserva como evidencia E3-03; no se la presenta como cobertura
  exclusiva del registro administrativo.
- `administrativeReceiptPaginationE3.test.js`: demostraba que revocar invalida una página delegada,
  no un registro delegado ya preparado.
- `administrativeReceiptE3.test.js`: demostraba reversión, grant/revocación, stale e historia
  combinada, pero no los cuatro cruces concretos ni un empate físico v1/v2 verificable.

El archivo focal nuevo `functions/test/emulator/administrativeReceiptConcurrencyE3.test.js` agrega:

1. **Registro frente a confirmar/rechazar:** para cada decisión E3-03, interrumpe el primer intento
   administrativo, completa la decisión y reintenta el mismo comando. Aserta
   `RELATED_NOTICE_REVIEW_STALE`, ausencia de raíz/receipt E3-04 y exactamente los efectos E3-03
   correspondientes; la aplicación v1 conserva `deliveryId` y no recibe por error la forma v2.
2. **Revocación y archivo frente a delegado:** revoca el grant o archiva el Grupo entre intento y
   retry. Aserta reautorización negativa y ausencia total de raíz, receipt, aplicación y mutación
   del Pago.
3. **Reversión frente a registro sobre Pago compartido:** revierte la recepción existente antes del
   retry de un segundo registro. Aserta stale, saldo/ingreso/estado restaurados y ninguna segunda
   aplicación.
4. **Recovery después de movimientos legítimos:** luego de registrar 400, confirma por E3-03 otros
   300 y recupera la intención administrativa original. Aserta resultado `EXISTING`, estado actual
   no recalculado, total original 400, guard sin otro incremento, saldo 300 y dos aplicaciones
   únicas; el DTO resultante serializa válidamente a JSON.
5. **Empates de historia v1/v2:** fija el mismo `commandAt` para raíces físicas v1 y v2, pagina de a
   dos y aserta orden por ID descendente, cero duplicados, ambos orígenes/esquemas y avance correcto
   de anclas independientes.

Los casos 1, 2, 3 y archivo son ejecuciones solapadas mediante una barrera determinista en
`beforeRecordCommit`: el primer intento aborta de manera **inyectada** con `maxAttempts=1`, se aplica
el movimiento competidor y luego se realiza un retry explícito. Esto prueba retry y reautorización;
no afirma que Firestore haya detectado automáticamente un conflicto. Recovery e historia son casos
secuenciales. No se usaron sleeps, matrices de contención ni Firebase remoto.

### Medición N=20, M=20

La instrumentación del Emulator observó **63 escrituras** al registrar:

`20 Pago + 20 aplicación + 20 avisos + raíz + receipt + guard = 63`.

Lecturas instrumentadas del commit Owner máximo: 66 documentos/resultados (receipt, raíz,
Membresía, Cuenta, Grupo, guard, 20 candidatos, 20 Pagos y 20 aplicaciones). Preview Owner máximo:
45 lecturas/resultados y una escritura sólo si inicializa el guard. Un delegado suma la evidencia
de identidad/slot/grant/ancla correspondiente.

Medición serializada representativa ejecutable del máximo:

- raíz administrativa con 20 decisiones y ambos `correctedFields`: **9.064 bytes**;
- write-set completo de 63 documentos/patches: **32.096 bytes**;
- documentos representativos de autorización delegada más guard: **1.311 bytes**.

El máximo cumple el presupuesto documental de 63 escrituras; no fue necesario cambiar límites ni
atomicidad.

## Incidencia UAT-01 — corregida y confirmada

UAT-01 detectó que una obligación canónica de **$45.000** (`balanceMinor = 4.500.000`) se mostraba
como **$4.500.000** al preparar el registro administrativo. La prueba quedó bloqueada y el pago
observado no se registró con el importe incorrecto.

La traza focal confirmó:

- el reader Firestore y el DTO `listDirectPaymentObligations` entregaban correctamente
  `balanceMinor = 4.500.000`;
- el formulario aplicaba formato ARS directamente al entero minor, sin dividir por 100;
- el modo **Total** conservaba el entero canónico y habría enviado `amountMinor = 4.500.000`, por lo
  que allí el defecto era de presentación;
- el modo **Parcial** convertía el texto con `Number(...)`, por lo que ingresar `45000` habría
  enviado 45.000 centavos: allí el defecto también alcanzaba al comando.

El correctivo reutiliza el parser/formateador ARS canónico en el límite de UI: muestra
**$45.000,00**, mantiene **Total** exactamente en `4.500.000` centavos y convierte parciales como
`22500,50 -> 2.250.050`. Una selección parcial inválida o superior al saldo bloquea el preview; no
se compensó el defecto en persistencia ni se alteraron readers, DTOs o contratos backend.

La regresión automatizada cubre presentación, comando total, parcial con coma y punto decimal y
rechazo de más de dos decimales/exceso de saldo. El 15 de octubre de 2026 el usuario confirmó
UAT-01; no se atribuyen a esa confirmación otros escenarios.

## Simplificación visual implementada

La reorganización inicial se implementó sin modificar normativa, persistencia económica ni
permisos:

- `OwnerEconomySection` agrupa las obligaciones cargadas por la clave exacta
  `seasonId + membershipId`. Cada tarjeta aclara que representa páginas consultadas y no muestra
  sumas como deuda total del integrante.
- Cada contexto ofrece una única acción **Registrar pago**, que abre
  `AdministrativeReceiptDialog`. El modal compartido por Owner y delegado conserva selección de
  1–20 obligaciones, Total/Parcial, fecha, total derivado, preview, clasificación completa,
  stale checks, intención estable y recovery. Cerrar un borrador requiere confirmación; una
  intención incierta no puede descartarse.
- La bandeja general sigue paginando pendientes y abre cada entrega completa para una única
  confirmación o rechazo; continúa cubriendo sujetos ausentes de la página actual de obligaciones.
  El botón contextual que sólo desplazaba hacia esa bandeja fue retirado en el ajuste UAT descrito
  abajo.
- `OwnerPaymentReceiptHistorySection` reúne ambos orígenes, queda inicialmente colapsada, pagina
  con el cursor v2 y conserva las reversiones Owner-only de receipts informados y administrativos,
  siempre con advertencia de que no existe devolución de dinero.
- `OwnerAccessManagementSection` es la única entrada visible **Administrar accesos**. Dentro del
  modal monta por separado consulta económica, revisión de pagos informados y registro de pagos;
  no crea rol, asignación conjunta, herencia por cargo ni cruce de capabilities.
- La superficie delegada reutiliza el mismo modal después de `searchDirectPaymentSubjects` y
  `listDirectPaymentObligations`; no usa `listGroupObligations`, historia Owner ni bandeja de
  revisión salvo que el actor posea independientemente esa otra capability.

### Correctivo focal de paginación por Membresía

La ficha ya aprobaba `listDirectPaymentObligations({ groupId, membershipId, pageSize?, cursor? })`,
página default 20 y máximo 50. La omisión de implementación tenía cuatro puntos: el contrato
aceptaba `cursor`, pero el store no lo decodificaba ni aplicaba; la query carecía del desempate
explícito por ID; el filtrado de saldo ocurría después del límite físico; y store, DTO frontend y
modal no propagaban `nextCursor`.

El correctivo mantiene el mismo alcance funcional:

- query física por `membershipId` y estados económicos abiertos `PENDING | PARTIAL`, sin filtrar
  resultados después del límite;
- orden total `dueDate DESC, __name__ DESC`, `limit(pageSize + 1)` y continuación real mediante
  `startAfter(dueDate, paymentId)`;
- cursor opaco v1 ligado por hash a contrato, actor, tipo de autorización Owner/delegado, Grupo,
  Membresía, Temporada, Persona, estados, orden y `pageSize`;
- relectura del ancla y validación de scope/estado antes de continuar; cada request relee Cuenta,
  Grupo y toda la evidencia Owner o grant/slot/ancla delegada antes de usar el cursor;
- respuesta aditiva `nextCursor?`, servicio tipado y botón **Cargar más obligaciones**. El modal
  concatena páginas sin borrar selecciones y mantiene el máximo de 20 líneas del registro;
- índice `payments(membershipId ASC, estado ASC, dueDate DESC)`. No hay offsets, lecturas cliente
  directas ni cálculo económico en frontend.

La prueba Emulator focal recorrió 55 obligaciones con una misma fecha en páginas `20/20/15`, sin
omisiones ni duplicados y con desempate por ID. Seleccionó líneas de la primera y tercera página y
registró una recepción conjunta válida. También rechazó un cursor Owner usado por delegado y la
continuación delegada después de revocar el grant. Por tanto, la continuación real queda demostrada
en evidencia automatizada; su re-UAT visual continúa pendiente.

El correctivo monetario permanece en el límite compartido: `$45.000` se presenta como
`$45.000,00` y genera `amountMinor = 4.500.000`, sin recalcular economía ni compensar persistencia.

## Resultado humano UAT informado

Estado comunicado por el usuario el 15 de octubre de 2026, sin atribuir ejecuciones adicionales:

| UAT | Estado humano | Alcance registrado |
| --- | --- | --- |
| 01 | Confirmada | Presentación `$45.000,00` y comando en centavos corregidos. |
| 02 | Confirmada | Registro administrativo multiobligación según el recorrido probado. |
| 03 | Confirmada | El usuario confirmó el recorrido completo: aviso correcto derivado a confirmación E3-03, sin registro administrativo ni ingreso duplicado. |
| 04 | Confirmada | El usuario confirmó humanamente la corrección real: recepción administrativa vinculada, aviso resuelto con declaración preservada y un único efecto económico. |
| 05 | Sin confirmación humana | El exceso de 20 dispone de evidencia automatizada, pero no fue confirmado humanamente. Es un caso distinto de elegir **No estoy seguro**, recorrido que tampoco debe darse por acreditado por esa evidencia de límite. |
| 06 | Confirmada | Recorrido delegado autorizado. |
| 07 | Confirmada | Bloqueo de auto-registro y pérdida de acceso tras revocación. |
| 08 | Confirmada | El usuario confirmó la reversión desde historia Owner. |
| 09 | Confirmada | Restricciones de archivo. |
| 10 | Confirmada | Consulta propia con privacidad mínima. |

## Ajustes focales posteriores a UAT-03/04/08

- Se retiró **Ver pagos informados** de cada contexto porque sólo desplazaba la página. La bandeja
  general se conserva como entrada independiente y paginada.
- `listReportedPaymentDeliveriesForPayments` recibe 1–20 pares canónicos
  `paymentId + membershipId`, relee esos Pagos, reautoriza Owner/revisor y ejecuta una única query
  backend por Grupo, estado `REPORTED` y conjunto de Membresías. Sólo devuelve coincidencias reales
  de las líneas por `paymentId`; no consulta Firestore desde cliente, no usa saldos, no hace N+1 y
  no interpreta una página incompleta como ausencia.
- Cada obligación visible con coincidencia muestra **Pago informado pendiente de revisión**. La
  acción abre mediante el reader E3-03 autorizado la entrega completa en el modal existente; la
  confirmación o rechazo sigue siendo único por entrega, nunca por línea. La bandeja general sigue
  siendo necesaria para sujetos fuera de la página visible.
- Se eliminaron de tarjetas, modal de registro, bandeja y detalle de entrega los textos
  `Temporada <ID>` y `Membresía <ID>`. Los IDs continúan sólo en scope, React keys y comandos. Cuando
  el reader no ofrece etiqueta humana, el texto técnico se omite; la clave interna exacta
  `seasonId + membershipId` sigue impidiendo mezclar contextos.
- **Ver detalle** abre un modal Owner servido por `getOwnerPaymentObligationDetail`: Persona,
  nombres disponibles de Grupo/Temporada, concepto y snapshot, período u ocurrencia, exigible,
  vencimiento, ingresos netos, saldo/estado, todas las aplicaciones informadas o administrativas y
  sus reversiones. Las aplicaciones se leen por páginas físicas de 20 con cursor opaco actor/scope;
  los avisos `REPORTED` vinculados al mismo `paymentId` aparecen separados y sin efecto económico.
- La presentación del validador se resuelve sólo en el DTO Owner: nombre de Persona canónica si la
  Cuenta la posee o etiqueta mínima `Owner del Grupo`, `Revisor autorizado` o `Registrante
  autorizado`. Nunca expone UID, email ni IDs técnicos. No se agregó esta identidad a DTOs propios
  delegado de Tesorería. `getTreasuryPaymentObligationDetail` reautoriza `GROUP_TREASURY` en cada
  página, entrega economía y movimientos sin avisos ni acciones, y presenta al operador sólo como
  **la administración**, sin UID, email, nombres de terceros ni IDs internos. El addendum E3-04 no
  restringe este reader a Owner: excluye que Tesorería autorice registro o se convierta en otra
  capacidad; D5-047 ya adopta consulta de obligaciones del Grupo, por lo que no hizo falta ajuste
  normativo para profundizar esa misma lectura.
- UAT-08 no motivó cambios en reversión: se conservó la acción Owner-only ya existente y su
  advertencia de que corregir el registro no devuelve dinero.

### Incidencia de `Ver detalle` y correctivo

La evidencia humana mostró el request autenticado real a `getOwnerPaymentObligationDetail` y dos
respuestas fallidas. El log sanitizado de Functions registró Firestore `code: 9`; el log del
emulador precisó `Firestore does not support descending key scans`. La causa concreta era
`deliveryApplications.orderBy(__name__, desc)`: la autorización y el Pago se leían, pero Firestore
abortaba la consulta física antes de construir el DTO. No era un vacío ni un error de presentación.

El correctivo cambia únicamente esa consulta a `__name__ ASC`, actualiza el scope opaco a ese orden
y conserva `startAfter(applicationId)`, `limit(pageSize + 1)`, validación del documento ancla y
reautorización por página. No se suprimieron validaciones ni se modificó persistencia. La regresión
HTTP reproduce el payload frontend `{ groupId, paymentId, pageSize: 20 }` mediante la callable real
y Auth sintética para obligación sin movimientos, parcial, saldada y con reversión. También prueba
el DTO Owner con responsable presentable, el DTO Tesorería sin identidad ajena, rechazo del reader
Owner al delegado, rechazo de Tesorería tras revocación y ausencia de IDs de actor en la respuesta.

La comprobación humana posterior confirmó **Ver detalle** en ambos perfiles: Owner visualiza
economía, movimientos y responsables presentables; Tesorería visualiza economía y movimientos sin
identidades de operadores ni acciones nuevas. Esta confirmación no acredita los recorridos
restantes por sí sola ni altera las incidencias, causas y correctivos documentados arriba. UAT-03 y
UAT-04 cuentan además con sus confirmaciones humanas independientes registradas en la tabla.

### Recorridos humanos aclarados

UAT-03 — aviso correcto:

1. Crear o identificar una entrega `REPORTED` cuyo mapa `paymentId → importe` y fecha declarada
   coincidan exactamente con lo constatado.
2. Abrir la obligación mediante **Pago informado pendiente de revisión** y revisar la entrega
   completa.
3. Confirmarla en E3-03. Verificar una única aplicación económica y ausencia de una recepción
   administrativa nueva. `confirmPaymentDelivery` no permite editar fecha, líneas ni importes.

UAT-04 — misma entrega con corrección real:

1. Mantener `REPORTED` una entrega cuya fecha o mapa `paymentId → importe` sea incorrecto.
2. Desde **Registrar pago**, seleccionar las obligaciones e importes reales constatados y preparar
   el preview.
3. Clasificar ese aviso como **Es la misma, requiere corrección**. El resumen debe enumerar
   exactamente `RECEIVED_DATE` y/o `AMOUNT_OR_ALLOCATION`; si no existe diferencia real, no permite
   registrar.
4. Registrar. Verificar en una única transacción la recepción administrativa aplicada y el aviso
   terminal `RESOLVED_BY_ADMINISTRATIVE_RECEIPT`, con declaración original/vínculo preservados y
   sin aplicación ni ingreso propios del aviso.

El recorrido UAT-04 ya estaba implementado; el ajuste agrega descubribilidad contextual y pasos
humanos, sin edición de avisos ni cambios a `confirmPaymentDelivery`.

### Hallazgo y correctivo de trazabilidad de clasificaciones

Antes de simplificar la presentación se comprobó la persistencia de las cuatro clasificaciones. El
resultado es desigual:

- `SAME_REQUIRES_ADMINISTRATIVE_RECORD` queda reconstruible en el aviso informado mediante
  `decisionState = RESOLVED_BY_ADMINISTRATIVE_RECEIPT`,
  `resolution.administrativeReceiptId`, `resolution.correctedFields`, `resolution.resolvedAt`,
  `resolution.resolvedByAccountId` y el alias compatible `resolvedByAdministrativeReceiptId`. La
  raíz administrativa conserva `resolvedNoticeIds`. La regresión
  `administrativeReceiptRelationsE3.test.js` comprueba el estado terminal, una única aplicación y
  el ingreso neto único; el caso máximo N=20/M=20 comprueba además todos los vínculos.
- `SAME_CONFIRMABLE_NOTICE` y `UNDETERMINED` bloquean o derivan antes de crear la recepción, por lo
  que correctamente no generan un registro de clasificación E3-04.
- Antes del correctivo, `DISTINCT_REAL_RECEIPT` permitía continuar y dejaba el aviso en `REPORTED`,
  pero no quedaba persistido como decisión auditable. El command receipt y la raíz contenían
  `requestHash`; ese hash verificaba igualdad, pero no permitía reconstruir la decisión humana ni
  identificar qué aviso había sido clasificado como distinto.

La causa fue que el writer derivaba `resolvedNoticeIds` sólo del subconjunto corregido y descartaba
el resto de `relatedNoticeDecisions` después de incluirlo en `requestHash`. El caso Emulator llamado
“clasifica avisos correctos, corregidos, distintos e indeterminados” tampoco ejecutaba entonces un
registro exitoso con `DISTINCT_REAL_RECEIPT`.

El correctivo embebe en cada raíz administrativa nueva `relatedNoticeDecisions`, arreglo canónico,
inmutable y backend-only de máximo 20 elementos. Cada elemento contiene únicamente `deliveryId`,
`expectedDeliveryRevision`, `relation` y, sólo para
`SAME_REQUIRES_ADMINISTRATIVE_RECORD`, `correctedFields`. Actor y timestamp siguen siendo los únicos
`recordedByAccountId` y `recordedAt` de la raíz; no se duplican por fila ni se copian declaraciones o
datos personales. `resolvedNoticeIds` debe coincidir exactamente con el subconjunto corregido.

La persistencia ocurre en la misma creación de raíz y no suma escrituras. Para
`DISTINCT_REAL_RECEIPT` no se escribe el aviso: permanece `REPORTED` e intacto, sin aplicación,
ingreso, vínculo o estado adicional, y E3-03 puede confirmarlo después como otra recepción. Recovery
compara la evidencia persistida con la intención original, pero no exige que el aviso siga pendiente
ni que conserve su revisión después de operaciones legítimas. Reversión actualiza sólo sus campos
propios y conserva el arreglo.

Compatibilidad explícita: una raíz local schema v2 anterior sin `relatedNoticeDecisions` continúa
legible y recuperable bajo la evidencia histórica previa de receipt/request hash/aplicaciones, sin
backfill. La ausencia se interpreta como **evidencia de clasificación no disponible**, nunca como
`DISTINCT_REAL_RECEIPT` ni como otra clasificación demostrada. Toda raíz nueva persiste el arreglo,
incluso vacío. El campo no forma parte de los DTOs Owner, propios ni de outcome delegado.

La clasificación visual ahora pregunta **¿Este aviso corresponde al dinero que estás
registrando?**, parte sin respuesta seleccionada y presenta:

- **No, es otro pago** → `DISTINCT_REAL_RECEIPT`; explica que el aviso permanece pendiente.
- **Sí** → exige una segunda elección entre **El aviso es correcto**
  (`SAME_CONFIRMABLE_NOTICE`, confirmar por E3-03) y **Necesito corregir importe, distribución o
  fecha** (`SAME_REQUIRES_ADMINISTRATIVE_RECORD`, declaración original conservada y vinculada).
- **No estoy seguro** → `UNDETERMINED`; explica que no se registra.

La opción intermedia **Sí** no es una clasificación backend y mantiene deshabilitado **Registrar**
hasta elegir uno de sus dos resultados. Se conservan las cuatro clasificaciones, sus efectos, el
cálculo exacto de `correctedFields` y la derivación E3-03. No hay selección automática.

### Compatibilidad física de `listDirectPaymentObligations`

La consulta usa físicamente `membershipId == ...`, `estado in [PENDING, PARTIAL]`, orden
`dueDate DESC, __name__ DESC` y `limit(pageSize + 1)`. Por eso incluye antes del límite:

- Pago E3-01 v1, que persiste `estado=PENDING` sin campos económicos; `economicPayment` lo normaliza
  a saldo `amountMinor`, ingreso neto cero y revisión 1 sólo después de haber sido incluido;
- Pago evolucionado pendiente con `estado=PENDING` y campos económicos v2;
- Pago parcial v2 con `estado=PARTIAL`.

Excluye físicamente `estado=SETTLED`. No depende de `balanceMinor`/`economicState` ausentes en v1 y
no filtra resultados después del límite. La regresión de paginación con 55 documentos demuestra
continuación sin omisiones/duplicados; la prueba focal de relaciones demuestra coincidencia por
`paymentId` y detalle de la aplicación. No hubo incompatibilidad que exigiera cambiar persistencia.

## Re-UAT mínima pendiente para estos ajustes

UAT-04 fue confirmada humanamente y la nueva presentación fue aceptada en términos generales. Esa
aceptación no se extiende automáticamente a todos los recorridos. Queda una re-UAT breve sobre los
ajustes de marco, ancla, Temporadas y resumen económico descrita al final de este informe; también
conviene comprobar que una entrega pendiente fuera de las obligaciones visibles siga accesible
desde la bandeja general.

La trazabilidad automatizada focal de concurrencia/recovery solicitada quedó cubierta por el caso
dedicado descripto en **Localización y cierre de la evidencia pendiente**. Permanece separada de las
confirmaciones humanas: UAT-03 y UAT-04 quedaron confirmadas. UAT-05 no tiene confirmación humana;
el exceso de 20 conserva evidencia automatizada, sin exigir fabricación de volumen humano, y no debe
confundirse con la opción **No estoy seguro**, que representa una decisión funcional diferente.

## Estado humano / UAT ejecutable

UAT no fabrica recovery técnico ni exige carreras manuales. UAT-03 y UAT-04 están confirmados con
el alcance registrado; la aceptación general de presentación no acredita por sí sola los demás
recorridos:

1. Como Owner, abrir un Grupo y **Registrar recepción**. Buscar una Membresía con saldo, seleccionar
   una obligación total, revisar sujeto/fecha/desglose/total y registrar.
2. Repetir con dos obligaciones y al menos una línea parcial. Verificar badges **Total/Parcial**,
   total derivado e historia **Administrativo**.
3. **Confirmado:** con un aviso idéntico pendiente, elegir **Es correcto**, confirmar desde
   **Revisar entregas** y comprobar que E3-04 no creó otra recepción.
4. **Confirmado:** con aviso de la misma recepción pero fecha o desglose incorrectos, elegir
   corrección, registrar y comprobar aviso resuelto, declaración preservada y un solo ingreso en
   Pago.
5. Elegir **No estoy seguro** y comprobar que no hay efectos. Este recorrido no equivale al rechazo
   por exceso de 20: el límite conserva evidencia automatizada, pero UAT-05 no tiene confirmación
   humana ni requiere fabricar volumen para obtenerla.
6. Conceder `GROUP_DIRECT_PAYMENT_RECORD` a otra Persona. Como delegado, entrar desde el acceso
   descubrible, registrar para un tercero y comprobar que no aparecen economía/historia general ni
   opciones de reversión.
7. Intentar una Membresía de la Persona delegada: debe bloquear. Revocar el grant y comprobar
   pérdida inmediata de acceso.
8. Como Owner, revertir un registro aplicado con motivo. Verificar saldos, estado **Revertido**,
   aviso no reabierto y advertencia de que no existe devolución real de dinero.
9. Archivar un Grupo preparado: delegado no opera; Owner sólo puede liquidar Pagos prearchivo.
10. Como sujeto, revisar historia propia y comprobar origen/fecha/total/líneas/estado sin actor ni
    información ajena.

## Reorganización contextual de navegación y Economía

Implementada localmente el 15 de octubre de 2026 sobre el mismo árbol E3-04, sin operaciones Git de
integración ni cambios normativos.

### Estructura final y rutas

- La navegación personal conserva **Inicio**, **Mis grupos** y **Mis obligaciones**. No se retiraron
  incidentalmente las entradas públicas/legacy, catálogos ni tombstones.
- Un layout compartido de App Router en `/dashboard/groups/[groupId]/layout.tsx` mantiene montados
  nombre, selector y navegación contextual al pasar entre subvistas del mismo Grupo. Antes, Resumen
  y Economía resolvían y dibujaban ese marco por separado, con loaders completos y estado duplicado.
  El layout sólo compone presentación: cada reader y writer conserva su reautorización.
- El resumen Owner continúa en `/dashboard/groups/[groupId]`; Integrantes permanece en ese destino
  mediante `#integrantes`; Temporadas tiene la ruta canónica
  `/dashboard/groups/[groupId]/seasons`; Economía conserva
  `/dashboard/groups/[groupId]/economy`. Crear una Temporada continúa en
  `/dashboard/groups/[groupId]/seasons/new`, ahora vuelve a la vista dedicada.
- El ancla de Integrantes fallaba porque estaba aplicada a un contenedor con `display: contents`,
  que no generaba una caja desplazable; además, desde otra subvista el destino no estaba montado.
  Ahora apunta a una sección real con margen de scroll, y el enlace navega primero al Resumen y
  monta esa sección antes de resolver el hash. El estado activo contempla hash, ruta y
  atrás/adelante.
- La ruta económica canónica es `/dashboard/groups/[groupId]/economy`, con pestañas autorizadas
  `?tab=debts`, `?tab=notices` y `?tab=history`. Las rutas anteriores
  `/dashboard/treasury/[groupId]`, `/dashboard/payment-review/[groupId]` y
  `/dashboard/direct-payment/[groupId]` redirigen de forma compatible a esa ruta sin retirar
  endpoints.
- El selector compone `listOwnGroups` y todas las páginas de `listMyCurrentGroupMemberships`, pero
  sólo ofrece un contexto delegado después de validar al menos una capability económica. La etiqueta
  distingue **Owner** de **Acceso delegado**; pertenecer al Grupo no concede administración.
- Cada carga de la ruta relee `groupId` y revalida ownership o cada contexto delegado. Al cambiar de
  Grupo el layout limpia acceso y protección del contexto anterior antes de resolver el nuevo. El
  selector confirma descarte si existe un borrador; la recarga/navegación externa usa
  `beforeunload`, y una intención E3-04 incierta conserva el bloqueo de cierre/recovery del modal
  existente. La navegación de Grupo es una sola fila; las pestañas de Economía permanecen internas
  y diferenciadas.

### Componentes reutilizados

- El Resumen elimina las cajas permanentes **Organización activa** y **Tu acceso**. El nombre está
  en el encabezado compartido; archivo y restricciones se informan junto a las acciones afectadas,
  sin exponer etiquetas técnicas de capabilities ni llamar Organización al Grupo.
- `GroupSeasonSummaryCard` reutiliza `getOpenSeasonContext` para mostrar Temporada actual, estado y
  fecha o un vacío claro. `SeasonHistorySection`, con lifecycle, operaciones y paginación intactos,
  se monta sólo en la ruta dedicada; no queda una segunda gestión completa en Resumen.
- `GroupEconomySummaryCard` consume el reader exacto Owner-only, muestra saldo pendiente total,
  cantidad de obligaciones con saldo y entregas pendientes de revisión, y enlaza **Abrir economía**.
- `GroupContextNavigation` concentra selector y submenú sin repetir un árbol por Grupo.
- Owner reutiliza `OwnerEconomySection`, `PaymentDeliveriesAdminSection`,
  `OwnerPaymentReceiptHistorySection` y `OwnerAccessManagementSection`. **Conceptos** y
  **Administrar accesos** son controles secundarios cerrados inicialmente.
- Tesorería reutiliza el reader económico y `PaymentObligationDetailDialog` mediante
  `TreasuryDebtSection`, sin conceptos, decisiones, identidad de operadores ni escrituras.
- Revisor conserva la bandeja/decisiones E3-03 completa. Registrante directo conserva
  `AdministrativeReceiptsSection` y el modal multiobligación, sin adquirir Tesorería, revisión o
  historia general.
- Historial Owner presenta una fila por Recepción y una sola acción **Ver detalle**; la reversión
  Owner-only vive dentro del detalle con la advertencia de que corrige el registro y no devuelve
  dinero.
- **Mis obligaciones** usa el reader combinado `listMyPaymentReceipts` en lugar de yuxtaponer
  Entregas e ingresos. Distingue declaración pendiente/rechazada/resuelta, ingreso confirmado y
  registro administrativo, pagina el historial, obtiene detalle propio con
  `getMyPaymentReceipt` y compone nombres de Grupo/Temporada mediante el historial público de
  Membresías. No expone operador, UID, email ni IDs técnicos.

### Cambio contractual mínimo

`listGroupObligations` y `listMyObligations` aceptan aditivamente el filtro cerrado
`economicStates: ["PENDING", "PARTIAL"]`. El frontend económico lo envía siempre. Firestore aplica
`estado in [...]` antes de `orderBy`, cursor y `limit`; se agregaron índices
`groupId + estado + dueDate` y `personId + estado + dueDate`. El cursor liga el filtro al scope y
revalida que el ancla siga dentro de los estados pedidos. Esto evita filtrar saldadas después del
límite y permite que una reversión que restaura saldo vuelva a incluir la obligación. No cambia
saldo, aplicaciones, grants, reglas económicas ni writers.

Se agregó `getOwnerGroupEconomySummary({ groupId })`, estrictamente Owner-only y de lectura. Dentro
de una transacción relee Cuenta y ownership, consulta físicamente Pagos del Grupo con
`estado in [PENDING, PARTIAL]`, hidrata compatibilidad v1/v2 y suma `balanceMinor` canónico; cuenta
por separado entregas `REPORTED`. Devuelve únicamente `pendingBalanceMinor`,
`pendingObligationCount` y `pendingNoticeCount`. No persiste proyección, no recalcula saldos en
frontend y un aviso no altera deuda. Es exacto más allá de cualquier página, pero su costo es
lineal en obligaciones abiertas y avisos pendientes del Grupo. Los filtros de igualdad usan los
índices existentes; no fue necesario agregar otro índice.

### Limitaciones concretas

- El resumen exacto evita transferir historia completa al frontend, pero actualmente lee en backend
  cada obligación abierta para normalizar Pagos v1 y v2. Si el volumen abierto creciera de forma
  desproporcionada, su costo lineal justificaría una optimización de agregación compatible; no se
  introdujo ahora otro saldo autoritativo editable.
- El DTO propio de Recepción conserva concepto, vencimiento, fecha e importe, pero no persiste una
  etiqueta separada de Período/cobro específico ni nombres de Grupo/Temporada. La UI compone los
  nombres desde `listMyGroupMembershipHistory` y muestra conceptos/vencimientos; no amplía el DTO ni
  reconstruye IDs como texto. Incorporar la etiqueta exacta de Período/cobro requeriría una futura
  ampliación mínima del reader o snapshot, con su decisión y pruebas propias.
- El selector contextual no ofrece un “Resumen” delegado porque no existe hoy una vista general
  autorizada para integrante/delegado. Sólo muestra Economía cuando una capability independiente la
  habilita; no se fabricó una pantalla ni se convirtió pertenencia en permiso.

### Comprobaciones ejecutadas

- frontend `npx tsc --noEmit --incremental false`: OK;
- frontend `npm run lint:baseline`: OK, baseline estable en 36 errores y 9 warnings conocidos, con
  9 hallazgos resueltos y sin deuda nueva;
- frontend `npm run build`: OK, incluyendo layout compartido y ruta canónica de Temporadas;
- unit focal `node --test test/unit/paymentArchitecture.test.js`: `6/6`;
- se conserva la evidencia anterior `E3_01_FOCAL=1` `27/27`, que ya cubría exclusión antes de
  `limit(1)` y reaparición al restaurar saldo/revisión económica; no se repitió esa selección;
- Emulator local focal `E3_04_SUMMARY_FOCAL=1`: `1/1`; cubre pendiente, parcial, saldada,
  confirmación, reaparición por reversión, aviso pendiente sin reducción, autorización y 24
  obligaciones abiertas, por encima de una página;
- Functions syntax `422/422` y `git diff --check`: OK al cierre de esta reorganización.

No se repitieron suites integrales, matrices, concurrencia `7/7` ni E2-14. No se usó Firebase
remoto ni se exigieron más de 20 registros humanos.

### Re-UAT breve de la reorganización

1. Como Owner con dos Grupos, abrir un resumen; navegar entre Resumen, Temporadas y Economía; usar
   atrás/adelante y recargar. El encabezado/selector/navegación deben permanecer estables, y al
   cambiar de Grupo no deben verse datos del anterior.
2. Desde Resumen y desde Economía, elegir **Integrantes**; debe montar Resumen, desplazar al bloque
   real y marcar el destino activo. Repetir con navegación móvil.
3. Abrir **Temporadas** por URL directa; comprobar Temporada actual, vacío, historia paginada y
   operaciones existentes. En Resumen sólo debe quedar la tarjeta compacta y **Ver temporadas**.
4. Abrir **Economía**: contrastar saldo/cantidad/avisos de la tarjeta con Deudas y Pagos informados;
   confirmar que un aviso no baja deuda y que confirmar/revertir actualiza el resumen al recargar.
   Abrir/cerrar **Conceptos** y
   **Administrar accesos**; verificar que una fila histórica ofrece un solo **Ver detalle** y que la
   reversión mantiene su advertencia.
5. Como Tesorería, revisor y registrante directo por separado, abrir una ruta anterior y comprobar
   redirección canónica, pestañas/acciones estrictamente propias y pérdida inmediata tras revocar.
6. Iniciar un borrador de registro, intentar cambiar de Grupo y comprobar confirmación de descarte;
   verificar que recovery incierto no puede cerrarse silenciosamente.
7. En **Mis obligaciones**, revisar dos Grupos, selección paginada, historia combinada y detalle de
   muchas líneas; confirmar que una Entrega confirmada no aparece además como un segundo pago.

UAT-04 no se repite. La confirmación humana final posterior acredita que navegación contextual,
resumen económico y encabezado funcionan en el recorrido efectivamente probado. No se extiende a
pruebas específicas de móvil, recovery incierto, todos los perfiles ni escenarios no ejecutados, y
no equivale a aprobar de nuevo todos los recorridos económicos. Los puntos de la guía anterior que
no formaron parte de ese recorrido conservan su estado pendiente.

### Ajuste visual del encabezado compartido

El usuario aceptó visualmente la organización general y luego confirmó el funcionamiento del
encabezado dentro del recorrido probado. Esta confirmación no se atribuye como prueba funcional
adicional de edición, archivo, eliminación, permisos, navegación móvil, descarte o recovery.

- El layout compartido ubica el menú existente de tres puntos en la misma línea del nombre, en el
  extremo derecho, por lo que permanece estable en Resumen, Temporadas y Economía. El disparador
  conserva 44 × 44 px, etiqueta accesible, navegación por teclado y foco visible, pero ya no tiene
  borde, fondo ni sombra permanentes; hover aporta la señal visual sutil.
- El estado **Activo** o **Archivado** se presenta como badge discreto junto al nombre. El bloque del
  título puede envolver nombre y badge dentro del espacio restante sin invadir el menú en móvil.
- Se retiró del Resumen la fila redundante que repetía estado y menú debajo de la navegación. Los
  mismos `GroupActionsMenu`, diálogos, autorizaciones, confirmaciones, single-flight y callbacks de
  actualización siguen atendiendo **Editar nombre**, **Archivar grupo** y **Eliminar grupo**; no se
  modificaron contratos, permisos ni lifecycle.
- Selector, navegación contextual y la protección de descarte/recovery permanecen en el mismo
  layout y sin cambios de comportamiento.

Verificación proporcional de este ajuste: typecheck, ESLint focal de `GroupFrame`,
`GroupPageShell`, `GroupActionsMenu` y Resumen, y `git diff --check`, OK. No se repitieron build,
Emulator ni suites porque el cambio fue exclusivamente de composición y estilos frontend.

### Correctivo focal: Mis obligaciones sin pertenencias

La evidencia humana en el proyecto local `demo-sportexa-e2-04` mostró HTTP 400 al abrir **Mis
obligaciones**, con `listMyGroupMembershipHistory` y el mensaje público **Revisá los datos
ingresados**. La causa demostrada fue un incumplimiento del caller: en la primera página enviaba
exactamente `{ "pageSize": 50 }`; no incluía `cursor` ni filtros. El contrato vigente acepta
`pageSize` entre 1 y 20 (20 por defecto), y `cursor` es opcional pero debe ser string cuando está
presente. El rechazo fue `VALIDATION_FAILED` en la validación del callable, antes de resolver
identidad, autorización o ejecutar una consulta.

Por ese orden de rechazo, la traza humana por sí sola no permite determinar si aquella Cuenta
concreta tenía Persona. Tampoco había una sesión/emuladores locales activos que permitieran leer ese
estado sin modificar datos. La reproducción automatizada separó los casos: la Cuenta principal de
reproducción tiene Persona vinculada y ninguna Membresía; otra Cuenta no tiene Persona; una tercera
es exintegrante y conserva una obligación histórica.

El frontend ahora omite `pageSize` en este reader auxiliar: envía `{}` en la primera página y sólo
`{ "cursor": "…" }` en las siguientes, usando la paginación canónica. Además espera el contexto
público de `usePerson`: con Persona lista ejecuta los readers económicos; sin Persona no realiza
llamadas dependientes y muestra el mensaje específico con acceso al flujo existente
`/profile/person`. Un fallo real de identidad o de lectura conserva su alerta y reintento; no se
convierte `VALIDATION_FAILED` ni otro error técnico en lista vacía. No se condicionó la historia a
una Membresía activa y no hubo cambios de backend, contrato, permisos, reglas ni datos.

Evidencia focal ejecutada:

- callable local aislado `E3_04_MY_OBLIGATIONS_FOCAL=1`: `1/1`, sobre el proyecto demo seguro
  `demo-sportexa-e0-02`; prueba que el payload anterior obtiene HTTP 400/`VALIDATION_FAILED`, que
  Persona sin Membresías obtiene historia y obligaciones vacías, que Cuenta sin Persona conserva
  `PERSON_REQUIRED`, y que un exintegrante obtiene su Membresía histórica y obligación pendiente;
- frontend `npm run typecheck`: OK;
- ESLint focal de `MyObligationsView.tsx`: OK;
- `git diff --check`: OK (sólo avisos informativos de normalización LF/CRLF ya presentes).

La comprobación humana posterior confirmó que el correctivo resolvió el error observado al abrir
**Mis obligaciones**. El alcance de esa confirmación es únicamente el recorrido que fallaba: como el
rechazo original ocurría antes de resolver identidad y continúa desconociéndose si aquella Cuenta
humana tenía Persona, no se atribuye confirmación humana a los escenarios automatizados de Persona
sin Membresías, Cuenta sin Persona o exintegrante con obligaciones históricas.

Esta confirmación no altera UAT-03 ni UAT-04, que permanecen confirmadas con su alcance propio, ni
acredita UAT-05. La confirmación humana final también acredita navegación contextual, resumen
económico y encabezado en el recorrido probado; permanecen separados y pendientes los alcances no
ejecutados, en particular móvil, recovery incierto, todos los perfiles y los demás escenarios
enumerados en sus guías. Se conservan sin resolver las limitaciones documentadas, el costo lineal
del resumen, la deuda baseline de lint y D5-045. No se declara cierre de E3-04.

## Rollback local

Rollback consiste en retirar juntos: exports/callables E3-04, módulo `administrativeReceipts`, UI y
ruta E3-04, índices/Rules nuevos y coordinación del guard en los tres writers E3-03. No debe
eliminarse ni reescribirse evidencia ya persistida en un entorno real; este corte no hizo deploy ni
creó datos remotos. Para una reversión de código futura debe conservarse primero un reader tolerante
a v2 para no volver ilegibles raíces/aplicaciones existentes.

Ante corrupción, pérdida de autorización o violación de invariantes, el flujo afectado falla
cerrado con `INCOMPATIBLE_STATE` o error de autorización y no intenta reparación silenciosa. Los
logs locales de Emulator se conservan según el runner; no se reabrió E2-14.
