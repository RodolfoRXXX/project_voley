const functions = require("firebase-functions/v1");
const { dismissPendingAlert } = require("../src/services/pendingAlertsService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
    );
  }

  const alertId = String(data?.alertId || "").trim();
  if (!alertId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "alertId es requerido"
    );
  }

  await dismissPendingAlert(context.auth.uid, alertId);
  return { ok: true };
});
