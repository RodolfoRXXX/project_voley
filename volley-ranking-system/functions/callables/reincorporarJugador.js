// Reincorporar jugador eliminado a un match

const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");

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

  const ref = db.collection("participations").doc(participationId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;

    const p = snap.data();

    if (p.estado !== "eliminado") return;
    if (!p.matchId) return;

    tx.update(ref, {
      estado: "pendiente",
      posicionAsignada: null,
      rankingTitular: null,
      rankingSuplente: null,
      puntaje: 0,
    });
  });

  return { ok: true };
});
