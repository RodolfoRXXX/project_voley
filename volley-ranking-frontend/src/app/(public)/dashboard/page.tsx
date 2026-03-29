
// -------------------
// Dashboard
// -------------------

"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import MatchCard from "@/components/matchCard/MatchCard";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import type { Match } from "@/types/match";
import { tournamentPhaseTypeLabel, type TournamentPhaseType } from "@/types/tournaments/tournamentPhase";
import Link from "next/link";

const SOCIAL_MATCH_STATUSES = ["abierto", "verificando", "cerrado", "cancelado"] as const;

type TournamentDashboardMatch = {
  id: string;
  tournamentId: string;
  tournamentName: string;
  tournamentType: string;
  phaseType: TournamentPhaseType | "group_stage";
  homeTeamName: string;
  awayTeamName: string;
};

export default function DashboardPage() {
  const { firebaseUser, userDoc } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<TournamentDashboardMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [tournamentLoading, setTournamentLoading] = useState(true);
  const [groupsMap, setGroupsMap] = useState<Record<string, string>>({});

  // 🔑 HOOKS SIEMPRE ARRIBA, SIN IF
  useEffect(() => {
    const q = query(
      collection(db, "matches"),
      where("estado", "in", [...SOCIAL_MATCH_STATUSES])
    );

    const unsub = onSnapshot(q, async (snap) => {
      const ahora = Timestamp.now();

      const loadedMatches: Match[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Match, "id">),
      }))
        .filter((match) => match.horaInicio.toMillis() > ahora.toMillis());

      const groupIds = Array.from(new Set(loadedMatches.map((m) => m.groupId)));

      if (groupIds.length === 0) {
        setGroupsMap({});
        setMatchesLoading(false);
        return;
      }

      const qGroups = query(
        collection(db, "groups"),
        where("__name__", "in", groupIds)
      );

      const snapGroups = await getDocs(qGroups);

      const map: Record<string, string> = {};
      const allowedGroupIds = new Set<string>();

      snapGroups.docs.forEach((d) => {
        const group = d.data();
        map[d.id] = group.nombre;

        const isGroupAdmin =
          Array.isArray(group.adminIds) && !!firebaseUser?.uid
            ? group.adminIds.includes(firebaseUser.uid)
            : false;

        const isGroupMember =
          Array.isArray(group.memberIds) && firebaseUser?.uid
            ? group.memberIds.includes(firebaseUser.uid)
            : false;

        if (isGroupAdmin || isGroupMember || userDoc?.roles === "admin") {
          allowedGroupIds.add(d.id);
        }
      });

      const filteredMatches = loadedMatches
        .filter((match) => match.visibility === "public" || allowedGroupIds.has(match.groupId))
        .sort((a, b) => a.horaInicio.toMillis() - b.horaInicio.toMillis());

      setMatches(filteredMatches);
      setGroupsMap(map);
      setMatchesLoading(false);
    });

    return () => unsub();
  }, [firebaseUser?.uid, userDoc?.roles]);

  useEffect(() => {
    const loadTournamentMatches = async () => {
      const matchesSnap = await getDocs(query(collection(db, "tournamentMatches"), where("status", "==", "scheduled")));

      const pendingMatches = matchesSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() as Record<string, unknown> }))
        .filter((match) => !match.result);

      const tournamentIds = Array.from(new Set(pendingMatches.map((match) => String(match.tournamentId || "")).filter(Boolean)));
      if (tournamentIds.length === 0) {
        setTournamentMatches([]);
        return;
      }

      const tournamentDocs = await Promise.all(
        tournamentIds.map(async (tournamentId) => {
          const snap = await getDoc(doc(db, "tournaments", tournamentId));
          if (!snap.exists()) return null;
          return { id: snap.id, ...snap.data() as Record<string, unknown> };
        })
      );
      const phaseDocs = await Promise.all(
        tournamentIds.map(async (tournamentId) => {
          const phasesSnap = await getDocs(query(collection(db, "tournamentPhases"), where("tournamentId", "==", tournamentId)));
          return phasesSnap.docs.map((phaseDoc) => ({ id: phaseDoc.id, ...phaseDoc.data() as Record<string, unknown> }));
        })
      );
      const teamDocs = await Promise.all(
        tournamentIds.map(async (tournamentId) => {
          const teamsSnap = await getDocs(query(collection(db, "tournamentTeams"), where("tournamentId", "==", tournamentId)));
          return teamsSnap.docs.map((teamDoc) => ({
            id: teamDoc.id,
            name: String((teamDoc.data() as { nameTeam?: string; name?: string }).nameTeam || (teamDoc.data() as { name?: string }).name || "Equipo"),
            tournamentId,
          }));
        })
      );

      const tournamentsMap = new Map(tournamentDocs.filter(Boolean).map((doc) => [doc!.id, doc!]));
      const phasesByTournamentId = new Map(phaseDocs.map((phases) => [String(phases[0]?.tournamentId || ""), phases]));
      const teamsMap = new Map(teamDocs.flat().map((team) => [team.id, team.name]));

      const rows = pendingMatches
        .map((match) => {
          const tournamentId = String(match.tournamentId || "");
          const tournamentDoc = tournamentsMap.get(tournamentId);
          if (!tournamentDoc) return null;

          const phaseId = String(match.phaseId || "");
          const phaseType = (phasesByTournamentId.get(tournamentId) || []).find((phase) => phase.id === phaseId)?.type as TournamentPhaseType | undefined;

          return {
            id: String(match.id),
            tournamentId,
            tournamentName: String(tournamentDoc.name || "Torneo"),
            tournamentType: String(tournamentDoc.format || "-"),
            phaseType: phaseType || "group_stage",
            homeTeamName: teamsMap.get(String(match.homeTeamId || "")) || "Equipo por definir",
            awayTeamName: teamsMap.get(String(match.awayTeamId || "")) || "Equipo por definir",
          };
        })
        .filter((row): row is TournamentDashboardMatch => Boolean(row));

      setTournamentMatches(rows);
    };

    loadTournamentMatches().finally(() => setTournamentLoading(false));
  }, []);

  const loading = matchesLoading || tournamentLoading;

  /* =====================
     SKELETON
  ===================== */

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 space-y-6">
        <h1 className="text-sm uppercase tracking-wide text-slate-400">
          Tablero
        </h1>

        <h2 className="text-3xl font-bold text-neutral-800 dark:text-[var(--foreground)]">
          Próximos partidos
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton
              key={i}
              className="h-40 rounded-m"
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <h1 className="text-sm uppercase tracking-wide text-slate-400">
        Tablero
      </h1>

      <h2 className="text-3xl font-bold text-neutral-800 dark:text-[var(--foreground)]">
        Próximos partidos
      </h2>

      {matches.length === 0 && tournamentMatches.length === 0 ? (
        <p className="text-gray-500">No hay partidos disponibles.</p>
      ) : (
        <>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              userId={firebaseUser?.uid}
              groupNombre={groupsMap[match.groupId]}
            />
          ))}
        </div>

        {tournamentMatches.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xl font-semibold text-neutral-900">Próximos partidos de torneos</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournamentMatches.map((match) => (
                <article key={match.id} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
                  <p className="text-sm font-semibold text-neutral-900">{match.tournamentName}</p>
                  <p className="text-xs text-neutral-600">Tipo: <b>{match.tournamentType}</b></p>
                  <p className="text-xs text-neutral-600">Etapa: <b>{tournamentPhaseTypeLabel[match.phaseType]}</b></p>
                  <p className="text-sm text-neutral-700">
                    <b>{match.homeTeamName}</b> vs <b>{match.awayTeamName}</b>
                  </p>
                  <Link href={`/tournaments/${match.tournamentId}`} className="inline-block text-sm font-medium text-orange-600 hover:text-orange-700">
                    Ver detalle
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
        </>
      )}
    </main>
  );
}
