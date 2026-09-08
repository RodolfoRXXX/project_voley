# E2-07 — Informe de implementación de decisión de Solicitud de ingreso

## 1. Identificación y resultado

- Incremento: `E2-07 — Decisión de Solicitud de ingreso y coordinación con Membresía`.
- Ficha normativa: `docs/implementacion/etapa-2/E2-07-ficha-decision-solicitud-ingreso.md`.
- Rama: `feat/e2-07-group-join-request-decision`.
- HEAD y merge-base: `762c830545be05d15091155e51502a4f6955a207`.
- Estado de entrega: cambios locales sin commit ni staging; UAT pendiente.

Se implementaron aprobación y rechazo owner-scoped, consulta autoritativa, evolución mínima del listado Owner, recuperación de aprobación en fases, compatibilidad candidata con `APPROVAL_IN_PROGRESS`, reglas deny-all, observabilidad y frontend accesible. Solicitud y Membresía continúan como Aggregate Roots independientes.

## 2. Arquitectura real

La solución conserva las capas existentes:

- dominio puro de Solicitud con variantes exactas, hidratación estricta y transiciones terminales;
- aplicación con contratos cerrados, DTO explícitos, errores estables, hashing e idempotencia;
- infraestructura con repositorio de Solicitud, store transaccional, callables y composición;
- coordinación intermodular exclusivamente mediante capacidades públicas estrechas de Grupo, Temporada y Membresía;
- frontend que consume callables y no importa ni accede a Firestore.

No existe una transacción global entre Agregados. Los commits funcionales siguen esta secuencia: claim técnico de Solicitud, Membresía confirmada por su propio módulo y, recién entonces, Solicitud `aprobada`.

## 3. Persistencia y schemas

`groupJoinRequests/{requestId}` conserva las variantes v1 existentes y agrega las terminales v2:

```text
pendiente v1: personId, groupId, estado, createdAt, schemaVersion
cancelada v1: personId, groupId, estado, createdAt, cancelledAt, schemaVersion
rechazada v2: personId, groupId, estado, createdAt,
               decisionIntentId, decidedBy, decidedAt, schemaVersion
aprobada v2:  personId, groupId, estado, createdAt,
               decisionIntentId, decidedBy, decidedAt, membershipId, schemaVersion
```

Los documentos técnicos nuevos son exactos y privados:

```text
groupJoinRequestDecisionIntents/{intentId} v1:
requestId, personId, groupId, action, requestedBy,
requestHash, createdAt, intentVersion

groupJoinRequestApprovalCoordinations/{requestId} v1:
requestId, personId, groupId, seasonId, decisionIntentId,
requestedBy, createdAt, coordinationVersion
```

El intent se deriva por SHA-256 length-prefixed de Owner e idempotency key. El hash de request vincula versión contractual, Solicitud, Persona, Grupo y acción. La clave cruda no se persiste. El claim usa el ID de Solicitud y se elimina sólo al confirmar la aprobación o al demostrar un fallo definitivo sin Membresía propia.

E2-07 no altera el schema de `memberships`, `activeMembershipGuards` ni `membershipLifecycleGuards`. Los hashes internos de admisión incluyen la identidad de la Solicitud y permiten distinguir una Membresía recuperable de una activa ajena.

## 4. Contratos, DTO y autorización

Se publicaron los callables:

- `approveGroupJoinRequest({ groupId, requestId, idempotencyKey })`;
- `rejectGroupJoinRequest({ groupId, requestId, idempotencyKey })`;
- `getGroupJoinRequestDecisionResult({ groupId, requestId })`.

Se evolucionó `listPendingGroupJoinRequestsForOwnedGroup` agregando únicamente `decisionStatus: "PENDING" | "APPROVAL_IN_PROGRESS"` a cada item. Los payloads son planos y cerrados; los IDs y claves respetan los límites normativos. Los DTO de decisión exponen sólo estado, fechas ISO y, para aprobación, `{ id, seasonId }` de la Membresía. No exponen Persona, UID, `decidedBy`, hashes, intents, claims, guards ni documentos Firestore.

Todos los comandos, la consulta y el listado exigen token, Cuenta compatible y `groups/{groupId}.ownerId` vigente. El claim fija al Owner aceptado; una transferencia posterior no invalida esa decisión, aunque sólo el Owner actual puede iniciar o asistir una llamada. Roles globales, arrays legacy, Membresía o ownership histórico no autorizan.

## 5. Coordinación, recuperación y concurrencia

La aprobación ejecuta tres fronteras durables:

1. transacción de Solicitud que valida autoridad, integridad, Temporada abierta e intent, y adquiere el claim;
2. capacidad pública de Membresía que crea o recupera exactamente la Membresía correlacionada bajo sus guards;
3. transacción de Solicitud que relee toda la evidencia, confirma la Membresía, transiciona a `aprobada` y elimina guard pendiente y claim.

El rechazo es una única transacción de Solicitud y nunca consulta ni escribe Membresía. Cancelación y rechazo reconocen un claim válido y responden `APPROVAL_IN_PROGRESS`. Una activa ajena no se adopta; un lifecycle finalizado devuelve reactivación requerida. Ante ausencia/cambio incompatible de Temporada, estado huérfano, cruzado, duplicado o no demostrable, el flujo falla cerrado.

Todas las lecturas transaccionales ocurren antes de las escrituras. Los retries de clave igual convergen; una reutilización incompatible produce conflicto durable. La consulta autoritativa distingue `PENDING`, `APPROVAL_IN_PROGRESS`, `CANCELLED`, `REJECTED` y `APPROVED` sin éxito optimista.

## 6. Frontend

El listado Owner incorpora acciones de aprobar, rechazar, continuar recuperación y consultar resultado. La confirmación es explícita y el componente conserva el foco de origen al cerrar. Los mensajes se anuncian mediante región viva y los controles mantienen etiquetas, tamaño mínimo y disposición responsive.

La máquina/helper testeable implementa:

- single-flight inmediato por Solicitud, independiente del ciclo de render;
- clave estable durante retry o incertidumbre y rotación para una intención nueva;
- consulta autoritativa después de errores inciertos;
- cierre por Escape y restitución programada del foco.

La vista candidata reconoce `APPROVAL_IN_PROGRESS` sin habilitar cancelación durante un claim válido. No se agregó acceso Firestore al frontend.

## 7. Reglas, índices, dependencias y observabilidad

- `groupJoinRequestDecisionIntents` y `groupJoinRequestApprovalCoordinations` quedaron deny-all para lectura y escritura cliente.
- Las pruebas directas cubren visitante, candidata, Owner, integrante, outsider y administrador global.
- No se agregó ni modificó ningún índice: el Emulator no reprodujo una necesidad nueva.
- No se agregaron dependencias ni se modificaron package files o lockfiles.
- La telemetría usa únicamente operación, etapa, clasificación, outcome/reason y duración. No registra IDs, UID, claves, hashes, payloads, snapshots ni `decidedBy`.

## 8. Inventario

Frontend:

- `GroupJoinRequestCandidate.tsx` y su estado candidato;
- `PendingGroupJoinRequestsSection.tsx`;
- `groupJoinRequestDecisionMachine.mjs` y declaración TypeScript;
- servicio y tipos de Solicitud.

Backend:

- dominio, contratos, DTO, errores, hashing y service de `groupJoinRequests`;
- repositorio, store, callable adapter y composición del módulo;
- capacidades públicas de Grupo, Temporada y Membresía;
- callables `approveGroupJoinRequest`, `rejectGroupJoinRequest` y `getGroupJoinRequestDecisionResult`;
- exports de Functions.

Infraestructura y pruebas:

- `firestore.rules`;
- runner y helper de limpieza local del Emulator;
- unitarias de arquitectura, dominio/aplicación, frontend y decisión;
- Emulator E2-07 principal, escenarios complementarios y regresión E2-06.

El inventario previo al informe es de 25 archivos modificados y 9 nuevos. Este informe agrega el décimo archivo nuevo. La ficha y documentos anteriores permanecen intactos.

## 9. Pruebas y gates

Resultados focales:

- unitarias E2-07: `28/28`;
- Emulator E2-07 principal: `11/11`;
- Emulator de escenarios complementarios: `6/6`;
- verificación causal encadenada, en una misma instancia, de E2-07 → Membresía → Temporada: `40/40` y wrapper código 0;
- typecheck posterior: aprobado.

Único gate completo canónico:

- lint baseline: aprobado, con 39 errores y 9 warnings históricos conocidos y 6 hallazgos resueltos respecto de la baseline;
- typecheck: aprobado;
- sintaxis Functions: `246/246`;
- unitarias completas: `240/240`;
- Emulator completo: `120/124` en la primera salida verificable; los cuatro conteos fallidos correspondían a dos subtests históricos y sus dos parents, contaminados por una única Membresía de fixture E2-07 no limpiada;
- la corrección causal registró ese ID para cleanup y la repetición limitada a productor y consumidores afectados quedó `40/40`;
- Emulator completo final posterior al ajuste de cleanup: `124/124`;
- build, que no había sido alcanzado por el gate: aprobado;
- mantenimiento/reglas, que no había sido alcanzado por el gate: `7/7`;
- `git diff --check`: aprobado.

No se repitió el gate completo después de obtener un resultado final, conforme al método acordado. La corrección posterior fue exclusivamente de cleanup de pruebas y quedó verificada sobre el mismo Emulator antes de las suites afectadas.

## 10. Hallazgos, efectos colaterales y warnings

Se corrigieron dos defectos causales de la validación:

- el frontend dependía del siguiente render para bloquear una segunda activación; se agregó un registry inmediato de flights por Solicitud;
- una fixture de transferencia de ownership creaba una Membresía que no quedaba registrada para cleanup; se incorporó el ID autoritativo devuelto por la aprobación.

También se amplió el retry de eliminación de directorios temporales en Windows de 30 a 45 segundos, después de reproducir `EBUSY` una vez tras una suite internamente verde. No cambia producción.

No se observaron efectos funcionales sobre notificaciones, Actividad, invitaciones, pagos, roles, reactivación, arrays o APIs legacy. Los warnings no causales fueron: conversión futura LF→CRLF, `caniuse-lite` histórico, ausencia de `fnm` en el perfil local, MOTD inaccesible por red bloqueada, advertencia de versión del SDK para Extensions y mensajes esperados de cierre/readTime del Emulator.

## 11. UAT manual y observaciones de entorno

Entorno UAT local: proyecto sintético `demo-sportexa-e2-07-uat`, Auth, Firestore y Functions Emulator, con frontend local. No se utilizó Firebase remoto ni se expusieron UIDs, correos, claves o hashes en esta evidencia documental.

| Caso | Resultado | Evidencia y alcance |
| --- | --- | --- |
| UAT-01 | APROBADA | Owner visualizó dos Solicitudes pendientes con datos personales mínimos. |
| UAT-02 | APROBADA | Cancelar el diálogo de aprobación no modificó la Solicitud. |
| UAT-03 | APROBADA | La aprobación mostró progreso no optimista y terminó confirmada con Membresía. |
| UAT-04 | APROBADA | Tras recargar, la aprobación persistió y conservó la misma Membresía. |
| UAT-05 | APROBADA | La recuperación de respuesta incierta convergió sin duplicar decisión ni Membresía. |
| UAT-06 | APROBADA | La segunda Solicitud terminó rechazada sin Membresía. |
| UAT-07 | APROBADA | Tras recargar, el rechazo persistió y no apareció como pendiente. |
| UAT-08 | APROBADA | La comprobación visual confirmó que aprobar sin Temporada abierta falla y mantiene la Solicitud pendiente. La inspección global posterior no es atribuible a este caso: la fixture fue reutilizada y terminó rechazada; ese estado posterior no se clasifica como fallo funcional. |
| UAT-09 | APROBADA | La transferencia de ownership dejó denegado al Owner anterior y autorizado al vigente. |
| UAT-10 | NO RECORRIDA MANUALMENTE; ACEPTADA POR EVIDENCIA AUTOMATIZADA | La evidencia automatizada existente cubre `APPROVAL_IN_PROGRESS`, bloqueo de cancelación y prevención de nueva Solicitud. El recorrido manual posterior quedó limitado porque las fixtures auxiliares usaban password y la interfaz local ofrece entrada Google. |
| UAT-11 | APROBADA | Se validaron teclado, foco, anuncios accesibles y responsive en 360 px, 768 px y escritorio. |
| UAT-12 | NO RECORRIDA MANUALMENTE; ACEPTADA POR EVIDENCIA AUTOMATIZADA | La evidencia automatizada existente cubre autorización y ausencia de acciones para actores no autorizados. El recorrido manual posterior quedó limitado por la incompatibilidad de proveedor de las fixtures auxiliares. |

Observación de entorno: **Fixtures Auth password incompatibles con la única entrada Google de la interfaz local**. Esta limitación pertenece a la preparación de identidades sintéticas y no constituye un defecto funcional de E2-07. UAT-10 y UAT-12 no se presentan como ejecutadas manualmente.

La evidencia persistente válida queda consolidada así: dos Solicitudes aprobadas, una Solicitud rechazada, dos Membresías activas correlacionadas, cero claims residuales, cero duplicados y cero efectos colaterales en Grupo, Persona, Usuario, Temporada, Actividad, notificaciones y estructuras legacy.

## 12. Riesgos y alcance

- No hay worker: una coordinación incierta converge cuando el Owner consulta o reintenta.
- Los decision intents son durables y no tienen TTL ni cleanup automático.
- El listado agrega lecturas técnicas acotadas por item y mantiene páginas máximas de 20.
- Reactivación y reparación de corrupción continúan fuera de alcance.
- UAT-10 y UAT-12 no tuvieron recorrido manual posterior por la incompatibilidad de proveedor de sus fixtures auxiliares; su aceptación documental se basa en la evidencia automatizada existente.

No se realizó commit, staging, push, merge, cambio de rama, deploy ni acceso Firebase remoto durante la UAT.

## Veredicto

**UAT E2-07 APROBADA CON OBSERVACIÓN DE ENTORNO — LISTO PARA VERSIONAR**
