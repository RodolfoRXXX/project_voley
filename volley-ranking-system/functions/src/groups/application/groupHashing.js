"use strict";

const crypto = require("node:crypto");

function sha256(parts) {
  const hash = crypto.createHash("sha256");
  for (const part of parts) {
    const value = String(part);
    hash.update(String(Buffer.byteLength(value)), "utf8");
    hash.update(":", "utf8");
    hash.update(value, "utf8");
  }
  return hash.digest("hex");
}

function hashIdempotencyKey(userId, key) {
  return sha256(["sportexa:E2-01:idempotency:v1", userId, key]);
}

function hashGroupRequest(userId, group) {
  return sha256(["sportexa:E2-01:request:v1", userId, "contract-v1", group.nombre, group.deporte]);
}

function groupEditToken(group) {
  return sha256(["sportexa:E2-20:group-edit-token:v1", "contract-v1", group.groupId, group.ownerId, group.nombre]);
}

function groupNameUpdateReceiptId(actorUserId, idempotencyKey) {
  return sha256(["sportexa:E2-20:group-name-update-receipt:v1", actorUserId, idempotencyKey]);
}

function hashGroupNameUpdateRequest(actorUserId, input) {
  return sha256(["sportexa:E2-20:group-name-update-request:v1", "contract-v1", actorUserId,
    input.groupId, input.nombre, input.expectedEditToken, input.idempotencyKey]);
}

module.exports = { groupEditToken, groupNameUpdateReceiptId, hashGroupNameUpdateRequest, hashGroupRequest, hashIdempotencyKey, sha256 };
