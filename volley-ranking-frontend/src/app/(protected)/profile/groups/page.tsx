"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { useAction } from "@/components/ui/action/useAction";
import StatusPill from "@/components/ui/status/StatusPill";

type GroupItem = {
  id: string;
  nombre: string;
  description: string;
  visibility: "public" | "private";
  joinApproval: boolean;
  totalMatches: number;
  owner: {
    nombre: string;
    photoURL?: string | null;
  } | null;
  memberIds: string[];
  adminIds: string[];
  activeMatches: number;
  activeTournaments: number;
  memberNames: string[];
};
type GroupOwnerDoc = {
  nombre?: string;
  displayName?: string;
  photoURL?: string | null;
};

type GroupBase = Omit<GroupItem, "owner" | "activeMatches" | "activeTournaments" | "memberNames"> & {
  ownerId: string | null;
};

function isDefinedString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function chunkArray<T>(array: T[], size: number) {
  const result: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }

  return result;
}

export default function ProfileGroupsPage() {
  const { firebaseUser } = useAuth();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { run, isLoading } = useAction();

  useEffect(() => {
    const load = async () => {
      if (!firebaseUser) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const byMember = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", firebaseUser.uid)
      );

      const byAdmin = query(
        collection(db, "groups"),
        where("adminIds", "array-contains", firebaseUser.uid)
      );

      const [memberSnap, adminSnap] = await Promise.all([
        getDocs(byMember),
        getDocs(byAdmin),
      ]);

      const merged = new Map<string, GroupBase>();

      [...memberSnap.docs, ...adminSnap.docs].forEach((docItem) => {
        const data = docItem.data();

        merged.set(docItem.id, {
          id: docItem.id,
          nombre: data.name || data.nombre || "Grupo sin nombre",
          description: data.description || data.descripcion || "",
          visibility: data.visibility === "private" ? "private" : "public",
          joinApproval: !!data.joinApproval,
          totalMatches: data.totalMatches ?? data.partidosTotales ?? 0,
          ownerId: data.ownerId || null,
          memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
          adminIds: Array.isArray(data.adminIds) ? data.adminIds : [],
        });
      });

      const groupsArray = Array.from(merged.values());

      // cargar owners
      const ownerIds = [...new Set(groupsArray.map((g) => g.ownerId).filter(Boolean))];

      const ownersMap = new Map<string, GroupOwnerDoc>();

      if (ownerIds.length) {
        const batches = chunkArray(ownerIds, 10);

        for (const batch of batches) {
          const q = query(
            collection(db, "users"),
            where(documentId(), "in", batch)
          );

          const usersSnap = await getDocs(q);

          usersSnap.forEach((doc) => {
            ownersMap.set(doc.id, doc.data());
          });
        }
      }

      const memberIds = [...new Set(groupsArray.flatMap((group) => Array.isArray(group.memberIds) ? group.memberIds : []))];
      const membersMap = new Map<string, GroupOwnerDoc>();
      if (memberIds.length) {
        const memberBatches = chunkArray(memberIds, 10);
        for (const batch of memberBatches) {
          const membersQuery = query(collection(db, "users"), where(documentId(), "in", batch));
          const membersSnap = await getDocs(membersQuery);
          membersSnap.forEach((doc) => {
            membersMap.set(doc.id, doc.data());
          });
        }
      }

      const activeTournamentStatuses = new Set(["inscripciones_abiertas", "inscripciones_cerradas", "activo"]);
      const finalGroups: GroupItem[] = await Promise.all(groupsArray.map(async (g) => {
        const activeMatchesSnap = await getDocs(
          query(
            collection(db, "matches"),
            where("groupId", "==", g.id),
            where("estado", "in", ["abierto", "verificando", "cerrado"])
          )
        );

        const [registrationSnap, teamsSnap] = await Promise.all([
          getDocs(query(collection(db, "tournamentRegistrations"), where("groupId", "==", g.id))),
          getDocs(query(collection(db, "tournamentTeams"), where("groupId", "==", g.id))),
        ]);
        const tournamentIds = new Set<string>();
        registrationSnap.docs.forEach((doc) => {
          const tournamentId = doc.data()?.tournamentId;
          if (typeof tournamentId === "string" && tournamentId.trim()) tournamentIds.add(tournamentId);
        });
        teamsSnap.docs.forEach((doc) => {
          const tournamentId = doc.data()?.tournamentId;
          if (typeof tournamentId === "string" && tournamentId.trim()) tournamentIds.add(tournamentId);
        });

        let activeTournaments = 0;
        if (tournamentIds.size > 0) {
          const tournamentBatches = chunkArray(Array.from(tournamentIds), 10);
          for (const batch of tournamentBatches) {
            const tournamentsSnap = await getDocs(query(collection(db, "tournaments"), where(documentId(), "in", batch)));
            tournamentsSnap.docs.forEach((tournamentDoc) => {
              const status = tournamentDoc.data()?.status;
              if (typeof status === "string" && activeTournamentStatuses.has(status)) {
                activeTournaments += 1;
              }
            });
          }
        }

        return {
        ...g,
        owner: g.ownerId
          ? {
              nombre:
                ownersMap.get(g.ownerId)?.nombre ||
                ownersMap.get(g.ownerId)?.displayName ||
                "Usuario",
              photoURL: ownersMap.get(g.ownerId)?.photoURL || null,
            }
          : null,
        activeMatches: activeMatchesSnap.size,
        activeTournaments,
        memberNames: (g.memberIds || [])
          .map((memberId: string) => membersMap.get(memberId)?.nombre || membersMap.get(memberId)?.displayName)
          .filter(isDefinedString)
          .slice(0, 4),
      };}));

      setGroups(finalGroups);
      setLoading(false);
    };

    load();
  }, [firebaseUser]);

  const leaveGroup = async (group: GroupItem) => {
    if (!firebaseUser) return;

    await run(
      `leave-group-${group.id}`,
      async () => {
        const token = await firebaseUser.getIdToken();
        const res = await fetch(`/api/groups/${group.id}/join`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "No se pudo salir del grupo");
        }

        setGroups((prev) => prev.filter((g) => g.id !== group.id));
      },
      {
        confirm: {
          message: `¿Querés salir del grupo "${group.nombre}"?`,
          confirmText: "Salir del grupo",
          variant: "danger",
        },
        successMessage: "Saliste del grupo",
      }
    );
  };

  if (loading) {
    return (
      <section className="space-y-5">
        <div className="space-y-1">
          <Skeleton className="h-8 w-40" />
          <SkeletonSoft className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, idx) => (
            <article key={idx} className="rounded-md border border-neutral-200 bg-white p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-2/3" />
                  <SkeletonSoft className="h-4 w-full" />
                  <SkeletonSoft className="h-4 w-4/5" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
              </div>

              <div className="flex gap-4">
                <SkeletonSoft className="h-4 w-24" />
                <SkeletonSoft className="h-4 w-24" />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1">
                  <SkeletonSoft className="h-4 w-28" />
                  <SkeletonSoft className="h-3 w-20" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-8 w-28 rounded-full" />
                <SkeletonSoft className="h-4 w-20" />
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-neutral-900">Mis grupos</h1>

      {groups.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavía no formas parte de ningún grupo.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <article key={group.id} className="rounded-md border border-neutral-200 bg-white p-4 flex flex-col h-full">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-neutral-900">{group.nombre}</h2>
                  <p className="text-sm text-neutral-600">{group.description || "Sin descripción"}</p>
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

              <div className="mt-auto pt-4 space-y-4">
                <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                  <span>
                    Partidos activos: <b>{group.activeMatches}</b>
                  </span>
                  <span>
                    Integrantes: <b>{group.memberIds.length}</b>
                  </span>
                  <span>
                    Torneos activos: <b>{group.activeTournaments}</b>
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t">
                  <UserAvatar
                    nombre={group.owner?.nombre}
                    photoURL={group.owner?.photoURL}
                    size={36}
                  />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {group.owner?.nombre || "No disponible"}
                    </p>
                    <p className="text-xs text-neutral-500">Admin principal</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <ActionButton
                    onClick={() => leaveGroup(group)}
                    loading={isLoading(`leave-group-${group.id}`)}
                    variant="danger_outline"
                    compact
                  >
                    - Salir del grupo
                  </ActionButton>

                  <Link
                    href={`/profile/groups/${group.id}`}
                    className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
                  >
                    Ver detalle →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
