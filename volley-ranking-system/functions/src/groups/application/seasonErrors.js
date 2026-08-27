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
  SeasonConflictError,
  SeasonDependencyUnavailableError,
  SeasonError,
  SeasonGroupIncompatibleError,
  SeasonGroupNotFoundError,
  SeasonIdempotencyConflictError,
  SeasonIncompatibleStateError,
  SeasonInternalError,
  SeasonNotAuthorizedError,
  SeasonNotFoundError,
  SeasonUnauthenticatedError,
  SeasonValidationError,
};
