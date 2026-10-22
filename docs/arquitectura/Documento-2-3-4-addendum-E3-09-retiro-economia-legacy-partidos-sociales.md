# Addendum a Documentos 2, 3 y 4 — E3-09 / retiro de economía legacy de partidos sociales

## Estado

- **Naturaleza:** complemento normativo focal adoptado.
- **Decisiones incorporadas:** `E3-09-D01=A`, `D02=A`, `D03=A`.
- **Estado:** `ADOPTADO POR D5-055; ENMENDADO POR D5-056`.
- **Implementación:** no autorizada.
- **Documento 5:** continuidad y decisión E3-09 integradas por `D5-055`.
- **Base comprobada:** `dev` en `7b7cac9671d1f18f533a1382feed85a2498e06fd`.
- **Paquete:** [ficha E3-09](../implementacion/etapa-3/E3-09-ficha-retiro-autoridad-economica-participaciones-partidos-sociales.md)
  y [DEC-E3-09](../implementacion/etapa-3/DEC-E3-09-retiro-economia-legacy-partidos-sociales.md).

Este addendum complementa sólo los extremos de Documentos 2, 3 y 4 afectados por el retiro. No
modifica el modelo de dominio de Documentos 1/1.5, no crea conceptos y no autoriza código, pruebas,
Emulator, Rules, índices, configuración, dependencias, Firebase remoto o deploy.

## 1. Complemento funcional para Documento 2

### 1.1 Resultado funcional

Los partidos sociales dejan de ofrecer gestión económica. Participar, reemplazar, ordenar, cerrar,
formar equipos, cancelar, registrar resultado y producir estadísticas no crea ni administra una
obligación económica.

En particular:

- Participación no muestra ni permite editar “pago confirmado”, “pendiente” o “pospuesto”;
- un administrador deportivo no confirma pagos desde Partido;
- el cierre no espera un estado económico;
- un reemplazo posterior al deadline no produce diferimiento económico;
- la ausencia de funcionalidad no significa “gratis”, “pagado” o “condonado”; no existe afirmación
  económica para ese Partido dentro de este corte.

Una futura función de cobro social requerirá decisión funcional nueva. E3-09 no deja un placeholder
Pago–Participación ni una asociación parcialmente preparada.

### 1.2 Cierre deportivo

Se conserva el flujo vigente:

```text
abierto -> verificando -> cerrado -> jugado
             |
             +-> abierto, sólo por reapertura actualmente permitida
```

La transición explícita `verificando -> cerrado`:

1. conserva `matchId` requerido, existencia del Partido, autenticación, autorizaciones
   administrativas/contextuales y estado permitido;
2. no lee `pagoEstado` ni consulta Pago;
3. no procede mientras `match.lock === true`;
4. exige al menos `sum(posicionesObjetivo)` Participaciones en estado `titular`;
5. no exige una cantidad de suplentes, porque esa condición no era un gate efectivo aprobado;
6. deja el Partido `cerrado` para formación de equipos y procesamiento deportivo existentes.

No hay cierre automático por mutación económica. Al llegar el horario, el comportamiento deportivo
vigente continúa: `abierto | verificando` se cancela y `cerrado` se procesa hacia `jugado`.

### 1.3 Reemplazo y roster

La baja de un titular puede conservar el reemplazo deportivo vigente: selección de suplente
compatible, promoción, posición, lock y ranking. El momento relativo al deadline no crea estado
económico ni dispara cierre. Si el Partido queda `verificando`, el cierre final vuelve a ser una
acción administrativa explícita.

No se alteran cupos, posiciones, criterios de ranking, número de suplentes, equipos o lifecycle salvo
la preservación de lock y mínimo de titulares en el cierre final.

### 1.4 Presentación

Las vistas de titulares, suplentes y eliminados conservan sólo información deportiva. Se retiran:

- columna y pills de Pago;
- iconos/colores y textos `Confirmado | Pendiente | Pospuesto`;
- modal y acciones de cambio de estado;
- aviso económico de cierre y bloqueo asociado.

Los mensajes de estado, roster, cupos, ranking, equipos, cancelación y errores deportivos continúan.

## 2. Complemento de autoridad y módulos para Documento 3

### 2.1 Autoridades después del retiro

| Concepto | Autoridad |
|---|---|
| Participación y roster social | Partido y sus contratos deportivos existentes; |
| estado/ciclo de vida del Partido | Partido; |
| obligación, saldo, ingreso, condonación y estado económico canónico | Pago/Recepción sólo cuando esos Agregados existen por casos E3 autorizados; |
| `participations.pagoEstado` histórico | ninguna; dato legacy inerte. |

Participación deja de administrar o presentar economía. Pago no adopta automáticamente datos ni
responsabilidad desde Partido. La ausencia de una relación Pago–Participación es intencional para
E3-09 y no constituye una fuente económica faltante dentro del corte aprobado.

### 2.2 Colaboraciones inexistentes

E3-09 no crea:

- capability Partido → Pago o Pago → Partido;
- evento de obligación, ingreso, condonación o diferimiento;
- repositorio o unidad de consistencia compartida;
- referencia a Persona, Membresía o Temporada;
- sincronización, proyección o doble escritura económica.

Cerrar, reemplazar o iniciar un Partido no consulta Pago. Registrar o liquidar un Pago existente en
otro caso E3 no modifica este Partido.

### 2.3 Historia

Los valores legacy no se convierten en hechos de dominio o integración. Conservarlos físicamente no
les devuelve autoridad. Un reader deportivo puede tolerar su presencia, pero no ramifica una regla,
DTO o autorización a partir de ellos.

## 3. Complemento de diseño de software para Documento 4

### 3.1 Superficies retiradas

La implementación futura deberá dejar sin writer/consumer productivo:

| Superficie actual | Contrato posterior |
|---|---|
| `joinMatch` | crea Participación sin `pagoEstado`; |
| `adminMatchService.actualizarPago` | eliminado como operación alcanzable y writer; |
| `replacementService` post-deadline | conserva sólo mutación deportiva; |
| `adminMatchService.cerrarMatch` | usa estado/autorización, lock y mínimo de titulares; no economía; |
| `onMatchClose` | código y export versionados retirados; su función remota se elimina o deshabilita explícitamente en un rollout futuro autorizado; |
| página y `pagoModal` | sin presentación, edición o invocación económica; |
| `MatchActions.hayPagosPendientes` | contrato/prop retirado. |

No se reemplazan por nuevos writers, listeners, eventos o queries económicas.
Retirar el export local no demuestra la eliminación de una Cloud Function ya desplegada. El futuro
rollout debe tratar esa eliminación o deshabilitación como una operación remota explícita y verificar
su ausencia; este addendum no autoriza ni ejecuta deploy o acceso Firebase remoto.

### 3.2 Tombstone de `updatePagoEstado`

El callable conserva temporalmente el nombre exportado y el perímetro previo de acceso:

```text
input mínimo: { participationId, estado }

orden de evaluación:
1. Cuenta autenticada, como en el contrato vigente;
2. presencia de `participationId` y `estado`;
3. autorización administrativa y contextual preexistente;
4. validación del catálogo legacy `confirmado | pendiente | pospuesto`, sólo para conservar el error
   previo ante input inválido;
5. rechazo terminal estable.

rechazo para actor válido/autorizado:
Firebase code = failed-precondition
message = "La gestión económica de partidos sociales fue retirada"
details = { code: "SOCIAL_MATCH_PAYMENT_RETIRED" }
```

Invariantes:

- no devuelve `{ ok: true }`, `null` exitoso ni success equivalente;
- no modifica documentos ni publica eventos;
- no llama `actualizarPago`;
- no cambia Partido, Participación, Pago, Recepción, Movimiento o estadísticas;
- no provoca `onMatchClose` ni otro automatismo;
- un actor inválido/no autenticado/no autorizado no obtiene el error terminal ni información nueva;
- un `estado` fuera del catálogo conserva su rechazo previo y tampoco alcanza el error terminal;
- las lecturas necesarias para autorización son mínimas, read-only y no se presentan en la respuesta.

El tombstone permanece hasta una decisión separada de desexportación con inventario focal de
consumidores. D5-044 no se modifica ni se usa como fundamento para extender su duración.

### 3.3 Persistencia compatible

- No hay migración, delete o backfill.
- Nuevos documentos de Participación omiten `pagoEstado`.
- Documentos históricos pueden conservar cualquiera de los valores legacy.
- Hydrators/readers deportivos deben aceptar presencia o ausencia sin exponer el campo.
- Ninguna consulta o índice nuevo depende del campo.
- Terminales no se reabren o normalizan.

### 3.4 Concurrencia y recovery

El retiro no introduce intent, receipt o idempotency económica. Las transacciones deportivas
existentes conservan su coordinación. El cierre explícito relee Partido y titulares en la misma
unidad coherente usada para confirmar `cerrado`; una carrera que cambie roster debe reintentarse o
fallar conforme a la semántica transaccional existente.

El tombstone es naturalmente repetible: toda invocación autorizada produce el mismo error y cero
efectos. Una respuesta perdida no requiere consulta de outcome porque no existe éxito posible.

## 4. Pruebas normativamente exigidas

Estas pruebas se definen, no se crean ni ejecutan en este paquete.

### 4.1 Writers y readers

1. `joinMatch` válido crea todos sus datos deportivos y omite `pagoEstado`.
2. duplicado, reintento y dos altas concurrentes no materializan el campo.
3. reemplazo pre/post-deadline conserva resultado deportivo y omite toda economía.
4. reincorporación y recálculo de ranking no leen, crean o restauran el campo.
5. búsqueda estructural falla ante cualquier writer/consumer productivo y permite sólo fixtures de
   compatibilidad o aserciones negativas identificadas.

### 4.2 Cierre

1. `abierto -> verificando` permanece sin consulta económica.
2. `verificando -> cerrado` rechaza `match.lock === true` y menos de
   `sum(posicionesObjetivo)` titulares.
3. con lock inactivo, acepta el mínimo suficiente sin importar que documentos históricos tengan `confirmado`,
   `pendiente`, `pospuesto` o carezcan del campo.
4. suplentes faltantes no agregan un gate nuevo.
5. actualizar cualquier Participación no produce cierre automático.
6. `onMatchStart` conserva cancelación/procesamiento según estado deportivo.
7. para cierre técnico local, el código/export de `onMatchClose` queda ausente; para habilitación
   productiva, el rollout autorizado demuestra eliminación o deshabilitación de la función remota y
   verifica su ausencia operativa, sin inferirla de la omisión del export.

### 4.3 Tombstone y autorización

1. input inválido conserva su error;
2. Cuenta ausente conserva `unauthenticated`;
3. actor sin autorización conserva rechazo y no conoce el estado de retiro contextual;
4. actor autorizado recibe exactamente `failed-precondition`, mensaje y
   `SOCIAL_MATCH_PAYMENT_RETIRED`;
5. ningún caso devuelve éxito;
6. snapshots prueban cero mutaciones y cero eventos/automatismos.

### 4.4 Ausencia económica y frontend

1. altas, reemplazos, ranking, cierres y tombstone no crean/modifican `payments`, Recepciones,
   aplicaciones, movimientos ni guards económicos;
2. ningún valor histórico genera correlación o asociación retroactiva;
3. UI no contiene columna, modal, pill, icono, mensaje, estilo, prop o callable económico;
4. UAT confirma que las acciones deportivas conservadas siguen disponibles y que no se presenta una
   equivalencia “sin estado = gratis/pagado”. Exclusivamente para E3-09 puede permanecer diferida, no
   ejecutada y no aprobada al cerrar el alcance técnico local, pero debe ejecutarse y aprobarse antes
   de habilitar el recorrido de partidos sociales a usuarios.

Auth/UAT real sigue aislada. Emulator, suites y evidencia ejecutable requieren autorización futura.
La separación adoptada por `D5-056` no reduce verificaciones técnicas, no acredita producción y no
modifica las reglas generales de otros incrementos.

## 5. Preservaciones, exclusiones y gate residual

- Pago, Recepción y E3-01–E3-08 no cambian.
- No se generan obligaciones, ingresos, condonaciones, Pagos o Movimientos.
- No se crean asociaciones retrospectivas.
- No se modifican Documento 1/1.5. La preparación previa mantuvo Documento 5 intacto; esta
  formalización agrega allí únicamente continuidad, decisión y referencias E3-09 mediante `D5-055`.
- D5-044 se preserva y D5-045 permanece no solucionado.
- No se reabre E2-14 ni se amplía autorización por cargo/rol.
- No se modifica `public | group_only`, Persona, Membresía, Temporada o elegibilidad.
- No se implementa Caja/balance ni delegación de condonación.
- El retiro económico legacy de inscripciones/equipos de Torneo queda fuera, separado y pendiente.
  Este addendum no cierra el gate económico completo ni Etapa 3.

## 6. Integración y rollback documental

Ficha, DEC y este addendum fueron revisados e integrados conjuntamente por `D5-055`. La adopción deja
la ficha lista para implementar con autorización separada; no autoriza código, pruebas, deploy ni
acceso remoto. Un rollback documental futuro requeriría una nueva decisión y no tocaría código o
datos.

`D5-056` enmienda exclusivamente el cierre de E3-09: permite cerrar el alcance técnico local
integrado, pero mantiene UAT aprobada y retiro remoto verificado de `onMatchClose` como gates de
habilitación productiva.

Después de una implementación futura, rollback nunca puede reinterpretar o borrar datos históricos.
Rehabilitar economía legacy requeriría una decisión funcional nueva; no es un rollback técnico
automático.

## Resultado

**ADDENDUM E3-09 ADOPTADO POR D5-055 Y ENMENDADO POR D5-056 — CIERRE TÉCNICO LOCAL SEPARADO DE HABILITACIÓN PRODUCTIVA**
