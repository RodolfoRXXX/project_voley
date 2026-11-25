# IUX-11 — Relevamiento de fichas administrativas, vinculación y fusión

## 1. Estado y base

- **Estado:** `RELEVAMIENTO ACTUALIZADO; DECISIONES FUNCIONALES DE VINCULACIÓN Y FUSIÓN INCORPORADAS`.
- **Fecha:** 24 de noviembre de 2026.
- **Base verificada:** `dev@e8740549e6ae956f4c9588a4e051a78adbe5ffe9`, idéntica a `HEAD` y `origin/dev` al iniciar el relevamiento.
- **Próximo identificador disponible:** `IUX-11`.
- **Decisión de Documento 5:** `D5-083`, que adopta este refinamiento documental y mantiene autorización técnica separada.
- **Estado local preservado:** `visuals/` continúa sin seguimiento y no fue modificado.
- **Alcance:** documentación y contraste. No autoriza implementación, migración, datos, commit, push ni despliegue.

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
| Persona | `buildPerson` e `hydratePerson` exigen `emailContacto` y un esquema exacto sin versión | IUX-11A necesita Persona compatible con correo opcional y procedencia administrativa |
| Cuenta | `users/{uid}.personaId`; `linkPerson` rechaza un segundo vínculo | No representa fichas consolidadas ni permite elegir como principal una ficha administrativa |
| Alta propia | `ensureMyPerson` reserva Persona y fija el vínculo singular en una transacción | Debe competir con reconocimiento/fusión mediante una autoridad de identidad común |
| Presentación propia | `getMyPerson`, membresías, historial y economía derivan un único `personaId` | Deben resolver ficha principal para edición y conjunto de Personas autorizadas para historia/economía |
| Membresía | Raíz y guards se identifican por `personId + groupId`; el alta mantiene Períodos, contador y padrón | Sirve para IUX-11A, pero no detecta duplicado entre dos Personas de la misma identidad consolidada |
| Finalización | La finalización administrativa es Owner-only, exige contexto modificable, evita self-target y no recibe motivo | La fusión necesita una coordinación interna autorizada por el titular y evidencia `PROFILE_MERGE`, conservando los mismos efectos canónicos |
| Padrón | Contador cuenta contribuciones por Membresía; búsqueda materializa nombre de la Persona de la Membresía | Finalizar la duplicada debe decrementar una vez; elegir principal debe reproyectar el nombre vigente de Membresías conservadas |
| Economía | Pago conserva `membershipId`, `personId`, Temporada, concepto y evidencia | No debe reescribirse. Los lectores propios deben autorizar por identidad consolidada y conservar el sujeto original |
| Solicitudes/Invitaciones | guards e Invitaciones se correlacionan por Persona; responder exige el `users.personaId` exacto | Deben aceptar una Persona asignada a la identidad, no sólo la principal, y coordinar conflictos creados por la fusión |
| Capabilities | Grants conservan `accountId`, `personId`, `membershipId` y validity anchor; evaluadores comparan contra la Persona propia singular | Una capability de una Membresía conservada debe validar contra el conjunto asignado; la ligada a una Membresía finalizada debe caducar |
| Directorio IUX-10 | Es opt-in, revocable y sólo contiene Personas localizables | No sirve para encontrar Cuentas ni candidaturas IUX-11; ausencia no significa ausencia de usuario |
| Correo | `emailService` usa Gmail/Nodemailer y envío directo | Sólo puede ser adaptador de un efecto opcional; faltan outbox, retry, estado de entrega y supresión de PII |
| Ownership | No existe writer canónico de transferencia habilitado | IUX-11 sólo puede fijar compatibilidad futura y autorizar hoy por Owner vigente |
| Eliminación | E2-24 sólo elimina Grupo activo sin Temporadas, Membresías, Solicitudes ni otra referencia; archivado no es eliminable | Una ficha IUX-11A siempre crea Membresía y custodia, por lo que su Grupo custodio no puede eliminarse válidamente |

## 4. Mecanismo de identidad propuesto

### 4.1 Separar presentación vigente de trazabilidad

No se migran referencias históricas de una Persona a otra. Se incorpora una autoridad de identidad que relaciona una Cuenta con todas las Personas reconocidas y designa exactamente una principal.

```text
accountIdentities/{accountId}
  primaryPersonId
  state: READY | MERGING
  identityRevision
  activeMergeId?
  updatedAt
  schemaVersion

personIdentityAssignments/{personId}
  accountId
  role: PRIMARY | CONSOLIDATED
  principalPersonId
  assignmentRevision
  recognizedAt
  mergeId?
  schemaVersion
```

- El ID de `personIdentityAssignments` es `personId`: una Persona no puede pertenecer simultáneamente a dos Cuentas.
- Una Cuenta puede tener varias asignaciones, pero `accountIdentities` acredita una sola principal.
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
  updatedAt
  schemaVersion

administrativePersonLinkDecisions/{decisionId}
  accountId
  personId
  emailRevision
  decision: RECOGNIZED | REJECTED
  decidedAt
  schemaVersion
```

- `originGroupId` es procedencia inmutable; `custodianGroupId` es el Grupo cuya ownership vigente autoriza corrección. En A son iguales. Ningún actor se copia como autoridad dentro de custodia.
- `emailLookup` es HMAC de la normalización acordada con un secreto estable; no es correo en claro ni índice único.
- Varias filas pueden compartir `emailLookup`; por eso varias fichas con el mismo correo aparecen por separado.
- El backend deriva correos verificados desde identidad autenticada confiable; el cliente no envía correo como autoridad.
- Crear o corregir correo actualiza Persona, `emailRevision`, candidatura anterior, nueva candidatura y proyecciones nominales en una coordinación atómica o recuperable.
- Quitar el correo elimina la candidatura.
- Rechazo se liga a Cuenta, Persona y `emailRevision`. No borra ficha, Membresía ni economía.
- El listado y la aceptación revalidan Persona, candidatura, HMAC, revisión, correo verificado y ausencia de asignación incompatible.
- Grupo, Temporada y estado de Membresía son presentación de procedencia, no precondiciones de vinculación.

## 5. Autorización tras consolidar

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
| `ensureMyPerson` vs adoptar ficha | Compiten por `accountIdentities/{accountId}`; el primer commit fija la realidad. El perdedor relee y pasa a recorrido de fusión, nunca crea un segundo principal silencioso |
| corregir correo vs listar/reconocer | Corrección incrementa `emailRevision` y reemplaza la candidatura; respuestas con revisión anterior se descartan |
| corregir correo vs aceptar | Aceptación relee correo verificado, HMAC, `emailRevision` y candidatura en el commit de adquisición; una corrección confirmada gana o fuerza `CANDIDATE_STALE` |
| dos Cuentas reconocen la misma Persona | Compiten por `personIdentityAssignments/{personId}`; como máximo una adquiere la asignación |
| dos fusiones de la misma Cuenta/Persona | `activeMergeId` y coordinaciones por Person impiden dos manifests activos |
| fusión vs alta/reactivación/renovación | writers de admisión consultan coordinación/estado `MERGING`; no crean una raíz que el manifest no vio |
| fusión vs finalización/cierre | activation refs y receipts determinan si la finalización ya ocurrió; recovery recalcula sólo outcomes compatibles |
| fusión vs pago/obligación | No se bloquean operaciones económicas sobre raíces existentes; cursores y autorización releen `identityRevision` |
| transferencia de ownership | Autoridad administrativa se relee por Owner vigente; una respuesta del Owner anterior se descarta |

## 10. Cortes y dependencias

### IUX-11A — alta administrativa y economía

**Estado:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.

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

**Estado:** `DEFINIDO PARCIALMENTE; NO LISTO PARA IMPLEMENTAR`.

Incluye índice privado por HMAC de correo, listado interno, rechazo/reconocimiento, adopción como principal, Cuenta creada con posterioridad y aviso externo opcional.

Dependencias:

- fuente confiable de correos verificados de la Cuenta;
- `accountIdentities` y `personIdentityAssignments` compatibles con `users.personaId`;
- evolución de `ensureMyPerson/getMyPerson` para competir con adopción;
- materialización/reconciliación de candidaturas para fichas creadas por IUX-11A antes de habilitar B, sin fabricar correo ni deduplicar Personas;
- decisión pendiente sobre persistencia/reaparición de rechazos (§12); la custodia de A ya está cerrada.

### IUX-11C — fusión y elección de principal

**Estado:** `DEFINIDO PARCIALMENTE; NO LISTO PARA IMPLEMENTAR`.

Incluye preview, elección de principal, asignaciones consolidadas, conflictos de Membresías activas, finalización `PROFILE_MERGE`, autorización multi-Persona, economía histórica y reproyección.

Dependencias:

- IUX-11B y autoridad de identidad habilitada;
- retrofit de lectores SUBJECT, Solicitudes, Invitaciones y capabilities;
- capacidad interna de finalización por fusión con motivo y receipts;
- manifest/coordinador recuperable;
- resolución de pendientes funcionales de §12;
- presupuesto, índices, reconciliación y rollout compatible.

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

Con estas reglas, no queda una decisión funcional de A abierta. Su estado `LISTO` es coherente, aunque la implementación sigue requiriendo autorización separada.

### 12.2 Recomendaciones para B/C — todavía no adoptadas

**Rechazo de candidatura**

- **B-R1 recomendada:** ocultar a esa Cuenta la candidatura rechazada mientras conserve el mismo `personId + emailRevision`; corregir sólo nombre/apellido no la repone, cambiar/quitar/agregar correo sí crea otra revisión. Consecuencia: respeta la decisión y permite reconsiderar ante una dirección realmente nueva.
- **Alternativa B-R2:** rechazo permanente hasta que el usuario lo revierta manualmente. Consecuencia: mayor control, pero exige bandeja de rechazadas y puede ocultar una ficha legítima corregida.

**Nombre principal y trazabilidad**

- **C-N1 recomendada:** vistas actuales operativas, padrón y búsqueda usan el nombre de la principal; historia económica/auditoría conserva y muestra sujeto original y, cuando ayude, “consolidada en {principal}”. Consecuencia: una identidad vigente coherente sin falsificar evidencia histórica.
- **Alternativa C-N2:** toda vista conserva nombre original por registro. Consecuencia: máxima literalidad histórica, pero el usuario continúa apareciendo con varias identidades en superficies actuales y contradice parcialmente la experiencia de ficha única.

**Fusiones sucesivas**

- **C-F1 recomendada:** identidad admite 1..N assignments y cada nueva ficha se fusiona contra el conjunto vigente; el manifest reevalúa conflictos de todas las Personas asignadas. Consecuencia: modelo estable y sin “segunda fusión” especial, con mayor costo de paginación/reconciliación.
- **Alternativa C-F2:** limitar el primer contrato a exactamente dos Personas. Consecuencia: implementación menor, pero una tercera coincidencia queda bloqueada y obliga a evolucionar modelo y UX luego.

**Solicitudes e Invitaciones pendientes**

- **C-A1 recomendada:** preview agrupa por Grupo. Si ya existe Membresía activa de la identidad, las admisiones redundantes se muestran y el usuario confirma terminalizarlas con motivo `PROFILE_MERGE`; si no existe activa y hay varias pendientes, elige como máximo una para conservar y las restantes se terminalizan. Recursos de Grupos distintos se preservan. Consecuencia: no hay admisión implícita ni guard duplicado después de fusionar.
- **Alternativa C-A2:** bloquear la fusión hasta que cada Solicitud/Invitación se resuelva por sus flujos originales. Consecuencia: dominio más simple, pero una invitación inaccesible o Temporada cerrada puede impedir indefinidamente consolidar identidad.

**Capabilities**

- **C-C1 recomendada:** conservar sólo grants cuyo `accountId`, assignment, Membresía, anchor, slot, ownership y Temporada revaliden; las ligadas a Membresía perdedora caducan. Consecuencia: preserva permisos legítimos sin transferirlos entre raíces.
- **Alternativa C-C2:** hacer caducar todas las capabilities de Personas fusionadas y exigir nueva concesión. Consecuencia: seguridad operacional más simple, pero interrumpe permisos válidos aunque su Membresía continúe.
- En ambas, “propia identidad” abarca todas las Personas asignadas: nunca se permite auto-revisión, auto-validación o registro como tercero usando otra ficha consolidada.

### 12.3 Pendientes que requieren elección

1. Elegir B-R1 o B-R2 para cerrar IUX-11B.
2. Elegir C-N1/C-N2, C-F1/C-F2, C-A1/C-A2 y C-C1/C-C2 para cerrar IUX-11C.
3. Definir si el Owner recibe aviso informativo por finalización `PROFILE_MERGE`; no tendrá veto ni bloqueará recovery.
4. Fijar retención/eliminación de candidaturas, rechazos, manifests y evidencia de identidad.

B/C permanecen `NO LISTOS` hasta adoptar estas alternativas y completar contratos técnicos.

## 13. Criterios de salida documental

- IUX-11A puede implementarse sólo con autorización posterior y manteniendo B/C apagados.
- IUX-11B no se habilita hasta que identidad y alta propia compartan una autoridad y se acredite Cuenta creada después de la ficha.
- IUX-11C no se habilita con lectores que todavía autoricen únicamente por `users.personaId`.
- Ningún corte reescribe `personId`/`membershipId`, altera Pagos ni usa correo como unicidad de Persona.
- `visuals/`, datos UAT, producción y despliegue quedan fuera.
