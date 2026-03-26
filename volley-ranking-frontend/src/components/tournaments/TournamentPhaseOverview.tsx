import {
  tournamentPhaseStatusLabel,
  tournamentPhaseTypeLabel,
} from "@/types/tournaments";
import type { TournamentPhaseSnapshot, TournamentProgressMetrics } from "@/services/tournaments/tournamentQueries";

type TournamentPhaseOverviewProps = {
  metrics: TournamentProgressMetrics;
  phaseSnapshot: TournamentPhaseSnapshot | null;
  topStanding?: {
    teamName: string;
    position: number;
    stats: {
      points: number;
      setsDiff: number;
      played: number;
    };
  } | null;
};

function OverviewStat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-neutral-500">{helper}</p> : null}
    </div>
  );
}

export function TournamentPhaseOverview({ metrics, phaseSnapshot, topStanding }: TournamentPhaseOverviewProps) {
  const phaseLabel = phaseSnapshot ? tournamentPhaseTypeLabel[phaseSnapshot.type] : "Sin fase activa";
  const phaseStatus = phaseSnapshot ? tournamentPhaseStatusLabel[phaseSnapshot.status] : "Pendiente";
  const completionValue = metrics.matchesCount > 0
    ? `${metrics.completedMatchesCount}/${metrics.matchesCount}`
    : "0/0";
  const progress = metrics.matchesCount > 0
    ? Math.min(100, Math.round((metrics.completedMatchesCount / metrics.matchesCount) * 100))
    : metrics.occupancyPercent;
  const progressLabel = metrics.matchesCount > 0
    ? `Partidos: ${metrics.completedMatchesCount}/${metrics.matchesCount}`
    : `Cupos: ${metrics.acceptedTeamsCount}/${metrics.maxTeams || metrics.acceptedTeamsCount || 0}`;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-orange-600">Resumen de fase</p>
          <h2 className="text-lg font-semibold text-neutral-900">{phaseLabel}</h2>
          <p className="text-sm text-neutral-600">Estado actual: {phaseStatus}.</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-orange-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{progressLabel}</span>
          <span>{progress}% completo</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewStat label="Equipos aceptados" value={`${metrics.acceptedTeamsCount}/${metrics.maxTeams || metrics.acceptedTeamsCount || 0}`} helper="Confirmados sobre el cupo total." />
        <OverviewStat label="Partidos cerrados" value={completionValue} helper="Confirmados dentro de la fase actual." />
        <OverviewStat label="Tabla de posiciones" value={String(metrics.standingsCount)} helper="Equipos publicados en la tabla." />
        <OverviewStat label="Clasificados" value={String(metrics.qualifiedTeamsCount)} helper="Marcados como clasificados por helpers." />
      </div>

      {topStanding ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Líder actual: #{topStanding.position} {topStanding.teamName}</p>
          <p>
            {topStanding.stats.points} pts · {topStanding.stats.played} PJ · diferencia de sets {topStanding.stats.setsDiff}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
          Aún no hay un líder publicado para esta fase.
        </div>
      )}
    </section>
  );
}
