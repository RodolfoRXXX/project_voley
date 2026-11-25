# IUX-11 — Fichas administrativas, vinculación y fusión

## Estado de la ficha

- **Estado general:** `IUX-11A E IUX-11A.1 CERRADOS CON UAT HUMANA APROBADA; B/C, CORREO EXTERNO Y DIRECTORIO AMPLIADO PENDIENTES`.
- **Fecha:** 25 de noviembre de 2026.
- **Base:** `dev@e8740549e6ae956f4c9588a4e051a78adbe5ffe9`.
- **Etapa:** interetapa IUX entre E3 y E4.
- **Identificador:** `IUX-11`.
- **Decisión documental:** `D5-083`, refinada por `D5-084` y cerrada por `D5-085`.
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
| IUX-11B | Cuenta encuentra dentro de Ficha personal candidaturas por correo verificado, rechaza o adopta una ficha cuando no tiene Persona | **DEFINIDO PARCIALMENTE; NO LISTO** |
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

### 4.1 Recorrido aprobado

- Ficha personal consulta candidaturas usando correos verificados derivados de la Cuenta.
- Cada ficha muestra nombre, apellido y procedencia; no expone información a otra Cuenta.
- **No reconozco esta ficha** persiste rechazo para esa revisión sin afectar dominio/economía.
- **Reconocer ficha** relee correo vigente.
- Sin Persona previa, confirmación crea la identidad, assignment PRIMARY y proyección `users.personaId`.
- Grupo archivado, Temporada cerrada y Membresía finalizada no afectan el resultado.
- Una Cuenta creada después encuentra la candidatura en su primera consulta compatible.

### 4.2 Dependencias y estado

Requiere índice HMAC no único, fuente confiable de correos verificados, revisión de correo, identity root, assignment único, evolución de alta propia y materialización/reconciliación de fichas creadas por A antes de habilitar B. El aviso por correo queda fuera.

**Estado:** `NO LISTO`; falta resolver semántica de rechazo/reaparición y cerrar contratos de identidad con pruebas de carrera.

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

### 10.2 Propuestas para B/C

| Tema | Recomendada | Alternativa y consecuencia |
| --- | --- | --- |
| Rechazo | B-R1: ocultar por Cuenta + Persona + `emailRevision`; sólo cambio de correo vuelve a ofrecer | B-R2: rechazo reversible manual/permanente; exige bandeja y puede ocultar correcciones legítimas |
| Nombre | C-N1: principal en vistas actuales/búsqueda; original en historia/auditoría con trazabilidad | C-N2: original por registro; conserva literalidad pero mantiene identidades múltiples visibles |
| Fusiones sucesivas | C-F1: assignments 1..N y manifest contra todo el conjunto | C-F2: sólo dos; menor corte inicial, tercera ficha bloqueada y evolución posterior |
| Admisiones pendientes | C-A1: preview conserva una por Grupo sin activa o terminaliza redundantes con consentimiento | C-A2: bloquear fusión hasta resolución original; más simple pero puede bloquear indefinidamente |
| Capabilities | C-C1: conservar sólo las que revaliden assignment, Membresía/anchor, slot, ownership y Temporada | C-C2: caducar todas; más simple/seguro, pero interrumpe permisos válidos |

En cualquier alternativa, todas las Personas asignadas cuentan como identidad propia para prohibiciones de auto-revisión, auto-validación o actuación económica como tercero. La capability de una Membresía finalizada caduca siempre.

### 10.3 Pendientes

- elegir B-R1/B-R2 para completar B;
- elegir C-N1/C-N2, C-F1/C-F2, C-A1/C-A2 y C-C1/C-C2 para completar C;
- aviso informativo al Owner por `PROFILE_MERGE`;
- retención/eliminación de candidaturas, rechazos, manifests y evidencia.

## 11. Cierre documental de esta revisión

IUX-11A e IUX-11A.1 quedan cerrados con UAT humana aprobada sobre `gdZvN1YTNPMteaRxngA6N`. La definición quedó en `5f01f61` y la implementación/pruebas en `6703034`. IUX-11B de vinculación, IUX-11C de fusión, IUX-11D de correo externo y la ampliación Cuenta-sin-Persona no forman parte del cierre y permanecen pendientes. Se autorizó versionar, integrar en `dev` y publicar mediante push normal; no se autorizó despliegue.
