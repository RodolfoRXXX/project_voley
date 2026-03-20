"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { Tournament, TournamentGroup, TournamentMatch, TournamentMatchResult, TournamentPhase, TournamentStanding } from "@/types/tournaments";
import { getAdminAction } from "@/lib/tournamentAdmin";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import { getConfirmedGroupsFromTournamentContext } from "@/services/tournaments/tournamentAdapters";
import {
  getTournamentMatches,
  getTournamentPhases,
  getTournamentStandings,
  getTournamentTeams,
  type TournamentTeamRow,
} from "@/services/tournaments/tournamentQueries";
import {
  closeTournamentRegistrations,
  confirmTournamentFixture,
  confirmTournamentGroups,
  openTournamentRegistrations,
  previewTournamentFixture,
  previewTournamentGroups,
  recordTournamentMatchResult,
} from "@/services/tournaments/tournamentMutations";
import { TournamentPhaseShell, TournamentPhaseTimeline } from "@/components/tournaments/admin/TournamentPhaseShell";
import { TournamentGroupsList, TournamentStandingsTable } from "@/components/tournaments/admin/TournamentAdminPhaseSections";
import {
  groupTournamentMatches,
  TournamentMatchSummaryList,
} from "@/components/tournaments/admin/TournamentMatchSections";

type TournamentAdminPanelProps = {
  tournament: Tournament;
  onTournamentRefresh: () => Promise<void>;
};

type MatchResultDraft = {
  homeSets: string;
  awaySets: string;
  homePointsText: string;
  awayPointsText: string;
  winnerId: string;
};

function PreviewCard({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "preview" | "confirmed";
  children: ReactNode;
}) {
  const styles = tone === "preview"
    ? "border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
    : "border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-950/30";
  const badge = tone === "preview" ? "PREVIEW" : "CONFIRMADO";
  const badgeStyles = tone === "preview"
    ? "bg-amber-200 text-amber-900 dark:bg-amber-800/70 dark:text-amber-100"
    : "bg-green-200 text-green-900 dark:bg-green-800/70 dark:text-green-100";

  return (
    <div className={`space-y-3 rounded-lg border p-3 ${styles}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h4>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badgeStyles}`}>
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

function pointsToText(points?: number[]) {
  return Array.isArray(points) ? points.join(", ") : "";
}

function buildMatchResultDraft(tournamentMatch: TournamentMatch): MatchResultDraft {
  return {
    homeSets: tournamentMatch.result?.homeSets != null ? String(tournamentMatch.result.homeSets) : "",
    awaySets: tournamentMatch.result?.awaySets != null ? String(tournamentMatch.result.awaySets) : "",
    homePointsText: pointsToText(tournamentMatch.result?.homePoints),
    awayPointsText: pointsToText(tournamentMatch.result?.awayPoints),
    winnerId: tournamentMatch.result?.winnerId || "",
  };
}

function parsePointsList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => Number(entry));
}

function sanitizeResultDraft(tournamentMatch: TournamentMatch, draft: MatchResultDraft): NonNullable<TournamentMatchResult> {
  const homePoints = parsePointsList(draft.homePointsText);
  const awayPoints = parsePointsList(draft.awayPointsText);
  const winnerId = draft.winnerId || undefined;

  return {
    homeSets: Number(draft.homeSets || 0),
    awaySets: Number(draft.awaySets || 0),
    homePoints,
    awayPoints,
    ...(winnerId && [tournamentMatch.homeTeamId, tournamentMatch.awayTeamId].includes(winnerId) ? { winnerId } : {}),
  };
}

function hasInvalidPointsList(value: string) {
  return parsePointsList(value).some((point) => Number.isNaN(point));
}

export default function TournamentAdminPanel({ tournament, onTournamentRefresh }: TournamentAdminPanelProps) {
  const { showToast } = useToast();
  const confirmedFixtureRef = useRef<HTMLDivElement | null>(null);

  const [busyAction, setBusyAction] = useState(false);
  const [phases, setPhases] = useState<TournamentPhase[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [previewGroups, setPreviewGroups] = useState<TournamentGroup[] | null>(null);
  const [groupsSeed, setGroupsSeed] = useState<number | null>(null);
  const [loadingGroupsPreview, setLoadingGroupsPreview] = useState(false);
  const [confirmingGroups, setConfirmingGroups] = useState(false);

  const [previewTournamentMatches, setPreviewTournamentMatches] = useState<TournamentMatch[] | null>(null);
  const [confirmedTournamentMatches, setConfirmedTournamentMatches] = useState<TournamentMatch[]>([]);
  const [seed, setSeed] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmingFixture, setConfirmingFixture] = useState(false);
  const [loadingConfirmed, setLoadingConfirmed] = useState(false);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [standings, setStandings] = useState<TournamentStanding[]>([]);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [matchResultDrafts, setMatchResultDrafts] = useState<Record<string, MatchResultDraft>>({});
  const [savingMatchIds, setSavingMatchIds] = useState<Record<string, boolean>>({});

  const action = getAdminAction(tournament);
  const currentPhase = useMemo(
    () => phases.find((phase) => phase.id === tournament.currentPhaseId) || null,
    [phases, tournament.currentPhaseId]
  );
  const confirmedGroups = getConfirmedGroupsFromTournamentContext({ phase: currentPhase, tournament });
  const hasConfirmedGroups = confirmedGroups.length > 0;
  const hasConfirmedFixture = confirmedTournamentMatches.length > 0;

  const loadPhases = useCallback(async () => {
    setLoadingPhases(true);
    try {
      const nextPhases = await getTournamentPhases(tournament.id);
      setPhases(nextPhases);
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudieron cargar las fases del torneo");
    } finally {
      setLoadingPhases(false);
    }
  }, [showToast, tournament.id]);

  const loadConfirmedMatches = useCallback(async () => {
    setLoadingConfirmed(true);
    try {
      const nextMatches = await getTournamentMatches({ tournamentId: tournament.id });
      setConfirmedTournamentMatches(nextMatches);
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo cargar el fixture confirmado");
    } finally {
      setLoadingConfirmed(false);
    }
  }, [showToast, tournament.id]);

  const loadTournamentTeams = useCallback(async () => {
    try {
      const tournamentTeams = await getTournamentTeams(tournament.id);
      const namesMap = tournamentTeams.reduce<Record<string, string>>((acc, teamDoc: TournamentTeamRow) => {
        acc[teamDoc.id] = teamDoc.nameTeam || teamDoc.name || `Equipo ${teamDoc.id.slice(0, 6)}`;
        return acc;
      }, {});
      setTeamNames(namesMap);
    } catch {
      setTeamNames({});
    }
  }, [tournament.id]);

  const loadStandings = useCallback(async (phaseId?: string | null) => {
    if (!phaseId) {
      setStandings([]);
      return;
    }

    setLoadingStandings(true);
    try {
      const nextStandings = await getTournamentStandings({ tournamentId: tournament.id, phaseId });
      setStandings(nextStandings);
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudieron cargar los standings de la fase actual");
    } finally {
      setLoadingStandings(false);
    }
  }, [showToast, tournament.id]);

  useEffect(() => {
    onTournamentRefresh();
    loadPhases();
    loadConfirmedMatches();
    loadTournamentTeams();
  }, [loadConfirmedMatches, loadPhases, loadTournamentTeams, onTournamentRefresh]);

  useEffect(() => {
    loadStandings(tournament.currentPhaseId);
  }, [loadStandings, tournament.currentPhaseId]);

  useEffect(() => {
    setMatchResultDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      let changed = false;

      confirmedTournamentMatches.forEach((tournamentMatch) => {
        const existingDraft = currentDrafts[tournamentMatch.id];
        if (!existingDraft || tournamentMatch.status === "completed") {
          nextDrafts[tournamentMatch.id] = buildMatchResultDraft(tournamentMatch);
          changed = true;
        }
      });

      Object.keys(nextDrafts).forEach((matchId) => {
        if (!confirmedTournamentMatches.some((tournamentMatch) => tournamentMatch.id === matchId)) {
          delete nextDrafts[matchId];
          changed = true;
        }
      });

      return changed ? nextDrafts : currentDrafts;
    });
  }, [confirmedTournamentMatches]);

  const onMainAction = async () => {
    if (!action.nextStatus) return;

    setBusyAction(true);

    try {
      if (action.nextStatus === "inscripciones_abiertas") {
        await openTournamentRegistrations(tournament.id);
      }

      if (action.nextStatus === "inscripciones_cerradas") {
        await closeTournamentRegistrations(tournament.id);
      }

      showToast({ type: "success", message: `${action.label} correctamente` });
      await onTournamentRefresh();
    } catch (error) {
      handleFirebaseError(error, showToast, `No se pudo ejecutar: ${action.label}`);
    } finally {
      setBusyAction(false);
    }
  };

  const onPreviewGroups = async () => {
    setLoadingGroupsPreview(true);

    try {
      const data = await previewTournamentGroups({
        tournamentId: tournament.id,
        ...(currentPhase ? { phaseId: currentPhase.id } : {}),
        ...(previewGroups ? { seed: Math.floor(Math.random() * 1000000000) } : {}),
      });
      setGroupsSeed(data.seed);
      setPreviewGroups(data.groups);
      showToast({ type: "success", message: "Vista previa de grupos generada" });
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo generar la vista previa de grupos");
    } finally {
      setLoadingGroupsPreview(false);
    }
  };

  const onConfirmGroups = async () => {
    if (!previewGroups || previewGroups.length === 0) return;

    setConfirmingGroups(true);

    try {
      await confirmTournamentGroups({
        tournamentId: tournament.id,
        ...(currentPhase ? { phaseId: currentPhase.id } : {}),
        groups: previewGroups,
      });

      showToast({ type: "success", message: "Grupos confirmados" });
      setPreviewGroups(null);
      setGroupsSeed(null);
      await onTournamentRefresh();
      await loadPhases();
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudieron confirmar los grupos");
    } finally {
      setConfirmingGroups(false);
    }
  };

  const onPreviewFixture = async () => {
    setLoadingPreview(true);

    try {
      const data = await previewTournamentFixture({
        tournamentId: tournament.id,
        ...(currentPhase ? { phaseId: currentPhase.id } : {}),
        ...(previewTournamentMatches ? { seed: Math.floor(Math.random() * 1000000000) } : {}),
      });
      setSeed(data.seed);
      setPreviewTournamentMatches(data.matches);
      showToast({ type: "success", message: "Fixture generado en memoria" });
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo generar el fixture");
    } finally {
      setLoadingPreview(false);
    }
  };

  const onConfirmFixture = async () => {
    if (!previewTournamentMatches || previewTournamentMatches.length === 0) return;

    setConfirmingFixture(true);

    try {
      await confirmTournamentFixture({
        tournamentId: tournament.id,
        ...(currentPhase ? { phaseId: currentPhase.id } : {}),
        matches: previewTournamentMatches,
      });

      await onTournamentRefresh();
      await loadPhases();
      await loadConfirmedMatches();
      await loadStandings(currentPhase?.id);
      setPreviewTournamentMatches(null);
      setSeed(null);
      showToast({ type: "success", message: "Fixture confirmado correctamente" });
      confirmedFixtureRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo confirmar el fixture");
    } finally {
      setConfirmingFixture(false);
    }
  };

  const onMatchResultDraftChange = (matchId: string, field: keyof MatchResultDraft) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setMatchResultDrafts((currentDrafts) => ({
      ...currentDrafts,
      [matchId]: {
        ...(currentDrafts[matchId] || {
          homeSets: "",
          awaySets: "",
          homePointsText: "",
          awayPointsText: "",
          winnerId: "",
        }),
        [field]: value,
      },
    }));
  };

  const onRecordMatchResult = async (tournamentMatch: TournamentMatch) => {
    const draft = matchResultDrafts[tournamentMatch.id] || buildMatchResultDraft(tournamentMatch);

    if (hasInvalidPointsList(draft.homePointsText) || hasInvalidPointsList(draft.awayPointsText)) {
      showToast({ type: "error", message: "Los puntos por set deben ser números separados por coma" });
      return;
    }

    if (draft.homeSets.trim() === "" || draft.awaySets.trim() === "") {
      showToast({ type: "error", message: "Completá al menos los sets ganados por local y visitante" });
      return;
    }

    if (Number(draft.homeSets) === Number(draft.awaySets)) {
      showToast({ type: "error", message: "El resultado no puede terminar empatado en sets" });
      return;
    }

    setSavingMatchIds((current) => ({ ...current, [tournamentMatch.id]: true }));

    try {
      await recordTournamentMatchResult({
        matchId: tournamentMatch.id,
        result: sanitizeResultDraft(tournamentMatch, draft),
      });

      await onTournamentRefresh();
      await Promise.all([
        loadPhases(),
        loadConfirmedMatches(),
        loadStandings(tournament.currentPhaseId),
      ]);

      showToast({ type: "success", message: "Resultado registrado y panel refrescado" });
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo registrar el resultado del partido");
    } finally {
      setSavingMatchIds((current) => ({ ...current, [tournamentMatch.id]: false }));
    }
  };

  const renderConfirmedMatchDetails = (tournamentMatch: TournamentMatch) => {
    const draft = matchResultDrafts[tournamentMatch.id] || buildMatchResultDraft(tournamentMatch);
    const isSaving = Boolean(savingMatchIds[tournamentMatch.id]);
    const isCompleted = tournamentMatch.status === "completed";
    const winnerValue = draft.winnerId || "auto";

    return (
      <div className="space-y-3 rounded-md bg-white/70 p-3 dark:bg-neutral-900/40">
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className={`rounded-full px-2 py-1 font-semibold ${isCompleted ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200"}`}>
            {isCompleted ? "Resultado cargado" : "Pendiente"}
          </span>
          <span>ID partido: {tournamentMatch.id}</span>
        </div>

        <div className="rounded-md border border-sky-200 bg-sky-50/80 p-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
          <p className="font-medium">Cómo cargar el resultado</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs sm:text-sm">
            <li><b>Obligatorio:</b> solo necesitás informar cuántos sets ganó cada equipo.</li>
            <li><b>Opcional:</b> los puntos por set sirven para estadísticas y desempates finos.</li>
            <li>Si no elegís ganador, el sistema lo <b>infiere automáticamente</b> según quién tenga más sets.</li>
          </ul>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
            <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Sets local</span>
            <input
              type="number"
              min="0"
              value={draft.homeSets}
              onChange={onMatchResultDraftChange(tournamentMatch.id, "homeSets")}
              disabled={isSaving}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
          <label className="space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
            <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Sets visitante</span>
            <input
              type="number"
              min="0"
              value={draft.awaySets}
              onChange={onMatchResultDraftChange(tournamentMatch.id, "awaySets")}
              disabled={isSaving}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
          <label className="space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
            <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Puntos local por set (opcional)</span>
            <input
              type="text"
              value={draft.homePointsText}
              onChange={onMatchResultDraftChange(tournamentMatch.id, "homePointsText")}
              disabled={isSaving}
              placeholder="25, 22, 15"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
          <label className="space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
            <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Puntos visitante por set (opcional)</span>
            <input
              type="text"
              value={draft.awayPointsText}
              onChange={onMatchResultDraftChange(tournamentMatch.id, "awayPointsText")}
              disabled={isSaving}
              placeholder="18, 25, 10"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
        </div>

        <label className="space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
          <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Ganador (opcional)</span>
          <select
            value={winnerValue}
            onChange={onMatchResultDraftChange(tournamentMatch.id, "winnerId")}
            disabled={isSaving}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          >
            <option value="auto">Inferir por sets</option>
            <option value={tournamentMatch.homeTeamId}>{teamNames[tournamentMatch.homeTeamId] || "Equipo local"}</option>
            <option value={tournamentMatch.awayTeamId}>{teamNames[tournamentMatch.awayTeamId] || "Equipo visitante"}</option>
          </select>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Recomendado: cargá primero los sets. Los puntos por set solo completalos si querés conservar ese detalle en el torneo.
          </p>
          <button
            onClick={() => onRecordMatchResult(tournamentMatch)}
            disabled={isSaving}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSaving ? "Guardando..." : isCompleted ? "Actualizar resultado" : "Guardar resultado"}
          </button>
        </div>
      </div>
    );
  };

  const groupedPreviewTournamentMatches = useMemo(() => groupTournamentMatches(previewTournamentMatches || []), [previewTournamentMatches]);
  const groupedConfirmedTournamentMatches = useMemo(() => groupTournamentMatches(confirmedTournamentMatches), [confirmedTournamentMatches]);
  const canOrganizeTournament =
    currentPhase?.type === "group_stage" && (tournament.status === "inscripciones_cerradas" || tournament.status === "activo");
  const showGroupActions = currentPhase?.type === "group_stage" && !hasConfirmedGroups;
  const showFixtureActions =
    currentPhase !== null &&
    ["group_stage", "round_robin", "knockout", "final"].includes(currentPhase.type) &&
    (currentPhase.type !== "group_stage" || hasConfirmedGroups) &&
    !hasConfirmedFixture;
  const showGroupsSection = canOrganizeTournament || Boolean(previewGroups) || hasConfirmedGroups;
  const showFixtureSection =
    showFixtureActions || previewTournamentMatches !== null || hasConfirmedFixture || (loadingConfirmed && hasConfirmedGroups);

  return (
    <TournamentPhaseShell
      currentPhase={currentPhase}
      currentPhaseType={tournament.currentPhaseType}
      loadingPhases={loadingPhases}
      timeline={<TournamentPhaseTimeline phases={phases} currentPhaseId={tournament.currentPhaseId} loading={loadingPhases} />}
    >
      {action.nextStatus && (
        <div className="flex justify-start">
          <button
            onClick={onMainAction}
            disabled={busyAction || action.disabled}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {busyAction ? "Procesando..." : action.label}
          </button>
        </div>
      )}

      {showGroupsSection && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Organización de grupos</h3>
            {showGroupActions && (
              <div className="flex gap-2">
                <button
                  onClick={onPreviewGroups}
                  disabled={loadingGroupsPreview}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium disabled:opacity-60"
                >
                  {loadingGroupsPreview ? "Generando..." : previewGroups ? "Regenerar grupos" : "Generar grupos"}
                </button>
                <button
                  onClick={onConfirmGroups}
                  disabled={confirmingGroups || !previewGroups || previewGroups.length === 0}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {confirmingGroups ? "Confirmando..." : "Confirmar grupos"}
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-300">Seed de grupos: <b>{groupsSeed ?? "-"}</b></p>

          {previewGroups && (
            <PreviewCard title="Vista previa de grupos" tone="preview">
              <TournamentGroupsList groups={previewGroups} teamNames={teamNames} />
            </PreviewCard>
          )}

          {confirmedGroups.length > 0 && (
            <PreviewCard title="Grupos confirmados" tone="confirmed">
              <TournamentGroupsList groups={confirmedGroups} teamNames={teamNames} />
            </PreviewCard>
          )}
        </div>
      )}

      {showFixtureSection && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Operación de fixture</h3>
            {showFixtureActions && (
              <div className="flex gap-2">
                <button
                  onClick={onPreviewFixture}
                  disabled={loadingPreview}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium disabled:opacity-60"
                >
                  {loadingPreview ? "Generando..." : "Generar fixture"}
                </button>
                <button
                  onClick={onConfirmFixture}
                  disabled={confirmingFixture || !previewTournamentMatches || previewTournamentMatches.length === 0}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {confirmingFixture ? "Confirmando..." : "Confirmar fixture"}
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-300">Seed actual: <b>{seed ?? "-"}</b></p>

          {!hasConfirmedFixture && previewTournamentMatches !== null && (
            <PreviewCard title="Vista previa del fixture" tone="preview">
              <TournamentMatchSummaryList groupedTournamentMatches={groupedPreviewTournamentMatches} teamNames={teamNames} />
            </PreviewCard>
          )}

          {confirmedTournamentMatches.length > 0 && (
            <div ref={confirmedFixtureRef}>
              <PreviewCard title="Fixture confirmado" tone="confirmed">
                <TournamentMatchSummaryList
                  groupedTournamentMatches={groupedConfirmedTournamentMatches}
                  teamNames={teamNames}
                  renderMatchDetails={renderConfirmedMatchDetails}
                />
              </PreviewCard>
            </div>
          )}

          {!loadingConfirmed && previewTournamentMatches === null && confirmedTournamentMatches.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Aún no hay fixture en vista previa ni confirmado.</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Standings de la fase actual</h3>
          {loadingStandings ? <span className="text-xs text-neutral-500 dark:text-neutral-400">Cargando...</span> : null}
        </div>
        <TournamentStandingsTable standings={standings} teamNames={teamNames} />
      </div>
    </TournamentPhaseShell>
  );
}
