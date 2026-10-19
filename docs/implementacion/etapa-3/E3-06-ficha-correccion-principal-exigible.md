# E3-06 — Ficha de definición de corrección del principal exigible

## Estado de la ficha

- **Incremento:** `E3-06`.
- **Corte recomendado:** corrección del principal exigible de una obligación válida.
- **Decisiones aprobadas:** `E3-06-D01–D11`, con `D01–D10=A` y catálogo/límites D11 aprobados
  expresamente por el usuario.
- **Decisión de Documento 5:** `D5-051`.
- **Estado:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Implementación:** no ejecutada ni autorizada.
- **Formalización documental:** DEC, addendum y continuidad de Documento 5 adoptados localmente.
- **Código, pruebas, Emulator, Firebase remoto y deploy:** no ejecutados ni autorizados.
- **Base verificada:** rama `dev`, commit
  `348bdf8d11aa8267866c086b979cc00cf5659165`, árbol e índice limpios, sin stashes y divergencia
  local `dev...origin/dev` `0/0`, comprobado sin `fetch` ni cambio de rama el 19 de octubre de 2026.

Esta ficha incorpora D01–D11, DEC-E3-06, el addendum E3-06 a Documentos 2/3/4 y D5-051. “Listo para
implementar” significa definición documental suficiente; no constituye autorización de código,
pruebas, Emulator, datos, configuración, Firebase remoto o deploy. D10 complementa
prospectivamente a E3-05 sin reescribir su decisión, implementación o cierre históricos.

## 1. Fuentes focales y precedencia

Se revisaron focalmente:

- Documento 5 vigente, en particular §§5.2–5.18, §7.5 y D5-044–D5-051;
- cierre E3-05 y su preservación expresa de los pendientes posteriores;
- decisiones, fichas, cierres y addenda E3-01 a E3-05 pertinentes;
- addendum prospectivo de liquidación económica sobre Grupo archivado;
- contratos e implementación local de Pago, Recepción, aplicaciones, reversión, consultas,
  resumen, guard, receipts e integración en Economía.

Los documentos y addenda vigentes prevalecen fuera del complemento E3-06 adoptado. Esta ficha no
reescribe cierres históricos. No se repite la auditoría general o el inventario legacy.

## 2. Residuo económico distinguido

| Pendiente | Significado | Situación vigente | Efecto en E3-06 |
| --- | --- | --- | --- |
| Corrección del principal exigible | La obligación es válida, pero el importe exigible fue registrado incorrectamente. | Formalizada por DEC-E3-06, addendum E3-06 y D5-051; no existe writer. | **Corte formalizado**, con implementación sujeta a autorización separada. |
| Condonación total/parcial | La deuda es válida y se extingue sin ingreso por decisión del acreedor. | El modelo exige distinguirla de ingreso y corrección, pero faltan política, autorización y composición aprobadas. | Pendiente posterior; no se simula con una corrección. |
| Restablecimiento o reemplazo de `VOIDED` | Volver a exigir o crear otra obligación tras una anulación terminal. | Fue mencionado sólo como posibilidad futura. `VOIDED` conserva identidad y ocupa la clave económica. | Excluido; no se cambia terminalidad ni se libera la clave. |
| Obligaciones con aplicaciones | Tienen ingresos aplicados, incluso si fueron revertidos. | Pago conserva aplicaciones, bruto, reverso, neto, saldo y revisión. | Se evalúan expresamente; no se borran ni reescriben aplicaciones. |
| Caja y movimientos consultivos | Proyección agregada de actividad económica. | Caja no es Agregado; no hay necesidad concreta ni contrato aprobado. Los movimientos estables actuales pertenecen a Pago. | Pendiente posterior; no se crea pantalla ni fuente de verdad. |
| Retiro económico legacy | Sustituir autoridades económicas en participaciones, equipos e inscripciones. | Gate de salida de Etapa 3 con coordinación propia. | Se preserva; no se adelanta ni satisface. |

La reversión de Recepciones ya existe, es completa, única, motivada y Owner-only. Corrige un
registro de ingreso erróneo, conserva Recepción y aplicaciones y no devuelve dinero. E3-06 no la
duplica ni la reutiliza para corregir principal.

Devolución real, intereses, recargos, créditos, saldos a favor, cobros automáticos y pasarela
continúan fuera del alcance aprobado.

## 3. Selección del siguiente corte

| Candidato | Valor operativo | Respaldo normativo | Dependencias y cambio económico | Interacción con ingresos/avisos | Tamaño verificable |
| --- | --- | --- | --- | --- | --- |
| Corrección del exigible | Alto: permite reparar una deuda válida mal cuantificada sin anularla ni negar ingresos reales. | Pago ya es autoridad de principal, aplicaciones, saldo, estado y revisión; la corrección está prevista como transición futura distinta. | Evoluciona composición y ecuación de saldo, conserva snapshot original e incorpora historia propia. Reutiliza revisión, guard, receipts y consultas existentes. | Puede acotarse con límite frente a ingreso neto y bloqueo de avisos `REPORTED`; una reversión posterior se rederiva sobre el principal corregido. | Medio y focal: un Pago por comando, sin nueva raíz monetaria ni permiso delegado. |
| Condonación | Alto, pero condicionado a una política organizativa de remisión. | Prevista como componente no monetario, sin reglas aprobadas de motivo, autoridad, límites o reversibilidad. | Exige composición acumulativa, casos total/parcial y posible interacción con correcciones. | Debe distinguirse de dinero y decidir efectos sobre avisos y reversión. | Medio/alto; el bloqueo principal es funcional, no técnico. |
| Caja | Consultivo; su valor no está acreditado por una necesidad concreta actual. | Documento 5 la difiere hasta contar con movimientos estables y necesidad concreta; Caja no es Agregado. | Depende de taxonomía, alcance temporal, aperturas/cierres y composición previa estable. | Consume ingresos, reversiones y futuros ajustes/condonaciones; adelantarla fijaría proyecciones prematuras. | Alto y transversal; difícil de aceptar sin cerrar semánticas previas. |

### Corte único aprobado

Definir **corrección individual del principal exigible de una obligación válida**, Owner-only, para
Pagos `ACTIVE` sin importar que estén `PENDING`, `PARTIAL` o `SETTLED`, siempre que el nuevo principal
sea positivo y no inferior al ingreso neto confirmado. La operación preservaría el principal y el
snapshot originales, agregaría historia de corrección dentro de Pago, rederivaría saldo/estado y
avanzaría `economicRevision` una sola vez.

Este corte ofrece una solución completa para importes erróneos antes y después de ingresos sin
introducir condonación, crédito, devolución, Caja, permisos nuevos o restablecimiento de `VOIDED`.
Después quedarían, sin autorización ni diseño exhaustivo aquí: condonación, eventual
restablecimiento/reemplazo si se aprobara, casos cuyo nuevo principal quedaría por debajo del ingreso
neto, Caja consultiva y el retiro económico legacy bajo su gate propio.

## 4. Finalidad, casos de uso y exclusiones

### 4.1 Finalidad aprobada

Permitir al Owner corregir un error material en el importe exigible de una obligación que sí debía
existir, manteniendo una explicación auditable de su principal original, principal vigente, ingresos
reales, reversiones y saldo, sin alterar la identidad de generación.

### 4.2 Casos de uso incluidos por D01–D11

1. Corregir hacia arriba o hacia abajo una obligación sin ingresos.
2. Corregir una obligación parcial, preservando todas sus aplicaciones.
3. Aumentar una obligación saldada, que pasa a parcial al aparecer saldo exigible.
4. Reducir una obligación parcial o saldada hasta el ingreso neto ya confirmado, sin saldo negativo.
5. Consultar el antes/después, motivo, fecha y actor según audiencia autorizada.
6. Revertir posteriormente una Recepción por el flujo existente y rederivar el saldo contra el
   principal corregido, sin revertir la corrección.
7. Corregir una obligación propia de un exintegrante o de una Temporada cerrada y, bajo la regla
   prearchivo aprobada, una obligación anterior al archivo del Grupo.

### 4.3 Exclusiones

- `VOIDED`, desanulación, restablecimiento, reemplazo o liberación de clave económica;
- convertir una obligación válida en inexistente o llevar su principal vigente a cero;
- bajar el principal por debajo del ingreso neto confirmado;
- condonación, devolución, crédito, saldo a favor, interés o recargo;
- modificación de concepto, versión/snapshot, período, ocurrencia, vencimiento, Membresía,
  Temporada, Persona o referencias de generación;
- borrado, redistribución o edición de aplicaciones y Recepciones;
- corrección por lote o multiobligación;
- creación de Recepción, Ingreso o Movimiento monetario para representar la corrección;
- Caja, balance contable, exportación, conciliación o pasarela;
- permisos nuevos o ampliación por analogía de capacidades existentes;
- reparación silenciosa, migración masiva o backfill general.

## 5. Decisiones funcionales

D01–D11 fueron aprobadas expresamente. No queda una decisión funcional residual identificada.

### E3-06-D01 — Estados e historia económica elegibles

- **Pregunta:** ¿la corrección alcanza sólo obligaciones sin ingresos o también parciales y
  saldadas?
- **Opciones y consecuencias:**
  - **A — `PENDING | PARTIAL | SETTLED`:** resuelve el error aun después de ingresos; exige preservar
    aplicaciones y recalcular saldo/estado con un límite explícito.
  - **B — sólo sin ingreso neto:** reduce interacciones, pero excluye parciales/saldadas y permite
    casos con aplicaciones revertidas que igualmente poseen historia.
  - **C — ninguna aplicación histórica:** es el corte más pequeño, pero repite la restricción de
    E3-05 y deja sin remedio obligaciones válidas con cualquier historia monetaria.
- **Decisión aprobada:** **A**, sobre lifecycle `ACTIVE`; las aplicaciones `APPLIED` y `REVERSED`
  permanecen inmutables.

### E3-06-D02 — Direcciones y límite del nuevo principal

- **Pregunta:** ¿qué importes puede fijar una corrección?
- **Opciones y consecuencias:**
  - **A — aumento o disminución, con `nuevoPrincipal > 0` y
    `nuevoPrincipal >= ingresoNetoConfirmado`:** cubre errores en ambas direcciones y evita saldo
    negativo, crédito o devolución implícita.
  - **B — sólo aumento:** evita excedentes, pero no corrige sobrecargos.
  - **C — permitir cero o un importe inferior al ingreso neto:** obliga a definir extinción total,
    excedente, crédito o devolución; mezcla pendientes excluidos.
- **Decisión aprobada:** **A**. Igual importe no produce una corrección y el comando falla sin
  efectos. El importe se expresa en ARS minor units enteras dentro de los límites vigentes.

### E3-06-D03 — Principal original, snapshot e identidad

- **Pregunta:** ¿cómo conviven la corrección y la evidencia original de generación?
- **Opciones y consecuencias:**
  - **A — conservar inmutables principal y snapshot originales, y agregar principal exigible
    vigente más historia append-only:** explica cada transición sin reescribir generación.
  - **B — sobrescribir el principal existente:** simplifica lectura pero destruye evidencia y puede
    cambiar retrospectivamente outcomes/payloads de generación.
  - **C — crear una obligación reemplazante:** cambia identidad, arriesga doble deuda y se aproxima
    al reemplazo no aprobado de obligaciones.
- **Decisión aprobada:** **A**. `paymentId`, clave de negocio, `generationIntentId`, payload,
  snapshot, discriminador, referencias y outcomes originales no cambian.

### E3-06-D04 — Avisos `REPORTED` y revisiones stale

- **Pregunta:** ¿qué ocurre si un aviso pendiente incluye la obligación al corregirla?
- **Opciones y consecuencias:**
  - **A — bloquear la corrección:** conserva intacta la autoridad de E3-03/E3-04 y obliga a resolver
    primero la declaración; requiere comprobación completa y serialización con el guard.
  - **B — permitir y dejar el aviso pendiente:** debe definirse si la confirmación usa el importe
    declarado, el nuevo saldo o queda stale, y puede sorprender a sujeto/revisor.
  - **C — invalidar o decidir avisos atómicamente:** modifica otra raíz, agrega lifecycle/motivos y
    amplía mucho la unidad de consistencia.
- **Decisión aprobada:** **A**. Borradores cliente basados en una revisión anterior fallan stale por
  `expectedEconomicRevision`; no se reparan ni recalculan automáticamente.

### E3-06-D05 — Efecto de una reversión posterior

- **Pregunta:** ¿cómo se calcula la obligación si, después de corregir, se revierte una Recepción?
- **Opciones y consecuencias:**
  - **A — conservar la corrección y rederivar con el principal vigente:** la reversión reduce el
    ingreso neto mediante el flujo actual; el saldo aumenta contra el principal corregido.
  - **B — restaurar también el principal anterior:** fusiona dos hechos independientes y convierte
    la reversión de ingreso en reversión de corrección.
  - **C — prohibir toda reversión posterior:** contradice la reversión ya disponible y deja ingresos
    erróneos sin corrección.
- **Decisión aprobada:** **A**. La corrección no crea ni modifica una Recepción y la reversión no
  edita historia de correcciones.

### E3-06-D06 — Correcciones sucesivas y trazabilidad

- **Pregunta:** ¿una corrección se edita/revierte o una corrección posterior agrega un nuevo hecho?
- **Opciones y consecuencias:**
  - **A — registros append-only y nueva corrección para un nuevo importe:** conserva auditoría y
    orden por revisión; cada comando vuelve a validar el límite económico.
  - **B — editar la última corrección:** pierde el hecho previamente observado y complica recovery.
  - **C — reversión formal de corrección:** agrega una transición propia y debe validar que el
    principal restaurado siga siendo al menos el ingreso neto.
- **Decisión aprobada:** **A**; no se borra ni modifica historia.

### E3-06-D07 — Actor, contexto cerrado y capacidades

- **Pregunta:** ¿quién corrige y en qué estados organizativos?
- **Opciones y consecuencias:**
  - **A — Owner vigente exclusivamente; exintegrante y Temporada cerrada no bloquean; Grupo
    archivado sólo para Pago prearchivo íntegro:** reutiliza reglas ya aprobadas sin ampliar grants.
  - **B — sólo Grupo y Temporada activos:** simplifica autorización, pero deja deuda histórica
    válida mal cuantificada sin remedio.
  - **C — delegar a Tesorería/revisor/registrante:** requiere una nueva capacidad o ampliación
    normativa expresa, grants, revocación, privacidad, archivo y UAT.
- **Decisión aprobada:** **A**. `GROUP_TREASURY`, `GROUP_PAYMENT_NOTICE_REVIEW`,
  `GROUP_DIRECT_PAYMENT_RECORD`, cargo, rol global, Membresía o conocimiento de IDs no autorizan.

### E3-06-D08 — Motivo, visibilidad y privacidad

- **Pregunta:** ¿qué evidencia explica la corrección y qué ve cada audiencia?
- **Opciones y consecuencias:**
  - **A — categoría cerrada más explicación Owner-only; sujeto ve antes/después, categoría y fecha;
    Tesorería sólo principal vigente, saldo, estado y fecha:** equilibra trazabilidad y minimización.
  - **B — explicación visible a todos:** aumenta contexto, pero expone texto libre y actor sin
    necesidad económica.
  - **C — sólo importe actual sin historia:** minimiza datos, pero hace indistinguible corrección de
    sobrescritura y debilita auditoría.
- **Decisión aprobada:** **A** respecto de categoría cerrada, explicación obligatoria y audiencias.
  El actor y la explicación interna no se exponen al sujeto ni a Tesorería. D11 fija el enum y los
  límites exactos.

### E3-06-D09 — Presentación histórica e integración visual

- **Pregunta:** ¿dónde se consulta la corrección?
- **Opciones y consecuencias:**
  - **A — detalle existente de obligación más indicador discreto en listados:** evita una sección
    permanente redundante y mantiene la historia junto a su fuente económica.
  - **B — sección general de correcciones:** facilita auditoría masiva, pero crea una superficie y
    consultas no justificadas para este corte individual.
  - **C — sólo resultado efímero del comando:** impide consulta posterior confiable.
- **Decisión aprobada:** **A**. Historial de pagos continúa mostrando Recepciones, no correcciones.

### E3-06-D10=A — Anulación posterior a una corrección

- **Pregunta:** si una obligación corregida luego se determina indebida, ¿E3-05 puede anularla?
- **Opciones y consecuencias:**
  - **A — permitirla bajo la elegibilidad estricta de E3-05:** exige lifecycle `ACTIVE`, ninguna
    aplicación histórica y ningún aviso `REPORTED` relacionado; conserva principal original e
    historia de correcciones, y la anulación extingue el principal corregido vigente.
  - **B — bloquear toda obligación con correcciones:** mantiene literalmente la forma v3 actual,
    pero obliga a conservar como exigible una obligación indebida sólo porque antes fue corregida.
  - **C — deshacer correcciones antes de anular:** edita historia y crea una secuencia artificial
    sin valor económico.
- **Decisión aprobada:** **A**. La composición común es:
  `principalBase = última corrección o principal original`,
  `principalExigible = ACTIVE ? principalBase : 0` y
  `saldo = principalExigible - ingresoNetoConfirmado`. Para `VOIDED`, E3-05 continúa exigiendo cero
  aplicaciones/ingresos y `voidedAmountMinor = principalBase` al anular. La historia, identidad y
  clave permanecen; `VOIDED` sigue terminal.
- **Consecuencia:** el complemento es prospectivo. No reescribe el alcance implementado, evidencia
  o cierre histórico de E3-05; una futura implementación E3-06 deberá evolucionar de forma
  compatible su writer, schema y recovery.

### E3-06-D11 — Catálogo cerrado de errores materiales

- **Pregunta:** ¿qué categorías concretas acreditan que cambia un importe por error material y no
  por descuento, condonación, interés o recargo?
- **Decisión aprobada:**
  - `AMOUNT_ENTRY_ERROR`: error de digitación, unidad o separador al fijar el principal;
  - `WRONG_APPROVED_BASE_AMOUNT`: se aplicó un importe base distinto del ya aprobado para ese
    concepto/ocurrencia, sin cambiar la identidad de la obligación;
  - `MEMBERSHIP_EXCEPTION_AMOUNT_ERROR`: se omitió o aplicó incorrectamente una excepción de importe
    ya aprobada para esa Membresía;
  - `ARITHMETIC_ERROR`: cálculo aritmético incorrecto bajo una regla de importe que ya existía.
- No existe `OTHER`: una causa fuera del catálogo bloquea y debe tramitarse mediante la política
  económica que corresponda.
- La explicación es obligatoria, normalizada NFC, de 1–240 code points y hasta 480 bytes UTF-8, sin
  controles C0/C1 ni marcas bidi, coherente con los contratos vigentes.
- Las categorías sólo describen errores materiales respecto de importes que ya correspondía
  aplicar. No crean aprobación de tarifas/excepciones ni permiten rebaja discrecional, condonación,
  descuento, actualización posterior, interés o recargo.

## 6. Actor y autorización aprobados

| Acción | Owner vigente | Sujeto / exintegrante | `GROUP_TREASURY` | Revisor E3-03 | Registrante E3-04 |
| --- | --- | --- | --- | --- | --- |
| Corregir principal | Sí | No | No | No | No |
| Ver principal vigente y saldo | Sí | Sólo propio | Sí, lectura mínima | Sólo dentro de su contrato vigente | Sólo dentro de su contrato vigente |
| Ver historia de corrección | Completa | Propia minimizada | Mínima | No por analogía | No por analogía |
| Ver actor/explicación interna | Sí | No | No | No | No |
| Operar en Grupo archivado | Sí, Pago prearchivo | No | No | No | No |

La autorización se revalida en cada comando, recovery, detalle y página. No se deduce de datos
persistidos por cliente ni de una capacidad distinta.

## 7. Invariantes, datos, estados y transiciones

Esta sección materializa D01–D11.

### 7.1 Invariantes

1. Pago sigue siendo la única autoridad de obligación, principal vigente, aplicaciones, ingreso
   neto, saldo, estado y revisión económica.
2. `VOIDED` permanece terminal y fuera de toda corrección.
3. Principal y snapshot originales, identidad y generación permanecen inmutables.
4. Cada corrección agrega un hecho no monetario append-only con importe anterior, importe nuevo,
   diferencia, motivo, actor, tiempo y revisiones antes/después.
5. `principalVigenteMinor > 0` y
   `principalVigenteMinor >= netConfirmedIncomeMinor`.
6. `balanceMinor = principalVigenteMinor - netConfirmedIncomeMinor`; nunca es negativo.
7. Estado derivado: `PENDING` si neto es cero; `PARTIAL` si neto es mayor que cero y menor que el
   principal vigente; `SETTLED` si ambos son iguales.
8. La corrección no cambia bruto, reverso, neto, aplicaciones ni Recepciones.
9. Una transición efectiva incrementa `economicRevision` exactamente una vez. Retry/recovery
   terminal no vuelve a incrementarla.
10. Una corrección no crea Recepción, Ingreso, condonación, crédito, devolución o Caja.
11. Grupo, Temporada, Membresía, Persona, concepto, ocurrencia y vencimiento no cambian.
12. Un aviso `REPORTED` relacionado bloquea sin ser resuelto o rechazado por este comando.
13. La anulación posterior conserva principal original, principal corregido e historia; extingue el
    principal exigible mediante `voidedAmountMinor` igual al principal base al anular, no mediante
    ingreso, condonación ni sobrescritura.

### 7.2 Casos económicos

| Estado previo | Condición y corrección | Estado recomendado |
| --- | --- | --- |
| Sin ingresos / `PENDING` | Nuevo principal positivo | `PENDING`; saldo igual al nuevo principal. |
| `PARTIAL` | Nuevo principal mayor que neto | `PARTIAL`; saldo rederivado. |
| `PARTIAL` | Nuevo principal igual al neto | `SETTLED`; cero explicado por ingreso, no por condonación. |
| `SETTLED` | Aumento por encima del neto | `PARTIAL`; aparece saldo exigible. |
| `SETTLED` | Nuevo principal igual al neto | No-op si coincide con el actual; una disminución por debajo del neto se bloquea. |
| Neto cero con aplicaciones revertidas | Nuevo principal positivo | `PENDING`; historia de aplicaciones/reversión permanece. |
| `VOIDED` | Cualquier importe | Bloqueado; no hay transición. |

### 7.3 Ecuación económica común

Para formas `ACTIVE`:

```text
principalOriginalMinor = importe original inmutable de generación
principalBaseMinor = importe de la última corrección o principalOriginalMinor
principalExigibleMinor = principalBaseMinor
balanceMinor = principalExigibleMinor - netConfirmedIncomeMinor
```

Para formas `VOIDED`:

```text
principalOriginalMinor = importe original inmutable de generación
principalBaseMinor = importe de la última corrección o principalOriginalMinor
voidedAmountMinor = principalBaseMinor
principalExigibleMinor = principalBaseMinor - voidedAmountMinor = 0
netConfirmedIncomeMinor = 0
balanceMinor = principalExigibleMinor - netConfirmedIncomeMinor = 0
```

`principalBaseMinor` no es otra fuente económica: es la proyección vigente dentro de Pago de su
historia append-only. En `VOIDED` se conserva como evidencia del importe extinguido aunque el
principal exigible sea cero.

### 7.4 Transición conceptual

```text
ACTIVE + revisión esperada + sin aviso REPORTED relacionado
+ nuevo principal válido respecto del ingreso neto
-> ACTIVE + principal vigente corregido + saldo/estado rederivados
+ historia append-only + revisión incrementada
```

No se propone estado `CORRECTED`: `PENDING | PARTIAL | SETTLED` continúan expresando saldo. La
existencia de correcciones es historia/composición, no un estado económico alternativo.

## 8. Contratos y persistencia

Los nombres son orientativos hasta decisión normativa y diseño autorizado.

### 8.1 Comando individual

Contrato conceptual cerrado:

```text
correctPaymentPrincipal({
  groupId,
  paymentId,
  newPrincipalMinor,
  expectedEconomicRevision,
  reasonCode,
  explanation,
  idempotencyKey
})
```

El backend deriva actor, ownership, Grupo, Persona, Membresía, Temporada, principal original y
vigente, ingresos, saldo, estado, prearchivo y timestamps. El cliente no los aporta como autoridad.

Resultados mínimos: `CORRECTED | EXISTING | PENDING_RECOVERY`. Errores mínimos: no autenticado/no
accesible, `VOIDED`, importe inválido, por debajo del ingreso neto, mismo importe, aviso pendiente,
stale, no prearchivo, conflicto idempotente, estado incompatible y dependencia no disponible.

El detalle canónico devuelve al Owner principal original, principal vigente, ingreso neto, saldo
actual, estado y revisión. La UI deriva la advertencia al comparar un nuevo importe local válido con
ese detalle: si `SETTLED` pasará a `PARTIAL`, muestra principal vigente, nuevo principal, ingreso
neto y saldo resultante. La proyección es informativa; no se agrega endpoint de preview y el comando
revalida autorización, revisión e importes. Si el detalle queda stale, exige recarga y revisión.

### 8.2 Persistencia compatible

- `payments/{paymentId}` conserva forma original y agrega, sólo desde la primera corrección, el
  principal base vigente y la composición necesaria para hidratar v1/v2/v3 y la nueva forma v4.
- Las formas anteriores se interpretan con principal vigente igual al principal original, sin
  correcciones. No se ejecuta backfill general.
- Una subcolección o evidencia subordinada append-only de Pago conserva cada corrección. No es un
  Agregado, una Recepción ni una fuente económica paralela.
- El root conserva el resumen autoritativo actual; la historia no se relee para calcular cada saldo.
- Un receipt privado y deny-all conserva scope, hashes, outcome, referencia, revisiones y evidencia
  mínima de recovery; no copia Persona, email ni key cruda.
- Las aplicaciones y reversiones existentes no se reescriben. Sus snapshots históricos continúan
  describiendo el momento de la operación.

Compatibilidad propuesta:

- v1: `ACTIVE/PENDING`, principal base igual a `amountMinor`, economía normalizada como hoy;
- v2: `ACTIVE`, principal base igual a `amountMinor`, con ingresos/saldo/revisión existentes;
- v3: forma E3-05; activa compatible o `VOIDED` con `voidedAmountMinor == amountMinor`;
- v4 `ACTIVE` corregida: `amountMinor` conserva principal original, principal base vigente explícito
  e historia correlacionada por revisiones;
- v4 `VOIDED` corregida: conserva la misma composición e historia y exige
  `voidedAmountMinor == principalBaseMinor`, ingreso neto cero y saldo cero.

No hay backfill. Campos parciales, revisión discontinua, historia que no reconcilia con el root o
ecuaciones inválidas fallan cerrados; ningún reader repara datos.

`amountMinor` conserva normativamente el significado de principal original. El nombre físico del
principal base vigente se valida durante una implementación futura, sin cambiar esta semántica.

## 9. Concurrencia, idempotencia, stale y recovery

### 9.1 Unidad de consistencia propuesta

Una transacción individual debería:

1. leer receipt y Pago;
2. reautorizar Cuenta/Owner y leer Grupo;
3. acreditar prearchivo cuando corresponda;
4. validar lifecycle, revisión esperada, principal vigente, ingresos y nuevo límite;
5. coordinar con el guard de candidatos y comprobar completamente avisos `REPORTED` relacionados;
6. persistir corrección append-only, actualizar Pago y guard, y crear receipt en el mismo commit.

La comprobación ejecutable de avisos para el nuevo writer es un gate de implementación. Las
mediciones E3-05 con 0/25 avisos acreditan sólo su cierre focal dentro de los volúmenes observados;
no prueban rendimiento, capacidad, latencia o costo productivos de E3-06.

Pago serializa frente a confirmación, registro y reversión de Recepciones. El guard serializa frente
a informar/decidir avisos y registro administrativo. No se crea una transacción global ni se
modifican raíces ajenas.

Confirmación/registro aplican contra el principal base vigente; reversión conserva ese principal y
rederiva contra él; corrección cambia sólo principal base/saldo/estado/revisión/historia; anulación
extingue el principal base vigente bajo elegibilidad estricta. Ningún writer reescribe principal
original, snapshot o aplicaciones históricas.

### 9.2 Órdenes relevantes

- ingreso primero: cambia Pago; la corrección reintenta y valida el nuevo neto/revisión;
- corrección primero: confirmar/registrar relee el nuevo saldo y no puede producir saldo negativo;
- reversión primero: cambia Pago; la corrección relee neto menor y vuelve a validar;
- corrección primero y reversión después: la reversión conserva la corrección y rederiva saldo;
- aviso primero: cambia guard; la corrección reintenta y bloquea por pendiente;
- corrección primero: el aviso posterior relee revisión/saldo nuevos o falla stale;
- dos correcciones: sólo una confirma contra la revisión esperada; la otra queda stale;
- anulación primero: la corrección encuentra `VOIDED` y falla;
- corrección primero y anulación después: la anulación relee v4, exige cero aplicaciones/ingresos y
  ningún aviso, preserva historia y extingue el principal base;
- archivo concurrente: tras reintento sólo Owner y Pago prearchivo íntegro pueden continuar.

### 9.3 Idempotencia y recovery

- Scope recomendado: actor + Grupo + operación + key.
- El request hash incluye Pago, nuevo principal, revisión esperada y motivo normalizado.
- Igual key/payload reautoriza, reconcilia receipt, root e historia y devuelve `EXISTING`.
- Igual key/payload distinto conflictúa.
- Receipt ausente y root sin efecto permite reintento después de revalidar todo.
- Receipt ausente con una corrección ya observada no atribuye el efecto al actor por inferencia.
- Evidencia parcial o incoherente falla cerrada; nunca se fabrica éxito.
- Pérdida de respuesta conserva key/intención y retorna recuperación explícita.
- Una operación posterior que avance `economicRevision` no invalida el resultado histórico
  comprobable de un receipt terminal.
- Recovery de corrección compara las revisiones y el hecho histórico propio del comando; no exige
  que Pago permanezca en la revisión terminal original después de otro ingreso, reversión,
  corrección o anulación legítima.
- Recovery de anulación sobre una obligación corregida reconcilia
  `voidedAmountMinor == principalBaseMinor` y conserva todas las correcciones anteriores. Nunca
  degrada a v3 ni atribuye una anulación sin receipt/evidencia correlacionada.

## 10. Consultas y privacidad

- Listados de deuda muestran principal vigente y saldo autoritativos; no calculan diferencias en
  cliente.
- El detalle de obligación muestra al Owner principal original, principal vigente, ingreso neto,
  saldo, estado y correcciones ordenadas por revisión/fecha.
- El sujeto ve su propia obligación y una historia minimizada sin actor ni explicación interna.
- Tesorería conserva lectura económica mínima; no recibe acción, explicación ni identidad de actor.
- Revisor y registrante no adquieren historia general por poseer sus capacidades actuales.
- Historia de pagos continúa enumerando Recepciones. No se fabrica Recepción ni ingreso para una
  corrección.
- El detalle devuelve la primera página con `pageSize` default 20 y eventual `nextCursor`; la
  continuación usa el mismo DTO mediante un contrato acotado al `paymentId`.
- `pageSize` es entero entre 1 y 50. El cursor opaco liga contrato, actor, audiencia, Pago, orden y
  tamaño; cada página reautoriza y relee la raíz/ancla.
- Owner recibe historia completa y el sujeto sólo su proyección minimizada. Tesorería no recibe ni
  pagina la historia completa.
- UID, email, hashes, receipt IDs, paths internos y notas privadas nunca salen en DTOs.
- Firestore continúa deny-all para cliente sobre Pago, correcciones y receipts.

Los índices exactos quedan para una implementación autorizada. La ficha no introduce una consulta
general de correcciones ni afirma que un índice sea innecesario sin validar su query real.

## 11. Integración en Economía existente

- Reutilizar `/dashboard/groups/[groupId]/economy`, **Deudas**, **Mis obligaciones**, Tesorería y el
  detalle económico ya existente.
- Mostrar **Corregir importe exigible** sólo al Owner; la UI solicita, no determina elegibilidad.
- El modal muestra principal original/vigente, ingreso neto, saldo, nuevo principal, efecto esperado,
  motivo y advertencia de que no registra/devuelve dinero ni condona deuda.
- Si la obligación está `SETTLED` y el nuevo principal la vuelve `PARTIAL`, antes de confirmar se
  advierte explícitamente que reaparecerá saldo pendiente visible para el integrante y se muestran
  importe vigente, nuevo importe, ingreso neto y saldo resultante.
- Ante aviso pendiente, dirigir a **Pagos informados** sin resolverlo automáticamente.
- Ante stale, recargar detalle y exigir revisión; no sustituir importe ni reutilizar key con otra
  intención.
- Tras éxito, refrescar deuda, resumen, detalle y vistas autorizadas desde backend.
- Una insignia o línea discreta **Importe corregido** enlaza la historia en el detalle.
- No crear una sección permanente de Correcciones, otra pantalla de Caja ni una ruta paralela.

## 12. Pruebas focales para una implementación futura

No se ejecutan ni autorizan mediante esta ficha.

### 12.1 Dominio y contratos

1. aumento/disminución válida sin ingresos;
2. parcial que continúa parcial y parcial que pasa a saldada;
3. saldada que pasa a parcial por aumento;
4. rechazo de cero, mismo importe y nuevo principal inferior al neto;
5. neto cero con aplicaciones revertidas conserva historia;
6. `VOIDED` siempre bloquea y conserva terminalidad/clave;
7. principal/snapshot/identidad/generación originales inmutables;
8. objetos cerrados, minor units, motivo y límites Unicode aprobados.

### 12.2 Persistencia e integración

9. compatibilidad de lectura anterior sin backfill;
10. historia append-only y root actual coinciden por revisión;
11. no se modifica ninguna aplicación, Recepción o reversión;
12. no se crea Recepción, ingreso, condonación, crédito ni devolución;
13. resumen y listados usan principal vigente y saldo exactos;
14. aviso `REPORTED` relacionado bloquea con consulta completa; fallo/truncamiento bloquea cerrado;
15. carreras reales con confirmar, registrar, revertir, informar, otra corrección y archivar;
16. retry, key/payload conflictivo, pérdida de respuesta y evidencia parcial;
17. Grupo archivado sólo Owner/Pago prearchivo; exintegrante y Temporada cerrada no se mutan;
18. Rules deny-all y privacidad negativa por audiencia.
19. anulación posterior de corregida exige cero aplicaciones, ingresos cero y ningún aviso;
20. anulación conserva historia, extingue principal base y permite recovery correlacionado;
21. enum exacto sin `OTHER` y explicación NFC dentro de límites;
22. primera página/default 20, límites 1/50, continuación, cursor ligado y reautorización;
23. Tesorería no obtiene historia completa;
24. advertencia de saldada se deriva localmente del detalle canónico, sin endpoint de preview, y el
    comando vuelve a validar.

### 12.3 Regresión focal

25. generación E3-01 conserva outcomes y comparación original;
26. Tesorería E3-02 sigue read-only;
27. informar/confirmar/rechazar/revertir E3-03 conserva importes declarados y reglas stale;
28. preview/registro/reversión E3-04 usa saldos/revisiones actuales y no duplica ingresos;
29. anulación E3-05 conserva elegibilidad estricta, terminalidad e historia;
30. D5-044, D5-045, Auth/UAT aislada y gate económico legacy no cambian.

No se requiere reabrir E2-14 ni repetir suites completas para declarar un verde global.

## 13. UAT futura propuesta

1. Owner corrige hacia arriba y hacia abajo una obligación sin ingresos y ve saldo exacto.
2. Owner corrige una parcial sin alterar sus Recepciones; el sujeto ve el resultado minimizado.
3. Owner aumenta una saldada y ésta vuelve a mostrar saldo parcial.
4. Una reducción hasta el neto salda; por debajo del neto bloquea sin sugerir crédito/devolución.
5. Un aviso pendiente bloquea y permite navegar a su revisión.
6. Una revisión stale obliga a recargar, sin efecto parcial.
7. Tras corregir, Owner revierte una Recepción por el flujo existente y el saldo se rederiva contra
   el principal vigente.
8. Exintegrante/Temporada cerrada conservan historia; en Grupo archivado sólo Owner opera sobre Pago
   prearchivo.
9. Tesorería ve datos mínimos sin acción; otros grants no obtienen capacidad por analogía.
10. Una obligación `VOIDED` no ofrece acción ni puede restablecerse o reemplazarse.
11. Una obligación corregida sin aplicaciones/ingresos/aviso se anula, conserva ambas capas de
    historia y no puede regenerarse.
12. Owner y sujeto recorren historia con primera página de 20 y continuación; Tesorería no obtiene
    el historial.

La UAT no sustituye pruebas de concurrencia/recovery ni integra Auth real. Firebase remoto requiere
autorización separada.

## 14. Criterios de aceptación de definición e implementación

### 14.1 Integración documental

1. DEC-E3-06 adoptada;
2. addendum E3-06 a Documentos 2/3/4 adoptado;
3. continuidad y D5-051 integradas en Documento 5.

### 14.2 Para aceptar una implementación futura

1. Pago conserva autoridad única e identidad/snapshot/generación originales;
2. ningún resultado produce saldo negativo ni principal inferior al ingreso neto;
3. estados y resumen se rederivan de principal vigente e ingreso neto;
4. aplicaciones, Recepciones y reversión existente permanecen íntegras;
5. avisos pendientes y stale siguen la decisión aprobada sin automatismos ocultos;
6. revisión, guard, receipt, idempotencia y recovery tienen evidencia focal;
7. consultas y UI respetan autorización y privacidad por audiencia;
8. historia es consultable sin fabricar Recepciones o ingresos;
9. `VOIDED` continúa terminal y la clave económica no se libera;
10. exclusiones y preservaciones permanecen comprobables;
11. pruebas focales y UAT aprobadas tienen evidencia identificable;
12. no se declara cierre de Etapa 3 ni se autoriza el incremento posterior.

## 15. Checkpoint y rollback compatible

- **Checkpoint de definición:**
  `348bdf8d11aa8267866c086b979cc00cf5659165`.
- Un rollback futuro de código podría retirar acción/UI y writers, pero no debería degradar raíces
  que ya contengan correcciones ni borrar historia/receipts.
- Readers compatibles deben permanecer mientras existan formas persistidas nuevas.
- Una corrección real no se revierte mediante rollback de código: una política funcional posterior
  deberá usar otro hecho económico aprobado.
- Esta ficha no crea datos ni requiere rollback ejecutable.

## 16. Paquete normativo adoptado

Fuentes normativas complementarias de este corte:

1. [DEC-E3-06](./DEC-E3-06-correccion-principal-exigible.md), que registra
   D01–D11 aprobadas, el corte y sus exclusiones.
2. [Addendum a Documentos 2, 3 y 4](../../arquitectura/Documento-2-3-4-addendum-E3-06-correccion-principal-exigible.md),
   para:
   - precisar el caso de uso, actores, autorización y privacidad;
   - definir principal original/vigente, composición, estado, historia y efecto de reversión;
   - fijar contrato, persistencia compatible, transacción, guard, idempotencia y recovery.
3. **Documento 5**, con continuidad E3-06, referencias normativas, alcance residual y `D5-051`.

No se identifica necesidad de modificar Documentos 1 o 1.5: no aparece un nuevo Agregado ni una
nueva ubicación de dominio.

## 17. Preservaciones y pendientes posteriores

- D5-044 conserva superficies, destinos y condiciones de retiro.
- D5-045 permanece como riesgo residual aceptado y no resuelto.
- Auth/UAT real continúa aislada.
- El baseline documentado, incluidos resultados históricos no repetidos, no se reescribe.
- El gate de retiro económico legacy permanece vigente y con su coordinación aprobada.
- E2-14 no se reabre y no se buscan suites globales verdes.
- `VOIDED` sigue terminal; no se restablece, reemplaza ni libera su identidad.
- La reversión existente no se duplica ni se redefine.
- Condonación, Caja, devolución, intereses, créditos y pasarela siguen fuera.
- No se autoriza código, pruebas, Emulator, Firebase remoto, deploy, fetch, stage, commit, push,
  merge, cambio de rama o modificación normativa.
- No se cierra Etapa 3 ni se autoriza un incremento posterior.

## Veredicto

**E3-06 LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA**

El corte vertical aprobado cubre obligaciones válidas `PENDING`, `PARTIAL` y `SETTLED` con un
límite que evita saldos negativos, conserva el principal/snapshot originales y mantiene separadas
corrección, ingreso, reversión, condonación y anulación. D10 (anulación posterior a corrección) y
D11 (enum concreto de motivos) quedaron aprobadas e incorporadas. No se identificó un bloqueo
funcional nuevo. La formalización no implementa E3-06, no cierra Etapa 3 y no autoriza código,
pruebas, Emulator, configuración, Firebase remoto o deploy.
