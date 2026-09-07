"use strict";
const functions = require("firebase-functions/v1");
const { GroupJoinRequestError, GroupJoinRequestUnauthenticatedError } = require("../application/groupJoinRequestErrors");
const CODES = Object.freeze({ UNAUTHENTICATED: "unauthenticated", ACCOUNT_REQUIRED: "failed-precondition", PERSON_REQUIRED: "failed-precondition", PERSON_INCOMPATIBLE: "failed-precondition", GROUP_NOT_AVAILABLE: "not-found", GROUP_INCOMPATIBLE: "failed-precondition", OWNER_CANNOT_REQUEST: "failed-precondition", ACTIVE_MEMBERSHIP_EXISTS: "already-exists", REQUEST_ALREADY_PENDING: "already-exists", REQUEST_NOT_FOUND: "not-found", REQUEST_NOT_PENDING: "failed-precondition", NOT_AUTHORIZED: "permission-denied", VALIDATION_FAILED: "invalid-argument", IDEMPOTENCY_CONFLICT: "already-exists", INCOMPATIBLE_STATE: "failed-precondition", CONFLICT: "aborted", DEPENDENCY_UNAVAILABLE: "unavailable", INTERNAL_ERROR: "internal" });
function identity(context) { if (!context?.auth?.uid) throw new GroupJoinRequestUnauthenticatedError(); return Object.freeze({ userId: context.auth.uid }); }
function toHttps(error) {
  if (error instanceof functions.https.HttpsError) return error;
  if (error instanceof GroupJoinRequestError) return new functions.https.HttpsError(CODES[error.reason] || "internal", error.message, { reason: error.reason });
  return new functions.https.HttpsError("internal", "Group join request operation failed", { reason: "INTERNAL_ERROR" });
}
function handler({ operation, operationName, validatePayload, logger = console }) {
  return async (data, context) => {
    const startedAt = Date.now();
    let observation = { stage: "request-validation", classification: "first-attempt" };
    const observe = (candidate) => {
      if (!candidate || typeof candidate.stage !== "string" || !/^[a-z-]+$/.test(candidate.stage) || !["first-attempt", "retry", "recovery"].includes(candidate.classification)) return;
      observation = { stage: candidate.stage, classification: candidate.classification };
    };
    try {
      const result = await operation(identity(context), validatePayload(data), observe);
      logger.info?.("groupJoinRequest.operation", { operation: operationName, ...observation, outcome: result.outcome || "OK", durationMs: Date.now() - startedAt });
      return result;
    } catch (error) {
      const reason = error instanceof GroupJoinRequestError ? error.reason : "INTERNAL_ERROR";
      logger.warn?.("groupJoinRequest.operation", { operation: operationName, ...observation, reason, durationMs: Date.now() - startedAt });
      throw toHttps(error);
    }
  };
}
module.exports = { CODES, handler, identity, toHttps };
