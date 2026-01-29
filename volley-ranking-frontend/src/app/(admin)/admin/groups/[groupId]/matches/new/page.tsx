
// -------------------
// CREA UN NUEVO MATCH
// -------------------

"use client";

import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import useToast from "@/components/ui/toast/useToast";
import { Spinner } from "@/components/ui/toast/spinner/spinner";

export default function NewMatchPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();

  const [formaciones, setFormaciones] = useState<string[]>([]);
  const [formacion, setFormacion] = useState("");
  const [cantidadEquipos, setCantidadEquipos] = useState(2);
  const [cantidadSuplentes, setCantidadSuplentes] = useState(5);
  const [horaInicio, setHoraInicio] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

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

  const fieldClass = (valid: boolean) =>
  `border p-2 w-full rounded ${
    valid ? "border-green-500" : "border-red-500"
  }`;

  /* =====================
     Load formaciones
  ===================== */
  useEffect(() => {
    const load = async () => {
      const fn = httpsCallable(functions, "getFormaciones");
      const res: any = await fn();

      // 👇 convertimos objeto → array
      setFormaciones(Object.keys(res.data.formaciones));
    };

    load();
  }, []);

  const submit = async () => {
    if (!isFormValid) return;

    setLoading(true);

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
      setLoading(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-bold">Nuevo match</h1>

      {/* Formación */}

      <select
        value={formacion}
        onChange={(e) => setFormacion(e.target.value)}
        className={fieldClass(isFormacionValid)}
      >
        <option value="">Seleccionar formación</option>
        {formaciones.map((f) => (
          <option key={f} value={f}>
            {f.replace("_", " ")}
          </option>
        ))}
      </select>

      {/* Cantidad equipos */}

      <input
        type="number"
        value={cantidadEquipos}
        onChange={(e) => setCantidadEquipos(+e.target.value)}
        className={fieldClass(isEquiposValid)}
        placeholder="Cantidad de equipos"
      />

      {/* Cantidad suplentes */}

      <input
        type="number"
        value={cantidadSuplentes}
        onChange={(e) => setCantidadSuplentes(+e.target.value)}
        className={fieldClass(isSuplentesValid)}
        placeholder="Cantidad de suplentes"
      />

      {/* Fecha y hora inicio */}

      <input
        type="datetime-local"
        value={horaInicio}
        onChange={(e) => setHoraInicio(e.target.value)}
        className={fieldClass(isHoraValid)}
      />

      {/* Botón submit */}

      <button
        onClick={submit}
        disabled={!isFormValid || loading}
        className={`
          px-4 py-2 rounded flex items-center justify-center gap-2
          ${
            !isFormValid || loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-black text-white hover:bg-gray-800"
          }
        `}
      >
        {loading ? (
          <>
            <Spinner />
            Creando...
          </>
        ) : (
          "Crear match"
        )}
      </button>

    </main>
  );
}
