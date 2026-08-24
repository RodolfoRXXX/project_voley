"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createFirestoreSelfPersonBootstrapUnitOfWork } = require("../../src/infrastructure/firestoreSelfPersonBootstrapUnitOfWork");
const {
  AccountNotInitializedError,
  ConcurrentModificationError,
  PersonPersistenceError,
  PersonServiceUnavailableError,
} = require("../../src/application/selfPersonBootstrapErrors");

function setup({ user = null, transactionError = null } = {}) {
  const calls = { personCreate: 0, userLink: 0 };
  const transaction = {};
  const db = {
    async runTransaction(operation) {
      if (transactionError) throw transactionError;
      return operation(transaction);
    },
  };
  const userRepository = {
    async getById() { return user; },
    setInitialPersonLink() { calls.userLink += 1; },
  };
  const personRepository = {
    newId() { return "opaque-id"; },
    async getById() { return null; },
    createInitial() { calls.personCreate += 1; },
  };
  return {
    calls,
    unit: createFirestoreSelfPersonBootstrapUnitOfWork({ db, userRepository, personRepository }),
  };
}

const person = { personId: "opaque-id", nombre: "Ana", apellido: "Díaz", emailContacto: "ana@example.invalid" };

test("fallo previo al commit no escribe ninguna raíz", async () => {
  const { calls, unit } = setup();
  await assert.rejects(() => unit.ensureInitialLink({ userId: "uid", person }), AccountNotInitializedError);
  assert.deepEqual(calls, { personCreate: 0, userLink: 0 });
});

test("unidad confirma Persona y vínculo mediante puertos acotados", async () => {
  const { calls, unit } = setup({ user: { email: "account@example.invalid" } });
  assert.deepEqual(await unit.ensureInitialLink({ userId: "uid", person }), { outcome: "created", person });
  assert.deepEqual(calls, { personCreate: 1, userLink: 1 });
});

test("mapea conflicto agotado, indisponibilidad y fallo interno", async () => {
  for (const [code, ErrorType] of [[10, ConcurrentModificationError], [14, PersonServiceUnavailableError], ["OTHER", PersonPersistenceError]]) {
    const { unit } = setup({ transactionError: Object.assign(new Error("synthetic"), { code }) });
    await assert.rejects(() => unit.ensureInitialLink({ userId: "uid", person }), ErrorType);
  }
});
