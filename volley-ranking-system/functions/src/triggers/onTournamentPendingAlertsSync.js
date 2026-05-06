const functions = require("firebase-functions/v1");
const { syncTournamentPendingAlerts } = require("../services/tournamentPendingAlertsService");

module.exports = functions.firestore
  .document("tournaments/{tournamentId}")
  .onWrite(async (change, context) => {
    const beforeTournament = change.before.exists ? change.before.data() : null;
    const afterTournament = change.after.exists ? change.after.data() : null;

    await syncTournamentPendingAlerts(context.params.tournamentId, beforeTournament, afterTournament);
    return null;
  });
