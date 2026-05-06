const functions = require("firebase-functions/v1");
const {
  syncGroupTournamentRegistrationPendingAlerts,
  syncTournamentPendingAlertsById,
} = require("../services/tournamentPendingAlertsService");

function getTournamentId(registration = {}) {
  return typeof registration?.tournamentId === "string" ? registration.tournamentId : null;
}

function getGroupId(registration = {}) {
  return typeof registration?.groupId === "string" ? registration.groupId : null;
}

module.exports = functions.firestore
  .document("tournamentRegistrations/{registrationId}")
  .onWrite(async (change, context) => {
    const beforeRegistration = change.before.exists ? change.before.data() : null;
    const afterRegistration = change.after.exists ? change.after.data() : null;
    const tournamentIds = Array.from(new Set([
      getTournamentId(beforeRegistration),
      getTournamentId(afterRegistration),
    ].filter(Boolean)));
    const registrationAlertTargets = [beforeRegistration, afterRegistration]
      .filter(Boolean)
      .map((registration) => ({
        tournamentId: getTournamentId(registration),
        groupId: getGroupId(registration),
      }))
      .filter((target) => target.tournamentId && target.groupId)
      .filter((target, index, all) =>
        all.findIndex((candidate) => candidate.tournamentId === target.tournamentId && candidate.groupId === target.groupId) === index
      );

    await Promise.all([
      ...tournamentIds.map(syncTournamentPendingAlertsById),
      ...registrationAlertTargets.map((target) => {
        const afterMatchesTarget =
          getTournamentId(afterRegistration) === target.tournamentId &&
          getGroupId(afterRegistration) === target.groupId;
        return syncGroupTournamentRegistrationPendingAlerts({
          tournamentId: target.tournamentId,
          groupId: target.groupId,
          registration: afterMatchesTarget ? afterRegistration : null,
          registrationId: context.params.registrationId,
        });
      }),
    ]);
    return null;
  });
