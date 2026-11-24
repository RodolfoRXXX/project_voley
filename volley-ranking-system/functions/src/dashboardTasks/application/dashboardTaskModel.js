"use strict";

const crypto = require("crypto");

const COVERAGE = "N20_N31_V1";
const COVERAGE_V2 = "N20_N31_N42_V2";
const GENERATION = "live-v1";
const GENERATION_V2 = "live-v2";
const TASK_TYPES = Object.freeze({ JOIN_REQUEST: "N20", PAYMENT_DELIVERY: "N31", GROUP_INVITATION: "N42" });
const EVENT_STATUS = Object.freeze({ PENDING: "PENDING", PROCESSING: "PROCESSING", APPLIED: "APPLIED", FAILED: "FAILED" });
const SCOPE_STATUS = Object.freeze({ DIRTY: "DIRTY", PROCESSING: "PROCESSING", READY: "READY", DEGRADED: "DEGRADED", REBUILDING: "REBUILDING" });

function hash(...parts) {
  return crypto.createHash("sha256").update(parts.map((part) => String(part)).join("\u001f")).digest("hex");
}

function taskId(taskType, resourceId) {
  const prefix = taskType === TASK_TYPES.JOIN_REQUEST ? "JOIN_REQUEST_DECISION"
    : taskType === TASK_TYPES.PAYMENT_DELIVERY ? "PAYMENT_DELIVERY_REVIEW" : "GROUP_INVITATION_RESPONSE";
  return `${prefix}:${resourceId}`;
}

function eventId(kind, idempotencyIdentity) { return hash("dashboard-task-event-v1", kind, idempotencyIdentity); }
function itemId(taskIdentity) { return hash(COVERAGE, taskIdentity); }

module.exports = { COVERAGE, COVERAGE_V2, GENERATION, GENERATION_V2, TASK_TYPES, EVENT_STATUS, SCOPE_STATUS, hash, taskId, eventId, itemId };
