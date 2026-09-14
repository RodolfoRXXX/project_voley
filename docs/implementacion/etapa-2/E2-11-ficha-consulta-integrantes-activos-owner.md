# E2-11 — Consulta canónica de integrantes activos del Grupo para el Owner

## Estado de la ficha

- **Identificador:** E2-11.
- **Título:** Consulta canónica de integrantes activos del Grupo para el Owner.
- **Estado:** `APROBADA`.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Tipo de corte:** capacidad vertical de consulta, sin escrituras ni efectos colaterales.
- **Actor inicial:** Owner vigente del Grupo.
- **Fuente de verdad de pertenencia:** Membresía activa correspondiente a la Temporada abierta autoritativa del Grupo.
- **Composición de presentación:** Membresía–Persona, ejecutada exclusivamente en backend.
- **Contrato público definitivo:** `listActiveGroupMembersForOwnedGroup`.
- **Consumidor inicial:** `/dashboard/groups/[groupId]`.
- **Checkpoint documental:** `dev` y `origin/dev` en `d5ff7f7c69cea659bfdab312a9d43c467047c3f3`, upstream `origin/dev`, divergencia `0/0`, merge-base idéntico, E2-11 como único archivo local nuevo sin seguimiento, índice vacío y cero stashes al iniciar la revisión final.
- **Rama Auth/UAT preservada:** `chore/preserve-auth-emulator-uat-changes` en `fc7135e358902a17372d44f20df50883603520ce`, sin integración.
- **Veredicto:** `E2-11 APROBADA`.

Esta ficha aprobada define el incremento y no lo implementa. Su versionado y la preparación de la rama feature no autorizan código, cambios de reglas o índices, migraciones, limpieza de datos, deploy, acceso a Firebase remoto ni integración de Auth/UAT.

## 1. Preflight y estado recibido

El preflight se ejecutó en `dev`; no fue necesario cambiar de rama. Git exigió `safe.directory` y cada lectura utilizó exclusivamente `git -c safe.directory=C:/Users/Rodolfo/Documents/projectoVoley ...`, sin modificar configuración global.

| Control | Resultado |
| --- | --- |
| Rama | `dev` |
| HEAD | `d5ff7f7c69cea659bfdab312a9d43c467047c3f3` |
| Upstream | `origin/dev` |
| `origin/dev` | `d5ff7f7c69cea659bfdab312a9d43c467047c3f3` |
| Divergencia | `0/0` |
| Merge-base | `d5ff7f7c69cea659bfdab312a9d43c467047c3f3` |
| Índice | limpio |
| Working tree | sólo E2-11 como archivo nuevo sin seguimiento |
| Stashes | cero |
| Auth/UAT | rama local aislada en `fc7135e358902a17372d44f20df50883603520ce` |

`git status --short --branch` mostró exclusivamente E2-11 como archivo nuevo sin seguimiento. `git diff --cached --name-status` confirmó el índice vacío y no existían otras modificaciones locales.

## 2. Fuentes consultadas y prevalencia

Se revisaron en el orden de autoridad requerido:

1. **Documento 1 aprobado:** Grupo es la unidad operativa; Owner es la autoridad máxima del Grupo; Persona conserva identidad humana; Membresía representa pertenencia Persona–Grupo; Integrante es una Persona con Membresía activa; ownership y pertenencia son relaciones distintas.
2. **Documento 1.5 aprobado:** Usuario, Persona y Membresía son conceptos diferentes; existe un único Owner vigente por recurso; una Persona no puede tener más de una Membresía activa simultánea en el mismo Grupo; estado y fechas pertenecen a Membresía; roles y permisos son contextuales, no globales.
3. **Documento 2 aprobado:** el Owner administra Personas y Membresías; CU-025 a CU-030 separan creación, edición, finalización, reactivación, renovación y cambio de estado; una Membresía se asocia a Temporada; RF-17 a RF-20 preservan cierre e historia de Temporada; no existe un caso aprobado que conceda a cualquier integrante acceso general al roster.
4. **Documentos 3 y 4 AUD-C05, sus PDF C05 y adendas Markdown:** Membresía es Aggregate Root y fuente de su ciclo de vida; Persona, Grupo y Temporada permanecen fuera de su Agregado; una consulta puede componer Agregados sin ampliar unidades de consistencia; v1, v2 y v3 se leen de forma transitoria y schemas incompatibles fallan cerrados; los Períodos de Vigencia son internos y carecen de contrato público propio.
5. **Documento 5 disponible:** pertenencia Persona–Grupo tiene a Membresía como única autoridad y no a arrays de Grupo; la encapsulación y el retiro avanzan por flujo; el frontend forma parte del incremento; contratos, DTOs, consultas e índices se cierran cuando existe el caso implementable; privacidad es cerrada por defecto.
6. **Fichas, informes y cierres E2-01 a E2-10:** ownership canónico, Temporada abierta, Membresías v1/v3, guards, consulta member-scoped, solicitudes, reactivación, Períodos de Vigencia y salida propia ya están cerrados y no se reabren.
7. **Cierre consolidado de Etapa 0 y cierres de Etapa 1:** backend como frontera de acceso, reglas conservadoras, Cuenta separada de Persona, vínculo `users/{uid}.personaId` y lectura/escritura cliente denegada sobre Persona.
8. **Informe de auditoría técnica:** arrays de Grupo, rol global, lecturas directas y composición desde `users` son legado contradictorio; consultas N+1 y consumidores activos deben tratarse incrementalmente.
9. **Código actual de `dev`, sólo como evidencia:** existe la infraestructura canónica de Grupo, Temporada, Persona y Membresía; persisten listados legacy en rutas administrativas, públicas y de perfil, junto con consumidores de Partidos y Torneos.

Ante una contradicción sobre ciclo de vida o Períodos de Vigencia prevalecen las adendas AUD-C05. El código no corrige ni sustituye una regla normativa.

## 3. Antecedente y continuidad E2-09/E2-10

E2-09 estableció Membresía v3, Períodos de Vigencia subordinados y compatibilidad lectora con activa v1. E2-10 reutilizó la finalización, confirmó que Owner y pertenencia son independientes y dejó expresamente diferidos el roster y la baja administrativa de terceros.

E2-11 toma esa dependencia diferida como una capacidad sólo de lectura. No cambia las transiciones, guards, Períodos, intents ni outcomes de E2-09/E2-10. Tampoco usa el roster para autorizar una escritura futura.

## 4. Objetivo funcional

Permitir que el Owner vigente consulte, desde el detalle administrativo canónico de su Grupo, una lista mínima y paginada de Personas cuya Membresía activa pertenece a la única Temporada abierta de ese Grupo.

La lista sirve para reconocer integrantes y preparar una selección administrativa futura mediante una referencia estable de Membresía. En E2-11 esa referencia no habilita finalizar, expulsar, suspender, editar ni modificar nada.

## 5. Problema que resuelve

El detalle canónico `/dashboard/groups/[groupId]` no posee roster. Los listados existentes derivan pertenencia de `groups.memberIds`/`adminIds`, consultan `users`, mezclan ownership, administración y pertenencia, o se encuentran en superficies legacy con lecturas Firestore directas.

Sin un reader canónico, una futura baja Owner-scoped dependería de IDs técnicos obtenidos fuera del flujo o de una segunda fuente de verdad. E2-11 elimina esa dependencia para la consulta, sin adelantar la escritura.

## 6. Alcance incluido

- callable Owner-scoped `listActiveGroupMembersForOwnedGroup`;
- autorización por `groups/{groupId}.ownerId` vigente;
- resolución autoritativa de la única Temporada abierta del Grupo;
- consulta paginada de Membresías activas de esa Temporada;
- compatibilidad de lectura con Membresías activas v1 y v3;
- validación de cardinalidad, active guard y Período abierto cuando corresponda;
- composición backend con Persona para nombre y apellido;
- DTO mínimo, cerrado y sanitizado;
- identidad no presentable sin pérdida de la fila de Membresía;
- orden estable por primera incorporación y desempate por Membresía;
- estados de carga, vacío, ausencia de Temporada abierta, éxito, error y retry;
- sección “Integrantes” en `/dashboard/groups/[groupId]`;
- pruebas unitarias, contractuales, arquitectónicas, frontend y Emulator;
- UAT futura con cuentas Google existentes en Auth Emulator.

## 7. Exclusiones explícitas

- finalizar, expulsar, suspender o editar Membresías de terceros;
- botones, menús, checkboxes o confirmaciones de baja administrativa;
- salida voluntaria propia de E2-10;
- CU-026, CU-027, CU-028, CU-029 y CU-030 como comandos;
- roles, cargos, staff, permisos delegados o rol global;
- edición, búsqueda transversal o exposición completa de Persona;
- email, UID, foto, posiciones, datos deportivos, económicos o administrativos;
- historial de Membresías y Períodos de Vigencia en el DTO;
- Membresías de Temporadas cerradas, históricas o distintas de la abierta vigente;
- creación, cierre, reapertura, edición o historia de Temporadas;
- Equipos, Torneos, Partidos, Entrenamientos, Actividad, alertas y notificaciones;
- migración, backfill, adopción o limpieza global de arrays legacy;
- retiro de rutas o servicios con consumidores activos ajenos a este flujo;
- Plan, Suscripción, deploy y Firebase remoto.

## 8. Actor y autorización

### 8.1 Actor inicial definitivo

El único actor de E2-11 es el **Owner vigente** del Grupo. El fundamento positivo es la facultad aprobada del Owner para administrar Personas y Membresías del Grupo. No existe fundamento aprobado suficiente para conceder el roster general a integrantes comunes; las referencias genéricas a información “habilitada por sus permisos” no definen aquí un permiso ni una política de privacidad.

Una ampliación member-scoped requerirá una ficha y decisión funcional separadas. No se deduce de E2-04, que consulta exclusivamente Membresías propias y prohíbe enumerar Personas ajenas.

### 8.2 Matriz de autorización

| Situación | Resultado público |
| --- | --- |
| No autenticado | `UNAUTHENTICATED` |
| Autenticado sin Cuenta canónica compatible | `ACCOUNT_REQUIRED` |
| Cuenta válida y Grupo inexistente | `GROUP_NOT_ACCESSIBLE` |
| Cuenta válida y Grupo ajeno | `GROUP_NOT_ACCESSIBLE` |
| Rol global `admin` sin ownership | `GROUP_NOT_ACCESSIBLE` |
| Integrante activo no Owner | `GROUP_NOT_ACCESSIBLE` |
| Owner vigente de Grupo compatible | continúa la consulta |
| Owner sin Persona vinculada | consulta autorizada; ownership no requiere Persona |
| Owner con Persona y Membresía activa | aparece como integrante y `isOwner: true` |
| Owner sin Membresía activa válida | no aparece |

Grupo inexistente y no-Owner comparten respuesta para impedir enumeración mediante IDs conocidos. Si el documento declara al actor como Owner pero su schema canónico es incompatible, se responde `INCOMPATIBLE_STATE` sin detalles físicos.

### 8.3 Datos que nunca autorizan

No autorizan `users.roles`, claims globales distintos de autenticación, Plan, Suscripción, email, `memberIds`, `adminIds`, `admins`, `personId`, `membershipId`, `seasonId`, guard, cursor, rutas o IDs aportados por el cliente.

Cada página revalida Cuenta y ownership. Un cursor nunca conserva autoridad de una página anterior.

## 9. Fuente de verdad y cardinalidad

### 9.1 Regla de inclusión

Una fila se incluye si y sólo si:

1. existe un Grupo v1 canónico, activo y actualmente owned por el actor;
2. existe exactamente una Temporada abierta canónica para el Grupo y su open guard está íntegro y correlacionado;
3. la Membresía pertenece exactamente a ese `groupId` y `seasonId`;
4. `estado === "activa"`;
5. reconstruye estrictamente como activa v1 o activa v3;
6. existe exactamente una Membresía activa para la misma pareja Persona–Grupo y es la candidata;
7. el active guard determinista existe y correlaciona Persona, Grupo, Temporada y Membresía;
8. para v3, existe exactamente un Período de Vigencia abierto y los límites, ordinales y resumen de raíz son íntegros.

`memberIds`, `adminIds`, `admins`, `users`, participaciones, Equipos y cualquier otra proyección quedan excluidos de la decisión de pertenencia.

### 9.2 Duplicados e incompatibilidades

La unidad visible es una fila por **Membresía activa válida**, no una fila por UID ni por Persona deduplicada en presentación.

Dos Membresías activas para la misma Persona–Grupo, guard ausente, guard duplicado o incompatible, v3 sin un único período abierto, referencias inconsistentes o candidata con schema desconocido producen `INCOMPATIBLE_STATE` para la página completa. La consulta no elige, fusiona, repara, adopta, migra ni oculta arbitrariamente la corrupción.

Un documento que no satisface los predicados físicos mínimos de la consulta no se adopta como integrante. Un documento recuperado por esos predicados pero incompatible hace fallar la página de forma cerrada.

## 10. Decisión de Temporada

### 10.1 Alcance temporal

E2-11 muestra el roster de la **única Temporada abierta autoritativa del Grupo**. El cliente no envía `seasonId`.

La decisión se funda en que:

- Membresía contiene la referencia al contexto de Temporada;
- las altas y reactivaciones operativas exigen Temporada abierta;
- CU-029 crea una nueva Membresía para una nueva Temporada;
- E2-04 ya distingue estado físico activo de pertenencia operativa y exige coincidencia con la Temporada abierta;
- el cierre de Temporada no modifica automáticamente Membresías de otros Agregados.

Por lo tanto, “Membresía físicamente activa” y “integrante actual de la Temporada abierta” no son equivalentes en datos degradados o históricos. E2-11 aplica el segundo significado y lo declara; no reinterpreta una activa ligada a Temporada cerrada como roster actual.

### 10.2 Ausencia o inconsistencia de Temporada

- **Cero Temporadas abiertas y cero open guards:** éxito con `scope.status: "NO_OPEN_SEASON"`, `items: []` y `nextCursor: null`. La UI explica que no hay roster actual porque el Grupo no posee Temporada abierta; no afirma que nunca tuvo integrantes.
- **Exactamente una abierta y guard correlacionado:** `scope.status: "OPEN_SEASON"` y consulta normal.
- **Dos o más abiertas, guard huérfano, ausente o apuntando a otra Temporada:** `INCOMPATIBLE_STATE`, sin lista parcial.
- **Temporada cerrada o histórica:** no se consulta ni se devuelve en E2-11.
- **Cambio de Temporada entre páginas:** el cursor queda inválido para el contexto vigente y se devuelve `ROSTER_CONTEXT_CHANGED`; la UI reinicia desde la primera página.

## 11. Composición con Persona

### 11.1 Proyección mínima

Persona aporta exclusivamente `nombre` y `apellido`. `emailContacto`, `createdAt`, UID, foto, posiciones y cualquier dato adicional permanecen privados.

La composición se realiza mediante una capacidad pública interna del Módulo Personas que recibe `personId` desde la Membresía ya autorizada y devuelve una proyección cerrada; el Módulo Membresías no importa el repositorio privado de Persona ni incorpora Persona a su Agregado.

### 11.2 Persona ausente, incompatible o no presentable

La ausencia o incompatibilidad de Persona no invalida una Membresía íntegra ni elimina su fila. Para no mentir sobre cardinalidad ni filtrar la causa:

- el DTO devuelve `person: { "status": "UNAVAILABLE" }` sin nombre, apellido, placeholder persistido ni razón técnica;
- la UI muestra el texto local “Identidad no disponible”;
- no diferencia entre ausente, schema incompatible o no visible;
- no intenta fallback a `users`, Authentication, email, UID o arrays legacy;
- un fallo transitorio de la dependencia no se degrada a identidad ausente: falla la página con `DEPENDENCY_UNAVAILABLE`, evitando resultados parciales engañosos.

Con Persona compatible se devuelve `status: "AVAILABLE"`, `firstName` y `lastName`.

### 11.3 Owner como integrante

`isOwner` es una proyección booleana derivada en backend comparando la Persona de la Membresía con el vínculo Persona de la Cuenta del Owner vigente. No cambia autorización ni pertenencia. Si el Owner no posee Membresía activa válida, no existe fila Owner. Si la posee, aparece bajo las mismas reglas y orden que cualquier integrante.

## 12. Contrato público definitivo

### 12.1 Nombre y transporte

Callable autenticada:

`listActiveGroupMembersForOwnedGroup({ groupId, pageSize?, cursor? })`

El nombre sigue la convención ya implementada por `listPendingGroupJoinRequestsForOwnedGroup` y declara tanto el recurso listado como el scope de autoridad. No se reutiliza `listMyCurrentGroupMemberships`, cuyo actor, eje de consulta y semántica son self-person/member-scoped.

### 12.2 Entrada cerrada

```json
{
  "groupId": "string",
  "pageSize": 20,
  "cursor": "opaque-string"
}
```

Reglas:

- objeto plano con prototipo `Object.prototype` o `null`;
- propiedades admitidas: `groupId`, `pageSize`, `cursor`;
- `groupId` obligatorio, sin `/`, sin espacios extremos, de 1 a 1500 bytes UTF-8;
- `pageSize` opcional, entero de 1 a 20; default 20;
- `cursor` opcional, Base64URL canónico sin padding, UTF-8 estricto y hasta 2048 caracteres;
- toda propiedad desconocida, faltante obligatoria o tipo no plano produce `VALIDATION_FAILED`.

El cliente no aporta `ownerUid`, UID objetivo, `personId`, `membershipId`, `seasonId`, roles, estado, fechas, guards, filtros, orden, colección ni ruta Firestore.

### 12.3 Salida cerrada

Con Temporada abierta:

```json
{
  "scope": {
    "status": "OPEN_SEASON"
  },
  "items": [
    {
      "membershipId": "opaque-membership-id",
      "joinedAt": "2026-08-30T12:34:56.000Z",
      "isOwner": false,
      "person": {
        "status": "AVAILABLE",
        "firstName": "Ana",
        "lastName": "Pérez"
      }
    }
  ],
  "nextCursor": "opaque-string-or-null"
}
```

Sin identidad presentable, `person` contiene sólo `status: "UNAVAILABLE"`. Sin Temporada abierta, `scope.status` es `NO_OPEN_SEASON`, `items` es `[]` y `nextCursor` es `null`.

`membershipId` es la única referencia operativa expuesta. Es una identidad opaca y estable de fila, necesaria para preparar una futura selección sobre la raíz correcta; no contiene PII, no se muestra visualmente, no autoriza y en E2-11 no es aceptada por ningún comando nuevo. Conocerla no concede acceso ni capacidad de escritura. Todo comando futuro que la reciba deberá revalidar autoritativamente Grupo, Owner, Persona, Temporada, Membresía y estado vigente; la referencia nunca sustituirá esas verificaciones. No se exponen `personId`, `seasonId`, `groupId` redundante, UID, estado —todas las filas ya son activas—, guards, schema, períodos ni timestamps técnicos.

`joinedAt` representa `fechaIngreso`, es decir, la primera incorporación histórica de esa Membresía. No representa inicio del período vigente, `createdAt` ni fecha de la última reactivación.

### 12.4 Resultado vacío

Con `OPEN_SEASON`, `items: []` y `nextCursor: null` significa que no existen candidatas en la posición consultada. Toda candidata recuperada produce una fila —aunque Persona resulte `UNAVAILABLE`— o hace fallar cerrada la página si su integridad es incompatible. Por eso E2-11 no devuelve páginas vacías con continuación.

## 13. Orden, paginación y cursor

### 13.1 Orden definitivo

El orden físico y contractual es:

1. `fechaIngreso ASC`;
2. `membershipId ASC` como desempate técnico.

No se adopta orden alfabético porque Persona no posee nombre/apellido normalizados para orden global, Firestore no aporta una colación humana autoritativa y ordenar después de paginar produciría páginas inestables. No se agregan normalizaciones persistentes ni proyecciones sólo para E2-11.

La UI presenta “Integrantes por fecha de incorporación”. El ID de desempate nunca se muestra.

### 13.2 Paginación

Se adopta paginación desde E2-11: default y máximo 20. El roster no tiene un máximo normativo pequeño; la composición valida Persona, guards y Períodos, por lo que una lectura ilimitada aumentaría costo, latencia y superficie de datos.

La consulta primaria usa `limit(pageSize + 1)` para lookahead. Sólo las primeras `pageSize` candidatas integran la página y se someten a composición; el documento adicional se usa exclusivamente para determinar si existe continuación. Como toda candidata incluida produce una fila o hace fallar cerrada la página, no hay filtrado silencioso. El cursor se ancla en la última Membresía efectivamente incluida en `items`, nunca en el documento de lookahead, para no omitir la primera fila de la página siguiente. Así se componen como máximo 20 Personas por página.

### 13.3 Cursor v1

El cursor opaco contiene como mínimo versión, contrato, orden, `groupId`, `seasonId`, hash domain-separated del Owner que abrió el recorrido, `lastFechaIngreso` y `lastMembershipId`, dentro de un sobre canónico con checksum separado por dominio. El checksum detecta alteración accidental o caller-crafted no canónica; no se trata como secreto ni como autorización. El hash de actor no se expone fuera del token ni se registra.

En cada request se revalidan actor, Grupo y Temporada. Un cursor de otro Grupo, actor, contrato, orden o Temporada no amplía la consulta y produce `VALIDATION_FAILED` o `ROSTER_CONTEXT_CHANGED`, según corresponda. Un cursor manipulado puede como máximo alterar el recorrido propio autorizado; nunca cambia los predicados fijos ni permite enumeración transversal.

### 13.4 Índice previsto

La implementación futura deberá justificar y agregar únicamente el índice compuesto necesario para:

`memberships: groupId ASC, seasonId ASC, estado ASC, fechaIngreso ASC`

con `__name__ ASC` como desempate del query. El índice no se crea durante esta definición. No se prevé índice por nombre de Persona.

## 14. Persistencia consultada

| Persistencia | Uso de sólo lectura |
| --- | --- |
| `users/{uid}` | Cuenta del actor y vínculo Persona opcional para `isOwner` |
| `groups/{groupId}` | identidad, estado y `ownerId` vigente |
| `seasons` | cardinalidad de Temporada abierta del Grupo |
| `openSeasonGuards/{groupId}` | correlación de la única Temporada abierta |
| `memberships` | fuente exclusiva de filas y orden |
| `activeMembershipGuards/{guardId}` | unicidad activa Persona–Grupo y correlación |
| `memberships/{membershipId}/validityPeriods` | integridad temporal de activa v3 |
| `personas/{personId}` | proyección mínima de nombre y apellido |

E2-11 ejecuta cero `create`, `set`, `update`, `delete`, intents, eventos, notificaciones, reparaciones o adopciones. No modifica ningún Agregado ni crea un modelo persistente de lectura.

## 15. Servicio de Aplicación y límites arquitectónicos

El Servicio de Aplicación de Membresías coordina:

1. validación del payload;
2. autenticación y Cuenta;
3. capacidad Owner-scoped del Módulo Grupos;
4. resolución de Temporada abierta mediante capacidad pública de Grupos;
5. reader paginado de Membresías;
6. validación de guards y Períodos mediante infraestructura de Membresías;
7. proyección mínima mediante capacidad pública de Personas;
8. armado del DTO y cursor.

Grupo, Temporada y Persona no ingresan al Agregado Membresía. No se crea un Agregado roster, repositorio de roster, repositorio de Períodos ni transacción distribuida de escritura. La composición es un caso de lectura.

## 16. Consistencia y concurrencia

### 16.1 Modelo de consistencia

Cada página debe obtener Grupo/ownership, Temporada/open guard, candidatas, integridad y Personas bajo una lectura server-side consistente cuando la infraestructura lo permita, sin escrituras. No se exige snapshot global entre páginas ni congelar todos los Agregados durante la navegación.

El punto de verdad de una página es la lectura autoritativa que confirma ownership y elegibilidad. La respuesta afirma que las filas eran válidas en ese punto; no promete que continúen activas al renderizarse.

### 16.2 Carreras

| Carrera | Conducta |
| --- | --- |
| Una Membresía se finaliza antes de la lectura consistente | no aparece |
| Se finaliza después de la lectura | la página puede contenerla; refresh la elimina |
| Una Membresía se reactiva antes de la lectura | aparece si queda activa, íntegra y en la Temporada abierta |
| Se reactiva después de pasar su posición de cursor | puede verse recién al reiniciar; no hay snapshot multipágina |
| Cambia el Owner antes de autorizar | anterior Owner rechazado; nuevo Owner autorizado |
| Cambia el Owner después del punto de lectura | la página ya leída puede responder; la siguiente página/retry reautoriza y rechaza al Owner anterior |
| Se cierra la Temporada antes de resolver contexto | `NO_OPEN_SEASON` en primera página o `ROSTER_CONTEXT_CHANGED` con cursor |
| Cambia la Temporada entre páginas | `ROSTER_CONTEXT_CHANGED`; reinicio obligatorio |
| Persona cambia antes de la lectura | se devuelve su proyección vigente |
| Persona desaparece o queda incompatible | se conserva la fila con `UNAVAILABLE` |
| Cambia una página por altas/bajas concurrentes | cursor físico evita repetir el ancla; pueden existir omisiones hasta refresh, nunca ampliación de scope |

No se promete ausencia absoluta de duplicados/omisiones entre páginas bajo cambios concurrentes. La UI deduplica defensivamente por `membershipId` dentro de una sesión sólo para presentación, sin convertir ese estado local en autoridad, y reinicia después de `ROSTER_CONTEXT_CHANGED`.

## 17. Errores y sanitización

| Reason | HTTPS | Semántica |
| --- | --- | --- |
| `UNAUTHENTICATED` | `unauthenticated` | falta identidad verificable |
| `ACCOUNT_REQUIRED` | `failed-precondition` | Cuenta ausente o no inicializada |
| `VALIDATION_FAILED` | `invalid-argument` | payload, límite o cursor inválido |
| `GROUP_NOT_ACCESSIBLE` | `permission-denied` | Grupo ausente o actor no Owner, indistinguibles |
| `INCOMPATIBLE_STATE` | `failed-precondition` | schema, cardinalidad, guard, período o correlación inválidos |
| `ROSTER_CONTEXT_CHANGED` | `aborted` | la Temporada del cursor ya no es la vigente |
| `DEPENDENCY_UNAVAILABLE` | `unavailable` | dependencia transitoria clasificada de forma cerrada |
| `INTERNAL_ERROR` | `internal` | defecto o error desconocido sanitizado |

No se devuelven paths, documentos, IDs internos adicionales, stack, PII, motivo de Persona no presentable ni lista parcial ante corrupción o dependencia fallida. Repetir una lectura es seguro porque no existen efectos ni idempotency key.

## 18. UX en `/dashboard/groups/[groupId]`

### 18.1 Ubicación y mensaje

Se agrega una sección independiente **“Integrantes”** al detalle administrativo canónico. El texto auxiliar indica: “Lista informativa de la Temporada abierta”. No utiliza “Administrar integrantes” ni promete acciones aún inexistentes.

El bloque “Tu acceso” conserva la distinción entre ownership y pertenencia. La fila del Owner lleva una etiqueta visual “Owner” sólo si `isOwner` es verdadero; esa etiqueta no cambia el orden ni implica que todo Owner sea integrante.

### 18.2 Estados

- **Carga inicial:** skeleton con `aria-busy` y texto anunciable “Cargando integrantes”.
- **Sin Temporada abierta:** mensaje específico; no se confunde con roster vacío.
- **Vacío terminal:** “Todavía no hay integrantes activos en la Temporada abierta”.
- **Éxito:** lista semántica con nombre completo o “Identidad no disponible”, fecha de incorporación y etiqueta Owner cuando corresponda.
- **Página siguiente:** botón “Cargar más”, single-flight, foco estable y anuncio de cantidad agregada.
- **Error recuperable:** mensaje sanitizado y botón “Reintentar”; el retry de página conserva el cursor salvo `ROSTER_CONTEXT_CHANGED`, que reinicia.
- **Pérdida de autorización:** se oculta el roster y se muestra el error de acceso; no se conservan datos como fallback.

### 18.3 Accesibilidad y responsive

- lista `ul/li` o tabla sólo si conserva encabezados accesibles en móvil;
- nombre como texto principal, estado/fecha como texto secundario;
- targets de al menos 44 px para retry y paginación;
- foco visible, estados en región `aria-live`, contraste suficiente;
- sin scroll horizontal a 360 px; distribución usable a 768 px y escritorio;
- skeleton no anuncia filas ficticias;
- ausencia deliberada de menú kebab, selección, baja, expulsión, suspensión o edición.

## 19. Seguridad y privacidad

- `memberships`, `personas`, guards y Períodos continúan sin lectura ni escritura directa del cliente;
- el backend con Admin SDK es el único compositor privilegiado;
- la autorización se verifica antes de consultar Membresías o Personas;
- Grupo inexistente y Grupo ajeno no son enumerables por diferencias públicas;
- la query fija `groupId`, `seasonId` y `estado`; no acepta filtros arbitrarios;
- el DTO contiene sólo referencia de Membresía, fecha funcional, `isOwner` y nombre/apellido presentables;
- `membershipId` no se renderiza ni se usa como autorización;
- no se devuelve email de Persona o Cuenta, UID, `personId`, foto, roles ni metadatos;
- los schemas desconocidos no se serializan parcialmente;
- no existe fallback a documentos `users` para identidad humana;
- las reglas deny-all de documentos internos se conservan; si ya cubren las rutas exactas, no requieren cambio;
- pruebas de reglas demuestran denegación para Owner, integrante, global admin y autenticado genérico.

### 19.1 Observabilidad

Registrar sólo operación `membership.owner-active-roster-list`, etapa sanitizada, outcome/reason, tamaño solicitado, cantidad devuelta, presencia de continuación, cantidad agregada de identidades no disponibles, latencia y clasificación de contención.

No registrar nombre, apellido, email, UID, `personId`, `membershipId`, `groupId` crudo, `seasonId`, cursor, payload completo, paths, documentos, guards, Períodos ni stack en respuesta. La correlación técnica, si resulta necesaria, utiliza identificadores hasheados según las convenciones existentes.

## 20. Compatibilidad v1/v2/v3

| Representación | Conducta E2-11 |
| --- | --- |
| Activa v1 íntegra | legible; requiere active guard correlacionado; no materializa Períodos |
| Finalizada v2 | excluida por estado; no se transforma |
| Activa v3 íntegra | legible; exige exactamente un Período abierto y resumen correlacionado |
| Finalizada v3 | excluida por estado |
| Schema desconocido recuperado por query | `INCOMPATIBLE_STATE` |
| Documento que no satisface predicados de query | no es adoptado ni presentado |

No existe migración por lectura. Una v1 no evoluciona a v3 por aparecer en el roster. E2-11 no inventa períodos, fechas ni guards.

## 21. Reglas Firestore e índices

El flujo cliente invoca únicamente el callable. Las reglas actuales deben conservar acceso directo denegado para:

- `memberships/{membershipId}`;
- `memberships/{membershipId}/validityPeriods/{periodId}`;
- `activeMembershipGuards/{guardId}`;
- `membershipLifecycleGuards/{guardId}`;
- `personas/{personId}`;
- `seasons/{seasonId}` y `openSeasonGuards/{groupId}` cuando se accedan como documentos internos.

No se abre una regla Owner-read sobre esas colecciones: Firestore Rules no debe convertirse en compositor ni exponer documentos completos. La implementación futura sólo modifica `firestore.rules` si una prueba demuestra que falta un deny-all explícito; nunca para habilitar lectura.

`firestore.indexes.json` requerirá el índice mínimo de la sección 13.4 si el Emulator y la query productiva exacta lo confirman. No se agregan índices especulativos.

## 22. Inventario y clasificación del legado

### 22.1 Superficies de Grupo

| Elemento actual | Evidencia | Disposición E2-11 |
| --- | --- | --- |
| `/dashboard/groups/[groupId]` | detalle Owner canónico, sin roster | **adaptar**: montar la sección nueva |
| `/dashboard/groups` | separa Grupos administrados e integrados | **reutilizar/conservar**: entrada al detalle; no mezclar readers |
| `/admin/groups/[groupId]` | lista `memberIds`, lee `users`, mezcla admins y ofrece altas/bajas | **aislar**: no reutilizar como autoridad ni retirar por tener consumidores activos |
| `/admin/groups/[groupId]/members/[memberId]` | detalle por UID y lecturas directas | **aislar**: fuera del roster canónico y de E2-11 |
| `/admin/groups` | navegación administrativa global/rol legacy | **fuera de alcance** |
| `/profile/groups` | consulta `memberIds array-contains`, cuenta miembros y compone `users` | **aislar**: no sustituir en E2-11; migración member-scoped posterior |
| `/profile/groups/[groupId]` | autoriza y lista por `memberIds/adminIds`, consulta `users`, Torneos | **aislar**: no ampliar acceso común; fuera de alcance |
| `/groups` pública | catálogo/ingreso público y residuos de pertenencia | **conservar/aislar**: no mostrar roster privado |
| `/groups/[groupId]` pública | detalle público con chequeos legacy | **conservar/aislar**: no montar la consulta Owner |

### 22.2 Servicios HTTP, BFF y componentes

| Elemento | Disposición E2-11 |
| --- | --- |
| `functions/src/httpApi.js` listados, search y altas/bajas por `memberIds` | **aislar**; no retirar porque las altas/bajas administrativas legacy siguen activas y no son reemplazadas por una consulta |
| BFF `/api/groups/[groupId]/members/search` | **aislar**; búsqueda de `users` no es composición Persona–Membresía |
| BFF `/members/[userId]/add` y `/remove` | **fuera de alcance**; writers administrativos legacy preservados |
| `AddMemberModal` y tipos | **aislar**; no reutilizar ni mostrar desde el detalle canónico |
| `MyCurrentGroupMembershipsSection`, service y cursor E2-04 | **reutilizar patrones** de paginación, validación y UI; no reutilizar contrato ni scope self-person |
| `OwnMembershipSection` E2-03/E2-05 y salida E2-10 | **conservar** sin cambios funcionales |
| `PendingGroupJoinRequestsSection` E2-07/E2-09 | **conservar**; Solicitud no se mezcla con roster |
| `UserAvatar` | **adaptar sólo si** soporta iniciales sin exigir foto/UID; no usar datos de Cuenta |
| hooks `useAuth`/providers | **reutilizar** sólo para token y estado de sesión; nunca para decidir ownership localmente |

### 22.3 Partidos, Torneos y otros consumidores

| Consumidor | Evidencia legacy | Disposición E2-11 |
| --- | --- | --- |
| `createMatch.js`, `eliminarMatch.js`, notification handler | propagan `memberIds` para participantes/notificaciones | **fuera de alcance**; no retirar ni migrar desde este reader Owner |
| `groupAdminsService.js` | usa pertenencia en arrays | **fuera de alcance** |
| `tournamentRegistrationService.js` | calcula cantidad desde `group.memberIds` | **fuera de alcance** |
| `tournamentQueries.ts` | consulta Grupos por `memberIds` y devuelve arrays | **fuera de alcance** |
| modales/entry de Torneos | muestran o cuentan integrantes desde arrays | **fuera de alcance** |
| páginas de Partido/perfil | leen `groups`/`users` y participantes directamente | **fuera de alcance** |
| `PlayersTable`, Team components y share helpers | consumen participantes de Partido/Equipo | **fuera de alcance**; no son roster de Membresía |

E2-11 no declara retirado ningún array global ni rompe un consumidor activo. Sólo prohíbe que el nuevo flujo los lea y deja inventario explícito para migraciones posteriores por flujo.

## 23. Inventario técnico candidato para implementación futura

Los nombres privados pueden ajustarse durante implementación sin cambiar responsabilidades ni contrato público.

### 23.1 Backend

| Archivo | Disposición prevista |
| --- | --- |
| `functions/callables/listActiveGroupMembersForOwnedGroup.js` | crear callable delgado |
| `functions/index.js` | adaptar para exportar el callable |
| `memberships/application/membershipContract.js` | adaptar con payload Owner-roster cerrado |
| `memberships/application/ownerGroupMembersCursor.js` | crear cursor v1 separado del cursor self-person |
| `memberships/application/membershipDto.js` | adaptar o extraer DTO cerrado de roster |
| `memberships/application/membershipErrors.js` | adaptar reasons acotados |
| `memberships/application/membershipService.js` | adaptar coordinación de sólo lectura |
| `memberships/application/membershipObservability.js` | adaptar operación sin PII |
| `memberships/infrastructure/firestoreActiveGroupMembersForOwnerReader.js` | crear query, integridad y paginación |
| `memberships/infrastructure/membershipModule.js` | adaptar cableado |
| `groups/public/groupRosterContextCapability.js` | crear capacidad Owner + Temporada mínima |
| `persons/public/activeGroupMemberPersonCapability.js` | crear proyección nombre/apellido con estado cerrado |

No se modifica el dominio de Membresía, Persona, Grupo o Temporada salvo que una prueba revele una brecha de hidratación ya exigida por sus invariantes; no se agrega comportamiento de escritura.

### 23.2 Frontend

| Archivo | Disposición prevista |
| --- | --- |
| `src/services/membershipsService.ts` | adaptar callable, errores y paginación |
| `src/types/ActiveGroupMember.ts` | crear tipos exactos del DTO |
| `src/components/memberships/ActiveGroupMembersSection.tsx` | crear sección informativa |
| `/dashboard/groups/[groupId]/page.tsx` | adaptar montaje sin tocar autorización local |

### 23.3 Infraestructura y pruebas

| Archivo | Disposición prevista |
| --- | --- |
| `firestore.indexes.json` | adaptar sólo con índice confirmado |
| `firestore.rules` | conservar; adaptar sólo para deny-all explícito faltante |
| unitarias de contrato/cursor/servicio/DTO/observabilidad | adaptar o crear |
| `membershipArchitecture.test.js` | adaptar límites, ausencia legacy y frontend callable-only |
| `membershipOwnerRosterE2.test.js` | crear suite Emulator E2-11 |
| prueba de componente/estado de paginación | crear según infraestructura existente |

## 24. Plan de pruebas

### 24.1 Contrato, autorización y privacidad

- Owner vigente obtiene la primera página;
- no autenticado recibe `UNAUTHENTICATED`;
- Cuenta ausente recibe `ACCOUNT_REQUIRED` antes de consultar roster;
- Grupo inexistente y no-Owner reciben el mismo `GROUP_NOT_ACCESSIBLE`;
- rol global sin ownership es rechazado;
- integrante no-Owner es rechazado;
- IDs técnicos conocidos no permiten consulta transversal;
- payload no plano, propiedad desconocida, `ownerUid`, `personId`, `seasonId`, estado, filtro u orden son rechazados;
- respuesta no contiene email, UID, `personId`, `seasonId`, guards, schemas, períodos ni timestamps técnicos;
- `membershipId` existe en DTO pero no se renderiza.

### 24.2 Fuente, cardinalidad y compatibilidad

- Grupo sin integrantes devuelve vacío terminal;
- Owner sin Membresía no aparece;
- Owner con Membresía aparece una vez con `isOwner: true`;
- varias Membresías activas válidas generan varias filas;
- Membresías finalizadas v2/v3 quedan excluidas;
- activa v1 y activa v3 conviven y se presentan;
- activa v3 exige un único Período abierto;
- documento desconocido recuperado por query falla cerrado;
- active guard ausente, duplicado o inconsistente falla cerrado;
- duplicados Persona–Grupo activos fallan sin reparación;
- `memberIds` y demás arrays no alteran resultados;
- cero escrituras y cero efectos colaterales.

### 24.3 Temporada, orden y paginación

- única Temporada abierta correlacionada define el scope;
- cero abiertas devuelve `NO_OPEN_SEASON`;
- dos abiertas o guard incoherente devuelve `INCOMPATIBLE_STATE`;
- activa de Temporada cerrada/histórica no aparece;
- el cliente no puede elegir otra Temporada;
- orden `fechaIngreso ASC, membershipId ASC`, incluidos empates;
- default 20, límites 1/20 y rechazo 0/21/no entero;
- primera, intermedia y última página;
- exactamente 20 y 21 documentos, lookahead y cursor real;
- resultado vacío únicamente terminal, sin cursor;
- cursor Base64URL, JSON canónico, UTF-8 estricto y checksum;
- cursor de otro Grupo/contrato/orden rechazado;
- cambio de Temporada produce `ROSTER_CONTEXT_CHANGED`.

### 24.4 Persona y presentación

- Persona compatible devuelve sólo nombre/apellido;
- Persona ausente produce `UNAVAILABLE` sin perder la fila;
- Persona incompatible o no presentable produce el mismo DTO indistinguible;
- no existe fallback a `users`, Auth, email o UID;
- dependencia transitoria de Personas falla la página completa;
- dos Personas homónimas conservan filas distintas por `membershipId`.

### 24.5 Concurrencia

- transferencia antes de autorizar rechaza al Owner anterior;
- transferencia concurrente no concede páginas posteriores por cursor previo;
- finalización antes de snapshot excluye y después de snapshot se corrige al refrescar;
- reactivación concurrente se incluye sólo si cumple scope e integridad al punto de lectura;
- cierre/cambio de Temporada entre páginas invalida contexto;
- desaparición/cambio de Persona respeta la semántica `AVAILABLE`/`UNAVAILABLE`;
- cambios de página no amplían Grupo/Temporada ni filtran datos ajenos.

### 24.6 Frontend, reglas y arquitectura

- estados vacío, sin Temporada, carga, éxito, error, retry y cargar más;
- `ROSTER_CONTEXT_CHANGED` reinicia desde primera página;
- lista accesible, foco, anuncios y responsive 360/768/escritorio;
- etiqueta Owner correcta y distinción ownership/pertenencia;
- ausencia de botones, menús o selección administrativa;
- cliente usa sólo callable y no importa Firestore para el roster;
- lectura y escritura directa cliente denegadas sobre Membresías, Personas, guards y Períodos;
- global admin, Owner, integrante y autenticado genérico no evaden rules deny-all;
- ningún repositorio cruza Agregados ni se crea un Agregado roster;
- regresión E2-01 a E2-10, en especial E2-04, E2-05, E2-09 y E2-10.

## 25. UAT futura

### 25.1 Entorno y cuentas

- Auth, Firestore y Functions Emulator en loopback y proyecto `demo-*` explícito;
- frontend local apuntando al mismo proyecto Emulator;
- Cuenta A: Google existente, Owner del Grupo;
- Cuenta B: Google existente, Persona y Membresía activa, no Owner;
- Cuenta C: Google existente, autenticada, sin ownership del Grupo;
- datos sintéticos por IDs registrados y cleanup exclusivamente de esos fixtures;
- cero Firebase remoto y cero integración implícita de la rama Auth/UAT.

### 25.2 Recorrido manual obligatorio

1. A abre `/dashboard/groups/[groupId]` y ve “Integrantes”.
2. A ve a B cuando B posee una Membresía activa de la Temporada abierta.
3. B finaliza su Membresía mediante E2-10 o una fixture controlada; A refresca y ya no la ve.
4. A aparece sólo cuando posee su propia Membresía activa; ownership por sí solo no crea fila.
5. C intenta la URL y una invocación callable directa y no puede consultar el roster.
6. En un Grupo/Temporada sin Membresías, A ve el vacío correcto.
7. En un Grupo sin Temporada abierta, A ve el estado específico y no un falso “sin historia”.
8. La UI no contiene botones de baja, expulsión, suspensión, edición ni selección.
9. Red/UI no exhiben UID, `personId`, `seasonId`, email, guards, Períodos ni datos privados; `membershipId` no se muestra.
10. Se verifica teclado, foco, loading, retry, cargar más y 360/768/escritorio.

La incorporación de B puede recorrerse por Solicitud E2-06/E2-07/E2-09. La Membresía propia de A puede crearse por E2-03. Activa v1, Persona ausente/incompatible, duplicados, carreras y múltiples páginas pueden acreditarse con fixture controlada y evidencia Emulator si no existe UI pública para producirlos. Esa ausencia es una precondición de prueba, no un defecto del listado.

## 26. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Presentar arrays como pertenencia | query exclusiva sobre Membresía y pruebas de independencia frente a `memberIds` |
| Exponer PII de Persona | capacidad interna mínima y DTO cerrado sin email/UID/foto |
| Owner tratado automáticamente como integrante | fila sólo por Membresía activa; prueba Owner con/sin Membresía |
| Roster de Temporada equivocada | resolución autoritativa, cursor ligado a season y error de contexto cambiado |
| Corrupción silenciosa o duplicados | falla cerrada de página completa, sin reparación |
| Pérdida de filas por Persona ausente | conservar fila con estado indistinguible `UNAVAILABLE` |
| Orden alfabético inestable | orden por fecha autoritativa e ID técnico |
| Lectura ilimitada/N+1 costoso | máximo 20, lookahead y medición de latencia |
| Cursor usado como autorización | revalidar Cuenta, Grupo y Owner en cada página |
| Transferencia filtra una página posterior | reautorización por request y descarte UI al perder acceso |
| Doble autoridad durante transición | nuevo flujo no lee/escribe arrays; legado queda aislado por consumidor |
| Roster interpretado como administración | microcopy informativa y ausencia contractual/visual de comandos |
| Lectura privilegiada desde cliente | callable backend-only y rules deny-all |

## 27. Criterios de aceptación Dado/Cuando/Entonces

1. **Dado** un Owner vigente y una Temporada abierta íntegra, **cuando** consulta, **entonces** recibe sólo Membresías activas válidas de ese Grupo y Temporada.
2. **Dado** un Grupo inexistente o ajeno, **cuando** un autenticado conoce su ID, **entonces** recibe `GROUP_NOT_ACCESSIBLE` sin distinguir ambos casos.
3. **Dado** un rol global sin ownership, **cuando** consulta, **entonces** es rechazado.
4. **Dado** un integrante no Owner, **cuando** consulta, **entonces** no enumera Personas ni Membresías ajenas.
5. **Dado** un Owner sin Membresía, **cuando** obtiene el roster, **entonces** no aparece por ownership.
6. **Dado** un Owner con Membresía activa válida, **cuando** obtiene el roster, **entonces** aparece una vez con `isOwner: true`.
7. **Dado** una activa v1 y una activa v3 íntegras, **cuando** se listan, **entonces** ambas aparecen sin migración ni escritura.
8. **Dado** una Membresía finalizada, histórica o de otra Temporada, **cuando** se lista el roster actual, **entonces** no aparece.
9. **Dado** cero Temporadas abiertas, **cuando** el Owner consulta sin cursor, **entonces** recibe `NO_OPEN_SEASON` y lista vacía.
10. **Dado** cardinalidad, guard, período o schema incompatible, **cuando** se consulta, **entonces** falla cerrado sin lista parcial ni reparación.
11. **Dado** una Persona ausente o incompatible, **cuando** su Membresía es válida, **entonces** la fila permanece y la identidad se presenta como `UNAVAILABLE` sin fallback privado.
12. **Dado** varias filas y empates, **cuando** se recorren páginas, **entonces** el orden es `fechaIngreso ASC, membershipId ASC` y el cursor usa la última Membresía incluida en `items`, nunca el documento de lookahead.
13. **Dado** un cursor de Temporada anterior, **cuando** cambia el contexto abierto, **entonces** se devuelve `ROSTER_CONTEXT_CHANGED` y la UI reinicia.
14. **Dado** una transferencia de ownership, **cuando** el anterior Owner solicita otra página, **entonces** es reautorizado y rechazado.
15. **Dado** una finalización o reactivación concurrente, **cuando** la lectura se confirma, **entonces** sólo afirma el estado válido en su punto de lectura y no modifica la Membresía.
16. **Dado** arrays legacy contradictorios, **cuando** se consulta, **entonces** no alteran filas, orden, cardinalidad ni autorización.
17. **Dado** el DTO exitoso, **cuando** se inspecciona, **entonces** no contiene email, UID, `personId`, `seasonId`, guards, Períodos, schemas ni timestamps técnicos.
18. **Dado** la sección visible, **cuando** se usa en móvil, escritorio o teclado, **entonces** conserva accesibilidad, retry y paginación sin controles administrativos.
19. **Dado** cualquier ejecución o error, **cuando** termina, **entonces** existen cero escrituras y cero efectos sobre cualquier Agregado.
20. **Dado** un cliente directo, **cuando** intenta leer o escribir colecciones internas, **entonces** Firestore Rules lo deniega aun si es Owner.

## 28. Definition of Done

E2-11 podrá declararse terminado únicamente cuando:

- la ficha haya sido aprobada y versionada antes de implementar;
- el contrato exacto `listActiveGroupMembersForOwnedGroup` esté implementado y exportado;
- actor, Cuenta, ownership y payload se validen de forma cerrada;
- Temporada abierta se resuelva autoritativamente sin `seasonId` cliente;
- Membresía sea la única fuente de filas y active v1/v3 se validen estrictamente;
- Persona se componga server-side con la proyección mínima y estado `UNAVAILABLE` indistinguible;
- el DTO, orden, paginación, cursor y errores coincidan con esta ficha;
- el índice mínimo esté justificado por la query real y probado en Emulator;
- rules deny-all permanezcan cerradas para documentos internos;
- `/dashboard/groups/[groupId]` cubra todos los estados y no muestre acciones administrativas;
- ninguna ruta nueva lea Firestore directamente desde cliente;
- tests unitarios, contractuales, arquitectónicos, frontend y Emulator aprueben;
- se demuestren todos los casos mínimos de autorización, cardinalidad, privacidad, concurrencia y ausencia de efectos;
- regresión E2-01 a E2-10, lint, typecheck, build, sintaxis y `git diff --check` aprueben según el gate vigente;
- UAT con A/B/C apruebe y distinga evidencia manual de fixtures/Emulator;
- el informe de implementación inventaríe archivos, resultados, diferencias justificadas y estado Git;
- no haya deploy, acceso remoto, migración, limpieza global ni integración Auth/UAT sin autorización separada;
- la futura baja administrativa permanezca fuera de E2-11.

## 29. Dependencias futuras desbloqueadas

- selección inequívoca de una Membresía de tercero mediante `membershipId` obtenido dentro de un roster autorizado;
- definición separada de finalización administrativa Owner-scoped;
- futura asignación contextual de roles/cargos sin usar UID o arrays como pertenencia;
- convocatoria de integrantes mediante capacidad pública de Membresías;
- retiro posterior, por consumidor, de listados `memberIds` en administración, perfil, Partidos y Torneos.

Ninguna dependencia queda implementada o autorizada por esta ficha.

## 30. Decisiones pendientes

No quedan decisiones funcionales, de autorización, privacidad, cardinalidad, fuente de verdad, Temporada, DTO u orden pendientes.

Los nombres privados de helpers y archivos de prueba, la composición visual exacta dentro de la grilla y ajustes menores de microcopy son decisiones reversibles de implementación. No justifican mantener el incremento “En definición” mientras respeten el contrato y las responsabilidades cerradas.

## Declaración final

E2-11 queda definido como una consulta Owner-scoped, paginada y sin efectos. La única fuente de pertenencia es Membresía activa v1/v3 de la única Temporada abierta; el Owner no es integrante por ownership; Persona aporta sólo nombre y apellido mediante backend; una identidad no presentable no borra la fila; el orden usa primera incorporación y Membresía como desempate; cada página reautoriza ownership; y ningún array legacy, rol global o lectura directa del cliente participa.

La ficha no implementa baja administrativa ni modifica Agregados, reglas, índices, código o documentación existente.

`E2-11 APROBADA`
