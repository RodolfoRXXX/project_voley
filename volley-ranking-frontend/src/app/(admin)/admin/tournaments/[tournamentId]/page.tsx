"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";
import { Tournament, tournamentStatusLabel } from "@/types/tournament";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import StatusPill, { type StatusVariant } from "@/components/ui/status/StatusPill";
import TournamentRegistrationStatusModal from "@/components/tournamentRegistrationStatusModal/TournamentRegistrationStatusModal";
import { TournamentRegistrationItem } from "@/components/tournamentRegistrationStatusModal/TournamentRegistrationStatusModal.types";
import { useConfirm } from "@/components/confirmModal/ConfirmProvider";

const openRegistrationsFn = httpsCallable(functions, "openTournamentRegistrations");
const addTournamentAdminFn = httpsCallable(functions, "addTournamentAdmin");
const editTournamentFn = httpsCallable(functions, "editTournament");

type TournamentForm = {
  name: string;
  description: string;
  format: "liga" | "eliminacion" | "mixto";
  minTeams: number;
  maxTeams: number;
  minPlayers: number;
  maxPlayers: number;
  paymentForPlayer: number;
  rules: {
    setsToWin: number;
  };
  structure: {
    groupStage: {
      enabled: boolean;
      groupCount: number;
      rounds: number;
    };
    knockoutStage: {
      enabled: boolean;
      startFrom: "octavos" | "cuartos" | "semi" | "final";
    };
  };
};

function statusVariant(status: Tournament["status"]): StatusVariant {
  switch (status) {
    case "draft":
      return "warning";
    case "inscripciones_abiertas":
      return "info";
    case "activo":
      return "success";
    case "finalizado":
      return "neutral";
    default:
      return "neutral";
  }
}

function formatLabel(format: Tournament["format"]) {
  if (format === "mixto") return "Normal";
  if (format === "eliminacion") return "Eliminación";
  return "Liga";
}

function knockoutLabel(startFrom?: "octavos" | "cuartos" | "semi" | "final") {
  if (startFrom === "octavos") return "Octavos";
  if (startFrom === "cuartos") return "Cuartos";
  if (startFrom === "semi") return "Semifinal";
  if (startFrom === "final") return "Final";
  return "-";
}

export default function AdminTournamentDetailPage() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = params?.tournamentId;

  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [adminUserId, setAdminUserId] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<TournamentRegistrationItem | null>(null);

  const [editForm, setEditForm] = useState<TournamentForm>({
    name: "",
    description: "",
    format: "mixto",
    minTeams: 0,
    maxTeams: 0,
    minPlayers: 0,
    maxPlayers: 0,
    paymentForPlayer: 0,
    rules: {
      setsToWin: 3,
    },
    structure: {
      groupStage: {
        enabled: true,
        groupCount: 2,
        rounds: 1,
      },
      knockoutStage: {
        enabled: false,
        startFrom: "semi",
      },
    },
  });

  const [registrations, setRegistrations] = useState<TournamentRegistrationItem[]>([]);
  const [acceptedTeams, setAcceptedTeams] = useState<TournamentRegistrationItem[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const tournamentStatus = tournament?.status as string | undefined;
  const canEdit = tournamentStatus === "draft" || tournamentStatus === "inscripciones_abiertas" || tournamentStatus === "activo";
  const isActiveTournament = tournamentStatus === "activo";
  const isLockedTournament = tournamentStatus === "finalizado" || tournamentStatus === "cancelado";

  const loadTournament = useCallback(async () => {
    if (!tournamentId) return;
    const ref = doc(db, "tournaments", tournamentId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setTournament({ id: snap.id, ...(snap.data() as Omit<Tournament, "id">) });
    } else {
      setTournament(null);
    }

    setLoading(false);
  }, [tournamentId]);

  const loadRegistrations = useCallback(async () => {
    if (!tournamentId) return;

    setLoadingRegistrations(true);

    const registrationsQuery = query(
      collection(db, "tournamentRegistrations"),
      where("tournamentId", "==", tournamentId)
    );

    const teamsQuery = query(
      collection(db, "tournamentTeams"),
      where("tournamentId", "==", tournamentId)
    );

    const [registrationsSnap, teamsSnap] = await Promise.all([
      getDocs(registrationsQuery),
      getDocs(teamsQuery),
    ]);

    const registrationData = registrationsSnap.docs.map((currentDoc) => ({
      id: currentDoc.id,
      source: "registration" as const,
      ...(currentDoc.data() as Omit<TournamentRegistrationItem, "id" | "source">),
    }));

    const acceptedTeamsData = teamsSnap.docs.map((currentDoc) => {
      const teamData = currentDoc.data() as Omit<TournamentRegistrationItem, "id" | "source">;
      return {
        id: currentDoc.id,
        source: "team" as const,
        status: (teamData.status as "aceptado" | "rechazado") || "aceptado",
        registrationId: teamData.registrationId || currentDoc.id,
        nameTeam: teamData.nameTeam || teamData.name,
        ...teamData,
      };
    });

    setRegistrations(registrationData);
    setAcceptedTeams(acceptedTeamsData);
    setLoadingRegistrations(false);
  }, [tournamentId]);

  useEffect(() => {
    loadTournament();
    loadRegistrations();
  }, [loadTournament, loadRegistrations]);

  const startEdit = () => {
    if (!tournament || !canEdit || isLockedTournament) return;

    setEditForm({
      name: tournament.name,
      description: tournament.description,
      format: tournament.format,
      minTeams: tournament.minTeams,
      maxTeams: tournament.maxTeams,
      minPlayers: tournament.minPlayers || 1,
      maxPlayers: tournament.maxPlayers || 1,
      paymentForPlayer: tournament.paymentForPlayer || 0,
      rules: {
        setsToWin: tournament.rules?.setsToWin || 3,
      },
      structure: {
        groupStage: {
          enabled: tournament.structure?.groupStage?.enabled ?? tournament.format !== "eliminacion",
          groupCount: tournament.structure?.groupStage?.groupCount || 1,
          rounds: tournament.structure?.groupStage?.rounds || 1,
        },
        knockoutStage: {
          enabled: tournament.structure?.knockoutStage?.enabled ?? tournament.format !== "liga",
          startFrom: tournament.structure?.knockoutStage?.startFrom || "semi",
        },
      },
    });

    setEditing(true);
  };

  const onSaveEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!tournamentId || !tournament) return;

    if (editForm.minPlayers > editForm.maxPlayers) {
      showToast({
        type: "error",
        message: "El mínimo de jugadores no puede ser mayor al máximo",
      });

      return;
    }

    const confirmed = await confirm({
      title: "Confirmar cambios del torneo",
      message: "¿Querés guardar los cambios realizados en este torneo?",
      confirmText: "Guardar cambios",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) return;

    const payload = isActiveTournament
      ? {
          minTeams: editForm.minTeams,
          maxTeams: editForm.maxTeams,
          maxPlayers: editForm.maxPlayers,
          paymentForPlayer: editForm.paymentForPlayer,
          rules: {
            setsToWin: editForm.rules.setsToWin,
          },
          structure: {
            groupStage: {
              enabled: true,
              groupCount: editForm.structure.groupStage.groupCount,
              rounds: editForm.structure.groupStage.rounds,
            },
            knockoutStage: {
              enabled: editForm.structure.knockoutStage.enabled,
              startFrom: editForm.structure.knockoutStage.startFrom,
            },
          },
        }
      : editForm;

    setSaving(true);

    try {
      await editTournamentFn({
        tournamentId,
        ...payload,
      });

      showToast({
        type: "success",
        message: "Torneo actualizado",
      });

      setEditing(false);
      await loadTournament();
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudo actualizar el torneo");
    } finally {
      setSaving(false);
    }
  };

  const openRegistrations = async () => {
    if (!tournamentId) return;
    setOpening(true);
    try {
      await openRegistrationsFn({ tournamentId });
      showToast({ type: "success", message: "Inscripciones abiertas" });
      await loadTournament();
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudieron abrir inscripciones");
    } finally {
      setOpening(false);
    }
  };

  const onAddAdmin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tournamentId || !adminUserId.trim()) return;

    setAddingAdmin(true);
    try {
      await addTournamentAdminFn({
        tournamentId,
        adminUserId: adminUserId.trim(),
      });
      showToast({ type: "success", message: "Admin agregado al torneo" });
      setAdminUserId("");
      await loadTournament();
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudo agregar admin");
    } finally {
      setAddingAdmin(false);
    }
  };

  const pendingRegistrations = registrations.filter((r) => r.status === "pendiente");
  const acceptedRegistrations = acceptedTeams.filter((team) => team.status !== "rechazado");
  const rejectedRegistrations = [
    ...registrations.filter((r) => r.status === "rechazado"),
    ...acceptedTeams.filter((team) => team.status === "rechazado"),
  ];

  if (loading) {
    return <p className="text-sm text-neutral-500">Cargando torneo...</p>;
  }

  if (!tournament) {
    return <p className="text-sm text-neutral-500">Torneo no encontrado.</p>;
  }

  const isLeague = tournament.format === "liga";
  const isNormal = tournament.format === "mixto";
  const hasGroups = tournament.structure?.groupStage?.enabled;
  const hasKnockout = tournament.structure?.knockoutStage?.enabled;

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <AdminBreadcrumb
        items={[
          { label: "Mis torneos" },
          { label: "Torneos", href: "/admin/tournaments" },
          { label: tournament.name },
        ]}
      />

      <header className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <div className="flex content-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">
              {tournament.name}
            </h1>
            <p className="text-sm text-neutral-600">{tournament.description || "Sin descripción"}</p>
          </div>

          <div className="flex flex-col items-end justify-between gap-2">
            <StatusPill
              label={tournamentStatusLabel[tournament.status]}
              variant={statusVariant(tournament.status)}
            />

            {tournament.status === "draft" && (
              <button
                onClick={openRegistrations}
                disabled={opening}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300 disabled:opacity-60"
              >
                {opening ? "Abriendo..." : "Abrir inscripciones"}
              </button>
            )}
          </div>
        </div>
      </header>

      {editing && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-base font-semibold">Editar torneo</h2>
          {isActiveTournament && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Torneo activo: solo se permiten cambios en pago por jugador, cupos de equipos, máximo de jugadores, sets para ganar, cantidad de grupos y vueltas.
            </p>
          )}

          <form onSubmit={onSaveEdit} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <input
                value={editForm.name}
                disabled={isActiveTournament}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                value={editForm.description}
                disabled={isActiveTournament}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Formato</label>
                <select
                  value={editForm.format}
                  disabled={isActiveTournament}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, format: e.target.value as TournamentForm["format"] }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="liga">Liga</option>
                  <option value="eliminacion">Eliminación</option>
                  <option value="mixto">Normal</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Min equipos</label>
                <input
                  type="number"
                  value={editForm.minTeams}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      minTeams: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max equipos</label>
                <input
                  type="number"
                  value={editForm.maxTeams}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      maxTeams: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Min jugadores por equipo</label>
                <input
                  type="number"
                  value={editForm.minPlayers}
                  disabled={isActiveTournament}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      minPlayers: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max jugadores por equipo</label>
                <input
                  type="number"
                  value={editForm.maxPlayers}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      maxPlayers: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Pago por jugador</label>
                <input
                  type="number"
                  value={editForm.paymentForPlayer}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      paymentForPlayer: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Sets para ganar</label>
                <input
                  type="number"
                  value={editForm.rules.setsToWin}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      rules: {
                        ...prev.rules,
                        setsToWin: Number(e.target.value),
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Cantidad de grupos</label>
                <input
                  type="number"
                  value={editForm.structure.groupStage.groupCount}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      structure: {
                        ...prev.structure,
                        groupStage: {
                          ...prev.structure.groupStage,
                          enabled: true,
                          groupCount: Number(e.target.value),
                        },
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Vueltas de liga</label>
                <input
                  type="number"
                  value={editForm.structure.groupStage.rounds}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      structure: {
                        ...prev.structure,
                        groupStage: {
                          ...prev.structure.groupStage,
                          rounds: Number(e.target.value),
                        },
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Etapa de eliminación (si aplica)</label>
              <select
                value={editForm.structure.knockoutStage.startFrom}
                disabled={isActiveTournament}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    structure: {
                      ...prev.structure,
                      knockoutStage: {
                        enabled: prev.format !== "liga",
                        startFrom: e.target.value as TournamentForm["structure"]["knockoutStage"]["startFrom"],
                      },
                    },
                  }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="octavos">Octavos</option>
                <option value="cuartos">Cuartos</option>
                <option value="semi">Semifinal</option>
                <option value="final">Final</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm dark:bg-neutral-200 dark:text-neutral-900"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-neutral-900">Información del torneo</h2>
          {!editing && (
            <button
              onClick={startEdit}
              disabled={!canEdit || isLockedTournament}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Editar
            </button>
          )}
        </div>
        <div className="text-sm text-neutral-600 grid sm:grid-cols-2 gap-2">
          <p>Formato: <b>{formatLabel(tournament.format)}</b></p>
          <p>Deporte: <b>{tournament.sport}</b></p>
          <p>Equipos mínimos: <b>{tournament.minTeams}</b></p>
          <p>Equipos máximos: <b>{tournament.maxTeams}</b></p>
          <p>Equipos aceptados: <b>{tournament.acceptedTeamsCount || 0}</b></p>
          <p>Jugadores mínimos por equipo: <b>{tournament.minPlayers || 1}</b></p>
          <p>Jugadores máximos por equipo: <b>{tournament.maxPlayers || 1}</b></p>
          <p>Admins asignados: <b>{tournament.adminIds?.length || 0}</b></p>
          <p>Sets para ganar: <b>{tournament.rules?.setsToWin || "-"}</b></p>
          <p>¿Tiene grupos?: <b>{hasGroups ? "Sí" : "No"}</b></p>
          {hasGroups && (
            <>
              <p>Cantidad de grupos: <b>{tournament.structure?.groupStage?.groupCount || "-"}</b></p>
              <p>Vueltas: <b>{tournament.structure?.groupStage?.rounds || "-"}</b></p>
            </>
          )}
          {isNormal && hasKnockout && (
            <p>Eliminación desde: <b>{knockoutLabel(tournament.structure?.knockoutStage?.startFrom)}</b></p>
          )}
          {isLeague && (
            <p>Tipo de fase: <b>Liga</b></p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-6">
        <h2 className="text-base font-semibold text-neutral-900">
          Equipos inscriptos
        </h2>

        {loadingRegistrations && (
          <p className="text-sm text-neutral-500">Cargando registraciones...</p>
        )}

        {!loadingRegistrations && registrations.length === 0 && (
          <p className="text-sm text-neutral-500">
            Todavía no hay equipos registrados en este torneo.
          </p>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-yellow-700">
            Pendientes ({pendingRegistrations.length})
          </h3>

          {pendingRegistrations.map((r) => (
            <div
              key={r.id}
              className="flex justify-between items-center border rounded-lg px-3 py-2 text-sm"
            >
              <span>Equipo: {r.nameTeam || "Sin nombre"}</span>

              <button
                onClick={() => setSelectedRegistration(r)}
                className="text-xs px-2 py-1 rounded border hover:bg-neutral-50"
              >
                Ver estado
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-green-700">
            Aceptados ({acceptedRegistrations.length})
          </h3>

          {acceptedRegistrations.map((r) => (
            <div
              key={r.id}
              className="flex justify-between items-center border rounded-lg px-3 py-2 text-sm"
            >
              <span>Equipo: {r.nameTeam || "Sin nombre"}</span>

              <button
                onClick={() => setSelectedRegistration(r)}
                className="text-xs px-2 py-1 rounded border hover:bg-neutral-50"
              >
                Ver estado
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-700">
            Rechazados ({rejectedRegistrations.length})
          </h3>

          {rejectedRegistrations.map((r) => (
            <div
              key={r.id}
              className="flex justify-between items-center border rounded-lg px-3 py-2 text-sm"
            >
              <span>Equipo: {r.nameTeam || "Sin nombre"}</span>

              <button
                disabled
                className="text-xs px-2 py-1 rounded border text-neutral-400 cursor-not-allowed"
              >
                Ver estado
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">Agregar admin al torneo</h2>
        <p className="text-sm text-neutral-500">Ingresá el UID del admin a sumar a la gestión de este torneo.</p>

        <form onSubmit={onAddAdmin} className="flex flex-col sm:flex-row gap-2">
          <input
            value={adminUserId}
            onChange={(e) => setAdminUserId(e.target.value)}
            placeholder="UID del admin"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            disabled={addingAdmin}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300 disabled:opacity-60"
          >
            {addingAdmin ? "Agregando..." : "Agregar admin"}
          </button>
        </form>
      </section>

      <TournamentRegistrationStatusModal
        open={selectedRegistration !== null}
        registration={selectedRegistration}
        tournamentMinPlayers={tournament?.minPlayers}
        tournamentMaxPlayers={tournament?.maxPlayers}
        onClose={() => setSelectedRegistration(null)}
        onUpdated={async () => {
          await Promise.all([loadRegistrations(), loadTournament()]);
        }}
      />
    </main>
  );
}
