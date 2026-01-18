"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const POSICIONES = [
  "central",
  "armador",
  "opuesto",
  "punta",
  "libero"
];

export default function OnboardingForm() {
  const router = useRouter();

  const [rol, setRol] = useState<"player" | "admin">("player");
  const [posiciones, setPosiciones] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePosicion = (pos: string) => {
    setPosiciones((prev) =>
      prev.includes(pos)
        ? prev.filter((p) => p !== pos)
        : prev.length < 3
          ? [...prev, pos]
          : prev
    );
  };

  const submit = async () => {
    setError(null);

    if (posiciones.length !== 3) {
      setError("Elegí exactamente 3 posiciones");
      return;
    }

    setLoading(true);

    try {
      const completeOnboarding = httpsCallable(
        functions,
        "completeOnboarding"
      );

      await completeOnboarding({
        rol,
        posicionesPreferidas: posiciones,
      });

      router.replace("/");
    } catch (err) {
      console.error(err);
      setError("Error al completar onboarding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rol */}
      <div>
        <label className="block font-semibold mb-2">Rol</label>
        <select
          value={rol}
          onChange={(e) => setRol(e.target.value as any)}
          className="border p-2 rounded w-full"
        >
          <option value="player">Jugador</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      {/* Posiciones */}
      <div>
        <label className="block font-semibold mb-2">
          Posiciones preferidas (3)
        </label>

        <div className="grid grid-cols-2 gap-2">
          {POSICIONES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePosicion(p)}
              className={`border p-2 rounded ${
                posiciones.includes(p)
                  ? "bg-blue-500 text-white"
                  : "bg-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {loading ? "Guardando..." : "Completar"}
      </button>
    </div>
  );
}
