"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { InvalidGroupStateError } = require("../domain/group");
const { InvalidSeasonStateError } = require("../domain/season");
const { toSeasonDto } = require("../application/seasonDto");
const { seasonEditToken } = require("../application/seasonHashing");
const {
  SeasonAccountRequiredError,
  SeasonAlreadyClosedError,
  SeasonConflictError,
  SeasonDependencyUnavailableError,
  SeasonError,
  SeasonGroupIncompatibleError,
  SeasonGroupNotAccessibleError,
  SeasonIdempotencyConflictError,
  SeasonIncompatibleStateError,
  SeasonNotAccessibleError,
  SeasonStaleUpdateError,
} = require("../application/seasonErrors");
const { hydrateOpenSeasonGuard } = require("./firestoreOpenSeasonGuard");
const { accountCompatible } = require("./firestoreSeasonClosureStore");
const { hydrateUpdateReceipt } = require("./seasonReceipts");
const { isTransactionConflict, isUnavailable } = require("./firestoreGroupCreationGuard");

function createFirestoreSeasonUpdateStore({ db, groupRepository, seasonRepository, now = () => Timestamp.now() }) {
  if (!db || !groupRepository || !seasonRepository || typeof now !== "function") {
    throw new TypeError("Season update dependencies are required");
  }

  return Object.freeze({
    async update(command) {
      const receiptRef = db.collection("seasonUpdateReceipts").doc(command.receiptId);
      try {
        return await db.runTransaction(async (transaction) => {
          const accountSnapshot = await transaction.get(db.collection("users").doc(command.userId));
          if (!accountCompatible(accountSnapshot, command.userId)) throw new SeasonAccountRequiredError();

          const groupSnapshot = await transaction.get(groupRepository.reference(command.groupId));
          if (!groupSnapshot.exists || groupSnapshot.data()?.ownerId !== command.userId) {
            throw new SeasonGroupNotAccessibleError();
          }
          try { groupRepository.fromSnapshot(groupSnapshot); }
          catch (error) {
            if (error instanceof InvalidGroupStateError) throw new SeasonGroupIncompatibleError({ cause: error });
            throw error;
          }

          let receipt;
          try { receipt = hydrateUpdateReceipt(await transaction.get(receiptRef), receiptRef.id); }
          catch (error) { throw new SeasonIncompatibleStateError("Season update receipt is invalid", { cause: error }); }
          if (receipt) {
            if (receipt.actorUserId !== command.userId || receipt.groupId !== command.groupId
              || receipt.seasonId !== command.seasonId || receipt.requestHash !== command.requestHash
              || receipt.expectedEditToken !== command.expectedEditToken) {
              throw new SeasonIdempotencyConflictError();
            }
            let current;
            try { current = await seasonRepository.getById(command.seasonId, transaction); }
            catch (error) { throw new SeasonIncompatibleStateError("Recovered Season is invalid", { cause: error }); }
            if (!current || current.groupId !== command.groupId) {
              throw new SeasonIncompatibleStateError("Recovered Season is not correlated");
            }
            return Object.freeze({
              outcome: "EXISTING_IDEMPOTENT",
              appliedEffect: Object.freeze({
                outcome: "UPDATED",
                nombre: command.nombre,
                editToken: receipt.resultEditToken,
                confirmedAt: receipt.confirmedAt.toDate().toISOString(),
              }),
              currentSeason: toSeasonDto(current),
              currentEditToken: current.estado === "abierta" ? seasonEditToken(current) : null,
            });
          }

          const seasonSnapshot = await transaction.get(seasonRepository.reference(command.seasonId));
          if (!seasonSnapshot.exists || seasonSnapshot.data()?.groupId !== command.groupId) throw new SeasonNotAccessibleError();
          let season;
          try { season = seasonRepository.fromSnapshot(seasonSnapshot); }
          catch (error) {
            if (error instanceof InvalidSeasonStateError) throw new SeasonIncompatibleStateError(undefined, { cause: error });
            throw error;
          }
          if (season.estado === "cerrada") throw new SeasonAlreadyClosedError();

          let guard;
          try { guard = hydrateOpenSeasonGuard(await transaction.get(db.collection("openSeasonGuards").doc(command.groupId)), command.groupId); }
          catch (error) { throw new SeasonIncompatibleStateError("Open Season guard is incompatible", { cause: error }); }
          const open = await transaction.get(db.collection("seasons")
            .where("groupId", "==", command.groupId).where("estado", "==", "abierta").limit(2));
          if (!guard || guard.seasonId !== command.seasonId || open.size !== 1 || open.docs[0].id !== command.seasonId) {
            throw new SeasonIncompatibleStateError("Open Season correlation is incompatible");
          }

          const currentEditToken = seasonEditToken(season);
          if (currentEditToken !== command.expectedEditToken) throw new SeasonStaleUpdateError();
          if (season.nombre === command.nombre) {
            return Object.freeze({ outcome: "NO_CHANGES", appliedEffect: null,
              currentSeason: toSeasonDto(season), currentEditToken });
          }

          const updated = Object.freeze({ ...season, nombre: command.nombre });
          const resultEditToken = seasonEditToken(updated);
          const confirmedAt = now();
          seasonRepository.updateName(transaction, command.seasonId, command.nombre);
          transaction.create(receiptRef, {
            action: "UPDATE_SEASON", actorUserId: command.userId, groupId: command.groupId,
            seasonId: command.seasonId, requestHash: command.requestHash,
            expectedEditToken: command.expectedEditToken, resultEditToken,
            outcome: "UPDATED", confirmedAt, receiptVersion: 1,
          });
          return Object.freeze({
            outcome: "UPDATED",
            appliedEffect: Object.freeze({ outcome: "UPDATED", nombre: command.nombre,
              editToken: resultEditToken, confirmedAt: confirmedAt.toDate().toISOString() }),
            currentSeason: toSeasonDto(updated),
            currentEditToken: resultEditToken,
          });
        });
      } catch (error) {
        if (error instanceof SeasonError) throw error;
        if (isUnavailable(error)) throw new SeasonDependencyUnavailableError({ cause: error });
        if (isTransactionConflict(error)) throw new SeasonConflictError({ cause: error });
        if (error instanceof InvalidSeasonStateError) throw new SeasonIncompatibleStateError(undefined, { cause: error });
        throw error;
      }
    },
  });
}

module.exports = { createFirestoreSeasonUpdateStore };
