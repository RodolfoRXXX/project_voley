"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { Tournament } from "@/types/tournament";
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
const previewFixtureFn = httpsCallable(functions, "previewFixture");
const confirmFixtureFn = httpsCallable(functions, "confirmFixture");

function getGroupIdFromMatch(match: Match) {
  if (match.groupId) return String(match.groupId);

  if (match.phase.startsWith("grupos_")) {
    const groupNumber = match.phase.replace("grupos_", "");
    return `Grupo ${groupNumber}`;
  }

  if (match.phase === "group") {
    return "Grupo";
  }

  return null;
}

function isKnockoutPhase(phase: string) {
  return ["eliminacion", "knockout"].includes(phase);
}

function roundLabel(round: string | number, totalInKnockout?: number) {
  const value = Number(round);

  if (!Number.isFinite(value)) return `Round ${round}`;

  if (!totalInKnockout || totalInKnockout <= 1) {
    if (value >= 1000) return "Final";
    return `Round ${value}`;
  }

  const stageBySize: Record<number, string> = {
    1: "Final",
    2: "Semifinal",
    4: "Cuartos",
    8: "Octavos",
  };

  return stageBySize[totalInKnockout] || `Round ${value}`;
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
  const knockoutRounds = sortRoundEntries(groupedMatches.knockout);

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

      {knockoutRounds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-neutral-800">Knockout</h4>
          {knockoutRounds.map(([round, matches], index) => (
            <div key={`knockout-${round}`} className="space-y-1 pl-3 border-l border-neutral-200">
              <p className="text-xs font-medium text-neutral-500">
                {roundLabel(round, Math.pow(2, knockoutRounds.length - index - 1))}
              </p>
              {matches.map((match) => (
                <p key={match.id} className="text-sm text-neutral-700">
                  {teamNames[match.homeTeamId || ""] || "Por definir"} vs {teamNames[match.awayTeamId || ""] || "Por definir"}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TournamentAdminPanel({ tournament, onTournamentRefresh }: TournamentAdminPanelProps) {
  const { showToast } = useToast();

  const [busyAction, setBusyAction] = useState(false);
  const [previewMatches, setPreviewMatches] = useState<Match[] | null>(null);
  const [confirmedMatches, setConfirmedMatches] = useState<Match[]>([]);
  const [seed, setSeed] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmingFixture, setConfirmingFixture] = useState(false);
  const [loadingConfirmed, setLoadingConfirmed] = useState(false);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});

  const action = getAdminAction(tournament);

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

  const showEmpty = !loadingConfirmed && previewMatches === null && confirmedMatches.length === 0;

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
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-neutral-900">Acciones de fixture</h3>
            <div className="flex gap-2">
              <button
                onClick={onPreviewFixture}
                disabled={loadingPreview}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-neutral-300 disabled:opacity-60"
              >
                {loadingPreview ? "Generando..." : "Generar Fixture"}
              </button>
              <button
                onClick={onConfirmFixture}
                disabled={confirmingFixture || !previewMatches || previewMatches.length === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-900 text-white disabled:opacity-60"
              >
                {confirmingFixture ? "Confirmando..." : "Confirmar Fixture"}
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

          {showEmpty && (
            <p className="text-sm text-neutral-500">Aún no hay fixture en vista previa ni confirmado.</p>
          )}
        </div>
      )}
    </section>
  );
}
