
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

const functions = getFunctions(app);
const editGroup = httpsCallable(functions, "editGroup");
const toggleGroupActivo = httpsCallable(functions, "toggleGroupActivo");

/* =====================
   SKELETON
===================== */

function GroupDetailSkeleton() {
  return (
    <main className="max-w-3xl mx-auto mt-10 space-y-6">

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
      <section className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
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
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
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
    if (!groupId) return;

    const load = async () => {
      try {
        const ref = doc(db, "groups", groupId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          router.replace("/dashboard");
          return;
        }

        const data = snap.data();
        setGroup({ id: snap.id, ...data });

        setFormData({
          nombre: data.nombre,
          descripcion: data.descripcion || "",
        });

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

  /* =====================
     Actions
  ===================== */
  const saveGroup = () =>
    run(
      "save-group",
      async () => {
        await editGroup({
          groupId,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
        });

        setGroup({
          ...group,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
        });

        setEditMode(false);
      },
      {
        successMessage: "Grupo actualizado",
        errorMessage: "No se pudo guardar el grupo",
      }
    );

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
    });
  };

  return (
    <main className="max-w-3xl mx-auto mt-10 space-y-6">

      <AdminBreadcrumb
        items={[
          { label: "Gestión"},
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
      <section className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">
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
      </section>

      {/* Edit */}
      {editMode && (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900">
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
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="text-neutral-700">Descripción</span>
              <textarea
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
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

      {/* Matches */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Juegos
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
            Crear Juego
          </Link>
        </div>

        {matches.length === 0 ? (
          <p className="text-gray-500">
            Todavía no hay juegos en este grupo.
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
    </main>
  );
}
