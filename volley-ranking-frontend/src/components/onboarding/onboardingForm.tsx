"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ui/action/ActionButton";

const POSICIONES = [
  "central",
  "armador",
  "opuesto",
  "punta",
  "libero",
];

export default function OnboardingForm() {
  const router = useRouter();

  const [roles, setRol] = useState<"player" | "admin">("player");
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

    if (posiciones.length === 0) {
      setError("Elegí al menos 1 posición");
      return;
    }

    setLoading(true);

    try {
      const completeOnboarding = httpsCallable(
        functions,
        "completeOnboarding"
      );

      await completeOnboarding({
        roles,
        posicionesPreferidas: posiciones,
      });

      router.replace("/");
    } catch (err: any) {
      console.error("❌ completeOnboarding error:", err);

      setError(
        err?.message ||
          err?.details ||
          "Error al completar onboarding"
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = posiciones.length > 0 && !loading;

  return (
    <div className="space-y-6">
      {/* Rol */}
      <div>
        <label className="block font-semibold mb-2">Rol</label>
        <select
          value={roles}
          onChange={(e) => setRol(e.target.value as any)}
          className="border p-2 rounded w-full"
          disabled={loading}
        >
          <option value="player">Jugador</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      {/* Posiciones */}
      <div>
        <label className="block font-semibold mb-2">
          Posiciones preferidas (máx. 3)
        </label>

        <div className="grid grid-cols-2 gap-2">
          {POSICIONES.map((p) => {
            const selected = posiciones.includes(p);

            return (
              <ActionButton
                key={p}
                onClick={() => togglePosicion(p)}
                disabled={
                  loading ||
                  (!selected && posiciones.length >= 3)
                }
                variant={selected ? "primary" : "secondary"}
              >
                {p}
              </ActionButton>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Submit */}
      <ActionButton
        onClick={submit}
        loading={loading}
        disabled={!isFormValid}
        variant="success"
      >
        Completar
      </ActionButton>
    </div>
  );
}
