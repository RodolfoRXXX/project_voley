"use strict";

const { InvalidPersonStateError } = require("../domain/person");
const { InvalidUserStateError } = require("../../users/domain/user");
const { createFirestorePersonRepository } = require("../infrastructure/firestorePersonRepository");
const { createFirestoreUserPersonLinkRepository } = require("../../users/infrastructure/firestoreUserPersonLinkRepository");

function createActiveGroupMemberPersonCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const personRepository = createFirestorePersonRepository({ db });
  const userRepository = createFirestoreUserPersonLinkRepository({ db });

  return Object.freeze({
    async getOwnerPersonReference({ unitOfWork, userId }) {
      try {
        const user = await userRepository.getById(userId, unitOfWork);
        if (!user) return Object.freeze({ status: "account_missing" });
        if (!Object.prototype.hasOwnProperty.call(user, "personaId")) return Object.freeze({ status: "missing" });
        return Object.freeze({ status: "found", personId: user.personaId });
      } catch (error) {
        if (error instanceof InvalidUserStateError) return Object.freeze({ status: "incompatible" });
        throw error;
      }
    },

    async getPresentation({ unitOfWork, personId }) {
      try {
        const person = await personRepository.getById(personId, unitOfWork);
        if (!person) return Object.freeze({ status: "unavailable" });
        return Object.freeze({ status: "available", firstName: person.nombre, lastName: person.apellido });
      } catch (error) {
        if (error instanceof InvalidPersonStateError) return Object.freeze({ status: "unavailable" });
        throw error;
      }
    },
  });
}

module.exports = { createActiveGroupMemberPersonCapability };
