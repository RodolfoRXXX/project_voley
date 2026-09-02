"use strict";

const DIAGNOSTIC = Symbol("membershipDiagnostic");
const OPERATIONS = new Set(["create", "finalize", "get"]);
const STAGES = new Set([
  "account", "person", "group", "season", "active-guard", "lifecycle-guard",
  "transaction", "authoritative-reread", "dto", "callable",
]);

function safeCode(error) {
  return typeof error?.code === "number" || typeof error?.code === "string"
    ? error.code
    : undefined;
}

function annotateMembershipError(error, metadata) {
  if (!error || (typeof error !== "object" && typeof error !== "function")) return error;
  const previous = error[DIAGNOSTIC] || {};
  const next = Object.freeze({
    operation: OPERATIONS.has(previous.operation) ? previous.operation : metadata.operation,
    stage: STAGES.has(previous.stage) ? previous.stage : metadata.stage,
    attempt: Number.isInteger(previous.attempt) && previous.attempt > 0 ? previous.attempt : metadata.attempt,
    mapper: previous.mapper || metadata.mapper,
  });
  Object.defineProperty(error, DIAGNOSTIC, { value: next, configurable: true });
  return error;
}

function inheritMembershipDiagnostic(target, source, fallback) {
  return annotateMembershipError(target, { ...fallback, ...(source?.[DIAGNOSTIC] || {}) });
}

function diagnosticFor(error) {
  return error?.[DIAGNOSTIC] || Object.freeze({});
}

function sanitizedCauseChain(error) {
  const chain = [];
  const visited = new Set();
  let current = error?.cause;
  while (current && (typeof current === "object" || typeof current === "function")
    && !visited.has(current) && chain.length < 6) {
    visited.add(current);
    chain.push(Object.freeze({
      class: current.constructor?.name || "UnknownError",
      name: typeof current.name === "string" ? current.name : undefined,
      code: safeCode(current),
      codeType: typeof safeCode(current),
      reason: typeof current.reason === "string" ? current.reason : undefined,
    }));
    current = current.cause;
  }
  return Object.freeze(chain);
}

function logUnexpectedMembershipError({ error, operation, logger = console }) {
  const metadata = diagnosticFor(error);
  const event = Object.freeze({
    operation: OPERATIONS.has(metadata.operation) ? metadata.operation : operation,
    stage: STAGES.has(metadata.stage) ? metadata.stage : "callable",
    reason: typeof error?.reason === "string" ? error.reason : "INTERNAL_ERROR",
    code: safeCode(error),
    codeType: typeof safeCode(error),
    class: error?.constructor?.name || "UnknownError",
    name: typeof error?.name === "string" ? error.name : undefined,
    attempt: Number.isInteger(metadata.attempt) && metadata.attempt > 0 ? metadata.attempt : undefined,
    mapper: metadata.mapper || (typeof error?.reason === "string" ? error.constructor?.name : "callable-fallback"),
    cause: sanitizedCauseChain(error),
  });
  logger.error("Membership unexpected error", event);
  return event;
}

module.exports = {
  annotateMembershipError,
  diagnosticFor,
  inheritMembershipDiagnostic,
  logUnexpectedMembershipError,
  sanitizedCauseChain,
};
