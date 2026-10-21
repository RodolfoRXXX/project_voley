"use strict";

const crypto = require("node:crypto");

const CONTRACT = "registered-income-movements-v1";
const MAX_FACTS = 1000;
const DETECTION_LIMIT = MAX_FACTS + 1;

class RegisteredIncomeMovementError extends Error {
  constructor(reason, message, details) {
    super(message || reason);
    this.name = "RegisteredIncomeMovementError";
    this.reason = reason;
    if (details !== undefined) this.details = details;
  }
}

function fail(reason, message, details) {
  throw new RegisteredIncomeMovementError(reason, message, details);
}

function isTimestamp(value) {
  return Boolean(value && typeof value.toMillis === "function"
    && typeof value.toDate === "function" && Number.isFinite(value.toMillis()));
}

function timestampTuple(value) {
  if (!isTimestamp(value)) fail("DATA_INCOMPATIBLE", "A canonical timestamp is required");
  return Object.freeze({ seconds: value.seconds, nanoseconds: value.nanoseconds });
}

function compareTimestamp(left, right) {
  const seconds = left.seconds - right.seconds;
  return seconds || left.nanoseconds - right.nanoseconds;
}

function inWindow(value, startInclusive, endExclusive, cutoffExclusive) {
  const candidate = timestampTuple(value);
  return compareTimestamp(candidate, timestampTuple(startInclusive)) >= 0
    && compareTimestamp(candidate, timestampTuple(endExclusive)) < 0
    && compareTimestamp(candidate, timestampTuple(cutoffExclusive)) < 0;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stable(value)).digest("hex");
}

function requireString(data, field) {
  if (typeof data?.[field] !== "string" || !data[field]) {
    fail("DATA_INCOMPATIBLE", `Invalid ${field}`);
  }
  return data[field];
}

function requireMoney(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail("DATA_INCOMPATIBLE", `Invalid ${field}`);
  }
  return value;
}

function receiptShape(snapshot, stream) {
  if (!snapshot?.exists) fail("DATA_INCOMPATIBLE", "Missing receipt root");
  const data = snapshot.data();
  const receiptId = snapshot.id;
  const common = {
    receiptId,
    groupId: requireString(data, "groupId"),
    seasonId: requireString(data, "seasonId"),
    membershipId: requireString(data, "membershipId"),
    personId: requireString(data, "personId"),
  };
  if (!Array.isArray(data.lines) || data.lines.length < 1 || data.lines.length > 20) {
    fail("DATA_INCOMPATIBLE", "Receipt lines are outside the canonical range");
  }
  if (!['APPLIED', 'REVERSED'].includes(data.applicationState)) {
    fail("DATA_INCOMPATIBLE", "Invalid application state");
  }
  if (data.applicationState === "REVERSED" && !isTimestamp(data.reversedAt)) {
    fail("DATA_INCOMPATIBLE", "A reversed receipt requires reversedAt");
  }
  if (data.reversedAt !== undefined && !isTimestamp(data.reversedAt)) {
    fail("DATA_INCOMPATIBLE", "Invalid reversedAt");
  }

  if (stream === "ADMINISTRATIVE") {
    if (data.schemaVersion !== 2 || data.origin !== "ADMINISTRATIVE"
      || data.receiptId !== receiptId || data.deliveryId !== undefined
      || data.decisionState !== undefined || !isTimestamp(data.recordedAt)
      || typeof data.receivedOn !== "string") {
      fail("DATA_INCOMPATIBLE", "Invalid administrative receipt");
    }
    const totalMinor = requireMoney(data.totalMinor, "totalMinor");
    if (data.lines.reduce((sum, line) => sum + requireMoney(line.amountMinor, "line.amountMinor"), 0) !== totalMinor) {
      fail("DATA_INCOMPATIBLE", "Administrative receipt total does not match its lines");
    }
    return Object.freeze({ ...common, origin: "ADMINISTRATIVE", totalMinor,
      incomeAt: data.recordedAt, effectiveOn: data.receivedOn, reversedAt: data.reversedAt });
  }

  if (![1, 2].includes(data.schemaVersion) || data.deliveryId !== receiptId
    || (data.schemaVersion === 2 && (data.origin !== "INFORMED" || data.receiptId !== receiptId))
    || data.decisionState !== "CONFIRMED" || !isTimestamp(data.confirmedAt)
    || typeof data.declaredPaidOn !== "string") {
    fail("DATA_INCOMPATIBLE", "Invalid informed receipt");
  }
  const totalMinor = requireMoney(data.declaredTotalMinor, "declaredTotalMinor");
  if (data.lines.reduce((sum, line) => sum + requireMoney(line.requestedAmountMinor, "line.requestedAmountMinor"), 0) !== totalMinor) {
    fail("DATA_INCOMPATIBLE", "Informed receipt total does not match its lines");
  }
  return Object.freeze({ ...common, origin: "INFORMED", totalMinor,
    incomeAt: data.confirmedAt, effectiveOn: data.declaredPaidOn, reversedAt: data.reversedAt });
}

function factFromSnapshot(snapshot, stream, window) {
  const receipt = receiptShape(snapshot, stream === "REVERSAL"
    ? (snapshot.data().origin === "ADMINISTRATIVE" ? "ADMINISTRATIVE" : "INFORMED")
    : stream);
  const receiptStateAtCutoff = receipt.reversedAt
    && compareTimestamp(timestampTuple(receipt.reversedAt), timestampTuple(window.cutoffExclusive)) < 0
    ? "REVERSED" : "APPLIED";
  if (stream === "REVERSAL") {
    if (!receipt.reversedAt || !inWindow(receipt.reversedAt, window.startInclusive,
      window.endExclusive, window.cutoffExclusive)) {
      fail("DATA_INCOMPATIBLE", "Reversal query returned a fact outside its window");
    }
    return Object.freeze({ movementId: `reversal:${receipt.receiptId}`, kind: "RECORD_REVERSAL",
      receiptId: receipt.receiptId, origin: receipt.origin, groupId: receipt.groupId,
      seasonId: receipt.seasonId, membershipId: receipt.membershipId, personId: receipt.personId,
      amountMinor: receipt.totalMinor, eventAt: timestampTuple(receipt.reversedAt),
      effectiveOn: receipt.effectiveOn, receiptStateAtCutoff });
  }
  if (!inWindow(receipt.incomeAt, window.startInclusive, window.endExclusive, window.cutoffExclusive)) {
    fail("DATA_INCOMPATIBLE", "Income query returned a fact outside its window");
  }
  return Object.freeze({ movementId: `income:${receipt.receiptId}`, kind: "INCOME_RECORDED",
    receiptId: receipt.receiptId, origin: receipt.origin, groupId: receipt.groupId,
    seasonId: receipt.seasonId, membershipId: receipt.membershipId, personId: receipt.personId,
    amountMinor: receipt.totalMinor, eventAt: timestampTuple(receipt.incomeAt),
    effectiveOn: receipt.effectiveOn, receiptStateAtCutoff });
}

function compareFacts(left, right) {
  return compareTimestamp(right.eventAt, left.eventAt)
    || right.movementId.localeCompare(left.movementId, "en");
}

function buildManifest({ scope, cutoffExclusive, informed, administrative, reversals }) {
  const window = { startInclusive: scope.periodStartInclusive,
    endExclusive: scope.periodEndExclusive, cutoffExclusive };
  const facts = [
    ...informed.map((snapshot) => factFromSnapshot(snapshot, "INFORMED", window)),
    ...administrative.map((snapshot) => factFromSnapshot(snapshot, "ADMINISTRATIVE", window)),
    ...reversals.map((snapshot) => factFromSnapshot(snapshot, "REVERSAL", window)),
  ].sort(compareFacts);
  if (facts.length > MAX_FACTS) fail("MOVEMENT_LIMIT_EXCEEDED", "The query exceeds 1,000 facts");
  if (new Set(facts.map((fact) => fact.movementId)).size !== facts.length) {
    fail("DATA_INCOMPATIBLE", "Duplicate movement identity");
  }
  const totals = Object.freeze({
    grossRecordedIncomeMinor: facts.filter((fact) => fact.kind === "INCOME_RECORDED")
      .reduce((sum, fact) => sum + fact.amountMinor, 0),
    reversedRecordsMinor: facts.filter((fact) => fact.kind === "RECORD_REVERSAL")
      .reduce((sum, fact) => sum + fact.amountMinor, 0),
    netRegisteredIncomeMinor: 0,
    movementCount: facts.length,
  });
  const finalizedTotals = Object.freeze({ ...totals,
    netRegisteredIncomeMinor: totals.grossRecordedIncomeMinor - totals.reversedRecordsMinor });
  const digestScope = { contract: CONTRACT, actorId: scope.actorId, audience: scope.audience,
    groupId: scope.groupId, periodStartInclusive: timestampTuple(scope.periodStartInclusive),
    periodEndExclusive: timestampTuple(scope.periodEndExclusive) };
  const manifestDigest = digest({ scope: digestScope, cutoffExclusive: timestampTuple(cutoffExclusive), facts });
  return Object.freeze({ facts: Object.freeze(facts), totals: finalizedTotals, manifestDigest });
}

module.exports = {
  CONTRACT,
  DETECTION_LIMIT,
  MAX_FACTS,
  RegisteredIncomeMovementError,
  buildManifest,
  compareFacts,
  digest,
  stable,
  timestampTuple,
};
