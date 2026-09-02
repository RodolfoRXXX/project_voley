"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createMembershipCallableHandler, membershipIdentityFromCallableContext, toMembershipHttpsError } = require("../../src/memberships/infrastructure/membershipCallable");
const { MembershipAlreadyExistsError, MembershipNotFoundError, MembershipPersonRequiredError, MembershipReactivationRequiredError, MembershipUnauthenticatedError } = require("../../src/memberships/application/membershipErrors");

test("UID se deriva sólo del token y el payload validado no lo sustituye", async () => {
  const handler = createMembershipCallableHandler({
    validatePayload: (data) => data,
    operation: async (identity, data) => ({ identity, data }),
  });
  const result = await handler({ groupId: "group", uid: "attacker" }, { auth: { uid: "trusted" } });
  assert.equal(result.identity.userId, "trusted");
  assert.equal(result.data.uid, "attacker");
  assert.throws(() => membershipIdentityFromCallableContext({}), MembershipUnauthenticatedError);
});

test("reasons se mapean a códigos HTTPS normativos", () => {
  assert.equal(toMembershipHttpsError(new MembershipPersonRequiredError()).code, "failed-precondition");
  assert.equal(toMembershipHttpsError(new MembershipAlreadyExistsError()).code, "already-exists");
  assert.equal(toMembershipHttpsError(new MembershipUnauthenticatedError()).code, "unauthenticated");
  assert.equal(toMembershipHttpsError(new MembershipNotFoundError()).code, "not-found");
  assert.equal(toMembershipHttpsError(new MembershipReactivationRequiredError()).code, "failed-precondition");
});

test("fallo inesperado no expone mensaje interno", () => {
  const error = toMembershipHttpsError(new Error("raw-key stack secret"));
  assert.equal(error.code, "internal");
  assert.equal(error.details.reason, "INTERNAL_ERROR");
  assert.equal(error.message.includes("secret"), false);
});

test("callable registra INTERNAL_ERROR sin PII y preserva el mapping público", async () => {
  const logs = [];
  const cause = Object.assign(new Error("uid-secret group-secret token-secret"), { code: 13, payload: "secret" });
  const internal = new (require("../../src/memberships/application/membershipErrors").MembershipInternalError)({ cause });
  const handler = createMembershipCallableHandler({
    operationName: "finalize",
    validatePayload: (data) => data,
    operation: async () => { throw internal; },
    logger: { error(...args) { logs.push(args); } },
  });
  await assert.rejects(
    () => handler({ groupId: "not-logged" }, { auth: { uid: "not-logged" } }),
    (error) => error.code === "internal" && error.details.reason === "INTERNAL_ERROR"
  );
  assert.equal(logs.length, 1);
  const serialized = JSON.stringify(logs);
  for (const forbidden of ["uid-secret", "group-secret", "token-secret", "not-logged", "payload", "stack"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.equal(logs[0][1].operation, "finalize");
  assert.equal(logs[0][1].stage, "callable");
  assert.equal(logs[0][1].cause[0].code, 13);
});
