+-----------------------------------------------------------------------+
| **RESUMEN TÉCNICO --- MÓDULO DE TORNEOS**                             |
|                                                                       |
| Arquitectura refactorizada con modelo de fases                        |
|                                                                       |
| Versión 2.0 --- Plataforma de encuentros deportivos                   |
+-----------------------------------------------------------------------+

**1. Resumen ejecutivo de cambios**

El módulo de torneos se reestructura en torno a un concepto central
nuevo: las fases del torneo son entidades de primera clase en la base de
datos, no campos embebidos en el documento del torneo. Este cambio
resuelve la limitación principal del modelo anterior, donde los tres
formatos (liga, eliminación, mixto) compartían la misma estructura de
datos y generaban ramas condicionales en todas las funciones del
backend.

  ------------------------ ----------------------------------------------
  **Qué cambia**           **Detalle**

  Colección nueva          tournamentPhases --- una fase por etapa del
                           torneo

  Colección nueva          tournamentStandings --- tabla de posiciones
                           por fase

  Colección nueva          tournamentAdvancementRules --- reglas de
                           clasificación

  Colección modificada     tournamentMatches --- agrega phaseId y
                           phaseType

  Colección modificada     tournaments --- reemplaza
                           groupStage/knockoutStage por phaseOrder\[\]

  Colección eliminada      tournamentTeams ya no guarda stats (pasan a
                           standings)

  Función nueva            recordMatchResult --- carga resultado y
                           recalcula tabla

  Función nueva            advancePhase --- clasifica equipos y arma la
                           fase siguiente

  Funciones modificadas    previewGroups, confirmGroups, previewFixture,
                           confirmFixture
  ------------------------ ----------------------------------------------

**2. Colecciones del sistema**

**2.1 tournaments**

Sigue siendo la entidad raíz. Los cambios son quirúrgicos: se eliminan
los campos groupStage y knockoutStage embebidos y se reemplaza por un
array phaseOrder que define la secuencia de fases específica para cada
formato. Se agregan currentPhaseType y currentPhaseId para que el
frontend y el backend sepan siempre en qué etapa está el torneo sin
hacer queries adicionales. La config de reglas del deporte se agrupa en
un objeto settings.

+-----------------------------------------------------------------------+
| // tournaments/{tournamentId}                                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| name: \'Copa Verano 2025\',                                           |
|                                                                       |
| sport: \'volleyball\',                                                |
|                                                                       |
| format: \'mixto\', // liga \| eliminacion \| mixto                    |
|                                                                       |
| status: \'activo\',                                                   |
|                                                                       |
| currentPhaseType: \'group_stage\',                                    |
|                                                                       |
| currentPhaseId: \'phase_grp_001\',                                    |
|                                                                       |
| // Reemplaza a groupStage{} y knockoutStage{}                         |
|                                                                       |
| phaseOrder: \[                                                        |
|                                                                       |
| { type: \'registration\', order: 0 },                                 |
|                                                                       |
| { type: \'group_stage\', order: 1 },                                  |
|                                                                       |
| { type: \'knockout\', order: 2 },                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| // Agrupa toda la config de reglas                                    |
|                                                                       |
| settings: {                                                           |
|                                                                       |
| minTeams: 8, maxTeams: 16,                                            |
|                                                                       |
| minPlayers: 6, maxPlayers: 12,                                        |
|                                                                       |
| pointsWin: 3, pointsDraw: 1, pointsLose: 0,                           |
|                                                                       |
| setsToWin: 2,                                                         |
|                                                                       |
| paymentPerPlayer: 1500                                                |
|                                                                       |
| },                                                                    |
|                                                                       |
| ownerAdminId: \'uid_martin\',                                         |
|                                                                       |
| adminIds: \[\'uid_martin\', \'uid_ana\'\],                            |
|                                                                       |
| acceptedTeamsCount: 12,                                               |
|                                                                       |
| createdAt: timestamp                                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Estados válidos del torneo (sin cambios respecto al modelo
anterior):**

  ----------- ---------------------------- ---------------------------- ------------ ---------------- ---------------
  **draft**   **inscripciones_abiertas**   **inscripciones_cerradas**   **activo**   **finalizado**   **cancelado**

  ----------- ---------------------------- ---------------------------- ------------ ---------------- ---------------

**2.2 tournamentPhases \[NUEVA\]**

Esta es la colección más importante del cambio. Cada documento
representa una etapa del torneo: inscripción, fase de grupos, fase de
eliminación, etc. Tiene su propio status, su propia config (que varía
según el tipo de fase) y sus propias marcas de tiempo. El ID del
documento es generado por Firestore; se referencia desde
tournaments.currentPhaseId y desde los documentos de matches y
standings.

+-----------------------------------------------------------------------+
| // tournamentPhases/{phaseId}                                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| tournamentId: \'t_copa2025\',                                         |
|                                                                       |
| type: \'group_stage\', // registration \| group_stage \| knockout \|  |
| round_robin \| final                                                  |
|                                                                       |
| order: 1, // posición en phaseOrder del torneo                        |
|                                                                       |
| status: \'active\', // pending \| active \| preview \| confirmed \|   |
| completed                                                             |
|                                                                       |
| // config varía según el tipo de fase:                                |
|                                                                       |
| config: {                                                             |
|                                                                       |
| // Para group_stage:                                                  |
|                                                                       |
| groupCount: 4,                                                        |
|                                                                       |
| teamsPerGroup: 3,                                                     |
|                                                                       |
| qualifyPerGroup: 2,                                                   |
|                                                                       |
| fixtureType: \'round_robin\',                                         |
|                                                                       |
| // Para knockout:                                                     |
|                                                                       |
| // bracketSize: 8,                                                    |
|                                                                       |
| // thirdPlaceMatch: true,                                             |
|                                                                       |
| // seedingCriteria: \'points\',                                       |
|                                                                       |
| // tiebreaker: \'head2head\'                                          |
|                                                                       |
| // Para registration:                                                 |
|                                                                       |
| // openAt: timestamp,                                                 |
|                                                                       |
| // closeAt: timestamp                                                 |
|                                                                       |
| },                                                                    |
|                                                                       |
| confirmedAt: timestamp,                                               |
|                                                                       |
| completedAt: null                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Estados válidos de una fase:**

  -------------- -------------- -------------- --------------- ---------------
  **pending**    **active**     **preview**    **confirmed**   **completed**

  -------------- -------------- -------------- --------------- ---------------

**2.3 tournamentMatches \[MODIFICADA\]**

La estructura del partido se mantiene casi igual. Los cambios son: se
agrega phaseId (referencia al documento de tournamentPhases) y phaseType
(desnormalizado para simplificar queries sin joins). Se elimina la
propiedad phase que era un string libre como \'grupos_A\'. Los
resultados siguen embebidos en el documento del partido dentro del
objeto result.

  ----------------------- ------------------------------------------------
  **Campo**               **Detalle**

  phaseId \[NUEVO\]       Referencia al documento en tournamentPhases

  phaseType \[NUEVO\]     Desnormalizado: \'group_stage\' \| \'knockout\'
                          \| etc.

  groupLabel \[NUEVO\]    \'A\', \'B\', \'C\'\... solo para fases de
                          grupos, null en knockout

  round                   Número (grupos) o \'QF\' \| \'SF\' \| \'F\' \|
                          \'3rd\' (knockout)

  result.homeSets         Conjuntos ganados por local

  result.awaySets         Conjuntos ganados por visitante

  result.homePoints\[\]   Array con puntos por set: \[25, 22, 25\]

  result.awayPoints\[\]   Array con puntos por set del visitante

  result.winnerId         ID del equipo ganador, null si no se jugó

  result.walkover         true si el partido se ganó por inasistencia

  phase \[ELIMINADO\]     Era string libre, reemplazado por phaseId +
                          phaseType
  ----------------------- ------------------------------------------------

**2.4 tournamentStandings \[NUEVA\]**

Reemplaza a los campos de stats que vivían dentro de tournamentTeams. La
separación es necesaria porque un equipo puede tener posiciones y
métricas distintas en cada fase: sus stats en grupos no son las mismas
que en knockout. El ID del documento es compuesto:
{tournamentId}\_{phaseId}\_{teamId}, lo que garantiza unicidad y permite
queries eficientes.

+-----------------------------------------------------------------------+
| // tournamentStandings/{tournamentId}\_{phaseId}\_{teamId}            |
|                                                                       |
| {                                                                     |
|                                                                       |
| tournamentId: \'t_copa2025\',                                         |
|                                                                       |
| phaseId: \'phase_grp_001\',                                           |
|                                                                       |
| phaseType: \'group_stage\',                                           |
|                                                                       |
| teamId: \'team_aguila\',                                              |
|                                                                       |
| groupLabel: \'A\', // null en knockout                                |
|                                                                       |
| position: 1, // posición en tabla                                     |
|                                                                       |
| stats: {                                                              |
|                                                                       |
| played: 3, won: 2, draw: 0, lost: 1,                                  |
|                                                                       |
| points: 6,                                                            |
|                                                                       |
| setsFor: 6, setsAgainst: 3, setsDiff: 3,                              |
|                                                                       |
| pointsFor: 215, pointsAgainst: 188,                                   |
|                                                                       |
| pointsDiff: 27                                                        |
|                                                                       |
| },                                                                    |
|                                                                       |
| qualified: true, // true cuando avanza a la fase siguiente            |
|                                                                       |
| updatedAt: timestamp                                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**2.5 tournamentAdvancementRules \[NUEVA\]**

Define el contrato de clasificación entre dos fases. Es el documento que
advancePhase() lee para saber cuántos equipos clasifican de cada grupo,
con qué criterio se los ordena y cómo se arman los cruces del bracket.
Sin este documento la lógica de avance no puede ser genérica. El ID es
compuesto: {tournamentId}\_{fromPhaseType}\_{toPhaseType}.

+-----------------------------------------------------------------------+
| //                                                                    |
| tour                                                                  |
| namentAdvancementRules/{tournamentId}\_{fromPhaseType}\_{toPhaseType} |
|                                                                       |
| {                                                                     |
|                                                                       |
| tournamentId: \'t_copa2025\',                                         |
|                                                                       |
| fromPhaseType: \'group_stage\',                                       |
|                                                                       |
| toPhaseType: \'knockout\',                                            |
|                                                                       |
| rules: {                                                              |
|                                                                       |
| qualifyPositions: \[1, 2\], // 1° y 2° de cada grupo                  |
|                                                                       |
| seedingCriteria: \'points\',                                          |
|                                                                       |
| tiebreakers: \[\'setsDiff\', \'pointsDiff\', \'head2head\'\],         |
|                                                                       |
| crossGroupSeeding: true,                                              |
|                                                                       |
| // Cómo se cruzan los grupos en cuartos:                              |
|                                                                       |
| // \'1A_vs_2B\' = 1° grupo A vs 2° grupo B                            |
|                                                                       |
| bracketMatchup: \'1A_vs_2B\'                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**2.6 tournamentTeams y tournamentRegistrations \[MODIFICADAS\]**

tournamentRegistrations no cambia su estructura ni su ID compuesto.
tournamentTeams sí cambia: se eliminan los campos de estadísticas
(played, won, draw, lost, points, setsFor, setsAgainst) porque esa
información migra a tournamentStandings. El equipo ahora guarda solo su
identidad: quiénes son, cómo se llaman y el estado de su pago.

  ------------------------------- ---------------------------------------
  **Campo en tournamentTeams**    **Estado**

  tournamentId, groupId           Sin cambios

  nameTeam, playerIds             Sin cambios

  paymentStatus, paidAmount,      Sin cambios
  pendingAmount                   

  played, won, draw, lost         ELIMINADOS --- migran a
                                  tournamentStandings.stats

  points, setsFor, setsAgainst    ELIMINADOS --- migran a
                                  tournamentStandings.stats
  ------------------------------- ---------------------------------------

**3. Flujos por formato de torneo**

El cambio clave es que los tres formatos ya no comparten el mismo camino
condicional. Cada formato tiene su propia secuencia de fases definida en
phaseOrder al momento de crear el torneo. Esto elimina los if (format
=== \'mixto\') dispersos en el backend.

**3.1 Liga (round robin)**

Secuencia de fases: registration → round_robin → (optional) final

  ---------------------- ------------------------------------------------
  **Fase**               **Acción admin / función backend**

  registration (order:0) openTournamentRegistrations,
                         requestTournamentRegistration,
                         reviewTournamentRegistration

  round_robin (order:1)  previewFixture → confirmFixture (genera todos
                         contra todos)

  Juego activo           recordMatchResult por cada partido --- recalcula
                         standings automáticamente

  Cierre                 advancePhase detecta fase completada y marca
                         torneo como finalizado
  ---------------------- ------------------------------------------------

**3.2 Eliminación directa**

Secuencia de fases: registration → knockout

  ---------------------- ------------------------------------------------
  **Fase**               **Acción admin / función backend**

  registration (order:0) Igual a liga --- inscripción y aceptación de
                         equipos

  knockout (order:1)     previewFixture genera bracket --- confirmFixture
                         lo persiste

  Juego activo           recordMatchResult --- al completarse un partido,
                         advancePhase popula la ronda siguiente

  Cierre                 Cuando se juega la final, el torneo pasa a
                         finalizado con podio
  ---------------------- ------------------------------------------------

**3.3 Mixto (grupos + eliminación)**

Secuencia de fases: registration → group_stage → knockout

  ---------------------- ------------------------------------------------
  **Fase**               **Acción admin / función backend**

  registration (order:0) Igual a los otros formatos

  group_stage (order:1)  previewGroups → confirmGroups → previewFixture →
                         confirmFixture

  Juego de grupos        recordMatchResult actualiza standings por grupo

  Transición \[NUEVO\]   advancePhase lee standings + advancementRules y
                         crea partidos de knockout

  knockout (order:2)     Bracket armado automáticamente con los
                         clasificados por grupo

  Juego KO               recordMatchResult --- el ganador de cada partido
                         avanza al siguiente

  Cierre                 Final jugada → torneo finalizado + podio
  ---------------------- ------------------------------------------------

**4. Funciones Cloud Functions --- qué cambia**

**4.1 Funciones existentes que se modifican**

**createTournament**

Además de crear el documento en tournaments, ahora debe crear los
documentos de tournamentPhases correspondientes al formato elegido, y si
el formato es mixto también debe crear el documento en
tournamentAdvancementRules. El campo groupStage y knockoutStage del
payload dejan de existir; en su lugar se recibe un array phases con
type, order y config por fase.

**editTournament**

Puede modificar la config de una fase específica si esa fase está en
estado pending. No puede modificar fases ya confirmadas o completadas.
Sigue siendo transaccional.

**previewGroups / confirmGroups**

Ahora reciben phaseId en lugar de derivar la fase del campo phase del
torneo. Operan sobre el documento de tournamentPhases con type ===
\'group_stage\'. confirmGroups persiste los grupos dentro del documento
de la fase (config.groups\[\]) en lugar de dentro del torneo.

**previewFixture / confirmFixture**

Reciben phaseId. Leen la config de la fase para saber qué tipo de
fixture generar. confirmFixture persiste los partidos en
tournamentMatches con el phaseId incluido, y también inicializa los
documentos de tournamentStandings con stats en cero para cada equipo de
esa fase.

**openTournamentRegistrations / closeTournamentRegistrations**

Sin cambios funcionales. Se puede agregar opcionalmente que actualicen
el status del documento de la fase de registration en tournamentPhases.

**requestTournamentRegistration / reviewTournamentRegistration**

Sin cambios estructurales. reviewTournamentRegistration ya no inicializa
stats en tournamentTeams; esa inicialización se delega a confirmFixture
cuando se generan los standings.

**updateTournamentRegistrationPayment**

Sin cambios.

**4.2 Funciones nuevas**

**recordMatchResult \[NUEVA --- crítica\]**

Es la función central del torneo activo. Recibe matchId y el objeto
result con los sets y puntos. Dentro de una transacción:

-   Actualiza el documento de tournamentMatches con el resultado y lo
    marca como completed.

-   Lee los standings actuales de ambos equipos para esa fase.

-   Recalcula y actualiza los documentos de tournamentStandings de los
    dos equipos (points, sets, diff, posición).

-   Verifica si todos los partidos de la fase están completos.

-   Si la fase está completa, actualiza el status de tournamentPhases a
    completed y llama a advancePhase.

**advancePhase \[NUEVA --- crítica\]**

Se encarga de la transición entre fases. Lee tournamentAdvancementRules
para la fase actual, ordena los standings según los criterios definidos
(puntos, diferencia de sets, head2head), marca como qualified a los
equipos que clasifican, y luego:

-   Si la siguiente fase es knockout: genera los partidos del bracket
    cruzado entre grupos y los persiste en tournamentMatches con el
    phaseId de la fase knockout.

-   Si es round robin o final: genera los partidos correspondientes.

-   Si no hay fase siguiente: actualiza el torneo a finalizado y
    registra el podio.

-   Actualiza currentPhaseId y currentPhaseType en el documento del
    torneo.

-   Todo dentro de un batch write para garantizar consistencia.

**5. Impacto en el frontend**

**5.1 Panel admin del torneo**

TournamentAdminPanel ahora lee currentPhaseId del torneo para saber qué
UI mostrar. Las acciones disponibles dependen del status del documento
de tournamentPhases activo, no del status del torneo. Esto simplifica la
lógica de la acción principal: en lugar de evaluar el status del torneo
y el formato, se evalúa el status de la fase actual.

  ------------------------- ---------------------------------------------
  **Status de la fase       **Acción principal del panel admin**
  actual**                  

  active (registration)     Ver inscripciones, aceptar / rechazar equipos

  active (group_stage /     Ver fixture, cargar resultados
  round_robin)              

  preview                   Confirmar grupos o confirmar fixture

  confirmed                 Iniciar fase (pasa a active)

  completed                 Ver clasificados, avanzar a siguiente fase
  ------------------------- ---------------------------------------------

**5.2 Vista pública de torneos**

Sin cambios. Sigue filtrando por status del torneo
(inscripciones_abiertas, activo). El botón de inscripción sigue
dependiendo de canRegister().

**5.3 Tabla de posiciones**

Ahora se lee desde tournamentStandings filtrando por phaseId. La query
cambia de leer campos dentro de tournamentTeams a leer la subcolección
de standings. La vista puede mostrar simultáneamente la tabla de grupos
(group_stage) y el estado del bracket (knockout) si el torneo mixto ya
avanzó de fase.

**5.4 Detalle admin del torneo**

Además del torneo, las inscripciones y los equipos, ahora carga los
documentos de tournamentPhases para mostrar el estado de cada etapa y
permitir navegar entre fases.

**5.5 Perfil del usuario/admin**

Sin cambios en la lógica de historial. Los standings por fase son un
dato adicional que puede mostrarse si se quiere en el detalle del torneo
dentro del perfil.

**6. Queries Firestore más importantes**

  --------------------------- -------------------------------------------
  **Necesidad**               **Query**

  Fase activa del torneo      tournamentPhases where tournamentId == X
                              and status in
                              \[\'active\',\'preview\',\'confirmed\'\]

  Partidos de una fase        tournamentMatches where phaseId == phaseId

  Partidos de un grupo        tournamentMatches where phaseId == X and
                              groupLabel == \'A\'

  Tabla de un grupo           tournamentStandings where phaseId == X and
                              groupLabel == \'A\' orderBy position

  Tabla general de fase       tournamentStandings where phaseId == X
                              orderBy stats.points desc

  Equipos clasificados        tournamentStandings where phaseId == X and
                              qualified == true

  Partidos pendientes de fase tournamentMatches where phaseId == X and
                              status == \'scheduled\'
  --------------------------- -------------------------------------------

**7. Limitaciones conocidas y deuda técnica**

**7.1 Lo que queda pendiente**

-   advancePhase para el cruce entre grupos en formato mixto requiere
    implementar la lógica de bracketMatchup (ej. 1A_vs_2B). La
    estructura está definida en tournamentAdvancementRules pero la
    función aún no existe.

-   recordMatchResult necesita manejar el caso de empates técnicos y
    walkover de forma explícita.

-   El manejo de desempate por head2head (enfrentamiento directo)
    requiere una query adicional sobre tournamentMatches para el par de
    equipos empatados.

-   No existe aún una función de cancelación de partido que redistribuya
    puntos ya otorgados.

**7.2 Lo que sigue bien resuelto**

-   Las transacciones protegen todas las operaciones críticas: aceptar
    inscripciones, confirmar fixture, cargar resultados.

-   La lógica de fixture (generateRoundRobinMatches,
    generateKnockoutBracket, shuffleWithSeed) es código puro y no
    necesita cambios --- solo se adapta quién la llama y con qué
    parámetros.

-   El ID compuesto en tournamentRegistrations sigue funcionando igual
    para evitar duplicados.

-   La separación entre previewFixture y confirmFixture se mantiene para
    evitar persistir estructuras erróneas.

**8. Mapa de colecciones --- versión final**

  ---------------------------- -------------------------------------------
  **Colección**                **Propósito --- qué guarda**

  tournaments                  Config, permisos, status, phaseOrder y
                               currentPhaseId del torneo

  tournamentPhases \[NUEVA\]   Una fase por etapa: tipo, status, config y
                               timestamps propios

  tournamentRegistrations      Solicitudes de inscripción de grupos ---
                               sin cambios

  tournamentTeams              Identidad del equipo aceptado: jugadores y
                               estado de pago (sin stats)

  tournamentMatches            Fixture confirmado con resultado embebido y
                               referencia a phaseId

  tournamentStandings          Tabla de posiciones por equipo y por fase,
  \[NUEVA\]                    con todos los stats

  tournamentAdvancementRules   Criterios de clasificación y armado de
  \[NUEVA\]                    bracket entre fases

  groups                       Solo para validaciones: administra el grupo
                               e integrantes

  users                        Solo para validaciones: rol admin al
                               agregar admins de torneo
  ---------------------------- -------------------------------------------
