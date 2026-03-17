"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { Tournament, TournamentGroup } from "@/types/tournament";
import { getAdminAction } from "@/lib/tournamentAdmin";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";

type Match = {
  id: string;
  tournamentId: string;
  phase: string;
  round: number;
  groupId?: string | null;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  status: "pending";
};

type GroupedMatches = {
  group: {
    [groupId: string]: {
      [round: string]: Match[];
    };
  };
  knockout: {
    [round: string]: Match[];
  };
};

type TournamentAdminPanelProps = {
  tournament: Tournament;
  onTournamentRefresh: () => Promise<void>;
};

const openRegistrationsFn = httpsCallable(functions, "openTournamentRegistrations");
const closeRegistrationsFn = httpsCallable(functions, "closeTournamentRegistrations");
const previewGroupsFn = httpsCallable(functions, "previewGroups");
const confirmGroupsFn = httpsCallable(functions, "confirmGroups");
const previewFixtureFn = httpsCallable(functions, "previewFixture");
const confirmFixtureFn = httpsCallable(functions, "confirmFixture");

function getGroupIdFromMatch(match: Match) {
  if (match.groupId) return String(match.groupId);

  if (match.phase.startsWith("grupos_")) {
    const groupName = match.phase.replace("grupos_", "");
    return `Grupo ${groupName}`;
  }

  if (match.phase === "group") {
    return "Grupo";
  }

  return null;
}

function isKnockoutPhase(phase: string) {
  return ["eliminacion", "knockout"].includes(phase);
}

function groupMatches(matches: Match[]): GroupedMatches {
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

      if (isKnockoutPhase(match.phase)) {
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

function sortRoundEntries(rounds: Record<string, Match[]>) {
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
            <h4 className="text-sm font-semibold text-neutral-800">{groupId}</h4>
            {sortRoundEntries(rounds).map(([round, matches]) => (
              <div key={`${groupId}-${round}`} className="space-y-1 pl-3 border-l border-neutral-200">
                <p className="text-xs font-medium text-neutral-500">Round {round}</p>
                {matches.map((match) => (
                  <p key={match.id} className="text-sm text-neutral-700">
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
        <div key={group.name} className="rounded border border-neutral-200 p-3">
          <h5 className="text-sm font-semibold text-neutral-900">Grupo {group.name}</h5>
          <ul className="mt-2 space-y-1 text-sm text-neutral-700">
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

  const [busyAction, setBusyAction] = useState(false);
  const [previewGroups, setPreviewGroups] = useState<TournamentGroup[] | null>(null);
  const [groupsSeed, setGroupsSeed] = useState<number | null>(null);
  const [loadingGroupsPreview, setLoadingGroupsPreview] = useState(false);
  const [confirmingGroups, setConfirmingGroups] = useState(false);

  const [previewMatches, setPreviewMatches] = useState<Match[] | null>(null);
  const [confirmedMatches, setConfirmedMatches] = useState<Match[]>([]);
  const [seed, setSeed] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmingFixture, setConfirmingFixture] = useState(false);
  const [loadingConfirmed, setLoadingConfirmed] = useState(false);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});

  const action = getAdminAction(tournament);
  const confirmedGroups = tournament.groups || [];

  const loadConfirmedMatches = useCallback(async () => {
    setLoadingConfirmed(true);
    try {
      const matchesQuery = query(
        collection(db, "tournamentMatches"),
        where("tournamentId", "==", tournament.id)
      );
      const matchesSnap = await getDocs(matchesQuery);
      const nextMatches = matchesSnap.docs.map((matchDoc) => ({
        id: matchDoc.id,
        ...(matchDoc.data() as Omit<Match, "id">),
      }));
      setConfirmedMatches(nextMatches);
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo cargar el fixture confirmado");
    } finally {
      setLoadingConfirmed(false);
    }
  }, [showToast, tournament.id]);

  const loadTournamentTeams = useCallback(async () => {
    try {
      const teamsQuery = query(
        collection(db, "tournamentTeams"),
        where("tournamentId", "==", tournament.id)
      );
      const teamsSnap = await getDocs(teamsQuery);
      const namesMap = teamsSnap.docs.reduce<Record<string, string>>((acc, teamDoc) => {
        const teamData = teamDoc.data() as { nameTeam?: string; name?: string };
        acc[teamDoc.id] = teamData.nameTeam || teamData.name || `Equipo ${teamDoc.id.slice(0, 6)}`;
        return acc;
      }, {});
      setTeamNames(namesMap);
    } catch {
      setTeamNames({});
    }
  }, [tournament.id]);

  useEffect(() => {
    loadConfirmedMatches();
    loadTournamentTeams();
  }, [loadConfirmedMatches, loadTournamentTeams]);

  const onMainAction = async () => {
    if (!action.nextStatus) return;

    setBusyAction(true);

    try {
      if (action.nextStatus === "inscripciones_abiertas") {
        await openRegistrationsFn({ tournamentId: tournament.id });
      }

      if (action.nextStatus === "inscripciones_cerradas") {
        await closeRegistrationsFn({ tournamentId: tournament.id });
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
      const response = await previewGroupsFn({
        tournamentId: tournament.id,
        ...(previewGroups ? { seed: Math.floor(Math.random() * 1000000000) } : {}),
      });

      const data = response.data as { seed: number; groups: TournamentGroup[] };
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
      await confirmGroupsFn({
        tournamentId: tournament.id,
        groups: previewGroups,
      });

      showToast({ type: "success", message: "Grupos confirmados" });
      setPreviewGroups(null);
      setGroupsSeed(null);
      await onTournamentRefresh();
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudieron confirmar los grupos");
    } finally {
      setConfirmingGroups(false);
    }
  };

  const onPreviewFixture = async () => {
    setLoadingPreview(true);

    try {
      const response = await previewFixtureFn({
        tournamentId: tournament.id,
        ...(previewMatches ? { seed: Math.floor(Math.random() * 1000000000) } : {}),
      });

      const data = response.data as { seed: number; matches: Match[] };
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
      await confirmFixtureFn({
        tournamentId: tournament.id,
        matches: previewMatches,
      });

      showToast({ type: "success", message: "Fixture confirmado" });
      await Promise.all([onTournamentRefresh(), loadConfirmedMatches()]);
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo confirmar el fixture");
    } finally {
      setConfirmingFixture(false);
    }
  };

  const groupedPreview = useMemo(() => groupMatches(previewMatches || []), [previewMatches]);
  const groupedConfirmed = useMemo(() => groupMatches(confirmedMatches), [confirmedMatches]);
  const showFixtureActions = tournament.status === "inscripciones_cerradas" && confirmedGroups.length > 0;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
      <h2 className="text-base font-semibold text-neutral-900">Gestión del torneo</h2>

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

      {tournament.status === "inscripciones_cerradas" && (
        <div className="space-y-4 border-t border-neutral-200 pt-4">
          <h3 className="text-base font-semibold text-neutral-900">Organización del torneo</h3>

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

          <p className="text-sm text-neutral-600">Seed de grupos: <b>{groupsSeed ?? "-"}</b></p>

          {previewGroups && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-neutral-900">Vista previa de grupos</h4>
                <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-amber-200 text-amber-900">
                  PREVIEW
                </span>
              </div>
              <GroupsList groups={previewGroups} teamNames={teamNames} />
            </div>
          )}

          {confirmedGroups.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-neutral-900">Grupos confirmados</h4>
                <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-green-200 text-green-900">
                  CONFIRMADO
                </span>
              </div>
              <GroupsList groups={confirmedGroups} teamNames={teamNames} />
            </div>
          )}
        </div>
      )}

      {showFixtureActions && (
        <div className="space-y-4 border-t border-neutral-200 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-neutral-900">Acciones de fixture</h3>
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
          </div>

          <p className="text-sm text-neutral-600">Seed actual: <b>{seed ?? "-"}</b></p>

          {previewMatches !== null && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-neutral-900">Vista previa del fixture</h4>
                <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-amber-200 text-amber-900">
                  Preview (no confirmado)
                </span>
              </div>
              <MatchList groupedMatches={groupedPreview} teamNames={teamNames} />
            </div>
          )}

          {confirmedMatches.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-neutral-900">Fixture confirmado</h4>
                <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-green-200 text-green-900">
                  Confirmado
                </span>
              </div>
              <MatchList groupedMatches={groupedConfirmed} teamNames={teamNames} />
            </div>
          )}

          {!loadingConfirmed && previewMatches === null && confirmedMatches.length === 0 && (
            <p className="text-sm text-neutral-500">Aún no hay fixture en vista previa ni confirmado.</p>
          )}
        </div>
      )}
    </section>
  );
}
