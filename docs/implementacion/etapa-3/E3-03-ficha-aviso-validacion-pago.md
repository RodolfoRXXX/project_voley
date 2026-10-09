# E3-03 — Entrega informada y validación sobre obligaciones por Membresía

## Estado de la ficha

- **Fecha de revisión:** 2026-10-09.
- **Rama comprobada:** `dev`.
- **HEAD comprobado:** `3f6b82c64f74713981dd923d5eb9a2de9734f9f6`.
- **Árbol al iniciar:** contenía únicamente los tres documentos E3-03 sin seguimiento.
- **Índice al iniciar:** limpio.
- **Stashes:** ninguno listado.
- **Preflight:** sólo lectura, sin `fetch` ni operaciones Git de escritura.
- **Autorización recibida:** formalización normativa local de E3-03 exclusivamente.
- **Implementación, pruebas, suites, Emulator, Firebase remoto y deploy:** no autorizados.
- **Normativa E3-03:** DEC-E3-03 y addendum conjunto adoptados mediante `D5-048`.
- **Estado:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.

Esta revisión sustituye dentro de la misma ficha el aviso aplicado a una sola obligación por una
única **entrega informada** con desglose explícito entre varias obligaciones seleccionadas. Los
requisitos de agrupamiento y selección conjunta fueron solicitados por el usuario. Las decisiones
E3-03-D01–D08 de §21 fueron aprobadas expresamente por el usuario. D08 adopta **Entrega informada
como Agregado independiente**, dueño sólo de declaración, líneas, total derivado, decisión,
lifecycle y trazabilidad de la reversión común. Cada Pago conserva aplicaciones, movimientos, saldo
y estado. No debe comenzar implementación antes de revisar e integrar el paquete de §22 y recibir
autorización separada.

## 1. Finalidad y recorrido vertical revisado

E3-03 debe permitir una sola declaración humana de recepción con aplicaciones explícitas:

```text
integrante/exintegrante ve sus obligaciones agrupadas
    -> entra en una Temporada y membershipId exacta
    -> selecciona varias obligaciones de ese contexto
    -> elige total o parcial por cada obligación
    -> informa importe sólo en las líneas parciales
    -> sistema calcula total y presenta desglose
    -> sujeto confirma una única entrega
    -> entrega queda pendiente y no reserva ni reduce saldos
    -> Owner o revisor económico confirma o rechaza la entrega completa
    -> confirmar aplica todas las líneas o ninguna
    -> cada Pago deriva saldo y estado según su aplicación
```

La entrega no equivale a varios pagos independientes. Posee una identidad común, una fecha
declarada, un autor, un total derivado, una decisión administrativa y una trazabilidad de recepción.
Sus líneas expresan cómo se solicita aplicar ese único hecho a obligaciones determinadas.

## 2. Alcance y exclusiones

### 2.1 Incluido

- consulta y agrupamiento presentacional de obligaciones propias;
- selección explícita de varias obligaciones dentro de una misma Membresía exacta;
- aplicación total o parcial por línea;
- total calculado exclusivamente desde las líneas;
- declaración de una única entrega, sin comprobante;
- confirmación o rechazo de la entrega completa;
- aplicaciones económicas exactamente una vez sobre cada Pago seleccionado;
- saldo y estado económico derivados por obligación;
- idempotencia, concurrencia, recuperación y trazabilidad de una sola recepción;
- delegación económica explícita distinta de `GROUP_TREASURY`;
- exintegrantes, Temporada cerrada y obligaciones prearchivo;
- reversión Owner-only de la entrega completa;
- límite acotado de líneas por entrega, sujeto a decisión.

### 2.2 Excluido

- reparto automático por antigüedad, vencimiento, proporción o cualquier heurística;
- mezcla de Grupos, Temporadas o Membresías en una entrega;
- intereses, mora calculada o créditos/saldos a favor;
- registro directo sin entrega informada;
- confirmación parcial de una entrega o decisión independiente por línea;
- pasarelas, Mercado Pago, cobro automático, conciliación bancaria o adjuntos;
- facturación, devolución real de dinero, Caja o balance;
- ajuste del importe exigible y condonación no monetaria;
- reversión de una sola línea o edición de una entrega confirmada;
- retiros económicos de Torneos/partidos;
- perfiles configurables, CRUD de roles, RBAC general o permisos futuros implícitos;
- migración o reconciliación de pagos históricos;
- cambios a Auth/UAT, código, Rules, índices, configuración, datos o deploy;
- retiro o modificación de D5-044, D5-045 o autoridad económica legacy;
- reapertura rutinaria de E2-14;
- cierre de E3-03 o Etapa 3.

## 3. Fuentes revisadas y hallazgos focales

Se revisaron en el checkpoint indicado:

- cierre, ficha, decisión y addendum E3-01;
- cierre, ficha, decisión y addendum E3-02;
- addendum de liquidación de obligaciones con Grupo archivado;
- Documento 2 AUD-C04, Documento 3 AUD-C05 y Documento 4 AUD-C05 en sus reglas de Pago,
  autorización, Agregados, Unidad de Trabajo y persistencia;
- Documento 5 §§5.5–5.12 y 7.5, D5-043–D5-048;
- contratos, dominio, store y presentación vigentes de Pagos y autorización, sólo para comprobar
  fronteras y reutilización.

Hallazgos relevantes:

1. `payments/{paymentId}` representa hoy una obligación independiente ligada a una
   `membershipId` exacta. El schema v1 no posee entregas, aplicaciones, ingresos o saldos.
2. Documento 3 declara que el Aggregate Root Pago protege la coherencia de su estado y movimientos,
   y que **la unidad de consistencia es un Pago**.
3. Documento 3 también dispone que, cuando una operación modifica varios Agregados, cada uno
   conserva su unidad de consistencia y los límites no se amplían para simplificar una transacción.
4. Documento 4 indica que la atomicidad sólo corresponde cuando una regla de negocio la requiere,
   pero las Unidades de Trabajo no deben fusionar Agregados.
5. El nuevo requisito sí exige una regla todo-o-nada sobre varias raíces Pago: confirmar o rechazar
   la entrega completa, sin resultados parciales presentados como éxito.
6. D08 y el addendum adoptado por D5-048 formalizan el Agregado Entrega informada y la excepción
   transaccional acotada antes del código; no habilitan generalizaciones.
7. `GROUP_TREASURY` continúa normativamente cerrado a consulta. La revisión económica necesita una
   capacidad separada.
8. El addendum prearchivo admite sujeto propio y Owner sobre obligaciones preexistentes, sin
   desarchivo ni revival de grants. La entrega múltiple debe satisfacer esa prueba para cada línea.
9. Antes del primer ingreso sigue siendo necesaria una salida trazable para corregir un registro
   confirmado por error.

No se repitieron inventarios de Torneos/partidos ni auditorías generales.

## 4. Clasificación de autoridad

### 4.1 Reglas normativas vigentes

1. Pago es la fuente de verdad económica deportiva y permanece separado de Membresía, Grupo,
   Temporada, Suscripción, participación e inscripción.
2. Cada raíz Pago administra su importe, estado, movimientos y saldo; Movimiento no es un Agregado.
3. Grupo, Temporada y Membresía son referencias externas y no se escriben al liquidar.
4. Autorización contextual se revalida en backend; cargo, Plan, rol global, IDs conocidos y UI no
   conceden autoridad.
5. Firestore cliente no accede directamente a economía, grants, intents o receipts.
6. Temporada cerrada no elimina obligaciones existentes.
7. El archivo permite sólo la excepción económica aprobada para obligaciones prearchivo íntegras.
8. Un incremento no puede programarse con una decisión funcional o arquitectónica bloqueante.

### 4.2 Requisitos adoptados para esta revisión

1. El sujeto ve sus obligaciones, selecciona cuáles cubrir y elige total/parcial por obligación.
2. El total se calcula desde las líneas y se confirma una sola declaración.
3. Owner o revisor económico expresamente autorizado confirma o rechaza la entrega completa.
4. Los saldos cambian sólo tras confirmar; cada obligación queda parcial o saldada según su línea.
5. La presentación agrupa por Grupo y luego por Temporada/Membresía exacta, sin IDs técnicos.
6. Una selección no puede mezclar Grupos, Temporadas o Membresías.
7. Cambiar de contexto con selección pendiente exige advertencia antes de descartar.
8. Las obligaciones históricas y de Grupos archivados permanecen visibles según autorización.
9. El agrupamiento es presentación y no transfiere autoridad económica a Grupo, Temporada o
   Membresía.

### 4.3 Decisiones previas preservadas

1. Un pendiente no reduce deuda ni reserva saldo.
2. `GROUP_TREASURY` sigue exclusivamente de consulta y no se amplían grants existentes.
3. Cargo descriptivo no concede permisos.
4. Owner actúa por ownership y no necesita Persona ni Membresía.
5. Revisor delegado no decide una entrega aplicada a su propia `membershipId`.
6. No existe doble aprobación para terceros.
7. Exintegrante vinculado a su Persona puede informar obligaciones propias existentes.
8. Temporada cerrada no bloquea la liquidación de obligaciones existentes.
9. En Grupo archivado sólo actúan sujeto propio y Owner sobre obligaciones prearchivo; no reviven
   grants.
10. D5-044, D5-045 y el gate económico de Etapa 3 permanecen sin cambios.

### 4.4 Decisiones E3-03 aprobadas

1. Scope exacto: un `groupId`, `seasonId` y `membershipId`.
2. Identidad/decisión comunes y transacción multi-Pago atómica, acotada exclusivamente a este flujo;
   cada Pago conserva autoridad sobre obligación y saldo.
3. Líneas inmutables, total derivado y bloqueo completo sin efectos ni rechazo automático cuando
   una línea no cabe; la entrega permanece pendiente.
4. `GROUP_PAYMENT_NOTICE_REVIEW` independiente de `GROUP_TREASURY`, con lifecycle E3-02, lectura
   mínima, sin deuda propia, grants heredados ni operación delegada en archivo.
5. Reversión total, única, trazable, idempotente, motivada y Owner-only.
6. Máximo de 20 obligaciones únicas por entrega.
7. Fecha civil obligatoria no futura en `America/Argentina/Buenos_Aires`; rechazo con categoría
   obligatoria, nota opcional y explicación requerida para `OTHER`.

### 4.5 Clasificación arquitectónica aprobada

E3-03-D08 adopta un **Agregado Entrega informada** independiente dentro del Dominio Deportivo. Su
raíz posee declaración, líneas, total derivado, decisión, lifecycle y trazabilidad de reversión
común. No posee deuda, saldo, movimientos ni aplicaciones económicas. Cada Pago sigue siendo dueño
de su obligación, aplicaciones, movimientos, saldo, estado y revisión económica.

La Entrega no se cuenta nuevamente como dinero aplicado: su monto declarado es evidencia e
intención; sólo las aplicaciones confirmadas subordinadas a cada Pago producen efecto económico. La
variante `DELIVERY_NOTICE` de Pago queda descartada por mezclar invariantes y razones de cambio de
una obligación con los de una recepción común multiobligación.

## 5. Presentación de “Mis obligaciones”

### 5.1 Agrupamiento accesible

La ruta canónica continúa siendo `/dashboard/obligations`. La presentación propuesta:

```text
Grupo: nombre canónico                           [expandir/contraer]
  Temporada: etiqueta humana
    Membresía: período/estado comprensible
      [ ] Cuota abril       saldo $...
      [ ] Indumentaria      saldo $...
```

- cada Grupo es una sección desplegable accesible con botón real, `aria-expanded` y relación
  `aria-controls`;
- dentro del Grupo se separa por Temporada y raíz Membresía exacta;
- las etiquetas usan nombre de Grupo, nombre/fecha de Temporada y estado/fechas presentables de la
  Membresía;
- no se muestran `groupId`, `seasonId`, `membershipId`, `paymentId` ni schema técnico;
- el backend sigue entregando IDs opacas necesarias para comandos, pero la UI no las usa como texto;
- activas, finalizadas e históricas se muestran según autorización propia;
- Grupos archivados se rotulan como históricos y sólo ofrecen acciones compatibles con la
  excepción prearchivo.

Este agrupamiento es un modelo de lectura/presentación. Grupo, Temporada y Membresía no calculan
saldos, no almacenan selección y no se vuelven fuente económica.

### 5.2 Selección dentro de un contexto

Al seleccionar la primera obligación, la UI fija un contexto de composición:

```text
{ groupId, seasonId, membershipId }
```

Sólo pueden añadirse obligaciones con las tres referencias exactas. Las obligaciones de otros
contextos permanecen visibles, pero no seleccionables hasta enviar o descartar la selección actual.
El backend vuelve a comprobar el scope; la restricción visual no es autoridad.

Si el usuario intenta cambiar Grupo, Temporada, Membresía, ruta o sección con líneas sin enviar:

- se advierte que la selección y sus importes se descartarán;
- **Continuar y descartar** limpia todo el borrador;
- **Permanecer** conserva el contexto;
- nunca se traslada silenciosamente una línea o importe al contexto nuevo.

El borrador es estado efímero del cliente. No reserva saldo ni se persiste como entrega hasta que el
sujeto confirma la declaración.

La selección puede continuar entre páginas del mismo contexto. El cliente conserva una bandeja de
seleccionadas por ID opaca, máximo 20, y muestra las líneas aunque ya no estén en la página visible.
Un cursor nunca autoriza ni congela saldo. Cambiar de contexto activa la advertencia anterior;
cambiar de página dentro del mismo contexto no descarta selección. Al enviar, backend carga y
revalida todas las raíces por ID, aunque provengan de páginas diferentes.

### 5.3 Total/parcial y revisión previa

Por cada obligación seleccionada:

- **Total** copia como importe solicitado el saldo exacto mostrado; ese importe queda visible y se
  envía sin volver a derivarlo silenciosamente;
- **Parcial** exige un importe entero ARS, mayor que cero y no superior al saldo mostrado;
- ambas modalidades envían `requestedAmountMinor`, `expectedBalanceMinor` y
  `expectedEconomicRevision` de la vista confirmada por el integrante;
- el cliente muestra saldo, importe a aplicar y resultado estimado `Parcial` o `Saldada`;
- el total es sólo la suma de importes de línea, nunca un campo editable;
- antes de informar se presenta un resumen con contexto, fecha declarada, líneas y total;
- la confirmación explica que el pendiente no reduce ni reserva saldos.

El backend no confía en el snapshot del cliente, pero tampoco sustituye su importe. Relee cada Pago
y exige que saldo/revisión coincidan con lo mostrado. En `FULL`, además exige
`requestedAmountMinor == expectedBalanceMinor`; en `PARTIAL`, exige que el importe sea positivo y
no superior a ese saldo. Una diferencia devuelve `DELIVERY_DRAFT_STALE`, sin crear entrega ni
receipt terminal, para que el integrante recargue y confirme otro desglose con una intención nueva.

## 6. Identidad y modelo funcional de la entrega

### 6.1 Una recepción, varias aplicaciones

Se propone distinguir:

- **Entrega informada:** identidad común de lo declarado por el sujeto;
- **Línea declarada:** instrucción inmutable `{ paymentId, requestedAmountMinor, selectionMode }`;
- **Aplicación económica:** efecto de una línea confirmada dentro de la raíz Pago correspondiente.

La cabecera común es autoridad sólo sobre la declaración y su decisión completa. No es autoridad
del saldo de ninguna obligación. Cada Pago sigue siendo autoridad de su aplicación, ingresos netos,
saldo y estado económico.

No deben crearse N avisos o N ingresos independientes para simular una entrega. Todas las
aplicaciones conservan el mismo `deliveryId`, `confirmedAt` y actor confirmante, y la consulta debe
presentarlas como una sola recepción.

### 6.2 Scope aprobado

Todas las líneas deben resolver al mismo:

- `groupId`;
- `seasonId`;
- `membershipId` exacto;
- `personId` sujeto derivado de esa Membresía.

La recomendación se justifica porque mantiene una única relación obligada, simplifica privacidad y
prearchivo, impide repartir dinero entre sujetos o contextos distintos y acota la transacción. Que
dos Membresías pertenezcan a la misma Persona no permite mezclarlas.

### 6.3 Desglose inmutable y total derivado

Al crear la entrega, el backend:

1. rechaza líneas vacías, IDs repetidas o fuera del scope;
2. carga cada Pago y verifica propiedad, integridad y saldo actual;
3. contrasta `expectedBalanceMinor` y `expectedEconomicRevision` con la raíz vigente;
4. valida el `requestedAmountMinor` enviado para `FULL` o `PARTIAL`, sin reemplazarlo;
5. ordena canónicamente las líneas por `paymentId` sólo para hash/idempotencia;
6. calcula `declaredTotalMinor = sum(requestedAmountMinor)`;
7. persiste cabecera y desglose inmutables como una sola entrega `REPORTED`.

El total no se acepta desde cliente. Cambiar una línea exige rechazar o abandonar la entrega y crear
otra; no hay edición silenciosa.

## 7. Datos mínimos y contratos de entrada

### 7.1 Informar entrega

`reportOwnPaymentDelivery` recibe un objeto cerrado:

- `membershipId` opaca elegida desde el modelo propio;
- `declaredPaidOn`, fecha civil `YYYY-MM-DD`;
- `lines`, entre 1 y el máximo aprobado, cada una con:
  - `paymentId`;
  - `selectionMode: FULL | PARTIAL`;
  - `requestedAmountMinor` para ambos modos;
  - `expectedBalanceMinor`;
  - `expectedEconomicRevision`;
- `idempotencyKey`.

El cliente no envía Grupo, Temporada, Persona, moneda, total, saldo, estado, timestamps, autor o
IDs de aplicación. Backend deriva y contrasta todo desde Membresía y Pagos.

### 7.2 Fechas

- `declaredPaidOn`: fecha funcional declarada; no prueba recepción;
- `reportedAt`: timestamp servidor al crear la entrega;
- `confirmedAt`: timestamp único servidor para toda la confirmación;
- `rejectedAt`: timestamp servidor para rechazo completo;
- `reversedAt`: timestamp único servidor para reversión completa.

La regla aprobada exige fecha civil válida no futura en `America/Argentina/Buenos_Aires`, sin exigir que sea
posterior a creación o vencimiento. No ordena unicidad ni reemplaza timestamps autoritativos.

### 7.3 Rechazo presentable

Rechazar la entrega completa exige una categoría cerrada:

- `PAYMENT_NOT_RECEIVED` — entrega no recibida;
- `AMOUNT_DOES_NOT_MATCH` — importe o desglose no coincide;
- `DATE_DOES_NOT_MATCH` — fecha declarada no coincide;
- `DUPLICATE_DELIVERY` — la misma recepción ya fue informada;
- `OTHER` — otro motivo.

La observación es opcional y normalizada, salvo `OTHER`, que exige una explicación presentable al
integrante. Categoría, observación, actor y `rejectedAt` se conservan en la decisión; no se exponen
notas internas ni datos de Cuenta.

## 8. Estados, transiciones y outcomes

### 8.1 Decisión del aviso de entrega

```text
REPORTED -> CONFIRMED
REPORTED -> REJECTED
```

- `REPORTED`: decisión pendiente; efecto económico cero en todas las líneas.
- `CONFIRMED`: todas las aplicaciones originales fueron registradas en el mismo commit.
- `REJECTED`: ninguna aplicación fue registrada.

La decisión es histórica e inmutable. Una reversión posterior no cambia `CONFIRMED` a “no
confirmado” y un rechazo no puede reabrirse.

### 8.2 Vigencia económica de una entrega confirmada

La entrega confirmada expone por separado:

```text
CONFIRMED + APPLIED
CONFIRMED + REVERSED
```

- `APPLIED`: todas las aplicaciones originales conservan efecto económico.
- `REVERSED`: una reversión completa neutralizó todas las aplicaciones originales.

Así, el integrante y la administración pueden observar **aviso confirmado — entrega revertida** sin
perder declaración, confirmación, actores o líneas. `REJECTED` no tiene vigencia económica.

No existen edición, cancelación propia, reapertura, reversión parcial o decisión línea por línea.

### 8.3 Pago por obligación

Para cada raíz Pago:

```text
netConfirmedIncomeMinor = aplicaciones confirmadas - aplicaciones revertidas
balanceMinor            = amountMinor - netConfirmedIncomeMinor

PENDING  si netConfirmedIncomeMinor == 0
PARTIAL  si 0 < netConfirmedIncomeMinor < amountMinor
SETTLED  si netConfirmedIncomeMinor == amountMinor
```

Una misma confirmación puede dejar unas obligaciones `SETTLED` y otras `PARTIAL`. El saldo nunca es
negativo. Entregas `REPORTED` o `REJECTED` no participan en las fórmulas.

## 9. Flujo propio

1. Backend deriva Persona y lista obligaciones propias activas e históricas.
2. UI agrupa por Grupo, Temporada y Membresía sin exponer IDs.
3. El sujeto fija un contexto al seleccionar la primera obligación.
4. Elige `FULL` o `PARTIAL` por línea; ve total y desglose.
5. Confirma una única declaración sin adjunto.
6. Backend valida identidad, scope, unicidad, límite, fecha y coincidencia de cada snapshot. Si un
   saldo/revisión cambió, devuelve conflicto de borrador con los valores propios actuales y cero
   efectos para revisar el desglose.
7. Se crea una entrega `REPORTED` con receipt idempotente y efecto económico cero.
8. La UI muestra **Pendiente de validación**, total y líneas; todos los saldos permanecen iguales.

Membresía puede estar activa o finalizada y Temporada abierta o cerrada. No se vuelve a ejecutar la
elegibilidad original de generación.

## 10. Flujo administrativo

1. Owner o revisor autorizado abre la bandeja del Grupo activo.
2. Backend lista entregas completas `REPORTED`, no avisos por obligación.
3. El detalle presenta sujeto, contexto, fecha declarada, total derivado, líneas y saldos actuales.
4. La UI advierte que ningún saldo está reservado.
5. **Confirmar entrega** intenta aplicar todas las líneas en una operación indivisible.
6. Si cualquier línea no cabe, no cambia cabecera, aplicación, saldo o estado; la entrega continúa
   `REPORTED` para resolución.
7. **Rechazar entrega** terminaliza la cabecera completa y mantiene efecto económico cero.
8. Éxito devuelve un único outcome de entrega y el estado resultante de cada obligación.

No hay doble aprobación ni modificación administrativa de importes.

## 11. Atomicidad real frente a coordinación recuperable

### 11.1 Regla funcional requerida

“Confirmar la entrega completa” exige una única postcondición observable:

- todas las aplicaciones y saldos se confirman; o
- ninguna aplicación ni saldo cambia.

Un proceso que confirme dos líneas y deje otras pendientes no satisface el caso, aunque lo llame
`PROCESSING` o prometa completar luego. Tampoco puede devolver éxito completo mientras existan
efectos parciales.

### 11.2 Opción recomendada: atomicidad real acotada

Usar una sola transacción Firestore que lea y escriba:

- cabecera y receipt de entrega;
- todas las raíces Pago seleccionadas;
- una aplicación única por línea;
- documentos de autorización/contexto necesarios para serializar.

Ventajas:

- todo-o-nada real ante concurrencia y caída;
- no requiere reserva previa;
- recovery directo desde cabecera, aplicaciones y receipt;
- no expone estados parciales;
- el límite de líneas mantiene acotados lecturas, escrituras y contención.

Límite normativo: modifica varias instancias de Pago en una Unidad de Trabajo. Aunque no crea un
nuevo Agregado y cada Pago conserva su estado, es una excepción explícita al límite vigente “una
unidad de consistencia es un Pago”. No puede implementarse sin decisión arquitectónica y addendum a
Documentos 3/4.

### 11.3 Coordinación recuperable

Una saga podría intentar aplicaciones Pago por Pago con estado técnico durable. Sin embargo:

- produciría efectos intermedios reales o exigiría compensarlos;
- una caída permitiría saldos parcialmente modificados;
- ocultar esos movimientos hasta un commit común trasladaría autoridad al coordinador;
- preparar cupos equivaldría a reservar saldo, expresamente prohibido;
- un marcador común de commit obligaría a cada Pago a depender de otra fuente para calcular saldo.

Por tanto, coordinación recuperable sin reserva puede ser técnicamente recuperable, pero **no
satisface la confirmación completa solicitada bajo las autoridades actuales**. Sólo sería viable si
producto aceptara estados parciales/compensación o si arquitectura aprobara otra fuente de verdad;
ninguna de esas reglas fue solicitada o aprobada.

### 11.4 Frontera normativa adoptada

La transacción incluye una raíz Entrega informada y entre 1 y 20 raíces Pago de la misma
Membresía, Temporada y Grupo. La Entrega protege decisión y correlación comunes; cada Pago protege
su aplicación, movimientos, saldo y estado. La Unidad de Trabajo modifica esas raíces en conjunto,
pero no fusiona sus dominios ni traslada autoridad económica a la Entrega.

Grupo, Temporada, Membresía, Persona, Cuenta, ownership y grants sólo se leen para scope y
autorización. La excepción se limita a confirmar y revertir este flujo E3-03; no autoriza otras
transacciones entre Agregados por analogía.

## 12. Persistencia propuesta sin duplicar autoridad

### 12.1 Repositorio y schema de Entrega informada

El Repositorio de Entregas persiste una raíz propia, con una forma física candidata como
`paymentDeliveries/{deliveryId}`, que contiene:

- identidad opaca común;
- `groupId`, `seasonId`, `membershipId`, `personId` inmutables;
- `declaredPaidOn`, `reportedAt`, autor interno;
- líneas inmutables o referencia a líneas subordinadas, con importe solicitado exacto y snapshot
  económico de cada línea;
- `declaredTotalMinor` derivado;
- `decisionState: REPORTED | CONFIRMED | REJECTED` y, sólo para confirmadas,
  `applicationState: APPLIED | REVERSED`;
- decisión completa y referencia inmutable a la reversión común cuando exista;
- hashes/revisión necesarios para recovery;
- schema versionado.

La raíz prueba qué se declaró, cómo se decidió y si la recepción confirmada fue revertida. No
contiene saldos, movimientos o aplicaciones autoritativas ni sustituye raíces Pago. Repositorio de
Entregas y Repositorio de Pagos permanecen fronteras separadas, coordinadas sólo por la Unidad de
Trabajo acotada de D02.

### 12.2 Aplicación por Pago

Cada raíz `payments/{paymentId}` conserva una aplicación subordinada candidata:

`payments/{paymentId}/deliveryApplications/{applicationId}`

con:

- `deliveryId` común;
- `lineId` única y estable;
- `appliedAmountMinor`;
- `confirmedAt` común;
- actor confirmante interno;
- referencia eventual a reversión completa;
- aplicación original inmutable y estado efectivo derivado `APPLIED | REVERSED`; la reversión agrega
  referencia, no reemplaza ni elimina la aplicación.

La raíz Pago actualiza en la misma transacción sus totales, saldo, estado y `economicRevision`.
`applicationId` se deriva de `deliveryId + paymentId`, de modo que una entrega sólo puede tener una
aplicación por Pago.

### 12.3 Evolución de Pago

Cada raíz candidata incorpora:

- `confirmedIncomeMinor` bruto;
- `reversedIncomeMinor`;
- `netConfirmedIncomeMinor`;
- `balanceMinor`;
- `economicState: PENDING | PARTIAL | SETTLED`;
- `economicRevision` positiva y monotónica;
- schema evolucionado.

Los campos son autoridad de la raíz y se comprueban contra aplicaciones subordinadas. La cabecera
común no puede corregirlos por fuera del comportamiento de Pago.

### 12.4 Receipts y grants

- receipts de informar/confirmar/rechazar/revertir son técnicos y no fuentes económicas;
- la key cruda nunca se persiste;
- grants de revisión permanecen en autorización, separados de Pago y de la cabecera;
- todas las colecciones permanecen deny-all para cliente.

### 12.5 Presupuesto para el máximo de 20 líneas

Con `N <= 20`, el diseño debe mantenerse dentro de este sobre lógico por comando:

| Comando | Lecturas económicas mínimas | Escrituras económicas/técnicas máximas previstas |
| --- | --- | --- |
| informar | `N` raíces Pago + raíz/receipt de entrega + contexto propio | raíz entrega + receipt = 2; las líneas se embeben o escriben dentro del presupuesto documental |
| confirmar | `N` raíces + hasta `N` aplicaciones deterministas + entrega/receipt + reautorización | `N` actualizaciones Pago + `N` aplicaciones + entrega + receipt = `2N + 2` (42 con N=20) |
| rechazar | entrega/receipt + reautorización | entrega + receipt = 2 |
| revertir | `N` raíces + `N` aplicaciones/reversiones + entrega/receipt + reautorización | `N` actualizaciones Pago + `N` reversiones + entrega + receipt + registro común de reversión = `2N + 3` (43 con N=20) |

Las lecturas de autorización dependen del patrón E3-02 y se contabilizan además del núcleo
económico; no se ocultan en `N`. El diseño fija un presupuesto documental interno objetivo de
**64 KiB** para raíz, líneas y snapshots de una entrega, con textos acotados e IDs opacas; no se
afirma aquí su relación probada con límites efectivos del adaptador. La implementación deberá medir
serialización real, lecturas, escrituras,
reintentos y contención en Emulator antes de considerar aceptado el máximo. Esta ficha no afirma
rendimiento, latencia ni capacidad probados. Si el adaptador excede el sobre, debe optimizar su forma
física o reabrir D06; no puede paginar una confirmación atómica.

### 12.6 Consultas, índices previstos y cursores

La forma documental prevé, sin crear configuración ejecutable:

- entregas propias por `personId`, ordenadas por `reportedAt DESC, deliveryId DESC`, con filtro
  dedicado por `membershipId` cuando se solicite;
- pendientes administrativas por `groupId + decisionState + reportedAt ASC + deliveryId ASC`;
- historia administrativa por `groupId + reportedAt DESC + deliveryId DESC`;
- obligaciones propias sobre las consultas E3-01, extendidas sólo si la consulta agrupada lo exige.

Cada cursor es opaco y queda ligado a actor, contrato, filtros, orden y tamaño. Contiene valores de
continuación, no selección ni autorización; cada página reautoriza. La selección de hasta 20
obligaciones vive en estado de UI separado y se revalida completa al informar. Los índices
definitivos, tamaño y planes de consulta deben medirse en implementación; esta ficha no afirma que
estén creados ni verificados.

## 13. Idempotencia y unicidad

### 13.1 Entrega

- `reportOwnPaymentDelivery` usa una key por declaración;
- el request hash incluye `groupId`, `seasonId`, `membershipId`, fecha y líneas canónicamente
  ordenadas; por línea incluye `paymentId`, modo, `requestedAmountMinor` exacto,
  `expectedBalanceMinor` y `expectedEconomicRevision`;
- la entrega persiste en cada línea ese importe solicitado y el snapshot económico contra el cual
  el integrante lo confirmó;
- igual key e igual intención devuelve el mismo `deliveryId`, desglose e importes persistidos aunque
  el saldo haya cambiado después; no recalcula una línea `FULL` durante recovery;
- igual key con payload distinto devuelve `IDEMPOTENCY_CONFLICT`;
- reordenar las mismas líneas no crea una entrega distinta;
- repetir una obligación dentro del payload se rechaza, no se suma.

Si el primer intento no alcanzó a persistir y al reintentar ya no coincide el snapshot, el backend
devuelve `DELIVERY_DRAFT_STALE`, sin crear entrega ni receipt terminal. La UI recarga saldos y exige
que el integrante revise y confirme un nuevo desglose; no transforma esa revisión en la misma
intención idempotente.

### 13.2 Aplicaciones

- una línea única por `paymentId` dentro de la entrega;
- `applicationId = f(deliveryId, paymentId)` estable y backend-only;
- `create` atómico impide dos aplicaciones de la misma línea;
- un mismo `deliveryId` debe aparecer como máximo una vez en cada Pago;
- otra entrega puede aplicar al mismo Pago si el saldo vigente lo admite.

### 13.3 Decisiones

- confirmar, rechazar y revertir usan operaciones y keys diferentes;
- mismo comando/key/payload recupera outcome;
- decidir con otra key después de un terminal devuelve el terminal sin nuevo efecto o conflicto
  estable, según el contrato aprobado;
- no se reejecutan aplicaciones terminales una por una.

## 14. Concurrencia y recovery

### 14.1 Entregas simultáneas

Varias entregas `REPORTED` pueden referir los mismos Pagos. Ninguna reserva saldo. Al confirmar, la
transacción relee todas las raíces y sus revisiones:

- si todas las líneas caben, confirma todo;
- si una sola no cabe, aborta sin efectos y conserva toda la entrega `REPORTED`;
- dos confirmaciones concurrentes serializan por los Pagos compartidos;
- una que no comparte Pagos puede avanzar independientemente.

No hay confirmación parcial automática ni recorte de línea.

### 14.2 Recovery

Ante timeout, contención agotada o respuesta perdida:

- el cliente reintenta la misma intención;
- backend reconcilia receipt, cabecera, aplicaciones y revisiones de todas las raíces;
- `CONFIRMED` sólo se devuelve si cabecera y todas las aplicaciones están confirmadas;
- `REPORTED` con cero aplicaciones permite volver a intentar;
- cualquier combinación parcial en la opción atómica es `INCOMPATIBLE_STATE`, nunca éxito;
- un resultado todavía no determinable devuelve `PENDING_RECOVERY`.

La transacción real evita tener que “continuar desde la línea N”. Una estrategia coordinada tendría
otro recovery y no puede adoptarse por analogía.

### 14.3 Pérdida de autorización

Confirmar/rechazar relee grant/slot, Cuenta–Persona, Membresía del revisor, ownership y Grupo dentro
del punto de serialización:

- si revocación, lifecycle, cambio de Owner o archivo gana primero, no hay efecto;
- si la decisión atómica confirma primero con autoridad vigente, permanece válida;
- A → B → A no revive grants por `ownershipRevision`;
- cursor, vista abierta o receipt no autorizan.

### 14.4 Confirmación y reversión concurrentes

- revertir exige observar la entrega `CONFIRMED + APPLIED` y todas sus aplicaciones originales;
- confirmar y revertir no pueden confirmar desde el mismo estado inicial: reversión sólo es válida
  después del commit completo de confirmación;
- dos reversiones concurrentes serializan por la entrega y los mismos Pagos; una sola crea efecto;
- otra entrega concurrente sobre alguno de esos Pagos se serializa por las raíces compartidas;
- si la reversión gana antes de esa otra confirmación, la segunda relee saldos aumentados;
- si la otra confirmación gana primero, la reversión rederiva cada saldo desde el nuevo estado;
- ninguna carrera borra aplicaciones originales ni devuelve un conjunto parcialmente revertido.

## 15. Entrega desactualizada

Una entrega ya informada se mantiene `REPORTED` cuando cualquier línea ya no cabe:

- confirmar devuelve `DELIVERY_STALE_BALANCE` con resultado no terminal y sin efectos;
- se identifican al actor autorizado las líneas desactualizadas y sus saldos actuales;
- el sujeto ve que la entrega requiere resolución, sin economía ajena;
- Owner/revisor puede rechazar la entrega completa;
- no puede editar importes ni confirmar sólo las líneas restantes;
- para conservar una nueva distribución, el sujeto crea otra entrega después del rechazo.

La confirmación siempre intenta aplicar el `requestedAmountMinor` inmutable. Si el saldo vigente es
menor, rige el bloqueo completo de D03. Si es igual o mayor, aplica exactamente ese importe: una
línea originalmente marcada `FULL` no se reemplaza por el saldo actual y puede dejar la obligación
parcial si entretanto aumentó su exigible. Nunca hay recorte ni redistribución.

Esto reemplaza la recomendación anterior de rechazo automático: el nuevo requisito pide bloquear
sin efectos y conservar pendiente. Sigue sin existir reserva.

## 16. Delegación económica mínima

### 16.1 Capacidad aprobada

`GROUP_PAYMENT_NOTICE_REVIEW`, distinta de `GROUP_TREASURY`, permite sobre Grupo activo:

- listar entregas pendientes y su contexto mínimo;
- confirmar o rechazar entregas completas de terceros;
- recuperar outcomes propios.

No permite conceptos, ocurrencias, economía general, generación, ajustes, condonación, reversión,
devolución, Caja o Grupos archivados. No permite decidir si cualquier línea pertenece a la
`membershipId` del propio revisor.

### 16.2 Concesión y lifecycle aprobados

- sólo Owner vigente concede/revoca individualmente;
- destinatario con Cuenta–Persona única, Membresía activa/vigente y Temporada abierta al conceder;
- grant, slot y receipt propios por capability;
- finalización invalida, reactivación no revive, renovación no hereda;
- cierre de Temporada, cambio de Owner y archivo invalidan;
- nueva concesión crea otro hecho;
- cada request y página revalida.

Se reutiliza infraestructura E3-02 como patrón. No se muta `GROUP_TREASURY`, no se agregan arrays de
permisos y las revocaciones son independientes. La lectura incidental de la bandeja pertenece a la
capacidad de revisión; no concede la consulta económica general.

Owner no necesita Persona. Sobre Grupo archivado, sólo Owner decide conforme a prearchivo.

## 17. Temporada cerrada, exintegrantes y archivo

### 17.1 Temporada cerrada y exintegrantes

- el sujeto puede informar desde una Membresía activa o finalizada;
- la Temporada puede estar cerrada porque se liquidan obligaciones existentes;
- todas las líneas deben conservar el mismo `seasonId` y `membershipId` exactos;
- renovación no permite mezclar la raíz nueva con la anterior;
- el revisor delegado puede perder eficacia por su propio lifecycle; Owner sigue habilitando la
  liquidación.

### 17.2 Grupo archivado

Para informar, confirmar o revertir una entrega del Grupo archivado:

1. sólo sujeto propio informa y sólo Owner administra;
2. todas las líneas pertenecen al mismo Grupo/Membresía/Temporada;
3. cada Pago satisface individualmente la prueba prearchivo aprobada;
4. si una línea falla la prueba, toda la operación falla sin efectos;
5. no se aceptan grants delegados ni se crean conceptos u obligaciones;
6. no se escribe Grupo, Temporada, Membresía o Períodos;
7. no se restaura navegación o actividad deportiva.

La visibilidad histórica se conserva aunque no haya una entrega informable válida.

## 18. Reversión de la entrega completa

Antes de exponer la primera confirmación debe existir la reversión Owner-only aprobada, que:

- referencia exactamente una entrega con `decisionState = CONFIRMED` y
  `applicationState = APPLIED`;
- exige motivo e `idempotencyKey`;
- revierte todas sus aplicaciones o ninguna;
- usa la misma estrategia atómica aprobada para confirmación;
- crea una única identidad común de reversión y referencias por aplicación;
- rederiva saldo/estado de todos los Pagos;
- conserva `decisionState = CONFIRMED` y cambia únicamente `applicationState` de `APPLIED` a
  `REVERSED`;
- conserva declaración, confirmación histórica y aplicaciones originales; agrega la referencia a
  la reversión común sin reemplazarlas ni borrarlas;
- funciona sobre prearchivo para Owner;
- no representa devolución real, ajuste ni condonación.

No se permite revertir una línea, revertir una reversión o confirmar nuevamente la misma entrega.
Para corregir una distribución: reversión completa y nueva entrega.

Esta capacidad no pertenece al revisor delegado. Debe implementarse y verificarse en el mismo corte
antes de habilitar confirmación; no se admite un intervalo operativo con entregas confirmables pero
irreversibles.

## 19. Contratos públicos propuestos

### 19.1 Sujeto propio

- `listMyObligations({ pageSize?, cursor? })`, extendido con contexto presentable y composición;
- `reportOwnPaymentDelivery({ membershipId, declaredPaidOn, lines, idempotencyKey })`;
- `listMyPaymentDeliveries({ membershipId?, pageSize?, cursor? })`;
- `getMyPaymentDelivery({ deliveryId })`.

### 19.2 Administración

- `listGroupPaymentDeliveries({ groupId, decisionState: REPORTED, pageSize?, cursor? })`, bandeja de
  pendientes para Owner o revisor autorizado, con el filtro adicional de terceros para el revisor;
- `getGroupPaymentDelivery({ groupId, deliveryId })`, detalle de pendiente; para revisor exige
  `REPORTED`, tercero y grant vigente, mientras Owner puede usarlo en la bandeja pendiente;
- `listOwnerConfirmedPaymentDeliveries({ groupId, applicationState?: APPLIED | REVERSED,
  membershipId?, confirmedFrom?, confirmedTo?, pageSize?, cursor? })`, Owner-only;
- `getOwnerPaymentDeliveryHistory({ groupId, deliveryId })`, Owner-only para detalle de una entrega
  `CONFIRMED`, aplicada o revertida;
- `getMyPaymentReviewOutcome({ groupId, deliveryId })`, limitado al revisor que emitió o intentó su
  propia decisión, sólo para recuperar su outcome idempotente y sin navegación de historia;
- `confirmPaymentDelivery({ groupId, deliveryId, idempotencyKey })`;
- `rejectPaymentDelivery({ groupId, deliveryId, reasonCode, reasonNote?, idempotencyKey })`;
- `reverseConfirmedPaymentDelivery({ groupId, deliveryId, reason, idempotencyKey })`, Owner-only.

### 19.3 Autorización

- `grantGroupPaymentNoticeReviewCapability`;
- `revokeGroupPaymentNoticeReviewCapability`;
- `listGroupPaymentNoticeReviewGrantsForOwner`;
- `getMyGroupPaymentNoticeReviewContext`.

Contratos cerrados rechazan campos extra. Actores, total, contexto, saldos autoritativos, estados y
timestamps se derivan en backend. Los saldos/revisiones esperados enviados por línea son snapshots
de concurrencia, no autoridad económica, y se contrastan con Pago.

La historia Owner ordena por `confirmedAt DESC, deliveryId DESC`, usa página por defecto 20 y máximo
50, y devuelve cursor opaco ligado a Owner, Grupo, filtros, orden y tamaño. Cada página y detalle
revalidan ownership. En Grupo archivado sólo incluye y permite actuar sobre entregas cuyas líneas
satisfacen íntegramente prearchivo; nunca habilita grants delegados ni nuevas obligaciones.

## 20. Frontend administrativo, privacidad y errores

### 20.1 Owner

En Economía del Grupo:

- bandeja **Entregas informadas pendientes**;
- sección **Historial de entregas confirmadas**, exclusiva Owner, con filtros por estado de
  aplicación (`APPLIED | REVERSED`), Membresía y rango de confirmación;
- una fila por entrega, nunca una por aplicación;
- fila histórica con sujeto presentable, fecha declarada, total, `confirmedAt`, estado de aplicación
  y `reversedAt` cuando corresponda;
- detalle con decisión `CONFIRMED`, total, desglose, aplicaciones originales, confirmante y, si
  existe, motivo/actor/fecha de reversión común;
- acciones completas **Confirmar entrega** / **Rechazar entrega**;
- sección separada **Acceso para revisar entregas**;
- acción Owner **Revertir entrega confirmada** con motivo y confirmación explícita;
- en archivo, sin controles de grants y sólo operaciones prearchivo.

### 20.2 Revisor delegado

Ruta protegida focal, separada de la vista `GROUP_TREASURY`:

- sólo entregas pendientes de terceros;
- sólo puede recuperar outcomes de comandos propios por referencia conocida; no lista ni explora
  historia confirmada general;
- no economía general, reversión ni controles Owner;
- pérdida de autoridad limpia lista y detalle;
- si posee ambas capabilities, sus superficies siguen separadas.

### 20.3 Privacidad

El sujeto ve sólo su declaración, líneas, decisión y aplicaciones. Owner ve pendientes e historia
del Grupo. El revisor ve el mínimo para decidir terceros y recuperar outcomes propios, sin historia
general ni entregas propias por esa superficie. DTOs omiten UID, email, IDs técnicos presentados,
hashes, paths, grants y notas internas. El DTO histórico separa siempre `decisionState` de
`applicationState`; una revertida se presenta como `CONFIRMED + REVERSED`.

### 20.4 Errores mínimos candidatos

| Código | Significado |
| --- | --- |
| `PAYMENT_NOT_ACCESSIBLE` | obligación inexistente o ajena |
| `DELIVERY_NOT_ACCESSIBLE` | entrega inexistente o ajena |
| `DELIVERY_SCOPE_MISMATCH` | líneas mezclan contexto |
| `DUPLICATE_DELIVERY_LINE` | Pago repetido en el desglose |
| `DELIVERY_LINE_LIMIT_EXCEEDED` | excede máximo aprobado |
| `DELIVERY_DRAFT_STALE` | saldo/revisión cambió antes de informar; revisar desglose, cero entrega |
| `DELIVERY_STALE_BALANCE` | al menos una línea ya no cabe; cero efectos |
| `DELIVERY_ALREADY_DECIDED` | estado terminal incompatible |
| `PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED` | grant ausente/ineficaz |
| `SELF_REVIEW_FORBIDDEN` | alguna línea pertenece a Membresía propia del revisor |
| `PREARCHIVE_PAYMENT_REQUIRED` | una línea no acredita prearchivo |
| `DELIVERY_NOT_REVERSIBLE` | no confirmada, ya revertida o fuera del alcance |
| `IDEMPOTENCY_CONFLICT` | key reutilizada con payload distinto |
| `PENDING_RECOVERY` | outcome incierto recuperable |
| `INCOMPATIBLE_STATE` | persistencia parcial/incoherente; nunca éxito |

## 21. Decisiones aprobadas

### 21.1 E3-03-D01–D07 — aprobadas por el usuario

| ID | Decisión aprobada | Consecuencia cerrada |
| --- | --- | --- |
| `E3-03-D01` | Una entrega sólo cubre un Grupo, una Temporada y una `membershipId` exacta. | No mezcla contextos, renovaciones ni Personas. |
| `E3-03-D02` | Identidad/decisión comunes; confirmación y reversión aplican todo o nada mediante transacción acotada. | Excepción multi-Pago exclusiva de E3-03; cada obligación-Pago conserva saldo y autoridad. |
| `E3-03-D03` | Desglose inmutable y total derivado; una línea sin saldo bloquea sin efectos y conserva `REPORTED`. | Sin rechazo automático, recorte, redistribución ni reserva. |
| `E3-03-D04` | `GROUP_PAYMENT_NOTICE_REVIEW` independiente, explícita y con lifecycle E3-02. | Lectura mínima, sin deuda propia, grants implícitos o archivo delegado. |
| `E3-03-D05` | Reversión completa, única, motivada, trazable, idempotente y Owner-only. | Conserva declaración, confirmación y aplicaciones; no devuelve ni ajusta deuda. |
| `E3-03-D06` | Máximo 20 obligaciones únicas. | Contrato cerrado y presupuesto verificable; sin paginar una confirmación. |
| `E3-03-D07` | Fecha civil obligatoria no futura; rechazo categorizado y `OTHER` explicado. | Regla temporal y feedback presentable cerrados. |

Estas decisiones reemplazan las opciones de la versión anterior. No reservan un ID de Documento 5
ni autorizan implementación.

### 21.2 E3-03-D08 — Agregado Entrega informada aprobado

Se adopta un Agregado independiente con raíz, identidad, invariantes, lifecycle y repositorio
propios. Es dueño únicamente de declaración, líneas inmutables, total derivado, decisión completa y
trazabilidad de reversión común. No posee ni deriva deuda, movimientos, saldo o estado económico.

Cada Pago conserva aplicaciones, movimientos, saldo, estado y revisión económica. Confirmación y
reversión coordinan una Entrega y entre 1 y 20 Pagos mediante la excepción transaccional exclusiva
de D02. Grupo, Temporada, Membresía e identidad/autorización sólo se leen.

Se descarta la alternativa `DELIVERY_NOTICE` de Pago porque reuniría bajo Pago responsabilidades e
invariantes con distinta identidad y razón de cambio. El descarte no cuestiona su viabilidad técnica
ni habilita generalizaciones de la opción adoptada.

**Bloqueo concreto restante:** autorización separada para implementar y verificación ejecutable de
los gates de tamaño, presupuesto e índices durante esa implementación. No queda otra decisión
funcional o arquitectónica indispensable identificada en este corte.

## 22. Paquete normativo adoptado

Se formalizan localmente:

1. **[Addendum conjunto E3-03 a Documentos 1, 1.5, 2, 3 y 4](../../arquitectura/Documento-1-1.5-2-3-4-addendum-E3-03-entrega-informada.md)**,
   que desarrolla:
   - entrega única, scope, desglose y decisión completa;
   - autoridad de cada Pago y aplicaciones subordinadas;
   - excepción atómica acotada aprobada exclusivamente para E3-03;
   - estados, saldo, idempotencia, recovery, concurrencia y privacidad;
   - capacidad de revisión y prohibición de deuda propia;
   - reversión completa y límites frente a ajuste/condonación/devolución;
   - Temporada cerrada, exintegrantes y prearchivo;
   - D08=B como clasificación aprobada y fronteras Entrega/Pago.
2. **[DEC-E3-03 adoptada](./DEC-E3-03-entrega-informada.md)**, registrada como `D5-048`, que adopta
   D01–D08 y preserva D5-043–D5-047.
3. **Referencia al addendum prearchivo vigente**, sin reescribirlo ni ampliar actores.

No se requiere diseñar todo E3-05, Caja, roles configurables o flujos deportivos.

## 23. Pruebas focales, UAT y aceptación futura

No se ejecutan pruebas ni UAT en esta revisión. Una implementación futura deberá demostrar:

### 23.1 Dominio/arquitectura

1. Cabecera no decide saldos y cada Pago protege su aplicación.
2. Una entrega produce N aplicaciones correlacionadas, no N recepciones independientes.
3. Ninguna línea duplicada; total igual a suma exacta.
4. Todas las raíces cambian o ninguna cambia.
5. La clasificación implementada coincide con D08 aprobada y no amplía la excepción atómica de D02.
6. Reversión completa restaura todos los efectos o ninguno.

### 23.2 Autorización/privacidad

7. Sujeto activo/exintegrante informa sólo su Membresía exacta.
8. Mezcla de Grupo/Temporada/Membresía falla sin enumerar datos ajenos.
9. Owner sin Persona confirma/rechaza/revierte.
10. Revisor decide terceros, nunca una entrega con línea propia.
11. `GROUP_TREASURY`, cargo, rol global e IDs conocidos no conceden escritura.
12. Rules deny-all y DTOs mínimos.

### 23.3 Concurrencia/recovery

13. Dos entregas sobre uno o varios Pagos compartidos serializan correctamente.
14. Una línea stale conserva entrega pendiente y cero efectos.
15. Pérdida de respuesta recupera un solo outcome y el mismo importe persistido por línea; `FULL`
    nunca se recalcula silenciosamente.
16. Revocación/ownership/archivo concurrentes producen orden real sin efecto parcial.
17. Una inconsistencia parcial falla cerrado y nunca se etiqueta confirmada.
18. Un snapshot desactualizado antes de informar devuelve conflicto revisable y no crea entrega.
19. Revertir conserva `decisionState = CONFIRMED`, cambia sólo la vigencia a `REVERSED` y mantiene
    confirmación/aplicaciones originales.
20. Límites 1, máximo y máximo+1.

### 23.4 Presentación/UAT

21. Grupos desplegables accesibles y separación comprensible por Temporada/Membresía.
22. IDs técnicos ausentes en presentación.
23. Selección total/parcial, total calculado y desglose previo correctos.
24. Un conflicto de borrador muestra saldos propios actuales y exige revisar el desglose.
25. Cambio de contexto advierte antes de descartar y nunca traslada selección.
26. Históricas y archivadas visibles según autorización.
27. Owner filtra/pagina confirmadas, abre una aplicada o revertida y puede iniciar reversión sólo
    sobre la aplicada; revisor no enumera esa historia y recupera únicamente outcomes propios.
28. Pendiente no altera saldos; confirmada actualiza cada obligación como parcial/saldada.
29. Bandeja muestra una entrega con varias líneas, no varios pagos independientes.

### 23.5 Criterios para considerar la ficha lista

1. D01–D08 aprobadas expresamente.
2. D08 reflejada coherentemente en ficha, addendum y DEC.
3. DEC y addendum adoptados por D5-048.
4. Reversión incluida en el mismo corte antes de exponer confirmación.
5. Presupuesto máximo revisado y reservado para comprobación ejecutable durante implementación.
6. Implementación autorizada por separado.

Esta ficha no declara implementación, verificación ni cierre.

## 24. Viabilidad, checkpoint y no efectos

### 24.1 Viabilidad

El recorrido es **técnicamente viable en diseño** con máximo 20 líneas y una transacción Firestore
real sobre entrega, aplicaciones y raíces Pago. D02 ya aprueba la excepción atómica funcional,
acotada exclusivamente a E3-03. D5-048 y el addendum conjunto integran la excepción y el nuevo
Agregado. La capacidad técnica de Firestore no sustituye la comprobación ejecutable de presupuesto,
tamaño e índices durante implementación.

La coordinación recuperable no es equivalente bajo la prohibición de reservas y el requisito de
confirmación completa. Por eso no se ofrece como fallback silencioso.

### 24.2 Checkpoint y rollback documental

- Checkpoint: `dev` en `3f6b82c64f74713981dd923d5eb9a2de9734f9f6`.
- Rollback documental de esta tarea: revertir coordinadamente Documento 5, DEC-E3-03, addendum y
  estado de esta ficha; no existen datos ni cambios funcionales.
- Una implementación futura deberá separar rollback de código de reversión económica; borrar
  aplicaciones no será rollback válido.

### 24.3 Preservaciones

- `GROUP_TREASURY` continúa read-only.
- No se modifican E3-01/E3-02 ni grants existentes.
- D5-044 y D5-045 permanecen intactas.
- E2-14 no se reabre.
- La formalización normativa local se limita a D5-048, DEC-E3-03 y su addendum.
- No se autoriza código, pruebas, Emulator, Firebase remoto, deploy o Git de escritura.

## Declaración final

`LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`
