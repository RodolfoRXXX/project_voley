const functions = require("firebase-functions/v1");
const { updateUserRole } = require("../src/services/userGameService");

module.exports = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "No autenticado"
      );
    }

    const { role } = data;

    const updated = await updateUserRole(
      context.auth.uid,
      role
    );

    return { ok: true, updated };
  }
);
