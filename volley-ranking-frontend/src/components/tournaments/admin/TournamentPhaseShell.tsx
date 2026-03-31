import type { ReactNode } from "react";
import {
  tournamentPhaseStatusLabel,
  tournamentPhaseTypeLabel,
  type TournamentPhase,
} from "@/types/tournaments";

function PhaseStatusBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
      {value}
    </span>
  );
}

export function TournamentPhaseTimeline({
  phases,
  currentPhaseId,
  loading,
}: {
  phases: TournamentPhase[];
  currentPhaseId?: string | null;
  loading?: boolean;
}) {
  if (loading && phases.length === 0) {
    return <p className="text-xs text-neutral-500 dark:text-neutral-400">Cargando timeline de fases...</p>;
  }

  if (phases.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Todavía no hay fases cargadas para este torneo.</p>;
  }

  return (
    <div className="space-y-3">
      {phases.map((phase) => {
        const isCurrent = phase.id === currentPhaseId;
        return (
          <div
            key={phase.id}
            className={`rounded-lg border p-3 ${isCurrent ? "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950" : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p
                  className={`text-xs uppercase tracking-wide ${isCurrent ? "text-neutral-500 dark:text-orange-200" : "text-neutral-500 dark:text-neutral-400"}`}
                >
                  Fase {phase.order}
                </p>
                <h4 className={`text-sm font-semibold ${isCurrent ? "text-neutral-900 dark:text-orange-100" : "text-neutral-900 dark:text-neutral-100"}`}>
                  {tournamentPhaseTypeLabel[phase.type]}
                  {isCurrent ? " · actual" : ""}
                </h4>
              </div>
              <PhaseStatusBadge value={tournamentPhaseStatusLabel[phase.status]} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TournamentPhaseShell({
  currentPhase,
  loadingPhases,
  timeline,
  children,
}: {
  currentPhase: TournamentPhase | null;
  loadingPhases?: boolean;
  timeline?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-5 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-orange-600">Operación de fase</p>
            <div className="mt-1 inline-flex rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 dark:border-orange-800 dark:bg-orange-950">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-orange-100">
                {currentPhase ? tournamentPhaseTypeLabel[currentPhase.type] : "Sin fase activa"}
              </h2>
            </div>
          </div>
          {loadingPhases ? <p className="text-xs text-neutral-500">Sincronizando fases...</p> : null}
        </div>

        <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Timeline de fases</h3>
          <div className="mt-3">{timeline}</div>
        </div>
      </div>

      <div className="space-y-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">{children}</div>
    </section>
  );
}
