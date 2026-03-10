


"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { ActionButton } from "@/components/ui/action/ActionButton";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import StatusPill, { type StatusVariant } from "@/components/ui/status/StatusPill";
import { RegisterTournamentModalProps } from "./RegisterTournamentModal.types";

type GroupOption = {
  id: string;
  nombre: string;
  memberCount: number;
};

type RegistrationOption = {
  id: string;
  groupId?: string;
  nameTeam?: string;
  status?: string;
};

function getRegistrationStatus(status: string): {
  label: string;
  variant: StatusVariant;
} {
  switch (status) {
    case "pendiente":
      return { label: "Pendiente", variant: "warning" };

    case "aceptado":
      return { label: "Aceptado", variant: "success" };

    case "rechazado":
      return { label: "Rechazado", variant: "danger" };

    default:
      return { label: status, variant: "info" };
  }
}

const requestTournamentRegistrationFn = httpsCallable(
  functions,
  "requestTournamentRegistration"
);

export default function RegisterTournamentModal({
  open,
  onClose,
  tournamentId,
}: RegisterTournamentModalProps) {

  const { firebaseUser } = useAuth();
  const { showToast } = useToast();

  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [registrations, setRegistrations] = useState<RegistrationOption[]>([]);
  const [teamName, setTeamName] = useState("");
  const [minPlayers, setMinPlayers] = useState(1);

  useEffect(() => {
    if (!open || !firebaseUser || !tournamentId) return;

    const loadRegistrations = async () => {
      const registrationsRef = collection(db, "tournamentRegistrations");

      const q = query(
        registrationsRef,
        where("tournamentId", "==", tournamentId)
      );

      const snap = await getDocs(q);

      const rows = snap.docs.map((doc) => {
        const data = doc.data() as Omit<RegistrationOption, "id">;

        return {
          id: doc.id,
          ...data,
        };
      });

      setRegistrations(rows);
    };

    loadRegistrations();

  }, [open, firebaseUser, tournamentId]);


  useEffect(() => {
    if (!open || !tournamentId) return;

    const loadTournament = async () => {
      const tournamentSnap = await getDoc(doc(db, "tournaments", tournamentId));

      if (tournamentSnap.exists()) {
        const data = tournamentSnap.data() as { minPlayers?: number };
        setMinPlayers(Number(data.minPlayers || 1));
      }
    };

    loadTournament();
  }, [open, tournamentId]);

  const usedGroupIds = new Set(
    registrations.map((r) => r.groupId)
  );

  useEffect(() => {
    if (!open || !firebaseUser) return;

    const loadGroups = async () => {
      try {
        const groupsRef = collection(db, "groups");

        const q = query(
          groupsRef,
          where("adminIds", "array-contains", firebaseUser.uid)
        );

        const snap = await getDocs(q);

        const rows = snap.docs.map((doc) => {
          const groupData = doc.data() as { nombre?: string; memberIds?: string[] };

          return {
            id: doc.id,
            nombre: groupData.nombre || "Grupo sin nombre",
            memberCount: Array.isArray(groupData.memberIds) ? groupData.memberIds.length : 0,
          };
        });

        setGroups(rows);

        if (rows.length) {
          setSelectedGroupId(rows[0].id);
        }

      } finally {
        setLoadingGroups(false);
      }
    };

    loadGroups();

  }, [open, firebaseUser]);

  useEffect(() => {
    if (!open) {
      setTeamName("");
      setSelectedGroupId("");
      setMinPlayers(1);
    }
  }, [open]);

  if (!open || !tournamentId) return null;

  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const selectedGroupMemberCount = selectedGroup?.memberCount || 0;
  const hasMinPlayersForSelectedGroup = selectedGroupMemberCount >= minPlayers;

  const handleRegister = async () => {

        if (!selectedGroupId || !teamName.trim() || !hasMinPlayersForSelectedGroup) return;

        try {

            setLoading(true);

            await requestTournamentRegistrationFn({
            tournamentId,
            groupId: selectedGroupId,
            nameTeam: teamName.trim(),
            });

            showToast({
            type: "success",
            message: "Solicitud de inscripción enviada",
            });

            onClose();

        } catch (err) {

            handleFirebaseError(
            err,
            showToast,
            "No se pudo solicitar inscripción"
            );

        } finally {

            setLoading(false);

        }
    };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">

        <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-xl">

        {/* HEADER */}

        <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
            <h2 className="text-lg font-semibold text-neutral-900">
                Inscribirse al torneo
            </h2>

            <p className="text-xs text-neutral-500">
                Elegí uno de tus grupos y definí el nombre del equipo.
            </p>
            </div>

            <button
            onClick={onClose}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-700 transition"
            >
            Cerrar
            </button>
        </div>

        {/* INSCRIPCIONES EXISTENTES */}

        {registrations.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">

            <p className="text-sm font-medium text-neutral-700">
                Tus inscripciones
            </p>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {registrations.map((reg) => {
                const group = groups.find((g) => g.id === reg.groupId);

                return (
                    <div
                    key={reg.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    >
                    <div className="flex flex-col">
                        <span className="font-medium text-neutral-900">
                        {reg.nameTeam}
                        </span>

                        <span className="text-neutral-500 text-xs">
                        {group?.nombre || "Grupo"}
                        </span>
                    </div>

                    {(() => {
                      const status = getRegistrationStatus(reg.status || "pendiente");

                      return (
                        <StatusPill
                          label={status.label}
                          variant={status.variant}
                        />
                      );
                    })()}
                    </div>
                );
                })}
            </div>

            </div>
        )}

        {/* NUEVA INSCRIPCIÓN */}

        <div className="space-y-4">

            <p className="text-sm font-medium text-neutral-700">
            Nueva inscripción
            </p>

            <p className="text-xs text-neutral-500">
              Este torneo requiere al menos <b>{minPlayers}</b> jugadores por equipo para inscribirse.
            </p>

            {loadingGroups ? (

            <p className="text-sm text-neutral-500">
                Cargando grupos...
            </p>

            ) : groups.length === 0 ? (

            <p className="text-sm text-neutral-500">
                No administrás ningún grupo.
            </p>

            ) : (

            <div className="space-y-3">

                {/* SELECT GRUPO */}

                <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">
                    Grupo
                </label>

                <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                >
                    {groups.map((group) => {
                      const isUsed = usedGroupIds.has(group.id);
                      const hasMinPlayers = group.memberCount >= minPlayers;

                      return (
                        <option
                          key={group.id}
                          value={group.id}
                          disabled={isUsed || !hasMinPlayers}
                        >
                          {group.nombre} ({group.memberCount} integrantes) {isUsed ? "(ya inscripto)" : ""} {!hasMinPlayers ? `(mínimo ${minPlayers})` : ""}
                        </option>
                      );
                    })}
                </select>
                {!hasMinPlayersForSelectedGroup && selectedGroupId && (
                  <p className="text-xs text-red-600">
                    Este grupo no cumple con el mínimo de {minPlayers} jugadores para inscribirse.
                  </p>
                )}
                </div>

                {/* TEAM NAME */}

                <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">
                    Nombre del equipo
                </label>

                <input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Ej: Los Tigres"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
                </div>

            </div>

            )}

        </div>

        {/* ACTIONS */}

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">

            <ActionButton
            onClick={onClose}
            variant="secondary"
            compact
            >
            Cancelar
            </ActionButton>

            <ActionButton
            onClick={handleRegister}
            loading={loading}
            disabled={!selectedGroupId || !teamName.trim() || loadingGroups || !hasMinPlayersForSelectedGroup}
            variant="success"
            compact
            >
            Inscribirme
            </ActionButton>

        </div>

        </div>

    </div>
  );
}