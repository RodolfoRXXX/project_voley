"use strict";

const functions = require("firebase-functions/v1");
const { AdministrativePersonLinkError } = require("./administrativePersonLinkModule");

const codes = {
  ALREADY_CLAIMED: "already-exists",
  CANDIDATE_STALE: "aborted",
  CONFLICT: "aborted",
  CURSOR_INVALID: "invalid-argument",
  DEPENDENCY_UNAVAILABLE: "unavailable",
  EMAIL_NOT_VERIFIED: "failed-precondition",
  FEATURE_DISABLED: "failed-precondition",
  IDEMPOTENCY_CONFLICT: "already-exists",
  INCOMPATIBLE_STATE: "failed-precondition",
  NOT_FOUND: "not-found",
  NOT_REJECTED: "failed-precondition",
  RATE_LIMITED: "resource-exhausted",
};

function handler(operation, validate) {
  return async (raw, context) => {
    if (!context.auth?.uid) throw new functions.https.HttpsError("unauthenticated", "Authentication is required");
    let input;
    try { input = validate(raw); } catch { throw new functions.https.HttpsError("invalid-argument", "Invalid IUX-11B request"); }
    try { return await operation({ actorUserId: context.auth.uid, input }); }
    catch (error) {
      if (error instanceof AdministrativePersonLinkError) throw new functions.https.HttpsError(codes[error.reason] || "failed-precondition", error.message, { reason: error.reason });
      console.error("administrative-person-link", error);
      throw new functions.https.HttpsError("internal", "Administrative Person link operation failed");
    }
  };
}

module.exports = { handler };
