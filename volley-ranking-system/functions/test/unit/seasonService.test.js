"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createSeasonService } = require("../../src/groups/application/seasonService");
const {
  OpenSeasonAlreadyExistsError,
  SeasonAccountRequiredError,
  SeasonDependencyUnavailableError,
  SeasonNotAuthorizedError,
  SeasonUnauthenticatedError,
} = require("../../src/groups/application/seasonErrors");

const timestamp = { toDate: () => new Date("2026-08-26T12:00:00.000Z") };
function persisted(overrides = {}) {
  return { seasonId: "season-generated", groupId: "group-1", nombre: "Temporada", fechaInicio: "2026-01-01", estado: "abierta", schemaVersion: 1, createdAt: timestamp, ...overrides };
}
function setup(overrides = {}) {
  const calls = [];
  const dependencies = {
    selfAccountReader: { async getByUserId(userId) { calls.push("account"); return { userId, roles: "admin" }; } },
    seasonRepository: { newId() { calls.push("newId"); return "season-generated"; }, async getById(id) { calls.push(`get:${id}`); return persisted({ seasonId: id }); } },
    openSeasonReader: {
      async getOpenForOwner() { calls.push("context"); return null; },
      async getByIdForOwner({ seasonId }) { calls.push("byId"); return persisted({ seasonId }); },
    },
    openSeasonGuard: { async confirmOpenSeason(input) { calls.push("guard"); return { outcome: "CREATED_OPEN", seasonId: input.season.seasonId }; } },
    ...overrides,
  };
  return { service: createSeasonService(dependencies), calls };
}

const input = { groupId: "group-1", nombre: " Temporada ", fechaInicio: "2026-01-01", idempotencyKey: "12345678-1234-1234-1234-123456789abc" };

test("creación valida cuenta antes del Agregado y confirma DTO persistido", async () => {
  const { service, calls } = setup();
  const result = await service.createAndOpenSeason({ userId: "uid" }, input);
  assert.deepEqual(calls, ["account", "newId", "guard", "get:season-generated"]);
  assert.equal(result.outcome, "CREATED_OPEN");
  assert.equal(result.season.nombre, "Temporada");
  assert.equal(result.season.estado, "abierta");
});

test("retry idempotente usa la Temporada persistida provista por el guard", async () => {
  const expected = persisted({ nombre: "Confirmada" });
  const { service } = setup({
    selfAccountReader: { async getByUserId(userId) { return { userId }; } },
    openSeasonGuard: { async confirmOpenSeason() { return { outcome: "EXISTING_IDEMPOTENT", seasonId: expected.seasonId, season: expected }; } },
  });
  const result = await service.createAndOpenSeason({ userId: "uid" }, input);
  assert.equal(result.outcome, "EXISTING_IDEMPOTENT");
  assert.equal(result.season.nombre, "Confirmada");
});

test("ausencia de Persona y Membresías no participa del servicio", async () => {
  const { service } = setup({ selfAccountReader: { async getByUserId(userId) { return { userId, personaId: null }; } } });
  await assert.doesNotReject(() => service.createAndOpenSeason({ userId: "uid" }, input));
});

test("autenticación, cuenta y dependencia fallan cerrado", async () => {
  await assert.rejects(() => setup().service.getOpenSeasonContext(null, "group-1"), SeasonUnauthenticatedError);
  await assert.rejects(() => setup({ selfAccountReader: { async getByUserId() { return null; } } }).service.getOpenSeasonContext({ userId: "uid" }, "group-1"), SeasonAccountRequiredError);
  await assert.rejects(() => setup({ selfAccountReader: { async getByUserId() { throw new Error("down"); } } }).service.getOpenSeasonContext({ userId: "uid" }, "group-1"), SeasonDependencyUnavailableError);
});

test("consultas devuelven contexto vacío/concreto y conservan owner-access", async () => {
  const { service } = setup({
    openSeasonReader: {
      async getOpenForOwner() { return persisted(); },
      async getByIdForOwner({ userId }) { if (userId !== "uid") throw new SeasonNotAuthorizedError(); return persisted(); },
    },
  });
  assert.equal((await service.getOpenSeasonContext({ userId: "uid" }, "group-1")).openSeason.id, "season-generated");
  assert.equal((await service.getOwnSeason({ userId: "uid" }, { groupId: "group-1", seasonId: "season-generated" })).season.groupId, "group-1");
});

test("errores funcionales de guard se conservan y fallos desconocidos se sanitizan", async () => {
  await assert.rejects(() => setup({ openSeasonGuard: { async confirmOpenSeason() { throw new OpenSeasonAlreadyExistsError(); } } }).service.createAndOpenSeason({ userId: "uid" }, input), OpenSeasonAlreadyExistsError);
  await assert.rejects(() => setup({ openSeasonGuard: { async confirmOpenSeason() { throw new Error("token/raw-key/hash/stack"); } } }).service.createAndOpenSeason({ userId: "uid" }, input), { reason: "INTERNAL_ERROR", message: "Season operation failed" });
});
