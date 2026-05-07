const { db } = require("../firebase");
const {
  resolvePendingAlert,
  upsertPendingAlert,
} = require("./pendingAlertsService");

const ACTIVE_TOURNAMENT_STATUSES = new Set([
  "draft",
  "inscripciones_abiertas",
  "inscripciones_cerradas",
  "activo",
]);
const CLOSED_TOURNAMENT_STATUSES = new Set(["cancelado", "finalizado"]);

function uniqueStringArray(items = []) {
  return Array.from(new Set((Array.isArray(items) ? items : []).map((item) => String(item || "")).filter(Boolean)));
}

function getTournamentName(tournament = {}) {
  return String(tournament.name || tournament.nombre || "Torneo");
}

function getTournamentAdminIds(tournament = {}) {
  return uniqueStringArray([
    ...(Array.isArray(tournament.adminIds) ? tournament.adminIds : []),
    ...(Array.isArray(tournament.createdByAdminIds) ? tournament.createdByAdminIds : []),
    tournament.ownerAdminId,
  ]);
}

function getGroupName(group = {}) {
  return String(group.nombre || group.name || "Grupo");
}

function getGroupAdminIds(group = {}) {
  return uniqueStringArray([
    ...(Array.isArray(group.adminIds) ? group.adminIds : []),
    ...(Array.isArray(group.admins) ? group.admins.map((admin) => admin?.userId) : []),
    group.ownerId,
  ]);
}

function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}

function tournamentAlertId(kind, tournamentId) {
  return `${kind}_${tournamentId}`;
}

function groupAcceptedInTournamentAlertId(tournamentId, groupId) {
  return `group_accepted_in_tournament_${tournamentId}_${groupId}`;
}

function groupTournamentTeamMissingPlayersAlertId(tournamentId, groupId, source = "team") {
  return `group_tournament_${source}_missing_players_${tournamentId}_${groupId}`;
}

function groupTournamentTeamPaymentAlertId(tournamentId, groupId, source = "team") {
  return `group_tournament_${source}_payment_${tournamentId}_${groupId}`;
}

function isTournamentActiveForAcceptedGroups(tournament = {}) {
  return tournament && !CLOSED_TOURNAMENT_STATUSES.has(String(tournament.status || ""));
}

function isResultPendingMatch(match = {}) {
  return !["completed", "cancelled", "cancelado"].includes(String(match.status || ""));
}

function getSelectedPlayersCount(entry = {}) {
  if (Array.isArray(entry.playerIds)) return entry.playerIds.length;
  if (Array.isArray(entry.playersIds)) return entry.playersIds.length;
  return Number(entry.teamMembersCount || 0);
}

function getMinPlayers(tournament = {}) {
  return Number(tournament.settings?.minPlayers || tournament.minPlayers || 0);
}

function getPaymentStatus(entry = {}) {
  return String(entry.paymentStatus || "pendiente");
}

function isPaymentPendingOrPartial(entry = {}) {
  return ["pendiente", "parcial"].includes(getPaymentStatus(entry));
}

function getTournamentTeamDetailPath(tournamentId, groupId, team = {}) {
  return `/profile/tournaments/teams/${team.registrationId || team.id || `${tournamentId}_${groupId}`}`;
}

async function getPendingRegistrationsCount(tournamentId) {
  const registrationsSnap = await db
    .collection("tournamentRegistrations")
    .where("tournamentId", "==", String(tournamentId))
    .where("status", "==", "pendiente")
    .get();

  return registrationsSnap.size;
}

async function hasCurrentPhaseFixture(tournament = {}) {
  const phaseId = typeof tournament.currentPhaseId === "string" ? tournament.currentPhaseId : "";
  if (!phaseId) return false;

  const fixtureSnap = await db
    .collection("tournamentMatches")
    .where("phaseId", "==", phaseId)
    .limit(1)
    .get();

  return !fixtureSnap.empty;
}

async function getPendingTournamentResultsCount(tournamentId) {
  const matchesSnap = await db
    .collection("tournamentMatches")
    .where("tournamentId", "==", String(tournamentId))
    .get();

  return matchesSnap.docs.filter((matchDoc) => isResultPendingMatch(matchDoc.data())).length;
}

function getAcceptedTeamsCount(tournament = {}) {
  return Number(tournament.acceptedTeamsCount || 0);
}

function getMinTeams(tournament = {}) {
  return Number(tournament.settings?.minTeams || tournament.minTeams || 0);
}

function getMaxTeams(tournament = {}) {
  return Number(tournament.settings?.maxTeams || tournament.maxTeams || 0);
}

function canCloseRegistrations(tournament = {}) {
  const acceptedTeamsCount = getAcceptedTeamsCount(tournament);
  const minTeams = getMinTeams(tournament);
  const maxTeams = getMaxTeams(tournament);
  return acceptedTeamsCount >= minTeams && (!maxTeams || acceptedTeamsCount <= maxTeams);
}

async function syncTournamentAdminPendingAlerts(tournamentId, beforeTournament, afterTournament) {
  const beforeAdminIds = beforeTournament ? getTournamentAdminIds(beforeTournament) : [];
  const afterAdminIds = afterTournament ? getTournamentAdminIds(afterTournament) : [];
  const affectedAdminIds = Array.from(new Set([...beforeAdminIds, ...afterAdminIds]));
  const afterAdminIdsSet = new Set(afterAdminIds);
  const tournamentName = getTournamentName(afterTournament || beforeTournament || {});
  const status = String(afterTournament?.status || "");
  const pendingRegistrationsCount = afterTournament ? await getPendingRegistrationsCount(tournamentId) : 0;
  const pendingResultsCount = afterTournament ? await getPendingTournamentResultsCount(tournamentId) : 0;
  const currentPhaseHasFixture = afterTournament ? await hasCurrentPhaseFixture(afterTournament) : false;

  const definitions = [
    {
      kind: "tournament_draft_open_registrations",
      active: status === "draft",
      severity: "warning",
      title: "Torneo en borrador",
      message: `${tournamentName} todavía no abrió inscripciones.`,
      link: { path: `/admin/tournaments/${tournamentId}`, label: "Abrir inscripciones" },
      pendingCount: null,
    },
    {
      kind: "tournament_registrations_pending_review",
      active: status === "inscripciones_abiertas" && pendingRegistrationsCount > 0,
      severity: "warning",
      title: "Inscripciones pendientes de revisión",
      message: `${tournamentName} tiene ${pendingRegistrationsCount} inscripción${pluralize(pendingRegistrationsCount, "", "es")} pendiente${pluralize(pendingRegistrationsCount, "", "s")}.`,
      link: { path: `/admin/tournaments/${tournamentId}`, label: "Revisar inscripciones" },
      pendingCount: pendingRegistrationsCount,
    },
    {
      kind: "tournament_ready_to_close_registrations",
      active: status === "inscripciones_abiertas" && canCloseRegistrations(afterTournament || {}),
      severity: "info",
      title: "Torneo listo para cerrar inscripciones",
      message: `${tournamentName} ya tiene ${getAcceptedTeamsCount(afterTournament || {})} equipo${pluralize(getAcceptedTeamsCount(afterTournament || {}), "", "s")} aceptado${pluralize(getAcceptedTeamsCount(afterTournament || {}), "", "s")}.`,
      link: { path: `/admin/tournaments/${tournamentId}`, label: "Cerrar inscripciones" },
      pendingCount: getAcceptedTeamsCount(afterTournament || {}),
    },
    {
      kind: "tournament_registrations_closed",
      active: false,
      severity: "warning",
      title: "Inscripciones cerradas",
      message: `${tournamentName} ya cerró inscripciones. Confirmá el fixture e iniciá el torneo.`,
      link: { path: `/admin/tournaments/${tournamentId}`, label: "Gestionar fixture" },
      pendingCount: null,
    },
    {
      kind: "tournament_fixture_pending",
      active: status === "inscripciones_cerradas" && !currentPhaseHasFixture,
      severity: "warning",
      title: "Fixture pendiente",
      message: `${tournamentName} ya cerró inscripciones. Confirmá el fixture para poder iniciar el torneo.`,
      link: { path: `/admin/tournaments/${tournamentId}`, label: "Confirmar fixture" },
      pendingCount: null,
      fixtureReady: false,
    },
    {
      kind: "tournament_ready_to_start",
      active: status === "inscripciones_cerradas" && currentPhaseHasFixture,
      severity: "warning",
      title: "Torneo listo para iniciar",
      message: `${tournamentName} ya tiene fixture confirmado. Iniciá el torneo cuando esté todo listo.`,
      link: { path: `/admin/tournaments/${tournamentId}`, label: "Iniciar torneo" },
      pendingCount: null,
      fixtureReady: true,
    },
    {
      kind: "tournament_active_results_pending",
      active: status === "activo" && pendingResultsCount > 0,
      severity: "urgent",
      title: "Resultados pendientes",
      message: `${tournamentName} tiene ${pendingResultsCount} partido${pluralize(pendingResultsCount, "", "s")} con resultado pendiente.`,
      link: { path: `/admin/tournaments/${tournamentId}`, label: "Cargar resultados" },
      pendingCount: pendingResultsCount,
    },
  ];

  await Promise.all(
    affectedAdminIds.flatMap((adminId) =>
      definitions.map((definition) => {
        const alertId = tournamentAlertId(definition.kind, tournamentId);
        if (afterAdminIdsSet.has(adminId) && definition.active) {
          return upsertPendingAlert({
            userId: adminId,
            alertId,
            kind: definition.kind,
            severity: definition.severity,
            title: definition.title,
            message: definition.message,
            link: definition.link,
            resource: { tournamentId },
            meta: {
              tournamentName,
              ...(typeof definition.pendingCount === "number" ? { pendingCount: definition.pendingCount } : {}),
              ...(typeof definition.fixtureReady === "boolean" ? { fixtureReady: definition.fixtureReady } : {}),
            },
          });
        }

        return resolvePendingAlert(adminId, alertId);
      })
    )
  );
}

async function syncAcceptedGroupTournamentAlert({ tournamentId, groupId, team = null, tournament = null, group = null }) {
  if (!tournamentId || !groupId) return;

  const [tournamentSnap, groupSnap] = await Promise.all([
    tournament ? null : db.collection("tournaments").doc(String(tournamentId)).get(),
    group ? null : db.collection("groups").doc(String(groupId)).get(),
  ]);

  const currentTournament = tournament || (tournamentSnap?.exists ? tournamentSnap.data() : null);
  const currentGroup = group || (groupSnap?.exists ? groupSnap.data() : null);
  const groupAdminIds = getGroupAdminIds(currentGroup || {});
  const acceptedAlertId = groupAcceptedInTournamentAlertId(tournamentId, groupId);
  const missingPlayersAlertId = groupTournamentTeamMissingPlayersAlertId(tournamentId, groupId);
  const paymentAlertId = groupTournamentTeamPaymentAlertId(tournamentId, groupId);
  const isActive =
    team?.status === "aceptado" &&
    currentTournament &&
    currentGroup &&
    isTournamentActiveForAcceptedGroups(currentTournament);
  const selectedPlayersCount = getSelectedPlayersCount(team || {});
  const minPlayers = getMinPlayers(currentTournament || {});
  const missingPlayersCount = Math.max(minPlayers - selectedPlayersCount, 0);
  const tournamentName = getTournamentName(currentTournament || {});
  const groupName = getGroupName(currentGroup || {});
  const teamDetailPath = getTournamentTeamDetailPath(tournamentId, groupId, team || {});
  const paymentStatus = getPaymentStatus(team || {});
  const pendingAmount = Math.max(Number(team?.pendingAmount || 0), 0);

  await Promise.all(
    groupAdminIds.flatMap((adminId) => {
      const operations = [];

      if (isActive) {
        operations.push(upsertPendingAlert({
          userId: adminId,
          alertId: acceptedAlertId,
          kind: "group_accepted_in_tournament",
          severity: "info",
          title: "Grupo aceptado en torneo",
          message: `${groupName} fue aceptado en ${tournamentName}.`,
          link: { path: `/tournaments/${tournamentId}`, label: "Ver torneo" },
          resource: { groupId, tournamentId },
          meta: {
            groupName,
            tournamentName,
          },
        }));
      } else {
        operations.push(resolvePendingAlert(adminId, acceptedAlertId));
      }

      if (isActive && minPlayers > 0 && missingPlayersCount > 0) {
        operations.push(upsertPendingAlert({
          userId: adminId,
          alertId: missingPlayersAlertId,
          kind: "group_tournament_team_missing_players",
          severity: "warning",
          title: "Faltan jugadores para el torneo",
          message: `${groupName} necesita ${missingPlayersCount} jugador${pluralize(missingPlayersCount, "", "es")} más para llegar al mínimo de ${minPlayers} en ${tournamentName}.`,
          link: { path: teamDetailPath, label: "Completar equipo" },
          resource: { groupId, tournamentId },
          meta: {
            groupName,
            tournamentName,
            minPlayers,
            selectedPlayersCount,
            missingPlayersCount,
          },
        }));
      } else {
        operations.push(resolvePendingAlert(adminId, missingPlayersAlertId));
      }

      if (isActive && isPaymentPendingOrPartial(team || {})) {
        operations.push(upsertPendingAlert({
          userId: adminId,
          alertId: paymentAlertId,
          kind: "group_tournament_team_payment_pending",
          severity: "warning",
          title: paymentStatus === "parcial" ? "Pago parcial del torneo" : "Pago pendiente del torneo",
          message: pendingAmount > 0
            ? `${groupName} tiene un pago ${paymentStatus} de ${tournamentName}. Saldo pendiente: $${pendingAmount}.`
            : `${groupName} tiene un pago ${paymentStatus} de ${tournamentName}.`,
          link: { path: teamDetailPath, label: "Ver inscripción" },
          resource: { groupId, tournamentId },
          meta: {
            groupName,
            tournamentName,
            paymentStatus,
            pendingAmount,
          },
        }));
      } else {
        operations.push(resolvePendingAlert(adminId, paymentAlertId));
      }

      return operations;
    })
  );
}

async function syncAcceptedTournamentAlertsForGroup(groupId, beforeGroup, afterGroup) {
  if (!groupId) return;

  const beforeAdminIds = beforeGroup ? getGroupAdminIds(beforeGroup) : [];
  const afterAdminIds = afterGroup ? getGroupAdminIds(afterGroup) : [];
  const affectedAdminIds = Array.from(new Set([...beforeAdminIds, ...afterAdminIds]));
  if (!affectedAdminIds.length) return;

  const teamsSnap = await db
    .collection("tournamentTeams")
    .where("groupId", "==", String(groupId))
    .where("status", "==", "aceptado")
    .get();

  await Promise.all(
    teamsSnap.docs.map(async (teamDoc) => {
      const team = { id: teamDoc.id, ...teamDoc.data() };
      const tournamentId = team.tournamentId;
      if (!tournamentId) return;

      const tournamentSnap = await db.collection("tournaments").doc(String(tournamentId)).get();
      const tournament = tournamentSnap.exists ? tournamentSnap.data() : null;
      const afterAdminIdsSet = new Set(afterAdminIds);
      const removedAdminIds = affectedAdminIds.filter((adminId) => !afterAdminIdsSet.has(adminId));

      await Promise.all([
        syncAcceptedGroupTournamentAlert({
          tournamentId,
          groupId,
          team,
          tournament,
          group: afterGroup,
        }),
        ...removedAdminIds.map((adminId) => Promise.all([
          resolvePendingAlert(adminId, groupAcceptedInTournamentAlertId(tournamentId, groupId)),
          resolvePendingAlert(adminId, groupTournamentTeamMissingPlayersAlertId(tournamentId, groupId)),
          resolvePendingAlert(adminId, groupTournamentTeamPaymentAlertId(tournamentId, groupId)),
        ])),
      ]);
    })
  );
}

async function syncAcceptedGroupsForTournament(tournamentId, tournament) {
  if (!tournamentId) return;

  const teamsSnap = await db
    .collection("tournamentTeams")
    .where("tournamentId", "==", String(tournamentId))
    .where("status", "==", "aceptado")
    .get();

  await Promise.all(
    teamsSnap.docs.map((teamDoc) => {
      const team = { id: teamDoc.id, ...teamDoc.data() };
      return syncAcceptedGroupTournamentAlert({
        tournamentId,
        groupId: team.groupId,
        team,
        tournament,
      });
    })
  );
}

async function syncTournamentPendingAlerts(tournamentId, beforeTournament, afterTournament) {
  await Promise.all([
    syncTournamentAdminPendingAlerts(tournamentId, beforeTournament, afterTournament),
    afterTournament ? syncAcceptedGroupsForTournament(tournamentId, afterTournament) : syncAcceptedGroupsForTournament(tournamentId, { status: "cancelado" }),
  ]);
}

async function syncTournamentPendingAlertsById(tournamentId) {
  if (!tournamentId) return;

  const tournamentSnap = await db.collection("tournaments").doc(String(tournamentId)).get();
  const tournament = tournamentSnap.exists ? tournamentSnap.data() : null;
  await syncTournamentPendingAlerts(String(tournamentId), null, tournament);
}


async function syncGroupTournamentRegistrationPendingAlerts({ tournamentId, groupId, registration = null, registrationId = null }) {
  if (!tournamentId || !groupId) return;

  const [tournamentSnap, groupSnap] = await Promise.all([
    db.collection("tournaments").doc(String(tournamentId)).get(),
    db.collection("groups").doc(String(groupId)).get(),
  ]);

  const tournament = tournamentSnap.exists ? tournamentSnap.data() : null;
  const group = groupSnap.exists ? groupSnap.data() : null;
  const groupAdminIds = getGroupAdminIds(group || {});
  const missingPlayersAlertId = groupTournamentTeamMissingPlayersAlertId(tournamentId, groupId, "registration");
  const paymentAlertId = groupTournamentTeamPaymentAlertId(tournamentId, groupId, "registration");
  const isActive =
    registration?.status === "pendiente" &&
    tournament &&
    group &&
    isTournamentActiveForAcceptedGroups(tournament);
  const selectedPlayersCount = getSelectedPlayersCount(registration || {});
  const minPlayers = getMinPlayers(tournament || {});
  const missingPlayersCount = Math.max(minPlayers - selectedPlayersCount, 0);
  const tournamentName = getTournamentName(tournament || {});
  const groupName = getGroupName(group || {});
  const detailPath = `/profile/tournaments/registrations/${registrationId || `${tournamentId}_${groupId}`}`;
  const paymentStatus = getPaymentStatus(registration || {});
  const pendingAmount = Math.max(Number(registration?.pendingAmount || 0), 0);

  await Promise.all(
    groupAdminIds.flatMap((adminId) => {
      const operations = [];

      if (isActive && minPlayers > 0 && missingPlayersCount > 0) {
        operations.push(upsertPendingAlert({
          userId: adminId,
          alertId: missingPlayersAlertId,
          kind: "group_tournament_team_missing_players",
          severity: "warning",
          title: "Faltan jugadores para el torneo",
          message: `${groupName} necesita ${missingPlayersCount} jugador${pluralize(missingPlayersCount, "", "es")} más para llegar al mínimo de ${minPlayers} en ${tournamentName}.`,
          link: { path: detailPath, label: "Completar inscripción" },
          resource: { groupId, tournamentId },
          meta: {
            groupName,
            tournamentName,
            minPlayers,
            selectedPlayersCount,
            missingPlayersCount,
          },
        }));
      } else {
        operations.push(resolvePendingAlert(adminId, missingPlayersAlertId));
      }

      if (isActive && isPaymentPendingOrPartial(registration || {})) {
        operations.push(upsertPendingAlert({
          userId: adminId,
          alertId: paymentAlertId,
          kind: "group_tournament_team_payment_pending",
          severity: "warning",
          title: paymentStatus === "parcial" ? "Pago parcial del torneo" : "Pago pendiente del torneo",
          message: pendingAmount > 0
            ? `${groupName} tiene un pago ${paymentStatus} de ${tournamentName}. Saldo pendiente: $${pendingAmount}.`
            : `${groupName} tiene un pago ${paymentStatus} de ${tournamentName}.`,
          link: { path: detailPath, label: "Ver inscripción" },
          resource: { groupId, tournamentId },
          meta: {
            groupName,
            tournamentName,
            paymentStatus,
            pendingAmount,
          },
        }));
      } else {
        operations.push(resolvePendingAlert(adminId, paymentAlertId));
      }

      return operations;
    })
  );
}


async function syncPendingRegistrationAlertsForGroup(groupId, beforeGroup, afterGroup) {
  if (!groupId) return;

  const beforeAdminIds = beforeGroup ? getGroupAdminIds(beforeGroup) : [];
  const afterAdminIds = afterGroup ? getGroupAdminIds(afterGroup) : [];
  const affectedAdminIds = Array.from(new Set([...beforeAdminIds, ...afterAdminIds]));
  if (!affectedAdminIds.length) return;

  const registrationsSnap = await db
    .collection("tournamentRegistrations")
    .where("groupId", "==", String(groupId))
    .where("status", "==", "pendiente")
    .get();

  await Promise.all(
    registrationsSnap.docs.map(async (registrationDoc) => {
      const registration = registrationDoc.data();
      const tournamentId = registration.tournamentId;
      if (!tournamentId) return;

      const afterAdminIdsSet = new Set(afterAdminIds);
      const removedAdminIds = affectedAdminIds.filter((adminId) => !afterAdminIdsSet.has(adminId));

      await Promise.all([
        syncGroupTournamentRegistrationPendingAlerts({
          tournamentId,
          groupId,
          registration,
          registrationId: registrationDoc.id,
        }),
        ...removedAdminIds.map((adminId) => Promise.all([
          resolvePendingAlert(adminId, groupTournamentTeamMissingPlayersAlertId(tournamentId, groupId, "registration")),
          resolvePendingAlert(adminId, groupTournamentTeamPaymentAlertId(tournamentId, groupId, "registration")),
        ])),
      ]);
    })
  );
}

async function syncAcceptedGroupTournamentAlertByIds(tournamentId, groupId, team = undefined) {
  if (!tournamentId || !groupId) return;

  let currentTeam = team;
  if (typeof currentTeam === "undefined") {
    const teamsSnap = await db
      .collection("tournamentTeams")
      .where("tournamentId", "==", String(tournamentId))
      .where("groupId", "==", String(groupId))
      .where("status", "==", "aceptado")
      .limit(1)
      .get();

    currentTeam = teamsSnap.empty ? null : teamsSnap.docs[0].data();
  }

  await syncAcceptedGroupTournamentAlert({ tournamentId, groupId, team: currentTeam });
}

module.exports = {
  ACTIVE_TOURNAMENT_STATUSES,
  getGroupAdminIds,
  getTournamentAdminIds,
  getTournamentName,
  groupAcceptedInTournamentAlertId,
  groupTournamentTeamMissingPlayersAlertId,
  groupTournamentTeamPaymentAlertId,
  isTournamentActiveForAcceptedGroups,
  syncAcceptedGroupTournamentAlert,
  syncAcceptedGroupTournamentAlertByIds,
  syncGroupTournamentRegistrationPendingAlerts,
  syncPendingRegistrationAlertsForGroup,
  syncAcceptedTournamentAlertsForGroup,
  syncTournamentPendingAlerts,
  syncTournamentPendingAlertsById,
  tournamentAlertId,
};
