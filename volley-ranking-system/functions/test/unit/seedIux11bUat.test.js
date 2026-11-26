"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { explicitProject, requireLocal, requireLoopbackEmulator } = require("../../src/scripts/seedIux11bUat");

const localEnvironment = Object.freeze({
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
});

test("IUX-11B UAT seed exige un proyecto demo explícito", () => {
  assert.equal(explicitProject(["--project", "demo-sportexa-iux11b-copy"]), "demo-sportexa-iux11b-copy");
  assert.throws(() => explicitProject([]), /Usage/);
  assert.throws(() => explicitProject(["--project", "sportexa-production"]), /Usage/);
  assert.throws(() => explicitProject(["--project", "demo-safe", "--apply"]), /Usage/);
});

test("IUX-11B UAT seed acepta sólo emuladores loopback con puerto", () => {
  for (const host of ["localhost:8080", "127.0.0.1:8080", "[::1]:8080"]) assert.doesNotThrow(() => requireLoopbackEmulator(host, "HOST"));
  for (const host of ["firestore.googleapis.com:443", "10.0.0.8:8080", "https://localhost:8080", "localhost", "user@localhost:8080"]) assert.throws(() => requireLoopbackEmulator(host, "HOST"), /loopback|localhost/);
});

test("IUX-11B UAT seed rechaza proyectos configurados distintos", () => {
  assert.equal(requireLocal(["--project", "demo-sportexa-iux11b-copy"], { ...localEnvironment }), "demo-sportexa-iux11b-copy");
  assert.throws(() => requireLocal(["--project", "demo-sportexa-iux11b-copy"], { ...localEnvironment, GCLOUD_PROJECT: "demo-other" }), /does not match/);
  assert.throws(() => requireLocal(["--project", "demo-sportexa-iux11b-copy"], { ...localEnvironment, FIREBASE_CONFIG: JSON.stringify({ projectId: "real-project" }) }), /does not match/);
  assert.throws(() => requireLocal(["--project", "demo-sportexa-iux11b-copy"], { ...localEnvironment, FIRESTORE_EMULATOR_HOST: "firestore.googleapis.com:443" }), /localhost/);
});
