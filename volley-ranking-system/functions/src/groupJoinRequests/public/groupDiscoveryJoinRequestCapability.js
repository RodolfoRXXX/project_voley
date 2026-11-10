"use strict";

const { pendingGroupJoinRequestGuardId } = require("../application/groupJoinRequestHashing");
const { hydrateGroupJoinRequest } = require("../domain/groupJoinRequest");

const GUARD_FIELDS = Object.freeze(["requestId", "personId", "groupId", "createdAt", "guardVersion"]);
function exact(data, fields) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const actual = Object.keys(data).sort();
  const expected = [...fields].sort();
  return actual.length === expected.length && actual.every((field, index) => field === expected[index]);
}
function validId(value) {
  return typeof value === "string" && value && value.trim() === value && !value.includes("/") && Buffer.byteLength(value, "utf8") <= 1500;
}
function validTimestamp(value) {
  return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime());
}

function createGroupDiscoveryJoinRequestCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  return Object.freeze({
    async getOwnPendingContext({ unitOfWork, personId, groupId }) {
      const guardId = pendingGroupJoinRequestGuardId(groupId, personId);
      const guardSnapshot = await unitOfWork.get(db.collection("pendingGroupJoinRequestGuards").doc(guardId));
      if (!guardSnapshot.exists) return Object.freeze({ status: "absent" });
      const guard = guardSnapshot.data();
      if (!exact(guard, GUARD_FIELDS) || guardSnapshot.id !== guardId || guard.guardVersion !== 1
        || guard.personId !== personId || guard.groupId !== groupId || !validId(guard.requestId) || !validTimestamp(guard.createdAt)) {
        return Object.freeze({ status: "incompatible" });
      }
      const requestSnapshot = await unitOfWork.get(db.collection("groupJoinRequests").doc(guard.requestId));
      try {
        const request = requestSnapshot.exists ? hydrateGroupJoinRequest(requestSnapshot.id, requestSnapshot.data()) : null;
        if (!request || request.estado !== "pendiente" || request.personId !== personId || request.groupId !== groupId
          || request.createdAt.toDate().getTime() !== guard.createdAt.toDate().getTime()) return Object.freeze({ status: "incompatible" });
      } catch {
        return Object.freeze({ status: "incompatible" });
      }
      return Object.freeze({ status: "pending" });
    },
  });
}

module.exports = { createGroupDiscoveryJoinRequestCapability };
