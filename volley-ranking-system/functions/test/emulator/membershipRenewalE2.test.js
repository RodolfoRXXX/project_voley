"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { activeMembershipGuardId, membershipLifecycleGuardId, membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");
const { pendingGroupJoinRequestGuardId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function body(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) { const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-18-synthetic-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-18-synthetic-password!", returnSecureToken: true }) }); const value = await body(response); assert.equal(response.status, 200); return { uid: value.localId, idToken: value.idToken, email }; }
async function invoke(host, projectId, name, data, token) { const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ data }) }); return { status: response.status, body: await body(response) }; }

test("E2-18 renueva por Solicitud, recupera retry y preserva lineage", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e2-18-renewal");
  const db = app.firestore(); const auth = app.auth(); const T = admin.firestore.Timestamp;
  const owner = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e2-18-owner@example.invalid");
  const candidate = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e2-18-candidate@example.invalid");
  const groupId = "e2-18-group", personId = "e2-18-person", oldSeasonId = "e2-18-season-old", middleSeasonId = "e2-18-season-middle", openSeasonId = "e2-18-season-open", predecessorId = "e2-18-membership-old", requestId = "e2-18-request";
  const at = T.fromMillis(1_000), closedAt = T.fromMillis(2_000), requestedAt = T.fromMillis(3_000);
  const refs = [];
  const put = async (collection, id, data) => { const ref = db.collection(collection).doc(id); refs.push(ref); await ref.set(data); return ref; };
  const call = (name, data, actor = owner) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, actor.idToken);
  let createdMembershipId;
  try {
    await put("users", owner.uid, { nombre: "Owner", email: owner.email, photoURL: "", personaId: null, createdAt: at });
    await put("users", candidate.uid, { nombre: "Candidate", email: candidate.email, photoURL: "", personaId: personId, createdAt: at });
    await put("personas", personId, { nombre: "Ana", apellido: "Renovación", emailContacto: candidate.email, createdAt: at });
    await put("groups", groupId, { nombre: "Grupo E2-18", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: at, schemaVersion: 1 });
    await put("seasons", oldSeasonId, { groupId, nombre: "Anterior", fechaInicio: "2025-01-01", estado: "cerrada", createdAt: at, closedAt, closedBy: owner.uid, schemaVersion: 2 });
    await put("seasons", middleSeasonId, { groupId, nombre: "Intermedia", fechaInicio: "2025-06-01", estado: "cerrada", createdAt: at, closedAt, closedBy: owner.uid, schemaVersion: 2 });
    await put("seasons", openSeasonId, { groupId, nombre: "Actual", fechaInicio: "2026-01-01", estado: "abierta", createdAt: requestedAt, schemaVersion: 1 });
    await put("openSeasonGuards", groupId, { seasonId: openSeasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: requestedAt, guardVersion: 1 });
    await put("memberships", predecessorId, { personId, groupId, seasonId: oldSeasonId, estado: "finalizada", fechaIngreso: at, fechaEgreso: closedAt, createdAt: at, schemaVersion: 2 });
    await put("membershipLifecycleGuards", membershipLifecycleGuardId(groupId, personId), { membershipId: predecessorId, personId, groupId, seasonId: oldSeasonId, creationIdempotencyKeyHash: "c".repeat(64), creationRequestHash: "d".repeat(64), finalizedAt: closedAt, lifecycleGuardVersion: 1 });
    await put("groupJoinRequests", requestId, { personId, groupId, estado: "pendiente", createdAt: requestedAt, schemaVersion: 1 });
    await put("pendingGroupJoinRequestGuards", pendingGroupJoinRequestGuardId(groupId, personId), { requestId, personId, groupId, createdAt: requestedAt, guardVersion: 1 });

    const preview = await call("listPendingGroupJoinRequestsForOwnedGroup", { groupId });
    assert.equal(preview.status, 200, JSON.stringify(preview.body));
    assert.equal(preview.body.result.items[0].approvalEffect, "RENEW_MEMBERSHIP");

    const key = "e2-18-renewal-key-0001";
    const concurrent = await Promise.all([
      call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }),
      call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key }),
    ]);
    assert.equal(concurrent.every((result) => result.status === 200), true, JSON.stringify(concurrent));
    const first = concurrent.find((result) => result.body.result.outcome === "APPROVED") || concurrent[0];
    const retry = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: key });
    assert.equal(retry.status, 200, JSON.stringify(retry.body));
    createdMembershipId = first.body.result.decision.membership.id;
    assert.equal(retry.body.result.decision.membership.id, createdMembershipId);
    assert.notEqual(createdMembershipId, predecessorId);

    const [predecessor, middleSeason, created, activeGuard, lifecycle, request, roots] = await Promise.all([
      db.collection("memberships").doc(predecessorId).get(), db.collection("seasons").doc(middleSeasonId).get(),
      db.collection("memberships").doc(createdMembershipId).get(),
      db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)).get(), db.collection("membershipLifecycleGuards").doc(membershipLifecycleGuardId(groupId, personId)).get(),
      db.collection("groupJoinRequests").doc(requestId).get(), db.collection("memberships").where("personId", "==", personId).where("groupId", "==", groupId).get(),
    ]);
    assert.deepEqual(predecessor.data(), { personId, groupId, seasonId: oldSeasonId, estado: "finalizada", fechaIngreso: at, fechaEgreso: closedAt, createdAt: at, schemaVersion: 2 });
    assert.equal(middleSeason.data().nombre, "Intermedia");
    assert.equal(created.data().schemaVersion, 4); assert.equal(created.data().previousMembershipId, predecessorId); assert.equal(created.data().seasonId, openSeasonId); assert.equal(created.data().periodCount, 1);
    assert.equal((await db.collection("memberships").doc(createdMembershipId).collection("validityPeriods").doc(membershipValidityPeriodId(createdMembershipId, 1)).get()).data().estado, "abierto");
    assert.equal(activeGuard.data().membershipId, createdMembershipId); assert.equal(activeGuard.data().activationOrdinal, 1);
    assert.equal(lifecycle.data().membershipId, createdMembershipId); assert.equal(lifecycle.data().rootState, "active"); assert.equal(lifecycle.data().lifecycleGuardVersion, 3);
    assert.equal(request.data().schemaVersion, 4); assert.equal(request.data().approvalEffect, "RENEW_MEMBERSHIP"); assert.equal(Object.hasOwn(request.data(), "previousMembershipId"), false);
    assert.equal(roots.size, 2);

    const otherPersonId = "e2-18-person-other", otherRequestId = "e2-18-request-other";
    await put("personas", otherPersonId, { nombre: "Berta", apellido: "Conflicto", emailContacto: "e2-18-other@example.invalid", createdAt: at });
    await put("groupJoinRequests", otherRequestId, { personId: otherPersonId, groupId, estado: "pendiente", createdAt: requestedAt, schemaVersion: 1 });
    await put("pendingGroupJoinRequestGuards", pendingGroupJoinRequestGuardId(groupId, otherPersonId), { requestId: otherRequestId, personId: otherPersonId, groupId, createdAt: requestedAt, guardVersion: 1 });
    const conflict = await call("approveGroupJoinRequest", { groupId, requestId: otherRequestId, idempotencyKey: key });
    assert.equal(conflict.body.error.details.reason, "IDEMPOTENCY_CONFLICT", JSON.stringify(conflict.body));
    assert.equal((await db.collection("groupJoinRequests").doc(otherRequestId).get()).data().estado, "pendiente");
    assert.equal((await db.collection("memberships").where("personId", "==", otherPersonId).get()).empty, true);
  } finally {
    if (createdMembershipId) {
      await db.collection("memberships").doc(createdMembershipId).collection("validityPeriods").doc(membershipValidityPeriodId(createdMembershipId, 1)).delete().catch(() => {});
      refs.push(db.collection("memberships").doc(createdMembershipId));
    }
    const dynamicCollections = ["groupJoinRequestDecisionIntents", "groupJoinRequestApprovalCoordinations", "activeMembershipGuards"];
    for (const collection of dynamicCollections) { const snapshot = await db.collection(collection).get(); for (const document of snapshot.docs) await document.ref.delete(); }
    for (const ref of refs.reverse()) await ref.delete().catch(() => {});
    await auth.deleteUsers([owner.uid, candidate.uid]); await app.delete();
  }
});
