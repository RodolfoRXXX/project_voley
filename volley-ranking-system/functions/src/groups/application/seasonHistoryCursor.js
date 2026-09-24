"use strict";

const crypto = require("node:crypto");
const { normalizeStartDate } = require("../domain/season");
const { SeasonCursorInvalidError } = require("./seasonErrors");
const { SEASON_HISTORY_MAX_CURSOR_LENGTH } = require("./seasonContract");

const CURSOR_VERSION = 1;
const CURSOR_CONTRACT = "listSeasonsForOwnedGroup:v1";
const SUBJECT_DOMAIN = "sportexa:E2-16:list-seasons-for-owned-group:subject:v1";
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const SUBJECT_HASH_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return keys.length === wanted.length && keys.every((key, index) => key === wanted[index]);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function validId(value) {
  return typeof value === "string" && value.length > 0 && value.trim() === value
    && !value.includes("/") && Buffer.byteLength(value, "utf8") <= 1500;
}

function subjectHash(userId) {
  if (!validId(userId)) throw new SeasonCursorInvalidError("Cursor actor is invalid");
  return crypto.createHash("sha256").update(`${SUBJECT_DOMAIN}\0${userId}`, "utf8").digest("base64url");
}

function assertPayload(payload) {
  if (!hasExactKeys(payload, ["v", "contract", "groupId", "subjectHash", "currentSeasonId", "last"])
    || payload.v !== CURSOR_VERSION || payload.contract !== CURSOR_CONTRACT
    || !validId(payload.groupId) || !SUBJECT_HASH_PATTERN.test(payload.subjectHash || "")
    || !(payload.currentSeasonId === null || validId(payload.currentSeasonId))
    || !hasExactKeys(payload.last, ["fechaInicio", "seasonId"]) || !validId(payload.last.seasonId)) {
    throw new SeasonCursorInvalidError();
  }
  try {
    if (normalizeStartDate(payload.last.fechaInicio) !== payload.last.fechaInicio) throw new Error("non-canonical");
  } catch (error) {
    throw new SeasonCursorInvalidError("Cursor date is invalid", { cause: error });
  }
  return payload;
}

function encodeSeasonHistoryCursor({ groupId, userId, currentSeasonId, last }) {
  const payload = assertPayload({
    v: CURSOR_VERSION,
    contract: CURSOR_CONTRACT,
    groupId,
    subjectHash: subjectHash(userId),
    currentSeasonId,
    last: { fechaInicio: last.fechaInicio, seasonId: last.seasonId },
  });
  return Buffer.from(canonicalJson(payload), "utf8").toString("base64url");
}

function decodeSeasonHistoryCursor(token, { groupId, userId }) {
  try {
    if (typeof token !== "string" || !token || token.length > SEASON_HISTORY_MAX_CURSOR_LENGTH
      || !BASE64URL_PATTERN.test(token) || token.includes("=")) throw new SeasonCursorInvalidError();
    const bytes = Buffer.from(token, "base64url");
    if (!bytes.length || bytes.toString("base64url") !== token) throw new SeasonCursorInvalidError();
    const json = bytes.toString("utf8");
    if (!Buffer.from(json, "utf8").equals(bytes)) throw new SeasonCursorInvalidError();
    const payload = assertPayload(JSON.parse(json));
    if (json !== canonicalJson(payload) || payload.groupId !== groupId
      || payload.subjectHash !== subjectHash(userId)) throw new SeasonCursorInvalidError();
    return Object.freeze({
      currentSeasonId: payload.currentSeasonId,
      last: Object.freeze({ ...payload.last }),
    });
  } catch (error) {
    if (error instanceof SeasonCursorInvalidError) throw error;
    throw new SeasonCursorInvalidError(undefined, { cause: error });
  }
}

module.exports = {
  CURSOR_CONTRACT,
  CURSOR_VERSION,
  SUBJECT_DOMAIN,
  canonicalJson,
  decodeSeasonHistoryCursor,
  encodeSeasonHistoryCursor,
  subjectHash,
};
