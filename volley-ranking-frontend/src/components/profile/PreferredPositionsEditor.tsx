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

  /* =====================
     Sync initial (cuando cambia userDoc)
  ===================== */
  useEffect(() => {
    setPositions(initial);
    setSavedPositions(initial);
  }, [initial]);

  /* =====================
     Load posiciones válidas
  ===================== */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getPosicionesFn();
        setAllPositions(res.data.posiciones);
      } catch (err) {
        console.error("Error cargando posiciones válidas", err);

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

    setSavedPositions(positions); // 👈 CLAVE
    setEditing(false);
    setSaving(false);
  };

  if (loadingCatalog) {
    return (
      <section className="border rounded p-4">
        <p className="text-sm text-gray-500">
          Cargando posiciones…
        </p>
      </section>
    );
  }

  return (
    <section className="border rounded p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Posiciones preferidas</h3>

        {!editing && (
          <ActionButton
            onClick={() => setEditing(true)}
          >
            Editar
          </ActionButton>
        )}
      </div>

      <div className="flex flex-col gap-2 items-start">
        {positions.map((p, i) => (
          <PositionBadge
            key={`${p}-${i}`}
            label={p}
            index={i + 1}
            editable={editing}
            disabled={saving}
            onRemove={editing ? () => {
              if (positions.length <= 1) return;
              setPositions(
                positions.filter((_, idx) => idx !== i)
              );
            } : undefined}
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

      {editing && (
        <div className="flex gap-2 pt-2">
          <ActionButton
            onClick={save}
            loading={saving}
            disabled={positions.length < 1}
            variant="success"
          >
            Guardar
          </ActionButton>

          <ActionButton
            onClick={() => {
              setPositions(savedPositions); // 👈 descarta cambios
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
