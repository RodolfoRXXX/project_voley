"use strict";
const { hydrateGroupJoinRequest } = require("../domain/groupJoinRequest");

function createFirestoreGroupJoinRequestRepository({ db }) {
  if (!db) throw new TypeError("db is required");
  const reference = (requestId) => db.collection("groupJoinRequests").doc(requestId);
  const fromSnapshot = (snapshot) => snapshot.exists ? hydrateGroupJoinRequest(snapshot.id, snapshot.data()) : null;
  return {
    newId() { return db.collection("groupJoinRequests").doc().id; },
    reference,
    fromSnapshot,
    pendingPairQuery({ personId, groupId }) { return db.collection("groupJoinRequests").where("personId", "==", personId).where("groupId", "==", groupId).where("estado", "==", "pendiente").limit(2); },
    pendingGroupQuery({ groupId, pageSize, cursor, FieldPath, Timestamp }) {
      let query = db.collection("groupJoinRequests").where("groupId", "==", groupId).where("estado", "==", "pendiente").orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc");
      if (cursor) query = query.startAfter(new Timestamp(cursor.seconds, cursor.nanoseconds), cursor.lastRequestId);
      return query.limit(pageSize + 1);
    },
    createInitial(transaction, request) {
      transaction.create(reference(request.requestId), { personId: request.personId, groupId: request.groupId, estado: request.estado, createdAt: request.createdAt, schemaVersion: 1 });
    },
    updateCancelled(transaction, request) { transaction.update(reference(request.requestId), { estado: "cancelada", cancelledAt: request.cancelledAt }); },
    updateRejected(transaction, request) { transaction.set(reference(request.requestId), { personId: request.personId, groupId: request.groupId, estado: request.estado, createdAt: request.createdAt, decisionIntentId: request.decisionIntentId, decidedBy: request.decidedBy, decidedAt: request.decidedAt, schemaVersion: 2 }); },
    updateApproved(transaction, request) { transaction.set(reference(request.requestId), { personId: request.personId, groupId: request.groupId, estado: request.estado, createdAt: request.createdAt, decisionIntentId: request.decisionIntentId, decidedBy: request.decidedBy, decidedAt: request.decidedAt, membershipId: request.membershipId, seasonId: request.seasonId, approvalEffect: request.approvalEffect, membershipActivationOrdinal: request.membershipActivationOrdinal, schemaVersion: 3 }); },
  };
}
module.exports = { createFirestoreGroupJoinRequestRepository };
