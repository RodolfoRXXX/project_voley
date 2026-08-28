"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { hydrateMembership } = require("../domain/membership");

function createFirestoreMembershipRepository({ db }) {
  if (!db) throw new TypeError("db is required");

  function reference(membershipId) { return db.collection("memberships").doc(membershipId); }
  function fromSnapshot(snapshot) { return snapshot.exists ? hydrateMembership(snapshot.id, snapshot.data()) : null; }

  return {
    newId() { return db.collection("memberships").doc().id; },
    reference,
    fromSnapshot,
    async getById(membershipId, transaction) {
      const snapshot = transaction ? await transaction.get(reference(membershipId)) : await reference(membershipId).get();
      return fromSnapshot(snapshot);
    },
    activePairQuery({ personId, groupId }) {
      return db.collection("memberships")
        .where("personId", "==", personId)
        .where("groupId", "==", groupId)
        .where("estado", "==", "activa")
        .limit(2);
    },
    createInitial(transaction, membership) {
      transaction.create(reference(membership.membershipId), {
        personId: membership.personId,
        groupId: membership.groupId,
        seasonId: membership.seasonId,
        estado: membership.estado,
        fechaIngreso: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        schemaVersion: membership.schemaVersion,
      });
    },
  };
}

module.exports = { createFirestoreMembershipRepository };
