"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";
import { Tournament, tournamentStatusLabel } from "@/types/tournaments";
import StatusPill from "@/components/ui/status/StatusPill";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import { getAdminTournaments } from "@/services/tournaments/tournamentQueries";

function TournamentsSkeleton() {
  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <SkeletonSoft className="h-4 w-40" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36" />
          <SkeletonSoft className="h-4 w-60" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
            <SkeletonSoft className="h-3 w-2/3" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-6 w-28 rounded-full" />
              <SkeletonSoft className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function AdminTournamentsPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;

    const loadTournaments = async () => {
      setTournaments(await getAdminTournaments(firebaseUser.uid));
      setLoading(false);
    };

    loadTournaments();
  }, [authLoading, firebaseUser]);

  if (loading || authLoading) {
    return <TournamentsSkeleton />;
  }

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <AdminBreadcrumb items={[{ label: "Mis gestión" }, { label: "Torneos" }]} />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-900">Mis torneos</h1>
          <p className="text-sm text-neutral-500">Torneos donde sos administrador.</p>
        </div>

        <Link
          href="/admin/tournaments/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-100 text-sm font-medium hover:bg-neutral-800 dark:border-neutral-300 dark:bg-neutral-900 dark:hover:bg-neutral-800 disabled:opacity-60"
        >
          Crear torneo
        </Link>
      </div>

      {tournaments.length === 0 && <p className="text-sm text-neutral-500">Todavía no tenés torneos creados.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tournaments.map((tournament) => (
          <article
            key={tournament.id}
            className="rounded-xl border border-neutral-200 bg-white p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-semibold text-neutral-900">
                {tournament.name}
              </h2>

              <Link
                href={`/admin/tournaments/${tournament.id}`}
                className="px-3 py-1.5 rounded-lg border text-sm text-neutral-700 hover:bg-neutral-50 text-center"
              >
                Ver detalle
              </Link>
            </div>

            <p className="text-sm text-neutral-600">
              {tournament.description || "Sin descripción"}
            </p>

            <div className="flex items-center justify-between pt-2 text-sm">
              <StatusPill
                label={tournamentStatusLabel[tournament.status]}
                variant="info"
              />

              <span className="text-neutral-600">
                Equipos <b>{tournament.acceptedTeamsCount || 0}/{tournament.maxTeams}</b>
              </span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
