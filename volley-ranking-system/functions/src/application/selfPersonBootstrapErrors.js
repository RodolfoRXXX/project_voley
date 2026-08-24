"use strict";

class SelfPersonBootstrapError extends Error {
  constructor(code, reason, message, options = {}) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = code;
    this.reason = reason;
  }
}

class AuthenticationRequiredError extends SelfPersonBootstrapError {
  constructor() { super("unauthenticated", "AUTHENTICATION_REQUIRED", "Authentication is required"); }
}
class InvalidPersonDataError extends SelfPersonBootstrapError {
  constructor(options = {}) { super("invalid-argument", "INVALID_PERSON_DATA", "Person data is invalid", options); }
}
class AccountNotInitializedError extends SelfPersonBootstrapError {
  constructor() { super("failed-precondition", "ACCOUNT_NOT_INITIALIZED", "Account has not been initialized"); }
}
class PersonLinkInconsistentError extends SelfPersonBootstrapError {
  constructor(options = {}) { super("failed-precondition", "PERSON_LINK_INCONSISTENT", "Person link is inconsistent", options); }
}
class ConcurrentModificationError extends SelfPersonBootstrapError {
  constructor(options = {}) { super("aborted", "CONCURRENT_MODIFICATION", "Concurrent modification detected", options); }
}
class PersonServiceUnavailableError extends SelfPersonBootstrapError {
  constructor(options = {}) { super("unavailable", "PERSON_SERVICE_UNAVAILABLE", "Person service is unavailable", options); }
}
class PersonPersistenceError extends SelfPersonBootstrapError {
  constructor(options = {}) { super("internal", "PERSON_PERSISTENCE_FAILED", "Person persistence failed", options); }
}

module.exports = {
  AccountNotInitializedError,
  AuthenticationRequiredError,
  ConcurrentModificationError,
  InvalidPersonDataError,
  PersonLinkInconsistentError,
  PersonPersistenceError,
  PersonServiceUnavailableError,
  SelfPersonBootstrapError,
};
