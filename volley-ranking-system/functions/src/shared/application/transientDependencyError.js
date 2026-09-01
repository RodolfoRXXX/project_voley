"use strict";

const MAX_CAUSE_DEPTH = 8;
const TRANSIENT_CODES = new Set([
  4, 8, 14,
  "4", "8", "14",
  "deadline-exceeded", "resource-exhausted", "unavailable",
  "DEADLINE_EXCEEDED", "RESOURCE_EXHAUSTED", "UNAVAILABLE",
  "grpc4", "grpc8", "grpc14",
  "grpc-4", "grpc-8", "grpc-14",
  "grpc/4", "grpc/8", "grpc/14",
]);

function boundedErrorChain(error) {
  const chain = [];
  const visited = new Set();
  let current = error;
  while (current
    && (typeof current === "object" || typeof current === "function")
    && !visited.has(current)
    && chain.length < MAX_CAUSE_DEPTH) {
    visited.add(current);
    chain.push(current);
    current = current.cause;
  }
  return chain;
}

function isTransientDependencyError(error) {
  return boundedErrorChain(error).some((current) => TRANSIENT_CODES.has(current.code));
}

module.exports = { MAX_CAUSE_DEPTH, boundedErrorChain, isTransientDependencyError };
