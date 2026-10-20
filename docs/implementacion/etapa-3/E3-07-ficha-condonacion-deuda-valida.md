# E3-07 — Ficha de condonación y reversión de condonación de deuda válida

## Estado de la ficha

- **Incremento:** `E3-07`.
- **Corte:** condonación individual total/parcial y reversión completa de un hecho de condonación erróneo.
- **Decisiones aprobadas:** `E3-07-D01–D06=A`, `D07=B`, `D08–D11=A`.
- **Aprobaciones complementarias:** `E3-07-R01` y `E3-07-R02=A`.
- **Decisión de Documento 5:** `D5-052`.
- **Estado:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Implementación:** no autorizada.
- **Base verificada:** rama `dev`, commit `ed51bbee7b69d4d8694fbd88a5b92c83fb9a4053`, con esta ficha como único cambio previo sin seguimiento, sin stashes y sin `fetch`, comprobado el 20 de octubre de 2026.

La revisión focal no identificó contradicciones sustantivas. DEC-E3-07, el addendum conjunto y D5-052 formalizan D01–D11, incluida la reversión mínima D07=B, y R01/R02=A. “Listo para implementar” significa definición documental suficiente; no declara comprobados los gates ejecutables ni autoriza código, configuración, Rules, índices, dependencias, pruebas, Emulator, Firebase remoto o deploy.

## 1. Fuentes y separación de autoridad

Fuentes focales:

- Documento 5 vigente, §§5.2–5.18, §7.5 y D5-044–D5-051;
- cierre E3-06 como checkpoint y evidencia del comportamiento ya implementado;
- decisiones y addenda E3-01–E3-06 sólo para obligación, ingresos, reversión, anulación, corrección, autorización, privacidad, contratos y persistencia;
- addendum aprobado de liquidación de Pagos prearchivo en Grupo archivado.

Se distinguen expresamente:

- **reglas vigentes:** Pago es autoridad; corrección, anulación, reversión de ingreso y liquidación prearchivo conservan sus significados aprobados;
- **comportamiento comprobado:** el cierre E3-06 documenta principal v1–v4, ingresos/reversiones, `economicRevision`, guard, receipts, consultas por audiencia y UI existente;
- **decisiones E3-07 aprobadas:** D01–D11 de esta ficha;
- **propuestas técnicas:** contratos, nombres físicos, schemas, queries e índices descritos aquí;
- **aprobaciones complementarias:** R01 y R02=A, incorporadas sin crear permisos ni circuitos nuevos.

No se reabre E2-14, no se investiga D5-045 ni se repite el inventario de torneos, partidos, participaciones, equipos o inscripciones. El retiro económico legacy conserva su gate propio.

## 2. Selección y distinciones del corte

### 2.1 Corte vertical adoptado

E3-07 cubre en un único Pago `ACTIVE`:

1. condonación `PARTIAL | TOTAL` de deuda válida con saldo positivo;
2. condonaciones sucesivas contra nuevas revisiones;
3. reversión completa, individual y única de un hecho de condonación registrado por error;
4. historia, composición, consultas, privacidad y UI necesarias para observar ambos hechos.

Sólo el Owner vigente actúa. Pago continúa como único Agregado y fuente económica. Condonación, reversión compensatoria, historia, receipts y guard son componentes o mecanismos subordinados.

### 2.2 Operaciones que no se confunden

| Operación | Hecho que explica | Efecto autorizado |
| --- | --- | --- |
| Corrección E3-06 | La obligación era válida, pero su principal original se cuantificó mal. | Cambia principal base vigente; conserva evidencia original. |
| Anulación E3-05 | La obligación no debía existir. | Pasa a `VOIDED` bajo elegibilidad estricta. |
| Reversión de ingreso | Una Recepción/ingreso fue registrado incorrectamente. | Reduce ingreso neto; conserva Recepción/aplicaciones. |
| Condonación E3-07 | La deuda es válida y el acreedor decide no exigir un importe. | Aumenta condonación vigente; reduce saldo sin dinero. |
| Reversión de condonación E3-07 | Un hecho de condonación fue registrado por error. | Compensa íntegramente ese hecho; aumenta saldo sin tocar dinero/principal. |
| Devolución real | Sale dinero previamente recibido. | Fuera de E3-07 y del alcance aprobado. |

Condonación no es descuento prospectivo de concepto/tarifa. Su reversión no es edición, borrado, ingreso, devolución ni reactivación de una obligación `VOIDED`.

### 2.3 Caja y retiro legacy

Caja/movimientos/balance consultivo no forma parte del corte. Una consulta exclusivamente de flujos monetarios podría definirse sin esperar condonación porque ésta no es dinero; una consulta de deuda, saldo o composición sí debe incorporarla para no ser incompleta. E3-07 no afirma que toda Caja esté necesariamente bloqueada.

El retiro económico legacy sigue siendo gate de salida de Etapa 3. No se redefine aquí su funcionamiento deportivo ni se adelantan superficies D5-044.

## 3. Finalidad, actores y casos de uso

### 3.1 Finalidad

Permitir al Owner extinguir de forma no monetaria todo o parte del saldo válido y reparar un hecho de condonación erróneo mediante evidencia compensatoria, conservando una explicación auditable de principal, ingresos, condonación bruta/revertida/vigente y saldo.

### 3.2 Actores y privacidad

| Actor/audiencia | Participación | Resultado |
| --- | --- | --- |
| Owner vigente | Crea condonación; revierte completamente un hecho individual elegible; consulta historia completa. | Resultado autoritativo y recuperable. |
| Sujeto, incluido exintegrante | Consulta sólo su obligación e historia minimizada. | Importe, categoría presentable, fecha y efecto, sin actor ni nota interna. |
| `GROUP_TREASURY` | Consulta composición económica mínima. | Principal, ingreso neto, condonación vigente, saldo, estado y última fecha; sin acción ni historia completa. |
| Revisor/registrante | Conserva exclusivamente contratos E3-03/E3-04. | No adquiere acción ni historia general. |
| Sistema | Revalida, deriva, persiste y recupera outcomes. | No inventa política ni corrige silenciosamente. |

### 3.3 Casos incluidos

1. Condonar un importe positivo menor al saldo.
2. Condonar exactamente el saldo confirmado como `TOTAL`.
3. Agregar condonaciones sucesivas contra nuevas revisiones.
4. Revertir una vez y completamente un hecho individual no revertido.
5. Conservar condonación ante una reversión posterior de ingreso y reabrir deuda cuando resulte.
6. Corregir después el principal sólo sobre el piso económico aprobado.
7. Consultar composición e historia paginada según audiencia.
8. Operar obligaciones existentes de exintegrantes y Temporadas cerradas.
9. En Grupo archivado, operar sólo como Owner sobre Pago prearchivo íntegro.

### 3.4 Exclusiones

- condonación o reversión por lote, automática, programada o por porcentaje;
- reversión parcial, doble reversión, edición o borrado;
- corrección del principal, anulación, reversión de ingresos o devolución mediante estos comandos;
- condonación sobre `VOIDED`, saldo cero o importe superior al saldo;
- restablecimiento/reemplazo de `VOIDED` o liberación de identidad;
- descuentos prospectivos, intereses, recargos, créditos, saldos a favor y pasarela;
- permisos nuevos, perfiles configurables o delegación por analogía;
- Caja, conciliación, exportación, contabilidad general o nueva ruta económica;
- migración masiva, backfill, reparación silenciosa o doble escritura;
- retiro legacy y cambios normativos fuera de los tres documentos E3-07.

## 4. Decisiones aprobadas

### E3-07-D01=A — Modalidades y elegibilidad

Condonación individual `PARTIAL | TOTAL` sólo sobre Pago `ACTIVE`, saldo positivo y estado `PENDING | PARTIAL`. `SETTLED` no tiene deuda que perdonar; `VOIDED` es inelegible.

### E3-07-D02=A — Owner-only

Sólo Owner vigente. Tesorería, revisión de avisos, registro directo, cargo, rol global, Membresía o conocimiento de IDs no autorizan. No se crea capability.

### E3-07-D03=A — Importe fijo, sucesivas y `TOTAL`

Cada hecho fija un importe explícito positivo en minor units y no superior al saldo confirmado. `TOTAL` exige igualdad exacta con `expectedBalanceMinor`. Se admiten hechos sucesivos contra nuevas revisiones. Un cambio concurrente no amplía ni recalcula la intención.

### E3-07-D04=A — Estados derivados

`PENDING` significa cero extinción por ingreso neto y condonación vigente con saldo positivo; `PARTIAL`, alguna extinción y saldo positivo; `SETTLED`, saldo cero. No existe estado `WAIVED`.

### E3-07-D05=A — Reversión posterior de ingreso

La reversión de Recepción conserva la condonación fija. Al reducir ingreso neto aumenta el saldo por el importe revertido y una obligación antes `SETTLED` puede volver a `PARTIAL`. La historia explica ambos hechos; no se amplía, borra ni revierte automáticamente la condonación.

### E3-07-D06=A — Principal corregido

Condonación opera contra `principalBaseMinor`. Una corrección posterior E3-06 exige:

```text
newPrincipalMinor >= netConfirmedIncomeMinor + currentWaivedAmountMinor
```

No ajusta condonaciones automáticamente. Para reducir por debajo del piso debe revertirse primero cada hecho necesario mediante D07=B y luego emitirse una nueva intención de corrección.

### E3-07-D07=B — Reversión mínima de condonación

El mismo incremento incluye reversión Owner-only, completa por hecho individual, única, idempotente, trazable y con motivo obligatorio. Conserva el hecho original y agrega evidencia compensatoria; reduce condonación vigente y aumenta saldo exactamente por el importe revertido.

No modifica principal, ingresos, Recepciones, aplicaciones ni devuelve dinero. No permite reversión parcial, doble reversión, edición o borrado. Revalida contexto y economía transaccionalmente, y recovery reconoce el outcome original después de ingresos, reversiones, correcciones u otras condonaciones posteriores.

### E3-07-D08=A — Avisos al condonar

Todo aviso `REPORTED` relacionado bloquea la condonación mediante comprobación completa y falla cerrada. El comando no confirma, rechaza ni resuelve el aviso. R02=A aplica el mismo bloqueo a la reversión de condonación.

### E3-07-D09=A — Estructura de motivo y privacidad

Se aprueba catálogo cerrado más explicación obligatoria, con separación entre categoría presentable al sujeto y nota interna. Owner ve actor/nota; sujeto no. Tesorería sólo ve composición mínima. R01 fija los valores, etiquetas, privacidad y límites concretos de §5.

### E3-07-D10=A — Contexto histórico y archivo

Condonar y revertir condonación no reejecutan elegibilidad de generación. Exintegrante y Temporada cerrada no bloquean. En Grupo archivado ambas operaciones son sólo Owner y sólo sobre Pago prearchivo íntegro; no reviven grants, Membresía, Temporada ni actividad deportiva.

### E3-07-D11=A — Anulación incompatible

Cualquier historia de condonación impide la anulación E3-05, incluso si todos sus hechos fueron posteriormente revertidos y la condonación vigente es cero. La historia prueba que la obligación fue tratada como deuda válida. No se libera identidad, no se borra evidencia y `VOIDED` sigue terminal.

## 5. Aprobaciones complementarias

### E3-07-R01 — Catálogos, etiquetas, privacidad y límites aprobados

D09=A y R01 aprueban la siguiente estructura cerrada y sus valores:

**Condonación — categoría presentable al sujeto**

| Código | Etiqueta presentable | Semántica interna permitida |
| --- | --- | --- |
| `FINANCIAL_ASSISTANCE` | Apoyo económico | Decisión de no exigir deuda por situación económica del sujeto. |
| `ORGANIZATIONAL_WAIVER` | Decisión de la organización | Remisión discrecional aprobada, no ligada a error del principal. |
| `EXCEPTIONAL_WAIVER` | Situación excepcional | Remisión por circunstancia individual excepcional documentada internamente. |

No existe `OTHER`. Ninguna categoría significa error de importe, obligación indebida, ingreso erróneo, devolución, crédito, interés o recargo.

**Reversión de condonación — categoría sólo administrativa**

| Código | Semántica interna permitida |
| --- | --- |
| `WAIVER_DUPLICATE_ENTRY` | El mismo perdón se registró más de una vez. |
| `WAIVER_WRONG_AMOUNT` | Importe incorrecto; se revierte completo y una nueva condonación requiere otra intención. |
| `WAIVER_WRONG_PAYMENT` | Se aplicó a una obligación distinta de la decidida. |
| `WAIVER_NOT_AUTHORIZED_AS_RECORDED` | No existía autorización organizativa para el hecho registrado. |

Al sujeto se presenta sólo **Condonación revertida**, importe y fecha, nunca la categoría interna de reversión ni su nota. Para ambos comandos, la explicación interna es obligatoria, NFC, de 1–240 code points y máximo 480 bytes UTF-8, sin controles C0/C1 ni marcas bidi. No existe `OTHER`.

`WAIVER_NOT_AUTHORIZED_AS_RECORDED` documenta que el hecho registrado fue un error por carecer de autorización organizativa; no crea aprobadores, permisos, roles, grants ni un circuito organizativo nuevo.

### E3-07-R02=A — Avisos al revertir condonación

Cualquier aviso `REPORTED` relacionado bloquea también la reversión de condonación. La comprobación consume el resultado completo autorizado y falla cerrada ante lectura incompleta, truncada o no disponible. Nunca confirma, rechaza o resuelve el aviso automáticamente. Contrato, guard, errores, concurrencia, frontend y UAT aplican esta regla sin alternativa condicional.

## 6. Ecuación, lifecycle e invariantes

### 6.1 Pago `ACTIVE`

```text
principalOriginalMinor = importe inmutable de generación
principalBaseMinor = última corrección o principalOriginalMinor
grossWaivedAmountMinor = suma de importes de hechos de condonación
reversedWaivedAmountMinor = suma de importes de hechos revertidos una vez
currentWaivedAmountMinor = grossWaivedAmountMinor - reversedWaivedAmountMinor
netConfirmedIncomeMinor = confirmedIncomeMinor - reversedIncomeMinor
principalExigibleMinor = principalBaseMinor
balanceMinor = principalExigibleMinor
             - netConfirmedIncomeMinor
             - currentWaivedAmountMinor
```

```text
PENDING: balanceMinor > 0
         && netConfirmedIncomeMinor + currentWaivedAmountMinor == 0
PARTIAL: balanceMinor > 0
         && netConfirmedIncomeMinor + currentWaivedAmountMinor > 0
SETTLED: balanceMinor == 0
```

### 6.2 Pago `VOIDED`

Por D11, una raíz anulable nunca posee historia de condonación:

```text
grossWaivedAmountMinor = 0
reversedWaivedAmountMinor = 0
currentWaivedAmountMinor = 0
voidedAmountMinor = principalBaseMinor
principalExigibleMinor = 0
netConfirmedIncomeMinor = 0
balanceMinor = 0
```

### 6.3 Invariantes

1. Bruto, revertido y vigente son enteros no negativos; `reversed <= gross`.
2. Cada reversión referencia un hecho único por el importe completo y existe a lo sumo una.
3. `netIncome + currentWaived <= principalBase`; saldo nunca negativo.
4. Cada hecho efectivo incrementa `economicRevision` una vez.
5. Principal/snapshot originales, identidad, clave, generación y outcomes permanecen inmutables.
6. Aplicaciones, Recepciones y reversiones de ingreso no se reescriben.
7. `TOTAL` describe el saldo de la revisión confirmada; no cubre deuda futura automáticamente.
8. Cualquier historia de condonación vuelve inelegible anulación aun con vigente cero.
9. Historia y resumen de raíz reconcilian; la UI nunca calcula autoridad.
10. No se crea Caja, Movimiento monetario, Agregado Condonación ni fuente paralela.

Una reversión efectiva siempre cumple:

```text
balanceAfterMinor = balanceBeforeMinor + reversedWaiverAmountMinor
reversedWaiverAmountMinor > 0
```

Si la obligación estaba `SETTLED`, vuelve a `PENDING` cuando el ingreso neto más la condonación vigente restante son cero, y a `PARTIAL` cuando conservan un componente positivo. Nunca permanece `SETTLED` después de una reversión efectiva.

## 7. Contratos y DTOs de diseño

### 7.1 Crear condonación

```text
waivePaymentDebt({
  groupId, paymentId,
  mode: "PARTIAL" | "TOTAL",
  amountMinor,
  expectedBalanceMinor,
  expectedEconomicRevision,
  reasonCode,
  internalExplanation,
  idempotencyKey
})
```

Resultado: `WAIVED | EXISTING | PENDING_RECOVERY`, con `waiverId`, importe, composición actual, estado y revisiones. Backend deriva actor, referencias, importes y timestamps.

### 7.2 Revertir condonación

```text
reversePaymentWaiver({
  groupId, paymentId, waiverId,
  expectedEconomicRevision,
  expectedWaiverHistoryRevision,
  reasonCode,
  internalExplanation,
  idempotencyKey
})
```

Resultado: `REVERSED | EXISTING | PENDING_RECOVERY`, con referencia al hecho original, importe completo, composición actual, estado y revisiones. El cliente no aporta importe de reversión.

### 7.3 Consultas e historia

- `getPaymentDetail`: composición actual y primera página histórica según audiencia;
- `listPaymentWaiverHistory`: continuación acotada a `paymentId`;
- listados Owner/propios y resumen: condonación vigente separada de ingreso;
- Tesorería: proyección mínima sin historia completa ni acción.

Historia Owner propuesta:

```text
{
  eventId,
  kind: "WAIVER_CREATED" | "WAIVER_REVERSED",
  waiverId,
  amountMinor,
  mode?,
  publicReasonCode?,
  internalReasonCode?,
  internalExplanation?,
  actorDisplay?,
  occurredAt,
  economicRevisionBefore,
  economicRevisionAfter,
  waiverHistoryRevision
}
```

Sujeto recibe tipo, importe, modalidad de creación, etiqueta pública y fecha; nunca actor, códigos internos, explicación, UID, email, receipt, hash, path o key. En reversión ve el vínculo presentacional y **Condonación revertida**.

Errores mínimos: no autenticado/no accesible, no Owner, `VOIDED`, sin saldo, importe/modalidad inválidos, saldo/revisión stale, hecho inexistente/no accesible/ya revertido, aviso `REPORTED` relacionado para cualquiera de los dos comandos, Pago no prearchivo, conflicto idempotente, schema/estado incompatible y dependencia no disponible.

## 8. Persistencia, repositorios, queries e índices previstos

### 8.1 Compatibilidad y forma física candidata

- `payments/{paymentId}` mantiene formas v1–v4 y agrega, desde el primer hecho, totales bruto, revertido y vigente, cabeza/conteo de historia y revisión; formas anteriores hidratan ceros.
- Una forma posterior no requiere backfill. Lectores aceptan formas completas conocidas y fallan cerrados ante combinaciones parciales.
- `payments/{paymentId}/waiverEvents/{eventId}` conserva creación y reversión append-only; no es Agregado ni fuente separada.
- Cada creación tiene identidad estable; cada reversión referencia la creación y posee unicidad física/lógica por `waiverId`.
- receipts privados deny-all separados por operación guardan scope, hash, outcome, referencias y evidencia mínima; nunca key cruda.
- el guard económico existente coordina avisos y writers, sin autoridad económica.

### 8.2 Repositorios/adaptadores

| Componente | Responsabilidad |
| --- | --- |
| Repositorio Económico de Pago | Hidratar formas, aplicar ecuación/invariantes y persistir raíz. |
| Repositorio de historia de condonación | Persistir/listar hechos subordinados y comprobar unicidad/reconciliación. |
| Repositorio de receipts | Idempotencia y recovery por operación. |
| Repositorio de guard | Coordinar avisos y writers E3-03/E3-04. |
| Adaptadores de Grupo/identidad | Reautorizar Owner, contexto y prearchivo sin transferir ownership. |

No se crea repositorio genérico, de Caja o de Condonación como Agregado.

### 8.3 Queries, paginación y cursores

- historia por parent `paymentId`, orden descendente por `waiverHistoryRevision` y desempate por ID;
- primera página default 20; `pageSize` entero 1–50;
- cursor opaco ligado a contrato, actor, audiencia, Pago, orden, tamaño, ancla, conteo y cabeza observados;
- cada página reautoriza y relee raíz/cabeza;
- una condonación o reversión nueva entre páginas invalida como `CONCURRENT_MODIFICATION`; tras recargar se recorre el nuevo snapshot sin omisiones;
- ingreso, reversión de ingreso o corrección sin evento E3-07 no invalidan por sí solos el cursor, aunque cambien la composición actual mostrada separadamente;
- regresión de conteo/cabeza o secuencia incoherente es `INCOMPATIBLE_STATE`.

| Consulta | Orden/filtro candidato | Tratamiento |
| --- | --- | --- |
| Historia de un Pago | parent + `waiverHistoryRevision DESC` + ID | Validar índice automático/compuesto al implementar. |
| Detalle por `waiverId` | path determinista o lookup subordinado | Preferir identidad determinista; sin índice global especulativo. |
| Listados existentes | Grupo/Membresía + estado/orden vigentes | Evolucionar proyección; no crear query paralela. |

No se crean índices ejecutables en este paquete.

## 9. Evolución de writers y unidad de consistencia

### 9.1 Writers afectados

1. **Generación E3-01:** nuevas raíces inicializan semánticamente condonación cero; no cambia elegibilidad/identidad.
2. **Informar E3-03:** snapshots usan saldo/revisión actuales; informar no reserva saldo.
3. **Confirmar/registrar E3-03/E3-04:** aplican como máximo el saldo posterior a condonación y revalidan revisión/guard; nunca cuentan condonación como dinero.
4. **Revertir ingreso E3-03/E3-04:** conserva condonación y puede reabrir saldo por D05=A.
5. **Anular E3-05:** cualquier historia E3-07 bloquea por D11=A.
6. **Corregir principal E3-06:** adopta piso `netIncome + currentWaived` por D06=A.
7. **Condonar E3-07:** agrega creación, actualiza totales/estado/revisión/guard y receipt.
8. **Revertir condonación E3-07:** comprueba completamente avisos, agrega compensación completa, correlación, totales/estado/revisión/guard y receipt.
9. **Readers/resúmenes:** muestran ingreso y condonación separados; no suman condonación a Caja monetaria.

### 9.2 Unidad transaccional

Cada comando E3-07 lee receipt, Pago, Grupo/ownership, prearchivo, historia objetivo cuando corresponde, guard y avisos exigidos; valida schema/lifecycle/revisiones/economía; y escribe raíz, hecho, guard y receipt en un commit. No modifica Grupo, Persona, Membresía, Temporada, Recepción o aplicación ni crea transacción global.

### 9.3 Concurrencia y stale

- ingreso primero: E3-07 relee o queda stale;
- condonación primero: ingreso posterior sólo usa saldo restante;
- reversión de ingreso posterior: conserva condonación y reabre saldo;
- corrección posterior: respeta D06; si gana antes, E3-07 relee principal/revisión;
- dos condonaciones o condonación/reversión: una revisión gana; la otra recarga;
- dos reversiones del mismo hecho: una confirma; la otra recupera si es la misma intención o devuelve `ALREADY_REVERSED` si es distinta;
- aviso primero: bloquea condonación y reversión; cualquiera de ambas que confirma primero obliga al aviso posterior a releer economía/revisión;
- anulación primero: `VOIDED` bloquea; cualquier historia E3-07 primero bloquea anulación;
- archivo concurrente: tras reintento sólo Owner y Pago prearchivo íntegro continúan.

### 9.4 Idempotencia y recovery

- scope: actor + Grupo + operación + key; keys 16–128 caracteres, cruda no persistida;
- hash de creación incluye actor/scope, operación, Pago, modalidad, importe, saldo/revisión esperados, `reasonCode` e `internalExplanation` normalizada;
- hash de reversión incluye actor/scope, operación, Pago, `waiverId`, revisiones esperadas, `reasonCode` e `internalExplanation` normalizada;
- misma key/igual payload reautoriza y reconcilia receipt, raíz, evento y correlación;
- misma key con cualquier campo distinto —incluida una explicación distinta después de normalizar— conflictúa;
- receipt ausente sin efecto permite retry tras revalidar;
- evento sin receipt/evidencia suficiente nunca se atribuye por inferencia;
- pérdida de respuesta conserva key/intención y ofrece recovery explícito;
- recovery conserva y devuelve contenido/outcome originales aunque operaciones legítimas posteriores avancen saldo, estado o revisión; no exige que las revisiones históricas del comando sigan vigentes;
- evidencia parcial/incoherente falla cerrada, sin éxito fabricado ni reparación.

## 10. Avisos pendientes

Crear y revertir condonación aplican D08=A/R02=A: consulta completa de avisos `REPORTED` relacionados y bloqueo sin decisión automática. Lectura incompleta, truncada o no disponible falla cerrada. No se reutiliza un límite de preview para afirmar ausencia. Guard y Pago serializan ambos comandos frente a los writers de avisos.

## 11. Frontend integrado y accesible

- Reutilizar `/dashboard/groups/[groupId]/economy`, **Deudas**, **Mis obligaciones**, resumen y detalle canónico; sin ruta paralela ni pantalla de Caja.
- Mostrar **Condonar deuda** sólo al Owner con saldo positivo; backend decide elegibilidad.
- Modal con principal vigente, ingreso neto, condonación vigente, saldo, modalidad, importe, categoría, nota interna y saldo proyectado.
- `TOTAL` muestra importe exacto y advierte que refiere al saldo/revisión observados.
- Historia discreta **Condonaciones** dentro del detalle; cada hecho no revertido ofrece al Owner **Revertir condonación**.
- Modal de reversión muestra hecho/importe original, nuevo saldo proyectado, motivo y advertencia de que no modifica principal/ingresos ni devuelve dinero.
- Errores stale, aviso, recovery incierto o validación se muestran dentro del modal activo con `role="alert"`, foco programático y datos conservados. Ante aviso se bloquea un nuevo envío coherentemente hasta recargar y revalidar; nunca se decide el aviso.
- Mientras el outcome sea incierto se conserva key/intención y se bloquea doble envío.
- Tras éxito se refrescan backend, detalle, listas y resumen; no hay economía optimista.
- Sujeto ve etiquetas presentables; notas/categorías internas nunca aparecen.
- Navegación por teclado, devolución de foco, cierre deliberado y responsive reutilizan patrones existentes.

## 12. Pruebas focales y UAT futuras

No se ejecutan ni autorizan con este paquete.

### 12.1 Evidencia técnica automatizada

1. parcial, total, sucesivas y límites exactos;
2. estados con ingreso neto y condonación vigente;
3. reversión completa cumple `saldoPosterior = saldoAnterior + importeRevertido`; desde `SETTLED`
   produce `PENDING` sin componentes restantes o `PARTIAL` con alguno positivo; parcial, doble,
   edición y borrado fallan;
4. bruto/revertido/vigente e historia reconcilian;
5. reversión de ingreso conserva condonación y reabre saldo;
6. corrección posterior aplica piso D06;
7. cualquier historia, incluso revertida, bloquea anulación;
8. avisos bloquean ambos comandos; lectura incompleta falla cerrada y ningún comando decide el aviso;
9. exintegrante, Temporada cerrada y archivo/prearchivo;
10. carreras reales, stale y ausencia de efectos parciales;
11. idempotencia, key conflictiva, pérdida de respuesta y recovery posterior;
12. compatibilidad v1–v4 sin backfill y forma nueva completa;
13. paginación 20, límites 1/50 e invalidación ante nuevo evento;
14. privacidad, DTOs minimizados y deny-all interno;
15. writers E3-01–E3-06 evolucionados sin duplicar economía;
16. frontend: modal activo, foco/anuncio, conservación y doble envío;
17. arquitectura: Pago único Agregado; ausencia de Caja/Movimiento/Repositorio genérico;
18. D5-044, D5-045, Auth/UAT aislada y gate legacy preservados.

### 12.2 Evidencia humana UAT

1. Owner condona parcialmente y ve saldo/composición exactos.
2. Owner condona totalmente y ve `SETTLED` sin ingreso ficticio.
3. Owner agrega una segunda condonación sobre nueva revisión.
4. Owner revierte completamente un hecho saldado, ve reaparecer el saldo exacto como `PENDING` o
   `PARTIAL` según los componentes restantes y no puede repetir.
5. Tras condonación total con ingreso previo, revierte el ingreso y observa deuda reabierta con ambos hechos separados.
6. Corrección que viola el piso bloquea; una válida conserva historia.
7. Aviso pendiente bloquea condonación y reversión dentro de sus modales; conserva datos y bloquea reenvío hasta recargar/revalidar.
8. Sujeto/exintegrante ve información presentable sin actor/nota; Tesorería sólo composición.
9. Grupo archivado admite únicamente Owner/Pago prearchivo y no revive navegación deportiva.
10. Stale y recovery incierto permanecen dentro del modal y conservan intención.

UAT no prueba invariantes, concurrencia, Rules o recovery y no integra Auth real salvo autorización separada. La evidencia técnica no reemplaza confirmación humana de textos, foco y comprensión.

## 13. Criterios de aceptación

### 13.1 Entrada documental satisfecha

1. DEC-E3-07 adoptada localmente;
2. addendum E3-07 a Documentos 2/3/4 adoptado como fuente complementaria;
3. D5-052 y continuidad mínima incorporadas en Documento 5;
4. ficha revisada contra contratos, catálogos y preservaciones aprobados.

Permanecen como gates de una implementación autorizada: schemas/compatibilidad, evolución de todos
los writers/readers, query completa de avisos, índices, concurrencia, stale, idempotencia, recovery,
mediciones, pruebas técnicas y UAT humana. Esta formalización no los considera ejecutados.

### 13.2 Para aceptar una implementación futura

1. Pago conserva autoridad única; ecuación y estados reconcilian sin saldo negativo.
2. Condonación y reversión compensatoria son append-only y no monetarias.
3. Toda reversión efectiva aumenta el saldo por su importe positivo y nunca conserva `SETTLED`.
4. Reversión de ingreso, corrección y anulación implementan D05, D06 y D11.
5. Todos los writers afectados usan composición/revisión actuales.
6. Avisos bloquean ambos comandos mediante comprobación completa, sin decisión automática.
7. Autorización, prearchivo, privacidad y minimización se revalidan.
8. Idempotencia, concurrencia, stale, cursor y recovery tienen evidencia focal.
9. Compatibilidad no requiere backfill, doble escritura ni fuente paralela.
10. UI reutiliza vistas existentes y cumple feedback/accesibilidad.
11. Evidencia técnica y UAT están separadas e identificables.
12. Rollback compatible y preservaciones están documentados.
13. No se infiere cierre de E3-07 o Etapa 3.

## 14. Checkpoint, rollback y paquete normativo

- **Checkpoint:** `dev` en `ed51bbee7b69d4d8694fbd88a5b92c83fb9a4053`.
- **Rollback documental:** retirar los tres archivos/modificaciones E3-07 antes de integrar; no hay datos ni código que recuperar.
- **Rollback futuro:** puede retirar UI/writers, pero debe conservar readers, ecuación e historia mientras existan datos E3-07. No borra hechos ni revierte decisiones económicas reales.
- **Paquete normativo adoptado:** esta ficha, [DEC-E3-07](./DEC-E3-07-condonacion-deuda-valida.md),
  [addendum E3-07](../../arquitectura/Documento-2-3-4-addendum-E3-07-condonacion-deuda-valida.md)
  y Documento 5 con D5-052.

## 15. Preservaciones

- D5-044 conserva superficies, destinos y condiciones; no se adelanta.
- D5-045 sigue como riesgo residual aceptado y no resuelto.
- Auth/UAT real permanece aislada.
- Gate económico legacy permanece pendiente.
- E2-14 no se reabre.
- Caja monetaria puede evaluarse por sus flujos; deuda/composición debe incluir E3-07.
- Devolución, crédito, saldo a favor, interés, recargo, pasarela, permisos nuevos y restablecimiento/reemplazo de `VOIDED` quedan fuera.
- No se ejecutan código, pruebas, suites, Emulator, configuración, Rules, índices, dependencias, Firebase remoto o deploy.
- No se autoriza implementación ni se declara cerrado E3-07 o Etapa 3.

## Veredicto

**E3-07 LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA**

D01–D06=A, D07=B, D08–D11=A, R01 y R02=A quedan formalizadas por DEC-E3-07, el addendum y D5-052. La reversión mínima conserva el hecho original, agrega compensación completa y siempre reabre saldo por un importe positivo. Los gates ejecutables permanecen pendientes y requieren autorización separada; no se declara implementado, verificado o cerrado E3-07 ni Etapa 3.
