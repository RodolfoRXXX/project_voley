# IUX-11 — Fichas administrativas, vinculación y fusión

## Estado de la ficha

- **Estado general:** `IUX-11A/A.1 E IUX-11B CERRADOS CON UAT FUNCIONAL APROBADA; IUX-11C0 CERRADO TÉCNICAMENTE EN LOCAL COMO PREPARACIÓN INTERNA; IUX-11C1–C4 PENDIENTES CON AUTORIZACIÓN SEPARADA; FUSIÓN NO ENTREGADA; CORREO EXTERNO Y DIRECTORIO AMPLIADO FUERA DE ALCANCE`.
- **Fecha:** 27 de noviembre de 2026.
- **Base:** `dev@acc7b263195ba7c05ce1362e76da306602a0b2c7`, idéntica a `origin/dev` después de `fetch origin dev` el 26 de noviembre de 2026.
- **Etapa:** interetapa IUX entre E3 y E4.
- **Identificador:** `IUX-11`.
- **Decisión documental:** `D5-083`, refinada por `D5-084` a `D5-088`; D5-088 adopta C-N1, C-F1, C-A1, C-C1, ausencia de aviso dedicado y preview de 24 horas; D5-089 registra el cierre técnico local de C0.
- **Relevamiento:** `IUX-11-relevamiento-fichas-administrativas-vinculacion-fusion.md`.
- **Addendum:** `docs/arquitectura/Documento-1-1.5-2-3-4-addendum-IUX-11-fichas-administrativas-vinculacion-fusion.md`.
- **Cierres aprobados:** A/A.1, definición `5f01f61`, implementación/pruebas `6703034` y BUILD_ID `gdZvN1YTNPMteaRxngA6N`; B, implementación `35e33a6`, cierre `87ff812`, BUILD_ID funcional `FR-tYzB5t0m4TKc_fpDKo` y mantenimiento UAT integrado en `acc7b263`; C0, definición `fa79e6a` e implementación/pruebas `75f1219`. Sin integración a `dev`, despliegue, backfill remoto ni cambios de datos UAT para C0.

## 1. Objetivo

Permitir alta administrativa de una Persona sin Cuenta, su incorporación y gestión económica; ofrecer después una vinculación interna por coincidencia con correo verificado; y, cuando la Cuenta ya tenga Persona, consolidar ambas raíces bajo una única ficha principal visible sin perder la trazabilidad de Membresías, Períodos, obligaciones, Pagos, auditoría ni capabilities válidas.

## 2. Alcance por corte

| Corte | Resultado | Estado |
| --- | --- | --- |
| IUX-11A.1 | Modal, edición acreditada por fila, caja con pestañas, No integrantes, Invitaciones y reincorporación canónica | **CERRADO; UAT HUMANA APROBADA** |
| IUX-11A | Owner crea/corrige ficha no vinculada con correo opcional, la incorpora a Temporada abierta y gestiona su economía | **CERRADO; UAT HUMANA APROBADA** |
| IUX-11B | Cuenta encuentra dentro de Ficha personal candidaturas por correo verificado, cierra/rechaza/reconoce una revisión y adopta una ficha cuando no tiene Persona | **CERRADO; UAT FUNCIONAL APROBADA** |
| IUX-11C0 | Núcleo de identidad singular compatible, dual-write atómico e inspección/materialización sólo local | **CERRADO TÉCNICAMENTE EN LOCAL; PREPARACIÓN INTERNA** |
| IUX-11C | Cuenta con Persona preexistente compara el conjunto, elige principal, resuelve Membresías activas duplicadas y conserva acceso histórico | **LISTO PARA IMPLEMENTAR POR CORTES; REQUIERE AUTORIZACIÓN SEPARADA** |
| IUX-11D | Aviso por correo y operación de entrega | **DIFERIDO** |

## 3. IUX-11A — primer corte

### 3.1 Recorrido

1. Owner vigente entra a Integrantes y elige **Crear integrante**.
2. Carga nombre, apellido y correo opcional.
3. Backend revalida Cuenta, ownership, Grupo activo y Temporada abierta.
4. Crea Persona administrativa, custodia e intent idempotente.
5. Invoca el writer canónico de Membresía con origen `ADMINISTRATIVE_PROFILE_CREATION`.
6. Confirma primer Período, active/lifecycle guards, contribución, contador y búsqueda.
7. La ficha aparece en Integrantes y puede recibir obligaciones y Pagos.
8. Mientras siga sin asignación a Cuenta, la autoridad administrativa puede corregir datos. La corrección mantiene proyecciones y auditoría.

La autoridad administrativa es el Owner vigente del Grupo custodio, incluso si el Grupo está archivado. `createdByAccountId` sólo conserva auditoría. Una transferencia futura cambia la autoridad contextual sin reescribir Persona/custodia.

### 3.2 Precondiciones exactas

**Crear** exige:

- Cuenta canónica autenticada;
- `groups/{groupId}` compatible, activo y con actor como Owner vigente;
- exactamente una Temporada abierta acreditada por guard;
- payload nominal válido, correo ausente o válido e idempotency key nueva/compatible;
- ausencia de receipt/raíces incompatibles para la operación.

**Corregir** exige:

- Cuenta canónica y actor igual al Owner vigente de `custodianGroupId`;
- Persona administrativa existente, custodia `UNLINKED`, revisión exacta y sin coordinación de vínculo/fusión;
- Grupo custodio activo o archivado; no requiere Temporada abierta ni Membresía activa;
- cambio nominal/correo válido y comando idempotente.

**Gestionar economía** no es una autorización nueva: cada concepto, obligación, Pago, entrega o recibo conserva actor, estado del Grupo/Temporada, Membresía y capability de su contrato vigente.

### 3.3 Contratos propuestos

```ts
createAdministrativePersonMembership({
  groupId,
  firstName,
  lastName,
  contactEmail?,
  idempotencyKey
})

getAdministrativePersonForOwnedGroup({ groupId, personRef })

updateAdministrativePersonForOwnedGroup({
  groupId,
  personRef,
  firstName,
  lastName,
  contactEmail?,
  expectedRevision,
  idempotencyKey
})

getAdministrativePersonCreationResult({ groupId, operationRef })

getAdministrativePersonCorrectionResult({ groupId, operationRef })
```

Payloads son cerrados. `personId`, `seasonId`, estado de vínculo, actor y timestamps se derivan. `personRef` no autoriza por posesión.

### 3.4 Custodia, archivo y eliminación

- Custodia sigue al Owner vigente. El Owner anterior pierde corrección al confirmar transferencia; una respuesta tardía falla autorización/revisión.
- Archivo conserva Grupo, Owner, Persona, Membresía e historia. El Owner puede corregir la ficha no vinculada y B futuro puede vincularla; archivo no habilita nuevas obligaciones contrarias a contratos económicos vigentes.
- E2-24 ya impide eliminar un Grupo con cualquier Membresía y un Grupo archivado. IUX-11A agrega custodia/Persona administrativa a la evaluación defensiva de referencias. Por diseño no existe eliminación válida del Grupo custodio.
- Si el Grupo falta por corrupción, importación incompatible o bypass externo, la custodia queda `ORPHANED_CUSTODY`: nadie puede corregir por ser creador, Owner histórico, app admin o conocer IDs. La ficha, Membresías y economía permanecen.
- Recovery de `ORPHANED_CUSTODY`: reparación operacional correlacionada restaura raíz/custodia válida sin editar datos personales, o B futuro vincula al titular por correo vigente. Hasta entonces sólo lectura histórica autorizada y conservación; no se inventa Owner.

### 3.5 Reglas y recuperación

- Correo ausente es válido y no crea candidatura.
- Correo repetido es válido y no busca/deduplica Personas.
- La transacción inicial no depende de que exista una Cuenta con ese correo.
- Intent determinista reserva `personId`, `membershipId`, Grupo, Temporada, actor y request hash.
- El commit canónico crea Persona, custodia, Membresía, primer Período, guards, contribución, contador, búsqueda y receipt de manera atómica.
- Una creación recuperada devuelve la misma Persona/Membresía; respuesta perdida relee receipt. Ausencia total reintenta; correlación parcial/diferente falla `INCOMPATIBLE_STATE` y nunca crea dos raíces.
- Corrección relee ownership, custodia, ausencia de vínculo y expected revision; actualiza Persona, revisión, proyección nominal y receipt en un commit. Retry exacto recupera; payload distinto conflictúa.
- Corrección pierde autorización cuando una asignación de identidad adquiere `LINKING/MERGING/LINKED`.
- La gestión económica usa los contratos Owner existentes por `membershipId`; no requiere Cuenta titular.

### 3.6 Exclusiones de A

- candidatura en Mi perfil;
- adopción o fusión;
- correo externo;
- edición por titular;
- implementar transferencia o cambiar CU-015; A sólo fija compatibilidad y barrera de referencias;
- cambio de obligaciones, Pagos o capabilities.

### 3.7 Aceptación mínima

1. correo ausente/presente y dos fichas con igual correo;
2. Owner sin Persona;
3. grupo/temporada/ownership incompatibles sin efectos;
4. retry, respuesta perdida y concurrencia con igual/distinta clave;
5. Persona + Membresía + Período + guards + contador + búsqueda correlacionados;
6. obligación y Pago administrativos sobre la Membresía sin Cuenta;
7. corrección actualiza nombre/búsqueda y correo opcional sin romper economía;
8. Rules deny-all y ausencia de PII en logs;
9. `visuals/` y datos ajenos preservados.
10. transferencia simulada autoriza sólo al Owner nuevo; archivo conserva corrección; delete queda bloqueado por Membresía/custodia.
11. raíz Grupo ausente produce `ORPHANED_CUSTODY`, conserva historia y no concede autoridad residual.

## 4. IUX-11B — candidatura y adopción

### 4.1 Recorrido y estados visibles

1. **Mi perfil → Ficha personal** obtiene del backend las fichas administrativas cuyo correo vigente coincide con el correo primario verificado de la Cuenta. Una ficha sin correo no crea candidatura. Varias fichas con el mismo correo se presentan por separado.
2. Antes de decidir, cada tarjeta muestra nombre, apellido, correo coincidente enmascarado, Grupo de procedencia y la participación más reciente —Grupo, Temporada y estado— más un indicador si existe más historia. No muestra importes, Pagos, deuda, IDs internos ni datos de otras Personas.
3. **Ahora no** cierra la revisión abierta sin crear rechazo, diferimiento, cooldown ni fecha de reaparición. La candidatura sigue disponible y puede volver a abrirse de inmediato desde Ficha personal.
4. **Esta ficha no es mía** registra rechazo estable para `accountId + personId`, retira la sugerencia principal y la conserva en **Reconsiderar fichas descartadas**. Cambiar, quitar o agregar correo incrementa `candidateEmailRevision` y vuelve stale previews/reconocimientos anteriores, pero no elimina ese rechazo; una ida y vuelta tampoco reactiva la sugerencia. Sólo **Reconsiderar** la habilita otra vez. Nombre/apellido cambian únicamente la revisión nominal.
5. **Reconocer ficha** abre confirmación y vuelve a leer acreditación de correo, Persona, custodia, candidatura, revisiones, identidad de Cuenta y assignment. Grupo archivado, Temporada cerrada o Membresía finalizada se muestran como contexto y nunca bloquean.
6. Si la Cuenta no tiene Persona, **Aceptar y usar esta ficha** adopta la Persona administrativa como principal. En un único commit fija `users.personaId`, assignment único por Persona, custodia `LINKED`, retiro de candidatura, decisión/receipt y revocación de edición administrativa.
7. Si la Cuenta ya tiene Persona, B no fusiona ni cambia principal. Permite **Reconocer para fusionar** y guarda `RECOGNIZED_PENDING_MERGE` como reconocimiento e intención. Conserva candidatura, custodia, edición administrativa y todos los permisos vigentes; no crea assignment ni reserva la ficha. La pantalla explica: “Ya tenés una ficha personal. Para conservar ambas historias, esta ficha se incorporará mediante Fusión de fichas cuando esa función esté disponible”. IUX-11C deberá revalidar correo, revisión, identidad, titularidad, custodia y manifest antes de cualquier efecto.

Consecuencia para el usuario: quien no tiene ficha puede adoptarla inmediatamente; quien ya tiene una no pierde datos ni queda atrapado en una fusión implícita y encuentra la candidatura reconocida en **Pendiente de fusión** cuando C se habilite.

### 4.2 Autoridad de correo y actualización

- La fuente autoritativa es el registro actual de Firebase Authentication leído en servidor con Admin SDK: sólo su correo primario con `emailVerified == true`. El claim del token autentica la llamada, pero no acredita por sí solo un correo; `users.email`, Persona y datos enviados por cliente son proyecciones/no autoridad.
- Cada listado, detalle, decisión y consulta de resultado relee Auth. El backend normaliza el correo, deriva `emailLookup` con HMAC y reconcilia `accountVerifiedEmailCredentials/{accountId}` con `emailRevision`, fingerprint HMAC, `firstObservedVerifiedAt/observedAt` y `keyVersion`. Cambio, desverificación o ausencia incrementan revisión, invalidan cursores/previews y retiran resultados anteriores en la siguiente operación autenticada.
- La aceptación exige una observación Auth fresca dentro de la propia solicitud; si Admin Auth no está disponible falla cerrado y no adopta. La UI pide renovar sesión sólo ante credenciales demasiado antiguas o revocadas.

Consecuencia para el usuario: cambiar o desverificar el correo deja de ofrecer las candidaturas anteriores sin depender de una copia atrasada en `users`; una sesión vieja nunca alcanza para apropiarse de una ficha.

### 4.3 Consulta, detalle, presupuesto y rate limits

```text
listMyAdministrativePersonLinkCandidates({ pageSize?, cursor?, bucket? })
getMyAdministrativePersonLinkCandidate({ candidateRef })
rejectMyAdministrativePersonLinkCandidate({ candidateRef, expectedEmailRevision, idempotencyKey })
reconsiderMyAdministrativePersonLinkCandidate({ candidateRef, expectedDecisionRevision, idempotencyKey })
recognizeMyAdministrativePersonLinkCandidate({ candidateRef, expectedEmailRevision, previewToken, idempotencyKey })
getMyAdministrativePersonLinkDecisionResult({ operationRef })
```

- `bucket` es `PENDING | REJECTED | PENDING_MERGE`; default `PENDING`. **Ahora no** no cambia bucket. Página default y máxima 10; query `limit(11)` por `updatedAt desc, candidateEntryId desc`; cursor firmado ligado a Cuenta, revisión de correo, bucket, orden, ancla y versión de clave.
- Cada página usa una lectura Admin Auth y hasta 24 lecturas Firestore: 1 credencial, 11 candidaturas con lookahead, 10 decisiones y 2 buckets de rate limit. Puede devolver menos de diez al filtrar rechazadas; el cursor avanza por la última candidatura inspeccionada y no abre barridos para rellenar.
- **Actualizar** descarta cursor, vuelve a primera página, relee Auth y consume una solicitud completa con el mismo presupuesto y rate limits. Continuar página también consume una solicitud. Atrás/Adelante o re-render sin llamada no consumen; no hay prefetch, polling ni refresh por foco.
- Detalle/preview: 1 lectura Admin Auth y máximo 9 lecturas Firestore —8 raíces/contextos + 1 bucket—. Rechazar, reconsiderar, reconocer o adoptar: máximo técnico 12 lecturas Firestore por intento nuevo. Recuperar un receipt confirmado no consume el límite de escritura.
- Rate limits persistidos y verificables, reutilizando el patrón IUX-10: listado `30/cuenta/minuto` y burst `10/cuenta/10 segundos`; detalle/decisiones `12/cuenta/minuto`; adopción nueva `6/cuenta/minuto`. Exceso devuelve `RESOURCE_EXHAUSTED` sin escribir dominio y conserva cursor/formulario.

Consecuencia para el usuario: la pantalla carga por páginas estables, explica qué ficha se está evaluando y evita una espera que crezca con toda su historia; el detalle puede refrescarse si cambió el contexto.

### 4.4 Concurrencia, adopción y recuperación

- B reutiliza `users/{accountId}.personaId` como barrera de principal para adopción simple. La transacción lee receipt, Usuario, Persona, custodia, candidatura/revisión, decisión y `personAccountAssignments/{personId}`; si Usuario sigue sin Persona y guard está libre, confirma juntos `users.personaId`, assignment único, custodia `LINKED`, retiro de candidatura, decisión `ADOPTED` y receipt. No introduce `accountIdentities` en B.
- Evidencia vigente: `ensureMyPerson` ya lee/escribe `users.personaId` en la transacción que crea Persona. Si adopción gana, `ensureMyPerson` reintenta y devuelve la Persona adoptada; si alta propia gana, adopción reintenta, observa principal y aborta sin escribir. Dos adopciones de una Cuenta compiten por Usuario; dos Cuentas por una ficha compiten además por assignment/custodia. Un único commit impide adopción parcial.
- Dos Cuentas que aceptan la misma ficha: sólo una crea `personAccountAssignments/{personId}`; la otra recibe `ALREADY_CLAIMED` sin conocer la Cuenta ganadora.
- Corrección de correo y aceptación escriben/releen la misma custodia + `emailRevision`. Si corrige primero, retira inmediatamente la candidatura anterior y la aceptación falla `CANDIDATE_STALE`; si adopta primero, cambia a `LINKED`, revoca edición administrativa y la corrección falla cerrada. No existe orden en el que ambas confirmen.
- Confirmar usa `previewToken`, `expectedEmailRevision` e `idempotencyKey`. Receipt determinista liga actor, candidato y request hash; retry exacto devuelve el mismo resultado, clave con payload distinto conflictúa y `operationRef` recupera respuesta perdida. No se necesita outbox para autoridad B: todos sus efectos caben en el commit.
- Rechazo/reconsideración se identifican por Cuenta + Persona y sobreviven revisiones de correo; reconocimiento pendiente liga revisión observada y queda stale al cambiarla. Todos usan revision/idempotency key. **Ahora no** no es comando de dominio.

### 4.5 Compatibilidad limitada a adopción simple

- Persona, `personId`, Membresías, Períodos, obligaciones, Pagos y procedencia no se reescriben. `users.personaId` sigue siendo la única principal de B; `accountIdentities`, múltiples assignments y autorización multi-Persona pertenecen a C.
- Padrón, contador y búsqueda conservan IDs y presentación; no requieren reproyección. La Cuenta accede a consultas propias/economía por el vínculo legacy ya soportado. Adopción no reactiva Membresía ni abre Temporada.
- El Owner conserva las facultades organizativas/económicas que ya autoriza cada contrato sobre Grupo y Membresía, pero pierde corrección nominal administrativa. El titular obtiene edición de su ficha principal. Adoptar no concede ownership, rol, Membresía activa ni capability; cualquier capability se concede y revalida por su flujo vigente.

Lectores existentes sin cambio de contrato, pero con regresión obligatoria sobre una Persona administrativa adoptada: `firestoreSelfPersonReader/getMyPerson`; `ownMembershipHistoryPersonCapability`; `activeGroupMemberPersonCapability`; Invitaciones `ownPerson/ownDirectoryPerson`; pagos/obligaciones propias de `firestorePaymentStore`; avisos/aplicaciones de `firestorePaymentDeliveryStore`; registrados de `firestoreAdministrativeReceiptStore`; self-exit de Membresía; y `treasuryAccountIdentityCapability`. Todos derivan una Persona desde `users.personaId`, que B completa atómicamente.

Sólo son nuevos los lectores B de candidaturas, detalle, descartadas y pendientes de fusión. Ningún lector SUBJECT se amplía a conjuntos de Personas; guards, capabilities y economía multi-raíz quedan en C.

### 4.6 Configuración, backfill, retención y outbox

| Pieza | Decisión B | Justificación/evidencia | Momento |
| --- | --- | --- | --- |
| App Check | no es precondición de B ni UAT local | el repositorio no usa `enforceAppCheck` en callables v1; Auth + backend + Rules deny-all son la frontera vigente | gate transversal productivo cuando el proyecto lo adopte |
| Flag | `ENABLE_IUX11B_LINKING`, default `false`; backend/UI fallan cerrado | reutiliza `ENABLE_DASHBOARD_TASK_PROJECTION` | implementación, UAT y rollout |
| Secretos | `IUX11B_EMAIL_HMAC_SECRET` e `IUX11B_CURSOR_SECRET`; faltante fuera de emulator falla dependencia | IUX-10/IUX-11A ya usan cursor secrets; B elimina fallback aleatorio productivo | pruebas fijas en UAT; secretos administrados antes de producción |
| Backfill | reconciliador determinista para custodias A `UNLINKED` con correo; inspect/apply, cursor/manifiesto, idempotente, sin tocar Persona/Membresía | reutiliza scripts emulator-only y `--confirm-rollout` | obligatorio sobre fixture UAT; ejecución remota es autorización productiva separada |
| Retención | rechazo mínimo sin PII de correo/nombre persiste hasta reconsideración o borrado de Cuenta; candidatura sólo mientras correo + `UNLINKED`; receipts sin TTL automático v1 | rechazo debe sobrevivir ida/vuelta; no hay política TTL común de receipts | parte de B; purga/TTL global futura es transversal |
| Outbox | no se agrega | B no cambia IDs/presentación y confirma toda autoridad en un commit | C decidirá outbox para reproyección multi-Persona |

UAT local reproducible: Emulator aislado; flag `true`; secretos de prueba fijos no productivos; Auth Emulator con `emailVerified`; fixture/backfill determinista; reloj controlado para rate limits; índices declarados; reconstrucción desde cero y manifest/medición de lecturas como evidencia. Ningún secreto productivo se versiona.

| Decisión adoptada | Regla final | Consecuencia para el usuario |
| --- | --- | --- |
| **Ahora no** | cierra la revisión; candidatura inmediatamente disponible, sin persistir suspensión | puede salir sin rechazar y volver cuando quiera |
| **Esta ficha no es mía** | retira sugerencia; opción secundaria permite reconsiderar | no insiste en la vista principal y la decisión no es irreversible |
| Revisión/rechazo | correo cambia revisión, pero rechazo por ficha/destinatario sólo sale por Reconsiderar | ida/vuelta no vuelve a sugerir una ficha descartada |
| Cuenta con Persona | `RECOGNIZED_PENDING_MERGE` conserva candidatura, custodia y permisos; C revalida todo | puede expresar intención sin que B fusione o quite autoridad existente |
| Carrera con alta propia | adopción es todo-o-nada y existe como máximo una principal | no queda una ficha parcialmente adoptada ni dos fichas principales |

**Estado de cierre B (26 de noviembre de 2026):** `IMPLEMENTADO; UAT FUNCIONAL APROBADA`. La aprobación corresponde al BUILD_ID `FR-tYzB5t0m4TKc_fpDKo` probado en `demo-sportexa-iux11b-uat`; los ajustes visuales se difieren a un corte posterior. La evidencia automatizada posterior cubre adopción, rechazo, reconsideración, respuesta perdida, carrera con `ensureMyPerson`, dos aceptaciones, corrección concurrente del correo, exclusividad y revocación de edición administrativa. No hubo despliegue ni backfill remoto. Flag, secretos, índice desplegado y backfill productivo continúan como gates de habilitación, y IUX-11C/correo externo permanecen pendientes.

## 5. IUX-11C — fusión

### 5.1 Precondición y alcance exactos

C parte de una decisión B vigente `RECOGNIZED_PENDING_MERGE`. Al preparar y al confirmar relee Cuenta, correo primario verificado, candidatura y `emailRevision`, Persona candidata, custodia `UNLINKED`, assignment inverso, identidad y todas sus Personas, no sólo la principal. Grupo archivado, Temporada cerrada o Membresía finalizada no bloquean la revisión; sólo cambian lo que se presenta y qué writers pueden actuar.

La fusión preserva `personId`, `membershipId`, Períodos, Solicitudes, Invitaciones, obligaciones, Pagos y auditoría. No incorpora correo externo ni Cuentas sin Persona. Elegir principal y elegir la Membresía ganadora de cada conflicto son controles separados.

### 5.2 Preview obligatorio y paginado

`prepareMyPersonMerge` crea o recupera un manifest sellado. La UI no confirma hasta que su cobertura sea `READY` y muestra:

1. todas las Personas de la identidad más la candidata, nombre original, procedencia, estado de custodia y cuál es hoy principal;
2. selector de nueva principal, independiente de los conflictos de Membresía;
3. Membresías activas compatibles y conflictos exactos por `groupId + seasonId`; por cada conflicto exige elegir la que continúa y anticipa que la otra se finaliza con motivo **Fusión de fichas**;
4. historia preservada por Persona/Membresía, cantidad de Períodos y enlaces contextuales, sin sumar ni presentar como un único saldo obligaciones o Pagos de raíces distintas;
5. Solicitudes e Invitaciones pendientes agrupadas por Grupo/Temporada y el outcome propuesto para cada una;
6. capabilities: `RETAINED`, `LAPSED_WITH_MEMBERSHIP` o `REVOKE_SELF_CONFLICT`, con anchor y Grupo visibles;
7. nombre de la principal que usarán las vistas vigentes y la búsqueda, y aviso de que historia/auditoría conservan el sujeto y nombre originales;
8. efectos administrativos: fin de corrección nominal por Owner, conservación de facultades sobre sus recursos y ausencia de veto sobre la identidad;
9. manifest revision, vencimiento, estado de reproyección y advertencia de que, una vez iniciada la confirmación, cerrar la pantalla o perder la respuesta no reactiva una Membresía ya finalizada.

Personas, Membresías, admisiones y capabilities se presentan en páginas de 20 con cursor firmado ligado a `accountId`, `identityRevision`, `mergeId`, digest, sección y orden. Cada página usa `limit(21)` y no se interpreta una página vacía como cobertura completa si el manifest sigue preparándose.

### 5.3 Contratos cerrados de interfaz

```ts
prepareMyPersonMerge({ candidateRef, expectedEmailRevision, idempotencyKey })
getMyPersonMergePreview({ mergeRef, section, pageSize?, cursor? })
confirmMyPersonMerge({
  mergeRef,
  manifestRevision,
  expectedConsequenceDigest,
  primaryPersonRef,
  membershipChoices: [{ conflictRef, retainedMembershipRef }],
  admissionChoices: [{ conflictRef, retainedAdmissionRef? }],
  idempotencyKey
})
getMyPersonMergeResult({ operationRef })
```

`prepare` devuelve `mergeRef`, `manifestRevision`, `consequenceDigest`, `preparedAt`, `expiresAt` y cobertura; las páginas devuelven items, `nextCursor` y la misma revisión/digest. El digest cubre Personas, principal propuesta, Membresías preservadas/finalizadas, admisiones conservadas/terminalizadas y capabilities retenidas/caducadas/revocadas. Confirmar con ese digest constituye aceptación conjunta de todas las consecuencias mostradas, aunque sólo principal, Membresías ganadoras y admisiones colisionadas sean elecciones.

Los refs son opacos; el backend deriva IDs, Cuenta, conjunto, conflictos y consecuencias. Confirmación exige elecciones completas y exactas, rechaza extras y no recibe nombres, estados, razones ni importes desde cliente. Siempre relee fuentes autoritativas; token vencido devuelve `PREVIEW_EXPIRED`, cambio compatible exige nuevo preview con `MANIFEST_STALE`, conflicto de assignment devuelve `ALREADY_CLAIMED`, coordinación activa `MERGE_IN_PROGRESS` y divergencia `INCOMPATIBLE_STATE`. Un retry con la misma clave y request hash recupera el mismo resultado; la misma clave con otro payload devuelve `IDEMPOTENCY_CONFLICT`.

### 5.4 Autoridad, exclusividad y estado transitorio

- `accountIdentities/{accountId}` es autoridad de principal y revisión; `users.personaId` queda como proyección compatible.
- `personIdentityAssignments/{personId}` es guard inverso: una Persona pertenece como máximo a una Cuenta. Adopciones B existentes se incorporan mediante lazy adoption/backfill verificable antes de habilitar C.
- Al confirmar, un primer commit fija `activeMergeId`, marca identidad `MERGING`, adquiere el guard inverso de la candidata, crea su assignment `PENDING_MERGE`, sella elecciones y consume la intención B. Las Personas ya asignadas están protegidas por la identidad/`activeMergeId`; locks auxiliares se acreditan por lotes antes del primer efecto irreversible. Otra Cuenta, otro merge o una corrección administrativa pierden la carrera sin efectos parciales.
- Desde ese commit, todas las Personas adquiridas cuentan como **propias** para restricciones de auto-revisión, auto-validación y actuación económica como tercero. Los readers SUBJECT pueden leerlas; edición nominal y presentación siguen usando la principal anterior hasta el commit final.
- Writers que pueden cambiar el manifest —admisión, reactivación, renovación, finalización, cambio de principal o capability afectada— fallan `MERGE_IN_PROGRESS`. Operaciones económicas sobre obligaciones existentes pueden continuar si revalidan assignment/identity revision y no violan self.
- El commit final activa assignments, elige principal, actualiza `users.personaId`, cambia custodia a `MERGED`, registra outbox y vuelve la identidad a `READY`. No reescribe raíces históricas.

### 5.5 Membresías, admisiones y capabilities

Participaciones compatibles se conservan. Cada duplicado activo en igual Grupo/Temporada se resuelve mediante el writer canónico de Membresía, con receipt por conflicto, `origin: PROFILE_MERGE`, `mergeId` y motivo público **Fusión de fichas**. Ese writer cierra el Período, guards, contribución, contador, padrón y búsqueda exactamente una vez. La deuda y los Pagos de la perdedora permanecen.

Para Solicitudes/Invitaciones rige C-A1: conservar las compatibles; si ya existe activa consolidada en el mismo Grupo/Temporada, mostrar y terminalizar la admisión redundante sin aceptarla; si hay varias pendientes y ninguna activa, el usuario elige una y las demás se terminalizan. La confirmación incluye esas consecuencias. Cada recurso conserva `personId` y un resultado terminal canónico `IDENTITY_CONSOLIDATED`, receipt y auditoría. C no puede borrar guards ni cambiar estados directamente: invoca writers propios idempotentes.

Para capabilities rige C-C1:

- se conserva una grant sólo si revalida Cuenta, assignment, `grant.personId`, Membresía/anchor, slot, ownership revision, Grupo y Temporada;
- anchor de Membresía finalizada pasa a `LAPSED` por el mecanismo vigente;
- si la consolidación convierte al actor en sujeto propio de la operación económica, la grant se revoca canónicamente con `PROFILE_MERGE_SELF_CONFLICT`, receipt y auditoría, aunque su anchor continúe;
- no se traslada una grant a otra Persona o Membresía y nunca se elimina su historia.

### 5.6 Presentación y permisos administrativos

C-N1 fija nombre/apellido de la principal en ficha vigente, padrón activo, búsqueda y directorio opt-in; recursos históricos y auditoría conservan la Persona y el nombre original, y pueden añadir “actualmente consolidada como …”. Cambiar principal reproyecta superficies vigentes sin reescribir snapshots históricos.

El Owner conserva únicamente permisos vigentes sobre Grupo, Membresía y economía. Ve la principal en vistas operativas y el sujeto original donde la trazabilidad lo exige. No puede elegir/cambiar principal, editar una Persona consolidada, separar assignments, consultar el conjunto de identidad fuera de sus recursos, vetar la fusión ni reactivar la Membresía perdedora. La corrección administrativa termina al adquirir el assignment. C no agrega aviso externo ni notificación dedicada al Owner; la finalización, el motivo **Fusión de fichas** y la trazabilidad quedan consultables por contratos ya autorizados.

### 5.7 Fusiones sucesivas y tercera ficha

C-F1 establece identidad 1..N. Una tercera ficha entra por otra decisión `RECOGNIZED_PENDING_MERGE`; el nuevo manifest incluye todo el conjunto vigente más la candidata, revalida conflictos y permite volver a elegir principal. No se fusionan “dos contra dos” ni se crea una cadena de aliases. Locks por Persona y `activeMergeId` impiden manifests solapados.

### 5.8 Lecturas, proyecciones, índices y presupuesto

No se permite un `IN` global ni una consulta por Persona desde frontend. La capa `IdentitySubjectAuthorization` ofrece `getPrincipalPerson`, `assertPersonInIdentity`, `resolveAccountForPerson` y páginas de assignments. Los readers por `membershipId` conservan el contrato y cambian sólo la autorización. Lectores globales propios —grupos actuales, historial, economía global, Solicitudes e Invitaciones— requieren una proyección por Cuenta/identidad ordenable y cursor ligado a `identityRevision`; el registro original sigue siendo autoridad y se relee antes de escribir.

Índices candidatos, sujetos a construcción y medición en el corte correspondiente:

| Consulta | Índice mínimo |
| --- | --- |
| assignments de identidad | `personIdentityAssignments: accountId ASC, assignmentState ASC, personId ASC` |
| Membresías del manifest | `memberships: personId ASC, estado ASC, groupId ASC, seasonId ASC, __name__ ASC` o proyección equivalente por identidad |
| Solicitudes propias consolidadas | `groupJoinRequests: identityAccountId ASC, estado ASC, createdAt DESC, __name__ DESC` en proyección, no en raíz |
| Invitaciones propias consolidadas | `groupInvitations: identityAccountId ASC, status ASC, createdAt DESC, __name__ DESC` en proyección |
| búsqueda/padrón | índice vigente de `activeRosterSearchEntries`; sólo cambian tokens, `sortName` y principal revision |

Presupuesto por unidad: principal/`assertPersonInIdentity`, máximo 3 lecturas; página de 20 assignments, 22; página de manifest, 21 más hasta 20 relecturas de raíces sólo durante preparación; confirmación inicial, máximo 20 lecturas y escrituras entre identidad, candidata, guard, assignment, intención y manifest; acreditación auxiliar posterior, lotes máximos de 20; cada finalización conserva el presupuesto del writer canónico y receipt propio; `getResult`, máximo 3. El presupuesto total de preparar crece con Personas/recursos, pero cada paso es acotado, observable y reanudable. No se fija un máximo funcional de Personas sin evidencia de producto.

La reproyección usa outbox idempotente para padrón nominal, `activeRosterSearchEntries`, directorio opt-in, tareas y proyecciones propias. `READY` exige outbox durable, no necesariamente aplicado; las consultas afectadas exponen cobertura `REPROJECTING` y nunca convierten una proyección vieja en ausencia.

### 5.9 Concurrencia, recuperación y retención

La coordinación progresa `PREPARING → PREPARED → MERGING → FINALIZING → COMMITTING → COMMITTED`, con `STALE` antes de confirmar y `FAILED_RECOVERABLE` sólo después. Preview vencido o cualquier revisión distinta obliga a preparar otro; no arrastra elecciones silenciosamente. Una respuesta perdida se resuelve exclusivamente con `operationRef`; reintentar no repite finalizaciones ni outbox. No hay rollback de una Membresía finalizada: recovery completa assignments, principal y proyecciones.

El preview vence exactamente 24 horas después de `preparedAt`. Confirmar siempre relee identidad, assignments, correo/candidatura, Membresías, admisiones, capabilities y revisiones aunque el token no haya vencido. Se separan cuatro categorías:

| Categoría | Campos permitidos | Retención |
| --- | --- | --- |
| snapshot de preview | tarjetas y nombres de presentación, procedencia, resúmenes no autoritativos de Membresías/admisiones/capabilities, `manifestRevision`, digest, `preparedAt`, `expiresAt` | hasta `expiresAt`; confirmado, stale o vencido queda elegible para purga inmediata y debe eliminarse en la siguiente ejecución de housekeeping, con objetivo máximo 24 h; nunca es auditoría ni fuente de recovery |
| coordinación operativa | `mergeId`, `accountId`, estado/fase, cursores internos, leases, intentos, error técnico sanitizado, referencias de receipts y timestamps | mientras no sea terminal; tras `COMMITTED` o cancelación pre-efecto, 30 días para retry/diagnóstico y luego purga; un `FAILED_RECOVERABLE` no expira |
| evidencia mínima de fusión | `mergeId`, `accountId`, `personIds`, principal anterior/elegida, pares de Membresías ganadora/perdedora, IDs y outcomes de admisiones/capabilities, `manifestDigest`, revisiones, actor, motivo, `confirmedAt/completedAt`, receipt refs y schema | vive con `accountIdentities` y sólo se elimina mediante el futuro flujo autorizado de eliminación de Cuenta/Identidad; no contiene nombres, correos, tarjetas, importes ni copia del preview |
| receipts/auditoría de dominio | IDs del recurso, `mergeId`, operación, motivo, actor, idempotency/request hash, outcome y timestamps definidos por Membresía, Solicitud, Invitación o capability | política del recurso autoritativo; la limpieza del preview/coordinación nunca los elimina ni acorta su historia |

Housekeeping sólo procesa `expiresAt/purgeAfter`, es idempotente, no toca coordinaciones recuperables y requiere autorización operacional separada para producción.

### 5.10 Estado de implementabilidad

**Estado real:** `C0 CERRADO TÉCNICAMENTE EN LOCAL; C1–C4 LISTOS PARA AVANZAR POR DEPENDENCIAS Y CON AUTORIZACIÓN SEPARADA`. No queda bloqueo funcional de C ni bloqueo técnico de C0. C0 es preparación compatible sin superficie de usuario; su cierre habilita planificar C1, no pluralidad ni fusión. C2 y C3 dependen de la salida acreditada del corte anterior. C4 productivo —materialización remota, índices, configuración/flags, housekeeping, canary, habilitación y rollback— requiere autorización específica y evidencia local/UAT previa.

## 6. Matriz de preservación

| Registro | En fusión |
| --- | --- |
| Persona elegida principal | vigente y editable por titular |
| Persona no principal | raíz histórica inmutable, asignada como consolidada |
| Membresía sin conflicto | permanece con `personId` original |
| Membresía ganadora | permanece activa sin reescritura |
| Membresía perdedora | finalizada canónicamente; último Período cerrado |
| Obligación/Pago | sin cambios; conserva `membershipId/personId` |
| Correcciones/condonaciones/entregas/recibos | sin cambios |
| Cargo descriptivo | se conserva en su Membresía |
| Capability con anchor ganador | se conserva si revalida identity assignment y demás contexto |
| Capability con anchor perdedor | caduca por finalización |
| Auditoría | conserva actor, raíz original, mergeId y motivo |

## 7. Seguridad y privacidad

- correo se normaliza sólo para lookup HMAC y se revalida en servidor;
- no existe índice único ni búsqueda Owner por correo;
- la UI no revela si existe una Cuenta para una ficha;
- candidaturas, decisions, identity roots, assignments, manifests y receipts son backend-only;
- logs no incluyen correo, nombres, tokens ni IDs opacos entregados a UI;
- correo externo no contiene autoridad y puede fallar sin cambiar candidatura;
- cursores y previews ligan `identityRevision`, `emailRevision` y digest.

## 8. Rollout requerido para B/C

B ya está implementado y apagado por flag fuera de su UAT. C se divide para que cada corte sea desplegable sin exponer una fusión incompleta:

1. **C0 — identidad compatible, sin UI:** materializar el núcleo de identidad en modo espejo, adaptar atómicamente `ensureMyPerson` y adopción B, y agregar inspección/reconciliación local. Mantener `users.personaId` como autoridad visible durante este corte y no habilitar pluralidad ni fusión.
2. **C1 — autorización y readers:** adaptar todos los SUBJECT/self, economía, admisiones y capabilities; incorporar self sobre el conjunto completo; proyecciones e índices; modo sombra que compara decisión legacy/nueva sin conceder acceso adicional.
3. **C2 — writers canónicos y coordinador apagado:** finalización `PROFILE_MERGE`, terminalización de admisiones, revocación de capability, locks, receipts, recovery y reproyección. Ningún endpoint público de confirmación todavía.
4. **C3 — preview/UI/UAT:** contratos públicos, pantalla paginada, confirmación y recuperación. Flag separado `ENABLE_IUX11C_MERGE`, default `false`.
5. **C4 — habilitación y retiro:** reconciliación acreditada, índices construidos, métricas, canary/rollback y recién después retiro de evaluadores que interpreten `users.personaId` como autoridad completa.

Dependencias: C1 depende de C0; C2 depende de C1; C3 depende de C2; C4 depende de UAT completa. C0–C2 son preparación técnica compatible y permanecen invisibles/deshabilitados para usuarios. No se habilita UI C antes de C3. Implementación local y fixtures no autorizan materialización remota, configuración, índices, housekeeping, canary ni enable productivo de C4.

### 8.1 IUX-11C0 — núcleo de identidad compatible

**Objetivo:** introducir una representación verificable de Cuenta–Identidad–Persona sin cambiar ninguna respuesta pública, autorización efectiva ni experiencia. C0 no fusiona, no crea una segunda Persona para una Cuenta, no consume `RECOGNIZED_PENDING_MERGE`, no cambia principal, no reproyecta nombres y no incorpora callables/UI C.

**Representación física adoptada:**

```text
accountIdentities/{accountId}
  accountId
  primaryPersonId
  state: MIRRORED_SINGLE
  identityRevision: 1
  createdAt
  updatedAt
  schemaVersion: 1

personIdentityAssignments/{personId}
  personId
  accountId
  state: ACTIVE
  source: SELF_BOOTSTRAP | IUX11B_ADOPTION | LEGACY_MATERIALIZATION
  assignedAt
  schemaVersion: 1
```

`primaryPersonId` existe sólo en `accountIdentities`; no se copia como role/principal en cada assignment, evitando reescribir N filas cuando C cambie principal. El documento por `personId` aporta exclusividad y reverse lookup directo. `MIRRORED_SINGLE` declara que C0 refleja exactamente `users.personaId` y todavía no habilita pluralidad; C1 podrá promover a `READY` sólo después de adaptar consumidores.

**Contratos internos; no callables públicos:**

```ts
getAccountIdentityContext({ unitOfWork, accountId })
// MISSING | LEGACY_SINGLE | MIRRORED_SINGLE | INCOMPATIBLE

resolveAccountForAssignedPerson({ unitOfWork, personId })
// MISSING | LEGACY_SINGLE | MIRRORED_SINGLE | INCOMPATIBLE

ensureMirroredSingleIdentity({
  unitOfWork, accountId, personId,
  source: "SELF_BOOTSTRAP" | "IUX11B_ADOPTION" | "LEGACY_MATERIALIZATION",
  occurredAt
})
// CREATED | EXISTING; divergencia => INCOMPATIBLE_STATE

inspectIdentityMaterialization({ pageSize: 100, cursor? })
// reporte local/operacional sin escribir

materializeLegacyIdentity({ accountId, occurredAt })
// MISSING | CREATED | EXISTING; divergencia => INCOMPATIBLE_STATE
```

- `ensureMyPerson` y la adopción B llaman `ensureMirroredSingleIdentity` dentro de su transacción vigente: Persona/`users.personaId`, assignment B cuando corresponda, identidad espejo y assignment plural se confirman o fallan juntos.
- Una Cuenta legacy sin documentos nuevos devuelve `LEGACY_SINGLE` sin escribir durante lectura. No hay lazy write oculto.
- Materialización existente se separa en `inspect` y `apply`; ambos pertenecen a la validación local de C0 sobre Emulator. Ningún `apply` UAT/remoto ni backfill productivo pertenece a C0: esas operaciones permanecen en C4 y requieren autorización específica.
- Si identidad, assignment, `users.personaId` o `personAccountAssignments` discrepan, el resolver devuelve `INCOMPATIBLE`; no repara ni elige ganador. Los writers de vínculo fallan cerrados y emiten observabilidad sin PII.
- Firestore cliente conserva deny-all. C0 no requiere índice compuesto: accesos normales son por ID; la inspección pagina `users` por `__name__`.

**Presupuesto técnico C0:** resolver por Cuenta, hasta 3 lecturas (`users`, identidad, assignment directo); reverse lookup nuevo, hasta 2 (assignment, identidad) y hasta 2 adicionales sólo en fallback legacy; writer nuevo, hasta 4 relecturas de coordinación además de las ya presupuestadas por `ensureMyPerson`/B; inspect, `pageSize + 1` usuarios y hasta `2 × pageSize` verificaciones, página máxima 100. Debe medirse Emulator; superar el techo documentado bloquea cierre de C0, no se oculta como optimización posterior.

**Dependencias exactas:** dominio/adapters de identidad; transacciones actuales de `firestoreUserPersonLinkRepository` y `administrativePersonLinkModule`; Rules deny-all para ambas colecciones; observabilidad sanitizada; fixtures legacy, A, B adoptada y B pendiente. No depende de writers de Membresía, economía, Solicitudes, Invitaciones, capabilities, proyecciones, UI o índices de C1–C4.

**Criterios de aceptación C0:**

1. alta propia nueva y adopción B crean espejo + assignment en el mismo commit y mantienen exactamente el resultado público vigente;
2. retry/respuesta perdida devuelve las mismas raíces sin duplicar identity/assignment ni incrementar revisión;
3. dos Cuentas por una Persona, dos Personas por Cuenta o documentos divergentes fallan cerrados sin reparación parcial;
4. Cuenta legacy funciona por `LEGACY_SINGLE`; inspect la clasifica sin escribir; apply Emulator es idempotente y genera sólo `MIRRORED_SINGLE` compatible;
5. `RECOGNIZED_PENDING_MERGE` continúa sin assignment/custodia nueva y C0 no lo consume;
6. B con flag apagado/encendido, `ensureMyPerson`, ficha propia, readers, economía, Membresías, Solicitudes e Invitaciones no cambian DTO, autorización ni resultado;
7. no existen rutas, botones, callables de merge, cambio de principal ni identidad 1..N utilizables por usuario;
8. Rules niegan cliente, logs no contienen PII y las mediciones respetan el presupuesto;
9. suites focales de identidad/B, Emulator aislado, regresión A/A.1/B, TypeScript/build/lint baseline y `git diff --check` pasan;
10. cierre C0 informa por separado evidencia local y cualquier operación productiva no ejecutada.

**Pruebas C0 obligatorias:** unitarias de estados/shape y divergencias; Emulator de commits atómicos, exclusividad, retry y respuesta perdida; carrera `ensureMyPerson` vs adopción B; materialización 0/1/100/101 con cursor; corrupción de cada vínculo; Rules; caracterización de DTOs/callables existentes. No corresponde UAT funcional de fusión en C0 porque no hay superficie entregada; sólo smoke de no regresión de A/B.

**Cierre técnico local (27 de noviembre de 2026):** definición `fa79e6a`; implementación y pruebas
`75f1219b30f95a5500e944c8141a4f090bbe3fde`. Los diez criterios quedan acreditados. El apply se
ejecutó únicamente sobre Emulator sintético `demo-sportexa-e0-02`: inspección previa sin writes,
interrupción después de una página, recuperación por manifest, repetición con `created=0`, rechazo de
divergencia sin reparación y ausencia de efectos sobre registros ajenos. Suite Emulator completa
`341/341`, focal C0 `2/2`, sintaxis Functions `577/577`, TypeScript, build, lint baseline y diff check
aprobados. Unitarias `506/507`: la única falla es la deuda histórica IUX-06A sobre
`gridTemplateColumns`, ajena a C0. No hubo ejecución UAT/remota, backfill, configuración, índices,
deploy ni habilitación; C0 no entrega fusión ni habilita C1–C4 a usuarios.

### 8.2 Matriz de contratos y consumidores

| Familia/consumidor vigente | Evidencia actual | Adaptación C obligatoria |
| --- | --- | --- |
| `ensureMyPerson`, `firestoreSelfPersonReader`, `PersonProvider` | leen/escriben `users.personaId` singular | principal desde identidad; carrera con `MERGING`; dual-write y divergencia cerrada |
| IUX-11B `administrativePersonLinkModule` | B adopta o deja `RECOGNIZED_PENDING_MERGE`; assignment simple sólo al adoptar | consumir intención, adquirir assignment plural, conservar idempotencia/correo/custodia |
| `treasuryAccountIdentityCapability` | consulta `users` por `personaId`, incluso reverse lookup | resolver Cuenta/Persona por assignment único; self contra todo el conjunto |
| `activeGroupMemberPersonCapability`, `ownMembershipHistoryPersonCapability` y readers de Membresía propia | autoridad singular y queries por un `personId` | principal sólo para presentación; SUBJECT/proyección paginada para todas las raíces |
| `firestorePaymentStore`, deliveries, recibos y tesorería | economía ligada a `personId/membershipId`; varias rutas comparan persona propia singular | conservar IDs; autorizar por assignment; cursors con `identityRevision`; prohibir autoaprobación cruzada |
| grants/slots de capabilities | grant contiene Cuenta, Persona, Membresía y anchor; reverse lookup singular | revalidar/revocar/lapse según §5.5; nunca transferir grants |
| Membresía, Períodos, active/lifecycle guards | writer canónico mantiene ciclo, contador y proyecciones | adapter interno `PROFILE_MERGE`, receipts y bloqueo `MERGING`; sin escritura directa |
| contador, padrón y `activeRosterSearchEntries` | correlación por Membresía/Persona y nombre de esa Persona | contador sólo por finalización; nombre/tokens de principal; correlación original intacta |
| No integrantes/custodia administrativa | lista `UNLINKED` sin activa y permite corrección Owner | retirar al adquirir merge; `MERGED` no vuelve a No integrantes aunque se finalice una Membresía |
| Solicitudes y `pendingGroupJoinRequestGuards` | correlación y autoridad por Persona singular | lectura/respuesta por assignment; terminalización C-A canónica; bloquear admisión durante merge |
| Invitaciones `ownPerson`/`ownDirectoryPerson` | derivan únicamente `users.personaId` | principal para directorio; cualquier assigned target para responder; conflictos C-A |
| directorio opt-in IUX-10 | entrada por Persona principal legacy | reproyectar a nombre principal sin agregar Cuenta-sin-Persona ni correo externo |
| dashboard/tareas/deep-links | audiencia ligada a Cuenta/Persona según productor | reproyectar audiencia conservando recurso y autorización; cursor/revisión de identidad |
| Owner/admin readers | muestran Persona de la Membresía | presentación C-N y trazabilidad original; ningún permiso de identidad nuevo |

### 8.3 Pruebas mínimas de C completo

- dominio/arquitectura: exclusividad Persona–Cuenta, una principal `READY`, conjunto propio completo, raíces económicas inmutables y prohibición de escritura directa de Membresía/admisión/capability;
- compatibilidad: Cuenta legacy, adopción B, B pendiente, identidad de 2 y 3+ Personas, principal distinta de Membresía ganadora, Persona sin correo y Grupo archivado;
- carreras: dos Cuentas por candidata; dos merges solapados; merge vs `ensureMyPerson`, corrección, admisión, finalización, cierre de Temporada, archivo, transferencia y cambio/revocación de capability;
- idempotencia: retry y respuesta perdida antes/después de cada fase, receipt repetido, payload distinto con misma clave y recovery tras cada finalización parcial;
- Membresía/economía: compatible preservada, duplicada finalizada una vez, Período cerrado, contador 2→1, deuda/Pagos/recibos idénticos y autoaprobación cruzada denegada;
- admisiones: pendiente compatible, dos pendientes, pendiente con activa consolidada, Temporada cerrada, guard/coordination en vuelo y resultado terminal estable;
- lectura/paginación: 0/1/20/21 assignments y recursos, cursores stale por nueva fusión/cambio principal, sin N+1 frontend, presupuesto medido e índices declarados;
- proyección: nombre principal en vivo, original en historia, outbox duplicado/fuera de orden, cobertura `REPROJECTING`, reconciliación y búsqueda sin falsos vacíos;
- seguridad: Rules deny-all, refs opacos, logs sin PII, Owner sin acceso al conjunto, correo revalidado y flag apagado falla cerrado;
- regresión: A/A.1, B, Mis grupos, historial, padrón, No integrantes, Solicitudes/Invitaciones, obligaciones, avisos, recibos, tesorería y self-exit.

### 8.4 Recorrido UAT de C3

1. Cuenta con Persona propia reconoce una ficha administrativa; comprobar que B sólo deja `RECOGNIZED_PENDING_MERGE` y el Owner aún puede corregirla.
2. Abrir preview con Grupo archivado, Temporada cerrada y Membresía finalizada; comprobar que la revisión sigue disponible.
3. Ver dos Membresías compatibles y un conflicto del mismo Grupo/Temporada; elegir principal distinta de la ganadora y revisar economía preservada.
4. Revisar y decidir las admisiones afectadas, comprobar capabilities retenidas/caducadas/revocadas y confirmar conjuntamente todas las consecuencias mediante el digest mostrado.
5. Confirmar, simular respuesta perdida y recuperar por `operationRef`; verificar una ficha vigente, ambas Personas asignadas y la perdedora finalizada con motivo exacto.
6. Recorrer Mis grupos, historial, obligación/Pago/aviso/recibo de cada raíz, padrón y búsqueda; verificar principal visible y procedencia original donde corresponde.
7. Intentar auto-revisar/auto-validar economía de la otra Persona consolidada; debe denegarse. Verificar grants retenidas y caducadas/revocadas.
8. Reconocer una tercera ficha y repetir preview sobre todo el conjunto; probar conflicto nuevo y cambio de principal.
9. Como Owner, verificar recursos permitidos, pérdida de edición nominal y ausencia de facultad para cambiar/deshacer la identidad.
10. Repetir en 360/390 px, escritorio, navegación Atrás/Adelante, foco, error/retry, páginas 20+1 y flag apagado.

## 9. IUX-11A.1 — refinamiento post-UAT

**Estado:** `CERRADO; VALIDACIÓN TÉCNICA COMPLETA; UAT HUMANA APROBADA` sobre BUILD_ID `gdZvN1YTNPMteaRxngA6N`.

**Incluye:**

- Crear integrante mediante modal accesible: foco inicial, trampa de foco, `Escape`, retorno de foco, campos conservados ante error, single-flight y retry con intención estable.
- `Editar ficha` en una fila sólo si el backend devuelve `administrativeCustody: { status: "EDITABLE", custodyRevision }`; `NOT_ADMINISTRATIVE`, `LINKED`, `ORPHANED` o ausencia del campo no habilitan la acción.
- Caja única y pestañas URL-driven `members`, `non-members`, `invitations`, preservando deep-links y navegación Atrás/Adelante.
- No integrantes Owner-only: custodia del Grupo actual y ausencia de Membresía activa en ese Grupo; página máxima 20, cursor opaco firmado y reautorización por página.
- Invitaciones Owner-only: pendientes primero, terminales después, páginas exactas de cinco y cancelación canónica sólo de pendientes.
- Reincorporación exclusivamente por `CREATE`, `REACTIVATE` o `RENEW` del writer canónico, decidida por preview autoritativo.

**Reglas de borde:**

- Una ficha con Membresía finalizada, incluso de una Temporada anterior, aparece en No integrantes mientras conserve custodia `UNLINKED` y no tenga otra activa en el Grupo.
- Una ficha activa en otro Grupo puede aparecer; el filtro es el Grupo actual.
- Grupo archivado permite listar No integrantes y corregir, pero no crear, reincorporar ni invitar. Integrantes conserva la semántica del lector vigente y no fabrica una Temporada abierta histórica.
- Grupo archivado permite además el listado histórico de Invitaciones al Owner vigente y la cancelación canónica de pendientes; no permite crear ni aceptar. El writer de cancelación IUX-10 ya soporta ese caso, pero su reader actual no y debe dejar de depender de `ownedOpen` para esta vista.
- Activación/reincorporación confirmada retira la fila de No integrantes mediante la misma coordinación que actualiza guards, contador, padrón y búsqueda.
- Corrección no reescribe nombres históricos ni cambia Membresías; actualiza proyección nominal y vuelve stale cualquier cursor cuyo orden haya cambiado.

**Contratos dependientes:**

1. enriquecer el DTO de padrón con acreditación de custodia, sin inferencia cliente;
2. lector/proyección paginada de No integrantes y cursor contextual;
3. preview/confirmación de reincorporación sobre capabilities de Membresía existentes;
4. listado de Invitaciones por fases y cursor de cinco, con autorización histórica Owner-only en Grupo activo/archivado; reutiliza la cancelación IUX-10 y no su precondición de lectura `ownedOpen`;
5. estado de pestaña en URL y reglas de deep-link;
6. pruebas de transferencia, archivo, finalización, temporada anterior, cursor stale, doble submit, respuesta perdida y foco.

### 9.1 Buscador ampliado — fuera de A.1

Se mantiene como corte independiente y `NO LISTO`:

- `ALREADY_MEMBER` muestra **Ya integra el grupo**;
- Persona localizable conserva Invitar/Solicitud o Invitación pendiente;
- vacío acreditado ofrece **Crear integrante** sin afirmar inexistencia;
- Cuenta sin Persona sólo puede aparecer con una nueva preferencia opt-in que recoja Nombre y Apellido explícitos.

No se separa Auth `displayName`, no se habilita localización por defecto y no se reutiliza `users.nombre` como dos campos. Se propone `accountDirectoryProfiles/{accountId}` con `firstName`, `lastName`, consentimiento/revisión y correo visible sólo si existe una segunda decisión explícita sobre un correo verificado. El resultado expone referencia opaca, nunca `accountId` ni existencia en Auth. Crear desde ese candidato produce Persona administrativa + Membresía sin vínculo automático.

Pendientes antes de autorizar: decidir exposición de correo, retención, carrera con `ensureMyPerson`, evolución o separación de la preferencia IUX-10, presupuesto y defensa contra enumeración.

**Recomendación:** cerrar IUX-11A tras A.1 sin esperar esta ampliación. Mezclarla ampliaría privacidad e identidad y retrasaría un ajuste visual que puede apoyarse en contratos administrativos ya acotados.

## 10. Decisiones adoptadas, propuestas y pendientes

### 10.1 Adoptadas para A

- custodia por Owner vigente; transferencia la mueve y archivo la conserva;
- creación sólo en Grupo activo con Temporada abierta;
- corrección de no vinculada permitida en Grupo activo/archivado sin exigir Temporada/Membresía activa;
- eliminación válida imposible por Membresía y custodia;
- ausencia anómala = `ORPHANED_CUSTODY`, sin autoridad residual y con recovery operacional o vínculo futuro;
- creación/corrección atómicas, idempotentes y recuperables según §3.5.

No queda decisión funcional del núcleo A pendiente. A.1 fue implementado, validado y aprobado humanamente sin reabrir B/C.

Para A.1 también queda adoptado —no pendiente— que el Owner vigente puede leer Invitaciones y cancelar pendientes en un Grupo archivado. Es una dependencia técnica del reader, no una ampliación general de escritura sobre Grupos archivados.

### 10.2 Adoptadas para B

- **Ahora no** cierra sin suspensión ni decisión persistida;
- rechazo por Cuenta + Persona retira de sugerencias, sobrevive cambios/ida-vuelta de correo y sólo sale por reconsideración explícita;
- adopción atómica sólo sin Persona; con Persona, reconocimiento/intención pendiente sin cambiar custodia, permisos, assignment ni principal;
- Auth/Admin acredita correo primario verificado; páginas, presupuestos/rate limits y Actualizar quedan cerrados por §4.3;
- `ensureMyPerson` y adopción contienden por `users.personaId`, sin efectos parciales ni dos principales;
- App Check, flag, backfill, retención y outbox se separan según §4.6;
- compatibilidad B conserva una sola Persona principal; pluralidad y autorización multi-Persona quedan en C.

El código y la UAT B integrados en `acc7b263` acreditan estas decisiones. `RECOGNIZED_PENDING_MERGE` no es assignment, no reserva Persona y no revoca custodia; C debe revalidar todo.

### 10.3 Adoptadas para C

- el usuario revisa el conjunto y elige ficha principal;
- Personas, IDs y referencias históricas se conservan;
- datos principales no extinguen obligaciones, Pagos ni historia;
- participaciones compatibles se conservan;
- conflictos activos del mismo Grupo/Temporada requieren elección separada de Membresía ganadora y finalización canónica de la otra con motivo **Fusión de fichas**;
- identidad consolidada gobierna autorización propia y restricciones self sobre todas las Personas;
- ficha principal y Membresía ganadora son decisiones independientes;
- archivo de Grupo, cierre de Temporada o finalización de Membresía no impiden por sí solos revisar;
- correo externo y directorio de Cuentas sin Persona quedan excluidos.
- C-N1: la principal nombra vistas actuales/búsqueda; historia y auditoría conservan nombres originales;
- C-F1: assignments 1..N y revalidación del conjunto/conflictos en cada fusión sucesiva;
- C-A1: admisiones compatibles permanecen; colisiones se eligen y redundantes se terminalizan mediante writers canónicos;
- C-C1: capabilities válidas permanecen, las ancladas a Membresía finalizada caducan, conflicto self se revoca y nunca se transfieren permisos a la Membresía ganadora;
- no hay notificación dedicada al Owner en C; motivo y trazabilidad siguen consultables;
- preview válido 24 horas con revalidación obligatoria al confirmar;
- retención separada por categoría según §5.9: preview efímero, coordinación operativa acotada, evidencia mínima sin copia nominal y receipts bajo el recurso autoritativo.

### 10.4 Bloqueos reales y autorizaciones

No queda decisión funcional o técnica bloqueante para implementar C0 localmente. C1–C3 requieren cierre acreditado del corte anterior y autorización de implementación correspondiente. C4 requiere autorización productiva específica para materialización/backfill remoto, configuración/flags, índices, housekeeping, canary, enable y rollback; ninguna evidencia local los autoriza implícitamente.

## 11. Cierre documental de esta revisión

IUX-11A/A.1 e IUX-11B permanecen cerrados con UAT funcional aprobada; `acc7b263` es la base integrada vigente. D5-088 adopta las decisiones C y deja IUX-11C listo para implementación incremental con autorización separada. C0 está definido en §8.1 y no entrega funcionalidad a usuarios. IUX-11D y la ampliación Cuenta-sin-Persona permanecen fuera. Esta revisión es sólo documental y no autoriza código, configuración, índices, datos, backfills, commit, push ni despliegue.
