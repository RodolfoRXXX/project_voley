"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { Timestamp } = require("firebase-admin/firestore");
const { changeMembershipCargo, finalizeMembership, hydrateMembership, normalizeMembershipCargo, reactivateMembership } = require("../../src/memberships/domain/membership");
const { validateGetMembershipCargoForOwnedGroupPayload, validateUpdateMembershipCargoForOwnedGroupPayload } = require("../../src/memberships/application/membershipContract");
const { MembershipValidationError } = require("../../src/memberships/application/membershipErrors");
const { hashMembershipCargoUpdateRequest, membershipCargoEditToken, membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");
const { toMembershipDto, toMyCurrentGroupMembershipItem, toOwnerActiveGroupMemberItem } = require("../../src/memberships/application/membershipDto");
const { hydrateReceipt } = require("../../src/memberships/infrastructure/firestoreMembershipCargoStore");

const at = Timestamp.fromMillis(1_000); const later = Timestamp.fromMillis(2_000);
const base = { personId: "p", groupId: "g", seasonId: "s", estado: "activa", fechaIngreso: at, createdAt: at };
const periodId = membershipValidityPeriodId("m", 1);
const period = { periodId, ordinal: 1, estado: "abierto", startedAt: at };
function snapshot(id, data) { return { id, exists: true, data: () => data }; }

test("E2-22A normaliza NFC/whitespace por code points y exige remoción null explícita", () => {
  assert.equal(normalizeMembershipCargo("  Delegado\u00a0e\u0301lite  "), "Delegado élite");
  assert.equal(Array.from(normalizeMembershipCargo("😀".repeat(80))).length, 80);
  for (const invalid of ["", "   ", "a\ncontrol", "😀".repeat(81), null, undefined]) assert.throws(() => normalizeMembershipCargo(invalid));
  assert.deepEqual(validateGetMembershipCargoForOwnedGroupPayload({ groupId: "g", membershipId: "m" }), { groupId: "g", membershipId: "m" });
  const command = validateUpdateMembershipCargoForOwnedGroupPayload({ groupId: "g", membershipId: "m", cargo: "  Capitán\u00a0general ", editToken: "a".repeat(64), idempotencyKey: "cargo-update-key-01" });
  assert.equal(command.cargo, "Capitán general");
  assert.equal(validateUpdateMembershipCargoForOwnedGroupPayload({ groupId: "g", membershipId: "m", cargo: null, editToken: "a".repeat(64), idempotencyKey: "cargo-update-key-02" }).cargo, null);
  for (const invalid of [
    { groupId: "g", membershipId: "m", editToken: "a".repeat(64), idempotencyKey: "cargo-update-key-03" },
    { groupId: "g", membershipId: "m", cargo: "", editToken: "a".repeat(64), idempotencyKey: "cargo-update-key-04" },
    { groupId: "g", membershipId: "m", cargo: null, editToken: "a".repeat(64), idempotencyKey: "cargo-update-key-05", rol: "admin" },
  ]) assert.throws(() => validateUpdateMembershipCargoForOwnedGroupPayload(invalid), MembershipValidationError);
});

test("E2-22A aplica matriz v1-v6 sin fabricar Períodos ni alterar lineage", () => {
  const variants = [
    { source: hydrateMembership("m", { ...base, schemaVersion: 1 }), version: 5, periodAware: false },
    { source: hydrateMembership("m", { ...base, latestPeriodId: periodId, periodCount: 1, schemaVersion: 3 }), version: 5, periodAware: true },
    { source: hydrateMembership("m", { ...base, latestPeriodId: periodId, periodCount: 1, previousMembershipId: "old", schemaVersion: 4 }), version: 6, periodAware: true },
    { source: hydrateMembership("m", { ...base, latestPeriodId: periodId, periodCount: 1, cargo: "Inicial", schemaVersion: 5 }), version: 5, periodAware: true },
    { source: hydrateMembership("m", { ...base, latestPeriodId: periodId, periodCount: 1, previousMembershipId: "old", cargo: "Inicial", schemaVersion: 6 }), version: 6, periodAware: true },
  ];
  for (const variant of variants) {
    const changed = changeMembershipCargo(variant.source, "  Coordinador  ");
    assert.equal(changed.outcome, "UPDATED"); assert.equal(changed.membership.schemaVersion, variant.version); assert.equal(changed.membership.cargo, "Coordinador");
    assert.equal(Object.prototype.hasOwnProperty.call(changed.membership, "periodCount"), variant.periodAware);
    assert.equal(changed.membership.previousMembershipId, variant.source.previousMembershipId);
    assert.equal(changed.membership.fechaIngreso, variant.source.fechaIngreso); assert.equal(changed.membership.createdAt, variant.source.createdAt);
    assert.equal(changeMembershipCargo(changed.membership, "Coordinador").outcome, "NO_CHANGES");
    const removed = changeMembershipCargo(changed.membership, null).membership; assert.equal(Object.prototype.hasOwnProperty.call(removed, "cargo"), false);
  }
  assert.throws(() => changeMembershipCargo(hydrateMembership("m", { ...base, estado: "finalizada", fechaEgreso: later, schemaVersion: 2 }), "x"));
});

test("E2-22A finalización/reactivación conservan cargo y v5 legacy materializa Período sólo al finalizar", () => {
  const legacy = changeMembershipCargo(hydrateMembership("m", { ...base, schemaVersion: 1 }), "Delegado").membership;
  const finalized = finalizeMembership({ membership: legacy, finalizedAt: later, firstPeriodId: periodId });
  assert.equal(finalized.membership.schemaVersion, 5); assert.equal(finalized.membership.cargo, "Delegado"); assert.equal(finalized.membership.periodCount, 1);
  const nextId = membershipValidityPeriodId("m", 2);
  const reactivated = reactivateMembership({ membership: finalized.membership, reactivatedAt: later, firstPeriod: finalized.periods[0], latestPeriod: finalized.periods[0], nextPeriodId: nextId });
  assert.equal(reactivated.membership.cargo, "Delegado"); assert.equal(reactivated.membership.schemaVersion, 5); assert.equal(reactivated.membership.periodCount, 2);
});

test("E2-22A schemas v5/v6 son cerrados, canónicos y tokenizan cargo/activación", () => {
  const v5 = hydrateMembership("m", { ...base, latestPeriodId: periodId, periodCount: 1, cargo: "Delegado", schemaVersion: 5 });
  const v6 = hydrateMembership("m", { ...base, latestPeriodId: periodId, periodCount: 1, previousMembershipId: "old", schemaVersion: 6 });
  assert.equal(v5.cargo, "Delegado"); assert.equal(v6.previousMembershipId, "old");
  for (const invalid of [{ ...base, cargo: null, schemaVersion: 5 }, { ...base, cargo: "  x", schemaVersion: 5 }, { ...v6, membershipId: undefined, extra: true }]) assert.throws(() => hydrateMembership("m", invalid));
  assert.notEqual(membershipCargoEditToken("owner", v5), membershipCargoEditToken("owner", changeMembershipCargo(v5, "Otro").membership));
  assert.notEqual(membershipCargoEditToken("owner", v5), membershipCargoEditToken("other", v5));
  assert.notEqual(membershipCargoEditToken("owner", v6), membershipCargoEditToken("owner", { ...v6, cargo: "<absent>" }));
  assert.notEqual(hashMembershipCargoUpdateRequest("owner", "g", "m", null), hashMembershipCargoUpdateRequest("owner", "g", "m", "<null>"));
});

test("E2-22A mantiene v1-v4 cerrados y distingue ausencia de textos sentinel", () => {
  const legacyVariants = [
    { ...base, schemaVersion: 1 },
    { ...base, estado: "finalizada", fechaEgreso: later, schemaVersion: 2 },
    { ...base, latestPeriodId: periodId, periodCount: 1, schemaVersion: 3 },
    { ...base, latestPeriodId: periodId, periodCount: 1, previousMembershipId: "old", schemaVersion: 4 },
  ];
  for (const legacy of legacyVariants) {
    for (const cargo of [null, "Delegado", "<absent>", "<null>"]) {
      assert.throws(() => hydrateMembership("m", { ...legacy, cargo }));
    }
  }

  const absent = hydrateMembership("m", { ...base, schemaVersion: 5 });
  const sentinel = hydrateMembership("m", { ...base, cargo: "<absent>", schemaVersion: 5 });
  assert.notEqual(membershipCargoEditToken("owner", absent), membershipCargoEditToken("owner", sentinel));
  assert.equal(changeMembershipCargo(absent, "<null>").membership.cargo, "<null>");
});

test("E2-22A expone cargo sólo en DTO Owner y receipt durable cerrado", () => {
  const membership = hydrateMembership("m", { ...base, latestPeriodId: periodId, periodCount: 1, cargo: "Delegado", schemaVersion: 5 });
  assert.equal(Object.prototype.hasOwnProperty.call(toMembershipDto(membership), "cargo"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(toMyCurrentGroupMembershipItem(membership, { id: "g", nombre: "G", deporte: "voley", estado: "activo", viewerIsOwner: false }).membership, "cargo"), false);
  assert.equal(toOwnerActiveGroupMemberItem(membership, { status: "unavailable" }, false).cargo, "Delegado");
  const args = { receiptId: "receipt", actorUserId: "owner", idempotencyKeyHash: "a".repeat(64) };
  const data = { receiptVersion: 1, actorUserId: "owner", groupId: "g", membershipId: "m", idempotencyKeyHash: args.idempotencyKeyHash, requestHash: "b".repeat(64), cargo: null, confirmedAt: later, editToken: "c".repeat(64) };
  assert.deepEqual(hydrateReceipt(snapshot("receipt", data), args), data);
  assert.throws(() => hydrateReceipt(snapshot("receipt", { ...data, expiresAt: later }), args));
  assert.throws(() => hydrateReceipt(snapshot("receipt", { ...data, cargo: "  no canónico" }), args));
});

test("E2-22A mantiene backend único, receipts deny-all y UI callable-only sin permisos derivados", () => {
  const root = path.resolve(__dirname, "../../../.."); const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
  const store = read("volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipCargoStore.js");
  const rules = read("volley-ranking-system/firestore.rules"); const frontend = read("volley-ranking-frontend/src/components/memberships/ActiveGroupMembersSection.tsx");
  const detail = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx");
  assert.match(store, /runTransaction/); assert.match(store, /transaction\.create\(receiptRef/); assert.match(store, /membershipRepository\.updateRoot/);
  assert.match(rules, /match \/membershipCargoUpdateReceipts\/\{receiptId\}[\s\S]*allow read, write: if false/);
  assert.doesNotMatch(`${store}\n${frontend}`, /profileId|permissionProfileId|adminIds|memberIds/);
  assert.doesNotMatch(store, /new MembershipIncompatibleStateError\("/);
  assert.doesNotMatch(frontend, /firebase\/firestore|setDoc\(|updateDoc\(/);
  assert.match(frontend, /onAccessLost\(getCargoErrorMessage\(nextReason\)\); return/);
  assert.match(detail, /const handleAccessLost = useCallback\([\s\S]*setGroup\(null\);[\s\S]*router\.replace\("\/dashboard\/groups"\)/);
  assert.match(detail, /<ActiveGroupMembersSection[\s\S]*onAccessLost=\{handleAccessLost\}/);
  for (const marker of ["Editar cargo", "El cargo es descriptivo y no otorga permisos", "Quitar", "Cancelar", "EDIT_TOKEN_STALE", "min-h-11", "Escape", "cargoDialogKeyDown", "GROUP_NOT_ACCESSIBLE", "pendingCargo", "Reintentar la misma edición"]) assert.match(frontend, new RegExp(marker));
});
