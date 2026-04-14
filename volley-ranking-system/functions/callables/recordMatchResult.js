const functions = require("firebase-functions/v1");
const { assertIsAdmin } = require("../src/services/adminAccessService");
const { recordMatchResult } = require("../src/services/tournamentPhaseService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  await assertIsAdmin(context.auth.uid);
  return recordMatchResult({ matchId: data?.matchId, result: data?.result });
});
