# IUX-05 — Ficha implementable de Economía personal por Membresía

## Estado

- **Incremento:** `IUX-05`.
- **Estado:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Base:** `dev@88dae54`.
- **Relevamiento:** [IUX-05](./IUX-05-relevamiento-economia-personal-membresia.md).
- **Adopción normativa:** [addendum IUX-05](../../arquitectura/Documento-2-3-4-addendum-IUX-05-economia-personal-membresia.md).

Las decisiones D01–D05 fueron aprobadas por el usuario; D06–D07 quedan resueltas por la exclusión
del resumen y la evidencia contractual/técnica documentada. Este estado no autoriza código,
configuración, índices, pruebas ejecutables, instalaciones, migraciones o despliegues. D5-067 sí
autoriza la integración y publicación de esta definición documental.

## 1. Menor alcance útil recomendado

En la ruta vigente `/dashboard/groups/{groupId}/membership`, después de acreditar su contexto actual:

1. identificar Grupo, Temporada y Membresía activa;
2. listar obligaciones con saldo de esa `membershipId`, incluidos Pagos de Períodos anteriores de
   la misma raíz;
3. mostrar Actividad mediante dos listas independientes: Avisos informados y Pagos registrados;
4. ampliar el detalle propio con aplicaciones minimizadas, correcciones y condonaciones vigentes;
5. conservar el acceso global `Mis obligaciones`;
6. diferir resumen agregado, selector/ruta histórica y timeline unificado.

No se mezclan raíces de renovación intertemporada. La reactivación no fragmenta la raíz por
Períodos. Los accesos administrativos continúan separados y no autorizan economía propia.

## 2. Presentación y cargas

### 2.1 Contexto

El encabezado identifica `group.nombre`, `season.nombre` y la participación actual. IDs internos no
se usan como etiqueta visible. Un error del contexto retira todos los bloques económicos.

### 2.2 Obligaciones con saldo

- `PENDING | PARTIAL`, concepto, estado, moneda, saldo y vencimiento canónico;
- `dueDate DESC, paymentId DESC`;
- página por defecto/máxima 20 y “Cargar más”;
- acceso al detalle propio;
- sin total, subtotal, aproximación ni cero derivados de items visibles.

### 2.3 Actividad

No es un timeline. Contiene dos sublistas con carga, error, retry y cursor propios:

- **Avisos informados:** `reportedAt DESC, deliveryId DESC`; muestra declaración y estado actual.
- **Pagos registrados:** `registeredAt DESC, origin ASC, receiptId DESC`; `registeredAt` es
  `confirmedAt` para informado confirmado y `recordedAt` para administrativo.

Un aviso `REPORTED` se etiqueta “En revisión” y no reduce saldo. `REJECTED` conserva deuda.
`RESOLVED_BY_ADMINISTRATIVE_RECEIPT` enlaza la recepción administrativa. `CONFIRMED` se distingue
de la declaración: el aviso explica lo informado y “Aviso confirmado — ver pago registrado” enlaza
la recepción correspondiente cuando el contrato aporta la referencia. No se presenta como dos
pagos. Reversiones conservan la recepción original, muestran `REVERSED` y `reversedAt`, sin
reordenarla.

| Etiqueta visible | Campo canónico |
| --- | --- |
| Informado | `reportedAt` |
| Fecha declarada | `declaredPaidOn` |
| Confirmado | `confirmedAt` |
| Rechazado | `rejectedAt` |
| Resuelto administrativamente | `resolution.resolvedAt` |
| Registrado | `recordedAt` |
| Fecha efectiva | `receivedOn` |
| Revertido | `reversedAt` |

La fecha efectiva/declarada no sustituye la fecha de información, confirmación, registro, rechazo o
reversión. El estado y efecto `APPLIED | REVERSED` permanecen visibles.

### 2.4 Detalle de obligación

- aplicaciones de ingresos paginadas, ordenadas por fecha de aplicación;
- correcciones por revisión descendente;
- condonaciones/reversiones por revisión descendente;
- anulación como estado terminal con `voidedAt`;
- cada concepto conserva su nombre: no se agrupa todo como “ajustes”.

### 2.5 Refresco

Cada bloque consulta al montar y mediante “Actualizar”. No hay snapshot global entre bloques,
polling, listeners nuevos ni refresh por foco. Respuestas tardías de otra sesión, Grupo o Membresía
se descartan.

## 3. Contratos concretos propuestos

Los nombres pueden ajustarse técnicamente sin cambiar resultados.

### 3.1 Contexto existente

```text
getMyCurrentGroupMembershipContext({ groupId })
=> { group, season, membership }
```

Es un callable **ya implementado, exportado y consumido por `/membership`**. IUX-05 lo reutiliza sin
crear otro callable ni ampliar su DTO o los estados admitidos: acredita exclusivamente el contexto
vigente (Grupo activo, Temporada abierta y Membresía activa). El acceso histórico global sigue a
cargo de `Mis obligaciones`; este contrato no se usa para abrir una raíz histórica contextual.

### 3.2 Obligaciones contextuales

```text
listMyMembershipObligations({
  groupId,
  membershipId,
  status: "OPEN",
  pageSize?: 1..20,
  cursor?
})
=> { items: Obligation[], nextCursor? }
```

El backend deriva Persona, hidrata Membresía y exige coincidencia exacta de Persona, Grupo y
Temporada en raíz, ancla y cada Pago. Query candidata:

```text
payments:
membershipId == input.membershipId
estado IN ["PENDING", "PARTIAL"]
ORDER BY dueDate DESC, __name__ DESC
```

Índice candidato ya versionado: `membershipId ASC, estado ASC, dueDate DESC`; debe comprobarse el
orden efectivo de `__name__`, Emulator y necesidad remota antes de afirmar reutilización.

### 3.3 Avisos informados

```text
listMyMembershipPaymentNotices({ groupId, membershipId, pageSize?: 1..20, cursor? })
=> { items: PaymentNoticeItem[], nextCursor? }

PaymentNoticeItem = {
  deliveryId, reportedAt, declaredPaidOn, declaredTotalMinor,
  decisionState,
  confirmedAt?, rejectedAt?, rejection?, resolution?
}
```

Puede evolucionar `listMyPaymentDeliveries`, siempre que acredite el contexto completo. Orden:
`reportedAt DESC, deliveryId DESC`. El índice actual por
`personId, membershipId, reportedAt DESC` es candidato y debe probarse con el contrato final.

### 3.4 Pagos registrados

```text
listMyMembershipRegisteredPayments({ groupId, membershipId, pageSize?: 1..20, cursor? })
=> { items: OwnRegisteredPayment[], nextCursor? }

OwnRegisteredPayment = {
  receiptId, origin, registeredAt, effectiveOn, totalMinor, currency,
  applicationState, reversedAt?, relatedDeliveryId?
}
```

El reader fusiona únicamente:

- informados `decisionState == CONFIRMED`, por `confirmedAt DESC, deliveryId DESC`;
- administrativos `origin == ADMINISTRATIVE`, por `recordedAt DESC, receiptId DESC`.

El cursor conserva ancla por stream y queda ligado a Cuenta, Persona, Grupo, Temporada, Membresía,
orden, versión y page size. Son candidatos los índices existentes de ingresos administrativos por
Persona/Membresía; la rama informada probablemente requiera verificar o agregar el índice mínimo
`membershipId, decisionState, confirmedAt DESC, __name__ DESC`. Su incorporación forma parte de una
futura autorización de implementación separada.

El merge pide `pageSize + 1` en cada stream desde sus anclas independientes, normaliza la clave
`{registeredAt, origin, receiptId}`, aplica el comparador completo y emite como máximo 20 filas. El
cursor siguiente avanza cada stream sólo hasta su última fila efectivamente emitida; conserva el
ancla anterior del stream que no aportó filas. Así, empates y páginas dominadas por una fuente no
saltan ni repiten registros. La clave canónica de deduplicación es `{origin, receiptId}`: una raíz
`INFORMED/CONFIRMED` produce una sola fila informada y una raíz `ADMINISTRATIVE` una sola fila
administrativa. Un aviso resuelto por recepción administrativa sólo enlaza esa recepción y no entra
como informado confirmado; el enlace nunca crea otra fila de pago.

Una fila revertida conserva `registeredAt` original, participa en el mismo orden y expone
`applicationState: "REVERSED"` más `reversedAt`. La fecha de reversión no la mueve ni crea un segundo
pago.

### 3.5 Aplicaciones propias

```text
getMyPaymentObligationDetail({ paymentId })
=> detalle vigente + { applications: OwnPaymentApplication[], applicationNextCursor? }

listMyPaymentObligationApplications({ paymentId, pageSize?: 1..20, cursor? })
=> { items: OwnPaymentApplication[], nextCursor? }
```

```text
OwnPaymentApplication = {
  applicationId,
  origin: "INFORMED" | "ADMINISTRATIVE",
  amountMinor,
  currency,
  effectiveOn,
  appliedAt,
  applicationState: "APPLIED" | "REVERSED",
  reversedAt?
}
```

El callable propio existente hoy acredita el Pago y devuelve obligación, correcciones y
condonaciones, pero **todavía no devuelve aplicaciones**. La implementación autorizada en el futuro
extenderá ese reader y su DTO `SUBJECT`; la continuación será el contrato paginado separado.

El reader propio reutiliza `payments/{paymentId}/deliveryApplications` y sus raíces de
Entrega/Recepción. Verifica línea, importe, estado, Pago y contexto. Omite actor, motivos internos y
capabilities. Fusiona aplicaciones informadas por `confirmedAt` y administrativas por `appliedAt`;
cursor con dos anclas. No escribe ni modifica writers.

### 3.6 Resumen

No se propone callable de resumen en el primer corte. Queda prohibido calcularlo en frontend desde
la página. El algoritmo íntegro y su costo están en el relevamiento §6.

### 3.7 Filtros, cursores y consistencia

Los filtros iniciales son fijos: Obligaciones `PENDING | PARTIAL`; Avisos todos sus estados; Pagos
registrados sólo informados `CONFIRMED` y administrativos, ambos `APPLIED | REVERSED`; Aplicaciones
`APPLIED | REVERSED`. No hay filtros UI adicionales en el primer corte.

Cada contrato usa default/máximo 20, `limit(21)` y cursor opaco/versionado ligado a:

```text
accountId, personId, groupId, seasonId, membershipId,
paymentId cuando corresponda, filtros, orden, pageSize y contractVersion
```

Pagos registrados y Aplicaciones guardan un ancla por stream. Cada continuación reautoriza,
rehidrata la raíz y valida anclas. No hay snapshot común entre bloques o páginas; altas posteriores
al ancla aparecen al refrescar y una mutación incompatible exige reiniciar sólo esa lista.

### 3.8 Costo e índices

| Consulta | Techo previsto por página | Índice |
| --- | --- | --- |
| Obligaciones | ≤30 lecturas | existente `payments(membershipId, estado, dueDate DESC)` |
| Avisos | ≤30 lecturas | existente `paymentDeliveries(personId, membershipId, reportedAt DESC)` |
| Pagos registrados | ≤51 lecturas | administrativo existente; informado confirmado requiere índice nuevo |
| Aplicaciones | ≤72 lecturas | queries directas de subcolección; sin compuesto previsto |

Cada techo corresponde a **un intento** e incluye acreditación de identidad/contexto, lookahead
`limit + 1`, validaciones e hidratación y, para Aplicaciones, hasta 20 raíces Entrega/Recepción
correlacionadas. Los reintentos repiten lecturas y se contabilizan por intento separado; no están
incluidos en el techo de una ejecución. Presupuestos, facturación efectiva y latencia siguen sujetos
a medición. El único índice nuevo previsto es:

```text
paymentDeliveries (COLLECTION):
membershipId ASC, decisionState ASC, confirmedAt DESC, __name__ DESC
```

Las pruebas locales/Emulator deben revisar forma, dirección, cursores y necesidad declarada por la
consulta, pero **no certifican** la aceptación de un índice compuesto en producción. La revisión de
la query contra la configuración versionada y la validación remota del índice serán gates de una
implementación autorizada, sin ejecutarse en esta fase. No se crea otro índice sin evidencia.

## 4. Autorización e integridad

Cada reader:

1. exige sesión, Cuenta y Persona canónicas;
2. hidrata `membershipId` y prueba Persona, `groupId` y `seasonId` exactos;
3. acepta la raíz activa acreditada por `/membership`, incluidos Pagos de sus Períodos anteriores;
4. no sigue lineage ni incorpora sucesoras/predecesoras de renovación;
5. valida cada recurso y el ancla del cursor dentro del mismo contexto;
6. falla la página completa ante incompatibilidad;
7. registra cero escrituras y no consulta mediante SDK cliente directo.

Autorización concreta:

- Obligaciones: el Módulo Pagos acredita actor/Persona y la raíz antes de consultar; cada Pago debe
  repetir Persona, Grupo, Temporada y Membresía exactos.
- Avisos: PaymentDeliveries reutiliza `ownAuthorization`, agrega acreditación de raíz/contexto y
  valida cada Entrega.
- Pagos registrados: AdministrativeReceipts acredita la raíz una vez por página y valida ambos
  streams; ninguna capability Owner/Tesorería/Revisión participa.
- Aplicaciones: PaymentDeliveries acredita primero que el Pago pertenece a la Persona y luego cada
  aplicación contra su Entrega/Recepción y línea exacta; la audiencia es `SUBJECT`.
- Detalle/correcciones/condonaciones: conservan la autorización `SUBJECT` existente.

Frontera modular: Pagos conserva saldo y ajustes; PaymentDeliveries conserva Avisos y aplicaciones
informadas; AdministrativeReceipts conserva recepciones y compone Pagos registrados mediante
capacidades internas públicas minimizadas. Ningún módulo importa repositorios internos ajenos.

## 5. Archivos previstos si luego se autoriza

- `functions/src/payments/application/paymentContract.js`, callable/store de Pagos: obligaciones
  contextuales y detalle propio conservado;
- `functions/src/paymentDeliveries/application/paymentDeliveryContract.js`, callable/store y
  capacidad pública: Avisos y aplicaciones propias minimizadas;
- `functions/src/administrativeReceipts/application/administrativeReceiptContract.js`,
  callable/store: composición de Pagos registrados;
- `functions/src/*/infrastructure/*Module.js` y exports sólo para cablear readers autorizados;
- `firestore.indexes.json`: un índice informado confirmado, sujeto a prueba;
- frontend: `services/paymentsService.ts`, `services/paymentDeliveriesService.ts`,
  `services/administrativeReceiptsService.ts`, tipos económicos y un componente nuevo de Economía
  personal integrado en `app/(protected)/dashboard/groups/[groupId]/membership/page.tsx`;
- pruebas unitarias/Emulator de los tres módulos, arquitectura, frontend y UAT;
- actualización posterior de ficha, informe y cierre.

No se prevén cambios a writers, Rules deny-all, cálculos financieros, Períodos, guards, receipts o
fuentes de verdad.

## 6. Pruebas contractuales mínimas

1. raíz reactivada con varios Períodos: una economía, sin duplicar Pagos;
2. renovación intertemporada: raíz anterior excluida;
3. pago parcial: aplicación exacta y saldo `PARTIAL`;
4. varios pagos sobre una obligación: varias aplicaciones, sin duplicar importe;
5. recepción que cubre varias obligaciones: cada detalle muestra sólo su línea;
6. aviso `REPORTED`: separado y sin reducción de deuda;
7. rechazo: estado/fecha visibles, deuda intacta;
8. confirmación: aviso y recepción correlacionados pero semánticamente distintos;
9. resolución administrativa: aviso enlazado al ingreso, sin contarlo dos veces;
10. reversión: recepción conservada, aplicaciones `REVERSED` y saldo restaurado;
11. corrección, condonación, reversión de condonación y anulación mantienen significado;
12. obligaciones, avisos, Pagos registrados y aplicaciones con más de una página;
13. cursor cruzado/alterado/obsoleto y ancla incompatible;
14. sesión/Persona distinta, respuesta tardía y `membershipId` ajena;
15. Grupo/Temporada/recurso cruzado: fallo sin enumeración;
16. varias monedas a nivel contractual: nunca suma cruzada;
17. ausencia de resumen, subtotal, límite artificial, polling, listener y escritura;
18. `Mis obligaciones` conserva historia y acciones propias.

## 7. UAT preliminar

- Grupo y Temporada se identifican antes de los bloques económicos.
- En 360×800, 390×844, 768×900, 1440×900 y zoom 200 % no hay overflow.
- Avisos y Pagos registrados no se confunden; “En revisión” nunca parece dinero aplicado.
- Pago parcial y varios pagos se explican desde aplicaciones del detalle.
- Cada lista pagina y reintenta sin borrar las otras.
- No se muestra un total basado en items cargados.
- Actualizar descarta respuestas anteriores y no duplica filas.
- Una sesión distinta nunca ve datos de la anterior.
- `Mis obligaciones` sigue visible y funcional.

UAT no sustituye Emulator para autorización, integridad, cursores, índices, costo y cero escrituras.

## 8. Pendientes reales no bloqueantes para la definición

- autorización separada para implementar;
- revisar la query/configuración, crear el único índice documentado sólo con autorización y validar
  remotamente su aceptación/estado; Emulator no certifica índices de producción;
- ejecutar pruebas de autorización, integridad, paginación, concurrencia y cero escrituras;
- medir facturación/latencia real y confirmar los presupuestos documentales;
- ejecutar UAT móvil, accesibilidad y estados de error/retry;
- conservar y completar la UAT complementaria de IUX-04 y los gates productivos IUX-02/E3.

No se promete snapshot común entre bloques o páginas. El resumen agregado, la navegación histórica
contextual y el timeline unificado quedan fuera del primer corte y no son bloqueos ocultos.

## 9. Decisiones resueltas

| ID | Naturaleza | Problema | Alternativas | Recomendación | Consecuencias y estado |
| --- | --- | --- | --- | --- | --- |
| IUX-05-D01 | **Funcional — usuario** | definir qué economía pertenece al contexto | A: sólo Período abierto; B: raíz completa; C: Grupo/Persona incluyendo renovaciones | **B:** toda la `membershipId`, incluidos Períodos anteriores; excluir otras raíces | evita fragmentar reactivaciones y mezclar renovaciones; **ADOPTADA** |
| IUX-05-D02 | **Funcional — usuario** | decidir acceso a raíces históricas | A: ampliar `/membership`; B: ruta/selector nuevo; C: mantener contexto vigente y acceso global | **C:** requisitos actuales de `/membership`, `Mis obligaciones` global y ruta histórica diferida | menor alcance; no ofrece economía contextual de una raíz finalizada; **ADOPTADA** |
| IUX-05-D03 | **Funcional — usuario** | definir composición y consistencia visible | A: callable/snapshot único; B: bloques independientes; C: carga cliente y mezcla local | **B:** obligaciones y actividad independientes; resumen diferido; sin snapshot global | errores/refrescos separados y posible diferencia temporal explícita; **ADOPTADA** |
| IUX-05-D04 | **Funcional — usuario** | ordenar actividad sin confundir declaración, ingreso y ajuste | A: timeline único; B: lista actual mezclada; C: Avisos y Pagos registrados separados, ajustes en detalle | **C:** Avisos por `reportedAt`; Pagos registrados por registro; ajustes/aplicaciones por obligación | evita merge global y conserva significado; confirmación correlacionada sin presentarla como dos pagos; **ADOPTADA** |
| IUX-05-D05 | **Funcional — usuario** | explicar pagos parciales y múltiples al sujeto | A: no exponer; B: recepción completa; C: aplicaciones minimizadas por obligación | **C:** importe, origen, fechas y estado; sin identidad de operador ni datos internos | amplía DTO propio, no permisos ni writes; **ADOPTADA** |
| IUX-05-D06 | **Técnica — evidencia** | acreditar saldo/cantidad exactos sin costo o integridad ocultos | A: aggregate físico; B: barrido total; C: persistencia nueva; D: diferir agregado | **D:** primer corte sin resumen; ninguna suma de página | evita suma incompleta, límite artificial y nueva fuente; **RESUELTA PARA ESTE CORTE** |
| IUX-05-D07 | **Técnica — evidencia** | fijar queries, cursores, índices y presupuesto de lecturas | A: asumir contratos actuales; B: ampliar readers con contexto y probar cada stream; C: compositor único nuevo | **B:** contratos de §3, cursors ligados, páginas 20, presupuestos ≤30/30/51/72 y un índice documentado | Revisión de configuración, validación remota del índice y medición son gates de implementación; **RESUELTA** |

D01–D05 quedan adoptadas por aprobación explícita del usuario. D06 queda resuelta por la exclusión
del resumen y D07 por los contratos, presupuestos e índice identificados. Las pruebas ejecutables,
la creación/despliegue del índice, mediciones y UAT requieren autorización de implementación y no
están afirmadas como evidencia ya ejecutada. No quedan bloqueos documentales: IUX-05 queda
`LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
