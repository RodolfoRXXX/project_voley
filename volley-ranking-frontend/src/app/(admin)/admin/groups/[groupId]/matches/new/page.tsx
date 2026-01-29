
// -------------------
// CREA UN NUEVO MATCH
// -------------------

"use client";

import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import useToast from "@/components/ui/toast/useToast";

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
    /* =====================
      Validaciones
    ===================== */
    if (!formacion) {
      showToast({
        type: "warning",
        message: "Seleccioná una formación",
      });
      return;
    }

    if (!cantidadEquipos || cantidadEquipos <= 0) {
      showToast({
        type: "warning",
        message: "Cantidad de equipos inválida",
      });
      return;
    }

    if (cantidadSuplentes < 0) {
      showToast({
        type: "warning",
        message: "Cantidad de suplentes inválida",
      });
      return;
    }

    if (!horaInicio) {
      showToast({
        type: "warning",
        message: "Seleccioná fecha y hora del partido",
      });
      return;
    }

    const date = new Date(horaInicio);

    if (isNaN(date.getTime())) {
      showToast({
        type: "error",
        message: "Fecha/hora inválida",
      });
      return;
    }

    const horaInicioMillis = date.getTime(); // ✅ ahora es seguro

    /* =====================
      Submit
    ===================== */
    setLoading(true);

    try {
      const fn = httpsCallable(functions, "createMatch");

      await fn({
        groupId,
        formacion,
        cantidadEquipos,
        cantidadSuplentes,
        horaInicioMillis,
      });

      showToast({
        type: "success",
        message: "Match creado correctamente",
      });

      router.replace(`/admin/groups/${groupId}`);
    } catch (e: any) {
      console.error(e);

      showToast({
        type: "error",
        message: e?.message || "Error al crear el match",
      });

      if (e?.code === "not-found") {
        router.push("/matches");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-bold">Nuevo match</h1>

      <select
        value={formacion}
        onChange={(e) => setFormacion(e.target.value)}
        className="border p-2 w-full"
      >
        <option value="">Seleccionar formación</option>
        {formaciones.map((f) => (
          <option key={f} value={f}>
            {f.replace("_", " ")}
          </option>
        ))}
      </select>

      <input
        type="number"
        value={cantidadEquipos}
        onChange={(e) => setCantidadEquipos(+e.target.value)}
        className="border p-2 w-full"
        placeholder="Cantidad de equipos"
      />

      <input
        type="number"
        value={cantidadSuplentes}
        onChange={(e) => setCantidadSuplentes(+e.target.value)}
        className="border p-2 w-full"
        placeholder="Cantidad de suplentes"
      />

      <input
        type="datetime-local"
        value={horaInicio}
        onChange={(e) => setHoraInicio(e.target.value)}
        className="border p-2 w-full"
      />

      <button
        onClick={submit}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Crear match
      </button>
    </main>
  );
}
