"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { activeMembershipGuardId, membershipLifecycleGuardId, membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");
const { groupJoinRequestDecisionIntentId, pendingGroupJoinRequestGuardId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { createFirestoreGroupJoinRequestRepository } = require("../../src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestRepository");
const { createFirestoreGroupJoinRequestStore } = require("../../src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore");
const { createGroupJoinRequestGroupCapability } = require("../../src/groups/public/groupJoinRequestGroupCapability");
const { createGroupJoinRequestSeasonCapability } = require("../../src/groups/public/groupJoinRequestSeasonCapability");
const { createGroupJoinRequestPersonCapability } = require("../../src/persons/public/groupJoinRequestPersonCapability");
const { createGroupJoinRequestMembershipCapability } = require("../../src/memberships/public/groupJoinRequestMembershipCapability");
const { createFirestoreMembershipRepository } = require("../../src/memberships/infrastructure/firestoreMembershipRepository");
const { createFirestoreMembershipLifecycleGuard } = require("../../src/memberships/infrastructure/firestoreMembershipLifecycleGuard");
const { createFirestoreGroupRepository } = require("../../src/groups/infrastructure/firestoreGroupRepository");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const value = await response.text(); return value ? JSON.parse(value) : null; }
async function signUp(host, name) {
  const email = `e2-09-${name}@example.invalid`;
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-09-synthetic-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-09-synthetic-password!", returnSecureToken: true }) });
  const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email };
}
async function invoke(host, projectId, name, data, token) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ data }) });
  return { status: response.status, body: await json(response) };
}
async function direct(host, projectId, path, token, method = "GET") {
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: method === "PATCH" ? JSON.stringify({ fields: { estado: { stringValue: "abierto" } } }) : undefined });
  return response.status;
}

test("E2-09 reactiva Membresías con historia durable y coordinación recuperable", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e2-09-membership-reactivation"); const db = app.firestore(); const auth = app.auth(); const T = admin.firestore.Timestamp;
  const fixtures = createFirestoreFixtureRegistry(db); const [owner, candidate, globalAdmin] = await Promise.all(["owner", "candidate", "admin"].map((name) => signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, name)));
  const personId = "e2-09-person"; const call = (name, data, actor = owner) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, actor?.idToken);
  const ref = (collection, id) => { const value = db.collection(collection).doc(id); fixtures.register(value); return value; };
  const periodRef = (membershipId, ordinal) => { const value = db.collection("memberships").doc(membershipId).collection("validityPeriods").doc(membershipValidityPeriodId(membershipId, ordinal)); fixtures.register(value); return value; };
  const account = (actor, linkedPerson) => ({ nombre: actor.uid, email: actor.email, photoURL: "", ...(linkedPerson ? { personaId: linkedPerson } : {}), createdAt: T.now() });
  async function setupGroup(groupId, ownerId = owner.uid) {
    const seasonId = `${groupId}-season`, at = T.now();
    await Promise.all([
      fixtures.set(db.collection("groups").doc(groupId), { nombre: `Grupo ${groupId}`, deporte: "voleibol", ownerId, estado: "activo", createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("seasons").doc(seasonId), { groupId, nombre: "Temporada E2-09", fechaInicio: "2026-09-10", estado: "abierta", createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("openSeasonGuards").doc(groupId), { seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 }),
    ]);
    return seasonId;
  }
  async function seedPending(groupId, requestId) {
    const at = T.now(), guardId = pendingGroupJoinRequestGuardId(groupId, personId);
    await Promise.all([
      fixtures.set(db.collection("groupJoinRequests").doc(requestId), { personId, groupId, estado: "pendiente", createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("pendingGroupJoinRequestGuards").doc(guardId), { requestId, personId, groupId, createdAt: at, guardVersion: 1 }),
    ]);
  }
  async function seedFinalizedV2(groupId, seasonId, membershipId, joinedAt, endedAt) {
    const lifecycleId = membershipLifecycleGuardId(groupId, personId); ref("memberships", membershipId); ref("membershipLifecycleGuards", lifecycleId); ref("activeMembershipGuards", activeMembershipGuardId(groupId, personId));
    await Promise.all([
      db.collection("memberships").doc(membershipId).set({ personId, groupId, seasonId, estado: "finalizada", fechaIngreso: joinedAt, fechaEgreso: endedAt, createdAt: joinedAt, schemaVersion: 2 }),
      db.collection("membershipLifecycleGuards").doc(lifecycleId).set({ membershipId, personId, groupId, seasonId, creationIdempotencyKeyHash: "c".repeat(64), creationRequestHash: "d".repeat(64), finalizedAt: endedAt, lifecycleGuardVersion: 1 }),
    ]);
  }
  async function finalizeAsCandidate(groupId) {
    await db.collection("groups").doc(groupId).update({ ownerId: candidate.uid });
    const result = await call("finalizeMyMembershipForOwnedGroup", { groupId }, candidate); assert.equal(result.body.result.outcome, "FINALIZED", JSON.stringify(result.body));
    await db.collection("groups").doc(groupId).update({ ownerId: owner.uid });
    return result;
  }
  function registerDecision(ownerId, key) { fixtures.register(db.collection("groupJoinRequestDecisionIntents").doc(groupJoinRequestDecisionIntentId(ownerId, key))); }

  try {
    await Promise.all([
      fixtures.set(db.collection("users").doc(owner.uid), account(owner)), fixtures.set(db.collection("users").doc(candidate.uid), account(candidate, personId)), fixtures.set(db.collection("users").doc(globalAdmin.uid), { ...account(globalAdmin), roles: "admin" }),
      fixtures.set(db.collection("personas").doc(personId), { nombre: "Ana", apellido: "Reingreso", emailContacto: candidate.email, createdAt: T.now() }),
    ]);

    await t.test("alta coordinada crea raíz v3, período 1 y resultado durable sin exponer historia", async () => {
      const groupId = "e2-09-create", seasonId = await setupGroup(groupId), requestId = "e2-09-create-request", key = "e2-09-create-key-0001"; await seedPending(groupId, requestId); registerDecision(owner.uid, key); ref("groupJoinRequestApprovalCoordinations", requestId);
      const list = await call("listPendingGroupJoinRequestsForOwnedGroup", { groupId }); assert.equal(list.body.result.items[0].approvalEffect, "CREATE_MEMBERSHIP");
      const approved = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); assert.equal(approved.body.result.outcome, "APPROVED", JSON.stringify(approved.body)); const membershipId = approved.body.result.decision.membership.id; ref("memberships", membershipId); ref("activeMembershipGuards", activeMembershipGuardId(groupId, personId)); const first = periodRef(membershipId, 1);
      const [root, period, request, intent, coordination] = await Promise.all([db.collection("memberships").doc(membershipId).get(), first.get(), db.collection("groupJoinRequests").doc(requestId).get(), db.collection("groupJoinRequestDecisionIntents").doc(groupJoinRequestDecisionIntentId(owner.uid, key)).get(), db.collection("groupJoinRequestApprovalCoordinations").doc(requestId).get()]);
      assert.deepEqual(Object.keys(root.data()).sort(), ["createdAt", "estado", "fechaIngreso", "groupId", "latestPeriodId", "periodCount", "personId", "schemaVersion", "seasonId"].sort()); assert.equal(root.data().schemaVersion, 3); assert.equal(root.data().periodCount, 1); assert.equal(root.data().latestPeriodId, first.id);
      assert.deepEqual(Object.keys(period.data()).sort(), ["estado", "ordinal", "periodSchemaVersion", "startedAt"].sort()); assert.equal(period.data().estado, "abierto"); assert.equal(period.data().startedAt.isEqual(root.data().fechaIngreso), true);
      assert.equal(request.data().schemaVersion, 3); assert.equal(request.data().seasonId, seasonId); assert.equal(request.data().approvalEffect, "CREATE_MEMBERSHIP"); assert.equal(request.data().membershipActivationOrdinal, 1); assert.equal(intent.data().intentStatus, "consumed"); assert.equal(intent.data().outcome, "APPROVED"); assert.equal(coordination.exists, false);
      assert.deepEqual(Object.keys(approved.body.result.decision.membership).sort(), ["id", "seasonId"]); assert.equal(Object.hasOwn(approved.body.result.decision.membership, "periodCount"), false);
      const retry = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); assert.equal(retry.body.result.outcome, "ALREADY_APPROVED"); assert.equal((await db.collection("memberships").doc(membershipId).collection("validityPeriods").get()).size, 1);
    });

    await t.test("v2 evoluciona por reactivación, preserva períodos y admite ciclos v3 e historia", async () => {
      const groupId = "e2-09-cycles", seasonId = await setupGroup(groupId), membershipId = "e2-09-cycles-membership", joinedAt = T.fromMillis(1000), endedAt = T.fromMillis(2000); await seedFinalizedV2(groupId, seasonId, membershipId, joinedAt, endedAt);
      const request1 = "e2-09-cycles-request-1", key1 = "e2-09-cycles-key-0001"; await seedPending(groupId, request1); registerDecision(owner.uid, key1); ref("groupJoinRequestApprovalCoordinations", request1); periodRef(membershipId, 1); periodRef(membershipId, 2);
      const list = await call("listPendingGroupJoinRequestsForOwnedGroup", { groupId }); assert.equal(list.body.result.items[0].approvalEffect, "REACTIVATE_MEMBERSHIP"); const firstApproval = await call("approveGroupJoinRequest", { groupId, requestId: request1, idempotencyKey: key1 }); assert.equal(firstApproval.body.result.outcome, "APPROVED"); assert.equal(firstApproval.body.result.decision.membership.id, membershipId);
      let root = (await db.collection("memberships").doc(membershipId).get()).data(); assert.equal(root.schemaVersion, 3); assert.equal(root.periodCount, 2); assert.equal(root.fechaIngreso.isEqual(joinedAt), true); assert.equal(Object.hasOwn(root, "fechaEgreso"), false); const p1 = (await periodRef(membershipId, 1).get()).data(), p2 = (await periodRef(membershipId, 2).get()).data(); assert.equal(p1.startedAt.isEqual(joinedAt), true); assert.equal(p1.endedAt.isEqual(endedAt), true); assert.equal(p2.estado, "abierto");
      await finalizeAsCandidate(groupId); root = (await db.collection("memberships").doc(membershipId).get()).data(); assert.equal(root.estado, "finalizada"); assert.equal((await periodRef(membershipId, 2).get()).data().estado, "cerrado");
      const historical = await call("getGroupJoinRequestDecisionResult", { groupId, requestId: request1 }); assert.equal(historical.body.result.status, "APPROVED"); assert.equal(historical.body.result.membership.id, membershipId);
      const request2 = "e2-09-cycles-request-2", key2 = "e2-09-cycles-key-0002"; await seedPending(groupId, request2); registerDecision(owner.uid, key2); ref("groupJoinRequestApprovalCoordinations", request2); periodRef(membershipId, 3); const secondApproval = await call("approveGroupJoinRequest", { groupId, requestId: request2, idempotencyKey: key2 }); assert.equal(secondApproval.body.result.outcome, "APPROVED");
      root = (await db.collection("memberships").doc(membershipId).get()).data(); assert.equal(root.periodCount, 3); assert.equal(root.latestPeriodId, membershipValidityPeriodId(membershipId, 3)); const periods = await db.collection("memberships").doc(membershipId).collection("validityPeriods").get(); assert.equal(periods.size, 3); assert.equal(periods.docs.filter((item) => item.data().estado === "abierto").length, 1);
      const retry = await call("approveGroupJoinRequest", { groupId, requestId: request2, idempotencyKey: key2 }); assert.equal(retry.body.result.outcome, "ALREADY_APPROVED"); assert.equal((await db.collection("memberships").doc(membershipId).collection("validityPeriods").get()).size, 3); await finalizeAsCandidate(groupId); assert.equal((await periodRef(membershipId, 3).get()).data().estado, "cerrado");
    });

    await t.test("Temporada sin apertura vigente consume outcome estable y el retry no reactiva", async () => {
      const groupId = "e2-09-season", seasonId = await setupGroup(groupId), membershipId = "e2-09-season-membership", requestId = "e2-09-season-request", key = "e2-09-season-key-0001", joinedAt = T.fromMillis(3000), endedAt = T.fromMillis(4000); await seedFinalizedV2(groupId, seasonId, membershipId, joinedAt, endedAt); await seedPending(groupId, requestId); registerDecision(owner.uid, key); ref("groupJoinRequestApprovalCoordinations", requestId);
      const groupCapability = createGroupJoinRequestGroupCapability({ db }), seasonCapability = createGroupJoinRequestSeasonCapability({ db }), membershipCapability = createGroupJoinRequestMembershipCapability({ db, groupCapability, seasonCapability }); const prepared = () => db.runTransaction((transaction) => membershipCapability.prepareForGroupJoinRequest({ unitOfWork: transaction, personId, groupId }));
      assert.equal((await prepared()).status, "finalized"); assert.equal((await call("listPendingGroupJoinRequestsForOwnedGroup", { groupId })).body.result.items[0].approvalEffect, "REACTIVATE_MEMBERSHIP"); await db.collection("openSeasonGuards").doc(groupId).delete(); assert.equal((await prepared()).status, "finalized");
      const first = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); assert.equal(first.body.error.details.reason, "MEMBERSHIP_SEASON_NOT_REACTIVATABLE"); const intentRef = db.collection("groupJoinRequestDecisionIntents").doc(groupJoinRequestDecisionIntentId(owner.uid, key)); assert.equal((await intentRef.get()).data().outcome, "MEMBERSHIP_SEASON_NOT_REACTIVATABLE"); assert.equal((await db.collection("groupJoinRequestApprovalCoordinations").doc(requestId).get()).exists, false);
      const retry = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); assert.equal(retry.body.error.details.reason, "MEMBERSHIP_SEASON_NOT_REACTIVATABLE"); assert.equal((await db.collection("memberships").doc(membershipId).get()).data().schemaVersion, 2); assert.equal((await db.collection("memberships").doc(membershipId).collection("validityPeriods").get()).size, 0);
    });

    await t.test("cambio concurrente del guard de Temporada converge sin confirmar contexto stale", async () => {
      const groupId = "e2-09-season-race", seasonId = await setupGroup(groupId), membershipId = "e2-09-season-race-membership", requestId = "e2-09-season-race-request", key = "e2-09-season-race-key-0001", joinedAt = T.fromMillis(4100), endedAt = T.fromMillis(4200); await seedFinalizedV2(groupId, seasonId, membershipId, joinedAt, endedAt); await seedPending(groupId, requestId); registerDecision(owner.uid, key); ref("groupJoinRequestApprovalCoordinations", requestId);
      const groupCapability = createGroupJoinRequestGroupCapability({ db }), seasonCapability = createGroupJoinRequestSeasonCapability({ db }), personCapability = createGroupJoinRequestPersonCapability({ db }), membershipCapability = createGroupJoinRequestMembershipCapability({ db, groupCapability, seasonCapability }); const store = createFirestoreGroupJoinRequestStore({ db, groupCapability, seasonCapability, personCapability, membershipCapability, repository: createFirestoreGroupJoinRequestRepository({ db }) });
      const [approval, close] = await Promise.allSettled([store.approve({ userId: owner.uid, groupId, requestId, idempotencyKey: key }), db.runTransaction(async (transaction) => { const guardRef = db.collection("openSeasonGuards").doc(groupId); const guard = await transaction.get(guardRef); if (guard.exists) transaction.delete(guardRef); })]); assert.equal(close.status, "fulfilled");
      const root = (await db.collection("memberships").doc(membershipId).get()).data(), request = (await db.collection("groupJoinRequests").doc(requestId).get()).data(), periods = await db.collection("memberships").doc(membershipId).collection("validityPeriods").get(); assert.equal((await db.collection("openSeasonGuards").doc(groupId).get()).exists, false);
      if (approval.status === "fulfilled") { assert.equal(approval.value.outcome, "APPROVED"); assert.equal(root.schemaVersion, 3); assert.equal(root.estado, "activa"); assert.equal(periods.size, 2); assert.equal(request.estado, "aprobada"); }
      else { assert.equal(approval.reason?.reason, "MEMBERSHIP_SEASON_NOT_REACTIVATABLE"); assert.equal(root.schemaVersion, 2); assert.equal(periods.size, 0); assert.equal(request.estado, "pendiente"); assert.equal((await db.collection("groupJoinRequestDecisionIntents").doc(groupJoinRequestDecisionIntentId(owner.uid, key)).get()).data().outcome, "MEMBERSHIP_SEASON_NOT_REACTIVATABLE"); }
      assert.equal((await db.collection("groupJoinRequestApprovalCoordinations").doc(requestId).get()).exists, false);
    });

    await t.test("finalización entre unidades consume SUPERSEDED; misma clave no reabre y una nueva sí", async () => {
      const groupId = "e2-09-superseded", seasonId = await setupGroup(groupId), membershipId = "e2-09-superseded-membership", requestId = "e2-09-superseded-request", key = "e2-09-superseded-key-1", nextKey = "e2-09-superseded-key-2", joinedAt = T.fromMillis(5000), endedAt = T.fromMillis(6000); await seedFinalizedV2(groupId, seasonId, membershipId, joinedAt, endedAt); await seedPending(groupId, requestId); registerDecision(owner.uid, key); registerDecision(owner.uid, nextKey); ref("groupJoinRequestApprovalCoordinations", requestId); periodRef(membershipId, 1); periodRef(membershipId, 2); periodRef(membershipId, 3);
      const groupCapability = createGroupJoinRequestGroupCapability({ db }), seasonCapability = createGroupJoinRequestSeasonCapability({ db }), personCapability = createGroupJoinRequestPersonCapability({ db }), membershipCapability = createGroupJoinRequestMembershipCapability({ db, groupCapability, seasonCapability }); const membershipRepository = createFirestoreMembershipRepository({ db }); const lifecycle = createFirestoreMembershipLifecycleGuard({ db, groupRepository: createFirestoreGroupRepository({ db }) }); let membershipCalls = 0;
      const wrappedMembership = { ...membershipCapability, async createOrRecoverForGroupJoinRequest(input) { membershipCalls += 1; const receipt = await membershipCapability.createOrRecoverForGroupJoinRequest(input); await db.collection("groups").doc(groupId).update({ ownerId: candidate.uid }); await lifecycle.finalizeForOwner({ userId: candidate.uid, personId, groupId, openSeasonId: seasonId, membershipRepository }); return receipt; } };
      const store = createFirestoreGroupJoinRequestStore({ db, groupCapability, seasonCapability, personCapability, membershipCapability: wrappedMembership, repository: createFirestoreGroupJoinRequestRepository({ db }) }); await assert.rejects(() => store.approve({ userId: owner.uid, groupId, requestId, idempotencyKey: key }), (error) => error?.reason === "MEMBERSHIP_REACTIVATION_SUPERSEDED"); assert.equal(membershipCalls, 1); await db.collection("groups").doc(groupId).update({ ownerId: owner.uid });
      const request = (await db.collection("groupJoinRequests").doc(requestId).get()).data(), intent = (await db.collection("groupJoinRequestDecisionIntents").doc(groupJoinRequestDecisionIntentId(owner.uid, key)).get()).data(); assert.equal(request.estado, "pendiente"); assert.equal(intent.intentStatus, "consumed"); assert.equal(intent.outcome, "MEMBERSHIP_REACTIVATION_SUPERSEDED"); assert.equal((await db.collection("groupJoinRequestApprovalCoordinations").doc(requestId).get()).exists, false); assert.equal((await periodRef(membershipId, 2).get()).data().estado, "cerrado");
      await assert.rejects(() => store.approve({ userId: owner.uid, groupId, requestId, idempotencyKey: key }), (error) => error?.reason === "MEMBERSHIP_REACTIVATION_SUPERSEDED"); assert.equal(membershipCalls, 1); assert.equal((await db.collection("memberships").doc(membershipId).get()).data().periodCount, 2);
      const normalStore = createFirestoreGroupJoinRequestStore({ db, groupCapability, seasonCapability, personCapability, membershipCapability, repository: createFirestoreGroupJoinRequestRepository({ db }) }); const approved = await normalStore.approve({ userId: owner.uid, groupId, requestId, idempotencyKey: nextKey }); assert.equal(approved.outcome, "APPROVED"); assert.equal(approved.membership.membershipId, membershipId); assert.equal((await db.collection("memberships").doc(membershipId).get()).data().periodCount, 3); assert.equal((await periodRef(membershipId, 3).get()).data().estado, "abierto");
    });

    await t.test("reglas niegan acceso directo a Períodos para todos los actores", async () => {
      const path = `memberships/e2-09-cycles-membership/validityPeriods/${membershipValidityPeriodId("e2-09-cycles-membership", 1)}`; for (const actor of [null, owner, candidate, globalAdmin]) { assert.equal(await direct(process.env.FIRESTORE_EMULATOR_HOST, projectId, path, actor?.idToken), 403); assert.equal(await direct(process.env.FIRESTORE_EMULATOR_HOST, projectId, path, actor?.idToken, "PATCH"), 403); }
      for (const collection of ["activities", "notifications", "alerts"]) assert.equal((await db.collection(collection).get()).size, 0, collection);
      for (const groupId of ["e2-09-create", "e2-09-cycles", "e2-09-season", "e2-09-season-race", "e2-09-superseded"]) { const group = (await db.collection("groups").doc(groupId).get()).data(); assert.equal(Object.hasOwn(group, "memberIds"), false); assert.equal(Object.hasOwn(group, "adminIds"), false); assert.equal(Object.hasOwn(group, "admins"), false); }
    });
  } finally {
    await fixtures.cleanup(); await auth.deleteUsers([owner.uid, candidate.uid, globalAdmin.uid]); await app.delete();
  }
});
