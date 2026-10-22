# DEC-E3-09 — Retiro de economía legacy de partidos sociales sin reemplazo

## Estado

- **Decisiones funcionales aprobadas:** `E3-09-D01=A`, `D02=A`, `D03=A`.
- **Aprobación funcional:** recibida por instrucción expresa.
- **Estado documental:** `ADOPTADA POR D5-055`.
- **Estado del incremento:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Documento 5:** continuidad y decisión E3-09 integradas por `D5-055`.
- **Base comprobada:** rama `dev`, HEAD
  `7b7cac9671d1f18f533a1382feed85a2498e06fd`, sin `fetch` ni operaciones Git de escritura.

Paquete relacionado: [ficha E3-09](./E3-09-ficha-retiro-autoridad-economica-participaciones-partidos-sociales.md)
y [addendum a Documentos 2/3/4](../../arquitectura/Documento-2-3-4-addendum-E3-09-retiro-economia-legacy-partidos-sociales.md).

Esta DEC registra las decisiones aprobadas y queda adoptada por `D5-055` luego de la revisión
conjunta del paquete. No autoriza código, pruebas, Emulator, Rules, índices, configuración,
dependencias, Firebase remoto o deploy.

## 1. Contexto

El repositorio mantiene economía legacy dentro de `participations.pagoEstado` para partidos
sociales. El campo se inicializa al inscribirse, puede mutarse por callable administrativo, recibe
`pospuesto` desde reemplazos posteriores al deadline, se presenta y edita en la UI y condiciona
cierre manual y automático.

Ese campo no contiene importe, moneda, concepto, obligación, aplicación ni evidencia de ingreso.
E3-01–E3-08 ya asignan esas responsabilidades a Pago y Recepción, pero no existe una regla aprobada
que obligue a crear un Pago por cada participación social. Convertir valores legacy en Pagos o
ingresos inventaría hechos.

## 2. Decisiones aprobadas

### 2.1 E3-09-D01=A — Retiro sin reemplazo económico

Se retira por completo la funcionalidad económica de partidos sociales sin construir una relación
Partido/Participación–Pago.

Consecuencias obligatorias:

1. Participación queda exclusivamente deportiva.
2. Nuevas Participaciones no escriben `pagoEstado`.
3. Ninguna superficie muestra, edita o decide economía desde el campo.
4. No se crean Pago, concepto, ocurrencia, obligación, ingreso, Recepción, Movimiento o balance.
5. No se infieren Persona, Membresía, Temporada, importe o intención histórica.
6. Los campos existentes permanecen físicamente intactos e inertes.

Las propuestas previas de E3-09 sobre referencias canónicas, Temporada, elegibilidad, unicidad y
generación Pago–Participación quedan **descartadas para este incremento y no aprobadas**.

### 2.2 E3-09-D02=A — Cierre explícito y sólo deportivo

Se conserva el lifecycle actual `abierto -> verificando -> cerrado`, `matchId` requerido, existencia
del Partido, autenticación, autorizaciones administrativas/contextuales del comando y la reapertura
permitida desde `verificando`. La transición final deja de consultar `pagoEstado` y
conserva las condiciones deportivas efectivas ya comprobadas en el automatismo legacy: no actúa con
`match.lock === true` y exige:

```text
titulares actuales >= sum(posicionesObjetivo)
```

No se agrega un gate de suplentes: el código legacy calcula `cantidadSuplentes`, pero no la utiliza
para decidir cierre. Tampoco se agregan Persona, Membresía, Temporada, elegibilidad o reglas nuevas.

El trigger `onMatchClose`, cuyo disparador y decisión son económicos, se retira del código y del
export versionados. Como omitir un export no elimina una Cloud Function ya desplegada, un rollout
futuro autorizado debe eliminarla o deshabilitarla explícitamente en el ambiente alcanzado y
verificar su ausencia. El cierre final queda a cargo del callable deportivo explícito. `onMatchStart` continúa: al horario, `abierto |
verificando` se cancela y `cerrado` continúa su procesamiento deportivo a `jugado`.

### 2.3 E3-09-D03=A — Tombstone estable de `updatePagoEstado`

`updatePagoEstado` conserva temporalmente su export para compatibilidad, pero pierde toda capacidad
de escritura:

1. conserva el orden vigente: autenticación, campos requeridos, autorización administrativa/
   contextual y validación del catálogo `confirmado | pendiente | pospuesto`;
2. inputs inválidos y actores no autenticados/no autorizados conservan sus rechazos y no reciben
   información adicional;
3. para una invocación válida y autorizada responde siempre:

```text
Firebase code: failed-precondition
message: La gestión económica de partidos sociales fue retirada
details.code: SOCIAL_MATCH_PAYMENT_RETIRED
```

4. nunca devuelve `{ ok: true }` ni otro resultado de éxito;
5. no muta Participación, Partido ni raíces económicas y no dispara automatismos;
6. lecturas indispensables para conservar autorización son read-only y mínimas;
7. una desexportación futura requiere decisión separada y revisión focal de consumidores.

D5-044 no protege este callable. El tombstone se adopta por compatibilidad y no modifica las
superficies que D5-044 sí protege.

## 3. Retiro completo de autoridad

El resultado sólo se alcanza si se retiran conjuntamente:

| Clase | Superficies alcanzadas |
|---|---|
| writers | inicialización de `joinMatch`, `adminMatchService.actualizarPago`, rama económica de `replacementService`; |
| callable | implementación exitosa de `updatePagoEstado`, sustituida por tombstone; |
| automatismo | `onMatchClose`, su código/export versionado y, durante un rollout futuro autorizado, eliminación o deshabilitación remota explícita; |
| consumers backend | gate de `adminMatchService.cerrarMatch`; |
| consumers frontend | cálculo de pendientes, bloqueo de cierre, modal, callable, columnas, pills, estilos, iconos, etiquetas y mensajes; |

Quitar sólo la UI no retira autoridad. Conservar un writer no alcanzable tampoco es aceptable porque
mantiene capacidad latente y contradice el criterio verificable de cero writers productivos.

## 4. Reemplazos y reglas deportivas preservadas

`replacementService` conserva selección de suplente compatible, promoción, posición, lock y
recalculo de ranking. Sólo desaparece `postDeadline -> pagoEstado: "pospuesto"`.

Alta, salida, eliminación/reincorporación, ranking, cupos, equipos, cancelación, estados, resultado y
estadísticas conservan sus contratos actuales salvo la extracción económica y el traslado de `lock`
y del mínimo de titulares al cierre explícito. No se rediseña el Partido.

## 5. Historia y compatibilidad

- No hay delete, backfill, normalización o reescritura de `pagoEstado` histórico.
- `confirmado`, `pendiente` y `pospuesto` no se traducen ni se exponen.
- Esos valores no prueban Pago, deuda, ingreso, condonación o diferimiento.
- Readers deportivos toleran documentos con o sin campo y producen la misma decisión bajo igual
  estado/roster.
- Partidos `cerrado | jugado | cancelado` permanecen terminales y no se reabren o recierran.
- Partidos operables continúan mediante reglas deportivas, sin resolución económica previa.

## 6. Pruebas exigidas para una implementación futura

Sin ejecutarlas ni crearlas en este paquete, la evidencia mínima deberá cubrir:

1. `joinMatch` válido, duplicado, concurrente y reintentado nunca crea `pagoEstado`.
2. reemplazo antes/después del deadline no lee o escribe el campo, conserva promoción/posición/lock y
   no dispara cierre;
3. reincorporación y ranking no crean, restauran ni consumen estado económico;
4. cierre ignora documentos históricos `confirmado | pendiente | pospuesto` y documentos sin campo,
   conserva autorización/estado, rechaza lock activo o titulares insuficientes y acepta el mínimo
   suficiente con lock inactivo;
5. no existe cierre automático por actualizaciones de Participación;
6. UI no contiene columnas, modal, controles, mensajes, estilos o props económicos;
7. tombstone conserva rechazos de input/autenticación/autorización; el actor autorizado recibe
   exactamente `failed-precondition` + `SOCIAL_MATCH_PAYMENT_RETIRED`, nunca éxito;
8. snapshots antes/después demuestran cero mutaciones en Participación por tombstone y cero creación/
   asociación en `payments`, Recepciones, aplicaciones o movimientos durante altas, reemplazos,
   ranking y cierres;
9. búsqueda estructural demuestra cero writers/readers productivos de `pagoEstado`, permitiendo sólo
   fixtures históricos o aserciones negativas identificadas;
10. UAT comprueba que el Partido conserva sus acciones deportivas y no presenta economía.
11. el código/export de `onMatchClose` queda ausente y el procedimiento de rollout exige eliminar o
    deshabilitar y verificar la función remota, sin asumir que la omisión del export la elimina.

Auth/UAT real permanece aislada. Las pruebas futuras no convierten estados legacy en fixtures
económicas canónicas.

## 7. Exclusiones y gates residuales

- Pago y Recepción no cambian.
- No existe generación o asociación económica retroactiva.
- La preparación previa no modificaba Documento 5; esta adopción integra sólo continuidad, decisión
  y referencias E3-09 mediante `D5-055`.
- D5-044 se preserva; D5-045 permanece no solucionado.
- No se reabre E2-14.
- No se implementa Caja, balance ni delegación de condonación.
- El retiro de autoridad económica en inscripciones/equipos de Torneo permanece separado,
  obligatorio y pendiente. E3-09 no cierra ese gate.
- E3-09 no cierra Etapa 3.

## 8. Integración documental

La revisión conjunta de ficha, DEC y addendum no encontró contradicción sustantiva con las fuentes
vigentes ni con D01=A, D02=A y D03=A. `D5-055` adopta el paquete. Esta integración no autoriza
código, pruebas, despliegue ni acceso remoto.

## Resultado

**DEC-E3-09 ADOPTADA POR D5-055 — IMPLEMENTACIÓN REQUIERE AUTORIZACIÓN SEPARADA**
