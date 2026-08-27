"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { InvalidGroupStateError } = require("../domain/group");
const { InvalidSeasonStateError } = require("../domain/season");
const {
  OpenSeasonAlreadyExistsError,
  SeasonConflictError,
  SeasonDependencyUnavailableError,
  SeasonError,
  SeasonGroupIncompatibleError,
  SeasonGroupNotFoundError,
  SeasonIdempotencyConflictError,
  SeasonIncompatibleStateError,
  SeasonNotAuthorizedError,
} = require("../application/seasonErrors");
const { isTransactionConflict, isUnavailable } = require("./firestoreGroupCreationGuard");

const OPEN_SEASON_GUARD_FIELDS = Object.freeze(["seasonId", "idempotencyKeyHash", "requestHash", "createdAt", "guardVersion"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function hydrateOpenSeasonGuard(snapshot, groupId) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).sort() : [];
  const expected = [...OPEN_SEASON_GUARD_FIELDS].sort();
  const valid = keys.length === expected.length
    && !keys.some((key, index) => key !== expected[index])
    && typeof data.seasonId === "string" && data.seasonId.trim() === data.seasonId && data.seasonId.length > 0
    && HASH_PATTERN.test(data.idempotencyKeyHash)
    && HASH_PATTERN.test(data.requestHash)
    && data.guardVersion === 1
    && data.createdAt && typeof data.createdAt.toDate === "function"
    && !Number.isNaN(data.createdAt.toDate().getTime());
  if (!valid || snapshot.id !== groupId) throw new SeasonIncompatibleStateError("Open season guard is invalid");
  return data;
}

function createFirestoreOpenSeasonGuard({ db, groupRepository }) {
  if (!db || !groupRepository) throw new TypeError("Open season guard dependencies are required");

  return {
    async confirmOpenSeason({ userId, season, idempotencyKeyHash, requestHash, seasonRepository }) {
      const guardRef = db.collection("openSeasonGuards").doc(season.groupId);
      try {
        return await db.runTransaction(async (transaction) => {
          let group;
          try {
            group = await groupRepository.getById(season.groupId, transaction);
          } catch (error) {
            if (error instanceof InvalidGroupStateError) throw new SeasonGroupIncompatibleError({ cause: error });
            throw error;
          }
          if (!group) throw new SeasonGroupNotFoundError();
          if (group.ownerId !== userId) throw new SeasonNotAuthorizedError();

          const guard = hydrateOpenSeasonGuard(await transaction.get(guardRef), season.groupId);
          if (guard) {
            let persisted;
            try {
              persisted = await seasonRepository.getById(guard.seasonId, transaction);
            } catch (error) {
              if (error instanceof InvalidSeasonStateError) throw new SeasonIncompatibleStateError(undefined, { cause: error });
              throw error;
            }
            if (!persisted || persisted.groupId !== season.groupId || persisted.estado !== "abierta") {
              throw new SeasonIncompatibleStateError("Open season guard reference is inconsistent");
            }
            if (guard.idempotencyKeyHash === idempotencyKeyHash) {
              if (guard.requestHash !== requestHash) throw new SeasonIdempotencyConflictError();
              return { outcome: "EXISTING_IDEMPOTENT", seasonId: persisted.seasonId, season: persisted };
            }
            throw new OpenSeasonAlreadyExistsError();
          }

          const existing = await transaction.get(db.collection("seasons").where("groupId", "==", season.groupId).limit(1));
          if (!existing.empty) throw new SeasonIncompatibleStateError("Season exists without its open guard");

          seasonRepository.createInitial(transaction, season);
          transaction.create(guardRef, {
            seasonId: season.seasonId,
            idempotencyKeyHash,
            requestHash,
            createdAt: FieldValue.serverTimestamp(),
            guardVersion: 1,
          });
          return { outcome: "CREATED_OPEN", seasonId: season.seasonId };
        });
      } catch (error) {
        if (error instanceof SeasonError) throw error;
        if (error instanceof InvalidGroupStateError) throw new SeasonGroupIncompatibleError({ cause: error });
        if (error instanceof InvalidSeasonStateError) throw new SeasonIncompatibleStateError(undefined, { cause: error });
        if (isUnavailable(error)) throw new SeasonDependencyUnavailableError({ cause: error });
        if (isTransactionConflict(error)) throw new SeasonConflictError({ cause: error });
        throw error;
      }
    },
  };
}

module.exports = { OPEN_SEASON_GUARD_FIELDS, createFirestoreOpenSeasonGuard, hydrateOpenSeasonGuard };
