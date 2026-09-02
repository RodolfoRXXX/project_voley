"use strict";

const MEMBERSHIP_ACTIVE_SCHEMA_VERSION = 1;
const MEMBERSHIP_FINALIZED_SCHEMA_VERSION = 2;
const MEMBERSHIP_ACTIVE_STATE = "activa";
const MEMBERSHIP_FINALIZED_STATE = "finalizada";
const ACTIVE_MEMBERSHIP_FIELDS = Object.freeze([
  "personId",
  "groupId",
  "seasonId",
  "estado",
  "fechaIngreso",
  "createdAt",
  "schemaVersion",
]);
const FINALIZED_MEMBERSHIP_FIELDS = Object.freeze([
  "personId", "groupId", "seasonId", "estado", "fechaIngreso", "fechaEgreso", "createdAt", "schemaVersion",
]);
const MEMBERSHIP_FIELDS = ACTIVE_MEMBERSHIP_FIELDS;

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

function assertExactDocument(data, expectedFields) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new InvalidMembershipStateError("Membership document is required");
  }
  const keys = Object.keys(data).sort();
  const expected = [...expectedFields].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new InvalidMembershipStateError("Membership document has an invalid schema");
  }
}

function timestampMillis(value, label) {
  return requireTimestamp(value, label).toDate().getTime();
}

function freezeMembership(data) {
  const membership = { ...data };
  Object.defineProperty(membership, "finalize", {
    enumerable: false,
    value(finalizedAt) {
      if (this.estado !== MEMBERSHIP_ACTIVE_STATE || this.schemaVersion !== MEMBERSHIP_ACTIVE_SCHEMA_VERSION) {
        throw new InvalidMembershipStateError("Membership cannot be finalized from its current state");
      }
      if (timestampMillis(finalizedAt, "Membership exit timestamp") < timestampMillis(this.fechaIngreso, "Membership admission timestamp")) {
        throw new InvalidMembershipStateError("Membership exit timestamp precedes admission");
      }
      return freezeMembership({
        membershipId: this.membershipId,
        personId: this.personId,
        groupId: this.groupId,
        seasonId: this.seasonId,
        estado: MEMBERSHIP_FINALIZED_STATE,
        fechaIngreso: this.fechaIngreso,
        fechaEgreso: finalizedAt,
        createdAt: this.createdAt,
        schemaVersion: MEMBERSHIP_FINALIZED_SCHEMA_VERSION,
      });
    },
  });
  return Object.freeze(membership);
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
    schemaVersion: MEMBERSHIP_ACTIVE_SCHEMA_VERSION,
  });
}

function hydrateMembership(membershipId, data) {
  requireId(membershipId, "Membership id");
  const active = data?.estado === MEMBERSHIP_ACTIVE_STATE && data?.schemaVersion === MEMBERSHIP_ACTIVE_SCHEMA_VERSION;
  const finalized = data?.estado === MEMBERSHIP_FINALIZED_STATE && data?.schemaVersion === MEMBERSHIP_FINALIZED_SCHEMA_VERSION;
  if (!active && !finalized) throw new InvalidMembershipStateError("Membership state and schema version are incompatible");
  assertExactDocument(data, active ? ACTIVE_MEMBERSHIP_FIELDS : FINALIZED_MEMBERSHIP_FIELDS);
  requireId(data.personId, "Person id");
  requireId(data.groupId, "Group id");
  requireId(data.seasonId, "Season id");
  timestampMillis(data.fechaIngreso, "Membership admission timestamp");
  timestampMillis(data.createdAt, "Membership creation timestamp");
  if (finalized && timestampMillis(data.fechaEgreso, "Membership exit timestamp") < timestampMillis(data.fechaIngreso, "Membership admission timestamp")) {
    throw new InvalidMembershipStateError("Membership exit timestamp precedes admission");
  }
  return freezeMembership({ membershipId, ...data });
}

module.exports = {
  ACTIVE_MEMBERSHIP_FIELDS,
  FINALIZED_MEMBERSHIP_FIELDS,
  InvalidMembershipStateError,
  MEMBERSHIP_ACTIVE_STATE,
  MEMBERSHIP_FIELDS,
  MEMBERSHIP_ACTIVE_SCHEMA_VERSION,
  MEMBERSHIP_FINALIZED_STATE,
  MEMBERSHIP_FINALIZED_SCHEMA_VERSION,
  MEMBERSHIP_SCHEMA_VERSION: MEMBERSHIP_ACTIVE_SCHEMA_VERSION,
  buildMembership,
  hydrateMembership,
};
