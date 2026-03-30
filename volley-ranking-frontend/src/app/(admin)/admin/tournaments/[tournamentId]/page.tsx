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
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { TournamentPodiumCard } from "@/components/tournaments/TournamentPodiumCard";
import { TournamentAdminsCard } from "@/components/tournaments/TournamentAdminsCard";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";

import { addTournamentAdmin, editTournament, removeTournamentAdmin } from "@/services/tournaments/tournamentMutations";
import { getAdminTournamentRegistrationsView, getTournamentById, getTournamentTeams, getUsersByIds, searchAdminsByName } from "@/services/tournaments/tournamentQueries";

function AdminTournamentDetailSkeleton() {
  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <Skeleton className="h-5 w-56" />
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </section>
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </section>
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </section>
      <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 space-y-3">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </section>
    </main>
  );
}

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

  const { firebaseUser } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminQuery, setAdminQuery] = useState("");
  const [adminSearchResults, setAdminSearchResults] = useState<Array<{ id: string; name: string; photoURL: string | null; email: string | null }>>([]);
  const [showAdminSearchModal, setShowAdminSearchModal] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<Array<{ id: string; name: string; photoURL: string | null }>>([]);
  const [winnerTeamNames, setWinnerTeamNames] = useState<string[]>([]);
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
    startDate: "",
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
  const canEdit = tournamentStatus === "draft" || tournamentStatus === "inscripciones_abiertas" || tournamentStatus === "inscripciones_cerradas";
  const isLockedTournament = tournamentStatus === "finalizado" || tournamentStatus === "cancelado";
  const isOwnerAdmin = Boolean(firebaseUser?.uid && tournament?.ownerAdminId === firebaseUser.uid);
  const editMode: "draft" | "open" | "closed" | "locked" = tournamentStatus === "draft"
    ? "draft"
    : tournamentStatus === "inscripciones_abiertas"
      ? "open"
      : tournamentStatus === "inscripciones_cerradas"
        ? "closed"
        : "locked";

  const loadTournament = useCallback(async () => {
    if (!tournamentId) return;
    const nextTournament = await getTournamentById(tournamentId);
    setTournament(nextTournament);
    if (nextTournament) {
      const [users, teams] = await Promise.all([
        getUsersByIds(nextTournament.adminIds || []),
        getTournamentTeams(nextTournament.id),
      ]);
      const teamNameById = new Map(
        teams.map((team) => [team.id, team.nameTeam || team.name || team.id])
      );
      const podiumIds = Array.isArray(nextTournament.podiumTeamIds) ? nextTournament.podiumTeamIds.filter(Boolean) : [];
      setWinnerTeamNames(podiumIds.map((teamId) => teamNameById.get(teamId) || teamId));
      setAdminUsers(
        users.map((user) => ({
          id: user.id,
          name: user.nombre || "Administrador",
          photoURL: user.photoURL || null,
        }))
      );
    } else {
      setWinnerTeamNames([]);
      setAdminUsers([]);
    }

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
      startDate: tournament.startDate?.seconds ? new Date(tournament.startDate.seconds * 1000).toISOString().slice(0, 16) : "",
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

    const payload = {
      ...editForm,
      ...(editForm.startDate ? { startDateMillis: new Date(editForm.startDate).getTime() } : {}),
    };

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

  const onAddAdmin = async (adminUserId: string) => {
    if (!tournamentId || !adminUserId.trim()) return;

    setAddingAdmin(true);
    try {
      await addTournamentAdmin({
        tournamentId,
        adminUserId: adminUserId.trim(),
      });
      showToast({ type: "success", message: "Admin agregado al torneo" });
      setAdminQuery("");
      setAdminSearchResults([]);
      setShowAdminSearchModal(false);
      await loadTournament();
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudo agregar admin");
    } finally {
      setAddingAdmin(false);
    }
  };

  const onRemoveAdmin = async (adminUserId: string) => {
    if (!tournamentId || !isOwnerAdmin) return;
    const confirmed = await confirm({
      title: "Quitar administrador",
      message: "¿Querés quitar este admin del torneo?",
      confirmText: "Quitar admin",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!confirmed) return;

    setRemovingAdminId(adminUserId);
    try {
      await removeTournamentAdmin({ tournamentId, adminUserId });
      showToast({ type: "success", message: "Admin eliminado del torneo" });
      await loadTournament();
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudo eliminar admin");
    } finally {
      setRemovingAdminId(null);
    }
  };

  const pendingRegistrations = registrations.filter((r) => r.status === "pendiente");
  const acceptedRegistrations = acceptedTeams.filter((team) => team.status !== "rechazado");
  const rejectedRegistrations = [
    ...registrations.filter((r) => r.status === "rechazado"),
    ...acceptedTeams.filter((team) => team.status === "rechazado"),
  ];
  const isRegistrationReady = (item: TournamentRegistrationItem) => {
    const teamMembersCount = Array.isArray(item.playerIds)
      ? item.playerIds.length
      : Number(item.teamMembersCount ?? 0);
    const minPlayers = tournament?.minPlayers;
    const maxPlayers = tournament?.maxPlayers;
    const meetsMinPlayers = typeof minPlayers === "number" ? teamMembersCount >= minPlayers : true;
    const meetsMaxPlayers = typeof maxPlayers === "number" ? teamMembersCount <= maxPlayers : true;
    return item.paymentStatus === "pagado" && meetsMinPlayers && meetsMaxPlayers;
  };

  if (loading) {
    return <AdminTournamentDetailSkeleton />;
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

      {tournament.status === "finalizado" ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide font-semibold text-emerald-700">Estado definitivo</p>
          <p className="text-sm text-emerald-900">
            El torneo ya finalizó. Este panel muestra resultados cerrados, podio y trazabilidad histórica.
          </p>
        </section>
      ) : null}

      <TournamentPodiumCard winnerTeamNames={winnerTeamNames} status={tournament.status} />


      {editing && (
        <TournamentEditForm
          values={editForm}
          editMode={editMode}
          allowAdvancedConfig
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
              <span>
                Equipo: {r.nameTeam || "Sin nombre"} {isRegistrationReady(r) ? "✅" : "🕒"}
              </span>

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

      <TournamentAdminsCard
        admins={adminUsers}
        isAdminView
        isOwnerAdmin={isOwnerAdmin}
        canManageAdmins={isOwnerAdmin}
        isTournamentFinalized={tournament.status === "finalizado"}
        ownerAdminId={tournament.ownerAdminId}
        removingAdminId={removingAdminId}
        onAddAdminClick={() => setShowAdminSearchModal(true)}
        onRemoveAdmin={onRemoveAdmin}
      />

      {showAdminSearchModal ? (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Agregar admin</h3>
                <p className="text-xs text-neutral-500">Buscá por nombre y agregá admins al torneo.</p>
              </div>
              <button onClick={() => setShowAdminSearchModal(false)} className="text-sm text-neutral-500 hover:text-neutral-700">
                Cerrar
              </button>
            </div>
            <input
              value={adminQuery}
              onChange={async (event) => {
                const value = event.target.value;
                setAdminQuery(value);
                if (value.trim().length < 2) {
                  setAdminSearchResults([]);
                  return;
                }
                const nextResults = await searchAdminsByName({
                  queryText: value,
                  excludedIds: tournament.adminIds,
                });
                setAdminSearchResults(nextResults);
              }}
              placeholder="Ej: Juan, Ana, Pedro..."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            {adminQuery.trim().length < 2 ? (
              <p className="text-sm text-neutral-500">Escribí al menos 2 letras para buscar.</p>
            ) : adminSearchResults.length === 0 ? (
              <p className="text-sm text-neutral-500">No se encontraron admins disponibles.</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto space-y-2">
                {adminSearchResults.map((admin) => (
                  <li key={admin.id} className="rounded-lg border border-neutral-200 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar nombre={admin.name} photoURL={admin.photoURL} size={36} />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{admin.name}</p>
                        <p className="text-xs text-neutral-500">{admin.email || admin.id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onAddAdmin(admin.id)}
                      disabled={addingAdmin}
                      className="text-xs rounded-lg border border-neutral-300 px-2 py-1 hover:bg-neutral-50 disabled:opacity-60"
                    >
                      {addingAdmin ? "Agregando..." : "Agregar"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <TournamentRegistrationStatusModal
        open={selectedRegistration !== null}
        registration={selectedRegistration}
        tournamentMinPlayers={tournament?.minPlayers}
        tournamentMaxPlayers={tournament?.maxPlayers}
        isTournamentFinalized={tournament.status === "finalizado"}
        onClose={() => setSelectedRegistration(null)}
        onUpdated={async () => {
          await Promise.all([loadRegistrations(), loadTournament()]);
        }}
      />
    </main>
  );
}
