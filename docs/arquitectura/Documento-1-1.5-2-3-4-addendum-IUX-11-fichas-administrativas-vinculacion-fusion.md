# Addendum IUX-11 a Documentos 1, 1.5, 2, 3 y 4 — Fichas administrativas, vinculación y fusión

## 1. Estado y precedencia

- **Estado:** `D5-085 CIERRA IUX-11A/A.1; D5-087 CIERRA IUX-11B; D5-088 ADOPTA C-N1/C-F1/C-A1/C-C1 Y DEJA IUX-11C LISTO POR CORTES CON AUTORIZACIÓN SEPARADA`.
- **Fecha:** 26 de noviembre de 2026.
- **Ámbito:** Cuenta, Identidad, Persona, Grupo, Temporada, Membresía, Solicitud, Invitación, capabilities y economía.
- **Ficha:** `IUX-11 — Fichas administrativas, vinculación y fusión`.

Este addendum amplía los documentos sólo en los puntos enumerados. IUX-10 continúa gobernando localización e Invitaciones de ingreso. IUX-11 usa correo verificado para presentar candidaturas privadas de fichas administrativas, no para localizar Personas por un Owner, identificar unívocamente una Persona ni autorizar pertenencia.

## 2. Documento 1 — producto y dominio

### 2.1 Persona administrativa

Persona administrativa es una Persona creada por el Owner vigente desde Integrantes antes de que exista una Cuenta titular. Tiene nombre, apellido, correo de contacto opcional y procedencia auditable. Puede ser sujeto de Membresía, obligaciones y Pagos.

La ausencia de Cuenta no reduce la validez de Persona, Membresía ni economía. La ausencia de correo sólo impide candidatura de vinculación.

La custodia corresponde al Owner vigente del Grupo custodio mientras la Persona no esté vinculada. Transferir ownership transfiere custodia; `createdByAccountId` sólo audita. Archivo conserva custodia y futura vinculación.

### 2.2 Identidad de Cuenta

Identidad de Cuenta es la autoridad que:

- designa una única Persona principal vigente para presentación y edición personal;
- conserva asignaciones a las Personas originales reconocidas;
- autoriza acceso a registros SUBJECT que siguen referenciando esas Personas;
- impide que una Persona quede asignada a dos Cuentas.

Cuenta, Identidad y Persona siguen siendo conceptos separados. Una Cuenta puede controlar varias raíces Persona consolidadas, pero presenta una sola ficha principal vigente.

### 2.3 Candidatura de vinculación

Una ficha administrativa con correo vigente origina una candidatura privada para cualquier Cuenta autenticada que acredite un correo verificado coincidente. La candidatura:

- aparece dentro de Ficha personal, incluso si la Cuenta nació después;
- exige reconocer o rechazar explícitamente;
- se retira al corregir/quitar el correo;
- se revalida al aceptar;
- no depende del estado de Grupo, Temporada o Membresía;
- no requiere ni se autoriza mediante enlace de correo.

Varias Personas pueden compartir correo. No existe unicidad de Persona por correo.

### 2.4 Fusión de fichas

Fusión es una coordinación de identidad, no una reescritura de Agregados. Conserva las Personas originales y designa una principal. Las raíces históricas dejan de ser fichas vigentes editables, pero continúan identificando Membresías y economía.

Si existen dos Membresías activas del mismo Grupo y Temporada, el titular elige cuál continúa. La otra se finaliza canónicamente con motivo **Fusión de fichas**. Principal y Membresía ganadora se eligen por separado.

## 3. Documento 1.5 — modelo conceptual

```text
Cuenta --posee--> IdentidadCuenta --principal--> Persona
IdentidadCuenta --asigna/traza--> Persona original 1..N
Persona administrativa --correo vigente--> Candidatura privada
Cuenta --correo verificado + decisión--> Reconocimiento
Reconocimiento --crea--> Asignación Persona–Identidad
Fusión --elige--> Persona principal
Fusión --resuelve conflicto--> Membresía activa ganadora
Membresía/Pago/Auditoría --conservan--> personId original
```

### 3.1 Invariantes

1. Una Identidad tiene exactamente una principal cuando está `READY`.
2. Una Persona se asigna como máximo a una Cuenta.
3. `users.personaId` puede proyectar la principal, pero no acredita el conjunto completo.
4. Correo coincidente habilita candidatura; sólo una decisión confirmada crea asignación.
5. Corregir correo incrementa revisión y vuelve inválida toda decisión en vuelo anterior.
6. Fusión no cambia referencias de Membresía, Pago, Período o auditoría.
7. Una Membresía finalizada por fusión conserva deuda y aplicaciones económicas.
8. Una capability no se mueve de Membresía; permanece o caduca según su anchor original.
9. Estado `MERGING` impide writers incompatibles y es recuperable.
10. Principal y Membresía activa ganadora son elecciones independientes.
11. Estado transitorio `MIRRORED_SINGLE` contiene exactamente una assignment activa igual a `users.personaId`; no habilita pluralidad, cambio de principal ni fusión.

## 4. Documento 2 — funcionalidad

### 4.1 Casos de uso

- crear ficha administrativa e incorporarla a Temporada abierta;
- consultar/corregir ficha no vinculada;
- listar candidaturas propias por correo verificado;
- rechazar o reconocer una candidatura;
- adoptar ficha cuando no existe Persona propia;
- preparar y confirmar fusión cuando existe Persona;
- elegir principal;
- elegir Membresía ganadora por conflicto Grupo/Temporada;
- consultar y recuperar resultado;
- acceder a economía histórica de Personas asignadas.

### 4.2 Autorización

- Alta exige Cuenta canónica, Owner vigente, Grupo activo y Temporada abierta. Corrección exige Owner vigente del Grupo custodio, Persona no vinculada y revisión exacta, pero admite Grupo activo o archivado y no requiere Temporada/Membresía activa. No se autoriza por `createdBy` histórico.
- Listar/decidir candidaturas exige Cuenta autenticada y correo verificado derivado en servidor.
- Editar ficha personal exige ser Cuenta de la Identidad y que la Persona sea principal.
- Leer/operar historia y economía exige que el sujeto original esté asignado a la Identidad.
- Elegir principal no concede ownership, pertenencia ni capabilities.
- La coordinación de fusión autoriza sólo las finalizaciones exactas aceptadas en el manifest.
- Las prohibiciones sobre operar la economía propia consideran todas las Personas asignadas a la Identidad, no sólo la principal.

### 4.3 Experiencia

- IUX-11A agrega **Crear ficha** como alternativa a búsqueda/invitación, sin reemplazar IUX-10.
- B/C viven en `/profile/person`.
- B separa **Ahora no**, que sólo cierra la revisión y mantiene candidatura disponible, de **Esta ficha no es mía**, que retira sugerencia y permite reconsiderar. El rechazo se liga a Cuenta + Persona, sobrevive a cambios/ida-vuelta de correo y sólo reconsideración explícita lo retira. Con Persona existente, `RECOGNIZED_PENDING_MERGE` registra intención, conserva candidatura/custodia/permisos, no crea assignment ni reserva ficha, y C revalida todo.
- Preview muestra procedencia, consecuencias y economía preservada antes de confirmar.
- Al concluir se muestra una sola ficha vigente; historia/economía siguen navegables por sus raíces.
- Aviso externo es opcional y su fallo no cambia la experiencia autoritativa interna.

## 5. Documento 3 — arquitectura funcional

### 5.1 Responsabilidades

- Persona mantiene datos nominales y procedencia.
- Custodia mantiene autoridad administrativa de la ficha no vinculada.
- Identidad mantiene principal y assignments.
- Candidaturas proyectan coincidencia privada por correo vigente.
- Membresía conserva único writer de activación/finalización y sus efectos.
- Economía conserva sus raíces sin operaciones implícitas de consolidación.
- Proyectores actualizan padrón nominal y búsquedas sin cambiar correlaciones originales.

E2-24 continúa impidiendo eliminar un Grupo con cualquier Membresía y prohíbe eliminar archivados. Custodia se agrega como referencia defensiva. Por ello una ficha IUX-11A no admite eliminación válida de su Grupo custodio. Si la raíz falta de forma incompatible, queda `ORPHANED_CUSTODY`: ninguna autoridad histórica puede corregir; ficha e historia se conservan y sólo reparación operacional correlacionada o vínculo futuro recuperan edición.

### 5.2 Identidad compatible

Para B simple, `users.personaId` continúa como única principal y `personAccountAssignments/{personId}` impide que dos Cuentas adopten la misma ficha. Los lectores actuales conservan contrato. Sólo C introducirá `accountIdentities` y `personIdentityAssignments` para pluralidad:

1. assignment/identity válido es autoridad;
2. durante transición, un `users.personaId` legacy sin assignment puede adoptarse de manera idempotente y auditable;
3. divergencia entre proyección y autoridad falla cerrada;
4. después del rollout, `users.personaId` queda como proyección de principal.

### 5.3 Candidatura

La proyección usa HMAC de correo normalizado y admite varias filas por lookup. Crear/corregir/quitar correo mantiene revisión e índice. No consulta el directorio opt-in IUX-10 ni Firebase Auth para decidir si materializar una ficha. La Cuenta consulta con correos verificados derivados al momento de leer.

La fuente autoritativa es el registro vigente Firebase Auth leído con Admin SDK: sólo correo primario y `emailVerified == true`. Claims del token, `users.email`, Persona y payload cliente no acreditan correo. `accountVerifiedEmailCredentials/{accountId}` es evidencia/proyección reconciliada por operación; cambio o desverificación invalida cursor/preview.

La candidatura mantiene tarjeta mínima denormalizada sin economía. Página máxima 10 con `limit(11)`. Cada página/Actualizar consume 1 lectura Auth y hasta 24 Firestore; detalle hasta 9; comando nuevo hasta 12. Rate limits: listado 30/minuto y burst 10/10 s por Cuenta; detalle/decisiones 12/minuto; adopción 6/minuto. Continuación y Actualizar son solicitudes nuevas; re-render sin llamada no. Exceso falla sin efecto.

Cambiar, quitar o agregar correo normalizado incrementa revisión; una ida/vuelta produce revisiones nuevas pero no levanta `REJECTED`, cuyo scope es Cuenta + Persona. Nombre/apellido no cambian revisión. Sólo reconsideración explícita rehabilita sugerencia.

### 5.4 Fusión recuperable

Fusión usa manifest sellado sobre el conjunto completo, coordinación, locks Persona, assignments transitorios, receipts por efecto y resultado consultable. Cambia la Identidad a `MERGING`, desde ese momento considera propias todas las Personas adquiridas, finaliza duplicados elegidos con origen `PROFILE_MERGE`, resuelve admisiones/capabilities por sus writers, confirma assignments/principal, emite outbox y vuelve a `READY`.

No existe rollback de hechos de Membresía ya confirmados. Un fallo parcial mantiene coordinación y recovery obligatorio; no abre otro plan sobre las mismas Personas.

Preparación y secciones del preview son paginadas con cobertura explícita. El preview vale 24 horas y la confirmación no acepta manifest incompleto, vencido o stale: relee fuentes autoritativas y confirma un digest que abarca Membresías, admisiones y capabilities afectadas. C-N1, C-F1, C-A1 y C-C1 gobiernan fusiones sucesivas, presentación nominal, admisiones y capabilities.

## 6. Documento 4 — diseño técnico

### 6.1 Familias de contratos

- alta/consulta/corrección administrativa y resultado;
- listado/decisión de candidaturas propias;
- identidad principal y conjunto autorizado;
- preparación/confirmación/resultado de fusión;
- finalización interna por fusión;
- reproyección/reconciliación de presentación nominal.

Payloads son cerrados. Cuenta, correos verificados, Persona, Grupo, Temporada, revisions y estados se derivan/releen. Firestore cliente conserva deny-all.

### 6.2 Evolución de Persona

El esquema versionado admite `emailContacto` ausente en una Persona administrativa. Lectores distinguen versiones válidas de corrupción histórica. `ensureMyPerson` puede seguir exigiendo correo en su caso de uso mientras el dominio general admite ausencia; no debe fabricar correo ni reutilizar el correo de acceso sin confirmación.

### 6.3 Writer único de Membresía

- Activación administrativa agrega origen `ADMINISTRATIVE_PROFILE_CREATION`.
- Finalización por fusión agrega origen `PROFILE_MERGE`, motivo auditable, `mergeId` y receipt.
- Ambos reutilizan dominio, Períodos, active/lifecycle guards, contribuciones, contador, búsqueda y outbox.
- Ningún coordinador escribe directamente estado/contador/proyección para simular esos efectos.

El alta A usa intent determinista y un commit que crea Persona, custodia, Membresía, Período, guards, contribución, contador, búsqueda y receipt. Respuesta perdida relee receipt; estado parcial falla cerrado. La corrección usa expected revision, ownership/custodia revalidados y receipt en un único commit nominal/proyección.

### 6.4 Autorización multi-Persona

Los contratos SUBJECT resuelven el sujeto original y verifican assignment. `getPrincipalPerson` se usa sólo cuando el concepto funcional es la ficha vigente. Capabilities revalidan Cuenta, assignment, `grant.personId`, Membresía, validity anchor, slot, ownership revision, Grupo y Temporada. Un anchor finalizado caduca. Todas las Personas asignadas cuentan como identidad propia para impedir auto-revisión, auto-validación o registro como tercero mediante otra ficha.

El Owner conserva autoridad contextual sobre sus recursos, no sobre la Identidad: no elige principal, no edita una Persona consolidada, no separa assignments y no veta la fusión. Archivo, cierre o finalización no quitan el derecho del titular a revisar la vinculación. Durante `MERGING`, las Personas adquiridas ya cuentan como propias para restricciones aunque la presentación continúe en la principal anterior hasta el commit final.

### 6.5 Concurrencia

Debe probarse:

- alta propia vs adopción;
- corrección vs listado/aceptación;
- dos Cuentas vs misma ficha;
- dos fusiones solapadas;
- fusión vs admisión, finalización, cierre y capabilities;
- retry antes/después de cada commit y respuesta perdida;
- reproyección duplicada/fuera de orden;
- cambio de Cuenta durante preview/confirmación.

Cada fase es idempotente y recuperable por `operationRef`. Preview vencido o revisión distinta queda `STALE`; una respuesta perdida no autoriza repetir efectos. Locks y adquisición se procesan en lotes acotados; no se fija un máximo de Personas sin decisión de producto. Los cursores ligan `identityRevision`, manifest, sección y orden.

Para B, `ensureMyPerson` y adopción comparten `users.personaId` como barrera. La adopción confirma en un commit `users.personaId`, guard inverso, custodia `LINKED`, retiro de candidatura, decisión y receipt. El perdedor reintenta sin efecto parcial. Corrección ganadora produce `CANDIDATE_STALE`; adopción ganadora revoca corrección administrativa. Con Persona preexistente, sólo un comando explícito registra `RECOGNIZED_PENDING_MERGE`, sin adquirir autoridad.

La base vigente confirma que `ensureMyPerson` coordina Persona + `users.personaId` atómicamente y devuelve existente al reintentar. B usa esa misma barrera, por lo que no necesita modificar ese writer; sí requiere pruebas de carrera contra el nuevo commit de adopción.

### 6.6 Commit, compatibilidad e idempotencia B

- La adopción sin Persona confirma en un commit assignment simple, `users.personaId`, custodia `LINKED`, retiro de candidatura, decisión y receipt. No usa outbox: revocación administrativa y autoridad no son eventuales.
- No reescribe Persona, Membresía, Período, obligación, Pago ni auditoría. Los lectores legacy siguen por `users.personaId`; padrón/economía conservan IDs. No reactiva Membresía ni concede ownership, rol o capability.
- Preview liga fingerprint Auth, `emailRevision` y digest. Receipt determinista liga actor/candidato/request hash; retry exacto recupera, payload distinto conflictúa y `operationRef` resuelve respuesta perdida. **Ahora no** no persiste comando.
- App Check queda como gate transversal productivo porque el repositorio no lo aplica; flag por entorno, secretos fijos de UAT, backfill manifestado, retención mínima y ausencia de outbox se fijan en ficha §4.6.

### 6.7 Primer corte C0

C0 introduce `accountIdentities` y `personIdentityAssignments` en estado transitorio `MIRRORED_SINGLE`, exacto espejo de `users.personaId`, sin UI, pluralidad, cambio de principal ni consumo de `RECOGNIZED_PENDING_MERGE`. Alta propia y adopción B mantienen espejo/assignment en su commit vigente; Cuenta legacy se resuelve sin escribir y una materialización remota pertenece a C4. Divergencia falla cerrada y no se autorepara.

En C0 `users.personaId` conserva el comportamiento visible. La autoridad plural sólo puede promoverse a `READY` después del retrofit C1. C0 no agrega índices compuestos, writers de Membresía/admisión/capability ni superficie de usuario; sus contratos y criterios de salida están en la ficha §8.1.

## 7. Correo y notificación

El correo externo no es parte del protocolo de vinculación. Un corte futuro puede registrar outbox después de crear/corregir candidatura. Entrega, retry o fallo no crean, extienden ni restauran candidatura; tampoco revelan al Owner si existe Cuenta destinataria.

El adaptador Gmail vigente no constituye garantía operacional. Antes de IUX-11D se requieren proveedor/configuración, secretos, idempotencia, rate limit, rebotes, observabilidad sin PII y política de retención.

## 8. Addendum post-UAT de IUX-11A

### 8.1 Experiencia normativa

- Alta y corrección administrativa usan un único modal accesible. La intención idempotente sobrevive a error/respuesta perdida; doble envío queda bloqueado; cerrar restaura foco; modificar payload después de un fallo inicia otra intención.
- La fila de padrón sólo expone `Editar ficha` si un lector backend acredita custodia administrativa `UNLINKED`, Grupo custodio coincidente y revisión. La presentación no deriva autoridad de correo, Membresía, falta de Cuenta ni procedencia.
- Integrantes adopta una caja única con pestañas URL-driven. La URL es la autoridad de selección para soportar deep-links y Atrás/Adelante; ocultar una pestaña por rol no habilita su reader.
- Integrantes conserva el padrón vigente. No integrantes e Invitaciones son Owner-only. El primero contiene custodias sin activa en el Grupo; el segundo ordena pendientes antes de terminales y pagina de cinco.

### 8.2 Proyección y lector de No integrantes

Se agrega una proyección backend denormalizada, no una nueva autoridad:

```text
administrativeCustodyRosterEntries/{entryId}
  personId
  custodianGroupId
  custodyRevision
  firstName
  lastName
  activeMembershipIdInGroup?
  latestFinalizedMembershipIdInGroup?
  latestFinalizedSeasonId?
  projectionRevision
  updatedAt
  schemaVersion
```

El ID es determinista por Grupo + Persona. Alta/corrección, activación, finalización, transferencia de custodia y reparación operacional producen outbox/receipt idempotente. La proyección permite consulta ordenada y acotada, pero cada acción relee custodia, Grupo, Persona y guards canónicos. Divergencia produce `PROJECTION_STALE/INCOMPATIBLE`, nunca autorización.

`listAdministrativeNonMembersForOwnedGroup` usa `limit(pageSize + 1)`, máximo 20, cursor firmado ligado a actor, Grupo, ownership/custody generation, orden y ancla. Excluye cualquier activa en el Grupo, no sólo en la Temporada abierta. Incluye finalizadas actuales/anteriores y Personas activas en otros Grupos. Una corrección que altere el orden invalida continuación previa.

### 8.3 Reincorporación

`prepareAdministrativeReincorporation` y `confirmAdministrativeReincorporation` son adapters Owner-scoped del writer canónico de Membresía:

- sin historia: `CREATE`;
- finalizada de la misma Temporada abierta: `REACTIVATE` y nuevo Período;
- finalizada de una Temporada anterior cerrada: `RENEW` con nueva raíz y linaje;
- activa, contexto cambiado o evidencia incompatible: no-op/error recuperable.

Confirmar relee preview/activation ref, ownership, custodia, Grupo activo y Temporada abierta. No escribe directamente contador, búsqueda, Períodos ni guards. Archivo conserva lectura/corrección pero deshabilita reincorporación.

### 8.4 Invitaciones y navegación

El lector Owner compone pendientes y terminales como streams ordenados, con cursor de fase y página pública de cinco. La cancelación pendiente continúa en el writer IUX-10. Transferencia de ownership reautoriza cada lectura/comando. Los deep-links `joinRequestId` e `invitationId` seleccionan su panel sin saltar autorización; parámetros desconocidos no revelan existencia de recursos.

La autoridad histórica se evalúa contra el Owner vigente y admite Grupo activo o archivado, sin requerir Temporada abierta. En archivado sólo se habilitan lectura y cancelación de una pendiente; creación y aceptación siguen prohibidas. El código IUX-10 ya usa autoridad histórica en `cancelGroupInvitation`, pero el reader vigente llama a `ownedOpen`: A.1 debe separar esa precondición, conservar la expiración por Temporada cerrada y probar que el archivo no concede otra escritura.

### 8.5 Directorio de Cuenta sin Persona

No se incluye en IUX-11A.1. Requiere autoridad nominal y consentimiento separados de Persona:

```text
accountDirectoryProfiles/{accountId}
  firstName
  lastName
  disclosedContactEmail?
  discoverability
  consentRevision
  consentedAt
  updatedAt
  schemaVersion
```

Nombre/Apellido se capturan explícitamente; nunca se obtiene uno separando `displayName`, ni se activa desde `users.nombre`, Auth o correo por defecto. La alternativa recomendada no muestra correo: entrega nombre, apellido, `candidateKind=ACCOUNT_WITHOUT_PERSON` y referencia opaca. Exponer un correo exige selección de correo verificado y consentimiento adicional.

Crear desde esa referencia debe coordinar ausencia de Persona con `ensureMyPerson`, revalidar consentimiento y crear Persona administrativa + Membresía sin assignment ni vínculo automático. El índice combinado necesita presupuesto, rate limits, protección contra enumeración, expiración de referencias, retención y reconciliación. Hasta cerrar esas decisiones su estado es `NO LISTO`.

## 9. Cortes normativos

| Corte | Estado normativo |
| --- | --- |
| IUX-11A | `CERRADO; UAT HUMANA APROBADA` |
| IUX-11A.1 | `CERRADO; UAT HUMANA APROBADA` |
| Directorio Cuenta sin Persona | `SEPARADO; NO LISTO` |
| IUX-11B | `CERRADO; UAT FUNCIONAL APROBADA; MANTENIMIENTO UAT INTEGRADO EN acc7b263` |
| IUX-11C | `DEFINIDO; LISTO PARA IMPLEMENTAR POR CORTES CON AUTORIZACIÓN SEPARADA` |
| IUX-11D | `DIFERIDO` |

El cierre de A/A.1 no autorizó B/C/D. D5-087 cerró la implementación y UAT funcional de B; configuración, backfill remoto y habilitación productiva siguen requiriendo autorización separada. C/D y fusión permanecen pendientes.

## 10. Decisiones adoptadas, propuestas y pendientes

### 10.1 Adoptadas para IUX-11A

- custodia por Owner vigente, transferible con ownership y conservada al archivar;
- creación con Grupo activo/Temporada abierta; corrección de no vinculada en activo o archivado;
- delete bloqueado por Membresía/custodia; ausencia anómala `ORPHANED_CUSTODY` sin autoridad residual;
- recuperación atómica/idempotente de creación y corrección;
- economía sin ampliación de permisos o estados vigentes.

Para IUX-11A.1 quedó implementada y aprobada la lectura histórica de Invitaciones y cancelación de pendientes por el Owner vigente en Grupo archivado, con reader/backend y regresión de autorización.

### 10.2 Adoptadas para IUX-11B

- **Ahora no** cierra sin suspender ni retirar candidatura;
- rechazo por Cuenta + Persona sobrevive cambios/ida-vuelta y sólo reconsideración lo retira;
- adopción sólo sin Persona y de forma atómica;
- con Persona, reconocimiento pendiente conserva candidatura, custodia y permisos y obliga revalidación futura;
- carrera con `ensureMyPerson` no puede producir efectos parciales ni dos principales;
- Auth/Admin, páginas/presupuestos/rate limits, configuración/UAT y compatibilidad simple quedan cerrados por §§5.2–6.6.

No queda propuesta B pendiente.

### 10.3 Adoptadas para IUX-11C

- elección informada de principal y elección separada de Membresía ganadora;
- conservación de Personas, referencias históricas, obligaciones, Pagos e historia;
- conservación de participaciones compatibles;
- finalización canónica de la Membresía perdedora con motivo **Fusión de fichas** sin extinguir deuda;
- autorización y restricciones self sobre todas las Personas consolidadas;
- revisión disponible aunque Grupo esté archivado, Temporada cerrada o Membresía finalizada;
- exclusión de correo externo y directorio de Cuentas sin Persona.
- C-N1: principal en superficies vigentes/búsqueda y nombres originales en historia/auditoría;
- C-F1: identidad 1..N con revalidación integral en cada fusión;
- C-A1: admisiones compatibles se conservan y colisiones se resuelven/terminalizan por writers canónicos con confirmación explícita;
- C-C1: grants válidas permanecen, anchor finalizado caduca, self-conflict se revoca y no hay transferencia automática;
- sin notificación dedicada al Owner en C; motivo/trazabilidad consultables;
- preview de 24 horas, revalidación al confirmar y retención categorizada sin conservar copia completa como auditoría.

### 10.4 Estado y autorizaciones restantes

No queda bloqueo funcional para C0. C0–C2 son preparación técnica invisible y deshabilitada para usuarios; C3 incorpora superficie/UAT. C4 —materialización remota, configuración, índices, housekeeping y habilitación— requiere autorización productiva específica.

### 10.5 Pendientes del directorio ampliado

- decidir si se muestra correo verificado consentido o sólo nombre/apellido;
- fijar invalidación frente a creación propia concurrente;
- definir retención/borrado de preferencia y evidencia;
- decidir recurso separado frente a evolución de preferencia IUX-10;
- presupuestar índice combinado y mitigación de enumeración.

## 11. Criterios de salida

1. correo opcional sin unicidad ni inferencia de Cuenta;
2. Persona/Membresía/economía administrativas correlacionadas y recuperables;
3. candidatura interna visible a Cuenta creada posteriormente;
4. corrección retira candidatura anterior y aceptación relee revisión;
5. archivo/cierre/finalización no bloquean reconocimiento;
6. una principal visible con raíces originales trazables;
7. duplicate active resuelto sólo por elección y finalización canónica;
8. obligaciones/Pagos intactos y accesibles;
9. contador, búsqueda, Solicitudes, Invitaciones y capabilities compatibles;
10. carreras y fallos parciales acreditados sin segunda autoridad.
11. custodia contextual, archivo, bloqueo de delete y `ORPHANED_CUSTODY` acreditados antes de autorizar A.

IUX-11A/A.1 e IUX-11B permanecen cerrados; `acc7b263` es la base integrada verificada. D5-088 adopta las decisiones de C y permite planificar implementación por cortes con autorización separada. Correo externo y directorio de Cuentas sin Persona quedan fuera. Esta revisión no autoriza código, configuración, índices, secrets, backfill, migración, commit, push, despliegue, cambios de datos UAT ni habilitación productiva.
