"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestoreAccountIdentityStore } = require("../../src/accountIdentities/infrastructure/firestoreAccountIdentityStore");
const { reconcile } = require("../../src/scripts/inspectAccountIdentityMaterialization");

async function json(response) { const value = await response.text(); return value ? JSON.parse(value) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=iux11c0`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Iux11c0-password!", returnSecureToken: true }),
  });
  const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, token: body.idToken, email };
}
async function call(host, projectId, name, data, token) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data }),
  });
  return { status: response.status, body: await json(response) };
}
async function firestoreRequest({ host, projectId, path, token, method, body }) {
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await json(response) };
}
function reason(response) { return response.body?.error?.details?.reason; }

test("IUX-11C0 materializa espejo simple, conserva fallback y falla cerrado", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-11c0"); const db = app.firestore(); const auth = app.auth();
  const accounts = await Promise.all([
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11c0-new@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11c0-legacy@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11c0-divergent@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11c0-empty@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11c0-collision@example.invalid"),
  ]);
  const [fresh, legacy, divergent, empty, collision] = accounts;
  const createdAt = new Date("2026-11-27T12:00:00Z"); const legacyPersonId = "iux11c0-legacy-person"; const divergentPersonId = "iux11c0-divergent-person";
  const store = createFirestoreAccountIdentityStore({ db });
  try {
    assert.deepEqual((await store.inspectIdentityMaterialization({ pageSize: 100 })).items, []);
    await db.doc(`users/${fresh.uid}`).set({ nombre: "Synthetic", email: fresh.email, photoURL: "", createdAt });
    const single = await store.inspectIdentityMaterialization({ pageSize: 100 });
    assert.equal(single.items.length, 1); assert.equal(single.items[0].status, "MISSING");
    for (const account of accounts.slice(1)) await db.doc(`users/${account.uid}`).set({ nombre: "Synthetic", email: account.email, photoURL: "", createdAt });
    await db.doc(`users/${legacy.uid}`).update({ personaId: legacyPersonId });
    await db.doc(`users/${divergent.uid}`).update({ personaId: divergentPersonId });
    await db.doc(`personas/${legacyPersonId}`).set({ nombre: "Legacy", apellido: "Compatible", emailContacto: legacy.email, createdAt });
    await db.doc(`personas/${divergentPersonId}`).set({ nombre: "Estado", apellido: "Divergente", emailContacto: divergent.email, createdAt });
    await db.doc(`accountIdentities/${divergent.uid}`).set({ accountId: divergent.uid, primaryPersonId: divergentPersonId, state: "MIRRORED_SINGLE", identityRevision: 1, createdAt, updatedAt: createdAt, schemaVersion: 1 });
    await db.doc(`accountIdentities/${collision.uid}`).set({ accountId: collision.uid, primaryPersonId: "preexisting", state: "MIRRORED_SINGLE", identityRevision: 1, createdAt, updatedAt: createdAt, schemaVersion: 1 });

    const created = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "ensureMyPerson", { firstName: "Nueva", lastName: "Ficha", contactEmail: fresh.email }, fresh.token);
    assert.equal(created.status, 200, JSON.stringify(created.body)); assert.equal(created.body.result.outcome, "created");
    const personId = created.body.result.person.personId;
    const identity = (await db.doc(`accountIdentities/${fresh.uid}`).get()).data();
    const assignment = (await db.doc(`personIdentityAssignments/${personId}`).get()).data();
    assert.deepEqual(Object.keys(identity).sort(), ["accountId", "createdAt", "identityRevision", "primaryPersonId", "schemaVersion", "state", "updatedAt"]);
    assert.equal(identity.accountId, fresh.uid); assert.equal(identity.primaryPersonId, personId); assert.equal(identity.state, "MIRRORED_SINGLE"); assert.equal(identity.identityRevision, 1); assert.equal(identity.schemaVersion, 1);
    assert.deepEqual(Object.keys(assignment).sort(), ["accountId", "assignedAt", "personId", "schemaVersion", "source", "state"]);
    assert.equal(assignment.accountId, fresh.uid); assert.equal(assignment.personId, personId); assert.equal(assignment.state, "ACTIVE"); assert.equal(assignment.source, "SELF_BOOTSTRAP"); assert.equal(assignment.schemaVersion, 1);

    const existingResult = await db.runTransaction((transaction) => store.ensureMirroredSingleIdentity(transaction, {
      accountId: fresh.uid, personId, source: "SELF_BOOTSTRAP", occurredAt: admin.firestore.Timestamp.now(),
    }));
    assert.equal(existingResult, "EXISTING");

    await assert.rejects(() => db.runTransaction(async (transaction) => store.ensureMirroredSingleIdentity(transaction, {
      accountId: "iux11c0-exclusive-other", personId, source: "LEGACY_MATERIALIZATION", occurredAt: admin.firestore.Timestamp.now(),
    })));
    assert.equal((await db.doc("accountIdentities/iux11c0-exclusive-other").get()).exists, false);
    const otherPersonId = "iux11c0-exclusive-other-person";
    await assert.rejects(() => db.runTransaction(async (transaction) => store.ensureMirroredSingleIdentity(transaction, {
      accountId: fresh.uid, personId: otherPersonId, source: "LEGACY_MATERIALIZATION", occurredAt: admin.firestore.Timestamp.now(),
    })));
    assert.equal((await db.doc(`personIdentityAssignments/${otherPersonId}`).get()).exists, false);

    const identityBeforeRetry = (await db.doc(`accountIdentities/${fresh.uid}`).get()).updateTime.toMillis();
    const retry = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "ensureMyPerson", { firstName: "Respuesta", lastName: "Perdida", contactEmail: "other@example.invalid" }, fresh.token);
    assert.equal(retry.status, 200, JSON.stringify(retry.body)); assert.equal(retry.body.result.outcome, "existing"); assert.equal(retry.body.result.person.personId, personId);
    assert.equal((await db.doc(`accountIdentities/${fresh.uid}`).get()).updateTime.toMillis(), identityBeforeRetry);

    const legacyRead = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "getMyPerson", {}, legacy.token);
    const legacyEnsure = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "ensureMyPerson", { firstName: "Ignored", lastName: "Legacy", contactEmail: legacy.email }, legacy.token);
    assert.equal(legacyRead.status, 200, JSON.stringify(legacyRead.body)); assert.equal(legacyEnsure.body.result.outcome, "existing");
    assert.equal((await db.doc(`accountIdentities/${legacy.uid}`).get()).exists, false); assert.equal((await db.doc(`personIdentityAssignments/${legacyPersonId}`).get()).exists, false);
    const emptyRead = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "getMyPerson", {}, empty.token); assert.deepEqual(emptyRead.body.result, { person: null });
    assert.equal((await db.doc(`accountIdentities/${empty.uid}`).get()).exists, false);

    const divergentRead = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "getMyPerson", {}, divergent.token);
    assert.equal(reason(divergentRead), "PERSON_LINK_INCONSISTENT", JSON.stringify(divergentRead.body));
    assert.equal((await db.doc(`personIdentityAssignments/${divergentPersonId}`).get()).exists, false);

    const personsBeforeCollision = (await db.collection("personas").get()).size;
    const rejectedCollision = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "ensureMyPerson", { firstName: "No", lastName: "Parcial", contactEmail: collision.email }, collision.token);
    assert.equal(reason(rejectedCollision), "PERSON_LINK_INCONSISTENT", JSON.stringify(rejectedCollision.body));
    assert.equal(Object.hasOwn((await db.doc(`users/${collision.uid}`).get()).data(), "personaId"), false);
    assert.equal((await db.collection("personas").get()).size, personsBeforeCollision);

    assert.deepEqual(await store.resolveAccountForAssignedPerson({ personId }), { accountId: fresh.uid, personId, status: "MIRRORED_SINGLE" });
    assert.deepEqual(await store.resolveAccountForAssignedPerson({ personId: legacyPersonId }), { accountId: legacy.uid, personId: legacyPersonId, status: "LEGACY_SINGLE" });
    assert.deepEqual(await store.resolveAccountForAssignedPerson({ personId: "missing" }), { accountId: null, personId: "missing", status: "MISSING" });

    const inspectionUsers = Array.from({ length: 96 }, (_, index) => `iux11c0-inspect-${String(index).padStart(3, "0")}`);
    for (const accountId of inspectionUsers) await db.doc(`users/${accountId}`).set({ nombre: "Inspect", email: `${accountId}@example.invalid`, photoURL: "", createdAt });
    const inspected = []; const pageSizes = []; let cursor = null;
    do { const page = await store.inspectIdentityMaterialization({ pageSize: 100, cursor }); inspected.push(...page.items); pageSizes.push(page.items.length); cursor = page.nextCursor || null; } while (cursor);
    assert.deepEqual(pageSizes, [100, 1]); assert.equal(inspected.length, 101); assert.equal(new Set(inspected.map((item) => item.accountId)).size, 101);
    assert.equal(inspected.find((item) => item.accountId === fresh.uid).status, "MIRRORED_SINGLE");
    assert.equal(inspected.find((item) => item.accountId === legacy.uid).status, "LEGACY_SINGLE");
    assert.equal(inspected.find((item) => item.accountId === divergent.uid).status, "INCOMPATIBLE");

    for (const collection of ["accountIdentities", "personIdentityAssignments"]) {
      const read = await firestoreRequest({ host: process.env.FIRESTORE_EMULATOR_HOST, projectId, path: `${collection}/blocked`, token: fresh.token, method: "GET" });
      const write = await firestoreRequest({ host: process.env.FIRESTORE_EMULATOR_HOST, projectId, path: `${collection}/blocked`, token: fresh.token, method: "PATCH", body: { fields: { state: { stringValue: "MIRRORED_SINGLE" } } } });
      assert.equal(read.status, 403, JSON.stringify(read.body)); assert.equal(write.status, 403, JSON.stringify(write.body));
    }
  } finally {
    for (const name of ["personIdentityAssignments", "accountIdentities", "personas", "users"]) {
      const snapshot = await db.collection(name).get(); for (const document of snapshot.docs) await document.ref.delete();
    }
    await Promise.allSettled(accounts.map((account) => auth.deleteUser(account.uid))); await app.delete();
  }
});

test("IUX-11C0 inspecciona, aplica, reanuda y repite materialización legacy sin reparar divergencias", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "iux-11c0-apply"); const db = app.firestore();
  const store = createFirestoreAccountIdentityStore({ db });
  const createdAt = admin.firestore.Timestamp.fromDate(new Date("2026-11-27T15:00:00Z"));
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "iux-11c0-apply-"));
  const manifest = (name) => path.join(temporaryDirectory, `${name}.json`);
  const legacy = [
    ["iux11c0-apply-a", "iux11c0-apply-person-a"],
    ["iux11c0-apply-b", "iux11c0-apply-person-b"],
    ["iux11c0-apply-c", "iux11c0-apply-person-c"],
  ];
  try {
    for (const [accountId, personId] of legacy) {
      await db.doc(`users/${accountId}`).set({ nombre: "Legacy", email: `${accountId}@example.invalid`, personaId: personId, createdAt });
      await db.doc(`personas/${personId}`).set({ nombre: "Persona", apellido: "Legacy", createdAt });
    }
    const emptyUser = { nombre: "Sin Persona", email: "empty@example.invalid", marker: "preserve", createdAt };
    await db.doc("users/iux11c0-apply-d-empty").set(emptyUser);
    await db.doc("iux11c0Unrelated/preserved").set({ marker: "unchanged", nested: { value: 7 } });

    const inspected = await reconcile({ mode: "inspect", pageSize: 2, manifestPath: manifest("inspect"), store });
    assert.equal(inspected.done, true); assert.equal(inspected.counts.inspected, 4);
    assert.equal(inspected.counts.created, 0); assert.equal(inspected.counts.existing, 0); assert.equal(inspected.counts.legacy, 3);
    assert.equal((await db.collection("accountIdentities").get()).empty, true);
    assert.equal((await db.collection("personIdentityAssignments").get()).empty, true);

    const interrupted = await reconcile({ mode: "apply", pageSize: 2, maxPages: 1, manifestPath: manifest("apply"), store });
    assert.equal(interrupted.done, false); assert.equal(interrupted.pagesCompleted, 1); assert.equal(interrupted.counts.created, 2);
    assert.equal((await db.doc("accountIdentities/iux11c0-apply-c").get()).exists, false);

    const resumed = await reconcile({ mode: "apply", pageSize: 2, manifestPath: manifest("apply"), store });
    assert.equal(resumed.done, true); assert.equal(resumed.pagesCompleted, 2); assert.equal(resumed.counts.created, 3); assert.equal(resumed.counts.missing, 1);
    for (const [accountId, personId] of legacy) {
      const identity = (await db.doc(`accountIdentities/${accountId}`).get()).data();
      const assignment = (await db.doc(`personIdentityAssignments/${personId}`).get()).data();
      assert.equal(identity.primaryPersonId, personId); assert.equal(identity.state, "MIRRORED_SINGLE"); assert.equal(identity.identityRevision, 1);
      assert.equal(assignment.accountId, accountId); assert.equal(assignment.source, "LEGACY_MATERIALIZATION"); assert.equal(assignment.state, "ACTIVE");
    }

    const firstIdentity = await db.doc("accountIdentities/iux11c0-apply-a").get();
    const repeated = await reconcile({ mode: "apply", pageSize: 2, manifestPath: manifest("repeat"), store });
    assert.equal(repeated.done, true); assert.equal(repeated.counts.created, 0); assert.equal(repeated.counts.existing, 3); assert.equal(repeated.counts.missing, 1);
    assert.equal((await db.doc("accountIdentities/iux11c0-apply-a").get()).updateTime.toMillis(), firstIdentity.updateTime.toMillis());

    const divergentAccountId = "iux11c0-apply-z-divergent"; const divergentPersonId = "iux11c0-apply-person-z";
    await db.doc(`users/${divergentAccountId}`).set({ nombre: "Divergente", email: "divergent@example.invalid", personaId: divergentPersonId, createdAt });
    await db.doc(`accountIdentities/${divergentAccountId}`).set({
      accountId: divergentAccountId, primaryPersonId: divergentPersonId, state: "MIRRORED_SINGLE",
      identityRevision: 1, createdAt, updatedAt: createdAt, schemaVersion: 1,
    });
    await assert.rejects(
      reconcile({ mode: "apply", pageSize: 100, manifestPath: manifest("divergent"), store }),
      (error) => error?.name === "IdentityIncompatibleStateError",
    );
    assert.equal((await db.doc(`personIdentityAssignments/${divergentPersonId}`).get()).exists, false);
    assert.deepEqual((await db.doc("users/iux11c0-apply-d-empty").get()).data(), emptyUser);
    assert.deepEqual((await db.doc("iux11c0Unrelated/preserved").get()).data(), { marker: "unchanged", nested: { value: 7 } });
    const failedManifest = JSON.parse(fs.readFileSync(manifest("divergent"), "utf8"));
    assert.equal(failedManifest.lastError.code, "INCOMPATIBLE_STATE"); assert.equal(failedManifest.failures, 1);
    assert.deepEqual(failedManifest.counts, { inspected: 0, legacy: 0, created: 0, existing: 0, missing: 0, incompatible: 0 });
  } finally {
    for (const name of ["personIdentityAssignments", "accountIdentities", "personas", "users", "iux11c0Unrelated"]) {
      const snapshot = await db.collection(name).get(); for (const document of snapshot.docs) await document.ref.delete();
    }
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    await app.delete();
  }
});
