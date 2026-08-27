"use strict";

const { InvalidGroupStateError } = require("../domain/group");
const { InvalidSeasonStateError } = require("../domain/season");
const {
  SeasonDependencyUnavailableError,
  SeasonError,
  SeasonGroupIncompatibleError,
  SeasonGroupNotFoundError,
  SeasonIncompatibleStateError,
  SeasonNotAuthorizedError,
  SeasonNotFoundError,
} = require("../application/seasonErrors");
const { hydrateOpenSeasonGuard } = require("./firestoreOpenSeasonGuard");
const { isTransactionConflict, isUnavailable } = require("./firestoreGroupCreationGuard");
const { SeasonConflictError } = require("../application/seasonErrors");

function createFirestoreOpenSeasonReader({ db, groupRepository, seasonRepository }) {
  if (!db || !groupRepository || !seasonRepository) throw new TypeError("Open season reader dependencies are required");

  async function requireOwnedGroup(transaction, groupId, userId) {
    let group;
    try {
      group = await groupRepository.getById(groupId, transaction);
    } catch (error) {
      if (error instanceof InvalidGroupStateError) throw new SeasonGroupIncompatibleError({ cause: error });
      throw error;
    }
    if (!group) throw new SeasonGroupNotFoundError();
    if (group.ownerId !== userId) throw new SeasonNotAuthorizedError();
    return group;
  }

  async function runRead(operation) {
    try {
      return await db.runTransaction(operation);
    } catch (error) {
      if (error instanceof SeasonError) throw error;
      if (error instanceof InvalidSeasonStateError) throw new SeasonIncompatibleStateError(undefined, { cause: error });
      if (isUnavailable(error)) throw new SeasonDependencyUnavailableError({ cause: error });
      if (isTransactionConflict(error)) throw new SeasonConflictError({ cause: error });
      throw error;
    }
  }

  return {
    async getOpenForOwner({ userId, groupId }) {
      return runRead(async (transaction) => {
        await requireOwnedGroup(transaction, groupId, userId);
        const guard = hydrateOpenSeasonGuard(await transaction.get(db.collection("openSeasonGuards").doc(groupId)), groupId);
        if (!guard) {
          const existing = await transaction.get(db.collection("seasons").where("groupId", "==", groupId).limit(1));
          if (!existing.empty) throw new SeasonIncompatibleStateError("Season exists without its open guard");
          return null;
        }
        const season = await seasonRepository.getById(guard.seasonId, transaction);
        if (!season || season.groupId !== groupId || season.estado !== "abierta") {
          throw new SeasonIncompatibleStateError("Open season guard reference is inconsistent");
        }
        return season;
      });
    },

    async getByIdForOwner({ userId, groupId, seasonId }) {
      return runRead(async (transaction) => {
        await requireOwnedGroup(transaction, groupId, userId);
        const season = await seasonRepository.getById(seasonId, transaction);
        if (!season || season.groupId !== groupId) throw new SeasonNotFoundError();
        return season;
      });
    },
  };
}

module.exports = { createFirestoreOpenSeasonReader };
