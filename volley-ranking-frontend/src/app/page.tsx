"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import MatchCard from "@/components/matchCard/MatchCard";
import CardCarousel from "@/components/ui/carousel/CardCarousel";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import { TournamentSummaryCard } from "@/components/tournaments/TournamentSummaryCard";
import useToast from "@/components/ui/toast/useToast";
import { handleAuthPopupError } from "@/lib/auth/handleAuthPopupError";
import type { Match } from "@/types/match";
import type { PublicTournamentListItem } from "@/services/tournaments/tournamentQueries";

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
  const matches: Match[] = [];
  const groupsMap: Record<string, string> = {};
  const matchesLoading = false;
  const tournaments: PublicTournamentListItem[] = [];
  const tournamentsLoading = false;
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      handleAuthPopupError(err, showToast);
    }
  };

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
      description: "Tu actividad suma. Seguí tu avance en los partidos y mantené el ritmo para escalar posiciones.",
    },
  ];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveFeatureIndex((currentIndex) => (currentIndex + 1) % featureCards.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [featureCards.length]);

  const displayedMatches = matches.slice(0, 5);

  if (loading) return <HomeSkeleton />;

  return (
    <main className="max-w-5xl w-full mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-8">
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

          <div className="md:hidden">
            <article className="group rounded-md border border-white/80 bg-white/80 dark:bg-slate-900/70 px-4 py-5 backdrop-blur transition">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-br from-orange-100 to-amber-100 text-xl transition">
                {featureCards[activeFeatureIndex].emoji}
              </div>
              <h3 className="font-semibold">{featureCards[activeFeatureIndex].title}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{featureCards[activeFeatureIndex].description}</p>
            </article>

            <div className="mt-4 flex items-center justify-center gap-2">
              {featureCards.map((feature, index) => (
                <button
                  key={feature.title}
                  type="button"
                  aria-label={`Mostrar ${feature.title}`}
                  aria-pressed={index === activeFeatureIndex}
                  onClick={() => setActiveFeatureIndex(index)}
                  className={`h-2.5 w-2.5 rounded-full transition ${index === activeFeatureIndex ? "bg-orange-500" : "bg-orange-200 dark:bg-orange-400/50"}`}
                />
              ))}
            </div>
          </div>

          <div className="hidden gap-4 md:grid md:grid-cols-3">
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Torneos vigentes</h2>
          <Link href="/tournaments" className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">
            Ver todos
          </Link>
        </div>

        {tournaments.length > 0 ? (
          <CardCarousel
            items={tournaments}
            getKey={({ tournament }) => tournament.id}
            renderItem={({ tournament, metrics, phaseSnapshot, winnerTeamNames }) => (
              <TournamentSummaryCard
                tournament={tournament}
                metrics={metrics}
                phaseSnapshot={phaseSnapshot}
                winnerTeamNames={winnerTeamNames}
                href={`/tournaments/${tournament.id}`}
                compact
              />
            )}
          />
        ) : (
          <p className="text-sm text-neutral-500">No hay torneos vigentes por el momento.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Próximos partidos</h2>

        <CardCarousel
          items={displayedMatches}
          getKey={(match) => match.id}
          renderItem={(match) => (
            <MatchCard
              match={match}
              userId={firebaseUser?.uid}
              groupNombre={groupsMap[match.groupId]}
            />
          )}
        />

        {displayedMatches.length === 0 && (
          <p className="text-sm text-neutral-500">No hay nuevos partidos</p>
        )}
      </section>
    </main>
  );
}
