"use strict";

class InvalidPersonStateError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidPersonStateError";
  }
}

function trimmedString(value, fieldName, maxLength) {
  if (typeof value !== "string") {
    throw new InvalidPersonStateError(`${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  const length = Array.from(trimmed).length;
  if (length < 1 || length > maxLength) {
    throw new InvalidPersonStateError(`${fieldName} has an invalid length`);
  }
  return trimmed;
}

function buildPerson({ personId, firstName, lastName, contactEmail }) {
  const normalizedId = trimmedString(personId, "personId", 256);
  const normalizedEmail = trimmedString(contactEmail, "contactEmail", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalizedEmail)) {
    throw new InvalidPersonStateError("contactEmail has an invalid format");
  }

  return Object.freeze({
    personId: normalizedId,
    nombre: trimmedString(firstName, "firstName", 80),
    apellido: trimmedString(lastName, "lastName", 80),
    emailContacto: normalizedEmail,
  });
}

function hydratePerson(personId, data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new InvalidPersonStateError("Person data is required");
  }
  const expected = ["apellido", "createdAt", "emailContacto", "nombre"];
  const actual = Object.keys(data).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new InvalidPersonStateError("Person schema is inconsistent");
  }
  if (data.createdAt == null) {
    throw new InvalidPersonStateError("Person creation timestamp is required");
  }
  return buildPerson({
    personId,
    firstName: data.nombre,
    lastName: data.apellido,
    contactEmail: data.emailContacto,
  });
}

module.exports = {
  InvalidPersonStateError,
  buildPerson,
  hydratePerson,
};
