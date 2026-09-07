"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const contract = require("../../src/groupJoinRequests/application/groupJoinRequestContract");
const { groupJoinRequestHash, groupJoinRequestIntentId, pendingGroupJoinRequestGuardId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { decodeGroupJoinRequestCursor, encodeGroupJoinRequestCursor } = require("../../src/groupJoinRequests/application/groupJoinRequestCursor");
test("cinco payloads son planos, cerrados y aplican límites normativos", () => {
  assert.deepEqual(contract.validateGroupJoinRequestGroupPayload({ groupId: "g" }), { groupId: "g" });
  assert.deepEqual(contract.validateCreateGroupJoinRequestPayload({ groupId: "g", idempotencyKey: "1234567890abcdef" }), { groupId: "g", idempotencyKey: "1234567890abcdef" });
  assert.deepEqual(contract.validateCancelGroupJoinRequestPayload({ groupId: "g", requestId: "r" }), { groupId: "g", requestId: "r" });
  assert.deepEqual(contract.validateListGroupJoinRequestsPayload({ groupId: "g" }), { groupId: "g", pageSize: 20 });
  assert.deepEqual(contract.validateListGroupJoinRequestsPayload({ groupId: "g", pageSize: 1, cursor: "abc" }), { groupId: "g", pageSize: 1, cursor: "abc" });
  for (const bad of [null, [], { groupId: "g", userId: "u" }, { groupId: " g" }]) assert.throws(() => contract.validateGroupJoinRequestGroupPayload(bad), { reason: "VALIDATION_FAILED" });
  assert.throws(() => contract.validateListGroupJoinRequestsPayload({ groupId: "g", pageSize: 21 }), { reason: "VALIDATION_FAILED" });
});
test("intent usa sólo dominio, actor y clave; requestHash cubre Persona y Grupo", () => {
  const key = "1234567890abcdef";
  assert.equal(groupJoinRequestIntentId("u", key), "8678d93affbc33d8f63dab403e05aa61bd42cee953777f0a3176717d85365e91");
  assert.equal(groupJoinRequestIntentId("u", key), groupJoinRequestIntentId("u", key));
  assert.notEqual(groupJoinRequestIntentId("u", key), groupJoinRequestIntentId("v", key));
  assert.notEqual(groupJoinRequestHash("p", "g"), groupJoinRequestHash("p", "g2"));
  assert.notEqual(pendingGroupJoinRequestGuardId("g", "p"), pendingGroupJoinRequestGuardId("g", "p2"));
  assert.equal(JSON.stringify({ i: groupJoinRequestIntentId("u", key), r: groupJoinRequestHash("p", "g") }).includes(key), false);
});
test("cursor es canónico, group-scoped y conserva timestamp más requestId", () => {
  const cursor = encodeGroupJoinRequestCursor({ groupId: "g", seconds: 100, nanoseconds: 7, lastRequestId: "r" });
  assert.deepEqual(decodeGroupJoinRequestCursor(cursor, "g"), { seconds: 100, nanoseconds: 7, lastRequestId: "r" });
  assert.throws(() => decodeGroupJoinRequestCursor(cursor, "other"), { reason: "VALIDATION_FAILED" });
  assert.throws(() => decodeGroupJoinRequestCursor(`${cursor}a`, "g"), { reason: "VALIDATION_FAILED" });
});
