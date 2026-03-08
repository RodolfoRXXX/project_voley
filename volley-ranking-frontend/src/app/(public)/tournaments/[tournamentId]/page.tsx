"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { tournamentStatusLabel, type Tournament } from "@/types/tournament";

type TeamRow = {
  id: string;
  nameTeam?: string;
  groupLabel?: string;
  stats?: { points?: number; matchesPlayed?: number };
};

export default function PublicTournamentDetailPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!tournamentId) return;

      const tournamentSnap = await getDoc(doc(db, "tournaments", tournamentId));
      if (tournamentSnap.exists()) {
        setTournament({ id: tournamentSnap.id, ...(tournamentSnap.data() as Omit<Tournament, "id">) });
      }

      const teamSnap = await getDocs(
        query(collection(db, "tournamentTeams"), where("tournamentId", "==", tournamentId))
      );

      setTeams(
        teamSnap.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<TeamRow, "id">),
        }))
      );
    };

    load();
  }, [tournamentId]);

  if (!tournament) {
    return <p className="text-sm text-neutral-500">Cargando torneo...</p>;
  }

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <Link href="/tournaments" className="text-sm text-neutral-600 hover:underline">← Volver a torneos</Link>

      <header className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">{tournament.name}</h1>
        <p className="text-sm text-neutral-600">{tournament.description || "Sin descripción"}</p>
        <span className="inline-block text-xs rounded-full px-2 py-1 bg-orange-100 text-orange-700">
          {tournamentStatusLabel[tournament.status]}
        </span>
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">Equipos del torneo</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-neutral-500">Aún no hay equipos publicados.</p>
        ) : (
          <ul className="space-y-2 text-sm text-neutral-700">
            {teams.map((team) => (
              <li key={team.id} className="rounded-lg border border-neutral-200 p-3">
                <p><b>Equipo:</b> {team.nameTeam || team.id}</p>
                <p><b>Grupo:</b> {team.groupLabel || "-"}</p>
                <p><b>Puntos:</b> {team.stats?.points ?? 0}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
