# IUX-05 — Informe de implementación: Economía personal por Membresía

## Estado

**CERRADO TÉCNICAMENTE EN LOCAL — UAT HUMANA DE RECORRIDOS PROBADOS APROBADA — GATES PRODUCTIVOS PENDIENTES**

- Rama: `feat/iux-05-economia-personal-membresia`.
- Base validada: `dev@29178ccddb05ff5d0b9f8bda33a7e54e6f23c410`.
- Alcance: ficha IUX-05, addendum adoptado y D5-067.
- La implementación quedó versionada en `0fb23ef28f8a11d9d958ff43b69d473a8ea4d666`; este informe y el cierre documental se versionan por separado. No se realizaron despliegues, instalaciones, cambios remotos de índices ni accesos a datos productivos.
- Las pruebas de integración utilizaron exclusivamente `demo-sportexa-e0-02` y datos sintéticos eliminados al finalizar.

## 1. Resultado implementado

### 1.1 Contratos propios read-only

Se reutiliza `getMyCurrentGroupMembershipContext` sin modificarlo. El contexto vigente acredita la
cuenta, Persona, Grupo activo, Temporada abierta y `membershipId` activa antes de montar Economía
personal. Se agregaron cuatro lectores con inputs cerrados y páginas de 1 a 20:

| Callable | Orden | Resultado mínimo |
| --- | --- | --- |
| `listMyMembershipObligations` | `dueDate DESC, paymentId DESC` | obligación, concepto, Período, vencimiento canónico, estado y saldo canónico |
| `listMyMembershipPaymentNotices` | `reportedAt DESC, deliveryId DESC` | aviso, importe declarado, fecha informada/declarada, decisión y fechas de confirmación, rechazo o resolución |
| `listMyMembershipRegisteredPayments` | `registeredAt DESC, origin ASC, receiptId DESC` | ingreso informado confirmado o recepción administrativa, fecha original, fecha efectiva, estado y reversión |
| `listMyPaymentObligationApplications` | `appliedAt DESC, origin ASC, applicationId DESC` | imputación mínima propia, importe, fecha efectiva, estado y reversión |

Todos derivan la identidad desde Auth/Cuenta y revalidan pertenencia y contexto. Los listados
contextuales exigen la Membresía vigente exacta; la consulta de aplicaciones y el detalle conservan
el acceso propio histórico ya admitido para obligaciones de esa Persona. Ningún contrato recibe
identidad administrativa ni exige capabilities administrativas.

Las obligaciones se filtran por la `membershipId` acreditada y estados `PENDING/PARTIAL`, sin
filtrar por `periodKey`: por eso incluye Períodos de Vigencia anteriores de la misma raíz y excluye
otra raíz de renovación. No se calcula saldo total ni cantidad total de Membresía.

### 1.2 Pagos registrados y aplicaciones

Los ingresos informados confirmados y las recepciones administrativas se leen como dos streams con
anclas independientes. El merge aplica orden total estable, deduplica por `{origin, receiptId}` y
sólo adelanta el ancla del stream efectivamente consumido. Un aviso resuelto por una recepción
administrativa no se vuelve a presentar como pago informado; el aviso enlaza la recepción cuando el
contrato conserva esa relación.

Las reversiones mantienen `registeredAt`/`appliedAt` originales, exponen `applicationState:
REVERSED` y agregan `reversedAt`. No se expone actor, identidad administrativa ni motivo interno de
reversión. No existe snapshot común entre bloques o páginas: cada continuación revalida su ancla y
puede observar cambios posteriores conforme al contrato adoptado.

`getMyPaymentObligationDetail` conserva sus consumidores y autorización `SUBJECT`; añade la primera
página de `applications` y `applicationNextCursor`. Correcciones de principal, condonaciones y sus
reversiones conservan sus contratos actuales. Las continuaciones se solicitan únicamente al abrir
el detalle, sin carga N+1 por filas.

### 1.3 Interfaz

La navegación principal del integrante separa `/membership` (**Mi participación**),
`/personal-economy` (**Economía personal**) y, sólo con capabilities vigentes, `/economy`
(**Economía del Grupo**). Owner conserva Resumen, Temporada, Integrantes y Economía del Grupo; si
el contexto propio canónico acredita que también integra el Grupo, suma los dos destinos personales.
Ownership no se interpreta como Membresía.

Economía personal quedó consolidada en una superficie única: encabezado, pestañas y contenido activo
comparten borde y fondo. Las etiquetas son Obligaciones, Avisos y Pagos; el panel conserva el título
Pagos registrados. La pestaña activa se conserva en
`economy=obligations|notices|payments`, sin borrar otros parámetros, y admite recarga, deep-link y
Atrás/Adelante. Una grilla de tres columnas evita scroll horizontal a 360/390 px y mantiene
`tablist/tab/tabpanel`, navegación de teclado y foco visible.

`/membership?economy=...` continúa siendo un enlace compatible: reemplaza la ruta por
`/personal-economy`, conservando query y hash. Mi participación ya no monta ni consulta lectores
económicos. Conserva contexto, acciones y recuperación de salida. Las verificaciones de capabilities
se resuelven una vez en `GroupFrame` y alimentan tanto la navegación como el aviso contextual, sin
duplicar consultas ni conceder permisos.

Cada listado se carga recién al activarlo y conserva carga, error, vacío, reintento, actualización
y paginación propios. Las respuestas tardías se descartan por generación y el contenido completo se
remonta con una clave de Cuenta, Grupo y Membresía, por lo que tampoco sobreviven items o cursores al
cambio de sesión/contexto. Los errores de validación tienen mensajes propios de obligaciones, avisos
y pagos registrados; no se convierten en vacíos.

El detalle de obligación se abre bajo demanda, devuelve foco al disparador, cierra con Escape y
pagina aplicaciones, correcciones y condonaciones por separado. Se conserva el acceso global `Mis
obligaciones` y las superficies administrativas delegadas preexistentes. No se agregaron polling,
listeners, sumas de páginas, saldos agregados ni escrituras.

El encabezado compartido de Grupo ahora muestra el nombre como título y traslada allí el cambio de
contexto. El rótulo “Grupo seleccionado” y el selector duplicado fueron retirados de la caja de
navegación, que contiene exclusivamente pestañas desktop o selector móvil de secciones. Si las
fuentes completas devuelven un solo Grupo, el título queda sin chevron. En carga, cobertura parcial
o pluralidad, nombre y chevron forman un botón accesible con menú, cierre por Escape/selección/clic
exterior, navegación por flechas, Home/End y restauración de foco.

El menú reutiliza `listOwnGroups` y todas las páginas de `listMyCurrentGroupMemberships` a 20,
fusiona por `groupId` sin perder el caso Owner también integrante y no hace consultas por opción.
Un fallo de cualquier fuente conserva el Grupo abierto, evita afirmar unicidad y ofrece reintento.
Cambiar de Grupo conserva `/membership`, `/personal-economy`, `/economy`, Temporada o Integrantes
sólo si la relación ya acreditada permite esa sección; si no, cae en Resumen Owner o Mi
participación. El destino se construye limpio, sin IDs, cursores, filtros, query ni hash anteriores;
el cambio de `groupId` invalida el frame y sus respuestas tardías. Navegar sólo entre secciones no
recarga las alternativas ni vuelve a ejecutar el efecto de autorización del frame.

La enumeración existente cubre Grupos administrados y Membresías vigentes, pero no ofrece un lector
global de Grupos accesibles sólo mediante una capability delegada. No se amplió backend para este
ajuste visual: el contexto delegado ya abierto sigue siendo utilizable y cada destino/comando
revalida autorización. Esta limitación no se disimula como ausencia de alternativas.

Obligaciones usa tabla sólo en escritorio y filas compactas en móvil. Avisos describe sus líneas con
los snapshots existentes. Pagos registrados amplía su DTO propio mínimo con las mismas líneas ya
embebidas en cada documento fuente: `paymentId`, importe, concepto snapshot y vencimiento. No se
agregaron lecturas, hidratación por Pago ni identidades administrativas. Para varias líneas se ofrece
un resumen y desglose accesible; si falta descripción o período, se informa honestamente en lugar de
consultar o inventar nombres actuales.

## 2. Índice local

Se documentó en `firestore.indexes.json` únicamente el índice adoptado para avisos confirmados:

```text
paymentDeliveries / COLLECTION:
membershipId ASC, decisionState ASC, confirmedAt DESC, __name__ DESC
```

No fue creado ni validado remotamente. Firestore Emulator ejecuta la consulta, pero no certifica la
suficiencia ni el estado de construcción del índice en producción. La validación remota y su rollout
siguen siendo gates productivos separados.

## 3. Archivos implementados

### Backend y contratos

- `functions/callables/listMyMembershipObligations.js`
- `functions/callables/listMyMembershipPaymentNotices.js`
- `functions/callables/listMyMembershipRegisteredPayments.js`
- `functions/callables/listMyPaymentObligationApplications.js`
- `functions/index.js`
- `functions/src/payments/application/paymentContract.js`
- `functions/src/payments/infrastructure/firestorePaymentStore.js`
- `functions/src/paymentDeliveries/application/paymentDeliveryContract.js`
- `functions/src/paymentDeliveries/infrastructure/firestorePaymentDeliveryStore.js`
- `functions/src/paymentDeliveries/public/subjectPaymentApplicationsCapability.js`
- `functions/src/paymentDeliveries/public/subjectPendingNoticeEvidenceCapability.js`
- `functions/src/administrativeReceipts/application/administrativeReceiptContract.js`
- `functions/src/administrativeReceipts/infrastructure/firestoreAdministrativeReceiptStore.js`
- `firestore.indexes.json`

### Frontend

- `src/app/(protected)/dashboard/groups/[groupId]/membership/page.tsx`
- `src/app/(protected)/dashboard/groups/[groupId]/personal-economy/page.tsx`
- `src/components/groups/GroupFrame.tsx`
- `src/components/groups/GroupContextNavigation.tsx`
- `src/components/groups/GroupSwitcher.tsx`
- `src/components/groups/GroupPageShell.tsx`
- `src/components/payments/PersonalMembershipEconomy.tsx`
- `src/services/paymentsService.ts`
- `src/services/paymentDeliveriesService.ts`
- `src/services/administrativeReceiptsService.ts`
- `src/types/Payment.ts`
- `src/types/PaymentDelivery.ts`
- `src/types/AdministrativeReceipt.ts`

### Pruebas

- `functions/test/unit/personalEconomyIux05.test.js`
- `functions/test/emulator/personalEconomyIux05.test.js`
- `functions/test/run-emulator-tests.js`
- regresiones de composición IUX-03/IUX-04 actualizadas para el nuevo componente.

## 4. Continuación UAT: errores de lectura

El 5 de noviembre de 2026 el usuario confirmó que la corrección de lectura funciona. La UAT
continuó con la separación de navegación personal documentada en 1.3; esa confirmación no equivale a
aprobación global de IUX-05.

La Cuenta UAT activa (`olive.grass.278@example.com`) acreditó la Membresía
`Vav99zn0HXVuhLhgl5tB`, Grupo `rHUM1XknCsj8DHbrvWit` y Temporada
`sgiT7XMyKkiQoHv1BpW3`. No se modificaron sus datos.

Se invocó cada callable contra Functions Emulator con Auth válida, registrando payload sin token:

| Lector | Payload que fallaba | HTTP / status / reason | Evidencia y causa |
| --- | --- | --- | --- |
| `listMyMembershipObligations` | `{ groupId, membershipId, pageSize: 20, status: "OPEN", cursor: null }` | `400 / INVALID_ARGUMENT / VALIDATION_FAILED` | el validador de Pagos acepta cursor ausente o string; el cliente serializaba `null` |
| `listMyMembershipPaymentNotices` | `{ groupId, membershipId, pageSize: 20, cursor: null }` | `400 / INVALID_ARGUMENT / VALIDATION_FAILED` | el validador de Avisos rechaza `null`; no era un error de datos |
| `listMyMembershipRegisteredPayments` | `{ groupId, membershipId, pageSize: 20, cursor: null }` | `400 / INVALID_ARGUMENT / VALIDATION_FAILED` | el validador de Ingresos rechaza `null`; no era un error de merge de streams |

Repitiendo las tres invocaciones sin la propiedad `cursor`, todas respondieron `200` con vacío
válido para esta Membresía. `firebase-debug.log` mostró los exports nuevos cargados, Auth `VALID` y
ejecución de cada callable; queda descartado un proceso viejo. La corrección omite `pageSize` y
`cursor` cuando son `undefined` antes de cruzar la frontera callable. No se relajaron validadores ni
se sustituyeron errores por listas vacías. La regresión focal comprueba que `cursor: null` continúa
rechazado y que los tres servicios omiten opcionales ausentes.

### 4.1 Comprobaciones repetidas entre rutas personales

`GroupFrame` vive en el layout común de `[groupId]`: no se desmonta al navegar entre
`/membership` y `/personal-economy`. La repetición provenía de su efecto, no de un remount. El efecto
dependía de `pathname` y además calculaba capabilities con `pathname.endsWith("/economy")`:
`/personal-economy` **no** cumple ese sufijo exacto. La ida cambiaba el scope de `true` a `false` y la
vuelta de `false` a `true`, reiniciando ownership y capabilities. Las páginas también repetían
`getMyCurrentGroupMembershipContext` pese a que el frame ya conservaba ese DTO.

No existía caché o deduplicación de navegación en la aplicación: el token generacional sólo impedía
publicar respuestas tardías. Las denegaciones esperadas ya habían terminado; no se repetían por
seguir pendientes, sino porque el efecto se ejecutaba otra vez. Cualquier coalescing de transporte
no forma parte del contrato.

Conteo determinista de intentos para una ida y vuelta, partiendo de `/membership` ya resuelto:

| Callable | Antes | Después |
| --- | ---: | ---: |
| `getOwnGroup` | 2 | 0 |
| tres consultas de capabilities | 3 | 0 |
| `getMyCurrentGroupMembershipContext` | 4 (2 frame + 2 páginas) | 0 |
| **Total** | **9** | **0** |

La corrección final liga el efecto a `{accountId, groupId, reloadVersion}`. Para un integrante, el
frame resuelve las capabilities al acreditar el Grupo y conserva el DTO canónico; para Owner, el
acceso propio corta antes de consultar capabilities delegadas. Cambiar sólo de sección —incluidas
Resumen, Mi participación y Economía personal— no vuelve a ejecutar ownership ni comprobaciones ya
resueltas. Cambio de Cuenta/Grupo, reintento, revocación notificada o recarga completa sí vuelven a
resolver. No hay persistencia ni `localStorage`, y cada destino/comando continúa reautorizando en
backend.

Los `403` de `getOwnGroup` para un integrante y los reasons
`GROUP_TREASURY_NOT_AUTHORIZED`, `PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED` y
`ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED` son denegaciones esperadas. Se corrigió además la
clasificación para que sólo esos reasons se conviertan en capability ausente: fallos técnicos
permanecen rechazados en `Promise.allSettled`, activan advertencia y conservan reintento.

### 4.2 Acceso global

El acceso global se presenta una sola vez junto al encabezado económico como acción secundaria
**Ver todas mis obligaciones**. Conserva `/dashboard/obligations`, altura táctil de 44 px y foco
visible; no se replica en las subsecciones.

### 4.3 Lenguaje, aviso propio y refresco

- El detalle contextual presenta **Importe actual**, **Saldo pendiente**, **Pagos aplicados** y
  **Ajustes de la obligación**. El importe original y los totales explicativos se muestran sólo si
  aportan contexto; la condonación se explica como deuda perdonada.
- Un módulo de presentación centraliza las traducciones de todos los estados visibles de
  obligaciones, avisos, pagos registrados, aplicaciones, correcciones y condonaciones. Los enums y
  DTOs no cambiaron y los valores desconocidos no se reinterpretan como pendientes.
- **Informar un pago** deriva al flujo global existente con la obligación y el retorno identificados.
  El destino puede releer el detalle SUBJECT si el item no está en la primera página, contrasta
  Grupo/Membresía y preselecciona sólo obligaciones pendientes o parciales con saldo. El backend
  conserva la revalidación autoritativa y el acceso ajeno se deniega en el reader.
- El writer vigente no contiene una prohibición de segundo aviso por la sola existencia de un aviso
  pendiente; no se agregó una restricción visual que cambie esa regla. Estados saldado y anulado, o
  ausencia de saldo, muestran el motivo de indisponibilidad.
- IUX-05 y Pendientes de Inicio comparten `RefreshButton`: 44 px, nombre accesible, icono móvil,
  texto desktop, foco, spinner y bloqueo durante carga. Cada bloque mantiene refresh y error propios;
  el guard existente evita clics repetidos y no se agregó polling.

### 4.4 Localización de “Ver aviso” sin duplicación

La navegación por `?economy=notices&notice={deliveryId}` conserva la consulta paginada y usa
`getMyPaymentDelivery` sólo para localizar y revalidar el aviso propio seleccionado. La composición
crea una única representación por `deliveryId`:

- si el aviso ya está en las páginas cargadas, la respuesta puntual actualiza esa misma fila, que
  recibe foco, texto **Aviso seleccionado**, borde y `aria-current`;
- si todavía no está cargado, aparece una única fila marcada **Resultado localizado fuera de la
  página cargada**; no se modifica el cursor ni se afirma que pertenezca a la página actual;
- cuando **Cargar más** alcanza ese `deliveryId`, el `Map` de composición lo deduplica y la fila deja
  de estar marcada como externa sin cambiar el cursor backend;
- carga, error, aviso confirmado/rechazado y acceso denegado permanecen explícitos. La lectura no
  crea ni modifica avisos y el cambio de URL conserva recarga y Atrás/Adelante.

## 5. Validación y mediciones

| Gate | Resultado |
| --- | --- |
| Lint contra baseline | PASS; 31 errores y 8 warnings históricos conocidos, sin deuda nueva; 11 hallazgos históricos resueltos |
| TypeScript | PASS |
| Sintaxis Functions | PASS — 494/494 archivos |
| Unitarias completas | PASS — 451/451 |
| Unitarias focales IUX-05 | PASS — 13/13: cobertura/evidencia, lookahead, fallo complementario y localización sin duplicación |
| Unitarias focales de navegación IUX-03/IUX-04/IUX-05 | PASS — 26/26, incluido selector contextual, cobertura parcial y panel económico |
| Emulator focal IUX-05 | PASS — 1/1, Firestore sintético, cero escrituras de lectores |
| Gate completo de emuladores | PASS — 7/7 lotes, 42 archivos canónicos ejecutados |
| Build Next | PASS; rutas dinámicas `/membership`, `/personal-economy` y `/economy` compiladas |
| Servido HTTP del build | PASS — build `oAvg-ZeXxyNNEy_zWBqCm`, `next start` en `0.0.0.0:3000`; Economía personal responde HTTP 200 y el HTML referencia ese BUILD_ID |
| `git diff --check` | PASS |

Última medición focal local por intento:

| Bloque | Lecturas lógicas instrumentadas | Presupuesto adoptado | Latencia Emulator local |
| --- | ---: | ---: | ---: |
| Obligaciones — primera página | 26 | 46 | 104.38 ms |
| Obligaciones — continuación | 11 | 47 | 83.40 ms |
| Avisos | 25 | 30 | 69.08 ms |
| Pagos registrados | pico 15 | 51 | 70.56–137.98 ms por página |
| Aplicaciones | pico 23 | 72 | 169.13–234.60 ms por página |

Los valores incluyen autorización, validaciones, lookahead e hidratación realizados en cada intento
instrumentado. El fixture medido tenía un solo aviso `REPORTED`, por eso consumió 26/11 y no los
máximos 46/47; las pruebas unitarias ejercitan exactamente 20 y más de 20 avisos, incluido un match
fuera de la ventana que queda `UNKNOWN`. Cada retry sería un intento nuevo y vuelve a consumir
lecturas. Son conteos lógicos y latencias del Emulator local: no acreditan facturación, índices ni
latencia productiva.

El fixture cubrió 25 obligaciones, 25 avisos, 28 ingresos y 28 aplicaciones; movimientos de una y
dos obligaciones; snapshot de concepto histórico distinto del nombre actual; dos páginas o más en
cada bloque; empates; streams desbalanceados; raíz renovada excluida; Período anterior de la misma
raíz incluido; cuenta ajena; cursor cruzado; aviso pendiente/rechazado/confirmado/resuelto; pago
directo; pagos parciales y múltiples aplicaciones; reversión previa y una reversión producida entre
páginas; preservación de fecha original; deduplicación; ausencia de pérdidas; detalle paginado; y
cero cambios en el número de documentos por los readers. Anulación, corrección, condonación y
reversión de condonación quedan además cubiertas por las regresiones canónicas preexistentes del
detalle.

## 6. Evidencia visual y UAT

El 6 de noviembre de 2026 el usuario confirmó en sus recorridos UAT la corrección de readers, la
separación de Mi participación/Economía personal, el aspecto integrado, el encabezado y navegación
contextual, el indicador de aviso pendiente y la localización final de **Ver aviso** sin duplicación.
Después confirmó conformidad con IUX-05 y autorizó su cierre. La aprobación se limita a esos
recorridos informados y no alcanza los gates productivos.

No se generaron capturas ni se ejecutaron recorridos visuales autenticados desde esta sesión porque
no dispone de un navegador controlable. El frontend compilado sí quedó servido y las tres consultas se
ejecutaron autenticadas directamente contra Functions Emulator con la Cuenta UAT actual. El build,
las pruebas estáticas y el smoke HTTP acreditan composición, clases responsive, foco y contratos,
pero no sustituyen inspección real a 360 px, 390 px, escritorio o zoom 200 %.

**UAT HUMANA IUX-05: APROBADA PARA LOS RECORRIDOS INFORMADOS. MATRIZ COMPLEMENTARIA Y GATES
PRODUCTIVOS: PENDIENTES.**

Guion mínimo pendiente:

1. Iniciar una única instancia Auth/Firestore/Functions con el proyecto demo documentado y servir
   el build compilado; no reutilizar datos ni credenciales productivas.
2. Entrar como miembro puro y verificar que la navegación principal separa Mi participación y
   Economía personal; Economía del Grupo sólo aparece con capability delegada.
3. Repetir con Owner también integrante: debe conservar Resumen, Economía del Grupo, Temporada e
   Integrantes, además de sus dos destinos personales acreditados.
4. Desde el título, probar un Grupo, varios Grupos y más de una página de Membresías. Verificar
   **Administrás**, **Integrás** y **Administrás · Integrás**, cierre con Escape/selección/clic
   exterior, flechas, Home/End y foco restaurado. Simular fallo parcial: el Grupo actual debe seguir
   utilizable y “Reintentar alternativas” no debe fingir cobertura completa.
5. Cambiar entre Grupos con permisos distintos desde cada sección. Debe conservar la equivalente
   sólo si está acreditada, caer en Resumen o Mi participación cuando no, y no arrastrar query/hash,
   IDs de obligación/aviso, cursores ni filtros. Cambiar sólo de sección no debe repetir ownership o
   capabilities ya resueltos.
6. Abrir `/personal-economy?economy=obligations|notices|payments` directamente, recargar y usar
   Atrás/Adelante; comprobar que otros parámetros se conservan y cada listado carga sólo al activarlo.
7. Abrir un enlace anterior `/membership?economy=payments&...#registered-...` y confirmar reemplazo
   compatible de ruta, query y hash. Mi participación no debe consultar los listados económicos.
8. Verificar pestañas de escritorio y selectores móviles a 360 px, 390 px y zoom 200 %, sin overflow
   ni doble scroll.
9. Recorrer páginas con empates y streams desbalanceados; comprobar ausencia de duplicados/pérdidas
   y que actualizar un bloque no bloquee los otros.
10. Verificar obligación sin aviso, con uno y con varios avisos propios `REPORTED`; `FOUND` debe
    mostrar **Pago informado · En revisión** y abrir el aviso correcto, `NONE` no agrega indicador y
    `UNKNOWN` ofrece sólo **Consultá tus avisos de pago**. Confirmar que rechazo/confirmación aparece
    tras Actualizar y que el fallo complementario conserva obligación y saldo con reintento.
11. Abrir obligaciones pendiente, parcial, saldada, ajustada y anulada; comprobar lenguaje en español,
   pagos aplicados vigentes/revertidos, deuda perdonada, continuación, retorno de foco, Escape y
   teclado. Desde una obligación habilitada usar **Informar un pago**, confirmar preselección exacta,
   regreso a Economía personal y revalidación; en estados no disponibles debe verse el motivo.
12. Cambiar de sesión, Grupo y Membresía durante una respuesta demorada; no debe publicarse el
   resultado anterior. Intentar acceso ajeno y confirmar respuesta cerrada sin enumeración.
13. Probar reactivación con la misma raíz y renovación con raíz distinta; sólo la primera conserva
   los Períodos anteriores en el contexto actual.
14. Probar Actualizar con éxito, error y clics repetidos en cada bloque; verificar icono/etiqueta,
    foco y área táctil en 360/390 px y escritorio.
15. Registrar capturas, tiempos y lecturas del ambiente UAT. La aprobación debe ser humana y explícita.

## 7. Pendientes y gates reales

- El indicador **Pago informado · En revisión** quedó implementado localmente con la alternativa B
  aprobada. Las líneas embebidas siguen sin ser consultables por `paymentId`: los 20 documentos son
  una ventana técnica y el documento 21 es sólo lookahead, nunca una cota del dominio. E3-03 permite
  seguir creando avisos y `MAX_RELATED_NOTICES = 20` continúa limitando únicamente el preview E3-04.
- El estado real se verificó en código: `listMyMembershipObligations` devuelve Pagos enriquecidos
  con evidencia/cobertura acotadas;
  `listMyMembershipPaymentNotices` pagina el historial propio; `getMyPaymentDelivery` puede abrir un
  aviso conocido; el detalle Owner barre y expone avisos pendientes sólo bajo autorización Owner;
  y `listReportedPaymentDeliveriesForPayments` relee hasta 20 Pagos y hace una query agrupada sin
  límite bajo autorización administrativa, además de excluir la auto-revisión delegada. Esta última
  no se reutilizó: la nueva capacidad SUBJECT es read-only, acotada y no concede revisión.
- La primera página de obligaciones tiene presupuesto aprobado de hasta 46 lecturas lógicas: Cuenta,
  Membresía, Grupo, Temporada, hasta 21 Pagos y hasta 21 avisos. La continuación puede llegar a 47
  por el ancla. Cada reintento se cuenta aparte; no son cifras de facturación o latencia productiva.
- La opción por obligación no es una query selectiva: Firestore no consulta `lines[].paymentId` en
  un array de mapas. Como callables separadas serían hasta 20 llamadas frontend; como batch serían
  hasta 20 consultas Firestore que repiten el mismo conjunto. Para probar ausencia su costo es
  `O(20 × D)` documentos con `D` avisos `REPORTED`, más autorización, y no tiene máximo.
- La alternativa agrupada acotada quedó aprobada e implementada localmente sin exigir ausencia fuera de su ventana. Una
  query `membershipId + decisionState=REPORTED + __name__ ASC LIMIT 21` usa 20 documentos como
  ventana de evidencia y uno como lookahead. Hasta 20 significa cobertura `COMPLETE`; 21 significa
  `PARTIAL`, no exceso funcional. No limita cuántos avisos pueden crearse, confirmarse o rechazarse.
- El resultado por obligación es `FOUND` cuando al menos un aviso validado de la ventana contiene su
  `paymentId`; `NONE` únicamente si no hay match y la cobertura es `COMPLETE`; `UNKNOWN` si no hay
  match con cobertura `PARTIAL` o si la consulta complementaria falla. `UNKNOWN` nunca se convierte
  en `NONE`. Un aviso puede producir `FOUND` en varias obligaciones.
- La forma implementada conserva una llamada frontend y enriquece el mismo reader mediante una
  capacidad pública SUBJECT de PaymentDeliveries. Comparte Cuenta, Persona, Membresía, Grupo,
  Temporada y snapshot; ejecuta una query de Pagos y una query de avisos, sin consultas por fila.
  Cada aviso leído valida documento/schema/origin, contexto propio, `REPORTED`, fechas, totales,
  líneas y duplicados antes de producir evidencia. Un fallo complementario devuelve cobertura
  `FAILED` y obligaciones utilizables; el frontend mantiene saldos, advierte y permite reintentar.
- DTO mínimo: `pendingNoticeEvidence` por item con
  `FOUND + { deliveryId, reportedAt, declaredPaidOn, requestedAmountMinor }`, `NONE`, o
  `UNKNOWN + reason(PARTIAL_COVERAGE|SUPPLEMENT_UNAVAILABLE)`; y
  `pendingNoticeCoverage: COMPLETE|PARTIAL|FAILED` en la página. No incluye total ni suma. Si hay
  varios matches leídos se elige representante por `reportedAt DESC, deliveryId DESC`; con cobertura
  parcial no se presenta como lista completa.
- `FOUND` muestra **Pago informado · En revisión** y abre el aviso propio. `NONE` no agrega
  indicador. `UNKNOWN/PARTIAL_COVERAGE` ofrece **Consultá tus avisos de pago** sin sugerir relación.
  El estado y saldo de la obligación y **Informar un pago** no cambian; no se promete impedir otro
  aviso ni prevenir todos los duplicados.
- Presupuesto aprobado: 46 lecturas lógicas en primera página —4 de contexto, hasta 21 Pagos y 21
  avisos— y 47 en continuación por la relectura del ancla. Validar avisos/lines es memoria y no suma
  lecturas. Cada retry es otro intento y las métricas locales no sustituyen
  facturación/latencia productiva.
- Confirmación o rechazo concurrente se observa bajo el snapshot de ese intento; después de
  responder, el indicador puede quedar desactualizado hasta Actualizar. No hay snapshot entre
  páginas ni polling/listeners nuevos.
- La consulta agrupada puede reutilizar el índice local vigente
  `membershipId ASC, decisionState ASC, __name__ ASC`; no se identifica otro índice ni se modifica
  configuración en esta definición. Su validación remota continuaría como gate.
- Pruebas previstas: aislamiento de Cuenta/Membresía; cero, uno y varios avisos por obligación; un
  aviso con varias obligaciones; saldo parcial inalterado; confirmación/rechazo entre intentos y
  cambio sólo después de Actualizar; coberturas `COMPLETE/PARTIAL/FAILED` y estados
  `FOUND/NONE/UNKNOWN`; más de una página; cursor cruzado; documentos/lines incompatibles; fallo de
  query distinto de ausencia; cero escrituras; y ausencia de llamadas o consultas por fila.
- Validar y construir el índice compuesto en el proyecto remoto autorizado antes del rollout.
- Medir lecturas facturadas y latencia en el ambiente objetivo; ajustar sólo mediante una decisión
  contractual explícita si algún presupuesto no se sostiene.
- Ejecutar smoke servido, recorridos autenticados, responsive, foco y zoom con navegador controlable.
- Conservar como UAT complementaria no acreditada la matriz completa de cuentas/datos, Android
  real, todos los viewports, zoom 200 % y lector de pantalla; luego planificar despliegue coordinado
  de Functions, índice y frontend con observabilidad y rollback.
- Mantener la UAT complementaria y los gates productivos pendientes de IUX-04, IUX-02 y E3.
- IUX-05 no cierra IUX/E3 ni habilita E4.
