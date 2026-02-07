"use client";

import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import PositionBadge from "./positionBadge";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import useToast from "@/components/ui/toast/useToast";

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

  const available = allPositions.filter(
    (p) => !positions.includes(p)
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= positions.length) return;
    const copy = [...positions];
    [copy[from], copy[to]] = [copy[to], copy[from]];
    setPositions(copy);
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
    <section
      className="
        bg-neutral-50
        rounded-lg
        p-4
        space-y-4
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Posiciones preferidas
        </h3>

        {!editing && (
          <ActionButton
            onClick={() => setEditing(true)}
          >
            Editar
          </ActionButton>
        )}
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-2">
        {positions.map((p, i) => (
          <PositionBadge
            key={`${p}-${i}`}
            label={p}
            index={i + 1}
            editable={editing}
            disabled={saving}
            onRemove={
              editing && positions.length > 1
                ? () =>
                    setPositions(
                      positions.filter((_, idx) => idx !== i)
                    )
                : undefined
            }
            onMoveUp={editing ? () => move(i, i - 1) : undefined}
            onMoveDown={editing ? () => move(i, i + 1) : undefined}
          />
        ))}

        {editing && positions.length < 3 && (
          <PositionBadge
            isPlaceholder
            options={available}
            disabled={saving}
            onSelect={(value) => {
              if (!value) return;
              setPositions([...positions, value]);
            }}
          />
        )}
      </div>

      {/* Acciones */}
      {editing && (
        <div className="flex gap-2 pt-2">
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
