"use strict";

const { createAccountService } = require("../application/accountService");
const { createFirestoreUserRepository } = require("../infrastructure/firestoreUserRepository");

function createGroupJoinRequestAccountCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const service = createAccountService({ userRepository: createFirestoreUserRepository({ db }) });
  return Object.freeze({
    async getContext({ userId }) {
      try {
        await service.getMyAccount({ userId });
        return Object.freeze({ status: "found" });
      } catch (error) {
        if (error?.code === "not-found") return Object.freeze({ status: "missing" });
        throw error;
      }
    },
  });
}

module.exports = { createGroupJoinRequestAccountCapability };
