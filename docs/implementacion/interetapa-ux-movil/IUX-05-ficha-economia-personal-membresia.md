# IUX-05 — Ficha de Economía personal por Membresía

## Estado

- **Incremento:** `IUX-05`.
- **Estado:** `CERRADO TÉCNICAMENTE EN LOCAL — UAT HUMANA ACOTADA APROBADA — GATES PRODUCTIVOS PENDIENTES`.
- **Base documental:** `dev@88dae54`; implementación iniciada desde `dev@29178cc`.
- **Relevamiento:** [IUX-05](./IUX-05-relevamiento-economia-personal-membresia.md).
- **Adopción normativa:** [addendum IUX-05](../../arquitectura/Documento-2-3-4-addendum-IUX-05-economia-personal-membresia.md).

Las decisiones D01–D05 fueron aprobadas por el usuario; D06–D07 quedaron resueltas por la exclusión
del resumen y la evidencia contractual/técnica. La implementación y los presupuestos 46/47 fueron
autorizados después, y el cierre local registra la conformidad humana acotada recibida. No hubo
despliegue ni modificación de datos productivos.

## 1. Menor alcance útil recomendado

Desde la ruta personal `/dashboard/groups/{groupId}/personal-economy`, después de acreditar su
contexto actual:

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

El detalle del Grupo separa tres destinos implementados: `/membership` para **Mi participación**,
`/personal-economy` para **Economía personal** y `/economy` para **Economía del Grupo** cuando la
Cuenta tiene autorización administrativa. Owner conserva su navegación administrativa y sólo ve los
dos destinos personales si `getMyCurrentGroupMembershipContext` acredita también su Membresía; no
se infiere ese vínculo desde ownership.

Economía personal usa una única superficie: encabezado, pestañas conectadas y panel activo comparten
borde y fondo, sin cajas independientes. La navegación interna usa etiquetas compactas
`Obligaciones | Avisos | Pagos`; **Pagos registrados** se conserva como título del panel. La
subsección activa queda en
el parámetro explícito `economy=obligations|notices|payments`, preservando los demás parámetros de
la URL y el historial Atrás/Adelante. Una URL ausente o inválida se normaliza a `obligations`.
Las tres pestañas usan una grilla de igual ancho también a 360/390 px; la activa comparte el fondo
del panel inferior y no hay scroll horizontal. Conservan semántica de navegación por URL,
`tablist/tab/tabpanel`, foco y teclado. No se crean destinos vacíos para funciones futuras.

Los enlaces anteriores `/membership?economy=...` redirigen a `/personal-economy` conservando query
y hash. Mi participación no monta ni consulta los listados económicos. Mantiene contexto, salida y
recuperación; si existen capabilities delegadas, las presenta bajo la etiqueta **Economía del
Grupo** sin confundirlas con la economía propia.

El layout común resuelve una vez por `{Cuenta, Grupo}` y conserva en memoria el contexto canónico y
las capabilities ya verificadas mientras se navega entre secciones del mismo Grupo. No hay caché persistente.
Cambio de Cuenta/Grupo, reintento o recarga completa invalida ese estado. Sólo los reasons canónicos
de no autorización se interpretan como capability ausente; fallos técnicos conservan advertencia y
reintento.

El encabezado compartido usa `group.nombre` como título y elimina el rótulo duplicado “Grupo
seleccionado”. Si las fuentes existentes acreditan cobertura completa y sólo existe un Grupo, el
título se presenta sin control. Mientras la cobertura está cargando, es parcial o hay más de una
alternativa, nombre y chevron forman un único botón: el menú pagina por completo las Membresías
vigentes (`pageSize: 20`), compone los Grupos administrados y conserva simultáneamente
**Administrás · Integrás** cuando ambas relaciones existen. Debajo se presenta la Temporada cuando
el contexto propio la acredita y la condición Administrás/Integrás, sin inferir permisos desde esas
etiquetas.

Un fallo parcial nunca se interpreta como Grupo único: mantiene utilizable el contexto actual y
ofrece reintento. El menú no persiste permisos ni consulta por opción. Al cambiar de Grupo conserva
la sección equivalente sólo cuando la relación ya acreditada la habilita; de otro modo abre Resumen
Owner o Mi participación y descarta query/hash con IDs, cursores o filtros del Grupo anterior. La
caja inferior queda reservada a la navegación de secciones: pestañas en escritorio y selector en
móvil. Las fuentes actuales enumeran Grupos Owner y Membresías vigentes, no concesiones delegadas
aisladas; por eso no se promete descubrir en el menú otro Grupo accesible únicamente por capability.
El Grupo delegado ya abierto continúa utilizable y los destinos revalidan autorización en backend.

### 2.2 Obligaciones con saldo

- `PENDING | PARTIAL`, concepto, estado, moneda, saldo y vencimiento canónico;
- `dueDate DESC, paymentId DESC`;
- página por defecto/máxima 20 y “Cargar más”;
- acceso al detalle propio;
- sin total, subtotal, aproximación ni cero derivados de items visibles.

En escritorio se presenta como tabla responsive con concepto/período, importe actual, saldo,
estado y acciones. En móvil usa filas compactas con concepto/período, saldo y detalle, sin forzar
una tabla horizontal. Los importes usan alineación tabular y la información secundaria queda en el
detalle.

La evidencia **Pago informado · En revisión** por obligación quedó implementada localmente mediante
la alternativa B aprobada. El DTO anterior no contenía avisos y `paymentDeliveries.lines` continúa
siendo un array de mapas embebido que Firestore no puede filtrar por `paymentId`; por eso la solución
no simula una consulta selectiva ni crea proyección, contador o subcolección. Ejecuta una consulta
agrupada acotada por Membresía y publica su cobertura.

Sí existen piezas cercanas, pero ninguna satisface el acceso propio de la lista:

- `listMyMembershipPaymentNotices` autoriza al sujeto y pagina todos sus avisos; su primera página
  no acredita ausencia para una obligación que puede aparecer después;
- `getMyPaymentDelivery` permite consultar un aviso propio por `deliveryId`, pero primero hace falta
  obtener esa identidad de forma completa;
- el detalle **Owner** ya expone `pendingNotices`, pero usa autorización administrativa y barre todos
  los avisos `REPORTED` de la Membresía dentro de cada detalle;
- `listReportedPaymentDeliveriesForPayments` agrupa hasta 20 Pagos para revisión administrativa,
  relee cada Pago, exige autorización Owner/reviewer, excluye auto-revisión del delegado y consulta
  los avisos sin límite. Es evidencia de mapeo agrupado, no un contrato SUBJECT reutilizable tal cual.

El presupuesto lógico aprobado es 46 lecturas por intento de primera página: Cuenta, Membresía,
Grupo y Temporada (4 documentos), consulta de 20 obligaciones más lookahead (hasta 21) y consulta
agrupada de 20 avisos más lookahead (hasta 21). Una continuación agrega la relectura del ancla y
eleva el máximo a 47. Los reintentos se contabilizan por separado; estas cifras no representan
facturación ni latencia productiva.

Ese límite no acredita un conjunto completo: `MAX_RELATED_NOTICES = 20` pertenece al preview y
registro administrativo E3-04 y no limita reportar, confirmar o rechazar en E3-03. La alternativa
revisada no lo reutiliza como regla de negocio. Define una ventana técnica de evidencia de 20
documentos más lookahead y publica explícitamente si esa ventana agotó o no la consulta.

Alternativas evaluadas:

- **A — existencia por obligación:** no es selectiva con el modelo actual. Una callable por fila
  implicaría hasta 20 llamadas frontend y repetiría autorización; una callable batch que ejecute 20
  queries seguiría leyendo el mismo conjunto de avisos por Membresía hasta probar ausencia. El
  costo es `O(20 × D)` documentos para `D` avisos pendientes y no tiene máximo. `limit(1)` no prueba
  ausencia. **Descartada**.
- **B — consulta agrupada autorizada con cobertura explícita:** una sola consulta
  `membershipId == M AND decisionState == REPORTED ORDER BY __name__ ASC LIMIT 21` puede mapear un
  aviso que cubre varias obligaciones y varios avisos de una obligación. Si devuelve hasta 20,
  agotó la consulta y la cobertura es `COMPLETE`; si devuelve 21, el documento 21 sólo acredita que
  quedan avisos sin leer y la cobertura es `PARTIAL`. Los avisos validados dentro de la ventana
  permiten `FOUND`; la falta de match permite `NONE` únicamente con cobertura `COMPLETE`, y produce
  `UNKNOWN` con cobertura `PARTIAL`. **Aprobada e implementada localmente**.

La forma mínima implementada enriquece el mismo intento de obligaciones mediante una capacidad
pública read-only SUBJECT de PaymentDeliveries, compartiendo Cuenta, Persona, Membresía, Grupo,
Temporada y la transacción. Sigue siendo **una llamada frontend**, con dos consultas Firestore
—obligaciones y avisos—, no una consulta por tarjeta. La capacidad hidrata y valida cada aviso leído:
identidad de documento, schema/origin informado, contexto propio exacto, estado `REPORTED`, fechas,
importe total, líneas 1..20 sin `paymentId` duplicado y relación de cada match con el Pago ya
hidratado de la página. Una línea de otra página es válida pero no produce evidencia en ésta.

El DTO mínimo previsto es:

```text
{
  items: [{
    ...obligation,
    pendingNoticeEvidence:
      { state: "FOUND", notice: {
          deliveryId, reportedAt, declaredPaidOn, requestedAmountMinor
        }}
      | { state: "NONE" }
      | { state: "UNKNOWN", reason: "PARTIAL_COVERAGE" | "SUPPLEMENT_UNAVAILABLE" }
  }],
  pendingNoticeCoverage: "COMPLETE" | "PARTIAL" | "FAILED",
  nextCursor?
}
```

Para varios matches leídos se elige como evidencia representativa el mayor
`reportedAt, deliveryId`; no se afirma que sea la lista completa cuando la cobertura es `PARTIAL`.
La fila `FOUND` muestra una sola vez **Pago informado · En revisión** y abre el aviso propio por
`deliveryId`. `NONE` no muestra indicador. `UNKNOWN/PARTIAL_COVERAGE` ofrece **Consultá tus avisos de
pago** hacia la pestaña global, sin afirmar relación. Si la consulta complementaria falla, el
backend conserva los items de obligaciones, marca cobertura `FAILED`, todos los items sin evidencia
quedan `UNKNOWN/SUPPLEMENT_UNAVAILABLE` y el frontend muestra advertencia/reintento complementario.
El retry puede repetir el intento completo manteniendo visibles los saldos anteriores.

Saldo, estado económico e **Informar un pago** no cambian. La evidencia es informativa: no impide
otro aviso ni promete prevención completa de duplicados. Un aviso con varias líneas puede producir
`FOUND` en varias obligaciones. Confirmar o rechazar durante la lectura queda dentro del snapshot de
la transacción; una respuesta ya publicada puede quedar desactualizada y sólo cambia al refrescar.
Páginas distintas no comparten snapshot.

Presupuesto aprobado por intento exitoso máximo: primera página 46 lecturas lógicas —4 documentos
de autorización/contexto, hasta 21 Pagos y hasta 21 avisos—; continuación 47 por la relectura del
ancla del Pago. Validar avisos y líneas es trabajo en memoria y no agrega lecturas ni hidratación.
Cada retry es otro intento. La ventana `20 + 1` es límite técnico de consulta, no máximo de avisos
permitidos. Los reintentos son intentos separados; facturación y latencia productivas requieren
medición separada.

No se requieren índices nuevos: la consulta reutiliza el índice vigente
`membershipId ASC, decisionState ASC, __name__ ASC`; su suficiencia remota sigue siendo gate.

**Decisión final:** alternativa B y presupuestos 46/47 aprobados, implementados y validados
localmente. No se adopta proyección, writer, contador, persistencia nueva, barrido ilimitado ni
límite de negocio. La validación remota y el despliegue permanecen separados.

El destino global se ofrece una sola vez junto al encabezado como acción secundaria **Ver todas mis
obligaciones**, enlazada a `/dashboard/obligations`; no se duplica por subsección.

### 2.3 Avisos y pagos registrados

No es un timeline. Son dos subsecciones navegables con carga, error, retry y cursor propios:

- **Avisos informados:** `reportedAt DESC, deliveryId DESC`; muestra declaración y estado actual.
- **Pagos registrados:** `registeredAt DESC, origin ASC, receiptId DESC`; `registeredAt` es
  `confirmedAt` para informado confirmado y `recordedAt` para administrativo.

Ambos lectores exponen las líneas históricas ya persistidas en su raíz: concepto snapshot,
vencimiento e importe por obligación. Un aviso rotula cada línea como importe informado; un pago
registrado la rotula como importe aplicado. Varias obligaciones se resumen y ofrecen desglose
accesible. No se relee el Pago actual por fila y un renombre posterior no altera el snapshot. Como
las líneas históricas no guardan `periodKey`, la presentación muestra vencimiento y declara
**Período no informado** cuando no existe otro dato canónico; nunca lo infiere del nombre.

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

- presentación propia sin jerga técnica: `currentPrincipalMinor` se rotula **Importe actual**,
  `balanceMinor` **Saldo pendiente**, las aplicaciones **Pagos aplicados** y correcciones más
  condonaciones **Ajustes de la obligación**;
- el importe original aparece sólo cuando aporta contexto frente al importe actual; una condonación
  se explica como deuda perdonada y su reversión conserva significado y fecha;
- estados de obligación, aviso, pago, aplicación y ajuste se traducen mediante un mapa central de
  los enums reales; un valor desconocido se presenta como no disponible, nunca como pendiente;
- pagos aplicados paginados, ordenados por fecha de aplicación;
- correcciones por revisión descendente;
- condonaciones/reversiones por revisión descendente;
- anulación como estado terminal con `voidedAt`;
- cada concepto conserva su nombre: no se agrupa todo como “ajustes”.

Cuando la obligación propia está `PENDING | PARTIAL`, conserva saldo y no está anulada, el detalle
ofrece **Informar un pago**. La acción delega en `/dashboard/obligations` con `paymentId`, `groupId`,
`membershipId` y retorno explícito; el destino relee el detalle propio cuando hace falta, verifica
el contexto y el writer vuelve a validar pertenencia, saldo y revisión económica. No se incorpora
un formulario ni un comando nuevo, no se rotula “Pagar” y no se depende de capabilities
administrativas. El contrato vigente de `reportOwnPaymentDelivery` no impide por sí solo un nuevo
aviso mientras exista otro pendiente; la interfaz no agrega una prohibición inexistente.

### 2.5 Refresco

Cada bloque consulta por primera vez al activar su pestaña y mediante “Actualizar”. El control
reutiliza el patrón accesible de Pendientes de Inicio: área mínima de 44 px, icono en móvil, texto en
escritorio, nombre accesible, foco visible, indicador de carga y deshabilitación mientras el intento
está activo. El guard local deduplica clics repetidos. Al volver a una
pestaña visitada conserva sus items, cursor y error mientras no cambie la identidad contextual. Un
cambio de Cuenta, Grupo o Membresía remonta la economía y descarta items, cursores y respuestas
tardías anteriores. No hay snapshot global entre bloques, polling, listeners nuevos ni refresh por
foco.

## 3. Contratos concretos propuestos

Los nombres pueden ajustarse técnicamente sin cambiar resultados.

### 3.1 Contexto existente

```text
getMyCurrentGroupMembershipContext({ groupId })
=> { group, season, membership }
```

Es un callable **ya implementado y exportado**, consumido por `/membership` y
`/personal-economy`. IUX-05 lo reutiliza sin
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
  personal integrado en `app/(protected)/dashboard/groups/[groupId]/personal-economy/page.tsx`,
  con compatibilidad desde `membership/page.tsx`; `GroupFrame`, `GroupSwitcher`,
  `GroupContextNavigation` y `GroupPageShell` componen encabezado y navegación contextual;
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

El usuario confirmó en UAT el ajuste visual del encabezado y navegación contextual de Grupo. La
confirmación cubre nombre/chevron y separación entre cambio de Grupo y cambio de sección; no aprueba
la UAT global ni el indicador de aviso pendiente todavía no implementado.

- Grupo y Temporada se identifican antes de los bloques económicos.
- Con un solo Grupo y cobertura completa el título no tiene chevron; con varios Grupos o cobertura
  parcial, el botón de título permite cambiar por teclado/toque sin confundirlo con el selector de
  sección. Fallo parcial conserva el Grupo actual y ofrece reintento.
- Cambiar entre Grupos con relaciones distintas conserva sólo una sección equivalente autorizada y
  no arrastra IDs, cursores, filtros, query ni hash del contexto anterior.
- Mi participación, Economía personal y Economía del Grupo aparecen como destinos distintos según
  contexto propio y capabilities reales; Owner integrante conserva ambos conjuntos de navegación.
- `/membership?economy=payments` y equivalentes conservan query/hash al redirigir a
  `/personal-economy`.
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
| IUX-05-D07 | **Técnica — evidencia** | fijar queries, cursores, índices y presupuesto de lecturas | A: asumir contratos actuales; B: ampliar readers con contexto y probar cada stream; C: compositor único nuevo | **B:** contratos de §3, cursors ligados, páginas 20, presupuestos 46/47 para Obligaciones, 30 Avisos, 51 Pagos registrados y 72 Aplicaciones, y un índice documentado | Revisión de configuración, validación remota del índice y medición productiva siguen como gates; **RESUELTA E IMPLEMENTADA LOCALMENTE** |

D01–D05 quedan adoptadas por aprobación explícita del usuario. D06 queda resuelta por la exclusión
del resumen y D07 por los contratos, presupuestos e índice identificados. Las pruebas ejecutables,
la creación/despliegue del índice, mediciones y UAT requieren autorización de implementación y no
están afirmadas como evidencia ya ejecutada. IUX-05 queda cerrado técnicamente en local con UAT
humana acotada aprobada; la habilitación productiva requiere autorización y gates separados.
