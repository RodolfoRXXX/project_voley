"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { validateCreateMembershipPayload, validateGetMembershipPayload, validateListMyCurrentGroupMembershipsPayload } = require("../../src/memberships/application/membershipContract");
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

test("listado propio aplica default 20 y contrato cerrado", () => {
  assert.deepEqual(validateListMyCurrentGroupMembershipsPayload({}), { pageSize: 20 });
  const nullPrototype = Object.create(null);
  nullPrototype.pageSize = 2;
  assert.deepEqual(validateListMyCurrentGroupMembershipsPayload(nullPrototype), { pageSize: 2 });
  assert.deepEqual(validateListMyCurrentGroupMembershipsPayload({ pageSize: 1, cursor: "abc" }), { pageSize: 1, cursor: "abc" });
  assert.deepEqual(validateListMyCurrentGroupMembershipsPayload({ pageSize: 20 }), { pageSize: 20 });
  class CustomPayload {}
  for (const value of [null, [], undefined, new Date(), new CustomPayload(), new Map(), new Set(), Buffer.from("{}"), () => ({}), { pageSize: 0 }, { pageSize: 21 }, { pageSize: 1.5 }, { pageSize: "2" }, { cursor: "" }, { cursor: "x".repeat(2049) }, { uid: "x" }, { personId: "x" }, { order: "asc" }]) {
    assert.throws(() => validateListMyCurrentGroupMembershipsPayload(value), MembershipValidationError);
  }
});
