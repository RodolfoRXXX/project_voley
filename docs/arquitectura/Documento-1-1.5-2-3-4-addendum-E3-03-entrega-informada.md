# Addendum a Documentos 1, 1.5, 2, 3 y 4 — E3-03 / entrega informada multiobligación

## Estado

`ADDENDUM NORMATIVO ADOPTADO — E3-03`

- **Fecha de preparación:** 2026-10-09.
- **Base:** `dev` en `3f6b82c64f74713981dd923d5eb9a2de9734f9f6`.
- **Carácter:** fuente normativa complementaria adoptada para E3-03; complementa, sin duplicar ni
  editar retrospectivamente, los Documentos 1, 1.5, 2, 3 y 4 vigentes.
- **Decisiones incorporadas:** E3-03-D01–D08, aprobadas por el usuario.
- **Ficha asociada:**
  [E3-03](../implementacion/etapa-3/E3-03-ficha-aviso-validacion-pago.md).
- **Decisión asociada:**
  [DEC-E3-03](../implementacion/etapa-3/DEC-E3-03-entrega-informada.md).

Este addendum formaliza el complemento normativo mínimo de E3-03 y se integra por D5-048. No
autoriza implementación ni altera retrospectivamente los documentos base.

## 1. Complemento de ubicación para Documento 1

### 1.1 Ubicación y responsabilidad

**Entrega informada** se incorpora al **Dominio Deportivo**, dentro del área económica vinculada a
Membresías, como Agregado independiente. Representa una declaración humana única de recepción y su
distribución explícita entre obligaciones existentes; posee identidad, líneas, total derivado,
decisión, lifecycle y trazabilidad de reversión común.

No pertenece al dominio Comercial: no vende productos o servicios, factura, cobra mediante una
pasarela ni administra clientes comerciales. Tampoco sustituye a Pago. Pago sigue representando la
obligación y sus efectos económicos; Entrega informada sólo origina aplicaciones en esos Pagos tras
una confirmación válida.

### 1.2 Colaboraciones y límites

- consume referencias inmutables a Grupo, Temporada, Membresía, Persona sujeto y Pagos existentes;
- no crea ni modifica Grupo, Temporada, Membresía, Persona o autorización;
- no posee deuda, movimientos, saldo, estado económico ni instrumentos de cobro;
- coordina con Pago sólo en confirmación y reversión mediante la excepción D02;
- no habilita una regla general de transacciones entre Agregados o módulos.

## 2. Complemento conceptual para Documento 1.5

### 2.1 Definición y relaciones

Una **Entrega informada** es la raíz de una recepción declarada por una Persona respecto de una
Membresía exacta. Contiene entre 1 y 20 **Líneas de entrega** inmutables. Cada línea referencia un
Pago-obligación único y conserva modo `FULL | PARTIAL`, importe solicitado exacto y snapshot
económico de la intención. El total de la Entrega es la suma derivada de sus líneas.

Relaciones conceptuales:

- Grupo `1 -> N` Entregas informadas;
- Temporada `1 -> N` Entregas informadas;
- Membresía `1 -> N` Entregas informadas;
- Entrega informada `1 -> 1..20` Líneas de entrega;
- Línea de entrega `N -> 1` Pago-obligación, con unicidad de Pago dentro de la Entrega;
- Entrega confirmada `1 -> 1..20` aplicaciones económicas, cada una subordinada a su Pago;
- Entrega confirmada `0..1` reversión común completa.

La Entrega no es un Movimiento. El Movimiento o aplicación económica pertenece a Pago y prueba el
efecto confirmado sobre una obligación. La declaración, aun confirmada, no se vuelve una segunda
fuente de dinero ni se suma a las aplicaciones al calcular ingresos o saldos.

### 2.2 Identidad y lifecycle conceptual

`deliveryId` identifica la Entrega completa y `lineId` cada línea. La decisión recorre
`REPORTED -> CONFIRMED | REJECTED`; una confirmada conserva además vigencia `APPLIED | REVERSED`.
Revertir conserva declaración, confirmación, líneas y aplicaciones originales, y agrega una única
trazabilidad de reversión común. Ningún estado de Entrega expresa el saldo de una obligación.

## 3. Complemento funcional para Documento 2

### 3.1 Finalidad

Una Persona vinculada a una Membresía puede informar una sola entrega manual y distribuir su importe
explícitamente entre varias obligaciones propias existentes. La entrega no prueba recepción ni
reduce deuda hasta que Owner o revisor económico autorizado confirme la declaración completa.

El recorrido es:

```text
obligaciones propias -> selección explícita -> total/parcial por línea
-> total calculado -> entrega REPORTED
-> confirmación o rechazo completo
-> aplicaciones atómicas en cada obligación Pago
```

No existe registro directo, reparto automático, interés, crédito, adjunto o pasarela.

### 3.2 Scope cerrado

Cada entrega referencia exclusivamente:

- un Grupo exacto;
- una Temporada exacta;
- una raíz Membresía exacta;
- entre 1 y 20 obligaciones Pago únicas de esa Membresía.

Todas las líneas deben correlacionar `groupId`, `seasonId`, `membershipId` y `personId`. Que una
Persona posea varias Membresías no permite mezclarlas. Renovación crea otro contexto; reactivación
conserva la raíz pero no elimina las comprobaciones de integridad.

### 3.3 Actores

**Integrante o exintegrante sujeto**

- accede por Cuenta–Persona canónica;
- ve obligaciones propias activas e históricas;
- informa contra una Membresía propia exacta;
- no aporta Persona, Grupo, Temporada, total, saldo o estado como autoridad.

**Owner vigente**

- actúa por Cuenta y ownership;
- no necesita Persona ni Membresía propia;
- lista, confirma y rechaza entregas del Grupo;
- revierte una entrega confirmada completa, con motivo;
- opera obligaciones prearchivo conforme a la excepción vigente.

**Revisor económico autorizado**

- requiere concesión explícita `GROUP_PAYMENT_NOTICE_REVIEW`;
- lista, confirma y rechaza entregas completas de terceros en Grupo activo;
- no decide si alguna línea pertenece a su propia `membershipId`;
- no revierte y no opera en Grupo archivado.

`GROUP_TREASURY` sigue exclusivamente de consulta. Cargo, rol global, Plan, IDs conocidos y grants
anteriores no autorizan.

### 3.4 Desglose y total

Cada línea identifica una obligación y un modo. Tanto para `FULL` como para `PARTIAL`, el cliente
envía el `requestedAmountMinor` exacto que mostró y confirmó el sujeto, junto con
`expectedBalanceMinor` y `expectedEconomicRevision`. En `FULL`, ese importe coincide con el saldo
mostrado; en `PARTIAL`, es mayor que cero y no superior a ese saldo.

El backend relee la obligación y valida importe, saldo y revisión sin reemplazar silenciosamente el
importe por el saldo actual. Si el snapshot cambió antes de informar, responde
`DELIVERY_DRAFT_STALE`, identifica las líneas afectadas con sus valores propios actuales y no crea
entrega ni receipt terminal. El sujeto debe revisar y confirmar nuevamente el desglose.

El backend rechaza obligaciones repetidas, líneas fuera de scope y más de 20 líneas. Ordena las
líneas canónicamente para hash/idempotencia y deriva:

`declaredTotalMinor = sum(requestedAmountMinor)`.

Líneas y total son inmutables. La autoridad administrativa no edita, recorta o redistribuye. Para
otra distribución se rechaza la entrega cuando corresponda y el sujeto informa una nueva.

### 3.5 Fechas y rechazo

`declaredPaidOn` es una fecha civil obligatoria, válida y no futura en
`America/Argentina/Buenos_Aires`. No se exige que sea posterior al alta ni al vencimiento: una
entrega real puede anteceder al registro administrativo de una obligación. `reportedAt`, `confirmedAt`,
`rejectedAt` y `reversedAt` son timestamps autoritativos de servidor.

Rechazar exige una categoría cerrada:

- entrega no recibida;
- importe/desglose no coincidente;
- fecha no coincidente;
- entrega duplicada;
- otro.

La observación es opcional, excepto “otro”, que exige explicación presentable. El rechazo es de la
entrega completa y no produce aplicaciones.

### 3.6 Ausencia de reserva y entregas solapadas

Pueden existir varias entregas `REPORTED` con una o más obligaciones comunes. Ninguna reserva saldo,
reduce deuda o bloquea otras declaraciones. La presentación advierte posibles pendientes/duplicados,
pero esa advertencia no es una deduplicación autoritativa ni impide informar.

Al confirmar se releen todos los saldos. Si cualquier línea supera su saldo vigente:

- la confirmación completa se bloquea;
- no se crea, modifica o confirma ninguna aplicación;
- ningún saldo o estado económico cambia;
- la entrega continúa `REPORTED`;
- Owner/revisor puede rechazarla explícitamente;
- una corrección administrativa futura puede cambiar el contexto económico sólo mediante su
  política aprobada; cuando corresponda, el sujeto crea una nueva entrega.

No hay rechazo automático, confirmación parcial, recorte o redistribución.

Si todas las líneas caben, cada Pago recibe exactamente el `requestedAmountMinor` persistido. El
modo `FULL` no vuelve a consultar el saldo para sustituir el importe: si el exigible aumentó después
de informar, la aplicación exacta puede dejar esa obligación parcial. El total confirmado sigue
siendo la suma inmutable de las líneas declaradas.

### 3.7 Confirmación y resultado

Confirmar registra todas las aplicaciones o ninguna. Cada obligación deriva desde sus propios
movimientos:

- `PENDING`: ingreso neto cero;
- `PARTIAL`: ingreso neto mayor que cero y menor que exigible;
- `SETTLED`: ingreso neto igual al exigible.

Una entrega puede dejar diferentes obligaciones parciales o saldadas. La entrega continúa siendo
una sola recepción y no N pagos independientes.

### 3.8 Reversión completa

Sólo Owner puede revertir. La reversión:

- referencia una entrega con `decisionState = CONFIRMED` y `applicationState = APPLIED`;
- exige motivo e idempotency key;
- neutraliza todas las aplicaciones o ninguna;
- conserva declaración, confirmación, aplicaciones originales y actores;
- conserva `decisionState = CONFIRMED` y cambia `applicationState` de `APPLIED` a `REVERSED`;
- crea historia de reversión única y trazable;
- rederiva todos los saldos/estados;
- no devuelve dinero, ajusta exigible o condona deuda.

No existe reversión parcial, reversión de reversión o reaplicación de la misma entrega.

### 3.9 Temporada cerrada, exintegrante y archivo

Temporada cerrada y Membresía finalizada no impiden liquidar obligaciones existentes propias. No se
repite elegibilidad de generación.

En Grupo archivado:

- sólo sujeto propio informa y sólo Owner confirma, rechaza o revierte;
- toda línea debe ser Pago prearchivo íntegro según el addendum vigente;
- una línea incompatible bloquea toda la operación;
- no reviven grants ni se crean obligaciones, conceptos o actividad;
- no se modifica Grupo, Temporada, Membresía o Períodos.

## 4. Complemento de dominio para Documento 3

### 4.1 Autoridades separadas

La entrega común es fuente de verdad de:

- identidad de la declaración;
- sujeto/contexto correlacionado;
- fecha declarada;
- líneas e importe total declarados;
- estado de decisión, actores y timestamps;
- reversión común, cuando exista.

Cada obligación Pago sigue siendo fuente de verdad de:

- importe exigible;
- aplicación económica recibida desde la entrega;
- ingresos brutos, reversiones, neto, saldo y estado;
- `economicRevision` e historia económica propia.

La entrega no almacena saldos autoritativos y una obligación no reconstruye la declaración común
como N avisos independientes.

### 4.2 Clasificación normativa aprobada — E3-03-D08=B

D08 adopta **Entrega informada como Agregado independiente**. Su raíz es dueña sólo de declaración,
líneas, total derivado, decisión, lifecycle y trazabilidad de reversión común. Posee identidad,
invariantes y Repositorio propios. No posee deuda, aplicaciones, movimientos, saldo, estado o
revisión económica.

Cada Pago-obligación conserva aplicaciones, movimientos, saldo, estado y `economicRevision`. La
Entrega no se agrega a esos importes al consultar ingresos: correlaciona una recepción humana única,
pero el efecto monetario existe una sola vez en las aplicaciones de los Pagos.

La alternativa descartada fue una variante `DELIVERY_NOTICE` de Pago. Era técnicamente posible sin
duplicar saldo, pero reunía bajo Pago invariantes y razones de cambio de una obligación individual y
de una recepción común multiobligación. Esa mezcla de responsabilidades motivó adoptar el Agregado
separado; el descarte no autoriza otras fronteras ni reabre D08.

### 4.3 Lifecycle en dos ejes

La decisión del aviso es inmutable:

```text
REPORTED -> CONFIRMED
REPORTED -> REJECTED
```

Una entrega confirmada posee vigencia económica:

```text
CONFIRMED + APPLIED
CONFIRMED + REVERSED
```

Revertir no borra `CONFIRMED`. La consulta presenta “aviso confirmado — entrega revertida”. Un
rechazo nunca posee aplicaciones.

### 4.4 Identidad y unicidad

- `deliveryId` identifica la declaración completa;
- `lineId` identifica cada línea dentro de la entrega;
- un `paymentId` aparece como máximo una vez por entrega;
- una aplicación se identifica determinísticamente por `deliveryId + paymentId`;
- una reversión común se identifica una vez por `deliveryId`;
- cada aplicación original admite a lo sumo una referencia a esa reversión;
- otra entrega puede aplicar al mismo Pago sólo si el saldo vigente lo permite.

El total derivado y el hash canónico hacen irrelevante el orden de líneas para idempotencia, sin
perder el orden presentacional elegido por la UI. El hash incluye scope, fecha y, por línea,
`paymentId`, modo, importe solicitado exacto, saldo esperado y revisión económica esperada.

### 4.5 Excepción multi-Pago acotada

E3-03 adopta una regla de consistencia inmediata: confirmar o revertir modifica una raíz Entrega
informada y entre 1 y 20 raíces Pago en una sola transacción. La excepción:

- se limita a máximo 20 obligaciones de una Membresía/Temporada/Grupo;
- se limita a confirmar o revertir una entrega E3-03;
- no permite transacciones generales entre Agregados o módulos;
- exige que todos los Pagos pertenezcan a la misma Membresía, Temporada y Grupo de la Entrega;
- sólo lee Grupo, Temporada, Membresía, Persona/Cuenta, ownership y autorización; no los modifica;
- no autoriza otros flujos a citarla por analogía;
- conserva comportamiento e invariantes de cada Pago antes de persistir el conjunto.

La atomicidad se justifica por la postcondición funcional todo-o-nada, no por conveniencia técnica.
Una saga Pago por Pago no es equivalente mientras no se admitan reservas, efectos parciales o una
fuente externa de saldo.

### 4.6 Invariantes

1. Entre 1 y 20 obligaciones únicas, todas del mismo contexto exacto.
2. Total igual a suma de líneas inmutables.
3. `REPORTED` y `REJECTED` tienen efecto económico cero.
4. `CONFIRMED + APPLIED` implica exactamente una aplicación por línea.
5. `CONFIRMED + REVERSED` implica reversión completa de todas las aplicaciones.
6. Saldo nunca negativo y pendientes nunca reservan.
7. Una línea stale bloquea el conjunto y conserva `REPORTED`.
8. Revisor nunca decide deuda propia; sólo Owner revierte.
9. Prearchivo se acredita por cada línea y falla cerrado como conjunto.
10. Grupo, Temporada, Membresía y autorización no se modifican.

## 5. Complemento técnico para Documento 4

### 5.1 Servicios y contratos públicos

**Sujeto propio**

- `listMyObligations` con contexto presentable y composición económica;
- `reportOwnPaymentDelivery`;
- `listMyPaymentDeliveries`;
- `getMyPaymentDelivery`.

**Administración**

- `listGroupPaymentDeliveries`, limitado a `decisionState = REPORTED`, para Owner o revisor
  autorizado; el revisor recibe sólo terceros;
- `getGroupPaymentDelivery`;
- `listOwnerConfirmedPaymentDeliveries`, Owner-only, con filtros opcionales por
  `applicationState: APPLIED | REVERSED`, Membresía y rango de `confirmedAt`;
- `getOwnerPaymentDeliveryHistory`, Owner-only, para detalle confirmado aplicado o revertido;
- `getMyPaymentReviewOutcome`, sólo para que el revisor recupere el outcome de un comando propio por
  `deliveryId`, sin listado ni acceso a historia general;
- `confirmPaymentDelivery`;
- `rejectPaymentDelivery`;
- `reverseConfirmedPaymentDelivery`, Owner-only.

**Autorización**

- conceder, revocar y listar `GROUP_PAYMENT_NOTICE_REVIEW`;
- acreditar el contexto propio del revisor.

Todos los inputs son objetos cerrados. Actor, Persona, Grupo, Temporada, total, saldo autoritativo,
estado, timestamps y capability ID se derivan en backend. El saldo/revisión esperado que acompaña
cada línea es un snapshot de concurrencia verificable, no una fuente económica.

### 5.2 Persistencia y schemas

La forma física candidata usa `paymentDeliveries/{deliveryId}` para la raíz Entrega, separada de
`payments/{paymentId}`. El schema mínimo requiere:

- raíz Entrega con `schemaVersion`, contexto inmutable, sujeto/autor internos, fecha declarada,
  líneas o referencias deterministas, `declaredTotalMinor`, estado, decisión y revisión;
- `decisionState: REPORTED | CONFIRMED | REJECTED`, que permanece `CONFIRMED` después de revertir;
- `applicationState: APPLIED | REVERSED` sólo cuando `decisionState = CONFIRMED`, más referencia
  inmutable a la reversión común si está `REVERSED`;
- cada línea con `lineId`, `paymentId`, modo, `requestedAmountMinor`, `expectedBalanceMinor` y
  `expectedEconomicRevision` persistidos;
- aplicación determinista subordinada a cada obligación Pago;
- registro de reversión común en Entrega y referencias subordinadas inmutables en aplicaciones;
- receipts por comando;
- totales y `economicRevision` dentro de cada Pago-obligación;
- grants/slots/receipts de autorización separados por capability.

Las líneas pueden quedar embebidas si el presupuesto documental lo permite o subordinadas a la
raíz Entrega si la transacción las lee por IDs deterministas. El Repositorio de Entregas sólo muta
su Agregado; el Repositorio de Pagos sólo muta obligaciones/aplicaciones. La Unidad de Trabajo
E3-03 coordina ambos dentro de la única transacción aprobada. Ninguna forma crea una segunda fuente
de saldo ni suma `declaredTotalMinor` a ingresos.

### 5.3 Unidad de Trabajo y presupuesto

Con `N <= 20`:

- confirmar prevé `N` updates de Pago + `N` aplicaciones + entrega + receipt: `2N + 2`, máximo 42
  escrituras;
- revertir prevé `N` updates de Pago + `N` reversiones + entrega + receipt + reversión común:
  `2N + 3`, máximo 43 escrituras;
- informar y rechazar no escriben raíces de obligación;
- las lecturas incluyen Pagos/aplicaciones más entrega, receipt y reautorización;
- raíz, líneas y snapshots apuntan a un presupuesto interno de 64 KiB.

Son presupuestos de diseño, no mediciones ni garantías de rendimiento. Implementación debe medir
serialización, lecturas, escrituras, retries y contención en Emulator para `N=1`, `N=20` y rechazo
de `N=21`. Si no cumple, se reabre el límite o la forma física; no se pagina la transacción.

### 5.4 Idempotencia y receipts

- cada comando usa key propia de 16–128 caracteres;
- la key cruda no se persiste;
- receipt correlaciona actor, operación, scope, request hash, `deliveryId` y outcome;
- informar hashea scope, fecha y líneas canónicamente ordenadas con modo, importe solicitado exacto,
  saldo esperado y revisión económica esperada;
- la línea persiste ese importe y snapshot económico;
- misma key e igual intención recupera el mismo `deliveryId`, desglose e importes aunque luego cambie
  el saldo; una línea `FULL` no se recalcula durante recovery;
- misma key con importe o snapshot distinto conflictúa;
- confirmar/rechazar/revertir no comparten key;
- receipt no es fuente de declaración o economía.

### 5.5 Reautorización y concurrencia

Cada request y página revalida actor. Confirmar/rechazar lee grant/slot, Cuenta–Persona,
Membresía/vigencia del revisor, Grupo y ownership revision en el punto transaccional.

- revocación, cambio de Owner o archivo que confirma primero impide efecto delegado;
- retorno A → B → A no revive grants;
- entregas solapadas serializan por Pagos compartidos;
- dos confirmaciones sobre la misma entrega producen un outcome;
- revertir exige `CONFIRMED + APPLIED`;
- dos reversiones producen un efecto;
- confirmación de otra entrega y reversión se serializan por raíces comunes.

### 5.6 Recovery

Backend reconcilia raíz entrega, receipt, todas las aplicaciones y revisiones de Pago:

- si informar no llegó a persistir y el snapshot ya cambió, devuelve `DELIVERY_DRAFT_STALE` y exige
  revisión explícita, sin crear una intención nueva bajo la misma key;
- sólo devuelve `CONFIRMED + APPLIED` si el conjunto completo existe y coincide;
- sólo devuelve `CONFIRMED + REVERSED` si el conjunto completo de reversión coincide;
- `REPORTED` con cero aplicaciones puede reintentarse;
- una forma parcial es `INCOMPATIBLE_STATE`, nunca éxito;
- outcome todavía incierto devuelve `PENDING_RECOVERY`.

No se continúa “desde la línea N” porque la estrategia aprobada es una transacción atómica.

### 5.7 Evolución compatible de Pagos E3-01

Las obligaciones schema v1 se interpretan como cero aplicaciones confirmadas. La primera mutación
E3-03 debe evolucionar la raíz en su transacción o una preparación local autorizada debe completar
la evolución antes de exponer comandos.

No habrá backfill general, reconciliación histórica, doble escritura o reader económico perpetuo.
La forma elegida debe:

- seguir leyendo obligaciones E3-01 íntegras;
- inicializar contadores/revisión de forma determinista;
- rechazar formas ambiguas;
- conservar snapshots, identidad y `createdAt` originales;
- retirar compatibilidad interna transitoria cuando deje de ser necesaria.

### 5.8 Consultas, índices previstos, paginación y selección entre páginas

**Mis obligaciones** agrupa por nombre de Grupo y luego etiquetas de Temporada/Membresía, sin IDs
técnicos. Cada Grupo usa control desplegable accesible. Historia y archivo permanecen visibles según
autorización.

La selección conserva hasta 20 IDs opacas entre páginas del mismo contexto. La bandeja seleccionada
permanece visible aunque una obligación salga de la página. Cursor no autoriza ni congela saldo.
Cambiar de contexto advierte antes de descartar; cambiar de página no descarta. Backend carga y
revalida todos los IDs al informar.

Listados administrativos devuelven una fila por entrega, no por aplicación. Orden candidato:
`reportedAt ASC, deliveryId ASC` para pendientes y descendente para historia; página por defecto 20,
máximo 50. Cada cursor queda ligado a actor, contrato, Grupo, estado y tamaño.

La historia confirmada Owner ordena por `confirmedAt DESC, deliveryId DESC`. Sus filas muestran
sujeto presentable, fecha declarada, total, confirmación y `applicationState`; las revertidas agregan
`reversedAt`. El detalle conserva líneas, aplicaciones originales, confirmante y trazabilidad de la
reversión común. Cada página y detalle revalidan ownership. En archivo sólo se consultan y revierten
entregas cuyas líneas cumplen íntegramente prearchivo.

Índices compuestos previstos, todavía no ejecutables ni verificados:

- Entregas propias: `personId + reportedAt DESC + deliveryId DESC`, con filtros opcionales de
  `membershipId` resueltos por contrato/índice dedicado;
- pendientes administrativas: `groupId + decisionState + reportedAt ASC + deliveryId ASC`;
- historia Owner: `groupId + decisionState + confirmedAt DESC + deliveryId DESC`, con variantes
  previstas para `applicationState`, `membershipId` y rango temporal;
- obligaciones propias: los índices E3-01 vigentes, extendidos sólo si las mediciones de la consulta
  agrupada lo exigen.

El cursor contiene los valores de orden y una firma/atadura opaca al scope; no transporta selección,
no reserva saldo y no evita la reautorización. Los índices definitivos y su configuración quedan
para implementación y medición.

### 5.9 Privacidad

- sujeto ve sólo obligaciones, entregas y outcomes propios;
- Owner ve economía del Grupo y opera sin Persona;
- revisor ve pendientes de terceros y sólo outcomes propios necesarios para recovery;
- revisor no posee listado ni detalle de historia confirmada general;
- revisor no ve economía general por esta capability;
- archivo no admite actor delegado;
- DTOs omiten UID, email, hashes, paths, grants, notas internas e IDs técnicos presentados;
- Firestore cliente permanece deny-all.

### 5.10 Frontend

- secciones de Grupo desplegables con `aria-expanded`/`aria-controls`;
- separación presentable por Temporada y Membresía;
- selección total/parcial, total y desglose antes de informar;
- advertencia de no reserva y de pendientes posiblemente duplicados;
- confirmación/rechazo completos en bandeja Owner/revisor;
- historia confirmada Owner paginada y filtrable, con detalle que distingue
  `CONFIRMED + APPLIED` de `CONFIRMED + REVERSED`;
- stale muestra líneas afectadas sin aplicar nada;
- reversión Owner explica que no devuelve dinero;
- pérdida de acceso limpia datos administrativos;
- estados loading, vacío, stale, recovery y feedback con foco/`aria-live`.

## 6. Pruebas normativas mínimas futuras

1. scope exacto, 1/20/21 líneas y obligación duplicada;
2. FULL/PARTIAL conservan el importe exacto, suma derivada y payload reordenado idempotente;
3. snapshot stale antes de informar produce conflicto revisable, cero entrega y cero receipt terminal;
4. retry de igual intención recupera los mismos importes aunque cambie el saldo, sin recalcular FULL;
5. varias entregas pendientes sin reserva y advertencia no autoritativa;
6. confirmación todo-o-nada con una línea stale y aplicación del importe persistido sin recorte;
7. solapamiento entre entregas y serialización por raíces comunes;
8. confirmación/rechazo concurrentes y respuesta perdida;
9. reversión completa, retry y carrera con otra confirmación;
10. `decisionState = CONFIRMED` se conserva al pasar de `APPLIED` a `REVERSED`, sin borrar
    confirmación ni aplicaciones originales;
11. Owner sin Persona; revisor de tercero; auto-revisión prohibida;
12. independencia de `GROUP_TREASURY`, cargo y grants;
13. finalización/reactivación/renovación/cierre/ownership/archivo;
14. cada línea prearchivo y falla conjunta por una incompatible;
15. Owner pagina/filtra historia confirmada y abre detalle aplicado/revertido; revisor no enumera esa
    historia y sólo recupera outcomes propios;
16. selección entre páginas, cambio de contexto y ausencia de IDs técnicos;
17. privacidad propia/administrativa y Rules deny-all;
18. evolución v1 sin backfill o doble autoridad;
19. presupuesto de 20 líneas medido, sin afirmar rendimiento previo.

## 7. UAT futura y criterios verificables

La UAT futura debe recorrer:

1. selección en dos páginas de una misma Membresía;
2. línea total y parcial, total calculado y resumen;
3. cambio previo a informar devuelve conflicto, muestra saldo propio actual y exige revisar;
4. advertencia al cambiar de contexto;
5. entrega pendiente sin saldo modificado;
6. confirmación completa aplica los importes persistidos y deja estados distintos por obligación;
7. stale en una línea al confirmar, cero efectos y entrega todavía pendiente;
8. rechazo completo con categoría/observación visible;
9. revisor autorizado de tercero y bloqueo de deuda propia;
10. Owner sin Persona y reversión completa motivada;
11. aviso confirmado mostrado como entrega revertida;
12. Owner encuentra una confirmada mediante historia paginada, abre su detalle y la revierte; el
    revisor no accede a esa historia;
13. exintegrante/Temporada cerrada y Grupo archivado prearchivo;
14. cargo y `GROUP_TREASURY` sin escritura.

El incremento sólo puede aceptarse si la transacción y el presupuesto fueron verificados durante la
implementación, no existen resultados parciales
presentados como confirmación y la reversión está disponible antes del primer ingreso.

## 8. Límites de la formalización

Este addendum no:

- modifica retrospectivamente los documentos base ni adopta decisiones fuera de D01–D08;
- autoriza código, Rules, índices, pruebas, Emulator, Firebase remoto o deploy;
- crea roles configurables o amplía `GROUP_TREASURY`;
- habilita registro directo, intereses, reparto automático, adjuntos o pasarelas;
- implementa devolución, Caja, ajuste o condonación;
- toca Torneos/partidos, Auth/UAT, D5-043–D5-047 o el gate económico de E3;
- cierra E3-03 o Etapa 3.

## Resultado

`ADDENDUM NORMATIVO ADOPTADO POR D5-048 — IMPLEMENTACIÓN NO AUTORIZADA`
