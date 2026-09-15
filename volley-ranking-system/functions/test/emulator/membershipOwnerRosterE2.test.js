"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { activeMembershipGuardId, membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-11-synthetic-key`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "E2-11-synthetic-password!", returnSecureToken: true }),
  });
  const body = await json(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken, email };
}
async function call(host, projectId, name, data, actor) {
  const headers = { "Content-Type": "application/json" };
  if (actor?.idToken) headers.Authorization = `Bearer ${actor.idToken}`;
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, {
    method: "POST", headers, body: JSON.stringify({ data }),
  });
  return { status: response.status, body: await json(response) };
}
async function direct(host, projectId, path, actor, method = "GET") {
  const headers = {};
  if (actor?.idToken) headers.Authorization = `Bearer ${actor.idToken}`;
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { method, headers });
  return response.status;
}

test("E2-11 consulta Owner de integrantes activos con integridad, privacidad y paginación", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e2-11-owner-roster-integration");
  const db = app.firestore();
  const auth = app.auth();
  const T = admin.firestore.Timestamp;
  const fixtures = createFirestoreFixtureRegistry(db);
  const [owner, member, outsider, globalAdmin, noPersonOwner, noAccount] = await Promise.all([
    signUp(authHost, "e2-11-owner@example.invalid"),
    signUp(authHost, "e2-11-member@example.invalid"),
    signUp(authHost, "e2-11-outsider@example.invalid"),
    signUp(authHost, "e2-11-admin@example.invalid"),
    signUp(authHost, "e2-11-owner-no-person@example.invalid"),
    signUp(authHost, "e2-11-no-account@example.invalid"),
  ]);
  const actorPerson = {
    owner: "e2-11-person-owner",
    member: "e2-11-person-member",
    outsider: "e2-11-person-outsider",
    admin: "e2-11-person-admin",
  };
  const at = (seconds) => new T(seconds, 0);
  const account = (actor, personaId, extra = {}) => ({ nombre: actor.email, email: actor.email, photoURL: "", createdAt: at(1788177000), ...(personaId ? { personaId } : {}), ...extra });
  const person = (firstName, lastName, email) => ({ nombre: firstName, apellido: lastName, emailContacto: email, createdAt: at(1788177000) });
  const groupData = (ownerId, extra = {}) => ({ nombre: "Grupo E2-11", deporte: "voleibol", ownerId, estado: "activo", createdAt: at(1788177000), schemaVersion: 1, ...extra });
  const seasonData = (groupId, state = "abierta") => ({ groupId, nombre: "Temporada E2-11", fechaInicio: "2026-09-01", estado: state, createdAt: at(1788177000), schemaVersion: 1 });
  const guardData = (membershipId, personId, groupId, seasonId, joinedAt) => ({ membershipId, personId, groupId, seasonId, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: joinedAt, guardVersion: 1 });
  const membershipV1 = (personId, groupId, seasonId, joinedAt) => ({ personId, groupId, seasonId, estado: "activa", fechaIngreso: joinedAt, createdAt: joinedAt, schemaVersion: 1 });

  async function seedGroup(groupId, ownerId = owner.uid, withSeason = true) {
    await fixtures.set(db.collection("groups").doc(groupId), groupData(ownerId));
    if (!withSeason) return null;
    const seasonId = `${groupId}-season`;
    await fixtures.set(db.collection("seasons").doc(seasonId), seasonData(groupId));
    await fixtures.set(db.collection("openSeasonGuards").doc(groupId), { seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at(1788177000), guardVersion: 1 });
    return seasonId;
  }
  async function seedV1({ membershipId, personId, groupId, seasonId, joinedAt }) {
    await fixtures.set(db.collection("memberships").doc(membershipId), membershipV1(personId, groupId, seasonId, joinedAt));
    await fixtures.set(db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)), guardData(membershipId, personId, groupId, seasonId, joinedAt));
  }
  async function seedV3({ membershipId, personId, groupId, seasonId, joinedAt, withPeriod = true }) {
    const periodId = membershipValidityPeriodId(membershipId, 1);
    await fixtures.set(db.collection("memberships").doc(membershipId), { ...membershipV1(personId, groupId, seasonId, joinedAt), latestPeriodId: periodId, periodCount: 1, schemaVersion: 3 });
    await fixtures.set(db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)), { membershipId, personId, groupId, seasonId, activationOrdinal: 1, activatedAt: joinedAt, activationIdempotencyHash: "e".repeat(64), activationRequestHash: "f".repeat(64), guardVersion: 2 });
    if (withPeriod) await fixtures.set(db.collection("memberships").doc(membershipId).collection("validityPeriods").doc(periodId), { ordinal: 1, estado: "abierto", startedAt: joinedAt, periodSchemaVersion: 1 });
  }

  try {
    await Promise.all([
      fixtures.set(db.collection("users").doc(owner.uid), account(owner, actorPerson.owner)),
      fixtures.set(db.collection("users").doc(member.uid), account(member, actorPerson.member)),
      fixtures.set(db.collection("users").doc(outsider.uid), account(outsider, actorPerson.outsider)),
      fixtures.set(db.collection("users").doc(globalAdmin.uid), account(globalAdmin, actorPerson.admin, { roles: "admin" })),
      fixtures.set(db.collection("users").doc(noPersonOwner.uid), account(noPersonOwner)),
      fixtures.set(db.collection("personas").doc(actorPerson.owner), person("Olivia", "Owner", owner.email)),
      fixtures.set(db.collection("personas").doc(actorPerson.member), person("Mara", "Member", member.email)),
      fixtures.set(db.collection("personas").doc(actorPerson.outsider), person("Oscar", "Outside", outsider.email)),
      fixtures.set(db.collection("personas").doc(actorPerson.admin), person("Ada", "Admin", globalAdmin.email)),
    ]);

    await t.test("autenticación, Cuenta, payload y ownership son cerrados e indistinguibles", async () => {
      const groupId = "e2-11-auth-group";
      await seedGroup(groupId);
      const foreignId = "e2-11-foreign-group";
      await seedGroup(foreignId, noPersonOwner.uid);
      const [visitor, accountMissing, absent, foreign, memberDenied, adminDenied, forbiddenField] = await Promise.all([
        call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId }, null),
        call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId }, noAccount),
        call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId: "e2-11-absent" }, outsider),
        call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId }, outsider),
        call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId }, member),
        call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId }, globalAdmin),
        call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId, seasonId: "client" }, owner),
      ]);
      assert.equal(visitor.body.error.details.reason, "UNAUTHENTICATED");
      assert.equal(accountMissing.body.error.details.reason, "ACCOUNT_REQUIRED");
      for (const result of [absent, foreign, memberDenied, adminDenied]) assert.equal(result.body.error.details.reason, "GROUP_NOT_ACCESSIBLE");
      assert.deepEqual(absent.body.error, foreign.body.error);
      assert.equal(forbiddenField.body.error.details.reason, "VALIDATION_FAILED");
    });

    await t.test("Owner sin Persona consulta y ausencia de Temporada es un estado vacío específico", async () => {
      const groupId = "e2-11-no-season";
      await seedGroup(groupId, noPersonOwner.uid, false);
      const result = await call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId }, noPersonOwner);
      assert.deepEqual(result.body.result, { scope: { status: "NO_OPEN_SEASON" }, items: [], nextCursor: null });

      const emptyGroupId = "e2-11-owner-without-membership";
      await seedGroup(emptyGroupId, noPersonOwner.uid, true);
      const empty = await call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId: emptyGroupId }, noPersonOwner);
      assert.deepEqual(empty.body.result, { scope: { status: "OPEN_SEASON" }, items: [], nextCursor: null });
    });

    await t.test("v1/v3 conviven, finalizadas/históricas se excluyen y Persona no disponible conserva fila", async () => {
      const groupId = "e2-11-mixed";
      const seasonId = await seedGroup(groupId);
      const missingPerson = "e2-11-person-missing";
      const incompatiblePerson = "e2-11-person-incompatible";
      await fixtures.set(db.collection("personas").doc(incompatiblePerson), { ...person("Bad", "Schema", "bad@example.invalid"), unexpected: true });
      await seedV1({ membershipId: "e2-11-mixed-01", personId: actorPerson.owner, groupId, seasonId, joinedAt: at(1788177100) });
      await seedV3({ membershipId: "e2-11-mixed-02", personId: actorPerson.member, groupId, seasonId, joinedAt: at(1788177200) });
      await seedV1({ membershipId: "e2-11-mixed-03", personId: missingPerson, groupId, seasonId, joinedAt: at(1788177300) });
      await seedV1({ membershipId: "e2-11-mixed-04", personId: incompatiblePerson, groupId, seasonId, joinedAt: at(1788177400) });
      await fixtures.set(db.collection("memberships").doc("e2-11-finalized"), { personId: actorPerson.outsider, groupId, seasonId, estado: "finalizada", fechaIngreso: at(1788177000), fechaEgreso: at(1788177500), createdAt: at(1788177000), schemaVersion: 2 });
      const historicalSeason = `${groupId}-historical`;
      await fixtures.set(db.collection("seasons").doc(historicalSeason), seasonData(groupId, "cerrada"));
      await fixtures.set(db.collection("memberships").doc("e2-11-historical-active"), membershipV1(actorPerson.outsider, groupId, historicalSeason, at(1788177050)));
      const before = await Promise.all(["memberships", "activeMembershipGuards", "membershipLifecycleGuards", "notifications", "activities"].map((name) => db.collection(name).count().get().then((snapshot) => snapshot.data().count)));
      const result = await call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId }, owner);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.result.scope.status, "OPEN_SEASON");
      assert.deepEqual(result.body.result.items.map((item) => item.membershipId), ["e2-11-mixed-01", "e2-11-mixed-02", "e2-11-mixed-03", "e2-11-mixed-04"]);
      assert.deepEqual(result.body.result.items[0], { membershipId: "e2-11-mixed-01", joinedAt: at(1788177100).toDate().toISOString(), isOwner: true, person: { status: "AVAILABLE", firstName: "Olivia", lastName: "Owner" } });
      assert.deepEqual(result.body.result.items[1].person, { status: "AVAILABLE", firstName: "Mara", lastName: "Member" });
      assert.deepEqual(result.body.result.items[2].person, { status: "UNAVAILABLE" });
      assert.deepEqual(result.body.result.items[3].person, { status: "UNAVAILABLE" });
      assert.equal(result.body.result.nextCursor, null);
      for (const item of result.body.result.items) assert.deepEqual(Object.keys(item).sort(), ["isOwner", "joinedAt", "membershipId", "person"]);
      const serialized = JSON.stringify(result.body.result);
      for (const forbidden of ["personId", "seasonId", "emailContacto", "schemaVersion", "periodCount", "guardVersion", "memberIds", "adminIds"]) assert.equal(serialized.includes(forbidden), false, forbidden);
      const after = await Promise.all(["memberships", "activeMembershipGuards", "membershipLifecycleGuards", "notifications", "activities"].map((name) => db.collection(name).count().get().then((snapshot) => snapshot.data().count)));
      assert.deepEqual(after, before);
    });

    await t.test("paginación 20/21 y empates usan la última fila entregada sin omitir lookahead", async () => {
      const groupId = "e2-11-pages";
      const seasonId = await seedGroup(groupId);
      const sameTime = at(1788178000);
      for (let index = 1; index <= 21; index += 1) {
        const suffix = String(index).padStart(2, "0");
        const personId = `e2-11-page-person-${suffix}`;
        const membershipId = `e2-11-page-membership-${suffix}`;
        await fixtures.set(db.collection("personas").doc(personId), person(`P${suffix}`, "Roster", `${suffix}@example.invalid`));
        await seedV1({ membershipId, personId, groupId, seasonId, joinedAt: sameTime });
      }
      const first = await call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 20 }, owner);
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.equal(first.body.result.items.length, 20);
      assert.equal(first.body.result.items.at(-1).membershipId, "e2-11-page-membership-20");
      assert.equal(typeof first.body.result.nextCursor, "string");
      const second = await call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 20, cursor: first.body.result.nextCursor }, owner);
      assert.deepEqual(second.body.result.items.map((item) => item.membershipId), ["e2-11-page-membership-21"]);
      assert.equal(second.body.result.nextCursor, null);
      assert.equal(new Set([...first.body.result.items, ...second.body.result.items].map((item) => item.membershipId)).size, 21);
    });

    await t.test("cambio de Temporada entre páginas invalida el cursor sin conceder autoridad", async () => {
      const groupId = "e2-11-season-change";
      const seasonId = await seedGroup(groupId);
      for (let index = 1; index <= 2; index += 1) {
        const personId = `e2-11-change-person-${index}`;
        await fixtures.set(db.collection("personas").doc(personId), person(`C${index}`, "Change", `c${index}@example.invalid`));
        await seedV1({ membershipId: `e2-11-change-membership-${index}`, personId, groupId, seasonId, joinedAt: at(1788179000 + index) });
      }
      const first = await call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 1 }, owner);
      const nextSeasonId = `${groupId}-next`;
      await fixtures.set(db.collection("seasons").doc(nextSeasonId), seasonData(groupId));
      await db.collection("seasons").doc(seasonId).update({ estado: "cerrada" });
      await db.collection("openSeasonGuards").doc(groupId).update({ seasonId: nextSeasonId });
      const changed = await call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 1, cursor: first.body.result.nextCursor }, owner);
      assert.equal(changed.body.error.details.reason, "ROSTER_CONTEXT_CHANGED");
      const stolen = await call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 1, cursor: first.body.result.nextCursor }, outsider);
      assert.equal(stolen.body.error.details.reason, "VALIDATION_FAILED");

      const transferGroupId = "e2-11-owner-transfer";
      const transferSeasonId = await seedGroup(transferGroupId);
      for (let index = 1; index <= 2; index += 1) {
        const personId = `e2-11-transfer-person-${index}`;
        await fixtures.set(db.collection("personas").doc(personId), person(`T${index}`, "Transfer", `t${index}@example.invalid`));
        await seedV1({ membershipId: `e2-11-transfer-membership-${index}`, personId, groupId: transferGroupId, seasonId: transferSeasonId, joinedAt: at(1788179500 + index) });
      }
      const beforeTransfer = await call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId: transferGroupId, pageSize: 1 }, owner);
      await db.collection("groups").doc(transferGroupId).update({ ownerId: noPersonOwner.uid });
      const formerOwner = await call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId: transferGroupId, pageSize: 1, cursor: beforeTransfer.body.result.nextCursor }, owner);
      assert.equal(formerOwner.body.error.details.reason, "GROUP_NOT_ACCESSIBLE");
    });

    await t.test("múltiples abiertas, guards, duplicados, schemas y Períodos corruptos fallan cerrados", async () => {
      const cases = ["multiple-seasons", "missing-guard", "duplicate", "unknown-schema", "missing-period"];
      for (const name of cases) {
        const groupId = `e2-11-corrupt-${name}`;
        const seasonId = await seedGroup(groupId);
        const personId = `e2-11-corrupt-person-${name}`;
        await fixtures.set(db.collection("personas").doc(personId), person("Corrupt", name, `${name}@example.invalid`));
        const membershipId = `e2-11-corrupt-membership-${name}`;
        if (name === "missing-period") await seedV3({ membershipId, personId, groupId, seasonId, joinedAt: at(1788180000), withPeriod: false });
        else await seedV1({ membershipId, personId, groupId, seasonId, joinedAt: at(1788180000) });
        if (name === "multiple-seasons") await fixtures.set(db.collection("seasons").doc(`${seasonId}-other`), seasonData(groupId));
        if (name === "missing-guard") await db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)).delete();
        if (name === "duplicate") await fixtures.set(db.collection("memberships").doc(`${membershipId}-duplicate`), membershipV1(personId, groupId, seasonId, at(1788180001)));
        if (name === "unknown-schema") await db.collection("memberships").doc(membershipId).update({ schemaVersion: 99 });
        const result = await call(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId }, owner);
        assert.equal(result.body.error.details.reason, "INCOMPATIBLE_STATE", `${name}: ${JSON.stringify(result.body)}`);
        assert.equal(result.body.result, undefined);
      }
    });

    await t.test("rules conservan deny-all para roster interno ante todos los actores", async () => {
      const groupId = "e2-11-rules";
      const seasonId = await seedGroup(groupId);
      const membershipId = "e2-11-rules-membership";
      await seedV1({ membershipId, personId: actorPerson.member, groupId, seasonId, joinedAt: at(1788181000) });
      const paths = [
        `memberships/${membershipId}`,
        `memberships/${membershipId}/validityPeriods/unused`,
        `activeMembershipGuards/${activeMembershipGuardId(groupId, actorPerson.member)}`,
        `personas/${actorPerson.member}`,
        `seasons/${seasonId}`,
        `openSeasonGuards/${groupId}`,
      ];
      for (const actor of [null, owner, member, outsider, globalAdmin]) {
        for (const path of paths) {
          assert.equal(await direct(firestoreHost, projectId, path, actor), 403, `${actor?.email || "visitor"} ${path}`);
          assert.equal(await direct(firestoreHost, projectId, path, actor, "DELETE"), 403, `${actor?.email || "visitor"} DELETE ${path}`);
        }
      }
    });
  } finally {
    await fixtures.cleanup();
    await auth.deleteUsers([owner.uid, member.uid, outsider.uid, globalAdmin.uid, noPersonOwner.uid, noAccount.uid]);
    await app.delete();
  }
});
