const functions = require("firebase-functions/v1");
const { requestTournamentRegistration } = require("../src/services/tournamentRegistrationService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  }

  const { tournamentId, groupId } = data;
  return requestTournamentRegistration({
    uid: context.auth.uid,
    tournamentId,
    groupId,
  });
});
