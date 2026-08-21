"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  assertSafeFirebaseTestEnvironment,
} = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function signUp(authHost, email) {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e1-01-synthetic-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "E1-01-synthetic-password!",
        returnSecureToken: true,
      }),
    }
  );
  const body = await readJson(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken, email };
}

async function callFunction(host, projectId, name, data, idToken) {
  const headers = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const response = await fetch(
    `http://${host}/${projectId}/us-central1/${name}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ data }),
    }
  );
  return { status: response.status, body: await readJson(response) };
}

function firestoreDocumentUrl(host, projectId, userId) {
  return `http://${host}/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(userId)}`;
}

async function firestoreRequest({ host, projectId, userId, idToken, method, body, query = "" }) {
  const response = await fetch(
    `${firestoreDocumentUrl(host, projectId, userId)}${query}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );
  return { status: response.status, body: await readJson(response) };
}

test("E1-01 materializa y consulta únicamente la cuenta autenticada", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);

  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e1-01-account-integration");
  const db = app.firestore();
  const auth = app.auth();
  const actor = await signUp(authHost, "e1-01-account@example.invalid");
  const other = await signUp(authHost, "e1-01-other@example.invalid");
  const accountRef = db.collection("users").doc(actor.uid);

  try {
    await t.test("Auth puede existir sin Usuario y get devuelve not-found", async () => {
      assert.equal((await accountRef.get()).exists, false);
      const result = await callFunction(
        functionsHost,
        projectId,
        "getMyAccount",
        {},
        actor.idToken
      );
      assert.notEqual(result.status, 200);
      assert.equal(result.body?.error?.status, "NOT_FOUND");
    });

    await t.test("callables rechazan visitante y payload con userId", async () => {
      const unauthenticated = await callFunction(
        functionsHost,
        projectId,
        "ensureMyAccount",
        {}
      );
      const manipulated = await callFunction(
        functionsHost,
        projectId,
        "ensureMyAccount",
        { userId: other.uid },
        actor.idToken
      );
      assert.equal(unauthenticated.body?.error?.status, "UNAUTHENTICATED");
      assert.equal(manipulated.body?.error?.status, "INVALID_ARGUMENT");
      assert.equal((await accountRef.get()).exists, false);
    });

    await t.test("dos bootstrap concurrentes crean un documento mínimo", async () => {
      const [first, second] = await Promise.all([
        callFunction(functionsHost, projectId, "ensureMyAccount", {}, actor.idToken),
        callFunction(functionsHost, projectId, "ensureMyAccount", {}, actor.idToken),
      ]);
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.equal(second.status, 200, JSON.stringify(second.body));
      assert.deepEqual(first.body?.result, second.body?.result);
      assert.deepEqual(first.body?.result, {
        userId: actor.uid,
        displayName: "",
        accessEmail: actor.email,
        accountPhotoUrl: null,
      });

      const snapshot = await accountRef.get();
      assert.equal(snapshot.exists, true);
      const document = snapshot.data();
      assert.deepEqual(Object.keys(document).sort(), [
        "createdAt",
        "email",
        "nombre",
        "photoURL",
      ]);
      assert.equal(document.email, actor.email);
      assert.equal(document.nombre, "");
      assert.equal(document.photoURL, "");
      assert.ok(document.createdAt);
    });

    await t.test("get y reintento devuelven el DTO sin sincronizar existente", async () => {
      await accountRef.update({ nombre: "Nombre persistido" });
      const [getResult, retryResult] = await Promise.all([
        callFunction(functionsHost, projectId, "getMyAccount", {}, actor.idToken),
        callFunction(functionsHost, projectId, "ensureMyAccount", {}, actor.idToken),
      ]);
      const expected = {
        userId: actor.uid,
        displayName: "Nombre persistido",
        accessEmail: actor.email,
        accountPhotoUrl: null,
      };
      assert.deepEqual(getResult.body?.result, expected);
      assert.deepEqual(retryResult.body?.result, expected);
      assert.equal((await accountRef.get()).data().nombre, "Nombre persistido");
    });

    await t.test("reglas conservan lectura propia pero deniegan escrituras cliente", async () => {
      const ownRead = await firestoreRequest({
        host: firestoreHost,
        projectId,
        userId: actor.uid,
        idToken: actor.idToken,
        method: "GET",
      });
      const otherRead = await firestoreRequest({
        host: firestoreHost,
        projectId,
        userId: actor.uid,
        idToken: other.idToken,
        method: "GET",
      });
      const update = await firestoreRequest({
        host: firestoreHost,
        projectId,
        userId: actor.uid,
        idToken: actor.idToken,
        method: "PATCH",
        query: "?updateMask.fieldPaths=nombre",
        body: { fields: { nombre: { stringValue: "Manipulado" } } },
      });
      const create = await firestoreRequest({
        host: firestoreHost,
        projectId,
        userId: other.uid,
        idToken: other.idToken,
        method: "PATCH",
        body: { fields: { email: { stringValue: other.email } } },
      });
      const remove = await firestoreRequest({
        host: firestoreHost,
        projectId,
        userId: actor.uid,
        idToken: actor.idToken,
        method: "DELETE",
      });

      assert.equal(ownRead.status, 200, JSON.stringify(ownRead.body));
      assert.equal(otherRead.status, 403, JSON.stringify(otherRead.body));
      assert.equal(update.status, 403, JSON.stringify(update.body));
      assert.equal(create.status, 403, JSON.stringify(create.body));
      assert.equal(remove.status, 403, JSON.stringify(remove.body));
    });
  } finally {
    await Promise.allSettled([
      accountRef.delete(),
      db.collection("users").doc(other.uid).delete(),
      auth.deleteUser(actor.uid),
      auth.deleteUser(other.uid),
    ]);
    await app.delete();
  }
});
