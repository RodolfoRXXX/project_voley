# E3-09 — Retiro de funcionalidad económica legacy de partidos sociales

> Estado: **LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA**
>
> Alcance adoptado: retirar `participations.pagoEstado` como autoridad y funcionalidad, sin
> construir un reemplazo vinculado a Pago.
>
> Esta ficha no autoriza implementación, ejecución de pruebas, configuración, Firebase remoto ni
> deploy.

Paquete documental adoptado por `D5-055`: [DEC-E3-09](./DEC-E3-09-retiro-economia-legacy-partidos-sociales.md)
y [addendum conjunto a Documentos 2/3/4](../../arquitectura/Documento-2-3-4-addendum-E3-09-retiro-economia-legacy-partidos-sociales.md).
La separación entre cierre técnico local y habilitación productiva queda enmendada por `D5-056`.
La preparación anterior mantuvo Documento 5 intacto; la formalización ahora autorizada integra allí
la continuidad y decisión de E3-09, sin autorizar implementación.

## 1. Cambio de orientación

E3-09 mantiene como objetivo el retiro de autoridad económica legacy en participaciones de partidos
sociales, pero cambia el resultado propuesto: el flujo social queda **sin funcionalidad económica**.
No se crean conceptos, ocurrencias, Pagos, obligaciones, ingresos, movimientos, balance ni
correlaciones con Persona, Membresía o Temporada.

Las propuestas anteriores de esta misma ficha sobre referencias canónicas, Temporada, elegibilidad,
unicidad Pago–Participación, generación económica y resolución económica de cierre **no fueron
aprobadas y quedan retiradas del alcance recomendado**. Podrán evaluarse en otro momento sólo con
una nueva decisión y sin considerar E3-09 como autorización implícita. No se reserva otro incremento
ni se presupone completar E4.

## 2. Fuentes y límites vigentes

### 2.1 Normativa vigente

1. Pago es la autoridad económica canónica de E3-01–E3-08. Una Participación no debe atribuirse
   saldo, ingreso, condonación ni estado de Pago.
2. El gate económico legacy de participaciones e inscripciones/equipos continúa siendo obligatorio,
   pero no existe una obligación normativa identificada de reemplazar cada estado legacy por un Pago.
3. E3-08 cubre consulta de movimientos de ingresos registrados; no demuestra Caja o balance general
   ni convierte estados de Partido en ingresos.
4. [D5-044](../etapa-2/E2-14-propuesta-retiro-compatibilidad-residual.md) y sus superficies protegidas
   se preservan. `updatePagoEstado` no integra ese conjunto protegido; aun así, retirar autoridad y
   retirar un contrato callable son decisiones distintas.
5. D5-045 no solucionado, Auth/UAT aislada, baseline y el gate económico de inscripciones/equipos de
   Torneo permanecen sin cambios. E2-14 no se reabre por rutina.

### 2.2 Comportamiento comprobado en el repositorio

La búsqueda focal de `pagoEstado` fuera de documentación encuentra exactamente estas superficies
productivas sociales:

| Superficie | Comportamiento comprobado |
|---|---|
| `callables/joinMatch.js` | crea cada Participación con `pagoEstado: "pendiente"`; |
| `callables/updatePagoEstado.js` | callable autenticado/admin que delega la mutación; |
| `adminMatchService.actualizarPago` | acepta `confirmado | pendiente | pospuesto` y escribe directamente la Participación; |
| `replacementService.reemplazarTitular` | cuando `postDeadline`, promueve al suplente y escribe `pagoEstado: "pospuesto"`; |
| `adminMatchService.cerrarMatch` | impide `verificando -> cerrado` si algún titular no está `confirmado | pospuesto`; |
| `onMatchClose` | reacciona sólo a cambios de `pagoEstado`; si no hay pendientes y se completa el mínimo de titulares, cierra automáticamente el Partido; |
| página protegida de Partido | calcula pendientes, presenta estados, abre el modal, invoca `updatePagoEstado`, muestra aviso y deshabilita “Confirmar cierre”; |
| `pagoModal` | presenta “Estado de pago” y permite cambiar entre los tres estados legacy; |
| `MatchActions` | recibe `hayPagosPendientes` y bloquea el cierre desde UI. |

Las demás coincidencias son fixtures o aserciones de caracterización/arquitectura. Las superficies de
Torneo con pagos propios no usan este campo y quedan fuera de E3-09.

### 2.3 Dirección aprobada e integrada normativamente

Se aprobaron E3-09-D01=A, D02=A y D03=A: retirar todas las escrituras y decisiones productivas
basadas en `pagoEstado`, conservar el dato
histórico sin interpretarlo y dejar los partidos sociales sin economía. El cierre seguirá siendo una
operación deportiva explícita con sus reglas independientes mínimas; no consultará Pago ni estado
legacy. La integración documental por `D5-055` deja la ficha lista, pero no autoriza implementación.

## 3. Corte vertical adoptado

El corte mínimo coherente comprende simultáneamente cuatro resultados:

1. **Limpieza visual:** quitar toda presentación y edición económica de la pantalla de Partido.
2. **Retiro efectivo de autoridad:** impedir nuevas escrituras de `pagoEstado` y eliminar todos sus
   consumidores productivos.
3. **Preservación deportiva:** mantener participación, ranking, titulares/suplentes, reemplazo,
   cupos, equipos, estados, cancelación, cierre, resultado y estadísticas sin introducir reglas de
   Persona, Membresía o Temporada.
4. **Compatibilidad histórica:** dejar campos existentes físicamente intactos pero inertes; no
   migrarlos, normalizarlos, mostrarlos ni traducirlos.

Los cuatro forman un solo corte. Entregar sólo el punto 1 ocultaría la autoridad backend; entregar
sólo el punto 2 dejaría mensajes falsos y una UI bloqueada.

## 4. Alcance visual

### 4.1 Retirar

De la página de detalle de Partido y componentes usados por ella:

- columnas “Pago” de titulares, suplentes y eliminados;
- pills, colores e iconos `$`, `✓` y `⏱` derivados de `confirmado | pendiente | pospuesto`;
- etiquetas “Confirmado”, “Pendiente” y “Pospuesto” cuando describen economía;
- modal “Estado de pago”, subtítulo “Gestión administrativa del jugador”, estado actual y botones
  para cambiarlo;
- cálculo `titularesConPagoPendiente` / `hayPagosPendientes`;
- mensaje “Todos los titulares deben tener un pago confirmado o pospuesto para cerrar el partido”;
- bloqueo del botón “Confirmar cierre” por ese cálculo;
- invocación frontend de `updatePagoEstado`, estado `pagoModal`, estilos y props asociados.

### 4.2 Conservar

- nombre, avatar, ranking, posición, puntaje y estado deportivo de cada participante;
- acciones de unirse/salir, eliminar/reincorporar, promover/reemplazar, cerrar/reabrir/cancelar y ver
  equipos, sujetas a sus contratos deportivos existentes;
- mensajes de cupos, estado del Partido, errores deportivos y confirmaciones no económicas.

La limpieza visual no prueba el retiro. La aceptación exige además §5 y §6.

## 5. Writers y automatismos a retirar

| Writer/automatismo | Tratamiento adoptado | Efecto |
|---|---|---|
| inicialización en `joinMatch` | dejar de escribir el campo en nuevas Participaciones | un alta deportiva no crea un pseudoestado económico; |
| `adminMatchService.actualizarPago` | retirar la operación alcanzable y su mutación | ninguna capa interna conserva un writer latente; |
| `updatePagoEstado` | conservar como tombstone estable según D03=A | nunca devuelve éxito ni confirma Pago, ingreso o disposición; |
| rama `postDeadline` de `replacementService` | retirar únicamente la asignación `pagoEstado = "pospuesto"` | la promoción, posición, lock y ranking continúan; el reemplazo deja de producir significado económico; |
| `onMatchClose` | retirar el trigger y su export del código versionado; exigir además su eliminación explícita del entorno remoto en un despliegue futuro autorizado | cambiar un dato histórico ya no ejecuta ni reintenta cierre; el cierre queda explícito. |

No se propone doble escritura, evento sustituto, colección paralela ni reacción desde Pago.
Quitar el export local no elimina por sí solo una Cloud Function ya desplegada. La implementación
futura no satisface el retiro operativo hasta eliminar o deshabilitar expresamente `onMatchClose` en
el ambiente alcanzado y verificar su ausencia; esta formalización no ejecuta deploy ni acceso remoto.

## 6. Gates de cierre y reemplazo

### 6.1 Cierre manual

Actualmente `cerrarMatch` conserva el flujo `abierto -> verificando -> cerrado`, pero en el segundo
paso sólo controla `pagoEstado`. Si se elimina ese control sin más, el cierre manual puede confirmar
un roster con menos titulares que `sum(posicionesObjetivo)`. El automatismo `onMatchClose` sí contiene
esa comprobación deportiva.

El mínimo seguro adoptado es:

1. conservar `matchId` requerido, existencia del Partido, autenticación, autorizaciones
   administrativas/contextuales y estados actuales de cierre/reapertura;
2. en `verificando -> cerrado`, comprobar exclusivamente que la cantidad de titulares sea al menos
   `sum(posicionesObjetivo)`;
3. no ejecutar la transición final mientras `match.lock === true`, preservando el gate deportivo
   efectivo de `onMatchClose`;
4. no exigir ni inventar una cantidad de suplentes: `onMatchClose` calcula `cantidadSuplentes` pero
   no la usa como gate y no hay decisión vigente que permita incorporarla ahora;
5. retirar el cierre automático disparado por `pagoEstado`; el administrador confirma mediante el
   callable deportivo existente;
6. conservar `onMatchStart`: un Partido `abierto | verificando` al horario se cancela y uno
   correctamente `cerrado` sigue su procesamiento deportivo a `jugado`.

Esto traslada una condición deportiva ya existente al único camino de cierre que permanece; no
diseña un nuevo lifecycle ni agrega elegibilidad canónica.

### 6.2 Reemplazo

El reemplazo conserva selección de suplente, promoción a titular, posición liberada, lock y posterior
ranking. Sólo desaparece el efecto `postDeadline -> pagoEstado: "pospuesto"`. En consecuencia:

- un reemplazo posterior al deadline no crea excepción, deuda ni permiso económico;
- no dispara `onMatchClose`;
- si el Partido está `verificando`, el administrador vuelve a confirmar el cierre explícitamente;
- ausencia de suplente compatible mantiene su comportamiento deportivo actual.

## 7. Efecto funcional visible

| Antes | Después del corte recomendado |
|---|---|
| Admin marca “pago” confirmado/pendiente/pospuesto | no existe acción económica en Partido; |
| Participantes ven un estado aparente de pago | ven sólo información deportiva; |
| Pago pendiente bloquea cierre | el cierre depende sólo de estado/autorización, lock y mínimo de titulares; |
| Cambiar el estado puede cerrar automáticamente | el cierre final es explícito; |
| reemplazo tardío escribe “pospuesto” | el reemplazo sólo cambia el roster; |
| nueva Participación nace con estado económico | nace únicamente con datos deportivos actuales; |

El corte no afirma que el Partido sea gratuito, pagado o condonado. Afirma únicamente que esta
aplicación deja de representar economía social mediante Participación. Una futura funcionalidad de
cobro requerirá definición y autorización propias.

## 8. Historia y compatibilidad de datos

1. No se borran ni reescriben campos `pagoEstado` existentes.
2. `confirmado` no prueba ingreso; `pospuesto` no prueba deuda diferida; `pendiente` no prueba una
   obligación. Ninguno origina Pago, Recepción, Movimiento o balance.
3. Nuevas Participaciones omiten el campo. Readers deportivos deben tolerar tanto documentos
   históricos con el campo como documentos nuevos sin él, sin exponerlo ni bifurcar decisiones.
4. Partidos `cerrado | jugado | cancelado` permanecen terminales. No se reabren, recierran,
   recalculan ni normalizan por E3-09.
5. Partidos `abierto | verificando` conservan roster y estado. Su siguiente operación usa sólo reglas
   deportivas; no requiere resolver los valores históricos.
6. Fixtures o pruebas históricas pueden conservar el campo cuando prueben compatibilidad de lectura,
   pero no como expectativa de autoridad productiva.

No hace falta conocer Persona, Membresía, Temporada, importe o supuesta intención histórica para
retirar esta autoridad.

## 9. Callable y D5-044

La evidencia versionada de D5-044 protege seis tombstones de administración de Grupo, ocho rutas HTTP
y dos GET públicos; `updatePagoEstado` no está incluido. E3-09 no modifica ninguna superficie
protegida.

D03=A aprueba mantener `updatePagoEstado` exportado como tombstone estable:

1. conserva el nombre del callable y el orden vigente de autenticación, campos requeridos,
   autorización administrativa/contextual y catálogo `confirmado | pendiente | pospuesto`;
2. input inválido, actor no autenticado o actor no autorizado conserva su rechazo previo y no obtiene
   información nueva;
3. una invocación formalmente válida y autorizada termina siempre con Firebase
   `failed-precondition`, mensaje estable `La gestión económica de partidos sociales fue retirada` y
   detalle `{ code: "SOCIAL_MATCH_PAYMENT_RETIRED" }`;
4. nunca devuelve `{ ok: true }`, estado alternativo de éxito ni dato económico;
5. no escribe Participación, Partido, Pago, Recepción, Movimiento ni otro documento, y no dispara
   cierre/reemplazo/automatismo;
6. cualquier lectura indispensable para conservar la autorización previa es read-only y minimizada;
7. permanece hasta una decisión posterior de desexportación con revisión focal de consumidores. Esa
   decisión no requiere reabrir E2-14 ni afecta D5-044.

## 10. Exclusiones

- crear o vincular Pago, concepto, ocurrencia, obligación, ingreso, Movimiento, Caja o balance;
- inferir o persistir Persona, Membresía, Temporada o referencias económicas en Partido/
  Participación;
- cambiar `public | group_only`, elegibilidad, cupos, ranking, formación, lifecycle o autorización
  deportiva salvo preservar el lock y el mínimo de titulares ya comprobados para el cierre final;
- invitados externos, inscripción canónica nueva o rediseño de partidos;
- borrar/backfillear datos, traducir estados legacy o fabricar historia económica;
- modificar pagos de Torneo, inscripciones/equipos, reglas, índices, Firebase remoto o D5-044;
- resolver D5-045, delegación de condonación, Caja/balance o completar E4.

## 11. Dependencias y bloqueos concretos

### Sin bloqueo para el retiro de autoridad

- Pago canónico no necesita adoptar estas participaciones porque el resultado elegido es ausencia de
  funcionalidad económica social.
- Los documentos históricos pueden permanecer: ignorar un campo no exige migrarlo.
- El frontend y backend versionados enumeran todos los consumidores productivos del campo.

### Decisiones resueltas e integración documental

- D02=A conserva estado, autorización, lock y mínimo de titulares en el cierre explícito; no agrega
  condición de suplentes.
- D03=A conserva el callable como tombstone bajo el contrato exacto de §9.
- No hay otro bloqueo que justifique diseñar Pago, identidad o Temporada.
- La revisión conjunta no encontró contradicción sustantiva; ficha, DEC, addendum y continuidad de
  Documento 5 quedan integrados por `D5-055`.
- La implementación, sus pruebas y el despliegue —incluida la eliminación remota explícita de
  `onMatchClose`— requieren autorización separada.

## 12. Decisiones aprobadas

Las tres decisiones fueron aprobadas por instrucción expresa. Esta sección registra la aprobación;
queda integrada normativamente por `D5-055`; no equivale a autorización de implementación.

### E3-09-D01 — Resultado funcional

- **A:** retirar la funcionalidad económica social sin reemplazo; Participación queda exclusivamente
  deportiva y los campos históricos quedan inertes.
- **B:** conservar temporalmente `pagoEstado` hasta diseñar un reemplazo Pago–Participación.
- **Decisión:** **A aprobada**. Cumple el gate de autoridad con menor alcance y no fabrica una
  obligación de producto inexistente. B queda descartada, no diferida como requisito de E3-09.

### E3-09-D02 — Cierre después del retiro

- **A:** cierre explícito `verificando -> cerrado`, sin economía, conservando autorización, lock y,
  como único gate de roster, el mínimo de titulares ya presente en `onMatchClose`.
- **B:** eliminar tanto el gate económico como el mínimo de titulares.
- **C:** crear un nuevo automatismo deportivo de cierre.
- **Decisión:** **A aprobada**. Preserva el comportamiento deportivo independiente sin inventar
  estados, suplentes obligatorios, eventos o coordinación nueva. B y C quedan descartadas.

### E3-09-D03 — Compatibilidad de `updatePagoEstado`

- **A:** mantener export temporal como rechazo estable, autenticado y sin efectos.
- **B:** desexportarlo en el mismo corte.
- **Decisión:** **A aprobada**, con el contrato exacto de §9. B queda descartada para este corte. El
  criterio de salida es una decisión posterior de desexportación con revisión focal de consumidores;
  ninguna etapa del tombstone conserva un writer real.

## 13. Aceptación futura del corte

La aceptación se divide, exclusivamente para E3-09, en dos gates independientes:

- **cierre técnico local:** exige evidencia de repositorio para los criterios 1 a 14 y para el retiro
  local de código/export del criterio 15;
- **habilitación productiva:** exige además UAT humana ejecutada y aprobada, eliminación o
  deshabilitación remota de `onMatchClose` durante un rollout autorizado y verificación de su
  ausencia operativa.

El cierre técnico local no acredita producción, no aprueba UAT y no permite inferir el estado del
entorno desplegado. Esta separación fue aprobada por `D5-056` y no modifica las reglas generales de
otros incrementos.

1. cero UI, mensajes o acciones económicas en partidos sociales;
2. cero writers productivos de `participations.pagoEstado`;
3. cero decisiones de cierre, reemplazo o automatismos basadas en el campo;
4. cierre explícito con estado, autorización, lock y mínimo de titulares aprobados en D02;
5. documentos históricos intactos e ignorados y nuevas Participaciones sin el campo;
6. `updatePagoEstado` aplica autenticación/autorización previas y, para actor autorizado, devuelve
   siempre el error exacto de §9, nunca éxito, con cero mutaciones;
7. ninguna creación de Pago, ingreso, Movimiento o correlación retroactiva;
8. alta mediante `joinMatch` no crea `pagoEstado`, incluso ante reintento o concurrencia;
9. reemplazo antes/después del deadline, reincorporación y ranking no leen ni escriben el campo y
   conservan sus efectos deportivos;
10. cierre `abierto -> verificando -> cerrado` no lee el campo, preserva autorización y estados,
    rechaza el paso final con lock activo, exige el mínimo de titulares, no exige suplentes y no se
    dispara por mutaciones de Participación;
11. documentos históricos con cualquiera de los tres valores y documentos nuevos sin campo producen
    el mismo resultado deportivo bajo igual roster/estado;
12. snapshots antes/después de altas, reemplazos, ranking, cierres y tombstone demuestran cero cambios
    en `payments`, Recepciones, aplicaciones, movimientos y demás raíces económicas;
13. una búsqueda estructural limita `pagoEstado` a compatibilidad histórica/test y prohíbe usos
    productivos; UI no conserva imports, textos, estilos o props económicos;
14. D5-044, D5-045, Auth/UAT aislada, baseline y el gate residual de Torneo quedan preservados.
15. para cierre técnico local, el código/export versionado de `onMatchClose` está retirado; para
    habilitación productiva, el rollout autorizado elimina o deshabilita explícitamente la función
    remota ya desplegada y verifica su ausencia operativa. No se considera suficiente omitir el
    export.

Pruebas técnicas mínimas: unitarias de dominio/servicio, arquitectura por búsqueda/imports y Emulator
para altas/reemplazos/ranking/cierre/tombstone. La UAT visual de Partido sin economía permanece
obligatoria antes de habilitar o rehabilitar el recorrido de partidos sociales a usuarios; puede
seguir diferida y no aprobada al cerrar sólo el alcance técnico local. Las pruebas deben incluir
errores de autenticación/autorización del tombstone, actor autorizado, campos históricos presentes/
ausentes, cierre con titulares insuficientes/suficientes y reemplazo post-deadline.

Esta ficha no convierte la UAT diferida en aprobada, no acredita retiro remoto y no cierra Etapa 3.

El retiro residual de autoridad económica en inscripciones/equipos de Torneo permanece separado y
obligatorio. E3-09 no lo implementa, no lo redefine y no cierra el gate económico completo ni Etapa 3.

**E3-09 CERRADO EN SU ALCANCE TÉCNICO LOCAL — HABILITACIÓN PRODUCTIVA PENDIENTE — E3-10 HABILITADO ÚNICAMENTE PARA DEFINICIÓN**
