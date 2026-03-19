"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Tournament } from "@/types/tournaments";
import {
  type TournamentGroup,
  type TournamentPhase,
  tournamentPhaseStatusLabel,
  tournamentPhaseTypeLabel,
} from "@/types/tournaments";
import { getAdminAction } from "@/lib/tournamentAdmin";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import type { TournamentMatch } from "@/types/tournaments";
import { getConfirmedGroupsFromTournamentContext } from "@/services/tournaments/tournamentAdapters";
import { getTournamentPhases, getTournamentTeams, type TournamentTeamRow, getTournamentMatches } from "@/services/tournaments/tournamentQueries";
import {
  closeTournamentRegistrations,
  confirmTournamentFixture,
  confirmTournamentGroups,
  openTournamentRegistrations,
  previewTournamentFixture,
  previewTournamentGroups,
} from "@/services/tournaments/tournamentMutations";

type GroupedMatches = {
  group: {
    [groupLabel: string]: {
      [round: string]: TournamentMatch[];
    };
  };
  knockout: {
    [round: string]: TournamentMatch[];
  };
};

type TournamentAdminPanelProps = {
  tournament: Tournament;
  onTournamentRefresh: () => Promise<void>;
};


function getGroupIdFromMatch(match: TournamentMatch) {
  return match.groupLabel ? `Grupo ${match.groupLabel}` : null;
}

function isKnockoutPhase(phaseType: TournamentMatch["phaseType"]) {
  return phaseType === "knockout" || phaseType === "final";
}

function groupMatches(matches: TournamentMatch[]): GroupedMatches {
  return matches.reduce<GroupedMatches>(
    (acc, match) => {
      const groupId = getGroupIdFromMatch(match);

      if (groupId) {
        const roundKey = String(match.round);
        if (!acc.group[groupId]) acc.group[groupId] = {};
        if (!acc.group[groupId][roundKey]) acc.group[groupId][roundKey] = [];
        acc.group[groupId][roundKey].push(match);
        return acc;
      }

      if (isKnockoutPhase(match.phaseType)) {
        const roundKey = String(match.round);
        if (!acc.knockout[roundKey]) acc.knockout[roundKey] = [];
        acc.knockout[roundKey].push(match);
      }

      return acc;
    },
    {
      group: {},
      knockout: {},
    }
  );
}

function sortRoundEntries(rounds: Record<string, TournamentMatch[]>) {
  return Object.entries(rounds).sort((a, b) => Number(a[0]) - Number(b[0]));
}

function MatchList({
  groupedMatches,
  teamNames,
}: {
  groupedMatches: GroupedMatches;
  teamNames: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      {Object.entries(groupedMatches.group)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([groupId, rounds]) => (
          <div key={groupId} className="space-y-2">
            <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{groupId}</h4>
            {sortRoundEntries(rounds).map(([round, matches]) => (
              <div key={`${groupId}-${round}`} className="space-y-1 pl-3 border-l border-neutral-200 dark:border-neutral-700">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Round {round}</p>
                {matches.map((match) => (
                  <p key={match.id} className="text-sm text-neutral-700 dark:text-neutral-200">
                    {teamNames[match.homeTeamId || ""] || "Por definir"} vs {teamNames[match.awayTeamId || ""] || "Por definir"}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

function GroupsList({ groups, teamNames }: { groups: TournamentGroup[]; teamNames: Record<string, string> }) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.name} className="rounded border border-neutral-200 p-3 dark:border-neutral-700 dark:bg-neutral-900/60">
          <h5 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Grupo {group.name}</h5>
          <ul className="mt-2 space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
            {group.teamIds.map((teamId) => (
              <li key={`${group.name}-${teamId}`}>• {teamNames[teamId] || `Equipo ${teamId.slice(0, 6)}`}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
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

  const [previewMatches, setPreviewMatches] = useState<TournamentMatch[] | null>(null);
  const [confirmedMatches, setConfirmedMatches] = useState<TournamentMatch[]>([]);
  const [seed, setSeed] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmingFixture, setConfirmingFixture] = useState(false);
  const [loadingConfirmed, setLoadingConfirmed] = useState(false);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});

  const action = getAdminAction(tournament);
  const currentPhase = useMemo(
    () => phases.find((phase) => phase.id === tournament.currentPhaseId) || null,
    [phases, tournament.currentPhaseId]
  );
  const confirmedGroups = getConfirmedGroupsFromTournamentContext({
    phase: currentPhase,
    tournament,
  });
  const hasConfirmedGroups = confirmedGroups.length > 0;
  const hasConfirmedFixture = confirmedMatches.length > 0;

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
      setConfirmedMatches(nextMatches);
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

  useEffect(() => {
    onTournamentRefresh();
    loadPhases();
    loadConfirmedMatches();
    loadTournamentTeams();
  }, [loadConfirmedMatches, loadPhases, loadTournamentTeams, onTournamentRefresh]);

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
        ...(previewMatches ? { seed: Math.floor(Math.random() * 1000000000) } : {}),
      });
      setSeed(data.seed);
      setPreviewMatches(data.matches);
      showToast({ type: "success", message: "Fixture generado en memoria" });
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo generar el fixture");
    } finally {
      setLoadingPreview(false);
    }
  };

  const onConfirmFixture = async () => {
    if (!previewMatches || previewMatches.length === 0) return;

    setConfirmingFixture(true);

    try {
      await confirmTournamentFixture({
        tournamentId: tournament.id,
        ...(currentPhase ? { phaseId: currentPhase.id } : {}),
        matches: previewMatches,
      });

      await onTournamentRefresh();
      await loadPhases();
      await loadConfirmedMatches();
      setPreviewMatches(null);
      setSeed(null);
      showToast({ type: "success", message: "Fixture confirmado correctamente" });
      confirmedFixtureRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo confirmar el fixture");
    } finally {
      setConfirmingFixture(false);
    }
  };

  const groupedPreview = useMemo(() => groupMatches(previewMatches || []), [previewMatches]);
  const groupedConfirmed = useMemo(() => groupMatches(confirmedMatches), [confirmedMatches]);
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
    showFixtureActions ||
    previewMatches !== null ||
    hasConfirmedFixture ||
    (loadingConfirmed && hasConfirmedGroups);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4 dark:border-neutral-800 dark:bg-neutral-950">
      <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Gestión del torneo</h2>

      <div className="rounded-lg border border-neutral-200 p-3 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
        <p>
          <b>Fase actual:</b>{" "}
          {currentPhase ? tournamentPhaseTypeLabel[currentPhase.type] : "Sin fase cargada"}
        </p>
        <p>
          <b>Estado de fase:</b>{" "}
          {currentPhase ? tournamentPhaseStatusLabel[currentPhase.status] : "-"}
        </p>
        <p>
          <b>Tipo backend:</b> {tournament.currentPhaseType || "-"}
        </p>
        {loadingPhases && <p className="text-xs text-neutral-500">Cargando fases...</p>}
      </div>

      {action.nextStatus && (
        <div className="flex justify-start">
          <button
            onClick={onMainAction}
            disabled={busyAction || action.disabled}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-900 text-white disabled:opacity-60"
          >
            {busyAction ? "Procesando..." : action.label}
          </button>
        </div>
      )}

      {showGroupsSection && (
        <div className="space-y-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Organización del torneo</h3>

          {showGroupActions && (
            <div className="flex gap-2">
              <button
                onClick={onPreviewGroups}
                disabled={loadingGroupsPreview}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-neutral-300 disabled:opacity-60"
              >
                {loadingGroupsPreview ? "Generando..." : previewGroups ? "Regenerar grupos" : "Generar grupos"}
              </button>
              <button
                onClick={onConfirmGroups}
                disabled={confirmingGroups || !previewGroups || previewGroups.length === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-900 text-white disabled:opacity-60"
              >
                {confirmingGroups ? "Confirmando..." : "Confirmar grupos"}
              </button>
            </div>
          )}

          <p className="text-sm text-neutral-600 dark:text-neutral-300">Seed de grupos: <b>{groupsSeed ?? "-"}</b></p>

          {previewGroups && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3 dark:border-amber-700 dark:bg-amber-950/30">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Vista previa de grupos</h4>
                <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-amber-200 text-amber-900 dark:bg-amber-800/70 dark:text-amber-100">
                  PREVIEW
                </span>
              </div>
              <GroupsList groups={previewGroups} teamNames={teamNames} />
            </div>
          )}

          {confirmedGroups.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-3 dark:border-green-700 dark:bg-green-950/30">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Grupos confirmados</h4>
                <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-green-200 text-green-900 dark:bg-green-800/70 dark:text-green-100">
                  CONFIRMADO
                </span>
              </div>
              <GroupsList groups={confirmedGroups} teamNames={teamNames} />
            </div>
          )}
        </div>
      )}

      {showFixtureSection && (
        <div className="space-y-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Acciones de fixture</h3>
            {showFixtureActions && (
              <div className="flex gap-2">
                <button
                  onClick={onPreviewFixture}
                  disabled={loadingPreview}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border border-neutral-300 disabled:opacity-60"
                >
                  {loadingPreview ? "Generando..." : "Generar fixture"}
                </button>
                <button
                  onClick={onConfirmFixture}
                  disabled={confirmingFixture || !previewMatches || previewMatches.length === 0}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-900 text-white disabled:opacity-60"
                >
                  {confirmingFixture ? "Confirmando..." : "Confirmar fixture"}
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-300">Seed actual: <b>{seed ?? "-"}</b></p>

          {!hasConfirmedFixture && previewMatches !== null && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3 dark:border-amber-700 dark:bg-amber-950/30">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Vista previa del fixture</h4>
                <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-amber-200 text-amber-900 dark:bg-amber-800/70 dark:text-amber-100">
                  Preview (no confirmado)
                </span>
              </div>
              <MatchList groupedMatches={groupedPreview} teamNames={teamNames} />
            </div>
          )}

          {confirmedMatches.length > 0 && (
            <div
              ref={confirmedFixtureRef}
              className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-3 dark:border-green-700 dark:bg-green-950/30"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Fixture confirmado</h4>
                <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-green-200 text-green-900 dark:bg-green-800/70 dark:text-green-100">
                  Confirmado
                </span>
              </div>
              <MatchList groupedMatches={groupedConfirmed} teamNames={teamNames} />
            </div>
          )}

          {!loadingConfirmed && previewMatches === null && confirmedMatches.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Aún no hay fixture en vista previa ni confirmado.</p>
          )}
        </div>
      )}
    </section>
  );
}
