"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { InvalidGroupStateError } = require("../../groups/domain/group");
const { InvalidSeasonStateError } = require("../../groups/domain/season");
const { hydrateOpenSeasonGuard } = require("../../groups/infrastructure/firestoreOpenSeasonGuard");
const { InvalidPersonStateError } = require("../../persons/domain/person");
const { InvalidUserStateError } = require("../../users/domain/user");
const { InvalidMembershipStateError, finalizeMembership } = require("../domain/membership");
const {
  MembershipAccountRequiredError,
  MembershipConflictError,
  MembershipDependencyUnavailableError,
  MembershipError,
  MembershipGroupIncompatibleError,
  MembershipGroupNotFoundError,
  MembershipIdempotencyConflictError,
  MembershipIncompatibleStateError,
  MembershipNotActiveError,
  MembershipNotFoundError,
  MembershipPersonIncompatibleError,
  MembershipPersonRequiredError,
  MembershipSeasonNotModifiableError,
} = require("../application/membershipErrors");
const { activeMembershipGuardId, membershipLifecycleGuardId, membershipValidityPeriodId } = require("../application/membershipHashing");
const { annotateMembershipError } = require("../application/membershipObservability");
const {
  assertMembershipCorrelated,
  hydrateActiveMembershipGuard,
  isAmbiguousTransactionFailure,
  isMembershipContention,
  mapInfrastructureError,
} = require("./firestoreActiveMembershipGuard");
const { assertActiveLifecycleCorrelated, hydrateMembershipLifecycleGuard } = require("./firestoreMembershipLifecycleGuard");

const INTENT_FIELDS = Object.freeze([
  "userId", "personId", "membershipId", "groupId", "seasonId", "activationOrdinal",
  "idempotencyKeyHash", "requestHash", "status", "outcome", "actorWasOwner",
  "createdAt", "finalizedAt", "completedAt", "intentVersion",
]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function validId(value) {
  return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/");
}

function validTimestamp(value) {
  return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime());
}

function sameTimestamp(left, right) {
  return validTimestamp(left) && validTimestamp(right) && left.toDate().getTime() === right.toDate().getTime();
}

function hydrateMembershipSelfExitIntent(snapshot, { intentId, userId, idempotencyKeyHash }) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).sort() : [];
  const expected = [...INTENT_FIELDS].sort();
  const valid = keys.length === expected.length
    && !keys.some((key, index) => key !== expected[index])
    && snapshot.id === intentId
    && data.userId === userId
    && validId(data.userId) && validId(data.personId) && validId(data.membershipId)
    && validId(data.groupId) && validId(data.seasonId)
    && Number.isSafeInteger(data.activationOrdinal) && data.activationOrdinal > 0
    && HASH_PATTERN.test(data.idempotencyKeyHash) && HASH_PATTERN.test(data.requestHash)
    && data.idempotencyKeyHash === idempotencyKeyHash
    && data.status === "confirmed" && data.outcome === "EXIT_CONFIRMED"
    && typeof data.actorWasOwner === "boolean"
    && validTimestamp(data.createdAt) && validTimestamp(data.finalizedAt) && validTimestamp(data.completedAt)
    && sameTimestamp(data.createdAt, data.finalizedAt) && sameTimestamp(data.finalizedAt, data.completedAt)
    && data.intentVersion === 1;
  if (!valid) throw new MembershipIncompatibleStateError("Membership self-exit intent is invalid");
  return Object.freeze(data);
}

function toResult(intent) {
  return Object.freeze({
    membershipId: intent.membershipId,
    groupId: intent.groupId,
    seasonId: intent.seasonId,
    activationOrdinal: intent.activationOrdinal,
    endedAt: intent.finalizedAt,
    actorWasOwner: intent.actorWasOwner,
  });
}

function hydrateQuery(repository, snapshot) {
  return snapshot.docs.map((document) => repository.fromSnapshot(document));
}

function requireOnlyMembership(memberships, expectedId, label) {
  if (memberships.length !== 1 || memberships[0]?.membershipId !== expectedId) {
    throw new MembershipIncompatibleStateError(label);
  }
}

function mapSelfExitInfrastructureError(error) {
  if (error instanceof MembershipError) return error;
  if (error instanceof InvalidGroupStateError) return new MembershipGroupIncompatibleError({ cause: error });
  if (error instanceof InvalidSeasonStateError) return new MembershipSeasonNotModifiableError({ cause: error });
  if (error instanceof InvalidUserStateError || error instanceof InvalidPersonStateError) {
    return new MembershipPersonIncompatibleError({ cause: error });
  }
  if (error instanceof InvalidMembershipStateError) return new MembershipIncompatibleStateError(undefined, { cause: error });
  const mapped = mapInfrastructureError(error);
  return mapped === error ? new MembershipDependencyUnavailableError({ cause: error }) : mapped;
}

function createFirestoreMembershipSelfExitStore({
  db,
  membershipRepository,
  groupRepository,
  seasonRepository,
  userPersonLinkRepository,
  personRepository,
  lifecycleGuard,
  now = () => Timestamp.now(),
}) {
  if (!db || !membershipRepository || !groupRepository || !seasonRepository || !userPersonLinkRepository
    || !personRepository || !lifecycleGuard || typeof now !== "function") {
    throw new TypeError("Membership self-exit dependencies are required");
  }

  function reference(intentId) {
    return db.collection("membershipSelfExitIntents").doc(intentId);
  }

  async function execute(args) {
    let transactionAttempt = 0;
    try {
      return await db.runTransaction(async (transaction) => {
        transactionAttempt += 1;
        const account = await userPersonLinkRepository.getById(args.userId, transaction);
        if (!account) throw new MembershipAccountRequiredError();
        if (!Object.prototype.hasOwnProperty.call(account, "personaId")) throw new MembershipPersonRequiredError();
        if (account.personaId !== args.personId) throw new MembershipPersonIncompatibleError();
        const person = await personRepository.getById(args.personId, transaction);
        if (!person || person.personId !== args.personId) throw new MembershipPersonIncompatibleError();

        const intentRef = reference(args.intentId);
        const intent = hydrateMembershipSelfExitIntent(await transaction.get(intentRef), args);
        if (intent) {
          if (intent.personId !== args.personId || intent.groupId !== args.groupId || intent.requestHash !== args.requestHash) {
            throw new MembershipIdempotencyConflictError();
          }
          return toResult(intent);
        }

        const activeGuardId = activeMembershipGuardId(args.groupId, args.personId);
        const lifecycleGuardId = membershipLifecycleGuardId(args.groupId, args.personId);
        const activeRef = db.collection("activeMembershipGuards").doc(activeGuardId);
        const lifecycleRef = lifecycleGuard.reference(lifecycleGuardId);
        const [activeSnapshot, lifecycleSnapshot] = await transaction.getAll(activeRef, lifecycleRef);
        const activeGuard = hydrateActiveMembershipGuard(activeSnapshot, {
          guardId: activeGuardId, personId: args.personId, groupId: args.groupId,
        });
        const lifecycle = hydrateMembershipLifecycleGuard(lifecycleSnapshot, {
          guardId: lifecycleGuardId, personId: args.personId, groupId: args.groupId,
        });
        if (activeGuard && lifecycle && !(lifecycle.lifecycleGuardVersion === 3 && lifecycle.rootState === "active")) throw new MembershipIncompatibleStateError("Active guard has incompatible lifecycle");
        if (lifecycle && !activeGuard) {
          await lifecycleGuard.requireFinalizedCurrent({ transaction, lifecycle, membershipRepository });
          throw new MembershipNotActiveError();
        }
        if (!activeGuard) {
          const activeForPair = await transaction.get(membershipRepository.activePairQuery({ personId: args.personId, groupId: args.groupId }));
          const finalizedForPair = await transaction.get(membershipRepository.finalizedPairQuery({ personId: args.personId, groupId: args.groupId }));
          if (!activeForPair.empty || !finalizedForPair.empty) {
            throw new MembershipIncompatibleStateError("Membership exists without its coordination guard");
          }
          throw new MembershipNotFoundError();
        }

        const membership = await membershipRepository.getById(activeGuard.membershipId, transaction);
        const activeForPair = await transaction.get(membershipRepository.activePairQuery(activeGuard));
        const periods = membership ? await membershipRepository.requirePeriodIntegrity({ transaction, membership }) : null;
        assertMembershipCorrelated(membership, activeGuard, periods?.latestPeriod);
        if (lifecycle) assertActiveLifecycleCorrelated(membership, lifecycle, activeGuard, periods?.latestPeriod);
        requireOnlyMembership(hydrateQuery(membershipRepository, activeForPair), membership.membershipId, "Active Membership is not unique");

        const group = await groupRepository.getById(args.groupId, transaction);
        if (!group) throw new MembershipGroupNotFoundError();
        if (group.groupId !== args.groupId || group.estado !== "activo") throw new MembershipGroupIncompatibleError();

        const openGuardSnapshot = await transaction.get(db.collection("openSeasonGuards").doc(args.groupId));
        let openGuard;
        try {
          openGuard = hydrateOpenSeasonGuard(openGuardSnapshot, args.groupId);
        } catch (error) {
          throw new MembershipSeasonNotModifiableError({ cause: error });
        }
        let season;
        try {
          season = await seasonRepository.getById(membership.seasonId, transaction);
        } catch (error) {
          throw new MembershipSeasonNotModifiableError({ cause: error });
        }
        const openSeasons = await transaction.get(db.collection("seasons")
          .where("groupId", "==", args.groupId).where("estado", "==", "abierta").limit(2));
        if (!openGuard || !season || openSeasons.size !== 1 || openSeasons.docs[0].id !== membership.seasonId
          || openGuard.seasonId !== membership.seasonId || season.seasonId !== membership.seasonId
          || season.groupId !== args.groupId || season.estado !== "abierta") {
          throw new MembershipSeasonNotModifiableError();
        }

        const finalizedAt = now();
        const transition = finalizeMembership({
          membership,
          finalizedAt,
          firstPeriodId: membershipValidityPeriodId(membership.membershipId, 1),
          firstPeriod: periods.firstPeriod,
          latestPeriod: periods.latestPeriod,
        });
        const activationOrdinal = transition.membership.periodCount;
        const intentData = Object.freeze({
          userId: args.userId,
          personId: args.personId,
          membershipId: membership.membershipId,
          groupId: args.groupId,
          seasonId: membership.seasonId,
          activationOrdinal,
          idempotencyKeyHash: args.idempotencyKeyHash,
          requestHash: args.requestHash,
          status: "confirmed",
          outcome: "EXIT_CONFIRMED",
          actorWasOwner: group.ownerId === args.userId,
          createdAt: finalizedAt,
          finalizedAt,
          completedAt: finalizedAt,
          intentVersion: 1,
        });
        membershipRepository.persistTransition(transaction, transition);
        transaction.delete(activeRef);
        const finalizedLifecycle = {
          membershipId: membership.membershipId,
          personId: args.personId,
          groupId: args.groupId,
          seasonId: membership.seasonId,
          rootState: "finalized",
          lastActivationOrdinal: activationOrdinal,
          finalizedAt,
          lifecycleGuardVersion: 3,
        };
        if (lifecycle) transaction.set(lifecycleRef, finalizedLifecycle);
        else transaction.create(lifecycleRef, finalizedLifecycle);
        transaction.create(intentRef, intentData);
        return toResult(intentData);
      });
    } catch (error) {
      annotateMembershipError(error, { operation: "self-exit", stage: "transaction", attempt: transactionAttempt });
      throw error;
    }
  }

  return {
    reference,
    hydrate: hydrateMembershipSelfExitIntent,
    async confirm(args) {
      try {
        return await execute(args);
      } catch (error) {
        if (isMembershipContention(error) || isAmbiguousTransactionFailure(error)) {
          try {
            return await execute(args);
          } catch (recoveryError) {
            annotateMembershipError(recoveryError, { operation: "self-exit", stage: "authoritative-reread" });
            throw mapSelfExitInfrastructureError(recoveryError);
          }
        }
        throw mapSelfExitInfrastructureError(error);
      }
    },
  };
}

module.exports = {
  INTENT_FIELDS,
  createFirestoreMembershipSelfExitStore,
  hydrateMembershipSelfExitIntent,
  toResult,
};
