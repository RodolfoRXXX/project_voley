# E0-04 — Política mínima de lectura

**Proyecto:** SPORTEXA  
**Fecha:** 16 de agosto de 2026  
**Alcance:** contención de TECH-GAP-02; no implementa el modelo definitivo de Usuario, Persona, Membresía o Comercial.  
**Veredicto:** **COMPLETADO CON OBSERVACIONES — pendiente de revisión y versionado**

## 1. Precondiciones

| Control | Evidencia | Resultado |
| --- | --- | --- |
| Rama | `chore/etapa-0-estabilizacion` | Cumplido |
| Commit inicial | `2fdfe8b137c4e831b7e1d2e4ecc89a94c5385104` | Registrado |
| E0-03 versionado | Commit `2fdfe8b` (`security(etapa-0): contener autopromocion E0-03`) | Cumplido |
| Estado inicial | Árbol Git limpio | Cumplido |
| Baseline previo | `npm test`: guardas 9/9 y suite de emuladores 9/9 | Cumplido |
| `.secret.local` | Ignorado, no versionado y copia local preservada | Cumplido |
| Firebase | `demo-sportexa-e0-02`, hosts loopback y emuladores | Cumplido |

No se leyó ni copió el `.secret.local` real, no se usó `.firebaserc` y no se accedió a un proyecto Firebase remoto.

## 2. Exposición encontrada

Las reglas iniciales contenían `allow read: if true` sobre trece colecciones raíz:

1. `users`;
2. `groups`;
3. `matches`;
4. `participations`;
5. `teams`;
6. `groupStats`;
7. `tournaments`;
8. `tournamentPhases`;
9. `tournamentRegistrations`;
10. `tournamentTeams`;
11. `tournamentMatches`;
12. `tournamentStandings`;
13. `tournamentAdvancementRules`.

`users/{uid}/pendingAlerts` ya estaba limitado al propietario y `push_subscriptions` estaba denegado. El wildcard final también negaba cualquier colección no declarada.

La exposición pública incluía:

- correos, roles globales, posiciones preferidas y compromiso en `users`;
- owners, administradores, integrantes y solicitudes pendientes en `groups`;
- deadlines y locks internos en `matches`;
- identidad, ranking y estado de pago en `participations`;
- IDs de jugadores en `teams`;
- rendimiento individual en `groupStats`;
- precios, configuración y administradores en `tournaments`;
- jugadores, montos, verificadores y estados de pago en registros y equipos de torneo;
- estructura competitiva todavía no marcada para publicación en fases, partidos, standings y reglas de avance.

El inventario de código no encontró otras colecciones utilizadas. Tampoco encontró Plan o Suscripción comercial; `push_subscriptions` pertenece exclusivamente a Web Push y continúa completamente denegada para clientes.

## 3. Marcadores y representaciones públicas

| Recurso | Marcador existente | ¿Documento completo seguro? | Decisión |
| --- | --- | --- | --- |
| Grupo | `visibility == "public"` | No; mezcla publicación con ownership, membresía y solicitudes | Mantener documento privado y usar proyección HTTP sanitizada |
| Partido social | `visibility == "public"` | No; mezcla datos compartibles con locks/deadlines y depende de participaciones con ranking/pagos | Mantener privado hasta crear proyección aprobada |
| Torneo | Sólo `status` de ciclo de vida | No; no es un consentimiento de publicación y mezcla precio/administración | Mantener privado |
| Fases, fixture y standings | Sin marcador inequívoco | No | Mantener privados |
| Usuario | Sin marcador de publicación | No | Identidad propia o administración temporal |

El estado `activo`, `finalizado` o similar no se reinterpretó como autorización de publicación. No se inventó una regla funcional para conservar las pantallas públicas.

La única representación pública vigente y reutilizable era `GET /api/groups/public`. Se redujo para devolver sólo:

- identificador, nombre y descripción del grupo publicado;
- visibilidad, política de incorporación y estado activo;
- cantidad de integrantes;
- cantidad de partidos cuyo propio marcador es público;
- estado de pertenencia del solicitante (`none`, `pending` o `member`).

La proyección ya no devuelve identidad del owner, correos, posiciones, `ownerId`, `memberIds`, `adminIds` ni IDs de solicitudes.

## 4. Matriz actor–recurso

| Recurso | Visitante | Autenticado ajeno | Owner/Admin/Integrante | Información sensible | Decisión |
| --- | --- | --- | --- | --- | --- |
| `users/{uid}` | Denegado | Sólo documento propio | Administrador global legado conserva lectura temporal | Email, rol, deportivo, compromiso | Privado por defecto |
| `pendingAlerts` | Denegado | Sólo subcolección propia | Sólo owner del usuario | Alertas operativas | Sin cambio |
| `groups` directo | Denegado, incluso si `public` | Denegado si no pertenece | Owner/admin/integrante; admin global temporal | IDs y solicitudes | Acceso contextual |
| Proyección HTTP de grupos | Sólo grupos `public` sanitizados | Igual, más estado propio sin IDs | Igual | Sin campos privados | Pública explícita |
| `matches` | Denegado, incluso si `public` | Denegado si no pertenece | Integrante/admin del grupo; admin global temporal | Deadlines y locks | Contextual; proyección futura |
| `participations` | Denegado | Sólo participación propia | Admin/owner del grupo puede gestionar | Ranking y pago | Propio o administración contextual |
| `teams` | Denegado | Sólo integrante del grupo | Integrante/admin del grupo | IDs de jugadores | Contextual |
| `groupStats` | Denegado | Sólo rendimiento propio | Admin/owner del grupo | Rendimiento individual | Propio o administración contextual |
| `tournaments` | Denegado | Denegado sin administración | Admin/owner del torneo; admin global temporal | Precio y administración | Privado; sin publicación aprobada |
| `tournamentPhases` | Denegado | Denegado | Admin del torneo | Configuración interna | Privado contextual |
| `tournamentRegistrations` | Denegado | Participante explícito | Admin del torneo o grupo | Pagos e IDs | Contextual |
| `tournamentTeams` | Denegado | Participante explícito | Admin del torneo o grupo | Pagos e IDs | Contextual |
| `tournamentMatches` | Denegado | Denegado | Admin del torneo | Estructura competitiva | Privado contextual |
| `tournamentStandings` | Denegado | Denegado | Admin del torneo | Estado competitivo | Privado contextual |
| `tournamentAdvancementRules` | Denegado | Denegado | Admin del torneo | Reglas internas | Privado contextual |
| `push_subscriptions` | Denegado | Denegado | Denegado al cliente | Endpoint y claves push | Sin cambio |
| Cualquier otra ruta | Denegado | Denegado | Denegado | Desconocida | Denegación por defecto |

El rol global `users.roles == "admin"` se conserva sólo como compatibilidad temporal para las pantallas administrativas existentes. No se amplió, no se expuso al cliente y no se presenta como autorización definitiva. No existe ninguna regla basada en Plan.

## 5. Política aplicada

Las reglas incorporan funciones mínimas para comprobar:

- identidad propia;
- pertenencia, administración u ownership a partir de los arrays y campos actuales de Grupo;
- administración del Torneo a partir de sus campos existentes;
- relación de una participación con su Partido y Grupo;
- participación explícita mediante `playerIds`;
- rol administrativo global sólo como excepción temporal de compatibilidad.

Los campos opcionales de documentos legados se leen con defaults seguros. En las consultas de Grupo se separaron `get` y `list`: las listas sólo aprueban si la consulta permite demostrar `memberIds`, `adminIds` u `ownerId`, o si corresponde al administrador global temporal.

Se preservaron sin cambios las protecciones de escritura de E0-03 y las reglas de actualización existentes para registros/equipos de torneo.

## 6. Consultas frontend adaptadas

### Grupos públicos

Se retiró el listener directo sobre `groups`, que permitía leer arrays completos de integrantes, administradores y solicitudes. La pantalla usa exclusivamente la proyección HTTP sanitizada y conserva sólo `membershipStatus` y contadores agregados.

### Portada

Se retiraron las consultas públicas directas de partidos, grupos y torneos. Permanecen vacías hasta contar con proyecciones públicas aprobadas. La proyección de grupos continúa disponible desde su pantalla específica.

### Partido público

El detalle público dejó de consultar `matches`, `groups`, `participations` y `users`. Muestra una indisponibilidad temporal explícita porque no existe una representación que separe partido publicable, identidades, ranking y pagos.

### Torneos públicos

`getPublicActiveTournaments` y `getPublicTournamentDetailView` dejan de consultar Firestore y devuelven una colección vacía o `null`. `status` no se utilizó como sustituto silencioso de un marcador de publicación.

Las consultas protegidas que ya incluyen `array-contains`, `ownerId`, `groupId`, `tournamentId`, `playerIds` o `userId` permanecieron disponibles cuando las reglas pueden demostrar el mismo contexto. Las consultas generales incompatibles fallan de forma cerrada.

## 7. Pruebas positivas y negativas

La nueva prueba `minimumReadPolicy.test.js` crea cuatro usuarios y recursos deterministas sintéticos en todas las familias relevantes.

| Caso | Resultado |
| --- | --- |
| Visitante lee identidad, grupo/partido público o privado, participación, torneo o pago | Rechazado |
| Visitante lista grupos directamente | Rechazado |
| Visitante obtiene proyección de grupo publicado | Permitido y sanitizado |
| Grupo privado aparece en la proyección pública | No aparece |
| Usuario lee su identidad | Permitido |
| Usuario lee identidad ajena | Rechazado |
| Owner/integrante lee su grupo y partido | Permitido |
| Usuario ajeno lee grupo o partido público/privado | Rechazado |
| Participante lee su participación/pago | Permitido |
| Integrante lee participación ajena | Rechazado |
| Admin contextual lee participación | Permitido |
| Usuario lee su `groupStats` | Permitido |
| Usuario ajeno lee `groupStats` | Rechazado |
| Admin de torneo lee torneo | Permitido |
| Participante sin administración lee documento completo de torneo | Rechazado |
| Admin de grupo o jugador explícito lee registro de torneo | Permitido |
| Usuario ajeno lee registro/pago | Rechazado |
| Lista general de participaciones | Rechazada |
| Consulta de grupos con `memberIds array-contains uid` | Permitida |
| Consulta de participaciones con `userId == uid` | Permitida |
| Administrador global legado lista usuarios | Permitido temporalmente |
| Cliente intenta modificar `roles` | Rechazado; regresión E0-03 |

Los datos se eliminan en `finally`; los emuladores y workspaces temporales también se destruyen al finalizar.

## 8. Aislamiento de secretos y Firebase

Para invocar la Function HTTP que produce la vista pública fue necesario satisfacer las declaraciones `runWith({ secrets })`. El primer intento intentó resolver Secret Manager y falló por ausencia de autenticación; el proxy cerrado impidió el acceso.

La corrección de infraestructura:

1. excluye y verifica la ausencia del `.secret.local` real al copiar Functions;
2. genera un par VAPID efímero en memoria;
3. crea dentro del workspace temporal un `.secret.local` exclusivamente sintético con correo reservado, contraseña ficticia, URL loopback y VAPID efímero;
4. elimina el workspace completo al finalizar.

La repetición no intentó Secret Manager y ninguna credencial real fue leída, copiada o mostrada.

## 9. Recursos privados pendientes de representación segura

- detalle público de Partido y sus participantes;
- catálogo y detalle público de Torneo;
- fases, fixture, equipos publicados y standings;
- perfiles públicos mínimos de personas, si el producto decide incorporarlos;
- conteos o nombres de administradores fuera de un contexto autorizado.

Su indisponibilidad no bloquea la contención: mantenerlos privados es el comportamiento seguro requerido hasta una decisión funcional y un contrato de proyección aprobados.

## 10. Archivos modificados

- `volley-ranking-system/firestore.rules`;
- `volley-ranking-system/functions/src/httpApi.js`;
- `volley-ranking-system/functions/test/run-emulator-tests.js`;
- `volley-ranking-system/functions/test/emulator/minimumReadPolicy.test.js` (nuevo);
- `volley-ranking-frontend/src/app/page.tsx`;
- `volley-ranking-frontend/src/app/(public)/groups/page.tsx`;
- `volley-ranking-frontend/src/app/(public)/groups/[groupId]/matches/[matchId]/page.tsx`;
- `volley-ranking-frontend/src/services/tournaments/tournamentQueries.ts`;
- este informe (nuevo).

No se modificaron dependencias, lockfiles, índices, ownership, fuentes de verdad ni datos reales.

## 11. Resultados

| Verificación | Resultado | Comparación |
| --- | --- | --- |
| `npm test` | **APRUEBA** | Guardas/runner 9/9; emuladores 18/18 |
| Casos E0-04 | **APRUEBAN 8/8** | Nueva cobertura de get, list, API y reglas |
| Regresión E0-03 | **APRUEBA** | Suite completa y caso de escritura privilegiada |
| Typecheck | **APRUEBA**, exit 0 | Sin regresión |
| Build | **APRUEBA**, exit 0 | 18 páginas generadas |
| Sintaxis Functions | **APRUEBA 91/91** | 90 previos más la nueva prueba |
| Lint | **FALLA**: 41 errores y 13 warnings | Exactamente el baseline; sin regresión |
| `git diff --check` | **APRUEBA** | Sin errores de whitespace |

La primera suite E0-04 detectó dos fallos de infraestructura/política y falló cerrada: acceso a campos opcionales legados y resolución de secretos declarados por la Function HTTP. Ambos quedaron corregidos y la suite completa posterior aprobó.

## 12. Deuda diferida

- Definir contratos y almacenamiento de proyecciones públicas para Partido y Torneo.
- Separar información pública, identidad privada, datos deportivos y pagos durante las migraciones aprobadas posteriores.
- Reemplazar la excepción del rol administrativo global por autorización contextual definitiva.
- Adaptar gradualmente pantallas protegidas que aún esperan documentos mixtos completos cuando su contexto no pueda demostrarse mediante reglas.
- Auditar y probar reglas desplegadas sólo cuando se autorice la futura verificación remota; no se desplegó E0-04.
- Versionar el diff después de revisión; no se hizo commit ni push.

## 13. Criterios de cierre y veredicto

| Criterio | Evidencia | Estado |
| --- | --- | --- |
| Sin lecturas públicas generales | No quedan `allow read/get/list: if true` | Cumplido |
| Privado por defecto | Wildcard denegado y documentos mixtos cerrados | Cumplido |
| Identidad propia | Prueba positiva propia y negativa ajena | Cumplido |
| Publicación explícita | Únicamente proyección de `groups.visibility == public` | Cumplido |
| Acceso contextual existente | Grupos, partidos, pagos y torneos probados | Cumplido |
| Consultas compatibles con reglas | Casos positivos acotados y listas generales negativas | Cumplido |
| Pagos e información interna protegidos | Pruebas de participación y registros de torneo | Cumplido |
| E0-03 preservado | Suite anterior y regresión explícita | Cumplido |
| Sin Plan como permiso | No existe regla ni dato de Plan | Cumplido |
| Sin Firebase remoto ni secretos reales | Proyecto demo, emuladores y secretos temporales sintéticos | Cumplido |
| Cambios versionados | Prohibido hacer commit/push durante esta intervención | Pendiente de revisión autorizada |

**COMPLETADO CON OBSERVACIONES — pendiente de revisión y versionado.**

TECH-GAP-02 queda contenido en el repositorio local: ninguna colección es públicamente legible por defecto, la identidad ajena y los pagos están cerrados, el acceso autenticado exige contexto comprobable y la única proyección pública conserva exclusivamente datos sanitizados de grupos explícitamente publicados.

El siguiente incremento recomendado, sin ejecutarlo, es **E0-05 — Caracterización de activos prioritarios**. Antes debe revisarse y versionarse este diff en la rama de Etapa 0.
