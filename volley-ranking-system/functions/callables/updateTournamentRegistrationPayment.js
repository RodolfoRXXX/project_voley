const functions = require("firebase-functions/v1");
const { assertIsAdmin } = require("../src/services/adminAccessService");
const { updateTournamentRegistrationPayment } = require("../src/services/tournamentRegistrationService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  }

  const uid = context.auth.uid;
  await assertIsAdmin(uid);

  const { registrationId, paidAmount } = data;

  return updateTournamentRegistrationPayment({
    uid,
    registrationId,
    paidAmount,
  });
});
