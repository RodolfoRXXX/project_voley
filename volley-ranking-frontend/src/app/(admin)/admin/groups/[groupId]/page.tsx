"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import Link from "next/link";

const functions = getFunctions(app);
const editGroup = httpsCallable(functions, "editGroup");
const toggleGroupActivo = httpsCallable(functions, "toggleGroupActivo");

export default function AdminGroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { firebaseUser, userDoc, loading } = useAuth();

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
     Load group + matches
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

      // Matches del group
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

      setFormData({
        nombre: data.nombre,
        descripcion: data.descripcion || "",
      });
      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [groupId, router]);

  const handleSave = async () => {
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
  };

  if (loading || loadingData) return <p>Cargando...</p>;
  if (!group) return null;

  return (
    <main className="max-w-3xl mx-auto mt-10 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{group.nombre}</h1>
          {group.descripcion && (
            <p className="text-gray-600 mt-1">
              {group.descripcion}
            </p>
          )}
        </div>

        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="border px-3 py-1 rounded"
          >
            Editar
          </button>
        )}
      </div>

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

          <button
            onClick={async () => {
              await toggleGroupActivo({
                groupId: group.id,
                activo: !group.activo,
              });

              setGroup({
                ...group,
                activo: !group.activo,
              });
            }}
            className="border px-3 py-1 rounded"
          >
            {group.activo ? "Desactivar" : "Reactivar"}
          </button>
        </div>
      </section>

      {/* Edit form */}
      {editMode && (
        <section className="border rounded p-4 space-y-4">
          <label className="block">
            Nombre
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  nombre: e.target.value,
                })
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
            <button
              onClick={handleSave}
              className="bg-black text-white px-4 py-2 rounded"
            >
              Guardar
            </button>

            <button
              onClick={() => setEditMode(false)}
              className="border px-4 py-2 rounded"
            >
              Cancelar
            </button>
          </div>
        </section>
      )}
      {/* Matches */}
      <section>
        {/* Header Matches*/}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold mb-4">Matches</h1>
        </div>
        <Link
          href={
            group.activo
              ? `/admin/groups/${group.id}/matches/new`
              : "#"
          }
          onClick={(e) => {
            if (!group.activo) e.preventDefault();
          }}
          className={`px-4 py-2 rounded transition
            ${
              group.activo
                ? "bg-black text-white hover:bg-gray-800"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          Crear match
        </Link>
      </div>

        {matches.length === 0 ? (
          <p className="text-gray-500">Todavía no hay matches en este group.</p>
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
                  <p className="text-sm text-gray-600">
                    Inicio:{" "}
                    {m.horaInicio
                      ? m.horaInicio.toLocaleString("es-AR")
                      : "Sin fecha"}
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
