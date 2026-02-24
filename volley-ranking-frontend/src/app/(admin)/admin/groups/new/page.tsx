
/* =====================
  Create Group
  ===================== */

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
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";

export default function NewGroupPage() {
  const router = useRouter();
  const { firebaseUser, userDoc, loading } = useAuth();
  const { showToast } = useToast();
  const { run, isLoading } = useAction();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [joinApproval, setJoinApproval] = useState(true);

  /* =====================
     Auth guard
  ===================== */
  if (loading)
    return (
      <div className="flex items-center justify-center h-40 text-sm text-neutral-500">
        Verificando permisos…
      </div>
    );

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
        const ownerId = firebaseUser.uid;
        const docRef = await addDoc(collection(db, "groups"), {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          activo,
          adminId: ownerId,
          admins: [{ userId: ownerId, role: "owner", order: 0 }],
          ownerId,
          adminIds: [ownerId],
          visibility,
          joinApproval,
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
    <main className="max-w-xl mx-auto mt-6 sm:mt-10 pb-12 space-y-8">

      <AdminBreadcrumb
        items={[
          { label: "Gestión"},
          { label: "Grupos", href: "/admin/groups" },
          { label: "Nuevo grupo" },
        ]}
      />

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
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="border rounded px-3 py-2 w-full text-sm"
          rows={3}
        />
      </FormField>

      {/* ACTIVO */}
      <FormField label="Grupo activo">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          <span className="text-gray-600">
            El grupo podrá crear partidos
          </span>
        </label>
      </FormField>

      <FormField label="Visibilidad">
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "public" | "private")}
          className="border rounded px-3 py-2 w-full text-sm"
        >
          <option value="private">Privado</option>
          <option value="public">Público</option>
        </select>
      </FormField>

      <FormField label="Aprobación de ingreso">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={joinApproval}
            onChange={(e) => setJoinApproval(e.target.checked)}
          />
          <span className="text-gray-600">
            Requerir aprobación del admin para ingresar al grupo
          </span>
        </label>
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
