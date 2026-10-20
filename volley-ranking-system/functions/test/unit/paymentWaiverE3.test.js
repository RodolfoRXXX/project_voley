"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { validateWaivePaymentDebt, validateReversePaymentWaiver, validateListPaymentWaiverHistory } = require("../../src/payments/application/paymentContract");
const { economicPayment, paymentUpdate } = require("../../src/paymentDeliveries/domain/paymentDelivery");

const timestamp = (value) => ({ toDate: () => new Date(value), toMillis: () => new Date(value).getTime() });
const snapshot = (id, data) => ({ id, exists: true, data: () => data });
const base = { groupId: "g", membershipId: "m", personId: "person", seasonId: "s", conceptId: "c", conceptSnapshot: { version: 1, name: "Cuota", kind: "MONTHLY", currency: "ARS", defaultAmountMinor: 1000 }, amountMinor: 1000, currentPrincipalMinor: 1000, principalCorrectionCount: 0, dueDate: "2026-10-20", estado: "PARTIAL", generationIntentId: "intent", payloadHash: "a".repeat(64), periodKey: "2026-10", createdAt: timestamp("2026-09-01T12:00:00Z"), confirmedIncomeMinor: 200, reversedIncomeMinor: 0, netConfirmedIncomeMinor: 200, grossWaivedAmountMinor: 300, reversedWaivedAmountMinor: 0, currentWaivedAmountMinor: 300, waiverEventCount: 1, waiverHistoryRevision: 1, latestWaiverEventId: "waiver", latestWaiverEventAt: timestamp("2026-10-20T12:00:00Z"), balanceMinor: 500, economicState: "PARTIAL", economicRevision: 3, schemaVersion: 5 };

test("E3-07 contratos cerrados normalizan explicación y fijan catálogos", () => {
  const created = validateWaivePaymentDebt({ groupId: "g", paymentId: "p", mode: "TOTAL", amountMinor: 500, expectedBalanceMinor: 500, expectedEconomicRevision: 3, reasonCode: "FINANCIAL_ASSISTANCE", internalExplanation: "  ayuda   aprobada  ", idempotencyKey: "e3-07-waiver-key-01" });
  assert.equal(created.internalExplanation, "ayuda aprobada"); assert.equal(created.mode, "TOTAL");
  for (const reasonCode of ["ORGANIZATIONAL_WAIVER", "EXCEPTIONAL_WAIVER"]) assert.equal(validateWaivePaymentDebt({ ...created, reasonCode }).reasonCode, reasonCode);
  const reversed = validateReversePaymentWaiver({ groupId: "g", paymentId: "p", waiverId: "w", expectedEconomicRevision: 4, expectedWaiverHistoryRevision: 1, reasonCode: "WAIVER_WRONG_AMOUNT", internalExplanation: "importe erróneo", idempotencyKey: "e3-07-reverse-key01" });
  for (const reasonCode of ["WAIVER_DUPLICATE_ENTRY", "WAIVER_WRONG_PAYMENT", "WAIVER_NOT_AUTHORIZED_AS_RECORDED"]) assert.equal(validateReversePaymentWaiver({ ...reversed, reasonCode }).reasonCode, reasonCode);
  assert.throws(() => validateWaivePaymentDebt({ ...created, reasonCode: "OTHER" }), (error) => error.reason === "VALIDATION_FAILED");
  assert.throws(() => validateReversePaymentWaiver({ ...reversed, internalExplanation: "\u202Eoculto" }), (error) => error.reason === "VALIDATION_FAILED");
  assert.throws(() => validateWaivePaymentDebt({ ...created, extra: true }), (error) => error.reason === "VALIDATION_FAILED");
  assert.equal(validateListPaymentWaiverHistory({ paymentId: "p" }).pageSize, 20); assert.equal(validateListPaymentWaiverHistory({ paymentId: "p", pageSize: 50 }).pageSize, 50);
});

test("E3-07 forma v5 y writers componen ingreso y condonación", () => {
  const payment = economicPayment(snapshot("p", base)); assert.equal(payment.balanceMinor, 500); assert.equal(payment.currentWaivedAmountMinor, 300);
  const paid = paymentUpdate(payment, 500, 0); assert.equal(paid.balanceMinor, 0); assert.equal(paid.economicState, "SETTLED"); assert.equal(paid.schemaVersion, 5);
  const reopened = paymentUpdate({ ...payment, ...paid }, 0, 200); assert.equal(reopened.balanceMinor, 200); assert.equal(reopened.economicState, "PARTIAL");
  assert.throws(() => economicPayment(snapshot("bad", { ...base, balanceMinor: 501 })), (error) => error.reason === "INCOMPATIBLE_STATE");
  assert.throws(() => economicPayment(snapshot("bad", { ...base, currentWaivedAmountMinor: 299 })), (error) => error.reason === "INCOMPATIBLE_STATE");
});

test("E3-07 wiring conserva historia, recovery, avisos, privacidad, Rules y UI existente", () => {
  const store = fs.readFileSync(path.resolve(__dirname, "../../src/payments/infrastructure/firestorePaymentStore.js"), "utf8");
  assert.match(store, /transaction\.create\(eventRef, event\); transaction\.update\(paymentRef, changes\)/); assert.match(store, /assertNoReportedNotice\(transaction, payment\)/);
  assert.match(store, /stored\.result, current: waiverComposition\(payment\)/); assert.match(store, /payment\.balanceMinor \+ waiver\.amountMinor/);
  assert.match(store, /PaymentHasWaiverHistoryError/); assert.match(store, /netConfirmedIncomeMinor \+ \(payment\.currentWaivedAmountMinor \|\| 0\)/);
  const rules = fs.readFileSync(path.resolve(__dirname, "../../../firestore.rules"), "utf8"); assert.match(rules, /match \/waiverEvents\/\{eventId\}[\s\S]{0,100}allow read, write: if false/);
  const ui = fs.readFileSync(path.resolve(__dirname, "../../../../volley-ranking-frontend/src/components/payments/PaymentObligationDetailDialog.tsx"), "utf8");
  assert.match(ui, /Condonar deuda/); assert.match(ui, /Revertir condonación completa/); assert.match(ui, /waiverErrorRef/); assert.match(ui, /reversalErrorRef/); assert.match(ui, /Recargar y revalidar contexto/); assert.match(ui, /!waiverRecovery/); assert.match(ui, /!reversalRecovery/);
  assert.match(ui, /parsed === observedBalance \? "TOTAL" : "PARTIAL"/); assert.match(ui, /waiverSubmission \?\? \{/); assert.match(ui, /waiverInputLocked/); assert.match(ui, /se condonará toda la deuda como TOTAL/);
  const owner = fs.readFileSync(path.resolve(__dirname, "../../../../volley-ranking-frontend/src/components/payments/OwnerEconomySection.tsx"), "utf8"); assert.match(owner, /Saldadas/); assert.match(owner, /PaymentObligationDetailDialog/);
});
