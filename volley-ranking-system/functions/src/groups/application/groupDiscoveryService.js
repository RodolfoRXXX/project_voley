"use strict";

const {
  GroupAccountRequiredError,
  GroupDependencyUnavailableError,
  GroupError,
  GroupInternalError,
  GroupUnauthenticatedError,
} = require("./groupErrors");

function actor(identity) {
  if (!identity || typeof identity.userId !== "string" || !identity.userId.trim()) throw new GroupUnauthenticatedError();
  return identity.userId.trim();
}

function createGroupDiscoveryService({ accountCapability, personCapability, store }) {
  if (!accountCapability || !personCapability || !store) throw new TypeError("Group discovery service dependencies are required");

  async function requireAccount(userId) {
    try {
      const context = await accountCapability.getContext({ userId });
      if (context?.status !== "found") throw new GroupAccountRequiredError();
    } catch (error) {
      if (error instanceof GroupError) throw error;
      throw new GroupDependencyUnavailableError(undefined, { cause: error });
    }
  }

  async function optionalPerson(userId) {
    try {
      const context = await personCapability.getOwnContext({ userId });
      if (context?.status === "found") return context.personId;
      if (context?.status === "missing") return null;
      throw new GroupDependencyUnavailableError("Person context is incompatible");
    } catch (error) {
      if (error instanceof GroupError) throw error;
      throw new GroupDependencyUnavailableError(undefined, { cause: error });
    }
  }

  return Object.freeze({
    async getOwnGroupPublication(identity, input) {
      const userId = actor(identity);
      await requireAccount(userId);
      return store.getOwnState({ userId, groupId: input.groupId });
    },

    async setOwnGroupPublication(identity, input) {
      const userId = actor(identity);
      await requireAccount(userId);
      return store.setOwnState({ userId, groupId: input.groupId, published: input.published });
    },

    async listExploreGroups(identity, input) {
      const userId = actor(identity);
      await requireAccount(userId);
      const personId = await optionalPerson(userId);
      try {
        const page = await store.listExplorePage({ userId, personId, ...input });
        return Object.freeze({
          ...page,
          viewer: Object.freeze({ personStatus: personId ? "available" : "required" }),
        });
      } catch (error) {
        if (error instanceof GroupError) throw error;
        throw new GroupInternalError({ cause: error });
      }
    },
  });
}

module.exports = { actor, createGroupDiscoveryService };
