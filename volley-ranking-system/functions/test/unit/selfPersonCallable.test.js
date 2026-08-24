"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  assertEmptyPayload,
  assertEnsurePayload,
  createSelfPersonCallableHandler,
  identityFromCallableContext,
  toHttpsError,
} = require("../../src/infrastructure/selfPersonBootstrapCallable");
const {
  AuthenticationRequiredError,
  ConcurrentModificationError,
  InvalidPersonDataError,
  PersonLinkInconsistentError,
} = require("../../src/application/selfPersonBootstrapErrors");

test("contratos aceptan sólo los payloads cerrados aprobados", () => {
  assert.doesNotThrow(() => assertEmptyPayload({}));
  assert.doesNotThrow(() => assertEnsurePayload({ firstName: "A", lastName: "B", contactEmail: "a@example.invalid" }));
  for (const payload of [null, {}, { firstName: "A", lastName: "B", contactEmail: "a@example.invalid", userId: "other" }]) {
    assert.throws(() => assertEnsurePayload(payload), InvalidPersonDataError);
  }
  assert.throws(() => assertEmptyPayload({ personaId: "id" }), InvalidPersonDataError);
});

test("identidad deriva únicamente del contexto autenticado", () => {
  assert.deepEqual(identityFromCallableContext({ auth: { uid: "self", token: { roles: "admin" } } }), { userId: "self" });
  assert.throws(() => identityFromCallableContext({}), AuthenticationRequiredError);
});

test("HttpsError conserva código y details.reason sin internals", () => {
  const inconsistent = toHttpsError(new PersonLinkInconsistentError());
  assert.equal(inconsistent.code, "failed-precondition");
  assert.deepEqual(inconsistent.details, { reason: "PERSON_LINK_INCONSISTENT" });
  const concurrent = toHttpsError(new ConcurrentModificationError());
  assert.equal(concurrent.code, "aborted");
  assert.deepEqual(concurrent.details, { reason: "CONCURRENT_MODIFICATION" });
});

test("errores internos se registran sin internals y conservan el HttpsError público", async () => {
  const originalConsoleError = console.error;
  const loggedArguments = [];
  const infrastructureError = Object.assign(new Error("database secret"), {
    stack: "sensitive stack",
    code: "permission-denied",
    details: { document: "users/sensitive-uid" },
  });
  console.error = (...args) => loggedArguments.push(args);

  try {
    const handler = createSelfPersonCallableHandler({
      operation: async () => {
        throw infrastructureError;
      },
      validatePayload: assertEmptyPayload,
    });

    await assert.rejects(
      handler({}, { auth: { uid: "sensitive-uid" } }),
      (error) => {
        assert.equal(error.code, "internal");
        assert.deepEqual(error.details, { reason: "PERSON_PERSISTENCE_FAILED" });
        return true;
      },
    );
    assert.deepEqual(loggedArguments, [["Person callable failed"]]);
    assert.equal(loggedArguments.flat().includes(infrastructureError), false);
    assert.equal(loggedArguments.flat().some((value) => value === infrastructureError.message), false);
    assert.equal(loggedArguments.flat().some((value) => value === infrastructureError.stack), false);
    assert.equal(loggedArguments.flat().some((value) => value === infrastructureError.code), false);
    assert.equal(loggedArguments.flat().some((value) => value === infrastructureError.details), false);
  } finally {
    console.error = originalConsoleError;
  }
});
