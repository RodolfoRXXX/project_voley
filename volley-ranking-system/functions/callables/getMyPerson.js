"use strict";

const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");
const { createSelfPersonBootstrapService } = require("../src/application/selfPersonBootstrapService");
const { createFirestoreSelfPersonBootstrapUnitOfWork } = require("../src/infrastructure/firestoreSelfPersonBootstrapUnitOfWork");
const { createFirestoreSelfPersonReader } = require("../src/infrastructure/firestoreSelfPersonReader");
const { assertEmptyPayload, createSelfPersonCallableHandler } = require("../src/infrastructure/selfPersonBootstrapCallable");
const { createFirestorePersonRepository } = require("../src/persons/infrastructure/firestorePersonRepository");
const { createFirestoreUserPersonLinkRepository } = require("../src/users/infrastructure/firestoreUserPersonLinkRepository");

const personRepository = createFirestorePersonRepository({ db });
const userRepository = createFirestoreUserPersonLinkRepository({ db });
const service = createSelfPersonBootstrapService({
  unitOfWork: createFirestoreSelfPersonBootstrapUnitOfWork({ db, personRepository, userRepository }),
  selfPersonReader: createFirestoreSelfPersonReader({ personRepository, userRepository }),
});

module.exports = functions.https.onCall(createSelfPersonCallableHandler({
  operation: service.getMyPerson,
  validatePayload: assertEmptyPayload,
}));
