"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  tournamentPhaseTypeLabel,
  tournamentStatusLabel,
  type Tournament,
} from "@/types/tournaments";
import type { TournamentPhaseSnapshot, TournamentProgressMetrics } from "@/services/tournaments/tournamentQueries";
import type { UserTournamentState } from "@/services/tournaments/tournamentViewModels";
import TournamentRegistrationHelpModal from "@/components/tournamentRegistrationHelpModal/TournamentRegistrationHelpModal";

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
  showMetrics?: boolean;
  showRegistrationHelp?: boolean;
  shareAction?: ReactNode;
};

const userStateBadgeClass: Record<UserTournamentState["status"], string> = {
  NOT_READY: "bg-red-100 text-red-700",
  READY_PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const paymentStatusLabel: Record<UserTournamentState["payment"]["status"], string> = {
  pending: "Pendiente",
  partial: "Parcial",
  complete: "Completo",
};

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
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
  showMetrics = true,
  showRegistrationHelp = false,
  shareAction,
}: TournamentSummaryCardProps) {
  const [registrationHelpOpen, setRegistrationHelpOpen] = useState(false);
  const winnerTeamNames = Array.isArray(winnerTeamNamesProp) ? winnerTeamNamesProp.filter(Boolean) : [];
  const occupancyLabel = `${metrics.acceptedTeamsCount}/${metrics.maxTeams || metrics.acceptedTeamsCount || 0}`;
  const phaseLabel = phaseSnapshot ? tournamentPhaseTypeLabel[phaseSnapshot.type] : "Sin fase activa";
  const isFinalized = tournament.status === "finalizado";
  const isActive = tournament.status === "activo";
  const podiumLabels = ["1° puesto", "2° puesto", "3° puesto"];
  const statusBadgeClass = isFinalized
    ? "bg-emerald-100 text-emerald-700"
    : isActive
      ? "bg-orange-100 text-orange-700"
      : "bg-neutral-100 text-neutral-700";
  const linkLabel = isFinalized ? "Ver resultados finales →" : "Seguir torneo →";
  const canShowRegistrationHelp = showRegistrationHelp && tournament.status === "inscripciones_abiertas";

  return (
    <article
      className={`
        rounded-md
        bg-white
        border border-neutral-200
        p-5
        space-y-5
        shadow-xs
        transition
        ${
          highlightAsWinner
            ? "border-amber-300 ring-1 ring-amber-200"
            : isFinalized
            ? "border-emerald-200"
            : "border-white/60 dark:border-white/10"
        }
      `}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
              {tournament.name}
            </h2>

            {titleSuffix}
          </div>

          <p className="text-sm text-neutral-500 line-clamp-2">
            {description || tournament.description || "Sin descripción"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`
              text-[11px] font-medium rounded-full px-2.5 py-1 whitespace-nowrap
              ${statusBadgeClass}
            `}
          >
            {tournamentStatusLabel[tournament.status]}
          </span>
          {shareAction}
        </div>
      </div>

      {/* FINALIZADO */}
      {isFinalized ? (
        <section className="rounded-md border border-emerald-200/80 bg-emerald-50/80 dark:bg-emerald-500/10 p-4">
          <p className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold">
            Torneo finalizado
          </p>

          <p className="text-sm text-emerald-900 dark:text-emerald-200 mt-1">
            Resultados definitivos publicados.
            {winnerTeamNames[0]
              ? ` Campeón: ${winnerTeamNames[0]}.`
              : ""}
          </p>
        </section>
      ) : null}

      {/* ESTADO DEL USUARIO */}
      {variant === "profile" && userState ? (
        <section className="rounded-md border border-white/50 dark:border-white/10 bg-neutral-50/80 dark:bg-slate-800/40 p-4 space-y-3">

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                Estado de tu equipo
              </p>

              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {userState.label}
              </p>

              {userState.sublabel ? (
                <p className="text-xs text-neutral-500 mt-1">
                  {userState.sublabel}
                </p>
              ) : null}
            </div>

            <span
              className={`
                rounded-full px-2.5 py-1
                text-[11px] font-medium whitespace-nowrap
                ${userStateBadgeClass[userState.status]}
              `}
            >
              {userState.label}
            </span>
          </div>

          <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-200">
            <li className="flex items-center justify-between gap-3">
              <span className="text-neutral-500">Jugadores</span>
              <span className="font-medium">
                {userState.players.current}/{userState.players.required}
              </span>
            </li>

            <li className="flex items-center justify-between gap-3">
              <span className="text-neutral-500">Pago</span>

              <div className="text-right">
                <span className="font-medium">
                  ${userState.payment.paid} / ${userState.payment.expected}
                </span>

                <p className="text-[11px] text-neutral-500">
                  {paymentStatusLabel[userState.payment.status]}
                </p>
              </div>
            </li>

            <li className="pt-1 border-t border-neutral-200/70 dark:border-white/10">
              <p className="text-neutral-500 text-xs mb-1">
                Próxima acción
              </p>

              <p className="font-medium text-sm text-neutral-900 dark:text-white">
                {userState.nextAction}
              </p>
            </li>
          </ul>
        </section>
      ) : null}

      {/* PROGRESO */}
      {showPhaseProgress ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              Fase actual
            </p>

            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {phaseLabel}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              Equipos aceptados
            </p>

            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {occupancyLabel}
            </p>
          </div>

        </div>
      ) : null}

      {/* PODIO */}
      {showMetrics && isFinalized ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {podiumLabels.map((label, index) => (
            <MetricPill
              key={label}
              label={label}
              value={winnerTeamNames[index] || "Sin definir"}
            />
          ))}
        </div>
      ) : null}

      {/* FOOTER */}
      {(footer || href || canShowRegistrationHelp) ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-neutral-100 dark:border-white/10 pt-4">

          {canShowRegistrationHelp ? (
            <button
              type="button"
              onClick={() => setRegistrationHelpOpen(true)}
              className="
                inline-flex items-center justify-center gap-2
                rounded-lg
                border border-neutral-200 dark:border-white/10
                bg-white/70 dark:bg-slate-900/40
                px-3 py-2
                text-sm font-medium
                text-neutral-700 dark:text-neutral-200
                hover:bg-neutral-50 dark:hover:bg-slate-800
                transition
              "
            >
              ❓ Cómo me inscribo
            </button>
          ) : null}

          {/* ACCIONES */}
          <div className="flex items-center gap-3">
            {footer}

            {href ? (
              <Link
                href={href}
                className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
              >
                {linkLabel}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {registrationHelpOpen ? (
        <TournamentRegistrationHelpModal
          open={registrationHelpOpen}
          onClose={() => setRegistrationHelpOpen(false)}
          tournament={tournament}
        />
      ) : null}
    </article>
  );
}
