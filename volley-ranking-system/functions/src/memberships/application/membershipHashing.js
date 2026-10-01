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

function membershipSelfExitIntentId(userId, key) {
  return sha256LengthPrefixed(["sportexa:E2-10:membership-self-exit-intent:v1", userId, key]);
}

function hashMembershipSelfExitIdempotencyKey(userId, key) {
  return sha256LengthPrefixed(["sportexa:E2-10:membership-self-exit-key:v1", userId, key]);
}

function hashMembershipSelfExitRequest(userId, personId, groupId) {
  return sha256LengthPrefixed(["sportexa:E2-10:membership-self-exit-request:v1", "contract-v1", userId, personId, groupId]);
}

function membershipAdministrativeFinalizationActivationRef({ actorUserId, groupId, membershipId, targetPersonId, seasonId, activationOrdinal, periodId, activeGuardVersion }) {
  return sha256LengthPrefixed([
    "sportexa:E2-12:administrative-finalization-activation-ref:v1",
    actorUserId, groupId, membershipId, targetPersonId, seasonId,
    String(activationOrdinal), periodId, String(activeGuardVersion),
  ]);
}

function membershipAdministrativeFinalizationIntentId(actorUserId, key) {
  return sha256LengthPrefixed(["sportexa:E2-12:membership-administrative-finalization-intent:v1", actorUserId, key]);
}

function hashMembershipAdministrativeFinalizationKey(actorUserId, key) {
  return sha256LengthPrefixed(["sportexa:E2-12:membership-administrative-finalization-key:v1", actorUserId, key]);
}

function hashMembershipAdministrativeFinalizationRequest(actorUserId, groupId, membershipId, activationRef) {
  return sha256LengthPrefixed([
    "sportexa:E2-12:membership-administrative-finalization-request:v1",
    "contract-v1", actorUserId, groupId, membershipId, activationRef,
  ]);
}

function hashMembershipAdministrativeActivationRef(activationRef) {
  return sha256LengthPrefixed(["sportexa:E2-12:membership-administrative-finalization-activation-ref-hash:v1", activationRef]);
}

function membershipCargoEditToken(actorUserId, membership) {
  const hasCargo = Object.prototype.hasOwnProperty.call(membership, "cargo");
  return sha256LengthPrefixed([
    "sportexa:E2-22A:membership-cargo-edit-token:v1", actorUserId,
    membership.groupId, membership.membershipId, membership.seasonId,
    membership.estado, String(membership.schemaVersion),
    String(membership.fechaIngreso.toDate().getTime()),
    Object.prototype.hasOwnProperty.call(membership, "latestPeriodId") ? membership.latestPeriodId : "legacy",
    Object.prototype.hasOwnProperty.call(membership, "periodCount") ? String(membership.periodCount) : "legacy",
    hasCargo ? "present" : "absent",
    hasCargo ? membership.cargo : "",
  ]);
}

function membershipCargoUpdateReceiptId(actorUserId, key) {
  return sha256LengthPrefixed(["sportexa:E2-22A:membership-cargo-update-receipt:v1", actorUserId, key]);
}

function hashMembershipCargoUpdateKey(actorUserId, key) {
  return sha256LengthPrefixed(["sportexa:E2-22A:membership-cargo-update-key:v1", actorUserId, key]);
}

function hashMembershipCargoUpdateRequest(actorUserId, groupId, membershipId, cargo) {
  return sha256LengthPrefixed([
    "sportexa:E2-22A:membership-cargo-update-request:v1", "contract-v1",
    actorUserId, groupId, membershipId,
    cargo === null ? "remove" : "set",
    cargo === null ? "" : cargo,
  ]);
}

module.exports = {
  activeMembershipGuardId,
  hashGroupJoinRequestActivationIdempotency,
  hashGroupJoinRequestReactivationRequest,
  hashMembershipIdempotencyKey,
  hashMembershipRequest,
  hashMembershipSelfExitIdempotencyKey,
  hashMembershipSelfExitRequest,
  membershipSelfExitIntentId,
  membershipAdministrativeFinalizationActivationRef,
  membershipAdministrativeFinalizationIntentId,
  hashMembershipAdministrativeFinalizationKey,
  hashMembershipAdministrativeFinalizationRequest,
  hashMembershipAdministrativeActivationRef,
  membershipCargoEditToken,
  membershipCargoUpdateReceiptId,
  hashMembershipCargoUpdateKey,
  hashMembershipCargoUpdateRequest,
  membershipLifecycleGuardId,
  membershipValidityPeriodId,
  sha256LengthPrefixed,
};
