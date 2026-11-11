"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { activeMembershipGuardId, membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");
const { pendingGroupJoinRequestGuardId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=iux-06b-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "IUX-06B-password!", returnSecureToken: true }) });
  const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email };
}
async function invoke(host, projectId, name, data, token) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ data }) });
  return { status: response.status, body: await json(response) };
}

test("IUX-06B compone actuales, pendientes e historial paginado con autoridad propia", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "iux-06b-mis-grupos");
  const db = app.firestore(); const auth = app.auth(); const fixtures = createFirestoreFixtureRegistry(db); const T = admin.firestore.Timestamp;
  const [ownerMember, ownerNoPerson, candidate, other] = await Promise.all([
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06b-owner-member@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06b-owner-no-person@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06b-candidate@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06b-other@example.invalid"),
  ]);
  const person = "iux-06b-person"; const ownerPerson = "iux-06b-owner-person"; const otherPerson = "iux-06b-other-person"; const at = (ms) => T.fromMillis(ms);
  const call = (name, data, actor) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, actor.idToken);
  const set = (collection, id, data) => fixtures.set(db.collection(collection).doc(id), data);
  try {
    await Promise.all([
      set("users", ownerMember.uid, { nombre: "Owner member", email: ownerMember.email, photoURL: "", personaId: ownerPerson, createdAt: at(10) }),
      set("personas", ownerPerson, { nombre: "Ona", apellido: "Owner", emailContacto: ownerMember.email, createdAt: at(10) }),
      set("users", ownerNoPerson.uid, { nombre: "Owner", email: ownerNoPerson.email, photoURL: "", createdAt: at(10) }),
      set("users", candidate.uid, { nombre: "Candidate", email: candidate.email, photoURL: "", personaId: person, createdAt: at(10) }),
      set("personas", person, { nombre: "Cata", apellido: "Candidata", emailContacto: candidate.email, createdAt: at(10) }),
      set("users", other.uid, { nombre: "Other", email: other.email, photoURL: "", personaId: otherPerson, createdAt: at(10) }),
      set("personas", otherPerson, { nombre: "Otra", apellido: "Cuenta", emailContacto: other.email, createdAt: at(10) }),
    ]);

    const sharedGroup = "iux-06b-shared"; const sharedSeason = "iux-06b-shared-season"; const sharedMembership = "iux-06b-shared-membership";
    await set("groups", sharedGroup, { nombre: "Doble relación", deporte: "futbol", ownerId: ownerMember.uid, estado: "activo", createdAt: at(100), schemaVersion: 1 });
    await set("seasons", sharedSeason, { groupId: sharedGroup, nombre: "Temporada actual", fechaInicio: "2026-01-01", estado: "abierta", createdAt: at(100), schemaVersion: 1 });
    await set("openSeasonGuards", sharedGroup, { seasonId: sharedSeason, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at(100), guardVersion: 1 });
    await set("memberships", sharedMembership, { personId: ownerPerson, groupId: sharedGroup, seasonId: sharedSeason, estado: "activa", fechaIngreso: at(200), createdAt: at(200), schemaVersion: 1 });
    await set("activeMembershipGuards", activeMembershipGuardId(sharedGroup, ownerPerson), { membershipId: sharedMembership, personId: ownerPerson, groupId: sharedGroup, seasonId: sharedSeason, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: at(200), guardVersion: 1 });
    const noPersonGroup = "iux-06b-owner-no-person-group";
    await set("groups", noPersonGroup, { nombre: "Administrado sin Persona", deporte: "otro", ownerId: ownerNoPerson.uid, estado: "activo", createdAt: at(100), schemaVersion: 1 });

    const owned = await call("listOwnGroups", {}, ownerMember); const current = await call("listMyCurrentGroupMemberships", { pageSize: 5 }, ownerMember);
    assert.equal(owned.body.result.items.filter((item) => item.id === sharedGroup).length, 1);
    assert.equal(current.body.result.items.filter((item) => item.group.id === sharedGroup).length, 1);
    const { filterPresentableGroups, mergePresentableGroups } = await import("../../../../volley-ranking-frontend/src/services/groupsPresentation.mjs");
    const presentable = mergePresentableGroups(owned.body.result.items, current.body.result.items);
    assert.equal(presentable.filter((item) => item.groupId === sharedGroup).length, 1);
    assert.deepEqual(presentable.find((item) => item.groupId === sharedGroup), {
      groupId: sharedGroup,
      name: "Doble relación",
      sport: "futbol",
      state: "activo",
      administers: true,
      participates: true,
      membershipId: sharedMembership,
      membershipKey: `${sharedGroup}\0${sharedSeason}\0${new Date(200).toISOString()}`,
    });
    assert.equal(filterPresentableGroups(presentable, "admin").some((item) => item.groupId === sharedGroup), true);
    assert.equal(filterPresentableGroups(presentable, "member").some((item) => item.groupId === sharedGroup), true);
    assert.equal(filterPresentableGroups(presentable, "all").filter((item) => item.groupId === sharedGroup).length, 1);
    const noPersonOwned = await call("listOwnGroups", {}, ownerNoPerson);
    assert.equal(noPersonOwned.body.result.items.some((item) => item.id === noPersonGroup), true);
    const adminOnly = mergePresentableGroups(noPersonOwned.body.result.items, []);
    assert.equal(filterPresentableGroups(adminOnly, "admin").some((item) => item.groupId === noPersonGroup), true);
    assert.equal(filterPresentableGroups(adminOnly, "member").some((item) => item.groupId === noPersonGroup), false);
    assert.equal(filterPresentableGroups(adminOnly, "all").filter((item) => item.groupId === noPersonGroup).length, 1);

    const requestIds = [];
    for (let index = 0; index < 7; index += 1) {
      const suffix = String(index).padStart(2, "0"); const groupId = `iux-06b-request-group-${suffix}`; const requestId = `iux-06b-request-${suffix}`; requestIds.push({ groupId, requestId });
      await set("groups", groupId, { nombre: `Grupo solicitud ${suffix}`, deporte: "voleibol", ownerId: ownerMember.uid, estado: "activo", createdAt: at(300), schemaVersion: 1 });
      await set("groupJoinRequests", requestId, { personId: person, groupId, estado: "pendiente", createdAt: at(1000 - index), schemaVersion: 1 });
      await set("pendingGroupJoinRequestGuards", pendingGroupJoinRequestGuardId(groupId, person), { requestId, personId: person, groupId, createdAt: at(1000 - index), guardVersion: 1 });
    }
    const first = await call("listMyPendingGroupJoinRequests", { pageSize: 5 }, candidate);
    assert.equal(first.body.result.items.length, 5, JSON.stringify(first.body)); assert.equal(typeof first.body.result.nextCursor, "string");
    const reloaded = await call("listMyPendingGroupJoinRequests", { pageSize: 5 }, candidate);
    assert.equal(reloaded.body.result.items.filter((item) => item.id === first.body.result.items[0].id).length, 1);
    const second = await call("listMyPendingGroupJoinRequests", { pageSize: 5, cursor: first.body.result.nextCursor }, candidate);
    assert.equal(second.body.result.items.length, 2); assert.equal(second.body.result.nextCursor, null);
    assert.deepEqual((await call("listMyPendingGroupJoinRequests", {}, other)).body.result, { items: [], nextCursor: null });

    const cancelledItem = first.body.result.items[0];
    const cancelled = await call("cancelMyGroupJoinRequest", { groupId: cancelledItem.group.id, requestId: cancelledItem.id }, candidate);
    assert.equal(cancelled.body.result.outcome, "CANCELLED");
    const afterCancel = await call("listMyPendingGroupJoinRequests", { pageSize: 5 }, candidate);
    assert.equal(afterCancel.body.result.items.some((item) => item.id === cancelledItem.id), false);

    const concurrent = requestIds[1];
    await db.collection("groupJoinRequests").doc(concurrent.requestId).set({ personId: person, groupId: concurrent.groupId, estado: "aprobada", createdAt: at(999), decisionIntentId: "iux-06b-decision-intent", decidedBy: ownerMember.uid, decidedAt: at(1100), membershipId: "iux-06b-approved-membership", schemaVersion: 2 });
    await db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(concurrent.groupId, person)).delete();
    const approvedSeason = "iux-06b-approved-season"; const approvedMembership = "iux-06b-approved-membership";
    await set("seasons", approvedSeason, { groupId: concurrent.groupId, nombre: "Temporada aprobada", fechaInicio: "2026-01-01", estado: "abierta", createdAt: at(1000), schemaVersion: 1 });
    await set("openSeasonGuards", concurrent.groupId, { seasonId: approvedSeason, idempotencyKeyHash: "e".repeat(64), requestHash: "f".repeat(64), createdAt: at(1000), guardVersion: 1 });
    await set("memberships", approvedMembership, { personId: person, groupId: concurrent.groupId, seasonId: approvedSeason, estado: "activa", fechaIngreso: at(1100), createdAt: at(1100), schemaVersion: 1 });
    await set("activeMembershipGuards", activeMembershipGuardId(concurrent.groupId, person), { membershipId: approvedMembership, personId: person, groupId: concurrent.groupId, seasonId: approvedSeason, idempotencyKeyHash: "1".repeat(64), requestHash: "2".repeat(64), createdAt: at(1100), guardVersion: 1 });
    const race = await call("cancelMyGroupJoinRequest", { groupId: concurrent.groupId, requestId: concurrent.requestId }, candidate);
    assert.equal(race.body.error.details.reason, "DECISION_ALREADY_APPROVED");
    const afterApproval = await call("listMyPendingGroupJoinRequests", { pageSize: 5 }, candidate);
    assert.equal(afterApproval.body.result.items.some((item) => item.id === concurrent.requestId), false);
    const currentAfterApproval = await call("listMyCurrentGroupMemberships", { pageSize: 5 }, candidate);
    assert.equal(currentAfterApproval.body.result.items.some((item) => item.group.id === concurrent.groupId), true);

    const historyGroup = "iux-06b-history-group"; const historySeason = "iux-06b-history-season";
    await set("groups", historyGroup, { nombre: "Grupo histórico", deporte: "voleibol", ownerId: ownerMember.uid, estado: "activo", createdAt: at(10), schemaVersion: 1 });
    await set("seasons", historySeason, { groupId: historyGroup, nombre: "Temporada histórica", fechaInicio: "2025-01-01", estado: "cerrada", createdAt: at(10), closedAt: at(9000), closedBy: ownerMember.uid, schemaVersion: 2 });
    for (let index = 0; index < 7; index += 1) {
      const id = `iux-06b-history-${String(index).padStart(2, "0")}`; const end = index < 2 ? at(8000) : at(8000 - index);
      if (index === 0) {
        const firstId = membershipValidityPeriodId(id, 1); const latestId = membershipValidityPeriodId(id, 2);
        await fixtures.set(db.collection("memberships").doc(id).collection("validityPeriods").doc(firstId), { ordinal: 1, estado: "cerrado", startedAt: at(100), endedAt: at(200), periodSchemaVersion: 1 });
        await fixtures.set(db.collection("memberships").doc(id).collection("validityPeriods").doc(latestId), { ordinal: 2, estado: "cerrado", startedAt: at(7000), endedAt: end, periodSchemaVersion: 1 });
        await set("memberships", id, { personId: person, groupId: historyGroup, seasonId: historySeason, estado: "finalizada", fechaIngreso: at(100), fechaEgreso: end, createdAt: at(100), latestPeriodId: latestId, periodCount: 2, schemaVersion: 3 });
      } else await set("memberships", id, { personId: person, groupId: historyGroup, seasonId: historySeason, estado: "finalizada", fechaIngreso: at(100 + index), fechaEgreso: end, createdAt: at(100 + index), schemaVersion: 2 });
    }
    const historyFirst = await call("listMyGroupMembershipHistory", { pageSize: 5 }, candidate);
    assert.equal(historyFirst.body.result.items.length, 5, JSON.stringify(historyFirst.body)); assert.equal(typeof historyFirst.body.result.nextCursor, "string");
    assert.equal(historyFirst.body.result.items.find((item) => item.validityPeriodCount === 2).joinedAt, at(7000).toDate().toISOString());
    const historySecond = await call("listMyGroupMembershipHistory", { pageSize: 5, cursor: historyFirst.body.result.nextCursor }, candidate);
    assert.equal(historySecond.body.result.items.length, 2); assert.equal(historySecond.body.result.nextCursor, null);
    const allHistory = [...historyFirst.body.result.items, ...historySecond.body.result.items];
    assert.equal(new Set(allHistory.map((item) => item.rowKey)).size, 7);
    assert.deepEqual(allHistory.slice(0, 2).map((item) => item.joinedAt), [at(101).toDate().toISOString(), at(7000).toDate().toISOString()]);
    assert.deepEqual((await call("listMyGroupMembershipHistory", { pageSize: 5 }, other)).body.result, { items: [], nextCursor: null, hasMore: false });
  } finally {
    await fixtures.cleanup(); await auth.deleteUsers([ownerMember.uid, ownerNoPerson.uid, candidate.uid, other.uid]); await app.delete();
  }
});
