"use strict";

const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");
const { createSelfPersonBootstrapService } = require("../src/application/selfPersonBootstrapService");
const { createFirestoreSelfPersonBootstrapUnitOfWork } = require("../src/infrastructure/firestoreSelfPersonBootstrapUnitOfWork");
const { createFirestoreSelfPersonReader } = require("../src/infrastructure/firestoreSelfPersonReader");
const { assertEnsurePayload, createSelfPersonCallableHandler } = require("../src/infrastructure/selfPersonBootstrapCallable");
const { createFirestorePersonRepository } = require("../src/persons/infrastructure/firestorePersonRepository");
const { createFirestoreUserPersonLinkRepository } = require("../src/users/infrastructure/firestoreUserPersonLinkRepository");
const { createFirestoreAccountIdentityStore } = require("../src/accountIdentities/infrastructure/firestoreAccountIdentityStore");

const personRepository = createFirestorePersonRepository({ db });
const userRepository = createFirestoreUserPersonLinkRepository({ db });
const accountIdentityStore = createFirestoreAccountIdentityStore({ db });
const service = createSelfPersonBootstrapService({
  unitOfWork: createFirestoreSelfPersonBootstrapUnitOfWork({ db, personRepository, userRepository, accountIdentityStore }),
  selfPersonReader: createFirestoreSelfPersonReader({ personRepository, userRepository, accountIdentityStore }),
});

module.exports = functions.https.onCall(createSelfPersonCallableHandler({
  operation: service.ensureMyPerson,
  validatePayload: assertEnsurePayload,
}));
