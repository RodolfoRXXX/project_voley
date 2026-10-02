"use strict";

const GROUP_SCHEMA_VERSION = 1;
const GROUP_ARCHIVED_SCHEMA_VERSION = 2;
const GROUP_INITIAL_STATE = "activo";
const GROUP_ARCHIVED_STATE = "archivado";
const GROUP_SPORTS = Object.freeze(["voleibol"]);
const GROUP_FIELDS = Object.freeze([
  "nombre",
  "deporte",
  "ownerId",
  "estado",
  "createdAt",
  "schemaVersion",
]);
const GROUP_ARCHIVED_FIELDS = Object.freeze([
  "nombre",
  "deporte",
  "ownerId",
  "estado",
  "createdAt",
  "archivedAt",
  "schemaVersion",
]);

class InvalidGroupStateError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidGroupStateError";
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeys(value, expectedKeys, label) {
  if (!isPlainObject(value)) throw new InvalidGroupStateError(`${label} is required`);
  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new InvalidGroupStateError(`${label} has an invalid schema`);
  }
}

function normalizeGroupName(value) {
  if (typeof value !== "string") throw new InvalidGroupStateError("Group name must be a string");
  if (/\p{Cc}/u.test(value)) throw new InvalidGroupStateError("Group name contains control characters");
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  const length = Array.from(normalized).length;
  if (length < 1 || length > 80) throw new InvalidGroupStateError("Group name must contain between 1 and 80 code points");
  return normalized;
}

function normalizeSport(value) {
  if (typeof value !== "string") throw new InvalidGroupStateError("Sport must be a string");
  const normalized = value.normalize("NFC").trim().toLowerCase();
  if (!GROUP_SPORTS.includes(normalized)) throw new InvalidGroupStateError("Sport is not supported");
  return normalized;
}

function requireId(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
    throw new InvalidGroupStateError(`${label} is invalid`);
  }
  return value;
}

function buildGroup({ groupId, nombre, deporte, ownerId }) {
  return Object.freeze({
    groupId: requireId(groupId, "Group id"),
    nombre: normalizeGroupName(nombre),
    deporte: normalizeSport(deporte),
    ownerId: requireId(ownerId, "Owner id"),
    estado: GROUP_INITIAL_STATE,
    schemaVersion: GROUP_SCHEMA_VERSION,
  });
}

function hydrateGroup(groupId, data) {
  requireId(groupId, "Group id");
  const active = data?.estado === GROUP_INITIAL_STATE && data?.schemaVersion === GROUP_SCHEMA_VERSION;
  const archived = data?.estado === GROUP_ARCHIVED_STATE && data?.schemaVersion === GROUP_ARCHIVED_SCHEMA_VERSION;
  if (!active && !archived) throw new InvalidGroupStateError("Group state and schema version are invalid");
  assertExactKeys(data, active ? GROUP_FIELDS : GROUP_ARCHIVED_FIELDS, "Group document");
  if (data.nombre !== normalizeGroupName(data.nombre)) throw new InvalidGroupStateError("Group name is not normalized");
  if (data.deporte !== normalizeSport(data.deporte)) throw new InvalidGroupStateError("Sport is not normalized");
  requireId(data.ownerId, "Owner id");
  if (!data.createdAt || typeof data.createdAt.toDate !== "function" || Number.isNaN(data.createdAt.toDate().getTime())) {
    throw new InvalidGroupStateError("Group creation timestamp is invalid");
  }
  if (archived && (!data.archivedAt || typeof data.archivedAt.toDate !== "function"
    || Number.isNaN(data.archivedAt.toDate().getTime())
    || data.archivedAt.toDate().getTime() < data.createdAt.toDate().getTime())) {
    throw new InvalidGroupStateError("Group archive timestamp is invalid");
  }
  return Object.freeze({ groupId, ...data });
}

function renameGroup(group, nombre) {
  if (!group || group.estado !== GROUP_INITIAL_STATE || group.schemaVersion !== GROUP_SCHEMA_VERSION) {
    throw new InvalidGroupStateError("Only an active Group can be renamed");
  }
  const normalizedName = normalizeGroupName(nombre);
  return Object.freeze({ ...group, nombre: normalizedName });
}

function archiveGroup(group, archivedAt) {
  if (!group || group.estado !== GROUP_INITIAL_STATE || group.schemaVersion !== GROUP_SCHEMA_VERSION) {
    throw new InvalidGroupStateError("Only an active Group can be archived");
  }
  if (!archivedAt || typeof archivedAt.toDate !== "function" || Number.isNaN(archivedAt.toDate().getTime())
    || (group.createdAt && archivedAt.toDate().getTime() < group.createdAt.toDate().getTime())) {
    throw new InvalidGroupStateError("Group archive timestamp is invalid");
  }
  return Object.freeze({ ...group, estado: GROUP_ARCHIVED_STATE, archivedAt, schemaVersion: GROUP_ARCHIVED_SCHEMA_VERSION });
}

module.exports = {
  GROUP_ARCHIVED_FIELDS,
  GROUP_ARCHIVED_SCHEMA_VERSION,
  GROUP_ARCHIVED_STATE,
  GROUP_FIELDS,
  GROUP_INITIAL_STATE,
  GROUP_SCHEMA_VERSION,
  GROUP_SPORTS,
  InvalidGroupStateError,
  archiveGroup,
  buildGroup,
  hydrateGroup,
  normalizeGroupName,
  normalizeSport,
  renameGroup,
};
