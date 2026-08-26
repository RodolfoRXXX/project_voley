"use strict";

function createFirestoreOwnGroupsReader({ db, groupRepository }) {
  if (!db || !groupRepository) throw new TypeError("reader dependencies are required");
  return {
    async hasAnyByOwner(userId, transaction) {
      const query = db.collection("groups").where("ownerId", "==", userId).limit(1);
      const snapshot = transaction ? await transaction.get(query) : await query.get();
      return !snapshot.empty;
    },
    async listByOwner(userId, transaction) {
      const query = db.collection("groups").where("ownerId", "==", userId);
      const snapshot = transaction ? await transaction.get(query) : await query.get();
      return snapshot.docs.map(groupRepository.fromSnapshot);
    },
  };
}

module.exports = { createFirestoreOwnGroupsReader };
