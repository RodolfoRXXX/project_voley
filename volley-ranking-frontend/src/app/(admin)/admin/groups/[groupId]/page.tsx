"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function AdminGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { firebaseUser, userDoc, loading } = useAuth();

  const [group, setGroup] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  /* =====================
     Guards
  ===================== */
  useEffect(() => {
    if (!loading && (!firebaseUser || userDoc?.roles !== "admin")) {
      router.replace("/");
    }
  }, [firebaseUser, userDoc, loading, router]);

  /* =====================
     Load group + matches
  ===================== */
  useEffect(() => {
    if (!groupId) return;

    const load = async () => {
      try {
        // Group
        const ref = doc(db, "groups", groupId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          router.replace("/admin/groups");
          return;
        }

        setGroup({ id: snap.id, ...snap.data() });

        // Matches del group
        const q = query(
          collection(db, "matches"),
          where("groupId", "==", groupId)
        );

        const snapMatches = await getDocs(q);
        setMatches(
          snapMatches.docs.map((d) => {
            const data = d.data();

            return {
              id: d.id,
              ...data,
              horaInicio: data.horaInicio?.toDate?.() ?? null,
              createdAt: data.createdAt?.toDate?.() ?? null,
            };
          })
        );
      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [groupId, router]);

  if (loading || loadingData) return <p>Cargando...</p>;
  if (!group) return null;

  return (
    <main className="max-w-4xl mx-auto mt-10 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{group.nombre}</h1>
          <p className="text-gray-600 mt-1">{group.descripcion}</p>

          <div className="flex gap-4 mt-3 text-sm">
            <span>
              Estado:{" "}
              <b className={group.activo ? "text-green-600" : "text-red-600"}>
                {group.activo ? "Activo" : "Inactivo"}
              </b>
            </span>

            <span>
              Partidos jugados: <b>{group.partidosTotales}</b>
            </span>
          </div>
        </div>

        <Link
          href={`/admin/groups/${groupId}/matches/new`}
          className="bg-black text-white px-4 py-2 rounded"
        >
          + Crear match
        </Link>
      </div>

      {/* Matches */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Matches</h2>

        {matches.length === 0 ? (
          <p className="text-gray-500">Todavía no hay matches en este group.</p>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div
                key={m.id}
                className="border rounded p-4 flex justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {m.estado?.toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Inicio:{" "}
                    {m.horaInicio
                      ? m.horaInicio.toLocaleString("es-AR")
                      : "Sin fecha"}
                  </p>
                </div>

                <Link
                  href={`/admin/groups/${groupId}/matches/${m.id}`}
                  className="text-blue-600 text-sm"
                >
                  Ver detalle →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
