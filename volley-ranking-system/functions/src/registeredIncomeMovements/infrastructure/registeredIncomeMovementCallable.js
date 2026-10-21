"use strict";

const functions = require("firebase-functions/v1");
const { RegisteredIncomeMovementError } = require("../domain/registeredIncomeMovement");

const CODES = Object.freeze({
  UNAUTHENTICATED: "unauthenticated",
  INVALID_DATE_RANGE: "invalid-argument",
  ACCOUNT_REQUIRED: "failed-precondition",
  GROUP_NOT_ACCESSIBLE: "permission-denied",
  GROUP_TREASURY_NOT_AUTHORIZED: "permission-denied",
  RANGE_TOO_WIDE: "invalid-argument",
  MOVEMENT_LIMIT_EXCEEDED: "resource-exhausted",
  DATA_INCOMPATIBLE: "failed-precondition",
  DEPENDENCY_UNAVAILABLE: "unavailable",
});

function toHttps(error) {
  if (error instanceof functions.https.HttpsError) return error;
  if (error instanceof RegisteredIncomeMovementError
    || error?.name === "RegisteredIncomeMovementValidationError") {
    return new functions.https.HttpsError(CODES[error.reason] || "internal", error.message, {
      reason: error.reason,
    });
  }
  return new functions.https.HttpsError("internal", "Registered-income query failed", {
    reason: "INTERNAL_ERROR",
  });
}

function createRegisteredIncomeMovementCallable({ operation, validate }) {
  return async (data, context) => {
    try {
      if (!context?.auth?.uid) {
        throw new RegisteredIncomeMovementError("UNAUTHENTICATED", "Authentication is required");
      }
      return await operation(context.auth.uid, validate(data));
    } catch (error) {
      if (!(error instanceof RegisteredIncomeMovementError)
        && error?.name !== "RegisteredIncomeMovementValidationError") {
        console.error("Registered-income callable failed", { name: error?.name, code: error?.code });
      }
      throw toHttps(error);
    }
  };
}

module.exports = { CODES, createRegisteredIncomeMovementCallable, toHttps };
