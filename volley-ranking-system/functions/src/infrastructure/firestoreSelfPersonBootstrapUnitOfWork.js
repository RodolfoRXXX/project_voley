"use strict";

const { InvalidUserStateError, linkPerson } = require("../users/domain/user");
const { InvalidPersonStateError } = require("../persons/domain/person");
const {
  AccountNotInitializedError,
  PersonLinkInconsistentError,
} = require("../application/selfPersonBootstrapErrors");
const { mapPersonPersistenceError } = require("./firestorePersonSupport");

function createFirestoreSelfPersonBootstrapUnitOfWork({ db, userRepository, personRepository }) {
  if (!db || !userRepository || !personRepository) throw new TypeError("transaction dependencies are required");

  return {
    newPersonId() {
      return personRepository.newId();
    },

    async ensureInitialLink({ userId, person }) {
      try {
        return await db.runTransaction(async (transaction) => {
          let user;
          try {
            user = await userRepository.getById(userId, transaction);
          } catch (error) {
            if (error instanceof InvalidUserStateError) throw new PersonLinkInconsistentError({ cause: error });
            throw error;
          }
          if (!user) throw new AccountNotInitializedError();

          if (Object.prototype.hasOwnProperty.call(user, "personaId")) {
            try {
              const existingPerson = await personRepository.getById(user.personaId, transaction);
              if (!existingPerson) throw new PersonLinkInconsistentError();
              return { outcome: "existing", person: existingPerson };
            } catch (error) {
              if (error instanceof InvalidPersonStateError) {
                throw new PersonLinkInconsistentError({ cause: error });
              }
              throw error;
            }
          }

          const linkedUser = linkPerson(user, person.personId);
          personRepository.createInitial(transaction, person);
          userRepository.setInitialPersonLink(transaction, userId, linkedUser);
          return { outcome: "created", person };
        });
      } catch (error) {
        throw mapPersonPersistenceError(error);
      }
    },
  };
}

module.exports = { createFirestoreSelfPersonBootstrapUnitOfWork };
