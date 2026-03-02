const functions = require("firebase-functions/v1");
const { admin, db } = require("../src/firebase");
const { assertIsAdmin, assertGroupOwner } = require("../src/services/adminAccessService");
const { normalizeGroupAdmins } = require("../src/services/groupAdminsService");

module.exports = functions.region("southamerica-east1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  }

  const { groupId, orderedUserIds } = data || {};

  if (!groupId || !Array.isArray(orderedUserIds) || orderedUserIds.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "groupId y orderedUserIds son requeridos");
  }

  await assertIsAdmin(context.auth.uid);
  await assertGroupOwner(groupId, context.auth.uid);

  const groupRef = db.collection("groups").doc(groupId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists) throw new functions.https.HttpsError("not-found", "El grupo no existe");

    const group = snap.data();
    const normalized = normalizeGroupAdmins(group);

    const existingIds = normalized.adminIds;
    const nextIds = orderedUserIds.map((v) => String(v));

    if (existingIds.length !== nextIds.length) {
      throw new functions.https.HttpsError("invalid-argument", "La cantidad de admins no coincide");
    }

    const unique = new Set(nextIds);
    if (unique.size !== nextIds.length) {
      throw new functions.https.HttpsError("invalid-argument", "orderedUserIds no puede contener repetidos");
    }

    const hasAll = existingIds.every((id) => unique.has(id));
    if (!hasAll) {
      throw new functions.https.HttpsError("invalid-argument", "orderedUserIds no coincide con los admins actuales");
    }

    const mapById = new Map(normalized.admins.map((a) => [a.userId, a]));

    const admins = nextIds.map((id, index) => ({
      ...mapById.get(id),
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
