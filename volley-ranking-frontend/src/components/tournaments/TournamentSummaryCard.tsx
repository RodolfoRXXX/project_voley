import type { ReactNode } from "react";
import Link from "next/link";
import {
  tournamentPhaseStatusLabel,
  tournamentPhaseTypeLabel,
  tournamentStatusLabel,
  type Tournament,
} from "@/types/tournaments";
import type { TournamentPhaseSnapshot, TournamentProgressMetrics } from "@/services/tournaments/tournamentQueries";

type TournamentSummaryCardProps = {
  tournament: Tournament;
  metrics: TournamentProgressMetrics;
  phaseSnapshot: TournamentPhaseSnapshot | null;
  description?: string;
  titleSuffix?: ReactNode;
  footer?: ReactNode;
  href?: string;
};

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

export function TournamentSummaryCard({
  tournament,
  metrics,
  phaseSnapshot,
  description,
  titleSuffix,
  footer,
  href,
}: TournamentSummaryCardProps) {
  const occupancyLabel = `${metrics.acceptedTeamsCount}/${metrics.maxTeams || metrics.acceptedTeamsCount || 0}`;
  const phaseLabel = phaseSnapshot ? tournamentPhaseTypeLabel[phaseSnapshot.type] : "Sin fase activa";
  const phaseStatusLabel = phaseSnapshot ? tournamentPhaseStatusLabel[phaseSnapshot.status] : "Pendiente";
  const completionLabel = metrics.matchesCount > 0
    ? `${metrics.completedMatchesCount}/${metrics.matchesCount}`
    : "Sin fixtures";

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4 shadow-sm shadow-neutral-100/60">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-neutral-900">{tournament.name}</h2>
            {titleSuffix}
          </div>
          <p className="text-sm text-neutral-600 line-clamp-2">{description || tournament.description || "Sin descripción"}</p>
        </div>
        <span className="text-xs rounded-full px-2 py-1 bg-orange-100 text-orange-700 whitespace-nowrap">
          {tournamentStatusLabel[tournament.status]}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm text-neutral-700">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Fase actual</p>
            <p className="font-semibold text-neutral-900">{phaseLabel}</p>
          </div>
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
            {phaseStatusLabel}
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-orange-500" style={{ width: `${metrics.occupancyPercent}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>Cupos confirmados</span>
          <span>{metrics.occupancyPercent}% completo</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricPill label="Equipos" value={occupancyLabel} />
        <MetricPill label="Partidos" value={completionLabel} />
        <MetricPill label="Standings" value={String(metrics.standingsCount)} />
        <MetricPill label="Clasificados" value={String(metrics.qualifiedTeamsCount)} />
      </div>

      {footer || href ? (
        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
          <div className="text-xs text-neutral-500">
            {metrics.groupedTeamsCount > 0
              ? `${metrics.groupedTeamsCount} equipos ya tienen grupo asignado`
              : "Todavía no hay grupos asignados"}
          </div>
          <div className="flex items-center gap-3">
            {footer}
            {href ? (
              <Link href={href} className="text-sm font-medium text-orange-600 hover:text-orange-700">
                Ver detalle →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
