# SPORTEXA — Documento 4 — Diseño de la Arquitectura de Software

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

AUD-C04 exige que las pruebas mantengan fuera de Membresía el historial deportivo, económico o de participación y que ese historial se obtenga por composición. Aplicada sin distinguir el origen de la información, esa regla también excluiría los intervalos mínimos del ciclo de vida que el Aggregate Root debe preservar para representar reactivaciones repetidas de la misma Membresía.

La arquitectura necesita distinguir los registros externos de participación de los Períodos de Vigencia propios de la relación Persona–Grupo. Sin esa distinción no es posible probar de manera determinista CU-028 repetido ni conservar a Membresía como fuente de verdad de su propio ciclo de vida.

## 2. Decisión aprobada

Los Períodos de Vigencia pertenecen exclusivamente al ciclo de vida de Membresía. Son entidades internas subordinadas, modificables sólo mediante el Aggregate Root Membresía y dentro de su unidad de consistencia. No son Actividad, auditoría, coordinación ni historial externo.

Los registros deportivos, económicos, administrativos y de Actividad producidos por otros conceptos continúan fuera de Membresía y se consultan mediante composición.

## 3. Cláusulas AUD-C04 sustituidas

En §10.2, bajo “Persistencia específica de Membresía”, queda sustituido el pasaje identificado literalmente por su inicio:

> “El historial de participación no constituye una colección interna persistida dentro de Membresía.”

La sustitución alcanza únicamente la interpretación que impediría persistir los Períodos de Vigencia propios de Membresía. Continúan vigentes en §10.2 la exclusión de pagos, asistencias, estadísticas, rendimiento, partidos, entrenamientos, participaciones en torneos, equipos, Actividad y demás registros externos, así como su obtención mediante composición.

En §13.1 queda sustituida la cláusula identificada literalmente como:

> “el historial deportivo, económico o de participación no constituye una colección interna de Membresía;”

La sustitución alcanza únicamente el componente “de participación” cuando pudiera interpretarse como exclusión de los Períodos de Vigencia propios de Membresía. Continúan vigentes en §13.1 las exclusiones del historial deportivo, económico, administrativo, de Actividad y demás información externa.

En §13.5 queda sustituida la cláusula identificada literalmente como:

> “el historial de participación se obtiene mediante composición de información y no mediante una colección persistida dentro de Membresía;”

La sustitución alcanza únicamente la interpretación que impediría conservar los Períodos de Vigencia propios de Membresía. Continúa vigente en §13.5 que el historial deportivo, económico, administrativo, de Actividad y demás información externa se obtiene por composición y permanece fuera de Membresía.

<div class="page-break"></div>

## 4. Texto normativo AUD-C05 para §13.1 — Pruebas de dominio

Las pruebas del Agregado Membresía deberán demostrar que:

- los registros históricos deportivos, económicos, administrativos o de Actividad producidos por otros conceptos no forman parte del estado interno de Membresía;
- un Período de Vigencia representa exclusivamente un intervalo activo de la relación Persona–Grupo;
- cada Período de Vigencia constituye información original del ciclo de vida de Membresía;
- los Períodos de Vigencia son entidades internas subordinadas y sólo cambian mediante el Aggregate Root Membresía;
- una Membresía activa tiene exactamente un Período de Vigencia abierto;
- una Membresía finalizada no tiene Períodos de Vigencia abiertos;
- reactivar abre un período nuevo sin alterar los períodos anteriores;
- finalizar cierra el único período abierto;
- los períodos cerrados anteriores son inmutables;
- los períodos están ordenados y no se superponen;
- raíz, período afectado, resumen temporal y guards vigentes se confirman en una única unidad de consistencia de Membresía;
- un mismo efecto o retry no crea períodos adicionales;
- los períodos no constituyen Actividad, auditoría técnica, logs, métricas, proyecciones, intents, guards ni coordinación;
- los períodos no poseen Aggregate Root, Repositorio, autorización, escritura, consulta, contrato público ni superficie pública independientes;
- el historial externo continúa fuera de Membresía y se obtiene por composición desde los módulos responsables.

Las pruebas no deben imponer una representación física específica mientras puedan verificar estas invariantes y los límites del Agregado. No queda determinado normativamente si `inicio == fin` es válido; deberá resolverse explícitamente en la definición implementable posterior como decisión física y contractual.

### 4.1 Semántica temporal comprobable

Las pruebas deberán verificar además que:

- `fechaIngreso` coincide con el inicio del primer período y permanece inmutable;
- el inicio vigente coincide con el inicio del único período abierto;
- `fechaEgreso` está presente sólo cuando la Membresía está finalizada;
- `fechaEgreso` coincide con el final del último período;
- mientras una Membresía está activa, `fechaEgreso` está ausente; no se incluye ni siquiera con valor `null`;
- los timestamps son autoritativos del servidor;
- ninguna fecha se deriva de `createdAt`, `updatedAt`, guards, intents, coordinaciones, logs o Actividad;
- la raíz conserva un resumen actual pequeño;
- el número de períodos sólo crece por transiciones de ciclo de vida, no por actividad deportiva, económica o administrativa.

## 5. Texto normativo AUD-C05 para §13.5 — Pruebas arquitectónicas

Las pruebas arquitectónicas deberán demostrar que:

- el historial deportivo, económico, administrativo y de Actividad asociado a una participación se obtiene mediante composición y no se persiste dentro del Agregado Membresía;
- la cronología del ciclo de vida propio de la relación Persona–Grupo se obtiene de sus Períodos de Vigencia internos;
- ninguna capa o módulo puede modificar un Período de Vigencia sin invocar una operación del Aggregate Root Membresía;
- los Períodos de Vigencia no poseen Repositorio ni superficie pública independientes;
- ningún mecanismo transforma los períodos en Actividad, auditoría técnica o coordinación;
- ninguna consulta histórica externa amplía la frontera de Membresía;
- ninguna decisión de persistencia separa el cambio de la raíz, el período afectado, el resumen temporal y los guards vigentes en unidades de consistencia diferentes;
- Solicitud y Membresía permanecen como Agregados y transacciones separados;
- la coordinación entre ambos no crea un Aggregate Root, Repositorio o fuente de verdad común.

La representación física concreta puede optimizar crecimiento y consultas siempre que preserve estas reglas. Esta adenda no fija nombres definitivos de colecciones, documentos, campos, hashes, índices ni identificadores.

## 6. Aprobaciones históricas y pruebas de coordinación

Las pruebas de Servicios de Aplicación, integración y arquitectura deberán aplicar la siguiente distribución:

| Concepto | Responsabilidad normativa |
| --- | --- |
| Solicitud aprobada | Fuente durable del resultado funcional de aprobación |
| Decision intent | Identidad e idempotencia de la decisión y outcome estable del intento |
| Coordinación | Progreso y claim de una operación en curso |
| Guards | Unicidad y coordinación vigentes |
| Membresía | Estado y Períodos de Vigencia |

Deberá probarse que una Solicitud ya aprobada devuelve el mismo resultado cuando la Membresía sea después finalizada, reactivada por otra Solicitud o modificada válidamente. La consulta no debe depender del estado activo actual ni de hashes vigentes en active guards o lifecycle guards.

Una referencia durable desde Solicitud al efecto confirmado no transfiere ownership del Período de Vigencia, no permite modificarlo y no combina las unidades de consistencia.

Los guards sólo prueban unicidad o coordinación vigente. No pueden utilizarse como historial de aprobaciones. La coordinación no reemplaza el estado terminal de Solicitud.

<div class="page-break"></div>

## 7. Carrera reactivación–finalización

Las pruebas deterministas deberán cubrir el siguiente orden:

1. CU-028 confirma la reactivación y el nuevo Período de Vigencia;
2. CU-027 finaliza la Membresía antes de la confirmación terminal de Solicitud;
3. la fase final relee autoritativamente la Membresía y la activación correlacionada;
4. la Solicitud no se aprueba;
5. la finalización no se interpreta como éxito;
6. la coordinación se cierra o libera explícitamente;
7. el decision intent conserva `MEMBERSHIP_REACTIVATION_SUPERSEDED`;
8. el mismo retry devuelve ese outcome y no reactiva nuevamente;
9. la Solicitud permanece pendiente;
10. otra reactivación requiere una nueva confirmación humana y una nueva clave de idempotencia;
11. ningún rollback deshace la finalización válida.

También deberá probarse el orden inverso: si la aprobación confirma mientras la Membresía está activa y CU-027 finaliza después, ambos resultados son válidos en su orden temporal.

Los fallos entre las unidades de Membresía y Solicitud deben producir un estado observable y recuperable. La recuperación nunca puede interpretar una Membresía finalizada como la activación vigente esperada ni repetir automáticamente CU-028 para un decision intent consumido.

## 8. Evolución de schemas y compatibilidad

Las pruebas de dominio, persistencia, contratos e integración deberán verificar que:

- las altas nuevas crean Membresías con representación v3;
- las activas v1 y finalizadas v2 siguen siendo legibles;
- v1 y v2 evolucionan únicamente mediante una operación autorizada de ciclo de vida;
- no existe migración global ni backfill;
- no se inventan fechas;
- un documento incompatible falla cerrado;
- todos los readers involucrados toleran v1, v2 y v3 durante la transición;
- CU-027 finaliza correctamente una activa v1 o v3;
- CU-028 materializa el período inicial de una finalizada v2 desde sus fechas autoritativas y abre el siguiente;
- los retries de alta, finalización o reactivación no crean períodos adicionales;
- los DTO vigentes no exponen automáticamente los períodos ni cambian silenciosamente la semántica de `fechaIngreso`.

La estrategia es evolución por escritura autorizada de ciclo de vida, no migración masiva.

<div class="page-break"></div>

## 9. Impacto y límites

La revisión:

- mantiene un único Aggregate Root Membresía;
- mantiene Persona, Grupo y Temporada fuera del Agregado;
- mantiene Solicitud y Membresía en unidades de consistencia separadas;
- preserva el historial propio sin convertir guards en autoridad;
- no incorpora pagos, asistencias, estadísticas, rendimiento, partidos, entrenamientos, torneos, equipos, Actividad ni registros externos;
- no convierte Actividad en fuente intermedia obligatoria;
- no declara aprobada una representación física;
- no autoriza migración global, backfill ni reparación implícita.

## 10. Regla de prevalencia

> **Esta revisión AUD-C05 conserva el cuerpo de AUD-C04, excepto las cláusulas expresamente sustituidas en esta adenda. Ante cualquier contradicción sobre el ciclo de vida de Membresía, sus Períodos de Vigencia o el significado de “historial de participación”, prevalece la presente aclaración AUD-C05.**

## 11. Trazabilidad

| Referencia | Evidencia exigida por AUD-C05 |
| --- | --- |
| CU-027 — Finalizar una Membresía | Cierre atómico del único período abierto; soporte v1/v3; retry sin duplicación |
| CU-028 — Reactivar una Membresía | Misma identidad, nuevo período, Temporada abierta y recuperación correlacionada |
| CU-029 — Renovar una Membresía | Nueva Membresía para nueva Temporada; separación comprobable respecto de CU-028 |
| Aprobación de Solicitud cuando requiere CU-028 | Resultado histórico estable en Solicitud y su decision intent; coordinación recuperable sin transferir la fuente de verdad de Membresía |

---

**Continuidad documental:** a partir de la página siguiente continúa el cuerpo completo de **Documento 4 — Diseño de la Arquitectura de Software — AUD-C04**, preservado sin alteraciones. Únicamente las cláusulas identificadas en esta adenda quedan sustituidas con el alcance indicado.
