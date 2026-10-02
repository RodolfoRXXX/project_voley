# E2-24 — Ficha de Incremento Implementable: eliminación de Grupo / CU-015

## Estado

- **Incremento:** E2-24.
- **Caso de uso:** CU-015 — Eliminar un Grupo.
- **Fecha de consolidación y revisión:** 2026-10-02.
- **Base examinada:** `dev == origin/dev == daade7ebdf3a99da752aa56d451bc2a16d1f5a64`.
- **Estado:** `CONSOLIDADA Y REVISADA — LISTA PARA VERSIONAR`.
- **Decisión funcional:** [addendum E2-24](../../arquitectura/Documento-2-addendum-E2-24-eliminacion-grupo.md).
- **Implementación:** no iniciada ni autorizada por esta ficha.
- **Plan:** E2-14 y Etapa 2 permanecen abiertas; E3 permanece deshabilitada; Auth/UAT continúa aislada.

Esta consolidación incorpora D01-A, D02-A, D03-A, D04-a/b/c, D05-A, D06-A, D07-A y D08-A, y la
decisión de presentación UI-01, aprobadas expresamente por el usuario. No autoriza código, deploy,
Firebase remoto, cambios a los Documentos 1–5, reescritura de cierres ni integración de Auth/UAT.

## 1. Objetivo y resultado funcional

Permitir que el Owner vigente elimine físicamente un Grupo canónico v1 activo creado por error o que
nunca adquirió referencias funcionales. La eliminación sólo procede cuando una evaluación
autoritativa demuestra ausencia total de Temporadas, Membresías, Solicitudes y cualquier otra
referencia funcional, sin importar su estado.

```text
Grupo v1 activo sin referencias --deleteOwnGroup--> raíz ausente
```

La alta mínima y un rename no impiden eliminar. Los receipts técnicos válidos tampoco descalifican
por sí solos: se conservan o correlacionan como evidencia privada para mantener idempotencia y
recovery. Un Grupo archivado nunca es elegible. CU-015 no elimina en cascada, no limpia historia y no
modifica otros Agregados.

Después del efecto, el Grupo no aparece en ninguna consulta o superficie. Sólo el mismo actor, key y
request del delete confirmado recuperan un outcome técnico mínimo; no se devuelve nombre, Owner,
referencias o Grupo actual.

## 2. Fuentes y precedencia

### 2.1 Norma vigente

| Fuente | Regla aplicada |
| --- | --- |
| [Documento 1](../../arquitectura/Documento-1-Arquitectura-del-Producto-y-Modelo-de-Dominio-6.5.pdf), §§3.3–3.5 y 6 | Grupo es unidad de trabajo; actividad se contextualiza por Temporada; cerrar no elimina historia |
| [Documento 1.5](../../arquitectura/Documento-1.5-Modelo-Conceptual-del-Dominio-AUD-C03.pdf), §§2.1, 2.3–2.5 y 2.8 | Owner, Persona, Grupo y Membresía son distintos; ownership es contextual; cada concepto conserva su información |
| [Documento 2](../../arquitectura/Documento-2-Modelo-Funcional-y-Casos-de-Uso-AUD-C04.pdf), PF-02, RF-12, RF-16–25 y CU-011–CU-019 | CU-015 es independiente; borrado físico sólo cuando el dominio lo permite; Grupo con actividad/historia debe archivarse |
| [Addendum E2-24](../../arquitectura/Documento-2-addendum-E2-24-eliminacion-grupo.md) | Cierra actor, elegibilidad, efecto, cupo, privacidad, idempotencia, recovery y ausencia de cascadas; prevalece prospectivamente para CU-015 |
| [Documento 3 AUD-C05](../../arquitectura/Documento-3-Arquitectura-Funcional-y-Dise-o-Tecnico-AUD-C05.pdf), Agregados Grupo/Temporada/Membresía y §§10–11 | Grupo es una raíz; referencias externas conservan Agregado, ownership y transacción propios |
| [Documento 4 AUD-C05](../../arquitectura/Documento-4-Dise-o-de-la-Arquitectura-de-Software-AUD-C05.pdf), §§2–7, 10 y ciclo de vida | Repositorio elimina sólo si negocio autoriza; borrado físico no equivale automáticamente a eliminación conceptual; retención deriva del requisito |
| [Aclaración AUD-C05 Documento 3](../../arquitectura/Documento-3-AUD-C05-aclaracion-periodos-vigencia.md) y [Documento 4](../../arquitectura/Documento-4-AUD-C05-aclaracion-periodos-vigencia.md) | Períodos pertenecen al lifecycle de Membresía y preservan su cronología; no son logs técnicos |
| [Documento 5](../../transicion/Documento%205%20-%20Plan%20de%20Implementación%20y%20Transición%20Técnica-borrador.md), §§3–5, 7.4 y D5-024/025/030/033–035/041 | CU-012–015 son cortes separados; exige contratos, persistencia, frontend, pruebas y retiro por flujo |

AUD-C05 preserva el cuerpo AUD-C04 salvo las cláusulas de Membresía expresamente sustituidas. El
addendum E2-24 complementa Documento 2 sin modificar retroactivamente la evidencia anterior.

### 2.2 Incrementos y decisiones relacionados

| Fuente | Compatibilidad preservada |
| --- | --- |
| [E2-14](./E2-14-informe-auditoria-consolidada-etapa-2.md) y [corrección CU-030](./E2-14-correccion-resolucion-CU-030.md) | E2-F03D sigue abierto hasta implementación/cierre; CU-015 no es el único pendiente |
| [E2-01 ficha](./E2-01-ficha-grupo-ownership.md), [informe](./E2-01-informe-implementacion.md) y [cierre](./E2-01-cierre.md) | Grupo v1, Owner único, guard por Usuario, alta idempotente y límite provisional de uno |
| [E2-20 ficha](./E2-20-ficha-edicion-minima-grupo.md), [informe](./E2-20-informe-implementacion.md) y [cierre](./E2-20-cierre.md) | Rename sólo sobre activo; receipt durable; no existe timeline funcional de nombres; recovery separa efecto aplicado/estado actual |
| [Addendum E2-23](../../arquitectura/Documento-2-addendum-E2-23-archivo-grupo.md), [ficha](./E2-23-ficha-archivo-grupo.md), [informe](./E2-23-informe-implementacion.md) y [cierre](./E2-23-cierre.md) | Archivo preserva identidad/historia, no libera cupo y no habilita delete; v2 es inelegible |
| [DEC-E2-21](./DEC-E2-21-propuesta-decision-funcional.md), [D5-041](./DEC-E2-21-propuesta-ajuste-documento-5.md) y [addendum](../../arquitectura/Documento-2-addendum-DEC-E2-21-diferimiento-CU-013.md) | Diferimiento sólo de CU-013; no cubre CU-015 ni habilita E3 |
| E2-02/E2-15–E2-18 | Temporadas abiertas/cerradas son raíces durables; cualquier Temporada bloquea |
| E2-03/E2-05/E2-09/E2-10/E2-12/E2-18/E2-19/E2-22A | Membresías finalizadas, Períodos y lineage son historia; cualquier Membresía bloquea |
| E2-06–E2-09/E2-18 | Solicitudes terminales conservan outcome; cualquier Solicitud bloquea; coordinación en curso debe concluir por contrato propio |
| E2-13 | Legacy E4 es compatibilidad acotada, nunca autoridad funcional para delete |

## 3. Decisiones aprobadas y trazabilidad D

| Decisión | Contenido incorporado | Secciones |
| --- | --- | --- |
| D01-A | Cero referencias funcionales de cualquier estado; alta/receipts técnicos no descalifican solos | §§1, 5, 6 |
| D02-A | Sólo Grupo canónico v1 activo; archivado no eliminable | §§1, 5.1, 6 |
| D03-A | Sólo Owner vigente | §§5.2, 10 |
| D04-a | Toda Solicitud, incluso terminal, bloquea | §§5.3, 6 |
| D04-b | Crear o renombrar sin referencias no bloquea | §§5.3, 8.4, 9.4 |
| D04-c | No agregar bloqueos mediante «cambios administrativos» | §§5.3, 6 |
| D05-A | Delete válido libera cupo provisional, sin creación múltiple ni política comercial final | §§8.2, 9.3, 11 |
| D06-A | Ausencia total en consultas; recovery privado mínimo del mismo actor/key/request | §§7, 9.1, 10 |
| D07-A | Outcomes técnicos preservados; retries distinguen eliminación posterior y nunca resucitan | §§8.3–8.5, 9.4 |
| D08-A | Borrado físico de raíz; evidencia técnica privada mínima; sin tombstone Owner-visible | §§8, 9 |
| UI-01 | Editar, archivar y eliminar se agrupan en un menú Owner flotante de tres puntos verticales; ninguna opción ejecuta directamente | §§4.1, 12.8, 13–17 |

No queda una decisión funcional bloqueante. La retención es indefinida porque D07-A exige recovery y
no existe ventana máxima aprobada. Un TTL, cleanup o caducidad futura requerirá decisión de producto
separada; no bloquea este incremento porque no se aplica.

## 4. Alcance y exclusiones

### 4.1 Incluido

- preparación Owner-scoped y evaluación exhaustiva de elegibilidad;
- confirmación transaccional y borrado físico de raíz v1;
- liberación atómica del control provisional de creación;
- evidencia privada mínima de delete y correlación con el alta original;
- recovery de delete, creación y rename confirmados;
- adaptación de readers/writers canónicos, Rules, HTTP/legacy y frontend;
- sustitución de los botones Owner independientes por un menú de acciones que abre los diálogos de
  E2-20, E2-23 y E2-24 sin cambiar sus autorizaciones, preparación o confirmación;
- pruebas de referencias, concurrencia, privacidad, pérdida de respuesta y UAT.

### 4.2 Excluido y prohibido

E2-24 no:

- elimina Grupo archivado, legacy o schema incompatible;
- cierra/elimina Temporadas;
- finaliza/elimina Membresías o Períodos ni corta lineage;
- cancela/decide/elimina Solicitudes;
- modifica/elimina Partido, Torneo, Pago, Entrenamiento, Actividad u otro Agregado;
- ejecuta cascada, cleanup, TTL, batch, migración, backfill o reparación silenciosa;
- implementa transferencia, permisos delegados, desarchivo o CU-013;
- autoriza creación múltiple o define Plan/Suscripción;
- crea infraestructura para módulos futuros inexistentes;
- expone evidencia técnica o permite escritura cliente;
- habilita deploy, E3 o cierre de E2-14/Etapa 2.

## 5. Actor, precondiciones e invariantes

### 5.1 Estado de origen

```text
activo v1 + elegible --deleteOwnGroup--> raíz ausente
archivado v2 --deleteOwnGroup--> GROUP_NOT_DELETABLE
legacy/incompatible --deleteOwnGroup--> GROUP_INCOMPATIBLE
```

`GROUP_NOT_DELETABLE` sólo se revela después de acreditar Owner sobre v2. Para actor ajeno, v1/v2
ajeno o inexistente se devuelve `GROUP_NOT_ACCESSIBLE`.

### 5.2 Actor

Sólo `groups/{groupId}.ownerId == auth.uid`, revalidado dentro de preparación y confirmación,
autoriza. El Owner necesita Cuenta canónica compatible, pero no Persona ni Membresía propia. Rol
global, app admin, arrays legacy, integrante, cargo, Plan/Suscripción o ID conocido no autorizan.

### 5.3 Elegibilidad exacta

La confirmación exige simultáneamente:

1. Cuenta compatible y Owner vigente;
2. raíz Grupo v1 activa con schema exacto;
3. token vigente para esa raíz;
4. guard de creación íntegro, perteneciente al actor y correlacionado con el Grupo;
5. cero Temporadas de cualquier estado;
6. cero Membresías de cualquier estado;
7. cero subdocumentos de Períodos y cero lineage dependiente del Grupo;
8. cero Solicitudes de cualquier estado;
9. cero raíces/registros funcionales directos o transitivos existentes en el repositorio actual;
10. cero operaciones/coordinaciones en curso capaces de crear referencias;
11. artefactos técnicos correlacionados e íntegros;
12. ausencia de documento/relación legacy incompatible con el mismo ID.

Crear y renombrar el Grupo no son bloqueos. No se usa «cambios administrativos» como categoría
abierta. Un receipt técnico válido no bloquea por sí solo. Una divergencia, duplicado o referencia
imposible produce `GROUP_INCOMPATIBLE`, nunca elegibilidad.

### 5.4 Invariantes

1. Sólo la raíz Grupo y el control técnico de cupo cambian como estado previo; la evidencia privada
   nueva forma parte de la misma postcondición atómica.
2. Ningún Agregado externo se modifica para confirmar delete.
3. Consultar referencias no amplía el Agregado Grupo.
4. No se elimina una referencia para satisfacer una precondición.
5. Grupo archivado conserva identidad/historia y nunca entra al flujo.
6. Receipt/guard/intento válido es evidencia técnica, no actividad; su referencia al ID eliminado es
   válida si correlaciona con evidencia íntegra de eliminación.
7. Artefacto sin raíz sólo es válido cuando la evidencia aprobada explica la eliminación; en otro caso
   falla cerrado.
8. Retry histórico nunca crea, restaura, borra, modifica, sustituye ni devuelve como actual otro Grupo.
9. Nueva creación requiere intención/key nuevas y vuelve a respetar un solo cupo.

## 6. Matriz cerrada de elegibilidad y referencias

| Evidencia | Clase | ¿Bloquea? | Verificación requerida |
| --- | --- | ---: | --- |
| Grupo v1 activo exacto | Raíz candidata | No por sí solo | Owner, token, guard y schema |
| Grupo v2 archivado | Lifecycle/historia preservada | Sí, inelegible | Rechazo sin mutación |
| Grupo legacy/desconocido | Fuera del canónico | Sí | Fallo cerrado |
| Alta mínima/`createdAt` | Identidad mínima | No | Guard correlacionado |
| Rename y receipt válido | Estado propio + recovery técnico | No | Receipt exacto; sin timeline funcional |
| Temporada abierta | Raíz funcional | Sí | Query por `groupId`, schema e integridad |
| Temporada cerrada | Historia funcional | Sí | Misma query, sin filtrar sólo abiertas |
| Receipt/guard de Temporada válido | Evidencia técnica | No por sí solo | Debe correlacionar con raíz; si existe raíz, ésta bloquea |
| Membresía activa | Raíz funcional | Sí | Query por `groupId` |
| Membresía finalizada | Historia de pertenencia | Sí | Query sin filtro de estado |
| Período abierto/cerrado | Lifecycle interno | Sí | Integridad bajo Membresía |
| `previousMembershipId`/lineage | Historia intertemporada | Sí | Referencias entrantes/salientes coherentes |
| Active/lifecycle guard | Unicidad/coordinación técnica | No por sí solo | Con raíz correlacionada que bloquea; huérfano falla cerrado |
| Solicitud pendiente | Raíz funcional abierta | Sí | Query por `groupId` |
| Solicitud cancelada/rechazada/aprobada | Resultado terminal durable | Sí | Query sin filtro de estado |
| Intent/coordination de Solicitud | Idempotencia/trabajo en curso | Sí si en curso | Correlación con Solicitud; terminal no reemplaza raíz |
| Partido/participación/equipo/entrenamiento | Registro funcional | Sí | Referencia directa o por Membresía/Temporada |
| Torneo/inscripción/equipo de Torneo | Registro funcional | Sí | Referencia actual real |
| Pago/estadística/Actividad/observación | Registro funcional | Sí | Referencia actual real |
| Alerta/notificación/proyección | Derivado | No por sí solo | Fuente original debe existir o derivado debe correlacionar; inconsistencia falla |
| `groupCreationGuard` válido | Cupo/recovery técnico | No | Obligatorio y correlacionado; se libera atómicamente |
| `groupNameUpdateReceipt` válido | Recovery técnico | No | Se retiene y se correlaciona con delete |
| `groupArchiveReceipt` | Recovery de archivo | Sí por incompatibilidad con v1 candidato | Un receipt válido implica v2; v1 + receipt es corrupto |
| Evidencia válida de delete | Outcome técnico posterior | No aplica | Explica referencia técnica al ID ausente; no revive Grupo |

No se crean adaptadores para tipos funcionales que no existen en el repositorio. La implementación
debe barrer el modelo real al momento de codificar y fallar si aparece un writer/referencia productiva
no clasificada.

## 7. Contratos públicos cerrados

### 7.1 `prepareOwnGroupDeletion`

Payload exacto:

```text
{ groupId }
```

Respuesta exitosa para Grupo v1 propio:

```text
{
  group: OwnGroupActive,
  deletionToken,
  eligibility:
    { status: "ELIGIBLE", blockers: [] }
    | { status: "BLOCKED", blockers: [<blocker>, ...] }
}
```

Enum ordenado, cerrado y sin duplicados:

```text
SEASONS_EXIST
MEMBERSHIPS_EXIST
REQUESTS_EXIST
FUNCTIONAL_REFERENCES_EXIST
OPERATION_IN_PROGRESS
```

La preparación es read-only, evalúa todas las referencias y no crea/consume key. No expone IDs,
nombres, cantidades, estados de terceros ni artefactos. Si una referencia es incompatible no se
disfraza como blocker resoluble: devuelve `GROUP_INCOMPATIBLE`.

### 7.2 Token

`deletionToken` es SHA-256 hexadecimal length-prefixed bajo
`sportexa:E2-24:group-deletion-token:v1` y liga, en orden:

1. `contract-v1`;
2. `groupId`;
3. `ownerId`;
4. `nombre`;
5. `deporte`;
6. `estado` (`activo`);
7. `schemaVersion` (`1`);
8. representación canónica de `createdAt`.

El rename cambia el token y exige repreparar. El token no codifica ausencia de referencias ni
autoriza: todo se relee dentro de confirmación. No se reutilizan tokens E2-20/E2-23.

`expectedDeletionToken` acepta exactamente 64 hexadecimales minúsculos. `idempotencyKey` conserva
el patrón `[A-Za-z0-9._:-]{16,128}` y nunca se persiste cruda.

### 7.3 `deleteOwnGroup`

Payload exacto:

```text
{
  groupId,
  expectedDeletionToken,
  idempotencyKey
}
```

Resultado aplicado o recuperado:

```text
{
  outcome: "DELETED" | "EXISTING_IDEMPOTENT",
  recovered: boolean,
  appliedEffect: { outcome: "DELETED", deletedAt }
}
```

No existe `currentGroup`. No se devuelve nombre, Owner, deporte, fecha de creación, referencias,
receipt, hash o schema.

### 7.4 Hashes e identidad técnica

- `idempotencyKeyHash`: SHA-256 length-prefixed con namespace E2-24, actor y key.
- `requestHash`: SHA-256 length-prefixed bajo `sportexa:E2-24:group-deletion-request:v1`, ligando
  `contract-v1`, actor, `groupId`, token esperado e idempotency key.
- `receiptId`: SHA-256 length-prefixed bajo `sportexa:E2-24:group-deletion-receipt:v1`, actor y key.

El receipt exacto se busca antes de depender de la raíz. Sólo coincidencia de actor, key derivada y
request hash recupera. Un receipt con la misma key y otro request produce conflicto.

### 7.5 Errores y consumo de key

| Situación | Resultado/error | Escrituras | Key |
| --- | --- | ---: | --- |
| V1 propio elegible, token vigente, key nueva | `DELETED` | raíz delete + guard delete + receipt create, atómicos | Consumida |
| Mismo actor/key/request confirmado | `EXISTING_IDEMPOTENT` | 0 | Ya consumida; recovery |
| Misma key, payload/token/grupo distinto | `IDEMPOTENCY_CONFLICT` | 0 | Consumida por request original |
| Otra key sobre Grupo ya eliminado | `GROUP_NOT_ACCESSIBLE` | 0 | No consumida |
| Recurso inexistente o ajeno | `GROUP_NOT_ACCESSIBLE` | 0 | No consumida |
| Grupo v2 propio | `GROUP_NOT_DELETABLE` | 0 | No consumida |
| Token stale sobre v1 propio | `STALE_DELETION` | 0 | No consumida |
| Temporada existente | `SEASONS_EXIST` | 0 | No consumida |
| Membresía/Período/lineage existente | `MEMBERSHIPS_EXIST` | 0 | No consumida |
| Solicitud de cualquier estado | `REQUESTS_EXIST` | 0 | No consumida |
| Otra referencia funcional | `FUNCTIONAL_REFERENCES_EXIST` | 0 | No consumida |
| Operación capaz de crear referencia en curso | `OPERATION_IN_PROGRESS` | 0 | No consumida |
| Guard/receipt/schema/referencia incompatible | `GROUP_INCOMPATIBLE` | 0 | No consumida |
| Conflicto transaccional agotado | `GROUP_CONFLICT` | 0 confirmado por este intento | No consumida si no hay receipt |
| Dependencia caída | `DEPENDENCY_UNAVAILABLE` | 0 confirmado por este intento | No consumida si no hay receipt |

Blockers se devuelven completos en preparación y como error estable en confirmación. El frontend
reprepara ante stale; no encadena operaciones para resolverlos.

## 8. Persistencia mínima y retención

### 8.1 Raíz y evidencia privada

La raíz `groups/{groupId}` se elimina físicamente. Se introduce una única colección técnica porque
es necesaria para D06/D07 y no existe un artefacto actual capaz de recuperar delete tras desaparecer
la raíz:

```text
groupDeletionReceipts/{receiptId}
  action: "DELETE_GROUP"
  actorUserId
  groupId
  idempotencyKeyHash
  requestHash
  creationIdempotencyKeyHash
  creationRequestHash
  deletedAt
  outcome: "DELETED"
  receiptVersion: 1
```

No guarda nombre, deporte, Owner separado del actor, `createdAt`, snapshot de Grupo, razones,
referencias, blockers ni documentos de otros Agregados. `actorUserId` es necesario para autenticar
recovery; `groupId` correlaciona receipts históricos; los hashes de creación permiten conservar el
outcome E2-01 al liberar el guard singleton.

El receipt es deny-all por Rules y sólo lo leen stores canónicos de delete, creación y rename. No es
Grupo, tombstone Owner-visible, historia funcional, actividad ni fuente de autorización general.

### 8.2 Efecto atómico sobre `groupCreationGuards`

La confirmación lee `groupCreationGuards/{actorUserId}` y exige:

- schema exacto vigente;
- `groupId` igual a la raíz candidata;
- hashes y timestamp válidos;
- correlación Owner/Grupo.

En un único commit:

1. crea el receipt de eliminación con copia de los dos hashes de creación necesarios;
2. elimina `groups/{groupId}`;
3. elimina `groupCreationGuards/{actorUserId}`.

Así libera el cupo sin perder la prueba del alta anterior. Si guard y raíz divergen, delete falla
cerrado. No se introduce un guard nuevo. Crear B usa el mismo guard E2-01 libre y una key nueva.

### 8.3 Retención

`groupDeletionReceipts`, `groupNameUpdateReceipts` y demás evidencia confirmada relacionada se
retienen indefinidamente. D07-A exige retries históricos estables y no existe ventana máxima
aprobada. La retención es la mínima consecuencia de esa garantía, no una política general de
auditoría.

No se aprueba TTL o cleanup. Adoptar una ventana finita exigiría decidir duración, resultado después
de expirar, impacto en reutilización de keys y compatibilidad con E2-01/E2-20; queda como futura
decisión de producto no bloqueante.

### 8.4 Recovery de creación E2-01

`createOwnGroup` debe consultar dentro de su unidad confirmatoria:

1. Cuenta;
2. guard vigente del actor;
3. evidencia de eliminación por `actorUserId + creationIdempotencyKeyHash`, con cardinalidad máxima
   uno e integridad exacta;
4. Grupos propios actuales cuando corresponda.

Orden semántico:

- si la key/request coinciden con evidencia histórica, devolver `CREATED_THEN_DELETED`,
  `recovered: true`, `currentGroup: null` y sólo `deletedAt` como efecto posterior;
- si la key coincide y request difiere, `IDEMPOTENCY_CONFLICT`;
- una evidencia duplicada/corrupta falla cerrado;
- sólo si no hay coincidencia histórica, aplicar guard y límite actuales;
- la creación nueva exige key nueva, crea B + guard en forma atómica y conserva máximo uno vigente.

Resultado mínimo agregado al contrato de creación:

```text
{
  outcome: "CREATED_THEN_DELETED",
  recovered: true,
  appliedEffect: { outcome: "CREATED" },
  subsequentEffect: { outcome: "DELETED", deletedAt },
  currentGroup: null
}
```

No devuelve ID, nombre, Owner ni B. No reconstruye A desde el request.

### 8.5 Recovery de rename E2-20

`updateOwnGroupName` conserva el lookup determinista del receipt de rename. Si key/request coinciden,
la raíz A está ausente y existe exactamente un deletion receipt íntegro del mismo actor/`groupId`
con `deletedAt >= confirmedAt`, devuelve:

```text
{
  outcome: "UPDATED_THEN_DELETED",
  recovered: true,
  appliedEffect: { outcome: "UPDATED", confirmedAt },
  subsequentEffect: { outcome: "DELETED", deletedAt },
  currentGroup: null,
  currentEditToken: null
}
```

No devuelve `appliedName`, nombre actual, Owner o B. Si el rename nunca se confirmó no existe su
receipt: al faltar A devuelve `GROUP_NOT_ACCESSIBLE`. Receipt de rename sin raíz ni evidencia válida
de delete es incompatible, no «eliminado» inferido.

### 8.6 Archivo E2-23

Un v2 archivado nunca se elimina. Su raíz y `groupArchiveReceipt` permanecen, por lo que recovery
E2-23 no cambia. Un `groupArchiveReceipt` correlacionado con una raíz v1 candidata es corrupción y
bloquea. No hay escenario válido `ARCHIVED_THEN_DELETED`.

## 9. Escenarios normativos cerrados

### 9.1 Eliminar A y crear B con intención nueva

1. Delete A confirma raíz delete + guard A delete + deletion receipt A.
2. El Usuario inicia una creación nueva con key/payload nuevos.
3. Alta comprueba que no corresponden a evidencia histórica y que no hay guard/Grupo vigente.
4. Crea B y guard B atómicamente.
5. A continúa ausente; B es el único Grupo vigente.

### 9.2 Retry de creación A después de eliminar A

La key/request originales coinciden con el deletion receipt. Devuelve `CREATED_THEN_DELETED`, sin
Grupo actual ni campos de A. No crea guard o raíz.

### 9.3 Retry de creación A cuando B ya existe

La evidencia histórica de A se evalúa antes de tratar la key como intención nueva. Devuelve
`CREATED_THEN_DELETED`; no devuelve B, no consume su guard y no lo modifica, elimina o sustituye.

### 9.4 Recovery de rename confirmado de A después de eliminar A

Receipt E2-20 + deletion receipt correlacionado devuelven `UPDATED_THEN_DELETED`, timestamps y
`currentGroup: null`. No devuelven nombre ni B.

### 9.5 Retry de operación nunca confirmada sobre A eliminado

Sin receipt de esa operación no existe efecto recuperable. Devuelve `GROUP_NOT_ACCESSIBLE`, cero
escrituras y key no consumida por un receipt retroactivo. No se fabrica éxito desde payload cliente.

### 9.6 Repetición de delete

- misma key/request: `EXISTING_IDEMPOTENT`, mismo `deletedAt`, cero escrituras;
- otra key: `GROUP_NOT_ACCESSIBLE`, cero escrituras y sin revelar que hubo delete;
- misma key con payload/token/group distinto: `IDEMPOTENCY_CONFLICT`, cero escrituras.

### 9.7 Regla absoluta sobre B

Ningún retry histórico de A puede borrar, modificar, sustituir, recrear o devolver B, ni presentar A
como estado actual. La única operación que afecta B es una intención nueva autorizada sobre B.

## 10. Autorización, privacidad y no enumeración

- Preparación y primera confirmación leen Cuenta + raíz y acreditan Owner antes de revelar estado.
- Inexistente y ajeno convergen en `GROUP_NOT_ACCESSIBLE`.
- `GROUP_NOT_DELETABLE`, stale y blockers sólo aparecen después de acreditar Owner.
- Recovery de delete comienza por receipt determinista actor+key; actor/request deben coincidir.
- La evidencia sólo autentica el actor del efecto almacenado. No permite listar eliminados, obtener
  detalle por `groupId`, operar sobre un recurso ausente ni recuperar con otra key.
- Recovery histórico de creación busca por actor + hash de la key presentada, no por `groupId` libre.
- Recovery de rename exige receipt propio actor+key antes de correlacionar delete.
- Blockers no contienen IDs, cantidades, personas, nombres o estados terminales.
- Corrupción, paths, hashes, guards y receipts nunca salen del backend.

## 11. Concurrencia y serialización

### 11.1 Unidades confirmatorias existentes

Los writers canónicos adaptados por E2-23 leen Grupo activo dentro de su transacción:

- Temporada: apertura, edición y cierre;
- Membresía: alta, reactivación, renovación, finalización, salida y cargo;
- Solicitud: creación, cancelación, decisión y pasos de approval coordination;
- Grupo: rename y archivo.

Delete relee la misma raíz y todas las referencias antes de escribir. Firestore reintenta si una
lectura cambia. Por lo tanto:

- writer de referencia primero: delete reintenta y observa blocker;
- delete primero: writer reintenta/no encuentra v1 activo y no crea referencia;
- query vacía nunca se considera lock independiente de la relectura transaccional de raíz.

### 11.2 Delete frente a nueva creación

Delete A y creación B del mismo Owner tocan `groupCreationGuards/{uid}`. El delete sólo libera el
guard en el commit que elimina A y crea evidencia; alta sólo crea B + guard si el guard está libre,
no hay Grupo vigente y la key no pertenece a una creación eliminada. Esto evita dos raíces vigentes y
la ventana «guard libre con A existente».

### 11.3 Writers legacy, HTTP y triggers

- Writers organizativos legacy permanecen tombstones E2-13 y no se reactivan.
- `httpApi.js` y BFF públicos son read-only para Grupo; schemas v1/v2 siguen excluidos de catálogo
  legacy.
- Servicios/callables deportivos E4 que crean Partido/Torneo/inscripción deben exigir Grupo legacy y
  fallar cerrado para v1/v2; no adquieren soporte para delete canónico.
- Triggers de Partido, participación, alertas y notificaciones no crean referencias organizativas
  canónicas desde un v1 sin pasar por un writer elegible. El barrido de implementación debe probarlo.
- Si se detecta un writer productivo que pueda referenciar v1 sin leer la raíz en su unidad
  confirmatoria, debe adaptarse o excluir v1 antes de cerrar; no se agrega lock especulativo.

### 11.4 Carreras obligatorias

| Carrera | Resultado |
| --- | --- |
| Temporada vs delete | Una confirma; la otra bloquea/no accede; nunca Temporada huérfana |
| Membresía/Período vs delete | Igual; incluye reactivación y renovación |
| Solicitud/decisión/coordinación vs delete | Igual; toda Solicitud confirmada bloquea |
| Rename vs delete | Rename primero vuelve token stale; delete primero impide rename nuevo |
| Archive vs delete | Uno serializa; v2 resultante no es eliminable |
| Dos deletes misma key | Un commit y un recovery |
| Dos deletes keys distintas | A lo sumo uno aplica; el otro no accede |
| Delete A vs crear B | Serialización por guard; B sólo después del commit completo de delete |
| Retry A vs B vigente | Sólo resultado histórico de A; B intacto y no devuelto |

## 12. Inventario técnico exhaustivo

### 12.1 Grupo y wiring

- `groups/domain/group.js`: v1/v2; no se agrega estado «eliminado».
- `groupContract.js`, `groupDto.js`, `groupErrors.js`, `groupHashing.js`, `groupService.js`:
  contratos, errores, token/hashes, prepare/confirm y nuevos outcomes históricos.
- `firestoreGroupRepository.js`: delete puntual de raíz; sin delete genérico/cascada.
- `firestoreOwnGroupsReader.js`: raíz ausente desaparece de todos los resultados.
- `firestoreGroupCreationGuard.js`: consulta de outcomes eliminados, liberación y alta B.
- `firestoreGroupNameUpdateStore.js`: `UPDATED_THEN_DELETED` privado.
- `firestoreGroupArchiveStore.js`: v2 sin cambios e inelegible.
- `groupArchiveReceipts.js`, `groupNameUpdateReceipts.js`: hydrators retenidos.
- nuevo hydrator/store del receipt de eliminación, justificado por D06/D07.
- `groupModule.js`, `groupCallable.js`, `functions/index.js`: wiring/export; tombstones intactos.
- `firestoreMemberContext.js` y capabilities públicas: ausencia falla cerrado.

### 12.2 Temporada

- `seasons`, `openSeasonGuards`, `seasonOpeningReceipts`, `seasonClosureReceipts` y
  `seasonUpdateReceipts`.
- `firestoreOpenSeasonGuard.js`, `firestoreOpenSeasonReader.js`, `firestoreSeasonRepository.js`,
  `firestoreSeasonUpdateStore.js`, `firestoreSeasonClosureStore.js`,
  `firestoreSeasonHistoryReader.js`.
- servicio, contrato, DTO, cursor, hashing, module, callables y frontend de apertura/edición/cierre/
  historia.
- La elegibilidad consulta todas las raíces `seasons` por `groupId`, no sólo abiertas. Receipts/guard
  se validan para integridad y nunca se borran por CU-015.

### 12.3 Membresía

- `memberships` v1/v2/v3 y subcolección `validityPeriods`.
- `activeMembershipGuards`, `membershipLifecycleGuards`, `membershipSelfExitIntents`,
  `membershipAdministrativeFinalizationIntents`, `membershipCargoUpdateReceipts`.
- repositories, lifecycle/active guards, stores de salida/finalización/cargo, readers propio/actual/
  roster/historia, contexts, capabilities, módulo y callables.
- Queries de elegibilidad no filtran estado. Períodos y lineage se inspeccionan como integridad de
  raíces que ya bloquean; no se crea un índice/infraestructura sin necesidad demostrada por query.

### 12.4 Solicitud

- `groupJoinRequests` de todo estado;
- `pendingGroupJoinRequestGuards`, `groupJoinRequestIntents`,
  `groupJoinRequestDecisionIntents`, `groupJoinRequestApprovalCoordinations`;
- repository/store, servicio, contracts, DTO, hashing, capabilities Grupo/Temporada/Membresía,
  module/callables y frontend de candidata/pendientes/decisión.
- Toda raíz bloquea. Coordinación en curso añade `OPERATION_IN_PROGRESS`; no se consume ni repara.

### 12.5 Referencias deportivas y E4 existentes

Barrido por referencia directa/transitiva y writers en:

- `matches`, `participations`, `teams`, `groupStats`;
- `tournaments`, `tournamentRegistrations`, `tournamentTeams`, fases, partidos, standings y reglas
  de avance que realmente contengan `groupId`;
- servicios `adminAccessService`, `adminMatchService`, `teamsService`, `rankingService`,
  `tournamentRegistrationService`, `pendingAlertsService`, `tournamentPendingAlertsService`;
- callables de Partido/Torneo, `events/notificationHandler.js` y triggers `onMatchDeadline`,
  `onMatchStart`, `onParticipationUpdate`, `onGroupPendingAlertsSync` y sincronizaciones de Torneo;
- API/BFF públicos de Grupo y consumidores frontend de Partido/Torneo.

E2-24 no construye pagos, entrenamientos o Actividad inexistentes. Si el código actual no contiene su
persistencia, sólo se preserva la regla para que una incorporación futura de esos módulos deba
participar del contrato antes de habilitar delete.

### 12.6 Rules, HTTP y legacy

- `firestore.rules`: `groups` continúa sin delete cliente; nuevo receipt deny-all; colecciones E2
  siguen deny-all.
- Helpers legacy deben seguir excluyendo schema v1/v2 y no tratar ausencia como permiso.
- `httpApi.js`: GET públicos excluyen v1/v2; tombstones de writers siguen `410`; no se agrega endpoint
  HTTP de delete.
- BFF `api/groups/public` y detalle público continúan read-only y sin documentos canónicos.
- `toggleGroupActivo`, `editGroup`, `transferGroupOwnership` y administración legacy continúan
  retirados; no se reutilizan.
- Consumers E4 de arrays/roles sólo conservan lectura legacy y nunca son elegibilidad/autoridad.

### 12.7 Índices

No se aprueba un índice especulativo. Deben probarse los queries reales por `groupId` para raíces
funcionales y las búsquedas privadas de deletion receipt por:

- `actorUserId + creationIdempotencyKeyHash`;
- `actorUserId + groupId` para correlacionar rename.

Se agrega únicamente el índice que Emulator/query plan demuestre necesario. Cardinalidad distinta de
cero/uno en evidencia técnica falla cerrado.

### 12.8 Frontend y consumidores de contratos

- `types/OwnGroup.ts` conserva la unión v1/v2; no agrega un tipo Owner-visible «eliminado».
- `services/groupsService.ts` incorpora prepare/confirm, errores y recovery mínimo.
- `app/(protected)/dashboard/groups/page.tsx` relee el cupo y excluye A ausente.
- `components/groups/GroupPageShell.tsx` hoy renderiza título y descripción sin slot de acciones; debe
  admitir la ubicación del menú junto al encabezado sin alterar otras páginas que usan el shell.
- `app/(protected)/dashboard/groups/[groupId]/page.tsx` hoy monta dos botones independientes dentro de
  la tarjeta: `EditGroupNameDialog` y `ArchiveGroupDialog`. Debe montar un único coordinador
  Owner-scoped de menú/diálogos junto al encabezado y descartar todo estado al confirmar/perder acceso.
- `components/groups/EditGroupNameDialog.tsx` y `ArchiveGroupDialog.tsx` conservan diálogos,
  preparación, contratos, single-flight y manejo de stale, pero dejan de renderizar disparadores
  grandes propios. Reciben apertura controlada y retorno de foco común sin reescribir E2-20/E2-23.
- el diálogo E2-24 se integra bajo el mismo coordinador y conserva preparación backend obligatoria;
  seleccionar «Eliminar grupo» nunca confirma ni escribe directamente.
- `components/ui/share/ShareOptionsButton.tsx` es el patrón estructural reutilizable más cercano:
  botón circular, `aria-haspopup="menu"`, `aria-expanded`, `role="menu"`, `role="menuitem"`, anclaje
  relativo y cierre por clic exterior. No se copia sin completar: hoy carece de Escape, foco inicial,
  navegación por flechas y devolución de foco documentada.
- `Navbar.tsx` y el menú de acciones rápidas del dashboard no constituyen un patrón accesible completo
  y no deben reutilizarse como autoridad; su existencia no amplía roles ni autorización de Grupo.
- Temporadas (`OpenSeasonSection`, `EditSeasonSection`, `SeasonHistorySection`), Membresías
  (`OwnMembershipSection`, `MyCurrentGroupMembershipsSection`, `ActiveGroupMembersSection`,
  `OwnGroupMembershipHistorySection`) y Solicitudes (`GroupJoinRequestCandidate`,
  `PendingGroupJoinRequestsSection`) deben tolerar la retirada del contexto sin conservar datos
  Owner-scoped ni emitir mutaciones tardías.
- páginas públicas/join y consumidores de Partido/Torneo continúan excluyendo v1/v2 canónicos según
  sus contratos; no se les entrega un DTO de Grupo eliminado.

## 13. Frontend

### 13.1 Ubicación y disponibilidad

En el detalle Owner `/dashboard/groups/[groupId]`, el encabezado que contiene nombre y descripción
ubica a su derecha un botón flotante de ícono de tres puntos verticales. El nombre accesible exacto es
`Acciones del grupo`; el ícono es decorativo y no sustituye el nombre. El botón mantiene target mínimo
de 44 × 44 CSS px, foco visible y estados `aria-haspopup="menu"` y `aria-expanded`.

El menú reemplaza —no duplica— los botones grandes independientes. Para Grupo v1 activo propio
contiene exactamente, en este orden:

1. `Editar nombre`, que abre el diálogo E2-20 existente;
2. `Archivar grupo`, que abre el diálogo E2-23 existente y ejecuta su preparación;
3. `Eliminar grupo`, que abre la preparación y confirmación E2-24.

No contiene configuración CU-013, transferencia, desarchivo ni accesos deportivos. En un Grupo
archivado no existe ninguna de las tres acciones; como no hay acciones disponibles, el botón y el
menú están ausentes, no deshabilitados. Tampoco aparecen en dashboard genérico, historia, perfil,
catálogo, join o superficies legacy.

### 13.2 Patrón de menú y teclado

Se adopta el patrón ARIA menu button a partir de la estructura de `ShareOptionsButton`, completándolo:

- `Enter`, `Space` o `ArrowDown` sobre el botón abre el menú y enfoca la primera opción;
- `ArrowUp` sobre el botón abre y enfoca la última opción;
- dentro del menú, `ArrowDown`/`ArrowUp` recorren circularmente opciones habilitadas;
- `Home` y `End` enfocan primera y última opción;
- `Enter` o `Space` activa la opción enfocada;
- `Escape` cierra el menú y devuelve foco al botón;
- `Tab`/`Shift+Tab` cierran el menú y permiten continuar el orden normal de tabulación, sin atrapar el
  foco en un menú ya cerrado;
- clic/pointer exterior cierra el menú; si el foco estaba dentro, vuelve al botón, y si el usuario ya
  enfocó deliberadamente otro control se conserva ese destino;
- un segundo clic en el botón cierra y conserva foco en el botón;
- sólo una opción tiene `tabIndex=0` en la navegación interna; las demás siguen el patrón roving.

El menú no usa hover como único medio de apertura, no abre al recibir foco y no ejecuta acciones al
navegar. Cada opción es un `button` con `role="menuitem"`; no se usan enlaces ni elementos inertes
simulando botones.

### 13.3 Apertura de diálogos y gestión de foco

Al elegir una opción, el menú se cierra primero y luego abre el diálogo correspondiente:

- E2-20 enfoca el campo de nombre una vez cargado el valor autoritativo;
- E2-23 enfoca Cancelar o Confirmar según loading/blockers, conservando su preparación backend;
- E2-24 enfoca el primer control seguro del diálogo y nunca el botón destructivo por defecto; la
  preparación backend comienza al abrir y sigue siendo la única autoridad de elegibilidad.

Los diálogos mantienen `role="dialog"`/`alertdialog`, `aria-modal`, trap de foco, Escape cuando no hay
una confirmación in-flight y sus mensajes `aria-live`. Cancelar, cerrar o Escape devuelve foco al botón
`Acciones del grupo`, no a un disparador interno eliminado. Cerrar un diálogo no reabre el menú.

Si E2-20 confirma, el diálogo se cierra, el encabezado muestra el nombre vigente y el foco vuelve al
botón. Si E2-23 confirma, el Grupo pasa a archivado y el botón deja de existir: el foco se mueve al
encabezado/estado `Organización archivada` con `tabIndex=-1` y el anuncio de éxito se emite una sola
vez. Si E2-24 confirma, se descarta el detalle y se navega a `/dashboard/groups`; el foco se coloca en
el encabezado o aviso de resultado del destino, nunca en un nodo desmontado.

### 13.4 Autorización, stale y blockers

El menú se deriva exclusivamente del DTO Owner-scoped vigente, pero no autoriza ni decide
elegibilidad. Cada acción revalida backend y conserva token, idempotencia, stale y confirmación de su
incremento. En particular, E2-24 siempre ejecuta `prepareOwnGroupDeletion`; no oculta blockers por
inferencias parciales del frontend ni transforma ausencia aparente de secciones en elegibilidad.

Al perder autorización o recibir `GROUP_NOT_ACCESSIBLE`, se cierran menú y cualquier diálogo, se
invalidan generaciones/intents locales, se retira todo detalle Owner-scoped y se navega a una ruta
segura. Ninguna respuesta tardía puede volver a abrir el menú, repoblar el diálogo o devolver foco a un
nodo de otro Grupo.

### 13.5 Presentación y opción destructiva

El menú se alinea al borde del encabezado, por defecto hacia adentro del viewport, y puede invertir
alineación vertical/horizontal según espacio disponible. Usa posicionamiento con `z-index` suficiente,
ancho acotado, altura máxima y scroll interno cuando corresponda. A 360 px y zoom 200 % no produce
scroll horizontal, no queda recortado por la tarjeta/header y mantiene ícono, opciones y targets
utilizables.

`Eliminar grupo` aparece como opción destructiva separada visualmente de las demás mediante divisor,
texto explícito y un icono/indicador accesible acompañado por la palabra «Eliminar». Puede usar color
de peligro como apoyo, pero no depende sólo del color. `Archivar grupo` no se presenta como delete.

Seleccionar `Archivar grupo` o `Eliminar grupo` nunca ejecuta el efecto: únicamente abre su diálogo y
preparación. Las confirmaciones mantienen explicación, consecuencias, blockers y botón final
inequívoco. No se ofrece cleanup, «eliminar de todos modos», archivo automático, finalización o
decisión en lote.

## 14. Criterios Dado/Cuando/Entonces

1. Dado v1 activo propio sin referencias, cuando confirma token/key vigentes, entonces raíz y guard
   desaparecen y receipt mínimo se crea atómicamente.
2. Dada Temporada abierta o cerrada, entonces delete bloquea y no escribe.
3. Dada Membresía activa/finalizada, Período o lineage, entonces bloquea.
4. Dada Solicitud pendiente/cancelada/rechazada/aprobada, entonces bloquea.
5. Dada otra referencia funcional directa/transitiva, entonces bloquea.
6. Dado Grupo sólo creado o renombrado con receipts íntegros, entonces esos hechos no lo descalifican.
7. Dado Grupo archivado propio, entonces `GROUP_NOT_DELETABLE`; ajeno no enumera.
8. Dado rol global/integrante/no-Owner, entonces no autoriza ni revela blocker/estado.
9. Dado token stale por rename, entonces cero escrituras y repreparación obligatoria.
10. Dada respuesta perdida después del commit, misma key/request recupera mismo `deletedAt`.
11. Dada misma key con otro payload, entonces conflicto y cero escrituras.
12. Dada otra key sobre A eliminado, entonces no accesible y sin oracle.
13. Dado delete A y nueva intención B, entonces B puede crearse como único Grupo vigente.
14. Dado retry de creación A tras delete, entonces `CREATED_THEN_DELETED`, sin A actual.
15. Dado retry de creación A con B vigente, entonces B permanece intacto y no se devuelve.
16. Dado retry de rename A confirmado, entonces `UPDATED_THEN_DELETED`, sin nombre ni Grupo actual.
17. Dada operación sobre A nunca confirmada, entonces no accesible y ningún receipt retroactivo.
18. Dado artefacto técnico correlacionado con delete, entonces no se clasifica como corrupción por la
    sola referencia a A.
19. Dado artefacto huérfano sin evidencia válida, entonces incompatible y sin reparación.
20. Dada carrera con writer de referencia, entonces sólo un orden serializable confirma y no queda
    referencia huérfana.
21. Dada carrera delete A/crear B, entonces guard nunca permite dos raíces vigentes.
22. Dado cliente Firestore, entonces no puede borrar Grupo ni leer/escribir receipts.
23. Dado rollback, entonces no resucita A, no borra evidencia y no afecta B.
24. Dado detalle Owner de Grupo v1 activo, entonces existe un único botón `Acciones del grupo` junto
    al encabezado y no existen botones grandes duplicados de editar, archivar o eliminar.
25. Dado el menú abierto, entonces presenta exactamente editar, archivar y eliminar en ese orden;
    ninguna selección ejecuta directamente archivo o eliminación.
26. Dado Grupo archivado, entonces menú y botón están ausentes porque no existen acciones disponibles.
27. Dado teclado, cuando se usa Enter/Space/flechas/Home/End/Escape/Tab, entonces apertura,
    navegación, activación, cierre y foco cumplen §13.2.
28. Dado clic exterior, entonces el menú cierra sin activar opciones y conserva/restaura foco según el
    destino real del usuario.
29. Dado que se abre un diálogo desde el menú, entonces el foco entra al control seguro definido; al
    cancelar/cerrar vuelve al botón de tres puntos y el menú no se reabre.
30. Dado rename exitoso, entonces encabezado y diálogo E2-20 conservan conducta y el foco vuelve al
    botón común.
31. Dado archivo exitoso, entonces el menú desaparece y el foco pasa al estado archivado, sin apuntar
    al botón desmontado.
32. Dado delete exitoso, entonces el detalle se desmonta, se navega seguro y el foco pasa al resultado
    del destino.
33. Dada pérdida de autorización con menú o diálogo abierto, entonces ambos se retiran, se invalidan
    respuestas tardías y no permanece información Owner-scoped.
34. Dado viewport de 360 px o zoom 200 %, entonces el menú se reposiciona sin recorte ni scroll
    horizontal y mantiene opciones/targets utilizables.
35. Dada opción `Eliminar grupo`, entonces su carácter destructivo se comunica con texto, separación
    e indicador adicional, no sólo mediante color.
36. Dada información frontend aparentemente vacía, cuando se elige archivar/eliminar, entonces se
    ejecuta la preparación backend y se muestran sus blockers autoritativos.

## 15. Pruebas requeridas

### 15.1 Dominio y contratos

- v1 activo elegible; v2/legacy/incompatible rechazados;
- payloads cerrados, patterns, token/hash/receipt ID y DTO exactos;
- blockers ordenados/minimizados;
- errores y consumo/no consumo de key;
- receipt sin campos prohibidos.

### 15.2 Aplicación y persistencia

- Owner con Cuenta y sin Persona/Membresía puede eliminar;
- no-Owner/global admin/ID conocido no autorizan;
- raíz + guard delete + receipt create atómicos;
- ausencia de cascadas y cardinalidad exacta de tres escrituras;
- cada referencia de §6 en todos sus estados;
- guard de creación faltante/corrupto/mismatched;
- evidencia delete duplicada/corrupta;
- referencia técnica válida posterior a delete no considerada huérfana;
- dependencia caída/conflicto sin éxito ambiguo.

### 15.3 Recovery y regresión

- mismos/diferentes actor, key, request, token y groupId;
- pérdida de respuesta antes/después del commit;
- A eliminado → retry creación;
- A eliminado → B creado → retry creación A;
- A renombrado/eliminado → retry rename;
- rename no confirmado → A eliminado → no accesible;
- v2 y recovery E2-23 intactos;
- E2-01 no crea con key histórica ni devuelve B;
- listados/detalles/history no presentan A;
- tombstones y allowlist E4 siguen sin autoridad.

### 15.4 Concurrencia y arquitectura

- todas las carreras de §11.4 mediante barreras deterministas;
- cada writer canónico lee raíz en su unidad confirmatoria;
- writers E4 excluyen v1/v2;
- frontend no importa Firestore para delete;
- sólo stores/repositories canónicos escriben raíz, guard y receipt;
- ningún nuevo guard/lock/worker/trigger/TTL/cleanup.

### 15.5 Menú, diálogos y regresión frontend

- render Owner activo con un solo disparador y tres `menuitem`; archivado/no autorizado sin menú;
- nombre accesible exacto, `aria-haspopup`, `aria-expanded`, roles y roving `tabIndex`;
- apertura por Enter/Space/ArrowDown/ArrowUp y navegación ArrowUp/Down/Home/End;
- Escape, Tab, Shift+Tab, segundo clic y pointer exterior sin activación accidental;
- selección cierra menú y abre exactamente un diálogo;
- cancelación de E2-20/E2-23/E2-24 devuelve foco al botón común;
- rename exitoso actualiza encabezado sin regresión de token/stale/single-flight;
- archive conserva preparación/blockers/confirmación E2-23 y mueve foco al estado archivado;
- delete conserva preparación/blockers/confirmación E2-24 y mueve foco al destino;
- pérdida de autorización y navegación A→B invalidan menú, diálogos y respuestas tardías;
- opción destructiva reconocible sin color y snapshot/inspección a 360 px y zoom 200 %;
- frontend vacío o desactualizado nunca evita prepare ni sustituye blockers backend.

### 15.6 Rules y calidad

- deny-all del receipt y delete cliente de Grupo;
- schema futuro no cae en acceso legacy por comparación incompleta;
- unitarias, contractuales, arquitectura, Rules y Emulator focal;
- regresión completa, lint baseline, typecheck, build, sintaxis y `git diff --check` durante la futura
  implementación.

## 16. UAT futura

Sólo Auth/Functions/Firestore Emulator, proyecto `demo-*`, loopback y datos sintéticos.

### 16.1 Recorrido manual

1. Sólo Owner de v1 activo ve `Acciones del grupo` junto al encabezado; no hay botones grandes
   duplicados y archivado/no-Owner no muestran menú.
2. Mouse y teclado abren el menú; contiene exactamente Editar nombre, Archivar grupo y Eliminar
   grupo, con eliminar distinguible sin depender sólo del color.
3. Enter/Space/ArrowDown/ArrowUp/Home/End recorren y activan conforme al patrón; Tab sale sin trap.
4. Escape, segundo clic y clic exterior cierran sin activar; el foco vuelve/se conserva según §13.2.
5. Editar nombre abre el diálogo E2-20, carga el nombre vigente, cancela al botón común y confirma un
   rename sin regresión; el encabezado actualizado mantiene el menú.
6. Archivar grupo abre el diálogo E2-23, ejecuta preparación, muestra sus blockers y no archiva antes
   de confirmar. Cancelar vuelve al botón común.
7. Al confirmar archivo, menú y botón desaparecen y el foco pasa al estado archivado; no aparece
   desarchivo, configuración, transferencia o eliminar.
8. Eliminar grupo abre E2-24 y siempre prepara en backend; un frontend aparentemente vacío no oculta
   blockers ni evita su explicación.
9. Preparación elegible explica irreversibilidad, cupo y ausencia de cascadas; cada blocker se muestra
   sin datos privados.
10. Grupo sólo creado y Grupo renombrado pueden eliminarse; seleccionar la opción nunca elimina sin
    confirmación destructiva expresa.
11. Cancelar/Escape en delete no escriben y devuelven foco al botón; doble envío queda bloqueado.
12. Confirmación elimina A, navega seguro, enfoca el resultado y A desaparece de todas las superficies.
13. El CTA de creación vuelve a estar disponible; intención nueva crea B; retry UI de A no resucita A
    ni afecta/devuelve B.
14. Stale por rename reprepara y exige reconfirmación, sin cerrar o ejecutar desde el menú.
15. Pérdida de ownership con menú o cualquier diálogo abierto retira ambos, invalida respuestas
    tardías, navega seguro y no enumera.
16. Navegación A→B no permite que una respuesta vieja reabra menú/diálogo o mueva foco en B.
17. A 360 px y zoom 200 %, menú y diálogos se reposicionan sin recorte/scroll horizontal y mantienen
    opciones, foco y targets utilizables.
18. Lector de pantalla anuncia nombre del botón, expansión, opciones, diálogo, blockers y resultado
    sin anunciar sólo color o ícono.

### 16.2 Inspección persistente

- antes: v1 + guard correlacionado y cero referencias;
- después: raíz A y guard A ausentes; un receipt exacto, deny-all y sin snapshots;
- otros Agregados byte-equivalentes;
- receipts E2-20 preservados;
- B + guard B sólo tras intención nueva;
- errores, cancelación, stale y blockers con cero escrituras.

### 16.3 Automatización/Emulator exclusiva

- carreras deterministas y pérdida de respuesta;
- todos los estados terminales y corrupción;
- outcomes históricos con B vigente sin tocar/devolver B;
- cardinalidad/query de evidencia histórica;
- Rules y writers legacy;
- fallo transaccional antes de cada escritura sin parcialidad.

No se atribuirá aprobación manual a escenarios no ejecutados. Corrupción, carreras y pérdida de
respuesta pueden demostrarse exclusivamente por automatización si se registra ese límite.

## 17. Revisión adversarial

| Foco | Resultado |
| --- | --- |
| Rename antes de delete | Coherente: invalida token; repreparado puede eliminar; receipt se retiene; retry devuelve `UPDATED_THEN_DELETED` sin nombre |
| Solicitudes terminales | Coherente: query no filtra estado; todas bloquean |
| Ausencia de cascadas | Coherente: referencias sólo se leen; no existe comando «resolver» dentro de delete |
| Liberación de cupo | Coherente: root/guard/receipt atómicos; nueva creación usa key nueva |
| Resurrección por retry | Impedida: hashes del alta pasan a evidencia; key vieja devuelve historia, nunca crea |
| B frente a retries de A | Impedida: outcome histórico se resuelve por actor/key; no usa B como `currentGroup` |
| Privacidad posterior | Coherente: sólo receipt actor+key/request; otra key/inexistente/ajeno convergen |
| E2-01 | Requiere adaptación prospectiva de guard/service, sin reescribir cierre |
| E2-20 | Receipt retenido y outcome nuevo mínimo, sin timeline de nombres |
| E2-23 | V2 inelegible; archive y recovery intactos |
| Menú frente a E2-20/E2-23 | Sólo reemplaza disparadores; conserva diálogos, contratos, preparación, stale y confirmación |
| Selección destructiva | Abre diálogo/preparación; nunca archiva o elimina directamente |
| Foco tras mutación | Rename vuelve al botón; archivo enfoca estado archivado; delete enfoca destino; nunca nodo desmontado |
| Backend autoritativo | Visibilidad del menú no presume elegibilidad; prepare siempre se ejecuta y explica blockers reales |
| Patrón existente | `ShareOptionsButton` aporta estructura/afuera; se completan teclado, Escape y foco antes de reutilizarlo |
| Artefactos con ID eliminado | No son corrupción si deletion receipt íntegro los correlaciona; de otro modo fallan |
| Mecanismos nuevos | Sólo deletion receipt demostrado necesario; sin guard, lock, TTL, cleanup o trigger nuevo |

No apareció una decisión funcional adicional bloqueante. La eventual caducidad de evidencia es una
decisión futura: mientras no se apruebe, la retención indefinida satisface D07-A. No existe una
contradicción material con E2-20/E2-23: sus diálogos siguen vigentes; el único desajuste actual es de
presentación porque cada componente todavía renderiza un botón grande propio. La implementación
deberá desacoplar esos disparadores sin modificar fichas o cierres históricos.

## 18. Riesgos y controles

| Riesgo | Control |
| --- | --- |
| Consultar sólo estados activos | Queries sin filtro de estado y casos terminales explícitos |
| Phantom/reference race | Raíz común leída por writers y delete; pruebas con barreras |
| Guard liberado antes de borrar | Commit atómico raíz/guard/receipt |
| Retry A crea o devuelve B | Lookup histórico por actor/key antes de tratar intención como nueva |
| Receipt filtra snapshot | Schema exacto sin nombre/deporte/Owner snapshot/referencias |
| Otra key enumera delete | Sin receipt exacto actor+key, raíz ausente → no accesible |
| Receipt técnico interpretado como actividad | Clasificación separada y correlación explícita |
| Receipt huérfano ocultado | Integridad/cardinalidad estricta y fallo cerrado |
| V2 tratado como eliminable | Estado/schema cerrado y prueba focal E2-23 |
| Legacy autoriza o crea referencia | Exclusión explícita v1/v2 y allowlist E4 |
| Retención crece | Aceptada para recovery; TTL requiere decisión futura, no cleanup implícito |
| Menú copiado sin completar accesibilidad | Adoptar §13.2 y pruebas de teclado/foco, no sólo el markup existente |
| Botón desmontado conserva foco | Destino explícito distinto para rename, archivo, delete y pérdida de acceso |
| Frontend presume elegibilidad | Preparación backend obligatoria al abrir archivo/delete y blockers autoritativos visibles |

## 19. Rollback

El rollback de código oculta la acción y rechaza nuevas eliminaciones, pero mantiene:

- lectura compatible de v1/v2 existentes;
- deny-all de deletion receipts;
- adaptación de retries para Grupos ya eliminados;
- evidencia de delete/creación/rename confirmados.

Nunca reconstruye A desde receipts o payload, vuelve a crear su guard, restaura un nombre ni modifica
B. Si una versión anterior no entiende la evidencia, no puede desplegarse como rollback sin un
compatibility patch que preserve los outcomes; revertir binarios no autoriza perder datos técnicos.

## 20. Definition of Done del futuro incremento técnico

E2-24 podrá cerrarse sólo cuando:

1. addendum, ficha, contratos y código coincidan;
2. todas las referencias reales estén inventariadas y clasificadas;
3. raíz/guard/receipt confirmen en una única postcondición;
4. no exista cascada, cleanup, TTL ni modificación de otro Agregado;
5. retries de delete/creación/rename satisfagan §9 y nunca afecten B;
6. autorización, no enumeración y Rules aprueben;
7. todos los writers capaces de crear referencias serialicen o excluyan v1/v2;
8. frontend accesible implemente preparación/confirmación/recovery;
9. las tres acciones Owner estén exclusivamente en el menú accesible, sin botones duplicados, y las
   regresiones E2-20/E2-23 aprueben;
10. teclado, Escape, clic exterior, foco, pérdida de autorización, móvil y zoom satisfagan §13;
11. pruebas, Emulator y UAT futura registren evidencia honesta;
12. implementación, informe y cierre se versionen e integren mediante autorizaciones posteriores;
13. E2-14 se actualice/repite sólo después de resolver también sus restantes gates.

## 21. Veredicto

`E2-24 CONSOLIDADO Y REVISADO — LISTO PARA VERSIONAR`
