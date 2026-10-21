# E3-08 — Ficha de consulta de movimientos de ingresos registrados

## Estado de la ficha

- **Incremento:** `E3-08`.
- **Decisión de Documento 5:** `D5-053`.
- **Estado:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Implementación:** no autorizada.
- **Fecha:** 2026-10-21.
- **Responsable:** pendiente de asignación.
- **Rama/checkpoint de partida:** `dev` en
  `39135a830a1e5bf17eca18cd46569715c04cce1a`.
- **Etapa:** Etapa 3 — Pago deportivo independiente.
- **Aprobación funcional expresa:** `E3-08-D01=A`, `D02=A`, `D03=A`, `D04=A`.
- **Alcance de este documento:** definir el corte vertical formalizado por DEC-E3-08, el addendum
  adoptado a Documentos 2/3/4 y D5-053. “Listo para implementar” expresa suficiencia documental;
  no demuestra los gates ejecutables A/B ni autoriza código, pruebas, configuración, índices,
  dependencias, Firebase remoto, deploy o cierre.

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

Esto no acredita todavía costo, latencia, índices, consistencia multipágina ni UAT del corte E3-08.

### 1.3 Decisiones funcionales aprobadas y estado normativo

El responsable funcional aprobó D01–D04 con opción A. El nombre de la superficie, la semántica de
totales, el eje temporal registral, la audiencia Owner/Tesorería y los límites forman la definición
funcional E3-08. DEC-E3-08 y el addendum asociado quedan adoptados como fuentes normativas
complementarias por D5-053. La formalización deja la ficha lista, pero no autoriza implementación ni
convierte los gates ejecutables en evidencia satisfecha.

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

Ofrecer una lectura privada, trazable y paginada de actividad monetaria registrada, derivada de
Recepciones vigentes, sin escribir otra fuente de verdad. El actor puede revisar entradas y
reversiones registrales de un intervalo y reconciliar el total mostrado con las filas recibidas.

### 3.2 Casos incluidos

1. Consultar movimientos monetarios registrales de un Grupo por rango civil.
2. Distinguir ingreso registrado de reversión de registro, origen informado/administrativo, fecha
   registral y fecha efectiva declarada/recibida.
3. Mostrar totales exactos del conjunto completo del rango, no sólo de la página visible.
4. Paginar con orden estable y refrescar explícitamente para incorporar hechos concurrentes.
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
| `GROUP_TREASURY` efectivo | consulta expresamente ampliada read-only sólo en Grupo activo | DTO Tesorería mínimo de §8.3 | cada página revalida Cuenta–Persona, grant, ownership, Membresía, ancla y Temporada; sin acciones, actores internos, motivos ni archivo |
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
10. Una página, sus totales y su cursor pertenecen al mismo Grupo, rango, audiencia y
    `readCutoffExclusive`.

## 8. Contrato de consulta definido

### 8.1 Operación

`listGroupRegisteredIncomeMovements`

Entrada cerrada:

```text
{
  groupId,
  from?,                // YYYY-MM-DD; junto con to o ambos ausentes
  to?,                  // YYYY-MM-DD; junto con from o ambos ausentes
  pageSize?,            // default 20; 1..50
  cursor?               // opaco y ligado al scope
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
  }],
  nextCursor?
}
```

`readCutoffExclusive` es el tiempo de lectura de servidor que fija la primera vista y no es una
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

**Tesorería:** recibe el DTO común con `audience: TREASURY`, sujeto presentable y `movementId`
opaco. Omite `receiptId`, actor interno, motivo/nota de reversión, líneas, aplicaciones, referencias
a avisos, receipts técnicos y acciones. La ampliación aprobada es sólo esta lectura; no concede
detalle general de Recepciones, reversión, condonación ni otra operación.

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
| `CURSOR_SCOPE_MISMATCH` | reiniciar desde primera página |
| `MOVEMENT_VIEW_CHANGED` | manifiesto/cursor ya no reconstruible exactamente; refrescar desde inicio |
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

## 10. Paginación, concurrencia, consistencia, costo y límites

### 10.1 Separación entre corte temporal y consistencia

El **corte temporal de eventos** son `from/to` y la regla de §5. El
**`readCutoffExclusive` de consistencia** evita que hechos posteriores entren en una continuación.
No se lo presenta como `asOf` funcional ni se afirma que, por sí solo, preserve un snapshot entre
requests. Firestore no ofrece en este contrato un snapshot histórico durable para una paginación
humana y los cursores actuales tampoco lo crean.

### 10.2 Gate técnico A — disponibilidad estática de transacción read-only y `readTime`

La comprobación estática del checkpoint acredita:

| Evidencia instalada | Referencia concreta | Consecuencia documental |
|---|---|---|
| dependencia directa | `volley-ranking-system/functions/package.json:21` declara `firebase-admin ^11.11.1` | el backend ya depende del Admin SDK; no se propone agregar dependencia |
| resolución instalada | `volley-ranking-system/functions/package-lock.json:145-147` fija `@google-cloud/firestore 6.8.0`; `:1280-1298` fija `firebase-admin 11.11.1` y su opcional Firestore `^6.8.0` | las firmas revisadas corresponden al árbol instalado, no a una versión supuesta |
| opción read-only | `volley-ranking-system/functions/node_modules/@google-cloud/firestore/types/firestore.d.ts:304-312` define `ReadOnlyTransactionOptions { readOnly: true; readTime?: Timestamp }` | puede expresarse una transacción read-only y opcionalmente un tiempo de lectura dentro del SDK instalado |
| ejecución | el mismo `.d.ts:475-497` documenta snapshot consistente/read-only sin retry y expone `runTransaction(updateFunction, transactionOptions)` | el diseño puede pedir `runTransaction(..., { readOnly: true })` sin cambio de dependencia |
| corte devuelto por servidor | el mismo `.d.ts:1405` y `:1794` expone `readTime` en `DocumentSnapshot` y `QuerySnapshot` | la primera lectura puede derivar el corte de un snapshot de servidor, no del reloj/cliente |
| cursores actuales | `firestoreTreasuryStore.js:29-30`, `firestoreAdministrativeReceiptStore.js:25` y `firestorePaymentDeliveryStore.js:32-34` codifican scope/anclas/checksums | son patrones reutilizables de cursor, pero no retienen transacción ni snapshot entre requests |

La evidencia es sólo de disponibilidad de tipos/código instalado: no demuestra todavía que el
Emulator y el runtime efectivo acepten la combinación exacta, que todas las lecturas de la futura
transacción compartan el `readTime`, ni que los índices/queries funcionen. Bajo una autorización de
implementación deberá existir un gate focal que compile y ejercite
`runTransaction(..., { readOnly: true })`, lea `DocumentSnapshot.readTime`, confirme igualdad de
`readTime` entre las queries de la transacción y compruebe el corte exclusivo. Si cualquiera falla o
exige actualizar dependencias, E3-08 se detiene: primero se presenta la dependencia faltante y se
decide entre autorizar su actualización, reformular la consulta/UX o reabrir la arquitectura. Este
paquete no adopta ninguna de esas alternativas.

### 10.3 Primera página: transacción de lectura y manifiesto completo

Dentro de una única transacción read-only:

1. backend autentica y reautoriza Owner o `GROUP_TREASURY` efectivo;
2. la lectura autoritativa de Grupo fija el `readTime` de servidor de esa transacción;
3. ese `readTime` se adopta como `readCutoffExclusive`;
4. se leen los tres streams con los límites temporales de §9.2;
5. se hidrata y valida cada raíz, se crea un hecho por ingreso y otro por reversión, y se forma el
   manifiesto canónico completo;
6. se rechaza si aparece el hecho 1.001;
7. se ordena el manifiesto, se calculan los cuatro totales sobre sus hasta 1.000 hechos y se calcula
   un digest determinista sobre scope, corte y campos canónicos de todas las filas;
8. se entrega sólo la primera página, pero los totales corresponden al manifiesto completo.

La exclusión estricta `eventAt < readCutoffExclusive` resuelve la igualdad de frontera: un hecho con
timestamp exactamente igual al `readTime` no integra esa vista y aparecerá al refrescar. El snapshot
transaccional sólo garantiza coherencia de **esa reconstrucción**; no se promete conservar la
transacción entre páginas.

### 10.4 Continuación: reconstrucción y validación, no snapshot histórico

Cada página posterior ejecuta otra transacción read-only y:

1. reautoriza desde persistencia;
2. valida forma y scope del cursor;
3. relee, con el mismo `readCutoffExclusive`, el conjunto completo acotado de los tres streams;
4. reconstruye `receiptStateAtCutoff` sin usar `applicationState` actual para borrar el ingreso:
   sólo considera una reversión cuyo `reversedAt` sea estrictamente anterior al corte;
5. recalcula manifiesto, digest y totales exclusivamente desde raíces canónicas;
6. compara el digest reconstruido y verifica que `emittedCount` y el ancla correspondan exactamente
   a la posición declarada dentro del manifiesto;
7. entrega la siguiente porción y un cursor nuevo.

El cursor contiene versión, actor/audiencia, scope, rango, zona, moneda, tamaño,
`readCutoffExclusive`, digest, `emittedCount` y ancla canónica. Sigue el patrón opaco/checksum de la
infraestructura actual, pero **no es autoridad de totales ni de filas**: esos valores no se aceptan
del cliente y se recalculan en cada request. Un cursor alterado, un digest diferente, un ancla que no
coincide o una forma imposible devuelve `CURSOR_SCOPE_MISMATCH | MOVEMENT_VIEW_CHANGED` sin datos.

Esta reconstrucción es viable porque los campos que crean el ingreso (`confirmedAt | recordedAt`,
origen, total, contexto y fecha efectiva) son inmutables, la reversión agrega `reversedAt` sin borrar
el original, y todos son timestamps autoritativos de servidor. Una confirmación o reversión
posterior recibe timestamp igual o posterior al nuevo commit y, por el corte exclusivo, no entra en
la vista anterior. Borrado, backfill con timestamp anterior, reescritura de total/fecha o violación
de esas invariantes hace divergir el manifiesto y falla cerrado; no se intenta una lectura histórica
inexistente.

### 10.5 Ausencia de omisiones y duplicados

- ingreso informado y administrativo son streams disjuntos por forma/origen;
- una reversión es deliberadamente otro hecho y puede referir la misma raíz;
- `movementId = kind + receiptId` evita colisión entre ingreso y reversión;
- el merge total `eventAt DESC, movementId DESC` resuelve timestamps iguales;
- la continuación no avanza anclas físicas independientes: corta el manifiesto reconstruido en
  `emittedCount` sólo después de validar el elemento anterior;
- una fila no puede saltarse o repetirse con un cursor emitido por el backend; cualquier diferencia
  del manifiesto invalida la continuación completa.

### 10.6 Detección acotada del límite

Los streams se consultan en orden fijo con presupuesto decreciente:

1. informado con `limit(1001)`;
2. administrativo con `limit(1001 - hechosYaLeídos)`;
3. reversión con `limit(1001 - hechosYaLeídos)`.

Encontrar el hecho 1.001 basta para `MOVEMENT_LIMIT_EXCEEDED`; no se consultan hechos adicionales
ni se devuelven filas/totales. Una Recepción revertida cuenta dos veces porque representa dos hechos.
Para un conjunto aceptado se leen como máximo 1.000 resultados de movimiento; para detectar exceso,
como máximo 1.001, sin cargar un conjunto ilimitado. Consultas vacías y lecturas de autorización
pueden tener costo adicional según Firestore.

### 10.7 Costo por request y costo acumulado

- mes civil actual por defecto;
- rango máximo 92 días;
- máximo 1.000 hechos;
- página default 20, máximo 50;
- **primera página:** autorización/contexto + hasta 1.001 lecturas de resultados entre los tres
  streams + hasta 50 presentaciones de sujeto para la página;
- **cada continuación:** vuelve a pagar autorización/contexto + hasta 1.000 lecturas de resultados
  para reconstruir y validar el manifiesto + hasta 50 presentaciones de sujeto;
- no hay cache autoritativa, snapshot persistido ni proyección.

Para un conjunto aceptado de exactamente 1.000 hechos, el máximo de resultados de movimiento
releídos por request es 1.000; 1.001 sólo se usa para detectar exceso. Recorrer todo el conjunto
implica:

| `pageSize` | Páginas/requests | Resultados de movimiento releídos por request | Cota acumulada de resultados de movimiento | Presentaciones de página, máximo acumulado |
|---:|---:|---:|---:|---:|
| 20 | 50 | 1.000 | 50.000 | 1.000 |
| 50 | 20 | 1.000 | 20.000 | 1.000 |

Estas cotas no incluyen lecturas de autorización/contexto, consultas vacías, metadata ni posibles
lecturas de presentación repetidas/deduplicadas. Tampoco equivalen automáticamente a facturación:
el conteo facturable real debe medirse y desglosarse. La diferencia entre 1.000 por request y
50.000/20.000 en un recorrido completo es parte explícita del gate; no puede presentarse sólo el
costo de la primera página.

### 10.8 Gate técnico B — medición inicial requerida

Los límites son funcionales, no una garantía de latencia, costo o capacidad. La implementación
futura debe medir 0, 20, 50, 999, 1.000 y 1.001 hechos. Para 1.000 debe ejecutar y reportar por
separado `pageSize=20` y `pageSize=50` en tres unidades: primera página, una continuación
representativa y recorrido completo hasta agotar el cursor.

El informe de viabilidad deberá presentar, sin ocultar máximos ni promediar los dos tamaños:

1. commit, versiones, entorno, actor `OWNER | TREASURY` y distribución
   `INFORMED v1/v2 | ADMINISTRATIVE | REVERSED` usada;
2. cantidad de páginas, hechos emitidos, digest/totales iniciales y comprobación de igualdad en cada
   continuación;
3. lecturas/resultados por categoría: streams, autorización/contexto y presentaciones; consultas
   vacías y cualquier overhead observable por separado;
4. duración de primera página, continuaciones —mínima/mediana/máxima y percentil sólo si el tamaño
   de muestra se declara— y recorrido completo;
5. bytes de respuesta y cursor por página, CPU y memoria pico si el entorno permite observarlos;
6. resultado 1.001: lecturas hasta detectar exceso, tiempo y confirmación de cero filas/totales;
7. fallos/retries; la declaración instalada dice que read-only no se reintenta, por lo que cualquier
   retry observado debe explicarse;
8. comparación directa `pageSize 20` versus `50`, incluyendo las cotas acumuladas anteriores;
9. limitaciones de la medición y ausencia de extrapolación productiva.

No existe presupuesto productivo aprobado. La revisión debe decidir expresamente, a partir de esos
resultados, una de tres conclusiones: **viable para continuar bajo los límites aprobados**,
**requiere ajustar rango/límite/UX mediante nueva decisión**, o **requiere reabrir arquitectura**.
Si la relectura completa por página no resulta aceptable, se detiene el incremento; no se introduce
persistencia, cache, proyección, cambio de writers ni aproximación implícita.

## 11. Frontend definido

- Reutilizar **Economía** del Grupo Owner y la superficie existente de Tesorería; sin ruta global
  ni pantalla paralela.
- Sección discreta **Movimientos de ingresos** con rango civil, tres totales definidos en §4.2 y
  lista paginada.
- Etiquetas inequívocas: **Ingreso registrado** y **Reversión de registro**. Junto a la reversión:
  “Corrige el registro; no acredita una devolución de dinero”.
- Mostrar “Ingreso neto registrado del período”; nunca “saldo de caja”.
- Mostrar fecha registral y, separada, fecha efectiva.
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
- **Unidad de consistencia:** no hay transacción de escritura. Cada request usa una transacción
  read-only para autorización y reconstrucción coherente; entre requests la continuidad se acredita
  mediante reconstrucción completa, digest y ancla de §10, no mediante un snapshot histórico.
- **Eventos/efectos posteriores:** NO APLICA. La consulta no emite eventos ni repara datos.

## 13. Flujos alternativos

| Condición | Respuesta | Estado resultante | Reintento |
|---|---|---|---|
| actor no autorizado o grant ineficaz | denegar y no revelar datos | sin cambios | sólo tras recuperar acceso |
| Grupo archivado + delegado | denegar según E3-02 | sin cambios | no dentro del mismo grant |
| rango inválido/amplio | feedback focal | sin cambios | sí, corrigiendo fechas |
| más de 1.000 hechos | sin filas ni totales parciales | sin cambios | sí, reduciendo rango |
| cursor de otro scope o alterado | exigir refresco | sin cambios | sí, desde inicio |
| nueva Recepción/reversión durante páginas | excluir si `eventAt >= readCutoffExclusive`; incorporar al refrescar | autoridades sin cambios | sí |
| manifiesto no reconstruible exactamente | `MOVEMENT_VIEW_CHANGED`, sin mezclar páginas | sin cambios | sí, desde inicio |
| raíz incompatible | fallar cerrado | sin cambios | no hasta corregir causa autorizada |
| dependencia temporalmente no disponible | error recuperable | sin cambios | sí |

## 14. Pruebas focales requeridas para una implementación futura

| Nivel | Casos mínimos | Evidencia futura |
|---|---|---|
| Dominio/semántica | signo y ecuación de totales; condonación/corrección/anulación en cero; reversión no devolución | unitarias |
| Contrato | inputs cerrados, fechas BA, DTOs por audiencia, errores y cursor ligado | unitarias de contrato |
| Consulta | streams informed/admin/reversal, compatibilidad v1/v2, orden y desempate | integración local |
| No doble conteo | Recepción multilínea suma una vez; aplicaciones y aviso resuelto no duplican | integración focal |
| Fechas | bordes de día, rango inclusivo, fecha efectiva distinta, reversión posterior al período | reloj controlado |
| Autorización | Owner, `GROUP_TREASURY` efectivo, capabilities ajenas, IDs conocidos, archivo/lifecycle y reautorización por página | Emulator local autorizado |
| Paginación | 0/1/20/21/50/51 movimientos, streams v1/v2, timestamps iguales, ancla+conteo, cursor alterado, sin omisiones/duplicados | Emulator local autorizado |
| Concurrencia | confirmación/reversión antes, igual y después de `readCutoffExclusive`; reversión posterior no borra ingreso; pérdida de acceso | Emulator local autorizado |
| Consistencia | readTime transaccional inicial, reconstrucción completa, digest estable/divergente, totales idénticos en todas las páginas | integración/Emulator local autorizado |
| Gate API | compilar y ejercer read-only, `DocumentSnapshot.readTime`, igualdad del `readTime` de queries y corte exclusivo con las versiones instaladas | integración/Emulator local autorizado |
| Límites/costo | 999/1.000/1.001; primera página, continuación y recorrido completo de 1.000 con pageSize 20/50; resultados por categoría, cotas acumuladas 50.000/20.000, facturación observable, latencia/cursor/CPU/memoria sin extrapolar | medición local |
| Frontend | estados, textos, accesibilidad, responsive y ausencia de acciones | unitarias/componentes |
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
7. Revocación/finalización/archivo entre páginas impide continuar y limpia datos.
8. Límite excedido no muestra subtotales engañosos.
9. Refresh incorpora movimientos posteriores sin insertarlos dentro del recorrido anterior.
10. Dos páginas conservan exactamente los mismos totales; una alteración/invariante rota produce
    `MOVEMENT_VIEW_CHANGED` y no mezcla resultados.

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
6. **Dadas** páginas concurrentes, **cuando** se continúa con cursor, **entonces** backend reautoriza,
   reconstruye el manifiesto completo bajo el mismo `readCutoffExclusive`, recalcula totales y
   valida digest/ancla/conteo antes de entregar filas.
7. **Dado** un límite o dato incompatible, **cuando** no puede garantizarse exactitud, **entonces**
   la consulta falla completa y no devuelve un total parcial.
8. **Dado** un actor no autorizado o que pierde vigencia, **cuando** consulta una página, **entonces**
   no recibe datos.
9. **Dada** la UI, **cuando** muestra el neto, **entonces** usa “Ingreso neto registrado del período”
   y no “saldo de caja”.
10. Pago/Recepción continúan como autoridades, no hay writes, proyección persistida, reglas abiertas
    de cliente ni nueva capacidad implícita.
11. D5-044, D5-045 no solucionado, Auth/UAT aislada, baseline y gate económico legacy permanecen
    sin cambios.
12. **Dado** un hecho con timestamp igual al corte, **cuando** se reconstruye la vista, **entonces**
    se excluye de todas sus páginas y sólo puede aparecer al refrescar.
13. **Dada** una continuación, **cuando** el conjunto canónico no coincide, **entonces** falla con
    `MOVEMENT_VIEW_CHANGED`; no usa un snapshot histórico inexistente ni valores del cliente.
14. La implementación futura acredita el gate de API de §10.2 sin cambiar dependencias, o se
    detiene para decidir expresamente la dependencia/alternativa antes de adoptarla.
15. La medición de §10.8 presenta primera página, continuación y recorrido completo de 1.000 hechos
    para pageSize 20 y 50, separa máximo por request de costo acumulado y permite emitir una de las
    tres conclusiones de viabilidad previstas, sin presupuesto productivo inventado.

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

### Decisión arquitectónica residual condicional

No surge otra decisión indispensable para completar el diseño estático: la reconstrucción acotada
de §10 evita persistencia adicional y no depende de snapshots históricos. Sí permanece un gate
ejecutable: medir su costo y latencia. Si la relectura de hasta 1.000 hechos por página resulta
inviable, debe abrirse una decisión arquitectónica nueva; esta ficha no preaprueba snapshots
persistidos, proyecciones, cache autoritativa, cambios de writers ni relajación de exactitud.

## 18. Dependencias y paquete normativo mínimo

### 18.1 Dependencias satisfechas para definir

- E3-01–E3-07 cerrados y Pago/Recepción con composición económica estable.
- Reversión de ingreso completa y distinguida de devolución.
- Condonación, corrección y anulación diferenciadas de dinero.
- Fechas registrales de servidor y fechas efectivas existentes.
- consultas Owner/Tesorería, autorización contextual y patrones de cursor existentes.

### 18.2 Gates ejecutables pendientes antes de implementar

1. Gate A de disponibilidad ejecutable de §10.2 con las dependencias instaladas; cualquier cambio de
   dependencia o alternativa requiere decisión previa.
2. Gate B de medición y revisión arquitectónica de §10.8 sobre primera página, continuación y recorrido
   completo con pageSize 20/50.
3. Autorización separada para implementación y luego para cualquier Emulator/Auth/UAT o deploy.

No dependen de E2-14, de resolver D5-045 ni de retirar D5-044. El retiro económico legacy sigue
siendo un incremento/gate posterior coordinado con contratos deportivos estables, reutilizando los
hallazgos existentes sin repetir inventarios.

## 19. Componentes reutilizables y retiro

| Componente | Reutilización definida | Riesgo a verificar |
|---|---|---|
| raíces Recepción `INFORMED | ADMINISTRATIVE` | fuentes únicas de hechos y total | compatibilidad v1/v2 |
| readers/merge de historia | patrón de streams, cursores y reautorización | no garantiza totales globales ni snapshot |
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
- **Rollback documental local:** revertir conjuntamente ficha, DEC, addendum y continuidad D5-053;
  no existen datos ni configuración E3-08.
- **Checkpoint de implementación:** pendiente y deberá fijarse tras decisiones/normativa.
- **Evidencia de cierre futura:** contratos adoptados, mediciones, suites focales, Rules, frontend,
  UAT delimitada, baseline comparado y procedimiento de rollback. Hoy no existe.

## Veredicto

Se define **E3-08 — consulta de movimientos de ingresos registrados** porque las capacidades
E3-03/E3-04/E3-07 ya estabilizaron la diferencia entre dinero, reversión registral, deuda,
condonación, corrección y anulación. El corte agrega valor sin mutar economía ni crear una autoridad
paralela. La delegación de condonación permanece como capacidad independiente pendiente, y el retiro
legacy conserva su gate propio.

**E3-08 LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA.** D01–D04=A quedan formalizadas
por DEC-E3-08, el addendum y D5-053. Los gates A/B continúan pendientes: “listo” no afirma
viabilidad ejecutable demostrada. Esta ficha no autoriza implementación, no declara E3-08
implementado, verificado o cerrado y no cierra Etapa 3.
