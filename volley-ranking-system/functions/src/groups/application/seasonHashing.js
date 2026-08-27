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

module.exports = { hashSeasonIdempotencyKey, hashSeasonRequest };
