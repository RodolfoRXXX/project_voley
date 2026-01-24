// Modificar estado de pago

const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");
const { actualizarPago } = require("../src/services/adminMatchService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated");
  }

  const { participationId, estado } = data;

  if (!participationId || !estado) {
    throw new functions.https.HttpsError("invalid-argument");
  }

  // 👉 validación admin
  const userSnap = await db
    .collection("users")
    .doc(context.auth.uid)
    .get();

  if (!userSnap.exists || userSnap.data().roles !== "admin") {
    throw new functions.https.HttpsError("permission-denied");
  }

  await actualizarPago(participationId, estado);

  return { ok: true };
});
