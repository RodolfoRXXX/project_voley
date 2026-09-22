"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { InvalidGroupStateError } = require("../domain/group");
const { InvalidSeasonStateError, closeSeason } = require("../domain/season");
const { toClosedSeasonDto } = require("../application/seasonDto");
const { legacySeasonOpeningReceiptId } = require("../application/seasonHashing");
const {
  SeasonAccountRequiredError, SeasonActiveMembershipsExistError, SeasonAlreadyClosedError, SeasonApprovalInProgressError,
  SeasonConflictError, SeasonDependencyNotConfiguredError, SeasonDependencyUnavailableError, SeasonError,
  SeasonGroupIncompatibleError, SeasonGroupNotFoundError, SeasonGuardIncompatibleError, SeasonGuardMissingError,
  SeasonIdempotencyConflictError, SeasonIncompatibleStateError, SeasonMembershipActiveGuardIncompatibleError,
  SeasonMembershipPeriodIncompatibleError, SeasonMembershipSeasonIncompatibleError, SeasonNotAuthorizedError,
  SeasonNotFoundError,
} = require("../application/seasonErrors");
const { hydrateOpenSeasonGuard } = require("./firestoreOpenSeasonGuard");
const { hydrateClosureReceipt, hydrateOpeningReceipt, sameTimestamp } = require("./seasonReceipts");
const { isTransactionConflict, isUnavailable } = require("./firestoreGroupCreationGuard");

function accountCompatible(snapshot, userId) {
  if (!snapshot.exists || snapshot.id !== userId) return false;
  const data = snapshot.data(); const keys = Object.keys(data || {}).sort();
  const base = ["createdAt", "email", "nombre", "photoURL"].sort(); const linked = [...base, "personaId"].sort();
  const exact = (expected) => keys.length === expected.length && !keys.some((key, index) => key !== expected[index]);
  return (exact(base) || exact(linked)) && typeof data.email === "string" && data.email.trim().length > 0
    && typeof data.nombre === "string" && typeof data.photoURL === "string" && data.createdAt && typeof data.createdAt.toDate === "function"
    && (!Object.hasOwn(data, "personaId") || (typeof data.personaId === "string" && data.personaId.trim() === data.personaId && data.personaId.length > 0));
}
function isMissingIndex(error) { return [9, "9", "failed-precondition", "FAILED_PRECONDITION"].includes(error?.code) && /index/i.test(String(error?.message || "")); }

function createFirestoreSeasonClosureStore({ db, groupRepository, seasonRepository, membershipCapability, approvalCapability, now = () => Timestamp.now() }) {
  if (!db || !groupRepository || !seasonRepository || !membershipCapability || !approvalCapability || typeof now !== "function") throw new TypeError("Season closure dependencies are required");
  return Object.freeze({
    async close(command) {
      const receiptRef = db.collection("seasonClosureReceipts").doc(command.receiptId);
      try {
        return await db.runTransaction(async (transaction) => {
          const accountSnapshot = await transaction.get(db.collection("users").doc(command.userId));
          if (!accountSnapshot.exists) throw new SeasonAccountRequiredError();
          if (!accountCompatible(accountSnapshot, command.userId)) throw new SeasonAccountRequiredError();

          let group;
          try { group = await groupRepository.getById(command.groupId, transaction); }
          catch (error) { if (error instanceof InvalidGroupStateError) throw new SeasonGroupIncompatibleError({ cause: error }); throw error; }
          if (!group) throw new SeasonGroupNotFoundError();
          if (group.ownerId !== command.userId) throw new SeasonNotAuthorizedError();

          let receipt;
          try { receipt = hydrateClosureReceipt(await transaction.get(receiptRef), receiptRef.id); }
          catch (error) { throw new SeasonIncompatibleStateError("Closure receipt is invalid", { cause: error }); }
          if (receipt) {
            if (receipt.actorUserId !== command.userId || receipt.groupId !== command.groupId || receipt.seasonId !== command.seasonId || receipt.idempotencyKeyHash !== command.idempotencyKeyHash || receipt.requestHash !== command.requestHash) throw new SeasonIdempotencyConflictError();
            let historical;
            try { historical = await seasonRepository.getById(receipt.seasonId, transaction); }
            catch (error) { throw new SeasonIncompatibleStateError("Closure receipt Season is invalid", { cause: error }); }
            if (!historical || historical.estado !== "cerrada" || historical.groupId !== command.groupId || historical.closedBy !== command.userId || !sameTimestamp(historical.closedAt, receipt.closedAt)) throw new SeasonIncompatibleStateError("Closure receipt Season is invalid");
            return Object.freeze({ outcome: "EXISTING_IDEMPOTENT", season: toClosedSeasonDto(historical) });
          }

          let season;
          try { season = await seasonRepository.getById(command.seasonId, transaction); }
          catch (error) { if (error instanceof InvalidSeasonStateError) throw new SeasonIncompatibleStateError(undefined, { cause: error }); throw error; }
          if (!season || season.groupId !== command.groupId) throw new SeasonNotFoundError();
          if (season.estado === "cerrada") throw new SeasonAlreadyClosedError();

          let guard;
          try { guard = hydrateOpenSeasonGuard(await transaction.get(db.collection("openSeasonGuards").doc(command.groupId)), command.groupId); }
          catch (error) { throw new SeasonGuardIncompatibleError({ cause: error }); }
          if (!guard) throw new SeasonGuardMissingError();
          if (guard.seasonId !== command.seasonId) throw new SeasonGuardIncompatibleError();

          const open = await transaction.get(db.collection("seasons").where("groupId", "==", command.groupId).where("estado", "==", "abierta").limit(2));
          if (open.size !== 1 || open.docs[0].id !== command.seasonId) throw new SeasonGuardIncompatibleError();

          const active = await membershipCapability.findActive({ unitOfWork: transaction, groupId: command.groupId, seasonId: command.seasonId });
          if (active.status === "season-incompatible") throw new SeasonMembershipSeasonIncompatibleError();
          if (active.status === "period-incompatible") throw new SeasonMembershipPeriodIncompatibleError();
          if (active.status === "guard-incompatible") throw new SeasonMembershipActiveGuardIncompatibleError();
          if (active.status === "active") throw new SeasonActiveMembershipsExistError();
          if (active.status !== "absent") throw new SeasonIncompatibleStateError();

          const residual = await membershipCapability.findResidualGuard({ unitOfWork: transaction, groupId: command.groupId });
          if (residual.status !== "absent") throw new SeasonMembershipActiveGuardIncompatibleError();
          const approval = await approvalCapability.findBlocking({ unitOfWork: transaction, groupId: command.groupId });
          if (approval.status === "blocking") throw new SeasonApprovalInProgressError();
          if (approval.status !== "absent") throw new SeasonIncompatibleStateError("Approval coordination is incompatible");

          let legacyReceiptRef = null; let createLegacyReceipt = false;
          if (guard.guardVersion === 1) {
            legacyReceiptRef = db.collection("seasonOpeningReceipts").doc(legacySeasonOpeningReceiptId(command.groupId, guard.idempotencyKeyHash));
            let legacy;
            try { legacy = hydrateOpeningReceipt(await transaction.get(legacyReceiptRef), legacyReceiptRef.id); }
            catch (error) { throw new SeasonIncompatibleStateError("Legacy opening receipt is invalid", { cause: error }); }
            if (legacy && (legacy.receiptVersion !== 1 || legacy.groupId !== command.groupId || legacy.seasonId !== command.seasonId || legacy.idempotencyKeyHash !== guard.idempotencyKeyHash || legacy.requestHash !== guard.requestHash || !sameTimestamp(legacy.openedAt, guard.createdAt))) throw new SeasonIncompatibleStateError("Legacy opening receipt does not match");
            createLegacyReceipt = !legacy;
          }

          const closedAt = now(); const closed = closeSeason(season, { closedAt, closedBy: command.userId });
          seasonRepository.persistClosed(transaction, closed);
          if (createLegacyReceipt) transaction.create(legacyReceiptRef, { action: "OPEN_SEASON", groupId: command.groupId, seasonId: command.seasonId, idempotencyKeyHash: guard.idempotencyKeyHash, requestHash: guard.requestHash, outcome: "OPENED", openedAt: guard.createdAt, confirmedAt: guard.createdAt, receiptVersion: 1 });
          transaction.create(receiptRef, { action: "CLOSE_SEASON", actorUserId: command.userId, groupId: command.groupId, seasonId: command.seasonId, idempotencyKeyHash: command.idempotencyKeyHash, requestHash: command.requestHash, outcome: "CLOSED", closedAt, confirmedAt: closedAt, receiptVersion: 1 });
          transaction.delete(db.collection("openSeasonGuards").doc(command.groupId));
          return Object.freeze({ outcome: "CLOSED", season: toClosedSeasonDto(closed) });
        });
      } catch (error) {
        if (error instanceof SeasonError) throw error;
        if (isMissingIndex(error)) throw new SeasonDependencyNotConfiguredError({ cause: error });
        if (isUnavailable(error)) throw new SeasonDependencyUnavailableError({ cause: error });
        if (isTransactionConflict(error)) throw new SeasonConflictError({ cause: error });
        if (error instanceof InvalidSeasonStateError) throw new SeasonIncompatibleStateError(undefined, { cause: error });
        throw error;
      }
    },
  });
}

module.exports = { accountCompatible, createFirestoreSeasonClosureStore, isMissingIndex };
