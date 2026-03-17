export type TournamentStatus =
  | "draft"
  | "inscripciones_abiertas"
  | "inscripciones_cerradas"
  | "activo"
  | "finalizado"
  | "cancelado";

export type Tournament = {
  id: string;
  name: string;
  description: string;
  sport: "voley" | string;
  format: "liga" | "eliminacion" | "mixto";
  status: TournamentStatus;
  ownerAdminId: string;
  adminIds: string[];
  createdByAdminIds: string[];
  updatedBy?: string;
  paymentForPlayer: number;
  maxTeams: number;
  minTeams: number;
  minPlayers: number;
  maxPlayers: number;
  startDate: unknown;
  rules: {
    pointsWin: number;
    pointsDraw: number;
    pointsLose: number;
    setsToWin: number;
  };
  structure: {
    groupStage?: {
      enabled: boolean;
      groupsCount?: number;
      rounds: number;
    };
    knockoutStage?: {
      enabled: boolean;
      startFrom?: "cuartos" | "semi" | "final";
    };
  };
  acceptedTeamsCount?: number;
  podiumTeamIds?: [string, string, string];
  createdAt: unknown;
  updatedAt: unknown;
};

export type Team = {
  id: string;
  tournamentId: string;
  teamName: string;
};

export type Match = {
  id: string;
  tournamentId: string;
  phase: "group" | "knockout";
  round: number;
  groupId?: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  status: "pending";
};

type KnockoutStartFrom = "cuartos" | "semi" | "final";

const KNOCKOUT_TEAM_SIZE: Record<KnockoutStartFrom, number> = {
  cuartos: 8,
  semi: 4,
  final: 2,
};

export function generateGroups(teams: Team[], groupsCount: number): Team[][] {
  if (groupsCount < 1) {
    throw new Error("groupsCount debe ser mayor a 0.");
  }

  const orderedTeams = [...teams].sort((a, b) => a.id.localeCompare(b.id));
  const groups = Array.from({ length: groupsCount }, () => [] as Team[]);

  orderedTeams.forEach((team, index) => {
    groups[index % groupsCount].push(team);
  });

  return groups;
}

export function generateRoundRobinMatches({
  tournamentId,
  teamIds,
  rounds,
  phase,
  groupId,
  roundOffset = 0,
}: {
  tournamentId: string;
  teamIds: string[];
  rounds: number;
  phase: "group" | "knockout";
  groupId?: string;
  roundOffset?: number;
}): Match[] {
  if (rounds < 1) {
    throw new Error("La cantidad de rondas debe ser al menos 1.");
  }

  const orderedTeamIds = [...teamIds].sort((a, b) => a.localeCompare(b));
  const hasBye = orderedTeamIds.length % 2 !== 0;
  const workingTeamIds = hasBye ? [...orderedTeamIds, "__BYE__"] : orderedTeamIds;

  const roundsPerLeg = workingTeamIds.length - 1;
  const half = workingTeamIds.length / 2;
  const rotation = [...workingTeamIds];
  const firstLeg: Array<Array<[string, string]>> = [];

  for (let roundIndex = 0; roundIndex < roundsPerLeg; roundIndex += 1) {
    const pairings: Array<[string, string]> = [];

    for (let i = 0; i < half; i += 1) {
      const home = rotation[i];
      const away = rotation[rotation.length - 1 - i];
      if (home !== "__BYE__" && away !== "__BYE__") {
        pairings.push([home, away]);
      }
    }

    firstLeg.push(pairings);

    const fixed = rotation[0];
    const moved = rotation.pop();
    if (!moved) {
      continue;
    }

    rotation.splice(1, 0, moved);
    rotation[0] = fixed;
  }

  const matches: Match[] = [];

  for (let leg = 0; leg < rounds; leg += 1) {
    for (let roundIndex = 0; roundIndex < firstLeg.length; roundIndex += 1) {
      const currentRound = roundOffset + leg * firstLeg.length + roundIndex + 1;
      const pairings = firstLeg[roundIndex];

      pairings.forEach(([home, away], pairingIndex) => {
        const [homeTeamId, awayTeamId] = leg % 2 === 0 ? [home, away] : [away, home];

        matches.push({
          id: buildMatchId(phase, currentRound, pairingIndex + 1, groupId),
          tournamentId,
          phase,
          round: currentRound,
          groupId,
          homeTeamId,
          awayTeamId,
          status: "pending",
        });
      });
    }
  }

  return matches;
}

export function generateKnockoutBracket({
  tournamentId,
  startFrom,
  seededTeamIds,
}: {
  tournamentId: string;
  startFrom: KnockoutStartFrom;
  seededTeamIds: Array<string | null>;
}): Match[] {
  const initialTeams = KNOCKOUT_TEAM_SIZE[startFrom];
  if (seededTeamIds.length !== initialTeams) {
    throw new Error(
      `El cuadro de ${startFrom} requiere exactamente ${initialTeams} equipos.`,
    );
  }

  const matches: Match[] = [];
  let currentRound = 1;
  let currentSlots = [...seededTeamIds];

  while (currentSlots.length >= 2) {
    const matchCount = currentSlots.length / 2;

    for (let i = 0; i < matchCount; i += 1) {
      const homeTeamId = currentRound === 1 ? currentSlots[i * 2] : null;
      const awayTeamId = currentRound === 1 ? currentSlots[i * 2 + 1] : null;

      matches.push({
        id: buildMatchId("knockout", currentRound, i + 1),
        tournamentId,
        phase: "knockout",
        round: currentRound,
        homeTeamId,
        awayTeamId,
        status: "pending",
      });
    }

    currentSlots = new Array(matchCount).fill(null);
    currentRound += 1;
  }

  return matches;
}

export function generateTournamentFixture(
  tournament: Tournament,
  teams: Team[],
): Match[] {
  validateTeamsRange(tournament, teams.length);

  const orderedTeams = [...teams].sort((a, b) => a.id.localeCompare(b.id));
  const acceptedTeamsCount = tournament.acceptedTeamsCount ?? orderedTeams.length;

  if (acceptedTeamsCount !== orderedTeams.length) {
    throw new Error(
      "acceptedTeamsCount debe coincidir con la cantidad real de equipos aceptados.",
    );
  }

  if (tournament.format === "liga") {
    const rounds = tournament.structure.groupStage?.rounds ?? 1;
    return generateRoundRobinMatches({
      tournamentId: tournament.id,
      teamIds: orderedTeams.map((team) => team.id),
      rounds,
      phase: "group",
    });
  }

  const startFrom = tournament.structure.knockoutStage?.startFrom;
  if (!startFrom) {
    throw new Error("El torneo requiere structure.knockoutStage.startFrom.");
  }

  const requiredKnockoutTeams = KNOCKOUT_TEAM_SIZE[startFrom];
  if (orderedTeams.length !== requiredKnockoutTeams) {
    throw new Error(
      `El formato ${tournament.format} con inicio ${startFrom} requiere ${requiredKnockoutTeams} equipos.`,
    );
  }

  if (tournament.format === "eliminacion") {
    return generateKnockoutBracket({
      tournamentId: tournament.id,
      startFrom,
      seededTeamIds: orderedTeams.map((team) => team.id),
    });
  }

  const groupsCount = tournament.structure.groupStage?.groupsCount;
  const rounds = tournament.structure.groupStage?.rounds ?? 1;

  if (!groupsCount) {
    throw new Error("El formato mixto requiere groupStage.groupsCount.");
  }

  const groups = generateGroups(orderedTeams, groupsCount);
  const groupMatches: Match[] = [];

  groups.forEach((groupTeams, groupIndex) => {
    const groupId = `group-${String.fromCharCode(65 + groupIndex)}`;
    groupMatches.push(
      ...generateRoundRobinMatches({
        tournamentId: tournament.id,
        teamIds: groupTeams.map((team) => team.id),
        rounds,
        phase: "group",
        groupId,
      }),
    );
  });

  const knockoutMatches = generateKnockoutBracket({
    tournamentId: tournament.id,
    startFrom,
    seededTeamIds: new Array(requiredKnockoutTeams).fill(null),
  });

  return [...groupMatches, ...knockoutMatches].sort(sortMatchesByPhaseAndRound);
}

function validateTeamsRange(tournament: Tournament, teamsCount: number): void {
  if (teamsCount < tournament.minTeams) {
    throw new Error("La cantidad de equipos es menor al mínimo permitido.");
  }

  if (teamsCount > tournament.maxTeams) {
    throw new Error("La cantidad de equipos supera el máximo permitido.");
  }
}

function buildMatchId(
  phase: Match["phase"],
  round: number,
  index: number,
  groupId?: string,
): string {
  const safeGroup = groupId ? `-${groupId}` : "";
  return `${phase}${safeGroup}-r${round}-m${index}`;
}

function sortMatchesByPhaseAndRound(a: Match, b: Match): number {
  const phaseOrder: Record<Match["phase"], number> = {
    group: 0,
    knockout: 1,
  };

  if (phaseOrder[a.phase] !== phaseOrder[b.phase]) {
    return phaseOrder[a.phase] - phaseOrder[b.phase];
  }

  if ((a.groupId ?? "") !== (b.groupId ?? "")) {
    return (a.groupId ?? "").localeCompare(b.groupId ?? "");
  }

  if (a.round !== b.round) {
    return a.round - b.round;
  }

  return a.id.localeCompare(b.id);
}
