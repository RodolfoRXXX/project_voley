import type { ReactNode } from "react";
import Link from "next/link";
import {
  tournamentPhaseStatusLabel,
  tournamentPhaseTypeLabel,
  tournamentStatusLabel,
  type Tournament,
} from "@/types/tournaments";
import type { TournamentPhaseSnapshot, TournamentProgressMetrics } from "@/services/tournaments/tournamentQueries";
import type { UserTournamentState } from "@/services/tournaments/tournamentViewModels";

type TournamentSummaryCardProps = {
  tournament: Tournament;
  metrics: TournamentProgressMetrics;
  phaseSnapshot: TournamentPhaseSnapshot | null;
  description?: string;
  titleSuffix?: ReactNode;
  footer?: ReactNode;
  href?: string;
  variant?: "default" | "profile";
  userState?: UserTournamentState;
  winnerTeamNames?: string[];
  highlightAsWinner?: boolean;
  showPhaseProgress?: boolean;
};

const userStateBadgeClass: Record<UserTournamentState["status"], string> = {
  NOT_READY: "bg-red-100 text-red-700",
  READY_PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
};

const paymentStatusLabel: Record<UserTournamentState["payment"]["status"], string> = {
  pending: "Pendiente",
  partial: "Parcial",
  complete: "Completo",
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
  variant = "default",
  userState,
  winnerTeamNames: winnerTeamNamesProp,
  highlightAsWinner = false,
  showPhaseProgress = true,
}: TournamentSummaryCardProps) {
  const winnerTeamNames = Array.isArray(winnerTeamNamesProp) ? winnerTeamNamesProp.filter(Boolean) : [];
  const occupancyLabel = `${metrics.acceptedTeamsCount}/${metrics.maxTeams || metrics.acceptedTeamsCount || 0}`;
  const phaseLabel = phaseSnapshot ? tournamentPhaseTypeLabel[phaseSnapshot.type] : "Sin fase activa";
  const phaseStatusLabel = phaseSnapshot ? tournamentPhaseStatusLabel[phaseSnapshot.status] : "Pendiente";
  const completionLabel = metrics.matchesCount > 0
    ? `${metrics.completedMatchesCount}/${metrics.matchesCount}`
    : "Sin fixtures";
  const isFinalized = tournament.status === "finalizado";
  const currentPhaseType = phaseSnapshot?.type || "registration";
  const progress = currentPhaseType === "registration"
    ? metrics.occupancyPercent
    : metrics.matchesCount > 0
      ? Math.min(100, Math.round((metrics.completedMatchesCount / metrics.matchesCount) * 100))
      : 0;
  const progressLabel = currentPhaseType === "registration"
    ? `Inscripción: ${metrics.acceptedTeamsCount}/${metrics.maxTeams || metrics.acceptedTeamsCount || 0} equipos`
    : `Partidos: ${metrics.completedMatchesCount}/${metrics.matchesCount}`;
  const winnersLabel = winnerTeamNames.length > 0 ? winnerTeamNames.join(", ") : "Sin ganador publicado";

  return (
    <article className={`rounded-xl border bg-white p-5 space-y-5 shadow-sm shadow-neutral-100/60 ${highlightAsWinner ? "border-amber-400 ring-2 ring-amber-200" : "border-neutral-200"}`}>
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

      {variant === "profile" && userState ? (
        <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Estado de tu equipo</p>
              <p className="text-sm font-semibold text-neutral-900">{userState.label}</p>
              {userState.sublabel ? (
                <p className="text-xs text-neutral-600 mt-1">{userState.sublabel}</p>
              ) : null}
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap ${userStateBadgeClass[userState.status]}`}>
              {userState.label}
            </span>
          </div>

          <ul className="space-y-1.5 text-sm text-neutral-700">
            <li><b>Jugadores:</b> {userState.players.current}/{userState.players.required}</li>
            <li>
              <b>Pago:</b> ${userState.payment.paid} / ${userState.payment.expected}
              <span className="ml-2 text-xs text-neutral-500">({paymentStatusLabel[userState.payment.status]})</span>
            </li>
            <li><b>Próxima acción:</b> {userState.nextAction}</li>
          </ul>
        </section>
      ) : null}

      {showPhaseProgress ? (
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
            <div className="h-full rounded-full bg-orange-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>{progressLabel}</span>
            <span>{progress}% completo</span>
          </div>
        </div>
      ) : null}

      {isFinalized ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <MetricPill label="Ganador(es)" value={winnersLabel} />
          <MetricPill label="Partidos completados" value={completionLabel} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricPill label="Equipos" value={occupancyLabel} />
          <MetricPill label="Partidos" value={completionLabel} />
          <MetricPill label="Posiciones" value={String(metrics.standingsCount)} />
          <MetricPill label="Clasificados" value={String(metrics.qualifiedTeamsCount)} />
        </div>
      )}

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
