"use client";

import { useEffect, useState } from "react";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import RegisterTournamentModal from "@/components/registerTournamentModal/RegisterTournamentModal";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { TournamentSummaryCard } from "@/components/tournaments/TournamentSummaryCard";
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
        <p className="text-sm text-neutral-500">Explorá torneos vigentes, su fase actual y el avance competitivo disponible.</p>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-neutral-500">No hay torneos vigentes por el momento.</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {rows.map(({ tournament, metrics, phaseSnapshot, winnerTeamNames }) => (
          <TournamentSummaryCard
            key={tournament.id}
            tournament={tournament}
            metrics={metrics}
            phaseSnapshot={phaseSnapshot}
            winnerTeamNames={winnerTeamNames}
            href={`/tournaments/${tournament.id}`}
            footer={userDoc?.roles === "admin" ? (
              <ActionButton
                onClick={() => openRegisterModal(tournament.id)}
                variant="success"
                compact
                disabled={!canRegister(tournament)}
              >
                Inscribirme
              </ActionButton>
            ) : undefined}
          />
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
