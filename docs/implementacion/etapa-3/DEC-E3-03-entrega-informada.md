# DEC-E3-03 — Entrega informada multiobligación y validación completa

## Estado

`ADOPTADA — D5-048 — IMPLEMENTACIÓN NO AUTORIZADA`

- **Fecha de preparación:** 2026-10-09.
- **Base:** `dev` en `3f6b82c64f74713981dd923d5eb9a2de9734f9f6`.
- **Carácter:** decisión normativa adoptada y registrada en Documento 5.
- **Identificador D5:** `D5-048`.
- **Decisiones aprobadas:** E3-03-D01–D08.
- **Ficha:** [E3-03](./E3-03-ficha-aviso-validacion-pago.md).
- **Normativa complementaria adoptada:**
  [addendum E3-03](../../arquitectura/Documento-1-1.5-2-3-4-addendum-E3-03-entrega-informada.md).

Este documento adopta D01–D08 y su addendum conjunto mediante D5-048. La formalización no constituye
autorización de implementación.

## 1. Contexto

E3-01 estableció obligaciones independientes por Membresía y E3-02 incorporó
`GROUP_TREASURY` exclusivamente de consulta. La continuidad prevista para E3-03 era aviso propio,
validación/rechazo e ingreso confirmado, incluso sobre obligaciones prearchivo.

El recorrido fue precisado por el usuario: una entrega humana puede distribuirse explícitamente
entre varias obligaciones seleccionadas. Debe conservar una identidad y decisión comunes, mientras
cada Pago mantiene autoridad sobre su obligación, aplicación y saldo.

Documentos 3/4 definen cada Pago como unidad de consistencia y prohíben ampliar límites por mera
conveniencia. El requisito todo-o-nada sí introduce una regla funcional de consistencia inmediata.
Por eso E3-03 necesita una excepción multi-Pago explícita y acotada, no una autorización general.

## 2. Decisiones adoptadas por el usuario

### E3-03-D01 — Scope exacto

Una entrega cubre sólo obligaciones de la misma `membershipId`, Temporada y Grupo. Todas las líneas
correlacionan la misma Persona sujeto. No se mezclan renovaciones, Membresías, Temporadas o Grupos.

### E3-03-D02 — Identidad común y atomicidad acotada

Entrega y decisión son comunes. Confirmación y reversión afectan todas las aplicaciones o ninguna
mediante una transacción acotada. Cada Pago conserva autoridad sobre su obligación y saldo.

La excepción transaccional se limita a E3-03, máximo 20 obligaciones y operaciones de confirmar o
revertir una entrega. No permite transacciones generales entre Agregados, no incorpora referencias
externas a Pago y no se reutiliza por analogía.

### E3-03-D03 — Desglose, total y stale

Las líneas son inmutables y el total se deriva de su suma. Si cualquier línea supera el saldo al
confirmar, el comando completo bloquea sin efectos y la entrega sigue pendiente. No existe rechazo
automático, recorte, redistribución, confirmación parcial ni reserva.

La resolución es rechazo explícito, una corrección administrativa conforme a su futura política o,
cuando corresponda, otra entrega informada.

### E3-03-D04 — Revisión económica delegada

`GROUP_PAYMENT_NOTICE_REVIEW` es independiente de `GROUP_TREASURY`. Sólo Owner concede/revoca; usa
grants, slots, receipts, vínculo Cuenta–Persona, `validityAnchor` y `ownershipRevision` según el
lifecycle E3-02.

Permite lectura mínima y decisión completa de entregas de terceros. Prohíbe deuda propia, reversión,
economía general y operación delegada en archivo. No amplía grants existentes. Owner actúa por
Cuenta/ownership sin Persona.

### E3-03-D05 — Reversión completa

Sólo Owner revierte una entrega confirmada. La reversión es completa, única, motivada, trazable e
idempotente. Conserva declaración, confirmación y aplicaciones originales. No es devolución, ajuste
del exigible o condonación.

La reversión conserva `decisionState = CONFIRMED` y cambia `applicationState` de `APPLIED` a
`REVERSED`. No sustituye la confirmación histórica ni borra aplicaciones; agrega una reversión común
y sus referencias. Owner dispone de historia paginada y detalle de confirmadas aplicadas/revertidas
para localizar el caso. El revisor delegado conserva sólo pendientes de terceros y recovery de
outcomes propios, sin historia general.

### E3-03-D06 — Límite

Máximo 20 obligaciones únicas por entrega. El addendum documenta presupuesto lógico; la
implementación deberá medir lecturas, escrituras, tamaño, retries y contención. No se afirma
rendimiento probado y no se pagina una confirmación.

### E3-03-D07 — Fecha y rechazo

Fecha declarada obligatoria, civil y no futura en `America/Argentina/Buenos_Aires`. No se exige que
sea posterior al alta o vencimiento. Rechazo completo con categoría obligatoria y observación
opcional; “otro” exige explicación presentable.

## 3. Recorrido adoptado

```text
Mis obligaciones agrupadas por Grupo/Temporada/Membresía
-> selección de 1..20 obligaciones del mismo contexto
-> total o parcial por línea
-> desglose y total derivados
-> entrega REPORTED sin reserva
-> Owner/revisor confirma o rechaza el conjunto
-> N aplicaciones atómicas en sus Pagos
-> saldos/estados derivados por obligación
-> Owner puede revertir el conjunto completo
```

La entrega es una recepción única. Sus aplicaciones no son pagos independientes.

### 3.1 Importe exacto e idempotencia al informar

Cada línea conserva el `requestedAmountMinor` exacto mostrado y confirmado, también en modo
`FULL`. El cliente envía además el saldo y la revisión económica esperados. El backend los relee y
valida, pero no reemplaza el importe por el saldo actual.

Si el saldo o la revisión cambió antes de persistir la entrega, el comando devuelve
`DELIVERY_DRAFT_STALE`, con las líneas afectadas y sus valores propios actuales, sin crear entrega ni
receipt terminal. La UI exige revisar y volver a confirmar el desglose.

El request hash incluye scope, fecha y líneas canónicas con `paymentId`, modo, importe exacto, saldo
esperado y revisión esperada. La entrega persiste ese importe y snapshot. Igual key e igual intención
recupera el mismo `deliveryId` y los mismos importes aunque después cambien los saldos; nunca
recalcula `FULL`. Igual key con importe o snapshot distinto conflictúa. Al confirmar, D03 compara el
importe persistido con el saldo vigente: si no cabe, bloquea todo y conserva `REPORTED`; si cabe,
aplica exactamente ese importe, sin recorte ni redistribución.

## 4. Presentación y privacidad adoptadas

**Mis obligaciones**:

- agrupa por nombre de Grupo y después por etiquetas de Temporada/Membresía;
- usa secciones desplegables accesibles y no muestra IDs técnicos;
- mantiene historia y Grupos archivados según autorización propia/prearchivo;
- conserva hasta 20 seleccionadas entre páginas del mismo contexto;
- muestra selección, modo, importe, desglose y total antes de informar;
- advierte antes de descartar al cambiar de contexto y nunca traslada líneas silenciosamente;
- informa que un pendiente no reserva ni reduce saldo.

La agrupación es presentación. Grupo, Temporada y Membresía no se vuelven fuentes económicas.

El sujeto sólo ve economía propia; Owner ve pendientes e historia confirmada del Grupo; el revisor
ve el mínimo de pendientes de terceros y outcomes propios necesarios para recovery, sin historia
general. Firestore cliente permanece deny-all.

## 5. Identidad, lifecycle y D08 aprobada

E3-03 separa la fuente de verdad de declaración, líneas y decisión común de la autoridad económica
de cada obligación.

### E3-03-D08 — Clasificación de la entrega común

Se adopta **B — Agregado Entrega informada** con raíz, identidad, invariantes, lifecycle y
Repositorio propios. Es dueño únicamente de declaración, líneas inmutables, total derivado,
decisión y trazabilidad de la reversión común. No posee deuda, aplicaciones, movimientos, saldo,
estado ni revisión económica; cada Pago conserva esas autoridades.

La alternativa `DELIVERY_NOTICE` de Pago queda descartada porque mezclaría en Pago invariantes y
razones de cambio de una obligación con los de una recepción común. No era necesariamente una
fuente duplicada de saldo, pero ofrecía menor cohesión de responsabilidades.

Confirmar o revertir modifica una Entrega y entre 1 y 20 Pagos del mismo contexto en una
transacción. Grupo, Temporada, Membresía e identidad/autorización sólo se leen. Esta excepción no
fusiona dominios ni autoriza transacciones generales entre Agregados.

## 6. Seguridad previa al primer ingreso

Confirmar no puede exponerse sin reversión completa disponible en el mismo corte. El orden mínimo:

1. dominio y persistencia de aplicaciones/reversión;
2. pruebas de atomicidad, idempotencia, autorización y recovery;
3. aviso, bandejas y frontend;
4. habilitación conjunta de confirmación y reversión.

No existe estado operativo autorizado con ingresos irreversibles.

## 7. Presupuesto y comprobación futura

Para `N=20`, el diseño prevé:

- confirmación: hasta 42 escrituras (`20` Pagos + `20` aplicaciones + entrega + receipt);
- reversión: hasta 43 (`20` Pagos + `20` reversiones + entrega + receipt + reversión común);
- presupuesto interno objetivo de 64 KiB para raíz, líneas y snapshots;
- lecturas económicas de Pagos/aplicaciones más entrega, receipt y contexto de autorización.

Son presupuestos de diseño. Emulator y medición ejecutable pertenecen a implementación futura. Si
no se satisfacen, debe reabrirse forma física o D06; no se declara rendimiento probado.

## 8. Registro en Documento 5

### 8.1 Continuidad incorporada en §7.5

> E3-03 incorpora una entrega informada única, distribuida explícitamente entre hasta veinte
> obligaciones de la misma Membresía, Temporada y Grupo. Las líneas y el total son inmutables; los
> pendientes no reservan saldo. Owner o `GROUP_PAYMENT_NOTICE_REVIEW` confirma o rechaza el conjunto,
> sin auto-revisión delegada ni operación delegada en archivo. Confirmación por Owner/revisor y
> reversión Owner-only aplican todas las líneas o ninguna mediante una excepción transaccional
> exclusiva de
> este flujo; cada Pago conserva autoridad sobre su obligación, aplicación y saldo. Una línea sin
> saldo suficiente bloquea sin efectos y conserva la entrega pendiente. Cada línea aplica el importe
> exacto confirmado por el integrante, incluso si eligió “Total”; nunca se recalcula, recorta o
> redistribuye silenciosamente. Exintegrantes, Temporada
> cerrada y obligaciones prearchivo se atienden dentro de sus autorizaciones vigentes. Entrega
> informada es un Agregado independiente que no duplica la autoridad económica de Pago.

### 8.2 Decisión registrada

| ID | Decisión | Estado | Alcance | Consecuencia |
| --- | --- | --- | --- | --- |
| `D5-048` | E3-03 adopta Entrega informada como Agregado independiente, entrega multiobligación, revisión económica explícita, atomicidad acotada y reversión completa | `APROBADA` | Etapa 3 / E3-03 / obligaciones por Membresía | D01–D08 y addendum conjunto adoptados; implementación requiere autorización separada |

El registro no modifica las filas D5-043–D5-047.

### 8.3 Alcance de la capacidad aprobada

Documento 5 conserva:

> `GROUP_PAYMENT_NOTICE_REVIEW` es una capacidad fija adicional e independiente de
> `GROUP_TREASURY`. Su aprobación no crea RBAC general, no amplía grants anteriores y no autoriza
> capacidades futuras por analogía.

## 9. Preservaciones

- D5-043 permanece satisfecho sólo según las capacidades expresamente formalizadas; no habilita
  roles configurables.
- D5-044 conserva destinos y condiciones de retiro.
- D5-045 conserva el riesgo residual y sus límites.
- D5-046 y D5-047 permanecen vigentes; E3-03 no reinterpreta E3-01/E3-02.
- El gate económico de Etapa 3 continúa pendiente.
- El addendum prearchivo sigue siendo autoridad para Grupo archivado.
- E2-14 no se reabre por rutina.

## 10. Límites de la adopción

Esta decisión no:

- autoriza código, pruebas, suites, Emulator, Firebase remoto o deploy;
- amplía `GROUP_TREASURY` o grants existentes;
- crea roles configurables, registro directo, intereses o reparto automático;
- incorpora adjuntos, pasarelas, devolución, Caja, ajuste o condonación;
- toca Torneos/partidos, Auth/UAT o normativa vigente;
- cierra E3-03 o Etapa 3.

## Resultado

`DEC-E3-03 ADOPTADA — D5-048 — LISTO PARA IMPLEMENTAR CON AUTORIZACIÓN SEPARADA`
