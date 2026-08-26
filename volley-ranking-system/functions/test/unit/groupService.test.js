"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createGroupService } = require("../../src/groups/application/groupService");
const {
  GroupAccountRequiredError,
  GroupDependencyUnavailableError,
  GroupLimitReachedError,
  GroupNotAuthorizedError,
  GroupNotFoundError,
  GroupUnauthenticatedError,
} = require("../../src/groups/application/groupErrors");

const timestamp = { toDate: () => new Date("2026-08-26T12:00:00.000Z") };
function persisted(overrides = {}) {
  return { groupId: "opaque-generated", nombre: "Grupo", deporte: "voleibol", ownerId: "uid", estado: "activo", schemaVersion: 1, createdAt: timestamp, ...overrides };
}
function setup(overrides = {}) {
  const calls = [];
  const dependencies = {
    selfAccountReader: { async getByUserId(userId) { calls.push("account"); return { userId, roles: "admin" }; } },
    groupRepository: { newId() { calls.push("newId"); return "opaque-generated"; }, async getById(id) { calls.push(`get:${id}`); return persisted({ groupId: id }); } },
    ownGroupsReader: { async listByOwner() { calls.push("list"); return [persisted()]; } },
    creationGuard: { async confirmFirstGroup(input) { calls.push("guard"); return { outcome: "created", groupId: input.group.groupId }; } },
    ...overrides,
  };
  return { service: createGroupService(dependencies), calls, dependencies };
}

test("creación coordina cuenta antes de Grupo/guard, ignora rol y no consulta Persona", async () => {
  const { service, calls } = setup();
  const result = await service.createOwnGroup({ userId: "uid" }, { nombre: " Grupo ", deporte: "voleibol", idempotencyKey: "12345678-1234-1234-1234-123456789abc" });
  assert.deepEqual(calls, ["account", "newId", "guard", "get:opaque-generated"]);
  assert.equal(result.outcome, "created");
  assert.equal(result.group.ownerUserId, "uid");
});

test("Usuario sin Persona crea y el reintento existing devuelve estado persistido", async () => {
  const expected = persisted({ nombre: "Persistido" });
  const { service } = setup({
    selfAccountReader: { async getByUserId(userId) { return { userId, personaId: undefined }; } },
    creationGuard: { async confirmFirstGroup() { return { outcome: "existing", groupId: expected.groupId, group: expected }; } },
  });
  const result = await service.createOwnGroup({ userId: "uid" }, { nombre: "Nuevo", deporte: "voleibol", idempotencyKey: "12345678-1234-1234-1234-123456789abc" });
  assert.equal(result.outcome, "existing");
  assert.equal(result.group.nombre, "Persistido");
});

test("autenticación, cuenta y dependencias fallan cerrado", async () => {
  const { service } = setup();
  await assert.rejects(service.listOwnGroups(null), GroupUnauthenticatedError);
  const absent = setup({ selfAccountReader: { async getByUserId() { return null; } } }).service;
  await assert.rejects(absent.listOwnGroups({ userId: "uid" }), GroupAccountRequiredError);
  const inconsistent = setup({ selfAccountReader: { async getByUserId() { return { userId: "other" }; } } }).service;
  await assert.rejects(inconsistent.listOwnGroups({ userId: "uid" }), GroupDependencyUnavailableError);
});

test("consultas son owner-scoped y distinguen no encontrado/no autorizado", async () => {
  const owner = setup().service;
  assert.equal((await owner.getOwnGroup({ userId: "uid" }, "opaque")).group.id, "opaque");
  const missing = setup({ groupRepository: { newId() { return "id"; }, async getById() { return null; } } }).service;
  await assert.rejects(missing.getOwnGroup({ userId: "uid" }, "missing"), GroupNotFoundError);
  const foreign = setup({ groupRepository: { newId() { return "id"; }, async getById() { return persisted({ ownerId: "other" }); } } }).service;
  await assert.rejects(foreign.getOwnGroup({ userId: "uid" }, "foreign"), GroupNotAuthorizedError);
});

test("listado y dashboard producen envoltorios mínimos", async () => {
  const { service } = setup();
  const list = await service.listOwnGroups({ userId: "uid" });
  const dashboard = await service.getOwnGroupsDashboard({ userId: "uid" });
  assert.deepEqual(Object.keys(list), ["items"]);
  assert.deepEqual(dashboard, { items: [{ id: "opaque-generated", nombre: "Grupo", deporte: "voleibol", estado: "activo" }] });
});

test("límite y fallos del guard conservan errores estables", async () => {
  const limited = setup({ creationGuard: { async confirmFirstGroup() { throw new GroupLimitReachedError(); } } }).service;
  await assert.rejects(limited.createOwnGroup({ userId: "uid" }, { nombre: "Grupo", deporte: "voleibol", idempotencyKey: "12345678-1234-1234-1234-123456789abc" }), GroupLimitReachedError);
});
