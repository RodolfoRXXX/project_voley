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
      <div className="space-y-1">
        <Skeleton className="h-9 w-44" />
        <SkeletonSoft className="h-4 w-full max-w-xl" />
      </div>

      {[1, 2].map((section) => (
        <section key={section} className="space-y-3">
          <Skeleton className="h-7 w-52" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[1, 2].map((idx) => (
              <div key={`${section}-${idx}`} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-2/3" />
                    <SkeletonSoft className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <SkeletonSoft className="h-10 rounded-lg" />
                  <SkeletonSoft className="h-10 rounded-lg" />
                </div>

                <div className="space-y-2">
                  <SkeletonSoft className="h-4 w-full" />
                  <SkeletonSoft className="h-4 w-5/6" />
                </div>

                <div className="pt-2 border-t border-neutral-100">
                  <Skeleton className="h-9 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
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
  const activeRows = rows.filter((row) => row.tournament.status === "activo");
  const finalizedRows = rows.filter((row) => row.tournament.status === "finalizado");
  const otherRows = rows.filter((row) => row.tournament.status !== "activo" && row.tournament.status !== "finalizado");

  if (loading) return <TournamentsSkeleton />;

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-[var(--foreground)]">Torneos</h1>
        <p className="text-sm text-neutral-500">Explorá torneos activos y finalizados, su fase actual y el avance competitivo disponible.</p>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-neutral-500">No hay torneos disponibles por el momento.</p>
      )}

      {activeRows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-900">Torneos en juego</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {activeRows.map(({ tournament, metrics, phaseSnapshot, winnerTeamNames }) => (
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
        </section>
      ) : null}

      {finalizedRows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-900">Torneos finalizados</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {finalizedRows.map(({ tournament, metrics, phaseSnapshot, winnerTeamNames }) => (
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
        </section>
      ) : null}

      {otherRows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-900">Otros estados</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {otherRows.map(({ tournament, metrics, phaseSnapshot, winnerTeamNames }) => (
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
        </section>
      ) : null}
      <RegisterTournamentModal
        open={registerModalTournamentId !== null}
        onClose={closeRegisterModal}
        tournamentId={registerModalTournamentId}
      />
    </main>
  );
}
