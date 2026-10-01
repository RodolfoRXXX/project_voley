"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { activeMembershipGuardId, membershipCargoUpdateReceiptId } = require("../../src/memberships/application/membershipHashing");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");

async function json(response) { const value = await response.text(); return value ? JSON.parse(value) : null; }
async function signUp(host, name) {
  const email = `e2-22a-${name}@example.invalid`;
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-22a-synthetic-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-22A-synthetic-password!", returnSecureToken: true }) });
  const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email };
}
async function invoke(host, projectId, name, data, actor) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", ...(actor ? { Authorization: `Bearer ${actor.idToken}` } : {}) }, body: JSON.stringify({ data }) });
  return { status: response.status, body: await json(response) };
}
async function direct(host, projectId, path, actor) {
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { headers: actor ? { Authorization: `Bearer ${actor.idToken}` } : {} }); return response.status;
}

test("E2-22A cargo Owner es privado, transaccional, concurrente y recuperable", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST; const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST; const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e2-22a-cargo-integration"); const db = app.firestore(); const T = admin.firestore.Timestamp; const fixtures = createFirestoreFixtureRegistry(db);
  const [owner, nextOwner, member] = await Promise.all([signUp(authHost, "owner"), signUp(authHost, "next-owner"), signUp(authHost, "member")]);
  const at = T.fromMillis(1_700_000_000_000); const groupId = "e2-22a-group"; const seasonId = "e2-22a-season";
  const persons = { owner: "e2-22a-person-owner", next: "e2-22a-person-next", member: "e2-22a-person-member", corrupt: "e2-22a-person-corrupt", race: "e2-22a-person-race", finalizedRace: "e2-22a-person-finalized-race", transferRace: "e2-22a-person-transfer-race", closed: "e2-22a-person-closed" };
  const account = (actor, personId) => ({ nombre: actor.email, email: actor.email, photoURL: "", createdAt: at, personaId: personId });
  const person = (name) => ({ nombre: name, apellido: "Cargo", emailContacto: `${name.toLowerCase()}@example.invalid`, createdAt: at });
  async function seedV1(membershipId, personId) {
    await fixtures.set(db.collection("memberships").doc(membershipId), { personId, groupId, seasonId, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 });
    await fixtures.set(db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)), { membershipId, personId, groupId, seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 });
  }
  const call = (name, data, actor = owner) => invoke(functionsHost, projectId, name, data, actor);
  try {
    await Promise.all([
      fixtures.set(db.collection("users").doc(owner.uid), account(owner, persons.owner)), fixtures.set(db.collection("users").doc(nextOwner.uid), account(nextOwner, persons.next)), fixtures.set(db.collection("users").doc(member.uid), account(member, persons.member)),
      fixtures.set(db.collection("personas").doc(persons.owner), person("Olivia")), fixtures.set(db.collection("personas").doc(persons.next), person("Nora")), fixtures.set(db.collection("personas").doc(persons.member), person("Mara")), fixtures.set(db.collection("personas").doc(persons.corrupt), person("Cora")), fixtures.set(db.collection("personas").doc(persons.race), person("Rita")), fixtures.set(db.collection("personas").doc(persons.finalizedRace), person("Fina")), fixtures.set(db.collection("personas").doc(persons.transferRace), person("Tara")), fixtures.set(db.collection("personas").doc(persons.closed), person("Celia")),
      fixtures.set(db.collection("groups").doc(groupId), { nombre: "Grupo E2-22A", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("seasons").doc(seasonId), { groupId, nombre: "Temporada E2-22A", fechaInicio: "2026-09-30", estado: "abierta", createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("openSeasonGuards").doc(groupId), { seasonId, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: at, guardVersion: 1 }),
    ]);

    await t.test("v1 evoluciona a v5 legacy, roster Owner ve cargo y receipt queda deny-all", async () => {
      const membershipId = "e2-22a-main"; const key = "e2-22a-main-update-key"; await seedV1(membershipId, persons.member);
      const prepared = await call("getMembershipCargoForOwnedGroup", { groupId, membershipId }); assert.equal(prepared.status, 200, JSON.stringify(prepared.body)); assert.equal(prepared.body.result.membership.cargo, null);
      const updated = await call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo: "  Delegado\u00a0general  ", editToken: prepared.body.result.editToken, idempotencyKey: key });
      assert.equal(updated.body.result.outcome, "UPDATED", JSON.stringify(updated.body)); assert.equal(updated.body.result.appliedEffect.cargo, "Delegado general"); assert.equal(updated.body.result.recovered, false);
      const root = (await db.collection("memberships").doc(membershipId).get()).data(); assert.equal(root.schemaVersion, 5); assert.equal(root.cargo, "Delegado general"); assert.equal(Object.hasOwn(root, "periodCount"), false); assert.equal((await db.collection("memberships").doc(membershipId).collection("validityPeriods").get()).empty, true);
      const roster = await call("listActiveGroupMembersForOwnedGroup", { groupId }); assert.equal(roster.body.result.items.find((item) => item.membershipId === membershipId).cargo, "Delegado general");
      const receiptId = membershipCargoUpdateReceiptId(owner.uid, key); assert.equal(await direct(firestoreHost, projectId, `membershipCargoUpdateReceipts/${receiptId}`, owner), 403); assert.equal((await db.collection("membershipCargoUpdateReceipts").doc(receiptId).get()).exists, true);

      const finalization = (await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId })).body.result;
      const finalized = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef: finalization.activationRef, idempotencyKey: "e2-22a-finalize-key" }); assert.equal(finalized.body.result.outcome, "MEMBERSHIP_FINALIZATION_CONFIRMED");
      const after = (await db.collection("memberships").doc(membershipId).get()).data(); assert.equal(after.schemaVersion, 5); assert.equal(after.cargo, "Delegado general"); assert.equal(after.periodCount, 1);
      const recovered = await call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo: "Delegado general", editToken: prepared.body.result.editToken, idempotencyKey: key });
      assert.equal(recovered.body.result.recovered, true); assert.equal(recovered.body.result.appliedEffect.cargo, "Delegado general"); assert.equal(recovered.body.result.currentMembership.estado, "finalizada"); assert.equal(recovered.body.result.currentEditToken, null);
      await db.collection("groups").doc(groupId).update({ ownerId: nextOwner.uid }); const denied = await call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo: "Delegado general", editToken: prepared.body.result.editToken, idempotencyKey: key }); assert.equal(denied.body.error.details.reason, "GROUP_NOT_ACCESSIBLE"); await db.collection("groups").doc(groupId).update({ ownerId: owner.uid });
    });

    await t.test("v1-v4 permanecen cerrados ante un campo cargo contaminante", async () => {
      const membershipId = "e2-22a-corrupt-legacy";
      await fixtures.set(db.collection("memberships").doc(membershipId), { personId: persons.corrupt, groupId, seasonId, estado: "activa", fechaIngreso: at, createdAt: at, cargo: null, schemaVersion: 1 });
      await fixtures.set(db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, persons.corrupt)), { membershipId, personId: persons.corrupt, groupId, seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 });
      const result = await call("getMembershipCargoForOwnedGroup", { groupId, membershipId });
      assert.equal(result.body.error?.details?.reason, "INCOMPATIBLE_STATE", JSON.stringify(result.body));
    });

    await t.test("dos ediciones preparadas tienen un ganador y una stale sin lost update", async () => {
      const membershipId = "e2-22a-race"; await seedV1(membershipId, persons.race); const prepared = (await call("getMembershipCargoForOwnedGroup", { groupId, membershipId })).body.result;
      const results = await Promise.all(["Coordinador", "Delegado"].map((cargo, index) => call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo, editToken: prepared.editToken, idempotencyKey: `e2-22a-race-key-0${index}` })));
      assert.equal(results.filter((result) => result.body.result?.outcome === "UPDATED").length, 1, JSON.stringify(results)); assert.equal(results.filter((result) => result.body.error?.details?.reason === "EDIT_TOKEN_STALE").length, 1, JSON.stringify(results));
      const persisted = (await db.collection("memberships").doc(membershipId).get()).data(); assert.equal(["Coordinador", "Delegado"].includes(persisted.cargo), true); assert.equal((await db.collection("membershipCargoUpdateReceipts").where("membershipId", "==", membershipId).get()).size, 1);

      const removePrepared = (await call("getMembershipCargoForOwnedGroup", { groupId, membershipId })).body.result; const removeKey = "e2-22a-remove-key";
      const removed = await call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo: null, editToken: removePrepared.editToken, idempotencyKey: removeKey });
      assert.equal(removed.body.result.outcome, "UPDATED", JSON.stringify(removed.body)); assert.equal(Object.hasOwn((await db.collection("memberships").doc(membershipId).get()).data(), "cargo"), false);

      const noOpPrepared = (await call("getMembershipCargoForOwnedGroup", { groupId, membershipId })).body.result; const reusableKey = "e2-22a-noop-reusable-key";
      const noOp = await call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo: null, editToken: noOpPrepared.editToken, idempotencyKey: reusableKey });
      assert.equal(noOp.body.result.outcome, "NO_CHANGES", JSON.stringify(noOp.body)); assert.equal((await db.collection("membershipCargoUpdateReceipts").doc(membershipCargoUpdateReceiptId(owner.uid, reusableKey)).get()).exists, false);
      const reused = await call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo: "Enlace", editToken: noOpPrepared.editToken, idempotencyKey: reusableKey }); assert.equal(reused.body.result.outcome, "UPDATED", JSON.stringify(reused.body));
      const conflict = await call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo: "Otro", editToken: noOpPrepared.editToken, idempotencyKey: reusableKey }); assert.equal(conflict.body.error.details.reason, "IDEMPOTENCY_CONFLICT", JSON.stringify(conflict.body));
    });

    await t.test("edición y finalización concurrentes serializan y nunca pierden un cargo confirmado", async () => {
      const membershipId = "e2-22a-finalize-race"; await seedV1(membershipId, persons.finalizedRace);
      const cargoPrepared = (await call("getMembershipCargoForOwnedGroup", { groupId, membershipId })).body.result;
      const finalizationPrepared = (await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId })).body.result;
      const [edited, finalized] = await Promise.all([
        call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo: "Delegado", editToken: cargoPrepared.editToken, idempotencyKey: "e2-22a-finalize-race-edit" }),
        call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef: finalizationPrepared.activationRef, idempotencyKey: "e2-22a-finalize-race-end" }),
      ]);
      assert.equal(finalized.body.result?.outcome, "MEMBERSHIP_FINALIZATION_CONFIRMED", JSON.stringify(finalized.body));
      const root = (await db.collection("memberships").doc(membershipId).get()).data(); assert.equal(root.estado, "finalizada");
      if (edited.body.result?.outcome === "UPDATED") assert.equal(root.cargo, "Delegado");
      else { assert.equal(edited.body.error?.details?.reason, "TARGET_MEMBERSHIP_NOT_ACTIVE", JSON.stringify(edited.body)); assert.equal(Object.hasOwn(root, "cargo"), false); }
    });

    await t.test("edición y transferencia concurrentes revalidan al Owner dentro de la transacción", async () => {
      const membershipId = "e2-22a-transfer-race"; await seedV1(membershipId, persons.transferRace); const prepared = (await call("getMembershipCargoForOwnedGroup", { groupId, membershipId })).body.result;
      const [edited] = await Promise.all([
        call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo: "Enlace", editToken: prepared.editToken, idempotencyKey: "e2-22a-transfer-race-edit" }),
        db.collection("groups").doc(groupId).update({ ownerId: nextOwner.uid }),
      ]);
      const root = (await db.collection("memberships").doc(membershipId).get()).data();
      if (edited.body.result?.outcome === "UPDATED") assert.equal(root.cargo, "Enlace");
      else { assert.equal(edited.body.error?.details?.reason, "GROUP_NOT_ACCESSIBLE", JSON.stringify(edited.body)); assert.equal(Object.hasOwn(root, "cargo"), false); }
      const formerOwnerRetry = await call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo: "Enlace", editToken: prepared.editToken, idempotencyKey: "e2-22a-transfer-race-edit" }); assert.equal(formerOwnerRetry.body.error.details.reason, "GROUP_NOT_ACCESSIBLE");
      await db.collection("groups").doc(groupId).update({ ownerId: owner.uid });
    });

    await t.test("cierre de Temporada posterior a prepare bloquea sin receipt ni mutación", async () => {
      const membershipId = "e2-22a-closed"; const key = "e2-22a-closed-key"; await seedV1(membershipId, persons.closed); const prepared = (await call("getMembershipCargoForOwnedGroup", { groupId, membershipId })).body.result;
      const [edited] = await Promise.all([
        call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo: "Delegado", editToken: prepared.editToken, idempotencyKey: key }),
        db.runTransaction(async (transaction) => { transaction.update(db.collection("seasons").doc(seasonId), { estado: "cerrada" }); transaction.delete(db.collection("openSeasonGuards").doc(groupId)); }),
      ]);
      const root = (await db.collection("memberships").doc(membershipId).get()).data();
      if (edited.body.result?.outcome === "UPDATED") { assert.equal(root.cargo, "Delegado"); assert.equal((await db.collection("membershipCargoUpdateReceipts").doc(membershipCargoUpdateReceiptId(owner.uid, key)).get()).exists, true); }
      else { assert.equal(edited.body.error?.details?.reason, "MEMBERSHIP_SEASON_NOT_MODIFIABLE", JSON.stringify(edited.body)); assert.equal(Object.hasOwn(root, "cargo"), false); assert.equal((await db.collection("membershipCargoUpdateReceipts").doc(membershipCargoUpdateReceiptId(owner.uid, key)).get()).exists, false); }
      const retry = await call("updateMembershipCargoForOwnedGroup", { groupId, membershipId, cargo: "Delegado", editToken: prepared.editToken, idempotencyKey: key });
      if (edited.body.result?.outcome === "UPDATED") assert.equal(retry.body.result.recovered, true, JSON.stringify(retry.body)); else assert.equal(retry.body.error.details.reason, "MEMBERSHIP_SEASON_NOT_MODIFIABLE", JSON.stringify(retry.body));
    });
  } finally { await fixtures.cleanup(); await Promise.all([admin.auth(app).deleteUser(owner.uid).catch(() => {}), admin.auth(app).deleteUser(nextOwner.uid).catch(() => {}), admin.auth(app).deleteUser(member.uid).catch(() => {})]); await app.delete(); }
});
