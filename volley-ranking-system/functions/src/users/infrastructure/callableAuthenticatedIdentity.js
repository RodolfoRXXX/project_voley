"use strict";

const {
  AccountInvalidArgumentError,
  AccountUnauthenticatedError,
} = require("../application/accountErrors");

function assertEmptyPayload(data) {
  if (data == null) return;
  if (
    typeof data !== "object"
    || Array.isArray(data)
    || Object.keys(data).length > 0
  ) {
    throw new AccountInvalidArgumentError();
  }
}

function identityFromCallableContext(context) {
  if (!context?.auth?.uid) throw new AccountUnauthenticatedError();

  const token = context.auth.token || {};
  return {
    userId: context.auth.uid,
    email: token.email,
    displayName: token.name || "",
    photoUrl: token.picture || "",
  };
}

module.exports = {
  assertEmptyPayload,
  identityFromCallableContext,
};
