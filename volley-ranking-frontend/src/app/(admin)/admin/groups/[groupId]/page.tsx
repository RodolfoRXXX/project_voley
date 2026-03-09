
// -------------------
// Admin Group Detail
// -------------------

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
import useToast from "@/components/ui/toast/useToast";
import { readJsonSafely } from "@/lib/http/readJsonSafely";

const functions = getFunctions(app);
const editGroup = httpsCallable(functions, "editGroup");
const toggleGroupActivo = httpsCallable(functions, "toggleGroupActivo");

const canAdminGroup = (group: any, uid?: string) => {
  if (!uid) return false;
  if (Array.isArray(group?.adminIds)) {
    return group.adminIds.includes(uid);
  }
  return group?.adminId === uid;
};


/* =====================
   SKELETON
===================== */

function GroupDetailSkeleton() {
  return (
    <main className="max-w-3xl mx-auto mt-6 sm:mt-10 space-y-6">

      {/* Breadcrumb */}
      <SkeletonSoft className="h-4 w-56" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <SkeletonSoft className="h-4 w-64" />
        </div>

        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Estado */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 space-y-4">
        <Skeleton className="h-4 w-32" />

        <div className="flex items-center justify-between">
          <SkeletonSoft className="h-4 w-20" />
          <Skeleton className="h-8 w-28 rounded-lg" />
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

  const [group, setGroup] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const { showToast } = useToast();
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

  /* =====================
     Load data
  ===================== */
  useEffect(() => {
    if (loading || !firebaseUser?.uid || !groupId) return;

    const load = async () => {
      try {
        const ref = doc(db, "groups", groupId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          router.replace("/dashboard");
          return;
        }

        const data = snap.data();

        if (!canAdminGroup(data, firebaseUser?.uid)) {
          router.replace("/admin/groups");
          return;
        }

        setGroup({ id: snap.id, ...data });

        setFormData({
          nombre: data.nombre,
          descripcion: data.descripcion || "",
          visibility: data.visibility === "public" ? "public" : "private",
          joinApproval: data.joinApproval ?? true,
        });

        const q = query(
          collection(db, "matches"),
          where("groupId", "==", groupId),
          orderBy("horaInicio", "desc") // 👈 más recientes primero
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
  }, [firebaseUser?.uid, groupId, loading, router]);

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

        setGroup({
          ...group,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          visibility: formData.visibility,
          joinApproval: formData.joinApproval,
        });

        setEditMode(false);
      },
      {
        successMessage: "Grupo actualizado",
        errorMessage: "No se pudo guardar el grupo",
      }
    );
  };

  const toggleActivo = () =>
    run(
      "toggle-activo",
      async () => {
        await toggleGroupActivo({
          groupId: group.id,
          activo: !group.activo,
        });

        setGroup({
          ...group,
          activo: !group.activo,
        });
      },
      {
        confirm: {
          message: group.activo
            ? "¿Seguro que querés desactivar este grupo?"
            : "¿Seguro que querés reactivar este grupo?",
          confirmText: group.activo ? "Desactivar" : "Reactivar",
          cancelText: "Cancelar",
          variant: group.activo ? "danger" : "success",
        },
        successMessage: "Estado actualizado",
        errorMessage: "No se pudo actualizar el estado",
      }
    );

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
    try {
      setActingKey(`remove-${userId}`);

      await postWithAuth(
        `/api/groups/${groupId}/members/${userId}/remove`
      );

    } finally {
      setActingKey(null);
    }
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

    } finally {
      setActingKey(null);
    }
  };

  //remover admin

  const removeAdmin = async (userId: string) => {
    try {
      setActingKey(`remove-admin-${userId}`);

      await postWithAuth(
        `/api/groups/${groupId}/admins/${userId}/remove`
      );

    } finally {
      setActingKey(null);
    }
  };


  return (
    <main className="max-w-3xl mx-auto mt-6 sm:mt-10 pb-12 space-y-6">

      <AdminBreadcrumb
        items={[
          { label: "Mis grupos"},
          { label: "Grupos", href:"/admin/groups"},
          { label: group.nombre},
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-900">
            {group.nombre}
          </h1>

          {group.descripcion && (
            <p className="text-sm text-neutral-500">
              {group.descripcion}
            </p>
          )}
        </div>

        {!editMode && (
          <ActionButton
            onClick={() => {
              resetForm();
              setEditMode(true);
            }}
            variant="secondary"
          >
            Editar grupo
          </ActionButton>
        )}
      </div>

      {/* Estado */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Estado del grupo
        </h2>

        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-medium ${
              group.activo ? "text-green-600" : "text-red-600"
            }`}
          >
            {group.activo ? "Activo" : "Inactivo"}
          </span>

          <ActionButton
            onClick={toggleActivo}
            loading={isLoading("toggle-activo")}
            variant={group.activo ? "danger_outline" : "success"}
            compact
          >
            {group.activo ? "Desactivar" : "Reactivar"}
          </ActionButton>
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

      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
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

        {!group.members || group.members.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No hay integrantes en el grupo
          </p>
        ) : (
          <ul className="space-y-2">
            {(group.members ?? []).map((member: any) => (
              <li
                key={member.id}
                className="rounded-xl border border-neutral-200 p-3 flex items-center justify-between"
              >

                <div className="flex items-center gap-3">

                  <UserAvatar
                    nombre={member.name}
                    photoURL={member.photoURL}
                    size={36}
                  />

                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {member.name}
                    </p>

                    <p className="text-xs text-neutral-500">
                      {member.positions?.join(" · ") || "Sin posiciones"}
                    </p>
                  </div>

                </div>

                {member.isAdmin ? (
                  <StatusPill
                    label="Admin"
                    variant="warning"
                  />
                ) : (
                  <ActionButton
                    onClick={() => removeMember(member.id)}
                    loading={actingKey === `remove-${member.id}`}
                    variant="danger_outline"
                    compact
                  >
                    Eliminar
                  </ActionButton>
                )}

              </li>
            ))}
          </ul>
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
            className={`px-3 py-2 rounded-lg text-sm font-medium transition
              ${
                group.activo
                  ? "bg-neutral-900 text-white hover:bg-neutral-800"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              }
            `}
          >
            Crear Partido
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
                  href={`/groups/${groupId}/matches/${m.id}`}
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
