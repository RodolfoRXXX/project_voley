"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { tournamentStatusLabel, type Tournament } from "@/types/tournaments";
import type { TournamentRegistration } from "@/types/tournaments";
import { getTournamentById, getTournamentRegistrations, getTournamentTeams, getUserTournamentGroupIds, type TournamentTeamRow } from "@/services/tournaments/tournamentQueries";

export default function ProfileTournamentDetailPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { firebaseUser } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeamRow[]>([]);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);

  const visibleTeams = useMemo(() => {
    return teams.filter((team) => team.groupId && myGroupIds.includes(team.groupId));
  }, [teams, myGroupIds]);

  const visibleRegistrations = useMemo(() => {
    return registrations.filter((registration) => registration.groupId && myGroupIds.includes(registration.groupId));
  }, [registrations, myGroupIds]);

  useEffect(() => {
    const load = async () => {
      if (!firebaseUser || !tournamentId) return;

      setMyGroupIds(await getUserTournamentGroupIds(firebaseUser.uid));
      setTournament(await getTournamentById(tournamentId));
      setTeams(await getTournamentTeams(tournamentId));
      setRegistrations(await getTournamentRegistrations(tournamentId));
    };

    load();
  }, [firebaseUser, tournamentId]);

  if (!tournament) {
    return <p className="text-sm text-neutral-500">Cargando torneo...</p>;
  }

  return (
    <section className="space-y-5">
      <Link href="/profile/tournaments" className="text-sm text-neutral-600 hover:underline">← Volver a mis torneos</Link>

      <header className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">{tournament.name}</h1>
        <p className="text-sm text-neutral-600">{tournament.description || "Sin descripción"}</p>
        <span className="inline-block text-xs rounded-full px-2 py-1 bg-orange-100 text-orange-700">
          {tournamentStatusLabel[tournament.status]}
        </span>
      </header>

      <article className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">Equipos (tournamentTeams)</h2>
        {visibleTeams.length === 0 ? (
          <p className="text-sm text-neutral-500">Sin datos en tournamentTeams para tus grupos.</p>
        ) : (
          <ul className="space-y-2 text-sm text-neutral-700">
            {visibleTeams.map((team) => (
              <li key={team.id} className="rounded-lg border border-neutral-200 p-3">
                <p><b>Equipo:</b> {team.nameTeam || team.id}</p>
                <p><b>Grupo:</b> {team.groupId || "-"}</p>
                <p><b>Puntos:</b> {team.stats?.points ?? team.points ?? 0}</p>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">Inscripciones relacionadas</h2>
        {visibleRegistrations.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay inscripciones de tus grupos en este torneo.</p>
        ) : (
          <ul className="space-y-2 text-sm text-neutral-700">
            {visibleRegistrations.map((registration) => (
              <li key={registration.id} className="rounded-lg border border-neutral-200 p-3">
                <p><b>Equipo:</b> {registration.nameTeam || registration.id}</p>
                <p><b>Grupo:</b> {registration.groupId}</p>
                <p><b>Estado:</b> {registration.status || "-"}</p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
