import type { ReactNode } from "react";
import { getKnockoutRoundLabel } from "@/lib/tournaments/knockout";
import type { TournamentMatch } from "@/types/tournaments";

type MatchdayGroups = Record<string, TournamentMatch[]>;
type CycleGroups = Record<string, MatchdayGroups>;

export type GroupedTournamentMatches = {
  league: CycleGroups;
  group: Record<string, CycleGroups>;
  knockout: {
    [roundLabel: string]: TournamentMatch[];
  };
};

function isKnockoutTournamentPhase(phaseType: TournamentMatch["phaseType"]) {
  return phaseType === "knockout" || phaseType === "final";
}

function sortNumericEntries<T>(record: Record<string, T>) {
  return Object.entries(record).sort((a, b) => Number(a[0]) - Number(b[0]));
}

function sortKnockoutEntries(record: Record<string, TournamentMatch[]>) {
  const order = ["octavos", "cuartos", "semi", "final"];
  return Object.entries(record).sort((a, b) => {
    const aIndex = order.indexOf(a[0]);
    const bIndex = order.indexOf(b[0]);
    if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
    if (aIndex >= 0) return -1;
    if (bIndex >= 0) return 1;
    return a[0].localeCompare(b[0]);
  });
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
    || Number(a.bracketIndex || 0) - Number(b.bracketIndex || 0)
    || String(a.id).localeCompare(String(b.id))
  );
}

function getTeamLabel(teamId: string | null | undefined, teamNames: Record<string, string>) {
  if (!teamId) return "Por definir";
  return teamNames[teamId] || `Equipo ${teamId.slice(0, 6)}`;
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
        {getTeamLabel(tournamentMatch.homeTeamId, teamNames)} vs {getTeamLabel(tournamentMatch.awayTeamId, teamNames)}
      </p>
      {renderMatchDetails ? <div className="mt-2">{renderMatchDetails(tournamentMatch)}</div> : null}
    </div>
  );
}

function KnockoutMatchCard({
  tournamentMatch,
  teamNames,
  renderMatchDetails,
}: {
  tournamentMatch: TournamentMatch;
  teamNames: Record<string, string>;
  renderMatchDetails?: (tournamentMatch: TournamentMatch) => ReactNode;
}) {
  const winnerId = tournamentMatch.result?.winnerId || null;
  const homeIsWinner = winnerId && tournamentMatch.homeTeamId === winnerId;
  const awayIsWinner = winnerId && tournamentMatch.awayTeamId === winnerId;
  const nextMatchDescription =
    tournamentMatch.sourceHomeMatchId || tournamentMatch.sourceAwayMatchId
      ? null
      : tournamentMatch.roundLabel === "final"
        ? "El ganador será campeón."
        : "El ganador avanza automáticamente al siguiente cruce.";

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Partido {tournamentMatch.bracketIndex || tournamentMatch.sequence || 1}
        </p>
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tournamentMatch.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200"}`}>
          {tournamentMatch.status === "completed" ? "Definido" : "Pendiente"}
        </span>
      </div>

      <div className="space-y-2">
        <div className={`rounded-lg border px-3 py-2 text-sm ${homeIsWinner ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100" : "border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"}`}>
          {getTeamLabel(tournamentMatch.homeTeamId, teamNames)}
        </div>
        <div className={`rounded-lg border px-3 py-2 text-sm ${awayIsWinner ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100" : "border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"}`}>
          {getTeamLabel(tournamentMatch.awayTeamId, teamNames)}
        </div>
      </div>

      {!renderMatchDetails && tournamentMatch.status === "completed" && winnerId && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Avanza: <b>{getTeamLabel(winnerId, teamNames)}</b>
        </p>
      )}

      {!renderMatchDetails && nextMatchDescription && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{nextMatchDescription}</p>
      )}

      {renderMatchDetails ? <div>{renderMatchDetails(tournamentMatch)}</div> : null}
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

function KnockoutBracket({
  rounds,
  teamNames,
  renderMatchDetails,
}: {
  rounds: Array<[string, TournamentMatch[]]>;
  teamNames: Record<string, string>;
  renderMatchDetails?: (tournamentMatch: TournamentMatch) => ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Cuadro eliminatorio</h4>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Los cruces futuros se muestran aunque todavía no tengan equipos definidos.</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        {rounds.map(([roundLabel, tournamentMatches]) => (
          <div key={`knockout-${roundLabel}`} className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-950/20">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{getKnockoutRoundLabel(roundLabel)}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{tournamentMatches.length} cruce{tournamentMatches.length === 1 ? "" : "s"}</p>
            </div>
            <div className="space-y-3">
              {sortMatches(tournamentMatches).map((tournamentMatch) => (
                <KnockoutMatchCard
                  key={tournamentMatch.id}
                  tournamentMatch={tournamentMatch}
                  teamNames={teamNames}
                  renderMatchDetails={renderMatchDetails}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function groupTournamentMatches(tournamentMatches: TournamentMatch[]): GroupedTournamentMatches {
  return tournamentMatches.reduce<GroupedTournamentMatches>(
    (acc, tournamentMatch) => {
      if (isKnockoutTournamentPhase(tournamentMatch.phaseType)) {
        const roundKey = String(tournamentMatch.roundLabel || tournamentMatch.round);
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
  const knockoutRounds = sortKnockoutEntries(groupedTournamentMatches.knockout);
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
        <KnockoutBracket
          rounds={knockoutRounds}
          teamNames={teamNames}
          renderMatchDetails={renderMatchDetails}
        />
      )}
    </div>
  );
}
