"use strict";

const { randomUUID } = require("node:crypto");

const OPERATIONS = new Set(["membership-cargo-update", "administrative-finalization"]);
const PHASES = new Set(["transaction", "recovery", "mapping"]);
const SAFE_CODE = /^[A-Za-z0-9_./-]{1,64}$/;

function technicalCode(error) {
  const visited = new Set();
  let current = error;
  for (let depth = 0; current && (typeof current === "object" || typeof current === "function")
    && !visited.has(current) && depth < 6; depth += 1) {
    visited.add(current);
    if (typeof current.code === "number" && Number.isFinite(current.code)) return current.code;
    if (typeof current.code === "string" && SAFE_CODE.test(current.code)) return current.code;
    current = current.cause;
  }
  return null;
}

function sanitizedErrorType(error) {
  if (technicalCode(error) !== null) return "CODED_ERROR";
  if (error instanceof Error) return "UNCODED_ERROR";
  return "NON_ERROR_THROWN";
}

function createMembershipTransactionObserver({
  logger = console,
  now = () => Date.now(),
  createCorrelationId = () => randomUUID(),
} = {}) {
  return Object.freeze({
    start(operation) {
      if (!OPERATIONS.has(operation)) throw new TypeError("Unsupported Membership transaction operation");
      let correlationId;
      let startedAt;
      try {
        correlationId = createCorrelationId();
        startedAt = now();
      } catch {
        return Object.freeze({ record() {} });
      }
      return Object.freeze({
        record(phase, error) {
          if (!PHASES.has(phase)) return;
          try {
            const finishedAt = now();
            logger.warn?.("membership.transaction-technical-error", Object.freeze({
              operation,
              phase,
              technicalCode: technicalCode(error),
              errorType: sanitizedErrorType(error),
              durationMs: Math.max(0, finishedAt - startedAt),
              correlationId,
            }));
          } catch {
            // Observability must never alter the operation or its original error.
          }
        },
      });
    },
  });
}

module.exports = {
  createMembershipTransactionObserver,
  sanitizedErrorType,
  technicalCode,
};
