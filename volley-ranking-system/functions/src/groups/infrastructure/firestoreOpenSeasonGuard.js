"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { InvalidGroupStateError } = require("../domain/group");
const { InvalidSeasonStateError } = require("../domain/season");
const { OpenSeasonAlreadyExistsError, SeasonConflictError, SeasonDependencyUnavailableError, SeasonError, SeasonGroupIncompatibleError, SeasonGroupNotFoundError, SeasonIdempotencyConflictError, SeasonIncompatibleStateError, SeasonNotAuthorizedError } = require("../application/seasonErrors");
const { isTransactionConflict, isUnavailable } = require("./firestoreGroupCreationGuard");
const { hydrateOpeningReceipt } = require("./seasonReceipts");

const OPEN_SEASON_GUARD_V1_FIELDS = Object.freeze(["seasonId", "idempotencyKeyHash", "requestHash", "createdAt", "guardVersion"]);
const OPEN_SEASON_GUARD_FIELDS = Object.freeze(["seasonId", "openedAt", "guardVersion"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;
function exact(data, fields) { if (!data || typeof data !== "object" || Array.isArray(data)) return false; const a = Object.keys(data).sort(); const b = [...fields].sort(); return a.length === b.length && !a.some((key, i) => key !== b[i]); }
function validId(value) { return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/"); }
function validTimestamp(value) { return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime()); }
function errorChain(error) { const chain = []; const seen = new Set(); let current = error; while (current && !seen.has(current) && chain.length < 6) { seen.add(current); chain.push(current); current = current.cause; } return chain; }
function isOpenSeasonTransactionBoundaryCode3(error) { return errorChain(error).some((current) => [3, "3"].includes(current.code)); }

function hydrateOpenSeasonGuard(snapshot, groupId) {
  if (!snapshot.exists) return null;
  const data = snapshot.data(); const v1 = data?.guardVersion === 1;
  const valid = snapshot.id === groupId && validId(data?.seasonId) && (v1
    ? exact(data, OPEN_SEASON_GUARD_V1_FIELDS) && HASH_PATTERN.test(data.idempotencyKeyHash || "") && HASH_PATTERN.test(data.requestHash || "") && validTimestamp(data.createdAt)
    : data?.guardVersion === 2 && exact(data, OPEN_SEASON_GUARD_FIELDS) && validTimestamp(data.openedAt));
  if (!valid) throw new SeasonIncompatibleStateError("Open season guard is invalid");
  return Object.freeze(data);
}

function assertOpenSeasonCorrelated(season, guard, groupId) {
  if (!season || season.seasonId !== guard.seasonId || season.groupId !== groupId || season.estado !== "abierta") throw new SeasonIncompatibleStateError("Open season guard reference is inconsistent");
}
function openingReceiptMatches(receipt, input, legacy) { return receipt.groupId === input.season.groupId && receipt.requestHash === (legacy ? input.legacyRequestHash : input.requestHash) && receipt.idempotencyKeyHash === (legacy ? input.legacyIdempotencyKeyHash : input.idempotencyKeyHash) && (legacy || receipt.actorUserId === input.userId); }

async function resolveConfirmedOpenSeasonAfterCode3({ originalError, input, guardRef, receiptRef, legacyReceiptRef, groupRepository, db }) {
  try {
    const group = await groupRepository.getById(input.season.groupId);
    if (!group || group.ownerId !== input.userId) throw originalError;
    const receipt = hydrateOpeningReceipt(await receiptRef.get(), receiptRef.id);
    if (receipt) {
      if (!openingReceiptMatches(receipt, input, false)) throw new SeasonIdempotencyConflictError();
      const persisted = await input.seasonRepository.getById(receipt.seasonId);
      if (!persisted || persisted.groupId !== input.season.groupId) throw originalError;
      return { outcome: "EXISTING_IDEMPOTENT", seasonId: persisted.seasonId, season: persisted };
    }
    const legacyReceipt = hydrateOpeningReceipt(await legacyReceiptRef.get(), legacyReceiptRef.id);
    if (legacyReceipt) {
      if (!openingReceiptMatches(legacyReceipt, input, true)) throw new SeasonIdempotencyConflictError();
      const persisted = await input.seasonRepository.getById(legacyReceipt.seasonId);
      if (!persisted || persisted.groupId !== input.season.groupId) throw originalError;
      return { outcome: "EXISTING_IDEMPOTENT", seasonId: persisted.seasonId, season: persisted };
    }
    const guard = hydrateOpenSeasonGuard(await guardRef.get(), input.season.groupId);
    const open = await db.collection("seasons").where("groupId", "==", input.season.groupId).where("estado", "==", "abierta").limit(2).get();
    if (!guard || open.size !== 1) throw originalError;
    const persisted = input.seasonRepository.fromSnapshot(open.docs[0]);
    assertOpenSeasonCorrelated(persisted, guard, input.season.groupId);
    if (guard.guardVersion === 1 && guard.idempotencyKeyHash === input.legacyIdempotencyKeyHash) {
      if (guard.requestHash !== input.legacyRequestHash) throw new SeasonIdempotencyConflictError();
      return { outcome: "EXISTING_IDEMPOTENT", seasonId: persisted.seasonId, season: persisted };
    }
    throw new OpenSeasonAlreadyExistsError();
  } catch (error) {
    if (error instanceof SeasonIdempotencyConflictError || error instanceof OpenSeasonAlreadyExistsError) throw error;
    throw originalError;
  }
}

function createFirestoreOpenSeasonGuard({ db, groupRepository, now = () => Timestamp.now() }) {
  if (!db || !groupRepository || typeof now !== "function") throw new TypeError("Open season guard dependencies are required");
  return {
    async confirmOpenSeason(input) {
      const { userId, season, seasonRepository } = input;
      const guardRef = db.collection("openSeasonGuards").doc(season.groupId);
      const receiptRef = db.collection("seasonOpeningReceipts").doc(input.receiptId);
      const legacyReceiptRef = db.collection("seasonOpeningReceipts").doc(input.legacyReceiptId);
      try {
        return await db.runTransaction(async (transaction) => {
          let group;
          try { group = await groupRepository.getById(season.groupId, transaction); }
          catch (error) { if (error instanceof InvalidGroupStateError) throw new SeasonGroupIncompatibleError({ cause: error }); throw error; }
          if (!group) throw new SeasonGroupNotFoundError();
          if (group.ownerId !== userId) throw new SeasonNotAuthorizedError();

          const [receiptSnapshot, legacySnapshot] = await transaction.getAll(receiptRef, legacyReceiptRef);
          let receipt;
          try { receipt = hydrateOpeningReceipt(receiptSnapshot, receiptRef.id); } catch (error) { throw new SeasonIncompatibleStateError("Opening receipt is invalid", { cause: error }); }
          if (receipt) {
            if (!openingReceiptMatches(receipt, input, false)) throw new SeasonIdempotencyConflictError();
            const persisted = await seasonRepository.getById(receipt.seasonId, transaction);
            if (!persisted || persisted.groupId !== season.groupId) throw new SeasonIncompatibleStateError("Opening receipt Season is invalid");
            return { outcome: "EXISTING_IDEMPOTENT", seasonId: persisted.seasonId, season: persisted };
          }
          let legacyReceipt;
          try { legacyReceipt = hydrateOpeningReceipt(legacySnapshot, legacyReceiptRef.id); } catch (error) { throw new SeasonIncompatibleStateError("Legacy opening receipt is invalid", { cause: error }); }
          if (legacyReceipt) {
            if (!openingReceiptMatches(legacyReceipt, input, true)) throw new SeasonIdempotencyConflictError();
            const persisted = await seasonRepository.getById(legacyReceipt.seasonId, transaction);
            if (!persisted || persisted.groupId !== season.groupId) throw new SeasonIncompatibleStateError("Legacy opening receipt Season is invalid");
            return { outcome: "EXISTING_IDEMPOTENT", seasonId: persisted.seasonId, season: persisted };
          }

          const guard = hydrateOpenSeasonGuard(await transaction.get(guardRef), season.groupId);
          if (guard) {
            const persisted = await seasonRepository.getById(guard.seasonId, transaction);
            assertOpenSeasonCorrelated(persisted, guard, season.groupId);
            if (guard.guardVersion === 1 && guard.idempotencyKeyHash === input.legacyIdempotencyKeyHash) {
              if (guard.requestHash !== input.legacyRequestHash) throw new SeasonIdempotencyConflictError();
              return { outcome: "EXISTING_IDEMPOTENT", seasonId: persisted.seasonId, season: persisted };
            }
            throw new OpenSeasonAlreadyExistsError();
          }
          const open = await transaction.get(db.collection("seasons").where("groupId", "==", season.groupId).where("estado", "==", "abierta").limit(2));
          if (!open.empty) throw new SeasonIncompatibleStateError("Open Season exists without its guard");
          const openedAt = now(); const persisted = Object.freeze({ ...season, createdAt: openedAt });
          seasonRepository.createInitial(transaction, season, openedAt);
          transaction.create(guardRef, { seasonId: season.seasonId, openedAt, guardVersion: 2 });
          transaction.create(receiptRef, { action: "OPEN_SEASON", actorUserId: userId, groupId: season.groupId, seasonId: season.seasonId, idempotencyKeyHash: input.idempotencyKeyHash, requestHash: input.requestHash, outcome: "OPENED", openedAt, confirmedAt: openedAt, receiptVersion: 2 });
          return { outcome: "CREATED_OPEN", seasonId: season.seasonId, season: persisted };
        });
      } catch (error) {
        if (error instanceof SeasonError) throw error;
        if (isOpenSeasonTransactionBoundaryCode3(error)) return resolveConfirmedOpenSeasonAfterCode3({ originalError: error, input, guardRef, receiptRef, legacyReceiptRef, groupRepository, db });
        if (error instanceof InvalidGroupStateError) throw new SeasonGroupIncompatibleError({ cause: error });
        if (error instanceof InvalidSeasonStateError) throw new SeasonIncompatibleStateError(undefined, { cause: error });
        if (isUnavailable(error)) throw new SeasonDependencyUnavailableError({ cause: error });
        if (isTransactionConflict(error)) throw new SeasonConflictError({ cause: error });
        throw error;
      }
    },
  };
}

module.exports = { OPEN_SEASON_GUARD_FIELDS, OPEN_SEASON_GUARD_V1_FIELDS, assertOpenSeasonCorrelated, createFirestoreOpenSeasonGuard, hydrateOpenSeasonGuard, isOpenSeasonTransactionBoundaryCode3, resolveConfirmedOpenSeasonAfterCode3 };
