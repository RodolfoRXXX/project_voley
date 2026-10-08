"use strict";

const {
  normalizeConceptName, normalizeExceptionReason, normalizeOccurrenceName, requireAmount, requireDueDate,
  requireExact, requireId, requireIdempotencyKey, requireKind, requirePageSize, requirePeriodKey, requireVersion,
} = require("../domain/payment");
const { PaymentValidationError } = require("./paymentErrors");

function optionalCursor(value) { if (value === undefined) return undefined; if (typeof value !== "string" || value.length < 8 || value.length > 4096) throw new PaymentValidationError(); return value; }
function groupPage(data, max = 50) { requireExact(data, ["groupId", ...(data?.pageSize === undefined ? [] : ["pageSize"]), ...(data?.cursor === undefined ? [] : ["cursor"])]); return Object.freeze({ groupId: requireId(data.groupId), pageSize: requirePageSize(data.pageSize, max), cursor: optionalCursor(data.cursor) }); }
function validateCreateConcept(data) { requireExact(data, ["groupId", "name", "kind", "defaultAmountMinor", "idempotencyKey"]); return Object.freeze({ groupId: requireId(data.groupId), name: normalizeConceptName(data.name), kind: requireKind(data.kind), defaultAmountMinor: requireAmount(data.defaultAmountMinor), idempotencyKey: requireIdempotencyKey(data.idempotencyKey) }); }
function validateRenameConcept(data) { requireExact(data, ["groupId", "conceptId", "name", "expectedVersion", "idempotencyKey"]); return Object.freeze({ groupId: requireId(data.groupId), conceptId: requireId(data.conceptId), name: normalizeConceptName(data.name), expectedVersion: requireVersion(data.expectedVersion), idempotencyKey: requireIdempotencyKey(data.idempotencyKey) }); }
function validateChangeAmount(data) { requireExact(data, ["groupId", "conceptId", "defaultAmountMinor", "expectedVersion", "idempotencyKey"]); return Object.freeze({ groupId: requireId(data.groupId), conceptId: requireId(data.conceptId), defaultAmountMinor: requireAmount(data.defaultAmountMinor), expectedVersion: requireVersion(data.expectedVersion), idempotencyKey: requireIdempotencyKey(data.idempotencyKey) }); }
function validateDeactivateConcept(data) { requireExact(data, ["groupId", "conceptId", "expectedVersion", "idempotencyKey"]); return Object.freeze({ groupId: requireId(data.groupId), conceptId: requireId(data.conceptId), expectedVersion: requireVersion(data.expectedVersion), idempotencyKey: requireIdempotencyKey(data.idempotencyKey) }); }
function validateListConcepts(data) { return groupPage(data); }
function validateListOccurrences(data) { requireExact(data, ["groupId", "conceptId", ...(data?.pageSize === undefined ? [] : ["pageSize"]), ...(data?.cursor === undefined ? [] : ["cursor"])]); return Object.freeze({ groupId: requireId(data.groupId), conceptId: requireId(data.conceptId), pageSize: requirePageSize(data.pageSize), cursor: optionalCursor(data.cursor) }); }
function validateCreateOccurrence(data) { requireExact(data, ["groupId", "conceptId", "expectedConceptVersion", "name", "occurrenceListToken", "idempotencyKey"]); if (typeof data.occurrenceListToken !== "string" || data.occurrenceListToken.length !== 64) throw new PaymentValidationError(); return Object.freeze({ groupId: requireId(data.groupId), conceptId: requireId(data.conceptId), expectedConceptVersion: requireVersion(data.expectedConceptVersion), name: normalizeOccurrenceName(data.name), occurrenceListToken: data.occurrenceListToken, idempotencyKey: requireIdempotencyKey(data.idempotencyKey) }); }
function validateCandidates(data) { requireExact(data, ["groupId", "periodKey", ...(data?.pageSize === undefined ? [] : ["pageSize"]), ...(data?.cursor === undefined ? [] : ["cursor"])]); return Object.freeze({ groupId: requireId(data.groupId), periodKey: requirePeriodKey(data.periodKey), pageSize: requirePageSize(data.pageSize, 20), cursor: optionalCursor(data.cursor) }); }
function validateGeneration(data) {
  const common = ["groupId", "conceptId", "expectedConceptVersion", "membershipIds", "dueDate", "baseAmountMinor", "exceptions", "generationIdempotencyKey", "kind"];
  const kind = requireKind(data?.kind); requireExact(data, [...common, kind === "MONTHLY" ? "periodKey" : "occurrenceKey"]);
  if (!Array.isArray(data.membershipIds) || data.membershipIds.length < 1 || data.membershipIds.length > 50) throw new PaymentValidationError();
  const membershipIds = data.membershipIds.map(requireId); if (new Set(membershipIds).size !== membershipIds.length) throw new PaymentValidationError();
  if (!Array.isArray(data.exceptions) || data.exceptions.length > 50) throw new PaymentValidationError();
  const exceptions = data.exceptions.map((item) => { requireExact(item, ["membershipId", "amountMinor", "reason"]); const membershipId = requireId(item.membershipId); if (!membershipIds.includes(membershipId)) throw new PaymentValidationError(); return Object.freeze({ membershipId, amountMinor: requireAmount(item.amountMinor), reason: normalizeExceptionReason(item.reason) }); });
  if (new Set(exceptions.map((item) => item.membershipId)).size !== exceptions.length) throw new PaymentValidationError();
  const baseAmountMinor = requireAmount(data.baseAmountMinor); if (exceptions.some((item) => item.amountMinor === baseAmountMinor)) throw new PaymentValidationError();
  return Object.freeze({ groupId: requireId(data.groupId), conceptId: requireId(data.conceptId), expectedConceptVersion: requireVersion(data.expectedConceptVersion), membershipIds: Object.freeze(membershipIds), dueDate: requireDueDate(data.dueDate), baseAmountMinor, exceptions: Object.freeze(exceptions), generationIdempotencyKey: requireIdempotencyKey(data.generationIdempotencyKey), kind, ...(kind === "MONTHLY" ? { periodKey: requirePeriodKey(data.periodKey) } : { occurrenceKey: requireId(data.occurrenceKey) }) });
}
function validateListGroupObligations(data) { return groupPage(data); }
function validateListMyObligations(data) { requireExact(data, [...(data?.pageSize === undefined ? [] : ["pageSize"]), ...(data?.cursor === undefined ? [] : ["cursor"])]); return Object.freeze({ pageSize: requirePageSize(data.pageSize), cursor: optionalCursor(data.cursor) }); }

module.exports = { validateCandidates, validateChangeAmount, validateCreateConcept, validateCreateOccurrence, validateDeactivateConcept, validateGeneration, validateListConcepts, validateListGroupObligations, validateListMyObligations, validateListOccurrences, validateRenameConcept };
