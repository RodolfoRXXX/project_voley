"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { hydrateMembership } = require("../../src/memberships/domain/membership");
const { membershipLifecycleGuardId } = require("../../src/memberships/application/membershipHashing");
const { activeMembershipGuardId } = require("../../src/memberships/application/membershipHashing");
const { MembershipIncompatibleStateError } = require("../../src/memberships/application/membershipErrors");
const { MEMBERSHIP_LIFECYCLE_GUARD_FIELDS, assertFinalizedMembershipCorrelated, createFirestoreMembershipLifecycleGuard, hydrateMembershipLifecycleGuard, sameTimestamp } = require("../../src/memberships/infrastructure/firestoreMembershipLifecycleGuard");

const timestamp = { toDate: () => new Date("2026-09-01T12:00:00.000Z"), isEqual: (other) => other === timestamp };
const id = membershipLifecycleGuardId("group-1", "person-1");
const data = {
  membershipId: "membership-1", personId: "person-1", groupId: "group-1", seasonId: "season-1",
  creationIdempotencyKeyHash: "a".repeat(64), creationRequestHash: "b".repeat(64), finalizedAt: timestamp,
  lifecycleGuardVersion: 1,
};
const snapshot = (value = data, snapshotId = id) => ({ exists: true, id: snapshotId, data: () => value });

test("E2-05 lifecycle v1 posee ID, campos y versión exactos", () => {
  const guard = hydrateMembershipLifecycleGuard(snapshot(), { guardId: id, personId: "person-1", groupId: "group-1" });
  assert.deepEqual(Object.keys(guard).sort(), [...MEMBERSHIP_LIFECYCLE_GUARD_FIELDS].sort());
  for (const invalid of [{ ...data, extra: true }, { ...data, lifecycleGuardVersion: 2 }, { ...data, creationRequestHash: "raw" }, { ...data, finalizedAt: new Date() }]) {
    assert.throws(() => hydrateMembershipLifecycleGuard(snapshot(invalid), { guardId: id, personId: "person-1", groupId: "group-1" }), MembershipIncompatibleStateError);
  }
});

test("E2-05 lifecycle correlaciona finalizada y fechaEgreso exacta", () => {
  const membership = hydrateMembership("membership-1", {
    personId: "person-1", groupId: "group-1", seasonId: "season-1", estado: "finalizada",
    fechaIngreso: { toDate: () => new Date("2026-08-01T12:00:00.000Z") }, fechaEgreso: timestamp,
    createdAt: { toDate: () => new Date("2026-08-01T12:00:00.000Z") }, schemaVersion: 2,
  });
  assert.doesNotThrow(() => assertFinalizedMembershipCorrelated(membership, data));
  assert.equal(sameTimestamp(timestamp, timestamp), true);
  assert.throws(() => assertFinalizedMembershipCorrelated({ ...membership, seasonId: "other" }, data), MembershipIncompatibleStateError);
});

test("E2-05 usa una sola lectura del reloj inyectado para Membresía y lifecycle", async () => {
  const ingreso = { toDate: () => new Date("2026-08-01T12:00:00.000Z") };
  const egreso = { toDate: () => new Date("2026-09-01T12:00:00.000Z") };
  const membership = hydrateMembership("membership-1", {
    personId: "person-1", groupId: "group-1", seasonId: "season-1", estado: "activa",
    fechaIngreso: ingreso, createdAt: ingreso, schemaVersion: 1,
  });
  const activeId = activeMembershipGuardId("group-1", "person-1");
  const active = {
    membershipId: "membership-1", personId: "person-1", groupId: "group-1", seasonId: "season-1",
    idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: ingreso, guardVersion: 1,
  };
  const writes = [];
  const ref = (collection, refId) => ({ collection, id: refId });
  const transaction = {
    async getAll() {
      return [
        { exists: true, id: activeId, data: () => active },
        { exists: false, id, data: () => undefined },
      ];
    },
    async get() { return { empty: false, docs: [{ id: "membership-1" }] }; },
    delete(value) { writes.push({ type: "delete", value }); },
    create(value, body) { writes.push({ type: "create", value, body }); },
    update(value, body) { writes.push({ type: "update", value, body }); },
  };
  let clockCalls = 0;
  const membershipRepository = {
    async getById() { return membership; },
    activePairQuery() { return { kind: "active-query" }; },
    finalizedPairQuery() { return { kind: "finalized-query" }; },
    fromSnapshot() { return membership; },
    updateFinalized(tx, finalizedMembership) {
      tx.update(ref("memberships", finalizedMembership.membershipId), {
        estado: finalizedMembership.estado,
        fechaEgreso: finalizedMembership.fechaEgreso,
        schemaVersion: finalizedMembership.schemaVersion,
      });
    },
  };
  const guard = createFirestoreMembershipLifecycleGuard({
    db: {
      collection(collection) { return { doc: (refId) => ref(collection, refId) }; },
      async runTransaction(callback) { return callback(transaction); },
    },
    groupRepository: { async getById() { return { id: "group-1", estado: "activo", ownerId: "uid" }; } },
    now() { clockCalls += 1; return egreso; },
  });
  const result = await guard.finalizeForOwner({
    userId: "uid", personId: "person-1", groupId: "group-1", openSeasonId: "season-1", membershipRepository,
  });
  assert.equal(result.outcome, "FINALIZED");
  assert.equal(clockCalls, 1);
  assert.equal(result.membership.fechaEgreso, egreso);
  assert.equal(writes.find((entry) => entry.type === "create").body.finalizedAt, egreso);
  assert.deepEqual(writes.map((entry) => entry.type), ["update", "delete", "create"]);
});
