"use strict";

const {
  InvalidUserStateError,
  buildInitialUser,
} = require("../domain/user");
const { toMyAccountDto } = require("./accountDto");
const {
  AccountAlreadyExistsError,
  AccountIdentityIncompleteError,
  AccountNotFoundError,
  AccountPersistenceError,
  AccountUnauthenticatedError,
} = require("./accountErrors");

function requireAuthenticatedIdentity(identity) {
  if (!identity || typeof identity.userId !== "string" || !identity.userId.trim()) {
    throw new AccountUnauthenticatedError();
  }
  return { ...identity, userId: identity.userId.trim() };
}

function buildAccountFromIdentity(identity) {
  try {
    return buildInitialUser(identity);
  } catch (error) {
    if (error instanceof InvalidUserStateError) {
      throw new AccountIdentityIncompleteError(undefined, { cause: error });
    }
    throw error;
  }
}

function createAccountService({ userRepository }) {
  if (!userRepository) throw new TypeError("userRepository is required");

  return {
    async ensureMyAccount(rawIdentity) {
      const identity = requireAuthenticatedIdentity(rawIdentity);
      const initialUser = buildAccountFromIdentity(identity);

      try {
        await userRepository.create(identity.userId, initialUser);
        return toMyAccountDto(identity.userId, initialUser);
      } catch (error) {
        if (!(error instanceof AccountAlreadyExistsError)) {
          if (error instanceof AccountPersistenceError) throw error;
          throw new AccountPersistenceError(undefined, { cause: error });
        }
      }

      try {
        const existing = await userRepository.getById(identity.userId);
        if (!existing) {
          throw new AccountPersistenceError(
            "Account existed during creation but could not be recovered"
          );
        }
        return toMyAccountDto(identity.userId, existing);
      } catch (error) {
        if (error instanceof AccountPersistenceError) throw error;
        throw new AccountPersistenceError(undefined, { cause: error });
      }
    },

    async getMyAccount(rawIdentity) {
      const identity = requireAuthenticatedIdentity(rawIdentity);

      let existing;
      try {
        existing = await userRepository.getById(identity.userId);
      } catch (error) {
        throw new AccountPersistenceError(undefined, { cause: error });
      }

      if (!existing) throw new AccountNotFoundError();
      return toMyAccountDto(identity.userId, existing);
    },
  };
}

module.exports = {
  createAccountService,
  requireAuthenticatedIdentity,
};
