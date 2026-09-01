"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  MemberContextDependencyUnavailableError,
  MemberContextIncompatibleError,
  MemberContextInternalError,
} = require("../../src/groups/application/memberContextErrors");
const { createFirestoreMemberContext } = require("../../src/groups/infrastructure/firestoreMemberContext");

const createdAt = { toDate: () => new Date("2026-08-30T12:00:00.000Z") };
function season(id, groupId = "group-1") { return { seasonId: id, groupId, estado: "abierta" }; }
function setup({ seasons = [], guard = null, readError = null } = {}) {
  const calls = [];
  const query = {
    kind: "query",
    where(field, operator, value) { calls.push(["where", field, operator, value]); return this; },
    limit(value) { calls.push(["limit", value]); return this; },
  };
  const guardReference = { kind: "guard" };
  const db = {
    collection(name) {
      calls.push(["collection", name]);
      if (name === "seasons") return query;
      return { doc(id) { calls.push(["doc", id]); return guardReference; } };
    },
    async runTransaction(operation) {
      return operation({
        async get(target) {
          if (readError) throw readError;
          if (target.kind === "query") return { docs: seasons.map((entity) => ({ entity })) };
          return guard
            ? { exists: true, id: "group-1", data: () => ({
              seasonId: guard,
              idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64),
              createdAt, guardVersion: 1,
            }) }
            : { exists: false, id: "group-1", data: () => undefined };
        },
      });
    },
  };
  const context = createFirestoreMemberContext({
    db,
    groupRepository: { async getById(groupId) { return { groupId, nombre: "Grupo", deporte: "voleibol", estado: "activo" }; } },
    seasonRepository: { fromSnapshot(snapshot) { return snapshot.entity; } },
  });
  return { calls, context };
}

test("contexto abierto consulta groupId + abierta + limit(2) y correlaciona uno con guard", async () => {
  const { calls, context } = setup({ seasons: [season("season-1")], guard: "season-1" });
  assert.deepEqual(await context.getOpenSeasonContextForMembership({ groupId: "group-1" }), {
    id: "season-1", groupId: "group-1", estado: "abierta",
  });
  assert.deepEqual(calls.filter(([kind]) => kind === "where" || kind === "limit"), [
    ["where", "groupId", "==", "group-1"],
    ["where", "estado", "==", "abierta"],
    ["limit", 2],
  ]);
});

test("sólo cero abiertas sin guard es ausencia legítima", async () => {
  assert.equal(await setup().context.getOpenSeasonContextForMembership({ groupId: "group-1" }), null);
  for (const fixture of [
    { seasons: [season("season-1")] },
    { guard: "season-1" },
    { seasons: [season("season-1"), season("season-2")], guard: "season-1" },
    { seasons: [season("season-1")], guard: "season-2" },
    { seasons: [season("season-1", "other-group")], guard: "season-1" },
  ]) {
    await assert.rejects(
      () => setup(fixture).context.getOpenSeasonContextForMembership({ groupId: "group-1" }),
      MemberContextIncompatibleError
    );
  }
});

test("contexto distingue fallos transitorios de errores internos", async () => {
  const transient = Object.assign(new Error("retry"), { code: 14 });
  await assert.rejects(
    () => setup({ readError: transient }).context.getOpenSeasonContextForMembership({ groupId: "group-1" }),
    MemberContextDependencyUnavailableError
  );
  await assert.rejects(
    () => setup({ readError: new TypeError("bug") }).context.getOpenSeasonContextForMembership({ groupId: "group-1" }),
    MemberContextInternalError
  );
});
