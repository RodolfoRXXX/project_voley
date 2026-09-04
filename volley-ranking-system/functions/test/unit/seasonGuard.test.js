"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { OPEN_SEASON_GUARD_FIELDS, createFirestoreOpenSeasonGuard, hydrateOpenSeasonGuard } = require("../../src/groups/infrastructure/firestoreOpenSeasonGuard");
const { hashSeasonIdempotencyKey, hashSeasonRequest } = require("../../src/groups/application/seasonHashing");
const {
  OpenSeasonAlreadyExistsError,
  SeasonIncompatibleStateError,
} = require("../../src/groups/application/seasonErrors");

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

function absent(id = "group-1") { return { exists: false, id, data: () => undefined }; }

function code3Setup({
  transactionError = Object.assign(new Error("transaction boundary"), { code: 3 }),
  guardData,
  openSeasons,
  group = { groupId: "group-1", ownerId: "uid" },
  rereadError,
} = {}) {
  const season = {
    seasonId: "season-new",
    groupId: "group-1",
    nombre: "Temporada",
    fechaInicio: "2026-01-01",
    estado: "abierta",
    schemaVersion: 1,
  };
  const stored = Object.freeze({
    ...season,
    seasonId: "season-stored",
    createdAt: timestamp,
  });
  const keyHash = "a".repeat(64);
  const requestHash = "b".repeat(64);
  const effectiveGuard = guardData === undefined ? {
    seasonId: stored.seasonId,
    idempotencyKeyHash: keyHash,
    requestHash,
    createdAt: timestamp,
    guardVersion: 1,
  } : guardData;
  const effectiveSeasons = openSeasons === undefined ? [stored] : openSeasons;
  let authoritativeReads = 0;
  const guardRef = {
    async get() {
      authoritativeReads += 1;
      if (rereadError) throw rereadError;
      return effectiveGuard ? snapshot(effectiveGuard) : absent();
    },
  };
  const db = {
    collection(name) {
      if (name === "openSeasonGuards") return { doc() { return guardRef; } };
      assert.equal(name, "seasons");
      const query = {
        where() { return query; },
        limit(value) { assert.equal(value, 2); return query; },
        async get() {
          authoritativeReads += 1;
          return {
            size: effectiveSeasons.length,
            docs: effectiveSeasons.map((value) => snapshot(value, value.seasonId)),
          };
        },
      };
      return query;
    },
    async runTransaction() { throw transactionError; },
  };
  const groupRepository = {
    async getById() {
      authoritativeReads += 1;
      if (rereadError) throw rereadError;
      return group;
    },
  };
  const seasonRepository = {
    fromSnapshot(value) { return value.data(); },
  };
  const guard = createFirestoreOpenSeasonGuard({ db, groupRepository });
  return {
    stored,
    keyHash,
    requestHash,
    transactionError,
    get authoritativeReads() { return authoritativeReads; },
    confirm(overrides = {}) {
      return guard.confirmOpenSeason({
        userId: "uid",
        season,
        idempotencyKeyHash: keyHash,
        requestHash,
        seasonRepository,
        ...overrides,
      });
    },
  };
}

test("code 3 en el límite y respuesta perdida recuperan la misma intención confirmada", async () => {
  const setup = code3Setup();
  assert.deepEqual(await setup.confirm(), {
    outcome: "EXISTING_IDEMPOTENT",
    seasonId: setup.stored.seasonId,
    season: setup.stored,
  });
  assert.equal(setup.authoritativeReads, 3);
});

test("code 3 con otra intención íntegra devuelve OPEN_SEASON_ALREADY_EXISTS", async () => {
  const setup = code3Setup({ guardData: {
    seasonId: "season-stored",
    idempotencyKeyHash: "c".repeat(64),
    requestHash: "d".repeat(64),
    createdAt: timestamp,
    guardVersion: 1,
  } });
  await assert.rejects(() => setup.confirm(), OpenSeasonAlreadyExistsError);
  assert.equal(setup.authoritativeReads, 3);
});

test("code 3 conserva el error original ante ausencia, parcial, guard incorrecto o duplicados", async () => {
  const cases = [
    code3Setup({ guardData: null, openSeasons: [] }),
    code3Setup({ guardData: null }),
    code3Setup({ openSeasons: [] }),
    code3Setup({ guardData: {
      seasonId: "season-other",
      idempotencyKeyHash: "a".repeat(64),
      requestHash: "b".repeat(64),
      createdAt: timestamp,
      guardVersion: 1,
    } }),
    code3Setup({ openSeasons: [
      { seasonId: "season-stored", groupId: "group-1", estado: "abierta" },
      { seasonId: "season-duplicate", groupId: "group-1", estado: "abierta" },
    ] }),
    code3Setup({ group: null }),
  ];
  for (const setup of cases) {
    await assert.rejects(() => setup.confirm(), (error) => error === setup.transactionError);
  }
});

test("code 3 con la misma clave y hash de solicitud distinto conserva conflicto idempotente", async () => {
  const setup = code3Setup();
  await assert.rejects(() => setup.confirm({ requestHash: "c".repeat(64) }), { reason: "IDEMPOTENCY_CONFLICT" });
});

test("código distinto y fallo de otra operación no activan la relectura", async () => {
  for (const transactionError of [
    Object.assign(new Error("other code"), { code: 9 }),
    Object.assign(new Error("nested other operation"), { code: 13, cause: { code: 9 } }),
  ]) {
    const setup = code3Setup({ transactionError });
    await assert.rejects(() => setup.confirm(), (error) => error === transactionError);
    assert.equal(setup.authoritativeReads, 0);
  }
});

test("code 3 envuelto se reconoce sólo al salir de la transacción de apertura", async () => {
  const setup = code3Setup({ transactionError: Object.assign(new Error("wrapper"), { cause: { code: "3" } }) });
  assert.equal((await setup.confirm()).outcome, "EXISTING_IDEMPOTENT");
});

test("fallo de la relectura autoritativa nunca reemplaza el error transaccional", async () => {
  const setup = code3Setup({ rereadError: Object.assign(new Error("unavailable"), { code: 14 }) });
  await assert.rejects(() => setup.confirm(), (error) => error === setup.transactionError);
});
