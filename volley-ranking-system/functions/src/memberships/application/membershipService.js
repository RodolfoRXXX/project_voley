"use strict";

const { buildMembership, InvalidMembershipStateError } = require("../domain/membership");
const { toMembershipDto, toMyCurrentGroupMembershipItem } = require("./membershipDto");
const { decodeMyGroupsCursor, encodeMyGroupsCursor } = require("./membershipCursor");
const {
  MembershipAccountRequiredError,
  MembershipDependencyUnavailableError,
  MembershipError,
  MembershipInternalError,
  MembershipOpenSeasonRequiredError,
  MembershipPersonRequiredError,
  MembershipSeasonIncompatibleError,
  MembershipUnauthenticatedError,
  MembershipValidationError,
} = require("./membershipErrors");
const { activeMembershipGuardId, hashMembershipIdempotencyKey, hashMembershipRequest } = require("./membershipHashing");
const { isTransientDependencyError } = require("../../shared/application/transientDependencyError");

function requireActor(identity) {
  if (!identity || typeof identity.userId !== "string" || !identity.userId.trim()) throw new MembershipUnauthenticatedError();
  return identity.userId.trim();
}

function createMembershipService({ selfAccountReader, selfPersonContext, ownedGroupContext, openSeasonContext, membershipRepository, activeMembershipGuard, myMembershipReader, myCurrentGroupMembershipsReader, memberGroupContext }) {
  if (!selfAccountReader || !selfPersonContext || !ownedGroupContext || !openSeasonContext || !membershipRepository || !activeMembershipGuard || !myMembershipReader) {
    throw new TypeError("Membership service dependencies are required");
  }

  async function requireAccount(userId) {
    try {
      const account = await selfAccountReader.getByUserId(userId);
      if (!account) throw new MembershipAccountRequiredError();
      if (account.userId !== userId) throw new MembershipDependencyUnavailableError();
    } catch (error) {
      if (error instanceof MembershipError) throw error;
      if (isTransientDependencyError(error)) throw new MembershipDependencyUnavailableError({ cause: error });
      throw new MembershipInternalError({ cause: error });
    }
  }

  async function requirePerson(userId) {
    const person = await selfPersonContext.getForUser(userId);
    if (!person) throw new MembershipPersonRequiredError();
    return person;
  }

  async function requireOwnedGroup(userId, groupId) {
    return ownedGroupContext.getForOwner({ userId, groupId });
  }

  async function requireOpenSeason(userId, groupId) {
    const season = await openSeasonContext.getForOwner({ userId, groupId });
    if (!season) throw new MembershipOpenSeasonRequiredError();
    if (season.groupId !== groupId || season.estado !== "abierta") throw new MembershipSeasonIncompatibleError();
    return season;
  }

  return {
    async createMyMembershipForOwnedGroup(identity, input) {
      const userId = requireActor(identity);
      await requireAccount(userId);
      const person = await requirePerson(userId);
      await requireOwnedGroup(userId, input.groupId);
      const season = await requireOpenSeason(userId, input.groupId);
      let membership;
      try {
        membership = buildMembership({
          membershipId: membershipRepository.newId(),
          personId: person.personId,
          groupId: input.groupId,
          seasonId: season.id,
        });
      } catch (error) {
        if (error instanceof InvalidMembershipStateError) throw new MembershipValidationError(error.message, { cause: error });
        throw error;
      }

      try {
        const result = await activeMembershipGuard.confirmActiveMembership({
          userId,
          membership,
          guardId: activeMembershipGuardId(membership.groupId, membership.personId),
          idempotencyKeyHash: hashMembershipIdempotencyKey(userId, membership.groupId, membership.personId, input.idempotencyKey),
          requestHash: hashMembershipRequest(userId, membership.personId, membership.groupId, membership.seasonId),
          membershipRepository,
        });
        const persisted = result.membership || await membershipRepository.getById(result.membershipId);
        if (!persisted) throw new MembershipDependencyUnavailableError();
        return Object.freeze({ outcome: result.outcome, membership: toMembershipDto(persisted) });
      } catch (error) {
        if (error instanceof MembershipError) throw error;
        throw new MembershipInternalError({ cause: error });
      }
    },

    async getMyMembershipForOwnedGroup(identity, groupId) {
      const userId = requireActor(identity);
      await requireAccount(userId);
      const person = await requirePerson(userId);
      await requireOwnedGroup(userId, groupId);
      try {
        const membership = await myMembershipReader.getActiveForOwner({ userId, personId: person.personId, groupId });
        return Object.freeze({ membership: membership ? toMembershipDto(membership) : null });
      } catch (error) {
        if (error instanceof MembershipError) throw error;
        throw new MembershipDependencyUnavailableError({ cause: error });
      }
    },

    async listMyCurrentGroupMemberships(identity, input) {
      const userId = requireActor(identity);
      await requireAccount(userId);
      const person = await requirePerson(userId);
      if (!myCurrentGroupMembershipsReader || !memberGroupContext) {
        throw new MembershipDependencyUnavailableError();
      }
      const position = input.cursor ? decodeMyGroupsCursor(input.cursor) : null;
      try {
        const page = await myCurrentGroupMembershipsReader.listPage({
          personId: person.personId,
          pageSize: input.pageSize,
          position,
        });
        const items = [];
        for (const candidate of page.candidates) {
          await myCurrentGroupMembershipsReader.requireIntegrity({ personId: person.personId, candidate });
          const group = await memberGroupContext.getGroup({ groupId: candidate.groupId });
          const openSeason = await memberGroupContext.getOpenSeason({ groupId: candidate.groupId });
          if (!openSeason || openSeason.id !== candidate.seasonId) continue;
          items.push(toMyCurrentGroupMembershipItem(candidate, group));
        }
        const nextCursor = page.hasLookahead
          ? encodeMyGroupsCursor(page.cursorAnchor)
          : null;
        return Object.freeze({ items: Object.freeze(items), nextCursor });
      } catch (error) {
        if (error instanceof MembershipError) throw error;
        if (isTransientDependencyError(error)) throw new MembershipDependencyUnavailableError({ cause: error });
        throw new MembershipInternalError({ cause: error });
      }
    },
  };
}

module.exports = { createMembershipService, requireActor };
