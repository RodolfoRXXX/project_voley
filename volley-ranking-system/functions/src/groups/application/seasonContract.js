"use strict";

const { SeasonCursorInvalidError, SeasonValidationError } = require("./seasonErrors");

const CREATE_SEASON_KEYS = Object.freeze(["groupId", "nombre", "fechaInicio", "idempotencyKey"]);
const CLOSE_SEASON_KEYS = Object.freeze(["groupId", "seasonId", "idempotencyKey"]);
const UPDATE_SEASON_KEYS = Object.freeze(["groupId", "seasonId", "nombre", "expectedEditToken", "idempotencyKey"]);
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;
const EDIT_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const SEASON_HISTORY_DEFAULT_PAGE_SIZE = 20;
const SEASON_HISTORY_MAX_PAGE_SIZE = 20;
const SEASON_HISTORY_MAX_CURSOR_LENGTH = 2048;

function assertExactObject(data, expectedKeys) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new SeasonValidationError();
  const keys = Object.keys(data).sort();
  const expected = [...expectedKeys].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new SeasonValidationError("Request contains missing or unknown properties");
  }
  return data;
}

function assertOpaqueId(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.includes("/")) {
    throw new SeasonValidationError(`${label} is invalid`);
  }
}

function validateCreateSeasonPayload(data) {
  assertExactObject(data, CREATE_SEASON_KEYS);
  assertOpaqueId(data.groupId, "Group id");
  if (typeof data.idempotencyKey !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(data.idempotencyKey)) {
    throw new SeasonValidationError("Idempotency key is invalid");
  }
  return data;
}

function validateCloseSeasonPayload(data) {
  assertExactObject(data, CLOSE_SEASON_KEYS);
  assertOpaqueId(data.groupId, "Group id");
  assertOpaqueId(data.seasonId, "Season id");
  if (typeof data.idempotencyKey !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(data.idempotencyKey)) {
    throw new SeasonValidationError("Idempotency key is invalid");
  }
  return data;
}

function validateUpdateSeasonPayload(data) {
  assertExactObject(data, UPDATE_SEASON_KEYS);
  assertOpaqueId(data.groupId, "Group id");
  assertOpaqueId(data.seasonId, "Season id");
  if (typeof data.nombre !== "string") throw new SeasonValidationError("Season name is invalid");
  if (typeof data.expectedEditToken !== "string" || !EDIT_TOKEN_PATTERN.test(data.expectedEditToken)) {
    throw new SeasonValidationError("Edit token is invalid");
  }
  if (typeof data.idempotencyKey !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(data.idempotencyKey)) {
    throw new SeasonValidationError("Idempotency key is invalid");
  }
  return data;
}

function validateOpenSeasonContextPayload(data) {
  assertExactObject(data, ["groupId"]);
  assertOpaqueId(data.groupId, "Group id");
  return data;
}

function validateOwnSeasonPayload(data) {
  assertExactObject(data, ["groupId", "seasonId"]);
  assertOpaqueId(data.groupId, "Group id");
  assertOpaqueId(data.seasonId, "Season id");
  return data;
}

function validateListSeasonsForOwnedGroupPayload(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new SeasonValidationError();
  const keys = Object.keys(data);
  if (!Object.prototype.hasOwnProperty.call(data, "groupId")
    || keys.some((key) => !["groupId", "pageSize", "cursor"].includes(key))) {
    throw new SeasonValidationError("Request contains missing or unknown properties");
  }
  assertOpaqueId(data.groupId, "Group id");
  const pageSize = Object.prototype.hasOwnProperty.call(data, "pageSize")
    ? data.pageSize : SEASON_HISTORY_DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > SEASON_HISTORY_MAX_PAGE_SIZE) {
    throw new SeasonValidationError("Page size is invalid");
  }
  if (!Object.prototype.hasOwnProperty.call(data, "cursor")) {
    return Object.freeze({ groupId: data.groupId, pageSize });
  }
  if (typeof data.cursor !== "string" || !data.cursor
    || data.cursor.length > SEASON_HISTORY_MAX_CURSOR_LENGTH) {
    throw new SeasonCursorInvalidError();
  }
  return Object.freeze({ groupId: data.groupId, pageSize, cursor: data.cursor });
}

module.exports = {
  CLOSE_SEASON_KEYS,
  CREATE_SEASON_KEYS,
  EDIT_TOKEN_PATTERN,
  IDEMPOTENCY_KEY_PATTERN,
  SEASON_HISTORY_DEFAULT_PAGE_SIZE,
  SEASON_HISTORY_MAX_CURSOR_LENGTH,
  SEASON_HISTORY_MAX_PAGE_SIZE,
  UPDATE_SEASON_KEYS,
  assertExactObject,
  validateCloseSeasonPayload,
  validateCreateSeasonPayload,
  validateOpenSeasonContextPayload,
  validateOwnSeasonPayload,
  validateUpdateSeasonPayload,
  validateListSeasonsForOwnedGroupPayload,
};
