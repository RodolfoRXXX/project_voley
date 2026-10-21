"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { validateRegisteredIncomeMovementQuery } = require("../../src/registeredIncomeMovements/application/registeredIncomeMovementContract");
const { CODES } = require("../../src/registeredIncomeMovements/infrastructure/registeredIncomeMovementCallable");

test("E3-08 accepts only the closed public contract and defaults to the Buenos Aires civil month", () => {
  const clock = () => new Date("2026-10-21T15:00:00.000Z");
  assert.deepEqual(validateRegisteredIncomeMovementQuery({ groupId: "group" }, { clock }), {
    groupId: "group", from: "2026-10-01", to: "2026-10-31",
  });
  assert.deepEqual(validateRegisteredIncomeMovementQuery({ groupId: " group ", from: "2026-08-01",
    to: "2026-10-31" }), { groupId: "group", from: "2026-08-01", to: "2026-10-31" });
  for (const input of [
    { groupId: "group", from: "2026-10-01" },
    { groupId: "group", from: "2026-02-30", to: "2026-03-01" },
    { groupId: "group", from: "2026-10-02", to: "2026-10-01" },
    { groupId: "group", pageSize: 20 },
    { groupId: "group", cursor: "legacy" },
  ]) assert.throws(() => validateRegisteredIncomeMovementQuery(input), { reason: "INVALID_DATE_RANGE" });
  assert.throws(() => validateRegisteredIncomeMovementQuery({ groupId: "group", from: "2026-01-01",
    to: "2026-04-03" }), { reason: "RANGE_TOO_WIDE" });
});

test("E3-08 exposes stable callable categories without continuation errors", () => {
  assert.equal(CODES.MOVEMENT_LIMIT_EXCEEDED, "resource-exhausted");
  assert.equal(CODES.GROUP_TREASURY_NOT_AUTHORIZED, "permission-denied");
  assert.equal(Object.hasOwn(CODES, "CURSOR_SCOPE_MISMATCH"), false);
  assert.equal(Object.hasOwn(CODES, "MOVEMENT_VIEW_CHANGED"), false);
});
