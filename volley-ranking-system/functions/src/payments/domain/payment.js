"use strict";

const crypto = require("node:crypto");
const { PaymentIncompatibleStateError, PaymentValidationError } = require("../application/paymentErrors");

const MAX_AMOUNT_MINOR = 999_999_999_999;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;
const FORBIDDEN_TEXT = /[\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;

function plain(value) { return value && typeof value === "object" && !Array.isArray(value); }
function exact(value, keys) {
  if (!plain(value)) return false;
  const actual = Object.keys(value).sort(); const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}
function requireExact(value, keys) { if (!exact(value, keys)) throw new PaymentValidationError(); return value; }
function requireId(value) {
  if (typeof value !== "string" || !value || value !== value.trim() || value.includes("/") || value.length > 256) throw new PaymentValidationError();
  return value;
}
function normalizeText(value, { maxPoints, maxBytes }) {
  if (typeof value !== "string" || FORBIDDEN_TEXT.test(value)) throw new PaymentValidationError();
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!normalized || Array.from(normalized).length > maxPoints || Buffer.byteLength(normalized, "utf8") > maxBytes) throw new PaymentValidationError();
  return normalized;
}
function normalizeConceptName(value) { return normalizeText(value, { maxPoints: 80, maxBytes: 160 }); }
function normalizeOccurrenceName(value) { return normalizeText(value, { maxPoints: 100, maxBytes: 200 }); }
function normalizeExceptionReason(value) { return normalizeText(value, { maxPoints: 240, maxBytes: 480 }); }
function requireAmount(value) { if (!Number.isSafeInteger(value) || value < 1 || value > MAX_AMOUNT_MINOR) throw new PaymentValidationError(); return value; }
function requireVersion(value) { if (!Number.isSafeInteger(value) || value < 1) throw new PaymentValidationError(); return value; }
function requireIdempotencyKey(value) { if (typeof value !== "string" || !IDEMPOTENCY_PATTERN.test(value)) throw new PaymentValidationError(); return value; }
function requireKind(value) { if (!['MONTHLY', 'ONE_TIME'].includes(value)) throw new PaymentValidationError(); return value; }
function requirePageSize(value, maximum = 50) { if (value === undefined) return 20; if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new PaymentValidationError(); return value; }
function validDateParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || ""); if (!match) return false;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function requireDueDate(value) { if (!validDateParts(value)) throw new PaymentValidationError(); return value; }
function currentPeriodKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}`;
}
function requirePeriodKey(value, now = new Date()) {
  const match = /^(\d{4})-(\d{2})$/.exec(value || "");
  if (!match || Number(match[1]) < 1 || Number(match[2]) < 1 || Number(match[2]) > 12 || value > currentPeriodKey(now)) throw new PaymentValidationError();
  return value;
}
function monthBounds(periodKey) {
  const [year, month] = periodKey.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year; const nextMonth = month === 12 ? 1 : month + 1;
  return Object.freeze({
    start: new Date(`${periodKey}-01T00:00:00-03:00`),
    next: new Date(`${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01T00:00:00-03:00`),
  });
}
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function hash(value) { return crypto.createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex"); }
function opaqueId(...parts) { return hash(parts.join("\u001f")); }
function iso(value) { return value?.toDate?.().toISOString?.() || null; }

function hydrateConcept(id, data) {
  try {
    requireId(id);
    if (!exact(data, ["groupId", "name", "kind", "currency", "defaultAmountMinor", "estado", "version", "createdAt", "updatedAt", "schemaVersion"])) throw new Error();
    requireId(data.groupId); if (normalizeConceptName(data.name) !== data.name) throw new Error(); requireKind(data.kind);
    if (data.currency !== "ARS" || !["ACTIVE", "INACTIVE"].includes(data.estado) || data.schemaVersion !== 1) throw new Error();
    requireAmount(data.defaultAmountMinor); requireVersion(data.version);
    if (!iso(data.createdAt) || !iso(data.updatedAt)) throw new Error();
    return Object.freeze({ conceptId: id, ...data });
  } catch (cause) { throw new PaymentIncompatibleStateError({ cause }); }
}
function hydrateOccurrence(id, data) {
  try {
    requireId(id);
    const unused = data?.estado === "UNUSED";
    const fields = ["groupId", "conceptId", "createdUnderConceptVersion", "name", "estado", "createdAt", "schemaVersion", ...(unused ? [] : ["firstUsedAt"])];
    if (!exact(data, fields)) throw new Error(); requireId(data.groupId); requireId(data.conceptId); requireVersion(data.createdUnderConceptVersion);
    if (normalizeOccurrenceName(data.name) !== data.name || !["UNUSED", "USED"].includes(data.estado) || data.schemaVersion !== 1 || !iso(data.createdAt) || (!unused && !iso(data.firstUsedAt))) throw new Error();
    return Object.freeze({ occurrenceKey: id, ...data });
  } catch (cause) { throw new PaymentIncompatibleStateError({ cause }); }
}
function conceptDto(concept) { return Object.freeze({ conceptId: concept.conceptId, version: concept.version, name: concept.name, kind: concept.kind, defaultAmountMinor: concept.defaultAmountMinor, estado: concept.estado, currency: "ARS" }); }
function occurrenceDto(item) { return Object.freeze({ occurrenceKey: item.occurrenceKey, name: item.name, estado: item.estado, createdAt: iso(item.createdAt) }); }
function paymentDto(payment, { owner = false, now = new Date(), person } = {}) {
  const dto = {
    paymentId: payment.paymentId, groupId: payment.groupId, membershipId: payment.membershipId,
    concept: { conceptId: payment.conceptId, ...payment.conceptSnapshot }, amountMinor: payment.amountMinor, dueDate: payment.dueDate,
    estado: payment.estado, overdue: payment.estado === "PENDING" && payment.dueDate < new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(now),
    ...(payment.periodKey ? { periodKey: payment.periodKey } : { occurrenceKey: payment.occurrenceKey }),
    ...(payment.exceptionReason ? { exceptionReason: payment.exceptionReason } : {}), createdAt: iso(payment.createdAt),
  };
  if (owner && person) dto.person = person;
  if (!owner) delete dto.groupId;
  return Object.freeze(dto);
}

module.exports = {
  MAX_AMOUNT_MINOR, conceptDto, currentPeriodKey, exact, hash, hydrateConcept, hydrateOccurrence, iso, occurrenceDto,
  monthBounds, normalizeConceptName, normalizeExceptionReason, normalizeOccurrenceName, opaqueId,
  paymentDto, requireAmount, requireDueDate, requireExact, requireId, requireIdempotencyKey, requireKind,
  requirePageSize, requirePeriodKey, requireVersion, stable,
};
