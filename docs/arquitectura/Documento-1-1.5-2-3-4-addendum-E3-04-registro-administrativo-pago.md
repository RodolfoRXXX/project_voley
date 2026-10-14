# Addendum a Documentos 1, 1.5, 2, 3 y 4 — E3-04 / recepción administrativa

## Estado

`ADDENDUM NORMATIVO ADOPTADO — E3-04 / D5-049 — IMPLEMENTACIÓN NO AUTORIZADA`

- **Fecha de preparación:** 2026-10-14.
- **Base:** `dev` en `27ea7b044e8e0d4e524b41d7dcc15a2125b7b1e4`.
- **Carácter:** fuente normativa complementaria adoptada para E3-04; complementa los Documentos 1,
  1.5, 2, 3 y 4 y evoluciona expresamente el addendum E3-03 sólo en lo aquí indicado.
- **Identificador de Documento 5:** `D5-049`.
- **Decisiones incorporadas:** E3-04-D01–D06 y E3-04-R01–R04, aprobadas por el usuario.
- **Ficha asociada:**
  [E3-04](../implementacion/etapa-3/E3-04-ficha-registro-administrativo-pago.md).
- **Decisión asociada:**
  [DEC-E3-04](../implementacion/etapa-3/DEC-E3-04-registro-administrativo-pago.md).
- **Normativa preservada:** addenda E3-01/E3-03, addendum prearchivo, D5-043–D5-049 y Documentos
  base salvo la evolución compatible adoptada expresamente en este documento.

Este documento formaliza el complemento normativo mínimo de E3-04 mediante D5-049. El addendum
E3-03 conserva autoridad para todo su alcance; este addendum lo evoluciona únicamente para la raíz
Recepción, el nuevo estado terminal, referencias tipadas, guard y readers compatibles aquí definidos.

## 1. Complemento de ubicación para Documento 1

### 1.1 Raíz Recepción y responsabilidad

Se propone generalizar de forma compatible el Agregado **Entrega informada** E3-03 a la raíz
conceptual **Recepción**, dentro del Dominio Deportivo y el área económica vinculada a Membresías.
La raíz admite una unión cerrada de orígenes:

- `INFORMED`: declaración humana del sujeto y decisión administrativa E3-03;
- `ADMINISTRATIVE`: recepción constatada y registrada directamente por Owner o registrante
  delegado, sin declaración previa atribuida al sujeto.

Recepción es dueña de identidad común, origen, contexto, líneas, total derivado, autoría propia de
cada origen, lifecycle y trazabilidad común. No posee deuda, saldo, neto, estado económico ni
`economicRevision`; cada Pago conserva esas autoridades y sus aplicaciones.

### 1.2 Colaboraciones y límites

- referencia Grupo, Temporada, Membresía, Persona sujeto y 1..20 Pagos existentes;
- no crea ni modifica esos recursos ni sus Períodos;
- coordina con Pago sólo en las operaciones multi-Pago expresamente aprobadas;
- un aviso resuelto administrativamente conserva su declaración y vínculo, pero no posee aplicación
  ni ingreso propios;
- el total de Recepción nunca se suma a los ingresos de Pago;
- el guard de candidatos es infraestructura técnica, no Agregado, reserva ni autorización;
- no se generalizan transacciones entre Agregados o módulos.

## 2. Complemento conceptual para Documento 1.5

### 2.1 Identidad y compatibilidad

`receiptId` identifica la raíz generalizada. Todo `deliveryId` E3-03 existente continúa siendo
identidad válida de una Recepción `INFORMED`; sus contratos públicos preservan el nombre
`deliveryId`. Una recepción administrativa expone `administrativeReceiptId`, que referencia el mismo
concepto de identidad sin fingir una Entrega informada.

No se exige backfill general. Los documentos E3-03 schema v1 se interpretan como `INFORMED` y las
aplicaciones/reversiones v1 con `deliveryId` se normalizan al leer como fuente informada.

### 2.2 Unión cerrada por origen

Campos comunes:

- identidad, `origin`, Grupo, Temporada, Membresía y Persona sujeto;
- 1..20 líneas inmutables con Pago único e importe exacto;
- total derivado, revisión de raíz y schema;
- eventual referencia de reversión común cuando existe efecto económico.

`INFORMED` posee exclusivamente:

- autor de declaración, `declaredPaidOn`, `reportedAt`;
- snapshots declarados E3-03;
- `decisionState: REPORTED | CONFIRMED | REJECTED | RESOLVED_BY_ADMINISTRATIVE_RECEIPT`;
- actor/timestamp de decisión y, si se resolvió administrativamente, vínculo inmutable a la raíz
  `ADMINISTRATIVE`;
- `applicationState: APPLIED | REVERSED` sólo cuando fue `CONFIRMED`.

`ADMINISTRATIVE` posee exclusivamente:

- `recordedByAccountId`, `recordedByKind: OWNER | DELEGATE`;
- `receivedOn`, `recordedAt`;
- importes/snapshots constatados por línea;
- `applicationState: APPLIED | REVERSED` desde su creación atómica;
- referencias a avisos resueltos y eventual reversión común.

No admite `reportedByAccountId`, una fase `REPORTED`, una confirmación del integrante ni campos que
sugieran declaración propia.

### 2.3 Lifecycle

```text
INFORMED:
REPORTED -> CONFIRMED + APPLIED -> CONFIRMED + REVERSED
REPORTED -> REJECTED
REPORTED -> RESOLVED_BY_ADMINISTRATIVE_RECEIPT -> asociado APPLIED | REVERSED

ADMINISTRATIVE:
creación + APPLIED -> REVERSED
```

El estado asociado mostrado por un aviso resuelto se lee de la recepción administrativa vinculada;
no constituye vigencia ni ingreso del aviso. Revertir el registro no reabre automáticamente el
aviso. Cualquier reapertura futura requeriría decisión propia.

### 2.4 Relaciones y unicidad

- una Recepción pertenece a un único Grupo/Temporada/Membresía/Persona;
- contiene 1..20 líneas y cada `paymentId` aparece una vez;
- una aplicación se identifica por fuente tipada + `receiptId + paymentId`;
- una Recepción con efecto admite una única reversión completa;
- un aviso `INFORMED` resuelto referencia una única recepción `ADMINISTRATIVE`;
- la recepción administrativa conserva 0..20 vínculos a avisos resueltos;
- idempotencia técnica no prueba que dos recepciones representen la misma entrega real.

## 3. Complemento funcional para Documento 2

### 3.1 Finalidad y recorrido

Owner o una Cuenta con `GROUP_DIRECT_PAYMENT_RECORD` registra una recepción constatada y distribuye
su importe entre obligaciones existentes de una Membresía exacta:

```text
sujeto -> obligaciones con saldo -> 1..20 líneas
-> preview atómico de Pagos + todos los avisos REPORTED de la Membresía
-> clasificación humana completa
-> registro ADMINISTRATIVE + aplicaciones + resoluciones + guard, todo o nada
```

El flujo no crea obligaciones, reparte automáticamente, reserva saldo, ajusta exigible, condona,
devuelve dinero, administra Caja o cobra por pasarela.

### 3.2 Scope

- 1..20 Pagos únicos del mismo `groupId`, `seasonId`, `membershipId` y `personId`;
- ARS en centavos enteros y total derivado;
- `FULL | PARTIAL` con importe exacto y snapshots de saldo/revisión: `FULL` exige
  `amountMinor == expectedBalanceMinor`; `PARTIAL`, `0 < amountMinor <= expectedBalanceMinor`;
- obligaciones existentes e íntegras; no se repite elegibilidad de generación;
- selección explícita y aplicación/reversión completas, sin saga ni paginación.

### 3.3 Actores

**Owner vigente**

- registra por ownership sin necesitar Persona propia;
- concede/revoca/lista `GROUP_DIRECT_PAYMENT_RECORD`;
- consulta historia general y es el único que revierte;
- en Grupo archivado es el único que opera, sólo sobre Pagos prearchivo.

**Registrante delegado**

- requiere grant individual, slot, Cuenta–Persona única, ancla vigente y Grupo activo;
- no registra contra ninguna Membresía de su propia Persona;
- busca sujetos, lee obligaciones/candidatos mínimos, registra y recupera outcomes propios por
  referencia conocida;
- no obtiene economía general, historia general, reversión ni autoridad E3-03 implícita.

**Sujeto**

- no inicia ni aparece como autor del registro;
- consulta su historia propia con origen administrativo y datos mínimos;
- no ve Cuenta del registrante, notas internas, grants o candidatos administrativos.

`GROUP_TREASURY`, `GROUP_PAYMENT_NOTICE_REVIEW`, cargo, rol global, IDs y grants anteriores no
autorizan ni se convierten.

### 3.4 Avisos relacionados y confirmación preferente

Candidato es todo aviso `REPORTED` de la misma Membresía, aunque no intersecte las obligaciones
seleccionadas. Esto sustituye expresamente el filtro preliminar por intersección: un desglose
equivocado puede representar la misma entrega real sin compartir el mapa correcto de Pagos. Se
devuelven todos, máximo 20. El actor clasifica cada uno como:

- `DISTINCT_REAL_RECEIPT`;
- `SAME_CONFIRMABLE_NOTICE`;
- `SAME_REQUIRES_ADMINISTRATIVE_RECORD`;
- `UNDETERMINED`.

Un aviso correcto y aplicable —misma entrega real, fecha, líneas e importes que deben aplicarse,
saldos suficientes y todavía `REPORTED`— se confirma exclusivamente mediante E3-03. E3-04 devuelve
`NOTICE_CONFIRMATION_REQUIRED` y no registra. Si el actor carece de
`GROUP_PAYMENT_NOTICE_REVIEW`, debe intervenir Owner o un revisor E3-03; no recibe permiso
implícito.

`SAME_REQUIRES_ADMINISTRATIVE_RECORD` sólo procede cuando la misma entrega real necesita corregir
importe/desglose y/o fecha. Exige `correctedFields`, conjunto no vacío de
`AMOUNT_OR_ALLOCATION | RECEIVED_DATE`. Backend compara `declaredPaidOn` contra `receivedOn` y el
mapa canónico `paymentId -> importe` del aviso contra el registro; `correctedFields` debe coincidir
exactamente con las diferencias reales derivadas. Una etiqueta sin diferencia o una diferencia no
declarada falla. No existe un motivo genérico. Falta de permiso, preferencia de interfaz y stale
transitorio no habilitan resolución.

`UNDETERMINED` o falta de una clasificación impide registrar. Los avisos distintos permanecen
`REPORTED`. Los que requieren corrección pasan como conjunto a
`RESOLVED_BY_ADMINISTRATIVE_RECEIPT`, conservan declaración y no crean aplicación propia.

### 3.5 Máximo y exceso

`MAX_RELATED_NOTICES = 20`, independiente de las obligaciones. La consulta solicita 21 para detectar
exceso. Con 21:

- no omite, trunca ni devuelve una página operable;
- responde `TOO_MANY_RELATED_NOTICES`;
- exige resolver avisos mediante E3-03 antes de iniciar un nuevo preview;
- no fragmenta una resolución administrativa.

### 3.6 Temporada cerrada, exintegrante y archivo

Temporada cerrada y Membresía finalizada permiten liquidar obligaciones existentes. Renovación no
mezcla raíces. Delegado sólo opera en Grupo activo. En Grupo archivado sólo Owner registra/revierte,
cada Pago acredita prearchivo y una línea incompatible bloquea todo. No reviven grants ni se
modifica actividad deportiva.

## 4. Complemento de dominio para Documento 3

### 4.1 Autoridades separadas

Recepción conserva identidad, origen, autoría/lifecycle propios, líneas, total y vínculos. Pago
conserva obligación, aplicaciones, ingreso bruto/revertido/neto, saldo, estado y
`economicRevision`. El guard conserva sólo coordinación técnica. Ninguno sustituye al otro.

Un aviso resuelto y su recepción administrativa pueden presentar la misma entrega real, pero el
efecto monetario existe una sola vez: en las aplicaciones con fuente `ADMINISTRATIVE`.

### 4.2 Invariantes

1. Unión `INFORMED | ADMINISTRATIVE` cerrada; campos incompatibles fallan.
2. 1..20 Pagos únicos del mismo contexto; total igual a suma de líneas.
3. `ADMINISTRATIVE` nace aplicado junto con todas sus aplicaciones o no existe.
4. Un aviso resuelto tiene cero aplicaciones propias y un único vínculo administrativo.
5. Aviso correcto se confirma por E3-03; E3-04 no lo duplica.
6. Todos los candidatos son clasificados; indeterminado/exceso/stale bloquean.
7. Saldo nunca negativo y Pago es la única autoridad económica.
8. Delegado nunca registra deuda de su Persona, revierte ni opera en archivo.
9. Reversión completa no reabre avisos.
10. Grupo, Temporada, Membresía, Persona, Períodos y autorización no reciben estado económico o de
    coordinación.

### 4.3 Unidad de consistencia

Registrar modifica en una transacción:

- una raíz `ADMINISTRATIVE`;
- `N` Pagos y `N` aplicaciones, `1<=N<=20`;
- `M` avisos resueltos, `0<=M<=20`;
- un command receipt y un guard.

Todo confirma o nada cambia. Los avisos clasificados distintos se releen pero no se escriben. La
excepción es exclusiva de E3-04 y no amplía E3-03 ni autoriza transacciones generales.

Revertir modifica raíz, N Pagos/aplicaciones, reversión común y receipt; no modifica avisos
vinculados ni guard de candidatos.

## 5. Complemento técnico para Documento 4

### 5.1 Capacidad y grants

`GROUP_DIRECT_PAYMENT_RECORD` es fija e independiente. Sólo Owner concede/revoca. Reutiliza patrón
E3-02/E3-03:

- múltiples grants individuales;
- slot por Grupo/capability/Cuenta;
- Cuenta–Persona única y Membresía de autorización activa;
- `validityAnchor`, `ownerIdAtGrant`, `ownershipRevisionAtGrant`;
- estados `ACTIVE | REVOKED`, receipts idempotentes y listado Owner;
- cambio de Owner, archivo, finalización, reactivación, renovación o retorno A→B→A no reviven grants;
- reautorización transaccional de Cuenta, Persona, ancla, slot, grant, Grupo y ownership revision.

### 5.2 Servicios públicos cerrados

**Lectura/preview**

- `searchDirectPaymentSubjects`;
- `listDirectPaymentObligations`;
- `previewAdministrativeReceipt`;
- `listOwnerAdministrativeReceipts` / `getOwnerAdministrativeReceipt`;
- `getMyDirectPaymentRecordOutcome` por referencia conocida y actor propio;
- `listMyPaymentReceipts` / `getMyPaymentReceipt`, compatibles con ambos orígenes.

**Comandos**

- `recordAdministrativeReceipt`;
- `reverseAdministrativeReceipt`, Owner-only;
- conceder/revocar `GROUP_DIRECT_PAYMENT_RECORD`.

Inputs cerrados; actor, Persona, contexto, total, estado, timestamps y capability se derivan.

### 5.3 DTOs

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
  correctedFields?: [AMOUNT_OR_ALLOCATION | RECEIVED_DATE]
}

recordAdministrativeReceipt = {
  groupId, membershipId, receivedOn,
  lines: AdministrativeReceiptLineInput[1..20],
  candidateRevision, candidateDigest,
  relatedNoticeDecisions[0..20],
  idempotencyKey
}
```

Preview retorna sujeto presentable, fecha, líneas/snapshots actuales, total, revisión/digest y
0..20 candidatos completos. El DTO administrativo retorna identidad, origen, contexto presentable,
fecha, líneas, total, `APPLIED | REVERSED`, vínculos administrativos para Owner y reversión. DTO
propio omite actor/vínculos internos. Outcome delegado mínimo contiene identidad, outcome, fechas,
total y vigencia, sólo para comando propio.

### 5.4 Errores

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

Los errores son privados y no confirman recursos ajenos.

### 5.5 Persistencia y schemas

Forma candidata:

- `paymentDeliveries/{receiptId}` para Recepción generalizada;
- schema v1 existente = `INFORMED` implícito, `receiptId=deliveryId`;
- schema v2 = unión cerrada descrita en §2.2;
- `payments/{paymentId}/deliveryApplications/{applicationId}` v1 se interpreta como fuente
  `INFORMED`; v2 usa `source: {kind, receiptId}`;
- reversión v1 conserva `deliveryId`; v2 usa fuente tipada;
- aviso resuelto guarda estado, `resolvedByAdministrativeReceiptId`, actor y timestamp;
- `paymentReceiptCandidateGuards/{opaque(groupId,membershipId)}` para coordinación;
- receipts de comandos E3-04 separados;
- grants/slots/receipts separados por capability.

No hay backfill general, reparación silenciosa, doble escritura económica ni duplicación de
ingreso. Readers normalizan formas admitidas y rechazan ambigüedad.

### 5.6 Repositorios

- Repositorio de Recepciones: hidrata v1/v2, persiste raíces y resuelve avisos;
- Repositorio Económico de Pagos: única mutación de Pago/aplicaciones;
- Repositorio de Guard: bootstrap/revisión por Membresía;
- Repositorio de Capacidad: grants/slots/receipts E3-04;
- Repositorio de Receipts administrativos: idempotencia/recovery.

La Unidad de Trabajo coordina estos repositorios sin transferir ownership económico.

### 5.7 Guard y concurrencia

El guard contiene contexto opaco, revisión técnica monótona, timestamps y schema; no contiene
snapshot, IDs, cantidad, saldo, autorización, decisiones o importes y no reserva.

Bootstrap lazy cuando falta:

- preview E3-04 reautoriza, lee Grupo/Membresía, consulta `REPORTED` con límite 21 y crea el guard en
  la misma transacción. Con 0..20, la ausencia del elemento 21 acredita conjunto completo; con 21
  sólo acredita exceso y no devuelve digest/lista parcial utilizable;
- reportar/confirmar/rechazar E3-03 crea/actualiza el guard junto con su cambio puntual sin enumerar
  pendientes y sin aplicar `MAX_RELATED_NOTICES`;
- `recordAdministrativeReceipt` exige guard/revisión provenientes de preview y lo incrementa al
  resolver avisos.

No hay backfill. Dos inicializadores compiten sobre el mismo documento y el perdedor reintenta. Los
comandos E3-03 continúan confirmando/rechazando por `deliveryId` aun con más de 20 pendientes, de
modo que pueden reducir el conjunto antes de otro preview. El máximo pertenece sólo a revisión y
registro E3-04; no limita creación, confirmación o rechazo E3-03.

Writers obligatorios del guard:

- `reportOwnPaymentDelivery` al añadir pendiente;
- `confirmPaymentDelivery` y `rejectPaymentDelivery` al retirarlo;
- `recordAdministrativeReceipt` al resolverlo;
- todo writer futuro que cambie pertenencia al conjunto, previa decisión propia.

Sólo una transición efectiva incrementa la revisión; retry/recovery terminal no la incrementa otra
vez.

Preview transaccional lee autorización, guard, candidatos completos y snapshots de todos los Pagos.
Commit repite y compara revisión, digest, IDs/revisiones/líneas, balances y revisiones económicas.
Invalidan el preview: alta/confirmación/rechazo/resolución/cambio de candidato, cambio de Pago,
autorización, ownership, lifecycle o integridad. Responde stale sin reinterpretación automática.
En `FULL`, preview y commit conservan el importe exacto igual al saldo esperado; si el saldo o la
revisión cambia, fallan sin sustituir silenciosamente `amountMinor`.

Revocación, cambio de Owner, archivo, reportar/confirmar/rechazar E3-03 y registrar E3-04 respetan el
primer commit mediante documentos comunes leídos/escritos en transacción.

### 5.8 Idempotencia y recovery

Keys de 16–128 caracteres; key cruda no persistida. El hash incluye actor, operación, scope, fecha,
líneas canónicas/snapshots, candidate revision/digest y todas las clasificaciones. Misma key/igual
intención recupera; misma key/distinta intención conflictúa.

Recovery reautoriza y valida evidencia original: receipt, request hash, raíz, importes, aplicaciones,
fuentes y vínculos. Devuelve resultado/importes originales. No exige igualdad actual del guard,
saldo o `economicRevision` histórica después de operaciones legítimas. Una vista económica actual,
si se incluye, se etiqueta separadamente. Persistencia parcial es `INCOMPATIBLE_STATE`, nunca éxito.

Sin receipt terminal, un retry con preview vencido devuelve stale y no inventa intención. El
delegado sólo recupera por identidad conocida un comando propio y con autorización vigente.

### 5.9 Presupuesto

Para `N<=20`, `M<=20`:

- registrar: `N` updates de Pago + `N` aplicaciones + raíz + `M` avisos + receipt + guard =
  `2N + M + 3`, máximo 63 escrituras;
- revertir: presupuesto E3-03 equivalente para N líneas más raíz/receipt/reversión, sin reabrir
  avisos ni escribir guard;
- preview: hasta 20 Pagos, 21 avisos para detectar exceso, guard y autorización/contexto;
- reportar E3-03: 3 escrituras con guard;
- confirmar E3-03: `2N + 3`, máximo 43;
- rechazar E3-03: 3 escrituras;
- reversión E3-03 no cambia candidatos y conserva su presupuesto.

Son presupuestos de diseño. Medición ejecutable de lecturas, escrituras, serialización, tamaño,
retries, latencia y contención queda para implementación; no se afirma rendimiento.

### 5.10 Queries, índices y cursores

- candidatos: `membershipId == X + decisionState == REPORTED + reportedAt ASC + __name__ ASC`,
  límite 21, sin cursor. Son campos físicos E3-03 v1 conservados por `INFORMED` v2;
- obligaciones focales: índices E3-01 por Grupo/Membresía, estado y orden;
- grants: patrones E3-02/E3-03 por Grupo/capability/actor/estado/fecha.

No se consulta historia v1 por `origin` o `occurredAt`: esos campos no existen y normalizar después
de una query que los filtró/ordenó no recuperaría documentos excluidos. La historia unificada hace
merge de streams físicos disjuntos:

**Owner económico**

- informado v1/v2: `groupId == X + decisionState == CONFIRMED`, filtros opcionales E3-03 por
  Membresía/vigencia/rango, orden `confirmedAt DESC + __name__ DESC`;
- administrativo v2: `groupId == X + origin == ADMINISTRATIVE`, filtros equivalentes, orden
  `recordedAt DESC + __name__ DESC`.

**Sujeto propio**

- informado v1/v2: `personId == P`, opcional Membresía, orden
  `reportedAt DESC + __name__ DESC`; el `orderBy` exige físicamente `reportedAt` y excluye las raíces
  administrativas que no poseen ese campo;
- administrativo v2: `personId == P + origin == ADMINISTRATIVE`, opcional Membresía, orden
  `recordedAt DESC + __name__ DESC`.

Backend normaliza cada resultado incluido y hace merge por `eventAt DESC, receiptId DESC`, donde
`eventAt` es el timestamp físico del stream. El cursor opaco compuesto guarda un ancla física
independiente `(timestamp, documentId)` por stream. Sólo avanza el ancla de elementos emitidos;
elementos prefetched pero no emitidos se releen. Cada página pide hasta `pageSize+1` por stream,
mezcla y emite hasta `pageSize`, evitando omisiones/duplicados sin offsets.

La garantía se refiere a un conjunto estable durante el recorrido. Altas posteriores anteriores a
las anclas se muestran al refrescar desde el inicio, no se insertan a mitad de paginación.

Páginas default 20, máximo 50. Cursor ligado a actor, contrato, scope, Persona derivada, filtros,
rango, orden y tamaño; cada página reautoriza ambos streams. Candidatos no se paginan. Contratos
E3-03 existentes conservan endpoint, query, cursor, orden, `deliveryId`, campos y semántica de sus
estados previos. Para avisos resueltos futuros, su DTO `INFORMED` evoluciona de forma aditiva y
versionada: admite `decisionState = RESOLVED_BY_ADMINISTRATIVE_RECEIPT` y un bloque opcional mínimo
de resolución/vínculo; ningún documento histórico cambia de estado o forma por esta adopción. Los
nuevos readers de Recepción realizan la composición entre orígenes. Índices físicos se validan al
implementar.

### 5.11 Privacidad y frontend

- Owner ve economía del Grupo e historia general;
- delegado ve sólo búsqueda presentable, obligaciones de una Membresía, candidatos necesarios y
  outcome propio conocido;
- sujeto ve origen, fecha, total, líneas y aplicado/revertido propios, sin actor interno;
- un aviso resuelto presenta declaración y estado asociado sin sumar dinero dos veces;
- Firestore cliente permanece deny-all.

UI separa **Registrar recepción** de **Revisar entregas**. Muestra desglose, total, origen y todos los
candidatos. `UNDETERMINED` bloquea. Aviso correcto ofrece abrir E3-03; sin capability explica que
debe intervenir Owner/revisor. Exceso bloquea. Stale invalida el resumen y exige nueva revisión.
Owner ve historia/reversión; delegado no ve listado general. Estados accesibles incluyen loading,
vacío, exceso, stale, recovery, pérdida de acceso y feedback con foco/`aria-live`.

## 6. Pruebas automatizadas propuestas

No se ejecutan por esta formalización. Una implementación futura deberá cubrir:

1. unión v1/v2, campos prohibidos por origen e identidades E3-03 preservadas;
2. 1/20/21 líneas, duplicados, scope, total y `FULL == expectedBalanceMinor`;
3. fuente tipada v2 y lectura de aplicaciones/reversiones v1 sin doble ingreso;
4. registro todo-o-nada con `N=1/20`, `M=0/20`; rechazo `N=21` o `M=21`;
5. aviso resuelto sin aplicaciones propias y estado asociado aplicado/revertido;
6. aviso correcto exige confirmación E3-03 con/sin capability;
7. correctedFields vacío/ajeno inválido, etiqueta sin diferencia, diferencia omitida y combinación
   exacta admitida;
8. `UNDETERMINED`, omisión, ID extra y digest/revisión divergentes;
9. bootstrap sin guard con avisos existentes, dos inicializadores y exceso sin enumeración total;
10. confirmar/rechazar E3-03 con más de 20 pendientes actualiza guard y reduce el conjunto sin límite
    E3-04;
11. reportar/confirmar/rechazar/resolver contra preview en ambos órdenes de commit;
12. cambio de saldo/revisión, grant, ownership o archivo después de preview sin sustitución de importe;
13. idempotencia y recovery después de operaciones legítimas que avanzaron guard/revisión económica;
14. recovery parcial/incoherente nunca éxito y resultado original conservado;
15. self-record delegado, revocación y grants independientes;
16. Owner-only reversal y archivo/prearchivo;
17. merge de historia v1/v2: empates, páginas dominadas por un stream, anchors independientes,
    ausencia de omisiones/duplicados y cursor ligado;
18. contratos E3-03 conservan queries, identidad, campos/estados previos y evolución DTO aditiva
    mientras readers nuevos componen;
19. readers Owner/delegado/sujeto y cursores privados;
20. Rules deny-all;
21. medición de presupuesto, tamaño, retries y contención en los máximos.

Las carreras son pruebas automatizadas transaccionales; no se exigen como recorridos manuales.

## 7. UAT humana propuesta

La UAT futura recorre sólo comportamientos observables:

1. Owner registra una recepción total y otra distribuida;
2. delegado autorizado registra para sujeto ajeno y sólo ve datos mínimos;
3. delegado no puede registrar para su Persona;
4. aviso correcto deriva a E3-03; sin revisión se explica la intervención requerida;
5. aviso con importe/desglose o fecha corregidos queda resuelto y no duplica ingreso;
6. indeterminado y exceso bloquean con explicación completa;
7. stale obliga a revisar nuevamente, sin efectos parciales;
8. sujeto distingue origen informado/administrativo y estado asociado;
9. Owner encuentra y revierte; aviso vinculado no se reabre;
10. delegado no posee historia general ni reversión;
11. Owner opera Pago prearchivo; delegado no opera en archivo;
12. cargo, Tesorería y revisión por separado no conceden registro directo.

UAT no incluye carreras manuales. Auth/UAT real permanece aislada; sólo una autorización futura
podrá definir entorno y evidencia.

## 8. Registro mínimo en Documento 5

D5-049 integra este addendum mediante:

1. continuidad E3-04 en §7.5;
2. fila D5-049 posterior a D5-048;
3. resolución acotada de D5-043 para `GROUP_DIRECT_PAYMENT_RECORD` como capacidad fija
   independiente;
4. preservación de D5-044, D5-045 y el gate económico legacy.

Texto incorporado en §7.5:

> E3-04 incorpora registro administrativo directo mediante la raíz Recepción generalizada con
> orígenes `INFORMED | ADMINISTRATIVE`. Owner o un registrante con capacidad independiente aplica
> una recepción a 1–20 Pagos del mismo contexto, todo-o-nada. Todos los avisos pendientes de la
> Membresía se revisan explícitamente, máximo 20; un aviso correcto se confirma por E3-03 y uno que
> requiere corregir importe/desglose o fecha puede resolverse mediante el registro administrativo,
> conservando declaración y vínculo sin ingreso propio. Pago conserva toda autoridad económica.
> Reversión y archivo permanecen Owner-only; delegado carece de historia general y de auto-registro.

Decisión registrada:

| ID | Decisión | Estado | Alcance | Consecuencia |
| --- | --- | --- | --- | --- |
| `D5-049` | E3-04 adopta Recepción `INFORMED | ADMINISTRATIVE`, registro multiobligación, coordinación explícita con avisos y `GROUP_DIRECT_PAYMENT_RECORD` | `APROBADA` | Etapa 3 / E3-04 | Ficha lista para implementar con autorización separada; D5-043 queda resuelta sólo para esta capacidad; D5-044, D5-045 y gate económico no cambian |

## 9. Límites

Este addendum no:

- autoriza código, Rules, índices, pruebas, Emulator, Firebase remoto o deploy;
- amplía `GROUP_TREASURY` o `GROUP_PAYMENT_NOTICE_REVIEW`;
- crea roles configurables o convierte grants/cargo;
- agrega Caja, pasarela, adjuntos, ajuste, condonación o devolución;
- retira economía legacy, resuelve D5-045 o adelanta D5-044;
- integra Auth/UAT real;
- declara E3-04 listo, implementado o cerrado, ni cierra Etapa 3.

## Resultado

`ADDENDUM NORMATIVO ADOPTADO — E3-04 / D5-049 — IMPLEMENTACIÓN NO AUTORIZADA`
