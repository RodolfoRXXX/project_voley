"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  activeMembershipGuardId,
  hashMembershipSelfExitIdempotencyKey,
  membershipLifecycleGuardId,
  membershipSelfExitIntentId,
  membershipValidityPeriodId,
} = require("../../src/memberships/application/membershipHashing");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, name) {
  const email = `e2-10-${name}@example.invalid`;
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-10-synthetic-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-10-synthetic-password!", returnSecureToken: true }) });
  const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken, email };
}
async function invoke(host, projectId, name, data, token) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ data }) });
  return { status: response.status, body: await json(response) };
}
async function direct(host, projectId, path, token, method = "GET") {
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: method === "PATCH" ? JSON.stringify({ fields: { status: { stringValue: "confirmed" } } }) : undefined });
  return response.status;
}

test("E2-10 salida voluntaria self-person es durable, concurrente y sin efectos laterales", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e2-10-self-exit"); const db = app.firestore(); const auth = app.auth(); const T = admin.firestore.Timestamp;
  const fixtures = createFirestoreFixtureRegistry(db);
  const [owner, member, other, noPerson, noAccount, globalAdmin] = await Promise.all(["owner", "member", "other", "no-person", "no-account", "admin"].map((name) => signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, name)));
  const person = { owner: "e2-10-person-owner", member: "e2-10-person-member", other: "e2-10-person-other" };
  const call = (name, data, actor = member) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, actor?.idToken);
  const ref = (collection, id) => fixtures.register(db.collection(collection).doc(id));
  const periodRef = (membershipId, ordinal) => fixtures.register(db.collection("memberships").doc(membershipId).collection("validityPeriods").doc(membershipValidityPeriodId(membershipId, ordinal)));
  const registerIntent = (actor, key) => ref("membershipSelfExitIntents", membershipSelfExitIntentId(actor.uid, key));
  const account = (actor, personId) => ({ nombre: actor.uid, email: actor.email, photoURL: "", ...(personId ? { personaId: personId } : {}), createdAt: T.now() });

  async function seedContext(groupId, seasonId, ownerId = owner.uid) {
    const at = T.now();
    await Promise.all([
      fixtures.set(db.collection("groups").doc(groupId), { nombre: `Grupo ${groupId}`, deporte: "voleibol", ownerId, estado: "activo", createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("seasons").doc(seasonId), { groupId, nombre: "Temporada E2-10", fechaInicio: "2026-09-14", estado: "abierta", createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("openSeasonGuards").doc(groupId), { seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 }),
    ]);
  }
  async function seedActiveV1({ groupId, seasonId, membershipId, personId }) {
    const at = T.fromMillis(1000); ref("memberships", membershipId); ref("activeMembershipGuards", activeMembershipGuardId(groupId, personId)); ref("membershipLifecycleGuards", membershipLifecycleGuardId(groupId, personId)); periodRef(membershipId, 1);
    await Promise.all([
      db.collection("memberships").doc(membershipId).set({ personId, groupId, seasonId, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 }),
      db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)).set({ membershipId, personId, groupId, seasonId, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: at, guardVersion: 1 }),
    ]);
    return at;
  }
  async function seedActiveV3({ groupId, seasonId, membershipId, personId, ordinal = 1, previous = [] }) {
    const joinedAt = T.fromMillis(1000), activatedAt = ordinal === 1 ? joinedAt : T.fromMillis(1000 + ordinal * 1000), latestId = membershipValidityPeriodId(membershipId, ordinal);
    ref("memberships", membershipId); ref("activeMembershipGuards", activeMembershipGuardId(groupId, personId)); ref("membershipLifecycleGuards", membershipLifecycleGuardId(groupId, personId));
    for (const item of previous) await fixtures.set(db.collection("memberships").doc(membershipId).collection("validityPeriods").doc(membershipValidityPeriodId(membershipId, item.ordinal)), { ordinal: item.ordinal, startedAt: item.startedAt, endedAt: item.endedAt, estado: "cerrado", periodSchemaVersion: 1 });
    await Promise.all([
      db.collection("memberships").doc(membershipId).set({ personId, groupId, seasonId, estado: "activa", fechaIngreso: joinedAt, createdAt: joinedAt, latestPeriodId: latestId, periodCount: ordinal, schemaVersion: 3 }),
      fixtures.set(db.collection("memberships").doc(membershipId).collection("validityPeriods").doc(latestId), { ordinal, startedAt: activatedAt, estado: "abierto", periodSchemaVersion: 1 }),
      db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)).set({ membershipId, personId, groupId, seasonId, activationOrdinal: ordinal, activatedAt, activationIdempotencyHash: "e".repeat(64), activationRequestHash: "f".repeat(64), guardVersion: 2 }),
    ]);
    return { joinedAt, activatedAt };
  }

  try {
    await Promise.all([
      fixtures.set(db.collection("users").doc(owner.uid), account(owner, person.owner)), fixtures.set(db.collection("users").doc(member.uid), account(member, person.member)), fixtures.set(db.collection("users").doc(other.uid), account(other, person.other)), fixtures.set(db.collection("users").doc(noPerson.uid), account(noPerson)), fixtures.set(db.collection("users").doc(globalAdmin.uid), { ...account(globalAdmin, person.other), roles: ["admin"] }),
      fixtures.set(db.collection("personas").doc(person.owner), { nombre: "Olivia", apellido: "Owner", emailContacto: owner.email, createdAt: T.now() }), fixtures.set(db.collection("personas").doc(person.member), { nombre: "Mara", apellido: "Member", emailContacto: member.email, createdAt: T.now() }), fixtures.set(db.collection("personas").doc(person.other), { nombre: "Otto", apellido: "Other", emailContacto: other.email, createdAt: T.now() }),
    ]);

    await t.test("integrante no Owner finaliza v3, conserva historia y recupera la misma respuesta", async () => {
      const groupId = "e2-10-v3", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`, key = "e2-10-v3-key-0001"; await seedContext(groupId, seasonId); const first = { ordinal: 1, startedAt: T.fromMillis(1000), endedAt: T.fromMillis(1500) }; await seedActiveV3({ groupId, seasonId, membershipId, personId: person.member, ordinal: 2, previous: [first] }); registerIntent(member, key);
      const groupBefore = (await db.collection("groups").doc(groupId).get()).data();
      const result = await call("leaveMyGroupMembership", { groupId, idempotencyKey: key }); assert.equal(result.body.result.outcome, "EXIT_CONFIRMED", JSON.stringify(result.body)); assert.deepEqual(Object.keys(result.body.result.exit).sort(), ["activationOrdinal", "actorWasOwner", "endedAt", "groupId", "membershipId", "seasonId"]); assert.equal(result.body.result.exit.activationOrdinal, 2); assert.equal(result.body.result.exit.actorWasOwner, false);
      const [root, periods, active, lifecycle, intent, groupAfter] = await Promise.all([db.collection("memberships").doc(membershipId).get(), db.collection("memberships").doc(membershipId).collection("validityPeriods").orderBy("ordinal").get(), db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, person.member)).get(), db.collection("membershipLifecycleGuards").doc(membershipLifecycleGuardId(groupId, person.member)).get(), db.collection("membershipSelfExitIntents").doc(membershipSelfExitIntentId(member.uid, key)).get(), db.collection("groups").doc(groupId).get()]);
      assert.equal(root.data().estado, "finalizada"); assert.equal(root.data().fechaIngreso.toMillis(), 1000); assert.equal(periods.size, 2); assert.equal(periods.docs[0].data().endedAt.toMillis(), 1500); assert.equal(periods.docs[1].data().estado, "cerrado"); assert.equal(periods.docs.filter((p) => p.data().estado === "abierto").length, 0); assert.equal(active.exists, false); assert.equal(lifecycle.data().lastActivationOrdinal, 2); assert.equal(root.data().fechaEgreso.isEqual(lifecycle.data().finalizedAt), true); assert.equal(intent.data().completedAt.isEqual(root.data().fechaEgreso), true); assert.equal(intent.data().idempotencyKeyHash, hashMembershipSelfExitIdempotencyKey(member.uid, key)); assert.deepEqual(groupAfter.data(), groupBefore);
      const retry = await call("leaveMyGroupMembership", { groupId, idempotencyKey: key }); assert.deepEqual(retry.body.result, result.body.result); assert.equal((await db.collection("memberships").doc(membershipId).collection("validityPeriods").get()).size, 2); await db.collection("openSeasonGuards").doc(groupId).delete(); await db.collection("seasons").doc(seasonId).update({ estado: "cerrada" }); const retryAfterClose = await call("leaveMyGroupMembership", { groupId, idempotencyKey: key }); assert.deepEqual(retryAfterClose.body.result, result.body.result);
      const newKey = "e2-10-v3-key-0002"; registerIntent(member, newKey); const already = await call("leaveMyGroupMembership", { groupId, idempotencyKey: newKey }); assert.equal(already.body.error.details.reason, "MEMBERSHIP_NOT_ACTIVE"); assert.equal((await db.collection("membershipSelfExitIntents").doc(membershipSelfExitIntentId(member.uid, newKey)).get()).exists, false);
    });

    await t.test("Owner con Membresía v1 sale, evoluciona a v3 y conserva ownership", async () => {
      const groupId = "e2-10-owner-v1", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`, key = "e2-10-owner-key-01"; await seedContext(groupId, seasonId, owner.uid); const joinedAt = await seedActiveV1({ groupId, seasonId, membershipId, personId: person.owner }); registerIntent(owner, key);
      const result = await call("leaveMyGroupMembership", { groupId, idempotencyKey: key }, owner); assert.equal(result.body.result.exit.actorWasOwner, true); const root = (await db.collection("memberships").doc(membershipId).get()).data(), period = (await periodRef(membershipId, 1).get()).data(), group = (await db.collection("groups").doc(groupId).get()).data(); assert.equal(root.schemaVersion, 3); assert.equal(root.fechaIngreso.isEqual(joinedAt), true); assert.equal(root.createdAt.isEqual(joinedAt), true); assert.equal(root.periodCount, 1); assert.equal(period.startedAt.isEqual(joinedAt), true); assert.equal(period.endedAt.isEqual(root.fechaEgreso), true); assert.equal(group.ownerId, owner.uid);
    });

    await t.test("payload cerrado, Cuenta/Persona y selección self fallan sin escrituras", async () => {
      const forbidden = await call("leaveMyGroupMembership", { groupId: "x", idempotencyKey: "e2-10-invalid-key", personId: person.member }); assert.equal(forbidden.body.error.details.reason, "VALIDATION_FAILED");
      const missingPerson = await call("leaveMyGroupMembership", { groupId: "x", idempotencyKey: "e2-10-no-person-key" }, noPerson); assert.equal(missingPerson.body.error.details.reason, "PERSON_REQUIRED");
      const missingAccount = await call("leaveMyGroupMembership", { groupId: "x", idempotencyKey: "e2-10-no-account-key" }, noAccount); assert.equal(missingAccount.body.error.details.reason, "ACCOUNT_REQUIRED");
      const noMembership = await call("leaveMyGroupMembership", { groupId: "x", idempotencyKey: "e2-10-no-member-key" }, other); assert.equal(noMembership.body.error.details.reason, "MEMBERSHIP_NOT_FOUND");
      const attackGroup = "e2-10-self-scope", seasonId = `${attackGroup}-season`, membershipId = `${attackGroup}-membership`; await seedContext(attackGroup, seasonId); await seedActiveV1({ groupId: attackGroup, seasonId, membershipId, personId: person.member }); const attackKey = "e2-10-attack-key-01"; registerIntent(other, attackKey); const attack = await call("leaveMyGroupMembership", { groupId: attackGroup, idempotencyKey: attackKey }, other); assert.equal(attack.body.error.details.reason, "MEMBERSHIP_NOT_FOUND"); assert.equal((await db.collection("memberships").doc(membershipId).get()).data().estado, "activa");
    });

    await t.test("Temporada cerrada rechaza primera salida sin intent ni transición", async () => {
      const groupId = "e2-10-closed", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`, key = "e2-10-closed-key-01"; await seedContext(groupId, seasonId); await seedActiveV1({ groupId, seasonId, membershipId, personId: person.member }); const intent = registerIntent(member, key); await db.collection("openSeasonGuards").doc(groupId).delete(); await db.collection("seasons").doc(seasonId).update({ estado: "cerrada" });
      const result = await call("leaveMyGroupMembership", { groupId, idempotencyKey: key }); assert.equal(result.body.error.details.reason, "MEMBERSHIP_SEASON_NOT_MODIFIABLE"); assert.equal((await db.collection("memberships").doc(membershipId).get()).data().estado, "activa"); assert.equal((await db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, person.member)).get()).exists, true); assert.equal((await db.collection("membershipLifecycleGuards").doc(membershipLifecycleGuardId(groupId, person.member)).get()).exists, false); assert.equal((await periodRef(membershipId, 1).get()).exists, false); assert.equal((await intent.get()).exists, false);
    });

    await t.test("claves distintas concurrentes cierran una sola vez y crean un solo intent", async () => {
      const groupId = "e2-10-race", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`, keys = ["e2-10-race-key-001", "e2-10-race-key-002"]; await seedContext(groupId, seasonId); await seedActiveV3({ groupId, seasonId, membershipId, personId: person.member }); keys.forEach((key) => registerIntent(member, key));
      const responses = await Promise.all(keys.map((idempotencyKey) => call("leaveMyGroupMembership", { groupId, idempotencyKey }))); const success = responses.filter((r) => r.body.result?.outcome === "EXIT_CONFIRMED"), failed = responses.filter((r) => r.body.error?.details?.reason === "MEMBERSHIP_NOT_ACTIVE"); assert.equal(success.length, 1, JSON.stringify(responses)); assert.equal(failed.length, 1, JSON.stringify(responses)); assert.equal((await db.collection("membershipSelfExitIntents").where("groupId", "==", groupId).get()).size, 1); const periods = await db.collection("memberships").doc(membershipId).collection("validityPeriods").get(); assert.equal(periods.size, 1); assert.equal(periods.docs.filter((p) => p.data().estado === "abierto").length, 0);
    });

    await t.test("doble click con la misma clave recupera un único intent", async () => {
      const groupId = "e2-10-double", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`, key = "e2-10-double-key-01"; await seedContext(groupId, seasonId); await seedActiveV3({ groupId, seasonId, membershipId, personId: person.member }); registerIntent(member, key);
      const [left, right] = await Promise.all([call("leaveMyGroupMembership", { groupId, idempotencyKey: key }), call("leaveMyGroupMembership", { groupId, idempotencyKey: key })]); assert.equal(left.body.result.outcome, "EXIT_CONFIRMED", JSON.stringify(left.body)); assert.deepEqual(right.body.result, left.body.result); assert.equal((await db.collection("membershipSelfExitIntents").where("groupId", "==", groupId).get()).size, 1); assert.equal((await db.collection("memberships").doc(membershipId).collection("validityPeriods").get()).size, 1);
    });

    await t.test("Grupo o Temporada autoritativos ausentes fallan cerrados", async () => {
      const orphanGroup = "e2-10-orphan-group", orphanSeason = `${orphanGroup}-season`, orphanMembership = `${orphanGroup}-membership`, orphanKey = "e2-10-orphan-key-01"; await seedActiveV1({ groupId: orphanGroup, seasonId: orphanSeason, membershipId: orphanMembership, personId: person.member }); registerIntent(member, orphanKey); const missingGroup = await call("leaveMyGroupMembership", { groupId: orphanGroup, idempotencyKey: orphanKey }); assert.equal(missingGroup.body.error.details.reason, "GROUP_NOT_FOUND"); assert.equal((await db.collection("memberships").doc(orphanMembership).get()).data().estado, "activa");
      const groupId = "e2-10-missing-season", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`, key = "e2-10-missing-season-key"; const at = T.now(); await fixtures.set(db.collection("groups").doc(groupId), { nombre: "Sin temporada", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: at, schemaVersion: 1 }); await fixtures.set(db.collection("openSeasonGuards").doc(groupId), { seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 }); await seedActiveV1({ groupId, seasonId, membershipId, personId: person.member }); registerIntent(member, key); const missingSeason = await call("leaveMyGroupMembership", { groupId, idempotencyKey: key }); assert.equal(missingSeason.body.error.details.reason, "MEMBERSHIP_SEASON_NOT_MODIFIABLE"); assert.equal((await db.collection("membershipSelfExitIntents").doc(membershipSelfExitIntentId(member.uid, key)).get()).exists, false);
    });

    await t.test("carreras con CU-027, ownership y cierre de Temporada convergen", async () => {
      const finalizeGroup = "e2-10-cu027", finalizeSeason = `${finalizeGroup}-season`, finalizeMembership = `${finalizeGroup}-membership`, finalizeKey = "e2-10-cu027-key-001"; await seedContext(finalizeGroup, finalizeSeason, member.uid); await seedActiveV3({ groupId: finalizeGroup, seasonId: finalizeSeason, membershipId: finalizeMembership, personId: person.member }); registerIntent(member, finalizeKey);
      const [selfExit, cu027] = await Promise.all([call("leaveMyGroupMembership", { groupId: finalizeGroup, idempotencyKey: finalizeKey }), call("finalizeMyMembershipForOwnedGroup", { groupId: finalizeGroup })]); assert.equal([selfExit, cu027].some((r) => r.body.result), true); assert.equal((await db.collection("memberships").doc(finalizeMembership).get()).data().estado, "finalizada"); const finalizedPeriods = await db.collection("memberships").doc(finalizeMembership).collection("validityPeriods").get(); assert.equal(finalizedPeriods.size, 1); assert.equal(finalizedPeriods.docs.filter((p) => p.data().estado === "abierto").length, 0);

      const transferGroup = "e2-10-transfer", transferSeason = `${transferGroup}-season`, transferMembership = `${transferGroup}-membership`, transferKey = "e2-10-transfer-key-01"; await seedContext(transferGroup, transferSeason, member.uid); await seedActiveV3({ groupId: transferGroup, seasonId: transferSeason, membershipId: transferMembership, personId: person.member }); registerIntent(member, transferKey); const transferRef = db.collection("groups").doc(transferGroup); const [exitResult] = await Promise.all([call("leaveMyGroupMembership", { groupId: transferGroup, idempotencyKey: transferKey }), db.runTransaction(async (transaction) => { await transaction.get(transferRef); transaction.update(transferRef, { ownerId: owner.uid }); })]); assert.equal(exitResult.body.result.outcome, "EXIT_CONFIRMED", JSON.stringify(exitResult.body)); assert.equal((await transferRef.get()).data().ownerId, owner.uid);

      const closeGroup = "e2-10-close-race", closeSeason = `${closeGroup}-season`, closeMembership = `${closeGroup}-membership`, closeKey = "e2-10-close-race-key"; await seedContext(closeGroup, closeSeason); await seedActiveV3({ groupId: closeGroup, seasonId: closeSeason, membershipId: closeMembership, personId: person.member }); const closeIntent = registerIntent(member, closeKey), closeGuard = db.collection("openSeasonGuards").doc(closeGroup), closeSeasonRef = db.collection("seasons").doc(closeSeason); const [exitRace, closeRace] = await Promise.allSettled([call("leaveMyGroupMembership", { groupId: closeGroup, idempotencyKey: closeKey }), db.runTransaction(async (transaction) => { await transaction.get(closeGuard); await transaction.get(closeSeasonRef); transaction.delete(closeGuard); transaction.update(closeSeasonRef, { estado: "cerrada" }); })]); assert.equal(closeRace.status, "fulfilled"); assert.equal(exitRace.status, "fulfilled"); const exitResponse = exitRace.value; assert.equal(["EXIT_CONFIRMED", "MEMBERSHIP_SEASON_NOT_MODIFIABLE"].includes(exitResponse.body.result?.outcome || exitResponse.body.error?.details?.reason), true, JSON.stringify(exitResponse.body)); const closeRoot = (await db.collection("memberships").doc(closeMembership).get()).data(), closeIntentSnapshot = await closeIntent.get(); if (closeIntentSnapshot.exists) assert.equal(closeRoot.estado, "finalizada"); else assert.equal(closeRoot.estado, "activa");
    });

    await t.test("retry antiguo no afecta reactivación y salida nueva cierra sólo ordinal nuevo", async () => {
      const groupId = "e2-10-reactivated", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`, oldKey = "e2-10-old-key-0001", newKey = "e2-10-new-key-0002"; await seedContext(groupId, seasonId); await seedActiveV3({ groupId, seasonId, membershipId, personId: person.member }); registerIntent(member, oldKey); registerIntent(member, newKey); const first = await call("leaveMyGroupMembership", { groupId, idempotencyKey: oldKey }); assert.equal(first.body.result.exit.activationOrdinal, 1);
      const activatedAt = T.fromMillis(5000), period2Id = membershipValidityPeriodId(membershipId, 2); periodRef(membershipId, 2); await db.runTransaction(async (transaction) => { const rootRef = db.collection("memberships").doc(membershipId), root = (await transaction.get(rootRef)).data(); const { fechaEgreso: ignored, ...withoutExit } = root; void ignored; transaction.set(rootRef, { ...withoutExit, estado: "activa", latestPeriodId: period2Id, periodCount: 2, schemaVersion: 3 }); transaction.create(db.collection("memberships").doc(membershipId).collection("validityPeriods").doc(period2Id), { ordinal: 2, startedAt: activatedAt, estado: "abierto", periodSchemaVersion: 1 }); transaction.delete(db.collection("membershipLifecycleGuards").doc(membershipLifecycleGuardId(groupId, person.member))); transaction.create(db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, person.member)), { membershipId, personId: person.member, groupId, seasonId, activationOrdinal: 2, activatedAt, activationIdempotencyHash: "1".repeat(64), activationRequestHash: "2".repeat(64), guardVersion: 2 }); });
      const oldRetry = await call("leaveMyGroupMembership", { groupId, idempotencyKey: oldKey }); assert.deepEqual(oldRetry.body.result, first.body.result); assert.equal((await db.collection("memberships").doc(membershipId).get()).data().estado, "activa"); assert.equal((await periodRef(membershipId, 2).get()).data().estado, "abierto");
      const second = await call("leaveMyGroupMembership", { groupId, idempotencyKey: newKey }); assert.equal(second.body.result.exit.activationOrdinal, 2); const periods = await db.collection("memberships").doc(membershipId).collection("validityPeriods").get(); assert.equal(periods.size, 2); assert.equal(periods.docs.filter((p) => p.data().estado === "abierto").length, 0);
    });

    await t.test("misma clave con payload distinto da conflicto estable", async () => {
      const key = "e2-10-v3-key-0001"; const result = await call("leaveMyGroupMembership", { groupId: "another-group", idempotencyKey: key }); assert.equal(result.body.error.details.reason, "IDEMPOTENCY_CONFLICT");
    });

    await t.test("reglas niegan Membresías, Períodos e intents para cualquier cliente", async () => {
      const intentPath = `membershipSelfExitIntents/${membershipSelfExitIntentId(member.uid, "e2-10-v3-key-0001")}`;
      for (const actor of [null, member, owner, globalAdmin]) for (const path of ["memberships/e2-10-v3-membership", `memberships/e2-10-v3-membership/validityPeriods/${membershipValidityPeriodId("e2-10-v3-membership", 2)}`, intentPath]) { assert.equal(await direct(process.env.FIRESTORE_EMULATOR_HOST, projectId, path, actor?.idToken), 403); assert.equal(await direct(process.env.FIRESTORE_EMULATOR_HOST, projectId, path, actor?.idToken, "PATCH"), 403); }
      for (const collection of ["activities", "notifications", "alerts", "groupJoinRequests", "groupJoinRequestIntents"]) assert.equal((await db.collection(collection).get()).size, 0, collection);
    });
  } finally {
    await fixtures.registerQuery(db.collection("membershipSelfExitIntents")); await fixtures.cleanup(); await auth.deleteUsers([owner.uid, member.uid, other.uid, noPerson.uid, noAccount.uid, globalAdmin.uid]); await app.delete();
  }
});
