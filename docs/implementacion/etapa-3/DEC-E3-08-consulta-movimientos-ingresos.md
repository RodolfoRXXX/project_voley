# DEC-E3-08 — Consulta de movimientos de ingresos registrados

## Estado

- **Tipo:** decisión normativa adoptada para E3-08 con enmienda arquitectónica B integrada.
- **Decisiones funcionales aprobadas:** `E3-08-D01=A`, `D02=A`, `D03=A`, `D04=A`.
- **Decisión histórica de Documento 5:** `D5-053` (mecanismo A).
- **Decisión complementaria:** `D5-054`.
- **Estado:** `APROBADA`.
- **Estado del incremento:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Base:** `dev` en `39135a830a1e5bf17eca18cd46569715c04cce1a`, verificada el 21 de octubre
  de 2026 sin `fetch` ni cambio de rama.

Esta DEC conserva el corte funcional y D01–D04=A. D5-053 permanece como antecedente histórico del
mecanismo A, técnicamente correcto según los gates ejecutados. La aprobación expresa de B sustituye
prospectivamente a A sólo en entrega, paginación y frecuencia de autorización de la consulta.
D5-054 integra esa enmienda en Documento 5. Esta actualización documental no autoriza
implementación, configuración, Rules, índices, dependencias,
Firebase remoto o deploy.

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
expresamente esta consulta sólo sobre Grupo activo, con DTO mínimo y autorización en cada apertura,
refresh o cambio de rango, sin acciones, detalle general, actores internos, motivos, líneas o
permisos adicionales.

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

## 4. Consistencia y entrega única sin persistencia adicional

### 4.1 Antecedente A y sustitución prospectiva

D5-053 definió reconstrucción completa por página. Los gates demostraron que era técnicamente
correcta: transacción read-only disponible, `readTime` común, corte exclusivo, continuidad mediante
digest/conteo/ancla y rechazo ante divergencia. La medición operativa observó, para recorrer 1.000
filas, 50.000 resultados de movimiento con página 20 o 20.000 con página 50. Esos resultados se
conservan; A no se declara fallido.

B queda aprobado para sustituir A, al integrarse normativamente, sólo en contrato de entrega,
paginación y autorización. No hay continuaciones backend ni snapshot histórico entre requests.

### 4.2 Mecanismo B aprobado

Cada apertura, refresh o cambio de rango ejecuta una única transacción read-only:

1. autentica y autoriza Owner o `GROUP_TREASURY` efectivo desde autoridades vigentes;
2. la lectura de Grupo fija su `readTime` de servidor como `readCutoffExclusive`;
3. lee secuencialmente, con presupuesto acumulado máximo 1.001, los streams informado confirmado,
   administrativo y reversión;
4. aplica rango civil y `eventAt < readCutoffExclusive`; igualdad con el corte queda fuera;
5. normaliza, valida y ordena por `eventAt DESC, movementId DESC`;
6. ante el hecho 1.001 falla con `MOVEMENT_LIMIT_EXCEEDED` antes de presentación o respuesta, sin
   filas ni totales;
7. para hasta 1.000 hechos construye manifiesto y digest, calcula totales exactos y obtiene la
   presentación autorizada dentro de la misma transacción;
8. devuelve el conjunto completo minimizado, su corte, digest y totales.

La transacción produce coherentemente manifiesto, totales y presentación autorizada. Backend es la
única autoridad de inclusión, importes, orden, estado al corte y totales. Frontend no recompone
streams ni recalcula economía: sólo divide en memoria el array recibido para mostrar 20 o 50 filas.

Los campos originales de Recepción permanecen inmutables y una reversión agrega `reversedAt` sin
borrar el ingreso. `receiptStateAtCutoff` es `REVERSED` sólo con reversión válida estrictamente
anterior al corte; una igual o posterior queda fuera. Refresh crea otra vista completa bajo un corte
nuevo y sustituye conjuntamente filas y totales.

### 4.3 Autorización, memoria y respuestas tardías

Se autoriza cada apertura, refresh y cambio de rango. Pérdida de acceso detectada impide nuevas
consultas y exige limpiar la vista. No se crean listeners ni sondeos: la detección ocurre mediante
los mecanismos existentes de sesión/contexto y al recibir un rechazo en una nueva consulta. Por
ello no se promete detección instantánea.

Los datos viven sólo en memoria del frontend: no se usa `localStorage`, `sessionStorage`, IndexedDB
ni cache persistente. Cerrar sesión, cambiar Cuenta o Grupo, o detectar pérdida de acceso limpia
filas, totales, corte y selección visual. Cada request queda ligado a un identificador de contexto y
generación; una respuesta tardía sólo puede aplicarse si todavía coincide con Cuenta, Grupo, rango y
generación activos. En otro caso se descarta para que no repueble una vista limpiada.

Revocar acceso impide nuevas consultas, pero no recupera bytes ya entregados al navegador ni copias
que el usuario hubiera conservado. Tesorería puede recibir hasta 1.000 DTO mínimos en una apertura
válidamente autorizada, sin `receiptId` ni permisos adicionales.

### 4.4 Evidencia y gates residuales

Gate A acreditó localmente la API read-only, `readTime` común y corte exclusivo. Gate B acreditó
corrección y costo de A. La comparación focal de B observó, para 1.000 hechos, JSON sin compresión de
384.397 B Owner y 332.400 B Tesorería; transacción local de 1.307,574 ms y transferencia HTTP
loopback mediana de 3,439/3,640 ms. Parseo Node y loopback no acreditan callable productivo ni
comportamiento del navegador, y resultados retornados no equivalen a lecturas facturadas.

Permanecen dos gates antes de considerar completa la implementación: transporte mediante el
callable real elegido, y heap/render/accesibilidad en navegador manteniendo sólo 20/50 filas
renderizadas. No existe presupuesto productivo aprobado. Si alguno resulta inviable, se detiene y
se presenta una decisión; no se introducen implícitamente dependencias, persistencia, cache,
proyecciones, cambios de writers, límites distintos ni totales aproximados.

## 5. Contrato y privacidad

Se define `listGroupRegisteredIncomeMovements` con input cerrado:

```text
{ groupId, from?, to? }
```

La salida común incluye audiencia, scope civil/moneda, `readCutoffExclusive`, digest, cuatro
totales y el conjunto completo de hasta 1.000 filas. No admite `pageSize` ni `cursor` y no devuelve
`nextCursor`.

- Owner recibe sujeto presentable y `receiptId` para reutilizar detalle autorizado.
- Tesorería recibe sujeto presentable y `movementId`; omite `receiptId`, actor, motivos/notas,
  líneas, aplicaciones, avisos, receipts técnicos y acciones.

Rules permanecen deny-all; el cliente no accede directamente a raíces. Cada apertura, refresh o
cambio de rango revalida Cuenta, Grupo, ownership o grant, Persona, Membresía y Temporada según
E3-02. La UI mantiene los DTO sólo en memoria y renderiza exclusivamente 20/50 filas visibles.

Errores mínimos: `UNAUTHENTICATED`, `GROUP_NOT_ACCESSIBLE`,
`GROUP_TREASURY_NOT_AUTHORIZED`, `INVALID_DATE_RANGE`, `RANGE_TOO_WIDE`,
`MOVEMENT_LIMIT_EXCEEDED`, `DATA_INCOMPATIBLE` y `DEPENDENCY_UNAVAILABLE`.

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
timestamps iguales, manifiesto/digest/totales en una transacción, concurrentes antes/igual/después
del corte, privacidad, lifecycle, 999/1.000/1.001, costo, respuesta tardía descartada, memoria sólo
volátil, paginación visual, accesibilidad y regresión E3-01–E3-07. UAT debe cubrir Owner, Tesorería
mínima, reversión posterior, multilínea, neto negativo, pérdida de acceso, cambios de contexto,
límites y refresh coherente.

## 8. Trazabilidad normativa y propuesta de sustitución

### 8.1 Antecedente incorporado por D5-053

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

El texto anterior se conserva como historia de A y no se reescribe en Documento 5 durante esta
actualización. La enmienda B requiere sustituir únicamente la frase relativa a totales/páginas por
una entrega única de hasta 1.000 DTO mínimos bajo una transacción read-only, seguida de paginación
visual 20/50 y autorización en cada apertura, refresh o cambio de rango.

### 8.2 Registro D5 adoptado

| Identificador | Decisión | Estado | Alcance | Consecuencia |
|---|---|---|---|---|
| `D5-053` | E3-08 adopta D01–D04=A y el addendum conjunto para consulta derivada de movimientos de ingresos registrados, con ampliación read-only explícita de `GROUP_TREASURY`. | APROBADA — HISTÓRICA PARA MECANISMO A | Etapa 3 / E3-08 | Conserva el fundamento y la evidencia de A; no se modifica en este paquete. |

D5-053 fue verificado como siguiente identificador disponible después de D5-052 antes de su
integración.

### 8.3 Decisión complementaria adoptada — `D5-054`

> E3-08 sustituye el mecanismo de reconstrucción por página de D5-053 únicamente para entrega,
> paginación y frecuencia de autorización. Cada apertura, refresh o cambio de rango autoriza y usa
> una transacción read-only que devuelve hasta 1.000 movimientos mínimos y totales exactos bajo un
> corte común; el hecho 1.001 falla sin filas ni totales. Frontend conserva la respuesta sólo en
> memoria, pagina visualmente 20/50, no recalcula economía y descarta respuestas tardías de otro
> contexto. Revocación impide nuevas consultas, pero no recupera datos ya entregados. Persisten los
> gates de transporte callable real y heap/render de navegador. D01–D04=A y las restantes
> exclusiones de D5-053 no cambian.

Esta decisión queda adoptada por D5-054 sin reescribir D5-053.

## 9. Riesgo residual y gate de implementación

No queda una decisión funcional o arquitectónica adicional indispensable. Los gates A/B locales ya
acreditaron corrección y motivaron B sin invalidar A. Persisten la autorización separada de
implementación, los gates de transporte callable real local y heap/render/accesibilidad de
navegador, y la evaluación operativa explícita. Si alguno resulta inviable, la implementación se detiene y se presentan alternativas;
no se preaprueban cambios de dependencia, snapshots persistidos, proyecciones, cache autoritativa,
cambios de writers o totales aproximados.

El rollback documental de esta enmienda revierte conjuntamente D5-054 en Documento 5, ficha, DEC,
addendum e informe al contrato A; D5-053 y sus mediciones permanecen intactos. Como B no agrega persistencia ni writers,
no existe migración de datos. Un rollback de implementación futuro deberá retirar la superficie B y
limpiar estado volátil antes de reabrir una decisión; no podrá recuperar datos ya transferidos.

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

**DEC-E3-08 ACTUALIZADA Y ADOPTADA — E3-08 LISTO PARA IMPLEMENTAR CON AUTORIZACIÓN SEPARADA**

D01–D04=A y D5-053 se conservan. D5-054 adopta B como único contrato futuro y sustituye A sólo en
entrega, paginación y frecuencia de autorización. La implementación completa y
los gates residuales requieren autorización. No se declara implementado o cerrado E3-08 ni Etapa 3.
