"use client";

import type { Match } from "@/types/match";
import type { TournamentPhaseType } from "@/types/tournaments/tournamentPhase";
import { tournamentPhaseTypeLabel } from "@/types/tournaments/tournamentPhase";
import MatchCard from "@/components/matchCard/MatchCard";

type TournamentDashboardMatch = {
  id: string;
  tournamentId: string;
  tournamentName: string;
  tournamentType: string;
  phaseType: TournamentPhaseType | "group_stage";
  roundLabel?: string | null;
  homeTeamName: string;
  awayTeamName: string;
};

type TournamentDashboardCard = {
  id: string;
  name: string;
  format: string;
  phaseType: TournamentPhaseType | "group_stage";
  description: string;
  teamsCount: number;
  nextMatch: TournamentDashboardMatch | null;
  standings: Array<{ id: string; teamId: string; teamName: string; position: number; points: number; played: number }>;
  upcomingMatches: TournamentDashboardMatch[];
  importantInfo: string[];
};

type UpcomingActivitiesSectionProps = {
  matches: Match[];
  tournaments: TournamentDashboardCard[];
  groupsMap: Record<string, string>;
  userId?: string;
  onSelectTournament?: (tournament: TournamentDashboardCard) => void;
};

export default function UpcomingActivitiesSection({
  matches,
  tournaments,
  groupsMap,
  userId,
  onSelectTournament,
}: UpcomingActivitiesSectionProps) {
  const hasMatches = matches.length > 0;
  const hasTournaments = tournaments.length > 0;
  const hasActivities = hasMatches || hasTournaments;

  if (!hasActivities) {
    return (
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Próximas actividades</h2>
        <div className="rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-slate-900/40 px-4 py-4 text-sm text-neutral-600 dark:text-neutral-400">
          No hay actividades
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Próximas actividades</h2>

      {/* Próximos torneos */}
      {hasTournaments && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Próximos torneos</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {tournaments.map((tournament) => (
              <article
                key={tournament.id}
                className="min-w-[280px] sm:min-w-[320px] rounded-md border border-white/60 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur p-4 space-y-4 shadow-sm hover:shadow-lg hover:-translate-y-[2px] transition cursor-pointer"
                onClick={() => onSelectTournament?.(tournament)}
              >
                <div>
                  <p className="font-semibold">{tournament.name}</p>
                  <div className="text-xs text-neutral-500 flex gap-2">
                    <span>{tournament.format}</span>
                    <span>•</span>
                    <span>{tournamentPhaseTypeLabel[tournament.phaseType]}</span>
                  </div>
                </div>

                <div className="bg-neutral-100/70 dark:bg-slate-800/60 rounded-md p-2 text-sm">
                  {tournament.nextMatch
                    ? `${tournament.nextMatch.homeTeamName} vs ${tournament.nextMatch.awayTeamName}`
                    : "Sin partidos"}
                </div>

                <div>
                  <p className="text-xs text-neutral-500 mb-1">Top actual</p>
                  <ul className="text-sm space-y-0.5">
                    {tournament.standings.slice(0, 3).map((team, i) => (
                      <li key={team.id}>
                        <span className="text-neutral-400 mr-1">{i + 1}.</span>
                        {team.teamName}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTournament?.(tournament);
                  }}
                  className="text-sm font-medium text-orange-600 hover:underline"
                >
                  Ver detalle →
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Próximos partidos */}
      {hasMatches && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Próximos partidos</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                userId={userId}
                groupNombre={groupsMap[match.groupId]}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
