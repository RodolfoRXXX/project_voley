"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { OPEN_SEASON_GUARD_FIELDS, createFirestoreOpenSeasonGuard, hydrateOpenSeasonGuard } = require("../../src/groups/infrastructure/firestoreOpenSeasonGuard");
const { hashSeasonIdempotencyKey, hashSeasonRequest } = require("../../src/groups/application/seasonHashing");
const { SeasonIncompatibleStateError } = require("../../src/groups/application/seasonErrors");

const timestamp = { toDate: () => new Date("2026-08-26T12:00:00.000Z") };
function snapshot(data, id = "group-1") { return { exists: true, id, data: () => data }; }

test("guard abierto acepta únicamente el esquema técnico exacto", () => {
  const data = { seasonId: "season-1", idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: timestamp, guardVersion: 1 };
  assert.deepEqual(Object.keys(hydrateOpenSeasonGuard(snapshot(data), "group-1")).sort(), [...OPEN_SEASON_GUARD_FIELDS].sort());
  for (const invalid of [
    { ...data, rawKey: "secret" },
    { ...data, seasonId: "" },
    { ...data, idempotencyKeyHash: "raw" },
    { ...data, requestHash: "x" },
    { ...data, createdAt: null },
    { ...data, guardVersion: 2 },
  ]) assert.throws(() => hydrateOpenSeasonGuard(snapshot(invalid), "group-1"), SeasonIncompatibleStateError);
  assert.throws(() => hydrateOpenSeasonGuard(snapshot(data, "other"), "group-1"), SeasonIncompatibleStateError);
});

test("hashes separan contexto por Grupo, contrato y payload normalizado", () => {
  const season = { groupId: "group-1", nombre: "Temporada", fechaInicio: "2026-01-01" };
  const idempotency = hashSeasonIdempotencyKey("group-1", "12345678-1234-1234-1234-123456789abc");
  assert.match(idempotency, /^[a-f0-9]{64}$/);
  assert.notEqual(idempotency, hashSeasonIdempotencyKey("group-2", "12345678-1234-1234-1234-123456789abc"));
  assert.notEqual(hashSeasonRequest(season), hashSeasonRequest({ ...season, fechaInicio: "2026-01-02" }));
});

test("conflictos agotados e indisponibilidad se traducen a errores estables", async () => {
  function guardFor(code) {
    return createFirestoreOpenSeasonGuard({
      db: {
        collection() { return { doc() { return {}; } }; },
        async runTransaction() { const error = new Error("internal detail"); error.code = code; throw error; },
      },
      groupRepository: {},
    });
  }
  const input = { userId: "uid", season: { groupId: "group-1" }, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), seasonRepository: {} };
  await assert.rejects(() => guardFor(10).confirmOpenSeason(input), { reason: "CONFLICT" });
  await assert.rejects(() => guardFor(14).confirmOpenSeason(input), { reason: "DEPENDENCY_UNAVAILABLE" });
});
