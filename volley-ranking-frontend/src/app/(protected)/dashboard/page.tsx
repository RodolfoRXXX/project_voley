

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import MatchCard from "@/components/matchCard/MatchCard";

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

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsMap, setGroupsMap] = useState<Record<string, string>>({});

  // 🔑 HOOKS SIEMPRE ARRIBA, SIN IF
  useEffect(() => {
    const load = async () => {
      const q = query(
        collection(db, "matches"),
        where("estado", "!=", "jugado")
      );

      const snap = await getDocs(q);

      const loadedMatches: Match[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Match, "id">),
      }));

      loadedMatches.sort(
        (a, b) => a.horaInicio.toMillis() - b.horaInicio.toMillis()
      );

      setMatches(loadedMatches);

      const groupIds = Array.from(
        new Set(loadedMatches.map((m) => m.groupId))
      );

      if (groupIds.length > 0) {
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
      }

      setLoading(false);
    };

    load();
  }, []);

  // ⬇️ retornos CONDICIONALES van DESPUÉS de los hooks
  if (loading) return <p>Cargando matches...</p>;

  return (
    <main className="max-w-5xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <h2 className="text-3xl font-bold">Próximos partidos</h2>

      {matches.length === 0 ? (
        <p className="text-gray-500">No hay partidos disponibles.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
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
