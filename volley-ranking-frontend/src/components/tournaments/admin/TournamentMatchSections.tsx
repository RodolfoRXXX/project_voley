import type { TournamentMatch } from "@/types/tournaments";

export type GroupedTournamentMatches = {
  group: {
    [groupLabel: string]: {
      [round: string]: TournamentMatch[];
    };
  };
  knockout: {
    [round: string]: TournamentMatch[];
  };
};

function getGroupIdFromTournamentMatch(tournamentMatch: TournamentMatch) {
  return tournamentMatch.groupLabel ? `Grupo ${tournamentMatch.groupLabel}` : null;
}

function isKnockoutTournamentPhase(phaseType: TournamentMatch["phaseType"]) {
  return phaseType === "knockout" || phaseType === "final";
}

function sortRoundEntries(rounds: Record<string, TournamentMatch[]>) {
  return Object.entries(rounds).sort((a, b) => Number(a[0]) - Number(b[0]));
}

export function groupTournamentMatches(tournamentMatches: TournamentMatch[]): GroupedTournamentMatches {
  return tournamentMatches.reduce<GroupedTournamentMatches>(
    (acc, tournamentMatch) => {
      const groupId = getGroupIdFromTournamentMatch(tournamentMatch);

      if (groupId) {
        const roundKey = String(tournamentMatch.round);
        if (!acc.group[groupId]) acc.group[groupId] = {};
        if (!acc.group[groupId][roundKey]) acc.group[groupId][roundKey] = [];
        acc.group[groupId][roundKey].push(tournamentMatch);
        return acc;
      }

      if (isKnockoutTournamentPhase(tournamentMatch.phaseType)) {
        const roundKey = String(tournamentMatch.round);
        if (!acc.knockout[roundKey]) acc.knockout[roundKey] = [];
        acc.knockout[roundKey].push(tournamentMatch);
      }

      return acc;
    },
    {
      group: {},
      knockout: {},
    }
  );
}

export function TournamentMatchSummaryList({
  groupedTournamentMatches,
  teamNames,
}: {
  groupedTournamentMatches: GroupedTournamentMatches;
  teamNames: Record<string, string>;
}) {
  const knockoutRounds = sortRoundEntries(groupedTournamentMatches.knockout);

  return (
    <div className="space-y-4">
      {Object.entries(groupedTournamentMatches.group)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([groupId, rounds]) => (
          <div key={groupId} className="space-y-2">
            <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{groupId}</h4>
            {sortRoundEntries(rounds).map(([round, tournamentMatches]) => (
              <div key={`${groupId}-${round}`} className="space-y-1 border-l border-neutral-200 pl-3 dark:border-neutral-700">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Round {round}</p>
                {tournamentMatches.map((tournamentMatch) => (
                  <p key={tournamentMatch.id} className="text-sm text-neutral-700 dark:text-neutral-200">
                    {teamNames[tournamentMatch.homeTeamId || ""] || "Por definir"} vs {teamNames[tournamentMatch.awayTeamId || ""] || "Por definir"}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ))}

      {knockoutRounds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Cuadro eliminatorio</h4>
          {knockoutRounds.map(([round, tournamentMatches]) => (
            <div key={`knockout-${round}`} className="space-y-1 border-l border-neutral-200 pl-3 dark:border-neutral-700">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Round {round}</p>
              {tournamentMatches.map((tournamentMatch) => (
                <p key={tournamentMatch.id} className="text-sm text-neutral-700 dark:text-neutral-200">
                  {teamNames[tournamentMatch.homeTeamId || ""] || "Por definir"} vs {teamNames[tournamentMatch.awayTeamId || ""] || "Por definir"}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
