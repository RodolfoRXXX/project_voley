"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import useToast from "@/components/ui/toast/useToast";
import FormField from "@/components/ui/form/FormField";
import { inputClass } from "@/components/ui/form/utils";
import SubmitButton from "@/components/ui/form/SubmitButton";

export default function NewGroupPage() {
  const router = useRouter();
  const { firebaseUser, userDoc, loading } = useAuth();
  const { showToast } = useToast();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [saving, setSaving] = useState(false);

  /* =====================
     Auth guard
  ===================== */
  if (loading) return <p>Cargando...</p>;

  if (!firebaseUser || userDoc?.roles !== "admin") {
    router.replace("/");
    return null;
  }

  /* =====================
     Validations
  ===================== */
  const isNombreValid = nombre.trim().length > 0;
  const isFormValid = isNombreValid && !saving;

  /* =====================
     Submit
  ===================== */
  const submit = async () => {
    if (!isFormValid) {
      showToast({
        type: "warning",
        message: "El nombre del grupo es obligatorio",
      });
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

      showToast({
        type: "success",
        message: "Grupo creado correctamente",
      });

      router.replace(`/admin/groups/${docRef.id}`);
    } catch (err) {
      console.error(err);

      showToast({
        type: "error",
        message: "Error al crear el grupo",
      });
    } finally {
      setSaving(false);
    }
  };

  /* =====================
     Render
  ===================== */
  return (
    <main className="max-w-xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-bold">Nuevo grupo</h1>

      {/* NOMBRE */}
      <div>
        <FormField
          label="Nombre"
          required
          error={!isNombreValid ? "El nombre es obligatorio" : undefined}
        >
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputClass(isNombreValid)}
            placeholder="Voley Martes 21hs"
          />
        </FormField>
      </div>

      {/* DESCRIPCIÓN */}
      <div>
        <FormField
          label="Descripción"
        >
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="border p-2 w-full rounded"
            placeholder="Grupo recreativo, nivel intermedio..."
          />
        </FormField>
      </div>

      {/* ACTIVO */}
      <div className="flex items-center gap-2">
        <FormField label="Grupo activo">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
        </FormField>
      </div>

      {/* BOTÓN */}
      <SubmitButton
        loading={saving}
        disabled={!isFormValid}
        onClick={submit}
      >
        Crear group
      </SubmitButton>
    </main>
  );
}
