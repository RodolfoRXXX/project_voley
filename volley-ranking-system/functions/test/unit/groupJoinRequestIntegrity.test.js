"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { pendingGroupJoinRequestGuardId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { hydrateGuard, hydrateIntent, resolvePending } = require("../../src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore");
class Time { constructor(ms) { this.ms = ms; } toDate() { return new Date(this.ms); } }
function snapshot(id, data) { return { id, exists: data !== undefined, data: () => data }; }
const time = new Time(1000);
const request = { requestId: "r", personId: "p", groupId: "g", estado: "pendiente", createdAt: time };
const repository = { fromSnapshot: () => request };
test("matriz autoritativa sólo admite cero/sin guard o una correlacionada", () => {
  const id = pendingGroupJoinRequestGuardId("g", "p");
  const guard = hydrateGuard(snapshot(id, { requestId: "r", personId: "p", groupId: "g", createdAt: time, guardVersion: 1 }), { guardId: id, personId: "p", groupId: "g" });
  assert.equal(resolvePending({ size: 0, empty: true, docs: [] }, null, { repository, personId: "p", groupId: "g" }), null);
  assert.equal(resolvePending({ size: 1, empty: false, docs: [{}] }, guard, { repository, personId: "p", groupId: "g" }), request);
  for (const [query, value] of [[{ size: 1, empty: false, docs: [{}] }, null], [{ size: 0, empty: true, docs: [] }, guard], [{ size: 2, empty: false, docs: [{}, {}] }, guard]]) assert.throws(() => resolvePending(query, value, { repository, personId: "p", groupId: "g" }), { reason: "INCOMPATIBLE_STATE" });
});
test("guard e intent exigen schemas exactos sin clave cruda ni hash redundante", () => {
  assert.throws(() => hydrateIntent(snapshot("i", { requestId: "r", personId: "p", groupId: "g", requestHash: "a".repeat(64), createdAt: time, intentVersion: 1, idempotencyKeyHash: "b".repeat(64) })), { reason: "INCOMPATIBLE_STATE" });
  assert.deepEqual(hydrateIntent(snapshot("i", { requestId: "r", personId: "p", groupId: "g", requestHash: "a".repeat(64), createdAt: time, intentVersion: 1 })), { requestId: "r", personId: "p", groupId: "g", requestHash: "a".repeat(64), createdAt: time, intentVersion: 1 });
});
