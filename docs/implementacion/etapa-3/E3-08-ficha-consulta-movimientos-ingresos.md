# E3-08 — Ficha de consulta de movimientos de ingresos registrados

## Estado de la ficha

- **Incremento:** `E3-08`.
- **Decisión histórica de Documento 5:** `D5-053` (mecanismo A).
- **Decisión complementaria adoptada:** `D5-054` (alternativa B).
- **Estado:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Implementación:** no autorizada.
- **Fecha:** 2026-10-21.
- **Responsable:** pendiente de asignación.
- **Rama/checkpoint de partida:** `dev` en
  `39135a830a1e5bf17eca18cd46569715c04cce1a`.
- **Etapa:** Etapa 3 — Pago deportivo independiente.
- **Aprobación funcional expresa:** `E3-08-D01=A`, `D02=A`, `D03=A`, `D04=A`.
- **Alcance de este documento:** conservar D01–D04=A y armonizar el contrato futuro con la
  alternativa B aprobada. D5-053 permanece como historia de A y D5-054 adopta la sustitución
  acotada. No autoriza implementación completa, configuración,
  índices, dependencias, Firebase remoto, deploy o cierre.

## 1. Fuentes y clasificación de afirmaciones

### 1.1 Reglas vigentes

1. Documento 5, en especial §§5.2, 5.5–5.18 y 7.5, exige un incremento pequeño, trazable, con
   frontend, consultas, seguridad, pruebas, retiro y decisiones faltantes explícitas.
2. Pago es la autoridad económica deportiva. Recepción conserva identidad, origen, contexto,
   líneas, total y lifecycle propios; cada Pago conserva sus aplicaciones, ingresos
   bruto/revertido/neto, deuda, saldo y estado.
3. Una Recepción representa una única recepción humana aunque distribuya su total entre 1–20 Pagos.
   Su total no se vuelve a sumar junto con líneas o aplicaciones.
4. Revertir una Recepción neutraliza el registro y sus aplicaciones, conserva historia y **no
   acredita una devolución real de dinero**.
5. Condonación y su reversión, corrección del principal y anulación son hechos no monetarios. No se
   suman a ingresos ni a un flujo monetario.
6. `GROUP_TREASURY` es una capacidad fija y read-only. Su alcance no se amplía por analogía; toda
   consulta nueva que se le conceda requiere decisión expresa.
7. D5-044 conserva sus superficies y condiciones de retiro. D5-045 permanece aceptado de forma
   acotada y no solucionado. Auth/UAT sigue aislada; el baseline de calidad y el gate de retiro de
   autoridad económica legacy permanecen vigentes.

Fuentes focales: Documento 5 vigente; cierre E3-07; addenda E3-03, E3-04 y E3-07 a Documentos 1–4;
DEC-E3-01 sólo para la coordinación del retiro legacy; cierre/ficha E3-02 sólo para los límites de
`GROUP_TREASURY`.

### 1.2 Comportamiento comprobado en el checkpoint

La lectura focal de cierres, contratos y adaptadores existentes acredita, sin ejecutar suites:

- una colección de raíces Recepción compartida por los orígenes `INFORMED | ADMINISTRATIVE`;
- Recepciones informadas confirmadas con `confirmedAt` y fecha efectiva `declaredPaidOn`;
- Recepciones administrativas aplicadas con `recordedAt` y fecha efectiva `receivedOn`;
- reversión completa con `reversedAt`, conservación de la raíz y cambio de
  `applicationState: APPLIED -> REVERSED`;
- total raíz derivado de líneas y aplicaciones subordinadas a Pago;
- historia Owner que ya compone streams físicos por timestamp de servidor, con página por defecto
  20, máximo 50 y cursor opaco compuesto;
- detalle económico de Pago que separa ingreso neto, condonación vigente, saldo y estado;
- consultas Owner y consultas delegadas que revalidan autorización en cada request/página;
- ausencia de una consulta agregada de movimientos monetarios por período.

Los gates locales posteriores acreditaron corrección técnica de A y midieron su costo; esa evidencia
se conserva en el informe único. No acredita presupuesto productivo, callable real, navegador ni
UAT del corte E3-08.

### 1.3 Decisiones funcionales aprobadas y estado normativo

El responsable funcional aprobó D01–D04 con opción A y luego aprobó la alternativa arquitectónica B:
una respuesta backend completa de hasta 1.000 DTO mínimos y paginación exclusivamente visual 20/50.
La enmienda sustituye prospectivamente a A sólo en entrega, paginación y autorización de consulta.
DEC y addendum actualizados quedan adoptados por D5-054; D5-053 no se reescribe.

## 2. Selección del corte

| Alternativa | Capacidad y dependencia real | Evaluación breve |
|---|---|---|
| Consulta derivada de movimientos de ingresos | Recepciones, aplicaciones, reversiones y fechas autoritativas ya son estables; falta una lectura agregada acotada. | **Recomendada**: entrega valor consultivo sin crear autoridad ni modificar dinero. |
| Delegación explícita de condonación | Debe ser una capacidad independiente: actos permitidos, prohibición o tratamiento de deuda propia, reversión, archivo, lifecycle y privacidad requieren decisión. | Solicitud válida, pero todavía más intensiva en autorización y riesgo de escritura. No amplía `GROUP_TREASURY` ni crea roles configurables por defecto. |
| Retiro económico legacy | Sigue siendo gate de E3 y reutilizará los hallazgos sobre participaciones, equipos e inscripciones. Depende de contratos deportivos estables y decisión por superficie. | Obligatorio antes de cerrar E3, pero no es el siguiente corte vertical autocontenido. No se repite inventario ni se investiga E2-14. |

**Corte funcional aprobado:** E3-08 es una **consulta de movimientos de ingresos registrados por
Grupo y período**. La necesidad operativa concreta es responder:

> ¿Qué ingresos y qué reversiones de registros confirmó el sistema durante un período para este
> Grupo, y cuál es el efecto monetario registral neto de esos hechos?

No responde cuánto efectivo existe, cuánto debería existir ni cuánto se adeuda. Por eso la UI no
debe denominar al neto **saldo de caja** ni **balance contable**.

## 3. Finalidad, casos de uso y exclusiones

### 3.1 Finalidad aprobada funcionalmente

Ofrecer una lectura privada, trazable y visualmente paginada de actividad monetaria registrada, derivada de
Recepciones vigentes, sin escribir otra fuente de verdad. El actor puede revisar entradas y
reversiones registrales de un intervalo y reconciliar el total mostrado con las filas recibidas.

### 3.2 Casos incluidos

1. Consultar movimientos monetarios registrales de un Grupo por rango civil.
2. Distinguir ingreso registrado de reversión de registro, origen informado/administrativo, fecha
   registral y fecha efectiva declarada/recibida.
3. Mostrar totales exactos del conjunto completo del rango, no sólo de la página visible.
4. Recibir un conjunto coherente y paginarlo localmente con orden estable; refrescar explícitamente
   para incorporar hechos concurrentes.
5. Consultar historia de Grupo archivado sólo como Owner, conforme a las reglas ya vigentes.

### 3.3 Exclusiones expresas

- saldo inicial, efectivo físico disponible o **saldo de caja**;
- egresos, gastos, cuentas bancarias, crédito, saldo a favor, devolución real, pasarela,
  conciliación, exportación o contabilidad;
- creación, edición, corrección, confirmación, reversión o borrado desde esta consulta;
- deuda total, cobrabilidad o balance de obligaciones como total de esta superficie;
- sumar condonaciones, reversiones de condonación, correcciones o anulaciones como dinero;
- nuevas proyecciones persistidas, doble escritura o un Agregado Caja;
- delegación de condonación, ampliación automática de `GROUP_TREASURY` o roles configurables;
- retiro legacy, cambios D5-044, investigación D5-045/E2-14 o rediseño de partidos/torneos.

## 4. Semántica aprobada de movimientos y totales

### 4.1 Movimientos

| Tipo presentable | Fuente única | Importe | Fecha registral | Efecto en el neto del período |
|---|---|---:|---|---:|
| `INGRESO_REGISTRADO` informado | Recepción `INFORMED`, confirmada | `totalMinor` de la raíz, una vez | `confirmedAt` | `+ totalMinor` |
| `INGRESO_REGISTRADO` administrativo | Recepción `ADMINISTRATIVE` | `totalMinor` de la raíz, una vez | `recordedAt` | `+ totalMinor` |
| `REVERSION_DE_REGISTRO` | la misma Recepción revertida | `totalMinor` de la raíz, una vez | `reversedAt` | `- totalMinor` |

`declaredPaidOn` o `receivedOn` se presenta como **fecha efectiva informada/recibida**, pero, según
E3-08-D01=A, no determina la inclusión temporal. Una Recepción revertida produce
dos hechos registrales: el ingreso original en su fecha registral y la reversión en `reversedAt`.
El ingreso original no desaparece de la historia.

### 4.2 Totales

| Total definido | Definición exacta | Qué no representa |
|---|---|---|
| `grossRecordedIncomeMinor` — **Ingresos registrados** | suma de `totalMinor` de movimientos `INGRESO_REGISTRADO` dentro del rango | dinero disponible, deuda cobrada hoy ni suma de aplicaciones |
| `reversedRecordsMinor` — **Registros revertidos** | suma positiva de `totalMinor` de movimientos `REVERSION_DE_REGISTRO` dentro del rango | devolución real, egreso o importe negativo persistido |
| `netRegisteredIncomeMinor` — **Ingreso neto registrado del período** | `grossRecordedIncomeMinor - reversedRecordsMinor`; puede ser negativo | **saldo de caja**, patrimonio, conciliación o saldo bancario |
| `movementCount` | cantidad de hechos registrales incluidos, contando ingreso y reversión como hechos separados | cantidad de Recepciones únicas o de aplicaciones |

Todos los importes son ARS en minor units enteros. No se mezclan monedas ni se redondea en la
consulta.

### 4.3 Distinciones obligatorias

- **Dinero registrado:** surge una vez del total de una Recepción confirmada/aplicada.
- **Reversión de registro:** compensa el ingreso registral y reabre deuda según Pago; no prueba que
  el dinero haya sido devuelto.
- **Deuda:** pertenece a Pago y se expresa mediante principal, ingreso neto, condonación vigente y
  saldo. No integra los totales de esta ficha.
- **Condonación:** extingue deuda sin dinero; su reversión aumenta deuda, no constituye ingreso ni
  egreso.
- **Corrección:** cambia el principal exigible; no es movimiento monetario.
- **Anulación:** extingue una obligación indebida elegible; no es ingreso, egreso ni condonación.

### 4.4 No doble conteo

La unidad contable de esta consulta es el **hecho registral de la raíz Recepción**. Para cada hecho:

1. se toma `totalMinor` exactamente una vez;
2. las líneas sólo explican distribución;
3. las aplicaciones sólo explican el efecto dentro de cada Pago;
4. avisos resueltos por una Recepción administrativa conservan cero ingreso propio;
5. nunca se suman simultáneamente raíz, líneas y aplicaciones.

## 5. Fechas canónicas y tratamiento temporal aprobado

### 5.1 E3-08-D01=A — actividad registral

- Inputs `from` y `to`: fechas civiles `YYYY-MM-DD`, inclusivas, de
  `America/Argentina/Buenos_Aires`.
- Backend convierte el intervalo a `[inicio de from, inicio del día posterior a to)`.
- La inclusión usa exclusivamente el timestamp autoritativo de servidor del hecho:
  `confirmedAt`, `recordedAt` o `reversedAt`.
- Orden: `eventAt DESC`, luego tipo estable y `receiptId DESC` como desempate.
- La fecha efectiva `declaredPaidOn | receivedOn` es informativa y nunca sustituye `eventAt`.
- Una reversión posterior a `to` **no reescribe** los totales del período original. Aparece en el
  período que contiene su `reversedAt`. Una consulta posterior del período original puede advertir
  que la Recepción hoy está revertida, pero mantiene el importe histórico original y no descuenta
  la reversión fuera de rango.

Esta semántica produce un extracto de actividad registral reproducible. Una lectura por fecha
efectiva o una posición “vigente al corte” sería otro contrato y no debe agregarse por analogía.

## 6. Actores, autorización, lifecycle y privacidad

| Actor | Acceso definido | Datos visibles | Límites |
|---|---|---|---|
| Owner vigente | consulta del Grupo propio activo o archivado | totales, movimientos, origen, sujeto presentable, fechas y referencias presentables | sin UID, email, hashes, paths, notas internas ni acciones de escritura |
| `GROUP_TREASURY` efectivo | consulta expresamente ampliada read-only sólo en Grupo activo | hasta 1.000 DTO Tesorería mínimos de §8.3 | cada apertura, refresh o cambio de rango revalida Cuenta–Persona, grant, ownership, Membresía y Temporada; sin acciones, actores internos, motivos ni archivo |
| sujeto de la Recepción | no recibe una nueva consulta global | conserva sus consultas propias actuales | no ve movimientos ajenos |
| otras capabilities, cargo o rol global | denegado | ninguno | IDs conocidos no autorizan |
| visitante/usuario autenticado sin contexto | denegado | ninguno | respuesta sin revelar existencia o economía ajena |

Rules del cliente continúan deny-all. La consulta es backend-only. Archivo invalida
`GROUP_TREASURY`; finalización, reactivación, renovación, cierre de Temporada, revocación y cambio de
Owner mantienen el lifecycle E3-02, sin herencia ni revival. E3-08 no modifica grants.

## 7. Referencias, datos, estados e invariantes

### 7.1 Autoridades y referencias

- **Recepción:** autoridad de identidad, origen, contexto, total, fechas registrales/efectivas y
  lifecycle aplicado/revertido.
- **Pago:** autoridad de aplicaciones, ingreso neto, deuda, condonación, saldo y estado.
- **Grupo/ownership y grant:** autoridad de scope y acceso.
- `receiptId` correlaciona un movimiento con su raíz; `paymentId` y `lineId` sólo aparecen si un
  detalle autorizado los necesita y nunca se usan como importes agregables.

La consulta es composición read-only: no crea Agregado, Movimiento persistido, Caja, asiento ni
proyección autoritativa.

### 7.2 Estados e invariantes

1. Sólo Recepciones informadas `CONFIRMED` o administrativas válidas originan ingresos.
2. `REPORTED`, `REJECTED` y `RESOLVED_BY_ADMINISTRATIVE_RECEIPT` sin efecto propio aportan cero.
3. Cada Recepción aporta como máximo un ingreso y, si corresponde, una reversión completa.
4. `totalMinor` coincide con la suma de líneas, pero se agrega una sola vez.
5. El importe de reversión coincide exactamente con el total original.
6. `netRegisteredIncomeMinor = grossRecordedIncomeMinor - reversedRecordsMinor`.
7. Condonación, corrección y anulación aportan cero a los tres totales monetarios.
8. Incompatibilidad de schema, total o lifecycle falla cerrada; no entrega totales parciales.
9. Pago y Recepción permanecen autoridades vigentes; la consulta nunca corrige sus datos.
10. El conjunto completo, sus totales y su corte pertenecen al mismo Grupo, rango y audiencia; el
    frontend sólo pagina visualmente y no recalcula economía.

## 8. Contrato de consulta definido

### 8.1 Operación

`listGroupRegisteredIncomeMovements`

Entrada cerrada:

```text
{
  groupId,
  from?,                // YYYY-MM-DD; junto con to o ambos ausentes
  to?                   // YYYY-MM-DD; junto con from o ambos ausentes
}
```

Si `from` y `to` están ausentes, backend deriva el mes civil actual en
`America/Argentina/Buenos_Aires`. Si sólo uno está presente, el input es inválido. El rango es
inclusivo por fecha civil y admite como máximo 92 días. El cliente no aporta actor, zona horaria,
moneda, totales, corte, timestamps ni audiencia.

### 8.2 DTO común

```text
{
  audience: "OWNER" | "TREASURY",
  scope: { groupId, from, to, timeZone: "America/Argentina/Buenos_Aires", currency: "ARS" },
  view: { readCutoffExclusive, manifestDigest },
  totals: {
    grossRecordedIncomeMinor,
    reversedRecordsMinor,
    netRegisteredIncomeMinor,
    movementCount
  },
  items: [{
    movementId,
    receiptId,
    kind: "INCOME_RECORDED" | "RECORD_REVERSAL",
    origin: "INFORMED" | "ADMINISTRATIVE",
    amountMinor,
    eventAt,
    effectiveOn,
    subject,
    receiptStateAtCutoff
  }]
}
```

El array contiene el conjunto completo aceptado, con máximo 1.000 movimientos. El contrato backend
no admite `pageSize` ni `cursor` y no devuelve `nextCursor`. `readCutoffExclusive` es el tiempo de
lectura de servidor que fija la vista y no es una
fecha funcional del movimiento. `manifestDigest` identifica el conjunto canónico completo; no es
un total ni se acepta como autoridad desde el cliente. `receiptStateAtCutoff` deriva
`APPLIED | REVERSED`: sólo es `REVERSED` cuando existe una reversión válida con
`reversedAt < readCutoffExclusive`. Una reversión igual o posterior al corte queda fuera. El campo no
altera el signo ni la inclusión del ingreso original.

### 8.3 DTOs por audiencia

**Owner:** recibe el DTO común, sujeto presentable y `receiptId` opaco por fila para reutilizar el
detalle Owner de Recepción ya autorizado. No recibe UID/email, paths, hashes técnicos o documentos
Firestore mediante esta consulta. El motivo de reversión no integra la fila; permanece en el
detalle autorizado existente.

**Tesorería:** recibe hasta 1.000 filas del DTO común con `audience: TREASURY`, sujeto presentable y
`movementId` opaco. Omite `receiptId`, actor interno, motivo/nota de reversión, líneas, aplicaciones,
referencias a avisos, receipts técnicos y acciones. La ampliación aprobada es sólo esta lectura; no
concede detalle general de Recepciones, reversión, condonación ni otra operación.

La consulta no expone líneas completas. `subject` usa la presentación mínima ya autorizada; una
Persona no presentable falla o se minimiza conforme al contrato de presentación vigente, sin
exponer identificadores internos.

### 8.4 Errores mínimos

| Error | Semántica/feedback |
|---|---|
| `UNAUTHENTICATED` | sesión vencida |
| `GROUP_NOT_ACCESSIBLE` | Grupo inexistente o no visible sin filtrar existencia |
| `GROUP_TREASURY_NOT_AUTHORIZED` | acceso delegado no vigente; limpiar datos |
| `INVALID_DATE_RANGE` | fechas/formato/orden inválidos |
| `RANGE_TOO_WIDE` | rango supera el máximo aprobado |
| `MOVEMENT_LIMIT_EXCEEDED` | no se entregan totales parciales; reducir rango |
| `DATA_INCOMPATIBLE` | fallo cerrado, sin omitir movimientos |
| `DEPENDENCY_UNAVAILABLE` | reintento seguro de consulta |

## 9. Persistencia, consultas e índices previstos

### 9.1 Persistencia

No se agrega persistencia. Se leen raíces Recepción existentes y, sólo para validar coherencia, sus
datos canónicos. No se persiste un total de Caja ni un snapshot de consulta.

### 9.2 Streams físicos y filtros

El reader compone streams disjuntos, compatibles con v1/v2:

1. ingreso informado v1/v2 por `groupId + decisionState == CONFIRMED + confirmedAt`;
2. ingreso administrativo v2 por `groupId + origin == ADMINISTRATIVE + recordedAt`;
3. reversión de ambos orígenes por `groupId + reversedAt` presente.

Cada consulta aplica simultáneamente:

- `eventAt >= periodStartInclusive`;
- `eventAt < periodEndExclusive`;
- `eventAt < readCutoffExclusive`;
- orden por el timestamp físico descendente y `__name__ DESC`.

No se filtra v1 por `origin`, porque ese campo no existe en todas sus raíces. El merge canónico usa
`eventAt DESC, movementId DESC`; `movementId` deriva de `kind + receiptId`, de modo que timestamps
iguales tienen un desempate total y reproducible. Igualdad exacta con `periodStartInclusive` entra;
igualdad con `periodEndExclusive` o `readCutoffExclusive` queda fuera.

### 9.3 Índices previstos, no ejecutables

| Stream | Campos/orden candidato | Motivo |
|---|---|---|
| ingreso informado | `groupId ASC, decisionState ASC, confirmedAt DESC, __name__ DESC` | rango/orden del timestamp registral v1/v2 |
| ingreso administrativo | `groupId ASC, origin ASC, recordedAt DESC, __name__ DESC` | discriminar raíces administrativas v2 |
| reversión | `groupId ASC, reversedAt DESC, __name__ DESC` | sólo documentos con reversión y orden registral |

La configuración y validación real de índices quedan para una implementación autorizada. El
addendum no declara que esos planes sean aceptados por Emulator/Firestore ni los incorpora a
configuración.

## 10. Entrega única, concurrencia, consistencia, costo y límites

### 10.1 Corte y unidad de consistencia

`from/to` determina el período funcional. `readCutoffExclusive`, derivado del `readTime` común de
servidor, fija la frontera técnica de una única respuesta. No es un `asOf` funcional ni un snapshot
durable. No hay continuaciones backend: cada apertura, refresh o cambio de rango obtiene una vista
completa nueva.

### 10.2 Evidencia conservada de A y aprobación de B

Gate A demostró localmente transacción read-only, `readTime` común, corte exclusivo y reconstrucción
correcta. Gate B midió A sin declararlo fallido: recorrer 1.000 hechos releyó 50.000 resultados con
página 20 o 20.000 con página 50. Esa evidencia motivó comparar y aprobar B.

B reemplaza prospectivamente reconstrucción/continuación por una respuesta única. La comparación
observó 384.397 B Owner y 332.400 B Tesorería sin compresión, transacción local de 1.307,574 ms y
transferencia loopback mediana de 3,439/3,640 ms. Son límites de fixture/local: no acreditan callable
productivo, navegador ni lecturas facturadas.

### 10.3 Transacción read-only y manifiesto completo

Cada request autorizado:

1. revalida Cuenta, Grupo y ownership/grant/lifecycle;
2. toma el `readTime` de Grupo como `readCutoffExclusive`;
3. lee los tres streams con presupuesto decreciente máximo 1.001;
4. normaliza un hecho por ingreso y otro por reversión, sin sumar líneas/aplicaciones;
5. rechaza el hecho 1.001 antes de presentación y respuesta;
6. ordena hasta 1.000 hechos y calcula manifiesto, digest y totales exactos;
7. obtiene la presentación autorizada y minimiza por audiencia dentro de la misma transacción;
8. devuelve todos los DTO, corte y totales como un conjunto coherente.

Backend conserva autoridad sobre importes, inclusión, orden, estado al corte y totales. El frontend
no acepta ni calcula esos valores: conserva temporalmente la respuesta y aplica `slice` visual de
20/50 filas. La igualdad `eventAt == readCutoffExclusive` queda fuera y sólo puede entrar en un
refresh posterior.

### 10.4 Ausencia de omisiones y duplicados

- informed y administrative son streams disjuntos por forma/origen;
- reversión es deliberadamente otro hecho sobre la misma raíz;
- `movementId = kind + receiptId` evita colisión;
- `eventAt DESC, movementId DESC` resuelve timestamps iguales;
- digest y conteo cubren el manifiesto completo antes de entregar;
- frontend conserva ese orden y sólo lo divide visualmente, sin merge ni recálculo.

### 10.5 Detección acotada del límite

Los streams usan presupuesto decreciente: informed `limit(1001)`, administrative
`limit(1001 - hechosLeídos)` y reversal `limit(1001 - hechosLeídos)`. Encontrar el hecho 1.001
produce `MOVEMENT_LIMIT_EXCEEDED`, sin filas ni totales parciales y sin cargar un conjunto
ilimitado. Ingreso y reversión cuentan por separado.

### 10.6 Autorización, memoria y concurrencia de UI

Se autoriza cada apertura, refresh y cambio de rango. Los DTO se mantienen sólo en memoria; quedan
prohibidos `localStorage`, `sessionStorage`, IndexedDB y cache persistente. La vista se limpia al
cerrar sesión, cambiar Cuenta/Grupo o detectar pérdida de acceso.

Cada consulta se asocia a Cuenta, Grupo, rango y una generación monotónica del estado UI. Antes de
aplicar una respuesta, frontend verifica que esos cuatro valores sigan activos; una respuesta tardía
de un contexto abandonado se descarta. Cancelar transporte cuando sea posible es optimización, no la
garantía primaria.

La pérdida de acceso se detecta mediante mecanismos existentes de sesión/contexto y el rechazo de
una nueva apertura/refresh/cambio de rango. No se prometen listeners ni sondeos nuevos, por lo que no
es instantánea. Revocación impide nuevas consultas, pero no recupera datos ya entregados.

### 10.7 Costo y gates residuales

Abrir o refrescar paga autorización/contexto, hasta 1.001 resultados de movimiento y todas las
presentaciones necesarias para hasta 1.000 DTO. El recorrido visual posterior no genera requests.
Presentaciones pueden deduplicarse sólo dentro del request; no constituye cache persistente.

Persisten dos mediciones de implementación: límite/transferencia del callable real y heap,
render/accesibilidad en navegador. La UI debe renderizar sólo 20/50 filas visibles. No existe
presupuesto productivo aprobado. Una inviabilidad detiene la implementación y exige decisión; no
autoriza persistencia, cache, proyección, cambio de writers/dependencias ni relajación de exactitud.

## 11. Frontend definido

- Reutilizar **Economía** del Grupo Owner y la superficie existente de Tesorería; sin ruta global
  ni pantalla paralela.
- Sección discreta **Movimientos de ingresos** con rango civil, tres totales definidos en §4.2 y
  lista paginada.
- Etiquetas inequívocas: **Ingreso registrado** y **Reversión de registro**. Junto a la reversión:
  “Corrige el registro; no acredita una devolución de dinero”.
- Mostrar “Ingreso neto registrado del período”; nunca “saldo de caja”.
- Mostrar fecha registral y, separada, fecha efectiva.
- Mostrar fecha/corte de actualización. Un refresh exitoso sustituye conjuntamente filas y totales.
- Paginar localmente 20/50 y renderizar sólo las filas visibles; no recalcular totales ni orden.
- Mantener datos únicamente en memoria y limpiar vista al cerrar sesión, cambiar Cuenta/Grupo o
  detectar pérdida de acceso; descartar respuestas tardías de otro contexto/generación.
- Estados: inicial, loading, vacío, rango inválido/demasiado amplio, límite excedido, pérdida de
  acceso, incompatibilidad, error recuperable y “hay cambios nuevos; actualizar”.
- Actualización confirmada, no optimista; foco y `aria-live` para feedback; controles utilizables en
  ancho móvil.
- No agregar botones de registrar, revertir, condonar, corregir, anular, exportar o conciliar.

## 12. Servicio, repositorios y unidad de consistencia

- **Módulo propietario:** lectura económica de Pagos/Recepciones, sin nuevo dominio Caja.
- **Servicio de Aplicación:** coordina autorización y consulta derivada; no implementa invariantes
  nuevas sobre Pago o Recepción.
- **Adaptador:** modelo de lectura específico; no Repositorio genérico ni acceso cliente Firestore.
- **Agregados modificados:** ninguno.
- **Unidad de consistencia:** no hay transacción de escritura. Cada apertura, refresh o cambio de
  rango usa una transacción read-only que autoriza y produce manifiesto, presentación, totales y
  hasta 1.000 DTO coherentes. Entre requests no se promete continuidad ni snapshot histórico.
- **Eventos/efectos posteriores:** NO APLICA. La consulta no emite eventos ni repara datos.

## 13. Flujos alternativos

| Condición | Respuesta | Estado resultante | Reintento |
|---|---|---|---|
| actor no autorizado o grant ineficaz | denegar y no revelar datos | sin cambios | sólo tras recuperar acceso |
| Grupo archivado + delegado | denegar según E3-02 | sin cambios | no dentro del mismo grant |
| rango inválido/amplio | feedback focal | sin cambios | sí, corrigiendo fechas |
| más de 1.000 hechos | sin filas ni totales parciales | sin cambios | sí, reduciendo rango |
| nueva Recepción/reversión posterior al corte | excluir; incorporar al refrescar mediante reemplazo completo | autoridades sin cambios | sí |
| respuesta tardía de otra Cuenta/Grupo/rango/generación | descartar sin repoblar la vista | vista vigente sin cambios | sí, desde contexto activo |
| raíz incompatible | fallar cerrado | sin cambios | no hasta corregir causa autorizada |
| dependencia temporalmente no disponible | error recuperable | sin cambios | sí |

## 14. Pruebas focales requeridas para una implementación futura

| Nivel | Casos mínimos | Evidencia futura |
|---|---|---|
| Dominio/semántica | signo y ecuación de totales; condonación/corrección/anulación en cero; reversión no devolución | unitarias |
| Contrato | input `{groupId, from?, to?}`, respuesta completa, DTOs por audiencia y errores sin cursor | unitarias de contrato |
| Consulta | streams informed/admin/reversal, compatibilidad v1/v2, orden y desempate | integración local |
| No doble conteo | Recepción multilínea suma una vez; aplicaciones y aviso resuelto no duplican | integración focal |
| Fechas | bordes de día, rango inclusivo, fecha efectiva distinta, reversión posterior al período | reloj controlado |
| Autorización | Owner, `GROUP_TREASURY` efectivo, capabilities ajenas, IDs conocidos, archivo/lifecycle y autorización por apertura/refresh/cambio de rango | Emulator local autorizado |
| Paginación visual | 0/1/20/21/50/51/1.000, cambio 20/50, sólo filas visibles y cero requests backend al paginar | componentes |
| Concurrencia | confirmación/reversión antes, igual y después de `readCutoffExclusive`; reversión posterior no borra ingreso; pérdida de acceso | Emulator local autorizado |
| Consistencia | readTime común, manifiesto/totales/presentación en una transacción y refresh como reemplazo atómico de vista | integración/Emulator local autorizado |
| Gate API | compilar y ejercer read-only, `DocumentSnapshot.readTime`, igualdad del `readTime` de queries y corte exclusivo con las versiones instaladas | integración/Emulator local autorizado |
| Límites/costo | 999/1.000/1.001; payload callable real, resultados por categoría, latencia y facturación observable sin extrapolar | medición focal autorizada |
| Frontend | memoria sólo volátil, respuesta tardía descartada, heap/render 1.000 con sólo 20/50 visibles, estados, accesibilidad y ausencia de acciones | unitarias/componentes/navegador |
| Arquitectura | cero writes/proyección/Caja, autoridades Pago/Recepción, Rules deny-all | pruebas de límites |
| Regresión | E3-01–E3-07 económicas y baseline sin regresión atribuible | suites focales autorizadas |

No se ejecuta ninguna de estas pruebas durante la definición.

## 15. UAT futura requerida

1. Owner consulta el mes actual y reconcilia dos Recepciones —una multilínea— con dos ingresos, no
   con la cantidad de líneas.
2. Owner ve una Recepción revertida como ingreso original más reversión registral y lee que no es
   devolución.
3. Una reversión posterior al período no cambia el neto del período anterior y aparece al consultar
   el período de la reversión.
4. La UI distingue fecha registral de fecha efectiva.
5. Una obligación condonada, corregida o anulada no crea movimiento monetario.
6. Tesorero efectivo consulta el DTO mínimo sin `receiptId`, controles de escritura, actores ni
   motivos internos.
7. Revocación/finalización/archivo detectado impide nuevas consultas y limpia la vista; se entiende
   que los datos ya entregados no pueden recuperarse.
8. Límite excedido no muestra subtotales engañosos.
9. Refresh incorpora movimientos posteriores sustituyendo coherentemente filas, totales y corte.
10. La paginación 20/50 es visual, no hace requests, no recalcula economía y renderiza sólo las filas visibles.
11. Cerrar sesión o cambiar Cuenta/Grupo limpia la vista; una respuesta tardía anterior no la repuebla.

UAT humana no demuestra por sí sola autorización negativa, concurrencia, costo o invariantes.

## 16. Criterios de aceptación de una implementación futura

1. **Dado** un rango válido, **cuando** se consulta, **entonces** cada Recepción aporta una vez su
   total raíz por hecho registral y los totales reconcilian con el conjunto completo.
2. **Dada** una Recepción multilínea, **cuando** se agregan movimientos, **entonces** líneas y
   aplicaciones no duplican dinero.
3. **Dada** una reversión, **cuando** se presenta, **entonces** se etiqueta como reversión de
   registro y nunca como devolución.
4. **Dada** una reversión posterior al rango, **cuando** se consulta el rango original, **entonces**
   el ingreso histórico permanece y esa reversión no se descuenta.
5. **Dados** deuda, condonación, corrección o anulación, **cuando** se calculan totales, **entonces**
   no se contabilizan como flujos monetarios.
6. **Dada** una apertura, refresh o cambio de rango, **cuando** backend responde, **entonces** una
   transacción read-only autorizada entrega manifiesto, presentación, filas y totales coherentes.
7. **Dado** un límite o dato incompatible, **cuando** no puede garantizarse exactitud, **entonces**
   la consulta falla completa y no devuelve un total parcial.
8. **Dado** un actor no autorizado o que pierde vigencia, **cuando** abre o refresca, **entonces**
   no recibe datos.
9. **Dada** la UI, **cuando** muestra el neto, **entonces** usa “Ingreso neto registrado del período”
   y no “saldo de caja”.
10. Pago/Recepción continúan como autoridades, no hay writes, proyección persistida, reglas abiertas
    de cliente ni nueva capacidad implícita.
11. D5-044, D5-045 no solucionado, Auth/UAT aislada, baseline y gate económico legacy permanecen
    sin cambios.
12. **Dado** un hecho con timestamp igual al corte, **cuando** se construye la vista, **entonces** se
    excluye y sólo puede aparecer al refrescar.
13. Frontend conserva el conjunto sólo en memoria, pagina 20/50 sin recalcular y renderiza sólo filas visibles.
14. Cerrar sesión, cambiar Cuenta/Grupo o detectar pérdida de acceso limpia la vista; respuestas
    tardías cuyo contexto/generación no coincide se descartan.
15. Transporte callable real y heap/render de navegador poseen evidencia antes de considerar la
    implementación completa; no se inventa presupuesto productivo.

## 17. Decisiones funcionales aprobadas y riesgo residual

### E3-08-D01=A — Eje temporal registral

Ingreso usa `confirmedAt | recordedAt`; reversión usa `reversedAt`; fecha efectiva es informativa.
Una reversión posterior no reescribe el período anterior.

### E3-08-D02=A — Owner y `GROUP_TREASURY` efectivo

Se amplía expresamente la capability existente sólo con esta consulta read-only y el DTO mínimo de
§8.3. No se agregan acciones, permisos por analogía, roles configurables ni delegación de
condonación.

### E3-08-D03=A — Rango

Mes civil actual por defecto y máximo de 92 días civiles inclusivos.

### E3-08-D04=A — Límite

Máximo de 1.000 hechos, contando ingreso y reversión por separado. El hecho 1.001 produce fallo
explícito sin filas ni totales parciales.

### E3-08-B — Entrega única y paginación visual

Queda aprobada una respuesta backend única de hasta 1.000 movimientos y totales exactos, con
paginación exclusivamente visual 20/50, autorización por apertura/refresh/cambio de rango y datos
sólo en memoria. D5-054 sustituye el mecanismo A de D5-053 únicamente para entrega, paginación y
frecuencia de autorización. No autoriza implementación ni modifica D01–D04=A.

## 18. Dependencias y paquete normativo mínimo

### 18.1 Dependencias satisfechas para definir

- E3-01–E3-07 cerrados y Pago/Recepción con composición económica estable.
- Reversión de ingreso completa y distinguida de devolución.
- Condonación, corrección y anulación diferenciadas de dinero.
- Fechas registrales de servidor y fechas efectivas existentes.
- consultas Owner/Tesorería y autorización contextual existentes.

### 18.2 Pendientes antes de completar implementación

1. Autorizar por separado la implementación completa.
2. Medir transporte mediante callable real local y heap/render/accesibilidad en navegador.
3. Completar evaluación operativa con resultados y límites explícitos, sin inventar presupuesto.
4. Autorizar separadamente cualquier Emulator/Auth/UAT o deploy posterior.

No dependen de E2-14, de resolver D5-045 ni de retirar D5-044. El retiro económico legacy sigue
siendo un incremento/gate posterior coordinado con contratos deportivos estables, reutilizando los
hallazgos existentes sin repetir inventarios.

## 19. Componentes reutilizables y retiro

| Componente | Reutilización definida | Riesgo a verificar |
|---|---|---|
| raíces Recepción `INFORMED | ADMINISTRATIVE` | fuentes únicas de hechos y total | compatibilidad v1/v2 |
| reader/manifiesto probado | streams, corte, normalización, digest y totales | adaptar entrega sin conservar cursor público ni continuación |
| autorización Owner/`GROUP_TREASURY` | contexto y lifecycle actuales | probar la ampliación read-only D02=A sin permisos laterales |
| UI Economía/Tesorería | superficie anfitriona discreta | no convertirla en Caja contable |
| detalle de Pago/Recepción | explicación autorizada existente | no exponer historia interna a Tesorería |

**Estructuras anteriores retiradas:** NO APLICA. Es una consulta nueva sin escritor
ni fuente sustituida. No satisface el gate de retiro legacy.

## 20. Checkpoint, rollback y evidencia futura

- **Commit inicial de definición:** `39135a830a1e5bf17eca18cd46569715c04cce1a`.
- **Rama:** `dev`.
- **Estado al iniciar la formalización:** ficha, DEC y addendum E3-08 sin seguimiento; índice limpio,
  sin stashes y sin fetch.
- **Rollback documental local de esta enmienda:** revertir conjuntamente D5-054 en Documento 5 y
  los cambios B de ficha, DEC, addendum e informe; D5-053 y la evidencia A permanecen intactos. No existen datos ni
  configuración E3-08 que migrar.
- **Checkpoint de implementación:** pendiente y deberá fijarse tras autorización separada.
- **Evidencia de cierre futura:** contratos adoptados, mediciones, suites focales, Rules, frontend,
  UAT delimitada, baseline comparado y procedimiento de rollback. Hoy no existe.

## Veredicto

Se define **E3-08 — consulta de movimientos de ingresos registrados** porque las capacidades
E3-03/E3-04/E3-07 ya estabilizaron la diferencia entre dinero, reversión registral, deuda,
condonación, corrección y anulación. El corte agrega valor sin mutar economía ni crear una autoridad
paralela. La delegación de condonación permanece como capacidad independiente pendiente, y el retiro
legacy conserva su gate propio.

**E3-08 LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA.** D01–D04=A permanecen.
D5-053 conserva A como antecedente técnicamente correcto y D5-054 adopta B como único contrato
futuro. Esta ficha no autoriza implementación
completa, no declara E3-08 implementado o cerrado y no cierra Etapa 3.
