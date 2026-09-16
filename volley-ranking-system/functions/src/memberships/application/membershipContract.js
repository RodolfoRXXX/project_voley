"use strict";

const { MembershipValidationError } = require("./membershipErrors");

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;
const MY_GROUPS_DEFAULT_PAGE_SIZE = 20;
const MY_GROUPS_MAX_PAGE_SIZE = 20;
const MY_GROUPS_MAX_CURSOR_LENGTH = 2048;
const OWNER_ROSTER_DEFAULT_PAGE_SIZE = 20;
const OWNER_ROSTER_MAX_PAGE_SIZE = 20;
const OWNER_ROSTER_MAX_CURSOR_LENGTH = 2048;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

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
  if (typeof groupId !== "string" || !groupId.trim() || groupId !== groupId.trim() || groupId.includes("/")
    || Buffer.byteLength(groupId, "utf8") > 1500) {
    throw new MembershipValidationError("Group id is invalid");
  }
}

function assertDocumentId(value) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.includes("/")
    || Buffer.byteLength(value, "utf8") > 1500) throw new MembershipValidationError("Document id is invalid");
}

function validatePrepareActiveGroupMemberFinalizationPayload(data) {
  assertExactObject(data, ["groupId", "membershipId"]);
  assertGroupId(data.groupId);
  assertDocumentId(data.membershipId);
  return Object.freeze({ groupId: data.groupId, membershipId: data.membershipId });
}

function validateFinalizeActiveGroupMemberPayload(data) {
  assertExactObject(data, ["groupId", "membershipId", "activationRef", "idempotencyKey"]);
  assertGroupId(data.groupId);
  assertDocumentId(data.membershipId);
  if (typeof data.activationRef !== "string" || !SHA256_PATTERN.test(data.activationRef)) throw new MembershipValidationError("Activation reference is invalid");
  if (typeof data.idempotencyKey !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(data.idempotencyKey)) throw new MembershipValidationError("Idempotency key is invalid");
  return Object.freeze({ groupId: data.groupId, membershipId: data.membershipId, activationRef: data.activationRef, idempotencyKey: data.idempotencyKey });
}

function validateLeaveMyGroupMembershipPayload(data) {
  return validateCreateMembershipPayload(data);
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

function validateListActiveGroupMembersForOwnedGroupPayload(data) {
  if (!isPlainObject(data)) throw new MembershipValidationError();
  const keys = Object.keys(data);
  if (!Object.prototype.hasOwnProperty.call(data, "groupId")
    || keys.some((key) => !["groupId", "pageSize", "cursor"].includes(key))) {
    throw new MembershipValidationError("Request contains missing or unknown properties");
  }
  assertGroupId(data.groupId);
  const pageSize = Object.prototype.hasOwnProperty.call(data, "pageSize")
    ? data.pageSize
    : OWNER_ROSTER_DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > OWNER_ROSTER_MAX_PAGE_SIZE) {
    throw new MembershipValidationError("Page size is invalid");
  }
  let cursor;
  if (Object.prototype.hasOwnProperty.call(data, "cursor")) {
    cursor = data.cursor;
    if (typeof cursor !== "string" || !cursor || cursor.length > OWNER_ROSTER_MAX_CURSOR_LENGTH) {
      throw new MembershipValidationError("Cursor is invalid");
    }
  }
  return Object.freeze(cursor === undefined
    ? { groupId: data.groupId, pageSize }
    : { groupId: data.groupId, pageSize, cursor });
}

module.exports = {
  IDEMPOTENCY_KEY_PATTERN,
  MY_GROUPS_DEFAULT_PAGE_SIZE,
  MY_GROUPS_MAX_CURSOR_LENGTH,
  MY_GROUPS_MAX_PAGE_SIZE,
  OWNER_ROSTER_DEFAULT_PAGE_SIZE,
  OWNER_ROSTER_MAX_CURSOR_LENGTH,
  OWNER_ROSTER_MAX_PAGE_SIZE,
  isPlainObject,
  validateCreateMembershipPayload,
  validateFinalizeMembershipPayload,
  validateGetMembershipPayload,
  validateLeaveMyGroupMembershipPayload,
  validateListActiveGroupMembersForOwnedGroupPayload,
  validateListMyCurrentGroupMembershipsPayload,
  validatePrepareActiveGroupMemberFinalizationPayload,
  validateFinalizeActiveGroupMemberPayload,
};
