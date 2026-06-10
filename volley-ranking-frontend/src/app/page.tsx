"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import MatchCard from "@/components/matchCard/MatchCard";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import { TournamentSummaryCard } from "@/components/tournaments/TournamentSummaryCard";
import useToast from "@/components/ui/toast/useToast";
import { handleAuthPopupError } from "@/lib/auth/handleAuthPopupError";
import type { Match } from "@/types/match";
import { getPublicTournamentListView, type PublicTournamentListItem } from "@/services/tournaments/tournamentQueries";

const SOCIAL_MATCH_STATUSES = ["abierto", "verificando", "cerrado", "cancelado"] as const;
const CURRENT_TOURNAMENT_STATUSES = ["inscripciones_abiertas", "inscripciones_cerradas", "activo"] as const;

function HomeSkeleton() {
  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 space-y-8 pb-12">
      <section className="rounded-md border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="relative space-y-8">
          <header className="space-y-5">
            <Skeleton className="h-6 w-44 rounded-full" />
            <Skeleton className="h-24 w-full max-w-3xl sm:h-32 lg:h-36" />
            <SkeletonSoft className="h-4 w-full max-w-xl" />
            <Skeleton className="h-11 w-40 rounded-xl" />
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-md border border-neutral-100 p-4 space-y-3">
                <Skeleton className="h-11 w-11 rounded-md" />
                <Skeleton className="h-5 w-2/3" />
                <SkeletonSoft className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <Skeleton className="h-7 w-52" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, idx) => (
            <Skeleton key={idx} className="h-56 rounded-md" />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <Skeleton className="h-7 w-44" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-md" />
          ))}
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  const { firebaseUser } = useAuth();
  const { showToast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [groupsMap, setGroupsMap] = useState<Record<string, string>>({});
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [tournaments, setTournaments] = useState<PublicTournamentListItem[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      handleAuthPopupError(err, showToast);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "matches"),
      where("estado", "in", [...SOCIAL_MATCH_STATUSES])
    );

    const unsub = onSnapshot(q, async (snap) => {
      const ahora = Timestamp.now();
      const loadedMatches: Match[] = snap.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Match, "id">),
        }))
        .filter((match) => match.visibility === "public")
        .filter((match) => match.horaInicio.toMillis() > ahora.toMillis())
        .sort((a, b) => a.horaInicio.toMillis() - b.horaInicio.toMillis());

      const groupIds = Array.from(new Set(loadedMatches.map((match) => match.groupId))).slice(0, 10);

      if (groupIds.length === 0) {
        setGroupsMap({});
        setMatches(loadedMatches);
        setMatchesLoading(false);
        return;
      }

      const snapGroups = await getDocs(query(collection(db, "groups"), where("__name__", "in", groupIds)));
      const map: Record<string, string> = {};
      snapGroups.docs.forEach((docSnap) => {
        map[docSnap.id] = String((docSnap.data() as { nombre?: string }).nombre || "Grupo");
      });

      setGroupsMap(map);
      setMatches(loadedMatches);
      setMatchesLoading(false);
    }, () => {
      setMatches([]);
      setGroupsMap({});
      setMatchesLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    let active = true;

    const loadTournaments = async () => {
      try {
        const rows = await getPublicTournamentListView();
        if (!active) return;
        setTournaments(rows.filter((row) => CURRENT_TOURNAMENT_STATUSES.includes(row.tournament.status as (typeof CURRENT_TOURNAMENT_STATUSES)[number])));
      } finally {
        if (active) setTournamentsLoading(false);
      }
    };

    loadTournaments();

    return () => {
      active = false;
    };
  }, []);

  const loading = matchesLoading || tournamentsLoading;
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

  if (loading) return <HomeSkeleton />;

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-8">
      <section className="relative overflow-hidden rounded-md border border-orange-200/70 dark:border-[var(--border)] bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-orange-300/20 dark:bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-amber-300/20 dark:bg-amber-500/10 blur-3xl" />

        <div className="relative space-y-8">
          <header className="space-y-5">
            <p className="inline-flex w-fit items-center rounded-full border border-orange-200/80 dark:border-orange-400/30 bg-white/80 dark:bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300 backdrop-blur">
              Tu plataforma para deportes
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-[var(--foreground)] leading-tight">
              Organizá tu torneo con{" "}
              <span className="inline-block">
                <span>Sporte</span>
                <span className="logo-x text-5xl sm:text-6xl lg:text-7xl align-middle mx-1 animate-pulse">X</span>
                <span>a</span>
              </span>
            </h1>

            <p className="max-w-2xl text-sm sm:text-base text-slate-600 dark:text-[var(--text-muted)]">
              Organizá partidos, descubrí torneos y seguí tu evolución en una experiencia moderna y clara.
            </p>

            {!firebaseUser ? (
              <button
                type="button"
                onClick={login}
                className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 hover:scale-[1.02] transition shadow-lg shadow-orange-500/20"
              >
                Empezar ahora
              </button>
            ) : null}
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            {featureCards.map((feature) => (
              <article
                key={feature.title}
                className="group rounded-md border border-white/80 bg-white/80 dark:bg-slate-900/70 px-4 py-5 backdrop-blur hover:-translate-y-1 hover:shadow-xl transition"
              >
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-br from-orange-100 to-amber-100 text-xl group-hover:scale-110 transition">
                  {feature.emoji}
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-bold">Torneos vigentes</h2>
        </div>

        {tournaments.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map(({ tournament, metrics, phaseSnapshot, winnerTeamNames }) => (
              <TournamentSummaryCard
                key={tournament.id}
                tournament={tournament}
                metrics={metrics}
                phaseSnapshot={phaseSnapshot}
                winnerTeamNames={winnerTeamNames}
                href={`/tournaments/${tournament.id}`}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No hay torneos vigentes por el momento.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Próximos partidos</h2>

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
        {matches.length === 0 && (
          <p className="text-sm text-neutral-500">No hay nuevos partidos</p>
        )}
      </section>
    </main>
  );
}
