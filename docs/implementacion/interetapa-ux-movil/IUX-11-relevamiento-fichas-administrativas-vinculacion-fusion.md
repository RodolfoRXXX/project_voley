# IUX-11 — Relevamiento de fichas administrativas, vinculación y fusión

## 1. Estado y base

- **Estado:** `IUX-11A/A.1 E IUX-11B CERRADOS; IUX-11C DEFINIDO Y LISTO PARA IMPLEMENTAR POR CORTES CON AUTORIZACIÓN SEPARADA; CORREO EXTERNO Y DIRECTORIO AMPLIADO FUERA DE ALCANCE`.
- **Fecha:** 26 de noviembre de 2026.
- **Base verificada:** `dev@acc7b263195ba7c05ce1362e76da306602a0b2c7`, idéntica a `HEAD`, `origin/dev` y `FETCH_HEAD` después de `fetch origin dev`.
- **Incremento vigente:** `IUX-11`; registro documental de esta revisión: `D5-088`.
- **Decisión de Documento 5:** `D5-083`, refinada por `D5-084` a `D5-088`; D5-087 cierra B y D5-088 adopta C-N1/C-F1/C-A1/C-C1, ausencia de aviso dedicado y preview de 24 horas.
- **Estado local preservado:** working tree limpio al iniciar; `visuals/`, configuración local y datos UAT no fueron modificados.
- **Cierre A/A.1:** definición `5f01f61`, implementación/pruebas `6703034`, BUILD_ID aprobado `gdZvN1YTNPMteaRxngA6N`; sin despliegue ni modificación de datos UAT.
- **Cierre B:** implementación `35e33a6`, cierre `87ff812`, BUILD_ID funcional `FR-tYzB5t0m4TKc_fpDKo`; entorno UAT portable integrado por `acc7b263`; sin despliegue ni backfill remoto.

IUX-10 cerró búsqueda e Invitaciones entre Personas ya existentes, pero dejó expresamente fuera el alta de Persona sin vínculo, la corrección nominal, las obligaciones de una Persona sin vínculo, la vinculación, la fusión y el correo exacto. IUX-11 ocupa ese siguiente límite sin reinterpretar el correo como identidad ni imponer unicidad de Persona por correo.

## 2. Reglas funcionales aprobadas

### 2.1 Alta administrativa

- Desde Integrantes, el Owner vigente crea una ficha con nombre, apellido y correo opcional y la incorpora a la Temporada abierta.
- La ficha es una Persona canónica aunque todavía no tenga Cuenta titular.
- Su Membresía puede recibir obligaciones y pagos sin Cuenta vinculada.
- Mientras no esté vinculada, la custodia y la corrección pertenecen al Owner vigente del Grupo custodio. `createdByAccountId` es auditoría y no autoridad.
- Una transferencia futura de ownership transfiere inmediatamente la custodia; el Owner anterior pierde acceso y las respuestas tardías se descartan.
- Archivar el Grupo conserva ownership, custodia, corrección y futura vinculación. No reabre Temporada ni amplía por sí solo operaciones económicas.
- Sin correo vigente no existe candidatura de vinculación.

### 2.2 Candidatura dentro de la plataforma

- Una ficha administrativa aparece en **Mi perfil → Ficha personal** cuando su correo vigente coincide con un correo verificado de la Cuenta autenticada.
- La coincidencia funciona aunque la Cuenta se haya creado después de la ficha.
- El usuario reconoce o rechaza explícitamente cada ficha; la coincidencia no vincula por sí sola.
- Corregir el correo retira la candidatura al destinatario anterior. Aceptar relee correo y revisión vigentes.
- Archivar el Grupo, cerrar la Temporada o finalizar la Membresía no elimina ni bloquea la candidatura.
- El recorrido es interno. Un correo externo es sólo un aviso opcional y nunca una credencial ni una precondición.

### 2.3 Ficha principal y fusión

- Una Cuenta sin Persona propia puede adoptar la ficha reconocida como principal.
- Si ya tiene Persona, se muestran ambas fichas, datos y procedencia antes de elegir la principal.
- Después de confirmar, la experiencia presenta una sola ficha personal vigente.
- Elegir ficha principal y elegir qué Membresía activa continúa son decisiones independientes.
- Se conservan participaciones en Grupos distintos e historia de Temporadas anteriores.
- Ante dos Membresías activas del mismo Grupo y Temporada, el usuario elige la que continúa. La otra se finaliza canónicamente con motivo auditable **Fusión de fichas**.
- Finalizar la duplicada no cancela deudas ni altera Pagos, Períodos o auditoría.
- No se suman, trasladan, compensan ni eliminan obligaciones sin una operación económica específica.
- La ficha principal permite acceder a la economía conservada de todos los registros originales consolidados.
- La confirmación muestra previamente cambios de ficha visible, Membresías que se finalizarán, capacidades que pueden caducar y economía que permanece separada.

## 3. Contraste con código y documentos vigentes

| Área | Contrato vigente | Brecha IUX-11 |
| --- | --- | --- |
| Persona | A ya admite correo opcional y custodia administrativa versionada | C no debe reescribir Persona ni convertir la no principal en editable |
| Cuenta–Persona | B agrega `personAccountAssignments/{personId}` sólo para adopción simple; `users/{uid}.personaId` sigue singular | Falta identidad 1..N, guard inverso plural y proyección de principal |
| Alta propia | `ensureMyPerson` reserva Persona y `users.personaId` en una transacción; B comparte esa barrera | C debe tolerar assignment/identidad y fallar cerrado durante `MERGING` |
| Candidatura B | `RECOGNIZED_PENDING_MERGE` persiste Cuenta, Persona y revisiones, sin assignment, reserva ni cambio de custodia | C debe revalidar y adquirir autoridad; no puede tratar la intención como vínculo |
| Presentación propia | `getMyPerson`, membresías, historial y economía derivan un único `personaId` | Deben resolver ficha principal para edición y conjunto de Personas autorizadas para historia/economía |
| Membresía | Raíz y guards se identifican por `personId + groupId`; el alta mantiene Períodos, contador y padrón | Sirve para IUX-11A, pero no detecta duplicado entre dos Personas de la misma identidad consolidada |
| Finalización | La finalización administrativa es Owner-only, exige contexto modificable, evita self-target y no recibe motivo | La fusión necesita una coordinación interna autorizada por el titular y evidencia `PROFILE_MERGE`, conservando los mismos efectos canónicos |
| Padrón | Contador cuenta contribuciones por Membresía; búsqueda materializa nombre de la Persona de la Membresía | Finalizar la duplicada debe decrementar una vez; elegir principal debe reproyectar el nombre vigente de Membresías conservadas |
| Economía | Pago conserva `membershipId`, `personId`, Temporada, concepto y evidencia | No debe reescribirse. Los lectores propios deben autorizar por identidad consolidada y conservar el sujeto original |
| Solicitudes/Invitaciones | guards y recursos se correlacionan por Persona; `ownPerson`/`ownDirectoryPerson` usan `users.personaId` exacto | Responder por Persona asignada, directorio por principal y resolver redundancias sin aceptar implícitamente |
| Capabilities | grants conservan `accountId`, `personId`, `membershipId`, anchor y slot; `treasuryAccountIdentityCapability` hace reverse lookup en `users.personaId` | Revalidar por assignment, caducar anchor perdedor y revocar cualquier self-conflict económico |
| Directorio IUX-10 | Es opt-in, revocable y sólo contiene Personas localizables | No sirve para encontrar Cuentas ni candidaturas IUX-11; ausencia no significa ausencia de usuario |
| Correo | `emailService` usa Gmail/Nodemailer y envío directo | Sólo puede ser adaptador de un efecto opcional; faltan outbox, retry, estado de entrega y supresión de PII |
| Ownership | No existe writer canónico de transferencia habilitado | IUX-11 sólo puede fijar compatibilidad futura y autorizar hoy por Owner vigente |
| Eliminación | E2-24 sólo elimina Grupo activo sin Temporadas, Membresías, Solicitudes ni otra referencia; archivado no es eliminable | Una ficha IUX-11A siempre crea Membresía y custodia, por lo que su Grupo custodio no puede eliminarse válidamente |

## 4. Mecanismo de identidad propuesto

### 4.1 Separar presentación vigente de trazabilidad

No se migran referencias históricas de una Persona a otra. Se incorpora una autoridad de identidad que relaciona una Cuenta con todas las Personas reconocidas y designa exactamente una principal.

Esta autoridad plural pertenece a IUX-11C. IUX-11B de adopción simple conserva `users.personaId` como única principal y sólo agrega `personAccountAssignments/{personId}` como guard inverso de titularidad; no habilita varias Personas por Cuenta.

```text
accountIdentities/{accountId}
  accountId
  primaryPersonId
  state: MIRRORED_SINGLE | READY | MERGING
  identityRevision
  activeMergeId?
  createdAt
  updatedAt
  schemaVersion

personIdentityAssignments/{personId}
  personId
  accountId
  state: ACTIVE | PENDING_MERGE
  source: SELF_BOOTSTRAP | IUX11B_ADOPTION | LEGACY_MATERIALIZATION | PROFILE_MERGE
  assignmentRevision
  assignedAt
  mergeId?
  schemaVersion
```

- El ID de `personIdentityAssignments` es `personId`: una Persona no puede pertenecer simultáneamente a dos Cuentas.
- Una Cuenta puede tener varias asignaciones, pero `accountIdentities` acredita una sola principal.
- Principal/role no se duplica en cada assignment: cambiar principal no reescribe N filas.
- C0 sólo crea `MIRRORED_SINGLE`, espejo exacto de `users.personaId`; `READY/MERGING`, pluralidad y autoridad plena comienzan después del retrofit C1.
- `users/{uid}.personaId` permanece temporalmente como **proyección compatible** de `primaryPersonId`; deja de ser la autoridad completa.
- Elegir como principal la ficha administrativa actualiza esa proyección únicamente dentro del commit final de la coordinación de fusión.
- Las Personas consolidadas permanecen como raíces históricas inmutables para referencias existentes. No aparecen como fichas personales vigentes editables.
- La edición personal opera sólo sobre la principal. La autorización económica y de historia admite cualquier `personId` asignado a la Cuenta.
- Cada DTO económico o de auditoría conserva el `personId`/`membershipId` original; la presentación puede resolver además la ficha principal sin ocultar la procedencia cuando sea relevante.

### 4.2 Candidaturas por correo verificado

IUX-11 no crea una oferta dirigida a una Cuenta conocida. Materializa una candidatura privada por el correo vigente de la ficha:

```text
administrativePersonCustodies/{personId}
  originGroupId
  custodianGroupId
  createdByAccountId
  revision
  emailRevision
  candidateEntryId?
  state: UNLINKED | LINKING | LINKED | MERGED | ORPHANED_CUSTODY
  createdAt
  updatedAt
  schemaVersion

administrativePersonLinkCandidates/{candidateEntryId}
  personId
  emailLookup
  emailRevision
  card: { firstName, lastName, maskedEmail, originGroupName,
          latestParticipation?, hasMoreHistory }
  updatedAt
  schemaVersion

accountVerifiedEmailCredentials/{accountId}
  emailFingerprint
  emailRevision
  keyVersion
  firstObservedVerifiedAt
  observedAt
  schemaVersion

accounts/{accountId}/administrativePersonLinkDecisions/{personId}
  accountId
  personId
  observedEmailRevision?
  decision: REJECTED | RECOGNIZED_PENDING_MERGE | ADOPTED
  decisionRevision
  decidedAt
  schemaVersion

personAccountAssignments/{personId}
  accountId
  kind: SIMPLE_PRIMARY
  assignedAt
  schemaVersion
```

- `originGroupId` es procedencia inmutable; `custodianGroupId` es el Grupo cuya ownership vigente autoriza corrección. En A son iguales. Ningún actor se copia como autoridad dentro de custodia.
- `emailLookup` es HMAC de la normalización acordada con un secreto estable; no es correo en claro ni índice único.
- En este contrato, `emailRevision` es la revisión de candidatura (`candidateEmailRevision`), separada de la revisión nominal de Persona. Nombre/apellido no la incrementan.
- Varias filas pueden compartir `emailLookup`; por eso varias fichas con el mismo correo aparecen por separado.
- El backend relee con Admin SDK el correo primario `emailVerified` de Firebase Auth; token, `users.email`, Persona y cliente no son autoridad. La credencial versionada es evidencia/proyección para cursores y carreras, no una segunda fuente.
- Cambiar, quitar o agregar un correo normalizado incrementa `emailRevision`, retira inmediatamente la candidatura anterior y crea o elimina la nueva según corresponda. Guardar el mismo valor normalizado y corregir nombre/apellido no la incrementan.
- **Ahora no** no crea decisión de dominio: sólo cierra la revisión y deja candidatura disponible. `REJECTED` se liga a Cuenta + Persona, no a revisión; sobrevive a cambios y a una ida/vuelta de correo y sólo **Reconsiderar** explícitamente lo retira. No borra ficha, Membresía ni economía.
- `RECOGNIZED_PENDING_MERGE` conserva la revisión observada sólo para exigir revalidación C; no adquiere assignment, custodia ni permisos.
- El listado y la aceptación revalidan Persona, candidatura, HMAC, revisión, correo verificado y ausencia de asignación incompatible.
- Grupo, Temporada y estado de Membresía son presentación de procedencia, no precondiciones de vinculación.

## 5. Autorización tras consolidar — alcance exclusivo de IUX-11C

### 5.1 Regla general

Los lectores dejan de interpretar `users.personaId` como única autoridad. Una capacidad interna resuelve:

- `getPrincipalPerson(accountId)` para ficha vigente y edición;
- `listAuthorizedPersonIds(accountId)` para historia y economía;
- `resolveAccountForPerson(personId)` mediante asignación única;
- `assertPersonInIdentity(accountId, personId)` para acciones sobre un registro original.

Conocer un correo, `personId`, `membershipId` o `mergeId` no autoriza. Firestore cliente sigue deny-all.

### 5.2 Economía

- Una Cuenta puede leer y operar sólo contratos SUBJECT sobre Pagos/Membresías cuyo `personId` esté asignado a su identidad.
- El request selecciona `membershipId` o un recurso opaco; el backend deriva y verifica `personId`.
- Cursores se ligan a `accountId`, `identityRevision`, conjunto/sujeto y filtro para evitar continuar después de una fusión.
- No se hace una consulta `IN` global no acotada ni se mezclan páginas por accidente. Los lectores por Membresía existentes son la base segura; los agregados multi-Persona requieren composición explícita y presupuesto propio.

### 5.3 Capabilities

- Una grant no se hereda por ser principal ni se transfiere entre Membresías.
- Si su `personId` está asignado a la Cuenta, su Membresía/Período sigue activo y el resto del contexto continúa vigente, puede conservarse aunque esa Persona sea consolidada y no principal.
- Si la Membresía elegida para finalizar era el validity anchor, la capability caduca por el mecanismo vigente.
- Slots y guards siguen evitando dos grants activas incompatibles por Cuenta/Grupo/capability.
- Toda regla `self` se evalúa contra el conjunto completo de Personas asignadas, no sólo contra la principal. Consolidar no puede permitir revisar, validar o registrar como tercero una operación económica de otra ficha de la misma identidad.
- Antes de concluir la fusión se revalidan `accountId`, assignment, `personId`, Membresía, validity anchor, estado del Grupo/Temporada, ownership revision, slot y grant. Una incompatibilidad falla cerrada y queda visible en el preview/recovery.

## 6. Unicidad, contador y búsqueda de integrantes

- La autoridad física vigente continúa impidiendo más de una Membresía activa por `personId + groupId`.
- La fusión agrega un preflight de identidad para detectar más de una activa entre Personas asignadas en el mismo `groupId + seasonId`.
- El usuario elige la Membresía que continúa por cada conflicto. La principal puede ser la Persona de la Membresía finalizada: ambas decisiones son independientes.
- La finalización perdedora usa el mismo dominio, Período, active/lifecycle guards, contribución, contador, búsqueda y outbox que una finalización canónica.
- El contador no se corrige a mano: pasa de dos a uno sólo cuando el writer canónico confirma la finalización.
- Membresías activas de Grupos distintos permanecen y se presentan con el nombre de la ficha principal.
- La proyección de búsqueda conserva `membershipId` y `personId` originales como correlación, pero sus tokens nominales pasan a derivar de la principal efectiva. La fusión debe emitir trabajo de reproyección para todas las Membresías activas conservadas de las Personas consolidadas.
- Hasta acreditar esa reproyección, no se declara cobertura `READY` para búsquedas afectadas; un resultado viejo no se interpreta como ausencia.

## 7. Solicitudes, Invitaciones y admisión

- Una Solicitud o Invitación existente conserva su `personId`; no se reescribe.
- Tras consolidar, la Cuenta puede consultar/responder recursos dirigidos a cualquiera de sus Personas asignadas.
- La aceptación de una Invitación relee la asignación y no exige que la Persona sea la principal.
- Los writers de alta/reactivación/renovación deben consultar `accountIdentities.state`: durante `MERGING` fallan de forma recuperable para las Personas implicadas.
- Antes de confirmar una fusión se inventarían conflictos no cubiertos por guards actuales: dos Solicitudes, dos Invitaciones, o una admisión pendiente para una Persona cuando la otra ya tiene Membresía activa en el mismo Grupo. Su resolución funcional permanece pendiente en §12.

## 8. Coordinación de vinculación y fusión

### 8.1 Estados

```text
PREPARED -> CONFIRMED -> FINALIZING_DUPLICATES -> REPROJECTING -> COMMITTED
                 \-> CANCELLED
                 \-> FAILED_RECOVERABLE
```

`COMMITTED` exige asignaciones acreditadas, principal seleccionada, duplicados seleccionados finalizados y trabajo de reproyección registrado. El estado técnico no reemplaza los estados de Persona o Membresía.

### 8.2 Fases recuperables

1. **Preparar:** adquiere coordinación determinista sobre los `personId` ordenados; relee candidatura/correo, identidad, asignaciones, Membresías activas, admisiones pendientes y capabilities; guarda manifest y digest.
2. **Presentar:** muestra datos, procedencia, principal seleccionable, conflictos de Membresía, efectos sobre capabilities y economía preservada.
3. **Confirmar:** vuelve a validar `identityRevision`, `emailRevision`, correo verificado, manifest y elecciones. Marca identidad `MERGING`; desde aquí los writers incompatibles fallan cerrado.
4. **Finalizar duplicados:** por cada elección invoca una capacidad interna del writer canónico con origen `PROFILE_MERGE`, `mergeId`, Membresía ganadora, perdedora y motivo público **Fusión de fichas**. Cada fila tiene receipt idempotente.
5. **Asignar y elegir principal:** crea/actualiza assignments y cambia `primaryPersonId` más la proyección `users.personaId` en un commit correlacionado.
6. **Reproyectar:** registra outbox para padrón nominal, directorio, dashboard y consumidores afectados. No toca economía.
7. **Concluir:** acredita receipts, asignaciones y outbox; pasa a `READY/COMMITTED`. Una consulta de resultado permite recuperar una respuesta perdida.

Una caída entre fases deja `MERGING` y un plan reintentable. No existe rollback que reactive una Membresía ya finalizada; por eso la confirmación humana ocurre antes de la primera finalización y la recuperación debe completar la operación.

## 9. Carreras obligatorias

| Carrera | Regla |
| --- | --- |
| `ensureMyPerson` vs adoptar ficha | Compiten por `users/{accountId}.personaId`; el primer commit fija la principal. El perdedor reintenta y no confirma su Persona/adopción. Si ganó alta propia, un reconocimiento posterior puede quedar pendiente para C |
| corregir correo vs listar/reconocer | Corrección incrementa `emailRevision` y reemplaza la candidatura; respuestas con revisión anterior se descartan |
| corregir correo vs aceptar | Aceptación relee correo verificado, HMAC, `emailRevision` y candidatura en el commit de adquisición; una corrección confirmada gana o fuerza `CANDIDATE_STALE` |
| dos Cuentas aceptan la misma Persona | Compiten por `personAccountAssignments/{personId}` y custodia; como máximo una adopta |
| dos fusiones de la misma Cuenta/Persona | `activeMergeId` y coordinaciones por Person impiden dos manifests activos |
| fusión vs alta/reactivación/renovación | writers de admisión consultan coordinación/estado `MERGING`; no crean una raíz que el manifest no vio |
| fusión vs finalización/cierre | activation refs y receipts determinan si la finalización ya ocurrió; recovery recalcula sólo outcomes compatibles |
| fusión vs pago/obligación | No se bloquean operaciones económicas sobre raíces existentes; cursores y autorización releen `identityRevision` |
| transferencia de ownership | Autoridad administrativa se relee por Owner vigente; una respuesta del Owner anterior se descarta |

## 10. Cortes y dependencias

### IUX-11A — alta administrativa y economía

**Estado:** `CERRADO; UAT HUMANA APROBADA; INTEGRACIÓN AUTORIZADA POR D5-085`.

Incluye Persona con correo opcional, custodia, edición mientras no esté vinculada, creación de Membresía en Temporada abierta, padrón, contador, búsqueda, obligaciones y pagos. No incluye candidatura, Cuenta–Persona plural ni fusión.

Decisiones cerradas para A:

- crear exige Cuenta canónica, Owner vigente, Grupo activo y exactamente una Temporada abierta;
- corregir exige Owner vigente del `custodianGroupId`, Persona administrativa no vinculada, revisión exacta y custodia compatible; no exige Temporada abierta, Membresía activa ni Grupo activo, por lo que continúa en Grupo archivado;
- la economía conserva sus precondiciones vigentes por operación; A no vuelve escribible un Grupo archivado ni habilita una operación económica nueva;
- E2-24 bloquea eliminación por la Membresía y la custodia. Si la raíz Grupo falta pese a ello, el estado es `ORPHANED_CUSTODY`: nadie hereda corrección por `createdBy`, rol global o evidencia histórica; los datos e historia permanecen y una futura vinculación por correo sigue disponible;
- `ORPHANED_CUSTODY` sólo sale por restauración/reparación operacional acreditada de la raíz/custodia o por vinculación futura al titular. La reparación no edita datos personales ni crea un Owner ficticio; hasta entonces la corrección administrativa falla cerrada.

Recuperación de creación:

1. un intent determinista reserva `personId`, `membershipId`, Grupo, Temporada, actor y request hash;
2. el commit canónico crea Persona, custodia, Membresía, primer Período, guards, contribución, contador, búsqueda y receipt de forma atómica;
3. respuesta perdida consulta intent/receipt y devuelve las mismas raíces;
4. ausencia total permite reintentar; estado parcial o correlación distinta produce `INCOMPATIBLE_STATE`, nunca una segunda Persona/Membresía.

Recuperación de corrección:

1. expected revision + idempotency key fijan el comando;
2. un commit relee ownership/custodia/vínculo, actualiza Persona, revisión, proyección nominal y receipt;
3. retry exacto recupera el resultado; payload distinto conflictúa; cambio concurrente de Owner, vínculo o revisión rechaza sin aplicar una corrección tardía.

Dependencias técnicas:

- esquema Persona versionado y lectores compatibles;
- comando idempotente que coordine Persona + custodia + activación canónica;
- origen `ADMINISTRATIVE_PROFILE_CREATION` en capacidad de Membresía;
- writer nominal que mantenga padrón/búsqueda y retire/actualice directorio IUX-10 si correspondiera;
- Rules deny-all, intents, receipts, recovery y pruebas de carreras;
- UI separada **Crear ficha** dentro de Integrantes.
- barrera E2-24 que trate custodia/Persona administrativa como referencia y mantenga la eliminación imposible incluso ante una regresión de la consulta de Membresías.

### IUX-11B — candidatura y adopción sin Persona previa

**Estado:** `CERRADO; UAT FUNCIONAL APROBADA; INTEGRADO EN dev`.

Incluye índice privado por HMAC de correo, listado interno paginado, cierre de revisión sin decisión, rechazo/reconsideración, reconocimiento, adopción como principal, Cuenta creada con posterioridad y reconocimiento pendiente de fusión. El aviso externo continúa fuera.

Decisiones cerradas por D5-086:

- **Ahora no** cierra la revisión y conserva la candidatura inmediatamente disponible, sin suspensión;
- rechazo por Cuenta + Persona retira la sugerencia, sobrevive a toda revisión/ida-vuelta de correo y sólo reconsideración explícita lo reactiva;
- sin Persona, aceptación debe ser atómica; con Persona, B sólo registra `RECOGNIZED_PENDING_MERGE`, conserva candidatura/custodia/permisos y C revalida antes de fusionar;
- Auth/Admin acredita correo primario verificado; página máxima 10, presupuestos/rate limits y Actualizar se fijan en ficha §4.3;
- adopción contiende con `ensureMyPerson` sobre `users.personaId`, usa guard inverso por Persona y concluye con una principal/cero efectos parciales;
- B conserva lectores legacy de una única Persona; multi-Persona y autorización consolidada quedan en C;
- App Check, flag, secretos, backfill, retención y outbox quedan clasificados por necesidad/momento en ficha §4.6.

Evidencia `dev@acc7b263`: `administrativePersonLinkModule` acredita correo con Admin SDK; lista páginas máximas de diez; persiste rechazo/reconsideración y receipts; adopta en un commit o registra `RECOGNIZED_PENDING_MERGE`; revoca custodia/directorio sólo al adoptar. `ensureMyPerson` crea Persona y `users.personaId` en una transacción y devuelve la existente al reintentar. Emulator, unitarias y UAT funcional acreditan las carreras declaradas. No existe `enforceAppCheck` ni política TTL común, y el outbox vigente atiende proyecciones asíncronas que B simple no modifica.

### IUX-11C — fusión y elección de principal

**Estado:** `LISTO PARA IMPLEMENTAR POR CORTES; REQUIERE AUTORIZACIÓN SEPARADA`.

Incluye preview, elección de principal, asignaciones consolidadas, conflictos de Membresías activas, finalización `PROFILE_MERGE`, autorización multi-Persona, economía histórica y reproyección.

Dependencias y secuencia:

- C0 núcleo de identidad `MIRRORED_SINGLE`, dual-write de alta propia/adopción B e inspección local, sin UI ni pluralidad;
- C1 retrofit de readers SUBJECT/self, economía, Solicitudes, Invitaciones, capabilities y proyecciones, primero en sombra;
- C2 writers canónicos `PROFILE_MERGE`, admisiones/capabilities, manifest, locks y recovery, todavía sin UI pública;
- C3 preview/confirmación/resultado paginados y UAT bajo flag apagado por defecto;
- C4 reconciliación, índices, observabilidad, canary y retiro posterior de autoridad singular.

La matriz de contratos, presupuestos, índices, pruebas y UAT está en la ficha §§5 y 8. Cada corte conserva B utilizable y no expone fusión antes de completar backend y recovery. C0–C2 no son funcionalidad entregada: permanecen invisibles/deshabilitados. C4 productivo es una autorización distinta de cualquier implementación local.

### IUX-11D — avisos externos y operación

**Estado:** `DIFERIDO; NO DEFINIDO PARA IMPLEMENTAR`.

Outbox, proveedor, reintentos, rebotes, rate limits, plantillas, métricas y supresión. Nunca bloquea B/C ni sustituye la bandeja interna.

## 11. Contradicciones resueltas por el addendum

1. **Persona con correo obligatorio:** IUX-11 crea versión compatible con correo opcional; no vuelve compatible por tolerancia silenciosa un documento viejo corrupto.
2. **Correo no es identidad vs candidatura por correo:** el correo verificado sólo habilita descubrir y confirmar una candidatura vigente; la asignación explícita es la autoridad.
3. **Un único `users.personaId` vs varias raíces originales:** el campo pasa a proyectar la principal; assignments conservan autorización y trazabilidad.
4. **Una ficha vigente vs registros de dos Personas:** UI/edición usan principal; economía/auditoría conservan IDs originales autorizados por assignments.
5. **Finalización Owner-only vs elección del usuario:** la UI Owner no se reutiliza; una capacidad interna con coordinación `PROFILE_MERGE` reutiliza el dominio y sus efectos.
6. **IUX-10 exige Persona exacta para Invitaciones:** se amplía a Persona asignada a la identidad autenticada, sin convertir principal en destinataria retroactiva.
7. **Cierre/archivo bloquean operaciones organizativas:** no bloquean reconocimiento porque éste pertenece a identidad; sólo la creación inicial de Membresía requiere Grupo activo y Temporada abierta.

## 12. Decisiones adoptadas, propuestas y pendientes

### 12.1 Adoptadas y vinculantes para IUX-11A

1. Custodia por Owner vigente del Grupo custodio; creador sólo audita.
2. Transferencia de ownership transfiere custodia; archivo la conserva.
3. Creación requiere Grupo activo + Temporada abierta; corrección no depende de Temporada/Membresía activa y continúa en archivado.
4. Grupo con ficha IUX-11A no es eliminable: Membresía y custodia son referencias bloqueantes.
5. Ausencia anómala del Grupo no otorga autoridad residual. Se preservan ficha/historia, se falla `ORPHANED_CUSTODY` y sólo reparación operacional o vínculo futuro recuperan edición.
6. Creación y corrección tienen intents/receipts y commits atómicos descritos en §10; no se admiten raíces parcialmente utilizables.

Con estas reglas, no queda una decisión funcional de A abierta. La implementación y UAT de A/A.1 quedaron cerradas; B/C y el directorio mantienen autorización separada.

### 12.2 Adoptadas y vinculantes para IUX-11B

1. Sin correo en ficha no hay candidatura; corregir/quitar correo retira la anterior inmediatamente.
2. **Ahora no** cierra y conserva disponible; **Esta ficha no es mía** retira y permite reconsiderar por opción secundaria.
3. Cambiar/quitar/agregar correo crea revisión; el rechazo por Cuenta + Persona sobrevive incluso a ida/vuelta y sólo reconsideración lo retira. Nombre/apellido no cambian revisión.
4. Cuenta sin Persona adopta de forma todo-o-nada; Cuenta con Persona sólo registra intención pendiente y conserva autoridad/permiso/custodia hasta C.
5. `ensureMyPerson` y adopción no pueden dejar dos principales ni una adopción parcial.
6. Archivo de Grupo, cierre de Temporada y finalización de Membresía no bloquean vinculación.
7. Firebase Auth/Admin acredita correo primario verificado; consulta/presupuestos/rate limits/Actualizar quedan en ficha §4.3.
8. `users.personaId` + guard inverso resuelven adopción simple; lectores multi-Persona no pertenecen a B.
9. Configuración/UAT/rollout y ausencia de outbox se rigen por ficha §4.6.

No queda propuesta B pendiente de aprobación.

### 12.3 Adoptadas y vinculantes para IUX-11C

1. El usuario revisa las fichas y elige principal.
2. Personas, IDs y referencias históricas se conservan; elegir datos principales no extingue obligaciones, Pagos ni historia.
3. Participaciones compatibles se conservan.
4. Duplicados activos del mismo Grupo/Temporada exigen elegir Membresía ganadora por separado de la principal; la otra se finaliza canónicamente con motivo **Fusión de fichas**, sin borrar historia ni deuda.
5. Todas las Personas consolidadas integran la autorización propia y las restricciones self.
6. Archivo, cierre o finalización no bloquean por sí solos revisar la vinculación.
7. Correo externo y directorio de Cuentas sin Persona no integran C.
8. C-N1 usa la principal en vistas vigentes/búsqueda y conserva nombres originales en historia/auditoría.
9. C-F1 admite 1..N assignments y revalida todo el conjunto/conflictos en cada operación.
10. C-A1 conserva admisiones compatibles; el usuario elige ante colisiones y writers canónicos terminalizan redundantes sin admisión implícita.
11. C-C1 conserva grants que revalidan, caduca anchors finalizados, revoca self-conflict y nunca transfiere permisos a la Membresía ganadora.
12. El Owner no recibe notificación dedicada en C; conserva motivo y trazabilidad consultables sin veto.
13. Preview válido 24 horas y revalidación obligatoria al confirmar; el digest confirmado cubre Membresías, admisiones y capabilities afectadas.
14. Retención categorizada: preview completo efímero; coordinación terminal por 30 días; evidencia mínima sin nombres/correos/importes ligada a Identidad; receipts según recurso autoritativo.

### 12.4 Estado de implementabilidad

No queda elección funcional pendiente. C0 está listo para una implementación local separadamente autorizada y no ofrece funcionalidad al usuario. C1–C3 dependen de la salida del corte anterior. C4 productivo —apply remoto, índices, configuración/flags, housekeeping, canary, enable y rollback— requiere autorización específica; no se deriva de implementar C0–C3 en local.

## 13. Refinamiento post-UAT de IUX-11A

**Estado al 25 de noviembre de 2026:** `UAT DE IUX-11A E IUX-11A.1 APROBADA SOBRE gdZvN1YTNPMteaRxngA6N; AMPLIACIÓN DE DIRECTORIO SEPARADA Y NO LISTA`.

### 13.1 Alcance que pertenece al cierre de A

Se adopta como ajuste de experiencia y exposición de contratos ya existentes:

1. **Crear ficha en modal.** El disparador vive en Integrantes y abre un diálogo modal siguiendo el patrón accesible ya usado por Economía/Membresías: foco inicial en Nombre, `Escape` sólo cuando no hay envío en curso, trampa de foco, retorno al disparador, campos conservados ante error o respuesta incierta y `single-flight` que impide doble envío. El reintento conserva la misma clave mientras el payload no cambie; editar un campo después de un error crea una intención nueva y obliga a reconsultar ante `STALE_REVISION`.
2. **Editar desde la fila.** Cada fila de Integrantes recibe `Editar ficha` únicamente cuando el DTO backend acredita custodia administrativa vigente para esa Persona y Grupo. La UI no infiere custodia por ausencia de Cuenta, correo, procedencia visual ni `personId`. La acción abre el mismo modal en modo corrección, con revisión esperada y retorno de foco a la fila.
3. **Caja única con pestañas URL-driven.** Encabezado, pestañas y panel comparten la misma superficie visual, conforme al patrón de Economía. El estado se representa en URL, recomendado `?membersView=members|non-members|invitations`; `push` se usa al elegir pestaña y el lector deriva todo de `searchParams`, por lo que Atrás/Adelante restaura contenido. Un deep-link `joinRequestId` selecciona `members`; un futuro `invitationId` selecciona `invitations`; parámetros desconocidos no conceden acceso y caen en la primera vista autorizada.

El ajuste no cambia las precondiciones de alta/corrección, no localiza Cuentas nuevas y no incorpora B/C.

### 13.2 Contenido y autorización de las pestañas

| Vista | Contenido | Autorización y estados |
| --- | --- | --- |
| Integrantes | padrón y buscador actuales de Membresías activas de la Temporada abierta | conserva contrato, contador, búsqueda y finalización actuales; sin Temporada abierta presenta el estado contextual vigente |
| No integrantes | fichas `UNLINKED` bajo custodia del Grupo actual sin Membresía activa en ese Grupo | sólo Owner vigente; lectura en Grupo activo o archivado; `Reincorporar` sólo con Grupo activo y Temporada abierta; `Editar ficha` continúa en archivado |
| Invitaciones | pendientes primero y luego terminales; páginas de cinco; cancelación sólo de pendientes | sólo Owner vigente; reautoriza ownership por página y al cancelar; una terminal nunca vuelve a pendiente desde esta vista |

El contenedor no oculta una denegación como vacío. Si el actor deja de ser Owner mientras consulta No integrantes o Invitaciones, descarta respuestas tardías, retira las pestañas Owner-only y vuelve a la primera vista todavía autorizada.

### 13.3 Lector paginado de No integrantes

```text
listAdministrativeNonMembersForOwnedGroup({ groupId, pageSize?, cursor? })
  -> {
       scope: { groupId, groupState, ownershipRevision? },
       items: [{
         personRef, firstName, lastName, contactEmail?, custodyRevision,
         membershipHistory: NONE | FINALIZED_CURRENT_SEASON | FINALIZED_PREVIOUS_SEASON,
         reincorporation: CREATE | REACTIVATE | RENEW | UNAVAILABLE
       }],
       nextCursor?
     }
```

- `pageSize` por defecto y máximo 20; lee `limit(pageSize + 1)`. El cursor es firmado, opaco y ligado a Cuenta, Grupo, generación de ownership/custodia, orden y última fila entregada.
- El universo es custodia `UNLINKED` del `custodianGroupId` exacto. Se excluye toda Persona con Membresía activa canónica en ese Grupo, sin importar Temporada.
- Una Membresía finalizada en la Temporada actual o anterior no excluye: informa la estrategia de reincorporación. Participaciones en otros Grupos no afectan la vista.
- Debe evitar N+1 abierto. Se recomienda una proyección backend `administrativeCustodyRosterEntries`, mantenida por alta, corrección, activación/finalización y transferencia, con `personId`, nombre de presentación, Grupo custodio, revisión, estado activo por Grupo y ancla de última Membresía. Todo comando revalida raíces y guards canónicos.
- Corrección actualiza Persona, auditoría, revisión y proyección nominal; no reescribe snapshots históricos. Si cambia el orden, un cursor previo queda stale y la UI reinicia con aviso.
- En Grupo archivado el lector y la corrección continúan disponibles. No ofrece alta, reincorporación, búsqueda localizable ni nuevas Invitaciones.

### 13.4 Reincorporación canónica

No integrantes no crea otra semántica de Membresía. `prepareAdministrativeReincorporation` relee custodia, ownership, Grupo activo, Temporada abierta, active/lifecycle guards y linaje, y devuelve:

- `CREATE`: no existe historia compatible; crea por el writer canónico;
- `REACTIVATE`: la última Membresía finalizada pertenece a la misma Temporada abierta; abre un nuevo Período sobre la misma raíz;
- `RENEW`: la última Membresía finalizada pertenece a una Temporada cerrada anterior; crea sucesora con `previousMembershipId`;
- `ALREADY_ACTIVE`, `CONTEXT_CHANGED` o `INCOMPATIBLE`: no escribe y obliga a refrescar.

Confirmar usa preview/activation ref y clave idempotente; actualiza guards, Períodos, contador, padrón, búsqueda, tareas y proyección de No integrantes mediante el mecanismo canónico. Grupo archivado, ausencia de Temporada abierta o `ORPHANED_CUSTODY` no admiten reincorporación. Corregir y reincorporar son comandos separados; el fallo de uno no deja el otro parcialmente confirmado.

### 13.5 Invitaciones dentro de la caja

El lector compone dos streams reutilizando IUX-10: pendientes por creación descendente y luego terminales por el orden canónico vigente (`createdAt` descendente, con desempate por ID). El cursor conserva fase y ancla, entrega cinco sin duplicar el borde y se liga a Grupo, Owner y contexto de la Invitación. Transferencia reautoriza al Owner nuevo; cancelación usa el writer canónico y mantiene recovery. Cierre, archivo o cambio de ownership no se reinterpretan en cliente: el backend devuelve legibilidad y cancelabilidad explícitas.

A.1 corrigió la asimetría previa: `listGroupInvitationsForOwnedGroup` y `cancelGroupInvitation` reautorizan al Owner vigente con contexto histórico en Grupo activo o archivado. En archivado se pueden consultar terminales y cancelar pendientes para liberar el guard; no se puede crear ni aceptar una Invitación, y el cierre de su Temporada sigue terminalizándola por el mecanismo canónico. El lector no duplica el writer ni convierte archivo en estado escribible general.

## 14. Ampliación del buscador/directorio: corte separado

### 14.1 Composición posible con contratos actuales

- Persona con Membresía activa: `ALREADY_MEMBER`, texto **Ya integra el grupo**, sin acción de Invitación.
- Persona localizable sin activa: `AVAILABLE`, `REQUEST_PENDING` o `INVITATION_PENDING`, reutilizando IUX-10.
- Sin coincidencias dentro de la cobertura consultada: A.1 ofrece **Crear integrante** sin afirmar inexistencia de Cuenta o Persona. La ampliación del directorio continúa pendiente.

No integrantes es una vista privada de custodia, no una fuente de localización para otros Grupos.

### 14.2 Cuenta sin Persona: contrato faltante

Hoy el directorio proyecta Personas con consentimiento. `users.nombre`, Auth `displayName`, correo de acceso o una búsqueda fallida no aportan nombre/apellido estructurados ni consentimiento suficiente. Para localizar una Cuenta sin Persona hace falta un recurso explícito y revocable:

```text
accountDirectoryProfiles/{accountId}
  firstName                 // ingresado explícitamente
  lastName                  // ingresado explícitamente; no derivado de displayName
  disclosedContactEmail?    // decisión separada; correo verificado derivado en servidor
  discoverability: ENABLED | DISABLED
  consentRevision
  consentedAt
  updatedAt
  schemaVersion
```

- La Cuenta completa Nombre y Apellido por separado antes de habilitar localización. No se separa `displayName`, no se copia silenciosamente `users.nombre` y no se habilita por defecto.
- El backend deriva `accountId` y verifica que todavía no tenga Persona/assignment incompatible.
- Recomendación inicial: mostrar sólo nombre, apellido y referencia opaca. Mostrar correo requiere consentimiento específico sobre un correo verificado elegido y una explicación previa de que será visible al Owner.
- El resultado usa `candidateKind: ACCOUNT_WITHOUT_PERSON` y `candidateRef` opaco/efímero; nunca expone `accountId`, existencia en Auth ni correo no consentido.
- **Crear ficha e incorporar** relee referencia, consentimiento/revisión, ausencia de Persona, Grupo activo y Temporada abierta. Crea Persona administrativa y Membresía, pero no `users.personaId`, assignment ni vínculo automático. Un correo consentido sería sólo `emailContacto` y futura candidatura B.
- Carrera con `ensureMyPerson`: ambos comandos coordinan una guard de Cuenta sin Persona. Si la creación propia gana, el candidato queda stale; nunca nacen dos resultados silenciosos desde una referencia vencida.

### 14.3 Pendientes de la ampliación

1. **Correo visible:** D-A recomendada, sólo nombre/apellido; D-B expone un correo verificado elegido con consentimiento específico y permite precargar `emailContacto`.
2. **Creación propia concurrente:** D-C recomendada, invalidar candidato y sólo pasar a Persona localizable si ésta tiene opt-in; D-D mantiene la oferta hasta nueva búsqueda, con mayor riesgo de duplicado.
3. Retención de nombre, consentimiento, referencias y evidencia al deshabilitar, crear Persona o cerrar Cuenta.
4. Recurso separado recomendado frente a evolucionar la preferencia IUX-10, que hoy presupone Persona y mezclaría autoridades.
5. Presupuesto de consulta, rate limit y defensa contra enumeración para el índice combinado Persona/Cuenta.

Estas decisiones pertenecen al corte de directorio. No queda una elección funcional adicional para A.1 sobre Grupos archivados: la lectura histórica y cancelación de pendientes quedaron implementadas y cubiertas por regresión de autorización.

## 15. Recomendación de corte

IUX-11A se cerró con el refinamiento visual/operativo **IUX-11A.1**: modal, acreditación de custodia por fila, caja con pestañas, No integrantes, Invitaciones y reincorporación canónica. Estado: `CERRADO; VALIDACIÓN TÉCNICA COMPLETA; UAT HUMANA APROBADA`.

La ampliación del directorio a Cuenta sin Persona queda fuera de IUX-11A.1 y de B/C. Estado: `NO LISTA`. Separarla permite cerrar IUX-11A sin introducir una segunda autoridad nominal ni ampliar la superficie de privacidad de IUX-10.

## 16. Criterios de salida documental

- IUX-11A/A.1 y B están cerrados; B permanece sujeto a sus gates productivos y cada corte C requiere autorización de implementación propia.
- IUX-11B no se habilita productivamente hasta completar flag, secretos, índice, backfill y observabilidad autorizados; eso no reabre su cierre funcional.
- IUX-11C no se habilita con lectores que todavía autoricen únicamente por `users.personaId`.
- Ningún corte reescribe `personId`/`membershipId`, altera Pagos ni usa correo como unicidad de Persona.
- `visuals/`, datos UAT, producción y despliegue quedan fuera.
