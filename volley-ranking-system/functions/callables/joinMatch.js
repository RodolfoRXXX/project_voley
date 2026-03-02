// Callable que dispara la unión al match

const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");
const { isGroupAdmin } = require("../src/services/groupAdminsService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
    );
  }

  const { matchId } = data;
  const userId = context.auth.uid;

  if (!matchId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "matchId requerido"
    );
  }

  const matchSnap = await db.collection("matches").doc(matchId).get();
  if (!matchSnap.exists) {
    throw new functions.https.HttpsError("not-found", "El partido no existe");
  }

  const match = matchSnap.data();
  const visibility = match.visibility || "group_only";

  if (visibility === "group_only") {
    const groupSnap = await db.collection("groups").doc(match.groupId).get();

    if (!groupSnap.exists) {
      throw new functions.https.HttpsError("not-found", "El grupo no existe");
    }

    const group = groupSnap.data();
    const userSnap = await db.collection("users").doc(userId).get();
    const isSystemAdmin = userSnap.exists && userSnap.data()?.roles === "admin";

    if (!isSystemAdmin && !isGroupAdmin(group, userId)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Este partido es solo para miembros del grupo"
      );
    }
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
