"use strict";

const functions = require("firebase-functions/v1");
const { MembershipError, MembershipUnauthenticatedError } = require("../application/membershipErrors");

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

function createMembershipCallableHandler({ operation, validatePayload, selectArgument }) {
  return async (data, context) => {
    try {
      const identity = membershipIdentityFromCallableContext(context);
      const validated = validatePayload(data);
      return await operation(identity, selectArgument ? selectArgument(validated) : validated);
    } catch (error) {
      if (!(error instanceof MembershipError)) console.error("Membership callable failed", { name: error?.name, code: error?.code });
      throw toMembershipHttpsError(error);
    }
  };
}

module.exports = { MEMBERSHIP_HTTPS_CODES, createMembershipCallableHandler, membershipIdentityFromCallableContext, toMembershipHttpsError };
