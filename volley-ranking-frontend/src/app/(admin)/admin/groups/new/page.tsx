"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import useToast from "@/components/ui/toast/useToast";
import { useAction } from "@/components/ui/action/useAction";
import { ActionButton } from "@/components/ui/action/ActionButton";
import FormField from "@/components/ui/form/FormField";
import { inputClass } from "@/components/ui/form/utils";

export default function NewGroupPage() {
  const router = useRouter();
  const { firebaseUser, userDoc, loading } = useAuth();
  const { showToast } = useToast();
  const { run, isLoading } = useAction();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);

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
  const isFormValid = isNombreValid;

  /* =====================
     Submit (useAction)
  ===================== */
  const submit = () => {
    if (!isFormValid) {
      showToast({
        type: "warning",
        message: "El nombre del grupo es obligatorio",
      });
      return;
    }

    return run(
      "create-group",
      async () => {
        const docRef = await addDoc(collection(db, "groups"), {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          activo,
          adminId: firebaseUser.uid,
          createdAt: serverTimestamp(),
          partidosTotales: 0,
        });

        router.replace(`/admin/groups/${docRef.id}`);
      },
      {
        successMessage: "Grupo creado correctamente",
        errorMessage: "Error al crear el grupo",
      }
    );
  };

  /* =====================
     Render
  ===================== */
  return (
    <main className="max-w-xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-bold">Nuevo grupo</h1>

      {/* NOMBRE */}
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

      {/* DESCRIPCIÓN */}
      <FormField label="Descripción">
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="border p-2 w-full rounded"
          placeholder="Grupo recreativo, nivel intermedio..."
        />
      </FormField>

      {/* ACTIVO */}
      <FormField label="Grupo activo">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
        />
      </FormField>

      {/* BOTÓN UNIFICADO */}
      <ActionButton
        onClick={submit}
        loading={isLoading("create-group")}
        disabled={!isFormValid}
        variant="success"
      >
        Crear grupo
      </ActionButton>
    </main>
  );
}
