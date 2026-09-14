"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { membershipSelfExitIntentId } = require("../../src/memberships/application/membershipHashing");
const { MembershipIncompatibleStateError } = require("../../src/memberships/application/membershipErrors");
const { INTENT_FIELDS, hydrateMembershipSelfExitIntent, toResult } = require("../../src/memberships/infrastructure/firestoreMembershipSelfExitStore");

const at = { toDate: () => new Date("2026-09-14T12:00:00.000Z") };
const userId = "user-1";
const key = "self-exit-key-0001";
const intentId = membershipSelfExitIntentId(userId, key);
const idempotencyKeyHash = "a".repeat(64);
const data = {
  userId,
  personId: "person-1",
  membershipId: "membership-1",
  groupId: "group-1",
  seasonId: "season-1",
  activationOrdinal: 2,
  idempotencyKeyHash,
  requestHash: "b".repeat(64),
  status: "confirmed",
  outcome: "EXIT_CONFIRMED",
  actorWasOwner: true,
  createdAt: at,
  finalizedAt: at,
  completedAt: at,
  intentVersion: 1,
};
const snapshot = (value = data, id = intentId) => ({ exists: true, id, data: () => value });

test("E2-10 intent durable usa schema exacto e inmutable", () => {
  const hydrated = hydrateMembershipSelfExitIntent(snapshot(), { intentId, userId, idempotencyKeyHash });
  assert.deepEqual(Object.keys(hydrated).sort(), [...INTENT_FIELDS].sort());
  assert.equal(Object.isFrozen(hydrated), true);
  assert.deepEqual(toResult(hydrated), {
    membershipId: "membership-1", groupId: "group-1", seasonId: "season-1",
    activationOrdinal: 2, endedAt: at, actorWasOwner: true,
  });
});

test("E2-10 intent falla cerrado ante schema, identidad, ordinal o timestamps inválidos", () => {
  for (const [value, id = intentId, hash = idempotencyKeyHash] of [
    [{ ...data, extra: true }],
    [{ ...data, status: "pending" }],
    [{ ...data, outcome: "OTHER" }],
    [{ ...data, activationOrdinal: 0 }],
    [{ ...data, completedAt: { toDate: () => new Date("2026-09-14T12:00:01.000Z") } }],
    [data, "other"],
    [data, intentId, "c".repeat(64)],
  ]) {
    assert.throws(() => hydrateMembershipSelfExitIntent(snapshot(value, id), { intentId, userId, idempotencyKeyHash: hash }), MembershipIncompatibleStateError);
  }
});
