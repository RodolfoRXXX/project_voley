"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  validateListSeasonsForOwnedGroupPayload,
} = require("../../src/groups/application/seasonContract");
const {
  canonicalJson,
  decodeSeasonHistoryCursor,
  encodeSeasonHistoryCursor,
  subjectHash,
} = require("../../src/groups/application/seasonHistoryCursor");
const { createSeasonService } = require("../../src/groups/application/seasonService");
const {
  SeasonAccountRequiredError,
  SeasonCursorInvalidError,
  SeasonCursorStaleError,
  SeasonDependencyNotConfiguredError,
  SeasonDependencyUnavailableError,
  SeasonGroupNotAccessibleError,
  SeasonIncompatibleStateError,
  SeasonInternalError,
  SeasonValidationError,
} = require("../../src/groups/application/seasonErrors");
const {
  createFirestoreSeasonHistoryReader,
  isMissingIndexError,
} = require("../../src/groups/infrastructure/firestoreSeasonHistoryReader");
const { toSeasonHttpsError } = require("../../src/groups/infrastructure/seasonCallable");

const timestamp = (iso) => ({ toDate: () => new Date(iso) });
const createdAt = timestamp("2026-01-01T00:00:00.000Z");
const closedAt = timestamp("2026-02-01T00:00:00.000Z");
function open(id = "season-open", overrides = {}) {
  return { seasonId: id, groupId: "group-1", nombre: "Actual", fechaInicio: "2026-01-01", estado: "abierta", createdAt, schemaVersion: 1, ...overrides };
}
function closed(id, date = "2025-01-01", overrides = {}) {
  return { seasonId: id, groupId: "group-1", nombre: id, fechaInicio: date, estado: "cerrada", createdAt, closedAt, closedBy: "owner-1", schemaVersion: 2, ...overrides };
}

test("E2-16 acepta sólo payload cerrado, default 20 y enteros 1..20", () => {
  assert.deepEqual(validateListSeasonsForOwnedGroupPayload({ groupId: "group-1" }), { groupId: "group-1", pageSize: 20 });
  assert.deepEqual(validateListSeasonsForOwnedGroupPayload({ groupId: "group-1", pageSize: 1, cursor: "abc" }), { groupId: "group-1", pageSize: 1, cursor: "abc" });
  for (const pageSize of [0, 21, 1.5, "20", null]) assert.throws(() => validateListSeasonsForOwnedGroupPayload({ groupId: "group-1", pageSize }), SeasonValidationError);
  for (const key of ["uid", "ownerId", "roles", "persona", "estado", "filter", "order", "direction", "offset", "reference"]) {
    assert.throws(() => validateListSeasonsForOwnedGroupPayload({ groupId: "group-1", [key]: "x" }), SeasonValidationError);
  }
  for (const cursor of ["", 1, "a".repeat(2049)]) assert.throws(() => validateListSeasonsForOwnedGroupPayload({ groupId: "group-1", cursor }), SeasonCursorInvalidError);
});

test("cursor E2-16 es JSON UTF-8 canónico base64url, cerrado y contextual", () => {
  const input = { groupId: "group-1", userId: "owner-1", currentSeasonId: "season-open", last: { fechaInicio: "2025-01-01", seasonId: "season-20" } };
  const token = encodeSeasonHistoryCursor(input);
  assert.match(token, /^[A-Za-z0-9_-]+$/); assert.doesNotMatch(token, /=/);
  const raw = Buffer.from(token, "base64url").toString("utf8"); const payload = JSON.parse(raw);
  assert.equal(raw, canonicalJson(payload)); assert.equal(raw.includes("owner-1"), false);
  assert.deepEqual(Object.keys(payload).sort(), ["contract", "currentSeasonId", "groupId", "last", "subjectHash", "v"]);
  assert.equal(payload.subjectHash, subjectHash("owner-1"));
  assert.deepEqual(decodeSeasonHistoryCursor(token, { groupId: "group-1", userId: "owner-1" }), { currentSeasonId: "season-open", last: input.last });
  for (const context of [{ groupId: "group-2", userId: "owner-1" }, { groupId: "group-1", userId: "owner-2" }]) assert.throws(() => decodeSeasonHistoryCursor(token, context), SeasonCursorInvalidError);
  for (const invalid of ["=", "***", `${token}=`, "a".repeat(2049)]) assert.throws(() => decodeSeasonHistoryCursor(invalid, { groupId: "group-1", userId: "owner-1" }), SeasonCursorInvalidError);
  for (const mutation of [
    { ...payload, v: 2 }, { ...payload, contract: "other" }, { ...payload, extra: true },
    { ...payload, last: { ...payload.last, extra: true } }, { ...payload, last: { ...payload.last, fechaInicio: "2025-02-30" } },
  ]) {
    const manipulated = Buffer.from(canonicalJson(mutation), "utf8").toString("base64url");
    assert.throws(() => decodeSeasonHistoryCursor(manipulated, { groupId: "group-1", userId: "owner-1" }), SeasonCursorInvalidError);
  }
});

function serviceWith(reader, account = { userId: "owner-1", displayName: "Owner", accessEmail: "owner@example.invalid", accountPhotoUrl: null }) {
  return createSeasonService({
    selfAccountReader: { async getByUserId() { return account; } },
    seasonRepository: {}, openSeasonReader: {}, openSeasonGuard: {}, seasonHistoryReader: reader,
  });
}

test("servicio compone DTO mínimo y cursor sobre la última fila entregada", async () => {
  let captured;
  const service = serviceWith({ async listPage(input) {
    captured = input;
    return { currentSeason: open(), closedSeasons: [closed("season-01"), closed("season-20", "2024-01-01")], hasMore: true, last: { fechaInicio: "2024-01-01", seasonId: "season-20" } };
  } });
  const page = await service.listSeasonsForOwnedGroup({ userId: "owner-1", roles: ["admin"] }, { groupId: "group-1", pageSize: 20 });
  assert.deepEqual(captured, { userId: "owner-1", groupId: "group-1", pageSize: 20, position: null });
  assert.deepEqual(page.currentSeason, { id: "season-open", nombre: "Actual", fechaInicio: "2026-01-01", estado: "abierta", isCurrent: true });
  assert.deepEqual(page.closedSeasons[0], { id: "season-01", nombre: "season-01", fechaInicio: "2025-01-01", estado: "cerrada", closedAt: "2026-02-01T00:00:00.000Z", isCurrent: false });
  assert.deepEqual(Object.keys(page).sort(), ["closedSeasons", "currentSeason", "hasMore", "nextCursor"]);
  assert.equal(decodeSeasonHistoryCursor(page.nextCursor, { groupId: "group-1", userId: "owner-1" }).last.seasonId, "season-20");
});

test("servicio exige Auth/Cuenta, no usa Persona y conserva errores cerrados", async () => {
  const reader = { async listPage() { return { currentSeason: null, closedSeasons: [], hasMore: false, last: null }; } };
  await assert.rejects(() => serviceWith(reader).listSeasonsForOwnedGroup(null, { groupId: "group-1", pageSize: 20 }), { reason: "UNAUTHENTICATED" });
  await assert.rejects(() => serviceWith(reader, null).listSeasonsForOwnedGroup({ userId: "owner-1" }, { groupId: "group-1", pageSize: 20 }), SeasonAccountRequiredError);
  assert.deepEqual(await serviceWith(reader, { userId: "owner-1", displayName: "Owner", accessEmail: "owner@example.invalid", accountPhotoUrl: null, personaId: null }).listSeasonsForOwnedGroup({ userId: "owner-1" }, { groupId: "group-1", pageSize: 20 }), { currentSeason: null, closedSeasons: [], nextCursor: null, hasMore: false });
  await assert.rejects(() => serviceWith(reader, { userId: "owner-1" }).listSeasonsForOwnedGroup({ userId: "owner-1" }, { groupId: "group-1", pageSize: 20 }), SeasonAccountRequiredError);
});

class Query {
  constructor(collection) { this.collection = collection; this.filters = []; this.orders = []; this.limitValue = null; this.after = null; }
  where(...args) { this.filters.push(args); return this; }
  orderBy(...args) { this.orders.push(args); return this; }
  startAfter(...args) { this.after = args; return this; }
  limit(value) { this.limitValue = value; return this; }
  doc(id) { return { kind: "doc", collection: this.collection, id }; }
}
function snapshot(id, data, exists = true) { return { id, exists, data: () => data }; }
function querySnapshot(documents) { return { docs: documents, size: documents.length, empty: documents.length === 0 }; }
function persisted(season) { const { seasonId, ...data } = season; return { seasonId, data }; }
function readerFixture({ ownerId = "owner-1", opens = [], rows = [], anchor, queryError } = {}) {
  const seen = [];
  const db = {
    collection(name) { return new Query(name); },
    async runTransaction(operation) {
      return operation({ async get(target) {
        seen.push(target);
        if (target.kind === "doc" && target.collection === "groups") return snapshot(target.id, { ownerId });
        if (target.kind === "doc" && target.collection === "seasons") return anchor || snapshot(target.id, null, false);
        const state = target.filters.find((entry) => entry[0] === "estado")?.[2];
        if (state === "abierta") return querySnapshot(opens.map((season) => { const value = persisted(season); return snapshot(value.seasonId, value.data); }));
        if (queryError) throw queryError;
        return querySnapshot(rows.map((season) => { const value = persisted(season); return snapshot(value.seasonId, value.data); }));
      } });
    },
  };
  const groupRepository = { reference(id) { return { kind: "doc", collection: "groups", id }; }, fromSnapshot(value) { return value.data(); } };
  return { reader: createFirestoreSeasonHistoryReader({ db, groupRepository }), seen };
}

test("reader reautoriza, consulta abierta limit(2), ordena cerradas y valida lookahead", async () => {
  const rows = Array.from({ length: 21 }, (_, index) => closed(`season-${String(21 - index).padStart(2, "0")}`, "2025-01-01"));
  const fixture = readerFixture({ opens: [open()], rows });
  const page = await fixture.reader.listPage({ userId: "owner-1", groupId: "group-1", pageSize: 20, position: null });
  assert.equal(page.currentSeason.seasonId, "season-open"); assert.equal(page.closedSeasons.length, 20); assert.equal(page.hasMore, true); assert.equal(page.last.seasonId, "season-02");
  const openQuery = fixture.seen.find((item) => item.filters?.some((entry) => entry[2] === "abierta"));
  const closedQuery = fixture.seen.find((item) => item.filters?.some((entry) => entry[2] === "cerrada"));
  assert.equal(openQuery.limitValue, 2); assert.equal(closedQuery.limitValue, 21); assert.equal(closedQuery.orders.length, 2); assert.equal(closedQuery.after, null);
  await assert.rejects(() => readerFixture({ ownerId: "other" }).reader.listPage({ userId: "owner-1", groupId: "group-1", pageSize: 20, position: null }), SeasonGroupNotAccessibleError);
  await assert.rejects(() => readerFixture({ opens: [open("a"), open("b")] }).reader.listPage({ userId: "owner-1", groupId: "group-1", pageSize: 20, position: null }), SeasonIncompatibleStateError);
});

test("reader falla cerrado ante schemas, campos, fechas y timestamps incompatibles", async () => {
  const input = { userId: "owner-1", groupId: "group-1", pageSize: 20, position: null };
  const incompatiblePages = [
    { opens: [open("open-v2", { schemaVersion: 2 })] },
    { opens: [open("open-extra", { unexpected: true })] },
    { opens: [open("open-date", { fechaInicio: "2026-02-30" })] },
    { opens: [open("open-timestamp", { createdAt: timestamp("invalid") })] },
    { rows: [closed("closed-v1", "2025-01-01", { schemaVersion: 1 })] },
    { rows: [closed("closed-extra", "2025-01-01", { unexpected: true })] },
    { rows: [closed("closed-date", "2025-02-30")] },
    { rows: [closed("closed-timestamp", "2025-01-01", { closedAt: timestamp("invalid") })] },
  ];
  for (const page of incompatiblePages) {
    await assert.rejects(() => readerFixture(page).reader.listPage(input), SeasonIncompatibleStateError);
  }

  const validRows = Array.from({ length: 20 }, (_, index) => closed(`valid-${index}`));
  await assert.rejects(
    () => readerFixture({ rows: [...validRows, closed("invalid-lookahead", "2025-01-01", { schemaVersion: 1 })] }).reader.listPage(input),
    SeasonIncompatibleStateError
  );
});

test("continuación relee ancla/actual y marca obsolescencia", async () => {
  const position = { currentSeasonId: "season-open", last: { fechaInicio: "2025-01-01", seasonId: "anchor" } };
  const validAnchor = snapshot("anchor", (() => { const value = closed("anchor"); delete value.seasonId; return value; })());
  const fixture = readerFixture({ opens: [open()], rows: [], anchor: validAnchor });
  await fixture.reader.listPage({ userId: "owner-1", groupId: "group-1", pageSize: 20, position });
  const query = fixture.seen.find((item) => item.after); assert.deepEqual(query.after, ["2025-01-01", "anchor"]);
  await assert.rejects(() => readerFixture({ opens: [open("new-open")], anchor: validAnchor }).reader.listPage({ userId: "owner-1", groupId: "group-1", pageSize: 20, position }), SeasonCursorStaleError);
  await assert.rejects(() => readerFixture({ opens: [open()] }).reader.listPage({ userId: "owner-1", groupId: "group-1", pageSize: 20, position }), SeasonCursorStaleError);
});

test("clasificación de índice faltante es estricta", () => {
  assert.equal(isMissingIndexError({ code: 9, message: "The query requires an index. You can create it here:" }), true);
  assert.equal(isMissingIndexError({ code: 9, message: "another precondition" }), false);
  assert.equal(isMissingIndexError({ code: 14, message: "The query requires an index" }), false);
});

test("adapter publica índice, indisponibilidad y fallos internos con códigos estables", async () => {
  const input = { userId: "owner-1", groupId: "group-1", pageSize: 20, position: null };
  const missing = { code: 9, message: "The query requires an index. You can create it here:" };
  await assert.rejects(() => readerFixture({ queryError: missing }).reader.listPage(input), SeasonDependencyNotConfiguredError);
  await assert.rejects(() => readerFixture({ queryError: { code: 14 } }).reader.listPage(input), SeasonDependencyUnavailableError);
  await assert.rejects(() => readerFixture({ queryError: new Error("private infrastructure detail") }).reader.listPage(input), SeasonInternalError);
  assert.equal(toSeasonHttpsError(new SeasonCursorInvalidError()).code, "invalid-argument");
  assert.equal(toSeasonHttpsError(new SeasonCursorStaleError()).code, "aborted");
  assert.equal(toSeasonHttpsError(new SeasonGroupNotAccessibleError()).code, "permission-denied");
});
