"use strict";

const HASH = /^[a-f0-9]{64}$/;
const OPENING_V1_FIELDS = Object.freeze(["action", "groupId", "seasonId", "idempotencyKeyHash", "requestHash", "outcome", "openedAt", "confirmedAt", "receiptVersion"]);
const OPENING_V2_FIELDS = Object.freeze(["action", "actorUserId", "groupId", "seasonId", "idempotencyKeyHash", "requestHash", "outcome", "openedAt", "confirmedAt", "receiptVersion"]);
const CLOSURE_FIELDS = Object.freeze(["action", "actorUserId", "groupId", "seasonId", "idempotencyKeyHash", "requestHash", "outcome", "closedAt", "confirmedAt", "receiptVersion"]);

function exact(data, fields) { if (!data || typeof data !== "object" || Array.isArray(data)) return false; const keys = Object.keys(data).sort(); const expected = [...fields].sort(); return keys.length === expected.length && !keys.some((key, index) => key !== expected[index]); }
function validId(value) { return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/"); }
function validTimestamp(value) { return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime()); }
function sameTimestamp(left, right) { return validTimestamp(left) && validTimestamp(right) && left.toDate().getTime() === right.toDate().getTime(); }

function hydrateOpeningReceipt(snapshot, expectedId) {
  if (!snapshot.exists) return null;
  const data = snapshot.data(); const v1 = data?.receiptVersion === 1; const fields = v1 ? OPENING_V1_FIELDS : OPENING_V2_FIELDS;
  const valid = snapshot.id === expectedId && exact(data, fields) && data.action === "OPEN_SEASON" && data.outcome === "OPENED"
    && validId(data.groupId) && validId(data.seasonId) && HASH.test(data.idempotencyKeyHash || "") && HASH.test(data.requestHash || "")
    && validTimestamp(data.openedAt) && sameTimestamp(data.openedAt, data.confirmedAt) && (v1 || (data.receiptVersion === 2 && validId(data.actorUserId)));
  if (!valid) throw new Error("OPENING_RECEIPT_INCOMPATIBLE");
  return Object.freeze(data);
}

function hydrateClosureReceipt(snapshot, expectedId) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const valid = snapshot.id === expectedId && exact(data, CLOSURE_FIELDS) && data.action === "CLOSE_SEASON" && data.outcome === "CLOSED" && data.receiptVersion === 1
    && validId(data.actorUserId) && validId(data.groupId) && validId(data.seasonId) && HASH.test(data.idempotencyKeyHash || "") && HASH.test(data.requestHash || "")
    && validTimestamp(data.closedAt) && sameTimestamp(data.closedAt, data.confirmedAt);
  if (!valid) throw new Error("CLOSURE_RECEIPT_INCOMPATIBLE");
  return Object.freeze(data);
}

module.exports = { CLOSURE_FIELDS, OPENING_V1_FIELDS, OPENING_V2_FIELDS, hydrateClosureReceipt, hydrateOpeningReceipt, sameTimestamp };
