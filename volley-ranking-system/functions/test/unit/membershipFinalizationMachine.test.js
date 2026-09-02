"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

test("E2-05 máquina ejecutable cubre cancelación, single-flight, outcomes y retry", async () => {
  const { createMembershipFinalizationMachine } = await import("../../../../volley-ranking-frontend/src/components/memberships/membershipFinalizationMachine.mjs");
  const machine = createMembershipFinalizationMachine();
  assert.equal(machine.openConfirmation().state, "confirmation");
  assert.equal(machine.cancel().state, "active");
  machine.openConfirmation();
  assert.equal(machine.begin(), true);
  assert.equal(machine.begin(), false);
  assert.equal(machine.confirm("FINALIZED").state, "finalized");
  machine.restoreActive(); machine.openConfirmation(); machine.begin();
  assert.equal(machine.fail("CONFLICT").state, "recoverable");
  machine.restoreActive(); machine.openConfirmation(); machine.begin();
  assert.equal(machine.confirm("ALREADY_FINALIZED").state, "already-finalized");
  machine.restoreActive(); machine.openConfirmation(); machine.begin();
  assert.equal(machine.fail("MEMBERSHIP_REACTIVATION_REQUIRED").state, "reactivation-required");
});
