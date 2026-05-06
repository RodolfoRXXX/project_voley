const functions = require("firebase-functions/v1");
const {
  syncAcceptedGroupTournamentAlertByIds,
  syncTournamentPendingAlertsById,
} = require("../services/tournamentPendingAlertsService");

function getTournamentId(team = {}) {
  return typeof team?.tournamentId === "string" ? team.tournamentId : null;
}

function getGroupId(team = {}) {
  return typeof team?.groupId === "string" ? team.groupId : null;
}

module.exports = functions.firestore
  .document("tournamentTeams/{teamId}")
  .onWrite(async (change) => {
    const beforeTeam = change.before.exists ? change.before.data() : null;
    const afterTeam = change.after.exists ? change.after.data() : null;
    const tournamentIds = Array.from(new Set([
      getTournamentId(beforeTeam),
      getTournamentId(afterTeam),
    ].filter(Boolean)));
    const acceptedAlertTargets = [
      { tournamentId: getTournamentId(beforeTeam), groupId: getGroupId(beforeTeam) },
      { tournamentId: getTournamentId(afterTeam), groupId: getGroupId(afterTeam) },
    ]
      .filter((target) => target.tournamentId && target.groupId)
      .filter((target, index, all) =>
        all.findIndex((candidate) => candidate.tournamentId === target.tournamentId && candidate.groupId === target.groupId) === index
      );

    await Promise.all([
      ...tournamentIds.map(syncTournamentPendingAlertsById),
      ...acceptedAlertTargets.map((target) =>
        syncAcceptedGroupTournamentAlertByIds(target.tournamentId, target.groupId)
      ),
    ]);
    return null;
  });
