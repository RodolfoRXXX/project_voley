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

function membershipLifecycleGuardId(groupId, personId) {
  return sha256LengthPrefixed(["sportexa:E2-05:membership-lifecycle-guard:v1", groupId, personId]);
}

function membershipValidityPeriodId(membershipId, ordinal) {
  if (!Number.isSafeInteger(ordinal) || ordinal < 1) throw new TypeError("Validity period ordinal is invalid");
  return sha256LengthPrefixed(["sportexa:E2-09:membership-validity-period:v1", membershipId, String(ordinal)]);
}

function hashGroupJoinRequestActivationIdempotency(decisionIntentId, membershipId, expectedActivationOrdinal) {
  return sha256LengthPrefixed(["sportexa:E2-09:membership-activation-idempotency:v1", decisionIntentId, membershipId, String(expectedActivationOrdinal)]);
}

function hashGroupJoinRequestReactivationRequest(requestId, personId, groupId, seasonId, membershipId, expectedActivationOrdinal) {
  return sha256LengthPrefixed(["sportexa:E2-09:membership-reactivation-request:v1", requestId, personId, groupId, seasonId, membershipId, String(expectedActivationOrdinal)]);
}

function hashMembershipIdempotencyKey(userId, groupId, personId, key) {
  return sha256LengthPrefixed(["sportexa:E2-03:idempotency:v1", userId, groupId, personId, key]);
}

function hashMembershipRequest(userId, personId, groupId, seasonId) {
  return sha256LengthPrefixed(["sportexa:E2-03:request:v1", "contract-v1", userId, personId, groupId, seasonId]);
}

module.exports = {
  activeMembershipGuardId,
  hashGroupJoinRequestActivationIdempotency,
  hashGroupJoinRequestReactivationRequest,
  hashMembershipIdempotencyKey,
  hashMembershipRequest,
  membershipLifecycleGuardId,
  membershipValidityPeriodId,
  sha256LengthPrefixed,
};
