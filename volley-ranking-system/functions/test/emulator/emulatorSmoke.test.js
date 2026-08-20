"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  assertSafeFirebaseTestEnvironment,
} = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

test("Auth y Firestore operan con datos sintéticos en emuladores", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);

  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e0-02-infrastructure-smoke");
  const db = app.firestore();
  const auth = app.auth();
  const document = db
    .collection(SYNTHETIC_DATA.firestore.collection)
    .doc(SYNTHETIC_DATA.firestore.documentId);

  try {
    await document.set(SYNTHETIC_DATA.firestore.payload);
    const snapshot = await document.get();
    assert.equal(snapshot.exists, true);
    assert.deepEqual(snapshot.data(), SYNTHETIC_DATA.firestore.payload);

    await auth.createUser(SYNTHETIC_DATA.auth);
    const user = await auth.getUser(SYNTHETIC_DATA.auth.uid);
    assert.equal(user.email, SYNTHETIC_DATA.auth.email);
  } finally {
    await Promise.allSettled([
      document.delete(),
      auth.deleteUser(SYNTHETIC_DATA.auth.uid),
    ]);
    await app.delete();
  }
});
