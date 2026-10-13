# E3-03 — Informe de implementación local

## Estado y checkpoint

- Fecha: 2026-10-13 (`America/Buenos_Aires`).
- Rama recibida y conservada: `feat/e3-03-payment-deliveries`.
- Base recibida: `79ca3d0fae24ea4ca4596225d578c36e3ffa08b2`, igual a `dev` y `origin/dev` locales.
- Preflight recibido: árbol e índice limpios, sin stashes y rama sin upstream.
- Alcance: implementación local conforme a la ficha E3-03, addendum adoptado y DEC-E3-03 / D5-048.
- No se hizo `fetch`, cambio de rama, stage, commit, push, merge, deploy ni acceso a Firebase remoto.
- Este informe no declara cerrado E3-03 ni Etapa 3, no reabre E2-14 y no declara solucionado D5-045.

## Resultado implementado

Se incorporó el recorrido completo de Entrega informada como Agregado independiente:

1. `listMyObligations` conserva el contrato E3-01 y suma `seasonId`, saldo, estado y revisión económica para composición privada. La UI agrupa por Grupo y contexto exacto Temporada/Membresía, conserva hasta veinte seleccionadas entre páginas y advierte antes de descartar al intentar otro contexto.
2. `reportOwnPaymentDelivery` acepta una a veinte líneas únicas, `FULL` o `PARTIAL`, fecha civil Buenos Aires e importe explícito. El total se deriva en backend. Un snapshot distinto produce `DELIVERY_DRAFT_STALE` sin Entrega ni receipt terminal.
3. La Entrega persiste declaración, líneas inmutables, total, decisión y trazabilidad común. No persiste saldo, movimientos ni aplicaciones autoritativas.
4. `confirmPaymentDelivery` y `reverseConfirmedPaymentDelivery` ejecutan una sola transacción Firestore sobre una Entrega y sus 1–20 Pagos. Una línea stale aborta todo; no hay reserva, recorte, reparto, saga ni procesamiento paginado.
5. Cada Pago conserva aplicación subordinada, ingresos brutos/revertidos/netos, saldo, estado y revisión. La reversión conserva `decisionState=CONFIRMED`, cambia `applicationState=APPLIED → REVERSED` y no elimina aplicaciones.
6. `rejectPaymentDelivery` terminaliza la Entrega completa con categoría cerrada y explicación obligatoria para `OTHER`, sin efecto económico.
7. Owner dispone de bandeja, historia confirmada aplicada/revertida, detalle y reversión motivada. El revisor delegado sólo ve pendientes de terceros y no puede revertir ni explorar historia general.
8. Se agregó `GROUP_PAYMENT_NOTICE_REVIEW` con grants, slots y receipts propios dentro de las colecciones técnicas compartidas, pero con ID, hashes, lifecycle y callables independientes. `GROUP_TREASURY` no fue modificado ni ampliado.
9. Owner actúa por Cuenta/ownership sin Persona. Exintegrantes y Temporada cerrada pueden informar obligaciones existentes. En archivo sólo el sujeto propio y Owner operan, con prueba prearchivo por Pago; ningún grant revive.

## Archivos y contratos

Backend principal:

- `functions/src/paymentDeliveries/domain/paymentDelivery.js`: invariantes, normalización, hashing, DTOs, economía compatible y presupuesto.
- `functions/src/paymentDeliveries/application/paymentDeliveryContract.js`: payloads cerrados para informar, listar, decidir, revertir y administrar grants.
- `functions/src/paymentDeliveries/application/paymentDeliveryErrors.js`: catálogo estable de outcomes.
- `functions/src/paymentDeliveries/infrastructure/firestorePaymentDeliveryStore.js`: Unidad de Trabajo E3-03 y reautorización por comando/página.
- repositorios separados `firestorePaymentDeliveryRepository.js`, `firestorePaymentEconomicRepository.js` y `firestorePaymentReviewRepository.js`.
- `functions/callables/*PaymentDelivery.js`, `*PaymentNoticeReview*.js` y exports en `functions/index.js`.

Contratos públicos implementados:

- propios: `reportOwnPaymentDelivery`, `listMyPaymentDeliveries`, `getMyPaymentDelivery`;
- bandeja/recovery: `listGroupPaymentDeliveries`, `getGroupPaymentDelivery`, `getMyPaymentReviewOutcome`;
- decisiones: `confirmPaymentDelivery`, `rejectPaymentDelivery`, `reverseConfirmedPaymentDelivery`;
- historia Owner: `listOwnerConfirmedPaymentDeliveries`, `getOwnerPaymentDeliveryHistory`;
- autorización: `grantGroupPaymentNoticeReviewCapability`, `revokeGroupPaymentNoticeReviewCapability`, `listGroupPaymentNoticeReviewGrantsForOwner`, `getMyGroupPaymentNoticeReviewContext`.

Frontend:

- `MyObligationsView.tsx`: agrupamiento, selección persistente entre páginas, total/parcial, resumen, fecha, single-flight, stale y recovery.
- `PaymentDeliveriesAdminSection.tsx`: bandeja, detalle, confirmación/rechazo completos, historia y reversión.
- `OwnerPaymentReviewAccessSection.tsx`: concesión/revocación separada del acceso de Tesorería.
- ruta delegada `/dashboard/payment-review/[groupId]`.
- servicio y DTOs mínimos en `paymentDeliveriesService.ts` y `PaymentDelivery.ts`.

Los IDs opacos sólo se usan como claves internas de controles y comandos; no se presentan como texto. Los DTOs omiten email, UID, hashes, paths, grants internos y economía ajena.

## Persistencia y compatibilidad

Colecciones:

- `paymentDeliveries/{deliveryId}`: raíz Entrega schema v1;
- `payments/{paymentId}/deliveryApplications/{applicationId}`: aplicación determinista por línea;
- `paymentDeliveryReversals/{reversalId}`: reversión común;
- `paymentDeliveryCommandReceipts/{receiptId}`: receipts de informar/confirmar/rechazar/revertir;
- `groupCapabilityGrants`, `groupCapabilityGrantSlots` y `groupCapabilityCommandReceipts`: reutilización física del patrón E3-02, discriminada por `GROUP_PAYMENT_NOTICE_REVIEW`.

Pago v1 se interpreta sólo como cero aplicaciones, saldo igual al exigible, estado `PENDING` y revisión 1. La primera confirmación E3-03 lo evoluciona a v2 dentro de la misma transacción. No hay backfill, migración general, doble escritura ni reparación silenciosa. Snapshots, identidad, `createdAt`, generación y conceptos E3-01 se conservan. Readers E3-01 aceptan v1/v2 y la generación idempotente excluye los campos económicos v2 al comparar la obligación original.

Rules declaran deny-all explícito para Entregas, aplicaciones, reversiones y receipts. Los índices agregados cubren:

- propias por Persona y opcionalmente Membresía, descendente por `reportedAt`;
- pendientes por Grupo + `REPORTED`, ascendente por `reportedAt`;
- historia Owner por Grupo + `CONFIRMED`, opcionalmente estado de aplicación y/o Membresía, descendente por `confirmedAt`;
- grants por Grupo + capability, descendente por `grantedAt`.

## Atomicidad, recovery y mediciones

Medición instrumentada contra Firestore Emulator local, proyecto `demo-sportexa-e0-02`, N=20:

| Comando | Lecturas reales observadas | Escrituras reales observadas | Documentos económicos/técnicos afectados |
| --- | ---: | ---: | --- |
| informar | 25 | 2 | receipt, Cuenta, Membresía, Grupo, Temporada y 20 Pagos leídos; Entrega + receipt escritos |
| confirmar Owner | 44 | 42 | receipt, Entrega, Cuenta, Grupo, 20 Pagos y 20 aplicaciones leídos; 20 Pagos + 20 aplicaciones + Entrega + receipt escritos |
| revertir Owner | 44 | 43 | receipt, Entrega, Cuenta, Grupo, 20 aplicaciones y 20 Pagos leídos; 20 Pagos + 20 aplicaciones + Entrega + receipt + reversión común escritos |

Las cifras son operaciones de documento instrumentadas en el adaptador real durante transacciones contra Emulator, sin reintentos por contención en esa corrida. Un retry transaccional puede repetir lecturas/escrituras intentadas; el commit observable sigue siendo único.

La raíz sintética de 20 líneas con IDs de 64 caracteres y nombre presentable midió **7.451 bytes JSON UTF-8**, por debajo del presupuesto interno de 64 KiB. Esto no afirma equivalencia byte a byte con el encoding protobuf ni rendimiento productivo.

Recovery valida receipt, cabecera y conjunto completo de aplicaciones. No exige que la revisión económica actual sea la del commit original, por lo que reconoce la operación aunque existan movimientos posteriores legítimos. Igual key/payload al informar recupera los importes persistidos y nunca recalcula `FULL`.

## Evidencia automatizada

- sintaxis Functions final: `390/390` archivos JavaScript, verde;
- unitarias completas: `378/378`, además de la corrida focal E3-01/E3-03 `10/10`, verde;
- Emulator E3-03: `11/11`, verde en la corrida focal final, incluyendo callables reales, Auth sintético, Rules, evidencia secuencial por orden de commit y operaciones solapadas con barrera determinista;
- Emulator regresión E3-01/E3-02: `20/20`, verde;
- typecheck frontend: verde;
- lint baseline frontend: verde;
- build Next.js: verde, incluida la ruta dinámica `/dashboard/payment-review/[groupId]`.

Correctivos UAT focales: unidad `7/7`; Emulator E3-03 `11/11` en la corrida focal final, ampliado con serialización real mediante SDK Firebase frontend, reproducción del request inválido, carga corregida, callable real de concesión, receipt, historia y revocación, bandeja delegada con entrega ajena incluida, propia excluida y decisiones de confirmación/rechazo, órdenes secuenciales de commit y operaciones solapadas detalladas debajo; typecheck, lint baseline y build frontend verdes. No se repitieron suites integrales previamente verdes.

Los casos automatizados cubren 1/20/21 líneas, duplicados, FULL exacto, stale antes de informar, recuperación de respuesta, atomicidad sin efectos parciales, dos entregas concurrentes con Pago compartido, rechazo completo, reversión idempotente, movimientos posteriores, Owner sin Persona, auto-revisión prohibida, revocación, archivo, historia Owner, v1 de Pago, readers E3-01, capacidad E3-02 sin ampliación y deny-all. La corrida focal final agregó los dos órdenes deterministas de revocación/archivo frente a confirmación delegada y de reversión frente a otra confirmación sobre los mismos Pagos.

## Hallazgos humanos recibidos y correctivos focales

- **UAT-01, UAT-02, UAT-04, UAT-08 y UAT-09:** confirmadas por la observación humana informada.
- **UAT-03:** confirmada tras el correctivo. La persistencia del Pago y el DTO de `listGroupObligations` contenían `balanceMinor`, `economicState`/`estado` y `economicRevision` correctos. La vista Owner ignoraba esos campos y mostraba literalmente **Pendiente de pago**; además, confirmar o revertir desde el componente administrativo no invalidaba el reader económico hermano. Se corrigieron únicamente la interpretación visual y la invalidación: la vista usa el estado/saldo devueltos por backend y vuelve a ejecutar el reader después de confirmar o revertir, sin calcular economía en cliente.
- **UAT-05:** confirmada. El diálogo muestra exactamente: **“Esta acción corrige el registro del pago; no devuelve dinero.”** Mantiene motivo obligatorio, confirmación explícita y trazabilidad.
- **UAT-06 y UAT-07 — historial preservado:** inicialmente UAT-06 quedó bloqueada por la carga de **Acceso para revisar entregas** y UAT-07 no era ejecutable. Tras el correctivo, la re-UAT humana confirmó carga de accesos, concesión visible en historia, revisión de entregas ajenas, exclusión de las propias y revocación de `GROUP_PAYMENT_NOTICE_REVIEW` conservando `GROUP_TREASURY` read-only. Esta confirmación humana no comprende carreras concurrentes ni recuperación técnica.

Para la concesión se reprodujo localmente el recorrido completo Owner → payload de UI → callable real → validación → Membresía/persona/cuenta destinataria → autorización Owner → grant/slot/receipt → historia → revocación. El payload con `groupId`, `membershipId` e idempotency key de 32 caracteres fue aceptado y persistido. No se reprodujo un defecto de contrato o persistencia y, por ello, no se modificó el backend. Sí se demostró que la UI reutilizaba el mensaje genérico `VALIDATION_FAILED` de una entrega y no diferenciaba carga fallida de historia legítimamente vacía. La sección ahora tiene estados de carga/error/vacío, mensajes propios de administración de acceso, confirmación explícita y retry con la misma intención.

### Diagnóstico del bloqueo persistente de carga

La carga Owner real ejecutaba en paralelo:

- `listActiveGroupMembersForOwnedGroup` con `{ groupId, pageSize: 50 }` y sin `cursor`;
- `listGroupPaymentNoticeReviewGrantsForOwner` con `{ groupId, pageSize: 50 }` y sin `cursor`.

La evidencia con el SDK `firebase/functions` usado por el frontend confirmó que la serialización conservaba exactamente esos campos. El contrato de historia E3-03 admite 50, pero el contrato vigente del roster Owner E2-11 limita `pageSize` a 20. El primer callable rechazaba en validación de entrada con código estable `VALIDATION_FAILED`, antes de autorización, lectura de contexto o persistencia. `Promise.all` propagaba ese rechazo sin identificar la fuente. **Reintentar carga** sí ejecutaba el loader, limpiaba el error y pasaba a `loading`, pero reenviaba el mismo request inválido y volvía a fallar inmediatamente.

El correctivo conserva `pageSize: 50` para historia y usa `pageSize: 20` para roster, mediante un constructor de requests consumido por el componente y por la regresión. No se envían campos opcionales `cursor` cuando están ausentes. Los errores de roster e historia quedan etiquetados por origen sin cambiar su código estable ni su validación. Historia vacía con respuesta exitosa produce **Todavía no hay concesiones de revisión**; no se interpreta como error.

La regresión prueba primero que el SDK frontend obtiene `VALIDATION_FAILED` con el request original, luego serializa `{ groupId, pageSize: 20 }`, recibe roster y una historia legítimamente vacía, y continúa por concesión, receipt, historia, navegación/capacidad delegada, decisiones y revocación en Emulator local. Esa evidencia automatizada no sustituyó la re-UAT; la confirmación humana posterior quedó registrada arriba de manera independiente.

`GROUP_TREASURY` y `GROUP_PAYMENT_NOTICE_REVIEW` continúan concediéndose y revocándose por separado. En **Grupos que integrás**, cada contexto autorizado expone enlaces accesibles distintos: economía de sólo consulta y revisión de entregas de terceros. El cargo continúa siendo exclusivamente descriptivo.

## Evidencia humana y UAT

Se incorporaron arriba las observaciones humanas comunicadas, sin integrar Auth/UAT ni ejecutar nuevas sesiones humanas desde esta implementación. Guía reproducible, sin carreras manuales ni estados técnicos inciertos:

1. Con datos locales preparados por fixtures canónicos, iniciar sesión como integrante y abrir **Mis obligaciones**.
2. Expandir un Grupo, seleccionar obligaciones de dos páginas del mismo contexto y comprobar que se conservan. Intentar seleccionar otro contexto y elegir primero **Permanecer** y luego **Continuar y descartar**.
3. Elegir una línea **Total** y otra **Parcial**. Verificar importes explícitos, total derivado, fecha declarada y el resumen previo. Informar una sola entrega y comprobar el badge **Pendiente de validación** sin cambio de saldos.
4. Como Owner, abrir el Grupo, entrar en **Entregas informadas pendientes**, revisar el desglose y confirmar. Verificar todas las líneas aplicadas y estados `Pago parcial`/`Saldada` según corresponda.
5. Informar otra entrega y rechazarla con una categoría; para **Otro motivo**, comprobar que exige explicación. Verificar **Rechazada** y cero cambios económicos.
6. Desde historia Owner, abrir una confirmada aplicada, indicar motivo y revertir. Verificar **Confirmada · revertida**, aplicaciones originales visibles y saldos recompuestos; el texto debe aclarar que no devuelve dinero.
7. En **Acceso para revisar entregas**, conceder a un integrante. Confirmar que la superficie está separada de **Acceso a Tesorería**, que el revisor sólo ve pendientes de terceros y que su propia entrega no puede decidirse.
8. Revocar la concesión y comprobar que una nueva página limpia la bandeja. Archivar el Grupo mediante el flujo ya existente y comprobar que no reaparece acceso delegado, mientras Owner conserva historia y operaciones prearchivo.
9. Probar teclado, foco de errores, etiquetas de campos, modales, estados loading/vacío/recovery y badges textuales en viewport móvil y escritorio.

### Re-UAT ejecutada para estos correctivos

1. **Confirmada humanamente:** tras confirmar una entrega, **Obligaciones del Grupo** reflejó los saldos y estados canónicos; tras revertir, mostró el refresco inverso sin cálculo económico cliente.
2. **Confirmada humanamente:** la reversión mostró la aclaración exacta antes del motivo y la confirmación.
3. **Confirmada humanamente:** se cargó la sección de accesos, se concedió por separado **Acceso para revisar entregas** y la concesión apareció en historia; **Acceso a Tesorería** permaneció independiente.
4. **Confirmada humanamente:** el delegado accedió a entregas ajenas y las revisó; sus entregas propias quedaron excluidas. Después de revocar sólo revisión perdió esa facultad y conservó Tesorería read-only.

La confirmación humana no se usa como evidencia de carreras concurrentes ni de recovery. Esos aspectos pertenecen exclusivamente a las pruebas automatizadas técnicas.

## Clasificación de evidencia de órdenes y solapamiento

### Evidencia solapada preexistente

El caso **`entregas solapadas serializan y una línea stale impide todos los efectos`** ya ejecutaba mediante `Promise.allSettled` dos transacciones de confirmación sobre una misma obligación. Sus aserciones exigían exactamente una operación cumplida, exactamente una rechazada con `DELIVERY_STALE_BALANCE` y, en una Entrega de dos líneas con una stale, Pago no tocado, cero aplicaciones y Entrega `REPORTED`. Esa prueba ya había aprobado y no se duplicó.

### Evidencia secuencial por orden de commit

Antes de ampliar cobertura se identificó en `functions/test/emulator/paymentDeliveryE3.test.js`:

- **`capacidad independiente concede, impide deuda propia y revocación corta el comando`**: ya revocaba y luego comprobaba `PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED`, Entrega `REPORTED`, Pago v1 y cero aplicaciones; no cubría el orden confirmación → revocación.
- **`Owner sin Persona confirma prearchivo y el archivo no revive delegación`**: ya archivaba y comprobaba la operación Owner y la pérdida de contexto delegado; no enfrentaba archivo con confirmación delegada en ambos órdenes.
- **`reversión reconoce aplicación original pese a movimientos posteriores`**: ya ejercitaba confirmación posterior → reversión y comprobaba saldo neto/revisión; no cubría el orden inverso sobre múltiples Pagos ni contaba todas las aplicaciones.

La cobertura faltante se agregó en el mismo archivo Emulator como prueba **secuencial**, sin etiquetarla como concurrencia real y sin cambios de comportamiento productivo:

1. **Revocación frente a confirmación delegada.** En el orden revocación → confirmación, el comando delegado termina `PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED`, la Entrega queda `REPORTED`, el Pago conserva schema v1 y no existe aplicación. En el orden confirmación → revocación, el Pago queda saldado, existe exactamente una aplicación `APPLIED` y la revocación posterior no altera el efecto confirmado.
2. **Archivo frente a confirmación delegada.** En el orden confirmación → archivo, la aplicación y el saldo confirmado permanecen. En el orden archivo → confirmación, la reautorización rechaza al delegado, la Entrega continúa `REPORTED`, el Pago permanece intacto y no se crea aplicación. El caso existente sigue comprobando que Owner conserva la operación prearchivo aprobada y que el archivo no concede ni revive revisión delegada.
3. **Reversión frente a otra confirmación sobre Pagos compartidos.** Para cada orden se usaron dos Entregas parciales sobre los mismos dos Pagos: reversión → confirmación delegada y confirmación delegada → reversión. En ambos resultados cada Pago queda con saldo `9000`, neto confirmado `1000` y revisión económica `4`; conserva exactamente dos aplicaciones con IDs distintos, una `REVERSED` y otra `APPLIED`. Las dos líneas cambian juntas y no hay duplicación ni efectos parciales.

Los órdenes se fijaron por secuencia explícita de commits, sin `sleep`, azar ni matrices de estabilidad. Esto verifica las dos serializaciones observables y la revalidación de cada comando, pero **no constituye concurrencia real** ni mide el scheduler productivo.

### Operaciones solapadas con barrera determinista

El caso **`operaciones solapadas reintentan autorización y economía sin efectos parciales`** usa un Grupo sintético independiente y el hook opcional `afterConfirmAuthorization`, inactivo por defecto. La envoltura de DB existe sólo en el test: hace que el primer intento transaccional lea la Entrega y autorización `REVIEWER`, aborte de forma controlada antes de leer o encolar escrituras económicas y deje pendiente la operación de confirmación; entonces confirma la operación rival y libera un nuevo intento completo. El retry ejecuta otra vez `reviewerAuthorization` y las lecturas económicas normales. Ese aborto es inyectado por el harness y **no** constituye evidencia de detección automática de conflicto ni de retry automático por Firestore. No se modificaron contratos, decisiones, persistencia ni política de retries productivos.

- **Revocación solapada:** el primer intento observó autorización vigente; la revocación confirmó durante la operación pendiente; el retry terminó `PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED`. Se afirmó Entrega `REPORTED`, Pago v1 intacto y cero aplicaciones.
- **Archivo solapado:** el primer intento observó autorización vigente; el Grupo fue archivado durante la operación pendiente; el retry volvió a autorizar y terminó `PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED`. Se afirmó Entrega `REPORTED`, Pago v1 intacto y cero aplicaciones.
- **Reversión y confirmación solapadas:** el primer intento de confirmación delegada quedó pendiente; Owner revirtió la Entrega anterior sobre los mismos dos Pagos; el retry releyó los saldos y confirmó la segunda. Cada Pago terminó con saldo `9000`, neto `1000`, revisión `4` y exactamente dos aplicaciones de IDs distintos, una `REVERSED` y otra `APPLIED`; ambas líneas quedaron completas, sin duplicación ni estado parcial.

No se usaron `sleep`, repeticiones ni matrices de estabilidad. La corrida focal final fue **11/11 verde** en Emulator local, proyecto `demo-sportexa-e0-02`, Auth/datos sintéticos y red remota bloqueada. Sintaxis de store y test quedó verde.

## Limitaciones y riesgos residuales

- No se midieron latencia, contención sostenida ni costos productivos; sólo tamaño y operaciones documentales locales.
- Los cursores y filtros fueron verificados estructuralmente y en consultas focales; una UAT visual paginada sigue pendiente.
- La navegación delegada se descubre desde **Grupos que integrás** para cada capacidad vigente; no se agregó un inventario general de capabilities ni RBAC configurable.
- Se conserva D5-045 como riesgo residual vigente. Ante corrupción, autorización perdida o combinación parcial, el flujo falla cerrado con `INCOMPATIBLE_STATE`/error estable y no intenta reparar.
- El warning local de Firebase CLI por no poder consultar MOTD/config remota fue no fatal; el proyecto demo bloqueó servicios no emulados.

## Rollback local

Como no hay stage ni commits de esta implementación, el rollback consiste en restaurar únicamente los archivos modificados listados por `git status` y retirar los archivos nuevos E3-03, previa copia si se quiere conservar evidencia. Deben retirarse conjuntamente callables/exports, módulo y repositorios, Rules/índices, evolución compatible del reader Pago, frontend, tests y este informe. No debe revertirse normativa ni trabajo ajeno. Después se ejecutan typecheck, sintaxis, pruebas E3-01/E3-02 y `git diff --check`.

## Declaración

Implementación local, evidencia automatizada y observaciones humanas recibidas quedaron documentadas en el alcance autorizado. Una nueva integración Auth/UAT, deploy y cierre formal permanecen fuera de este corte.
