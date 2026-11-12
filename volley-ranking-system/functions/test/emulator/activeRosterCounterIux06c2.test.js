"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { activeMembershipGuardId } = require("../../src/memberships/application/membershipHashing");
const { pendingGroupJoinRequestGuardId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { activeRosterSummaryId } = require("../../src/memberships/infrastructure/firestoreActiveRosterCounter");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const value = await response.text(); return value ? JSON.parse(value) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=iux-06c2-p01`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "IUX-06C2-P01-password!", returnSecureToken: true }),
  });
  const value = await json(response); assert.equal(response.status, 200, JSON.stringify(value));
  return { uid: value.localId, idToken: value.idToken, email };
}
async function invoke(host, projectId, name, data, token) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ data }),
  });
  return { status: response.status, body: await json(response) };
}

test("IUX-06C2 P01 materializa, reconcilia y conserva el total exacto bajo concurrencia", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-06c2-p01-active-roster-counter");
  const db = app.firestore(); const auth = app.auth(); const T = admin.firestore.Timestamp;
  const owner = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06c2-p01-owner@example.invalid");
  const visitor = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06c2-p01-visitor@example.invalid");
  const groupId = "iux-06c2-p01-group", seasonId = "iux-06c2-p01-season", ownerPersonId = "iux-06c2-p01-owner-person";
  const incompatibleGroupId = "iux-06c2-p01-incompatible-group", incompatibleSeasonId = "iux-06c2-p01-incompatible-season";
  const at = T.fromMillis(1_000);
  const call = (name, data, actor = owner) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, actor.idToken);
  async function seedScope(targetGroupId, targetSeasonId) {
    await db.collection("groups").doc(targetGroupId).set({ nombre: targetGroupId, deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: at, schemaVersion: 1 });
    await db.collection("seasons").doc(targetSeasonId).set({ groupId: targetGroupId, nombre: "Temporada", fechaInicio: "2026-01-01", estado: "abierta", createdAt: at, schemaVersion: 1 });
    await db.collection("openSeasonGuards").doc(targetGroupId).set({ seasonId: targetSeasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 });
  }
  async function canonicalRosterCount() {
    let cursor; let total = 0;
    do {
      const result = await call("listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 20, ...(cursor ? { cursor } : {}) });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      total += result.body.result.items.length; cursor = result.body.result.nextCursor;
    } while (cursor);
    return total;
  }
  try {
    await db.collection("users").doc(owner.uid).set({ nombre: "Owner", email: owner.email, photoURL: "", personaId: ownerPersonId, createdAt: at });
    await db.collection("users").doc(visitor.uid).set({ nombre: "Visitor", email: visitor.email, photoURL: "", createdAt: at });
    await db.collection("personas").doc(ownerPersonId).set({ nombre: "Olivia", apellido: "Owner", emailContacto: owner.email, createdAt: at });
    await seedScope(groupId, seasonId);

    const batch = db.batch();
    for (let index = 0; index < 55; index += 1) {
      const membershipId = `iux-06c2-p01-legacy-${String(index).padStart(2, "0")}`;
      const personId = `iux-06c2-p01-person-${String(index).padStart(2, "0")}`;
      batch.set(db.collection("memberships").doc(membershipId), { personId, groupId, seasonId, estado: "activa", fechaIngreso: T.fromMillis(2_000 + index), createdAt: T.fromMillis(2_000 + index), schemaVersion: 1 });
      batch.set(db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)), { membershipId, personId, groupId, seasonId, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: T.fromMillis(2_000 + index), guardVersion: 1 });
    }
    await batch.commit();

    const initial = await call("getActiveGroupMemberTotalForOwnedGroup", { groupId });
    assert.deepEqual(initial.body.result, { status: "READY", total: 55, seasonId });
    assert.equal(await canonicalRosterCount(), 55);

    const denied = await call("getActiveGroupMemberTotalForOwnedGroup", { groupId }, visitor);
    assert.equal(denied.body.error.details.reason, "GROUP_NOT_ACCESSIBLE");

    const key = "iux-06c2-p01-owner-membership-key";
    const [reconciled, created] = await Promise.all([
      call("reconcileActiveGroupMemberTotalForOwnedGroup", { groupId }),
      call("createMyMembershipForOwnedGroup", { groupId, idempotencyKey: key }),
    ]);
    assert.equal(reconciled.status, 200, JSON.stringify(reconciled.body));
    assert.equal(created.status, 200, JSON.stringify(created.body));
    const repeatedCreate = await call("createMyMembershipForOwnedGroup", { groupId, idempotencyKey: key });
    assert.equal(repeatedCreate.body.result.outcome, "EXISTING_IDEMPOTENT");
    assert.equal((await call("getActiveGroupMemberTotalForOwnedGroup", { groupId })).body.result.total, 56);
    assert.equal(await canonicalRosterCount(), 56);

    const [firstFinalization, repeatedFinalization] = await Promise.all([
      call("finalizeMyMembershipForOwnedGroup", { groupId }),
      call("finalizeMyMembershipForOwnedGroup", { groupId }),
    ]);
    assert.equal([firstFinalization, repeatedFinalization].every((result) => result.status === 200), true);
    assert.equal((await call("getActiveGroupMemberTotalForOwnedGroup", { groupId })).body.result.total, 55);
    assert.equal(await canonicalRosterCount(), 55);

    await db.collection("activeRosterSummaries").doc(activeRosterSummaryId(groupId, seasonId)).set({ status: "READY" });
    const unreadable = await call("getActiveGroupMemberTotalForOwnedGroup", { groupId });
    assert.equal(unreadable.body.error.details.reason, "INCOMPATIBLE_STATE");

    await seedScope(incompatibleGroupId, incompatibleSeasonId);
    await db.collection("memberships").doc("iux-06c2-p01-incompatible-membership").set({ personId: "iux-06c2-p01-incompatible-person", groupId: incompatibleGroupId, seasonId: incompatibleSeasonId, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 });
    const incompatible = await call("getActiveGroupMemberTotalForOwnedGroup", { groupId: incompatibleGroupId });
    assert.deepEqual(incompatible.body.result, { status: "UNAVAILABLE" });

    const nextSeasonId = "iux-06c2-p01-season-next";
    await db.collection("seasons").doc(seasonId).update({ estado: "cerrada", closedAt: T.fromMillis(9_000), closedBy: owner.uid, schemaVersion: 2 });
    await db.collection("seasons").doc(nextSeasonId).set({ groupId, nombre: "Siguiente", fechaInicio: "2027-01-01", estado: "abierta", createdAt: T.fromMillis(9_000), schemaVersion: 1 });
    await db.collection("openSeasonGuards").doc(groupId).set({ seasonId: nextSeasonId, idempotencyKeyHash: "e".repeat(64), requestHash: "f".repeat(64), createdAt: T.fromMillis(9_000), guardVersion: 1 });
    assert.deepEqual((await call("getActiveGroupMemberTotalForOwnedGroup", { groupId })).body.result, { status: "READY", total: 0, seasonId: nextSeasonId });
  } finally {
    for (const collection of ["activeRosterContributions", "activeRosterSummaries", "membershipAdministrativeFinalizationIntents", "membershipSelfExitIntents", "membershipLifecycleGuards", "activeMembershipGuards", "memberships", "openSeasonGuards", "seasons", "groups", "personas"]) {
      const snapshot = await db.collection(collection).get(); const cleanup = db.batch();
      for (const document of snapshot.docs) if (collection.startsWith("activeRoster") || document.id.startsWith("iux-06c2-p01")) cleanup.delete(document.ref);
      await cleanup.commit();
    }
    await db.collection("users").doc(owner.uid).delete().catch(() => {}); await db.collection("users").doc(visitor.uid).delete().catch(() => {});
    await auth.deleteUsers([owner.uid, visitor.uid]); await app.delete();
  }
});

test("IUX-06C2 P01 acredita 0 -> 1 -> 0 para Owner sin Membresia propia", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-06c2-p01-empty-active-roster");
  const db = app.firestore(); const auth = app.auth(); const T = admin.firestore.Timestamp;
  const owner = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06c2-p01-empty-owner@example.invalid");
  const candidate = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06c2-p01-empty-candidate@example.invalid");
  const ownerPersonId = "iux-06c2-p01-empty-owner-person", candidatePersonId = "iux-06c2-p01-empty-candidate-person";
  const requestId = "iux-06c2-p01-empty-request", at = T.fromMillis(20_000);
  const call = (name, data, actor = owner) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, actor.idToken);
  let groupId = null; let seasonId = null;
  try {
    await db.collection("users").doc(owner.uid).set({ nombre: "Owner", email: owner.email, photoURL: "", personaId: ownerPersonId, createdAt: at });
    await db.collection("users").doc(candidate.uid).set({ nombre: "Candidate", email: candidate.email, photoURL: "", personaId: candidatePersonId, createdAt: at });
    await db.collection("personas").doc(ownerPersonId).set({ nombre: "Olivia", apellido: "Owner", emailContacto: owner.email, createdAt: at });
    await db.collection("personas").doc(candidatePersonId).set({ nombre: "Carla", apellido: "Candidate", emailContacto: candidate.email, createdAt: at });

    const createdGroup = await call("createOwnGroup", { nombre: "IUX-06C2 padrón vacío", deporte: "voleibol", idempotencyKey: "iux-06c2-p01-empty-group-key" });
    assert.equal(createdGroup.status, 200, JSON.stringify(createdGroup.body)); groupId = createdGroup.body.result.group.id;
    assert.deepEqual((await call("getActiveGroupMemberTotalForOwnedGroup", { groupId })).body.result, { status: "NO_OPEN_SEASON", total: 0 });
    const opened = await call("createAndOpenSeason", { groupId, nombre: "Temporada vacía", fechaInicio: "2026-11-12", idempotencyKey: "iux-06c2-p01-empty-season-key" });
    assert.equal(opened.status, 200, JSON.stringify(opened.body)); seasonId = opened.body.result.season.id;

    const ownMembership = await call("getMyCurrentGroupMembershipContext", { groupId });
    assert.equal(ownMembership.body.error.details.reason, "CURRENT_MEMBERSHIP_NOT_ACCESSIBLE");
    const emptyTotal = await call("getActiveGroupMemberTotalForOwnedGroup", { groupId });
    assert.deepEqual(emptyTotal.body.result, { status: "READY", total: 0, seasonId });

    await db.collection("groupJoinRequests").doc(requestId).set({ personId: candidatePersonId, groupId, estado: "pendiente", createdAt: at, schemaVersion: 1 });
    await db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(groupId, candidatePersonId)).set({ requestId, personId: candidatePersonId, groupId, createdAt: at, guardVersion: 1 });
    const approved = await call("approveGroupJoinRequest", { groupId, requestId, idempotencyKey: "iux-06c2-p01-empty-approval-key" });
    assert.equal(approved.body.result.outcome, "APPROVED", JSON.stringify(approved.body));
    const membershipId = approved.body.result.decision.membership.id;
    assert.deepEqual((await call("getActiveGroupMemberTotalForOwnedGroup", { groupId })).body.result, { status: "READY", total: 1, seasonId });

    const prepared = await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId });
    assert.equal(prepared.status, 200, JSON.stringify(prepared.body));
    const finalized = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef: prepared.body.result.activationRef, idempotencyKey: "iux-06c2-p01-empty-finalization-key" });
    assert.equal(finalized.body.result.outcome, "MEMBERSHIP_FINALIZATION_CONFIRMED", JSON.stringify(finalized.body));
    assert.deepEqual((await call("getActiveGroupMemberTotalForOwnedGroup", { groupId })).body.result, { status: "READY", total: 0, seasonId });
  } finally {
    const collections = ["activeRosterContributions", "activeRosterSummaries", "membershipAdministrativeFinalizationIntents", "membershipLifecycleGuards", "activeMembershipGuards", "memberships", "groupJoinRequestDecisionIntents", "groupJoinRequestApprovalCoordinations", "pendingGroupJoinRequestGuards", "groupJoinRequests", "openSeasonGuards", "seasonCreationIntents", "seasons", "groupCreationGuards", "groups", "personas"];
    for (const collection of collections) { const snapshot = await db.collection(collection).get(); const batch = db.batch(); for (const document of snapshot.docs) if (collection.startsWith("activeRoster") || document.id.startsWith("iux-06c2-p01-empty") || document.id === groupId || document.id === seasonId || document.id === owner.uid) batch.delete(document.ref); await batch.commit(); }
    await db.collection("users").doc(owner.uid).delete().catch(() => {}); await db.collection("users").doc(candidate.uid).delete().catch(() => {});
    await auth.deleteUsers([owner.uid, candidate.uid]); await app.delete();
  }
});
