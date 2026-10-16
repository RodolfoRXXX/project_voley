# DEC-E3-05 — Anulación de obligación creada indebidamente sin ingresos

## Estado

- **Decisión funcional:** `E3-05-D01–D08=A`, aprobada expresamente por el usuario.
- **Estado documental:** `APROBADA — FORMALIZACIÓN NORMATIVA LOCAL NO VERSIONADA`.
- **Estado del incremento:**
  `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Fecha de preparación:** 2026-10-16.
- **Base:** `dev` en `782e7019d84b1bcf8b2b77b7145976774d15ce84`.
- **Ficha asociada:**
  [E3-05](./E3-05-ficha-anulacion-obligacion-sin-ingresos.md).
- **Addendum asociado:**
  [Documentos 2/3/4 — E3-05](../../arquitectura/Documento-2-3-4-addendum-E3-05-anulacion-obligacion-sin-ingresos.md).
- **Identificador de continuidad en Documento 5:** `D5-050`.

Esta DEC adopta E3-05-D01–D08=A y el addendum E3-05 como normativa complementaria local. D5-050
incorpora su continuidad en Documento 5. La formalización no autoriza implementación, índices,
pruebas, datos, versionado o deploy.

## 1. Contexto

E3-01 creó obligaciones independientes por Membresía con identidad económica determinista,
snapshots inmutables y consultas privadas. E3-03/E3-04 incorporaron Recepciones informadas y
administrativas, aplicaciones subordinadas a Pago, saldo/estado/revisión económica y reversión
completa Owner-only. La reversión corrige un registro de ingreso erróneo: conserva Recepción,
aplicaciones e historia; no cambia el principal, no condona y no devuelve dinero.

Permanece un caso distinto: una obligación fue creada aunque nunca debió existir. Hoy no puede
retirarse de la deuda sin borrar o alterar indebidamente la raíz. La decisión debe preservar la
identidad que impide recrear la misma cuota/ocurrencia y no debe absorber corrección del exigible,
condonación o tratamiento de dinero recibido.

## 2. Decisiones aprobadas

### E3-05-D01=A — Corte exclusivo

E3-05 incorpora únicamente anulación de una obligación creada indebidamente. No incorpora
corrección de importe exigible, condonación total/parcial ni obligaciones con historia de
aplicaciones.

Consecuencia: anulación afirma que la obligación no debió existir. No debe utilizarse para evitar
definir o ejecutar una corrección del importe de una obligación válida.

### E3-05-D02=A — Ninguna aplicación histórica

Sólo puede anularse una obligación que jamás haya tenido una aplicación económica. Deben cumplirse
simultáneamente:

- ingreso bruto, revertido y neto iguales a cero;
- saldo vigente igual al principal antes de anular;
- ausencia total de documentos subordinados de aplicación.

Una aplicación `REVERSED` también bloquea. Neto cero no equivale a ausencia de ingreso histórico.

### E3-05-D03=A — Lifecycle, estado y saldo

Pago conserva principal y snapshots originales. La anulación agrega lifecycle terminal `VOIDED`,
estado económico visible `VOIDED`, componente no monetario igual al principal y saldo exigible cero.

La ecuación queda:

`balanceMinor = amountMinor - netConfirmedIncomeMinor - voidedAmountMinor`

En una anulada, `netConfirmedIncomeMinor = 0` y `voidedAmountMinor = amountMinor`. El componente de
anulación no es ingreso, condonación, crédito ni devolución.

### E3-05-D04=A — Aviso pendiente bloqueante

Una Entrega `REPORTED` que contenga el `paymentId` bloquea la anulación. E3-05 no confirma, rechaza
ni resuelve la Entrega automáticamente.

La comprobación es completa por Membresía y estado `REPORTED`; no hereda el máximo de 20 candidatos
del preview E3-04. Un fallo o lectura incompleta bloquea cerrado y no prueba ausencia.

### E3-05-D05=A — Motivo categorizado y explicación

La anulación exige una categoría cerrada:

- `DUPLICATE`;
- `WRONG_MEMBERSHIP`;
- `WRONG_CONCEPT_OR_PERIOD`;
- `NOT_OWED`;
- `OTHER`.

También exige explicación normalizada NFC de 1–240 code points y hasta 480 bytes, sin controles ni
marcas bidi. Owner accede a categoría, explicación, actor y fecha. El sujeto recibe categoría/fecha
con texto administrativo mínimo; Tesorería no recibe categoría, actor ni explicación interna.

### E3-05-D06=A — Owner exclusivamente

Sólo el Owner vigente del Grupo puede anular. No autorizan:

- `GROUP_TREASURY`;
- `GROUP_PAYMENT_NOTICE_REVIEW`;
- `GROUP_DIRECT_PAYMENT_RECORD`;
- cargo descriptivo, rol global, IDs conocidos o pertenencia.

No se crea capability ni grant nuevos. Una delegación futura requerirá decisión independiente.

### E3-05-D07=A — Grupo archivado

El Owner vigente puede anular en Grupo archivado únicamente un Pago prearchivo íntegro conforme al
addendum vigente. No se crean obligaciones, no se reabre Grupo/Temporada/Membresía y ningún grant
revive. Membresía finalizada, exintegrante y Temporada cerrada no impiden anular esta deuda
indebida.

### E3-05-D08=A — Historia por audiencia

- Owner: lista y detalle histórico de anuladas del Grupo, con motivo completo y actor presentable.
- Sujeto: lista y detalle de obligaciones propias anuladas, sin actor ni explicación interna.
- Tesorería: lectura económica mínima de anuladas del Grupo, con estado y fecha, sin acción,
  categoría, actor ni explicación.
- Otros delegados: no adquieren historia general por analogía.

La historia se descubre con filtro `Abiertas | Anuladas` dentro de Deudas/Mis obligaciones y reutiliza
el detalle actual. No se crea sección permanente paralela. Una anulación no fabrica Recepción ni
aparece como ingreso en Historial de pagos.

## 3. Transición e invariantes adoptadas

Transición única:

`ACTIVE + PENDING + sin aplicaciones + sin aviso REPORTED relacionado -> VOIDED`

Invariantes:

1. Pago sigue siendo la única autoridad económica.
2. `paymentId`, clave de negocio, principal, snapshot, discriminador, vencimiento, referencias,
   creación y generación original permanecen.
3. La anulación es terminal; no hay desanulación en E3-05.
4. No existe transición desde `PARTIAL`, `SETTLED` o saldo restaurado mediante reversión.
5. `economicRevision` aumenta una vez; retry/recovery no agrega efectos.
6. Grupo, Temporada, Membresía, Persona, Períodos, conceptos, ocurrencias y Recepciones no cambian.
7. La raíz `payments/{paymentId}` continúa ocupando su clave económica indefinidamente.
8. Generar otra vez la misma cuota/ocurrencia nunca crea una obligación nueva.

## 4. Contrato e idempotencia adoptados para el borrador

Comando de diseño:

```text
voidPaymentObligation({
  groupId,
  paymentId,
  expectedEconomicRevision,
  reasonCode,
  explanation,
  idempotencyKey
})
```

Resultados: `VOIDED | EXISTING`. Errores mínimos: no autorizado/no accesible privado, no anulable,
aviso pendiente, stale, no prearchivo, conflicto idempotente, recovery pendiente y estado
incompatible.

Scope idempotente: actor + Grupo + operación + key y hash canónico del comando. Igual key/payload
recupera el mismo efecto; igual key/payload distinto conflictúa; otra key no repite la transición.
Receipt técnico y raíz deben reconciliarse antes de responder éxito.

El cliente no aporta Persona, Membresía, Temporada, principal, saldo, lifecycle, prearchivo, actor ni
timestamps. La revisión esperada sólo detecta stale.

No existe en la implementación vigente un contrato de detalle propio de obligación. Los contratos
`getMyPaymentDelivery` y `getMyPaymentReceipt` abren Recepciones y no representan una anulación. El
diseño incorpora el mínimo `getMyPaymentObligationDetail({ paymentId })`: deriva Persona desde la
Cuenta, exige que coincida con `payment.personId` y valida la Membresía histórica sin exigir estado
activo, por lo que admite exintegrantes. Devuelve principal, concepto snapshot, período/ocurrencia,
vencimiento, contexto presentable de Grupo/Temporada, saldo, estado, categoría y fecha; para
`VOIDED`, el saldo es cero. Omite actor, explicación, Persona ajena, aplicaciones, avisos y datos
técnicos. Acepta schemas v1/v2/v3 y responde errores privados `PERSON_REQUIRED`,
`PAYMENT_NOT_ACCESSIBLE`, `INCOMPATIBLE_STATE` o `VALIDATION_FAILED` sin filtrar existencia ajena.

## 5. Concurrencia e identidad

La transacción reautoriza Owner, relee Grupo/Pago, valida prearchivo si corresponde, comprueba
economía y ausencia de aplicaciones, consulta todos los avisos pendientes relacionados, actualiza
Pago y guard, y crea receipt.

La consulta focal de avisos es:

```text
membershipId == payment.membershipId
decisionState == "REPORTED"
orderBy __name__ ASC
sin limit
```

Se inspeccionan todas las líneas. El guard `paymentReceiptCandidateGuards` se lee y escribe para
serializar contra reportar/confirmar/rechazar/resolver. Pago serializa contra confirmar, registrar y
revertir Recepciones. No se acepta lectura truncada.

Índice previsto no ejecutable: `membershipId + decisionState + __name__`. No se define máximo
funcional ni se afirma un peor caso finito demostrado.

Bajo futura autorización de implementación, la comprobación ejecutable inicial debe realizarse en
Emulator local, con datos sintéticos y volúmenes explícitos crecientes. Debe medir documentos y
lecturas, tamaño de datos/respuesta y write set cuando sean observables, y duración de
query/transacción. Debe separar completitud/corrección —hallazgo del `paymentId` al inicio, medio y
final, y ausencia sólo tras leer todo— del rendimiento observado; una medición favorable no prueba
un máximo global. Lectura incompleta, timeout o agotamiento de presupuesto bloquean cerrado.

Si resulta inviable, se detiene esa parte y se presenta la decisión arquitectónica necesaria. Una
proyección invertida por `paymentId` requeriría resolver compatibilidad v1/v2, inicialización,
reparación y todos los writers E3-03/E3-04; no se adopta implícitamente ni se introduce un límite
funcional. Esta tarea documental no autoriza ejecutar la comprobación.

La generación conserva intents y outcomes terminales. Una nueva intención que encuentra `VOIDED`
termina `FAILED/OBLIGATION_VOIDED`. Recovery de la intención creadora puede reconocer la creación
original y mostrar el lifecycle posterior, pero nunca recrea ni reescribe el outcome histórico.

## 6. Evolución compatible

- Pago v1 se lee `ACTIVE`, sin ingresos, anulación cero, saldo igual al principal, revisión 1.
- Pago v2 se lee `ACTIVE`, anulación cero y economía existente intacta.
- Pago v3 admite forma activa compatible o forma `VOIDED` completa.
- Campos parciales o ecuaciones inválidas fallan cerrados; no hay reparación en lectura.
- Readers de deuda/resumen excluyen `VOIDED` físicamente.
- Readers históricos autorizados filtran `VOIDED`, ordenan por `voidedAt DESC, paymentId DESC` y
  usan cursor opaco ligado a audiencia/scope/filtros.
- Readers E3-03/E3-04 rechazan `VOIDED` como línea nueva con error funcional, sin volverla estado
  incompatible ni alterar historia previa.

Índices históricos previstos, todavía no ejecutables:

- `payments(groupId, estado, voidedAt DESC, __name__ DESC)`;
- `payments(personId, estado, voidedAt DESC, __name__ DESC)`.

## 7. Alcance residual explícito

Incrementos posteriores separados deberán decidir:

1. corrección del principal exigible de una obligación válida, incluidos aumentos/disminuciones y
   relación con ingresos existentes;
2. condonación total o parcial, composición del saldo y autorización;
3. tratamiento, si alguna vez se admite, de una obligación indebida con aplicaciones aplicadas o
   revertidas;
4. devolución real de dinero, todavía fuera del alcance aprobado.

E3-05 no reutiliza reversión para esos fines y no introduce intereses, créditos, cobros automáticos,
pasarela o Caja.

## 8. Registro integrado en Documento 5

### 8.1 Continuidad incorporada en §7.5

> Anulación de obligación sin ingresos adoptada por **D5-050**:
> E3-05 permite sólo al Owner vigente anular una obligación creada indebidamente que nunca tuvo
> aplicaciones económicas y no posee un aviso `REPORTED` relacionado. Pago conserva identidad,
> principal, snapshots, generación y outcomes históricos; registra lifecycle `VOIDED`, efecto no
> monetario y saldo exigible cero. La raíz anulada no libera la clave económica ni permite regenerar
> la misma obligación. Grupo archivado admite sólo Pago prearchivo. Owner/sujeto conservan historia y
> Tesorería lectura mínima, sin ampliar capacidades. Corrección del exigible, condonación,
> obligaciones con aplicaciones y devolución real quedan fuera y requieren decisiones posteriores.

### 8.2 Decisión registrada

| ID | Decisión normativa | Estado | Momento | Consecuencia |
| --- | --- | --- | --- | --- |
| D5-050 | E3-05 adopta D01–D08=A y el addendum E3-05 a Documentos 2/3/4 para anulación Owner-only de obligación indebida sin aplicaciones | APROBADA | Etapa 3 / E3-05 | Preserva identidad y saldo explicable; no habilita corrección, condonación, devolución, permisos adicionales ni cierre de Etapa 3; implementación requiere autorización separada |

Documento 5 incorpora esta continuidad, la referencia normativa y el alcance residual sin modificar
otras decisiones.

## 9. Integración normativa y primer gate ejecutable

La formalización local integra conjuntamente:

1. esta DEC;
2. el addendum E3-05 a Documentos 2/3/4;
3. la ficha E3-05 actualizada;
4. coherencia de nombres físicos y ecuaciones;
5. D5-050, comprobado como siguiente identificador disponible en el registro vigente.

La integración documental no autoriza implementación. La query completa de avisos requiere una
comprobación ejecutable inicial únicamente bajo futura autorización de implementación, con Emulator
local, datos sintéticos y volumen explícito. Un resultado inviable detiene esa parte y exige la
decisión arquitectónica indicada, sin rebajar completitud ni adoptar un límite de 20.

## 10. Preservaciones

- D5-044 y sus superficies/condiciones no cambian.
- D5-045 continúa como riesgo residual aceptado, no resuelto.
- Auth/UAT real permanece separado de pruebas sintéticas.
- El retiro de autoridad económica legacy permanece gate de salida de Etapa 3.
- No se reabre E2-14.
- No se crea Agregado Anulación, Movimiento autónomo ni otra fuente económica.
- No se declara E3-05 lista para implementar, no se cierra Etapa 3 y no se autorizan incrementos
  posteriores.

## Resultado

`DEC-E3-05 APROBADA — E3-05 LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`
