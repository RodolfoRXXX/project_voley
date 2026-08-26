"use strict";

const functions = require("firebase-functions/v1");
const { GroupError, GroupUnauthenticatedError } = require("../application/groupErrors");

const HTTPS_CODES = Object.freeze({
  UNAUTHENTICATED: "unauthenticated",
  ACCOUNT_REQUIRED: "failed-precondition",
  NOT_AUTHORIZED: "permission-denied",
  NOT_FOUND: "not-found",
  VALIDATION_FAILED: "invalid-argument",
  PROVISIONAL_LIMIT_REACHED: "resource-exhausted",
  CONFLICT: "aborted",
  DEPENDENCY_UNAVAILABLE: "unavailable",
  INTERNAL_ERROR: "internal",
});

function identityFromCallableContext(context) {
  if (!context?.auth?.uid) throw new GroupUnauthenticatedError();
  return Object.freeze({ userId: context.auth.uid });
}

function toHttpsError(error) {
  if (error instanceof functions.https.HttpsError) return error;
  if (error instanceof GroupError) {
    return new functions.https.HttpsError(
      HTTPS_CODES[error.reason] || "internal",
      error.message,
      { reason: error.reason }
    );
  }
  return new functions.https.HttpsError("internal", "Group operation failed", { reason: "INTERNAL_ERROR" });
}

function createGroupCallableHandler({ operation, validatePayload, selectArgument }) {
  return async (data, context) => {
    try {
      const identity = identityFromCallableContext(context);
      const validated = validatePayload(data);
      return await operation(identity, selectArgument ? selectArgument(validated) : validated);
    } catch (error) {
      if (!(error instanceof GroupError)) console.error("Group callable failed", { name: error?.name, code: error?.code });
      throw toHttpsError(error);
    }
  };
}

module.exports = { HTTPS_CODES, createGroupCallableHandler, identityFromCallableContext, toHttpsError };
