// functions/callables/updatePreferredPositions.js

const functions = require("firebase-functions/v1");
const { updatePreferredPositions } = require(
  "../src/services/userGameService"
);

module.exports = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "No autenticado"
      );
    }

    const { posiciones } = data;

    await updatePreferredPositions(
      context.auth.uid,
      posiciones
    );

    return { ok: true };
  }
);
