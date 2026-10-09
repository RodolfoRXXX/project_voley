"use strict";

const functions = require("firebase-functions/v1");
const { TreasuryError, TreasuryUnauthenticatedError } = require("../application/treasuryErrors");
const CODES = Object.freeze({ UNAUTHENTICATED: "unauthenticated", VALIDATION_FAILED: "invalid-argument",
  ACCOUNT_CONTEXT_REQUIRED: "failed-precondition", GROUP_NOT_ACCESSIBLE: "permission-denied",
  GROUP_NOT_OPERATIONAL: "failed-precondition", MEMBERSHIP_NOT_ELIGIBLE: "failed-precondition",
  TARGET_ACCOUNT_LINK_REQUIRED: "failed-precondition", OPEN_SEASON_REQUIRED: "failed-precondition",
  TREASURY_GRANT_ALREADY_ACTIVE: "already-exists", TREASURY_GRANT_NOT_ACCESSIBLE: "not-found",
  GROUP_TREASURY_NOT_AUTHORIZED: "permission-denied", IDEMPOTENCY_CONFLICT: "aborted",
  DATA_INCOMPATIBLE: "failed-precondition", PENDING_RECOVERY: "unavailable" });
function toHttps(error) { if (error instanceof functions.https.HttpsError) return error; if (error instanceof TreasuryError) return new functions.https.HttpsError(CODES[error.reason] || "internal", error.message, { reason: error.reason }); return new functions.https.HttpsError("internal", "Treasury operation failed", { reason: "INTERNAL_ERROR" }); }
function createTreasuryCallable({ operation, validate }) { return async (data, context) => { try { if (!context?.auth?.uid) throw new TreasuryUnauthenticatedError(); return await operation(context.auth.uid, validate(data)); } catch (error) { if (!(error instanceof TreasuryError)) console.error("Treasury callable failed", { name: error?.name, code: error?.code }); throw toHttps(error); } }; }
module.exports = { CODES, createTreasuryCallable, toHttps };
