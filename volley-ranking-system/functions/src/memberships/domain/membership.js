"use strict";

const { InvalidMembershipValidityPeriodError, closeMembershipValidityPeriod, openMembershipValidityPeriod, validTimestamp } = require("./membershipValidityPeriod");

const MEMBERSHIP_ACTIVE_SCHEMA_VERSION = 1;
const MEMBERSHIP_FINALIZED_SCHEMA_VERSION = 2;
const MEMBERSHIP_PERIOD_AWARE_SCHEMA_VERSION = 3;
const MEMBERSHIP_LINEAGE_SCHEMA_VERSION = 4;
const MEMBERSHIP_SCHEMA_VERSION = 5;
const MEMBERSHIP_RENEWED_SCHEMA_VERSION = 6;
const MEMBERSHIP_ACTIVE_STATE = "activa";
const MEMBERSHIP_FINALIZED_STATE = "finalizada";
const ACTIVE_MEMBERSHIP_FIELDS = Object.freeze(["personId", "groupId", "seasonId", "estado", "fechaIngreso", "createdAt", "schemaVersion"]);
const FINALIZED_MEMBERSHIP_FIELDS = Object.freeze([...ACTIVE_MEMBERSHIP_FIELDS.slice(0, -1), "fechaEgreso", "schemaVersion"]);
const ACTIVE_MEMBERSHIP_V3_FIELDS = Object.freeze([...ACTIVE_MEMBERSHIP_FIELDS.slice(0, -1), "latestPeriodId", "periodCount", "schemaVersion"]);
const FINALIZED_MEMBERSHIP_V3_FIELDS = Object.freeze([...ACTIVE_MEMBERSHIP_V3_FIELDS.slice(0, -1), "fechaEgreso", "schemaVersion"]);
const ACTIVE_MEMBERSHIP_V4_FIELDS = Object.freeze([...ACTIVE_MEMBERSHIP_V3_FIELDS.slice(0, -1), "previousMembershipId", "schemaVersion"]);
const FINALIZED_MEMBERSHIP_V4_FIELDS = Object.freeze([...ACTIVE_MEMBERSHIP_V4_FIELDS.slice(0, -1), "fechaEgreso", "schemaVersion"]);
const MEMBERSHIP_FIELDS = ACTIVE_MEMBERSHIP_FIELDS;

class InvalidMembershipStateError extends Error { constructor(message) { super(message); this.name = "InvalidMembershipStateError"; } }
function own(data, key) { return Object.prototype.hasOwnProperty.call(data, key); }
function requireId(value, label) { if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.includes("/")) throw new InvalidMembershipStateError(`${label} is invalid`); return value; }
function requireTimestamp(value, label) { if (!validTimestamp(value)) throw new InvalidMembershipStateError(`${label} is invalid`); return value; }
function timestampMillis(value, label) { return requireTimestamp(value, label).toDate().getTime(); }
function sameTimestamp(left, right) { return validTimestamp(left) && validTimestamp(right) && left.toDate().getTime() === right.toDate().getTime(); }
function freezeMembership(data) { return Object.freeze({ ...data }); }
function assertExactDocument(data, expectedFields) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new InvalidMembershipStateError("Membership document is required");
  const keys = Object.keys(data).sort(); const expected = [...expectedFields].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) throw new InvalidMembershipStateError("Membership document has an invalid schema");
}

function normalizeMembershipCargo(value) {
  if (typeof value !== "string" || /\p{Cc}/u.test(value)) throw new InvalidMembershipStateError("Membership cargo is invalid");
  const canonical = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (Array.from(canonical).length < 1 || Array.from(canonical).length > 80) throw new InvalidMembershipStateError("Membership cargo is invalid");
  return canonical;
}
function assertCanonicalOptionalCargo(data) {
  if (own(data, "cargo") && normalizeMembershipCargo(data.cargo) !== data.cargo) throw new InvalidMembershipStateError("Membership cargo is not canonical");
}
function hasPeriodMetadata(membership) {
  return [3, 4, 6].includes(membership?.schemaVersion) || (membership?.schemaVersion === 5 && own(membership, "latestPeriodId") && own(membership, "periodCount"));
}
function hasLineage(membership) { return [4, 6].includes(membership?.schemaVersion); }

function buildMembership({ membershipId, personId, groupId, seasonId }) {
  return freezeMembership({ membershipId: requireId(membershipId, "Membership id"), personId: requireId(personId, "Person id"), groupId: requireId(groupId, "Group id"), seasonId: requireId(seasonId, "Season id"), estado: MEMBERSHIP_ACTIVE_STATE, schemaVersion: MEMBERSHIP_SCHEMA_VERSION });
}
function buildRenewedMembership({ membershipId, personId, groupId, seasonId, previousMembershipId }) {
  const id = requireId(membershipId, "Membership id"); const previous = requireId(previousMembershipId, "Previous Membership id");
  if (id === previous) throw new InvalidMembershipStateError("Previous Membership must differ from Membership");
  return freezeMembership({ membershipId: id, personId: requireId(personId, "Person id"), groupId: requireId(groupId, "Group id"), seasonId: requireId(seasonId, "Season id"), estado: MEMBERSHIP_ACTIVE_STATE, previousMembershipId: previous, schemaVersion: MEMBERSHIP_RENEWED_SCHEMA_VERSION });
}

function expectedFieldsFor(data) {
  const active = data.estado === MEMBERSHIP_ACTIVE_STATE; const finalized = data.estado === MEMBERSHIP_FINALIZED_STATE; const version = data.schemaVersion; let fields;
  if (active && version === 1) fields = ACTIVE_MEMBERSHIP_FIELDS;
  else if (finalized && version === 2) fields = FINALIZED_MEMBERSHIP_FIELDS;
  else if (active && version === 3) fields = ACTIVE_MEMBERSHIP_V3_FIELDS;
  else if (finalized && version === 3) fields = FINALIZED_MEMBERSHIP_V3_FIELDS;
  else if (active && version === 4) fields = ACTIVE_MEMBERSHIP_V4_FIELDS;
  else if (finalized && version === 4) fields = FINALIZED_MEMBERSHIP_V4_FIELDS;
  else if (active && version === 5 && !own(data, "latestPeriodId") && !own(data, "periodCount")) fields = ACTIVE_MEMBERSHIP_FIELDS;
  else if (active && version === 5) fields = ACTIVE_MEMBERSHIP_V3_FIELDS;
  else if (finalized && version === 5) fields = FINALIZED_MEMBERSHIP_V3_FIELDS;
  else if (active && version === 6) fields = ACTIVE_MEMBERSHIP_V4_FIELDS;
  else if (finalized && version === 6) fields = FINALIZED_MEMBERSHIP_V4_FIELDS;
  else throw new InvalidMembershipStateError("Membership state and schema version are incompatible");
  return [5, 6].includes(version) && own(data, "cargo") ? [...fields, "cargo"] : fields;
}

function hydrateMembership(membershipId, data) {
  requireId(membershipId, "Membership id"); assertExactDocument(data, expectedFieldsFor(data || {}));
  requireId(data.personId, "Person id"); requireId(data.groupId, "Group id"); requireId(data.seasonId, "Season id");
  timestampMillis(data.fechaIngreso, "Membership admission timestamp"); timestampMillis(data.createdAt, "Membership creation timestamp");
  if (data.estado === MEMBERSHIP_FINALIZED_STATE && timestampMillis(data.fechaEgreso, "Membership exit timestamp") < timestampMillis(data.fechaIngreso, "Membership admission timestamp")) throw new InvalidMembershipStateError("Membership exit timestamp precedes admission");
  if (hasPeriodMetadata(data)) { requireId(data.latestPeriodId, "Latest validity period id"); if (!Number.isSafeInteger(data.periodCount) || data.periodCount < 1) throw new InvalidMembershipStateError("Membership period count is invalid"); }
  if (hasLineage(data) && requireId(data.previousMembershipId, "Previous Membership id") === membershipId) throw new InvalidMembershipStateError("Membership lineage is cyclic");
  if ([5, 6].includes(data.schemaVersion)) assertCanonicalOptionalCargo(data);
  return freezeMembership({ membershipId, ...data });
}

function createInitialMembership(membership, activatedAt, firstPeriodId) {
  if (!membership || ![5, 6].includes(membership.schemaVersion) || membership.fechaIngreso || membership.createdAt || own(membership, "cargo")) throw new InvalidMembershipStateError("Membership creation candidate is invalid");
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

function changeMembershipCargo(membership, requestedCargo) {
  if (!membership || membership.estado !== MEMBERSHIP_ACTIVE_STATE || ![1, 3, 4, 5, 6].includes(membership.schemaVersion)) throw new InvalidMembershipStateError("Membership cargo cannot be changed from its current state");
  const cargo = requestedCargo === null ? null : normalizeMembershipCargo(requestedCargo); const current = own(membership, "cargo") ? membership.cargo : null;
  if (current === cargo) return Object.freeze({ outcome: "NO_CHANGES", membership });
  const { cargo: omitted, ...withoutCargo } = membership;
  const schemaVersion = [1, 3].includes(membership.schemaVersion) ? 5 : membership.schemaVersion === 4 ? 6 : membership.schemaVersion;
  return Object.freeze({ outcome: "UPDATED", membership: freezeMembership({ ...withoutCargo, ...(cargo === null ? {} : { cargo }), schemaVersion }), cargo });
}

function finalizeMembership({ membership, finalizedAt, firstPeriodId, firstPeriod, latestPeriod }) {
  try {
    requireTimestamp(finalizedAt, "Membership exit timestamp");
    if (!membership || membership.estado !== MEMBERSHIP_ACTIVE_STATE) throw new InvalidMembershipStateError("Membership cannot be finalized from its current state");
    const legacy = membership.schemaVersion === 1 || (membership.schemaVersion === 5 && !hasPeriodMetadata(membership));
    if (legacy) {
      if (timestampMillis(finalizedAt, "Membership exit timestamp") < timestampMillis(membership.fechaIngreso, "Membership admission timestamp")) throw new InvalidMembershipStateError("Membership exit timestamp precedes admission");
      const closed = closeMembershipValidityPeriod(openMembershipValidityPeriod({ periodId: firstPeriodId, ordinal: 1, startedAt: membership.fechaIngreso }), finalizedAt);
      return Object.freeze({ membership: freezeMembership({ ...membership, estado: MEMBERSHIP_FINALIZED_STATE, fechaEgreso: finalizedAt, latestPeriodId: firstPeriodId, periodCount: 1, schemaVersion: membership.schemaVersion === 1 ? 3 : 5 }), periods: Object.freeze([closed]) });
    }
    if (![3, 4, 5, 6].includes(membership.schemaVersion) || !hasPeriodMetadata(membership)) throw new InvalidMembershipStateError("Membership schema cannot be finalized");
    assertPeriodBoundary(membership, firstPeriod, latestPeriod);
    return Object.freeze({ membership: freezeMembership({ ...membership, estado: MEMBERSHIP_FINALIZED_STATE, fechaEgreso: finalizedAt }), periods: Object.freeze([closeMembershipValidityPeriod(latestPeriod, finalizedAt)]) });
  } catch (error) { if (error instanceof InvalidMembershipValidityPeriodError) throw new InvalidMembershipStateError(error.message); throw error; }
}

function reactivateMembership({ membership, reactivatedAt, firstPeriodId, nextPeriodId, firstPeriod, latestPeriod }) {
  try {
    requireTimestamp(reactivatedAt, "Membership reactivation timestamp");
    if (!membership || membership.estado !== MEMBERSHIP_FINALIZED_STATE) throw new InvalidMembershipStateError("Membership cannot be reactivated from its current state");
    if (membership.schemaVersion === 2) {
      const historical = closeMembershipValidityPeriod(openMembershipValidityPeriod({ periodId: firstPeriodId, ordinal: 1, startedAt: membership.fechaIngreso }), membership.fechaEgreso);
      if (timestampMillis(reactivatedAt, "Membership reactivation timestamp") < timestampMillis(historical.endedAt, "Previous validity period end")) throw new InvalidMembershipStateError("Membership reactivation precedes previous exit");
      const { fechaEgreso: omitted, ...root } = membership;
      return Object.freeze({ membership: freezeMembership({ ...root, estado: MEMBERSHIP_ACTIVE_STATE, latestPeriodId: nextPeriodId, periodCount: 2, schemaVersion: 3 }), periods: Object.freeze([historical, openMembershipValidityPeriod({ periodId: nextPeriodId, ordinal: 2, startedAt: reactivatedAt })]) });
    }
    if (![3, 4, 5, 6].includes(membership.schemaVersion) || !hasPeriodMetadata(membership)) throw new InvalidMembershipStateError("Membership schema cannot be reactivated");
    assertPeriodBoundary(membership, firstPeriod, latestPeriod);
    if (timestampMillis(reactivatedAt, "Membership reactivation timestamp") < timestampMillis(latestPeriod.endedAt, "Previous validity period end")) throw new InvalidMembershipStateError("Membership reactivation precedes previous exit");
    if (membership.periodCount === Number.MAX_SAFE_INTEGER) throw new InvalidMembershipStateError("Membership period count exhausted");
    const ordinal = membership.periodCount + 1; const { fechaEgreso: omitted, ...root } = membership;
    return Object.freeze({ membership: freezeMembership({ ...root, estado: MEMBERSHIP_ACTIVE_STATE, latestPeriodId: nextPeriodId, periodCount: ordinal }), periods: Object.freeze([openMembershipValidityPeriod({ periodId: nextPeriodId, ordinal, startedAt: reactivatedAt })]) });
  } catch (error) { if (error instanceof InvalidMembershipValidityPeriodError) throw new InvalidMembershipStateError(error.message); throw error; }
}

module.exports = { ACTIVE_MEMBERSHIP_FIELDS, ACTIVE_MEMBERSHIP_V3_FIELDS, ACTIVE_MEMBERSHIP_V4_FIELDS, FINALIZED_MEMBERSHIP_FIELDS, FINALIZED_MEMBERSHIP_V3_FIELDS, FINALIZED_MEMBERSHIP_V4_FIELDS, InvalidMembershipStateError, MEMBERSHIP_ACTIVE_STATE, MEMBERSHIP_FIELDS, MEMBERSHIP_ACTIVE_SCHEMA_VERSION, MEMBERSHIP_FINALIZED_STATE, MEMBERSHIP_FINALIZED_SCHEMA_VERSION, MEMBERSHIP_PERIOD_AWARE_SCHEMA_VERSION, MEMBERSHIP_LINEAGE_SCHEMA_VERSION, MEMBERSHIP_SCHEMA_VERSION, MEMBERSHIP_RENEWED_SCHEMA_VERSION, assertPeriodBoundary, buildMembership, buildRenewedMembership, changeMembershipCargo, createInitialMembership, finalizeMembership, hasLineage, hasPeriodMetadata, hydrateMembership, normalizeMembershipCargo, reactivateMembership, sameTimestamp };
