const functions = require("firebase-functions/v1");
const { assertIsAdmin } = require("../src/services/adminAccessService");
const { createTournament } = require("../src/services/tournamentService");
const {
  assertNoRetiredTournamentEconomy,
  getTournamentEconomicFields,
} = require("../src/services/tournamentEconomyRetirement");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  }

  const uid = context.auth.uid;
  await assertIsAdmin(uid);
  assertNoRetiredTournamentEconomy(getTournamentEconomicFields(data));

  return createTournament({ data, uid });
});
