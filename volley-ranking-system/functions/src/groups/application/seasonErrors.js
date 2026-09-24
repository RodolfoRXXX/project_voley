"use strict";

class SeasonError extends Error {
  constructor(reason, message, options = {}) {
    super(message, options);
    this.name = this.constructor.name;
    this.reason = reason;
  }
}

class SeasonUnauthenticatedError extends SeasonError {
  constructor() { super("UNAUTHENTICATED", "Authentication is required"); }
}
class SeasonAccountRequiredError extends SeasonError {
  constructor(options = {}) { super("ACCOUNT_REQUIRED", "Account is required", options); }
}
class SeasonGroupNotFoundError extends SeasonError {
  constructor() { super("GROUP_NOT_FOUND", "Group was not found"); }
}
class SeasonGroupIncompatibleError extends SeasonError {
  constructor(options = {}) { super("GROUP_INCOMPATIBLE", "Group is incompatible", options); }
}
class SeasonGroupNotAccessibleError extends SeasonError {
  constructor() { super("GROUP_NOT_ACCESSIBLE", "Group is not accessible"); }
}
class SeasonCursorInvalidError extends SeasonError {
  constructor(message = "Season history cursor is invalid", options = {}) { super("CURSOR_INVALID", message, options); }
}
class SeasonCursorStaleError extends SeasonError {
  constructor(options = {}) { super("CURSOR_STALE", "Season history changed; restart pagination", options); }
}
class SeasonNotAuthorizedError extends SeasonError {
  constructor() { super("NOT_AUTHORIZED", "The actor does not own this group"); }
}
class SeasonNotFoundError extends SeasonError {
  constructor() { super("SEASON_NOT_FOUND", "Season was not found"); }
}
class SeasonValidationError extends SeasonError {
  constructor(message = "Season request is invalid", options = {}) { super("VALIDATION_FAILED", message, options); }
}
class OpenSeasonAlreadyExistsError extends SeasonError {
  constructor() { super("OPEN_SEASON_ALREADY_EXISTS", "An open season already exists"); }
}
class SeasonIncompatibleStateError extends SeasonError {
  constructor(message = "Season state is incompatible", options = {}) { super("INCOMPATIBLE_STATE", message, options); }
}
class SeasonNotOpenError extends SeasonError { constructor() { super("SEASON_NOT_OPEN", "Season is not open"); } }
class SeasonAlreadyClosedError extends SeasonError { constructor() { super("SEASON_ALREADY_CLOSED", "Season is already closed"); } }
class SeasonNotAccessibleError extends SeasonError { constructor() { super("SEASON_NOT_ACCESSIBLE", "Season is not accessible"); } }
class SeasonStaleUpdateError extends SeasonError { constructor() { super("STALE_UPDATE", "Season changed since it was read"); } }
class SeasonGuardMissingError extends SeasonError { constructor() { super("SEASON_GUARD_MISSING", "Open Season guard is missing"); } }
class SeasonGuardIncompatibleError extends SeasonError { constructor(options = {}) { super("SEASON_GUARD_INCOMPATIBLE", "Open Season guard is incompatible", options); } }
class SeasonActiveMembershipsExistError extends SeasonError { constructor() { super("ACTIVE_MEMBERSHIPS_EXIST", "Active Memberships must be finalized first"); } }
class SeasonMembershipSeasonIncompatibleError extends SeasonError { constructor() { super("MEMBERSHIP_SEASON_INCOMPATIBLE", "An active Membership belongs to another Season"); } }
class SeasonMembershipPeriodIncompatibleError extends SeasonError { constructor(options = {}) { super("MEMBERSHIP_PERIOD_INCOMPATIBLE", "An active Membership period is incompatible", options); } }
class SeasonMembershipActiveGuardIncompatibleError extends SeasonError { constructor(options = {}) { super("MEMBERSHIP_ACTIVE_GUARD_INCOMPATIBLE", "An active Membership guard is incompatible", options); } }
class SeasonApprovalInProgressError extends SeasonError { constructor() { super("APPROVAL_IN_PROGRESS", "A Membership approval is in progress"); } }
class SeasonOwnershipChangedError extends SeasonError { constructor() { super("OWNERSHIP_CHANGED", "Group ownership changed before commit"); } }
class SeasonDependencyNotConfiguredError extends SeasonError { constructor(options = {}) { super("DEPENDENCY_NOT_CONFIGURED", "A required dependency is not configured", options); } }
class SeasonIdempotencyConflictError extends SeasonError {
  constructor(options = {}) { super("IDEMPOTENCY_CONFLICT", "Idempotency key was used with another request", options); }
}
class SeasonConflictError extends SeasonError {
  constructor(options = {}) { super("CONFLICT", "Season operation conflicted", options); }
}
class SeasonDependencyUnavailableError extends SeasonError {
  constructor(options = {}) { super("DEPENDENCY_UNAVAILABLE", "A required dependency is unavailable", options); }
}
class SeasonInternalError extends SeasonError {
  constructor(options = {}) { super("INTERNAL_ERROR", "Season operation failed", options); }
}

module.exports = {
  OpenSeasonAlreadyExistsError,
  SeasonAccountRequiredError,
  SeasonActiveMembershipsExistError,
  SeasonAlreadyClosedError,
  SeasonNotAccessibleError,
  SeasonApprovalInProgressError,
  SeasonConflictError,
  SeasonDependencyNotConfiguredError,
  SeasonDependencyUnavailableError,
  SeasonError,
  SeasonGuardIncompatibleError,
  SeasonGuardMissingError,
  SeasonGroupIncompatibleError,
  SeasonGroupNotAccessibleError,
  SeasonGroupNotFoundError,
  SeasonIdempotencyConflictError,
  SeasonIncompatibleStateError,
  SeasonInternalError,
  SeasonCursorInvalidError,
  SeasonCursorStaleError,
  SeasonMembershipActiveGuardIncompatibleError,
  SeasonMembershipPeriodIncompatibleError,
  SeasonMembershipSeasonIncompatibleError,
  SeasonNotAuthorizedError,
  SeasonNotFoundError,
  SeasonNotOpenError,
  SeasonStaleUpdateError,
  SeasonOwnershipChangedError,
  SeasonUnauthenticatedError,
  SeasonValidationError,
};
