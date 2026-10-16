"use strict";

class AdministrativeReceiptError extends Error {
  constructor(reason, message = reason, options) { super(message, options); this.name = this.constructor.name; this.reason = reason; this.details = options?.details; }
}
const make = (name, reason, message) => class extends AdministrativeReceiptError {
  constructor(options) { super(reason, message, options); this.name = name; }
};

const names = {
  AdministrativeReceiptUnauthenticatedError: ["UNAUTHENTICATED", "Authentication is required"],
  AdministrativeReceiptValidationError: ["VALIDATION_FAILED", "Administrative receipt request is invalid"],
  AdministrativeReceiptAccountRequiredError: ["ACCOUNT_REQUIRED", "A canonical Account is required"],
  AdministrativeReceiptNotAccessibleError: ["ADMINISTRATIVE_RECEIPT_NOT_ACCESSIBLE", "Administrative receipt is not accessible"],
  AdministrativeReceiptNotAuthorizedError: ["ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED", "Administrative receipt access is not authorized"],
  SelfDirectPaymentRecordForbiddenError: ["SELF_DIRECT_PAYMENT_RECORD_FORBIDDEN", "A delegate cannot record against their own Person"],
  AdministrativeReceiptScopeMismatchError: ["ADMINISTRATIVE_RECEIPT_SCOPE_MISMATCH", "Receipt lines must share one exact context"],
  DuplicateReceiptLineError: ["DUPLICATE_RECEIPT_LINE", "Receipt contains a duplicate payment"],
  ReceiptLineLimitExceededError: ["RECEIPT_LINE_LIMIT_EXCEEDED", "Receipt exceeds twenty lines"],
  AdministrativeReceiptDraftStaleError: ["ADMINISTRATIVE_RECEIPT_DRAFT_STALE", "Administrative receipt draft is stale"],
  PendingNoticeResolutionRequiredError: ["PENDING_NOTICE_RESOLUTION_REQUIRED", "Every pending notice requires a terminal human classification"],
  NoticeConfirmationRequiredError: ["NOTICE_CONFIRMATION_REQUIRED", "A matching correct notice must be confirmed through E3-03"],
  RelatedNoticeReviewStaleError: ["RELATED_NOTICE_REVIEW_STALE", "Related notice review is stale"],
  TooManyRelatedNoticesError: ["TOO_MANY_RELATED_NOTICES", "More than twenty related notices are pending"],
  NoticeNotPendingError: ["NOTICE_NOT_PENDING", "A related notice is no longer pending"],
  NoticeRelationConflictError: ["NOTICE_RELATION_CONFLICT", "Related notice classification does not match the real differences"],
  PrearchivePaymentRequiredError: ["PREARCHIVE_PAYMENT_REQUIRED", "Every payment must predate group archive"],
  AdministrativeReceiptNotReversibleError: ["ADMINISTRATIVE_RECEIPT_NOT_REVERSIBLE", "Administrative receipt is not reversible"],
  AdministrativeReceiptIdempotencyConflictError: ["IDEMPOTENCY_CONFLICT", "Idempotency key conflicts with another request"],
  AdministrativeReceiptIncompatibleStateError: ["INCOMPATIBLE_STATE", "Administrative receipt persistence is incompatible"],
  AdministrativeReceiptConcurrentModificationError: ["CONCURRENT_MODIFICATION", "Administrative receipt context changed concurrently"],
  DirectPaymentGrantAlreadyActiveError: ["DIRECT_PAYMENT_GRANT_ALREADY_ACTIVE", "A direct payment grant is already active"],
};
const exported = { AdministrativeReceiptError };
for (const [name, [reason, message]] of Object.entries(names)) exported[name] = make(name, reason, message);
module.exports = exported;
