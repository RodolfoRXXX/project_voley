"use strict";

const { InvalidGroupStateError, buildGroup, normalizeGroupName } = require("../domain/group");
const { toDashboardGroupDto, toGroupDto } = require("./groupDto");
const {
  GroupAccountRequiredError,
  GroupDependencyUnavailableError,
  GroupError,
  GroupInternalError,
  GroupNotAccessibleError,
  GroupUnauthenticatedError,
  GroupValidationError,
} = require("./groupErrors");
const { groupArchiveReceiptId, groupEditToken, groupNameUpdateReceiptId,
  hashGroupArchiveRequest, hashGroupNameUpdateRequest, hashGroupRequest, hashIdempotencyKey } = require("./groupHashing");

function requireActor(identity) {
  if (!identity || typeof identity.userId !== "string" || !identity.userId.trim()) throw new GroupUnauthenticatedError();
  return identity.userId.trim();
}

function createGroupService({ selfAccountReader, groupRepository, ownGroupsReader, creationGuard, groupNameUpdateStore, groupArchiveStore }) {
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
      if (!group || group.ownerId !== userId) throw new GroupNotAccessibleError();
      return Object.freeze({ group: toGroupDto(group), editToken: group.estado === "activo" ? groupEditToken(group) : null });
    },

    async updateOwnGroupName(identity, input) {
      const userId = requireActor(identity);
      if (!groupNameUpdateStore) throw new GroupDependencyUnavailableError();
      let nombre;
      try { nombre = normalizeGroupName(input.nombre); }
      catch (error) {
        if (error instanceof InvalidGroupStateError) throw new GroupValidationError(error.message, { cause: error });
        throw error;
      }
      const command = Object.freeze({ userId, groupId: input.groupId, nombre,
        expectedEditToken: input.expectedEditToken, idempotencyKey: input.idempotencyKey,
        receiptId: groupNameUpdateReceiptId(userId, input.idempotencyKey) });
      try {
        return await groupNameUpdateStore.update(Object.freeze({ ...command,
          requestHash: hashGroupNameUpdateRequest(userId, command) }));
      } catch (error) {
        if (error instanceof GroupError) throw error;
        throw new GroupInternalError({ cause: error });
      }
    },

    async getOwnGroupsDashboard(identity) {
      const userId = requireActor(identity);
      await requireAccount(userId);
      try {
        const groups = await ownGroupsReader.listByOwner(userId);
        return Object.freeze({ items: groups.filter((group) => group.estado === "activo").map(toDashboardGroupDto) });
      } catch (error) {
        throw new GroupDependencyUnavailableError(undefined, { cause: error });
      }
    },

    async prepareOwnGroupArchive(identity, input) {
      const userId = requireActor(identity);
      if (!groupArchiveStore) throw new GroupDependencyUnavailableError();
      try { return await groupArchiveStore.prepare({ userId, groupId: input.groupId }); }
      catch (error) { if (error instanceof GroupError) throw error; throw new GroupInternalError({ cause: error }); }
    },

    async archiveOwnGroup(identity, input) {
      const userId = requireActor(identity);
      if (!groupArchiveStore) throw new GroupDependencyUnavailableError();
      const command = Object.freeze({ userId, groupId: input.groupId,
        expectedArchiveToken: input.expectedArchiveToken, idempotencyKey: input.idempotencyKey,
        receiptId: groupArchiveReceiptId(userId, input.idempotencyKey) });
      try { return await groupArchiveStore.archive(Object.freeze({ ...command,
        requestHash: hashGroupArchiveRequest(userId, command) })); }
      catch (error) { if (error instanceof GroupError) throw error; throw new GroupInternalError({ cause: error }); }
    },
  };
}

module.exports = { createGroupService, requireActor };
