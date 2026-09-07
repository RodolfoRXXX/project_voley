"use strict";
const crypto = require("node:crypto");
const { GroupJoinRequestValidationError } = require("./groupJoinRequestErrors");

const CONTRACT = "listPendingGroupJoinRequestsForOwnedGroup:v1";
const ORDER = "createdAt:desc,__name__:desc";
const DOMAIN = "sportexa:E2-06:pending-group-join-requests-cursor:v1";
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const HASH = /^[a-f0-9]{64}$/;

function plain(value) { if (!value || typeof value !== "object" || Array.isArray(value)) return false; const p = Object.getPrototypeOf(value); return p === Object.prototype || p === null; }
function exact(value, keys) { if (!plain(value)) return false; const a = Object.keys(value).sort(); const b = [...keys].sort(); return a.length === b.length && !a.some((key, index) => key !== b[index]); }
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function checksum(payload) {
  const json = canonicalJson(payload);
  return crypto.createHash("sha256").update(`${Buffer.byteLength(DOMAIN)}:${DOMAIN}${Buffer.byteLength(json)}:${json}`, "utf8").digest("hex");
}
function validId(value) { return typeof value === "string" && value && value.trim() === value && !value.includes("/") && Buffer.byteLength(value, "utf8") <= 1500; }
function validatePayload(payload, expectedGroupId) {
  if (!exact(payload, ["v", "contract", "order", "groupId", "lastCreatedAt", "lastRequestId"]) || payload.v !== 1 || payload.contract !== CONTRACT || payload.order !== ORDER || payload.groupId !== expectedGroupId || !validId(payload.groupId) || !validId(payload.lastRequestId) || !exact(payload.lastCreatedAt, ["seconds", "nanoseconds"])) throw new GroupJoinRequestValidationError();
  const { seconds, nanoseconds } = payload.lastCreatedAt;
  if (!Number.isInteger(seconds) || seconds < -62135596800 || seconds > 253402300799 || !Number.isInteger(nanoseconds) || nanoseconds < 0 || nanoseconds > 999999999) throw new GroupJoinRequestValidationError();
  return Object.freeze({ seconds, nanoseconds, lastRequestId: payload.lastRequestId });
}
function encodeGroupJoinRequestCursor({ groupId, seconds, nanoseconds, lastRequestId }) {
  const payload = { v: 1, contract: CONTRACT, order: ORDER, groupId, lastCreatedAt: { seconds, nanoseconds }, lastRequestId };
  validatePayload(payload, groupId);
  return Buffer.from(canonicalJson({ payload, checksum: checksum(payload) }), "utf8").toString("base64url");
}
function decodeGroupJoinRequestCursor(token, groupId) {
  try {
    if (typeof token !== "string" || !token || token.length > 2048 || !BASE64URL.test(token) || token.includes("=")) throw new GroupJoinRequestValidationError();
    const bytes = Buffer.from(token, "base64url");
    if (!bytes.length || bytes.toString("base64url") !== token) throw new GroupJoinRequestValidationError();
    const json = bytes.toString("utf8");
    if (!Buffer.from(json, "utf8").equals(bytes)) throw new GroupJoinRequestValidationError();
    const envelope = JSON.parse(json);
    if (json !== canonicalJson(envelope) || !exact(envelope, ["payload", "checksum"]) || !HASH.test(envelope.checksum || "")) throw new GroupJoinRequestValidationError();
    const expected = checksum(envelope.payload);
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(envelope.checksum))) throw new GroupJoinRequestValidationError();
    return validatePayload(envelope.payload, groupId);
  } catch (error) {
    if (error instanceof GroupJoinRequestValidationError) throw error;
    throw new GroupJoinRequestValidationError({ cause: error });
  }
}
module.exports = { CONTRACT, DOMAIN, ORDER, canonicalJson, decodeGroupJoinRequestCursor, encodeGroupJoinRequestCursor };
