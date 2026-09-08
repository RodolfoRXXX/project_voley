"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { activeMembershipGuardId, membershipLifecycleGuardId } = require("../../src/memberships/application/membershipHashing");
const { groupJoinRequestDecisionHash, groupJoinRequestDecisionIntentId, groupJoinRequestIntentId, groupJoinRequestMembershipHash, groupJoinRequestMembershipIdempotencyHash, pendingGroupJoinRequestGuardId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const value = await response.text(); return value ? JSON.parse(value) : null; }
async function signUp(host, email) { const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-07-synthetic-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-07-synthetic-password!", returnSecureToken: true }) }); const body = await json(response); assert.equal(response.status, 200); return { uid: body.localId, idToken: body.idToken, email }; }
async function invoke(host, projectId, name, data, token) { const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ data }) }); return { status: response.status, body: await json(response) }; }
async function direct(host, projectId, collection, token, method = "GET") { const suffix = method === "POST" ? "?documentId=forbidden" : "/forbidden"; const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${collection}${suffix}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: method === "GET" ? undefined : JSON.stringify({ fields: {} }) }); return response.status; }

test("E2-07 decide Solicitudes con coordinación recuperable y cardinalidad autoritativa", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e2-07-decision"); const db = app.firestore(); const auth = app.auth(); const fixtures = createFirestoreFixtureRegistry(db); const T = admin.firestore.Timestamp;
  const [owner, nextOwner, candidate, outsider, globalAdmin] = await Promise.all(["owner", "next-owner", "candidate", "outsider", "admin"].map((name) => signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, `e2-07-${name}@example.invalid`)));
  const personId = "e2-07-person"; const call = (name, data, actor = owner) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, actor?.idToken);
  const account = (actor, id = null) => ({ nombre: actor.uid, email: actor.email, photoURL: "", personaId: id, createdAt: T.now() });
  const group = (ownerId) => ({ nombre: "Grupo E2-07", deporte: "voleibol", ownerId, estado: "activo", createdAt: T.now(), schemaVersion: 1 });
  const season = (groupId) => ({ groupId, nombre: "Temporada E2-07", fechaInicio: "2026-09-07", estado: "abierta", createdAt: T.now(), schemaVersion: 1 });
  const register = (collection, id) => { const ref = db.collection(collection).doc(id); fixtures.register(ref); return ref; };

  async function setupGroup(groupId, withSeason = true, ownerId = owner.uid) {
    await fixtures.set(db.collection("groups").doc(groupId), group(ownerId));
    if (withSeason) {
      const seasonId = `${groupId}-season`, at = T.now();
      await Promise.all([
        fixtures.set(db.collection("seasons").doc(seasonId), { ...season(groupId), createdAt: at }),
        fixtures.set(db.collection("openSeasonGuards").doc(groupId), { seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 }),
      ]);
      return seasonId;
    }
    return null;
  }
  async function createRequest(groupId, key) {
    const response = await call("createMyGroupJoinRequest", { groupId, idempotencyKey: key }, candidate); assert.equal(response.status, 200, JSON.stringify(response.body));
    const requestId = response.body.result.request.id;
    register("groupJoinRequests", requestId); register("pendingGroupJoinRequestGuards", pendingGroupJoinRequestGuardId(groupId, personId)); register("groupJoinRequestIntents", groupJoinRequestIntentId(candidate.uid, key));
    return requestId;
  }
  function registerDecision(ownerId, key, requestId, groupId) { register("groupJoinRequestDecisionIntents", groupJoinRequestDecisionIntentId(ownerId, key)); register("groupJoinRequestApprovalCoordinations", requestId); register("activeMembershipGuards", activeMembershipGuardId(groupId, personId)); }
  async function cardinality(groupId, requestId) {
    const [requests, active, decisionIntents, claims] = await Promise.all([
      db.collection("groupJoinRequests").where("groupId", "==", groupId).get(),
      db.collection("memberships").where("personId", "==", personId).where("groupId", "==", groupId).where("estado", "==", "activa").limit(2).get(),
      db.collection("groupJoinRequestDecisionIntents").where("requestId", "==", requestId).get(),
      db.collection("groupJoinRequestApprovalCoordinations").where("requestId", "==", requestId).get(),
    ]);
    return { requests, active, decisionIntents, claims };
  }
  async function manualClaim(groupId, requestId, seasonId, requestedBy, key) {
    const request = (await db.collection("groupJoinRequests").doc(requestId).get()).data(); const intentId = groupJoinRequestDecisionIntentId(requestedBy, key); const at = T.now();
    register("groupJoinRequestDecisionIntents", intentId); register("groupJoinRequestApprovalCoordinations", requestId);
    await Promise.all([
      db.collection("groupJoinRequestDecisionIntents").doc(intentId).set({ requestId, personId, groupId, action: "approve", requestedBy, requestHash: groupJoinRequestDecisionHash(requestId, personId, groupId, "approve"), createdAt: at, intentVersion: 1 }),
      db.collection("groupJoinRequestApprovalCoordinations").doc(requestId).set({ requestId, personId, groupId, seasonId, decisionIntentId: intentId, requestedBy, createdAt: at, coordinationVersion: 1 }),
    ]);
    assert.equal(request.estado, "pendiente"); return intentId;
  }
  async function manualOwnMembership(groupId, requestId, seasonId, membershipId) {
    const at = T.now(), guardId = activeMembershipGuardId(groupId, personId); register("memberships", membershipId); register("activeMembershipGuards", guardId);
    await Promise.all([
      db.collection("memberships").doc(membershipId).set({ personId, groupId, seasonId, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 }),
      db.collection("activeMembershipGuards").doc(guardId).set({ membershipId, personId, groupId, seasonId, idempotencyKeyHash: groupJoinRequestMembershipIdempotencyHash(requestId, personId, groupId), requestHash: groupJoinRequestMembershipHash(requestId, personId, groupId, seasonId), createdAt: at, guardVersion: 1 }),
    ]);
  }

  try {
    await Promise.all([
      fixtures.set(db.collection("users").doc(owner.uid), account(owner)), fixtures.set(db.collection("users").doc(nextOwner.uid), account(nextOwner)), fixtures.set(db.collection("users").doc(candidate.uid), account(candidate, personId)), fixtures.set(db.collection("users").doc(outsider.uid), account(outsider)), fixtures.set(db.collection("users").doc(globalAdmin.uid), { ...account(globalAdmin), roles: "admin" }), fixtures.set(db.collection("personas").doc(personId), { nombre: "Ana", apellido: "Pérez", emailContacto: candidate.email, createdAt: T.now() }),
    ]);

    await t.test("aprobación, respuesta perdida, consulta y claves iguales/distintas convergen", async () => {
      const groupId = "e2-07-approve", key = "e2-07-approve-key-0001", seasonId = await setupGroup(groupId); const requestId = await createRequest(groupId, "e2-07-create-approve"); registerDecision(owner.uid, key, requestId, groupId);
      const concurrent = await Promise.all([call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }), call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key })]);
      for (const response of concurrent) assert.equal(response.status, 200, JSON.stringify(response.body));
      const membershipId = concurrent[0].body.result.decision.membership.id; register("memberships", membershipId);
      assert.deepEqual(new Set(concurrent.map((r) => r.body.result.decision.membership.id)), new Set([membershipId]));
      const aliasKey = "e2-07-approve-key-0002"; register("groupJoinRequestDecisionIntents", groupJoinRequestDecisionIntentId(owner.uid, aliasKey)); const recovered = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: aliasKey }); assert.equal(recovered.body.result.outcome, "ALREADY_APPROVED");
      const result = await call("getGroupJoinRequestDecisionResult", { groupId, requestId }); assert.deepEqual(result.body.result.membership, { id: membershipId, seasonId });
      const state = await cardinality(groupId, requestId); assert.equal(state.requests.size, 1); assert.equal(state.requests.docs[0].data().estado, "aprobada"); assert.equal(state.active.size, 1); assert.equal(state.claims.size, 0); assert.equal(state.decisionIntents.size, 2);
      assert.equal((await db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(groupId, personId)).get()).exists, false);
    });

    await t.test("rechazo es atómico, idempotente y nunca crea Membresía", async () => {
      const groupId = "e2-07-reject"; await setupGroup(groupId, false); const requestId = await createRequest(groupId, "e2-07-create-reject"); const key = "e2-07-reject-key-0001"; register("groupJoinRequestDecisionIntents", groupJoinRequestDecisionIntentId(owner.uid, key));
      const first = await call("rejectGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); const retry = await call("rejectGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); assert.equal(first.body.result.outcome, "REJECTED"); assert.equal(retry.body.result.outcome, "ALREADY_REJECTED");
      const state = await cardinality(groupId, requestId); assert.equal(state.active.size, 0); assert.equal(state.claims.size, 0); assert.equal(state.decisionIntents.size, 1); assert.equal(state.requests.docs[0].data().estado, "rechazada");
      const approval = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: "e2-07-opposite-key-01" }); assert.equal(approval.body.error.details.reason, "DECISION_ALREADY_REJECTED");
    });

    await t.test("ausencia de Temporada no crea claim, intent, decisión ni Membresía", async () => {
      const groupId = "e2-07-no-season"; await setupGroup(groupId, false); const requestId = await createRequest(groupId, "e2-07-create-no-season"); const key = "e2-07-no-season-key-01";
      const response = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); assert.equal(response.body.error.details.reason, "OPEN_SEASON_REQUIRED"); const state = await cardinality(groupId, requestId); assert.equal(state.active.size + state.claims.size + state.decisionIntents.size, 0); assert.equal(state.requests.docs[0].data().estado, "pendiente");
    });

    await t.test("claim parcial bloquea cancelación/rechazo y luego recupera la misma Membresía", async () => {
      const groupId = "e2-07-partial", key = "e2-07-partial-key-001", seasonId = await setupGroup(groupId); const requestId = await createRequest(groupId, "e2-07-create-partial"); await manualClaim(groupId, requestId, seasonId, owner.uid, key); const membershipId = "e2-07-partial-membership"; await manualOwnMembership(groupId, requestId, seasonId, membershipId);
      const [cancel, reject, progress, list, candidateView] = await Promise.all([call("cancelMyGroupJoinRequest", { groupId, requestId }, candidate), call("rejectGroupJoinRequest", { groupId, requestId, idempotencyKey: "e2-07-partial-reject" }), call("getGroupJoinRequestDecisionResult", { groupId, requestId }), call("listPendingGroupJoinRequestsForOwnedGroup", { groupId }), call("getMyCurrentGroupJoinRequest", { groupId }, candidate)]);
      assert.equal(cancel.body.error.details.reason, "APPROVAL_IN_PROGRESS"); assert.equal(reject.body.error.details.reason, "APPROVAL_IN_PROGRESS"); assert.equal(progress.body.result.status, "APPROVAL_IN_PROGRESS"); assert.equal(list.body.result.items[0].decisionStatus, "APPROVAL_IN_PROGRESS"); assert.equal(candidateView.body.result.request.decisionStatus, "APPROVAL_IN_PROGRESS");
      const recovered = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); assert.equal(recovered.body.result.decision.membership.id, membershipId); assert.equal((await cardinality(groupId, requestId)).active.size, 1);
    });

    await t.test("Membresía activa ajena libera sólo el claim y conserva intent/pendiente", async () => {
      const groupId = "e2-07-foreign", key = "e2-07-foreign-key-001", seasonId = await setupGroup(groupId); const requestId = await createRequest(groupId, "e2-07-create-foreign"); const at = T.now(), membershipId = "e2-07-foreign-membership", guardId = activeMembershipGuardId(groupId, personId); register("memberships", membershipId); register("activeMembershipGuards", guardId); registerDecision(owner.uid, key, requestId, groupId);
      await Promise.all([db.collection("memberships").doc(membershipId).set({ personId, groupId, seasonId, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 }), db.collection("activeMembershipGuards").doc(guardId).set({ membershipId, personId, groupId, seasonId, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: at, guardVersion: 1 })]);
      const response = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); assert.equal(response.body.error.details.reason, "ACTIVE_MEMBERSHIP_EXISTS"); const state = await cardinality(groupId, requestId); assert.equal(state.active.size, 1); assert.equal(state.claims.size, 0); assert.equal(state.decisionIntents.size, 1); assert.equal(state.requests.docs[0].data().estado, "pendiente");
    });

    await t.test("lifecycle finalizado exige reactivación y no crea ni adopta", async () => {
      const groupId = "e2-07-lifecycle", key = "e2-07-lifecycle-key01", seasonId = await setupGroup(groupId); const requestId = await createRequest(groupId, "e2-07-create-lifecycle"); const membershipId = "e2-07-finalized", at = T.now(), lifecycleId = membershipLifecycleGuardId(groupId, personId); register("memberships", membershipId); register("membershipLifecycleGuards", lifecycleId); registerDecision(owner.uid, key, requestId, groupId);
      await Promise.all([db.collection("memberships").doc(membershipId).set({ personId, groupId, seasonId, estado: "finalizada", fechaIngreso: at, fechaEgreso: at, createdAt: at, schemaVersion: 2 }), db.collection("membershipLifecycleGuards").doc(lifecycleId).set({ membershipId, personId, groupId, seasonId, creationIdempotencyKeyHash: "e".repeat(64), creationRequestHash: "f".repeat(64), finalizedAt: at, lifecycleGuardVersion: 1 })]);
      const response = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); assert.equal(response.body.error.details.reason, "MEMBERSHIP_REACTIVATION_REQUIRED"); const state = await cardinality(groupId, requestId); assert.equal(state.active.size, 0); assert.equal(state.claims.size, 0); assert.equal(state.requests.docs[0].data().estado, "pendiente");
    });

    await t.test("cambio de Temporada antes de Membresía libera; después de Membresía recupera", async () => {
      const groupId = "e2-07-season-change", key = "e2-07-season-change1", seasonId = await setupGroup(groupId); const requestId = await createRequest(groupId, "e2-07-create-seasonchg"); await manualClaim(groupId, requestId, seasonId, owner.uid, key);
      const nextSeason = `${groupId}-season-next`, at = T.now(); await fixtures.set(db.collection("seasons").doc(nextSeason), { ...season(groupId), createdAt: at }); await db.collection("openSeasonGuards").doc(groupId).set({ seasonId: nextSeason, idempotencyKeyHash: "1".repeat(64), requestHash: "2".repeat(64), createdAt: at, guardVersion: 1 }); await db.collection("seasons").doc(seasonId).delete();
      const changed = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); assert.equal(changed.body.error.details.reason, "SEASON_INCOMPATIBLE"); assert.equal((await db.collection("groupJoinRequestApprovalCoordinations").doc(requestId).get()).exists, false);
      const groupId2 = "e2-07-season-after", key2 = "e2-07-season-after-01", seasonId2 = await setupGroup(groupId2); const requestId2 = await createRequest(groupId2, "e2-07-create-seasonafter"); await manualClaim(groupId2, requestId2, seasonId2, owner.uid, key2); await manualOwnMembership(groupId2, requestId2, seasonId2, "e2-07-season-after-member"); await db.collection("openSeasonGuards").doc(groupId2).delete(); await db.collection("seasons").doc(seasonId2).delete();
      const recovered = await call("approveGroupJoinRequest", { groupId: groupId2, requestId: requestId2, idempotencyKey: key2 }); assert.equal(recovered.body.result.outcome, "APPROVED");
    });

    await t.test("órdenes forzados contra rechazo/cancelación y transferencia preservan autoridad", async () => {
      const rejectedGroup = "e2-07-order-reject"; await setupGroup(rejectedGroup); const rejectedId = await createRequest(rejectedGroup, "e2-07-create-orderrej"); register("groupJoinRequestDecisionIntents", groupJoinRequestDecisionIntentId(owner.uid, "e2-07-order-reject01")); await call("rejectGroupJoinRequest", { groupId: rejectedGroup, requestId: rejectedId, idempotencyKey: "e2-07-order-reject01" }); const afterReject = await call("approveGroupJoinRequest", { groupId: rejectedGroup, requestId: rejectedId, idempotencyKey: "e2-07-order-approve1" }); assert.equal(afterReject.body.error.details.reason, "DECISION_ALREADY_REJECTED"); assert.equal((await cardinality(rejectedGroup, rejectedId)).active.size, 0);
      const cancelledGroup = "e2-07-order-cancel"; await setupGroup(cancelledGroup); const cancelledId = await createRequest(cancelledGroup, "e2-07-create-ordercan"); await call("cancelMyGroupJoinRequest", { groupId: cancelledGroup, requestId: cancelledId }, candidate); const afterCancel = await call("approveGroupJoinRequest", { groupId: cancelledGroup, requestId: cancelledId, idempotencyKey: "e2-07-order-approve2" }); assert.equal(afterCancel.body.error.details.reason, "REQUEST_CANCELLED"); assert.equal((await cardinality(cancelledGroup, cancelledId)).active.size, 0);
      const transferGroup = "e2-07-transfer", transferKey = "e2-07-transfer-key-01", transferSeason = await setupGroup(transferGroup); const transferId = await createRequest(transferGroup, "e2-07-create-transfer"); await manualClaim(transferGroup, transferId, transferSeason, owner.uid, transferKey); await db.collection("groups").doc(transferGroup).update({ ownerId: nextOwner.uid }); const former = await call("approveGroupJoinRequest", { groupId: transferGroup, requestId: transferId, idempotencyKey: transferKey }, owner); assert.equal(former.body.error.details.reason, "NOT_AUTHORIZED"); registerDecision(nextOwner.uid, "e2-07-transfer-assist", transferId, transferGroup); const assisted = await call("approveGroupJoinRequest", { groupId: transferGroup, requestId: transferId, idempotencyKey: "e2-07-transfer-assist" }, nextOwner); register("memberships", assisted.body.result.decision.membership.id); assert.equal(assisted.body.result.outcome, "APPROVED"); assert.equal((await db.collection("groupJoinRequests").doc(transferId).get()).data().decidedBy, owner.uid);
    });

    await t.test("intents/claims cruzados fallan cerrado y reglas niegan actores", async () => {
      const groupId = "e2-07-crossed", seasonId = await setupGroup(groupId); const requestId = await createRequest(groupId, "e2-07-create-crossed"); const key = "e2-07-crossed-key-01", intentId = await manualClaim(groupId, requestId, seasonId, owner.uid, key); await db.collection("groupJoinRequestApprovalCoordinations").doc(requestId).update({ decisionIntentId: `${intentId}-other` }); const result = await call("getGroupJoinRequestDecisionResult", { groupId, requestId }); assert.equal(result.body.error.details.reason, "INCOMPATIBLE_STATE");
      for (const collection of ["groupJoinRequestDecisionIntents", "groupJoinRequestApprovalCoordinations"]) for (const actor of [null, candidate, owner, outsider, globalAdmin]) { assert.equal(await direct(process.env.FIRESTORE_EMULATOR_HOST, projectId, collection, actor?.idToken), 403); assert.equal(await direct(process.env.FIRESTORE_EMULATOR_HOST, projectId, collection, actor?.idToken, "POST"), 403); }
    });

    await t.test("payloads, ownership y efectos colaterales quedan acotados", async () => {
      const groupId = "e2-07-auth", key = "e2-07-auth-decision01"; await setupGroup(groupId); const requestId = await createRequest(groupId, "e2-07-create-auth");
      for (const actor of [outsider, globalAdmin, candidate]) assert.equal((await call("rejectGroupJoinRequest", { groupId, requestId, idempotencyKey: key }, actor)).body.error.details.reason, "NOT_AUTHORIZED");
      assert.equal((await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key, membershipId: "client" })).body.error.details.reason, "VALIDATION_FAILED");
      const protectedCollections = ["notifications", "activities", "pendingAlerts", "payments"]; const before = await Promise.all(protectedCollections.map((name) => db.collection(name).count().get().then((s) => s.data().count))); register("groupJoinRequestDecisionIntents", groupJoinRequestDecisionIntentId(owner.uid, key)); await call("rejectGroupJoinRequest", { groupId, requestId, idempotencyKey: key }); const after = await Promise.all(protectedCollections.map((name) => db.collection(name).count().get().then((s) => s.data().count))); assert.deepEqual(after, before);
    });
  } finally { await fixtures.cleanup(); await auth.deleteUsers([owner.uid, nextOwner.uid, candidate.uid, outsider.uid, globalAdmin.uid]); await app.delete(); }
});
