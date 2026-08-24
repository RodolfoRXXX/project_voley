"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildPerson, hydratePerson, InvalidPersonStateError } = require("../../src/persons/domain/person");
const { toMyPersonDto } = require("../../src/persons/application/personDto");
const { InvalidUserStateError, linkPerson } = require("../../src/users/domain/user");

test("Persona recorta bordes, preserva casing y expone el DTO exacto", () => {
  const person = buildPerson({
    personId: "opaque-id",
    firstName: "  MaRía ",
    lastName: " Pérez  ",
    contactEmail: "  Contacto@Example.INVALID ",
  });
  assert.deepEqual(toMyPersonDto(person), {
    personId: "opaque-id",
    firstName: "MaRía",
    lastName: "Pérez",
    contactEmail: "Contacto@Example.INVALID",
  });
});

test("Persona rechaza campos inválidos y documentos con esquema ampliado", () => {
  assert.throws(() => buildPerson({ personId: "id", firstName: "", lastName: "Pérez", contactEmail: "mail" }), InvalidPersonStateError);
  assert.throws(() => hydratePerson("id", {
    nombre: "María",
    apellido: "Pérez",
    emailContacto: "mail@example.invalid",
    createdAt: {},
    updatedAt: {},
  }), InvalidPersonStateError);
  assert.throws(() => buildPerson({ personId: "id", firstName: "x".repeat(81), lastName: "Pérez", contactEmail: "mail@example.invalid" }), InvalidPersonStateError);
});

test("el email de contacto no es una clave única de dominio", () => {
  const first = buildPerson({ personId: "one", firstName: "Ana", lastName: "Uno", contactEmail: "shared@example.invalid" });
  const second = buildPerson({ personId: "two", firstName: "Ana", lastName: "Dos", contactEmail: "shared@example.invalid" });
  assert.notEqual(first.personId, second.personId);
  assert.equal(first.emailContacto, second.emailContacto);
});

test("Usuario es quien incorpora el vínculo inicial y no admite reemplazo", () => {
  assert.deepEqual(linkPerson({ email: "account@example.invalid" }, " person-id "), {
    email: "account@example.invalid",
    personaId: "person-id",
  });
  assert.throws(() => linkPerson({ personaId: "existing" }, "other"), InvalidUserStateError);
});
