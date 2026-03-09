"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDoc, getDocs, query, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { tournamentStatusLabel, type Tournament } from "@/types/tournament";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";

type Registration = {
  tournamentId: string;
  groupId: string;
  nameTeam: string;
  status: string;
};

type Row = {
  tournament: Tournament;
  registrations: Registration[];
};

export default function ProfileTournamentsPage() {
  const { firebaseUser } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!firebaseUser) return;

      const byMemberQ = query(collection(db, "groups"), where("memberIds", "array-contains", firebaseUser.uid));
      const byAdminQ = query(collection(db, "groups"), where("adminIds", "array-contains", firebaseUser.uid));
      const [memberSnap, adminSnap] = await Promise.all([getDocs(byMemberQ), getDocs(byAdminQ)]);
      const groupIds = Array.from(new Set([...memberSnap.docs, ...adminSnap.docs].map((row) => row.id)));

      const registrationsByTournament = new Map<string, Registration[]>();

      await Promise.all(
        groupIds.map(async (groupId) => {
          const regQ = query(collection(db, "tournamentRegistrations"), where("groupId", "==", groupId));
          const regSnap = await getDocs(regQ);
          regSnap.docs.forEach((row) => {
            const data = row.data() as Registration;
            if (!registrationsByTournament.has(data.tournamentId)) {
              registrationsByTournament.set(data.tournamentId, []);
            }
            registrationsByTournament.get(data.tournamentId)?.push(data);
          });
        })
      );

      const tournaments = await Promise.all(
        Array.from(registrationsByTournament.keys()).map(async (tournamentId) => {
          const tournamentSnap = await getDoc(doc(db, "tournaments", tournamentId));
          if (!tournamentSnap.exists()) return null;

          return {
            tournament: {
              id: tournamentSnap.id,
              ...(tournamentSnap.data() as Omit<Tournament, "id">),
            },
            registrations: registrationsByTournament.get(tournamentId) || [],
          };
        })
      );

      setRows(tournaments.filter(Boolean) as Row[]);
      setLoading(false);
    };

    load();
  }, [firebaseUser]);

  if (loading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-7 w-40" />
        {[...Array(3)].map((_, idx) => (
          <SkeletonSoft key={idx} className="h-24 rounded-xl" />
        ))}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-neutral-900">Mis torneos</h1>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavía no tienes torneos asociados.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <article key={row.tournament.id} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-neutral-900">{row.tournament.name}</h2>
                <span className="text-xs rounded-full px-2 py-1 bg-orange-100 text-orange-700">
                  {tournamentStatusLabel[row.tournament.status]}
                </span>
              </div>

              <p className="text-sm text-neutral-600">Equipos asociados: {row.registrations.length}</p>

              <Link href={`/profile/tournaments/${row.tournament.id}`} className="text-sm font-medium text-orange-600 hover:text-orange-700">
                Ver detalle →
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
