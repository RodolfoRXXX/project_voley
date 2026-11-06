"use strict";

const MAX_EVIDENCE_NOTICES = 20;
const LOOKAHEAD = 1;
const MAX_AMOUNT_MINOR = 999_999_999_999;

function validId(value) { return typeof value === "string" && value && value === value.trim() && !value.includes("/") && value.length <= 256; }
function validTimestamp(value) { return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime()); }
function validCivilDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
}
function validAmount(value) { return Number.isSafeInteger(value) && value >= 1 && value <= MAX_AMOUNT_MINOR; }

function pendingNotice(snapshot, context) {
  if (!snapshot.exists) throw new Error("Pending notice disappeared");
  const data = snapshot.data();
  const required = ["deliveryId", "groupId", "seasonId", "membershipId", "personId", "reportedByAccountId", "declaredPaidOn", "lines", "declaredTotalMinor", "decisionState", "reportedAt", "revision", "schemaVersion"];
  if (required.some((field) => !Object.hasOwn(data, field)) || data.deliveryId !== snapshot.id || ![1, 2].includes(data.schemaVersion)
    || (data.schemaVersion === 2 && (data.origin !== "INFORMED" || data.receiptId !== snapshot.id)) || data.decisionState !== "REPORTED"
    || data.groupId !== context.groupId || data.seasonId !== context.seasonId || data.membershipId !== context.membershipId || data.personId !== context.personId
    || !validTimestamp(data.reportedAt) || !validCivilDate(data.declaredPaidOn) || !Number.isSafeInteger(data.revision) || data.revision < 1
    || !Array.isArray(data.lines) || data.lines.length < 1 || data.lines.length > 20) throw new Error("Invalid pending notice");
  [data.deliveryId, data.groupId, data.seasonId, data.membershipId, data.personId, data.reportedByAccountId].forEach((value) => { if (!validId(value)) throw new Error("Invalid pending notice identity"); });
  const paymentIds = new Set(); let total = 0;
  const lines = data.lines.map((line) => {
    if (!line || !validId(line.lineId) || !validId(line.paymentId) || paymentIds.has(line.paymentId) || !validAmount(line.requestedAmountMinor)
      || !["PARTIAL", "FULL"].includes(line.selectionMode) || typeof line.conceptName !== "string" || !line.conceptName.trim() || !validCivilDate(line.dueDate)) throw new Error("Invalid pending notice line");
    paymentIds.add(line.paymentId); total += line.requestedAmountMinor;
    return Object.freeze({ paymentId: line.paymentId, requestedAmountMinor: line.requestedAmountMinor });
  });
  if (!validAmount(data.declaredTotalMinor) || data.declaredTotalMinor !== total) throw new Error("Invalid pending notice total");
  return Object.freeze({ deliveryId: data.deliveryId, reportedAt: data.reportedAt.toDate().toISOString(), declaredPaidOn: data.declaredPaidOn, lines: Object.freeze(lines) });
}

function createSubjectPendingNoticeEvidenceCapability({ db, testHooks = Object.freeze({}) }) {
  if (!db || !testHooks || typeof testHooks !== "object") throw new TypeError("Pending notice evidence dependencies are required");
  const deliveries = db.collection("paymentDeliveries");
  async function find({ unitOfWork, personId, groupId, seasonId, membershipId, paymentIds }) {
    if (!unitOfWork || !validId(personId) || !validId(groupId) || !validId(seasonId) || !validId(membershipId)
      || !Array.isArray(paymentIds) || paymentIds.length > 20 || paymentIds.some((value) => !validId(value))) throw new TypeError("Pending notice evidence context is required");
    if (paymentIds.length === 0) return Object.freeze({ coverage: "COMPLETE", evidence: new Map() });
    try {
      if (typeof testHooks.beforePendingNoticeEvidenceQuery === "function") await testHooks.beforePendingNoticeEvidenceQuery();
      const query = deliveries.where("membershipId", "==", membershipId).where("decisionState", "==", "REPORTED").orderBy("__name__", "asc").limit(MAX_EVIDENCE_NOTICES + LOOKAHEAD);
      const snapshot = await unitOfWork.get(query);
      const validated = snapshot.docs.map((doc) => pendingNotice(doc, { personId, groupId, seasonId, membershipId }));
      const coverage = validated.length > MAX_EVIDENCE_NOTICES ? "PARTIAL" : "COMPLETE";
      const requested = new Set(paymentIds); const found = new Map();
      for (const notice of validated.slice(0, MAX_EVIDENCE_NOTICES)) for (const line of notice.lines) {
        if (!requested.has(line.paymentId)) continue;
        const current = found.get(line.paymentId)?.notice;
        if (current && (current.reportedAt > notice.reportedAt || current.reportedAt === notice.reportedAt && current.deliveryId > notice.deliveryId)) continue;
        found.set(line.paymentId, Object.freeze({ state: "FOUND", notice: Object.freeze({ deliveryId: notice.deliveryId, reportedAt: notice.reportedAt, declaredPaidOn: notice.declaredPaidOn, requestedAmountMinor: line.requestedAmountMinor }) }));
      }
      const evidence = new Map(paymentIds.map((paymentId) => [paymentId, found.get(paymentId) || Object.freeze(coverage === "COMPLETE" ? { state: "NONE" } : { state: "UNKNOWN", reason: "PARTIAL_COVERAGE" })]));
      return Object.freeze({ coverage, evidence });
    } catch (cause) {
      const evidence = new Map(paymentIds.map((paymentId) => [paymentId, Object.freeze({ state: "UNKNOWN", reason: "SUPPLEMENT_UNAVAILABLE" })]));
      return Object.freeze({ coverage: "FAILED", evidence, cause });
    }
  }
  return Object.freeze({ find });
}

module.exports = { MAX_EVIDENCE_NOTICES, createSubjectPendingNoticeEvidenceCapability };
