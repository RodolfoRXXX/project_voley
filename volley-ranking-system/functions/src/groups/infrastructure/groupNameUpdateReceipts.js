"use strict";

const HASH = /^[a-f0-9]{64}$/;
const { normalizeGroupName } = require("../domain/group");
const GROUP_NAME_UPDATE_RECEIPT_FIELDS = Object.freeze([
  "action", "actorUserId", "groupId", "requestHash", "appliedName", "outcome", "confirmedAt", "receiptVersion",
]);

function exact(data, fields) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const keys = Object.keys(data).sort(); const expected = [...fields].sort();
  return keys.length === expected.length && !keys.some((key, index) => key !== expected[index]);
}
function validId(value) { return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/"); }
function validTimestamp(value) { return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime()); }

function hydrateGroupNameUpdateReceipt(snapshot, expectedId) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  let canonicalName = false;
  try { canonicalName = typeof data?.appliedName === "string" && normalizeGroupName(data.appliedName) === data.appliedName; }
  catch { canonicalName = false; }
  const valid = snapshot.id === expectedId && exact(data, GROUP_NAME_UPDATE_RECEIPT_FIELDS)
    && data.action === "UPDATE_GROUP_NAME" && data.outcome === "UPDATED" && data.receiptVersion === 1
    && validId(data.actorUserId) && validId(data.groupId) && HASH.test(data.requestHash || "")
    && canonicalName && validTimestamp(data.confirmedAt);
  if (!valid) throw new Error("GROUP_NAME_UPDATE_RECEIPT_INCOMPATIBLE");
  return Object.freeze(data);
}

module.exports = { GROUP_NAME_UPDATE_RECEIPT_FIELDS, hydrateGroupNameUpdateReceipt };
