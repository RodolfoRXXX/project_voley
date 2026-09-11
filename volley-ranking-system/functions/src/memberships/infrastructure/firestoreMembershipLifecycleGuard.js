"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { InvalidMembershipStateError, finalizeMembership } = require("../domain/membership");
const { MembershipConflictError, MembershipIncompatibleStateError, MembershipNotFoundError, MembershipOpenSeasonRequiredError, MembershipSeasonIncompatibleError } = require("../application/membershipErrors");
const { activeMembershipGuardId, membershipLifecycleGuardId, membershipValidityPeriodId } = require("../application/membershipHashing");
const { annotateMembershipError } = require("../application/membershipObservability");
const { assertMembershipCorrelated, hydrateActiveMembershipGuard, isAmbiguousTransactionFailure, isMembershipContention, mapInfrastructureError, requireOwnedGroup } = require("./firestoreActiveMembershipGuard");

const MEMBERSHIP_LIFECYCLE_GUARD_V1_FIELDS = Object.freeze(["membershipId", "personId", "groupId", "seasonId", "creationIdempotencyKeyHash", "creationRequestHash", "finalizedAt", "lifecycleGuardVersion"]);
const MEMBERSHIP_LIFECYCLE_GUARD_FIELDS = Object.freeze(["membershipId", "personId", "groupId", "seasonId", "lastActivationOrdinal", "finalizedAt", "lifecycleGuardVersion"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;
function validId(value) { return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/"); }
function validTimestamp(value) { return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime()); }
function sameTimestamp(left, right) { return validTimestamp(left) && validTimestamp(right) && left.toDate().getTime() === right.toDate().getTime(); }

function hydrateMembershipLifecycleGuard(snapshot, { guardId, personId, groupId }) {
  if (!snapshot.exists) return null;
  const data = snapshot.data(); const version = data?.lifecycleGuardVersion;
  const expected = [...(version === 1 ? MEMBERSHIP_LIFECYCLE_GUARD_V1_FIELDS : MEMBERSHIP_LIFECYCLE_GUARD_FIELDS)].sort();
  const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).sort() : [];
  const valid = keys.length === expected.length && !keys.some((key, index) => key !== expected[index])
    && validId(data.membershipId) && validId(data.personId) && validId(data.groupId) && validId(data.seasonId)
    && validTimestamp(data.finalizedAt) && [1, 2].includes(version)
    && (version === 1 ? HASH_PATTERN.test(data.creationIdempotencyKeyHash) && HASH_PATTERN.test(data.creationRequestHash) : Number.isSafeInteger(data.lastActivationOrdinal) && data.lastActivationOrdinal > 0)
    && snapshot.id === guardId && guardId === membershipLifecycleGuardId(groupId, personId) && data.personId === personId && data.groupId === groupId;
  if (!valid) throw new MembershipIncompatibleStateError("Membership lifecycle guard is invalid");
  return Object.freeze(data);
}

function assertFinalizedMembershipCorrelated(membership, lifecycle, latestPeriod) {
  if (!membership || membership.membershipId !== lifecycle.membershipId || membership.personId !== lifecycle.personId || membership.groupId !== lifecycle.groupId || membership.seasonId !== lifecycle.seasonId || membership.estado !== "finalizada" || !sameTimestamp(membership.fechaEgreso, lifecycle.finalizedAt)
    || (lifecycle.lifecycleGuardVersion === 1 && membership.schemaVersion !== 2)
    || (lifecycle.lifecycleGuardVersion === 2 && membership.schemaVersion !== 3)
    || (lifecycle.lifecycleGuardVersion === 2 && latestPeriod && (membership.periodCount !== lifecycle.lastActivationOrdinal || latestPeriod.ordinal !== lifecycle.lastActivationOrdinal || latestPeriod.estado !== "cerrado" || !sameTimestamp(latestPeriod.endedAt, lifecycle.finalizedAt)))) {
    throw new MembershipIncompatibleStateError("Finalized Membership lifecycle correlation is invalid");
  }
}
function hydrateQuery(repository, snapshot) { return snapshot.docs.map((document) => repository.fromSnapshot(document)); }
function requireOnlyMembership(memberships, expectedId, label) { if (memberships.length !== 1 || memberships[0]?.membershipId !== expectedId) throw new MembershipIncompatibleStateError(label); }

function createFirestoreMembershipLifecycleGuard({ db, groupRepository, now = () => Timestamp.now() }) {
  if (!db || !groupRepository || typeof now !== "function") throw new TypeError("Membership lifecycle dependencies are required");
  function reference(guardId) { return db.collection("membershipLifecycleGuards").doc(guardId); }

  async function requireFinalizedCurrent({ transaction, lifecycle, membershipRepository }) {
    const membership = await membershipRepository.getById(lifecycle.membershipId, transaction);
    const activeSnapshot = await transaction.get(membershipRepository.activePairQuery(lifecycle));
    const finalizedSnapshot = await transaction.get(membershipRepository.finalizedPairQuery(lifecycle));
    const periodState = membership ? (typeof membershipRepository.requirePeriodIntegrity === "function" ? await membershipRepository.requirePeriodIntegrity({ transaction, membership }) : { firstPeriod: null, latestPeriod: null, openPeriods: [] }) : null;
    assertFinalizedMembershipCorrelated(membership, lifecycle, periodState?.latestPeriod);
    if (!activeSnapshot.empty) throw new MembershipIncompatibleStateError("Finalized lifecycle coexists with an active Membership");
    requireOnlyMembership(hydrateQuery(membershipRepository, finalizedSnapshot), membership.membershipId, "Finalized lifecycle is not current");
    return { membership, ...periodState };
  }

  async function resolveTransaction({ userId, personId, groupId, openSeasonId, membershipRepository, write, recovery }) {
    const activeGuardId = activeMembershipGuardId(groupId, personId); const lifecycleGuardId = membershipLifecycleGuardId(groupId, personId); let transactionAttempt = 0;
    try {
      return await db.runTransaction(async (transaction) => {
        transactionAttempt += 1;
        await requireOwnedGroup({ groupRepository, transaction, groupId, userId });
        const activeRef = db.collection("activeMembershipGuards").doc(activeGuardId); const lifecycleRef = reference(lifecycleGuardId);
        const [activeSnapshot, lifecycleSnapshot] = await transaction.getAll(activeRef, lifecycleRef);
        const activeGuard = hydrateActiveMembershipGuard(activeSnapshot, { guardId: activeGuardId, personId, groupId });
        const lifecycle = hydrateMembershipLifecycleGuard(lifecycleSnapshot, { guardId: lifecycleGuardId, personId, groupId });
        if (activeGuard && lifecycle) throw new MembershipIncompatibleStateError("Active and lifecycle guards coexist");
        if (lifecycle) {
          const aggregate = await requireFinalizedCurrent({ transaction, lifecycle, membershipRepository });
          return { kind: "lifecycle-only", outcome: "ALREADY_FINALIZED", membership: aggregate.membership, lifecycle, ...aggregate };
        }
        if (activeGuard) {
          const membership = await membershipRepository.getById(activeGuard.membershipId, transaction);
          const activeForPair = await transaction.get(membershipRepository.activePairQuery(activeGuard));
          const periodState = membership ? (typeof membershipRepository.requirePeriodIntegrity === "function" ? await membershipRepository.requirePeriodIntegrity({ transaction, membership }) : { firstPeriod: null, latestPeriod: null, openPeriods: [] }) : null;
          assertMembershipCorrelated(membership, activeGuard, periodState?.latestPeriod);
          requireOnlyMembership(hydrateQuery(membershipRepository, activeForPair), membership.membershipId, "Active Membership is not unique");
          if (!write) return { kind: "active-only", membership, activeGuard, ...periodState };
          if (!openSeasonId) throw new MembershipOpenSeasonRequiredError();
          if (membership.seasonId !== openSeasonId) throw new MembershipSeasonIncompatibleError();
          const finalizedAt = now();
          const transition = finalizeMembership({ membership, finalizedAt, firstPeriodId: membershipValidityPeriodId(membership.membershipId, 1), firstPeriod: periodState.firstPeriod, latestPeriod: periodState.latestPeriod });
          membershipRepository.persistTransition(transaction, transition);
          transaction.delete(activeRef);
          transaction.create(lifecycleRef, { membershipId: membership.membershipId, personId, groupId, seasonId: membership.seasonId, lastActivationOrdinal: transition.membership.periodCount, finalizedAt, lifecycleGuardVersion: 2 });
          return { kind: "active-only", outcome: "FINALIZED", membership: transition.membership };
        }
        const activeForPair = await transaction.get(membershipRepository.activePairQuery({ personId, groupId }));
        const finalizedForPair = await transaction.get(membershipRepository.finalizedPairQuery({ personId, groupId }));
        const active = hydrateQuery(membershipRepository, activeForPair); const finalized = hydrateQuery(membershipRepository, finalizedForPair);
        if (active.length || finalized.length) throw new MembershipIncompatibleStateError("Membership exists without its coordination guard");
        if (recovery) throw new MembershipConflictError();
        throw new MembershipNotFoundError();
      });
    } catch (error) { annotateMembershipError(error, { operation: write ? "finalize" : "get", stage: recovery ? "authoritative-reread" : "transaction", attempt: transactionAttempt }); throw error; }
  }

  return {
    reference, hydrate: hydrateMembershipLifecycleGuard, requireFinalizedCurrent,
    async getForOwner(args) { try { return await resolveTransaction({ ...args, write: false, recovery: false }); } catch (error) { throw mapInfrastructureError(error); } },
    async finalizeForOwner(args) {
      try { return await resolveTransaction({ ...args, write: true, recovery: false }); }
      catch (error) {
        if (isMembershipContention(error) || isAmbiguousTransactionFailure(error)) {
          try { const confirmed = await resolveTransaction({ ...args, write: false, recovery: true }); if (confirmed.kind === "lifecycle-only") return confirmed; throw new MembershipConflictError(); }
          catch (recoveryError) { throw mapInfrastructureError(recoveryError); }
        }
        if (error instanceof InvalidMembershipStateError) throw new MembershipIncompatibleStateError(undefined, { cause: error });
        throw mapInfrastructureError(error);
      }
    },
  };
}

module.exports = { MEMBERSHIP_LIFECYCLE_GUARD_FIELDS, MEMBERSHIP_LIFECYCLE_GUARD_V1_FIELDS, assertFinalizedMembershipCorrelated, createFirestoreMembershipLifecycleGuard, hydrateMembershipLifecycleGuard, sameTimestamp };
