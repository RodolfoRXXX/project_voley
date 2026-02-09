
"use client";

import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import useToast from "@/components/ui/toast/useToast";
import StatusPill from "../ui/status/StatusPill";

type Props = {
  initial: string[];
};

export default function PreferredPositionsEditor({ initial }: Props) {
  const [savedPositions, setSavedPositions] = useState<string[]>(initial);
  const [positions, setPositions] = useState<string[]>(initial);
  const [allPositions, setAllPositions] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const { showToast } = useToast();

  const functions = getFunctions(app);

  const updateFn = httpsCallable<
    { posiciones: string[] },
    { ok: true }
  >(functions, "updatePreferredPositions");

  const getPosicionesFn = httpsCallable<
    void,
    { posiciones: string[] }
  >(functions, "getValidPositions");

  useEffect(() => {
    setPositions(initial);
    setSavedPositions(initial);
  }, [initial]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getPosicionesFn();
        setAllPositions(res.data.posiciones);
      } catch (err) {
        handleFirebaseError(
          err,
          showToast,
          "No se pudieron cargar las posiciones válidas"
        );
      } finally {
        setLoadingCatalog(false);
      }
    };

    load();
  }, [showToast]);

  const isSelected = (p: string) => positions.includes(p);
  const indexOf = (p: string) => positions.indexOf(p);

  const togglePosition = (p: string) => {
    if (isSelected(p)) {
      setPositions(positions.filter((x) => x !== p));
      return;
    }

    if (positions.length < 3) {
      setPositions([...positions, p]);
    }
  };

  const save = async () => {
    if (positions.length < 1) return;
    setSaving(true);
    await updateFn({ posiciones: positions });
    setSavedPositions(positions);
    setEditing(false);
    setSaving(false);
  };

  if (loadingCatalog) {
    return (
      <div className="text-sm text-gray-500">
        Cargando posiciones…
      </div>
    );
  }

  return (
    <section className="bg-white rounded-lg border border-neutral-200 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800">
            Posiciones preferidas
          </h3>

          {editing && (
            <p className="text-xs text-neutral-500 mt-0.5">
              Elegí hasta 3 y ordená por prioridad
            </p>
          )}
        </div>

        {!editing && (
          <ActionButton compact onClick={() => setEditing(true)}>
            Editar
          </ActionButton>
        )}
      </div>

      {/* Pills */}
      <div className="flex flex-wrap gap-2">
        {!editing &&
          positions.map((p, i) => (
            <StatusPill
              key={p}
              label={`${i + 1}. ${p}`}
              variant="info"
            />
          ))}

        {editing &&
          allPositions.map((p) => {
            const selected = isSelected(p);
            const index = indexOf(p);
            const disabled = !selected && positions.length >= 3;

            return (
              <StatusPill
                key={p}
                label={
                  selected ? `${index + 1}. ${p}` : p
                }
                variant={selected ? "info" : "neutral"}
                onClick={
                  disabled ? undefined : () => togglePosition(p)
                }
              />
            );
          })}
      </div>

      {/* Acciones */}
      {editing && (
        <div className="flex gap-2 pt-3">
          <ActionButton
            variant="success"
            onClick={save}
            loading={saving}
            disabled={positions.length < 1}
          >
            Guardar cambios
          </ActionButton>

          <ActionButton
            variant="secondary"
            compact
            onClick={() => {
              setPositions(savedPositions);
              setEditing(false);
            }}
            disabled={saving}
          >
            Cancelar
          </ActionButton>
        </div>
      )}
    </section>
  );
}
