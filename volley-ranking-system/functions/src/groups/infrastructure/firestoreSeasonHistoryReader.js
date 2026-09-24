"use strict";

const { FieldPath } = require("firebase-admin/firestore");
const { InvalidGroupStateError } = require("../domain/group");
const { InvalidSeasonStateError, hydrateSeason } = require("../domain/season");
const {
  SeasonCursorStaleError,
  SeasonDependencyNotConfiguredError,
  SeasonDependencyUnavailableError,
  SeasonError,
  SeasonGroupIncompatibleError,
  SeasonGroupNotAccessibleError,
  SeasonIncompatibleStateError,
  SeasonInternalError,
} = require("../application/seasonErrors");
const { isTransientDependencyError } = require("../../shared/application/transientDependencyError");

function isMissingIndexError(error) {
  const failedPrecondition = error?.code === 9 || error?.code === "failed-precondition";
  const canonicalSignal = typeof error?.message === "string"
    && /(?:The query requires an index|requires a COLLECTION_ASC index)/.test(error.message);
  return failedPrecondition && canonicalSignal;
}

function createFirestoreSeasonHistoryReader({ db, groupRepository }) {
  if (!db || !groupRepository) throw new TypeError("Season history reader dependencies are required");

  function closedQuery({ groupId, pageSize, position }) {
    let query = db.collection("seasons")
      .where("groupId", "==", groupId)
      .where("estado", "==", "cerrada")
      .orderBy("fechaInicio", "desc")
      .orderBy(FieldPath.documentId(), "desc");
    if (position) query = query.startAfter(position.last.fechaInicio, position.last.seasonId);
    return query.limit(pageSize + 1);
  }

  async function requireOwnedGroup(transaction, groupId, userId) {
    const snapshot = await transaction.get(groupRepository.reference(groupId));
    if (!snapshot.exists || snapshot.data()?.ownerId !== userId) throw new SeasonGroupNotAccessibleError();
    try {
      return groupRepository.fromSnapshot(snapshot);
    } catch (error) {
      if (error instanceof InvalidGroupStateError) throw new SeasonGroupIncompatibleError({ cause: error });
      throw error;
    }
  }

  function hydrateCurrent(snapshot) {
    if (snapshot.size > 1) throw new SeasonIncompatibleStateError("Multiple open Seasons exist");
    if (snapshot.empty) return null;
    try {
      const season = hydrateSeason(snapshot.docs[0].id, snapshot.docs[0].data());
      if (season.estado !== "abierta" || season.schemaVersion !== 1) throw new InvalidSeasonStateError("Open Season is incompatible");
      return season;
    } catch (error) {
      if (error instanceof InvalidSeasonStateError) throw new SeasonIncompatibleStateError(undefined, { cause: error });
      throw error;
    }
  }

  function hydrateClosed(snapshot, groupId) {
    try {
      const season = hydrateSeason(snapshot.id, snapshot.data());
      if (season.estado !== "cerrada" || season.schemaVersion !== 2 || season.groupId !== groupId) {
        throw new InvalidSeasonStateError("Closed Season context is incompatible");
      }
      return season;
    } catch (error) {
      if (error instanceof InvalidSeasonStateError) throw new SeasonIncompatibleStateError(undefined, { cause: error });
      throw error;
    }
  }

  async function readAnchor(transaction, groupId, position) {
    if (!position) return;
    const snapshot = await transaction.get(db.collection("seasons").doc(position.last.seasonId));
    if (!snapshot.exists) throw new SeasonCursorStaleError();
    try {
      const season = hydrateClosed(snapshot, groupId);
      if (season.fechaInicio !== position.last.fechaInicio) throw new SeasonCursorStaleError();
    } catch (error) {
      if (error instanceof SeasonCursorStaleError) throw error;
      if (error instanceof SeasonIncompatibleStateError) throw new SeasonCursorStaleError({ cause: error });
      throw error;
    }
  }

  return Object.freeze({
    async listPage({ userId, groupId, pageSize, position }) {
      try {
        return await db.runTransaction(async (transaction) => {
          await requireOwnedGroup(transaction, groupId, userId);
          await readAnchor(transaction, groupId, position);
          const openSnapshot = await transaction.get(db.collection("seasons")
            .where("groupId", "==", groupId).where("estado", "==", "abierta").limit(2));
          const currentSeason = hydrateCurrent(openSnapshot);
          if (position && (currentSeason?.seasonId || null) !== position.currentSeasonId) {
            throw new SeasonCursorStaleError();
          }
          const pageSnapshot = await transaction.get(closedQuery({ groupId, pageSize, position }));
          const all = pageSnapshot.docs.map((document) => hydrateClosed(document, groupId));
          const closedSeasons = Object.freeze(all.slice(0, pageSize));
          return Object.freeze({
            currentSeason,
            closedSeasons,
            hasMore: all.length > pageSize,
            last: closedSeasons.length ? Object.freeze({
              fechaInicio: closedSeasons.at(-1).fechaInicio,
              seasonId: closedSeasons.at(-1).seasonId,
            }) : null,
          });
        });
      } catch (error) {
        if (error instanceof SeasonError) throw error;
        if (error instanceof InvalidSeasonStateError) throw new SeasonIncompatibleStateError(undefined, { cause: error });
        if (isMissingIndexError(error)) throw new SeasonDependencyNotConfiguredError({ cause: error });
        if (isTransientDependencyError(error)) throw new SeasonDependencyUnavailableError({ cause: error });
        throw new SeasonInternalError({ cause: error });
      }
    },
  });
}

module.exports = { createFirestoreSeasonHistoryReader, isMissingIndexError };
