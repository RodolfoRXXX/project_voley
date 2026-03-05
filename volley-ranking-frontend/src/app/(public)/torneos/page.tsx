"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import { Tournament, tournamentStatusLabel } from "@/types/tournament";
import { useAuth } from "@/hooks/useAuth";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";

const requestTournamentRegistrationFn = httpsCallable(functions, "requestTournamentRegistration");

type GroupOption = { id: string; nombre: string };

function TournamentsSkeleton() {
  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <SkeletonSoft className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <SkeletonSoft className="h-4 w-3/4" />
            <SkeletonSoft className="h-4 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}

export default function TorneosPage() {
  const { firebaseUser, userDoc } = useAuth();
  const { showToast } = useToast();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [managedGroups, setManagedGroups] = useState<GroupOption[]>([]);
  const [selectedGroupByTournament, setSelectedGroupByTournament] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [joiningTournamentId, setJoiningTournamentId] = useState<string | null>(null);

  const isAdmin = userDoc?.roles === "admin";

  useEffect(() => {
    const load = async () => {
      const tournamentsRef = collection(db, "tournaments");
      const q = query(
        tournamentsRef,
        where("status", "in", ["inscripciones_abiertas", "activo"])
      );

      const snap = await getDocs(q);
      const rows = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Tournament, "id">),
      }));

      setTournaments(rows);
      setLoading(false);
    };

    load();
  }, []);

  useEffect(() => {
    const loadManagedGroups = async () => {
      if (!firebaseUser || !isAdmin) {
        setManagedGroups([]);
        return;
      }

      const groupsRef = collection(db, "groups");
      const groupsSnap = await getDocs(
        query(groupsRef, where("adminIds", "array-contains", firebaseUser.uid))
      );

      const options = groupsSnap.docs.map((groupDoc) => ({
        id: groupDoc.id,
        nombre: (groupDoc.data().nombre as string) || "Grupo sin nombre",
      }));

      setManagedGroups(options);
    };

    loadManagedGroups();
  }, [firebaseUser, isAdmin]);

  const defaultGroupId = useMemo(() => managedGroups[0]?.id || "", [managedGroups]);

  const requestJoin = async (tournamentId: string) => {
    const groupId = selectedGroupByTournament[tournamentId] || defaultGroupId;
    if (!groupId) {
      showToast({ type: "error", message: "Primero elegí un grupo para inscribir" });
      return;
    }

    setJoiningTournamentId(tournamentId);
    try {
      await requestTournamentRegistrationFn({ tournamentId, groupId });
      showToast({ type: "success", message: "Solicitud de inscripción enviada" });
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudo solicitar inscripción");
    } finally {
      setJoiningTournamentId(null);
    }
  };

  if (loading) return <TournamentsSkeleton />;

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-[var(--foreground)]">Torneos</h1>
        <p className="text-sm text-neutral-500">Explorá torneos vigentes y su estado actual.</p>
      </div>

      {tournaments.length === 0 && (
        <p className="text-sm text-neutral-500">No hay torneos vigentes por el momento.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tournaments.map((tournament) => (
          <article key={tournament.id} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-neutral-900">{tournament.name}</h2>
              <span className="text-xs rounded-full px-2 py-1 bg-orange-100 text-orange-700">
                {tournamentStatusLabel[tournament.status]}
              </span>
            </div>
            <p className="text-sm text-neutral-600">{tournament.description || "Sin descripción"}</p>
            <div className="text-xs text-neutral-500 flex gap-4">
              <span>Formato: <b>{tournament.format}</b></span>
              <span>Equipos: <b>{tournament.acceptedTeamsCount || 0}/{tournament.maxTeams}</b></span>
            </div>

            {isAdmin ? (
              <div className="space-y-2 pt-1">
                <label className="text-xs text-neutral-600">Inscribir uno de tus grupos</label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-lg border px-2 py-1.5 text-sm"
                    value={selectedGroupByTournament[tournament.id] || defaultGroupId}
                    onChange={(e) =>
                      setSelectedGroupByTournament((prev) => ({
                        ...prev,
                        [tournament.id]: e.target.value,
                      }))
                    }
                  >
                    {managedGroups.length === 0 && <option value="">No tenés grupos administrados</option>}
                    {managedGroups.map((group) => (
                      <option key={group.id} value={group.id}>{group.nombre}</option>
                    ))}
                  </select>
                  <button
                    disabled={joiningTournamentId === tournament.id || managedGroups.length === 0}
                    onClick={() => requestJoin(tournament.id)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60"
                  >
                    {joiningTournamentId === tournament.id ? "Enviando..." : "Unirme"}
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/grupos"
                className="inline-flex text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Ver grupos →
              </Link>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
