"use strict";

const functions = require("firebase-functions/v1");
const {
  AuthenticationRequiredError,
  InvalidPersonDataError,
  SelfPersonBootstrapError,
} = require("../application/selfPersonBootstrapErrors");

function identityFromCallableContext(context) {
  if (!context?.auth?.uid) throw new AuthenticationRequiredError();
  return { userId: context.auth.uid };
}

function assertExactPayload(data, expectedKeys) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new InvalidPersonDataError();
  const keys = Object.keys(data).sort();
  const expected = [...expectedKeys].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new InvalidPersonDataError();
  }
}

function assertEnsurePayload(data) {
  assertExactPayload(data, ["firstName", "lastName", "contactEmail"]);
}

function assertEmptyPayload(data) {
  if (data == null) return;
  if (typeof data !== "object" || Array.isArray(data) || Object.keys(data).length > 0) {
    throw new InvalidPersonDataError();
  }
}

function toHttpsError(error) {
  if (error instanceof functions.https.HttpsError) return error;
  if (error instanceof SelfPersonBootstrapError) {
    return new functions.https.HttpsError(error.code, error.message, { reason: error.reason });
  }
  return new functions.https.HttpsError("internal", "Person operation failed", { reason: "PERSON_PERSISTENCE_FAILED" });
}

function createSelfPersonCallableHandler({ operation, validatePayload }) {
  return async (data, context) => {
    try {
      validatePayload(data);
      return await operation(identityFromCallableContext(context), data);
    } catch (error) {
      if (!(error instanceof SelfPersonBootstrapError)) console.error("Person callable failed");
      throw toHttpsError(error);
    }
  };
}

module.exports = {
  assertEmptyPayload,
  assertEnsurePayload,
  createSelfPersonCallableHandler,
  identityFromCallableContext,
  toHttpsError,
};
