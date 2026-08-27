"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { hydrateSeason } = require("../domain/season");

function createFirestoreSeasonRepository({ db }) {
  if (!db) throw new TypeError("db is required");

  function reference(seasonId) { return db.collection("seasons").doc(seasonId); }
  function fromSnapshot(snapshot) { return snapshot.exists ? hydrateSeason(snapshot.id, snapshot.data()) : null; }

  return {
    newId() { return db.collection("seasons").doc().id; },
    reference,
    fromSnapshot,
    async getById(seasonId, transaction) {
      const ref = reference(seasonId);
      const snapshot = transaction ? await transaction.get(ref) : await ref.get();
      return fromSnapshot(snapshot);
    },
    createInitial(transaction, season) {
      transaction.create(reference(season.seasonId), {
        groupId: season.groupId,
        nombre: season.nombre,
        fechaInicio: season.fechaInicio,
        estado: season.estado,
        createdAt: FieldValue.serverTimestamp(),
        schemaVersion: season.schemaVersion,
      });
    },
  };
}

module.exports = { createFirestoreSeasonRepository };
