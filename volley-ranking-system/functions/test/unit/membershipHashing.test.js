"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { activeMembershipGuardId, hashGroupJoinRequestActivationIdempotency, hashGroupJoinRequestReactivationRequest, hashMembershipIdempotencyKey, hashMembershipRequest, membershipLifecycleGuardId, membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");

function reference(parts) {
  const hash = crypto.createHash("sha256");
  for (const part of parts) {
    const value = String(part);
    hash.update(`${Buffer.byteLength(value)}:${value}`, "utf8");
  }
  return hash.digest("hex");
}

test("ID y hashes usan dominios y length-prefix exactos", () => {
  assert.equal(activeMembershipGuardId("group-1", "person-1"), reference(["sportexa:E2-03:active-membership-guard:v1", "group-1", "person-1"]));
  assert.equal(membershipLifecycleGuardId("group-1", "person-1"), reference(["sportexa:E2-05:membership-lifecycle-guard:v1", "group-1", "person-1"]));
  assert.equal(hashMembershipIdempotencyKey("uid", "group-1", "person-1", "raw-key"), reference(["sportexa:E2-03:idempotency:v1", "uid", "group-1", "person-1", "raw-key"]));
  assert.equal(hashMembershipRequest("uid", "person-1", "group-1", "season-1"), reference(["sportexa:E2-03:request:v1", "contract-v1", "uid", "person-1", "group-1", "season-1"]));
});

test("E2-09 deriva períodos y hashes internos con ordinal decimal canónico", () => {
  assert.equal(membershipValidityPeriodId("membership-1", 2), reference(["sportexa:E2-09:membership-validity-period:v1", "membership-1", "2"]));
  assert.equal(hashGroupJoinRequestActivationIdempotency("intent-1", "membership-1", 2), reference(["sportexa:E2-09:membership-activation-idempotency:v1", "intent-1", "membership-1", "2"]));
  assert.equal(hashGroupJoinRequestReactivationRequest("request-1", "person-1", "group-1", "season-1", "membership-1", 2), reference(["sportexa:E2-09:membership-reactivation-request:v1", "request-1", "person-1", "group-1", "season-1", "membership-1", "2"]));
  assert.throws(() => membershipValidityPeriodId("membership-1", 0));
});

test("contextos distintos producen valores distintos y nunca contienen la clave cruda", () => {
  const value = hashMembershipIdempotencyKey("uid", "group-1", "person-1", "secret-key-123456");
  assert.match(value, /^[a-f0-9]{64}$/);
  assert.equal(value.includes("secret-key"), false);
  assert.notEqual(value, hashMembershipIdempotencyKey("uid", "group-2", "person-1", "secret-key-123456"));
});
