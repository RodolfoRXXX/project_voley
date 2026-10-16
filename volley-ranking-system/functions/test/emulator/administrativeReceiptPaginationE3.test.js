"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { activeMembershipGuardId } = require("../../src/memberships/application/membershipHashing");
const { createFirestoreAdministrativeReceiptStore } = require("../../src/administrativeReceipts/infrastructure/firestoreAdministrativeReceiptStore");
const contract = require("../../src/administrativeReceipts/application/administrativeReceiptContract");

function timestamp(admin, value) {
  return admin.firestore.Timestamp.fromDate(new Date(value));
}

test("E3-04 pagina más de 50 obligaciones y reautoriza cada continuación", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e3-04-obligation-pagination");
  const db = app.firestore();
  const prefix = "e3-04-page-";
  const ownerId = `${prefix}owner`;
  const delegateId = `${prefix}delegate`;
  const groupId = `${prefix}group`;
  const seasonId = `${prefix}season`;
  const subjectMembershipId = `${prefix}subject-membership`;
  const delegateMembershipId = `${prefix}delegate-membership`;
  const subjectPersonId = `${prefix}subject-person`;
  const delegatePersonId = `${prefix}delegate-person`;
  const createdAt = timestamp(admin, "2026-09-01T12:00:00Z");
  const now = timestamp(admin, "2026-10-14T12:00:00Z");
  const store = createFirestoreAdministrativeReceiptStore({ db, now: () => now });
  const paymentIds = Array.from({ length: 55 }, (_, index) => `${prefix}payment-${String(index).padStart(3, "0")}`);

  const payment = (paymentId) => ({
    groupId,
    membershipId: subjectMembershipId,
    personId: subjectPersonId,
    seasonId,
    conceptId: `${prefix}concept`,
    conceptSnapshot: { version: 1, name: `Cuota ${paymentId}`, kind: "MONTHLY", currency: "ARS", defaultAmountMinor: 4_500_000 },
    amountMinor: 4_500_000,
    dueDate: "2026-10-20",
    estado: "PENDING",
    generationIntentId: `${prefix}intent`,
    payloadHash: "a".repeat(64),
    periodKey: "2026-10",
    createdAt,
    schemaVersion: 1,
  });

  try {
    await db.doc(`users/${ownerId}`).set({ email: "owner-pagination@example.invalid", createdAt });
    await db.doc(`users/${delegateId}`).set({ email: "delegate-pagination@example.invalid", personaId: delegatePersonId, createdAt });
    await db.doc(`personas/${subjectPersonId}`).set({ nombre: "Sujeta", apellido: "Paginada", createdAt });
    await db.doc(`personas/${delegatePersonId}`).set({ nombre: "Delegada", apellido: "Paginada", createdAt });
    await db.doc(`groups/${groupId}`).set({ nombre: "Grupo paginado", deporte: "voleibol", ownerId, ownershipRevision: 1, estado: "activo", createdAt, schemaVersion: 3 });
    await db.doc(`seasons/${seasonId}`).set({ groupId, nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt, schemaVersion: 1 });
    await db.doc(`openSeasonGuards/${groupId}`).set({ seasonId, idempotencyKeyHash: "b".repeat(64), requestHash: "c".repeat(64), createdAt, guardVersion: 1 });
    await db.doc(`memberships/${subjectMembershipId}`).set({ personId: subjectPersonId, groupId, seasonId, estado: "finalizada", fechaIngreso: createdAt, fechaEgreso: now, createdAt, schemaVersion: 2 });
    await db.doc(`memberships/${delegateMembershipId}`).set({ personId: delegatePersonId, groupId, seasonId, estado: "activa", fechaIngreso: createdAt, createdAt, schemaVersion: 1 });
    await db.doc(`activeMembershipGuards/${activeMembershipGuardId(groupId, delegatePersonId)}`).set({ membershipId: delegateMembershipId, personId: delegatePersonId, groupId, seasonId, idempotencyKeyHash: "d".repeat(64), requestHash: "e".repeat(64), createdAt, guardVersion: 1 });
    for (const [index, paymentId] of paymentIds.entries()) {
      const base = payment(paymentId);
      await db.doc(`payments/${paymentId}`).set(index === 0 ? { ...base, confirmedIncomeMinor: 0, reversedIncomeMinor: 0, netConfirmedIncomeMinor: 0, balanceMinor: 4_500_000, economicState: "PENDING", economicRevision: 2, schemaVersion: 2 } : index === 1 ? { ...base, estado: "PARTIAL", confirmedIncomeMinor: 1_000_000, reversedIncomeMinor: 0, netConfirmedIncomeMinor: 1_000_000, balanceMinor: 3_500_000, economicState: "PARTIAL", economicRevision: 2, schemaVersion: 2 } : base);
    }
    const settledPaymentId = `${prefix}payment-settled`; await db.doc(`payments/${settledPaymentId}`).set({ ...payment(settledPaymentId), estado: "SETTLED", confirmedIncomeMinor: 4_500_000, reversedIncomeMinor: 0, netConfirmedIncomeMinor: 4_500_000, balanceMinor: 0, economicState: "SETTLED", economicRevision: 2, schemaVersion: 2 });

    const ownerPages = [];
    let cursor;
    do {
      const page = await store.listObligations(ownerId, contract.validateObligations({ groupId, membershipId: subjectMembershipId, pageSize: 20, ...(cursor ? { cursor } : {}) }));
      ownerPages.push(page);
      cursor = page.nextCursor;
    } while (cursor);

    const traversed = ownerPages.flatMap((page) => page.items.map((item) => item.paymentId));
    assert.deepEqual(ownerPages.map((page) => page.items.length), [20, 20, 15]);
    assert.equal(new Set(traversed).size, 55);
    assert.deepEqual(traversed, [...paymentIds].sort((left, right) => right.localeCompare(left)));
    assert.equal(traversed.includes(settledPaymentId), false);
    assert.equal(ownerPages.flatMap((page) => page.items).find((item) => item.paymentId === paymentIds[0]).estado, "PENDING");
    assert.equal(ownerPages.flatMap((page) => page.items).find((item) => item.paymentId === paymentIds[1]).estado, "PARTIAL");

    const grant = await store.grant(ownerId, contract.validateGrant({ groupId, membershipId: delegateMembershipId, idempotencyKey: "e3-04-page-grant-0001" }));
    const delegateFirst = await store.listObligations(delegateId, contract.validateObligations({ groupId, membershipId: subjectMembershipId, pageSize: 20 }));
    assert.ok(delegateFirst.nextCursor);
    await assert.rejects(
      store.listObligations(delegateId, contract.validateObligations({ groupId, membershipId: subjectMembershipId, pageSize: 20, cursor: ownerPages[0].nextCursor })),
      (error) => error.reason === "CONCURRENT_MODIFICATION",
    );

    const selected = [ownerPages[0].items[0], ownerPages[2].items[0]];
    const lines = selected.map((item) => ({
      paymentId: item.paymentId,
      allocationMode: "FULL",
      amountMinor: item.balanceMinor,
      expectedBalanceMinor: item.balanceMinor,
      expectedEconomicRevision: item.economicRevision,
    }));
    const preview = await store.preview(ownerId, contract.validatePreview({ groupId, membershipId: subjectMembershipId, receivedOn: "2026-10-14", lines }));
    const recorded = await store.record(ownerId, contract.validateRecord({
      groupId,
      membershipId: subjectMembershipId,
      receivedOn: "2026-10-14",
      lines,
      candidateRevision: preview.candidateRevision,
      candidateDigest: preview.candidateDigest,
      relatedNoticeDecisions: [],
      idempotencyKey: "e3-04-page-record-0001",
    }));
    assert.equal(recorded.receipt.lines.length, 2);
    assert.equal((await db.doc(`payments/${selected[0].paymentId}`).get()).data().balanceMinor, 0);
    assert.equal((await db.doc(`payments/${selected[1].paymentId}`).get()).data().balanceMinor, 0);

    await store.revoke(ownerId, contract.validateRevoke({ groupId, grantId: grant.grant.grantId, idempotencyKey: "e3-04-page-revoke-001" }));
    await assert.rejects(
      store.listObligations(delegateId, contract.validateObligations({ groupId, membershipId: subjectMembershipId, pageSize: 20, cursor: delegateFirst.nextCursor })),
      (error) => error.reason === "ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED",
    );
  } finally {
    for (const collection of ["administrativeReceiptCommandReceipts", "paymentReceiptCandidateGuards", "groupCapabilityCommandReceipts", "groupCapabilityGrantSlots", "groupCapabilityGrants", "paymentDeliveries", "payments", "activeMembershipGuards", "openSeasonGuards", "memberships", "seasons", "groups", "personas", "users"]) {
      const snapshot = await db.collection(collection).get();
      for (const doc of snapshot.docs) {
        if (!doc.id.startsWith(prefix) && ![groupId, seasonId, subjectMembershipId, delegateMembershipId].includes(doc.id)) continue;
        for (const subcollection of await doc.ref.listCollections()) {
          const children = await subcollection.get();
          for (const child of children.docs) await child.ref.delete();
        }
        await doc.ref.delete();
      }
    }
    await app.delete();
  }
});
