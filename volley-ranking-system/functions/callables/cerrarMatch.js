// callables/cerrarMatch.js

const functions = require("firebase-functions/v1");
const { cerrarMatch } = require("../src/services/adminMatchService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
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
    await cerrarMatch(matchId);
    return { ok: true };
  } catch (err) {
    switch (err.code) {
      case "MATCH_NOT_FOUND":
        throw new functions.https.HttpsError(
          "not-found",
          err.message
        );

      case "INVALID_MATCH_STATE":
      case "PENDING_PAYMENTS":
        throw new functions.https.HttpsError(
          "failed-precondition",
          err.message
        );

      default:
        throw new functions.https.HttpsError(
          "internal",
          "No se pudo cerrar el partido"
        );
    }
  }
});

