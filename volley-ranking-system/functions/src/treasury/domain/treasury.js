"use strict";

const { createHash } = require("node:crypto");

const CAPABILITY_ID = "GROUP_TREASURY";
const hash = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const opaqueId = (...parts) => hash(parts.join("\u0000"));
const exact = (data, keys) => data && typeof data === "object" && !Array.isArray(data)
  && Object.keys(data).sort().join("\u0000") === [...keys].sort().join("\u0000");
const validId = (value) => typeof value === "string" && Boolean(value.trim()) && value === value.trim() && !value.includes("/");
const validTimestamp = (value) => value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime());

function slotId(groupId, accountId) { return opaqueId("group-capability-slot", groupId, CAPABILITY_ID, accountId); }
function receiptId(actorAccountId, command, key) { return opaqueId("group-capability-command", actorAccountId, command, key); }

function hydrateGrant(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const fields = ["grantId", "capabilityId", "groupId", "membershipId", "validityAnchor", "personId", "accountId",
    "ownerIdAtGrant", "ownershipRevisionAtGrant", "state", "grantedAt", "grantedByAccountId", "schemaVersion",
    ...(data?.state === "REVOKED" ? ["revokedAt", "revokedByAccountId"] : [])];
  if (!exact(data, fields) || data.grantId !== snapshot.id || data.capabilityId !== CAPABILITY_ID || data.schemaVersion !== 1
    || !["ACTIVE", "REVOKED"].includes(data.state) || !Number.isSafeInteger(data.ownershipRevisionAtGrant)
    || data.ownershipRevisionAtGrant < 1 || !validTimestamp(data.grantedAt)
    || (data.state === "REVOKED" && !validTimestamp(data.revokedAt))) throw new TypeError("Treasury grant is incompatible");
  for (const key of ["groupId", "membershipId", "validityAnchor", "personId", "accountId", "ownerIdAtGrant", "grantedByAccountId"]) {
    if (!validId(data[key])) throw new TypeError("Treasury grant identity is incompatible");
  }
  if (data.state === "REVOKED" && !validId(data.revokedByAccountId)) throw new TypeError("Treasury revocation identity is incompatible");
  return Object.freeze(data);
}

function hydrateSlot(snapshot) {
  if (!snapshot.exists) return null; const data = snapshot.data();
  if (!exact(data, ["slotId", "groupId", "capabilityId", "accountId", "currentGrantId", "membershipId",
    "validityAnchor", "ownershipRevision", "updatedAt", "schemaVersion"]) || data.slotId !== snapshot.id
    || data.capabilityId !== CAPABILITY_ID || data.schemaVersion !== 1 || !Number.isSafeInteger(data.ownershipRevision)
    || data.ownershipRevision < 1 || !validTimestamp(data.updatedAt)) throw new TypeError("Treasury slot is incompatible");
  for (const key of ["groupId", "accountId", "currentGrantId", "membershipId", "validityAnchor"]) if (!validId(data[key])) throw new TypeError("Treasury slot identity is incompatible");
  return Object.freeze(data);
}

module.exports = { CAPABILITY_ID, exact, hash, hydrateGrant, hydrateSlot, opaqueId, receiptId, slotId, validId, validTimestamp };
