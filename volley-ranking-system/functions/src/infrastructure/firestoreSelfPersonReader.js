"use strict";

const { InvalidPersonStateError } = require("../persons/domain/person");
const { InvalidUserStateError } = require("../users/domain/user");
const {
  AccountNotInitializedError,
  PersonLinkInconsistentError,
} = require("../application/selfPersonBootstrapErrors");
const { mapPersonPersistenceError } = require("./firestorePersonSupport");
const { IdentityIncompatibleStateError } = require("../accountIdentities/domain/accountIdentity");

function createFirestoreSelfPersonReader({ userRepository, personRepository, accountIdentityStore }) {
  if (!userRepository || !personRepository || !accountIdentityStore) throw new TypeError("reader dependencies are required");

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
        try {
          await accountIdentityStore.assertAccountCompatible({
            accountId: userId,
            legacyPersonId: user.personaId,
          });
        } catch (error) {
          if (error instanceof IdentityIncompatibleStateError) throw new PersonLinkInconsistentError({ cause: error });
          throw error;
        }
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
