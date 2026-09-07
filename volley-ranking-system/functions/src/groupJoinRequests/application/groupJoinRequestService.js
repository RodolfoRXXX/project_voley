"use strict";
const {
  GroupJoinRequestAccountRequiredError,
  GroupJoinRequestDependencyUnavailableError,
  GroupJoinRequestError,
  GroupJoinRequestInternalError,
  GroupJoinRequestPersonIncompatibleError,
  GroupJoinRequestPersonRequiredError,
  GroupJoinRequestUnauthenticatedError,
} = require("./groupJoinRequestErrors");
const { toOwnGroupJoinRequestDto, toOwnerItem, toPreview } = require("./groupJoinRequestDto");
const { isTransientDependencyError } = require("../../shared/application/transientDependencyError");

function createGroupJoinRequestService({ accountCapability, personCapability, store }) {
  if (!accountCapability || !personCapability || !store) throw new TypeError("Group join request service dependencies are required");
  function actor(identity) { if (!identity || typeof identity.userId !== "string" || !identity.userId.trim()) throw new GroupJoinRequestUnauthenticatedError(); return identity.userId.trim(); }
  async function account(userId) {
    try {
      const result = await accountCapability.getContext({ userId });
      if (result?.status !== "found") throw new GroupJoinRequestAccountRequiredError();
    }
    catch (error) { if (error instanceof GroupJoinRequestError) throw error; if (isTransientDependencyError(error)) throw new GroupJoinRequestDependencyUnavailableError({ cause: error }); throw new GroupJoinRequestInternalError({ cause: error }); }
  }
  async function person(userId) {
    try {
      const value = await personCapability.getOwnContext({ userId });
      if (value?.status === "account_missing") throw new GroupJoinRequestAccountRequiredError();
      if (value?.status === "missing") throw new GroupJoinRequestPersonRequiredError();
      if (value?.status !== "found") throw new GroupJoinRequestPersonIncompatibleError();
      return value;
    } catch (error) {
      if (error instanceof GroupJoinRequestError) throw error;
      if (error?.reason === "ACCOUNT_NOT_INITIALIZED") throw new GroupJoinRequestAccountRequiredError({ cause: error });
      if (error?.reason === "PERSON_LINK_INCONSISTENT") throw new GroupJoinRequestPersonIncompatibleError({ cause: error });
      if (isTransientDependencyError(error)) throw new GroupJoinRequestDependencyUnavailableError({ cause: error });
      throw new GroupJoinRequestInternalError({ cause: error });
    }
  }
  async function candidate(identity) { const userId = actor(identity); await account(userId); const ownPerson = await person(userId); return { userId, personId: ownPerson.personId }; }
  async function safe(work) { try { return await work(); } catch (error) { if (error instanceof GroupJoinRequestError) throw error; throw new GroupJoinRequestInternalError({ cause: error }); } }

  return {
    async getKnownGroupJoinPreview(identity, input, observe) { const context = await candidate(identity); const group = await safe(() => store.preview({ ...context, groupId: input.groupId, observe })); return Object.freeze({ group: toPreview(group) }); },
    async createMyGroupJoinRequest(identity, input, observe) { const context = await candidate(identity); const result = await safe(() => store.create({ ...context, ...input, observe })); return Object.freeze({ outcome: result.outcome, request: toOwnGroupJoinRequestDto(result.request) }); },
    async getMyCurrentGroupJoinRequest(identity, input, observe) { const context = await candidate(identity); const request = await safe(() => store.getCurrent({ personId: context.personId, groupId: input.groupId, observe })); return Object.freeze({ request: request ? toOwnGroupJoinRequestDto(request) : null }); },
    async cancelMyGroupJoinRequest(identity, input, observe) { const context = await candidate(identity); const result = await safe(() => store.cancel({ personId: context.personId, ...input, observe })); return Object.freeze({ outcome: result.outcome, request: toOwnGroupJoinRequestDto(result.request) }); },
    async listPendingGroupJoinRequestsForOwnedGroup(identity, input, observe) { const userId = actor(identity); await account(userId); const result = await safe(() => store.listOwned({ userId, ...input, observe })); return Object.freeze({ items: result.composed.map(({ request, person: value }) => toOwnerItem(request, value)), nextCursor: result.nextCursor }); },
  };
}
module.exports = { createGroupJoinRequestService };
