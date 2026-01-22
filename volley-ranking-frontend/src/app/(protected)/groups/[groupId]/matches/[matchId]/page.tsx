"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

type Match = {
  id: string;
  estado: string;
  horaInicio: Date | null;
  formacion: string;
  cantidadEquipos: number;
  cantidadSuplentes: number;
  posicionesObjetivo: Record<string, number>;
  groupId: string;
};

type Group = {
  id: string;
  nombre: string;
  descripcion?: string;
};

export default function AdminMatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const { firebaseUser, userDoc, loading } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [participations, setParticipations] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);


  /* =====================
     Guards
  ===================== */
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/");
    }
  }, [firebaseUser, loading, router]);

  /* =====================
     Load match + participations
  ===================== */
  useEffect(() => {
    if (!matchId) return;

    const load = async () => {
      try {
        // Match
        const ref = doc(db, "matches", matchId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          router.replace("/dashboard");
          return;
        }

        const data = snap.data();

        // Group
        const groupRef = doc(db, "groups", data.groupId);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
          setGroup({
            id: groupSnap.id,
            nombre: groupSnap.data().nombre,
            descripcion: groupSnap.data().descripcion,
          });
        }

        setMatch({
                id: snap.id,
                estado: data.estado,
                formacion: data.formacion,
                cantidadEquipos: data.cantidadEquipos,
                cantidadSuplentes: data.cantidadSuplentes,
                posicionesObjetivo: data.posicionesObjetivo,
                groupId: data.groupId,
                horaInicio: data.horaInicio?.toDate
                    ? data.horaInicio.toDate()
                    : null,
                });

        // Participations
        const q = query(
          collection(db, "participations"),
          where("matchId", "==", matchId)
        );

        const snapP = await getDocs(q);
        setParticipations(
          snapP.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [matchId, router]);

  if (loading || loadingData) return <p>Cargando...</p>;
  if (!match) return null;

  /* =====================
     Cupos ocupados
  ===================== */
  const ocupadosPorPosicion: Record<string, number> = {};

  participations
    .filter((p) => p.estado === "titular")
    .forEach((p) => {
      ocupadosPorPosicion[p.posicion] =
        (ocupadosPorPosicion[p.posicion] || 0) + 1;
    });

    const isAdmin = userDoc?.roles === "admin";

  return (
    <main className="max-w-4xl mx-auto mt-10 space-y-8">
      {/* Header */}
      <div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">
              {group?.nombre ?? "Grupo"}
            </h1>

            {match.estado === "abierto" && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                🟢 activo
              </span>
            )}
          </div>

          {group?.descripcion && (
            <p className="text-gray-600">
              {group.descripcion}
            </p>
          )}
        </div>
        <p className="text-gray-600 mt-1">
          Inicio:{" "}
          {match.horaInicio
            ? match.horaInicio.toLocaleString("es-AR")
            : "Sin fecha"}
        </p>
      </div>

      {/* Info */}
      <section className="border rounded p-4 space-y-2">
        <p>
          <b>Formación:</b> {match.formacion}
        </p>
        <p>
          <b>Cantidad de equipos:</b> {match.cantidadEquipos}
        </p>
        <p>
          <b>Suplentes:</b> {match.cantidadSuplentes}
        </p>
      </section>

      {/* Cupos */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          Cupos por posición
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {Object.entries(match.posicionesObjetivo).map(
            ([pos, total]) => {
              const ocupados = ocupadosPorPosicion[pos] || 0;

              return (
                <div
                  key={pos}
                  className="border rounded p-3 flex justify-between"
                >
                  <span className="capitalize">{pos}</span>
                  <span>
                    {ocupados} / {total}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* Participations */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          Jugadores anotados
        </h2>

        {participations.length === 0 ? (
          <p className="text-gray-500">
            Todavía no hay jugadores.
          </p>
        ) : (
          <ul className="space-y-2">
            {participations.map((p) => (
              <li
                key={p.id}
                className="border rounded p-3 flex justify-between"
              >
                <span>
                  {p.nombre || p.userId} ·{" "}
                  <b>{p.posicion}</b>
                </span>

                <span className="text-sm text-gray-600">
                  {p.estado}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Acciones */}
      <section className="border-t pt-6">
        <h2 className="text-xl font-semibold mb-3">
          Acciones
        </h2>
        {isAdmin && (
          <div className="flex gap-4">
            {match.estado === "abierto" && (
              <button className="bg-black text-white px-4 py-2 rounded">
                Cerrar match
              </button>
            )}

            {match.estado !== "abierto" && (
              <button className="border px-4 py-2 rounded">
                Reabrir
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
