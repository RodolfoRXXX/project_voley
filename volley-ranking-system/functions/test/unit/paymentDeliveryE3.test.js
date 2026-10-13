"use strict";
const assert = require("node:assert/strict"); const fs = require("node:fs"); const path = require("node:path"); const { pathToFileURL } = require("node:url"); const test = require("node:test");
const { validateReject, validateReport, validateGrantList } = require("../../src/paymentDeliveries/application/paymentDeliveryContract");
const { validateListActiveGroupMembersForOwnedGroupPayload } = require("../../src/memberships/application/membershipContract");
const { paymentUpdate, requestHash, transactionBudget } = require("../../src/paymentDeliveries/domain/paymentDelivery");

const line = (number) => ({ paymentId: `payment-${number}`, selectionMode: number % 2 ? "FULL" : "PARTIAL", requestedAmountMinor: number % 2 ? 1000 : 500, expectedBalanceMinor: 1000, expectedEconomicRevision: 1 });
const report = (count) => ({ membershipId: "membership-1", declaredPaidOn: "2026-10-13", lines: Array.from({ length: count }, (_, index) => line(index + 1)), idempotencyKey: "delivery-key-000001" });

test("E3-03 contrato acepta 1 y 20 líneas únicas y rechaza 21, duplicadas y FULL recalculado", () => {
  assert.equal(validateReport(report(1), new Date("2026-10-13T15:00:00Z")).lines.length, 1);
  assert.equal(validateReport(report(20), new Date("2026-10-13T15:00:00Z")).lines.length, 20);
  assert.throws(() => validateReport(report(21)), (error) => error.reason === "DELIVERY_LINE_LIMIT_EXCEEDED");
  const duplicate = report(2); duplicate.lines[1].paymentId = duplicate.lines[0].paymentId; assert.throws(() => validateReport(duplicate), (error) => error.reason === "DUPLICATE_DELIVERY_LINE");
  const changedFull = report(1); changedFull.lines[0].requestedAmountMinor = 999; assert.throws(() => validateReport(changedFull), (error) => error.reason === "VALIDATION_FAILED");
});

test("E3-03 fecha Buenos Aires, rechazo OTHER y hash canónico son cerrados", () => {
  assert.throws(() => validateReport({ ...report(1), declaredPaidOn: "2026-10-14" }, new Date("2026-10-13T15:00:00Z")), (error) => error.reason === "VALIDATION_FAILED");
  assert.throws(() => validateReject({ groupId: "g", deliveryId: "d", reasonCode: "OTHER", idempotencyKey: "delivery-key-000002" }), (error) => error.reason === "VALIDATION_FAILED");
  const a = report(2); const b = { ...a, lines: [...a.lines].reverse() }; assert.equal(requestHash(a), requestHash(b));
});

test("E3-03 deriva saldos/revisión y preserva FULL exacto", () => {
  const payment = { amountMinor: 1000, confirmedIncomeMinor: 0, reversedIncomeMinor: 0, economicRevision: 1 };
  const applied = paymentUpdate(payment, 700, 0); assert.deepEqual(applied, { confirmedIncomeMinor: 700, reversedIncomeMinor: 0, netConfirmedIncomeMinor: 700, balanceMinor: 300, economicState: "PARTIAL", estado: "PARTIAL", economicRevision: 2, schemaVersion: 2 });
  const later = paymentUpdate({ ...payment, ...applied }, 300, 0); assert.equal(later.economicState, "SETTLED");
  const reversed = paymentUpdate({ ...payment, ...later }, 0, 700); assert.equal(reversed.balanceMinor, 700); assert.equal(reversed.economicRevision, 4);
});

test("E3-03 presupuesto y tamaño serializado de 20 líneas quedan bajo el sobre aprobado", () => {
  assert.equal(transactionBudget("CONFIRM", 20).maximumWrites, 42); assert.equal(transactionBudget("REVERSE", 20).maximumWrites, 43);
  const root = { deliveryId: "d".repeat(64), groupId: "g".repeat(64), seasonId: "s".repeat(64), membershipId: "m".repeat(64), personId: "p".repeat(64), reportedByAccountId: "a".repeat(64), declaredPaidOn: "2026-10-13", lines: validateReport(report(20), new Date("2026-10-13T15:00:00Z")).lines.map((item) => ({ ...item, lineId: "l".repeat(64), conceptName: "Concepto sintético de medición", dueDate: "2026-10-20" })), decisionState: "REPORTED", schemaVersion: 1 };
  assert.ok(Buffer.byteLength(JSON.stringify(root), "utf8") < 64 * 1024);
});

test("E3-03 registra Rules deny-all, índices y separación de GROUP_TREASURY", () => {
  const root = path.resolve(__dirname, "../../.."); const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8"); const indexes = JSON.parse(fs.readFileSync(path.join(root, "firestore.indexes.json"), "utf8"));
  for (const collection of ["paymentDeliveries", "paymentDeliveryReversals", "paymentDeliveryCommandReceipts", "deliveryApplications"]) assert.match(rules, new RegExp(collection));
  assert.ok(indexes.indexes.filter((item) => item.collectionGroup === "paymentDeliveries").length >= 5);
  const treasury = fs.readFileSync(path.join(root, "functions/src/treasury/domain/treasury.js"), "utf8"); assert.match(treasury, /GROUP_TREASURY/); assert.doesNotMatch(treasury, /GROUP_PAYMENT_NOTICE_REVIEW/);
});

test("E3-03 UAT focal muestra economía vigente, advertencia y accesos separados descubribles", () => {
  const frontend = path.resolve(__dirname, "../../../../volley-ranking-frontend/src");
  const economy = fs.readFileSync(path.join(frontend, "components/payments/OwnerEconomySection.tsx"), "utf8");
  const admin = fs.readFileSync(path.join(frontend, "components/paymentDeliveries/PaymentDeliveriesAdminSection.tsx"), "utf8");
  const access = fs.readFileSync(path.join(frontend, "components/paymentDeliveries/OwnerPaymentReviewAccessSection.tsx"), "utf8");
  const memberships = fs.readFileSync(path.join(frontend, "components/memberships/MyCurrentGroupMembershipsSection.tsx"), "utf8");
  assert.match(economy, /obligationState\(item\.estado\)/); assert.match(economy, /item\.balanceMinor/); assert.doesNotMatch(economy, /aria-label="Estado económico: Pendiente de pago"/);
  assert.match(admin, /onEconomyChanged/); assert.match(admin, /Esta acción corrige el registro del pago; no devuelve dinero\./);
  assert.match(access, /reviewAccessErrorMessage/); assert.match(access, /Todavía no hay concesiones de revisión/); assert.match(access, /Este acceso no concede Tesorería/);
  assert.match(memberships, /getMyPaymentReviewContext/); assert.match(memberships, /Revisar entregas de terceros/); assert.match(memberships, /Abrir Economía · sólo consulta/);
});

test("E3-03 serializa la carga Owner con los límites de cada contrato y el retry reutiliza el loader", async () => {
  const frontend = path.resolve(__dirname, "../../../../volley-ranking-frontend/src");
  const requestsModule = await import(pathToFileURL(path.join(frontend, "services/paymentReviewAccessRequests.mjs")).href);
  const requests = requestsModule.ownerPaymentReviewAccessRequests("group-sanitized");
  const rosterWire = JSON.parse(JSON.stringify(requests.roster)); const historyWire = JSON.parse(JSON.stringify(requests.history));
  assert.deepEqual(rosterWire, { groupId: "group-sanitized", pageSize: 20 }); assert.deepEqual(historyWire, { groupId: "group-sanitized", pageSize: 50 });
  assert.deepEqual(validateListActiveGroupMembersForOwnedGroupPayload(rosterWire), rosterWire); assert.deepEqual(validateGrantList(historyWire), { ...historyWire, cursor: undefined });
  assert.throws(() => validateListActiveGroupMembersForOwnedGroupPayload({ ...rosterWire, pageSize: 50 }), (error) => error.reason === "VALIDATION_FAILED");
  const component = fs.readFileSync(path.join(frontend, "components/paymentDeliveries/OwnerPaymentReviewAccessSection.tsx"), "utf8");
  assert.match(component, /setStatus\("loading"\)[\s\S]*accept\(await readAccess\(groupId\)\)/); assert.match(component, /onClick=\{\(\) => void load\(\)\}/); assert.match(component, /ownerPaymentReviewAccessRequests\(groupId\)/);
});
