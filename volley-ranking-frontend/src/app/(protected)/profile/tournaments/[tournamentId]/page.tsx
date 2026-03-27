"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { tournamentStatusLabel } from "@/types/tournaments";
import { TournamentPodiumCard } from "@/components/tournaments/TournamentPodiumCard";
import { TournamentAdminsCard } from "@/components/tournaments/TournamentAdminsCard";
import { getProfileTournamentDetailView, getTournamentTeams, getUsersByIds, type ProfileTournamentDetailView } from "@/services/tournaments/tournamentQueries";

export default function ProfileTournamentDetailPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { firebaseUser } = useAuth();
  const [view, setView] = useState<ProfileTournamentDetailView | null>(null);
  const [adminUsers, setAdminUsers] = useState<Array<{ id: string; name: string; photoURL: string | null }>>([]);
  const [winnerTeamNames, setWinnerTeamNames] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!firebaseUser || !tournamentId) return;
      const nextView = await getProfileTournamentDetailView(tournamentId, firebaseUser.uid);
      setView(nextView);
      if (!nextView) return;

      const [users, allTeams] = await Promise.all([
        getUsersByIds(nextView.tournament.adminIds || []),
        getTournamentTeams(nextView.tournament.id),
      ]);
      setAdminUsers(users.map((user) => ({
        id: user.id,
        name: user.nombre || "Administrador",
        photoURL: user.photoURL || null,
      })));

      const teamNameById = new Map(
        allTeams.map((team) => [team.id, team.nameTeam || team.name || team.id])
      );
      const podiumIds = Array.isArray(nextView.tournament.podiumTeamIds) ? nextView.tournament.podiumTeamIds.filter(Boolean) : [];
      setWinnerTeamNames(podiumIds.map((teamId) => teamNameById.get(teamId) || teamId));
    };

    load();
  }, [firebaseUser, tournamentId]);

  if (!view) {
    return <p className="text-sm text-neutral-500">Cargando torneo...</p>;
  }

  const { tournament, teams, registrations } = view;

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
      <TournamentPodiumCard winnerTeamNames={winnerTeamNames} status={tournament.status} />
      <TournamentAdminsCard admins={adminUsers} />

      <article className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">Equipos (tournamentTeams)</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-neutral-500">Sin datos en tournamentTeams para tus grupos.</p>
        ) : (
          <ul className="space-y-2 text-sm text-neutral-700">
            {teams.map((team) => (
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
        {registrations.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay inscripciones de tus grupos en este torneo.</p>
        ) : (
          <ul className="space-y-2 text-sm text-neutral-700">
            {registrations.map((registration) => (
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
