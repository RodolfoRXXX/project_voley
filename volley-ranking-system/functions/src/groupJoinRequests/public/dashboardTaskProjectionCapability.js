"use strict";

const { FieldPath } = require("firebase-admin/firestore");
const { hydrateGroupJoinRequest } = require("../domain/groupJoinRequest");
const { hydrateCoordination } = require("../infrastructure/firestoreGroupJoinRequestStore");

function createGroupJoinRequestDashboardTaskProjectionCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  function project(requests, coordinationSnapshots) {
    const blocked = new Set(coordinationSnapshots.filter((entry) => entry.exists).map((entry) => hydrateCoordination(entry).requestId));
    return requests.filter((request) => !blocked.has(request.requestId)).map((request) => Object.freeze({
      requestId: request.requestId, groupId: request.groupId, createdAt: request.createdAt,
      sourceRevision: request.schemaVersion || 1,
    }));
  }
  async function readSnapshots(unitOfWork, snapshots, groupId) {
    const requests = snapshots.filter((snapshot) => snapshot.exists).map((doc) => hydrateGroupJoinRequest(doc.id, doc.data()))
      .filter((request) => request.groupId === groupId && request.estado === "pendiente");
    const refs = requests.map((request) => db.collection("groupJoinRequestApprovalCoordinations").doc(request.requestId));
    const coordinationSnapshots = refs.length ? await unitOfWork.getAll(...refs) : [];
    return project(requests, coordinationSnapshots);
  }
  return Object.freeze({
    async readForGroup({ unitOfWork, groupId }) {
      const snapshot = await unitOfWork.get(db.collection("groupJoinRequests").where("groupId", "==", groupId).where("estado", "==", "pendiente"));
      const requests = snapshot.docs.map((doc) => hydrateGroupJoinRequest(doc.id, doc.data()));
      if (requests.some((request) => request.groupId !== groupId || request.estado !== "pendiente")) throw new Error("INCOMPATIBLE_GROUP_JOIN_REQUEST_PROJECTION_SOURCE");
      const refs = requests.map((request) => db.collection("groupJoinRequestApprovalCoordinations").doc(request.requestId));
      const coordinationSnapshots = refs.length ? await unitOfWork.getAll(...refs) : [];
      return project(requests, coordinationSnapshots);
    },
    async readByIds({ unitOfWork, groupId, resourceIds }) {
      const refs = resourceIds.map((id) => db.collection("groupJoinRequests").doc(id));
      return readSnapshots(unitOfWork, refs.length ? await unitOfWork.getAll(...refs) : [], groupId);
    },
    async readPage({ unitOfWork, groupId, afterId, limit }) {
      let query = db.collection("groupJoinRequests").where("groupId", "==", groupId).where("estado", "==", "pendiente").orderBy(FieldPath.documentId()).limit(limit);
      if (afterId) query = query.startAfter(afterId);
      const snapshot = await unitOfWork.get(query);
      return { items: await readSnapshots(unitOfWork, snapshot.docs, groupId), taskIds: snapshot.docs.map((doc) => doc.id),
        cursor: snapshot.docs.at(-1)?.id || null, exhausted: snapshot.size < limit };
    },
  });
}

module.exports = { createGroupJoinRequestDashboardTaskProjectionCapability };
