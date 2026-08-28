"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { validateCreateMembershipPayload, validateGetMembershipPayload } = require("../../src/memberships/application/membershipContract");
const { MembershipValidationError } = require("../../src/memberships/application/membershipErrors");

const valid = { groupId: "group-1", idempotencyKey: "e2-03-valid-key-0001" };

test("comando acepta exclusivamente groupId e idempotencyKey", () => {
  assert.deepEqual(validateCreateMembershipPayload(valid), valid);
  for (const extra of ["uid", "userId", "personId", "seasonId", "estado", "fechaIngreso", "rol", "cargo", "permisos"]) {
    assert.throws(() => validateCreateMembershipPayload({ ...valid, [extra]: "forbidden" }), MembershipValidationError);
  }
});

test("consulta acepta exclusivamente groupId canónico", () => {
  assert.deepEqual(validateGetMembershipPayload({ groupId: "group-1" }), { groupId: "group-1" });
  for (const value of [null, {}, { groupId: " group " }, { groupId: "a/b" }, { groupId: "g", personId: "p" }]) {
    assert.throws(() => validateGetMembershipPayload(value), MembershipValidationError);
  }
});

test("clave respeta alfabeto y longitud cerrados", () => {
  for (const key of ["short", "x".repeat(129), "invalid key 0000", "á".repeat(16)]) {
    assert.throws(() => validateCreateMembershipPayload({ ...valid, idempotencyKey: key }), MembershipValidationError);
  }
  assert.doesNotThrow(() => validateCreateMembershipPayload({ ...valid, idempotencyKey: "A._:-0123456789ab" }));
});
