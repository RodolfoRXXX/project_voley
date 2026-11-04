"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestoreDashboardTaskQuery } = require("../../src/dashboardTasks/infrastructure/firestoreDashboardTaskQuery");
const { itemId, taskId } = require("../../src/dashboardTasks/application/dashboardTaskModel");
const paymentDelivery = require("../../src/paymentDeliveries/domain/paymentDelivery");

const SECRET = "iux-02b-emulator-cursor-secret-32-characters";

async function writeAll(db, entries) {
  for (let offset = 0; offset < entries.length; offset += 400) {
    const batch = db.batch();
    for (const [path, value] of entries.slice(offset, offset + 400)) batch.set(db.doc(path), value);
    await batch.commit();
  }
}

async function cleanup(db, prefix, users = []) {
  for (const name of ["dashboardTaskScopes", "groupCapabilityGrantSlots", "groupCapabilityGrants", "memberships", "seasons", "groupJoinRequests", "paymentDeliveries", "groups"]) {
    const snapshot = await db.collection(name).get(); const refs = snapshot.docs
      .filter((doc) => doc.id.startsWith(prefix) || doc.data()?.groupId?.startsWith(prefix)).map((doc) => doc.ref);
    for (let offset = 0; offset < refs.length; offset += 400) { const batch = db.batch(); refs.slice(offset, offset + 400).forEach((ref) => batch.delete(ref)); await batch.commit(); }
  }
  for (const uid of users) await db.recursiveDelete(db.doc(`users/${uid}`)).catch(() => {});
}

function projectionFixture({ prefix, ownerId, contexts, tasks, at, generation = "live-v1" }) {
  const entries = [
    [`users/${ownerId}`, { email: `${ownerId}@example.invalid`, createdAt: at }],
    [`users/${ownerId}/dashboardTaskProjection/N20_N31_V1`, { coverage: "N20_N31_V1", activeGenerationId: generation,
      projectionState: "READY", activatedAt: at, updatedAt: at, schemaVersion: 1 }],
    [`users/${ownerId}/dashboardTaskSets/${generation}`, { generationId: generation, coverage: "N20_N31_V1",
      total: tasks.length, N20: tasks.filter((task) => task.kind === "N20").length,
      N31: tasks.filter((task) => task.kind === "N31").length, updatedAt: at, schemaVersion: 1 }],
  ];
  for (const context of contexts) {
    const ownTasks = tasks.filter((task) => task.groupId === context.groupId);
    entries.push(
      [`groups/${context.groupId}`, { nombre: context.name, deporte: "voleibol", ownerId, estado: "activo",
        ownershipRevision: 1, createdAt: at, schemaVersion: 3 }],
      [`dashboardTaskScopes/${context.groupId}`, { groupId: context.groupId, sourceRevision: 1, projectedRevision: 1,
        status: "READY", coverageComplete: true, writeGenerationId: generation, updatedAt: at, schemaVersion: 1 }],
      [`users/${ownerId}/dashboardTaskSets/${generation}/contexts/${context.groupId}`, { groupId: context.groupId,
        generationId: generation, total: ownTasks.length, N20: ownTasks.filter((task) => task.kind === "N20").length,
        N31: ownTasks.filter((task) => task.kind === "N31").length, scopeRevision: 1, updatedAt: at, schemaVersion: 1 }],
      [`seasons/${context.seasonId}`, { groupId: context.groupId, nombre: "Temporada 2026", fechaInicio: "2026-01-01",
        estado: "abierta", createdAt: at, schemaVersion: 1 }],
    );
  }
  for (const task of tasks) {
    const identity = taskId(task.kind === "N20" ? "N20" : "N31", task.resourceId);
    entries.push([`users/${ownerId}/dashboardTaskSets/${generation}/items/${itemId(identity)}`, {
      taskId: identity, taskType: task.kind, resourceId: task.resourceId, groupId: task.groupId,
      seasonId: task.kind === "N31" ? task.seasonId : null, actionableAt: task.at, coverage: "N20_N31_V1",
      generationId: generation, projectionState: "ACTIVE", scopeRevision: 1, projectedAt: at, schemaVersion: 1,
    }]);
    if (task.kind === "N20") entries.push([`groupJoinRequests/${task.resourceId}`, { groupId: task.groupId,
      personId: `${task.resourceId}-person`, estado: "pendiente", createdAt: task.at, schemaVersion: 1 }]);
    else entries.push([`paymentDeliveries/${task.resourceId}`, { groupId: task.groupId, seasonId: task.seasonId,
      personId: `${task.resourceId}-payer`, decisionState: "REPORTED", reportedAt: task.at, revision: 1 }]);
  }
  return entries;
}

function measuredDb(db, metrics) {
  return {
    collection: db.collection.bind(db), collectionGroup: db.collectionGroup.bind(db), doc: db.doc.bind(db),
    runTransaction: (callback, options) => db.runTransaction((transaction) => callback(new Proxy(transaction, {
      get(target, property) {
        if (property === "get") return async (reference) => { const result = await target.get(reference); metrics.reads += result?.docs ? Math.max(1, result.size) : 1; return result; };
        if (property === "getAll") return async (...references) => { metrics.reads += references.length; return target.getAll(...references); };
        if (["create", "set", "update", "delete"].includes(property)) return (...args) => { metrics.writes += 1; return target[property](...args); };
        const value = target[property]; return typeof value === "function" ? value.bind(target) : value;
      },
    })), options),
  };
}

test("IUX-02B lists authorized N20/N31 with exact total, stable pages, health and source revalidation", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "iux-02b-query"); const db = app.firestore();
  const prefix = "iux-02b-q-"; const ownerId = `${prefix}owner`; const otherId = `${prefix}other`;
  const noContextId = `${prefix}no-context`; const filteredOwnerId = `${prefix}filtered-owner`;
  const at = admin.firestore.Timestamp.fromDate(new Date("2026-10-26T12:00:00Z"));
  const contexts = [0, 1].map((index) => ({ groupId: `${prefix}g${index}`, seasonId: `${prefix}s${index}`, name: `Grupo ${index}` }));
  const tasks = Array.from({ length: 12 }, (_, index) => ({ kind: index % 2 ? "N31" : "N20", resourceId: `${prefix}r${String(index).padStart(2, "0")}`,
    groupId: contexts[index % 2].groupId, seasonId: contexts[index % 2].seasonId,
    at: admin.firestore.Timestamp.fromMillis(at.toMillis() - Math.floor(index / 4) * 1000) }));
  const query = createFirestoreDashboardTaskQuery({ db, cursorSecret: SECRET, projectionEnabled: true, now: () => at });
  try {
    await writeAll(db, projectionFixture({ prefix, ownerId, contexts, tasks, at }));
    assert.equal((await db.doc(`users/${ownerId}`).get()).data().personaId, undefined,
      "Owner fixture must remain without Persona");
    const overlappingSlot = paymentDelivery.reviewSlotId(contexts[0].groupId, ownerId);
    await db.doc(`groupCapabilityGrantSlots/${overlappingSlot}`).set({ slotId: overlappingSlot,
      groupId: contexts[0].groupId, capabilityId: paymentDelivery.CAPABILITY_ID, accountId: ownerId,
      currentGrantId: `${prefix}irrelevant-owner-grant`, membershipId: `${prefix}irrelevant-owner-membership`,
      validityAnchor: "owner-overlap", ownershipRevision: 1, updatedAt: at, schemaVersion: 1 });
    const first = await query.list(ownerId, { coverage: "N20_N31_V1" });
    assert.equal(first.coverage.health, "READY"); assert.equal(first.coverage.complete, true); assert.equal(first.totalTasks, 12);
    assert.deepEqual(first.groupTaskCounts, [
      { groupId: contexts[0].groupId, count: 6, N20: 6, N31: 0 },
      { groupId: contexts[1].groupId, count: 6, N20: 0, N31: 6 },
    ]);
    assert.equal(first.items.length, 10); assert.ok(first.nextCursor); assert.equal(new Set(first.items.map((item) => item.taskId)).size, 10);
    assert.ok(first.items.every((item) => item.destination.href.includes(encodeURIComponent(item.resourceId))));
    const second = await query.list(ownerId, { coverage: "N20_N31_V1", cursor: first.nextCursor });
    assert.equal(second.items.length, 2); assert.equal(second.totalTasks, 12);
    assert.equal(new Set([...first.items, ...second.items].map((item) => item.taskId)).size, 12);

    const filteredContext = { groupId: `${prefix}filtered-group`, seasonId: `${prefix}filtered-season`, name: "Grupo filtrado" };
    const filteredTasks = Array.from({ length: 12 }, (_, index) => ({ kind: index % 2 ? "N31" : "N20",
      resourceId: `${prefix}filtered-${String(index).padStart(2, "0")}`, groupId: filteredContext.groupId,
      seasonId: filteredContext.seasonId, at: admin.firestore.Timestamp.fromMillis(at.toMillis() - index) }));
    await writeAll(db, projectionFixture({ prefix, ownerId: filteredOwnerId, contexts: [filteredContext], tasks: filteredTasks, at }));
    const filteredFirst = await query.list(filteredOwnerId, { coverage: "N20_N31_V1", groupId: filteredContext.groupId });
    assert.equal(filteredFirst.totalTasks, 12); assert.equal(filteredFirst.items.length, 10); assert.ok(filteredFirst.nextCursor);
    assert.deepEqual(filteredFirst.groupTaskCounts, [{ groupId: filteredContext.groupId, count: 12, N20: 6, N31: 6 }]);
    assert.ok(filteredFirst.items.every((item) => item.group.id === filteredContext.groupId));
    const filteredSecond = await query.list(filteredOwnerId, { coverage: "N20_N31_V1",
      groupId: filteredContext.groupId, cursor: filteredFirst.nextCursor });
    assert.equal(filteredSecond.items.length, 2); assert.equal(filteredSecond.totalTasks, 12);
    await assert.rejects(query.list(filteredOwnerId, { coverage: "N20_N31_V1", cursor: filteredFirst.nextCursor }),
      (error) => error.reason === "INVALID_CURSOR");
    await assert.rejects(query.list(filteredOwnerId, { coverage: "N20_N31_V1", groupId: contexts[0].groupId }),
      (error) => error.reason === "GROUP_CONTEXT_NOT_ACCESSIBLE");

    await assert.rejects(query.list(ownerId, { coverage: "N20_N31_V1", cursor: `${first.nextCursor.slice(0, -1)}x` }), (error) => error.reason === "INVALID_CURSOR");
    const otherFixtures = projectionFixture({ prefix, ownerId: otherId, contexts: [], tasks: [], at });
    await writeAll(db, otherFixtures);
    const empty = await query.list(otherId, { coverage: "N20_N31_V1" });
    assert.equal(empty.coverage.health, "READY"); assert.equal(empty.totalTasks, 0); assert.deepEqual(empty.groupTaskCounts, []); assert.deepEqual(empty.items, []);
    await assert.rejects(query.list(otherId, { coverage: "N20_N31_V1", cursor: first.nextCursor }), (error) => error.reason === "INVALID_CURSOR");
    await db.doc(`users/${noContextId}`).set({ email: `${noContextId}@example.invalid`, createdAt: at });
    const noContext = await query.list(noContextId, { coverage: "N20_N31_V1" });
    assert.equal(noContext.coverage.health, "READY"); assert.equal(noContext.coverage.complete, true);
    assert.equal(noContext.coverage.generationId, "no-contexts-v1"); assert.equal(noContext.totalTasks, 0);
    assert.deepEqual(noContext.groupTaskCounts, []); assert.deepEqual(noContext.items, []);
    await assert.rejects(query.list(noContextId, { coverage: "N20_N31_V1", cursor: first.nextCursor }), (error) => error.reason === "INVALID_CURSOR");

    await db.doc(`dashboardTaskScopes/${contexts[0].groupId}`).update({ status: "DIRTY" });
    let state = await query.list(ownerId, { coverage: "N20_N31_V1" });
    assert.equal(state.coverage.health, "UPDATING"); assert.equal(state.totalTasks, undefined); assert.equal(state.groupTaskCounts, undefined);
    const isolated = await query.list(ownerId, { coverage: "N20_N31_V1", groupId: contexts[1].groupId });
    assert.equal(isolated.coverage.health, "READY"); assert.equal(isolated.totalTasks, 6);
    assert.deepEqual(isolated.groupTaskCounts, [{ groupId: contexts[1].groupId, count: 6, N20: 0, N31: 6 }]);
    await db.doc(`dashboardTaskScopes/${contexts[0].groupId}`).update({ status: "REBUILDING" });
    state = await query.list(ownerId, { coverage: "N20_N31_V1" }); assert.equal(state.coverage.health, "REBUILDING");
    await db.doc(`dashboardTaskScopes/${contexts[0].groupId}`).update({ status: "DEGRADED" });
    state = await query.list(ownerId, { coverage: "N20_N31_V1" }); assert.equal(state.coverage.health, "DEGRADED");
    await db.doc(`dashboardTaskScopes/${contexts[0].groupId}`).update({ status: "READY" });

    const contextRef = db.doc(`users/${ownerId}/dashboardTaskSets/live-v1/contexts/${contexts[0].groupId}`);
    const originalCount = (await contextRef.get()).data();
    await contextRef.update({ total: 0, N20: 0, N31: 0 });
    state = await query.list(ownerId, { coverage: "N20_N31_V1" });
    assert.equal(state.coverage.health, "UPDATING"); assert.equal(state.totalTasks, undefined);
    await contextRef.set(originalCount);

    const firstN20 = tasks.find((task) => task.kind === "N20");
    await db.doc(`groupJoinRequests/${firstN20.resourceId}`).update({ estado: "cancelada", cancelledAt: at });
    state = await query.list(ownerId, { coverage: "N20_N31_V1" });
    assert.equal(state.coverage.health, "UPDATING"); assert.equal(state.totalTasks, undefined);
    assert.ok(!state.items.some((item) => item.resourceId === firstN20.resourceId));

    await db.doc(`users/${ownerId}/dashboardTaskProjection/N20_N31_V1`).update({ activeGenerationId: "new-generation" });
    await db.doc(`users/${ownerId}/dashboardTaskSets/new-generation`).set({ generationId: "new-generation", coverage: "N20_N31_V1", total: 0, N20: 0, N31: 0, updatedAt: at, schemaVersion: 1 });
    await assert.rejects(query.list(ownerId, { coverage: "N20_N31_V1", cursor: first.nextCursor }), (error) => error.reason === "CURSOR_EXPIRED");

    const disabled = createFirestoreDashboardTaskQuery({ db, cursorSecret: SECRET, projectionEnabled: false });
    await assert.rejects(disabled.list(ownerId, { coverage: "N20_N31_V1" }), (error) => error.reason === "PROJECTION_DISABLED");
    await assert.rejects(query.list(`${prefix}missing`, { coverage: "N20_N31_V1" }), (error) => error.reason === "PROJECTION_NOT_READY");
  } finally { await cleanup(db, prefix, [ownerId, otherId, noContextId, filteredOwnerId]); await app.delete(); }
});

test("IUX-02B revalidates delegated N31 audience, self-review and revocation without exposing stale items", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-02b-reviewer"); const db = app.firestore();
  const prefix = "iux-02b-rv-"; const ownerId = `${prefix}owner`; const reviewerId = `${prefix}reviewer`;
  const reviewerPersonId = `${prefix}reviewer-person`; const groupId = `${prefix}group`; const seasonId = `${prefix}season`;
  const membershipId = `${prefix}membership`; const grantId = `${prefix}grant`; const generation = "live-v1";
  const at = admin.firestore.Timestamp.fromDate(new Date("2026-10-26T12:30:00Z"));
  const validityAnchor = crypto.createHash("sha256")
    .update(["legacy-membership-activation", membershipId, String(at.toMillis())].join("\u0000")).digest("hex");
  const slotId = paymentDelivery.reviewSlotId(groupId, reviewerId);
  const tasks = [
    { kind: "N31", resourceId: `${prefix}third`, groupId, seasonId, at },
    { kind: "N31", resourceId: `${prefix}own`, groupId, seasonId, at: admin.firestore.Timestamp.fromMillis(at.toMillis() - 1) },
  ];
  const query = createFirestoreDashboardTaskQuery({ db, cursorSecret: SECRET, projectionEnabled: true, now: () => at });
  try {
    await writeAll(db, projectionFixture({ prefix, ownerId: reviewerId,
      contexts: [{ groupId, seasonId, name: "Grupo delegado" }], tasks, at, generation }));
    await writeAll(db, [
      [`users/${ownerId}`, { email: `${ownerId}@example.invalid`, createdAt: at }],
      [`users/${reviewerId}`, { email: `${reviewerId}@example.invalid`, personaId: reviewerPersonId, createdAt: at }],
      [`groups/${groupId}`, { nombre: "Grupo delegado", deporte: "voleibol", ownerId, estado: "activo",
        ownershipRevision: 1, createdAt: at, schemaVersion: 3 }],
      [`memberships/${membershipId}`, { personId: reviewerPersonId, groupId, seasonId, estado: "activa",
        fechaIngreso: at, createdAt: at, schemaVersion: 1 }],
      [`groupCapabilityGrants/${grantId}`, { grantId, capabilityId: paymentDelivery.CAPABILITY_ID, groupId,
        membershipId, validityAnchor, personId: reviewerPersonId, accountId: reviewerId, ownerIdAtGrant: ownerId,
        ownershipRevisionAtGrant: 1, state: "ACTIVE", grantedAt: at, grantedByAccountId: ownerId, schemaVersion: 1 }],
      [`groupCapabilityGrantSlots/${slotId}`, { slotId, groupId, capabilityId: paymentDelivery.CAPABILITY_ID,
        accountId: reviewerId, currentGrantId: grantId, membershipId, validityAnchor, ownershipRevision: 1,
        updatedAt: at, schemaVersion: 1 }],
    ]);
    await db.doc(`paymentDeliveries/${prefix}own`).update({ personId: reviewerPersonId });

    let result = await query.list(reviewerId, { coverage: "N20_N31_V1" });
    assert.equal(result.coverage.health, "UPDATING"); assert.equal(result.totalTasks, undefined);
    assert.deepEqual(result.items.map((item) => item.resourceId), [`${prefix}third`]);

    const ownItem = itemId(taskId("N31", `${prefix}own`));
    await db.doc(`users/${reviewerId}/dashboardTaskSets/${generation}/items/${ownItem}`).delete();
    await db.doc(`users/${reviewerId}/dashboardTaskSets/${generation}`).update({ total: 1, N31: 1 });
    await db.doc(`users/${reviewerId}/dashboardTaskSets/${generation}/contexts/${groupId}`).update({ total: 1, N31: 1 });
    result = await query.list(reviewerId, { coverage: "N20_N31_V1" });
    assert.equal(result.coverage.health, "READY"); assert.equal(result.totalTasks, 1);
    assert.deepEqual(result.groupTaskCounts, [{ groupId, count: 1, N20: 0, N31: 1 }]);

    await db.doc(`groupCapabilityGrants/${grantId}`).update({ state: "REVOKED", revokedAt: at, revokedByAccountId: ownerId });
    await db.doc(`groupCapabilityGrantSlots/${slotId}`).delete();
    result = await query.list(reviewerId, { coverage: "N20_N31_V1" });
    assert.equal(result.coverage.health, "UPDATING"); assert.equal(result.totalTasks, undefined);
    assert.equal(result.groupTaskCounts, undefined);
    assert.deepEqual(result.items, []);
  } finally { await cleanup(db, prefix, [ownerId, reviewerId]); await app.delete(); }
});

test("IUX-02B reader performs zero writes and measures opening and next page at 3/20/100 contexts", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-02b-measure"); const db = app.firestore();
  const at = admin.firestore.Timestamp.fromDate(new Date("2026-10-26T13:00:00Z")); const results = [];
  try {
    for (const scenario of [{ contexts: 3, tasks: 12 }, { contexts: 20, tasks: 200 }, { contexts: 100, tasks: 2000 }]) {
      const prefix = `iux-02b-m${scenario.contexts}-`; const ownerId = `${prefix}owner`;
      const contexts = Array.from({ length: scenario.contexts }, (_, index) => ({ groupId: `${prefix}g${String(index).padStart(3, "0")}`,
        seasonId: `${prefix}s${index}`, name: `Grupo ${index}` }));
      const tasks = Array.from({ length: scenario.tasks }, (_, index) => ({ kind: index % 2 ? "N31" : "N20",
        resourceId: `${prefix}${index % 2 ? "d" : "r"}${String(index).padStart(5, "0")}`,
        groupId: contexts[index % contexts.length].groupId, seasonId: contexts[index % contexts.length].seasonId,
        at: admin.firestore.Timestamp.fromMillis(at.toMillis() - Math.floor(index / 8) * 1000) }));
      await writeAll(db, projectionFixture({ prefix, ownerId, contexts, tasks, at }));
      const metrics = { reads: 0, writes: 0 }; const query = createFirestoreDashboardTaskQuery({ db: measuredDb(db, metrics),
        cursorSecret: SECRET, projectionEnabled: true, now: () => at });
      const openingStarted = process.hrtime.bigint(); const opening = await query.list(ownerId, { coverage: "N20_N31_V1" });
      const openingMs = Number(process.hrtime.bigint() - openingStarted) / 1e6; const openingReads = metrics.reads;
      const openingPayloadBytes = Buffer.byteLength(JSON.stringify(opening));
      metrics.reads = 0; const nextStarted = process.hrtime.bigint();
      const next = await query.list(ownerId, { coverage: "N20_N31_V1", cursor: opening.nextCursor });
      const nextMs = Number(process.hrtime.bigint() - nextStarted) / 1e6;
      assert.equal(metrics.writes, 0); assert.equal(opening.totalTasks, scenario.tasks); assert.equal(next.totalTasks, scenario.tasks);
      assert.equal(opening.items.length, 10); assert.equal(next.items.length, Math.min(10, scenario.tasks - 10));
      assert.equal(new Set([...opening.items, ...next.items].map((item) => item.taskId)).size, opening.items.length + next.items.length);
      results.push({ contexts: scenario.contexts, sourceTasks: scenario.tasks, projectedCopies: scenario.tasks,
        opening: { reads: openingReads, writes: 0, durationMs: Math.round(openingMs), payloadBytes: openingPayloadBytes, revalidatedItems: 11 },
        nextPage: { reads: metrics.reads, writes: 0, durationMs: Math.round(nextMs), payloadBytes: Buffer.byteLength(JSON.stringify(next)), revalidatedItems: 11 } });
      await cleanup(db, prefix, [ownerId]);
    }
    console.log(`IUX02B_MEASUREMENTS ${JSON.stringify(results)}`);
  } finally { await app.delete(); }
});
