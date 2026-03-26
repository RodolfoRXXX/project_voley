"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TournamentSummaryCard } from "@/components/tournaments/TournamentSummaryCard";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import { getProfileTournamentListView, type ProfileTournamentListRow } from "@/services/tournaments/tournamentQueries";

const registrationStatusLabel = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
} as const;

const registrationStatusClass = {
  pendiente: "bg-yellow-100 text-yellow-700",
  aceptado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
} as const;

export default function ProfileTournamentsPage() {
  const { firebaseUser, userDoc } = useAuth();
  const [rows, setRows] = useState<ProfileTournamentListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!firebaseUser) return;

      setRows(await getProfileTournamentListView(firebaseUser.uid, userDoc?.roles));
      setLoading(false);
    };

    load();
  }, [firebaseUser, userDoc?.roles]);

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
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-900">Mis torneos</h1>
        <p className="text-sm text-neutral-500">Seguimiento rápido de tus inscripciones, equipos y del estado competitivo de cada torneo.</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No tienes inscripciones o equipos de torneos todavía.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {rows.map((row) => (
            <TournamentSummaryCard
              key={row.id}
              tournament={row.tournament}
              metrics={row.metrics}
              phaseSnapshot={row.phaseSnapshot}
              winnerTeamNames={row.winnerTeamNames}
              highlightAsWinner={row.isWinnerTeam}
              description={`Tu equipo: ${row.nameTeam}`}
              titleSuffix={(
                <span className={`text-xs rounded-full px-2 py-1 ${registrationStatusClass[row.registrationStatus]}`}>
                  {registrationStatusLabel[row.registrationStatus]}
                </span>
              )}
              variant="profile"
              userState={row.userState}
              footer={row.registrationStatus === "rechazado" ? (
                <span className="inline-block text-sm font-medium text-neutral-400 cursor-not-allowed">
                  Ver detalle
                </span>
              ) : (
                <Link
                  href={
                    row.source === "registration"
                      ? `/profile/tournaments/registrations/${row.entryId}`
                      : `/profile/tournaments/teams/${row.entryId}`
                  }
                  className="inline-block text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  Ver detalle
                </Link>
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
