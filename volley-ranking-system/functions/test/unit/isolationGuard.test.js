"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  SYNTHETIC_SECRETS,
  assertSafeFirebaseTestEnvironment,
} = require("../guards/firebaseTestGuard");

function safeEnvironment(overrides = {}) {
  return {
    TEST_FIREBASE_PROJECT_ID: "demo-sportexa-e0-02",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19099",
    TEST_SECRET_SOURCE: "synthetic-inline",
    ...SYNTHETIC_SECRETS,
    ...overrides,
  };
}

test("acepta solamente proyecto demo, hosts loopback y secretos sintéticos", () => {
  const result = assertSafeFirebaseTestEnvironment(safeEnvironment());
  assert.equal(result.projectId, "demo-sportexa-e0-02");
});

test("acepta FIREBASE_CONFIG generado para el mismo proyecto demo", () => {
  const result = assertSafeFirebaseTestEnvironment(
    safeEnvironment({
      FIREBASE_CONFIG: JSON.stringify({
        projectId: "demo-sportexa-e0-02",
        databaseURL: "https://demo-sportexa-e0-02.firebaseio.com",
      }),
    })
  );
  assert.equal(result.projectId, "demo-sportexa-e0-02");
});

test("falla cerrado ante un project ID remoto", () => {
  assert.throws(
    () =>
      assertSafeFirebaseTestEnvironment(
        safeEnvironment({ TEST_FIREBASE_PROJECT_ID: "project-groupvolley" })
      ),
    /project ID must start with demo-/
  );
});

test("falla cerrado cuando falta un host de emulador", () => {
  const environment = safeEnvironment();
  delete environment.FIRESTORE_EMULATOR_HOST;
  assert.throws(
    () => assertSafeFirebaseTestEnvironment(environment),
    /missing FIRESTORE_EMULATOR_HOST/
  );
});

test("falla cerrado ante un host no local", () => {
  assert.throws(
    () =>
      assertSafeFirebaseTestEnvironment(
        safeEnvironment({ FIRESTORE_EMULATOR_HOST: "firestore.googleapis.com:443" })
      ),
    /remote Firebase marker|loopback host/
  );
});

test("falla cerrado si hay credenciales de aplicación", () => {
  assert.throws(
    () =>
      assertSafeFirebaseTestEnvironment(
        safeEnvironment({ GOOGLE_APPLICATION_CREDENTIALS: "/tmp/credential.json" })
      ),
    /GOOGLE_APPLICATION_CREDENTIALS must be absent/
  );
});

test("falla cerrado ante un target remoto dentro de FIREBASE_CONFIG", () => {
  assert.throws(
    () =>
      assertSafeFirebaseTestEnvironment(
        safeEnvironment({
          FIREBASE_CONFIG: JSON.stringify({
            projectId: "demo-sportexa-e0-02",
            databaseURL: "https://project-groupvolley.firebaseio.com",
          }),
        })
      ),
    /remote Firebase target/
  );
});

test("falla cerrado si un valor VAPID no es el sintético aprobado", () => {
  assert.throws(
    () =>
      assertSafeFirebaseTestEnvironment(
        safeEnvironment({ PUSH_VAPID_PRIVATE_KEY: "non-synthetic-value" })
      ),
    /PUSH_VAPID_PRIVATE_KEY is not the approved synthetic value/
  );
});
