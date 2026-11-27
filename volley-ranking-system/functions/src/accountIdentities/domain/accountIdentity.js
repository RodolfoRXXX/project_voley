"use strict";

const ACCOUNT_IDENTITY_STATE = "MIRRORED_SINGLE";
const ASSIGNMENT_STATE = "ACTIVE";
const SCHEMA_VERSION = 1;
const SOURCES = new Set(["SELF_BOOTSTRAP", "IUX11B_ADOPTION", "LEGACY_MATERIALIZATION"]);

class IdentityIncompatibleStateError extends Error {
  constructor(message = "Account identity materialization is incompatible") {
    super(message);
    this.name = "IdentityIncompatibleStateError";
  }
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function buildMirroredSingleDocuments({ accountId, personId, source, occurredAt }) {
  if (!nonEmptyString(accountId) || !nonEmptyString(personId) || !SOURCES.has(source) || !occurredAt) {
    throw new TypeError("valid accountId, personId, source and occurredAt are required");
  }
  return Object.freeze({
    accountIdentity: Object.freeze({
      accountId,
      primaryPersonId: personId,
      state: ACCOUNT_IDENTITY_STATE,
      identityRevision: 1,
      createdAt: occurredAt,
      updatedAt: occurredAt,
      schemaVersion: SCHEMA_VERSION,
    }),
    assignment: Object.freeze({
      personId,
      accountId,
      state: ASSIGNMENT_STATE,
      source,
      assignedAt: occurredAt,
      schemaVersion: SCHEMA_VERSION,
    }),
  });
}

function isExactAccountIdentity(value, accountId, personId) {
  return value && Object.keys(value).sort().join(",") === "accountId,createdAt,identityRevision,primaryPersonId,schemaVersion,state,updatedAt"
    && value?.accountId === accountId
    && value?.primaryPersonId === personId
    && value?.state === ACCOUNT_IDENTITY_STATE
    && value?.identityRevision === 1
    && value?.schemaVersion === SCHEMA_VERSION
    && Boolean(value?.createdAt)
    && Boolean(value?.updatedAt);
}

function isExactAssignment(value, accountId, personId) {
  return value && Object.keys(value).sort().join(",") === "accountId,assignedAt,personId,schemaVersion,source,state"
    && value?.personId === personId
    && value?.accountId === accountId
    && value?.state === ASSIGNMENT_STATE
    && SOURCES.has(value?.source)
    && value?.schemaVersion === SCHEMA_VERSION
    && Boolean(value?.assignedAt);
}

function classifyAccountIdentity({ accountId, legacyPersonId, accountIdentity, assignment }) {
  const hasLegacyPerson = nonEmptyString(legacyPersonId);
  const hasIdentity = accountIdentity !== null;
  const hasAssignment = assignment !== null;

  if (!hasLegacyPerson) {
    return hasIdentity || hasAssignment ? "INCOMPATIBLE" : "MISSING";
  }
  if (!hasIdentity && !hasAssignment) return "LEGACY_SINGLE";
  if (!hasIdentity || !hasAssignment) return "INCOMPATIBLE";
  return isExactAccountIdentity(accountIdentity, accountId, legacyPersonId)
      && isExactAssignment(assignment, accountId, legacyPersonId)
    ? "MIRRORED_SINGLE"
    : "INCOMPATIBLE";
}

module.exports = {
  ACCOUNT_IDENTITY_STATE,
  ASSIGNMENT_STATE,
  IdentityIncompatibleStateError,
  SOURCES,
  buildMirroredSingleDocuments,
  classifyAccountIdentity,
  isExactAccountIdentity,
  isExactAssignment,
};
