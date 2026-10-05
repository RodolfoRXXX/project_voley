"use strict";

const HASH = /^[a-f0-9]{64}$/;
const FIELDS = Object.freeze([
  "action", "actorUserId", "groupId", "idempotencyKeyHash", "requestHash",
  "creationIdempotencyKeyHash", "creationRequestHash", "deletedAt", "outcome", "receiptVersion",
]);

function exact(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort(); const expected = [...fields].sort();
  return keys.length === expected.length && !keys.some((key, index) => key !== expected[index]);
}
function validId(value) { return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/"); }
function validTimestamp(value) { return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime()); }

function hydrateGroupDeletionReceipt(snapshot, expectedId = snapshot.id) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const valid = snapshot.id === expectedId && exact(data, FIELDS)
    && data.action === "DELETE_GROUP" && data.outcome === "DELETED" && data.receiptVersion === 1
    && validId(data.actorUserId) && validId(data.groupId)
    && HASH.test(data.idempotencyKeyHash || "") && HASH.test(data.requestHash || "")
    && HASH.test(data.creationIdempotencyKeyHash || "") && HASH.test(data.creationRequestHash || "")
    && validTimestamp(data.deletedAt);
  if (!valid) throw new Error("GROUP_DELETION_RECEIPT_INCOMPATIBLE");
  return Object.freeze(data);
}

module.exports = { GROUP_DELETION_RECEIPT_FIELDS: FIELDS, hydrateGroupDeletionReceipt };
