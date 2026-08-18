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

async function signUp(authHost, label) {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e0-09b-synthetic-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `e0-09b-${label}@example.invalid`,
        password: "E0-09b-synthetic-password!",
        returnSecureToken: true,
      }),
    }
  );
  const body = await readJson(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken };
}

function firestoreUrl(host, projectId, suffix) {
  return `http://${host}/v1/projects/${projectId}/databases/(default)/documents${suffix}`;
}

async function requestFirestore({
  host,
  projectId,
  method,
  path,
  idToken,
  fields,
}) {
  const headers = {};
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  if (fields) headers["Content-Type"] = "application/json";

  const response = await fetch(firestoreUrl(host, projectId, path), {
    method,
    headers,
    ...(fields ? { body: JSON.stringify({ fields }) } : {}),
  });
  return { status: response.status, body: await readJson(response) };
}

function assertDenied(result) {
  assert.equal(result.status, 403, JSON.stringify(result.body));
}

test("la barrera temporal rechaza toda lectura y escritura cliente", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env, {
    requiredEmulatorHosts: [
      "FIRESTORE_EMULATOR_HOST",
      "FIREBASE_AUTH_EMULATOR_HOST",
    ],
    requireSyntheticSecrets: false,
  });
  assert.equal(projectId, SYNTHETIC_DATA.projectId);

  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e0-09b-maintenance-rules");
  const db = app.firestore();
  const auth = app.auth();
  const [owner, newcomer] = await Promise.all([
    signUp(authHost, "owner"),
    signUp(authHost, "newcomer"),
  ]);

  const ownerRef = db.collection("users").doc(owner.uid);
  const groupRef = db.collection("groups").doc("e0-09b-contextual-group");
  const alertRef = groupRef.collection("pendingAlerts").doc("deterministic-alert");

  try {
    await Promise.all([
      ownerRef.set({
        displayName: "E0-09B Synthetic Owner",
        roles: "admin",
        fixture: "synthetic-e0-09b",
      }),
      groupRef.set({
        nombre: "E0-09B Synthetic Group",
        ownerId: owner.uid,
        adminIds: [owner.uid],
        memberIds: [owner.uid],
        fixture: "synthetic-e0-09b",
      }),
      alertRef.set({
        kind: "synthetic-maintenance-alert",
        fixture: "synthetic-e0-09b",
      }),
    ]);

    await t.test("visitante no puede leer documentos ni listar colecciones", async () => {
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "GET",
          path: "/groups/e0-09b-contextual-group",
        })
      );
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "GET",
          path: "/groups?pageSize=10",
        })
      );
    });

    await t.test("visitante no puede crear, actualizar ni eliminar", async () => {
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "PATCH",
          path: "/groups/e0-09b-visitor-create",
          fields: { nombre: { stringValue: "Denied" } },
        })
      );
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "PATCH",
          path: "/groups/e0-09b-contextual-group?updateMask.fieldPaths=nombre",
          fields: { nombre: { stringValue: "Denied" } },
        })
      );
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "DELETE",
          path: "/groups/e0-09b-contextual-group",
        })
      );
    });

    await t.test("usuario autenticado no puede leer su propio Usuario", async () => {
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "GET",
          path: `/users/${owner.uid}`,
          idToken: owner.idToken,
        })
      );
    });

    await t.test("usuario autenticado no puede crear ni modificar su propio Usuario", async () => {
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "PATCH",
          path: `/users/${newcomer.uid}`,
          idToken: newcomer.idToken,
          fields: { displayName: { stringValue: "Denied" } },
        })
      );
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "PATCH",
          path: `/users/${owner.uid}?updateMask.fieldPaths=displayName`,
          idToken: owner.idToken,
          fields: { displayName: { stringValue: "Denied" } },
        })
      );
    });

    await t.test("owner y administrador contextual no pueden acceder al Grupo", async () => {
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "GET",
          path: "/groups/e0-09b-contextual-group",
          idToken: owner.idToken,
        })
      );
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "PATCH",
          path: "/groups/e0-09b-contextual-group?updateMask.fieldPaths=nombre",
          idToken: owner.idToken,
          fields: { nombre: { stringValue: "Denied" } },
        })
      );
    });

    await t.test("visitantes y autenticados no pueden acceder a subcolecciones", async () => {
      const alertPath =
        "/groups/e0-09b-contextual-group/pendingAlerts/deterministic-alert";
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "GET",
          path: alertPath,
        })
      );
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "GET",
          path: alertPath,
          idToken: owner.idToken,
        })
      );
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "PATCH",
          path: `${alertPath}-new`,
          idToken: owner.idToken,
          fields: { kind: { stringValue: "Denied" } },
        })
      );
      assertDenied(
        await requestFirestore({
          host: firestoreHost,
          projectId,
          method: "DELETE",
          path: alertPath,
          idToken: owner.idToken,
        })
      );
    });
  } finally {
    await Promise.allSettled([
      alertRef.delete(),
      groupRef.collection("pendingAlerts").doc("deterministic-alert-new").delete(),
      groupRef.delete(),
      ownerRef.delete(),
      db.collection("users").doc(newcomer.uid).delete(),
      db.collection("groups").doc("e0-09b-visitor-create").delete(),
      auth.deleteUser(owner.uid),
      auth.deleteUser(newcomer.uid),
    ]);
    await app.delete();
  }
});
