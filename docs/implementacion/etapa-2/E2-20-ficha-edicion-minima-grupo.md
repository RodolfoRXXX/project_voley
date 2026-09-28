# E2-20 — Ficha de Incremento Implementable: edición mínima canónica del Grupo

## Estado de la ficha

- **Incremento:** E2-20.
- **Caso de uso:** CU-012 — Editar la información del Grupo.
- **Corte aprobado:** reemplazo completo y exclusivo de `nombre`.
- **Actor:** Owner vigente del Grupo.
- **Aggregate Root:** Grupo.
- **Estado:** `APROBADA DOCUMENTALMENTE — IMPLEMENTACIÓN NO INICIADA`.
- **Base verificada:** `dev` y `origin/dev` en
  `a9fdd1e18edf2493fa65c441956df103c593663c`.

Esta ficha define un corte vertical implementable. No crea rama, código, Rules, índices, pruebas,
commit, deploy ni acceso remoto; no inicia E2-21; no cierra E2-14 ni la Etapa 2 y no habilita E3.

## 1. Objetivo

Permitir que el Owner vigente reemplace el nombre del Grupo canónico v1 mediante un contrato backend
cerrado, con autorización contextual, concurrencia optimista, idempotencia durable, recovery,
frontend accesible y cero mutaciones sobre otros Agregados.

E2-20 concreta CU-012 como edición mínima de la información identificatoria ya existente. No es un
PATCH genérico y no anticipa configuración, archivo, eliminación, transferencia de ownership ni
administración de Membresías.

## 2. Fuentes y precedencia

Se aplican, en orden:

1. Documentos 1, 1.5 y 2.
2. Documentos 3 y 4 AUD-C05 y sus adendas.
3. Documento 5 vigente.
4. E2-01 y E2-13 completos.
5. E2-14, E2-15 a E2-19 y la corrección decisoria de CU-030.
6. Código, contratos, schemas, Rules, frontend, pruebas e historial Git integrados hasta E2-19 como
   evidencia física, sin elevarlos a norma.

Documento 1 identifica `nombre`, descripción, deporte, configuración y Owner como información propia
de Grupo. Documento 2 separa CU-012 de configurar, archivar y eliminar. Documento 5 exige frontend
en el mismo incremento, retiro por flujo, contratos cerrados y señalamiento previo de reglas faltantes.

### 2.1 Evidencia física de implementabilidad

La base indicada contiene, sin necesidad de diseñar infraestructura nueva:

- `groups/domain/group.js`: schema v1 cerrado, hidratador estricto y normalización canónica de nombre;
- `firestoreGroupRepository.js`: referencia e hidratación centralizadas; requiere agregar una capacidad
  de update parcial, no otro repositorio;
- `groupContract.js`, `groupDto.js`, `groupService.js`, `groupCallable.js` y `groupModule.js`: capas y
  readers Owner-scoped existentes donde extender contrato, DTO de lectura y wiring;
- `groupHashing.js`: SHA-256 length-prefixed disponible mediante `node:crypto`;
- el patrón integrado de edición de Temporada: token, receipt cerrado, transacción, recovery,
  `NO_CHANGES`, stale y frontend; es evidencia reutilizable, no autorización para copiar sus campos
  ajenos a Grupo;
- `firestore.rules`: update cliente de `groups` ya denegado y patrón deny-all de receipts;
- `groupsService.ts`, `OwnGroup.ts`, detalle y listados canónicos: superficies frontend concretas a
  adaptar;
- runners unitarios, arquitectónicos y Emulator existentes, donde registrar cobertura focal sin crear
  otro ejecutor.

## 3. Delimitación de CU-012

### 3.1 Incluido

- reemplazo completo del valor de `nombre`;
- normalización y validación autoritativas en backend;
- lectura del token de edición desde la consulta Owner-scoped;
- actualización atómica de raíz y receipt;
- actualización de las presentaciones canónicas que vuelvan a consultar el Grupo.

### 3.2 Diferencias con casos vecinos

| Capacidad | Razón de exclusión de E2-20 |
| --- | --- |
| CU-013 — configurar Grupo | Requiere definir catálogos descriptivos, roles deportivos, cargos y permisos; no es información identificatoria mínima |
| CU-014 — archivar/inactivar | Modifica estado y lifecycle del Grupo; exige reglas sobre Temporadas, Membresías, Solicitudes y consumidores deportivos |
| CU-015 — eliminar | Es destrucción física excepcional y requiere demostrar ausencia de actividad, historia y referencias |
| Transferencia de ownership | Cambia la relación de propiedad y su autorización; posee reglas propias |
| Plan/Suscripción | La habilitación comercial no modifica recursos deportivos |
| Administración de Membresías | Pertenece al Aggregate Root Membresía y a sus casos específicos |
| Configuración deportiva futura | Debe ser multi-deporte y depender de catálogos aprobados, no de constantes de vóley |

## 4. Matriz definitiva de campos

| Campo actual | Decisión E2-20 | Fundamento |
| --- | --- | --- |
| `nombre` | Editable mediante reemplazo completo | Información propia, ya presente y validada en Grupo v1 |
| `deporte` | Inmutable | Cambiarlo puede invalidar configuración, posiciones, Membresías, Partidos, Torneos e historia; no existe transición aprobada |
| `ownerId` | Inmutable | Sólo puede cambiar mediante transferencia de ownership, fuera de CU-012 |
| `estado` | Inmutable | Pertenece a CU-014; E2-20 sólo opera sobre Grupo v1 activo |
| ID del documento | Inmutable | Identidad del Aggregate Root |
| `schemaVersion` | Inmutable, continúa en `1` | Editar nombre no cambia la forma de la raíz |
| `createdAt` | Inmutable | Metadata autoritativa de creación |
| timestamps o metadata nuevos | No se agregan a la raíz | E2-20 no introduce `updatedAt`, actor, revisión ni historial dentro de Grupo |

`descripcion`, configuración, visibilidad, catálogos, roles, cargos, permisos y cualquier campo no
presente no se agregan. Una capacidad futura deberá aprobar su semántica y evolución de schema.

La escritura física debe ser un update con field path exclusivo `nombre`; no se reemplaza el documento
completo. Por lo tanto `deporte`, `ownerId`, `estado`, ID documental, `schemaVersion`, `createdAt` y
cualquier otra propiedad que llegue a ser válida en una evolución compatible del schema permanecen
byte-equivalentes. En el schema v1 vigente no existen propiedades adicionales válidas: cualquier extra
hace fallar la hidratación y no se reescribe. La escritura técnica separada del receipt no altera esta
garantía sobre `groups/{groupId}`.

## 5. Actor y autorización

La operación exige:

1. Firebase Auth con UID válido;
2. Cuenta propia existente y compatible;
3. Grupo canónico existente y compatible;
4. `groups/{groupId}.ownerId == uid` al confirmar la transacción.

Persona y Membresía propias son irrelevantes. Un Owner sin Persona o sin Membresía puede editar el
nombre. No autorizan:

- `users.roles` o rol global;
- arrays legacy;
- Persona;
- Membresía o cargo;
- conocimiento del ID;
- Plan o Suscripción.

Grupo inexistente y Grupo ajeno convergen públicamente en `GROUP_NOT_ACCESSIBLE`. La operación no
debe permitir enumerar Grupos.

## 6. Schema y dominio

Grupo conserva exactamente schema v1:

```text
nombre
deporte
ownerId
estado: "activo"
createdAt
schemaVersion: 1
```

La operación de dominio `renameGroup` —nombre interno orientativo, no contrato público obligatorio—
recibe una raíz v1 rehidratada y un nombre normalizado. Devuelve otra raíz con idénticos ID,
`deporte`, `ownerId`, `estado`, `createdAt` y `schemaVersion`, cambiando únicamente `nombre`.

No se toleran campos extra, schemas desconocidos ni coerción de documentos legacy. E2-20 no migra,
adopta, repara ni reescribe Grupos no canónicos.

## 7. Validación de nombre

Se reutiliza sin divergencias la regla canónica de E2-01:

- el valor debe ser string;
- normalización Unicode NFC;
- trim de extremos;
- colapso de whitespace interno a un espacio;
- rechazo de caracteres de control Unicode `Cc`;
- longitud normalizada entre 1 y 80 puntos de código;
- sin coerción de números, objetos, arrays o valores nulos.

La comparación de no-op se realiza después de normalizar. El backend es la autoridad aunque el
frontend aplique validaciones equivalentes para feedback temprano.

## 8. Token de edición y concurrencia optimista

`getOwnGroup({ groupId })` conserva `group` y agrega `editToken`, calculado sólo por backend para una
raíz v1 válida. Listados y DTO públicos que no ejecutan edición no exponen el token.

El token es el digest hexadecimal minúsculo SHA-256 length-prefixed bajo el namespace
`sportexa:E2-20:group-edit-token:v1` y liga exactamente, en este orden:

1. `contract-v1`;
2. `groupId`;
3. `ownerId` vigente;
4. `nombre` normalizado vigente.

`groupId` evita reutilización transversal; `ownerId` invalida una edición preparada por un Owner
anterior; `nombre` detecta exactamente la sobrescritura obsoleta que este incremento debe impedir; el
namespace y `contract-v1` separan algoritmos y versiones de contrato. No se incluyen `deporte`,
`estado`, `schemaVersion`, `createdAt`, timestamps, metadata ni campos ajenos: sus cambios no son el
conflicto de edición protegido y ligarlos produciría stale espurio. Schema, estado operativo y demás
precondiciones se validan de manera autoritativa y separada dentro de la transacción.

El token es opaco, no contiene secretos ni datos en claro o reversibles, no es permiso, versión
persistida ni autoridad y no se guarda en Grupo, receipt u otra colección. Ni
`expectedEditToken` ni el token resultante se persisten como campos. Cambia cuando cambia el
nombre o el ownership. Aunque coincida matemáticamente, la operación siempre relee y revalida el
ownership vigente dentro de la transacción; conocer o copiar un token no concede acceso.

Dos ediciones concurrentes desde la misma base serializan sobre el mismo documento: una puede
confirmar; la otra relee la raíz, detecta token obsoleto y devuelve `STALE_UPDATE` sin sobrescribir.

## 9. Contrato público

Callable propuesta: `updateOwnGroupName`.

Input exacto:

```json
{
  "groupId": "opaque",
  "nombre": "Nuevo nombre",
  "expectedEditToken": "64-hex-lowercase",
  "idempotencyKey": "opaque"
}
```

Reglas:

- `groupId`: string UTF-8 opaco de 1 a 1500 bytes, trim exacto, distinto de `.` y `..`, sin `/` y sin
  coincidir con `__.*__`; conserva la semántica de ID canónico y no introduce una gramática de negocio;
- `nombre`: según §7;
- `expectedEditToken`: exactamente 64 hex minúsculas;
- `idempotencyKey`: `^[A-Za-z0-9._:-]{16,128}$`;
- se rechazan UID, owner, Persona, Membresía, deporte, estado, schema, timestamps, configuración,
  PATCH, field mask y propiedades desconocidas.

Output exacto:

```text
{
  outcome: "UPDATED" | "NO_CHANGES",
  recovered: boolean,
  appliedEffect: null | {
    outcome: "UPDATED",
    nombre: string,
    editToken: string,
    confirmedAt: ISO-8601
  },
  currentGroup: GroupDto,
  currentEditToken: string
}
```

`UPDATED` identifica tanto el commit nuevo (`recovered: false`) como la recuperación del mismo efecto
ya confirmado (`recovered: true`). `NO_CHANGES` siempre usa `recovered: false` y no posee efecto
aplicado. En recovery, `appliedEffect` describe el efecto histórico mientras `currentGroup` y
`currentEditToken` reflejan la raíz vigente, que puede contener un nombre confirmado por una edición
posterior. Así no se inventa un tercer resultado ni se confunden efecto y estado actual.

Reasons públicos mínimos:

| Reason | Semántica |
| --- | --- |
| `UNAUTHENTICATED` | Auth ausente |
| `ACCOUNT_REQUIRED` | Cuenta propia ausente |
| `GROUP_NOT_ACCESSIBLE` | Grupo ausente o no owned, sin enumeración |
| `GROUP_INCOMPATIBLE` | Documento alcanzado incompatible |
| `VALIDATION_FAILED` | Payload o nombre inválido |
| `STALE_UPDATE` | Token ya no corresponde a la raíz vigente |
| `IDEMPOTENCY_CONFLICT` | Misma clave con request distinto |
| `CONFLICT` | Contención sin resultado confirmable |
| `DEPENDENCY_UNAVAILABLE` | Dependencia transitoria o índice/configuración cuando corresponda |
| `INTERNAL_ERROR` | Error desconocido sanitizado |

## 10. Idempotencia y receipt

Se crea receipt durable únicamente para `UPDATED`:

`groupNameUpdateReceipts/{receiptId}`.

El ID es SHA-256 length-prefixed de namespace
`sportexa:E2-20:group-name-update-receipt:v1`, actor UID e `idempotencyKey`. La clave cruda no se
persiste ni registra.

`requestHash` liga namespace `sportexa:E2-20:group-name-update-request:v1`, `contract-v1`, actor y el
payload completo ya normalizado: `groupId`, `nombre`, `expectedEditToken` e `idempotencyKey`. La
inclusión de la clave es redundante respecto del ID, pero vuelve comprobable que el hash representa el
input exacto completo y evita ambigüedad entre implementaciones.

Schema cerrado del receipt v1:

| Campo | Regla |
| --- | --- |
| `action` | `UPDATE_GROUP_NAME` |
| `actorUserId` | Actor que confirmó |
| `groupId` | Raíz afectada |
| `requestHash` | Hash contextual del request |
| `appliedName` | Nombre normalizado confirmado por este efecto |
| `outcome` | `UPDATED` |
| `confirmedAt` | Timestamp autoritativo del servidor |
| `receiptVersion` | `1` |

El receipt contiene el mínimo `appliedName` necesario para reconstruir el efecto histórico y derivar
otra vez su token desde `groupId`, `actorUserId` y ese nombre, sin depender de la raíz mutable. No
contiene token esperado o resultante, nombre anterior, snapshot, deporte, estado, Persona, Membresía,
rol, arrays ni clave cruda. La colección es backend-only y deny-all para cliente.

La retención es indefinida en E2-20. No existe listado ni reader público de receipts: son evidencia
técnica puntual sólo para recovery por ID determinista, no historial o snapshot del Grupo. Archivo o
eliminación futuros no pueden borrarlos sin resolver previamente la idempotencia histórica.

## 11. `NO_CHANGES`

Con token vigente y nombre normalizado igual al actual, la operación devuelve `NO_CHANGES`:

- cero escrituras;
- cero receipt;
- ningún cambio de token;
- ningún timestamp o metadata nuevos;
- la clave no queda consumida.

El token se valida antes del no-op. Un token obsoleto devuelve `STALE_UPDATE` aunque el nombre
solicitado coincida con el vigente.

Como no existe receipt, un `NO_CHANGES` anterior no consume la clave: puede reutilizarse después con
otro nombre y el token vigente para producir un efecto `UPDATED` legítimo.
Si se pierde la respuesta de `NO_CHANGES`, repetir antes de otra mutación devuelve nuevamente
`NO_CHANGES`; si el estado relevante cambió, el token anterior produce `STALE_UPDATE`. No hay efecto
histórico que recuperar ni restaurar.

## 12. Orden transaccional y recovery

La unidad confirmatoria sigue este orden lógico:

1. derivar actor desde Auth y validar Cuenta;
2. calcular receipt ID, request hash y normalizar nombre;
3. abrir transacción;
4. leer Grupo y ocultar ausencia/ajenidad como `GROUP_NOT_ACCESSIBLE`;
5. rehidratar schema v1 exacto y revalidar ownership vigente;
6. leer receipt determinista;
7. si existe, validar schema, actor, Grupo y request hash, derivar el token histórico y recuperar sin
   escribir;
8. si no existe, calcular token actual y compararlo con `expectedEditToken`;
9. si el nombre coincide, devolver `NO_CHANGES` sin escribir;
10. si difiere, actualizar exclusivamente `nombre` y crear receipt con un único timestamp servidor;
11. devolver raíz y token resultantes.

Una implementación puede ordenar físicamente las lecturas según las restricciones de Firestore,
pero no puede reducir autorización, integridad o fallo cerrado.

Ante respuesta perdida se repite la misma clave y payload. El receipt confirmado produce
`UPDATED` con `recovered: true`; no se reaplica el nombre. Con la misma `idempotencyKey`, cualquier
cambio de `groupId`, nombre normalizado o token produce `IDEMPOTENCY_CONFLICT`. Una clave distinta
identifica otra intención y se resuelve contra el token y estado vigentes.

Si E1 confirma nombre N1, E2 confirma N2 y luego llega retry de E1, el resultado separa:

- `appliedEffect.nombre = N1`;
- `currentGroup.nombre = N2`;
- `outcome = UPDATED` y `recovered = true`;
- cero escrituras y ninguna restauración de N1.

## 13. Retry histórico de creación E2-01

El `groupCreationGuard` conserva el hash del request original, que incluye nombre y deporte. Ese hash
no se recalcula desde la raíz actual durante recovery. La raíz correlacionada se relee y se devuelve en
su estado vigente.

Por ello, después de renombrar:

- guard, `idempotencyKeyHash` y `requestHash` de creación permanecen inmutables;
- retry con el request original continúa identificando la misma creación;
- el resultado devuelve el nombre actual;
- el retry no recrea el Grupo ni restaura el nombre de alta;
- E2-20 no modifica `groupCreationGuards`.

Esta conducta debe quedar cubierta explícitamente por pruebas de regresión E2-01/E2-20.

## 14. Carreras y operaciones futuras

### 14.1 Transferencia de ownership

La transacción relee ownership. Si la transferencia confirma primero, el actor anterior recibe
`GROUP_NOT_ACCESSIBLE`; si la edición confirma primero, la transferencia futura observa el nombre
nuevo. Un ex Owner no puede recuperar un receipt porque recovery también reautoriza ownership.

### 14.2 Ediciones concurrentes

Dos requests desde el mismo token no pueden perder actualizaciones:

- misma clave y payload exacto: uno confirma `UPDATED`; el otro recupera ese efecto como `UPDATED`
  con `recovered: true`;
- claves distintas y nombres normalizados distintos: uno confirma; el otro devuelve `STALE_UPDATE`;
- claves distintas y el mismo nombre normalizado: uno confirma; el otro también devuelve
  `STALE_UPDATE`, porque el token se valida antes del no-op; sólo existe un receipt;
- un request posterior preparado con el token nuevo y el mismo nombre devuelve `NO_CHANGES`, cero
  escrituras y deja libre su clave.

La transacción de Firestore serializa sobre `groups/{groupId}`. No existe last-write-wins silencioso ni
se usa el receipt como lock global.

### 14.3 Archivo futuro E2-23

Archivo y edición deberán serializar sobre la misma raíz. Archivo primero impide una edición nueva;
edición primero obliga al archivo a preservar el nombre confirmado. E2-23 deberá adaptar el reader
de recovery para devolver el estado actual sin reabrir ni renombrar y conservar receipts E2-20.
E2-20 no inventa el schema ni el nombre del estado de archivo.

### 14.4 Eliminación futura E2-24

Eliminación y edición deberán serializar sobre la misma raíz. Eliminación primero hace al Grupo no
accesible; edición primero obliga a E2-24 a reevaluar sus precondiciones sobre la raíz actual.
E2-24 deberá resolver expresamente la retención o tombstone necesario para receipts e idempotencia
antes de eliminar. E2-20 no diseña ese tombstone ni autoriza borrado físico.

## 15. Persistencia y efectos

Una confirmación `UPDATED` realiza exactamente dos escrituras atómicas:

1. update de `groups/{groupId}.nombre`;
2. create de `groupNameUpdateReceipts/{receiptId}`.

No se escribe ningún otro campo de Grupo ni otro documento funcional. No se escriben:

- `groupCreationGuards`;
- Temporadas o sus guards/receipts;
- Membresías, Períodos o lifecycle guards;
- Solicitudes, intents o coordinaciones;
- Personas o Usuarios;
- Partido, Torneo, Pago, Actividad o notificaciones;
- arrays o documentos legacy.

No se necesita índice nuevo. `groups` conserva su política backend-only para escrituras y el receipt
recibe deny-all explícito en Rules.

### 15.1 Inventario técnico esperado y límites de acceso

El incremento esperado se limita a estas piezas conceptuales; los nombres internos concretos son
reversibles mientras respeten las fronteras:

| Área | Adaptación mínima esperada |
| --- | --- |
| Dominio Grupo | reutilizar schema/hidratador v1 y normalización; agregar reemplazo puro de nombre |
| Contrato y DTO | payload cerrado de `updateOwnGroupName`; `getOwnGroup` agrega `editToken`; DTO de Grupo conserva su forma |
| Hashing | token, receipt ID y request hash SHA-256 length-prefixed con namespaces E2-20 |
| Persistencia | store transaccional puntual; update exclusivo de `nombre`; hidratador cerrado del receipt |
| Repositorio | capacidad acotada de actualizar sólo el field path `nombre`; sin writer genérico |
| Callable/module | export de la operación y mapeo sanitizado de reasons públicos |
| Rules | deny-all explícito de `groupNameUpdateReceipts`; `groups` continúa sin update cliente |
| Frontend | tipos/servicio, diálogo de un campo y refresco de las vistas canónicas ya montadas |
| Pruebas/runners | unitarias de dominio/contrato/aplicación/arquitectura y focal Emulator registrada en runners existentes |

Límite máximo de lectura por tentativa normal: Cuenta exacta, Grupo exacto y receipt exacto, tres
documentos; no hay queries, scans ni índices nuevos. Recovery confirmado puede releer los mismos tres
documentos para devolver autorización y estado actual. `UPDATED` escribe exactamente raíz y receipt;
`NO_CHANGES`, recovery y errores escriben cero documentos. No se leen Personas, Membresías,
Temporadas, Solicitudes, Partidos, Torneos, guards o colecciones legacy.

## 16. Readers y composición

La compatibilidad comprobada queda clasificada así:

| Consumidor | Semántica después de E2-20 |
| --- | --- |
| creación E2-01 y retry | la creación conserva su request histórico; recovery relee y devuelve el Grupo vigente sin restaurar el nombre inicial |
| `getOwnGroup`, `listOwnGroups`, dashboard y “Grupos que administrás” | muestran el nombre vigente al releer Grupo |
| detalle canónico Owner-scoped | muestra el nombre vigente y es la única superficie de edición |
| Temporadas E2-02/E2-15/E2-16/E2-17 | conservan su propio `nombre`; sólo el encabezado/contexto que relea Grupo muestra el nombre vigente |
| roster E2-11 | conserva integrantes y autorización; la lista no persiste nombre de Grupo y su página contenedora muestra el vigente |
| Solicitudes E2-06/E2-07/E2-09/E2-18 | preview que compone Grupo muestra el vigente; request, decisiones y receipts no se reescriben; el listado Owner no promete un nombre que hoy no expone |
| Membresías actuales E2-04 | el DTO compuesto relee Grupo y muestra el nombre vigente |
| historial de Membresías E2-19 | compone el Grupo actual y muestra su nombre vigente incluso en filas históricas; no existe snapshot histórico del nombre |
| catálogo público/compatibilidad E4 | permanece fuera del corte y sin adaptación; E2-20 no promete que superficies legacy reflejen el rename hasta su asignación formal |
| Partido y Torneo | IDs, documentos y nombres propios/snapshots que ya posean permanecen intactos; sólo una vista que relea Grupo puede mostrar el vigente |
| tombstones E2-13 | permanecen idénticos y no recuperan autoridad ni escritura |

No se reescriben snapshots ni referencias históricas. Temporadas, Membresías, Solicitudes, Partidos y
Torneos conservan byte-equivalentes sus documentos. Si una vista compone el nombre vigente, presenta
el valor nuevo; eso no modifica su Agregado ni convierte el nombre en historia retroactiva. No se
prometen snapshots históricos que no existen.

## 17. Frontend y accesibilidad

La acción `Editar nombre` aparece únicamente en el detalle canónico Owner-scoped
`/dashboard/groups/[groupId]`.

Requisitos:

- recargar `getOwnGroup` al abrir para obtener nombre y token autoritativos;
- modal o diálogo con un único campo `nombre`;
- valor actual precargado;
- validación equivalente para feedback, sin sustituir backend;
- cancelar y Escape sin escrituras;
- dirty state normalizado;
- botón confirmar deshabilitado para no-op normal;
- single-flight y bloqueo de doble envío;
- una clave nueva al iniciar una intención efectiva y clave estable para todos los retries del mismo
  `groupId`/nombre normalizado/token hasta obtener resultado concluyente;
- `STALE_UPDATE` recarga nombre/token y exige decisión nueva, sin merge automático;
- pérdida de ownership cierra la edición, retira control y datos Owner-scoped y vuelve a una navegación
  segura;
- éxito actualiza el estado local del detalle con `currentGroup` y fuerza relectura al entrar o volver a
  dashboard, “Grupos que administrás”, Membresías actuales e historial;
- foco inicial y retorno de foco, trap de teclado, labels, `aria-live`, `aria-busy`, alertas y targets
  mínimos de interacción;
- presentación responsive.

No se muestran controles de deporte, owner, estado, descripción, configuración, permisos, archivo o
eliminación.

## 18. Pruebas requeridas

### 18.1 Dominio y contrato

- schema v1 exacto y preservación de todos los campos salvo nombre;
- normalización NFC, whitespace, controles y límites 1/80;
- payload cerrado y rechazo de PATCH/campos prohibidos;
- token determinista y sensible exactamente a `groupId`, `ownerId` y nombre normalizado; cambios de
  deporte, estado, schema o timestamps no se simulan como edición concurrente;
- DTO y output exactos;
- no-op y errores públicos.

### 18.2 Aplicación, persistencia y recovery

- Owner con Cuenta y sin Persona/Membresía puede editar;
- no-Owner, global admin y conocimiento de ID no autorizan;
- raíz+receipt atómicos y fallo sin parcialidad;
- misma clave/payload recupera `UPDATED` con `recovered: true`; misma clave/payload distinto entra en
  conflicto;
- un `NO_CHANGES` no consume clave y su reutilización posterior puede confirmar un efecto real;
- retry E1 después de E2 devuelve efecto histórico y estado actual sin restaurar;
- dos ediciones concurrentes y stale;
- transferencia antes/después y recovery revocado;
- schema incompatible, receipt corrupto y dependencia caída fallan cerrados;
- cardinalidad de escrituras y cero efectos colaterales.

### 18.3 Regresiones

- retry de creación E2-01 después del rename devuelve la raíz actual;
- E2-02/E2-15/E2-16/E2-17 conservan Temporada y su nombre propio;
- E2-11 conserva roster y autorización;
- E2-06/E2-07/E2-09/E2-18 conservan Solicitudes y decisiones;
- E2-19 conserva historia por IDs y composición sin reescritura;
- tombstones y allowlist E4 permanecen intactos.

### 18.4 Rules y arquitectura

- cliente no puede update de `groups` ni acceso a receipts;
- frontend no importa Firestore para editar;
- sólo el repositorio/store canónico escribe Grupo v1;
- ninguna nueva dependencia hacia Membresías, Solicitudes, Partido o Torneo;
- ausencia de rol global, arrays y autoridad legacy.

## 19. UAT requerida

La UAT futura utiliza únicamente Auth/Functions/Firestore Emulator, proyecto `demo-*`, loopback y
datos sintéticos. La evidencia se separa obligatoriamente así.

### 19.1 Recorrido manual de UI

1. Owner ve `Editar nombre`; un no-Owner no ve la acción.
2. Owner sin Persona ni Membresía puede abrir la edición.
3. El único campo aparece precargado con el nombre vigente y el foco inicial es correcto.
4. Dirty state normalizado, teclado, labels, mensajes y navegación de foco son utilizables.
5. Cancelar y Escape cierran sin efecto; confirmar queda deshabilitado para no-op visible.
6. Nombre inválido muestra feedback; nombre válido actualiza el detalle y persiste al recargar.
7. Al navegar, dashboard, “Grupos que administrás”, Membresías actuales e historial E2-19 muestran el
   nombre vigente donde hoy lo componen; roster, Temporadas y Solicitudes continúan accesibles.
8. Stale observado por dos sesiones recarga el estado autoritativo y no sobrescribe ni mezcla.
9. Pérdida de ownership observada al reintentar retira la superficie Owner-scoped.
10. No aparecen campos o acciones de CU-013–CU-015.

### 19.2 Inspección persistente

- tras `UPDATED`, sólo cambió `groups/{groupId}.nombre` y existe un receipt cerrado correlacionado;
- `deporte`, `ownerId`, `estado`, ID, `schemaVersion`, `createdAt` y demás documentos comparados
  permanecen byte-equivalentes;
- `NO_CHANGES`, cancelación, validación, stale y fallos escriben cero documentos;
- Rules conservan update cliente de `groups` denegado y deny-all sobre receipts.

### 19.3 Escenarios exclusivos de automatización/Emulator

- carreras deterministas con mismo token, claves iguales/distintas y nombres iguales/distintos;
- pérdida de respuesta y recovery histórico después de cambios posteriores;
- transferencia concurrente y revocación del recovery al ex Owner;
- receipt corrupto, Grupo incompatible y dependencias fallidas;
- retry histórico de creación E2-01 después del rename;
- reutilización de una clave no consumida por `NO_CHANGES`;
- cardinalidad exacta de lecturas/escrituras y comparación persistente de otros Agregados.

No se exige fabricar manualmente corrupción, carreras de transferencia, pérdida de respuesta ni
estados internos inaccesibles desde UI.

## 20. Criterios Dado/Cuando/Entonces

1. Dado Grupo v1 activo y Owner vigente, cuando confirma nombre válido con token vigente, entonces
   sólo cambia `nombre` y raíz+receipt se confirman atómicamente.
2. Dado Owner sin Persona o Membresía, cuando edita, entonces la operación no exige esos conceptos.
3. Dado global admin no Owner, cuando intenta editar, entonces no obtiene autoridad ni enumeración.
4. Dado payload con deporte, owner, estado, schema, timestamps o propiedad extra, entonces se
   rechaza sin escrituras.
5. Dado nombre normalizado igual y token vigente, entonces `NO_CHANGES`, cero escrituras y clave
   libre.
6. Dado token obsoleto, entonces `STALE_UPDATE` aunque el nombre solicitado coincida.
7. Dada misma clave y request confirmado, entonces se recupera el mismo efecto sin reaplicar.
8. Dada misma clave con otro request, entonces `IDEMPOTENCY_CONFLICT`.
9. Dadas dos ediciones concurrentes, entonces no existe last-write-wins silencioso.
10. Dada edición E1, edición E2 y retry E1, entonces se devuelve efecto E1 y estado E2 sin revertir.
11. Dada transferencia concurrente, entonces el orden serializable preserva ownership vigente.
12. Dado retry de creación posterior al rename, entonces devuelve el nombre actual sin recrear.
13. Dada edición, entonces ningún ID, referencia histórica u otro Agregado cambia.
14. Dado documento legacy o schema incompatible, entonces no se migra ni repara.
15. Dado cliente Firestore, entonces Rules niega update de Grupo y acceso a receipt.
16. Dado rollback, entonces nunca se restaura automáticamente un nombre anterior.
17. Dado `NO_CHANGES` con una clave, cuando luego se presenta un efecto legítimo con esa misma clave y
    token vigente, entonces puede confirmar `UPDATED` porque la clave anterior no fue consumida.

## 21. Dependencias E2-21 a E2-24

- **E2-21 / CU-013:** deberá separar catálogos descriptivos, roles deportivos, cargos y permisos con
  efecto autorizativo. No hardcodeará posiciones, roles o cargos de vóley; SPORTEXA es multi-deporte.
- **E2-22 / CU-026:** sólo podrá editar atributos propios de Membresía sobre catálogos y permisos
  aprobados por E2-21. Observaciones requieren una decisión específica de privacidad, autoridad,
  visibilidad y retención.
- **E2-23 / CU-014:** deberá definir archivo/inactivación, adaptar token/recovery E2-20 y resolver
  Temporadas, Membresías, Solicitudes, referencias deportivas y compatibilidad E4.
- **E2-24 / CU-015:** deberá demostrar ausencia de actividad/historia, serializar contra nuevas
  operaciones y resolver referencias, receipts, tombstones y compatibilidad E4 antes de eliminar.

Estas dependencias se registran sin diseñar sus contratos, schemas, estados o UI.

Después de E2-24 siguen siendo obligatorias, en este orden de cierre, la asignación formal de la
compatibilidad/tombstones E4 y la repetición final de E2-14. Ninguna de esas tareas se diseña, inicia o
declara cerrada mediante E2-20.

## 22. Rollback

El rollback de código deberá ocultar UI y retirar o deshabilitar `updateOwnGroupName` para nuevas
ediciones, manteniendo lectura de Grupo v1 y deny-all de receipts. No se restauran nombres anteriores:
el receipt técnico no es historial funcional y no existe autoridad para elegir un valor previo.

Los receipts de operaciones confirmadas no se borran por rollback mientras puedan existir requests
en vuelo. Una corrección de nombre es otra edición autorizada, no una reparación directa de datos.

## 23. Exclusiones expresas

- CU-013, CU-014, CU-015 y CU-026.
- descripción, visibilidad, configuración y catálogos.
- roles deportivos, cargos, posiciones, dorsales y permisos.
- observaciones.
- transferencia de ownership.
- edición de deporte o estado.
- cambio de ID, schema, timestamps o metadata.
- Plan/Suscripción y límites comerciales.
- compatibilidad, catálogo y consumidores E4.
- migración, backfill, reparación, batch o escritura cliente.
- notificaciones, Actividad e historial funcional de nombres.
- deploy, acceso Firebase remoto y Auth/UAT.

## 24. Definition of Done

E2-20 podrá cerrarse sólo cuando:

1. contrato, token, idempotencia, receipt, recovery y errores coincidan con esta ficha;
2. el writer cambie exclusivamente `nombre` y cree el receipt en la misma transacción;
3. retry de creación E2-01 no restaure el nombre inicial;
4. autorización Owner-scoped se revalide dentro de la unidad confirmatoria;
5. frontend accesible consuma exclusivamente backend;
6. pruebas de dominio, aplicación, contrato, arquitectura, Rules y Emulator aprueben;
7. UAT se clasifique sin atribuir recorridos manuales inexistentes;
8. suites completas, lint baseline, typecheck, build, sintaxis y diff aprueben;
9. no exista cambio fuera del inventario aprobado;
10. implementación, informe y cierre queden versionados e integrados mediante intervenciones
    autorizadas posteriores.

### 24.1 Riesgos residuales aceptados

1. El nombre no posee historial funcional; vistas históricas que componen Grupo mostrarán el vigente.
2. Consumidores legacy E4 pueden conservar otra semántica hasta su asignación formal; E2-20 no los
   adapta ni promete sincronización.
3. La retención indefinida de receipts queda pendiente de una política futura, pero no habilita
   borrarlos mientras sostengan recovery.
4. CU-014/CU-015 deberán serializar y resolver recovery/eliminación sin reutilizar el token como
   autoridad; esta ficha sólo deja la raíz como punto de serialización.
5. Un rename confirmado no tiene rollback semántico automático; corregirlo requiere una nueva edición
   autorizada.

## 25. Veredicto de definición

`E2-20 APROBADO DOCUMENTALMENTE — IMPLEMENTACIÓN NO INICIADA`
