"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { activeMembershipGuardId, membershipLifecycleGuardId, membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");
const { groupJoinRequestDecisionHash, groupJoinRequestDecisionIntentId, pendingGroupJoinRequestGuardId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const value = await response.text(); return value ? JSON.parse(value) : null; }
async function signUp(host, name) {
  const email = `e2-07-gaps-${name}@example.invalid`;
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-07-gaps-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-07-gaps-password!", returnSecureToken: true }) });
  const body = await json(response); assert.equal(response.status, 200); return { uid: body.localId, idToken: body.idToken, email };
}
async function invoke(host, projectId, name, data, token) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ data }) });
  return { status: response.status, body: await json(response) };
}
async function direct(host, projectId, collection, token, method) {
  const suffix = method === "POST" ? "?documentId=e2-07-forbidden" : "/e2-07-forbidden";
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${collection}${suffix}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: method === "POST" ? JSON.stringify({ fields: {} }) : undefined });
  return response.status;
}

test("E2-07 closes the remaining deterministic persistence frontiers", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e2-07-gaps"); const db = app.firestore(); const auth = app.auth(); const fixtures = createFirestoreFixtureRegistry(db); const T = admin.firestore.Timestamp;
  const [owner, nextOwner, candidate, member, globalAdmin] = await Promise.all(["owner", "next-owner", "candidate", "member", "admin"].map((name) => signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, name)));
  const personId = "e2-07-gaps-person"; const call = (name, data, actor = owner) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, actor?.idToken);
  const register = (collection, id) => { const ref = db.collection(collection).doc(id); fixtures.register(ref); return ref; };
  const account = (actor, linkedPerson = null) => ({ nombre: actor.uid, email: actor.email, photoURL: "", personaId: linkedPerson, createdAt: T.now() });
  async function setup(groupId, requestId, ownerId = owner.uid) {
    const at = T.now(), seasonId = `${groupId}-season`, guardId = pendingGroupJoinRequestGuardId(groupId, personId);
    await Promise.all([
      fixtures.set(db.collection("groups").doc(groupId), { nombre: "E2-07 gaps", deporte: "voleibol", ownerId, estado: "activo", createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("seasons").doc(seasonId), { groupId, nombre: "Season", fechaInicio: "2026-09-07", estado: "abierta", createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("openSeasonGuards").doc(groupId), { seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 }),
      fixtures.set(db.collection("groupJoinRequests").doc(requestId), { personId, groupId, estado: "pendiente", createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("pendingGroupJoinRequestGuards").doc(guardId), { requestId, personId, groupId, createdAt: at, guardVersion: 1 }),
    ]);
    return seasonId;
  }
  async function claim(groupId, requestId, seasonId, key, requestedBy = owner.uid) {
    const intentId = groupJoinRequestDecisionIntentId(requestedBy, key), at = T.now();
    await Promise.all([
      fixtures.set(db.collection("groupJoinRequestDecisionIntents").doc(intentId), { requestId, personId, groupId, action: "approve", requestedBy, requestHash: groupJoinRequestDecisionHash(requestId, personId, groupId, "approve"), createdAt: at, intentStatus: "pending", intentVersion: 2 }),
      fixtures.set(db.collection("groupJoinRequestApprovalCoordinations").doc(requestId), { requestId, personId, groupId, seasonId, decisionIntentId: intentId, requestedBy, approvalEffect: "CREATE_MEMBERSHIP", membershipId: `${requestId}-membership`, expectedActivationOrdinal: 1, createdAt: at, coordinationVersion: 2 }),
    ]);
    return intentId;
  }
  async function counts(groupId, requestId) {
    const [requests, active, intents, claims] = await Promise.all([
      db.collection("groupJoinRequests").where("groupId", "==", groupId).get(),
      db.collection("memberships").where("personId", "==", personId).where("groupId", "==", groupId).where("estado", "==", "activa").limit(3).get(),
      db.collection("groupJoinRequestDecisionIntents").where("requestId", "==", requestId).get(),
      db.collection("groupJoinRequestApprovalCoordinations").where("requestId", "==", requestId).get(),
    ]);
    return { requests: requests.size, active: active.size, intents: intents.size, claims: claims.size };
  }

  try {
    await Promise.all([
      fixtures.set(db.collection("users").doc(owner.uid), account(owner)), fixtures.set(db.collection("users").doc(nextOwner.uid), account(nextOwner)), fixtures.set(db.collection("users").doc(candidate.uid), account(candidate, personId)), fixtures.set(db.collection("users").doc(member.uid), account(member)), fixtures.set(db.collection("users").doc(globalAdmin.uid), { ...account(globalAdmin), roles: "admin" }), fixtures.set(db.collection("personas").doc(personId), { nombre: "Ana", apellido: "Perez", emailContacto: candidate.email, createdAt: T.now() }),
    ]);

    await t.test("idempotency conflicts are closed and reject aliases are stable", async () => {
      const g1 = "e2-07-gaps-idem-1", r1 = "e2-07-gaps-request-1", g2 = "e2-07-gaps-idem-2", r2 = "e2-07-gaps-request-2", key = "e2-07-gaps-shared-key-01";
      await setup(g1, r1); await setup(g2, r2);
      register("groupJoinRequestDecisionIntents", groupJoinRequestDecisionIntentId(owner.uid, key)); register("groupJoinRequestDecisionIntents", groupJoinRequestDecisionIntentId(owner.uid, "e2-07-gaps-fresh-key-01"));
      const first = await call("rejectGroupJoinRequest", { groupId: g1, requestId: r1, idempotencyKey: key }); assert.equal(first.body.result.outcome, "REJECTED");
      assert.equal((await call("approveGroupJoinRequest", { groupId: g1, requestId: r1, idempotencyKey: key })).body.error.details.reason, "IDEMPOTENCY_CONFLICT");
      assert.equal((await call("rejectGroupJoinRequest", { groupId: g2, requestId: r2, idempotencyKey: key })).body.error.details.reason, "IDEMPOTENCY_CONFLICT");
      const alias = await call("rejectGroupJoinRequest", { groupId: g1, requestId: r1, idempotencyKey: "e2-07-gaps-fresh-key-01" }); assert.equal(alias.body.result.outcome, "ALREADY_REJECTED");
      assert.deepEqual(await counts(g1, r1), { requests: 1, active: 0, intents: 2, claims: 0 });
      assert.deepEqual(await counts(g2, r2), { requests: 1, active: 0, intents: 0, claims: 0 });
    });

    await t.test("released approval intent retries after the direct-membership frontier", async () => {
      const groupId = "e2-07-gaps-release", requestId = "e2-07-gaps-release-request", key = "e2-07-gaps-release-key-01", seasonId = await setup(groupId, requestId), membershipId = "e2-07-gaps-foreign-member", guardId = activeMembershipGuardId(groupId, personId), at = T.now();
      const membershipRef = register("memberships", membershipId), activeRef = register("activeMembershipGuards", guardId);
      register("groupJoinRequestDecisionIntents", groupJoinRequestDecisionIntentId(owner.uid, key)); register("groupJoinRequestApprovalCoordinations", requestId);
      await Promise.all([membershipRef.set({ personId, groupId, seasonId, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 }), activeRef.set({ membershipId, personId, groupId, seasonId, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: at, guardVersion: 1 })]);
      const blocked = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); assert.equal(blocked.body.error.details.reason, "ACTIVE_MEMBERSHIP_EXISTS"); assert.deepEqual(await counts(groupId, requestId), { requests: 1, active: 1, intents: 0, claims: 0 });
      await Promise.all([membershipRef.delete(), activeRef.delete()]);
      const retry = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); assert.equal(retry.body.result.outcome, "APPROVED"); register("memberships", retry.body.result.decision.membership.id);
      assert.deepEqual(await counts(groupId, requestId), { requests: 1, active: 1, intents: 1, claims: 0 });
    });

    await t.test("two distinct keys assist one precommitted claim and one membership", async () => {
      const groupId = "e2-07-gaps-distinct", requestId = "e2-07-gaps-distinct-request", seasonId = await setup(groupId, requestId), key1 = "e2-07-gaps-distinct-key-01", key2 = "e2-07-gaps-distinct-key-02";
      await claim(groupId, requestId, seasonId, key1);
      register("groupJoinRequestDecisionIntents", groupJoinRequestDecisionIntentId(owner.uid, key2)); register("activeMembershipGuards", activeMembershipGuardId(groupId, personId));
      const responses = await Promise.all([call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key1 }), call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key2 })]);
      for (const response of responses) assert.equal(response.status, 200, JSON.stringify(response.body));
      const ids = new Set(responses.map((response) => response.body.result.decision.membership.id)); assert.equal(ids.size, 1); register("memberships", [...ids][0]);
      assert.deepEqual(await counts(groupId, requestId), { requests: 1, active: 1, intents: 1, claims: 0 });
    });

    await t.test("ownership before claim and finalized membership keep authoritative semantics", async () => {
      const groupId = "e2-07-gaps-transfer", requestId = "e2-07-gaps-transfer-request", key = "e2-07-gaps-transfer-key-01"; await setup(groupId, requestId); register("groupJoinRequestDecisionIntents", groupJoinRequestDecisionIntentId(nextOwner.uid, key)); register("groupJoinRequestApprovalCoordinations", requestId); register("activeMembershipGuards", activeMembershipGuardId(groupId, personId)); await db.collection("groups").doc(groupId).update({ ownerId: nextOwner.uid });
      assert.equal((await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }, owner)).body.error.details.reason, "NOT_AUTHORIZED");
      const approved = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }, nextOwner); assert.equal(approved.body.result.outcome, "APPROVED");
      const membershipId = approved.body.result.decision.membership.id, membershipRef = register("memberships", membershipId), activeRef = db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)), active = (await activeRef.get()).data(), finalizedAt = T.now(), periodRef = membershipRef.collection("validityPeriods").doc(membershipValidityPeriodId(membershipId, active.activationOrdinal)); fixtures.register(periodRef);
      await db.runTransaction(async (transaction) => { const [snapshot, periodSnapshot] = await transaction.getAll(membershipRef, periodRef); transaction.update(membershipRef, { ...snapshot.data(), estado: "finalizada", fechaEgreso: finalizedAt }); transaction.update(periodRef, { ...periodSnapshot.data(), estado: "cerrado", endedAt: finalizedAt }); transaction.create(register("membershipLifecycleGuards", membershipLifecycleGuardId(groupId, personId)), { membershipId, personId, groupId, seasonId: active.seasonId, lastActivationOrdinal: active.activationOrdinal, finalizedAt, lifecycleGuardVersion: 2 }); transaction.delete(activeRef); });
      const result = await call("getGroupJoinRequestDecisionResult", { groupId, requestId }, nextOwner); assert.equal(result.body.result.status, "APPROVED"); assert.equal(result.body.result.membership.id, membershipId);
    });

    await t.test("orphan, duplicate and crossed states fail closed; every direct actor is denied", async () => {
      const orphanGroup = "e2-07-gaps-orphan", orphanRequest = "e2-07-gaps-orphan-request"; await setup(orphanGroup, orphanRequest); await db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(orphanGroup, personId)).delete();
      for (const operation of [call("getGroupJoinRequestDecisionResult", { groupId: orphanGroup, requestId: orphanRequest }), call("rejectGroupJoinRequest", { groupId: orphanGroup, requestId: orphanRequest, idempotencyKey: "e2-07-gaps-orphan-key-01" }), call("listPendingGroupJoinRequestsForOwnedGroup", { groupId: orphanGroup })]) assert.equal((await operation).body.error.details.reason, "INCOMPATIBLE_STATE");
      assert.deepEqual(await counts(orphanGroup, orphanRequest), { requests: 1, active: 0, intents: 0, claims: 0 });

      const duplicateGroup = "e2-07-gaps-duplicate", duplicateRequest = "e2-07-gaps-duplicate-request"; await setup(duplicateGroup, duplicateRequest); await fixtures.set(db.collection("groupJoinRequests").doc(`${duplicateRequest}-other`), { personId, groupId: duplicateGroup, estado: "pendiente", createdAt: T.now(), schemaVersion: 1 });
      assert.equal((await call("getGroupJoinRequestDecisionResult", { groupId: duplicateGroup, requestId: duplicateRequest })).body.error.details.reason, "INCOMPATIBLE_STATE"); assert.deepEqual(await counts(duplicateGroup, duplicateRequest), { requests: 2, active: 0, intents: 0, claims: 0 });

      const claimGroup = "e2-07-gaps-claim", claimRequest = "e2-07-gaps-claim-request", seasonId = await setup(claimGroup, claimRequest), key = "e2-07-gaps-claim-key-01", intentId = await claim(claimGroup, claimRequest, seasonId, key); await db.collection("groupJoinRequestDecisionIntents").doc(intentId).delete();
      assert.equal((await call("getGroupJoinRequestDecisionResult", { groupId: claimGroup, requestId: claimRequest })).body.error.details.reason, "INCOMPATIBLE_STATE"); assert.deepEqual(await counts(claimGroup, claimRequest), { requests: 1, active: 0, intents: 0, claims: 1 });

      const collections = ["groupJoinRequests", "pendingGroupJoinRequestGuards", "groupJoinRequestIntents", "memberships", "activeMembershipGuards", "membershipLifecycleGuards", "groupJoinRequestDecisionIntents", "groupJoinRequestApprovalCoordinations"];
      for (const collection of collections) for (const actor of [null, candidate, owner, member, globalAdmin]) for (const method of ["GET", "POST"]) assert.equal(await direct(process.env.FIRESTORE_EMULATOR_HOST, projectId, collection, actor?.idToken, method), 403, `${collection}/${actor?.uid || "visitor"}/${method}`);
    });
  } finally {
    await fixtures.cleanup(); await auth.deleteUsers([owner.uid, nextOwner.uid, candidate.uid, member.uid, globalAdmin.uid]); await app.delete();
  }
});
