"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { tournamentStatusLabel } from "@/types/tournaments";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import { getProfileTournamentListView, type ProfileTournamentListRow } from "@/services/tournaments/tournamentQueries";

const registrationStatusLabel = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
} as const;

const registrationStatusClass = {
  pendiente: "bg-yellow-100 text-yellow-700",
  aceptado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
} as const;

export default function ProfileTournamentsPage() {
  const { firebaseUser, userDoc } = useAuth();
  const [rows, setRows] = useState<ProfileTournamentListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!firebaseUser) return;

      setRows(await getProfileTournamentListView(firebaseUser.uid, userDoc?.roles));
      setLoading(false);
    };

    load();
  }, [firebaseUser, userDoc?.roles]);

  if (loading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-7 w-40" />
        {[...Array(3)].map((_, idx) => (
          <SkeletonSoft key={idx} className="h-24 rounded-xl" />
        ))}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-neutral-900">Mis torneos</h1>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No tienes inscripciones o equipos de torneos todavía.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <article key={row.id} className="relative rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
              <span
                className={`absolute right-4 top-4 text-xs rounded-full px-2 py-1 ${registrationStatusClass[row.registrationStatus]}`}
              >
                {registrationStatusLabel[row.registrationStatus]}
              </span>

              <h2 className="pr-24 text-base font-semibold text-neutral-900">{row.tournament.name}</h2>
              <p className="text-sm text-neutral-600">{tournamentStatusLabel[row.tournament.status]}</p>
              <p className="text-sm text-neutral-800">{row.nameTeam}</p>

              {row.registrationStatus === "rechazado" ? (
                <span className="inline-block text-sm font-medium text-neutral-400 cursor-not-allowed">
                  Ver detalle
                </span>
              ) : (
                <Link
                  href={
                    row.source === "registration"
                      ? `/profile/tournaments/registrations/${row.entryId}`
                      : `/profile/tournaments/teams/${row.entryId}`
                  }
                  className="inline-block text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  Ver detalle
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
