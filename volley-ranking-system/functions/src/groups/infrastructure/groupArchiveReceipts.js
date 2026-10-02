"use strict";

const FIELDS = Object.freeze([
  "action", "actorUserId", "groupId", "requestHash", "appliedState", "archivedAt", "outcome", "receiptVersion",
]);
const HASH = /^[a-f0-9]{64}$/;

function exact(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort(); const expected = [...fields].sort();
  return keys.length === expected.length && !keys.some((key, index) => key !== expected[index]);
}
function validId(value) { return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/"); }
function validTimestamp(value) { return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime()); }

function hydrateGroupArchiveReceipt(snapshot, expectedId) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const valid = snapshot.id === expectedId && exact(data, FIELDS)
    && data.action === "ARCHIVE_GROUP" && data.appliedState === "archivado"
    && data.outcome === "ARCHIVED" && data.receiptVersion === 1
    && validId(data.actorUserId) && validId(data.groupId) && HASH.test(data.requestHash || "")
    && validTimestamp(data.archivedAt);
  if (!valid) throw new Error("GROUP_ARCHIVE_RECEIPT_INCOMPATIBLE");
  return Object.freeze(data);
}

module.exports = { GROUP_ARCHIVE_RECEIPT_FIELDS: FIELDS, hydrateGroupArchiveReceipt };
