"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const functionsRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(functionsRoot, "../..");
const frontendRoot = path.join(repoRoot, "volley-ranking-frontend");
function read(root, relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }

const retiredBffs = [
  "src/app/api/groups/[groupId]/members/[userId]/add/route.ts",
  "src/app/api/groups/[groupId]/members/[userId]/remove/route.ts",
  "src/app/api/groups/[groupId]/members/search/route.ts",
  "src/app/api/groups/[groupId]/admin-request/route.ts",
  "src/app/api/groups/[groupId]/admin-requests/[userId]/approve/route.ts",
  "src/app/api/groups/[groupId]/admin-requests/[userId]/reject/route.ts",
  "src/app/api/groups/[groupId]/admins/[userId]/add/route.ts",
  "src/app/api/groups/[groupId]/admins/[userId]/remove/route.ts",
];

test("E2-13 elimina BFF y páginas organizativas no consultan datos legacy", () => {
  for (const relativePath of retiredBffs) assert.equal(fs.existsSync(path.join(frontendRoot, relativePath)), false, relativePath);
  for (const relativePath of [
    "src/app/(admin)/admin/groups/[groupId]/page.tsx",
    "src/app/(admin)/admin/groups/[groupId]/members/[memberId]/page.tsx",
    "src/app/(protected)/profile/groups/page.tsx",
    "src/app/(protected)/profile/groups/[groupId]/page.tsx",
  ]) {
    const source = read(frontendRoot, relativePath);
    assert.match(source, /redirect\("\/dashboard\/groups\?notice=legacy-group-capability-retired"\)/, relativePath);
    assert.doesNotMatch(source, /firebase|useAuth|memberIds|adminIds|groupId|memberId/, relativePath);
  }
});

test("E2-13 conserva seis exports como tombstones sin datos ni autenticación", () => {
  const index = read(functionsRoot, "index.js");
  for (const name of ["addGroupAdmin", "removeGroupAdmin", "reorderGroupAdmins", "transferGroupOwnership", "editGroup", "toggleGroupActivo"]) {
    assert.match(index, new RegExp(`exports\\.${name}`), name);
    const source = read(functionsRoot, `callables/${name}.js`);
    assert.match(source, /LEGACY_GROUP_CAPABILITY_RETIRED/, name);
    assert.match(source, /failed-precondition/, name);
    assert.doesNotMatch(source, /firebase-admin|\.\.\/src\/firebase|adminAccessService|adminGroupService|groupAdminsService|context\.auth|data\?\.|data\./, name);
  }
});

test("E2-13 HTTP aplica precedencia y no contiene writers de autoridad legacy", () => {
  const api = read(functionsRoot, "src/httpApi.js");
  const dispatcher = api.slice(api.indexOf("module.exports = functions.runWith"));
  const cors = dispatcher.indexOf("applyCors(req, res)");
  const options = dispatcher.indexOf('req.method === "OPTIONS"');
  const retired = dispatcher.indexOf("matchRetiredLegacyGroupCapability");
  const publicList = dispatcher.indexOf('req.method === "GET" && req.path === "/groups/public"');
  const pushAuth = dispatcher.indexOf("getPushSubscriberUid(req)");
  assert.ok(cors >= 0 && cors < options && options < retired && retired < publicList && publicList < pushAuth);
  assert.match(api, /LEGACY_GROUP_CAPABILITY_RETIRED/);
  assert.doesNotMatch(api, /handleGroupMember|handleAdminApplication|handleAdminRequestAction|handleAdminRemoval|handleAdminAdd/);
  assert.doesNotMatch(api, /collection\("users"\)|isSystemAdmin|pendingAdminRequestIds|pendingRequestIds/);
  assert.doesNotMatch(api, /collection\("groups"\)\.doc\([^\n]+\)\.update|runTransaction/);
});

test("E2-13 cierra DTO público, navegación y alertas exactas", () => {
  const publicList = read(frontendRoot, "src/app/(public)/groups/page.tsx");
  const publicDetail = read(frontendRoot, "src/app/(public)/groups/[groupId]/page.tsx");
  const navbar = read(frontendRoot, "src/components/layout/Navbar.tsx");
  const sidebar = read(frontendRoot, "src/components/layout/AppSidebar.tsx");
  const dashboardGroups = read(frontendRoot, "src/app/(protected)/dashboard/groups/page.tsx");
  const alertTypes = read(frontendRoot, "src/types/pendingAlerts.ts");
  for (const source of [publicList, publicDetail]) assert.doesNotMatch(source, /memberIds|adminIds|membersCount|membershipStatus|pendingAdmin|\/join\/groups/);
  for (const source of [navbar, sidebar]) {
    assert.doesNotMatch(source, /href:\s*"\/(profile|admin)\/groups"/);
    assert.match(source, /href:\s*"\/dashboard\/groups"/);
  }
  assert.match(dashboardGroups, /role="status"/);
  assert.match(dashboardGroups, /legacy-group-capability-retired/);
  assert.match(alertTypes, /isRetiredLegacyGroupAuthorityAlert/);
  assert.match(alertTypes, /group_admin_requests_pending/);
  assert.match(alertTypes, /pendingAlertRetirement\.mjs/);
});

test("E2-13 retira productores organizativos y scripts huérfanos", () => {
  assert.doesNotMatch(read(functionsRoot, "src/triggers/onGroupPendingAlertsSync.js"), /syncAdminRequestsAlerts|pendingAdminRequestIds|group_admin_requests_pending/);
  assert.doesNotMatch(read(functionsRoot, "src/scripts/backfillPendingAlerts.js"), /backfillGroupAlerts|group_admin_requests_pending/);
  assert.doesNotMatch(read(functionsRoot, "src/events/notificationHandler.js"), /GROUP_USER_ADDED|GROUP_USER_REMOVED|GROUP_ADMIN_ADDED/);
  assert.doesNotMatch(read(functionsRoot, "src/events/domainEvents.js"), /GROUP_USER_ADDED|GROUP_USER_REMOVED|GROUP_ADMIN_ADDED/);
  assert.doesNotMatch(read(functionsRoot, "src/services/pendingAlertsService.js"), /createGroupRemovalAlert|group_membership_result/);
  const packageJson = JSON.parse(read(functionsRoot, "package.json"));
  assert.equal(packageJson.scripts["migrate:group-admins"], undefined);
  assert.equal(packageJson.scripts["migrate:group-admins:write"], undefined);
});

test("E2-13 mantiene allowlist exacta de lectores frontend E4", () => {
  const hits = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const source = fs.readFileSync(absolute, "utf8");
        if (/collection\([^\n]+["']groups["']|doc\([^\n]+["']groups["']/.test(source)) hits.push(path.relative(frontendRoot, absolute).replaceAll("\\", "/"));
      }
    }
  };
  walk(path.join(frontendRoot, "src"));
  assert.deepEqual(hits.sort(), [
    "src/app/(protected)/profile/groups/[groupId]/matches/[matchId]/page.tsx",
    "src/services/tournaments/tournamentQueries.ts",
  ]);
});

test("E2-13 filtra sólo combinaciones exactas de alertas legacy", async () => {
  const modulePath = path.join(frontendRoot, "src/types/pendingAlertRetirement.mjs");
  const { isRetiredLegacyGroupAuthorityAlertValue: retired } = await import(pathToFileURL(modulePath));
  assert.equal(retired({ kind: "group_join_requests_pending" }), true);
  assert.equal(retired({ kind: "group_admin_requests_pending" }), true);
  for (const decision of ["accepted", "rejected", "removed"]) assert.equal(retired({ kind: "group_membership_result", meta: { decision } }), true);
  for (const alert of [
    {},
    { kind: "unknown" },
    { kind: "future_group_alert" },
    { kind: "group_membership_result" },
    { kind: "group_membership_result", meta: { decision: "future" } },
    { kind: "group_accepted_in_tournament" },
    { kind: "tournament_fixture_pending" },
  ]) assert.equal(retired(alert), false, JSON.stringify(alert));
});
