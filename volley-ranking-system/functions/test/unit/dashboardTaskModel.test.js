"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { COVERAGE, TASK_TYPES, eventId, itemId, taskId } = require("../../src/dashboardTasks/application/dashboardTaskModel");
const { MAX_TRANSITION_WRITES, projectionWriteCount } = require("../../src/dashboardTasks/infrastructure/firestoreDashboardTaskProjectionStore");

test("IUX-02A identities are stable and type/resource scoped", () => {
  assert.equal(COVERAGE, "N20_N31_V1");
  assert.equal(taskId(TASK_TYPES.JOIN_REQUEST, "request-1"), "JOIN_REQUEST_DECISION:request-1");
  assert.equal(taskId(TASK_TYPES.PAYMENT_DELIVERY, "delivery-1"), "PAYMENT_DELIVERY_REVIEW:delivery-1");
  assert.equal(eventId("N20_CREATED", "command-1"), eventId("N20_CREATED", "command-1"));
  assert.notEqual(eventId("N20_CREATED", "command-1"), eventId("N20_RESOLVED", "command-1"));
  assert.match(itemId("JOIN_REQUEST_DECISION:request-1"), /^[a-f0-9]{64}$/);
});

test("IUX-02A fan-out guard counts inactive items and terminal manifests", () => {
  const writes = projectionWriteCount({ itemWrites: 300, contextWrites: 1, userCount: 1, manifestWrites: 300 });
  assert.equal(writes, 605);
  assert.ok(writes > MAX_TRANSITION_WRITES);
});
