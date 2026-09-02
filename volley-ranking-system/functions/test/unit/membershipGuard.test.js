"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { activeMembershipGuardId } = require("../../src/memberships/application/membershipHashing");
const {
  MembershipAlreadyExistsError,
  MembershipConflictError,
  MembershipDependencyUnavailableError,
  MembershipIncompatibleStateError,
  MembershipNotFoundError,
  MembershipReactivationRequiredError,
} = require("../../src/memberships/application/membershipErrors");
const {
  ACTIVE_MEMBERSHIP_GUARD_FIELDS,
  assertMembershipCorrelated,
  createFirestoreActiveMembershipGuard,
  hydrateActiveMembershipGuard,
  isAmbiguousTransactionFailure,
  isClosedFinalizedMembershipQueryFailure,
  isMembershipContention,
  mapInfrastructureError,
  resolveAfterContention,
} = require("../../src/memberships/infrastructure/firestoreActiveMembershipGuard");

const timestamp = { toDate: () => new Date("2026-08-27T12:00:00.000Z") };
const context = { personId: "person-1", groupId: "group-1" };
const guardId = activeMembershipGuardId(context.groupId, context.personId);
const data = { membershipId: "membership-1", ...context, seasonId: "season-1", idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: timestamp, guardVersion: 1 };

function snapshot(overrides = {}, id = guardId) { return { exists: true, id, data: () => ({ ...data, ...overrides }) }; }

test("guard exacto se hidrata y conserva ocho campos", () => {
  assert.deepEqual(hydrateActiveMembershipGuard(snapshot(), { guardId, ...context }), data);
  assert.deepEqual(Object.keys(data).sort(), [...ACTIVE_MEMBERSHIP_GUARD_FIELDS].sort());
});

test("guard incompatible, colisión y clave cruda fallan cerrado", () => {
  for (const value of [snapshot({ extra: true }), snapshot({ personId: "other" }), snapshot({ requestHash: "bad" }), snapshot({}, "wrong-id")]) {
    assert.throws(() => hydrateActiveMembershipGuard(value, { guardId, ...context }), MembershipIncompatibleStateError);
  }
});

test("Membresía correlacionada debe coincidir íntegramente", () => {
  const membership = { membershipId: "membership-1", ...context, seasonId: "season-1", estado: "activa" };
  assert.doesNotThrow(() => assertMembershipCorrelated(membership, data));
  for (const broken of [null, { ...membership, seasonId: "other" }, { ...membership, estado: "inactiva" }]) {
    assert.throws(() => assertMembershipCorrelated(broken, data), MembershipIncompatibleStateError);
  }
});

test("contención reconoce códigos gRPC numéricos, textuales y causas envueltas", () => {
  for (const error of [
    { code: 6 },
    { code: 10 },
    { code: "already-exists" },
    { code: "ABORTED" },
    { cause: { code: 6 } },
    { cause: { cause: { code: "aborted" } } },
  ]) {
    assert.equal(isMembershipContention(error), true);
  }
  const unknown = Object.assign(new Error("unknown"), { code: 13 });
  assert.equal(isMembershipContention(unknown), false);
  assert.equal(isAmbiguousTransactionFailure(unknown), true);
  assert.equal(isAmbiguousTransactionFailure({ code: "INTERNAL" }), true);
  assert.equal(isAmbiguousTransactionFailure({ cause: { code: 2 } }), true);
  assert.equal(isAmbiguousTransactionFailure({ code: 12 }), false);
  assert.equal(mapInfrastructureError(unknown), unknown);
});

function resolutionSetup({ guardSnapshot = snapshot(), persisted, activeEmpty = true } = {}) {
  const reads = [];
  const membership = {
    membershipId: "membership-candidate",
    ...context,
    seasonId: "season-1",
    estado: "activa",
  };
  const stored = persisted === undefined
    ? { membershipId: "membership-1", ...context, seasonId: "season-1", estado: "activa" }
    : persisted;
  return {
    reads,
    input: {
      guardRef: { async get() { reads.push("guard"); return guardSnapshot; } },
      guardId,
      membership,
      idempotencyKeyHash: "a".repeat(64),
      requestHash: "b".repeat(64),
      membershipRepository: {
        async getById(id) { reads.push(`membership:${id}`); return stored; },
        activePairQuery() {
          return { async get() { reads.push("active-pair"); return { empty: activeEmpty }; } };
        },
      },
    },
  };
}

test("relectura tras contención converge para la misma intención sin escribir", async () => {
  const { input: resolution, reads } = resolutionSetup();
  const result = await resolveAfterContention(resolution);
  assert.equal(result.outcome, "EXISTING_IDEMPOTENT");
  assert.equal(result.membershipId, "membership-1");
  assert.deepEqual(reads, ["guard", "membership:membership-1"]);
  assert.equal(Object.hasOwn(resolution.guardRef, "set"), false);
  assert.equal(Object.hasOwn(resolution.membershipRepository, "createInitial"), false);
});

test("confirmación enruta ABORTED envuelto hacia la relectura autoritativa", async () => {
  const { input: resolution, reads } = resolutionSetup();
  const db = {
    collection(name) {
      assert.equal(name, "activeMembershipGuards");
      return { doc(id) { assert.equal(id, guardId); return resolution.guardRef; } };
    },
    async runTransaction() {
      throw Object.assign(new Error("wrapped"), { cause: { code: 10 } });
    },
  };
  const guard = createFirestoreActiveMembershipGuard({ db, groupRepository: {} });
  const result = await guard.confirmActiveMembership({
    userId: "owner-1",
    membership: resolution.membership,
    guardId,
    idempotencyKeyHash: resolution.idempotencyKeyHash,
    requestHash: resolution.requestHash,
    membershipRepository: resolution.membershipRepository,
  });
  assert.equal(result.outcome, "EXISTING_IDEMPOTENT");
  assert.deepEqual(reads, ["guard", "membership:membership-1"]);
});

test("INTERNAL transaccional sólo resuelve con competidor confirmado", async () => {
  const confirmed = resolutionSetup();
  confirmed.input.idempotencyKeyHash = "c".repeat(64);
  const confirmedDb = {
    collection() { return { doc() { return confirmed.input.guardRef; } }; },
    async runTransaction() { throw Object.assign(new Error("internal"), { code: 13 }); },
  };
  const confirmedGuard = createFirestoreActiveMembershipGuard({ db: confirmedDb, groupRepository: {} });
  await assert.rejects(() => confirmedGuard.confirmActiveMembership({
    userId: "owner-1",
    membership: confirmed.input.membership,
    guardId,
    idempotencyKeyHash: confirmed.input.idempotencyKeyHash,
    requestHash: confirmed.input.requestHash,
    membershipRepository: confirmed.input.membershipRepository,
  }), MembershipAlreadyExistsError);
  assert.deepEqual(confirmed.reads, ["guard", "membership:membership-1"]);

  const absentSnapshot = { exists: false, id: guardId, data: () => undefined };
  const absent = resolutionSetup({ guardSnapshot: absentSnapshot });
  const original = Object.assign(new Error("internal"), { code: 13 });
  const absentDb = {
    collection() { return { doc() { return absent.input.guardRef; } }; },
    async runTransaction() { throw original; },
  };
  const absentGuard = createFirestoreActiveMembershipGuard({ db: absentDb, groupRepository: {} });
  await assert.rejects(() => absentGuard.confirmActiveMembership({
    userId: "owner-1",
    membership: absent.input.membership,
    guardId,
    idempotencyKeyHash: absent.input.idempotencyKeyHash,
    requestHash: absent.input.requestHash,
    membershipRepository: absent.input.membershipRepository,
  }), (error) => error === original);
  assert.deepEqual(absent.reads, ["guard", "active-pair"]);
});

function finalizedQueryCode3Setup(authoritativeResult) {
  const original = Object.assign(new Error("arbitrary diagnostic text"), { code: 3 });
  const membership = {
    membershipId: "membership-candidate",
    ...context,
    seasonId: "season-1",
    estado: "activa",
  };
  const activeGuard = {
    membershipId: "membership-stored",
    ...context,
    seasonId: "season-1",
    idempotencyKeyHash: "a".repeat(64),
    requestHash: "b".repeat(64),
    createdAt: timestamp,
    guardVersion: 1,
  };
  const stored = { ...membership, membershipId: "membership-stored" };
  const lifecycleGuard = {
    reference() { return { kind: "lifecycle-ref" }; },
    hydrate() { return null; },
    async getForOwner() {
      if (authoritativeResult instanceof Error) throw authoritativeResult;
      return authoritativeResult || { kind: "active-only", membership: stored, activeGuard };
    },
  };
  const membershipRepository = {
    activePairQuery() { return { kind: "active-query" }; },
    finalizedPairQuery() { return { kind: "finalized-query" }; },
    createInitial() { assert.fail("code 3 must not reach writes"); },
  };
  const transaction = {
    async getAll() {
      return [
        { exists: false, id: guardId, data: () => undefined },
        { exists: false, id: "lifecycle", data: () => undefined },
      ];
    },
    async get(query) {
      if (query.kind === "active-query") return { empty: true };
      if (query.kind === "finalized-query") throw original;
      throw new Error("unexpected query");
    },
  };
  const db = {
    collection() { return { doc() { return { kind: "active-ref" }; } }; },
    async runTransaction(callback) { return callback(transaction); },
  };
  const guard = createFirestoreActiveMembershipGuard({
    db,
    groupRepository: { async getById() { return { estado: "activo", ownerId: "owner-1" }; } },
  });
  return {
    original,
    activeGuard,
    stored,
    invoke(overrides = {}) {
      return guard.confirmActiveMembership({
        userId: "owner-1",
        membership,
        guardId,
        lifecycleGuardId: "lifecycle",
        idempotencyKeyHash: "a".repeat(64),
        requestHash: "b".repeat(64),
        membershipRepository,
        lifecycleGuard,
        ...overrides,
      });
    },
  };
}

test("code 3 de finalized query recupera sólo una intención activa autoritativamente confirmada", async () => {
  const same = finalizedQueryCode3Setup();
  const result = await same.invoke();
  assert.equal(result.outcome, "EXISTING_IDEMPOTENT");
  assert.equal(result.membership, same.stored);
  assert.equal(isClosedFinalizedMembershipQueryFailure(same.original), true);
  assert.equal(isMembershipContention(same.original), false);
  assert.equal(isAmbiguousTransactionFailure(same.original), false);

  const differentState = {
    kind: "active-only",
    membership: same.stored,
    activeGuard: { ...same.activeGuard, idempotencyKeyHash: "c".repeat(64) },
  };
  await assert.rejects(() => finalizedQueryCode3Setup(differentState).invoke(), MembershipAlreadyExistsError);
});

test("code 3 de finalized query distingue lifecycle, corrupción y ausencia sin DTO activo falso", async () => {
  const finalizedMembership = { ...finalizedQueryCode3Setup().stored, estado: "finalizada", schemaVersion: 2 };
  await assert.rejects(
    () => finalizedQueryCode3Setup({ kind: "lifecycle-only", membership: finalizedMembership }).invoke(),
    MembershipReactivationRequiredError
  );
  await assert.rejects(
    () => finalizedQueryCode3Setup(new MembershipIncompatibleStateError()).invoke(),
    MembershipIncompatibleStateError
  );
  const absent = finalizedQueryCode3Setup(new MembershipNotFoundError());
  await assert.rejects(() => absent.invoke(), (error) => error === absent.original);
});

test("relectura tras contención confirma Membresía de otra intención", async () => {
  const { input: resolution, reads } = resolutionSetup();
  resolution.idempotencyKeyHash = "c".repeat(64);
  await assert.rejects(() => resolveAfterContention(resolution), MembershipAlreadyExistsError);
  assert.deepEqual(reads, ["guard", "membership:membership-1"]);
});

test("relectura tras contención sin resultado confirmado devuelve CONFLICT", async () => {
  const absent = { exists: false, id: guardId, data: () => undefined };
  const { input: resolution, reads } = resolutionSetup({ guardSnapshot: absent });
  await assert.rejects(() => resolveAfterContention(resolution), MembershipConflictError);
  assert.deepEqual(reads, ["guard", "active-pair"]);
});

test("relectura tras contención falla cerrado ante guard, Membresía u orfandad incompatibles", async () => {
  const invalidGuard = resolutionSetup({ guardSnapshot: snapshot({ requestHash: "invalid" }) });
  await assert.rejects(() => resolveAfterContention(invalidGuard.input), MembershipIncompatibleStateError);

  const invalidMembership = resolutionSetup({
    persisted: { membershipId: "membership-1", ...context, seasonId: "other", estado: "activa" },
  });
  await assert.rejects(() => resolveAfterContention(invalidMembership.input), MembershipIncompatibleStateError);

  const absent = { exists: false, id: guardId, data: () => undefined };
  const orphan = resolutionSetup({ guardSnapshot: absent, activeEmpty: false });
  await assert.rejects(() => resolveAfterContention(orphan.input), MembershipIncompatibleStateError);
});

test("relectura transitoria conocida conserva DEPENDENCY_UNAVAILABLE", async () => {
  const { input: resolution } = resolutionSetup();
  resolution.guardRef.get = async () => {
    throw Object.assign(new Error("wrapped"), { cause: { code: 14 } });
  };
  await assert.rejects(() => resolveAfterContention(resolution), MembershipDependencyUnavailableError);
});
