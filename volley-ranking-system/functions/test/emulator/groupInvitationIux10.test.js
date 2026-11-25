"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { pendingGroupJoinRequestGuardId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
async function json(response) { const value = await response.text(); return value ? JSON.parse(value) : null; }
async function signUp(host, email) { const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=iux-10`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "IUX-10-synthetic-password!", returnSecureToken: true }) }); const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email }; }
async function invoke(host, projectId, name, data, token) { const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ data }) }); return { status: response.status, body: await json(response) }; }

test("IUX-10 integra opt-in, exclusión, carreras y recuperación canónica", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "iux-10-invitations"); const db = app.firestore(); const T = admin.firestore.Timestamp;
  const [owner, candidate] = await Promise.all([signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-10-owner@example.invalid"), signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-10-candidate@example.invalid")]);
  const personId = "iux-10-person", groupId = "iux-10-group", seasonId = "iux-10-season", at = T.fromMillis(1_000);
  const call = (name, data, actor) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, actor.idToken);
  try {
    await Promise.all([
      db.collection("users").doc(owner.uid).set({ nombre: "Owner", email: owner.email, photoURL: "", createdAt: at }),
      db.collection("users").doc(candidate.uid).set({ nombre: "Candidate", email: candidate.email, photoURL: "", personaId: personId, createdAt: at }),
      db.collection("personas").doc(personId).set({ nombre: "Ángela María", apellido: "García", emailContacto: candidate.email, createdAt: at }),
      db.collection("groups").doc(groupId).set({ nombre: "Grupo IUX-10", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: at, schemaVersion: 1 }),
      db.collection("seasons").doc(seasonId).set({ groupId, nombre: "Temporada IUX-10", fechaInicio: "2026-01-01", estado: "abierta", createdAt: at, schemaVersion: 1 }),
      db.collection("openSeasonGuards").doc(groupId).set({ seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 }),
    ]);
    const initial = await call("getMyPersonDiscoverability", {}, candidate); assert.deepEqual(initial.body.result, { enabled: false, canEnable: true, contactEmail: candidate.email });
    assert.equal((await call("setMyPersonDiscoverability", { enabled: true }, candidate)).body.result.enabled, true);
    const found = await call("searchDiscoverablePeopleForOwnedGroup", { groupId, query: "GAR", pageSize: 10 }, owner); assert.equal(found.status, 200, JSON.stringify(found.body)); assert.equal(found.body.result.items.length, 1); assert.equal(found.body.result.items[0].state, "AVAILABLE");
    const payload = { groupId, candidateRef: found.body.result.items[0].candidateRef, idempotencyKey: "iux-10-create-00000001" };
    const creates = await Promise.all([call("createGroupInvitation", payload, owner), call("createGroupInvitation", payload, owner)]); assert.equal(new Set(creates.map((result) => result.body.result.invitation.invitationId)).size, 1);
    const invitationId = creates[0].body.result.invitation.invitationId; const guardId = pendingGroupJoinRequestGuardId(groupId, personId); assert.equal((await db.collection("pendingGroupJoinRequestGuards").doc(guardId).get()).data().guardVersion, 2);
    const v2Pending = await call("listMyDashboardTasks", { coverage: "N20_N31_N42_V2" }, candidate); assert.equal(v2Pending.body.result.coverage.version, "N20_N31_N42_V2", JSON.stringify(v2Pending.body)); assert.equal(v2Pending.body.result.items.some((item) => item.kind === "N42" && item.resourceId === invitationId), true);
    const v1Compatible = await call("listMyDashboardTasks", { coverage: "N20_N31_V1" }, candidate); assert.equal(v1Compatible.body.result.coverage.version, "N20_N31_V1"); assert.equal(v1Compatible.body.result.items.some((item) => item.kind === "N42"), false);
    const [accepted, cancelled] = await Promise.all([call("acceptMyGroupInvitation", { invitationId, idempotencyKey: "iux-10-accept-00000001" }, candidate), call("cancelGroupInvitation", { invitationId, idempotencyKey: "iux-10-cancel-00000001" }, owner)]);
    const invitation = (await db.collection("groupInvitations").doc(invitationId).get()).data(); assert.ok(["accepted", "cancelled"].includes(invitation.status)); assert.equal([accepted, cancelled].filter((result) => result.body.result).length, 1); assert.equal((await db.collection("pendingGroupJoinRequestGuards").doc(guardId).get()).exists, false);
    const v2Resolved = await call("listMyDashboardTasks", { coverage: "N20_N31_N42_V2" }, candidate); assert.equal(v2Resolved.body.result.items.some((item) => item.kind === "N42" && item.resourceId === invitationId), false);
    if (invitation.status === "accepted") { const active = await db.collection("memberships").where("personId", "==", personId).where("groupId", "==", groupId).where("estado", "==", "activa").get(); assert.equal(active.size, 1); const retry = await call("acceptMyGroupInvitation", { invitationId, idempotencyKey: "iux-10-accept-00000001" }, candidate); assert.ok(["ACCEPTED", "RECOVERED"].includes(retry.body.result.outcome)); }
    const terminal = async (suffix, action) => { const nextGroup = `${groupId}-${suffix}`, nextSeason = `${seasonId}-${suffix}`; await Promise.all([db.collection("groups").doc(nextGroup).set({ nombre: `Grupo ${suffix}`, deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: at, schemaVersion: 1 }), db.collection("seasons").doc(nextSeason).set({ groupId: nextGroup, nombre: `Temporada ${suffix}`, fechaInicio: "2026-01-01", estado: "abierta", createdAt: at, schemaVersion: 1 }), db.collection("openSeasonGuards").doc(nextGroup).set({ seasonId: nextSeason, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: at, guardVersion: 1 })]); const candidatePage = await call("searchDiscoverablePeopleForOwnedGroup", { groupId: nextGroup, query: "gar", pageSize: 10 }, owner); const created = await call("createGroupInvitation", { groupId: nextGroup, candidateRef: candidatePage.body.result.items[0].candidateRef, idempotencyKey: `iux-10-${suffix}-create-0001` }, owner); const id = created.body.result.invitation.invitationId; assert.equal((await call("listMyDashboardTasks", { coverage: "N20_N31_N42_V2" }, candidate)).body.result.items.some((item) => item.resourceId === id), true); if (action === "cancel") await call("cancelGroupInvitation", { invitationId: id, idempotencyKey: `iux-10-${suffix}-cancel-0001` }, owner); else if (action === "decline") await call("declineMyGroupInvitation", { invitationId: id, idempotencyKey: `iux-10-${suffix}-decline-0001` }, candidate); else { await db.collection("seasons").doc(nextSeason).update({ estado: "cerrada" }); await db.collection("openSeasonGuards").doc(nextGroup).delete(); } const page = await call("listMyDashboardTasks", { coverage: "N20_N31_N42_V2" }, candidate); assert.equal(page.body.result.items.some((item) => item.resourceId === id), false); return { id, nextGroup, nextSeason }; };
    await terminal("cancel", "cancel"); await terminal("decline", "decline"); const expired = await terminal("expire", "expire"); assert.equal((await db.collection("groupInvitations").doc(expired.id).get()).data().status, "expired");
    const paginationGroup = `${groupId}-pagination`, paginationSeason = `${seasonId}-pagination`;
    await Promise.all([
      db.collection("groups").doc(paginationGroup).set({ nombre: "Grupo paginación", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: at, schemaVersion: 1 }),
      db.collection("seasons").doc(paginationSeason).set({ groupId: paginationGroup, nombre: "Temporada paginación", fechaInicio: "2026-01-01", estado: "abierta", createdAt: at, schemaVersion: 1 }),
      db.collection("openSeasonGuards").doc(paginationGroup).set({ seasonId: paginationSeason, idempotencyKeyHash: "e".repeat(64), requestHash: "f".repeat(64), createdAt: at, guardVersion: 1 }),
    ]);
    const mixedStatuses = ["expired", "cancelled", "declined", "accepted", "expired", "cancelled", "declined", "pending", "pending", "pending", "pending", "pending", "pending"];
    const batch = db.batch();
    for (let index = 0; index < mixedStatuses.length; index += 1) {
      const suffix = String(index).padStart(2, "0"), syntheticPersonId = `iux-10-page-person-${suffix}`, invitationRef = db.collection("groupInvitations").doc(`iux-10-page-invitation-${suffix}`);
      batch.set(db.collection("personas").doc(syntheticPersonId), { nombre: `Persona ${suffix}`, apellido: "Sintética", emailContacto: `iux-10-page-${suffix}@example.invalid`, createdAt: at });
      batch.set(invitationRef, { personId: syntheticPersonId, groupId: paginationGroup, seasonId: paginationSeason, invitedBy: owner.uid, status: mixedStatuses[index], createdAt: T.fromMillis(10_000 + index * 1_000), schemaVersion: mixedStatuses[index] === "pending" ? 1 : 2 });
    }
    await batch.commit();
    const firstPage = await call("listGroupInvitationsForOwnedGroup", { groupId: paginationGroup, pageSize: 5 }, owner);
    assert.equal(firstPage.status, 200, JSON.stringify(firstPage.body)); assert.equal(firstPage.body.result.items.length, 5); assert.ok(firstPage.body.result.items.every((item) => item.status === "pending")); assert.ok(firstPage.body.result.nextCursor);
    await db.collection("groupInvitations").doc("iux-10-page-invitation-12").update({ status: "accepted", acceptedAt: T.fromMillis(30_000), schemaVersion: 2 });
    const secondPage = await call("listGroupInvitationsForOwnedGroup", { groupId: paginationGroup, pageSize: 5, cursor: firstPage.body.result.nextCursor }, owner);
    assert.equal(secondPage.body.result.items.length, 5); assert.ok(secondPage.body.result.nextCursor); assert.equal(secondPage.body.result.items.some((item) => item.invitationId === "iux-10-page-invitation-12" && item.status === "accepted"), true);
    const thirdPage = await call("listGroupInvitationsForOwnedGroup", { groupId: paginationGroup, pageSize: 5, cursor: secondPage.body.result.nextCursor }, owner);
    assert.equal(thirdPage.body.result.items.length, 4); assert.equal(thirdPage.body.result.nextCursor, undefined);
    const refreshed = await call("listGroupInvitationsForOwnedGroup", { groupId: paginationGroup, pageSize: 5 }, owner);
    assert.equal(refreshed.body.result.items.length, 5); assert.ok(refreshed.body.result.items.every((item) => item.status === "pending"));
    const combined = [...firstPage.body.result.items, ...secondPage.body.result.items, ...thirdPage.body.result.items];
    const latestById = new Map(combined.map((item) => [item.invitationId, item]));
    assert.equal(latestById.size, 13); assert.equal(latestById.get("iux-10-page-invitation-12").status, "accepted");
    const archivedPendingId = "iux-10-page-invitation-07", archivedPendingPerson = "iux-10-page-person-07";
    await db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(paginationGroup, archivedPendingPerson)).set({ resourceId: archivedPendingId, personId: archivedPendingPerson, groupId: paginationGroup, kind: "GROUP_INVITATION", createdAt: at, guardVersion: 2 });
    await db.collection("groups").doc(paginationGroup).update({ estado: "archivado", archivedAt: T.fromMillis(40_000), schemaVersion: 2 });
    const archivedPage = await call("listGroupInvitationsForOwnedGroup", { groupId: paginationGroup, pageSize: 5 }, owner); assert.equal(archivedPage.status, 200, JSON.stringify(archivedPage.body));
    const archivedCancellation = await call("cancelGroupInvitation", { invitationId: archivedPendingId, idempotencyKey: "iux-11a1-archived-cancel-01" }, owner); assert.equal(archivedCancellation.status, 200, JSON.stringify(archivedCancellation.body)); assert.equal((await db.collection("groupInvitations").doc(archivedPendingId).get()).data().status, "cancelled");
    await call("setMyPersonDiscoverability", { enabled: false }, candidate); const removed = await call("searchDiscoverablePeopleForOwnedGroup", { groupId, query: "gar", pageSize: 10 }, owner); assert.equal(removed.body.result.items.length, 0);
  } finally { await app.delete(); }
});
