# IUX — Relevamiento para mejora mobile-first del dashboard

Fecha del relevamiento: 2026-10-24
Última actualización documental: 2026-10-25
Naturaleza: análisis documental y técnico; no autoriza implementación, cambios normativos ni operación productiva.
Identificación aprobada con posterioridad al relevamiento: **Interetapa UX móvil (`IUX`)**, situada entre E3 y E4 sin renumerar las etapas existentes.
Primer incremento adoptado documentalmente: **`IUX-01 — Dashboard mobile-first y adaptación de pendientes existentes`**.

Decisión posterior al relevamiento: D5-061 adopta la arquitectura B para IUX-02, el addendum y la
entrega coordinada. Este informe conserva los hallazgos observados y señala la decisión posterior sin
reescribirlos como si hubieran estado vigentes al momento del relevamiento.

## 1. Preflight y fuentes revisadas

### 1.1 Checkpoint Git

- Rama: `dev`.
- HEAD: `c02f0afea067dcf4a757c68a9ef5bcd590682c24`.
- Relación informada por Git: `dev...origin/dev`, sin divergencia indicada.
- Estado inicial: índice y working tree limpios; no había archivos modificados, agregados ni no trackeados.
- No se cambió de rama, no se alteró ningún cambio preexistente y no se ejecutaron operaciones remotas.
- No existe `AGENTS.md` en el repositorio ni en su directorio padre inmediato; se aplicaron las convenciones observadas en `docs/implementacion` y la plantilla de Documento 5 §5.16.

Checkpoint previo a la actualización de selección N20/N31 e IUX-02:

- Rama: `dev`.
- HEAD: `c02f0afea067dcf4a757c68a9ef5bcd590682c24`.
- Working tree: Documento 5 modificado y directorio no trackeado
  `docs/implementacion/interetapa-ux-movil/`; se preservaron esos cambios y no se alteró código.

### 1.2 Base documental contrastada

- [Documento 5 vigente](../../transicion/Documento%205%20-%20Plan%20de%20Implementaci%C3%B3n%20y%20Transici%C3%B3n%20T%C3%A9cnica-borrador.md), en particular estado operativo, §§5.2–5.18, §§7.5–7.14 y D5-044–D5-060.
- [Evaluación consolidada de salida de E3](../etapa-3/E3-evaluacion-salida-consolidada.md).
- [Ficha E3-10](../etapa-3/E3-10-ficha-retiro-economia-legacy-torneos.md), [informe](../etapa-3/E3-10-informe-implementacion.md) y [cierre local](../etapa-3/E3-10-cierre.md), por su impacto sobre alertas y accesibilidad de Torneos.
- Fichas y cierres E2/E3 referidos por las superficies vigentes de Grupo, Membresía, Temporada, Solicitud, Pago y capabilities.
- `README.md`, scripts de calidad raíz y suites existentes, sólo como evidencia del repositorio; no como reemplazo de la normativa.

### 1.3 Estado E3 que debe preservarse

La evaluación vigente concluye: **alcance funcional y técnico local completo; sólo resta habilitación productiva; Etapa 3 no cerrable todavía**. En particular siguen pendientes:

1. UAT humana y retiro remoto verificado de `onMatchClose` para E3-09.
2. Decisión operativa de compatibilidad, rollout coordinado, reconciliación real, smoke/UAT y rollback operativo de E3-10.
3. Verificación productiva de que no reaparezca doble autoridad económica.

Por lo tanto, `IUX` puede proponerse documentalmente como interetapa acotada, pero no declara E3 cerrada, no habilita E4, no satisface gates productivos y no debe reactivar economía legacy ni controles de Torneos que hoy no tienen recorrido accesible.

## 2. Mapa de superficies actuales

### 2.1 Dashboard

| Superficie | Evidencia concreta | Comportamiento efectivo |
| --- | --- | --- |
| Ruta principal | `volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx:78` | Client Component monolítico que carga perfil, grupos propios, Torneos activos, pendientes y actividades. |
| Encabezado y resumen | `dashboard/page.tsx:451-581` | Muestra “Tu panel”, cards de perfil/ficha/grupos/actividad y acciones rápidas antes de pendientes. No implementa “Hola, [nombre]” ni el orden acordado. |
| Grupos del contador | `dashboard/page.tsx:161-190`; `src/services/groupsService.ts:75,114-116` | `getOwnGroupsDashboard` devuelve sólo grupos activos cuyo `ownerId` es la cuenta. No incluye Membresías ni accesos delegados. |
| Torneos destacados/actividades | `dashboard/page.tsx:192-327`; `UpcomingActivitiesSection.tsx:41-142` | Consulta Firestore directamente y arma cards de **todos los Torneos `activo` que la query pueda leer**; no los vincula a grupos relevantes del usuario. `matches={[]}` deja inactiva la rama de partidos sociales. |
| Detalle de destacado | `dashboard/page.tsx:600-613` | Abre un modal y luego `/tournaments/[tournamentId]`. No existe “Ver todos” propio de destacados. |
| Carrusel | `src/components/ui/carousel/CardCarousel.tsx:22-222` | Una card móvil, dos tablet y tres desktop; máximo cinco; flechas e indicadores; no hay avance automático. Falta gesto swipe y exposición de cantidad total. |
| Pendientes montados | `dashboard/page.tsx:330-392,583-588`; `AlertsPanel.tsx` | Listener real sobre `users/{uid}/pendingAlerts`; el componente vigente exige elegir un filtro antes de mostrar elementos. |
| Componente alternativo no montado | `PendingAlertsSection.tsx` | Implementación anterior/simple de la misma fuente. Reutilizar ambos produciría duplicación; no debe crearse una tercera sección. |

### 2.2 Navbar, sidebar y layouts compartidos

| Superficie | Evidencia concreta | Alcance e impacto |
| --- | --- | --- |
| Navbar global | `src/app/layout.tsx:23-30`; `src/components/layout/Navbar.tsx` | Se monta para toda ruta. Muestra SPORTEXA; en desktop avatar sólo si hay `photoURL` y nombre como botón; el menú de usuario sólo se renderiza en `/`. No hay campana. |
| Navegación móvil | `Navbar.tsx:197-328` | Botón hamburguesa abre un drawer vertical y los enlaces cierran el drawer. Submenús también cierran al navegar. No es el mismo componente que `AppSidebar`. |
| Sidebar desktop | `AppSidebar.tsx:26-263` | `hidden md:flex`; queda visible en layouts protected, admin y public autenticado. Repite la definición de navegación y la cuenta respecto de Navbar. |
| Layout protegido | `src/app/(protected)/layout.tsx:51-114` | Agrega `AppSidebar`, contenedor scroll propio y padding sólo desde `md`; cualquier cambio de sidebar afecta dashboard, perfil y todo `/dashboard`. |
| Layout admin | `src/app/(admin)/layout.tsx:48-114` | Comparte `AppSidebar`, pero exige `users.roles === "admin"`; un cambio compartido impacta toda administración legacy/de Torneos. |
| Layout público | `src/app/(public)/layout.tsx:11-29` | Muestra `AppSidebar` si hay sesión incluso en catálogos públicos. La campana global o el drawer compartido también impactarían `/groups` y `/tournaments`. |
| Navegación activa | `src/lib/navigation/activeRoute.mjs`; `functions/test/unit/navigationUat01.test.js` | Hay lógica y pruebas de ruta activa que deben preservarse. |

### 2.3 Contexto de Grupo y destinos actuales

- `/dashboard/groups/new`: creación canónica de Grupo.
- `/dashboard/groups`: grupos propios, membresías actuales e historia; por eso es el destino correcto de “Mis grupos”, aunque la etiqueta debe dejar claro que abarca ownership y pertenencia.
- `/profile/person`: ficha personal canónica. `/profile/info` redirige al dashboard y no es un destino útil para “Mi perfil”.
- `/dashboard/groups/[groupId]`: resumen Owner-only.
- `/dashboard/groups/[groupId]/seasons`: Temporadas Owner-only.
- `/dashboard/groups/[groupId]/economy?tab=debts|notices|history`: economía contextual con tabs según capability.
- `/dashboard/obligations`: obligaciones propias, incluidas Membresías activas y finalizadas.
- `/dashboard/payment-review/[groupId]`, `/dashboard/treasury/[groupId]` y `/dashboard/direct-payment/[groupId]`: redirects transicionales hacia Economía.
- `/admin/tournaments/[tournamentId]`: administración de Torneo, condicionada por la autorización legacy/global y la accesibilidad real del recorrido.
- `/profile/tournaments/registrations/[registrationId]` y `/profile/tournaments/teams/[teamId]`: detalle editable de inscripción/equipo para administradores de Grupo autorizados por los contratos vigentes.

`GroupContextNavigation.tsx:17-35` ya compone grupos propios, Membresías vigentes y las capabilities `GROUP_TREASURY`, `GROUP_PAYMENT_NOTICE_REVIEW` y `GROUP_DIRECT_PAYMENT_RECORD`. Es el antecedente reutilizable más cercano a “todos los grupos relevantes”, aunque su implementación N×3 no debe copiarse sin medición al dashboard global.

## 3. Pendientes actuales

### 3.1 Fuente, tipos y orden

La fuente implementada es la subcolección server-written `users/{uid}/pendingAlerts`:

- lectura propia y escritura cliente prohibida: `volley-ranking-system/firestore.rules:83-90`;
- modelo frontend: `src/types/pendingAlerts.ts:3-67`;
- listener: `dashboard/page.tsx:340-389`;
- mantenimiento: `pendingAlertsService.js`, `tournamentPendingAlertsService.js` y cinco triggers `on*PendingAlertsSync.js`;
- limpieza diaria: `onPendingAlertsMaintenance.js:4-9`.

Tipos deportivos activos implementados:

- Torneo en borrador que debe abrir inscripciones.
- Inscripciones pendientes de revisión.
- Torneo listo para cerrar inscripciones.
- Fixture pendiente.
- Torneo listo para iniciar.
- Resultados pendientes.
- Grupo aceptado o rechazado en Torneo.
- Inscripción/equipo con jugadores faltantes.

`tournament_registrations_closed` existe en tipos/definición pero está fijado a `active: false`, por lo que no genera un pendiente vigente. Los tipos de solicitudes/admin/membership legacy permanecen sólo para reconocimiento/retiro y el dashboard los filtra. `complete_profile` también se filtra y no se encontró productor vigente.

El query ordena `priority asc` y `updatedAt desc` y limita a 20. Después vuelve a ordenar. Como el filtro de tipos retirados ocurre **después** del límite, la cantidad cargada puede ser menor que la cantidad real de tareas activas visibles; además nunca demuestra un total mayor a 20. Por eso el listener actual no alcanza por sí solo para un contador total exacto. La prioridad física actual deriva de severidad (`urgent=100`, `warning=200`, `info=300`), no de la taxonomía de producto acordada `urgente/media/baja`. La asignación futura queda sin decidir.

### 3.2 Semánticas que hoy están acopladas

- `upsertPendingAlert` activa o reactiva una tarea derivada de la fuente deportiva.
- `resolvePendingAlert` marca `resolved` cuando la condición deja de existir.
- `dismissPendingAlert` llama directamente a `resolvePendingAlert` (`pendingAlertsService.js:90-119`).
- La UI llama a la acción “cerrar”/“eliminar” y quita inmediatamente el elemento (`dashboard/page.tsx:99-115`; `AlertsPanel.tsx:168-204`).
- El job de antigüedad marca `resolvedReason: "expired"`, y luego elimina inactivos a 30 días (`pendingAlertsMaintenanceService.js:22-66`).

Esto contradice la separación acordada entre leer, ocultar y resolver. También confirma que `pendingAlerts` no puede asumirse sin decisión como fuente universal de pendientes: hoy es una proyección de tareas de Torneos y mezcla información con acciones.

### 3.3 Estados de pantalla y fallos actuales

- Carga general: el dashboard bloquea toda la página sólo por `tournamentLoading`; un error de Torneos no tiene `catch` y aun así el `finally` termina la carga.
- Pendientes: hay carga y vacío, pero un error del listener se transforma en `[]` y se muestra como “No tenés acciones pendientes”; no hay error ni reintento.
- Grupos: el `finally` finaliza carga, pero no hay estado de error visible.
- Actividades: sólo distingue datos/no datos. El vacío “No hay actividades” no diferencia permisos, fallo o funcionalidad sin conectar.
- No existe una vista “todas las notificaciones” ni modelo de leído/no leído.

## 4. Datos, listeners y autorizaciones efectivas

### 4.1 Matriz de capacidades

| Actor/capacidad | Lecturas y acciones reales relevantes |
| --- | --- |
| Cuenta autenticada | Perfil propio, ficha Persona propia, obligaciones/entregas/recepciones propias, salida de Membresía propia, solicitud de ingreso, inscripción deportiva cuando cumple las reglas aplicables. No es “sólo consulta”. |
| Owner de Grupo | CRUD acotado de Grupo/Temporada, Membresía propia, roster, decisiones de solicitudes, economía, revisión de avisos, recepciones, condonación/corrección/anulación y gestión de capabilities. |
| `GROUP_TREASURY` | Consulta económica y movimientos; no decide entregas ni registra pagos. |
| `GROUP_PAYMENT_NOTICE_REVIEW` | Ve pendientes de terceros y puede confirmar/rechazar; se prohíbe auto-revisión. No concede Tesorería. |
| `GROUP_DIRECT_PAYMENT_RECORD` | Registra recepciones de terceros; se prohíbe operar sobre su propia Persona. No concede Tesorería ni revisión. |
| Admin global legacy | Habilita `/admin` y creación/gestión de Torneos según `users.roles`; no convierte a la cuenta en Owner de grupos canónicos. |
| Admin de Torneo/Grupo legacy | Autorizaciones contextuales en documentos legacy para Torneos, inscripciones, equipos, partidos y roster. No deben extrapolarse a permisos canónicos nuevos. |

La resolución actual de acceso contextual está en `GroupFrame.tsx:54-67`; prueba Owner primero y luego las tres capabilities independientemente. La ficha debe conservar validación backend en cada operación y evitar decidir visibilidad sólo por el frontend.

### 4.2 Fuentes disponibles por bloque propuesto

| Bloque | Fuente vigente utilizable | Limitación |
| --- | --- | --- |
| Encabezado | `account.displayName`, `firebaseUser.displayName`, `Person.firstName/lastName` | Debe fijarse precedencia de nombre y fallback. |
| Panel observado de alertas | `users/{uid}/pendingAlerts` | Sólo cubre contenido deportivo de Torneos y mezcla avisos/tareas; no satisface la definición posterior del bloque Pendientes. |
| Accesos rápidos | Rutas existentes | Al momento del relevamiento faltaba decidir el destino; la decisión posterior fija Ficha personal en `/profile/person`. |
| Agenda | No hay consulta global de agenda apta para todos los grupos relevantes | `UpcomingActivitiesSection` recibe partidos vacíos; los Torneos activos no tienen fecha/hora de próximo partido en el DTO armado. Una agenda real exige contrato/consulta y reglas de autorización. |
| Destacados | Cards de Torneos activas + `CardCarousel` | La query actual no define relevancia por usuario y las Rules limitan lectura; no es una fuente global segura. |
| Campana | No existe UI ni colección canónica de notificaciones leídas/no leídas | `pendingAlerts` y push no equivalen a una bandeja de notificaciones. |
| Push | Suscripciones, service worker, eventos en memoria y handlers | `EnablePushButton` no está montado; la entrega depende de VAPID y de un bus in-process, sin persistencia de notificación ni retry durable. |

## 5. Clasificación del cambio

> **Decisión posterior al estado observado:** IUX-01 queda limitado al encabezado, la adaptación de Pendientes, tres accesos rápidos y sus estados. “Requiere tu atención”, Agenda, campana/historial, navbar/sidebar y cualquier cambio de roles o permisos quedan fuera de IUX-01. Continúan como objetivo posterior de IUX sin quedar autorizados por esta postergación.

### 5.1 Reutilizable

- Protección de sesión y estados del layout protegido.
- `account` y `firebaseUser` para el saludo; Persona deja de intervenir según la decisión posterior.
- Rutas canónicas de Crear Grupo, Mis grupos y Ficha personal.
- Componentes visuales de cards/estados del panel actual, sólo si se desacoplan de `pendingAlerts`, severidades y acción de cerrar; la fuente no se reutiliza por defecto.
- lógica de ruta activa y cierre móvil después de navegar.
- `GroupContextNavigation` como evidencia de composición de contextos y capabilities, no como llamada para copiar literalmente.

### 5.2 Ajustes exclusivamente visuales

- Jerarquía “Hola, [nombre]” + “Dashboard”.
- Orden y espaciado mobile-first de secciones.
- Cards y encabezados responsive.
- Bloque plegable con título, contador y chevron, cuando una consulta aprobada pueda afirmar su cobertura de tareas.
- Etiquetado visible de Grupo/Torneo cuando ya existe en `meta` o puede derivarse sin nueva autoridad.

### 5.3 Cambios de navegación o interacción

- Reemplazar acciones rápidas imperativas por links a los tres destinos acordados.
- El acceso desde un pendiente debe entrar al recurso exacto y dejar la acción administrativa en su sección.

Los cambios de Navbar/sidebar, campana, carrusel de destacados y su navegación quedan expresamente fuera de IUX-01.

### 5.4 Funcionalidad nueva / posible backend

- Consulta global de “grupos relevantes” que componga ownership, Membresía y capabilities sin N×3 desde el cliente.
- Agenda global autorizada y temporalmente ordenada.
- Bandeja de notificaciones con leído/oculto/resuelto separados, máximo inicial de 10, vista total y política de antigüedad.
- Identidad estable de destinatario y deduplicación para hechos que aún no generan alertas.
- Posibles datos de presentación de Grupo/Temporada en DTOs de pendientes, evitando lecturas adicionales inseguras.

Nada de lo anterior se autoriza en `IUX-01` salvo que una decisión posterior lo incorpore expresamente.

### 5.5 Legacy, transicional o pendiente de habilitación

- Partidos sociales, Participación, equipos y sus rutas se conservan como superficie deportiva legacy hacia E4; su economía fue retirada localmente por E3-09.
- Torneos están implementados, pero E3-10 documenta que los controles no forman hoy un recorrido UAT accesible. Sus alertas deportivas existen; la economía legacy está retirada localmente.
- Los redirects `treasury/payment-review/direct-payment` son compatibilidad transicional.
- Tipos de alertas de ingreso/admin legacy se filtran y no tienen productor vigente.
- Push está implementado técnicamente, pero su activador no está montado y su habilitación/configuración productiva no fue acreditada en este relevamiento.
- Los gates productivos E3-09/E3-10 permanecen pendientes y no son resueltos por esta mejora visual.

## 6. Responsive actual y efectos compartidos

### 6.1 Limitaciones observadas

- En móvil desaparece el sidebar y Navbar despliega una navegación duplicada; cambiar ítems exige editar dos archivos.
- El contenido protegido no tiene padding móvil común; el dashboard compensa con `px-6`, mientras otras páginas usan shells propios.
- El menú móvil no declara `aria-expanded`, `aria-controls` ni gestión explícita de foco/Escape.
- El avatar desktop no abre menú fuera de `/`, pese a que el nombre parece interactivo.
- El carrusel responde por `window.innerWidth`, desplaza con botones y no soporta gesto táctil.
- El dashboard realiza N+1 lecturas de Torneos y mantiene tipos/transformaciones dentro de la página.
- `max-w-5xl` del dashboard convive con layouts `max-w-none`; el resultado visual cambia por ruta.

### 6.2 Radio de impacto

Modificar `Navbar`, `AppSidebar`, root layout o los tres route-group layouts afecta:

- `/dashboard/**`, `/profile/**`, `/join/**`;
- `/admin/**` y su gate de admin global;
- `/groups/**` y `/tournaments/**` cuando hay sesión;
- estados skeleton de protected/admin;
- navegación activa y safe-area/scroll containers.

IUX-01 no modifica esos componentes compartidos. Aun así debe incluir un smoke de rutas representativas para confirmar que la nueva composición del dashboard convive con el layout vigente; no necesita convertir ese smoke en un rediseño de navegación.

## 7. Decisiones aprobadas después del relevamiento

1. La interetapa se identifica como `IUX` y su primer incremento como `IUX-01`, sin cerrar E3 ni habilitar E4.
2. IUX-01 incluye saludo, rótulo Dashboard subordinado, Pendientes plegable inicialmente contraído, navegación contextual, accesos Crear Grupo/Mis grupos/Ficha personal y estados independientes de carga, error con reintento y vacío verdadero cuando la fuente permita afirmarlo.
3. El nombre del saludo usa, en orden, `account.displayName.trim()`, `firebaseUser.displayName.trim()` y el fallback literal `Cuenta`. No usa correo ni presupone que exista Persona.
4. Ficha personal navega a `/profile/person`.
5. Pendientes representa **tareas vigentes y accionables por la cuenta**, provenientes de todos sus Grupos relevantes y respetando ownership, Membresía y capabilities efectivas. No representa notificaciones ni avisos informativos.
6. Pendientes sólo permite expandir, contraer, consultar y navegar. Ver o navegar no resuelve la tarea; no se publican cerrar, ocultar, eliminar ni resolver.
7. Quedan fuera de IUX-01 “Requiere tu atención”, Agenda, campana/historial, leído/oculto, nuevos productores/tipos, navbar/sidebar y roles/permisos.
8. Se retiran del **dashboard** los bloques y las consultas de Torneos destacados/actividades, sin retirar rutas ni funcionalidades de Torneos fuera de esa pantalla.

## 8. Semántica corregida: tarea, notificación y destacado

| Concepto | Qué representa | Qué cambia su estado |
| --- | --- | --- |
| Tarea pendiente | Una acción concreta que la cuenta está autorizada a realizar y cuya fuente de verdad confirma que todavía corresponde | Se resuelve sólo cuando la fuente de dominio confirma la transición o deja de corresponder actuar |
| Notificación | Comunicación de un hecho; puede ser informativa o remitir a una tarea | Leerla u ocultarla no resuelve la tarea fuente |
| Destacado | Selección visual de una tarea relevante según una regla futura | Mostrarlo u ocultarlo no altera la tarea ni su fuente |

El contador de Pendientes debe contar **unidades de tarea definidas por cada contrato seleccionado**, no documentos de alertas. Un hecho meramente informativo suma cero. La acción administrativa se ejecuta en la sección contextual existente; el dashboard sólo navega.

`pendingAlerts` se conserva como hallazgo del estado observado, pero queda descartado como fuente obligatoria del nuevo bloque. También quedan descartados para IUX-01 el allowlist de nueve tipos de Torneos, la paginación suplementaria y el techo de 100 documentos propuestos en la revisión anterior. Las tareas deportivas legacy de Torneos no integran esta primera propuesta.

## 9. Candidatos implementados que sí representan tareas

| Inventario | Acción requerida | Usuario autorizado | Fuente y condición pendiente | Resolución | Destino existente | Consulta para dashboard |
| --- | --- | --- | --- | --- | --- | --- |
| `IUX-N20` Solicitud de ingreso — **seleccionada** | Aprobar o rechazar; si existe coordinación, consultar/continuar recuperación | Owner canónico del Grupo; ninguna capability delega esta decisión | `groupJoinRequests.estado == "pendiente"` más guard/coordination autoritativos del par Persona–Grupo | Solicitud `aprobada`, `rechazada` o `cancelada`; la aprobación coordinada debe confirmar su resultado | `/dashboard/groups/{groupId}#integrantes` | Existe `listPendingGroupJoinRequestsForOwnedGroup`, paginada y Owner-only, pero exige `groupId`; falta consulta global de todos los Grupos propios |
| `IUX-N31` Entrega informada — **seleccionada** | Confirmar o rechazar la entrega | Owner, o holder vigente de `GROUP_PAYMENT_NOTICE_REVIEW`; el delegado no puede auto-revisarse | `paymentDeliveries.decisionState == "REPORTED"`, con Grupo/capability/Membresía/Temporada revalidados | `CONFIRMED`, `REJECTED` o `RESOLVED_BY_ADMINISTRATIVE_RECEIPT` | `/dashboard/groups/{groupId}/economy?tab=notices`; hoy el detalle concreto se abre desde estado local y no tiene deep-link persistente | Existe `listGroupPaymentDeliveries`, paginada y autorizada por Grupo; falta consulta global para ownership + review efectivo y falta deep-link estable al ítem |
| `IUX-N30` Obligación propia abierta — **fuera de cobertura inicial** | Consultar la deuda y, cuando corresponda, informar una entrega | Titular de la Persona/Membresía vinculada al Pago | `payments.estado/economicState in [PENDING, PARTIAL]` y saldo vigente positivo | `SETTLED` o `VOIDED`; una reversión puede volver a abrirla | `/dashboard/obligations` | Existe `listMyObligations`, global y paginada; no se integra en IUX-01/IUX-02 inicial |

La selección funcional posterior incorpora únicamente `IUX-N20` e `IUX-N31` a Pendientes. `IUX-N30`
permanece como candidato real del inventario, pero queda fuera de la cobertura inicial. Los resultados
de decisión (`IUX-N21`, `IUX-N32`), reversiones como hecho y cambios informativos no son tareas
separadas. Torneos y partidos legacy quedan fuera. La selección no asigna campana, destacados,
prioridad ni vigencia, y no autoriza implementación.

No existe hoy una consulta única capaz de enumerar y contar estas tareas para todos los Grupos relevantes con autorización efectiva. Encadenar desde el cliente `listOwnGroups`, todas las Membresías, tres comprobaciones de capability por Grupo y luego cada listado específico produciría N+1, errores parciales y un “cero” no demostrable; no se recomienda para el dashboard.

## 10. Datos y dependencias que dejan de usarse en el dashboard

Al retirar Torneos destacados/actividades del dashboard dejan de ser necesarios allí:

- consultas directas a `tournaments`, `tournamentPhases`, `tournamentTeams`, `tournamentMatches` y `tournamentStandings`, incluido el patrón N+1 por Torneo;
- estados y tipos locales `activeTournamentCards`, `selectedTournamentCard`, `tournamentLoading`, `TournamentDashboard*`, `Tournament*QueryRow`;
- usos de `getDocs` destinados a Torneos, labels/tipos de Torneos, `UpcomingActivitiesSection` y `PublicTournamentDetailModal`;
- el login ad hoc del modal y sus dependencias `httpsCallable`, `functions`, `useToast` y `getAuthErrorMessage` cuando también se retire la acción de cerrar pendientes;
- `useRouter`, `userDoc`, `authenticate`, el menú rápido condicionado a admin y sus refs/estado, una vez que los tres accesos acordados se expresen como links para toda cuenta autenticada;
- la carga global del dashboard atada a `tournamentLoading`.

Al retirar las cards-resumen no exigidas por IUX-01 también dejan de tener consumidor en el dashboard `getOwnGroupsDashboard`, `userStats`, `userStatsLoading` y `usePerson`. El callable/servicio y las rutas se conservan: retirarlos del dashboard no autoriza borrar contratos backend.

`UpcomingActivitiesSection` queda sin consumidor identificado dentro del dashboard; `PublicTournamentDetailModal` puede seguir existiendo como funcionalidad reutilizable; `CardCarousel` conserva consumidores en `src/app/page.tsx`. Ninguno necesita eliminarse para cumplir IUX-01.

## 11. División recomendada del trabajo

### A. Estructura visual del dashboard

Corte frontend implementable sin afirmar datos inexistentes:

- saludo y jerarquía mobile-first;
- tres accesos rápidos;
- retiro de cards, consultas y modal de Torneos destacados/actividades del dashboard;
- estilos, accesibilidad y contrato visual del bloque plegable;
- **no publicar el bloque Pendientes ni un contador cero** hasta disponer de una consulta que cubra las tareas seleccionadas.

### B. Alimentación con tareas reales seleccionadas

La primera cobertura quedó definida como `IUX-N20` + `IUX-N31`; `IUX-N30` queda fuera. Para los dos
tipos seleccionados no existe hoy una agregación global. El barrido directo acotado descripto
inicialmente en IUX-02 fue descartado como implementación por D5-061 y queda como antecedente. La
[evaluación arquitectónica](IUX-evaluacion-arquitectura-proyeccion-dashboard.md) recomienda la
proyección central persistida y reconstruible. D5-061 la adopta; el barrido queda sólo como
antecedente y baseline comparativo.

Se adopta documentalmente, sin autorizar implementación, un incremento backend separado:

**`IUX-02 — Consulta global de tareas accionables del dashboard`** (identificación provisional).

- Un backend read-only `listMyDashboardTasks` o nombre equivalente sobre la generación proyectada.
- Sólo tipos seleccionados expresamente; sin `pendingAlerts`, Torneos legacy, notificaciones ni prioridad nueva.
- Autorización backend por tarea: Owner para solicitudes; Owner/reviewer efectivo y prohibición de auto-revisión para entregas.
- DTO mínimo con `taskId`, `kind`, `groupId/groupName`, `seasonId/seasonName` cuando aplique, resumen, fecha y destino contextual.
- Orden y paginación comunes, cobertura/health/`asOf` declarados y total sólo si puede afirmarse bajo
  la garantía aprobada. Si no hay total, no se publica el badge `N tareas` ni un cero.
- Revalidación completa en cada destino; ninguna mutación desde el dashboard.

## 12. Recomendación de secuencia y entrega

La secuencia adoptada es **IUX-02A**, luego **IUX-02B** y finalmente la integración visual
**IUX-01**. IUX-02A cubre producción durable, seguridad, reconstrucción y health; IUX-02B, consulta,
conteo y deep-links. El diseño visual puede revisarse en paralelo con fixtures controlados, pero esa
revisión no autoriza publicar fixtures, datos ficticios, un bloque aparente ni cero transitorio.

La habilitación de IUX-01/IUX-02 es coordinada y exige backfill, seguridad, rendimiento, pruebas y
UAT. El bloque mantendrá diseño contraído, contador cuya unidad sea “tareas” y cobertura explícita,
lista consultiva y navegación contextual.
Notificaciones, destacados, N30 y tareas deportivas de Torneos permanecen separados.

## 13. Alternativa de proyección central evaluada

La evaluación recomienda una proyección lógica central por usuario. Solicitud, Entrega y los módulos
de autorización conservan autoridad; una entrada derivada nunca resuelve la tarea. La apertura lee
una página precomputada y contadores contextuales, pero conserva el costo necesario de enumerar y
revalidar todos los contextos que aportan al listado y al total.

El mecanismo recomendado es scope revision + outbox en la misma transacción de cada writer,
proyector idempotente, contadores materializados por usuario/Grupo y rebuild por generación. Triggers
y escritura directa de cards no son la garantía primaria. Una lectura cliente protegida sólo por
Rules no alcanza contra una entrada obsoleta tras revocación; la consulta es backend-only y excluye
el contexto revocado antes de que termine la limpieza física.

D5-061 adopta B porque evita recorrer todas las tareas por apertura y permite extender
notificaciones/agenda sin mezclar semánticas. También adopta retención y objetivos provisionales de
30 s / 5 min / 24 h, sujetos a medición, y el addendum normativo. Presupuesto y rendimiento deben
medirse como gates de habilitación, pero no bloquean iniciar el trabajo necesario para obtener esa
evidencia una vez autorizado. El barrido acotado se conserva únicamente como alternativa A histórica
y baseline de costo.
