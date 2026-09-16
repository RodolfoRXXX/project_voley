"use strict";

const { InvalidPersonStateError } = require("../domain/person");
const { InvalidUserStateError } = require("../../users/domain/user");
const { createFirestorePersonRepository } = require("../infrastructure/firestorePersonRepository");
const { createFirestoreUserPersonLinkRepository } = require("../../users/infrastructure/firestoreUserPersonLinkRepository");

function createAdministrativeMembershipFinalizationPersonCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const personRepository = createFirestorePersonRepository({ db });
  const userRepository = createFirestoreUserPersonLinkRepository({ db });
  async function getPerson(unitOfWork, personId) {
    try {
      const person = await personRepository.getById(personId, unitOfWork);
      return person ? Object.freeze({ status: "found", personId: person.personId, firstName: person.nombre, lastName: person.apellido }) : Object.freeze({ status: "unavailable" });
    } catch (error) {
      if (error instanceof InvalidPersonStateError) return Object.freeze({ status: "unavailable" });
      throw error;
    }
  }
  return Object.freeze({
    async getAccount({ unitOfWork, userId }) {
      let account;
      try { account = await userRepository.getById(userId, unitOfWork); }
      catch (error) { if (error instanceof InvalidUserStateError) return Object.freeze({ status: "account_incompatible" }); throw error; }
      if (!account) return Object.freeze({ status: "account_missing" });
      return Object.freeze({ status: "found", ...(Object.prototype.hasOwnProperty.call(account, "personaId") ? { personId: account.personaId } : {}) });
    },
    async getOwnPerson({ unitOfWork, account }) {
      if (!Object.prototype.hasOwnProperty.call(account, "personId")) return Object.freeze({ status: "absent" });
      const person = await getPerson(unitOfWork, account.personId);
      return person.status === "found" ? person : Object.freeze({ status: "person_incompatible" });
    },
    async getTarget({ unitOfWork, personId }) { return getPerson(unitOfWork, personId); },
  });
}

module.exports = { createAdministrativeMembershipFinalizationPersonCapability };
