"use client";

import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import useToast from "@/components/ui/toast/useToast";
import InformationPill from "../ui/status/InformationPill";

type Props = {
  initial: string[];
  onClose: () => void;
};

export default function PreferredPositionsEditor({
  initial,
  onClose,
}: Props) {
  const [savedPositions, setSavedPositions] = useState<string[]>(initial);
  const [positions, setPositions] = useState<string[]>(initial);
  const [allPositions, setAllPositions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const { showToast } = useToast();

  const functions = getFunctions(app);

  const updatePositionsFn = httpsCallable<
    { posiciones: string[] },
    { ok: true }
  >(functions, "updatePreferredPositions");

  useEffect(() => {
    setPositions(initial);
    setSavedPositions(initial);
  }, [initial]);

  useEffect(() => {
    const load = async () => {
      try {
        const getPosicionesFn = httpsCallable<
          void,
          { posiciones: string[] }
        >(functions, "getValidPositions");
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
  }, [functions, showToast]);

  const samePositions = (a: string[], b: string[]) =>
    a.length === b.length && a.every((value, i) => value === b[i]);

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

    const changedPositions = !samePositions(positions, savedPositions);
    if (!changedPositions) {
      onClose();
      return;
    }

    setSaving(true);

    try {
      if (changedPositions) {
        await updatePositionsFn({ posiciones: positions });
        setSavedPositions(positions);
      }

      onClose();
    } catch (err) {
      handleFirebaseError(
        err,
        showToast,
        "No se pudieron guardar los cambios de perfil"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingCatalog) {
    return (
      <div className="text-sm text-gray-500 dark:text-[var(--text-muted)]">
        Cargando posiciones…
      </div>
    );
  }

  return (
    <section className="bg-white rounded-md border border-neutral-200 p-4 space-y-4 dark:bg-[var(--surface)] dark:border-[var(--border)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-[var(--foreground)]">
            Posiciones preferidas
          </h3>

          <p className="text-xs text-neutral-500 mt-0.5 dark:text-[var(--text-muted)]">
            Elegí hasta 3 y ordená por prioridad
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {allPositions.map((p) => {
          const selected = isSelected(p);
          const index = indexOf(p);
          const disabled = !selected && positions.length >= 3;

          return (
            <InformationPill
              key={p}
              label={
                selected ? `${index + 1}. ${p}` : p
              }
              variant={selected ? "info" : "neutral"}
              size="md"
              onClick={
                disabled ? undefined : () => togglePosition(p)
              }
            />
          );
        })}
      </div>

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
            onClose();
          }}
          disabled={saving}
        >
          Cancelar
        </ActionButton>
      </div>
    </section>
  );
}
