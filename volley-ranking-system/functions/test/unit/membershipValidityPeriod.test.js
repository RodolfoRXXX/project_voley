"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildMembership, createInitialMembership, finalizeMembership, hydrateMembership, reactivateMembership } = require("../../src/memberships/domain/membership");
const { InvalidMembershipValidityPeriodError, closeMembershipValidityPeriod, hydrateMembershipValidityPeriod, openMembershipValidityPeriod } = require("../../src/memberships/domain/membershipValidityPeriod");
const { membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");

class Time { constructor(ms) { this.ms = ms; } toDate() { return new Date(this.ms); } }
const id = "membership-periods";
const p = (ordinal) => membershipValidityPeriodId(id, ordinal);

test("E2-09 períodos v1 usan schema cerrado, ordinal determinista y admiten inicio igual a fin", () => {
  const at = new Time(1000); const open = openMembershipValidityPeriod({ periodId: p(1), ordinal: 1, startedAt: at });
  assert.deepEqual(open, { periodId: p(1), ordinal: 1, estado: "abierto", startedAt: at, periodSchemaVersion: 1 });
  const closed = closeMembershipValidityPeriod(open, at);
  assert.equal(closed.estado, "cerrado"); assert.equal(closed.endedAt, at);
  assert.deepEqual(hydrateMembershipValidityPeriod(p(1), { ordinal: 1, estado: "cerrado", startedAt: at, endedAt: at, periodSchemaVersion: 1 }), closed);
  for (const invalid of [
    { ordinal: 0, estado: "abierto", startedAt: at, periodSchemaVersion: 1 },
    { ordinal: 1, estado: "abierto", startedAt: at, endedAt: at, periodSchemaVersion: 1 },
    { ordinal: 1, estado: "cerrado", startedAt: at, endedAt: new Time(999), periodSchemaVersion: 1 },
    { ordinal: 1, estado: "cerrado", startedAt: at, endedAt: at, periodSchemaVersion: 2 },
  ]) assert.throws(() => hydrateMembershipValidityPeriod(p(1), invalid), InvalidMembershipValidityPeriodError);
});

test("E2-09 alta nueva materializa raíz v3 activa y período 1 con un timestamp", () => {
  const at = new Time(1000); const candidate = buildMembership({ membershipId: id, personId: "person", groupId: "group", seasonId: "season" });
  const result = createInitialMembership(candidate, at, p(1));
  assert.deepEqual(result.membership, { ...candidate, fechaIngreso: at, createdAt: at, latestPeriodId: p(1), periodCount: 1 });
  assert.equal(Object.hasOwn(result.membership, "fechaEgreso"), false);
  assert.equal(result.periods.length, 1); assert.equal(result.periods[0].startedAt, at);
  assert.equal(hydrateMembership(id, { personId: "person", groupId: "group", seasonId: "season", estado: "activa", fechaIngreso: at, createdAt: at, latestPeriodId: p(1), periodCount: 1, schemaVersion: 3 }).schemaVersion, 3);
});

test("E2-09 finalizada v2 se reactiva sin inventar historia y conserva fechaIngreso", () => {
  const joined = new Time(1000); const left = new Time(2000); const reactivated = new Time(3000);
  const legacy = hydrateMembership(id, { personId: "person", groupId: "group", seasonId: "season", estado: "finalizada", fechaIngreso: joined, fechaEgreso: left, createdAt: joined, schemaVersion: 2 });
  const result = reactivateMembership({ membership: legacy, reactivatedAt: reactivated, firstPeriodId: p(1), nextPeriodId: p(2) });
  assert.equal(result.membership.membershipId, id); assert.equal(result.membership.fechaIngreso, joined); assert.equal(result.membership.periodCount, 2); assert.equal(result.membership.latestPeriodId, p(2)); assert.equal(Object.hasOwn(result.membership, "fechaEgreso"), false);
  assert.deepEqual(result.periods.map((period) => [period.ordinal, period.estado]), [[1, "cerrado"], [2, "abierto"]]);
  assert.equal(result.periods[0].startedAt, joined); assert.equal(result.periods[0].endedAt, left); assert.equal(result.periods[1].startedAt, reactivated);
});

test("E2-09 múltiples ciclos preservan períodos anteriores y ordinales contiguos", () => {
  const t1 = new Time(1000); const t2 = new Time(2000); const t3 = new Time(3000); const t4 = new Time(4000); const t5 = new Time(5000);
  const initial = createInitialMembership(buildMembership({ membershipId: id, personId: "person", groupId: "group", seasonId: "season" }), t1, p(1));
  const firstClosed = finalizeMembership({ membership: initial.membership, finalizedAt: t2, firstPeriod: initial.periods[0], latestPeriod: initial.periods[0], firstPeriodId: p(1) });
  const secondOpen = reactivateMembership({ membership: firstClosed.membership, reactivatedAt: t3, firstPeriod: firstClosed.periods[0], latestPeriod: firstClosed.periods[0], firstPeriodId: p(1), nextPeriodId: p(2) });
  const secondClosed = finalizeMembership({ membership: secondOpen.membership, finalizedAt: t4, firstPeriod: firstClosed.periods[0], latestPeriod: secondOpen.periods[0], firstPeriodId: p(1) });
  const thirdOpen = reactivateMembership({ membership: secondClosed.membership, reactivatedAt: t5, firstPeriod: firstClosed.periods[0], latestPeriod: secondClosed.periods[0], firstPeriodId: p(1), nextPeriodId: p(3) });
  assert.equal(thirdOpen.membership.periodCount, 3); assert.equal(thirdOpen.periods[0].ordinal, 3); assert.equal(thirdOpen.periods[0].estado, "abierto");
  assert.equal(firstClosed.periods[0].endedAt, t2); assert.equal(secondClosed.periods[0].endedAt, t4);
  assert.throws(() => reactivateMembership({ membership: secondClosed.membership, reactivatedAt: new Time(3999), firstPeriod: firstClosed.periods[0], latestPeriod: secondClosed.periods[0], firstPeriodId: p(1), nextPeriodId: p(3) }));
});

test("E2-09 v3 falla cerrado ante raíz desconocida o extremos incoherentes", () => {
  const at = new Time(1000);
  const active = { personId: "person", groupId: "group", seasonId: "season", estado: "activa", fechaIngreso: at, createdAt: at, latestPeriodId: p(1), periodCount: 1, schemaVersion: 3 };
  for (const invalid of [{ ...active, schemaVersion: 4 }, { ...active, fechaEgreso: at }, { ...active, periodCount: 0 }, { ...active, latestPeriodId: "" }]) assert.throws(() => hydrateMembership(id, invalid));
});
