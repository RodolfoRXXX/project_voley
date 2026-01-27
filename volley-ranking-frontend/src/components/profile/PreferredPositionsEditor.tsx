"use client";

import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import PositionBadge from "./positionBadge";

type Props = {
  initial: string[];
};

export default function PreferredPositionsEditor({ initial }: Props) {
  const [positions, setPositions] = useState<string[]>(initial);
  const [allPositions, setAllPositions] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

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
      } finally {
        setLoadingCatalog(false);
      }
    };

    load();
  }, []);

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
    if (positions.length < 1 || saving) return;

    try {
      setSaving(true);
      await updateFn({ posiciones: positions });
      setEditing(false);
    } catch (err) {
      console.error("Error al guardar posiciones", err);
      alert("No se pudieron guardar las posiciones");
    } finally {
      setSaving(false);
    }
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
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Editar
          </button>
        )}
      </div>

      <div className="space-y-2">
        {positions.map((p, i) => (
          <PositionBadge
            key={`${p}-${i}`}
            label={p}
            index={i + 1}
            editable={editing}
            onRemove={() => {
              if (positions.length <= 1) return;
              setPositions(
                positions.filter((_, idx) => idx !== i)
              );
            }}
            onMoveUp={() => move(i, i - 1)}
            onMoveDown={() => move(i, i + 1)}
          />
        ))}

        {editing && positions.length < 3 && available.length > 0 && (
          <PositionBadge
            isPlaceholder
            onAdd={() => setPositions([...positions, available[0]])} editable={false}          />
        )}
      </div>

      {editing && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="bg-black text-white px-4 py-1 rounded disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>

          <button
            onClick={() => {
              setPositions(initial);
              setEditing(false);
            }}
            className="border px-4 py-1 rounded"
          >
            Cancelar
          </button>
        </div>
      )}
    </section>
  );
}
