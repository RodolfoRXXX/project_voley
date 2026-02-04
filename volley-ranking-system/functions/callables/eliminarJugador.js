// Eliminar jugador de un match

const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");
const { eliminarJugador } = require("../src/services/adminMatchService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
    );
  }

  const { participationId } = data;

  if (!participationId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "participationId requerido"
    );
  }

  // 🔐 validar admin
  const userSnap = await db
    .collection("users")
    .doc(context.auth.uid)
    .get();

  if (!userSnap.exists || userSnap.data().roles !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin no validado"
    );
  }

  try {
    await eliminarJugador(participationId);
  } catch (err) {
    if (err.code === "PARTICIPATION_NOT_FOUND") {
      throw new functions.https.HttpsError(
        "not-found",
        err.message
      );
    }

    if (err.code === "PARTICIPATION_ALREADY_DELETED") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        err.message
      );
    }

    throw new functions.https.HttpsError(
      "internal",
      "No se pudo eliminar el jugador"
    );
  }

  return { ok: true };
});
