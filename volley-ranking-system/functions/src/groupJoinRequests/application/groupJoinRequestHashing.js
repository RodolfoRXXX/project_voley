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
function pendingGroupJoinRequestGuardId(groupId, personId) { return sha256LengthPrefixed(["sportexa:E2-06:pending-group-join-request-guard:v1", groupId, personId]); }
function groupJoinRequestIntentId(userId, key) { return sha256LengthPrefixed(["sportexa:E2-06:group-join-request-intent-id:v1", userId, key]); }
function groupJoinRequestHash(personId, groupId) { return sha256LengthPrefixed(["sportexa:E2-06:create-my-group-join-request:v1", "contract-v1", personId, groupId]); }
module.exports = { groupJoinRequestHash, groupJoinRequestIntentId, pendingGroupJoinRequestGuardId };
