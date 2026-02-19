// callables/reabrirMatch.js

const functions = require("firebase-functions/v1");
const { reabrirMatch } = require("../src/services/adminMatchService");
const { assertIsAdmin, assertMatchAdmin } = require("../src/services/adminAccessService");

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

  await assertIsAdmin(context.auth.uid);
  await assertMatchAdmin(matchId, context.auth.uid);

  try {
    await reabrirMatch(matchId);
    return { ok: true };
  } catch (err) {
    switch (err.code) {
      case "MATCH_NOT_FOUND":
        throw new functions.https.HttpsError("not-found", err.message);

      case "MATCH_ALREADY_STARTED":
      case "INVALID_MATCH_STATE":
        throw new functions.https.HttpsError(
          "failed-precondition",
          err.message
        );

      default:
        throw new functions.https.HttpsError(
          "internal",
          "No se pudo reabrir el partido"
        );
    }
  }
});

