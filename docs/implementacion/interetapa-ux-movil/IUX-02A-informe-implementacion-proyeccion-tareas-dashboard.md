# IUX-02A — Informe de implementación local de la proyección de tareas del dashboard

**Estado:** IUX-02A IMPLEMENTADO Y VALIDADO TÉCNICAMENTE EN LOCAL

**Base normativa:** D5-061, ficha IUX-02 y addendum adoptado a Documentos 2/3/4

**Rama local:** `feat/iux-02a-dashboard-task-projection`

**Base:** `cf47339db252ed8ffc21978eb4eb0ae4fcbd1277`

Este informe registra evidencia técnica local de IUX-02A. No implementa IUX-02B, no expone un
reader público, no modifica el dashboard y no acredita despliegue, backfill remoto, SLO, UAT,
habilitación productiva, cierre de IUX-02 ni cierre de los gates pendientes de E3.

### Estado recuperado tras la interrupción del equipo

El 2026-10-26 se verificaron la rama y el checkpoint declarados, el working tree local y todos los
archivos nuevos antes de continuar. No sobrevivían procesos Firebase/Node de las pruebas ni logs de
sus workspaces temporales. El focal combinado de serialización que estaba en curso al apagarse no
tenía resultado final verificable y se trató como interrumpido. Se lo ejecutó nuevamente una sola
vez con salida completa preservada durante el diagnóstico; pasó 58/58. No se descartó ni reinició
ningún cambio local.

## 1. Resultado implementado

Se implementó el productor backend-only de la proyección derivada `N20_N31_V1`:

- identidad estable por tipo y recurso;
- scope por Grupo con revisión monotónica y outbox durable confirmado en la misma transacción que
  cada writer canónico alcanzado;
- proyector idempotente que relee fuentes y audiencia vigentes;
- manifests, items por usuario/generación y contadores por usuario/Grupo;
- avance exclusivo de revisiones contiguas, sin publicar `READY` sobre huecos;
- leases con token de fencing, recuperación de leases vencidos y backoff de reintentos;
- backfill, reconciliación, rebuild generacional, activación y rollback controlado;
- health básico y limpieza de datos terminales conforme a la retención de 30 días;
- Rules deny-all para toda la persistencia física y los índices requeridos;
- trigger inmediato, barrido de recuperación cada minuto y reconciliación diaria, siempre
  descubribles por Firebase y con ejecución protegida por `ENABLE_DASHBOARD_TASK_PROJECTION=true`.

El flag queda en `false` por defecto: existe un mecanismo de ejecución completo, pero esta tarea no
lo habilita ni despliega. Al cierre del corte IUX-02A no existían `listMyDashboardTasks`, integración
frontend ni deep-links nuevos; fueron abordados después por IUX-02B sin agregar polling, listener de
pantalla ni migración desde `pendingAlerts`.

La revisión técnica posterior corrigió tres defectos dentro del alcance:

- la retención ya no elimina un evento `APPLIED` cuya revisión todavía esté detrás de un hueco no
  aplicado;
- el límite de fan-out cuenta también retiros de items y manifests terminales, no sólo la audiencia
  deseada;
- activación y rollback validan convergencia y cobertura de la generación antes de cambiar punteros.

La revisión del límite de concentración y del gate integral agregó además:

- clasificación de eventos de recurso, audiencia y reconstrucción: los primeros releen sólo los
  recursos afectados; audiencia recorre únicamente N31; rebuild/reconciliación recorre N20, N31 y
  el retiro de manifests sobrantes;
- scans paginados de 100 documentos con progreso durable en outbox, renovación de lease y
  reanudación; una revisión no queda `APPLIED` ni publica `READY` hasta terminar todas sus fases;
- protección de manifests contra una revisión antigua que reanuda después de revisiones nuevas;
- diez fallos efectivos como presupuesto de retry automático; las cesiones normales de trabajo
  largo no consumen ese presupuesto;
- idempotencia concurrente del outbox: después de leer evento+scope, el evento se confirma con
  `set` transaccional y no con una precondición `create` que podía filtrar `ALREADY_EXISTS` al
  comando de dominio ya confirmado.

Durante la integración local de IUX-02B se detectó y corrigió una incompatibilidad acotada: un
evento incremental sobre la generación activa no debe degradar el manifest de usuario ya activado
de `READY`/`ROLLED_BACK` a `AVAILABLE`. El scope continúa expresando el avance real. La regresión se
cubrió en el focal IUX-02A, que volvió a pasar 9/9.

Durante la UAT local de IUX-01 del 2026-10-27 se detectó otro defecto acotado: condicionar los
exports en `index.js` impedía que Firebase Emulator descubriera los consumidores aunque el proceso
padre tuviera el flag en `true`. Los writers confirmaban outbox, pero los eventos quedaban
`PENDING` con cero intentos. La corrección declara siempre los tres triggers y evalúa el flag al
entrar a cada handler. Una alta N20 posterior avanzó automáticamente el scope de revisión 14 a 15;
la resolución conjunta N20/N31 de otro Grupo avanzó de 10 a 14 y dejó `READY`, sin outbox pendiente
y con `totalTasks=0`. No se usó backfill para esas convergencias normales.

## 2. Modelo físico y garantías

| Persistencia | Responsabilidad |
| --- | --- |
| `dashboardTaskScopes/{groupId}` | `sourceRevision`, `projectedRevision`, generación de escritura, cobertura y health por Grupo |
| `dashboardTaskOutbox/{eventId}` | intención durable, revisión, lease, reintentos y resultado |
| `dashboardTaskManifests/{taskId}` | audiencia derivada vigente o terminal por identidad estable |
| `users/{uid}/dashboardTaskProjection/N20_N31_V1` | generación activa/anterior y estado de transición |
| `users/{uid}/dashboardTaskSets/{generationId}` | total materializado N20+N31 de esa generación |
| `.../items/{itemId}` | tarea derivada para una cuenta, con referencia y destino contextual |
| `.../contexts/{groupId}` | contador contextual `total`, `N20`, `N31` |
| `dashboardTaskHealth/N20_N31_V1` | resumen operativo de scopes/eventos no saludables |

Las identidades funcionales son `JOIN_REQUEST_DECISION:{requestId}` y
`PAYMENT_DELIVERY_REVIEW:{deliveryId}`. El ID físico es un hash ligado a cobertura. Owner y reviewer
coincidentes producen un solo item por cuenta. Las fuentes originales continúan siendo autoridad.

El writer crea scope y evento con dos escrituras adicionales. La transición de cada lote de items y
sus deltas de contadores se confirma en una sola transacción. El progreso intermedio queda en el
evento, pero éste no cambia a `APPLIED` hasta completar scan y sweep. Un evento repetido conserva su
revisión; un evento antiguo relee la fuente actual y no reactiva una tarea resuelta ni sobrescribe
un manifest con `scopeRevision` superior. El worker sólo avanza
`projectedRevision` mientras encuentra todas las revisiones anteriores aplicadas. `READY` exige
igualdad con `sourceRevision` y cobertura demostrada por backfill/rebuild.

## 3. Semántica y autorización preservadas

### N20

Se proyecta una tarea sólo para el Owner canónico con Cuenta compatible, Grupo activo, Solicitud con
esquema canónico en estado `pendiente` y sin coordinación de aprobación en curso. La capacidad de
lectura reside en el módulo público de Solicitudes; `dashboardTasks` agrega ownership, destinatario y
destino sin reinterpretar el agregado.

### N31

Se proyecta una tarea por Entrega `REPORTED` para:

- Owner canónico compatible, incluso en el caso prearchivo que el módulo actual todavía permite
  revisar;
- reviewer efectivo sólo si Grupo, slot, grant, ownership revision, Cuenta/Persona, Membresía,
  `validityAnchor` y Temporada abierta continúan correlacionados.

El reviewer no recibe su propia Entrega. La capacidad de audiencia es compartida por los comandos
de pago y el proyector, de modo que no se creó una segunda definición de autorización. El Owner y el
reviewer coincidentes quedan deduplicados.

## 4. Matriz de writers cubiertos

| Fuente/cambio | Writer canónico integrado | Evento/reproyección | Efecto esperado |
| --- | --- | --- | --- |
| Alta N20 | `firestoreGroupJoinRequestStore` | `N20_CREATED` | Alta de tarea Owner |
| Cancelación N20 | mismo store | `N20_RESOLVED` | Retiro |
| Rechazo N20 | mismo store | `N20_RESOLVED` | Retiro |
| Inicio de aprobación | mismo store | `N20_COORDINATION_STARTED` | Retiro transitorio mientras coordina |
| Aprobación confirmada | mismo store | `N20_RESOLVED` | Retiro definitivo |
| Coordinación liberada/superseded | mismo store | `N20_COORDINATION_RELEASED` | Relectura; puede restaurar N20 aún vigente |
| Alta N31 | `firestorePaymentDeliveryStore` | `N31_CREATED` | Alta para audiencia efectiva |
| Confirmación/rechazo N31 | mismo store | `N31_RESOLVED` | Retiro |
| Resolución por recepción administrativa | `firestoreAdministrativeReceiptStore` | `N31_RESOLVED_BY_ADMINISTRATIVE_RECEIPT` | Retiro de todas las Entregas resueltas por el comando |
| Grant/revocación reviewer | `firestorePaymentDeliveryStore` | `N31_AUDIENCE_CHANGED` | Recalcula todas las N31 del Grupo |
| Alta/reactivación/renovación de Membresía | `groupJoinRequestMembershipCapability` | `N31_AUDIENCE_CHANGED` | Recalcula audiencia efectiva |
| Salida propia | `firestoreMembershipSelfExitStore` | `N31_AUDIENCE_CHANGED` | Retira reviewer que perdió vigencia |
| Finalización administrativa/Owner | stores de finalización y lifecycle | `N31_AUDIENCE_CHANGED` | Retira reviewer que perdió vigencia |
| Cierre de Temporada | `firestoreSeasonClosureStore` | `N31_AUDIENCE_CONTEXT_CHANGED` | Retira reviewers de esa Temporada; preserva regla Owner |
| Archivo de Grupo | `firestoreGroupArchiveStore` | `DASHBOARD_TASK_CONTEXT_ARCHIVED` | Retira N20/reviewers; preserva N31 Owner prearchivo |

No existe un writer canónico habilitado de transferencia de ownership. El endpoint legacy permanece
retirado; cualquier transferencia futura debe integrar scope/outbox antes de habilitarse.
Escrituras administrativas directas fuera de estos writers no forman parte del contrato y requieren
reconciliación controlada.

## 5. Procesamiento, fallos y observabilidad

- Trigger `onCreate`: intenta procesar el evento recién confirmado.
- Scheduler de un minuto: recupera `PENDING`, `FAILED` ya disponibles y leases vencidos con orden
  estable por fecha e ID.
- Lease: 45 segundos y token único; un worker vencido no puede aplicar, fallar ni completar el evento
  de un reemplazo vigente.
- Retry: backoff exponencial acotado a cinco minutos y máximo de diez fallos efectivos. Al agotar el
  presupuesto, el evento queda `FAILED`, `retryExhausted=true`, sin nueva fecha automática y visible
  para intervención. A partir de cinco minutos de antigüedad, un fallo deja el scope `DEGRADED`;
  antes permanece `DIRTY`.
- Trabajo largo: cada invocación ejecuta hasta 40 lotes y, si aún resta trabajo válido, libera el
  lease y devuelve el evento a `PENDING` conservando `progress`; esta cesión no es un fallo ni
  incrementa `failureAttempts`.
- Eventos de recurso N20/N31 leen sólo los IDs declarados. Cambios de audiencia recorren N31 y su
  sweep. Rebuild/reconciliación recorren N20, N31 y sweep, todos por `documentId` en páginas de 100.
- Reconciliación: recorre Grupos por cursor físico en páginas de 100, con techo explícito de 10.000.
  Llegar al techo falla la ejecución; nunca se declara cobertura completa silenciosamente.
- Health: cuenta scopes `DIRTY/DEGRADED` y eventos `FAILED/PROCESSING` y registra el instante de
  medición. Alarmas, panel productivo y presupuesto continúan pendientes de rollout.
- Límite preventivo por lote: una única página/transición que supere 420 escrituras calculadas falla
  con `PROJECTION_FANOUT_LIMIT`; no trunca audiencia ni contadores. La concentración de recursos ya
  no se confunde con ese límite: continúa en páginas sucesivas.

Las consultas futuras de IUX-02B no disparan reparación. Procesamiento de eventos, consulta de
pantalla y reconciliación permanecen separados.

### Estado de `ENABLE_DASHBOARD_TASK_PROJECTION`

Con `false` los exports continúan presentes para que Firebase pueda descubrir el mecanismo, pero
los tres handlers retornan sin procesar: trigger `onCreate`, recovery programado y
reconciliación/health/cleanup diarios no consumen ni escriben proyección. Los writers siguen
confirmando fuente, scope y outbox en la misma transacción. Por lo tanto, los comandos ejecutados
mientras está deshabilitado no pierden intención durable, pero acumulan eventos `PENDING`; tampoco
se ejecutan cleanup ni health. Esto reemplaza la formulación anterior “se omiten los exports”, que
resultó incompatible con el descubrimiento real del Emulator.

Habilitar el flag no vuelve a disparar `onCreate` para documentos ya existentes. El recovery toma
como máximo 40 eventos disponibles por corrida. Antes de habilitar cualquier reader se requiere:

1. dimensionar y monitorear el backlog y su costo;
2. ejecutar backfill/rebuild controlado en el entorno autorizado;
3. drenar outbox hasta avance contiguo;
4. demostrar `projectedRevision == sourceRevision`, cobertura completa y generación coherente para
   todos los scopes incluidos;
5. recién entonces publicar `READY` y considerar IUX-02B.

El operador actual falla fuera del Emulator, de modo que ese procedimiento productivo todavía no
existe ni está autorizado. Mantener el flag desactivado durante una ventana prolongada requiere un
presupuesto explícito para el crecimiento del outbox.

## 6. Backfill, rebuild y rollback

La herramienta local está restringida deliberadamente al Firestore Emulator:

```text
npm --prefix volley-ranking-system/functions run iux-02a:backfill:emulator
npm --prefix volley-ranking-system/functions run iux-02a:rebuild:emulator
npm --prefix volley-ranking-system/functions run iux-02a:rollback:emulator
```

### Backfill

1. Enumera Grupos paginados y fija `writeGenerationId` antes de reproyectar cada contexto.
2. Mantiene activo el outbox: una escritura concurrente posterior usa la nueva generación; una
   escritura anterior queda cubierta por la relectura actual y el avance contiguo.
3. Drena eventos hasta converger.
4. Activa sólo si todos los scopes seleccionados tienen cobertura completa y revisiones iguales.
5. Materializa raíz cero para usuarios conocidos que no tengan tareas en la nueva generación; nunca
   inventa cero antes de demostrar los scopes.

### Rebuild

Usa una generación nueva y no mezcla items ni contadores con la activa. Conserva la generación
anterior 30 días para rollback. La prueba Emulator agrega una segunda fuente después de iniciar el
rebuild y demuestra que ambas quedan en la generación activada.

### Rollback

Antes de cambiar el puntero, reproyecta todas las fuentes vigentes dentro de la generación retenida y
drena el outbox. Luego exige para cada scope seleccionado generación de escritura coincidente,
`projectedRevision == sourceRevision`, cobertura completa y estado `READY`; sólo después conmuta
metadatos. Así el rollback no restaura una foto obsoleta. Nunca modifica Solicitud, Entrega, grants,
Membresía, Temporada ni Grupo.

Un backfill/rebuild/rollback productivo necesita herramienta y autorización posteriores, índices
creados, presupuesto medido, ventana operativa, alarmas y procedimiento de pausa. El guard Emulator
no fue retirado y ninguna de estas operaciones se ejecutó contra datos remotos.

## 7. Retención

La limpieza de 30 días alcanza exclusivamente:

- eventos `APPLIED`;
- manifests e items `INACTIVE` con `purgeAfter` vencido;
- generaciones sustituidas cuyo plazo de rollback venció.

Un evento `APPLIED` sólo es eliminable si su revisión es menor o igual que la
`projectedRevision` contigua del scope. Un evento aplicado por encima de un hueco, un evento sin scope
verificable, eventos pendientes/fallidos, manifests activos, items activos y tareas vigentes no
expiran por antigüedad. Una prueba Emulator siembra datos terminales, activos y una revisión aplicada
detrás de un hueco, ejecuta cleanup y comprueba esa diferencia.

## 8. Pruebas y gates

Toda prueba de integración usó proyecto `demo-*`, Auth/Firestore Emulator y datos sintéticos. No se
leyeron ni modificaron datos remotos.

### Matriz de garantías revisadas

| Garantía | Evidencia local |
| --- | --- |
| Fuente, scope y outbox atómicos | Los writers integrados incorporan `prepared.commit()` dentro de su transacción de dominio |
| Reintento sin duplicar evento/revisión | ID estable, fingerprint cerrado y conflicto ante reutilización incompatible |
| Carrera de intent idéntico | 12 transacciones concurrentes convergen en un evento/revisión; una crea y once recuperan sin `ALREADY_EXISTS` |
| Recursos distintos procesados 2→1 | La revisión 2 aplicada no avanza desde 0; la revisión 1 permite avance contiguo hasta 2 |
| Evento viejo no reactiva tarea | El proyector relee fuente y audiencia actuales antes de materializar |
| Fencing efectivo | Worker B reclama lease vencido; el token de A ya no puede aplicar, fallar ni completar |
| Item y contador atómicos/idempotentes | Items, raíces, contextos, manifests, evento y scope cambian en una transacción |
| Fan-out real acotado y reanudable | 210 N20 convergen en 7 lotes; 650 N20 + N31 reanudan tras lease perdido y preservan revisiones concurrentes; una sola transición patológica sigue fallando antes de truncar |
| Sin `READY` prematuro | El scope conserva `projectedRevision=0` durante lotes parciales y sólo avanza 1→3 al cerrar el hueco con revisiones 2/3 ya aplicadas |
| Fallos sin retry infinito | El décimo fallo efectivo deja `FAILED/retryExhausted`; una cesión tras 40 lotes conserva progreso sin sumar fallo |
| Audiencia/revocaciones | Cobertura Emulator de Owner/reviewer, auto-revisión, grant, Membresía, Temporada y Grupo |
| Rebuild concurrente sin pérdida | Una fuente agregada durante rebuild aparece junto a la inicial en la generación activada |
| Switch/rollback coherente | Activación y rollback exigen convergencia, cobertura, `READY` y generación coincidente |
| Retención recuperable | Cleanup conserva tareas vigentes y eventos aplicados posteriores a un hueco |
| Rules deny-all | GET/PATCH cliente denegados en todos los paths físicos de la proyección |
| Sin lector/acción nueva | No existe callable público ni integración frontend; los comandos administrativos quedan fuera |

| Verificación | Resultado local |
| --- | --- |
| Sintaxis Functions | PASS — 472/472 archivos JavaScript |
| Unitarias Functions | PASS — 414/414 casos en el runner canónico |
| Focal IUX-02A | PASS — 9/9; incluye durabilidad, desorden/huecos, fencing, Rules, generaciones, audiencia, retención, carrera de outbox, retry acotado, lotes y mediciones |
| Gate integral `quality:test` | PASS — 414/414 unitarias y 7/7 lotes Emulator completos con fail-fast |
| Repetición aislada E2-20 tras el incidente | PASS — 11/11 en un emulador limpio y sin captura diagnóstica |
| E2-07 N20 | PASS — 11/11 |
| E3-03 N31 | PASS — 11/11 |
| E3-04 recepción administrativa + regresión de pagos | PASS — 19/19 |
| Cierre de Temporada | PASS — 5/5 |
| Archivo de Grupo | PASS — 7/7 |
| Reactivación de Membresía | PASS — 7/7 |
| Salida propia de Membresía | PASS — 12/12 |
| Finalización administrativa | PASS — 10/10 |
| Lint baseline | PASS — 31 errores y 9 warnings conocidos; 10 hallazgos resueltos respecto del baseline |
| Build frontend | PASS — 22 páginas estáticas |
| Typecheck | PASS tras regenerar `.next` mediante el build normal |
| Rules de proyección | PASS — GET/PATCH cliente denegados en scopes, outbox, manifests, health, metadata, raíz de generación, items y contextos |
| `git diff --check` | PASS en el checkpoint final de la implementación local |
| Regresión UAT del flag (2026-10-27) | PASS — 82/82 archivos unitarios; alta N20 y resoluciones N20/N31 convergen por trigger normal |

El primer typecheck del Stage 0 encontró referencias obsoletas dentro de `.next` a rutas ya
retiradas. El build normal regeneró esos artefactos y tanto build como la repetición de typecheck
pasaron, sin borrar archivos manualmente ni instalar dependencias.

### Diagnóstico y corrección del gate integral

Los logs completos demostraron que el Functions Emulator conservaba un runtime Node inactivo por
función invocada. Tras acumular funciones distintas durante la única corrida larga, varios cold
starts simultáneos no alcanzaban a publicar su socket antes del timeout de discovery de 30 segundos;
el CLI emitía `Failed to load function` sin excepción de inicialización, OOM ni aserción funcional.

La comparación secuencial contra un worktree limpio de
`cf47339db252ed8ffc21978eb4eb0ae4fcbd1277` confirmó:

- carga directa de `index.js`: implementación actual 0,35–0,42 s y 84–86 MB; checkpoint
  0,36–0,41 s y 83–84 MB;
- E2-20 aislado: PASS 11/11 en ambos;
- suite Emulator completa del checkpoint: reproduce el mismo fallo acumulativo, allí sobre
  `createMyMembershipForOwnedGroup`.

El runner canónico se corrigió dividiendo exclusivamente la corrida integral en siete lotes
secuenciales y reiniciando Auth/Firestore/Functions Emulator entre lotes. Cada lote conserva
`node --test --test-concurrency=1`, y cada test conserva su concurrencia interna; no se aumentó el
timeout, no se cambió ningún baseline, no se usó modo debug secuencial y cualquier lote no cero corta
los siguientes. Los focales continúan usando una única ejecución. Con este cambio, `quality:test`
terminó con código 0 en un entorno limpio y aislado.

Los presupuestos exactos existentes se mantuvieron explícitos: reportar N31 usa `3+2` escrituras,
confirmar 20 líneas usa `43+2`, y una recepción administrativa con 20 líneas/20 avisos usa `63+2`.
Las dos escrituras adicionales son scope + outbox; no se ampliaron tolerancias.

### Diagnóstico del fallo N20 posterior al procesamiento por lotes

La primera corrida integral posterior al cambio de fan-out cortó correctamente en el lote 3. En la
recuperación concurrente de una aprobación, una llamada confirmó `APPROVED` y la otra llegó hasta
recuperar la Membresía pero respondió `500 INTERNAL_ERROR`. El resumen `# fail 2` no representaba un
segundo caso independiente: Node contó el subtest fallido y su suite padre `E2-07 decide Solicitudes`
como dos fallos. Los focales N20 base (13/13), decisión (11/11), huecos (6/6), reactivación (7/7) y
el focal combinado decisión/lifecycle (58/58) pasaron en entornos limpios.

La carrera estaba en `firestoreDashboardTaskOutboxWriter`: dos transacciones idénticas podían leer
el evento ausente y ejecutar `transaction.create(eventRef, ...)`; la primera confirmaba y la segunda
podía recibir código Firestore 6 `ALREADY_EXISTS` en commit en vez de reejecutar la lectura. Ese
error técnico derivado escapaba por la recuperación del comando, aunque el dominio ya estuviera
confirmado. Se reemplazó exclusivamente esa escritura por `transaction.set` después de la lectura
transaccional. Si otra transacción cambia el documento, Firestore invalida la lectura y reejecuta el
callback; entonces el fingerprint existente se valida y devuelve la misma revisión. Una prueba con
12 intents concurrentes demuestra una creación, once recuperaciones, un único evento y
`sourceRevision=1`. El focal E2-07 volvió a pasar 11/11 y el lote 3 completo pasó dentro del gate
integral final.

La primera corrida no preservó el stack crudo: el callable ya había mapeado la causa a
`INTERNAL_ERROR` y el runner eliminó su workspace al cerrar el lote. Por eso no se atribuye un stack
que no fue observado. La evidencia reproducible utilizada fue el patrón exacto de
`transaction.create` concurrente —el diagnóstico canónico del Emulator registra código 6
`ALREADY_EXISTS`—, la inspección del writer afectado y la prueba de convergencia agregada. El focal
E2-07 reforzado confirma además el estado final del comando: Solicitud `aprobada`, una Membresía
activa, coordinación ausente, scope `DIRTY` con `sourceRevision=4/projectedRevision=0` y exactamente
cuatro eventos `PENDING` sin duplicados (`N20_CREATED`, `N20_COORDINATION_STARTED`,
`N31_AUDIENCE_CHANGED`, `N20_RESOLVED`).

### Índice y frontera arquitectónica N20

El índice nuevo `groupJoinRequests(groupId ASC, estado ASC, __name__ ASC)` está justificado por el
scan físico reanudable: filtra un Grupo y `pendiente`, ordena por `documentId` y continúa con cursor
estable. No sustituye ni relaja el índice histórico `groupId, estado, createdAt DESC`. La prueba
`groupJoinRequestArchitecture` exige exactamente ambos índices N20 —por lo que detecta ausencia o
adición no justificada— y conserva `fieldOverrides=[]`. También inspecciona imports cruzados: para
`dashboardTasks` admite sólo la capacidad pública de outbox y rechaza imports de aplicación o
infraestructura interna, además de mantener los controles anteriores para Grupo, Persona,
Membresía y Cuenta.

## 9. Medición sintética

El test instrumental envuelve el Admin SDK usado por el outbox writer y el proyector. Cuenta cada
`get`/`getAll` y cada documento devuelto por query como lectura lógica (una query vacía cuenta una), y
cada `create`/`set`/`update`/`delete` solicitado como escritura lógica. La operación medida comprende:

1. preparación transaccional del evento (`getAll` de evento+scope, escritura de scope y evento);
2. claim transaccional del worker;
3. transacción de aplicación sobre fuentes, manifests, items, contadores, evento y scope;
4. intento de avance contiguo posterior.

Excluye creación/limpieza de fixtures, lectura final de aserción, arranque de emuladores/Functions,
reintentos internos del SDK, almacenamiento de índices, scheduler/trigger, health, cleanup,
reconciliación, enumeración de backfill, payload/memoria y toda consulta IUX-02B. La última corrida
focal produjo:

| Contextos | Tareas fuente N20/N31 | Destinatarios N20/N31 | Copias proyectadas | Lecturas | Escrituras | Lotes `apply` | Máx. copias/lote | Duración Emulator | Reintentos |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3 | 6/6 = 12 | 1/2 | 18 | 159 | 84 | 9 | 4 | 547 ms | 0 |
| 20 | 100/100 = 200 | 1/2 | 300 | 1.660 | 860 | 60 | 10 | 3.053 ms | 0 |
| 100 | 1.000/1.000 = 2.000 | 1/2 | 3.000 | 13.300 | 6.800 | 300 | 20 | 16.850 ms | 0 |

Cada fixture usa un Owner y un reviewer efectivo compartido por escenario. Cada N20 genera una copia
para Owner; cada N31 genera una para Owner y otra para reviewer. Por eso “tareas fuente” y “copias
proyectadas” no son intercambiables. La preparación de fixtures se hace en lotes de hasta 400 y no
integra la medición. Cada contexto pequeño usa tres lotes `apply`: N20, N31 y sweep. Cada lote es una
transacción, además de preparación, claim y avance incluidos en lecturas/escrituras pero no en la
columna de lotes. No hubo reintentos por contención en esta medición.

La reconstrucción de 210 N20 en un contexto convergió en siete lotes —tres páginas N20, una consulta
N31 vacía y tres páginas de sweep— con 1.095 lecturas lógicas, 447 escrituras lógicas y 335 ms en
Emulator. Terminó `READY`, con 210 tareas y sin truncamiento. El evento individual N20 sobre el mismo
contexto usó un lote, 17 lecturas, 10 escrituras y 52 ms: confirma que un cambio de recurso no vuelve
a recorrer el Grupo.

La prueba de concentración mayor usa 650 N20 y una N31. Interrumpe tras el primer lote, aplica las
revisiones concurrentes de audiencia y de un N20 nuevo, vence el lease y reanuda con otro worker.
Durante el hueco `projectedRevision` permanece en cero y nunca aparece `READY`; al completar la
revisión 1 avanza contiguamente hasta la 3 y termina con 652 tareas Owner y una tarea reviewer, sin
duplicar contadores ni sobrescribir manifests de revisión superior.

IUX-02B midió después, por separado, autorización y apertura, suma del total, página/cursor,
revalidación de items, payload, cambio de sesión y descarte de entradas stale. Su
[informe](IUX-02B-informe-implementacion-consulta-tareas-dashboard.md) conserva esa evidencia. Las
duraciones del Emulator son sólo mediciones locales: no demuestran latencia/contención productiva,
presupuesto mensual, el objetivo provisional de 30 segundos ni el umbral de degradación de cinco
minutos.

## 10. Límites y pendientes operativos/productivos

- IUX-02B implementó después el callable, suma/revalidación contextual, paginación, deep-links y
  servicio frontend técnico; permanecen deshabilitados y sin montaje en el dashboard.
- Los triggers existen pero no se exportan sin flag; no hubo deploy ni configuración remota.
- El scan de fuentes ocurre por cambio/reconciliación de un Grupo, no al abrir dashboard. Su costo
  crece con Solicitudes, Entregas y reviewers efectivos del Grupo y debe medirse con distribuciones
  reales autorizadas.
- Una sola página puede fallar todavía si su audiencia produce más de 420 escrituras calculadas; el
  caso típico sería una única N31 con una cantidad patológica de reviewers. El fallo queda visible y
  no trunca, pero resolver ese fan-out intra-recurso requeriría una decisión posterior. La cantidad
  de recursos del Grupo ya no tiene este límite porque se pagina.
- El techo operativo actual de reconciliación es 10.000 Grupos por ejecución. Superarlo falla y
  requiere continuación explícita; no se declara `READY` parcial.
- Health básico no sustituye métricas, alertas, runbook ni evidencia de los objetivos 30 s/5 min/24 h.
- Índices, Rules, triggers, backfill, presupuesto, seguridad, rendimiento y UAT deben validarse en el
  entorno autorizado antes de habilitar lectores o reemplazar el panel anterior.
- Los gates productivos de E3 se preservan sin cambios.

## 11. Inventario de archivos

### Nuevos

- `functions/src/dashboardTasks/**`: modelo, outbox, fuentes, store, worker, operaciones y composición.
- capacidades públicas de proyección N20 y audiencia N31 en sus módulos propietarios.
- triggers inmediato, de recuperación y reconciliación.
- operador Emulator de backfill/rebuild/rollback.
- pruebas unitarias y Emulator IUX-02A.

### Modificados

- writers canónicos enumerados en la matriz;
- `functions/index.js`, guard común de activación, tres handlers y `functions/package.json`;
- `firestore.rules` y `firestore.indexes.json`;
- runner Emulator y expectativas exactas de presupuesto afectadas;
- un fixture unitario de lifecycle para inyectar el puerto de proyección sin mezclar agregados.

## 12. Rollback del cambio local

Antes de cualquier habilitación, el rollback consiste en descartar coordinadamente el módulo,
integraciones de writers, exports y guards de ejecución, Rules, índices y pruebas. No hay migración que
revertir porque esta tarea no escribió datos remotos.

Tras una futura habilitación, primero se deshabilitan productores/worker según runbook, se mantiene
la autoridad en las fuentes originales y se decide si conservar o retirar la persistencia derivada.
Eliminar la proyección nunca debe modificar los recursos originales. Un rollback generacional usa el
procedimiento de §6 y exige que la generación anterior siga retenida.

## 13. Estado del incremento

**IUX-02A implementado y validado técnicamente en local.** IUX-02 completo sigue abierto: IUX-02B
fue implementado y validado después, mientras la integración visual IUX-01 y la habilitación
coordinada requieren autorización separada. `ENABLE_DASHBOARD_TASK_PROJECTION`
permanece deshabilitado por defecto. No se habilitó el reemplazo del panel anterior, no se publicó
un total, no se ejecutó backfill remoto y no se declaró producción apta ni satisfechos los gates
productivos pendientes de E3.
