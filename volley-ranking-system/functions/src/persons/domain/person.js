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

function buildAdministrativePerson({ personId, firstName, lastName, contactEmail = null }) {
  const normalized = contactEmail == null || contactEmail === "" ? null : trimmedString(contactEmail, "contactEmail", 254);
  if (normalized !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)) {
    throw new InvalidPersonStateError("contactEmail has an invalid format");
  }
  return Object.freeze({
    personId: trimmedString(personId, "personId", 256),
    nombre: trimmedString(firstName, "firstName", 80),
    apellido: trimmedString(lastName, "lastName", 80),
    emailContacto: normalized,
    schemaVersion: 2,
  });
}

function hydratePerson(personId, data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new InvalidPersonStateError("Person data is required");
  }
  if (data.schemaVersion === 2) {
    const expectedV2 = ["apellido", "createdAt", "nombre", "schemaVersion", ...(Object.prototype.hasOwnProperty.call(data, "emailContacto") ? ["emailContacto"] : [])].sort();
    const actualV2 = Object.keys(data).sort();
    if (actualV2.length !== expectedV2.length || actualV2.some((key, index) => key !== expectedV2[index]) || data.createdAt == null) {
      throw new InvalidPersonStateError("Person schema is inconsistent");
    }
    return buildAdministrativePerson({ personId, firstName: data.nombre, lastName: data.apellido, contactEmail: data.emailContacto ?? null });
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
  buildAdministrativePerson,
  buildPerson,
  hydratePerson,
};
