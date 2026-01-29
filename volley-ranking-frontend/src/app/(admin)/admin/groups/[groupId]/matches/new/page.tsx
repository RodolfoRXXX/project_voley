
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
import SubmitButton from "@/components/ui/form/SubmitButton";

export default function NewMatchPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [formaciones, setFormaciones] = useState<string[]>([]);
  const [formacion, setFormacion] = useState("");
  const [cantidadEquipos, setCantidadEquipos] = useState(2);
  const [cantidadSuplentes, setCantidadSuplentes] = useState(5);
  const [horaInicio, setHoraInicio] = useState("");
  const [saving, setSaving] = useState(false);

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
      } catch {
        showToast({
          type: "error",
          message: "No se pudieron cargar las formaciones",
        });
      }
    };

    load();
  }, [showToast]);

  /* =====================
     SUBMIT
  ===================== */
  const submit = async () => {
    if (!isFormValid || saving) return;

    setSaving(true);

    try {
      const fn = httpsCallable(functions, "createMatch");

      await fn({
        groupId,
        formacion,
        cantidadEquipos,
        cantidadSuplentes,
        horaInicioMillis: new Date(horaInicio).getTime(),
      });

      showToast({
        type: "success",
        message: "Match creado correctamente",
      });

      router.replace(`/admin/groups/${groupId}`);
    } catch (e: any) {
      showToast({
        type: "error",
        message: e?.message || "Error al crear el match",
      });
    } finally {
      setSaving(false);
    }
  };

  /* =====================
     RENDER
  ===================== */
  return (
    <main className="max-w-xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-bold">Nuevo match</h1>

      {/* Formación */}
      <FormField
        label="Formación"
        required
        error={!isFormacionValid ? "Seleccioná una formación" : undefined}
      >
        <select
          value={formacion}
          onChange={(e) => setFormacion(e.target.value)}
          className={inputClass(isFormacionValid)}
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
          className={inputClass(isEquiposValid)}
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

      {/* Submit */}
      <SubmitButton
        loading={saving}
        disabled={!isFormValid}
        onClick={submit}
      >
        Crear match
      </SubmitButton>
    </main>
  );
}
