"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { validateCreateSeasonPayload, validateOpenSeasonContextPayload, validateOwnSeasonPayload } = require("../../src/groups/application/seasonContract");
const { SeasonValidationError } = require("../../src/groups/application/seasonErrors");
const { seasonIdentityFromCallableContext, toSeasonHttpsError } = require("../../src/groups/infrastructure/seasonCallable");

const payload = { groupId: "group-1", nombre: "Temporada", fechaInicio: "2026-01-01", idempotencyKey: "12345678-1234-1234-1234-123456789abc" };

test("comando acepta exclusivamente groupId, nombre, fechaInicio e idempotencyKey", () => {
  assert.equal(validateCreateSeasonPayload(payload), payload);
  for (const extra of ["uid", "userId", "ownerId", "ownerUid", "roles", "permissions", "personaId", "membership", "estado", "fechaCierre", "plan", "subscription", "anything"]) {
    assert.throws(() => validateCreateSeasonPayload({ ...payload, [extra]: "x" }), SeasonValidationError);
  }
  assert.throws(() => validateCreateSeasonPayload({ groupId: "group-1", nombre: "Temporada", fechaInicio: "2026-01-01" }), SeasonValidationError);
});

test("clave de idempotencia conserva identidad y aplica ASCII 16–128", () => {
  for (const key of ["short", "x".repeat(129), "x".repeat(15) + " ", "x".repeat(15) + "/"]) {
    assert.throws(() => validateCreateSeasonPayload({ ...payload, idempotencyKey: key }), SeasonValidationError);
  }
  assert.doesNotThrow(() => validateCreateSeasonPayload({ ...payload, idempotencyKey: "A._:-0123456789ab" }));
});

test("consultas son cerradas y validan IDs de Grupo y Temporada", () => {
  assert.deepEqual(validateOpenSeasonContextPayload({ groupId: "group-1" }), { groupId: "group-1" });
  assert.deepEqual(validateOwnSeasonPayload({ groupId: "group-1", seasonId: "season-1" }), { groupId: "group-1", seasonId: "season-1" });
  assert.throws(() => validateOpenSeasonContextPayload({ groupId: "group-1", ownerId: "uid" }), SeasonValidationError);
  for (const value of ["", " id", "id ", "a/b"]) assert.throws(() => validateOwnSeasonPayload({ groupId: "group-1", seasonId: value }), SeasonValidationError);
});

test("identidad usa sólo token y errores callable no exponen detalles internos", () => {
  assert.deepEqual(seasonIdentityFromCallableContext({ auth: { uid: "uid", token: { roles: "admin" } } }), { userId: "uid" });
  assert.throws(() => seasonIdentityFromCallableContext({}), { reason: "UNAUTHENTICATED" });
  const httpsError = toSeasonHttpsError(new SeasonValidationError("invalid", { cause: new Error("secret stack") }));
  assert.equal(httpsError.code, "invalid-argument");
  assert.deepEqual(httpsError.details, { reason: "VALIDATION_FAILED" });
  assert.equal(JSON.stringify(httpsError).includes("secret stack"), false);
});
