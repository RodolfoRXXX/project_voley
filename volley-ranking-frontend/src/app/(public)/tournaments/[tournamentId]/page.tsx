"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  tournamentPhaseStatusLabel,
  tournamentPhaseTypeLabel,
} from "@/types/tournaments";
import { tournamentStatusLabel } from "@/types/tournaments";
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

  const { tournament, currentPhase, teams, matchesCount, standings } = view;

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <Link href="/tournaments" className="text-sm text-neutral-600 hover:underline">← Volver a torneos</Link>

      <header className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">{tournament.name}</h1>
        <p className="text-sm text-neutral-600">{tournament.description || "Sin descripción"}</p>
        <span className="inline-block text-xs rounded-full px-2 py-1 bg-orange-100 text-orange-700">
          {tournamentStatusLabel[tournament.status]}
        </span>
        <div className="grid gap-2 text-sm text-neutral-700 sm:grid-cols-3">
          <p><b>Formato:</b> {tournament.format}</p>
          <p><b>Equipos aceptados:</b> {tournament.acceptedTeamsCount || 0}/{tournament.maxTeams}</p>
          <p><b>Fase actual:</b> {currentPhase ? tournamentPhaseTypeLabel[currentPhase.type] : "Sin fase activa"}</p>
        </div>
        {currentPhase && (
          <p className="text-sm text-neutral-700">
            <b>Estado de fase:</b> {tournamentPhaseStatusLabel[currentPhase.status]}
          </p>
        )}
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">Equipos del torneo</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-neutral-500">Aún no hay equipos publicados.</p>
        ) : (
          <ul className="space-y-2 text-sm text-neutral-700">
            {teams.map((team) => (
              <li key={team.id} className="rounded-lg border border-neutral-200 p-3">
                <p><b>Equipo:</b> {team.name}</p>
                <p><b>Grupo:</b> {team.groupLabel || "-"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">Resumen competitivo</h2>
        <p className="text-sm text-neutral-700">
          <b>Partidos generados para la fase actual:</b> {matchesCount}
        </p>

        {standings.length === 0 ? (
          <p className="text-sm text-neutral-500">Todavía no hay tabla de posiciones para la fase actual.</p>
        ) : (
          <ul className="space-y-2 text-sm text-neutral-700">
            {standings.map((standing) => (
              <li key={standing.id} className="rounded-lg border border-neutral-200 p-3">
                <p><b>Posición:</b> {standing.position}</p>
                <p><b>Equipo:</b> {standing.teamName}</p>
                <p><b>Grupo:</b> {standing.groupLabel || "-"}</p>
                <p><b>Puntos:</b> {standing.stats.points}</p>
                <p><b>Sets:</b> {standing.stats.setsFor}-{standing.stats.setsAgainst}</p>
                <p><b>Clasificado:</b> {standing.qualified ? "Sí" : "No"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
