"use strict";

const crypto = require("node:crypto");

function sha256LengthPrefixed(parts) {
  const hash = crypto.createHash("sha256");
  for (const part of parts) {
    const value = String(part);
    hash.update(String(Buffer.byteLength(value)), "utf8");
    hash.update(":", "utf8");
    hash.update(value, "utf8");
  }
  return hash.digest("hex");
}

function activeMembershipGuardId(groupId, personId) {
  return sha256LengthPrefixed(["sportexa:E2-03:active-membership-guard:v1", groupId, personId]);
}

function hashMembershipIdempotencyKey(userId, groupId, personId, key) {
  return sha256LengthPrefixed(["sportexa:E2-03:idempotency:v1", userId, groupId, personId, key]);
}

function hashMembershipRequest(userId, personId, groupId, seasonId) {
  return sha256LengthPrefixed(["sportexa:E2-03:request:v1", "contract-v1", userId, personId, groupId, seasonId]);
}

module.exports = { activeMembershipGuardId, hashMembershipIdempotencyKey, hashMembershipRequest, sha256LengthPrefixed };
