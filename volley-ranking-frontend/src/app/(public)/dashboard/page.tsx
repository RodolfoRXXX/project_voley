
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

type TournamentMatchQueryRow = {
  id: string;
  tournamentId?: string;
  phaseId?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  result?: unknown;
};

type TournamentPhaseQueryRow = {
  id: string;
  tournamentId?: string;
  type?: TournamentPhaseType;
};

type TournamentQueryRow = {
  id: string;
  name?: string;
  format?: string;
};

export default function DashboardPage() {
  const { firebaseUser, userDoc, loading: authLoading } = useAuth();

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
        .map((doc): TournamentMatchQueryRow => {
          const data = doc.data() as Omit<TournamentMatchQueryRow, "id">;
          return { id: doc.id, ...data };
        })
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
          const data = snap.data() as Omit<TournamentQueryRow, "id">;
          return { id: snap.id, ...data } as TournamentQueryRow;
        })
      );
      const phaseDocs = await Promise.all(
        tournamentIds.map(async (tournamentId) => {
          const phasesSnap = await getDocs(query(collection(db, "tournamentPhases"), where("tournamentId", "==", tournamentId)));
          return phasesSnap.docs.map((phaseDoc): TournamentPhaseQueryRow => {
            const data = phaseDoc.data() as Omit<TournamentPhaseQueryRow, "id">;
            return { id: phaseDoc.id, ...data };
          });
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
  const showGuestHero = !authLoading && !firebaseUser;

  const featureCards = [
    {
      emoji: "🏐",
      title: "Partidos sociales en minutos",
      description: "Creá o encontrá partidos abiertos, unite rápido y coordiná con tu grupo desde un solo lugar.",
    },
    {
      emoji: "🏆",
      title: "Torneos organizados",
      description: "Seguí fases, cruces y equipos con una vista clara para vivir cada torneo como profesional.",
    },
    {
      emoji: "📈",
      title: "Ranking y progreso",
      description: "Tu actividad suma. Medí tu avance y mantené el ritmo para escalar posiciones.",
    },
  ];

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
      {showGuestHero && (
        <section className="relative overflow-hidden rounded-3xl border border-orange-200/70 dark:border-[var(--border)] bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6 sm:p-8 shadow-sm">
          <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-orange-300/20 dark:bg-orange-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-amber-300/20 dark:bg-amber-500/10 blur-3xl" />

          <div className="relative space-y-8">

            {/* Badge + título */}
            <header className="space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                
                {/* Badge */}
                <p className="inline-flex w-fit items-center rounded-full border border-orange-200/80 dark:border-orange-400/30 bg-white/80 dark:bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300 backdrop-blur transition-all duration-300 hover:scale-[1.03]">
                  Tu plataforma para deportes
                </p>

                {/* Espacio en desktop */}
                <div className="hidden sm:block" />
              </div>

              {/* Título */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-[var(--foreground)] leading-tight">
                Organizá tu torneo con{" "}
                <span className="inline-block">
                  <span>Sporte</span>
                  <span className="logo-x text-5xl sm:text-6xl lg:text-7xl align-middle mx-1 animate-pulse">
                    X
                  </span>
                  <span>a</span>
                </span>
              </h1>

              {/* Subtexto */}
              <p className="max-w-2xl text-sm sm:text-base text-slate-600 dark:text-[var(--text-muted)]">
                Organizá partidos, descubrí torneos y seguí tu evolución en una experiencia moderna, clara y hecha para la comunidad.
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href="/groups"
                  className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-orange-600 hover:scale-[1.02] shadow-lg shadow-orange-500/20"
                >
                  Empezar ahora
                </a>

                <a
                  href="#"
                  className="inline-flex items-center justify-center rounded-xl border border-neutral-300 dark:border-neutral-700 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-neutral-200 transition-all duration-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Ver demo
                </a>
              </div>

            </header>

            {/* Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {featureCards.map((feature, i) => (
                <article
                  key={feature.title}
                  className="group rounded-2xl border border-white/80 dark:border-[var(--border)] bg-white/80 dark:bg-slate-900/70 backdrop-blur px-4 py-5 shadow-[0_10px_30px_rgba(251,146,60,0.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(251,146,60,0.18)]"
                >
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-500/20 dark:to-amber-500/20 text-xl shadow-inner ring-1 ring-orange-200/70 dark:ring-orange-300/20 transition-transform duration-300 group-hover:scale-110">
                    <span className="-translate-y-[1px]">{feature.emoji}</span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 dark:text-[var(--foreground)]">
                    {feature.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-600 dark:text-[var(--text-muted)]">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>

          </div>
        </section>
      )}

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
