

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
}: TeamsModalProps) {
  const { showToast } = useToast();
  const [teams, setTeams] = useState<TeamsDoc | null>(null);
  const [loading, setLoading] = useState(false);

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
      console.log("📦 teams doc:", data);

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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-3xl p-6 space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Equipos
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:underline text-sm"
          >
            Cerrar
          </button>
        </div>

        {/* Equipos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
            <p className="text-gray-500 col-span-full text-center">
              Todavía no hay equipos generados.
            </p>
          )}
        </div>

        {/* Acciones */}
        {isAdmin && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <ActionButton
              onClick={handleGenerarEquipos}
              loading={loading}
              variant="success"
            >
              {teams ? "Regenerar equipos" : "Generar equipos"}
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
}
