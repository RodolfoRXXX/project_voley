# E3-09 — Informe de implementación local

## Estado y alcance

- **Base:** `feat/e3-09-retire-social-match-payment-legacy` en
  `3f3f34d785b4bd82e43e5e09872647387012f794`.
- **Marco:** ficha E3-09, DEC-E3-09, addendum a Documentos 2/3/4 y `D5-055` integrados.
- **Resultado de esta ejecución:** cambios y evidencia automatizada locales, pendientes de revisión,
  versionado y rollout autorizados por separado. La UAT humana quedó diferida por falta de recorrido
  frontend operable.
- **Estado de E3-09 y Etapa 3:** no cerrados.

El corte retira la funcionalidad económica legacy de participaciones de partidos sociales sin crear
un reemplazo vinculado a Pago. No cambia Pago, Recepción, inscripciones/equipos de Torneo, D5-044,
D5-045, Auth/UAT aislada ni el baseline funcional vigente.

## Cambios realizados

### Backend y persistencia

1. `joinMatch` deja de materializar `participations.pagoEstado`; conserva ID determinista,
   transacción, duplicados y datos deportivos.
2. `adminMatchService.actualizarPago` fue retirado junto con su export interno.
3. El reemplazo deja de calcular o escribir el efecto económico post-deadline. Selección de suplente,
   promoción, posición, lock y recálculo de ranking permanecen.
4. `onMatchClose` y su export fueron retirados del código versionado. Ninguna actualización de una
   Participación produce cierre automático desde esta versión.
5. Los documentos históricos no se migran, borran, normalizan ni reescriben. Readers y operaciones
   deportivas ignoran el campo y aceptan documentos con cualquiera de los tres valores legacy o sin
   campo.

### Cierre explícito

`cerrarMatch` conserva `matchId` requerido, autenticación, autorización administrativa/contextual,
existencia del Partido y el lifecycle `abierto -> verificando -> cerrado`. La confirmación final:

- requiere estado `verificando`;
- rechaza `match.lock === true`;
- relee en la transacción las Participaciones `titular`;
- exige al menos `sum(posicionesObjetivo)` titulares;
- no consulta `pagoEstado`, Pago ni suplentes;
- deja el cierre como comando explícito y conserva `onMatchStart` sin cambios.

Los nuevos errores internos `MATCH_LOCKED` e `INCOMPLETE_ROSTER` se traducen a
`failed-precondition`. No se agregó un nuevo lifecycle deportivo.

### Tombstone `updatePagoEstado`

El callable mantiene el nombre exportado y evalúa en este orden:

1. autenticación;
2. presencia de `participationId` y `estado`;
3. rol administrativo existente;
4. autorización contextual sobre la Participación y su Partido;
5. catálogo legacy `confirmado | pendiente | pospuesto`;
6. rechazo terminal.

Una solicitud válida y autorizada devuelve siempre:

```text
Firebase code: failed-precondition
message: La gestión económica de partidos sociales fue retirada
details.code: SOCIAL_MATCH_PAYMENT_RETIRED
```

No existe retorno exitoso ni mutación de Participación, Partido o raíces económicas. Los rechazos
previos de autenticación, argumento, autorización y catálogo permanecen antes del error terminal.

### Frontend

La pantalla protegida de Partido ya no contiene:

- columnas, pills, iconos o etiquetas de pago;
- cálculo o mensaje de pagos pendientes;
- bloqueo económico de “Confirmar cierre”;
- modal, estado local, estilos, props o invocación de `updatePagoEstado`.

Se conservan nombre, avatar, ranking, posición, acciones deportivas y modal de equipos. El componente
`pagoModal` fue retirado y sus dos entradas obsoletas se eliminaron del baseline de ESLint.

## Evidencia automatizada

Toda evidencia Firebase usó `demo-sportexa-e0-02`, Auth/Firestore/Functions Emulator en loopback,
secretos sintéticos y bloqueo explícito de credenciales/targets remotos.

| Verificación | Resultado |
|---|---|
| prueba unitaria focal E3-09 | `4/4` aprobadas; |
| Emulator focal E3-09 | `7/7` aprobadas — una suite y seis subpruebas; |
| suite unitaria completa | `404/404` aprobadas; |
| sintaxis Functions | `448/448` archivos JavaScript; |
| lint baseline | aprobado, sin deuda nueva; |
| TypeScript `--noEmit` | aprobado; |
| build Next.js de producción | aprobado, 22 páginas estáticas y rutas dinámicas compiladas; |
| búsqueda estructural | cero usos productivos de `pagoEstado` y ausencia de `onMatchClose`; |
| `git diff --check` | aprobado. |

La evidencia focal cubre:

- alta determinista, reintento, concurrencia y ranking sin materializar `pagoEstado`;
- precedencia completa, repetición y cero efectos del tombstone;
- transición `abierto -> verificando` y cierre con historia `confirmado | pendiente | pospuesto` y
  documento sin campo;
- rechazo por lock y por titulares insuficientes;
- reemplazo post-deadline y reincorporación sin crear, restaurar o reinterpretar economía;
- ausencia de cierre automático al modificar un campo histórico;
- carrera transaccional entre modificación coherente de roster y cierre, sin producir un Partido
  cerrado con el titular removido;
- cero creación en `payments` por el tombstone.

No se repitió la suite Emulator completa: la corrida focal nueva ejercitó las superficies modificadas
y la suite unitaria completa cubrió las regresiones estáticas y de servicios. No se ejecutó una suite
de aceptación humana como parte de la evidencia automatizada.

## Contraste con los criterios de aceptación

La siguiente evaluación contrasta los quince criterios de §13 de la ficha E3-09 con la evidencia ya
obtenida. No interpreta la ausencia de navegación frontend como evidencia del retiro backend.

### Criterios cubiertos técnicamente

- **Criterios 2 a 11:** las pruebas focales unitarias y de Emulator, la suite unitaria completa y la
  búsqueda estructural demuestran cero writers/consumers productivos de `pagoEstado`, cierre y
  reemplazo independientes del campo, cierre explícito con estado/autorización/lock/mínimo titular,
  historia inerte, altas sin campo, contrato y cero efectos del tombstone, ausencia de correlación
  retroactiva y equivalencia deportiva entre los tres valores históricos y la ausencia del campo.
- **Criterio 13, parte técnica:** la búsqueda estructural no encontró usos productivos de
  `pagoEstado`; tampoco quedaron imports, props, estilos, textos o invocaciones económicas en la
  pantalla y componentes alcanzados.
- **Criterio 14:** el diff y las suites confirman que D5-044, D5-045, Auth/UAT aislada, el baseline y
  el gate económico residual de Torneo no fueron modificados.
- **Criterio 12:** la regresión focal compara snapshots completos antes/después de alta con ranking,
  alta concurrente, reemplazo con ranking, reincorporación, cierre `abierto -> verificando`, cierre
  `verificando -> cerrado` y tombstone. En todos los casos preservó cardinalidad, IDs y contenido de
  documentos económicos preexistentes no vacíos, sin creaciones, modificaciones ni eliminaciones.
- **Criterio 15, parte local:** `onMatchClose` no existe en el código/export versionado y no fue
  cargado por Functions Emulator. La eliminación o deshabilitación y verificación de una eventual
  función remota continúa obligatoriamente pendiente del rollout; omitir el export no la acredita.

### Aspectos sin comprobación humana

- **Criterio 1 y criterio 13, presentación efectiva:** la revisión estática acredita que el código de
  la vista no conserva UI, mensajes ni acciones económicas, pero no hubo comprobación visual en un
  navegador.
- **Criterio 10 de la DEC:** no se pudo recorrer humanamente alta, baja, reemplazo,
  reincorporación, ranking, generación/visualización de equipos ni cierre para confirmar que las
  acciones deportivas siguen siendo comprensibles y utilizables desde la interfaz.

La UAT humana no pudo ejecutarse porque el frontend actual no ofrece el recorrido de creación y
gestión de partidos sociales requerido para llegar de forma operable a esos escenarios. Esta falta de
navegación no prueba por sí misma la ausencia de autoridad económica backend ni se registra como UAT
aprobada. La UAT queda diferida hasta una futura habilitación o revisión del módulo de partidos
sociales; no queda condicionada a implementar cobros y no reserva un incremento.

### Cobertura económica exacta del criterio 12

Los stores vigentes y las reglas identifican estas raíces persistidas, todas sembradas con un
documento sintético preexistente no vacío e incluidas completas en cada snapshot:

- `groupChargeConcepts`, `groupChargeOccurrences`, `payments`, `paymentGenerationIntents` y
  `paymentCommandReceipts`;
- `paymentDeliveries`, `paymentDeliveryReversals`, `paymentDeliveryCommandReceipts`,
  `paymentReceiptCandidateGuards` y `administrativeReceiptCommandReceipts`;
- `groupCapabilityGrants`, `groupCapabilityGrantSlots` y `groupCapabilityCommandReceipts`.

También se sembraron y compararon las colecciones subordinadas
`payments/{paymentId}/deliveryApplications`, `principalCorrections`, `waiverEvents` y
`paymentGenerationIntents/{intentId}/rows`. Los movimientos registrados de E3-08 no tienen una raíz
Firestore propia: son una proyección consultiva de `paymentDeliveries`, sus reversals y las
aplicaciones subordinadas a Pago; esas fuentes sí quedaron incluidas.

La comparación canónica incluye ruta, cardinalidad y contenido de cada documento. Por ello detecta
creaciones inesperadas, modificaciones y eliminaciones; no se limita a contar `payments`. La corrida
final focal en Emulator local `demo-sportexa-e0-02` aprobó `7/7`, conservando simultáneamente los
resultados deportivos ya exigidos. No se modificó código productivo.

## Fallos y advertencias observados

- La primera ejecución de Node dentro del sandbox falló antes de cargar código por `EPERM` al resolver
  `C:\Users\Rodolfo`. Se repitió localmente con acceso al mismo workspace y pasó; no fue un fallo del
  producto.
- Firebase CLI no pudo consultar MOTD/config remota porque el runner bloquea red; lo informó como no
  fatal y los emuladores arrancaron con proyecto demo.
- Firebase Functions informó que el SDK instalado no cubre las extensiones más nuevas. E3-09 no usa
  Extensions ni modifica dependencias.
- Build informó `caniuse-lite` desactualizado. La compilación terminó correctamente y no se cambió la
  dependencia.
- El wrapper `npm run quality:diff` no reconoció el repositorio bajo la identidad sandbox por la
  protección de ownership de Git. El comando equivalente read-only con `safe.directory` explícito y
  la revisión adicional de archivos nuevos pasaron sin errores de whitespace.
- La primera corrida de la ampliación del criterio 12 esperó que una reincorporación en Partido
  `verificando` terminara como suplente. Falló porque el ranking vigente omite Partidos no abiertos y
  la Participación permanece `pendiente`, que es el comportamiento deportivo existente. Se corrigió
  únicamente la expectativa y la espera del test; la corrida focal final aprobó `7/7` y no hubo
  correctivo productivo.

No hubo fallos funcionales en la evidencia final.

## Limitaciones y rollout pendiente

No se ejecutó deploy ni se consultó Firebase remoto. Quitar `onMatchClose` del archivo y de
`functions/index.js` **no elimina una Cloud Function ya desplegada**. Un rollout futuro autorizado
debe:

1. verificar en el ambiente objetivo si `onMatchClose` continúa desplegada;
2. desplegar el código que elimina writers/consumers y conserva el tombstone;
3. eliminar o deshabilitar explícitamente la función remota `onMatchClose`;
4. verificar después del rollout que el trigger remoto no exista y que `updatePagoEstado` siga
   publicado como tombstone;
5. ejecutar smoke/UAT autorizados sin reinterpretar ni migrar datos históricos.

La implementación local no acredita esos pasos remotos. El gate económico residual de
inscripciones/equipos de Torneo permanece obligatorio y pendiente.

## Rollback

Antes de cualquier rollout, el rollback técnico consiste en descartar de forma controlada este diff
local. Después de un rollout, restaurar ciegamente la versión anterior reintroduciría writers,
consumidores y autoridad económica legacy, por lo que no es un rollback seguro ni automático.

Ante un problema posterior al rollout se debe mantener detenida la gestión económica social,
preservar los datos históricos y decidir expresamente entre corregir hacia adelante o restaurar una
superficie concreta. Reexportar `onMatchClose`, rehabilitar `actualizarPago` o volver a responder éxito
desde el tombstone requiere una nueva decisión funcional. Ningún rollback debe borrar datos ni crear
Pagos retroactivos.

## UAT humana diferida

La sesión UAT existente no fue modificada ni reutilizada por pruebas automatizadas. La UAT no pudo
ejecutarse porque el frontend actual carece del recorrido de creación y gestión de partidos sociales
necesario. Cuando el módulo vuelva a ofrecer un recorrido operable, una sesión humana aislada y
autorizada deberá:

1. abrir como administrador un Partido social con Participaciones históricas y confirmar que no hay
   columna, estado, modal, mensaje o acción de pago;
2. unirse con una cuenta habilitada y comprobar ranking/roster sin indicador económico;
3. eliminar un titular cerca del deadline y comprobar reemplazo, posición, ranking y ausencia de
   estado económico;
4. reincorporar y confirmar que las acciones deportivas siguen disponibles;
5. pasar `abierto -> verificando`, comprobar rechazo con roster incompleto y confirmar cierre con el
   mínimo titular completo;
6. generar/ver equipos y comprobar que el flujo deportivo no cambió;
7. verificar separadamente que las pantallas económicas canónicas y los flujos de Torneo no cambiaron.

La aceptación humana permanece **no ejecutada y no aprobada**. Deberá registrarse separada de este
informe automatizado; su diferimiento no exige implementar cobros ni reserva un incremento.

## Conclusión de preparación para integrar

El código y el informe tienen evidencia técnica favorable para los criterios 2 a 14 y para la parte
local del criterio 15. No queda ningún criterio técnico obligatorio local sin evidencia para integrar.
La limitación humana está delimitada y no se usa como evidencia backend; la UAT continúa diferida y
no aprobada. El paquete queda **técnicamente preparado para integrar**, sujeto al versionado e
integración autorizados por separado. La eliminación remota de `onMatchClose` permanece como
requisito obligatorio del rollout, no como efecto de la integración local.

Este documento no declara cerrado E3-09 ni Etapa 3.
