"use strict";

class TreasuryError extends Error { constructor(reason, message = reason, options) { super(message, options); this.name = this.constructor.name; this.reason = reason; } }
const make = (name, reason, message) => class extends TreasuryError { constructor(options) { super(reason, message, options); this.name = name; } };
const TreasuryUnauthenticatedError = make("TreasuryUnauthenticatedError", "UNAUTHENTICATED", "Authentication is required");
const TreasuryValidationError = make("TreasuryValidationError", "VALIDATION_FAILED", "Treasury request is invalid");
const TreasuryAccountContextError = make("TreasuryAccountContextError", "ACCOUNT_CONTEXT_REQUIRED", "A canonical Account and Person are required");
const TreasuryGroupNotAccessibleError = make("TreasuryGroupNotAccessibleError", "GROUP_NOT_ACCESSIBLE", "Group is not accessible");
const TreasuryGroupNotOperationalError = make("TreasuryGroupNotOperationalError", "GROUP_NOT_OPERATIONAL", "Group is not operational");
const TreasuryMembershipNotEligibleError = make("TreasuryMembershipNotEligibleError", "MEMBERSHIP_NOT_ELIGIBLE", "Membership is not eligible");
const TreasuryTargetAccountLinkError = make("TreasuryTargetAccountLinkError", "TARGET_ACCOUNT_LINK_REQUIRED", "A unique Account-Person link is required");
const TreasuryOpenSeasonError = make("TreasuryOpenSeasonError", "OPEN_SEASON_REQUIRED", "An open Season is required");
const TreasuryGrantAlreadyActiveError = make("TreasuryGrantAlreadyActiveError", "TREASURY_GRANT_ALREADY_ACTIVE", "Treasury grant is already active");
const TreasuryGrantNotAccessibleError = make("TreasuryGrantNotAccessibleError", "TREASURY_GRANT_NOT_ACCESSIBLE", "Treasury grant is not accessible");
const TreasuryNotAuthorizedError = make("TreasuryNotAuthorizedError", "GROUP_TREASURY_NOT_AUTHORIZED", "Treasury access is not authorized");
const TreasuryIdempotencyConflictError = make("TreasuryIdempotencyConflictError", "IDEMPOTENCY_CONFLICT", "Idempotency key conflicts with another request");
const TreasuryDataIncompatibleError = make("TreasuryDataIncompatibleError", "DATA_INCOMPATIBLE", "Treasury data is incompatible");
const TreasuryPendingRecoveryError = make("TreasuryPendingRecoveryError", "PENDING_RECOVERY", "Treasury command outcome requires recovery");
module.exports = { TreasuryError, TreasuryUnauthenticatedError, TreasuryValidationError, TreasuryAccountContextError,
  TreasuryGroupNotAccessibleError, TreasuryGroupNotOperationalError, TreasuryMembershipNotEligibleError,
  TreasuryTargetAccountLinkError, TreasuryOpenSeasonError, TreasuryGrantAlreadyActiveError,
  TreasuryGrantNotAccessibleError, TreasuryNotAuthorizedError, TreasuryIdempotencyConflictError,
  TreasuryDataIncompatibleError, TreasuryPendingRecoveryError };
