"use strict";

const PENDING_FIELDS = Object.freeze(["personId", "groupId", "estado", "createdAt", "schemaVersion"]);
const CANCELLED_FIELDS = Object.freeze([...PENDING_FIELDS, "cancelledAt"]);
const REJECTED_FIELDS = Object.freeze(["personId", "groupId", "estado", "createdAt", "decisionIntentId", "decidedBy", "decidedAt", "schemaVersion"]);
const APPROVED_FIELDS = Object.freeze([...REJECTED_FIELDS, "membershipId"]);
const APPROVED_V3_FIELDS = Object.freeze(["personId", "groupId", "estado", "createdAt", "decisionIntentId", "decidedBy", "decidedAt", "membershipId", "seasonId", "approvalEffect", "membershipActivationOrdinal", "schemaVersion"]);

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
  Object.defineProperty(request, "reject", {
    enumerable: false,
    value({ decisionIntentId, decidedBy, decidedAt }) {
      if (this.estado !== "pendiente") throw new InvalidGroupJoinRequestStateError("Request is not pending");
      const timestamp = requireTimestamp(decidedAt, "Decision timestamp");
      if (timestamp.toDate().getTime() < this.createdAt.toDate().getTime()) throw new InvalidGroupJoinRequestStateError("Decision precedes creation");
      return freezeRequest({
        requestId: this.requestId, personId: this.personId, groupId: this.groupId,
        estado: "rechazada", createdAt: this.createdAt,
        decisionIntentId: requireId(decisionIntentId, "Decision intent id"),
        decidedBy: requireId(decidedBy, "Decision actor"), decidedAt: timestamp, schemaVersion: 2,
      });
    },
  });
  Object.defineProperty(request, "approveAfterMembership", {
    enumerable: false,
    value({ decisionIntentId, decidedBy, decidedAt, membershipId, seasonId, approvalEffect, membershipActivationOrdinal }) {
      if (this.estado !== "pendiente") throw new InvalidGroupJoinRequestStateError("Request is not pending");
      const timestamp = requireTimestamp(decidedAt, "Decision timestamp");
      if (timestamp.toDate().getTime() < this.createdAt.toDate().getTime()) throw new InvalidGroupJoinRequestStateError("Decision precedes creation");
      return freezeRequest({
        requestId: this.requestId, personId: this.personId, groupId: this.groupId,
        estado: "aprobada", createdAt: this.createdAt,
        decisionIntentId: requireId(decisionIntentId, "Decision intent id"),
        decidedBy: requireId(decidedBy, "Decision actor"), decidedAt: timestamp,
        membershipId: requireId(membershipId, "Membership id"),
        seasonId: requireId(seasonId, "Season id"),
        approvalEffect: ["CREATE_MEMBERSHIP", "REACTIVATE_MEMBERSHIP"].includes(approvalEffect) ? approvalEffect : (() => { throw new InvalidGroupJoinRequestStateError("Approval effect is invalid"); })(),
        membershipActivationOrdinal: Number.isSafeInteger(membershipActivationOrdinal) && membershipActivationOrdinal > 0 ? membershipActivationOrdinal : (() => { throw new InvalidGroupJoinRequestStateError("Membership activation ordinal is invalid"); })(),
        schemaVersion: 3,
      });
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
  const pending = data?.estado === "pendiente" && data?.schemaVersion === 1;
  const cancelled = data?.estado === "cancelada" && data?.schemaVersion === 1;
  const rejected = data?.estado === "rechazada" && data?.schemaVersion === 2;
  const approved = data?.estado === "aprobada" && data?.schemaVersion === 2;
  const approvedV3 = data?.estado === "aprobada" && data?.schemaVersion === 3;
  if (!pending && !cancelled && !rejected && !approved && !approvedV3) throw new InvalidGroupJoinRequestStateError("Request state is incompatible");
  exactKeys(data, pending ? PENDING_FIELDS : cancelled ? CANCELLED_FIELDS : rejected ? REJECTED_FIELDS : approved ? APPROVED_FIELDS : APPROVED_V3_FIELDS);
  requireId(data.personId, "Person id");
  requireId(data.groupId, "Group id");
  const createdAt = requireTimestamp(data.createdAt, "Creation timestamp");
  if (cancelled && requireTimestamp(data.cancelledAt, "Cancellation timestamp").toDate().getTime() < createdAt.toDate().getTime()) {
    throw new InvalidGroupJoinRequestStateError("Cancellation precedes creation");
  }
  if (rejected || approved || approvedV3) {
    requireId(data.decisionIntentId, "Decision intent id");
    requireId(data.decidedBy, "Decision actor");
    if (requireTimestamp(data.decidedAt, "Decision timestamp").toDate().getTime() < createdAt.toDate().getTime()) {
      throw new InvalidGroupJoinRequestStateError("Decision precedes creation");
    }
  }
  if (approved || approvedV3) requireId(data.membershipId, "Membership id");
  if (approvedV3) {
    requireId(data.seasonId, "Season id");
    if (!["CREATE_MEMBERSHIP", "REACTIVATE_MEMBERSHIP"].includes(data.approvalEffect)) throw new InvalidGroupJoinRequestStateError("Approval effect is invalid");
    if (!Number.isSafeInteger(data.membershipActivationOrdinal) || data.membershipActivationOrdinal < 1 || (data.approvalEffect === "CREATE_MEMBERSHIP" && data.membershipActivationOrdinal !== 1)) throw new InvalidGroupJoinRequestStateError("Membership activation ordinal is invalid");
  }
  return freezeRequest({ requestId, ...data });
}

module.exports = { APPROVED_FIELDS, APPROVED_V3_FIELDS, CANCELLED_FIELDS, PENDING_FIELDS, REJECTED_FIELDS, InvalidGroupJoinRequestStateError, buildGroupJoinRequest, hydrateGroupJoinRequest };
