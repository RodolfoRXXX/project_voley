"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import { tournamentPhaseTypeLabel, tournamentStatusLabel } from "@/types/tournaments";
import RegisterTournamentModal from "@/components/registerTournamentModal/RegisterTournamentModal";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { useAuth } from "@/hooks/useAuth";
import { canRegister } from "@/lib/tournamentAdmin";
import { getPublicTournamentListView, type PublicTournamentListItem } from "@/services/tournaments/tournamentQueries";

function TournamentsSkeleton() {
  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <SkeletonSoft className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <SkeletonSoft className="h-4 w-3/4" />
            <SkeletonSoft className="h-4 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}

export default function TorneosPage() {
  const { userDoc } = useAuth();

  const [rows, setRows] = useState<PublicTournamentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerModalTournamentId, setRegisterModalTournamentId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const nextRows = await getPublicTournamentListView();
      setRows(nextRows);
      setLoading(false);
    };

    load();
  }, []);

  const openRegisterModal = (tournamentId: string) => {
    setRegisterModalTournamentId(tournamentId);
  };

  const closeRegisterModal = () => {
    setRegisterModalTournamentId(null);
  };

  if (loading) return <TournamentsSkeleton />;

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-[var(--foreground)]">Torneos</h1>
        <p className="text-sm text-neutral-500">Explorá torneos vigentes y su estado actual.</p>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-neutral-500">No hay torneos vigentes por el momento.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(({ tournament, currentPhase, acceptedTeamsCount }) => (
          <article key={tournament.id} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-neutral-900">{tournament.name}</h2>
              <span className="text-xs rounded-full px-2 py-1 bg-orange-100 text-orange-700">
                {tournamentStatusLabel[tournament.status]}
              </span>
            </div>
            <p className="text-sm text-neutral-600">{tournament.description || "Sin descripción"}</p>
            <div className="space-y-1 text-xs text-neutral-500">
              <div className="flex gap-4">
                <span>Formato: <b>{tournament.format}</b></span>
                <span>Equipos: <b>{acceptedTeamsCount}/{tournament.maxTeams}</b></span>
              </div>
              <p>Fase actual: <b>{currentPhase ? tournamentPhaseTypeLabel[currentPhase.type] : "Sin fase activa"}</b></p>
            </div>

            <div className="flex items-center justify-between pt-2">
              {userDoc?.roles === "admin" ? (
                <ActionButton
                  onClick={() => openRegisterModal(tournament.id)}
                  variant="success"
                  compact
                  disabled={!canRegister(tournament)}
                >
                  Inscribirme
                </ActionButton>
              ) : (
                <span />
              )}

              <Link
                href={`/tournaments/${tournament.id}`}
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Ver detalle →
              </Link>
            </div>
          </article>
        ))}
      </div>
      <RegisterTournamentModal
        open={registerModalTournamentId !== null}
        onClose={closeRegisterModal}
        tournamentId={registerModalTournamentId}
      />
    </main>
  );
}
