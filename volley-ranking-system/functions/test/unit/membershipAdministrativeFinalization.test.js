"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  validateFinalizeActiveGroupMemberPayload,
  validatePrepareActiveGroupMemberFinalizationPayload,
} = require("../../src/memberships/application/membershipContract");
const { MembershipValidationError, MembershipIncompatibleStateError, MembershipActivationChangedError } = require("../../src/memberships/application/membershipErrors");
const {
  hashMembershipAdministrativeActivationRef,
  hashMembershipAdministrativeFinalizationKey,
  hashMembershipAdministrativeFinalizationRequest,
  membershipAdministrativeFinalizationActivationRef,
  membershipAdministrativeFinalizationIntentId,
} = require("../../src/memberships/application/membershipHashing");
const { toAdministrativeFinalizationPreparation, toAdministrativeFinalizationResult } = require("../../src/memberships/application/membershipDto");
const { BASE_INTENT_FIELDS, hydrateAdministrativeFinalizationIntent, toResult } = require("../../src/memberships/infrastructure/firestoreMembershipAdministrativeFinalizationStore");

const activationInput = {
  actorUserId: "owner-user", groupId: "group-1", membershipId: "membership-1",
  targetPersonId: "target-person", seasonId: "season-1", activationOrdinal: 2,
  periodId: "period-2", activeGuardVersion: 2,
};
const activationRef = membershipAdministrativeFinalizationActivationRef(activationInput);
const key = "administrative-key-0001";

test("E2-12 contratos prepare/finalize son exactos, planos y cerrados", () => {
  assert.deepEqual(validatePrepareActiveGroupMemberFinalizationPayload({ groupId: "group-1", membershipId: "membership-1" }), { groupId: "group-1", membershipId: "membership-1" });
  assert.deepEqual(validateFinalizeActiveGroupMemberPayload({ groupId: "group-1", membershipId: "membership-1", activationRef, idempotencyKey: key }), { groupId: "group-1", membershipId: "membership-1", activationRef, idempotencyKey: key });
  for (const payload of [
    null, [], new (class Payload {})(),
    { groupId: "group-1", membershipId: "membership-1", personId: "forbidden" },
    { groupId: "group-1", membershipId: "membership-1", reason: "forbidden" },
  ]) assert.throws(() => validatePrepareActiveGroupMemberFinalizationPayload(payload), MembershipValidationError);
  for (const forbidden of ["uid", "personId", "seasonId", "ordinal", "estado", "fechaEgreso", "reason", "decidedBy", "roles", "guards"]) {
    assert.throws(() => validateFinalizeActiveGroupMemberPayload({ groupId: "group-1", membershipId: "membership-1", activationRef, idempotencyKey: key, [forbidden]: "x" }), MembershipValidationError);
  }
});

test("E2-12 activationRef usa todos los componentes y dominios de hashes separados", () => {
  assert.match(activationRef, /^[a-f0-9]{64}$/);
  for (const [field, value] of [["actorUserId", "other"], ["groupId", "other"], ["membershipId", "other"], ["targetPersonId", "other"], ["seasonId", "other"], ["activationOrdinal", 3], ["periodId", "other"], ["activeGuardVersion", 1]]) {
    assert.notEqual(membershipAdministrativeFinalizationActivationRef({ ...activationInput, [field]: value }), activationRef);
  }
  assert.equal(membershipAdministrativeFinalizationActivationRef({ ...activationInput, actorPersonId: "ignored-person" }), activationRef);
  const hashes = [membershipAdministrativeFinalizationIntentId("owner-user", key), hashMembershipAdministrativeFinalizationKey("owner-user", key), hashMembershipAdministrativeActivationRef(activationRef), hashMembershipAdministrativeFinalizationRequest("owner-user", "group-1", "membership-1", activationRef)];
  assert.equal(new Set(hashes).size, hashes.length);
  assert.equal(hashes.every((value) => /^[a-f0-9]{64}$/.test(value)), true);
});

test("E2-12 DTOs publicos son cerrados", () => {
  const at = { toDate: () => new Date("2026-09-16T12:00:00.000Z") };
  assert.deepEqual(toAdministrativeFinalizationPreparation({ firstName: "Ada", lastName: "Lovelace", activationRef, ignored: true }), { person: { firstName: "Ada", lastName: "Lovelace" }, activationRef });
  assert.deepEqual(toAdministrativeFinalizationResult({ membershipId: "membership-1", finalizedAt: at, ignored: true }), { outcome: "MEMBERSHIP_FINALIZATION_CONFIRMED", effect: { membershipId: "membership-1", finalizedAt: "2026-09-16T12:00:00.000Z" } });
});

test("E2-12 intent success exacto no persiste clave ni activationRef crudas", () => {
  const at = { toDate: () => new Date("2026-09-16T12:00:00.000Z") };
  const args = { intentId: membershipAdministrativeFinalizationIntentId("owner-user", key), actorUserId: "owner-user", idempotencyKeyHash: hashMembershipAdministrativeFinalizationKey("owner-user", key) };
  const data = {
    schemaVersion: 1, action: "FINALIZE_ACTIVE_THIRD_PARTY_MEMBERSHIP", actorUserId: "owner-user", actorPersonId: "owner-person",
    groupId: "group-1", membershipId: "membership-1", targetPersonId: "target-person", seasonId: "season-1", activationOrdinal: 2,
    activationRefHash: hashMembershipAdministrativeActivationRef(activationRef), idempotencyKeyHash: args.idempotencyKeyHash,
    requestHash: hashMembershipAdministrativeFinalizationRequest("owner-user", "group-1", "membership-1", activationRef),
    status: "consumed", outcome: "MEMBERSHIP_FINALIZATION_CONFIRMED", createdAt: at, completedAt: at, finalizedAt: at,
  };
  const intent = hydrateAdministrativeFinalizationIntent({ exists: true, id: args.intentId, data: () => data }, args);
  assert.deepEqual(Object.keys(intent).sort(), [...BASE_INTENT_FIELDS, "activationOrdinal", "finalizedAt"].sort());
  assert.equal(JSON.stringify(intent).includes(key), false); assert.equal(JSON.stringify(intent).includes(activationRef), false);
  assert.deepEqual(toResult(intent), { membershipId: "membership-1", finalizedAt: at });
  assert.throws(() => hydrateAdministrativeFinalizationIntent({ exists: true, id: args.intentId, data: () => ({ ...data, extra: true }) }, args), MembershipIncompatibleStateError);
});

test("E2-12 rechazo activation changed omite ordinal vigente y es durable", () => {
  const at = { toDate: () => new Date("2026-09-16T12:00:00.000Z") };
  const args = { intentId: membershipAdministrativeFinalizationIntentId("owner-user", key), actorUserId: "owner-user", idempotencyKeyHash: hashMembershipAdministrativeFinalizationKey("owner-user", key) };
  const data = {
    schemaVersion: 1, action: "FINALIZE_ACTIVE_THIRD_PARTY_MEMBERSHIP", actorUserId: "owner-user", actorPersonId: null,
    groupId: "group-1", membershipId: "membership-1", targetPersonId: "target-person", seasonId: "season-1",
    activationRefHash: hashMembershipAdministrativeActivationRef(activationRef), idempotencyKeyHash: args.idempotencyKeyHash,
    requestHash: hashMembershipAdministrativeFinalizationRequest("owner-user", "group-1", "membership-1", activationRef),
    status: "consumed", outcome: "MEMBERSHIP_ACTIVATION_CHANGED", createdAt: at, completedAt: at,
  };
  const intent = hydrateAdministrativeFinalizationIntent({ exists: true, id: args.intentId, data: () => data }, args);
  assert.equal(Object.prototype.hasOwnProperty.call(intent, "activationOrdinal"), false);
  assert.throws(() => toResult(intent), MembershipActivationChangedError);
});

test("E2-12 arquitectura mantiene callable-only, deny-all, transaccion e aislamiento legacy", () => {
  const root = path.resolve(__dirname, "../../../..");
  const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
  const store = read("volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipAdministrativeFinalizationStore.js");
  const frontend = read("volley-ranking-frontend/src/components/memberships/ActiveGroupMembersSection.tsx");
  const service = read("volley-ranking-frontend/src/services/membershipsService.ts");
  const rules = read("volley-ranking-system/firestore.rules");
  for (const marker of [/runTransaction/, /finalizeMembership/, /persistTransition/, /transaction\.delete\(target\.activeRef\)/, /transaction\.create\(target\.lifecycleRef/, /transaction\.create\(intentRef/]) assert.match(store, marker);
  assert.doesNotMatch(store, /memberIds|adminIds|roles|notification|activity/i);
  assert.match(rules, /match \/membershipAdministrativeFinalizationIntents\/\{intentId\}[\s\S]*allow read, write: if false/);
  assert.doesNotMatch(`${frontend}\n${service}`, /firebase\/firestore|setDoc\(|updateDoc\(|\/api\/groups/);
  for (const marker of [/prepareActiveGroupMemberFinalizationForOwnedGroup/, /finalizeActiveGroupMemberForOwnedGroup/, /Finalizar Membresía/, /alertdialog/, /Escape/, /sendingRef/, /aria-live/, /min-h-11/, /sm:/]) assert.match(`${frontend}\n${service}`, marker);
});

test("E2-12 no consume PERSON_REQUIRED administrativo y preserva el mensaje de incorporacion", () => {
  const root = path.resolve(__dirname, "../../../..");
  const frontend = fs.readFileSync(path.join(root, "volley-ranking-frontend/src/components/memberships/ActiveGroupMembersSection.tsx"), "utf8");
  const service = fs.readFileSync(path.join(root, "volley-ranking-frontend/src/services/membershipsService.ts"), "utf8");

  assert.equal(service.includes("PERSON_REQUIRED: \"Necesitás crear tu Persona antes de incorporarte.\""), true);
  assert.equal(service.includes("Necesitás crear tu Persona antes de administrar integrantes del grupo."), false);
  assert.doesNotMatch(service, /getAdministrativeMembershipFinalizationErrorMessage/);
  assert.match(frontend, /await prepareActiveGroupMemberFinalizationForOwnedGroup[\s\S]*setPhase\("confirmation"\)/);
  assert.match(frontend, /catch \(cause\) \{[\s\S]*closeIntent\(false\); await load\(\); setActionError\(getMembershipErrorMessage\(nextReason\)\)/);
  assert.match(frontend, /const closeIntent[\s\S]*setPhase\("idle"\); setPrepared\(null\)/);
  assert.match(frontend, /\{prepared && \["confirmation", "submitting", "recoverable"\]\.includes\(phase\)/);
});
