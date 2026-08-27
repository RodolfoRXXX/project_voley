"use strict";

const { SeasonValidationError } = require("./seasonErrors");

const CREATE_SEASON_KEYS = Object.freeze(["groupId", "nombre", "fechaInicio", "idempotencyKey"]);
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

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

module.exports = {
  CREATE_SEASON_KEYS,
  IDEMPOTENCY_KEY_PATTERN,
  assertExactObject,
  validateCreateSeasonPayload,
  validateOpenSeasonContextPayload,
  validateOwnSeasonPayload,
};
