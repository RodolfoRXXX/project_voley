const functions = require("firebase-functions/v1");
const { MAIL_AND_PUSH_SECRETS } = require("../src/config/functionSecrets");
const { assertIsAdmin } = require("../src/services/adminAccessService");
const { addTournamentAdmin } = require("../src/services/tournamentService");

module.exports = functions
  .runWith({ secrets: MAIL_AND_PUSH_SECRETS })
  .https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  }

  const uid = context.auth.uid;
  await assertIsAdmin(uid);

  const { tournamentId, adminUserId } = data;

  return addTournamentAdmin({ uid, tournamentId, adminUserId });
});
