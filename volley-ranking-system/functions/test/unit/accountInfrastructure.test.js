"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const functions = require("firebase-functions/v1");
const {
  AccountIdentityIncompleteError,
  AccountInvalidArgumentError,
  AccountNotFoundError,
  AccountUnauthenticatedError,
} = require("../../src/users/application/accountErrors");
const {
  assertEmptyPayload,
  identityFromCallableContext,
} = require("../../src/users/infrastructure/callableAuthenticatedIdentity");
const {
  createAccountCallableHandler,
  toHttpsError,
} = require("../../src/users/infrastructure/accountCallable");
const {
  isAlreadyExistsError,
} = require("../../src/users/infrastructure/firestoreUserRepository");

test("payload acepta sólo ausencia o un objeto vacío", () => {
  assert.doesNotThrow(() => assertEmptyPayload(undefined));
  assert.doesNotThrow(() => assertEmptyPayload(null));
  assert.doesNotThrow(() => assertEmptyPayload({}));
  for (const payload of [{ userId: "other" }, [], "", 1]) {
    assert.throws(() => assertEmptyPayload(payload), AccountInvalidArgumentError);
  }
});

test("identidad callable se deriva exclusivamente del contexto autenticado", () => {
  assert.deepEqual(
    identityFromCallableContext({
      auth: {
        uid: "firebase-uid",
        token: {
          email: "account@example.invalid",
          name: "Cuenta",
          picture: "https://example.invalid/avatar.png",
          roles: "admin",
        },
      },
    }),
    {
      userId: "firebase-uid",
      email: "account@example.invalid",
      displayName: "Cuenta",
      photoUrl: "https://example.invalid/avatar.png",
    }
  );
  assert.throws(() => identityFromCallableContext({}), AccountUnauthenticatedError);
});

test("handler valida transporte antes de ejecutar la operación", async () => {
  let calls = 0;
  const handler = createAccountCallableHandler({
    operation: async () => { calls += 1; return { ok: true }; },
    identityFromContext: identityFromCallableContext,
    validatePayload: assertEmptyPayload,
  });

  await assert.rejects(
    () => handler({ userId: "other" }, { auth: { uid: "self", token: {} } }),
    (error) => error instanceof functions.https.HttpsError
      && error.code === "invalid-argument"
  );
  assert.equal(calls, 0);
});

test("errores de cuenta se traducen a códigos callable estables", () => {
  for (const [error, code] of [
    [new AccountUnauthenticatedError(), "unauthenticated"],
    [new AccountInvalidArgumentError(), "invalid-argument"],
    [new AccountIdentityIncompleteError(), "failed-precondition"],
    [new AccountNotFoundError(), "not-found"],
    [new Error("unknown"), "internal"],
  ]) {
    const translated = toHttpsError(error);
    assert.equal(translated.code, code);
  }
});

test("reconoce ALREADY_EXISTS del SDK y de gRPC", () => {
  for (const code of [6, "6", "already-exists", "ALREADY_EXISTS"]) {
    assert.equal(isAlreadyExistsError({ code }), true);
  }
  assert.equal(isAlreadyExistsError({ code: "permission-denied" }), false);
});
