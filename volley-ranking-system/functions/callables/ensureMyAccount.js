"use strict";

const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");
const { createAccountService } = require("../src/users/application/accountService");
const {
  createAccountCallableHandler,
} = require("../src/users/infrastructure/accountCallable");
const {
  assertEmptyPayload,
  identityFromCallableContext,
} = require("../src/users/infrastructure/callableAuthenticatedIdentity");
const {
  createFirestoreUserRepository,
} = require("../src/users/infrastructure/firestoreUserRepository");

const service = createAccountService({
  userRepository: createFirestoreUserRepository({ db }),
});

module.exports = functions.https.onCall(
  createAccountCallableHandler({
    operation: service.ensureMyAccount,
    identityFromContext: identityFromCallableContext,
    validatePayload: assertEmptyPayload,
  })
);
