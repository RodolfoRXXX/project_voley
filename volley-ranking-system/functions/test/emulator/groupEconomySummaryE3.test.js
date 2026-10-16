"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestorePaymentStore } = require("../../src/payments/infrastructure/firestorePaymentStore");

function ts(admin, value) { return admin.firestore.Timestamp.fromDate(new Date(value)); }

test("E3-04 resumen Owner exacto conserva fuente económica, autorización y alcance global", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e3-04-group-summary");
  const db = app.firestore();
  const store = createFirestorePaymentStore({ db });
  const ownerId = "e3-04-summary-owner";
  const foreignId = "e3-04-summary-foreign";
  const groupId = "e3-04-summary-group";
  const refs = [];
  const set = async (path, data) => { const ref = db.doc(path); refs.push(ref); await ref.set(data); };
  const payment = (index, overrides = {}) => ({
    groupId,
    membershipId: `membership-${index}`,
    personId: `person-${index}`,
    seasonId: "summary-season",
    conceptId: "summary-concept",
    conceptSnapshot: { version: 1, name: "Cuota", kind: "MONTHLY", currency: "ARS", defaultAmountMinor: 100 },
    amountMinor: 100,
    dueDate: "2026-10-20",
    estado: "PENDING",
    generationIntentId: `intent-${index}`,
    payloadHash: String(index % 10).repeat(64),
    periodKey: "2026-10",
    createdAt: ts(admin, "2026-10-01T00:00:00Z"),
    schemaVersion: 1,
    ...overrides,
  });
  try {
    await set(`users/${ownerId}`, { email: "summary-owner@example.invalid" });
    await set(`users/${foreignId}`, { email: "summary-foreign@example.invalid" });
    await set(`groups/${groupId}`, { nombre: "Resumen", deporte: "voleibol", ownerId, estado: "activo", createdAt: ts(admin, "2026-01-01T00:00:00Z"), schemaVersion: 1 });
    for (let index = 1; index <= 23; index += 1) await set(`payments/pending-${index}`, payment(index));
    await set("payments/partial", payment(24, { estado: "PARTIAL", schemaVersion: 2, confirmedIncomeMinor: 60, reversedIncomeMinor: 0, netConfirmedIncomeMinor: 60, balanceMinor: 40, economicState: "PARTIAL", economicRevision: 2 }));
    await set("payments/settled", payment(25, { estado: "SETTLED", schemaVersion: 2, confirmedIncomeMinor: 100, reversedIncomeMinor: 0, netConfirmedIncomeMinor: 100, balanceMinor: 0, economicState: "SETTLED", economicRevision: 2 }));

    const baseline = await store.getOwnerGroupEconomySummary(ownerId, { groupId });
    assert.deepEqual(baseline, { pendingBalanceMinor: 2340, pendingObligationCount: 24, pendingNoticeCount: 0 });
    await assert.rejects(store.getOwnerGroupEconomySummary(foreignId, { groupId }), (error) => error.reason === "GROUP_NOT_ACCESSIBLE");

    await set("paymentDeliveries/pending-notice", { deliveryId: "pending-notice", groupId, decisionState: "REPORTED", reportedAt: ts(admin, "2026-10-02T00:00:00Z"), schemaVersion: 1 });
    const withNotice = await store.getOwnerGroupEconomySummary(ownerId, { groupId });
    assert.equal(withNotice.pendingNoticeCount, 1);
    assert.equal(withNotice.pendingBalanceMinor, baseline.pendingBalanceMinor, "un aviso no reduce saldo");

    await db.doc("payments/partial").update({ estado: "SETTLED", economicState: "SETTLED", confirmedIncomeMinor: 100, netConfirmedIncomeMinor: 100, balanceMinor: 0, economicRevision: 3 });
    await db.doc("paymentDeliveries/pending-notice").update({ decisionState: "CONFIRMED" });
    assert.deepEqual(await store.getOwnerGroupEconomySummary(ownerId, { groupId }), { pendingBalanceMinor: 2300, pendingObligationCount: 23, pendingNoticeCount: 0 });

    await db.doc("payments/partial").update({ estado: "PARTIAL", economicState: "PARTIAL", reversedIncomeMinor: 40, netConfirmedIncomeMinor: 60, balanceMinor: 40, economicRevision: 4 });
    assert.deepEqual(await store.getOwnerGroupEconomySummary(ownerId, { groupId }), { pendingBalanceMinor: 2340, pendingObligationCount: 24, pendingNoticeCount: 0 });
  } finally {
    for (const ref of refs.reverse()) await ref.delete().catch(() => {});
    await app.delete();
  }
});
