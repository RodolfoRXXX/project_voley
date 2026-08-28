"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createMembershipCallableHandler, membershipIdentityFromCallableContext, toMembershipHttpsError } = require("../../src/memberships/infrastructure/membershipCallable");
const { MembershipAlreadyExistsError, MembershipPersonRequiredError, MembershipUnauthenticatedError } = require("../../src/memberships/application/membershipErrors");

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
});

test("fallo inesperado no expone mensaje interno", () => {
  const error = toMembershipHttpsError(new Error("raw-key stack secret"));
  assert.equal(error.code, "internal");
  assert.equal(error.details.reason, "INTERNAL_ERROR");
  assert.equal(error.message.includes("secret"), false);
});
