# E3-03 — Cierre formal de entrega informada y validación de pagos

## Estado

- Incremento: `E3-03`.
- Estado documental: `CERRADO`.
- Alcance cerrado: Entrega informada multiobligación, confirmación o rechazo completos,
  reversión económica completa Owner-only y capacidad independiente
  `GROUP_PAYMENT_NOTICE_REVIEW`.
- Commit de implementación y correctivos:
  `32e98038601ecbe614036a0ceae39ee19fc5ed6f`.
- Merge no fast-forward de implementación en `dev`:
  `67bad695f867eb7a677a34814f996c4d0da1430f`.
- Fecha de cierre documental: 2026-10-13.
- Deploy: no realizado ni autorizado.
- Firebase remoto y datos productivos: no accedidos ni modificados.

Este cierre aplica exclusivamente a E3-03. No cierra Etapa 3, no satisface su gate de retiro de
autoridad económica legacy y no autoriza implementar E3-04. Sólo habilita E3-04 para definición,
sin adoptar anticipadamente finalidad, alcance, actores, contratos ni criterios.

## Fuentes y trazabilidad

El cierre se contrastó focalmente con:

- la [ficha E3-03](./E3-03-ficha-aviso-validacion-pago.md), incluidas D01–D08, sus 29 criterios
  técnicos/UAT y los criterios de preparación;
- el [addendum E3-03 a Documentos 1, 1.5, 2, 3 y 4](../../arquitectura/Documento-1-1.5-2-3-4-addendum-E3-03-entrega-informada.md);
- [DEC-E3-03 / D5-048](./DEC-E3-03-entrega-informada.md);
- el [informe único de implementación y UAT](./E3-03-informe-implementacion.md), que conserva
  archivos, contratos, persistencia, mediciones, pruebas, hallazgos, correctivos y guía UAT;
- Documento 5, §§5.5, 5.8, 5.10–5.12, 7.5 y D5-044–D5-048;
- los cierres [E3-01](./E3-01-cierre.md) y [E3-02](./E3-02-cierre.md);
- el commit funcional y su merge identificados en Estado.

La definición y la decisión precedieron al código. El commit funcional contiene 46 archivos y
1.439 inserciones/20 bajas. El merge incorpora la feature como segundo padre sobre el checkpoint
aprobado. Antes de este cierre se comprobó que el árbol integrado era idéntico al de la feature,
que `dev` coincidía con `origin/dev` y que árbol, índice y stashes estaban limpios.

## Alcance efectivamente implementado

E3-03 incorpora el recorrido vertical aprobado:

- obligaciones propias agrupadas por Grupo y contexto exacto de Temporada/Membresía;
- selección accesible de 1 a 20 obligaciones únicas, conservada entre páginas del mismo contexto;
- modalidad total o parcial por línea, importe explícito, fecha civil declarada, desglose y total
  derivado antes de informar;
- Entrega informada como Agregado independiente, dueño de declaración, líneas inmutables, decisión
  y trazabilidad común, sin duplicar autoridad económica;
- Pago como dueño de obligación, aplicaciones, movimientos, saldo, estado y revisión económica;
- bandeja Owner/delegada, detalle, confirmación o rechazo completos e historia Owner de confirmadas
  aplicadas/revertidas;
- confirmación y reversión de una Entrega y sus 1–20 Pagos en una única transacción acotada, todas
  las líneas o ninguna, sin reserva, recorte, redistribución, saga ni procesamiento paginado;
- `FULL` exacto persistido, stale antes de informar sin Entrega/receipt terminal, saldo insuficiente
  al confirmar con Entrega todavía `REPORTED` y recovery por receipts sin recalcular importes;
- reversión completa, única, motivada, idempotente y Owner-only, conservando
  `decisionState=CONFIRMED`, aplicaciones originales y cambio `APPLIED → REVERSED`;
- `GROUP_PAYMENT_NOTICE_REVIEW` concedida y revocada de forma individual, con lifecycle,
  reautorización y trazabilidad propios;
- Rules deny-all, índices y repositorios separados para Entregas, economía y revisión;
- frontend en español con badges textuales, modales del sitio, estados de envío/conflicto/recovery,
  controles accesibles y navegación descubrible para revisión delegada.

Grupo, Temporada, Membresía e identidad/autorización sólo se leen dentro del flujo económico. Owner
actúa por Cuenta y ownership sin requerir Persona. El revisor sólo decide pendientes de terceros y
nunca revierte ni explora historia económica general.

## Exclusiones preservadas

Este cierre no incorpora intereses, pasarela, registro directo, adjuntos, condonación, ajuste del
exigible, devolución real, Caja, liquidación prearchivo, roles configurables, RBAC general ni nuevas
capacidades por analogía. Tampoco incorpora flujos de Torneos/partidos, migraciones generales,
backfill, reparación silenciosa, Firebase remoto, deploy o integración Auth/UAT.

No retira catálogos o tombstones D5-044, no reabre E2-14, no altera autoridad económica legacy y no
cierra Etapa 3. El cargo continúa siendo descriptivo. E3-04 carece en este documento de alcance
adoptado y requiere definición y autorización separadas.

## Correspondencia entre criterios y evidencia

| Criterio de la ficha | Evidencia vigente | Evaluación |
| --- | --- | --- |
| 1. Cabecera no decide saldos | Entrega persiste declaración/decisión; repositorio económico actualiza exclusivamente cada Pago. | Satisfecho. |
| 2. Una Entrega produce N aplicaciones | Emulator afirma una raíz común y una aplicación subordinada por Pago, no recepciones independientes. | Satisfecho. |
| 3. Líneas únicas y total exacto | Contrato rechaza duplicados y deriva el total de líneas canónicas. | Satisfecho. |
| 4. Todas las raíces o ninguna | Transacción y caso multilínea stale conservan todos los Pagos y cero aplicaciones. | Satisfecho. |
| 5. D08 y excepción acotada | Módulo/repositories implementan el Agregado B; máximo 20 y excepción sólo en confirmar/revertir E3-03. | Satisfecho. |
| 6. Reversión completa | Pruebas de 20 líneas y Pagos compartidos restauran todas las líneas y conservan aplicaciones. | Satisfecho. |
| 7. Sujeto activo/exintegrante | Autorización propia deriva Persona y limita Membresía exacta; prearchivo y exintegrante tienen cobertura focal. | Satisfecho. |
| 8. Mezcla de contexto falla privada | Contratos/store rechazan Grupo, Temporada, Membresía o Persona divergentes sin DTO económico ajeno. | Satisfecho. |
| 9. Owner sin Persona | Emulator confirma y revierte por Cuenta/ownership; no se atribuye este caso a UAT humana. | Satisfecho. |
| 10. Revisor sólo terceros | Bandeja excluye propias y `SELF_REVIEW_FORBIDDEN` bloquea decisión directa. | Satisfecho. |
| 11. Autoridades no equivalentes | Tesorería, cargo, rol global e IDs no conceden revisión; sólo grant explícito E3-03 autoriza. | Satisfecho. |
| 12. Rules y DTOs mínimos | Rules deny-all y recorrido callable/directo impiden persistencia cliente; UI omite IDs técnicos. | Satisfecho. |
| 13. Entregas sobre Pagos compartidos | Caso solapado preexistente serializa dos confirmaciones: una aplica y otra queda stale. | Satisfecho. |
| 14. Una línea stale bloquea todo | Caso de dos líneas mantiene Entrega `REPORTED`, Pago compañero v1 y cero aplicaciones. | Satisfecho. |
| 15. Recovery único y FULL persistido | Retry recupera `deliveryId` e importes originales aun con movimientos posteriores; no recalcula `FULL`. | Satisfecho. |
| 16. Revocación/archivo/ownership | Pruebas secuenciales y solapadas reautorizan; lifecycle E3-02 y ownership se preservan. | Satisfecho. |
| 17. Inconsistencia parcial falla cerrada | Validación de Entrega/aplicaciones devuelve error estable y no fabrica confirmación ni reparación. | Satisfecho. |
| 18. Snapshot stale antes de informar | `DELIVERY_DRAFT_STALE` deja cero Entregas y receipts terminales. | Satisfecho. |
| 19. Estado tras reversión | Historia y detalle conservan `CONFIRMED`, aplicaciones y trazabilidad, con vigencia `REVERSED`. | Satisfecho. |
| 20. Límites 1/20/21 | Unidad y callable aceptan 1 y 20; 21 devuelve `DELIVERY_LINE_LIMIT_EXCEEDED`. | Satisfecho. |
| 21. Agrupamiento accesible | Frontend agrupa por Grupo/Temporada/Membresía con secciones y etiquetas accesibles. | Satisfecho. |
| 22. Sin IDs técnicos visibles | DTO/presentación usan conceptos, Personas y nombres canónicos, no IDs como texto de usuario. | Satisfecho. |
| 23. Total/parcial y resumen | UI y contratos conservan modo, importe explícito, total derivado y resumen previo. | Satisfecho. |
| 24. Conflicto revisable | Estado de conflicto muestra valores propios actuales y exige revisar antes de informar de nuevo. | Satisfecho. |
| 25. Cambio de contexto advertido | Selección se conserva entre páginas compatibles y modal exige decidir antes de descartarla. | Satisfecho. |
| 26. Historia y archivo | Readers propios/Owner y prearchivo aplican autorización vigente; archivo no revive delegación. | Satisfecho. |
| 27. Historia Owner y recovery delegado | Owner filtra y abre aplicadas/revertidas; revisor carece de historia general y recupera outcomes propios. | Satisfecho. |
| 28. Pendiente y confirmada | Pendiente no cambia Pago; confirmación retorna saldos/estados canónicos y refresca vistas sin cálculo cliente. | Satisfecho. |
| 29. Bandeja representa una Entrega | UI administrativa presenta cabecera y varias líneas bajo una única decisión. | Satisfecho. |

D01–D08, D08 en ficha/addendum/DEC, D5-048, reversión en el mismo corte, presupuesto ejecutable y
autorización separada también están satisfechos. No se identificó un criterio del corte sin
evidencia; los límites indicados abajo no se convierten en aprobaciones de producción.

## Evidencia automatizada y mediciones

El detalle reproducible permanece en el informe. La evidencia aprobada incluye:

- sintaxis Functions consolidada `390/390`;
- suite unitaria consolidada `378/378`, focales E3-01/E3-03 `10/10` y correctivos UAT `7/7`;
- Emulator E3-03 final `11/11`, con Auth, Firestore y Functions locales, proyecto demo y datos
  sintéticos;
- regresión Emulator E3-01/E3-02 `20/20`;
- typecheck, lint baseline y build Next.js aprobados;
- callables HTTP reales contra Emulator, Rules deny-all y clientes Auth sintéticos;
- `git diff --check` aprobado antes de implementación, integración y cierre.

Para 20 líneas se midieron **44 lecturas** en confirmar y revertir; **42 escrituras** al confirmar y
**43 escrituras** al revertir, incluyendo autorización y receipts según el desglose del informe. La
raíz sintética máxima medida ocupó **7.451 bytes JSON UTF-8**, por debajo del presupuesto interno de
64 KiB.

Estas mediciones son documentales y locales: no equivalen al encoding protobuf exacto, costos,
latencia, throughput, contención sostenida ni rendimiento productivo. No hubo Firebase remoto ni
deploy. El warning de Firebase CLI al no consultar MOTD/config remota fue no fatal y el proyecto
`demo-*` bloqueó servicios no emulados.

## Clasificación de órdenes, solapamiento y retry inyectado

### Pruebas secuenciales

Las pruebas de ambos órdenes de commit para revocación/confirmación, archivo/confirmación y
reversión/otra confirmación fijan explícitamente qué operación confirma primero. Demuestran las dos
serializaciones esperadas y sus invariantes, pero **no son concurrencia real**.

### Operaciones solapadas

El caso preexistente con `Promise.allSettled` inicia dos confirmaciones sobre un Pago compartido y
afirma una confirmada, una `DELIVERY_STALE_BALANCE` y cero efectos parciales. Otro caso mantiene una
operación de confirmación pendiente mientras confirma revocación, archivo o reversión, y luego
ejecuta el nuevo intento. Para dos Pagos compartidos, el resultado conserva dos aplicaciones únicas
por Pago —una `APPLIED` y otra `REVERSED`—, saldo `9000`, neto confirmado `1000` y revisión `4`.

### Aborto inyectado y reautorización

El hook opcional `afterConfirmAuthorization`, inactivo por defecto y no controlable mediante
requests públicos, permite al harness observar que el primer intento leyó autorización `REVIEWER`.
La envoltura de DB exclusiva de pruebas inyecta el aborto antes de lecturas/escrituras económicas,
deja pendiente la operación, confirma la operación rival y relanza la transacción completa. El
nuevo intento ejecuta otra vez autorización y lecturas económicas.

El aborto es **inyectado por el harness**. No acredita detección automática de conflictos ni retry
automático de Firestore, y tampoco aporta evidencia productiva de rendimiento. Tras revocación o
archivo, el nuevo intento termina `PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED`, con Entrega `REPORTED`,
Pagos intactos y cero aplicaciones.

## Evidencia humana, bloqueos y correctivos

La UAT original confirmó UAT-01, UAT-02, UAT-04, UAT-08 y UAT-09. UAT-03 fue inicialmente parcial:
el Pago y DTO tenían saldo/estado/revisión correctos, pero la vista Owner mostraba **Pendiente de
pago** y no refrescaba después de confirmar/revertir. El correctivo limitó el cambio a interpretar
los campos canónicos y volver a ejecutar el reader; la re-UAT confirmó estado y saldo correctos sin
recalcular economía en cliente.

UAT-05 confirmó la reversión y luego la aclaración visible: **“Esta acción corrige el registro del
pago; no devuelve dinero.”**, manteniendo motivo, confirmación explícita y trazabilidad.

UAT-06 quedó bloqueada inicialmente y UAT-07 no era ejecutable porque la UI enviaba
`listActiveGroupMembersForOwnedGroup({ groupId, pageSize: 50 })`, aunque el roster E2-11 admite 20.
El callable devolvía `VALIDATION_FAILED` antes de autorización o persistencia; el retry reenviaba el
mismo payload. El correctivo usa 20 para roster, conserva 50 para historia, omite `cursor` ausente y
distingue error de carga de vacío legítimo.

La re-UAT humana posterior confirmó carga de accesos, concesión e historia, revisión de entregas
ajenas, exclusión de las propias y revocación de revisión conservando Tesorería read-only. Esa
evidencia humana no se atribuye a carreras, recovery técnico, Owner sin Persona ni rendimiento.

## Compatibilidad E3-01 y E3-02

Pago v1 de E3-01 se interpreta compatible como saldo íntegro pendiente y revisión 1. La primera
confirmación lo evoluciona a v2 dentro de la misma transacción, sin migración general, backfill,
doble escritura o reparación silenciosa. Se preservan snapshot, identidad, generación y lectores
E3-01; la generación idempotente compara sólo la obligación original. Las consultas E3-01 aceptan
v1/v2 y conservan privacidad propia/Owner.

E3-02 permanece exclusivamente de consulta. `GROUP_TREASURY` no decide entregas, no se convirtió ni
amplió, y sus grants conservaron lifecycle y navegación read-only. E3-03 reutiliza patrones de
Cuenta–Persona, Membresía, `validityAnchor`, `ownershipRevision`, slot y receipt, pero
`GROUP_PAYMENT_NOTICE_REVIEW` tiene concesión, revocación, IDs, historia y autorización propias.

## Autoridad y separación de capacidades

`GROUP_TREASURY` permite consultar economía E3-01. `GROUP_PAYMENT_NOTICE_REVIEW` permite ver el
mínimo de pendientes ajenos y confirmarlos o rechazarlos en Grupo activo. Ninguna implica la otra;
cargo, IDs conocidos, rol global o grants anteriores no conceden revisión. Sólo Owner revierte y
consulta la historia completa de confirmadas. Rules impide usar Firestore cliente como vía paralela.

## Riesgos, gates y preservaciones

- D5-045 continúa como riesgo residual **no solucionado**, con causa histórica desconocida. Su no
  reproducción no elimina el riesgo ni autoriza producción; E2-14 no se reabre por rutina.
- D5-044 conserva los catálogos/tombstones, destinos y condiciones de retiro.
- El gate económico legacy de Etapa 3 permanece pendiente; E3-03 no retira autoridad de
  participaciones, equipos o inscripciones.
- Auth/UAT permanece aislada: sólo hubo Emulator/Auth sintético y observaciones humanas registradas,
  sin integración Auth real.
- Índices y Rules están versionados, no desplegados.
- No se midieron volumen productivo, latencia, contención sostenida ni costos reales.

## Checkpoint, rollback y reversión económica

El checkpoint anterior a la implementación fue
`79ca3d0fae24ea4ca4596225d578c36e3ffa08b2`. Implementación e integración están identificadas por
los commits consignados en Estado.

El rollback de código/documentación consiste en revertir explícitamente el merge
`67bad695f867eb7a677a34814f996c4d0da1430f` —o el commit funcional antes de integrar—, sin reescribir
historia. Como no hubo deploy ni datos remotos, no existe rollback productivo ejecutado.

Ese rollback es distinto de la **reversión económica** E3-03. Revertir una Entrega es una operación
de dominio Owner-only, motivada y trazable, que conserva declaración, confirmación y aplicaciones;
no devuelve dinero ni equivale a revertir código. Borrar Entregas, aplicaciones, receipts o
movimientos nunca es un rollback válido. Una futura operación real requerirá conservar trazabilidad
y aplicar la política económica vigente, aunque el código sea revertido.

## Evaluación de cierre

La implementación coincide con DEC-E3-03/D5-048 y el addendum; las capacidades permanecen
separadas; Pago conserva autoridad económica; los criterios tienen evidencia concreta; las UAT y
sus correctivos están confirmados; las pruebas y mediciones declaran sus límites; la compatibilidad
E3-01/E3-02, privacidad, rollback y commits están trazados. No se detectó un bloqueo concreto para
cerrar exclusivamente E3-03.

Este veredicto no cierra Etapa 3, no resuelve D5-045, no satisface el gate económico legacy, no
autoriza producción y no define ni implementa E3-04.

## Veredicto

`E3-03 CERRADO — E3-04 HABILITADO ÚNICAMENTE PARA DEFINICIÓN`

La habilitación sólo permite preparar una definición futura con decisión y autorización propias. No
adopta alcance anticipado ni crea una rama o implementación del siguiente incremento.
