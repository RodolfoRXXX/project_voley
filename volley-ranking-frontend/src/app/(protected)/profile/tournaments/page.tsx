"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TournamentSummaryCard } from "@/components/tournaments/TournamentSummaryCard";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import { getProfileTournamentListView, type ProfileTournamentListRow } from "@/services/tournaments/tournamentQueries";
import type { TournamentStatus } from "@/types/tournaments";

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

type TournamentTypeFilter = "all" | "liga" | "eliminacion" | "mixto";
type TournamentStatusFilter = "all" | TournamentStatus;

export default function ProfileTournamentsPage() {
  const { firebaseUser, userDoc } = useAuth();
  const [rows, setRows] = useState<ProfileTournamentListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TournamentTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<TournamentStatusFilter>("activo");

  useEffect(() => {
    const load = async () => {
      if (!firebaseUser) return;

      setRows(await getProfileTournamentListView(firebaseUser.uid, userDoc?.roles));
      setLoading(false);
    };

    load();
  }, [firebaseUser, userDoc?.roles]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesType = typeFilter === "all" || row.tournament.format === typeFilter;
    const matchesStatus = statusFilter === "all" || row.tournament.status === statusFilter;
    return matchesType && matchesStatus;
  }), [rows, statusFilter, typeFilter]);

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

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-neutral-700">
            <span className="font-medium">Tipo de torneo</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TournamentTypeFilter)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            >
              <option value="all">Todos</option>
              <option value="liga">Liga</option>
              <option value="eliminacion">Eliminación</option>
              <option value="mixto">Mixto</option>
            </select>
          </label>

          <label className="space-y-1 text-sm text-neutral-700">
            <span className="font-medium">Estado del torneo</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as TournamentStatusFilter)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            >
              <option value="activo">Activos</option>
              <option value="all">Todos</option>
              <option value="draft">Borrador</option>
              <option value="inscripciones_abiertas">Inscripciones abiertas</option>
              <option value="inscripciones_cerradas">Inscripciones cerradas</option>
              <option value="finalizado">Finalizados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </label>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <p className="text-sm text-neutral-500">No hay torneos que coincidan con los filtros seleccionados.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredRows.map((row) => (
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
