# E0-05 — Caracterización de activos prioritarios

**Proyecto:** SPORTEXA

**Fecha:** 16 de agosto de 2026

**Rama:** `chore/etapa-0-estabilizacion`

**Commit inicial:** `3df3fab2e4f615cb4c2673cc9b9908474ccaea06`

**Alcance:** pruebas de caracterización; no modifica lógica productiva, reglas ni modelos persistentes.

**Veredicto:** **COMPLETADO CON OBSERVACIONES — pendiente de revisión y versionado**

## 1. Precondiciones y aislamiento

| Control | Evidencia | Resultado |
| --- | --- | --- |
| Rama | `chore/etapa-0-estabilizacion` | Cumplido |
| E0-04 versionado | Commit `3df3fab` (`security(etapa-0): aplicar politica minima de lectura E0-04`) | Cumplido |
| Estado inicial | `git status --short --branch` sin cambios | Cumplido |
| Suite inicial | `npm test` en `volley-ranking-system/functions`: guardas 9/9 y emuladores 18/18 | Cumplido |
| Proyecto | `demo-sportexa-e0-02` | Cumplido |
| Servicios | Auth, Firestore y Functions Emulator sobre `127.0.0.1` | Cumplido |
| Secretos | Workspace temporal sin el `.secret.local` real y archivo temporal con valores sintéticos | Cumplido |
| Firebase remoto | Proxy no local bloqueado, alias remoto no utilizado y proyecto `demo-*` | Cumplido |

El intento de ejecutar `npm test` desde `volley-ranking-system` falló porque ese directorio no posee `package.json` ni script. El comando canónico documentado desde E0-02 es:

```bash
cd volley-ranking-system/functions
npm test
```

La primera ejecución de emuladores y el primer build dentro del sandbox fallaron por `EPERM` al intentar abrir puertos locales. Las repeticiones autorizadas fuera de esa restricción son la evidencia válida. Firebase CLI identificó explícitamente el proyecto demo y afirmó que los servicios no emulados fallarían.

## 2. Criterio de clasificación

- **A — Normativamente correcto:** puede protegerse como contrato.
- **B — Legado tolerado:** se protege temporalmente hasta su migración.
- **C — Defecto o contradicción conocida:** se documenta, pero no se aprueba como contrato objetivo.
- **D — Indisponible por contención de seguridad:** suspendido por E0-03 o E0-04.
- **E — Capacidad todavía ausente:** no se inventa en esta etapa.

Una fila puede tener más de una letra cuando el flujo contiene un núcleo reutilizable y, a la vez, una representación persistente que debe retirarse. Las pruebas nombran esos casos explícitamente y evitan snapshots masivos.

## 3. Inventario de activos y flujos

### 3.1 Matriz flujo–persistencia–clasificación

| Flujo | Entrada y actor | Autorización y acceso actual | Documentos leídos | Documentos modificados y efectos | Error observable | Clase | Etapa futura |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Autenticación | Alta Firebase Auth; visitante | Firebase Auth; trigger `onUserCreate` | Evento Auth | `users/{uid}`; sincronización posterior de alertas | El alta falla en Auth; el trigger registra el fallo | A/B | Etapa 1 separa Usuario y Persona |
| Onboarding | `posicionesPreferidas`; usuario autenticado | Callable `completeOnboarding`; sólo documento propio; payload cerrado por E0-03 | `users/{uid}` | `onboarded` y campo deportivo legado en `users` | `unauthenticated`, `invalid-argument`, `not-found` | A para completar alta sin privilegios; C para dato deportivo dentro de Usuario | Etapa 1 |
| Crear Grupo | nombre, descripción y configuración; admin global legado | Escritura Firestore directa desde frontend; reglas exigen `roles == admin` y actor dentro de `adminIds` | `users/{uid}` en reglas | `groups`; embebe owner, admins, integrantes y política de ingreso | Reglas deniegan al actor sin rol global | B/C | Etapas 1 y 2 |
| Solicitudes, integrantes y administración de Grupo | join/admin request, aprobar, rechazar, agregar, retirar, reordenar o transferir; usuario o admin contextual | HTTP API y callables de administración; ownership/arrays actuales | `groups`, `users` | Arrays `memberIds`, `adminIds`, `admins`, `pendingRequestIds`, `pendingAdminRequestIds`; alertas | 401/403/404/409 o `HttpsError` según ruta | B/C | Etapa 2 crea Solicitud y Membresía independientes |
| Crear/editar Partido social | configuración, horario y Grupo; admin global y admin de Grupo | Callables `createMatch`/`editMatch`; doble requisito global/contextual | `users`, `groups`, `matches` | `matches`; evento y alertas posteriores | auth, permisos, payload, Grupo inactivo o estado no editable | B | Etapas 1, 2 y 4 |
| Participar en Partido | `matchId`; integrante autenticado | `joinMatch`/`leaveMatch`; membresía embebida del Grupo o admin global | `matches`, `groups`, `users`, `participations` | participación determinista; ranking/estadísticas por triggers | partido inexistente/cerrado/pasado/bloqueado, ajeno o duplicado | B/C | Etapas 1, 2, 3 y 5 |
| Generar equipos sociales | `matchId`; admin global y admin de Grupo | Callable `generarEquipos` | `matches`, `participations`, `users`, `groups` | `teams`, posiciones/ranking derivados | datos insuficientes, estado o permisos | B | Etapas 2, 4 y 5 |
| Crear/administrar Torneo | DTO de torneo; admin global legado | Callables de Torneo; `assertIsAdmin` y `adminIds`/owner contextual | `users`, `tournaments`, fases | batch a `tournaments`, `tournamentPhases` y, para mixto, reglas de avance; eventos | payload, rol, ownership o transición de estado inválida | B/C | Etapas 1 y 4 |
| Inscripción de Grupo | Torneo, Grupo y nombre de equipo; admin de Grupo | `requestTournamentRegistration`; luego revisión por admin global y de Torneo | `groups`, `tournaments`, registro existente | `tournamentRegistrations`, `tournamentTeams`, contador aceptado y alertas | torneo cerrado, pocos integrantes, duplicado, cupo o permisos | B/C | Etapas 2, 3 y 4 |
| Selección de jugadores de inscripción | IDs de jugadores; admin de Grupo | Escritura Firestore directa restringida por reglas | Grupo y registro/equipo | `playerIds`, conteos e importes embebidos | reglas deniegan campos o actor no permitido | C | Etapas 2 y 3 |
| Fixture y fases | preview con seed y confirmación; admin global y de Torneo | `previewFixture`, `confirmGroups`, `confirmFixture` | torneo, fase, equipos aceptados | `tournamentMatches`, seeds de `tournamentStandings`, estado/configuración de fase y Torneo; alertas | cantidad, fase, equipos o fixture inválidos/duplicados | A para generación determinista; B para persistencia actual | Etapa 4 |
| Registro de resultado | sets/puntos/ganador; admin global legado | `recordMatchResult` | partido, torneo, fase, todos los partidos y standings de la fase | en una transacción: resultado, standings, posiciones, fase y llaves; posible avance | empate, ganador o detalle de sets inválido; equipos/fuentes ausentes | C | Etapa 4 separa Partido–Torneo/CU-075 |
| Standings y avance | consecuencia del resultado o `advancePhase`; admin | Servicio de Torneo | partidos, standings, reglas, fases | standings derivados, fase siguiente, llave o finalización | fase incompleta o configuración incompatible | A como derivación; C mientras comparte transacción con resultado original | Etapas 4 y 5 |
| Pago de Partido social | estado; admin global y de Grupo | `updatePagoEstado` | usuario, participación, Partido y Grupo | `participations.pagoEstado` | estado, rol o contexto inválido | C | Etapa 3 |
| Pago de Torneo | jugadores/importes/abono; admin de Grupo o Torneo según operación | escritura directa restringida y `updateTournamentRegistrationPayment` | registro/equipo, Grupo y Torneo | importes y estado duplicados en registro/equipo; verificador y alertas | importe, fuente o permisos inválidos | C | Etapa 3 |
| Vistas públicas | visitante o autenticado | Proyección HTTP sanitizada sólo para Grupos; Firestore directo privado | `groups` y conteo de `matches` dentro de Functions | ninguna fuente de verdad; respuesta proyectada | colección vacía, `null`, 403 o mensaje de indisponibilidad | D | Definir proyecciones aprobadas antes de reabrir; Etapas 4/5 según recurso |

### 3.2 Efectos posteriores relevantes

Los triggers existentes actualizan ranking, estadísticas y `pendingAlerts` después de participaciones, cambios de Torneo, registros, equipos y partidos. La prueba de recorrido observó esos disparos, pero no congela su contenido completo ni su orden temporal. El bus de eventos en memoria y las alertas son efectos secundarios, no fuentes de verdad normativas.

## 4. Pruebas incorporadas

Se agregó `priorityAssetCharacterization.test.js` al runner de emuladores. Usa tres usuarios sintéticos, dos Grupos deterministas, un Partido social y un Torneo de liga de dos equipos.

| Caso nuevo | Efecto observable protegido | Clase |
| --- | --- | --- |
| Auth + onboarding | alta operativa, `onboarded == true` y ausencia de rol privilegiado | A/B; no se aserta ownership deportivo en Usuario |
| Creación de Grupo | admin sintético puede crear por el acceso directo legado; no admin recibe 403 | B/C |
| Partido y participación | callable crea Partido; integrante crea participación determinista | B |
| Pago de Partido | `pagoEstado` cambia dentro de participación | C explícita |
| Creación de Torneo | crea Torneo draft y fases registration/round-robin; no admin es rechazado | B/C |
| Inscripción y pago | dos registros aceptados crean equipos; abono parcial modifica importes embebidos | B/C explícita |
| Fixture | seed fijo `5005`, un partido y dos standings iniciales | A/B |
| Resultado | completa partido/fase y actualiza standings/posiciones en el flujo compartido | C explícita |

Las regresiones de E0-02, E0-03 y E0-04 permanecen en la misma invocación. En particular, la indisponibilidad pública segura continúa demostrada por los casos de E0-04: el visitante no lee documentos directos, la proyección de Grupo está sanitizada y Torneos/Partidos públicos siguen cerrados cuando no existe una proyección aprobada.

## 5. Comportamientos normativos protegidos (A)

- el runner y el aislamiento fallan de forma cerrada ante proyecto, host, credencial o secreto inseguros;
- un onboarding operativo no concede privilegios;
- un actor no autorizado no puede crear Torneos ni Grupos;
- el fixture de liga produce una estructura determinista con un seed explícito;
- standings son una derivación observable del resultado, no la fuente original;
- las lecturas públicas se realizan sólo mediante una representación aprobada y sanitizada.

No se declara normativo que `Usuario` contenga posiciones, que un rol global autorice operaciones deportivas ni que la forma física actual de Grupo, participación, pago o Torneo sea definitiva.

## 6. Legados tolerados (B)

- `roles == "admin"` preparado sólo desde Admin SDK sintético para habilitar recorridos administrativos;
- creación directa de Grupo desde el cliente;
- ownership, admins, integrantes y solicitudes embebidos en Grupo;
- participación determinista y equipos sociales actuales;
- administración de Torneo y sus fases bajo la persistencia vigente;
- inscripción y equipo de Torneo vinculados a los arrays de Grupo;
- triggers de ranking y alertas como efectos temporales.

La preparación administrativa del fixture ocurre fuera del cliente. Ningún caso concede el rol mediante una operación pública.

## 7. Defectos no congelados (C)

- posiciones deportivas dentro de `users`: el test no aserta ese campo como contrato;
- rol global como condición de administración deportiva;
- Membresía y Solicitud representadas por arrays;
- pago de Partido dentro de `participations`;
- importes y pago de Torneo duplicados entre registros/equipos;
- selección de jugadores e importes mediante escritura directa de frontend;
- resultado de `tournamentMatches`, standings, fase y avance modificados dentro del mismo flujo transaccional;
- ausencia de resultado original independiente para Partido social.

Los nombres `[C]` y `[B/C]` de las pruebas hacen visible esta condición. Las aserciones constatan el comportamiento actual necesario para detectar cambios durante la migración, pero el criterio objetivo continúa siendo el de los Documentos 1–5.

## 8. Funcionalidades suspendidas por seguridad (D)

- detalle público de Partido y participantes;
- catálogo y detalle público de Torneo;
- fases, fixture y standings públicos;
- lectura pública directa de documentos mixtos de Grupo;
- cualquier lectura pública de Usuario, participación o pago.

Sólo se conserva la proyección HTTP sanitizada de Grupos explícitamente públicos. E0-05 no intenta recuperar otras vistas ni modifica reglas.

## 9. Capacidades ausentes (E)

- Persona como identidad deportiva;
- Membresía, Solicitud y Temporada independientes;
- Pago deportivo como fuente de verdad propia;
- resultado original independiente de Partido social y contrato Partido–Torneo desacoplado;
- Plan, Suscripción y límites comerciales;
- Entrenamiento, asistencia, Seguimiento Deportivo y Observación Técnica;
- Club;
- proyecciones públicas aprobadas para Partido, Torneo, fixture y standings.

No se incorporó ninguna de estas capacidades.

## 10. Aislamiento, datos y limpieza

El runner:

1. copia reglas, índices, configuración demo y Functions a workspaces temporales;
2. excluye `node_modules`, tests, logs y el `.secret.local` real;
3. enlaza dependencias locales y genera un `.secret.local` temporal con correo reservado, URL loopback y VAPID efímero;
4. conserva sólo variables de entorno explícitas;
5. bloquea proxies no locales y usa `NO_PROXY` sólo para loopback;
6. ejecuta con `--project demo-sportexa-e0-02` y `--only auth,firestore,functions`;
7. limpia usuarios Auth, documentos de prueba y workspaces temporales al finalizar.

Los IDs, emails, contraseñas y datos deportivos son ficticios y deterministas o efímeros. No se leyó `.secret.local`, `.env.local`, `.env.production` ni `.env.staging`; no se usó `.firebaserc`.

## 11. Archivos modificados

- `volley-ranking-system/functions/test/emulator/priorityAssetCharacterization.test.js` — nuevo recorrido de caracterización;
- `volley-ranking-system/functions/test/run-emulator-tests.js` — incorpora el nuevo archivo a la suite y serializa los archivos para evitar saturar el arranque de Functions;
- `docs/implementacion/etapa-0/E0-05-caracterizacion-activos-prioritarios.md` — este informe.

No se modificaron reglas, Functions productivas, frontend, dependencias, lockfiles, índices ni configuración remota.

## 12. Resultados

| Verificación | Resultado | Comparación con E0-04 |
| --- | --- | --- |
| `npm test` en Functions | **APRUEBA**, exit 0 | Guardas 9/9; emuladores 26/26 frente a 18/18 |
| Casos nuevos E0-05 | **APRUEBAN 7/7** | Nueva cobertura de dos recorridos prioritarios |
| Regresiones E0-02/E0-03/E0-04 | **APRUEBAN** | Sin pérdida de aislamiento, contención o lectura mínima |
| Typecheck frontend | **APRUEBA**, exit 0 | Sin regresión |
| Build frontend | **APRUEBA**, exit 0 | 18 páginas; misma advertencia de `caniuse-lite` |
| Sintaxis Functions | **APRUEBA 92/92** | 91 previos más la prueba nueva |
| Lint frontend | **FALLA**: 41 errores y 13 warnings | Exactamente el baseline; sin regresión |
| `git diff --check` | **APRUEBA** | Sin errores de whitespace |

Una repetición concurrente reveló una inestabilidad del runner: al iniciar simultáneamente los usuarios de cuatro archivos, varios triggers `onUserCreate` terminaron después del timeout de las suites previas. Los documentos aparecieron posteriormente, por lo que no fue una regresión funcional. Al interrumpir esa corrida quedó un Firestore Emulator huérfano del mismo proyecto demo; se identificó por PID, argumentos y workspace temporal, se terminó con `SIGTERM` y se comprobaron los puertos liberados. El runner quedó configurado con `--test-concurrency=1`; la ejecución final serializada es la evidencia válida: los 7 casos E0-05 aprobaron en 20,5 segundos y los 26 casos de emuladores en 30 segundos. Los triggers de alertas generan salida de diagnóstico abundante, pero la suite final terminó, limpió los datos sintéticos y cerró los emuladores con exit 0.

## 13. Bloqueantes y división de alcance

No hay un bloqueante para cerrar E0-05. La cobertura representativa solicitada cabe en este incremento porque se priorizaron dos recorridos de alto riesgo en lugar de snapshots o pruebas superficiales por pantalla.

Queda fuera deliberadamente una caracterización exhaustiva de:

- cada transición de Partido social (equipos, cierre, reapertura, eliminación y rotación);
- todos los formatos de Torneo (mixto y eliminación), grupos, byes y múltiples rondas;
- corrección/repetición de resultados y cada criterio de desempate;
- todas las rutas de solicitudes y administración de Grupo;
- contenido y orden exacto de alertas/notificaciones.

Estas variantes deberán incorporarse justo antes del incremento que modifique cada área. No requieren cambios productivos anticipados en E0-05.

## 14. Criterios de cierre

| Criterio | Evidencia | Estado |
| --- | --- | --- |
| Flujos prioritarios inventariados | Matriz de 16 flujos con entrada, actor, acceso, lecturas, escrituras, errores y etapa | Cumplido |
| Clasificación A–E | Secciones 2 y 5–9 | Cumplido |
| Onboarding posterior a E0-03 | Caso positivo sin privilegios | Cumplido |
| Grupo con actor autorizado | Escritura cliente positiva y negativa | Cumplido |
| Partido y participación/equipo | Creación y participación determinista | Cumplido por participación |
| Torneo e inscripción | Creación, apertura, dos inscripciones y aceptación | Cumplido |
| Fixture | Preview con seed y confirmación | Cumplido |
| Resultado y standings/avance | Resultado completa partido/fase y actualiza standings | Cumplido; contradicción C documentada |
| Pago actual | Partido y Torneo embebidos observados | Cumplido; contradicción C documentada |
| Indisponibilidad pública segura | Regresión E0-04 conservada | Cumplido |
| Sin defectos legitimados | No se aserta Usuario como dueño deportivo; C visible en pruebas e informe | Cumplido |
| Sólo emuladores y sintéticos | Guarda, proyecto demo, proxy bloqueado, workspaces temporales | Cumplido |
| Sin cambios productivos | Diff limitado a test, runner e informe | Cumplido |
| Sin regresiones | Tests/typecheck/build/sintaxis aprueban; lint idéntico | Cumplido |
| Cambios versionados | Prohibido hacer commit/push durante esta intervención | Pendiente de revisión autorizada |

## 15. Veredicto y siguiente incremento

**COMPLETADO CON OBSERVACIONES — pendiente de revisión y versionado.**

E0-05 puede cerrarse técnicamente porque existe un inventario clasificado, dos recorridos prioritarios reproducibles, casos positivos y negativos de autorización, evidencia de efectos persistentes, aislamiento estricto y ausencia de regresiones. Las observaciones no son fallas nuevas: corresponden a los legados y contradicciones C que las etapas 1–4 deberán retirar.

El siguiente incremento recomendado, sin ejecutarlo, es **E0-06 — Baseline de calidad**: clasificar la deuda de lint ya medida, establecer la política de no regresión y formalizar las verificaciones obligatorias. Antes debe revisarse y versionarse este diff en la rama de Etapa 0.
