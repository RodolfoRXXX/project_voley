# IUX-11 — Fichas administrativas, vinculación y fusión

## Estado de la ficha

- **Estado general:** `IUX-11A E IUX-11A.1 CERRADOS; IUX-11B DEFINIDO Y LISTO PARA IMPLEMENTAR CON AUTORIZACIÓN SEPARADA; C, CORREO EXTERNO Y DIRECTORIO AMPLIADO PENDIENTES`.
- **Fecha:** 26 de noviembre de 2026.
- **Base:** `dev@c6619d6752d2a2396b162b6be2d569f966619f08`.
- **Etapa:** interetapa IUX entre E3 y E4.
- **Identificador:** `IUX-11`.
- **Decisión documental:** `D5-083`, refinada por `D5-084`, `D5-085` y `D5-086`.
- **Relevamiento:** `IUX-11-relevamiento-fichas-administrativas-vinculacion-fusion.md`.
- **Addendum:** `docs/arquitectura/Documento-1-1.5-2-3-4-addendum-IUX-11-fichas-administrativas-vinculacion-fusion.md`.
- **Cierre aprobado:** definición `5f01f61`, implementación/pruebas `6703034` y BUILD_ID UAT `gdZvN1YTNPMteaRxngA6N`; sin despliegue ni cambios de datos UAT.

## 1. Objetivo

Permitir alta administrativa de una Persona sin Cuenta, su incorporación y gestión económica; ofrecer después una vinculación interna por coincidencia con correo verificado; y, cuando la Cuenta ya tenga Persona, consolidar ambas raíces bajo una única ficha principal visible sin perder la trazabilidad de Membresías, Períodos, obligaciones, Pagos, auditoría ni capabilities válidas.

## 2. Alcance por corte

| Corte | Resultado | Estado |
| --- | --- | --- |
| IUX-11A.1 | Modal, edición acreditada por fila, caja con pestañas, No integrantes, Invitaciones y reincorporación canónica | **CERRADO; UAT HUMANA APROBADA** |
| IUX-11A | Owner crea/corrige ficha no vinculada con correo opcional, la incorpora a Temporada abierta y gestiona su economía | **CERRADO; UAT HUMANA APROBADA** |
| IUX-11B | Cuenta encuentra dentro de Ficha personal candidaturas por correo verificado, cierra/rechaza/reconoce una revisión y adopta una ficha cuando no tiene Persona | **DEFINIDO; LISTO PARA IMPLEMENTAR CON AUTORIZACIÓN SEPARADA** |
| IUX-11C | Cuenta con Persona preexistente compara, elige principal, resuelve Membresías activas duplicadas y conserva acceso histórico | **DEFINIDO PARCIALMENTE; NO LISTO** |
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

**Estado:** `DEFINIDO; LISTO PARA IMPLEMENTAR CON AUTORIZACIÓN TÉCNICA SEPARADA`. No queda decisión funcional nueva de B pendiente. No autoriza código, configuración, índices, secretos, backfill, migración, commit, push ni despliegue.

## 5. IUX-11C — fusión

### 5.1 Preview obligatorio

Antes de confirmar muestra:

- ambas fichas y su procedencia;
- cuál será principal;
- Membresías activas agrupadas por Grupo/Temporada;
- elección independiente de la Membresía que continúa en cada conflicto;
- Membresías/Períodos históricos preservados;
- obligaciones y Pagos que continúan separados;
- capabilities que permanecen o caducan por finalizar su anchor;
- Solicitudes/Invitaciones pendientes que requieren resolución;
- advertencia de que una Membresía finalizada no se reactiva por cancelar la pantalla o perder la respuesta.

### 5.2 Resultado

- una ficha personal principal editable;
- Personas originales preservadas y asignadas a la misma identidad;
- `users.personaId` proyecta la principal elegida;
- autorización SUBJECT sobre registros originales de todas las Personas asignadas;
- una sola Membresía activa por conflicto elegido;
- finalización perdedora con motivo **Fusión de fichas**;
- economía sin suma, traslado, deduplicación ni eliminación;
- contador y búsqueda derivados sólo por writers/proyectores canónicos.

### 5.3 Estado

**Estado:** `NO LISTO`; faltan decisiones sobre admisiones pendientes, presentación nominal a terceros y fusiones sucesivas. También requiere retrofit de todos los evaluadores que hoy comparan exclusivamente contra `users.personaId`.

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

1. lectores de identidad tolerantes a legacy `users.personaId` y assignments;
2. materialización/lazy adoption verificable de vínculos existentes;
3. writers de Cuenta/Persona duales sin dos autoridades divergentes;
4. lectores SUBJECT por assignment;
5. capabilities, Solicitudes e Invitaciones compatibles;
6. coordinador de fusión y finalización `PROFILE_MERGE`;
7. proyecciones/reconciliación;
8. UI y UAT;
9. retiro posterior de lecturas que traten `users.personaId` como autoridad completa.

No se habilita UI B/C antes de completar las capas backend correspondientes.

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

### 10.3 Propuestas para C

| Tema | Recomendada | Alternativa y consecuencia |
| --- | --- | --- |
| Nombre | C-N1: principal en vistas actuales/búsqueda; original en historia/auditoría con trazabilidad | C-N2: original por registro; conserva literalidad pero mantiene identidades múltiples visibles |
| Fusiones sucesivas | C-F1: assignments 1..N y manifest contra todo el conjunto | C-F2: sólo dos; menor corte inicial, tercera ficha bloqueada y evolución posterior |
| Admisiones pendientes | C-A1: preview conserva una por Grupo sin activa o terminaliza redundantes con consentimiento | C-A2: bloquear fusión hasta resolución original; más simple pero puede bloquear indefinidamente |
| Capabilities | C-C1: conservar sólo las que revaliden assignment, Membresía/anchor, slot, ownership y Temporada | C-C2: caducar todas; más simple/seguro, pero interrumpe permisos válidos |

En cualquier alternativa, todas las Personas asignadas cuentan como identidad propia para prohibiciones de auto-revisión, auto-validación o actuación económica como tercero. La capability de una Membresía finalizada caduca siempre.

### 10.4 Pendientes

- elegir C-N1/C-N2, C-F1/C-F2, C-A1/C-A2 y C-C1/C-C2 para completar C;
- aviso informativo al Owner por `PROFILE_MERGE`;
- retención/eliminación de manifests y evidencia de C.

## 11. Cierre documental de esta revisión

IUX-11A e IUX-11A.1 permanecen cerrados con UAT humana aprobada. D5-086 registra únicamente las decisiones B adoptadas; IUX-11B queda definido y listo para implementar con autorización separada. IUX-11C, IUX-11D y la ampliación Cuenta-sin-Persona permanecen pendientes. Esta revisión es sólo documental y no autoriza código, configuración, datos, commit, push ni despliegue.
