"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { handler } = require("../../src/groupJoinRequests/infrastructure/groupJoinRequestCallable");

test("observabilidad registra sólo operación, etapa, clasificación, outcome y duración", async () => {
  const entries = [];
  const callable = handler({
    operationName: "create",
    validatePayload: (value) => value,
    operation: async (_identity, _input, observe) => {
      observe({ stage: "intent-confirmed", classification: "retry", userId: "forbidden" });
      return { outcome: "EXISTING_PENDING", request: { id: "not-logged" } };
    },
    logger: { info: (_message, fields) => entries.push(fields) },
  });
  await callable({ groupId: "not-logged" }, { auth: { uid: "not-logged" } });
  assert.deepEqual(Object.keys(entries[0]).sort(), ["classification", "durationMs", "operation", "outcome", "stage"]);
  assert.equal(entries[0].classification, "retry");
  assert.equal(entries[0].stage, "intent-confirmed");
});

test("observabilidad conserva clasificación segura ante validación fallida", async () => {
  const entries = [];
  const callable = handler({ operationName: "preview", validatePayload: () => { throw new Error("bad payload"); }, operation: async () => ({}), logger: { warn: (_message, fields) => entries.push(fields) } });
  await assert.rejects(() => callable({}, { auth: { uid: "u" } }));
  assert.deepEqual(Object.keys(entries[0]).sort(), ["classification", "durationMs", "operation", "reason", "stage"]);
  assert.equal(entries[0].stage, "request-validation");
  assert.equal(entries[0].classification, "first-attempt");
});
