"use strict";

function object(value) { return value && typeof value === "object" && !Array.isArray(value); }
function exact(value, allowed) { return object(value) && Object.keys(value).every((key) => allowed.includes(key)); }
function token(value) { return typeof value === "string" && value.length >= 16 && value.length <= 4096; }
function key(value) { return typeof value === "string" && value.length >= 16 && value.length <= 128; }
function revision(value) { return Number.isSafeInteger(value) && value >= 0; }
function pageSize(value) { if (value === undefined) return 10; if (!Number.isSafeInteger(value) || value < 1 || value > 10) throw new TypeError("INVALID_ARGUMENT"); return value; }

function validateList(value) {
  const allowed = ["bucket", "pageSize", "cursor"];
  if (!exact(value, allowed) || (value.bucket !== undefined && !["PENDING", "REJECTED", "PENDING_MERGE"].includes(value.bucket))
    || (value.cursor !== undefined && !token(value.cursor))) throw new TypeError("INVALID_ARGUMENT");
  return { bucket: value.bucket || "PENDING", pageSize: pageSize(value.pageSize), cursor: value.cursor };
}

function validateDetail(value) {
  if (!exact(value, ["candidateRef"]) || Object.keys(value).length !== 1 || !token(value.candidateRef)) throw new TypeError("INVALID_ARGUMENT");
  return { candidateRef: value.candidateRef };
}

function validateReject(value) {
  if (!exact(value, ["candidateRef", "expectedEmailRevision", "idempotencyKey"]) || Object.keys(value).length !== 3
    || !token(value.candidateRef) || !revision(value.expectedEmailRevision) || !key(value.idempotencyKey)) throw new TypeError("INVALID_ARGUMENT");
  return value;
}

function validateReconsider(value) {
  if (!exact(value, ["candidateRef", "expectedDecisionRevision", "idempotencyKey"]) || Object.keys(value).length !== 3
    || !token(value.candidateRef) || !revision(value.expectedDecisionRevision) || !key(value.idempotencyKey)) throw new TypeError("INVALID_ARGUMENT");
  return value;
}

function validateRecognize(value) {
  if (!exact(value, ["candidateRef", "expectedEmailRevision", "previewToken", "idempotencyKey"]) || Object.keys(value).length !== 4
    || !token(value.candidateRef) || !revision(value.expectedEmailRevision) || !token(value.previewToken) || !key(value.idempotencyKey)) throw new TypeError("INVALID_ARGUMENT");
  return value;
}

function validateResult(value) {
  if (!exact(value, ["operationRef"]) || Object.keys(value).length !== 1 || !token(value.operationRef)) throw new TypeError("INVALID_ARGUMENT");
  return value;
}

module.exports = { validateDetail, validateList, validateRecognize, validateReconsider, validateReject, validateResult };
