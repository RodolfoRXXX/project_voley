"use strict";

const { buildMembership, InvalidMembershipStateError } = require("../domain/membership");
const { toFinalizedMembershipDto, toMembershipDto, toMyCurrentGroupMembershipItem } = require("./membershipDto");
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
const { activeMembershipGuardId, hashMembershipIdempotencyKey, hashMembershipRequest, membershipLifecycleGuardId } = require("./membershipHashing");
const { isTransientDependencyError } = require("../../shared/application/transientDependencyError");
const { annotateMembershipError, inheritMembershipDiagnostic } = require("./membershipObservability");

function requireActor(identity) {
  if (!identity || typeof identity.userId !== "string" || !identity.userId.trim()) throw new MembershipUnauthenticatedError();
  return identity.userId.trim();
}

function createMembershipService({ selfAccountReader, selfPersonContext, ownedGroupContext, openSeasonContext, membershipRepository, activeMembershipGuard, lifecycleGuard, myMembershipReader, myCurrentGroupMembershipsReader, memberGroupContext }) {
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

  async function atStage(operation, stage, action) {
    try {
      return await action();
    } catch (error) {
      throw annotateMembershipError(error, { operation, stage });
    }
  }

  function internalAt(error, operation, stage) {
    return inheritMembershipDiagnostic(new MembershipInternalError({ cause: error }), error, {
      operation, stage, mapper: "MembershipInternalError",
    });
  }

  return {
    async createMyMembershipForOwnedGroup(identity, input) {
      const userId = requireActor(identity);
      await atStage("create", "account", () => requireAccount(userId));
      const person = await atStage("create", "person", () => requirePerson(userId));
      await atStage("create", "group", () => requireOwnedGroup(userId, input.groupId));
      const season = await atStage("create", "season", () => requireOpenSeason(userId, input.groupId));
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
        const result = await atStage("create", "active-guard", () => activeMembershipGuard.confirmActiveMembership({
          userId,
          membership,
          guardId: activeMembershipGuardId(membership.groupId, membership.personId),
          lifecycleGuardId: membershipLifecycleGuardId(membership.groupId, membership.personId),
          idempotencyKeyHash: hashMembershipIdempotencyKey(userId, membership.groupId, membership.personId, input.idempotencyKey),
          requestHash: hashMembershipRequest(userId, membership.personId, membership.groupId, membership.seasonId),
          membershipRepository,
          lifecycleGuard,
        }));
        const persisted = result.membership || await membershipRepository.getById(result.membershipId);
        if (!persisted) throw new MembershipDependencyUnavailableError();
        return await atStage("create", "dto", async () => Object.freeze({ outcome: result.outcome, membership: toMembershipDto(persisted) }));
      } catch (error) {
        if (error instanceof MembershipError) throw error;
        throw internalAt(error, "create", "active-guard");
      }
    },

    async getMyMembershipForOwnedGroup(identity, groupId) {
      const userId = requireActor(identity);
      await atStage("get", "account", () => requireAccount(userId));
      const person = await atStage("get", "person", () => requirePerson(userId));
      await atStage("get", "group", () => requireOwnedGroup(userId, groupId));
      try {
        if (lifecycleGuard) {
          try {
            const state = await atStage("get", "lifecycle-guard", () => lifecycleGuard.getForOwner({ userId, personId: person.personId, groupId, membershipRepository }));
            return await atStage("get", "dto", async () => Object.freeze({
              membership: state.kind === "lifecycle-only"
                ? toFinalizedMembershipDto(state.membership)
                : toMembershipDto(state.membership),
            }));
          } catch (error) {
            const { MembershipNotFoundError } = require("./membershipErrors");
            if (error instanceof MembershipNotFoundError) return Object.freeze({ membership: null });
            throw error;
          }
        }
        const membership = await myMembershipReader.getActiveForOwner({ userId, personId: person.personId, groupId });
        return Object.freeze({ membership: membership ? toMembershipDto(membership) : null });
      } catch (error) {
        if (error instanceof MembershipError) throw error;
        throw new MembershipDependencyUnavailableError({ cause: error });
      }
    },

    async finalizeMyMembershipForOwnedGroup(identity, input) {
      const userId = requireActor(identity);
      await atStage("finalize", "account", () => requireAccount(userId));
      const person = await atStage("finalize", "person", () => requirePerson(userId));
      await atStage("finalize", "group", () => requireOwnedGroup(userId, input.groupId));
      if (!lifecycleGuard) throw new MembershipDependencyUnavailableError();
      try {
        const current = await atStage("finalize", "lifecycle-guard", () => lifecycleGuard.getForOwner({
          userId,
          personId: person.personId,
          groupId: input.groupId,
          membershipRepository,
        }));
        if (current.kind === "lifecycle-only") {
          return await atStage("finalize", "dto", async () => Object.freeze({
            outcome: "ALREADY_FINALIZED",
            membership: toFinalizedMembershipDto(current.membership),
          }));
        }
        const openSeason = await atStage("finalize", "season", () => memberGroupContext.getOpenSeason({ groupId: input.groupId }));
        if (openSeason && (openSeason.groupId !== input.groupId || openSeason.estado !== "abierta")) {
          throw new MembershipSeasonIncompatibleError();
        }
        const result = await atStage("finalize", "lifecycle-guard", () => lifecycleGuard.finalizeForOwner({
          userId,
          personId: person.personId,
          groupId: input.groupId,
          openSeasonId: openSeason?.id || null,
          membershipRepository,
        }));
        return await atStage("finalize", "dto", async () => Object.freeze({ outcome: result.outcome, membership: toFinalizedMembershipDto(result.membership) }));
      } catch (error) {
        if (error instanceof MembershipError) throw error;
        throw internalAt(error, "finalize", "lifecycle-guard");
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
