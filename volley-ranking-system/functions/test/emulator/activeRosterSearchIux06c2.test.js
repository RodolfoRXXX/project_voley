"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { activeMembershipGuardId } = require("../../src/memberships/application/membershipHashing");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const value = await response.text(); return value ? JSON.parse(value) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=iux-06c2-p02`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "IUX-06C2-P02-password!", returnSecureToken: true }),
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

test("IUX-06C2 P02 busca todo el padrón por prefijo normalizado, pagina sin duplicados y acompaña altas y bajas", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-06c2-p02-active-roster-search");
  const db = app.firestore(); const auth = app.auth(); const T = admin.firestore.Timestamp;
  const owner = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06c2-p02-owner@example.invalid");
  const visitor = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06c2-p02-visitor@example.invalid");
  const groupId = "iux-06c2-p02-group", seasonId = "iux-06c2-p02-season", ownerPersonId = "iux-06c2-p02-owner-person";
  const at = T.fromMillis(30_000); const call = (name, data, actor = owner) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, actor.idToken);
  try {
    await db.collection("users").doc(owner.uid).set({ nombre: "Owner", email: owner.email, photoURL: "", personaId: ownerPersonId, createdAt: at });
    await db.collection("users").doc(visitor.uid).set({ nombre: "Visitor", email: visitor.email, photoURL: "", createdAt: at });
    await db.collection("personas").doc(ownerPersonId).set({ nombre: "Olivia", apellido: "Owner", emailContacto: owner.email, createdAt: at });
    await db.collection("groups").doc(groupId).set({ nombre: groupId, deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: at, schemaVersion: 1 });
    await db.collection("seasons").doc(seasonId).set({ groupId, nombre: "Temporada", fechaInicio: "2026-01-01", estado: "abierta", createdAt: at, schemaVersion: 1 });
    await db.collection("openSeasonGuards").doc(groupId).set({ seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 });

    const batch = db.batch();
    for (let index = 0; index < 27; index += 1) {
      const membershipId = `iux-06c2-p02-membership-${String(index).padStart(2, "0")}`;
      const personId = `iux-06c2-p02-person-${String(index).padStart(2, "0")}`;
      const paredes = index === 0; const paris = index === 1; const special = index === 24;
      const duplicateWords = index === 25;
      const firstName = paredes ? "Jorge" : paris ? "Paula" : special ? "María de los Ángeles" : duplicateWords ? "María" : `Ana Nombre ${index}`;
      const lastName = paredes ? "Paredes" : paris ? "Paris" : special ? "Álvarez del Río" : duplicateWords ? "Martínez" : `Apellido ${index}`;
      batch.set(db.collection("personas").doc(personId), { nombre: firstName, apellido: lastName, emailContacto: `p${index}@example.invalid`, createdAt: at });
      batch.set(db.collection("memberships").doc(membershipId), { personId, groupId, seasonId, estado: "activa", fechaIngreso: T.fromMillis(31_000 + index), createdAt: T.fromMillis(31_000 + index), schemaVersion: 1 });
      batch.set(db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)), { membershipId, personId, groupId, seasonId, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: T.fromMillis(31_000 + index), guardVersion: 1 });
    }
    await batch.commit();

    const firstRosterPage = await call("listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 20 });
    assert.equal(firstRosterPage.status, 200, JSON.stringify(firstRosterPage.body));
    assert.equal(firstRosterPage.body.result.items.some((item) => item.membershipId.endsWith("24")), false);

    for (const term of ["ang", "ALV", "rio"]) {
      const result = await call("listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 5, search: term });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.result.projection.status, "READY");
      assert.deepEqual(result.body.result.items.map((item) => item.membershipId), ["iux-06c2-p02-membership-24"]);
    }
    const duplicate = await call("listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 5, search: "mar" });
    assert.equal(new Set(duplicate.body.result.items.map((item) => item.membershipId)).size, duplicate.body.result.items.length);
    assert.deepEqual(new Set(duplicate.body.result.items.map((item) => item.membershipId)), new Set(["iux-06c2-p02-membership-24", "iux-06c2-p02-membership-25"]));

    const par = await call("listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 5, search: "par" });
    assert.deepEqual(new Set(par.body.result.items.map((item) => item.membershipId)), new Set(["iux-06c2-p02-membership-00", "iux-06c2-p02-membership-01"]));
    const pari = await call("listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 5, search: "pari" });
    assert.deepEqual(pari.body.result.items.map((item) => item.membershipId), ["iux-06c2-p02-membership-01"]);
    const parix = await call("listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 5, search: "parix" });
    assert.deepEqual(parix.body.result.items, []); assert.equal(parix.body.result.projection.status, "READY");

    let cursor; const anaIds = [];
    do {
      const page = await call("listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 7, search: "ana", ...(cursor ? { cursor } : {}) });
      assert.equal(page.status, 200, JSON.stringify(page.body)); anaIds.push(...page.body.result.items.map((item) => item.membershipId)); cursor = page.body.result.nextCursor;
    } while (cursor);
    assert.equal(anaIds.length, 23); assert.equal(new Set(anaIds).size, 23);

    const denied = await call("listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 5, search: "ana" }, visitor);
    assert.equal(denied.body.error.details.reason, "GROUP_NOT_ACCESSIBLE");

    const created = await call("createMyMembershipForOwnedGroup", { groupId, idempotencyKey: "iux-06c2-p02-owner-create" });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    const afterCreate = await call("listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 5, search: "oli" });
    assert.deepEqual(afterCreate.body.result.items.map((item) => item.membershipId), [created.body.result.membership.id]);
    const finalized = await call("finalizeMyMembershipForOwnedGroup", { groupId });
    assert.equal(finalized.status, 200, JSON.stringify(finalized.body));
    const afterFinalize = await call("listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 5, search: "oli" });
    assert.deepEqual(afterFinalize.body.result.items, []); assert.equal(afterFinalize.body.result.projection.status, "READY");
  } finally {
    for (const collection of ["activeRosterSearchEntries", "activeRosterSearchSummaries", "activeRosterContributions", "activeRosterSummaries", "membershipLifecycleGuards", "activeMembershipGuards", "memberships", "openSeasonGuards", "seasons", "groups", "personas"]) {
      const snapshot = await db.collection(collection).get(); const cleanup = db.batch();
      for (const document of snapshot.docs) if (collection.startsWith("activeRoster") || document.id.startsWith("iux-06c2-p02")) cleanup.delete(document.ref);
      await cleanup.commit();
    }
    await db.collection("users").doc(owner.uid).delete().catch(() => {}); await db.collection("users").doc(visitor.uid).delete().catch(() => {});
    await auth.deleteUsers([owner.uid, visitor.uid]); await app.delete();
  }
});
