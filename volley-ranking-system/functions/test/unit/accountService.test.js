"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createAccountService,
} = require("../../src/users/application/accountService");
const {
  AccountAlreadyExistsError,
  AccountIdentityIncompleteError,
  AccountNotFoundError,
  AccountPersistenceError,
  AccountUnauthenticatedError,
} = require("../../src/users/application/accountErrors");

const identity = Object.freeze({
  userId: "firebase-uid",
  email: "account@example.invalid",
  displayName: "Cuenta",
  photoUrl: "https://example.invalid/avatar.png",
});

function expectedDto() {
  return {
    userId: identity.userId,
    displayName: identity.displayName,
    accessEmail: identity.email,
    accountPhotoUrl: identity.photoUrl,
  };
}

function createMemoryRepository() {
  const users = new Map();
  let createCalls = 0;
  let getCalls = 0;

  return {
    users,
    get createCalls() { return createCalls; },
    get getCalls() { return getCalls; },
    async create(userId, user) {
      createCalls += 1;
      if (users.has(userId)) throw new AccountAlreadyExistsError();
      users.set(userId, { ...user, createdAt: { synthetic: true } });
    },
    async getById(userId) {
      getCalls += 1;
      return users.get(userId) || null;
    },
  };
}

test("ensure crea una única cuenta y devuelve el DTO exacto", async () => {
  const repository = createMemoryRepository();
  const service = createAccountService({ userRepository: repository });

  assert.deepEqual(await service.ensureMyAccount(identity), expectedDto());
  assert.deepEqual(repository.users.get(identity.userId), {
    nombre: "Cuenta",
    email: identity.email,
    photoURL: identity.photoUrl,
    createdAt: { synthetic: true },
  });
});

test("ensure recupera la cuenta existente sin actualizarla", async () => {
  const repository = createMemoryRepository();
  repository.users.set(identity.userId, {
    nombre: "Nombre original",
    email: "original@example.invalid",
    photoURL: "",
  });
  const service = createAccountService({ userRepository: repository });

  assert.deepEqual(await service.ensureMyAccount(identity), {
    userId: identity.userId,
    displayName: "Nombre original",
    accessEmail: "original@example.invalid",
    accountPhotoUrl: null,
  });
  assert.equal(repository.getCalls, 1);
});

test("dos ensure concurrentes convergen en un documento y el mismo DTO", async () => {
  const repository = createMemoryRepository();
  const service = createAccountService({ userRepository: repository });

  const results = await Promise.all([
    service.ensureMyAccount(identity),
    service.ensureMyAccount(identity),
  ]);

  assert.deepEqual(results, [expectedDto(), expectedDto()]);
  assert.equal(repository.users.size, 1);
  assert.equal(repository.createCalls, 2);
});

test("reintento después de una respuesta perdida recupera la misma cuenta", async () => {
  const repository = createMemoryRepository();
  const service = createAccountService({ userRepository: repository });

  await service.ensureMyAccount(identity);
  assert.deepEqual(await service.ensureMyAccount(identity), expectedDto());
  assert.equal(repository.users.size, 1);
});

test("get recupera la cuenta y no la crea", async () => {
  const repository = createMemoryRepository();
  repository.users.set(identity.userId, {
    nombre: identity.displayName,
    email: identity.email,
    photoURL: identity.photoUrl,
  });
  const service = createAccountService({ userRepository: repository });

  assert.deepEqual(await service.getMyAccount(identity), expectedDto());
  assert.equal(repository.createCalls, 0);
});

test("rechaza identidad no autenticada o incompleta", async () => {
  const service = createAccountService({ userRepository: createMemoryRepository() });

  await assert.rejects(() => service.ensureMyAccount(null), AccountUnauthenticatedError);
  await assert.rejects(
    () => service.ensureMyAccount({ ...identity, email: "" }),
    AccountIdentityIncompleteError
  );
});

test("get devuelve not-found si Auth existe pero Usuario no", async () => {
  const service = createAccountService({ userRepository: createMemoryRepository() });
  await assert.rejects(() => service.getMyAccount(identity), AccountNotFoundError);
});

test("traduce fallos inesperados del repositorio a internal", async () => {
  const failure = new Error("synthetic repository failure");
  const service = createAccountService({
    userRepository: {
      async create() { throw failure; },
      async getById() { throw failure; },
    },
  });

  await assert.rejects(
    () => service.ensureMyAccount(identity),
    (error) => error instanceof AccountPersistenceError && error.cause === failure
  );
  await assert.rejects(
    () => service.getMyAccount(identity),
    (error) => error instanceof AccountPersistenceError && error.cause === failure
  );
});

test("falla internal si ALREADY_EXISTS no puede recuperarse", async () => {
  const service = createAccountService({
    userRepository: {
      async create() { throw new AccountAlreadyExistsError(); },
      async getById() { return null; },
    },
  });

  await assert.rejects(
    () => service.ensureMyAccount(identity),
    AccountPersistenceError
  );
});
