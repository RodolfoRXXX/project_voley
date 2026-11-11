"use strict";

const crypto = require("node:crypto");
const { GroupJoinRequestValidationError } = require("./groupJoinRequestErrors");

const CONTRACT = "listMyPendingGroupJoinRequests:v1";
const ORDER = "createdAt:desc,__name__:desc";
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function personHash(personId) {
  return crypto.createHash("sha256").update(`sportexa:IUX-06B:person\0${personId}`, "utf8").digest("hex");
}
function validId(value) { return typeof value === "string" && value && value.trim() === value && !value.includes("/") && Buffer.byteLength(value, "utf8") <= 1500; }
function encodeOwnGroupJoinRequestCursor({ personId, createdAt, requestId }) {
  if (!validId(personId) || !validId(requestId) || !createdAt) throw new GroupJoinRequestValidationError();
  return Buffer.from(JSON.stringify({ v: 1, contract: CONTRACT, order: ORDER, personHash: personHash(personId), seconds: createdAt.seconds, nanoseconds: createdAt.nanoseconds, requestId }), "utf8").toString("base64url");
}
function decodeOwnGroupJoinRequestCursor(token, personId) {
  try {
    if (typeof token !== "string" || !token || token.length > 2048 || !BASE64URL.test(token) || token.includes("=")) throw new GroupJoinRequestValidationError();
    const bytes = Buffer.from(token, "base64url");
    if (!bytes.length || bytes.toString("base64url") !== token) throw new GroupJoinRequestValidationError();
    const value = JSON.parse(bytes.toString("utf8"));
    if (value?.v !== 1 || value.contract !== CONTRACT || value.order !== ORDER || value.personHash !== personHash(personId)
      || !Number.isInteger(value.seconds) || !Number.isInteger(value.nanoseconds) || value.nanoseconds < 0 || value.nanoseconds > 999999999
      || !validId(value.requestId) || JSON.stringify(value) !== bytes.toString("utf8")) throw new GroupJoinRequestValidationError();
    return Object.freeze({ seconds: value.seconds, nanoseconds: value.nanoseconds, requestId: value.requestId });
  } catch (error) {
    if (error instanceof GroupJoinRequestValidationError) throw error;
    throw new GroupJoinRequestValidationError();
  }
}

module.exports = { CONTRACT, ORDER, decodeOwnGroupJoinRequestCursor, encodeOwnGroupJoinRequestCursor };
