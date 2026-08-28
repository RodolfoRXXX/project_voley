"use strict";

const { MembershipValidationError } = require("./membershipErrors");

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

function assertExactObject(data, expectedKeys) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new MembershipValidationError();
  const keys = Object.keys(data).sort();
  const expected = [...expectedKeys].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new MembershipValidationError("Request contains missing or unknown properties");
  }
}

function assertGroupId(groupId) {
  if (typeof groupId !== "string" || !groupId.trim() || groupId !== groupId.trim() || groupId.includes("/")) {
    throw new MembershipValidationError("Group id is invalid");
  }
}

function validateCreateMembershipPayload(data) {
  assertExactObject(data, ["groupId", "idempotencyKey"]);
  assertGroupId(data.groupId);
  if (typeof data.idempotencyKey !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(data.idempotencyKey)) {
    throw new MembershipValidationError("Idempotency key is invalid");
  }
  return data;
}

function validateGetMembershipPayload(data) {
  assertExactObject(data, ["groupId"]);
  assertGroupId(data.groupId);
  return data;
}

module.exports = { IDEMPOTENCY_KEY_PATTERN, validateCreateMembershipPayload, validateGetMembershipPayload };
