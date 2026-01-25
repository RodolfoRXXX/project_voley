const functions = require("firebase-functions/v1");
const { eliminarMatch } = require("../src/services/adminMatchService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Usuario no autenticado"
    );
  }

  const { matchId } = data;

  if (!matchId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "matchId requerido"
    );
  }

  try {
    await eliminarMatch(matchId, context.auth.uid);
    return { ok: true };
  } catch (err) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      err.message
    );
  }
});
