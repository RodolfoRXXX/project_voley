"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { buildGroupJoinRequest, hydrateGroupJoinRequest, InvalidGroupJoinRequestStateError } = require("../../src/groupJoinRequests/domain/groupJoinRequest");
class Time { constructor(ms) { this.ms = ms; this.seconds = Math.floor(ms / 1000); this.nanoseconds = (ms % 1000) * 1e6; } toDate() { return new Date(this.ms); } }
test("Solicitud nace pendiente exacta y cancela sin mutar el Agregado original", () => {
  const createdAt = new Time(1000); const pending = buildGroupJoinRequest({ requestId: "r1", personId: "p1", groupId: "g1", createdAt });
  assert.deepEqual({ ...pending }, { requestId: "r1", personId: "p1", groupId: "g1", estado: "pendiente", createdAt, schemaVersion: 1 });
  const cancelled = pending.cancel(new Time(2000));
  assert.equal(pending.estado, "pendiente"); assert.equal(cancelled.estado, "cancelada"); assert.equal(cancelled.cancelledAt.toDate().getTime(), 2000);
  assert.throws(() => cancelled.cancel(new Time(3000)), InvalidGroupJoinRequestStateError);
});
test("hidratación exige ambas variantes cerradas, timestamps ordenados e IDs canónicos", () => {
  const createdAt = new Time(1000); const cancelledAt = new Time(2000);
  assert.equal(hydrateGroupJoinRequest("r1", { personId: "p1", groupId: "g1", estado: "pendiente", createdAt, schemaVersion: 1 }).estado, "pendiente");
  assert.equal(hydrateGroupJoinRequest("r2", { personId: "p1", groupId: "g1", estado: "cancelada", createdAt, cancelledAt, schemaVersion: 1 }).estado, "cancelada");
  for (const data of [
    { personId: "p1", groupId: "g1", estado: "pendiente", createdAt, schemaVersion: 1, seasonId: "s" },
    { personId: "p1", groupId: "g1", estado: "cancelada", createdAt, cancelledAt: new Time(0), schemaVersion: 1 },
    { personId: "p1", groupId: "g1", estado: "aprobada", createdAt, schemaVersion: 1 },
  ]) assert.throws(() => hydrateGroupJoinRequest("r", data), InvalidGroupJoinRequestStateError);
});
