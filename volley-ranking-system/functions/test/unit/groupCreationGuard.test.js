"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createFirestoreGroupCreationGuard, hydrateGuard } = require("../../src/groups/infrastructure/firestoreGroupCreationGuard");
const { GroupConflictError, GroupDependencyUnavailableError } = require("../../src/groups/application/groupErrors");

const timestamp = { toDate: () => new Date("2026-08-26T12:00:00.000Z") };
const valid = { groupId: "opaque", idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: timestamp, guardVersion: 1 };

test("guard acepta sólo su esquema exacto sin clave cruda", () => {
  assert.deepEqual(hydrateGuard({ exists: true, id: "uid", data: () => valid }, "uid"), valid);
  for (const data of [{ ...valid, idempotencyKey: "raw-secret-key" }, { ...valid, requestHash: "bad" }, { ...valid, guardVersion: 2 }, { ...valid, createdAt: null }]) {
    assert.throws(() => hydrateGuard({ exists: true, id: "uid", data: () => data }, "uid"), GroupDependencyUnavailableError);
  }
});

test("conflictos transaccionales agotados se traducen a CONFLICT", async () => {
  const error = Object.assign(new Error("aborted"), { code: 10 });
  const guard = createFirestoreGroupCreationGuard({
    db: { collection() { return { doc() { return {}; } }; }, async runTransaction() { throw error; } },
    ownGroupsReader: {},
  });
  await assert.rejects(guard.confirmFirstGroup({}), GroupConflictError);
});

test("dependencia caída se traduce a DEPENDENCY_UNAVAILABLE", async () => {
  const error = Object.assign(new Error("unavailable"), { code: 14 });
  const guard = createFirestoreGroupCreationGuard({
    db: { collection() { return { doc() { return {}; } }; }, async runTransaction() { throw error; } },
    ownGroupsReader: {},
  });
  await assert.rejects(guard.confirmFirstGroup({}), GroupDependencyUnavailableError);
});
