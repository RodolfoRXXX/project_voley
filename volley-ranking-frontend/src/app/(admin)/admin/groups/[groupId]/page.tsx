
// -------------------
// Admin Group Detail
// -------------------

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db, app } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAction } from "@/components/ui/action/useAction";
import { ActionButton } from "@/components/ui/action/ActionButton";
import Link from "next/link";
import { formatDateTime } from "@/lib/date";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";
import { SkeletonSoft, Skeleton } from "@/components/ui/skeleton/Skeleton";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import StatusPill from "@/components/ui/status/StatusPill";
import AddMemberModal from "@/components/addMemberModal/AddMemberModal";
import { SearchableMember } from "@/components/addMemberModal/AddMemberModal.types";
import { readJsonSafely } from "@/lib/http/readJsonSafely";
import { getTournamentFormatLabel } from "@/types/tournaments/tournament";

type GroupMember = {
  id: string;
  name: string;
  photoURL?: string | null;
  positions?: string[];
  isAdmin?: boolean;
  hasAdminRole?: boolean;
};

type GroupMatch = {
  id: string;
  estado?: string;
  horaInicio?: Date | null;
  createdAt?: Date | null;
  [key: string]: unknown;
};

type GroupData = {
  id: string;
  nombre: string;
  descripcion?: string;
  visibility?: "public" | "private";
  joinApproval?: boolean;
  activo?: boolean;
  ownerId?: string;
  adminId?: string;
  adminIds?: string[];
  members?: GroupMember[];
  pendingRequests?: GroupMember[];
  pendingAdminRequests?: GroupMember[];
  [key: string]: unknown;
};

type GroupTournamentRow = {
  id: string;
  name: string;
  format: string;
  status: string;
};

const functions = getFunctions(app);
const editGroup = httpsCallable(functions, "editGroup");
const toggleGroupActivo = httpsCallable(functions, "toggleGroupActivo");
const addGroupAdmin = httpsCallable(functions, "addGroupAdmin");

const canAdminGroup = (
  group: Pick<GroupData, "adminIds" | "adminId"> | null | undefined,
  uid?: string
) => {
  if (!uid) return false;
  if (Array.isArray(group?.adminIds)) {
    return group.adminIds.includes(uid);
  }
  return group?.adminId === uid;
};

const sortMembersWithAdminsFirst = (members: GroupMember[], ownerId?: string) => {
  const normalizedOwnerId = ownerId ? String(ownerId) : null;
  const collator = new Intl.Collator("es", { sensitivity: "base" });

  const adminMembers = members.filter((member) => member.isAdmin);
  const regularMembers = members.filter((member) => !member.isAdmin);

  const owner = normalizedOwnerId
    ? adminMembers.find((member) => member.id === normalizedOwnerId) || null
    : null;

  const sortedSecondaryAdmins = adminMembers
    .filter((member) => member.id !== normalizedOwnerId)
    .sort((a, b) => collator.compare(a.name, b.name));

  const sortedRegularMembers = [...regularMembers].sort((a, b) =>
    collator.compare(a.name, b.name)
  );

  return owner
    ? [owner, ...sortedSecondaryAdmins, ...sortedRegularMembers]
    : [...sortedSecondaryAdmins, ...sortedRegularMembers];
};


/* =====================
   SKELETON
===================== */

function GroupDetailSkeleton() {
  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 space-y-6">

      {/* Breadcrumb */}
      <SkeletonSoft className="h-4 w-56" />

      {/* Header */}
      <SkeletonSoft className="h-4 w-64" />

      {/* Estado */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        <div className="flex items-center justify-between">
          <SkeletonSoft className="h-4 w-20" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </section>

      {/* Matches */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-neutral-200 bg-white p-4 flex justify-between items-center"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <SkeletonSoft className="h-3 w-48" />
              </div>

              <SkeletonSoft className="h-4 w-20" />
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}

export default function AdminGroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { firebaseUser, userDoc, loading } = useAuth();
  const { run, isLoading } = useAction();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [groupTournaments, setGroupTournaments] = useState<GroupTournamentRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    visibility: "private" as "public" | "private",
    joinApproval: true,
  });

  /* =====================
     Guard
  ===================== */
  useEffect(() => {
    if (!loading && (!firebaseUser || userDoc?.roles !== "admin")) {
      router.replace("/");
    }
  }, [firebaseUser, userDoc, loading, router]);

  const loadGroupDetails = useCallback(async () => {
  if (!firebaseUser?.uid || !groupId) return;

  const groupRef = doc(db, "groups", groupId);
  const snap = await getDoc(groupRef);

  if (!snap.exists()) {
    router.replace("/dashboard");
    return;
  }

  const data = snap.data();

  if (!canAdminGroup(data, firebaseUser.uid)) {
    router.replace("/admin/groups");
    return;
  }

  if (!data.nombre) {
    router.replace("/admin/groups");
    return;
  }

  const memberIds: string[] = Array.isArray(data.memberIds) ? data.memberIds : [];
  const pendingIds: string[] = Array.isArray(data.pendingRequestIds) ? data.pendingRequestIds : [];

  const adminUserIds =
    Array.isArray(data.admins) && data.admins.length > 0
      ? data.admins.map((a: any) => a.userId)
      : Array.isArray(data.adminIds)
      ? data.adminIds
      : [];

  const allUserIds = [...new Set([...memberIds, ...pendingIds])];

  const loadUsersByIds = async (ids: string[]) => {
    if (ids.length === 0) return [];

    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) {
      chunks.push(ids.slice(i, i + 10));
    }

    const results: any[] = [];

    for (const chunk of chunks) {
      const q = query(
        collection(db, "users"),
        where("__name__", "in", chunk)
      );

      const snap = await getDocs(q);

      snap.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
        });
      });
    }

    return results;
  };

  const users = await loadUsersByIds(allUserIds);

  const userMap = new Map(users.map((u) => [u.id, u]));

  const buildMember = (uid: string): GroupMember => {
    const u = userMap.get(uid);

    return {
      id: uid,
      name: u?.nombre || u?.name || u?.displayName || "Usuario",
      photoURL: u?.photoURL || null,
      positions: Array.isArray(u?.posicionesPreferidas)
        ? u.posicionesPreferidas
        : Array.isArray(u?.positions)
        ? u.positions
        : [],
      isAdmin: adminUserIds.includes(uid),
      hasAdminRole: u?.roles === "admin",
    };
  };

  const members = sortMembersWithAdminsFirst(memberIds.map(buildMember), data.ownerId);
  const pendingRequests = pendingIds.map(buildMember);

  const pendingAdminRequests: GroupMember[] = Array.isArray(data.pendingAdminRequestIds)
    ? data.pendingAdminRequestIds.map(buildMember)
    : [];

  const groupData: GroupData = {
    id: snap.id,
    ...data,
    members,
    pendingRequests,
    pendingAdminRequests,
    nombre: typeof data.nombre === "string" ? data.nombre : "",
  };

  const [registrationsSnap, teamsSnap] = await Promise.all([
    getDocs(query(collection(db, "tournamentRegistrations"), where("groupId", "==", groupId))),
    getDocs(query(collection(db, "tournamentTeams"), where("groupId", "==", groupId))),
  ]);
  const tournamentIds = Array.from(new Set([
    ...registrationsSnap.docs.map((row) => String(row.data().tournamentId || "")),
    ...teamsSnap.docs.map((row) => String(row.data().tournamentId || "")),
  ].filter(Boolean)));
  const tournamentRows = await Promise.all(
    tournamentIds.map(async (tournamentId) => {
      const tournamentSnap = await getDoc(doc(db, "tournaments", tournamentId));
      if (!tournamentSnap.exists()) return null;
      const tournamentData = tournamentSnap.data() as { name?: string; format?: string; status?: string };
      return {
        id: tournamentId,
        name: tournamentData.name || "Torneo",
        format: tournamentData.format || "-",
        status: tournamentData.status || "draft",
      };
    })
  );
  setGroupTournaments(tournamentRows.filter((row): row is GroupTournamentRow => Boolean(row)));

  setGroup(groupData);

  setFormData({
    nombre: groupData.nombre,
    descripcion: groupData.descripcion || "",
    visibility: groupData.visibility === "public" ? "public" : "private",
    joinApproval: groupData.joinApproval ?? true,
  });

  const qMatches = query(
    collection(db, "matches"),
    where("groupId", "==", groupId),
    orderBy("horaInicio", "desc")
  );

  const snapMatches = await getDocs(qMatches);

  setMatches(
    snapMatches.docs.map((d) => {
      const m = d.data();

      return {
        id: d.id,
        ...m,
        horaInicio: m.horaInicio?.toDate?.() ?? null,
        createdAt: m.createdAt?.toDate?.() ?? null,
      };
    })
  );
}, [firebaseUser?.uid, groupId, router]);

  /* =====================
     Load data
  ===================== */
  useEffect(() => {
    if (loading || !firebaseUser?.uid || !groupId) return;

    const load = async () => {
      try {
        await loadGroupDetails();
      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [firebaseUser?.uid, groupId, loading, loadGroupDetails]);

  /* =====================
     Actions
  ===================== */
  const saveGroup = () => {
    const hasChanges =
      group?.nombre !== formData.nombre ||
      (group?.descripcion || "") !== formData.descripcion ||
      (group?.visibility === "public" ? "public" : "private") !== formData.visibility ||
      (group?.joinApproval ?? true) !== formData.joinApproval;

    if (!hasChanges) {
      setEditMode(false);
      return;
    }

    return run(
      "save-group",
      async () => {
        await editGroup({
          groupId,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          visibility: formData.visibility,
          joinApproval: formData.joinApproval,
        });

        setGroup((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            visibility: formData.visibility,
            joinApproval: formData.joinApproval,
          };
        });

        setEditMode(false);
      },
      {
        successMessage: "Grupo actualizado",
        errorMessage: "No se pudo guardar el grupo",
      }
    );
  };

  const toggleActivo = () => {
    if (!group) return;

    const currentActivo = !!group.activo;

    return run(
      "toggle-activo",
      async () => {
        await toggleGroupActivo({
          groupId: group.id,
          activo: !currentActivo,
        });

        setGroup((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activo: !prev.activo,
          };
        });
      },
      {
        confirm: {
          message: currentActivo
            ? "¿Seguro que querés desactivar este grupo?"
            : "¿Seguro que querés reactivar este grupo?",
          confirmText: currentActivo ? "Desactivar" : "Reactivar",
          cancelText: "Cancelar",
          variant: currentActivo ? "danger" : "success",
        },
        successMessage: "Estado actualizado",
        errorMessage: "No se pudo actualizar el estado",
      }
    );
  };

  if (loading || loadingData) return <GroupDetailSkeleton />;
  if (!group) return null;

  const resetForm = () => {
    if (!group) return;

    setFormData({
      nombre: group.nombre,
      descripcion: group.descripcion || "",
      visibility: group.visibility === "public" ? "public" : "private",
      joinApproval: group.joinApproval ?? true,
    });
  };

  /* =====================
     Agregado
  ===================== */

  //helper para POST autenticado

  const postWithAuth = async (url: string) => {
    if (!firebaseUser) throw new Error("Debes iniciar sesión");

    const token = await firebaseUser.getIdToken();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = (await readJsonSafely(res)) as { error?: string } | null;

    if (!res.ok) {
      throw new Error(payload?.error || "No se pudo completar la acción");
    }

    return payload;
  };

  //eliminar integrante

  const removeMember = async (userId: string) => {
    await run(
      `remove-member-${userId}`,
      async () => {
        try {
          setActingKey(`remove-${userId}`);

          await postWithAuth(
            `/api/groups/${groupId}/members/${userId}/remove`
          );
          await loadGroupDetails();
        } finally {
          setActingKey(null);
        }
      },
      {
        confirm: {
          message: "¿Querés eliminar a este integrante del grupo?",
          confirmText: "Eliminar integrante",
          cancelText: "Cancelar",
          variant: "danger",
        },
        successMessage: "Integrante eliminado",
      }
    );
  };

  //buscar usuarios para agregar

  const searchUsersToAdd = async (query: string) => {
    if (!firebaseUser) return [];

    const token = await firebaseUser.getIdToken();

    const res = await fetch(
      `/api/groups/${groupId}/members/search?q=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const payload = (await readJsonSafely(res)) as
      | { users?: SearchableMember[] }
      | null;

    return payload?.users || [];
  };

  //agregar integrante

  const addMember = async (userId: string) => {
    try {
      setActingKey(`add-${userId}`);

      await postWithAuth(
        `/api/groups/${groupId}/members/${userId}/add`
      );
      await loadGroupDetails();

    } finally {
      setActingKey(null);
    }
  };

  //aceptar / rechazar solicitudes

  const resolveRequest = async (
    userId: string,
    action: "approve" | "reject"
  ) => {
    try {
      setActingKey(`${action}-${userId}`);

      await postWithAuth(
        `/api/groups/${groupId}/requests/${userId}/${action}`
      );
      await loadGroupDetails();

    } finally {
      setActingKey(null);
    }
  };

  //aceptar / rechazar solicitudes de admin

  const resolveAdminRequest = async (
    userId: string,
    action: "approve" | "reject"
  ) => {
    try {
      setActingKey(`admin-${action}-${userId}`);

      await postWithAuth(
        `/api/groups/${groupId}/admin-requests/${userId}/${action}`
      );
      await loadGroupDetails();

    } finally {
      setActingKey(null);
    }
  };

  //remover admin

  const removeAdmin = async (userId: string) => {
    await run(
      `remove-admin-${userId}`,
      async () => {
        try {
          setActingKey(`remove-admin-${userId}`);

          await postWithAuth(
            `/api/groups/${groupId}/admins/${userId}/remove`
          );
          await loadGroupDetails();
        } finally {
          setActingKey(null);
        }
      },
      {
        confirm: {
          message: "¿Querés quitar permisos de admin a este integrante?",
          confirmText: "Quitar admin",
          cancelText: "Cancelar",
          variant: "danger",
        },
        successMessage: "Admin actualizado",
      }
    );
  };

  const addAdmin = async (userId: string) => {
    await run(
      `add-admin-${userId}`,
      async () => {
        try {
          setActingKey(`add-admin-${userId}`);

          await postWithAuth(
            `/api/groups/${groupId}/admins/${userId}/add`
          );
          await loadGroupDetails();
        } finally {
          setActingKey(null);
        }
      },
      {
        confirm: {
          message: "¿Querés agregar a este integrante como admin del grupo?",
          confirmText: "Agregar admin",
          cancelText: "Cancelar",
          variant: "danger",
        },
        successMessage: "Admin actualizado",
      }
    );
  };


  const isPrimaryAdmin = !!firebaseUser?.uid && group.ownerId === firebaseUser.uid;
  const adminMembersCount = (group.members ?? []).filter((member) => member.isAdmin).length;
  const pendingRequests: GroupMember[] = Array.isArray(group.pendingRequests) ? group.pendingRequests : [];
  const pendingAdminRequests: GroupMember[] = Array.isArray(group.pendingAdminRequests) ? group.pendingAdminRequests : [];

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">

      <AdminBreadcrumb
        items={[
          { label: "Mi gestión"},
          { label: "Grupos", href:"/admin/groups"},
          { label: group.nombre},
        ]}
      />

      {/* Estado */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {group.nombre}
            </h2>
            {group.descripcion && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {group.descripcion}
              </p>
            )}
          </div>

          {!editMode && (
            <button
              onClick={() => {
                resetForm();
                setEditMode(true);
              }}
              type="button"
              className="group inline-flex h-24 w-24 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/70 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Editar grupo"
              title="Editar grupo"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-neutral-900 text-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-transform duration-200 group-hover:scale-105" aria-hidden>
                ✏️
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium ${
              group.activo ? "text-green-600" : "text-red-600"
            }`}
          >
            {group.activo ? "Activo" : "Inactivo"}
          </span>

          <button
            onClick={toggleActivo}
            disabled={isLoading("toggle-activo")}
            type="button"
            role="switch"
            aria-checked={!!group.activo}
            aria-label={`Cambiar estado del grupo: ${group.activo ? "Activo" : "Inactivo"}`}
            className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 disabled:opacity-60 disabled:cursor-not-allowed ${
              group.activo
                ? "border-emerald-500 bg-emerald-500/90"
                : "border-rose-400 bg-rose-500/80"
            }`}
          >
            <span
              className={`absolute inline-flex h-5 w-5 items-center justify-center rounded-full text-xs leading-none transition-all duration-200 ${
                group.activo
                  ? "left-1.5 bg-emerald-700/60 text-white"
                  : "right-1.5 bg-rose-700/60 text-white"
              }`}
              aria-hidden
            >
              {group.activo ? "✓" : "✕"}
            </span>

            <span
              className={`ml-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                group.activo ? "translate-x-7" : "translate-x-0"
              }`}
              aria-hidden
            />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <p className="text-neutral-600">
            Visibilidad: <span className="font-medium text-neutral-900">{group.visibility === "public" ? "Público" : "Privado"}</span>
          </p>
          <p className="text-neutral-600">
            Ingreso: <span className="font-medium text-neutral-900">{group.joinApproval ? "Requiere aprobación" : "Entrada libre"}</span>
          </p>
        </div>
      </section>

      {/* Edit */}
      {editMode && (
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Editar grupo
          </h2>

          <div className="space-y-3">
            <label className="block text-sm">
              <span className="text-neutral-700">Nombre</span>
              <input
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="text-neutral-700">Descripción</span>
              <textarea
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="text-neutral-700">Visibilidad</span>
              <select
                value={formData.visibility}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    visibility: e.target.value as "public" | "private",
                  })
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm"
              >
                <option value="private">Privado</option>
                <option value="public">Público</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-neutral-700">Ingreso al grupo</span>
              <select
                value={formData.joinApproval ? "approval_required" : "free"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    joinApproval: e.target.value === "approval_required",
                  })
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm"
              >
                <option value="approval_required">Requiere aprobación</option>
                <option value="free">Entrada libre</option>
              </select>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <ActionButton
              onClick={saveGroup}
              loading={isLoading("save-group")}
              variant="success"
            >
              Guardar cambios
            </ActionButton>

            <ActionButton
              onClick={() => {
                resetForm();
                setEditMode(false);
              }}
              variant="secondary"
            >
              Cancelar
            </ActionButton>
          </div>
        </section>
      )}

      {/* ================= MEMBERS ================= */}

      <section className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur p-5 space-y-4">

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Integrantes
          </h2>

          <ActionButton
            variant="secondary"
            compact
            onClick={() => setIsAddMemberModalOpen(true)}
          >
            + Agregar integrante
          </ActionButton>
        </div>

        {pendingAdminRequests.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-700">Solicitudes para ser admin</p>
            <ul className="space-y-2">
              {pendingAdminRequests.map((member) => (
                <li
                  key={`admin-pending-${member.id}`}
                  className="rounded-xl border border-neutral-200 p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar nombre={member.name} photoURL={member.photoURL} size={36} />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{member.name}</p>
                      <p className="text-xs text-neutral-500">Postulación pendiente</p>
                    </div>
                  </div>
                  {isPrimaryAdmin && (
                    <div className="flex items-center gap-2">
                      <ActionButton onClick={() => resolveAdminRequest(member.id, "approve")} loading={actingKey === `admin-approve-${member.id}`} variant="success_outline" compact>
                        Aceptar
                      </ActionButton>
                      <ActionButton onClick={() => resolveAdminRequest(member.id, "reject")} loading={actingKey === `admin-reject-${member.id}`} variant="danger_outline" compact>
                        Eliminar
                      </ActionButton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {pendingRequests.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-700">Solicitudes de ingreso</p>
            <ul className="space-y-2">
              {pendingRequests.map((member) => (
                <li
                  key={`pending-${member.id}`}
                  className="rounded-xl border border-neutral-200 p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar nombre={member.name} photoURL={member.photoURL} size={36} />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{member.name}</p>
                      <p className="text-xs text-neutral-500">Solicitud pendiente</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ActionButton onClick={() => resolveRequest(member.id, "approve")} loading={actingKey === `approve-${member.id}`} variant="success_outline" compact>
                      Aceptar
                    </ActionButton>
                    <ActionButton onClick={() => resolveRequest(member.id, "reject")} loading={actingKey === `reject-${member.id}`} variant="danger_outline" compact>
                      Eliminar
                    </ActionButton>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!group.members || group.members.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay integrantes en el grupo</p>
        ) : (
          <ul className="space-y-2">
            {(group.members ?? []).map((member: GroupMember) => (
              <li
                key={member.id}
                className={`
                  rounded-xl p-3 flex items-center justify-between transition
                  ${member.isAdmin
                    ? "border border-orange-400/60 bg-orange-50/40 dark:bg-orange-500/5"
                    : "border border-neutral-200 bg-white"}
                `}
              >
                <div className="flex items-center gap-3">
                  <UserAvatar nombre={member.name} photoURL={member.photoURL} size={36} />
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {member.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {member.positions?.join(" · ") || "Sin posiciones"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isPrimaryAdmin && member.hasAdminRole && (
                    <ActionButton
                      onClick={() =>
                        member.isAdmin ? removeAdmin(member.id) : addAdmin(member.id)
                      }
                      loading={
                        actingKey === `remove-admin-${member.id}` ||
                        actingKey === `add-admin-${member.id}`
                      }
                      variant="danger_outline"
                      compact
                      disabled={
                        member.id === firebaseUser?.uid &&
                        member.isAdmin &&
                        adminMembersCount <= 1
                      }
                    >
                      {member.isAdmin ? "Quitar admin" : "Agregar admin"}
                    </ActionButton>
                  )}

                  <ActionButton
                    onClick={() => removeMember(member.id)}
                    loading={actingKey === `remove-${member.id}`}
                    variant="danger_outline"
                    compact
                    disabled={member.isAdmin}
                  >
                    Eliminar
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tournament */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Torneos del grupo</h2>
        </div>
        {groupTournaments.length === 0 ? (
          <p className="text-gray-500">Este grupo no tiene torneos asociados.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mb-6">
            {groupTournaments.map((tournament) => (
              <article key={tournament.id} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-1">
                <p className="text-sm font-semibold text-neutral-900">{tournament.name}</p>
                <p className="text-xs text-neutral-600">Tipo: <b>{getTournamentFormatLabel(tournament.format)}</b></p>
                <p className="text-xs text-neutral-600">Estado: <b>{tournament.status}</b></p>
                <Link href={`/tournaments/${tournament.id}`} className="inline-block pt-1 text-sm font-medium text-blue-600 hover:underline">
                  Ver detalle público
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Matches */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Partidos
          </h2>

          <Link
            href={
              group.activo
                ? `/admin/groups/${group.id}/matches/new`
                : "#"
            }
            onClick={(e) => {
              if (!group.activo) e.preventDefault();
            }}
            className={`px-3 py-2 rounded-lg text-sm font-medium dark:border-neutral-300! transition 
              ${
                group.activo
                  ? "bg-neutral-900 text-white hover:bg-neutral-800"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              }
            `}
          >
            Crear partido
          </Link>
        </div>

        {matches.length === 0 ? (
          <p className="text-gray-500">
            Todavía no hay partidos en este grupo.
          </p>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 flex justify-between items-center"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-neutral-900">
                    Estado: {m.estado}
                  </p>

                  <p className="text-sm text-neutral-500">
                    Inicio:{" "}
                    {m.horaInicio
                      ? formatDateTime(m.horaInicio)
                      : "Sin definir"}
                  </p>
                </div>

                <Link
                  href={`/profile/groups/${groupId}/matches/${m.id}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Ver detalle →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <AddMemberModal
        open={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSearch={searchUsersToAdd}
        onAddMember={addMember}
      />
    </main>
  );
}
