"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { validateCorrectPaymentPrincipal, validateListPrincipalCorrections } = require("../../src/payments/application/paymentContract");
const { economicPayment, paymentUpdate, principalCorrection } = require("../../src/paymentDeliveries/domain/paymentDelivery");

const timestamp = (iso) => ({ toDate: () => new Date(iso), toMillis: () => new Date(iso).getTime() });
const snapshot = (id, data) => ({ id, exists: true, data: () => data });
const original = { groupId: "g", membershipId: "m", personId: "person", seasonId: "s", conceptId: "c",
  conceptSnapshot: { version: 1, name: "Cuota", kind: "MONTHLY", currency: "ARS", defaultAmountMinor: 1000 },
  amountMinor: 1000, dueDate: "2026-10-20", estado: "PENDING", generationIntentId: "intent", payloadHash: "a".repeat(64),
  periodKey: "2026-10", createdAt: timestamp("2026-09-01T12:00:00Z") };

test("E3-06 contrato cerrado aplica D11, NFC, límites y paginación 1–50", () => {
  const value = validateCorrectPaymentPrincipal({ groupId: "g", paymentId: "p", newPrincipalMinor: 1200, expectedEconomicRevision: 2,
    reasonCode: "AMOUNT_ENTRY_ERROR", explanation: "  Importe   corregido  ", idempotencyKey: "e3-06-correct-key-01" });
  assert.equal(value.explanation, "Importe corregido"); assert.equal(value.newPrincipalMinor, 1200);
  for (const reasonCode of ["WRONG_APPROVED_BASE_AMOUNT", "MEMBERSHIP_EXCEPTION_AMOUNT_ERROR", "ARITHMETIC_ERROR"]) assert.equal(validateCorrectPaymentPrincipal({ ...value, reasonCode }).reasonCode, reasonCode);
  assert.throws(() => validateCorrectPaymentPrincipal({ ...value, reasonCode: "OTHER" }), (error) => error.reason === "VALIDATION_FAILED");
  assert.throws(() => validateCorrectPaymentPrincipal({ ...value, newPrincipalMinor: 0 }), (error) => error.reason === "PRINCIPAL_AMOUNT_INVALID");
  assert.throws(() => validateCorrectPaymentPrincipal({ ...value, explanation: "\u202Eoculto" }), (error) => error.reason === "VALIDATION_FAILED");
  assert.throws(() => validateCorrectPaymentPrincipal({ ...value, extra: true }), (error) => error.reason === "VALIDATION_FAILED");
  assert.equal(validateListPrincipalCorrections({ paymentId: "p" }).pageSize, 20); assert.equal(validateListPrincipalCorrections({ paymentId: "p", pageSize: 1 }).pageSize, 1); assert.equal(validateListPrincipalCorrections({ paymentId: "p", pageSize: 50 }).pageSize, 50);
  assert.throws(() => validateListPrincipalCorrections({ paymentId: "p", pageSize: 0 }), (error) => error.reason === "VALIDATION_FAILED"); assert.throws(() => validateListPrincipalCorrections({ paymentId: "p", pageSize: 51 }), (error) => error.reason === "VALIDATION_FAILED");
});

test("E3-06 hidrata v1–v4 y todos los updates usan principal vigente", () => {
  const v1 = economicPayment(snapshot("p1", { ...original, schemaVersion: 1 })); assert.equal(v1.currentPrincipalMinor, undefined); assert.equal(v1.balanceMinor, 1000);
  const v2 = economicPayment(snapshot("p2", { ...original, confirmedIncomeMinor: 400, reversedIncomeMinor: 0, netConfirmedIncomeMinor: 400, balanceMinor: 600, economicState: "PARTIAL", economicRevision: 2, estado: "PARTIAL", schemaVersion: 2 })); assert.equal(v2.currentPrincipalMinor, 1000);
  const v4 = economicPayment(snapshot("p4", { ...original, currentPrincipalMinor: 1400, principalCorrectionCount: 1, lastPrincipalCorrectionId: "correction", lastCorrectedAt: timestamp("2026-10-19T12:00:00Z"), confirmedIncomeMinor: 1000, reversedIncomeMinor: 0, netConfirmedIncomeMinor: 1000, balanceMinor: 400, economicState: "PARTIAL", economicRevision: 3, estado: "PARTIAL", schemaVersion: 4 }));
  assert.equal(v4.amountMinor, 1000); assert.equal(v4.currentPrincipalMinor, 1400); assert.equal(paymentUpdate(v4, 400, 0).economicState, "SETTLED"); assert.equal(paymentUpdate(v4, 0, 500).balanceMinor, 900); assert.equal(paymentUpdate(v4, 0, 500).schemaVersion, 4);
  const voided = economicPayment(snapshot("pv", { ...v4, lifecycle: "VOIDED", voidedAmountMinor: 1400, voidReasonCode: "NOT_OWED", voidExplanation: "No correspondía", voidedAt: timestamp("2026-10-19T13:00:00Z"), voidedByAccountId: "owner", confirmedIncomeMinor: 0, reversedIncomeMinor: 0, netConfirmedIncomeMinor: 0, balanceMinor: 0, economicState: "VOIDED", estado: "VOIDED", economicRevision: 4 })); assert.equal(voided.voidedAmountMinor, 1400);
  assert.throws(() => economicPayment(snapshot("bad", { ...v4, balanceMinor: 399 })), (error) => error.reason === "INCOMPATIBLE_STATE");
});

test("E3-06 historia exacta y wiring conservan atomicidad, recovery posterior y deny-all", () => {
  const correction = principalCorrection(snapshot("corr", { correctionId: "corr", paymentId: "p", groupId: "g", fromPrincipalMinor: 1000, toPrincipalMinor: 1200, deltaMinor: 200, reasonCode: "ARITHMETIC_ERROR", explanation: "Suma corregida", correctedByAccountId: "owner", fromEconomicRevision: 2, toEconomicRevision: 3, correctedAt: timestamp("2026-10-19T12:00:00Z"), schemaVersion: 1 })); assert.equal(correction.deltaMinor, 200);
  assert.throws(() => principalCorrection(snapshot("corr", { ...correction, deltaMinor: 201 })), (error) => error.reason === "INCOMPATIBLE_STATE");
  const store = fs.readFileSync(path.resolve(__dirname, "../../src/payments/infrastructure/firestorePaymentStore.js"), "utf8");
  assert.match(store, /transaction\.create\(correctionRef, correction\); transaction\.update\(paymentRef, changes\)/); assert.match(store, /transaction\.set\(guardRef/); assert.match(store, /transaction\.create\(receiptRef/);
  assert.match(store, /payment\.economicRevision < stored\.toEconomicRevision/); assert.doesNotMatch(store, /payment\.economicRevision !== stored\.toEconomicRevision/);
  assert.match(store, /where\("membershipId", "==", payment\.membershipId\)\.where\("decisionState", "==", "REPORTED"\)\.orderBy\("__name__", "asc"\)/);
  const rules = fs.readFileSync(path.resolve(__dirname, "../../../firestore.rules"), "utf8"); assert.match(rules, /match \/principalCorrections\/\{correctionId\}[\s\S]{0,100}allow read, write: if false/);
  const ui = fs.readFileSync(path.resolve(__dirname, "../../../../volley-ranking-frontend/src/components/payments/PaymentObligationDetailDialog.tsx"), "utf8"); assert.match(ui, /Corregir importe exigible/); assert.match(ui, /reaparecerá deuda visible/); assert.match(ui, /La proyección es informativa/);
  assert.match(ui, /correctionErrorRef/); assert.match(ui, /role="alert" tabIndex=\{-1\}/); assert.match(ui, /correctionBlocked/); assert.match(ui, /Recargar y revalidar contexto/); assert.match(ui, /PAYMENT_PENDING_NOTICE/); assert.match(ui, /!showCorrection/); assert.match(ui, /!correctionRecovery/);
  const receiptHistory = fs.readFileSync(path.resolve(__dirname, "../../../../volley-ranking-frontend/src/components/administrativeReceipts/OwnerPaymentReceiptHistorySection.tsx"), "utf8");
  assert.match(receiptHistory, /PaymentObligationDetailDialog/); assert.match(receiptHistory, /setDetailPaymentId\(line\.paymentId\)/); assert.match(receiptHistory, /Ver obligación/);
});
