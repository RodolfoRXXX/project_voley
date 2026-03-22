"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TournamentPhaseOverview } from "@/components/tournaments/TournamentPhaseOverview";
import { TournamentSummaryCard } from "@/components/tournaments/TournamentSummaryCard";
import {
  getTournamentLeagueProgress,
  groupTournamentMatches,
  TournamentMatchSummaryList,
} from "@/components/tournaments/admin/TournamentMatchSections";
import { getPublicTournamentDetailView, type PublicTournamentDetailView } from "@/services/tournaments/tournamentQueries";

export default function PublicTournamentDetailPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [view, setView] = useState<PublicTournamentDetailView | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!tournamentId) return;
      setView(await getPublicTournamentDetailView(tournamentId));
    };

    load();
  }, [tournamentId]);

  if (!view) {
    return <p className="text-sm text-neutral-500">Cargando torneo...</p>;
  }

  const { tournament, teams, matches, standings, metrics, phaseSnapshot, topStanding } = view;
  const isLeaguePhase = view.currentPhase?.type === "round_robin";
  const groupedMatches = groupTournamentMatches(matches);
  const leagueProgress = getTournamentLeagueProgress(matches);
  const isKnockoutPhase = view.currentPhase?.type === "knockout" || view.currentPhase?.type === "final";
  const teamNames = teams.reduce<Record<string, string>>((acc, team) => {
    acc[team.id] = team.name;
    return acc;
  }, {});

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <Link href="/tournaments" className="text-sm text-neutral-600 hover:underline">← Volver a torneos</Link>

      <TournamentSummaryCard
        tournament={tournament}
        metrics={metrics}
        phaseSnapshot={phaseSnapshot}
        description={tournament.description || "Seguimiento público del torneo y sus métricas principales."}
      />

      <TournamentPhaseOverview metrics={metrics} phaseSnapshot={phaseSnapshot} topStanding={topStanding} />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-neutral-900">{isLeaguePhase ? "Tabla principal" : isKnockoutPhase ? "Resumen mínimo" : "Tabla actual"}</h2>
            <span className="text-xs text-neutral-500">{standings.length} filas</span>
          </div>

          {isLeaguePhase && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Líder</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {topStanding ? `#${topStanding.position} ${topStanding.teamName}` : "Sin datos"}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Partidos</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {leagueProgress.completedMatches} jugados / {leagueProgress.pendingMatches} pendientes
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Jornadas</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {leagueProgress.completedMatchdays} de {leagueProgress.totalMatchdays} completas
                </p>
              </div>
            </div>
          )}

          {isKnockoutPhase && (
            <p className="text-sm text-neutral-500">
              En eliminación directa el cuadro es la referencia principal. Esta tabla queda sólo como apoyo estadístico mínimo.
            </p>
          )}

          {standings.length === 0 ? (
            <p className="text-sm text-neutral-500">Todavía no hay tabla de posiciones para la fase actual.</p>
          ) : (
            <ul className="space-y-2 text-sm text-neutral-700">
              {standings.map((standing) => (
                <li key={standing.id} className="rounded-lg border border-neutral-200 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-neutral-900">#{standing.position} {standing.teamName}</p>
                    <span className={`text-xs rounded-full px-2 py-1 ${standing.qualified ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>
                      {standing.qualified ? "Clasificado" : "En competencia"}
                    </span>
                  </div>
                  {!isLeaguePhase && !isKnockoutPhase && <p><b>Grupo:</b> {standing.groupLabel || "-"}</p>}
                  <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600 sm:grid-cols-4">
                    <span>Puntos: <b>{standing.stats.points}</b></span>
                    <span>PJ: <b>{standing.stats.played}</b></span>
                    <span>Sets: <b>{standing.stats.setsFor}-{standing.stats.setsAgainst}</b></span>
                    <span>Dif. sets: <b>{standing.stats.setsDiff}</b></span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-neutral-900">Equipos del torneo</h2>
            <span className="text-xs text-neutral-500">{teams.length} publicados</span>
          </div>
          {teams.length === 0 ? (
            <p className="text-sm text-neutral-500">Aún no hay equipos publicados.</p>
          ) : (
            <ul className="space-y-2 text-sm text-neutral-700">
              {teams.map((team) => (
                <li key={team.id} className="rounded-lg border border-neutral-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p><b>Equipo:</b> {team.name}</p>
                    {!isLeaguePhase && !isKnockoutPhase && (
                      <span className="text-xs rounded-full bg-neutral-100 px-2 py-1 text-neutral-600">
                        {team.groupLabel || "Sin grupo"}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-neutral-900">
            {isLeaguePhase ? "Fixture por jornadas" : isKnockoutPhase ? "Bracket de la fase actual" : "Fixture de la fase actual"}
          </h2>
          <span className="text-xs text-neutral-500">{matches.length} partidos</span>
        </div>
        {matches.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {isLeaguePhase ? "Todavía no se publicó el calendario de la liga." : "Todavía no hay fixture publicado para esta fase."}
          </p>
        ) : (
          <TournamentMatchSummaryList groupedTournamentMatches={groupedMatches} teamNames={teamNames} />
        )}
      </section>
    </main>
  );
}
