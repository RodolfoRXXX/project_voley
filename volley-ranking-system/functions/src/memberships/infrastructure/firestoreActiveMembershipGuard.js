"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { InvalidGroupStateError } = require("../../groups/domain/group");
const { isTransactionConflict, isUnavailable } = require("../../groups/infrastructure/firestoreGroupCreationGuard");
const { InvalidMembershipStateError } = require("../domain/membership");
const {
  MembershipAlreadyExistsError,
  MembershipConflictError,
  MembershipDependencyUnavailableError,
  MembershipError,
  MembershipGroupIncompatibleError,
  MembershipGroupNotFoundError,
  MembershipIdempotencyConflictError,
  MembershipIncompatibleStateError,
  MembershipNotAuthorizedError,
} = require("../application/membershipErrors");
const { activeMembershipGuardId } = require("../application/membershipHashing");

const ACTIVE_MEMBERSHIP_GUARD_FIELDS = Object.freeze([
  "membershipId", "personId", "groupId", "seasonId",
  "idempotencyKeyHash", "requestHash", "createdAt", "guardVersion",
]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function validId(value) {
  return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/");
}

function hydrateActiveMembershipGuard(snapshot, { guardId, personId, groupId }) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).sort() : [];
  const expected = [...ACTIVE_MEMBERSHIP_GUARD_FIELDS].sort();
  const valid = keys.length === expected.length
    && !keys.some((key, index) => key !== expected[index])
    && validId(data.membershipId) && validId(data.personId) && validId(data.groupId) && validId(data.seasonId)
    && HASH_PATTERN.test(data.idempotencyKeyHash) && HASH_PATTERN.test(data.requestHash)
    && data.createdAt && typeof data.createdAt.toDate === "function" && !Number.isNaN(data.createdAt.toDate().getTime())
    && data.guardVersion === 1
    && snapshot.id === guardId
    && guardId === activeMembershipGuardId(groupId, personId)
    && data.personId === personId && data.groupId === groupId;
  if (!valid) throw new MembershipIncompatibleStateError("Active Membership guard is invalid");
  return Object.freeze(data);
}

function assertMembershipCorrelated(membership, guard) {
  if (!membership
    || membership.membershipId !== guard.membershipId
    || membership.personId !== guard.personId
    || membership.groupId !== guard.groupId
    || membership.seasonId !== guard.seasonId
    || membership.estado !== "activa") {
    throw new MembershipIncompatibleStateError("Active Membership guard reference is inconsistent");
  }
}

async function requireOwnedGroup({ groupRepository, transaction, groupId, userId }) {
  let group;
  try {
    group = await groupRepository.getById(groupId, transaction);
  } catch (error) {
    if (error instanceof InvalidGroupStateError) throw new MembershipGroupIncompatibleError({ cause: error });
    throw error;
  }
  if (!group) throw new MembershipGroupNotFoundError();
  if (group.estado !== "activo") throw new MembershipGroupIncompatibleError();
  if (group.ownerId !== userId) throw new MembershipNotAuthorizedError();
  return group;
}

function mapInfrastructureError(error) {
  if (error instanceof MembershipError) return error;
  if (error instanceof InvalidMembershipStateError) return new MembershipIncompatibleStateError(undefined, { cause: error });
  if (errorChain(error).some(isUnavailable)) return new MembershipDependencyUnavailableError({ cause: error });
  if (isMembershipContention(error)) return new MembershipConflictError({ cause: error });
  return error;
}

function errorChain(error) {
  const chain = [];
  const visited = new Set();
  let current = error;
  while (current && (typeof current === "object" || typeof current === "function") && !visited.has(current) && chain.length < 6) {
    visited.add(current);
    chain.push(current);
    current = current.cause;
  }
  return chain;
}

function isMembershipContention(error) {
  return errorChain(error).some((current) =>
    isTransactionConflict(current)
    || [6, "6", "already-exists", "ALREADY_EXISTS"].includes(current.code)
  );
}

function isAmbiguousTransactionFailure(error) {
  return errorChain(error).some((current) =>
    [2, 13, "2", "13", "unknown", "internal", "UNKNOWN", "INTERNAL"].includes(current.code)
  );
}

async function resolveAfterContention({
  guardRef,
  guardId,
  membership,
  idempotencyKeyHash,
  requestHash,
  membershipRepository,
  unconfirmedError,
}) {
  try {
    const guard = hydrateActiveMembershipGuard(await guardRef.get(), {
      guardId,
      personId: membership.personId,
      groupId: membership.groupId,
    });
    if (!guard) {
      const active = await membershipRepository.activePairQuery(membership).get();
      if (!active.empty) throw new MembershipIncompatibleStateError("Active Membership exists without its guard");
      if (unconfirmedError) throw unconfirmedError;
      throw new MembershipConflictError();
    }

    const persisted = await membershipRepository.getById(guard.membershipId);
    assertMembershipCorrelated(persisted, guard);
    if (guard.idempotencyKeyHash === idempotencyKeyHash) {
      if (guard.requestHash !== requestHash) throw new MembershipIdempotencyConflictError();
      return { outcome: "EXISTING_IDEMPOTENT", membershipId: persisted.membershipId, membership: persisted };
    }
    throw new MembershipAlreadyExistsError();
  } catch (error) {
    throw mapInfrastructureError(error);
  }
}

function createFirestoreActiveMembershipGuard({ db, groupRepository }) {
  if (!db || !groupRepository) throw new TypeError("Active Membership guard dependencies are required");

  return {
    async confirmActiveMembership({ userId, membership, guardId, idempotencyKeyHash, requestHash, membershipRepository }) {
      const guardRef = db.collection("activeMembershipGuards").doc(guardId);
      try {
        return await db.runTransaction(async (transaction) => {
          await requireOwnedGroup({ groupRepository, transaction, groupId: membership.groupId, userId });
          const guard = hydrateActiveMembershipGuard(await transaction.get(guardRef), {
            guardId, personId: membership.personId, groupId: membership.groupId,
          });
          if (guard) {
            const persisted = await membershipRepository.getById(guard.membershipId, transaction);
            assertMembershipCorrelated(persisted, guard);
            if (guard.idempotencyKeyHash === idempotencyKeyHash) {
              if (guard.requestHash !== requestHash) throw new MembershipIdempotencyConflictError();
              return { outcome: "EXISTING_IDEMPOTENT", membershipId: persisted.membershipId, membership: persisted };
            }
            throw new MembershipAlreadyExistsError();
          }

          const active = await transaction.get(membershipRepository.activePairQuery(membership));
          if (!active.empty) throw new MembershipIncompatibleStateError("Active Membership exists without its guard");

          membershipRepository.createInitial(transaction, membership);
          transaction.create(guardRef, {
            membershipId: membership.membershipId,
            personId: membership.personId,
            groupId: membership.groupId,
            seasonId: membership.seasonId,
            idempotencyKeyHash,
            requestHash,
            createdAt: FieldValue.serverTimestamp(),
            guardVersion: 1,
          });
          return { outcome: "CREATED_ACTIVE", membershipId: membership.membershipId };
        });
      } catch (error) {
        if (isMembershipContention(error)) {
          return resolveAfterContention({
            guardRef,
            guardId,
            membership,
            idempotencyKeyHash,
            requestHash,
            membershipRepository,
          });
        }
        if (isAmbiguousTransactionFailure(error)) {
          return resolveAfterContention({
            guardRef,
            guardId,
            membership,
            idempotencyKeyHash,
            requestHash,
            membershipRepository,
            unconfirmedError: error,
          });
        }
        throw mapInfrastructureError(error);
      }
    },
  };
}

module.exports = {
  ACTIVE_MEMBERSHIP_GUARD_FIELDS,
  assertMembershipCorrelated,
  createFirestoreActiveMembershipGuard,
  hydrateActiveMembershipGuard,
  isAmbiguousTransactionFailure,
  isMembershipContention,
  mapInfrastructureError,
  requireOwnedGroup,
  resolveAfterContention,
};
