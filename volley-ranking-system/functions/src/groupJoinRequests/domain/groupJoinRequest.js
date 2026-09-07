"use strict";

const PENDING_FIELDS = Object.freeze(["personId", "groupId", "estado", "createdAt", "schemaVersion"]);
const CANCELLED_FIELDS = Object.freeze([...PENDING_FIELDS, "cancelledAt"]);

class InvalidGroupJoinRequestStateError extends Error {
  constructor(message) { super(message); this.name = "InvalidGroupJoinRequestStateError"; }
}

function requireId(value, label) {
  if (typeof value !== "string" || !value || value.trim() !== value || value.includes("/") || Buffer.byteLength(value, "utf8") > 1500) {
    throw new InvalidGroupJoinRequestStateError(`${label} is invalid`);
  }
  return value;
}

function requireTimestamp(value, label) {
  if (!value || typeof value.toDate !== "function" || Number.isNaN(value.toDate().getTime())) {
    throw new InvalidGroupJoinRequestStateError(`${label} is invalid`);
  }
  return value;
}

function exactKeys(data, expected) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new InvalidGroupJoinRequestStateError("Request document is required");
  const actual = Object.keys(data).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new InvalidGroupJoinRequestStateError("Request document has an invalid schema");
  }
}

function freezeRequest(data) {
  const request = { ...data };
  Object.defineProperty(request, "cancel", {
    enumerable: false,
    value(cancelledAt) {
      if (this.estado !== "pendiente") throw new InvalidGroupJoinRequestStateError("Request is not pending");
      const timestamp = requireTimestamp(cancelledAt, "Cancellation timestamp");
      if (timestamp.toDate().getTime() < this.createdAt.toDate().getTime()) {
        throw new InvalidGroupJoinRequestStateError("Cancellation precedes creation");
      }
      return freezeRequest({ ...this, estado: "cancelada", cancelledAt: timestamp });
    },
  });
  return Object.freeze(request);
}

function buildGroupJoinRequest({ requestId, personId, groupId, createdAt }) {
  return freezeRequest({
    requestId: requireId(requestId, "Request id"),
    personId: requireId(personId, "Person id"),
    groupId: requireId(groupId, "Group id"),
    estado: "pendiente",
    createdAt: requireTimestamp(createdAt, "Creation timestamp"),
    schemaVersion: 1,
  });
}

function hydrateGroupJoinRequest(requestId, data) {
  requireId(requestId, "Request id");
  const pending = data?.estado === "pendiente";
  const cancelled = data?.estado === "cancelada";
  if ((!pending && !cancelled) || data?.schemaVersion !== 1) throw new InvalidGroupJoinRequestStateError("Request state is incompatible");
  exactKeys(data, pending ? PENDING_FIELDS : CANCELLED_FIELDS);
  requireId(data.personId, "Person id");
  requireId(data.groupId, "Group id");
  const createdAt = requireTimestamp(data.createdAt, "Creation timestamp");
  if (cancelled && requireTimestamp(data.cancelledAt, "Cancellation timestamp").toDate().getTime() < createdAt.toDate().getTime()) {
    throw new InvalidGroupJoinRequestStateError("Cancellation precedes creation");
  }
  return freezeRequest({ requestId, ...data });
}

module.exports = { CANCELLED_FIELDS, PENDING_FIELDS, InvalidGroupJoinRequestStateError, buildGroupJoinRequest, hydrateGroupJoinRequest };
