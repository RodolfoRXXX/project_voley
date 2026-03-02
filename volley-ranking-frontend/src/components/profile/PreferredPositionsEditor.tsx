"use client";

import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import useToast from "@/components/ui/toast/useToast";
import StatusPill from "../ui/status/StatusPill";

type Role = "player" | "admin";

type Props = {
  initial: string[];
  initialRole: Role;
};

export default function PreferredPositionsEditor({
  initial,
  initialRole,
}: Props) {
  const [savedPositions, setSavedPositions] = useState<string[]>(initial);
  const [positions, setPositions] = useState<string[]>(initial);
  const [savedRole, setSavedRole] = useState<Role>(initialRole);
  const [role, setRole] = useState<Role>(initialRole);
  const [allPositions, setAllPositions] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const { showToast } = useToast();

  const functions = getFunctions(app);

  const updatePositionsFn = httpsCallable<
    { posiciones: string[] },
    { ok: true }
  >(functions, "updatePreferredPositions");

  const updateRoleFn = httpsCallable<
    { role: Role },
    { ok: true }
  >(functions, "updateUserRole");


  useEffect(() => {
    setPositions(initial);
    setSavedPositions(initial);
  }, [initial]);

  useEffect(() => {
    setRole(initialRole);
    setSavedRole(initialRole);
  }, [initialRole]);

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
    const changedRole = role !== savedRole;

    if (!changedPositions && !changedRole) {
      setEditing(false);
      return;
    }

    setSaving(true);

    try {
      if (changedPositions) {
        await updatePositionsFn({ posiciones: positions });
        setSavedPositions(positions);
      }

      if (changedRole) {
        await updateRoleFn({ role });
        setSavedRole(role);
      }

      setEditing(false);
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
    <section className="bg-white rounded-lg border border-neutral-200 p-4 space-y-4 dark:bg-[var(--surface)] dark:border-[var(--border)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-[var(--foreground)]">
            Posiciones preferidas
          </h3>

          {editing && (
            <p className="text-xs text-neutral-500 mt-0.5 dark:text-[var(--text-muted)]">
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

      <div className="border-t border-neutral-200 pt-4 space-y-2 dark:border-[var(--border)]">
        <h4 className="text-sm font-semibold text-neutral-800 dark:text-[var(--foreground)]">
          Rol del perfil
        </h4>
        <p className="text-xs text-neutral-500 dark:text-[var(--text-muted)]">
          Esta configuración es independiente de tus posiciones preferidas.
        </p>

        {editing ? (
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label="Player"
              variant={role === "player" ? "success" : "neutral"}
              onClick={() => setRole("player")}
            />
            <StatusPill
              label="Admin"
              variant={role === "admin" ? "warning" : "neutral"}
              onClick={() => setRole("admin")}
            />
          </div>
        ) : (
          <StatusPill
            label={role === "admin" ? "Admin" : "Player"}
            variant={role === "admin" ? "warning" : "success"}
          />
        )}
      </div>

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
              setRole(savedRole);
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
