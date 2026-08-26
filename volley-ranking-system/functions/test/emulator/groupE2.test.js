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
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-01-synthetic-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "E2-01-synthetic-password!", returnSecureToken: true }),
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
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method,
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await readJson(response) };
}

async function queryGroupsByArray({ host, projectId, idToken, fieldPath, userId }) {
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "groups" }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: "ARRAY_CONTAINS",
            value: { stringValue: userId },
          },
        },
      },
    }),
  });
  return { status: response.status, body: await readJson(response) };
}

function validPayload(key, nombre = "  Vóley   Ñandú  ") {
  return { nombre, deporte: "voleibol", idempotencyKey: key };
}

async function seedAccount(db, actor, extra = {}) {
  await db.collection("users").doc(actor.uid).set({ nombre: "Cuenta", email: actor.email, photoURL: "", createdAt: new Date(), ...extra });
}

test("E2-01 crea y consulta Grupos propios con ownership, idempotencia y aislamiento", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e2-01-group-integration");
  const db = app.firestore();
  const auth = app.auth();
  const actors = await Promise.all([
    signUp(authHost, "e2-owner@example.invalid"),
    signUp(authHost, "e2-global-admin@example.invalid"),
    signUp(authHost, "e2-no-account@example.invalid"),
    signUp(authHost, "e2-concurrent-same@example.invalid"),
    signUp(authHost, "e2-concurrent-different@example.invalid"),
    signUp(authHost, "e2-broken-guard@example.invalid"),
    signUp(authHost, "e2-existing-owner@example.invalid"),
  ]);
  const [owner, globalAdmin, noAccount, concurrentSame, concurrentDifferent, brokenGuard, existingOwner] = actors;
  const createdIds = new Set();

  try {
    await Promise.all([
      seedAccount(db, owner),
      seedAccount(db, globalAdmin, { roles: "admin" }),
      seedAccount(db, concurrentSame),
      seedAccount(db, concurrentDifferent),
      seedAccount(db, brokenGuard),
      seedAccount(db, existingOwner),
    ]);

    await t.test("rechaza visitante, cuenta ausente y payload abierto sin escribir", async () => {
      const unauthenticated = await callFunction(functionsHost, projectId, "createOwnGroup", validPayload("e2-unauthenticated-key-0001"));
      const accountRequired = await callFunction(functionsHost, projectId, "createOwnGroup", validPayload("e2-account-required-key-01"), noAccount.idToken);
      const manipulated = await callFunction(functionsHost, projectId, "createOwnGroup", { ...validPayload("e2-manipulated-key-000001"), ownerId: globalAdmin.uid }, owner.idToken);
      assert.equal(unauthenticated.body?.error?.details?.reason, "UNAUTHENTICATED");
      assert.equal(accountRequired.body?.error?.details?.reason, "ACCOUNT_REQUIRED");
      assert.equal(manipulated.body?.error?.details?.reason, "VALIDATION_FAILED");
      assert.equal((await db.collection("groups").where("ownerId", "==", noAccount.uid).get()).size, 0);
    });

    let ownerGroup;
    await t.test("primera creación persiste esquema exacto, Owner y guard atómicos sin efectos colaterales", async () => {
      const result = await callFunction(functionsHost, projectId, "createOwnGroup", validPayload("e2-owner-idempotency-key-0001"), owner.idToken);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.result.outcome, "created");
      ownerGroup = result.body.result.group;
      createdIds.add(ownerGroup.id);
      assert.equal(ownerGroup.nombre, "Vóley Ñandú");
      assert.equal(ownerGroup.ownerUserId, owner.uid);
      assert.match(ownerGroup.createdAt, /^\d{4}-\d{2}-\d{2}T/);

      const group = (await db.collection("groups").doc(ownerGroup.id).get()).data();
      assert.deepEqual(Object.keys(group).sort(), ["createdAt", "deporte", "estado", "nombre", "ownerId", "schemaVersion"]);
      assert.equal(group.ownerId, owner.uid);
      assert.equal(group.estado, "activo");
      assert.equal(group.schemaVersion, 1);
      assert.equal(Object.hasOwn(group, "memberIds"), false);
      assert.equal(Object.hasOwn(group, "adminIds"), false);

      const guard = (await db.collection("groupCreationGuards").doc(owner.uid).get()).data();
      assert.deepEqual(Object.keys(guard).sort(), ["createdAt", "groupId", "guardVersion", "idempotencyKeyHash", "requestHash"]);
      assert.equal(guard.groupId, ownerGroup.id);
      assert.equal(guard.guardVersion, 1);
      assert.match(guard.idempotencyKeyHash, /^[a-f0-9]{64}$/);
      assert.notEqual(guard.idempotencyKeyHash, "e2-owner-idempotency-key-0001");

      for (const collection of ["personas", "memberships", "seasons", "requests", "plans", "subscriptions", "activities", "dashboards"]) {
        assert.equal((await db.collection(collection).get()).size, 0, collection);
      }
      assert.equal((await db.collection("users").doc(owner.uid).get()).data().personaId, undefined);
    });

    await t.test("respuesta perdida/reintento devuelve existing desde lo persistido", async () => {
      const result = await callFunction(functionsHost, projectId, "createOwnGroup", validPayload("e2-owner-idempotency-key-0001"), owner.idToken);
      assert.equal(result.body?.result?.outcome, "existing", JSON.stringify(result.body));
      assert.equal(result.body.result.group.id, ownerGroup.id);
      assert.equal((await db.collection("groups").where("ownerId", "==", owner.uid).get()).size, 1);
    });

    await t.test("misma clave con payload distinto da conflicto y otra clave alcanza el límite", async () => {
      const conflict = await callFunction(functionsHost, projectId, "createOwnGroup", validPayload("e2-owner-idempotency-key-0001", "Otro nombre"), owner.idToken);
      const limited = await callFunction(functionsHost, projectId, "createOwnGroup", validPayload("e2-owner-another-key-0000001"), owner.idToken);
      assert.equal(conflict.body?.error?.details?.reason, "CONFLICT");
      assert.equal(limited.body?.error?.details?.reason, "PROVISIONAL_LIMIT_REACHED");
      assert.equal((await db.collection("groups").where("ownerId", "==", owner.uid).get()).size, 1);
    });

    await t.test("listar, dashboard y detalle son owner-scoped; admin global no Owner es rechazado", async () => {
      const [list, dashboard, detail, foreign, missing] = await Promise.all([
        callFunction(functionsHost, projectId, "listOwnGroups", {}, owner.idToken),
        callFunction(functionsHost, projectId, "getOwnGroupsDashboard", {}, owner.idToken),
        callFunction(functionsHost, projectId, "getOwnGroup", { groupId: ownerGroup.id }, owner.idToken),
        callFunction(functionsHost, projectId, "getOwnGroup", { groupId: ownerGroup.id }, globalAdmin.idToken),
        callFunction(functionsHost, projectId, "getOwnGroup", { groupId: "e2-missing-group" }, owner.idToken),
      ]);
      assert.deepEqual(list.body.result.items, [ownerGroup]);
      assert.deepEqual(dashboard.body.result.items, [{ id: ownerGroup.id, nombre: ownerGroup.nombre, deporte: "voleibol", estado: "activo" }]);
      assert.deepEqual(detail.body.result.group, ownerGroup);
      assert.equal(foreign.body?.error?.details?.reason, "NOT_AUTHORIZED");
      assert.equal(missing.body?.error?.details?.reason, "NOT_FOUND");
    });

    await t.test("dos solicitudes iguales simultáneas producen un Grupo y created/existing", async () => {
      const payload = validPayload("e2-concurrent-same-key-00001", "Concurrente igual");
      const results = await Promise.all([
        callFunction(functionsHost, projectId, "createOwnGroup", payload, concurrentSame.idToken),
        callFunction(functionsHost, projectId, "createOwnGroup", payload, concurrentSame.idToken),
      ]);
      assert.deepEqual(results.map((item) => item.body?.result?.outcome).sort(), ["created", "existing"]);
      const groups = await db.collection("groups").where("ownerId", "==", concurrentSame.uid).get();
      assert.equal(groups.size, 1);
      createdIds.add(groups.docs[0].id);
    });

    await t.test("solicitudes diferentes simultáneas dejan un Grupo y un rechazo estable", async () => {
      const results = await Promise.all([
        callFunction(functionsHost, projectId, "createOwnGroup", validPayload("e2-concurrent-different-a-01", "Primero"), concurrentDifferent.idToken),
        callFunction(functionsHost, projectId, "createOwnGroup", validPayload("e2-concurrent-different-b-01", "Segundo"), concurrentDifferent.idToken),
      ]);
      const created = results.filter((item) => item.body?.result?.outcome === "created");
      const rejected = results.filter((item) => ["PROVISIONAL_LIMIT_REACHED", "CONFLICT"].includes(item.body?.error?.details?.reason));
      assert.equal(created.length, 1, JSON.stringify(results));
      assert.equal(rejected.length, 1, JSON.stringify(results));
      const groups = await db.collection("groups").where("ownerId", "==", concurrentDifferent.uid).get();
      assert.equal(groups.size, 1);
      createdIds.add(groups.docs[0].id);
    });

    await t.test("guard roto y Grupo previo sin guard fallan cerrado", async () => {
      await db.collection("groupCreationGuards").doc(brokenGuard.uid).set({ groupId: "missing", idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: new Date(), guardVersion: 1 });
      const broken = await callFunction(functionsHost, projectId, "createOwnGroup", validPayload("e2-broken-guard-key-000001"), brokenGuard.idToken);
      assert.equal(broken.body?.error?.details?.reason, "DEPENDENCY_UNAVAILABLE");
      assert.equal((await db.collection("groups").where("ownerId", "==", brokenGuard.uid).get()).size, 0);

      const existingRef = db.collection("groups").doc("e2-existing-without-guard");
      await existingRef.set({ nombre: "Existente", deporte: "voleibol", ownerId: existingOwner.uid, estado: "activo", createdAt: new Date(), schemaVersion: 1 });
      createdIds.add(existingRef.id);
      const limited = await callFunction(functionsHost, projectId, "createOwnGroup", validPayload("e2-existing-owner-key-00001"), existingOwner.idToken);
      assert.equal(limited.body?.error?.details?.reason, "PROVISIONAL_LIMIT_REACHED");
      assert.equal((await db.collection("groups").where("ownerId", "==", existingOwner.uid).get()).size, 1);
    });

    await t.test("reglas niegan lectura/escritura canónica y acceso al guard incluso a Owner/admin", async () => {
      for (const actor of [owner, globalAdmin]) {
        const read = await firestoreRequest({ host: firestoreHost, projectId, path: `groups/${ownerGroup.id}`, idToken: actor.idToken });
        const update = await firestoreRequest({ host: firestoreHost, projectId, path: `groups/${ownerGroup.id}?updateMask.fieldPaths=nombre`, idToken: actor.idToken, method: "PATCH", body: { fields: { nombre: { stringValue: "Manipulado" } } } });
        assert.equal(read.status, 403, JSON.stringify(read.body));
        assert.equal(update.status, 403, JSON.stringify(update.body));
      }
      const guardRead = await firestoreRequest({ host: firestoreHost, projectId, path: `groupCreationGuards/${owner.uid}`, idToken: owner.idToken });
      const guardWrite = await firestoreRequest({ host: firestoreHost, projectId, path: `groupCreationGuards/${owner.uid}`, idToken: owner.idToken, method: "PATCH", body: { fields: { guardVersion: { integerValue: "1" } } } });
      assert.equal(guardRead.status, 403);
      assert.equal(guardWrite.status, 403);

      const directCreate = await firestoreRequest({
        host: firestoreHost,
        projectId,
        path: "groups/e2-client-created-canonical",
        idToken: globalAdmin.idToken,
        method: "PATCH",
        body: { fields: { nombre: { stringValue: "Cliente" }, deporte: { stringValue: "voleibol" }, ownerId: { stringValue: globalAdmin.uid }, estado: { stringValue: "activo" }, schemaVersion: { integerValue: "1" } } },
      });
      assert.equal(directCreate.status, 403);
    });

    await t.test("reglas preservan listas por arrays legados sin exponer schema v1", async () => {
      const legacyRef = db.collection("groups").doc("e2-legacy-member-query");
      await legacyRef.set({
        nombre: "Legado",
        ownerId: globalAdmin.uid,
        memberIds: [owner.uid],
        adminIds: [globalAdmin.uid],
        admins: [{ userId: globalAdmin.uid, role: "owner", order: 0 }],
        activo: true,
        createdAt: new Date(),
      });
      createdIds.add(legacyRef.id);

      const memberList = await queryGroupsByArray({
        host: firestoreHost,
        projectId,
        idToken: owner.idToken,
        fieldPath: "memberIds",
        userId: owner.uid,
      });
      assert.equal(memberList.status, 200, JSON.stringify(memberList.body));
      const paths = memberList.body.filter((row) => row.document).map((row) => row.document.name);
      assert.equal(paths.some((path) => path.endsWith(`/${legacyRef.id}`)), true);
      assert.equal(paths.some((path) => path.endsWith(`/${ownerGroup.id}`)), false);
    });

    await t.test("callables legados no modifican un Grupo canónico", async () => {
      await db.collection("users").doc(owner.uid).update({ roles: "admin" });
      const result = await callFunction(functionsHost, projectId, "editGroup", { groupId: ownerGroup.id, nombre: "Mutado por legado" }, owner.idToken);
      assert.equal(result.body?.error?.status, "FAILED_PRECONDITION", JSON.stringify(result.body));
      assert.equal((await db.collection("groups").doc(ownerGroup.id).get()).data().nombre, ownerGroup.nombre);
      assert.equal((await db.collection("users").doc(owner.uid).collection("pendingAlerts").get()).size, 0);
    });
  } finally {
    const batch = db.batch();
    for (const id of createdIds) batch.delete(db.collection("groups").doc(id));
    for (const actor of actors) {
      batch.delete(db.collection("users").doc(actor.uid));
      batch.delete(db.collection("groupCreationGuards").doc(actor.uid));
    }
    await batch.commit();
    await Promise.allSettled(actors.map((actor) => auth.deleteUser(actor.uid)));
    await app.delete();
  }
});
