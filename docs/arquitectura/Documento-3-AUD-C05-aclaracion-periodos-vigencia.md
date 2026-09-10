# SPORTEXA — Documento 3 — Arquitectura Funcional y Diseño Técnico

## Revisión AUD-C05

**Fecha:** 2026-09-09<br>
**Estado:** Aprobado<br>
**Naturaleza:** Adenda normativa de revisión controlada

> **Declaración de conservación y prevalencia.** Esta revisión AUD-C05 conserva íntegramente el cuerpo de AUD-C04. Las cláusulas identificadas en esta adenda quedan sustituidas por el texto normativo AUD-C05. Ante cualquier contradicción, prevalece esta adenda AUD-C05. El cuerpo AUD-C04 continúa, sin alteraciones, después de las páginas de esta adenda.

| Revisión | Alcance | Estado |
| --- | --- | --- |
| AUD-C04 | Documento original preservado | Sustituido únicamente en las cláusulas identificadas |
| AUD-C05 | Aclaración del ciclo de vida de Membresía | Aprobado |

## 1. Antecedente de la contradicción

AUD-C04 establece simultáneamente que Membresía es el Aggregate Root responsable del estado, las fechas y el ciclo de vida de la relación Persona–Grupo; que CU-028 reactiva la misma Membresía; que el historial previo no se elimina; y que el historial de participación no constituye una colección interna de Membresía.

Una única pareja `fechaIngreso`/`fechaEgreso` no puede representar sin pérdida una secuencia repetida `activa → finalizada → activa → finalizada`. Interpretar la prohibición de AUD-C04 como comprensiva de los intervalos propios del ciclo de vida impediría cumplir CU-028 sin destruir información o sin convertir otro módulo o un mecanismo técnico en fuente funcional de Membresía.

## 2. Decisión aprobada

Se aprueba distinguir entre:

1. los registros deportivos, económicos, administrativos o de Actividad producidos por otros conceptos, que permanecen fuera de Membresía; y
2. los **Períodos de Vigencia de Membresía**, que representan exclusivamente los intervalos activos de la propia relación Persona–Grupo y pertenecen a su ciclo de vida.

Esta decisión preserva la identidad de la misma Membresía en CU-028 y mantiene CU-029 como creación de una nueva Membresía para una nueva Temporada.

## 3. Cláusulas AUD-C04 sustituidas

En §6.3 queda sustituido el pasaje identificado literalmente por su inicio:

> “El Módulo Membresías no administra los registros históricos de Actividad; no mantiene el historial de participación como una colección propia.”

La sustitución alcanza únicamente la interpretación de “historial de participación” que impediría conservar los Períodos de Vigencia propios de Membresía. Continúan vigentes la exclusión de los registros históricos de Actividad y las restantes exclusiones de información externa establecidas en §6.3.

En §8.2 queda sustituido el pasaje identificado literalmente por su inicio:

> “El Contexto de Membresías no administra el historial de participación como una colección propia.”

La sustitución alcanza únicamente la interpretación de “historial de participación” que impediría conservar los Períodos de Vigencia propios de Membresía. Continúa vigente en §8.2 que los registros económicos, deportivos, administrativos e históricos externos permanecen bajo la responsabilidad de sus respectivos conceptos y se obtienen mediante composición.

En §8.9 queda sustituido el pasaje identificado literalmente por su inicio:

> “Del mismo modo, el historial de participación de una Persona dentro de un Grupo no constituye una colección interna de la Membresía.”

y por su continuación, que dispone que dicho historial se obtiene de la propia Membresía y de registros asociados y que la Membresía mantiene un estado actual pequeño sin incorporar registros cuyo número crece con la actividad. La sustitución alcanza únicamente la interpretación que impediría conservar los Períodos de Vigencia propios de Membresía. Continúan vigentes en §8.9 todas las exclusiones de pagos, asistencias, estadísticas, rendimiento, partidos, entrenamientos, participaciones en torneos, equipos y demás registros externos.

<div class="page-break"></div>

## 4. Texto normativo AUD-C05

### 4.1 Registros externos e historial compuesto

Los registros históricos deportivos, económicos, administrativos o de Actividad producidos por otros conceptos durante la participación de una Persona dentro de un Grupo no constituyen estado ni colección interna de Membresía.

Ese historial externo continúa obteniéndose mediante composición entre la Membresía, como referencia contextual, y la información conservada por los conceptos responsables de cada registro. La composición para consulta no transfiere ownership, reglas de negocio ni unidad de consistencia a Membresía.

En particular, no forman parte de Membresía los pagos, asistencias, estadísticas, rendimiento, partidos, entrenamientos, participaciones en torneos, equipos, Actividad ni cualquier otro registro deportivo, económico o administrativo producido fuera de su propio ciclo de vida.

### 4.2 Período de Vigencia de Membresía

Un **Período de Vigencia de Membresía** representa exclusivamente un intervalo durante el cual la relación entre una Persona y un Grupo permaneció activa.

El Período de Vigencia constituye información original del ciclo de vida de Membresía. No es Actividad, historial deportivo consolidado, auditoría técnica, log, métrica, proyección, intent, guard ni estado de coordinación.

Cada Período de Vigencia es una entidad interna subordinada al Agregado Membresía. No posee Aggregate Root, Repositorio, autorización, escritura, consulta, contrato público ni ciclo de vida independientes. Sólo puede abrirse o cerrarse mediante una operación del Aggregate Root Membresía y pertenece a la unidad de consistencia de Membresía.

Las decisiones de almacenamiento no pueden alterar esta frontera conceptual. La representación física concreta de los períodos, sus identificadores y los campos auxiliares necesarios corresponde a la definición implementable posterior y no queda fijada por esta adenda.

### 4.3 Invariantes del ciclo de vida

Membresía protege las siguientes invariantes:

- una Membresía activa posee exactamente un Período de Vigencia abierto;
- una Membresía finalizada no posee Períodos de Vigencia abiertos;
- cada reactivación válida abre un período nuevo sobre la misma Membresía;
- cada finalización válida cierra el único período abierto;
- los períodos cerrados anteriores son inmutables;
- los períodos se mantienen ordenados y no se superponen;
- una transición y su retry no pueden crear más de un período para el mismo efecto confirmado;
- la raíz, el período afectado, el resumen temporal y los guards vigentes deben quedar consistentes en una única unidad de consistencia de Membresía.

No queda determinado normativamente si un período con `inicio == fin` es válido. Esa condición deberá resolverse posteriormente como decisión física y contractual, sin inventar fechas ni alterar los intervalos confirmados.

### 4.4 Semántica temporal

- `fechaIngreso` es el instante del primer ingreso histórico de la Membresía y es inmutable.
- El inicio de la vigencia actual es el inicio del único Período de Vigencia abierto.
- `fechaEgreso` está presente únicamente cuando la Membresía está finalizada.
- Cuando está presente, `fechaEgreso` coincide con el final del último Período de Vigencia.
- Mientras la Membresía está activa, `fechaEgreso` está ausente; no se representa mediante `null`.
- Los timestamps de inicio y finalización son autoritativos del servidor.
- Las fechas del ciclo de vida no se derivan de `createdAt`, `updatedAt`, guards, intents, coordinaciones, logs ni registros de Actividad.

La raíz conserva un resumen actual pequeño. El crecimiento de Períodos de Vigencia ocurre sólo como consecuencia de transiciones del ciclo de vida de la propia Membresía y no depende del volumen de actividad deportiva, económica o administrativa de la Persona.

<div class="page-break"></div>

## 5. Aprobaciones históricas y responsabilidades

La coordinación de una aprobación de Solicitud no modifica los límites de los Agregados participantes. Las responsabilidades son:

| Concepto | Responsabilidad normativa |
| --- | --- |
| Solicitud aprobada | Fuente durable del resultado funcional de la aprobación |
| Decision intent | Identidad e idempotencia de una decisión humana concreta y conservación de su outcome |
| Coordinación | Progreso y claim de una operación en curso |
| Guards | Unicidad y coordinación vigentes |
| Membresía | Estado y Períodos de Vigencia de la relación Persona–Grupo |

La consulta de una Solicitud aprobada debe conservar el mismo resultado aunque la Membresía sea posteriormente finalizada, reactivada por otra Solicitud o modificada válidamente. Una aprobación histórica no depende de que la Membresía continúe activa ni de hashes conservados en guards vigentes.

La Solicitud puede conservar una referencia durable al efecto de Membresía confirmado para su aprobación. Esa referencia no incorpora el Período de Vigencia al Agregado Solicitud, no permite modificarlo y no transfiere a Solicitud su ownership.

Los guards no constituyen historial de aprobaciones. Los decision intents no sustituyen el resultado terminal conservado por Solicitud. La coordinación no constituye una fuente de verdad histórica una vez terminada la operación.

## 6. Carrera entre reactivación y finalización

Cuando la reactivación de Membresía confirma y CU-027 finaliza esa Membresía antes de que la Solicitud confirme su aprobación, rigen las siguientes reglas:

1. la Solicitud no se aprueba;
2. la finalización no se interpreta como éxito de la aprobación;
3. la coordinación se cierra o libera explícitamente;
4. el decision intent conserva el outcome estable `MEMBERSHIP_REACTIVATION_SUPERSEDED`;
5. un retry con la misma identidad devuelve ese mismo outcome;
6. el mismo retry no vuelve a reactivar la Membresía;
7. la Solicitud permanece pendiente;
8. una nueva reactivación requiere una nueva confirmación humana y una nueva clave de idempotencia;
9. no existe rollback que deshaga una finalización válida.

Si la aprobación de Solicitud confirma primero y CU-027 finaliza después, ambas operaciones son válidas en ese orden temporal. La aprobación refleja que la Membresía se encontraba activa al confirmar el resultado; la finalización posterior inicia un nuevo hecho válido del ciclo de vida.

## 7. Evolución normativa de representaciones

- Las nuevas Membresías adoptan la representación v3.
- Las Membresías activas v1 y las finalizadas v2 continúan siendo legibles.
- Una Membresía v1 o v2 evoluciona únicamente al ejecutar una operación autorizada de su ciclo de vida.
- No se realiza migración global ni backfill.
- No se inventan fechas a partir de metadatos o mecanismos técnicos.
- Los documentos incompatibles fallan cerrados.
- Los readers deben tolerar v1, v2 y v3 durante la transición.
- CU-027 debe poder finalizar una Membresía activa v1 o v3.
- CU-028 materializa el período inicial de una Membresía finalizada v2 usando exclusivamente sus fechas autoritativas y abre el período siguiente.
- Los retries no crean períodos adicionales.

Esta adenda no define nombres físicos definitivos de colecciones, documentos, campos, identificadores, hashes o índices. Esos detalles pertenecen a la definición implementable posterior, una vez incorporadas estas reglas.

<div class="page-break"></div>

## 8. Impacto y límites

La aclaración:

- mantiene a Membresía como único Aggregate Root de su Agregado;
- no incorpora Persona, Grupo ni Temporada dentro del Agregado Membresía;
- no crea una transacción global entre Solicitud y Membresía;
- no convierte Actividad en fuente de verdad funcional de Membresía;
- no transforma guards, intents o coordinaciones en historial funcional;
- mantiene CU-028 como reactivación de la misma Membresía;
- mantiene CU-029 como nueva Membresía para una nueva Temporada;
- no incorpora historial deportivo, económico o administrativo a Membresía;
- no autoriza una migración global.

## 9. Regla de prevalencia

> **Esta revisión AUD-C05 conserva el cuerpo de AUD-C04, excepto las cláusulas expresamente sustituidas en esta adenda. Ante cualquier contradicción sobre el ciclo de vida de Membresía, sus Períodos de Vigencia o el significado de “historial de participación”, prevalece la presente aclaración AUD-C05.**

## 10. Trazabilidad

| Referencia | Efecto de AUD-C05 |
| --- | --- |
| CU-027 — Finalizar una Membresía | Cierra el único Período de Vigencia abierto; soporta activa v1 o v3; el retry no duplica el cierre |
| CU-028 — Reactivar una Membresía | Conserva la identidad y abre un nuevo Período de Vigencia sólo en una Temporada abierta |
| CU-029 — Renovar una Membresía | Continúa creando una nueva Membresía para una nueva Temporada; no se confunde con reactivación |
| Aprobación de Solicitud cuando requiere CU-028 | Conserva el resultado histórico en Solicitud y su decision intent; coordina la reactivación sin transferir la fuente de verdad de Membresía |

---

**Continuidad documental:** a partir de la página siguiente continúa el cuerpo completo de **Documento 3 — Arquitectura Funcional y Diseño Técnico — AUD-C04**, preservado sin alteraciones. Únicamente las cláusulas identificadas en esta adenda quedan sustituidas con el alcance indicado.
