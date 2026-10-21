import assert from "node:assert/strict";
import test from "node:test";
import { createLatestRequestGate, visibleMovementRows } from "../src/components/registeredIncomeMovements/registeredIncomeMovementView.mjs";

test("visual pagination returns only 20/50 visible rows without mutating the full response", () => {
  const items = Array.from({ length: 1000 }, (_, index) => ({ movementId: `movement-${index}` }));
  assert.deepEqual(visibleMovementRows(items, 1, 20).rows, items.slice(0, 20));
  assert.deepEqual(visibleMovementRows(items, 50, 20).rows, items.slice(980, 1000));
  assert.deepEqual(visibleMovementRows(items, 20, 50).rows, items.slice(950, 1000));
  assert.equal(items.length, 1000);
});

test("a newer range/generation invalidates late responses even within the same Group", () => {
  const gate = createLatestRequestGate();
  const october = gate.begin("group:2026-10-01:2026-10-31");
  const september = gate.begin("group:2026-09-01:2026-09-30");
  assert.equal(gate.isCurrent(october), false);
  assert.equal(gate.isCurrent(september), true);
  gate.invalidate("signed-out");
  assert.equal(gate.isCurrent(september), false);
});
