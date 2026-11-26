"use strict";

const crypto = require("node:crypto");

function isEmulator() {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FUNCTIONS_EMULATOR);
}

function linkingEnabled() {
  return process.env.ENABLE_IUX11B_LINKING === "true";
}

function emailSecret() {
  const configured = process.env.IUX11B_EMAIL_HMAC_SECRET;
  if (configured) return configured;
  if (isEmulator()) return "iux11b-local-email-hmac-secret-not-for-production";
  throw new Error("IUX11B_EMAIL_HMAC_SECRET is required");
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.normalize("NFKC").trim().toLowerCase() : "";
}

function emailLookup(value) {
  const normalized = normalizeEmail(value);
  if (!normalized) return null;
  return crypto.createHmac("sha256", emailSecret()).update(normalized).digest("base64url");
}

function initialEmailRevision(contactEmail) {
  return normalizeEmail(contactEmail) ? 1 : 0;
}

function nextEmailRevision(previousEmail, nextEmail, currentRevision) {
  const before = normalizeEmail(previousEmail);
  const after = normalizeEmail(nextEmail);
  const base = Number.isSafeInteger(currentRevision) && currentRevision >= 0
    ? currentRevision
    : (before ? 1 : 0);
  return before === after ? base : base + 1;
}

function candidateValue({ person, custody, timestamp }) {
  const lookup = emailLookup(person.emailContacto);
  if (!lookup) return null;
  return {
    personId: person.personId,
    emailLookup: lookup,
    emailRevision: custody.emailRevision,
    firstName: person.nombre,
    lastName: person.apellido,
    originGroupId: custody.originGroupId,
    custodyRevision: custody.revision,
    updatedAt: timestamp,
    schemaVersion: 1,
  };
}

function writeCandidate(transaction, db, { person, custody, timestamp }) {
  const reference = db.collection("administrativePersonLinkCandidates").doc(person.personId);
  const value = candidateValue({ person, custody, timestamp });
  if (value) transaction.set(reference, value);
  else transaction.delete(reference);
}

module.exports = {
  candidateValue,
  emailLookup,
  initialEmailRevision,
  isEmulator,
  linkingEnabled,
  nextEmailRevision,
  normalizeEmail,
  writeCandidate,
};
