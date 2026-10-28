"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");

test("IUX-01 greeting uses account, Firebase and anonymous fallback without email", async () => {
  const { dashboardGreeting } = await import("../../../../volley-ranking-frontend/src/services/dashboardPresentation.mjs");
  assert.equal(dashboardGreeting("  Ana  ", "Firebase"), "Hola, Ana");
  assert.equal(dashboardGreeting("   ", "  Beto "), "Hola, Beto");
  assert.equal(dashboardGreeting(null, ""), "Hola");
});

test("IUX-01 pagination deduplicates tasks by stable identity", async () => {
  const { mergeDashboardTasks } = await import("../../../../volley-ranking-frontend/src/services/dashboardPresentation.mjs");
  const first = { taskId: "N20:request-1", summary: "old" };
  const updated = { taskId: "N20:request-1", summary: "new" };
  const second = { taskId: "N31:delivery-1", summary: "second" };
  assert.deepEqual(mergeDashboardTasks([first], [updated, second]), [updated, second]);
});

test("IUX-01 dashboard removes legacy consumers and exposes only adopted navigation", () => {
  const dashboard = fs.readFileSync(path.join(root, "volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx"), "utf8");
  const pending = fs.readFileSync(path.join(root, "volley-ranking-frontend/src/components/dashboard/PendingTasksSection.tsx"), "utf8");
  for (const retired of ["pendingAlerts", "AlertsPanel", "UpcomingActivitiesSection", "PublicTournamentDetailModal",
    "tournamentMatches", "tournamentStandings", "dismissPendingAlert", "onSnapshot", "getDocs("]) {
    assert.doesNotMatch(dashboard, new RegExp(retired.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const href of ["/dashboard/groups/new", "/dashboard/groups", "/profile/person", "/dashboard/obligations"]) assert.match(dashboard, new RegExp(href));
  assert.match(dashboard, /aria-label=\{action\.title\}/);
  assert.match(dashboard, /flex flex-wrap gap-x-2 gap-y-3 sm:grid sm:grid-cols-2/);
  assert.match(dashboard, /min-h-20 w-20 shrink-0 flex-col/);
  assert.match(dashboard, /min-h-8 text-xs font-semibold leading-4/);
  assert.match(pending, /useState\(false\)/);
  assert.match(pending, /aria-expanded/);
  assert.doesNotMatch(pending, /Incluye solicitudes de ingreso y entregas de pago por revisar/);
  assert.match(pending, />No hay pendientes</);
  assert.match(pending, /totalAvailable && total > 0/);
  assert.match(pending, /result\.coverage\.complete \? result\.totalTasks : undefined/);
  assert.doesNotMatch(pending, /setInterval|onSnapshot|visibilitychange|addEventListener\s*\(\s*["']focus/);
  assert.doesNotMatch(pending, /approveGroupJoinRequest|rejectGroupJoinRequest|confirmPaymentDelivery|dismissPendingAlert|resolveTask/);
});
