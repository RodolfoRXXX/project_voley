"use strict";

const functions = require("firebase-functions/v1");
const { MembershipError, MembershipUnauthenticatedError } = require("../application/membershipErrors");
const { annotateMembershipError, logUnexpectedMembershipError } = require("../application/membershipObservability");

const MEMBERSHIP_HTTPS_CODES = Object.freeze({
  UNAUTHENTICATED: "unauthenticated",
  ACCOUNT_REQUIRED: "failed-precondition",
  PERSON_REQUIRED: "failed-precondition",
  PERSON_INCOMPATIBLE: "failed-precondition",
  GROUP_NOT_FOUND: "not-found",
  GROUP_INCOMPATIBLE: "failed-precondition",
  NOT_AUTHORIZED: "permission-denied",
  OPEN_SEASON_REQUIRED: "failed-precondition",
  SEASON_INCOMPATIBLE: "failed-precondition",
  VALIDATION_FAILED: "invalid-argument",
  MEMBERSHIP_ALREADY_EXISTS: "already-exists",
  MEMBERSHIP_NOT_FOUND: "not-found",
  MEMBERSHIP_REACTIVATION_REQUIRED: "failed-precondition",
  IDEMPOTENCY_CONFLICT: "aborted",
  INCOMPATIBLE_STATE: "failed-precondition",
  CONFLICT: "aborted",
  DEPENDENCY_UNAVAILABLE: "unavailable",
  INTERNAL_ERROR: "internal",
});

function membershipIdentityFromCallableContext(context) {
  if (!context?.auth?.uid) throw new MembershipUnauthenticatedError();
  return Object.freeze({ userId: context.auth.uid });
}

function toMembershipHttpsError(error) {
  if (error instanceof functions.https.HttpsError) return error;
  if (error instanceof MembershipError) {
    return new functions.https.HttpsError(
      MEMBERSHIP_HTTPS_CODES[error.reason] || "internal",
      error.message,
      { reason: error.reason }
    );
  }
  return new functions.https.HttpsError("internal", "Membership operation failed", { reason: "INTERNAL_ERROR" });
}

function createMembershipCallableHandler({ operation, operationName, validatePayload, selectArgument, logger = console }) {
  return async (data, context) => {
    try {
      const identity = membershipIdentityFromCallableContext(context);
      const validated = validatePayload(data);
      return await operation(identity, selectArgument ? selectArgument(validated) : validated);
    } catch (error) {
      annotateMembershipError(error, { operation: operationName, stage: "callable" });
      if (!(error instanceof MembershipError) || error.reason === "INTERNAL_ERROR") {
        logUnexpectedMembershipError({ error, operation: operationName, logger });
      }
      throw toMembershipHttpsError(error);
    }
  };
}

module.exports = { MEMBERSHIP_HTTPS_CODES, createMembershipCallableHandler, membershipIdentityFromCallableContext, toMembershipHttpsError };
