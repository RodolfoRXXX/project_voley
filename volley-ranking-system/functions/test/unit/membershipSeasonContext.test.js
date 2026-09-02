"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { MemberContextIncompatibleError } = require("../../src/groups/application/memberContextErrors");
const { createFirestoreMemberContext } = require("../../src/groups/infrastructure/firestoreMemberContext");

const createdAt = { toDate: () => new Date("2026-09-02T12:00:00.000Z") };
function season(seasonId, { groupId = "group-1", estado = "abierta" } = {}) {
  return { seasonId, groupId, estado };
}
function setup({ documents = [], guard = null } = {}) {
  const query = { kind: "query", where() { return this; }, limit() { return this; } };
  const guardRef = { kind: "guard" };
  const db = {
    collection(name) {
      if (name === "seasons") return query;
      return { doc() { return guardRef; } };
    },
    runTransaction(operation) {
      return operation({
        async get(target) {
          if (target === query) {
            return { docs: documents.filter((item) => item.groupId === "group-1" && item.estado === "abierta").map((entity) => ({ entity })) };
          }
          return guard ? {
            exists: true, id: "group-1", data: () => ({ seasonId: guard, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt, guardVersion: 1 }),
          } : { exists: false, id: "group-1", data: () => undefined };
        },
      });
    },
  };
  return createFirestoreMemberContext({
    db,
    groupRepository: { async getById() { throw new Error("Group must not be read by the Season capability"); } },
    seasonRepository: { fromSnapshot(snapshot) { return snapshot.entity; } },
  });
}
async function read(fixture) {
  return setup(fixture).getOpenSeasonContextForMembership({ groupId: "group-1" });
}
async function incompatible(fixture) {
  await assert.rejects(() => read(fixture), MemberContextIncompatibleError);
}

test("E2-05: cero Temporadas abiertas sin guard es ausencia legítima", async () => {
  assert.equal(await read(), null);
});
test("E2-05: la Temporada cerrada de la Membresía no cuenta como abierta", async () => {
  assert.equal(await read({ documents: [season("season-membership", { estado: "cerrada" })] }), null);
});
test("E2-05: una abierta distinta del guard es incompatible", async () => {
  await incompatible({ documents: [season("season-other")], guard: "season-membership" });
});
test("E2-05: dos abiertas son incompatibles", async () => {
  await incompatible({ documents: [season("season-1"), season("season-2")], guard: "season-1" });
});
test("E2-05: guard de apertura huérfano es incompatible", async () => {
  await incompatible({ guard: "season-missing" });
});
test("E2-05: Temporada abierta sin guard es incompatible", async () => {
  await incompatible({ documents: [season("season-1")] });
});
test("E2-05: referencias de Grupo incompatibles no satisfacen apertura", async () => {
  await incompatible({ documents: [season("season-1", { groupId: "other-group" })], guard: "season-1" });
});
