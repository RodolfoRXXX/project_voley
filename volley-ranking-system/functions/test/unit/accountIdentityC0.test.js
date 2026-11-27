"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  buildMirroredSingleDocuments,
  classifyAccountIdentity,
} = require("../../src/accountIdentities/domain/accountIdentity");
const { requireLocalEmulator } = require("../../src/scripts/inspectAccountIdentityMaterialization");

const timestamp = Object.freeze({ synthetic: true });
const documents = buildMirroredSingleDocuments({ accountId: "account-1", personId: "person-1", source: "SELF_BOOTSTRAP", occurredAt: timestamp });

test("MIRRORED_SINGLE conserva el espejo exacto y revisiones iniciales", () => {
  assert.deepEqual(documents.accountIdentity, {
    accountId: "account-1", primaryPersonId: "person-1", state: "MIRRORED_SINGLE", identityRevision: 1,
    createdAt: timestamp, updatedAt: timestamp, schemaVersion: 1,
  });
  assert.deepEqual(documents.assignment, {
    personId: "person-1", accountId: "account-1", state: "ACTIVE", source: "SELF_BOOTSTRAP",
    assignedAt: timestamp, schemaVersion: 1,
  });
});

test("clasifica fallback legacy, espejo exacto y divergencias sin repararlas", () => {
  assert.equal(classifyAccountIdentity({ accountId: "account-1", legacyPersonId: "person-1", accountIdentity: null, assignment: null }), "LEGACY_SINGLE");
  assert.equal(classifyAccountIdentity({ accountId: "account-1", legacyPersonId: "person-1", accountIdentity: documents.accountIdentity, assignment: documents.assignment }), "MIRRORED_SINGLE");
  assert.equal(classifyAccountIdentity({ accountId: "account-1", legacyPersonId: "person-1", accountIdentity: documents.accountIdentity, assignment: null }), "INCOMPATIBLE");
  assert.equal(classifyAccountIdentity({ accountId: "account-1", legacyPersonId: "person-1", accountIdentity: { ...documents.accountIdentity, primaryPersonId: "person-2" }, assignment: documents.assignment }), "INCOMPATIBLE");
  assert.equal(classifyAccountIdentity({ accountId: "account-1", legacyPersonId: "person-1", accountIdentity: documents.accountIdentity, assignment: { ...documents.assignment, accountId: "account-2" } }), "INCOMPATIBLE");
  assert.equal(classifyAccountIdentity({ accountId: "account-1", legacyPersonId: "person-1", accountIdentity: { ...documents.accountIdentity, unexpected: true }, assignment: documents.assignment }), "INCOMPATIBLE");
  assert.equal(classifyAccountIdentity({ accountId: "account-1", legacyPersonId: null, accountIdentity: null, assignment: null }), "MISSING");
});

test("inspección y apply reanudable quedan restringidos a emulador demo aislado", () => {
  const previousHost = process.env.FIRESTORE_EMULATOR_HOST;
  const previousProject = process.env.GCLOUD_PROJECT;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  assert.throws(requireLocalEmulator, /local Firestore emulator/);
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.GCLOUD_PROJECT = "production-project";
  assert.throws(requireLocalEmulator, /isolated demo-/);
  if (previousHost === undefined) delete process.env.FIRESTORE_EMULATOR_HOST; else process.env.FIRESTORE_EMULATOR_HOST = previousHost;
  if (previousProject === undefined) delete process.env.GCLOUD_PROJECT; else process.env.GCLOUD_PROJECT = previousProject;
  const script = fs.readFileSync(path.resolve(__dirname, "../../src/scripts/inspectAccountIdentityMaterialization.js"), "utf8");
  assert.match(script, /--apply/);
  assert.match(script, /apply requires --manifest for resumable execution/);
  assert.match(script, /mode must be inspect or apply/);
  assert.doesNotMatch(script, /confirm-rollout|production/);
});

test("las colecciones de identidad rechazan acceso directo del cliente", () => {
  const rules = fs.readFileSync(path.resolve(__dirname, "../../../firestore.rules"), "utf8");
  for (const collection of ["accountIdentities", "personIdentityAssignments"]) {
    assert.match(rules, new RegExp(`match /${collection}/\\{[^}]+\\} \\{ allow read, write: if false; \\}`));
  }
});
