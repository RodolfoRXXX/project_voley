"use strict";

const crypto = require("node:crypto");
const { MembershipValidationError } = require("./membershipErrors");
const { MY_GROUPS_MAX_CURSOR_LENGTH } = require("./membershipContract");

const CURSOR_CONTRACT = "listMyCurrentGroupMemberships:v1";
const CURSOR_ORDER = "fechaIngreso:desc,__name__:desc";
const CURSOR_DOMAIN = "sportexa:E2-04:my-current-group-memberships-cursor:v1";
const FIRESTORE_MIN_SECONDS = -62135596800;
const FIRESTORE_MAX_SECONDS = 253402300799;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return keys.length === sorted.length && !keys.some((key, index) => key !== sorted[index]);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function checksum(payload) {
  const canonical = canonicalJson(payload);
  return crypto.createHash("sha256")
    .update(`${Buffer.byteLength(CURSOR_DOMAIN)}:${CURSOR_DOMAIN}${Buffer.byteLength(canonical)}:${canonical}`, "utf8")
    .digest("hex");
}

function decodeUtf8Strict(bytes) {
  const decoded = bytes.toString("utf8");
  if (!Buffer.from(decoded, "utf8").equals(bytes)) {
    throw new MembershipValidationError("Cursor UTF-8 is invalid");
  }
  return decoded;
}

function assertCursorPayload(payload) {
  if (!hasExactKeys(payload, ["v", "contract", "order", "lastFechaIngreso", "lastMembershipId"])) {
    throw new MembershipValidationError("Cursor payload is invalid");
  }
  if (payload.v !== 1 || payload.contract !== CURSOR_CONTRACT || payload.order !== CURSOR_ORDER) {
    throw new MembershipValidationError("Cursor version or order is invalid");
  }
  if (!hasExactKeys(payload.lastFechaIngreso, ["seconds", "nanoseconds"])) {
    throw new MembershipValidationError("Cursor timestamp is invalid");
  }
  const { seconds, nanoseconds } = payload.lastFechaIngreso;
  if (!Number.isInteger(seconds) || seconds < FIRESTORE_MIN_SECONDS || seconds > FIRESTORE_MAX_SECONDS
    || !Number.isInteger(nanoseconds) || nanoseconds < 0 || nanoseconds > 999999999) {
    throw new MembershipValidationError("Cursor timestamp is invalid");
  }
  const id = payload.lastMembershipId;
  if (typeof id !== "string" || !id || id.trim() !== id || id.includes("/") || Buffer.byteLength(id, "utf8") > 1500) {
    throw new MembershipValidationError("Cursor Membership id is invalid");
  }
  return Object.freeze({ seconds, nanoseconds, lastMembershipId: id });
}

function encodeMyGroupsCursor({ seconds, nanoseconds, lastMembershipId }) {
  const payload = {
    v: 1,
    contract: CURSOR_CONTRACT,
    order: CURSOR_ORDER,
    lastFechaIngreso: { seconds, nanoseconds },
    lastMembershipId,
  };
  assertCursorPayload(payload);
  const envelope = { payload, checksum: checksum(payload) };
  return Buffer.from(canonicalJson(envelope), "utf8").toString("base64url");
}

function decodeMyGroupsCursor(token) {
  try {
    if (typeof token !== "string" || !token || token.length > MY_GROUPS_MAX_CURSOR_LENGTH
      || !BASE64URL_PATTERN.test(token) || token.includes("=")) {
      throw new MembershipValidationError("Cursor encoding is invalid");
    }
    const bytes = Buffer.from(token, "base64url");
    if (!bytes.length || bytes.toString("base64url") !== token) throw new MembershipValidationError("Cursor encoding is invalid");
    const decoded = decodeUtf8Strict(bytes);
    const envelope = JSON.parse(decoded);
    if (decoded !== canonicalJson(envelope)) throw new MembershipValidationError("Cursor JSON is not canonical");
    if (!hasExactKeys(envelope, ["payload", "checksum"]) || !HASH_PATTERN.test(envelope.checksum || "")) {
      throw new MembershipValidationError("Cursor envelope is invalid");
    }
    const position = assertCursorPayload(envelope.payload);
    const expected = checksum(envelope.payload);
    const actual = envelope.checksum;
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
      throw new MembershipValidationError("Cursor checksum is invalid");
    }
    return position;
  } catch (error) {
    if (error instanceof MembershipValidationError) throw error;
    throw new MembershipValidationError("Cursor is invalid", { cause: error });
  }
}

module.exports = {
  CURSOR_CONTRACT,
  CURSOR_DOMAIN,
  CURSOR_ORDER,
  canonicalJson,
  decodeUtf8Strict,
  decodeMyGroupsCursor,
  encodeMyGroupsCursor,
};
