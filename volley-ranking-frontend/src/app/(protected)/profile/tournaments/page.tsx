"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TournamentSummaryCard } from "@/components/tournaments/TournamentSummaryCard";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import { getProfileTournamentListView, type ProfileTournamentListRow } from "@/services/tournaments/tournamentQueries";
import { tournamentStatusLabel, type TournamentStatus } from "@/types/tournaments";

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

const tournamentStatusClass: Record<TournamentStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  inscripciones_abiertas: "bg-blue-100 text-blue-700",
  inscripciones_cerradas: "bg-neutral-100 text-neutral-700",
  activo: "bg-orange-100 text-orange-700",
  finalizado: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
};

type TournamentTypeFilter = "all" | "liga" | "eliminacion" | "mixto";
type TournamentStatusFilter = "all" | TournamentStatus;

function getTournamentDetailHref(row: ProfileTournamentListRow) {
  return row.source === "registration"
    ? `/profile/tournaments/registrations/${row.entryId}`
    : `/profile/tournaments/teams/${row.entryId}`;
}

function getPendingReviewCount(row: ProfileTournamentListRow) {
  const pendingChecks = [
    row.userState.players.current < row.userState.players.required,
    row.userState.payment.status !== "complete",
    row.registrationStatus === "pendiente",
  ];

  return pendingChecks.filter(Boolean).length;
}

function TournamentChevronButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={expanded ? "Contraer torneo" : "Expandir torneo"}
      aria-expanded={expanded}
      className="
        inline-flex h-9 w-9 shrink-0 items-center justify-center
        rounded-lg text-neutral-400
        hover:bg-neutral-100 hover:text-neutral-700
        transition-colors
      "
    >
      <span
        aria-hidden="true"
        className={`
          inline-flex h-4 w-4 items-center justify-center
          transition-transform duration-200
          ${expanded ? "rotate-90" : ""}
        `}
      >
        ›
      </span>
    </button>
  );
}

function CompactTournamentCard({
  row,
  expanded,
  onToggle,
}: {
  row: ProfileTournamentListRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pendingCount = getPendingReviewCount(row);
  const detailHref = getTournamentDetailHref(row);

  return (
    <article className="flex min-h-full flex-col rounded-md border border-neutral-200 bg-white p-5 shadow-xs transition">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 text-lg font-semibold tracking-tight text-neutral-900">
              {row.tournament.name}
            </h2>

            <span className={`text-xs rounded-full px-2 py-1 ${registrationStatusClass[row.registrationStatus]}`}>
              {registrationStatusLabel[row.registrationStatus]}
            </span>

            <span className={`text-xs rounded-full px-2 py-1 ${tournamentStatusClass[row.tournament.status]}`}>
              {tournamentStatusLabel[row.tournament.status]}
            </span>
          </div>

          <p className="text-sm text-neutral-600">
            <span className="font-medium text-neutral-700">Equipo:</span>{" "}
            {row.nameTeam}
          </p>

          {pendingCount > 0 ? (
            <div className="text-xs">
              <p className="font-medium text-amber-700">
                • {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
              </p>
            </div>
          ) : null}
        </div>

        <TournamentChevronButton expanded={expanded} onClick={onToggle} />
      </div>

      <div className="mt-auto flex justify-end pt-4">
        <Link
          href={detailHref}
          className="inline-block text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          Ver detalle
        </Link>
      </div>
    </article>
  );
}

export default function ProfileTournamentsPage() {
  const { firebaseUser, userDoc } = useAuth();
  const [rows, setRows] = useState<ProfileTournamentListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TournamentTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<TournamentStatusFilter>("all");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

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

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-44" />
          <SkeletonSoft className="h-4 w-full max-w-lg" />
        </div>

        <div className="rounded-md border border-neutral-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <SkeletonSoft className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <SkeletonSoft className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[...Array(4)].map((_, idx) => (
            <article key={idx} className="rounded-md border border-neutral-200 bg-white p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-2/3" />
                  <SkeletonSoft className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
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
                <SkeletonSoft className="h-4 w-24" />
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-900">Mis torneos</h1>
        <p className="text-sm text-neutral-500">Seguimiento rápido de tus inscripciones, equipos y del estado competitivo de cada torneo.</p>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4">
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
              <option value="mixto">Grupos y eliminatorias</option>
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
          {filteredRows.map((row) => {
            const expanded = Boolean(expandedRows[row.id]);

            return expanded ? (
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
                shareAction={(
                  <TournamentChevronButton
                    expanded={expanded}
                    onClick={() => toggleRow(row.id)}
                  />
                )}
                footer={(
                  <Link
                    href={getTournamentDetailHref(row)}
                    className="inline-block text-sm font-medium text-orange-600 hover:text-orange-700"
                  >
                    Ver detalle
                  </Link>
                )}
              />
            ) : (
              <CompactTournamentCard
                key={row.id}
                row={row}
                expanded={expanded}
                onToggle={() => toggleRow(row.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
