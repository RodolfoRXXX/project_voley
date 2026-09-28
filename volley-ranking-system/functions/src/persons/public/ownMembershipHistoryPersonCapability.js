"use strict";

const { InvalidPersonStateError } = require("../domain/person");
const { createFirestorePersonRepository } = require("../infrastructure/firestorePersonRepository");
const { InvalidUserStateError } = require("../../users/domain/user");
const { createFirestoreUserPersonLinkRepository } = require("../../users/infrastructure/firestoreUserPersonLinkRepository");

function compatibleAccount(user) {
  return user && typeof user.nombre === "string" && typeof user.email === "string" && Boolean(user.email.trim())
    && (user.photoURL === undefined || typeof user.photoURL === "string");
}

function createOwnMembershipHistoryPersonCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const userRepository = createFirestoreUserPersonLinkRepository({ db });
  const personRepository = createFirestorePersonRepository({ db });

  return Object.freeze({
    async resolve({ unitOfWork, userId }) {
      let user;
      try { user = await userRepository.getById(userId, unitOfWork); }
      catch (error) {
        if (error instanceof InvalidUserStateError) return Object.freeze({ status: "account_incompatible", reads: 1 });
        throw error;
      }
      if (!user) return Object.freeze({ status: "account_missing", reads: 1 });
      if (!compatibleAccount(user)) return Object.freeze({ status: "account_incompatible", reads: 1 });
      if (!Object.prototype.hasOwnProperty.call(user, "personaId")) {
        return Object.freeze({ status: "person_missing", reads: 1 });
      }
      try {
        const person = await personRepository.getById(user.personaId, unitOfWork);
        if (!person) return Object.freeze({ status: "person_incompatible", reads: 2 });
        return Object.freeze({ status: "ready", personId: person.personId, reads: 2 });
      } catch (error) {
        if (error instanceof InvalidPersonStateError) return Object.freeze({ status: "person_incompatible", reads: 2 });
        throw error;
      }
    },
  });
}

module.exports = { createOwnMembershipHistoryPersonCapability };
