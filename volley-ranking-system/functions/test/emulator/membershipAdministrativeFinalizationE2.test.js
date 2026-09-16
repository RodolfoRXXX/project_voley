"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  activeMembershipGuardId, membershipAdministrativeFinalizationIntentId,
  membershipLifecycleGuardId, membershipValidityPeriodId,
} = require("../../src/memberships/application/membershipHashing");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, name) {
  const email = `e2-12-${name}@example.invalid`;
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-12-synthetic-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-12-synthetic-password!", returnSecureToken: true }) });
  const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken, email };
}
async function invoke(host, projectId, name, data, actor) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", ...(actor ? { Authorization: `Bearer ${actor.idToken}` } : {}) }, body: JSON.stringify({ data }) });
  return { status: response.status, body: await json(response) };
}
async function direct(host, projectId, path, actor, method = "GET") {
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { method, headers: { "Content-Type": "application/json", ...(actor ? { Authorization: `Bearer ${actor.idToken}` } : {}) }, body: method === "PATCH" ? JSON.stringify({ fields: { status: { stringValue: "changed" } } }) : undefined });
  return response.status;
}

test("E2-12 finalizacion administrativa Owner es atomica, exacta e idempotente", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e2-12-administrative-finalization");
  const db = app.firestore(); const auth = app.auth(); const T = admin.firestore.Timestamp; const fixtures = createFirestoreFixtureRegistry(db);
  const [owner, member, outsider, adminUser, ownerWithoutPerson] = await Promise.all(["owner", "member", "outsider", "admin", "owner-without-person"].map((name) => signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, name)));
  const personIds = { owner: "e2-12-person-owner", member: "e2-12-person-member", outsider: "e2-12-person-outsider", admin: "e2-12-person-admin", laterOwner: "e2-12-person-later-owner" };
  const call = (name, data, actor = owner) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, actor);
  const account = (actor, personId, extra = {}) => ({ nombre: actor.uid, email: actor.email, photoURL: "", personaId: personId, createdAt: T.now(), ...extra });
  const person = (name, email) => ({ nombre: name, apellido: "E2-12", emailContacto: email, createdAt: T.now() });

  async function seedContext(groupId, seasonId, ownerId = owner.uid) {
    const at = T.now();
    await Promise.all([
      fixtures.set(db.collection("groups").doc(groupId), { nombre: `Grupo ${groupId}`, deporte: "voleibol", ownerId, estado: "activo", createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("seasons").doc(seasonId), { groupId, nombre: "Temporada E2-12", fechaInicio: "2026-09-16", estado: "abierta", createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("openSeasonGuards").doc(groupId), { seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 }),
    ]);
  }
  async function seedV1(groupId, seasonId, membershipId, personId) {
    const at = T.fromMillis(1000);
    await Promise.all([
      fixtures.set(db.collection("memberships").doc(membershipId), { personId, groupId, seasonId, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)), { membershipId, personId, groupId, seasonId, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: at, guardVersion: 1 }),
    ]);
  }
  async function seedV3(groupId, seasonId, membershipId, personId, ordinal = 1, startedAt = T.fromMillis(1000)) {
    const periodId = membershipValidityPeriodId(membershipId, ordinal);
    await Promise.all([
      fixtures.set(db.collection("memberships").doc(membershipId), { personId, groupId, seasonId, estado: "activa", fechaIngreso: T.fromMillis(1000), createdAt: T.fromMillis(1000), latestPeriodId: periodId, periodCount: ordinal, schemaVersion: 3 }),
      fixtures.set(db.collection("memberships").doc(membershipId).collection("validityPeriods").doc(periodId), { ordinal, estado: "abierto", startedAt, periodSchemaVersion: 1 }),
      fixtures.set(db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)), { membershipId, personId, groupId, seasonId, activationOrdinal: ordinal, activatedAt: startedAt, activationIdempotencyHash: "e".repeat(64), activationRequestHash: "f".repeat(64), guardVersion: 2 }),
    ]);
  }
  async function reactivate(groupId, seasonId, membershipId, personId, ordinal) {
    const rootRef = db.collection("memberships").doc(membershipId); const lifecycleRef = db.collection("membershipLifecycleGuards").doc(membershipLifecycleGuardId(groupId, personId));
    const activeRef = db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)); const periodId = membershipValidityPeriodId(membershipId, ordinal); const startedAt = T.fromMillis(1000 + ordinal * 1000);
    await db.runTransaction(async (transaction) => {
      const root = (await transaction.get(rootRef)).data(); const { fechaEgreso: ignored, ...withoutExit } = root; void ignored;
      transaction.set(rootRef, { ...withoutExit, estado: "activa", latestPeriodId: periodId, periodCount: ordinal, schemaVersion: 3 });
      transaction.create(rootRef.collection("validityPeriods").doc(periodId), { ordinal, estado: "abierto", startedAt, periodSchemaVersion: 1 });
      transaction.delete(lifecycleRef); transaction.create(activeRef, { membershipId, personId, groupId, seasonId, activationOrdinal: ordinal, activatedAt: startedAt, activationIdempotencyHash: "1".repeat(64), activationRequestHash: "2".repeat(64), guardVersion: 2 });
    });
  }

  try {
    await Promise.all([
      fixtures.set(db.collection("users").doc(owner.uid), account(owner, personIds.owner)), fixtures.set(db.collection("users").doc(member.uid), account(member, personIds.member)),
      fixtures.set(db.collection("users").doc(outsider.uid), account(outsider, personIds.outsider)), fixtures.set(db.collection("users").doc(adminUser.uid), account(adminUser, personIds.admin, { roles: "admin" })),
      fixtures.set(db.collection("users").doc(ownerWithoutPerson.uid), { nombre: ownerWithoutPerson.uid, email: ownerWithoutPerson.email, photoURL: "", createdAt: T.now() }),
      fixtures.set(db.collection("personas").doc(personIds.owner), person("Olivia", owner.email)), fixtures.set(db.collection("personas").doc(personIds.member), person("Mara", member.email)),
      fixtures.set(db.collection("personas").doc(personIds.outsider), person("Oscar", outsider.email)), fixtures.set(db.collection("personas").doc(personIds.admin), person("Ada", adminUser.email)),
    ]);

    await t.test("Owner sin Persona prepara y finaliza tercero sin altas colaterales ni acceso ajeno", async () => {
      const groupId = "e2-12-owner-without-person", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`;
      await seedContext(groupId, seasonId, ownerWithoutPerson.uid); await seedV3(groupId, seasonId, membershipId, personIds.member);
      const collections = ["memberships", "activeMembershipGuards", "membershipLifecycleGuards", "membershipAdministrativeFinalizationIntents"];
      const before = await Promise.all(collections.map((name) => db.collection(name).count().get().then((snapshot) => snapshot.data().count)));
      const peopleBefore = (await db.collection("personas").count().get()).data().count;
      const prepared = await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId }, ownerWithoutPerson);
      assert.equal(prepared.status, 200, JSON.stringify(prepared.body));
      assert.deepEqual(prepared.body.result.person, { firstName: "Mara", lastName: "E2-12" });
      const after = await Promise.all(collections.map((name) => db.collection(name).count().get().then((snapshot) => snapshot.data().count)));
      assert.deepEqual(after, before);

      const key = "e2-12-owner-no-person-key";
      const finalized = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef: prepared.body.result.activationRef, idempotencyKey: key }, ownerWithoutPerson);
      assert.equal(finalized.body.result.outcome, "MEMBERSHIP_FINALIZATION_CONFIRMED", JSON.stringify(finalized.body));
      assert.equal((await db.collection("memberships").doc(membershipId).get()).data().estado, "finalizada");
      assert.equal((await db.collection("users").doc(ownerWithoutPerson.uid).get()).data().personaId, undefined);
      assert.equal((await db.collection("personas").count().get()).data().count, peopleBefore);
      assert.equal((await db.collection("memberships").count().get()).data().count, before[0]);
      const intent = (await db.collection("membershipAdministrativeFinalizationIntents").doc(membershipAdministrativeFinalizationIntentId(ownerWithoutPerson.uid, key)).get()).data();
      assert.equal(intent.actorPersonId, null);

      const foreignGroup = "e2-12-owner-no-person-foreign", foreignSeason = `${foreignGroup}-season`, foreignMembership = `${foreignGroup}-membership`;
      await seedContext(foreignGroup, foreignSeason); await seedV3(foreignGroup, foreignSeason, foreignMembership, personIds.outsider);
      const denied = await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId: foreignGroup, membershipId: foreignMembership }, ownerWithoutPerson);
      assert.equal(denied.body.error.details.reason, "GROUP_NOT_ACCESSIBLE");
      assert.equal((await db.collection("memberships").doc(foreignMembership).get()).data().estado, "activa");
    });

    await t.test("Persona propia coincidente creada entre prepare y finalize activa TARGET_IS_SELF", async () => {
      const groupId = "e2-12-late-self", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`;
      await fixtures.set(db.collection("personas").doc(personIds.laterOwner), person("Paula", ownerWithoutPerson.email));
      await seedContext(groupId, seasonId, ownerWithoutPerson.uid); await seedV3(groupId, seasonId, membershipId, personIds.laterOwner);
      const prepared = await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId }, ownerWithoutPerson);
      assert.equal(prepared.status, 200, JSON.stringify(prepared.body));
      await db.collection("users").doc(ownerWithoutPerson.uid).update({ personaId: personIds.laterOwner });
      const rejected = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef: prepared.body.result.activationRef, idempotencyKey: "e2-12-late-self-key" }, ownerWithoutPerson);
      assert.equal(rejected.body.error.details.reason, "TARGET_IS_SELF", JSON.stringify(rejected.body));
      assert.equal((await db.collection("memberships").doc(membershipId).get()).data().estado, "activa");
      assert.equal((await db.collection("membershipAdministrativeFinalizationIntents").doc(membershipAdministrativeFinalizationIntentId(ownerWithoutPerson.uid, "e2-12-late-self-key")).get()).exists, false);
    });

    await t.test("prepare es read-only, cerrado, canonico y prohibe self", async () => {
      const groupId = "e2-12-prepare", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`; await seedContext(groupId, seasonId); await seedV3(groupId, seasonId, membershipId, personIds.member);
      const before = await Promise.all(["memberships", "activeMembershipGuards", "membershipLifecycleGuards", "membershipAdministrativeFinalizationIntents"].map((name) => db.collection(name).count().get().then((s) => s.data().count)));
      const prepared = await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId }); assert.equal(prepared.status, 200, JSON.stringify(prepared.body)); assert.deepEqual(Object.keys(prepared.body.result).sort(), ["activationRef", "person"]); assert.deepEqual(prepared.body.result.person, { firstName: "Mara", lastName: "E2-12" }); assert.match(prepared.body.result.activationRef, /^[a-f0-9]{64}$/);
      const after = await Promise.all(["memberships", "activeMembershipGuards", "membershipLifecycleGuards", "membershipAdministrativeFinalizationIntents"].map((name) => db.collection(name).count().get().then((s) => s.data().count))); assert.deepEqual(after, before);
      const forbidden = await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId, personId: personIds.member }); assert.equal(forbidden.body.error.details.reason, "VALIDATION_FAILED");
      const ownMembership = `${groupId}-owner-membership`; await seedV1(groupId, seasonId, ownMembership, personIds.owner); const self = await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId: ownMembership }); assert.equal(self.body.error.details.reason, "TARGET_IS_SELF");
    });

    await t.test("activa v3 finaliza atomicamente y retry conserva respuesta aun con N+1", async () => {
      const groupId = "e2-12-v3", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`, key = "e2-12-v3-key-0001"; await seedContext(groupId, seasonId); await seedV3(groupId, seasonId, membershipId, personIds.member);
      const prepared = (await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId })).body.result;
      const result = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef: prepared.activationRef, idempotencyKey: key }); assert.equal(result.body.result.outcome, "MEMBERSHIP_FINALIZATION_CONFIRMED", JSON.stringify(result.body)); assert.deepEqual(Object.keys(result.body.result.effect).sort(), ["finalizedAt", "membershipId"]);
      const intentRef = db.collection("membershipAdministrativeFinalizationIntents").doc(membershipAdministrativeFinalizationIntentId(owner.uid, key));
      const [root, period, active, lifecycle, intent] = await Promise.all([db.collection("memberships").doc(membershipId).get(), db.collection("memberships").doc(membershipId).collection("validityPeriods").doc(membershipValidityPeriodId(membershipId, 1)).get(), db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personIds.member)).get(), db.collection("membershipLifecycleGuards").doc(membershipLifecycleGuardId(groupId, personIds.member)).get(), intentRef.get()]);
      assert.equal(root.data().estado, "finalizada"); assert.equal(period.data().estado, "cerrado"); assert.equal(active.exists, false); assert.equal(lifecycle.data().lastActivationOrdinal, 1); assert.equal(root.data().fechaEgreso.isEqual(period.data().endedAt), true); assert.equal(intent.data().finalizedAt.isEqual(root.data().fechaEgreso), true); assert.equal(JSON.stringify(intent.data()).includes(key), false); assert.equal(JSON.stringify(intent.data()).includes(prepared.activationRef), false);
      await reactivate(groupId, seasonId, membershipId, personIds.member, 2); const retry = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef: prepared.activationRef, idempotencyKey: key }); assert.deepEqual(retry.body.result, result.body.result); assert.equal((await db.collection("memberships").doc(membershipId).get()).data().estado, "activa");
      await db.collection("groups").doc(groupId).update({ ownerId: outsider.uid }); const exOwnerRetry = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef: prepared.activationRef, idempotencyKey: key }); assert.equal(exOwnerRetry.body.error.details.reason, "GROUP_NOT_ACCESSIBLE"); assert.equal((await db.collection("memberships").doc(membershipId).get()).data().estado, "activa");
    });

    await t.test("activationRef obsoleta no cierra N+1 ni atribuye su ordinal", async () => {
      const groupId = "e2-12-stale", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`; await seedContext(groupId, seasonId); await seedV3(groupId, seasonId, membershipId, personIds.member);
      const prepared = (await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId })).body.result;
      const firstKey = "e2-12-stale-first-01"; await call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef: prepared.activationRef, idempotencyKey: firstKey }); await reactivate(groupId, seasonId, membershipId, personIds.member, 2);
      const staleKey = "e2-12-stale-replay-02"; const stale = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef: prepared.activationRef, idempotencyKey: staleKey }); assert.equal(stale.body.error.details.reason, "MEMBERSHIP_ACTIVATION_CHANGED", JSON.stringify(stale.body));
      const root = (await db.collection("memberships").doc(membershipId).get()).data(); assert.equal(root.estado, "activa"); assert.equal(root.periodCount, 2); assert.equal((await db.collection("memberships").doc(membershipId).collection("validityPeriods").doc(membershipValidityPeriodId(membershipId, 2)).get()).data().estado, "abierto");
      const intent = (await db.collection("membershipAdministrativeFinalizationIntents").doc(membershipAdministrativeFinalizationIntentId(owner.uid, staleKey)).get()).data(); assert.equal(intent.outcome, "MEMBERSHIP_ACTIVATION_CHANGED"); assert.equal(Object.prototype.hasOwnProperty.call(intent, "activationOrdinal"), false);
    });

    await t.test("v1 evoluciona a v3 y dos claves tienen un unico ganador", async () => {
      const groupId = "e2-12-v1-race", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`; await seedContext(groupId, seasonId); await seedV1(groupId, seasonId, membershipId, personIds.member);
      const activationRef = (await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId })).body.result.activationRef;
      const keys = ["e2-12-race-key-001", "e2-12-race-key-002"]; const results = await Promise.all(keys.map((idempotencyKey) => call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef, idempotencyKey })));
      assert.equal(results.filter((value) => value.body.result?.outcome === "MEMBERSHIP_FINALIZATION_CONFIRMED").length, 1, JSON.stringify(results)); assert.equal(results.filter((value) => value.body.error?.details?.reason === "TARGET_MEMBERSHIP_NOT_ACTIVE").length, 1, JSON.stringify(results));
      const root = (await db.collection("memberships").doc(membershipId).get()).data(); const period = (await db.collection("memberships").doc(membershipId).collection("validityPeriods").doc(membershipValidityPeriodId(membershipId, 1)).get()).data(); assert.equal(root.schemaVersion, 3); assert.equal(root.periodCount, 1); assert.equal(period.estado, "cerrado"); assert.equal((await db.collection("membershipAdministrativeFinalizationIntents").where("groupId", "==", groupId).get()).size, 2);
    });

    await t.test("carrera E2-10/E2-12 tiene un cierre y Solicitudes permanecen intactas", async () => {
      const groupId = "e2-12-self-race", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`; await seedContext(groupId, seasonId); await seedV3(groupId, seasonId, membershipId, personIds.member);
      const requestRef = db.collection("groupJoinRequests").doc("e2-12-historical-request"); const pendingGuardRef = db.collection("pendingGroupJoinRequestGuards").doc("e2-12-pending-guard");
      const requestData = { marker: "approved-history", approvalEffect: { activationOrdinal: 1 } }; const pendingData = { marker: "pending-intact" }; await fixtures.set(requestRef, requestData); await fixtures.set(pendingGuardRef, pendingData);
      const activationRef = (await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId })).body.result.activationRef;
      const [administrative, self] = await Promise.all([
        call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef, idempotencyKey: "e2-12-versus-self-key" }),
        call("leaveMyGroupMembership", { groupId, idempotencyKey: "e2-12-self-exit-key" }, member),
      ]);
      const publicOutcomes = [administrative.body.result?.outcome || administrative.body.error?.details?.reason, self.body.result?.outcome || self.body.error?.details?.reason];
      assert.equal(publicOutcomes.filter((value) => ["MEMBERSHIP_FINALIZATION_CONFIRMED", "EXIT_CONFIRMED"].includes(value)).length, 1, JSON.stringify(publicOutcomes));
      assert.equal((await db.collection("memberships").doc(membershipId).get()).data().estado, "finalizada"); assert.equal((await db.collection("memberships").doc(membershipId).collection("validityPeriods").get()).size, 1);
      assert.deepEqual((await requestRef.get()).data(), requestData); assert.deepEqual((await pendingGuardRef.get()).data(), pendingData);
    });

    await t.test("transferencia de ownership invalida prepare previo y retry historico", async () => {
      const groupId = "e2-12-transfer", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`, key = "e2-12-transfer-key-01"; await seedContext(groupId, seasonId); await seedV3(groupId, seasonId, membershipId, personIds.member);
      const activationRef = (await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId })).body.result.activationRef;
      await db.collection("groups").doc(groupId).update({ ownerId: outsider.uid });
      const denied = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef, idempotencyKey: key }); assert.equal(denied.body.error.details.reason, "GROUP_NOT_ACCESSIBLE"); assert.equal((await db.collection("membershipAdministrativeFinalizationIntents").doc(membershipAdministrativeFinalizationIntentId(owner.uid, key)).get()).exists, false); assert.equal((await db.collection("memberships").doc(membershipId).get()).data().estado, "activa");
      const nextPrepared = await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId }, outsider); assert.match(nextPrepared.body.result.activationRef, /^[a-f0-9]{64}$/); assert.notEqual(nextPrepared.body.result.activationRef, activationRef);
    });

    await t.test("autorizacion, conflicto, Temporada y rules fallan cerrados", async () => {
      const groupId = "e2-12-auth", seasonId = `${groupId}-season`, membershipId = `${groupId}-membership`; await seedContext(groupId, seasonId); await seedV3(groupId, seasonId, membershipId, personIds.member); const prepared = (await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId })).body.result;
      for (const actor of [outsider, adminUser]) { const denied = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef: prepared.activationRef, idempotencyKey: `e2-12-denied-${actor.uid}` }, actor); assert.equal(denied.body.error.details.reason, "GROUP_NOT_ACCESSIBLE"); }
      const key = "e2-12-conflict-key-01"; const success = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId, activationRef: prepared.activationRef, idempotencyKey: key }); assert.equal(success.body.result.outcome, "MEMBERSHIP_FINALIZATION_CONFIRMED"); const anotherGroup = "e2-12-another-owned"; await seedContext(anotherGroup, `${anotherGroup}-season`); const conflict = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId: anotherGroup, membershipId, activationRef: prepared.activationRef, idempotencyKey: key }); assert.equal(conflict.body.error.details.reason, "IDEMPOTENCY_CONFLICT");
      const closedGroup = "e2-12-closed", closedSeason = `${closedGroup}-season`, closedMembership = `${closedGroup}-membership`; await seedContext(closedGroup, closedSeason); await seedV3(closedGroup, closedSeason, closedMembership, personIds.outsider); const closedRef = (await call("prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId: closedGroup, membershipId: closedMembership })).body.result.activationRef; await db.collection("openSeasonGuards").doc(closedGroup).delete(); await db.collection("seasons").doc(closedSeason).update({ estado: "cerrada" }); const closed = await call("finalizeActiveGroupMemberForOwnedGroup", { groupId: closedGroup, membershipId: closedMembership, activationRef: closedRef, idempotencyKey: "e2-12-closed-key-01" }); assert.equal(closed.body.error.details.reason, "MEMBERSHIP_SEASON_NOT_MODIFIABLE"); assert.equal((await db.collection("memberships").doc(closedMembership).get()).data().estado, "activa");
      const intentPath = `membershipAdministrativeFinalizationIntents/${membershipAdministrativeFinalizationIntentId(owner.uid, key)}`; for (const actor of [null, owner, member, adminUser]) { assert.equal(await direct(process.env.FIRESTORE_EMULATOR_HOST, projectId, intentPath, actor), 403); assert.equal(await direct(process.env.FIRESTORE_EMULATOR_HOST, projectId, intentPath, actor, "PATCH"), 403); }
    });
  } finally {
    await fixtures.registerQuery(db.collection("membershipAdministrativeFinalizationIntents")); await fixtures.cleanup(); await auth.deleteUsers([owner.uid, member.uid, outsider.uid, adminUser.uid, ownerWithoutPerson.uid]); await app.delete();
  }
});
