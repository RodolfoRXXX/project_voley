"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e1-02-synthetic-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "E1-02-synthetic-password!", returnSecureToken: true }),
  });
  const body = await json(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken };
}

async function callFunction(host, projectId, name, data, idToken) {
  const headers = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data }),
  });
  return { status: response.status, body: await json(response) };
}

async function firestoreRequest({ host, projectId, path, idToken, method, body, query = "" }) {
  const response = await fetch(
    `http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}${query}`,
    {
      method,
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }
  );
  return { status: response.status, body: await json(response) };
}

function reason(result) {
  return result.body?.error?.details?.reason;
}

test("E1-02 crea Persona propia y vincula Usuario de forma atómica", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e1-02-person-integration");
  const db = app.firestore();
  const auth = app.auth();
  const actor = await signUp(authHost, "e1-02-person@example.invalid");
  const concurrentActor = await signUp(authHost, "e1-02-concurrent@example.invalid");
  const samePayloadActor = await signUp(authHost, "e1-02-same-payload@example.invalid");
  const noAccountActor = await signUp(authHost, "e1-02-no-account@example.invalid");

  try {
    await t.test("sin cuenta falla cerrado y no deja Persona huérfana", async () => {
      const before = (await db.collection("personas").get()).size;
      const result = await callFunction(functionsHost, projectId, "ensureMyPerson", {
        firstName: "Sin", lastName: "Cuenta", contactEmail: "sin@example.invalid",
      }, noAccountActor.idToken);
      assert.equal(result.body?.error?.status, "FAILED_PRECONDITION");
      assert.equal(reason(result), "ACCOUNT_NOT_INITIALIZED");
      assert.equal((await db.collection("personas").get()).size, before);
    });

    await t.test("rechaza visitante y payload abierto", async () => {
      const visitor = await callFunction(functionsHost, projectId, "getMyPerson", {});
      const manipulated = await callFunction(functionsHost, projectId, "ensureMyPerson", {
        firstName: "Ana", lastName: "Díaz", contactEmail: "ana@example.invalid", userId: actor.uid,
      }, actor.idToken);
      assert.equal(visitor.body?.error?.status, "UNAUTHENTICATED");
      assert.equal(reason(visitor), "AUTHENTICATION_REQUIRED");
      assert.equal(manipulated.body?.error?.status, "INVALID_ARGUMENT");
      assert.equal(reason(manipulated), "INVALID_PERSON_DATA");
    });

    for (const current of [actor, concurrentActor, samePayloadActor]) {
      const initialized = await callFunction(functionsHost, projectId, "ensureMyAccount", {}, current.idToken);
      assert.equal(initialized.status, 200, JSON.stringify(initialized.body));
    }

    await t.test("get devuelve null antes del vínculo", async () => {
      const result = await callFunction(functionsHost, projectId, "getMyPerson", {}, actor.idToken);
      assert.deepEqual(result.body?.result, { person: null });
    });

    let actorPersonId;
    await t.test("alta recorta bordes, preserva casing y persiste esquema exacto", async () => {
      const result = await callFunction(functionsHost, projectId, "ensureMyPerson", {
        firstName: "  MaRía ", lastName: " Pérez  ", contactEmail: " Contacto@Example.INVALID ",
      }, actor.idToken);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.result.outcome, "created");
      assert.deepEqual(result.body.result.person, {
        personId: result.body.result.person.personId,
        firstName: "MaRía",
        lastName: "Pérez",
        contactEmail: "Contacto@Example.INVALID",
      });
      actorPersonId = result.body.result.person.personId;
      assert.ok(actorPersonId && !actorPersonId.includes(actor.uid));

      const user = (await db.collection("users").doc(actor.uid).get()).data();
      assert.equal(user.personaId, actorPersonId);
      const person = (await db.collection("personas").doc(actorPersonId).get()).data();
      assert.deepEqual(Object.keys(person).sort(), ["apellido", "createdAt", "emailContacto", "nombre"]);
      assert.equal(person.nombre, "MaRía");
      assert.equal(person.apellido, "Pérez");
      assert.equal(person.emailContacto, "Contacto@Example.INVALID");
      assert.ok(person.createdAt);
    });

    await t.test("reintento no sobrescribe datos y get devuelve el mismo DTO", async () => {
      const retry = await callFunction(functionsHost, projectId, "ensureMyPerson", {
        firstName: "Otro", lastName: "Nombre", contactEmail: "otro@example.invalid",
      }, actor.idToken);
      const get = await callFunction(functionsHost, projectId, "getMyPerson", {}, actor.idToken);
      assert.equal(retry.body?.result?.outcome, "existing");
      assert.deepEqual(retry.body.result.person, get.body.result.person);
      assert.equal(get.body.result.person.personId, actorPersonId);
      assert.equal(get.body.result.person.firstName, "MaRía");
    });

    await t.test("dos altas concurrentes convergen sin Persona huérfana", async () => {
      const before = (await db.collection("personas").get()).size;
      const [first, second] = await Promise.all([
        callFunction(functionsHost, projectId, "ensureMyPerson", {
          firstName: "Primera", lastName: "Solicitud", contactEmail: "first@example.invalid",
        }, concurrentActor.idToken),
        callFunction(functionsHost, projectId, "ensureMyPerson", {
          firstName: "Segunda", lastName: "Solicitud", contactEmail: "second@example.invalid",
        }, concurrentActor.idToken),
      ]);
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.equal(second.status, 200, JSON.stringify(second.body));
      assert.equal(first.body.result.person.personId, second.body.result.person.personId);
      assert.deepEqual(new Set([first.body.result.outcome, second.body.result.outcome]), new Set(["created", "existing"]));
      assert.equal((await db.collection("personas").get()).size, before + 1);
    });

    await t.test("dos altas concurrentes iguales convergen y el email no impone unicidad", async () => {
      const before = (await db.collection("personas").get()).size;
      const payload = { firstName: "Misma", lastName: "Solicitud", contactEmail: "Contacto@Example.INVALID" };
      const [first, second] = await Promise.all([
        callFunction(functionsHost, projectId, "ensureMyPerson", payload, samePayloadActor.idToken),
        callFunction(functionsHost, projectId, "ensureMyPerson", payload, samePayloadActor.idToken),
      ]);
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.equal(second.status, 200, JSON.stringify(second.body));
      assert.equal(first.body.result.person.personId, second.body.result.person.personId);
      assert.deepEqual(new Set([first.body.result.outcome, second.body.result.outcome]), new Set(["created", "existing"]));
      assert.equal((await db.collection("personas").get()).size, before + 1);
      assert.notEqual(first.body.result.person.personId, actorPersonId);
    });

    await t.test("reglas deniegan lectura y toda escritura directa de Persona", async () => {
      await db.collection("users").doc(actor.uid).update({ roles: "admin" });
      const path = `personas/${encodeURIComponent(actorPersonId)}`;
      const read = await firestoreRequest({ host: firestoreHost, projectId, path, idToken: actor.idToken, method: "GET" });
      const update = await firestoreRequest({
        host: firestoreHost, projectId, path, idToken: actor.idToken, method: "PATCH",
        query: "?updateMask.fieldPaths=nombre", body: { fields: { nombre: { stringValue: "Manipulado" } } },
      });
      const remove = await firestoreRequest({ host: firestoreHost, projectId, path, idToken: actor.idToken, method: "DELETE" });
      const create = await firestoreRequest({
        host: firestoreHost, projectId, path: "personas/client-created", idToken: actor.idToken, method: "PATCH",
        body: { fields: { nombre: { stringValue: "Cliente" } } },
      });
      const linkUpdate = await firestoreRequest({
        host: firestoreHost, projectId, path: `users/${encodeURIComponent(actor.uid)}`, idToken: actor.idToken, method: "PATCH",
        query: "?updateMask.fieldPaths=personaId", body: { fields: { personaId: { stringValue: "client-link" } } },
      });
      for (const result of [read, update, remove, create, linkUpdate]) assert.equal(result.status, 403, JSON.stringify(result.body));
    });

    await t.test("Persona vinculada con esquema inválido falla cerrado", async () => {
      const concurrentUser = (await db.collection("users").doc(concurrentActor.uid).get()).data();
      await db.collection("personas").doc(concurrentUser.personaId).update({ updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      const result = await callFunction(functionsHost, projectId, "getMyPerson", {}, concurrentActor.idToken);
      assert.equal(result.body?.error?.status, "FAILED_PRECONDITION");
      assert.equal(reason(result), "PERSON_LINK_INCONSISTENT");
    });

    await t.test("vínculo corrupto falla cerrado con razón estable", async () => {
      await db.collection("users").doc(actor.uid).update({ personaId: "missing-person" });
      const result = await callFunction(functionsHost, projectId, "getMyPerson", {}, actor.idToken);
      assert.equal(result.body?.error?.status, "FAILED_PRECONDITION");
      assert.equal(reason(result), "PERSON_LINK_INCONSISTENT");
    });
  } finally {
    const users = [actor, concurrentActor, samePayloadActor, noAccountActor];
    const persons = await db.collection("personas").get();
    await Promise.allSettled([
      ...persons.docs.map((doc) => doc.ref.delete()),
      ...users.map((user) => db.collection("users").doc(user.uid).delete()),
      ...users.map((user) => auth.deleteUser(user.uid)),
    ]);
    await app.delete();
  }
});
