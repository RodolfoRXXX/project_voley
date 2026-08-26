"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { hydrateGroup } = require("../domain/group");

function createFirestoreGroupRepository({ db }) {
  if (!db) throw new TypeError("db is required");

  function reference(groupId) { return db.collection("groups").doc(groupId); }
  function fromSnapshot(snapshot) { return snapshot.exists ? hydrateGroup(snapshot.id, snapshot.data()) : null; }

  return {
    newId() { return db.collection("groups").doc().id; },
    reference,
    fromSnapshot,
    async getById(groupId, transaction) {
      const ref = reference(groupId);
      const snapshot = transaction ? await transaction.get(ref) : await ref.get();
      return fromSnapshot(snapshot);
    },
    createInitial(transaction, group) {
      transaction.create(reference(group.groupId), {
        nombre: group.nombre,
        deporte: group.deporte,
        ownerId: group.ownerId,
        estado: group.estado,
        createdAt: FieldValue.serverTimestamp(),
        schemaVersion: group.schemaVersion,
      });
    },
  };
}

module.exports = { createFirestoreGroupRepository };
