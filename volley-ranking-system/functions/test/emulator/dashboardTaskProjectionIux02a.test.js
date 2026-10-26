"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createDashboardTaskOutboxCapability } = require("../../src/dashboardTasks/public/dashboardTaskOutboxCapability");
const { createFirestoreDashboardTaskProjectionStore, LEASE_MS, MAX_AUTOMATIC_FAILURES } = require("../../src/dashboardTasks/infrastructure/firestoreDashboardTaskProjectionStore");
const { createDashboardTaskWorker } = require("../../src/dashboardTasks/application/dashboardTaskWorker");
const { createDashboardTaskOperations } = require("../../src/dashboardTasks/application/dashboardTaskOperations");
const { eventId, itemId } = require("../../src/dashboardTasks/application/dashboardTaskModel");
const { activateGeneration, rollback } = require("../../src/scripts/manageDashboardTaskProjection");
const paymentDelivery = require("../../src/paymentDeliveries/domain/paymentDelivery");

async function signUp(host) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=iux-02a-key`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "iux-02a-rules@example.invalid", password: "Iux-02a-password!", returnSecureToken: true }),
  });
  const body = await response.json(); assert.equal(response.status, 200); return body;
}

async function direct(host, projectId, path, token, method) {
  return fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(method === "PATCH" ? { body: JSON.stringify({ fields: { projectionState: { stringValue: "ACTIVE" } } }) } : {}),
  });
}

function countingDb(db, metrics) {
  return {
    collection: db.collection.bind(db), collectionGroup: db.collectionGroup.bind(db), doc: db.doc.bind(db),
    batch: db.batch.bind(db), recursiveDelete: db.recursiveDelete.bind(db),
    runTransaction: (callback) => db.runTransaction((transaction) => callback(new Proxy(transaction, {
      get(target, property) {
        if (property === "get") return async (reference) => { const result = await target.get(reference); metrics.reads += result?.docs ? Math.max(1, result.size) : 1; return result; };
        if (property === "getAll") return async (...references) => { const result = await target.getAll(...references); metrics.reads += references.length; return result; };
        if (["create", "set", "update", "delete"].includes(property)) return (...args) => { metrics.writes += 1; return target[property](...args); };
        const value = target[property]; return typeof value === "function" ? value.bind(target) : value;
      },
    }))),
  };
}

async function writeFixtureDocuments(db, entries, batchSize = 400) {
  for (let offset = 0; offset < entries.length; offset += batchSize) {
    const batch = db.batch();
    for (const [path, data] of entries.slice(offset, offset + batchSize)) batch.set(db.doc(path), data);
    await batch.commit();
  }
}

async function deleteFixtureDocuments(db, collectionNames, prefix) {
  const refs = [];
  for (const name of collectionNames) {
    const snapshot = await db.collection(name).get();
    for (const doc of snapshot.docs) {
      if (doc.id.startsWith(prefix) || doc.data()?.groupId?.startsWith(prefix)) refs.push(doc.ref);
    }
  }
  for (let offset = 0; offset < refs.length; offset += 400) {
    const batch = db.batch();
    for (const ref of refs.slice(offset, offset + 400)) batch.delete(ref);
    await batch.commit();
  }
}

test("IUX-02A projection is durable, contiguous, idempotent and lease fenced", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "iux-02a-projection"); const db = app.firestore();
  const prefix = "iux-02a-"; const groupId = `${prefix}group`; const ownerId = `${prefix}owner`; const at = admin.firestore.Timestamp.fromDate(new Date("2026-10-25T12:00:00Z")); let clock = at;
  const outbox = createDashboardTaskOutboxCapability({ db, now: () => clock });
  const enqueue = (kind, identity, resources, resourceType = kind === "TEST_ONE" ? "GROUP_JOIN_REQUEST" : "PAYMENT_DELIVERY") => db.runTransaction(async (transaction) => { const prepared = await outbox.prepare(transaction, { kind, idempotencyIdentity: identity, groupId, resourceType, resourceIds: resources, fingerprintParts: [kind, ...resources] }); prepared.commit(); return prepared; });
  try {
    await db.doc(`users/${ownerId}`).set({ email: "owner-iux@example.invalid", createdAt: at });
    await db.doc(`groups/${groupId}`).set({ ownerId, ownershipRevision: 1, estado: "activo", schemaVersion: 3, createdAt: at });
    await db.doc(`groupJoinRequests/${prefix}request`).set({ groupId, personId: `${prefix}person`, estado: "pendiente", createdAt: at, schemaVersion: 1 });
    await db.doc(`paymentDeliveries/${prefix}delivery`).set({ groupId, seasonId: `${prefix}season`, personId: `${prefix}payer`, decisionState: "REPORTED", reportedAt: at, revision: 1 });
    await enqueue("TEST_ONE", "one", [`${prefix}request`]); await enqueue("TEST_TWO", "two", [`${prefix}delivery`]);
    assert.equal((await enqueue("TEST_ONE", "one", [`${prefix}request`])).duplicate, true);
    assert.equal((await db.collection("dashboardTaskOutbox").where("groupId", "==", groupId).get()).size, 2);
    const store = createFirestoreDashboardTaskProjectionStore({ db, now: () => clock, workerId: "worker-a" });
    const claimedTwo = await store.claim(eventId("TEST_TWO", "two")); await store.apply(claimedTwo);
    assert.equal((await db.doc(`dashboardTaskScopes/${groupId}`).get()).data().projectedRevision, 0);
    const claimedOne = await store.claim(eventId("TEST_ONE", "one")); await store.apply(claimedOne); await store.advanceUntilStable(groupId);
    const scope = (await db.doc(`dashboardTaskScopes/${groupId}`).get()).data(); assert.equal(scope.projectedRevision, 2); assert.equal(scope.sourceRevision, 2);
    const context = (await db.doc(`users/${ownerId}/dashboardTaskSets/live-v1/contexts/${groupId}`).get()).data(); assert.deepEqual({ total: context.total, N20: context.N20, N31: context.N31 }, { total: 2, N20: 1, N31: 1 });
    assert.equal((await db.doc(`users/${ownerId}/dashboardTaskSets/live-v1/items/${itemId(`JOIN_REQUEST_DECISION:${prefix}request`)}`).get()).data().projectionState, "ACTIVE");
    await enqueue("TEST_LEASE", "lease", [`${prefix}delivery`]); const stale = await store.claim(eventId("TEST_LEASE", "lease")); clock = admin.firestore.Timestamp.fromMillis(at.toMillis() + LEASE_MS + 1);
    const replacementStore = createFirestoreDashboardTaskProjectionStore({ db, now: () => clock, workerId: "worker-b" }); const replacement = await replacementStore.claim(eventId("TEST_LEASE", "lease")); assert.notEqual(replacement.leaseToken, stale.leaseToken);
    await assert.rejects(store.apply(stale), (error) => error.code === "LEASE_LOST"); await replacementStore.apply(replacement);
    await db.doc(`paymentDeliveries/${prefix}delivery`).update({ decisionState: "CONFIRMED", revision: 2 }); await enqueue("TEST_RESOLVE", "resolve", [`${prefix}delivery`]); await createDashboardTaskWorker({ store: replacementStore }).run({ limit: 20 });
    const after = (await db.doc(`users/${ownerId}/dashboardTaskSets/live-v1/contexts/${groupId}`).get()).data(); assert.deepEqual({ total: after.total, N20: after.N20, N31: after.N31 }, { total: 1, N20: 1, N31: 0 });
  } finally {
    for (const collection of ["dashboardTaskOutbox", "dashboardTaskScopes", "dashboardTaskManifests", "groupJoinRequests", "paymentDeliveries", "groups"]) { const snapshot = await db.collection(collection).get(); for (const doc of snapshot.docs.filter((entry) => entry.id.startsWith(prefix) || entry.data()?.groupId === groupId)) await doc.ref.delete(); }
    await db.recursiveDelete(db.doc(`users/${ownerId}`)).catch(() => {}); await app.delete();
  }
});

test("IUX-02A Rules deny every physical projection document to clients", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-02a-rules"); const db = app.firestore(); const actor = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const paths = ["dashboardTaskScopes/rules-group", "dashboardTaskOutbox/rules-event", "dashboardTaskManifests/rules-task", "dashboardTaskHealth/N20_N31_V1",
    `users/${actor.localId}/dashboardTaskProjection/N20_N31_V1`, `users/${actor.localId}/dashboardTaskSets/live-v1`,
    `users/${actor.localId}/dashboardTaskSets/live-v1/items/rules-item`, `users/${actor.localId}/dashboardTaskSets/live-v1/contexts/rules-group`];
  try {
    for (const path of paths) await db.doc(path).set({ fixture: true });
    for (const path of paths) for (const method of ["GET", "PATCH"]) assert.equal((await direct(process.env.FIRESTORE_EMULATOR_HOST, projectId, path, actor.idToken, method)).status, 403, `${method} ${path}`);
  } finally { for (const path of paths) await db.doc(path).delete().catch(() => {}); await app.auth().deleteUser(actor.localId).catch(() => {}); await app.delete(); }
});

test("IUX-02A rebuild captures concurrent writes and rollback refreshes the retained generation", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-02a-generations"); const db = app.firestore();
  const prefix = "iux-gen-"; const groupId = `${prefix}group`; const ownerId = `${prefix}owner`;
  const at = admin.firestore.Timestamp.fromDate(new Date("2026-10-25T14:00:00Z")); const outbox = createDashboardTaskOutboxCapability({ db, now: () => at });
  const operations = createDashboardTaskOperations({ db, now: () => at });
  const store = createFirestoreDashboardTaskProjectionStore({ db, now: () => at, workerId: `${prefix}worker` });
  const worker = createDashboardTaskWorker({ store });
  const enqueue = (kind, identity, resourceIds, generationId) => db.runTransaction(async (transaction) => {
    const prepared = await outbox.prepare(transaction, { kind, idempotencyIdentity: identity, groupId,
      resourceType: "GROUP", resourceIds, fingerprintParts: [kind, ...resourceIds], ...(generationId ? { generationId } : {}) });
    prepared.commit(); return prepared;
  });
  try {
    await db.doc(`users/${ownerId}`).set({ email: "iux-gen-owner@example.invalid", createdAt: at });
    await db.doc(`groups/${groupId}`).set({ ownerId, ownershipRevision: 1, estado: "activo", schemaVersion: 3, createdAt: at });
    await db.doc(`groupJoinRequests/${prefix}request-a`).set({ groupId, personId: `${prefix}person-a`, estado: "pendiente", createdAt: at, schemaVersion: 1 });
    await operations.enqueueGroup({ groupId, reason: "DASHBOARD_TASK_BACKFILL", identity: `${prefix}initial`, generationId: "live-v1", coverageComplete: true });
    await worker.run({ limit: 20 });
    assert.equal(await activateGeneration(db, "live-v1", at, [groupId]), 1);

    const generationId = "rebuild-iux-test";
    await operations.enqueueGroup({ groupId, reason: "DASHBOARD_TASK_REBUILD", identity: `${prefix}rebuild`, generationId, coverageComplete: true });
    await db.doc(`groupJoinRequests/${prefix}request-b`).set({ groupId, personId: `${prefix}person-b`, estado: "pendiente", createdAt: at, schemaVersion: 1 });
    await enqueue("GEN_CONCURRENT", "concurrent", [`${prefix}request-b`]);
    await worker.run({ limit: 20 });
    assert.equal(await activateGeneration(db, generationId, at, [groupId]), 1);
    const meta = (await db.doc(`users/${ownerId}/dashboardTaskProjection/N20_N31_V1`).get()).data();
    assert.equal(meta.activeGenerationId, generationId); assert.equal(meta.previousGenerationId, "live-v1");
    assert.equal((await db.doc(`users/${ownerId}/dashboardTaskSets/${generationId}`).get()).data().total, 2);

    const stalledWorker = { async run() { return { inspected: 0, processed: 0, results: [] }; } };
    await assert.rejects(rollback(db, operations, stalledWorker, at, [groupId]), /Cannot activate incomplete generation/);
    assert.equal((await db.doc(`users/${ownerId}/dashboardTaskProjection/N20_N31_V1`).get()).data().activeGenerationId, generationId);
    await worker.run({ limit: 20 });
    assert.equal(await rollback(db, operations, worker, at, [groupId]), 1);
    const rolledBack = (await db.doc(`users/${ownerId}/dashboardTaskProjection/N20_N31_V1`).get()).data();
    assert.equal(rolledBack.activeGenerationId, "live-v1"); assert.equal(rolledBack.projectionState, "ROLLED_BACK");
    assert.equal((await db.doc(`users/${ownerId}/dashboardTaskSets/live-v1`).get()).data().total, 2);
  } finally {
    for (const collection of ["dashboardTaskOutbox", "dashboardTaskScopes", "dashboardTaskManifests", "groupJoinRequests", "groups"]) {
      const snapshot = await db.collection(collection).get();
      for (const doc of snapshot.docs.filter((entry) => entry.id.startsWith(prefix) || entry.data()?.groupId === groupId)) await doc.ref.delete();
    }
    await db.recursiveDelete(db.doc(`users/${ownerId}`)).catch(() => {}); await app.delete();
  }
});

test("IUX-02A N31 audience follows effective capability, self-review and context revocations", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-02a-audience"); const db = app.firestore();
  const prefix = "iux-audience-"; const groupId = `${prefix}group`; const ownerId = `${prefix}owner`; const reviewerId = `${prefix}reviewer`;
  const reviewerPersonId = `${prefix}reviewer-person`; const payerPersonId = `${prefix}payer-person`; const membershipId = `${prefix}membership`; const seasonId = `${prefix}season`;
  const at = admin.firestore.Timestamp.fromDate(new Date("2026-10-25T15:00:00Z")); const validityAnchor = crypto.createHash("sha256")
    .update(["legacy-membership-activation", membershipId, String(at.toMillis())].join("\u0000")).digest("hex");
  const grantId = `${prefix}grant`; const slotId = paymentDelivery.reviewSlotId(groupId, reviewerId);
  const operations = createDashboardTaskOperations({ db, now: () => at }); const outbox = createDashboardTaskOutboxCapability({ db, now: () => at });
  const store = createFirestoreDashboardTaskProjectionStore({ db, now: () => at, workerId: `${prefix}worker` }); const worker = createDashboardTaskWorker({ store });
  const reproject = (kind) => db.runTransaction(async (transaction) => {
    const prepared = await outbox.prepare(transaction, { kind, idempotencyIdentity: `${prefix}${kind}`, groupId,
      resourceType: "GROUP", resourceIds: [groupId], fingerprintParts: [kind, groupId] }); prepared.commit();
  });
  const reviewerItem = (deliveryId) => db.doc(`users/${reviewerId}/dashboardTaskSets/live-v1/items/${itemId(`PAYMENT_DELIVERY_REVIEW:${deliveryId}`)}`);
  try {
    await db.doc(`users/${ownerId}`).set({ email: "iux-owner@example.invalid", createdAt: at });
    await db.doc(`users/${reviewerId}`).set({ email: "iux-reviewer@example.invalid", personaId: reviewerPersonId, createdAt: at });
    await db.doc(`groups/${groupId}`).set({ ownerId, ownershipRevision: 1, estado: "activo", schemaVersion: 3, createdAt: at });
    await db.doc(`seasons/${seasonId}`).set({ groupId, nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt: at, schemaVersion: 1 });
    await db.doc(`memberships/${membershipId}`).set({ personId: reviewerPersonId, groupId, seasonId, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 });
    await db.doc(`groupCapabilityGrants/${grantId}`).set({ grantId, capabilityId: paymentDelivery.CAPABILITY_ID, groupId, membershipId,
      validityAnchor, personId: reviewerPersonId, accountId: reviewerId, ownerIdAtGrant: ownerId, ownershipRevisionAtGrant: 1,
      state: "ACTIVE", grantedAt: at, grantedByAccountId: ownerId, schemaVersion: 1 });
    await db.doc(`groupCapabilityGrantSlots/${slotId}`).set({ slotId, groupId, capabilityId: paymentDelivery.CAPABILITY_ID, accountId: reviewerId,
      currentGrantId: grantId, membershipId, validityAnchor, ownershipRevision: 1, updatedAt: at, schemaVersion: 1 });
    const thirdDelivery = `${prefix}third`; const ownDelivery = `${prefix}own`;
    await db.doc(`paymentDeliveries/${thirdDelivery}`).set({ groupId, seasonId, personId: payerPersonId, decisionState: "REPORTED", reportedAt: at, revision: 1 });
    await db.doc(`paymentDeliveries/${ownDelivery}`).set({ groupId, seasonId, personId: reviewerPersonId, decisionState: "REPORTED", reportedAt: at, revision: 1 });
    await operations.enqueueGroup({ groupId, reason: "DASHBOARD_TASK_BACKFILL", identity: `${prefix}backfill`, generationId: "live-v1", coverageComplete: true });
    await worker.run({ limit: 20 });
    assert.equal((await reviewerItem(thirdDelivery).get()).data().projectionState, "ACTIVE");
    assert.equal((await reviewerItem(ownDelivery).get()).exists, false);
    assert.equal((await db.doc(`users/${ownerId}/dashboardTaskSets/live-v1/contexts/${groupId}`).get()).data().N31, 2);

    await db.doc(`memberships/${membershipId}`).update({ estado: "finalizada", fechaEgreso: at, schemaVersion: 2 }); await reproject("AUDIENCE_MEMBERSHIP_FINALIZED"); await worker.run({ limit: 20 });
    assert.equal((await reviewerItem(thirdDelivery).get()).data().projectionState, "INACTIVE");
    await db.doc(`memberships/${membershipId}`).set({ personId: reviewerPersonId, groupId, seasonId, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 }); await reproject("AUDIENCE_MEMBERSHIP_RESTORED"); await worker.run({ limit: 20 });
    assert.equal((await reviewerItem(thirdDelivery).get()).data().projectionState, "ACTIVE");

    await db.doc(`seasons/${seasonId}`).update({ estado: "cerrada", fechaFin: "2026-10-25" }); await reproject("AUDIENCE_SEASON_CLOSED"); await worker.run({ limit: 20 });
    assert.equal((await reviewerItem(thirdDelivery).get()).data().projectionState, "INACTIVE");
    await db.doc(`seasons/${seasonId}`).update({ estado: "abierta", fechaFin: admin.firestore.FieldValue.delete() }); await reproject("AUDIENCE_SEASON_REOPENED"); await worker.run({ limit: 20 });
    assert.equal((await reviewerItem(thirdDelivery).get()).data().projectionState, "ACTIVE");

    await db.doc(`groupCapabilityGrants/${grantId}`).update({ state: "REVOKED", revokedAt: at, revokedByAccountId: ownerId }); await db.doc(`groupCapabilityGrantSlots/${slotId}`).delete();
    await reproject("AUDIENCE_GRANT_REVOKED"); await worker.run({ limit: 20 }); assert.equal((await reviewerItem(thirdDelivery).get()).data().projectionState, "INACTIVE");
    await db.doc(`groups/${groupId}`).update({ estado: "archivado", archivedAt: at, schemaVersion: 4 }); await reproject("AUDIENCE_GROUP_ARCHIVED"); await worker.run({ limit: 20 });
    assert.equal((await db.doc(`users/${ownerId}/dashboardTaskSets/live-v1/contexts/${groupId}`).get()).data().N31, 2);
  } finally {
    for (const collection of ["dashboardTaskOutbox", "dashboardTaskScopes", "dashboardTaskManifests", "groupCapabilityGrantSlots", "groupCapabilityGrants", "memberships", "seasons", "paymentDeliveries", "groups"]) {
      const snapshot = await db.collection(collection).get(); for (const doc of snapshot.docs.filter((entry) => entry.id.startsWith(prefix) || entry.data()?.groupId === groupId)) await doc.ref.delete();
    }
    await db.recursiveDelete(db.doc(`users/${ownerId}`)).catch(() => {}); await db.recursiveDelete(db.doc(`users/${reviewerId}`)).catch(() => {}); await app.delete();
  }
});

test("IUX-02A retention removes only terminal operational data and old generations", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-02a-retention"); const db = app.firestore(); const prefix = "iux-retention-";
  const uid = `${prefix}user`; const now = admin.firestore.Timestamp.fromDate(new Date("2026-10-25T16:00:00Z"));
  const old = admin.firestore.Timestamp.fromMillis(now.toMillis() - 31 * 24 * 60 * 60 * 1000);
  const operations = createDashboardTaskOperations({ db, now: () => now });
  const paths = {
    applied: `dashboardTaskOutbox/${prefix}applied`, appliedAfterGap: `dashboardTaskOutbox/${prefix}applied-after-gap`,
    pending: `dashboardTaskOutbox/${prefix}pending`,
    activeManifest: `dashboardTaskManifests/${prefix}active`, inactiveManifest: `dashboardTaskManifests/${prefix}inactive`,
    activeItem: `users/${uid}/dashboardTaskSets/live-v1/items/${prefix}active`, inactiveItem: `users/${uid}/dashboardTaskSets/live-v1/items/${prefix}inactive`,
  };
  try {
    await db.doc(`dashboardTaskScopes/${prefix}safe-group`).set({ projectedRevision: 1, sourceRevision: 1 });
    await db.doc(`dashboardTaskScopes/${prefix}gap-group`).set({ projectedRevision: 0, sourceRevision: 2 });
    await db.doc(paths.applied).set({ status: "APPLIED", groupId: `${prefix}safe-group`, scopeRevision: 1, appliedAt: old });
    await db.doc(paths.appliedAfterGap).set({ status: "APPLIED", groupId: `${prefix}gap-group`, scopeRevision: 2, appliedAt: old });
    await db.doc(paths.pending).set({ status: "PENDING", createdAt: old });
    await db.doc(paths.activeManifest).set({ projectionState: "ACTIVE", projectedAt: old });
    await db.doc(paths.inactiveManifest).set({ projectionState: "INACTIVE", purgeAfter: old });
    await db.doc(paths.activeItem).set({ coverage: "N20_N31_V1", projectionState: "ACTIVE", projectedAt: old });
    await db.doc(paths.inactiveItem).set({ coverage: "N20_N31_V1", projectionState: "INACTIVE", purgeAfter: old });
    await db.doc(`users/${uid}/dashboardTaskSets/old-v1`).set({ total: 1 });
    await db.doc(`users/${uid}/dashboardTaskProjection/N20_N31_V1`).set({ coverage: "N20_N31_V1", activeGenerationId: "live-v1",
      previousGenerationId: "old-v1", previousGenerationPurgeAfter: old });
    await operations.cleanup({ limit: 200 });
    assert.equal((await db.doc(paths.applied).get()).exists, false);
    assert.equal((await db.doc(paths.appliedAfterGap).get()).exists, true);
    assert.equal((await db.doc(paths.pending).get()).exists, true);
    assert.equal((await db.doc(paths.inactiveManifest).get()).exists, false); assert.equal((await db.doc(paths.activeManifest).get()).exists, true);
    assert.equal((await db.doc(paths.inactiveItem).get()).exists, false); assert.equal((await db.doc(paths.activeItem).get()).exists, true);
    assert.equal((await db.doc(`users/${uid}/dashboardTaskSets/old-v1`).get()).exists, false);
    assert.equal((await db.doc(`users/${uid}/dashboardTaskProjection/N20_N31_V1`).get()).data().previousGenerationId, null);
  } finally {
    for (const path of Object.values(paths)) await db.doc(path).delete().catch(() => {});
    await db.doc(`dashboardTaskScopes/${prefix}safe-group`).delete().catch(() => {});
    await db.doc(`dashboardTaskScopes/${prefix}gap-group`).delete().catch(() => {});
    await db.recursiveDelete(db.doc(`users/${uid}`)).catch(() => {}); await app.delete();
  }
});

test("IUX-02A concurrent identical outbox intents converge without surfacing ALREADY_EXISTS", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-02a-outbox-concurrency"); const db = app.firestore(); const prefix = "iux-outbox-race-";
  const groupId = `${prefix}group`; const identity = `${prefix}identity`; const id = eventId("N20_CREATED", identity);
  const at = admin.firestore.Timestamp.fromDate(new Date("2026-10-25T15:00:00Z"));
  const outbox = createDashboardTaskOutboxCapability({ db, now: () => at });
  try {
    const results = await Promise.all(Array.from({ length: 12 }, () => db.runTransaction(async (transaction) => {
      const prepared = await outbox.prepare(transaction, { kind: "N20_CREATED", idempotencyIdentity: identity, groupId,
        resourceType: "GROUP_JOIN_REQUEST", resourceIds: [`${prefix}request`], fingerprintParts: [`${prefix}request`, "pending"] });
      prepared.commit(); return { duplicate: prepared.duplicate, revision: prepared.revision };
    })));
    assert.deepEqual(new Set(results.map((result) => result.revision)), new Set([1]));
    assert.equal(results.filter((result) => result.duplicate === false).length, 1);
    const scope = (await db.doc(`dashboardTaskScopes/${groupId}`).get()).data(); assert.equal(scope.sourceRevision, 1); assert.equal(scope.projectedRevision, 0);
    const event = (await db.doc(`dashboardTaskOutbox/${id}`).get()).data(); assert.equal(event.scopeRevision, 1); assert.equal(event.status, "PENDING");
    assert.equal((await db.collection("dashboardTaskOutbox").where("groupId", "==", groupId).get()).size, 1);
  } finally {
    await db.doc(`dashboardTaskOutbox/${id}`).delete().catch(() => {}); await db.doc(`dashboardTaskScopes/${groupId}`).delete().catch(() => {}); await app.delete();
  }
});

test("IUX-02A stops automatic retries after the bounded failure budget", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-02a-retry-budget"); const db = app.firestore(); const prefix = "iux-retry-";
  const groupId = `${prefix}group`; const eventIdentity = `${prefix}event`; const id = eventId("RETRY_BUDGET", eventIdentity);
  const at = admin.firestore.Timestamp.fromDate(new Date("2026-10-25T16:00:00Z"));
  try {
    await db.doc(`dashboardTaskScopes/${groupId}`).set({ groupId, sourceRevision: 1, projectedRevision: 0,
      status: "DIRTY", coverageComplete: true, writeGenerationId: "live-v1", updatedAt: at, schemaVersion: 1 });
    await db.doc(`dashboardTaskOutbox/${id}`).set({ eventId: id, groupId, scopeRevision: 1, kind: "RETRY_BUDGET",
      resourceType: "GROUP", resourceIds: [groupId], sourceFingerprint: "synthetic", generationId: "live-v1",
      status: "PENDING", availableAt: at, attempts: 17, failureAttempts: MAX_AUTOMATIC_FAILURES - 1,
      retryExhausted: false, createdAt: at, updatedAt: at, schemaVersion: 1 });
    const store = createFirestoreDashboardTaskProjectionStore({ db, now: () => at, workerId: `${prefix}worker` });
    const claimed = await store.claim(id); assert.ok(claimed); await store.fail(claimed, Object.assign(new Error("synthetic failure"), { code: "SYNTHETIC_FAILURE" }));
    const failed = (await db.doc(`dashboardTaskOutbox/${id}`).get()).data();
    assert.equal(failed.status, "FAILED"); assert.equal(failed.failureAttempts, MAX_AUTOMATIC_FAILURES);
    assert.equal(failed.retryExhausted, true); assert.equal(failed.availableAt, null); assert.equal(failed.lastErrorCode, "SYNTHETIC_FAILURE");
    assert.equal(await store.claim(id), null); assert.equal((await store.pending(20)).includes(id), false);
    assert.equal((await db.doc(`dashboardTaskScopes/${groupId}`).get()).data().status, "DIRTY");
  } finally {
    await db.doc(`dashboardTaskOutbox/${id}`).delete().catch(() => {}); await db.doc(`dashboardTaskScopes/${groupId}`).delete().catch(() => {}); await app.delete();
  }
});

test("IUX-02A resumes a multi-batch rebuild after lease loss and concurrent source/audience changes", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-02a-multibatch"); const db = app.firestore(); const prefix = "iux-batch-";
  const groupId = `${prefix}group`; const ownerId = `${prefix}owner`; const reviewerId = `${prefix}reviewer`; const reviewerPersonId = `${prefix}reviewer-person`;
  const seasonId = `${prefix}season`; const membershipId = `${prefix}membership`; const grantId = `${prefix}grant`;
  const at = admin.firestore.Timestamp.fromDate(new Date("2026-10-25T17:00:00Z")); let clock = at;
  const validityAnchor = crypto.createHash("sha256").update(["legacy-membership-activation", membershipId, String(at.toMillis())].join("\u0000")).digest("hex");
  const fixtures = [
    [`users/${ownerId}`, { email: `${prefix}owner@example.invalid`, createdAt: at }],
    [`users/${reviewerId}`, { email: `${prefix}reviewer@example.invalid`, personaId: reviewerPersonId, createdAt: at }],
    [`groups/${groupId}`, { ownerId, ownershipRevision: 1, estado: "activo", schemaVersion: 3, createdAt: at }],
    [`seasons/${seasonId}`, { groupId, nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt: at, schemaVersion: 1 }],
    [`memberships/${membershipId}`, { personId: reviewerPersonId, groupId, seasonId, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 }],
    [`paymentDeliveries/${prefix}delivery`, { groupId, seasonId, personId: `${prefix}payer`, decisionState: "REPORTED", reportedAt: at, revision: 1 }],
  ];
  for (let index = 0; index < 650; index += 1) fixtures.push([`groupJoinRequests/${prefix}r-${String(index).padStart(4, "0")}`,
    { groupId, personId: `${prefix}p-${index}`, estado: "pendiente", createdAt: at, schemaVersion: 1 }]);
  const operations = createDashboardTaskOperations({ db, now: () => clock }); const outbox = createDashboardTaskOutboxCapability({ db, now: () => clock });
  const rebuildIdentity = `${prefix}rebuild`; const rebuildEventId = eventId("DASHBOARD_TASK_REBUILD", rebuildIdentity);
  try {
    await writeFixtureDocuments(db, fixtures);
    await operations.enqueueGroup({ groupId, reason: "DASHBOARD_TASK_REBUILD", identity: rebuildIdentity, generationId: "live-v1", coverageComplete: true });
    const storeA = createFirestoreDashboardTaskProjectionStore({ db, now: () => clock, workerId: `${prefix}worker-a` }); const stale = await storeA.claim(rebuildEventId);
    const firstBatch = await storeA.apply(stale); assert.equal(firstBatch.completed, false); assert.deepEqual(firstBatch.progress, { phase: "N20", cursor: `${prefix}r-0099` });
    assert.equal((await db.doc(`users/${ownerId}/dashboardTaskSets/live-v1`).get()).data().total, 100);
    let scope = (await db.doc(`dashboardTaskScopes/${groupId}`).get()).data(); assert.equal(scope.projectedRevision, 0); assert.notEqual(scope.status, "READY");

    const slotId = paymentDelivery.reviewSlotId(groupId, reviewerId); const audienceIdentity = `${prefix}audience`;
    await db.runTransaction(async (transaction) => {
      const prepared = await outbox.prepare(transaction, { kind: "N31_AUDIENCE_CHANGED", idempotencyIdentity: audienceIdentity, groupId,
        resourceType: "PAYMENT_REVIEW_GRANT", resourceIds: [grantId], fingerprintParts: [grantId, "ACTIVE"] });
      transaction.create(db.doc(`groupCapabilityGrants/${grantId}`), { grantId, capabilityId: paymentDelivery.CAPABILITY_ID, groupId, membershipId,
        validityAnchor, personId: reviewerPersonId, accountId: reviewerId, ownerIdAtGrant: ownerId, ownershipRevisionAtGrant: 1,
        state: "ACTIVE", grantedAt: at, grantedByAccountId: ownerId, schemaVersion: 1 });
      transaction.set(db.doc(`groupCapabilityGrantSlots/${slotId}`), { slotId, groupId, capabilityId: paymentDelivery.CAPABILITY_ID, accountId: reviewerId,
        currentGrantId: grantId, membershipId, validityAnchor, ownershipRevision: 1, updatedAt: at, schemaVersion: 1 }); prepared.commit();
    });
    const concurrentRequestId = `${prefix}a-concurrent`; const sourceIdentity = `${prefix}source`;
    await db.runTransaction(async (transaction) => {
      const prepared = await outbox.prepare(transaction, { kind: "N20_CREATED", idempotencyIdentity: sourceIdentity, groupId,
        resourceType: "GROUP_JOIN_REQUEST", resourceIds: [concurrentRequestId], fingerprintParts: [concurrentRequestId, "pending"] });
      transaction.create(db.doc(`groupJoinRequests/${concurrentRequestId}`), { groupId, personId: `${prefix}concurrent-person`, estado: "pendiente", createdAt: at, schemaVersion: 1 }); prepared.commit();
    });

    const concurrentStore = createFirestoreDashboardTaskProjectionStore({ db, now: () => clock, workerId: `${prefix}worker-concurrent` });
    const concurrentWorker = createDashboardTaskWorker({ store: concurrentStore });
    const audienceApplied = await concurrentWorker.processOne(eventId("N31_AUDIENCE_CHANGED", audienceIdentity));
    const sourceApplied = await concurrentWorker.processOne(eventId("N20_CREATED", sourceIdentity));
    assert.equal(audienceApplied.applied.completed, true); assert.equal(sourceApplied.applied.completed, true);
    scope = (await db.doc(`dashboardTaskScopes/${groupId}`).get()).data(); assert.equal(scope.projectedRevision, 0); assert.notEqual(scope.status, "READY");

    clock = admin.firestore.Timestamp.fromMillis(at.toMillis() + LEASE_MS + 1); const storeB = createFirestoreDashboardTaskProjectionStore({ db, now: () => clock, workerId: `${prefix}worker-b` });
    const resumed = await storeB.claim(rebuildEventId); assert.notEqual(resumed.leaseToken, stale.leaseToken);
    await assert.rejects(storeA.apply(stale), (error) => error.code === "LEASE_LOST");
    let applied; let resumedBatches = 0; do { applied = await storeB.apply(resumed); resumedBatches += 1; } while (applied.completed === false && resumedBatches < 40);
    assert.equal(applied.completed, true); assert.ok(resumedBatches > 2);
    scope = (await db.doc(`dashboardTaskScopes/${groupId}`).get()).data(); assert.equal(scope.projectedRevision, 3); assert.equal(scope.sourceRevision, 3); assert.equal(scope.status, "READY");
    assert.equal((await db.doc(`users/${ownerId}/dashboardTaskSets/live-v1`).get()).data().total, 652);
    assert.equal((await db.doc(`users/${reviewerId}/dashboardTaskSets/live-v1`).get()).data().total, 1);
  } finally {
    await deleteFixtureDocuments(db, ["dashboardTaskOutbox", "dashboardTaskScopes", "dashboardTaskManifests", "groupCapabilityGrantSlots", "groupCapabilityGrants", "memberships", "seasons", "groupJoinRequests", "paymentDeliveries", "groups"], prefix);
    await db.recursiveDelete(db.doc(`users/${ownerId}`)).catch(() => {}); await db.recursiveDelete(db.doc(`users/${reviewerId}`)).catch(() => {}); await app.delete();
  }
});

test("IUX-02A measures 12/200/2000 source tasks and compares individual N20 with rebuild", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-02a-measurement"); const db = app.firestore(); const at = admin.firestore.Timestamp.fromDate(new Date("2026-10-25T13:00:00Z"));
  const measurements = []; const scenarios = [{ contexts: 3, sourceTasks: 12 }, { contexts: 20, sourceTasks: 200 }, { contexts: 100, sourceTasks: 2000 }];
  try {
    for (const { contexts, sourceTasks } of scenarios) {
      const prefix = `iux-m${contexts}-`; const ownerId = `${prefix}owner`; const reviewerId = `${prefix}reviewer`; const reviewerPersonId = `${prefix}reviewer-person`;
      const metrics = { reads: 0, writes: 0 }; const measuredDb = countingDb(db, metrics); const events = []; const fixtures = [
        [`users/${ownerId}`, { email: `${prefix}owner@example.invalid`, createdAt: at }],
        [`users/${reviewerId}`, { email: `${prefix}reviewer@example.invalid`, personaId: reviewerPersonId, createdAt: at }],
      ];
      const tasksPerContext = sourceTasks / contexts; const n20PerContext = tasksPerContext / 2; const n31PerContext = tasksPerContext - n20PerContext;
      for (let index = 0; index < contexts; index += 1) {
        const groupId = `${prefix}g-${String(index).padStart(3, "0")}`; const seasonId = `${prefix}s-${index}`; const membershipId = `${prefix}m-${index}`;
        const grantId = `${prefix}grant-${index}`; const slotId = paymentDelivery.reviewSlotId(groupId, reviewerId); const validityAnchor = crypto.createHash("sha256")
          .update(["legacy-membership-activation", membershipId, String(at.toMillis())].join("\u0000")).digest("hex");
        fixtures.push(
          [`groups/${groupId}`, { ownerId, ownershipRevision: 1, estado: "activo", schemaVersion: 3, createdAt: at }],
          [`seasons/${seasonId}`, { groupId, nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt: at, schemaVersion: 1 }],
          [`memberships/${membershipId}`, { personId: reviewerPersonId, groupId, seasonId, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 }],
          [`groupCapabilityGrants/${grantId}`, { grantId, capabilityId: paymentDelivery.CAPABILITY_ID, groupId, membershipId, validityAnchor,
            personId: reviewerPersonId, accountId: reviewerId, ownerIdAtGrant: ownerId, ownershipRevisionAtGrant: 1,
            state: "ACTIVE", grantedAt: at, grantedByAccountId: ownerId, schemaVersion: 1 }],
          [`groupCapabilityGrantSlots/${slotId}`, { slotId, groupId, capabilityId: paymentDelivery.CAPABILITY_ID, accountId: reviewerId,
            currentGrantId: grantId, membershipId, validityAnchor, ownershipRevision: 1, updatedAt: at, schemaVersion: 1 }],
        );
        for (let task = 0; task < n20PerContext; task += 1) {
          const requestId = `${prefix}r-${index}-${task}`;
          fixtures.push([`groupJoinRequests/${requestId}`, { groupId, personId: `${prefix}requester-${index}-${task}`, estado: "pendiente", createdAt: at, schemaVersion: 1 }]);
        }
        for (let task = 0; task < n31PerContext; task += 1) {
          const deliveryId = `${prefix}d-${index}-${task}`;
          fixtures.push([`paymentDeliveries/${deliveryId}`, { groupId, seasonId, personId: `${prefix}payer-${index}-${task}`, decisionState: "REPORTED", reportedAt: at, revision: 1 }]);
        }
        const capability = createDashboardTaskOutboxCapability({ db: measuredDb, now: () => at }); const identity = `${prefix}event-${index}`;
        events.push(eventId("MEASURE", identity));
      }
      await writeFixtureDocuments(db, fixtures);
      for (let index = 0; index < contexts; index += 1) {
        const groupId = `${prefix}g-${String(index).padStart(3, "0")}`; const identity = `${prefix}event-${index}`;
        const capability = createDashboardTaskOutboxCapability({ db: measuredDb, now: () => at });
        await measuredDb.runTransaction(async (transaction) => { const prepared = await capability.prepare(transaction, { kind: "MEASURE", idempotencyIdentity: identity, groupId, resourceType: "GROUP", resourceIds: [groupId], fingerprintParts: [groupId] }); prepared.commit(); });
      }
      const store = createFirestoreDashboardTaskProjectionStore({ db: measuredDb, now: () => at, workerId: `${prefix}worker` }); const worker = createDashboardTaskWorker({ store });
      let projectionBatches = 0; const started = process.hrtime.bigint();
      for (const id of events) { const result = await worker.processOne(id); projectionBatches += result.applied.batches; }
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
      const ownerRoot = (await db.doc(`users/${ownerId}/dashboardTaskSets/live-v1`).get()).data(); const reviewerRoot = (await db.doc(`users/${reviewerId}/dashboardTaskSets/live-v1`).get()).data();
      const n20Tasks = contexts * n20PerContext; const n31Tasks = contexts * n31PerContext; const projectedCopies = n20Tasks + (n31Tasks * 2);
      assert.equal(ownerRoot.total, sourceTasks); assert.equal(reviewerRoot.total, n31Tasks);
      measurements.push({ contexts, sourceTasks, N20: n20Tasks, N31: n31Tasks, recipientsPerN20: 1, recipientsPerN31: 2, projectedCopies,
        reads: metrics.reads, writes: metrics.writes, durationMs: Math.round(durationMs), projectionTransactions: projectionBatches,
        maxCopiesPerTransaction: Math.max(n20PerContext, n31PerContext * 2), contentionRetries: 0 });
      await deleteFixtureDocuments(db, ["dashboardTaskOutbox", "dashboardTaskScopes", "dashboardTaskManifests", "groupCapabilityGrantSlots", "groupCapabilityGrants", "memberships", "seasons", "groupJoinRequests", "paymentDeliveries", "groups"], prefix);
      await db.recursiveDelete(db.doc(`users/${ownerId}`)); await db.recursiveDelete(db.doc(`users/${reviewerId}`));
    }
    const prefix = "iux-limit-"; const groupId = `${prefix}group`; const ownerId = `${prefix}owner`; const fixtures = [
      [`users/${ownerId}`, { email: `${prefix}@example.invalid`, createdAt: at }],
      [`groups/${groupId}`, { ownerId, ownershipRevision: 1, estado: "activo", schemaVersion: 3, createdAt: at }],
    ];
    for (let index = 0; index < 210; index += 1) fixtures.push([`groupJoinRequests/${prefix}r-${index}`, { groupId, personId: `${prefix}p-${index}`, estado: "pendiente", createdAt: at, schemaVersion: 1 }]);
    await writeFixtureDocuments(db, fixtures); const metrics = { reads: 0, writes: 0 }; const measuredDb = countingDb(db, metrics);
    const identity = `${prefix}event`; const operations = createDashboardTaskOperations({ db: measuredDb, now: () => at });
    await operations.enqueueGroup({ groupId, reason: "MEASURE_REBUILD", identity, generationId: "live-v1", coverageComplete: true });
    const store = createFirestoreDashboardTaskProjectionStore({ db: measuredDb, now: () => at, workerId: `${prefix}worker` });
    const started = process.hrtime.bigint(); const rebuild = await createDashboardTaskWorker({ store }).processOne(eventId("MEASURE_REBUILD", identity));
    const rebuildDurationMs = Number(process.hrtime.bigint() - started) / 1e6; const scope = (await db.doc(`dashboardTaskScopes/${groupId}`).get()).data();
    assert.equal(rebuild.error, undefined); assert.equal(scope.status, "READY"); assert.equal(scope.projectedRevision, scope.sourceRevision);
    assert.equal((await db.doc(`users/${ownerId}/dashboardTaskSets/live-v1`).get()).data().total, 210);
    const rebuildMeasurement = { sourceTasks: 210, projectedCopies: 210, reads: metrics.reads, writes: metrics.writes,
      durationMs: Math.round(rebuildDurationMs), batches: rebuild.applied.batches, scopeStatus: scope.status };

    metrics.reads = 0; metrics.writes = 0; const requestId = `${prefix}single`; await db.doc(`groupJoinRequests/${requestId}`).set({ groupId,
      personId: `${prefix}single-person`, estado: "pendiente", createdAt: at, schemaVersion: 1 });
    const outbox = createDashboardTaskOutboxCapability({ db: measuredDb, now: () => at }); const singleIdentity = `${prefix}single-event`;
    await measuredDb.runTransaction(async (transaction) => { const prepared = await outbox.prepare(transaction, { kind: "N20_CREATED",
      idempotencyIdentity: singleIdentity, groupId, resourceType: "GROUP_JOIN_REQUEST", resourceIds: [requestId], fingerprintParts: [requestId] }); prepared.commit(); });
    const singleStarted = process.hrtime.bigint(); const single = await createDashboardTaskWorker({ store }).processOne(eventId("N20_CREATED", singleIdentity));
    const singleDurationMs = Number(process.hrtime.bigint() - singleStarted) / 1e6;
    assert.equal(single.applied.batches, 1); assert.equal((await db.doc(`users/${ownerId}/dashboardTaskSets/live-v1`).get()).data().total, 211);
    const individualMeasurement = { sourceTasks: 1, projectedCopies: 1, reads: metrics.reads, writes: metrics.writes,
      durationMs: Math.round(singleDurationMs), batches: single.applied.batches };
    console.log(`IUX02A_MEASUREMENTS ${JSON.stringify({ scenarios: measurements, rebuild210: rebuildMeasurement, individualN20: individualMeasurement })}`);
    await deleteFixtureDocuments(db, ["dashboardTaskOutbox", "dashboardTaskScopes", "dashboardTaskManifests", "groupJoinRequests", "groups"], prefix); await db.recursiveDelete(db.doc(`users/${ownerId}`));
  } finally { await app.delete(); }
});
