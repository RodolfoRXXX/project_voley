
// -------------------
// Admin Group Page
// -------------------

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";

interface Group {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  partidosTotales: number;
  adminId: string;
}

/* =====================
   SKELETON
===================== */

function GroupsSkeleton() {
  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 space-y-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="h-4 w-40 bg-neutral-200 rounded" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-5 w-32 bg-neutral-200 rounded" />
          <div className="h-4 w-56 bg-neutral-100 rounded" />
        </div>

        <div className="h-9 w-28 bg-neutral-200 rounded-lg" />
      </div>

      {/* Cards */}
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 bg-white p-4 flex justify-between items-center"
          >
            <div className="space-y-2 w-full">
              <div className="h-4 w-1/3 bg-neutral-200 rounded" />
              <div className="h-3 w-2/3 bg-neutral-100 rounded" />
              <div className="flex gap-4 pt-2">
                <div className="h-3 w-20 bg-neutral-100 rounded" />
                <div className="h-3 w-16 bg-neutral-100 rounded" />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="h-8 w-14 bg-neutral-200 rounded-lg" />
              <div className="h-8 w-24 bg-neutral-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
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

  if (loading) return <GroupsSkeleton />;

  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 space-y-6">

      <AdminBreadcrumb
        items={[
          { label: "Gestión"},
          { label: "Grupos"},
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-900">
            Grupos
          </h1>
          <p className="text-sm text-neutral-500">
            Gestión de grupos y partidos asociados
          </p>
        </div>

        <Link
          href="/admin/groups/new"
          className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition"
        >
          Crear group
        </Link>
      </div>

      {groups.length === 0 && (
        <p className="text-gray-500">No hay grupos creados.</p>
      )}

      <div className="grid gap-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="rounded-xl border border-neutral-200 bg-white p-4 flex justify-between items-center"
          >
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-neutral-900">
                {group.nombre}
              </h2>

              <p className="text-sm text-neutral-600">
                {group.descripcion}
              </p>

              <div className="flex gap-4 text-xs text-neutral-500 pt-1">
                <span>
                  Estado:{" "}
                  <b className={group.activo ? "text-green-600" : "text-red-500"}>
                    {group.activo ? "Activo" : "Inactivo"}
                  </b>
                </span>
                <span>
                  Partidos: <b>{group.partidosTotales}</b>
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/admin/groups/${group.id}`}
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-neutral-50"
              >
                Ver
              </Link>

              <Link
                href={
                  group.activo
                    ? `/admin/groups/${group.id}/matches/new`
                    : "#"
                }
                onClick={(e) => {
                  if (!group.activo) e.preventDefault();
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition
                  ${
                    group.activo
                      ? "bg-neutral-900 text-white hover:bg-neutral-800"
                      : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                  }
                `}
              >
                Crear Juego
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
