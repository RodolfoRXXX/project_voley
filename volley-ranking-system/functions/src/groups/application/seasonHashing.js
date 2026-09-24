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

function hashSeasonIdempotencyKey(groupId, key) {
  return sha256(["sportexa:E2-02:idempotency:v1", groupId, key]);
}

function hashSeasonRequest(season) {
  return sha256([
    "sportexa:E2-02:request:v1",
    "contract-v1",
    season.groupId,
    season.nombre,
    season.fechaInicio,
  ]);
}

function seasonOpeningReceiptId(actorUserId, key) { return sha256(["sportexa:E2-15:season-opening-receipt:v2", actorUserId, key]); }
function hashSeasonOpeningRequest(actorUserId, season) { return sha256(["sportexa:E2-15:season-opening-request:v2", "contract-v2", actorUserId, season.groupId, season.nombre, season.fechaInicio]); }
function legacySeasonOpeningReceiptId(groupId, idempotencyKeyHash) { return sha256(["sportexa:E2-15:season-opening-legacy-receipt:v1", groupId, idempotencyKeyHash]); }
function seasonClosureReceiptId(actorUserId, key) { return sha256(["sportexa:E2-15:season-closure-receipt:v1", actorUserId, key]); }
function hashSeasonClosureRequest(actorUserId, groupId, seasonId) { return sha256(["sportexa:E2-15:season-closure-request:v1", "contract-v1", actorUserId, groupId, seasonId]); }

function canonicalTimestamp(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") throw new TypeError("Timestamp is required");
  const seconds = Number.isInteger(timestamp.seconds) ? timestamp.seconds : Math.floor(timestamp.toDate().getTime() / 1000);
  const nanoseconds = Number.isInteger(timestamp.nanoseconds) ? timestamp.nanoseconds : (timestamp.toDate().getTime() % 1000) * 1000000;
  return `${seconds}:${nanoseconds}`;
}

function seasonEditToken(season) {
  return sha256(["sportexa:E2-17:season-edit-token:v1", "contract-v1", season.groupId, season.seasonId,
    season.schemaVersion, season.estado, season.nombre, season.fechaInicio, canonicalTimestamp(season.createdAt)]);
}
function seasonUpdateReceiptId(actorUserId, key) { return sha256(["sportexa:E2-17:season-update-receipt:v1", actorUserId, key]); }
function hashSeasonUpdateRequest(actorUserId, input) {
  return sha256(["sportexa:E2-17:season-update-request:v1", "contract-v1", actorUserId, input.groupId,
    input.seasonId, input.nombre, input.expectedEditToken]);
}

module.exports = { canonicalTimestamp, hashSeasonClosureRequest, hashSeasonIdempotencyKey, hashSeasonOpeningRequest,
  hashSeasonRequest, hashSeasonUpdateRequest, legacySeasonOpeningReceiptId, seasonClosureReceiptId, seasonEditToken,
  seasonOpeningReceiptId, seasonUpdateReceiptId, sha256 };
