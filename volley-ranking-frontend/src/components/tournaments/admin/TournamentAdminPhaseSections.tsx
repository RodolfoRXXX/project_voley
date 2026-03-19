import type { TournamentGroup, TournamentMatch, TournamentStanding } from "@/types/tournaments";

type GroupedMatches = {
  group: {
    [groupLabel: string]: {
      [round: string]: TournamentMatch[];
    };
  };
  knockout: {
    [round: string]: TournamentMatch[];
  };
};

function sortRoundEntries(rounds: Record<string, TournamentMatch[]>) {
  return Object.entries(rounds).sort((a, b) => Number(a[0]) - Number(b[0]));
}

export function TournamentGroupsList({
  groups,
  teamNames,
}: {
  groups: TournamentGroup[];
  teamNames: Record<string, string>;
}) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.name} className="rounded border border-neutral-200 p-3 dark:border-neutral-700 dark:bg-neutral-900/60">
          <h5 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Grupo {group.name}</h5>
          <ul className="mt-2 space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
            {group.teamIds.map((teamId) => (
              <li key={`${group.name}-${teamId}`}>• {teamNames[teamId] || `Equipo ${teamId.slice(0, 6)}`}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function TournamentMatchList({
  groupedMatches,
  teamNames,
}: {
  groupedMatches: GroupedMatches;
  teamNames: Record<string, string>;
}) {
  const knockoutRounds = sortRoundEntries(groupedMatches.knockout);

  return (
    <div className="space-y-4">
      {Object.entries(groupedMatches.group)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([groupId, rounds]) => (
          <div key={groupId} className="space-y-2">
            <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{groupId}</h4>
            {sortRoundEntries(rounds).map(([round, matches]) => (
              <div key={`${groupId}-${round}`} className="space-y-1 border-l border-neutral-200 pl-3 dark:border-neutral-700">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Round {round}</p>
                {matches.map((match) => (
                  <p key={match.id} className="text-sm text-neutral-700 dark:text-neutral-200">
                    {teamNames[match.homeTeamId || ""] || "Por definir"} vs {teamNames[match.awayTeamId || ""] || "Por definir"}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ))}

      {knockoutRounds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Cuadro eliminatorio</h4>
          {knockoutRounds.map(([round, matches]) => (
            <div key={`knockout-${round}`} className="space-y-1 border-l border-neutral-200 pl-3 dark:border-neutral-700">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Round {round}</p>
              {matches.map((match) => (
                <p key={match.id} className="text-sm text-neutral-700 dark:text-neutral-200">
                  {teamNames[match.homeTeamId || ""] || "Por definir"} vs {teamNames[match.awayTeamId || ""] || "Por definir"}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TournamentStandingsTable({
  standings,
  teamNames,
}: {
  standings: TournamentStanding[];
  teamNames: Record<string, string>;
}) {
  if (standings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        Esta fase todavía no tiene standings publicados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
        <thead className="bg-neutral-50 dark:bg-neutral-900/60">
          <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <th className="px-3 py-2">Pos</th>
            <th className="px-3 py-2">Equipo</th>
            <th className="px-3 py-2">Grupo</th>
            <th className="px-3 py-2">Pts</th>
            <th className="px-3 py-2">PJ</th>
            <th className="px-3 py-2">DS</th>
            <th className="px-3 py-2">Clasif.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
          {[...standings]
            .sort((a, b) => a.position - b.position)
            .map((standing) => (
              <tr key={standing.id}>
                <td className="px-3 py-2 font-semibold text-neutral-900 dark:text-neutral-100">#{standing.position}</td>
                <td className="px-3 py-2 text-neutral-700 dark:text-neutral-200">{teamNames[standing.teamId] || `Equipo ${standing.teamId.slice(0, 6)}`}</td>
                <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{standing.groupLabel || "-"}</td>
                <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{standing.stats.points}</td>
                <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{standing.stats.played}</td>
                <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{standing.stats.setsDiff}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${standing.qualified ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}`}>
                    {standing.qualified ? "Sí" : "No"}
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
