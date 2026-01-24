// Eliminar jugador de un match

const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");
const { eliminarJugador } = require("../src/services/adminMatchService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated");
  }

  const { participationId } = data;

  if (!participationId) {
    throw new functions.https.HttpsError("invalid-argument");
  }

  // 🔐 validar admin
  const userSnap = await db
    .collection("users")
    .doc(context.auth.uid)
    .get();

  if (!userSnap.exists || userSnap.data().roles !== "admin") {
    throw new functions.https.HttpsError("permission-denied");
  }

  await eliminarJugador(participationId);

  return { ok: true };
});
