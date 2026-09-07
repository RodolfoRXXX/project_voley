"use strict";

const { InvalidPersonStateError } = require("../domain/person");
const { createFirestorePersonRepository } = require("../infrastructure/firestorePersonRepository");
const { createFirestoreUserPersonLinkRepository } = require("../../users/infrastructure/firestoreUserPersonLinkRepository");
const { createFirestoreSelfPersonReader } = require("../../infrastructure/firestoreSelfPersonReader");

function createGroupJoinRequestPersonCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const repository = createFirestorePersonRepository({ db });
  const selfReader = createFirestoreSelfPersonReader({
    userRepository: createFirestoreUserPersonLinkRepository({ db }),
    personRepository: repository,
  });

  return Object.freeze({
    async getOwnContext({ userId }) {
      try {
        const person = await selfReader.getByUserId(userId);
        return person
          ? Object.freeze({ status: "found", personId: person.personId })
          : Object.freeze({ status: "missing" });
      } catch (error) {
        if (error?.reason === "ACCOUNT_NOT_INITIALIZED") return Object.freeze({ status: "account_missing" });
        if (error?.reason === "PERSON_LINK_INCONSISTENT") return Object.freeze({ status: "incompatible" });
        throw error;
      }
    },

    async getOwnerProjection({ unitOfWork, personId }) {
      try {
        const person = await repository.getById(personId, unitOfWork);
        if (!person) return Object.freeze({ status: "incompatible" });
        return Object.freeze({
          status: "found",
          person: Object.freeze({ firstName: person.nombre, lastName: person.apellido }),
        });
      } catch (error) {
        if (error instanceof InvalidPersonStateError) return Object.freeze({ status: "incompatible" });
        throw error;
      }
    },
  });
}

module.exports = { createGroupJoinRequestPersonCapability };
