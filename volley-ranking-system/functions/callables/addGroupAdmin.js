const functions = require("firebase-functions/v1");
const { admin, db } = require("../src/firebase");
const { assertIsAdmin, assertGroupOwner } = require("../src/services/adminAccessService");
const { normalizeGroupAdmins } = require("../src/services/groupAdminsService");

module.exports = functions.region("southamerica-east1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  }

  const { groupId, userId } = data || {};

  if (!groupId || !userId) {
    throw new functions.https.HttpsError("invalid-argument", "groupId y userId son requeridos");
  }

  await assertIsAdmin(context.auth.uid);
  await assertGroupOwner(groupId, context.auth.uid);

  const userSnap = await db.collection("users").doc(String(userId)).get();
  if (!userSnap.exists || userSnap.data()?.roles !== "admin") {
    throw new functions.https.HttpsError("failed-precondition", "El usuario a agregar no es admin");
  }

  const groupRef = db.collection("groups").doc(groupId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists) throw new functions.https.HttpsError("not-found", "El grupo no existe");

    const group = snap.data();
    const normalized = normalizeGroupAdmins(group);

    if (normalized.adminIds.includes(String(userId))) {
      throw new functions.https.HttpsError("already-exists", "El usuario ya es admin del grupo");
    }

    const admins = [
      ...normalized.admins,
      {
        userId: String(userId),
        role: "admin",
        order: normalized.admins.length,
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
        addedBy: context.auth.uid,
      },
    ];

    tx.update(groupRef, {
      admins,
      ownerId: admins[0].userId,
      adminIds: admins.map((a) => a.userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid,
    });
  });

  return { ok: true };
});
