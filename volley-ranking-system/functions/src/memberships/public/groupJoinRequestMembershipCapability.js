"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { buildMembership, InvalidMembershipStateError } = require("../domain/membership");
const { MembershipAlreadyExistsError, MembershipError, MembershipGroupIncompatibleError, MembershipIncompatibleStateError, MembershipOpenSeasonRequiredError, MembershipReactivationRequiredError, MembershipSeasonIncompatibleError } = require("../application/membershipErrors");
const { activeMembershipGuardId, membershipLifecycleGuardId, sha256LengthPrefixed } = require("../application/membershipHashing");
const { createFirestoreMembershipRepository } = require("../infrastructure/firestoreMembershipRepository");
const { hydrateActiveMembershipGuard, assertMembershipCorrelated, mapInfrastructureError } = require("../infrastructure/firestoreActiveMembershipGuard");
const { hydrateMembershipLifecycleGuard, assertFinalizedMembershipCorrelated } = require("../infrastructure/firestoreMembershipLifecycleGuard");
const { createMembershipCandidateContext } = require("../infrastructure/membershipCandidateContext");

function createGroupJoinRequestMembershipCapability({ db, groupCapability, seasonCapability }) {
  if (!db) throw new TypeError("db is required");
  const repository = createFirestoreMembershipRepository({ db });
  const context = createMembershipCandidateContext({ db, membershipRepository: repository });
  const refs = (personId, groupId) => ({ activeId: activeMembershipGuardId(groupId, personId), lifecycleId: membershipLifecycleGuardId(groupId, personId) });

  async function readState(unitOfWork, { personId, groupId }) {
    const ids = refs(personId, groupId);
    const activeRef = db.collection("activeMembershipGuards").doc(ids.activeId);
    const lifecycleRef = db.collection("membershipLifecycleGuards").doc(ids.lifecycleId);
    const [activeGuardSnapshot, lifecycleSnapshot] = await unitOfWork.getAll(activeRef, lifecycleRef);
    const activePair = await unitOfWork.get(repository.activePairQuery({ personId, groupId }));
    const finalizedPair = await unitOfWork.get(repository.finalizedPairQuery({ personId, groupId }));
    const activeGuard = hydrateActiveMembershipGuard(activeGuardSnapshot, { guardId: ids.activeId, personId, groupId });
    const lifecycle = hydrateMembershipLifecycleGuard(lifecycleSnapshot, { guardId: ids.lifecycleId, personId, groupId });
    if (activePair.size > 1 || finalizedPair.size > 1 || (activeGuard && lifecycle)) throw new MembershipIncompatibleStateError();
    const active = activePair.empty ? null : repository.fromSnapshot(activePair.docs[0]);
    const finalized = finalizedPair.empty ? null : repository.fromSnapshot(finalizedPair.docs[0]);
    let referenced = null;
    if (activeGuard || lifecycle) referenced = await repository.getById((activeGuard || lifecycle).membershipId, unitOfWork);
    if (activeGuard) {
      assertMembershipCorrelated(referenced, activeGuard);
      if (!active || active.membershipId !== referenced.membershipId || finalized) throw new MembershipIncompatibleStateError();
      return { kind: "active", guard: activeGuard, membership: referenced, activeRef };
    }
    if (lifecycle) {
      assertFinalizedMembershipCorrelated(referenced, lifecycle);
      if (!finalized || finalized.membershipId !== referenced.membershipId || active) throw new MembershipIncompatibleStateError();
      return { kind: "finalized", lifecycle, membership: referenced, activeRef };
    }
    if (active || finalized) throw new MembershipIncompatibleStateError();
    return { kind: "absent", activeRef };
  }

  function sameApproval(state, input) {
    const seasonId = input.seasonId || state.membership?.seasonId;
    const idempotencyKeyHash = input.idempotencyKeyHash || (input.requestId && sha256LengthPrefixed(["sportexa:E2-07:request-membership-idempotency:v1", input.requestId, input.personId, input.groupId]));
    const requestHash = input.requestHash || (input.requestId && sha256LengthPrefixed(["sportexa:E2-07:request-membership:v1", "contract-v1", input.requestId, input.personId, input.groupId, seasonId]));
    if (state.kind === "active") return state.guard.idempotencyKeyHash === idempotencyKeyHash && state.guard.requestHash === requestHash && state.guard.seasonId === seasonId;
    if (state.kind === "finalized") return state.lifecycle.creationIdempotencyKeyHash === idempotencyKeyHash && state.lifecycle.creationRequestHash === requestHash && state.lifecycle.seasonId === seasonId;
    return false;
  }

  async function validateCreationContext(transaction, input) {
    if (!groupCapability || !seasonCapability) throw new MembershipIncompatibleStateError();
    const group = await groupCapability.getGroupContextForMembership({ unitOfWork: transaction, groupId: input.groupId });
    if (group?.status !== "active") throw new MembershipGroupIncompatibleError();
    const season = await seasonCapability.assertOpenSeasonForMembership({ unitOfWork: transaction, groupId: input.groupId, seasonId: input.seasonId });
    if (season?.status === "absent") throw new MembershipOpenSeasonRequiredError();
    if (season?.status !== "open") throw new MembershipSeasonIncompatibleError();
  }

  return Object.freeze({
    async getActiveContext({ unitOfWork, personId, groupId }) {
      try {
        const membership = await context.assertNoActive({ transaction: unitOfWork, personId, groupId });
        return Object.freeze({ status: membership ? "active" : "absent" });
      } catch (error) {
        if (error instanceof InvalidMembershipStateError || (error instanceof MembershipError && error.reason === "INCOMPATIBLE_STATE")) return Object.freeze({ status: "incompatible" });
        throw error;
      }
    },
    async createOrRecoverForGroupJoinRequest(input) {
      const candidateId = repository.newId();
      try {
        return await db.runTransaction(async (transaction) => {
          const state = await readState(transaction, input);
          if (state.kind === "active") {
            if (!sameApproval(state, input)) throw new MembershipAlreadyExistsError();
            return Object.freeze({ outcome: "RECOVERED_ACTIVE", membershipId: state.membership.membershipId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId });
          }
          if (state.kind === "finalized") throw new MembershipReactivationRequiredError();
          await validateCreationContext(transaction, input);
          const membership = buildMembership({ membershipId: candidateId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId });
          repository.createInitial(transaction, membership);
          transaction.create(state.activeRef, { membershipId: candidateId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId, idempotencyKeyHash: input.idempotencyKeyHash, requestHash: input.requestHash, createdAt: FieldValue.serverTimestamp(), guardVersion: 1 });
          return Object.freeze({ outcome: "CREATED_ACTIVE", membershipId: candidateId, personId: input.personId, groupId: input.groupId, seasonId: input.seasonId });
        });
      } catch (error) { throw mapInfrastructureError(error); }
    },
    async getGroupJoinRequestMembershipContext(input) {
      const read = async (transaction) => {
        const state = await readState(transaction, input);
        if (state.kind === "absent") return Object.freeze({ status: "absent" });
        if (!sameApproval(state, input)) return Object.freeze({ status: "foreign" });
        if (input.membershipId && state.membership.membershipId !== input.membershipId) return Object.freeze({ status: "incompatible" });
        return Object.freeze({ status: "correlated", membershipId: state.membership.membershipId, personId: state.membership.personId, groupId: state.membership.groupId, seasonId: state.membership.seasonId, lifecycle: state.kind });
      };
      try { return input.unitOfWork ? await read(input.unitOfWork) : await db.runTransaction(read); }
      catch (error) { throw mapInfrastructureError(error); }
    },
  });
}

module.exports = { createGroupJoinRequestMembershipCapability };
