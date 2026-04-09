"use client";

import { getKnockoutRoundLabel } from "@/lib/tournaments/knockout";
import { tournamentPhaseTypeLabel, type TournamentPhaseType } from "@/types/tournaments/tournamentPhase";

type TournamentDashboardMatch = {
  id: string;
  phaseType: TournamentPhaseType | "group_stage";
  roundLabel?: string | null;
  homeTeamName: string;
  awayTeamName: string;
};

type TournamentDashboardCard = {
  id: string;
  name: string;
  format: string;
  phaseType: TournamentPhaseType | "group_stage";
  description: string;
  teamsCount: number;
  standings: Array<{ id: string; teamName: string; position: number; points: number; played: number }>;
  upcomingMatches: TournamentDashboardMatch[];
  importantInfo: string[];
};

type PublicTournamentDetailModalProps = {
  open: boolean;
  tournamentCard: TournamentDashboardCard | null;
  onClose: () => void;
  onOpenDetail: (tournamentId: string) => void;
};


function getPhaseBadgeLabel(match: TournamentDashboardMatch) {
  if ((match.phaseType === "knockout" || match.phaseType === "final") && match.roundLabel) {
    return getKnockoutRoundLabel(match.roundLabel);
  }

  if (match.phaseType === "final") return "Final";

  return tournamentPhaseTypeLabel[match.phaseType];
}

export default function PublicTournamentDetailModal({
  open,
  tournamentCard,
  onClose,
  onOpenDetail,
}: PublicTournamentDetailModalProps) {
  if (!open || !tournamentCard) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6">
      <section className="w-full max-w-3xl max-h-[90vh] rounded-2xl border border-neutral-200 bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 pb-4 border-b border-neutral-100">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest text-orange-500 font-semibold">Torneo activo</p>
              <h3 className="text-2xl font-bold text-neutral-900 leading-tight">{tournamentCard.name}</h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 transition"
            >
              ✕
            </button>
          </div>

          <p className="mt-4 text-sm text-neutral-600 leading-relaxed">{tournamentCard.description}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-xl border border-neutral-200 p-4 bg-neutral-50/60 space-y-2">
              <p className="text-sm">
                <span className="text-neutral-500">Tipo:</span>{" "}
                <b className="text-neutral-900">{tournamentCard.format}</b>
              </p>
              <p className="text-sm">
                <span className="text-neutral-500">Fase:</span>{" "}
                <b className="text-neutral-900">{tournamentPhaseTypeLabel[tournamentCard.phaseType]}</b>
              </p>
              <p className="text-sm">
                <span className="text-neutral-500">Equipos:</span>{" "}
                <b className="text-neutral-900">{tournamentCard.teamsCount}</b>
              </p>
            </article>

            <article className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2">
              <p className="text-sm font-semibold text-neutral-900">Información importante</p>
              <ul className="mt-2 space-y-1 text-sm text-neutral-600">
                {tournamentCard.importantInfo.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-orange-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <article className="space-y-2">
            <p className="text-sm font-semibold text-neutral-900">Tabla de posiciones</p>

            {tournamentCard.standings.length === 0 ? (
              <p className="text-xs text-neutral-500">Todavía no hay posiciones cargadas.</p>
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2">
                <ul className="text-xs text-neutral-700">
                  {[...tournamentCard.standings]
                    .sort((a, b) => b.points - a.points || a.position - b.position || a.teamName.localeCompare(b.teamName, "es"))
                    .map((standing, i) => (
                    <li
                      key={standing.id}
                      className={`mx-1 px-2 py-1 flex items-center justify-between ${
                        i !== tournamentCard.standings.length - 1 ? "border-b border-neutral-200/70" : ""
                      }`}
                    >
                      <span>
                        #{standing.position} {standing.teamName}
                      </span>
                      <span className="text-neutral-500">
                        {standing.points} pts · {standing.played} PJ
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>

          <article className="space-y-3">
            <p className="text-sm font-semibold text-neutral-900">Próximos partidos</p>

            {tournamentCard.upcomingMatches.length === 0 ? (
              <p className="text-sm text-neutral-500">No hay partidos pendientes.</p>
            ) : (
              <ul className="space-y-2">
                {tournamentCard.upcomingMatches.map((match) => (
                  <li key={match.id} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50 transition">
                    <div className="flex items-center justify-between gap-2">
                      <p>
                        <b>{match.homeTeamName}</b> <span className="text-neutral-400 mx-1">vs</span> <b>{match.awayTeamName}</b>
                      </p>
                      <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                        {getPhaseBadgeLabel(match)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <div className="p-6 pt-4 border-t border-neutral-100 flex justify-end">
          <button
            type="button"
            onClick={() => onOpenDetail(tournamentCard.id)}
            className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 hover:scale-[1.02]"
          >
            Ver detalle completo →
          </button>
        </div>
      </section>
    </div>
  );
}
