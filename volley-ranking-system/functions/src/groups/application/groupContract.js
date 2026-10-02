"use strict";

const { GroupValidationError } = require("./groupErrors");

const CREATION_KEYS = Object.freeze(["nombre", "deporte", "idempotencyKey"]);
const UPDATE_NAME_KEYS = Object.freeze(["groupId", "nombre", "expectedEditToken", "idempotencyKey"]);
const ARCHIVE_KEYS = Object.freeze(["groupId", "expectedArchiveToken", "idempotencyKey"]);
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;
const EDIT_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

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

function validateUpdateOwnGroupNamePayload(data) {
  assertExactObject(data, UPDATE_NAME_KEYS);
  if (typeof data.groupId !== "string" || data.groupId !== data.groupId.trim()
    || Buffer.byteLength(data.groupId, "utf8") < 1 || Buffer.byteLength(data.groupId, "utf8") > 1500
    || data.groupId.includes("/") || data.groupId === "." || data.groupId === ".." || /^__[\s\S]*__$/.test(data.groupId)) {
    throw new GroupValidationError("Group id is invalid");
  }
  if (typeof data.nombre !== "string") throw new GroupValidationError("Group name is invalid");
  if (typeof data.expectedEditToken !== "string" || !EDIT_TOKEN_PATTERN.test(data.expectedEditToken)) {
    throw new GroupValidationError("Edit token is invalid");
  }
  if (typeof data.idempotencyKey !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(data.idempotencyKey)) {
    throw new GroupValidationError("Idempotency key is invalid");
  }
  return data;
}

function validateArchiveOwnGroupPayload(data) {
  assertExactObject(data, ARCHIVE_KEYS);
  validateGroupIdPayload({ groupId: data.groupId });
  if (typeof data.expectedArchiveToken !== "string" || !EDIT_TOKEN_PATTERN.test(data.expectedArchiveToken)) {
    throw new GroupValidationError("Archive token is invalid");
  }
  if (typeof data.idempotencyKey !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(data.idempotencyKey)) {
    throw new GroupValidationError("Idempotency key is invalid");
  }
  return data;
}

module.exports = {
  ARCHIVE_KEYS,
  CREATION_KEYS,
  EDIT_TOKEN_PATTERN,
  IDEMPOTENCY_KEY_PATTERN,
  UPDATE_NAME_KEYS,
  assertExactObject,
  validateCreateGroupPayload,
  validateArchiveOwnGroupPayload,
  validateEmptyPayload,
  validateGroupIdPayload,
  validateUpdateOwnGroupNamePayload,
};
