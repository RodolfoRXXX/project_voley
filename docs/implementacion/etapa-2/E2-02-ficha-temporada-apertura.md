# Ficha de Incremento Implementable

## Estado de la ficha

- **Estado:** Lista para implementar.
- **Responsable:** Rodolfo.
- **Fecha:** 2026-08-26.
- **Rama o checkpoint de partida declarado:** `dev` en `8a3a43604af33f031568d8c9b7d91b3ed9a32ee6`.
- **Rama, HEAD, upstream, divergencia y working tree observados:** `dev`; HEAD `8a3a43604af33f031568d8c9b7d91b3ed9a32ee6`; upstream `origin/dev`; divergencia `0/0`; `dev` local y `origin/dev` coinciden exactamente con el checkpoint recibido. Al iniciar, el único cambio era esta ficha sin seguimiento (`?? docs/implementacion/etapa-2/E2-02-ficha-temporada-apertura.md`); no había cambios ajenos.
- **Rama prevista para la implementación posterior:** pendiente de crear después de aprobar esta ficha; nombre sugerido `feat/e2-02-temporada-apertura`.
- **Etapa del roadmap:** Etapa 2 - Organización, Grupo, Membresía, Solicitud y Temporada.
- **Estado de etapa recibido:** Etapas 0 y 1 cerradas; Etapa 2 en ejecución controlada; E2-01 declarado cerrado y E2-02 habilitado para definición.
- **Evidencia E2-01 verificada:** existen y son coherentes `E2-01-ficha-grupo-ownership.md`, `E2-01-informe-implementacion.md` y `E2-01-cierre.md`; la ficha habilitó la implementación, el informe registró implementación/UAT sin atribuirse cierre formal y el cierre posterior declara `E2-01 CERRADO — E2-02 HABILITADO PARA DEFINICIÓN`.
- **Fuentes revisadas:** Documentos 1–4 congelados; Documento 1.5; Documento 5 actualizado; cierre consolidado de Etapa 0; fichas, informes y cierres E1-01 a E1-03; ficha, informe y cierre E2-01; ficha E2-02; auditoría técnica; código, reglas, índices, rutas, tests e imports del checkout sólo como evidencia física.

## Síntesis normativa y matriz de decisiones

### Contradicciones y tensiones analizadas

| ID | Fuentes o afirmaciones | Clasificación | Análisis | Resolución |
|---|---|---|---|---|
| T-01 | Documento 2 enumera `Crear`, `Editar`, `Cerrar` y `Consultar`; Documento 3 también menciona `apertura` | Tensión terminológica, no contradicción normativa | No existe CU independiente para abrir ni un estado borrador aprobado. “Apertura” describe el inicio del ciclo y su estado operativo | E2-02 expone un único comando que crea una Temporada directamente abierta |
| T-02 | Documento 1 incluye objetivos y observaciones como información propia; E2-02 pide mínimo operativo | Diferencia entre capacidad del Agregado y datos requeridos por este corte | Que un atributo pertenezca al Agregado no lo vuelve obligatorio en toda creación | Objetivos y observaciones se postergan; no se aceptan ni persisten en schema v1 |
| T-03 | Documento 1 habla de `temporada activa`; Documentos 2-4 usan `abierta`/`cerrada` | Variación terminológica | `activa` puede confundirse con actividad o habilitación comercial | El contrato usa `abierta`; `activa` sólo se interpreta como referencia conceptual a la Temporada vigente |
| T-04 | Documento 3 asigna reglas entre varias Temporadas al Contexto de Organización y señala que no estaba definida una invariante transaccional Grupo-Temporada | Límite arquitectónico, no contradicción | La decisión funcional recibida de una sola abierta debe protegerse sin escribir Grupo ni incorporarlo al Agregado Temporada | Se serializa por `openSeasonGuards/{groupId}` y se valida Grupo dentro de la misma transacción; sólo Temporada y guard se escriben |
| T-05 | La auditoría identifica Membresía/Solicitud mediante arrays en `groups`; el checkout contiene `matches` y `participations` sin Temporada | Contradicción normativa-legado / deuda técnica | No existe una Temporada legada ni años/períodos embebidos que puedan reutilizarse. Los arrays no están asociados físicamente a períodos y los registros deportivos no tienen `seasonId` | Se inventarían datos si se dedujera Temporada desde esas estructuras. E2-02 no las lee, escribe, migra ni retira; quedan aisladas/fuera de alcance con consumidores inventariados |
| T-06 | E2-01 usa ownership canónico y limita transitoriamente un Grupo; no existe Comercial | Deuda transitoria, no regla de Temporada | El límite de Grupo no implica un límite comercial de Temporadas | E2-02 no agrega política comercial; una sola abierta es invariante funcional, no cupo comercial |
| T-07 | La propuesta física usaba `name`, `startDate`, `status: "open"`; Grupo v1 persiste nombres y estado en español | Inconsistencia física innecesaria | E2-01 estableció `nombre` y `estado` en persistencia y contrato, con código interno en inglés cuando conviene | Persistencia y DTO de E2-02 usan `nombre`, `fechaInicio`, `estado: "abierta"`; `open` queda sólo en nombres técnicos como `openSeason`/`openSeasonGuards` |

No se detectó contradicción normativa entre los Documentos 1-5 ni entre éstos y los cierres consolidados. El checkout integrado confirma que las decisiones funcionales recibidas pueden materializarse sin convertir el legado en autoridad ni modificar Grupo.

### Matriz de decisiones

| ID | Decisión | Fundamento | Estado |
|---|---|---|---|
| D-01 | Temporada representa el ciclo operativo temporal de un Grupo | Documentos 1, 3 y 4 | Adoptada |
| D-02 | `abierta` significa ciclo vigente que admite operaciones futuras que, además, cumplan sus propias reglas | RF-17 a RF-20 y responsabilidades de Temporada | Adoptada |
| D-03 | Abrir no crea integrantes ni habilita por sí solo Entrenamientos, Partidos, pagos u otras capacidades | Límites de Agregado y secuencia de transición | Adoptada |
| D-04 | No habrá estado `borrador` ni Temporada creada pero no abierta en E2-02 | Ausencia de CU/valor funcional aprobado; minimización de estados intermedios | Adoptada |
| D-05 | Un solo comando público crea y abre atómicamente | Coherencia con CU-016 y ausencia de CU de apertura independiente | Adoptada |
| D-06 | Como máximo una Temporada abierta por Grupo | Singular `temporada activa`, ciclo sucesivo y necesidad de contexto inequívoco para Membresía | Adoptada |
| D-07 | El modelo futuro permite múltiples Temporadas cerradas/históricas | Historial preservado y CU-019 | Adoptada para el modelo; no se implementa historia en este corte |
| D-08 | E2-02 no valida solapamientos históricos ni implementa cierre/reapertura | No son necesarios para crear la primera abierta y están fuera de alcance | Adoptada |
| D-09 | Datos mínimos: ID opaco, `groupId`, `nombre`, `fechaInicio`, `estado`, `createdAt`, `schemaVersion` | Información propia normativa y mínimo necesario | Adoptada |
| D-10 | `fechaCierre` está ausente mientras la Temporada está abierta | No existe cierre todavía; evita fecha ficticia | Adoptada |
| D-11 | `objetivos`, `observaciones` y descripción no integran schema v1 | No son necesarios para E2-03; edición fuera de alcance | Adoptada |
| D-12 | El nombre no es único | No existe regla normativa de unicidad; identidad es el ID | Adoptada |
| D-13 | `fechaInicio` es obligatoria y se representa como fecha civil ISO `YYYY-MM-DD` | Temporada es ciclo temporal; evita semántica horaria no aprobada | Adoptada |
| D-14 | No se restringe la fecha de inicio contra “hoy” en E2-02 | No hay zona horaria organizativa ni regla normativa suficiente | Adoptada como deuda explícita |
| D-15 | Autoridad sólo por ownership vigente de Grupo; Temporada no duplica `ownerUid` | Documentos 1.5, 3, 4 y E2-01 | Adoptada |
| D-16 | Owner sin Persona administra Grupo y Temporada, pero no es integrante | Separación Usuario-Persona-Membresía | Adoptada |
| D-17 | No existe límite comercial independiente para Temporadas | Comercial no implementado; ausencia de fundamento | Adoptada |
| D-18 | La exclusión concurrente usa `openSeasonGuards/{groupId}`, no un campo embebido en Grupo | Una abierta por Grupo sin modificar Agregado Grupo; patrón E2-01 comprobado | Adoptada y cerrada |
| D-19 | La operación usa clave de idempotencia, hash contextual por Grupo y hash del payload normalizado | Reintentos, respuesta perdida y conflicto estable; separación de contexto E2-01 comprobada | Adoptada y cerrada |
| D-20 | Consultas mínimas: contexto de Temporada del Grupo y Temporada por ID; no listado histórico | Necesidades de vista Grupo, confirmación y E2-03 | Adoptada |
| D-21 | Colección raíz `seasons` y guard `openSeasonGuards/{groupId}` | Colecciones raíz plurales, independencia de Agregados y convención `groupCreationGuards` | Adoptada y cerrada |
| D-22 | Documento canónico exacto: `groupId`, `nombre`, `fechaInicio`, `estado`, `createdAt`, `schemaVersion` | Coherencia con Grupo v1 y ausencia de traducción física innecesaria | Adoptada y cerrada |
| D-23 | Estado físico y contractual `abierta`; fecha civil física como string ISO estricta | Convención española del modelo canónico; una fecha civil no es un instante | Adoptada y cerrada |
| D-24 | Sólo `createdAt`; no `updatedAt`, `openedAt`, `closedAt` ni `fechaCierre` en v1 | Crear y abrir es un único hecho; no existe actualización ni cierre en E2-02 | Adoptada y cerrada |

### Cierre de decisiones físicas O-01 a O-05

| ID | Decisión cerrada | Evidencia del checkout | Resolución implementable |
|---|---|---|---|
| O-01 — Persistencia canónica | Ruta, campos, fecha, estado, timestamps, versión, mappers y consultas | Grupo v1 usa colección raíz plural, documento cerrado, timestamp servidor, `schemaVersion: 1` e hidratación estricta | `seasons/{seasonId}` exacto con `groupId`, `nombre`, `fechaInicio`, `estado: "abierta"`, `createdAt`, `schemaVersion: 1`; ID sólo documental; lectura por ID y por Grupo, más contexto abierto mediante guard validado |
| O-02 — Exclusión, concurrencia e idempotencia | Unidad atómica y evolución del guard | `groupCreationGuards` confirma Agregado+guard en transacción, usa hashes SHA-256 contextuales, reintentos y fallo cerrado | `openSeasonGuards/{groupId}` exacto; transacción lee Grupo, guard y Temporada correlacionada; sin guard comprueba cualquier `seasons` del Grupo antes de crear; cierre futuro deberá cambiar estado y liberar/evolucionar el slot atómicamente |
| O-03 — Consumidores del legado | Inventario completo por términos, imports, colecciones, reglas, índices, frontend y tests | No existe Temporada legada; arrays de Grupo y registros deportivos sin `seasonId` tienen consumidores identificados | No se elimina legado. Temporada canónica queda separada; arrays se aíslan; `matches`, `participations` y Torneos quedan fuera de alcance y no originan una Temporada inventada |
| O-04 — Integración E2-01 | Reutilización y extensiones | Grupo schema v1, identidad callable, `self-account`, repositorio transaccional, DTO/errores, guard, reglas, rutas owner-scoped y suites verificados | Reutilizar identidad, cuenta, repositorio/hidratador de Grupo, shell UI y runners; extender Módulo Grupos con Agregado/Repositorio/reader/servicio de Temporada; adaptar el patrón de guard, no copiar política de límite de Grupo |
| O-05 — Reglas, índices, contratos y frontend | Superficie futura exacta | Reglas deniegan Grupo v1/guards al cliente; índices actuales no incluyen Temporada; detalle owner-scoped existe | Agregar deny explícito para `seasons` y `openSeasonGuards`, pruebas negativas, cero índice compuesto, tres callables mínimos, servicio/type frontend y sección/formulario bajo la vista owner-scoped |

O-01 a O-05 quedan cerradas. No quedan decisiones fundamentales abiertas para comenzar una implementación posterior dentro de esta frontera.

### Revisión crítica de suficiencia

1. **Una sola abierta:** queda suficientemente respaldada por la decisión funcional recibida, el uso normativo singular de la Temporada activa/vigente y la necesidad de un contexto inequívoco para E2-03. No se deriva del límite comercial E2-01 ni del legado.
2. **Guard por `groupId`:** es la mínima clave de serialización porque la invariante se expresa por Grupo. Un guard por Usuario sería incorrecto ante transferencias y uno por Temporada no excluiría otra abierta.
3. **Consulta sin compuesto:** el guard es un índice técnico de acceso directo, no autoridad. La autoridad sigue siendo `seasons.estado`; el reader valida el documento apuntado. El chequeo por `groupId` cuando falta el guard evita aceptar huérfanos y sólo necesita índice simple automático.
4. **Fecha civil:** `fechaInicio` como string ISO estricta preserva exactamente `YYYY-MM-DD`, no inventa hora/zona y es coherente con la ausencia de timezone normativa. El mapper debe validar calendario real, no sólo regex.
5. **Timestamps:** `createdAt` de servidor basta porque creación y apertura son un único commit. `openedAt` duplicaría el mismo hecho sin semántica adicional y `fechaInicio` no es un timestamp técnico.
6. **Ausencia de `updatedAt`:** es coherente porque E2-02 no tiene operación actualizadora. El cierre futuro decidirá su propio timestamp funcional sin alterar retroactivamente schema v1 por comodidad.
7. **Estado:** se adapta la propuesta `status: "open"` a `estado: "abierta"`, consistente con `groups.estado` y con el lenguaje contractual implantado. No se introduce `activo`, que en Grupo expresa otra semántica.
8. **Consultas mínimas:** por ID y contexto abierto por Grupo cubren confirmación, vista owner-scoped y dependencia de E2-03. Un listado histórico no aporta nada a E2-03 y pertenece a CU-019.
9. **Completitud física:** no falta una decisión fundamental de dominio, contrato, autorización, persistencia o concurrencia. La evolución del guard al cerrar, timezone, historial y adaptación de consumidores deportivos son decisiones de incrementos futuros expresamente fuera de alcance.

---

## 1. Identificación

- **ID del incremento:** E2-02.
- **Nombre:** Alta y apertura mínima de Temporada como Agregado independiente.
- **Casos de uso incluidos:** corte mínimo de CU-016 `Crear una temporada`; consulta mínima contextual derivada de Gestión de Temporadas; apertura inicial como parte atómica de la creación.
- **Casos de uso expresamente excluidos:** CU-017 edición; CU-018 cierre; CU-019 historial; reapertura, archivado y eliminación; creación/modificación de Grupo; transferencia; Persona; Membresía; Solicitud; invitación; administradores delegados; roles/cargos/permisos; operaciones deportivas; Club; Plan/Suscripción; migración global.
- **Documentos y secciones normativas relacionadas:** Documento 1 §§3.4 y Temporada; Documento 1.5 ownership y Membresía; Documento 2 PF-02, RF-17 a RF-20 y CU-016 a CU-019; Documento 3 Módulo Grupos, Agregado Temporada y Servicios de Aplicación; Documento 4 límites, Repositorio, persistencia, seguridad y pruebas de Temporada; Documento 5 §§3, 4, 5.16-5.18 y 7.4; antecedentes E0/E1 y ficha E2-01.
- **Brechas técnicas atendidas:** fuente de verdad de Temporada; separación respecto de Grupo; autorización contextual Owner; backend-only; contexto abierto para E2-03; aislamiento del legado relacionado.
- **Brechas no declaradas cerradas:** autorización por Membresía, administradores delegados, ciclo completo de Temporada, Comercial, migración del legado y eliminación de todas las representaciones anteriores.

## 2. Objetivo funcional

Permitir que el Owner vigente de un Grupo canónico consulte si existe una Temporada abierta y, cuando no exista, cree un ciclo operativo mínimo que quede abierto y consultable. El resultado brinda a E2-03 un contexto temporal inequívoco sin crear Personas, Membresías ni actividad deportiva.

Crear y abrir se agrupan porque no se ha aprobado valor funcional para una Temporada persistida como borrador. El éxito confirma simultáneamente identidad, relación con Grupo, datos propios mínimos y estado abierto.

## 3. Actores

| Actor | Participación | Contexto | Resultado esperado |
|---|---|---|---|
| Owner vigente | Principal | Grupo propio schema v1 | Consulta vacío o crea/consulta la Temporada abierta |
| Usuario autenticado no Owner | Actor negativo | Grupo ajeno | Rechazo sin revelar datos |
| Usuario global `admin` no Owner | Actor negativo | Grupo ajeno | Mismo rechazo; el rol se ignora |
| Sistema | Coordinador | Backend y persistencia | Autentica, autoriza, ejecuta y confirma |
| Firestore Emulator | Dependencia de prueba | Sólo entorno local/demo | Persistencia, reglas y concurrencia verificables |

Persona, Integrante, Administrador delegado y Comercial no son actores de E2-02.

## 4. Precondiciones

1. Token de Authentication válido; el UID se obtiene exclusivamente del token verificado.
2. Cuenta `users/{uid}` inicializada y recuperable mediante `self-account`.
3. Grupo schema v1 existente, íntegro y en estado organizativamente válido.
4. `Grupo.ownerId` coincide con el UID autenticado en el momento de la operación.
5. No existe otra Temporada abierta válida para el Grupo.
6. Ausencia de Persona y de Membresías es válida.
7. No se requiere Plan, Suscripción ni rol global.
8. Backend y persistencia están disponibles.
9. Antes de programar: checkout limpio sobre el checkpoint aprobado y decisiones O-01 a O-05 cerradas.

## 5. Flujo principal

1. El Owner abre la vista básica de su Grupo.
2. La Presentación solicita el contexto mínimo de Temporada mediante Aplicación.
3. El backend verifica token y recupera la cuenta mediante `self-account`.
4. La operación transaccional carga el Grupo con su Repositorio estricto y compara el UID verificado con `ownerId` vigente; esa comprobación constituye `owner-access` para E2-02.
5. Si no existe abierta, la UI muestra estado vacío y acción “Crear y abrir temporada”.
6. El actor aporta nombre, fecha de inicio y una clave estable de idempotencia generada por el cliente.
7. El contrato rechaza propiedades desconocidas y normaliza datos aceptados.
8. La Aplicación valida el payload y prepara la intención; Grupo y ownership se vuelven a comprobar dentro de la transacción que puede confirmar la escritura.
9. Se evalúa la exclusión de Temporada abierta mediante el guard por Grupo y el chequeo de integridad canónico; no se ejecuta control comercial adicional.
10. El Aggregate Root Temporada se crea con ID opaco, referencia a Grupo, nombre, fecha de inicio y estado `abierta` asignado por el sistema.
11. Una transacción confirma la Temporada y el guard técnico correlacionado sin modificar Grupo.
12. La respuesta se construye desde el estado persistido con outcome `CREATED_OPEN`.
13. La UI muestra confirmación y actualiza/navega a la vista mínima de Temporada.

No se producen eventos ni escrituras colaterales.

## 6. Flujos alternativos y errores

| Condición | Respuesta funcional | Estado resultante | Feedback | ¿Reintento? |
|---|---|---|---|---|
| Sin token | `UNAUTHENTICATED` | Sin cambios | Iniciar sesión | Sí, tras autenticar |
| Cuenta ausente/incompatible | `ACCOUNT_REQUIRED` | Sin cambios | Inicializar o recuperar cuenta | Sí |
| Grupo inexistente | `GROUP_NOT_FOUND` | Sin cambios | Grupo no disponible | No con ese ID |
| Grupo incompatible | `GROUP_INCOMPATIBLE` | Sin cambios | Recurso no compatible | No automático |
| No Owner | `NOT_AUTHORIZED` | Sin cambios | Sin autorización | No |
| Payload inválido/desconocido | `VALIDATION_FAILED` | Sin cambios | Error de campo | Sí, corregido |
| Ya existe abierta por otra intención | `OPEN_SEASON_ALREADY_EXISTS` | Se conserva existente | Mostrar la vigente | No para crear otra |
| Mismo reintento confirmado | `EXISTING_IDEMPOTENT` | Se conserva creada | Confirmar existente | No necesario |
| Misma clave, payload distinto | `IDEMPOTENCY_CONFLICT` | Sin cambios | Reiniciar intención/corregir | Sí, con nueva clave válida |
| Estado/guard inconsistente | `INCOMPATIBLE_STATE` | Sin reparación automática | Operación no disponible | No automático |
| Conflictos agotados | `CONFLICT` | Sin commit nuevo | Reintentar | Sí |
| Dependencia caída | `DEPENDENCY_UNAVAILABLE` | Sin confirmación nueva conocida | Reintentar conservando clave | Sí |
| Error no clasificado | `INTERNAL_ERROR` | No se afirma éxito | Reintentar conservando clave | Sí |

## 7. Postcondiciones y criterios de aceptación

### Postcondiciones

- Existe exactamente una Temporada abierta confirmada para el Grupo.
- La Temporada referencia al Grupo, pero ninguno contiene al otro.
- Grupo, Usuario, Persona, Membresía y demás Agregados no se modifican.
- No se crean Persona, Membresía, Solicitud, Plan, Suscripción ni actividad.
- El mismo reintento resuelve la misma Temporada.
- Una intención diferente no puede crear otra abierta.
- El guard técnico no se expone como dominio ni DTO.

### Criterios Dado/Cuando/Entonces

| ID | Dado | Cuando | Entonces |
|---|---|---|---|
| AC-01 | Owner válido, Grupo propio y sin abierta | crea con payload válido | se confirma una Temporada `abierta` |
| AC-02 | Owner sin Persona | crea | no se bloquea ni se crea Persona |
| AC-03 | Grupo sin Membresías | crea/consulta | el estado es válido y no se crean Membresías |
| AC-04 | Grupo sin Temporada | consulta contexto | recibe estado vacío autorizado |
| AC-05 | token válido | crea | Owner deriva del UID autenticado, no del payload |
| AC-06 | payload incluye otro Owner/UID | crea | se rechaza todo el payload |
| AC-07 | payload incluye estado | crea | se rechaza; estado lo asigna el sistema |
| AC-08 | payload incluye propiedad desconocida | crea | `VALIDATION_FAILED`, cero escrituras |
| AC-09 | Grupo inexistente | crea/consulta | `GROUP_NOT_FOUND` sin revelar datos |
| AC-10 | autenticado sin cuenta | crea/consulta | `ACCOUNT_REQUIRED` |
| AC-11 | Usuario no Owner | opera | `NOT_AUTHORIZED` |
| AC-12 | `users.roles == admin` sin ownership | opera | `NOT_AUTHORIZED`; rol ignorado |
| AC-13 | primera intención válida | crea | `CREATED_OPEN` y una abierta |
| AC-14 | abierta existente por otra intención | crea otra | `OPEN_SEASON_ALREADY_EXISTS` |
| AC-15 | misma clave y payload | reintenta | `EXISTING_IDEMPOTENT` con mismo ID |
| AC-16 | commit ocurrió y respuesta se perdió | reintenta | obtiene la Temporada persistida |
| AC-17 | dos solicitudes iguales simultáneas | compiten | una creación y una resolución idempotente; un documento |
| AC-18 | dos solicitudes diferentes simultáneas | compiten | sólo una abierta; la otra recibe conflicto estable/abierta existente |
| AC-19 | misma clave y payload normalizado distinto | reintenta | `IDEMPOTENCY_CONFLICT` |
| AC-20 | fallo antes del commit | reintenta | no encuentra parcial y puede confirmar una vez |
| AC-21 | fallo después del commit | reintenta | recupera la confirmada, no duplica |
| AC-22 | Owner de Grupo propio | lee Temporada por ID/contexto | recibe DTO mínimo |
| AC-23 | no Owner | lee | `NOT_AUTHORIZED` sin DTO |
| AC-24 | cliente intenta escribir Firestore | escribe Temporada/guard | reglas deniegan |
| AC-25 | creación válida | finaliza | documento Grupo permanece byte-a-byte sin cambios |
| AC-26 | creación válida | finaliza | no existe nueva Persona |
| AC-27 | creación válida | finaliza | no existe nueva Membresía |
| AC-28 | creación válida | finaliza | no crea Solicitud, actividad ni otro Agregado |
| AC-29 | dependencia no disponible | opera | falla cerrado y no afirma éxito |
| AC-30 | Grupo legado incompatible | opera | `GROUP_INCOMPATIBLE`; no adapta ni migra |

## 8. Frontend

### Pantallas, rutas y componentes físicos

- `volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx`: integra exactamente una sección “Temporada” que llama `getOpenSeasonContext(groupId)` después de recuperar el Grupo; muestra carga, vacío autorizado, DTO vigente o error, sin leer Firestore.
- `volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/seasons/new/page.tsx`: formulario mínimo Owner-scoped para crear y abrir; vuelve al detalle del Grupo tras `CREATED_OPEN` o `EXISTING_IDEMPOTENT`.
- `volley-ranking-frontend/src/components/seasons/OpenSeasonSection.tsx`: presentación del vacío/vigente y CTA hacia `/dashboard/groups/{groupId}/seasons/new`.
- `volley-ranking-frontend/src/components/seasons/OpenSeasonForm.tsx`: nombre, fecha civil, idempotencia estable, validación, foco y estados asíncronos.
- `volley-ranking-frontend/src/services/seasonsService.ts` y `src/types/OwnSeason.ts`: únicos contratos frontend nuevos. Se reutilizan `GroupPageShell`, estilos, AuthProvider y utilidades de callable; no se modifica `groupsService.ts` para convertir Grupo en contenedor de Temporada.

### Acciones y estados

- Estado inicial y carga del contexto.
- Vacío válido: “Este Grupo todavía no tiene una temporada abierta”.
- Acción Owner-only “Crear y abrir temporada”.
- Campos: nombre y fecha de inicio; la clave de idempotencia no es editable.
- Explicación: abrir establece el ciclo temporal; no incorpora integrantes ni habilita operaciones deportivas todavía.
- Envío bloqueado mientras la misma intención está pendiente.
- Éxito sólo desde respuesta persistida; sin actualización optimista autoritativa.
- Temporada existente: mostrar nombre, inicio y estado abierta.
- Error recuperable conserva la misma clave y el payload; cambio funcional genera nueva intención/clave.
- No Owner: estado no autorizado sin formulario.

### Ausencias válidas y accesibilidad

- Sin Membresías: contexto organizativo vacío, sin redirect a integrantes.
- Owner sin Persona: mensaje que distingue administración por ownership de pertenencia deportiva.
- No solicitar posición, dorsal, rol, cargo, Persona ni email.
- Responsive sin scroll horizontal; labels asociados; errores por campo y resumen; teclado completo; foco al primer error y a confirmación; `aria-live` para resultado asíncrono.

## 9. Servicio de Aplicación responsable

- **Módulo propietario:** Grupos.
- **Servicio conceptual y ubicación:** `createSeasonService` en `volley-ranking-system/functions/src/groups/application/seasonService.js`, dentro del Módulo Grupos.
- **Operación coordinada:** autenticación, cuenta, Grupo, owner-access, exclusión, creación del Aggregate Root, persistencia y DTO.
- **Autorizaciones:** `self-account` y `owner-access`.
- **Habilitación comercial:** no aplica en E2-02.
- **Contratos consumidos:** identidad autenticada; cuenta propia; lectura contextual de Grupo.
- **Repositorio utilizado:** Repositorio específico de Temporadas; reader para consultas.
- **Respuesta:** outcome estable y DTO mínimo.

El Servicio coordina. Normalización semántica, estado inicial e invariantes de fechas/esquema pertenecen al Dominio; autenticación y ownership no se trasladan al Agregado Temporada.

## 10. Agregados y reglas

| Agregado/referencia | Participación | Operación | Invariantes | ¿Se modifica? |
|---|---|---|---|---|
| Temporada | Aggregate Root objetivo | crear directamente abierta | identidad, grupo, nombre, inicio, estado, esquema | Sí, se crea |
| Grupo | Referencia externa y autoridad contextual | validar existencia/estado/Owner | schema v1; Owner vigente | No |
| Usuario | Referencia de cuenta | validar `self-account` | cuenta inicializada | No |
| Persona | Fuera de alcance | ninguna | ausencia válida | No |
| Membresía | Fuera de alcance; consumidor futuro | ninguna | no existe creación colateral | No |

### Esquema e invariantes de Temporada v1

- ID opaco estable generado por backend.
- `groupId` obligatorio, no vacío y autoritativo como referencia.
- `nombre`: string; Unicode NFC; trim y colapso de espacios internos; 1-80 puntos de código; sin controles; no único.
- `fechaInicio`: fecha civil ISO estricta `YYYY-MM-DD`; fecha real de calendario; obligatoria. No se valida contra la fecha actual en este corte.
- `estado`: exactamente `abierta`, asignado por sistema.
- `fechaCierre`: ausente mientras abierta.
- `createdAt`: timestamp de servidor, una sola vez.
- `schemaVersion`: entero exacto `1`.
- Payload y documento canónico de schema conocido son cerrados; propiedades desconocidas se rechazan.
- No se persisten descripción, objetivos, observaciones, configuración deportiva, miembros, estadísticas, Club ni economía.

## 11. Consultas y contratos públicos

| Capacidad | Proveedor | Consumidor | Información mínima | Errores |
|---|---|---|---|---|
| `createAndOpenSeason` | Módulo Grupos | UI Owner | input cerrado; salida `{ outcome, season }` | outcomes de comando |
| `getOpenSeasonContext` | Módulo Grupos | Vista Grupo y futuro E2-03 | input `{ groupId }`; salida `{ openSeason: SeasonDto \| null }` | auth/cuenta/grupo/autorización/incompatibilidad |
| `getOwnSeason` | Módulo Grupos | Confirmación/lectura por ID | input `{ groupId, seasonId }`; salida `{ season: SeasonDto }` | Temporada inexistente/no autorizada/incompatible |

No se agrega listado histórico, consulta global, lectura por Owner duplicado ni filtro por año. E2-03 deberá consumir una capacidad pública de contexto, no el Repositorio ni Firestore.

## 12. DTO de entrada y salida

### Entrada del comando

| Campo | Tipo | Obligatorio | Validación | Origen |
|---|---|---|---|---|
| `groupId` | string | Sí | ID opaco no vacío; límite técnico exacto a confirmar | Ruta/selección autorizada |
| `nombre` | string | Sí | normalización e invariantes 1-80 | Actor |
| `fechaInicio` | string | Sí | ISO `YYYY-MM-DD` real | Actor |
| `idempotencyKey` | string | Sí | 16-128 ASCII `[A-Za-z0-9._:-]`, identidad exacta | Cliente, generador seguro |

Conjunto cerrado. No acepta UID, Owner, Persona, Membresía, rol, permisos, estado, fecha de cierre, Plan, Suscripción ni propiedades desconocidas.

### Salida mínima

| Campo | Tipo | Semántica |
|---|---|---|
| `id` | string | identidad opaca |
| `groupId` | string | Grupo de contexto |
| `nombre` | string | nombre normalizado |
| `estado` | `abierta` | estado contractual estable |
| `fechaInicio` | string | fecha civil ISO |
| `createdAt` | string ISO-8601 | instante confirmado |

El comando envuelve el DTO como `{ outcome: "CREATED_OPEN" | "EXISTING_IDEMPOTENT", season: SeasonDto }`; las consultas usan los envoltorios indicados en la sección 11. El DTO no expone `schemaVersion`, guard, hashes, referencias Firestore, stack ni campos internos. Persistencia y contrato conservan `abierta`, evitando una traducción sin beneficio respecto de Grupo v1.

### Matriz de outcomes

| Outcome | Significado | HTTP/callable conceptual | Acción frontend |
|---|---|---|---|
| `CREATED_OPEN` | creada y abierta | éxito | confirmar/navegar |
| `EXISTING_IDEMPOTENT` | mismo reintento | éxito | confirmar existente |
| `OPEN_SEASON_ALREADY_EXISTS` | otra abierta vigente | conflicto funcional | mostrar vigente |
| `VALIDATION_FAILED` | entrada cerrada inválida | argumento inválido | corregir |
| `UNAUTHENTICATED` | token ausente/inválido | no autenticado | login |
| `ACCOUNT_REQUIRED` | cuenta no inicializada | precondición | recuperar cuenta |
| `GROUP_NOT_FOUND` | Grupo inexistente | no encontrado | volver/listado |
| `GROUP_INCOMPATIBLE` | esquema/estado no reconocido | precondición | soporte/aislamiento |
| `NOT_AUTHORIZED` | no Owner | permiso denegado | no autorizado |
| `SEASON_NOT_FOUND` | Temporada no existe en contexto | no encontrado | refrescar contexto |
| `INCOMPATIBLE_STATE` | Temporada/guard inconsistente | precondición | no reparar en UI |
| `IDEMPOTENCY_CONFLICT` | misma clave, payload distinto | conflicto | nueva intención |
| `CONFLICT` | concurrencia agotada | abortado | reintentar |
| `DEPENDENCY_UNAVAILABLE` | dependencia temporal caída | no disponible | reintentar misma clave |
| `INTERNAL_ERROR` | error estable no filtrado | interno | mensaje genérico |

Mapeo callable definitivo: `UNAUTHENTICATED → unauthenticated`; `VALIDATION_FAILED → invalid-argument`; `NOT_AUTHORIZED → permission-denied`; `GROUP_NOT_FOUND` y `SEASON_NOT_FOUND → not-found`; `ACCOUNT_REQUIRED`, `GROUP_INCOMPATIBLE` e `INCOMPATIBLE_STATE → failed-precondition`; `OPEN_SEASON_ALREADY_EXISTS → already-exists`; `IDEMPOTENCY_CONFLICT` y `CONFLICT → aborted`; `DEPENDENCY_UNAVAILABLE → unavailable`; `INTERNAL_ERROR → internal`. Los errores no exponen existencia de Temporada antes de validar Grupo y ownership.

## 13. Diseño físico Firestore

> **Estado:** diseño físico definitivo para E2-02, confirmado contra el checkout en el checkpoint indicado. Su documentación no implementa ni autoriza ampliar la frontera del incremento.

### 13.1 Colecciones y documentos

| Ruta definitiva | Finalidad | Naturaleza | Escritor | Lector |
|---|---|---|---|---|
| `seasons/{seasonId}` | fuente de verdad Temporada v1 | Agregado Temporada | backend | backend |
| `openSeasonGuards/{groupId}` | exclusión/idempotencia | control técnico, no Agregado | backend | backend |
| `groups/{groupId}` | validar contexto y ownership | Agregado Grupo existente | no E2-02 | backend |
| `users/{uid}` | validar cuenta | Agregado Usuario existente | no E2-02 | capacidad `self-account` |

### 13.2 Campos definitivos de `seasons/{seasonId}`

| Campo | Tipo | Obligatorio | Propietario | Original/derivado | Regla |
|---|---|---|---|---|---|
| `groupId` | string | Sí | Temporada | referencia original | Grupo existente |
| `nombre` | string | Sí | Temporada | original | NFC, trim/espacios, 1-80 puntos de código, sin controles |
| `fechaInicio` | string | Sí | Temporada | original | fecha civil ISO estricta y calendario real |
| `estado` | string | Sí | Temporada | original del sistema | exactamente `abierta` |
| `createdAt` | timestamp | Sí | Temporada/técnico | técnico | servidor |
| `schemaVersion` | number | Sí | Persistencia | técnico | `1` |

No se guarda ID dentro del documento ni `ownerUid`. Tampoco existen `fechaCierre`, `closedAt`, `endDate`, `openedAt` o `updatedAt`: crear y abrir es un único comando y `createdAt` representa suficientemente su único commit. La implementación deberá declarar una lista exacta de seis campos e hidratar fallando cerrado ante faltantes, extras, timestamp inválido, fecha no canónica, estado o versión desconocidos.

### 13.3 Guard técnico definitivo

| Campo | Tipo | Finalidad | Regla |
|---|---|---|---|
| `seasonId` | string | resolver confirmación | apunta a Temporada del mismo Grupo |
| `idempotencyKeyHash` | string | reconocer intención sin clave cruda | hash contextual versión+grupo+clave |
| `requestHash` | string | conflicto de payload | SHA-256 contextual de contrato v1, `groupId`, `nombre` y `fechaInicio` normalizados |
| `createdAt` | timestamp | diagnóstico | mismo commit |
| `guardVersion` | number | evolución/retiro | `1` |

`idempotencyKeyHash` será SHA-256 con contexto `sportexa:E2-02:idempotency:v1`, `groupId` y clave exacta; `requestHash` usará `sportexa:E2-02:request:v1`. Nunca se persiste la clave cruda. El guard no es Temporada, no pertenece a Grupo, no es fuente de verdad de estado y nunca se expone. Una consulta de abierta lee el guard por ID, recupera la Temporada canónica y verifica estrictamente `seasonId`, `groupId` y `estado == "abierta"`; cualquier guard presente inconsistente falla cerrado.

### 13.4 Referencias

| Referencia | Destino | Motivo | Validación | ¿Dentro del Agregado? |
|---|---|---|---|---|
| `season.groupId` | Grupo | contexto organizativo | Grupo v1 y Owner vigente | referencia propia; Grupo permanece fuera |
| `guard.seasonId` | Temporada | coordinación | misma Temporada/groupId/estado | No, control técnico |

### 13.5 Datos y proyecciones

- Nombre y fecha: originales del actor, validados por Dominio.
- Estado: original asignado por sistema.
- Timestamps: servidor.
- No se persiste proyección en Grupo ni dashboard.
- La sección de Temporada en vista Grupo es una proyección en memoria desde contratos backend.

### 13.6 Índices

| Consulta | Campos | Orden | Índice previsto | Estado |
|---|---|---|---|---|
| Temporada por ID | ID documental | ninguno | nativo | confirmado conceptualmente |
| Guard por Grupo | ID documental = groupId | ninguno | nativo | confirmado conceptualmente |
| Chequeo de integridad sin guard por Grupo | `groupId ==` + `limit(1)` | ninguno | índice simple automático de `groupId` | definitivo para E2-02 |

El guard resuelve el contexto abierto mediante dos lecturas documentales sin convertirse en fuente de verdad: sólo apunta al documento `seasons` cuyo `estado` se valida. Cuando el guard está ausente, tanto el reader contextual como la transacción de alta consultan `seasons.where("groupId", "==", groupId).limit(1)`; como E2-02 no puede cerrar ni importar Temporadas, cualquier documento encontrado sin guard es inconsistente y bloquea la consulta/creación en vez de devolver un vacío falso. Esta consulta usa el índice simple automático, evita un compuesto `groupId+estado` y hace implementable el fallo cerrado. `firestore.indexes.json` no requiere cambios en E2-02.

## 14. Seguridad y autorización

| Operación | Visitante | Autenticado no Owner | Owner | Global admin no Owner | Integrante | Sistema |
|---|---|---|---|---|---|---|
| Consultar contexto | Denegado | Denegado | Permitido por contrato | Denegado | Sin member-access | Lee |
| Crear/abrir | Denegado | Denegado | Permitido si dominio válido | Denegado | Sin member-access | Escribe |
| Consultar por ID | Denegado | Denegado | Permitido | Denegado | Sin member-access | Lee |
| Firestore directo | Denegado | Denegado | Denegado | Denegado | Denegado | Backend only |

- UID sólo desde token verificado.
- `self-account` no usa `users.roles`.
- `owner-access` carga Grupo schema v1 y compara `ownerId` vigente dentro de la transacción que confirma Temporada/guard; el repositorio E2-01 ya admite lectura transaccional.
- Temporada no duplica Owner; transferencias futuras cambian autoridad a través del Grupo.
- Presentación no importa Firestore para este flujo.
- Reglas conservadoras futuras: bloques explícitos `match /seasons/{seasonId}` y `match /openSeasonGuards/{groupId}` con `allow read, write: if false`; no se agrega excepción para Owner, integrante ni `isAppAdmin()`. El backend accede mediante Admin SDK y los callables realizan autorización.
- Logs sin token, clave cruda, documentos completos, hashes ni stack al cliente.
- Separación: autorización funcional (Owner) ≠ habilitación comercial (no aplica) ≠ validez de dominio (Temporada válida).

## 15. Repositorios y adaptadores

| Componente conceptual | Capa | Contrato | Implementación prevista | Alcance |
|---|---|---|---|---|
| `src/groups/domain/season.js` | Dominio | crear/rehidratar schema v1 | puro, sin Firebase | Aggregate Root Temporada |
| `src/groups/infrastructure/firestoreSeasonRepository.js` | Dominio/Aplicación | `newId`, `getById`, `createInitial`, mapper estricto | adaptador Firestore específico | sólo Agregado Temporada |
| `src/groups/infrastructure/firestoreOpenSeasonReader.js` | Aplicación | `getByGroupId` → abierta o vacío | guard + Repositorio; query simple de integridad si falta guard | modelo de lectura público |
| `firestoreGroupRepository.js` E2-01 | Aplicación | `getById(groupId, transaction)` | reutilización directa | existencia, schema y ownership |
| `firestoreSelfAccountReader.js` E2-01 | Aplicación | `getByUserId(uid)` | reutilización directa | `self-account` |
| `src/groups/infrastructure/firestoreOpenSeasonGuard.js` | Aplicación/Infra | `confirmOpenSeason` | guard técnico transaccional | coordinación, no Repositorio |
| `src/groups/application/seasonDto.js` | Aplicación | estado persistido → `SeasonDto` | mapper explícito | contrato |
| `src/groups/application/seasonService.js` | Aplicación | crear/abrir, contexto, por ID | orquestación | Servicio de Aplicación del Módulo Grupos |
| `src/groups/infrastructure/seasonCallable.js` | Infra | identidad/error callable | adaptación del patrón E2-01 | frontera pública |

No hay Repositorio genérico ni Repositorio conjunto Grupo-Temporada. El Servicio no importa Admin SDK; otros módulos no acceden al Repositorio de Temporadas.

## 16. Transacción y unidad de consistencia

- **Aggregate Root creado:** Temporada.
- **Límite lógico:** una Temporada.
- **Límite físico definitivo:** `seasons/{seasonId}` + `openSeasonGuards/{groupId}`; el guard es mecanismo técnico.
- **Lecturas transaccionales y orden:** Grupo vigente; guard por `groupId`; si existe, Temporada correlacionada; si no existe, query `seasons` por `groupId` con `limit(1)` para detectar inconsistencia. Todas las lecturas preceden las escrituras. Cuenta puede validarse antes sin incorporarse al dominio.
- **Datos confirmados conjuntamente:** ID, groupId, nombre, inicio, estado abierto, timestamp/versión y correlación idempotente/exclusión.
- **Grupo:** se lee para existencia/ownership y no se escribe. Una transferencia futura concurrente que modifique Grupo provoca reintento transaccional y nueva autorización.
- **Idempotencia:** no usa sólo UID ni groupId. Hash contextual de clave + hash de payload normalizado.
- **Misma clave/mismo payload:** devuelve misma Temporada.
- **Misma clave/distinto payload:** conflicto estable.
- **Dos iguales simultáneas:** un commit, segundo resuelve existente.
- **Dos diferentes simultáneas:** un commit; la otra observa abierta existente o conflicto, nunca crea segunda.
- **Dos Usuarios:** sólo el Owner del snapshot vigente puede confirmar; no Owner falla antes de escribir.
- **Fallo precommit:** cero documentos parciales.
- **Fallo postcommit/pre-respuesta:** reintento devuelve existente.
- **Guard faltante con cualquier Temporada E2-02 del Grupo:** la query de integridad la detecta y produce `INCOMPATIBLE_STATE`; guard presente roto o Temporada inválida también falla cerrado. No hay autorreparación en camino de usuario.
- **Conflictos agotados:** `CONFLICT`.
- **Dependencia caída:** `DEPENDENCY_UNAVAILABLE`; no se afirma rollback ni éxito sin lectura posterior.
- **Fuera de transacción:** Usuario, Persona, Membresía, Solicitud, Plan, Suscripción, actividad y dashboard.

### Condición de retiro del guard

Debe evolucionar antes de implementar cierre/reapertura, importar legado o permitir otro criterio de simultaneidad. El incremento de cierre deberá, en una única transacción, verificar que el guard referencia la Temporada que se cierra, cambiar el estado/fecha de cierre canónicos y liberar el slot mediante eliminación o versión explícitamente inactiva del guard. Antes de escoger entre ambas deberá decidir la retención de recibos idempotentes históricos: si se exige que una clave antigua siga resolviendo después del cierre, la correlación deberá separarse en recibos inmutables por intención y no conservarse dentro del único slot abierto. La siguiente apertura deberá volver a serializar por el mismo `groupId` y probar que nunca quedan dos abiertas. E2-02 no implementa ni anticipa ese cierre y el guard no se elimina sólo por introducir Comercial.

## 17. Eventos y efectos posteriores

**NO APLICA.**

No se crea Actividad, notificación, correo, dashboard persistido ni efecto sobre consumidores. E2-03 consultará la capacidad pública cuando se implemente.

## 18. Plan de pruebas

| Nivel | Casos mínimos | Entorno | Evidencia |
|---|---|---|---|
| Dominio | creación, normalización, referencia, nombre, fecha, estado inicial, desconocidos, rehidratación | runner unitario | casos/resultados |
| Aplicación | auth, cuenta, Grupo, Owner, no Owner, admin ignorado, sin Persona/Membresía, outcomes | mocks/fakes | unitarias |
| Contrato | payload/DTO cerrados, Owner/estado rechazados, fechas, errores estables | unitarias contractuales | matriz |
| Integración | repositorio, lectura por ID/contexto, guard, cero efectos colaterales | Emulator | suite |
| Concurrencia | iguales/diferentes, dos actores, conflictos agotados | Emulator con barreras | una abierta |
| Idempotencia | retry, respuesta perdida, payload distinto, guard inconsistente | Emulator | outcomes |
| Reglas | `get/list/create/update/delete` cliente denegados en `seasons`; `get/list/write` denegados en guard; visitante, Owner, no Owner, integrante y admin global; regresión de Grupo v1 y legado | Rules Unit Testing + Emulator | negativos cliente y éxito sólo vía callable/backend |
| Frontend | vacío, formulario, validación, doble envío, éxito, retry, no Owner, abierta existente | componentes/build/UAT | checklist/capturas |
| Accesibilidad | labels, teclado, foco, live regions, responsive | test + UAT | checklist |
| Arquitectura | independencia, backend-only, sin roles, arrays ni creación colateral | guard estructural | prueba automática |
| Regresión | E1/E2-01, gates completos | entorno local | conteos |
| Recuperación | pre/postcommit, dependencia caída, rollback | Emulator/dobles | informe |

Pruebas de fecha: formato, fecha imposible, años bisiestos, espacios, timestamp en lugar de fecha civil y reconstrucción exacta. Las pruebas de infraestructura deben cubrir campos exactos, `schemaVersion`, timestamp servidor, query simple por `groupId`, guard ausente con Temporada huérfana, guard cruzado de Grupo, guard con estado no abierto y documento con extras. Las de arquitectura deben ampliar `groupArchitecture.test.js` o agregar `seasonArchitecture.test.js` para prohibir `users.roles`, `memberIds`, `adminIds`, Persona/Membresía, Admin SDK en Aplicación, Firestore directo en las rutas nuevas, repositorio conjunto y escritura de `groups`. No existe prueba de transición `draft → open` porque esa transición no existe en E2-02.

## 19. Componentes actuales reutilizados

> Clasificación definitiva para esta ficha, basada en imports y contenido del checkout integrado.

| Componente | Reutilización | Adaptación | Riesgo |
|---|---|---|---|
| `identityFromCallableContext`/`createGroupCallableHandler` | UID sólo de `context.auth.uid`, mapeo estable de errores | extraer/adaptar nombre y catálogo sin aceptar UID del payload | Bajo |
| `firestoreSelfAccountReader` + Account Service E1-01 | precondición `self-account` | reutilización directa | Bajo |
| `firestoreGroupRepository.getById(groupId, transaction)` + `hydrateGroup` | Grupo v1 estricto y lectura transaccional | reutilización directa; comparar `ownerId` dentro de transacción | Bajo |
| `groupService.requireActor` | identidad autenticada | reutilizar o extraer helper compartido sin duplicar política | Bajo |
| `firestoreGroupCreationGuard` y `groupHashing` | patrón de transacción, hashes contextuales, clasificación de conflictos y fallo cerrado | adaptar a slot por Grupo; no copiar límite de un Grupo, `hasAnyByOwner` ni clave por UID | Medio controlado |
| Dominio/Aplicación/Infra de `src/groups` | límites y composición | agregar Agregado Temporada dentro del mismo Módulo Grupos | Bajo |
| `GroupPageShell`, carga, formulario E2-01, estilos y callable frontend | presentación/a11y/idempotency UUID | nuevos componentes/servicio/types de Temporada | Bajo |
| detalle `/dashboard/groups/[groupId]` | punto exacto de integración | sección `OpenSeasonSection`; no añadir Temporada al DTO persistente de Grupo | Bajo |
| `functions/index.js`, runners unit/emulator y `groupE2.test.js` | exports y verificación reproducible | tres exports y suites E2-02; ampliar guardas arquitectónicas | Bajo |
| `firestore.rules` | deny cliente y aislamiento schema v1 | dos matches deny explícitos, sin usar `isAppAdmin` | Bajo |
| `firestore.indexes.json` | baseline comprobado | no modificar; sólo índices simples automáticos | Bajo |

No deben copiarse `groupCreationGuards/{uid}`, `ownGroupsReader.hasAnyByOwner`, la política `PROVISIONAL_LIMIT_REACHED`, `adminAccessService.assertIsAdmin`, arrays de Grupo, escritores legacy, lecturas Firestore de frontend ni el repositorio de Grupo como repositorio conjunto.

## 20. Estructuras anteriores retiradas o aisladas

### Clasificación definitiva del legado y sus consumidores

| Ruta / estructura y contrato | Lectores | Escritores | Reglas, índices y tests | Autoridad y contradicción | Clasificación / tratamiento E2-02 |
|---|---|---|---|---|---|
| `seasons`, `season`, `temporada`, `temporadas`, `activeSeason`, `activeSeasonId`, `seasonId` | No hay lector de datos. Sólo copy en `dashboard/groups/[groupId]/page.tsx`, `dashboard/groups/page.tsx` y guardas de texto en `groupArchitecture.test.js` | Ninguno; `groupE2.test.js` sólo comprueba que E2-01 no creó `seasons` | Sin match de reglas, índice ni test de persistencia actual | No existe autoridad legada ni estructura retirable | **Reutilizable como namespace nuevo:** `seasons` queda disponible; no se retira nada |
| `groups/{groupId}` schema v1: `nombre,deporte,ownerId,estado,createdAt,schemaVersion` | `firestoreGroupRepository`, `firestoreOwnGroupsReader`, `groupService`; callables E2-01; `groupsService.ts`; rutas `/dashboard/groups/**` | Sólo `createOwnGroup` mediante Repositorio+guard | Reglas bloquean acceso cliente a schema v1; sin índice compuesto; unitarias `group*` y Emulator `groupE2.test.js` | Fuente autoritativa de Grupo/ownership; correctamente no contiene Temporada (`groupDomain.test.js` prohíbe `temporadaId`) | **Reutilizable:** leer estrictamente dentro de transacción; nunca escribir ni extender |
| `groups` legado: `memberIds`, `adminIds`, `admins`, `pendingRequestIds`, `pendingAdminRequestIds`, `adminId`, `ownerId`, `activo` | `httpApi.js`; `adminAccessService.js`; `groupAdminsService.js`; `onGroupPendingAlertsSync.js`; `notificationHandler.js`; frontend `admin/groups/[groupId]/**`, `profile/groups/**`, `public/groups/**`, dashboard legacy, `tournamentQueries.ts`, modales de inscripción/torneo | `httpApi.js` endpoints join/member/request/admin; callables `addGroupAdmin`, `removeGroupAdmin`, `reorderGroupAdmins`, `transferGroupOwnership`, `editGroup`, `toggleGroupActivo`; `adminGroupService.js` | `firestore.rules` permite sólo documentos `schemaVersion != 1` y consultas por arrays; índices simples automáticos; `priorityAssetCharacterization`, `minimumReadPolicy`, `maintenanceRules` y casos legacy de `groupE2` | Autoridad sólo del legado aislado; contradice Membresía/Solicitud independientes, no representa Temporada y sus arrays no están asociados a períodos | **Aislable / fuera de alcance:** no leer, escribir, migrar ni retirar en E2-02 |
| `matches/{matchId}`: `groupId`, `horaInicio`, `estado` y datos de partido, sin `seasonId` | callables/servicios de partido, ranking, equipos y reemplazos; triggers `onMatch*`/`onParticipation*`; UI admin/profile/public de matches; dashboard/componentes | `createMatch` + `adminMatchService`; callables edit/cerrar/reabrir/eliminar/join/leave; triggers y servicios asociados | `match /matches`; sin índice de Temporada; `minimumReadPolicy`, `priorityAssetCharacterization` y guardas de dashboard | Fuente legada de Partido social, temporalmente incompleta frente al objetivo; fecha de partido no autoriza inferir Temporada | **Fuera de alcance:** no agregar `seasonId`, no migrar ni usar para crear/abrir |
| `participations/{participationId}`: `matchId`, `userId`, estado/ranking/pago legado, sin `seasonId` | `adminAccessService`, `adminMatchService`, `rankingService`, `replacementService`, triggers `onParticipationCreate/Update`, UI de partido/perfil | join/leave y servicios de partido/ranking/reemplazo; triggers actualizan estado derivado | `match /participations`; queries por `userId` y acceso indirecto por Match; tests `minimumReadPolicy` y `priorityAssetCharacterization` | Participación legada; sólo llega a Grupo por Match y no es Membresía ni Temporada | **Fuera de alcance:** no derivar contexto, no migrar ni retirar |
| `tournaments`, `tournamentRegistrations`, `tournamentTeams`, `tournamentMatches`, fases/standings | servicios/callables/rutas/componentes de Torneos; registros/equipos referencian `groupId` | servicios/callables de Torneos, fixture, inscripción y resultados | reglas e índices compuestos actuales de Torneos; caracterización E0 | Fuentes legadas/activas de Torneo, inscripción y Partido de Torneo; ninguna contiene `seasonId` ni define Temporada | **Fuera de alcance:** no adaptar por conveniencia en E2-02 |
| Años/períodos embebidos en `groups` o arrays de miembros por período | Ninguno: búsqueda completa no encontró esos campos. `year: "numeric"` sólo aparece en formateo visual de fechas | Ninguno | Sin reglas, índices o tests asociados | La afirmación previa no se confirma en este checkout; no existe dato que retirar o reutilizar | **No existente:** se elimina como supuesto, no como código |
| `users.roles` + `adminAccessService.assertIsAdmin` | numerosos callables legacy de Grupo/Partido/Torneo; layouts/rutas admin legacy | onboarding/autopromoción ya contenidos por Etapa 0; E2-02 no escribe | reglas `isAppAdmin` conservan compatibilidad legacy; suites E0/E1/E2 prueban contención y admin no Owner | Autoridad global contradictoria para Temporada; no concede ownership | **Aislable:** prohibido en imports/flujo E2-02; retiro global fuera de alcance |
| `/admin/groups` y `/admin/groups/new` | Next.js | Ninguno | pruebas de arquitectura/UAT E2-01 | Ya redirigen a `/dashboard/groups` y `/dashboard/groups/new`; el detalle `/admin/groups/[groupId]` permanece legacy | **Reutilizable** el redirect; **aislable** el detalle legacy; E2-02 se integra sólo owner-scoped |
| Firestore directo en frontend legacy | páginas profile/public/admin de Grupo/Match y `tournamentQueries.ts` | Los escritores de alta de Grupo fueron retirados en E2-01; persisten mutaciones por API/callables legacy | reglas limitan el acceso; `accountArchitecture.test.js` analiza imports/lectores alcanzables | No es autoridad para Temporada y no debe copiarse | **Retirable sólo del flujo intervenido:** rutas E2-02 usan exclusivamente callables; retiro global fuera de alcance |

No se autoriza retiro físico en esta ficha. El inventario demuestra que no hay una estructura de Temporada que retirar y nombra los consumidores de cada estructura temporal/relacional encontrada. No habrá migración, backfill, inferencia, doble escritura ni modificación del legado en E2-02.

## 21. Checkpoint y rollback

- **Commit inicial verificado:** `8a3a43604af33f031568d8c9b7d91b3ed9a32ee6`; `dev`, HEAD y `origin/dev` coinciden; divergencia `0/0`.
- **Rama:** no creada; sugerida `feat/e2-02-temporada-apertura` después de aprobar ficha.
- **Estado de pruebas inicial:** esta intervención es documental y no ejecuta suites de implementación; la ficha, informe y cierre E2-01 registran los gates aprobados del checkpoint. La implementación posterior deberá repetirlos y no reutilizar conteos históricos como ejecución actual.
- **Checkpoint intermedio:** Dominio/contratos + pruebas de concurrencia antes de UI.
- **Rollback de código:** revertir sólo commits E2-02 o abandonar rama no integrada; nunca abrir reglas ni activar doble escritura.
- **Datos de prueba:** reset selectivo de emuladores o eliminación explícita de Temporada y guard correlacionado en `demo-*`.
- **Remoto:** no aplica; no desplegar ni consultar.
- **Interrumpir si:** se requiere modificar Grupo; aparecen dos abiertas; ownership puede eludirse; se necesita Persona/Membresía; el legado no puede aislarse; guard/rules requieren una decisión no documentada.
- **Reanudar si:** causa documentada, ficha actualizada, decisiones O-01 a O-05 cerradas, checkout limpio y pruebas de seguridad/concurrencia aprobadas.

## 22. Evidencia de cierre

El incremento deberá adjuntar:

- rama, commits y diff autorizado;
- ficha aprobada antes del primer cambio de código;
- preflight y gates completos;
- pruebas de dominio, aplicación, contratos, integración, concurrencia, reglas, frontend, arquitectura y recuperación;
- esquema e índices finales justificados;
- evidencia de una única Temporada abierta;
- idempotencia y respuesta perdida;
- rechazo de no Owner y global admin;
- escritura/lectura cliente denegada;
- ausencia de modificación de Grupo y creación colateral;
- inventario final de legado con consumidores;
- UAT de vacío, Owner sin Persona, sin Membresías, creación, consulta, retry, accesibilidad y responsive;
- rollback verificado;
- informe de implementación y cierre formal;
- confirmación de cero consultas/despliegues/cambios en Firebase remoto.

### Riesgos y deuda aceptada

| Riesgo/deuda | Impacto | Mitigación/condición de retiro |
|---|---|---|
| Sin zona horaria de Grupo | No se puede imponer relación de inicio con “hoy” | aceptar fecha civil declarada; decidir timezone en configuración futura |
| Cierre no implementado | No puede comenzar un segundo ciclo | incremento futuro de cierre actualiza Temporada y guard atómicamente |
| Guard técnico transitorio | Acoplamiento físico | encapsular y versionar; retirar/evolucionar con ciclo completo |
| Legado temporalmente incompleto | `matches`/`participations` actuales carecen de `seasonId` | mantener fuera de alcance; E2-02 no infiere ni migra contexto |
| Sin historial en UI | Consulta limitada a vigente | CU-019 futuro |
| Objetivos/observaciones ausentes | Modelo mínimo | incorporar sólo con CU-017/ficha posterior |

### Dependencias exactas para E2-03

E2-02 entrega a E2-03:

1. identidad estable de Temporada;
2. `groupId` autoritativo;
3. `getOpenSeasonContext({ groupId }) → { openSeason }`, con DTO autoritativo o `null`, previa autorización contextual;
4. fecha de inicio para contexto temporal;
5. unicidad de abierta por Grupo;
6. autorización Owner ya comprobable desde Grupo;
7. error estable para Grupo/Temporada inexistente o incompatible.

E2-03 no podrá acceder al Repositorio de Temporadas, a `openSeasonGuards` ni a documentos Firestore. Deberá consultar `getOpenSeasonContext` (o su capacidad interna equivalente si se implementa en el mismo backend), verificar `id`, `groupId` y `estado: "abierta"`, y crear exclusivamente Membresía dentro de su propia unidad de consistencia. La consulta no modifica Temporada. Las capacidades por ID y contexto son suficientes: E2-03 no necesita historial, listado ni filtro por fecha. E2-02 no decide unicidad activa Persona-Grupo, roles administrativos por Membresía, fechas de egreso ni renovación.

### Declaración final de definición

- **Estado de definición:** Lista para implementar.
- **Decisiones funcionales fundamentales abiertas:** ninguna identificada con las fuentes normativas disponibles.
- **Decisiones físicas fundamentales abiertas:** ninguna; O-01 a O-05 cerradas en esta intervención.
- **Decisiones futuras no bloqueantes:** diseño de cierre/reapertura, fecha de cierre y retención de idempotencia histórica; timezone normativa del Grupo; historial CU-019; adaptación/migración de Partido, Participación, Membresía y demás legado. Ninguna pertenece a la implementación E2-02.
- **Criterios para `Lista para implementar`:** cumplidos documentalmente: checkpoint y E2-01 verificados; persistencia, autorización, transacción, idempotencia, reglas, índices, contratos y frontend definidos; legado afectado inventariado; sin contradicción normativa ni ampliación de alcance.
- **Archivos que esta intervención debe modificar:** únicamente esta ficha.
- **Implementación, reglas, índices, dependencias, lockfiles, Firebase, commits, push y despliegues:** prohibidos y no realizados.
- **Condición para comenzar implementación:** crear posteriormente la rama aprobada desde el checkpoint verificado, comprobar working tree limpio salvo esta ficha ya versionada y respetar sin ampliación las decisiones físicas cerradas.

## Veredicto

`E2-02 LISTO PARA IMPLEMENTAR`
