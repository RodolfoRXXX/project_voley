# IUX-05 — Relevamiento refinado de Economía personal por Membresía

## Estado y checkpoint

- **Estado:** relevamiento completo; D01–D05 aprobadas y D06–D07 resueltas documentalmente.
- **Clasificación:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Fecha:** 4 de noviembre de 2026.
- **Rama:** `docs/iux-05-economia-personal-membresia`.
- **Base:** `dev@88dae541a966741ec1e29dd9e3d095261a9add44`, coincidente con
  `refs/heads/dev` remoto según `git ls-remote` de sólo lectura.
- **Antecedentes:** `82f4332` integró IUX-04; `88dae54` integró la guía portable. No existe otro
  IUX-05 ni avance posterior en `dev` al checkpoint.

No se hizo `fetch`, commit, merge, push, instalación, migración ni despliegue. IUX-04 conserva UAT
complementaria y gates productivos pendientes.

## 1. Propuesta recomendada evaluada

El menor alcance útil es enriquecer la ruta vigente
`/dashboard/groups/{groupId}/membership` con la economía completa de la **misma raíz de Membresía
activa que la ruta ya acredita**:

- incluye Pagos ligados a esa `membershipId`, aunque correspondan a Períodos de Vigencia anteriores
  de la misma raíz;
- conserva el `groupId` y `seasonId` canónicos de la raíz y los muestra como contexto;
- excluye cualquier raíz sucesora creada por renovación intertemporada;
- no agrega selector, parámetro ni ruta para elegir Membresías finalizadas o históricas;
- conserva `/dashboard/obligations` como acceso histórico global.

Esto distingue dos conceptos: **economía completa de la raíz vigente** no significa **navegación a
raíces históricas**. Una reactivación conserva raíz y agrega un Período; una renovación crea otra
raíz. La UI no agrupa por Persona+Grupo ni mueve deuda entre ellas.

## 2. Identidad y acceso canónicos

El contexto exacto sigue siendo:

```text
{ personId derivada, groupId, seasonId, membershipId }
```

`getMyCurrentGroupMembershipContext({ groupId })` ya deriva Cuenta/Persona y exige Grupo activo,
Temporada abierta y Membresía activa exacta. Es un callable existente, exportado y consumido por la
ruta; IUX-05 lo reutiliza sin crear uno nuevo ni extender su DTO. Acredita sólo el acceso contextual
vigente, no raíces finalizadas. IUX-05 recomienda mantener ese guard sin ampliarlo.
Los readers económicos reciben `{ groupId, membershipId }` o consumen el contexto acreditado, pero
siempre vuelven a hidratar y correlacionar la raíz en backend. El cliente nunca aporta Persona.

Una `membershipId` conocida, un cursor o una capability administrativa no conceden acceso propio.
Sesión distinta, Persona cambiada, Grupo/Temporada cruzados o raíz ajena fallan sin enumeración y
retiran respuestas tardías.

### 2.1 Acceso histórico preservado y diferido

Las consultas propias E3 permiten obligaciones y detalles de raíces activas/finalizadas, Temporadas
cerradas y Pagos prearchivo según sus reglas. Esa capacidad continúa expuesta globalmente mediante
`Mis obligaciones`.

IUX-05 no propone en este corte que `/membership` acredite Grupo archivado, Temporada cerrada o una
raíz finalizada. Una ruta o selector histórico contextual queda diferido y deberá definirse aparte.

## 3. Contratos existentes y reutilización

### 3.1 Obligaciones

`listMyObligations` deriva Persona, pagina hasta 20 y ordena `OPEN/SETTLED` por
`dueDate DESC, paymentId DESC`. No acepta `membershipId`, por lo que filtrar la página en frontend
sería incorrecto. Existe ya un índice de Pagos por `membershipId, estado, dueDate`, pero su aptitud
exacta, dirección de `__name__` y necesidad productiva deben probarse, no inferirse.

`getMyPaymentObligationDetail` revalida Persona, Membresía, Grupo y Temporada. Incluye páginas de
correcciones y condonaciones, pero no aplicaciones de ingreso para el sujeto.

### 3.2 Avisos propios

`listMyPaymentDeliveries({ membershipId?, pageSize?, cursor? })` ya lista declaraciones propias de
una raíz por `reportedAt DESC, deliveryId DESC` y devuelve su estado actual:

- `REPORTED`: aviso en revisión, sin efecto sobre deuda;
- `CONFIRMED`: declaración que originó un ingreso confirmado;
- `REJECTED`: declaración rechazada, sin efecto sobre deuda;
- `RESOLVED_BY_ADMINISTRATIVE_RECEIPT`: aviso resuelto por un registro administrativo; el aviso no
  es por sí mismo ese ingreso.

El reader deriva Persona, pero el filtro actual por `membershipId` no acredita por sí solo el
contexto completo `{groupId, seasonId, membershipId}`. Debe reforzarse o envolverse con esa
validación para IUX-05.

### 3.3 Ingresos propios

`listMyPaymentReceipts` mezcla avisos informados de cualquier estado con recepciones
administrativas. Para el sujeto ordena el primer stream por `reportedAt`, incluso si luego fue
confirmado o rechazado. Por ello no sirve sin ajuste como lista de ingresos registrados.

Las raíces canónicas sí conservan las fechas necesarias:

- ingreso informado confirmado: `confirmedAt`;
- ingreso administrativo: `recordedAt`;
- reversión: `reversedAt`, conservando la raíz y aplicaciones originales.

El reader Owner ya demuestra una composición de ingresos confirmados y administrativos, pero su
autorización administrativa no se reutiliza. IUX-05 necesita la variante propia, minimizada y
autorizada por Persona.

### 3.4 Ajustes

Las correcciones de principal y los eventos de condonación/reversión ya tienen readers propios por
obligación, autorización `SUBJECT`, cursor y orden por revisión descendente e ID. La anulación está
en la raíz del Pago con `voidedAt`.

No hace falta fusionarlos con avisos e ingresos. En el primer corte recomendado se explican en el
detalle de cada obligación, donde conservan su significado y paginación independientes.

## 4. Composición recomendada sin snapshot global

La superficie se divide en bloques que cargan y reintentan independientemente:

1. **Obligaciones con saldo:** lista contextual paginada.
2. **Actividad:** dos listas conceptuales y paginadas por separado:
   - Avisos informados.
   - Pagos registrados.
3. **Detalle de obligación:** aplicaciones, correcciones, condonaciones/reversiones y anulación.
4. **Resumen agregado:** diferido en el primer corte recomendado por la brecha de costo/integridad
   descrita en §6.

No se exige callable único, respuesta atómica ni snapshot entre bloques. Cada respuesta acredita su
propio contexto. Un cambio concurrente puede verse en una recarga posterior; no se presenta la
pantalla como estado de cuenta cerrado a un instante común.

## 5. Hechos y fechas, sin timeline unificado

### 5.1 Obligaciones

```text
dueDate DESC, paymentId DESC
```

Se muestra `dueDate` porque es canónica en Pago E3. No se inventa vencimiento para otra entidad.

### 5.2 Avisos informados

```text
reportedAt DESC, deliveryId DESC
```

La lista representa **declaraciones**, no eventos terminales. Muestra `reportedAt`, fecha declarada
de pago y estado actual. `confirmedAt`, `rejectedAt` o `resolution.resolvedAt` se muestran como
detalle de resolución, pero no reordenan la declaración. Un aviso pendiente nunca reduce el saldo.

### 5.3 Pagos registrados

La etiqueta visible es **“Pagos registrados”**. Se fusionan sólo dos streams del mismo concepto
económico “ingreso registrado”:

```text
registeredAt DESC, origin ASC, receiptId DESC
registeredAt = confirmedAt  para origen INFORMED
registeredAt = recordedAt   para origen ADMINISTRATIVE
```

La lista incluye estado `APPLIED | REVERSED`. `reversedAt` explica la reversión pero no mueve la
recepción en una lista ordenada por registro original. No es un timeline de todos los hechos.

Una entrega confirmada aparece como declaración en Avisos y como ingreso en Pagos registrados
porque son dos significados distintos; se correlacionan por `deliveryId/receiptId` y la UI indica
“Aviso confirmado — ver pago registrado”, sin presentarlos como dos pagos. Un aviso resuelto aparece
en Avisos y la recepción administrativa relacionada aparece en Pagos registrados. Un rechazo
aparece sólo en Avisos.

El merge estable consulta ambas fuentes con `limit(21)`, mantiene un ancla por stream y ordena por
`registeredAt DESC, origin ASC, receiptId DESC`. Sólo avanza el ancla de cada fuente hasta su última
fila emitida; una fuente que no aportó filas conserva su ancla. La identidad `{origin, receiptId}`
evita duplicados. En empates se aplica siempre el comparador completo, también entre páginas. Un
aviso `RESOLVED_BY_ADMINISTRATIVE_RECEIPT` no integra el stream informado confirmado: sólo enlaza la
fila administrativa canónica. Una reversión conserva esa misma fila, su `registeredAt` original y
agrega estado `REVERSED`/`reversedAt`; no crea ni reordena otro pago.

### 5.4 Ajustes y aplicaciones en detalle

| Lista | Orden | Fecha mostrada |
| --- | --- | --- |
| Aplicaciones de ingreso | `appliedAt DESC, origin ASC, applicationId DESC` | `confirmedAt` informado o `appliedAt/recordedAt` administrativo; `effectiveOn` como fecha de negocio |
| Correcciones | `toEconomicRevision DESC, correctionId DESC` | `correctedAt` |
| Condonaciones/reversiones | `waiverHistoryRevision DESC, eventId DESC` | `occurredAt` |
| Anulación | hecho singular de la obligación | `voidedAt` |

Las aplicaciones requieren un merge cursor de dos streams porque las aplicaciones informadas
persisten `confirmedAt` y las administrativas `appliedAt`. Ordenar cada página por fecha después de
consultar por ID no garantizaría orden global y queda descartado.

## 6. Resumen: algoritmo real y brecha

### 6.1 Algoritmo necesario para acreditarlo

Un saldo total y una cantidad exacta por moneda exigirían:

1. leer Cuenta/Persona, Membresía canónica, Grupo y Temporada; hidratar forma/Períodos aplicables;
2. consultar **todas** las raíces Pago abiertas por `membershipId`, sin agregar filtros de Grupo,
   Temporada o Persona que pudieran ocultar una fila incompatible;
3. por cada Pago, hidratar schema y verificar `membershipId`, `personId`, `groupId`, `seasonId`,
   concepto/moneda, estado `PENDING | PARTIAL`, enteros seguros, saldo positivo y ecuación económica
   vigente entre principal, ingresos netos, condonación y saldo;
4. fallar todo el resumen ante una incompatibilidad, sin devolver suma parcial;
5. agrupar por moneda y acumular `pendingBalanceMinor` y `pendingObligationCount` con overflow
   controlado;
6. devolver cero sólo después de acreditar que no hay Pagos abiertos en el scope completo.

### 6.2 Costo e índices

El costo mínimo sería lecturas fijas de identidad/contexto más **N lecturas de Pagos abiertos** y las
lecturas de Períodos que el hydrator canónico requiera. `N` no tiene hoy cota normativa. El índice
existente `payments(membershipId, estado, dueDate)` sirve como candidato para páginas de
obligaciones, pero no convierte una enumeración completa en costo acotado.

Un `count/sum` físico filtrado por `membershipId` y estado no satisface por sí solo §6.1: no hidrata
cada Pago, no prueba correlaciones cruzadas, puede excluir silenciosamente documentos
incompatibles, no valida la ecuación económica y no resuelve agrupación/integridad de moneda. Hacer
varios aggregates y comparar conteos tampoco demuestra todas esas invariantes.

No hay límite funcional máximo de obligaciones abiertas que permita un barrido seguro. Agregar un
techo sólo para la UI produciría totales incompletos; recorrer hasta agotamiento sería un barrido
ilimitado. Persistir un contador/saldo crearía otra decisión de consistencia y queda fuera.

### 6.3 Recomendación

El primer corte útil debe **omitir el resumen agregado**. Presenta cada saldo canónico en la lista
contextual y nunca etiqueta la suma de items cargados como total. La card de resumen no se publica
con cero, aproximación, subtotal ni “hasta N”.

Un resumen futuro requiere evidencia de cardinalidad/costo y una decisión explícita sobre cómo
acreditar integridad sin barrido ilimitado ni nueva fuente de verdad.

## 7. Aplicaciones propias: exposición mínima

Se recomienda ampliar el detalle propio con:

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

No expone identidades de Owner, tesorero, revisor o registrante, motivos internos ni capabilities.
Por cada aplicación, el backend revalida Pago, raíz de recepción/entrega, línea exacta, importe,
estado y contexto completo. Reutiliza las mismas fuentes canónicas que el detalle administrativo,
pero con audiencia `SUBJECT`.

La primera página puede incorporarse a `getMyPaymentObligationDetail`; la continuación usa cursor
propio. Un pago parcial aparece por el importe aplicado a esa obligación. Varios pagos generan
varias aplicaciones. Una recepción que cubre varias obligaciones no duplica importe dentro del
detalle de una obligación: sólo devuelve su línea correlacionada.

El `getMyPaymentObligationDetail` vigente ya autoriza al sujeto por Cuenta/Persona, Pago y Membresía
`activa | finalizada`, pero hoy sólo compone obligación, correcciones y condonaciones: no expone
aplicaciones. IUX-05 propone extender ese DTO propio mediante una capacidad pública interna
minimizada de PaymentDeliveries; no reutiliza el DTO administrativo ni incorpora actores.

## 8. Evidencia para D06–D07

### 8.1 Filtros iniciales y páginas

Todas las páginas usan tamaño por defecto y máximo 20, `limit(21)` y entregan como máximo 20 items.
No existe carga exhaustiva detrás del botón “Cargar más”.

| Consulta | Filtro inicial fijo | Orden estable |
| --- | --- | --- |
| Obligaciones | sólo `PENDING | PARTIAL` de la raíz | `dueDate DESC, paymentId DESC` |
| Avisos | todos los estados de declaración de la raíz | `reportedAt DESC, deliveryId DESC` |
| Pagos registrados | informados `CONFIRMED` + administrativos; `APPLIED | REVERSED` | `registeredAt DESC, origin ASC, receiptId DESC` |
| Aplicaciones | `APPLIED | REVERSED` de una obligación | `appliedAt DESC, origin ASC, applicationId DESC` |
| Correcciones | todas las correcciones de la obligación | `toEconomicRevision DESC, correctionId DESC` |
| Condonaciones | creación y reversión de la obligación | `waiverHistoryRevision DESC, eventId DESC` |

No hay filtros UI adicionales en el primer corte. Cambiar estos filtros crea otro scope de cursor y
requiere definición/índice propios.

### 8.2 Cursores y concurrencia

Cada cursor opaco y versionado queda ligado a:

```text
contractVersion, accountId, personId, groupId, seasonId, membershipId,
paymentId cuando corresponda, filtros, orden y pageSize
```

Obligaciones y Avisos usan un ancla `{ orderDate, resourceId }`. Pagos registrados y aplicaciones
usan dos anclas independientes, una por stream, más el desempate normalizado. La continuación relee
y valida la raíz/ancla. Cursor cruzado, alterado, obsoleto o con cambio de identidad falla sin página
parcial y obliga a reiniciar esa lista.

No hay snapshot entre bloques ni entre páginas. Las fechas de orden son inmutables después de crear
el hecho. Una inserción más reciente que el ancla se ve al refrescar; un cambio que invalida el ancla
produce reinicio seguro, no una promesa de snapshot histórico.

### 8.3 Presupuesto máximo por página

El presupuesto se expresa como lecturas de documentos intentadas **por intento** e incluye el
lookahead, las validaciones y la hidratación indicados en la tabla. La facturación exacta de queries
vacías, latencia y reintentos remotos sigue siendo gate de medición: cada reintento constituye otro
intento y puede repetir el presupuesto, no está absorbido en estos techos. La identidad usa como máximo 2 lecturas;
la acreditación de Membresía usa raíz más hasta dos fronteras y dos Períodos abiertos (máximo 5), y
Grupo+Temporada agregan 2.

| Consulta | Datos paginados | Hidratación adicional | Techo previsto |
| --- | --- | --- | --- |
| Obligaciones | hasta 21 Pagos | ninguna por item; contexto fijo ≤9 | ≤30 lecturas |
| Avisos | hasta 21 Entregas | ninguna por item; contexto fijo ≤9 | ≤30 lecturas |
| Pagos registrados | hasta 21 por cada uno de 2 streams | contexto fijo ≤9 | ≤51 lecturas |
| Aplicaciones | hasta 21 por cada uno de 2 streams | Pago/contexto fijo ≤10 + hasta 20 raíces de Entrega/Recepción | ≤72 lecturas |

Correcciones y condonaciones conservan sus páginas existentes de 20 y sus validaciones por revisión.
No se recorre una página adicional para contar, sumar o detectar “fin” más allá del lookahead.

### 8.4 Índices comprobados y necesario

La configuración versionada contiene como candidatos utilizables:

- `payments(membershipId ASC, estado ASC, dueDate DESC)` para Obligaciones;
- `paymentDeliveries(personId ASC, membershipId ASC, reportedAt DESC)` para Avisos;
- `paymentDeliveries(personId ASC, origin ASC, membershipId ASC, recordedAt DESC)` para recepciones
  administrativas.

Pagos informados confirmados requieren incorporar el índice mínimo:

```text
paymentDeliveries (COLLECTION):
membershipId ASC, decisionState ASC, confirmedAt DESC, __name__ DESC
```

Las dos queries directas de `deliveryApplications` ordenan por su campo de fecha y `__name__` dentro
de la subcolección; no se prevé índice compuesto nuevo. Emulator puede comprobar forma, dirección,
cursores y comportamiento local, pero no certifica índices compuestos de producción. La futura
implementación debe revisar la query real contra `firestore.indexes.json` y conservar como gate la
validación remota de aceptación/estado del índice documentado. No se modifica configuración ni se
autoriza un índice adicional por anticipación.

### 8.5 Frontera modular

- Pagos conserva obligación, saldo, correcciones, condonaciones y autorización propia del detalle.
- PaymentDeliveries conserva Avisos y aplicaciones informadas.
- AdministrativeReceipts conserva recepciones administrativas y la composición read-only de Pagos
  registrados.
- La Presentación consume callables; no importa Firestore.
- Para aplicaciones, PaymentDeliveries expone una capacidad pública interna `SUBJECT` minimizada a
  la composición propia; Pagos no importa su repositorio interno.

D06 queda resuelta por exclusión del resumen agregado. D07 queda resuelta por contratos, scopes,
presupuestos e índice mínimo identificados. Pruebas locales, medición, revisión de configuración,
validación remota y eventual despliegue del índice son gates de implementación/habilitación, no
decisiones de diseño pendientes.

## 9. Brechas cerradas y menor alcance útil

| Brecha | Menor respuesta recomendada |
| --- | --- |
| Obligaciones sin filtro contextual | reader paginado por raíz exacta, no filtro cliente |
| Avisos con acreditación parcial del contexto | revalidar Membresía/Grupo/Temporada en cada página |
| Historial propio mezcla aviso e ingreso | separar Avisos y Pagos registrados con órdenes propios |
| Detalle propio sin aplicaciones | DTO `SUBJECT` minimizado y página propia |
| Resumen exacto exige barrido sin cota | diferir agregado, mostrar saldos por obligación |
| Historia contextual de otras raíces | conservar `Mis obligaciones`; diferir ruta/selector |

No quedan brechas funcionales o contractuales bloqueantes dentro del primer corte. El resumen, la
navegación histórica contextual y el timeline unificado son exclusiones adoptadas, no promesas
implícitas. IUX-05 queda `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
