"use strict";

const MEMBERSHIP_SCHEMA_VERSION = 1;
const MEMBERSHIP_ACTIVE_STATE = "activa";
const MEMBERSHIP_FIELDS = Object.freeze([
  "personId",
  "groupId",
  "seasonId",
  "estado",
  "fechaIngreso",
  "createdAt",
  "schemaVersion",
]);

class InvalidMembershipStateError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidMembershipStateError";
  }
}

function requireId(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.includes("/")) {
    throw new InvalidMembershipStateError(`${label} is invalid`);
  }
  return value;
}

function assertExactDocument(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new InvalidMembershipStateError("Membership document is required");
  }
  const keys = Object.keys(data).sort();
  const expected = [...MEMBERSHIP_FIELDS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new InvalidMembershipStateError("Membership document has an invalid schema");
  }
}

function requireTimestamp(value, label) {
  if (!value || typeof value.toDate !== "function" || Number.isNaN(value.toDate().getTime())) {
    throw new InvalidMembershipStateError(`${label} is invalid`);
  }
  return value;
}

function buildMembership({ membershipId, personId, groupId, seasonId }) {
  return Object.freeze({
    membershipId: requireId(membershipId, "Membership id"),
    personId: requireId(personId, "Person id"),
    groupId: requireId(groupId, "Group id"),
    seasonId: requireId(seasonId, "Season id"),
    estado: MEMBERSHIP_ACTIVE_STATE,
    schemaVersion: MEMBERSHIP_SCHEMA_VERSION,
  });
}

function hydrateMembership(membershipId, data) {
  requireId(membershipId, "Membership id");
  assertExactDocument(data);
  requireId(data.personId, "Person id");
  requireId(data.groupId, "Group id");
  requireId(data.seasonId, "Season id");
  if (data.estado !== MEMBERSHIP_ACTIVE_STATE) throw new InvalidMembershipStateError("Membership state is invalid");
  if (data.schemaVersion !== MEMBERSHIP_SCHEMA_VERSION) throw new InvalidMembershipStateError("Membership schema version is invalid");
  requireTimestamp(data.fechaIngreso, "Membership admission timestamp");
  requireTimestamp(data.createdAt, "Membership creation timestamp");
  return Object.freeze({ membershipId, ...data });
}

module.exports = {
  InvalidMembershipStateError,
  MEMBERSHIP_ACTIVE_STATE,
  MEMBERSHIP_FIELDS,
  MEMBERSHIP_SCHEMA_VERSION,
  buildMembership,
  hydrateMembership,
};
