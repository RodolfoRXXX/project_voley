"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface Group {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  partidosTotales: number;
  adminId: string;
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGroups = async () => {
      const q = query(collection(db, "groups"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      const data: Group[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Group, "id">),
      }));

      setGroups(data);
      setLoading(false);
    };

    loadGroups();
  }, []);

  if (loading) return <p>Cargando grupos...</p>;

  return (
    <main className="max-w-4xl mx-auto mt-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Link
          href="/admin/groups/new"
          className="bg-black text-white px-4 py-2 rounded"
        >
          + Crear group
        </Link>
      </div>

      {groups.length === 0 && (
        <p className="text-gray-500">No hay groups creados.</p>
      )}

      <div className="grid gap-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="border rounded p-4 flex justify-between items-center"
          >
            <div>
              <h2 className="text-lg font-semibold">{group.nombre}</h2>
              <p className="text-sm text-gray-600">{group.descripcion}</p>
              <p className="text-sm mt-1">
                Estado: {group.activo ? "🟢 Activo" : "🔴 Inactivo"}
              </p>
              <p className="text-sm">
                Partidos totales: {group.partidosTotales}
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/admin/groups/${group.id}`}
                className="border px-3 py-1 rounded"
              >
                Ver
              </Link>
              <Link
                href={`/admin/groups/${group.id}/matches/new`}
                className="border px-3 py-1 rounded"
              >
                Crear match
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
