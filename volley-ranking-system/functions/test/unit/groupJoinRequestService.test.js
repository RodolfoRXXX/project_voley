"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { createGroupJoinRequestService } = require("../../src/groupJoinRequests/application/groupJoinRequestService");
class Time { constructor(ms) { this.ms = ms; } toDate() { return new Date(this.ms); } }
const pending = { requestId: "r", personId: "p", groupId: "g", estado: "pendiente", createdAt: new Time(0), schemaVersion: 1 };
function service(overrides = {}) {
  const calls = [];
  const store = { preview: async (input) => { calls.push(["preview", input]); return { id: "g", nombre: "Grupo", deporte: "voleibol" }; }, create: async (input) => { calls.push(["create", input]); return { outcome: "CREATED_PENDING", request: pending }; }, getCurrent: async (input) => { calls.push(["get", input]); return pending; }, cancel: async (input) => { calls.push(["cancel", input]); return { outcome: "CANCELLED", request: { ...pending, estado: "cancelada", cancelledAt: new Time(1) } }; }, listOwned: async (input) => { calls.push(["list", input]); return { composed: [{ request: pending, person: { firstName: "Ana", lastName: "Pérez" } }], nextCursor: null }; }, ...overrides.store };
  return { calls, api: createGroupJoinRequestService({ accountCapability: overrides.account || { getContext: async () => ({ status: "found" }) }, personCapability: overrides.person || { getOwnContext: async () => ({ status: "found", personId: "p" }) }, store }) };
}
test("servicio deriva UID y Persona y produce DTOs mínimos", async () => {
  const { api, calls } = service();
  assert.deepEqual(await api.getKnownGroupJoinPreview({ userId: "u" }, { groupId: "g" }), { group: { id: "g", nombre: "Grupo", deporte: "voleibol" } });
  assert.deepEqual((await api.createMyGroupJoinRequest({ userId: "u" }, { groupId: "g", idempotencyKey: "secret" })).request, { id: "r", groupId: "g", estado: "pendiente", createdAt: "1970-01-01T00:00:00.000Z" });
  const owner = await api.listPendingGroupJoinRequestsForOwnedGroup({ userId: "owner" }, { groupId: "g", pageSize: 20 });
  assert.deepEqual(owner, { items: [{ id: "r", estado: "pendiente", createdAt: "1970-01-01T00:00:00.000Z", person: { firstName: "Ana", lastName: "Pérez" } }], nextCursor: null });
  assert.equal(JSON.stringify(owner).includes("personId"), false); assert.equal(JSON.stringify(owner).includes("hidden"), false);
  assert.equal(calls[0][1].userId, "u"); assert.equal(calls[0][1].personId, "p");
});
test("Owner listado no requiere Persona y roles nunca participan", async () => {
  const { api, calls } = service({ person: { getOwnContext: async () => { throw new Error("must not run"); } } });
  await api.listPendingGroupJoinRequestsForOwnedGroup({ userId: "owner", roles: "admin" }, { groupId: "g", pageSize: 20 });
  assert.equal(calls[0][0], "list"); assert.equal(Object.hasOwn(calls[0][1], "roles"), false);
});
test("autenticación, Cuenta y Persona fallan con reasons estables", async () => {
  await assert.rejects(() => service().api.getMyCurrentGroupJoinRequest(null, { groupId: "g" }), { reason: "UNAUTHENTICATED" });
  await assert.rejects(() => service({ account: { getContext: async () => ({ status: "missing" }) } }).api.getMyCurrentGroupJoinRequest({ userId: "u" }, { groupId: "g" }), { reason: "ACCOUNT_REQUIRED" });
  await assert.rejects(() => service({ person: { getOwnContext: async () => ({ status: "missing" }) } }).api.getMyCurrentGroupJoinRequest({ userId: "u" }, { groupId: "g" }), { reason: "PERSON_REQUIRED" });
});
test("propaga el observador técnico sin incorporarlo al DTO", async () => {
  const observations = [];
  const { api, calls } = service();
  const result = await api.createMyGroupJoinRequest({ userId: "u" }, { groupId: "g", idempotencyKey: "secret" }, (value) => observations.push(value));
  assert.equal(typeof calls[0][1].observe, "function");
  calls[0][1].observe({ stage: "intent-confirmed", classification: "retry" });
  assert.deepEqual(observations, [{ stage: "intent-confirmed", classification: "retry" }]);
  assert.equal(Object.hasOwn(result, "observe"), false);
});
