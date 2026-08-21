"use strict";

class AccountError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = code;
  }
}

class AccountUnauthenticatedError extends AccountError {
  constructor() {
    super("unauthenticated", "Authentication is required");
  }
}

class AccountInvalidArgumentError extends AccountError {
  constructor(message = "The request must have an empty payload") {
    super("invalid-argument", message);
  }
}

class AccountIdentityIncompleteError extends AccountError {
  constructor(message = "Authenticated identity is incomplete", options = {}) {
    super("failed-precondition", message, options);
  }
}

class AccountNotFoundError extends AccountError {
  constructor() {
    super("not-found", "Account has not been initialized");
  }
}

class AccountAlreadyExistsError extends AccountError {
  constructor(options = {}) {
    super("already-exists", "Account already exists", options);
  }
}

class AccountPersistenceError extends AccountError {
  constructor(message = "Account persistence failed", options = {}) {
    super("internal", message, options);
  }
}

module.exports = {
  AccountAlreadyExistsError,
  AccountError,
  AccountIdentityIncompleteError,
  AccountInvalidArgumentError,
  AccountNotFoundError,
  AccountPersistenceError,
  AccountUnauthenticatedError,
};
