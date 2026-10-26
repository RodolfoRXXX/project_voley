"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertBatchPlan, partitionTestPaths, runSequentialBatches } = require("../helpers/runnerTools");

test("emulator runner partitions every canonical case exactly once in seven batches", () => {
  const paths = Array.from({ length: 40 }, (_, index) => `case-${index}`);
  const batches = partitionTestPaths(paths, 6);
  assert.equal(batches.length, 7);
  assert.doesNotThrow(() => assertBatchPlan(paths, batches, 40, 7));
  assert.deepEqual(batches.flat(), paths);
  assert.equal(new Set(batches.flat()).size, paths.length);
});

test("emulator runner stops at the first failed batch and propagates its result", () => {
  const executed = [];
  const result = runSequentialBatches(["one", "two", "three"], (command) => {
    executed.push(command);
    return { status: command === "two" ? 17 : 0, command };
  }, (current) => current.status !== 0);
  assert.deepEqual(executed, ["one", "two"]);
  assert.deepEqual(result, { status: 17, command: "two" });
});

test("emulator runner rejects duplicate cases before executing a gate", () => {
  assert.throws(() => partitionTestPaths(["same", "same"], 6), /duplicate/);
});
