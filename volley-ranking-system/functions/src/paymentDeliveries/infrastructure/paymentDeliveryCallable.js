"use strict";
const functions = require("firebase-functions/v1");
const { PaymentDeliveryError, DeliveryUnauthenticatedError } = require("../application/paymentDeliveryErrors");
const CODES = Object.freeze({ UNAUTHENTICATED: "unauthenticated", VALIDATION_FAILED: "invalid-argument", ACCOUNT_REQUIRED: "failed-precondition", PERSON_REQUIRED: "failed-precondition",
  DELIVERY_NOT_ACCESSIBLE: "not-found", PAYMENT_NOT_ACCESSIBLE: "not-found", DELIVERY_SCOPE_MISMATCH: "failed-precondition", DUPLICATE_DELIVERY_LINE: "invalid-argument",
  DELIVERY_LINE_LIMIT_EXCEEDED: "invalid-argument", DELIVERY_DRAFT_STALE: "aborted", DELIVERY_STALE_BALANCE: "failed-precondition", DELIVERY_ALREADY_DECIDED: "already-exists",
  PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED: "permission-denied", GROUP_TREASURY_NOT_AUTHORIZED: "permission-denied", SELF_REVIEW_FORBIDDEN: "permission-denied", PREARCHIVE_PAYMENT_REQUIRED: "failed-precondition",
  DELIVERY_NOT_REVERSIBLE: "failed-precondition", IDEMPOTENCY_CONFLICT: "aborted", PENDING_RECOVERY: "unavailable", INCOMPATIBLE_STATE: "failed-precondition",
  CONCURRENT_MODIFICATION: "aborted", REVIEW_GRANT_ALREADY_ACTIVE: "already-exists" });
function toHttps(error) { if (error instanceof functions.https.HttpsError) return error; if (error instanceof PaymentDeliveryError) return new functions.https.HttpsError(CODES[error.reason] || "internal", error.message, { reason: error.reason, ...(error.details ? error.details : {}) }); return new functions.https.HttpsError("internal", "Payment delivery operation failed", { reason: "INTERNAL_ERROR" }); }
function createPaymentDeliveryCallable({ operation, validate }) { return async (data, context) => { try { if (!context?.auth?.uid) throw new DeliveryUnauthenticatedError(); return await operation(context.auth.uid, validate(data)); } catch (error) { if (!(error instanceof PaymentDeliveryError)) console.error("Payment delivery callable failed", { name: error?.name, code: error?.code }); throw toHttps(error); } }; }
module.exports = { CODES, createPaymentDeliveryCallable, toHttps };
