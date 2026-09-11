"use strict";

const { Timestamp } = require("firebase-admin/firestore");
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
  MembershipNotFoundError,
  MembershipReactivationRequiredError,
} = require("../application/membershipErrors");
const { activeMembershipGuardId } = require("../application/membershipHashing");
const { annotateMembershipError } = require("../application/membershipObservability");

const ACTIVE_MEMBERSHIP_GUARD_V1_FIELDS = Object.freeze([
  "membershipId", "personId", "groupId", "seasonId",
  "idempotencyKeyHash", "requestHash", "createdAt", "guardVersion",
]);
const ACTIVE_MEMBERSHIP_GUARD_FIELDS = Object.freeze([
  "membershipId", "personId", "groupId", "seasonId", "activationOrdinal", "activatedAt",
  "activationIdempotencyHash", "activationRequestHash", "guardVersion",
]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const transactionOperationByError = new WeakMap();

async function atTransactionOperation(operation, work) {
  try {
    return await work();
  } catch (error) {
    if (error && (typeof error === "object" || typeof error === "function")) {
      transactionOperationByError.set(error, operation);
    }
    throw error;
  }
}

function validId(value) {
  return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/");
}

function hydrateActiveMembershipGuard(snapshot, { guardId, personId, groupId }) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).sort() : [];
  const version = data?.guardVersion;
  const expected = [...(version === 1 ? ACTIVE_MEMBERSHIP_GUARD_V1_FIELDS : ACTIVE_MEMBERSHIP_GUARD_FIELDS)].sort();
  const valid = keys.length === expected.length
    && !keys.some((key, index) => key !== expected[index])
    && validId(data.membershipId) && validId(data.personId) && validId(data.groupId) && validId(data.seasonId)
    && HASH_PATTERN.test(version === 1 ? data.idempotencyKeyHash : data.activationIdempotencyHash)
    && HASH_PATTERN.test(version === 1 ? data.requestHash : data.activationRequestHash)
    && (version === 1
      ? data.createdAt && typeof data.createdAt.toDate === "function" && !Number.isNaN(data.createdAt.toDate().getTime())
      : Number.isSafeInteger(data.activationOrdinal) && data.activationOrdinal > 0 && data.activatedAt && typeof data.activatedAt.toDate === "function" && !Number.isNaN(data.activatedAt.toDate().getTime()))
    && [1, 2].includes(version)
    && snapshot.id === guardId
    && guardId === activeMembershipGuardId(groupId, personId)
    && data.personId === personId && data.groupId === groupId;
  if (!valid) throw new MembershipIncompatibleStateError("Active Membership guard is invalid");
  return Object.freeze(data);
}

function assertMembershipCorrelated(membership, guard, currentPeriod) {
  if (!membership
    || membership.membershipId !== guard.membershipId
    || membership.personId !== guard.personId
    || membership.groupId !== guard.groupId
    || membership.seasonId !== guard.seasonId
    || membership.estado !== "activa"
    || (guard.guardVersion === 1 && membership.schemaVersion !== 1)
    || (guard.guardVersion === 2 && membership.schemaVersion !== 3)
    || (guard.guardVersion === 2 && currentPeriod && (membership.periodCount !== guard.activationOrdinal || membership.latestPeriodId !== currentPeriod.periodId
      || currentPeriod?.estado !== "abierto" || currentPeriod.ordinal !== guard.activationOrdinal
      || currentPeriod.startedAt.toDate().getTime() !== guard.activatedAt.toDate().getTime()))) {
    throw new MembershipIncompatibleStateError("Active Membership guard reference is inconsistent");
  }
}

function guardIdempotencyHash(guard) { return guard.guardVersion === 1 ? guard.idempotencyKeyHash : guard.activationIdempotencyHash; }
function guardRequestHash(guard) { return guard.guardVersion === 1 ? guard.requestHash : guard.activationRequestHash; }

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

function isClosedFinalizedMembershipQueryFailure(error) {
  return errorChain(error).some((current) =>
    [3, "3"].includes(current.code)
    && transactionOperationByError.get(current) === "finalized-membership-query"
  );
}

function isCreateTransactionBoundaryCode3(error) {
  return errorChain(error).some((current) => [3, "3"].includes(current.code));
}

async function resolveAfterContention({
  guardRef,
  guardId,
  membership,
  idempotencyKeyHash,
  requestHash,
  membershipRepository,
  unconfirmedError,
  userId,
  lifecycleGuard,
}) {
  try {
    if (lifecycleGuard) {
      try {
        const state = await lifecycleGuard.getForOwner({
          userId,
          personId: membership.personId,
          groupId: membership.groupId,
          membershipRepository,
        });
        if (state.kind === "lifecycle-only") throw new MembershipReactivationRequiredError();
        const activeGuard = state.activeGuard;
        if (guardIdempotencyHash(activeGuard) === idempotencyKeyHash) {
          if (guardRequestHash(activeGuard) !== requestHash) throw new MembershipIdempotencyConflictError();
          return { outcome: "EXISTING_IDEMPOTENT", membershipId: state.membership.membershipId, membership: state.membership };
        }
        throw new MembershipAlreadyExistsError();
      } catch (error) {
        if (!(error instanceof MembershipNotFoundError)) throw error;
        if (unconfirmedError) throw unconfirmedError;
        throw new MembershipConflictError();
      }
    }
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
    if (guardIdempotencyHash(guard) === idempotencyKeyHash) {
      if (guardRequestHash(guard) !== requestHash) throw new MembershipIdempotencyConflictError();
      return { outcome: "EXISTING_IDEMPOTENT", membershipId: persisted.membershipId, membership: persisted };
    }
    throw new MembershipAlreadyExistsError();
  } catch (error) {
    annotateMembershipError(error, { operation: "create", stage: "authoritative-reread" });
    throw mapInfrastructureError(error);
  }
}

function createFirestoreActiveMembershipGuard({ db, groupRepository, now = () => Timestamp.now() }) {
  if (!db || !groupRepository || typeof now !== "function") throw new TypeError("Active Membership guard dependencies are required");

  return {
    async confirmActiveMembership({ userId, membership, guardId, lifecycleGuardId, idempotencyKeyHash, requestHash, membershipRepository, lifecycleGuard }) {
      const guardRef = db.collection("activeMembershipGuards").doc(guardId);
      const lifecycleRef = lifecycleGuard?.reference(lifecycleGuardId);
      let transactionAttempt = 0;
      try {
        return await db.runTransaction(async (transaction) => {
          transactionAttempt += 1;
          await requireOwnedGroup({ groupRepository, transaction, groupId: membership.groupId, userId });
          const snapshots = lifecycleRef
            ? await transaction.getAll(guardRef, lifecycleRef)
            : [await transaction.get(guardRef)];
          const guard = hydrateActiveMembershipGuard(snapshots[0], {
            guardId, personId: membership.personId, groupId: membership.groupId,
          });
          const lifecycle = lifecycleRef ? lifecycleGuard.hydrate(snapshots[1], {
            guardId: lifecycleGuardId, personId: membership.personId, groupId: membership.groupId,
          }) : null;
          if (guard && lifecycle) throw new MembershipIncompatibleStateError("Active and lifecycle guards coexist");
          if (lifecycle) {
            await lifecycleGuard.requireFinalizedCurrent({ transaction, lifecycle, membershipRepository });
            throw new MembershipReactivationRequiredError();
          }
          if (guard) {
            const persisted = await membershipRepository.getById(guard.membershipId, transaction);
            const periodState = persisted ? await membershipRepository.requirePeriodIntegrity({ transaction, membership: persisted }) : null;
            assertMembershipCorrelated(persisted, guard, periodState?.latestPeriod);
            if (guardIdempotencyHash(guard) === idempotencyKeyHash) {
              if (guardRequestHash(guard) !== requestHash) throw new MembershipIdempotencyConflictError();
              return { outcome: "EXISTING_IDEMPOTENT", membershipId: persisted.membershipId, membership: persisted };
            }
            throw new MembershipAlreadyExistsError();
          }

          const active = await transaction.get(membershipRepository.activePairQuery(membership));
          const finalized = lifecycleGuard
            ? await atTransactionOperation("finalized-membership-query", () => transaction.get(membershipRepository.finalizedPairQuery(membership)))
            : undefined;
          if (!active.empty) throw new MembershipIncompatibleStateError("Active Membership exists without its guard");
          if (finalized && !finalized.empty) throw new MembershipIncompatibleStateError("Finalized Membership exists without its lifecycle guard");

          const activatedAt = now();
          membershipRepository.createInitial(transaction, membership, activatedAt);
          transaction.create(guardRef, {
            membershipId: membership.membershipId,
            personId: membership.personId,
            groupId: membership.groupId,
            seasonId: membership.seasonId,
            activationOrdinal: 1,
            activatedAt,
            activationIdempotencyHash: idempotencyKeyHash,
            activationRequestHash: requestHash,
            guardVersion: 2,
          });
          return { outcome: "CREATED_ACTIVE", membershipId: membership.membershipId };
        });
      } catch (error) {
        annotateMembershipError(error, { operation: "create", stage: "transaction", attempt: transactionAttempt });
        if (isMembershipContention(error)) {
          return resolveAfterContention({
            guardRef,
            guardId,
            membership,
            idempotencyKeyHash,
            requestHash,
            membershipRepository,
            userId,
            lifecycleGuard,
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
            userId,
            lifecycleGuard,
          });
        }
        // Recovery for code 3 is entered only at this creation-transaction boundary.
        // It accepts an outcome exclusively after a complete authoritative reread.
        if (isCreateTransactionBoundaryCode3(error)) {
          return resolveAfterContention({
            guardRef,
            guardId,
            membership,
            idempotencyKeyHash,
            requestHash,
            membershipRepository,
            unconfirmedError: error,
            userId,
            lifecycleGuard,
          });
        }
        throw mapInfrastructureError(error);
      }
    },
  };
}

module.exports = {
  ACTIVE_MEMBERSHIP_GUARD_FIELDS,
  ACTIVE_MEMBERSHIP_GUARD_V1_FIELDS,
  assertMembershipCorrelated,
  createFirestoreActiveMembershipGuard,
  hydrateActiveMembershipGuard,
  guardIdempotencyHash,
  guardRequestHash,
  isAmbiguousTransactionFailure,
  isClosedFinalizedMembershipQueryFailure,
  isMembershipContention,
  mapInfrastructureError,
  requireOwnedGroup,
  resolveAfterContention,
};
