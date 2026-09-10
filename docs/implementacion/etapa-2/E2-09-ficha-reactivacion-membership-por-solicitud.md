# Ficha de Incremento Implementable E2-09 — Reactivación de Membresía por aprobación de Solicitud de ingreso

## Estado de la ficha

- **Estado:** `Lista para implementación`.
- **Fecha:** 2026-09-10.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Checkpoint de partida:** rama `dev`, commit `d85e72295107c62e26e28c368c8f74e794d13e34`.
- **Responsable de definición:** definición cerrada con las adendas normativas AUD-C05 aprobadas.
- **Fuente de verdad principal:** Membresía.
- **Agregado coordinador existente:** Solicitud para la decisión de ingreso; no comparte unidad de consistencia con Membresía.
- **Caso de uso principal:** CU-028 — Reactivar una Membresía.
- **Caso de uso consumidor adaptado:** CU-032 — Aprobar Solicitud, sólo cuando existe una Membresía finalizada reactivable.
- **Veredicto documental:** `E2-09 LISTO PARA IMPLEMENTACIÓN`.

Esta ficha define exclusivamente el siguiente corte. Las adendas AUD-C05 de Documentos 3 y 4 resolvieron la contradicción normativa previa sobre historia temporal, fechas, correlación durable y carrera reactivación–finalización. Las decisiones físicas y contractuales siguientes cierran ese marco sin ampliar el caso de uso. La ficha autoriza iniciar la implementación en una rama propia, pero no constituye implementación, deploy ni acceso remoto.

## 1. Identificación y nombre

- **ID:** E2-09.
- **Nombre:** Reactivación de Membresía por aprobación de Solicitud de ingreso.
- **Objetivo resumido:** permitir que el Owner vigente apruebe una Solicitud pendiente de una Persona cuya Membresía del mismo Grupo está finalizada y corresponde a la Temporada todavía abierta, reactivando esa misma Membresía antes de confirmar la Solicitud.
- **Resultado observable:** el bloqueo estable `MEMBERSHIP_REACTIVATION_REQUIRED` deja de ser terminal para el caso reactivable; la aprobación converge en una única Membresía activa y una única Solicitud aprobada correlacionada.

## 2. Antecedentes, fuentes y fundamento

### 2.1 Normativa aprobada

1. Documentos 1 y 1.5:
   - Membresía representa la relación Persona–Grupo y administra su estado, fechas y contexto de Temporada;
   - una Persona no puede poseer más de una Membresía activa simultánea en el mismo Grupo;
   - los cambios de estado no crean otra Persona ni eliminan el historial previo;
   - Grupo, Persona y Temporada permanecen fuera del Agregado Membresía.
2. Documento 2:
   - CU-028 es un caso independiente de reactivación;
   - sólo puede reactivarse una Membresía correspondiente a una Temporada abierta;
   - una Membresía de Temporada cerrada no puede reactivarse;
   - CU-029 es renovación y crea una nueva participación para una nueva Temporada;
   - CU-032 no permite aprobar si ya existe una Membresía activa.
3. Documentos 3 y 4:
   - Membresía es Aggregate Root de su propio Agregado;
   - sus cambios se realizan mediante el Aggregate Root y su Repositorio;
   - las referencias externas se consultan mediante capacidades públicas;
   - varios Agregados no forman por ello una transacción global.
4. Documento 5:
   - el mapa preliminar agrupaba editar, finalizar y reactivar en E2-05 y ordenaba renovación después;
   - ordena subdividir E2-05 cuando exceda un cambio funcional verificable;
   - exige una única fuente de verdad, retiro por flujo, frontend en el mismo incremento y ninguna doble escritura.
5. Adendas normativas AUD-C05 aprobadas de Documentos 3 y 4:
   - legitiman los **Períodos de Vigencia de Membresía** como entidades internas subordinadas al Aggregate Root Membresía;
   - fijan la semántica de `fechaIngreso`, `fechaEgreso` y los intervalos activos;
   - asignan a la Solicitud aprobada y su decision intent la correlación durable del resultado;
   - fijan `MEMBERSHIP_REACTIVATION_SUPERSEDED` para la carrera reactivación–finalización;
   - exigen altas nuevas v3, readers v1/v2/v3 y evolución por escritura de ciclo de vida, sin backfill.

### 2.2 Correspondencia entre numeración preliminar y ejecución real

La numeración del mapa de Documento 5 era preliminar, no una asignación inmutable. La ejecución produjo esta correspondencia:

| Plan preliminar | Ejecución real | Resultado |
| --- | --- | --- |
| E2-05 — editar, finalizar y reactivar Membresía | E2-05 | Se subdividió y entregó sólo CU-027 owner/self-scoped. CU-026, CU-028 y CU-030 quedaron diferidos. |
| E2-06 — renovación | No ejecutado | CU-029 continúa pendiente. |
| E2-07 — solicitud | E2-06 | CU-031, consulta y cancelación canónicas. |
| E2-08 — resolución | E2-07 | CU-032/CU-033; reactivación excluida con outcome estable. |
| E2-11 — retiro de arrays | E2-08, parcialmente | Se retiró sólo el flujo legacy de solicitudes de ingreso; otros arrays y consumidores permanecen. |
| E2-09 — administración de Grupo | No ejecutado | La etiqueta numérica preliminar no debe duplicarse sobre el E2-09 real. Sus CU siguen pendientes. |

No se considera entregada ni se duplica ninguna funcionalidad anterior. E2-09 continúa la subdivisión material de E2-05 y completa una dependencia explícita de E2-07.

### 2.3 Capacidades canónicas disponibles

- Usuario propio y Persona vinculada: E1-01/E1-02.
- Grupo v1 activo, Owner contextual y consulta owner-scoped: E2-01.
- Temporada abierta independiente y capacidad pública de contexto: E2-02.
- Membresía activa, unicidad Persona–Grupo y active guard: E2-03.
- consulta member-scoped de Membresías activas: E2-04.
- transición `activa → finalizada`, lifecycle guard y consulta owner/self: E2-05.
- Solicitud pendiente independiente y consultas candidate/owner-scoped: E2-06.
- decisión de Solicitud, idempotencia durable y coordinación recuperable con Membresía: E2-07.
- retiro del ingreso legacy por arrays: E2-08.

### 2.4 Funcionalidades expresamente diferidas relevantes

E2-05, E2-07 y E2-08 difieren reactivación y renovación. E2-07 devuelve `MEMBERSHIP_REACTIVATION_REQUIRED` cuando la aprobación encuentra un lifecycle finalizado. E2-08 conserva ese camino canónico y vuelve a diferir reactivación. Esta dependencia funcional directa fundamenta priorizar CU-028 antes que abrir un área nueva.

## 3. Candidatos considerados

### 3.1 Candidato recomendado — CU-028 en la aprobación de reingreso

- **Objetivo:** reactivar la misma Membresía de una Solicitud pendiente y confirmar luego CU-032.
- **Casos de uso:** CU-028; adaptación acotada de CU-032 y su consulta de resultado.
- **Prerrequisitos:** E1-01/E1-02 y E2-01–E2-08, todos disponibles.
- **Inclusiones:** transición de la Membresía finalizada; guards; coordinación recuperable; frontend Owner; contratos y pruebas focales.
- **Exclusiones:** reactivación libre sin Solicitud, self-reactivation del Owner, renovación, roster, roles y notificaciones.
- **Valor:** completa el reingreso ya iniciado por Solicitud y elimina un bloqueo funcional canónico observable.
- **Tamaño:** un corte vertical sobre dos módulos existentes y una sola transición de dominio.
- **Riesgo:** medio/alto por historia temporal, idempotencia y carrera entre reactivación, finalización y decisión.
- **UAT:** reproducible con Persona solicitante, Membresía finalizada de Temporada abierta y Owner vigente.
- **Decisión:** elegido para E2-09 como corte funcional. AUD-C05 y esta ficha cierran historia temporal, fechas, correlación histórica, carrera con CU-027, contrato Owner, outcomes y consistencia de Temporada.

### 3.2 Candidato postergado — CU-029 Renovación de Membresía

- **Objetivo:** crear una nueva Membresía para una nueva Temporada, vinculada con la anterior.
- **Casos de uso:** CU-029.
- **Prerrequisitos:** cierre/consulta histórica de Temporadas y una nueva Temporada abierta; trazabilidad entre Membresías.
- **Inclusiones potenciales:** nueva identidad de Membresía, referencia histórica y validación de nueva Temporada.
- **Exclusiones:** reactivar la misma Membresía y modificar una Temporada cerrada.
- **Valor:** alto al cambiar de ciclo operativo.
- **Riesgo:** alto mientras CU-018/CU-019 y la política física de trazabilidad no estén implementados.
- **UAT:** exigiría al menos dos Temporadas y cierre canónico, capacidad todavía ausente.
- **Motivo de postergación:** depende de administración e historial de Temporadas y no resuelve el bloqueo actual dentro de una Temporada abierta.

### 3.3 Candidato postergado — Administración de Grupo

- **Objetivo:** CU-012 a CU-015: editar, configurar, archivar y eventualmente eliminar Grupo.
- **Prerrequisitos:** reglas exactas por operación, tratamiento de Grupo con historia, consumidores canónicos y legacy, y efectos del archivado.
- **Inclusiones potenciales:** evolución del Aggregate Root Grupo, autorización owner-scoped, UI y retiro del escritor legacy equivalente.
- **Exclusiones necesarias:** integrantes, roles, transferencia de ownership, Club y Comercial.
- **Valor:** alto para el Owner.
- **Riesgo:** alto y corte demasiado grande; Documento 5 ordena subdividirlo si excede un cambio verificable.
- **UAT:** posible por subcaso, no coherente como paquete único.
- **Motivo de postergación:** la fila preliminar no prevalece sobre la secuencia ejecutada; requiere una definición y subdivisión propias después de cerrar dependencias inmediatas.

Roster, administración de terceros, roles, renovación y notificaciones no se promueven por conveniencia técnica. Necesitan decisiones funcionales propias o dependencias todavía ausentes.

## 4. Casos de uso incluidos

1. CU-028, limitado a la reactivación de la Membresía finalizada de la Persona identificada por una Solicitud pendiente del mismo Grupo.
2. CU-032, sólo para sustituir el outcome `MEMBERSHIP_REACTIVATION_REQUIRED` por una coordinación explícita de reactivación y aprobación cuando se cumplan todas las precondiciones.
3. Consulta del resultado de decisión E2-07, adaptada para reconocer el mismo resultado final `APPROVED` sin exponer detalles internos de la transición.

No se incorpora un caso de reactivación autónomo desde roster ni un callable cliente separado mientras la única intención funcional incluida sea aprobar una Solicitud de reingreso.

## 5. Objetivo funcional

Permitir al Owner vigente aceptar el reingreso solicitado por una Persona que perteneció al Grupo, fue finalizada dentro de la misma Temporada que continúa abierta y no posee otra Membresía activa. Debe reactivarse la misma Membresía, conservarse su historia y confirmarse la Solicitud sólo después de verificar la reactivación.

## 6. Actores y autorización

| Actor | Participación | Autorización | Resultado |
| --- | --- | --- | --- |
| Owner vigente | Decide la Solicitud | `groups/{groupId}.ownerId` leído autoritativamente; UID sólo del token | Aprueba y coordina la reactivación |
| Persona solicitante | Sujeto de Solicitud y Membresía | Derivada de la Solicitud; no elegida por payload Owner | Recupera pertenencia en el mismo Grupo |
| Sistema | Coordina unidades separadas | Contratos públicos entre Solicitudes, Grupos, Temporadas, Personas y Membresías | Convergencia recuperable |

No autorizan `users.roles`, `memberIds`, `adminIds`, `admins`, claims globales, la Persona por sí sola, la Membresía por sí sola, Plan ni Suscripción. Un integrante no Owner no decide. La habilitación comercial no aplica en este corte.

## 7. Precondiciones

- actor autenticado con Cuenta disponible;
- Grupo canónico v1 activo y Owner vigente coincidente;
- Solicitud canónica pendiente, íntegra y correlacionada con su pending guard;
- Persona de la Solicitud existente y compatible;
- ausencia de Membresía activa para Persona–Grupo;
- exactamente una Membresía finalizada y un lifecycle guard correlacionado;
- `membership.groupId == request.groupId` y `membership.personId == request.personId`;
- Temporada referenciada por la Membresía finalizada existente, íntegra y `abierta`;
- la Temporada abierta vigente del Grupo es esa misma `seasonId`;
- ausencia de otra coordinación o estado terminal incompatible;
- payload cerrado de aprobación E2-07.

Una Temporada cerrada, otra Temporada abierta o una Membresía finalizada de una Temporada anterior no habilitan CU-028: producen el outcome estable de E2-09. CU-029 sólo podrá evaluarse mediante su propio incremento y no se promete desde este flujo.

## 8. Alcance incluido

- transición del mismo Aggregate Root Membresía `finalizada → activa`;
- preservación de `membershipId`, `personId`, `groupId`, `seasonId`, `fechaIngreso` original y `createdAt`;
- preservación verificable de cada intervalo previo mediante entidades internas **Período de Vigencia de Membresía** subordinadas al Agregado Membresía;
- sustitución atómica del lifecycle guard vigente por el active guard correlacionado dentro de la unidad de Membresía;
- capacidad pública interna de Membresías para reactivar o recuperar por Solicitud;
- adaptación de la coordinación E2-07 sin transacción global;
- idempotencia ante retry y respuesta perdida;
- adaptación del diálogo y feedback Owner en `PendingGroupJoinRequestsSection`;
- consultas, DTO, errores, observabilidad y pruebas mínimas del corte;
- UAT local reproducible con Emulator Suite.

## 9. Alcance excluido

- CU-026, CU-029, CU-030 y cualquier estado adicional de Membresía;
- reactivación de Membresía cuya Temporada está cerrada o no es la abierta vigente;
- creación de una nueva Membresía para reactivar;
- reactivación sin Solicitud pendiente;
- reactivación owner/self desde `OwnMembershipSection`;
- roster, listado histórico general, búsqueda o administración de integrantes;
- finalización, alta o edición de terceros fuera de la coordinación incluida;
- roles, cargos, permisos, posición, dorsal y observaciones;
- administración, edición, archivo o eliminación de Grupo;
- cierre, edición o historial de Temporadas;
- renovación y trazabilidad entre Membresías de Temporadas distintas;
- solicitudes administrativas;
- `memberIds`, `adminIds`, `admins` y demás arrays legacy;
- notificaciones, Actividad, correo, push y alertas;
- TTL/cleanup de intents, reparación de corrupción, migración o backfill;
- Plan, Suscripción, Club, Pago, Torneos y operaciones deportivas;
- deploy o acceso a Firebase remoto.

## 10. Modelo de dominio involucrado

| Concepto | Clasificación | Participación |
| --- | --- | --- |
| Membresía | Agregado / Aggregate Root | Único estado funcional modificado por CU-028 |
| Período de Vigencia de Membresía | Entidad interna subordinada | Intervalo activo Persona–Grupo; sin raíz, Repositorio, autorización ni superficie pública propia |
| Solicitud | Agregado / Aggregate Root independiente | Permanece pendiente hasta confirmar Membresía; luego se aprueba en su propia unidad |
| Grupo | Agregado externo | Provee contexto y ownership; no se modifica |
| Temporada | Agregado externo del Módulo Grupos | Provee contexto abierto exacto; no se modifica |
| Persona | Agregado externo | Sujeto de la Membresía y Solicitud; no se modifica |
| Usuario | Agregado externo | Identidad digital del actor; no se modifica |
| Guards, intents y coordinación | Estado técnico | Unicidad, idempotencia y progreso vigentes; no son historia funcional ni autoridad de Membresía |

## 11. Invariantes

1. A lo sumo una Membresía activa simultánea por Persona–Grupo.
2. CU-028 modifica la misma Membresía; CU-029 es el único que crea otra participación para otra Temporada.
3. La Membresía reactivada conserva identidad y referencias.
4. Sólo se reactiva si su propia Temporada continúa abierta y es la abierta vigente del Grupo.
5. Una Temporada cerrada nunca se modifica ni se elude.
6. El historial previo no se elimina, sobrescribe ni delega a un guard técnico.
7. Solicitud sólo pasa a `aprobada` después de confirmar y releer la Membresía activa correlacionada.
8. Una activa ajena no se adopta y una finalizada ajena a la Solicitud no se reinterpreta.
9. Grupo, Persona y Temporada permanecen fuera del Agregado y de la escritura.
10. Ownership se relee donde inicia la decisión; una continuación ya reclamada respeta la semántica recuperable aprobada en E2-07.
11. No se escribe ningún array legacy ni proyección excluida.
12. La raíz es la fuente del estado vigente; los períodos son la fuente autoritativa de los intervalos históricos.
13. Una Membresía activa v3 posee exactamente un período abierto y `latestPeriodId` lo referencia.
14. Una Membresía finalizada v3 no posee períodos abiertos y `latestPeriodId` referencia el último período cerrado.
15. Los ordinales comienzan en 1, son contiguos y estrictamente crecientes; `periodCount` coincide con el último ordinal.
16. `fechaIngreso` es el inicio del primer período y permanece inmutable.
17. `fechaEgreso` existe sólo en una raíz finalizada y coincide con el fin del último período; está ausente en una raíz activa.
18. Cada período satisface `startedAt <= endedAt` cuando está cerrado y el comienzo de un período posterior no precede el fin del anterior.
19. Un período no tiene Repositorio, escritura o ciclo de vida independiente; sólo se modifica mediante el Aggregate Root y el Repositorio de Membresía.
20. El período ordinal 1 comienza exactamente en `fechaIngreso`; la rehidratación v3 valida también ese documento.
21. Se admite `inicio == fin` en un período cerrado; nunca se admite `fin < inicio` ni superposición.
22. Los timestamps de alta, reactivación y finalización son autoritativos del servidor y se reutilizan en todos los documentos de la misma transición.
23. Períodos, guards, intents y coordinaciones no contienen ni sustituyen Actividad, historia deportiva, económica o administrativa.

## 12. Flujo principal definitivo

1. El Owner abre `/dashboard/groups/{groupId}` y lista Solicitudes pendientes.
2. La lista recibe el `approvalEffect` autoritativo. `REACTIVATE_MEMBERSHIP` informa que la aprobación requiere reactivar la Membresía existente, sujeto a revalidación transaccional; no promete el resultado ni expone historia.
3. El Owner abre una confirmación explícita que indica “Reactivar Membresía y aprobar Solicitud”.
4. El frontend reutiliza una clave de idempotencia estable de decisión y llama `approveGroupJoinRequest` con el payload E2-07 sin campos nuevos controlables.
5. En la unidad Solicitud/claim se releen actor, Cuenta, ownership, Solicitud, pending guard, decision intent y estado focal de Membresía mediante capacidad pública. Se crea o recupera el intent de aprobación v2 y una coordinación v2 que fija `approvalEffect`, `seasonId`, y, para reactivación, `membershipId` y `expectedActivationOrdinal`.
6. Mediante la capacidad pública de Membresías, la unidad de Membresía realiza primero todas sus lecturas: guards, cardinalidad Persona–Grupo, raíz, período 1, período límite, consulta acotada de abiertos y capacidad pública estrecha de Temporada sobre la misma transacción.
7. Si la raíz es v2, el Aggregate Root materializa determinísticamente el período 1 cerrado desde `fechaIngreso`/`fechaEgreso` y abre el período 2 con un único timestamp autoritativo de reactivación.
8. Si la raíz es v3 finalizada, el Aggregate Root valida los períodos 1 y último, comprueba cero abiertos y abre `periodCount + 1`.
9. La unidad de Membresía persiste raíz v3 activa y períodos, elimina el lifecycle guard y crea el active guard v2 correlacionado con la activación exacta.
10. En la unidad Solicitud/finalización se releen Solicitud, pending guard, coordinación, decision intent y, mediante capacidad pública, la raíz y el Período de Vigencia exacto indicados por la coordinación.
11. Si esa activación sigue abierta y correlacionada, Solicitud pasa a aprobada v3 con su resultado durable; el intent queda consumido con `APPROVED`, y se eliminan pending guard y coordinación en la misma transacción.
12. Si CU-027 ya cerró exactamente ese período, no se aprueba: el intent queda consumido con `MEMBERSHIP_REACTIVATION_SUPERSEDED`, se elimina la coordinación y Solicitud/pending guard permanecen pendientes.
13. Ante `MEMBERSHIP_SEASON_NOT_REACTIVATABLE` sin efecto de Membresía, una transacción de liberación consume el mismo intent con ese outcome, elimina sólo la coordinación y conserva Solicitud/pending guard.
14. El frontend sólo muestra éxito tras el estado terminal autoritativo. Ante respuesta incierta consulta `getGroupJoinRequestDecisionResult`; un outcome no terminal consumido se recupera por la misma clave de idempotencia desde el decision intent.

## 13. Contratos de entrada y salida

### 13.1 Contrato cliente existente a preservar

`approveGroupJoinRequest` mantiene entrada cerrada:

```ts
{
  groupId: string;
  requestId: string;
  idempotencyKey: string;
}
```

El cliente no aporta `personId`, `membershipId`, `seasonId`, estado, fechas, Owner ni modo `create/reactivate`.

La salida terminal continúa compatible:

```ts
{
  outcome: "APPROVED" | "ALREADY_APPROVED";
  decision: {
    requestId: string;
    estado: "aprobada";
    decidedAt: string;
    membership: { id: string; seasonId: string };
  };
}
```

No se expone si la Membresía fue creada o reactivada en el DTO terminal. El frontend obtiene esa información antes de confirmar mediante `approvalEffect` en el item Owner.

`getGroupJoinRequestDecisionResult({ groupId, requestId })` conserva sus estados v1. Para `APPROVED`, obtiene el resultado durable desde la Solicitud aprobada y valida el decision intent que ésta referencia. No exige una Membresía activa, active guard, lifecycle guard, coordinación ni hashes de una aprobación pasada. Para aprobadas v3 devuelve `membership.id` y `seasonId` almacenados en Solicitud. Para aprobadas v2 aplica la compatibilidad limitada de §16.6 y puede leer por `membershipId` la raíz —activa o finalizada— únicamente para su `seasonId` inmutable; no correlaciona contra guards. Los estados `PENDING` y `APPROVAL_IN_PROGRESS` sólo se usan con intent no consumido; un intent consumido con outcome no terminal se recupera por `approveGroupJoinRequest` usando la misma clave, no se presenta como aprobación.

### 13.2 Contrato público interno definitivo

`reactivateOrRecoverForGroupJoinRequest(input)` recibe sólo contexto autoritativo interno:

```text
requestId, decisionIntentId, personId, groupId, seasonId, membershipId,
expectedActivationOrdinal, idempotencyKeyHash, requestHash
```

Devuelve un resultado mínimo correlacionable:

```text
outcome: REACTIVATED_ACTIVE | RECOVERED_ACTIVE | REACTIVATION_SUPERSEDED
membershipId, personId, groupId, seasonId, activationOrdinal
```

No expone Aggregate Root, documento, snapshot, timestamps de historia, guards ni hashes. `idempotencyKeyHash = sha256(lengthPrefix("sportexa:E2-09:membership-activation-idempotency:v1", decisionIntentId, membershipId, expectedActivationOrdinal))`; `requestHash = sha256(lengthPrefix("sportexa:E2-09:membership-reactivation-request:v1", requestId, personId, groupId, seasonId, membershipId, expectedActivationOrdinal))`. Ambos son hex lowercase de 64 caracteres; la clave cliente cruda nunca cruza al Módulo Membresías. El contrato valida todos los campos y los usa sólo para recuperar la activación vigente del mismo retry.

La capacidad puede devolver además `REACTIVATION_SUPERSEDED` con los mismos IDs y ordinal cuando el período exacto fijado por la coordinación ya fue cerrado; ese resultado no vuelve a ejecutar CU-028 y debe consumirse en Solicitud como `MEMBERSHIP_REACTIVATION_SUPERSEDED`.

La capacidad pública de lectura/preparación para Solicitudes devuelve exclusivamente uno de estos value objects cerrados: `absent` con un `membershipId` opaco reservado y `nextActivationOrdinal: 1`; `active`; `finalized` con `membershipId`, `seasonId` y `nextActivationOrdinal`; `activation-open` o `activation-closed` para el `membershipId`/ordinal exactos. Reservar un ID no escribe ni crea Membresía. Nunca devuelve Repositorios, snapshots, referencias, Aggregate Roots, períodos completos ni hashes.

### 13.3 Consulta Owner definitiva

Cada item de `listPendingGroupJoinRequestsForOwnedGroup` incorpora obligatoriamente:

```ts
{
  id: string;
  estado: "pendiente";
  decisionStatus: "PENDING" | "APPROVAL_IN_PROGRESS";
  createdAt: string;
  person: { firstName: string; lastName: string };
  approvalEffect: "CREATE_MEMBERSHIP" | "REACTIVATE_MEMBERSHIP";
}
```

Se elige `approvalEffect` y se descarta `membershipAction`: el dato describe el efecto previsto de aprobar esa Solicitud, no una acción genérica ni un comando seleccionable por el cliente. Es informativo, derivado por backend desde el estado íntegro de Membresía y nunca se acepta en `approveGroupJoinRequest`.

La derivación sigue estas reglas cerradas:

- estado Persona–Grupo ausente e íntegro: `CREATE_MEMBERSHIP`;
- exactamente una finalizada y lifecycle guard correlacionado: `REACTIVATE_MEMBERSHIP`;
- activa, duplicados, guard huérfano, schema inválido o cualquier ambigüedad: la lista falla cerrada con el error estable existente; no inventa un efecto.

El discriminante no asegura elegibilidad temporal: la validez exacta de Temporada se comprueba nuevamente dentro de la transacción modificadora. No expone fechas, IDs de Membresía, períodos, guards ni historia.

## 14. Errores y outcomes estables

| Condición | Outcome/error | Estado persistente |
| --- | --- | --- |
| Reactivación y aprobación confirmadas | `APPROVED` | Membresía activa; Solicitud aprobada |
| Retry del mismo resultado | `ALREADY_APPROVED` o consulta `APPROVED` | Sin nueva transición |
| Solicitud ya cancelada/rechazada | terminal E2-07 existente | Sin reactivación |
| Activa existente ajena | `ACTIVE_MEMBERSHIP_EXISTS` | Sin adopción ni escritura |
| No existe finalizada correlacionada | `INCOMPATIBLE_STATE` | Sin reparación |
| No existe Temporada abierta para una creación nueva | `OPEN_SEASON_REQUIRED` | Solicitud pendiente |
| Finalizada cuya Temporada está cerrada, es distinta o ya no es la abierta vigente | `MEMBERSHIP_SEASON_NOT_REACTIVATABLE` | Solicitud pendiente; no promete renovación |
| CU-027 cierra la activación exacta antes de confirmar Solicitud | `MEMBERSHIP_REACTIVATION_SUPERSEDED` | Solicitud y pending guard pendientes; intent consumido; coordinación eliminada |
| Actor no Owner vigente | `NOT_AUTHORIZED` | Sin escritura |
| Payload inválido | `VALIDATION_FAILED` | Sin escritura |
| Clave reutilizada con otro contexto | `IDEMPOTENCY_CONFLICT` | Sin escritura |
| Carrera reintentable | `CONFLICT` | Consultar resultado |
| Dependencia transitoria | `DEPENDENCY_UNAVAILABLE` | No afirmar éxito |
| Corrupción o asimetría | `INCOMPATIBLE_STATE` | Fallo cerrado |
| Error desconocido | `INTERNAL_ERROR` | Sanitizado; no afirmar éxito |

Se adopta un único outcome `MEMBERSHIP_SEASON_NOT_REACTIVATABLE` para las tres variantes comprobadas. Mantiene pequeño el contrato y permite el mismo feedback: esa Membresía no puede reactivarse en el contexto temporal actual. Los detalles internos pueden distinguir `closed`, `changed` o `absent` para observabilidad, pero no atraviesan el contrato. No se traduce a “renovable” ni se promete CU-029. Para este outcome, la liberación relee Solicitud, pending guard, coordinación e intent; exige que no exista efecto de Membresía correlacionado, marca el intent v2 `consumed`, elimina la coordinación y deja Solicitud/pending guard intactos en una sola transacción de Solicitud. El mismo retry devuelve el outcome consumido; otro intento humano requiere otra clave.

`MEMBERSHIP_REACTIVATION_SUPERSEDED` describe exclusivamente que la activación creada por esa decisión fue cerrada válidamente antes de confirmar la Solicitud. No es error de Temporada, no aprueba, no compensa ni reabre. Su persistencia y recuperación siguen la misma regla de intent consumido y coordinación eliminada, pero la fase de liberación exige encontrar cerrado el `membershipId` y `expectedActivationOrdinal` exactos.

No se conserva `MEMBERSHIP_REACTIVATION_REQUIRED` para el caso plenamente reactivable. Puede permanecer para superficies excluidas o compatibilidad interna transitoria durante la implementación, pero no como resultado final de esta ruta.

## 15. Idempotencia y concurrencia

- se evoluciona el decision intent durable de E2-07 para conservar identidad, idempotencia y outcome de la intención concreta del Owner;
- el alias del decision intent sigue derivándose de UID + clave cliente según E2-07; los hashes internos nuevos se derivan del `decisionIntentId`, la Membresía y el ordinal esperado, y no se persiste la clave cruda;
- `periodId` se deriva determinísticamente con SHA-256 length-prefixed de `sportexa:E2-09:membership-validity-period:v1`, `membershipId` y el ordinal decimal canónico en base 10 sin ceros iniciales;
- el primer período siempre tiene ordinal 1; la primera reactivación de v2 crea en la misma transacción los IDs deterministas de ordinales 1 y 2;
- `activeMembershipGuardId` y `membershipLifecycleGuardId` conservan sus dominios deterministas Persona–Grupo; `decisionIntentId` conserva el dominio E2-07 UID+idempotency key, y el ID de coordinación es `requestId`;
- la identidad de una Membresía reactivada nunca cambia. Para un alta nueva coordinada, el Módulo Membresías reserva un único ID opaco antes del claim y la coordinación lo vuelve durable; no se recalcula ni se reemplaza en retries;
- en E2-03, `activationIdempotencyHash` y `activationRequestHash` reutilizan los hashes actuales del alta owner/self; en E2-07/E2-09 usan los dominios cerrados de §13.2. El active guard no mezcla ambos contratos;
- misma Solicitud, acción, contexto y clave recupera la misma Membresía;
- otra acción o contexto con la misma clave produce conflicto estable;
- dos aprobaciones concurrentes pueden confirmar como máximo una transición y una Solicitud aprobada;
- reactivación compite atómicamente con finalización, alta y otra reactivación mediante los guards Persona–Grupo;
- una transacción perdedora por contención relee raíz, períodos 1 y límite y guards; sólo devuelve `RECOVERED_ACTIVE` si el active guard contiene los hashes E2-09, `activationOrdinal` y `activatedAt` exactos y el período esperado continúa abierto;
- una respuesta perdida después de reactivar pero antes de aprobar no revierte Membresía: la coordinación preexistente identifica la instancia y ordinal exactos y debe converger a aprobación o `MEMBERSHIP_REACTIVATION_SUPERSEDED`;
- una cancelación/rechazo que gane antes del claim impide reactivar;
- no se permite que una lectura stale elija otra Temporada ni que una relectura “repare” asimetrías.

## 16. Persistencia

### 16.1 Autoridades existentes

| Ruta | Rol | Escritor |
| --- | --- | --- |
| `memberships/{membershipId}` | Fuente funcional de Membresía | Backend de Membresías |
| `activeMembershipGuards/{guardId}` | Unicidad técnica activa Persona–Grupo | Backend de Membresías |
| `membershipLifecycleGuards/{guardId}` | Control técnico de finalización vigente | Backend de Membresías |
| `groupJoinRequests/{requestId}` | Fuente funcional de Solicitud | Backend de Solicitudes |
| `pendingGroupJoinRequestGuards/{guardId}` | Unicidad pendiente | Backend de Solicitudes |
| `groupJoinRequestDecisionIntents/{intentId}` | Idempotencia durable de decisión | Backend de Solicitudes |
| `groupJoinRequestApprovalCoordinations/{requestId}` | Recuperación entre unidades | Backend de Solicitudes |

### 16.2 Decisión D1 — Períodos de Vigencia subordinados

Se adopta `memberships/{membershipId}/validityPeriods/{periodId}` como persistencia Firestore interna de entidades **Período de Vigencia de Membresía** del Agregado Membresía. El nombre físico `validityPeriods` no crea un concepto público distinto.

- No constituye colección raíz, Agregado, fuente de estado vigente ni Repositorio independiente.
- Sólo `MembershipRepository` lee o escribe raíz y períodos.
- Toda mutación de raíz, período vigente y guards se confirma en una única transacción Firestore del Agregado Membresía.
- El root document continúa siendo la fuente rápida y autoritativa del estado vigente.
- Los períodos constituyen la fuente autoritativa de los intervalos históricos.
- La duplicación raíz/período es interna al mismo Agregado y debe coincidir atómicamente; una divergencia falla cerrada.

### 16.3 Schema exacto de raíz v3

Raíz activa v3, con `fechaEgreso` **ausente**:

```text
memberships/{membershipId}
personId: string
groupId: string
seasonId: string
estado: "activa"
fechaIngreso: Timestamp
createdAt: Timestamp
latestPeriodId: string
periodCount: integer
schemaVersion: 3
```

Raíz finalizada v3:

```text
memberships/{membershipId}
personId: string
groupId: string
seasonId: string
estado: "finalizada"
fechaIngreso: Timestamp
fechaEgreso: Timestamp
createdAt: Timestamp
latestPeriodId: string
periodCount: integer
schemaVersion: 3
```

Los schemas son cerrados. `periodCount` es entero seguro positivo; `latestPeriodId` coincide con el ID determinista del ordinal `periodCount`. `fechaIngreso` y `createdAt` son inmutables.

Se elige ausencia, no `null`, para `fechaEgreso` en estado activo porque:

- conserva la forma y semántica del schema activo v1;
- evita introducir dos representaciones de “no finalizada”;
- mantiene los DTO existentes sin nullable nuevo;
- permite `update` con eliminación explícita del campo al reactivar.

### 16.4 Schema exacto de Período de Vigencia v1

Período abierto:

```text
memberships/{membershipId}/validityPeriods/{periodId}
ordinal: integer
estado: "abierto"
startedAt: Timestamp
periodSchemaVersion: 1
```

Período cerrado:

```text
memberships/{membershipId}/validityPeriods/{periodId}
ordinal: integer
estado: "cerrado"
startedAt: Timestamp
endedAt: Timestamp
periodSchemaVersion: 1
```

Los schemas son cerrados. El ID se deriva del dominio de hash definido en la sección 15; no se persisten `membershipId`, Solicitud, UID, clave, hash ni referencias externas dentro del período. `endedAt` está ausente en un período abierto y presente en uno cerrado. `startedAt <= endedAt`.

### 16.5 Schemas exactos de guards de Membresía

`activeMembershipGuards/{guardId}` v2 representa sólo unicidad activa y recuperación de la activación vigente:

```text
membershipId: string
personId: string
groupId: string
seasonId: string
activationOrdinal: integer
activatedAt: Timestamp
activationIdempotencyHash: string[64 hex lowercase]
activationRequestHash: string[64 hex lowercase]
guardVersion: 2
```

`guardId` conserva la derivación determinista Persona–Grupo de E2-03. `activationOrdinal` y `activatedAt` coinciden con el único período abierto. Los hashes sólo permiten recuperar la escritura de ciclo de vida vigente; no prueban ni reconstruyen una aprobación histórica y desaparecen al finalizar.

`membershipLifecycleGuards/{guardId}` v2 representa sólo la Membresía finalizada vigente:

```text
membershipId: string
personId: string
groupId: string
seasonId: string
lastActivationOrdinal: integer
finalizedAt: Timestamp
lifecycleGuardVersion: 2
```

`guardId` conserva la derivación determinista Persona–Grupo de E2-05. `lastActivationOrdinal == periodCount`; `finalizedAt == fechaEgreso == endedAt` del último período. No conserva hashes de altas o aprobaciones. Active guard y lifecycle guard son mutuamente excluyentes.

Los guards v1 existentes se aceptan sólo junto con sus representaciones legacy correlacionadas: active guard v1 + Membresía activa v1, o lifecycle guard v1 + finalizada v2. Toda alta nueva crea active guard v2; CU-027 y E2-09 evolucionan el guard junto con la raíz. Combinaciones cruzadas de versiones fallan cerradas.

### 16.6 Schemas exactos de Solicitud, pending guard e intent

La Solicitud aprobada v3 tiene schema cerrado:

```text
groupJoinRequests/{requestId}
personId: string
groupId: string
estado: "aprobada"
createdAt: Timestamp
decisionIntentId: string
decidedBy: string
decidedAt: Timestamp
membershipId: string
seasonId: string
approvalEffect: "CREATE_MEMBERSHIP" | "REACTIVATE_MEMBERSHIP"
membershipActivationOrdinal: integer
schemaVersion: 3
```

Esos campos son inmutables después de aprobar. Para `CREATE_MEMBERSHIP`, el ordinal es 1; para `REACTIVATE_MEMBERSHIP`, coincide con el período abierto comprobado en la fase final. Solicitudes pendientes/canceladas v1 y rechazadas v2 no cambian.

Una Solicitud aprobada v2 existente se interpreta sin escritura como `approvalEffect = "CREATE_MEMBERSHIP"` y `membershipActivationOrdinal = 1`. Su `membershipId` durable se dereferencia sólo para obtener y validar la `seasonId` inmutable de esa Membresía, sin exigir estado activo, guards ni hashes. Las aprobadas v3 se resuelven desde la propia Solicitud y su intent, sin consultar el estado actual de Membresía. No hay backfill.

`pendingGroupJoinRequestGuards/{guardId}` conserva exactamente su schema v1 E2-06:

```text
requestId: string
personId: string
groupId: string
createdAt: Timestamp
guardVersion: 1
```

El decision intent de rechazo v1 no cambia. Toda nueva intención de aprobación usa uno de estos schemas cerrados v2:

```text
# Pendiente de outcome
requestId: string
personId: string
groupId: string
action: "approve"
requestedBy: string
requestHash: string[64 hex lowercase]
createdAt: Timestamp
intentStatus: "pending"
intentVersion: 2

# Consumido
requestId: string
personId: string
groupId: string
action: "approve"
requestedBy: string
requestHash: string[64 hex lowercase]
createdAt: Timestamp
intentStatus: "consumed"
outcome: "APPROVED" | "MEMBERSHIP_SEASON_NOT_REACTIVATABLE" | "MEMBERSHIP_REACTIVATION_SUPERSEDED"
consumedAt: Timestamp
intentVersion: 2
```

`requestHash` conserva el dominio E2-07 del comando humano. `consumedAt` es autoritativo del servidor y no reemplaza `decidedAt`. Un intent `APPROVED` debe correlacionar con una Solicitud aprobada que lo referencia; los otros dos outcomes exigen Solicitud y pending guard aún pendientes y ausencia de coordinación. Un intent consumido nunca vuelve a ejecutar Membresía.

### 16.7 Schema exacto de coordinación de aprobación

`groupJoinRequestApprovalCoordinations/{requestId}` usa un único schema v2 cerrado:

```text
requestId: string
personId: string
groupId: string
seasonId: string
decisionIntentId: string
requestedBy: string
approvalEffect: "CREATE_MEMBERSHIP"
membershipId: string
expectedActivationOrdinal: 1
createdAt: Timestamp
coordinationVersion: 2
```

Para reactivación el mismo schema sustituye sólo estos valores:

```text
requestId: string
personId: string
groupId: string
seasonId: string
decisionIntentId: string
requestedBy: string
approvalEffect: "REACTIVATE_MEMBERSHIP"
membershipId: string
expectedActivationOrdinal: integer
createdAt: Timestamp
coordinationVersion: 2
```

La coordinación se crea en el claim antes de modificar Membresía. Para creación, una capacidad pública reserva el `membershipId` sin escribir y fija ordinal 1; para reactivación, ambos valores provienen de una lectura pública íntegra de la finalizada vigente. Así todo efecto es recuperable aun si CU-027 gana antes de la fase final. La coordinación sólo existe mientras la Solicitud sigue pendiente y el intent v2 no fue consumido. Se elimina en la misma transacción que aprueba la Solicitud o consume un outcome no terminal.

### 16.8 Evolución determinista de v1/v2 y altas nuevas

| Estado previo | Operación | Evolución atómica |
| --- | --- | --- |
| Activa v1, sin períodos | Finalización posterior compatible | Crear período 1 ya cerrado con `startedAt = fechaIngreso` y `endedAt = finalizedAt`; evolucionar raíz a v3 finalizada; sustituir active guard por lifecycle guard |
| Finalizada v2, sin períodos | Primera reactivación E2-09 | Crear período 1 cerrado con `startedAt = fechaIngreso`, `endedAt = fechaEgreso`; crear período 2 abierto con `startedAt = reactivatedAt`; evolucionar raíz a v3 activa y eliminar `fechaEgreso`; sustituir lifecycle guard por active guard |
| Activa v3 | Finalización | Cerrar exactamente `latestPeriodId`, agregar `fechaEgreso = finalizedAt`, conservar `periodCount` y sustituir guards |
| Finalizada v3 | Reactivación | Validar último cerrado; crear período `periodCount + 1` abierto, quitar `fechaEgreso`, incrementar contador y sustituir guards |
| Sin Membresía | Alta E2-03 owner/self o alta E2-07 por aprobación | Crear raíz activa v3, período 1 abierto y active guard v2 con un único timestamp de servidor |

No existe migración masiva. La evolución ocurre sólo al ejecutar una escritura autorizada de ciclo de vida (`upgrade on lifecycle write`). Una v1 activa equivale conceptualmente al período 1 abierto; no se materializa por lectura y se vuelve v3 en CU-027. Una v2 finalizada equivale conceptualmente al período 1 cerrado y se vuelve v3 en su primera reactivación. Desde la implementación de E2-09, `createMyMembershipForOwnedGroup` de E2-03 y `createOrRecoverForGroupJoinRequest` de E2-07 dejan de escribir v1 y producen v3 en una sola transacción con período 1 y guard v2. Sus retries recuperan ese mismo período y nunca crean otro.

La síntesis no inventa historia: usa exclusivamente `fechaIngreso` y, para v2, `fechaEgreso` ya confirmadas. `reactivatedAt`/`finalizedAt` es un único `Timestamp.now()` generado por backend para la nueva transición y reutilizado en raíz, período y guard correspondientes. Si falta un timestamp, no es Firestore Timestamp válido, el orden es imposible, existen períodos inesperados o el schema no es exacto, se devuelve `INCOMPATIBLE_STATE` sin escribir ni sintetizar.

### 16.9 Rehidratación, readers y límites

Para comandos v3, `MembershipRepository` rehidrata raíz, período 1, `latestPeriodId` y una consulta directa acotada a `memberships/{membershipId}/validityPeriods` con `estado == "abierto"` y `limit(2)`. No carga toda la historia: las invariantes globales se preservan inductivamente mediante IDs/ordinales deterministas, `periodCount`, extremos y escritor único backend. Cero o más de un abierto cuando la raíz exige uno, cualquier abierto en una finalizada, extremos incompatibles o schemas desconocidos fallan cerrados. Los readers sin transición validan raíz v1/v2/v3 y la correlación con su guard; cuando leen v3 validan además período 1 y período límite, sin exponerlos.

La consulta histórica completa queda fuera de E2-09 y podrá paginar la subcolección por `ordinal` en un caso futuro. La subcolección evita el límite de 1 MiB de la raíz y el crecimiento de un array; cada período es un documento pequeño de schema fijo. Ninguna transacción de E2-09 crece con la cantidad histórica de períodos. No se impone un máximo funcional arbitrario; se exige `periodCount <= Number.MAX_SAFE_INTEGER`, y alcanzar el límite falla cerrado.

### 16.10 Rollback físico

Como E2-09 no autoriza deploy ni datos remotos, el rollback implementable consiste en revertir código y reglas y eliminar exclusivamente fixtures locales E2-09 por IDs registrados. Un rollback de código aislado después de persistir raíces v3 dejaría el lector v1/v2 incompatible y está prohibido. Cualquier despliegue futuro deberá acompañarse de estrategia forward-compatible o autorización separada; no se resuelve mediante doble escritura ni borrado de períodos.

## 17. Transacciones y coordinación entre Agregados

- **Unidad 1 — Solicitud/claim:** lee Cuenta/Grupo/ownership por capacidades públicas, Solicitud, pending guard, intent, coordinación y contexto focal de Membresía; luego crea o recupera intent v2 y coordinación v2. Sólo escribe estado técnico de Solicitud.
- **Unidad 2 — Membresía:** lee primero active/lifecycle guards, cardinalidad Persona–Grupo, raíz, períodos 1 y límite, abiertos y contexto exacto de Temporada; luego modifica únicamente raíz Membresía, Períodos de Vigencia subordinados y guards en una transacción Firestore propia.
- **Unidad 3 — Solicitud/finalización:** lee Solicitud, pending guard, intent, coordinación y activación exacta por capacidad pública; luego aprueba v3 y consume intent, o consume un outcome no terminal. Elimina la coordinación en ambos caminos.
- **Fallo antes de Unidad 2:** Solicitud continúa pendiente o recuperable; Membresía sigue finalizada.
- **Fallo después de Unidad 2:** Membresía activa permanece válida; coordinación registra que falta confirmar Solicitud y el retry continúa.
- **Fallo después de Unidad 3:** consulta autoritativa devuelve `APPROVED`.

No existe rollback conjunto, Repositorio compartido ni transacción global Solicitud–Membresía. Grupo, Temporada y Persona son validaciones externas y no se escriben.

### 17.1 Decisión D5 — Consistencia de Temporada

Se reutiliza y estrecha la capacidad pública del Módulo Grupos ya existente, con contrato definitivo:

```text
assertOpenSeasonForMembership({ unitOfWork, groupId, seasonId })
→ { status: "open" }
  | { status: "absent" | "changed" | "incompatible" }
```

Reglas de implementación:

1. `unitOfWork` es la transacción Firestore ya abierta por la capacidad de Membresías; nunca se expone al dominio ni al cliente.
2. El proveedor de Temporada lee dentro de esa transacción `openSeasonGuards/{groupId}` y la Temporada exacta referenciada por el guard mediante su infraestructura privada.
3. Verifica schema de guard y Temporada, `groupId`, `seasonId` y `estado == "abierta"`.
4. Devuelve sólo el value object de estado; no entrega Repositorio, referencia, snapshot, documento ni Aggregate Root.
5. Membresías invoca esta capacidad después de leer raíz, períodos y guards propios, pero antes de cualquier escritura. Todas las lecturas de la transacción preceden a todas sus escrituras.
6. Grupo y Temporada no se modifican.
7. La futura operación de cierre de Temporada deberá actualizar la raíz Temporada y retirar su open guard en su propia transacción. Como la reactivación lee ambos documentos, Firestore detectará la concurrencia: una de las transacciones reintentará y la reactivación sólo confirmará si la relectura sigue devolviendo `open` para la misma `seasonId`.

La capacidad actual ya acepta `unitOfWork` y no filtra tipos privados. La adaptación requerida es sustituir su consulta abierta general por lectura del guard y documento exacto para que la dependencia de concurrencia quede explícita y acotada. No hace falta ampliar el contrato entre Agregados ni importar un Repositorio ajeno.

Para una Membresía finalizada, cualquier estado `absent`, `changed` o `incompatible` se mapea públicamente a `MEMBERSHIP_SEASON_NOT_REACTIVATABLE`; `incompatible` conserva clasificación interna diferenciada para observabilidad. Para la creación inicial ausente de Membresía, E2-07 conserva sus outcomes vigentes.

### 17.2 Carrera reactivación–finalización

La coordinación v2 fija antes de la reactivación el `membershipId` y `expectedActivationOrdinal`. Rige el siguiente orden cerrado:

1. la Unidad 2 confirma atómicamente la raíz activa, el nuevo Período de Vigencia y active guard v2;
2. CU-027 puede finalizar esa misma activación antes de la Unidad 3;
3. la Unidad 3 relee por capacidad pública la Membresía y exactamente `validityPeriods/{periodId(expectedActivationOrdinal)}`;
4. si el período ya está cerrado o la raíz ya está finalizada, la Solicitud no se aprueba;
5. en esa misma transacción se elimina la coordinación;
6. el decision intent queda `consumed` con `MEMBERSHIP_REACTIVATION_SUPERSEDED`;
7. la Solicitud y su pending guard permanecen pendientes;
8. un retry con la misma idempotency key resuelve el mismo intent consumido, devuelve el mismo outcome y no invoca reactivación;
9. otro intento requiere una nueva confirmación humana y una nueva idempotency key; podrá fijar el siguiente ordinal sólo tras releer la finalizada vigente;
10. no existe rollback ni compensación sobre la reactivación o finalización válidas;
11. si la Unidad 3 aprueba primero y CU-027 finaliza después, la Solicitud aprobada continúa siendo válida y consultable como resultado histórico.

La carrera no usa hashes históricos de guards: mientras la activación está abierta, el active guard v2 prueba recuperación vigente; si CU-027 gana, la coordinación ya identifica el período exacto y su cierre autoritativo prueba `SUPERSEDED`.

### 17.3 Otras carreras cerradas

- **Cierre de Temporada:** si cierre y Unidad 2 se solapan, ambos leen/escriben la raíz Temporada y su open guard según sus propias transacciones; Firestore reintenta una de ellas. La reactivación sólo confirma si su relectura ve la misma Temporada abierta. Si el cierre confirma después de Unidad 2, no invalida retroactivamente la activación ni impide que Unidad 3 apruebe el efecto ya válido.
- **Dos aprobaciones:** misma clave recupera el mismo intent/coordinación; claves distintas compiten por la coordinación única por `requestId`, y sólo una obtiene claim. La otra devuelve `APPROVAL_IN_PROGRESS` o el terminal autoritativo sin tocar Membresía.
- **Aprobación frente a rechazo/cancelación:** quien confirme el estado terminal o el claim válido primero determina el camino; ninguna operación que encuentre una coordinación ajena activa puede rechazar/cancelar ni crear otro efecto.
- **Retries concurrentes:** IDs deterministas de período, guard Persona–Grupo, coordinación por `requestId` e intent por UID+clave hacen que como máximo exista una escritura de cada efecto. Una asimetría no se repara: falla `INCOMPATIBLE_STATE`.

## 18. Reglas e índices

- Firestore mantiene `allow read, write: if false` para `memberships`, ambos guards y todas las colecciones de Solicitudes/coordinación implicadas.
- Se agrega una regla explícita anidada `match /memberships/{membershipId}/validityPeriods/{periodId} { allow read, write: if false; }`; el match de la raíz no cubre automáticamente subcolecciones.
- visitante, Usuario, candidata, integrante, Owner y admin global no leen ni escriben directamente estas colecciones; el acceso funcional es por callable y backend autorizado.
- el índice existente `memberships(personId ASC, groupId ASC, estado ASC)` soporta comprobaciones por par/estado;
- el índice existente `groupJoinRequests(groupId ASC, estado ASC, createdAt DESC)` soporta el listado Owner;
- la consulta de períodos abiertos usa `memberships/{membershipId}/validityPeriods.where("estado", "==", "abierto").limit(2)` y queda cubierta por indexación automática de campo único; períodos 1 y límite se leen por ID determinista;
- no se agrega ningún índice compuesto. Si Emulator contradice esta expectativa, la implementación debe detenerse y actualizar la ficha antes de modificar `firestore.indexes.json`.

## 19. Frontend y accesibilidad

### 19.1 Rutas y componentes

- Ruta modificada indirectamente: `/dashboard/groups/[groupId]`.
- Componente adaptable: `PendingGroupJoinRequestsSection`.
- Servicio adaptable: `groupJoinRequestsService.ts`.
- Tipos adaptables: `GroupJoinRequest.ts`.
- `OwnMembershipSection` se preserva: reactivación owner/self está fuera de alcance.
- Ruta member-scoped preservada: `/dashboard`; `MyCurrentGroupMembershipsSection` sólo adapta la etiqueta temporal, sin nueva consulta ni navegación.

### 19.2 UX definitiva

- `approvalEffect == "CREATE_MEMBERSHIP"`: el item y diálogo conservan la semántica “crear Membresía y aprobar” de E2-07;
- `approvalEffect == "REACTIVATE_MEMBERSHIP"`: el item informa “Reingreso: esta aprobación requiere reactivar la Membresía existente”; el botón continúa siendo “Aprobar” y el diálogo titula “Reactivar Membresía y aprobar Solicitud”;
- cancelar no invoca backend;
- confirmación bloquea doble envío y conserva la intención ante resultado incierto;
- progreso distingue reactivación de creación sin exponer historia privada;
- éxito se confirma desde estado autoritativo;
- `MEMBERSHIP_SEASON_NOT_REACTIVATABLE` muestra: “La Membresía anterior no puede reactivarse en la Temporada actual.” No ofrece renovación ni crea una intención nueva automáticamente;
- conflicto, no autorización, dependencia y corrupción conservan feedback diferenciado y retry sólo cuando corresponde;
- diálogo con `alertdialog`, nombre/descripción, Escape, foco inicial y retorno de foco;
- región de estado anunciable, controles de al menos 44 px, teclado completo y vistas de 360 px, 768 px y escritorio sin scroll horizontal.

`approvalEffect` llega en el listado autoritativo. No se permite probar primero, confiar en estado cliente, ni traducir un error como mecanismo normal para elegir el diálogo.

### 19.3 Readers, DTO y semántica visible

Todos los readers de Membresía afectados aceptan v1, v2 y v3 con schemas cerrados:

| Reader/consulta | Alcance | Adaptación obligatoria |
| --- | --- | --- |
| `firestoreMembershipRepository.getById/fromSnapshot` | Base compartida | Hidratar v1/v2/v3; en v3 validar período 1 y límite cuando participe de una operación íntegra |
| `firestoreMyMembershipReader.getActiveForOwner` | Owner/self | Aceptar activa v1/v3 y active guard v1/v2 correlacionado |
| `firestoreMembershipLifecycleGuard.getForOwner` | Owner/self, activa/finalizada | Aceptar los pares legacy y v3/v2 de guard; CU-027 escribe siempre v3 |
| `firestoreMyCurrentGroupMembershipsReader` | Member-scoped | Consultar activas v1/v3, validar guard/períodos v3 y conservar paginación |
| `membershipCandidateContext.assertNoActive` | Candidate/member-scoped | Detectar activa v1/v3 y guard correlacionado sin exponer dominio |
| `groupJoinRequestMembershipCapability` | Solicitud Owner | Distinguir ausente, activa y finalizada v2/v3; devolver sólo value objects públicos mínimos |
| `activePairQuery` / `finalizedPairQuery` | Integridad Persona–Grupo | Mantener igualdad por persona/grupo/estado y `limit(2)`; no filtrar por schemaVersion |

`listMyCurrentGroupMemberships` conserva íntegramente el contrato y cursor `listMyCurrentGroupMemberships:v1`. Ordena por `fechaIngreso DESC` y luego `membershipId DESC`; el cursor existente conserva timestamp y último ID. Como `fechaIngreso` continúa significando primera incorporación histórica, una reactivación no mueve la Membresía en el orden. Los DTO `toMembershipDto`, `toFinalizedMembershipDto` y `toMyCurrentGroupMembershipItem`, junto con `OwnMembership` y `MyCurrentGroupMembership`, no exponen períodos, ordinales, resúmenes ni `approvalEffect`.

En toda vista que muestre `fechaIngreso`, incluida `MyCurrentGroupMembershipsSection`, la etiqueta pasa a **“Primera incorporación”** o equivalente inequívoco. Queda prohibido “Activo desde”, porque el inicio vigente vive en el período abierto y no se publica en E2-09.

## 20. Observabilidad y privacidad

- registrar operación, etapa, clasificación, intento y resultado estable;
- permitir correlación por IDs opacos o hashes sanitizados, sin clave cruda;
- no registrar nombres, email, contenido de payload, tokens, documentos, stacks públicos, fechas históricas personales ni snapshot Firestore;
- distinguir `first-attempt`, `contention-reread`, `ambiguous-reread` y continuación de coordinación;
- no afirmar aprobación mientras Solicitud no esté confirmada;
- métricas, notificaciones y Actividad quedan fuera del commit obligatorio;
- no se introduce proveedor nuevo de observabilidad.

## 21. Tratamiento del legado

### 21.1 Preservado

- `memberIds`, `adminIds`, `admins` y sus consumidores/escritores ajenos al flujo;
- salida legacy `/join` para integrante ya presente en `memberIds`;
- alta/baja legacy separada de integrantes;
- solicitudes administrativas y `pendingAdminRequestIds`;
- alertas de remoción y responsabilidades compartidas de Torneos;
- consumidores de partidos/torneos que todavía usan arrays.

### 21.2 Prohibido en E2-09

- agregar o quitar UID en arrays como efecto de reactivación;
- adoptar un array como evidencia de Membresía;
- restaurar solicitudes de ingreso legacy retiradas;
- emitir alertas/notificaciones legacy como sustituto de estado canónico;
- migrar, limpiar, backfillear o retirar estructuras fuera del flujo.

### 21.3 Condición futura de retiro

Los arrays restantes sólo podrán retirarse tras inventariar y adaptar sus consumidores por flujo, incluida la pertenencia requerida por Partidos y Torneos. No son autoridad para E2-09.

## 22. Inventario técnico focal clasificado

| Pieza | Clasificación | Uso previsto |
| --- | --- | --- |
| `functions/src/memberships/domain/membership.js` | Adaptable | Incorporar raíz v3, Período de Vigencia v1 y transiciones cerradas |
| `membershipContract.js`, `membershipDto.js`, `membershipErrors.js` | Adaptable | Preservar DTO y agregar outcome temporal definitivo |
| `membershipHashing.js`, `membershipObservability.js` | Adaptable | Dominios de hash y etapas E2-09 |
| `firestoreMembershipRepository.js` | Adaptable | Persistir/hidratar el schema histórico aprobado |
| `firestoreMembershipLifecycleGuard.js` | Adaptable | Reemplazo lifecycle→active y recuperación |
| `firestoreActiveMembershipGuard.js` | Reutilizable/adaptable | Unicidad y validación; carrera con alta/finalización |
| `firestoreMyMembershipReader.js` | Adaptable | Owner/self sobre activa v1/v3 y guard v1/v2 |
| `firestoreMyCurrentGroupMembershipsReader.js` | Adaptable | Reader member-scoped v1/v3, orden y cursor v1 preservados |
| `membershipCandidateContext.js` | Adaptable | Consulta candidate/member-scoped compatible con activa v1/v3 |
| `memberships/public/groupJoinRequestMembershipCapability.js` | Adaptable | Punto público natural para reactivar/recuperar |
| `membershipModule.js` | Reutilizable | Composición del módulo; cambio mínimo si aparece dependencia interna |
| `groupJoinRequestService.js` | Reutilizable | Orquestación pública existente |
| `firestoreGroupJoinRequestStore.js` | Adaptable | Fases de aprobación y coordinación recuperable |
| `groupJoinRequestContract.js`, DTO, errors, hashing | Adaptable | Agregar `approvalEffect` y outcome; entrada de aprobación preservada |
| `groupJoinRequestModule.js` | Reutilizable | Ya consume capacidad pública de Membresías |
| `groups/public/groupJoinRequestGroupCapability.js` | Reutilizable | Grupo y ownership contextuales |
| `groups/public/groupJoinRequestSeasonCapability.js` | Adaptable | Lectura estrecha de guard + Temporada exacta dentro de la UoW recibida |
| `persons/public/groupJoinRequestPersonCapability.js` | Reutilizable | Persona de Solicitud |
| callables E2-07 de aprobar/consultar | Reutilizable | No crear endpoint paralelo si no resulta necesario |
| `functions/index.js` | Preservada | Sin export nuevo previsto |
| `PendingGroupJoinRequestsSection.tsx` | Adaptable | Confirmación, progreso y feedback de reactivación |
| `groupJoinRequestDecisionMachine.*` | Adaptable | Estado cliente y recuperación |
| `groupJoinRequestsService.ts`, `types/GroupJoinRequest.ts` | Adaptable | `approvalEffect` y outcome temporal cerrados |
| `MyCurrentGroupMembershipsSection.tsx` | Adaptable | Etiqueta “Primera incorporación”; contrato y orden sin cambios |
| `membershipsService.ts`, `types/MyCurrentGroupMembership.ts`, `types/OwnMembership.ts` | Reutilizables | DTO v1 sin períodos; sólo ajustar tests/tipos si la implementación lo exige |
| `OwnMembershipSection.tsx` | Preservada | Reactivación owner/self excluida |
| `/join/groups/[groupId]` y `GroupJoinRequestCandidate` | Preservada | Solicitud de reingreso ya canónica |
| `firestore.rules` | Adaptable | Agregar deny-all explícito para la subcolección, preservando lo demás |
| `firestore.indexes.json` | Reutilizable; cambio esperado nulo | Índices existentes suficientes salvo nueva consulta histórica |
| suites unitarias de Membership y Solicitud | Adaptables | Agregar transición, contratos, coordinación y arquitectura |
| `membershipE2.test.js`, `groupJoinRequestDecisionE2.test.js`, gaps E2 | Adaptables | Carreras, recuperación, cardinalidad y regresión |
| `legacyJoinRetirementE2.test.js` | Reutilizable | Probar que no reaparecen writers/listeners retirados |
| rutas admin legacy, HTTP `/join`, servicios de integrantes | Fuera de alcance/preservadas | No reinterpretar ni retirar |
| notificaciones, pending alerts, Actividad | Fuera de alcance | Cero efectos obligatorios |

## 23. Plan de pruebas

| Nivel | Casos mínimos | Evidencia futura |
| --- | --- | --- |
| Dominio | transición válida; estado inválido; identidad/referencias; historia de uno y varios ciclos | Unitarias puras |
| Contrato | entrada cerrada; DTO compatible; discriminante Owner; errores sanitizados | Unitarias |
| Aplicación | actor, autorización, Temporada, coordinación y mapeos | Unitarias con dobles |
| Persistencia | schemas exactos, guards correlacionados, recuperación y fallos | Unitarias de adaptadores + Emulator |
| Concurrencia | doble aprobación; finalizar/reactivar; alta/reactivar; cancelación/rechazo; cambio de Owner/Temporada | Emulator determinista |
| Arquitectura | un Aggregate Root, Repositorio propio, capacidades públicas, sin Firebase en dominio/aplicación | Pruebas estáticas ejecutables |
| Reglas | deny-all directo para todos los actores; callable autorizado | Emulator |
| Frontend | confirmación, single-flight, foco, anuncios, errores y retry | Máquina/helper + build futuro |
| Legado | cero escrituras a arrays y no restauración del flujo E2-08 | Arquitectura + Emulator |
| Regresión | E2-01–E2-08, en especial finalización, listado y decisión | Gate canónico futuro |

No se ejecutó ninguna suite durante esta definición.

Casos temporales obligatorios adicionales:

- v1 activa se finaliza a v3 con período 1 cerrado determinista;
- v2 finalizada se reactiva a v3 con período 1 sintetizado y período 2 abierto;
- v3 admite al menos dos ciclos completos sin perder intervalos;
- `fechaEgreso` queda ausente —no `null`— en activa y presente en finalizada;
- timestamp ausente, inválido, invertido o no Firestore falla cerrado;
- period ID, ordinal, `periodCount`, `latestPeriodId`, root y guards quedan correlacionados;
- cero, dos o más períodos abiertos según estado incompatible fallan sin reparación;
- mismo retry no crea un segundo período;
- contención reactivación/finalización converge a un solo estado válido;
- falla después de crear período/raíz y antes de aprobar conserva coordinación recuperable;
- cierre de Temporada concurrente impide que una reactivación confirme contra contexto stale.
- altas E2-03 y E2-07 crean raíz v3, período 1 abierto y active guard v2 atómicos; sus retries no duplican período;
- CU-027 acepta activa v1 y v3, permite `startedAt == endedAt` y produce finalizada v3/lifecycle guard v2;
- readers owner/self, member-scoped y candidate aceptan combinaciones legacy válidas y v3, pero rechazan cruces de versiones;
- `listMyCurrentGroupMemberships:v1` conserva orden `fechaIngreso DESC, membershipId DESC`, cursor y DTO sin períodos;
- una Solicitud aprobada v2 y una v3 mantienen `APPROVED` después de finalizar y reactivar varias veces la Membresía;
- `getGroupJoinRequestDecisionResult` no consulta active/lifecycle guard para una aprobación histórica;
- intent consumido por Temporada incompatible o reactivación superseded devuelve el mismo outcome para igual clave y no ejecuta Membresía;
- snapshots arquitectónicos prohíben Repositorio/superficie pública de períodos, imports privados entre Agregados y writers alternativos.

## 24. UAT manual reproducible

UAT futura exclusivamente con Auth, Firestore y Functions Emulator, loopback, proyecto `demo-*` y fixtures sintéticos por IDs registrados:

1. Crear Owner A con Cuenta/Persona, Grupo G y Temporada T abierta.
2. Crear candidata B con Cuenta/Persona y una Membresía M en G/T; finalizar M por fixture canónico o helper versionado.
3. Como B, crear Solicitud S de reingreso y comprobar que sigue pendiente tras recarga.
4. Como A, abrir G y comprobar que S indica reactivación antes de confirmar.
5. Cancelar el diálogo y verificar cero escrituras.
6. Confirmar; observar progreso no optimista y resultado aprobado.
7. Recargar y verificar S aprobada, misma `membershipId`, raíz v3 activa sin `fechaEgreso`, períodos 1 cerrado y 2 abierto, active guard único, lifecycle guard retirado y coordinación cerrada.
8. Repetir/consultar después de una respuesta simulada perdida y verificar `ALREADY_APPROVED`/`APPROVED`, sin duplicados.
9. Probar Temporada cerrada o distinta: no reactivar ni aprobar.
10. Probar no Owner y admin global legado: denegados.
11. Probar carrera aprobación/cancelación y aprobación/aprobación: una sola terminal y una sola activa.
12. Verificar teclado, Escape, foco, anuncios y responsive en 360 px, 768 px y escritorio.
13. Inspeccionar persistencia por Admin SDK local de sólo lectura: cardinalidad, correlación, historia preservada y cero escrituras en arrays, alertas, notificaciones y Actividad.
14. Preparar una carrera controlada con cierre de Temporada: comprobar que no coexisten cierre confirmado y reactivación basada en una lectura anterior.
15. Volver a finalizar y reactivar en la misma Temporada abierta mediante fixtures autorizados: comprobar ordinales contiguos, un solo abierto y conservación de todos los intervalos.
16. Forzar el interleaving Unidad 2 → CU-027 → Unidad 3: comprobar Solicitud/pending guard pendientes, coordinación ausente, intent consumido con `MEMBERSHIP_REACTIVATION_SUPERSEDED` y misma clave sin nueva activación.
17. Reintentar con nueva confirmación y nueva clave: comprobar apertura del ordinal siguiente y posterior aprobación; la aprobación anterior que haya quedado confirmada en otro ciclo debe seguir consultable.
18. Crear altas nuevas por E2-03 y por aprobación E2-07: inspeccionar raíz v3, período 1 abierto y active guard v2; finalizar una activa v1 y comprobar upgrade atómico a v3.
19. Listar membresías antes y después de reactivar: comprobar orden/cursor idénticos y etiqueta “Primera incorporación”, nunca “Activo desde”.

Fixtures y cleanup deberán usar IDs explícitos y no borrar colecciones completas.

## 25. Criterios Dado/Cuando/Entonces

1. **Dado** una Solicitud pendiente y una Membresía finalizada de la misma Persona, Grupo y Temporada abierta vigente, **cuando** el Owner aprueba, **entonces** se reactiva la misma Membresía y después se confirma la Solicitud.
2. **Dado** una Membresía finalizada de Temporada cerrada o distinta, **cuando** se intenta aprobar, **entonces** no se modifica ningún Agregado y se devuelve un outcome estable.
3. **Dado** una Membresía activa del par, **cuando** se intenta reactivar, **entonces** no se duplica ni adopta y falla cerrado salvo que sea el resultado correlacionado del mismo retry.
4. **Dado** un fallo después de reactivar y antes de aprobar, **cuando** se reintenta, **entonces** se recupera la misma Membresía y la coordinación converge.
5. **Dado** una respuesta perdida después de aprobar, **cuando** se consulta, **entonces** se devuelve `APPROVED` sin nuevos efectos.
6. **Dado** aprobación y cancelación/rechazo concurrentes, **cuando** compiten, **entonces** una sola terminal gana y una Solicitud cancelada/rechazada nunca reactiva.
7. **Dado** dos aprobaciones concurrentes, **cuando** alcanzan las unidades de consistencia, **entonces** existe como máximo una Membresía activa y una Solicitud aprobada.
8. **Dado** un actor no Owner o un admin global legado, **cuando** invoca el callable, **entonces** recibe denegación y no accede a datos privados.
9. **Dado** cualquier actor cliente, **cuando** accede directamente a las colecciones implicadas, **entonces** reglas deniegan lectura y escritura.
10. **Dado** una Membresía con ciclos previos, **cuando** se reactiva y vuelve a finalizar, **entonces** cada intervalo histórico sigue siendo reconstruible desde `validityPeriods`, con ordinales contiguos y timestamps no superpuestos.
11. **Dado** el flujo E2-09, **cuando** se completa o falla, **entonces** no escribe `memberIds`, `adminIds`, `admins`, notificaciones, alertas ni Actividad.

12. **Dado** una finalizada v2 íntegra sin períodos, **cuando** se reactiva por primera vez, **entonces** el período 1 se sintetiza exactamente desde sus fechas, el período 2 abre con el timestamp de la transición y la raíz queda v3 activa sin `fechaEgreso`.
13. **Dado** una reactivación que leyó Temporada abierta, **cuando** un cierre concurrente modifica Temporada/open guard, **entonces** Firestore reintenta o aborta y nunca confirma usando el contexto obsoleto.
14. **Dado** que CU-027 cierra el período recién abierto antes de la fase final, **cuando** ésta relee la activación exacta, **entonces** consume `MEMBERSHIP_REACTIVATION_SUPERSEDED`, libera coordinación y mantiene Solicitud/pending guard pendientes.
15. **Dado** el mismo intent consumido como superseded, **cuando** llega un retry con igual clave, **entonces** devuelve el mismo outcome sin abrir otro período; una nueva decisión usa nueva clave.
16. **Dado** una Solicitud aprobada v3, **cuando** su Membresía se finaliza o reactiva después, **entonces** `getGroupJoinRequestDecisionResult` conserva el resultado desde Solicitud/intent sin depender de guards vigentes.
17. **Dado** una alta nueva de E2-03 o E2-07, **cuando** confirma, **entonces** crea atómicamente raíz v3, período 1 abierto y active guard v2.
18. **Dado** una activa v1, **cuando** CU-027 finaliza, **entonces** materializa y cierra el período 1, escribe raíz v3/lifecycle guard v2 y no inventa timestamps.
19. **Dado** una Membresía reactivada, **cuando** se lista member-scoped, **entonces** conserva contrato/cursor v1, ordena por la primera `fechaIngreso` y muestra “Primera incorporación”.

## 26. Riesgos y rollback

| Riesgo | Mitigación requerida |
| --- | --- |
| Pérdida de historia al quitar `fechaEgreso` de raíz activa | Períodos autoritativos atómicos y prueba de ciclos repetidos |
| Duplicación activa | Transacción y guards Persona–Grupo; carreras Emulator |
| Solicitud aprobada sin reactivación | Orden Membresía→verificación→Solicitud y coordinación durable |
| Membresía activa con Solicitud pendiente tras fallo | Recuperación E2-07 adaptada e idempotente |
| Reactivar Temporada cerrada/stale | Validar `seasonId` exacta dentro de la unidad de Membresía |
| Filtrar historia privada al Owner | Contrato mínimo con sólo discriminante de acción |
| Reintroducir arrays legacy | Pruebas arquitectónicas y de ausencia de escrituras |
| Ampliación accidental a roster | Inventario vinculante y exclusiones explícitas |
| Rollback de lector frente a raíz v3 | Prohibir rollback sólo de código; fixtures locales se eliminan por ID y cualquier despliegue futuro requiere plan forward-compatible |

- **Rollback de código futuro:** revertir el incremento completo, nunca habilitar doble escritura legacy.
- **Datos locales:** reinicializar sólo fixtures E2-09 por IDs registrados.
- **Datos remotos:** no aplican; no hay deploy autorizado.
- **Interrupción obligatoria:** necesidad de alterar otro Agregado fuera de la coordinación, imposibilidad de preservar historia, schema no aprobado, carrera crítica no demostrable o dependencia nueva no justificada.

## 27. Inventario de archivos previsto

### Backend probablemente adaptable

- `volley-ranking-system/functions/src/memberships/domain/membership.js`
- `volley-ranking-system/functions/src/memberships/application/membershipErrors.js`
- `volley-ranking-system/functions/src/memberships/application/membershipContract.js`
- `volley-ranking-system/functions/src/memberships/application/membershipDto.js`
- `volley-ranking-system/functions/src/memberships/application/membershipHashing.js`
- `volley-ranking-system/functions/src/memberships/application/membershipObservability.js`
- `volley-ranking-system/functions/src/memberships/application/membershipService.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipRepository.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipLifecycleGuard.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreActiveMembershipGuard.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMyMembershipReader.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMyCurrentGroupMembershipsReader.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipCandidateContext.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipModule.js`
- `volley-ranking-system/functions/src/memberships/public/groupJoinRequestMembershipCapability.js`
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestContract.js`
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestDto.js`
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestErrors.js`
- `volley-ranking-system/functions/src/groupJoinRequests/application/groupJoinRequestHashing.js`
- `volley-ranking-system/functions/src/groupJoinRequests/domain/groupJoinRequest.js`
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore.js`
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/groupJoinRequestCallable.js`
- `volley-ranking-system/functions/src/groupJoinRequests/infrastructure/groupJoinRequestModule.js`
- `volley-ranking-system/functions/src/groups/public/groupJoinRequestSeasonCapability.js`

### Frontend probablemente adaptable

- `volley-ranking-frontend/src/components/groupJoinRequests/PendingGroupJoinRequestsSection.tsx`
- `volley-ranking-frontend/src/components/groupJoinRequests/groupJoinRequestDecisionMachine.mjs`
- `volley-ranking-frontend/src/components/groupJoinRequests/groupJoinRequestDecisionMachine.d.mts`
- `volley-ranking-frontend/src/components/memberships/MyCurrentGroupMembershipsSection.tsx`
- `volley-ranking-frontend/src/services/groupJoinRequestsService.ts`
- `volley-ranking-frontend/src/types/GroupJoinRequest.ts`

### Pruebas a extender o crear

- `volley-ranking-system/functions/test/unit/membershipDomain.test.js`
- `volley-ranking-system/functions/test/unit/membershipContract.test.js`
- `volley-ranking-system/functions/test/unit/membershipGuard.test.js`
- `volley-ranking-system/functions/test/unit/membershipLifecycle.test.js`
- `volley-ranking-system/functions/test/unit/membershipCursor.test.js`
- `volley-ranking-system/functions/test/unit/membershipHashing.test.js`
- `volley-ranking-system/functions/test/unit/membershipArchitecture.test.js`
- `volley-ranking-system/functions/test/unit/membershipService.test.js`
- `volley-ranking-system/functions/test/unit/groupJoinRequestContract.test.js`
- `volley-ranking-system/functions/test/unit/groupJoinRequestCallable.test.js`
- `volley-ranking-system/functions/test/unit/groupJoinRequestDecisionE2.test.js`
- `volley-ranking-system/functions/test/emulator/groupJoinRequestDecisionE2.test.js`
- `volley-ranking-system/functions/test/emulator/groupJoinRequestDecisionGapsE2.test.js`
- `volley-ranking-system/functions/test/emulator/membershipE2.test.js`
- `volley-ranking-system/functions/test/emulator/membershipListE2.test.js`
- `volley-ranking-system/functions/test/unit/membershipValidityPeriod.test.js` (nueva);
- `volley-ranking-system/functions/test/emulator/membershipReactivationE2.test.js` (nueva, interleavings y Períodos de Vigencia);
- runner unitario y Emulator sólo para registrar la nueva suite.

### Cambio esperado nulo salvo evidencia

- `volley-ranking-system/functions/index.js`
- `volley-ranking-system/firestore.indexes.json`
- dependencias y lockfiles.

### Infraestructura a modificar

- `volley-ranking-system/firestore.rules`, exclusivamente para deny-all explícito de `validityPeriods`.

El inventario es vinculante por responsabilidad; la revisión de implementación deberá justificar cualquier archivo adicional. Los nombres internos reversibles pueden variar sin alterar schemas, contratos ni ownership.

## 28. Dependencias, decisiones resueltas y criterio de cierre

### 28.1 Separación de categorías

| Categoría | Estado |
| --- | --- |
| Normativa aprobada | Misma Membresía; sólo Temporada abierta; unicidad activa; historia preservada; límites de Agregados |
| Comportamiento actual | Finalizada v2 + lifecycle guard; aprobación devuelve `MEMBERSHIP_REACTIVATION_REQUIRED` |
| Deuda técnica | Guards/intents sin TTL; N+1 acotado; arrays y writers legacy; baseline lint; reparación de corrupción ausente |
| Decisiones funcionales E2-09 | Resueltas por AUD-C05: Períodos de Vigencia, fechas, aprobación durable y carrera reactivación–finalización |
| Decisiones físicas E2-09 | Cerradas en esta ficha: schemas v3/v2/v1, IDs, UoW, capacidades, reglas, readers, DTO, UX e índices |

La deuda técnica no define el siguiente caso de uso y no se incorpora para “aprovechar” E2-09.

### 28.2 Decisiones D1–D7 declaradas y resultado de la revisión

| ID | Decisión | Resolución | Fundamento de compatibilidad |
| --- | --- | --- | --- |
| D1 | Historia temporal | Período de Vigencia subordinado en `validityPeriods`; raíz, período y guards en una UoW de Membresía | **Resuelta:** AUD-C05 distingue y legitima el ciclo de vida propio, manteniendo fuera toda historia externa. |
| D2 | Fechas | `fechaIngreso` = primer ingreso inmutable; `fechaEgreso` ausente en activa y último egreso en finalizada; períodos reconstruyen intervalos | **Resuelta:** AUD-C05 fija la semántica; esta ficha permite `inicio == fin` y conserva DTO/cursor v1. |
| D3 | Discriminante Owner | `approvalEffect` con `CREATE_MEMBERSHIP | REACTIVATE_MEMBERSHIP`, sólo salida derivada | Describe efecto de CU-032 y no habilita una acción cliente arbitraria |
| D4 | Temporada incompatible | Único `MEMBERSHIP_SEASON_NOT_REACTIVATABLE` | Comunica el hecho comprobado sin afirmar CU-029 ni ampliar el contrato |
| D5 | Consistencia de Temporada | Capacidad pública estrecha lee open guard + Temporada exacta dentro de la UoW de Membresía, antes de escrituras | No expone privados; la futura transacción de cierre genera conflicto/reintento sobre documentos leídos |
| D6 | Correlación durable | Solicitud aprobada v3 + decision intent v2; coordinación sólo durante progreso | **Resuelta:** el resultado no depende de estado ni hashes de guards futuros. |
| D7 | Reactivación–finalización | Intent consumido `MEMBERSHIP_REACTIVATION_SUPERSEDED`, coordinación eliminada, Solicitud/pending guard pendientes | **Resuelta:** orden y recuperación definidos por AUD-C05 y §17.2. |

No queda contradicción normativa material. Los Períodos de Vigencia no son Aggregate Roots ni poseen Repositorio o superficie pública propia; Grupo y Temporada no se incorporan a la frontera ni se escriben; Solicitud conserva una unidad separada recuperable.

### 28.3 Decisiones físicas reversibles durante implementación

- nombre de helpers privados y distribución interna de archivos;
- mecanismo privado para etiquetar etapas de error;
- extensión de suites existentes o creación de una suite focal;
- redacción cosmética final, sin alterar el feedback semántico definido.

Estas decisiones no cambian contratos, persistencia, autorización ni UX y no bloquean la revisión documental. Un índice compuesto no es una decisión abierta: la expectativa cerrada es no agregarlo; evidencia Emulator contraria obliga a volver a definición.

### 28.4 Resultado de la revisión documental final

La única revisión interna final confirma:

- compatibilidad de raíz v3 y período v1 con los 13 Agregados normativos;
- evolución determinista y sin pérdida de v1/v2;
- ausencia de `fechaEgreso` en activa;
- contratos y outcome exactos;
- lectura transaccional pública de Temporada sin dependencia privada;
- separación de UoW Solicitud/Membresía;
- UX Owner basada sólo en `approvalEffect` autoritativo;
- ausencia de roster, renovación, administración de Grupo o retiro legacy adicional.
- legitimidad de los Períodos de Vigencia conforme AUD-C05, sin convertir Actividad ni estado técnico en autoridad;
- correlación durable en Solicitud/intent y recuperación de aprobaciones anteriores tras múltiples ciclos;
- carrera CU-028/CU-027 cerrada sin rollback ni reactivación automática;
- writers nuevos de E2-03/E2-07 y CU-027 compatibles con v3;
- inventario completo de readers, DTO, guards, rehidratación, coordinación, UX y pruebas.

### 28.5 Criterio de cierre futuro

E2-09 sólo podrá cerrarse cuando implementación, pruebas unitarias/contractuales/arquitectónicas, Emulator, reglas, frontend accesible, UAT, inspección persistente local, evidencia de no escritura legacy, rollback, versionado e integración estén aprobados; no exista acceso remoto; y la ficha, informe y cierre reflejen el contrato realmente entregado.

### 28.6 Decisiones abiertas

No quedan decisiones fundamentales abiertas que cambien contratos, persistencia, autorización o UX. Durante implementación sólo pueden resolverse los detalles reversibles de §28.3. Cualquier necesidad de agregar campos, cambiar outcomes, consultar otro Agregado, incorporar un índice compuesto o alterar las unidades de consistencia obliga a detener la implementación y devolver la ficha a `En definición`.

## Veredicto documental

**E2-09 LISTO PARA IMPLEMENTACIÓN**
