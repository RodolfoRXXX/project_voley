"use strict";

const { InvalidGroupStateError, buildGroup } = require("../domain/group");
const { toDashboardGroupDto, toGroupDto } = require("./groupDto");
const {
  GroupAccountRequiredError,
  GroupDependencyUnavailableError,
  GroupError,
  GroupInternalError,
  GroupNotAuthorizedError,
  GroupNotFoundError,
  GroupUnauthenticatedError,
  GroupValidationError,
} = require("./groupErrors");
const { hashGroupRequest, hashIdempotencyKey } = require("./groupHashing");

function requireActor(identity) {
  if (!identity || typeof identity.userId !== "string" || !identity.userId.trim()) throw new GroupUnauthenticatedError();
  return identity.userId.trim();
}

function createGroupService({ selfAccountReader, groupRepository, ownGroupsReader, creationGuard }) {
  if (!selfAccountReader || !groupRepository || !ownGroupsReader || !creationGuard) {
    throw new TypeError("Group service dependencies are required");
  }

  async function requireAccount(userId) {
    try {
      const account = await selfAccountReader.getByUserId(userId);
      if (!account) throw new GroupAccountRequiredError();
      if (account.userId !== userId) throw new GroupDependencyUnavailableError("Account identity is inconsistent");
      return account;
    } catch (error) {
      if (error instanceof GroupError) throw error;
      throw new GroupDependencyUnavailableError(undefined, { cause: error });
    }
  }

  async function readPersistedGroup(groupId) {
    try {
      const group = await groupRepository.getById(groupId);
      if (!group) throw new GroupDependencyUnavailableError("Confirmed group could not be recovered");
      return group;
    } catch (error) {
      if (error instanceof GroupError) throw error;
      throw new GroupDependencyUnavailableError(undefined, { cause: error });
    }
  }

  return {
    async createOwnGroup(identity, input) {
      const userId = requireActor(identity);
      await requireAccount(userId);
      let group;
      try {
        group = buildGroup({
          groupId: groupRepository.newId(),
          nombre: input.nombre,
          deporte: input.deporte,
          ownerId: userId,
        });
      } catch (error) {
        if (error instanceof InvalidGroupStateError) throw new GroupValidationError(error.message, { cause: error });
        throw error;
      }

      const idempotencyKeyHash = hashIdempotencyKey(userId, input.idempotencyKey);
      const requestHash = hashGroupRequest(userId, group);
      let result;
      try {
        result = await creationGuard.confirmFirstGroup({
          userId,
          group,
          idempotencyKeyHash,
          requestHash,
          groupRepository,
        });
      } catch (error) {
        if (error instanceof GroupError) throw error;
        throw new GroupInternalError({ cause: error });
      }

      const persisted = result.group || await readPersistedGroup(result.groupId);
      return Object.freeze({ outcome: result.outcome, group: toGroupDto(persisted) });
    },

    async listOwnGroups(identity) {
      const userId = requireActor(identity);
      await requireAccount(userId);
      try {
        const groups = await ownGroupsReader.listByOwner(userId);
        return Object.freeze({ items: groups.map(toGroupDto) });
      } catch (error) {
        if (error instanceof GroupError) throw error;
        throw new GroupDependencyUnavailableError(undefined, { cause: error });
      }
    },

    async getOwnGroup(identity, groupId) {
      const userId = requireActor(identity);
      await requireAccount(userId);
      let group;
      try {
        group = await groupRepository.getById(groupId);
      } catch (error) {
        throw new GroupDependencyUnavailableError(undefined, { cause: error });
      }
      if (!group) throw new GroupNotFoundError();
      if (group.ownerId !== userId) throw new GroupNotAuthorizedError();
      return Object.freeze({ group: toGroupDto(group) });
    },

    async getOwnGroupsDashboard(identity) {
      const userId = requireActor(identity);
      await requireAccount(userId);
      try {
        const groups = await ownGroupsReader.listByOwner(userId);
        return Object.freeze({ items: groups.map(toDashboardGroupDto) });
      } catch (error) {
        throw new GroupDependencyUnavailableError(undefined, { cause: error });
      }
    },
  };
}

module.exports = { createGroupService, requireActor };
