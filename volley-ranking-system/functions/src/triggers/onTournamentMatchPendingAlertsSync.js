const functions = require("firebase-functions/v1");
const { syncTournamentPendingAlertsById } = require("../services/tournamentPendingAlertsService");

function getTournamentId(match = {}) {
  return typeof match?.tournamentId === "string" ? match.tournamentId : null;
}

module.exports = functions.firestore
  .document("tournamentMatches/{matchId}")
  .onWrite(async (change) => {
    const beforeMatch = change.before.exists ? change.before.data() : null;
    const afterMatch = change.after.exists ? change.after.data() : null;
    const tournamentIds = Array.from(new Set([
      getTournamentId(beforeMatch),
      getTournamentId(afterMatch),
    ].filter(Boolean)));

    await Promise.all(tournamentIds.map(syncTournamentPendingAlertsById));
    return null;
  });
