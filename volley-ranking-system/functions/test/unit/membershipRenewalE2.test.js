"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { Timestamp } = require("firebase-admin/firestore");
const {
  ACTIVE_MEMBERSHIP_V4_FIELDS,
  FINALIZED_MEMBERSHIP_V4_FIELDS,
  buildRenewedMembership,
  createInitialMembership,
  finalizeMembership,
  hydrateMembership,
  reactivateMembership,
} = require("../../src/memberships/domain/membership");
const { membershipLifecycleGuardId, membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");
const { groupJoinRequestRenewalHash } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { hydrateMembershipLifecycleGuard, assertActiveLifecycleCorrelated, assertFinalizedMembershipCorrelated } = require("../../src/memberships/infrastructure/firestoreMembershipLifecycleGuard");
const { buildGroupJoinRequest, hydrateGroupJoinRequest } = require("../../src/groupJoinRequests/domain/groupJoinRequest");
const { createFirestoreGroupJoinRequestRepository } = require("../../src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestRepository");

const at = Timestamp.fromMillis(1_000);
const later = Timestamp.fromMillis(2_000);
function snapshot(id, data) { return { id, exists: true, data: () => data }; }

test("E2-18 raíz v4 exige lineage cerrado y lo preserva al finalizar/reactivar", () => {
  const candidate = buildRenewedMembership({ membershipId: "m-new", previousMembershipId: "m-old", personId: "p", groupId: "g", seasonId: "s-new" });
  const period1Id = membershipValidityPeriodId("m-new", 1);
  const active = createInitialMembership(candidate, at, period1Id);
  assert.deepEqual(Object.keys(active.membership).filter((key) => key !== "membershipId").sort(), [...ACTIVE_MEMBERSHIP_V4_FIELDS].sort());
  assert.equal(active.membership.previousMembershipId, "m-old");
  const finalized = finalizeMembership({ membership: active.membership, finalizedAt: later, firstPeriod: active.periods[0], latestPeriod: active.periods[0] });
  assert.deepEqual(Object.keys(finalized.membership).filter((key) => key !== "membershipId").sort(), [...FINALIZED_MEMBERSHIP_V4_FIELDS].sort());
  assert.equal(finalized.membership.previousMembershipId, "m-old");
  const period2Id = membershipValidityPeriodId("m-new", 2);
  const reactivated = reactivateMembership({ membership: finalized.membership, reactivatedAt: later, firstPeriod: finalized.periods[0], latestPeriod: finalized.periods[0], nextPeriodId: period2Id });
  assert.equal(reactivated.membership.schemaVersion, 4);
  assert.equal(reactivated.membership.previousMembershipId, "m-old");
  assert.throws(() => buildRenewedMembership({ membershipId: "same", previousMembershipId: "same", personId: "p", groupId: "g", seasonId: "s" }));
  assert.throws(() => hydrateMembership("m-new", { ...active.membership, unexpected: true }));
});

test("E2-18 lifecycle v3 activo/finalizado es exacto y correlaciona v4", () => {
  const membershipId = "m-new", personId = "p", groupId = "g", seasonId = "s-new";
  const periodId = membershipValidityPeriodId(membershipId, 1);
  const membership = createInitialMembership(buildRenewedMembership({ membershipId, previousMembershipId: "m-old", personId, groupId, seasonId }), at, periodId).membership;
  const guardId = membershipLifecycleGuardId(groupId, personId);
  const activeLifecycle = hydrateMembershipLifecycleGuard(snapshot(guardId, { membershipId, personId, groupId, seasonId, rootState: "active", lastActivationOrdinal: 1, lifecycleGuardVersion: 3 }), { guardId, personId, groupId });
  assertActiveLifecycleCorrelated(membership, activeLifecycle, { membershipId, personId, groupId, seasonId, activationOrdinal: 1 }, { periodId, ordinal: 1, estado: "abierto" });
  const finalized = { ...membership, estado: "finalizada", fechaEgreso: later };
  const finalizedLifecycle = hydrateMembershipLifecycleGuard(snapshot(guardId, { membershipId, personId, groupId, seasonId, rootState: "finalized", lastActivationOrdinal: 1, finalizedAt: later, lifecycleGuardVersion: 3 }), { guardId, personId, groupId });
  assertFinalizedMembershipCorrelated(finalized, finalizedLifecycle, { ordinal: 1, estado: "cerrado", endedAt: later });
  assert.throws(() => hydrateMembershipLifecycleGuard(snapshot(guardId, { ...activeLifecycle, finalizedAt: later }), { guardId, personId, groupId }));
});

test("E2-18 Solicitud aprobada v4 e effect hash no exponen predecessor", () => {
  const pending = buildGroupJoinRequest({ requestId: "r", personId: "p", groupId: "g", createdAt: at });
  const approved = pending.approveAfterMembership({ decisionIntentId: "i", decidedBy: "owner", decidedAt: later, membershipId: "m-new", seasonId: "s-new", approvalEffect: "RENEW_MEMBERSHIP", membershipActivationOrdinal: 1 });
  assert.equal(approved.schemaVersion, 4);
  assert.equal(approved.approvalEffect, "RENEW_MEMBERSHIP");
  assert.equal(Object.hasOwn(approved, "previousMembershipId"), false);
  const { requestId: omitted, ...stored } = approved;
  assert.equal(omitted, "r");
  assert.equal(hydrateGroupJoinRequest("r", stored).schemaVersion, 4);
  assert.notEqual(groupJoinRequestRenewalHash("r", "p", "g", "s-new", "m-new", "m-old", 1), groupJoinRequestRenewalHash("r", "p", "g", "s-new", "m-new", "other", 1));
});

test("E2-18 el repositorio preserva la versión aprobada por el dominio", () => {
  let stored;
  const db = { collection: () => ({ doc: (id) => ({ id }) }) };
  const transaction = { set: (_ref, data) => { stored = data; } };
  const repository = createFirestoreGroupJoinRequestRepository({ db });
  const request = buildGroupJoinRequest({ requestId: "r", personId: "p", groupId: "g", createdAt: at })
    .approveAfterMembership({ decisionIntentId: "i", decidedBy: "owner", decidedAt: later, membershipId: "m-new", seasonId: "s-new", approvalEffect: "RENEW_MEMBERSHIP", membershipActivationOrdinal: 1 });
  repository.updateApproved(transaction, request);
  assert.equal(stored.schemaVersion, 4);
  assert.equal(hydrateGroupJoinRequest("r", stored).approvalEffect, "RENEW_MEMBERSHIP");
});

test("E2-18 usa successor query equality limit(2), sin callable ni índice compuesto nuevo", () => {
  const root = path.resolve(__dirname, "../../../..");
  const capability = fs.readFileSync(path.join(root, "volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipRepository.js"), "utf8");
  const indexConfig = JSON.parse(fs.readFileSync(path.join(root, "volley-ranking-system/firestore.indexes.json"), "utf8"));
  const exportsSource = fs.readFileSync(path.join(root, "volley-ranking-system/functions/index.js"), "utf8");
  const frontend = fs.readFileSync(path.join(root, "volley-ranking-frontend/src/components/groupJoinRequests/PendingGroupJoinRequestsSection.tsx"), "utf8");
  assert.match(capability, /where\("previousMembershipId", "==", previousMembershipId\)\.limit\(2\)/);
  assert.deepEqual(indexConfig.fieldOverrides, []);
  assert.doesNotMatch(exportsSource, /renewMembership/);
  assert.match(frontend, /Renovación intertemporada/);
  assert.doesNotMatch(frontend, /previousMembershipId/);
});
