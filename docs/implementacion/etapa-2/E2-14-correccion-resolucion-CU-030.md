# E2-14 — Corrección decisoria sobre la cobertura de CU-030

## 1. Estado y propósito

- **Fecha:** 2026-09-28.
- **Tipo:** correctivo documental y decisión de clasificación funcional de Etapa 2.
- **Estado:** `APROBADO DOCUMENTALMENTE — EVIDENCIA PARA LA REPETICIÓN FINAL DE E2-14`.
- **Caso tratado:** CU-030 — Cambiar el estado de una Membresía.
- **Resultado:** `CU-030 CUBIERTO POR COMPOSICIÓN DE CU-027, CU-028 Y CU-029`.

Este documento corrige exclusivamente la clasificación de CU-030 como faltante autónomo en la
auditoría E2-14. No modifica retroactivamente fichas, informes o cierres; no cierra E2-14 ni la
Etapa 2; no modifica Documento 5 ni los Documentos 1–4; no habilita E3 y no autoriza código,
deploy ni acceso a Firebase remoto.

La corrección incorpora una decisión de producto posterior a E2-19 y deberá ser considerada por la
repetición final de E2-14. Hasta entonces, E2-14 conserva su estado abierto y los restantes bloqueos
mantienen su clasificación.

## 2. Fuentes y precedencia

Se contrastaron, en orden:

1. Documentos 1, 1.5 y 2 aprobados.
2. Documentos 3 y 4 AUD-C05 y sus adendas de Períodos de Vigencia.
3. Documento 5 vigente.
4. E2-05, E2-09, E2-10, E2-12 y E2-18, incluidas sus fichas, informes y cierres.
5. E2-14 y su registro de deuda E2-F04.
6. Dominio, schemas, guards, intents, coordinaciones, contratos, frontend y pruebas integrados hasta
   E2-19, como evidencia técnica y no como fuente normativa autónoma.

No se encontró una contradicción que exija modificar los documentos arquitectónicos o Documento 5.
Documento 2 separa finalización, reactivación y renovación; AUD-C05 concreta sus efectos sobre la
identidad, el estado y los Períodos de Vigencia. Documento 5 permite subdividir su fila preliminar de
administración de Membresía en cortes verificables y recuperables, que es precisamente lo realizado
por E2-05, E2-09, E2-10, E2-12 y E2-18. La expresión general de CU-030 puede, por tanto,
clasificarse mediante esas capacidades específicas sin agregar estados ni operaciones.

La autoridad de esta decisión es clasificatoria y prospectiva: explicita cómo debe leerse el conjunto
normativo ya aprobado y la evidencia integrada. No reescribe el significado histórico de los cierres
ni pretende convertir el código en norma. Si apareciera una fuente aprobada que definiera otro estado,
otra transición o una operación administrativa distinta, esta decisión perdería suficiencia y se
aplicaría la condición de reapertura de §10.

## 3. Universo normativo de estados

Los únicos estados definidos para Membresía son:

- `activa`;
- `finalizada`.

No se reconocen como estados de Membresía `suspendida`, `inactiva`, `bloqueada`, disciplinaria ni
ningún equivalente. Tampoco existe una transición normativa hacia o desde esos conceptos.

La ausencia de un estado adicional no es una omisión técnica. Incorporarlo alteraría el ciclo de
vida, la semántica temporal, los Períodos de Vigencia, los guards, la elegibilidad deportiva y la
autorización. Cualquier estado futuro exige una revisión normativa expresa y un incremento propio.

## 4. Demostración exhaustiva de transiciones

Sea el conjunto normativo de estados `S = {activa, finalizada}`. Un cambio de estado debe tener
origen y destino distintos. Por lo tanto, para una misma raíz sólo existen dos transiciones posibles:

| Origen | Destino | Capacidad específica | Cobertura integrada |
| --- | --- | --- | --- |
| `activa` | `finalizada` | CU-027 — Finalizar Membresía | E2-05 para la Membresía propia del Owner; E2-10 para salida voluntaria propia; E2-12 para finalización administrativa Owner-scoped |
| `finalizada` | `activa` | CU-028 — Reactivar Membresía | E2-09, exclusivamente por aprobación de Solicitud y dentro de la misma Temporada abierta |

Los pares `activa → activa` y `finalizada → finalizada` no son cambios de estado. Corresponden, según
el caso, a consulta, retry, idempotencia, edición no estatal o ausencia de efecto.

CU-029 tampoco agrega una tercera transición sobre la misma raíz. La participación en otra Temporada
crea una nueva Membresía activa y conserva la anterior como raíz histórica finalizada. E2-18
implementa esa renovación con lineage explícito y sin reactivar la raíz de la Temporada anterior.

En consecuencia:

1. no queda una combinación origen–destino definida y sin capacidad específica;
2. no queda un estado normativo sin tratamiento;
3. CU-030 queda agotado por CU-027 y CU-028, con CU-029 como frontera explícita que evita tratar la
   renovación intertemporada como transición de la misma raíz;
4. CU-009 reutiliza legítimamente CU-027 para la salida voluntaria, sin crear otra transición.

La cobertura de actores tampoco deja una operación administrativa implícita: E2-05 permite finalizar
la Membresía propia del Owner, E2-10 permite la salida voluntaria propia, E2-12 permite al Owner
finalizar la Membresía activa de un tercero y E2-09 sólo reactiva como efecto de una Solicitud aprobada.
CU-030 no define una reactivación administrativa directa, una suspensión, una baja disciplinaria, una
reparación, una operación masiva ni una facultad discrecional adicional.

## 5. Relación con Temporada y Períodos de Vigencia

Todas las operaciones que modifican el estado se ejecutan únicamente bajo las precondiciones de su
caso específico y mientras la Temporada correspondiente admite la operación:

- finalizar cierra el único Período de Vigencia abierto;
- reactivar abre un Período nuevo sobre la misma raíz y requiere la misma Temporada abierta;
- renovar crea otra raíz para otra Temporada abierta y no modifica el estado de la predecesora;
- una Temporada cerrada no admite reactivación ni modificación de sus Membresías;
- el cierre de Temporada no cambia Membresías automáticamente y exige cero Membresías activas.

Raíz, Período afectado, resumen temporal y guards permanecen bajo la unidad de consistencia de
Membresía exigida por AUD-C05. Esta decisión no altera ninguna de esas invariantes.

## 6. Prohibición de comando genérico

No se creará `changeMembershipStatus`, un PATCH de `estado` ni una operación equivalente.

Un comando genérico duplicaría contratos existentes y podría omitir precondiciones propias de:

- actor y objetivo;
- consentimiento o decisión humana;
- Solicitud de ingreso;
- Temporada exacta;
- active/lifecycle guards;
- Períodos de Vigencia;
- idempotencia y recovery;
- lineage intertemporada.

El estado no es un valor libre aportado por cliente. Sólo puede cambiar como consecuencia de una
operación específica del Aggregate Root Membresía. Quedan expresamente prohibidos:

- PATCH directo de `estado` desde cliente, backend o herramienta administrativa;
- una callable o servicio genérico de cambio de estado;
- estados no normativos o aliases que simulen estados adicionales;
- bypass de Temporada, Períodos de Vigencia, active/lifecycle guards, Solicitudes, autorización
  contextual u ownership;
- interpretar CU-026 como permiso para editar `estado`.

## 7. Efecto sobre E2-14

La fila E2-F04 debe interpretarse, en la repetición final de E2-14, de la siguiente manera:

| Componente | Clasificación posterior a esta decisión |
| --- | --- |
| CU-026 — Editar Membresía | Pendiente; depende de configuración, catálogos, privacidad y permisos contextuales aprobados |
| CU-030 — Cambiar estado | Cubierto por composición de CU-027/CU-028/CU-029; no requiere incremento técnico autónomo |

Este documento no edita E2-14 porque la auditoría conserva la evidencia y conclusión válidas para el
SHA que examinó. La repetición final debe incorporar esta decisión como evidencia posterior y
reclasificar CU-030 sin ocultar la evolución documental.

La aprobación de este correctivo no equivale a aprobar la repetición de E2-14. Esa auditoría sólo podrá
cerrarse después de verificar nuevamente todas las deudas, dependencias y gates de Etapa 2 sobre el SHA
que corresponda; deberá citar este archivo como evidencia y mantener CU-026 separado y pendiente.

## 8. Consecuencias y límites

Consecuencias de la decisión:

- no se crea un incremento técnico autónomo para CU-030;
- se conserva una única fuente de verdad del estado en Membresía y sus Períodos de Vigencia;
- CU-027, CU-028 y CU-029 mantienen contratos, evidencia y cierres propios, sin ampliación
  retroactiva;
- la repetición final de E2-14 deberá registrar el cambio de clasificación y su fecha, no reemplazar
  silenciosamente la conclusión histórica de la auditoría original.

Límites que no cambian:

- No se habilita CRUD de Membresía.
- No se autoriza edición de `estado` dentro de CU-026.
- No se autoriza suspensión, disciplina, bloqueo ni baja automática.
- No se incorpora finalización masiva, reparación administrativa ni operación batch.
- No se modifican contratos, schemas, guards, intents, coordinaciones, Rules o UI.
- No se declara CU-026 cubierto.
- No se cierra E2-14 ni Etapa 2.

## 9. Riesgos residuales

1. Una lectura superficial de CU-030 podría volver a introducir un setter genérico de `estado`; las
   prohibiciones de §6 y las pruebas arquitectónicas futuras deben impedirlo.
2. Confundir CU-029 con reactivación podría modificar una raíz histórica de otra Temporada; la
   separación de identidad y lineage de E2-18 permanece obligatoria.
3. Una futura norma de disciplina, suspensión o baja podría ampliar el universo de estados. No queda
   anticipada ni cubierta por este correctivo.
4. La clasificación sólo será efectiva en el cierre consolidado cuando la repetición final de E2-14
   la incorpore expresamente; hasta entonces E2-14 y Etapa 2 siguen abiertas.

## 10. Condición de reapertura

El correctivo debe reabrirse —y CU-030 volver a clasificarse como pendiente— si una fuente aprobada,
un caso exigible o una inconsistencia demostrada identifica un estado, transición, actor u operación
administrativa no cubiertos por la matriz de §4. Cualquier propuesta de ese tipo deberá:

1. modificar o complementar la norma funcional;
2. definir actor, origen, destino, precondiciones y relación con Temporada;
3. resolver el efecto sobre Períodos de Vigencia, guards, elegibilidad y consumidores;
4. contar con una Ficha de Incremento Implementable propia;
5. no reutilizar silenciosamente los contratos de CU-027, CU-028 o CU-029.

Si resolverla exigiera modificar Documento 2, Documento 5 o arquitectura, no podrá aprobarse como una
mera ficha o corrección de implementación: requerirá primero la intervención documental competente.

## 11. Decisión final

`CU-030 FORMALMENTE CUBIERTO — SIN COMANDO GENÉRICO — E2-14 PERMANECE ABIERTA`
