# Ficha de Incremento Implementable E2-01 — Alta mínima de Grupo propio, ownership y acceso contextual del Owner

## Estado de la ficha

- **Estado:** `LISTO PARA IMPLEMENTAR`.
- **Responsable:** Rodolfo.
- **Fecha:** 2026-08-25.
- **Rama o checkpoint de partida:** `dev` remoto en `e1f2272f7a42e04dff8d53869142e9a8ad015294`.
- **Rama prevista para la implementación posterior:** `feat/e2-01-grupo-ownership` (no creada por esta intervención).
- **Estado Git local al definir la ficha:** no verificable: el entorno de definición no contiene un checkout Git. La rama y el HEAD indicados fueron verificados sobre `origin/dev` mediante acceso remoto de sólo lectura. Antes de implementar deberá comprobarse que el checkout local esté limpio y que `dev` continúe en este checkpoint o revisar el delta.
- **Etapa del roadmap:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Estado de etapa confirmado:** Etapas 0 y 1 cerradas; Etapa 2 `HABILITADA PARA DEFINICIÓN`.
- **Ambiente autorizado para la implementación futura:** Firebase Emulator Suite, proyecto `demo-*`, hosts loopback y datos sintéticos descartables.
- **Ambiente remoto:** fuera de alcance; no se autoriza consulta, despliegue ni modificación.

### Naturaleza de las decisiones

- Los Documentos 1–4 congelados determinan significado, ownership, límites de Agregado, separación Deportivo/Comercial y comportamiento de CU-011.
- Documento 1.5 confirma que Owner es el Usuario propietario, que cada recurso tiene un único Owner vigente y que ownership no es Membresía.
- Documento 5 canónico en `dev`, actualizado al cierre de Etapa 1, determina el corte E2-01, la plantilla y la transición por flujo.
- Los cierres, fichas e informes E1 determinan contratos de identidad disponibles, escritura backend-only, autorización `self-account`, pruebas y convenciones de implementación ya verificadas.
- El informe de auditoría y el código en `dev` son evidencia técnica. Los arrays, roles y accesos directos legados no adquieren carácter normativo.
- Las decisiones de nombres internos de archivos, exports o clases podrán ajustarse durante la implementación sin alterar los contratos lógicos, invariantes, persistencia ni criterios de esta ficha.

### Decisiones cerradas por esta ficha

1. El esquema canónico mínimo de Grupo será cerrado y estará formado por identidad documental opaca, `nombre`, `deporte`, `ownerId`, `estado`, `createdAt` y `schemaVersion`.
2. El estado inicial será `activo`, asignado por backend. Significa existencia organizativa vigente; no habilita operaciones deportivas, Membresías ni una Temporada.
3. En esta versión el catálogo aceptado de deporte contiene únicamente el código estable `voleibol`; la UI muestra “Vóley”. No se admite texto deportivo libre.
4. El nombre no es único, ni globalmente ni por Owner.
5. La política transitoria permite como máximo un Grupo propio por Usuario y falla cerrado.
6. La concurrencia y la idempotencia se serializan mediante un control técnico transitorio por Usuario, persistido fuera del Agregado Grupo y confirmado atómicamente con el Grupo.
7. El control transitorio no representa Plan, Suscripción, permiso, rol ni derecho comercial. Debe retirarse o sustituirse antes de habilitar un segundo Grupo o implementar Comercial.
8. El acceso E2-01 es exclusivamente `owner-access`. No existe `member-access` ni autoridad por `users.roles`.
9. La nueva UI owner-scoped residirá lógicamente bajo `/dashboard/groups`, separada del layout administrativo global legado.
10. No quedan decisiones funcionales o físicas fundamentales abiertas para comenzar la implementación.

### Tensiones y contradicciones analizadas

| Hallazgo | Análisis | Resolución E2-01 |
|---|---|---|
| El PDF adjunto de Documento 5 es anterior al cierre de Etapa 1 | No contiene el estado operativo más reciente | Se usa el Markdown canónico de `dev`, que declara Etapa 1 cerrada y Etapa 2 habilitada |
| Documento 5 admite temporalmente `NO APLICA` para Comercial, mientras este corte exige no dejar creación ilimitada | Declarar simplemente `NO APLICA` permitiría altas sin límite y no satisface la política conservadora solicitada | Se introduce un límite transitorio de Aplicación de un Grupo; no se simula Comercial |
| Etapa 2 menciona Persona identificable, pero Owner es Usuario y E2-01 no requiere Persona | La dependencia de etapa no convierte Persona en precondición universal de cada operación | E2-01 requiere Usuario materializado; Persona es opcional y no se consulta |
| El legado crea al Owner también como miembro y administrador | Confunde ownership, Membresía y administración delegada | El Grupo nuevo sólo persiste `ownerId`; no crea arrays, Membresía ni administrador contextual |
| El legado autoriza con `users.roles === "admin"` | Es autoridad global incompatible con el modelo congelado | El rol global se ignora expresamente; un `admin` no Owner es rechazado |
| Una consulta por `ownerId` no basta para serializar dos creaciones concurrentes diferentes | Dos solicitudes podrían observar simultáneamente capacidad disponible | Se usa un único control técnico transitorio por Usuario como punto de contención transaccional |
| Usar sólo el UID como ID de Grupo simplificaría el límite de uno | Acoplaría identidad del recurso al límite provisional e impediría múltiples Grupos futuros | El Grupo usa ID aleatorio opaco; el UID sólo identifica el control transitorio |

---

## 1. Identificación

- **ID del incremento:** E2-01.
- **Nombre:** Alta mínima de Grupo propio, ownership y acceso contextual del Owner.
- **Caso de uso incluido:** CU-011 — Crear un Grupo, en su forma mínima.
- **Capacidades de soporte incluidas:**
  - listar Grupos propios por ownership;
  - consultar la vista básica de un Grupo propio;
  - obtener la proyección mínima para el dashboard;
  - representar estado vacío y navegar hacia la creación;
  - resolver reintentos, respuesta perdida y concurrencia;
  - aplicar el límite transitorio de un Grupo propio.
- **Casos de uso expresamente excluidos:** CU-012 a CU-015; CU-016 a CU-019; CU-025 a CU-033; transferencia de ownership; administradores delegados; incorporación de integrantes; Persona administrada; Membresía; Temporada; Solicitud; Club; Plan; Suscripción; visibilidad pública; configuración; operaciones deportivas; migración global o remota.
- **Documentos y secciones normativas relacionadas:**
  - Documento 1, modelo de administración, Grupo, Owner y evolución multi-deporte;
  - Documento 1.5, §§2.4–2.6 y propiedad de recursos;
  - Documento 2, CU-011 y separación de la evaluación comercial;
  - Documento 3, Agregado Grupo y límites de consistencia;
  - Documento 4, flujo Deportivo/Comercial, Repositorio de Grupo, seguridad y pruebas;
  - Documento 5, §§3.12, 4.14, 5.16–5.18 y 7.4;
  - cierres, fichas e informes E1-01, E1-02 y E1-03.
- **Brechas técnicas atendidas:**
  - parte de TECH-GAP-04: Grupo nuevo sin relaciones embebidas;
  - parte de TECH-GAP-08: contratos backend en lugar de acceso Firestore desde UI;
  - parte de TECH-GAP-09: la Presentación deja de crear o coordinar invariantes de Grupo;
  - sustitución por flujo del rol global y del escritor directo de alta de Grupo.

## 2. Objetivo funcional

Permitir que un Usuario autenticado, con su cuenta digital materializada, cree un Grupo organizativamente válido y quede registrado como su único Owner vigente. El actor podrá confirmar el resultado persistido, listar sus Grupos por ownership y abrir una vista básica del Grupo sin necesitar Persona, Membresía ni Temporada.

El corte agrupa alta y consulta porque la creación no está completa si el actor no puede recuperar de forma autorizada el recurso confirmado. No habilita todavía la administración general ni la actividad deportiva.

La operación preserva expresamente:

`autorización funcional ≠ habilitación comercial ≠ validez de dominio`

## 3. Actores

| Actor | Participación | Contexto | Resultado esperado |
|---|---|---|---|
| Usuario autenticado | Actor principal | Firebase Authentication y cuenta `Usuario` materializada | Crear y consultar su Grupo como Owner |
| Owner | Rol contextual sobre un Grupo existente | Coincidencia entre UID verificado y `Grupo.ownerId` | Acceder a listado y vista básica |
| Sistema | Coordinador | Identidad, cuenta, política transitoria, Agregado y persistencia | Confirmar una única creación consistente e idempotente |
| Authentication | Servicio técnico externo | Token verificado | Proveer el UID confiable del actor |
| Cuenta de Usuario | Capacidad pública de Identidad | `self-account` | Confirmar que el actor posee cuenta materializada |
| Evaluador transitorio de capacidad | Componente de Aplicación | Límite provisional, no Comercial | Autorizar como máximo un Grupo propio o fallar cerrado |

No son actores habilitantes Persona, integrante, administrador delegado, rol global `admin`, Plan ni Suscripción.

## 4. Precondiciones

1. El actor está autenticado y el token fue verificado por backend.
2. Existe una cuenta `Usuario` válida para el UID autenticado.
3. El cliente aporta exactamente nombre, deporte y clave de idempotencia.
4. El evaluador transitorio puede leer y bloquear su control por Usuario.
5. El actor no posee ya un Grupo propio según el control transitorio ni un documento de Grupo atribuible por `ownerId`.
6. No se requiere `Usuario.personaId`; su ausencia es un estado válido.
7. No se requiere Membresía, Temporada, Club, rol global ni estado comercial persistido.
8. El backend y Firestore Emulator están disponibles en el ambiente de implementación/prueba.
9. Antes de programar deberá verificarse un checkout local limpio sobre el checkpoint aprobado.

## 5. Flujo principal

1. El Usuario abre “Mis Grupos”.
2. El sistema recupera su cuenta mediante `self-account` y lista Grupos por el UID verificado.
3. Si no existen Grupos, muestra el estado vacío y la acción “Crear Grupo”.
4. El Usuario ingresa nombre, selecciona deporte y confirma.
5. La Presentación genera una clave de idempotencia nueva para esa intención de alta, bloquea envíos duplicados y envía sólo los tres campos permitidos.
6. El backend verifica Authentication y obtiene el UID exclusivamente del token.
7. Recupera y valida la cuenta del actor; no consulta ni crea Persona.
8. Valida el payload cerrado y normaliza nombre y deporte.
9. Evalúa el límite transitorio mediante el control técnico del actor. Si no puede evaluarlo, falla cerrado.
10. Crea un ID opaco de Grupo en backend.
11. Dentro de una transacción lee el control transitorio, comprueba reintento/capacidad y, si corresponde, verifica que no exista un Grupo previo atribuible al Owner.
12. Crea un único Agregado Grupo con Owner derivado del UID, estado inicial del sistema y esquema mínimo.
13. Confirma conjuntamente el Grupo y el estado técnico requerido para reconocer el mismo reintento.
14. Devuelve el DTO construido desde el estado persistido con outcome `created`.
15. La Presentación muestra confirmación y navega a `/dashboard/groups/{groupId}`.
16. La vista básica recupera el Grupo mediante `owner-access`; si no tiene Membresías ni Temporada, representa una organización válida todavía vacía.

No existen eventos, proyecciones, notificaciones ni escrituras colaterales en este flujo.

## 6. Flujos alternativos y errores

| Condición | Respuesta funcional | Estado resultante | Feedback al actor | ¿Permite reintento? |
|---|---|---|---|---|
| Sin token válido | `UNAUTHENTICATED` | Sin cambios | “Iniciá sesión nuevamente” | Sí, después de autenticarse |
| Cuenta inexistente | `ACCOUNT_REQUIRED` | Sin cambios | “No pudimos inicializar tu cuenta” y acción de reintento de cuenta | Sí |
| Cuenta malformada o referencia de Owner inválida | `DEPENDENCY_UNAVAILABLE` | Sin cambios | Error recuperable sin afirmar creación | Sí, tras corregir dependencia |
| Nombre o deporte inválido | `VALIDATION_FAILED` | Sin cambios | Error asociado al campo | Sí, corrigiendo datos |
| Campo desconocido | `VALIDATION_FAILED` | Sin cambios | Solicitud no válida | Sí, con contrato correcto |
| Ya existe un Grupo propio con otra clave | `PROVISIONAL_LIMIT_REACHED` | Grupo previo intacto | Explicar límite provisional de un Grupo | No mientras persista el límite |
| Misma clave y mismo payload ya confirmado | `existing` | Sin cambios nuevos | Confirmación del Grupo existente | No hace falta; es éxito idempotente |
| Misma clave con payload diferente | `CONFLICT` | Sin cambios | “La operación ya fue usada con otros datos” | Sí, con nueva intención/clave |
| Dos solicitudes iguales simultáneas | Una `created`; la otra `existing` | Un Grupo y un control | Una única confirmación funcional | Sí, seguro |
| Dos solicitudes diferentes simultáneas | Una `created`; la otra `PROVISIONAL_LIMIT_REACHED` | Un solo Grupo | Límite alcanzado para la perdedora | No bajo esta política |
| Conflictos transaccionales agotados | `CONFLICT` | Sin commit nuevo | Error recuperable | Sí |
| Fallo antes del commit | Error estable según causa | Sin Grupo ni control parcial | “No se creó el Grupo” cuando sea demostrable | Sí, misma clave |
| Commit exitoso y respuesta perdida | El reintento devuelve `existing` | Un solo Grupo | Confirmación persistida | Sí, misma clave |
| Control existente apunta a Grupo ausente o inválido | `DEPENDENCY_UNAVAILABLE` | No se crea reemplazo silencioso | “No pudimos verificar el estado de creación” | Tras reparación |
| Dependencia temporalmente no disponible | `DEPENDENCY_UNAVAILABLE` | Sin cambios nuevos | Error recuperable | Sí |
| Persistencia falla con causa no clasificable | `INTERNAL_ERROR` estable | Sin afirmar éxito | Error genérico con correlación técnica | Sí, misma clave |
| Consulta de ID inexistente | `NOT_FOUND` | Sin cambios | “Grupo no encontrado” | Sí, con ID correcto |
| Consulta por autenticado no Owner, incluso rol global `admin` | `NOT_AUTHORIZED` | Sin datos expuestos | “No tenés acceso a este Grupo” | No, salvo cambio contextual futuro |

## 7. Postcondiciones y criterios de aceptación

### Postcondiciones

- Existe como máximo un nuevo Grupo canónico para el Usuario bajo la política transitoria.
- El Grupo posee exactamente un Owner vigente igual al UID autenticado de la creación.
- El Owner no fue creado como integrante, administrador delegado ni Persona.
- No existen Membresías, Temporadas, Solicitudes, Planes, Suscripciones ni proyecciones creadas por el flujo.
- El Grupo puede recuperarse por ownership mediante contratos backend.
- El cliente no escribió ni leyó directamente el documento canónico.
- El control transitorio permite reconocer el mismo reintento y serializa solicitudes diferentes.
- Las estructuras legadas no son autoridad para el Grupo canónico.

### Criterios Dado / Cuando / Entonces

| ID | Dado | Cuando | Entonces |
|---|---|---|---|
| AC-01 | un Usuario autenticado, con cuenta válida, sin Grupo propio y payload válido | crea un Grupo | se persiste un Grupo, el outcome es `created` y la vista básica queda accesible |
| AC-02 | un Usuario con cuenta válida pero sin Persona vinculada | crea un Grupo | la creación se confirma y no se crea ni modifica Persona |
| AC-03 | un Usuario autenticado cuyo UID es `U1` | envía el comando | `ownerId` queda en `U1` aunque el cliente no lo haya enviado |
| AC-04 | un payload que intenta incluir `ownerId: U2` | llega al contrato | se rechaza por campo desconocido y no se crea Grupo |
| AC-05 | un Usuario con `users.roles === "admin"` que no es Owner | consulta un Grupo canónico ajeno | recibe `NOT_AUTHORIZED` y ningún dato del Grupo |
| AC-06 | un Grupo recién creado sin Membresías | el Owner abre su vista | se muestra como organización válida vacía, sin error ni alta automática |
| AC-07 | un Grupo recién creado sin Temporada | el Owner abre su vista | se muestra válido y no se redirige a onboarding deportivo |
| AC-08 | un payload con cualquier propiedad no declarada | intenta crear | se rechaza completo; no se ignoran ni persisten propiedades |
| AC-09 | un Usuario que ya posee un Grupo bajo el límite provisional | inicia otra intención | recibe `PROVISIONAL_LIMIT_REACHED` y no se crea un segundo Grupo |
| AC-10 | una creación cuyo commit concluyó pero la respuesta no llegó | se reintenta con la misma clave y payload | se devuelve `existing` con el mismo ID y no se duplica |
| AC-11 | una operación ya confirmada | se repite la misma solicitud | se devuelve el estado persistido, no una reconstrucción desde el payload |
| AC-12 | dos solicitudes simultáneas con misma clave y mismo payload | compiten | existe un Grupo; los outcomes observables son `created` y `existing` |
| AC-13 | dos solicitudes simultáneas con claves o payloads diferentes | compiten por el límite | sólo una crea; la otra recibe límite o conflicto estable, nunca crea otro Grupo |
| AC-14 | un Owner autenticado | consulta su ID de Grupo | recibe la proyección mínima mediante `owner-access` |
| AC-15 | un Usuario autenticado no Owner | consulta el mismo ID | recibe `NOT_AUTHORIZED` sin DTO |
| AC-16 | cualquier cliente Firebase, incluso el Owner o un rol global `admin` | intenta crear, modificar o eliminar directamente un Grupo canónico | las reglas deniegan la escritura |
| AC-17 | la UI E2-01 está en ejecución | lista, crea o consulta Grupo | no importa Firestore para el flujo ni ejecuta lecturas/escrituras directas |
| AC-18 | una creación válida | finaliza | no existen escrituras nuevas en Usuario, Persona, Membresía, Temporada, Solicitud, Plan, Suscripción, Actividad ni dashboard |
| AC-19 | nombre idéntico en otro contexto futuro o en datos sintéticos | se valida el alta | el nombre por sí solo no causa conflicto; la capacidad depende del Owner y la política vigente |
| AC-20 | el evaluador transitorio o su estado no pueden verificarse | se intenta crear | la operación falla cerrada y no afirma derecho de Plan Free |

## 8. Frontend

### Pantallas afectadas

- **Nueva:** `/dashboard/groups` — “Mis Grupos”, owner-scoped.
- **Nueva:** `/dashboard/groups/new` — formulario mínimo.
- **Nueva:** `/dashboard/groups/{groupId}` — vista básica organizativa.
- **Modificada:** dashboard y navegación protegida para exponer “Mis Grupos”.
- **Retirada como autoridad del alta:** `/admin/groups/new`, que actualmente escribe `groups` desde el cliente y exige rol global.
- **Aisladas:** vistas públicas, de perfil por Membresía y administración detallada legada.

### Acciones

- abrir “Mis Grupos”;
- crear Grupo cuando el estado esté vacío y la política lo permita;
- completar nombre;
- seleccionar “Vóley” como deporte;
- confirmar una vez;
- reintentar con la misma clave mientras la intención y los datos no cambien;
- abrir el detalle básico confirmado.

### Estados visuales

- **Inicial:** carga de cuenta y Grupos.
- **Vacío:** explicación breve y CTA “Crear Grupo”.
- **Formulario:** nombre y deporte; botón deshabilitado si el contrato local básico no se satisface.
- **Enviando:** controles bloqueados y anuncio accesible; no se genera otra clave por doble clic.
- **Éxito:** confirmación desde respuesta persistida y navegación al detalle.
- **Límite:** mensaje diferenciado del rechazo de autorización y del error de dominio.
- **Error recuperable:** conserva los datos y la misma clave para reintentar.
- **No autorizado:** sin renderizar información del Grupo.
- **Dependencia no disponible:** no muestra éxito especulativo.

### Reglas de interacción

- La clave se crea al iniciar una intención de alta y se conserva durante reintentos; cambiar nombre o deporte después de un intento exige iniciar una intención nueva.
- No hay actualización optimista. La confirmación se basa exclusivamente en el DTO persistido.
- Debe existir etiqueta visible, asociación `label`/control, foco sobre el primer error, navegación por teclado, `aria-live` para resultado y contraste suficiente.
- En móvil se usa una columna, controles táctiles de tamaño adecuado y acciones visibles sin scroll horizontal.
- Si falta Persona, se explica: “Podés administrar este Grupo como Owner. Las funciones que requieren integrantes estarán disponibles cuando se incorporen Membresías”.
- Sin Membresías o Temporada se muestra una vista organizativa vacía. No se piden posición, dorsal, cargo ni rol.
- No se presentan acciones de edición, transferencia, integrantes, invitaciones, configuración ni deportes operativos.

## 9. Servicio de Aplicación responsable

- **Módulo propietario:** Módulo Grupos, Dominio Deportivo.
- **Servicio de Aplicación lógico de comando:** Crear Grupo propio.
- **Servicios lógicos de consulta:** Listar Grupos propios; Obtener Grupo propio; Proyectar Grupos propios para dashboard.
- **Operación coordinada:** autenticación → `self-account` → autorización funcional de creación → evaluación transitoria → creación del Agregado → persistencia/control idempotente → DTO.
- **Autorizaciones aplicadas:** identidad autenticada y, para consulta individual, `owner-access`.
- **Habilitación comercial:** evaluador transitorio de capacidad; no es Dominio Comercial.
- **Contratos consumidos:** identidad autenticada; consulta mínima `self-account`; reloj/ID/hash técnicos; repositorio de Grupo; almacén de control transitorio.
- **Repositorio utilizado:** Repositorio específico del Agregado Grupo. El control de creación tiene un puerto técnico separado y no se incorpora al Repositorio de Grupo como entidad de dominio.
- **Respuesta producida:** resultado de creación y DTO de Grupo propio o error estable.

El Servicio coordina. Las invariantes `nombre`, `deporte`, estado permitido y único Owner corresponden al Agregado Grupo; el límite provisional y la idempotencia corresponden a Aplicación/infraestructura.

## 10. Agregados y reglas

| Agregado | Tipo de participación | Operación sobre Aggregate Root | Invariantes aplicadas | ¿Se modifica? |
|---|---|---|---|---|
| Grupo | Principal | Crear un Grupo | ID opaco; nombre y deporte válidos; exactamente un Owner; estado inicial válido | Sí, se crea |
| Usuario | Referencia externa consultada por contrato | Ninguna | Cuenta existente para el actor | No |
| Persona | Fuera de alcance | Ninguna | No aplica | No |
| Membresía | Fuera de alcance | Ninguna | No aplica | No |
| Temporada | Fuera de alcance | Ninguna | No aplica | No |
| Solicitud | Fuera de alcance | Ninguna | No aplica | No |
| Plan/Suscripción | No implementados | Ninguna | No se simulan | No |

### Reglas del Grupo mínimo

- **Identidad:** ID Firestore aleatorio generado por backend, opaco, estable e independiente del UID y de la clave de idempotencia.
- **Nombre:** obligatorio; string Unicode; normalización NFC; `trim`; espacios internos consecutivos se reducen a uno; sin caracteres de control; longitud de 1 a 80 puntos de código; se conserva casing y acentuación.
- **Unicidad del nombre:** no aplica. El nombre es descriptivo, no identidad ni clave comercial.
- **Deporte:** obligatorio; código normalizado a minúsculas; catálogo v1 cerrado `{ "voleibol" }`; la incorporación de otros códigos amplía catálogo, no el modelo central.
- **Owner:** `ownerId` obligatorio y no vacío; se deriva del UID autenticado; el cliente no lo aporta.
- **Cardinalidad:** exactamente un Owner vigente.
- **Estado inicial:** `activo`, asignado por el sistema. No existe `borrador` en este corte.
- **Semántica de `activo`:** Grupo organizativamente vigente y consultable por Owner; no equivale a Temporada abierta, Membresía válida, publicación ni habilitación deportiva/comercial.
- **Campos desconocidos:** rechazo del payload completo. El Agregado y el mapper también rechazan documentos canónicos con forma inesperada al leer.
- **Ausencias deliberadas:** descripción, configuración, visibilidad, Club, Temporada activa, arrays, contadores, datos de Usuario/Persona, economía y deporte operativo.

## 11. Consultas y contratos públicos

| Proveedor | Consumidor | Capacidad pública | Información mínima | Errores |
|---|---|---|---|---|
| Identidad | Servicio de creación/consulta | Recuperar cuenta propia | existencia y UID coherente | cuenta requerida, dependencia no disponible |
| Grupos | Frontend | Crear Grupo propio | nombre, deporte, clave | outcomes definidos en §12 |
| Grupos | “Mis Grupos” | Listar Grupos por Owner | lista de DTO mínimos | no autenticado, cuenta requerida, dependencia no disponible |
| Grupos | Vista básica | Obtener Grupo propio por ID | DTO mínimo | no encontrado, no autorizado, dependencia no disponible |
| Grupos | Dashboard | Proyección mínima de Grupos propios | ID, nombre, deporte, estado | mismos errores de consulta |
| Grupos | Futuro Comercial | Contar Grupos propios | cantidad, cuando exista contrato real | fuera de alcance de implementación E2-01 |

El comando es modificador. Las otras tres capacidades son consultas/modelos de lectura. Ningún contrato expone `DocumentSnapshot`, `Timestamp`, referencias Firestore, Aggregate Roots, el hash de idempotencia ni el control transitorio.

## 12. DTO de entrada y salida

### DTO de entrada — Crear Grupo propio

| Campo | Tipo | Obligatorio | Validación | Origen |
|---|---|---|---|---|
| `nombre` | string | Sí | normalización y límite 1–80 definidos en §10 | Usuario |
| `deporte` | string | Sí | código permitido `voleibol` | Selección controlada de UI |
| `idempotencyKey` | string | Sí | 16–128 caracteres ASCII `[A-Za-z0-9._:-]`; sin espacios; identidad exacta, no se recorta | UI mediante generador criptográficamente adecuado, normalmente UUID v4 |

El conjunto de claves debe ser exactamente el anterior. No se admiten `ownerId`, `userId`, `roles`, `permissions`, `personaId`, `estado`, `temporadaId`, `plan`, `subscription`, `visibility`, `members`, `admins` ni propiedades adicionales.

### DTO de salida — Grupo propio mínimo

| Campo | Tipo | Semántica | Consumidor |
|---|---|---|---|
| `id` | string | Identidad opaca estable del Grupo | UI/routing |
| `nombre` | string | Nombre persistido y normalizado | UI |
| `deporte` | `"voleibol"` | Código estable | UI |
| `estado` | `"activo"` | Estado organizativo | UI |
| `ownerUserId` | string | Usuario Owner; no editable | Confirmación/detalle |
| `createdAt` | string ISO-8601 | Instante confirmado por servidor | UI |

### Envoltorios

- Creación: `{ outcome: "created" | "existing", group: GrupoPropioDto }`.
- Listado: `{ items: GrupoPropioDto[] }`; bajo el límite transitorio contiene cero o un elemento.
- Detalle: `{ group: GrupoPropioDto }`.
- Dashboard: `{ items: Array<{ id, nombre, deporte, estado }> }`.

### Errores contractuales

| Código o categoría | Significado | Respuesta del frontend |
|---|---|---|
| `UNAUTHENTICATED` | Token ausente/inválido | Volver a autenticación |
| `ACCOUNT_REQUIRED` | Falta la cuenta materializada | Reintentar bootstrap de cuenta |
| `NOT_AUTHORIZED` | Actor no Owner | No mostrar recurso |
| `NOT_FOUND` | Grupo inexistente | Estado no encontrado |
| `VALIDATION_FAILED` | Payload o campo inválido/desconocido | Corregir formulario/cliente |
| `PROVISIONAL_LIMIT_REACHED` | Ya existe un Grupo propio | Explicar límite temporal |
| `CONFLICT` | Reuso incompatible o conflictos agotados | Reintento guiado/nueva intención |
| `DEPENDENCY_UNAVAILABLE` | No puede verificarse cuenta, control o referencia | Reintento conservando intención |
| `INTERNAL_ERROR` | Fallo no clasificable | Mensaje estable y correlación técnica |

Los nombres físicos de exports/callables no quedan fijados; los shapes, semántica y categorías sí.

## 13. Diseño físico Firestore

### 13.1 Colecciones y documentos

| Colección o ruta | Finalidad | Autoridad o proyección | Escritores | Lectores |
|---|---|---|---|---|
| `groups/{groupId}` | Persistir el Agregado Grupo | Autoridad de Grupo y ownership | Backend E2-01 | Backend mediante Repositorio/reader |
| `groupCreationGuards/{firebaseUid}` | Serializar límite provisional e idempotencia de la primera creación | Estado técnico transitorio, no Agregado ni derecho comercial | Backend E2-01 | Backend E2-01 |
| `users/{firebaseUid}` | Cuenta existente y referencia de Owner | Autoridad de Usuario | Escritores de Identidad ya aprobados | Consulta `self-account`; E2-01 no escribe |

### 13.2 Campos de `groups/{groupId}`

| Campo | Tipo | Obligatorio | Propietario conceptual | Original/derivado | Regla |
|---|---|---|---|---|---|
| `nombre` | string | Sí | Grupo | Original | Normalizado, 1–80 |
| `deporte` | string | Sí | Grupo | Original | `voleibol` en schema v1 |
| `ownerId` | string | Sí | Grupo | Original | UID autenticado; exactamente uno |
| `estado` | string | Sí | Grupo | Original del sistema | `activo` |
| `createdAt` | timestamp servidor | Sí | Grupo | Metadato técnico | Una sola vez; no cliente |
| `schemaVersion` | number | Sí | Persistencia de Grupo | Metadato técnico | Valor exacto `1` |

No se persiste `updatedAt` porque E2-01 no expone actualización. Se incorporará cuando exista una operación que lo necesite. Tampoco se persiste el ID dentro del documento.

### 13.3 Campos de `groupCreationGuards/{firebaseUid}`

| Campo | Tipo | Obligatorio | Finalidad | Regla |
|---|---|---|---|---|
| `groupId` | string | Sí | Resolver el Grupo confirmado | Debe apuntar a Grupo válido con el mismo Owner |
| `idempotencyKeyHash` | string | Sí | Reconocer la misma operación sin guardar la clave cruda | SHA-256 con separación de contexto y UID |
| `requestHash` | string | Sí | Detectar misma clave con payload diferente | Hash de versión + nombre/deporte normalizados |
| `createdAt` | timestamp servidor | Sí | Diagnóstico y trazabilidad técnica | Mismo commit |
| `guardVersion` | number | Sí | Evolución/retiro explícito | Valor exacto `1` |

No se almacena Plan, nombre de plan, cupo adquirido, permiso, rol, Persona ni copia del Grupo. El documento no prueba que el Usuario tenga Plan Free.

### 13.4 Referencias

| Referencia | Destino | Motivo | Validación | ¿Forma parte del Agregado? |
|---|---|---|---|---|
| `ownerId` | `users/{firebaseUid}` | Identificar al Usuario propietario | UID del token y cuenta válida | Sí, como referencia propia de Grupo; Usuario no se incorpora |
| `groupId` del control | `groups/{groupId}` | Resolver reintento/límite | Existencia, schema v1 y mismo `ownerId` | No; es control técnico |

Se usa string ID estable, no `DocumentReference`, para no exponer acoplamiento Firebase al dominio o DTO.

### 13.5 Datos originales

- `nombre` y `deporte`: aportados por el actor, validados por el Agregado y confirmados al commit.
- `ownerId`: derivado de Authentication por backend y confirmado al commit.
- `estado`: asignado por el sistema y confirmado al commit.
- `createdAt`: asignado por servidor.

### 13.6 Proyecciones o datos derivados

No se persisten proyecciones en E2-01. Dashboard consume una proyección en memoria producida por el reader desde la autoridad Grupo. No se crea ni actualiza un documento de dashboard.

### 13.7 Índices

| Consulta | Campos | Orden | Índice necesario | Justificación |
|---|---|---|---|---|
| Grupos propios | `ownerId == UID` | ninguno | Índice simple automático de `ownerId` | Máximo transitorio de un resultado; no requiere orden |
| Grupo por ID | ID documental | ninguno | Índice documental nativo | Lectura directa backend |
| Control por actor | ID documental = UID | ninguno | Índice documental nativo | Punto de serialización |

E2-01 no requiere modificar `firestore.indexes.json`. Si la implementación introduce orden o filtros adicionales, deberá justificar el índice y actualizar la ficha antes de programarlo.

## 14. Seguridad y autorización

| Operación | Visitante | Usuario autenticado no Owner | Owner | Administrador global legado | Integrante | Sistema |
|---|---|---|---|---|---|---|
| Crear Grupo propio | Denegado | Permitido sobre sí, sujeto a cuenta y límite | Igual | Igual; el rol no añade capacidad | No aplica | Coordina |
| Listar Grupos propios | Denegado | Sólo los cuyo `ownerId` sea su UID | Permitido | Sólo sus propios Grupos | No hay `member-access` | Lee |
| Consultar Grupo | Denegado | Denegado si no es Owner | Permitido | Denegado si no es Owner | Denegado | Lee |
| Escritura directa cliente | Denegada | Denegada | Denegada | Denegada | Denegada | Backend único escritor |
| Lectura directa del Grupo canónico | Denegada | Denegada | Denegada; usa contrato | Denegada | Denegada | Backend único lector E2 |

### Separación entre autorización, habilitación y dominio

- **Autorización funcional:** para crear exige actor autenticado y cuenta propia; para consultar exige que el UID verificado coincida con `Grupo.ownerId`.
- **Habilitación comercial transitoria:** máximo de un Grupo propio, evaluado por el control de Aplicación. Su aprobación sólo permite continuar; no otorga autoridad sobre el Grupo.
- **Validez de dominio:** el Agregado decide si nombre, deporte, Owner y estado constituyen un Grupo válido. No recibe el resultado como un Plan ni cambia sus invariantes por la política.
- **Fallo cerrado:** si el límite o su estado no pueden evaluarse, la creación no llega al Agregado.
- **Retiro obligatorio:** la política transitoria y su guard deben sustituirse antes de implementar Comercial o permitir un segundo Grupo. No puede convivir silenciosamente con un contrato comercial real.

### Reglas

- El UID se deriva sólo del token verificado.
- `self-account` comprueba la cuenta; no consulta `users.roles`.
- `owner-access` compara el UID autenticado con el `ownerId` persistido.
- No existe `member-access` en E2-01.
- No se usan claims o campos controlados por el cliente para ownership.
- Las reglas Firestore deben mantener `allow create, update, delete: if false` para clientes sobre `groups` canónicos y negar por completo `groupCreationGuards`.
- Las lecturas directas de documentos canónicos también deben denegarse; la compatibilidad legada deberá condicionarse sin conceder acceso a `schemaVersion == 1`.
- Las pruebas deben demostrar que `users.roles === "admin"` no permite leer ni escribir un Grupo canónico ajeno.
- Logs y errores no deben incluir token, clave de idempotencia cruda ni documentos completos.

## 15. Repositorios y adaptadores

| Componente | Capa | Contrato | Implementación prevista | Agregado o consulta |
|---|---|---|---|---|
| Modelo Grupo | Dominio | Crear/rehidratar Grupo mínimo | Objeto/módulo puro sin Firebase | Agregado Grupo |
| Repositorio de Grupo | Dominio/Aplicación | crear, obtener por ID | Adaptador Firestore específico | Grupo |
| Reader de Grupos propios | Aplicación | listar por Owner y proyectar | Query Firestore backend | Consulta |
| Puerto de cuenta propia | Aplicación | obtener cuenta por actor | Reutiliza capacidad E1-01 sin repositorio ajeno directo | Referencia externa |
| Control de creación | Aplicación | evaluar/registrar primera creación | Adaptador Firestore transitorio | Coordinación técnica |
| Identidad callable | Infraestructura | obtener UID verificado | Adaptación del helper E1-01 | Autenticación |
| Mapper DTO | Aplicación/Infraestructura | Grupo/lectura → DTO | Mapper explícito | Contrato |

No se crea Repositorio genérico. El Servicio de Aplicación no importa Admin SDK. El Repositorio de Grupo no lee Usuario, Persona, Plan, Membresía o Temporada. El reader no devuelve documentos Firestore.

## 16. Transacción y unidad de consistencia

- **Aggregate Root modificado:** Grupo.
- **Límite de dominio:** un único Grupo nuevo.
- **Límite transaccional físico:** documento `groups/{groupId}` y control técnico `groupCreationGuards/{uid}`. El segundo no es Agregado ni fuente deportiva; existe para confirmar el mismo reintento y serializar el límite provisional.
- **Datos confirmados conjuntamente:** ID de Grupo, nombre, deporte, Owner, estado, timestamps/versiones y vínculo técnico de reintento.
- **Validaciones externas previas:** token; cuenta `self-account`; forma y normalización del payload.
- **Concurrencia:** toda creación E2-01 del mismo Usuario lee/escribe el mismo control dentro de la transacción. Los conflictos se reintentan hasta el límite configurado; agotado, outcome `CONFLICT`.
- **Idempotencia:** la clave no es el UID. Se guarda su hash contextual junto con el hash del payload normalizado. Misma clave + mismo hash devuelve el Grupo persistido; misma clave + distinto hash produce conflicto.
- **Límite provisional:** sin control previo, se verifica además la existencia de Grupo por `ownerId`; cualquier existencia impide crear. Tras retirar el escritor legado, toda nueva alta pasa por el control.
- **Fallo antes del commit:** no quedan Grupo ni control parcial.
- **Fallo después del commit y antes de responder:** el reintento lee control y Grupo y devuelve `existing`.
- **Control inconsistente:** falla cerrado; no se repara ni crea automáticamente en el camino de usuario.
- **Operaciones posteriores separadas:** todas. No hay eventos, Saga, outbox, transacción global ni actualización de Usuario.

### Condición de retiro del control transitorio

Antes de cualquiera de estas acciones debe existir otro incremento aprobado que sustituya `groupCreationGuards/{uid}` y sus supuestos:

1. permitir más de un Grupo propio por Usuario;
2. implementar Plan/Suscripción y su contrato público de capacidad;
3. transferir ownership;
4. importar o reconocer Grupos remotos existentes.

No basta con cambiar el número máximo: el documento único por UID no modela múltiples intenciones activas.

## 17. Eventos y efectos posteriores

**NO APLICA.**

Crear Grupo no emite eventos ni crea Actividad, alerta, correo, notificación, proyección, Membresía o Temporada. La navegación y el refresco del frontend derivan de la respuesta sin persistencia adicional.

## 18. Plan de pruebas

| Nivel | Casos mínimos | Herramienta o entorno | Evidencia |
|---|---|---|---|
| Dominio | nombre/deporte; único Owner; estado activo; esquema cerrado; sin borrador ni arrays | Runner unitario existente | Resultados por caso |
| Aplicación | orden autenticación/cuenta/límite/Agregado; Usuario sin Persona; rol global ignorado; fallos cerrados | Mocks/fakes | Unitarias |
| Contrato | payload exacto; desconocidos; límites; DTO; timestamps serializados; errores estables | Unitarias contractuales | Matriz entrada/salida |
| Integración | crear, leer, listar; control y Grupo atómicos; referencia Owner; documento inválido | Firestore Emulator | Suite aprobada |
| Concurrencia | iguales simultáneas; diferentes simultáneas; límite; conflictos agotados | Emulator con barreras/promesas coordinadas | Un solo Grupo confirmado |
| Idempotencia | respuesta perdida; mismo retry; clave reusada con payload distinto; control roto | Emulator | Outcomes esperados |
| Reglas | cliente no crea/actualiza/elimina/lee canónico; global admin no accede; guard totalmente denegado | Rules Unit Testing + Emulator | Positivos backend/negativos cliente |
| Frontend | vacío, formulario, loading, bloqueo doble, éxito persistido, límite, errores, sin Persona, responsive/a11y | Tests de componentes + build + UAT | Capturas/checklist y resultados |
| Arquitectura | nueva UI sin Firestore; Servicio sin Admin SDK; sin roles; sin Persona/Membresía/Temporada/Comercial; DTO no filtra persistencia | Guard estructural existente ampliado | Test automático |
| Regresión | cuenta, Persona, dashboard, reglas y consumidores fuera de alcance | `quality:stage0`, suites existentes, build | Conteos completos sin regresión |
| Recuperación | fallo precommit, postcommit/pre-response, dependencia caída y rollback | Emulator/dobles controlados | Informe de recuperación |

### Casos negativos obligatorios adicionales

- ID de Grupo vacío, malformado o inexistente;
- `ownerId` ausente, vacío o no coincidente en documento canónico;
- `schemaVersion` desconocida;
- `createdAt` ausente/no serializable;
- nombre con sólo espacios, más de 80 puntos de código o controles;
- deporte fuera del catálogo;
- clave menor/mayor al límite, con espacios o caracteres no permitidos;
- cuenta ausente y cuenta inconsistente;
- guard que referencia Grupo ajeno;
- acceso mediante `users.roles === "admin"` sin ownership;
- verificación de cero escrituras colaterales.

### Baseline recibido

El cierre E1-03 informa unitarias `72/72`, Emulator Suite `43/43`, sintaxis `126/126`, build `19/19`, mantenimiento `7/7` y gate aprobado. Son referencia histórica, no sustituyen el preflight de E2-01.

## 19. Componentes actuales reutilizados

| Componente | Reutilización | Adaptación requerida | Riesgo |
|---|---|---|---|
| Firebase Authentication y helper de identidad callable | Derivar actor confiable | Reusar sin roles | Bajo |
| Cuenta E1-01 y autorización `self-account` | Precondición de actor materializado | Exponer/consumir capacidad mínima, no repositorio ajeno | Bajo |
| Patrones de dominio/aplicación/repositorio de E1-01/E1-02 | Estructura de separación y DTO | Crear módulo específico Grupos | Bajo |
| `AuthProvider`, `useAuth` y layout protegido | Estado de sesión/cuenta | No depender de `legacyUser` ni rol para rutas E2 | Medio |
| `useAction`, botones, formularios, skeletons y breadcrumbs | Feedback y componentes visuales | Ajustar copy, accesibilidad y estados | Bajo |
| Página visual legada de alta | Referencia de composición de formulario | Reusar sólo UI; retirar Firestore, descripción, activo, visibilidad y arrays | Alto si se copia lógica |
| Tarjetas/estado vacío del listado admin | Base visual de “Mis Grupos” | Alimentar DTO owner-scoped backend | Medio |
| Firebase Emulator Suite, guardas y runners | Pruebas seguras | Añadir suites E2-01 | Bajo |
| `firestore.rules` e índices | Punto central de control | Restringir Grupo canónico y añadir pruebas; no se prevé índice compuesto | Alto por consumidores legados |
| `functions/index.js` | Composición de exports | Exportar contratos E2 sin reactivar superficies retiradas | Medio |

## 20. Estructuras anteriores retiradas

### Clasificación del legado E2-01

| Estructura/componente | Clasificación | Lectores/escritores anteriores | Tratamiento E2-01 | Condición/evidencia |
|---|---|---|---|---|
| `/admin/groups/new/page.tsx` con `addDoc(groups)` | Retirable dentro del incremento | UI escribe nombre, descripción, activo, arrays, owner, visibilidad y contadores | Sustituir por comando backend y retirar la escritura directa | Búsqueda estructural sin `addDoc`/Firestore en alta |
| `/admin/groups/page.tsx` con `adminIds array-contains` | Adaptable/retirable como “Mis Grupos” | UI lee Firestore y mezcla administración | Nueva lista owner-scoped bajo dashboard; quitarlo como entrada de alta | UAT y test arquitectónico |
| `/admin/groups/[groupId]` | Aislado | UI masiva de edición, integrantes, solicitudes, torneos y lecturas directas | No reutilizar como detalle E2; impedir que procese `schemaVersion == 1` | Pruebas de aislamiento |
| `/profile/groups*` | Fuera de alcance y aislado | Consulta por `memberIds`/`adminIds` y compone actividad | No convertir en listado de ownership; no debe seleccionar Grupos canónicos | Sin arrays en schema v1 |
| `/groups*` públicas | Fuera de alcance y aislado | Visibilidad, unión, miembros y administración HTTP | Grupo canónico no es público; endpoints deben rechazar schema v1 | Pruebas negativas |
| `httpApi.js` de Grupo | Aislado | Mutación de arrays embebidos y autorización legada | No reutilizar para E2-01; guard de esquema para no tocar Grupo canónico | Tests de aislamiento |
| `editGroup`, `toggleGroupActivo`, `transferGroupOwnership`, admin callables | Fuera de alcance y aislados | Roles globales, arrays y operaciones posteriores | No exponer a Grupo schema v1; no retirar hasta identificar consumidores | Guard/contract tests |
| `groupAdminsService` | No reutilizable para autorización E2 | Normaliza `admins`, `adminIds`, `memberIds` | Mantener sólo para legado; `owner-access` compara `ownerId` canónico | Grafo de dependencias |
| `adminAccessService.assertIsAdmin` | Retirable del flujo migrado | Lee `users.roles` | Prohibido en E2-01; permanece para consumidores no migrados | Test que falla si E2 lo importa |
| Reglas de `groups` con autoridad global/arrays | Adaptable | Permiten lecturas/escrituras según rol/arrays | Denegar documentos schema v1 y conservar sólo compatibilidad identificada | Matriz Emulator |
| `groups` raíz | Reutilizable físicamente | Colección actual con esquema contradictorio | Conservar ruta; distinguir nuevo esquema cerrado por `schemaVersion` | Mapper estricto |
| Arrays `memberIds`, `adminIds`, `admins`, solicitudes | Aislados; retiro global posterior | Múltiples páginas, APIs, callables y reglas | No crear ni leer en E2-01; no borrar globalmente | E2-11 cierra retiro |

No se retira una estructura por búsqueda nominal únicamente. Antes de eliminar archivos o reglas deberán enumerarse sus consumidores en el checkpoint real de implementación.

## 21. Checkpoint y rollback

- **Commit inicial previsto:** `dev` en `e1f2272f7a42e04dff8d53869142e9a8ad015294`; si cambia, revisar delta antes de abrir rama.
- **Rama prevista:** `feat/e2-01-grupo-ownership`.
- **Estado de pruebas inicial:** ejecutar gates completos; la última evidencia recibida es la del cierre E1-03.
- **Checkpoint intermedio recomendado:** dominio/contratos/control transitorio y pruebas de concurrencia antes de conectar UI.
- **Rollback de código:** revertir commits E2-01 explícitos o abandonar la rama no integrada. No restaurar mediante doble escritura.
- **Tratamiento de datos de prueba:** reinicializar exclusivamente emuladores/datos sintéticos o borrar de forma explícita el Grupo y su guard correlacionado en el entorno demo.
- **Rollback remoto:** no aplica; no hay autorización de despliegue ni acceso remoto.
- **Condición para interrumpir:** doble creación, acceso de no-Owner, escritura cliente, necesidad de Persona/Membresía/Temporada, modificación de otro Agregado, imposibilidad de aislar un consumidor legado o necesidad de cambiar reglas remotas.
- **Condición para reanudar:** causa documentada, ficha actualizada si cambia una decisión, tests de concurrencia/seguridad aprobados y checkout limpio.

## 22. Evidencia de cierre

El incremento deberá adjuntar:

- rama, commits y diff autorizado;
- preflight y gate posterior completos;
- pruebas de dominio, aplicación, contrato, integración, reglas, frontend, arquitectura y recuperación;
- evidencia Emulator Suite con proyecto `demo-*` y hosts loopback;
- contratos finales y mapeo de errores;
- esquema persistente final y justificación de cualquier índice;
- evidencia de un solo Grupo en concurrencia;
- evidencia de reintento tras respuesta perdida;
- evidencia de rechazo a no-Owner y rol global `admin`;
- evidencia de escrituras cliente denegadas;
- evidencia de ausencia de Persona, Membresía, Temporada, Solicitud, Plan, Suscripción y proyecciones colaterales;
- inventario final de consumidores legados adaptados, aislados y pendientes;
- UAT de estado vacío, creación, vista básica, Usuario sin Persona, límite y responsive;
- procedimiento de rollback verificado;
- informe y cierre formal E2-01;
- confirmación explícita de ausencia de consulta, despliegue o cambio en Firebase remoto.

### Declaración final de definición

- **Estado de definición:** completo.
- **Decisiones fundamentales abiertas:** ninguna.
- **Deuda aceptada:** coexistencia controlada con consumidores legados de Grupo fuera de este corte; límite de un Grupo implementado mediante control técnico transitorio; catálogo inicial limitado a `voleibol`.
- **Condición para comenzar código:** autorización posterior del Usuario, checkout local limpio y checkpoint `dev` verificado.
- **Estado final de implementación:** pendiente.
- **Responsable de aprobación:** Rodolfo.
- **Fecha de cierre de implementación:** pendiente.

## Veredicto de definición

`E2-01 LISTO PARA IMPLEMENTAR`
