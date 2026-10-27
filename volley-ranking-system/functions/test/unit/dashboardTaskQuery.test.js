"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createDashboardTaskCursorCodec, ORDER } = require("../../src/dashboardTasks/application/dashboardTaskCursor");
const { validateDashboardTaskQuery } = require("../../src/dashboardTasks/application/dashboardTaskQueryContract");
const { DashboardTaskExpiredCursorError, DashboardTaskInvalidCursorError } = require("../../src/dashboardTasks/application/dashboardTaskQueryErrors");
const { createDashboardTaskQueryCallable, toHttps } = require("../../src/dashboardTasks/infrastructure/dashboardTaskQueryCallable");

test("IUX-02B contract is closed and cursor is signed and context-bound", () => {
  assert.deepEqual(validateDashboardTaskQuery({ coverage: "N20_N31_V1" }), { coverage: "N20_N31_V1" });
  assert.throws(() => validateDashboardTaskQuery({ coverage: "N20_N31_V1", accountId: "forged" }), /VALIDATION_FAILED/);
  assert.throws(() => validateDashboardTaskQuery({ coverage: "N20" }), /VALIDATION_FAILED/);
  const codec = createDashboardTaskCursorCodec({ secret: "unit-dashboard-task-cursor-secret-32-characters" });
  const anchor = { seconds: 10, nanoseconds: 20, kind: "N20", resourceId: "request" };
  const cursor = codec.encode({ accountId: "account-a", coverage: "N20_N31_V1", generationId: "generation-a", anchor });
  assert.deepEqual(codec.decode(cursor, { accountId: "account-a", coverage: "N20_N31_V1", generationId: "generation-a" }), anchor);
  assert.equal(ORDER, "actionableAt_DESC,kind_ASC,resourceId_ASC");
  assert.throws(() => codec.decode(`${cursor.slice(0, -1)}x`, { accountId: "account-a", coverage: "N20_N31_V1", generationId: "generation-a" }), DashboardTaskInvalidCursorError);
  assert.throws(() => codec.decode(cursor, { accountId: "account-b", coverage: "N20_N31_V1", generationId: "generation-a" }), DashboardTaskInvalidCursorError);
  assert.throws(() => codec.decode(cursor, { accountId: "account-a", coverage: "N20_N31_V1", generationId: "generation-b" }), DashboardTaskExpiredCursorError);
});

test("IUX-02B frontend request gate discards superseded and cross-session responses without scheduling", async () => {
  const { createDashboardTaskRequestGate, StaleDashboardTaskResponseError } = await import("../../../../volley-ranking-frontend/src/services/dashboardTaskRequestGate.mjs");
  let session = "account-a"; let release;
  const gate = createDashboardTaskRequestGate(() => session);
  const pending = gate.run(() => new Promise((resolve) => { release = resolve; }));
  session = "account-b"; release({ items: ["stale"] });
  await assert.rejects(pending, StaleDashboardTaskResponseError);
  const first = gate.run(async () => "first"); const second = gate.run(async () => "second");
  await assert.rejects(first, StaleDashboardTaskResponseError); assert.equal(await second, "second");
  gate.invalidate();
  assert.equal(Object.keys(gate).sort().join(","), "invalidate,run");
});

test("IUX-02B callable derives the account from auth and rejects client account selection", async () => {
  const calls = [];
  const callable = createDashboardTaskQueryCallable({
    query: { async list(accountId, input) { calls.push({ accountId, input }); return { coverage: { health: "READY" }, items: [] }; } },
    validate: validateDashboardTaskQuery,
    logger: { info() {}, warn() {} },
  });
  await assert.rejects(callable({ coverage: "N20_N31_V1" }, {}), (error) => error.code === "unauthenticated");
  await assert.rejects(callable({ coverage: "N20_N31_V1", accountId: "forged" }, { auth: { uid: "account-a" } }),
    (error) => error.code === "invalid-argument");
  await callable({ coverage: "N20_N31_V1" }, { auth: { uid: "account-a" } });
  assert.deepEqual(calls, [{ accountId: "account-a", input: { coverage: "N20_N31_V1" } }]);
  const dependency = toHttps(Object.assign(new Error("transport unavailable"), { code: 14 }));
  assert.equal(dependency.code, "unavailable"); assert.equal(dependency.details.reason, "DEPENDENCY_UNAVAILABLE");
});

test("IUX-02B frontend remains on-demand and is not mounted in the dashboard", () => {
  const root = path.resolve(__dirname, "../../../..");
  const service = fs.readFileSync(path.join(root, "volley-ranking-frontend/src/services/dashboardTasksService.ts"), "utf8");
  const gate = fs.readFileSync(path.join(root, "volley-ranking-frontend/src/services/dashboardTaskRequestGate.mjs"), "utf8");
  const dashboard = fs.readFileSync(path.join(root, "volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx"), "utf8");
  for (const source of [service, gate]) {
    assert.doesNotMatch(source, /setInterval|setTimeout|onSnapshot|visibilitychange|addEventListener\s*\(\s*["']focus/);
  }
  assert.doesNotMatch(dashboard, /dashboardTasksService|listMyDashboardTasks/);
});

test("IUX-02B callable configuration has no hardcoded or disabled-mode cursor secret", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../callables/listMyDashboardTasks.js"), "utf8");
  assert.match(source, /DASHBOARD_TASK_CURSOR_SECRET/);
  assert.match(source, /crypto\.randomBytes\(32\)/);
  assert.doesNotMatch(source, /emulator-cursor-secret|disabled-projection-cursor-secret/);
  assert.match(source, /DashboardTaskProjectionDisabledError/);
  assert.match(source, /DashboardTaskDependencyUnavailableError/);
});
