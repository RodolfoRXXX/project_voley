# Addendum a Documentos 2, 3 y 4 — IUX-02 / proyección de tareas del dashboard

## Estado

- **Naturaleza:** complemento normativo focal adoptado.
- **Estado documental:** `ADOPTADO POR D5-061`.
- **Fecha de adopción:** 2026-10-25.
- **Base:** `dev` en `c02f0afea067dcf4a757c68a9ef5bcd590682c24`.
- **Cobertura:** `IUX-N20` + `IUX-N31`.
- **Implementación:** no autorizada; requiere autorización posterior separada.
- **Ficha:** [IUX-02](../implementacion/interetapa-ux-movil/IUX-02-ficha-consulta-global-tareas-dashboard.md).
- **Evaluación:** [proyección central](../implementacion/interetapa-ux-movil/IUX-evaluacion-arquitectura-proyeccion-dashboard.md).

Este addendum incorpora las decisiones IUX-02-D01–D06 adoptadas por D5-061. Complementa los
Documentos 2, 3 y 4 sin modificar sus archivos base y preserva D5-058–D5-060 como historia. La
adopción documental no autoriza código, producción ni cierre de gates E3.

## 1. Complemento funcional para Documento 2

### 1.1 Caso de uso derivado

Una cuenta autenticada puede consultar en el dashboard global tareas N20/N31 que actualmente puede
atender. La consulta:

- muestra una tarea por recurso accionable;
- deduplica si la cuenta reúne ownership y capability;
- identifica Grupo y Temporada cuando corresponda;
- navega al flujo contextual existente;
- no aprueba, rechaza, recupera, lee/oculta notificaciones ni modifica fuentes;
- no incorpora N30, Torneos legacy, agenda, campana o prioridad.

### 1.2 Autorización y revocación

N20 corresponde únicamente al Owner canónico de Grupo activo. N31 corresponde al Owner según el
contrato vigente, incluido Grupo archivado cuando la operación prearchivo es válida, o a reviewer
efectivo en Grupo activo. El reviewer requiere grant/slot, Persona, Membresía, Período, Temporada,
`validityAnchor` y `ownershipRevision` compatibles y no puede revisar su propia Persona.

Listado y total revalidan todos los contextos que aportan a la respuesta. Revocar capability,
finalizar Membresía, cerrar Temporada, archivar Grupo o cambiar ownership futuro excluye el contexto
de una nueva respuesta aunque la copia derivada aún no se haya limpiado. La información ya vista no
puede retirarse retroactivamente; el frontend la limpia en la consulta siguiente.

### 1.3 Total y estados

`N tareas` es el total deduplicado N20+N31 de la generación y contextos autorizados declarados por
`asOf`; no es cantidad de página ni garantía de sincronización instantánea.

- `READY`: permite badge sin calificador;
- actualización normal: puede conservar valor anterior como “N tareas · Actualizando…”;
- rebuild/cobertura incompleta: no muestra número ni cero;
- degradación/error: identifica datos anteriores y ofrece reintento.

Política de pantalla adoptada: consultar al entrar al
dashboard, al regresar desde una sección contextual y por acción manual. No usar polling periódico,
listener en tiempo real ni refresh automático por focus. Una card ya cargada puede quedar
desactualizada hasta la próxima consulta; su destino revalida estado y autorización.

## 2. Complemento conceptual/técnico para Documento 3

### 2.1 Autoridades

Solicitud, Entrega, Grupo, Capability, Membresía y Temporada conservan sus autoridades. La
proyección es una vista derivada, descartable y reconstruible. Una entrada derivada no resuelve una
tarea y leerla/ocultarla no modifica el dominio.

Identidades:

- `JOIN_REQUEST_DECISION:{requestId}`;
- `PAYMENT_DELIVERY_REVIEW:{deliveryId}`.

Una tarea puede proyectarse para varios usuarios; para una cuenta existe como máximo una copia de la
misma identidad. Notificaciones y agenda futuras no comparten obligatoriamente colección, contador o
ciclo de vida.

### 2.2 Consistencia

Cada cambio canónico cubierto confirma atómicamente la fuente, una revisión monotónica de scope por
Grupo y un evento outbox. El proyector relee la fuente y audiencia actuales. Cada revisión aplicada
queda registrada de forma idempotente; `projectedRevision` sólo avanza hasta la mayor secuencia
**contigua** aplicada desde su valor anterior. Procesar revisión 2 antes que revisión 1 de otro
recurso no permite superar el hueco ni marcar el Grupo `READY`. Sólo
`sourceRevision == projectedRevision`, sin revisiones faltantes/procesando/fallidas y con
schema/generación completos, permite `READY`.

Contadores por usuario/Grupo cambian sólo por transición real `INACTIVE↔ACTIVE`. Rebuild crea una
generación nueva y publica sus contadores al hacer switch; no incrementa sobre la activa.

### 2.3 Privacidad

La persistencia derivada mínima contiene tipo, IDs de fuente/contexto, fechas técnicas y versiones.
No contiene email, cargo, grant, líneas, importe ni nombre de Persona. La presentación se compone en
backend sólo para la página autorizada.

## 3. Complemento de arquitectura para Documento 4

### 3.1 Componentes

- writer común de scope/outbox invocado dentro de las transacciones canónicas;
- worker/proyector con lease, retry e idempotencia;
- manifests privados de audiencia;
- generaciones, items y contadores por usuario;
- query service backend-only;
- reconciliador/backfill por cursor y batches;
- métricas/alarma de lag, fallos y drift.

No se usa el bus en memoria como garantía. Los triggers no son productores primarios. Consultar no
produce writes ni eventos, y no inicia ni solicita reparación durable. La reparación pertenece al
procesamiento de eventos y a la reconciliación operativa independiente.

### 3.2 Persistencia adoptada para implementación futura

```text
dashboardTaskScopes/{groupId}
dashboardTaskOutbox/{eventId}
dashboardTaskManifests/{taskId}
users/{uid}/dashboardTaskProjection/N20_N31_V1
users/{uid}/dashboardTaskSets/{generationId}/items/{taskDocumentId}
users/{uid}/dashboardTaskSets/{generationId}/contexts/{groupId}
```

Rules niegan lectura/escritura cliente. Índices mínimos:

- items activos por `actionableAt DESC, taskType ASC, taskId ASC`;
- outbox por `status, availableAt, createdAt`;
- outbox por `groupId, status, scopeRevision`;
- manifests por `groupId, projectionState, taskType`.

### 3.3 Writers obligatorios

Antes de habilitar deben integrarse y probarse:

1. crear/cancelar/rechazar/coordinar/aprobar Solicitud;
2. informar/confirmar/rechazar Entrega;
3. resolver Entrega desde recepción administrativa;
4. conceder/revocar `GROUP_PAYMENT_NOTICE_REVIEW`;
5. las tres vías vigentes de finalización de Membresía y la reactivación coordinada;
6. cierre de Temporada y archivo de Grupo;
7. cualquier writer futuro de ownership antes de habilitarlo.

Escrituras Admin directas quedan fuera del contrato operativo y requieren reconciliación controlada.

### 3.4 Operación adoptada

Objetivos provisionales sujetos a medición: 95 % de eventos en 30 segundos, degradación a los 5 minutos,
reconciliación cada 24 horas. Retención adoptada de outbox procesado, items inactivos/tombstones,
manifests terminales y generaciones sustituidas: 30 días. Una tarea todavía vigente, su item activo
y su manifest necesario nunca expiran por antigüedad. El presupuesto y la evidencia de rendimiento
son gates futuros; no bloquean iniciar el trabajo autorizado que permita medirlos.

Backfill/rebuild usa generación nueva, high-water mark, replay del outbox, comparación contra fuentes
y switch sólo con cobertura completa. Rollback deshabilita el lector/proyector y no modifica fuentes.

### 3.5 Consulta y paginación adoptadas

La entrada admite `coverage=N20_N31_V1` y un `cursor` opaco opcional. El cursor se firma y liga a la
cuenta autenticada, coverage, generación activa, versión de schema/orden y última tupla
`(actionableAt, taskType, taskId)` examinada. Un cursor alterado, de otra cuenta o de otro orden se
rechaza; una generación sustituida obliga a reiniciar la primera página.

Si la revalidación descarta una card proyectada por estado o autorización, la respuesta la omite,
marca `health=UPDATING`, declara cobertura incompleta y no entrega `totalTasks` vigente. La consulta
no muestra cero, no responde `READY` con un contador contradictorio y no dispara reparación.

## 4. Registro en Documento 5

D5-061 registra una única decisión que:

1. adopte la dirección B y mantenga A sólo como antecedente;
2. conserve IUX-02 como ficha única con cortes internos IUX-02A/IUX-02B;
3. registre dependencias, backfill, gates de seguridad/costo/UAT y rollback;
4. condicione la habilitación de IUX-01 a IUX-02 `READY`;
5. preserve gates productivos E3 y no habilite E4;
6. mantenga notificaciones, agenda, prioridades, N30 y Torneos legacy fuera.

## 5. Decisiones adoptadas

| ID | Decisión | Estado |
| --- | --- | --- |
| IUX-02-D01 | Adoptar la alternativa B definida por la evaluación | ADOPTADA POR D5-061 |
| IUX-02-D02 | Adoptar como objetivos provisionales 30 s / 5 min / 24 h, sujetos a medición | ADOPTADA POR D5-061 |
| IUX-02-D03 | Retener 30 días sólo procesados/inactivos y generaciones sustituidas; nunca tareas vigentes | ADOPTADA POR D5-061 |
| IUX-02-D04 | Adoptar este addendum y registrarlo en Documento 5 | ADOPTADA POR D5-061 |
| IUX-02-D05 | Entrega coordinada IUX-01/IUX-02 condicionada a backfill, seguridad, rendimiento, UAT y gates | ADOPTADA POR D5-061; NO AUTORIZA PRODUCCIÓN |
| IUX-02-D06 | Consultar al entrar, regresar y manualmente; sin polling, listener ni focus | ADOPTADA POR D5-061 |

IUX-02 se implementará como una sola ficha con cortes internos IUX-02A e IUX-02B, seguida por la
integración visual IUX-01. Esta adopción define el diseño; no autoriza iniciar implementación ni
habilitar producción.

## 6. No efectos

Este addendum no autoriza código, Functions, Rules, índices, datos, migración, backfill, deploy,
notificaciones, agenda, cambios de permisos, cierre de E3, habilitación de E4 ni versionado como
implementación. Toda implementación requiere autorización posterior separada.
