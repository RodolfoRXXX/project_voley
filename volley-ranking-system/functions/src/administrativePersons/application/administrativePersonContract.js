"use strict";

function object(value) { return value && typeof value === "object" && !Array.isArray(value); }
function id(value) { return typeof value === "string" && value.trim() === value && value.length > 0 && value.length <= 1500 && !value.includes("/"); }
function text(value, max) { return typeof value === "string" && Array.from(value.trim()).length > 0 && Array.from(value.trim()).length <= max; }
function email(value) { return value === null || value === undefined || value === "" || (typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim())); }
function key(value) { return typeof value === "string" && value.length >= 16 && value.length <= 128; }
function pageSize(value) { if (value === undefined) return 20; if (!Number.isSafeInteger(value) || value < 1 || value > 20) throw new TypeError("INVALID_ARGUMENT"); return value; }
function cursor(value) { if (value === undefined) return undefined; if (typeof value !== "string" || value.length < 8 || value.length > 4096) throw new TypeError("INVALID_ARGUMENT"); return value; }

function validateCreateAdministrativePersonPayload(value) {
  const allowed = ["groupId", "firstName", "lastName", "contactEmail", "idempotencyKey"];
  if (!object(value) || Object.keys(value).some((name) => !allowed.includes(name)) || !id(value.groupId)
    || !text(value.firstName, 80) || !text(value.lastName, 80) || !email(value.contactEmail) || !key(value.idempotencyKey)) throw new TypeError("INVALID_ARGUMENT");
  return { groupId: value.groupId, firstName: value.firstName.trim(), lastName: value.lastName.trim(), contactEmail: value.contactEmail?.trim() || null, idempotencyKey: value.idempotencyKey };
}

function validateUpdateAdministrativePersonPayload(value) {
  const allowed = ["groupId", "personId", "firstName", "lastName", "contactEmail", "expectedRevision", "idempotencyKey"];
  if (!object(value) || Object.keys(value).some((name) => !allowed.includes(name)) || !id(value.groupId) || !id(value.personId)
    || !text(value.firstName, 80) || !text(value.lastName, 80) || !email(value.contactEmail) || !Number.isSafeInteger(value.expectedRevision)
    || value.expectedRevision < 1 || !key(value.idempotencyKey)) throw new TypeError("INVALID_ARGUMENT");
  return { groupId: value.groupId, personId: value.personId, firstName: value.firstName.trim(), lastName: value.lastName.trim(), contactEmail: value.contactEmail?.trim() || null, expectedRevision: value.expectedRevision, idempotencyKey: value.idempotencyKey };
}

function validateListAdministrativePersonsPayload(value) {
  const allowed = ["groupId", "pageSize", "cursor"];
  if (!object(value) || Object.keys(value).some((name) => !allowed.includes(name)) || !id(value.groupId)) throw new TypeError("INVALID_ARGUMENT");
  return { groupId: value.groupId, pageSize: pageSize(value.pageSize), cursor: cursor(value.cursor) };
}

function validatePrepareAdministrativeReincorporationPayload(value) {
  const allowed = ["groupId", "personId"];
  if (!object(value) || Object.keys(value).some((name) => !allowed.includes(name)) || Object.keys(value).length !== 2 || !id(value.groupId) || !id(value.personId)) throw new TypeError("INVALID_ARGUMENT");
  return { groupId: value.groupId, personId: value.personId };
}

function validateConfirmAdministrativeReincorporationPayload(value) {
  const allowed = ["groupId", "personId", "previewToken", "idempotencyKey"];
  if (!object(value) || Object.keys(value).some((name) => !allowed.includes(name)) || Object.keys(value).length !== 4 || !id(value.groupId) || !id(value.personId)
    || typeof value.previewToken !== "string" || value.previewToken.length < 16 || value.previewToken.length > 4096 || !key(value.idempotencyKey)) throw new TypeError("INVALID_ARGUMENT");
  return { groupId: value.groupId, personId: value.personId, previewToken: value.previewToken, idempotencyKey: value.idempotencyKey };
}

module.exports = { validateConfirmAdministrativeReincorporationPayload, validateCreateAdministrativePersonPayload, validateListAdministrativePersonsPayload, validatePrepareAdministrativeReincorporationPayload, validateUpdateAdministrativePersonPayload };
