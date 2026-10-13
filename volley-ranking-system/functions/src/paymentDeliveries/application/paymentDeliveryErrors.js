"use strict";

class PaymentDeliveryError extends Error {
  constructor(reason, message = reason, options) { super(message, options); this.name = this.constructor.name; this.reason = reason; this.details = options?.details; }
}
const make = (name, reason, message) => class extends PaymentDeliveryError {
  constructor(options) { super(reason, message, options); this.name = name; }
};

const DeliveryUnauthenticatedError = make("DeliveryUnauthenticatedError", "UNAUTHENTICATED", "Authentication is required");
const DeliveryValidationError = make("DeliveryValidationError", "VALIDATION_FAILED", "Delivery request is invalid");
const DeliveryAccountRequiredError = make("DeliveryAccountRequiredError", "ACCOUNT_REQUIRED", "A canonical Account is required");
const DeliveryPersonRequiredError = make("DeliveryPersonRequiredError", "PERSON_REQUIRED", "A canonical Person is required");
const DeliveryNotAccessibleError = make("DeliveryNotAccessibleError", "DELIVERY_NOT_ACCESSIBLE", "Delivery is not accessible");
const PaymentNotAccessibleError = make("PaymentNotAccessibleError", "PAYMENT_NOT_ACCESSIBLE", "Payment is not accessible");
const DeliveryScopeMismatchError = make("DeliveryScopeMismatchError", "DELIVERY_SCOPE_MISMATCH", "Delivery lines must share one exact context");
const DuplicateDeliveryLineError = make("DuplicateDeliveryLineError", "DUPLICATE_DELIVERY_LINE", "Delivery contains a duplicate payment");
const DeliveryLineLimitExceededError = make("DeliveryLineLimitExceededError", "DELIVERY_LINE_LIMIT_EXCEEDED", "Delivery exceeds twenty lines");
const DeliveryDraftStaleError = make("DeliveryDraftStaleError", "DELIVERY_DRAFT_STALE", "Delivery draft is stale");
const DeliveryStaleBalanceError = make("DeliveryStaleBalanceError", "DELIVERY_STALE_BALANCE", "Delivery no longer fits available balances");
const DeliveryAlreadyDecidedError = make("DeliveryAlreadyDecidedError", "DELIVERY_ALREADY_DECIDED", "Delivery was already decided");
const ReviewNotAuthorizedError = make("ReviewNotAuthorizedError", "PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED", "Payment notice review is not authorized");
const SelfReviewForbiddenError = make("SelfReviewForbiddenError", "SELF_REVIEW_FORBIDDEN", "A reviewer cannot decide their own debt");
const PrearchivePaymentRequiredError = make("PrearchivePaymentRequiredError", "PREARCHIVE_PAYMENT_REQUIRED", "Every payment must predate group archive");
const DeliveryNotReversibleError = make("DeliveryNotReversibleError", "DELIVERY_NOT_REVERSIBLE", "Delivery is not reversible");
const DeliveryIdempotencyConflictError = make("DeliveryIdempotencyConflictError", "IDEMPOTENCY_CONFLICT", "Idempotency key conflicts with another request");
const DeliveryIncompatibleStateError = make("DeliveryIncompatibleStateError", "INCOMPATIBLE_STATE", "Delivery persistence is incompatible");
const DeliveryConcurrentModificationError = make("DeliveryConcurrentModificationError", "CONCURRENT_MODIFICATION", "Delivery context changed concurrently");

module.exports = { PaymentDeliveryError, DeliveryUnauthenticatedError, DeliveryValidationError,
  DeliveryAccountRequiredError, DeliveryPersonRequiredError, DeliveryNotAccessibleError, PaymentNotAccessibleError,
  DeliveryScopeMismatchError, DuplicateDeliveryLineError, DeliveryLineLimitExceededError, DeliveryDraftStaleError,
  DeliveryStaleBalanceError, DeliveryAlreadyDecidedError, ReviewNotAuthorizedError, SelfReviewForbiddenError,
  PrearchivePaymentRequiredError, DeliveryNotReversibleError, DeliveryIdempotencyConflictError,
  DeliveryIncompatibleStateError, DeliveryConcurrentModificationError };
