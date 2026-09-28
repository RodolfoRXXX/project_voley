"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { Timestamp } = require("firebase-admin/firestore");
const { validateListMyGroupMembershipHistoryPayload } = require("../../src/memberships/application/membershipContract");
const { MembershipCursorInvalidError, MembershipValidationError } = require("../../src/memberships/application/membershipErrors");
const {
  actorHash, canonicalJson, decodeOwnGroupMembershipHistoryCursor,
  encodeOwnGroupMembershipHistoryCursor, personHash,
} = require("../../src/memberships/application/ownGroupMembershipHistoryCursor");
const { toOwnGroupMembershipHistoryItem } = require("../../src/memberships/application/membershipDto");
const { createMembershipService } = require("../../src/memberships/application/membershipService");
const { membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");
const { createFirestoreOwnGroupMembershipHistoryReader, isMissingIndexError } = require("../../src/memberships/infrastructure/firestoreOwnGroupMembershipHistoryReader");

const t = (seconds, nanoseconds = 0) => new Timestamp(seconds, nanoseconds);
const createdAt = t(100);

test("E2-19 acepta sólo payload cerrado con default/máximo 20", () => {
  assert.deepEqual(validateListMyGroupMembershipHistoryPayload({}), { pageSize: 20 });
  assert.deepEqual(validateListMyGroupMembershipHistoryPayload({ pageSize: 1, cursor: "abc" }), { pageSize: 1, cursor: "abc" });
  for (const pageSize of [0, 21, 1.5, "20", null]) assert.throws(() => validateListMyGroupMembershipHistoryPayload({ pageSize }), MembershipValidationError);
  for (const key of ["personId", "uid", "estado", "order", "groupId", "seasonId", "reference", "offset"]) {
    assert.throws(() => validateListMyGroupMembershipHistoryPayload({ [key]: "x" }), MembershipValidationError);
  }
  for (const cursor of ["", 3, "a".repeat(2049)]) assert.throws(() => validateListMyGroupMembershipHistoryPayload({ cursor }), MembershipCursorInvalidError);
});

test("cursor E2-19 es canónico, contextual, cerrado y sin secretos/checksum", () => {
  const token = encodeOwnGroupMembershipHistoryCursor({ uid: "actor-1", personId: "person-1", lastFechaIngreso: t(123, 456), membershipId: "membership-1" });
  assert.match(token, /^[A-Za-z0-9_-]+$/); assert.doesNotMatch(token, /=/);
  const raw = Buffer.from(token, "base64url").toString("utf8");
  const payload = JSON.parse(raw);
  assert.equal(raw, canonicalJson(payload));
  assert.deepEqual(Object.keys(payload).sort(), ["actorHash", "contract", "lastFechaIngreso", "membershipId", "order", "personHash", "v"]);
  assert.deepEqual(Object.keys(payload.lastFechaIngreso).sort(), ["nanoseconds", "seconds"]);
  assert.equal(payload.actorHash, actorHash("actor-1")); assert.equal(payload.personHash, personHash("person-1"));
  assert.equal(raw.includes("actor-1"), false); assert.equal(raw.includes("person-1"), false);
  assert.doesNotMatch(raw, /checksum|hmac|expires|secret/i);
  assert.deepEqual(decodeOwnGroupMembershipHistoryCursor(token, { uid: "actor-1", personId: "person-1" }), {
    lastFechaIngreso: { seconds: 123, nanoseconds: 456 }, membershipId: "membership-1",
  });
  for (const context of [{ uid: "actor-2", personId: "person-1" }, { uid: "actor-1", personId: "person-2" }]) {
    assert.throws(() => decodeOwnGroupMembershipHistoryCursor(token, context), MembershipCursorInvalidError);
  }
  for (const mutation of [{ ...payload, v: 2 }, { ...payload, extra: true }, { ...payload, order: "other" }, { ...payload, membershipId: "x/y" }]) {
    const changed = Buffer.from(canonicalJson(mutation), "utf8").toString("base64url");
    assert.throws(() => decodeOwnGroupMembershipHistoryCursor(changed, { uid: "actor-1", personId: "person-1" }), MembershipCursorInvalidError);
  }
  for (const invalid of [`${token}=`, "***", Buffer.from(`{"v":1,"v":1}`, "utf8").toString("base64url")]) {
    assert.throws(() => decodeOwnGroupMembershipHistoryCursor(invalid, { uid: "actor-1", personId: "person-1" }), MembershipCursorInvalidError);
  }
});

function membership(version, estado, overrides = {}) {
  const base = { membershipId: `membership-v${version}-${estado}`, personId: "person-1", groupId: "group-1", seasonId: "season-1", estado, fechaIngreso: t(200), createdAt, schemaVersion: version };
  if (estado === "finalizada") base.fechaEgreso = t(300);
  if (version >= 3) { base.periodCount = overrides.periodCount || 1; base.latestPeriodId = membershipValidityPeriodId(base.membershipId, base.periodCount); }
  if (version === 4) base.previousMembershipId = "previous-root";
  return { ...base, ...overrides };
}

test("DTO E2-19 proyecta v1-v4 sin IDs internos y con egreso condicional", () => {
  for (const [version, estado, status, continuity] of [[1, "activa", "CURRENT", "INITIAL"], [2, "finalizada", "HISTORICAL", "INITIAL"], [3, "activa", "CURRENT", "INITIAL"], [3, "finalizada", "HISTORICAL", "INITIAL"], [4, "activa", "CURRENT", "RENEWAL"], [4, "finalizada", "HISTORICAL", "RENEWAL"]]) {
    const root = membership(version, estado);
    const dto = toOwnGroupMembershipHistoryItem({ membership: root, group: { groupId: "group-1", nombre: "Grupo" }, season: { seasonId: "season-1", nombre: "Temporada" }, validityPeriodCount: version < 3 ? 1 : root.periodCount });
    assert.deepEqual(Object.keys(dto).sort(), estado === "finalizada"
      ? ["continuity", "group", "joinedAt", "leftAt", "rowKey", "season", "status", "validityPeriodCount"]
      : ["continuity", "group", "joinedAt", "rowKey", "season", "status", "validityPeriodCount"]);
    assert.equal(dto.status, status); assert.equal(dto.continuity, continuity); assert.equal(dto.validityPeriodCount, 1);
    const serialized = JSON.stringify(dto);
    for (const forbidden of [root.membershipId, root.personId, "previous-root", "schemaVersion", "latestPeriodId"]) assert.equal(serialized.includes(forbidden), false);
  }
});

function serviceWith(reader) {
  const noop = {};
  return createMembershipService({ selfAccountReader: noop, selfPersonContext: noop, ownedGroupContext: noop, openSeasonContext: noop,
    membershipRepository: noop, activeMembershipGuard: noop, myMembershipReader: noop, ownGroupMembershipHistoryReader: reader });
}

test("servicio devuelve contrato cerrado y cursor anclado en última fila entregada", async () => {
  const root = membership(4, "activa");
  const page = await serviceWith({ async listPage(input) {
    assert.deepEqual(input, { userId: "actor-1", pageSize: 20, cursor: undefined });
    return { personId: "person-1", rows: [{ membership: root, group: { groupId: "group-1", nombre: "Grupo" }, season: { seasonId: "season-1", nombre: "Temporada" }, validityPeriodCount: 1 }], hasMore: true, cursorAnchor: { lastFechaIngreso: root.fechaIngreso, membershipId: root.membershipId } };
  } }).listMyGroupMembershipHistory({ userId: "actor-1", roles: ["admin"] }, { pageSize: 20 });
  assert.deepEqual(Object.keys(page).sort(), ["hasMore", "items", "nextCursor"]);
  assert.equal(page.hasMore, true); assert.equal(page.items.length, 1);
  assert.equal(decodeOwnGroupMembershipHistoryCursor(page.nextCursor, { uid: "actor-1", personId: "person-1" }).membershipId, root.membershipId);
});

class Query {
  constructor(name, log) { this.name = name; this.log = log; this.kind = "query"; }
  where(...args) { this.log.filters.push(args); return this; }
  orderBy(...args) { this.log.orders.push(args); return this; }
  startAfter(...args) { this.log.after = args; return this; }
  limit(value) { this.log.limit = value; return this; }
  doc(id) { return new Reference(`${this.name}/${id}`, this.log); }
}
class Reference {
  constructor(path, log) { this.path = path; this.id = path.split("/").at(-1); this.kind = "doc"; this.log = log; }
  collection(name) { return new Query(`${this.path}/${name}`, this.log); }
}
const snap = (ref, data, exists = true) => ({ id: ref.id, ref, exists, data: () => data, get: (field) => data?.[field] });
const querySnap = (docs) => ({ docs, size: docs.length, empty: docs.length === 0 });

function readerFixture({ roots, periods = new Map(), anchor = null, cursor = null }) {
  const log = { filters: [], orders: [], after: null, limit: null, options: null, writes: 0, contextCalls: 0 };
  const metrics = [];
  const db = {
    collection(name) { return new Query(name, log); },
    async runTransaction(operation, options) {
      log.options = options;
      const tx = {
        async get(target) {
          if (target.kind === "query") return querySnap(roots.map(({ id, data }) => snap(new Reference(`memberships/${id}`, log), data)));
          if (target.path.startsWith("memberships/")) return anchor ? snap(target, anchor.data, anchor.exists) : snap(target, null, false);
          throw new Error(`Unexpected get ${target.path}`);
        },
        async getAll(...refs) { return refs.map((ref) => periods.has(ref.path) ? snap(ref, periods.get(ref.path)) : snap(ref, null, false)); },
        create() { log.writes += 1; }, set() { log.writes += 1; }, update() { log.writes += 1; }, delete() { log.writes += 1; },
      };
      return operation(tx);
    },
  };
  const personCapability = { async resolve() { return { status: "ready", personId: "person-1", reads: 2 }; } };
  const contextCapability = { async getMany({ groupIds, seasonIds }) {
    log.contextCalls += 1;
    return { groups: new Map(groupIds.map((id) => [id, { groupId: id, nombre: id, estado: "activo" }])), seasons: new Map(seasonIds.map((id) => [id, { seasonId: id, groupId: id.replace("season", "group"), nombre: id, estado: "abierta" }])), reads: groupIds.length + seasonIds.length };
  } };
  return { reader: createFirestoreOwnGroupMembershipHistoryReader({ db, personCapability, contextCapability, onMetrics: (value) => metrics.push(value) }), log, metrics, cursor };
}

function persistedRoot(index, version = 1, periods = 1) {
  const id = `membership-${String(index).padStart(2, "0")}`;
  const groupId = `group-${String(index).padStart(2, "0")}`;
  const seasonId = `season-${String(index).padStart(2, "0")}`;
  const data = { personId: "person-1", groupId, seasonId, estado: "activa", fechaIngreso: t(1000 - index), createdAt, schemaVersion: version };
  if (version >= 3) { data.periodCount = periods; data.latestPeriodId = membershipValidityPeriodId(id, periods); }
  if (version === 4) data.previousMembershipId = `previous-${index}`;
  return { id, data };
}

function periodData(ordinal, startedAt, endedAt) {
  const data = { ordinal, estado: endedAt ? "cerrado" : "abierto", startedAt, periodSchemaVersion: 1 };
  if (endedAt) data.endedAt = endedAt;
  return data;
}

test("reader usa query exacta, readOnly de un intento, lookahead y cero escrituras", async () => {
  const roots = [persistedRoot(1), persistedRoot(2)];
  const fixture = readerFixture({ roots });
  const page = await fixture.reader.listPage({ userId: "actor-1", pageSize: 1 });
  assert.deepEqual(fixture.log.filters, [["personId", "==", "person-1"]]);
  assert.equal(fixture.log.orders[0][0], "fechaIngreso"); assert.equal(fixture.log.orders[0][1], "desc");
  assert.equal(fixture.log.orders[1][1], "desc"); assert.equal(fixture.log.limit, 2);
  assert.deepEqual(fixture.log.options, { readOnly: true }); assert.equal(fixture.metrics.at(-1).attempts, 1); assert.equal(fixture.log.writes, 0);
  assert.equal(page.rows.length, 1); assert.equal(page.hasMore, true); assert.equal(page.cursorAnchor.membershipId, roots[0].id);
});

test("lookahead incompatible falla toda la página antes de componer", async () => {
  const roots = [persistedRoot(1), { ...persistedRoot(2), data: { ...persistedRoot(2).data, extra: true } }];
  const fixture = readerFixture({ roots });
  await assert.rejects(() => fixture.reader.listPage({ userId: "actor-1", pageSize: 1 }), { reason: "INCOMPATIBLE_STATE" });
  assert.equal(fixture.log.contextCalls, 0);
});

test("v3/v4 validan sólo fronteras deterministas, deduplican período y no leen lineage", async () => {
  const roots = [persistedRoot(1, 3, 1), persistedRoot(2, 4, 2)];
  const periods = new Map();
  for (const root of roots) {
    const count = root.data.periodCount;
    const firstId = membershipValidityPeriodId(root.id, 1);
    const latestId = membershipValidityPeriodId(root.id, count);
    periods.set(`memberships/${root.id}/validityPeriods/${firstId}`, periodData(1, root.data.fechaIngreso, count === 1 ? undefined : t(root.data.fechaIngreso.seconds + 1)));
    if (count > 1) periods.set(`memberships/${root.id}/validityPeriods/${latestId}`, periodData(count, t(root.data.fechaIngreso.seconds + 2)));
  }
  const fixture = readerFixture({ roots, periods });
  const page = await fixture.reader.listPage({ userId: "actor-1", pageSize: 2 });
  assert.deepEqual(page.rows.map((row) => row.validityPeriodCount), [1, 2]);
  assert.equal(fixture.metrics.at(-1).periods, 3); assert.equal(fixture.metrics.at(-1).lineage, 0); assert.equal(fixture.log.writes, 0);
});

test("instrumentación respeta mínimos, representativo y techo aprobados", async () => {
  async function measured(version, periodCount, cursorMode) {
    const roots = Array.from({ length: 21 }, (_, index) => persistedRoot(index + 1, version, periodCount));
    if (version === 1) for (const root of roots) { root.data.groupId = "group-1"; root.data.seasonId = "season-1"; }
    const periods = new Map();
    for (const root of roots.slice(0, 20)) if (version >= 3) {
      const first = membershipValidityPeriodId(root.id, 1); const latest = membershipValidityPeriodId(root.id, periodCount);
      periods.set(`memberships/${root.id}/validityPeriods/${first}`, periodData(1, root.data.fechaIngreso, periodCount > 1 ? t(root.data.fechaIngreso.seconds + 1) : undefined));
      if (periodCount > 1) periods.set(`memberships/${root.id}/validityPeriods/${latest}`, periodData(periodCount, t(root.data.fechaIngreso.seconds + 2)));
    }
    let cursor; let anchor;
    if (cursorMode) {
      anchor = { exists: true, data: roots[0].data };
      cursor = encodeOwnGroupMembershipHistoryCursor({ uid: "actor-1", personId: "person-1", lastFechaIngreso: roots[0].data.fechaIngreso, membershipId: roots[0].id });
    }
    const fixture = readerFixture({ roots, periods, anchor });
    await fixture.reader.listPage({ userId: "actor-1", pageSize: 20, cursor });
    return fixture.metrics.at(-1).total;
  }
  assert.equal(await measured(1, 1, true), 26);
  assert.equal(await measured(3, 1, true), 84);
  assert.equal(await measured(4, 2, true), 104);
  assert.equal(await measured(4, 2, false), 103);
});

test("errores de índice se distinguen sin enumeración", () => {
  assert.equal(isMissingIndexError({ code: 9, message: "The query requires an index" }), true);
  assert.equal(isMissingIndexError({ code: 9, message: "other" }), false);
});
