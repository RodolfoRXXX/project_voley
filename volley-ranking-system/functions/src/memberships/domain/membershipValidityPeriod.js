"use strict";

const PERIOD_SCHEMA_VERSION = 1;
const OPEN_PERIOD_FIELDS = Object.freeze(["ordinal", "estado", "startedAt", "periodSchemaVersion"]);
const CLOSED_PERIOD_FIELDS = Object.freeze([...OPEN_PERIOD_FIELDS, "endedAt"]);

class InvalidMembershipValidityPeriodError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidMembershipValidityPeriodError";
  }
}

function validTimestamp(value) {
  return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime());
}

function timestampMillis(value, label) {
  if (!validTimestamp(value)) throw new InvalidMembershipValidityPeriodError(`${label} is invalid`);
  return value.toDate().getTime();
}

function exact(data, fields) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const actual = Object.keys(data).sort();
  const expected = [...fields].sort();
  return actual.length === expected.length && !actual.some((key, index) => key !== expected[index]);
}

function requireOrdinal(value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new InvalidMembershipValidityPeriodError("Validity period ordinal is invalid");
  }
  return value;
}

function hydrateMembershipValidityPeriod(periodId, data) {
  if (typeof periodId !== "string" || !periodId || periodId.includes("/")) {
    throw new InvalidMembershipValidityPeriodError("Validity period id is invalid");
  }
  const open = data?.estado === "abierto";
  const closed = data?.estado === "cerrado";
  if ((!open && !closed) || data?.periodSchemaVersion !== PERIOD_SCHEMA_VERSION || !exact(data, open ? OPEN_PERIOD_FIELDS : CLOSED_PERIOD_FIELDS)) {
    throw new InvalidMembershipValidityPeriodError("Validity period document has an invalid schema");
  }
  requireOrdinal(data.ordinal);
  const started = timestampMillis(data.startedAt, "Validity period start timestamp");
  if (closed && timestampMillis(data.endedAt, "Validity period end timestamp") < started) {
    throw new InvalidMembershipValidityPeriodError("Validity period ends before it starts");
  }
  return Object.freeze({ periodId, ...data });
}

function openMembershipValidityPeriod({ periodId, ordinal, startedAt }) {
  return hydrateMembershipValidityPeriod(periodId, {
    ordinal: requireOrdinal(ordinal),
    estado: "abierto",
    startedAt,
    periodSchemaVersion: PERIOD_SCHEMA_VERSION,
  });
}

function closeMembershipValidityPeriod(period, endedAt) {
  if (!period || period.estado !== "abierto") {
    throw new InvalidMembershipValidityPeriodError("Only an open validity period can be closed");
  }
  return hydrateMembershipValidityPeriod(period.periodId, {
    ordinal: period.ordinal,
    estado: "cerrado",
    startedAt: period.startedAt,
    endedAt,
    periodSchemaVersion: PERIOD_SCHEMA_VERSION,
  });
}

module.exports = {
  CLOSED_PERIOD_FIELDS,
  InvalidMembershipValidityPeriodError,
  OPEN_PERIOD_FIELDS,
  PERIOD_SCHEMA_VERSION,
  closeMembershipValidityPeriod,
  hydrateMembershipValidityPeriod,
  openMembershipValidityPeriod,
  validTimestamp,
};
