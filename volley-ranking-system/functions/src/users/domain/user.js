"use strict";

class InvalidUserStateError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidUserStateError";
  }
}

function normalizeOptionalString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildInitialUser({ email, displayName, photoUrl }) {
  const normalizedEmail = normalizeOptionalString(email);
  if (!normalizedEmail) {
    throw new InvalidUserStateError("Account email is required");
  }

  return Object.freeze({
    nombre: normalizeOptionalString(displayName),
    email: normalizedEmail,
    photoURL: normalizeOptionalString(photoUrl),
  });
}

module.exports = {
  InvalidUserStateError,
  buildInitialUser,
};
