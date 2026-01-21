"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export default function NewGroupPage() {
  const router = useRouter();
  const { firebaseUser, userDoc, loading } = useAuth();

  const [nombre, setName] = useState("");
  const [descripcion, setDescription] = useState("");
  const [activo, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <p>Cargando...</p>;

  if (!firebaseUser || userDoc?.roles !== "admin") {
    router.replace("/");
    return null;
  }

  const submit = async () => {
    setError(null);

    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    setSaving(true);

    try {
      const docRef = await addDoc(collection(db, "groups"), {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        activo,
        adminId: firebaseUser.uid,
        createdAt: serverTimestamp(),
        partidosTotales: 0,
      });

      router.replace(`/admin/groups/${docRef.id}`);
    } catch (err) {
      console.error(err);
      setError("Error al crear el group");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-bold">Nuevo Group</h1>

      <div>
        <label className="block font-semibold mb-1">Nombre</label>
        <input
          value={nombre}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full rounded"
          placeholder="Ej: Vóley Martes Noche"
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 w-full rounded"
          placeholder="Grupo recreativo, nivel intermedio..."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActive(e.target.checked)}
        />
        <label>Group activo</label>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={saving}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {saving ? "Creando..." : "Crear group"}
      </button>
    </main>
  );
}
