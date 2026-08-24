"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createSelfPersonBootstrapService } = require("../../src/application/selfPersonBootstrapService");
const {
  AuthenticationRequiredError,
  InvalidPersonDataError,
  PersonPersistenceError,
  AccountNotInitializedError,
} = require("../../src/application/selfPersonBootstrapErrors");

function dependencies(overrides = {}) {
  return {
    unitOfWork: {
      newPersonId: () => "opaque-id",
      ensureInitialLink: async ({ person }) => ({ outcome: "created", person }),
      ...overrides.unitOfWork,
    },
    selfPersonReader: {
      getByUserId: async () => null,
      ...overrides.selfPersonReader,
    },
  };
}

const validInput = { firstName: " Ana ", lastName: " Díaz ", contactEmail: " Ana@Example.INVALID " };

test("coordinador crea y devuelve sólo el contrato público", async () => {
  const service = createSelfPersonBootstrapService(dependencies());
  assert.deepEqual(await service.ensureMyPerson({ userId: "uid" }, validInput), {
    outcome: "created",
    person: { personId: "opaque-id", firstName: "Ana", lastName: "Díaz", contactEmail: "Ana@Example.INVALID" },
  });
});

test("get admite una cuenta todavía sin vínculo", async () => {
  const service = createSelfPersonBootstrapService(dependencies());
  assert.deepEqual(await service.getMyPerson({ userId: "uid" }), { person: null });
});

test("devuelve Persona existente sin reinterpretar el payload nuevo", async () => {
  const persisted = { personId: "persisted-id", nombre: "Original", apellido: "Persistido", emailContacto: "original@example.invalid" };
  const service = createSelfPersonBootstrapService(dependencies({
    unitOfWork: { ensureInitialLink: async () => ({ outcome: "existing", person: persisted }) },
  }));
  assert.deepEqual(await service.ensureMyPerson({ userId: "uid" }, validInput), {
    outcome: "existing",
    person: { personId: "persisted-id", firstName: "Original", lastName: "Persistido", contactEmail: "original@example.invalid" },
  });
});

test("conserva errores funcionales de cuenta sin convertirlos a internal", async () => {
  const service = createSelfPersonBootstrapService(dependencies({
    selfPersonReader: { getByUserId: async () => { throw new AccountNotInitializedError(); } },
  }));
  await assert.rejects(() => service.getMyPerson({ userId: "uid" }), AccountNotInitializedError);
});

test("rechaza identidad y datos inválidos con errores estables", async () => {
  const service = createSelfPersonBootstrapService(dependencies());
  await assert.rejects(() => service.ensureMyPerson(null, validInput), AuthenticationRequiredError);
  await assert.rejects(() => service.ensureMyPerson({ userId: "uid" }, { ...validInput, contactEmail: "invalid" }), InvalidPersonDataError);
});

test("encapsula fallos inesperados de persistencia", async () => {
  const failure = new Error("synthetic failure");
  const service = createSelfPersonBootstrapService(dependencies({
    unitOfWork: { ensureInitialLink: async () => { throw failure; } },
  }));
  await assert.rejects(
    () => service.ensureMyPerson({ userId: "uid" }, validInput),
    (error) => error instanceof PersonPersistenceError && error.cause === failure
  );
});
