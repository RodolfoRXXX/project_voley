"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";
import { Tournament, tournamentStatusLabel } from "@/types/tournament";

export default function AdminTournamentDetailPage() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = params?.tournamentId;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;

    const load = async () => {
      const ref = doc(db, "tournaments", tournamentId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setTournament({ id: snap.id, ...(snap.data() as Omit<Tournament, "id">) });
      }

      setLoading(false);
    };

    load();
  }, [tournamentId]);

  if (loading) {
    return <p className="text-sm text-neutral-500">Cargando torneo...</p>;
  }

  if (!tournament) {
    return <p className="text-sm text-neutral-500">Torneo no encontrado.</p>;
  }

  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 pb-12 space-y-6">
      <AdminBreadcrumb
        items={[
          { label: "Gestión", href: "/admin/groups" },
          { label: "Torneos", href: "/admin/tournaments" },
          { label: tournament.name },
        ]}
      />

      <header className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-neutral-900">{tournament.name}</h1>
          <span className="text-xs rounded-full px-2 py-1 bg-orange-100 text-orange-700">
            {tournamentStatusLabel[tournament.status]}
          </span>
        </div>
        <p className="text-sm text-neutral-600">{tournament.description || "Sin descripción"}</p>
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <h2 className="text-base font-semibold text-neutral-900">Información del torneo</h2>
        <div className="text-sm text-neutral-600 grid sm:grid-cols-2 gap-2">
          <p>Formato: <b>{tournament.format}</b></p>
          <p>Deporte: <b>{tournament.sport}</b></p>
          <p>Equipos mínimos: <b>{tournament.minTeams}</b></p>
          <p>Equipos máximos: <b>{tournament.maxTeams}</b></p>
          <p>Equipos aceptados: <b>{tournament.acceptedTeamsCount || 0}</b></p>
          <p>Admins asignados: <b>{tournament.adminIds?.length || 0}</b></p>
        </div>
      </section>
    </main>
  );
}
