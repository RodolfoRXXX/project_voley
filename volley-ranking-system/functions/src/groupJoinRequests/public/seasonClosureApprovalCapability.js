"use strict";

const { createFirestoreGroupJoinRequestRepository } = require("../infrastructure/firestoreGroupJoinRequestRepository");
const { hydrateCoordination, hydrateDecisionIntent } = require("../infrastructure/firestoreGroupJoinRequestStore");

function createSeasonClosureApprovalCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const repository = createFirestoreGroupJoinRequestRepository({ db });
  return Object.freeze({
    async findBlocking({ unitOfWork, groupId }) {
      const snapshot = await unitOfWork.get(db.collection("groupJoinRequestApprovalCoordinations").where("groupId", "==", groupId).limit(1));
      if (snapshot.empty) return Object.freeze({ status: "absent" });
      try {
        const coordination = hydrateCoordination(snapshot.docs[0]);
        const requestSnapshot = await unitOfWork.get(repository.reference(coordination.requestId));
        const request = requestSnapshot.exists ? repository.fromSnapshot(requestSnapshot) : null;
        const intentSnapshot = await unitOfWork.get(db.collection("groupJoinRequestDecisionIntents").doc(coordination.decisionIntentId));
        const intent = hydrateDecisionIntent(intentSnapshot);
        const valid = request && request.estado === "pendiente" && request.groupId === groupId && request.personId === coordination.personId
          && intent && intent.intentVersion === 2 && intent.intentStatus === "pending" && intent.action === "approve"
          && intent.requestId === request.requestId && intent.requestedBy === coordination.requestedBy;
        return Object.freeze({ status: valid ? "blocking" : "incompatible" });
      } catch { return Object.freeze({ status: "incompatible" }); }
    },
  });
}

module.exports = { createSeasonClosureApprovalCapability };
