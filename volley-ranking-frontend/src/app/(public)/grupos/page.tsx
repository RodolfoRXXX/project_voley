
// -------------------
// Public Group View
// -------------------

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { db } from "@/lib/firebase";
import useToast from "@/components/ui/toast/useToast";
import { SkeletonSoft, Skeleton } from "@/components/ui/skeleton/Skeleton";
import StatusPill from "@/components/ui/status/StatusPill";

/* =====================
   TYPES
===================== */

type PublicGroup = {
  id: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  joinApproval: boolean;
  totalMatches: number;
  owner: {
    name: string;
    photoURL?: string | null;
  } | null;
  memberIds?: string[];
  adminIds?: string[];
  pendingRequestIds?: string[];
};

type JoinState = "none" | "member" | "pending";

/* =====================
   SKELETON
===================== */

function GroupsSkeleton() {
  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 pb-12 space-y-6">

      <div className="space-y-1">
        <Skeleton className="h-5 w-32" />
        <SkeletonSoft className="h-4 w-56" />
      </div>

      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="border border-neutral-200 bg-white p-4 space-y-4"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <SkeletonSoft className="h-3 w-2/3" />
            </div>

            <div className="flex gap-4">
              <SkeletonSoft className="h-3 w-20" />
              <SkeletonSoft className="h-3 w-16" />
            </div>

            <div className="flex items-center gap-3 pt-3 border-t">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-2 w-40">
                <Skeleton className="h-3 w-24" />
                <SkeletonSoft className="h-3 w-20" />
              </div>
            </div>

            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

/* =====================
   PAGE
===================== */

export default function GruposPage() {
  const { firebaseUser } = useAuth();
  const [groups, setGroups] = useState<PublicGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const endpoint = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL?.replace(/\/$/, "");
    return base ? `${base}/api/groups/public` : "/api/groups/public";
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        let token: string | null = null;
        if (firebaseUser) token = await firebaseUser.getIdToken();

        const res = await fetch(endpoint, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) throw new Error("No se pudieron cargar los grupos");

        const json = await res.json();
        setGroups(json.groups || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los grupos");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [endpoint, firebaseUser]);

  useEffect(() => {
    if (groups.length === 0) return;

    const q = query(
      collection(db, "groups"),
      where("visibility", "==", "public"),
      where("activo", "==", true)
    );

    const unsub = onSnapshot(q, (snap) => {
      const liveMap = new Map(snap.docs.map((doc) => [doc.id, doc.data()]));

      setGroups((prev) =>
        prev.map((group) => {
          const live = liveMap.get(group.id);
          if (!live) return group;

          return {
            ...group,
            memberIds: Array.isArray(live.memberIds) ? live.memberIds : [],
            adminIds: Array.isArray(live.adminIds) ? live.adminIds : [],
            pendingRequestIds: Array.isArray(live.pendingRequestIds)
              ? live.pendingRequestIds
              : [],
          };
        })
      );
    });

    return () => unsub();
  }, [groups.length]);

  const myGroups = groups.filter(
    (group) =>
      firebaseUser?.uid &&
      (group.memberIds?.includes(firebaseUser.uid) ||
        group.adminIds?.includes(firebaseUser.uid))
  );

  const otherGroups = groups.filter(
    (group) =>
      !firebaseUser?.uid ||
      (!group.memberIds?.includes(firebaseUser.uid) &&
        !group.adminIds?.includes(firebaseUser.uid))
  );

  const getJoinState = (group: PublicGroup): JoinState => {
    if (!firebaseUser?.uid) return "none";
    if (
      group.memberIds?.includes(firebaseUser.uid) ||
      group.adminIds?.includes(firebaseUser.uid)
    ) {
      return "member";
    }
    if (group.pendingRequestIds?.includes(firebaseUser.uid)) return "pending";
    return "none";
  };

  const canViewDetail = (group: PublicGroup) => {
    if (!firebaseUser?.uid) return false;
    return (
      !!group.memberIds?.includes(firebaseUser.uid) ||
      !!group.adminIds?.includes(firebaseUser.uid)
    );
  };

  const joinGroup = async (groupId: string) => {
    if (!firebaseUser) {
      setError("Debes iniciar sesión para unirte a un grupo");
      return;
    }

    setJoiningGroupId(groupId);

    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.error || "No se pudo actualizar la membresía");

      setGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? {
                ...group,
                memberIds: payload.memberIds || group.memberIds || [],
                pendingRequestIds:
                  payload.pendingRequestIds || group.pendingRequestIds || [],
              }
            : group
        )
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la membresía";

      if (message.includes("Hay un solo administrador")) {
        showToast({ type: "error", message });
      } else {
        setError(message);
      }
    } finally {
      setJoiningGroupId(null);
    }
  };

  const getButtonConfig = (group: PublicGroup) => {
    const state = getJoinState(group);
    if (state === "member")
      return { label: "- Salir del grupo", variant: "danger_outline" as const };
    if (state === "pending")
      return { label: "Pendiente", variant: "warning" as const };
    return { label: "+ Agregarme", variant: "success" as const };
  };

  if (loading) return <GroupsSkeleton />;

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-8">

      {/* HEADER */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-[var(--foreground)]">
          Grupos
        </h1>
        <p className="text-sm text-neutral-500">
          Explora y únete a grupos públicos
        </p>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {groups.length === 0 && (
        <p className="text-gray-500">No hay grupos disponibles.</p>
      )}

      {/* =======================
          MIS GRUPOS
      ======================= */}

      {firebaseUser && myGroups.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Mis grupos
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myGroups.map((group) => {
              const buttonConfig = getButtonConfig(group);

              return (
                <div key={group.id} className="rounded-md border border-neutral-200 bg-white p-4 flex flex-col h-full">
                  {/* HEADER (crece libremente) */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-neutral-900">
                        {group.name}
                      </h2>
                      <p className="text-sm text-neutral-600">
                        {group.description || "Sin descripción"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <StatusPill
                        label={group.visibility === "public" ? "Público" : "Privado"}
                        variant={group.visibility === "public" ? "info" : "neutral"}
                        inline
                      />
                      {group.joinApproval && (
                        <StatusPill
                          label="Requiere aprobación"
                          variant="warning"
                          inline
                        />
                      )}
                    </div>
                  </div>

                  {/* 👇 TODO ESTO SE PEGA AL FONDO */}
                  <div className="mt-auto pt-4 space-y-4">

                    <div className="flex gap-4 text-xs text-neutral-500">
                      <span>
                        Partidos: <b>{group.totalMatches}</b>
                      </span>
                      <span>
                        Integrantes: <b>{group.memberIds?.length || 0}</b>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t">
                      <UserAvatar
                        nombre={group.owner?.name}
                        photoURL={group.owner?.photoURL}
                        size={36}
                      />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {group.owner?.name || "No disponible"}
                        </p>
                        <p className="text-xs text-neutral-500">
                          Admin principal
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <ActionButton
                        onClick={() => joinGroup(group.id)}
                        loading={joiningGroupId === group.id}
                        variant={buttonConfig.variant}
                        compact
                      >
                        {buttonConfig.label}
                      </ActionButton>

                      <Link
                        href={`/grupos/${group.id}`}
                        className={`text-sm transition-colors ${
                          canViewDetail(group)
                            ? "text-neutral-500 hover:text-neutral-800"
                            : "text-neutral-300 pointer-events-none"
                        }`}
                      >
                        Ver detalle →
                      </Link>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =======================
          OTROS GRUPOS
      ======================= */}

      {otherGroups.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide">
            Otros grupos
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherGroups.map((group) => {
              const buttonConfig = getButtonConfig(group);

              return (
                <div key={group.id} className="rounded-xl border border-neutral-200 bg-white p-4 flex flex-col h-full">
                  {/* HEADER (crece libremente) */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-neutral-900">
                        {group.name}
                      </h2>
                      <p className="text-sm text-neutral-600">
                        {group.description || "Sin descripción"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <StatusPill
                        label={group.visibility === "public" ? "Público" : "Privado"}
                        variant={group.visibility === "public" ? "info" : "neutral"}
                        inline
                      />
                      {group.joinApproval && (
                        <StatusPill
                          label="Requiere aprobación"
                          variant="warning"
                          inline
                        />
                      )}
                    </div>
                  </div>

                  {/* 👇 TODO ESTO SE PEGA AL FONDO */}
                  <div className="mt-auto pt-4 space-y-4">

                    <div className="flex gap-4 text-xs text-neutral-500">
                      <span>
                        Partidos: <b>{group.totalMatches}</b>
                      </span>
                      <span>
                        Integrantes: <b>{group.memberIds?.length || 0}</b>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t">
                      <UserAvatar
                        nombre={group.owner?.name}
                        photoURL={group.owner?.photoURL}
                        size={36}
                      />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {group.owner?.name || "No disponible"}
                        </p>
                        <p className="text-xs text-neutral-500">
                          Admin principal
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <ActionButton
                        onClick={() => joinGroup(group.id)}
                        loading={joiningGroupId === group.id}
                        variant={buttonConfig.variant}
                        compact
                      >
                        {buttonConfig.label}
                      </ActionButton>

                      <Link
                        href={`/grupos/${group.id}`}
                        className={`text-sm transition-colors ${
                          canViewDetail(group)
                            ? "text-neutral-500 hover:text-neutral-800"
                            : "text-neutral-300 pointer-events-none"
                        }`}
                      >
                        Ver detalle →
                      </Link>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
