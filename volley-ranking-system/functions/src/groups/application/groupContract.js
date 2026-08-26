"use strict";

const { GroupValidationError } = require("./groupErrors");

const CREATION_KEYS = Object.freeze(["nombre", "deporte", "idempotencyKey"]);
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

function assertExactObject(data, expectedKeys) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new GroupValidationError();
  const keys = Object.keys(data).sort();
  const expected = [...expectedKeys].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new GroupValidationError("Request contains missing or unknown properties");
  }
  return data;
}

function validateCreateGroupPayload(data) {
  assertExactObject(data, CREATION_KEYS);
  if (typeof data.idempotencyKey !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(data.idempotencyKey)) {
    throw new GroupValidationError("Idempotency key is invalid");
  }
  return data;
}

function validateEmptyPayload(data) {
  if (data == null) return {};
  return assertExactObject(data, []);
}

function validateGroupIdPayload(data) {
  assertExactObject(data, ["groupId"]);
  if (typeof data.groupId !== "string" || !data.groupId.trim() || data.groupId !== data.groupId.trim() || data.groupId.includes("/")) {
    throw new GroupValidationError("Group id is invalid");
  }
  return data;
}

module.exports = {
  CREATION_KEYS,
  IDEMPOTENCY_KEY_PATTERN,
  assertExactObject,
  validateCreateGroupPayload,
  validateEmptyPayload,
  validateGroupIdPayload,
};
