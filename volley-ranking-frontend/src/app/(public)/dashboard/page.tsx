
// -------------------
// Dashboard
// -------------------

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import MatchCard from "@/components/matchCard/MatchCard";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import type { Match } from "@/types/match";
import { tournamentPhaseTypeLabel, type TournamentPhaseType } from "@/types/tournaments/tournamentPhase";
import { getTournamentFormatLabel, tournamentStatusLabel } from "@/types/tournaments/tournament";
import useToast from "@/components/ui/toast/useToast";
import { handleAuthPopupError } from "@/lib/auth/handleAuthPopupError";
import { useRouter } from "next/navigation";
import PublicTournamentDetailModal from "@/components/tournaments/public/PublicTournamentDetailModal";

const SOCIAL_MATCH_STATUSES = ["abierto", "verificando", "cerrado", "cancelado"] as const;

type TournamentDashboardMatch = {
  id: string;
  tournamentId: string;
  tournamentName: string;
  tournamentType: string;
  phaseType: TournamentPhaseType | "group_stage";
  roundLabel?: string | null;
  homeTeamName: string;
  awayTeamName: string;
};

type TournamentDashboardCard = {
  id: string;
  name: string;
  format: string;
  phaseType: TournamentPhaseType | "group_stage";
  description: string;
  teamsCount: number;
  nextMatch: TournamentDashboardMatch | null;
  standings: Array<{ id: string; teamId: string; teamName: string; position: number; points: number; played: number }>;
  upcomingMatches: TournamentDashboardMatch[];
  importantInfo: string[];
};

type TournamentMatchQueryRow = {
  id: string;
  tournamentId?: string;
  phaseId?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  roundLabel?: string | null;
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
  const router = useRouter();
  const { firebaseUser, userDoc, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTournamentCards, setActiveTournamentCards] = useState<TournamentDashboardCard[]>([]);
  const [selectedTournamentCard, setSelectedTournamentCard] = useState<TournamentDashboardCard | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [tournamentLoading, setTournamentLoading] = useState(true);
  const [groupsMap, setGroupsMap] = useState<Record<string, string>>({});

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      return true;
    } catch (err) {
      handleAuthPopupError(err, showToast);
      return false;
    }
  };

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
    const loadTournamentCards = async () => {
      const tournamentsSnap = await getDocs(query(collection(db, "tournaments"), where("status", "==", "activo")));

      const cards = await Promise.all(
        tournamentsSnap.docs.map(async (docSnap) => {
          const tournamentData = docSnap.data() as Omit<TournamentQueryRow, "id"> & { description?: string; status?: string; currentPhaseId?: string };
          const tournamentId = docSnap.id;

          const [phasesSnap, teamsSnap, matchesSnap, standingsSnap] = await Promise.all([
            getDocs(query(collection(db, "tournamentPhases"), where("tournamentId", "==", tournamentId))),
            getDocs(query(collection(db, "tournamentTeams"), where("tournamentId", "==", tournamentId))),
            getDocs(query(collection(db, "tournamentMatches"), where("tournamentId", "==", tournamentId), where("status", "==", "scheduled"))),
            getDocs(query(collection(db, "tournamentStandings"), where("tournamentId", "==", tournamentId))),
          ]);

          const phaseDocs = phasesSnap.docs.map((phaseDoc): TournamentPhaseQueryRow => {
            const data = phaseDoc.data() as Omit<TournamentPhaseQueryRow, "id">;
            return { id: phaseDoc.id, ...data };
          });
          const currentPhase = phaseDocs.find((phase) => phase.id === tournamentData.currentPhaseId) || phaseDocs[0];

          const teams = teamsSnap.docs.map((teamDoc) => ({
            id: teamDoc.id,
            name: String((teamDoc.data() as { nameTeam?: string; name?: string }).nameTeam || (teamDoc.data() as { name?: string }).name || "Equipo"),
          }));
          const teamsMap = new Map(teams.map((team) => [team.id, team.name]));

          const pendingMatches = matchesSnap.docs
            .map((matchDoc): TournamentMatchQueryRow => {
              const data = matchDoc.data() as Omit<TournamentMatchQueryRow, "id"> & { round?: number; sequence?: number };
              return { id: matchDoc.id, ...data };
            })
            .sort((a, b) => {
              const roundA = Number((a as { round?: number }).round || 0);
              const roundB = Number((b as { round?: number }).round || 0);
              const seqA = Number((a as { sequence?: number }).sequence || 0);
              const seqB = Number((b as { sequence?: number }).sequence || 0);
              return roundA - roundB || seqA - seqB;
            });

          const mappedMatches = pendingMatches.map((match) => ({
            id: String(match.id),
            tournamentId,
            tournamentName: String(tournamentData.name || "Torneo"),
            tournamentType: String(tournamentData.format || "-"),
            phaseType: (phaseDocs.find((phase) => phase.id === String(match.phaseId || ""))?.type || "group_stage") as TournamentPhaseType | "group_stage",
            roundLabel: match.roundLabel || null,
            homeTeamName: teamsMap.get(String(match.homeTeamId || "")) || "Equipo por definir",
            awayTeamName: teamsMap.get(String(match.awayTeamId || "")) || "Equipo por definir",
          }));

          const standings = standingsSnap.docs
            .map((standingDoc) => {
              const standingData = standingDoc.data() as {
                teamId?: string;
                phaseId?: string;
                position?: number;
                stats?: { points?: number; played?: number };
              };
              return {
                id: standingDoc.id,
                teamId: String(standingData.teamId || ""),
                phaseId: String(standingData.phaseId || ""),
                teamName: teamsMap.get(String(standingData.teamId || "")) || "Equipo",
                position: Number(standingData.position || 0),
                points: Number(standingData.stats?.points || 0),
                played: Number(standingData.stats?.played || 0),
              };
            })
            .filter((standing) => !currentPhase?.id || standing.phaseId === currentPhase.id)
            .reduce<Array<{ id: string; teamId: string; teamName: string; position: number; points: number; played: number }>>((acc, standing) => {
              const existingIndex = acc.findIndex((item) => item.teamId === standing.teamId);

              if (existingIndex === -1) {
                acc.push({
                  id: standing.id,
                  teamId: standing.teamId,
                  teamName: standing.teamName,
                  position: standing.position,
                  points: standing.points,
                  played: standing.played,
                });
                return acc;
              }

              const currentItem = acc[existingIndex];
              if (
                standing.position < currentItem.position
                || (standing.position === currentItem.position && standing.points > currentItem.points)
              ) {
                acc[existingIndex] = {
                  id: standing.id,
                  teamId: standing.teamId,
                  teamName: standing.teamName,
                  position: standing.position,
                  points: standing.points,
                  played: standing.played,
                };
              }

              return acc;
            }, [])
            .sort((a, b) => b.points - a.points || a.position - b.position || a.teamName.localeCompare(b.teamName, "es"))
            .map((standing, index) => ({
              ...standing,
              position: index + 1,
            }))
            .slice(0, 6);

          const importantInfo = [
            `Estado actual: ${tournamentStatusLabel[(tournamentData.status as keyof typeof tournamentStatusLabel) || "activo"] || "Activo"}`,
            `Equipos confirmados: ${teams.length}`,
            `Partidos pendientes: ${mappedMatches.length}`,
          ];

          return {
            id: tournamentId,
            name: String(tournamentData.name || "Torneo"),
            format: getTournamentFormatLabel(tournamentData.format),
            phaseType: (currentPhase?.type || "group_stage") as TournamentPhaseType | "group_stage",
            description: String(tournamentData.description || "Sin descripción disponible."),
            teamsCount: teams.length,
            nextMatch: mappedMatches[0] || null,
            standings,
            upcomingMatches: mappedMatches.slice(0, 5),
            importantInfo,
          } as TournamentDashboardCard;
        })
      );

      setActiveTournamentCards(cards);
    };

    loadTournamentCards().finally(() => setTournamentLoading(false));
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
      <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 space-y-6 pb-12">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-72" />
        </div>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-5">
          <Skeleton className="h-6 w-44 rounded-full" />
          <Skeleton className="h-12 w-full max-w-2xl" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-11 w-40 rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-neutral-100 p-4 space-y-3">
                <Skeleton className="h-10 w-10 rounded-2xl" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-md" />
            ))}
          </div>
        </div>

        <section className="space-y-3">
          <Skeleton className="h-7 w-44" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="min-w-[280px] sm:min-w-[330px] rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </section>
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
                <button
                  type="button"
                  onClick={login}
                  className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-orange-600 hover:scale-[1.02] shadow-lg shadow-orange-500/20"
                >
                  Empezar ahora
                </button>
              </div>

            </header>

            {/* Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {featureCards.map((feature) => (
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

      {matches.length === 0 && activeTournamentCards.length === 0 ? (
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

        {activeTournamentCards.length > 0 && (
          <section className="space-y-3">
  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
    Torneos activos
  </h3>

  <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
    {activeTournamentCards.map((tournamentCard) => (
      <article
        key={tournamentCard.id}
        className="group min-w-[280px] sm:min-w-[330px] snap-start rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4 shadow-sm hover:shadow-md transition-all duration-300"
      >

        {/* Header */}
        <div className="space-y-1">
          <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {tournamentCard.name}
          </p>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
              {tournamentCard.format}
            </span>
            <span className="text-neutral-400">•</span>
            <span>
              {tournamentPhaseTypeLabel[tournamentCard.phaseType]}
            </span>
          </div>
        </div>

        {/* Próximo partido */}
        <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/60 px-3 py-2 text-sm">
          <p className="text-xs text-neutral-500 mb-1">
            Próximo partido
          </p>

          {tournamentCard.nextMatch ? (
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              <span>{tournamentCard.nextMatch.homeTeamName}</span>
              <span className="text-neutral-400 mx-1">vs</span>
              <span>{tournamentCard.nextMatch.awayTeamName}</span>
            </p>
          ) : (
            <p className="text-neutral-500">
              Sin partidos pendientes
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-neutral-500">
            {tournamentCard.teamsCount} equipos
          </span>

          <button
            type="button"
            onClick={() => setSelectedTournamentCard(tournamentCard)}
            className="text-sm font-medium text-orange-600 hover:text-orange-700 transition"
          >
            Ver detalle →
          </button>
        </div>

      </article>
    ))}
  </div>
</section>
        )}
        </>
      )}
      <PublicTournamentDetailModal
        open={selectedTournamentCard !== null}
        tournamentCard={selectedTournamentCard}
        onClose={() => setSelectedTournamentCard(null)}
        onOpenDetail={async (tournamentId) => {
          if (firebaseUser) {
            router.push(`/tournaments/${tournamentId}`);
            return;
          }
          const success = await login();
          if (!success) return;
          router.push(`/tournaments/${tournamentId}`);
        }}
      />

    </main>
  );
}
