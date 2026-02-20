
// -------------------
// Dashboard
// -------------------

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import MatchCard from "@/components/matchCard/MatchCard";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";

type Match = {
  id: string;
  groupId: string;
  estado: string;
  formacion: string;
  horaInicio: Timestamp;
  cantidadEquipos: number;
  cantidadSuplentes: number;
  posicionesObjetivo: Record<string, number>;
};

export default function DashboardPage() {
  const { firebaseUser } = useAuth();
  const estadosPermitidos = ["abierto", "verificando", "cerrado", "cancelado"];

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsMap, setGroupsMap] = useState<Record<string, string>>({});

  // 🔑 HOOKS SIEMPRE ARRIBA, SIN IF
  useEffect(() => {
    const q = query(
      collection(db, "matches"),
      where("estado", "in", estadosPermitidos)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const ahora = Timestamp.now();

      const loadedMatches: Match[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Match, "id">),
      }))
        .filter((match) => match.horaInicio.toMillis() > ahora.toMillis());

      loadedMatches.sort(
        (a, b) => a.horaInicio.toMillis() - b.horaInicio.toMillis()
      );

      setMatches(loadedMatches);

      const groupIds = Array.from(
        new Set(loadedMatches.map((m) => m.groupId))
      );

      if (groupIds.length === 0) {
        setGroupsMap({});
        setLoading(false);
        return;
      }

      const qGroups = query(
        collection(db, "groups"),
        where("__name__", "in", groupIds)
      );

      const snapGroups = await getDocs(qGroups);

      const map: Record<string, string> = {};
      snapGroups.docs.forEach((d) => {
        map[d.id] = d.data().nombre;
      });

      setGroupsMap(map);
      setLoading(false);
    });

    return () => unsub();
  }, []);

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
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 space-y-6">
      <h1 className="text-sm uppercase tracking-wide text-slate-400">
        Tablero
      </h1>

      <h2 className="text-3xl font-bold text-neutral-800 dark:text-[var(--foreground)]">
        Próximos partidos
      </h2>

      {matches.length === 0 ? (
        <p className="text-gray-500">No hay partidos disponibles.</p>
      ) : (
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
      )}
    </main>
  );
}
