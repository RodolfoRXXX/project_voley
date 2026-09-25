"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { InvalidMembershipStateError, finalizeMembership } = require("../domain/membership");
const {
  MembershipAccountRequiredError,
  MembershipActivationChangedError,
  MembershipDependencyUnavailableError,
  MembershipError,
  MembershipGroupNotAccessibleError,
  MembershipIdempotencyConflictError,
  MembershipIncompatibleStateError,
  MembershipPersonIncompatibleError,
  MembershipSeasonNotModifiableError,
  MembershipTargetIsSelfError,
  MembershipTargetNotAccessibleError,
  MembershipTargetNotActiveError,
} = require("../application/membershipErrors");
const {
  activeMembershipGuardId,
  membershipAdministrativeFinalizationActivationRef,
  membershipLifecycleGuardId,
  membershipValidityPeriodId,
} = require("../application/membershipHashing");
const { annotateMembershipError } = require("../application/membershipObservability");
const { assertMembershipCorrelated, hydrateActiveMembershipGuard, isAmbiguousTransactionFailure, isMembershipContention } = require("./firestoreActiveMembershipGuard");
const { assertActiveLifecycleCorrelated, assertFinalizedMembershipCorrelated, hydrateMembershipLifecycleGuard } = require("./firestoreMembershipLifecycleGuard");

const ACTION = "FINALIZE_ACTIVE_THIRD_PARTY_MEMBERSHIP";
const SUCCESS = "MEMBERSHIP_FINALIZATION_CONFIRMED";
const REJECTIONS = new Set(["TARGET_MEMBERSHIP_NOT_ACTIVE", "MEMBERSHIP_ACTIVATION_CHANGED", "MEMBERSHIP_SEASON_NOT_MODIFIABLE"]);
const BASE_INTENT_FIELDS = Object.freeze([
  "schemaVersion", "action", "actorUserId", "actorPersonId", "groupId", "membershipId",
  "targetPersonId", "seasonId", "activationRefHash", "idempotencyKeyHash", "requestHash",
  "status", "outcome", "createdAt", "completedAt",
]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function validId(value) { return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/"); }
function validTimestamp(value) { return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime()); }
function sameTimestamp(left, right) { return validTimestamp(left) && validTimestamp(right) && left.toDate().getTime() === right.toDate().getTime(); }
function exact(data, fields) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const actual = Object.keys(data).sort(); const expected = [...fields].sort();
  return actual.length === expected.length && !actual.some((key, index) => key !== expected[index]);
}

function hydrateAdministrativeFinalizationIntent(snapshot, args) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const success = data?.outcome === SUCCESS;
  const hasOrdinal = Object.prototype.hasOwnProperty.call(data || {}, "activationOrdinal");
  const fields = [...BASE_INTENT_FIELDS, ...(hasOrdinal ? ["activationOrdinal"] : []), ...(success ? ["finalizedAt"] : [])];
  const valid = snapshot.id === args.intentId && exact(data, fields)
    && data.schemaVersion === 1 && data.action === ACTION && data.status === "consumed"
    && (success || REJECTIONS.has(data.outcome))
    && data.actorUserId === args.actorUserId && validId(data.actorUserId) && (data.actorPersonId === null || validId(data.actorPersonId))
    && validId(data.groupId) && validId(data.membershipId) && validId(data.targetPersonId) && validId(data.seasonId)
    && HASH_PATTERN.test(data.activationRefHash) && HASH_PATTERN.test(data.idempotencyKeyHash) && HASH_PATTERN.test(data.requestHash)
    && data.idempotencyKeyHash === args.idempotencyKeyHash
    && validTimestamp(data.createdAt) && validTimestamp(data.completedAt) && sameTimestamp(data.createdAt, data.completedAt)
    && (!hasOrdinal || (Number.isSafeInteger(data.activationOrdinal) && data.activationOrdinal > 0))
    && (!success || (hasOrdinal && validTimestamp(data.finalizedAt) && sameTimestamp(data.completedAt, data.finalizedAt)));
  if (!valid) throw new MembershipIncompatibleStateError("Administrative finalization intent is incompatible");
  return Object.freeze(data);
}

function rejectionError(reason) {
  if (reason === "TARGET_MEMBERSHIP_NOT_ACTIVE") return new MembershipTargetNotActiveError();
  if (reason === "MEMBERSHIP_ACTIVATION_CHANGED") return new MembershipActivationChangedError();
  if (reason === "MEMBERSHIP_SEASON_NOT_MODIFIABLE") return new MembershipSeasonNotModifiableError();
  return new MembershipIncompatibleStateError();
}

function toResult(intent) {
  if (intent.outcome !== SUCCESS) throw rejectionError(intent.outcome);
  return Object.freeze({ membershipId: intent.membershipId, finalizedAt: intent.finalizedAt });
}

function createFirestoreMembershipAdministrativeFinalizationStore({
  db, membershipRepository, groupCapability, personCapability, now = () => Timestamp.now(),
}) {
  if (!db || !membershipRepository || !groupCapability || !personCapability || typeof now !== "function") {
    throw new TypeError("Administrative Membership finalization dependencies are required");
  }
  const intentReference = (intentId) => db.collection("membershipAdministrativeFinalizationIntents").doc(intentId);

  async function requireAccount(transaction, { actorUserId }) {
    const account = await personCapability.getAccount({ unitOfWork: transaction, userId: actorUserId });
    if (["account_missing", "account_incompatible"].includes(account?.status)) throw new MembershipAccountRequiredError();
    if (account?.status !== "found") throw new MembershipAccountRequiredError();
    return account;
  }

  async function resolveActorPerson(transaction, account) {
    const actorPerson = await personCapability.getOwnPerson({ unitOfWork: transaction, account });
    if (actorPerson?.status === "absent") return null;
    if (actorPerson?.status !== "found") throw new MembershipPersonIncompatibleError();
    return actorPerson;
  }

  async function requireOwnedGroup(transaction, { actorUserId, groupId }) {
    const group = await groupCapability.getOwnedGroup({ unitOfWork: transaction, groupId, userId: actorUserId });
    if (group?.status === "not_accessible") throw new MembershipGroupNotAccessibleError();
    if (group?.status !== "owned") throw new MembershipIncompatibleStateError("Owned Group is incompatible");
    return group;
  }

  async function readTarget(transaction, args, actorPerson) {
    const rootSnapshot = await transaction.get(membershipRepository.reference(args.membershipId));
    if (!rootSnapshot.exists || rootSnapshot.data()?.groupId !== args.groupId) throw new MembershipTargetNotAccessibleError();
    const membership = membershipRepository.fromSnapshot(rootSnapshot);
    if (actorPerson && membership.personId === actorPerson.personId) throw new MembershipTargetIsSelfError();
    const targetPerson = await personCapability.getTarget({ unitOfWork: transaction, personId: membership.personId });
    if (targetPerson?.status !== "found" || targetPerson.personId !== membership.personId) throw new MembershipIncompatibleStateError("Target Person is unavailable");

    const activeGuardId = activeMembershipGuardId(args.groupId, membership.personId);
    const lifecycleGuardId = membershipLifecycleGuardId(args.groupId, membership.personId);
    const activeRef = db.collection("activeMembershipGuards").doc(activeGuardId);
    const lifecycleRef = db.collection("membershipLifecycleGuards").doc(lifecycleGuardId);
    const [activeSnapshot, lifecycleSnapshot] = await transaction.getAll(activeRef, lifecycleRef);
    const activeGuard = hydrateActiveMembershipGuard(activeSnapshot, { guardId: activeGuardId, personId: membership.personId, groupId: args.groupId });
    const lifecycle = hydrateMembershipLifecycleGuard(lifecycleSnapshot, { guardId: lifecycleGuardId, personId: membership.personId, groupId: args.groupId });
    if (activeGuard && lifecycle && !(lifecycle.lifecycleGuardVersion === 3 && lifecycle.rootState === "active")) throw new MembershipIncompatibleStateError("Active guard has incompatible lifecycle");

    const periods = await membershipRepository.requirePeriodIntegrity({ transaction, membership });
    const activePair = await transaction.get(membershipRepository.activePairQuery({ personId: membership.personId, groupId: args.groupId }));
    const activeIds = activePair.docs.map((document) => document.id);

    if (membership.estado === "finalizada") {
      if (activeGuard || !lifecycle || activeIds.length) {
        throw new MembershipIncompatibleStateError("Finalized target coordination is incompatible");
      }
      assertFinalizedMembershipCorrelated(membership, lifecycle, periods.latestPeriod);
      return Object.freeze({ kind: "finalized", membership, targetPerson, periods, activeRef, lifecycleRef, lifecycle });
    }
    if (!activeGuard || activeIds.length !== 1 || activeIds[0] !== membership.membershipId) {
      throw new MembershipIncompatibleStateError("Active target coordination is incompatible");
    }
    assertMembershipCorrelated(membership, activeGuard, periods.latestPeriod);
    if (lifecycle) assertActiveLifecycleCorrelated(membership, lifecycle, activeGuard, periods.latestPeriod);
    const activationOrdinal = membership.schemaVersion === 1 ? 1 : membership.periodCount;
    const periodId = membership.schemaVersion === 1 ? membershipValidityPeriodId(membership.membershipId, 1) : membership.latestPeriodId;
    const activationRef = membershipAdministrativeFinalizationActivationRef({
      actorUserId: args.actorUserId, groupId: args.groupId,
      membershipId: membership.membershipId, targetPersonId: membership.personId, seasonId: membership.seasonId,
      activationOrdinal, periodId, activeGuardVersion: activeGuard.guardVersion,
    });
    return Object.freeze({ kind: "active", membership, targetPerson, periods, activeRef, lifecycleRef, lifecycle, activationOrdinal, activationRef });
  }

  async function requireExactOpenSeason(transaction, membership) {
    const context = await groupCapability.getExactOpenSeason({ unitOfWork: transaction, groupId: membership.groupId, seasonId: membership.seasonId });
    if (context?.status !== "open") throw new MembershipSeasonNotModifiableError();
  }

  function intentData(args, actorPerson, target, outcome, completedAt, includeOrdinal) {
    return Object.freeze({
      schemaVersion: 1, action: ACTION, actorUserId: args.actorUserId, actorPersonId: actorPerson?.personId || null,
      groupId: args.groupId, membershipId: target.membership.membershipId, targetPersonId: target.membership.personId,
      seasonId: target.membership.seasonId, ...(includeOrdinal ? { activationOrdinal: target.activationOrdinal || target.membership.periodCount } : {}),
      activationRefHash: args.activationRefHash, idempotencyKeyHash: args.idempotencyKeyHash, requestHash: args.requestHash,
      status: "consumed", outcome, createdAt: completedAt, completedAt,
      ...(outcome === SUCCESS ? { finalizedAt: completedAt } : {}),
    });
  }

  async function prepare(args) {
    try {
      return await db.runTransaction(async (transaction) => {
        const account = await requireAccount(transaction, args);
        await requireOwnedGroup(transaction, args);
        const actorPerson = await resolveActorPerson(transaction, account);
        const target = await readTarget(transaction, args, actorPerson);
        if (target.kind !== "active") throw new MembershipTargetNotActiveError();
        await requireExactOpenSeason(transaction, target.membership);
        return Object.freeze({ firstName: target.targetPerson.firstName, lastName: target.targetPerson.lastName, activationRef: target.activationRef });
      });
    } catch (error) { throw mapError(error); }
  }

  async function execute(args) {
    let transactionAttempt = 0;
    try {
      const result = await db.runTransaction(async (transaction) => {
        transactionAttempt += 1;
        const account = await requireAccount(transaction, args);
        await requireOwnedGroup(transaction, args);
        const actorPerson = await resolveActorPerson(transaction, account);
        const intentRef = intentReference(args.intentId);
        const existing = hydrateAdministrativeFinalizationIntent(await transaction.get(intentRef), args);
        if (existing) {
          if (actorPerson && existing.targetPersonId === actorPerson.personId) throw new MembershipTargetIsSelfError();
          if (existing.groupId !== args.groupId || existing.membershipId !== args.membershipId
            || existing.activationRefHash !== args.activationRefHash || existing.requestHash !== args.requestHash) throw new MembershipIdempotencyConflictError();
          return Object.freeze({ intent: existing });
        }
        const target = await readTarget(transaction, args, actorPerson);
        const completedAt = now();
        if (target.kind === "finalized") {
          const rejected = intentData(args, actorPerson, target, "TARGET_MEMBERSHIP_NOT_ACTIVE", completedAt, Number.isSafeInteger(target.membership.periodCount));
          transaction.create(intentRef, rejected);
          return Object.freeze({ intent: rejected });
        }
        if (target.activationRef !== args.activationRef) {
          const rejected = intentData(args, actorPerson, target, "MEMBERSHIP_ACTIVATION_CHANGED", completedAt, false);
          transaction.create(intentRef, rejected);
          return Object.freeze({ intent: rejected });
        }
        try { await requireExactOpenSeason(transaction, target.membership); }
        catch (error) {
          if (!(error instanceof MembershipSeasonNotModifiableError)) throw error;
          const rejected = intentData(args, actorPerson, target, "MEMBERSHIP_SEASON_NOT_MODIFIABLE", completedAt, true);
          transaction.create(intentRef, rejected);
          return Object.freeze({ intent: rejected });
        }
        const transition = finalizeMembership({
          membership: target.membership, finalizedAt: completedAt,
          firstPeriodId: membershipValidityPeriodId(target.membership.membershipId, 1),
          firstPeriod: target.periods.firstPeriod, latestPeriod: target.periods.latestPeriod,
        });
        const consumed = intentData(args, actorPerson, target, SUCCESS, completedAt, true);
        membershipRepository.persistTransition(transaction, transition);
        transaction.delete(target.activeRef);
        const finalizedLifecycle = {
          membershipId: target.membership.membershipId, personId: target.membership.personId,
          groupId: args.groupId, seasonId: target.membership.seasonId,
          rootState: "finalized", lastActivationOrdinal: target.activationOrdinal, finalizedAt: completedAt, lifecycleGuardVersion: 3,
        };
        if (target.lifecycle) transaction.set(target.lifecycleRef, finalizedLifecycle);
        else transaction.create(target.lifecycleRef, finalizedLifecycle);
        transaction.create(intentRef, consumed);
        return Object.freeze({ intent: consumed });
      });
      return toResult(result.intent);
    } catch (error) {
      annotateMembershipError(error, { operation: "administrative-finalization", stage: "transaction", attempt: transactionAttempt });
      throw error;
    }
  }

  function mapError(error) {
    if (error instanceof MembershipError) return error;
    if (error instanceof InvalidMembershipStateError || error?.name === "InvalidMembershipValidityPeriodError") return new MembershipIncompatibleStateError(undefined, { cause: error });
    return new MembershipDependencyUnavailableError({ cause: error });
  }

  return Object.freeze({
    intentReference,
    hydrate: hydrateAdministrativeFinalizationIntent,
    prepare,
    async confirm(args) {
      try { return await execute(args); }
      catch (error) {
        if (isMembershipContention(error) || isAmbiguousTransactionFailure(error)) {
          try { return await execute(args); } catch (recoveryError) { throw mapError(recoveryError); }
        }
        throw mapError(error);
      }
    },
  });
}

module.exports = { ACTION, BASE_INTENT_FIELDS, REJECTIONS, SUCCESS, createFirestoreMembershipAdministrativeFinalizationStore, hydrateAdministrativeFinalizationIntent, toResult };
