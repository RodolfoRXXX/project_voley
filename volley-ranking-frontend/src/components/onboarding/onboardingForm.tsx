
// -------------------
// FORMULARIO ONBOARD
// -------------------

"use client";

import { useEffect, useState } from "react";
import { httpsCallable, getFunctions } from "firebase/functions";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import useToast from "@/components/ui/toast/useToast";

export default function OnboardingForm() {
  const router = useRouter();
  const functions = getFunctions(app);

  const [roles, setRol] = useState<"player" | "admin">("player");
  const [posiciones, setPosiciones] = useState<string[]>([]);
  const [allPositions, setAllPositions] = useState<string[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const getPosicionesFn = httpsCallable<
    void,
    { posiciones: string[] }
  >(functions, "getValidPositions");

  /* =====================
     Load posiciones válidas
  ===================== */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getPosicionesFn();
        setAllPositions(res.data.posiciones);
      } catch (err) {
        console.error("Error cargando posiciones", err);

        handleFirebaseError(
          err,
          showToast,
          "No se pudieron cargar las posiciones"
        );
      } finally {
        setLoadingCatalog(false);
      }
    };

    load();
  }, []);

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

      handleFirebaseError(
        err,
        showToast,
        "Error al completar el onboarding"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingCatalog) {
    return (
      <p className="text-sm text-gray-500">
        Cargando posiciones…
      </p>
    );
  }

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
          {allPositions.map((p) => {
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

        {posiciones.length === 3 && (
          <p className="text-xs text-gray-500 mt-1">
            Máximo de posiciones alcanzado
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Submit */}
      <ActionButton
        onClick={submit}
        loading={loading}
        disabled={posiciones.length === 0}
        variant="success"
      >
        Completar
      </ActionButton>
    </div>
  );
}
