# DEC-E3-08 — Consulta de movimientos de ingresos registrados

## Estado

- **Tipo:** decisión normativa adoptada para E3-08.
- **Decisiones funcionales aprobadas:** `E3-08-D01=A`, `D02=A`, `D03=A`, `D04=A`.
- **Decisión de Documento 5:** `D5-053`.
- **Estado:** `APROBADA`.
- **Estado del incremento:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Base:** `dev` en `39135a830a1e5bf17eca18cd46569715c04cce1a`, verificada el 21 de octubre
  de 2026 sin `fetch` ni cambio de rama.

Esta decisión adopta el corte y el addendum E3-08 a Documentos 2/3/4. Documento 5 incorpora la
continuidad mínima y D5-053. La adopción documental no autoriza implementación, pruebas,
configuración, Rules, índices, dependencias, Firebase remoto o deploy, y no acredita los gates A/B.

Paquete relacionado: [ficha E3-08](./E3-08-ficha-consulta-movimientos-ingresos.md) y
[addendum a Documentos 2/3/4](../../arquitectura/Documento-2-3-4-addendum-E3-08-consulta-movimientos-ingresos.md).

## 1. Contexto y corte

E3-01–E3-07 dejaron estables las obligaciones Pago, las Recepciones `INFORMED | ADMINISTRATIVE`,
sus aplicaciones, los ingresos y sus reversiones, la corrección, anulación y condonación. Pago
conserva deuda, ingreso neto, condonación, saldo y estado; Recepción conserva identidad, origen,
líneas, total, fechas y lifecycle.

E3-08 entrega un único corte consultivo: movimientos de ingresos registrados por Grupo y período,
con totales exactos y paginación. No crea Caja, Movimiento persistido, balance contable, escritor,
proyección o autoridad paralela. Responde cuánto ingreso y cuánta reversión registral confirmó el
sistema en el período; no responde cuánto efectivo existe ni cuánto se adeuda.

## 2. Decisiones funcionales aprobadas

### E3-08-D01=A — Eje temporal registral

- ingreso informado usa `confirmedAt`;
- ingreso administrativo usa `recordedAt`;
- reversión usa `reversedAt`;
- `declaredPaidOn | receivedOn` se muestra como fecha efectiva informativa;
- filtros civiles son inclusivos `from/to` en `America/Argentina/Buenos_Aires`, convertidos a
  intervalo instantáneo `[inicioFrom, inicioDíaPosteriorTo)`;
- una reversión posterior aparece en su propio período y no reescribe el anterior.

Reversión registral no es devolución ni egreso real. El neto puede ser negativo y nunca se denomina
saldo de caja.

### E3-08-D02=A — Owner y ampliación read-only de `GROUP_TREASURY`

Owner consulta su Grupo activo o archivado. Una Cuenta con `GROUP_TREASURY` efectivo recibe
expresamente esta consulta sólo sobre Grupo activo, con DTO mínimo, reautorización por página y sin
acciones, detalle general, actores internos, motivos, líneas o permisos adicionales.

La ampliación no habilita registrar/revertir Recepciones, condonar, corregir, anular, administrar
grants distintos ni operar en archivo. Cargo, rol global, otras capabilities e IDs conocidos no
autorizan. No se crean roles configurables ni una capability nueva.

### E3-08-D03=A — Rango

Si no se envían fechas, backend deriva el mes civil actual. Si se envían, ambas son obligatorias.
El máximo es 92 días civiles inclusivos. Este límite es funcional, no una garantía de rendimiento.

### E3-08-D04=A — Máximo de hechos

Se admiten hasta 1.000 hechos registrales por consulta. Ingreso y reversión cuentan por separado,
aun cuando provengan de la misma Recepción. El hecho 1.001 causa
`MOVEMENT_LIMIT_EXCEEDED`, sin filas ni totales parciales. La detección usa presupuesto decreciente
entre streams y nunca carga un conjunto ilimitado.

## 3. Semántica y totales

Cada hecho suma exactamente una vez `totalMinor` de la raíz Recepción:

```text
grossRecordedIncomeMinor = suma de ingresos registrados del período
reversedRecordsMinor = suma positiva de reversiones registrales del período
netRegisteredIncomeMinor = grossRecordedIncomeMinor - reversedRecordsMinor
movementCount = cantidad de ingresos + cantidad de reversiones
```

Líneas y aplicaciones explican distribución y efecto sobre Pago, pero no vuelven a sumarse. Avisos
`RESOLVED_BY_ADMINISTRATIVE_RECEIPT` sin aplicación propia aportan cero. Deuda, condonación,
reversión de condonación, corrección y anulación no integran estos totales.

## 4. Consistencia sin persistencia adicional

### 4.1 Lo que no se adopta

Un timestamp `asOf` y cursores por stream no acreditan consistencia entre consultas independientes.
Tampoco se promete conservar una transacción Firestore entre páginas ni leer un snapshot histórico
fuera de las garantías disponibles.

### 4.2 Gate de disponibilidad estática

El árbol instalado permite expresar el mecanismo sin cambiar dependencias:

- `volley-ranking-system/functions/package.json:21` declara `firebase-admin ^11.11.1`;
- `volley-ranking-system/functions/package-lock.json:145-147` resuelve
  `@google-cloud/firestore 6.8.0` y `:1280-1298` resuelve `firebase-admin 11.11.1` con Firestore
  opcional `^6.8.0`;
- `volley-ranking-system/functions/node_modules/@google-cloud/firestore/types/firestore.d.ts:304-312`
  define `ReadOnlyTransactionOptions`, `readOnly: true` y `readTime?: Timestamp`;
- el mismo archivo `:475-497` expone `runTransaction(..., transactionOptions)` y documenta el
  snapshot consistente de una transacción read-only;
- el mismo archivo `:1405` y `:1794` expone `readTime` en `DocumentSnapshot` y `QuerySnapshot`.

Esto acredita disponibilidad estática en el checkpoint, no funcionamiento ejecutado. El gate de
implementación futuro debe compilar y ejercitar la combinación exacta, verificar que las queries
comparten el `readTime` transaccional y comprobar el corte exclusivo. Si la API no funciona en el
runtime/Emulator efectivo o exige cambiar dependencias, se detiene E3-08 y se presentan antes de
adoptarlas estas alternativas: autorizar la actualización, reformular consulta/UX o reabrir la
arquitectura. Este DEC no elige ninguna.

### 4.3 Mecanismo adoptado, sujeto a gates ejecutables

La primera página usa una única transacción read-only. La lectura de Grupo fija el `readTime` de
servidor como `readCutoffExclusive`. Dentro de esa transacción se reautoriza y se leen completamente,
con tope acumulado 1.001, los streams:

1. `INFORMED + CONFIRMED` por `confirmedAt`;
2. `ADMINISTRATIVE` por `recordedAt`;
3. reversiones por `reversedAt`.

Todos aplican el rango civil y `eventAt < readCutoffExclusive`. Igualdad con el corte queda fuera.
Los hechos se normalizan, validan y ordenan por `eventAt DESC, movementId DESC`. Sobre el manifiesto
completo aceptado se calculan totales y un digest determinista; sólo entonces se corta la página.

Cada continuación abre otra transacción read-only, reautoriza, relee el mismo conjunto acotado con
el mismo corte, reconstruye manifiesto/totales/digest y valida `emittedCount` más el ancla exacta. El
cursor transporta scope, corte, digest, conteo y ancla, pero ninguno de esos valores sustituye la
reconstrucción canónica ni aporta totales confiables. Divergencia produce `MOVEMENT_VIEW_CHANGED` y
obliga a refrescar; nunca mezcla páginas.

La reconstrucción funciona sin historia física porque los campos originales de Recepción son
inmutables y la reversión agrega `reversedAt` sin borrar el ingreso. Para
`receiptStateAtCutoff`, sólo una reversión válida con `reversedAt < readCutoffExclusive` produce
`REVERSED`; una posterior se ignora en esa vista. Nuevos commits usan timestamps de servidor y no
entran antes del corte exclusivo. Borrado, backfill anterior o reescritura incompatible hacen fallar
el digest; no se inventa recuperación histórica.

### 4.4 Costo y gate de medición

Primera página: autorización/contexto, hasta 1.001 resultados de movimiento y hasta 50
presentaciones. Continuación: autorización/contexto, relectura de hasta 1.000 resultados para
reconstruir el manifiesto y hasta 50 presentaciones. No hay cache autoritativa ni proyección.

Con 1.000 hechos aceptados, el recorrido completo tiene 50 requests y una cota de 50.000 resultados
de movimiento releídos para `pageSize=20`; con `pageSize=50`, 20 requests y una cota de 20.000.
Estas cotas excluyen autorización/contexto, queries vacías, metadata y presentaciones, y no se
declaran equivalentes a facturación. El máximo por request no debe confundirse con el costo
acumulado.

La medición futura debe informar por separado primera página, continuación representativa y
recorrido completo para ambos page sizes: entorno/versiones/dataset; páginas y hechos; igualdad de
digest/totales; resultados o lecturas por categoría; duración; bytes; CPU/memoria observable;
fallos/retries; y detección acotada de 1.001 sin filas ni totales. No hay presupuesto productivo
aprobado. Con la evidencia, la revisión decidirá si el mecanismo es viable, si requiere otra
decisión sobre rango/límite/UX o si debe reabrirse la arquitectura; no se habilitan implícitamente
persistencia, cache, proyección ni cambios de writers.

## 5. Contrato y privacidad

Se define `listGroupRegisteredIncomeMovements` con input cerrado:

```text
{ groupId, from?, to?, pageSize?, cursor? }
```

`pageSize` tiene default 20 y máximo 50. La salida común incluye audiencia, scope civil/moneda,
`readCutoffExclusive`, digest, cuatro totales, filas y cursor opcional.

- Owner recibe sujeto presentable y `receiptId` para reutilizar detalle autorizado.
- Tesorería recibe sujeto presentable y `movementId`; omite `receiptId`, actor, motivos/notas,
  líneas, aplicaciones, avisos, receipts técnicos y acciones.

Rules permanecen deny-all; el cliente no accede directamente a raíces. Cada página revalida Cuenta,
Grupo, ownership o grant, Persona, Membresía, ancla y Temporada según E3-02.

Errores mínimos: `UNAUTHENTICATED`, `GROUP_NOT_ACCESSIBLE`,
`GROUP_TREASURY_NOT_AUTHORIZED`, `INVALID_DATE_RANGE`, `RANGE_TOO_WIDE`,
`MOVEMENT_LIMIT_EXCEEDED`, `CURSOR_SCOPE_MISMATCH`, `MOVEMENT_VIEW_CHANGED`,
`DATA_INCOMPATIBLE` y `DEPENDENCY_UNAVAILABLE`.

## 6. Consultas e índices previstos

| Stream | Índice candidato |
|---|---|
| informado | `groupId ASC, decisionState ASC, confirmedAt DESC, __name__ DESC` |
| administrativo | `groupId ASC, origin ASC, recordedAt DESC, __name__ DESC` |
| reversión | `groupId ASC, reversedAt DESC, __name__ DESC` |

Son previsiones documentales. Configuración, aceptación real del planner y mediciones requieren una
implementación autorizada.

## 7. Frontend, pruebas y UAT

La UI reutiliza **Economía** y la superficie Tesorería, con una sección discreta **Movimientos de
ingresos**. Muestra fechas registral/efectiva separadas, ingresos, registros revertidos e ingreso
neto registrado. No muestra “saldo de caja”, controles de escritura, exportación o conciliación.

Una implementación futura debe probar semántica, no doble conteo, v1/v2, fronteras exactas,
timestamps iguales, digest, relectura, cursor/ancla/conteo, concurrentes antes/igual/después del
corte, privacidad, lifecycle, 999/1.000/1.001, costo, accesibilidad y regresión E3-01–E3-07. UAT
debe cubrir Owner, Tesorería mínima, reversión posterior, multilínea, neto negativo, pérdida de
acceso, límites y refresco. No se ejecuta evidencia mediante este DEC.

## 8. Continuidad mínima integrada en Documento 5

### 8.1 Texto incorporado a §7.5

> E3-08 incorpora una consulta privada y read-only de movimientos de ingresos registrados por
> Grupo y período para Owner y `GROUP_TREASURY` efectivo. Usa eje temporal registral
> (`confirmedAt | recordedAt | reversedAt`); la fecha efectiva es informativa. Suma una vez el total
> de cada Recepción por hecho, cuenta ingreso y reversión separadamente y distingue reversión
> registral de devolución. El neto puede ser negativo y no es saldo de caja. Mes actual es el rango
> por defecto, con máximo 92 días y 1.000 hechos; el exceso falla sin totales parciales. Totales y
> páginas se obtienen reconstruyendo en cada request un manifiesto completo acotado bajo un corte
> exclusivo de readTime, con digest/ancla/conteo y reautorización, sin persistencia adicional ni
> snapshot histórico prometido. Pago y Recepción conservan autoridad. No incorpora egresos,
> cuentas, crédito, devolución, conciliación, exportación, contabilidad, delegación de condonación
> ni retiro legacy.

### 8.2 Registro D5 adoptado

| Identificador | Decisión | Estado | Alcance | Consecuencia |
|---|---|---|---|---|
| `D5-053` | E3-08 adopta D01–D04=A y el addendum conjunto para consulta derivada de movimientos de ingresos registrados, con ampliación read-only explícita de `GROUP_TREASURY`. | APROBADA | Etapa 3 / E3-08 | La ficha queda `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`; los gates A/B permanecen pendientes y no se autoriza implementación ni cierre. |

D5-053 fue verificado como siguiente identificador disponible después de D5-052 antes de su
integración. No se incorpora ninguna otra decisión a Documento 5.

## 9. Riesgo residual y gate de implementación

No queda una decisión funcional o arquitectónica adicional indispensable para formalizar. Persisten
dos gates ejecutables: A, comprobar la API read-only, el `readTime` común y la frontera exclusiva
con las dependencias instaladas; B, medir primera página, continuación y recorrido completo de
1.000 hechos con pageSize 20/50. Si cualquiera resulta inviable, la implementación se detiene y se
presentan alternativas antes de adoptarlas; no se preaprueban cambios de dependencia, snapshots
persistidos, proyecciones, cache autoritativa, cambios de writers o totales aproximados.

## 10. Preservaciones y no efectos

- D5-044 no cambia ni se adelanta.
- D5-045 permanece aceptado y no solucionado.
- Auth/UAT real continúa aislada y el baseline se conserva.
- Gate económico legacy permanece pendiente; E3-08 no cierra Etapa 3.
- No se reabre E2-14 ni se rediseñan partidos/torneos.
- No se crea Caja, saldo de caja, balance general, egreso, devolución, crédito, cuenta, conciliación,
  exportación o contabilidad.
- No se amplía `GROUP_TREASURY` fuera de la consulta enumerada ni se delega condonación.
- No se autoriza código, pruebas, suites, Emulator, configuración, Rules, índices ejecutables,
  dependencias, Firebase remoto, deploy ni operaciones Git de integración.

## Resultado

**DEC-E3-08 ADOPTADA — E3-08 LISTO PARA IMPLEMENTAR CON AUTORIZACIÓN SEPARADA**

El corte, D01–D04=A y el addendum quedan adoptados, con D5-053 integrado. Los gates A/B permanecen
ejecutables y no comprobados. La decisión no autoriza implementación ni declara implementado,
verificado o cerrado E3-08 o Etapa 3.
