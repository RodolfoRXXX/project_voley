"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { activeMembershipGuardId } = require("../../src/memberships/application/membershipHashing");
const { encodeMyGroupsCursor } = require("../../src/memberships/application/membershipCursor");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-04-synthetic-key`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "E2-04-synthetic-password!", returnSecureToken: true }),
  });
  const body = await json(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken, email };
}
async function call(host, projectId, name, data, idToken) {
  const headers = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, {
    method: "POST", headers, body: JSON.stringify({ data }),
  });
  return { status: response.status, body: await json(response) };
}
async function directGet(host, projectId, path, idToken) {
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return response.status;
}

test("E2-04 lista Grupos operativos propios con cursor, integridad y capacidades member-safe", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e2-04-membership-list-integration");
  const db = app.firestore();
  const auth = app.auth();
  const actors = await Promise.all([
    signUp(authHost, "e2-04-owner-no-person@example.invalid"),
    signUp(authHost, "e2-04-member@example.invalid"),
    signUp(authHost, "e2-04-admin@example.invalid"),
    signUp(authHost, "e2-04-generic@example.invalid"),
    signUp(authHost, "e2-04-pagination@example.invalid"),
  ]);
  const [owner, member, globalAdmin, generic, paginationActor] = actors;
  const prefix = "e2-04-";
  const memberPersonId = `${prefix}person-member`;
  const adminPersonId = `${prefix}person-admin`;
  const paginationPersonId = `${prefix}person-pagination`;
  const membershipIds = [`${prefix}membership-z`, `${prefix}membership-y`, `${prefix}membership-x`];
  const groupIds = [`${prefix}group-z`, `${prefix}group-y`, `${prefix}group-x`];
  const seasonIds = [`${prefix}season-z`, `${prefix}season-y`, `${prefix}season-x`];
  const joinedAt = admin.firestore.Timestamp.fromDate(new Date("2026-08-30T12:00:00.123Z"));

  async function seedGroupSeasonMembership(index) {
    const groupId = groupIds[index];
    const seasonId = seasonIds[index];
    const membershipId = membershipIds[index];
    await db.collection("groups").doc(groupId).set({ nombre: `Grupo ${index}`, deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: joinedAt, schemaVersion: 1 });
    await db.collection("seasons").doc(seasonId).set({ groupId, nombre: `Temporada ${index}`, fechaInicio: "2026-08-01", estado: "abierta", createdAt: joinedAt, schemaVersion: 1 });
    await db.collection("openSeasonGuards").doc(groupId).set({ seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: joinedAt, guardVersion: 1 });
    await db.collection("memberships").doc(membershipId).set({ personId: memberPersonId, groupId, seasonId, estado: "activa", fechaIngreso: joinedAt, createdAt: joinedAt, schemaVersion: 1 });
    await db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, memberPersonId)).set({ membershipId, personId: memberPersonId, groupId, seasonId, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: joinedAt, guardVersion: 1 });
  }

  try {
    await db.collection("users").doc(owner.uid).set({ nombre: "Owner", email: owner.email, photoURL: "", createdAt: joinedAt });
    await db.collection("users").doc(member.uid).set({ nombre: "Member", email: member.email, photoURL: "", createdAt: joinedAt, personaId: memberPersonId });
    await db.collection("personas").doc(memberPersonId).set({ nombre: "Persona", apellido: "Member", emailContacto: member.email, createdAt: joinedAt });
    await db.collection("users").doc(globalAdmin.uid).set({ nombre: "Admin", email: globalAdmin.email, photoURL: "", roles: "admin", createdAt: joinedAt, personaId: adminPersonId });
    await db.collection("personas").doc(adminPersonId).set({ nombre: "Persona", apellido: "Admin", emailContacto: globalAdmin.email, createdAt: joinedAt });
    await db.collection("users").doc(generic.uid).set({ nombre: "Generic", email: generic.email, photoURL: "", createdAt: joinedAt });
    await db.collection("users").doc(paginationActor.uid).set({ nombre: "Pagination", email: paginationActor.email, photoURL: "", createdAt: joinedAt, personaId: paginationPersonId });
    await db.collection("personas").doc(paginationPersonId).set({ nombre: "Persona", apellido: "Pagination", emailContacto: paginationActor.email, createdAt: joinedAt });
    await db.collection("groups").doc(`${prefix}owned-only`).set({ nombre: "Administrado", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: joinedAt, schemaVersion: 1 });
    await Promise.all([0, 1, 2].map(seedGroupSeasonMembership));

    await t.test("autenticación, payload y Persona requerida son contractuales y ownership sigue independiente", async () => {
      const [visitor, unknown, noPerson, owned] = await Promise.all([
        call(functionsHost, projectId, "listMyCurrentGroupMemberships", {}),
        call(functionsHost, projectId, "listMyCurrentGroupMemberships", { personId: memberPersonId }, member.idToken),
        call(functionsHost, projectId, "listMyCurrentGroupMemberships", {}, owner.idToken),
        call(functionsHost, projectId, "listOwnGroups", {}, owner.idToken),
      ]);
      assert.equal(visitor.body?.error?.details?.reason, "UNAUTHENTICATED");
      assert.equal(unknown.body?.error?.details?.reason, "VALIDATION_FAILED");
      assert.equal(noPerson.body?.error?.details?.reason, "PERSON_REQUIRED");
      assert.equal(owned.body?.result?.items?.some((group) => group.id === `${prefix}owned-only`), true);
    });

    let firstCursor;
    await t.test("índice aplica fechaIngreso e ID descendentes, lookahead y páginas sin omisiones", async () => {
      const first = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 2 }, member.idToken);
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.deepEqual(first.body.result.items.map((item) => item.membership.id), membershipIds.slice(0, 2));
      firstCursor = first.body.result.nextCursor;
      assert.equal(typeof firstCursor, "string");
      const second = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 2, cursor: firstCursor }, member.idToken);
      assert.deepEqual(second.body.result.items.map((item) => item.membership.id), [membershipIds[2]]);
      assert.equal(second.body.result.nextCursor, null);
      const all = [...first.body.result.items, ...second.body.result.items];
      assert.deepEqual(new Set(all.map((item) => item.membership.id)).size, 3);
      for (const item of all) {
        assert.deepEqual(Object.keys(item).sort(), ["group", "membership"]);
        assert.deepEqual(Object.keys(item.membership).sort(), ["estado", "fechaIngreso", "id", "seasonId"]);
        assert.deepEqual(Object.keys(item.group).sort(), ["deporte", "estado", "id", "nombre"]);
        assert.equal(JSON.stringify(item).includes("personId"), false);
        assert.match(item.membership.fechaIngreso, /Z$/);
      }
    });

    await t.test("cursor válido caller-crafted con checksum recalculado nunca cambia la Persona derivada", async () => {
      const craftedCursor = encodeMyGroupsCursor({
        seconds: joinedAt.seconds,
        nanoseconds: joinedAt.nanoseconds,
        lastMembershipId: `${prefix}caller-crafted-position`,
      });
      assert.notEqual(craftedCursor, firstCursor);
      const result = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 2, cursor: craftedCursor }, globalAdmin.idToken);
      assert.deepEqual(result.body?.result, { items: [], nextCursor: null });
      const altered = `${firstCursor.slice(0, -1)}${firstCursor.endsWith("A") ? "B" : "A"}`;
      const invalid = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { cursor: altered }, member.idToken);
      assert.equal(invalid.body?.error?.details?.reason, "VALIDATION_FAILED");
    });

    await t.test("página filtrada puede quedar vacía con continuación y el lookahead reaparece", async () => {
      const replacement = `${prefix}season-z-current`;
      const originalSeasonRef = db.collection("seasons").doc(seasonIds[0]);
      const originalSeason = (await originalSeasonRef.get()).data();
      await db.collection("seasons").doc(replacement).set({ groupId: groupIds[0], nombre: "Actual", fechaInicio: "2026-08-02", estado: "abierta", createdAt: joinedAt, schemaVersion: 1 });
      await db.collection("openSeasonGuards").doc(groupIds[0]).update({ seasonId: replacement });
      await originalSeasonRef.delete();
      const empty = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 1 }, member.idToken);
      assert.deepEqual(empty.body.result.items, []);
      assert.equal(typeof empty.body.result.nextCursor, "string");
      const following = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 1, cursor: empty.body.result.nextCursor }, member.idToken);
      assert.deepEqual(following.body.result.items.map((item) => item.membership.id), [membershipIds[1]]);
      await db.collection("openSeasonGuards").doc(groupIds[0]).update({ seasonId: seasonIds[0] });
      await db.collection("seasons").doc(replacement).delete();
      await originalSeasonRef.set(originalSeason);
    });

    await t.test("cardinalidad abierta real distingue ausencia legítima de corrupción guard/documento", async () => {
      const guardRef = db.collection("openSeasonGuards").doc(groupIds[0]);
      const seasonRef = db.collection("seasons").doc(seasonIds[0]);
      const originalGuard = (await guardRef.get()).data();
      const originalSeason = (await seasonRef.get()).data();
      await guardRef.delete();
      const oneWithoutGuard = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 1 }, member.idToken);
      assert.equal(oneWithoutGuard.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      await seasonRef.delete();
      const absent = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 1 }, member.idToken);
      assert.deepEqual(absent.body.result.items, []);
      await guardRef.set(originalGuard);
      const guardWithoutOpen = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 1 }, member.idToken);
      assert.equal(guardWithoutOpen.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      await seasonRef.set(originalSeason);
      const secondOpenRef = db.collection("seasons").doc(`${prefix}season-z-second-open`);
      await secondOpenRef.set({ ...originalSeason, nombre: "Segunda abierta" });
      const twoOpen = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 1 }, member.idToken);
      assert.equal(twoOpen.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      await secondOpenRef.delete();
      await guardRef.update({ requestHash: "broken" });
      const broken = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 1 }, member.idToken);
      assert.equal(broken.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      await guardRef.set(originalGuard);
      await guardRef.update({ seasonId: seasonIds[1] });
      const foreign = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 1 }, member.idToken);
      assert.equal(foreign.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      await guardRef.set(originalGuard);
      const groupRef = db.collection("groups").doc(groupIds[0]);
      const group = (await groupRef.get()).data();
      await groupRef.delete();
      const missingGroup = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 1 }, member.idToken);
      assert.equal(missingGroup.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      await groupRef.set(group);
    });

    await t.test("guard de Membresía ausente y dos activas fallan cerrado sin reparar", async () => {
      const guardRef = db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupIds[0], memberPersonId));
      const guard = (await guardRef.get()).data();
      await guardRef.delete();
      const absent = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 1 }, member.idToken);
      assert.equal(absent.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal((await guardRef.get()).exists, false);
      await guardRef.set(guard);
      const duplicateRef = db.collection("memberships").doc(`${prefix}membership-z-duplicate`);
      await duplicateRef.set({ personId: memberPersonId, groupId: groupIds[0], seasonId: seasonIds[0], estado: "activa", fechaIngreso: admin.firestore.Timestamp.fromMillis(joinedAt.toMillis() - 1), createdAt: joinedAt, schemaVersion: 1 });
      const duplicate = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 1 }, member.idToken);
      assert.equal(duplicate.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal((await duplicateRef.get()).exists, true);
      await duplicateRef.delete();
    });

    await t.test("pageSize 20 distingue exactamente 20 de 21 y detecta duplicado fuera de la primera página", async () => {
      async function seedPaginationMembership(index) {
        const suffix = String(index).padStart(2, "0");
        const groupId = `${prefix}page-group-${suffix}`;
        const seasonId = `${prefix}page-season-${suffix}`;
        const membershipId = `${prefix}page-membership-${suffix}`;
        const timestamp = admin.firestore.Timestamp.fromMillis(joinedAt.toMillis() - (index * 1000));
        await db.collection("groups").doc(groupId).set({ nombre: `Grupo página ${suffix}`, deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: joinedAt, schemaVersion: 1 });
        await db.collection("seasons").doc(seasonId).set({ groupId, nombre: `Temporada ${suffix}`, fechaInicio: "2026-08-01", estado: "abierta", createdAt: joinedAt, schemaVersion: 1 });
        await db.collection("openSeasonGuards").doc(groupId).set({ seasonId, idempotencyKeyHash: "e".repeat(64), requestHash: "f".repeat(64), createdAt: joinedAt, guardVersion: 1 });
        await db.collection("memberships").doc(membershipId).set({ personId: paginationPersonId, groupId, seasonId, estado: "activa", fechaIngreso: timestamp, createdAt: joinedAt, schemaVersion: 1 });
        await db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, paginationPersonId)).set({ membershipId, personId: paginationPersonId, groupId, seasonId, idempotencyKeyHash: "1".repeat(64), requestHash: "2".repeat(64), createdAt: joinedAt, guardVersion: 1 });
        return { groupId, seasonId };
      }

      const fixtures = [];
      for (let index = 0; index < 20; index += 1) fixtures.push(await seedPaginationMembership(index));
      const exact = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 20 }, paginationActor.idToken);
      assert.equal(exact.body?.result?.items?.length, 20, JSON.stringify(exact.body));
      assert.equal(exact.body.result.nextCursor, null);

      fixtures.push(await seedPaginationMembership(20));
      const lookahead = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 20 }, paginationActor.idToken);
      assert.equal(lookahead.body?.result?.items?.length, 20, JSON.stringify(lookahead.body));
      assert.equal(typeof lookahead.body.result.nextCursor, "string");

      const duplicateRef = db.collection("memberships").doc(`${prefix}page-membership-duplicate-outside-page`);
      await duplicateRef.set({
        personId: paginationPersonId,
        groupId: fixtures[0].groupId,
        seasonId: fixtures[0].seasonId,
        estado: "activa",
        fechaIngreso: admin.firestore.Timestamp.fromMillis(joinedAt.toMillis() - 60000),
        createdAt: joinedAt,
        schemaVersion: 1,
      });
      const duplicate = await call(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 20 }, paginationActor.idToken);
      assert.equal(duplicate.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal((await duplicateRef.get()).exists, true);
      await duplicateRef.delete();
    });

    await t.test("reglas niegan lecturas directas canónicas a integrante, Owner, admin y autenticado genérico", async () => {
      const paths = [
        `personas/${memberPersonId}`, `groups/${groupIds[0]}`, `seasons/${seasonIds[0]}`,
        `openSeasonGuards/${groupIds[0]}`, `memberships/${membershipIds[0]}`,
        `activeMembershipGuards/${activeMembershipGuardId(groupIds[0], memberPersonId)}`,
      ];
      for (const actor of [member, owner, globalAdmin, generic]) {
        for (const path of paths) assert.equal(await directGet(firestoreHost, projectId, path, actor.idToken), 403, `${actor.email} ${path}`);
      }
    });

    await t.test("cleanup registral elimina sólo fixtures propios y preserva datos ajenos", async () => {
      const registry = createFirestoreFixtureRegistry(db);
      const ownedRef = db.collection("memberships").doc(`${prefix}cleanup-owned`);
      const foreignRef = db.collection("memberships").doc("foreign-e2-04-preserved");
      await registry.set(ownedRef, { marker: "owned" });
      await foreignRef.set({ marker: "foreign" });
      await registry.cleanup();
      assert.equal((await ownedRef.get()).exists, false);
      assert.equal((await foreignRef.get()).data()?.marker, "foreign");
      await foreignRef.delete();
    });
  } finally {
    for (const collection of ["activeMembershipGuards", "memberships", "openSeasonGuards", "seasons", "groups", "personas"]) {
      const snapshot = await db.collection(collection).get();
      const batch = db.batch();
      for (const document of snapshot.docs) if (document.id.startsWith(prefix)) batch.delete(document.ref);
      await batch.commit();
    }
    const batch = db.batch();
    for (const actor of actors) batch.delete(db.collection("users").doc(actor.uid));
    await batch.commit();
    await Promise.allSettled(actors.map((actor) => auth.deleteUser(actor.uid)));
    await app.delete();
  }
});
