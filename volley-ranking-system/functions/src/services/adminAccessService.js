const functions = require("firebase-functions/v1");
const { db } = require("../firebase");
const {
  isGroupAdmin,
  isGroupOwner,
} = require("./groupAdminsService");

async function assertIsAdmin(uid) {
  const userSnap = await db.collection("users").doc(uid).get();

  if (!userSnap.exists || userSnap.data().roles !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin no validado"
    );
  }
}

async function assertGroupAdmin(groupId, uid) {
  const groupSnap = await db.collection("groups").doc(groupId).get();

  if (!groupSnap.exists) {
    throw new functions.https.HttpsError("not-found", "El grupo no existe");
  }

  const group = groupSnap.data();

  if (!isGroupAdmin(group, uid)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "No tenés permisos sobre este grupo"
    );
  }

  return group;
}

async function assertGroupOwner(groupId, uid) {
  const groupSnap = await db.collection("groups").doc(groupId).get();

  if (!groupSnap.exists) {
    throw new functions.https.HttpsError("not-found", "El grupo no existe");
  }

  const group = groupSnap.data();

  if (!isGroupOwner(group, uid)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo el owner puede realizar esta acción"
    );
  }

  return group;
}

async function assertMatchAdmin(matchId, uid) {
  const matchSnap = await db.collection("matches").doc(matchId).get();

  if (!matchSnap.exists) {
    throw new functions.https.HttpsError("not-found", "El match no existe");
  }

  const match = matchSnap.data();

  let isAllowed = false;

  if (match.groupId) {
    await assertGroupAdmin(match.groupId, uid);
    isAllowed = true;
  } else if (match.adminId) {
    isAllowed = String(match.adminId) === String(uid);
  }

  if (!isAllowed) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "No tenés permisos sobre este partido"
    );
  }

  return match;
}

async function assertParticipationMatchAdmin(participationId, uid) {
  const participationSnap = await db
    .collection("participations")
    .doc(participationId)
    .get();

  if (!participationSnap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "La participación no existe"
    );
  }

  const participation = participationSnap.data();
  await assertMatchAdmin(participation.matchId, uid);

  return participation;
}

module.exports = {
  assertIsAdmin,
  assertGroupAdmin,
  assertGroupOwner,
  assertMatchAdmin,
  assertParticipationMatchAdmin,
};
