"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  assertSafeFirebaseTestEnvironment,
} = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw: text };
  }
}

async function signUpSyntheticUser(authHost, email) {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e0-03-synthetic-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "E0-03-synthetic-password!",
        returnSecureToken: true,
      }),
    }
  );
  const body = await readJson(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.ok(body.localId);
  assert.ok(body.idToken);
  return { uid: body.localId, idToken: body.idToken };
}

async function callFunction(functionsHost, projectId, name, data, idToken) {
  const headers = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const response = await fetch(
    `http://${functionsHost}/${projectId}/us-central1/${name}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ data }),
    }
  );
  return { status: response.status, body: await readJson(response) };
}

async function patchUser({ firestoreHost, projectId, userId, idToken, fields, masks = [] }) {
  const query = masks
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const response = await fetch(
    `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(userId)}${query ? `?${query}` : ""}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );
  return { status: response.status, body: await readJson(response) };
}

test("contiene todos los caminos de autopromoción sin depender del frontend", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);

  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e0-03-autopromotion-security");
  const db = app.firestore();
  const auth = app.auth();
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const self = await signUpSyntheticUser(authHost, "e0-03-self@example.invalid");
  const other = await signUpSyntheticUser(authHost, "e0-03-other@example.invalid");

  try {
    const initializations = await Promise.all([
      callFunction(functionsHost, projectId, "ensureMyAccount", {}, self.idToken),
      callFunction(functionsHost, projectId, "ensureMyAccount", {}, other.idToken),
    ]);
    for (const initialization of initializations) {
      assert.equal(initialization.status, 200, JSON.stringify(initialization.body));
    }

    await t.test("rechaza bootstrap no autenticado", async () => {
      const result = await callFunction(
        functionsHost,
        projectId,
        "ensureMyAccount",
        {}
      );
      assert.notEqual(result.status, 200);
      assert.equal(result.body?.error?.status, "UNAUTHENTICATED");
    });

    await t.test("autoridades legadas ya no existen", async () => {
      const updateRole = await callFunction(
        functionsHost,
        projectId,
        "updateUserRole",
        { role: "admin" }
      );
      const onboarding = await callFunction(
        functionsHost,
        projectId,
        "completeOnboarding",
        { posicionesPreferidas: ["central"] },
        self.idToken
      );
      assert.equal(updateRole.status, 404);
      assert.equal(onboarding.status, 404);
    });

    await t.test("rechaza campos de rol manipulados sin elevar a nadie", async () => {
      const result = await callFunction(
        functionsHost,
        projectId,
        "ensureMyAccount",
        {
          roles: "admin",
          userId: other.uid,
        },
        self.idToken
      );
      assert.notEqual(result.status, 200);
      assert.equal(result.body?.error?.status, "INVALID_ARGUMENT");
      const [selfDoc, otherDoc] = await Promise.all([
        db.collection("users").doc(self.uid).get(),
        db.collection("users").doc(other.uid).get(),
      ]);
      assert.equal(selfDoc.data().roles, undefined);
      assert.equal(otherDoc.data().roles, undefined);
    });

    await t.test("bootstrap repetido no concede privilegios ni campos deportivos", async () => {
      const result = await callFunction(
        functionsHost,
        projectId,
        "ensureMyAccount",
        {},
        self.idToken
      );
      assert.equal(result.status, 200, JSON.stringify(result.body));
      const userDoc = await db.collection("users").doc(self.uid).get();
      assert.deepEqual(Object.keys(userDoc.data()).sort(), [
        "createdAt",
        "email",
        "nombre",
        "photoURL",
      ]);
    });

    await t.test("reglas rechazan promoción propia y de otro usuario", async () => {
      const promoteSelf = await patchUser({
        firestoreHost,
        projectId,
        userId: self.uid,
        idToken: self.idToken,
        fields: { roles: { stringValue: "admin" } },
        masks: ["roles"],
      });
      const promoteOther = await patchUser({
        firestoreHost,
        projectId,
        userId: other.uid,
        idToken: self.idToken,
        fields: { roles: { stringValue: "admin" } },
        masks: ["roles"],
      });
      assert.equal(promoteSelf.status, 403, JSON.stringify(promoteSelf.body));
      assert.equal(promoteOther.status, 403, JSON.stringify(promoteOther.body));

      for (const field of [
        "role",
        "isAdmin",
        "customClaims",
        "claims",
        "permissions",
        "privileges",
      ]) {
        const aliasAttempt = await patchUser({
          firestoreHost,
          projectId,
          userId: self.uid,
          idToken: self.idToken,
          fields: { [field]: { booleanValue: true } },
          masks: [field],
        });
        assert.equal(
          aliasAttempt.status,
          403,
          `${field}: ${JSON.stringify(aliasAttempt.body)}`
        );
      }
    });

    await t.test("reglas rechazan actualizar identidad propia", async () => {
      const result = await patchUser({
        firestoreHost,
        projectId,
        userId: self.uid,
        idToken: self.idToken,
        fields: { nombre: { stringValue: "E0-03 Synthetic Name" } },
        masks: ["nombre"],
      });
      assert.equal(result.status, 403, JSON.stringify(result.body));
      const userDoc = await db.collection("users").doc(self.uid).get();
      assert.notEqual(userDoc.data().nombre, "E0-03 Synthetic Name");
      assert.equal(userDoc.data().roles, undefined);
    });

    await t.test("reglas rechazan crear el propio usuario con privilegios", async () => {
      await db.collection("users").doc(other.uid).delete();
      const result = await patchUser({
        firestoreHost,
        projectId,
        userId: other.uid,
        idToken: other.idToken,
        fields: {
          email: { stringValue: "e0-03-other@example.invalid" },
          roles: { stringValue: "admin" },
        },
      });
      assert.equal(result.status, 403, JSON.stringify(result.body));
    });

    const [selfAuth, otherAuth] = await Promise.all([
      auth.getUser(self.uid),
      auth.getUser(other.uid),
    ]);
    assert.deepEqual(selfAuth.customClaims || {}, {});
    assert.deepEqual(otherAuth.customClaims || {}, {});
  } finally {
    await Promise.allSettled([
      db.collection("users").doc(self.uid).delete(),
      db.collection("users").doc(other.uid).delete(),
      auth.deleteUser(self.uid),
      auth.deleteUser(other.uid),
    ]);
    await app.delete();
  }
});
