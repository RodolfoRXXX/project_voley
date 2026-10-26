"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { createDashboardTaskOutboxCapability } = require("../public/dashboardTaskOutboxCapability");
const { SCOPE_STATUS, COVERAGE } = require("./dashboardTaskModel");

function createDashboardTaskOperations({ db, now = () => Timestamp.now() }) {
  if (!db) throw new TypeError("db is required");
  const outbox = createDashboardTaskOutboxCapability({ db, now });

  async function enqueueGroup({ groupId, reason, identity, generationId, coverageComplete = true }) {
    return db.runTransaction(async (transaction) => {
      const prepared = await outbox.prepare(transaction, { kind: reason, idempotencyIdentity: identity, groupId,
        resourceType: "GROUP", resourceIds: [groupId], fingerprintParts: [groupId, reason, generationId], generationId });
      prepared.commit();
      transaction.set(db.collection("dashboardTaskScopes").doc(groupId), {
        ...(generationId ? { writeGenerationId: generationId } : {}), coverageComplete,
        status: generationId ? SCOPE_STATUS.REBUILDING : SCOPE_STATUS.DIRTY, updatedAt: now(),
      }, { merge: true });
      return { groupId, revision: prepared.revision, duplicate: prepared.duplicate };
    });
  }

  async function enqueueAll({ reason = "DASHBOARD_TASK_RECONCILIATION", generationId, runId, pageSize = 100, maxContexts = 10_000 }) {
    const results = []; let cursor = null; let exhausted = false;
    while (results.length < maxContexts) {
      const requested = Math.min(pageSize, maxContexts - results.length);
      let query = db.collection("groups").orderBy("__name__").limit(requested);
      if (cursor) query = query.startAfter(cursor);
      const groups = await query.get();
      for (const group of groups.docs) results.push(await enqueueGroup({ groupId: group.id, reason,
        identity: `${runId}:${group.id}`, generationId, coverageComplete: true }));
      if (groups.size < requested) { exhausted = true; break; }
      cursor = groups.docs.at(-1); if (!cursor) { exhausted = true; break; }
    }
    return { inspected: results.length, results, truncated: !exhausted };
  }

  async function health() {
    const [dirty, degraded, failed, processing] = await Promise.all([
      db.collection("dashboardTaskScopes").where("status", "==", SCOPE_STATUS.DIRTY).count().get(),
      db.collection("dashboardTaskScopes").where("status", "==", SCOPE_STATUS.DEGRADED).count().get(),
      db.collection("dashboardTaskOutbox").where("status", "==", "FAILED").count().get(),
      db.collection("dashboardTaskOutbox").where("status", "==", "PROCESSING").count().get(),
    ]);
    const data = { coverage: COVERAGE, dirtyScopes: dirty.data().count, degradedScopes: degraded.data().count,
      failedEvents: failed.data().count, processingEvents: processing.data().count, measuredAt: now(), schemaVersion: 1 };
    await db.collection("dashboardTaskHealth").doc(COVERAGE).set(data);
    return data;
  }

  async function cleanup({ limit = 200 } = {}) {
    const cutoff = Timestamp.fromMillis(now().toMillis() - 30 * 24 * 60 * 60 * 1000); let deleted = 0;
    const applied = await db.collection("dashboardTaskOutbox").where("status", "==", "APPLIED")
      .where("appliedAt", "<=", cutoff).limit(limit).get();
    const scopeIds = [...new Set(applied.docs.map((doc) => doc.data().groupId)
      .filter((groupId) => typeof groupId === "string" && groupId.length > 0))];
    const scopeSnapshots = scopeIds.length
      ? await db.getAll(...scopeIds.map((groupId) => db.collection("dashboardTaskScopes").doc(groupId))) : [];
    const projectedByGroup = new Map(scopeSnapshots.filter((snapshot) => snapshot.exists)
      .map((snapshot) => [snapshot.id, snapshot.data().projectedRevision]));
    const safeApplied = applied.docs.filter((doc) => {
      const event = doc.data(); const projectedRevision = projectedByGroup.get(event.groupId);
      return Number.isSafeInteger(event.scopeRevision) && Number.isSafeInteger(projectedRevision)
        && event.scopeRevision <= projectedRevision;
    });
    if (safeApplied.length) {
      const batch = db.batch(); safeApplied.forEach((doc) => batch.delete(doc.ref)); await batch.commit();
      deleted += safeApplied.length;
    }
    const queries = [
      db.collection("dashboardTaskManifests").where("projectionState", "==", "INACTIVE").where("purgeAfter", "<=", now()).limit(limit),
      db.collectionGroup("items").where("coverage", "==", COVERAGE).where("projectionState", "==", "INACTIVE").where("purgeAfter", "<=", now()).limit(limit),
    ];
    for (const query of queries) {
      const snapshot = await query.get(); const batch = db.batch(); snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      if (!snapshot.empty) await batch.commit(); deleted += snapshot.size;
    }
    const expiredGenerations = await db.collectionGroup("dashboardTaskProjection")
      .where("previousGenerationPurgeAfter", "<=", now()).limit(limit).get();
    for (const meta of expiredGenerations.docs) {
      const previous = meta.data().previousGenerationId; const userRef = meta.ref.parent.parent;
      if (previous && previous !== meta.data().activeGenerationId && userRef) {
        await db.recursiveDelete(userRef.collection("dashboardTaskSets").doc(previous));
        await meta.ref.set({ previousGenerationId: null, previousGenerationPurgeAfter: null }, { merge: true }); deleted += 1;
      }
    }
    return { deleted };
  }

  return Object.freeze({ enqueueGroup, enqueueAll, health, cleanup });
}

module.exports = { createDashboardTaskOperations };
