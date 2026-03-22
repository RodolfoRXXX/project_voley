"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TournamentAdminPanel from "@/components/tournaments/TournamentAdminPanel";
import { TournamentDetailsCard, TournamentEditForm, type TournamentFormValues } from "@/components/tournaments/admin/TournamentEditForm";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";
import { Tournament, tournamentStatusLabel } from "@/types/tournaments";
import { getKnockoutBracketSize } from "@/lib/tournaments/knockout";
import { getMixedConfigurationMessage, getMixedQualificationSummary } from "@/lib/tournaments/mixed";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import StatusPill, { type StatusVariant } from "@/components/ui/status/StatusPill";
import TournamentRegistrationStatusModal from "@/components/tournamentRegistrationStatusModal/TournamentRegistrationStatusModal";
import { TournamentRegistrationItem } from "@/components/tournamentRegistrationStatusModal/TournamentRegistrationStatusModal.types";
import { useConfirm } from "@/components/confirmModal/ConfirmProvider";

import { addTournamentAdmin, editTournament } from "@/services/tournaments/tournamentMutations";
import { getAdminTournamentRegistrationsView, getTournamentById } from "@/services/tournaments/tournamentQueries";

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

export default function AdminTournamentDetailPage() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = params?.tournamentId;

  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUserId, setAdminUserId] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<TournamentRegistrationItem | null>(null);

  const [editForm, setEditForm] = useState<TournamentFormValues>({
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
        qualifyPerGroup: 2,
        wildcardsCount: 0,
        seedingCriteria: "points",
        crossGroupSeeding: true,
        bracketMatchup: "1A_vs_2B",
      },
      knockoutStage: {
        enabled: false,
        startFrom: "semi",
        allowByes: false,
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
    const nextTournament = await getTournamentById(tournamentId);
    setTournament(nextTournament);

    setLoading(false);
  }, [tournamentId]);

  const loadRegistrations = useCallback(async () => {
    if (!tournamentId) return;

    setLoadingRegistrations(true);

    const { registrations: registrationData, acceptedTeams: acceptedTeamsData } = await getAdminTournamentRegistrationsView(tournamentId);

    setRegistrations(registrationData);
    setAcceptedTeams(acceptedTeamsData as TournamentRegistrationItem[]);
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
          qualifyPerGroup: tournament.structure?.groupStage?.qualifyPerGroup || 1,
          wildcardsCount: tournament.structure?.groupStage?.wildcardsCount || 0,
          seedingCriteria: tournament.structure?.groupStage?.seedingCriteria || "points",
          crossGroupSeeding: tournament.structure?.groupStage?.crossGroupSeeding !== false,
          bracketMatchup: tournament.structure?.groupStage?.bracketMatchup || "1A_vs_2B",
        },
        knockoutStage: {
          enabled: tournament.structure?.knockoutStage?.enabled ?? tournament.format !== "liga",
          startFrom: tournament.structure?.knockoutStage?.startFrom || "semi",
          allowByes: false,
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

    const requiredKnockoutTeams = getKnockoutBracketSize(editForm.structure.knockoutStage.startFrom);
    const mixedSummary = getMixedQualificationSummary({
      groupCount: editForm.structure.groupStage.groupCount,
      rounds: editForm.structure.groupStage.rounds,
      qualifyPerGroup: editForm.structure.groupStage.qualifyPerGroup,
      wildcardsCount: editForm.structure.groupStage.wildcardsCount,
      startFrom: editForm.structure.knockoutStage.startFrom,
      seedingCriteria: editForm.structure.groupStage.seedingCriteria,
      crossGroupSeeding: editForm.structure.groupStage.crossGroupSeeding,
      bracketMatchup: editForm.structure.groupStage.bracketMatchup,
    });
    if (editForm.format === "mixto" && !mixedSummary.configurationValid) {
      showToast({
        type: "error",
        message: getMixedConfigurationMessage(mixedSummary),
      });

      return;
    }

    if (editForm.format === "eliminacion" && (editForm.minTeams !== requiredKnockoutTeams || editForm.maxTeams !== requiredKnockoutTeams)) {
      showToast({
        type: "error",
        message: `En eliminación directa sin byes el cuadro de ${editForm.structure.knockoutStage.startFrom} exige exactamente ${requiredKnockoutTeams} equipos.`,
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
              qualifyPerGroup: editForm.structure.groupStage.qualifyPerGroup,
              wildcardsCount: editForm.structure.groupStage.wildcardsCount,
              seedingCriteria: editForm.structure.groupStage.seedingCriteria,
              crossGroupSeeding: editForm.structure.groupStage.crossGroupSeeding,
              bracketMatchup: editForm.structure.groupStage.bracketMatchup,
            },
            knockoutStage: {
              enabled: editForm.structure.knockoutStage.enabled,
              startFrom: editForm.structure.knockoutStage.startFrom,
              allowByes: false,
            },
          },
        }
      : editForm;

    setSaving(true);

    try {
      await editTournament({
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

  const onAddAdmin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tournamentId || !adminUserId.trim()) return;

    setAddingAdmin(true);
    try {
      await addTournamentAdmin({
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

          </div>
        </div>
      </header>


      {editing && (
        <TournamentEditForm
          values={editForm}
          isActiveTournament={isActiveTournament}
          saving={saving}
          onChange={setEditForm}
          onCancel={() => setEditing(false)}
          onSubmit={onSaveEdit}
        />
      )}

      <TournamentDetailsCard
        tournament={tournament}
        editing={editing}
        canEdit={canEdit}
        isLockedTournament={isLockedTournament}
        onEdit={startEdit}
      />

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

      <TournamentAdminPanel tournament={tournament} onTournamentRefresh={loadTournament} />

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
