"use strict";

const crypto = require("node:crypto");
const { MembershipCursorInvalidError } = require("./membershipErrors");
const { OWN_HISTORY_MAX_CURSOR_LENGTH } = require("./membershipContract");

const CURSOR_VERSION = 1;
const CURSOR_CONTRACT = "listMyGroupMembershipHistory:v1";
const CURSOR_ORDER = "fechaIngreso:desc,__name__:desc";
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const FIRESTORE_MIN_SECONDS = -62135596800;
const FIRESTORE_MAX_SECONDS = 253402300799;

function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exact(value, expected) {
  if (!plain(value)) return false;
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return keys.length === wanted.length && keys.every((key, index) => key === wanted[index]);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function validId(value) {
  return typeof value === "string" && value.length > 0 && value.trim() === value
    && !value.includes("/") && Buffer.byteLength(value, "utf8") <= 1500;
}

function contextualHash(domain, value) {
  if (!validId(value)) throw new MembershipCursorInvalidError();
  return crypto.createHash("sha256").update(`${domain}\0${value}`, "utf8").digest("hex");
}

function actorHash(uid) { return contextualHash("E2-19:actor:v1", uid); }
function personHash(personId) { return contextualHash("E2-19:person:v1", personId); }

function assertPayload(payload) {
  if (!exact(payload, ["v", "contract", "order", "actorHash", "personHash", "lastFechaIngreso", "membershipId"])
    || payload.v !== CURSOR_VERSION || payload.contract !== CURSOR_CONTRACT || payload.order !== CURSOR_ORDER
    || !HASH_PATTERN.test(payload.actorHash || "") || !HASH_PATTERN.test(payload.personHash || "")
    || !exact(payload.lastFechaIngreso, ["seconds", "nanoseconds"]) || !validId(payload.membershipId)) {
    throw new MembershipCursorInvalidError();
  }
  const { seconds, nanoseconds } = payload.lastFechaIngreso;
  if (!Number.isSafeInteger(seconds) || seconds < FIRESTORE_MIN_SECONDS || seconds > FIRESTORE_MAX_SECONDS
    || !Number.isSafeInteger(nanoseconds) || nanoseconds < 0 || nanoseconds > 999999999) {
    throw new MembershipCursorInvalidError();
  }
  return payload;
}

function encodeOwnGroupMembershipHistoryCursor({ uid, personId, lastFechaIngreso, membershipId }) {
  const payload = assertPayload({
    v: CURSOR_VERSION,
    contract: CURSOR_CONTRACT,
    order: CURSOR_ORDER,
    actorHash: actorHash(uid),
    personHash: personHash(personId),
    lastFechaIngreso: { seconds: lastFechaIngreso.seconds, nanoseconds: lastFechaIngreso.nanoseconds },
    membershipId,
  });
  return Buffer.from(canonicalJson(payload), "utf8").toString("base64url");
}

function decodeOwnGroupMembershipHistoryCursor(token, { uid, personId }) {
  try {
    if (typeof token !== "string" || !token || token.length > OWN_HISTORY_MAX_CURSOR_LENGTH
      || !BASE64URL_PATTERN.test(token) || token.includes("=")) throw new MembershipCursorInvalidError();
    const bytes = Buffer.from(token, "base64url");
    if (!bytes.length || bytes.toString("base64url") !== token) throw new MembershipCursorInvalidError();
    const json = bytes.toString("utf8");
    if (!Buffer.from(json, "utf8").equals(bytes)) throw new MembershipCursorInvalidError();
    const payload = assertPayload(JSON.parse(json));
    if (json !== canonicalJson(payload) || payload.actorHash !== actorHash(uid) || payload.personHash !== personHash(personId)) {
      throw new MembershipCursorInvalidError();
    }
    return Object.freeze({
      lastFechaIngreso: Object.freeze({ ...payload.lastFechaIngreso }),
      membershipId: payload.membershipId,
    });
  } catch (error) {
    if (error instanceof MembershipCursorInvalidError) throw error;
    throw new MembershipCursorInvalidError(undefined, { cause: error });
  }
}

module.exports = {
  CURSOR_CONTRACT,
  CURSOR_ORDER,
  CURSOR_VERSION,
  actorHash,
  canonicalJson,
  decodeOwnGroupMembershipHistoryCursor,
  encodeOwnGroupMembershipHistoryCursor,
  personHash,
};
