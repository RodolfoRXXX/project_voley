"use strict";

const { buildPerson, InvalidPersonStateError } = require("../persons/domain/person");
const { toMyPersonDto } = require("../persons/application/personDto");
const {
  AuthenticationRequiredError,
  InvalidPersonDataError,
  PersonPersistenceError,
  SelfPersonBootstrapError,
} = require("./selfPersonBootstrapErrors");

function requireIdentity(identity) {
  if (!identity?.userId || typeof identity.userId !== "string") {
    throw new AuthenticationRequiredError();
  }
  return identity.userId;
}

function createSelfPersonBootstrapService({ unitOfWork, selfPersonReader }) {
  if (!unitOfWork || !selfPersonReader) throw new TypeError("person dependencies are required");

  return {
    async ensureMyPerson(identity, input) {
      const userId = requireIdentity(identity);
      let person;
      try {
        person = buildPerson({
          personId: unitOfWork.newPersonId(),
          firstName: input?.firstName,
          lastName: input?.lastName,
          contactEmail: input?.contactEmail,
        });
      } catch (error) {
        if (error instanceof InvalidPersonStateError) {
          throw new InvalidPersonDataError({ cause: error });
        }
        throw error;
      }

      try {
        const result = await unitOfWork.ensureInitialLink({ userId, person });
        return { outcome: result.outcome, person: toMyPersonDto(result.person) };
      } catch (error) {
        if (error instanceof SelfPersonBootstrapError) throw error;
        throw new PersonPersistenceError({ cause: error });
      }
    },

    async getMyPerson(identity) {
      const userId = requireIdentity(identity);
      try {
        const person = await selfPersonReader.getByUserId(userId);
        return { person: person ? toMyPersonDto(person) : null };
      } catch (error) {
        if (error instanceof SelfPersonBootstrapError) throw error;
        throw new PersonPersistenceError({ cause: error });
      }
    },
  };
}

module.exports = { createSelfPersonBootstrapService };
