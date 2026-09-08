"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require(path.resolve(__dirname, "../../../../volley-ranking-frontend/node_modules/typescript"));

test("una reconsulta autoritativa vacía tras cancelación incierta exige preparar una nueva intención", () => {
  const sourcePath = path.resolve(__dirname, "../../../../volley-ranking-frontend/src/components/groupJoinRequests/groupJoinRequestCandidateState.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  Function("module", "exports", output)(module, module.exports);
  const { resolveAuthoritativeCandidateView } = module.exports;
  assert.equal(resolveAuthoritativeCandidateView(null, true), "cancelled");
  assert.equal(resolveAuthoritativeCandidateView(null, false), "eligible");
  assert.equal(resolveAuthoritativeCandidateView("PENDING", true), "pending");
  assert.equal(resolveAuthoritativeCandidateView("APPROVAL_IN_PROGRESS", true), "approval-in-progress");
});
