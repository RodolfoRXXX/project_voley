"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { MembershipInternalError } = require("../../src/memberships/application/membershipErrors");
const {
  annotateMembershipError,
  inheritMembershipDiagnostic,
  logUnexpectedMembershipError,
} = require("../../src/memberships/application/membershipObservability");

test("observabilidad conserva la excepción y sólo registra estructura allowlisted sin PII", () => {
  const cause = Object.assign(new Error("uid-secret person-secret group-secret token-secret"), {
    code: 13, uid: "uid-secret", payload: { groupId: "group-secret" },
  });
  cause.cause = cause;
  const internal = inheritMembershipDiagnostic(new MembershipInternalError({ cause }), cause, {
    operation: "create", stage: "transaction", attempt: 2, mapper: "MembershipInternalError",
  });
  assert.equal(annotateMembershipError(internal, { operation: "create", stage: "callable" }), internal);
  const entries = [];
  const event = logUnexpectedMembershipError({ error: internal, operation: "create", logger: { error(...args) { entries.push(args); } } });
  assert.equal(entries.length, 1);
  assert.equal(entries[0][1], event);
  assert.equal(event.operation, "create");
  assert.equal(event.stage, "transaction");
  assert.equal(event.reason, "INTERNAL_ERROR");
  assert.equal(event.attempt, 2);
  assert.equal(event.cause[0].code, 13);
  const serialized = JSON.stringify(entries);
  for (const forbidden of ["uid-secret", "person-secret", "group-secret", "token-secret", "payload", "stack"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});
