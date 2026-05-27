// -------------------
// Admin Group Page
// -------------------

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";
import { SkeletonSoft, Skeleton } from "@/components/ui/skeleton/Skeleton";

interface Group {
  pendingActionsCount?: number;
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  memberIds?: string[];
  createdAt?: {
    seconds: number;
  };
  ownerId?: string;
  adminIds?: string[];
}

/* =====================
   SKELETON
===================== */

function GroupsSkeleton() {
  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 space-y-6">
      {/* Breadcrumb */}
      <SkeletonSoft className="h-4 w-40" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <SkeletonSoft className="h-4 w-56" />
        </div>

        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 bg-white p-4 flex flex-col h-full"
          >
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-1/3" />
              <SkeletonSoft className="h-3 w-2/3" />

              <div className="flex gap-4 pt-2">
                <SkeletonSoft className="h-3 w-20" />
                <SkeletonSoft className="h-3 w-16" />
              </div>
            </div>

            <div className="mt-auto pt-4 flex gap-2">
              <Skeleton className="h-8 w-14 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function AdminGroupsPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;

    const loadGroups = async () => {
      const groupsRef = collection(db, "groups");
      const [multiAdminSnap, pendingAlertsSnap] = await Promise.all([
        getDocs(
          query(
            groupsRef,
            where("adminIds", "array-contains", firebaseUser.uid),
            orderBy("createdAt", "desc"),
          ),
        ),
        getDocs(
          query(
            collection(db, "users", firebaseUser.uid, "pendingAlerts"),
            where("actorScope.userId", "==", firebaseUser.uid),
            where("status", "==", "active"),
          ),
        ),
      ]);

      const pendingByGroupId = new Map<string, number>();
      pendingAlertsSnap.docs.forEach((alertDoc) => {
        const alertData = alertDoc.data() as {
          severity?: string;
          resource?: { groupId?: string };
        };
        const groupId = alertData.resource?.groupId;
        const isPendingSeverity =
          alertData.severity === "warning" || alertData.severity === "urgent";

        if (!groupId || !isPendingSeverity) return;

        pendingByGroupId.set(groupId, (pendingByGroupId.get(groupId) ?? 0) + 1);
      });

      const data = multiAdminSnap.docs
        .map((groupDoc) => ({
          id: groupDoc.id,
          ...(groupDoc.data() as Omit<Group, "id">),
          pendingActionsCount: pendingByGroupId.get(groupDoc.id) ?? 0,
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0;
          const bTime = b.createdAt?.seconds ?? 0;
          return bTime - aTime;
        });

      setGroups(data);

      setLoading(false);
    };

    loadGroups();
  }, [authLoading, firebaseUser]);

  if (authLoading || loading) return <GroupsSkeleton />;

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <AdminBreadcrumb
        items={[{ label: "Mis gestión" }, { label: "Grupos" }]}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-900">Grupos</h1>
          <p className="text-sm text-neutral-500">
            Gestión de grupos y partidos asociados
          </p>
        </div>

        <Link
          href="/admin/groups/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-100 text-sm font-medium hover:bg-neutral-800 dark:border-neutral-300 dark:bg-neutral-900 dark:hover:bg-neutral-800 disabled:opacity-60"
        >
          Crear grupo
        </Link>
      </div>

      {groups.length === 0 && (
        <p className="text-gray-500">No tenés grupos creados.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="rounded-xl border border-neutral-200 bg-white p-4 flex flex-col h-full"
          >
            {/* Contenido superior */}
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-base font-semibold text-neutral-900">
                  {group.nombre}
                </h2>

                <Link
                  href={`/admin/groups/${group.id}`}
                  className="
                    flex items-center shrink-0 whitespace-nowrap
                    px-3 py-1.5 rounded-lg border
                    text-sm text-neutral-700
                    hover:bg-neutral-50
                    transition-colors
                  "
                >
                  Ver detalle
                </Link>
              </div>

              <p className="text-sm text-neutral-600">
                {group.descripcion}
              </p>
            </div>

            {/* Footer de la card */}
            <div className="mt-auto flex items-center justify-between pt-3 text-sm">

              <div className="flex items-center gap-3">

                <span className="text-neutral-600">
                  Estado:{" "}
                  <b className={group.activo ? "text-green-600" : "text-red-500"}>
                    {group.activo ? "Activo" : "Inactivo"}
                  </b>
                </span>

                {group.pendingActionsCount ? (
                  <div className="flex items-center gap-1.5 text-xs text-orange-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />

                    <span>
                      {group.pendingActionsCount} pendiente
                      {group.pendingActionsCount > 1 ? "s" : ""}
                    </span>
                  </div>
                ) : null}

              </div>

              <span className="text-neutral-600 text-xs">
                Integrantes: <b>{group.memberIds?.length || 0}</b>
              </span>

            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
