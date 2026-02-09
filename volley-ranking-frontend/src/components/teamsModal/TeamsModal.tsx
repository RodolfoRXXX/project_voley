

"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db, app } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { TeamsDoc, TeamsModalProps } from "./TeamsModal.types";
import TeamColumn from "./TeamColumn";
import { ActionButton } from "@/components/ui/action/ActionButton";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";

const functions = getFunctions(app);
const generarEquiposFn = httpsCallable(functions, "generarEquipos");

export default function TeamsModal({
  open,
  onClose,
  matchId,
  usersMap,
  participations,
  isAdmin,
  matchEstado,
}: TeamsModalProps) {
  const { showToast } = useToast();
  const [teams, setTeams] = useState<TeamsDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const generarBloqueado = matchEstado === "jugado";

  /* =====================
     Realtime teams
  ===================== */
  useEffect(() => {
    if (!open) return;

    const q = query(
      collection(db, "teams"),
      where("matchId", "==", matchId)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setTeams(null);
        return;
      }

     const data = snap.docs[0].data();

      setTeams(data as TeamsDoc);
    });

    return () => unsub();
  }, [open, matchId]);

  /* =====================
     Generar / Regenerar
  ===================== */
  const handleGenerarEquipos = async () => {
    try {
      setLoading(true);
      await generarEquiposFn({ matchId });
      showToast({
        type: "success",
        message: "Equipos generados correctamente",
      });
    } catch (err) {
      handleFirebaseError(
        err,
        showToast,
        "No se pudieron generar los equipos"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl p-6 space-y-6 shadow-xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-neutral-900">
              Equipos formados
            </h2>
            <p className="text-xs text-neutral-500">
              Distribución automática de jugadores
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-700 transition"
          >
            Cerrar
          </button>
        </div>

        {/* Equipos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {teams?.equipos?.length ? (
            teams.equipos.map((e) => (
              <TeamColumn
                key={e.nombre}
                nombre={e.nombre}
                jugadores={e.jugadores}
                usersMap={usersMap}
                participations={participations}
              />
            ))
          ) : (
            <p className="col-span-full text-center text-sm text-neutral-500 py-10">
              Todavía no hay equipos generados.
            </p>
          )}
        </div>

        {/* Acciones */}
        {isAdmin && (
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
            <ActionButton
              onClick={handleGenerarEquipos}
              loading={loading}
              disabled={generarBloqueado}
              variant="success"
            >
              {generarBloqueado
                ? "Partido jugado"
                : teams
                ? "Regenerar equipos"
                : "Generar equipos"}
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
}
