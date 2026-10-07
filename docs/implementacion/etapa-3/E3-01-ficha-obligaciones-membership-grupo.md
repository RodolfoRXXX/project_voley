# E3-01 — Conceptos, generación y consulta de obligaciones por Membresía de Grupo

## Estado de la ficha

- **Estado:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Fecha:** 2026-10-07.
- **Base:** `dev` en `1ba808eb98bc696e8a2214e48b1a75879d250ce6`; referencia local
  `origin/dev` coincidente `+0/-0`, sin `fetch`.
- **Etapa:** Etapa 3 — Pago deportivo independiente.
- **Resultado del corte:** conceptos → generación explícita de obligaciones por Membresía →
  consultas administrativas y propias.
- **Autorización:** preparación documental. Esta ficha no autoriza implementación, configuración,
  Rules, índices, pruebas, Emulator, acceso remoto, deploy ni operaciones Git de escritura.

La definición funcional se formaliza mediante el
[addendum E3-01](../../arquitectura/Documento-2-3-4-addendum-E3-01-pago-obligaciones.md), la
[DEC-E3-01 / D5-046](./DEC-E3-01-primer-corte-y-coordinacion-E3-E4.md) y el
[addendum de liquidación prearchivo](../../arquitectura/Documento-2-addendum-E3-liquidacion-grupo-archivado.md).
Esta ficha concentra los contratos y decisiones físicas para no duplicarlos en la norma funcional.
“Listo para implementar” describe completitud documental y no concede autorización de ejecución.

## 1. Identificación y trazabilidad

- **ID:** E3-01.
- **Nombre:** Conceptos, generación y consulta de obligaciones por Membresía de Grupo.
- **Actor de mutación:** Owner vigente del Grupo.
- **Actores de consulta:** Owner vigente; integrante o exintegrante sobre su economía propia.
- **Casos incluidos:** CU-078; generación de obligación requerida por PF-05; porciones de CU-082 y
  CU-083 limitadas a obligaciones sin ingresos.
- **Casos excluidos:** CU-079–081, CU-084–086, Tesorería, avisos, ingresos, correcciones,
  condonación, reversión, devolución, Caja, pagos de Torneos y partidos sociales.

Fuentes vigentes:

1. Documento 1, `Pago`: economía deportiva de Grupo separada de Suscripción.
2. Documento 1.5, `Pago`: obligación o movimiento económico relacionado con Grupo/Membresía.
3. Documento 2 AUD-C04, PF-05 y CU-078–CU-086.
4. Documento 3 AUD-C05, §§6.10 y 8.7: Pago como Aggregate Root; movimientos e historia internos.
5. Documento 4 AUD-C05: referencias externas, unidad de consistencia y separación Pago/Suscripción.
6. Documento 5, §7.5 y D5-027/D5-043–046.
7. Aclaraciones AUD-C05 de Períodos: Pagos fuera de Membresía; CU-028 conserva raíz y CU-029 crea
   otra.
8. E2-18/E2-19: renovación, lineage e historia propia por raíces exactas.
9. Addenda E2-23/E2-24: archivo read-only, inexistencia de desarchivo y bloqueo de eliminación por
   referencias funcionales.
10. Addendum E3-01 y addendum de liquidación prearchivo: obligación independiente, elegibilidad,
    lifecycle económico y excepción prospectiva cerrada al archivo.

## 2. Finalidad y valor operativo

Permitir que el Owner defina conceptos económicos del Grupo, genere manualmente obligaciones para
Membresías seleccionadas y consulte el resultado; cada Persona con Cuenta vinculada puede consultar
exclusivamente las obligaciones de sus Membresías activas y finalizadas.

El corte ya entrega una capacidad completa de administración de deuda, no sólo infraestructura:

- concepto estable y administrable;
- generación explícita con snapshots;
- cuotas omitidas recuperables dentro de límites canónicos;
- resultado independiente por Membresía y reintento recuperable;
- consulta administrativa y propia privada;
- historia coherente ante finalización, reactivación y renovación.

No registra dinero. Por ello los totales de ingresos, condonaciones y saldo compuesto permanecen
fuera de la interfaz E3-01.

## 3. Semántica de Pago en este corte

Cada raíz **Pago** representa una obligación económica deportiva concreta. Referencia exactamente
una raíz Membresía y conserva su propia identidad, importe exigible, moneda, concepto snapshot,
período u ocurrencia, vencimiento e historia futura.

No se crean Agregados Concepto, Ocurrencia, Aviso, Ingreso, Movimiento o Condonación. Concepto y
Ocurrencia son definiciones subordinadas al Módulo Pagos; los futuros efectos
económicos pertenecen a la raíz Pago.

Para evitar equiparar saldo cero con pago íntegro, la proyección futura deberá separar al menos:

- importe exigible vigente;
- ingresos netos confirmados;
- importe condonado;
- saldo resultante;
- composición que llevó el saldo a cero.

`SETTLED` o la etiqueta de UI aprobada podrá significar saldo cero, pero nunca deberá presentarse
automáticamente como “pagada íntegramente”. E3-01 crea obligaciones sin movimientos y no fija aún
el contrato público de esa proyección futura.

El estado económico de obligación se mantiene separado del estado de un futuro aviso. En E3-01
toda obligación nace `PENDING`, con importe exigible íntegro. `PARTIAL` y `SETTLED` quedan reservados
para el corte que incorpore movimientos; `SETTLED` deberá acompañarse del desglose de ingresos netos
y condonaciones que explique el saldo cero.

## 4. Conceptos

### 4.1 Operaciones Owner

Sólo el Owner vigente puede:

1. crear un concepto;
2. renombrarlo;
3. modificar su importe general;
4. desactivarlo.

El tipo `MONTHLY` o `ONE_TIME` es inmutable una vez creado. No existe reactivación de concepto en
E3-01. Desactivar impide nuevas generaciones y conserva consultas, obligaciones e historial.

El concepto es una plantilla. Cada obligación copia como snapshot:

- `conceptId` estable;
- `conceptVersion` confirmada por el Owner;
- nombre presentado;
- tipo;
- importe general del concepto en esa versión;
- importe aplicado;
- moneda;
- período u ocurrencia;
- vencimiento;
- motivo de excepción, cuando corresponda.

Renombrar, cambiar importe general o desactivar nunca reescribe snapshots anteriores.

Todo concepto nace con `version = 1`; cada renombre, cambio real de importe o desactivación
confirmada incrementa exactamente uno. Un no-op no cambia versión ni consume intención. Toda lectura
administrativa devuelve esa versión como entero seguro positivo. Crear una
intención de generación exige `expectedConceptVersion`. En la transacción que reclama la intención,
Pagos lee concepto activo y exige esa versión; el claim fija de manera inmutable el snapshot común
del lote. Actualizar o desactivar concepto y reclamar generación serializan sobre el mismo documento:

- si el cambio confirma primero, el claim falla `CONCEPT_VERSION_STALE` y no crea outcomes;
- si el claim confirma primero, esa intención conserva nombre, tipo, moneda e importe del snapshot
  aunque el concepto se renombre o cambie de importe después;
- otra generación requiere una intención nueva y la versión vigente.

El claim no congela el estado activo para todas las filas. Antes de crear cada obligación pendiente,
la transacción lee otra vez el mismo concepto y exige que continúe activo, sin exigir que conserve la
versión del snapshot. Así, renombre/cambio de importe no altera el intent, pero desactivación impide
nuevos efectos pendientes.

### 4.2 Importe y moneda

- Moneda inicial y única: `ARS`.
- Precisión: unidad menor entera, centavos, escala fija de dos decimales.
- El frontend puede recibir texto decimal localizado, pero el límite de confianza normaliza y
  valida exactamente a entero; no se persisten ni calculan importes con punto flotante.
- Todo importe de concepto u obligación debe ser positivo.
- `baseAmountMinor` del lote debe coincidir exactamente con `defaultAmountMinor` del snapshot de
  concepto reclamado. Una diferencia no es una excepción global: el Owner primero modifica el
  concepto y confirma su nueva versión, o conserva el importe general vigente.
- Una excepción por Membresía reemplaza el importe general sólo para esa obligación y exige motivo
  normalizado no vacío. Su importe debe diferir de `baseAmountMinor`; si coincide, el comando falla
  validación y el Owner debe retirar esa excepción.
- No hay prorrateo, recargo, interés, excedente ni crédito automático.

ARS se aplica como regla del Módulo Pagos; E3-01 no agrega configuración monetaria a Grupo ni
reabre CU-013.

## 5. Elegibilidad mensual

Una cuota mensual sólo puede generarse si, al confirmar cada obligación:

1. el Grupo está activo y conserva al actor como Owner;
2. la Temporada referida por la Membresía está abierta;
3. el mes es el vigente o uno anterior en `America/Argentina/Buenos_Aires`;
4. la Membresía pertenece exactamente a ese Grupo y Temporada;
5. existe una vigencia canónica de esa raíz con intersección temporal no vacía con el mes;
6. la raíz, sus fronteras y sus Períodos requeridos son íntegros;
7. no existe la obligación según la clave de negocio mensual.

El mes civil se representa como intervalo semiabierto `[monthStart, nextMonthStart)`, desde las
`00:00` del primer día hasta las `00:00` del primer día siguiente al mes, en la zona única del
producto. Cada vigencia se interpreta como `[startedAt, endedAt)`; una abierta usa infinito como
extremo superior. Existe solapamiento sólo si `startedAt < nextMonthStart` y
`endedAt > monthStart`, sustituyendo `endedAt` por infinito cuando está ausente.

Evidencia focal: `membershipValidityPeriod.js:47-49` rechaza sólo `endedAt < startedAt`, por lo que
admite igualdad; `membership.js:136` impide que una reactivación comience antes del fin anterior.
Esto conserva orden/no superposición entre activaciones, pero no hace suficiente leer un único
documento: un intervalo vacío posterior puede preceder en la query a otro no vacío que solapa el
mismo mes.

Esta regla es compatible con E2 porque conserva los timestamps autoritativos y la correlación
`fechaEgreso == endedAt`; no cambia schemas, estados ni escritores. E2 admite `startedAt == endedAt`
y dejó sin fijar su significado normativo. E3 no reinterpreta ese dato como corrupción: el intervalo
semiabierto tiene duración cero, no se superpone con ningún mes y la fila falla explícitamente con
`MEMBERSHIP_VALIDITY_NOT_OVERLAPPING`.

### 5.1 Membresía finalizada

Una Membresía finalizada puede recibir una obligación omitida únicamente cuando:

- su Temporada continúa abierta;
- un Período canónico demuestra que estuvo vigente durante el mes;
- se cumplen las mismas reglas de Grupo activo, unicidad y snapshot.

Esto no reabre la Membresía ni inventa vigencia. Una Temporada cerrada impide toda generación,
incluso para meses anteriores. Una deuda ajena a una vigencia demostrable es importación histórica,
queda fuera de E3-01 y requiere decisión/migración propias.

La capacidad hidrata todas las formas canónicas vigentes mediante el dominio de Membresía; no
decide semántica sólo por `schemaVersion`. Actualmente son v1–v6:

- v1 activa: `[fechaIngreso, +infinito)`;
- v2 finalizada: `[fechaIngreso, fechaEgreso)`.
- v3/v4: formas period-aware; usan exclusivamente sus Períodos reales;
- v5 legacy activa sin `latestPeriodId/periodCount`: `[fechaIngreso, +infinito)` sin materializar;
- v5 period-aware activa/finalizada: usa exclusivamente sus Períodos reales;
- v6 activa/finalizada con lineage: usa exclusivamente sus Períodos reales.

`cargo` opcional en v5/v6 y `previousMembershipId` en v4/v6 se validan como parte del schema, pero
no acreditan vigencia, elegibilidad o autorización y no se exponen a Pagos. La distinción de v5 se
realiza por su forma cerrada validada y metadata temporal, no por asumir que toda v5 es legacy o
period-aware.

No materializa Períodos ni modifica raíz, fechas o historia. Campos ausentes, tipos inválidos,
`fechaEgreso < fechaIngreso`, referencias incompatibles o cualquier schema no reconocido producen
`MEMBERSHIP_VALIDITY_UNPROVABLE` para esa fila y ninguna obligación. Igualdad produce un intervalo
vacío válido para E2, pero no elegible para E3.

Para toda forma period-aware v3/v4/v5/v6 no basta leer sólo primera y última frontera: la capacidad
debe comprobar los Períodos reales necesarios para el mes y no inferir actividad a través de gaps
entre reactivaciones. Una versión futura o forma no reconocida falla cerrada, pero ninguna forma
canónica vigente puede rechazarse por omisión del contrato E3.

## 6. Cobro único

La clave de negocio aprobada es:

`membershipId + conceptId + occurrenceKey`.

`occurrenceKey` es una identidad opaca asignada por backend a una ocurrencia explícita, nombrada y
estable bajo un concepto `ONE_TIME`. La ocurrencia se crea antes del lote y se reutiliza en lotes
complementarios. La interfaz y el contrato de creación deben listar primero las ocurrencias
existentes del concepto para que el Owner seleccione una o confirme conscientemente otra.

El nombre se presenta y normaliza, pero no es clave y no se deduplica automáticamente: dos nombres
iguales no prueban identidad y dos distintos no prueban cobros diferentes. Crear otra ocurrencia es
un comando funcional auditable, no una idempotency key nueva. E3-01 no permite renombrarla,
eliminarla ni cambiarla; al crear la primera obligación queda además registrada como usada y todos
sus atributos permanecen inmutables. Una segunda generación sobre la misma ocurrencia sólo completa
Membresías faltantes y converge por la clave de negocio.

### 6.1 Elegibilidad aprobada

El cobro único no usa `periodKey` ni la regla de solapamiento mensual. Al confirmar cada fila:

1. el Grupo esté activo y conserve al actor como Owner;
2. la Temporada exacta de la Membresía esté abierta;
3. la Membresía esté activa, íntegra y correlacionada con Grupo/Temporada;
4. la ocurrencia pertenezca al concepto `ONE_TIME` y al mismo Grupo;
5. no exista la clave `membershipId + conceptId + occurrenceKey`.

No se autorizan cobros únicos retroactivos sobre Membresías finalizadas.

## 7. Fechas y vencimiento

- Zona única: `America/Argentina/Buenos_Aires`.
- `periodKey`: cadena estricta `YYYY-MM` válida en esa zona y exclusiva de `MONTHLY`.
- `dueDate`: fecha civil estricta `YYYY-MM-DD`, interpretada en esa zona e inclusiva para la UI.
- “Vencida” se deriva cuando terminó el día civil de vencimiento y existe saldo positivo; no es un
  estado económico persistido.
- No se usa la zona del dispositivo ni una zona configurable del Grupo.
- E3-01 permite vencimiento pasado, presente o futuro: una cuota omitida puede conservar su
  vencimiento histórico explícito. No se infiere desde el concepto o el mes.

## 8. Unicidad e idempotencia

### 8.1 Claves de negocio

- mensual: `membershipId + conceptId + periodKey`;
- único: `membershipId + conceptId + occurrenceKey`.

Las claves deben tener representación determinista y protección transaccional propia. Cambiar
nombre, importe o vencimiento, desactivar/reactivar una Membresía o usar otra clave idempotente no
permite otra obligación con la misma clave de negocio.

### 8.2 Idempotencia técnica

- Crear/modificar/desactivar concepto: `actor + groupId + operation + idempotencyKey`.
- Generar lote: `actor + groupId + generationIdempotencyKey` más hash canónico del comando.
- Mismo scope, key y payload recupera el resultado estable.
- Misma key con payload distinto devuelve `IDEMPOTENCY_CONFLICT`.
- Una key nueva no evita la unicidad económica.

La evidencia del lote distingue estado técnico de outcome terminal:

- `PENDING`: aún no se confirmó resultado funcional;
- `UNCERTAIN`: el intento perdió certeza de commit y exige reconciliación autoritativa;
- `CREATED`, `EXISTING` o `FAILED`: terminales e inmutables.

No se publica `UNCERTAIN` como fracaso. La respuesta usa `PENDING_RECOVERY` y `complete: false` hasta
reconciliar. La evidencia no convierte el lote en un Agregado ni en autoridad económica.

## 9. Lote y recuperación

El backend pre-valida el comando y procesa cada Membresía como unidad independiente:

- `CREATED`: obligación creada en esta intención;
- `EXISTING`: ya existía la misma clave de negocio **y** su payload económico inmutable coincide
  exactamente con el solicitado; se devuelve el valor efectivamente persistido;
- `FAILED`: error funcional definitivo y explícito de esa fila, sin obligación creada;
- `PENDING_RECOVERY`: no terminal; dependencia transitoria, respuesta interrumpida o commit incierto.

Un fallo no revierte obligaciones confirmadas de otras filas. La respuesta nunca presenta el lote
como éxito total si existen fallos o pendientes. Reintentar la misma intención:

- recupera `CREATED`, `EXISTING` y `FAILED` sin cambiarlos;
- reanuda `PENDING`;
- reconcilia `UNCERTAIN` leyendo receipt, raíz y unicidad antes de decidir si quedó creada o si puede
  reintentarse;
- nunca vuelve a ejecutar una fila `FAILED`.

Corregir una causa terminal y volver a intentar esa Membresía exige una intención nueva, siempre
sujeta a la misma unicidad económica. `DEPENDENCY_UNAVAILABLE`, contención agotada, timeout o
respuesta perdida no se convierten en `FAILED` si no existe evidencia autoritativa de fracaso.

Cada fila tiene identidad técnica determinista dentro del intent y hash del payload económico. La
creación de Pago confirma atómicamente la raíz y evidencia de esa fila `CREATED`; `EXISTING` o
`FAILED` se registran sólo después de una lectura autoritativa. En recovery:

1. tras reautorizar al actor vigente, evidencia terminal correlacionada prevalece y se devuelve sin
   reejecutar, aunque el concepto esté desactivado;
2. Pago creado por esa fila y hash exacto permite terminalizar `CREATED`;
3. Pago previo exacto permite terminalizar `EXISTING`;
4. Pago previo diferente permite terminalizar `FAILED/OBLIGATION_PAYLOAD_CONFLICT`;
5. ausencia demostrada de Pago/evidencia devuelve la fila a `PENDING` para reintento;
6. lectura incompleta o dependencia no disponible conserva `UNCERTAIN`.

Si no conserva autorización, recovery no expone Pago, snapshot ni outcome. La desactivación nunca
reescribe `CREATED/EXISTING/FAILED` ya terminales y una fila `FAILED` no se reejecuta con la misma
intención.

### 9.1 Comparación de obligación existente

Ante una clave de negocio ocupada, `EXISTING` exige igualdad exacta entre lo persistido y la fila
fijada en el intent:

- `groupId`, `membershipId`, `personId` y `seasonId` correlacionados;
- `conceptId`, `conceptVersion`, nombre, tipo, moneda e importe general del snapshot;
- `periodKey` u `occurrenceKey`, de forma discriminada;
- `amountMinor` aplicado;
- presencia/ausencia y motivo normalizado de excepción;
- `dueDate` civil.

Si cualquier campo difiere, la fila termina `FAILED` con `OBLIGATION_PAYLOAD_CONFLICT`; no adopta,
sobrescribe ni afirma haber aplicado el importe solicitado. La respuesta de conflicto puede devolver
una presentación minimizada del existente al Owner, claramente rotulada `persisted`, pero nunca el
payload pedido como resultado confirmado.

Antes de confirmar cada fila se revalidan atómicamente o mediante el guard serializador aprobado:

- ownership vigente;
- Grupo activo;
- Temporada abierta;
- integridad, referencia y vigencia de Membresía;
- snapshot fijado por el claim de generación;
- concepto todavía activo para una fila pendiente, sin exigir la versión vigente del snapshot;
- unicidad económica.

Finalización de Membresía, cierre de Temporada, archivo de Grupo, transferencia de ownership,
desactivación/cambio de concepto durante el claim o generación concurrente deben producir un
resultado único y observable. No se admite validar todo fuera de transacción y escribir luego con
estado obsoleto.

Creación de fila y desactivación leen el mismo concepto; la desactivación lo escribe. Si desactivar
confirma primero, la fila reintenta/lee inactivo y termina `FAILED/CHARGE_CONCEPT_DEACTIVATED`. Si la
fila confirma primero tras leer activo, la obligación permanece y la desactivación posterior sólo
impide efectos aún pendientes.

## 10. Flujo principal

### 10.1 Concepto

1. Owner abre Economía de un Grupo activo.
2. Crea `MONTHLY` o `ONE_TIME` con nombre e importe ARS.
3. Backend reautoriza ownership, valida contrato y confirma la definición.
4. Renombre/cambio de importe usan versión esperada; desactivación preserva historia.

### 10.2 Generación

1. Para `MONTHLY`, Owner fija el mes y pagina candidatos activos/finalizados mediante
   `ListOwnerMonthlyMembershipCandidates`; para `ONE_TIME`, usa exclusivamente el roster activo.
2. Owner selecciona concepto/version, ocurrencia cuando corresponda y Membresías elegibles.
3. Confirma el importe general mostrado, vencimiento y excepciones motivadas.
4. Backend deriva Grupo/Temporada/Persona y no acepta esos IDs como autoridad del cliente.
5. Reclama el intent fijando snapshot común; mensual valida solapamiento y ONE_TIME aplica sólo la
   elegibilidad que resulte aprobada.
6. Crea una raíz Pago por unidad elegible o recupera la existente.
7. Devuelve resultados independientes y refresca la consulta administrativa.

### 10.3 Consulta propia

1. Backend deriva Persona desde la Cuenta autenticada.
2. Membresías enumera sus raíces activas y finalizadas mediante el contrato histórico canónico.
3. Pagos consulta por las `membershipId` exactas y compone contexto mínimo de Grupo/Temporada.
4. No recorre lineage ni copia obligaciones entre raíces.

## 11. Lifecycle y referencias

- Finalizar Membresía no cancela, paga ni mueve obligaciones.
- Reactivar CU-028 conserva `membershipId`; consulta y unicidad siguen sobre esa raíz.
- Renovar CU-029 crea otra `membershipId`; obligaciones nuevas refieren la nueva raíz y las
  anteriores permanecen en la predecesora.
- La consulta conjunta se compone desde las raíces propias, sin duplicar datos.
- Cerrar Temporada impide generar, pero no oculta obligaciones existentes.
- Archivar Grupo impide conceptos, ocurrencias y obligaciones nuevas. E3-01 permite únicamente
  consultas Owner/propias. Los cortes económicos posteriores podrán liquidar obligaciones creadas
  antes del archivo: integrante/exintegrante informa sobre la propia y Owner vigente registra,
  confirma/rechaza, corrige o condona conforme a políticas aprobadas. Esas operaciones modifican
  Pago, no Grupo, y no forman parte de E3-01.
- No existe desarchivo canónico: E2-23 sólo aprobó `activo -> archivado`.
- Toda referencia de Pago a Grupo bloquea CU-015 y nunca se elimina en cascada.

Una obligación es anterior al archivo cuando su creación fue confirmada por el writer canónico tras
leer el Grupo `activo` en su transacción, y su `createdAt` autoritativo no es posterior al
`archivedAt` autoritativo del Grupo. El cliente no aporta ninguno de esos timestamps. Crear Pago y
archivar deben leer el mismo documento Grupo: si archivo confirma primero, el retry de creación ve
`archivado` y falla; si creación confirma primero, la obligación es preexistente y archivo puede
continuar. No se requiere que archivo modifique Pago ni que Pago modifique Grupo.

Una Persona sin Cuenta puede tener obligación porque la autoridad es su Membresía. No puede usar la
consulta propia hasta disponer del vínculo Cuenta–Persona por un flujo autorizado existente.

## 12. Privacidad y autorización

| Operación | Owner vigente | Integrante/exintegrante | Otro actor |
| --- | --- | --- | --- |
| administrar concepto | sí, Grupo activo | no | no |
| generar obligación | sí, Grupo/Temporada elegibles | no | no |
| consulta del Grupo | sí, incluso archivo read-only | sólo economía propia | no |
| consulta propia | si además es sujeto de una obligación | sí, por Persona derivada | no |

- Cargo `tesorero`, roles globales, arrays legacy, Plan/Suscripción o conocer IDs no autorizan.
- Firestore cliente debe permanecer sin acceso directo a Pagos, conceptos, intents o proyecciones.
- El backend revalida autorización por comando y página.
- DTO propio no expone `personId`, UID, motivos de excepciones ajenas, grants, hashes, schemas ni
  paths físicos.
- El Owner puede ver el motivo de excepción y la identidad presentable necesaria para administrar.

## 13. Contratos cerrados

### 13.1 Concepto

Entradas públicas mínimas:

- crear: `groupId`, `name`, `kind`, `defaultAmountMinor`, `idempotencyKey`;
- renombrar/importe: `groupId`, `conceptId`, campo nuevo, `expectedVersion`, `idempotencyKey`;
- desactivar: `groupId`, `conceptId`, `expectedVersion`, `idempotencyKey`.

Lectura/listado devuelve `conceptId`, `version`, nombre, tipo, `defaultAmountMinor`, estado y moneda
fija. Esa `version` es la que el Owner confirma como `expectedConceptVersion` al generar.

No se acepta moneda, actor, estado, timestamps o cambio de tipo desde cliente.

### 13.2 Ocurrencia

- listar: `groupId`, `conceptId`, cursor contextual;
- crear: `groupId`, `conceptId`, `expectedConceptVersion`, `name`, `occurrenceListToken`,
  `idempotencyKey`;
- salida: `occurrenceKey` opaca, nombre, estado `UNUSED | USED`, `createdAt` presentable y cursor.

Crear exige que el frontend haya obtenido la lista vigente o un token de versión equivalente. El
backend no deduplica por nombre. No hay update/delete de ocurrencia en E3-01.

### 13.3 Generación

Campos comunes:

- `groupId`, `conceptId`, `expectedConceptVersion`;
- lista única de `membershipIds` opacas;
- `dueDate`;
- `baseAmountMinor`, que debe igualar el importe general de esa versión;
- excepciones acotadas `{ membershipId, amountMinor, reason }`;
- `generationIdempotencyKey`.

Unión discriminada cerrada:

```text
MONTHLY  = common + { kind: "MONTHLY",  periodKey: "YYYY-MM" }
ONE_TIME = common + { kind: "ONE_TIME", occurrenceKey: string }
```

`MONTHLY` prohíbe `occurrenceKey`; `ONE_TIME` prohíbe `periodKey`. El backend exige que `kind`
coincida con el concepto snapshot. La elegibilidad mensual invoca la capacidad temporal; la
elegibilidad única exige Membresía activa al commit y nunca interpreta ausencia de `periodKey` como
permiso retroactivo.

No entran `personId`, `seasonId`, Períodos, estado, saldo, moneda, UID o timestamps.

### 13.4 Consultas

- administrativa: Grupo, filtros cerrados, orden fijo y cursor contextual;
- propia: sin filtro de Persona/Membresía aportado por cliente; las raíces se derivan;
- ambas devuelven identidad opaca, concepto snapshot, importe, ARS, mes/ocurrencia, vencimiento,
  estado `PENDING`, indicador temporal de vencimiento y contexto mínimo presentable.

## 14. Errores estables mínimos

| Código | Significado |
| --- | --- |
| `UNAUTHENTICATED` | falta sesión |
| `ACCOUNT_REQUIRED` / `PERSON_REQUIRED` | consulta propia sin identidad canónica |
| `GROUP_NOT_ACCESSIBLE` | inexistente o ajeno, sin enumeración |
| `GROUP_NOT_OPERATIONAL` | Grupo archivado para mutación |
| `OPEN_SEASON_REQUIRED` | Temporada cerrada/ausente para generación |
| `MEMBERSHIP_NOT_ELIGIBLE` | referencia, integridad o solapamiento inválido |
| `MEMBERSHIP_VALIDITY_NOT_OVERLAPPING` | vigencia válida pero sin intersección no vacía con el mes |
| `MEMBERSHIP_VALIDITY_UNPROVABLE` | fechas/Períodos legacy o canónicos ausentes/incoherentes |
| `CHARGE_CONCEPT_NOT_AVAILABLE` | inexistente, ajeno o incompatible |
| `CHARGE_CONCEPT_DEACTIVATED` | una fila pendiente perdió elegibilidad porque el concepto se desactivó |
| `CONCEPT_VERSION_STALE` | la versión confirmada cambió antes de reclamar la intención |
| `OCCURRENCE_NOT_AVAILABLE` | inexistente, ajena al concepto/Grupo o incompatible |
| `OBLIGATION_PAYLOAD_CONFLICT` | misma clave con snapshot, importe o vencimiento diferente |
| `VALIDATION_FAILED` | contrato/campo inválido |
| `IDEMPOTENCY_CONFLICT` | misma clave técnica y payload distinto |
| `CONCURRENT_MODIFICATION` | versión o lifecycle cambió antes de confirmar |
| `INCOMPATIBLE_STATE` | documento canónico inconsistente; falla cerrado |
| `DEPENDENCY_UNAVAILABLE` | no se presume éxito; admite recuperación |

`DEPENDENCY_UNAVAILABLE`, timeout, contención agotada y respuesta/commit inciertos mantienen la fila
en recovery; no son `FAILED` terminal sin una lectura autoritativa. Validación funcional definitiva,
inelegibilidad demostrada o payload conflictivo sí son terminales dentro de la intención. Un stale
de concepto rechaza el claim antes de crear la intención o outcomes.

`EXISTING` dentro de un lote es outcome terminal sólo cuando la obligación encontrada coincide
campo por campo con §9.1. La salida devuelve su snapshot e importe persistidos, no reetiqueta el
payload solicitado. No expone una obligación ajena.

## 15. Persistencia física, queries e índices

| Recurso lógico | Autoridad | Writer |
| --- | --- | --- |
| Pago/obligación | importe exigible e historia económica | backend Pagos |
| concepto | plantilla estable del Grupo | backend Pagos por Owner |
| ocurrencia | identidad estable de cobro único | backend Pagos por Owner |
| intent/receipt de lote | idempotencia y recovery, no economía | backend Pagos |

Campos correlacionados `groupId`, `personId` y `seasonId` pueden persistirse inmutables para consulta
y seguridad, pero la obligación pertenece a la `membershipId` original.

### 15.1 Nombres físicos y documentos

Todos son top-level salvo las filas del intent. Ninguno admite acceso Firestore cliente:

| Path físico | Identidad y campos mínimos |
| --- | --- |
| `groupChargeConcepts/{conceptId}` | ID opaca; `groupId`, `name`, `kind`, `currency: "ARS"`, `defaultAmountMinor`, `estado`, `version`, `createdAt`, `updatedAt`, `schemaVersion: 1` |
| `groupChargeOccurrences/{occurrenceKey}` | ID opaca; `groupId`, `conceptId`, `createdUnderConceptVersion`, `name`, estado `UNUSED`/`USED`, `createdAt`, `firstUsedAt?`, `schemaVersion: 1` |
| `payments/{paymentId}` | ID determinista opaca; referencias inmutables, snapshot, clave discriminada, importe, vencimiento, estado y evidencia de creación |
| `paymentGenerationIntents/{intentId}` | ID derivada de actor/Grupo/operación/hash de key; hashes, snapshots comunes recuperables, estado técnico y timestamps |
| `paymentGenerationIntents/{intentId}/rows/{membershipId}` | solicitud económica de fila, `payloadHash`, estado técnico/outcome, `paymentId?`, `errorCode?` y timestamps técnicos |
| `paymentCommandReceipts/{receiptId}` | idempotencia de concepto/ocurrencia: actor, Grupo, operación, hashes, recurso/outcome y timestamps |

`payments/{paymentId}` deriva de SHA-256 sobre la clave económica canónica con discriminador de
tipo. El hash completo es ID backend-only; no se acepta desde cliente y no reemplaza las
validaciones. Así, la creación del documento y la unicidad económica comparten el mismo punto
atómico sin una segunda autoridad.

Campos mínimos de `payments`: `groupId`, `membershipId`, `personId`, `seasonId`, `conceptId`,
`conceptSnapshot { version, name, kind, currency, defaultAmountMinor }`, `amountMinor`,
`exceptionReason?`, `dueDate` civil `YYYY-MM-DD`, exactamente uno de `periodKey | occurrenceKey`,
`estado: "PENDING"`, `generationIntentId`, `createdAt` autoritativo y `schemaVersion: 1`. No se
persisten saldo, recibido o vencido: no existen ingresos en E3-01 y vencimiento se deriva de la
fecha civil en `America/Argentina/Buenos_Aires`.

El intent conserva en claro, inmutable y sólo backend lo que un hash no puede reconstruir:

- `conceptSnapshot { conceptId, version, name, kind, currency, defaultAmountMinor }` fijado por el
  claim;
- `generationSnapshot { groupId, dueDate, periodKey | occurrenceKey, baseAmountMinor }`;
- por fila: `membershipId`, `appliedAmountMinor` y `exceptionReason?` normalizada.

Estos son datos de concepto y de la solicitud económica, no una copia de Persona. El intent no
guarda nombre/apellido de integrante, UID, email, cargo, lineage, documentos de Membresía/Período ni
presentaciones de Persona. `personId` y `seasonId` se rederivan autoritativamente desde la Membresía
en cada ejecución; sólo pasan a Pago si la fila confirma. Hashes, estados, outcomes, referencias y
timestamps son evidencia técnica y no sustituyen los snapshots recuperables.

En recovery, la misma key/request acredita el hash; luego el backend reautoriza, carga el intent y
su fila, reconstruye el comando desde esos snapshots y revalida concepto activo, lifecycle,
elegibilidad y unicidad actuales antes de reanudar `PENDING`. Un cambio posterior del concepto no
reescribe el snapshot; una desactivación sí impide el nuevo efecto conforme a §9. Outcomes
terminales se devuelven sin reejecutar y sin exigir concepto activo. No se crea un historial general
de conceptos: el snapshot existe únicamente dentro del intent y de cada Pago confirmado.

### 15.2 Queries canónicas

| Contrato | Query física | Orden/cursor | Índice compuesto futuro |
| --- | --- | --- | --- |
| conceptos Owner | `groupChargeConcepts where groupId ==` | `name ASC, __name__ ASC` | `groupId ASC, name ASC` |
| ocurrencias | `groupChargeOccurrences where groupId == && conceptId ==` | `createdAt DESC, __name__ DESC` | `groupId ASC, conceptId ASC, createdAt DESC` |
| obligaciones Owner | `payments where groupId ==` | `dueDate DESC, __name__ DESC` | `groupId ASC, dueDate DESC` |
| obligaciones propias | `payments where personId == <derivada>` | `dueDate DESC, __name__ DESC` | `personId ASC, dueDate DESC` |
| candidatos Owner MONTHLY | `memberships where groupId == && seasonId == && estado in [activa, finalizada] && fechaIngreso < nextMonthStart` | `fechaIngreso ASC, __name__ ASC` | existente: `groupId ASC, seasonId ASC, estado ASC, fechaIngreso ASC` |

E3-01 no ofrece filtros adicionales de estado, concepto, Membresía o Temporada; agregarlos exigiría
reabrir contrato e índice. CU-015 detecta cualquier Pago mediante `payments where groupId == limit
1`, cubierto por índice de campo único. Recovery usa lecturas directas de intent/fila/paymentId y no
requiere índice. Para una forma period-aware, la elegibilidad mensual consulta
`memberships/{membershipId}/validityPeriods` con `startedAt < nextMonthStart`, orden
`startedAt DESC, __name__ DESC`, en páginas internas de 20 hasta encontrar un Período **no vacío**
que cumpla `endedAt > monthStart`, o agotar candidatos. Un Período abierto usa infinito; uno cerrado
con `startedAt == endedAt` se hidrata como válido pero se omite por duración cero y la exploración
continúa. Por eso un Período vacío posterior no oculta otro anterior que sí solapa. Cada documento
se hidrata, su ordinal/ID se contrasta con la raíz y las fronteras primera/última se leen por ID
determinista. Toda la exploración ocurre en el mismo `unitOfWork` confirmatorio, sin escrituras.

El índice de campo único `startedAt` —con desempate `__name__` provisto por Firestore— basta para
esa subcolección. No se agrega índice compuesto. La query de candidatos Owner reutiliza el índice
`memberships(groupId, seasonId, estado, fechaIngreso)` ya declarado en
`volley-ranking-system/firestore.indexes.json:45`; por tanto continúan siendo cuatro los índices
compuestos nuevos de Pagos definidos arriba.

Los cuatro índices compuestos quedan requeridos por el diseño, pero esta formalización no modifica
`firestore.indexes.json` ni autoriza crearlos.

## 16. Frontend

- Sección Owner “Economía” dentro del Grupo canónico.
- Administración de conceptos con estado activo/desactivado.
- Para cobro único, listado obligatorio de ocurrencias existentes antes de ofrecer creación; luego
  selección de una ocurrencia estable.
- Generación manual desde selección de Membresías, con mes/ocurrencia, vencimiento, importe y
  excepciones motivadas.
- Para `MONTHLY`, selector paginado que muestra activas y finalizadas de la Temporada abierta,
  estado, fechas y resultado de elegibilidad del mes; sólo `ELIGIBLE` es seleccionable. Cambiar el
  mes invalida cursor y selección. Para `ONE_TIME`, el selector usa sólo roster activo.
- Confirmación previa y tabla final por fila: creada, existente o fallida.
- Consulta administrativa paginada.
- Superficie propia “Mis obligaciones”, separada del acceso operativo al Grupo.
- Zona y moneda se presentan explícitamente; no se deriva zona del navegador.
- Loading, vacío, stale, single-flight, recovery, parcial, no autorizado e incompatible.
- Feedback accesible mediante foco y `aria-live`, sin depender sólo del color.

No existen acciones E3-01 para avisar, registrar, validar, rechazar, corregir, anular, condonar,
revertir o devolver.

## 17. Servicios y contratos entre módulos

- `CreateGroupChargeConcept`;
- `RenameGroupChargeConcept`;
- `ChangeGroupChargeConceptDefaultAmount`;
- `DeactivateGroupChargeConcept`;
- `ListChargeOccurrences`;
- `CreateChargeOccurrence`;
- `ListOwnerMonthlyMembershipCandidates`;
- `GenerateMembershipObligations`;
- `ListGroupObligations`;
- `ListMyObligations`.

Capacidades consumidas:

- Grupo owned/activo y lectura histórica Owner;
- Temporada abierta correlacionada;
- roster activo para ONE_TIME y listado focal Owner de candidatas MONTHLY activas/finalizadas;
- historia propia de raíces Membresía;
- presentación mínima de Persona/Grupo/Temporada;
- detector de referencias bloqueantes para CU-015.

Pagos no importa repositorios internos de esos módulos ni los modifica.

### 17.1 Contrato cerrado de elegibilidad de Membresía

La capacidad pública de Membresía se invoca dentro de la unidad confirmatoria de cada fila:

```text
EvaluateMembershipObligationEligibility(
  unitOfWork,
  { kind: "MONTHLY", membershipId, groupId, periodKey, zone: "America/Argentina/Buenos_Aires" }
| { kind: "ONE_TIME", membershipId, groupId }
) ->
  { outcome: "ELIGIBLE", membershipId, personId, groupId, seasonId, membershipState }
| { outcome: "NOT_OVERLAPPING" }
| { outcome: "NOT_ACTIVE" }
| { outcome: "UNPROVABLE" }
```

La entrada es cerrada: Pagos no aporta `personId`, `seasonId`, fechas, Períodos, estado ni versión.
La salida sólo entrega referencias necesarias para crear Pago; no expone cargo, lineage, guards,
schema ni documentos. Cargo y lineage se validan cuando la forma los exige, pero no acreditan
vigencia ni autorizan. El roster E2-11 y la historia E2-19, por separado, no satisfacen este
contrato. La capacidad:

1. lee `memberships/{membershipId}` y aplica `hydrateMembership`, aceptando toda forma cerrada v1–v6
   por estructura y estado, nunca por una inferencia aislada del número;
2. correlaciona la raíz con `groupId`, Persona y Temporada exacta;
3. lee la Temporada exacta y exige `abierta` para ambos discriminadores;
4. para `MONTHLY`, acepta activa o finalizada y demuestra solapamiento: v1/v5 legacy usan sus fechas
   autoritativas sin escribir; v2 usa `fechaIngreso/fechaEgreso`; v3/v4/v5 period-aware/v6 leen el
   candidato real y las fronteras necesarias, sin cubrir gaps;
5. para `ONE_TIME`, exige raíz activa; en formas period-aware valida primera/última frontera, período
   abierto y metadata; en formas legacy valida las fechas autoritativas y el guard activo; en todas
   valida los guards/lifecycle aplicables y Temporada exacta abierta;
6. no crea Períodos, no corrige metadata, no migra schema y registra cero escrituras.

Mapeo estable: `NOT_OVERLAPPING` produce `MEMBERSHIP_VALIDITY_NOT_OVERLAPPING`; `NOT_ACTIVE` produce
`MEMBERSHIP_NOT_ELIGIBLE`; `UNPROVABLE`, que incluye ausencia, schema/fechas/Períodos/guards
incoherentes o referencia no correlacionada, produce `MEMBERSHIP_VALIDITY_UNPROVABLE` sin revelar
existencia ajena. Temporada ausente/cerrada correlacionada produce `OPEN_SEASON_REQUIRED` después de
autorizar el Grupo; dependencia transitoria conserva recovery y produce `DEPENDENCY_UNAVAILABLE`.

La capacidad no emite una autorización durable. La transacción de cada fila vuelve a leer mediante
el mismo `unitOfWork` Grupo, Temporada, Membresía, Períodos/guards necesarios, concepto y ocurrencia.
Si cualquiera cambia antes del commit, Firestore reintenta sobre el estado nuevo; inelegibilidad
confirmada termina la fila y falta de certeza queda `PENDING_RECOVERY`, nunca falso `FAILED`.

### 17.2 Listado Owner de candidatas MONTHLY

La lectura focal demuestra que `listActiveGroupMembersForOwnedGroup` sólo consulta `estado ==
"activa"` y la Temporada abierta (`firestoreActiveGroupMembersForOwnerReader.js:24-34`), mientras
`listMyGroupMembershipHistory` deriva la Persona propia y no autoriza una vista administrativa. Por
eso ninguno satisface la selección de finalizadas.

`ListOwnerMonthlyMembershipCandidates` se define únicamente para esta necesidad:

```text
input  = { groupId, periodKey, pageSize?: 1..20, cursor? }
item   = { membershipId, membershipState: "ACTIVE" | "FINALIZED",
           joinedAt, leftAt?, person: { status, firstName?, lastName? },
           eligibility: "ELIGIBLE" | "NOT_OVERLAPPING" | "UNPROVABLE" }
output = { items, nextCursor? }
```

El backend exige Owner vigente, Grupo activo y Temporada exacta abierta; deriva `seasonId` y límites
del mes en Buenos Aires. Consulta ambas formas con la query de §15.2, `limit(pageSize + 1)`, hidrata
v1–v6 y evalúa cada fila con §17.1 en una transacción read-only. El DTO no expone `personId`, UID,
email, cargo, lineage, schema, guards o paths. Persona no disponible produce presentación
`UNAVAILABLE`, no búsqueda alternativa.

El cursor es opaco, versionado y ligado a contrato, actor, `groupId`, `seasonId`, `periodKey`, orden
y ancla `{ fechaIngreso, membershipId }`; se reautoriza y revalida el ancla en cada página. Por
consistencia de paginación se devuelven también candidatas no elegibles con su razón cerrada, pero
el frontend sólo permite seleccionar `ELIGIBLE`. La generación no confía en el listado y revalida
todo al confirmar. No se introduce búsqueda general de Personas, invitación ni cambio de identidad.
Cursor malformado produce `VALIDATION_FAILED`; ancla o contexto que cambió produce
`CONCURRENT_MODIFICATION`; ausencia de Temporada abierta produce `OPEN_SEASON_REQUIRED`, siempre
después de acreditar ownership y sin enumerar recursos ajenos.

## 18. Concurrencia

Casos que deben probarse:

- dos generaciones con keys distintas y misma clave mensual/única;
- retry después de respuesta perdida;
- finalización/reactivación concurrente;
- cierre de Temporada o archivo de Grupo concurrente;
- transferencia de ownership concurrente;
- desactivación vs creación de fila en ambos órdenes;
- cambio de concepto antes/después del claim del intent y recuperación con snapshot fijado;
- recovery terminal después de desactivación, con y sin autorización vigente;
- una fila confirmada y otra inválida;
- obligation existente correlacionada e incompatible;
- respuesta incompleta y commit incierto sin falso `FAILED`;
- retry de `FAILED` que conserva outcome y nueva intención que reevalúa sin eludir unicidad.
- Período no vacío que solapa seguido por Período vacío dentro del mismo mes: el vacío se omite y el
  anterior acredita elegibilidad.
- recovery de fila pendiente tras renombre/cambio de importe: usa el snapshot almacenado, no el
  concepto actual ni un intento de reconstrucción desde hash.

El resultado esperado es una obligación como máximo por clave de negocio, sin escritura con
autorización o elegibilidad obsoletas, con outcome durable por fila y sin rollback oculto de filas
ya confirmadas.

## 19. Pruebas propuestas y UAT

No se ejecutan en esta definición.

| Nivel | Cobertura focal futura |
| --- | --- |
| Dominio | snapshot versionado, importe base/general, ARS entero/escala, concepto desactivado, unicidad, excepción+motivo |
| Membresía | matriz de formas canónicas v1–v6, v5 legacy/period-aware, v6 lineage, intervalos semiabiertos, gaps y cero escritura |
| Aplicación | ownership, lote parcial, terminal vs pending/uncertain, recovery, payload conflict y carreras de lifecycle |
| Contrato | schemas cerrados, extras, fechas BA, límites, errores estables |
| Integración | intents/outcomes, unicidad con keys distintas, bloqueo CU-015 |
| Rules | cero acceso cliente directo y cero enumeración ajena |
| Frontend | conceptos, selección, confirmación, parcial, retry, paginación, accesibilidad |
| Arquitectura | Pago fuera de Membresía/Grupo y sin Plan/Suscripción o raíces nuevas |

UAT mínimo futuro:

1. Owner crea mensual, cambia importe y comprueba que la obligación anterior no cambia.
2. Owner desactiva y ya no puede generar; la historia sigue visible.
3. Genera mes vigente y pasado con solapamiento; futuro y gap fallan.
4. v1/v2 y v5 legacy acreditan desde fechas autoritativas sin crear Períodos; v3/v4/v5
   period-aware/v6 usan Períodos; dato ausente/incoherente falla por fila con explicación.
5. Una finalizada de Temporada abierta con solapamiento admite obligación omitida; Temporada cerrada
   no.
6. Owner pagina candidatas MONTHLY activas/finalizadas, ve la finalizada elegible y puede
   seleccionarla; el mismo registro nunca aparece seleccionable para ONE_TIME.
7. Un Período vacío posterior dentro del mes no oculta un Período anterior no vacío que solapa.
8. Listar ocurrencias precede a crear; lotes complementarios reutilizan la misma y no duplican;
   ONE_TIME exige Grupo/Temporada abiertos y Membresía activa/íntegra.
9. Lote mixto devuelve creada/existente/fallo/pending recovery; retry conserva terminales y
   reconcilia inciertos sin duplicar.
10. Misma clave con snapshot/importe/vencimiento distinto devuelve conflicto y muestra como
   persistido sólo el valor realmente existente.
11. Cambio de concepto antes del claim da stale sin filas; cambio posterior no altera el snapshot del
   intent ya reclamado.
12. Desactivación que gana impide la fila pendiente con error estable; creación que gana conserva la
    obligación. Recovery terminal funciona sobre desactivado sólo con autorización vigente.
13. Reactivación conserva obligación; renovación muestra raíces diferentes en historia conjunta.
14. Integrante/exintegrante ve sólo lo propio; actor ajeno no enumera ni obtiene acceso operativo.
15. Grupo archivado permite consulta E3-01 y niega conceptos, ocurrencias y obligaciones nuevas.
16. Carrera archivo/generación deja obligación anterior al archivo o generación fallida, nunca Pago
    nuevo sobre Grupo ya archivado.
17. Una referencia Pago bloquea eliminación de Grupo y no se elimina en cascada.

## 20. Criterios de aceptación

1. Sólo Owner administra conceptos y genera.
2. Owner confirma `expectedConceptVersion`; el intent fija un snapshot común y cambios futuros no
   reescriben obligaciones.
3. ARS usa centavos enteros, sin punto flotante.
4. Mes y vencimiento usan `America/Argentina/Buenos_Aires` independientemente del dispositivo.
5. Sólo mes vigente/pasado con vigencia demostrable, intervalo semiabierto no vacío y Temporada
   abierta es elegible.
6. No se inventa, extiende ni corrige un Período desde Pagos.
7. Todas las formas v1–v6 aceptadas por el dominio se evalúan por su estructura canónica; cargo y
   lineage no alteran elegibilidad.
8. Unicidad económica prevalece sobre idempotencia.
9. El lote conserva outcomes terminales, reanuda sólo pendientes/inciertos y exige intención nueva
   para un fallo definitivo.
10. Concurrencia no confirma sobre ownership/lifecycle/elegibilidad obsoletos.
11. Consultas propias componen raíces activas/finalizadas sin aceptar Persona del cliente.
12. CU-028 conserva referencia; CU-029 genera otra referencia sin copiar deuda.
13. E3-01 trata Grupo archivado como consulta; la liquidación futura sólo modifica Pagos
    preexistentes y no existe desarchivo inferido.
14. Toda referencia Pago bloquea CU-015.
15. E3-01 no crea ingresos ni etiqueta saldo cero como pago íntegro.
16. `EXISTING` exige igualdad económica exacta y nunca afirma que se aplicó un payload diferente.
17. Una fila pendiente exige concepto activo; outcomes terminales se recuperan sobre concepto
    desactivado sólo después de reautorizar al actor.
18. Intent y fila conservan los valores económicos mínimos que permiten recovery; hashes verifican
    identidad pero no se usan para reconstruir snapshots.
19. La exploración period-aware no se detiene ante un intervalo vacío y detecta cualquier Período
    no vacío que solape el mes sin escribir historia.
20. El Owner puede listar y seleccionar finalizadas elegibles para MONTHLY mediante contrato
    paginado específico; ONE_TIME continúa usando exclusivamente activas.

## 21. Capacidades posteriores preservadas

- **E3-02:** resolución formal D5-043 y delegación/consulta Tesorería.
- **E3-03:** aviso propio y validación/rechazo, incluidas obligaciones prearchivo sobre Grupo
  archivado conforme al addendum prospectivo.
- **E3-04:** registro directo y prevención de duplicado de negocio aviso/entrega.
- **E3-05:** corrección/ajuste de obligación, condonación y reversión de registros erróneos; devolución
  real fuera del alcance actual.
- **E3-06:** Caja/movimientos/balance sólo con necesidad concreta.
- **Incrementos E3 coordinados con E4:** retiro de autoridades económicas embebidas en
  participaciones, equipos e inscripciones antes del cierre de E3.

Antes del primer ingreso debe aprobarse la política que separa ingreso real, corrección del exigible,
condonación, reversión de registro erróneo y devolución real. Esto bloquea E3-03/E3-04, no la
creación y consulta de obligaciones de E3-01.

D5-043 sigue pendiente hasta formalizar la primera capacidad delegable. Cargo `tesorero` no concede
permisos y E3-01 continúa Owner-only.

## 22. Retiro de autoridad legacy y coordinación E3/E4

E3-01 no sustituye `participations.pagoEstado` ni datos económicos de inscripciones/equipos. Por
ello no cumple por sí solo la salida de Etapa 3.

Documento 5 ya permite diseñar/implementar Pago por flujo en partidos/torneos y que E4 avance en
paralelo cuando sus contratos sean estables. La secuencia propuesta es:

1. E3 estabiliza Pago independiente con el flujo de Grupo/Membresía.
2. E4 define identificadores y contratos deportivos mínimos, sin asumir autoridad económica.
3. Incrementos E3 consumen esos contratos y sustituyen cada autoridad legacy.
4. E3 sólo puede cerrar después de demostrar que participaciones, equipos e inscripciones dejaron
   de decidir importes/estados/saldos.

La lectura previa demuestra la autoridad económica embebida, pero no demuestra todavía que cada
retiro necesite una implementación E4 completa. Esa dependencia es una precaución hasta definir el
corte concreto. Si la gobernanza interpreta las etapas como estrictamente seriales pese a la
paralelización escrita, deberá aprobarse una habilitación delimitada E4→E3; no se traslada el gate
económico a E4.

No se retiran catálogos ni tombstones D5-044.

## 23. Límites técnicos fijados

Estos límites cierran el contrato técnico E3-01; no amplían reglas de producto y cualquier cambio
requiere reabrir la ficha antes de implementar.

### 23.1 Textos

Todos se reciben como string, se normalizan NFC, se recortan extremos y se colapsan secuencias de
whitespace Unicode a un espacio. Se rechazan controles C0/C1, formatos bidi invisibles y texto que
quede vacío. El valor normalizado se usa en hash y persistencia.

| Campo | Mínimo/máximo | Límite UTF-8 | Observación |
| --- | --- | --- | --- |
| nombre de concepto | 1–80 code points | 160 bytes | no es identidad ni autoriza |
| nombre de ocurrencia | 1–100 code points | 200 bytes | no se deduplica por nombre |
| motivo de excepción | 1–240 code points | 480 bytes | visible sólo a administración autorizada y al sujeto de esa obligación |

Las idempotency keys conservan el patrón probado en E2:
`^[A-Za-z0-9._:-]{16,128}$`. No se persiste ni registra la clave cruda.

### 23.2 Importes

- entero seguro positivo en centavos;
- rango `1..999_999_999_999` centavos, equivalente a ARS `0,01..9.999.999.999,99`;
- suma de las 50 filas máximas permanece ampliamente bajo `Number.MAX_SAFE_INTEGER`;
- conversión decimal exacta, máximo dos decimales, sin redondeo silencioso, `NaN`, infinito,
  notación exponencial o separadores ambiguos.

### 23.3 Lote

- entre 1 y 50 `membershipIds` únicas;
- máximo 50 excepciones, cada una para una ID presente y sin duplicados;
- respuesta completa conserva exactamente una entrada por ID: outcome terminal o
  `PENDING_RECOVERY`; una respuesta interrumpida no se sintetiza como lista de fallos;
- cada obligación confirma en su propia unidad transaccional; el intent coordina recovery pero no
  ejecuta una transacción de 50 raíces;
- procesamiento backend puede limitar concurrencia interna, sin cambiar resultados ni orden lógico.

El límite 50 acota payload, lecturas de Membresía/Períodos, contención y feedback humano, y deja
margen respecto de límites de Firestore sin diseñar a su máximo.

### 23.4 Paginación

- `pageSize` por defecto 20, rango permitido 1–50;
- el listado Owner de candidatas MONTHLY conserva el límite canónico de Membresía: por defecto 20 y
  máximo 20, debido a la hidratación y evaluación temporal por fila;
- orden estable `dueDate DESC, paymentId DESC` para obligaciones;
- ocurrencias: `createdAt DESC, occurrenceKey DESC`;
- cursor opaco versionado y ligado a contrato, actor/Persona derivada, Grupo cuando corresponda,
  filtros, page size efectivo y ancla;
- se relee y valida el ancla; cursor inválido o desplazado falla sin página parcial;
- cursor no concede autoridad y no expone Persona, hashes internos o paths.

### 23.5 Evidencia idempotente

Intents, estados por fila y receipts confirmados se retienen sin TTL mientras no exista una política
aprobada que preserve un tombstone consultable con el mismo scope, hash y outcome. Son deny-all y no
contienen clave cruda, presentaciones o documentos de Persona, UID/email, cargo, lineage ni copias de
Membresía/Períodos.

El intent sí conserva el snapshot de concepto y generación y cada fila su importe/motivo opcional,
según §15.1, porque son los valores económicos mínimos necesarios para reanudar sin reinterpretar el
concepto vigente. Se clasifican como solicitud económica privada, no como evidencia técnica ni
snapshot personal. La evidencia técnica separada conserva actor necesario, referencias opacas,
hashes, estados `PENDING/UNCERTAIN`, outcomes terminales y timestamps. Una fila incierta conserva
además referencias mínimas para reconciliar receipt, Pago y clave de unicidad; nunca se marca fallida
por timeout o ausencia de respuesta. El hash prueba igualdad del reintento, pero nunca reconstruye
nombre, versión, importe, vencimiento o motivo.

La retención indefinida es coherente con los contratos E2 y evita que una key antigua vuelva a
crear obligaciones después de archivo, reactivación o renovación. Cualquier cleanup requiere una
decisión posterior; no puede liberar unicidad económica.

## 24. Condiciones posteriores no bloqueantes para E3-01

No quedan decisiones, contratos o definiciones técnicas bloqueantes dentro de E3-01. Permanecen
fuera de este corte:

1. autorización expresa para implementar E3-01 y, posteriormente, para crear los índices definidos;
2. D5-043 antes de la primera delegación real de Tesorería;
3. antes del primer ingreso, política separada de corrección, reversión errónea, condonación y
   devolución real;
4. autorización propia para cada incremento E3/E4 posterior y demostración del retiro legacy antes
   de cerrar Etapa 3;
5. reevaluación productiva exigida por D5-045.

## 25. Checkpoint, evidencia y autorización

- No hay migración, backfill, borrado o doble escritura aprobados.
- No se ejecutaron pruebas por alcance.
- D5-041–046, E2-25, DEC-E2-26 y DEC-E3-01 permanecen vigentes.
- D5-045 no se reabre sin evidencia concreta ni autoriza producción.
- La rama Auth/UAT aislada no es dependencia de E3-01.
- Evidencia de cierre sólo aplica después de implementación autorizada y deberá incluir código,
  contratos, Rules, pruebas, Emulator, UAT, concurrencia, privacidad y bloqueo de eliminación.

## Declaración final

`LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`

No quedan decisiones funcionales, contratos ni definiciones técnicas pendientes dentro del alcance
E3-01. La política de correcciones/ingresos y D5-043 pertenecen a cortes posteriores y no bloquean
crear y consultar obligaciones. Este estado no autoriza código, configuración, Rules, índices,
pruebas, Emulator, acceso remoto, deploy ni operaciones Git de escritura.
