

const functions = require("firebase-functions/v1");
const { eliminarMatch } = require("../src/services/adminMatchService");
const { assertIsAdmin, assertMatchAdmin } = require("../src/services/adminAccessService");

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

  await assertIsAdmin(context.auth.uid);
  await assertMatchAdmin(matchId, context.auth.uid);

  try {
    await eliminarMatch(matchId);
    return { ok: true };
  } catch (err) {
    switch (err.code) {
      case "MATCH_NOT_FOUND":
        throw new functions.https.HttpsError(
          "not-found",
          err.message
        );

      case "MATCH_ALREADY_PLAYED":
        throw new functions.https.HttpsError(
          "failed-precondition",
          err.message
        );

      default:
        throw new functions.https.HttpsError(
          "internal",
          "No se pudo eliminar el partido"
        );
    }
  }
});

