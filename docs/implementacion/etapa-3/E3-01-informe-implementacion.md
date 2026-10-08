# E3-01 — Informe único de implementación local

## Estado y alcance

- Fecha de verificación: 2026-10-08.
- Checkpoint de entrada: rama `feat/e3-01-membership-obligations`, HEAD `fd0070868a99e5eb4c4206b1765500cf322c6cad`, implementación local sin stage.
- El versionado e integración autorizados se realizan después de cerrar este contenido; no hubo deploy, Firebase remoto, migración, backfill ni borrado de datos.
- Alcance implementado: conceptos Owner, ocurrencias explícitas, candidatas MONTHLY, generación por fila, consultas Owner/propias, Rules, índices y bloqueo de CU-015 por referencias Pago.
- No se implementaron Tesorería, avisos, ingresos, validación de pagos, correcciones, condonaciones, reversiones, Caja, pasarelas, liquidación sobre archivados ni cambios a pagos de Torneos/partidos sociales.
- Este informe no declara cerrado E3-01 ni Etapa 3. Registra las confirmaciones humanas recibidas y delimita expresamente qué evidencia continúa siendo sólo automatizada.

## Comportamiento implementado

### Backend y dominio

- Once callables backend-only implementan los contratos cerrados de creación/listado/edición/desactivación de conceptos, listado/creación de ocurrencias, candidatas mensuales, generación y consultas.
- Conceptos `MONTHLY | ONE_TIME`, moneda fija `ARS`, centavos enteros, versión positiva y snapshot inmutable.
- Receipts de comandos e intents de generación usan IDs/hash SHA-256; nunca persisten la idempotency key cruda.
- La generación reclama un intent durable con snapshot común y crea una fila durable por Membresía. Cada fila se confirma en una transacción independiente.
- Estados técnicos: `PENDING | UNCERTAIN`; outcomes terminales: `CREATED | EXISTING | FAILED`; salida incierta: `PENDING_RECOVERY`.
- Recovery reautoriza al Owner, preserva terminales, reconcilia Pago/intent/fila y no exige concepto activo para recuperar un resultado ya confirmado.
- `EXISTING` compara el payload económico persistido completo. Una diferencia produce `FAILED/OBLIGATION_PAYLOAD_CONFLICT` sin sobrescritura.
- El ID de Pago deriva de la clave económica discriminada y comparte el punto de serialización con la creación del documento.
- Grupo, Temporada, concepto, ocurrencia y Membresía se releen en la transacción de cada fila pendiente. Desactivación, archivo, cierre/finalización y generaciones concurrentes serializan sobre esas lecturas.
- La capacidad pública `membershipObligationEligibilityCapability` pertenece al módulo Membresías y se invoca dentro de la transacción de Pagos. No escribe ni repara Membresía/Períodos.
- Compatibilidad de Membresía v1–v6 por forma estructural: v1/v2 y v5 legacy usan fechas autoritativas; v3/v4/v5 period-aware/v6 validan fronteras y Períodos reales.
- MONTHLY usa intervalos semiabiertos en `America/Argentina/Buenos_Aires`, continúa después de Períodos vacíos y pagina internamente de a 20 sin un máximo artificial. Errores técnicos agotados, incluidos `resource-exhausted`, conservan recovery.
- ONE_TIME exige ocurrencia exacta, Temporada abierta y Membresía activa; nunca usa `periodKey` ni admite finalizadas.
- Consulta propia deriva `personaId` de la Cuenta autenticada y consulta exclusivamente sus Pagos. El DTO omite `personId`, UID, hashes, schemas y paths.
- Grupo archivado admite listados Owner/propios; toda mutación E3-01 queda denegada.
- Cualquier documento `payments` correlacionado por `groupId` se incorpora al detector funcional que bloquea eliminación de Grupo; no hay cascada.

### Frontend canónico

- Sección Owner **Economía** dentro del detalle canónico del Grupo.
- Alta y administración de conceptos, incluida versión visible, cambio de nombre/importe y desactivación.
- MONTHLY: mes BA vigente/pasado, listado paginado de activas/finalizadas, elegibilidad visible y selección sólo de `ELIGIBLE`.
- ONE_TIME: la lista de ocurrencias se obtiene antes de habilitar su creación; luego se selecciona una identidad estable y se usa roster activo.
- Confirmación de importe general, vencimiento, excepciones por fila con motivo, outcomes parciales y reintento de la misma intención cuando existe recovery.
- Consulta Owner paginada, incluso en Grupo archivado read-only.
- Ruta separada `/dashboard/obligations` y navegación “Mis obligaciones” para integrante/exintegrante.
- Estados loading, vacío, error, parcial/recovery, botones single-flight y feedback `aria-live`/foco.

## Contratos y persistencia efectivos

### Callables

- `createGroupChargeConcept`
- `renameGroupChargeConcept`
- `changeGroupChargeConceptDefaultAmount`
- `deactivateGroupChargeConcept`
- `listGroupChargeConcepts`
- `listChargeOccurrences`
- `createChargeOccurrence`
- `listOwnerMonthlyMembershipCandidates`
- `generateMembershipObligations`
- `listGroupObligations`
- `listMyObligations`

Todos validan objetos cerrados, límites de texto/bytes, IDs, fechas civiles, mes no futuro, importes `1..999_999_999_999`, páginas y lotes. El cliente no aporta actor, Persona, Temporada, moneda, estado, timestamps ni paths.

### Colecciones

- `groupChargeConcepts/{conceptId}`
- `groupChargeOccurrences/{occurrenceKey}`
- `payments/{paymentId}`
- `paymentGenerationIntents/{intentId}`
- `paymentGenerationIntents/{intentId}/rows/{membershipId}`
- `paymentCommandReceipts/{receiptId}`

Los documentos económicos e idempotentes usan hidratación cerrada y timestamps backend. Rules niega lectura y escritura directa de cliente en todas estas rutas, incluidas filas de intent.

### Índices

Se declararon exactamente los cuatro índices compuestos de la ficha:

1. `groupChargeConcepts(groupId ASC, name ASC)`;
2. `groupChargeOccurrences(groupId ASC, conceptId ASC, createdAt DESC)`;
3. `payments(groupId ASC, dueDate DESC)`;
4. `payments(personId ASC, dueDate DESC)`.

La selección MONTHLY reutiliza el índice existente de Membresías. Períodos usa el índice simple `startedAt` con desempate documental.

## Archivos modificados o agregados

- Backend E3-01: `functions/src/payments/{application,domain,infrastructure}`, once archivos `functions/callables/*Charge*|*Obligations*|*MonthlyMembershipCandidates*` y exports en `functions/index.js`.
- Capacidades públicas: `functions/src/memberships/public/membershipObligationEligibilityCapability.js` y `functions/src/persons/public/paymentPersonPresentationCapability.js`.
- Seguridad/configuración: `firestore.rules`, `firestore.indexes.json`.
- Lifecycle de Grupo: `functions/src/groups/infrastructure/firestoreGroupDeletionStore.js`.
- Pruebas: `functions/test/unit/paymentE3.test.js`, `paymentArchitecture.test.js`, `functions/test/emulator/paymentE3.test.js` y registro focal en `run-emulator-tests.js`.
- Verificación focal previa a UAT: `functions/test/emulator/paymentE3Callable.test.js`, `paymentE3Serialization.test.js` y hooks opcionales de fallo exclusivamente inyectables al construir `firestorePaymentStore`.
- Frontend: `src/types/Payment.ts`, `src/services/paymentsService.ts`, `src/components/payments/*`, ruta `dashboard/obligations`, detalle de Grupo y navegación desktop/mobile.
- Evidencia: este informe.

## Verificación automatizada

- Preflight: rama y HEAD esperados; árbol e índice inicialmente limpios; sin diferencias contra el checkpoint indicado.
- Unit suite completa: `367/367` aprobadas tras incorporar la primera cobertura E3-01.
- Unit focal final E3-01: `7/7` aprobadas.
- Functions syntax final tras los correctivos focales: `346/346` archivos JavaScript aprobados.
- Emulator focal final, Auth + Firestore + Functions, proyecto `demo-sportexa-e0-02`, datos sintéticos: `26/26` pruebas Node aprobadas. Conserva la evidencia anterior y agrega segundo mes MONTHLY, presentación mínima Owner y reproducción callable de UAT-08.
  - ownership y aislamiento;
  - concepto versionado/idempotente;
  - finalizadas elegibles;
  - historia de 25 Períodos donde 24 vacíos posteriores obligan a consultar una segunda página para hallar el solapamiento;
  - snapshots y payload conflict;
  - terminales estables;
  - dos intents concurrentes con keys distintas y una sola obligación;
  - reconciliación de fila `UNCERTAIN` con Pago confirmado después de desactivar concepto;
  - ONE_TIME sólo sobre activa;
  - archivo read-only;
  - Rules deny-all;
  - referencia Pago bloqueando eliminación sin cascada.
- Recorrido callable HTTP real, con tres clientes sintéticos autenticados por Auth Emulator y un cliente anónimo:
  - el Owner crea el concepto, genera la obligación, la consulta y obtiene el mismo intent/outcome al repetir exactamente la solicitud;
  - el integrante obtiene una única obligación propia y un actor ajeno obtiene lista propia vacía, sin `groupId` expuesto;
  - actor ajeno y anónimo no generan Pago ni intent autorizado; un campo de autoridad adicional (`actorUserId`) da `VALIDATION_FAILED` y no crea concepto;
  - la misma `generationIdempotencyKey` con otra fecha da `IDEMPOTENCY_CONFLICT`; permanece un solo Pago.
- Unit focal E3-01 tras el correctivo: `7/7` aprobadas (`paymentE3.test.js` y `paymentArchitecture.test.js`); no se repitió la suite unitaria completa.
- Frontend typecheck: aprobado.
- Frontend lint baseline: aprobado; `36` errores y `9` warnings preexistentes, `0` deuda nueva y `9` hallazgos resueltos respecto del baseline.
- Frontend build Next.js: aprobado, incluida la ruta estática `/dashboard/obligations`.
- `git diff --check`: aprobado; sólo avisos informativos de conversión LF/CRLF de Git para archivos existentes.

La evidencia anterior del store transaccional y Rules se conserva. La cobertura adicional invoca los exports desplegados por Functions Emulator mediante el protocolo callable HTTP y tokens emitidos por Auth Emulator; ya no se limita a arquitectura/sintaxis. Se registró la UAT humana informada por el usuario, sin integrar una rama Auth/UAT, Firebase remoto ni deploy.

## Evidencia focal de serialización

Todas las pruebas siguientes están en `functions/test/emulator/paymentE3Serialization.test.js`, salvo donde se indica otra ruta. Los hooks agregados no cambian el flujo productivo: son callbacks opcionales de construcción usados para ubicar de forma determinista un cambio o fallo antes/después de los puntos durables.

| Familia | Prueba concreta | Resultado esperado y observado |
| --- | --- | --- |
| Concepto antes/después del claim | `cambio de concepto antes del claim rechaza stale; después conserva el snapshot reclamado` | Cambio previo: `CONCEPT_VERSION_STALE` y cero intents. Rename posterior al claim: `CREATED` con el nombre/versión del snapshot reclamado, no con la edición posterior. |
| Desactivación antes/después de crear la fila | `desactivación antes del claim rechaza sin filas; después del claim terminaliza la fila` | Previa: `CHARGE_CONCEPT_DEACTIVATED`, sin fila. Posterior al claim, cuando intent y fila ya existen: fila terminal `FAILED/CHARGE_CONCEPT_DEACTIVATED`, sin Pago. |
| Archivo de Grupo | `archivo de Grupo y cierre de Temporada posteriores al claim impiden confirmar` | Archivo posterior al claim: `FAILED/GROUP_NOT_OPERATIONAL`, sin confirmar Pago. El archivo previo ya está cubierto por `archivo conserva consultas y bloquea toda mutación nueva` en `paymentE3.test.js`. |
| Cierre de Temporada | misma prueba anterior | Cierre canónico posterior al claim: `FAILED/OPEN_SEASON_REQUIRED`. Un cierre previo se observa en el mismo punto de relectura y produce el mismo outcome por fila. |
| Finalización de Membresía | `finalización de Membresía posterior al claim bloquea ONE_TIME` | Finalización posterior al claim: `FAILED/MEMBERSHIP_NOT_ELIGIBLE`. Para MONTHLY una finalizada que solapa el mes continúa siendo elegible por contrato; no se atribuye a esa finalización un rechazo genérico. |
| Pérdida de ownership | `pérdida de ownership después del claim revoca generación y recovery` | El ex-Owner recibe `GROUP_NOT_ACCESSIBLE`, la fila queda `PENDING`, no hay Pago y su retry/recovery también queda revocado. |
| Fallo antes de confirmar | `fallo técnico inyectado antes de confirmar deja UNCERTAIN recuperable` | Un `unavailable` inyectado durante la ejecución devuelve `PENDING_RECOVERY`, persiste `UNCERTAIN`, no escribe Pago ni falso `FAILED`; el retry crea exactamente uno. |
| Pérdida de respuesta | `pérdida de respuesta inyectada tras commit conserva CREATED y retry único` | El primer cliente ve `PENDING_RECOVERY`, pero fila y Pago ya están `CREATED`; el retry reconcilia `CREATED` y sigue existiendo un solo Pago. |

La prueba anterior `recovery incierto reconcilia Pago confirmado aun con concepto luego desactivado` prepara `UNCERTAIN` sintéticamente mediante Admin SDK. Se conserva como prueba de reconciliación de estado preparado, pero no se presenta como equivalente al fallo antes del commit ni a la pérdida de respuesta después del commit: esos dos casos ahora tienen inyección durante la ejecución.

## Correctivos focales aplicados

- `functions/src/payments/infrastructure/firestorePaymentStore.js`: admite hooks opcionales de prueba después del claim, antes de la transacción de fila y después del commit. La instancia productiva no los configura; no cambia contratos, persistencia ni outcomes.
- `functions/test/emulator/paymentE3Callable.test.js`: agrega el recorrido callable autenticado/anónimo y las comprobaciones de cero efecto, autoridad e idempotencia.
- `functions/test/emulator/paymentE3Serialization.test.js`: agrega las fronteras de serialización y las dos inyecciones técnicas diferenciadas.
- `functions/test/run-emulator-tests.js`: incorpora ambas pruebas al selector `E3_01_FOCAL=1` y a la suite general, sin ejecutar esta última durante el checkpoint.
- No se modificaron normas, D5-043, D5-044, el tratamiento aprobado y riesgo residual de D5-045, Auth/UAT, migraciones ni superficies ajenas a E3-01.

### Correctivos derivados de UAT

- `OwnerEconomySection.tsx`: reemplaza los `window.prompt` de nombre/importe por un modal del sitio con `role="dialog"`, título asociado, foco inicial, Escape, cancelar/confirmar, validación y estado `Guardando…`. Un ref sincrónico conserva single-flight; la idempotency key se crea sólo al confirmar.
- El cambio de concepto, mes u ocurrencia limpia selección, excepciones, outcomes y recovery del contexto anterior. Cambiar vencimiento también invalida outcomes/recovery visibles, sin tocar obligaciones históricas.
- El botón de generación exige fecha, selección elegible, ocurrencia cuando corresponde y excepciones completas. Cada Membresía muestra el importe general y ofrece **Usar otro importe**; importe alternativo y motivo sólo aparecen al activarlo. Coincidencia con el importe general se explica y bloquea antes del envío.
- ONE_TIME se presenta como **Cobro específico**, con explicación y ejemplo, conservando listado previo, identidad estable y reutilización.
- Estados de concepto y Pago se traducen y se muestran en badges textuales accesibles. Los outcomes de generación se presentan separadamente como `Creada`, `Ya existente`, `No generada` o `Pendiente de recuperación`; los códigos de error se traducen.
- La consulta administrativa de obligaciones incorpora `person: { status, firstName, lastName }` desde `paymentPersonPresentationCapability`. No agrega email; la consulta propia continúa omitiendo Persona y `groupId`.
- En Grupo archivado los conceptos se renderizan como historia, no como controles seleccionables. Así no se dispara el roster operativo; `listGroupChargeConcepts`, `listGroupObligations` y la consulta propia permanecen disponibles y las mutaciones siguen bloqueadas.
- Cobertura agregada: MONTHLY crea una obligación distinta para otro mes elegible y conserva la anterior; `EXISTING`/retry mantienen unicidad y snapshot; DTO Owner muestra nombre/apellido y DTO propio no lo expone.

### Ajuste focal de interacción en Economía

- La alta de concepto queda inicialmente cerrada. Un botón **Crear concepto**, alineado con el título **Economía** y apilable en pantallas pequeñas, expone/oculta `create-charge-concept-form` mediante `aria-expanded` y `aria-controls`.
- El botón interno se denomina **Guardar**. Un éxito actualiza el listado, limpia nombre/importe/tipo y cierra el formulario; un error conserva formulario y borrador. El cierre manual también conserva el borrador durante la vista.
- El guard sincrónico `busyRef` evita doble envío antes del siguiente render. La idempotency key continúa creándose dentro del intento confirmado, sin reutilizar claves de borradores cancelados.
- Se separó `expandedConceptId` de `selectedConceptId`: cerrar el mismo concepto sólo oculta el panel y conserva selección, excepciones, resultados y recovery; abrirlo de nuevo recupera la misma vista. Cambiar a otro concepto actualiza el contexto e invalida esos estados como antes.
- Cada concepto activo usa un botón real con `aria-expanded` y `aria-controls`; Enter/Espacio conservan la operación nativa. Un segundo clic cierra, y abrir otro deja un único panel expandido. Conceptos inactivos y cualquier concepto de Grupo archivado permanecen como información histórica sin controles.
- Verificación frontend afectada: typecheck aprobado; lint baseline aprobado con `36` errores y `9` warnings conocidos, `0` deuda nueva y `9` hallazgos resueltos; build Next.js aprobado con `/dashboard/obligations`. No se repitieron Emulator, Functions syntax ni suites backend.
- El proyecto no dispone de runner de componentes para simular clics. Apertura/cierre, ramas de éxito/error y single-flight se verificaron por flujo de estado, tipos, lint y build; la interacción de navegador queda enumerada en re-UAT y no se presenta como automatizada.

## Registro de UAT humana

No constituye aprobación integral ni cierre.

### Hallazgos funcionales

| Caso | Resultado informado | Estado tras correctivo |
| --- | --- | --- |
| UAT-01 | Confirmada por el usuario. | Evidencia conservada. |
| UAT-02 | Confirmada por el usuario. | Evidencia conservada. |
| UAT-03 | Snapshots conservados; se observó diálogo nativo al editar. | Snapshot y modales del sitio confirmados humanamente. |
| UAT-04 | Las Membresías probadas comenzaron en octubre de 2026; septiembre fue rechazado. | Comportamiento aclarado: el rechazo de septiembre es correcto por ausencia de vigencia y no implica una prohibición general de meses pasados. La generación para otro mes elegible sin obligación previa conserva evidencia automatizada; no se registra como una nueva ejecución humana. |
| UAT-05 | ONE_TIME sobre activa confirmado; hubo confusión y error al usar excepciones. | **Usar otro importe** confirmado humanamente; reglas económicas intactas. |
| UAT-08 | Archivo realizado; al seleccionar luego un concepto apareció “Los datos canónicos son incompatibles”. | Causa reproducida y acción indebida eliminada; consultas históricas Owner/propias y restricciones de mutación tras archivo confirmadas humanamente. |

### Observaciones de presentación

- UAT-06/07: estados en español confirmados humanamente. Se mantienen como observaciones de presentación, no como fallo de persistencia; los badges incluyen texto y la vista Owner usa nombre/apellido.
- Los IDs de Membresía dejan de ser la identificación principal en resultados y obligaciones administrativas. La ausencia de proyección se expresa como **Persona no disponible**.
- El cambio de contexto y su limpieza de selección/excepciones/resultados fue confirmado humanamente. Las obligaciones históricas permanecen y no pertenecen al estado descartable del formulario.
- Los toggles de alta y de conceptos fueron confirmados humanamente.
- La reutilización de una obligación existente fue confirmada sin duplicación ni modificación de su snapshot.

### Causa reproducida de UAT-08

- Ruta UI: `/dashboard/groups/<groupId>`, sección **Economía**, selección de concepto después de archivar.
- Secuencia anterior para ONE_TIME: `listChargeOccurrences` seguida de `listActiveGroupMembersForOwnedGroup`.
- Respuesta reproducida: las consultas económicas `listGroupChargeConcepts` y `listGroupObligations` responden; `listActiveGroupMembersForOwnedGroup` devuelve `FAILED_PRECONDITION`, reason `INCOMPATIBLE_STATE`, mensaje `Group roster context is incompatible`.
- Condición: el reader de roster requiere contexto Owner con Grupo operativo/Temporada abierta. Un Grupo archivado es válido para historia económica, pero no para armar roster de una generación nueva.
- Clasificación: acción operativa ofrecida indebidamente por la UI. No se ocultó ni reparó una incompatibilidad persistida; se dejó de invocar esa acción en modo read-only.

## Limitaciones y desviaciones concretas

- UAT humana registrada: UAT-01/02, snapshots/modales de UAT-03, limpieza al cambiar contexto, **Usar otro importe**, estados en español, toggles, consultas/restricciones tras archivo y reutilización de obligación sin duplicación ni modificación están confirmados. En UAT-04, la prueba humana sólo acredita el rechazo correcto de septiembre por falta de vigencia desde octubre de 2026; el segundo mes elegible conserva evidencia automatizada, no una nueva ejecución humana.
- No se ejecutó una matriz general de estabilidad ni se repitió E2-14/E2-14 completa, conforme a la restricción.
- D5-045 no reapareció en los flujos E3-01 ejecutados. Esto no lo declara solucionado ni reemplaza su reevaluación productiva pendiente.
- El warning de `caniuse-lite` con nueve meses de antigüedad apareció durante build; no afecta compilación y no se actualizaron dependencias por estar fuera de alcance.
- No hay índices desplegados: sólo quedó actualizada la declaración local autorizada.
- No se efectuaron migraciones ni reparación de datos incompatibles; esos datos fallan cerrados o quedan recuperables según corresponda.

## Guía UAT humana ejecutable

### Arranque local

Usar PowerShell y mantener ambos procesos abiertos. El proyecto de UAT es `demo-sportexa-e2-04`, que coincide con `volley-ranking-frontend/.env.local`; no usar el proyecto focal automatizado `demo-sportexa-e0-02` para la UI.

Terminal 1:

```powershell
cd C:\Users\Rodolfo\Documents\projectoVoley\volley-ranking-system
npx firebase-tools emulators:start --project demo-sportexa-e2-04 --config firebase.json --only auth,firestore,functions
```

Puertos: Auth `9099`, Firestore `8080`, Functions `5001`, Emulator UI `4000`. Functions callable queda bajo `http://127.0.0.1:5001/demo-sportexa-e2-04/us-central1/<nombre>`.

Terminal 2:

```powershell
cd C:\Users\Rodolfo\Documents\projectoVoley\volley-ranking-frontend
npm run dev
```

Abrir `http://localhost:3000`. Rutas relevantes: detalle de Grupo `/dashboard/groups/<groupId>` (sección **Economía**) y consulta personal `/dashboard/obligations` (**Mis obligaciones**).

### Cuentas y datos sintéticos mínimos

El frontend usa Google sign-in. En el selector simulado de Auth Emulator crear, sin contraseña real, estas identidades `example.invalid`:

| Rol | Identidad sintética | Preparación desde la UI |
| --- | --- | --- |
| Owner | `owner.e301@example.invalid` | Completar onboarding, crear un Grupo y abrir su Temporada 2026. |
| Integrante | `member.e301@example.invalid` | Completar onboarding, solicitar ingreso al Grupo; el Owner aprueba. |
| Exintegrante | `former.e301@example.invalid` | Completar onboarding, ingresar con aprobación y luego finalizar/salir de la Membresía manteniendo solapamiento con el mes elegido. |
| Actor ajeno | `foreign.e301@example.invalid` | Completar onboarding, pero no solicitar ni obtener Membresía en ese Grupo. |

Datos mínimos resultantes: un Grupo activo, una Temporada abierta, un Owner, una Membresía activa, una finalizada y una Persona ajena. No se requieren documentos económicos manuales. Si se reinician los emuladores sin `--import`, repetir esta preparación; el script histórico `seed:dev` no está presente en este checkout y no forma parte de esta guía.

### Pasos humanos desde la UI

1. Como Owner, abrir **Economía**, crear un concepto MONTHLY y comprobar nombre normalizado, ARS, versión 1 y estado activo.
2. Cambiar importe; generar para integrante y exintegrante en un mes que ambos solapen; volver a cambiar nombre/importe y comprobar que las obligaciones anteriores conservan snapshot.
3. Cambiar el mes y verificar que invalida la selección; sólo filas `ELIGIBLE` deben poder seleccionarse.
4. Generar un lote con importe general y una excepción motivada. Verificar un outcome visible por fila y que un segundo envío deliberado de la misma intención no duplica.
5. Crear un concepto ONE_TIME: listar ocurrencias, crear una, seleccionar roster activo y comprobar que la Membresía finalizada no puede recibirla.
6. Desactivar el concepto. Verificar que no admite generación nueva y que obligaciones/outcomes anteriores siguen consultables.
7. Como integrante y exintegrante, abrir **Mis obligaciones**: sólo deben ver economía propia. Como actor ajeno, la lista debe quedar vacía y no debe aparecer operación Owner del Grupo.
8. Como Owner, archivar el Grupo con obligaciones: las consultas siguen disponibles y las mutaciones E3-01 quedan bloqueadas.
9. En preparación de eliminación, leer los blockers por separado: un Pago produce `FUNCTIONAL_REFERENCES_EXIST`; las entidades estructurales producen `MEMBERSHIPS_EXIST` y/o `SEASONS_EXIST`. No atribuir a Pago un rechazo genérico provocado por Membresía o Temporada. En todos los casos, verificar ausencia de cascada.

Los casos técnicos de idempotency conflict, actor anónimo, campos de autoridad, `UNCERTAIN`, pérdida de respuesta y carreras alrededor del claim pertenecen a la automatización focal. La UAT humana no debe fabricar documentos internos, forzar `UNCERTAIN` ni coordinar carreras de transacciones.

### Resultado de la re-UAT focal

1. Modales del sitio, limpieza del estado descartable al cambiar contexto, **Usar otro importe** y estados en español: confirmados humanamente.
2. Reutilización de una obligación existente: confirmada sin actualización ni duplicación.
3. Grupo archivado: consultas históricas Owner/propias y ausencia/bloqueo de mutaciones confirmadas humanamente, sin reaparición del error canónico en el recorrido informado.
4. UAT-04: septiembre se rechazó correctamente porque las Membresías probadas empezaron en octubre de 2026. Esto no prohíbe generar meses pasados que sí estén dentro de la vigencia. La generación para otro mes elegible fue comprobada por automatización focal, no por una nueva ejecución humana.

### Resultado del ajuste de interacción

1. Los toggles del formulario de alta y de conceptos fueron confirmados humanamente.
2. La conservación del borrador, las ramas de alta exitosa/error y el guard single-flight permanecen respaldados por revisión de flujo, typecheck, lint baseline y build; no se inventa una confirmación humana separada para cada rama.
3. En Grupo archivado no se ofrece alta, expansión operativa ni mutaciones; las consultas históricas y restricciones fueron confirmadas humanamente.

## Checkpoint previo al versionado

- Rama: `feat/e3-01-membership-obligations`.
- HEAD de entrada: `fd0070868a99e5eb4c4206b1765500cf322c6cad`.
- Índice Git: sin stage.
- Working tree inventariado: contiene exclusivamente la implementación y evidencia E3-01 descritas; el versionado parte de este conjunto explícito.
- Estado administrativo: implementación verificada y autorizada para versionado/integración; cierre de E3-01 y Etapa 3 no declarado.
