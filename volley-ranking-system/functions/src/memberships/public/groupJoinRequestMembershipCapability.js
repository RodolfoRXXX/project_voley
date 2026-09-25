"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { buildMembership, buildRenewedMembership, InvalidMembershipStateError, MEMBERSHIP_FINALIZED_SCHEMA_VERSION, reactivateMembership } = require("../domain/membership");
const { MembershipAlreadyExistsError, MembershipError, MembershipGroupIncompatibleError, MembershipIdempotencyConflictError, MembershipIncompatibleStateError, MembershipNotAuthorizedError, MembershipOpenSeasonRequiredError, MembershipPredecessorIncompatibleError, MembershipSeasonIncompatibleError, MembershipSeasonNotReactivatableError } = require("../application/membershipErrors");
const { activeMembershipGuardId, membershipLifecycleGuardId, membershipValidityPeriodId } = require("../application/membershipHashing");
const { createFirestoreMembershipRepository } = require("../infrastructure/firestoreMembershipRepository");
const { hydrateActiveMembershipGuard, assertMembershipCorrelated, guardIdempotencyHash, guardRequestHash, mapInfrastructureError } = require("../infrastructure/firestoreActiveMembershipGuard");
const { hydrateMembershipLifecycleGuard, assertActiveLifecycleCorrelated, assertFinalizedMembershipCorrelated } = require("../infrastructure/firestoreMembershipLifecycleGuard");

const HASH = /^[a-f0-9]{64}$/;
function validId(value) { return typeof value === "string" && value && value.trim() === value && !value.includes("/") && Buffer.byteLength(value, "utf8") <= 1500; }
function validOrdinal(value) { return Number.isSafeInteger(value) && value > 0; }

function createGroupJoinRequestMembershipCapability({ db, groupCapability, seasonCapability, now = () => Timestamp.now() }) {
  if (!db || typeof now !== "function") throw new TypeError("db is required");
  const repository = createFirestoreMembershipRepository({ db });
  const refs = (personId, groupId) => ({ activeId: activeMembershipGuardId(groupId, personId), lifecycleId: membershipLifecycleGuardId(groupId, personId) });

  async function readState(unitOfWork, { personId, groupId }) {
    const ids = refs(personId, groupId); const activeRef = db.collection("activeMembershipGuards").doc(ids.activeId); const lifecycleRef = db.collection("membershipLifecycleGuards").doc(ids.lifecycleId);
    const [activeGuardSnapshot, lifecycleSnapshot] = await unitOfWork.getAll(activeRef, lifecycleRef);
    const activePair = await unitOfWork.get(repository.activePairQuery({ personId, groupId }));
    const activeGuard = hydrateActiveMembershipGuard(activeGuardSnapshot, { guardId: ids.activeId, personId, groupId });
    const lifecycle = hydrateMembershipLifecycleGuard(lifecycleSnapshot, { guardId: ids.lifecycleId, personId, groupId });
    if (activePair.size > 1 || (activeGuard && lifecycle && !(lifecycle.lifecycleGuardVersion === 3 && lifecycle.rootState === "active"))) throw new MembershipIncompatibleStateError();
    const active = activePair.empty ? null : repository.fromSnapshot(activePair.docs[0]);
    let referenced = null; let periodState = null;
    if (activeGuard || lifecycle) {
      referenced = await repository.getById((activeGuard || lifecycle).membershipId, unitOfWork);
      if (referenced) periodState = await repository.requirePeriodIntegrity({ transaction: unitOfWork, membership: referenced });
    }
    if (activeGuard) {
      assertMembershipCorrelated(referenced, activeGuard, periodState?.latestPeriod);
      if (!active || active.membershipId !== referenced.membershipId) throw new MembershipIncompatibleStateError();
      if (lifecycle) assertActiveLifecycleCorrelated(referenced, lifecycle, activeGuard, periodState?.latestPeriod);
      return { kind: "active", guard: activeGuard, lifecycle, membership: referenced, activeRef, lifecycleRef, ...periodState };
    }
    if (lifecycle) {
      assertFinalizedMembershipCorrelated(referenced, lifecycle, periodState?.latestPeriod);
      if (active) throw new MembershipIncompatibleStateError();
      if (lifecycle.lifecycleGuardVersion < 3) {
        const finalizedPair = await unitOfWork.get(repository.finalizedPairQuery({ personId, groupId }));
        if (finalizedPair.size !== 1 || finalizedPair.docs[0].id !== referenced.membershipId) throw new MembershipIncompatibleStateError();
      }
      const successors = await unitOfWork.get(repository.successorQuery(referenced.membershipId));
      if (!successors.empty) throw new MembershipPredecessorIncompatibleError();
      return { kind: "finalized", lifecycle, membership: referenced, activeRef, lifecycleRef, ...periodState };
    }
    const finalizedPair = await unitOfWork.get(repository.finalizedPairQuery({ personId, groupId }));
    if (active || !finalizedPair.empty) throw new MembershipIncompatibleStateError();
    return { kind: "absent", activeRef, lifecycleRef };
  }

  async function validateCreationContext(transaction, input) {
    if (!groupCapability || !seasonCapability) throw new MembershipIncompatibleStateError();
    const group = await groupCapability.getGroupContextForMembership({ unitOfWork: transaction, groupId: input.groupId });
    if (group?.status !== "active") throw new MembershipGroupIncompatibleError();
    const season = await seasonCapability.assertOpenSeasonForMembership({ unitOfWork: transaction, groupId: input.groupId, seasonId: input.seasonId });
    if (season?.status === "absent") throw new MembershipOpenSeasonRequiredError();
    if (season?.status !== "open") throw new MembershipSeasonIncompatibleError();
  }
  async function validateOwner(transaction, input) {
    if (!groupCapability) throw new MembershipIncompatibleStateError();
    const context = await groupCapability.getOwnedContext({ unitOfWork: transaction, groupId: input.groupId, userId: input.authorizedBy });
    if (context?.status !== "owned") throw new MembershipNotAuthorizedError();
  }
  async function validateReactivationSeason(transaction, input) {
    if (!seasonCapability) throw new MembershipIncompatibleStateError();
    const season = await seasonCapability.assertOpenSeasonForMembership({ unitOfWork: transaction, groupId: input.groupId, seasonId: input.seasonId });
    if (season?.status !== "open") throw new MembershipSeasonNotReactivatableError();
  }
  function validateActivationInput(input) {
    const expected = ["requestId", "decisionIntentId", "authorizedBy", "personId", "groupId", "seasonId", "membershipId", "expectedActivationOrdinal", "idempotencyKeyHash", "requestHash", "approvalEffect", ...(input?.approvalEffect === "RENEW_MEMBERSHIP" ? ["previousMembershipId"] : [])].sort();
    const keys = input && typeof input === "object" && !Array.isArray(input) ? Object.keys(input).sort() : [];
    if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index]) || ![input.requestId, input.decisionIntentId, input.authorizedBy, input.personId, input.groupId, input.seasonId, input.membershipId].every(validId) || !["CREATE_MEMBERSHIP", "REACTIVATE_MEMBERSHIP", "RENEW_MEMBERSHIP"].includes(input.approvalEffect) || (input.approvalEffect === "RENEW_MEMBERSHIP" && (!validId(input.previousMembershipId) || input.previousMembershipId === input.membershipId || input.expectedActivationOrdinal !== 1)) || !validOrdinal(input.expectedActivationOrdinal) || !HASH.test(input.idempotencyKeyHash) || !HASH.test(input.requestHash)) throw new MembershipIncompatibleStateError("Membership activation input is invalid");
  }
  function sameActivation(state, input) {
    return state.kind === "active" && state.membership.membershipId === input.membershipId && state.membership.seasonId === input.seasonId
      && state.guard.guardVersion === 2 && state.guard.activationOrdinal === input.expectedActivationOrdinal
      && guardIdempotencyHash(state.guard) === input.idempotencyKeyHash && guardRequestHash(state.guard) === input.requestHash
      && (input.approvalEffect !== "RENEW_MEMBERSHIP" || (state.membership.schemaVersion === 4 && state.membership.previousMembershipId === input.previousMembershipId && input.expectedActivationOrdinal === 1));
  }

  return Object.freeze({
    async getActiveContext({ unitOfWork, personId, groupId }) {
      try { const state = await readState(unitOfWork, { personId, groupId }); return Object.freeze({ status: state.kind === "active" ? "active" : "absent" }); }
      catch (error) { if (error instanceof InvalidMembershipStateError || (error instanceof MembershipError && error.reason === "INCOMPATIBLE_STATE")) return Object.freeze({ status: "incompatible" }); throw error; }
    },
    async prepareForGroupJoinRequest({ unitOfWork, personId, groupId }) {
      try {
        const state = await readState(unitOfWork, { personId, groupId });
        if (state.kind === "absent") return Object.freeze({ status: "absent", membershipId: repository.newId(), nextActivationOrdinal: 1 });
        if (state.kind === "active") return Object.freeze({ status: "active" });
        return Object.freeze({ status: "finalized", membershipId: state.membership.membershipId, renewalMembershipId: repository.newId(), seasonId: state.membership.seasonId, nextActivationOrdinal: state.membership.schemaVersion === 2 ? 2 : state.membership.periodCount + 1 });
      } catch (error) { throw mapInfrastructureError(error); }
    },
    async createOrRecoverForGroupJoinRequest(input) {
      validateActivationInput(input);
      try {
        return await db.runTransaction(async (transaction) => {
          await validateOwner(transaction, input);
          const state = await readState(transaction, input);
          if (state.kind === "active") {
            if (!sameActivation(state, input)) {
              if (state.guard.guardVersion === 2 && guardIdempotencyHash(state.guard) === input.idempotencyKeyHash) throw new MembershipIdempotencyConflictError();
              throw new MembershipAlreadyExistsError();
            }
            return Object.freeze({ outcome: "RECOVERED_ACTIVE", membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, activationOrdinal: input.expectedActivationOrdinal });
          }
          if (state.kind === "finalized") {
            if (input.approvalEffect === "RENEW_MEMBERSHIP") {
              if (state.membership.membershipId !== input.previousMembershipId || state.membership.seasonId === input.seasonId) throw new MembershipIncompatibleStateError();
              await validateCreationContext(transaction, input);
              const predecessorSeason = await seasonCapability.getSeasonContext({ unitOfWork: transaction, groupId: input.groupId, seasonId: state.membership.seasonId });
              if (predecessorSeason?.status !== "closed") throw new MembershipIncompatibleStateError("Membership predecessor Season is not closed");
              const target = await repository.getById(input.membershipId, transaction);
              if (target) throw new MembershipIncompatibleStateError("Membership renewal target already exists");
              const activatedAt = now();
              const candidate = buildRenewedMembership({ membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, previousMembershipId: input.previousMembershipId });
              repository.createInitial(transaction, candidate, activatedAt);
              transaction.create(state.activeRef, { membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, activationOrdinal: 1, activatedAt, activationIdempotencyHash: input.idempotencyKeyHash, activationRequestHash: input.requestHash, guardVersion: 2 });
              transaction.set(state.lifecycleRef, { membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, rootState: "active", lastActivationOrdinal: 1, lifecycleGuardVersion: 3 });
              return Object.freeze({ outcome: "RENEWED_ACTIVE", membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, activationOrdinal: 1 });
            }
            if (input.approvalEffect !== "REACTIVATE_MEMBERSHIP" || state.membership.membershipId !== input.membershipId || state.membership.seasonId !== input.seasonId) throw new MembershipIncompatibleStateError();
            const currentCount = state.membership.schemaVersion === 2 ? 1 : state.membership.periodCount;
            if (input.expectedActivationOrdinal === currentCount && state.membership.schemaVersion === 3 && state.latestPeriod?.estado === "cerrado") {
              return Object.freeze({ outcome: "REACTIVATION_SUPERSEDED", membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, activationOrdinal: input.expectedActivationOrdinal });
            }
            if (input.expectedActivationOrdinal !== currentCount + 1) throw new MembershipIncompatibleStateError();
            await validateReactivationSeason(transaction, input);
            const activatedAt = now(); const firstPeriodId = membershipValidityPeriodId(input.membershipId, 1); const nextPeriodId = membershipValidityPeriodId(input.membershipId, input.expectedActivationOrdinal);
            const transition = reactivateMembership({ membership: state.membership, reactivatedAt: activatedAt, firstPeriodId, nextPeriodId, firstPeriod: state.firstPeriod, latestPeriod: state.latestPeriod });
            repository.persistTransition(transaction, transition);
            transaction.set(state.lifecycleRef, { membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, rootState: "active", lastActivationOrdinal: input.expectedActivationOrdinal, lifecycleGuardVersion: 3 });
            transaction.create(state.activeRef, { membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, activationOrdinal: input.expectedActivationOrdinal, activatedAt, activationIdempotencyHash: input.idempotencyKeyHash, activationRequestHash: input.requestHash, guardVersion: 2 });
            return Object.freeze({ outcome: "REACTIVATED_ACTIVE", membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, activationOrdinal: input.expectedActivationOrdinal });
          }
          if (input.approvalEffect !== "CREATE_MEMBERSHIP" || input.expectedActivationOrdinal !== 1) throw new MembershipIncompatibleStateError();
          await validateCreationContext(transaction, input);
          const activatedAt = now(); const candidate = buildMembership({ membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId });
          repository.createInitial(transaction, candidate, activatedAt);
          transaction.create(state.activeRef, { membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, activationOrdinal: 1, activatedAt, activationIdempotencyHash: input.idempotencyKeyHash, activationRequestHash: input.requestHash, guardVersion: 2 });
          transaction.create(state.lifecycleRef, { membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, rootState: "active", lastActivationOrdinal: 1, lifecycleGuardVersion: 3 });
          return Object.freeze({ outcome: "CREATED_ACTIVE", membershipId: input.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, activationOrdinal: 1 });
        });
      } catch (error) { throw mapInfrastructureError(error); }
    },
    async getActivationContext({ unitOfWork, personId, groupId, seasonId, membershipId, expectedActivationOrdinal, previousMembershipId }) {
      try {
        const membership = await repository.getById(membershipId, unitOfWork);
        if (!membership) return Object.freeze({ status: "activation-absent" });
        if (membership.personId !== personId || membership.groupId !== groupId || membership.seasonId !== seasonId) return Object.freeze({ status: "incompatible" });
        if (previousMembershipId !== undefined && (membership.schemaVersion !== 4 || membership.previousMembershipId !== previousMembershipId || expectedActivationOrdinal !== 1)) return Object.freeze({ status: "incompatible" });
        if (membership.schemaVersion === MEMBERSHIP_FINALIZED_SCHEMA_VERSION) {
          if (membership.estado !== "finalizada" || expectedActivationOrdinal !== 2) return Object.freeze({ status: "incompatible" });
          await repository.requirePeriodIntegrity({ transaction: unitOfWork, membership });
          return Object.freeze({ status: "activation-absent" });
        }
        if (![3, 4].includes(membership.schemaVersion)) return Object.freeze({ status: "incompatible" });
        if (membership.estado === "finalizada" && expectedActivationOrdinal === membership.periodCount + 1) {
          await repository.requirePeriodIntegrity({ transaction: unitOfWork, membership });
          return Object.freeze({ status: "activation-absent" });
        }
        if (expectedActivationOrdinal > membership.periodCount) return Object.freeze({ status: "incompatible" });
        const periods = await repository.requirePeriodIntegrity({ transaction: unitOfWork, membership });
        const exactSnapshot = await unitOfWork.get(repository.periodReference(membershipId, membershipValidityPeriodId(membershipId, expectedActivationOrdinal)));
        const exactPeriod = repository.periodFromSnapshot(exactSnapshot);
        if (!exactPeriod || exactPeriod.ordinal !== expectedActivationOrdinal) return Object.freeze({ status: "incompatible" });
        if (membership.estado === "activa" && membership.periodCount === expectedActivationOrdinal && exactPeriod.estado === "abierto") return Object.freeze({ status: "activation-open", membershipId, personId, groupId, seasonId, activationOrdinal: expectedActivationOrdinal });
        if (exactPeriod.estado === "cerrado" && periods.firstPeriod) return Object.freeze({ status: "activation-closed", membershipId, personId, groupId, seasonId, activationOrdinal: expectedActivationOrdinal });
        return Object.freeze({ status: "incompatible" });
      } catch (error) { throw mapInfrastructureError(error); }
    },
    async getHistoricalMembershipContext({ unitOfWork, membershipId, personId, groupId }) {
      try { const membership = await repository.getById(membershipId, unitOfWork); if (!membership || membership.personId !== personId || membership.groupId !== groupId) return Object.freeze({ status: "incompatible" }); return Object.freeze({ status: "found", membershipId, seasonId: membership.seasonId }); }
      catch (error) { throw mapInfrastructureError(error); }
    },
  });
}

module.exports = { createGroupJoinRequestMembershipCapability };
