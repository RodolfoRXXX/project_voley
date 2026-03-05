"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";
import { Tournament, tournamentStatusLabel } from "@/types/tournament";

export default function AdminTournamentsPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;

    const loadTournaments = async () => {
      const tournamentsRef = collection(db, "tournaments");
      const snap = await getDocs(
        query(
          tournamentsRef,
          where("adminIds", "array-contains", firebaseUser.uid),
          orderBy("updatedAt", "desc")
        )
      );

      const rows = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Tournament, "id">),
      }));

      setTournaments(rows);
      setLoading(false);
    };

    loadTournaments();
  }, [authLoading, firebaseUser]);

  if (loading || authLoading) {
    return <p className="text-sm text-neutral-500">Cargando torneos...</p>;
  }

  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 pb-12 space-y-6">
      <AdminBreadcrumb items={[{ label: "Gestión" }, { label: "Torneos" }]} />

      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-900">Mis torneos</h1>
        <p className="text-sm text-neutral-500">Torneos donde sos owner o admin gestor.</p>
      </div>

      {tournaments.length === 0 && <p className="text-sm text-neutral-500">Todavía no tenés torneos.</p>}

      <div className="grid gap-4">
        {tournaments.map((tournament) => (
          <article key={tournament.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-neutral-900">{tournament.name}</h2>
                <p className="text-sm text-neutral-600">{tournament.description || "Sin descripción"}</p>
                <div className="text-xs text-neutral-500 flex gap-4 pt-1">
                  <span>Estado: <b>{tournamentStatusLabel[tournament.status]}</b></span>
                  <span>Equipos: <b>{tournament.acceptedTeamsCount || 0}/{tournament.maxTeams}</b></span>
                </div>
              </div>

              <Link
                href={`/admin/tournaments/${tournament.id}`}
                className="px-3 py-1.5 rounded-lg border text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Ver detalle
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
