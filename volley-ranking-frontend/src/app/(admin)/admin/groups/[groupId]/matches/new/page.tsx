
// -------------------
// CREA UN NUEVO MATCH
// -------------------

"use client";

import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import useToast from "@/components/ui/toast/useToast";
import FormField from "@/components/ui/form/FormField";
import { inputClass } from "@/components/ui/form/utils";
import { useAction } from "@/components/ui/action/useAction";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";
import Link from "next/link";

export default function NewMatchPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [formaciones, setFormaciones] = useState<string[]>([]);
  const [formacion, setFormacion] = useState("");
  const [cantidadEquipos, setCantidadEquipos] = useState(2);
  const [cantidadSuplentes, setCantidadSuplentes] = useState(5);
  const [horaInicio, setHoraInicio] = useState("");
  const { run, isLoading } = useAction();

  /* =====================
     VALIDACIONES
  ===================== */
  const isFormacionValid = formacion !== "";
  const isEquiposValid = cantidadEquipos > 0;
  const isSuplentesValid = cantidadSuplentes >= 0;
  const isHoraValid =
    horaInicio !== "" && !isNaN(new Date(horaInicio).getTime());

  const isFormValid =
    isFormacionValid &&
    isEquiposValid &&
    isSuplentesValid &&
    isHoraValid;

  /* =====================
     LOAD FORMACIONES
  ===================== */
  useEffect(() => {
    const load = async () => {
      try {
        const fn = httpsCallable(functions, "getFormaciones");
        const res: any = await fn();
        setFormaciones(Object.keys(res.data.formaciones));
      } catch (err: any) {
          console.error("❌ Error carga formaciones:", err);
    
          handleFirebaseError(
            err,
            showToast,
            "No se pudieron cargar las formaciones"
          );
        }
    };

    load();
  }, [showToast]);


  /* =====================
     SUBMIT
  ===================== */
  const submit = () =>
  run(
    "create-match",
    async () => {
      const fn = httpsCallable(functions, "createMatch");

      await fn({
        groupId,
        formacion,
        cantidadEquipos,
        cantidadSuplentes,
        horaInicioMillis: new Date(horaInicio).getTime(),
      });

      router.replace(`/admin/groups/${groupId}`);
    },
    {
      successMessage: "Match creado correctamente",
      errorMessage: "Error al crear el Juego",
    }
  );


  /* =====================
     RENDER
  ===================== */
  return (
    <main className="max-w-xl mx-auto mt-10 space-y-8">

      <AdminBreadcrumb
        items={[
          { label: "Gestión" },
          { label: "Grupos", href: "/admin/groups" },
          { label: "Nuevo juego" },
        ]}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-900">
            Nuevo match
          </h1>
          <p className="text-sm text-neutral-500">
            Configuración inicial del partido
          </p>
        </div>

        <Link
          href={`/admin/groups/${groupId}`}
          className="text-sm text-neutral-600 hover:text-neutral-900 transition"
        >
          ← Volver al grupo
        </Link>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
        
        {/* Formación */}
        <FormField
          label="Formación"
          required
          error={!isFormacionValid ? "Seleccioná una formación" : undefined}
        >
          <select
            value={formacion}
            onChange={(e) => setFormacion(e.target.value)}
            className={`${inputClass(isFormacionValid)} text-sm`}
          >
            <option value="">Seleccionar</option>
            {formaciones.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </FormField>

        {/* Cantidad equipos */}
        <FormField
          label="Cantidad de equipos"
          required
          error={!isEquiposValid ? "Debe ser mayor a 0" : undefined}
        >
          <input
            type="number"
            min={1}
            value={cantidadEquipos}
            onChange={(e) => setCantidadEquipos(+e.target.value)}
            className={`${inputClass(isEquiposValid)} text-sm`}
          />
        </FormField>

        {/* Cantidad suplentes */}
        <FormField
          label="Cantidad de suplentes"
          error={!isSuplentesValid ? "Debe ser mayor o igual a 0" : undefined}
        >
          <input
            type="number"
            min={0}
            value={cantidadSuplentes}
            onChange={(e) => setCantidadSuplentes(+e.target.value)}
            className={inputClass(isSuplentesValid)}
          />
        </FormField>

        {/* Fecha y hora */}
        <FormField
          label="Fecha y hora de inicio"
          required
          error={!isHoraValid ? "Fecha y hora inválidas" : undefined}
        >
          <input
            type="datetime-local"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            className={inputClass(isHoraValid)}
          />
        </FormField>
      </section>

      {/* Submit */}
      <div className="pt-2">
        <ActionButton
          onClick={submit}
          loading={isLoading("create-match")}
          disabled={!isFormValid}
          variant="success"
        >
          Crear juego
        </ActionButton>
      </div>
    </main>
  );
}
