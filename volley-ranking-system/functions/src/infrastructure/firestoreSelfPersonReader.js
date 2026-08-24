"use strict";

const { InvalidPersonStateError } = require("../persons/domain/person");
const { InvalidUserStateError } = require("../users/domain/user");
const {
  AccountNotInitializedError,
  PersonLinkInconsistentError,
} = require("../application/selfPersonBootstrapErrors");
const { mapPersonPersistenceError } = require("./firestorePersonSupport");

function createFirestoreSelfPersonReader({ userRepository, personRepository }) {
  if (!userRepository || !personRepository) throw new TypeError("reader dependencies are required");

  return {
    async getByUserId(userId) {
      try {
        let user;
        try {
          user = await userRepository.getById(userId);
        } catch (error) {
          if (error instanceof InvalidUserStateError) throw new PersonLinkInconsistentError({ cause: error });
          throw error;
        }
        if (!user) throw new AccountNotInitializedError();
        if (!Object.prototype.hasOwnProperty.call(user, "personaId")) return null;
        try {
          const person = await personRepository.getById(user.personaId);
          if (!person) throw new PersonLinkInconsistentError();
          return person;
        } catch (error) {
          if (error instanceof InvalidPersonStateError) throw new PersonLinkInconsistentError({ cause: error });
          throw error;
        }
      } catch (error) {
        throw mapPersonPersistenceError(error);
      }
    },
  };
}

module.exports = { createFirestoreSelfPersonReader };
