"use strict";

const functions = require("firebase-functions/v1");
const { AccountError } = require("../application/accountErrors");

function toHttpsError(error) {
  if (error instanceof functions.https.HttpsError) return error;
  if (error instanceof AccountError) {
    return new functions.https.HttpsError(error.code, error.message);
  }
  return new functions.https.HttpsError("internal", "Account operation failed");
}

function createAccountCallableHandler({ operation, identityFromContext, validatePayload }) {
  return async (data, context) => {
    try {
      validatePayload(data);
      return await operation(identityFromContext(context));
    } catch (error) {
      if (!(error instanceof AccountError)) {
        console.error("Account callable failed", error);
      }
      throw toHttpsError(error);
    }
  };
}

module.exports = {
  createAccountCallableHandler,
  toHttpsError,
};
