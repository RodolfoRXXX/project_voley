"use strict";

const functions = require("firebase-functions/v1");
const { SeasonError, SeasonUnauthenticatedError } = require("../application/seasonErrors");

const SEASON_HTTPS_CODES = Object.freeze({
  UNAUTHENTICATED: "unauthenticated",
  ACCOUNT_REQUIRED: "failed-precondition",
  GROUP_NOT_FOUND: "not-found",
  GROUP_INCOMPATIBLE: "failed-precondition",
  NOT_AUTHORIZED: "permission-denied",
  SEASON_NOT_FOUND: "not-found",
  VALIDATION_FAILED: "invalid-argument",
  OPEN_SEASON_ALREADY_EXISTS: "already-exists",
  INCOMPATIBLE_STATE: "failed-precondition",
  IDEMPOTENCY_CONFLICT: "aborted",
  CONFLICT: "aborted",
  DEPENDENCY_UNAVAILABLE: "unavailable",
  INTERNAL_ERROR: "internal",
});

function seasonIdentityFromCallableContext(context) {
  if (!context?.auth?.uid) throw new SeasonUnauthenticatedError();
  return Object.freeze({ userId: context.auth.uid });
}

function toSeasonHttpsError(error) {
  if (error instanceof functions.https.HttpsError) return error;
  if (error instanceof SeasonError) {
    return new functions.https.HttpsError(
      SEASON_HTTPS_CODES[error.reason] || "internal",
      error.message,
      { reason: error.reason }
    );
  }
  return new functions.https.HttpsError("internal", "Season operation failed", { reason: "INTERNAL_ERROR" });
}

function createSeasonCallableHandler({ operation, validatePayload }) {
  return async (data, context) => {
    try {
      return await operation(seasonIdentityFromCallableContext(context), validatePayload(data));
    } catch (error) {
      if (!(error instanceof SeasonError)) console.error("Season callable failed", { name: error?.name, code: error?.code });
      throw toSeasonHttpsError(error);
    }
  };
}

module.exports = { SEASON_HTTPS_CODES, createSeasonCallableHandler, seasonIdentityFromCallableContext, toSeasonHttpsError };
