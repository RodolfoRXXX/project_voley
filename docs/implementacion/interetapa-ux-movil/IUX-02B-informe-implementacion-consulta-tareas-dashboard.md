# IUX-02B — Informe de implementación local de consulta de tareas del dashboard

**Estado:** IUX-02B IMPLEMENTADO Y VALIDADO TÉCNICAMENTE EN LOCAL; HABILITACIÓN COORDINADA PENDIENTE

**Base normativa:** D5-061, ficha IUX-02 y addendum adoptado a Documentos 2/3/4

**Rama local:** `feat/iux-02b-dashboard-task-query`

**HEAD de partida:** `d34c91febb957a0dfe0fdc5172547e81b67091bd`

Este informe registra evidencia local. No implementa el rediseño IUX-01, no monta el bloque nuevo en
el dashboard, no habilita la proyección, no ejecuta backfill productivo y no acredita despliegue,
presupuesto/SLO productivo, UAT, cierre de IUX-02 ni gates pendientes de E3.

## 1. Resultado implementado

### Consulta backend

Se agregó `listMyDashboardTasks` con entrada cerrada `coverage=N20_N31_V1` y cursor opcional. La
cuenta se deriva de Auth; no se aceptan UID, Persona, Grupos, roles ni page size del cliente. El
reader:

- enumera Grupos propios y slots candidatos N31, deduplica contextos y revalida ownership o
  capability efectiva con las capacidades públicas de los módulos;
- lee manifest de generación, scopes y contadores contextuales de la proyección derivada;
- pagina items activos por `actionableAt DESC, taskType ASC, resourceId ASC`;
- relee las fuentes de los items examinados y vuelve a comprobar destinatario, auto-revisión,
  Grupo y Temporada antes de exponerlos;
- devuelve `totalTasks` sólo con `health=READY` y `coverage.complete=true`; una card descartada o
  una contradicción visible entre lista y contador produce `UPDATING` sin total;
- firma el cursor y lo liga a cuenta, coverage, generación y orden. Alteración/cuenta distinta se
  rechazan; una generación sustituida produce `CURSOR_EXPIRED`;
- no escribe, no emite eventos, no solicita reparación y no ejecuta decisiones administrativas.

`PROJECTION_DISABLED` y `PROJECTION_NOT_READY` son estados explícitos, nunca un vacío. El callable
permanece exportado pero `ENABLE_DASHBOARD_TASK_PROJECTION=false` por defecto. Fuera de Emulator,
habilitarlo también exige configurar `DASHBOARD_TASK_CURSOR_SECRET` con al menos 32 caracteres; su
ausencia falla cerrada. El valor se inyecta exclusivamente por ambiente y no se documenta ni
versiona. Con la proyección deshabilitada no se construye un codec; Emulator usa un secreto efímero
por proceso cuando no se aporta uno sintético, por lo que reiniciar invalida sus cursores de prueba.

### Frontend técnico

Se agregaron tipos del DTO, mapeo de errores y un cliente de consulta exclusivamente bajo demanda.
El gate de requests liga cada respuesta a la cuenta y secuencia actuales: logout, cambio de cuenta,
invalidación manual o una consulta posterior descartan respuestas tardías. No se agregaron polling,
listeners, timers ni refresh por focus, y el servicio todavía no se importa desde `/dashboard`.

### Deep-links

- N20: `/dashboard/groups/{groupId}?joinRequestId={requestId}#integrantes` usa una consulta exacta
  Owner-only, valida que la Solicitud pertenezca al Grupo y siga pendiente, y la inserta sin
  duplicarla aunque esté fuera de la primera página.
- N31: `/dashboard/groups/{groupId}/economy?tab=notices&deliveryId={deliveryId}` reutiliza
  `getGroupPaymentDelivery` y el modal/comandos existentes. Ese flujo revalida Grupo,
  accionabilidad, ownership/capability y auto-revisión.

Los parámetros sólo localizan recursos. Aprobar, rechazar o confirmar continúa requiriendo los
comandos y confirmaciones existentes. Sin parámetros, ambas vistas mantienen su comportamiento.

## 2. Corrección de integración detectada

El reader expuso una incompatibilidad de IUX-02A: un evento incremental posterior a la activación
reemplazaba `READY`/`ROLLED_BACK` por `AVAILABLE` en el manifest del usuario, aunque escribiera sobre
la generación activa y el scope convergiera. Eso impedía volver a publicar un total después del
primer cambio de dominio.

La corrección mínima preserva el estado activado cuando el evento escribe la misma generación. El
scope sigue expresando `DIRTY`, `REBUILDING`, `DEGRADED` o `READY`; no se adelanta readiness ni se
cambia la activación. Se agregó una regresión que activa una generación, aplica un evento posterior,
comprueba que el puntero/estado siguen activos y valida rollback con la tarea concurrente.

## 3. Garantías y evidencia

| Garantía | Evidencia local |
| --- | --- |
| Cuenta sólo desde sesión | Unit del callable: Auth ausente se rechaza, `accountId` cliente se rechaza y sólo `auth.uid` llega al reader |
| Cobertura exclusiva N20/N31 | Contrato cerrado, tipos del DTO y consulta física filtrada |
| Autorización actual en todos los contextos | Focal Emulator con ownership, slot reviewer, grant/Membresía/Temporada y revocación |
| Auto-revisión N31 | Una copia stale de la entrega propia se omite y fuerza `UPDATING` sin total |
| Owner+slot coincidentes no duplican | Contextos se deduplican por `groupId`; el escenario funcional conserva total e identidades únicas |
| Lista/total/health coherentes | Cards stale o contador contradictorio se omiten y quitan `totalTasks`; cero sólo se prueba con generación completa sin items |
| Paginación estable | 12 tareas con timestamps empatados, dos páginas y 12 identidades únicas |
| Cursor protegido | Firma manipulada, otra cuenta y otra generación cubiertas |
| Consulta sin mutaciones | Instrumentación de las tres escalas: cero writes en apertura y página siguiente |
| Cambio de sesión | Gate frontend descarta respuesta cruzada y respuesta superada |
| Deep-link N20 exacto | Caso fuera de página inicial, Grupo incorrecto y Solicitud ya resuelta en suite E2-06 |
| Deep-link N31 seguro | Reutiliza `getPending`, que verifica `delivery.groupId`, `REPORTED` y autorización efectiva antes de devolver detalle |
| Sin refresco periódico ni montaje prematuro | Unit estructural sobre servicio/gate y ausencia de import en dashboard |
| Estado activado estable | Focal IUX-02A 9/9 después de la corrección de integración |

Las Rules deny-all de toda la proyección permanecen cubiertas por IUX-02A; el cliente sólo accede al
callable autorizado.

## 4. Mediciones del reader

Operación medida: una llamada directa al reader dentro de Firestore Emulator, desde lectura de
manifest/cuenta/contextos hasta revalidación de la ventana física de 11 documentos y serialización
del DTO. No incluye red, cold start de Functions, render React, backfill, worker ni reconciliación.
Cada escenario distribuye N20/N31 50/50 entre Grupos; una cuenta Owner recibe una copia por tarea.

El contador instrumental suma un read por documento retornado en queries, un read mínimo para query
vacía y uno por referencia de `get/getAll`; suma llamadas transaccionales de escritura. Sirve para
comparación reproducible del código, no es una factura ni una medición productiva.

| Escenario | N20/N31 | Copias | Apertura: reads / ms / payload | Página 2: reads / ms / payload | Writes |
| --- | ---: | ---: | ---: | ---: | ---: |
| 3 contextos / 12 tareas | 6 / 6 | 12 | 61 / 175 / 4.148 B | 25 / 86 / 949 B | 0 |
| 20 contextos / 200 tareas | 100 / 100 | 200 | 123 / 301 / 4.207 B | 124 / 284 / 4.216 B | 0 |
| 100 contextos / 2.000 tareas | 1.000 / 1.000 | 2.000 | 363 / 349 / 4.264 B | 364 / 348 / 4.275 B | 0 |

Las dos primeras páginas revalidan hasta 11 documentos crudos por llamada; en 3/12 la segunda sólo
encuentra dos. La pendiente observada entre 20 y 100 Grupos es aproximadamente tres reads por
contexto Owner, más costos fijos y revalidación de página. Slots reviewer agregan enumeración y las
lecturas de grant, Cuenta/Persona, Membresía y Temporada exigidas por la autorización efectiva.

No hay truncamiento de contextos ni un total parcial: la consulta intenta validar todos los
contextos que aportan al total. Si volumen, deadline o dependencia impiden terminar, debe fallar y
no publicar `READY`; el presupuesto productivo y el límite operativo aceptable siguen siendo gates.
Los milisegundos anteriores son del Emulator y no acreditan los objetivos 30 s/5 min/24 h ni un SLO.

## 5. Pruebas y gates ejecutados

| Gate/prueba | Resultado |
| --- | --- |
| Functions syntax | PASS — 482/482 |
| Unitarias Functions | PASS — 81 archivos/suites del runner |
| TypeScript | PASS |
| Lint baseline | PASS — baseline sin ampliar; 10 hallazgos previos resueltos |
| Build Next.js | PASS |
| Focal IUX-02B | PASS — 3/3 |
| Focal IUX-02A por corrección compartida | PASS — 9/9 |
| Focal N20 exacto | PASS — E2-06 13/13 en entorno canónico aislado |
| Gate integral de siete lotes | PASS — 331/331 (55 + 62 + 57 + 45 + 40 + 29 + 43), fail-fast y salida final 0 |
| `git diff --check` | PASS |

El runner canónico incorpora `dashboardTaskQueryIux02b.test.js` una sola vez: 41 paths, siete lotes,
fail-fast y propagación de exit code permanecen cubiertos por su prueba unitaria. No se cambiaron
aserciones ni baselines para ocultar fallos.

La primera corrida integral documentada expuso un fixture nuevo inválido en E2-06: fijaba
`createdAt` en 2030 y luego simulaba una cancelación con la hora actual de 2026. El dominio rechazó
correctamente la cancelación anterior a la creación. Se corrigió sólo el timestamp sintético, se
preservó la invariante y el focal E2-06 pasó 13/13.

Una corrida completa posterior agotó de forma aislada la operación concurrente legacy E2-17 bajo
carga del lote (`closeSeason`, 8,5 s) y devolvió `INTERNAL_ERROR`. IUX-02B no modifica writers de
Temporada. El mismo caso pasó con el mismo código en la corrida integral anterior, en el integral
final de IUX-02A y en el focal limpio E2-17 11/11. Sin cambiar código, timeouts ni aserciones, la
corrida integral limpia final pasó los siete lotes; se conserva esta evidencia como intermitencia
del Emulator, no como acreditación de rendimiento productivo.

## 6. Límites y pendientes productivos

- IUX-01 todavía debe montar la presentación, disparar consulta al entrar/regresar/manual y limpiar
  el estado visible al cambiar de cuenta. Los fixtures no autorizan publicar datos ficticios.
- La proyección y el reader siguen deshabilitados. Habilitar requiere backfill/reconciliación,
  índices, secreto de cursor, mediciones en un entorno representativo, seguridad, smoke y UAT.
- El costo crece con Grupos y slots actuales aunque no crece con el total de tareas salvo la página
  revalidada. Deben medirse cuentas mayores y fan-out reviewer antes de aprobar presupuesto.
- `UPDATING`, `REBUILDING` y `DEGRADED` entregan lista revalidada sin total; el diseño visual y sus
  mensajes pertenecen a la integración coordinada IUX-01.
- No se desplegaron índices, Functions ni frontend; no se ejecutaron migraciones ni datos remotos.
- Los gates productivos pendientes de E3 no cambian.

IUX-02B queda listo para revisión local. IUX-02 completo permanece abierto hasta la validación
coordinada con IUX-01 y la autorización separada de habilitación.
