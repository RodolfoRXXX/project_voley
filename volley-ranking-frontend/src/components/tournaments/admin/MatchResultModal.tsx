"use client";

import type { Tournament, TournamentMatch, TournamentPhase } from "@/types/tournaments";
import { tournamentPhaseTypeLabel } from "@/types/tournaments/tournamentPhase";
import { Spinner } from "@/components/ui/spinner/spinner";

export type MatchResultDraft = {
  homeSets: string;
  awaySets: string;
  homePointsText: string;
  awayPointsText: string;
  winnerId: string;
};

function parsePointsList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => Number(entry));
}

function getSafeTeamName(teamId: string | null | undefined, fallback: string, teamNames: Record<string, string>) {
  return teamId ? teamNames[teamId] || fallback : fallback;
}

function getWinnerPreview(params: {
  tournamentMatch: TournamentMatch;
  draft: MatchResultDraft;
  teamNames: Record<string, string>;
}) {
  const { tournamentMatch, draft, teamNames } = params;
  const homeSets = Number(draft.homeSets || 0);
  const awaySets = Number(draft.awaySets || 0);
  const homeTeamName = getSafeTeamName(tournamentMatch.homeTeamId, "Equipo local", teamNames);
  const awayTeamName = getSafeTeamName(tournamentMatch.awayTeamId, "Equipo visitante", teamNames);

  if (draft.winnerId === tournamentMatch.homeTeamId) {
    return `${homeTeamName} (selección manual)`;
  }

  if (draft.winnerId === tournamentMatch.awayTeamId) {
    return `${awayTeamName} (selección manual)`;
  }

  if (homeSets === awaySets) {
    return "Sin definir aún";
  }

  return homeSets > awaySets
    ? `${homeTeamName} (inferido por sets)`
    : `${awayTeamName} (inferido por sets)`;
}

export function MatchResultModal({
  open,
  tournament,
  phase,
  tournamentMatch,
  teamNames,
  draft,
  saving,
  onClose,
  onDraftChange,
  onSubmit,
}: {
  open: boolean;
  tournament: Tournament;
  phase: TournamentPhase | null;
  tournamentMatch: TournamentMatch | null;
  teamNames: Record<string, string>;
  draft: MatchResultDraft | null;
  saving: boolean;
  onClose: () => void;
  onDraftChange: (field: keyof MatchResultDraft, value: string) => void;
  onSubmit: () => void;
}) {
  if (!open || !tournamentMatch || !draft) return null;

  const maxSetsPerMatch = Number(tournament.rules?.setsToWin || tournament.settings?.setsToWin || 0);
  const homePoints = parsePointsList(draft.homePointsText);
  const awayPoints = parsePointsList(draft.awayPointsText);
  const pointsCountMatches = homePoints.length === awayPoints.length;
  const totalSets = Number(draft.homeSets || 0) + Number(draft.awaySets || 0);
  const withinConfiguredSets = maxSetsPerMatch <= 0 || totalSets <= maxSetsPerMatch;
  const winnerPreview = getWinnerPreview({ tournamentMatch, draft, teamNames });
  const homeTeamName = getSafeTeamName(tournamentMatch.homeTeamId, "Equipo local", teamNames);
  const awayTeamName = getSafeTeamName(tournamentMatch.awayTeamId, "Equipo visitante", teamNames);
  const winnerValue = draft.winnerId || "auto";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-950">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
              {tournamentMatch.status === "completed" ? "Editar resultado" : "Cargar resultado"}
            </p>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{tournament.name}</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {phase ? tournamentPhaseTypeLabel[phase.type] : "Fase sin definir"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Equipo A · Local</p>
              <p className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">{homeTeamName}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Equipo B · Visitante</p>
              <p className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">{awayTeamName}</p>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
            <p className="font-semibold">Cómo completar el resultado</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>Cargá los sets ganados por cada equipo.</li>
              <li>La suma de sets no puede superar <b>{maxSetsPerMatch || "-"}</b>, que es el máximo configurado para cada partido.</li>
              <li>Los puntos por set son opcionales, pero si los informás ambos equipos deben tener la misma cantidad de sets cargados.</li>
              <li>El ganador puede inferirse por sets o elegirse manualmente si necesitás corregir una situación excepcional.</li>
            </ul>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
              <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Sets ganados · Local</span>
              <input
                type="number"
                min="0"
                max={maxSetsPerMatch || undefined}
                value={draft.homeSets}
                onChange={(event) => onDraftChange("homeSets", event.target.value)}
                disabled={saving}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
            <label className="space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
              <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Sets ganados · Visitante</span>
              <input
                type="number"
                min="0"
                max={maxSetsPerMatch || undefined}
                value={draft.awaySets}
                onChange={(event) => onDraftChange("awaySets", event.target.value)}
                disabled={saving}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
            <label className="space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
              <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Puntos por set · Local</span>
              <input
                type="text"
                value={draft.homePointsText}
                onChange={(event) => onDraftChange("homePointsText", event.target.value)}
                disabled={saving}
                placeholder="25, 22, 15"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
            <label className="space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
              <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Puntos por set · Visitante</span>
              <input
                type="text"
                value={draft.awayPointsText}
                onChange={(event) => onDraftChange("awayPointsText", event.target.value)}
                disabled={saving}
                placeholder="18, 25, 10"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <label className="space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
              <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Ganador</span>
              <select
                value={winnerValue}
                onChange={(event) => onDraftChange("winnerId", event.target.value === "auto" ? "" : event.target.value)}
                disabled={saving}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              >
                <option value="auto">Inferir por sets</option>
                <option value={tournamentMatch.homeTeamId || ""}>{homeTeamName}</option>
                <option value={tournamentMatch.awayTeamId || ""}>{awayTeamName}</option>
              </select>
            </label>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Preview del ganador</p>
              <p className="mt-2 text-base font-semibold text-emerald-950 dark:text-emerald-100">{winnerPreview}</p>
              <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-300">
                Total de sets cargados: <b>{totalSets}</b>{maxSetsPerMatch > 0 ? ` / ${maxSetsPerMatch}` : ""}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className={`rounded-lg border p-3 text-sm ${pointsCountMatches ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/20 dark:text-green-100" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"}`}>
              {pointsCountMatches
                ? "La cantidad de puntos por set coincide entre local y visitante."
                : "Los puntos por set deben tener la misma cantidad para ambos equipos."}
            </div>
            <div className={`rounded-lg border p-3 text-sm ${withinConfiguredSets ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/20 dark:text-green-100" : "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/20 dark:text-red-100"}`}>
              {withinConfiguredSets
                ? "La suma de sets respeta la configuración del torneo."
                : "La suma de sets supera el máximo configurado para el partido."}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            El sistema usa los sets como fuente principal para validar el resultado del partido.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? <Spinner /> : null}
              {tournamentMatch.status === "completed" ? "Guardar cambios" : "Guardar resultado"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
