"use strict";

const crypto = require("node:crypto");
const { DeliveryValidationError, DeliveryIncompatibleStateError } = require("../application/paymentDeliveryErrors");

const MAX_LINES = 20;
const CAPABILITY_ID = "GROUP_PAYMENT_NOTICE_REVIEW";
const MAX_AMOUNT_MINOR = 999_999_999_999;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;
const FORBIDDEN_TEXT = /[\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const plain = (value) => value && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) => plain(value) && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(",")}]` : plain(value) ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}` : JSON.stringify(value);
const hash = (value) => crypto.createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
const opaqueId = (...parts) => hash(parts.join("\u001f"));
const iso = (value) => value?.toDate?.().toISOString?.() || null;
function id(value) { if (typeof value !== "string" || !value || value !== value.trim() || value.includes("/") || value.length > 256) throw new DeliveryValidationError(); return value; }
function key(value) { if (typeof value !== "string" || !IDEMPOTENCY_PATTERN.test(value)) throw new DeliveryValidationError(); return value; }
function amount(value) { if (!Number.isSafeInteger(value) || value < 1 || value > MAX_AMOUNT_MINOR) throw new DeliveryValidationError(); return value; }
function revision(value) { if (!Number.isSafeInteger(value) || value < 1) throw new DeliveryValidationError(); return value; }
function text(value, required = true) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || FORBIDDEN_TEXT.test(value)) throw new DeliveryValidationError();
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if ((required && !normalized) || Array.from(normalized).length > 240 || Buffer.byteLength(normalized, "utf8") > 480) throw new DeliveryValidationError();
  return normalized || undefined;
}
function civilDate(value, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) throw new DeliveryValidationError();
  const [year, month, day] = match.slice(1).map(Number); const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new DeliveryValidationError();
  const current = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  if (value > current) throw new DeliveryValidationError(); return value;
}
function pageSize(value) { if (value === undefined) return 20; if (!Number.isSafeInteger(value) || value < 1 || value > 50) throw new DeliveryValidationError(); return value; }
function cursor(value) { if (value === undefined) return undefined; if (typeof value !== "string" || value.length < 8 || value.length > 4096) throw new DeliveryValidationError(); return value; }
function canonicalLines(lines) { return Object.freeze([...lines].sort((a, b) => a.paymentId.localeCompare(b.paymentId)).map((line) => Object.freeze(line))); }
function requestHash(scope) { return hash({ ...scope, lines: scope.lines ? canonicalLines(scope.lines) : undefined }); }
function receiptId(actorId, operation, idempotencyKey) { return opaqueId("payment-delivery-command", actorId, operation, idempotencyKey); }
function deliveryId(actorId, idempotencyKey) { return opaqueId("payment-delivery", actorId, idempotencyKey); }
function applicationId(delivery, payment) { return opaqueId("payment-delivery-application", delivery, payment); }
function reviewSlotId(groupId, accountId) { return opaqueId("group-capability-slot", groupId, CAPABILITY_ID, accountId); }

function economicPayment(snapshot) {
  if (!snapshot.exists) return null; const data = snapshot.data();
  const required = ["groupId", "membershipId", "personId", "seasonId", "conceptId", "conceptSnapshot", "amountMinor", "dueDate", "estado", "generationIntentId", "payloadHash", "createdAt", "schemaVersion"];
  try {
    required.forEach((field) => { if (!Object.hasOwn(data, field)) throw new Error(); });
    [snapshot.id, data.groupId, data.membershipId, data.personId, data.seasonId].forEach(id); amount(data.amountMinor);
    if (!iso(data.createdAt) || ![1, 2, 3, 4].includes(data.schemaVersion)) throw new Error();
    if (data.schemaVersion === 1) {
      if (data.estado !== "PENDING") throw new Error();
      return Object.freeze({ paymentId: snapshot.id, ...data, confirmedIncomeMinor: 0, reversedIncomeMinor: 0,
        netConfirmedIncomeMinor: 0, balanceMinor: data.amountMinor, economicState: "PENDING", economicRevision: 1 });
    }
    for (const field of ["confirmedIncomeMinor", "reversedIncomeMinor", "netConfirmedIncomeMinor", "balanceMinor", "economicRevision"]) if (!Number.isSafeInteger(data[field]) || data[field] < 0) throw new Error();
    const currentPrincipalMinor = data.schemaVersion === 4 ? data.currentPrincipalMinor : data.amountMinor;
    if (data.schemaVersion === 4) {
      amount(currentPrincipalMinor);
      if (!Number.isSafeInteger(data.principalCorrectionCount) || data.principalCorrectionCount < 1 || !id(data.lastPrincipalCorrectionId) || !iso(data.lastCorrectedAt)) throw new Error();
    }
    if (data.lifecycle === "VOIDED") {
      if (![3, 4].includes(data.schemaVersion) || data.estado !== "VOIDED" || data.economicState !== "VOIDED" || data.voidedAmountMinor !== currentPrincipalMinor
        || data.confirmedIncomeMinor !== 0 || data.reversedIncomeMinor !== 0 || data.netConfirmedIncomeMinor !== 0 || data.balanceMinor !== 0
        || !["DUPLICATE", "WRONG_MEMBERSHIP", "WRONG_CONCEPT_OR_PERIOD", "NOT_OWED", "OTHER"].includes(data.voidReasonCode)
        || text(data.voidExplanation) !== data.voidExplanation || !iso(data.voidedAt) || id(data.voidedByAccountId) !== data.voidedByAccountId) throw new Error();
      return Object.freeze({ paymentId: snapshot.id, ...data, currentPrincipalMinor });
    }
    if (data.economicRevision < 2 || data.netConfirmedIncomeMinor !== data.confirmedIncomeMinor - data.reversedIncomeMinor
      || data.balanceMinor !== currentPrincipalMinor - data.netConfirmedIncomeMinor || data.balanceMinor < 0
      || !["PENDING", "PARTIAL", "SETTLED"].includes(data.economicState) || data.estado !== data.economicState) throw new Error();
    return Object.freeze({ paymentId: snapshot.id, ...data, currentPrincipalMinor });
  } catch (cause) { throw new DeliveryIncompatibleStateError({ cause }); }
}
function paymentUpdate(payment, appliedDelta, reversedDelta) {
  const confirmedIncomeMinor = payment.confirmedIncomeMinor + appliedDelta;
  const reversedIncomeMinor = payment.reversedIncomeMinor + reversedDelta;
  const netConfirmedIncomeMinor = confirmedIncomeMinor - reversedIncomeMinor;
  const balanceMinor = (payment.currentPrincipalMinor ?? payment.amountMinor) - netConfirmedIncomeMinor;
  if (netConfirmedIncomeMinor < 0 || balanceMinor < 0) throw new DeliveryIncompatibleStateError();
  const economicState = netConfirmedIncomeMinor === 0 ? "PENDING" : balanceMinor === 0 ? "SETTLED" : "PARTIAL";
  return { confirmedIncomeMinor, reversedIncomeMinor, netConfirmedIncomeMinor, balanceMinor, economicState,
    estado: economicState, economicRevision: payment.economicRevision + 1, schemaVersion: payment.schemaVersion === 4 ? 4 : 2 };
}
function principalCorrection(snapshot) {
  if (!snapshot.exists) return null; const data = snapshot.data();
  try {
    const fields = ["correctionId", "paymentId", "groupId", "fromPrincipalMinor", "toPrincipalMinor", "deltaMinor", "reasonCode", "explanation", "correctedByAccountId", "fromEconomicRevision", "toEconomicRevision", "correctedAt", "schemaVersion"];
    if (!exact(data, fields) || data.correctionId !== snapshot.id || data.schemaVersion !== 1) throw new Error();
    [data.correctionId, data.paymentId, data.groupId, data.correctedByAccountId].forEach(id); amount(data.fromPrincipalMinor); amount(data.toPrincipalMinor);
    if (!["AMOUNT_ENTRY_ERROR", "WRONG_APPROVED_BASE_AMOUNT", "MEMBERSHIP_EXCEPTION_AMOUNT_ERROR", "ARITHMETIC_ERROR"].includes(data.reasonCode)
      || data.deltaMinor !== data.toPrincipalMinor - data.fromPrincipalMinor || data.deltaMinor === 0 || !Number.isSafeInteger(data.deltaMinor)
      || text(data.explanation) !== data.explanation || !Number.isSafeInteger(data.fromEconomicRevision) || data.fromEconomicRevision < 1
      || data.toEconomicRevision !== data.fromEconomicRevision + 1 || !iso(data.correctedAt)) throw new Error();
    return Object.freeze(data);
  } catch (cause) { throw new DeliveryIncompatibleStateError({ cause }); }
}
function principalCorrectionDto(item, owner) { return Object.freeze({ correctionId: item.correctionId, fromPrincipalMinor: item.fromPrincipalMinor,
  toPrincipalMinor: item.toPrincipalMinor, deltaMinor: item.deltaMinor, reasonCode: item.reasonCode,
  fromEconomicRevision: item.fromEconomicRevision, toEconomicRevision: item.toEconomicRevision, correctedAt: iso(item.correctedAt),
  ...(owner ? { explanation: item.explanation, actor: { label: "Owner del Grupo" } } : {}) }); }
function deliveryDto(data, { includeLines = true, person } = {}) {
  return Object.freeze({ deliveryId: data.deliveryId, receiptId: data.receiptId || data.deliveryId, origin: "INFORMED", groupId: data.groupId, seasonId: data.seasonId,
    membershipId: data.membershipId, declaredPaidOn: data.declaredPaidOn, declaredTotalMinor: data.declaredTotalMinor,
    decisionState: data.decisionState, ...(data.applicationState ? { applicationState: data.applicationState } : {}),
    reportedAt: iso(data.reportedAt), ...(data.confirmedAt ? { confirmedAt: iso(data.confirmedAt) } : {}),
    ...(data.rejectedAt ? { rejectedAt: iso(data.rejectedAt), rejection: data.rejection } : {}),
    ...(data.resolution ? { resolution: { administrativeReceiptId: data.resolution.administrativeReceiptId,
      correctedFields: data.resolution.correctedFields, resolvedAt: iso(data.resolution.resolvedAt) } } : {}),
    ...(data.reversedAt ? { reversedAt: iso(data.reversedAt), reversal: { reason: data.reversal.reason } } : {}),
    ...(includeLines ? { lines: data.lines.map((line) => ({ lineId: line.lineId, paymentId: line.paymentId,
      selectionMode: line.selectionMode, requestedAmountMinor: line.requestedAmountMinor,
      conceptName: line.conceptName, dueDate: line.dueDate })) } : {}), ...(person ? { person } : {}) });
}
function transactionBudget(operation, lineCount) {
  const writes = operation === "CONFIRM" ? 2 * lineCount + 2 : operation === "REVERSE" ? 2 * lineCount + 3 : 2;
  return Object.freeze({ operation, lineCount, maximumWrites: writes });
}

module.exports = { MAX_LINES, CAPABILITY_ID, amount, applicationId, canonicalLines, civilDate, cursor, deliveryDto,
  deliveryId, economicPayment, exact, hash, id, iso, key, opaqueId, pageSize, paymentUpdate, receiptId,
  principalCorrection, principalCorrectionDto, requestHash, reviewSlotId, stable, text, transactionBudget, revision };
