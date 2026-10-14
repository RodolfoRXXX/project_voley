# E3-04 — Registro administrativo directo de una recepción

## Estado de la ficha

- **Incremento:** `E3-04`.
- **Estado:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Fecha de definición inicial:** 2026-10-14.
- **Checkpoint de definición:** rama `dev`, HEAD
  `27ea7b044e8e0d4e524b41d7dcc15a2125b7b1e4`, `dev...origin/dev` 0/0, árbol e índice
  limpios y sin stashes; preflight realizado sin `fetch`.
- **Alcance autorizado en este corte:** formalización normativa local de ficha, DEC, addendum y
  registro mínimo D5-049 en Documento 5.
- **Implementación, pruebas, suites, Emulator, Firebase remoto, deploy, cambios normativos, stage,
  commit, push, merge y cambio de rama:** no autorizados.

Esta ficha no declara E3-04 listo, implementado, verificado o cerrado; tampoco cierra Etapa 3.
E3-04-D01–D06 y E3-04-R01–R04 fueron aprobadas el 2026-10-14 y formalizadas mediante DEC-E3-04,
addendum conjunto y D5-049. No quedan decisiones funcionales abiertas identificadas. Este estado no
autoriza implementación, pruebas, Emulator, integración Auth/UAT real ni deploy.

## 1. Hallazgos focales y vigencia del candidato

### 1.1 Fuentes revisadas

La definición se contrastó focalmente con:

- Documento 5 vigente, en especial §§5.5–5.16, 7.5, 8 y 9, y D5-043–D5-049;
- [cierre E3-03](./E3-03-cierre.md), su
  [ficha](./E3-03-ficha-aviso-validacion-pago.md), DEC-E3-03/D5-048 y el
  [addendum normativo E3-03](../../arquitectura/Documento-1-1.5-2-3-4-addendum-E3-03-entrega-informada.md);
- [addendum E3-01 de Pago](../../arquitectura/Documento-2-3-4-addendum-E3-01-pago-obligaciones.md)
  y el
  [addendum de liquidación prearchivo](../../arquitectura/Documento-2-addendum-E3-liquidacion-grupo-archivado.md);
- contratos y persistencia implementados de Pago y Entrega informada: validación cerrada,
  `paymentDeliveries`, aplicaciones subordinadas a `payments`, composición económica,
  `economicRevision`, receipts, confirmación/reversión atómicas y readers propios/Owner.

No se repitieron auditorías generales ni inventarios legacy.

### 1.2 Conclusión

El candidato sigue siendo útil, pero la secuencia previa debe reformularse después de E3-03:

```text
Owner o registrante delegado registra una recepción ya constatada
-> selecciona explícitamente 1..N obligaciones existentes del mismo contexto
-> confirma fecha, desglose e importe exactos
-> una operación atómica crea la identidad administrativa y aplica cada línea a Pago
-> historia y eventual reversión conservan procedencia administrativa
```

No debe recrear confirmación, aplicaciones, saldo, estado o reversión. E3-03 ya implementó esos
efectos y demostró que Pago es la única autoridad económica por obligación. E3-04 aporta únicamente
la entrada administrativa sin declaración previa del integrante y la semántica necesaria para
correlacionarla con avisos existentes.

### 1.3 Capacidades ya existentes que condicionan el corte

- Pago posee obligación, aplicaciones, ingresos confirmados/revertidos, saldo, estado y
  `economicRevision`.
- Entrega informada posee una **declaración del integrante**, líneas, decisión y reversión común.
  No puede reutilizarse como si el integrante hubiera declarado algo que no declaró.
- Una aplicación E3-03 se identifica de forma determinista por entrega y obligación; una reversión
  es completa, motivada, idempotente y Owner-only.
- Pendientes `REPORTED` no reservan saldo y pueden solaparse. Confirmar relee saldos y serializa por
  los Pagos compartidos.
- `GROUP_TREASURY` es sólo consulta. `GROUP_PAYMENT_NOTICE_REVIEW` permite decidir avisos de
  terceros, no registrar recepciones directas. Ninguna se amplía por analogía.
- Temporada cerrada y exintegrante no impiden liquidar obligaciones existentes. En archivo sólo
  Owner puede operar y cada Pago debe acreditar prearchivo.

## 2. Finalidad y no finalidad

### 2.1 Finalidad propuesta

Permitir que el Owner vigente o un registrante con delegación explícita registre una recepción que
ya constató fuera del sistema y distribuya su importe explícitamente entre obligaciones Pago
existentes de una Membresía exacta, sin exigir ni fabricar una Entrega informada previa. El efecto
debe ser inmediato, todo-o-nada, trazable, idempotente y reversible como corrección registral, sin
representar devolución real de dinero.

### 2.2 No finalidad

E3-04 no crea obligaciones, conceptos, Caja, pasarela, comprobantes, intereses, crédito, excedentes,
condonación, ajuste del exigible ni devolución real. No migra economía legacy, no retira sus
autoridades, no resuelve D5-045 y no adelanta D5-044. No crea roles configurables, perfiles ni un
nuevo Agregado: D01=B generaliza explícitamente la raíz de recepción. La delegación se limita a la
capacidad fija e independiente aprobada por D05=B.

## 3. Casos de uso

### 3.1 Primer corte vertical propuesto

**CU-E3-04-01 — Registrar recepción administrativa**

1. Owner o registrante delegado abre el flujo focal del Grupo y busca una Membresía.
2. El backend lista obligaciones existentes con saldo de esa Membresía, incluidas históricas que
   puedan liquidarse según las reglas vigentes.
3. Owner selecciona entre 1 y 20 obligaciones únicas del mismo Grupo, Temporada, Membresía y
   Persona, e indica importe exacto por línea y fecha civil de recepción.
4. Antes de confirmar, la UI presenta sujeto, procedencia **Registro administrativo**, desglose y
   total derivado, y advierte sobre avisos pendientes potencialmente relacionados.
5. El backend reautoriza ownership o el grant independiente, relee cada Pago y el conjunto completo
   de avisos candidatos, y contrasta la revisión humana conforme a E3-04-D03/D04.
6. Si todo es válido, persiste la identidad administrativa aprobada y crea una aplicación en cada
   Pago o no escribe nada.
7. Devuelve composición, saldo, estado y revisión canónicos de cada Pago.

**CU-E3-04-02 — Consultar la recepción administrativa**

- Owner la encuentra en una historia económica unificada o claramente contigua a la historia E3-03,
  con origen, actor, fecha funcional, fecha de registro, líneas, estado aplicado/revertido y vínculo
  explícito con avisos resueltos.
- El sujeto consulta sólo el efecto y la procedencia presentable sobre su economía propia, según
  E3-04-D06; no recibe notas internas, datos del actor ni información ajena.
- El registrante delegado recupera únicamente por referencia conocida los outcomes propios
  indispensables para retry y recovery; no posee listado histórico general.

**CU-E3-04-03 — Revertir el registro administrativo**

- Owner revierte el conjunto completo con motivo; todas las aplicaciones pasan de `APPLIED` a
  `REVERSED` o ninguna cambia.
- La operación conserva registro, actor, líneas y aplicaciones originales, rederiva cada Pago y no
  reabre automáticamente avisos relacionados.

### 3.2 Fuera del primer corte

- registro para varias Membresías, Personas, Temporadas o Grupos;
- asignación automática por vencimiento, antigüedad o saldo;
- adjuntos, medios de pago, Caja, conciliación o exportación;
- edición o reversión parcial;
- reaplicación del mismo registro;
- reglas heurísticas para declarar dos registros como la misma entrega real.

## 4. Actores y autorización

### 4.1 Actores aprobados

- **Owner vigente:** registra, consulta la historia administrativa general, concede/revoca la
  capacidad focal y es el único que revierte y opera en archivo. Actúa por Cuenta y ownership; no
  requiere Persona ni Membresía propia.
- **Registrante delegado:** requiere concesión individual, explícita y vigente de la capacidad fija
  `GROUP_DIRECT_PAYMENT_RECORD`; registra sólo en Grupo activo y accede a las lecturas
  mínimas de §4.3. No recibe Tesorería general ni revisión de avisos por implicación y no registra
  contra ninguna Membresía de su propia Persona.
- **Integrante o exintegrante sujeto:** no inicia el registro directo. Sólo consulta su propia
  economía y el resultado presentable según E3-04-D06.
- **Revisor E3-03 y tesorero E3-02:** sus capacidades existentes no autorizan E3-04. Una misma
  Cuenta sólo acumula facultades si recibió cada grant independiente.

### 4.2 Capacidad independiente y lifecycle

`GROUP_DIRECT_PAYMENT_RECORD` es la capacidad fija adoptada para registro
directo. Sólo Owner vigente puede concederla y revocarla explícitamente. Se reutiliza el patrón
E3-02/E3-03, sin convertir grants:

- Cuenta–Persona única y Membresía de autorización activa e íntegra;
- slot exclusivo por `groupId + capabilityId + accountId`, múltiples delegados independientes;
- grant con `ownerIdAtGrant`, `ownershipRevisionAtGrant`, ancla de vigencia y estado
  `ACTIVE | REVOKED`;
- retorno A → B → A, renovación, finalización, reactivación, cambio de Owner o archivo no reviven ni
  heredan autoridad;
- cada request, página y commit revalida Cuenta–Persona, Membresía/ancla, Grupo activo, Owner,
  `ownershipRevision`, slot y grant dentro de la unidad transaccional;
- revocación/cambio de Owner/archivo y registro respetan el primer commit y el perdedor relee;
- sólo Owner concede, revoca y lista grants; el delegado sólo acredita su contexto focal.

No se amplían `GROUP_TREASURY` ni `GROUP_PAYMENT_NOTICE_REVIEW`; cargo, rol global, IDs conocidos,
arrays legacy y grants existentes no autorizan ni se convierten.

### 4.3 Lecturas mínimas del registrante delegado

La capacidad permite exclusivamente:

- buscar dentro del Grupo activo sujetos con obligaciones registrables mediante nombre presentable,
  `membershipId`, Temporada y condición activa/finalizada mínimas;
- listar, para una Membresía exacta elegida, conceptos presentables, vencimiento, saldo, estado y
  revisión de Pagos con saldo; no totales generales, conceptos administrativos ni otras
  Membresías en la misma respuesta;
- leer el conjunto completo y acotado de avisos `REPORTED` de esa misma Membresía sólo con fecha,
  líneas, importes y datos de sujeto necesarios para clasificarlos;
- ejecutar el registro y recuperar outcomes de comandos propios.

No obtiene dashboard, totales, historia económica general, grants ajenos ni historia Owner. La
búsqueda de sujetos y las obligaciones se paginan/reautorizan; la revisión de candidatos no se
pagina ni se trunca porque integra una decisión todo-o-nada.

## 5. Scope y selección de obligaciones

### 5.1 Scope aprobado por D02=A

- 1..20 Pagos únicos;
- un mismo `groupId`, `seasonId`, `membershipId` y `personId`;
- obligaciones existentes e íntegras, nunca creadas por este flujo;
- importe por línea entero ARS, mayor que cero y no superior al saldo vigente;
- total derivado como suma exacta, nunca enviado como autoridad;
- modalidad `FULL | PARTIAL`: `FULL` exige `amountMinor == expectedBalanceMinor`; `PARTIAL` exige
  `0 < amountMinor <= expectedBalanceMinor`; en ambos casos el importe exacto revisado es el que se
  aplica o el comando completo falla stale;
- selección explícita; sin reparto automático;
- snapshots `expectedBalanceMinor` y `expectedEconomicRevision` para detectar borradores stale.

El límite 20 fue aprobado específicamente para E3-04. No generaliza la excepción E3-03 a otros
flujos; el addendum E3-04 debe aprobar su propia unidad de consistencia.

### 5.2 Invariantes candidatas

1. Una línea referencia exactamente un Pago y no se repite en el registro.
2. Todas las líneas pertenecen a una Membresía/Temporada/Grupo/Persona exactos.
3. El total es suma de líneas y las líneas aplicadas son inmutables.
4. Todas las aplicaciones se crean o revierten como conjunto, o ninguna cambia.
5. Pago es la única autoridad de saldo, estado, movimientos y revisión económica.
6. La procedencia administrativa nunca se presenta como declaración del integrante.
7. Un aviso pendiente no reserva saldo ni prueba identidad con la recepción.
8. Ninguna coincidencia heurística decide automáticamente que dos registros representan la misma
   entrega real.
9. Saldo nunca queda negativo y cada mutación incrementa la revisión económica canónica.
10. Grupo, Temporada, Membresía, Persona y Períodos sólo se leen.

## 6. Identidad y relación con Entrega informada

D01=B generaliza de forma explícita y compatible la raíz E3-03 a una **Recepción** con orígenes
cerrados `INFORMED | ADMINISTRATIVE`. `receiptId` es la identidad común propuesta; los `deliveryId`
E3-03 existentes continúan siendo identidades válidas y deben poder leerse sin backfill obligatorio.
El nombre físico definitivo y la estrategia compatible se formalizan en el addendum, sin crear un
Agregado adicional.

Debe conservar como mínimo:

- origen administrativo inequívoco;
- Grupo, Temporada, Membresía y Persona sujeto derivados;
- fecha civil de recepción declarada por Owner;
- líneas e importe total;
- Cuenta Owner/delegada que registró y timestamp servidor;
- estado económico `APPLIED | REVERSED` y trazabilidad común;
- referencias explícitas a avisos E3-03 que la decisión de negocio identifique como la misma entrega
  real.

Los subtipos conservan autoría y lifecycle distintos:

- `INFORMED` preserva `reportedByAccountId`, `declaredPaidOn`, líneas declaradas y
  `REPORTED -> CONFIRMED | REJECTED | RESOLVED_BY_ADMINISTRATIVE_RECEIPT`; sólo `CONFIRMED` genera
  aplicaciones propias;
- `ADMINISTRATIVE` conserva `recordedByAccountId`, `receivedOn`, líneas constatadas y nace
  `APPLIED` en el mismo commit que sus aplicaciones; nunca contiene `reportedByAccountId`,
  `decisionState=REPORTED` ni una confirmación atribuida al integrante;
- ambos pueden terminar con vigencia económica `APPLIED | REVERSED`, pero resolver un aviso
  `INFORMED` mediante una raíz `ADMINISTRATIVE` no crea aplicación para el aviso: guarda vínculo
  inmutable `resolvedByAdministrativeReceiptId` y conserva su declaración original.

## 7. Aplicaciones, saldo, historia y reversión

### 7.1 Reutilización propuesta

La aplicación económica debe evolucionar de una referencia exclusiva `deliveryId` a una referencia
de fuente cerrada, conceptualmente:

```text
source = { kind: INFORMED, receiptId }
       | { kind: ADMINISTRATIVE, receiptId }
```

La forma física compatible y el nombre definitivo se cierran en el addendum normativo. Para ambos
orígenes se conservan:

- `applicationId` determinista por identidad de recepción + `paymentId`;
- `appliedAmountMinor`, `APPLIED | REVERSED`, actor y timestamps de servidor;
- composición `confirmedIncomeMinor - reversedIncomeMinor = netConfirmedIncomeMinor`;
- `balanceMinor = amountMinor - netConfirmedIncomeMinor`;
- estado `PENDING | PARTIAL | SETTLED` y `economicRevision`;
- reversión completa, única, motivada, idempotente y Owner-only.

La historia administrativa puede componerse con la historia E3-03 en un reader, pero una proyección
unificada no fusiona las autoridades ni borra la procedencia.

### 7.2 Reversión y avisos relacionados

Revertir corrige el registro económico y no devuelve dinero. No reabre automáticamente un aviso
E3-03 cerrado como relacionado: la decisión histórica permanece y la UI explica que el efecto
económico fue revertido. Si se necesita volver a considerar la declaración, debe existir una acción
normada independiente; no se deriva de la reversión.

## 8. Avisos pendientes y misma entrega real

### 8.1 Dos conceptos distintos

**Deduplicación técnica** evita repetir un mismo comando. Usa actor, operación, scope,
`idempotencyKey` y hash canónico. La misma key con la misma intención recupera el outcome; con otra
intención conflictúa. Una key distinta no demuestra una recepción distinta.

**Identificación de una misma entrega real** es una decisión humana/de negocio entre un registro
administrativo y uno o más avisos. Coincidencias de Persona, fecha, importe u obligaciones son sólo
señales para presentar candidatos. No autorizan enlace, rechazo, confirmación ni mutación automática.

### 8.2 Clasificación aprobada por D03/D04

Antes de registrar, el backend devuelve el conjunto completo de avisos `REPORTED` de la misma
Membresía. Esta regla amplía y sustituye expresamente el filtro inicial que consideraba sólo avisos
con Pagos intersectados: un aviso con desglose equivocado puede representar la misma entrega real
sin compartir el mapa correcto de obligaciones. Fecha, total, líneas e importes pueden señalar
coincidencias, pero nunca deciden identidad. El actor clasifica cada candidato:

- `DISTINCT_REAL_RECEIPT`: corresponde a otra entrega real; permanece `REPORTED`;
- `SAME_CONFIRMABLE_NOTICE`: es la misma entrega y el aviso es correcto/aplicable tal como fue
  informado; E3-04 no registra y orienta a confirmarlo mediante E3-03;
- `SAME_REQUIRES_ADMINISTRATIVE_RECORD`: representa la misma entrega, pero sus datos/líneas no
  pueden confirmarse correctamente como están; el registro administrativo aplica una sola vez y el
  aviso pasa a `RESOLVED_BY_ADMINISTRATIVE_RECEIPT` conservando declaración y vínculo;
- `UNDETERMINED`: impide registrar.

No se admite omitir un candidato, enviar una decisión para un ID no presentado o resolver sólo una
página. La simple existencia de pendientes distintos no bloquea; una clasificación indeterminada o
desactualizada sí.

### 8.3 Preferencia por confirmar E3-03

Un aviso es **correcto y confirmable** cuando el actor reconoce la misma entrega real y la fecha,
Membresía, obligaciones e importes declarados son exactamente los que deben aplicarse, todas las
líneas caben en los saldos vigentes y el aviso continúa `REPORTED`. En ese caso la UI muestra:

> Esta recepción ya fue informada correctamente. Confirmá la entrega existente para conservar su
> declaración; no la registres de nuevo.

- Owner o actor que además posee `GROUP_PAYMENT_NOTICE_REVIEW` abandona el borrador E3-04 y navega
  al detalle E3-03 para confirmar mediante su contrato vigente.
- El registrante directo que carece de revisión no recibe permiso implícito ni confirma desde
  E3-04. Obtiene `NOTICE_CONFIRMATION_REQUIRED`; el borrador se conserva localmente sin receipt
  terminal y debe intervenir Owner o un revisor autorizado E3-03.
- Poseer ambas capacidades no fusiona contratos: la confirmación sigue siendo E3-03 y el registro
  directo sigue siendo E3-04.

`SAME_REQUIRES_ADMINISTRATIVE_RECORD` queda reservado para el caso en que la declaración refiere a
la misma entrega real pero no puede confirmarse fielmente —por ejemplo, desglose, importe o fecha
declarados no coinciden con lo constatado— y la administración registra el desglose correcto. Exige
`correctedFields`, conjunto no vacío y cerrado formado por `AMOUNT_OR_ALLOCATION` y/o
`RECEIVED_DATE`; no existe motivo genérico. Backend deriva las diferencias reales comparando
`declaredPaidOn` con `receivedOn` y el mapa canónico `paymentId -> importe` del aviso con el registro,
y exige que `correctedFields` coincida exactamente con ese conjunto derivado. Una etiqueta sin
diferencia real falla; una diferencia real no declarada también falla. No es un atajo frente a falta
de permiso de revisión, stale temporal o preferencia de UI.

### 8.4 Máximo de avisos y exceso

`MAX_RELATED_NOTICES = 20`, aprobado por R03, es independiente de las 1..20 obligaciones. Para no
perder declaraciones potencialmente vinculadas, candidato significa **todo aviso `REPORTED` de la
misma `membershipId`**, no sólo el que intersecta los Pagos seleccionados. La consulta transaccional
pide hasta 21:

- con 0..20 devuelve todos, un `candidateRevision` y un digest canónico ligado al scope;
- con 21 no devuelve una primera página utilizable ni omite el resto: responde
  `TOO_MANY_RELATED_NOTICES`, informa sólo que se excedió el máximo y prohíbe registrar;
- para reducir el conjunto deben resolverse avisos completos mediante E3-03 y comenzar una nueva
  revisión E3-04; nunca se fragmenta una resolución administrativa todo-o-nada.

El máximo 20 mantiene el peor caso
de registro en 63 escrituras de negocio/coordinación: `N` updates de Pago + `N` aplicaciones + una
raíz administrativa + `M` avisos resueltos + un receipt + un guard, con `N<=20`, `M<=20`:
`2N + M + 3 <= 63`. Los avisos clasificados como distintos se leen y validan, pero no se escriben.
Autorización, identidad y consultas agregan lecturas; tamaño, retries y contención deben medirse en
una implementación futura. El presupuesto no es evidencia de rendimiento.

La coordinación agrega una escritura de guard a los comandos E3-03 que cambian candidatos:
informar pasa de 2 a 3 escrituras; confirmar pasa de `2N + 2` a `2N + 3` (máximo 43); rechazar pasa
de 2 a 3. Reversión E3-03 no cambia el conjunto `REPORTED` y no escribe este guard. Estos números
son diseño propuesto, no autorización para modificar E3-03 ni mediciones.

## 9. Recepción directa frente a confirmación concurrente

Saldo, idempotencia y una consulta previa no detectan por sí solos que aparecieron, se confirmaron o
se rechazaron candidatos después de la revisión humana. Se propone un guard técnico dedicado por
`groupId + membershipId`, fuera de Grupo y Membresía, con `candidateRevision` y timestamp servidor;
no contiene saldo, autorización ni decisiones funcionales.

Cada operación E3-03 que cambia el conjunto revisable escribe el guard en la misma transacción:

- `reportOwnPaymentDelivery` al crear un nuevo `REPORTED`;
- `confirmPaymentDelivery` y `rejectPaymentDelivery` al sacar uno de `REPORTED`;
- la resolución E3-04 al llevarlo a `RESOLVED_BY_ADMINISTRATIVE_RECEIPT`.

Preview E3-04 devuelve revisión, digest e IDs/revisiones de **todos** los candidatos. El comando de
registro envía esa evidencia y todas las clasificaciones. Dentro del commit el backend:

1. reautoriza Owner/grant y relee Grupo, Membresía, Pagos y guard;
2. vuelve a consultar el conjunto completo con límite 21;
3. exige misma `candidateRevision`, mismo digest, mismos IDs, estados y revisiones, y una
   clasificación por candidato;
4. exige que ningún candidato sea `UNDETERMINED` o `SAME_CONFIRMABLE_NOTICE`;
5. sólo entonces aplica el registro y las resoluciones como conjunto.

Cualquier alta, confirmación, rechazo o resolución concurrente cambia el guard y obliga a reintentar
la transacción; al reintentar, la evidencia del usuario queda desactualizada y responde
`RELATED_NOTICE_REVIEW_STALE` sin efectos. No se reinterpreta automáticamente la selección.

El registro directo y `confirmPaymentDelivery` también serializan por las mismas raíces Pago. En una
carrera válida sólo el primer commit aplica su importe sobre el saldo observado:

- si confirmar el aviso gana y deja saldo insuficiente, el registro directo falla stale sin crear
  identidad ni receipt terminal de éxito;
- si el registro directo gana, confirmar el aviso reintenta y, si una línea ya no cabe, conserva el
  aviso `REPORTED` con `DELIVERY_STALE_BALANCE`;
- si ambos importes aún caben, ambos podrían aplicarse técnicamente, pero sólo si Owner declaró que
  son entregas reales distintas; si fueron vinculados como la misma entrega, la Unidad de Trabajo
  debe impedir el doble efecto.

La resolución explícita de un aviso como “misma entrega” comparte transacción con la raíz
`ADMINISTRATIVE`, las aplicaciones, Pagos, receipt y guard. No se admite el orden “aplicar y luego
cerrar aviso” con éxito parcial. Reportar no escribe estado económico; el guard no se guarda en
Grupo/Membresía y no sustituye `economicRevision`, ownership ni grants.

## 10. Temporada cerrada, exintegrantes y prearchivo

### 10.1 Regla aprobada

- Temporada cerrada y Membresía finalizada no impiden aplicar una recepción a obligaciones
  existentes; no se repite elegibilidad de generación.
- La Membresía exacta conserva el contexto y la Persona sujeto; renovación no mueve deuda a otra
  raíz.
- Owner puede registrar para exintegrantes y actúa sin Persona propia.
- En Grupo archivado sólo Owner puede registrar o revertir y todas las líneas acreditan
  individualmente Pago prearchivo según el addendum vigente.
- Una línea que no acredita prearchivo bloquea el conjunto.
- No se crean conceptos u obligaciones, no reviven grants y no se modifica Grupo, Temporada,
  Membresía o Períodos.

Esta propuesta es coherente con la excepción prospectiva vigente, que ya menciona que Owner registra
ingresos prearchivo, pero requiere que el paquete normativo E3-04 concrete esta operación y su
frontera antes de implementarla.

## 11. Contratos públicos cerrados para revisión normativa

Los nombres son propuestas de trabajo y no autorizan implementación:

- `searchDirectPaymentSubjects({ groupId, query, pageSize?, cursor? })`;
- `listDirectPaymentObligations({ groupId, membershipId, pageSize?, cursor? })`;
- `previewAdministrativeReceipt({ groupId, membershipId, receivedOn, lines })`, que devuelve el
  conjunto completo de hasta 20 candidatos, `candidateRevision` y digest;
- `recordAdministrativeReceipt({ groupId, membershipId, receivedOn, lines,
  candidateRevision, candidateDigest, relatedNoticeDecisions, idempotencyKey })`;
- `listOwnerAdministrativeReceipts({ groupId, membershipId?, applicationState?, receivedFrom?,
  receivedTo?, pageSize?, cursor? })`;
- `getOwnerAdministrativeReceipt({ groupId, administrativeReceiptId })`;
- `getMyDirectPaymentRecordOutcome({ groupId, administrativeReceiptId })`, para recovery del
  registrante delegado sobre un comando propio, sin enumeración general;
- `reverseAdministrativeReceipt({ groupId, administrativeReceiptId, reason, idempotencyKey })`;
- `listMyPaymentReceipts` / `getMyPaymentReceipt`, extendidos de forma compatible para D06=A;
- conceder, revocar y listar grants `GROUP_DIRECT_PAYMENT_RECORD`, más acreditar contexto propio.

Todos los inputs son objetos cerrados. Backend deriva actor, ownership, Persona, Temporada, total,
saldos, estados, timestamps y procedencia. No acepta actor, `personId`, total, estado o capability ID
como autoridad cliente.

### 11.1 DTOs de entrada

```text
AdministrativeReceiptLineInput = {
  paymentId,
  allocationMode: FULL | PARTIAL,
  amountMinor,
  expectedBalanceMinor,
  expectedEconomicRevision
}

RelatedNoticeDecisionInput = {
  deliveryId,
  expectedDeliveryRevision,
  relation: DISTINCT_REAL_RECEIPT
          | SAME_CONFIRMABLE_NOTICE
          | SAME_REQUIRES_ADMINISTRATIVE_RECORD
          | UNDETERMINED,
  correctedFields?: [AMOUNT_OR_ALLOCATION | RECEIVED_DATE] // conjunto no vacío, sin duplicados
}
```

`relatedNoticeDecisions` contiene exactamente una entrada por candidato presentado, con
`deliveryId`, revisión esperada y clasificación cerrada D04=A. `correctedFields` es obligatorio sólo
para `SAME_REQUIRES_ADMINISTRATIVE_RECORD`; puede contener importe/desglose, fecha o ambos. No existe
motivo genérico, no transporta texto libre para inventar estados y no acepta avisos omitidos.

### 11.2 DTOs de salida

```text
AdministrativeReceiptPreviewDto = {
  subject: { displayName, membershipLabel, seasonLabel },
  receivedOn,
  lines: [{ paymentId, conceptName, dueDate, allocationMode, amountMinor,
            currentBalanceMinor, currentEconomicRevision }],
  totalMinor,
  candidateRevision,
  candidateDigest,
  relatedNotices: [RelatedNoticeCandidateDto] // conjunto completo 0..20
}

RelatedNoticeCandidateDto = {
  deliveryId,
  deliveryRevision,
  declaredPaidOn,
  declaredTotalMinor,
  lines: [{ paymentId, conceptName, dueDate, requestedAmountMinor }]
}

AdministrativeReceiptDto = {
  administrativeReceiptId,
  origin: ADMINISTRATIVE,
  groupId, membershipId,
  receivedOn, recordedAt,
  totalMinor,
  applicationState: APPLIED | REVERSED,
  lines: [{ paymentId, conceptName, dueDate, amountMinor }],
  resolvedNoticeIds,
  reversedAt?, reversalReason?
}
```

DTO propio D06=A omite actor interno y `resolvedNoticeIds`; el aviso resuelto muestra su declaración,
la etiqueta **Resuelto mediante registro administrativo** y el estado `APPLIED | REVERSED` leído de
la recepción asociada, sin sumar su total como otro ingreso. El outcome delegado mínimo devuelve
`administrativeReceiptId`, `outcome`, `recordedAt`, `receivedOn`, `totalMinor` y
`applicationState`, únicamente para un comando propio conocido.

### 11.3 Errores contractuales

- `VALIDATION_FAILED`;
- `ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED`;
- `SELF_DIRECT_PAYMENT_RECORD_FORBIDDEN`;
- `ADMINISTRATIVE_RECEIPT_SCOPE_MISMATCH`;
- `DUPLICATE_RECEIPT_LINE` / `RECEIPT_LINE_LIMIT_EXCEEDED`;
- `ADMINISTRATIVE_RECEIPT_DRAFT_STALE`;
- `PENDING_NOTICE_RESOLUTION_REQUIRED`;
- `NOTICE_CONFIRMATION_REQUIRED`;
- `RELATED_NOTICE_REVIEW_STALE` / `TOO_MANY_RELATED_NOTICES`;
- `NOTICE_NOT_PENDING` / `NOTICE_RELATION_CONFLICT`;
- `PREARCHIVE_PAYMENT_REQUIRED`;
- `ADMINISTRATIVE_RECEIPT_NOT_REVERSIBLE`;
- `IDEMPOTENCY_CONFLICT` / `PENDING_RECOVERY` / `INCOMPATIBLE_STATE`.

No deben filtrar existencia o economía ajena.

## 12. Persistencia propuesta y abierta

### 12.1 Datos originales

- raíz Recepción generalizada, discriminador `origin` y autoría/lifecycle específicos conforme a
  D01=B;
- contexto y líneas inmutables;
- fecha funcional `receivedOn` y timestamp servidor `recordedAt`;
- actor registrante;
- vigencia aplicada/revertida y reversión común;
- decisiones explícitas sobre avisos relacionados;
- aplicaciones económicas subordinadas a cada Pago;
- receipts por comando;
- guard técnico de revisión de candidatos, sin economía ni autorización.

### 12.2 Datos derivados

- total del registro;
- saldo, estado, neto y revisión de cada Pago;
- coincidencias presentacionales con avisos;
- vistas de historia y composición propias/Owner.

### 12.3 Forma física compatible propuesta

- conservar `paymentDeliveries/{receiptId}` como colección de la raíz generalizada; todo documento
  E3-03 schema v1 se interpreta como `origin=INFORMED`, con `receiptId=deliveryId`, sin backfill;
- escribir schema v2 como unión cerrada. Campos comunes: `receiptId`, `origin`, `groupId`,
  `seasonId`, `membershipId`, `personId`, líneas inmutables, total derivado, `revision` y
  `schemaVersion=2`;
- `INFORMED` v2 conserva `deliveryId` como alias contractual de su identidad,
  `reportedByAccountId`, `declaredPaidOn`, `reportedAt`, `decisionState`, decisión/actor/timestamps y
  eventual `applicationState`/reversión. Prohíbe campos administrativos;
- `ADMINISTRATIVE` v2 conserva `recordedByAccountId`, `recordedByKind: OWNER | DELEGATE`,
  `receivedOn`, `recordedAt`, `applicationState: APPLIED | REVERSED` y eventual reversión. Prohíbe
  `reportedByAccountId`, `decisionState=REPORTED` y confirmación atribuida al sujeto;
- evolucionar aplicaciones nuevas de Pago a schema v2 con
  `source: { kind: INFORMED | ADMINISTRATIVE, receiptId }`; aplicaciones E3-03 schema v1 con
  `deliveryId` se leen como fuente `INFORMED`, sin reescritura ni doble conteo;
- reversiones nuevas usan referencia tipada a la fuente; reversiones E3-03 v1 conservan
  `deliveryId` y se normalizan como `INFORMED` al leer;
- persistir en el aviso resuelto `resolvedByAdministrativeReceiptId`, estado terminal, actor y
  timestamp, conservando líneas/declaración originales;
- usar un guard técnico dedicado candidato como
  `paymentReceiptCandidateGuards/{opaque(groupId,membershipId)}`; el nombre es propuesta física,
  no un dato en Grupo/Membresía ni una fuente de economía/autorización;
- conservar receipts separados por operación/capacidad y grants/slots separados por capability.

Una suma de N aplicaciones sin raíz común queda descartada por D01=B. La compatibilidad concreta
—lectura dual, evolución in-place o proyección— debe fijarse en el addendum y diseño físico futuro,
sin backfill silencioso.

Firestore cliente continúa deny-all. Repositorios y servicios backend son los únicos lectores y
writers económicos.

### 12.4 Repositorios, queries, índices y cursores previstos

- `ReceiptRepository`: hidrata v1/v2, persiste `ADMINISTRATIVE`, resuelve avisos `INFORMED` y no
  calcula economía;
- `PaymentEconomicRepository`: relee/muta Pagos y aplicaciones tipadas, única autoridad de saldo;
- `ReceiptCandidateGuardRepository`: bootstrap lazy, revisión y coordinación por Membresía;
- `DirectPaymentCapabilityRepository`: grants, slots y receipts sólo de
  `GROUP_DIRECT_PAYMENT_RECORD`;
- `AdministrativeReceiptCommandReceiptRepository`: idempotencia/recovery de registrar/revertir.

Queries e índices candidatos:

- candidatos completos: `membershipId == X + decisionState == REPORTED + reportedAt ASC +
  __name__ ASC`, límite 21, sin cursor público. Usa campos E3-03 v1 reales y también cubre
  `INFORMED` v2, que los conserva;
- obligaciones del registrante: índices E3-01 por `groupId + membershipId`, estado y orden estable;
- grants: índices/patrones E3-02/E3-03 por Grupo, capability, actor, estado y fecha.

La historia compatible no filtra ni ordena v1 por `origin` o un `occurredAt` inexistente. Compone en
backend dos streams físicos disjuntos:

**Historia económica Owner**

1. Stream informado v1/v2: `groupId == X + decisionState == CONFIRMED`, filtros E3-03 opcionales
   sobre `membershipId`, `applicationState` y `confirmedAt`, orden
   `confirmedAt DESC + __name__ DESC`.
2. Stream administrativo v2: `groupId == X + origin == ADMINISTRATIVE`, filtros equivalentes sobre
   `membershipId`, `applicationState` y `recordedAt`, orden
   `recordedAt DESC + __name__ DESC`.

**Historia propia**

1. Stream informado v1/v2: `personId == P`, opcional `membershipId`, orden
   `reportedAt DESC + __name__ DESC`, exactamente sobre campos E3-03 existentes. El `orderBy`
   físico exige `reportedAt`, por lo que no incluye raíces `ADMINISTRATIVE` que lo prohíben.
2. Stream administrativo v2: `personId == P + origin == ADMINISTRATIVE`, opcional `membershipId`,
   orden `recordedAt DESC + __name__ DESC`.

El reader normaliza sólo después de que cada query física incluyó sus documentos. Para el merge,
`eventAt` es `confirmedAt` o `reportedAt` en el stream informado según contrato, y `recordedAt` en
el administrativo. El orden total es `eventAt DESC, receiptId DESC`; los IDs de documento son únicos
en la colección, por lo que no se requiere desempate por origen.

El cursor opaco compuesto guarda, por stream, el último ancla **emitida** `(timestamp, documentId)`;
si una página no emite elementos de un stream, conserva su ancla anterior. Cada llamada obtiene
hasta `pageSize + 1` desde cada stream con `startAfter` de su propia ancla, hace merge estable y emite
como máximo `pageSize`. Elementos leídos pero no emitidos no avanzan el cursor y se releen en la
página siguiente. Así no hay saltos ni duplicados entre páginas; no se usa offset ni un cursor único
aplicado a ambos órdenes físicos.

La garantía de ausencia de omisiones/duplicados aplica a un conjunto estable durante el recorrido.
Nuevas recepciones con orden anterior a las anclas no se inyectan a mitad de paginación: aparecen al
refrescar desde el inicio.

Páginas default 20, máximo 50. El cursor se liga a actor, contrato, Grupo, Persona derivada,
Membresía/filtros, rangos, orden y tamaño; cada página reautoriza antes de ejecutar ambos streams.
DTOs mantienen `deliveryId`, campos y semántica de estados E3-03 existentes. Para avisos resueltos
futuros, el DTO `INFORMED` se amplía de forma aditiva/versionada con
`RESOLVED_BY_ADMINISTRATIVE_RECEIPT` y un bloque opcional mínimo de resolución/vínculo; la evidencia
histórica no se reclasifica. Los contratos
`listMyPaymentDeliveries`, `getMyPaymentDelivery`, `listOwnerConfirmedPaymentDeliveries` y
`getOwnerPaymentDeliveryHistory` conservan sus queries, orden y DTO `INFORMED`; los nuevos
`listMyPaymentReceipts` y readers unificados componen ambos streams y devuelven el DTO de Recepción.
No se modifica silenciosamente la paginación E3-03. Índices físicos definitivos se validan al
implementar, sin autorizar deploy.

## 13. Idempotencia, atomicidad, concurrencia y recovery

- key de 16–128 caracteres, cruda no persistida;
- hash canónico incluye operación, actor, Grupo, Membresía, fecha, líneas ordenadas, importes,
  snapshots, `candidateRevision`, digest y decisiones explícitas sobre todos los avisos;
- misma key/igual intención recupera identidad, aplicaciones y outcome originales;
- misma key con cualquier diferencia conflictúa;
- otra key no identifica automáticamente otra entrega real;
- registrar modifica raíz `ADMINISTRATIVE`, 1..20 Pagos, 1..20 aplicaciones, hasta 20 avisos
  expresamente resueltos, receipt y guard en una sola transacción o no modifica nada;
- revertir modifica identidad, todos los Pagos/aplicaciones, reversión común y receipt como conjunto;
- recovery reconcilia identidad, receipt, aplicaciones, revisiones de Pago y avisos vinculados; una
  persistencia parcial o incoherente nunca se devuelve como éxito;
- reportar/confirmar/rechazar/resolver E3-03 y registrar E3-04 coordinan el conjunto candidato por el
  guard dedicado; dos registros sobre Pagos comunes, confirmación, reversión, revocación y archivo
  serializan además por raíces/guards compartidos y reautorizan en el punto transaccional.

La excepción multi-Pago de E3-03 no se amplía por analogía. D02=A aprueba 1..20 para E3-04, pero el
paquete normativo debe adoptar expresamente esta nueva unidad de consistencia y el máximo de avisos
E3-04-R03. El peor caso propuesto de registro es 63 escrituras; preview lee como máximo 21 avisos
para detectar exceso sin truncarlo. La reversión no reabre avisos y mantiene su presupuesto separado.

### 13.1 Recovery estable frente a evolución legítima

Recovery primero reautoriza al actor actual. Owner acredita ownership; delegado acredita
Cuenta–Persona, ancla, slot, grant, Grupo activo y `ownershipRevision`. Sin autorización vigente no
se revela outcome.

Con receipt terminal, valida la evidencia original inmutable:

- actor, operación, scope, request hash e identidad de recepción;
- origen, contexto, fecha, líneas, importes y resultado originales;
- aplicaciones por línea, fuente tipada y vínculo de cada aviso resuelto;
- consistencia `APPLIED | REVERSED` entre raíz, aplicaciones y reversión común.

No exige que `candidateRevision`, digest, saldo o `economicRevision` actuales sigan iguales a los
snapshots históricos: confirmaciones, registros, reversiones u otras operaciones legítimas pueden
haberlos avanzado. Recovery nunca recalcula `FULL`, sustituye importes ni reconstruye el resultado
con valores actuales; devuelve los importes y outcome originales. Puede anexar composición actual
sólo como dato explícitamente actual y derivado por el reader, separado del resultado recuperado.

Si no existe receipt terminal, el reintento vuelve a reautorizar y a validar la intención. No
persiste una intención nueva bajo la misma key si el preview ya quedó stale; responde
`ADMINISTRATIVE_RECEIPT_DRAFT_STALE` o `RELATED_NOTICE_REVIEW_STALE`. Raíz/receipt/aplicaciones o
resoluciones parciales/incoherentes producen `INCOMPATIBLE_STATE`, nunca éxito sintético.

### 13.2 Guard: bootstrap compatible y preview coherente

El guard se crea perezosamente por `groupId + membershipId`; no hay backfill general. Guarda una
revisión técnica monótona, timestamps/contexto opaco y schema, no un snapshot, IDs ni cantidad del
conjunto.

Si falta durante preview E3-04, la transacción lee Grupo/Membresía, reautoriza, consulta
`REPORTED` con límite 21 y crea la revisión inicial. La ausencia del elemento 21 acredita que los
0..20 leídos son el conjunto completo revisable; su presencia sólo acredita **exceso**, no pretende
enumerar el resto. El guard se crea igualmente y preview responde `TOO_MANY_RELATED_NOTICES` sin
digest o lista parcial utilizable.

Si falta durante un comando E3-03, reportar/confirmar/rechazar no enumera pendientes ni aplica el
máximo E3-04. El comando lee/crea el guard y persiste una revisión nueva en la misma transacción que
su cambio puntual. Confirmar o rechazar el `deliveryId` solicitado continúa funcionando aunque haya
más de 20 pendientes; cada éxito reduce o mantiene el conjunto según su transición. Así puede
reducirse el exceso y luego iniciar un nuevo preview E3-04.

Preview puede inicializar el guard aun siendo una consulta lógica. Dos inicializadores o un report
concurrente compiten sobre el mismo documento: uno confirma y el otro reintenta. Al reintentar debe
releer guard y, sólo para preview, la query límite 21; no reutiliza resultados previos.

Todos los writers que cambian el conjunto deben leer y escribir el mismo guard en su transacción:

- `reportOwnPaymentDelivery` al añadir `REPORTED`;
- `confirmPaymentDelivery` y `rejectPaymentDelivery` al retirar `REPORTED`;
- `recordAdministrativeReceipt` al resolver como
  `RESOLVED_BY_ADMINISTRATIVE_RECEIPT`;
- cualquier writer futuro que introduzca o retire un estado candidato, que requerirá decisión
  propia. Reversión no cambia ese conjunto y no incrementa el guard.

Sólo una transición efectiva incrementa la revisión. Retry/recovery de un receipt terminal y un
comando que no cambia pertenencia al conjunto no la incrementan nuevamente.

No hay reparación silenciosa si falta guard. Preview valida las fuentes E3-03 que debe presentar; un
aviso incompatible dentro de los 0..20 produce `INCOMPATIBLE_STATE` y no se omite. Con exceso no
declara íntegra una muestra ni valida como completo lo que no enumeró. El guard no reserva saldo, no
guarda autorización, decisiones, importes, conteo ni estado económico y no se escribe en
Grupo/Membresía.

Preview obtiene una vista coherente en una sola transacción: autorización, guard ya inicializado,
los 0..20 candidatos completos y los snapshots de todos los Pagos seleccionados. Devuelve revisión
y digest canónico de IDs/revisiones/líneas de candidatos más balances/revisiones de Pago. El commit
repite esas lecturas y exige igualdad de la evidencia revisada. `FULL` conserva el
`amountMinor == expectedBalanceMinor` aceptado en preview; si saldo/revisión cambian, falla stale y
no sustituye el importe por el saldo actual. Invalidan la revisión:

- aparición de un aviso;
- confirmación, rechazo o resolución de un candidato;
- cambio de revisión/forma compatible de un candidato;
- saldo o `economicRevision` distintos en cualquier Pago seleccionado;
- cambio de autorización, ownership, lifecycle de Grupo o integridad del contexto.

El cliente debe rehacer preview y revisión humana; idempotencia, saldo aislado o un query anterior no
sustituyen esta coordinación.

## 14. Frontend

### 14.1 Owner y registrante delegado

El flujo se separa visualmente de **Revisar entregas**. Para Owner puede integrarse a la economía
del Grupo; para el delegado usa una ruta focal sin dashboard de Tesorería:

- acción **Registrar recepción**;
- búsqueda/selección de una Membresía con nombre presentable, no IDs técnicos;
- obligaciones agrupadas por Temporada y contexto exacto;
- selección conservada sólo dentro del mismo contexto, total/parcial e importe por línea;
- fecha civil y resumen final con badge **Registro administrativo**;
- sección obligatoria **Avisos pendientes posiblemente relacionados**, explicando que coincidencia
  no significa identidad;
- elección explícita para cada candidato según D03/D04, sin paginación ni omisiones;
- si hay más de 20 candidatos, bloqueo antes de la revisión y orientación para resolver avisos E3-03;
- si el aviso correcto debe confirmarse, CTA **Abrir entrega informada**; sin
  `GROUP_PAYMENT_NOTICE_REVIEW`, explicación **Necesita intervención del Owner o de un revisor de
  entregas**, sin botón de confirmación implícito;
- si revisión/digest cambió, invalida el resumen, anuncia candidatos actualizados y exige revisar
  todos nuevamente;
- confirmación con total, líneas, sujeto y efecto inmediato;
- feedback de stale/recovery sin recalcular economía en cliente;
- origen visible; Owner recibe historia y acción **Revertir registro**. El delegado sólo recupera
  outcomes propios por referencia conocida, sin listado.

Debe cubrir teclado, foco, labels, `aria-live`, loading, vacío, error privado, stale, outcome
recuperado y pérdida de autorización. No muestra UID, email, hashes, paths, grants o IDs como texto
de usuario.

### 14.2 Sujeto

La vista propia conserva obligaciones como fuente de consulta y, por D06=A, muestra un evento común
con etiqueta **Registrado por la administración**, fecha de recepción, total, líneas y estado
aplicado/revertido. No muestra Cuenta del registrante, motivo interno, grants o candidatos. En ningún
caso atribuye al sujeto una declaración, confirmación o fecha que no realizó.

## 15. Privacidad y consulta propia

- Owner ve sólo economía del Grupo cuyo ownership se revalida en cada request/página.
- El registrante delegado ve sólo búsqueda presentable, obligaciones de la Membresía elegida,
  candidatos necesarios y outcomes propios definidos en §4.3; la capacidad no habilita economía
  general ni historia Owner.
- El sujeto deriva Persona y Membresías desde Cuenta; conocer IDs no autoriza.
- Un sujeto no ve avisos o economía de terceros, datos de Cuenta del Owner, notas administrativas ni
  candidatos usados por la administración.
- La consulta propia distingue **Registrado por la administración** de **Entrega informada por vos**
  y muestra sólo datos necesarios para comprender saldo e historia, conforme a D06=A.
- Si un delegado también revisa avisos, cada reader y comando exige su capability específica; una
  respuesta E3-04 no revela bandeja ni historia E3-03 ajena al conjunto candidato focal.
- En archivo se conserva consulta propia económica sin restaurar navegación deportiva.
- Cursores quedan ligados a actor, scope, filtros, orden y tamaño, y cada página reautoriza.

## 16. Pruebas propuestas y UAT futura

No se ejecutan ni autorizan en esta definición.

### 16.1 Dominio y contratos

1. Una recepción produce N aplicaciones correlacionadas, no N recepciones.
2. Pago conserva la única composición de saldo/estado; la identidad administrativa no duplica
   ingresos.
3. Líneas únicas, contexto exacto, total derivado y límite aprobado.
4. Procedencia administrativa nunca serializa declaración del integrante.
5. `FULL` exige importe igual al saldo esperado; stale no sustituye silenciosamente saldo/importe.
6. Reversión completa conserva aplicaciones y restaura composición o no cambia nada.
7. Inputs cerrados y errores privados.

### 16.2 Autorización y privacidad

8. Owner vigente registra/consulta sin Persona propia y concede/revoca sólo la capacidad E3-04.
9. Delegado vigente registra en Grupo activo; grant revocado, slot/ancla divergente o
   `ownershipRevision` distinta fallan en el commit.
10. `GROUP_TREASURY`, `GROUP_PAYMENT_NOTICE_REVIEW`, cargo, rol global e IDs no autorizan ni se
    convierten; acumular capacidades requiere grants independientes.
11. Delegado sólo lee sujetos/obligaciones/candidatos mínimos y outcomes propios; no economía ni
    historia general.
12. Exintegrante y sujeto ven sólo economía propia minimizada con origen administrativo.
13. Cambio de Owner y archivo invalidan operaciones concurrentes según el orden de commit.
14. Firestore cliente no ofrece vía paralela.

### 16.3 Avisos, idempotencia y concurrencia

15. Misma key/payload recupera; misma key/payload distinto conflictúa.
16. Key distinta no evita la identificación humana de una misma entrega real.
17. Se devuelven 0..20 candidatos completos; 21 produce exceso sin página parcial ni registro.
18. Falta de decisión o `UNDETERMINED` bloquea; coincidencias no se resuelven automáticamente.
19. Aviso correcto retorna `NOTICE_CONFIRMATION_REQUIRED`; con revisión se confirma por E3-03 y sin
    ella se deriva a Owner/revisor, sin permiso implícito.
20. Aviso vinculado y registro administrativo se resuelven como conjunto o quedan intactos.
21. `correctedFields` coincide exactamente con diferencias reales de fecha/mapa; etiqueta falsa o
    diferencia omitida falla.
22. Reportar después del preview cambia guard; registro detecta revisión stale y no escribe.
23. Confirmar/rechazar después del preview cambia guard; registro exige revisión humana nueva.
24. Guard ausente con más de 20 pendientes se inicializa sin enumerarlos; confirmar/rechazar E3-03
    continúa reduciendo el conjunto.
25. Registro gana carrera contra confirmación y el segundo comando relee guard, saldo y relación.
26. Confirmación gana carrera y el registro falla stale sin identidad económica huérfana.
27. Dos recepciones distintas que caben pueden aplicarse sólo con decisiones explícitas compatibles.
28. Recovery detecta divergencia estructural pero conserva importes/outcome originales aunque
    guard o revisión económica actuales hayan avanzado legítimamente.

### 16.4 Historia compatible

29. Streams v1 informado y v2 administrativo incluyen todos sus documentos con campos físicos.
30. Merge con timestamps iguales mantiene orden total por ID.
31. Páginas donde sólo un stream emite conservan el ancla del otro; prefetch no emitido reaparece sin
    omisión ni duplicado.
32. Cursor no puede reutilizarse con otro actor, contrato, filtro o tamaño.
33. Contratos E3-03 preservan identidad, orden y campos/semántica de los estados existentes; la
    resolución administrativa agrega de forma versionada sólo el estado y bloque opcional nuevos,
    y los readers nuevos componen ambos orígenes sin reclasificar historia.

### 16.5 Lifecycle y prearchivo

34. Temporada cerrada y Membresía finalizada permiten obligaciones existentes íntegras.
35. Renovación no mezcla Membresías.
36. Todas las líneas prearchivo válidas permiten operar sólo a Owner.
37. Una línea no prearchivo bloquea todo.
38. Registro, reversión y consulta no escriben economía, guard o autorización en Grupo, Temporada,
    Membresía o Períodos.

### 16.6 UAT propuesta

- **UAT-01:** Owner registra una recepción total de una obligación y ve saldo saldado.
- **UAT-02:** Owner distribuye una recepción entre dos obligaciones y ve estados canónicos.
- **UAT-03:** delegado con grant E3-04 registra para una Membresía ajena en Grupo activo y sólo ve el
  mínimo necesario.
- **UAT-04:** UI presenta aviso posiblemente relacionado y exige decisión explícita sin afirmar
  duplicado.
- **UAT-05:** la resolución aprobada de “misma entrega” deja un solo efecto económico y trazabilidad
  visible.
- **UAT-06:** un aviso correcto dirige a confirmar por E3-03; delegado sin capability de revisión no
  puede confirmarlo ni resolverlo mediante E3-04.
- **UAT-07:** aviso nuevo o decidido entre preview y commit invalida toda la revisión sin recepción
  parcial.
- **UAT-08:** 21 candidatos bloquean sin truncar; después de resolver avisos por E3-03 se revisa de
  nuevo el conjunto completo.
- **UAT-09:** revocación, cambio de Owner y registro respetan ambos órdenes de commit.
- **UAT-10:** reversión completa aclara “corrige el registro; no devuelve dinero”.
- **UAT-11:** sujeto ve origen administrativo propio sin falsa autoría ni datos internos.
- **UAT-12:** Grupo archivado permite sólo Owner y Pagos prearchivo.
- **UAT-13:** Tesorería/revisión/cargo sin grant E3-04 no encuentran ni ejecutan registro directo.
- **UAT-14:** actor con ambas capacidades conserva rutas y decisiones separadas.

Auth/UAT permanece aislada. Una UAT humana futura no autoriza integración Auth real, Firebase
remoto, producción o deploy.

## 17. Criterios de entrada satisfechos y aceptación futura

La formalización local satisface los criterios documentales para dejar la ficha **Lista para
implementar con autorización separada**:

1. E3-04-D01–D06 y E3-04-R01–R04 están aprobadas y formalizadas mediante revisión e integración del
   paquete mínimo de §19.
2. Se distingue sin ambigüedad Entrega informada de registro administrativo.
3. Pago conserva autoridad económica y la evolución de aplicaciones es compatible con E3-03.
4. La política de avisos pendientes y carreras produce un único efecto cuando se identifica la
   misma entrega real, sin heurística automática.
5. Actor, delegación, scope, prearchivo, privacidad, consulta propia y reversión tienen resultados
   observables.
6. Unidad de consistencia, máximo de avisos y presupuesto están aprobados sin generalizar D02 de
   E3-03.
7. Contratos, persistencia mínima, errores, recovery, frontend, pruebas propuestas y UAT quedan
   definidos.
8. El checkpoint de esta definición está identificado; rollback de código y recuperación de datos
   se concretarán al autorizar implementación.
9. D5-043–D5-045, gate económico legacy y aislamiento Auth/UAT continúan preservados.

Para una implementación futura, la aceptación exigirá código/Rules/frontend compatibles, pruebas
proporcionales aprobadas, evidencia UAT autorizada y verificación ejecutable de tamaño, presupuesto,
índices y concurrencia. No exige para este corte local auditoría de rendimiento, matrices de
estabilidad, contención sostenida ni Auth/UAT real. Nada de ello fue ejecutado en esta definición.

## 18. Decisiones aprobadas y reglas residuales

### 18.1 Decisiones aprobadas el 2026-10-14

| ID | Decisión adoptada | Consecuencia en esta ficha |
| --- | --- | --- |
| E3-04-D01 | **B:** generalización explícita y compatible de la raíz Recepción con orígenes `INFORMED | ADMINISTRATIVE`. | Una sola raíz conceptual, autoría/lifecycle diferenciados y compatibilidad E3-03 sin falsa declaración. |
| E3-04-D02 | **A:** 1..20 obligaciones del mismo contexto, todo-o-nada. | Unidad multi-Pago propia de E3-04; no generaliza D02 E3-03. |
| E3-04-D03 | **B:** aviso terminal `RESOLVED_BY_ADMINISTRATIVE_RECEIPT`, preservando declaración y vínculo, sin otro ingreso. | Resolver y aplicar ocurre en una transacción; el aviso resuelto no crea aplicación. |
| E3-04-D04 | **A:** identificación explícita por candidato; `UNDETERMINED` impide registrar. | Conjunto completo, sin heurística, omisión ni fragmentación. |
| E3-04-D05 | **B:** Owner más delegación explícita de registro directo en este incremento. | Capacidad independiente, grants/slots/lifecycle propios; **D05=A no está adoptada**. |
| E3-04-D06 | **A:** consulta propia con origen administrativo y datos mínimos. | Evento visible al sujeto sin actor interno, notas ni falsa autoría. |

### 18.2 Reglas funcionales aprobadas el 2026-10-14

#### E3-04-R01 — Motivos que habilitan resolución administrativa

La resolución exige `correctedFields`, conjunto no vacío compuesto sólo por:

- `AMOUNT_OR_ALLOCATION`;
- `RECEIVED_DATE`.

Puede contener ambos valores. No existe un motivo genérico: no aporta un caso distinto necesario
con condiciones cerradas.

Un aviso correcto/aplicable siempre se confirma por E3-03; carecer de capability de revisión,
preferir el flujo directo o encontrar un stale transitorio no habilita resolución administrativa.
Las dimensiones se muestran al sujeto con texto presentable; una nota administrativa opcional no se
expone.

#### E3-04-R02 — Autorreferencia, reversión y archivo del delegado

El delegado no registra contra ninguna Membresía de su propia Persona;
reversión permanece Owner-only; en Grupo archivado sólo Owner opera y sólo sobre obligaciones
prearchivo. El backend deriva Persona y compara todas las líneas, sin confiar en IDs cliente. Esto
evita autorregistro, delegar una corrección destructiva y revivir grants en archivo.

#### E3-04-R03 — Máximo de avisos candidatos

Máximo 20 avisos relacionados, independiente del límite de obligaciones; consulta
21 para detectar exceso, nunca devuelve una página parcial, y exige reducir el conjunto mediante
E3-03 antes de reiniciar la revisión. Presupuesto máximo del registro: 63 escrituras, más lecturas de
autorización y hasta 21 avisos. La medición ejecutable del presupuesto pertenece a implementación.

#### E3-04-R04 — Historia del registrante delegado

Sin listado histórico general. El delegado recupera por
`administrativeReceiptId` sólo outcomes de comandos propios mientras conserva autorización vigente;
la respuesta incluye resultado y datos mínimos del registro, no otros actores, totales de Grupo ni
acciones de reversión. Owner conserva historia general y el sujeto su historia propia D06=A.

## 19. Paquete normativo mínimo adoptado

Se adoptaron mediante D5-049:

- [DEC-E3-04](./DEC-E3-04-registro-administrativo-pago.md);
- [addendum consolidado a Documentos 1/1.5/2/3/4](../../arquitectura/Documento-1-1.5-2-3-4-addendum-E3-04-registro-administrativo-pago.md).

Antes de autorizar implementación se requiere, como mínimo:

1. DEC-E3-04 registra D01–D06/R01–R04 y la capacidad independiente;
2. D5-049 incorpora continuidad E3-04 y resuelve D5-043 sólo para esa capacidad fija;
3. el addendum norma la unión, lifecycle, autoridad, contratos, guard, concurrencia, delegación,
   historia, prearchivo y privacidad;
4. D5-044, D5-045 y el gate económico legacy permanecen sin cambios.

El addendum E3-04 evoluciona expresamente E3-03 por D01/D03, preservando toda declaración,
aplicación, identidad, contrato previo y reversión existente; no lo reescribe silenciosamente. El
addendum prearchivo continúa vigente y E3-04 no admite delegado en archivo.

## 20. Preservaciones y checkpoint de salida

- Pago sigue siendo autoridad económica por obligación.
- Entrega informada, su declaración, lifecycle, contratos y evidencia E3-03 permanecen intactos
  hasta una decisión normativa explícita.
- Cargo continúa descriptivo y sin permisos.
- `GROUP_TREASURY` continúa read-only y `GROUP_PAYMENT_NOTICE_REVIEW` no registra recepciones.
- D5-043, D5-044 y D5-045 no cambian.
- El gate de retiro económico legacy de Etapa 3 permanece pendiente.
- Auth/UAT continúa aislada.
- No se declara cierre de E3-04 ni de Etapa 3.

**Resultado de esta definición:**

`E3-04 LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`
