# Addendum a Documentos 2, 3 y 4 — E3-01 / obligaciones por Membresía

## Estado

- **Contenido funcional:** `APROBADO POR EL USUARIO`.
- **Estado del artefacto:** `APROBADO PARA VERSIONAR`.
- **Fecha de formalización:** 2026-10-07.
- **Base documental:** `dev` en `1ba808eb98bc696e8a2214e48b1a75879d250ce6`.
- **Alcance:** PF-05, CU-078 y porciones de CU-082/CU-083; semántica lógica y física mínima de
  Pago para E3-01.
- **Ficha asociada:**
  [E3-01](../implementacion/etapa-3/E3-01-ficha-obligaciones-membership-grupo.md).
- **Excepción de archivo asociada:**
  [addendum de liquidación prearchivo](./Documento-2-addendum-E3-liquidacion-grupo-archivado.md).
- **Decisión asociada:** DEC-E3-01 / D5-046.

Este addendum es la fuente normativa complementaria para su alcance y evita duplicar íntegramente
las reglas en los Documentos base. Los Documentos 2, 3 y 4 conservan autoridad fuera de estas
precisiones. Ante contradicción dentro del alcance E3-01, prevalece este addendum prospectivamente.
La aprobación documental no autoriza implementación, configuración, pruebas ni deploy.

## 1. Complemento funcional para Documento 2

### 1.1 Pago y obligación

Para el primer flujo de Etapa 3, Pago representa una obligación económica deportiva independiente,
vinculada a una Membresía exacta dentro de un Grupo. No es Plan, Suscripción, factura comercial,
pasarela ni cobro automático.

El Owner vigente del Grupo es el único actor que administra conceptos y genera obligaciones. El
Owner consulta la economía del Grupo; una Persona autenticada consulta exclusivamente las
obligaciones vinculadas a sus propias Membresías activas o finalizadas.

### 1.2 Conceptos

Un concepto posee identidad estable, nombre, tipo `MONTHLY` o `ONE_TIME`, importe general ARS y
estado activo/desactivado. Sólo Owner puede crearlo, renombrarlo, cambiar el importe general o
desactivarlo. El tipo no cambia y E3-01 no incluye reactivación.

Toda obligación conserva snapshot del concepto. Cambios o desactivación posteriores no modifican
obligaciones ya creadas.

El Owner confirma una versión de concepto. El claim transaccional de generación exige
`expectedConceptVersion`, fija nombre, tipo, moneda e importe general para todo el intent y serializa
contra una actualización concurrente. El importe base del lote coincide con el general de esa
versión; sólo una excepción por Membresía, con motivo, puede diferir.

### 1.3 Importe, moneda y vencimiento

- ARS es la única moneda inicial y se expresa en centavos enteros, escala dos.
- El Owner confirma explícitamente el importe general versionado al generar; no existe prorrateo.
- Puede definir excepción por Membresía con motivo obligatorio.
- El vencimiento es fecha civil explícita en `America/Argentina/Buenos_Aires`.
- No existen recargos, intereses, crédito, excedente, comprobante ni pasarela en este corte.

### 1.4 Cuota mensual

Puede generarse para el mes vigente o uno anterior, nunca futuro, sólo si:

1. Grupo activo;
2. Temporada de la Membresía abierta;
3. vigencia canónica de esa misma raíz superpuesta con el mes;
4. integridad y referencias válidas;
5. ausencia de obligación con `membershipId + conceptId + YYYY-MM`.

Una Membresía finalizada puede recibir una obligación omitida si su Temporada aún está abierta y su
vigencia canónica demuestra el solapamiento. Cerrar Temporada impide generar incluso deuda omitida.
La deuda sin vigencia demostrable es importación histórica fuera de E3-01.

Membresía acredita la vigencia mediante una capacidad read-only que hidrata todas las formas
canónicas actuales v1–v6. v1 y v5 legacy activa sin metadata proyectan
`[fechaIngreso, +infinito)`; v2 proyecta `[fechaIngreso, fechaEgreso)`; v3/v4, v5 period-aware y v6
usan sus Períodos reales `[startedAt, endedAt)`. v5 se discrimina por su forma validada, no sólo por
el número. Cargo opcional y lineage se validan donde corresponden, pero no acreditan vigencia ni
autorizan. No se materializa, completa o corrige historia. Igualdad inicio/fin produce un intervalo
vacío no elegible, sin reclasificar como corrupto un dato admitido por E2.

### 1.5 Cobro único

La unicidad es `membershipId + conceptId + occurrenceKey`. La ocurrencia es explícita, nombrada,
creada antes del lote, estable y reutilizable en lotes complementarios. Su identidad es backend y
no una idempotency key. La UI lista ocurrencias existentes antes de ofrecer crear otra. El nombre no
es clave y no se usa para deduplicación automática. E3-01 no permite modificarla o eliminarla; al
primer uso queda marcada e inmutable también como definición económica.

La elegibilidad no se hereda de la mensual. `ONE_TIME` exige Grupo activo, Temporada exacta abierta
y Membresía activa, íntegra y correlacionada al confirmar. El contrato no recibe `periodKey`, no
evalúa solapamiento y no permite finalizadas retroactivas.

El comando es una unión cerrada: `MONTHLY` exige `periodKey` y prohíbe `occurrenceKey`; `ONE_TIME`
exige `occurrenceKey` y prohíbe `periodKey`. Ambos comparten concepto/version, Membresías, importe
base, excepciones, vencimiento e idempotency key.

### 1.6 Lote y consulta

La generación es explícita. `CREATED`, `EXISTING` y `FAILED` son terminales e inmutables;
`PENDING/UNCERTAIN` se recuperan o reanudan y se presentan como `PENDING_RECOVERY`, nunca como fallo
confirmado. Reejecutar una fila `FAILED` exige otra intención y conserva la unicidad económica.

`EXISTING` exige igualdad de referencias, concept/version y snapshot, discriminador mensual/único,
importe aplicado, excepción/motivo y vencimiento. Una diferencia produce
`OBLIGATION_PAYLOAD_CONFLICT` y devuelve como persistido sólo el valor realmente existente.

La consulta propia deriva Persona y raíces Membresía en backend. Conocer IDs no autoriza. La
consulta administrativa revalida ownership. En E3-01, Grupo archivado admite sólo consulta y no
existe desarchivo aprobado. Los futuros cortes de liquidación podrán modificar exclusivamente Pagos
creados antes del archivo conforme al addendum prospectivo asociado; no forman parte de E3-01.

## 2. Complemento de dominio para Documento 3

### 2.1 Frontera del Agregado

Pago es el único Aggregate Root económico de este flujo y una raíz representa una obligación. El
concepto y la ocurrencia son definiciones del Módulo Pagos, no Agregados adicionales. Avisos,
ingresos, reversiones, ajustes y condonaciones futuros deberán pertenecer a Pago si no aparece una
invariante que justifique otra frontera mediante decisión expresa.

Pago referencia Membresía, Grupo, Persona y Temporada sin incorporarlos ni modificarlos. La
`membershipId` exacta determina la referencia histórica:

- CU-028 conserva la raíz y las obligaciones;
- CU-029 crea otra raíz para obligaciones nuevas;
- la historia conjunta se compone sin copiar.

### 2.2 Invariantes

1. snapshot económico inmutable por obligación;
2. ARS entero de escala dos;
3. unicidad de negocio independiente de idempotencia;
4. concepto activo al reclamar el intent y al crear cada obligación todavía pendiente;
5. ownership, Grupo activo, Temporada abierta y vigencia revalidados al confirmar;
6. cero modificación de Grupo, Membresía, Temporada, Persona o Períodos;
7. Pago referenciado bloquea eliminación de Grupo;
8. archivo de Grupo impide conceptos, ocurrencias y obligaciones nuevas; la futura liquidación
   excepcional sólo modifica Pagos preexistentes;
9. saldo cero futuro debe conservar composición entre ingresos y condonación.

El estado de obligación es distinto del estado de un aviso. E3-01 sólo crea obligaciones
`PENDING`. Los futuros `PARTIAL` y `SETTLED` describen saldo; `SETTLED` no equivale por sí solo a
“pagada íntegramente” y debe conservar el desglose que explique el saldo cero.

### 2.3 Lifecycle posterior preservado

Antes de registrar ingresos deberá aprobarse una política que distinga:

- reversión de un registro de ingreso erróneo;
- ajuste/corrección del importe exigible;
- condonación no monetaria;
- devolución real de dinero, fuera del alcance actual.

Corregir una obligación no niega un ingreso real. Este pendiente no bloquea E3-01 porque el corte no
registra dinero.

## 3. Complemento técnico para Documento 4

### 3.1 Unidad de consistencia

Cada obligación es una unidad económica independiente. El lote no forma un Agregado: un intent
técnico fija el comando y conserva outcomes por Membresía. La protección de unicidad mensual/única
debe compartir punto de serialización con la creación de la obligación correspondiente.

Idempotencia usa actor, Grupo, operación, key y hash canónico, incluido snapshot de concepto e
importes. La misma key/payload recupera; la misma key con payload distinto conflictúa. Una key
diferente no evita la unicidad económica. El intent conserva estado durable por fila y una respuesta
incompleta no crea outcomes `FAILED` sintéticos.

### 3.2 Revalidaciones y fallos

El claim revalida ownership y concepto/version y fija el snapshot. Cada fila pendiente revalida
lifecycle de Grupo/Temporada/Membresía, elegibilidad discriminada, unicidad y que el concepto siga
activo. Renombre o cambio de importe posterior no altera el snapshot ni bloquea la fila. Si
desactivación confirma primero, la fila termina `FAILED/CHARGE_CONCEPT_DEACTIVATED`; si la creación
confirma primero, la obligación permanece. Ambas transacciones leen el mismo concepto y la
desactivación lo escribe.

Recovery reautoriza al actor, pero un outcome terminal no exige concepto activo y nunca se
reejecuta. Sin autorización vigente no se devuelve outcome ni snapshot. Los cambios concurrentes
producen outcome o recovery explícito; no hay éxito parcial oculto ni incertidumbre convertida en
fracaso.

### 3.3 Persistencia y acceso

- clientes sin acceso directo a Pago, conceptos, ocurrencias o intents;
- writers y readers exclusivamente backend;
- referencias correlacionadas inmutables no sustituyen fuentes canónicas;
- consultas propias derivan Persona;
- proyecciones sólo derivadas y reconstruibles;
- nombres físicos, índices, límites y retención se fijan en ficha revisada, no en este addendum.

### 3.4 Tiempo

Meses y fechas civiles usan `America/Argentina/Buenos_Aires`, nunca la zona del dispositivo. Mes y
vigencia son intervalos semiabiertos. Esta semántica no modifica timestamps ni validez E2: un
intervalo admitido con inicio igual a fin conserva su dato y estado, pero no acredita solapamiento
económico.

### 3.5 Límites mínimos

- textos NFC, sin controles, con máximos 80 code points/160 bytes para concepto, 100/200 para
  ocurrencia y 240/480 para motivo;
- importes enteros `1..999_999_999_999` centavos;
- lote `1..50` Membresías y hasta 50 excepciones;
- páginas `1..50`, default 20, con orden/cursor estable;
- intents/receipts sin TTL hasta política que preserve tombstone y recovery.

El detalle contractual y fundamento se mantiene en la ficha E3-01 para evitar duplicación.

## 4. Compatibilidad y no efectos

Este addendum:

- no modifica Plan/Suscripción;
- no reabre CU-013;
- no crea desarchivo; la liquidación prospectiva de archivo sólo modifica Pagos preexistentes;
- no concede Tesorería ni resuelve D5-043;
- no define avisos, ingresos, Caja o devolución;
- no migra deuda sin vigencia demostrable;
- no retira todavía autoridades económicas legacy;
- no modifica catálogos/tombstones D5-044;
- no reabre E2-14 ni altera D5-045;
- no autoriza código, Rules, índices, datos, pruebas o deploy.

## 5. Integración documental

1. Este addendum complementa funcionalmente Documento 2, delimita las relaciones de Documento 3 y
   fija las restricciones arquitectónicas de Documento 4 para E3-01.
2. La ficha E3-01 conserva contratos, nombres físicos, queries, índices y criterios verificables; no
   se duplican aquí.
3. El addendum de liquidación prearchivo complementa separadamente E2-23 y sólo se vuelve operativo
   con los futuros cortes económicos que implemente.
4. DEC-E3-01 / D5-046 fija el orden del primer corte y conserva el gate económico de Etapa 3.

## Resultado

`ADDENDUM E3-01 APROBADO PARA VERSIONAR — FUENTE COMPLEMENTARIA SIN AUTORIZACIÓN DE IMPLEMENTACIÓN`
