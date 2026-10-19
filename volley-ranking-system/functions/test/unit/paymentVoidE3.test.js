"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { validateListGroupObligations, validateListMyObligations, validateMyPaymentDetail, validateVoidPayment } = require("../../src/payments/application/paymentContract");

test("E3-05 contrato cerrado normaliza motivo y filtra OPEN/VOIDED", () => {
  const valid = validateVoidPayment({ groupId: "g", paymentId: "p", expectedEconomicRevision: 2, reasonCode: "OTHER", explanation: "  Explicación   válida  ", idempotencyKey: "e3-05-key-000001" }); assert.equal(valid.explanation, "Explicación válida");
  assert.deepEqual(validateListGroupObligations({ groupId: "g", status: "VOIDED" }).status, "VOIDED"); assert.equal(validateListMyObligations({ status: "OPEN" }).status, "OPEN"); assert.equal(validateMyPaymentDetail({ paymentId: "p" }).paymentId, "p");
  for (const invalid of [{ groupId: "g", paymentId: "p", expectedEconomicRevision: 0, reasonCode: "OTHER", explanation: "x", idempotencyKey: "e3-05-key-000001" }, { groupId: "g", paymentId: "p", expectedEconomicRevision: 1, reasonCode: "FREE", explanation: "x", idempotencyKey: "e3-05-key-000001" }, { groupId: "g", paymentId: "p", expectedEconomicRevision: 1, reasonCode: "OTHER", explanation: "\u202Eoculto", idempotencyKey: "e3-05-key-000001" }, { groupId: "g", paymentId: "p", expectedEconomicRevision: 1, reasonCode: "OTHER", explanation: "x", idempotencyKey: "e3-05-key-000001", extra: true }]) assert.throws(() => validateVoidPayment(invalid), (error) => error.reason === "VALIDATION_FAILED");
  assert.throws(() => validateListMyObligations({ status: "VOIDED", economicStates: ["PENDING", "PARTIAL"] }), (error) => error.reason === "VALIDATION_FAILED");
});

test("E3-05 conserva consulta exhaustiva, guard y unidad atómica sin máximo funcional", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../src/payments/infrastructure/firestorePaymentStore.js"), "utf8");
  assert.match(source, /where\("membershipId", "==", payment\.membershipId\)\.where\("decisionState", "==", "REPORTED"\)\.orderBy\("__name__", "asc"\)/); assert.doesNotMatch(source, /membershipId", "==", payment\.membershipId[\s\S]{0,120}limit\(/);
  assert.match(source, /transaction\.update\(payments\.doc\(input\.paymentId\), changes\)/); assert.match(source, /transaction\.set\(guardRef/); assert.match(source, /transaction\.create\(receiptRef/); assert.match(source, /collection\("deliveryApplications"\)/);
  const rules = fs.readFileSync(path.resolve(__dirname, "../../../firestore.rules"), "utf8"); for (const collection of ["payments", "paymentReceiptCandidateGuards", "paymentCommandReceipts"]) assert.match(rules, new RegExp(`match /${collection}/\\{[^}]+\\} \\{[\\s\\S]{0,180}allow read, write: if false;`));
});
