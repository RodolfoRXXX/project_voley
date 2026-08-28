"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  InvalidMembershipStateError,
  MEMBERSHIP_FIELDS,
  buildMembership,
  hydrateMembership,
} = require("../../src/memberships/domain/membership");

const timestamp = { toDate: () => new Date("2026-08-27T12:00:00.000Z") };
const document = {
  personId: "person-1", groupId: "group-1", seasonId: "season-1", estado: "activa",
  fechaIngreso: timestamp, createdAt: timestamp, schemaVersion: 1,
};

test("construye el Aggregate Root mínimo, activo e inmutable", () => {
  const membership = buildMembership({ membershipId: "opaque-id", personId: "person-1", groupId: "group-1", seasonId: "season-1" });
  assert.deepEqual(membership, { membershipId: "opaque-id", personId: "person-1", groupId: "group-1", seasonId: "season-1", estado: "activa", schemaVersion: 1 });
  assert.equal(Object.isFrozen(membership), true);
});

test("rechaza IDs vacíos, no canónicos o con slash", () => {
  for (const value of ["", " person ", "a/b", null]) {
    assert.throws(() => buildMembership({ membershipId: "id", personId: value, groupId: "group", seasonId: "season" }), InvalidMembershipStateError);
  }
});

test("reconstruye exclusivamente el documento v1 exacto", () => {
  const membership = hydrateMembership("opaque-id", document);
  assert.equal(membership.fechaIngreso, timestamp);
  assert.deepEqual([...MEMBERSHIP_FIELDS].sort(), Object.keys(document).sort());
  for (const invalid of [
    { ...document, extra: true },
    { ...document, estado: "inactiva" },
    { ...document, schemaVersion: 2 },
    { ...document, fechaIngreso: new Date() },
    { ...document, createdAt: null },
  ]) assert.throws(() => hydrateMembership("opaque-id", invalid), InvalidMembershipStateError);
});
