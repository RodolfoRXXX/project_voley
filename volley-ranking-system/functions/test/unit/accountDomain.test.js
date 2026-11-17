"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  InvalidUserStateError,
  buildInitialUser,
} = require("../../src/users/domain/user");
const { toMyAccountDto } = require("../../src/users/application/accountDto");

test("construye el Usuario mínimo sin campos deportivos", () => {
  const user = buildInitialUser({
    email: "  account@example.invalid ",
    displayName: " Cuenta Digital ",
    photoUrl: " https://example.invalid/avatar.png ",
  });

  assert.deepEqual(user, {
    nombre: "Cuenta Digital",
    email: "account@example.invalid",
    photoURL: "https://example.invalid/avatar.png",
  });
  assert.deepEqual(Object.keys(user).sort(), ["email", "nombre", "photoURL"]);
});

test("permite nombre y fotografía vacíos", () => {
  assert.deepEqual(
    buildInitialUser({ email: "account@example.invalid" }),
    { nombre: "", email: "account@example.invalid", photoURL: "" }
  );
});

test("rechaza identidad sin correo", () => {
  assert.throws(
    () => buildInitialUser({ email: " ", displayName: "Cuenta" }),
    InvalidUserStateError
  );
});

test("DTO expone la fecha de Cuenta serializada como ISO-8601", () => {
  const dto = toMyAccountDto("firebase-uid", {
    nombre: "Cuenta",
    email: "account@example.invalid",
    photoURL: "",
    createdAt: { toDate: () => new Date("2026-11-17T12:34:56.000Z") },
    roles: "admin",
    onboarded: true,
  });

  assert.deepEqual(dto, {
    userId: "firebase-uid",
    displayName: "Cuenta",
    accessEmail: "account@example.invalid",
    accountPhotoUrl: null,
    accountCreatedAt: "2026-11-17T12:34:56.000Z",
  });
});

test("DTO representa users.createdAt ausente o inválido como null", () => {
  const base = { nombre: "Cuenta", email: "account@example.invalid", photoURL: "" };
  assert.equal(toMyAccountDto("missing", base).accountCreatedAt, null);
  assert.equal(
    toMyAccountDto("invalid", { ...base, createdAt: { toDate: () => new Date("invalid") } }).accountCreatedAt,
    null
  );
});
