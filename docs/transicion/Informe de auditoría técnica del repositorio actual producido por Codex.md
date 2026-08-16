# 1. VEREDICTO EJECUTIVO

**B. BASE TÉCNICA VIABLE CON RIESGOS RELEVANTES.**

El repositorio contiene una aplicación funcional y activos reutilizables importantes: autenticación, grupos, partidos sociales, torneos por fases, inscripciones, fixture, notificaciones y una base Firebase operativa.

La transición progresiva es viable, pero la implementación actual no respeta varios límites centrales de la arquitectura congelada:

- `Usuario` concentra identidad, datos deportivos y un rol global.
- Membresías y solicitudes están embebidas en `Grupo`.
- Los pagos están embebidos en participaciones e inscripciones.
- CU-075 registra resultado y actualiza el estado competitivo del torneo en una misma transacción.
- No existen Persona, Temporada, Club, Entrenamiento, Observación Técnica ni Comercial.
- Hay dos bloqueantes de seguridad: autopromoción a administrador y lectura pública de datos personales/operativos.
- No existen pruebas automatizadas y el lint no aprueba.

Estas brechas no obligan a descartar todo el sistema, pero sí deben condicionar la planificación.

# 2. IDENTIFICACIÓN DEL ESTADO AUDITADO

| DatoValor                          |                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Repositorio                        | `C:\Users\Rodolfo\Documents\projectoVoley`                                                                                           |
| Remoto                             | `https://github.com/RodolfoRXXX/project_voley.git`                                                                                   |
| Rama                               | `dev`                                                                                                                                |
| Commit                             | `b005564cca6ebc4743f52e5723bad879201fc08b`                                                                                           |
| Fecha de auditoría                 | 13 de agosto de 2026, 16:02:58, UTC-03:00                                                                                            |
| Árbol inicial                      | Limpio: `## dev...origin/dev`                                                                                                        |
| Árbol final                        | Limpio: `## dev...origin/dev`                                                                                                        |
| Cambios versionados/no versionados | Ninguno                                                                                                                              |
| Documentos normativos              | Locales, no versionados e ignorados por [.git/info/exclude (line 7)]\(/C:/Users/Rodolfo/Documents/projectoVoley/.git/info/exclude:7) |
| Alcance                            | Código, configuración, reglas, índices, rutas, tipos, servicios, funciones, triggers, scripts y documentación técnica                |
| Exclusiones                        | No se accedió a datos reales, Firebase remoto, credenciales ni contenido de `.env`                                                   |

Se localizaron y leyeron completamente los cinco PDF:

- [Documento 1 — Arquitectura del Producto y Modelo de Dominio 6.5]\(/C:/Users/Rodolfo/Documents/projectoVoley/audit-baseline/Documento 1 - Arquitectura del Producto y Modelo de Dominio-6.5.pdf), 26 páginas.
- [Documento 1.5 — Modelo Conceptual del Dominio]\(/C:/Users/Rodolfo/Documents/projectoVoley/audit-baseline/Documento 1.5 - Modelo Conceptual del Dominio-AUD-C03.pdf), 16 páginas.
- [Documento 2 — Modelo Funcional y Casos de Uso]\(/C:/Users/Rodolfo/Documents/projectoVoley/audit-baseline/Documento 2 - Modelo Funcional y Casos de Uso-AUD-C04.pdf), 58 páginas.
- [Documento 3 — Arquitectura Funcional y Diseño Técnico]\(/C:/Users/Rodolfo/Documents/projectoVoley/audit-baseline/Documento 3 - Arquitectura Funcional y Diseño Tecnico-AUD-C04.pdf), 54 páginas.
- [Documento 4 — Diseño de la Arquitectura de Software]\(/C:/Users/Rodolfo/Documents/projectoVoley/audit-baseline/Documento 4 - Diseño de la Arquitectura de Software-AUD-C04.pdf), 123 páginas.

Total leído: 277 páginas. La extracción de texto se hizo fuera del repositorio, en `%TEMP%\sportexa-audit-b005564c`.

Limitaciones:

- No se validó comportamiento contra Firebase real o emuladores.
- No se inspeccionó el contenido de archivos de entorno.
- No se ejecutó `next build`, porque escribe en `.next`.
- La auditoría prueba lo presente en el commit, no la forma ni volumen de datos desplegados actualmente.
- Git requirió `-c safe.directory=...` por la política de ownership del entorno; no se modificó configuración Git.

# 3. RESUMEN DEL SISTEMA ACTUAL

Existe un repositorio con dos aplicaciones principales:

1. Un frontend Next.js/React que contiene 24 páginas, 15 rutas API, layouts públicos/protegidos/administrativos, componentes y acceso directo al SDK web de Firebase.
2. Un backend Firebase con 52 exports, 41 callables, 13 archivos de triggers y 19 servicios.

Las áreas funcionales efectivamente implementadas son:

- Login con Firebase Authentication y creación de documentos `users`.
- Onboarding con rol global y posiciones deportivas.
- Grupos públicos/privados, integrantes, administradores y solicitudes.
- Partidos sociales con convocatoria, ranking de titulares/suplentes, pagos, reemplazos, equipos y cierre programado.
- Torneos con formatos liga/eliminación/mixto, fases, inscripciones, equipos, fixture, tablas, avance, resultados y podio.
- Alertas pendientes, correo y notificaciones web push.
- Vistas de perfil, actividad reconstruida e historial de partidos/torneos.

La arquitectura física es una separación frontend/backend, pero no existe una separación equivalente entre dominio, aplicación e infraestructura. Servicios, callables, triggers, controladores HTTP y UI conocen directamente colecciones Firestore.

# 4. INVENTARIO TECNOLÓGICO

| ÁreaTecnologíaUbicaciónResponsabilidadEstado |                                              |                                                                                                                                         |                                   |                       |
| -------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------- |
| Frontend                                     | Next.js 16.1.3, React 19.2.3, TypeScript     | `volley-ranking-frontend`                                                                                                               | UI, rutas y composición de vistas | `PARCIAL`             |
| Estilos                                      | Tailwind CSS 4, PostCSS                      | Frontend                                                                                                                                | Presentación                      | `COMPATIBLE`          |
| Cliente de datos                             | Firebase Web SDK 12.8                        | [firebase.ts (line 9)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/lib/firebase.ts:9)                        | Auth, Firestore y Functions       | `COMPATIBLE`          |
| Backend                                      | Firebase Functions 4.4.1, Node.js 20         | `volley-ranking-system/functions`                                                                                                       | Callables, HTTP, triggers y cron  | `PARCIAL`             |
| Persistencia                                 | Cloud Firestore                              | Reglas, índices y servicios                                                                                                             | Estado operativo y proyecciones   | `PARCIAL`             |
| Autenticación                                | Firebase Authentication                      | Trigger `onUserCreate` y frontend                                                                                                       | Identidad digital                 | `PARCIAL`             |
| Autorización                                 | Rol global en `users` y arrays en documentos | Reglas, servicios y UI                                                                                                                  | Permisos globales/contextuales    | `CONTRADICTORIO`      |
| Eventos                                      | Node `EventEmitter`                          | [domainEventBus.js (line 1)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/events/domainEventBus.js:1) | Notificaciones internas           | `LEGADO REUTILIZABLE` |
| Notificaciones                               | Web Push, Nodemailer                         | Backend                                                                                                                                 | Push y correo                     | `COMPATIBLE`          |
| Emuladores                                   | Auth, Firestore, Functions, UI               | [firebase.json (line 6)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/firebase.json:6)                              | Ejecución local                   | `COMPATIBLE`          |
| Gestor de paquetes                           | npm, tres lockfiles                          | Raíz, frontend y Functions                                                                                                              | Dependencias                      | `COMPATIBLE`          |
| Tests                                        | Sin framework ni archivos de prueba          | Global                                                                                                                                  | —                                 | `NO IMPLEMENTADO`     |
| CI/CD                                        | Sin workflows o pipeline versionado          | Global                                                                                                                                  | —                                 | `NO IMPLEMENTADO`     |
| Vercel                                       | Sin configuración versionada                 | Global                                                                                                                                  | —                                 | `NO IMPLEMENTADO`     |

Existen `.env.local`, `.env.staging`, `.env.production` y `.firebaserc`; sólo se verificó su existencia.

# 5. MAPA ACTUAL DEL REPOSITORIO

| Área/carpetaResponsabilidad realDependenciasObservaciones |                                                  |                            |                                                  |
| --------------------------------------------------------- | ------------------------------------------------ | -------------------------- | ------------------------------------------------ |
| `volley-ranking-frontend/src/app`                         | Páginas, layouts y API proxies                   | React, Firebase, servicios | Mezcla composición, autorización y consultas     |
| `volley-ranking-frontend/src/components`                  | UI de grupos, partidos y torneos                 | Tipos y Firestore          | Algunos componentes contienen lógica de consulta |
| `volley-ranking-frontend/src/services`                    | Lecturas y mutaciones                            | Firestore y Functions      | No es una capa aislada del SDK                   |
| `volley-ranking-frontend/src/types`                       | Tipos persistentes y view models                 | Firestore                  | Hay duplicación de `UserDoc`                     |
| `volley-ranking-system/functions/callables`               | Entradas RPC                                     | Servicios backend          | 41 callables                                     |
| `functions/src/services`                                  | Reglas operativas y persistencia                 | Firestore Admin SDK        | Servicios conocen colecciones directamente       |
| `functions/src/triggers`                                  | Reacciones Firestore/Auth y cron                 | Servicios y Firestore      | Estadísticas, alertas y cierres                  |
| `functions/src/events`                                    | Bus y handlers de notificaciones                 | EventEmitter, push         | No durable                                       |
| `functions/src/scripts`                                   | Seed, migraciones y backfill                     | Firebase Admin             | No ejecutados                                    |
| `volley-ranking-system`                                   | Reglas, índices y configuración Firebase         | Firebase                   | Reglas públicas en gran parte                    |
| `docs`                                                    | Documentación histórica/operativa                | Modelo legado              | No es normativa; requiere reconciliación         |
| `audit-baseline`                                          | Arquitectura normativa congelada                 | Ninguna                    | No versionada e ignorada                         |
| Raíz                                                      | README y dependencia `lucide-react`              | npm                        | No hay configuración formal de workspace         |
| `derfgtyhj`                                               | Archivo sin función arquitectónica identificable | Ninguna                    | Residuo localizado                               |

# 6. MAPA LÓGICO IMPLEMENTADO

| Área lógicaResponsabilidadesDatos propiosDependenciasEvidencia |                                               |                                         |                                 |                                                                                                                                                                             |
| -------------------------------------------------------------- | --------------------------------------------- | --------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidad/perfil                                               | Alta, onboarding, rol y posiciones            | `users`                                 | Firebase Auth                   | [onUserCreate.js (line 9)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/triggers/onUserCreate.js:9)                                       |
| Grupos                                                         | Grupo, miembros, admins y solicitudes         | `groups`                                | `users`, correo, eventos        | [httpApi.js (line 318)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/httpApi.js:318)                                                      |
| Partidos sociales                                              | Convocatoria, ranking, pago, cierre y equipos | `matches`, `participations`, `teams`    | `users`, `groups`, `groupStats` | [index.js (line 38)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/index.js:38)                                                                |
| Ranking                                                        | Asignación titular/suplente                   | Campos de `participations`              | `users`, `groups`, `groupStats` | [rankingService.js (line 48)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/rankingService.js:48)                                 |
| Torneos                                                        | Ciclo competitivo, fases y fixture            | Colecciones `tournament*`               | `groups`, `users`               | [tournamentService.js (line 431)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/tournamentService.js:431)                         |
| Pagos operativos                                               | Estados e importes de partidos/torneos        | Campos embebidos                        | Participaciones e inscripciones | [tournamentRegistrationService.js (line 269)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/tournamentRegistrationService.js:269) |
| Proyecciones                                                   | Estadísticas, standings y alertas             | `groupStats`, standings, pending alerts | Triggers y servicios            | [onMatchStart.js (line 81)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/triggers/onMatchStart.js:81)                                     |
| Notificaciones                                                 | Alertas, correo y push                        | `pendingAlerts`, `push_subscriptions`   | Bus en memoria                  | [notificationHandler.js (line 34)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/events/notificationHandler.js:34)                         |
| Comercial                                                      | Sin capacidades de Plan/Suscripción           | —                                       | —                               | Búsqueda global sin representación comercial                                                                                                                                |

# 7. MATRIZ DE TRAZABILIDAD TÉCNICA

| Concepto normativoRepresentación en códigoUbicaciónOwnership actualPersistenciaEstadoEvidencia |                                                      |                       |                                   |                            |                       |                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------- | --------------------------------- | -------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Usuario                                                                                        | Auth + perfil deportivo + rol global                 | `users`               | Identidad y deportivo mezclados   | `users`                    | `CONTRADICTORIO`      | [User.ts (line 3)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/types/User.ts:3)                                                   |
| Persona                                                                                        | No existe como concepto independiente                | —                     | Absorbida por `users`             | —                          | `NO IMPLEMENTADO`     | Búsqueda global `persona`: sin coincidencias                                                                                                                 |
| Membresía                                                                                      | `memberIds`, `adminIds`, admins                      | Grupo/HTTP API        | `Grupo`                           | Campos de `groups`         | `CONTRADICTORIO`      | [httpApi.js (line 330)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/httpApi.js:330)                                       |
| Grupo                                                                                          | Documento con datos, miembros y admins               | Grupos                | Grupo más relaciones ajenas       | `groups`                   | `PARCIAL`             | [adminGroupService.js (line 12)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/adminGroupService.js:12)            |
| Temporada                                                                                      | No existe                                            | —                     | —                                 | —                          | `NO IMPLEMENTADO`     | Búsqueda global `temporada\|season`: sin coincidencias                                                                                                       |
| Club                                                                                           | No existe                                            | —                     | —                                 | —                          | `NO IMPLEMENTADO`     | Búsqueda global `club`: sin coincidencias                                                                                                                    |
| Torneo                                                                                         | Modelo rico con fases y estado                       | Servicios de torneos  | Torneo                            | `tournaments` y auxiliares | `PARCIAL`             | [Tournament.ts (line 15)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/types/tournaments/Tournament.ts:15)                         |
| Partido                                                                                        | Partido social y `TournamentMatch` separados         | Matches/Torneos       | Social: partidos; torneo: Torneos | Dos colecciones            | `PARCIAL`             | [match.ts (line 1)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/types/match.ts:1)                                                 |
| Entrenamiento                                                                                  | No existe                                            | —                     | —                                 | —                          | `NO IMPLEMENTADO`     | Búsqueda global sin coincidencias                                                                                                                            |
| Observación Técnica                                                                            | No existe                                            | —                     | —                                 | —                          | `NO IMPLEMENTADO`     | Búsqueda global sin coincidencias                                                                                                                            |
| Pago deportivo                                                                                 | Campos de participación/inscripción                  | Partidos y Torneos    | Participación/Torneo              | Campos embebidos           | `CONTRADICTORIO`      | [TournamentRegistration.ts (line 19)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/types/tournaments/TournamentRegistration.ts:19) |
| Solicitud                                                                                      | Arrays de solicitudes pendientes                     | Grupo                 | Grupo                             | `groups`                   | `CONTRADICTORIO`      | [httpApi.js (line 365)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/httpApi.js:365)                                       |
| Plan                                                                                           | No existe                                            | —                     | —                                 | —                          | `NO IMPLEMENTADO`     | Búsqueda global `\bplan\b`: sin coincidencias                                                                                                                |
| Suscripción comercial                                                                          | No existe; “subscription” sólo significa Web Push    | —                     | —                                 | —                          | `NO IMPLEMENTADO`     | [firestore.rules (line 137)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/firestore.rules:137)                                           |
| Estadísticas                                                                                   | `groupStats`, standings y contadores                 | Partidos/Torneos      | Triggers y Torneos                | Varias colecciones/campos  | `PARCIAL`             | [onMatchStart.js (line 97)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/triggers/onMatchStart.js:97)                      |
| Rendimiento                                                                                    | Compromiso y ranking                                 | Usuario/participación | Ranking y triggers                | `users`, `participations`  | `PARCIAL`             | [rankingService.js (line 169)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/rankingService.js:169)                |
| Actividad                                                                                      | Etiquetas UI, sin modelo persistente                 | Dashboard             | Composición de lectura            | —                          | `NO IMPLEMENTADO`     | `UpcomingActivitiesSection.tsx`                                                                                                                              |
| Historial                                                                                      | Consultas sobre partidos y participaciones           | Perfil                | Frontend                          | Fuentes operativas         | `LEGADO REUTILIZABLE` | `ProfileMatches.tsx`                                                                                                                                         |
| Equipo                                                                                         | `teams` sociales y `tournamentTeams`                 | Partidos/Torneos      | Partido o Torneo                  | Colecciones técnicas       | `COMPATIBLE`          | [teamsService.js (line 36)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/teamsService.js:36)                      |
| Fixture                                                                                        | Generador y `tournamentMatches`                      | Torneos               | Torneo                            | Documentos de partidos     | `COMPATIBLE`          | [confirmFixture.js (line 75)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/callables/confirmFixture.js:75)                     |
| Participación                                                                                  | Inscripción a partido; listas de jugadores en torneo | Partidos/Torneos      | Partido/Torneo                    | `participations`, arrays   | `LEGADO REUTILIZABLE` | [rankingService.js (line 104)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/rankingService.js:104)                |

# 8. MATRIZ DE FUENTES DE VERDAD IMPLEMENTADAS

| DatoFuente actualEscritoresConsumidoresTipoAlineación normativa |                                             |                              |                          |                            |                       |
| --------------------------------------------------------------- | ------------------------------------------- | ---------------------------- | ------------------------ | -------------------------- | --------------------- |
| Identidad digital                                               | Firebase Auth + `users`                     | Auth trigger                 | Frontend/backend         | Original                   | `PARCIAL`             |
| Datos deportivos personales                                     | `users`                                     | Onboarding y perfil          | Ranking y vistas         | Original/derivado mezclado | `CONTRADICTORIO`      |
| Rol de aplicación                                               | `users.roles`                               | Propio usuario vía callable  | Reglas, UI y backend     | Original                   | `CONTRADICTORIO`      |
| Grupo                                                           | `groups`                                    | UI y servicios               | Toda la aplicación       | Original                   | `PARCIAL`             |
| Membresía/rol grupal                                            | Arrays dentro de `groups`                   | HTTP API y servicios         | UI, partidos, torneos    | Original embebido          | `CONTRADICTORIO`      |
| Solicitud grupal                                                | Arrays pendientes en `groups`               | HTTP API                     | Grupo y alertas          | Original embebido          | `CONTRADICTORIO`      |
| Partido social                                                  | `matches`                                   | Servicios/callables/triggers | UI, ranking, cron        | Original                   | `PARCIAL`             |
| Participación social                                            | `participations`                            | Callables/triggers           | Ranking, pagos, equipos  | Original                   | `LEGADO REUTILIZABLE` |
| Pago social                                                     | `participations.pagoEstado`                 | AdminMatchService            | Cierre y UI              | Original embebido          | `CONTRADICTORIO`      |
| Estadística grupal                                              | `groupStats` y contadores de `users/groups` | Cron                         | Ranking y perfiles       | Derivado                   | `PARCIAL`             |
| Torneo                                                          | `tournaments`                               | TournamentService            | UI y servicios           | Original                   | `PARCIAL`             |
| Inscripción/equipo de torneo                                    | Registrations/Teams                         | Servicios y UI               | Fixture, pagos, perfiles | Original con duplicación   | `PARCIAL`             |
| Resultado de torneo                                             | `tournamentMatches.result`                  | TournamentPhaseService       | Standings, fases, UI     | Original                   | `CONTRADICTORIO`      |
| Tabla competitiva                                               | `tournamentStandings`                       | Resultado/fixture            | Torneo y UI              | Derivado                   | `ALINEADO`            |
| Alerta                                                          | Subcolección `pendingAlerts`                | Triggers/servicios           | Dashboard                | Vista/proyección           | `COMPATIBLE`          |
| Push                                                            | `push_subscriptions`                        | HTTP API                     | PushService              | Infraestructura            | `COMPATIBLE`          |

No existe una fuente independiente para resultado deportivo original de Partido de torneo, Persona, Membresía, Temporada, Pago, Solicitud o Suscripción comercial.

# 9. INVENTARIO DE PERSISTENCIA

| Estructura persistenteInformaciónEscritoresLectoresAgregado/capacidad relacionadaEstado |                                                   |                            |                    |                             |                       |
| --------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------- | ------------------ | --------------------------- | --------------------- |
| `users`                                                                                 | Identidad, contacto, rol, posiciones y compromiso | Auth/onboarding/perfil     | Toda la app        | Usuario/Persona/Rendimiento | `CONTRADICTORIO`      |
| `users/{uid}/pendingAlerts`                                                             | Alertas derivadas                                 | Triggers/servicios         | Propietario        | Actividad/notificaciones    | `COMPATIBLE`          |
| `groups`                                                                                | Grupo, miembros, admins y solicitudes             | UI, HTTP y servicios       | Toda la app        | Grupo/Membresía/Solicitud   | `CONTRADICTORIO`      |
| `matches`                                                                               | Partido social y estado                           | Servicios/triggers         | UI/ranking         | Partido                     | `PARCIAL`             |
| `participations`                                                                        | Jugador, ranking, posición y pago                 | Servicios/triggers         | UI/ranking/equipos | Participación/Pago          | `CONTRADICTORIO`      |
| `teams`                                                                                 | Equipos generados para un partido                 | TeamsService               | UI                 | Equipo dependiente          | `COMPATIBLE`          |
| `groupStats`                                                                            | Partidos jugados por usuario/grupo                | Cron                       | Ranking/perfil     | Estadística                 | `PARCIAL`             |
| `tournaments`                                                                           | Configuración y ciclo del torneo                  | TournamentService          | UI/servicios       | Torneo                      | `PARCIAL`             |
| `tournamentPhases`                                                                      | Fases y estado                                    | Torneos/fixture/resultados | UI/servicios       | Torneo                      | `ALINEADO`            |
| `tournamentRegistrations`                                                               | Inscripción, jugadores y pagos                    | Registro/UI                | Torneos/perfil     | Torneo/Pago                 | `CONTRADICTORIO`      |
| `tournamentTeams`                                                                       | Equipo aceptado, jugadores y copia de pago        | Registro/UI                | Fixture/perfil     | Torneo/Equipo/Pago          | `CONTRADICTORIO`      |
| `tournamentMatches`                                                                     | Fixture, partido y resultado                      | Torneo                     | Torneo/UI          | Fixture/Partido             | `CONTRADICTORIO`      |
| `tournamentStandings`                                                                   | Tabla derivada                                    | Fixture/resultados         | UI/Torneo          | Estadística                 | `ALINEADO`            |
| `tournamentAdvancementRules`                                                            | Reglas de clasificación                           | TournamentService          | Torneo             | Torneo                      | `ALINEADO`            |
| `push_subscriptions`                                                                    | Endpoint y claves push                            | HTTP API                   | PushService        | Infraestructura             | `COMPATIBLE`          |
| `push_subscriptions.sql`                                                                | Esquema SQL no utilizado por el runtime           | Ninguno identificado       | Ninguno            | Legado                      | `LEGADO REUTILIZABLE` |

Las reglas permiten lectura pública de casi todas las colecciones principales; sólo `pendingAlerts` queda restringida al propietario y `push_subscriptions` queda cerrada al cliente.

# 10. VALIDACIÓN DE CASOS DE USO

| #CasoFlujo, validaciones y unidad transaccionalEstado y faltantesEvidencia |                                    |                                                                                                                      |                                                                              |                                                                                                                                                                           |
| -------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1                                                                          | Registro/inicio de sesión          | Firebase Auth; trigger crea `users`; onboarding escribe rol y posiciones. Auth y Firestore no comparten transacción. | `PARCIAL`: identidad existe, pero mezcla Persona y permite elegir `admin`.   | [onUserCreate.js (line 9)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/triggers/onUserCreate.js:9)                                     |
| 2                                                                          | Crear Grupo                        | La página administrativa hace `addDoc` directo; las reglas exigen rol global y adminId propio.                       | `PARCIAL`: crea grupo válido, pero bypassa aplicación y embebe membresía.    | [page.tsx (line 65)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/app/(admin\\)/admin/groups/new/page.tsx:65)                                   |
| 3                                                                          | Crear/vincular Persona             | Sin entrada, modelo o persistencia.                                                                                  | `NO IMPLEMENTADO`                                                            | Búsqueda global                                                                                                                                                           |
| 4                                                                          | Gestionar Membresía                | HTTP API modifica arrays de integrantes/admins/solicitudes del grupo.                                                | `CONTRADICTORIO`: no hay agregado Persona–Grupo ni temporada.                | [httpApi.js (line 383)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/httpApi.js:383)                                                    |
| 5                                                                          | Renovar Membresía                  | No existe temporada ni renovación.                                                                                   | `NO IMPLEMENTADO`                                                            | Búsqueda global                                                                                                                                                           |
| 6                                                                          | Crear/cerrar Temporada             | No existe.                                                                                                           | `NO IMPLEMENTADO`                                                            | Búsqueda global                                                                                                                                                           |
| 7                                                                          | Crear Entrenamiento                | No existe.                                                                                                           | `NO IMPLEMENTADO`                                                            | Búsqueda global                                                                                                                                                           |
| 8                                                                          | Registrar asistencia               | No existe una capacidad de asistencia.                                                                               | `NO IMPLEMENTADO`                                                            | Búsqueda global                                                                                                                                                           |
| 9                                                                          | Registrar Observación Técnica      | No existe.                                                                                                           | `NO IMPLEMENTADO`                                                            | Búsqueda global                                                                                                                                                           |
| 10                                                                         | Crear Partido                      | Callable valida autenticación, rol global, administración de grupo y datos; escribe `matches`.                       | `PARCIAL`: partido social reutilizable, sin Temporada.                       | [createMatch.js (line 43)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/callables/createMatch.js:43)                                        |
| 11                                                                         | Registrar resultado de Partido     | El partido social pasa a `jugado`, pero no persiste marcador/resultado deportivo.                                    | `NO IMPLEMENTADO` para resultado original                                    | [onMatchStart.js (line 125)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/triggers/onMatchStart.js:125)                                 |
| 12                                                                         | Resultado de Partido de Torneo     | Callable delega a Torneos; una transacción escribe resultado, standings, fase y avance.                              | `CONTRADICTORIO` con CU-075.                                                 | [tournamentPhaseService.js (line 344)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/tournamentPhaseService.js:344)             |
| 13                                                                         | Crear Torneo                       | Callable valida payload; batch crea Torneo, fases y reglas.                                                          | `PARCIAL`: núcleo sólido; rol global y pago incrustado requieren adaptación. | [tournamentService.js (line 431)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/tournamentService.js:431)                       |
| 14                                                                         | Inscribir Equipo/Grupo             | Transacción lee Grupo/Torneo, cuenta `memberIds` y crea registration; aceptación crea `tournamentTeam`.              | `PARCIAL`: reutilizable, pero depende del modelo de membresía incompatible.  | [tournamentRegistrationService.js (line 32)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/tournamentRegistrationService.js:32) |
| 15                                                                         | Generar Fixture                    | Preview genera estructura; confirmación hace batch de matches, standings, fase y torneo.                             | `COMPATIBLE` para fixture; debe desacoplarse del resultado original.         | [confirmFixture.js (line 72)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/callables/confirmFixture.js:72)                                  |
| 16                                                                         | Registrar Pago deportivo           | Partido modifica `pagoEstado`; Torneo modifica importes/estado en registration/team.                                 | `CONTRADICTORIO`: no existe Pago independiente.                              | [adminMatchService.js (line 165)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/adminMatchService.js:165)                       |
| 17                                                                         | Consultar Estadísticas/Rendimiento | Ranking lee `users`, `groups`, `groupStats`; Torneo lee standings.                                                   | `PARCIAL`: derivación válida, ownership y fuentes mezcladas.                 | [rankingService.js (line 83)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/rankingService.js:83)                               |
| 18                                                                         | Consultar Actividad/Historial      | Perfil compone participaciones, matches, grupos y torneos.                                                           | `LEGADO REUTILIZABLE`: no introduce log universal.                           | `ProfileMatches.tsx`                                                                                                                                                      |
| 19                                                                         | Consultar Plan                     | No existe.                                                                                                           | `NO IMPLEMENTADO`                                                            | Búsqueda global                                                                                                                                                           |
| 20                                                                         | Cambiar Plan/Suscripción           | No existe.                                                                                                           | `NO IMPLEMENTADO`                                                            | Búsqueda global                                                                                                                                                           |
| 21                                                                         | Evaluar límites comerciales        | No hay llamada o contrato con Comercial al crear Grupo, Partido o Torneo.                                            | `NO IMPLEMENTADO`                                                            | [adminGroupService.js (line 12)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/adminGroupService.js:12)                         |

# 11. MAPA DE DEPENDENCIAS REALES

1. **Frontend administrativo → Firestore**

   → motivo: crear grupos y actualizar jugadores/pagos de inscripciones
   → información: documentos `groups`, `tournamentRegistrations`, `tournamentTeams`
   → mecanismo: Firebase Web SDK
   → acoplamiento: conoce nombres de colecciones, campos persistentes y cálculo de pago; un cambio interno rompe al consumidor
   → evidencia: [tournamentMutations.ts (line 125)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/services/tournaments/tournamentMutations.ts:125)
2. **Frontend → Firebase callables**

   → motivo: ejecutar casos de uso
   → información: DTO informales sin versión
   → mecanismo: `httpsCallable`
   → acoplamiento: contrato público implícito y razonablemente encapsulable
   → evidencia: [tournamentMutations.ts (line 8)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/services/tournaments/tournamentMutations.ts:8)
3. **Grupos → Usuarios**

   → motivo: mostrar integrantes, posiciones, correo y validar admin global
   → información: documentos completos `users`
   → mecanismo: lecturas directas Firestore
   → acoplamiento: el consumidor depende de campos internos de identidad y perfil deportivo
   → evidencia: [httpApi.js (line 104)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/httpApi.js:104)
4. **Partidos → Usuarios/Grupos/Participaciones/Estadísticas**

   → motivo: ranking, elegibilidad, cierre y rotación
   → información: posiciones, compromiso, totales y participaciones
   → mecanismo: consultas y batches Firestore
   → acoplamiento: el algoritmo depende directamente de la forma persistida de cuatro áreas
   → evidencia: [rankingService.js (line 55)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/rankingService.js:55)
5. **Torneos → Grupos/Usuarios**

   → motivo: inscribir grupos, contar miembros y seleccionar administradores
   → información: `memberIds`, `adminIds`, rol global
   → mecanismo: transacciones/consultas Firestore
   → acoplamiento: Torneos conoce la representación interna de Grupo y Usuario
   → evidencia: [tournamentRegistrationService.js (line 56)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/tournamentRegistrationService.js:56)
6. **Torneos → Partido de torneo/Standings/Fase**

   → motivo: CU-075
   → información: resultado original y estado competitivo
   → mecanismo: una única transacción Firestore
   → acoplamiento: ownership y consistencia compartidos; el consumidor no sobreviviría a un cambio interno de Partidos
   → evidencia: [tournamentPhaseService.js (line 353)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/tournamentPhaseService.js:353)
7. **Eventos → Notificaciones**

   → motivo: avisos posteriores a operaciones
   → información: payloads sin esquema/versionado
   → mecanismo: `EventEmitter` en memoria
   → acoplamiento: contrato implícito; pérdida posible al finalizar la instancia
   → evidencia: [domainEventBus.js (line 6)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/events/domainEventBus.js:6)
8. **Triggers → Proyecciones**

   → motivo: actualizar estadísticas y alertas
   → información: documentos completos de fuentes operativas
   → mecanismo: triggers Firestore y cron
   → acoplamiento: fuerte con nombres/campos; aceptable para proyecciones, pero no está encapsulado
   → evidencia: [index.js (line 17)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/index.js:17)

No se identificaron ciclos de importación relevantes, pero sí un grafo de acceso compartido a Firestore que hace que las fronteras sean lógicas sólo por convención.

# 12. CORRESPONDENCIA CON LA ARQUITECTURA CONGELADA

## Alineado

- Separación conceptual entre `Match` social y `TournamentMatch`.
- Torneo gestiona fases, inscripción, fixture, standings, avance y estado competitivo.
- Standings y estadísticas de torneo son estructuras derivadas.
- Equipo y Fixture no aparecen declarados como Aggregate Roots.
- Alertas se comportan como proyecciones, no como fuentes universales.

## Compatible

- Firestore y Firebase Functions son decisiones técnicas compatibles con la arquitectura.
- Separación física entre frontend y backend.
- Callables como contratos públicos implícitos.
- Colecciones técnicas independientes para fases, tablas y equipos no implican por sí mismas agregados.
- Historial compuesto desde fuentes operativas.
- Emuladores locales.

## Parcial

- Usuario digital, Grupo, Partido social y Torneo.
- Estadísticas y rendimiento.
- Autorización contextual mediante arrays de administradores.
- Capas de servicios backend.
- Máquinas de estado de partidos y torneos.

## No implementado

- Persona.
- Temporada y Club.
- Entrenamiento y asistencia.
- Seguimiento Deportivo y Observación Técnica.
- Resultado original de Partido social.
- Plan, Suscripción comercial y límites comerciales.
- Actividad como representación histórica explícita.
- Pruebas y CI.

## Contradictorio

- Usuario como identidad, perfil deportivo, rendimiento y rol global.
- Membresía y Solicitud embebidas en Grupo.
- Pago embebido en participaciones e inscripciones.
- CU-075 dentro de una transacción y fuente de verdad compartida de Torneo.
- Resultado de torneo escrito directamente por el servicio de Torneos.
- Autopromoción global a administrador.
- Exposición pública de información no pública por defecto.

## Legado reutilizable

- Participaciones sociales.
- Ranking y reemplazos.
- Generación de equipos.
- Alertas y notificaciones.
- API de grupos.
- Tipos y componentes de torneos.
- Bus de eventos como interfaz local, no como mecanismo durable.
- Documentación técnica histórica, después de reconciliarla.

## Indeterminado

- Volumen, calidad y variaciones reales de los documentos desplegados en Firebase.
- Si existen datos comerciales o deportivos administrados fuera del repositorio.
- Compatibilidad de los datos reales con cualquier futura migración.
- Política final de visibilidad pública por tipo de dato.

# 13. HALLAZGOS BLOQUEANTES Y ALTOS

| IDDescripción y evidenciaDecisión afectadaEstado actualImpactoSeveridadIntervención probableCerteza |                                                                                                                                                                                                                                                                                                                                                                                                              |                                                                      |                  |                                                                                  |              |            |      |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------- | ------------ | ---------- | ---- |
| TECH-GAP-01                                                                                         | Cualquier usuario autenticado puede llamar `updateUserRole("admin")`; onboarding también acepta `admin`. [updateUserRole.js (line 4)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/callables/updateUserRole.js:4), [userGameService.js (line 77)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/userGameService.js:77)               | Separación autenticación/autorización y roles contextuales           | `CONTRADICTORIO` | Escalamiento de privilegios a funciones administrativas                          | `BLOQUEANTE` | reemplazar | Alta |
| TECH-GAP-02                                                                                         | Las reglas permiten `read: if true` en usuarios, grupos, partidos, participaciones, pagos y torneos. [firestore.rules (line 34)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/firestore.rules:34)                                                                                                                                                                                        | Seguridad, privacidad y contratos públicos                           | `CONTRADICTORIO` | Exposición de correo, posiciones, pagos y datos operativos                       | `BLOQUEANTE` | reemplazar | Alta |
| TECH-GAP-03                                                                                         | `users` contiene rol, posiciones y compromiso; ranking consume esos campos. [User.ts (line 5)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/types/User.ts:5), [rankingService.js (line 169)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/rankingService.js:169)                                                                        | Usuario separado de Persona y del rendimiento                        | `CONTRADICTORIO` | No puede evolucionar identidad sin afectar deporte/autorización                  | `ALTA`       | migrar     | Alta |
| TECH-GAP-04                                                                                         | Integrantes, admins y solicitudes son arrays del documento Grupo, sin Persona, Membresía ni Temporada. [httpApi.js (line 330)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/httpApi.js:330)                                                                                                                                                                                | Membresía y Solicitud como agregados independientes                  | `CONTRADICTORIO` | Ownership, historial, renovación y roles contextuales quedan ligados a Grupo     | `ALTA`       | migrar     | Alta |
| TECH-GAP-05                                                                                         | CU-075 escribe resultado, standings, fase y siguiente llave en una transacción. [tournamentPhaseService.js (line 348)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/tournamentPhaseService.js:348), [tournamentPhaseService.js (line 467)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/tournamentPhaseService.js:467) | Partido propietario del resultado; repositorios y UoW independientes | `CONTRADICTORIO` | Fuente de verdad y consistencia compartidas entre Partido y Torneo               | `ALTA`       | reemplazar | Alta |
| TECH-GAP-06                                                                                         | Pago está embebido en `participations`, registrations y teams; se duplica entre inscripciones/equipos. [tournamentRegistrationService.js (line 215)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/services/tournamentRegistrationService.js:215)                                                                                                                           | Pago como agregado independiente                                     | `CONTRADICTORIO` | No hay identidad, lifecycle ni conciliación única del pago                       | `ALTA`       | migrar     | Alta |
| TECH-GAP-07                                                                                         | `estadoCompromiso` y `partidosTotales` se escriben en Usuario/Grupo y luego alimentan el ranking. [onMatchStart.js (line 97)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/triggers/onMatchStart.js:97)                                                                                                                                                                    | Estadísticas/rendimiento como capacidades derivadas                  | `CONTRADICTORIO` | Proyecciones deportivas contaminan agregados y se convierten en insumo operativo | `ALTA`       | migrar     | Alta |

# 14. HALLAZGOS MEDIOS

| IDDescripción y evidenciaDecisión afectadaEstado actualImpactoSeveridadIntervención probableCerteza |                                                                                                                                                                                                                                                                                                                                                                                                    |                                                          |                       |                                                           |         |            |       |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------- | --------------------------------------------------------- | ------- | ---------- | ----- |
| TECH-GAP-08                                                                                         | Servicios, callables, triggers y controladores acceden directamente a Firestore. [firebase.js (line 12)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/firebase.js:12)                                                                                                                                                                                            | Dependencias de dominio/aplicación hacia infraestructura | `PARCIAL`             | Eleva el costo de separar ownership y migrar datos        | `MEDIA` | encapsular | Alta  |
| TECH-GAP-09                                                                                         | La UI crea grupos y actualiza jugadores/pagos directamente; además replica el cálculo de pagos. [page.tsx (line 69)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/app/(admin\\)/admin/groups/new/page.tsx:69), [tournamentMutations.ts (line 29)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/services/tournaments/tournamentMutations.ts:29) | Casos de uso y validaciones en aplicación                | `CONTRADICTORIO`      | Dos caminos pueden aplicar invariantes distintas          | `MEDIA` | encapsular | Alta  |
| TECH-GAP-10                                                                                         | Los eventos posteriores usan `EventEmitter` fire-and-forget. [domainEventBus.js (line 6)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/events/domainEventBus.js:6)                                                                                                                                                                                               | Coordinación recuperable e idempotente                   | `LEGADO REUTILIZABLE` | Notificaciones pueden perderse al finalizar una instancia | `MEDIA` | adaptar    | Alta  |
| TECH-GAP-11                                                                                         | No existen archivos de prueba; el script backend es un placeholder. [package.json (line 5)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/package.json:5)                                                                                                                                                                                                             | Pruebas de dominio, aplicación y arquitectura            | `NO IMPLEMENTADO`     | No hay red para migrar ownership o autorización           | `MEDIA` | adaptar    | Alta  |
| TECH-GAP-12                                                                                         | `npm run lint` reporta 41 errores y 13 warnings.                                                                                                                                                                                                                                                                                                                                                   | Calidad estática                                         | `PARCIAL`             | Reduce la señal de regresión y oculta defectos locales    | `MEDIA` | adaptar    | Alta  |
| TECH-GAP-13                                                                                         | Existen lecturas N+1/no paginadas, por ejemplo mapeo individual de usuarios y listados completos. [httpApi.js (line 104)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/httpApi.js:104)                                                                                                                                                                           | Escalabilidad técnica                                    | `PARCIAL`             | Latencia/costo creciente con grupos y torneos grandes     | `MEDIA` | adaptar    | Media |
| TECH-GAP-14                                                                                         | El cron fija `lock` en una transacción y aplica estadísticas después; una caída intermedia puede dejar el partido bloqueado. [onMatchStart.js (line 34)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/triggers/onMatchStart.js:34)                                                                                                                               | Recuperabilidad de procesos                              | `PARCIAL`             | Requiere reparación operativa y puede detener cierres     | `MEDIA` | adaptar    | Media |

# 15. HALLAZGOS BAJOS

| IDDescripción y evidenciaDecisión afectadaEstado actualImpactoSeveridadIntervención probableCerteza |                                                                                                                                                                                                                                                                          |                                  |                       |                                                        |        |         |      |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | --------------------- | ------------------------------------------------------ | ------ | ------- | ---- |
| TECH-GAP-15                                                                                         | README y documentos históricos describen `User` como identidad más preferencias y `Group` como torneo recurrente. [README.md (line 18)]\(/C:/Users/Rodolfo/Documents/projectoVoley/README.md:18)                                                                         | Terminología y trazabilidad      | `CONTRADICTORIO`      | Puede inducir decisiones basadas en el modelo anterior | `BAJA` | retirar | Alta |
| TECH-GAP-16                                                                                         | Existen dos tipos `UserDoc`, uno con `any`. [User.ts (line 5)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/types/User.ts:5), [UserDoc.ts (line 3)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/types/UserDoc.ts:3) | Fuente única de modelos técnicos | `LEGADO REUTILIZABLE` | Inconsistencias locales de tipado                      | `BAJA` | adaptar | Alta |
| TECH-GAP-17                                                                                         | Hay un esquema SQL de push no usado, una dependencia raíz aislada y un archivo residual. [push\_subscriptions.sql (line 1)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-system/functions/src/db/push\_subscriptions.sql:1)                                 | Higiene del repositorio          | `LEGADO REUTILIZABLE` | Ambigüedad sobre infraestructura vigente               | `BAJA` | retirar | Alta |

# 16. OBSERVACIONES NO BLOQUEANTES

| IDDescripciónEvidenciaEstado actualSeveridadIntervención probableCerteza |                                                                                                                          |                                                                                                                                                                     |                   |                 |         |      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------- | ------- | ---- |
| TECH-GAP-18                                                              | No existen Temporada, Club, Entrenamiento, asistencia ni Observación Técnica. Es ausencia, no contradicción.             | Búsquedas globales sin coincidencias                                                                                                                                | `NO IMPLEMENTADO` | `NO BLOQUEANTE` | adaptar | Alta |
| TECH-GAP-19                                                              | No existen Plan, Suscripción comercial ni evaluación de límites comerciales. Las suscripciones encontradas son Web Push. | Búsquedas globales y [pushNotifications.ts (line 29)]\(/C:/Users/Rodolfo/Documents/projectoVoley/volley-ranking-frontend/src/services/push/pushNotifications.ts:29) | `NO IMPLEMENTADO` | `NO BLOQUEANTE` | adaptar | Alta |
| TECH-GAP-20                                                              | No hay pipeline CI, script explícito de typecheck ni verificación de arquitectura.                                       | Inventario global de archivos/configuración                                                                                                                         | `NO IMPLEMENTADO` | `NO BLOQUEANTE` | adaptar | Alta |

# 17. ACTIVOS REUTILIZABLES

| ActivoUbicaciónValor actualCondiciones para reutilizarlo |                                                                                                                                     |                                               |                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| Frontend Next.js                                         | `volley-ranking-frontend`                                                                                                           | Navegación, layouts y componentes funcionales | Sustituir dependencias directas de persistencia donde corresponda |
| Firebase Auth                                            | Cliente + trigger                                                                                                                   | Login e identidad digital                     | Separar Usuario de Persona y retirar rol autoasignable            |
| Modelo de Partido social                                 | `matches` y servicios                                                                                                               | Convocatoria, estados y cierre                | Agregar referencias normativas y sacar Pago/Rendimiento           |
| Ranking/reemplazos                                       | Servicios backend                                                                                                                   | Algoritmos operativos probados por uso        | Tratar insumos/salidas como capacidades derivadas                 |
| Generador de equipos                                     | `teamsService.js`                                                                                                                   | Equipo subordinado al partido                 | Mantenerlo como concepto no agregado                              |
| Núcleo de Torneos                                        | Servicios y tipos                                                                                                                   | Fases, fixture, standings y avance            | Desacoplar resultado de Partido y pagos                           |
| Namespace de tipos Torneo                                | `src/types/tournaments`                                                                                                             | Diferencia explícita Match/TournamentMatch    | Separar el DTO competitivo del resultado original                 |
| API de grupos                                            | `httpApi.js`                                                                                                                        | Flujos de incorporación y administración      | Cambiar arrays por contratos de Membresía/Solicitud               |
| Alertas pendientes                                       | Triggers y subcolecciones                                                                                                           | Proyección útil para dashboard                | Mantenerlas derivadas y reconstruibles                            |
| Notificaciones push/correo                               | Servicios backend                                                                                                                   | Integración reutilizable                      | Dotarla de entrega recuperable donde sea requerido                |
| Reglas e índices Firestore                               | Backend Firebase                                                                                                                    | Punto de control central                      | Rehacer política de lectura y roles                               |
| Emuladores                                               | `firebase.json`                                                                                                                     | Entorno local ya configurado                  | Incorporarlos a pruebas seguras                                   |
| Auditoría previa                                         | [auditoria-plataforma-2026-07-29.md (line 1)]\(/C:/Users/Rodolfo/Documents/projectoVoley/docs/auditoria-plataforma-2026-07-29.md:1) | Confirma problemas de seguridad/tooling       | Reconciliar con la arquitectura congelada                         |

# 18. COMPONENTES A ADAPTAR, MIGRAR, REEMPLAZAR O RETIRAR

| ComponenteSituaciónIntervención probableMotivoPrioridad |                                    |            |                   |            |
| ------------------------------------------------------- | ---------------------------------- | ---------- | ----------------- | ---------- |
| Callable `updateUserRole` y onboarding                  | Escalamiento de privilegios        | reemplazar | TECH-GAP-01       | Bloqueante |
| Reglas Firestore                                        | Lectura pública excesiva           | reemplazar | TECH-GAP-02       | Bloqueante |
| Documento `users`                                       | Mezcla Usuario/Persona/Rendimiento | migrar     | TECH-GAP-03/07    | Alta       |
| Arrays de grupo                                         | Membresía y solicitudes embebidas  | migrar     | TECH-GAP-04       | Alta       |
| `recordMatchResult`                                     | UoW Torneo-Partido compartida      | reemplazar | TECH-GAP-05       | Alta       |
| Campos de pago                                          | Tres fuentes embebidas/duplicadas  | migrar     | TECH-GAP-06       | Alta       |
| Acceso Firestore desde servicios/UI                     | Acoplamiento estructural           | encapsular | TECH-GAP-08/09    | Media      |
| EventEmitter                                            | Contrato útil, entrega volátil     | adaptar    | TECH-GAP-10       | Media      |
| Tooling y tests                                         | Cobertura inexistente/lint fallido | adaptar    | TECH-GAP-11/12/20 | Media      |
| Consultas N+1                                           | Escalabilidad limitada             | adaptar    | TECH-GAP-13       | Media      |
| Documentación histórica                                 | Modelo anterior                    | retirar    | TECH-GAP-15       | Baja       |
| Tipos duplicados                                        | Fuente ambigua                     | adaptar    | TECH-GAP-16       | Baja       |
| SQL/residuos                                            | Sin consumidor vigente             | retirar    | TECH-GAP-17       | Baja       |

# 19. ESTADO DE PRUEBAS Y VERIFICACIONES

| VerificaciónComandoResultadoLimitaciones |                                                                                            |                                                                            |                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Estado Git inicial/final                 | `git -c safe.directory='C:/Users/Rodolfo/Documents/projectoVoley' status --short --branch` | Limpio: `## dev...origin/dev`                                              | `safe.directory` se aplicó sólo al comando                                                                   |
| Documentos ignorados                     | `git ... status --ignored --short -- audit-baseline`                                       | `!! audit-baseline/`                                                       | Ninguna                                                                                                      |
| Lectura de PDF                           | `pdftotext.exe -layout -enc UTF-8 <pdf> <temp>\*.txt`                                      | 5/5 documentos, 277 páginas                                                | Temporales fuera del repo                                                                                    |
| Inventario/ausencias                     | `rg --files`, `rg -n -i <conceptos> ...`                                                   | Colecciones y capacidades reconstruidas; ausencias verificadas globalmente | Excluyó `node_modules`, `.next` y baseline                                                                   |
| Tests existentes                         | Búsqueda `*.test.*`, `*.spec.*`, `__tests__`                                               | 0 archivos                                                                 | No hay suite                                                                                                 |
| TypeScript                               | `npx tsc --noEmit --incremental false`                                                     | Exit 0                                                                     | Lee tipos preexistentes de `.next`; no emitió                                                                |
| Lint                                     | `npm run lint`                                                                             | Exit 1: 54 problemas, 41 errores y 13 warnings                             | Primer intento sufrió `EPERM` del sandbox; el resultado citado es la repetición autorizada fuera del sandbox |
| Sintaxis backend                         | Bucle `node --check` sobre `index.js`, `callables` y `src`                                 | 85/85 archivos aprobaron                                                   | Comprueba sintaxis, no comportamiento                                                                        |
| Test backend                             | No ejecutado                                                                               | Script es `echo "Error: no test specified" && exit 1`                      | No representa una prueba real                                                                                |
| Build frontend                           | No ejecutado                                                                               | —                                                                          | `next build` escribe en `.next`; no se garantizaba sólo lectura                                              |
| Seeds/migraciones/backfill               | No ejecutados                                                                              | —                                                                          | Podrían escribir datos                                                                                       |
| Firebase/emuladores                      | No ejecutados                                                                              | —                                                                          | Requerirían procesos y posible estado local                                                                  |

Los `.tsbuildinfo` existentes son anteriores a la auditoría y están ignorados. No se generaron cambios Git.

# 20. RIESGOS DE TRANSICIÓN

| RiesgoProbabilidadImpactoEvidenciaMomento en que debe resolverse |       |         |                               |                                                    |
| ---------------------------------------------------------------- | ----- | ------- | ----------------------------- | -------------------------------------------------- |
| Escalamiento a administrador                                     | Alta  | Crítico | TECH-GAP-01                   | Antes de cualquier expansión o despliegue sensible |
| Exposición pública de datos                                      | Alta  | Crítico | TECH-GAP-02                   | Antes de operar con datos reales adicionales       |
| Datos reales difíciles de separar entre Usuario y Persona        | Alta  | Alto    | TECH-GAP-03                   | Antes de definir migraciones                       |
| Pérdida de historia al extraer Membresía/Solicitud de arrays     | Alta  | Alto    | TECH-GAP-04                   | Al definir modelo de coexistencia                  |
| Doble resultado o standings inconsistentes durante CU-075        | Media | Alto    | TECH-GAP-05                   | Antes de separar Partido/Torneo                    |
| Pagos duplicados/inconciliables                                  | Alta  | Alto    | TECH-GAP-06/09                | Antes de introducir Pago                           |
| Regresiones sin tests                                            | Alta  | Alto    | TECH-GAP-11                   | Antes de cambiar ownership                         |
| Eventos/notificaciones perdidos                                  | Media | Medio   | TECH-GAP-10                   | Antes de exigir entrega confiable                  |
| Consultas costosas con crecimiento                               | Media | Medio   | TECH-GAP-13                   | Antes de escalar volumen                           |
| Forma real de datos desconocida                                  | Alta  | Alto    | Auditoría sólo de repositorio | Antes de cerrar el plan de migración               |
| Documentación histórica confundida con norma                     | Media | Medio   | TECH-GAP-15                   | Al consolidar insumos del plan                     |

# 21. DECISIONES TÉCNICAS ABIERTAS

## A. Necesarias antes de planificar la transición

- Confirmar forma, volumen y variantes de los documentos reales desplegados.
- Determinar qué datos son públicos, privados o restringidos por membresía.
- Definir la correspondencia inicial entre `users`, Usuario normativo y Persona.
- Determinar cómo identificar pagos actuales duplicados y cuál copia es confiable.
- Confirmar si existen integraciones o datos externos no presentes en el repositorio.
- Establecer si los dos bloqueantes de seguridad se contienen antes o como primera condición del trabajo.

## B. Necesarias durante la planificación

- Estrategia de coexistencia entre colecciones actuales y agregados objetivo.
- Identificadores y referencias entre Usuario, Persona, Membresía y Temporada.
- Ventanas de compatibilidad para frontend y Functions.
- Tratamiento de datos históricos sin inventar Temporadas inexistentes.
- Frontera pública entre Torneos y Partidos para CU-075.
- Mecanismo de reconciliación e idempotencia de la coordinación.
- Criterios de migración, rollback y retiro de estructuras antiguas.
- Cobertura mínima de pruebas previa a cada cambio de ownership.

## C. Resolubles durante implementación

- Forma física concreta de repositorios/adaptadores.
- Organización interna de carpetas y módulos.
- DTOs, validadores y versionado de contratos.
- Índices Firestore adicionales.
- Paginación y optimización de consultas.
- Consolidación de tipos duplicados.
- Limpieza de documentación y archivos residuales.

## D. Futuras

- Topología final de despliegue.
- Proveedor o mecanismo de observabilidad.
- Estrategia de escalado más allá de los volúmenes conocidos.
- Evolución del canal de eventos para colaboraciones que no exijan coordinación durable.

# 22. READINESS PARA PLANIFICACIÓN

| DimensiónEvaluaciónJustificación |                           |                                                                       |
| -------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| Comprensión del repositorio      | `LISTO`                   | Aplicaciones, rutas, funciones, scripts y documentación inventariados |
| Modelo de datos actual           | `LISTO CON OBSERVACIONES` | Colecciones y ownership reconstruidos; faltan datos reales            |
| Límites funcionales              | `LISTO CON OBSERVACIONES` | Los límites actuales y normativos están identificados                 |
| Ownership                        | `LISTO CON OBSERVACIONES` | Las contradicciones están localizadas y trazadas                      |
| Dependencias                     | `LISTO`                   | Accesos directos y coordinación compartida identificados              |
| Seguridad                        | `NO LISTO`                | Persisten dos bloqueantes comprobados                                 |
| Pruebas                          | `NO LISTO`                | No existe suite y el lint falla                                       |
| Capacidad de migración           | `LISTO CON OBSERVACIONES` | Hay activos reutilizables, pero falta perfilar los datos reales       |
| Trazabilidad normativa           | `LISTO`                   | Los 21 conceptos y casos representativos fueron contrastados          |

Readiness general para planificar: **LISTO CON OBSERVACIONES**. Readiness para ejecutar cambios inmediatamente: **NO LISTO**, por seguridad, datos reales desconocidos y ausencia de pruebas.

# 23. INSUMOS PARA EL PLAN DE IMPLEMENTACIÓN

## Restricciones comprobadas

- Mantener los 13 agregados y sus ownership congelados.
- No convertir Plan, Equipo, Fixture, Estadística, Actividad o Seguimiento Deportivo en agregados.
- Separar Partido/Torneo, Deportivo/Comercial y Usuario/Suscripción.
- Preservar el resultado original en Partido.
- No tratar las colecciones Firestore actuales como agregados por defecto.
- Conservar compatibilidad con los datos actuales durante la transición.

## Activos reutilizables

- Frontend y navegación.
- Firebase Auth y emuladores.
- Flujos de grupos y partidos sociales.
- Ranking, reemplazos y equipos.
- Núcleo de Torneos, fases, fixture y standings.
- Alertas, correo y push.
- Callables como base de contratos públicos.

## Brechas que deberá resolver el plan

- TECH-GAP-01 a TECH-GAP-20, respetando sus severidades.
- Usuario/Persona.
- Membresía/Solicitud/Temporada.
- Resultado Partido/Torneo.
- Pago independiente.
- Rendimiento derivado.
- Comercial y límites.
- Seguridad, pruebas y contratos.

## Dependencias de orden

- Seguridad antes de ampliar exposición.
- Perfilado de datos antes de cerrar migraciones.
- Contratos antes de cambiar persistencia.
- Pruebas antes de separar fuentes de verdad.
- Identidad/Persona antes de Membresía.
- Membresía/Temporada antes de adaptar inscripciones y participación.
- Partido público antes de sustituir CU-075.
- Pago antes de retirar estados embebidos.
- Comercial antes de exigir límites en recursos deportivos.

## Riesgos que requieren mitigación

- Privilegios y exposición de datos.
- Duplicación de pagos.
- Falta de historial de membresía/temporada.
- Regresiones sin tests.
- Datos desplegados heterogéneos.
- Coordinaciones y eventos no recuperables.

## Preguntas no respondibles desde el repositorio

- Volumen y forma exacta de los datos productivos.
- Existencia de usuarios sin onboarding o documentos incompletos.
- Qué copia de pagos duplicados se considera jurídicamente/operativamente válida.
- Política de privacidad esperada por tipo de información.
- Integraciones externas no versionadas.
- Necesidades reales de retención, auditoría y conciliación.
- Límites comerciales concretos por Plan.

# 24. RECOMENDACIÓN FINAL

> ¿El estado técnico actual permite pasar a la planificación de implementación?

**Sí.** Permite pasar a planificación porque el sistema actual, sus fuentes de verdad, dependencias, activos reutilizables y contradicciones normativas ya están suficientemente identificados.

El siguiente paso concreto debe ser elaborar el plan de implementación —y posteriormente el Documento 5— tomando esta auditoría como línea base, después de perfilar los datos reales y estableciendo TECH-GAP-01 y TECH-GAP-02 como condiciones de seguridad prioritarias. No debe iniciarse todavía una migración de dominio sin esa validación de datos y sin una cobertura mínima de regresión.