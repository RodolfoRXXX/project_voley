# IUX-10 — Agregar integrantes: búsqueda e invitaciones

## Estado de la ficha

- **Estado:** `LISTA PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Fecha:** 17 de noviembre de 2026.
- **Base verificada:** `dev@2d5a4b4ae77c48d18e9421ea9a19f412076bd82b`, idéntica a `HEAD` y `origin/dev`; contiene IUX-09 integrado.
- **Etapa:** interetapa `IUX` entre E3 y E4.
- **Identificador:** `IUX-10`.
- **Decisión de Documento 5:** `D5-080`.
- **Addendum adoptado:** `docs/arquitectura/Documento-1-1.5-2-3-4-addendum-IUX-10-agregar-integrantes-invitaciones.md`.
- **Ruta:** `docs/implementacion/interetapa-ux-movil/IUX-10-ficha-agregar-integrantes-busqueda-invitaciones.md`.
- **Alcance:** definición funcional y técnica. No autoriza implementación, índices, Rules, datos, migraciones, correo, notificaciones externas, commit, push ni despliegue.
- **Estado local preservado:** `visuals/` continúa sin seguimiento y no fue modificado.

La definición queda completa para una implementación posterior expresamente autorizada. Las decisiones funcionales solicitadas están adoptadas; no queda una elección funcional nueva bloqueante.

## 1. Objetivo y resultado observable

Desde **Integrantes**, permitir que el Owner vigente de un Grupo activo con Temporada abierta busque Personas que aceptaron ser localizables y les envíe una invitación. La Cuenta vinculada a la Persona destinataria ve la invitación en **Mis grupos** y puede **Aceptar** o **Declinar**. El Owner puede **Cancelar invitación** mientras la aceptación no haya adquirido su coordinación.

Aceptar revalida Cuenta–Persona, Grupo, Temporada original y elegibilidad, y concreta una sola alta, reactivación o renovación mediante el mecanismo canónico de Membresía. La Invitación nunca se mueve a otra Temporada y sobrevive a una transferencia de ownership: desde la transferencia la gestiona el Owner vigente.

## 2. Decisiones funcionales aprobadas

1. La localización es **opt-in** y está desactivada por defecto.
2. Antes de activarla se explica que **los administradores de Grupos con una Temporada abierta podrán ver tu nombre, apellido y correo de contacto para invitarte**.
3. Las invitaciones recibidas se muestran en `/dashboard/groups`, sección **Invitaciones pendientes**, con **Aceptar** y **Declinar**.
4. Cada Invitación queda vinculada exclusivamente al `seasonId` original.
5. La Invitación pertenece al Grupo, sobrevive a transferencias y pasa a ser gestionada por el Owner vigente; `invitedBy` queda como auditoría, no como autorización.
6. El primer corte incluye **Cancelar invitación** para el Owner.
7. El envío por correo exacto, email, push, SMS, campana y demás notificaciones externas quedan fuera.
8. Un Owner no necesita Persona propia para buscar, invitar, listar o cancelar. Sí necesita Cuenta canónica, ownership vigente, Grupo activo y Temporada abierta para buscar/invitar.
9. Aceptar exige que la Cuenta autenticada siga vinculada válidamente a la Persona destinataria.

## 3. Alcance y exclusiones

### 3.1 Incluido

- entrada `/dashboard/groups/{groupId}/members/add` desde Integrantes;
- requisito y CTA **Ir a Temporada** a `/dashboard/groups/{groupId}/seasons`;
- consentimiento de localización en Ficha personal;
- directorio Owner-scoped paginado por prefijo desde tres caracteres;
- nombre, apellido y correo de contacto sólo para Personas con consentimiento vigente;
- estados **Invitar**, **Invitación pendiente**, **Ver solicitud de ingreso** y **Ya integra el grupo**;
- creación, consulta, aceptación, declinación y cancelación de Invitación;
- exclusión transaccional Solicitud–Invitación Persona–Grupo;
- expiración segura por cierre de Temporada y liberación recuperable del guard;
- alta, reactivación o renovación canónica de Membresía;
- carreras, reintentos, recuperación y descarte de respuestas tardías;
- dos Cuentas, datos sintéticos, escritorio y móvil.

### 3.2 Fuera de alcance

- alta de Persona sin vínculo, reclamo, vinculación o fusión;
- corrección de nombre, apellido o correo de Cuenta/Persona;
- obligaciones de una Persona sin vínculo;
- invitación por correo libre o a Persona no localizable;
- correo exacto, proveedor de email, push, SMS, campana o tarea IUX-02 nueva;
- carga forzada, aceptación automática, cargo, rol, permisos, posición o dorsal;
- reapertura o traslado de Invitación a otra Temporada;
- migración masiva, backfill productivo, publicación o despliegue;
- cambios en `visuals/`.

## 4. Contratos revisados y reutilización

| Área | Contratos vigentes | Decisión IUX-10 |
| --- | --- | --- |
| Cuenta | `ensureMyAccount`, `getMyAccount`, `users/{uid}.personaId` | Owner: sólo Cuenta. Destinatario: Cuenta–Persona válida al responder. Correo de acceso no se expone. |
| Persona | `getMyPerson`, `ensureMyPerson`, Persona con nombre/apellido/`emailContacto` | Nuevo consentimiento/directorio; no se habilita edición. |
| Padrón | `listActiveGroupMembersForOwnedGroup`, contador y `firestoreActiveRosterSearchProjection` | Se reutilizan normalización, cursor y mantenimiento desde writers; no es directorio de candidatos. |
| Solicitud | create/get/list/cancel/approve/reject, guard determinista, intents y recuperación | Conserva semántica applicant-driven; su guard físico se amplía como autoridad de admisión compatible. |
| Membresía | alta, reactivación, renovación, active/lifecycle guards, Períodos | Un único mecanismo canónico ampliado por origen; no hay segundo writer. |
| Temporada | apertura, `openSeasonGuard`, cierre E2-15 | Crear/aceptar leen Temporada original. Coordinación de aceptación bloquea cierre; pendiente sola no. |
| Grupo | ownership contextual | Owner sin Persona puede operar. Transferencia cambia quién gestiona, no invalida Invitaciones. |
| UI | Integrantes, Temporada, Mis grupos, deep-links de Solicitud | Se preservan rutas y patrones mobile-first. |

El addendum IUX-10 amplía Documentos 1, 1.5, 2, 3 y 4. Documento 5 adopta el conjunto mediante D5-080.

## 5. Modelo funcional

### 5.1 Fuentes de verdad

| Concepto | Fuente | Regla |
| --- | --- | --- |
| Cuenta | Cuenta canónica autenticada | identifica actor; no reemplaza Persona |
| Persona destinataria | vínculo `users/{uid}.personaId` + Persona compatible | se deriva; nunca llega como autoridad del cliente |
| Consentimiento | preferencia propia de localización | ausente = desactivado |
| Directorio | proyección privada mantenida atómicamente con consentimiento | sólo backend; no es autoridad de identidad |
| Grupo/Owner | Grupo canónico | Owner vigente busca, invita, lista y cancela |
| Temporada | Temporada original + open-season guard | no se sustituye por otra |
| Solicitud | Solicitud canónica | conserva estados y actor solicitante |
| Invitación | `InvitaciónIngresoGrupo` | conserva propuesta y decisión |
| Ingreso pendiente | guard determinista Persona–Grupo | excluye Solicitud e Invitación pendientes |
| Pertenencia | Membresía canónica | única autoridad de integración |

### 5.2 Estados de Invitación

| Estado | Terminal | Significado |
| --- | --- | --- |
| `pendiente` | No | espera respuesta; cancelable si no hay aceptación adquirida |
| `aceptada` | Sí | Membresía correlacionada confirmada previamente |
| `declinada` | Sí | destinatario rechazó |
| `cancelada` | Sí | Owner vigente canceló antes de aceptación adquirida |
| `expirada` | Sí | Temporada original cerró antes de aceptación o Grupo quedó incompatible |

`ACCEPTANCE_IN_PROGRESS` es estado técnico, no estado funcional.

### 5.3 Ownership

- `groupId` e `invitedBy` son inmutables.
- Autoriza siempre `groups/{groupId}.ownerId` vigente, no `invitedBy`.
- Tras transferencia, el Owner anterior pierde lectura/cancelación; respuestas tardías se descartan. El nuevo Owner gestiona pendientes.
- La transferencia no reescribe Invitaciones ni guards y no interrumpe una aceptación adquirida.

## 6. Consentimiento y directorio

### 6.1 Experiencia

En `/profile/person`, una Persona compatible ve **Permitir que me encuentren para invitarme a Grupos**, desactivado por defecto, con esta explicación:

> Si lo activás, los administradores de Grupos con una Temporada abierta podrán ver tu nombre, apellido y correo de contacto para invitarte.

Activar o retirar exige confirmación explícita. Retirar no cancela Invitaciones existentes: impide nuevas apariciones y nuevos envíos desde referencias anteriores.

### 6.2 Correo de contacto ausente

La Persona canónica exige `emailContacto`, pero se falla cerrado ante datos históricos ausentes/incompatibles:

- no puede activar localización ni crear fila de directorio;
- muestra **Necesitás un correo de contacto para que los administradores puedan identificarte.**;
- no ofrece editarlo porque la corrección queda fuera;
- una preferencia histórica `true` con correo ausente se trata como incompatible, se retira de la proyección por reconciliación y nunca expone nombre/apellido solos.

Esto deriva de la decisión de mostrar los tres datos y de privacidad por defecto; no queda aprobación adicional.

### 6.3 Persistencia lógica

```text
personDiscoverability/{personId}
  enabled: true
  directoryEntryId: random-128-bit
  revision: integer >= 1
  updatedAt
  schemaVersion: 1

discoverablePersonDirectory/{directoryEntryId}
  personId
  firstName
  lastName
  contactEmail
  searchPrefixes[]
  sortName
  consentRevision
  updatedAt
  schemaVersion: 1
```

- Preferencia ausente equivale a `false`; no se necesita documento `false`.
- Activar valida Cuenta–Persona y los tres datos, y crea preferencia + fila en una transacción.
- Retirar elimina fila y preferencia en una transacción. Una reactivación genera otro `directoryEntryId`.
- El modelo vigente no edita Persona. Todo writer nominal futuro deberá actualizar/retirar la fila en su transacción.
- Reconciliación paginada repara fila ausente/sobrante, pero nunca fabrica consentimiento.
- No se necesita `BUILDING/READY` global ni backfill: cada opt-in materializa su fila atómicamente.

### 6.4 Búsqueda y límites

- una palabra normalizada, mínimo 3 y máximo 40 caracteres Unicode;
- prefijo del comienzo de cualquier palabra de nombre/apellido;
- NFD, retiro de marcas, minúsculas `es-AR`, tokens alfanuméricos Unicode;
- página por defecto/máxima: **10**, con `limit + 1`;
- orden `sortName ASC, __name__ ASC`;
- cursor opaco autenticado ligado a UID Owner, Grupo, Temporada, término, posición, tamaño y versión; TTL **10 minutos**;
- sin límite total de páginas; cada continuación revalida contexto;
- UI usa debounce 300 ms y cancela requests obsoletos;
- **30 búsquedas/minuto por Cuenta**, **60/minuto por Grupo**, burst 10;
- **20 invitaciones/hora por Cuenta–Grupo** y **100/día por Grupo**; retry con igual clave no consume otra cuota funcional;
- exceso: `resource-exhausted / RATE_LIMITED`, sin vacío ni revelación parcial.

### 6.5 Presupuesto de lecturas

| Componente por página máxima | Máximo lógico |
| --- | ---: |
| Cuenta, Grupo, open-season guard y Temporada | 4 |
| directorio `10 + 1` | 11 |
| active guard + guard de admisión por 10 filas | 20 |
| validación de referencias presentes; peor caso de Membresía con lifecycle/Períodos | 60 |
| **Techo conservador por intento** | **95** |

El caso común sin relación previa cuesta hasta 35. Una doble autoridad falla al detectarse. Reintentos se cuentan aparte; 95 no afirma facturación/latencia. Implementación debe medir p50, p95 y facturación. Activar/retirar consentimiento: techo 4 lecturas por intento.

## 7. `candidateRef`: decisión técnica

Se adopta un **identificador aleatorio opaco de al menos 128 bits**, `directoryEntryId`, no un token firmado.

La firma no agrega garantía: `createGroupInvitation` relee Cuenta, ownership, Grupo, Temporada, fila, consentimiento, Persona y guards. Alterar/adivinar sólo produce `CANDIDATE_NOT_AVAILABLE`.

- no contiene PII ni IDs de dominio;
- CSPRNG y entrega sólo en resultados autorizados;
- cambia en cada ciclo de consentimiento;
- retirar consentimiento borra la fila e invalida referencias;
- no autoriza por posesión ni se registra en logs/URLs públicas.

El cursor sí necesita autenticación porque transporta posición/contexto.

## 8. Recorrido Owner

### 8.1 Preflight y resultados

`/dashboard/groups/{groupId}/members/add` relee Cuenta, Grupo, ownership y open-season guard. No consulta Persona del Owner. Sin Temporada muestra **Necesitás una Temporada abierta para invitar integrantes.** y **Ir a Temporada**.

Prioridad por candidato:

1. Membresía activa: **Ya integra el grupo**;
2. Solicitud pendiente: **Ver solicitud de ingreso**;
3. Invitación pendiente: **Invitación pendiente**;
4. sin relación: **Invitar**.

Autoridades incompatibles producen `UNAVAILABLE`, no prioridad visual.

### 8.2 Crear

`createGroupInvitation({ groupId, candidateRef, idempotencyKey })` valida Cuenta —no Persona Owner—, ownership, Grupo, Temporada, referencia, consentimiento, Persona, active guard y guard compartido. Si es elegible crea Invitación, intent y guard en una transacción. Respuesta perdida se recupera con igual clave/consulta. No crea Membresía ni notificación externa.

### 8.3 Cancelar

`cancelGroupInvitation({ groupId, invitationRef, idempotencyKey })` autoriza al Owner vigente:

- pendiente sin coordinación: escribe `cancelada` y libera guard en una transacción;
- retry: `ALREADY_CANCELLED`;
- coordinación adquirida: `ACCEPTANCE_IN_PROGRESS`, sin abortar;
- Membresía creada con terminal pendiente: recuperación concluye `aceptada`;
- cancelar vs declinar: la primera terminal gana; la otra recibe el estado.

## 9. Destinatario en Mis grupos

`/dashboard/groups` incorpora **Invitaciones pendientes** antes de Historial. La consulta deriva Persona; sin vínculo válido devuelve `PERSON_REQUIRED/INCOMPATIBLE`, nunca lista ajena.

Cada tarjeta muestra Grupo, Temporada original, fecha y **Aceptar** / **Declinar**.

### 9.1 Aceptar

1. deriva Cuenta–Persona y exige destinataria exacta;
2. relee Invitación/guard, Grupo y Temporada original;
3. exige open-season guard correlacionado;
4. prepara `CREATE_MEMBERSHIP`, `REACTIVATE_MEMBERSHIP` o `RENEW_MEMBERSHIP`;
5. adquiere `groupInvitationAcceptanceCoordinations/{invitationId}`;
6. invoca la capacidad canónica de Membresía y recupera resultado;
7. tras acreditar Membresía marca `aceptada` y libera guard;
8. consulta de resultado recupera respuestas perdidas.

La coordinación adquirida bloquea cierre E2-15. Transferencia posterior no la invalida.

### 9.2 Declinar

Declinar deriva Persona, exige pendiente sin coordinación, escribe `declinada` y libera guard en una transacción. No requiere Temporada abierta. Retry devuelve `ALREADY_DECLINED`.

## 10. Exclusión Solicitud–Invitación y compatibilidad

Se conserva la colección física `pendingGroupJoinRequestGuards` y el mismo hash Persona–Grupo:

- schema v1 existente: Solicitud, interpretado `kind=JOIN_REQUEST`;
- schema v2 Invitación: `personId`, `groupId`, `kind=GROUP_INVITATION`, `resourceId`, `createdAt`, `schemaVersion=2`.

No hay segunda colección. Código viejo/nuevo compite por el mismo documento:

- v1 existente → Invitación devuelve `JOIN_REQUEST_PENDING`;
- v2 existente → writer viejo encuentra `ALREADY_EXISTS`/incompatible y falla cerrado;
- writers nuevos de Solicitud reconocen v2 → `INVITATION_PENDING`;
- terminales borran sólo el guard cuyo recurso/identidad coincide.

Orden de rollout futuro:

1. lectores/writers de Solicitud tolerantes a v1/v2 sin crear v2;
2. Rules deny-all e índices/recursos de Invitación;
3. writers/lectores de Invitación;
4. UI;
5. verificación/rollback compatible.

Invitación y guard nacen en un commit. Retry relee correlación exacta. Desparejo falla `INCOMPATIBLE_STATE`; reconciliación no inventa decisión. Este diseño evita migración masiva y una ventana de doble autoridad.

## 11. Expiración y liberación segura

Invitación pendiente no bloquea cierre; sólo aceptación coordinada lo bloquea. El cierre no hace fan-out.

Una lectura con Temporada original cerrada devuelve estado efectivo `EXPIRED`. `releaseStaleGroupInvitationAdmission` materializa y libera:

1. transacción A lee guard v2, Invitación, coordinación y Temporada;
2. sólo si sigue pendiente, sin coordinación y Temporada cerrada, escribe `expirada` y elimina ese guard;
3. confirma `RELEASED`/estado actual;
4. el nuevo comando reintenta en transacción B y compite por el guard libre.

No se expira y crea otra raíz en la misma transacción. Fallo entre A/B deja estado seguro —expirada, guard libre—. Otra operación puede ganar legítimamente. Máximo tres ciclos internos; luego `CONFLICT`.

Aceptar vs cierre se serializa por open-season guard: aceptación coordina y bloquea cierre, o cierre gana y aceptación expira. Nunca hay alta en Temporada cerrada.

## 12. Reutilización canónica de Membresía

Se generaliza `groupJoinRequestMembershipCapability` a una capacidad interna de admisión con origen `JOIN_REQUEST_APPROVAL | GROUP_INVITATION_ACCEPTANCE`, recurso, coordinación, Persona, Grupo, Temporada, membership/ordinal e hashes idempotentes.

Una capacidad del módulo origen acredita coordinación/actor; Membresías revalida Grupo/Temporada en su transacción. Las ramas reutilizan exactamente:

- alta: `buildMembership`, active/lifecycle guards y primer Período;
- reactivación: misma raíz/Temporada, nuevo Período/ordinal;
- renovación: nueva raíz/nueva Temporada y `previousMembershipId`;
- mismo commit actualiza `activeRosterContributions`, `activeRosterSummaries`, `activeRosterSearchEntries` y outbox N31;
- retry recupera sólo origen/hashes/ordinal correlacionados;
- Invitación se marca aceptada después de acreditar activación.

No se introducen segundo writer, contador, índice de padrón ni semántica nueva de reactivación/renovación.

## 13. Contratos públicos

```ts
getMyPersonDiscoverability({})
setMyPersonDiscoverability({ enabled, expectedRevision, idempotencyKey })
searchDiscoverablePeopleForOwnedGroup({ groupId, query, pageSize?, cursor? })

createGroupInvitation({ groupId, candidateRef, idempotencyKey })
listGroupInvitationsForOwnedGroup({ groupId, state?, pageSize?, cursor? })
getGroupInvitationForOwnedGroup({ groupId, invitationRef })
cancelGroupInvitation({ groupId, invitationRef, idempotencyKey })

listMyPendingGroupInvitations({ pageSize?, cursor? })
getMyGroupInvitation({ invitationRef })
acceptMyGroupInvitation({ invitationRef, idempotencyKey })
declineMyGroupInvitation({ invitationRef, idempotencyKey })
getMyGroupInvitationDecisionResult({ invitationRef })
```

Páginas de Invitaciones: default 5, máximo 20. Cursores ligados a actor, filtro, orden, tamaño y versión. DTOs omiten UID, `personId`, hashes, guards, correo de acceso y schemas internos. Recursos nuevos: Rules deny-all.

## 14. Carreras y respuestas tardías

| Carrera | Resultado |
| --- | --- |
| Solicitud vs Invitación | una crea guard; otra recibe estado ganador |
| dos envíos | una Invitación; retry recupera o conflicto de firma |
| aceptar vs aceptar | una coordinación/activación; segundo recupera |
| aceptar vs declinar | primera decisión gana |
| aceptar vs cancelar | cancelación gana antes del claim; después devuelve `ACCEPTANCE_IN_PROGRESS` |
| aceptar vs cierre | alta o expiración, nunca ambas |

Frontend liga request a `{accountId, groupId, seasonId, resourceRef, action, generation}`. Cambiar contexto/acción incrementa generación y limpia estado. Una respuesta sólo muta UI si coincide. Timeout ofrece **Comprobar resultado**, no éxito optimista.

## 15. Interfaz, seguridad y accesibilidad

- menos de tres caracteres: ayuda sin request;
- vacío: **No encontramos fichas localizables con ese prefijo.**;
- error/rate limit no son vacío;
- pending Owner muestra **Cancelar invitación**;
- Temporada cerrada al destinatario: **La Temporada de esta invitación cerró. Pedile al Owner una nueva invitación.**;
- aceptada enlaza `/dashboard/groups/{groupId}/membership`;
- correo sólo en respuesta autorizada; sin logs, analytics, URLs ni caché compartida;
- observabilidad allowlisted sin PII/IDs crudos;
- validar 1440×900, 360×800, 390×844, zoom 200 %, teclado/lector; controles 44×44 px, wrap y foco/roles accesibles.

## 16. Criterios de prueba y UAT

Datos sintéticos: Cuenta A Owner **sin Persona**, Grupo activo/Temporada abierta; Cuenta B con Persona José Núñez localizable y `.test`; Persona no localizable; Persona sin correo; candidatas con Solicitud/Invitación/Membresía; finalizadas para reactivación/renovación.

1. Owner sin Persona y sin Temporada ve requisito/CTA.
2. Owner sin Persona con Grupo activo/Temporada abierta busca e invita.
3. Consentimiento inicia apagado y explica los tres datos.
4. Persona sin correo no activa ni aparece.
5. `jos`, `JOS`, `jós` coinciden; dos caracteres no llaman.
6. No localizable no aparece ni se infiere.
7. Los cuatro estados muestran acción exacta.
8. Dos envíos crean una Invitación.
9. B ve en Mis grupos y acepta/declina.
10. Aceptar crea una sola Membresía y actualiza contador/padrón/búsqueda.
11. Cancelar libera guard; retry idempotente.
12. Solicitud vs Invitación: sólo una pendiente.
13. Guard v1 bloquea Invitación; v2 bloquea Solicitud.
14. Fallo entre liberar expiración/nuevo ingreso se recupera.
15. Cierre vs aceptación: alta o expiración.
16. Nueva Temporada no adopta vieja; liberación permite ingreso posterior.
17. Transferencia: Owner anterior pierde gestión; nuevo ve/cancela; destinatario conserva respuesta.
18. Retirar consentimiento elimina resultado/referencia; Invitación existente sigue respondible.
19. Aceptar sin Persona válida falla sin alta.
20. No-Owner/otro Grupo no enumera ni reutiliza cursor/ref.
21. Respuestas tardías no pisan cancelación/aceptación/cambio de Cuenta/ownership/búsqueda.
22. Paginación 10+1, empate, compuestos, tildes y no duplicación.
23. Rate limits no filtran datos.
24. Rules deny-all, presupuesto instrumentado y cero PII en logs.
25. UAT 1440×900, 360×800 y 390×844 con dos sesiones aisladas.

## 17. Decisiones

| ID | Decisión | Estado |
| --- | --- | --- |
| IUX-10-D01 | Ruta `/members/add` desde Integrantes | APROBADA |
| IUX-10-D02 | Owner vigente, Grupo activo y Temporada abierta; Owner no requiere Persona | APROBADA |
| IUX-10-D03 | Opt-in apagado por defecto y explicación de nombre/apellido/correo | APROBADA |
| IUX-10-D04 | Directorio separado, página 10, límites y presupuesto | ADOPTADA TÉCNICAMENTE |
| IUX-10-D05 | Invitación como Aggregate Root separado | ADOPTADA POR ADDENDUM |
| IUX-10-D06 | Guard físico único compatible v1/v2 | ADOPTADA TÉCNICAMENTE |
| IUX-10-D07 | Temporada original exclusiva y liberación recuperable | APROBADA |
| IUX-10-D08 | Único mecanismo canónico de Membresía por origen | ADOPTADA TÉCNICAMENTE |
| IUX-10-D09 | Invitaciones en Mis grupos con Aceptar/Declinar | APROBADA |
| IUX-10-D10 | Correo exacto/notificaciones externas diferidos | APROBADA |
| IUX-10-D11 | Sobrevive transferencia; gestiona Owner vigente | APROBADA |
| IUX-10-D12 | Cancelar invitación Owner en primer corte | APROBADA |
| IUX-10-D13 | Addendum conjunto y D5-080 | ADOPTADA DOCUMENTALMENTE |
| IUX-10-D14 | `candidateRef` aleatorio opaco, no firmado, con revalidación | ADOPTADA TÉCNICAMENTE |

### Decisiones funcionales nuevas pendientes

**Ninguna.** Persona sin correo no localizable es consecuencia necesaria de mostrar conjuntamente nombre, apellido y correo, y de privacidad por defecto. Habilitar correo incompleto, invitación por correo o notificación externa requerirá otra decisión.

## 18. Gates

La ficha/addendum están listos para implementar, pero requieren autorización separada. Esa autorización deberá exigir rollout escalonado v1/v2, índices/Rules antes de UI, pruebas Emulator de carreras, medición del techo de 95 lecturas/rate limits, UAT Owner sin Persona + destinatario con Persona, cero PII y rollout/rollback separado.

IUX-10 no cierra IUX-02/E3, no habilita E4 y no cambia pendientes previos.
