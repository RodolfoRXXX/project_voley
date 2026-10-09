# E3-02 — Informe de implementación local

## Estado y alcance

- Fecha: 2026-10-09.
- Rama de trabajo: `feat/e3-02-treasury-read-access`.
- Base recibida y conservada: `5b9b90d928b07652106c865131fe5f103e1342df`.
- Autoridad normativa: ficha E3-02, addendum conjunto de Documentos 2/3/4 y DEC-E3-02/D5-047 vigentes en el repositorio.
- Alcance implementado: primera capacidad fija `GROUP_TREASURY`, exclusivamente de consulta.
- Entorno de verificación: local, Firebase Emulator, proyecto `demo-sportexa-e0-02` y datos sintéticos.
- No se usó Firebase remoto, deploy, integración Auth/UAT, stage, commit, push, merge, fetch ni cambio de rama.
- Este informe no declara cerrado E3-02 ni Etapa 3. Registra evidencia humana parcial y conserva
  pendientes explícitos donde el recorrido informado no los acreditó.

## Corrección focal UAT-01 (2026-10-09)

El bloqueo originalmente informado para UAT-01 fue corregido. La confirmación humana posterior
acredita que el Owner actual puede conceder y revocar. No acredita que ese Owner careciera de Persona;
ese caso conserva únicamente evidencia automatizada.

### Causa y traducción observada

La pantalla `OwnerTreasuryAccessSection` carga en paralelo
`listActiveGroupMembersForOwnedGroup` y `listGroupTreasuryGrantsForOwner`; no invoca
`getMyGroupTreasuryContext`, que pertenece al recorrido delegado del tesorero.

1. Sin Persona, `listGroupTreasuryGrantsForOwner` llegaba a `requireActor` y exigía
   `getOwnCanonicalPerson`. El backend devolvía `ACCOUNT_CONTEXT_REQUIRED`, transportado como
   `failed-precondition`; `treasuryService` lo traducía como **“Tu Cuenta y Persona deben estar
   vinculadas para usar Tesorería.”**
2. Después de crear Persona, la misma consulta superaba esa precondición pero leía con
   `getOwnershipContext` un Grupo activo legacy todavía sin `ownershipRevision`. El contexto resultaba
   incompatible y se devolvía `GROUP_NOT_ACCESSIBLE`, transportado como `permission-denied`; el
   frontend lo traducía como **“Ya no tenés acceso a este Grupo.”** Crear Persona no había cambiado
   `ownerId` ni el ownership efectivo.

### Correctivo mínimo

- La capacidad pública de identidad ahora ofrece lectura canónica de **Cuenta** sin exigir Persona.
- Las operaciones Owner de Tesorería (listar historia, conceder y revocar) usan esa Cuenta y verifican
  el ownership vigente. El contexto delegado continúa exigiendo Cuenta–Persona.
- La primera lista Owner asegura idempotentemente `ownershipRevision = 1` para la forma activa legacy
  compatible antes de leer historia. Concesión conserva la misma inicialización; no se modificaron
  tombstones ni se implementó transferencia.
- El destinatario conserva el control estricto: Persona de la Membresía, vínculo único a Cuenta y
  vigencia elegible. No se materializa, migra ni repara ninguna Membresía.

No fue necesario cambiar las traducciones frontend: los mensajes correspondían a los motivos que el
backend emitía, pero esos motivos eran incorrectos para el recorrido Owner.

## Resultado implementado

### Grupo y `ownershipRevision`

Grupo admite dos formas nuevas y cerradas: activa v3 y archivada v4, ambas con
`ownershipRevision` entero positivo. Las formas activas v1 continúan compatibles y se evolucionan
idempotentemente a revisión 1 mediante la capacidad pública
`ensureOwnershipContext({ unitOfWork, groupId })`; la concesión posterior relee el contexto con
`getOwnershipContext` dentro de su transacción confirmatoria.

Renombrar conserva el campo porque aplica una actualización focal de `nombre`. Archivar conserva la
revisión y evoluciona v3 a v4. La eliminación canónica reconoce grants, slots y receipts como
referencias funcionales, por lo que no puede dejar historia huérfana. No se implementó transferencia,
no se modificó `transferGroupOwnership` y ninguna operación ordinaria incrementa la revisión.

### Capacidades públicas consumidas

- Grupo: asegurar y leer Owner, estado y revisión.
- Cuenta/Persona: acreditar la Cuenta canónica del Owner sin exigir Persona; para el recorrido
  delegado, derivar la Persona propia; y para el destinatario resolver exactamente una Cuenta
  canónica para una Persona, sin exponer email.
- Membresía: acreditar una activación activa exacta. Para formas period-aware usa el Período abierto
  real; para formas legacy compatibles deriva un ancla opaca desde la fecha de ingreso autoritativa.
- Temporada: acreditar que la Temporada exacta continúa abierta.
- Tesorería: evaluar el grant efectivo para una Cuenta y Grupo sin exponer repositorios internos.

La concesión no escribe Membresía ni sus Períodos, no migra, no repara y no materializa una vigencia
legacy. Tampoco escribe Grupo, Persona, Cuenta, Temporada o Pago dentro de la transacción funcional de
concesión.

### Comandos y consultas de autorización

Se publicaron los contratos cerrados:

- `grantGroupTreasuryCapability({ groupId, membershipId, idempotencyKey })`;
- `revokeGroupTreasuryCapability({ groupId, grantId, idempotencyKey })`;
- `listGroupTreasuryGrantsForOwner({ groupId, pageSize?, cursor? })`;
- `getMyGroupTreasuryContext({ groupId })`.

Sólo el Owner vigente de un Grupo activo concede y revoca. Cada comando acredita la Cuenta del actor,
el ownership y la revisión; deriva capacidad, Persona y ancla del destinatario y fija timestamps en
backend. El Owner no necesita Persona ni Membresía propia. Las claves crudas no se persisten. Un retry
con misma clave y payload recupera el outcome; la reutilización con otro payload conflictúa.

El slot determinista impide más de un grant efectivo por Grupo/capacidad/Cuenta. Revocar marca el
grant, conserva historia y elimina el slot sólo si todavía apunta a ese grant. Una concesión posterior
crea otro `grantId`; nunca reactiva el anterior. Los DTO Owner omiten Cuenta, UIDs de actores, hashes,
paths, schemas y anclas técnicas.

### Persistencia

- `groupCapabilityGrants/{grantId}`: hecho durable, identidad contextual, estado y timestamps.
- `groupCapabilityGrantSlots/{slotId}`: puntero determinista al único grant efectivo por destinatario.
- `groupCapabilityCommandReceipts/{receiptId}`: idempotencia de conceder/revocar con hashes.
- Índice compuesto: grants por `groupId` y `grantedAt DESC` para historia Owner.
- Rules: las tres colecciones permanecen deny-all para acceso directo del cliente.

Grant, slot y receipt se confirman en una transacción. La lista Owner ordena por
`grantedAt DESC, grantId DESC`, usa página 20 por defecto y máximo 50, liga el cursor a actor, Grupo,
capacidad y tamaño, y deriva `ACTIVE`, `REVOKED` o `LAPSED` sin reescribir historia.

### Consulta económica

`listGroupChargeConcepts`, `listChargeOccurrences` y `listGroupObligations` conservan queries, DTOs,
orden y cursores E3-01. Su única ampliación es la autorización backend `Owner OR GROUP_TREASURY`
efectivo. Cada request y página relee Cuenta–Persona, Grupo activo, Owner/revisión,
Membresía/ancla y Temporada abierta.

Continúan Owner-only `listOwnerMonthlyMembershipCandidates`, todas las mutaciones de conceptos y
ocurrencias y `generateMembershipObligations`. `listMyObligations` no cambió. No se creó una fuente,
colección o DTO económico paralelo.

### Frontend

- El detalle de Grupo activo incorpora **Acceso a Tesorería**, separado de **Economía** y del cargo
  descriptivo.
- El Owner lista historia, selecciona integrantes activos, concede y revoca mediante modales del sitio.
- Las intenciones mantienen la misma clave idempotente durante reintentos y aplican single-flight.
- El integrante autorizado ve navegación **Abrir Economía · sólo consulta** desde sus pertenencias.
- La ruta delegada `/dashboard/treasury/{groupId}` muestra conceptos, ocurrencias y obligaciones sin
  controles de creación, edición, generación o validación.
- Al perder autorización se vacían los datos de la vista y se informa en español que el acceso ya no
  está vigente.
- Grupo archivado no muestra controles Owner de Tesorería ni permite acceso delegado.
- La consulta delegada presenta **cobros específicos** en lugar del término técnico “ocurrencias”.
- **Mis obligaciones** muestra el nombre canónico del Grupo de cada obligación, incluso si el Grupo
  fue archivado, sin exponer `groupId` ni habilitar lecturas directas desde el cliente.

### Composición de Grupo en obligaciones propias

El DTO propio anterior no incluía nombre de Grupo y eliminaba deliberadamente `groupId`. Se incorporó
una capacidad pública mínima de Grupo que presenta únicamente su nombre canónico para formas activas
o archivadas compatibles. `listMyObligations` conserva la selección por la Persona propia autenticada,
compone el nombre dentro de la transacción backend y sigue omitiendo el ID técnico y la Persona del
DTO. No usa consultas Owner ni amplía `GROUP_TREASURY`.

## Evidencia automatizada

### Gates verdes

1. `npm run quality:functions:syntax`
   - Resultado: `OK`, 363/363 archivos JavaScript.
2. `npm --prefix volley-ranking-system/functions run test:infra:unit`
   - Resultado: 371 pruebas, 371 aprobadas, 0 fallos.
3. `$env:E3_02_FOCAL='1'; npm --prefix volley-ranking-system/functions run test:infra:emulators`
   - Resultado posterior al correctivo UAT-01: 20 pruebas, 20 aprobadas, 0 fallos; código 0 con Auth,
     Firestore y Functions Emulator locales sobre `demo-sportexa-e0-02`.
   - Incluyó `treasuryE3.test.js`, `treasuryE3Callable.test.js` y la regresión focal
     `paymentE3.test.js`.
4. `npm run quality:lint`
   - Resultado: baseline verde, sin deuda nueva; conserva únicamente hallazgos conocidos del baseline.
5. `npm run quality:typecheck`
   - Resultado: TypeScript sin errores.
6. `npm run quality:build`
   - Resultado: Next.js compiló correctamente el build de producción.
7. `git diff --check`
   - Resultado: sin errores de whitespace.

### Evidencia automatizada específica de UAT-01

- `node --test functions/test/unit/treasuryE3.test.js`: 4/4 aprobadas. Acredita en particular la
  separación estructural entre Cuenta Owner, contexto propio delegado y vínculo del destinatario.
- Emulator directo: Owner sin Persona lista historia e inicializa un Grupo legacy, concede, reintenta,
  resuelve carreras y revoca; un destinatario sin vínculo único es rechazado con
  `TARGET_ACCOUNT_LINK_REQUIRED`.
- Emulator directo: después de crear la Persona del mismo Owner, conserva historia, vuelve a conceder
  y mantiene el ownership y las operaciones anteriores.
- Emulator HTTP: `listGroupTreasuryGrantsForOwner`, `grantGroupTreasuryCapability` y
  `revokeGroupTreasuryCapability` se recorrieron con token Auth sintético mientras el Owner no tenía
  Persona; después de crearla se releyó la historia. El tesorero continuó usando
  `getMyGroupTreasuryContext`, pudo leer Economía y no pudo mutarla.

El conteo de la sesión Emulator anterior a este correctivo no estaba expuesto en la evidencia
conservada (sólo constaba código 0), por lo que no se repitió únicamente para obtenerlo. El conteo
20/20 corresponde a la ejecución necesaria para verificar el correctivo.

### Evidencia automatizada de presentación y obligaciones propias

- Unitarias focales de Pago/arquitectura: 8/8 aprobadas. Verifican que el DTO propio presenta
  `groupName`, omite `groupId`, cruza el módulo mediante la capacidad pública mínima y que la UI usa
  **cobros específicos** sin mostrar IDs.
- Sintaxis Functions: 364/364 archivos JavaScript.
- Frontend: lint baseline verde, typecheck sin errores y build Next.js completo.
- Emulator focal `E3_02_PRESENTATION_FOCAL=1`: 12/12 aprobadas. La consulta propia devolvió cuatro
  obligaciones de dos Grupos con sus nombres canónicos; uno de los Grupos estaba archivado. Un usuario
  ajeno obtuvo una lista vacía y los DTOs no expusieron `groupId`.
- No se repitieron las suites completas ni el Emulator por los cambios puramente textuales.

### Cobertura focal demostrada

- Inicialización idempotente de revisión 1 sobre Grupo activo v1.
- Preservación de revisión por renombre/archivo y bloqueo de eliminación con historia E3-02.
- Concesión legacy sin crear Períodos y concesión period-aware sobre Período abierto real.
- Retry idempotente, conflicto de payload, duplicado y carrera de concesiones sobre el mismo slot.
- Revocación durable, retry de revocación y nueva concesión con otro `grantId`.
- Pérdida de autorización entre páginas económicas.
- Finalización, reactivación de la misma raíz y renovación sin herencia ni revival.
- Fixture técnico A → B → A con revisiones distintas, sin implementar transferencia.
- Archivo sin acceso delegado.
- Lectura delegada de conceptos, ocurrencias y obligaciones E3-01.
- Rechazo de candidatos MONTHLY y mutaciones para el tesorero.
- DTOs sin IDs privados y Rules deny-all para grants, slots y receipts.
- Recorrido HTTP real de callables con tokens emitidos por Auth Emulator sintético.

No reapareció D5-045 durante estos gates; permanece registrado como riesgo residual y no se declara
solucionado. No se reabrió E2-14 ni se repitieron matrices de estabilidad ajenas al cambio.

## Limitaciones deliberadas

- No existe transferencia de ownership ni UI para A → B → A; esa condición sólo se acreditó con
  fixture técnico de revisiones.
- No existe RBAC general, perfiles configurables ni CRUD de roles.
- `GROUP_TREASURY` no autoriza avisos, ingresos, pagos, validación, rechazo, condonación, corrección,
  reversión, devolución, Caja o balance.
- No existe acceso delegado a Grupo archivado ni consulta histórica para ex-tesoreros.
- No se ejecutó integración Auth real. La evidencia humana recibida se registra con el alcance exacto
  indicado debajo y no se extiende a recorridos no observados.
- No se desplegaron Functions, Rules o índices.

## Registro UAT humano y re-UAT ejecutable

### Confirmaciones humanas recibidas

- **UAT-01:** confirmado que el Owner actual puede conceder y revocar. El caso Owner sin Persona no
  fue observado humanamente; permanece respaldado sólo por pruebas automatizadas.
- **UAT-02:** confirmada la consulta delegada sin controles de escritura. Se registró la observación de
  terminología y se reemplazó “ocurrencias” por “cobros específicos” en la presentación del recorrido.
- **UAT-03:** confirmada humanamente la pérdida de acceso posterior a la revocación. No se atribuye
  evidencia humana al acceso directo de un integrante nunca autorizado; ese rechazo permanece como
  evidencia automatizada.
- **UAT-04:** confirmados múltiples tesoreros y la independencia entre cargo descriptivo y permisos.
- **UAT-05, UAT-06, UAT-07 y UAT-08:** confirmados según la evidencia humana recibida.
- **Re-UAT de presentación:** aprobados humanamente el texto **“Ver cobros específicos”** y el nombre
  correcto del Grupo en **Mis obligaciones**. Se elimina únicamente el pendiente visual de esos dos
  ajustes.

Estas confirmaciones no cierran E3-02 ni Etapa 3 y no amplían el alcance funcional de
`GROUP_TREASURY`.

Usar exclusivamente el entorno local con Emulator y cuentas de prueba. No ejecutar carreras manuales
ni intentar transferencia de ownership.

### Re-UAT focal de UAT-01 — aprobada con alcance registrado

El bloqueo inicial, su causa y el correctivo quedan conservados en este informe. La re-UAT recibida
aprobó concesión y revocación por el Owner actual. Los pasos técnicos siguientes permanecen como guía
reproducible y evidencia automatizada; no se atribuye ejecución humana al caso Owner sin Persona.

1. Usar una Cuenta Owner sin Persona y abrir su Grupo activo legacy o compatible.
2. Abrir **Acceso a Tesorería** y comprobar que carga integrantes e historia sin pedir Persona y sin
   informar pérdida de acceso.
3. Conceder acceso a un destinatario que tenga exactamente una Cuenta vinculada y Membresía elegible;
   comprobar **Vigente**. Revocarlo y comprobar **Revocado**.
4. Intentar conceder a una Persona de prueba sin vínculo válido a Cuenta y comprobar el rechazo
   comprensible. No crear ni reparar el vínculo desde Tesorería.
5. Crear la Persona del Owner mediante el flujo existente, volver al mismo Grupo y abrir nuevamente
   **Acceso a Tesorería**.
6. Comprobar que la historia anterior permanece, que el Owner puede volver a conceder/revocar y que
   no aparece **“Ya no tenés acceso a este Grupo.”**

La confirmación humana disponible aprueba UAT-01 para concesión y revocación del Owner actual. El caso
Owner sin Persona de los pasos 1, 2, 5 y 6 conserva exclusivamente evidencia automatizada. Estos pasos
no requieren carreras manuales ni operaciones inexistentes en la UI.

### Re-UAT focal de presentación — aprobada

1. Como tesorero, abrir Economía y comprobar que el botón, encabezado, ayuda y estado vacío usan
   **cobros específicos**, sin el término “ocurrencias” y sin controles de escritura.
2. Como integrante con obligaciones propias en dos Grupos, abrir **Mis obligaciones** y comprobar que
   cada tarjeta muestra el nombre correcto del Grupo, nunca un ID técnico.
3. Archivar uno de esos Grupos mediante el flujo existente y volver a **Mis obligaciones**. La
   obligación histórica y el nombre del Grupo archivado deben continuar visibles.
4. Confirmar que otro integrante no puede consultar esas obligaciones y que el navegador no realiza
   lecturas directas a la colección `groups` para resolver nombres.

La comprobación visual humana confirmó los puntos 1 y 2: terminología **“Ver cobros específicos”** y
nombre correcto del Grupo en **Mis obligaciones**. La conservación histórica del Grupo archivado y la
privacidad negativa de los puntos 3 y 4 permanecen acreditadas por pruebas automatizadas, sin
atribuirles observación humana adicional.

1. Iniciar los Emulators locales con el proyecto demo y el frontend local.
2. Con una Cuenta Owner, crear o abrir un Grupo activo con Temporada abierta y dos integrantes activos,
   cada Persona vinculada a una sola Cuenta.
3. En el detalle Owner, comprobar que **Acceso a Tesorería** está separado de **Economía** y que el
   cargo dice que no concede permisos.
4. Elegir un integrante, pulsar **Conceder acceso de consulta**, leer el alcance del modal y confirmar.
   Verificar el estado **Vigente** en la historia.
5. Ingresar como el destinatario. En **Grupos que integrás**, abrir **Economía · sólo consulta** y
   comprobar conceptos, cobros específicos y obligaciones, sin botones de creación, edición, desactivación,
   generación ni validación.
6. Ingresar como el segundo integrante y comprobar que no aparece la navegación de Economía ni se
   muestran datos económicos.
7. Como Owner, cambiar el cargo descriptivo del tesorero y comprobar que la navegación y consulta no
   cambian.
8. Revocar desde el modal Owner. Volver a la vista abierta del tesorero e intentar cargar otra
   ocurrencia o página; debe vaciar los datos y mostrar **Tu acceso de consulta a Tesorería ya no está
   vigente**.
9. Conceder nuevamente y comprobar que la historia contiene un hecho revocado y otro vigente.
10. Finalizar la Membresía desde el flujo Owner existente. Verificar que el acceso desaparece y la
    historia permanece. Si se reactiva mediante el flujo disponible, comprobar que no vuelve hasta una
    nueva concesión.
11. Renovar a otra Temporada mediante el flujo existente y comprobar que la nueva Membresía no hereda
    el acceso.
12. Finalizar las Membresías, cerrar la Temporada y archivar el Grupo con los flujos existentes.
    Comprobar que el Owner conserva la consulta económica histórica E3-01, que no aparecen controles de
    Tesorería y que el tesorero no accede.

La aceptación humana debe registrar navegador, cuentas sintéticas usadas, resultado por paso y captura
de cualquier error. A → B → A, carreras de slots y pérdida de respuesta permanecen como evidencia
automatizada; no son pasos manuales.
