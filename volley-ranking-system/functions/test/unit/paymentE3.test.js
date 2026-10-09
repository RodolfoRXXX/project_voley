"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { validateCreateConcept, validateGeneration } = require("../../src/payments/application/paymentContract");
const { monthBounds, normalizeExceptionReason, opaqueId, paymentDto, requirePeriodKey } = require("../../src/payments/domain/payment");

test("E3-01 contratos cerrados normalizan texto, centavos y unión discriminada", () => {
  assert.deepEqual(validateCreateConcept({ groupId: "g1", name: "  Cuota   mensual ", kind: "MONTHLY", defaultAmountMinor: 12345, idempotencyKey: "payment-key-00000001" }), { groupId: "g1", name: "Cuota mensual", kind: "MONTHLY", defaultAmountMinor: 12345, idempotencyKey: "payment-key-00000001" });
  assert.throws(() => validateCreateConcept({ groupId: "g1", name: "Cuota", kind: "MONTHLY", defaultAmountMinor: 12.5, idempotencyKey: "payment-key-00000001" }), /invalid/i);
  assert.throws(() => validateCreateConcept({ groupId: "g1", name: "Cuota", kind: "MONTHLY", defaultAmountMinor: 100, idempotencyKey: "payment-key-00000001", currency: "USD" }), /invalid/i);
  const monthly = validateGeneration({ groupId: "g1", conceptId: "c1", expectedConceptVersion: 2, membershipIds: ["m1"], dueDate: "2026-10-31", baseAmountMinor: 10000, exceptions: [{ membershipId: "m1", amountMinor: 8000, reason: "  Beca   parcial " }], generationIdempotencyKey: "generation-key-00001", kind: "MONTHLY", periodKey: "2026-09" });
  assert.equal(monthly.exceptions[0].reason, "Beca parcial");
  assert.throws(() => validateGeneration({ ...monthly, occurrenceKey: "o1" }), /invalid/i);
  assert.throws(() => validateGeneration({ ...monthly, exceptions: [{ membershipId: "m1", amountMinor: 10000, reason: "Sin cambio" }] }), /invalid/i);
});

test("E3-01 usa meses BA semiabiertos y rechaza futuro", () => {
  const bounds = monthBounds("2026-10");
  assert.equal(bounds.start.toISOString(), "2026-10-01T03:00:00.000Z");
  assert.equal(bounds.next.toISOString(), "2026-11-01T03:00:00.000Z");
  assert.equal(requirePeriodKey("2026-10", new Date("2026-10-08T12:00:00Z")), "2026-10");
  assert.throws(() => requirePeriodKey("2026-11", new Date("2026-10-08T12:00:00Z")), /invalid/i);
});

test("E3-01 IDs económicos son deterministas y DTO propio minimiza groupId", () => {
  assert.equal(opaqueId("payment", "MONTHLY", "g", "m", "c", "2026-10"), opaqueId("payment", "MONTHLY", "g", "m", "c", "2026-10"));
  assert.notEqual(opaqueId("payment", "MONTHLY", "g", "m", "c", "2026-10"), opaqueId("payment", "MONTHLY", "g", "m", "c", "2026-09"));
  const timestamp = { toDate: () => new Date("2026-10-01T03:00:00Z") };
  const dto = paymentDto({ paymentId: "p", groupId: "g", membershipId: "m", conceptId: "c", conceptSnapshot: { version: 1, name: "Cuota", kind: "MONTHLY", currency: "ARS", defaultAmountMinor: 100 }, amountMinor: 100, dueDate: "2026-10-01", periodKey: "2026-10", estado: "PENDING", createdAt: timestamp }, { owner: false, groupName: "Grupo Norte", now: new Date("2026-10-03T03:00:00Z") });
  assert.equal(dto.groupId, undefined); assert.equal(dto.groupName, "Grupo Norte"); assert.equal(dto.person, undefined); assert.equal(dto.overdue, true); assert.equal(dto.estado, "PENDING");
  const ownerDto = paymentDto({ paymentId: "p", groupId: "g", membershipId: "m", conceptId: "c", conceptSnapshot: { version: 1, name: "Cuota", kind: "MONTHLY", currency: "ARS", defaultAmountMinor: 100 }, amountMinor: 100, dueDate: "2026-10-01", periodKey: "2026-10", estado: "PENDING", createdAt: timestamp }, { owner: true, person: { status: "AVAILABLE", firstName: "Mara", lastName: "Sintética" } });
  assert.deepEqual(ownerDto.person, { status: "AVAILABLE", firstName: "Mara", lastName: "Sintética" });
  assert.equal(normalizeExceptionReason("  Razón   válida "), "Razón válida");
});
