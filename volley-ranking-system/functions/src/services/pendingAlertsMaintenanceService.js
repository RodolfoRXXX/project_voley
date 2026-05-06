const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { db } = require("../firebase");

const DEFAULT_DELETE_AFTER_DAYS = 30;
const DEFAULT_BATCH_LIMIT = 500;

function getParentUserId(alertDoc) {
  return alertDoc.ref.parent?.parent?.id || "unknown";
}

async function resolveExpiredAlerts(now = Timestamp.now(), batchLimit = DEFAULT_BATCH_LIMIT) {
  const expiredSnap = await db
    .collectionGroup("pendingAlerts")
    .where("status", "==", "active")
    .where("expiresAt", "<=", now)
    .limit(batchLimit)
    .get();

  if (expiredSnap.empty) return 0;

  const batch = db.batch();
  expiredSnap.docs.forEach((doc) => {
    batch.set(doc.ref, {
      status: "resolved",
      resolvedReason: "expired",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  await batch.commit();
  return expiredSnap.size;
}

async function deleteOldInactiveAlerts(now = Timestamp.now(), options = {}) {
  const deleteAfterDays = Number(options.deleteAfterDays || DEFAULT_DELETE_AFTER_DAYS);
  const batchLimit = Number(options.batchLimit || DEFAULT_BATCH_LIMIT);
  const cutoff = Timestamp.fromMillis(now.toMillis() - deleteAfterDays * 24 * 60 * 60 * 1000);
  let deletedCount = 0;

  for (const status of ["resolved", "dismissed"]) {
    const inactiveSnap = await db
      .collectionGroup("pendingAlerts")
      .where("status", "==", status)
      .where("updatedAt", "<=", cutoff)
      .limit(batchLimit)
      .get();

    if (inactiveSnap.empty) continue;

    const batch = db.batch();
    inactiveSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deletedCount += inactiveSnap.size;
  }

  return deletedCount;
}

async function logActivePendingAlertMetrics(batchLimit = 5000) {
  const activeSnap = await db
    .collectionGroup("pendingAlerts")
    .where("status", "==", "active")
    .limit(batchLimit)
    .get();

  const byUser = new Map();
  const byKind = new Map();
  const bySeverity = new Map();

  activeSnap.docs.forEach((doc) => {
    const alert = doc.data();
    const userId = getParentUserId(doc);
    const kind = String(alert.kind || "unknown");
    const severity = String(alert.severity || "unknown");

    byUser.set(userId, (byUser.get(userId) || 0) + 1);
    byKind.set(kind, (byKind.get(kind) || 0) + 1);
    bySeverity.set(severity, (bySeverity.get(severity) || 0) + 1);
  });

  const topUsers = Array.from(byUser.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, count]) => ({ userId, count }));

  console.log("pendingAlerts.activeMetrics", {
    activeCount: activeSnap.size,
    limited: activeSnap.size >= batchLimit,
    usersWithActiveAlerts: byUser.size,
    byKind: Object.fromEntries(byKind),
    bySeverity: Object.fromEntries(bySeverity),
    topUsers,
  });

  return {
    activeCount: activeSnap.size,
    usersWithActiveAlerts: byUser.size,
  };
}

async function cleanupPendingAlerts() {
  const now = Timestamp.now();
  const [expiredResolvedCount, oldInactiveDeletedCount, activeMetrics] = await Promise.all([
    resolveExpiredAlerts(now),
    deleteOldInactiveAlerts(now),
    logActivePendingAlertMetrics(),
  ]);

  console.log("pendingAlerts.cleanupSummary", {
    expiredResolvedCount,
    oldInactiveDeletedCount,
    activeCount: activeMetrics.activeCount,
    usersWithActiveAlerts: activeMetrics.usersWithActiveAlerts,
  });

  return {
    expiredResolvedCount,
    oldInactiveDeletedCount,
    ...activeMetrics,
  };
}

module.exports = {
  cleanupPendingAlerts,
  deleteOldInactiveAlerts,
  logActivePendingAlertMetrics,
  resolveExpiredAlerts,
};
