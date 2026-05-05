const functions = require("firebase-functions/v1");
const { syncCompleteProfilePendingAlert } = require("../services/pendingAlertsService");

module.exports = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    if (!change.after.exists) return null;

    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.data();

    if (before && before.onboarded === after.onboarded) return null;

    await syncCompleteProfilePendingAlert(context.params.userId, after);
    return null;
  });
