"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");

const moduleUrl = pathToFileURL(path.resolve(
  __dirname,
  "../../../../volley-ranking-frontend/src/components/memberships/membershipIntent.mjs"
)).href;

test("timeout y CONFLICT conservan la clave de la misma intención", async () => {
  const { createMembershipIntent } = await import(moduleUrl);
  let sequence = 0;
  const intent = createMembershipIntent("group-a", () => `key-${++sequence}`);
  const first = intent.keyForExplicitAttempt();
  intent.recordFailure("TIMEOUT");
  assert.equal(intent.keyForExplicitAttempt(), first);
  intent.recordFailure("CONFLICT");
  assert.equal(intent.keyForExplicitAttempt(), first);
  assert.equal(sequence, 1);
});

test("IDEMPOTENCY_CONFLICT exige reconsulta, ausencia y nueva intención explícita", async () => {
  const { createMembershipIntent } = await import(moduleUrl);
  let sequence = 0;
  const intent = createMembershipIntent("group-a", () => `key-${++sequence}`);
  const incompatible = intent.keyForExplicitAttempt();
  intent.recordFailure("IDEMPOTENCY_CONFLICT");
  assert.throws(() => intent.keyForExplicitAttempt(), /explicit new intent/);
  assert.throws(() => intent.beginNewIntent(), /absence confirmation/);
  assert.equal(intent.snapshot().key, incompatible);
  intent.confirmMembershipAbsent();
  const replacement = intent.beginNewIntent();
  assert.notEqual(replacement, incompatible);
  assert.equal(intent.keyForExplicitAttempt(), replacement);
  assert.equal(sequence, 2);
});

test("cambiar groupId invalida la intención anterior sin crear otra implícitamente", async () => {
  const { createMembershipIntent } = await import(moduleUrl);
  let sequence = 0;
  const intent = createMembershipIntent("group-a", () => `key-${++sequence}`);
  const previous = intent.keyForExplicitAttempt();
  intent.setGroupId("group-b");
  assert.deepEqual(intent.snapshot(), {
    groupId: "group-b", key: null, conflict: false, confirmedAbsent: false,
  });
  assert.equal(sequence, 1);
  assert.notEqual(intent.keyForExplicitAttempt(), previous);
  assert.equal(sequence, 2);
});
