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

function isTournamentActiveForAcceptedGroups(tournament = {}) {
  return tournament && !CLOSED_TOURNAMENT_STATUSES.has(String(tournament.status || ""));
}

function isResultPendingMatch(match = {}) {
  return !["completed", "cancelled", "cancelado"].includes(String(match.status || ""));
}

async function getPendingRegistrationsCount(tournamentId) {
  const registrationsSnap = await db
    .collection("tournamentRegistrations")
    .where("tournamentId", "==", String(tournamentId))
    .where("status", "==", "pendiente")
    .get();

  return registrationsSnap.size;
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
      active: status === "inscripciones_cerradas",
      severity: "warning",
      title: "Inscripciones cerradas",
      message: `${tournamentName} ya cerró inscripciones. Confirmá el fixture e iniciá el torneo.`,
      link: { path: `/admin/tournaments/${tournamentId}`, label: "Gestionar fixture" },
      pendingCount: null,
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
  const alertId = groupAcceptedInTournamentAlertId(tournamentId, groupId);
  const isActive =
    team?.status === "aceptado" &&
    currentTournament &&
    currentGroup &&
    isTournamentActiveForAcceptedGroups(currentTournament);

  await Promise.all(
    groupAdminIds.map((adminId) => {
      if (isActive) {
        return upsertPendingAlert({
          userId: adminId,
          alertId,
          kind: "group_accepted_in_tournament",
          severity: "info",
          title: "Grupo aceptado en torneo",
          message: `${getGroupName(currentGroup)} fue aceptado en ${getTournamentName(currentTournament)}.`,
          link: { path: `/tournaments/${tournamentId}`, label: "Ver torneo" },
          resource: { groupId, tournamentId },
          meta: {
            groupName: getGroupName(currentGroup),
            tournamentName: getTournamentName(currentTournament),
          },
        });
      }

      return resolvePendingAlert(adminId, alertId);
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
      const team = teamDoc.data();
      const tournamentId = team.tournamentId;
      if (!tournamentId) return;

      const tournamentSnap = await db.collection("tournaments").doc(String(tournamentId)).get();
      const tournament = tournamentSnap.exists ? tournamentSnap.data() : null;
      const alertId = groupAcceptedInTournamentAlertId(tournamentId, groupId);
      const isActive = afterGroup && tournament && isTournamentActiveForAcceptedGroups(tournament);
      const afterAdminIdsSet = new Set(afterAdminIds);

      await Promise.all(
        affectedAdminIds.map((adminId) => {
          if (isActive && afterAdminIdsSet.has(adminId)) {
            return upsertPendingAlert({
              userId: adminId,
              alertId,
              kind: "group_accepted_in_tournament",
              severity: "info",
              title: "Grupo aceptado en torneo",
              message: `${getGroupName(afterGroup)} fue aceptado en ${getTournamentName(tournament)}.`,
              link: { path: `/tournaments/${tournamentId}`, label: "Ver torneo" },
              resource: { groupId, tournamentId },
              meta: {
                groupName: getGroupName(afterGroup),
                tournamentName: getTournamentName(tournament),
              },
            });
          }

          return resolvePendingAlert(adminId, alertId);
        })
      );
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
      const team = teamDoc.data();
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
  isTournamentActiveForAcceptedGroups,
  syncAcceptedGroupTournamentAlert,
  syncAcceptedGroupTournamentAlertByIds,
  syncAcceptedTournamentAlertsForGroup,
  syncTournamentPendingAlerts,
  syncTournamentPendingAlertsById,
  tournamentAlertId,
};
