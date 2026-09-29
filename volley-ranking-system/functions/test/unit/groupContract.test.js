"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { validateCreateGroupPayload, validateEmptyPayload, validateGroupIdPayload, validateUpdateOwnGroupNamePayload } = require("../../src/groups/application/groupContract");
const { GroupValidationError } = require("../../src/groups/application/groupErrors");
const { identityFromCallableContext, toHttpsError } = require("../../src/groups/infrastructure/groupCallable");

test("contrato de creación acepta sólo nombre, deporte e idempotencyKey", () => {
  const payload = { nombre: "Grupo", deporte: "voleibol", idempotencyKey: "12345678-1234-1234-1234-123456789abc" };
  assert.equal(validateCreateGroupPayload(payload), payload);
  for (const extra of ["ownerId", "userId", "roles", "personaId", "estado", "plan", "members", "admins", "anything"]) {
    assert.throws(() => validateCreateGroupPayload({ ...payload, [extra]: "x" }), GroupValidationError);
  }
  assert.throws(() => validateCreateGroupPayload({ nombre: "Grupo", deporte: "voleibol" }), GroupValidationError);
});

test("E2-20 acepta sólo los cuatro campos y aplica límites técnicos cerrados", () => {
  const payload = { groupId: "opaque", nombre: " Grupo ", expectedEditToken: "a".repeat(64), idempotencyKey: "group-update-123456" };
  assert.equal(validateUpdateOwnGroupNamePayload(payload), payload);
  for (const field of ["ownerId", "deporte", "estado", "schemaVersion", "createdAt", "updatedAt", "patch", "fieldMask", "personaId", "membershipId"]) {
    assert.throws(() => validateUpdateOwnGroupNamePayload({ ...payload, [field]: "x" }), GroupValidationError);
  }
  for (const groupId of ["", ".", "..", "a/b", "__hidden__", "__\n__", "x".repeat(1501), " id", "id "]) assert.throws(() => validateUpdateOwnGroupNamePayload({ ...payload, groupId }), GroupValidationError);
  for (const token of ["A".repeat(64), "a".repeat(63), "g".repeat(64), 1]) assert.throws(() => validateUpdateOwnGroupNamePayload({ ...payload, expectedEditToken: token }), GroupValidationError);
  assert.throws(() => validateUpdateOwnGroupNamePayload({ ...payload, nombre: null }), GroupValidationError);
});

test("clave de idempotencia conserva identidad y aplica formato 16–128", () => {
  const base = { nombre: "Grupo", deporte: "voleibol" };
  for (const key of ["short", "x".repeat(129), "x".repeat(15) + " ", "x".repeat(15) + "/"]) {
    assert.throws(() => validateCreateGroupPayload({ ...base, idempotencyKey: key }), GroupValidationError);
  }
  assert.doesNotThrow(() => validateCreateGroupPayload({ ...base, idempotencyKey: "A._:-0123456789ab" }));
});

test("contratos de consulta son cerrados y validan groupId", () => {
  assert.deepEqual(validateEmptyPayload(undefined), {});
  assert.deepEqual(validateEmptyPayload({}), {});
  assert.throws(() => validateEmptyPayload({ userId: "x" }), GroupValidationError);
  assert.equal(validateGroupIdPayload({ groupId: "opaque-id" }).groupId, "opaque-id");
  for (const groupId of ["", " id", "id ", "a/b"]) assert.throws(() => validateGroupIdPayload({ groupId }), GroupValidationError);
});

test("identidad proviene exclusivamente del contexto y errores exponen reasons estables", () => {
  assert.deepEqual(identityFromCallableContext({ auth: { uid: "uid", token: { roles: "admin" } } }), { userId: "uid" });
  assert.throws(() => identityFromCallableContext({}), { reason: "UNAUTHENTICATED" });
  const httpsError = toHttpsError(new GroupValidationError());
  assert.equal(httpsError.code, "invalid-argument");
  assert.deepEqual(httpsError.details, { reason: "VALIDATION_FAILED" });
});
