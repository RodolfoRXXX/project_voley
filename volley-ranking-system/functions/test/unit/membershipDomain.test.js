"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  InvalidMembershipStateError,
  ACTIVE_MEMBERSHIP_FIELDS,
  FINALIZED_MEMBERSHIP_FIELDS,
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

test("E2-05 hidrata finalizada v2 exacta y rechaza versiones cruzadas", () => {
  const finalizedAt = { toDate: () => new Date("2026-08-28T12:00:00.000Z") };
  const finalized = { ...document, estado: "finalizada", fechaEgreso: finalizedAt, schemaVersion: 2 };
  const membership = hydrateMembership("opaque-id", finalized);
  assert.equal(membership.estado, "finalizada");
  assert.equal(membership.fechaEgreso, finalizedAt);
  assert.deepEqual(Object.keys(finalized).sort(), [...FINALIZED_MEMBERSHIP_FIELDS].sort());
  assert.deepEqual(Object.keys(document).sort(), [...ACTIVE_MEMBERSHIP_FIELDS].sort());
  for (const invalid of [{ ...document, schemaVersion: 2 }, { ...finalized, schemaVersion: 1 }, { ...finalized, fechaEgreso: undefined }, { ...finalized, extra: true }]) {
    assert.throws(() => hydrateMembership("opaque-id", invalid), InvalidMembershipStateError);
  }
});

test("E2-05 finalize conserva identidad, exige orden temporal y rechaza segunda transición", () => {
  const active = hydrateMembership("opaque-id", document);
  const finalizedAt = { toDate: () => new Date("2026-08-28T12:00:00.000Z") };
  const finalized = active.finalize(finalizedAt);
  assert.deepEqual(Object.keys(finalized).sort(), ["createdAt", "estado", "fechaEgreso", "fechaIngreso", "groupId", "membershipId", "personId", "schemaVersion", "seasonId"]);
  assert.equal(finalized.membershipId, active.membershipId);
  assert.equal(finalized.fechaIngreso, active.fechaIngreso);
  assert.equal(finalized.createdAt, active.createdAt);
  assert.equal(finalized.fechaEgreso, finalizedAt);
  assert.equal(finalized.schemaVersion, 2);
  assert.throws(() => active.finalize({ toDate: () => new Date("2026-08-26T12:00:00.000Z") }), InvalidMembershipStateError);
  assert.throws(() => finalized.finalize(finalizedAt), InvalidMembershipStateError);
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
