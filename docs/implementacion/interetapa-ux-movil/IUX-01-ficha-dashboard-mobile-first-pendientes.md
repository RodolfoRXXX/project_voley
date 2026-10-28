# IUX-01 — Dashboard mobile-first y adaptación de pendientes existentes

## Estado de la ficha

- Estado: **CIERRE TÉCNICO LOCAL CONFIRMADO, VERSIONADO E INTEGRADO EN DEV**.
- Responsable: pendiente de asignación.
- Fecha de cierre técnico local: 2026-10-28.
- Checkpoint de implementación: `dev@5def9ea5a7d4dd7472880f920032fa51843d00c8`.
- Etapa: **Interetapa UX móvil (`IUX`) entre E3 y E4**; no renumera etapas, no cierra E3 y no habilita E4.
- Naturaleza: ficha definida y adoptada documentalmente por D5-061; implementación versionada en
  `f88f47f` y `52e20eb`, e integrada mediante `21060db`; todavía sin despliegue ni habilitación
  productiva.

El alcance visual, la cobertura funcional inicial `IUX-N20` + `IUX-N31` y la arquitectura global
IUX-02 están adoptados por D5-061. `IUX-N30` queda fuera. IUX-01 consume localmente la consulta real
de IUX-02B; no debe mostrarse un cero mientras esa consulta no haya completado su cobertura declarada.

## 1. Identificación y trazabilidad

- ID: `IUX-01`.
- Nombre: **Dashboard mobile-first y adaptación de pendientes existentes**.
- Caso de uso: una cuenta autenticada abre un inicio global, consulta tareas vigentes que está autorizada a completar y navega a su contexto para actuar.
- Cambios incluidos:
  - saludo y jerarquía mobile-first;
  - cuatro accesos rápidos;
  - estructura plegable inicialmente contraída para Pendientes;
  - retiro del dashboard de bloques y consultas de Torneos destacados/actividades que no representan tareas del usuario;
  - estados independientes de carga, error con reintento y vacío verdadero cuando pueda afirmarse.
- Exclusiones:
  - “Requiere tu atención”, destacados y Agenda;
  - campana, historial, leído/oculto y productores de notificaciones;
  - tareas deportivas legacy de Torneos en esta primera propuesta;
  - navbar/sidebar compartidos;
  - roles, permisos, capabilities o Rules nuevos;
  - persistencia nueva, migraciones y gates productivos E3/E4.
- Fuentes relacionadas: Documento 5 §§5.2–5.18 y §7.5A, D5-058/D5-059/D5-060, evaluación de salida E3, [relevamiento IUX](./IUX-relevamiento-dashboard-mobile-first.md), [inventario](./IUX-inventario-candidatos-notificacion.md), [ficha IUX-02](./IUX-02-ficha-consulta-global-tareas-dashboard.md) y [evaluación de proyección](./IUX-evaluacion-arquitectura-proyeccion-dashboard.md).

## 2. Definición funcional de Pendientes

Una **tarea pendiente** es una acción concreta que la cuenta está autorizada a realizar y cuya fuente de verdad confirma que todavía corresponde. Debe proceder de cualquiera de sus Grupos relevantes: ownership, acción personal o capability efectiva, según el contrato de la tarea.

- La tarea deja de estar pendiente sólo cuando la fuente de dominio confirma su resolución o que ya no corresponde actuar.
- Leer u ocultar una notificación no resuelve la tarea.
- Un aviso informativo no suma al contador.
- Un destacado sólo cambia presentación; no cambia la tarea.
- El dashboard no ejecuta la acción: navega a la sección contextual que vuelve a autorizarla.
- Expandir, contraer, consultar o navegar no muta la fuente.

`users/{uid}/pendingAlerts` es evidencia del panel anterior, no una fuente obligatoria del nuevo bloque. Su mezcla de alertas informativas, tareas deportivas legacy, expiración y `dismiss=resolve` no satisface esta definición.

## 3. Actores y autorizaciones preservadas

| Actor | Tareas potenciales | Regla efectiva preservada |
| --- | --- | --- |
| Owner de Grupo | Solicitudes de ingreso y entregas informadas del Grupo | Ownership canónico revalidado por backend |
| `GROUP_PAYMENT_NOTICE_REVIEW` | Entregas informadas de terceros | Grant, slot, Membresía, Temporada y ownership revision vigentes; auto-revisión prohibida |
| Otras capabilities | Ninguna tarea inferida por similitud | Tesorería y registro directo no conceden revisión |
| Admin global/legacy | Ninguna ampliación automática | Roles legacy no reemplazan ownership/capabilities canónicos |

No se simplifica a “Owner actúa / integrante consulta”: una cuenta puede tener acciones personales o una capability específica.

## 4. Cobertura funcional inicial seleccionada

| Inventario | Acción requerida | Usuario autorizado | Fuente y estado pendiente | Resolución | Destino existente | Consulta disponible o faltante |
| --- | --- | --- | --- | --- | --- | --- |
| `IUX-N20` Solicitud de ingreso | Aprobar o rechazar; consultar/continuar recuperación si está coordinándose | Owner canónico del Grupo | Solicitud con `estado="pendiente"` y guard/coordination autoritativos Persona–Grupo | `aprobada`, `rechazada` o `cancelada`; la coordinación debe llegar a resultado terminal | `/dashboard/groups/{groupId}#integrantes` | `listPendingGroupJoinRequestsForOwnedGroup`, paginada y Owner-only, requiere `groupId`; falta agregación global de Grupos propios |
| `IUX-N31` Entrega de pago informada | Confirmar o rechazar | Owner o holder efectivo de `GROUP_PAYMENT_NOTICE_REVIEW`; delegado no revisa su propia Persona | `paymentDeliveries.decisionState="REPORTED"`, con contexto y capability revalidados | `CONFIRMED`, `REJECTED` o `RESOLVED_BY_ADMINISTRATIVE_RECEIPT` | `/dashboard/groups/{groupId}/economy?tab=notices`; falta deep-link persistente al ítem | `listGroupPaymentDeliveries`, paginada por Grupo; falta agregación global de ownership + review efectivo |

La selección aprobada para definición incluye exactamente `IUX-N20` e `IUX-N31`. `IUX-N30` queda
fuera de esta cobertura. No se seleccionan otros candidatos ni se asignan campana, destacados,
prioridad o vigencia. Esta selección funcional no autoriza implementación.

No se incorporan próximos Torneos, cambios de estado informativos ni candidatos legacy deportivos.

## 5. Precondiciones

1. `AuthProvider` resolvió sesión y Cuenta.
2. La ruta sigue protegida por `src/app/(protected)/layout.tsx`.
3. La consulta implementa exactamente los tipos seleccionados en §4.
4. Cada tipo posee unidad de conteo, autorización, resolución y destino definidos.
5. Existe una consulta que cubre todos los contextos declarados o comunica cobertura parcial sin mostrar vacío.
6. E3 continúa abierta globalmente con gates productivos pendientes.

## 6. Flujo objetivo

1. La cuenta abre `/dashboard`.
2. Se muestra “Hola, [nombre]”; el nombre usa `account.displayName.trim()` y luego
   `firebaseUser.displayName.trim()`. Si ambos faltan, muestra sólo “Hola”, sin inventar un nombre ni
   exponer el correo. “Dashboard” tiene menor jerarquía.
3. Pendientes comienza contraído con título, contador y chevron.
4. El contador usa la unidad **tareas** y declara qué tipos cubre. No cuenta notificaciones, documentos técnicos ni acciones subyacentes agregadas sin regla explícita.
5. Al expandir, una lista única identifica Grupo y Temporada cuando corresponde.
6. Cada ítem navega al recurso contextual; el destino revalida autorización y allí se actúa.
7. Crear Grupo, Mis grupos, Ficha personal y Mis obligaciones navegan a `/dashboard/groups/new`,
   `/dashboard/groups`, `/profile/person` y `/dashboard/obligations`. El último acceso no incorpora
   `IUX-N30` a Pendientes ni cambia permisos.
8. La pantalla consulta al entrar, al regresar desde una sección contextual y por acción manual. No
   usa polling, listener en tiempo real ni actualización automática por focus.

## 7. Estados y lenguaje

| Condición | Presentación |
| --- | --- |
| Consulta pendiente | Skeleton/estado de carga de la sección; sin contador definitivo |
| Error | Mensaje específico y “Reintentar”; no convertir a vacío |
| Cobertura parcial | Mostrar tareas encontradas y explicar qué cobertura falta; si no hay resultados, no mostrar cero |
| Cobertura completa sin tareas | Ocultar el badge y mostrar únicamente “No hay pendientes” |
| Fuente todavía no conectada | No publicar el bloque ni un placeholder que aparente una consulta exitosa |
| Pérdida de acceso detectada en una consulta | Limpiar datos y dejar que el destino/contexto informe no autorización |

El bloque no agrega un texto explicativo de cobertura. **“No hay pendientes”** se reserva para una
respuesta `READY`, completa y con total cero; carga, error, actualización, reconstrucción o degradación
no pueden reutilizar ese vacío.

## 8. Criterios de aceptación

1. En 360×800 el primer contenido anuncia “Hola, [nombre]” y “Dashboard” queda subordinado; no hay scroll horizontal.
2. Pendientes está inicialmente contraído y el control expone `aria-expanded`, `aria-controls`, foco visible y target mínimo de 44×44 px.
3. El badge usa `N tareas` y N corresponde exactamente a la unidad y cobertura declaradas por el contrato aprobado.
4. Un aviso informativo no incrementa N.
5. Tareas de varios Grupos aparecen sin selector de ámbito e identifican su contexto.
6. Visualizar, expandir, contraer o navegar produce cero writes y no llama a resolver/ocultar.
7. Tras resolver en la sección contextual, el regreso inicia una consulta y la tarea desaparece
   cuando esa respuesta confirma el estado fuente; no por el mero hecho de navegar.
8. Un fallo muestra error y reintento; nunca cero.
9. “No hay pendientes” sólo aparece después de completar todas las consultas incluidas en la
   cobertura declarada; el estado vacío no muestra badge `0 tareas`.
10. Owner, acciones personales y capabilities conservan sus reglas independientes, incluida la prohibición de auto-revisión.
11. Los cuatro accesos rápidos navegan y no ejecutan operaciones inmediatas. En móvil cada icono y
    etiqueta forman un único enlace accesible, admiten dos líneas y hacen wrap sin overflow.
12. No se renderizan “Requiere tu atención”, Agenda, campana ni destacados/actividades de Torneos.
13. No se ejecutan desde el dashboard las consultas N+1 de Torneos retiradas.
14. En 1280/1440 px el contenido aprovecha el espacio manteniendo orden DOM, legibilidad y ausencia de overflow.
15. No se agregan colección, writer, trigger, Rule, índice, rol ni permiso sin ficha/decisión separada.
16. Una pantalla ya abierta puede conservar una card que otro administrador resolvió hasta la próxima
    consulta. Su destino revalida estado y autorización e informa si ya se resolvió o no existe acceso.
17. No existe polling periódico, listener en tiempo real ni consulta automática disparada por focus.
18. Logout o cambio de cuenta limpia lista, total y cursores, y descarta respuestas tardías de la
    sesión anterior.

## 9. Componentes frontend

- Modificada: `src/app/(protected)/dashboard/page.tsx`.
- El diseño del plegable puede reutilizar estilos/cards, pero `AlertsPanel` no debe conservar filtro por severidad, dismiss ni acoplamiento a `PendingAlert` como contrato del nuevo bloque.
- Puede requerirse un componente semántico nuevo, por ejemplo `PendingTasksSection`, sólo cuando exista un DTO aprobado; esto no autoriza su implementación.
- Reutilizados: AuthProvider, Skeleton y links canónicos.
- Fuera del corte: Navbar, AppSidebar, layouts y `CardCarousel`.
- Retirados como consumidores del dashboard: `UpcomingActivitiesSection` y `PublicTournamentDetailModal`; sus archivos/rutas no se eliminan por esta ficha.

## 10. Consultas existentes y brecha global

Las consultas actuales son correctas en sus secciones contextuales, pero no componen el dashboard:

- Solicitudes: una llamada paginada por cada Grupo propio.
- Entregas: una llamada paginada por cada Grupo donde la cuenta sea Owner o reviewer efectivo.

Resolverlo sólo en frontend exigiría listar ownership y Membresías, probar capabilities por Grupo y encadenar listados N+1. Los fallos parciales harían imposible afirmar cero y el costo crecería con los Grupos. No se recomienda.

## 11. Incremento backend adoptado como dependencia

**`IUX-02 — Consulta global de tareas accionables del dashboard`**, adoptado por D5-061 e integrado
localmente en `dev@5def9ea5a7d4dd7472880f920032fa51843d00c8`.

- Dirección técnica adoptada: proyección derivada por usuario, outbox
  transaccional, proyector idempotente, contadores por usuario/Grupo y callable read-only.
- Incluye únicamente `IUX-N20` e `IUX-N31`.
- Autoriza cada tarea con las reglas de su módulo; no crea autorización transversal.
- DTO mínimo: `taskId`, `kind`, `groupId`, `groupName`, `seasonId/seasonName` cuando aplique, resumen, fecha y destino.
- Orden/paginación comunes y cobertura declarada.
- Total materializado por contexto y sumado sólo después de revalidar todos los contextos actuales;
  `READY` y `asOf` separan exactitud de proyección de sincronía instantánea.
- Persistencia exclusivamente derivada/reconstruible; Solicitud y Entrega conservan autoridad. Sin
  notificaciones, prioridad ni mutaciones desde la consulta.
- Cada pantalla destino revalida autorización y estado antes de permitir actuar.

La [evaluación técnica](./IUX-evaluacion-arquitectura-proyeccion-dashboard.md) define el mecanismo,
modelo, revocación, conteo y cortes IUX-02A/B. Los objetivos provisionales, retención y addendum están
adoptados; medición de presupuesto/rendimiento, backfill, seguridad, pruebas y UAT siguen como gates
de habilitación. Nada se incorpora silenciosamente a IUX-01.

## 12. División del trabajo y primer corte

### A. Estructura visual del dashboard

- encabezado y saludo;
- accesos rápidos;
- layout responsive y accesibilidad;
- retiro de bloques/consultas de Torneos destacados/actividades;
- contrato visual del plegable sin publicarlo como estado operativo.

### B. Alimentación de Pendientes

- cobertura fija N20+N31;
- incremento backend mínimo si se aprueba;
- integración, contador, estados, lista y navegación contextual.

**Secuencia adoptada y cumplida localmente:** primero IUX-02A, después IUX-02B y finalmente la integración visual IUX-01.
El diseño A puede revisarse con fixtures controlados en un entorno no productivo, pero eso no permite
publicar datos ficticios, Pendientes aparentes ni `0 tareas`. La habilitación se realiza coordinadamente
sólo después de la revisión/UAT y los gates operativos; los fixtures visuales locales no se publican.

## 13. Datos y reglas

- `pendingAlerts`: sin cambios y no consumido como fuente del nuevo bloque.
- Solicitud y Entrega: fuentes de verdad originales; ninguna se modifica por consultar.
- Nuevas colecciones/índices: no autorizados por IUX-01.
- Lecturas cliente ad hoc de datos ajenos: prohibidas.
- Writes desde dashboard: ninguno.

## 14. Seguridad

- Solicitud: Owner canónico del Grupo.
- Entrega: Owner o reviewer efectivo; auto-revisión delegada prohibida.
- Revocación/pérdida de contexto invalida visibilidad y acción.
- El frontend no concede acceso por mostrar una card.
- Pruebas negativas deben cubrir Grupo ajeno, capability revocada, auto-revisión y sesión cambiada.

## 15. Operaciones y consistencia

- El dashboard sólo consulta y navega.
- No hay transacción ni idempotencia nuevas en IUX-01 A.
- La resolución pertenece al comando contextual existente.
- La pantalla consulta al entrar, al regresar desde el contexto y mediante el control manual. No
  consulta periódicamente, por listener ni por focus.
- Una consulta posterior confirma si la tarea continúa; una respuesta tardía de otra cuenta/contexto debe descartarse.
- Esta cadencia de pantalla es independiente de la actualización de la proyección por cambios de
  dominio y de la reconciliación operativa que repara inconsistencias.

## 16. Eventos y notificaciones

**NO APLICA.** No se crean eventos, push, correo, leído, oculto ni campana. Una futura notificación puede apuntar a una tarea, pero no será su fuente ni su mecanismo de resolución.

## 17. Plan de pruebas

| Nivel | Casos mínimos |
| --- | --- |
| Unidad frontend A | fallback del saludo; links; orden visual; ausencia de consultas/bloques de Torneos |
| Responsive A | 360×800, 390×844, 768×1024, 1280×800 y 1440×900 |
| Accesibilidad A | headings, teclado, foco, targets, estados anunciados y reduced motion |
| Contrato B integrado | una unidad por tarea seleccionada; información excluida; cobertura/contador/vacío coherentes |
| Autorización B integrada | Owner, reviewer, auto-revisión, revocación y Grupo ajeno |
| Integración B integrada | consultar al entrar/regresar/manual; resolver en destino y retirar tras nueva respuesta; sin polling/focus/listener; errores parciales nunca convertidos en cero |
| Regresión | dashboard, Grupo, Economía, `/admin/tournaments`, `/groups` y `/tournaments` autenticado |

Gates locales ejecutados y evidencia detallada: [informe IUX-01](./IUX-01-informe-implementacion-dashboard-mobile-first.md).
El usuario informó que el recorrido UAT ejecutado funciona sin errores. Esa confirmación no cubre
casos no recorridos ni reemplaza los gates y validaciones productivos. La dirección visual general
y el arranque local corregido también fueron confirmados sólo para el entorno probado.

## 18. Estructuras retiradas del dashboard

| Estructura | Tratamiento |
| --- | --- |
| Torneos destacados/actividades y consultas N+1 | Retirar del dashboard; conservar rutas y funcionalidades externas |
| Acción rápida Crear Torneo | Retirar del dashboard; conservar su ruta fuera del alcance |
| Cards-resumen no incluidas | Sustituir por encabezado, accesos y composición acordada |
| `AlertsPanel` conectado a `pendingAlerts` | No reutilizar como fuente del nuevo bloque; su eventual retiro físico depende del diff aprobado |

## 19. Checkpoint y rollback

- Checkpoint: HEAD aprobado al iniciar; esta ficha no crea rama.
- A no modifica datos y revierte como un único cambio frontend.
- B requiere ficha/decisión propia antes de backend.
- Interrumpir si se intenta inferir tareas desde notificaciones, ampliar permisos, mostrar cero sin cobertura o incorporar Torneos legacy.

## 20. Evidencia de cierre futura

- commits y diff acotado;
- gates aplicables;
- capturas móvil/escritorio;
- evidencia de ausencia de consultas de Torneos y writes desde dashboard;
- para B, matriz de cobertura, autorización, contador, resolución y destinos;
- aclaración de que E3 conserva sus gates productivos.

## 21. Riesgos y dependencias

1. Confundir notificación con tarea y retirar una tarea por leer/ocultar.
2. Contar documentos o subacciones sin unidad de producto.
3. Usar N+1 frontend y presentar fallos parciales como cero.
4. Exponer tareas tras revocación de capability.
5. Duplicar una Entrega cuando la misma cuenta reúne ownership y capability.
6. Ampliar IUX-01 con backend sin ficha específica.

Dependencias: IUX-02A backfilled/READY, IUX-02B con consulta y deep-links, mediciones de
presupuesto/rendimiento y habilitación coordinada.

## 22. Estado de decisiones

| ID | Decisión | Estado |
| --- | --- | --- |
| IUX-01-D01 | “Requiere tu atención” fuera; objetivo posterior | Resuelta |
| IUX-01-D02 | Destacados de tareas y Agenda fuera; retirar Torneos destacados actuales es cambio incluido | Resuelta |
| IUX-01-D03 | Ficha personal → `/profile/person` | Resuelta |
| IUX-01-D04 | Pendientes sólo consulta/navegación; cero mutaciones | Resuelta |
| IUX-01-D05 | Navbar/sidebar fuera | Resuelta |
| IUX-01-D06 | Allowlist de Torneos + paginación suplementaria + techo 100 | **Descartada** |
| IUX-01-D07 | Selección inicial N20 + N31; N30 fuera | **Resuelta** |
| IUX-01-D08 | Entrega coordinada con IUX-02A/IUX-02B bajo una única ficha IUX-02 | **Resuelta por D5-061** |
| IUX-01-D09 | Consulta al entrar, al regresar desde contexto y manual; sin polling, listener ni refresh por focus | **Resuelta** |
| IUX-01-D10 | Mis obligaciones → `/dashboard/obligations`, sin incorporar N30 a Pendientes | **Resuelta** |

## 23. Declaración final

- Estado final: **CIERRE TÉCNICO LOCAL CONFIRMADO, VERSIONADO E INTEGRADO EN DEV**.
- Implementación: **correcciones UAT `f88f47f`; dashboard mobile-first `52e20eb`**.
- No quedan decisiones de diseño bloqueantes para revisar el cambio. El recorrido UAT informado por
  el usuario funciona sin errores y la dirección visual general es satisfactoria. Estas confirmaciones
  no cubren casos no probados ni producción. Permanecen pendientes presupuesto/rendimiento productivo,
  activación, backfill y habilitación coordinada.
- La implementación local no autoriza deploy, datos productivos ni cierre de IUX/E3.
