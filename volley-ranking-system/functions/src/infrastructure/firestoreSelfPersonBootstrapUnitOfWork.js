"use strict";

const { InvalidUserStateError, linkPerson } = require("../users/domain/user");
const { InvalidPersonStateError } = require("../persons/domain/person");
const {
  AccountNotInitializedError,
  PersonLinkInconsistentError,
} = require("../application/selfPersonBootstrapErrors");
const { mapPersonPersistenceError } = require("./firestorePersonSupport");
const { Timestamp } = require("firebase-admin/firestore");
const { IdentityIncompatibleStateError } = require("../accountIdentities/domain/accountIdentity");

function createFirestoreSelfPersonBootstrapUnitOfWork({ db, userRepository, personRepository, accountIdentityStore }) {
  if (!db || !userRepository || !personRepository || !accountIdentityStore) throw new TypeError("transaction dependencies are required");

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
              await accountIdentityStore.assertAccountCompatibleInTransaction(transaction, {
                accountId: userId,
                legacyPersonId: user.personaId,
              });
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
          const identityOutcome = await accountIdentityStore.ensureMirroredSingleIdentity(transaction, {
            accountId: userId,
            personId: person.personId,
            source: "SELF_BOOTSTRAP",
            occurredAt: Timestamp.now(),
          });
          if (identityOutcome !== "CREATED") throw new IdentityIncompatibleStateError();
          personRepository.createInitial(transaction, person);
          userRepository.setInitialPersonLink(transaction, userId, linkedUser);
          return { outcome: "created", person };
        });
      } catch (error) {
        if (error instanceof IdentityIncompatibleStateError
          || String(error?.code || "").toUpperCase() === "6"
          || String(error?.code || "").toUpperCase() === "ALREADY_EXISTS") {
          throw new PersonLinkInconsistentError({ cause: error });
        }
        throw mapPersonPersistenceError(error);
      }
    },
  };
}

module.exports = { createFirestoreSelfPersonBootstrapUnitOfWork };
