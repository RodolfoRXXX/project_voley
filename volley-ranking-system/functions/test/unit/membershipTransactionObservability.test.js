"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { MembershipDependencyUnavailableError, MembershipTargetNotActiveError } = require("../../src/memberships/application/membershipErrors");
const { createFirestoreMembershipAdministrativeFinalizationStore } = require("../../src/memberships/infrastructure/firestoreMembershipAdministrativeFinalizationStore");
const { createFirestoreMembershipCargoStore } = require("../../src/memberships/infrastructure/firestoreMembershipCargoStore");
const { toMembershipHttpsError } = require("../../src/memberships/infrastructure/membershipCallable");
const { createMembershipTransactionObserver, sanitizedErrorType, technicalCode } = require("../../src/memberships/infrastructure/membershipTransactionObservability");

const dependencies = Object.freeze({ membershipRepository: {}, groupCapability: {}, personCapability: {} });
const secretValues = ["cargo-confidencial", "owner@example.invalid", "uid-private", "group-private", "membership-private", "raw-token", "request-hash-private"];

function observerFor(events, times = [100, 110, 130], logger = null) {
  let index = 0;
  return createMembershipTransactionObserver({
    logger: logger || { warn(name, event) { events.push({ name, event }); } },
    now: () => times[Math.min(index++, times.length - 1)],
    createCorrelationId: () => "4d12f04a-4ced-47c6-a3d7-a7bfdb8dc356",
  });
}

test("inyección controlada: cargo correlaciona transacción y recovery sin datos sensibles y conserva el error original", async () => {
  const events = [];
  const initial = Object.assign(new Error(secretValues[0]), { code: 10, uid: secretValues[2], groupId: secretValues[3] });
  const recovery = Object.assign(new Error(secretValues[1]), { code: 14, membershipId: secretValues[4], token: secretValues[5] });
  let invocation = 0;
  const store = createFirestoreMembershipCargoStore({
    db: { collection() { return { doc() { return {}; } }; }, async runTransaction() { invocation += 1; throw invocation === 1 ? initial : recovery; } },
    ...dependencies,
    transactionObserver: observerFor(events),
  });
  let mapped;
  await assert.rejects(() => store.confirm({}), (error) => { mapped = error; return error instanceof MembershipDependencyUnavailableError && error.cause === recovery; });
  assert.equal(invocation, 2);
  assert.deepEqual(events, [
    { name: "membership.transaction-technical-error", event: { operation: "membership-cargo-update", phase: "transaction", technicalCode: 10, errorType: "CODED_ERROR", durationMs: 10, correlationId: "4d12f04a-4ced-47c6-a3d7-a7bfdb8dc356" } },
    { name: "membership.transaction-technical-error", event: { operation: "membership-cargo-update", phase: "recovery", technicalCode: 14, errorType: "CODED_ERROR", durationMs: 30, correlationId: "4d12f04a-4ced-47c6-a3d7-a7bfdb8dc356" } },
  ]);
  const serialized = JSON.stringify(events);
  for (const secret of secretValues) assert.equal(serialized.includes(secret), false);
  const publicError = toMembershipHttpsError(mapped);
  assert.equal(publicError.code, "unavailable");
  assert.deepEqual(publicError.details, { reason: "DEPENDENCY_UNAVAILABLE" });
});

test("inyección controlada: finalización registra código ausente como null y conserva mapping público", async () => {
  const events = [];
  const original = new Error(secretValues[6]);
  const store = createFirestoreMembershipAdministrativeFinalizationStore({
    db: { collection() { return { doc() { return {}; } }; }, async runTransaction() { throw original; } },
    ...dependencies,
    transactionObserver: observerFor(events, [200, 225]),
  });
  let mapped;
  await assert.rejects(() => store.confirm({}), (error) => { mapped = error; return error instanceof MembershipDependencyUnavailableError && error.cause === original; });
  assert.deepEqual(events, [{
    name: "membership.transaction-technical-error",
    event: { operation: "administrative-finalization", phase: "mapping", technicalCode: null, errorType: "UNCODED_ERROR", durationMs: 25, correlationId: "4d12f04a-4ced-47c6-a3d7-a7bfdb8dc356" },
  }]);
  assert.equal(JSON.stringify(events).includes(secretValues[6]), false);
  const publicError = toMembershipHttpsError(mapped);
  assert.equal(publicError.code, "unavailable");
  assert.deepEqual(publicError.details, { reason: "DEPENDENCY_UNAVAILABLE" });
});

test("inyección controlada: error funcional esperado no genera alerta técnica", async () => {
  const events = [];
  const functional = new MembershipTargetNotActiveError();
  const store = createFirestoreMembershipCargoStore({
    db: { collection() { return { doc() { return {}; } }; }, async runTransaction() { throw functional; } },
    ...dependencies,
    transactionObserver: observerFor(events),
  });
  await assert.rejects(() => store.confirm({}), (error) => error === functional);
  assert.deepEqual(events, []);
});

test("inyección controlada: fallo del logger no altera resultado ni oculta causa", async () => {
  const original = Object.assign(new Error("technical"), { code: 4 });
  const store = createFirestoreMembershipAdministrativeFinalizationStore({
    db: { collection() { return { doc() { return {}; } }; }, async runTransaction() { throw original; } },
    ...dependencies,
    transactionObserver: observerFor([], [300, 310], { warn() { throw new Error("logger failed"); } }),
  });
  await assert.rejects(
    () => store.confirm({}),
    (error) => error instanceof MembershipDependencyUnavailableError && error.cause === original
  );
});

test("inyección controlada: recovery exitoso conserva resultado y una sola evidencia correlacionada", async () => {
  const events = [];
  const initial = Object.assign(new Error("aborted"), { code: "ABORTED" });
  const recovered = Object.freeze({ outcome: "UPDATED", recovered: true });
  let invocation = 0;
  const store = createFirestoreMembershipCargoStore({
    db: { collection() { return { doc() { return {}; } }; }, async runTransaction() { invocation += 1; if (invocation === 1) throw initial; return recovered; } },
    ...dependencies,
    transactionObserver: observerFor(events, [400, 412]),
  });
  assert.equal(await store.confirm({}), recovered);
  assert.deepEqual(events, [{
    name: "membership.transaction-technical-error",
    event: { operation: "membership-cargo-update", phase: "transaction", technicalCode: "ABORTED", errorType: "CODED_ERROR", durationMs: 12, correlationId: "4d12f04a-4ced-47c6-a3d7-a7bfdb8dc356" },
  }]);
});

test("clasificación sanitizada limita códigos y tipos", () => {
  assert.equal(technicalCode({ code: "unsafe code with spaces" }), null);
  assert.equal(technicalCode({ code: "grpc/14" }), "grpc/14");
  assert.equal(technicalCode({ cause: { cause: { code: 10 } } }), 10);
  const first = {}; const second = { cause: first }; first.cause = second;
  assert.equal(technicalCode(first), null);
  assert.equal(sanitizedErrorType(new Error("private")), "UNCODED_ERROR");
  assert.equal(sanitizedErrorType("private"), "NON_ERROR_THROWN");
});
