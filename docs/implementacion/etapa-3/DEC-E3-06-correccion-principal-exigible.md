# DEC-E3-06 — Corrección del principal exigible

## Estado

- **Tipo:** decisión normativa adoptada para E3-06.
- **Decisiones aprobadas:** `E3-06-D01–D11`, con `D01–D10=A` y catálogo/límites D11 aprobados.
- **Decisión de Documento 5:** `D5-051`.
- **Estado:** `APROBADA`.
- **Estado del incremento:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Implementación:** no ejecutada ni autorizada.
- **Base:** `dev` en `348bdf8d11aa8267866c086b979cc00cf5659165`, verificada el 19 de octubre
  de 2026 sin `fetch` ni cambio de rama.

Esta decisión adopta el corte y el addendum E3-06 a Documentos 2/3/4. Documento 5 incorpora la
continuidad mínima y D5-051. La adopción documental no autoriza implementación o versionado.

## 1. Contexto y corte

E3-01 estableció Pago como obligación y autoridad económica. E3-03/E3-04 incorporaron Recepciones,
aplicaciones, ingreso, saldo, revisión y reversión completa. E3-05 incorporó `VOIDED` exclusivamente
para una obligación indebida sin aplicaciones ni aviso pendiente y preservó como residuos separados
corrección, condonación y obligaciones con historia económica.

Se adopta para E3-06 un único corte vertical: **corrección individual del principal exigible de una
obligación válida**. No se combinan condonación, Caja, devolución, interés, crédito, pasarela,
restablecimiento/reemplazo de `VOIDED` ni retiro económico legacy.

## 2. Decisiones aprobadas

### E3-06-D01=A — Estados elegibles

La corrección alcanza Pago con lifecycle `ACTIVE` en estado `PENDING | PARTIAL | SETTLED`, con o sin
aplicaciones históricas. Aplicaciones `APPLIED` y `REVERSED` permanecen inmutables. `VOIDED` no es
elegible.

### E3-06-D02=A — Nuevo principal y límite

Se admite aumento o disminución. El nuevo principal:

- es positivo y usa ARS minor units enteras dentro de los límites monetarios vigentes;
- es igual o superior al ingreso neto confirmado;
- es distinto del principal base vigente.

El mismo importe no produce una corrección ni incrementa revisión. Un importe inferior al neto
falla sin crear crédito, saldo a favor, devolución o condonación.

### E3-06-D03=A — Evidencia original e historia

Principal original, concepto/snapshot, `paymentId`, clave de negocio, discriminador, referencias,
`generationIntentId`, payload y outcomes de generación permanecen inmutables. Pago agrega un
principal base vigente y hechos de corrección append-only correlacionados por revisión.

No se sobrescribe la evidencia original y no se crea una obligación reemplazante.

### E3-06-D04=A — Avisos y stale

Un aviso `REPORTED` relacionado bloquea la corrección y no es confirmado, rechazado o resuelto por
este comando. La comprobación es completa y falla cerrada ante lectura incompleta. Borradores con
saldo/revisión anteriores quedan stale; no se recalculan ni se corrigen silenciosamente.

### E3-06-D05=A — Reversión posterior de ingreso

La reversión E3-03/E3-04 conserva la corrección y reduce el ingreso neto por su flujo vigente. Saldo
y estado se rederivan contra el principal base vigente. Revertir una Recepción no revierte, edita o
borra una corrección.

### E3-06-D06=A — Correcciones sucesivas

Cada corrección posterior agrega un hecho nuevo. No existe edición o borrado de historia ni
reversión especial de corrección en este corte. Cada nuevo comando vuelve a validar revisión,
ingreso neto, aviso pendiente y autorización.

### E3-06-D07=A — Actor y contexto

Sólo el Owner vigente corrige. Exintegrante y Temporada cerrada no bloquean la corrección de una
obligación existente. En Grupo archivado sólo el Owner opera y sólo sobre Pago prearchivo íntegro,
conforme a las reglas aprobadas.

`GROUP_TREASURY`, `GROUP_PAYMENT_NOTICE_REVIEW`, `GROUP_DIRECT_PAYMENT_RECORD`, cargo, roles,
Membresía o conocimiento de IDs no autorizan por analogía.

### E3-06-D08=A — Privacidad por audiencia

La corrección exige categoría cerrada y explicación obligatoria. Owner ve historia completa, actor
y explicación. El sujeto ve su obligación, importes antes/después, categoría y fecha, sin actor ni
explicación interna. Tesorería recibe sólo principal vigente, saldo, estado y fecha, sin acción,
actor o explicación. Otros delegados no reciben historia general.

D11 fija el enum concreto y sus límites.

### E3-06-D09=A — Integración visual

Acción e historia se integran en el detalle económico existente. Los listados pueden mostrar un
indicador discreto, pero no se crea una sección permanente, ruta paralela o pantalla de Caja.
Historial de pagos continúa mostrando Recepciones, no correcciones.

## 3. Regla económica aprobada

Para Pago `ACTIVE`:

```text
principalOriginalMinor = importe original inmutable
principalBaseMinor = importe de la última corrección o principalOriginalMinor
principalExigibleMinor = principalBaseMinor
netConfirmedIncomeMinor = confirmedIncomeMinor - reversedIncomeMinor
balanceMinor = principalExigibleMinor - netConfirmedIncomeMinor
```

Invariantes:

- `principalBaseMinor > 0`;
- `0 <= netConfirmedIncomeMinor <= principalBaseMinor`;
- `balanceMinor >= 0`;
- `PENDING` si neto es cero;
- `PARTIAL` si `0 < neto < principalBaseMinor`;
- `SETTLED` si `neto == principalBaseMinor`.

Una corrección no modifica ingreso bruto/revertido/neto, aplicaciones, Recepciones ni movimientos
monetarios. Una obligación saldada aumentada pasa a `PARTIAL`; antes de confirmar, el Owner debe ver
principal vigente, nuevo principal, ingreso neto, saldo resultante y una advertencia de que reaparece
deuda visible para el sujeto. La UI deriva esa proyección al comparar el nuevo importe local válido
con el estado/neto del detalle canónico; no existe endpoint de preview adicional. El comando
revalida revisión, importes y autorización, y un detalle stale exige recarga y nueva revisión.

## 4. E3-06-D10=A — Anulación posterior

### Pregunta

¿Una obligación corregida que luego se determina indebida puede transicionar por E3-05 a `VOIDED`?

### Opciones evaluadas

- **A — permitir con elegibilidad estricta E3-05:** lifecycle `ACTIVE`, cero aplicaciones
  históricas, ingresos bruto/revertido/neto cero y ningún aviso `REPORTED` relacionado. Conserva
  principal original e historia; `voidedAmountMinor` extingue el principal base vigente.
- **B — bloquear si existe cualquier corrección:** evita evolucionar v3, pero deja una obligación
  indebida exigible por haber sido corregida antes.
- **C — deshacer correcciones antes de anular:** altera historia append-only y fabrica una secuencia
  sin hecho económico real.

### Decisión aprobada

**A**. La ecuación para `VOIDED` es:

```text
principalBaseMinor = última corrección o principalOriginalMinor
voidedAmountMinor = principalBaseMinor
principalExigibleMinor = principalBaseMinor - voidedAmountMinor = 0
netConfirmedIncomeMinor = 0
balanceMinor = 0
```

La anulación exige cero aplicaciones históricas, incluidas las revertidas; ingresos bruto,
revertido y neto cero; y ningún aviso `REPORTED` relacionado. No borra correcciones, no
restablece/reemplaza obligaciones, no libera la clave y sigue siendo terminal. Recovery reconcilia
receipt, principal base, revisión e historia sin degradar la forma persistida.

Esta decisión complementa prospectivamente el writer, schema y recovery de E3-05. No reescribe su
decisión, implementación, evidencia o cierre históricos.

## 5. E3-06-D11 — Motivos materiales

### Pregunta

¿Qué enum cerrado distingue un error original de importe de una decisión posterior de descuento,
condonación, interés o recargo?

### Catálogo aprobado

| Código | Significado permitido |
| --- | --- |
| `AMOUNT_ENTRY_ERROR` | Error de digitación, unidad o separador al fijar el principal. |
| `WRONG_APPROVED_BASE_AMOUNT` | Se aplicó un importe base distinto del ya aprobado para ese concepto/ocurrencia, sin cambiar identidad. |
| `MEMBERSHIP_EXCEPTION_AMOUNT_ERROR` | Se omitió o aplicó incorrectamente una excepción ya aprobada para esa Membresía. |
| `ARITHMETIC_ERROR` | Cálculo aritmético incorrecto bajo una regla de importe preexistente. |

No existe `OTHER`. Ningún código permite descuento discrecional, perdón de deuda, actualización
posterior de tarifa, interés, recargo, crédito o devolución.

La explicación es obligatoria, normalizada NFC, 1–240 code points y hasta 480 bytes UTF-8, sin
controles C0/C1 ni marcas bidi. Es información económica privada.

Las categorías describen errores materiales respecto de importes que ya correspondía aplicar. No
crean aprobación de tarifas o excepciones ni permiten condonación, descuentos discrecionales,
intereses o recargos.

## 6. Contratos y efectos documentales

El addendum consolidado adoptado define:

- comando individual cerrado, DTOs por audiencia y errores estables;
- principal original/base/exigible y composición común;
- schema compatible v1–v4 sin backfill;
- historia append-only, receipt, guard, transacción e índices a validar;
- coordinación con avisos y writers de ingreso, reversión y anulación;
- idempotencia, stale y recovery tras operaciones posteriores;
- generación original y outcomes históricos;
- frontend, pruebas focales, UAT y aceptación.

La historia usa default 20 y `pageSize` entero entre 1 y 50. El detalle y la continuación comparten
DTO; el cursor opaco liga actor, audiencia, Pago, orden y tamaño, con reautorización por página.
Tesorería no recibe historia completa.

Pago continúa como único Agregado y fuente económica. Corrección, receipt, guard e historia
subordinada no son Agregados ni fuentes paralelas.

La comprobación completa de avisos para el writer E3-06 es un gate ejecutable futuro. Las
mediciones focales E3-05 de 0/25 avisos no acreditan rendimiento productivo de E3-06.

## 7. Integración mínima en Documento 5

### 7.1 Continuidad incorporada en §7.5

> E3-06 incorpora la corrección Owner-only del principal exigible de una obligación válida
> `ACTIVE`, incluida `PENDING | PARTIAL | SETTLED`. Conserva principal y snapshot originales,
> identidad y generación; agrega principal base vigente e historia append-only dentro de Pago. El
> nuevo principal es positivo y no inferior al ingreso neto confirmado; saldo y estado se
> rederivan sin modificar Recepciones o aplicaciones. Avisos `REPORTED` relacionados bloquean.
> Exintegrante, Temporada cerrada y Grupo archivado conservan sus reglas, con operación prearchivo
> sólo por Owner. Acción e historia se integran en el detalle existente con privacidad por
> audiencia. Condonación, Caja, devolución, intereses, créditos, pasarela,
> restablecimiento/reemplazo y retiro económico legacy permanecen fuera. E3-06-D10 permite
> anulación posterior sólo bajo elegibilidad estricta E3-05, extinguiendo el
> principal base vigente y conservando historia. E3-06-D11 fija un catálogo cerrado sin `OTHER` y
> explicación obligatoria dentro de límites documentados.

### 7.2 Decisión registrada

| Identificador | Decisión | Estado | Alcance | Consecuencia |
| --- | --- | --- | --- | --- |
| D5-051 | E3-06 adopta D01–D11 y el addendum conjunto de Documentos 2/3/4 para corrección individual Owner-only del principal exigible, preservando evidencia original e historia y armonizando la anulación posterior estricta | APROBADA | Etapa 3 / E3-06 | La ficha queda `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`; no autoriza implementación, producción, cierre de Etapa 3 ni incrementos posteriores; D5-044, D5-045, Auth/UAT y gate económico legacy no cambian |

D5-051 fue verificado como siguiente identificador disponible después de D5-050 antes de su
integración.

## 8. Preservaciones y no efectos

- D5-044 conserva destinos y condiciones de retiro.
- D5-045 permanece como riesgo residual no resuelto.
- Auth/UAT real continúa aislada.
- El baseline documentado no se sustituye por nuevas ejecuciones.
- El gate económico legacy permanece vigente.
- `VOIDED` sigue terminal; no hay restablecimiento, reemplazo o liberación de clave.
- Reversión de ingreso continúa siendo el flujo vigente y no se duplica.
- Condonación, Caja, devolución, intereses, créditos y pasarela permanecen pendientes.
- No se reabre E2-14 ni se requiere verde global.
- No se autoriza código, pruebas, Emulator, Firebase remoto, deploy, fetch, stage, commit, push,
  merge o cambio de rama.
- No se cierra Etapa 3 ni se autoriza un incremento posterior.

## Resultado

**DEC-E3-06 ADOPTADA — E3-06 LISTO PARA IMPLEMENTAR CON AUTORIZACIÓN SEPARADA**

No se identificó un bloqueo funcional nuevo. La adopción no implementa E3-06, no cierra Etapa 3 y
no autoriza código, pruebas, Emulator, configuración, Firebase remoto o deploy.
