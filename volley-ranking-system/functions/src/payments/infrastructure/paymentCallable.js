"use strict";

const functions = require("firebase-functions/v1");
const { PaymentError, PaymentUnauthenticatedError } = require("../application/paymentErrors");

const CODES = Object.freeze({
  UNAUTHENTICATED: "unauthenticated", ACCOUNT_REQUIRED: "failed-precondition", PERSON_REQUIRED: "failed-precondition",
  GROUP_NOT_ACCESSIBLE: "permission-denied", GROUP_NOT_OPERATIONAL: "failed-precondition", OPEN_SEASON_REQUIRED: "failed-precondition",
  MEMBERSHIP_NOT_ELIGIBLE: "failed-precondition", MEMBERSHIP_VALIDITY_NOT_OVERLAPPING: "failed-precondition",
  MEMBERSHIP_VALIDITY_UNPROVABLE: "failed-precondition", CHARGE_CONCEPT_NOT_AVAILABLE: "not-found",
  CHARGE_CONCEPT_DEACTIVATED: "failed-precondition", CONCEPT_VERSION_STALE: "aborted", OCCURRENCE_NOT_AVAILABLE: "not-found",
  OBLIGATION_PAYLOAD_CONFLICT: "already-exists", VALIDATION_FAILED: "invalid-argument", IDEMPOTENCY_CONFLICT: "aborted",
  CONCURRENT_MODIFICATION: "aborted", INCOMPATIBLE_STATE: "failed-precondition", DEPENDENCY_UNAVAILABLE: "unavailable",
});
function toHttps(error) { if (error instanceof functions.https.HttpsError) return error; if (error instanceof PaymentError) return new functions.https.HttpsError(CODES[error.reason] || "internal", error.message, { reason: error.reason }); return new functions.https.HttpsError("internal", "Payment operation failed", { reason: "INTERNAL_ERROR" }); }
function createPaymentCallable({ operation, validate }) { return async (data, context) => { try { if (!context?.auth?.uid) throw new PaymentUnauthenticatedError(); return await operation(context.auth.uid, validate(data)); } catch (error) { if (!(error instanceof PaymentError)) console.error("Payment callable failed", { name: error?.name, code: error?.code }); throw toHttps(error); } }; }
module.exports = { CODES, createPaymentCallable, toHttps };
