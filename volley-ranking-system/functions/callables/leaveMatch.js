// Callable que dispara la salida del match

const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated");
  }

  const { matchId } = data;
  const userId = context.auth.uid;

  const snap = await db
    .collection("participations")
    .where("matchId", "==", matchId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "No existe participation"
    );
  }

  await snap.docs[0].ref.update({
    estado: "eliminado",
  });

  return { ok: true };
});
