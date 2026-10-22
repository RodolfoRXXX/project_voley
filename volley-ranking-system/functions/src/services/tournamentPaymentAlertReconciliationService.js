const { FieldPath, FieldValue } = require("firebase-admin/firestore");

const RETIRED_ALERT_KIND = "group_tournament_team_payment_pending";

function emptyCounts() {
  return {
    inspected: 0,
    candidates: 0,
    resolved: 0,
    alreadyResolved: 0,
    skipped: 0,
    failed: 0,
  };
}

function normalizeCursor(cursor) {
  if (!cursor) return null;
  if (typeof cursor.userId !== "string" || !cursor.userId) {
    throw new Error("El cursor requiere userId");
  }
  if (cursor.afterUser === true) return { userId: cursor.userId, afterUser: true };
  if (typeof cursor.alertId !== "string" || !cursor.alertId) {
    throw new Error("El cursor requiere alertId o afterUser=true");
  }
  return { userId: cursor.userId, alertId: cursor.alertId, afterUser: false };
}

async function reconcileTournamentPaymentAlertsBatch({
  db,
  cursor = null,
  batchSize = 200,
  write = false,
}) {
  if (!db) throw new Error("db es obligatorio");
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 400) {
    throw new Error("batchSize debe ser un entero entre 1 y 400");
  }

  const startCursor = normalizeCursor(cursor);
  let usersQuery = db.collection("users").orderBy(FieldPath.documentId());
  if (startCursor?.afterUser) usersQuery = usersQuery.startAfter(startCursor.userId);
  else if (startCursor) usersQuery = usersQuery.startAt(startCursor.userId);

  const usersSnap = await usersQuery.get();
  const counts = emptyCounts();
  const mutations = [];
  let nextCursor = startCursor;

  for (const userDoc of usersSnap.docs) {
    let alertsQuery = userDoc.ref.collection("pendingAlerts").orderBy(FieldPath.documentId());
    if (startCursor && !startCursor.afterUser && userDoc.id === startCursor.userId) {
      alertsQuery = alertsQuery.startAfter(startCursor.alertId);
    }

    const alertsSnap = await alertsQuery.get();
    for (const alertDoc of alertsSnap.docs) {
      const alert = alertDoc.data() || {};
      counts.inspected += 1;
      nextCursor = { userId: userDoc.id, alertId: alertDoc.id, afterUser: false };

      if (alert.kind !== RETIRED_ALERT_KIND) {
        counts.skipped += 1;
      } else if (alert.status === "resolved") {
        counts.alreadyResolved += 1;
      } else if (alert.status !== "active") {
        counts.skipped += 1;
      } else {
        counts.candidates += 1;
        mutations.push(alertDoc.ref);
      }

      if (counts.inspected >= batchSize) {
        if (write && mutations.length) {
          const batch = db.batch();
          for (const ref of mutations) {
            batch.update(ref, { status: "resolved", updatedAt: FieldValue.serverTimestamp() });
          }
          await batch.commit();
          counts.resolved = mutations.length;
        }
        return { done: false, cursor: nextCursor, counts };
      }
    }

    nextCursor = { userId: userDoc.id, afterUser: true };
  }

  if (write && mutations.length) {
    const batch = db.batch();
    for (const ref of mutations) {
      batch.update(ref, { status: "resolved", updatedAt: FieldValue.serverTimestamp() });
    }
    await batch.commit();
    counts.resolved = mutations.length;
  }

  return { done: true, cursor: nextCursor, counts };
}

module.exports = {
  RETIRED_ALERT_KIND,
  emptyCounts,
  normalizeCursor,
  reconcileTournamentPaymentAlertsBatch,
};
