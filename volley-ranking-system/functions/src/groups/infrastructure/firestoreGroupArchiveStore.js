"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { InvalidGroupStateError, archiveGroup } = require("../domain/group");
const { InvalidSeasonStateError, hydrateSeason } = require("../domain/season");
const { InvalidMembershipStateError } = require("../../memberships/domain/membership");
const { InvalidGroupJoinRequestStateError } = require("../../groupJoinRequests/domain/groupJoinRequest");
const { toGroupDto } = require("../application/groupDto");
const { groupArchiveToken } = require("../application/groupHashing");
const {
  GroupAccountRequiredError, GroupAlreadyArchivedError, GroupArchiveBlockedError, GroupConflictError,
  GroupDependencyUnavailableError, GroupError, GroupIdempotencyConflictError, GroupIncompatibleError,
  GroupInternalError, GroupNotAccessibleError, GroupStaleArchiveError,
} = require("../application/groupErrors");
const { hydrateOpenSeasonGuard } = require("./firestoreOpenSeasonGuard");
const { hydrateActiveMembershipGuard } = require("../../memberships/infrastructure/firestoreActiveMembershipGuard");
const { hydrateGuard, hydrateCoordination, hydrateDecisionIntent } = require("../../groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore");
const { isTransactionConflict, isUnavailable } = require("./firestoreGroupCreationGuard");
const { hydrateGroupArchiveReceipt } = require("./groupArchiveReceipts");

const BLOCKER_ORDER = Object.freeze([
  "ACTIVE_MEMBERSHIPS_EXIST", "OPEN_SEASON_EXISTS", "PENDING_REQUESTS_EXIST", "APPROVAL_IN_PROGRESS",
]);

function compatibleAccount(snapshot, userId) {
  if (!snapshot.exists || snapshot.id !== userId) return false;
  const data = snapshot.data();
  return data && typeof data.nombre === "string" && typeof data.email === "string" && data.email.trim()
    && typeof data.photoURL === "string" && data.createdAt && typeof data.createdAt.toDate === "function";
}
function sameTimestamp(left, right) { return left?.toDate?.().getTime() === right?.toDate?.().getTime(); }

function createFirestoreGroupArchiveStore({ db, groupRepository, membershipRepository, joinRequestRepository, now = () => Timestamp.now() }) {
  if (!db || !groupRepository || !membershipRepository || !joinRequestRepository || typeof now !== "function") {
    throw new TypeError("Group archive dependencies are required");
  }

  async function inspectEligibility(transaction, groupId) {
    const openGuardRef = db.collection("openSeasonGuards").doc(groupId);
    const [openGuardSnapshot, openSeasons, activeMemberships, activeGuards, pendingRequests, pendingGuards, coordinations] = await Promise.all([
      transaction.get(openGuardRef),
      transaction.get(db.collection("seasons").where("groupId", "==", groupId).where("estado", "==", "abierta")),
      transaction.get(db.collection("memberships").where("groupId", "==", groupId).where("estado", "==", "activa")),
      transaction.get(db.collection("activeMembershipGuards").where("groupId", "==", groupId)),
      transaction.get(db.collection("groupJoinRequests").where("groupId", "==", groupId).where("estado", "==", "pendiente")),
      transaction.get(db.collection("pendingGroupJoinRequestGuards").where("groupId", "==", groupId)),
      transaction.get(db.collection("groupJoinRequestApprovalCoordinations").where("groupId", "==", groupId)),
    ]);

    let openGuard;
    try { openGuard = hydrateOpenSeasonGuard(openGuardSnapshot, groupId); }
    catch (error) { throw new GroupIncompatibleError({ cause: error }); }
    let seasons;
    try { seasons = openSeasons.docs.map((snapshot) => hydrateSeason(snapshot.id, snapshot.data())); }
    catch (error) { if (error instanceof InvalidSeasonStateError) throw new GroupIncompatibleError({ cause: error }); throw error; }
    if (seasons.length > 1 || Boolean(openGuard) !== Boolean(seasons.length)
      || (openGuard && (seasons[0].seasonId !== openGuard.seasonId || seasons[0].groupId !== groupId))) {
      throw new GroupIncompatibleError();
    }

    let memberships;
    try { memberships = activeMemberships.docs.map(membershipRepository.fromSnapshot); }
    catch (error) { if (error instanceof InvalidMembershipStateError) throw new GroupIncompatibleError({ cause: error }); throw error; }
    const membershipById = new Map(memberships.map((membership) => [membership.membershipId, membership]));
    const memberGuards = new Map();
    for (const snapshot of activeGuards.docs) {
      const raw = snapshot.data();
      let guard;
      try { guard = hydrateActiveMembershipGuard(snapshot, { guardId: snapshot.id, personId: raw?.personId, groupId }); }
      catch (error) { throw new GroupIncompatibleError({ cause: error }); }
      const member = membershipById.get(guard.membershipId);
      if (!member || member.personId !== guard.personId || member.groupId !== groupId || member.seasonId !== guard.seasonId
        || memberGuards.has(member.membershipId)) throw new GroupIncompatibleError();
      try { await membershipRepository.requirePeriodIntegrity({ transaction, membership: member }); }
      catch (error) { throw new GroupIncompatibleError({ cause: error }); }
      memberGuards.set(member.membershipId, guard);
    }
    if (memberships.some((membership) => !memberGuards.has(membership.membershipId))) throw new GroupIncompatibleError();

    let requests;
    try { requests = pendingRequests.docs.map(joinRequestRepository.fromSnapshot); }
    catch (error) { if (error instanceof InvalidGroupJoinRequestStateError) throw new GroupIncompatibleError({ cause: error }); throw error; }
    const requestById = new Map(requests.map((request) => [request.requestId, request]));
    const requestGuards = new Map();
    for (const snapshot of pendingGuards.docs) {
      const raw = snapshot.data();
      let guard;
      try { guard = hydrateGuard(snapshot, { guardId: snapshot.id, personId: raw?.personId, groupId }); }
      catch (error) { throw new GroupIncompatibleError({ cause: error }); }
      const request = requestById.get(guard.requestId);
      if (!request || request.personId !== guard.personId || request.groupId !== groupId || requestGuards.has(request.requestId)) {
        throw new GroupIncompatibleError();
      }
      requestGuards.set(request.requestId, guard);
    }
    if (requests.some((request) => !requestGuards.has(request.requestId))) throw new GroupIncompatibleError();

    for (const snapshot of coordinations.docs) {
      let coordination;
      try { coordination = hydrateCoordination(snapshot); }
      catch (error) { throw new GroupIncompatibleError({ cause: error }); }
      if (!coordination || coordination.groupId !== groupId || coordination.requestId !== snapshot.id) throw new GroupIncompatibleError();
      const requestSnapshot = await transaction.get(joinRequestRepository.reference(coordination.requestId));
      const intentSnapshot = await transaction.get(db.collection("groupJoinRequestDecisionIntents").doc(coordination.decisionIntentId));
      let request; let intent;
      try { request = joinRequestRepository.fromSnapshot(requestSnapshot); intent = hydrateDecisionIntent(intentSnapshot); }
      catch (error) { throw new GroupIncompatibleError({ cause: error }); }
      if (!request || request.estado !== "pendiente" || request.groupId !== groupId || request.personId !== coordination.personId
        || !intent || intent.requestId !== request.requestId || intent.personId !== request.personId
        || intent.groupId !== groupId || intent.action !== "approve"
        || intent.requestedBy !== coordination.requestedBy
        || (intent.intentVersion >= 2 && intent.intentStatus !== "pending")) {
        throw new GroupIncompatibleError();
      }
    }

    const present = new Set();
    if (memberships.length) present.add("ACTIVE_MEMBERSHIPS_EXIST");
    if (seasons.length) present.add("OPEN_SEASON_EXISTS");
    if (requests.length) present.add("PENDING_REQUESTS_EXIST");
    if (coordinations.size) present.add("APPROVAL_IN_PROGRESS");
    return Object.freeze(BLOCKER_ORDER.filter((blocker) => present.has(blocker)));
  }

  async function authorizedGroup(transaction, userId, groupId) {
    const account = await transaction.get(db.collection("users").doc(userId));
    if (!compatibleAccount(account, userId)) throw new GroupAccountRequiredError();
    const snapshot = await transaction.get(groupRepository.reference(groupId));
    if (!snapshot.exists || snapshot.data()?.ownerId !== userId) throw new GroupNotAccessibleError();
    try { return groupRepository.fromSnapshot(snapshot); }
    catch (error) { if (error instanceof InvalidGroupStateError) throw new GroupIncompatibleError({ cause: error }); throw error; }
  }

  function resultFromReceipt(receipt, group) {
    if (!sameTimestamp(receipt.archivedAt, group.archivedAt)) throw new GroupIncompatibleError();
    return Object.freeze({
      outcome: "EXISTING_IDEMPOTENT", recovered: true,
      appliedEffect: Object.freeze({ outcome: "ARCHIVED", archivedAt: receipt.archivedAt.toDate().toISOString() }),
      currentGroup: toGroupDto(group),
    });
  }

  function mapError(error) {
    if (error instanceof GroupError) return error;
    if (isUnavailable(error)) return new GroupDependencyUnavailableError(undefined, { cause: error });
    if (isTransactionConflict(error)) return new GroupConflictError("Group archive conflicted", { cause: error });
    return new GroupInternalError({ cause: error });
  }

  return Object.freeze({
    async prepare({ userId, groupId }) {
      try {
        return await db.runTransaction(async (transaction) => {
          const group = await authorizedGroup(transaction, userId, groupId);
          if (group.estado === "archivado") throw new GroupAlreadyArchivedError();
          const blockers = await inspectEligibility(transaction, groupId);
          return Object.freeze({ group: toGroupDto(group), archiveToken: groupArchiveToken(group), eligibility: Object.freeze({
            status: blockers.length ? "BLOCKED" : "ELIGIBLE", blockers,
          }) });
        });
      } catch (error) { throw mapError(error); }
    },

    async archive(command) {
      const receiptRef = db.collection("groupArchiveReceipts").doc(command.receiptId);
      try {
        return await db.runTransaction(async (transaction) => {
          const group = await authorizedGroup(transaction, command.userId, command.groupId);
          let receipt;
          try { receipt = hydrateGroupArchiveReceipt(await transaction.get(receiptRef), receiptRef.id); }
          catch (error) { throw new GroupIncompatibleError({ cause: error }); }
          if (receipt) {
            if (receipt.actorUserId !== command.userId || receipt.groupId !== command.groupId
              || receipt.requestHash !== command.requestHash) throw new GroupIdempotencyConflictError();
            if (group.estado !== "archivado") throw new GroupIncompatibleError();
            return resultFromReceipt(receipt, group);
          }
          if (group.estado === "archivado") throw new GroupAlreadyArchivedError();
          if (groupArchiveToken(group) !== command.expectedArchiveToken) throw new GroupStaleArchiveError();
          const blockers = await inspectEligibility(transaction, command.groupId);
          if (blockers.length) throw new GroupArchiveBlockedError(blockers[0]);
          const archivedAt = now(); const archived = archiveGroup(group, archivedAt);
          groupRepository.archive(transaction, command.groupId, archivedAt);
          transaction.create(receiptRef, {
            action: "ARCHIVE_GROUP", actorUserId: command.userId, groupId: command.groupId,
            requestHash: command.requestHash, appliedState: "archivado", archivedAt,
            outcome: "ARCHIVED", receiptVersion: 1,
          });
          return Object.freeze({
            outcome: "ARCHIVED", recovered: false,
            appliedEffect: Object.freeze({ outcome: "ARCHIVED", archivedAt: archivedAt.toDate().toISOString() }),
            currentGroup: toGroupDto(archived),
          });
        });
      } catch (error) { throw mapError(error); }
    },
  });
}

module.exports = { BLOCKER_ORDER, compatibleAccount, createFirestoreGroupArchiveStore };
