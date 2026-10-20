# Addendum a Documentos 2, 3 y 4 — E3-07 / condonación y reversión de condonación

## Estado

- **Naturaleza:** fuente normativa complementaria adoptada para E3-07.
- **Decisiones incorporadas:** `E3-07-D01–D06=A`, `D07=B`, `D08–D11=A`.
- **Aprobaciones complementarias:** R01 y R02=A.
- **Decisión asociada:** DEC-E3-07 / `D5-052`.
- **Estado:** `ADOPTADO`.
- **Base:** `dev` en `ed51bbee7b69d4d8694fbd88a5b92c83fb9a4053`.
- **Paquete:** [ficha E3-07](../implementacion/etapa-3/E3-07-ficha-condonacion-deuda-valida.md) y
  [DEC-E3-07](../implementacion/etapa-3/DEC-E3-07-condonacion-deuda-valida.md).

Este documento complementa prospectivamente los Documentos 2, 3 y 4 dentro del alcance E3-07. Sus
decisiones funcionales y contratos mínimos quedan adoptados; schemas, nombres físicos, queries e
índices conservan los gates ejecutables declarados. La adopción no autoriza implementación.

## 1. Complemento funcional para Documento 2

### 1.1 Finalidad y vocabulario

Condonación es la decisión posterior del acreedor de no exigir un importe de deuda válida. Puede
ser parcial o total respecto del saldo confirmado. No es:

- corrección de un principal originalmente erróneo;
- anulación de una obligación que no debía existir;
- reversión de una Recepción o ingreso mal registrado;
- devolución real, crédito o saldo a favor;
- descuento prospectivo sobre concepto, ocurrencia o tarifa.

Reversión de condonación es la compensación completa de un hecho individual registrado por error.
Conserva el original, no toca dinero/principal y no reescribe historia.

### 1.2 Alcance funcional cerrado

E3-07 incluye:

1. condonación individual `PARTIAL | TOTAL` de Pago `ACTIVE` con saldo positivo;
2. importe explícito, fijo y en minor units;
3. hechos sucesivos con nueva revisión/intención;
4. reversión Owner-only completa, única e individual;
5. motivo, historia, privacidad, consultas y frontend en el mismo incremento;
6. compatibilidad con ingreso, reversión de ingreso, corrección y anulación existentes;
7. exintegrante, Temporada cerrada y liquidación de Pago prearchivo.

### 1.3 Actor y autorización

Sólo el Owner vigente puede condonar o revertir condonación. El backend revalida Cuenta, ownership,
Grupo, Pago, referencias y, si corresponde, prearchivo. No autorizan:

- `GROUP_TREASURY`;
- `GROUP_PAYMENT_NOTICE_REVIEW`;
- `GROUP_DIRECT_PAYMENT_RECORD`;
- cargo, rol global, Membresía, Persona propia o conocimiento de IDs.

No se crea capability ni grant. Cliente nunca aporta actor, timestamps, saldo, principal, ingreso,
importe de reversión o estado como autoridad.

### 1.4 Lifecycle contextual

Membresía finalizada, exintegrante y Temporada cerrada no bloquean ninguna operación sobre la
obligación existente. No se reejecuta elegibilidad de generación y no se mutan Persona, Membresía,
Temporada o Períodos.

En Grupo archivado:

- sólo Owner vigente opera;
- Pago debe acreditar forma prearchivo íntegra según el addendum vigente;
- no reviven grants, roster, navegación o actividad deportiva;
- condonar o revertir no crea conceptos, ocurrencias u obligaciones;
- una carrera con archivo relee el Grupo y falla cerrada si no acredita la excepción.

### 1.5 Condonación — flujo principal

1. Owner abre el detalle existente.
2. Backend devuelve principal vigente, ingreso neto, condonación vigente, saldo, estado, revisión y
   primera página histórica autorizada.
3. Owner elige `PARTIAL | TOTAL`, importe, categoría y explicación interna.
4. UI muestra saldo proyectado sin ser autoridad.
5. Backend reautoriza y relee toda la economía/contexto.
6. Comprueba completamente avisos `REPORTED` relacionados; cualquiera bloquea.
7. Valida importe positivo y `<= saldo`; `TOTAL` exige igualdad con saldo/revisión esperados.
8. Confirma raíz, hecho, guard y receipt atómicamente.
9. Devuelve outcome/composición y frontend refresca desde backend.

### 1.6 Reversión de condonación — flujo principal

1. Owner elige un hecho no revertido desde su historia.
2. UI muestra importe completo, efecto proyectado y advertencias.
3. Owner selecciona motivo interno y explica.
4. Backend reautoriza, carga Pago/hecho, valida correlación, revisiones y no reversión previa.
5. Comprueba completamente avisos `REPORTED` relacionados; cualquiera bloquea y una lectura
   incompleta falla cerrada.
6. Agrega evidencia compensatoria completa, actualiza raíz/revisiones/guard y receipt en un commit.
7. Devuelve outcome original recuperable y composición actual separada.

El cliente no elige importe de reversión. Una reversión es todo el importe del hecho objetivo.

### 1.7 Flujos alternativos y errores

| Condición | Resultado funcional | Reintento |
| --- | --- | --- |
| No autenticado/no Owner/no accesible | Rechazo privado sin datos. | Tras corregir contexto. |
| `VOIDED` o saldo cero al condonar | Estado incompatible, sin efecto. | No con misma intención. |
| Importe cero, exceso o `TOTAL` desigual | Validación fallida. | Sí, nueva intención/key si cambia payload. |
| Revisión/saldo/cabeza stale | Recarga obligatoria, sin sustitución automática. | Sí, tras revisar con intención nueva cuando cambie payload. |
| Aviso `REPORTED` al condonar | Bloqueo y enlace a revisión; no decide aviso. | Tras resolver aviso. |
| Aviso `REPORTED` al revertir | Bloqueo y enlace a revisión; no decide aviso. | Tras resolver aviso. |
| Hecho inexistente/ajeno | No accesible, sin filtrar existencia. | No. |
| Hecho ya revertido | Recovery si misma intención; error estable si otra. | Sólo recovery de la original. |
| Contexto archivado no prearchivo | Rechazo cerrado. | No hasta corregir integridad por proceso autorizado. |
| Persistencia/respuesta incierta | `PENDING_RECOVERY`; conserva key/intención. | Recovery idempotente. |
| Evidencia incoherente | `INCOMPATIBLE_STATE`. | No reparación silenciosa. |

### 1.8 Reversión posterior de ingreso

Una reversión E3-03/E3-04:

- conserva todo hecho y reversión de condonación;
- reduce sólo ingreso neto;
- aumenta saldo por el importe de ingreso revertido;
- puede llevar `SETTLED -> PARTIAL`;
- no amplía automáticamente una condonación `TOTAL` histórica;
- no crea otra condonación ni exige revertirla.

La UI explica que reaparece deuda por reversión del ingreso, no por desaparición del perdón.

### 1.9 Corrección posterior

La corrección E3-06 usa principal base vigente y debe exigir:

```text
newPrincipalMinor >= netConfirmedIncomeMinor + currentWaivedAmountMinor
```

No reduce ni redistribuye hechos. Si el nuevo principal deseado queda debajo del piso, el Owner debe
revertir primero hechos individuales completos y luego emitir otra intención de corrección.

### 1.10 Anulación posterior

Cualquier historia E3-07 bloquea E3-05, incluso con condonación vigente cero después de reversiones.
Condonar declaró válida la deuda; no puede reinterpretarse después como obligación inexistente. No
se borra historia, no se libera clave y no hay transición a `VOIDED`.

### 1.11 Motivos y privacidad — R01 aprobada

D09=A y R01 aprueban estructura cerrada, etiquetas y nota interna obligatoria:

| Condonación | Etiqueta al sujeto |
| --- | --- |
| `FINANCIAL_ASSISTANCE` | Apoyo económico |
| `ORGANIZATIONAL_WAIVER` | Decisión de la organización |
| `EXCEPTIONAL_WAIVER` | Situación excepcional |

| Reversión interna | Uso permitido |
| --- | --- |
| `WAIVER_DUPLICATE_ENTRY` | Hecho duplicado. |
| `WAIVER_WRONG_AMOUNT` | Importe erróneo; se revierte completo. |
| `WAIVER_WRONG_PAYMENT` | Obligación objetivo errónea. |
| `WAIVER_NOT_AUTHORIZED_AS_RECORDED` | Hecho no autorizado tal como fue registrado. |

No existe `OTHER`. La reversión se presenta al sujeto como **Condonación revertida**, sin categoría
interna. La explicación interna es obligatoria, NFC, de 1–240 code points y hasta 480 bytes UTF-8,
sin controles C0/C1 ni marcas bidi.

`WAIVER_NOT_AUTHORIZED_AS_RECORDED` documenta un error del hecho registrado. No introduce
aprobadores, permisos, roles, grants ni un circuito organizativo nuevo.

### 1.12 Audiencias

- **Owner:** historia completa, actor, categorías internas/públicas, explicación, revisiones.
- **Sujeto/exintegrante:** sólo obligación propia; importe, etiqueta pública, fecha y efecto; sin
  actor, nota ni motivos internos de reversión.
- **Tesorería:** principal, ingreso neto, condonación vigente, saldo, estado y última fecha; sin
  acción, historia completa o explicación.
- **Revisor/registrante:** únicamente datos ya requeridos por sus flujos; no adquieren historia.
- **Otros:** ninguna exposición; IDs conocidos no conceden acceso.

### 1.13 Exclusiones funcionales

No incluye lote, automatización, porcentaje, reversión parcial, edición/borrado, devolución,
crédito, saldo a favor, intereses, recargos, pasarela, permisos nuevos, Caja, contabilidad,
restablecimiento/reemplazo, retiro legacy o rediseño deportivo.

## 2. Complemento de dominio para Documento 3

### 2.1 Frontera y autoridad

Pago continúa como único Aggregate Root económico. Posee:

- principal original/base/exigible;
- ingresos bruto/revertido/neto y aplicaciones;
- condonación bruta/revertida/vigente;
- saldo, estado, lifecycle y `economicRevision`;
- historia subordinada E3-07.

Un hecho de condonación y su compensación no son Agregados, Recepciones ni Movimientos monetarios.
Receipt, guard, cursor e índice son mecanismos técnicos.

### 2.2 Composición `ACTIVE`

```text
principalOriginalMinor = importe de generación inmutable
principalBaseMinor = última corrección o principalOriginalMinor
voidedAmountMinor = 0
principalExigibleMinor = principalBaseMinor
confirmedIncomeMinor = suma de aplicaciones confirmadas
reversedIncomeMinor = suma de aplicaciones revertidas
netConfirmedIncomeMinor = confirmedIncomeMinor - reversedIncomeMinor
grossWaivedAmountMinor = suma de WAIVER_CREATED
reversedWaivedAmountMinor = suma de creaciones con WAIVER_REVERSED único
currentWaivedAmountMinor = grossWaivedAmountMinor - reversedWaivedAmountMinor
balanceMinor = principalExigibleMinor
             - netConfirmedIncomeMinor
             - currentWaivedAmountMinor
```

### 2.3 Composición `VOIDED`

D11 exige ausencia de cualquier historia E3-07:

```text
grossWaivedAmountMinor = 0
reversedWaivedAmountMinor = 0
currentWaivedAmountMinor = 0
netConfirmedIncomeMinor = 0
voidedAmountMinor = principalBaseMinor
principalExigibleMinor = 0
balanceMinor = 0
```

Una raíz con historia E3-07 y lifecycle `VOIDED` es incompatible, aun si los totales vigentes son
cero.

### 2.4 Estados

```text
settledComponentMinor = netConfirmedIncomeMinor + currentWaivedAmountMinor

PENDING = ACTIVE && balanceMinor > 0 && settledComponentMinor == 0
PARTIAL = ACTIVE && balanceMinor > 0 && settledComponentMinor > 0
SETTLED = ACTIVE && balanceMinor == 0
VOIDED = lifecycle terminal según E3-05 y sin historia E3-07
```

Los estados expresan posición, no causa. Los componentes explican cuánto proviene de dinero y
cuánto de remisión.

### 2.5 Invariantes

1. `0 <= reversedWaived <= grossWaived`.
2. Cada creación es positiva, no excede saldo y avanza una revisión.
3. Cada reversión compensa exactamente una creación, una sola vez, y avanza una revisión.
4. `netIncome + currentWaived <= principalBase` y `balance >= 0`.
5. `TOTAL` equivale al saldo de la revisión confirmada, no a saldos futuros.
6. Principal original/snapshot/identidad/generación/outcomes no cambian.
7. Aplicaciones, Recepciones y hechos anteriores permanecen inmutables.
8. Historia, total raíz, cabeza, conteo y revisiones reconcilian.
9. Cualquier historia E3-07 impide anulación.
10. Condonación nunca se suma a ingresos o flujo de Caja monetaria.

### 2.6 Identidad e historia

Cada creación posee `waiverId` estable. La reversión posee `reversalId` y referencia única al
`waiverId`; no reemplaza la creación. Orden canónico por `waiverHistoryRevision` monotónica y ID.

La raíz mantiene proyección actual para lecturas; la historia acredita cambios. No se reproduce
event sourcing en cada consulta. Incoherencia falla cerrada.

### 2.7 Transiciones

```text
ACTIVE + saldo positivo + revisión esperada + sin aviso bloqueante
+ condonación válida
-> ACTIVE + WAIVER_CREATED + totales/saldo/estado/revisiones actualizados
```

```text
ACTIVE + creación no revertida + revisiones esperadas
+ sin aviso REPORTED relacionado y comprobación completa
-> ACTIVE + WAIVER_REVERSED + total revertido/saldo/estado/revisiones actualizados
```

No se transiciona a otro lifecycle. Toda reversión efectiva cumple:

```text
balanceAfterMinor = balanceBeforeMinor + reversedWaiverAmountMinor
reversedWaiverAmountMinor > 0
```

Por ello nunca mantiene `SETTLED`. Si partía de `SETTLED`, pasa a `PENDING` cuando ingreso neto más
condonación vigente restantes son cero, o a `PARTIAL` cuando conservan un componente positivo. Si
partía de `PARTIAL`, permanece `PARTIAL` con mayor saldo.

## 3. Complemento técnico para Documento 4

### 3.1 Servicios públicos

- `waivePaymentDebt` — comando Owner-only individual;
- `reversePaymentWaiver` — comando Owner-only individual y completo;
- `listPaymentWaiverHistory` — consulta paginada por Pago/audiencia;
- evolución compatible de detalle, deudas, obligaciones propias, resumen y Tesorería.

No hay servicio de Caja, preview remoto nuevo ni consulta global de condonaciones.

### 3.2 DTO de creación

```text
input {
  groupId: string,
  paymentId: string,
  mode: "PARTIAL" | "TOTAL",
  amountMinor: integer,
  expectedBalanceMinor: integer,
  expectedEconomicRevision: integer,
  reasonCode: "FINANCIAL_ASSISTANCE" | "ORGANIZATIONAL_WAIVER" | "EXCEPTIONAL_WAIVER",
  internalExplanation: string,
  idempotencyKey: string
}
```

Salida terminal:

```text
{
  outcome: "WAIVED" | "EXISTING",
  waiverId,
  amountMinor,
  mode,
  grossWaivedAmountMinor,
  reversedWaivedAmountMinor,
  currentWaivedAmountMinor,
  netConfirmedIncomeMinor,
  balanceMinor,
  estado,
  economicRevision,
  waiverHistoryRevision
}
```

`PENDING_RECOVERY` no finge resultado terminal y conserva instrucciones/key.

### 3.3 DTO de reversión

```text
input {
  groupId: string,
  paymentId: string,
  waiverId: string,
  expectedEconomicRevision: integer,
  expectedWaiverHistoryRevision: integer,
  reasonCode: "WAIVER_DUPLICATE_ENTRY" | "WAIVER_WRONG_AMOUNT" |
              "WAIVER_WRONG_PAYMENT" | "WAIVER_NOT_AUTHORIZED_AS_RECORDED",
  internalExplanation: string,
  idempotencyKey: string
}
```

El backend deriva importe completo. La salida terminal refleja `REVERSED | EXISTING`,
`reversalId`, `waiverId`, importe, totales y revisiones originales/actuales diferenciadas.

### 3.4 Errores contractuales mínimos

- `UNAUTHENTICATED` / `ACCOUNT_REQUIRED`;
- `GROUP_NOT_ACCESSIBLE` / `PAYMENT_NOT_ACCESSIBLE`;
- `OWNER_REQUIRED`;
- `PAYMENT_VOIDED` / `PAYMENT_HAS_NO_BALANCE`;
- `WAIVER_AMOUNT_INVALID` / `WAIVER_EXCEEDS_BALANCE` / `WAIVER_TOTAL_MISMATCH`;
- `PAYMENT_PENDING_NOTICE` para condonación y reversión;
- `PAYMENT_ECONOMY_STALE` / `WAIVER_HISTORY_STALE`;
- `WAIVER_NOT_ACCESSIBLE` / `WAIVER_ALREADY_REVERSED`;
- `PAYMENT_NOT_PREARCHIVE`;
- `IDEMPOTENCY_CONFLICT` / `PENDING_RECOVERY`;
- `CONCURRENT_MODIFICATION` / `INCOMPATIBLE_STATE` / `DEPENDENCY_UNAVAILABLE`.

Errores privados no filtran existencia, pertenencia, actor o contexto.

### 3.5 Schema compatible de Pago

Formas v1–v4 hidratan:

```text
grossWaivedAmountMinor = 0
reversedWaivedAmountMinor = 0
currentWaivedAmountMinor = 0
waiverEventCount = 0
waiverHistoryRevision = 0
```

La primera operación E3-07 promueve a una forma posterior completa. Campos candidatos en raíz:

```text
grossWaivedAmountMinor
reversedWaivedAmountMinor
currentWaivedAmountMinor
waiverEventCount
waiverHistoryRevision
latestWaiverEventId
latestWaiverEventAt
```

Los nombres/versiones finales se revisan antes de implementar. No hay backfill ni escritura de
ceros sobre formas antiguas. Presencia parcial, total redundante inconsistente o secuencia rota
falla cerrada.

### 3.6 Schema de historia subordinada

Ruta candidata: `payments/{paymentId}/waiverEvents/{eventId}`.

Creación candidata:

```text
{
  kind: "WAIVER_CREATED",
  waiverId,
  amountMinor,
  mode,
  publicReasonCode,
  internalExplanation,
  actorAccountId,
  occurredAt,
  economicRevisionBefore,
  economicRevisionAfter,
  waiverHistoryRevision,
  commandReceiptRef
}
```

Reversión candidata:

```text
{
  kind: "WAIVER_REVERSED",
  reversalId,
  waiverId,
  amountMinor,
  internalReasonCode,
  internalExplanation,
  actorAccountId,
  occurredAt,
  economicRevisionBefore,
  economicRevisionAfter,
  waiverHistoryRevision,
  commandReceiptRef
}
```

Actor/receipt permanecen privados y no se copian a DTOs no autorizados. La unicidad de reversión
debe ser comprobable por identidad determinista o registro correlacionado transaccional, no por una
query no serializada.

### 3.7 Receipts

Receipts deny-all separados por comando contienen:

- scope actor/Grupo/Pago/operación;
- hash de key y request canónico;
- outcome terminal o estado de recuperación;
- IDs de hecho/reversión;
- importes y revisiones originales;
- evidencia mínima para reconciliar raíz e historia.

Key cruda, email, Persona y notas no se duplican. Mismo key/payload recupera; mismo key/payload
distinto conflictúa.

### 3.8 Repositorios y adaptadores

| Componente | Contrato | Límite |
| --- | --- | --- |
| Repositorio Económico de Pago | cargar/persistir raíz e invariantes | Único acceso modificador a Pago. |
| Repositorio de historia E3-07 | agregar/listar/reconciliar hechos | Subordinado a Pago; no Agregado. |
| Repositorio de receipts | comenzar/confirmar/recuperar intención | Privado y por operación. |
| Repositorio de guard | coordinar avisos/economía | Sin saldo ni autorización. |
| Adaptador de Grupo | ownership, lifecycle, prearchivo | No muta Grupo. |
| Consultas económicas | DTOs Owner/propio/Tesorería | No exponen documentos o raíces. |

No existe repositorio genérico, de Caja ni de Condonación independiente.

### 3.9 Unidad de consistencia

Condonar:

1. lee receipt/Pago;
2. reautoriza Cuenta/Owner/Grupo y acredita prearchivo;
3. valida schema, lifecycle, principal, componentes, saldo y revisión;
4. lee guard y consulta completa de avisos `REPORTED`;
5. valida modalidad/importe/motivo;
6. crea hecho, actualiza raíz/guard y confirma receipt en un commit.

Revertir:

1. lee receipt/Pago/hecho objetivo/evidencia de reversión;
2. reautoriza y acredita contexto/prearchivo;
3. valida schema, correlación, no reversión previa y revisiones;
4. lee guard y consulta completa de avisos `REPORTED`; cualquiera o una lectura incompleta bloquea;
5. crea compensación, actualiza raíz/guard y confirma receipt en un commit.

No modifica otras raíces. Pago serializa frente a ingreso/reversión/corrección/anulación; guard
serializa frente a avisos/registro.

### 3.10 Evolución obligatoria de writers

- generación interpreta/inicializa condonación cero;
- informar toma saldo/revisión actuales sin reservarlos;
- confirmar/registrar limita aplicaciones al saldo neto de condonación;
- reversión de ingreso conserva condonación y rederiva;
- anulación rechaza cualquier historia E3-07;
- corrección usa piso ingreso neto + condonación vigente;
- condonación/reversión escriben raíz, historia, guard y receipt;
- todos los readers/resúmenes separan dinero de remisión.

Ningún writer recompone el total leyendo toda la historia como operación ordinaria ni repara
silenciosamente incompatibilidades.

### 3.11 Concurrencia y stale

Se deben probar órdenes reales:

- ingreso ↔ condonación/reversión;
- reversión de ingreso ↔ condonación/reversión;
- corrección ↔ condonación/reversión;
- aviso ↔ condonación y aviso ↔ reversión, con bloqueo completo en ambos comandos;
- dos condonaciones;
- dos reversiones del mismo hecho y de hechos distintos;
- anulación ↔ primer hecho E3-07;
- archivo ↔ cada comando.

Toda operación usa `expectedEconomicRevision`; reversión agrega
`expectedWaiverHistoryRevision`. Un retry de Firestore relee y revalida. UI no sustituye valores
stale ni reutiliza una key cuando cambia la intención.

### 3.12 Idempotencia y recovery

- keys 16–128 caracteres; cruda no persistida;
- request hash de creación incluye actor/scope, operación, Pago, importe, modalidad, saldo,
  revisiones, `reasonCode` e `internalExplanation` normalizada;
- request hash de reversión incluye actor/scope, operación, Pago, hecho, revisiones, `reasonCode` e
  `internalExplanation` normalizada;
- misma key con explicación distinta después de normalizar, o con cualquier otro campo distinto,
  produce `IDEMPOTENCY_CONFLICT`;
- pérdida de respuesta produce recovery explícito;
- receipt + hecho + raíz deben reconciliar para devolver `EXISTING`;
- operaciones posteriores no invalidan el outcome histórico;
- recovery conserva y devuelve contenido/outcome originales y composición actual etiquetada por
  separado; no exige que saldo, estado o revisiones históricas del comando continúen vigentes;
- ausencia de receipt con hecho aparente no atribuye autoría/intención;
- evidencia parcial o incoherente es `INCOMPATIBLE_STATE`.

### 3.13 Avisos y guard

Condonar y revertir consultan el conjunto completo de avisos `REPORTED` relacionados. No usan
máximo de preview para afirmar ausencia. Error, truncamiento o dependencia incierta bloquean
cerrados. Ningún comando confirma, rechaza, resuelve o edita el aviso. El guard conserva sólo una
revisión/digest de coordinación y todos los writers pertinentes deben evolucionarlo de manera
compatible.

### 3.14 Consultas, paginación y cursores

Historia E3-07 se ordena por `waiverHistoryRevision DESC, eventId DESC`, con default 20 y
`pageSize` 1–50. Detalle y continuación comparten DTO/audiencia.

Cursor opaco liga:

- versión de contrato;
- actor/audiencia/Pago;
- orden, tamaño y ancla;
- conteo y cabeza observados.

Cada página reautoriza. Si entre páginas aparece creación o reversión, conteo/cabeza avanzan y el
cursor anterior devuelve `CONCURRENT_MODIFICATION`; tras recargar se recorre el snapshot nuevo.
Ingreso/corrección sin evento E3-07 no invalida la secuencia, aunque el DTO separa composición
actual. Regresión o combinación imposible devuelve `INCOMPATIBLE_STATE`.

Queries/índices previstos:

| Consulta | Campos/orden candidato | Gate |
| --- | --- | --- |
| Historia por Pago | parent + revisión desc + ID desc | Validar índice real antes de implementar. |
| Hecho objetivo | path determinista por `waiverId` | Preferido para transacción/unicidad. |
| Deudas/resumen existentes | filtros actuales + estado/orden | Ajustar DTO/proyección; medir planes reales. |

No se declara índice innecesario ni se agrega configuración mediante este addendum.

### 3.15 Privacidad y Rules

Cliente no accede directamente a Pago, eventos, receipts o guard. Backend minimiza por audiencia.
Rules deny-all existentes deben extenderse/probarse para cualquier nueva ruta. ActorAccountId,
nota, códigos internos, hashes, paths y receipt IDs permanecen privados. Acceso histórico propio no
concede operación.

### 3.16 Frontend

- reutiliza Economía, Deudas, Mis obligaciones, resumen y detalle;
- acción **Condonar deuda** Owner-only visible con saldo positivo;
- historia discreta **Condonaciones** dentro del detalle;
- acción **Revertir condonación** sólo para hecho no revertido y Owner;
- modales separados muestran composición, efecto, motivo y advertencias;
- `TOTAL` explicita saldo/revisión observados;
- errores se muestran dentro del modal activo con `role="alert"`, foco y datos conservados;
- aviso enlaza a Pagos informados sin decidirlo; el error permanece dentro del modal activo con
  datos conservados y bloquea reenvío hasta recargar/revalidar;
- stale obliga a recargar/revisar; recovery incierto conserva key y bloquea doble envío;
- éxito refresca desde backend, sin actualización económica optimista;
- sujeto sólo ve etiquetas públicas y **Condonación revertida**;
- teclado, devolución de foco, escape deliberado y responsive siguen patrones existentes;
- no crea ruta, sección global, pantalla de Caja ni mezcla hechos con Historia de pagos/Recepciones.

### 3.17 Caja y modelos de lectura

Condonación no es flujo monetario. Un modelo futuro limitado a entradas/salidas de dinero puede
excluirla explícitamente y no queda bloqueado por E3-07. Un balance de deuda, cobrabilidad,
obligaciones saldadas o composición debe consumir `currentWaivedAmountMinor` y distinguirlo de
ingreso. Ninguna proyección se convierte en autoridad.

## 4. Pruebas focales futuras

No se ejecutan ni se consideran satisfechas mediante esta adopción documental.

### 4.1 Dominio y contratos

1. parcial/total/sucesivas; límites cero/exceso/igualdad;
2. estados con combinaciones de ingreso/condonación;
3. bruto/revertido/vigente y saldo exactos;
4. reversión completa/única cumple `saldoPosterior = saldoAnterior + importeRevertido`; desde
   `SETTLED` deriva `PENDING` o `PARTIAL` según componentes restantes; parcial, doble, edición y
   borrado rechazados;
5. catálogos exactos, ausencia de `OTHER`, etiquetas, privacidad y límites R01;
6. objetos cerrados, minor units y protección contra datos cliente.

### 4.2 Interacciones económicas

7. reversión de ingreso conserva condonación y puede reabrir;
8. corrección posterior respeta piso; anterior cambia saldo elegible;
9. cualquier historia bloquea anulación, aun revertida;
10. ingresos posteriores nunca superan saldo ni cuentan condonación como dinero;
11. ninguna operación crea devolución/crédito/Caja.

### 4.3 Persistencia y compatibilidad

12. v1–v4 hidratan ceros sin backfill;
13. promoción completa y rechazo de formas parciales;
14. raíz/historia/receipt/cabeza/conteo reconcilian;
15. identidad determinista impide segunda reversión;
16. generación/outcomes/snapshots/aplicaciones/Recepciones inmutables.

### 4.4 Autorización, lifecycle y avisos

17. Owner permitido; delegados/otros denegados sin filtración;
18. exintegrante/Temporada cerrada; archivo sólo Owner/prearchivo;
19. aviso bloquea condonación con conjuntos >20 y posiciones inicial/media/final;
20. aviso bloquea también la reversión; fallo/truncamiento bloquea cerrado;
21. carreras reales con aviso/guard y archivo.

### 4.5 Concurrencia, idempotencia y recovery

22. todos los órdenes §3.11;
23. misma key/payload, conflicto, pérdida de respuesta y ausencia de receipt;
24. recovery tras ingresos, reversión, corrección y nuevos hechos;
25. evidencia parcial nunca produce éxito;
26. cursores: 20+continuación, límites 1/50, inserción entre páginas, recarga sin omisiones.

### 4.6 Consultas, privacidad, frontend y arquitectura

27. DTO Owner/propio/Tesorería y denegaciones;
28. nota/actor/código interno nunca llegan al sujeto;
29. modales, foco, anuncio, conservación, stale y recovery incierto;
30. resúmenes separan ingreso y condonación;
31. Pago único Agregado; ausencia de repositorio/consulta global/Caja paralela;
32. regresión E3-01–E3-06 y preservación D5-044/D5-045/Auth/gate legacy.

Evidencia automatizada debe identificar suites, cantidades, tiempos y límites sin extrapolar a
producción. Abortos inyectados no sustituyen operaciones realmente solapadas.

## 5. UAT futura

1. Owner condona parcialmente y ve saldo/composición exactos.
2. Owner condona totalmente y ve `SETTLED` sin ingreso ficticio.
3. Owner agrega un segundo hecho con nueva revisión.
4. Owner revierte uno completo, ve saldo exacto y estado `PENDING | PARTIAL` según los componentes
   restantes, y no puede revertirlo otra vez.
5. Reversión de ingreso posterior reabre deuda conservando condonación.
6. Corrección inferior al piso bloquea; una válida conserva historia.
7. Cualquier historia impide anulación, incluso con vigente cero.
8. Aviso bloquea ambos comandos dentro del modal activo, conserva datos y exige recargar/revalidar.
9. Sujeto/exintegrante ve etiqueta pública/efecto sin actor/nota; Tesorería composición mínima.
10. Grupo archivado sólo Owner/Pago prearchivo, sin actividad deportiva.
11. Stale y error aparecen dentro del modal con foco/datos; recovery incierto impide doble envío.
12. Historia pagina, invalida cursor ante nuevo evento y recarga sin omisiones.

UAT valida comprensión, presentación y accesibilidad; no demuestra invariantes, atomicidad,
privacidad negativa o recovery. Auth real y Firebase remoto requieren autorización separada.

## 6. Criterios de aceptación normativa y técnica

### 6.1 Integración normativa satisfecha

1. coherencia revisada con Documentos 2/3/4 y addenda E3-01–E3-06;
2. DEC-E3-07 adoptada con D5-052;
3. ficha marcada `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`;
4. continuidad/referencias y D5-052 integradas en Documento 5.

La comprobación ejecutable completa de avisos, schemas/compatibilidad, writers/readers, índices,
concurrencia, stale, idempotencia, recovery, mediciones, pruebas y UAT permanecen pendientes; no
son evidencia producida por la revisión normativa.

### 6.2 Para una implementación futura

1. Pago conserva autoridad única y ecuación exacta.
2. Creación/reversión son append-only, completas e idempotentes.
3. Toda reversión efectiva aumenta saldo por el importe positivo y nunca conserva `SETTLED`.
4. Todos los writers afectados usan nueva composición.
5. D05/D06/D11 se preservan en ingreso/corrección/anulación.
6. Avisos bloquean ambos comandos mediante comprobación completa y nunca se deciden lateralmente.
7. Contexto, prearchivo y privacidad se revalidan.
8. Compatibilidad no requiere backfill o doble escritura.
9. Cursores/concurrencia/stale/recovery tienen evidencia focal.
10. UI existente cumple accesibilidad y feedback.
11. Evidencia técnica y UAT están separadas y trazables.
12. Rollback no borra hechos persistidos.
13. Exclusiones y gates permanecen comprobables.

## 7. Rollback, preservaciones y no efectos

- El rollback documental previo a una implementación es revertir explícitamente la integración de
  esta decisión, su ficha, DEC y continuidad de Documento 5, sin reescribir historia Git.
- Después de una implementación futura, retirar UI/writers no permite borrar datos; readers,
  ecuación y compatibilidad deben permanecer mientras existan hechos.
- Una condonación o reversión real no se deshace con rollback de código.
- D5-044 mantiene superficies/destinos/condiciones; no se adelanta.
- D5-045 permanece aceptado y no resuelto.
- Auth/UAT real sigue aislada.
- Gate económico legacy continúa pendiente.
- No se reabre E2-14.
- No se crea Agregado, fuente económica, Caja o Movimiento monetario.
- No se implementa devolución, crédito, saldo a favor, interés, recargo, pasarela, permiso nuevo o
  restablecimiento/reemplazo de `VOIDED`.
- No se autoriza código, pruebas, suites, Emulator, configuración, Rules, índices ejecutables,
  dependencias, Firebase remoto o deploy.
- No se declara E3-07 listo, implementado, verificado o cerrado; tampoco Etapa 3.

## Resultado

**ADDENDUM E3-07 ADOPTADO — FUENTE NORMATIVA COMPLEMENTARIA DE DOCUMENTOS 2/3/4**

El addendum incorpora D01–D11, R01 y R02=A y la reversión mínima D07=B sin crear otra autoridad.
Los gates ejecutables permanecen pendientes y la implementación requiere autorización separada. No
se declara implementado, verificado o cerrado E3-07 ni Etapa 3.
