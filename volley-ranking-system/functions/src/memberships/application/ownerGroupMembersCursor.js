"use strict";

const crypto = require("node:crypto");
const { MembershipValidationError } = require("./membershipErrors");
const { OWNER_ROSTER_MAX_CURSOR_LENGTH } = require("./membershipContract");

const OWNER_ROSTER_CURSOR_CONTRACT = "listActiveGroupMembersForOwnedGroup:v1";
const OWNER_ROSTER_CURSOR_ORDER = "fechaIngreso:asc,__name__:asc";
const OWNER_ROSTER_CURSOR_DOMAIN = "sportexa:E2-11:owner-active-roster-cursor:v1";
const OWNER_ROSTER_ACTOR_DOMAIN = "sportexa:E2-11:owner-active-roster-actor:v1";
const FIRESTORE_MIN_SECONDS = -62135596800;
const FIRESTORE_MAX_SECONDS = 253402300799;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length && !actual.some((key, index) => key !== sorted[index]);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function domainHash(domain, value) {
  const text = String(value);
  return crypto.createHash("sha256")
    .update(`${Buffer.byteLength(domain)}:${domain}${Buffer.byteLength(text)}:${text}`, "utf8")
    .digest("hex");
}

function ownerHash(userId) {
  return domainHash(OWNER_ROSTER_ACTOR_DOMAIN, userId);
}

function checksum(payload) {
  return domainHash(OWNER_ROSTER_CURSOR_DOMAIN, canonicalJson(payload));
}

function validId(value) {
  return typeof value === "string" && value && value.trim() === value
    && !value.includes("/") && Buffer.byteLength(value, "utf8") <= 1500;
}

function decodeUtf8Strict(bytes) {
  const decoded = bytes.toString("utf8");
  if (!Buffer.from(decoded, "utf8").equals(bytes)) throw new MembershipValidationError("Cursor UTF-8 is invalid");
  return decoded;
}

function assertPayload(payload, { groupId, userId }) {
  if (!exactKeys(payload, ["v", "contract", "order", "groupId", "seasonId", "ownerHash", "lastFechaIngreso", "lastMembershipId"])) {
    throw new MembershipValidationError("Cursor payload is invalid");
  }
  if (payload.v !== 1 || payload.contract !== OWNER_ROSTER_CURSOR_CONTRACT || payload.order !== OWNER_ROSTER_CURSOR_ORDER) {
    throw new MembershipValidationError("Cursor version or order is invalid");
  }
  if (!validId(payload.groupId) || payload.groupId !== groupId || !validId(payload.seasonId)
    || !HASH_PATTERN.test(payload.ownerHash) || payload.ownerHash !== ownerHash(userId)) {
    throw new MembershipValidationError("Cursor context is invalid");
  }
  if (!exactKeys(payload.lastFechaIngreso, ["seconds", "nanoseconds"])) throw new MembershipValidationError("Cursor timestamp is invalid");
  const { seconds, nanoseconds } = payload.lastFechaIngreso;
  if (!Number.isInteger(seconds) || seconds < FIRESTORE_MIN_SECONDS || seconds > FIRESTORE_MAX_SECONDS
    || !Number.isInteger(nanoseconds) || nanoseconds < 0 || nanoseconds > 999999999 || !validId(payload.lastMembershipId)) {
    throw new MembershipValidationError("Cursor position is invalid");
  }
  return Object.freeze({ seasonId: payload.seasonId, seconds, nanoseconds, lastMembershipId: payload.lastMembershipId });
}

function encodeOwnerGroupMembersCursor({ groupId, seasonId, userId, seconds, nanoseconds, lastMembershipId }) {
  const payload = {
    v: 1,
    contract: OWNER_ROSTER_CURSOR_CONTRACT,
    order: OWNER_ROSTER_CURSOR_ORDER,
    groupId,
    seasonId,
    ownerHash: ownerHash(userId),
    lastFechaIngreso: { seconds, nanoseconds },
    lastMembershipId,
  };
  assertPayload(payload, { groupId, userId });
  return Buffer.from(canonicalJson({ payload, checksum: checksum(payload) }), "utf8").toString("base64url");
}

function decodeOwnerGroupMembersCursor(token, { groupId, userId }) {
  try {
    if (typeof token !== "string" || !token || token.length > OWNER_ROSTER_MAX_CURSOR_LENGTH
      || !BASE64URL_PATTERN.test(token) || token.includes("=")) throw new MembershipValidationError("Cursor encoding is invalid");
    const bytes = Buffer.from(token, "base64url");
    if (!bytes.length || bytes.toString("base64url") !== token) throw new MembershipValidationError("Cursor encoding is invalid");
    const decoded = decodeUtf8Strict(bytes);
    const envelope = JSON.parse(decoded);
    if (decoded !== canonicalJson(envelope) || !exactKeys(envelope, ["payload", "checksum"])
      || !HASH_PATTERN.test(envelope.checksum || "") || envelope.checksum !== checksum(envelope.payload)) {
      throw new MembershipValidationError("Cursor envelope is invalid");
    }
    return assertPayload(envelope.payload, { groupId, userId });
  } catch (error) {
    if (error instanceof MembershipValidationError) throw error;
    throw new MembershipValidationError("Cursor is invalid", { cause: error });
  }
}

module.exports = {
  OWNER_ROSTER_ACTOR_DOMAIN,
  OWNER_ROSTER_CURSOR_CONTRACT,
  OWNER_ROSTER_CURSOR_DOMAIN,
  OWNER_ROSTER_CURSOR_ORDER,
  canonicalJson,
  decodeOwnerGroupMembersCursor,
  decodeUtf8Strict,
  encodeOwnerGroupMembersCursor,
  ownerHash,
};
