const functions = require("firebase-functions/v1");
const { admin, db } = require("../src/firebase");
const { assertIsAdmin, assertGroupOwner } = require("../src/services/adminAccessService");
const { normalizeGroupAdmins } = require("../src/services/groupAdminsService");

module.exports = functions.region("southamerica-east1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  }

  const { groupId, newOwnerUserId } = data || {};

  if (!groupId || !newOwnerUserId) {
    throw new functions.https.HttpsError("invalid-argument", "groupId y newOwnerUserId son requeridos");
  }

  await assertIsAdmin(context.auth.uid);
  await assertGroupOwner(groupId, context.auth.uid);

  const groupRef = db.collection("groups").doc(groupId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists) throw new functions.https.HttpsError("not-found", "El grupo no existe");

    const group = snap.data();
    const normalized = normalizeGroupAdmins(group);

    const targetId = String(newOwnerUserId);
    const currentOwner = normalized.ownerId;

    if (!normalized.adminIds.includes(targetId)) {
      throw new functions.https.HttpsError("failed-precondition", "El nuevo owner debe ser admin del grupo");
    }

    if (targetId === String(currentOwner)) {
      return;
    }

    const others = normalized.admins.filter((a) => a.userId !== targetId);
    const target = normalized.admins.find((a) => a.userId === targetId);

    const admins = [target, ...others].map((item, index) => ({
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
