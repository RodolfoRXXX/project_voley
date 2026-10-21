# Addendum a Documentos 2, 3 y 4 — E3-08 / consulta de movimientos de ingresos registrados

## Estado

- **Naturaleza:** fuente normativa complementaria adoptada para E3-08.
- **Decisiones funcionales incorporadas:** `E3-08-D01=A`, `D02=A`, `D03=A`, `D04=A`.
- **Decisión asociada:** DEC-E3-08 / `D5-053`.
- **Estado:** `ADOPTADO`.
- **Base:** `dev` en `39135a830a1e5bf17eca18cd46569715c04cce1a`.
- **Paquete:** [ficha E3-08](../implementacion/etapa-3/E3-08-ficha-consulta-movimientos-ingresos.md)
  y [DEC-E3-08](../implementacion/etapa-3/DEC-E3-08-consulta-movimientos-ingresos.md).

Este documento complementa prospectivamente los Documentos 2, 3 y 4 sólo dentro del alcance
E3-08. Sus decisiones funcionales y contratos mínimos quedan adoptados por D5-053; los gates A/B
permanecen ejecutables y no comprobados. La adopción no autoriza implementación.

## 1. Complemento funcional para Documento 2

### 1.1 Finalidad y pregunta operativa

E3-08 permite consultar:

> qué ingresos y reversiones de registros confirmó el sistema durante un período para un Grupo y
> cuál es el efecto monetario registral neto de esos hechos.

La respuesta es un extracto privado de actividad registral, no una cuenta financiera. No determina
efectivo físico, banco, patrimonio, deuda total, cobrabilidad o contabilidad.

### 1.2 Vocabulario obligatorio

- **Ingreso registrado:** efecto monetario de una Recepción `INFORMED` confirmada o
  `ADMINISTRATIVE` aplicada, contado una vez por su `totalMinor` raíz.
- **Reversión de registro:** neutralización completa de una Recepción y sus aplicaciones. Conserva
  historia y no acredita devolución ni egreso real.
- **Ingreso neto registrado del período:** ingresos registrados menos registros revertidos cuyos
  hechos registrales pertenecen al período. Puede ser negativo.
- **Fecha registral:** `confirmedAt | recordedAt | reversedAt`, timestamp autoritativo de servidor.
- **Fecha efectiva:** `declaredPaidOn | receivedOn`, fecha civil informativa.
- **Corte de lectura:** `readCutoffExclusive`, límite técnico de consistencia; no es una fecha
  funcional ni un snapshot histórico durable.

No debe usarse **saldo de caja** para ninguno de esos totales.

### 1.3 Alcance cerrado

Incluye:

1. consulta por Grupo y rango civil;
2. origen `INFORMED | ADMINISTRATIVE`;
3. ingresos y reversiones como hechos separados;
4. totales exactos del conjunto completo aceptado;
5. paginación privada Owner/Tesorería;
6. compatibilidad v1/v2, concurrencia y lifecycle vigente;
7. frontend discreto, pruebas, mediciones futuras y UAT.

Excluye egresos, gastos, saldo inicial, cuentas bancarias, crédito, devolución real, saldo a favor,
pasarela, conciliación, exportación, contabilidad, balance general, deuda agregada y automatización.
No crea Caja, asiento, Movimiento persistido, Agregado, proyección o escritor.

### 1.4 Actores y autorización — D02=A

**Owner vigente:** consulta cualquier Recepción válida de su Grupo activo y conserva historia
read-only en Grupo archivado. Puede usar el `receiptId` para abrir el detalle Owner ya autorizado.
No necesita Persona propia.

**`GROUP_TREASURY` efectivo:** su capacidad se amplía explícitamente sólo con
`listGroupRegisteredIncomeMovements`, sobre el Grupo activo concedido. Cada página revalida Cuenta,
Persona, grant, slot, Membresía, `validityAnchor`, Temporada, Owner y `ownershipRevision`. Recibe el
DTO mínimo de §3.3 y ninguna acción.

No autorizan cargo, rol global, `GROUP_PAYMENT_NOTICE_REVIEW`, `GROUP_DIRECT_PAYMENT_RECORD`, otra
capability, Membresía aislada, Persona propia ni conocimiento de IDs. La ampliación no delega
condonación ni crea roles configurables.

### 1.5 Lifecycle y archivo

- revocación, finalización, reactivación, renovación, cierre de Temporada y cambio de Owner aplican
  las reglas E3-02 sin herencia ni revival;
- toda página reautoriza; perder acceso impide continuar y exige limpiar datos;
- `GROUP_TREASURY` nunca opera ni consulta en Grupo archivado;
- Owner conserva consulta histórica del Grupo archivado;
- E3-08 no crea, modifica, revierte o liquida obligaciones/Recepciones y no revive actividad
  deportiva.

### 1.6 Eje temporal — D01=A

`from/to` son fechas `YYYY-MM-DD` inclusivas en `America/Argentina/Buenos_Aires`. Backend convierte
a `[periodStartInclusive, periodEndExclusive)`. Si ambas faltan deriva el mes civil actual; si falta
una, rechaza. El rango máximo es 92 días.

Cada stream usa su fecha registral. Fecha efectiva se muestra separada y nunca filtra. Una
reversión posterior sólo aparece en el período que contiene `reversedAt`; no reescribe el período
del ingreso original.

### 1.7 Flujo principal

1. Actor abre **Economía** o su superficie de Tesorería.
2. UI envía Grupo, rango opcional, tamaño y cursor opcional.
3. Backend autentica y reautoriza la audiencia.
4. Primera página fija corte técnico desde el readTime de una transacción read-only; continuación
   reutiliza el corte transportado y lo valida mediante reconstrucción.
5. Backend lee de forma acotada los streams, normaliza hechos y falla al detectar el 1.001.
6. Valida cada raíz, construye manifiesto, totales y digest completos.
7. En continuación compara digest, conteo y ancla con el manifiesto reconstruido.
8. Devuelve la porción solicitada y totales completos recalculados.
9. UI muestra totales/filas confirmados y conserva el cursor opaco.

### 1.8 Flujos alternativos

| Condición | Resultado |
|---|---|
| no autenticado/no autorizado | rechazo privado sin filtrar existencia |
| Grupo archivado + Tesorería | `GROUP_TREASURY_NOT_AUTHORIZED`; limpiar datos |
| sólo una fecha/formato/orden inválido | `INVALID_DATE_RANGE` |
| más de 92 días | `RANGE_TOO_WIDE` |
| hecho 1.001 | `MOVEMENT_LIMIT_EXCEEDED`, sin filas/totales |
| cursor alterado o de otro scope | `CURSOR_SCOPE_MISMATCH` |
| manifiesto no reconstruible | `MOVEMENT_VIEW_CHANGED`, refrescar desde inicio |
| raíz/schema/lifecycle incoherente | `DATA_INCOMPATIBLE`, fallo cerrado |
| dependencia temporal | `DEPENDENCY_UNAVAILABLE`, reintento seguro |

### 1.9 Frontend funcional

La sección **Movimientos de ingresos** se integra discretamente dentro de **Economía** y Tesorería.
Presenta:

- rango civil y mes actual por defecto;
- **Ingresos registrados**, **Registros revertidos**, **Ingreso neto registrado del período** y
  cantidad de hechos;
- fecha registral y fecha efectiva con etiquetas diferentes;
- origen y sujeto presentable;
- advertencia “Corrige el registro; no acredita una devolución de dinero” para reversión;
- loading, vacío, rango inválido/amplio, límite excedido, vista cambiada, pérdida de acceso,
  incompatibilidad y error recuperable;
- foco, `aria-live`, teclado y responsive conforme a patrones existentes.

No agrega ruta global ni botones de registrar, revertir, condonar, corregir, anular, exportar o
conciliar. Tesorería no recibe enlaces a detalle Owner.

## 2. Complemento de dominio para Documento 3

### 2.1 Autoridades separadas

**Recepción** conserva identidad, origen, contexto, líneas, total derivado, fecha efectiva,
timestamps registrales y lifecycle. **Pago** conserva aplicaciones, ingreso bruto/revertido/neto,
principal, deuda, condonación, saldo, estado y revisión.

E3-08 es un modelo de lectura derivado. No es Agregado, no posee Repositorio de escritura y no se
convierte en autoridad. No modifica Recepción, Pago, Grupo, grants o Membresía.

### 2.2 Hechos y movimientoId

Por cada raíz elegible:

```text
INCOME_RECORDED:
  eventAt = confirmedAt (INFORMED) | recordedAt (ADMINISTRATIVE)
  amountMinor = receipt.totalMinor

RECORD_REVERSAL:
  eventAt = reversedAt
  amountMinor = receipt.totalMinor
```

`movementId` deriva determinísticamente de `kind + receiptId`. Una raíz puede producir ambos hechos;
no puede producir dos ingresos ni dos reversiones. El merge total es
`eventAt DESC, movementId DESC`.

### 2.3 Totales e invariantes

```text
grossRecordedIncomeMinor = sum(amountMinor where kind == INCOME_RECORDED)
reversedRecordsMinor = sum(amountMinor where kind == RECORD_REVERSAL)
netRegisteredIncomeMinor = grossRecordedIncomeMinor - reversedRecordsMinor
movementCount = count(all accepted facts)
```

Invariantes:

1. `totalMinor` es entero positivo ARS y coincide con la suma de líneas.
2. La raíz se suma una vez por hecho; líneas/aplicaciones nunca se agregan aparte.
3. Un aviso resuelto administrativamente sin aplicación propia aporta cero.
4. Reversión conserva ingreso original y usa el mismo total completo.
5. `REPORTED`, `REJECTED` y resueltos sin efecto no originan ingreso.
6. Deuda, condonación/reversión, corrección y anulación aportan cero.
7. Neto puede ser negativo.
8. Cualquier incompatibilidad falla cerrada sin subtotal.
9. Moneda es ARS; no hay conversión ni redondeo.
10. Pago y Recepción permanecen autoridades únicas.

### 2.4 `receiptStateAtCutoff`

El estado presentable al corte no copia ciegamente `applicationState` actual:

```text
REVERSED si existe reversedAt válido y reversedAt < readCutoffExclusive
APPLIED  en otro caso
```

Así una reversión concurrente posterior no elimina ni cambia retrospectivamente el ingreso en la
vista. Una reversión exactamente igual al corte queda fuera por la comparación estricta.

### 2.5 Límites funcionales

- mes civil actual por defecto;
- 92 días máximo;
- 1.000 hechos máximo, no 1.000 raíces;
- ingreso y reversión cuentan por separado;
- página 20 por defecto, 1–50.

Son reglas funcionales de rechazo, no garantías de rendimiento.

## 3. Complemento técnico para Documento 4

### 3.1 Servicio público

```text
listGroupRegisteredIncomeMovements({
  groupId,
  from?,
  to?,
  pageSize?,
  cursor?
})
```

Input cerrado. Actor, audiencia, Persona, ownership, grant, fechas por defecto, zona, moneda,
timestamps, corte, totales y estado se derivan en backend.

### 3.2 DTO común

```text
{
  audience: "OWNER" | "TREASURY",
  scope: {
    groupId,
    from,
    to,
    timeZone: "America/Argentina/Buenos_Aires",
    currency: "ARS"
  },
  view: {
    readCutoffExclusive,
    manifestDigest
  },
  totals: {
    grossRecordedIncomeMinor,
    reversedRecordsMinor,
    netRegisteredIncomeMinor,
    movementCount
  },
  items: Movement[],
  nextCursor?
}
```

Campos comunes de `Movement`:

```text
movementId
kind: "INCOME_RECORDED" | "RECORD_REVERSAL"
origin: "INFORMED" | "ADMINISTRATIVE"
amountMinor
eventAt
effectiveOn
receiptStateAtCutoff: "APPLIED" | "REVERSED"
subject
```

### 3.3 DTO por audiencia y privacidad

**OWNER:** agrega `receiptId` para navegar al detalle Owner existente. Puede ver sujeto presentable.
La fila no duplica explicación interna; el detalle conserva su política vigente.

**TREASURY:** conserva campos comunes y sujeto presentable; omite `receiptId`, actor/UID/email,
motivo/nota, líneas, aplicaciones, avisos, hashes, paths, grants y receipts técnicos. No incluye
acciones o indicadores que simulen permiso de escritura.

Firestore cliente permanece deny-all. Toda lectura pasa por backend y minimización DTO.

### 3.4 Errores contractuales

- `UNAUTHENTICATED` / `ACCOUNT_REQUIRED`;
- `GROUP_NOT_ACCESSIBLE`;
- `GROUP_TREASURY_NOT_AUTHORIZED`;
- `INVALID_DATE_RANGE` / `RANGE_TOO_WIDE`;
- `MOVEMENT_LIMIT_EXCEEDED`;
- `CURSOR_SCOPE_MISMATCH`;
- `MOVEMENT_VIEW_CHANGED`;
- `DATA_INCOMPATIBLE`;
- `DEPENDENCY_UNAVAILABLE`.

Los errores de autorización no revelan Grupo, grant, Persona o economía. Límite/incompatibilidad no
devuelven filas ni totales parciales.

### 3.5 Persistencia y repositorios

No hay colección, documento, snapshot, cache o proyección nueva. Se reutilizan raíces
`paymentDeliveries` v1/v2 y capacidades públicas mínimas de autorización/presentación. Un adaptador
de consulta específico normaliza streams; no es Repositorio de Agregado ni puede escribir.

No se cambian writers. La viabilidad depende de invariantes ya vigentes: total/contexto/fechas
originales inmutables, reversión única que agrega `reversedAt`, conservación de raíz e ingreso.

### 3.6 Queries e índices previstos

| Consulta | Filtros y orden | Índice candidato |
|---|---|---|
| informado v1/v2 | `groupId ==`, `decisionState == CONFIRMED`, `confirmedAt >= start`, `< end`, `< cutoff`; `confirmedAt DESC, __name__ DESC` | `groupId, decisionState, confirmedAt DESC, __name__ DESC` |
| administrativo v2 | `groupId ==`, `origin == ADMINISTRATIVE`, `recordedAt >= start`, `< end`, `< cutoff`; `recordedAt DESC, __name__ DESC` | `groupId, origin, recordedAt DESC, __name__ DESC` |
| reversión v1/v2 | `groupId ==`, `reversedAt >= start`, `< end`, `< cutoff`; `reversedAt DESC, __name__ DESC` | `groupId, reversedAt DESC, __name__ DESC` |

No se consulta informado v1 por `origin`. Los índices son previstos, no ejecutables ni verificados.

### 3.7 Gate técnico de disponibilidad estática

El árbol instalado aporta evidencia concreta, sin requerir actualización:

| Evidencia | Referencia estática | Alcance |
|---|---|---|
| dependencia directa | `volley-ranking-system/functions/package.json:21`: `firebase-admin ^11.11.1` | no se agrega dependencia |
| resolución efectiva | `volley-ranking-system/functions/package-lock.json:145-147`: `@google-cloud/firestore 6.8.0`; `:1280-1298`: `firebase-admin 11.11.1` y Firestore opcional `^6.8.0` | se revisa el árbol instalado, no una API supuesta |
| transacción read-only | `volley-ranking-system/functions/node_modules/@google-cloud/firestore/types/firestore.d.ts:304-312`: `ReadOnlyTransactionOptions`, `readOnly: true`, `readTime?: Timestamp`; `:475-497`: `runTransaction(..., transactionOptions)` | el SDK instalado puede expresar el mecanismo |
| tiempo del snapshot | el mismo `.d.ts:1405` y `:1794`: `readTime` en `DocumentSnapshot` y `QuerySnapshot` | el corte puede derivarse del servidor |

La evidencia de tipos y código instalado no acredita todavía comportamiento del runtime/Emulator,
igualdad efectiva del `readTime` entre todas las queries ni aceptación de índices. Bajo autorización
futura, el gate debe compilar y ejercitar `runTransaction(..., { readOnly: true })`, obtener
`DocumentSnapshot.readTime`, comprobar un `readTime` transaccional común y la frontera estricta. Si
falla o exige cambiar dependencias, debe presentarse la dependencia y decidir antes entre actualizar,
reformular consulta/UX o reabrir arquitectura. Ninguna alternativa queda adoptada aquí.

### 3.8 Primera reconstrucción consistente

Una única transacción read-only realiza autorización y las tres queries. El `readTime` del snapshot
de Grupo fija `readCutoffExclusive`. Aunque la transacción vea un documento con timestamp igual a
ese readTime, el filtro/postvalidación estricta `< cutoff` lo excluye para que la frontera sea
reconstruible.

Los streams se consultan secuencialmente con presupuesto acumulado:

```text
remainingForDetection = 1001
read informed limit remainingForDetection
subtract returned facts; if zero -> MOVEMENT_LIMIT_EXCEEDED
read administrative limit remainingForDetection
subtract returned facts; if zero -> MOVEMENT_LIMIT_EXCEEDED
read reversals limit remainingForDetection
if total facts == 1001 -> MOVEMENT_LIMIT_EXCEEDED
```

Una formulación equivalente puede usarse si demuestra el mismo máximo acumulado. No se leen más
de 1.001 resultados de hechos para detectar exceso. En conjunto aceptado, máximo 1.000.

### 3.9 Manifiesto, digest y totales

Cada hecho normalizado aporta al manifiesto, como mínimo:

```text
movementId, kind, receiptId, origin, groupId, personId,
amountMinor, eventAt, effectiveOn, receiptStateAtCutoff
```

Se ordena canónicamente y se calcula un digest determinista versionado sobre scope,
`readCutoffExclusive` y todas las filas. Los totales se calculan desde ese manifiesto completo, no
desde la página. Presentaciones humanas quedan fuera del digest; identidad/contexto opacos quedan
dentro para detectar sustitución.

### 3.10 Cursor y continuación

Cursor opaco versionado liga:

- contrato y actor/audiencia;
- Grupo, rango, zona, moneda, orden y pageSize;
- `readCutoffExclusive`;
- digest del manifiesto;
- `emittedCount`;
- `movementId/eventAt` del último elemento emitido.

Cada continuación reautoriza y reconstruye el manifiesto completo en otra transacción read-only.
Recalcula digest y totales; no acepta totales, filas o estado desde el cursor. Valida que
`emittedCount` esté en rango y que el ancla sea exactamente el elemento `emittedCount - 1`. Luego
emite `[emittedCount, emittedCount + pageSize)`.

El cursor usa el patrón de codificación opaca/checksum vigente, pero su contenido sólo es una
afirmación a verificar. Autorización, filas y totales derivan otra vez de datos canónicos. Forma,
scope, digest o ancla divergentes fallan; no se intenta continuar parcialmente.

### 3.11 Concurrencia y fronteras

- Confirmación/reversión con `eventAt < cutoff` y visible en la reconstrucción inicial integra todas
  las páginas correspondientes.
- `eventAt == cutoff` queda fuera siempre.
- Commit posterior con timestamp de servidor `> cutoff` queda fuera y aparece al refrescar.
- Reversión posterior no borra ingreso original; `receiptStateAtCutoff` permanece `APPLIED`.
- Dos streams que comparten timestamp se ordenan por `movementId`.
- Root leída como ingreso y reversión representa dos hechos deliberados, no duplicado.
- Pérdida de acceso entre páginas bloquea antes de exponer datos.
- Reescritura/borrado/backfill anterior incompatible cambia digest y produce
  `MOVEMENT_VIEW_CHANGED | DATA_INCOMPATIBLE`.

No se afirma aislamiento histórico entre requests; se afirma reconstrucción determinista bajo
invariantes inmutables y fallo cerrado ante divergencia.

### 3.12 Costo y mediciones futuras

Primera página:

- lecturas de autorización/contexto;
- hasta 1.001 resultados de hechos para aceptar/rechazar límite;
- hasta 50 presentaciones de sujeto de las filas emitidas.

Cada continuación:

- repite autorización/contexto;
- relee hasta 1.000 resultados de hechos;
- recalcula manifiesto, digest y totales;
- obtiene hasta 50 presentaciones.

El máximo por request no describe el costo acumulado. Con 1.000 hechos aceptados:

| `pageSize` | requests del recorrido | cota de resultados de movimiento por request | cota acumulada del recorrido | presentaciones emitidas, máximo acumulado |
|---:|---:|---:|---:|---:|
| 20 | 50 | 1.000 | 50.000 | 1.000 |
| 50 | 20 | 1.000 | 20.000 | 1.000 |

Las cotas excluyen autorización/contexto, queries vacías, metadata y presentaciones repetidas o
deduplicadas; tampoco equivalen automáticamente a lecturas facturadas. Deben medirse 0, 20, 50,
999, 1.000 y 1.001 hechos. Para 1.000, tanto con `pageSize=20` como con `pageSize=50`, el informe
debe separar primera página, continuación representativa y recorrido completo, y presentar:

1. commit, versiones, entorno, actor y distribución v1/v2/administrativa/revertida;
2. páginas, hechos, igualdad de digest/totales y ausencia de omisiones/duplicados;
3. resultados o lecturas desglosados por streams, autorización/contexto, presentaciones y overhead;
4. duración de primera página, continuaciones y recorrido completo;
5. bytes de respuesta/cursor y CPU/memoria pico cuando sean observables;
6. detección de 1.001, lecturas hasta el rechazo y confirmación de cero filas/totales;
7. fallos/retries, comparación directa de page sizes y límites de extrapolación.

No hay presupuesto productivo aprobado. La revisión de esos resultados deberá concluir
expresamente: viable bajo los límites aprobados; requiere nueva decisión de rango/límite/UX; o
requiere reabrir arquitectura. Queries vacías y transacciones pueden tener facturación/overhead
adicional; 92 días/1.000 hechos no garantizan rendimiento.

Si falla el presupuesto operativo, se detiene implementación y se abre decisión arquitectónica.
Este addendum no autoriza snapshots persistidos, proyección, cache autoritativa, cambio de writers,
totales aproximados o exportación.

## 4. Pruebas focales futuras

No se ejecutan ni se consideran satisfechas por esta adopción documental.

### 4.1 Semántica y contratos

1. input cerrado, default de mes, ambas fechas o ninguna y máximo 92 días;
2. ARS/minor units, neto positivo/cero/negativo;
3. Recepción multilínea suma una vez;
4. ingreso y reversión suman dos hechos con igual total/opuesto efecto;
5. avisos resueltos, deuda, condonación, corrección y anulación aportan cero;
6. fecha efectiva distinta no cambia filtro;
7. reversión posterior aparece sólo en su período.

### 4.2 Consultas, compatibilidad y fronteras

8. informado v1/v2 y administrativo v2 sin exclusión por `origin` ausente;
9. tres streams disjuntos y merge determinista;
10. inicio inclusivo, fin exclusivo y cutoff exclusivo;
11. timestamps iguales resueltos por `movementId`;
12. 999/1.000 aceptados y 1.001 rechazado sin leer ilimitadamente;
13. schema/total/contexto incompatible falla completo.

### 4.3 Consistencia y paginación

14. readTime inicial proviene de una transacción read-only, no del cliente;
15. totales de todas las páginas iguales y correspondientes al manifiesto completo;
16. cursor liga scope/corte/digest/conteo/ancla;
17. cursor alterado, ancla falsa o digest divergente falla sin filas;
18. confirmación/reversión antes, igual y después del corte;
19. reversión posterior conserva ingreso y `receiptStateAtCutoff` histórico;
20. páginas 1–50 sin omisiones/duplicados en combinaciones v1/v2;
21. pérdida de autorización entre páginas.

### 4.4 Privacidad, lifecycle y arquitectura

22. Owner activo/archivado y Owner sin Persona;
23. Tesorería efectiva sólo activa, revocada/finalizada/renovada/cambio de Owner/archivo;
24. DTO Owner versus Tesorería campo por campo;
25. capabilities/cargo/IDs ajenos denegados;
26. Rules deny-all y ausencia de acceso cliente;
27. cero writes, colección/proyección/Caja/Repositorio genérico;
28. regresión E3-01–E3-07 y baseline sin regresión atribuible.

### 4.5 Medición

29. gate de API acredita read-only, `readTime` común y corte exclusivo con el árbol instalado;
30. 1.000 hechos con pageSize 20: primera página, continuación y 50 requests completos;
31. 1.000 hechos con pageSize 50: primera página, continuación y 20 requests completos;
32. máximo por request se informa separado de las cotas acumuladas 50.000/20.000;
33. resultados/lecturas por categoría, facturación observable, duración, CPU/memoria y bytes;
34. fallo 1.001 demuestra detección acotada y cero filas/totales;
35. resultados se documentan como mediciones locales, no garantía productiva.

## 5. UAT futura

1. Owner abre mes actual y entiende los tres totales.
2. Una Recepción con varias líneas aparece una vez como ingreso.
3. Una revertida aparece como ingreso y reversión; la UI niega que sea devolución.
4. Neto negativo se presenta correctamente y no como saldo de caja.
5. Fecha registral y efectiva son comprensibles y distintas.
6. Reversión posterior no cambia el período del ingreso y aparece en el propio.
7. Tesorería efectiva ve DTO mínimo y ninguna acción/enlace Owner.
8. Revocación/finalización/archivo entre páginas bloquea y limpia datos.
9. Rango amplio y hecho 1.001 fallan sin subtotal.
10. Continuación conserva totales; vista divergente exige refresco y no mezcla páginas.
11. Refresh incorpora hechos posteriores.
12. Teclado, foco, `aria-live`, vacío/error y móvil son utilizables.

UAT humana no prueba Rules, privacidad negativa, costo, digest, carreras o ausencia de duplicados;
esas evidencias son automatizadas y separadas.

## 6. Criterios de aceptación futura

1. D01–D04=A están integradas normativamente antes de implementar.
2. Recepción/Pago conservan autoridad y no existe persistencia nueva.
3. Totales se calculan sobre el conjunto completo y exacto, nunca sobre una página.
4. Cada continuación reautoriza y reconstruye; no confía totales del cliente.
5. Ingreso original sobrevive a reversión y `receiptStateAtCutoff` respeta el corte exclusivo.
6. Fronteras y timestamps iguales tienen resultado determinista.
7. Streams v1/v2 no omiten ni duplican hechos.
8. 1.001 falla explícitamente con detección acotada.
9. Owner/Tesorería cumplen DTO y lifecycle aprobados.
10. UI no usa “saldo de caja” ni ofrece escrituras/exportación.
11. La API read-only/`readTime`, índices, costo y latencia poseen evidencia ejecutable autorizada;
    la medición distingue primera página, continuación y recorrido completo para pageSize 20/50.
12. Regresión y baseline preservan E3-01–E3-07.
13. D5-044, D5-045, Auth/UAT aislada y gate legacy permanecen sin cambios.

## 7. Riesgo residual y decisión condicional

La solución está definida estáticamente sin persistencia adicional. Su costo es O(N) por página,
con `N <= 1.000`, y debe medirse. No queda una decisión funcional indispensable.

Si la implementación futura demuestra que el costo/latencia es inviable, debe detenerse y abrirse
una decisión arquitectónica expresa. Alternativas posibles, no aprobadas aquí: reducir rango/límite,
entregar todo el conjunto aceptado en una sola respuesta con paginación local, o autorizar una
proyección/snapshot persistido. No se implementa ninguna por anticipado.

## 8. Preservaciones y no efectos

- D5-044 conserva superficies, destinos y condiciones.
- D5-045 permanece no solucionado.
- Auth/UAT real continúa aislada y baseline vigente.
- Gate económico legacy continúa pendiente.
- No se reabre E2-14 ni se adelanta E4.
- No se crea saldo de caja ni se cubren todos los casos futuros de Caja/balance.
- No se crean egresos, cuentas, crédito, devolución, conciliación, exportación o contabilidad.
- No se amplía `GROUP_TREASURY` fuera del reader enumerado.
- No se delega condonación ni se crean roles configurables.
- No se autoriza código, pruebas, suites, Emulator, configuración, Rules, índices ejecutables,
  dependencias, Firebase remoto, deploy o integración Git.

## Resultado

**ADDENDUM E3-08 ADOPTADO — FUENTE NORMATIVA COMPLEMENTARIA DE DOCUMENTOS 2/3/4**

El addendum incorpora D01–D04=A sin persistencia adicional y con consistencia por reconstrucción
completa y acotada. Los gates A/B permanecen pendientes y la implementación requiere autorización
separada. No se declara implementado, verificado o cerrado E3-08 ni Etapa 3.
