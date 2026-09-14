"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

test("E2-10 máquina conserva clave en retry, bloquea doble envío y rota sólo por decisión nueva", async () => {
  const { createMembershipSelfExitMachine } = await import("../../../../volley-ranking-frontend/src/components/memberships/membershipSelfExitMachine.mjs");
  let sequence = 0;
  const machine = createMembershipSelfExitMachine();
  const target = { groupId: "group-1", membershipId: "membership-1", groupName: "Grupo", viewerIsOwner: false };
  const opened = machine.open(target, () => `key-${++sequence}`);
  assert.equal(opened.state, "confirmation");
  assert.equal(machine.begin().idempotencyKey, "key-1");
  assert.equal(machine.begin(), null);
  assert.equal(machine.fail("DEPENDENCY_UNAVAILABLE").state, "recoverable");
  assert.equal(machine.begin().idempotencyKey, "key-1");
  assert.equal(machine.confirm().state, "confirmed");
  assert.equal(machine.open(target, () => `key-${++sequence}`).idempotencyKey, "key-2");
});

test("E2-10 cancelación y Temporada cerrada descartan la clave", async () => {
  const { createMembershipSelfExitMachine } = await import("../../../../volley-ranking-frontend/src/components/memberships/membershipSelfExitMachine.mjs");
  const machine = createMembershipSelfExitMachine();
  const target = { groupId: "group-1", membershipId: "membership-1", groupName: "Grupo", viewerIsOwner: true };
  machine.open(target, () => "key-1");
  assert.equal(machine.cancel().idempotencyKey, null);
  machine.open(target, () => "key-2"); machine.begin();
  const closed = machine.fail("MEMBERSHIP_SEASON_NOT_MODIFIABLE");
  assert.equal(closed.state, "season-closed");
  assert.equal(closed.idempotencyKey, null);
});
