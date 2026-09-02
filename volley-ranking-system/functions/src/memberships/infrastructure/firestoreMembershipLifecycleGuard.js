"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { InvalidMembershipStateError } = require("../domain/membership");
const {
  MembershipConflictError,
  MembershipIncompatibleStateError,
  MembershipNotFoundError,
  MembershipOpenSeasonRequiredError,
  MembershipSeasonIncompatibleError,
} = require("../application/membershipErrors");
const { membershipLifecycleGuardId } = require("../application/membershipHashing");
const { annotateMembershipError } = require("../application/membershipObservability");
const {
  assertMembershipCorrelated,
  hydrateActiveMembershipGuard,
  isAmbiguousTransactionFailure,
  isMembershipContention,
  mapInfrastructureError,
  requireOwnedGroup,
} = require("./firestoreActiveMembershipGuard");

const MEMBERSHIP_LIFECYCLE_GUARD_FIELDS = Object.freeze([
  "membershipId", "personId", "groupId", "seasonId",
  "creationIdempotencyKeyHash", "creationRequestHash", "finalizedAt", "lifecycleGuardVersion",
]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function validId(value) {
  return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/");
}

function validTimestamp(value) {
  return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime());
}

function sameTimestamp(left, right) {
  if (!validTimestamp(left) || !validTimestamp(right)) return false;
  if (typeof left.isEqual === "function") return left.isEqual(right);
  return left.toDate().getTime() === right.toDate().getTime();
}

function hydrateMembershipLifecycleGuard(snapshot, { guardId, personId, groupId }) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).sort() : [];
  const expected = [...MEMBERSHIP_LIFECYCLE_GUARD_FIELDS].sort();
  const valid = keys.length === expected.length
    && !keys.some((key, index) => key !== expected[index])
    && validId(data.membershipId) && validId(data.personId) && validId(data.groupId) && validId(data.seasonId)
    && HASH_PATTERN.test(data.creationIdempotencyKeyHash) && HASH_PATTERN.test(data.creationRequestHash)
    && validTimestamp(data.finalizedAt) && data.lifecycleGuardVersion === 1
    && snapshot.id === guardId && guardId === membershipLifecycleGuardId(groupId, personId)
    && data.personId === personId && data.groupId === groupId;
  if (!valid) throw new MembershipIncompatibleStateError("Membership lifecycle guard is invalid");
  return Object.freeze(data);
}

function assertFinalizedMembershipCorrelated(membership, lifecycle) {
  if (!membership
    || membership.membershipId !== lifecycle.membershipId
    || membership.personId !== lifecycle.personId
    || membership.groupId !== lifecycle.groupId
    || membership.seasonId !== lifecycle.seasonId
    || membership.estado !== "finalizada"
    || !sameTimestamp(membership.fechaEgreso, lifecycle.finalizedAt)) {
    throw new MembershipIncompatibleStateError("Finalized Membership lifecycle correlation is invalid");
  }
}

function hydrateQuery(repository, snapshot) {
  return snapshot.docs.map((document) => repository.fromSnapshot(document));
}

function requireOnlyMembership(memberships, expectedId, label) {
  if (memberships.length !== 1 || memberships[0]?.membershipId !== expectedId) {
    throw new MembershipIncompatibleStateError(label);
  }
}

function createFirestoreMembershipLifecycleGuard({ db, groupRepository, now = () => Timestamp.now() }) {
  if (!db || !groupRepository || typeof now !== "function") throw new TypeError("Membership lifecycle dependencies are required");

  function reference(guardId) {
    return db.collection("membershipLifecycleGuards").doc(guardId);
  }

  async function requireFinalizedCurrent({ transaction, lifecycle, membershipRepository }) {
    const membership = await membershipRepository.getById(lifecycle.membershipId, transaction);
    const [activeSnapshot, finalizedSnapshot] = await Promise.all([
      transaction.get(membershipRepository.activePairQuery(lifecycle)),
      transaction.get(membershipRepository.finalizedPairQuery(lifecycle)),
    ]);
    assertFinalizedMembershipCorrelated(membership, lifecycle);
    if (!activeSnapshot.empty) throw new MembershipIncompatibleStateError("Finalized lifecycle coexists with an active Membership");
    requireOnlyMembership(hydrateQuery(membershipRepository, finalizedSnapshot), membership.membershipId, "Finalized lifecycle is not current");
    return membership;
  }

  async function resolveTransaction({ userId, personId, groupId, openSeasonId, membershipRepository, write, recovery }) {
    const activeGuardId = require("../application/membershipHashing").activeMembershipGuardId(groupId, personId);
    const lifecycleGuardId = membershipLifecycleGuardId(groupId, personId);
    let transactionAttempt = 0;
    try {
      return await db.runTransaction(async (transaction) => {
      transactionAttempt += 1;
      await requireOwnedGroup({ groupRepository, transaction, groupId, userId });
      const activeRef = db.collection("activeMembershipGuards").doc(activeGuardId);
      const lifecycleRef = reference(lifecycleGuardId);
      const [activeSnapshot, lifecycleSnapshot] = await transaction.getAll(activeRef, lifecycleRef);
      const activeGuard = hydrateActiveMembershipGuard(activeSnapshot, { guardId: activeGuardId, personId, groupId });
      const lifecycle = hydrateMembershipLifecycleGuard(lifecycleSnapshot, { guardId: lifecycleGuardId, personId, groupId });
      if (activeGuard && lifecycle) throw new MembershipIncompatibleStateError("Active and lifecycle guards coexist");

      if (lifecycle) {
        const membership = await requireFinalizedCurrent({ transaction, lifecycle, membershipRepository });
        return { kind: "lifecycle-only", outcome: "ALREADY_FINALIZED", membership, lifecycle };
      }

      if (activeGuard) {
        const membership = await membershipRepository.getById(activeGuard.membershipId, transaction);
        const activeSnapshotForPair = await transaction.get(membershipRepository.activePairQuery(activeGuard));
        assertMembershipCorrelated(membership, activeGuard);
        requireOnlyMembership(hydrateQuery(membershipRepository, activeSnapshotForPair), membership.membershipId, "Active Membership is not unique");
        if (!write) return { kind: "active-only", membership, activeGuard };
        if (!openSeasonId) throw new MembershipOpenSeasonRequiredError();
        if (membership.seasonId !== openSeasonId) throw new MembershipSeasonIncompatibleError();
        const finalizedAt = now();
        const finalized = membership.finalize(finalizedAt);
        membershipRepository.updateFinalized(transaction, finalized);
        transaction.delete(activeRef);
        transaction.create(lifecycleRef, {
          membershipId: finalized.membershipId,
          personId: finalized.personId,
          groupId: finalized.groupId,
          seasonId: finalized.seasonId,
          creationIdempotencyKeyHash: activeGuard.idempotencyKeyHash,
          creationRequestHash: activeGuard.requestHash,
          finalizedAt,
          lifecycleGuardVersion: 1,
        });
        return { kind: "active-only", outcome: "FINALIZED", membership: finalized };
      }

      const [activeSnapshotForPair, finalizedSnapshotForPair] = await Promise.all([
        transaction.get(membershipRepository.activePairQuery({ personId, groupId })),
        transaction.get(membershipRepository.finalizedPairQuery({ personId, groupId })),
      ]);
      const active = hydrateQuery(membershipRepository, activeSnapshotForPair);
      const finalized = hydrateQuery(membershipRepository, finalizedSnapshotForPair);
      if (active.length || finalized.length) throw new MembershipIncompatibleStateError("Membership exists without its coordination guard");
      if (recovery) throw new MembershipConflictError();
      throw new MembershipNotFoundError();
      });
    } catch (error) {
      annotateMembershipError(error, {
        operation: write ? "finalize" : "get",
        stage: recovery ? "authoritative-reread" : "transaction",
        attempt: transactionAttempt,
      });
      throw error;
    }
  }

  return {
    reference,
    hydrate: hydrateMembershipLifecycleGuard,
    requireFinalizedCurrent,
    async getForOwner(args) {
      try {
        return await resolveTransaction({ ...args, write: false, recovery: false });
      } catch (error) {
        throw mapInfrastructureError(error);
      }
    },
    async finalizeForOwner(args) {
      try {
        return await resolveTransaction({ ...args, write: true, recovery: false });
      } catch (error) {
        if (isMembershipContention(error) || isAmbiguousTransactionFailure(error)) {
          try {
            const confirmed = await resolveTransaction({ ...args, write: false, recovery: true });
            if (confirmed.kind === "lifecycle-only") return confirmed;
            throw new MembershipConflictError();
          } catch (recoveryError) {
            throw mapInfrastructureError(recoveryError);
          }
        }
        if (error instanceof InvalidMembershipStateError) {
          throw new MembershipIncompatibleStateError(undefined, { cause: error });
        }
        throw mapInfrastructureError(error);
      }
    },
  };
}

module.exports = {
  MEMBERSHIP_LIFECYCLE_GUARD_FIELDS,
  assertFinalizedMembershipCorrelated,
  createFirestoreMembershipLifecycleGuard,
  hydrateMembershipLifecycleGuard,
  sameTimestamp,
};
