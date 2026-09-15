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
  MEMBERSHIP_NOT_ACTIVE: "failed-precondition",
  MEMBERSHIP_REACTIVATION_REQUIRED: "failed-precondition",
  MEMBERSHIP_SEASON_NOT_MODIFIABLE: "failed-precondition",
  IDEMPOTENCY_CONFLICT: "aborted",
  INCOMPATIBLE_STATE: "failed-precondition",
  CONFLICT: "aborted",
  DEPENDENCY_UNAVAILABLE: "unavailable",
  INTERNAL_ERROR: "internal",
  GROUP_NOT_ACCESSIBLE: "permission-denied",
  ROSTER_CONTEXT_CHANGED: "aborted",
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

function createOwnerActiveRosterCallableHandler({ operation, validatePayload, logger = console }) {
  return async (data, context) => {
    const startedAt = Date.now();
    try {
      const identity = membershipIdentityFromCallableContext(context);
      const input = validatePayload(data);
      const result = await operation(identity, input);
      logger.info?.("membership.owner-active-roster-list", {
        operation: "owner-active-roster-list",
        stage: "complete",
        outcome: result.scope.status,
        requestedPageSize: input.pageSize,
        returnedCount: result.items.length,
        hasContinuation: result.nextCursor !== null,
        unavailablePersonCount: result.items.filter((item) => item.person.status === "UNAVAILABLE").length,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      annotateMembershipError(error, { operation: "owner-active-roster-list", stage: "callable" });
      const reason = error instanceof MembershipError ? error.reason : "INTERNAL_ERROR";
      logger.warn?.("membership.owner-active-roster-list", {
        operation: "owner-active-roster-list",
        stage: "callable",
        reason,
        durationMs: Date.now() - startedAt,
      });
      if (!(error instanceof MembershipError) || error.reason === "INTERNAL_ERROR") {
        logUnexpectedMembershipError({ error, operation: "owner-active-roster-list", logger });
      }
      throw toMembershipHttpsError(error);
    }
  };
}

module.exports = { MEMBERSHIP_HTTPS_CODES, createMembershipCallableHandler, createOwnerActiveRosterCallableHandler, membershipIdentityFromCallableContext, toMembershipHttpsError };
