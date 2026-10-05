"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { InvalidGroupStateError, renameGroup } = require("../domain/group");
const { toGroupDto } = require("../application/groupDto");
const { groupEditToken } = require("../application/groupHashing");
const {
  GroupAccountRequiredError, GroupConflictError, GroupDependencyUnavailableError, GroupError,
  GroupIdempotencyConflictError, GroupIncompatibleError, GroupInternalError, GroupNotAccessibleError,
  GroupStaleUpdateError,
} = require("../application/groupErrors");
const { isTransactionConflict, isUnavailable } = require("./firestoreGroupCreationGuard");
const { hydrateGroupNameUpdateReceipt } = require("./groupNameUpdateReceipts");
const { hydrateGroupDeletionReceipt } = require("./groupDeletionReceipts");

function compatibleAccount(snapshot, userId) {
  if (!snapshot.exists || snapshot.id !== userId) return false;
  const data = snapshot.data();
  return data && typeof data.nombre === "string" && typeof data.email === "string" && data.email.trim()
    && typeof data.photoURL === "string" && data.createdAt && typeof data.createdAt.toDate === "function";
}

function createFirestoreGroupNameUpdateStore({ db, groupRepository, now = () => Timestamp.now() }) {
  if (!db || !groupRepository || typeof now !== "function") throw new TypeError("Group name update dependencies are required");
  return Object.freeze({
    async update(command) {
      const receiptRef = db.collection("groupNameUpdateReceipts").doc(command.receiptId);
      try {
        return await db.runTransaction(async (transaction) => {
          const accountSnapshot = await transaction.get(db.collection("users").doc(command.userId));
          if (!compatibleAccount(accountSnapshot, command.userId)) throw new GroupAccountRequiredError();

          let receipt;
          try { receipt = hydrateGroupNameUpdateReceipt(await transaction.get(receiptRef), receiptRef.id); }
          catch (error) { throw new GroupIncompatibleError({ cause: error }); }
          if (receipt && (receipt.actorUserId !== command.userId || receipt.groupId !== command.groupId
            || receipt.requestHash !== command.requestHash)) throw new GroupIdempotencyConflictError();

          const groupSnapshot = await transaction.get(groupRepository.reference(command.groupId));
          if (!groupSnapshot.exists) {
            if (!receipt) throw new GroupNotAccessibleError();
            const deletionSnapshot = await transaction.get(db.collection("groupDeletionReceipts")
              .where("actorUserId", "==", command.userId).where("groupId", "==", command.groupId).limit(2));
            if (deletionSnapshot.size !== 1) throw new GroupIncompatibleError();
            let deletion;
            try { deletion = hydrateGroupDeletionReceipt(deletionSnapshot.docs[0], deletionSnapshot.docs[0].id); }
            catch (error) { throw new GroupIncompatibleError({ cause: error }); }
            if (deletion.actorUserId !== command.userId || deletion.groupId !== command.groupId
              || deletion.deletedAt.toDate().getTime() < receipt.confirmedAt.toDate().getTime()) throw new GroupIncompatibleError();
            return Object.freeze({
              outcome: "UPDATED_THEN_DELETED", recovered: true,
              appliedEffect: Object.freeze({ outcome: "UPDATED", confirmedAt: receipt.confirmedAt.toDate().toISOString() }),
              subsequentEffect: Object.freeze({ outcome: "DELETED", deletedAt: deletion.deletedAt.toDate().toISOString() }),
              currentGroup: null, currentEditToken: null,
            });
          }
          if (groupSnapshot.data()?.ownerId !== command.userId) throw new GroupNotAccessibleError();
          let group;
          try { group = groupRepository.fromSnapshot(groupSnapshot); }
          catch (error) {
            if (error instanceof InvalidGroupStateError) throw new GroupIncompatibleError({ cause: error });
            throw error;
          }

          if (receipt) {
            const applied = Object.freeze({ ...group, nombre: receipt.appliedName });
            return Object.freeze({
              outcome: "UPDATED", recovered: true,
              appliedEffect: Object.freeze({ outcome: "UPDATED", nombre: receipt.appliedName,
                editToken: groupEditToken(applied), confirmedAt: receipt.confirmedAt.toDate().toISOString() }),
              currentGroup: toGroupDto(group), currentEditToken: group.estado === "activo" ? groupEditToken(group) : null,
            });
          }

          if (group.estado !== "activo") throw new GroupIncompatibleError();

          const currentEditToken = groupEditToken(group);
          if (currentEditToken !== command.expectedEditToken) throw new GroupStaleUpdateError();
          if (group.nombre === command.nombre) return Object.freeze({
            outcome: "NO_CHANGES", recovered: false, appliedEffect: null,
            currentGroup: toGroupDto(group), currentEditToken,
          });

          const updated = renameGroup(group, command.nombre);
          const resultEditToken = groupEditToken(updated); const confirmedAt = now();
          groupRepository.updateName(transaction, command.groupId, command.nombre);
          transaction.create(receiptRef, {
            action: "UPDATE_GROUP_NAME", actorUserId: command.userId, groupId: command.groupId,
            requestHash: command.requestHash, appliedName: command.nombre, outcome: "UPDATED",
            confirmedAt, receiptVersion: 1,
          });
          return Object.freeze({
            outcome: "UPDATED", recovered: false,
            appliedEffect: Object.freeze({ outcome: "UPDATED", nombre: command.nombre,
              editToken: resultEditToken, confirmedAt: confirmedAt.toDate().toISOString() }),
            currentGroup: toGroupDto(updated), currentEditToken: resultEditToken,
          });
        });
      } catch (error) {
        if (error instanceof GroupError) throw error;
        if (isUnavailable(error)) throw new GroupDependencyUnavailableError(undefined, { cause: error });
        if (isTransactionConflict(error)) throw new GroupConflictError("Group name update conflicted", { cause: error });
        throw new GroupInternalError({ cause: error });
      }
    },
  });
}

module.exports = { compatibleAccount, createFirestoreGroupNameUpdateStore };
