

const functions = require("firebase-functions/v1");
const { editTournament } = require("../src/services/tournamentService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Debes estar autenticado"
    );
  }

  const uid = context.auth.uid;

  if (!data || typeof data !== "object") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Datos inválidos"
    );
  }

  const { tournamentId, ...payload } = data;

  if (typeof tournamentId !== "string" || !tournamentId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tournamentId inválido"
    );
  }

  try {
    const result = await editTournament({
      uid,
      tournamentId,
      data: payload,
    });

    return result;
  } catch (err) {
    if (err instanceof functions.https.HttpsError) {
      throw err;
    }

    console.error("editTournament error:", err);

    throw new functions.https.HttpsError(
      "internal",
      "No se pudo actualizar el torneo"
    );
  }
});