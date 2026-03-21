import type { ReactNode } from "react";
import type { TournamentMatch } from "@/types/tournaments";

type MatchdayGroups = Record<string, TournamentMatch[]>;
type CycleGroups = Record<string, MatchdayGroups>;

export type GroupedTournamentMatches = {
  league: CycleGroups;
  group: Record<string, CycleGroups>;
  knockout: {
    [round: string]: TournamentMatch[];
  };
};

function isKnockoutTournamentPhase(phaseType: TournamentMatch["phaseType"]) {
  return phaseType === "knockout" || phaseType === "final";
}

function sortNumericEntries<T>(record: Record<string, T>) {
  return Object.entries(record).sort((a, b) => Number(a[0]) - Number(b[0]));
}

function getRoundCycle(tournamentMatch: TournamentMatch) {
  return String(tournamentMatch.roundCycle || 1);
}

function getMatchday(tournamentMatch: TournamentMatch) {
  return String(tournamentMatch.matchdayNumber || tournamentMatch.round || 1);
}

function sortMatches(tournamentMatches: TournamentMatch[]) {
  return [...tournamentMatches].sort((a, b) =>
    Number(a.sequence || 0) - Number(b.sequence || 0)
    || String(a.id).localeCompare(String(b.id))
  );
}

function TournamentMatchSummaryItem({
  tournamentMatch,
  teamNames,
  renderMatchDetails,
}: {
  tournamentMatch: TournamentMatch;
  teamNames: Record<string, string>;
  renderMatchDetails?: (tournamentMatch: TournamentMatch) => ReactNode;
}) {
  return (
    <div key={tournamentMatch.id} className="rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-700">
      <p className="text-sm text-neutral-700 dark:text-neutral-200">
        {teamNames[tournamentMatch.homeTeamId || ""] || "Por definir"} vs {teamNames[tournamentMatch.awayTeamId || ""] || "Por definir"}
      </p>
      {renderMatchDetails ? <div className="mt-2">{renderMatchDetails(tournamentMatch)}</div> : null}
    </div>
  );
}

function MatchdayBlock({
  title,
  tournamentMatches,
  teamNames,
  renderMatchDetails,
}: {
  title: string;
  tournamentMatches: TournamentMatch[];
  teamNames: Record<string, string>;
  renderMatchDetails?: (tournamentMatch: TournamentMatch) => ReactNode;
}) {
  return (
    <div className="space-y-2 border-l border-neutral-200 pl-3 dark:border-neutral-700">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
      {sortMatches(tournamentMatches).map((tournamentMatch) => (
        <TournamentMatchSummaryItem
          key={tournamentMatch.id}
          tournamentMatch={tournamentMatch}
          teamNames={teamNames}
          renderMatchDetails={renderMatchDetails}
        />
      ))}
    </div>
  );
}

function CycleBlock({
  cycleLabel,
  matchdays,
  teamNames,
  renderMatchDetails,
}: {
  cycleLabel: string;
  matchdays: MatchdayGroups;
  teamNames: Record<string, string>;
  renderMatchDetails?: (tournamentMatch: TournamentMatch) => ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{cycleLabel}</h4>
      {sortNumericEntries(matchdays).map(([matchday, tournamentMatches]) => (
        <MatchdayBlock
          key={`${cycleLabel}-${matchday}`}
          title={`Fecha ${matchday}`}
          tournamentMatches={tournamentMatches}
          teamNames={teamNames}
          renderMatchDetails={renderMatchDetails}
        />
      ))}
    </div>
  );
}

export function groupTournamentMatches(tournamentMatches: TournamentMatch[]): GroupedTournamentMatches {
  return tournamentMatches.reduce<GroupedTournamentMatches>(
    (acc, tournamentMatch) => {
      if (isKnockoutTournamentPhase(tournamentMatch.phaseType)) {
        const roundKey = String(tournamentMatch.round);
        if (!acc.knockout[roundKey]) acc.knockout[roundKey] = [];
        acc.knockout[roundKey].push(tournamentMatch);
        return acc;
      }

      const roundCycleKey = getRoundCycle(tournamentMatch);
      const matchdayKey = getMatchday(tournamentMatch);

      if (tournamentMatch.groupLabel) {
        const groupId = `Grupo ${tournamentMatch.groupLabel}`;
        if (!acc.group[groupId]) acc.group[groupId] = {};
        if (!acc.group[groupId][roundCycleKey]) acc.group[groupId][roundCycleKey] = {};
        if (!acc.group[groupId][roundCycleKey][matchdayKey]) acc.group[groupId][roundCycleKey][matchdayKey] = [];
        acc.group[groupId][roundCycleKey][matchdayKey].push(tournamentMatch);
        return acc;
      }

      if (!acc.league[roundCycleKey]) acc.league[roundCycleKey] = {};
      if (!acc.league[roundCycleKey][matchdayKey]) acc.league[roundCycleKey][matchdayKey] = [];
      acc.league[roundCycleKey][matchdayKey].push(tournamentMatch);
      return acc;
    },
    {
      league: {},
      group: {},
      knockout: {},
    }
  );
}

export function getTournamentLeagueProgress(tournamentMatches: TournamentMatch[]) {
  const leagueMatches = tournamentMatches.filter((match) => !match.groupLabel && !isKnockoutTournamentPhase(match.phaseType));
  const matchdayStatus = new Map<string, { total: number; completed: number }>();

  leagueMatches.forEach((match) => {
    const key = `${match.roundCycle || 1}:${match.matchdayNumber || match.round || 1}`;
    const current = matchdayStatus.get(key) || { total: 0, completed: 0 };
    current.total += 1;
    current.completed += match.status === "completed" ? 1 : 0;
    matchdayStatus.set(key, current);
  });

  const completedMatchdays = [...matchdayStatus.values()].filter((row) => row.total > 0 && row.total === row.completed).length;
  return {
    totalMatches: leagueMatches.length,
    completedMatches: leagueMatches.filter((match) => match.status === "completed").length,
    pendingMatches: leagueMatches.filter((match) => match.status !== "completed").length,
    totalMatchdays: matchdayStatus.size,
    completedMatchdays,
  };
}

export function TournamentMatchSummaryList({
  groupedTournamentMatches,
  teamNames,
  renderMatchDetails,
}: {
  groupedTournamentMatches: GroupedTournamentMatches;
  teamNames: Record<string, string>;
  renderMatchDetails?: (tournamentMatch: TournamentMatch) => ReactNode;
}) {
  const knockoutRounds = sortNumericEntries(groupedTournamentMatches.knockout);
  const leagueCycles = sortNumericEntries(groupedTournamentMatches.league);

  return (
    <div className="space-y-4">
      {leagueCycles.map(([cycle, matchdays]) => (
        <CycleBlock
          key={`league-${cycle}`}
          cycleLabel={`Vuelta ${cycle}`}
          matchdays={matchdays}
          teamNames={teamNames}
          renderMatchDetails={renderMatchDetails}
        />
      ))}

      {Object.entries(groupedTournamentMatches.group)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([groupId, cycles]) => (
          <div key={groupId} className="space-y-3">
            <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{groupId}</h4>
            {sortNumericEntries(cycles).map(([cycle, matchdays]) => (
              <CycleBlock
                key={`${groupId}-${cycle}`}
                cycleLabel={`Vuelta ${cycle}`}
                matchdays={matchdays}
                teamNames={teamNames}
                renderMatchDetails={renderMatchDetails}
              />
            ))}
          </div>
        ))}

      {knockoutRounds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Cuadro eliminatorio</h4>
          {knockoutRounds.map(([round, tournamentMatches]) => (
            <MatchdayBlock
              key={`knockout-${round}`}
              title={`Round ${round}`}
              tournamentMatches={tournamentMatches}
              teamNames={teamNames}
              renderMatchDetails={renderMatchDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}
