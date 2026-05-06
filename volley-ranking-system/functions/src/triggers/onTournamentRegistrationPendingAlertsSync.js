const functions = require("firebase-functions/v1");
const { syncTournamentPendingAlertsById } = require("../services/tournamentPendingAlertsService");

function getTournamentId(registration = {}) {
  return typeof registration?.tournamentId === "string" ? registration.tournamentId : null;
}

module.exports = functions.firestore
  .document("tournamentRegistrations/{registrationId}")
  .onWrite(async (change) => {
    const beforeRegistration = change.before.exists ? change.before.data() : null;
    const afterRegistration = change.after.exists ? change.after.data() : null;
    const tournamentIds = Array.from(new Set([
      getTournamentId(beforeRegistration),
      getTournamentId(afterRegistration),
    ].filter(Boolean)));

    await Promise.all(tournamentIds.map(syncTournamentPendingAlertsById));
    return null;
  });
