"use strict";

class PaymentError extends Error {
  constructor(reason, message = reason, options) { super(message, options); this.name = this.constructor.name; this.reason = reason; }
}

const error = (name, reason, message) => class extends PaymentError {
  constructor(options) { super(reason, message, options); this.name = name; }
};

const PaymentUnauthenticatedError = error("PaymentUnauthenticatedError", "UNAUTHENTICATED", "Authentication is required");
const PaymentAccountRequiredError = error("PaymentAccountRequiredError", "ACCOUNT_REQUIRED", "A canonical Account is required");
const PaymentPersonRequiredError = error("PaymentPersonRequiredError", "PERSON_REQUIRED", "A canonical Person is required");
const PaymentGroupNotAccessibleError = error("PaymentGroupNotAccessibleError", "GROUP_NOT_ACCESSIBLE", "Group is not accessible");
const PaymentGroupNotOperationalError = error("PaymentGroupNotOperationalError", "GROUP_NOT_OPERATIONAL", "Group is not operational");
const PaymentValidationError = error("PaymentValidationError", "VALIDATION_FAILED", "Payment request is invalid");
const PaymentIdempotencyConflictError = error("PaymentIdempotencyConflictError", "IDEMPOTENCY_CONFLICT", "Idempotency key was used with a different request");
const PaymentConceptNotAvailableError = error("PaymentConceptNotAvailableError", "CHARGE_CONCEPT_NOT_AVAILABLE", "Charge concept is not available");
const PaymentConceptDeactivatedError = error("PaymentConceptDeactivatedError", "CHARGE_CONCEPT_DEACTIVATED", "Charge concept is deactivated");
const PaymentConceptVersionStaleError = error("PaymentConceptVersionStaleError", "CONCEPT_VERSION_STALE", "Charge concept version is stale");
const PaymentOccurrenceNotAvailableError = error("PaymentOccurrenceNotAvailableError", "OCCURRENCE_NOT_AVAILABLE", "Charge occurrence is not available");
const PaymentConcurrentModificationError = error("PaymentConcurrentModificationError", "CONCURRENT_MODIFICATION", "Payment context changed concurrently");
const PaymentIncompatibleStateError = error("PaymentIncompatibleStateError", "INCOMPATIBLE_STATE", "Payment context is incompatible");
const PaymentDependencyUnavailableError = error("PaymentDependencyUnavailableError", "DEPENDENCY_UNAVAILABLE", "Payment dependency is unavailable");
const PaymentTreasuryNotAuthorizedError = error("PaymentTreasuryNotAuthorizedError", "GROUP_TREASURY_NOT_AUTHORIZED", "Treasury access is not authorized");

module.exports = {
  PaymentError, PaymentUnauthenticatedError, PaymentAccountRequiredError, PaymentPersonRequiredError,
  PaymentGroupNotAccessibleError, PaymentGroupNotOperationalError, PaymentValidationError,
  PaymentIdempotencyConflictError, PaymentConceptNotAvailableError, PaymentConceptDeactivatedError,
  PaymentConceptVersionStaleError, PaymentOccurrenceNotAvailableError,
  PaymentConcurrentModificationError, PaymentIncompatibleStateError, PaymentDependencyUnavailableError,
  PaymentTreasuryNotAuthorizedError,
};
