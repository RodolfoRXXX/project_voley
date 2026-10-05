"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { InvalidGroupStateError } = require("../domain/group");
const { InvalidSeasonStateError, hydrateSeason } = require("../domain/season");
const { InvalidMembershipStateError } = require("../../memberships/domain/membership");
const { InvalidGroupJoinRequestStateError } = require("../../groupJoinRequests/domain/groupJoinRequest");
const { toGroupDto } = require("../application/groupDto");
const { groupDeletionToken } = require("../application/groupHashing");
const {
  GroupAccountRequiredError, GroupConflictError, GroupDeletionBlockedError,
  GroupDependencyUnavailableError, GroupError, GroupIdempotencyConflictError,
  GroupIncompatibleError, GroupInternalError, GroupNotAccessibleError,
  GroupNotDeletableError, GroupStaleDeletionError,
} = require("../application/groupErrors");
const { hydrateGuard: hydrateCreationGuard, isTransactionConflict, isUnavailable } = require("./firestoreGroupCreationGuard");
const { hydrateGroupDeletionReceipt } = require("./groupDeletionReceipts");
const { hydrateGroupNameUpdateReceipt } = require("./groupNameUpdateReceipts");
const { hydrateGroupArchiveReceipt } = require("./groupArchiveReceipts");
const { hydrateClosureReceipt, hydrateOpeningReceipt, hydrateUpdateReceipt } = require("./seasonReceipts");
const { assertOpenSeasonCorrelated, hydrateOpenSeasonGuard } = require("./firestoreOpenSeasonGuard");
const { hydrateActiveMembershipGuard } = require("../../memberships/infrastructure/firestoreActiveMembershipGuard");
const { hydrateMembershipLifecycleGuard } = require("../../memberships/infrastructure/firestoreMembershipLifecycleGuard");
const { hydrateMembershipSelfExitIntent } = require("../../memberships/infrastructure/firestoreMembershipSelfExitStore");
const { hydrateAdministrativeFinalizationIntent } = require("../../memberships/infrastructure/firestoreMembershipAdministrativeFinalizationStore");
const { hydrateReceipt: hydrateMembershipCargoReceipt } = require("../../memberships/infrastructure/firestoreMembershipCargoStore");
const { hydrateCoordination, hydrateDecisionIntent, hydrateGuard: hydrateRequestGuard, hydrateIntent: hydrateRequestIntent } = require("../../groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore");

const BLOCKER_ORDER = Object.freeze([
  "SEASONS_EXIST", "MEMBERSHIPS_EXIST", "REQUESTS_EXIST",
  "FUNCTIONAL_REFERENCES_EXIST", "OPERATION_IN_PROGRESS",
]);
const FUNCTIONAL_COLLECTIONS = Object.freeze([
  "matches", "teams", "groupStats", "tournamentRegistrations", "tournamentTeams",
]);
const SEASON_TECHNICAL_COLLECTIONS = Object.freeze([
  "seasonOpeningReceipts", "seasonClosureReceipts", "seasonUpdateReceipts",
]);
const MEMBERSHIP_TECHNICAL_COLLECTIONS = Object.freeze([
  "activeMembershipGuards", "membershipLifecycleGuards", "membershipSelfExitIntents",
  "membershipAdministrativeFinalizationIntents", "membershipCargoUpdateReceipts",
]);
const REQUEST_TECHNICAL_COLLECTIONS = Object.freeze([
  "pendingGroupJoinRequestGuards", "groupJoinRequestIntents", "groupJoinRequestDecisionIntents",
]);

function compatibleAccount(snapshot, userId) {
  if (!snapshot.exists || snapshot.id !== userId) return false;
  const data = snapshot.data();
  return data && typeof data.nombre === "string" && typeof data.email === "string" && data.email.trim()
    && typeof data.photoURL === "string" && data.createdAt && typeof data.createdAt.toDate === "function";
}
function sameTimestamp(left, right) { return left?.toDate?.().getTime() === right?.toDate?.().getTime(); }
function queryByGroup(db, collection, groupId, limit = null) {
  const query = db.collection(collection).where("groupId", "==", groupId);
  return limit == null ? query : query.limit(limit);
}
function ensureTechnicalCorrelation(snapshot, rootsExist) {
  if (!snapshot.empty && !rootsExist) throw new GroupIncompatibleError();
  for (const document of snapshot.docs) {
    if (document.data()?.groupId !== document.data()?.groupId?.trim()) throw new GroupIncompatibleError();
  }
}

function createFirestoreGroupDeletionStore({ db, groupRepository, membershipRepository, joinRequestRepository, now = () => Timestamp.now() }) {
  if (!db || !groupRepository || !membershipRepository || !joinRequestRepository || typeof now !== "function") {
    throw new TypeError("Group deletion dependencies are required");
  }

  async function inspectEligibility(transaction, groupId) {
    const queries = [
      transaction.get(queryByGroup(db, "seasons", groupId)),
      transaction.get(queryByGroup(db, "memberships", groupId)),
      transaction.get(queryByGroup(db, "groupJoinRequests", groupId)),
      transaction.get(db.collection("openSeasonGuards").doc(groupId)),
      ...FUNCTIONAL_COLLECTIONS.map((name) => transaction.get(queryByGroup(db, name, groupId, 1))),
      transaction.get(queryByGroup(db, "groupJoinRequestApprovalCoordinations", groupId)),
      ...SEASON_TECHNICAL_COLLECTIONS.map((name) => transaction.get(queryByGroup(db, name, groupId))),
      ...MEMBERSHIP_TECHNICAL_COLLECTIONS.map((name) => transaction.get(queryByGroup(db, name, groupId))),
      ...REQUEST_TECHNICAL_COLLECTIONS.map((name) => transaction.get(queryByGroup(db, name, groupId))),
      transaction.get(queryByGroup(db, "groupNameUpdateReceipts", groupId)),
      transaction.get(queryByGroup(db, "groupArchiveReceipts", groupId, 2)),
      transaction.get(queryByGroup(db, "groupDeletionReceipts", groupId, 2)),
    ];
    const results = await Promise.all(queries);
    let cursor = 0;
    const seasonsSnapshot = results[cursor++]; const membershipsSnapshot = results[cursor++]; const requestsSnapshot = results[cursor++];
    const openSeasonGuardSnapshot = results[cursor++];
    let seasons;
    try { seasons = seasonsSnapshot.docs.map((snapshot) => hydrateSeason(snapshot.id, snapshot.data())); }
    catch (error) { if (error instanceof InvalidSeasonStateError) throw new GroupIncompatibleError({ cause: error }); throw error; }
    try {
      const openGuard = hydrateOpenSeasonGuard(openSeasonGuardSnapshot, groupId);
      const openSeasons = seasons.filter((season) => season.estado === "abierta");
      if (openGuard) {
        if (openSeasons.length !== 1) throw new Error("OPEN_SEASON_GUARD_ORPHANED");
        assertOpenSeasonCorrelated(openSeasons[0], openGuard, groupId);
      } else if (openSeasons.length) {
        throw new Error("OPEN_SEASON_GUARD_MISSING");
      }
    } catch (error) { throw new GroupIncompatibleError({ cause: error }); }
    let memberships;
    try { memberships = membershipsSnapshot.docs.map((snapshot) => membershipRepository.fromSnapshot(snapshot)); }
    catch (error) { if (error instanceof InvalidMembershipStateError) throw new GroupIncompatibleError({ cause: error }); throw error; }
    try {
      for (const membership of memberships) await membershipRepository.requirePeriodIntegrity({ transaction, membership });
      const byId = new Map(memberships.map((membership) => [membership.membershipId, membership])); const successors = new Set();
      for (const membership of memberships) {
        if (!membership.previousMembershipId) continue;
        const predecessor = byId.get(membership.previousMembershipId);
        if (!predecessor || predecessor.groupId !== groupId || predecessor.personId !== membership.personId
          || predecessor.estado !== "finalizada" || successors.has(predecessor.membershipId)) throw new GroupIncompatibleError();
        successors.add(predecessor.membershipId);
      }
    } catch (error) { if (error instanceof GroupError) throw error; throw new GroupIncompatibleError({ cause: error }); }
    let requests;
    try { requests = requestsSnapshot.docs.map((snapshot) => joinRequestRepository.fromSnapshot(snapshot)); }
    catch (error) { if (error instanceof InvalidGroupJoinRequestStateError) throw new GroupIncompatibleError({ cause: error }); throw error; }

    const functional = results.slice(cursor, cursor += FUNCTIONAL_COLLECTIONS.length);
    const coordinations = results[cursor++];
    const seasonTechnical = results.slice(cursor, cursor += SEASON_TECHNICAL_COLLECTIONS.length);
    const membershipTechnical = results.slice(cursor, cursor += MEMBERSHIP_TECHNICAL_COLLECTIONS.length);
    const requestTechnical = results.slice(cursor, cursor += REQUEST_TECHNICAL_COLLECTIONS.length);
    const nameReceipts = results[cursor++]; const archiveReceipts = results[cursor++]; const deletionReceipts = results[cursor++];

    seasonTechnical.forEach((snapshot) => ensureTechnicalCorrelation(snapshot, !seasonsSnapshot.empty));
    membershipTechnical.forEach((snapshot) => ensureTechnicalCorrelation(snapshot, !membershipsSnapshot.empty));
    requestTechnical.forEach((snapshot) => ensureTechnicalCorrelation(snapshot, !requestsSnapshot.empty));
    if (!coordinations.empty && requestsSnapshot.empty) throw new GroupIncompatibleError();
    try {
      const seasonIds = new Set(seasonsSnapshot.docs.map((snapshot) => snapshot.id));
      seasonTechnical[0].docs.forEach((snapshot) => { const receipt = hydrateOpeningReceipt(snapshot, snapshot.id); if (!seasonIds.has(receipt.seasonId)) throw new Error("ORPHAN_SEASON_RECEIPT"); });
      seasonTechnical[1].docs.forEach((snapshot) => { const receipt = hydrateClosureReceipt(snapshot, snapshot.id); if (!seasonIds.has(receipt.seasonId)) throw new Error("ORPHAN_SEASON_RECEIPT"); });
      seasonTechnical[2].docs.forEach((snapshot) => { const receipt = hydrateUpdateReceipt(snapshot, snapshot.id); if (!seasonIds.has(receipt.seasonId)) throw new Error("ORPHAN_SEASON_RECEIPT"); });
    } catch (error) { throw new GroupIncompatibleError({ cause: error }); }
    try {
      const membershipIds = new Set(memberships.map((membership) => membership.membershipId));
      membershipTechnical[0].docs.forEach((snapshot) => { const raw = snapshot.data(); const artifact = hydrateActiveMembershipGuard(snapshot, { guardId: snapshot.id, personId: raw?.personId, groupId }); if (!membershipIds.has(artifact.membershipId)) throw new Error("ORPHAN_MEMBERSHIP_ARTIFACT"); });
      membershipTechnical[1].docs.forEach((snapshot) => { const raw = snapshot.data(); const artifact = hydrateMembershipLifecycleGuard(snapshot, { guardId: snapshot.id, personId: raw?.personId, groupId }); if (!membershipIds.has(artifact.membershipId)) throw new Error("ORPHAN_MEMBERSHIP_ARTIFACT"); });
      membershipTechnical[2].docs.forEach((snapshot) => { const raw = snapshot.data(); const artifact = hydrateMembershipSelfExitIntent(snapshot, { intentId: snapshot.id, userId: raw?.userId, idempotencyKeyHash: raw?.idempotencyKeyHash }); if (!membershipIds.has(artifact.membershipId)) throw new Error("ORPHAN_MEMBERSHIP_ARTIFACT"); });
      membershipTechnical[3].docs.forEach((snapshot) => { const raw = snapshot.data(); const artifact = hydrateAdministrativeFinalizationIntent(snapshot, { intentId: snapshot.id, actorUserId: raw?.actorUserId, idempotencyKeyHash: raw?.idempotencyKeyHash }); if (!membershipIds.has(artifact.membershipId)) throw new Error("ORPHAN_MEMBERSHIP_ARTIFACT"); });
      membershipTechnical[4].docs.forEach((snapshot) => { const raw = snapshot.data(); const artifact = hydrateMembershipCargoReceipt(snapshot, { receiptId: snapshot.id, actorUserId: raw?.actorUserId, idempotencyKeyHash: raw?.idempotencyKeyHash }); if (!membershipIds.has(artifact.membershipId)) throw new Error("ORPHAN_MEMBERSHIP_ARTIFACT"); });
    } catch (error) { throw new GroupIncompatibleError({ cause: error }); }
    try {
      const requestIds = new Set(requests.map((request) => request.requestId));
      requestTechnical[0].docs.forEach((snapshot) => { const raw = snapshot.data(); const artifact = hydrateRequestGuard(snapshot, { guardId: snapshot.id, personId: raw?.personId, groupId }); if (!requestIds.has(artifact.requestId)) throw new Error("ORPHAN_REQUEST_ARTIFACT"); });
      requestTechnical[1].docs.forEach((snapshot) => { const artifact = hydrateRequestIntent(snapshot); if (!requestIds.has(artifact.requestId)) throw new Error("ORPHAN_REQUEST_ARTIFACT"); });
      requestTechnical[2].docs.forEach((snapshot) => { const artifact = hydrateDecisionIntent(snapshot); if (!requestIds.has(artifact.requestId)) throw new Error("ORPHAN_REQUEST_ARTIFACT"); });
      coordinations.docs.forEach((snapshot) => { const artifact = hydrateCoordination(snapshot); if (!requestIds.has(artifact.requestId)) throw new Error("ORPHAN_REQUEST_ARTIFACT"); });
    } catch (error) { throw new GroupIncompatibleError({ cause: error }); }
    try { nameReceipts.docs.forEach((snapshot) => hydrateGroupNameUpdateReceipt(snapshot, snapshot.id)); }
    catch (error) { throw new GroupIncompatibleError({ cause: error }); }
    if (!archiveReceipts.empty) {
      try { archiveReceipts.docs.forEach((snapshot) => hydrateGroupArchiveReceipt(snapshot, snapshot.id)); }
      catch (error) { throw new GroupIncompatibleError({ cause: error }); }
      throw new GroupIncompatibleError();
    }
    if (!deletionReceipts.empty) {
      try { deletionReceipts.docs.forEach((snapshot) => hydrateGroupDeletionReceipt(snapshot, snapshot.id)); }
      catch (error) { throw new GroupIncompatibleError({ cause: error }); }
      throw new GroupIncompatibleError();
    }

    const present = new Set();
    if (!seasonsSnapshot.empty) present.add("SEASONS_EXIST");
    if (!membershipsSnapshot.empty) present.add("MEMBERSHIPS_EXIST");
    if (!requestsSnapshot.empty) present.add("REQUESTS_EXIST");
    if (functional.some((snapshot) => !snapshot.empty)) present.add("FUNCTIONAL_REFERENCES_EXIST");
    if (!coordinations.empty) present.add("OPERATION_IN_PROGRESS");
    return Object.freeze(BLOCKER_ORDER.filter((blocker) => present.has(blocker)));
  }

  async function authorizedActiveGroup(transaction, userId, groupId) {
    const account = await transaction.get(db.collection("users").doc(userId));
    if (!compatibleAccount(account, userId)) throw new GroupAccountRequiredError();
    const snapshot = await transaction.get(groupRepository.reference(groupId));
    if (!snapshot.exists || snapshot.data()?.ownerId !== userId) throw new GroupNotAccessibleError();
    let group;
    try { group = groupRepository.fromSnapshot(snapshot); }
    catch (error) { if (error instanceof InvalidGroupStateError) throw new GroupIncompatibleError({ cause: error }); throw error; }
    if (group.estado !== "activo") throw new GroupNotDeletableError();
    return group;
  }

  function resultFromReceipt(receipt) {
    return Object.freeze({
      outcome: "EXISTING_IDEMPOTENT", recovered: true,
      appliedEffect: Object.freeze({ outcome: "DELETED", deletedAt: receipt.deletedAt.toDate().toISOString() }),
    });
  }
  function mapError(error) {
    if (error instanceof GroupError) return error;
    if (isUnavailable(error)) return new GroupDependencyUnavailableError(undefined, { cause: error });
    if (isTransactionConflict(error)) return new GroupConflictError("Group deletion conflicted", { cause: error });
    return new GroupInternalError({ cause: error });
  }

  return Object.freeze({
    async prepare({ userId, groupId }) {
      try {
        return await db.runTransaction(async (transaction) => {
          const group = await authorizedActiveGroup(transaction, userId, groupId);
          const guardRef = db.collection("groupCreationGuards").doc(userId);
          let guard;
          try { guard = hydrateCreationGuard(await transaction.get(guardRef), userId); }
          catch (error) { throw new GroupIncompatibleError({ cause: error }); }
          if (!guard || guard.groupId !== groupId) throw new GroupIncompatibleError();
          const blockers = await inspectEligibility(transaction, groupId);
          return Object.freeze({ group: toGroupDto(group), deletionToken: groupDeletionToken(group), eligibility: Object.freeze({
            status: blockers.length ? "BLOCKED" : "ELIGIBLE", blockers,
          }) });
        });
      } catch (error) { throw mapError(error); }
    },

    async delete(command) {
      const receiptRef = db.collection("groupDeletionReceipts").doc(command.receiptId);
      try {
        return await db.runTransaction(async (transaction) => {
          const account = await transaction.get(db.collection("users").doc(command.userId));
          if (!compatibleAccount(account, command.userId)) throw new GroupAccountRequiredError();
          let receipt;
          try { receipt = hydrateGroupDeletionReceipt(await transaction.get(receiptRef), receiptRef.id); }
          catch (error) { throw new GroupIncompatibleError({ cause: error }); }
          if (receipt) {
            if (receipt.actorUserId !== command.userId || receipt.groupId !== command.groupId
              || receipt.idempotencyKeyHash !== command.idempotencyKeyHash || receipt.requestHash !== command.requestHash) {
              throw new GroupIdempotencyConflictError();
            }
            return resultFromReceipt(receipt);
          }

          const groupSnapshot = await transaction.get(groupRepository.reference(command.groupId));
          if (!groupSnapshot.exists || groupSnapshot.data()?.ownerId !== command.userId) throw new GroupNotAccessibleError();
          let group;
          try { group = groupRepository.fromSnapshot(groupSnapshot); }
          catch (error) { if (error instanceof InvalidGroupStateError) throw new GroupIncompatibleError({ cause: error }); throw error; }
          if (group.estado !== "activo") throw new GroupNotDeletableError();
          if (groupDeletionToken(group) !== command.expectedDeletionToken) throw new GroupStaleDeletionError();

          const guardRef = db.collection("groupCreationGuards").doc(command.userId);
          let guard;
          try { guard = hydrateCreationGuard(await transaction.get(guardRef), command.userId); }
          catch (error) { throw new GroupIncompatibleError({ cause: error }); }
          if (!guard || guard.groupId !== command.groupId) throw new GroupIncompatibleError();
          const blockers = await inspectEligibility(transaction, command.groupId);
          if (blockers.length) throw new GroupDeletionBlockedError(blockers[0]);

          const deletedAt = now();
          transaction.create(receiptRef, {
            action: "DELETE_GROUP", actorUserId: command.userId, groupId: command.groupId,
            idempotencyKeyHash: command.idempotencyKeyHash, requestHash: command.requestHash,
            creationIdempotencyKeyHash: guard.idempotencyKeyHash, creationRequestHash: guard.requestHash,
            deletedAt, outcome: "DELETED", receiptVersion: 1,
          });
          groupRepository.deleteRoot(transaction, command.groupId);
          transaction.delete(guardRef);
          return Object.freeze({
            outcome: "DELETED", recovered: false,
            appliedEffect: Object.freeze({ outcome: "DELETED", deletedAt: deletedAt.toDate().toISOString() }),
          });
        });
      } catch (error) { throw mapError(error); }
    },
  });
}

module.exports = { BLOCKER_ORDER, FUNCTIONAL_COLLECTIONS, createFirestoreGroupDeletionStore };
