"use strict";

const { MembershipValidationError } = require("./membershipErrors");

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;
const MY_GROUPS_DEFAULT_PAGE_SIZE = 20;
const MY_GROUPS_MAX_PAGE_SIZE = 20;
const MY_GROUPS_MAX_CURSOR_LENGTH = 2048;

function isPlainObject(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const prototype = Object.getPrototypeOf(data);
  return prototype === Object.prototype || prototype === null;
}

function assertExactObject(data, expectedKeys) {
  if (!isPlainObject(data)) throw new MembershipValidationError();
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

function validateFinalizeMembershipPayload(data) {
  assertExactObject(data, ["groupId"]);
  assertGroupId(data.groupId);
  return data;
}

function validateListMyCurrentGroupMembershipsPayload(data) {
  if (!isPlainObject(data)) throw new MembershipValidationError();
  const keys = Object.keys(data);
  if (keys.some((key) => key !== "pageSize" && key !== "cursor")) {
    throw new MembershipValidationError("Request contains unknown properties");
  }
  const pageSize = Object.prototype.hasOwnProperty.call(data, "pageSize")
    ? data.pageSize
    : MY_GROUPS_DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MY_GROUPS_MAX_PAGE_SIZE) {
    throw new MembershipValidationError("Page size is invalid");
  }
  let cursor;
  if (Object.prototype.hasOwnProperty.call(data, "cursor")) {
    cursor = data.cursor;
    if (typeof cursor !== "string" || !cursor || cursor.length > MY_GROUPS_MAX_CURSOR_LENGTH) {
      throw new MembershipValidationError("Cursor is invalid");
    }
  }
  return Object.freeze(cursor === undefined ? { pageSize } : { pageSize, cursor });
}

module.exports = {
  IDEMPOTENCY_KEY_PATTERN,
  MY_GROUPS_DEFAULT_PAGE_SIZE,
  MY_GROUPS_MAX_CURSOR_LENGTH,
  MY_GROUPS_MAX_PAGE_SIZE,
  isPlainObject,
  validateCreateMembershipPayload,
  validateFinalizeMembershipPayload,
  validateGetMembershipPayload,
  validateListMyCurrentGroupMembershipsPayload,
};
