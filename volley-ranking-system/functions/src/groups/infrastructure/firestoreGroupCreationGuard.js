"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { InvalidGroupStateError } = require("../domain/group");
const {
  GroupConflictError,
  GroupDependencyUnavailableError,
  GroupError,
  GroupLimitReachedError,
} = require("../application/groupErrors");

const GUARD_FIELDS = Object.freeze(["groupId", "idempotencyKeyHash", "requestHash", "createdAt", "guardVersion"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function hydrateGuard(snapshot, userId) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new GroupDependencyUnavailableError("Creation guard is invalid");
  const keys = Object.keys(data).sort();
  const expected = [...GUARD_FIELDS].sort();
  const valid = keys.length === expected.length
    && !keys.some((key, index) => key !== expected[index])
    && typeof data.groupId === "string" && data.groupId.trim() === data.groupId && data.groupId.length > 0
    && HASH_PATTERN.test(data.idempotencyKeyHash)
    && HASH_PATTERN.test(data.requestHash)
    && data.guardVersion === 1
    && data.createdAt && typeof data.createdAt.toDate === "function"
    && !Number.isNaN(data.createdAt.toDate().getTime());
  if (!valid || snapshot.id !== userId) throw new GroupDependencyUnavailableError("Creation guard is invalid");
  return data;
}

function isTransactionConflict(error) {
  return [10, "10", "aborted", "ABORTED"].includes(error?.code);
}

function isUnavailable(error) {
  return [4, 14, "4", "14", "deadline-exceeded", "unavailable", "DEADLINE_EXCEEDED", "UNAVAILABLE"].includes(error?.code);
}

function createFirestoreGroupCreationGuard({ db, ownGroupsReader }) {
  if (!db || !ownGroupsReader) throw new TypeError("creation guard dependencies are required");

  return {
    async confirmFirstGroup({ userId, group, idempotencyKeyHash, requestHash, groupRepository }) {
      const guardRef = db.collection("groupCreationGuards").doc(userId);
      try {
        return await db.runTransaction(async (transaction) => {
          const guard = hydrateGuard(await transaction.get(guardRef), userId);
          if (guard) {
            let persisted;
            try {
              persisted = await groupRepository.getById(guard.groupId, transaction);
            } catch (error) {
              if (error instanceof InvalidGroupStateError) {
                throw new GroupDependencyUnavailableError("Creation guard references an invalid group", { cause: error });
              }
              throw error;
            }
            if (!persisted || persisted.ownerId !== userId) {
              throw new GroupDependencyUnavailableError("Creation guard references a missing or foreign group");
            }
            if (guard.idempotencyKeyHash === idempotencyKeyHash) {
              if (guard.requestHash !== requestHash) throw new GroupConflictError("Idempotency key was used with another request");
              return { outcome: "existing", groupId: persisted.groupId, group: persisted };
            }
            throw new GroupLimitReachedError();
          }

          try {
            const hasExistingGroup = await ownGroupsReader.hasAnyByOwner(userId, transaction);
            if (hasExistingGroup) throw new GroupLimitReachedError();
          } catch (error) {
            if (error instanceof InvalidGroupStateError) {
              throw new GroupDependencyUnavailableError("Existing group state is invalid", { cause: error });
            }
            throw error;
          }
          groupRepository.createInitial(transaction, group);
          transaction.create(guardRef, {
            groupId: group.groupId,
            idempotencyKeyHash,
            requestHash,
            createdAt: FieldValue.serverTimestamp(),
            guardVersion: 1,
          });
          return { outcome: "created", groupId: group.groupId };
        });
      } catch (error) {
        if (error instanceof GroupError) throw error;
        if (error instanceof InvalidGroupStateError || isUnavailable(error)) {
          throw new GroupDependencyUnavailableError(undefined, { cause: error });
        }
        if (isTransactionConflict(error)) throw new GroupConflictError(undefined, { cause: error });
        throw error;
      }
    },
  };
}

module.exports = { GUARD_FIELDS, createFirestoreGroupCreationGuard, hydrateGuard, isTransactionConflict, isUnavailable };
