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

function linkPerson(user, personaId) {
  if (!user || typeof user !== "object") throw new InvalidUserStateError("User is required");
  if (Object.prototype.hasOwnProperty.call(user, "personaId")) {
    throw new InvalidUserStateError("User already has a person link");
  }
  const normalizedPersonId = normalizeOptionalString(personaId);
  if (!normalizedPersonId) throw new InvalidUserStateError("Person id is required");
  return Object.freeze({ ...user, personaId: normalizedPersonId });
}

function hydrateUserForPersonLink(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new InvalidUserStateError("User data is required");
  }
  if (Object.prototype.hasOwnProperty.call(data, "personaId")) {
    if (typeof data.personaId !== "string" || !data.personaId || data.personaId.trim() !== data.personaId) {
      throw new InvalidUserStateError("Person link is inconsistent");
    }
  }
  return Object.freeze({ ...data });
}

module.exports = {
  InvalidUserStateError,
  buildInitialUser,
  hydrateUserForPersonLink,
  linkPerson,
};
