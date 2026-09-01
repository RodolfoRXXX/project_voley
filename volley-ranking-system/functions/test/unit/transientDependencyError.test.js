"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { MAX_CAUSE_DEPTH, boundedErrorChain, isTransientDependencyError } = require("../../src/shared/application/transientDependencyError");

test("clasificación transitoria acepta sólo códigos normativos numéricos y textuales", () => {
  for (const code of [4, 8, 14, "4", "8", "14", "deadline-exceeded", "resource-exhausted", "unavailable", "grpc4", "grpc8", "grpc14"]) {
    assert.equal(isTransientDependencyError({ code }), true, String(code));
  }
  for (const value of [new TypeError(), new ReferenceError(), new Error(), { code: 2 }, { code: 13 }, { code: "unknown" }, { code: "internal" }]) {
    assert.equal(isTransientDependencyError(value), false);
  }
});

test("clasificación recorre cause con límite y sin ciclos", () => {
  assert.equal(isTransientDependencyError({ cause: { cause: { code: "grpc/14" } } }), true);
  const first = new Error("first");
  const second = new Error("second");
  first.cause = second;
  second.cause = first;
  assert.deepEqual(boundedErrorChain(first), [first, second]);
  const root = {};
  let current = root;
  for (let index = 0; index < MAX_CAUSE_DEPTH + 2; index += 1) {
    current.cause = {};
    current = current.cause;
  }
  current.code = 14;
  assert.equal(boundedErrorChain(root).length, MAX_CAUSE_DEPTH);
  assert.equal(isTransientDependencyError(root), false);
});
