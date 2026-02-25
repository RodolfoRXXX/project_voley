"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { db } from "@/lib/firebase";

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

export default function GruposPage() {
  const { firebaseUser } = useAuth();
  const [groups, setGroups] = useState<PublicGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    const q = query(collection(db, "groups"), where("visibility", "==", "public"), where("activo", "==", true));

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
            pendingRequestIds: Array.isArray(live.pendingRequestIds) ? live.pendingRequestIds : [],
          };
        })
      );
    });

    return () => unsub();
  }, [groups.length]);

  const getJoinState = (group: PublicGroup): JoinState => {
    if (!firebaseUser?.uid) return "none";
    if (group.memberIds?.includes(firebaseUser.uid) || group.adminIds?.includes(firebaseUser.uid)) {
      return "member";
    }
    if (group.pendingRequestIds?.includes(firebaseUser.uid)) return "pending";
    return "none";
  };

  const canViewDetail = (group: PublicGroup) => {
    if (!firebaseUser?.uid) return false;
    return !!group.memberIds?.includes(firebaseUser.uid) || !!group.adminIds?.includes(firebaseUser.uid);
  };

  const joinGroup = async (groupId: string) => {
    if (!firebaseUser) {
      setError("Debes iniciar sesión para unirte a un grupo");
      return;
    }

    setError(null);
    setJoiningGroupId(groupId);

    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "No se pudo actualizar la membresía");

      setGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? {
                ...group,
                memberIds: payload.memberIds || group.memberIds || [],
                pendingRequestIds: payload.pendingRequestIds || group.pendingRequestIds || [],
              }
            : group
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la membresía");
    } finally {
      setJoiningGroupId(null);
    }
  };

  const getButtonConfig = (group: PublicGroup) => {
    const state = getJoinState(group);
    if (state === "member") return { label: "- Salir", variant: "danger_outline" as const };
    if (state === "pending") return { label: "Pendiente", variant: "warning" as const };
    return { label: "+ Agregarme", variant: "success" as const };
  };

  return (
    <main className="max-w-6xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <h1 className="text-sm uppercase tracking-wide text-slate-400">Comunidad</h1>
      <h2 className="text-3xl font-bold text-neutral-800 dark:text-[var(--foreground)]">Grupos</h2>

      {loading && <p className="text-gray-500">Cargando grupos...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && groups.length === 0 && (
        <p className="text-gray-500">No hay grupos disponibles.</p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => {
          const buttonConfig = getButtonConfig(group);

          return (
            <article key={group.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${group.visibility === "public" ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-700"}`}>
                  {group.visibility === "public" ? "Público" : "Privado"}
                </span>
                {group.joinApproval && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Aprobación requerida</span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-neutral-900">{group.name}</h3>
                <p className="text-sm text-neutral-600 mt-1">{group.description || "Sin descripción"}</p>
              </div>

              <div className="text-sm text-neutral-600 space-y-1">
                <p>
                  Partidos: <b>{group.totalMatches}</b>
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-neutral-200">
                <UserAvatar
                  nombre={group.owner?.name}
                  photoURL={group.owner?.photoURL}
                  size={36}
                />

                <div>
                  <p className="text-sm font-medium text-neutral-900">{group.owner?.name || "No disponible"}</p>
                  <p className="text-xs text-neutral-500">Admin principal</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <ActionButton
                  onClick={() => joinGroup(group.id)}
                  loading={joiningGroupId === group.id}
                  variant={buttonConfig.variant}
                  compact
                >
                  {buttonConfig.label}
                </ActionButton>

                {canViewDetail(group) ? (
                  <Link
                    href={`/grupos/${group.id}`}
                    className="text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800"
                  >
                    Ver detalle
                  </Link>
                ) : (
                  <span
                    className="text-sm font-medium text-neutral-400 cursor-not-allowed"
                    aria-disabled="true"
                    title="Solo integrantes del grupo pueden ver el detalle"
                  >
                    Ver detalle
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
