"use strict";

class GroupError extends Error {
  constructor(reason, message, options = {}) {
    super(message, options);
    this.name = this.constructor.name;
    this.reason = reason;
  }
}

class GroupUnauthenticatedError extends GroupError {
  constructor() { super("UNAUTHENTICATED", "Authentication is required"); }
}
class GroupAccountRequiredError extends GroupError {
  constructor(options = {}) { super("ACCOUNT_REQUIRED", "Account is required", options); }
}
class GroupNotAuthorizedError extends GroupError {
  constructor() { super("NOT_AUTHORIZED", "The actor does not own this group"); }
}
class GroupNotFoundError extends GroupError {
  constructor() { super("NOT_FOUND", "Group was not found"); }
}
class GroupValidationError extends GroupError {
  constructor(message = "Group request is invalid", options = {}) { super("VALIDATION_FAILED", message, options); }
}
class GroupLimitReachedError extends GroupError {
  constructor() { super("PROVISIONAL_LIMIT_REACHED", "The provisional one-group limit was reached"); }
}
class GroupConflictError extends GroupError {
  constructor(message = "Group creation conflicted", options = {}) { super("CONFLICT", message, options); }
}
class GroupDependencyUnavailableError extends GroupError {
  constructor(message = "A required dependency is unavailable", options = {}) { super("DEPENDENCY_UNAVAILABLE", message, options); }
}
class GroupInternalError extends GroupError {
  constructor(options = {}) { super("INTERNAL_ERROR", "Group operation failed", options); }
}
class GroupNotAccessibleError extends GroupError {
  constructor() { super("GROUP_NOT_ACCESSIBLE", "Group is not accessible"); }
}
class GroupIncompatibleError extends GroupError {
  constructor(options = {}) { super("GROUP_INCOMPATIBLE", "Group is incompatible", options); }
}
class GroupIdempotencyConflictError extends GroupError {
  constructor() { super("IDEMPOTENCY_CONFLICT", "Idempotency key was used with a different request"); }
}
class GroupStaleUpdateError extends GroupError {
  constructor() { super("STALE_UPDATE", "Group changed since it was read"); }
}

module.exports = {
  GroupAccountRequiredError,
  GroupConflictError,
  GroupDependencyUnavailableError,
  GroupError,
  GroupInternalError,
  GroupIdempotencyConflictError,
  GroupIncompatibleError,
  GroupLimitReachedError,
  GroupNotAuthorizedError,
  GroupNotAccessibleError,
  GroupNotFoundError,
  GroupUnauthenticatedError,
  GroupValidationError,
  GroupStaleUpdateError,
};
