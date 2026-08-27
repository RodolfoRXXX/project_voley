"use strict";

const SEASON_SCHEMA_VERSION = 1;
const SEASON_OPEN_STATE = "abierta";
const SEASON_FIELDS = Object.freeze([
  "groupId",
  "nombre",
  "fechaInicio",
  "estado",
  "createdAt",
  "schemaVersion",
]);

class InvalidSeasonStateError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidSeasonStateError";
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeys(value, expectedKeys, label) {
  if (!isPlainObject(value)) throw new InvalidSeasonStateError(`${label} is required`);
  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new InvalidSeasonStateError(`${label} has an invalid schema`);
  }
}

function requireId(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.includes("/")) {
    throw new InvalidSeasonStateError(`${label} is invalid`);
  }
  return value;
}

function normalizeSeasonName(value) {
  if (typeof value !== "string") throw new InvalidSeasonStateError("Season name must be a string");
  if (/\p{Cc}/u.test(value)) throw new InvalidSeasonStateError("Season name contains control characters");
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  const length = Array.from(normalized).length;
  if (length < 1 || length > 80) throw new InvalidSeasonStateError("Season name must contain between 1 and 80 code points");
  return normalized;
}

function normalizeStartDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InvalidSeasonStateError("Season start date must use YYYY-MM-DD");
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) {
    throw new InvalidSeasonStateError("Season start date is not a real calendar date");
  }
  return value;
}

function buildSeason({ seasonId, groupId, nombre, fechaInicio }) {
  return Object.freeze({
    seasonId: requireId(seasonId, "Season id"),
    groupId: requireId(groupId, "Group id"),
    nombre: normalizeSeasonName(nombre),
    fechaInicio: normalizeStartDate(fechaInicio),
    estado: SEASON_OPEN_STATE,
    schemaVersion: SEASON_SCHEMA_VERSION,
  });
}

function hydrateSeason(seasonId, data) {
  requireId(seasonId, "Season id");
  assertExactKeys(data, SEASON_FIELDS, "Season document");
  requireId(data.groupId, "Group id");
  if (data.nombre !== normalizeSeasonName(data.nombre)) throw new InvalidSeasonStateError("Season name is not normalized");
  if (data.fechaInicio !== normalizeStartDate(data.fechaInicio)) throw new InvalidSeasonStateError("Season start date is not canonical");
  if (data.estado !== SEASON_OPEN_STATE) throw new InvalidSeasonStateError("Season state is invalid");
  if (data.schemaVersion !== SEASON_SCHEMA_VERSION) throw new InvalidSeasonStateError("Season schema version is invalid");
  if (!data.createdAt || typeof data.createdAt.toDate !== "function" || Number.isNaN(data.createdAt.toDate().getTime())) {
    throw new InvalidSeasonStateError("Season creation timestamp is invalid");
  }
  return Object.freeze({ seasonId, ...data });
}

module.exports = {
  InvalidSeasonStateError,
  SEASON_FIELDS,
  SEASON_OPEN_STATE,
  SEASON_SCHEMA_VERSION,
  buildSeason,
  hydrateSeason,
  normalizeSeasonName,
  normalizeStartDate,
};
