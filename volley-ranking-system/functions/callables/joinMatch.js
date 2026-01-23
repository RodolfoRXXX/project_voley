// Callable que dispara la unión al match

const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated");
  }

  const { matchId } = data;
  const userId = context.auth.uid;

  if (!matchId) {
    throw new functions.https.HttpsError("invalid-argument");
  }

  const existing = await db
    .collection("participations")
    .where("matchId", "==", matchId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "El usuario ya está anotado"
    );
  }

  await db.collection("participations").add({
    matchId,
    userId,
    estado: "pendiente",
    posicionAsignada: null,
    rankingTitular: null,
    rankingSuplente: null,
    puntaje: 0,
    pagoEstado: "pendiente",
    createdAt: new Date(),
  });

  return { ok: true };
});
