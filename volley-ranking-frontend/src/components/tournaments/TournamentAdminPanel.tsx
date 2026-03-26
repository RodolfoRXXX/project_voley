"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  cancelTournament,
  closeTournamentRegistrations,
  confirmTournamentFixture,
  confirmTournamentGroups,
  finalizeTournament,
  openTournamentRegistrations,
  previewTournamentFixture,
  previewTournamentGroups,
  recordTournamentMatchResult,
  startTournament,
} from "@/services/tournaments/tournamentMutations";
import { TournamentPhaseShell, TournamentPhaseTimeline } from "@/components/tournaments/admin/TournamentPhaseShell";
import { TournamentGroupsList, TournamentStandingsTable } from "@/components/tournaments/admin/TournamentAdminPhaseSections";
import { MatchResultModal, type MatchResultDraft } from "@/components/tournaments/admin/MatchResultModal";
import {
  getTournamentLeagueProgress,
  groupTournamentMatches,
  TournamentMatchSummaryList,
} from "@/components/tournaments/admin/TournamentMatchSections";
import { useConfirm } from "@/components/confirmModal/ConfirmProvider";

type TournamentAdminPanelProps = {
  tournament: Tournament;
  onTournamentRefresh: () => Promise<void>;
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
  const { confirm } = useConfirm();
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
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmingFixture, setConfirmingFixture] = useState(false);
  const [loadingConfirmed, setLoadingConfirmed] = useState(false);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [standings, setStandings] = useState<TournamentStanding[]>([]);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [matchResultDrafts, setMatchResultDrafts] = useState<Record<string, MatchResultDraft>>({});
  const [savingMatchIds, setSavingMatchIds] = useState<Record<string, boolean>>({});
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const action = getAdminAction(tournament);
  const currentPhase = useMemo(
    () => phases.find((phase) => phase.id === tournament.currentPhaseId) || null,
    [phases, tournament.currentPhaseId]
  );
  const groupStagePhase = useMemo(() => phases.find((phase) => phase.type === "group_stage") || null, [phases]);
  const knockoutPhase = useMemo(() => phases.find((phase) => phase.type === "knockout") || null, [phases]);
  const confirmedGroups = getConfirmedGroupsFromTournamentContext({ phase: groupStagePhase || currentPhase, tournament });
  const hasConfirmedGroups = confirmedGroups.length > 0;
  const currentPhaseMatches = useMemo(
    () => confirmedTournamentMatches.filter((match) => match.phaseId === currentPhase?.id),
    [confirmedTournamentMatches, currentPhase?.id]
  );
  const hasConfirmedFixture = currentPhaseMatches.length > 0;
  const isLeaguePhase = currentPhase?.type === "round_robin";
  const isKnockoutPhase = currentPhase?.type === "knockout" || currentPhase?.type === "final";
  const isMixedTournament = tournament.format === "mixto";
  const canRecordResults = tournament.status === "activo";

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

  const loadStandings = useCallback(async () => {
    setLoadingStandings(true);
    try {
      const nextStandings = await getTournamentStandings({ tournamentId: tournament.id });
      setStandings(nextStandings);
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudieron cargar los standings del torneo");
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
    loadStandings();
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
    const confirmed = await confirm({
      title: "Confirmar acción",
      message: `¿Querés ${action.label.toLowerCase()}?`,
      confirmText: action.label,
      cancelText: "Cancelar",
      variant: "warning",
    });
    if (!confirmed) return;

    setBusyAction(true);

    try {
      if (action.nextStatus === "inscripciones_abiertas") {
        await openTournamentRegistrations(tournament.id);
      }

      if (action.nextStatus === "inscripciones_cerradas") {
        await closeTournamentRegistrations(tournament.id);
      }
      if (action.nextStatus === "activo") {
        await startTournament(tournament.id);
      }
      if (action.nextStatus === "finalizado") {
        await finalizeTournament(tournament.id);
      }

      showToast({ type: "success", message: `${action.label} correctamente` });
      await onTournamentRefresh();
    } catch (error) {
      handleFirebaseError(error, showToast, `No se pudo ejecutar: ${action.label}`);
    } finally {
      setBusyAction(false);
    }
  };

  const onCancelTournament = async () => {
    if (tournament.status === "cancelado" || tournament.status === "finalizado") return;

    const firstConfirm = await confirm({
      title: "Cancelar torneo",
      message: "Esta acción cambia el estado a cancelado y bloquea todas las modificaciones. ¿Querés continuar?",
      confirmText: "Sí, continuar",
      cancelText: "No",
      variant: "danger",
    });
    if (!firstConfirm) return;

    const secondConfirm = await confirm({
      title: "Confirmación final",
      message: "¿Confirmás cancelar definitivamente este torneo?",
      confirmText: "Sí, cancelar torneo",
      cancelText: "Volver",
      variant: "danger",
    });
    if (!secondConfirm) return;

    setBusyAction(true);
    try {
      await cancelTournament(tournament.id);
      showToast({ type: "success", message: "Torneo cancelado correctamente" });
      await onTournamentRefresh();
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo cancelar el torneo");
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
      await loadStandings();
      setPreviewTournamentMatches(null);
      showToast({ type: "success", message: "Fixture confirmado correctamente" });
      confirmedFixtureRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo confirmar el fixture");
    } finally {
      setConfirmingFixture(false);
    }
  };

  const onMatchResultDraftChange = (matchId: string, field: keyof MatchResultDraft, value: string) => {
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

  const selectedTournamentMatch = useMemo(
    () => confirmedTournamentMatches.find((tournamentMatch) => tournamentMatch.id === selectedMatchId) || null,
    [confirmedTournamentMatches, selectedMatchId]
  );

  const onRecordMatchResult = async (tournamentMatch: TournamentMatch) => {
    if (!canRecordResults) {
      showToast({ type: "error", message: "Solo podés cargar resultados cuando el torneo está activo" });
      return;
    }

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

    const maxSetsPerMatch = Number(tournament.rules?.setsToWin || tournament.settings?.setsToWin || 0);
    if (maxSetsPerMatch > 0 && Number(draft.homeSets) + Number(draft.awaySets) > maxSetsPerMatch) {
      showToast({ type: "error", message: `La suma de sets no puede superar ${maxSetsPerMatch}` });
      return;
    }

    const homePointsCount = parsePointsList(draft.homePointsText).length;
    const awayPointsCount = parsePointsList(draft.awayPointsText).length;
    if (homePointsCount !== awayPointsCount) {
      showToast({ type: "error", message: "Local y visitante deben tener la misma cantidad de puntos por set" });
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
        loadStandings(),
      ]);

      showToast({ type: "success", message: "Resultado registrado y panel refrescado" });
      setSelectedMatchId(null);
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo registrar el resultado del partido");
    } finally {
      setSavingMatchIds((current) => ({ ...current, [tournamentMatch.id]: false }));
    }
  };

  const renderConfirmedMatchDetails = (tournamentMatch: TournamentMatch) => {
    const draft = matchResultDrafts[tournamentMatch.id] || buildMatchResultDraft(tournamentMatch);
    const isCompleted = tournamentMatch.status === "completed";
    const hasDefinedTeams = Boolean(tournamentMatch.homeTeamId && tournamentMatch.awayTeamId);
    const homeSets = Number(draft.homeSets || 0);
    const awaySets = Number(draft.awaySets || 0);
    const inferredWinner =
      draft.winnerId ||
      (homeSets === awaySets ? "" : homeSets > awaySets ? tournamentMatch.homeTeamId : tournamentMatch.awayTeamId);
    const winnerLabel = inferredWinner
      ? teamNames[inferredWinner] || (inferredWinner === tournamentMatch.homeTeamId ? "Equipo local" : "Equipo visitante")
      : "Sin definir";

    return (
      <div className="space-y-3 rounded-md bg-white/70 p-3 dark:bg-neutral-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className={`rounded-full px-2 py-1 font-semibold ${isCompleted ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200"}`}>
            {isCompleted ? "Resultado cargado" : "Pendiente"}
          </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedMatchId(tournamentMatch.id)}
            disabled={!hasDefinedTeams || !canRecordResults}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200"
          >
            {!hasDefinedTeams
              ? "Esperando clasificados"
              : !canRecordResults
                ? "Disponible cuando esté activo"
                : isCompleted
                  ? "Editar resultado"
                  : "Cargar resultado"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Sets</p>
            <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{homeSets} - {awaySets}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Ganador</p>
            <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{winnerLabel}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Puntos por set</p>
            <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {draft.homePointsText || draft.awayPointsText ? `${draft.homePointsText || "-"} / ${draft.awayPointsText || "-"}` : "Sin detalle"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const currentStandings = useMemo(
    () => standings.filter((standing) => standing.phaseId === currentPhase?.id).sort((a, b) => a.position - b.position),
    [standings, currentPhase?.id]
  );
  const groupStageStandings = useMemo(
    () => standings.filter((standing) => standing.phaseId === groupStagePhase?.id).sort((a, b) => (a.groupLabel || "").localeCompare(b.groupLabel || "") || a.position - b.position),
    [standings, groupStagePhase?.id]
  );
  const groupedPreviewTournamentMatches = useMemo(() => groupTournamentMatches(previewTournamentMatches || []), [previewTournamentMatches]);
  const groupedConfirmedTournamentMatches = useMemo(() => groupTournamentMatches(currentPhaseMatches), [currentPhaseMatches]);
  const leagueProgress = useMemo(() => getTournamentLeagueProgress(currentPhaseMatches), [currentPhaseMatches]);
  const leagueLeader = useMemo(() => currentStandings[0] || null, [currentStandings]);
  const mixedGroupMatches = useMemo(
    () => confirmedTournamentMatches.filter((match) => match.phaseId === groupStagePhase?.id),
    [confirmedTournamentMatches, groupStagePhase?.id]
  );
  const mixedKnockoutMatches = useMemo(
    () => confirmedTournamentMatches.filter((match) => match.phaseId === knockoutPhase?.id),
    [confirmedTournamentMatches, knockoutPhase?.id]
  );
  const groupedMixedGroupMatches = useMemo(() => groupTournamentMatches(mixedGroupMatches), [mixedGroupMatches]);
  const groupedMixedKnockoutMatches = useMemo(() => groupTournamentMatches(mixedKnockoutMatches), [mixedKnockoutMatches]);
  const allTournamentMatchesCompleted = useMemo(
    () => confirmedTournamentMatches.length > 0 && confirmedTournamentMatches.every((match) => match.status === "completed"),
    [confirmedTournamentMatches]
  );
  const minTeamsRequired = Number(tournament.minTeams || tournament.settings?.minTeams || 0);
  const canCloseRegistrations = Number(tournament.acceptedTeamsCount || 0) >= minTeamsRequired;
  const isMainActionDisabled = useMemo(() => {
    if (busyAction) return true;
    if (action.nextStatus === "inscripciones_cerradas") return action.disabled || !canCloseRegistrations;
    if (action.nextStatus === "activo") return !hasConfirmedFixture;
    if (action.nextStatus === "finalizado") return !allTournamentMatchesCompleted;
    return action.disabled;
  }, [action.disabled, action.nextStatus, allTournamentMatchesCompleted, busyAction, canCloseRegistrations, hasConfirmedFixture]);
  const publishedQualifiedTeams = useMemo(() => {
    if (Array.isArray(groupStagePhase?.config?.qualifiedTeamsPublished) && groupStagePhase.config.qualifiedTeamsPublished.length > 0) {
      return [...groupStagePhase.config.qualifiedTeamsPublished].sort((a, b) => Number(a.seed || 0) - Number(b.seed || 0));
    }
    return groupStageStandings.filter((standing) => standing.qualified).sort((a, b) => Number(a.seed || 0) - Number(b.seed || 0) || a.position - b.position);
  }, [groupStagePhase?.config?.qualifiedTeamsPublished, groupStageStandings]);
  const canOrganizeTournament =
    currentPhase?.type === "group_stage" && (tournament.status === "inscripciones_cerradas" || tournament.status === "activo");
  const showGroupActions = currentPhase?.type === "group_stage" && !hasConfirmedGroups;
  const showFixtureActions =
    currentPhase !== null &&
    ["group_stage", "round_robin", "knockout", "final"].includes(currentPhase.type) &&
    (currentPhase.type !== "group_stage" || hasConfirmedGroups) &&
    !hasConfirmedFixture;
  const showGroupsSection = !isLeaguePhase && (canOrganizeTournament || Boolean(previewGroups) || hasConfirmedGroups);
  const showFixtureSection =
    showFixtureActions || previewTournamentMatches !== null || hasConfirmedFixture || (loadingConfirmed && (hasConfirmedGroups || isLeaguePhase));
  const standingsSection = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {isLeaguePhase ? "Tabla principal de la liga" : "Standings de la fase actual"}
        </h3>
        {loadingStandings ? <span className="text-xs text-neutral-500 dark:text-neutral-400">Cargando...</span> : null}
      </div>

      {isLeaguePhase && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Líder actual</p>
            <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {leagueLeader ? `#${leagueLeader.position} ${teamNames[leagueLeader.teamId] || leagueLeader.teamId}` : "Sin datos"}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Partidos</p>
            <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {leagueProgress.completedMatches} jugados / {leagueProgress.pendingMatches} pendientes
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Jornadas</p>
            <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {leagueProgress.completedMatchdays} de {leagueProgress.totalMatchdays} completas
            </p>
          </div>
        </div>
      )}

      {isKnockoutPhase ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          En eliminación directa la llave es la fuente principal del progreso. Esta tabla se mantiene solo como apoyo estadístico mínimo.
        </p>
      ) : null}

      <TournamentStandingsTable standings={currentStandings} teamNames={teamNames} />
    </div>
  );

  return (
    <TournamentPhaseShell
      currentPhase={currentPhase}
      loadingPhases={loadingPhases}
      timeline={<TournamentPhaseTimeline phases={phases} currentPhaseId={tournament.currentPhaseId} loading={loadingPhases} />}
    >
      {tournament.status !== "finalizado" && tournament.status !== "cancelado" && action.nextStatus && (
        <div className="flex flex-wrap justify-start gap-2">
          <button
            onClick={onMainAction}
            disabled={isMainActionDisabled || tournament.status === "finalizado"}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {busyAction ? "Procesando..." : action.label}
          </button>
          <button
            onClick={onCancelTournament}
            disabled={busyAction || tournament.status === "finalizado"}
            className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Cancelar torneo
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

      {isLeaguePhase ? standingsSection : null}

      {showFixtureSection && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {isLeaguePhase ? "Calendario de la liga" : "Operación de fixture"}
            </h3>
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
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {isLeaguePhase ? "Todavía no se generó el calendario de la liga." : "Aún no hay fixture en vista previa ni confirmado."}
            </p>
          )}
        </div>
      )}

      {!isLeaguePhase ? standingsSection : null}

      {isMixedTournament && groupStagePhase && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/30">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">1. Fase de grupos</h3>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{groupStagePhase.status}</span>
            </div>

            {confirmedGroups.length > 0 ? (
              <TournamentGroupsList groups={confirmedGroups} teamNames={teamNames} />
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Todavía no hay grupos confirmados.</p>
            )}

            {groupStageStandings.length > 0 ? (
              <TournamentStandingsTable standings={groupStageStandings} teamNames={teamNames} />
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Los standings de grupos todavía no están disponibles.</p>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Clasificados publicados</h4>
              {publishedQualifiedTeams.length > 0 ? (
                <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-200">
                  {publishedQualifiedTeams.map((team) => (
                    <li key={`${team.teamId}-${team.seed || team.position || 0}`} className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          #{team.seed || team.position || "-"} {teamNames[team.teamId] || team.teamId}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {team.groupLabel ? `${team.groupLabel} · ` : ""}{team.qualificationType || "clasificado"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Se publicarán cuando la fase de grupos quede cerrada.</p>
              )}
            </div>

            {mixedGroupMatches.length > 0 ? (
              <TournamentMatchSummaryList groupedTournamentMatches={groupedMixedGroupMatches} teamNames={teamNames} />
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Todavía no hay fixture confirmado de grupos.</p>
            )}
          </section>

          <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/30">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">2. Playoffs</h3>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{knockoutPhase?.status || "pending"}</span>
            </div>

            {Array.isArray(knockoutPhase?.config?.qualifiedTeams) && knockoutPhase.config.qualifiedTeams.length > 0 ? (
              <ul className="grid gap-2 sm:grid-cols-2 text-sm text-neutral-700 dark:text-neutral-200">
                {knockoutPhase.config.qualifiedTeams.map((team) => (
                  <li key={`${team.teamId}-${team.seed || 0}`} className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                    <b>Seed {team.seed || "-"}</b>: {teamNames[team.teamId] || team.teamId}
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {team.groupLabel ? `${team.groupLabel} · ` : ""}pos. {team.position || "-"} · {team.qualificationType || "clasificado"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">El playoff se poblará cuando termine la fase de grupos.</p>
            )}

            {mixedKnockoutMatches.length > 0 ? (
              <TournamentMatchSummaryList
                groupedTournamentMatches={groupedMixedKnockoutMatches}
                teamNames={teamNames}
                renderMatchDetails={renderConfirmedMatchDetails}
              />
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Todavía no hay bracket confirmado.</p>
            )}
          </section>
        </div>
      )}

      <MatchResultModal
        open={Boolean(selectedTournamentMatch)}
        tournament={tournament}
        phase={currentPhase}
        tournamentMatch={selectedTournamentMatch}
        teamNames={teamNames}
        draft={selectedTournamentMatch ? (matchResultDrafts[selectedTournamentMatch.id] || buildMatchResultDraft(selectedTournamentMatch)) : null}
        saving={selectedTournamentMatch ? Boolean(savingMatchIds[selectedTournamentMatch.id]) : false}
        onClose={() => setSelectedMatchId(null)}
        onDraftChange={(field, value) => {
          if (!selectedTournamentMatch) return;
          onMatchResultDraftChange(selectedTournamentMatch.id, field, value);
        }}
        onSubmit={() => {
          if (!selectedTournamentMatch) return;
          onRecordMatchResult(selectedTournamentMatch);
        }}
      />
    </TournamentPhaseShell>
  );
}
