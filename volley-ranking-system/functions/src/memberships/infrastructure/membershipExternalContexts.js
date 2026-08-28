"use strict";

const {
  MembershipAccountRequiredError,
  MembershipDependencyUnavailableError,
  MembershipGroupIncompatibleError,
  MembershipGroupNotFoundError,
  MembershipNotAuthorizedError,
  MembershipPersonIncompatibleError,
  MembershipSeasonIncompatibleError,
} = require("../application/membershipErrors");

function createSelfPersonContextAdapter({ selfPersonReader }) {
  if (!selfPersonReader) throw new TypeError("selfPersonReader is required");
  return {
    async getForUser(userId) {
      try {
        const person = await selfPersonReader.getByUserId(userId);
        return person ? Object.freeze({ personId: person.personId }) : null;
      } catch (error) {
        if (error?.reason === "ACCOUNT_NOT_INITIALIZED") throw new MembershipAccountRequiredError({ cause: error });
        if (error?.reason === "PERSON_LINK_INCONSISTENT") throw new MembershipPersonIncompatibleError({ cause: error });
        throw new MembershipDependencyUnavailableError({ cause: error });
      }
    },
  };
}

function createOwnedGroupContextAdapter({ groupService }) {
  if (!groupService) throw new TypeError("groupService is required");
  return {
    async getForOwner({ userId, groupId }) {
      try {
        const { group } = await groupService.getOwnGroup({ userId }, groupId);
        if (group.id !== groupId || group.estado !== "activo" || group.ownerUserId !== userId) {
          throw new MembershipGroupIncompatibleError();
        }
        return Object.freeze({ id: group.id, estado: group.estado, ownerUserId: group.ownerUserId });
      } catch (error) {
        if (error?.reason === "NOT_FOUND") throw new MembershipGroupNotFoundError();
        if (error?.reason === "NOT_AUTHORIZED") throw new MembershipNotAuthorizedError();
        if (error?.reason === "VALIDATION_FAILED") throw new MembershipGroupIncompatibleError({ cause: error });
        if (error instanceof MembershipGroupIncompatibleError) throw error;
        throw new MembershipDependencyUnavailableError({ cause: error });
      }
    },
  };
}

function createOpenSeasonContextAdapter({ seasonService }) {
  if (!seasonService) throw new TypeError("seasonService is required");
  return {
    async getForOwner({ userId, groupId }) {
      try {
        const result = await seasonService.getOpenSeasonContext({ userId }, groupId);
        const season = result.openSeason;
        if (!season) return null;
        if (season.groupId !== groupId || season.estado !== "abierta" || typeof season.id !== "string" || !season.id || season.id.includes("/")) {
          throw new MembershipSeasonIncompatibleError();
        }
        return Object.freeze({ id: season.id, groupId: season.groupId, estado: season.estado });
      } catch (error) {
        if (error?.reason === "GROUP_NOT_FOUND") throw new MembershipGroupNotFoundError();
        if (error?.reason === "GROUP_INCOMPATIBLE") throw new MembershipGroupIncompatibleError({ cause: error });
        if (error?.reason === "NOT_AUTHORIZED") throw new MembershipNotAuthorizedError();
        if (error?.reason === "INCOMPATIBLE_STATE") throw new MembershipSeasonIncompatibleError({ cause: error });
        if (error instanceof MembershipSeasonIncompatibleError) throw error;
        throw new MembershipDependencyUnavailableError({ cause: error });
      }
    },
  };
}

module.exports = { createOpenSeasonContextAdapter, createOwnedGroupContextAdapter, createSelfPersonContextAdapter };
