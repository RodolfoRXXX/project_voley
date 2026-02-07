
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import MatchHistoryCard from "./MatchHistoryCard";

type Filter =
  | "todos"
  | "abierto"
  | "cerrado"
  | "cancelado"
  | "jugado";

export default function ProfileMatches() {
  const { firebaseUser } = useAuth();

  const [filter, setFilter] = useState<Filter>("todos");

  const [participations, setParticipations] = useState<any[]>([]);
  const [matchesMap, setMatchesMap] = useState<Record<string, any>>({});
  const [groupsMap, setGroupsMap] = useState<Record<string, any>>({});

  /* =====================
     PARTICIPATIONS
  ===================== */
  useEffect(() => {
    if (!firebaseUser) return;

    const q = query(
      collection(db, "participations"),
      where("userId", "==", firebaseUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setParticipations(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });

    return () => unsub();
  }, [firebaseUser]);

  /* =====================
     MATCHES
  ===================== */
  useEffect(() => {
    const matchIds = Array.from(
      new Set(participations.map((p) => p.matchId))
    );

    if (matchIds.length === 0) return;

    const unsubs = matchIds.map((matchId) =>
      onSnapshot(doc(db, "matches", matchId), (snap) => {
        if (!snap.exists()) return;

        setMatchesMap((prev) => ({
          ...prev,
          [matchId]: snap.data(),
        }));
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [participations]);

  /* =====================
     GROUPS
  ===================== */
  useEffect(() => {
    const groupIds = Array.from(
      new Set(
        Object.values(matchesMap)
          .map((m: any) => m.groupId)
          .filter(Boolean)
      )
    );

    if (groupIds.length === 0) return;

    const unsubs = groupIds.map((groupId) =>
      onSnapshot(doc(db, "groups", groupId), (snap) => {
        if (!snap.exists()) return;

        setGroupsMap((prev) => ({
          ...prev,
          [groupId]: snap.data(),
        }));
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [matchesMap]);

  /* =====================
     BUILD HISTORY
  ===================== */
  const history = useMemo(() => {
    return participations
      .map((p) => {
        const match = matchesMap[p.matchId];
        if (!match) return null;

        const group = groupsMap[match.groupId];

        return {
          matchId: p.matchId,
          groupId: match.groupId,

          groupNombre: group?.nombre ?? "Grupo",
          groupDescripcion: group?.descripcion,

          horaInicio: match.horaInicio?.toDate
            ? match.horaInicio.toDate()
            : null,

          matchEstado: match.estado,
          participationEstado: p.estado,
          posicionAsignada: p.posicionAsignada,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        if (!a.horaInicio) return 1;
        if (!b.horaInicio) return -1;
        return b.horaInicio.getTime() - a.horaInicio.getTime();
      });
  }, [participations, matchesMap, groupsMap]);

  /* =====================
     FILTER
  ===================== */
  const filtered = history.filter((h: any) => {
    if (filter === "todos") return true;

    if (filter === "abierto") {
      return (
        h.matchEstado === "abierto" ||
        h.matchEstado === "verificando"
      );
    }

    return h.matchEstado === filter;
  });

  /* =====================
     RENDER
  ===================== */
  return (
    <section className="
      bg-white
      border border-neutral-200
      rounded-xl
      p-6
      space-y-5
    ">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          🏐 Historial de partidos
        </h2>

        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as Filter)
          }
          className="
            self-start sm:self-auto
            rounded-full
            border border-neutral-300
            px-3 py-1.5
            text-sm
            bg-white
            focus:outline-none
            focus:ring-2 focus:ring-orange-400
          "
        >
          <option value="todos">Todos</option>
          <option value="abierto">Abiertos</option>
          <option value="cerrado">Cerrados</option>
          <option value="cancelado">Cancelados</option>
          <option value="jugado">Jugados</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-neutral-500 italic">
          No hay partidos para mostrar.
        </p>
      )}

      <div className="grid gap-4">
        {filtered.map((item: any) => (
          <MatchHistoryCard
            key={item.matchId}
            {...item}
          />
        ))}
      </div>
    </section>

  );
}
