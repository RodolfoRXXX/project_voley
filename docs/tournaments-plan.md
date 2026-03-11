# Plan de incorporación de torneos (sin romper la estructura actual)

## Objetivo

Agregar un módulo de torneos como capacidad nueva e independiente del flujo actual de partidos aislados:

- Se mantiene intacto el modelo actual (`groups`, `matches`, `participations`, `teams`).
- Se agregan nuevas colecciones para torneos.
- Toda la lógica de torneos vive en nuevas Cloud Functions y servicios separados.

## Principio de integración

Para minimizar riesgo:

1. **No tocar la lógica existente de matches** (solo reutilizar utilidades de auth/admin cuando sirva).
2. Implementar torneos como **bounded context** aparte:
   - `tournaments`
   - `tournamentRegistrations`
   - `tournamentTeams`
   - `tournamentMatches`
3. Exponer funciones callable nuevas con prefijo `tournament*`.
4. Activar la feature en frontend detrás de vistas nuevas (sidebar/navbar + sección de gestión), sin alterar pantallas actuales.

---

## Modelo de datos propuesto

> Basado en tu diseño, ajustado con los cambios solicitados para ownership/admins y podio final.

### 1) `tournaments`

```ts
type Tournament = {
  name: string;
  description: string;

  sport: "voley" | string;
  format: "liga" | "eliminacion" | "mixto";

  status: "draft" | "inscripciones_abiertas" | "activo" | "finalizado";

  ownerAdminId: string; // admin principal creador del torneo
  adminIds: string[]; // admins habilitados a gestionar el torneo
  createdByAdminIds: string[]; // historial inicial de admins definidos al crear
  updatedBy?: string; // último admin que modificó el documento

  maxTeams: number;
  minTeams: number;

  startDate: Timestamp;
  endDate: Timestamp;

  rules: {
    pointsWin: number;
    pointsDraw: number;
    pointsLose: number;
    setsToWin: number;
    allowDraws: boolean;
  };

  structure: {
    groupStage?: {
      enabled: boolean;
      groupsCount?: number;
    };
    knockoutStage?: {
      enabled: boolean;
      startFrom?: "cuartos" | "semi" | "final";
    };
  };

  acceptedTeamsCount?: number; // derivado para consultas rápidas
  podiumTeamIds?: [string, string, string]; // 1er, 2do y 3er puesto

  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

### 2) `tournamentRegistrations`

```ts
type TournamentRegistration = {
  tournamentId: string;
  groupId: string;

  status: "pendiente" | "aceptado" | "rechazado";
  nameTeam: string;

  paymentStatus: "pendiente" | "pagado";
  paymentAmount?: number;
  paymentDate?: Timestamp;

  registeredAt: Timestamp;
  updatedAt?: Timestamp;
  decidedByUserId?: string; // admin que validó pago/aceptación del registro
};
```

### 3) `tournamentTeams`

```ts
type TournamentTeam = {
  tournamentId: string;
  groupId: string;
  registrationId: string;

  name: string;
  playerIds: string[];

  groupLabel?: string;

  stats: {
    played: number;
    won: number;
    draw: number;
    lost: number;
    points: number;
    setsFor: number;
    setsAgainst: number;
  };

  createdAt: Timestamp;
  updatedAt?: Timestamp;
};
```

### 4) `tournamentMatches`

```ts
type TournamentMatch = {
  tournamentId: string;

  phase: "grupos" | "cuartos" | "semi" | "final";
  round: number;
  groupLabel?: string;

  teamAId: string;
  teamBId: string;

  score?: {
    teamA: number;
    teamB: number;
  };

  sets?: Array<{ teamA: number; teamB: number }>;

  winnerTeamId?: string;

  scheduledDate?: Timestamp; // único tiempo operativo del encuentro
  location?: string;

  status: "pendiente" | "programado" | "jugado";

  order: number;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
};
```

---

## Reglas de negocio clave

1. Solo `user.role = admin` puede crear torneos.
2. El torneo es público para descubrir e iniciar inscripción.
3. El `ownerAdminId` puede asignar otros admins a `adminIds` para co-gestión.
4. Cualquier admin de `adminIds` puede operar el torneo, pero solo owner puede cambiar admins.
5. Un admin que se registra al torneo debe elegir un `groupId` que administre.
6. Un mismo admin puede registrar múltiples grupos distintos que administre.
7. No se puede pasar a `activo` si `acceptedTeamsCount < minTeams`.
8. No aceptar más inscripciones si ya llegó a `maxTeams`.
9. `tournamentTeam` solo puede existir para registro `aceptado`.
10. Resultado de partido jugado actualiza stats de ambos equipos en transacción.
11. Al finalizar, se completa `podiumTeamIds` con `[primero, segundo, tercero]`.

---

## Cloud Functions recomendadas (v1 manual)

Crear nuevos callables sin acoplar los actuales:

- `createTournament`
- `updateTournament`
- `addTournamentAdmin`
- `removeTournamentAdmin`
- `openTournamentRegistrations`
- `closeTournamentRegistrations`
- `requestTournamentRegistration`
- `reviewTournamentRegistration` (aceptar/rechazar + admin validador en `decidedByUserId`)
- `updateTournamentRegistrationPayment`
- `createTournamentTeam`
- `updateTournamentTeamPlayers`
- `createTournamentMatch`
- `updateTournamentMatchSchedule`
- `reportTournamentMatchResult`
- `startTournament`
- `finalizeTournament` (persistiendo `podiumTeamIds`)

### Validaciones mínimas por función

- Auth obligatoria en todas.
- `assertIsAdmin(uid)` para acciones de organización/gestión.
- `ownerAdminId` para cambios de admins del torneo.
- `adminIds` para operaciones operativas (fixture, resultados, pagos, estado).
- Verificación de que el admin solicitante administra el `groupId` al registrar grupo.
- Validación de estado del torneo antes de cada transición.

---

## Frontend propuesto

### Público

- Agregar link **“Torneos”** en:
  - Sidebar
  - Drawer del navbar
- Vista pública con cards de torneos vigentes (`status = inscripciones_abiertas | activo`).

### Admin (Gestión)

- En la vista de Gestión, agregar sección “Mis torneos”.
- Mostrar listado de torneos donde el admin pertenezca a `adminIds`.
- En detalle del torneo mostrar:
  - información general,
  - estado actual,
  - admins gestores (resaltando owner),
  - inscripciones,
  - equipos,
  - fixture y resultados.

---

## Estructura de código sugerida (alineada al repo actual)

Dentro de `volley-ranking-system/functions`:

- `callables/createTournament.js` y resto de callables tournament.
- `src/services/tournamentService.js`
- `src/services/tournamentRegistrationService.js`
- `src/services/tournamentTeamService.js`
- `src/services/tournamentMatchService.js`
- `src/services/tournamentStatsService.js`
- exportar en `functions/index.js` como se hace hoy con los módulos actuales.

Esto mantiene el patrón existente de “callable + service”.

---

## Índices Firestore recomendados

1. `tournamentRegistrations` por `(tournamentId, status, registeredAt)`.
2. `tournamentRegistrations` por `(groupId, tournamentId)` para evitar dobles registros por grupo.
3. `tournamentTeams` por `(tournamentId, groupLabel, stats.points desc)` para tabla.
4. `tournamentMatches` por `(tournamentId, phase, round, order)` para fixture.
5. `tournaments` por `(status, startDate)` para exploración pública.
6. `tournaments` por `(adminIds array-contains, updatedAt desc)` para panel admin.

---

## Fases de implementación

### Fase A — Base de datos + backend mínimo

- Alta de colecciones.
- `createTournament`, `addTournamentAdmin`, `requestTournamentRegistration`, `reviewTournamentRegistration`.
- Estados básicos: `draft` e `inscripciones_abiertas`.

### Fase B — Equipos y fixture manual

- `createTournamentTeam`.
- `createTournamentMatch` y agenda manual.
- Vista pública de torneos vigentes + listado “Mis torneos” en gestión admin.

### Fase C — Carga de resultados y cierre

- `reportTournamentMatchResult`.
- Cálculo de `stats` transaccional.
- Paso a `finalizado` con `podiumTeamIds`.

### Fase D — Automatización futura

- Generación automática de fixture.
- Avance automático de llaves.
- Notificaciones y monetización extendida.

---

## Compatibilidad con lo actual

Esta propuesta **no reemplaza ni modifica** el flujo actual de partidos. Lo complementa:

- `matches` sigue cubriendo partidos sueltos.
- `tournamentMatches` cubre partidos pertenecientes a un torneo.
- Mismo usuario/grupo puede operar en ambos mundos.

Así podés lanzar torneos incrementalmente, con bajo riesgo y sin reescribir lo que ya funciona.
