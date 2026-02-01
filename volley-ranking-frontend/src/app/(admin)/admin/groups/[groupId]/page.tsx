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

const functions = getFunctions(app);
const editGroup = httpsCallable(functions, "editGroup");
const toggleGroupActivo = httpsCallable(functions, "toggleGroupActivo");

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

  if (loading || loadingData) return <p>Cargando...</p>;
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
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{group.nombre}</h1>
          {group.descripcion && (
            <p className="text-gray-600 mt-1">{group.descripcion}</p>
          )}
        </div>

        {!editMode && (
          <ActionButton
            onClick={() => {
              resetForm();
              setEditMode(true);
            }}
          >
            Editar
          </ActionButton>
        )}
      </div>

      {/* Estado */}
      <section className="border rounded p-4">
        <h2 className="text-xl font-semibold mb-3">
          Estado del grupo
        </h2>

        <div className="flex items-center gap-4">
          <span
            className={`text-sm ${
              group.activo ? "text-green-600" : "text-red-600"
            }`}
          >
            {group.activo ? "🟢 Activo" : "🔴 Inactivo"}
          </span>

          <ActionButton
            onClick={toggleActivo}
            loading={isLoading("toggle-activo")}
            variant={group.activo ? "danger" : "success"}
          >
            {group.activo ? "Desactivar" : "Reactivar"}
          </ActionButton>
        </div>
      </section>

      {/* Edit */}
      {editMode && (
        <section className="border rounded p-4 space-y-4">
          <label className="block">
            Nombre
            <input
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              className="border rounded px-2 py-1 w-full"
            />
          </label>

          <label className="block">
            Descripción
            <textarea
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  descripcion: e.target.value,
                })
              }
              className="border rounded px-2 py-1 w-full"
            />
          </label>

          <div className="flex gap-3">
            <ActionButton
              onClick={saveGroup}
              loading={isLoading("save-group")}
              variant="success"
            >
              Guardar
            </ActionButton>

            <ActionButton
              onClick={() => {
                resetForm();
                setEditMode(false);
              }}
            >
              Cancelar
            </ActionButton>
          </div>
        </section>
      )}

      {/* Matches */}
      <section>
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-xl font-semibold">Matches</h1>

          <Link
            href={
              group.activo
                ? `/admin/groups/${group.id}/matches/new`
                : "#"
            }
            onClick={(e) => {
              if (!group.activo) e.preventDefault();
            }}
            className={`px-4 py-2 rounded transition ${
              group.activo
                ? "bg-black text-white hover:bg-gray-800"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Crear match
          </Link>
        </div>

        {matches.length === 0 ? (
          <p className="text-gray-500">
            Todavía no hay matches en este group.
          </p>
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
                  <p className="text-sm">
                    <span className="text-gray-600">Inicio: </span>
                    {m.horaInicio
                      ? formatDateTime(m.horaInicio)
                      : "Sin definir"}
                  </p>
                </div>

                <Link
                  href={`/groups/${groupId}/matches/${m.id}`}
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
