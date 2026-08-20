"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  assertSafeFirebaseTestEnvironment,
} = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

const VALID_POSITIONS = ["central", "punta"];

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

async function waitForUserDocument(db, uid) {
  const ref = db.collection("users").doc(uid);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const snapshot = await ref.get();
    if (snapshot.exists) return snapshot;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Synthetic user document was not created: ${uid}`);
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
    await Promise.all([
      waitForUserDocument(db, self.uid),
      waitForUserDocument(db, other.uid),
    ]);

    await t.test("rechaza onboarding no autenticado", async () => {
      const result = await callFunction(
        functionsHost,
        projectId,
        "completeOnboarding",
        { posicionesPreferidas: VALID_POSITIONS }
      );
      assert.notEqual(result.status, 200);
      assert.equal(result.body?.error?.status, "UNAUTHENTICATED");
    });

    await t.test("updateUserRole ya no existe para clientes autenticados o anónimos", async () => {
      const anonymous = await callFunction(
        functionsHost,
        projectId,
        "updateUserRole",
        { role: "admin" }
      );
      const authenticated = await callFunction(
        functionsHost,
        projectId,
        "updateUserRole",
        { role: "admin", userId: other.uid },
        self.idToken
      );
      assert.equal(anonymous.status, 404);
      assert.equal(authenticated.status, 404);
    });

    await t.test("rechaza campos de rol manipulados sin elevar a nadie", async () => {
      const result = await callFunction(
        functionsHost,
        projectId,
        "completeOnboarding",
        {
          posicionesPreferidas: VALID_POSITIONS,
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
      assert.equal(selfDoc.data().roles, null);
      assert.equal(otherDoc.data().roles, null);
    });

    await t.test("onboarding válido funciona y no concede privilegios", async () => {
      const result = await callFunction(
        functionsHost,
        projectId,
        "completeOnboarding",
        { posicionesPreferidas: VALID_POSITIONS },
        self.idToken
      );
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body?.result?.ok, true);
      const userDoc = await db.collection("users").doc(self.uid).get();
      assert.equal(userDoc.data().roles, null);
      assert.equal(userDoc.data().onboarded, true);
      assert.deepEqual(userDoc.data().posicionesPreferidas, VALID_POSITIONS);
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

    await t.test("reglas permiten actualizar identidad propia sin tocar privilegios", async () => {
      const result = await patchUser({
        firestoreHost,
        projectId,
        userId: self.uid,
        idToken: self.idToken,
        fields: { nombre: { stringValue: "E0-03 Synthetic Name" } },
        masks: ["nombre"],
      });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      const userDoc = await db.collection("users").doc(self.uid).get();
      assert.equal(userDoc.data().nombre, "E0-03 Synthetic Name");
      assert.equal(userDoc.data().roles, null);
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
