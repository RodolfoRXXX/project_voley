"use strict";

class MemberContextError extends Error {
  constructor(reason, message, options = {}) {
    super(message, options);
    this.name = this.constructor.name;
    this.reason = reason;
  }
}

class MemberContextIncompatibleError extends MemberContextError {
  constructor(message = "Member-readable context is incompatible", options = {}) {
    super("INCOMPATIBLE_STATE", message, options);
  }
}

class MemberContextDependencyUnavailableError extends MemberContextError {
  constructor(options = {}) {
    super("DEPENDENCY_UNAVAILABLE", "Member-readable context is unavailable", options);
  }
}

class MemberContextInternalError extends MemberContextError {
  constructor(options = {}) {
    super("INTERNAL_ERROR", "Member-readable context failed", options);
  }
}

module.exports = {
  MemberContextDependencyUnavailableError,
  MemberContextError,
  MemberContextIncompatibleError,
  MemberContextInternalError,
};
