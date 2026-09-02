"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createMembershipService } = require("../../src/memberships/application/membershipService");
const { activeMembershipGuardId, membershipLifecycleGuardId } = require("../../src/memberships/application/membershipHashing");
const {
  createFirestoreActiveMembershipGuard,
  isMembershipContention,
} = require("../../src/memberships/infrastructure/firestoreActiveMembershipGuard");
const { createFirestoreMembershipRepository } = require("../../src/memberships/infrastructure/firestoreMembershipRepository");
const { createFirestoreGroupRepository } = require("../../src/groups/infrastructure/firestoreGroupRepository");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function readJson(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-03-synthetic-key`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "E2-03-synthetic-password!", returnSecureToken: true }),
  });
  const body = await readJson(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken, email };
}
async function invokeFunction(host, projectId, name, data, idToken) {
  const headers = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers, body: JSON.stringify({ data }) });
  return { status: response.status, body: await readJson(response) };
}
async function firestoreRequest({ host, projectId, path, idToken, method = "GET", body }) {
  const headers = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await readJson(response) };
}

async function seedAccountAndPerson(db, actor, personId, accountExtra = {}, personExtra = {}) {
  await db.collection("users").doc(actor.uid).set({ nombre: "Cuenta", email: actor.email, photoURL: "", createdAt: new Date(), personaId: personId, ...accountExtra });
  await db.collection("personas").doc(personId).set({ nombre: "Persona", apellido: "Sintética", emailContacto: actor.email, createdAt: new Date(), ...personExtra });
}
async function seedAccount(db, actor, extra = {}) {
  await db.collection("users").doc(actor.uid).set({ nombre: "Cuenta", email: actor.email, photoURL: "", createdAt: new Date(), ...extra });
}
async function seedGroupAndSeason(db, groupId, ownerId, seasonId) {
  await db.collection("groups").doc(groupId).set({ nombre: `Grupo ${groupId}`, deporte: "voleibol", ownerId, estado: "activo", createdAt: new Date(), schemaVersion: 1 });
  await db.collection("seasons").doc(seasonId).set({ groupId, nombre: "Temporada", fechaInicio: "2026-08-01", estado: "abierta", createdAt: new Date(), schemaVersion: 1 });
  await db.collection("openSeasonGuards").doc(groupId).set({ seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: new Date(), guardVersion: 1 });
}
function command(groupId, idempotencyKey = "e2-03-idempotency-key-0001") { return { groupId, idempotencyKey }; }

test("E2-03 crea y consulta Membresía propia del Owner con unicidad transaccional", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e2-03-membership-integration");
  const db = app.firestore();
  const auth = app.auth();
  const fixtures = createFirestoreFixtureRegistry(db);
  const actors = await Promise.all([
    signUp(authHost, "e2-03-owner@example.invalid"),
    signUp(authHost, "e2-03-admin@example.invalid"),
    signUp(authHost, "e2-03-no-person@example.invalid"),
    signUp(authHost, "e2-03-broken-person@example.invalid"),
    signUp(authHost, "e2-03-concurrent-same@example.invalid"),
    signUp(authHost, "e2-03-concurrent-different@example.invalid"),
  ]);
  const [owner, globalAdmin, noPerson, brokenPerson, concurrentSame, concurrentDifferent] = actors;
  const ids = {
    person: "e2-03-person-owner", ownerGroup: "e2-03-group-owner", ownerSeason: "e2-03-season-owner",
    noPersonGroup: "e2-03-group-no-person", noPersonSeason: "e2-03-season-no-person",
    brokenGroup: "e2-03-group-broken-person", brokenSeason: "e2-03-season-broken-person",
    noSeasonGroup: "e2-03-group-no-season", samePerson: "e2-03-person-same", sameGroup: "e2-03-group-same", sameSeason: "e2-03-season-same",
    differentPerson: "e2-03-person-different", differentGroup: "e2-03-group-different", differentSeason: "e2-03-season-different",
    orphanGroup: "e2-03-group-orphan", orphanSeason: "e2-03-season-orphan", brokenGuardGroup: "e2-03-group-broken-guard", brokenGuardSeason: "e2-03-season-broken-guard",
    secondGroup: "e2-03-group-second", secondSeason: "e2-03-season-second", raceGroup: "e2-03-group-race", raceSeason: "e2-03-season-race",
    concurrentRaceGroup: "e2-03-group-concurrent-race", concurrentRaceSeason: "e2-03-season-concurrent-race",
    finalizeGroup: "e2-03-e205-group-finalize", finalizeSeason: "e2-03-e205-season-finalize",
    concurrentFinalizeGroup: "e2-03-e205-group-concurrent-finalize", concurrentFinalizeSeason: "e2-03-e205-season-concurrent-finalize",
    noOpenFinalizeGroup: "e2-03-e205-group-no-open-finalize", noOpenFinalizeSeason: "e2-03-e205-season-no-open-finalize",
    transferFinalizeGroup: "e2-03-e205-group-transfer-finalize", transferFinalizeSeason: "e2-03-e205-season-transfer-finalize",
    raceFinalizeGroup: "e2-03-e205-group-race-finalize", raceFinalizeSeason: "e2-03-e205-season-race-finalize",
    noneFinalizeGroup: "e2-03-e205-group-none-finalize", noneFinalizeSeason: "e2-03-e205-season-none-finalize",
  };
  const contentionCases = Array.from({ length: 20 }, (_, index) => ({
    groupId: index === 0 ? ids.differentGroup : `e2-03-group-contention-${String(index).padStart(2, "0")}`,
    seasonId: index === 0 ? ids.differentSeason : `e2-03-season-contention-${String(index).padStart(2, "0")}`,
  }));
  const membershipGroupIds = [
    ids.ownerGroup, ids.sameGroup, ...contentionCases.map((item) => item.groupId), ids.orphanGroup,
    ids.brokenGuardGroup, ids.secondGroup, ids.raceGroup, ids.concurrentRaceGroup,
    ids.finalizeGroup, ids.concurrentFinalizeGroup, ids.noOpenFinalizeGroup,
    ids.transferFinalizeGroup, ids.raceFinalizeGroup, ids.noneFinalizeGroup,
  ];
  const possibleGuardPairs = [
    [ids.ownerGroup, ids.person], [ids.orphanGroup, ids.person],
    [ids.brokenGuardGroup, ids.person], [ids.secondGroup, ids.person],
    [ids.raceGroup, ids.person], [ids.concurrentRaceGroup, ids.person], [ids.sameGroup, ids.samePerson],
    [ids.finalizeGroup, ids.person], [ids.concurrentFinalizeGroup, ids.person], [ids.noOpenFinalizeGroup, ids.person],
    [ids.transferFinalizeGroup, ids.person], [ids.raceFinalizeGroup, ids.person], [ids.noneFinalizeGroup, ids.person],
    ...contentionCases.map((item) => [item.groupId, ids.differentPerson]),
  ];
  for (const [groupId, personId] of possibleGuardPairs) {
    fixtures.register(db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groupId, personId)));
    fixtures.register(db.collection("membershipLifecycleGuards").doc(membershipLifecycleGuardId(groupId, personId)));
  }
  const callFunction = async (host, callableProjectId, name, data, idToken) => {
    const result = await invokeFunction(host, callableProjectId, name, data, idToken);
    const membership = result.body?.result?.membership;
    if (name === "createMyMembershipForOwnedGroup" && membership?.id) {
      fixtures.register(db.collection("memberships").doc(membership.id));
      fixtures.register(db.collection("activeMembershipGuards").doc(
        activeMembershipGuardId(membership.groupId, membership.personId)
      ));
    }
    return result;
  };

  try {
    await seedAccountAndPerson(db, owner, ids.person);
    await seedAccount(db, globalAdmin, { roles: "admin", personaId: "e2-03-person-admin" });
    await db.collection("personas").doc("e2-03-person-admin").set({ nombre: "Admin", apellido: "Global", emailContacto: globalAdmin.email, createdAt: new Date() });
    await seedAccount(db, noPerson);
    await seedAccount(db, brokenPerson, { personaId: "e2-03-person-missing" });
    await seedAccountAndPerson(db, concurrentSame, ids.samePerson);
    await seedAccountAndPerson(db, concurrentDifferent, ids.differentPerson);
    await Promise.all([
      seedGroupAndSeason(db, ids.ownerGroup, owner.uid, ids.ownerSeason),
      seedGroupAndSeason(db, ids.noPersonGroup, noPerson.uid, ids.noPersonSeason),
      seedGroupAndSeason(db, ids.brokenGroup, brokenPerson.uid, ids.brokenSeason),
      seedGroupAndSeason(db, ids.sameGroup, concurrentSame.uid, ids.sameSeason),
      ...contentionCases.map((item) => seedGroupAndSeason(db, item.groupId, concurrentDifferent.uid, item.seasonId)),
      seedGroupAndSeason(db, ids.orphanGroup, owner.uid, ids.orphanSeason),
      seedGroupAndSeason(db, ids.brokenGuardGroup, owner.uid, ids.brokenGuardSeason),
      seedGroupAndSeason(db, ids.secondGroup, owner.uid, ids.secondSeason),
      seedGroupAndSeason(db, ids.raceGroup, owner.uid, ids.raceSeason),
      seedGroupAndSeason(db, ids.concurrentRaceGroup, owner.uid, ids.concurrentRaceSeason),
      seedGroupAndSeason(db, ids.finalizeGroup, owner.uid, ids.finalizeSeason),
      seedGroupAndSeason(db, ids.concurrentFinalizeGroup, owner.uid, ids.concurrentFinalizeSeason),
      seedGroupAndSeason(db, ids.noOpenFinalizeGroup, owner.uid, ids.noOpenFinalizeSeason),
      seedGroupAndSeason(db, ids.transferFinalizeGroup, owner.uid, ids.transferFinalizeSeason),
      seedGroupAndSeason(db, ids.raceFinalizeGroup, owner.uid, ids.raceFinalizeSeason),
      seedGroupAndSeason(db, ids.noneFinalizeGroup, owner.uid, ids.noneFinalizeSeason),
    ]);
    await db.collection("groups").doc(ids.noSeasonGroup).set({ nombre: "Sin temporada", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: new Date(), schemaVersion: 1 });

    await t.test("payload, autenticación, Persona, ownership y Temporada fallan cerrado", async () => {
      const [visitor, manipulated, missingPersonResult, brokenPersonResult, adminResult, noSeasonResult] = await Promise.all([
        callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.ownerGroup)),
        callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", { ...command(ids.ownerGroup), personId: ids.person }, owner.idToken),
        callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.noPersonGroup), noPerson.idToken),
        callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.brokenGroup), brokenPerson.idToken),
        callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.ownerGroup), globalAdmin.idToken),
        callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.noSeasonGroup), owner.idToken),
      ]);
      assert.equal(visitor.body?.error?.details?.reason, "UNAUTHENTICATED");
      assert.equal(manipulated.body?.error?.details?.reason, "VALIDATION_FAILED");
      assert.equal(missingPersonResult.body?.error?.details?.reason, "PERSON_REQUIRED");
      assert.equal(brokenPersonResult.body?.error?.details?.reason, "PERSON_INCOMPATIBLE");
      assert.equal(adminResult.body?.error?.details?.reason, "NOT_AUTHORIZED");
      assert.equal(noSeasonResult.body?.error?.details?.reason, "OPEN_SEASON_REQUIRED");
      assert.equal((await db.collection("memberships").get()).size, 0);
      assert.equal((await db.collection("activeMembershipGuards").get()).size, 0);
    });

    let created;
    await t.test("crea documento y guard exactos sin efectos colaterales", async () => {
      const watched = [
        db.collection("users").doc(owner.uid), db.collection("personas").doc(ids.person),
        db.collection("groups").doc(ids.ownerGroup), db.collection("seasons").doc(ids.ownerSeason),
        db.collection("openSeasonGuards").doc(ids.ownerGroup),
      ];
      const before = await Promise.all(watched.map(async (ref) => (await ref.get()).data()));
      const result = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.ownerGroup), owner.idToken);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.result.outcome, "CREATED_ACTIVE");
      created = result.body.result.membership;
      assert.deepEqual(Object.keys(created).sort(), ["estado", "fechaIngreso", "groupId", "id", "personId", "seasonId"]);
      assert.equal(created.personId, ids.person);
      assert.equal(created.groupId, ids.ownerGroup);
      assert.equal(created.seasonId, ids.ownerSeason);
      assert.equal(created.estado, "activa");
      assert.match(created.fechaIngreso, /^\d{4}-\d{2}-\d{2}T.*Z$/);
      assert.notEqual(created.id, owner.uid);
      assert.notEqual(created.id, ids.person);
      assert.notEqual(created.id, ids.ownerGroup);

      const document = (await db.collection("memberships").doc(created.id).get()).data();
      assert.deepEqual(Object.keys(document).sort(), ["createdAt", "estado", "fechaIngreso", "groupId", "personId", "schemaVersion", "seasonId"]);
      assert.equal(document.schemaVersion, 1);
      assert.equal(document.fechaIngreso.isEqual(document.createdAt), true);
      const guardId = activeMembershipGuardId(ids.ownerGroup, ids.person);
      const guard = (await db.collection("activeMembershipGuards").doc(guardId).get()).data();
      assert.deepEqual(Object.keys(guard).sort(), ["createdAt", "groupId", "guardVersion", "idempotencyKeyHash", "membershipId", "personId", "requestHash", "seasonId"]);
      assert.equal(guard.membershipId, created.id);
      assert.equal(guard.personId, ids.person);
      assert.equal(guard.groupId, ids.ownerGroup);
      assert.equal(guard.seasonId, ids.ownerSeason);
      assert.match(guard.idempotencyKeyHash, /^[a-f0-9]{64}$/);
      assert.equal(JSON.stringify(guard).includes("e2-03-idempotency-key-0001"), false);
      assert.deepEqual(await Promise.all(watched.map(async (ref) => (await ref.get()).data())), before);
      for (const collection of ["requests", "activities", "notifications", "alerts", "payments", "matches", "teams", "participations"]) {
        assert.equal((await db.collection(collection).get()).size, 0, collection);
      }
    });

    await t.test("Firestore Emulator expone ABORTED estructurado al agotar la contención", async (diagnosticTest) => {
      const guardRef = db.collection("activeMembershipGuards").doc(activeMembershipGuardId(ids.ownerGroup, ids.person));
      let arrivals = 0;
      let releaseBarrier;
      const barrier = new Promise((resolve) => { releaseBarrier = resolve; });
      async function contend() {
        return db.runTransaction(async (transaction) => {
          await transaction.get(guardRef);
          arrivals += 1;
          if (arrivals === 2) releaseBarrier();
          await barrier;
          transaction.update(guardRef, { createdAt: admin.firestore.FieldValue.serverTimestamp() });
        }, { maxAttempts: 1 });
      }
      const settled = await Promise.allSettled([contend(), contend()]);
      const sanitized = settled.map((item) => item.status === "fulfilled" ? { status: item.status } : {
        status: item.status,
        code: item.reason?.code,
        codeType: typeof item.reason?.code,
        name: item.reason?.name,
        constructor: item.reason?.constructor?.name,
        causeCode: item.reason?.cause?.code,
        causeCodeType: typeof item.reason?.cause?.code,
        message: item.reason?.message,
      });
      diagnosticTest.diagnostic(`H04-R1 sanitized emulator results: ${JSON.stringify(sanitized)}`);
      const rejected = settled.filter((item) => item.status === "rejected");
      assert.equal(rejected.length >= 1, true, JSON.stringify(sanitized));
      for (const item of rejected) {
        assert.equal(isMembershipContention(item.reason), true);
        assert.equal(item.reason.code, 10);
        assert.equal(typeof item.reason.code, "number");
      }

      const createRef = fixtures.register(db.collection("memberships").doc("e2-03-contention-diagnostic"));
      let createArrivals = 0;
      let releaseCreateBarrier;
      const createBarrier = new Promise((resolve) => { releaseCreateBarrier = resolve; });
      async function contendCreate() {
        return db.runTransaction(async (transaction) => {
          createArrivals += 1;
          if (createArrivals === 2) releaseCreateBarrier();
          await createBarrier;
          transaction.create(createRef, {
            personId: "e2-03-diagnostic-person",
            groupId: "e2-03-diagnostic-group",
            seasonId: "e2-03-diagnostic-season",
            estado: "activa",
            fechaIngreso: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            schemaVersion: 1,
          });
        }, { maxAttempts: 1 });
      }
      const createSettled = await Promise.allSettled([contendCreate(), contendCreate()]);
      const createSanitized = createSettled.map((item) => item.status === "fulfilled" ? { status: item.status } : {
        status: item.status,
        code: item.reason?.code,
        codeType: typeof item.reason?.code,
        name: item.reason?.name,
        constructor: item.reason?.constructor?.name,
        causeCode: item.reason?.cause?.code,
        causeCodeType: typeof item.reason?.cause?.code,
        message: item.reason?.message,
      });
      diagnosticTest.diagnostic(`H04-R1 sanitized create results: ${JSON.stringify(createSanitized)}`);
      assert.equal(createSettled.filter((item) => item.status === "fulfilled").length, 1, JSON.stringify(createSanitized));
      const createRejected = createSettled.filter((item) => item.status === "rejected");
      assert.equal(createRejected.length, 1, JSON.stringify(createSanitized));
      assert.equal(isMembershipContention(createRejected[0].reason), true);
      assert.equal(createRejected[0].reason.code, 6);
      assert.equal(typeof createRejected[0].reason.code, "number");
    });

    await t.test("respuesta perdida/retry recupera exactamente la misma Membresía y otra clave se rechaza", async () => {
      const retry = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.ownerGroup), owner.idToken);
      const different = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.ownerGroup, "e2-03-another-intent-key-0001"), owner.idToken);
      assert.equal(retry.body?.result?.outcome, "EXISTING_IDEMPOTENT");
      assert.equal(retry.body.result.membership.id, created.id);
      assert.equal(different.body?.error?.details?.reason, "MEMBERSHIP_ALREADY_EXISTS");
      assert.equal((await db.collection("memberships").where("personId", "==", ids.person).where("groupId", "==", ids.ownerGroup).where("estado", "==", "activa").get()).size, 1);
    });

    await t.test("misma clave con request incompatible dentro del guard produce conflicto", async () => {
      const replacementSeason = "e2-03-season-replacement";
      await db.collection("seasons").doc(replacementSeason).set({ groupId: ids.ownerGroup, nombre: "Reemplazo sintético", fechaInicio: "2026-09-01", estado: "abierta", createdAt: new Date(), schemaVersion: 1 });
      await db.collection("openSeasonGuards").doc(ids.ownerGroup).update({ seasonId: replacementSeason });
      const conflict = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.ownerGroup), owner.idToken);
      assert.equal(conflict.body?.error?.details?.reason, "IDEMPOTENCY_CONFLICT", JSON.stringify(conflict.body));
      await db.collection("openSeasonGuards").doc(ids.ownerGroup).update({ seasonId: ids.ownerSeason });
      await db.collection("seasons").doc(replacementSeason).delete();
    });

    await t.test("consulta devuelve la activa exacta y conserva owner/self-scope", async () => {
      const [own, foreign] = await Promise.all([
        callFunction(functionsHost, projectId, "getMyMembershipForOwnedGroup", { groupId: ids.ownerGroup }, owner.idToken),
        callFunction(functionsHost, projectId, "getMyMembershipForOwnedGroup", { groupId: ids.ownerGroup }, globalAdmin.idToken),
      ]);
      assert.deepEqual(own.body?.result?.membership, created);
      assert.equal(foreign.body?.error?.details?.reason, "NOT_AUTHORIZED");
    });

    await t.test("misma clave en otro Grupo permanece acotada al contexto", async () => {
      const result = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.secondGroup), owner.idToken);
      assert.equal(result.body?.result?.outcome, "CREATED_ACTIVE", JSON.stringify(result.body));
      assert.notEqual(result.body.result.membership.id, created.id);
    });

    await t.test("concurrencia igual converge y distinta deja como máximo una activa", async () => {
      const samePayload = command(ids.sameGroup, "e2-03-concurrent-same-key-001");
      const same = await Promise.all([
        callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", samePayload, concurrentSame.idToken),
        callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", samePayload, concurrentSame.idToken),
      ]);
      assert.deepEqual(same.map((item) => item.body?.result?.outcome).sort(), ["CREATED_ACTIVE", "EXISTING_IDEMPOTENT"]);
      assert.equal(same[0].body.result.membership.id, same[1].body.result.membership.id);
      for (const [index, fixture] of contentionCases.entries()) {
        const different = await Promise.all([
          callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(fixture.groupId, `e2-03-contention-${String(index).padStart(2, "0")}-key-a`), concurrentDifferent.idToken),
          callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(fixture.groupId, `e2-03-contention-${String(index).padStart(2, "0")}-key-b`), concurrentDifferent.idToken),
        ]);
        const guardId = activeMembershipGuardId(fixture.groupId, ids.differentPerson);
        const lifecycleId = membershipLifecycleGuardId(fixture.groupId, ids.differentPerson);
        const [active, guard, lifecycle] = await Promise.all([
          db.collection("memberships").where("personId", "==", ids.differentPerson).where("groupId", "==", fixture.groupId).where("estado", "==", "activa").get(),
          db.collection("activeMembershipGuards").doc(guardId).get(),
          db.collection("membershipLifecycleGuards").doc(lifecycleId).get(),
        ]);
        const persisted = {
          activeCount: active.size,
          activeGuardCount: guard.exists ? 1 : 0,
          lifecycleGuardCount: lifecycle.exists ? 1 : 0,
          correlated: active.size === 1 && guard.exists && guard.data().membershipId === active.docs[0].id,
        };
        assert.deepEqual(persisted, { activeCount: 1, activeGuardCount: 1, lifecycleGuardCount: 0, correlated: true }, JSON.stringify({ index, different, persisted }));
        assert.equal(different.filter((item) => item.body?.result?.outcome === "CREATED_ACTIVE").length, 1, JSON.stringify({ index, different }));
        assert.equal(different.filter((item) => ["MEMBERSHIP_ALREADY_EXISTS", "CONFLICT"].includes(item.body?.error?.details?.reason)).length, 1, JSON.stringify({ index, different, persisted }));
        assert.equal(different.some((item) => item.body?.error?.details?.reason === "INTERNAL_ERROR"), false, JSON.stringify({ index, different, persisted }));
      }
    });

    await t.test("activa huérfana incluso de otra Temporada y guard roto fallan cerrado sin reparar", async () => {
      await fixtures.set(db.collection("memberships").doc("e2-03-orphan-membership"), { personId: ids.person, groupId: ids.orphanGroup, seasonId: "e2-03-historical-season", estado: "activa", fechaIngreso: new Date(), createdAt: new Date(), schemaVersion: 1 });
      const brokenGuardId = activeMembershipGuardId(ids.brokenGuardGroup, ids.person);
      await fixtures.set(db.collection("activeMembershipGuards").doc(brokenGuardId), { membershipId: "e2-03-missing-membership", personId: ids.person, groupId: ids.brokenGuardGroup, seasonId: ids.brokenGuardSeason, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: new Date(), guardVersion: 1 });
      const [orphanCreate, orphanGet, broken] = await Promise.all([
        callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.orphanGroup, "e2-03-orphan-attempt-key-001"), owner.idToken),
        callFunction(functionsHost, projectId, "getMyMembershipForOwnedGroup", { groupId: ids.orphanGroup }, owner.idToken),
        callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.brokenGuardGroup, "e2-03-broken-attempt-key-001"), owner.idToken),
      ]);
      assert.equal(orphanCreate.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal(orphanGet.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal(broken.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal((await db.collection("activeMembershipGuards").doc(activeMembershipGuardId(ids.orphanGroup, ids.person)).get()).exists, false);
      assert.equal((await db.collection("memberships").doc("e2-03-missing-membership").get()).exists, false);
      await fixtures.set(db.collection("memberships").doc("e2-03-second-orphan-membership"), { personId: ids.person, groupId: ids.orphanGroup, seasonId: "e2-03-other-historical-season", estado: "activa", fechaIngreso: new Date(), createdAt: new Date(), schemaVersion: 1 });
      const multiple = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.orphanGroup, "e2-03-multiple-attempt-key-01"), owner.idToken);
      assert.equal(multiple.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal((await db.collection("memberships").where("personId", "==", ids.person).where("groupId", "==", ids.orphanGroup).where("estado", "==", "activa").limit(2).get()).size, 2);
      await db.collection("memberships").doc("e2-03-orphan-membership").delete();
      await db.collection("memberships").doc("e2-03-second-orphan-membership").delete();
      await db.collection("activeMembershipGuards").doc(brokenGuardId).delete();
    });

    await t.test("ownership transferido antes de invocar es autorización negativa normal", async () => {
      await db.collection("groups").doc(ids.raceGroup).update({ ownerId: globalAdmin.uid });
      const result = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.raceGroup, "e2-03-transferred-owner-key-01"), owner.idToken);
      assert.equal(result.body?.error?.details?.reason, "NOT_AUTHORIZED");
      assert.equal((await db.collection("memberships").where("groupId", "==", ids.raceGroup).get()).size, 0);
    });

    await t.test("ownership transferido después del preflight y antes de la transacción rechaza sin escribir", async () => {
      const membershipRepository = createFirestoreMembershipRepository({ db });
      const groupRepository = createFirestoreGroupRepository({ db });
      const realGuard = createFirestoreActiveMembershipGuard({ db, groupRepository });
      let releaseTransaction;
      let signalPreflightComplete;
      const transactionRelease = new Promise((resolve) => { releaseTransaction = resolve; });
      const preflightComplete = new Promise((resolve) => { signalPreflightComplete = resolve; });
      let initialOwnerValidated = false;
      const gatedGuard = {
        async confirmActiveMembership(input) {
          signalPreflightComplete();
          await transactionRelease;
          return realGuard.confirmActiveMembership(input);
        },
      };
      const service = createMembershipService({
        selfAccountReader: { async getByUserId(userId) { return { userId }; } },
        selfPersonContext: { async getForUser() { return { personId: ids.person }; } },
        ownedGroupContext: {
          async getForOwner({ userId, groupId }) {
            const group = (await db.collection("groups").doc(groupId).get()).data();
            assert.equal(group.ownerId, userId);
            initialOwnerValidated = true;
            return { id: groupId, estado: group.estado, ownerUserId: group.ownerId };
          },
        },
        openSeasonContext: {
          async getForOwner() {
            return { id: ids.concurrentRaceSeason, groupId: ids.concurrentRaceGroup, estado: "abierta" };
          },
        },
        membershipRepository,
        activeMembershipGuard: gatedGuard,
        myMembershipReader: { async getActiveForOwner() { return null; } },
      });
      const operation = service.createMyMembershipForOwnedGroup(
        { userId: owner.uid },
        command(ids.concurrentRaceGroup, "e2-03-concurrent-owner-transfer")
      );
      await preflightComplete;
      assert.equal(initialOwnerValidated, true);
      await db.collection("groups").doc(ids.concurrentRaceGroup).update({ ownerId: globalAdmin.uid });
      releaseTransaction();
      await assert.rejects(operation, (error) => error?.reason === "NOT_AUTHORIZED");
      assert.equal((await db.collection("memberships").where("groupId", "==", ids.concurrentRaceGroup).get()).size, 0);
      assert.equal((await db.collection("activeMembershipGuards").doc(activeMembershipGuardId(ids.concurrentRaceGroup, ids.person)).get()).exists, false);
    });

    await t.test("E2-05 transición exacta, repetición, consulta, CU-025 y E2-04", async () => {
      const createdForFinalize = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.finalizeGroup, "e2-05-create-finalize-key-001"), owner.idToken);
      assert.equal(createdForFinalize.body?.result?.outcome, "CREATED_ACTIVE", JSON.stringify(createdForFinalize.body));
      const before = (await db.collection("memberships").doc(createdForFinalize.body.result.membership.id).get()).data();
      const finalized = await callFunction(functionsHost, projectId, "finalizeMyMembershipForOwnedGroup", { groupId: ids.finalizeGroup }, owner.idToken);
      assert.equal(finalized.body?.result?.outcome, "FINALIZED", JSON.stringify(finalized.body));
      assert.deepEqual(Object.keys(finalized.body.result.membership).sort(), ["estado", "fechaEgreso", "fechaIngreso", "groupId", "id", "seasonId"]);
      const membershipRef = db.collection("memberships").doc(createdForFinalize.body.result.membership.id);
      const persisted = (await membershipRef.get()).data();
      assert.deepEqual(Object.keys(persisted).sort(), ["createdAt", "estado", "fechaEgreso", "fechaIngreso", "groupId", "personId", "schemaVersion", "seasonId"]);
      assert.equal(persisted.schemaVersion, 2);
      assert.equal(persisted.estado, "finalizada");
      for (const field of ["personId", "groupId", "seasonId", "fechaIngreso", "createdAt"]) assert.deepEqual(persisted[field], before[field]);
      const activeId = activeMembershipGuardId(ids.finalizeGroup, ids.person);
      assert.equal((await db.collection("activeMembershipGuards").doc(activeId).get()).exists, false);
      const lifecycle = (await db.collection("membershipLifecycleGuards").doc(membershipLifecycleGuardId(ids.finalizeGroup, ids.person)).get()).data();
      assert.deepEqual(Object.keys(lifecycle).sort(), ["creationIdempotencyKeyHash", "creationRequestHash", "finalizedAt", "groupId", "lifecycleGuardVersion", "membershipId", "personId", "seasonId"]);
      assert.equal(lifecycle.finalizedAt.isEqual(persisted.fechaEgreso), true);
      assert.equal(lifecycle.membershipId, createdForFinalize.body.result.membership.id);
      const repeated = await callFunction(functionsHost, projectId, "finalizeMyMembershipForOwnedGroup", { groupId: ids.finalizeGroup }, owner.idToken);
      assert.equal(repeated.body?.result?.outcome, "ALREADY_FINALIZED", JSON.stringify(repeated.body));
      assert.equal(repeated.body.result.membership.fechaEgreso, finalized.body.result.membership.fechaEgreso);
      const queried = await callFunction(functionsHost, projectId, "getMyMembershipForOwnedGroup", { groupId: ids.finalizeGroup }, owner.idToken);
      assert.deepEqual(queried.body?.result?.membership, finalized.body.result.membership);
      for (const key of ["e2-05-create-finalize-key-001", "e2-05-other-create-key-0001"]) {
        const blocked = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.finalizeGroup, key), owner.idToken);
        assert.equal(blocked.body?.error?.details?.reason, "MEMBERSHIP_REACTIVATION_REQUIRED", JSON.stringify(blocked.body));
      }
      const listed = await callFunction(functionsHost, projectId, "listMyCurrentGroupMemberships", { pageSize: 20 }, owner.idToken);
      assert.equal(listed.status, 200, JSON.stringify(listed.body));
      assert.equal(Array.isArray(listed.body?.result?.items), true, JSON.stringify(listed.body));
      assert.equal(listed.body.result.items.some((item) => item.membership.id === createdForFinalize.body.result.membership.id), false);
    });

    await t.test("E2-05 payload, ausencia, Temporada no abierta y ownership fallan sin escribir", async () => {
      const invalid = await callFunction(functionsHost, projectId, "finalizeMyMembershipForOwnedGroup", { groupId: ids.noneFinalizeGroup, personId: ids.person }, owner.idToken);
      assert.equal(invalid.body?.error?.details?.reason, "VALIDATION_FAILED");
      const none = await callFunction(functionsHost, projectId, "finalizeMyMembershipForOwnedGroup", { groupId: ids.noneFinalizeGroup }, owner.idToken);
      assert.equal(none.body?.error?.details?.reason, "MEMBERSHIP_NOT_FOUND", JSON.stringify(none.body));

      const noOpenCreated = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.noOpenFinalizeGroup, "e2-05-no-open-create-key-001"), owner.idToken);
      assert.equal(noOpenCreated.body?.result?.outcome, "CREATED_ACTIVE");
      await db.collection("openSeasonGuards").doc(ids.noOpenFinalizeGroup).delete();
      await db.collection("seasons").doc(ids.noOpenFinalizeSeason).update({ estado: "cerrada" });
      const noOpen = await callFunction(functionsHost, projectId, "finalizeMyMembershipForOwnedGroup", { groupId: ids.noOpenFinalizeGroup }, owner.idToken);
      assert.equal(noOpen.body?.error?.details?.reason, "OPEN_SEASON_REQUIRED", JSON.stringify(noOpen.body));
      assert.equal((await db.collection("memberships").doc(noOpenCreated.body.result.membership.id).get()).data().estado, "activa");
      assert.equal((await db.collection("activeMembershipGuards").doc(activeMembershipGuardId(ids.noOpenFinalizeGroup, ids.person)).get()).exists, true);

      await db.collection("openSeasonGuards").doc(ids.noOpenFinalizeGroup).set({ seasonId: "e2-05-season-missing", idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: new Date(), guardVersion: 1 });
      const corruptSeason = await callFunction(functionsHost, projectId, "finalizeMyMembershipForOwnedGroup", { groupId: ids.noOpenFinalizeGroup }, owner.idToken);
      assert.equal(corruptSeason.body?.error?.details?.reason, "INCOMPATIBLE_STATE", JSON.stringify(corruptSeason.body));
      assert.equal((await db.collection("memberships").doc(noOpenCreated.body.result.membership.id).get()).data().estado, "activa");
      await db.collection("openSeasonGuards").doc(ids.noOpenFinalizeGroup).delete();

      const transferred = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.transferFinalizeGroup, "e2-05-transfer-create-key-01"), owner.idToken);
      assert.equal(transferred.body?.result?.outcome, "CREATED_ACTIVE");
      await db.collection("groups").doc(ids.transferFinalizeGroup).update({ ownerId: globalAdmin.uid });
      const denied = await callFunction(functionsHost, projectId, "finalizeMyMembershipForOwnedGroup", { groupId: ids.transferFinalizeGroup }, owner.idToken);
      assert.equal(denied.body?.error?.details?.reason, "NOT_AUTHORIZED");
      assert.equal((await db.collection("memberships").doc(transferred.body.result.membership.id).get()).data().estado, "activa");
    });

    await t.test("E2-05 doble finalización y alta contra finalización convergen sin recrear", async () => {
      const concurrentCreated = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.concurrentFinalizeGroup, "e2-05-concurrent-create-key"), owner.idToken);
      assert.equal(concurrentCreated.body?.result?.outcome, "CREATED_ACTIVE");
      const concurrent = await Promise.all([
        callFunction(functionsHost, projectId, "finalizeMyMembershipForOwnedGroup", { groupId: ids.concurrentFinalizeGroup }, owner.idToken),
        callFunction(functionsHost, projectId, "finalizeMyMembershipForOwnedGroup", { groupId: ids.concurrentFinalizeGroup }, owner.idToken),
      ]);
      assert.equal(concurrent.filter((item) => item.body?.result?.outcome === "FINALIZED").length, 1, JSON.stringify(concurrent));
      assert.equal(concurrent.filter((item) => item.body?.result?.outcome === "ALREADY_FINALIZED").length, 1, JSON.stringify(concurrent));
      assert.equal((await db.collection("memberships").where("groupId", "==", ids.concurrentFinalizeGroup).get()).size, 1);

      const raceCreated = await callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.raceFinalizeGroup, "e2-05-race-create-key-0001"), owner.idToken);
      assert.equal(raceCreated.body?.result?.outcome, "CREATED_ACTIVE");
      const race = await Promise.all([
        callFunction(functionsHost, projectId, "finalizeMyMembershipForOwnedGroup", { groupId: ids.raceFinalizeGroup }, owner.idToken),
        callFunction(functionsHost, projectId, "createMyMembershipForOwnedGroup", command(ids.raceFinalizeGroup, "e2-05-race-other-key-0001"), owner.idToken),
      ]);
      assert.equal(race.some((item) => ["FINALIZED", "ALREADY_FINALIZED"].includes(item.body?.result?.outcome)), true, JSON.stringify(race));
      assert.equal(race.some((item) => ["MEMBERSHIP_ALREADY_EXISTS", "MEMBERSHIP_REACTIVATION_REQUIRED", "CONFLICT"].includes(item.body?.error?.details?.reason)), true, JSON.stringify(race));
      assert.equal((await db.collection("memberships").where("groupId", "==", ids.raceFinalizeGroup).get()).size, 1);
      assert.equal((await db.collection("memberships").where("groupId", "==", ids.raceFinalizeGroup).where("estado", "==", "activa").get()).size, 0);
    });

    await t.test("E2-05 both y lifecycle corrupto fallan cerrados sin reparación", async () => {
      const lifecycleRef = db.collection("membershipLifecycleGuards").doc(membershipLifecycleGuardId(ids.finalizeGroup, ids.person));
      const lifecycleBefore = (await lifecycleRef.get()).data();
      const activeRef = db.collection("activeMembershipGuards").doc(activeMembershipGuardId(ids.finalizeGroup, ids.person));
      await activeRef.set({ membershipId: lifecycleBefore.membershipId, personId: ids.person, groupId: ids.finalizeGroup, seasonId: ids.finalizeSeason, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: new Date(), guardVersion: 1 });
      const both = await callFunction(functionsHost, projectId, "finalizeMyMembershipForOwnedGroup", { groupId: ids.finalizeGroup }, owner.idToken);
      assert.equal(both.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal((await activeRef.get()).exists, true);
      await activeRef.delete();
      await lifecycleRef.update({ creationRequestHash: "corrupt" });
      const corrupt = await callFunction(functionsHost, projectId, "getMyMembershipForOwnedGroup", { groupId: ids.finalizeGroup }, owner.idToken);
      assert.equal(corrupt.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal((await lifecycleRef.get()).data().creationRequestHash, "corrupt");
      await lifecycleRef.set(lifecycleBefore);
    });

    await t.test("reglas niegan get/list/create/update/delete directos para todos los actores", async () => {
      const guardId = activeMembershipGuardId(ids.ownerGroup, ids.person);
      for (const actor of [null, owner, globalAdmin, noPerson]) {
        for (const path of [`memberships/${created.id}`, `activeMembershipGuards/${guardId}`, `membershipLifecycleGuards/${membershipLifecycleGuardId(ids.finalizeGroup, ids.person)}`]) {
          assert.equal((await firestoreRequest({ host: firestoreHost, projectId, path, idToken: actor?.idToken })).status, 403);
        }
      }
      assert.equal((await firestoreRequest({ host: firestoreHost, projectId, path: "memberships", idToken: owner.idToken })).status, 403);
      assert.equal((await firestoreRequest({ host: firestoreHost, projectId, path: "activeMembershipGuards", idToken: globalAdmin.idToken })).status, 403);
      assert.equal((await firestoreRequest({ host: firestoreHost, projectId, path: "membershipLifecycleGuards", idToken: owner.idToken })).status, 403);
      const create = await firestoreRequest({ host: firestoreHost, projectId, path: "memberships/e2-03-client", idToken: owner.idToken, method: "PATCH", body: { fields: { estado: { stringValue: "activa" } } } });
      const update = await firestoreRequest({ host: firestoreHost, projectId, path: `memberships/${created.id}`, idToken: owner.idToken, method: "PATCH", body: { fields: { estado: { stringValue: "activa" } } } });
      const remove = await firestoreRequest({ host: firestoreHost, projectId, path: `memberships/${created.id}`, idToken: globalAdmin.idToken, method: "DELETE" });
      assert.equal(create.status, 403); assert.equal(update.status, 403); assert.equal(remove.status, 403);
    });

    await t.test("cleanup E2-03 preserva documentos ajenos en ambas colecciones", async () => {
      const localFixtures = createFirestoreFixtureRegistry(db);
      const foreignMembership = db.collection("memberships").doc("foreign-membership-preserved");
      const foreignGuard = db.collection("activeMembershipGuards").doc("foreign-guard-preserved");
      const ownedMembership = db.collection("memberships").doc("owned-cleanup-membership");
      const ownedGuard = db.collection("activeMembershipGuards").doc("owned-cleanup-guard");
      fixtures.register(foreignMembership);
      fixtures.register(foreignGuard);
      await foreignMembership.set({ marker: "foreign" });
      await foreignGuard.set({ marker: "foreign" });
      await localFixtures.set(ownedMembership, { marker: "owned" });
      await localFixtures.set(ownedGuard, { marker: "owned" });
      await localFixtures.cleanup();
      assert.equal((await foreignMembership.get()).exists, true);
      assert.equal((await foreignGuard.get()).exists, true);
      assert.equal((await ownedMembership.get()).exists, false);
      assert.equal((await ownedGuard.get()).exists, false);
    });
  } finally {
    for (const groupId of membershipGroupIds) {
      await fixtures.registerQuery(db.collection("memberships").where("groupId", "==", groupId));
    }
    await fixtures.cleanup();
    for (const collection of ["openSeasonGuards", "seasons", "groups", "personas"]) {
      const snapshot = await db.collection(collection).get();
      const batch = db.batch();
      for (const document of snapshot.docs) {
        if (document.id.startsWith("e2-03-")) {
          batch.delete(document.ref);
        }
      }
      await batch.commit();
    }
    const batch = db.batch();
    for (const actor of actors) batch.delete(db.collection("users").doc(actor.uid));
    await batch.commit();
    await Promise.allSettled(actors.map((actor) => auth.deleteUser(actor.uid)));
    await app.delete();
  }
});
