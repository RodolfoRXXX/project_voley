"use strict";

class GroupJoinRequestError extends Error {
  constructor(reason, message, options = {}) { super(message, options); this.name = this.constructor.name; this.reason = reason; }
}

const definitions = {
  Unauthenticated: ["UNAUTHENTICATED", "Authentication is required"],
  AccountRequired: ["ACCOUNT_REQUIRED", "Account is required"],
  PersonRequired: ["PERSON_REQUIRED", "A linked Person is required"],
  PersonIncompatible: ["PERSON_INCOMPATIBLE", "The linked Person is incompatible"],
  GroupNotAvailable: ["GROUP_NOT_AVAILABLE", "Group is not available"],
  GroupIncompatible: ["GROUP_INCOMPATIBLE", "Group is incompatible"],
  OwnerCannotRequest: ["OWNER_CANNOT_REQUEST", "The Owner cannot request membership"],
  ActiveMembershipExists: ["ACTIVE_MEMBERSHIP_EXISTS", "An active Membership exists"],
  RequestAlreadyPending: ["REQUEST_ALREADY_PENDING", "Another request is pending"],
  RequestNotFound: ["REQUEST_NOT_FOUND", "Request was not found"],
  RequestNotPending: ["REQUEST_NOT_PENDING", "Request is not pending"],
  NotAuthorized: ["NOT_AUTHORIZED", "The actor is not authorized"],
  Validation: ["VALIDATION_FAILED", "Request payload is invalid"],
  IdempotencyConflict: ["IDEMPOTENCY_CONFLICT", "Idempotency key was used with another request"],
  IncompatibleState: ["INCOMPATIBLE_STATE", "Request state is incompatible"],
  Conflict: ["CONFLICT", "Request operation conflicted"],
  DependencyUnavailable: ["DEPENDENCY_UNAVAILABLE", "A required dependency is unavailable"],
  Internal: ["INTERNAL_ERROR", "Group join request operation failed"],
};

const exported = { GroupJoinRequestError };
for (const [name, [reason, message]] of Object.entries(definitions)) {
  const ErrorClass = class extends GroupJoinRequestError {
    constructor(options = {}) { super(reason, message, options); }
  };
  Object.defineProperty(ErrorClass, "name", { value: `GroupJoinRequest${name}Error` });
  exported[`GroupJoinRequest${name}Error`] = ErrorClass;
}

module.exports = exported;
