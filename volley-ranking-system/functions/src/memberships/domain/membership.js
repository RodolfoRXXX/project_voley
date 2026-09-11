"use strict";

const { InvalidMembershipValidityPeriodError, closeMembershipValidityPeriod, openMembershipValidityPeriod, validTimestamp } = require("./membershipValidityPeriod");

const MEMBERSHIP_ACTIVE_SCHEMA_VERSION = 1;
const MEMBERSHIP_FINALIZED_SCHEMA_VERSION = 2;
const MEMBERSHIP_SCHEMA_VERSION = 3;
const MEMBERSHIP_ACTIVE_STATE = "activa";
const MEMBERSHIP_FINALIZED_STATE = "finalizada";
const ACTIVE_MEMBERSHIP_FIELDS = Object.freeze(["personId", "groupId", "seasonId", "estado", "fechaIngreso", "createdAt", "schemaVersion"]);
const FINALIZED_MEMBERSHIP_FIELDS = Object.freeze(["personId", "groupId", "seasonId", "estado", "fechaIngreso", "fechaEgreso", "createdAt", "schemaVersion"]);
const ACTIVE_MEMBERSHIP_V3_FIELDS = Object.freeze(["personId", "groupId", "seasonId", "estado", "fechaIngreso", "createdAt", "latestPeriodId", "periodCount", "schemaVersion"]);
const FINALIZED_MEMBERSHIP_V3_FIELDS = Object.freeze([...ACTIVE_MEMBERSHIP_V3_FIELDS, "fechaEgreso"]);
const MEMBERSHIP_FIELDS = ACTIVE_MEMBERSHIP_FIELDS;

class InvalidMembershipStateError extends Error {
  constructor(message) { super(message); this.name = "InvalidMembershipStateError"; }
}

function requireId(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.includes("/")) throw new InvalidMembershipStateError(`${label} is invalid`);
  return value;
}
function requireTimestamp(value, label) {
  if (!validTimestamp(value)) throw new InvalidMembershipStateError(`${label} is invalid`);
  return value;
}
function timestampMillis(value, label) { return requireTimestamp(value, label).toDate().getTime(); }
function sameTimestamp(left, right) { return validTimestamp(left) && validTimestamp(right) && left.toDate().getTime() === right.toDate().getTime(); }
function assertExactDocument(data, expectedFields) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new InvalidMembershipStateError("Membership document is required");
  const keys = Object.keys(data).sort(); const expected = [...expectedFields].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) throw new InvalidMembershipStateError("Membership document has an invalid schema");
}
function freezeMembership(data) { return Object.freeze({ ...data }); }

// A creation candidate deliberately has no dates. Persistence supplies one authoritative
// timestamp and materializes root v3, period 1 and guard v2 atomically.
function buildMembership({ membershipId, personId, groupId, seasonId }) {
  return freezeMembership({ membershipId: requireId(membershipId, "Membership id"), personId: requireId(personId, "Person id"), groupId: requireId(groupId, "Group id"), seasonId: requireId(seasonId, "Season id"), estado: MEMBERSHIP_ACTIVE_STATE, schemaVersion: MEMBERSHIP_SCHEMA_VERSION });
}

function hydrateMembership(membershipId, data) {
  requireId(membershipId, "Membership id");
  const activeV1 = data?.estado === MEMBERSHIP_ACTIVE_STATE && data?.schemaVersion === MEMBERSHIP_ACTIVE_SCHEMA_VERSION;
  const finalizedV2 = data?.estado === MEMBERSHIP_FINALIZED_STATE && data?.schemaVersion === MEMBERSHIP_FINALIZED_SCHEMA_VERSION;
  const activeV3 = data?.estado === MEMBERSHIP_ACTIVE_STATE && data?.schemaVersion === MEMBERSHIP_SCHEMA_VERSION;
  const finalizedV3 = data?.estado === MEMBERSHIP_FINALIZED_STATE && data?.schemaVersion === MEMBERSHIP_SCHEMA_VERSION;
  if (!activeV1 && !finalizedV2 && !activeV3 && !finalizedV3) throw new InvalidMembershipStateError("Membership state and schema version are incompatible");
  assertExactDocument(data, activeV1 ? ACTIVE_MEMBERSHIP_FIELDS : finalizedV2 ? FINALIZED_MEMBERSHIP_FIELDS : activeV3 ? ACTIVE_MEMBERSHIP_V3_FIELDS : FINALIZED_MEMBERSHIP_V3_FIELDS);
  requireId(data.personId, "Person id"); requireId(data.groupId, "Group id"); requireId(data.seasonId, "Season id");
  timestampMillis(data.fechaIngreso, "Membership admission timestamp"); timestampMillis(data.createdAt, "Membership creation timestamp");
  if ((finalizedV2 || finalizedV3) && timestampMillis(data.fechaEgreso, "Membership exit timestamp") < timestampMillis(data.fechaIngreso, "Membership admission timestamp")) throw new InvalidMembershipStateError("Membership exit timestamp precedes admission");
  if (activeV3 || finalizedV3) {
    requireId(data.latestPeriodId, "Latest validity period id");
    if (!Number.isSafeInteger(data.periodCount) || data.periodCount < 1) throw new InvalidMembershipStateError("Membership period count is invalid");
  }
  return freezeMembership({ membershipId, ...data });
}

function createInitialMembership(membership, activatedAt, firstPeriodId) {
  if (!membership || membership.schemaVersion !== MEMBERSHIP_SCHEMA_VERSION || membership.fechaIngreso || membership.createdAt) throw new InvalidMembershipStateError("Membership creation candidate is invalid");
  requireTimestamp(activatedAt, "Membership activation timestamp");
  const period = openMembershipValidityPeriod({ periodId: requireId(firstPeriodId, "First validity period id"), ordinal: 1, startedAt: activatedAt });
  return Object.freeze({ membership: freezeMembership({ ...membership, fechaIngreso: activatedAt, createdAt: activatedAt, latestPeriodId: firstPeriodId, periodCount: 1 }), periods: Object.freeze([period]) });
}

function assertPeriodBoundary(membership, firstPeriod, latestPeriod) {
  if (!firstPeriod || firstPeriod.ordinal !== 1 || !sameTimestamp(firstPeriod.startedAt, membership.fechaIngreso)) throw new InvalidMembershipStateError("First validity period is inconsistent");
  if (!latestPeriod || latestPeriod.periodId !== membership.latestPeriodId || latestPeriod.ordinal !== membership.periodCount) throw new InvalidMembershipStateError("Latest validity period is inconsistent");
  if (timestampMillis(latestPeriod.startedAt, "Latest validity period start") < timestampMillis(firstPeriod.startedAt, "First validity period start")) throw new InvalidMembershipStateError("Validity periods are not ordered");
  if (membership.estado === MEMBERSHIP_ACTIVE_STATE && latestPeriod.estado !== "abierto") throw new InvalidMembershipStateError("Active Membership latest period is not open");
  if (membership.estado === MEMBERSHIP_FINALIZED_STATE && (latestPeriod.estado !== "cerrado" || !sameTimestamp(latestPeriod.endedAt, membership.fechaEgreso))) throw new InvalidMembershipStateError("Finalized Membership latest period is inconsistent");
}

function finalizeMembership({ membership, finalizedAt, firstPeriodId, firstPeriod, latestPeriod }) {
  try {
    requireTimestamp(finalizedAt, "Membership exit timestamp");
    if (!membership || membership.estado !== MEMBERSHIP_ACTIVE_STATE) throw new InvalidMembershipStateError("Membership cannot be finalized from its current state");
    if (membership.schemaVersion === MEMBERSHIP_ACTIVE_SCHEMA_VERSION) {
      if (timestampMillis(finalizedAt, "Membership exit timestamp") < timestampMillis(membership.fechaIngreso, "Membership admission timestamp")) throw new InvalidMembershipStateError("Membership exit timestamp precedes admission");
      const opened = openMembershipValidityPeriod({ periodId: firstPeriodId, ordinal: 1, startedAt: membership.fechaIngreso });
      const closed = closeMembershipValidityPeriod(opened, finalizedAt);
      return Object.freeze({ membership: freezeMembership({ ...membership, estado: MEMBERSHIP_FINALIZED_STATE, fechaEgreso: finalizedAt, latestPeriodId: firstPeriodId, periodCount: 1, schemaVersion: MEMBERSHIP_SCHEMA_VERSION }), periods: Object.freeze([closed]) });
    }
    if (membership.schemaVersion !== MEMBERSHIP_SCHEMA_VERSION) throw new InvalidMembershipStateError("Membership schema cannot be finalized");
    assertPeriodBoundary(membership, firstPeriod, latestPeriod);
    const closed = closeMembershipValidityPeriod(latestPeriod, finalizedAt);
    return Object.freeze({ membership: freezeMembership({ ...membership, estado: MEMBERSHIP_FINALIZED_STATE, fechaEgreso: finalizedAt }), periods: Object.freeze([closed]) });
  } catch (error) { if (error instanceof InvalidMembershipValidityPeriodError) throw new InvalidMembershipStateError(error.message); throw error; }
}

function reactivateMembership({ membership, reactivatedAt, firstPeriodId, nextPeriodId, firstPeriod, latestPeriod }) {
  try {
    requireTimestamp(reactivatedAt, "Membership reactivation timestamp");
    if (!membership || membership.estado !== MEMBERSHIP_FINALIZED_STATE) throw new InvalidMembershipStateError("Membership cannot be reactivated from its current state");
    if (membership.schemaVersion === MEMBERSHIP_FINALIZED_SCHEMA_VERSION) {
      const historical = closeMembershipValidityPeriod(openMembershipValidityPeriod({ periodId: firstPeriodId, ordinal: 1, startedAt: membership.fechaIngreso }), membership.fechaEgreso);
      if (timestampMillis(reactivatedAt, "Membership reactivation timestamp") < timestampMillis(historical.endedAt, "Previous validity period end")) throw new InvalidMembershipStateError("Membership reactivation precedes previous exit");
      const current = openMembershipValidityPeriod({ periodId: nextPeriodId, ordinal: 2, startedAt: reactivatedAt });
      const { fechaEgreso: omitted, ...root } = membership;
      return Object.freeze({ membership: freezeMembership({ ...root, estado: MEMBERSHIP_ACTIVE_STATE, latestPeriodId: nextPeriodId, periodCount: 2, schemaVersion: MEMBERSHIP_SCHEMA_VERSION }), periods: Object.freeze([historical, current]) });
    }
    if (membership.schemaVersion !== MEMBERSHIP_SCHEMA_VERSION) throw new InvalidMembershipStateError("Membership schema cannot be reactivated");
    assertPeriodBoundary(membership, firstPeriod, latestPeriod);
    if (timestampMillis(reactivatedAt, "Membership reactivation timestamp") < timestampMillis(latestPeriod.endedAt, "Previous validity period end")) throw new InvalidMembershipStateError("Membership reactivation precedes previous exit");
    if (membership.periodCount === Number.MAX_SAFE_INTEGER) throw new InvalidMembershipStateError("Membership period count exhausted");
    const ordinal = membership.periodCount + 1;
    const current = openMembershipValidityPeriod({ periodId: nextPeriodId, ordinal, startedAt: reactivatedAt });
    const { fechaEgreso: omitted, ...root } = membership;
    return Object.freeze({ membership: freezeMembership({ ...root, estado: MEMBERSHIP_ACTIVE_STATE, latestPeriodId: nextPeriodId, periodCount: ordinal }), periods: Object.freeze([current]) });
  } catch (error) { if (error instanceof InvalidMembershipValidityPeriodError) throw new InvalidMembershipStateError(error.message); throw error; }
}

module.exports = { ACTIVE_MEMBERSHIP_FIELDS, ACTIVE_MEMBERSHIP_V3_FIELDS, FINALIZED_MEMBERSHIP_FIELDS, FINALIZED_MEMBERSHIP_V3_FIELDS, InvalidMembershipStateError, MEMBERSHIP_ACTIVE_STATE, MEMBERSHIP_FIELDS, MEMBERSHIP_ACTIVE_SCHEMA_VERSION, MEMBERSHIP_FINALIZED_STATE, MEMBERSHIP_FINALIZED_SCHEMA_VERSION, MEMBERSHIP_SCHEMA_VERSION, assertPeriodBoundary, buildMembership, createInitialMembership, finalizeMembership, hydrateMembership, reactivateMembership, sameTimestamp };
