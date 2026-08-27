"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-02-synthetic-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "E2-02-synthetic-password!", returnSecureToken: true }),
  });
  const body = await readJson(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken, email };
}

async function callFunction(host, projectId, name, data, idToken) {
  const headers = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data }),
  });
  return { status: response.status, body: await readJson(response) };
}

async function firestoreRequest({ host, projectId, path, idToken, method = "GET", body }) {
  const headers = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await readJson(response) };
}

function validPayload(groupId, key, overrides = {}) {
  return { groupId, nombre: "  Apertura   Águilas  ", fechaInicio: "2026-03-01", idempotencyKey: key, ...overrides };
}

async function seedAccount(db, actor, extra = {}) {
  await db.collection("users").doc(actor.uid).set({ nombre: "Cuenta", email: actor.email, photoURL: "", createdAt: new Date(), ...extra });
}

async function seedGroup(db, groupId, ownerId, extra = {}) {
  await db.collection("groups").doc(groupId).set({ nombre: `Grupo ${groupId}`, deporte: "voleibol", ownerId, estado: "activo", createdAt: new Date(), schemaVersion: 1, ...extra });
}

test("E2-02 crea y consulta una Temporada abierta independiente y owner-scoped", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e2-02-season-integration");
  const db = app.firestore();
  const auth = app.auth();
  const actors = await Promise.all([
    signUp(authHost, "e2-02-owner@example.invalid"),
    signUp(authHost, "e2-02-admin@example.invalid"),
    signUp(authHost, "e2-02-no-account@example.invalid"),
    signUp(authHost, "e2-02-same@example.invalid"),
    signUp(authHost, "e2-02-different@example.invalid"),
    signUp(authHost, "e2-02-owner-race@example.invalid"),
  ]);
  const [owner, globalAdmin, noAccount, sameActor, differentActor, raceOwner] = actors;
  const groupIds = {
    owner: "e2-02-owner-group",
    noAccount: "e2-02-no-account-group",
    same: "e2-02-same-group",
    different: "e2-02-different-group",
    race: "e2-02-race-group",
    orphan: "e2-02-orphan-group",
    broken: "e2-02-broken-group",
    closed: "e2-02-closed-group",
    incompatible: "e2-02-incompatible-group",
  };

  try {
    await Promise.all([
      seedAccount(db, owner),
      seedAccount(db, globalAdmin, { roles: "admin" }),
      seedAccount(db, sameActor),
      seedAccount(db, differentActor),
      seedAccount(db, raceOwner),
      seedGroup(db, groupIds.owner, owner.uid),
      seedGroup(db, groupIds.noAccount, noAccount.uid),
      seedGroup(db, groupIds.same, sameActor.uid),
      seedGroup(db, groupIds.different, differentActor.uid),
      seedGroup(db, groupIds.race, raceOwner.uid),
      seedGroup(db, groupIds.orphan, owner.uid),
      seedGroup(db, groupIds.broken, owner.uid),
      seedGroup(db, groupIds.closed, owner.uid),
      seedGroup(db, groupIds.incompatible, owner.uid, { schemaVersion: 2 }),
    ]);

    await t.test("contexto sin Temporada es null para Owner y auth/cuenta/ownership fallan cerrado", async () => {
      const [empty, visitor, account, foreign, missing, incompatible] = await Promise.all([
        callFunction(functionsHost, projectId, "getOpenSeasonContext", { groupId: groupIds.owner }, owner.idToken),
        callFunction(functionsHost, projectId, "getOpenSeasonContext", { groupId: groupIds.owner }),
        callFunction(functionsHost, projectId, "getOpenSeasonContext", { groupId: groupIds.noAccount }, noAccount.idToken),
        callFunction(functionsHost, projectId, "getOpenSeasonContext", { groupId: groupIds.owner }, globalAdmin.idToken),
        callFunction(functionsHost, projectId, "getOpenSeasonContext", { groupId: "e2-02-missing" }, owner.idToken),
        callFunction(functionsHost, projectId, "getOpenSeasonContext", { groupId: groupIds.incompatible }, owner.idToken),
      ]);
      assert.equal(empty.status, 200, JSON.stringify(empty.body));
      assert.equal(empty.body.result.openSeason, null);
      assert.equal(visitor.body?.error?.details?.reason, "UNAUTHENTICATED");
      assert.equal(account.body?.error?.details?.reason, "ACCOUNT_REQUIRED");
      assert.equal(foreign.body?.error?.details?.reason, "NOT_AUTHORIZED");
      assert.equal(missing.body?.error?.details?.reason, "GROUP_NOT_FOUND");
      assert.equal(incompatible.body?.error?.details?.reason, "GROUP_INCOMPATIBLE");
    });

    await t.test("payload cerrado y fecha imposible fallan antes del commit", async () => {
      const [manipulated, impossible] = await Promise.all([
        callFunction(functionsHost, projectId, "createAndOpenSeason", { ...validPayload(groupIds.owner, "e2-02-invalid-owner-key-0001"), ownerUid: owner.uid }, owner.idToken),
        callFunction(functionsHost, projectId, "createAndOpenSeason", validPayload(groupIds.owner, "e2-02-invalid-date-key-00001", { fechaInicio: "2026-02-30" }), owner.idToken),
      ]);
      assert.equal(manipulated.body?.error?.details?.reason, "VALIDATION_FAILED");
      assert.equal(impossible.body?.error?.details?.reason, "VALIDATION_FAILED");
      assert.equal((await db.collection("seasons").where("groupId", "==", groupIds.owner).get()).size, 0);
      assert.equal((await db.collection("openSeasonGuards").doc(groupIds.owner).get()).exists, false);
    });

    let ownerSeason;
    await t.test("crea atómicamente schema v1 y guard exactos sin modificar Grupo ni otros Agregados", async () => {
      const before = (await db.collection("groups").doc(groupIds.owner).get()).data();
      const result = await callFunction(functionsHost, projectId, "createAndOpenSeason", validPayload(groupIds.owner, "e2-02-owner-idempotency-0001"), owner.idToken);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.result.outcome, "CREATED_OPEN");
      ownerSeason = result.body.result.season;
      assert.deepEqual(Object.keys(ownerSeason).sort(), ["createdAt", "estado", "fechaInicio", "groupId", "id", "nombre"]);
      assert.equal(ownerSeason.nombre, "Apertura Águilas");
      assert.equal(ownerSeason.estado, "abierta");

      const season = (await db.collection("seasons").doc(ownerSeason.id).get()).data();
      assert.deepEqual(Object.keys(season).sort(), ["createdAt", "estado", "fechaInicio", "groupId", "nombre", "schemaVersion"]);
      assert.equal(season.groupId, groupIds.owner);
      assert.equal(season.schemaVersion, 1);
      assert.equal(Object.hasOwn(season, "ownerUid"), false);
      assert.equal(Object.hasOwn(season, "fechaCierre"), false);

      const guard = (await db.collection("openSeasonGuards").doc(groupIds.owner).get()).data();
      assert.deepEqual(Object.keys(guard).sort(), ["createdAt", "guardVersion", "idempotencyKeyHash", "requestHash", "seasonId"]);
      assert.equal(guard.seasonId, ownerSeason.id);
      assert.match(guard.idempotencyKeyHash, /^[a-f0-9]{64}$/);
      assert.notEqual(guard.idempotencyKeyHash, "e2-02-owner-idempotency-0001");
      assert.deepEqual((await db.collection("groups").doc(groupIds.owner).get()).data(), before);
      for (const collection of ["personas", "memberships", "requests", "plans", "subscriptions", "activities", "dashboards"]) {
        assert.equal((await db.collection(collection).get()).size, 0, collection);
      }
    });

    await t.test("respuesta perdida/retry recupera la misma; conflictos distinguen payload y otra intención", async () => {
      const [retry, payloadConflict, anotherIntent] = await Promise.all([
        callFunction(functionsHost, projectId, "createAndOpenSeason", validPayload(groupIds.owner, "e2-02-owner-idempotency-0001"), owner.idToken),
        callFunction(functionsHost, projectId, "createAndOpenSeason", validPayload(groupIds.owner, "e2-02-owner-idempotency-0001", { nombre: "Otra" }), owner.idToken),
        callFunction(functionsHost, projectId, "createAndOpenSeason", validPayload(groupIds.owner, "e2-02-owner-other-intent-0001"), owner.idToken),
      ]);
      assert.equal(retry.body?.result?.outcome, "EXISTING_IDEMPOTENT", JSON.stringify(retry.body));
      assert.equal(retry.body.result.season.id, ownerSeason.id);
      assert.equal(payloadConflict.body?.error?.details?.reason, "IDEMPOTENCY_CONFLICT");
      assert.equal(anotherIntent.body?.error?.details?.reason, "OPEN_SEASON_ALREADY_EXISTS");
      assert.equal((await db.collection("seasons").where("groupId", "==", groupIds.owner).get()).size, 1);
    });

    await t.test("consulta contexto y por ID devuelve autoridad persistida; no Owner y faltante no acceden", async () => {
      const [context, byId, foreign, missing] = await Promise.all([
        callFunction(functionsHost, projectId, "getOpenSeasonContext", { groupId: groupIds.owner }, owner.idToken),
        callFunction(functionsHost, projectId, "getOwnSeason", { groupId: groupIds.owner, seasonId: ownerSeason.id }, owner.idToken),
        callFunction(functionsHost, projectId, "getOwnSeason", { groupId: groupIds.owner, seasonId: ownerSeason.id }, globalAdmin.idToken),
        callFunction(functionsHost, projectId, "getOwnSeason", { groupId: groupIds.owner, seasonId: "e2-02-missing-season" }, owner.idToken),
      ]);
      assert.deepEqual(context.body.result.openSeason, ownerSeason);
      assert.deepEqual(byId.body.result.season, ownerSeason);
      assert.equal(foreign.body?.error?.details?.reason, "NOT_AUTHORIZED");
      assert.equal(missing.body?.error?.details?.reason, "SEASON_NOT_FOUND");
    });

    await t.test("dos solicitudes iguales simultáneas crean una y recuperan una", async () => {
      const payload = validPayload(groupIds.same, "e2-02-concurrent-same-key-001", { nombre: "Simultánea" });
      const results = await Promise.all([
        callFunction(functionsHost, projectId, "createAndOpenSeason", payload, sameActor.idToken),
        callFunction(functionsHost, projectId, "createAndOpenSeason", payload, sameActor.idToken),
      ]);
      assert.deepEqual(results.map((item) => item.body?.result?.outcome).sort(), ["CREATED_OPEN", "EXISTING_IDEMPOTENT"]);
      assert.equal((await db.collection("seasons").where("groupId", "==", groupIds.same).get()).size, 1);
    });

    await t.test("dos intenciones diferentes simultáneas dejan como máximo una abierta", async () => {
      const results = await Promise.all([
        callFunction(functionsHost, projectId, "createAndOpenSeason", validPayload(groupIds.different, "e2-02-concurrent-different-a", { nombre: "Primera" }), differentActor.idToken),
        callFunction(functionsHost, projectId, "createAndOpenSeason", validPayload(groupIds.different, "e2-02-concurrent-different-b", { nombre: "Segunda" }), differentActor.idToken),
      ]);
      assert.equal(results.filter((item) => item.body?.result?.outcome === "CREATED_OPEN").length, 1, JSON.stringify(results));
      assert.equal(results.filter((item) => ["OPEN_SEASON_ALREADY_EXISTS", "CONFLICT"].includes(item.body?.error?.details?.reason)).length, 1, JSON.stringify(results));
      assert.equal((await db.collection("seasons").where("groupId", "==", groupIds.different).get()).size, 1);
    });

    await t.test("Owner y admin no Owner concurrentes: sólo el Owner confirma", async () => {
      const results = await Promise.all([
        callFunction(functionsHost, projectId, "createAndOpenSeason", validPayload(groupIds.race, "e2-02-owner-race-owner-key"), raceOwner.idToken),
        callFunction(functionsHost, projectId, "createAndOpenSeason", validPayload(groupIds.race, "e2-02-owner-race-admin-key"), globalAdmin.idToken),
      ]);
      assert.equal(results.filter((item) => item.body?.result?.outcome === "CREATED_OPEN").length, 1);
      assert.equal(results.filter((item) => item.body?.error?.details?.reason === "NOT_AUTHORIZED").length, 1);
      assert.equal((await db.collection("seasons").where("groupId", "==", groupIds.race).get()).size, 1);
    });

    await t.test("guard ausente/inconsistente falla cerrado sin autorreparar", async () => {
      await db.collection("seasons").doc("e2-02-orphan-season").set({ groupId: groupIds.orphan, nombre: "Huérfana", fechaInicio: "2026-01-01", estado: "abierta", createdAt: new Date(), schemaVersion: 1 });
      await db.collection("openSeasonGuards").doc(groupIds.broken).set({ seasonId: "e2-02-missing-season", idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: new Date(), guardVersion: 1 });
      await db.collection("seasons").doc("e2-02-closed-season").set({ groupId: groupIds.closed, nombre: "Cerrada incompatible", fechaInicio: "2025-01-01", estado: "cerrada", createdAt: new Date(), schemaVersion: 1 });
      await db.collection("openSeasonGuards").doc(groupIds.closed).set({ seasonId: "e2-02-closed-season", idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: new Date(), guardVersion: 1 });
      const [orphanContext, orphanCreate, brokenContext, closedContext] = await Promise.all([
        callFunction(functionsHost, projectId, "getOpenSeasonContext", { groupId: groupIds.orphan }, owner.idToken),
        callFunction(functionsHost, projectId, "createAndOpenSeason", validPayload(groupIds.orphan, "e2-02-orphan-create-key-001"), owner.idToken),
        callFunction(functionsHost, projectId, "getOpenSeasonContext", { groupId: groupIds.broken }, owner.idToken),
        callFunction(functionsHost, projectId, "getOpenSeasonContext", { groupId: groupIds.closed }, owner.idToken),
      ]);
      assert.equal(orphanContext.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal(orphanCreate.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal(brokenContext.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal(closedContext.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal((await db.collection("seasons").where("groupId", "==", groupIds.orphan).get()).size, 1);
      assert.equal((await db.collection("openSeasonGuards").doc(groupIds.orphan).get()).exists, false);
    });

    await t.test("reglas niegan toda lectura/escritura cliente de Temporada y guard", async () => {
      for (const actor of [null, owner, noAccount, globalAdmin]) {
        const idToken = actor?.idToken;
        const seasonRead = await firestoreRequest({ host: firestoreHost, projectId, path: `seasons/${ownerSeason.id}`, idToken });
        const guardRead = await firestoreRequest({ host: firestoreHost, projectId, path: `openSeasonGuards/${groupIds.owner}`, idToken });
        assert.equal(seasonRead.status, 403, JSON.stringify(seasonRead.body));
        assert.equal(guardRead.status, 403, JSON.stringify(guardRead.body));
      }
      const seasonList = await firestoreRequest({ host: firestoreHost, projectId, path: "seasons", idToken: owner.idToken });
      const guardList = await firestoreRequest({ host: firestoreHost, projectId, path: "openSeasonGuards", idToken: globalAdmin.idToken });
      assert.equal(seasonList.status, 403, JSON.stringify(seasonList.body));
      assert.equal(guardList.status, 403, JSON.stringify(guardList.body));
      const directSeason = await firestoreRequest({
        host: firestoreHost,
        projectId,
        path: "seasons/e2-02-client-season",
        idToken: owner.idToken,
        method: "PATCH",
        body: { fields: { groupId: { stringValue: groupIds.owner }, nombre: { stringValue: "Cliente" }, fechaInicio: { stringValue: "2026-01-01" }, estado: { stringValue: "abierta" }, schemaVersion: { integerValue: "1" } } },
      });
      const directGuard = await firestoreRequest({
        host: firestoreHost,
        projectId,
        path: `openSeasonGuards/${groupIds.owner}`,
        idToken: globalAdmin.idToken,
        method: "PATCH",
        body: { fields: { guardVersion: { integerValue: "1" } } },
      });
      assert.equal(directSeason.status, 403);
      assert.equal(directGuard.status, 403);
      const seasonDelete = await firestoreRequest({ host: firestoreHost, projectId, path: `seasons/${ownerSeason.id}`, idToken: owner.idToken, method: "DELETE" });
      const guardDelete = await firestoreRequest({ host: firestoreHost, projectId, path: `openSeasonGuards/${groupIds.owner}`, idToken: owner.idToken, method: "DELETE" });
      assert.equal(seasonDelete.status, 403);
      assert.equal(guardDelete.status, 403);
    });
  } finally {
    const collections = ["seasons", "openSeasonGuards", "groups"];
    for (const collection of collections) {
      const snapshot = await db.collection(collection).get();
      const batch = db.batch();
      for (const document of snapshot.docs) {
        if (document.id.startsWith("e2-02-")) batch.delete(document.ref);
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
