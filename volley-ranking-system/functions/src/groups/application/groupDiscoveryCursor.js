"use strict";

const crypto = require("node:crypto");
const { GroupValidationError } = require("./groupErrors");

const CONTRACT = "listExploreGroups:v1";
const ORDER = "publishedAt:desc,__name__:desc";
const DOMAIN = "sportexa:IUX-06A:explore-groups-cursor:v1";
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const HASH = /^[a-f0-9]{64}$/;

function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function exact(value, keys) {
  if (!plain(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && !actual.some((key, index) => key !== expected[index]);
}
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function checksum(payload) {
  const json = canonicalJson(payload);
  return crypto.createHash("sha256")
    .update(`${Buffer.byteLength(DOMAIN)}:${DOMAIN}${Buffer.byteLength(json)}:${json}`, "utf8")
    .digest("hex");
}
function validId(value) {
  return typeof value === "string" && value && value === value.trim() && !value.includes("/")
    && Buffer.byteLength(value, "utf8") <= 1500;
}
function validatePayload(payload) {
  if (!exact(payload, ["v", "contract", "order", "lastPublishedAt", "lastGroupId"])
    || payload.v !== 1 || payload.contract !== CONTRACT || payload.order !== ORDER
    || !validId(payload.lastGroupId) || !exact(payload.lastPublishedAt, ["seconds", "nanoseconds"])) {
    throw new GroupValidationError("Explore cursor is invalid");
  }
  const { seconds, nanoseconds } = payload.lastPublishedAt;
  if (!Number.isInteger(seconds) || seconds < -62135596800 || seconds > 253402300799
    || !Number.isInteger(nanoseconds) || nanoseconds < 0 || nanoseconds > 999999999) {
    throw new GroupValidationError("Explore cursor is invalid");
  }
  return Object.freeze({ seconds, nanoseconds, lastGroupId: payload.lastGroupId });
}
function encodeGroupDiscoveryCursor({ seconds, nanoseconds, lastGroupId }) {
  const payload = { v: 1, contract: CONTRACT, order: ORDER, lastPublishedAt: { seconds, nanoseconds }, lastGroupId };
  validatePayload(payload);
  return Buffer.from(canonicalJson({ payload, checksum: checksum(payload) }), "utf8").toString("base64url");
}
function decodeGroupDiscoveryCursor(token) {
  try {
    if (typeof token !== "string" || !token || token.length > 2048 || !BASE64URL.test(token) || token.includes("=")) {
      throw new GroupValidationError("Explore cursor is invalid");
    }
    const bytes = Buffer.from(token, "base64url");
    if (!bytes.length || bytes.toString("base64url") !== token) throw new GroupValidationError("Explore cursor is invalid");
    const json = bytes.toString("utf8");
    if (!Buffer.from(json, "utf8").equals(bytes)) throw new GroupValidationError("Explore cursor is invalid");
    const envelope = JSON.parse(json);
    if (json !== canonicalJson(envelope) || !exact(envelope, ["payload", "checksum"])
      || !HASH.test(envelope.checksum || "")) throw new GroupValidationError("Explore cursor is invalid");
    const expected = checksum(envelope.payload);
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(envelope.checksum))) {
      throw new GroupValidationError("Explore cursor is invalid");
    }
    return validatePayload(envelope.payload);
  } catch (error) {
    if (error instanceof GroupValidationError) throw error;
    throw new GroupValidationError("Explore cursor is invalid", { cause: error });
  }
}

module.exports = {
  CONTRACT,
  DOMAIN,
  ORDER,
  decodeGroupDiscoveryCursor,
  encodeGroupDiscoveryCursor,
};
