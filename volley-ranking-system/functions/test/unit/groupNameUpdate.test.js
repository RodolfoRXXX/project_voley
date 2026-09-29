"use strict";

const assert = require("node:assert/strict"); const test = require("node:test");
const { hydrateGroup } = require("../../src/groups/domain/group");
const { createGroupService } = require("../../src/groups/application/groupService");
const { groupEditToken, groupNameUpdateReceiptId, hashGroupNameUpdateRequest } = require("../../src/groups/application/groupHashing");
const { GROUP_NAME_UPDATE_RECEIPT_FIELDS, hydrateGroupNameUpdateReceipt } = require("../../src/groups/infrastructure/groupNameUpdateReceipts");

const timestamp = { seconds: 1, nanoseconds: 0, toDate: () => new Date("2026-01-01T00:00:00.000Z") };
const group = (overrides = {}) => { const { groupId = "group-1", ...data } = overrides; return hydrateGroup(groupId, { nombre: "Grupo", deporte: "voleibol", ownerId: "user-1", estado: "activo", createdAt: timestamp, schemaVersion: 1, ...data }); };

test("token E2-20 liga exactamente groupId, ownerId y nombre normalizado", () => {
  const current = group(); const token = groupEditToken(current); assert.match(token, /^[a-f0-9]{64}$/); assert.equal(groupEditToken(current), token);
  assert.notEqual(groupEditToken(group({ groupId: "group-2" })), token); assert.notEqual(groupEditToken(group({ ownerId: "user-2" })), token); assert.notEqual(groupEditToken(group({ nombre: "Otro" })), token);
  for (const changed of [{ deporte: "otro" }, { estado: "otro" }, { schemaVersion: 2 }, { createdAt: { toDate: () => new Date() } }]) assert.equal(groupEditToken({ ...current, ...changed }), token);
  assert.equal(Object.hasOwn(current, "editToken"), false);
});

test("receipt ID y request hash ligan actor y los cuatro campos normalizados", () => {
  const command = { groupId: "group-1", nombre: "Nuevo", expectedEditToken: "a".repeat(64), idempotencyKey: "group-update-123456" };
  assert.notEqual(groupNameUpdateReceiptId("user-1", command.idempotencyKey), groupNameUpdateReceiptId("user-2", command.idempotencyKey));
  const hash = hashGroupNameUpdateRequest("user-1", command);
  for (const [actor, changed] of [["user-2", command], ["user-1", { ...command, groupId: "group-2" }], ["user-1", { ...command, nombre: "Otro" }], ["user-1", { ...command, expectedEditToken: "b".repeat(64) }], ["user-1", { ...command, idempotencyKey: "group-update-654321" }]]) assert.notEqual(hashGroupNameUpdateRequest(actor, changed), hash);
});

test("receipt v1 es cerrado y contiene appliedName sin tokens, clave ni snapshot", () => {
  const data = { action: "UPDATE_GROUP_NAME", actorUserId: "user-1", groupId: "group-1", requestHash: "a".repeat(64), appliedName: "Nuevo", outcome: "UPDATED", confirmedAt: timestamp, receiptVersion: 1 };
  const receipt = hydrateGroupNameUpdateReceipt({ exists: true, id: "receipt", data: () => data }, "receipt");
  assert.deepEqual(Object.keys(receipt).sort(), [...GROUP_NAME_UPDATE_RECEIPT_FIELDS].sort());
  for (const field of ["expectedEditToken", "resultEditToken", "idempotencyKey", "previousName", "snapshot", "deporte"]) assert.throws(() => hydrateGroupNameUpdateReceipt({ exists: true, id: "receipt", data: () => ({ ...data, [field]: "x" }) }, "receipt"));
  for (const appliedName of [" Nombre ", "", "x".repeat(81), "a\u0000b"]) assert.throws(() => hydrateGroupNameUpdateReceipt({ exists: true, id: "receipt", data: () => ({ ...data, appliedName }) }, "receipt"));
});

test("servicio emite token sólo en detalle y normaliza antes de derivar comando", async () => {
  let command; const current = group();
  const service = createGroupService({ selfAccountReader: { async getByUserId(userId) { return { userId }; } }, groupRepository: { newId() { return "unused"; }, async getById() { return current; } }, ownGroupsReader: { async listByOwner() { return [current]; } }, creationGuard: {}, groupNameUpdateStore: { async update(value) { command = value; return { outcome: "NO_CHANGES" }; } } });
  const own = await service.getOwnGroup({ userId: "user-1" }, "group-1"); assert.equal(own.editToken, groupEditToken(current));
  assert.equal(Object.hasOwn((await service.listOwnGroups({ userId: "user-1" })), "editToken"), false);
  await service.updateOwnGroupName({ userId: "user-1" }, { groupId: "group-1", nombre: " Nuevo  nombre ", expectedEditToken: "a".repeat(64), idempotencyKey: "group-update-123456" });
  assert.equal(command.nombre, "Nuevo nombre"); assert.match(command.receiptId, /^[a-f0-9]{64}$/); assert.match(command.requestHash, /^[a-f0-9]{64}$/);
  await assert.rejects(() => service.updateOwnGroupName({ userId: "user-1" }, { groupId: "group-1", nombre: "x".repeat(81), expectedEditToken: "a".repeat(64), idempotencyKey: "group-update-123456" }), { reason: "VALIDATION_FAILED" });
});
