
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
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";

function OnboardingFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonSoft className="h-10 w-full rounded-lg" />
          <SkeletonSoft className="h-10 w-full rounded-lg" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-44" />
        <SkeletonSoft className="h-4 w-56" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonSoft
              key={idx}
              className="h-9 w-full rounded-lg"
            />
          ))}
        </div>

        <SkeletonSoft className="h-4 w-40" />
      </div>

      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

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
    return <OnboardingFormSkeleton />;
  }

  const isSelected = (p: string) => posiciones.includes(p);

  const indexOf = (p: string) =>
    posiciones.findIndex((x) => x === p);

  return (
    <div className="space-y-6">
      {/* Rol */}
      <div>
        <label className="block font-semibold mb-2">
          ¿Qué rol vas a tener?
        </label>

        <div className="grid grid-cols-2 gap-3">
          <ActionButton
            onClick={() => setRol("player")}
            variant={roles === "player" ? "primary" : "secondary"}
            disabled={loading}
          >
            ⚽ Jugador
          </ActionButton>

          <ActionButton
            onClick={() => setRol("admin")}
            variant={roles === "admin" ? "primary" : "secondary"}
            disabled={loading}
          >
            🧑‍💼 Administrador
          </ActionButton>
        </div>
      </div>

      {/* Posiciones */}
      <div>
        <label className="block font-semibold mb-1">
          Posiciones preferidas
        </label>
        <p className="text-xs text-neutral-500 mb-3">
          Elegí hasta 3 posiciones en orden
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allPositions.map((p) => {
            const selected = isSelected(p);
            const index = indexOf(p);

            return (
              <ActionButton
                key={p}
                onClick={() => togglePosicion(p)}
                disabled={
                  loading || (!selected && posiciones.length >= 3)
                }
                variant={selected ? "primary" : "secondary"}
                compact
              >
                {selected ? (
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-bold opacity-80">
                      {index + 1}.
                    </span>
                    <span>{p}</span>
                  </span>
                ) : (
                  p
                )}
              </ActionButton>
            );
          })}
        </div>

        <div className="mt-2 min-h-[16px]">
          {posiciones.length === 3 && (
            <p className="text-xs text-neutral-500">
              Máximo de posiciones alcanzado
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* Submit */}
      <ActionButton
        onClick={submit}
        loading={loading}
        disabled={posiciones.length === 0}
        variant="success"
        className="w-full mt-2"
      >
        Finalizar perfil
      </ActionButton>
    </div>
  );
}
