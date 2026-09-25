"use strict";

class MembershipError extends Error {
  constructor(reason, message, options = {}) {
    super(message, options);
    this.name = this.constructor.name;
    this.reason = reason;
  }
}

class MembershipUnauthenticatedError extends MembershipError { constructor() { super("UNAUTHENTICATED", "Authentication is required"); } }
class MembershipAccountRequiredError extends MembershipError { constructor(options = {}) { super("ACCOUNT_REQUIRED", "Account is required", options); } }
class MembershipPersonRequiredError extends MembershipError { constructor() { super("PERSON_REQUIRED", "A linked Person is required"); } }
class MembershipPersonIncompatibleError extends MembershipError { constructor(options = {}) { super("PERSON_INCOMPATIBLE", "The linked Person is incompatible", options); } }
class MembershipGroupNotFoundError extends MembershipError { constructor() { super("GROUP_NOT_FOUND", "Group was not found"); } }
class MembershipGroupIncompatibleError extends MembershipError { constructor(options = {}) { super("GROUP_INCOMPATIBLE", "Group is incompatible", options); } }
class MembershipNotAuthorizedError extends MembershipError { constructor() { super("NOT_AUTHORIZED", "The actor does not own this group"); } }
class MembershipOpenSeasonRequiredError extends MembershipError { constructor() { super("OPEN_SEASON_REQUIRED", "An open Season is required"); } }
class MembershipSeasonIncompatibleError extends MembershipError { constructor(options = {}) { super("SEASON_INCOMPATIBLE", "Season context is incompatible", options); } }
class MembershipValidationError extends MembershipError { constructor(message = "Membership request is invalid", options = {}) { super("VALIDATION_FAILED", message, options); } }
class MembershipAlreadyExistsError extends MembershipError { constructor() { super("MEMBERSHIP_ALREADY_EXISTS", "An active Membership already exists"); } }
class MembershipNotFoundError extends MembershipError { constructor() { super("MEMBERSHIP_NOT_FOUND", "Membership was not found"); } }
class MembershipNotActiveError extends MembershipError { constructor() { super("MEMBERSHIP_NOT_ACTIVE", "Membership is not active"); } }
class MembershipReactivationRequiredError extends MembershipError { constructor() { super("MEMBERSHIP_REACTIVATION_REQUIRED", "Membership reactivation is required"); } }
class MembershipSeasonNotReactivatableError extends MembershipError { constructor(options = {}) { super("MEMBERSHIP_SEASON_NOT_REACTIVATABLE", "Membership season is not reactivatable", options); } }
class MembershipSeasonNotModifiableError extends MembershipError { constructor(options = {}) { super("MEMBERSHIP_SEASON_NOT_MODIFIABLE", "Membership season is not modifiable", options); } }
class MembershipReactivationSupersededError extends MembershipError { constructor(options = {}) { super("MEMBERSHIP_REACTIVATION_SUPERSEDED", "Membership reactivation was superseded", options); } }
class MembershipRenewalSupersededError extends MembershipError { constructor(options = {}) { super("MEMBERSHIP_RENEWAL_SUPERSEDED", "Membership renewal was superseded", options); } }
class MembershipPredecessorIncompatibleError extends MembershipError { constructor(options = {}) { super("MEMBERSHIP_PREDECESSOR_INCOMPATIBLE", "Membership predecessor is incompatible", options); } }
class MembershipIdempotencyConflictError extends MembershipError { constructor(options = {}) { super("IDEMPOTENCY_CONFLICT", "Idempotency key was used with another request", options); } }
class MembershipIncompatibleStateError extends MembershipError { constructor(message = "Membership state is incompatible", options = {}) { super("INCOMPATIBLE_STATE", message, options); } }
class MembershipConflictError extends MembershipError { constructor(options = {}) { super("CONFLICT", "Membership operation conflicted", options); } }
class MembershipDependencyUnavailableError extends MembershipError { constructor(options = {}) { super("DEPENDENCY_UNAVAILABLE", "A required dependency is unavailable", options); } }
class MembershipInternalError extends MembershipError { constructor(options = {}) { super("INTERNAL_ERROR", "Membership operation failed", options); } }
class MembershipGroupNotAccessibleError extends MembershipError { constructor() { super("GROUP_NOT_ACCESSIBLE", "Group is not accessible"); } }
class MembershipRosterContextChangedError extends MembershipError { constructor() { super("ROSTER_CONTEXT_CHANGED", "Roster context changed"); } }
class MembershipTargetNotAccessibleError extends MembershipError { constructor() { super("TARGET_MEMBERSHIP_NOT_ACCESSIBLE", "Target Membership is not accessible"); } }
class MembershipTargetIsSelfError extends MembershipError { constructor() { super("TARGET_IS_SELF", "The target Membership belongs to the actor"); } }
class MembershipTargetNotActiveError extends MembershipError { constructor() { super("TARGET_MEMBERSHIP_NOT_ACTIVE", "Target Membership is not active"); } }
class MembershipActivationChangedError extends MembershipError { constructor() { super("MEMBERSHIP_ACTIVATION_CHANGED", "Membership activation changed"); } }

module.exports = {
  MembershipAccountRequiredError,
  MembershipAlreadyExistsError,
  MembershipConflictError,
  MembershipDependencyUnavailableError,
  MembershipError,
  MembershipGroupIncompatibleError,
  MembershipGroupNotFoundError,
  MembershipGroupNotAccessibleError,
  MembershipIdempotencyConflictError,
  MembershipIncompatibleStateError,
  MembershipInternalError,
  MembershipNotFoundError,
  MembershipNotActiveError,
  MembershipNotAuthorizedError,
  MembershipOpenSeasonRequiredError,
  MembershipPersonIncompatibleError,
  MembershipPersonRequiredError,
  MembershipReactivationRequiredError,
  MembershipReactivationSupersededError,
  MembershipRenewalSupersededError,
  MembershipPredecessorIncompatibleError,
  MembershipRosterContextChangedError,
  MembershipTargetNotAccessibleError,
  MembershipTargetIsSelfError,
  MembershipTargetNotActiveError,
  MembershipActivationChangedError,
  MembershipSeasonNotReactivatableError,
  MembershipSeasonNotModifiableError,
  MembershipSeasonIncompatibleError,
  MembershipUnauthenticatedError,
  MembershipValidationError,
};
