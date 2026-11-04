"use strict";

const { db } = require("../firebase");
const { createDashboardTaskOperations } = require("../dashboardTasks/application/dashboardTaskOperations");
const { createFirestoreDashboardTaskProjectionStore } = require("../dashboardTasks/infrastructure/firestoreDashboardTaskProjectionStore");
const { createDashboardTaskWorker } = require("../dashboardTasks/application/dashboardTaskWorker");
const { Timestamp } = require("firebase-admin/firestore");
const { COVERAGE } = require("../dashboardTasks/application/dashboardTaskModel");
const { createGroupOwnershipContextCapability } = require("../groups/public/groupOwnershipContextCapability");
const { createDashboardTaskOutboxCapability } = require("../dashboardTasks/public/dashboardTaskOutboxCapability");

function requireEmulator() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("This IUX-02A operator is restricted to the Firestore emulator until productive authorization");
}

async function drain(worker) {
  let processed = 0;
  for (let page = 0; page < 1000; page += 1) {
    const result = await worker.run({ limit: 40 }); processed += result.processed;
    if (!result.inspected) return processed;
  }
  throw new Error("Projection drain did not converge");
}

async function assertGenerationComplete(database, generationId, scopeIds = null) {
  const scopes = scopeIds
    ? { docs: (await database.getAll(...scopeIds.map((groupId) => database.collection("dashboardTaskScopes").doc(groupId)))).filter((snapshot) => snapshot.exists) }
    : await database.collection("dashboardTaskScopes").get();
  if (scopeIds && scopes.docs.length !== scopeIds.length) throw new Error("Cannot activate generation with missing scopes");
  const invalid = scopes.docs.filter((doc) => { const x = doc.data(); return x.writeGenerationId !== generationId
    || x.projectedRevision !== x.sourceRevision || x.coverageComplete !== true || x.status !== "READY"; });
  if (invalid.length) throw new Error(`Cannot activate incomplete generation; ${invalid.length} scopes are not covered`);
  return scopes.docs.length;
}

async function activateGeneration(database, generationId, at = Timestamp.now(), scopeIds = null) {
  await assertGenerationComplete(database, generationId, scopeIds);
  const metas = await database.collectionGroup("dashboardTaskProjection").where("coverage", "==", COVERAGE).get();
  const roots = metas.docs.map((doc) => doc.ref.parent.parent.collection("dashboardTaskSets").doc(generationId));
  const rootSnapshots = roots.length ? await database.getAll(...roots) : [];
  const rootByPath = new Map(rootSnapshots.map((snapshot) => [snapshot.ref.path, snapshot]));
  for (let offset = 0; offset < metas.size; offset += 200) {
    const batch = database.batch();
    metas.docs.slice(offset, offset + 200).forEach((doc) => { const previous = doc.data().activeGenerationId;
      const root = doc.ref.parent.parent.collection("dashboardTaskSets").doc(generationId);
      if (!rootByPath.get(root.path)?.exists) batch.create(root, { generationId, coverage: COVERAGE, total: 0, N20: 0, N31: 0,
        projectedRevision: 0, updatedAt: at, schemaVersion: 1 });
      batch.set(doc.ref, { activeGenerationId: generationId, buildingGenerationId: null, projectionState: "READY", activatedAt: at,
        ...(previous && previous !== generationId ? { previousGenerationId: previous,
          previousGenerationPurgeAfter: Timestamp.fromMillis(at.toMillis() + 30 * 24 * 60 * 60 * 1000) } : {}),
      }, { merge: true }); });
    await batch.commit();
  }
  return metas.size;
}

async function rollback(database, operations, worker, at = Timestamp.now(), scopeIds = null) {
  const metas = await database.collectionGroup("dashboardTaskProjection").where("coverage", "==", COVERAGE).get();
  const eligible = metas.docs.filter((doc) => typeof doc.data().previousGenerationId === "string");
  const generations = new Set(eligible.map((doc) => doc.data().previousGenerationId));
  if (generations.size !== 1) throw new Error("Rollback requires one retained previous generation");
  const generationId = [...generations][0];
  const runId = `rollback-${Date.now()}`;
  const enqueued = scopeIds
    ? { truncated: false, inspected: scopeIds.length, results: await Promise.all(scopeIds.map((groupId) => operations.enqueueGroup({
      groupId, reason: "DASHBOARD_TASK_ROLLBACK_RECONCILIATION", identity: `${runId}:${groupId}`,
      generationId, coverageComplete: true,
    }))) }
    : await operations.enqueueAll({ reason: "DASHBOARD_TASK_ROLLBACK_RECONCILIATION", generationId, runId });
  if (enqueued.truncated) throw new Error("Rollback context limit reached");
  await drain(worker);
  await assertGenerationComplete(database, generationId, scopeIds);
  for (let offset = 0; offset < eligible.length; offset += 400) {
    const batch = database.batch(); eligible.slice(offset, offset + 400).forEach((doc) => batch.set(doc.ref, {
      activeGenerationId: generationId, previousGenerationId: null, previousGenerationPurgeAfter: null,
      projectionState: "ROLLED_BACK", rolledBackAt: at,
    }, { merge: true })); await batch.commit();
  }
  return eligible.length;
}

async function repairLegacyGroup(database, groupId) {
  if (typeof groupId !== "string" || !groupId.trim() || groupId.includes("/")) throw new Error("Invalid groupId");
  const ownership = createGroupOwnershipContextCapability({ db: database });
  const outbox = createDashboardTaskOutboxCapability({ db: database });
  return database.runTransaction(async (transaction) => {
    const groupSnapshot = await transaction.get(database.collection("groups").doc(groupId));
    const group = groupSnapshot.data();
    if (!groupSnapshot.exists || typeof group?.ownerId !== "string" || !group.ownerId.trim()) {
      throw new Error(`Group ${groupId} is not eligible for canonical evolution`);
    }
    const prepared = await outbox.prepare(transaction, { kind: "GROUP_COVERAGE_INITIALIZED",
      idempotencyIdentity: groupId, groupId, resourceType: "GROUP", resourceIds: [groupId],
      fingerprintParts: [groupId, group.ownerId, group.ownershipRevision || 1], coverageComplete: true,
      activateOnComplete: true });
    const context = await ownership.ensureOwnershipContext({ unitOfWork: transaction, groupId });
    if (context.status !== "READY") throw new Error(`Group ${groupId} is not eligible for canonical evolution`);
    prepared.commit();
    return { groupId, ownershipRevision: context.ownershipRevision, revision: prepared.revision,
      duplicate: prepared.duplicate };
  });
}

async function main() {
  requireEmulator();
  const command = process.argv[2] || "backfill"; const operations = createDashboardTaskOperations({ db });
  const worker = createDashboardTaskWorker({ store: createFirestoreDashboardTaskProjectionStore({ db }) });
  if (command === "rollback") return console.log(JSON.stringify({ command, users: await rollback(db, operations, worker) }));
  if (command === "repair-group") {
    const groupIds = [...new Set(process.argv.slice(3))];
    if (!groupIds.length) throw new Error("repair-group requires at least one groupId");
    const repaired = [];
    for (const groupId of groupIds) repaired.push(await repairLegacyGroup(db, groupId));
    const processed = await drain(worker);
    return console.log(JSON.stringify({ command, repaired, processed }, null, 2));
  }
  const generationId = command === "rebuild" ? `rebuild-${Date.now()}` : "live-v1";
  const runId = `${command}-${Date.now()}`;
  const enqueued = await operations.enqueueAll({ reason: command === "rebuild" ? "DASHBOARD_TASK_REBUILD" : "DASHBOARD_TASK_BACKFILL", generationId, runId });
  if (enqueued.truncated) throw new Error("Backfill page limit reached; explicit pagination is required before productive use");
  const processed = await drain(worker); const users = await activateGeneration(db, generationId); const health = await operations.health();
  console.log(JSON.stringify({ command, generationId, groups: enqueued.inspected, processed, users, health }, null, 2));
}

if (require.main === module) main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });

module.exports = { activateGeneration, assertGenerationComplete, drain, repairLegacyGroup, rollback };
