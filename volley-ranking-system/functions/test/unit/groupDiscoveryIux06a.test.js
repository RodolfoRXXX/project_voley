"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const contract = require("../../src/groups/application/groupDiscoveryContract");
const { createGroupDiscoveryService } = require("../../src/groups/application/groupDiscoveryService");
const { decodeGroupDiscoveryCursor, encodeGroupDiscoveryCursor } = require("../../src/groups/application/groupDiscoveryCursor");
const { createGroupDiscoveryJoinRequestCapability } = require("../../src/groupJoinRequests/public/groupDiscoveryJoinRequestCapability");
const { pendingGroupJoinRequestGuardId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");

test("IUX-06A cierra payloads de publicación y exploración", () => {
  assert.deepEqual(contract.validateGetOwnGroupPublicationPayload({ groupId: "g" }), { groupId: "g" });
  assert.deepEqual(contract.validateSetOwnGroupPublicationPayload({ groupId: "g", published: true }), { groupId: "g", published: true });
  assert.deepEqual(contract.validateListExploreGroupsPayload({}), { pageSize: 12 });
  assert.throws(() => contract.validateSetOwnGroupPublicationPayload({ groupId: "g", published: "yes" }), { reason: "VALIDATION_FAILED" });
  assert.throws(() => contract.validateListExploreGroupsPayload({ userId: "foreign" }), { reason: "VALIDATION_FAILED" });
});

test("cursor de Explorar es opaco, verificable y estable", () => {
  const cursor = encodeGroupDiscoveryCursor({ seconds: 12, nanoseconds: 34, lastGroupId: "g" });
  assert.deepEqual(decodeGroupDiscoveryCursor(cursor), { seconds: 12, nanoseconds: 34, lastGroupId: "g" });
  assert.throws(() => decodeGroupDiscoveryCursor(`${cursor}a`), { reason: "VALIDATION_FAILED" });
});

test("Explorar deriva cuenta y Persona sin exponer identidad", async () => {
  const calls = [];
  const service = createGroupDiscoveryService({
    accountCapability: { getContext: async () => ({ status: "found" }) },
    personCapability: { getOwnContext: async () => ({ status: "missing" }) },
    store: {
      listExplorePage: async (input) => { calls.push(input); return { items: [{ id: "g", nombre: "Grupo", deporte: "otro", ownRequestStatus: "unavailable" }], nextCursor: null }; },
      getOwnState: async () => ({ publicationState: "invite_only", publishedAt: null }),
      setOwnState: async () => ({ outcome: "UPDATED", publicationState: "published", publishedAt: "2026-11-10T00:00:00.000Z" }),
    },
  });
  assert.deepEqual(await service.listExploreGroups({ userId: "u", roles: "admin" }, { pageSize: 12 }), {
    items: [{ id: "g", nombre: "Grupo", deporte: "otro", ownRequestStatus: "unavailable" }], nextCursor: null, viewer: { personStatus: "required" },
  });
  assert.deepEqual(calls[0], { userId: "u", personId: null, pageSize: 12 });
});

test("Explorar acredita la solicitud propia pendiente desde guard y solicitud canónicos", async () => {
  const groupId = "g"; const personId = "p"; const requestId = "r";
  const createdAt = { toDate: () => new Date("2026-11-10T12:00:00.000Z") };
  const guardId = pendingGroupJoinRequestGuardId(groupId, personId);
  const documents = new Map([
    [`pendingGroupJoinRequestGuards/${guardId}`, { requestId, personId, groupId, createdAt, guardVersion: 1 }],
    [`groupJoinRequests/${requestId}`, { personId, groupId, estado: "pendiente", createdAt, schemaVersion: 1 }],
  ]);
  const db = { collection: (collection) => ({ doc: (id) => ({ id, path: `${collection}/${id}` }) }) };
  const unitOfWork = { get: async (ref) => ({ id: ref.id, exists: documents.has(ref.path), data: () => documents.get(ref.path) }) };
  const capability = createGroupDiscoveryJoinRequestCapability({ db });
  assert.deepEqual(await capability.getOwnPendingContext({ unitOfWork, personId, groupId }), { status: "pending" });
  documents.delete(`pendingGroupJoinRequestGuards/${guardId}`);
  assert.deepEqual(await capability.getOwnPendingContext({ unitOfWork, personId, groupId }), { status: "absent" });
  documents.set(`pendingGroupJoinRequestGuards/${guardId}`, { requestId, personId, groupId: "foreign", createdAt, guardVersion: 1 });
  assert.deepEqual(await capability.getOwnPendingContext({ unitOfWork, personId, groupId }), { status: "incompatible" });
});
