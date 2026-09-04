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

function errorChain(error) {
  const chain = [];
  const visited = new Set();
  let current = error;
  while (current && (typeof current === "object" || typeof current === "function") && !visited.has(current) && chain.length < 6) {
    visited.add(current);
    chain.push(current);
    current = current.cause;
  }
  return chain;
}

function isOpenSeasonTransactionBoundaryCode3(error) {
  return errorChain(error).some((current) => [3, "3"].includes(current.code));
}

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

function assertOpenSeasonCorrelated(persisted, guard, groupId) {
  if (!persisted
    || persisted.seasonId !== guard.seasonId
    || persisted.groupId !== groupId
    || persisted.estado !== "abierta") {
    throw new SeasonIncompatibleStateError("Open season guard reference is inconsistent");
  }
}

async function resolveConfirmedOpenSeasonAfterCode3({
  originalError,
  guardRef,
  groupRepository,
  userId,
  season,
  idempotencyKeyHash,
  requestHash,
  seasonRepository,
  db,
}) {
  let group;
  let guard;
  let persisted;
  try {
    group = await groupRepository.getById(season.groupId);
    guard = hydrateOpenSeasonGuard(await guardRef.get(), season.groupId);
    const openSeasons = await db.collection("seasons")
      .where("groupId", "==", season.groupId)
      .where("estado", "==", "abierta")
      .limit(2)
      .get();
    if (!group || group.groupId !== season.groupId || group.ownerId !== userId) throw originalError;
    if (!guard || openSeasons.size !== 1) throw originalError;
    persisted = seasonRepository.fromSnapshot(openSeasons.docs[0]);
    assertOpenSeasonCorrelated(persisted, guard, season.groupId);
  } catch (error) {
    if (error === originalError) throw error;
    throw originalError;
  }

  if (guard.idempotencyKeyHash === idempotencyKeyHash) {
    if (guard.requestHash !== requestHash) throw new SeasonIdempotencyConflictError();
    return { outcome: "EXISTING_IDEMPOTENT", seasonId: persisted.seasonId, season: persisted };
  }
  throw new OpenSeasonAlreadyExistsError();
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
        // Numeric code 3 is recoverable only at this opening-transaction boundary,
        // and only after a complete authoritative reread proves the committed state.
        if (!(error instanceof SeasonError) && isOpenSeasonTransactionBoundaryCode3(error)) {
          return resolveConfirmedOpenSeasonAfterCode3({
            originalError: error,
            guardRef,
            groupRepository,
            userId,
            season,
            idempotencyKeyHash,
            requestHash,
            seasonRepository,
            db,
          });
        }
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

module.exports = {
  OPEN_SEASON_GUARD_FIELDS,
  assertOpenSeasonCorrelated,
  createFirestoreOpenSeasonGuard,
  hydrateOpenSeasonGuard,
  isOpenSeasonTransactionBoundaryCode3,
  resolveConfirmedOpenSeasonAfterCode3,
};
