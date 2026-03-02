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

  const groupRef = db.collection("groups").doc(groupId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists) throw new functions.https.HttpsError("not-found", "El grupo no existe");

    const group = snap.data();
    const normalized = normalizeGroupAdmins(group);

    if (!normalized.adminIds.includes(String(userId))) {
      throw new functions.https.HttpsError("not-found", "El usuario no es admin del grupo");
    }

    const filtered = normalized.admins.filter((item) => item.userId !== String(userId));

    if (filtered.length === 0) {
      throw new functions.https.HttpsError("failed-precondition", "El grupo debe tener al menos un admin");
    }

    const admins = filtered.map((item, index) => ({
      ...item,
      role: index === 0 ? "owner" : "admin",
      order: index,
    }));

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
