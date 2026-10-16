# E3-05 — Ficha de definición de anulación de obligación sin ingresos

## Estado de la ficha

- **Incremento:** `E3-05`.
- **Tipo:** ficha implementable con decisiones y paquete normativo integrados localmente; no
  constituye autorización de implementación ni versionado.
- **Alcance aprobado:** anulación Owner-only de una obligación creada indebidamente que nunca
  tuvo aplicaciones económicas y no posee avisos pendientes.
- **Decisiones:** `E3-05-D01–D08=A`, aprobadas expresamente por el usuario.
- **Estado:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Base verificada:** rama `dev`, commit
  `782e7019d84b1bcf8b2b77b7145976774d15ce84`, divergencia local `dev...origin/dev` `0/0`,
  árbol e índice limpios y sin stashes, comprobado sin `fetch` el 16 de octubre de 2026.
- **Implementación, pruebas, Emulator, Firebase remoto y deploy:** no ejecutados ni autorizados.

Esta ficha incorpora D01–D08=A, DEC-E3-05, el addendum E3-05 a Documentos 2/3/4 y D5-050. “Listo
para implementar” significa definición documental suficiente, no implementación autorizada ni
viabilidad ejecutable ya demostrada. Los nombres físicos se validarán durante una implementación
futura autorizada sin cambiar la semántica normativa.

## 1. Fuentes vigentes y precedencia

La definición se apoya de forma focal en:

- Documento 2 vigente: PF-05 y CU-079–CU-083, en particular CU-080/CU-081 todavía generales;
- Documento 3 vigente: Pago como único Aggregate Root de su unidad económica; Movimiento y Caja no
  son Agregados; las transiciones de edición/anulación pertenecen a Pago;
- Documento 4 vigente: separación de Agregados, coordinación desde Aplicación, persistencia privada
  por defecto e idempotencia/recovery explícitos;
- Documento 5, §7.5 y D5-044–D5-050, incluida la secuencia E3-01–E3-05 y el gate de retiro de
  autoridad económica legacy;
- addendum E3-01 a Documentos 2/3/4 y ficha/cierre E3-01;
- addenda E3-03/E3-04 a Documentos 1/1.5/2/3/4, sus decisiones, fichas y cierres;
- addendum E3 de liquidación de obligaciones prearchivo;
- implementación local vigente de Pago, aplicaciones, Recepciones informadas/administrativas,
  reversión, consultas y resumen económico.

Ante contradicción, prevalecen los documentos y addenda vigentes del repositorio. Esta ficha no
modifica ninguno. Los cierres E3-01–E3-04 acreditan implementación local ya realizada; el estado
resumido de §7.5 de Documento 5 no se usa para negar esos cierres ni se corrige en este trabajo.

## 2. Hallazgo focal: qué está normado, qué existe y qué falta decidir

### 2.1 Distinciones obligatorias

| Operación | Semántica | Normativa/implementación vigente | Situación para E3-05 |
| --- | --- | --- | --- |
| Corrección del importe exigible por error | La obligación es válida, pero su principal exigible era incorrecto. Conserva identidad y no niega ingresos reales. | Reconocida como operación futura distinta. No existe writer ni política de incremento/reducción, composición o límites frente a ingresos. | Fuera del primer corte; requiere decisión propia. |
| Anulación de obligación creada indebidamente | La obligación no debió existir. Conserva identidad e historia, deja de ser exigible y no se transforma en ingreso ni condonación. | CU-081 reconoce anulación en general; Pago protege la transición. No existe transición concreta ni writer. | **Primer corte aprobado**, sólo sin aplicaciones económicas y sin aviso pendiente. |
| Condonación total o parcial de deuda válida | La obligación era válida y el acreedor extingue deuda sin recibir dinero. | E3-01 exige distinguir importe condonado e ingresos para explicar saldo cero. No existe modelo, autorización ni writer. | Fuera del primer corte; requiere política y corte propios. |
| Reversión de ingreso erróneo | Corrige el registro de una Recepción ya confirmada; conserva declaración, aplicaciones e historia y rederiva saldo. | Implementada en E3-03/E3-04, completa, única, motivada, idempotente y Owner-only. No devuelve dinero, no ajusta exigible y no condona. | No se redefine ni duplica en E3-05. |
| Devolución real de dinero | Salida efectiva de fondos después de una recepción real. | Deliberadamente fuera del alcance aprobado. La reversión vigente declara que no es devolución. | Excluida; no se propone contrato, estado ni UI. |

Ninguna de estas operaciones se contabiliza por analogía como ingreso monetario. Un aviso
`REPORTED` tampoco es ingreso; un aviso resuelto por recepción administrativa conserva declaración
y vínculo, pero su único efecto económico está en las aplicaciones de la Recepción.

### 2.2 Estado concreto de la implementación

La raíz `payments/{paymentId}` usa identidad determinista por:

- mensual: `membershipId + conceptId + periodKey`;
- único: `membershipId + conceptId + occurrenceKey`.

Pago v1 representa obligación sin movimientos como saldo igual al importe y revisión económica 1.
Pago v2 persiste `confirmedIncomeMinor`, `reversedIncomeMinor`, `netConfirmedIncomeMinor`,
`balanceMinor`, `economicState/estado` y `economicRevision`. La ecuación implementada es:

`balanceMinor = amountMinor - netConfirmedIncomeMinor`

Las aplicaciones viven subordinadas en `payments/{paymentId}/deliveryApplications/{applicationId}`
y permanecen aun después de revertirse. E3-03/E3-04 conservan las raíces Recepción, aplicaciones,
receipts y reversión; no existe borrado como rollback válido.

Los estados actualmente aceptados por los lectores económicos son `PENDING | PARTIAL | SETTLED`.
El resumen Owner suma sólo `PENDING | PARTIAL`; los listados abiertos usan el mismo filtro. La
consulta sin filtro puede devolver también saldadas. No existe hoy estado de anulación, composición
no monetaria, comando de anulación ni historia de esa transición.

La generación compara la forma económica original para `EXISTING`, pero la raíz física determinista
es también el guard de unicidad. Borrar o liberar esa raíz permitiría perder historia y contradice la
retención vigente; una anulación debe conservarla como tombstone económico durable.

## 3. Alcance residual evaluado

### 3.1 Obligaciones según economía existente

| Caso | Evaluación | Tratamiento aprobado para este corte |
| --- | --- | --- |
| Sin ingresos y sin aplicaciones históricas | Puede probarse `netConfirmedIncomeMinor = 0`, saldo íntegro y ausencia de documentos de aplicación. | Elegible, sujeto a aviso pendiente, autorización y concurrencia. |
| Parcial | Posee ingreso aplicado. Anular mezclaría obligación indebida con tratamiento de dinero recibido. | No elegible; no se revierte automáticamente ni se condona. |
| Saldada por ingresos | Posee aplicaciones por el total. | No elegible; requiere primero una política posterior, sin inferir devolución. |
| Saldo íntegro después de reversión | El neto vuelve a cero, pero existen aplicaciones y Recepción/reversión históricas. | No elegible en el primer corte; saldo cero no equivale a “nunca tuvo ingreso”. |
| Saldo cero futuro por condonación | Aún no existe y no es equivalente a anulación. | Fuera de alcance. |

### 3.2 Avisos y Recepciones

- Cualquier Entrega `REPORTED` que incluya el `paymentId` bloquea la anulación. El
  Owner debe confirmarla/rechazarla por E3-03 o resolver el caso por un flujo aprobado; E3-05 no la
  rechaza ni resuelve automáticamente.
- Una Entrega `REJECTED` no produjo aplicación y no bloquea por sí sola; su historia permanece.
- Una Recepción informada confirmada o administrativa aplicada deja una aplicación y bloquea.
- Una Recepción revertida también deja aplicación y bloquea, aunque el neto vigente sea cero.
- Una Entrega `RESOLVED_BY_ADMINISTRATIVE_RECEIPT` se asocia a una recepción administrativa con
  efecto económico y, por tanto, queda bloqueada por la aplicación existente.
- El guard `paymentReceiptCandidateGuards` es coordinación técnica, no autorización ni economía. Se
  reutilizaría para serializar anulación contra alta/decisión de avisos y registro administrativo.

### 3.3 Membresía, Temporada y Grupo

- Membresía finalizada o Persona exintegrante no impiden anular la obligación
  preexistente; no se modifica Membresía ni se copia la obligación a otra raíz.
- Temporada cerrada no impide anular; el cierre impide generar, no vuelve correcta una
  deuda indebida.
- Grupo activo admite la operación Owner-only.
- Grupo archivado admite sólo al Owner vigente y sólo sobre Pago prearchivo íntegro,
  conforme al addendum vigente. No hay desarchivo, actividad deportiva ni grant revivido.
- Renovación conserva la obligación en la `membershipId` original. Reactivación no revive deuda
  anulada. Cargo, rol global, IDs conocidos y lineage no autorizan.

## 4. Primer corte vertical aprobado

### 4.1 Finalidad

Permitir al Owner retirar de la deuda exigible una obligación que fue creada indebidamente, sin
borrar su raíz ni sus snapshots, siempre que jamás haya tenido una aplicación económica y no exista
un aviso pendiente que la incluya.

El valor operativo es eliminar una deuda errónea de listados abiertos y totales sin tocar dinero,
Recepciones ni otros Agregados. Es menor y más seguro que incorporar simultáneamente corrección de
importe, condonación y casos con historia monetaria.

### 4.2 Casos de uso incluidos

1. Owner abre el detalle de una obligación pendiente sin aplicaciones.
2. El sistema informa elegibilidad, efectos y bloqueo si existe aviso pendiente o historia de
   aplicación.
3. Owner confirma motivo y una clave idempotente estable.
4. Backend reautoriza, relee contexto y economía, serializa contra operaciones concurrentes y anula
   la obligación o devuelve conflicto explícito.
5. Deudas, resumen Owner y consultas delegadas dejan de tratarla como exigible.
6. Owner y sujeto conservan una presentación histórica minimizada de la anulación.
7. Una generación posterior con la misma clave económica no crea otra obligación.

### 4.3 Casos excluidos del corte

- modificar `amountMinor`, vencimiento, concepto, período, ocurrencia o referencias;
- anular obligación con cualquier aplicación `APPLIED` o `REVERSED`;
- anular una parcial o saldada;
- resolver/rechazar avisos dentro del comando;
- revertir una Recepción, reaplicarla o devolver dinero;
- condonación total/parcial;
- intereses, recargos, créditos, saldos a favor, cobros automáticos o pasarela;
- lotes de anulaciones;
- anulación por integrante, exintegrante, Tesorería, revisor o registrante directo;
- crear perfiles, herencias o permisos configurables;
- Caja, movimiento autónomo, export, notificación o contabilidad general;
- migración, backfill o reparación silenciosa de datos incompatibles.

## 5. Decisiones funcionales aprobadas

El usuario aprobó expresamente `E3-05-D01–D08=A`. Las alternativas se conservan como fundamento y
no permanecen abiertas.

### E3-05-D01 — Operación del primer corte

- **Pregunta:** ¿E3-05 incorpora sólo anulación de obligación indebida sin aplicaciones o reúne
  también corrección de importe y condonación?
- **Opciones y consecuencias:**
  - **A — sólo anulación estricta:** menor frontera; no toca dinero ni define composición de
    condonación/ajuste.
  - **B — anulación + corrección:** debe resolver importes por debajo/encima del ingreso neto,
    snapshots de generación, estados saldados y stale de aplicaciones.
  - **C — todas las operaciones residuales:** además exige política de condonación total/parcial y
    una composición completa del saldo; aumenta sustancialmente dominio, UI y UAT.
- **Decisión aprobada:** **A — sólo anulación estricta**.
- **Consecuencia:** corrección del exigible y condonación requieren incrementos y decisiones
  posteriores propios; E3-05 no los anticipa.

### E3-05-D02 — Elegibilidad económica

- **Pregunta:** ¿qué historia económica admite la anulación?
- **Opciones y consecuencias:**
  - **A — ninguna aplicación jamás:** evidencia simple y no ambigüa; excluye incluso recepciones
    revertidas.
  - **B — neto cero:** incluiría aplicaciones revertidas y obligaría a definir relación histórica
    entre anulación, recepción y reversión.
  - **C — cualquier saldo:** mezcla tratamiento de dinero recibido, devolución/ajuste y anulación.
- **Decisión aprobada:** **A — ninguna aplicación jamás**, aun si fue revertida y el neto volvió a
  cero.
- **Consecuencia:** parciales, saldadas y cualquier raíz con documento de aplicación quedan fuera.

### E3-05-D03 — Estado y composición del saldo

- **Pregunta:** ¿cómo representa Pago que la raíz subsiste pero ya no es exigible?
- **Opciones y consecuencias:**
  - **A — lifecycle separado `ACTIVE | VOIDED`, estado visible `VOIDED`, saldo exigible cero y
    componente no monetario de anulación igual al principal original:** conserva `amountMinor` y
    snapshots, explica el cero y evita llamar ingreso/condonación al efecto.
  - **B — sólo flag de ocultamiento:** deja saldo positivo canónico y facilita divergencias entre
    resumen, consultas y detalle.
  - **C — borrar o poner `amountMinor=0`:** destruye identidad/snapshot y contradice historia y
    unicidad.
- **Decisión aprobada:** **A**. Se conserva el principal original; la anulación aporta un componente
  no monetario igual al principal, el saldo exigible pasa a cero y el lifecycle/estado visible pasa
  a `VOIDED`. Los nombres físicos se validan durante la implementación autorizada.

### E3-05-D04 — Avisos pendientes

- **Pregunta:** ¿la anulación bloquea ante un aviso `REPORTED` que incluya la obligación o lo decide
  automáticamente?
- **Opciones y consecuencias:**
  - **A — bloquear:** conserva la autoridad E3-03 y obliga a resolver primero la declaración.
  - **B — rechazar automáticamente:** modifica otra raíz y requiere motivo, autorización, historia y
    atomicidad multi-Agregado adicionales.
- **Decisión aprobada:** **A — bloquear**. E3-05 no confirma, rechaza ni resuelve automáticamente la
  Entrega.

### E3-05-D05 — Motivo y privacidad

- **Pregunta:** ¿qué evidencia mínima explica la anulación?
- **Opciones y consecuencias:**
  - **A — categoría cerrada más explicación obligatoria:** mejor auditoría; exige límites y
    minimización por audiencia.
  - **B — sólo explicación libre:** flexible, pero menos consultable y con mayor riesgo de datos
    personales innecesarios.
  - **C — sólo categoría:** minimiza datos, pero puede ser insuficiente para `OTHER` y revisión
    operativa.
- **Decisión aprobada:** **A**, con categorías `DUPLICATE`, `WRONG_MEMBERSHIP`,
  `WRONG_CONCEPT_OR_PERIOD`, `NOT_OWED`, `OTHER`; explicación NFC de 1–240 code points y 480 bytes,
  sin controles/bidi. El sujeto recibe categoría y fecha sin texto interno ni actor. Tesorería no
  recibe categoría, actor ni explicación interna.

### E3-05-D06 — Autorización

- **Pregunta:** ¿quién puede anular en este corte?
- **Opciones y consecuencias:**
  - **A — sólo Owner vigente:** no amplía capacidades y es compatible con historia/reversión
    Owner-only.
  - **B — nueva capacidad delegable:** requiere capability, grant, slot, revocación, lifecycle,
    privacidad, archivo y UAT propios.
- **Decisión aprobada:** **A — sólo Owner vigente**. No se infiere autorización de
  `GROUP_TREASURY`, `GROUP_PAYMENT_NOTICE_REVIEW`, `GROUP_DIRECT_PAYMENT_RECORD`, cargo ni rol.

### E3-05-D07 — Grupo archivado

- **Pregunta:** ¿el primer corte permite anular una obligación prearchivo sin aplicaciones?
- **Opciones y consecuencias:**
  - **A — sí, sólo Owner y con prueba prearchivo:** completa la excepción económica vigente sin
    reabrir el Grupo.
  - **B — sólo Grupo activo:** reduce pruebas, pero deja deuda indebida sin remedio después del
    archivo y posterga una regla ya contemplada prospectivamente.
- **Decisión aprobada:** **A — Grupo archivado admite únicamente Owner y Pago prearchivo íntegro**.

### E3-05-D08 — Visibilidad histórica

- **Pregunta:** ¿qué audiencias ven la obligación anulada?
- **Opciones y consecuencias:**
  - **A — Owner y sujeto conservan historia; Tesorería sólo lectura económica mínima si llega por
    consulta autorizada, sin actor/motivo interno; anulada se excluye de deuda y resumen:** mantiene
    privacidad y evita deuda fantasma.
  - **B — sólo Owner:** minimiza exposición, pero oculta al sujeto por qué desapareció su deuda.
  - **C — ocultar a todos:** pierde trazabilidad y hace indistinguible borrado/anulación.
- **Decisión aprobada:** **A**. Owner y sujeto poseen historia descubrible; Tesorería conserva
  lectura mínima sin acción, actor ni explicación interna. No se agrega historia general a otros
  delegados.

## 6. Invariantes y transición propuestas

Este apartado materializa las decisiones aprobadas e integradas mediante DEC-E3-05, addendum E3-05
y D5-050.

### 6.1 Invariantes

1. Pago continúa siendo la única autoridad de la obligación y su estado económico.
2. Anular no crea Recepción, aplicación, ingreso, reversión, condonación, crédito ni devolución.
3. `paymentId`, clave de negocio, `amountMinor`, concepto snapshot, discriminador, vencimiento,
   referencias, generación, `createdAt` y payload original permanecen inmutables.
4. Una raíz anulada nunca se elimina ni libera su clave económica.
5. Sólo una obligación `ACTIVE`, con ingreso bruto/revertido/neto cero y sin documento de aplicación
   puede transicionar a `VOIDED`.
6. Ninguna Entrega `REPORTED` puede referir el Pago al confirmar la anulación.
7. `VOIDED` tiene saldo exigible cero por efecto no monetario de anulación, no por ingreso o
   condonación.
8. `economicRevision` aumenta exactamente una vez. Retry/recovery terminal no incrementa de nuevo.
9. `VOIDED` es terminal en este corte: no hay desanulación, edición ni reutilización.
10. Grupo, Temporada, Membresía, Persona, Períodos, conceptos, ocurrencias y Recepciones no cambian.
11. Pago prearchivo conserva todas las comprobaciones defensivas vigentes.
12. Estado de aviso y estado de obligación permanecen distintos.

### 6.2 Transición

`ACTIVE + PENDING + sin aplicaciones + sin aviso pendiente -> VOIDED`

Resultados:

- `VOIDED`: transición nueva confirmada;
- `EXISTING`: mismo actor/scope/key/payload recupera la misma anulación;
- error funcional sin efectos si falta autorización, cambió revisión, existe aplicación, existe
  aviso pendiente, la raíz no es íntegra/prearchivo o ya está en otro estado.

No se propone transición desde `PARTIAL`, `SETTLED` o `VOIDED`, ni desde saldo íntegro obtenido por
reversión.

## 7. Contratos públicos de diseño

La forma contractual queda cerrada documentalmente; los nombres físicos no son API implementada y
su materialización requiere autorización separada.

### 7.1 Comando

`voidPaymentObligation(input)`

Input cerrado:

```text
{
  groupId,
  paymentId,
  expectedEconomicRevision,
  reasonCode,
  explanation,
  idempotencyKey
}
```

El cliente no aporta Persona, Membresía, Temporada, importe, saldo, estado, actor, timestamps,
prearchivo ni contadores. `expectedEconomicRevision` es snapshot de concurrencia, no autoridad.

Output propuesto:

```text
{
  outcome: "VOIDED" | "EXISTING",
  obligation: { paymentId, amountMinor, balanceMinor: 0, estado: "VOIDED", economicRevision,
                voidedAt, reasonCode }
}
```

`explanation`, `voidedByAccountId`, hashes, paths y evidencia técnica no salen al sujeto o a
delegados. Owner puede recibir la explicación en detalle.

### 7.2 Lectores a evolucionar

- `listGroupObligations`: filtro abierto continúa `PENDING | PARTIAL`; el filtro histórico explícito
  incluye `VOIDED` para las audiencias aprobadas en D08.
- `listMyObligations`: abiertas excluyen `VOIDED`; la historia propia debe ofrecer una presentación
  descubrible sin actor ni explicación interna.
- No existe hoy un contrato público de detalle propio de obligación. `getMyPaymentDelivery` y
  `getMyPaymentReceipt` detallan Recepciones y no pueden reutilizarse como si la anulación hubiera
  creado un pago. Se agrega al diseño
  `getMyPaymentObligationDetail({ paymentId })`: deriva la Persona desde la Cuenta, exige igualdad
  con `payment.personId`, correlación íntegra de la Membresía histórica y no exige pertenencia activa,
  por lo que admite exintegrante y Grupo archivado. Devuelve principal, concepto snapshot,
  período/ocurrencia, vencimiento, contexto presentable de Grupo/Temporada, saldo cero, estado
  `VOIDED`, categoría y fecha; omite actor, explicación interna, Persona ajena, aplicaciones,
  avisos, grants, hashes y paths. Lee v1/v2/v3, aunque el filtro `Anuladas` sólo enlaza formas v3
  `VOIDED`; usa errores privados `PERSON_REQUIRED`, `PAYMENT_NOT_ACCESSIBLE`,
  `INCOMPATIBLE_STATE` y `VALIDATION_FAILED` sin revelar existencia ajena.
- `getOwnerPaymentObligationDetail`: muestra principal original, cero ingreso, cero saldo exigible,
  categoría, explicación, actor presentable y fecha.
- `getTreasuryPaymentObligationDetail`: conserva lectura económica mínima, sin acción, UID, actor ni
  categoría o explicación interna.
- `getOwnerGroupEconomySummary`: excluye `VOIDED` de saldo y cantidad de abiertas; avisos pendientes
  continúan contándose por su estado propio.
- readers de E3-03/E3-04: rechazan una anulada como línea nueva sin reclasificarla como incompatible;
  readers históricos siguen interpretando Recepciones existentes sin cambio.

### 7.3 Errores propuestos

- `PAYMENT_VOID_NOT_AUTHORIZED` o el error privado vigente equivalente;
- `PAYMENT_NOT_VOIDABLE` para estado/aplicaciones incompatibles, sin filtrar economía ajena;
- `PAYMENT_PENDING_NOTICE` con información sólo Owner y sin datos del sujeto innecesarios;
- `PAYMENT_VOID_STALE` con revisión/estado actual minimizado;
- `PAYMENT_NOT_PREARCHIVE`;
- `IDEMPOTENCY_CONFLICT`;
- `PENDING_RECOVERY`;
- `INCOMPATIBLE_STATE`.

La taxonomía definitiva debe evitar que un actor no autorizado distinga existencia, estado o
historia de un Pago.

## 8. Persistencia de diseño

### 8.1 Evolución compatible de Pago

Pago v3 se define como evolución compatible de v1/v2. Los nombres descriptivos deben validarse al
implementar, pero la semántica normativa mínima es:

- `obligationLifecycle: ACTIVE | VOIDED`, separado del origen/lifecycle de Recepción;
- `voidedAmountMinor`, componente no monetario de anulación, `0` para activa y exactamente igual a
  `amountMinor` para anulada;
- `balanceMinor = 0`, `estado/economicState = VOIDED`;
- ingreso bruto, revertido y neto iguales a cero;
- revisión económica incrementada;
- motivo categorizado, explicación privada, actor y timestamp autoritativo;
- `voidedAt`, `voidedByAccountId`, `voidReasonCode` y `voidExplanation` sólo en anulada;
- `schemaVersion = 3` al confirmar la transición.

La ecuación canónica de saldo queda:

`balanceMinor = amountMinor - netConfirmedIncomeMinor - voidedAmountMinor`

Para `VOIDED`, la precondición exige `confirmedIncomeMinor = reversedIncomeMinor =
netConfirmedIncomeMinor = 0`, ausencia total de aplicaciones y `voidedAmountMinor = amountMinor`;
por ello `balanceMinor = 0`. El componente de anulación no es dinero recibido ni condonado.

Compatibilidad de lectura:

- v1 se normaliza como `ACTIVE`, ingresos cero, `voidedAmountMinor = 0`, saldo igual al principal y
  revisión 1;
- v2 se normaliza como `ACTIVE`, `voidedAmountMinor = 0` y conserva sus campos económicos;
- v3 acepta `ACTIVE` con las invariantes anteriores o `VOIDED` con la composición cerrada;
- una forma parcial o contradictoria falla `INCOMPATIBLE_STATE`; no se completa ni migra en lectura.

No se reescribe `amountMinor` ni `conceptSnapshot`. No se crea una colección de Anulación, Entidad o
Agregado. La raíz conserva el hecho funcional; el receipt separado es evidencia técnica de
idempotencia/recovery y no una fuente económica.

### 8.2 Receipt idempotente

Colección física a definir, deny-all, con scope mínimo:

- actor, Grupo, operación y hash de idempotency key;
- request hash canónico con `paymentId`, revisión esperada y motivo;
- outcome, referencia a Pago y timestamp;
- sin key cruda, email, nombre de Persona ni copia de Membresía.

Se conserva sin TTL mientras no exista una política de retención que mantenga tombstone y recovery.

### 8.3 Identidad económica y generación

- La raíz `payments/{paymentId}` anulada permanece ocupando la clave mensual/única.
- Una nueva intención para la misma clave no crea otro documento, aunque use otro importe,
  vencimiento, concepto versionado o idempotency key.
- Una nueva fila encuentra `VOIDED` y termina
  `FAILED/OBLIGATION_VOIDED`; no devuelve `EXISTING` como si la deuda siguiera activa.
- Outcomes terminales históricos `CREATED | EXISTING | FAILED` no se reescriben. Si se recupera la
  intención original, la evidencia terminal conserva su outcome y la presentación de Pago indica
  lifecycle actual `VOIDED`.
- Una fila `PENDING/UNCERTAIN` que creó esa misma raíz antes de perder respuesta puede reconciliar
  identidad, `generationIntentId` y payload original, terminalizar el efecto original una sola vez y
  mostrar la anulación posterior; nunca vuelve a crear.
- Comparación de generación excluye sólo los campos de lifecycle posterior aprobados. No adopta un
  payload nuevo ni transforma la anulación en coincidencia económica.

## 9. Concurrencia, stale, idempotencia y recovery

### 9.1 Unidad transaccional propuesta

Una transacción de anulación debe:

1. leer receipt idempotente y Pago;
2. reautorizar Cuenta y ownership vigente;
3. leer Grupo y, si está archivado, acreditar Pago prearchivo;
4. comprobar revisión esperada, lifecycle activo, `PENDING`, importes económicos cero y saldo
   íntegro;
5. comprobar que no existe ninguna aplicación subordinada, incluida `REVERSED`;
6. leer el guard de candidatos de la Membresía y ejecutar la query completa §9.2 de avisos
   `REPORTED`; si alguno incluye el Pago, bloquear cerrado;
7. actualizar Pago, incrementar el guard y crear receipt en el mismo commit.

Actualizar el guard serializa contra informar, confirmar/rechazar y registro administrativo.
Actualizar Pago serializa contra confirmación, registro y reversión de Recepciones. La comprobación
de aplicaciones no sustituye ninguna de esas raíces serializadoras.

### 9.2 Comprobación completa de avisos pendientes

E3-05 no reutiliza `candidates()` ni el máximo de 20 de preview/registro E3-04. Ese máximo responde a
clasificación humana y presupuesto multiaviso; no demuestra ausencia para una obligación.

La comprobación focal se define sobre `paymentDeliveries`:

```text
membershipId == payment.membershipId
decisionState == "REPORTED"
orderBy __name__ ASC
sin limit
```

La transacción consume el conjunto completo y examina todas las líneas de cada Entrega para buscar
igualdad exacta de `paymentId`. No usa `array-contains` sobre objetos ni confía en digest, página o
conteo cliente. Índice previsto: `membershipId ASC + decisionState ASC + __name__ ASC`; su forma
definitiva se validará contra Firestore antes de escribir configuración ejecutable.

No existe límite funcional nuevo ni se afirma un peor caso finito demostrado. Si la query no puede
completarse por disponibilidad, presupuesto o tamaño, la operación falla cerrada como dependencia
no disponible/recovery pendiente: jamás interpreta un resultado truncado como ausencia.

Bajo una futura autorización de implementación, la primera comprobación ejecutable de esta parte
debe usar Emulator local, datos exclusivamente sintéticos y volúmenes explícitos crecientes de
Entregas `REPORTED` y líneas. Debe registrar cantidad de documentos/lecturas, bytes de datos y de la
respuesta cuando sean observables, tamaño del write set y duración de query/transacción. La prueba
de completitud/corrección es independiente del rendimiento observado: debe demostrar que encuentra
un `paymentId` relacionado en posiciones inicial, intermedia y final, y que ausencia sólo se afirma
tras consumir todo el resultado; tiempos o tamaños aceptables en un volumen no prueban un máximo
global.

Si esa comprobación resulta inviable, se detiene esta parte de la implementación y se presenta la
decisión arquitectónica necesaria. Una alternativa posible es una proyección invertida por
`paymentId`, pero deberá decidir compatibilidad v1/v2, inicialización, writers E3-03/E3-04,
reparación y fuente de verdad. No se adopta aquí ni se introduce un límite funcional implícito. Esta
tarea documental no autoriza ejecutar la comprobación.

El comando lee y escribe `paymentReceiptCandidateGuards/{groupId+membershipId}`. Reportar,
confirmar, rechazar y resolver administrativamente ya mutan el mismo guard; cualquier alta/decisión
concurrente invalida o reintenta la anulación antes del commit. El Pago compartido serializa además
contra confirmar, registrar y revertir aplicaciones.

### 9.3 Órdenes definidos

- anulación confirma primero: un informe/registro posterior relee Pago `VOIDED` y falla sin raíz,
  receipt terminal ni aplicación;
- informe confirma primero: cambia guard y la anulación reintenta, detecta aviso y bloquea;
- ingreso confirma primero: cambia Pago/crea aplicación y la anulación reintenta, detecta historia y
  bloquea;
- anulación frente a generación de la misma clave: existe una sola raíz y la anulación nunca libera
  la identidad;
- archivo frente a anulación: sólo un orden confirmado; después de archivo se reautoriza Owner y se
  exige prearchivo;
- dos anulaciones: una transición y el mismo retry recupera; key/payload distinto no produce un
  segundo efecto.

### 9.4 Recovery

- Igual scope/key/payload reautoriza y reconcilia receipt con Pago `VOIDED`, revisión, actor, motivo y
  timestamp persistidos; devuelve `EXISTING` sin recalcular desde el estado cliente.
- Misma key/payload distinto conflictúa.
- Receipt ausente y Pago activo íntegro permite reintento sólo después de revalidar todo.
- Receipt ausente con Pago `VOIDED` no se atribuye al actor por inferencia: si no hay evidencia
  correlacionada, falla cerrado como estado incompatible.
- Receipt presente con raíz no anulada, revisión incoherente o evidencia parcial nunca se publica
  como éxito.
- Timeout/pérdida de respuesta sin evidencia concluyente retorna `PENDING_RECOVERY`, no fracaso
  sintético.

## 10. Autorización, consultas y privacidad

### 10.1 Matriz propuesta

| Superficie | Owner vigente | Sujeto integrante/exintegrante | `GROUP_TREASURY` | Revisor E3-03 | Registrante E3-04 |
| --- | --- | --- | --- | --- | --- |
| Anular obligación | Sí | No | No | No | No |
| Ver deuda abierta | Sí | Sólo propia | Sí, read-only | No por analogía | No por analogía |
| Ver estado histórico `VOIDED` | General del Grupo | Sólo propia | Economía mínima, estado y fecha | No | Sólo outcome propio vigente, no historia general |
| Ver actor/explicación interna | Sí | No | No | No | No |
| Operar en Grupo archivado | Sí, Pago prearchivo | Consulta propia | No | No | No |

No se amplía ninguna capacidad existente. Si más adelante se delega anulación, debe aprobarse una
capacidad separada con concesión, revocación, slots, lifecycle, archivo, privacidad, pruebas y UAT.

### 10.2 Consultas

- Deudas Owner/Tesorería y registro directo consultan físicamente sólo abiertas; `VOIDED` no debe
  entrar para luego filtrarse en cliente.
- Resumen Owner conserva una suma exacta de saldos exigibles; una anulada aporta cero y no cuenta
  como abierta.
- Consulta propia distingue “sin deuda” de error técnico y permite localizar historia anulada sin
  exponer otras Membresías.
- Cursores ligan contrato, actor, scope, filtros, orden y page size; cada página reautoriza y relee el
  ancla. Una transición concurrente produce stale o una página válida, nunca deuda duplicada.
- Owner y sujeto filtran `VOIDED` dentro de sus listados existentes. Tesorería recibe el filtro y
  detalle económicos mínimos, con estado y fecha, sin categoría, actor, explicación ni capacidad
  nueva. Otros delegados no adquieren historia general.

Queries y cursores previstos:

- Owner anuladas: `groupId == ...`, `estado == VOIDED`, orden
  `voidedAt DESC, paymentId DESC`;
- propias anuladas: `personId == ...`, `estado == VOIDED`, mismo orden;
- Tesorería anuladas: reutiliza la query por Grupo y reautoriza `GROUP_TREASURY` en cada página;
- cursor opaco ligado a contrato, actor, audiencia, Grupo/Persona, estado, orden y page size; relee
  el ancla y falla stale si ya no satisface el scope;
- índices previstos, todavía no ejecutables: `groupId + estado + voidedAt DESC` y
  `personId + estado + voidedAt DESC`, ambos con desempate documental.

## 11. Frontend integrado en Economía

- reutilizar la ruta canónica `/dashboard/groups/[groupId]/economy`, **Mis obligaciones** y el
  detalle económico vigente;
- mostrar **Anular obligación** sólo a Owner y sólo como acción solicitada al backend; la UI no
  decide elegibilidad definitiva;
- modal del sitio con snapshot de Persona/contexto, concepto, principal, saldo, advertencia “no
  registra ni devuelve dinero”, categoría, explicación y confirmación explícita;
- controles single-flight e idempotency key estable mientras el resultado sea incierto;
- estado stale obliga a recargar y revisar; no sustituye silenciosamente revisión ni motivo;
- error por aviso pendiente dirige a **Pagos informados** sin rechazarlo automáticamente;
- error por aplicación explica que este corte no admite historia de ingreso, incluso revertida;
- al confirmar, refrescar deudas, resumen, detalle e historia propia/Owner desde backend;
- detalle `VOIDED` muestra principal original, saldo exigible cero, fecha y categoría. Owner ve la
  explicación; sujeto ve texto mínimo “Anulada por la administración”; Tesorería no recibe acción ni
  motivo interno;
- dentro de la sección existente **Deudas**, un selector/filtro `Abiertas | Anuladas` vuelve
  descubrible la historia Owner sin crear otra sección permanente; el default sigue siendo
  `Abiertas`;
- **Mis obligaciones** reutiliza su listado con el mismo filtro para historia propia. **Ver detalle**
  invoca `getMyPaymentObligationDetail({ paymentId })` y reutiliza el contenedor visual de detalle,
  no un contrato o detalle de Recepción;
- Tesorería puede elegir `Anuladas` en su sección de sólo lectura y abrir el detalle mínimo, sin
  categoría, acción ni historia de actores;
- **Historial de pagos** continúa enumerando únicamente Recepciones informadas/administrativas. Una
  anulación no fabrica Recepción, no aparece como pago y no se suma a ingresos;
- no agregar rutas paralelas, secciones permanentes redundantes, cálculo cliente de saldo ni una
  pantalla de Caja.

## 12. Pruebas focales requeridas para una implementación futura

No se ejecutan en esta definición.

### 12.1 Dominio y contratos

1. transición válida desde v1 y v2 sin aplicaciones;
2. rechazo de `PARTIAL`, `SETTLED`, `VOIDED` y neto cero con aplicación revertida;
3. principal/snapshot/identidad inmutables y saldo cero explicado por anulación;
4. motivo, límites Unicode/NFC y objetos cerrados;
5. no se crea ingreso, condonación, Recepción, aplicación ni devolución.

### 12.2 Persistencia e integración

6. una aplicación `APPLIED` bloquea;
7. una aplicación `REVERSED` bloquea;
8. aviso `REPORTED` sobre el Pago bloquea; aviso rechazado terminal no bloquea;
9. la comprobación ejecutable inicial autorizada usa Emulator local, datos sintéticos y volúmenes
   explícitos; separa completitud/corrección de lecturas, bytes y duración observados; fallo, timeout
   o agotamiento de presupuesto bloquea cerrado y nunca prueba ausencia;
10. carreras reales/reintentos deterministas con reportar, confirmar, registrar, revertir, generar y
    archivar;
11. dos comandos concurrentes producen una transición;
12. retry igual recupera; key distinta no repite; key igual/payload distinto conflictúa;
13. aborto antes/después del commit y pérdida de respuesta conservan `PENDING_RECOVERY` o resultado
    autoritativo;
14. evidencia parcial/incompatible falla cerrada;
15. generación original, nueva intención y recovery no recrean la clave anulada;
16. Grupo archivado exige Owner y Pago prearchivo; referencias/timestamps inválidos fallan;
17. exintegrante y Temporada cerrada no son modificados;
18. Rules niega acceso directo a Pago, receipts y cualquier evidencia subordinada.

### 12.3 Consultas y privacidad

19. anulada desaparece de deudas y del conteo/saldo Owner exacto;
20. reaparece sólo en historia autorizada con cursor estable y el detalle propio usa el contrato de
    obligación, no uno de Recepción;
21. sujeto ve sólo propia, incluido exintegrante, y sin actor/explicación interna;
22. Tesorería conserva read-only y no obtiene acción, categoría, actor ni motivo interno;
23. revisor/registrante/cargo/rol global/IDs no autorizan;
24. cada página y detalle reautorizan; revocación y archivo no reviven grants;
25. DTOs no exponen UID, email, hashes, receipt IDs técnicos, paths o notas privadas.

### 12.4 Regresión mínima

26. E3-01 snapshots, unicidad, generación y recovery;
27. E3-03 informar/confirmar/rechazar/revertir;
28. E3-04 preview/registro/coordinación/reversión/historia v1-v2;
29. resumen económico y detalle para cero movimientos, parcial, saldada y revertida;
30. D5-044, D5-045, aislamiento Auth/UAT y gate económico legacy sin cambios.

## 13. UAT futura propuesta

La UAT no reemplaza pruebas de carrera/recovery ni usa Firebase remoto salvo autorización separada.

1. Owner anula una obligación pendiente sin aplicaciones; confirma que deja Deudas y reduce resumen
   exactamente, pero permanece en historia como `Anulada`.
2. El sujeto ve su obligación anulada y saldo cero sin actor ni explicación interna.
3. Owner intenta anular una obligación con aviso pendiente; el sistema bloquea y permite navegar a
   revisión sin decidir el aviso.
4. Owner intenta una parcial, una saldada y otra con recepción revertida; las tres bloquean sin
   efectos y sin sugerir devolución/condonación.
5. Tesorería consulta economía, pero no ve ni ejecuta anulación.
6. Revisor E3-03 y registrante E3-04 sin ownership no adquieren la acción.
7. Con Grupo archivado, sólo Owner anula Pago prearchivo; los delegados no operan y el Grupo no se
   reactiva.
8. Una nueva generación de la misma mensual/ocurrencia informa que la obligación fue anulada y no
   crea otra.
9. Retry del modal después de respuesta perdida recupera una única anulación.

## 14. Criterios de aceptación de diseño

D01–D08=A y el paquete normativo están integrados localmente. Implementación y comprobación
ejecutable siguen sin autorización. Una implementación futura debería satisfacer, como mínimo:

1. sólo Owner vigente ejecuta la transición aprobada;
2. elegibilidad prueba ausencia total de aplicaciones, no sólo neto cero;
3. aviso pendiente bloquea sin decisión automática;
4. identidad, snapshots, principal y evidencia de generación se conservan;
5. estado/saldo distinguen anulación de ingreso, reversión y condonación;
6. raíz anulada impide recreación accidental por cualquier idempotency key;
7. revisión, guard y receipt producen atomicidad, stale, idempotencia y recovery explícitos;
8. Grupo archivado, Temporada cerrada y exintegrante siguen las reglas aprobadas sin mutar contexto;
9. consultas Owner/propias/Tesorería y resumen excluyen deuda anulada con privacidad correcta;
10. frontend vive en Economía, no calcula autoridad económica y representa todos los bloqueos;
11. pruebas focales y UAT aprobadas distinguen claramente todos los casos §2.1;
12. D5-044, D5-045, Auth/UAT aislada y gate económico legacy permanecen preservados;
13. no hay intereses, créditos, cobros automáticos, pasarela, devolución, Caja ni permisos por
    analogía;
14. no se declara cierre de Etapa 3 ni autorización de incrementos posteriores.

## 15. Dependencias y paquete normativo preparado

### 15.1 Dependencias

- cierres E3-01–E3-04 y schemas/readers compatibles v1/v2;
- addendum prearchivo vigente;
- guard de candidatos E3-04 y coordinación E3-03/E3-04;
- E3-05-D01–D08=A aprobadas;
- autorización posterior y separada para implementar, probar y eventualmente desplegar.

### 15.2 Paquete normativo adoptado

1. [DEC-E3-05](./DEC-E3-05-anulacion-obligacion-sin-ingresos.md), que adopta D01–D08=A y registra
   D5-050.
2. [Addendum E3-05 a Documentos 2/3/4](../../arquitectura/Documento-2-3-4-addendum-E3-05-anulacion-obligacion-sin-ingresos.md),
   que precisa CU-081, Pago, composición, contratos, persistencia, concurrencia y presentación.

Documentos 1 y 1.5 no requieren complemento: no cambia la ubicación del Módulo Pagos, no aparece
otro concepto de dominio independiente ni se crea Entidad, Agregado o relación conceptual. Documento
5 incorpora sólo la continuidad E3-05, referencia normativa y alcance residual mediante D5-050.

La integración normativa no autoriza ejecutar implementación. El primer gate futuro será la
comprobación ejecutable de avisos definida en §9.2; si resulta inviable, esa parte se detiene y exige
decisión arquitectónica, sin solución alternativa implícita.

## 16. Preservaciones y checkpoint

- D5-044 no se adelanta: no se retiran callables, rutas tombstone ni catálogos legacy.
- D5-045 permanece como riesgo residual aceptado; no se declara resuelto ni se usa la definición
  E3-05 como evidencia productiva.
- Auth/UAT real permanece aislada de pruebas sintéticas; esta ficha no atribuye ejecuciones.
- El retiro de autoridad económica legacy en participaciones, equipos e inscripciones sigue siendo
  gate de salida de Etapa 3.
- No se reabre E2-14 ni se repiten matrices generales.
- No se autoriza código, tests, suites, Emulator, Firebase remoto, deploy, fetch, stage, commit,
  push, merge o cambio de rama.
- No se cierra Etapa 3 ni se autoriza E3-06 u otro incremento.

## Veredicto

`E3-05 LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`

D01–D08=A cierran el alcance funcional. La query completa de avisos no introduce un límite de 20.
Su comprobación ejecutable inicial requiere futura autorización de implementación, Emulator local,
datos sintéticos y volumen explícito; no está autorizada por esta tarea. Una lectura incompleta nunca
acredita ausencia. Si resulta inviable, se detiene esa parte y se presenta una decisión
arquitectónica: no se adopta ahora proyección invertida ni límite funcional. No existe otra
incertidumbre funcional bloqueante identificada en este borrador.
