"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const functionsRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(functionsRoot, "../..");
const frontendRoot = path.join(repoRoot, "volley-ranking-frontend");

function read(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("E2-10 retira exclusivamente la salida legacy por /join y conserva administración", () => {
  const api = read(functionsRoot, "src/httpApi.js");
  assert.doesNotMatch(api, /async function handleLeaveGroup|const joinMatch = req\.path\.match|await handleLeaveGroup/);
  for (const retired of [
    "handleJoinGroup",
    "handleJoinRequestAction",
    "approveJoinRequestMatch",
    "rejectJoinRequestMatch",
    "membershipStatus = \"pending\"",
  ]) assert.equal(api.includes(retired), false, retired);

  const addHandler = api.slice(
    api.indexOf("async function handleGroupMemberAdd"),
    api.indexOf("async function handleAdminApplication")
  );
  assert.match(addHandler, /pendingRequestIds/);
  assert.match(addHandler, /memberIds/);
  assert.equal((api.match(/pendingRequestIds/g) || []).length, (addHandler.match(/pendingRequestIds/g) || []).length);
});

test("BFF y superficies legacy retiran salida por arrays y preservan acceso canónico", () => {
  const approve = path.join(frontendRoot, "src/app/api/groups/[groupId]/requests/[userId]/approve/route.ts");
  const reject = path.join(frontendRoot, "src/app/api/groups/[groupId]/requests/[userId]/reject/route.ts");
  assert.equal(fs.existsSync(approve), false);
  assert.equal(fs.existsSync(reject), false);
  assert.equal(fs.existsSync(path.join(frontendRoot, "src/app/api/groups/[groupId]/join/route.ts")), false);

  const publicList = read(frontendRoot, "src/app/(public)/groups/page.tsx");
  const publicDetail = read(frontendRoot, "src/app/(public)/groups/[groupId]/page.tsx");
  const adminDetail = read(frontendRoot, "src/app/(admin)/admin/groups/[groupId]/page.tsx");
  const profile = read(frontendRoot, "src/app/(protected)/profile/groups/page.tsx");
  assert.match(publicList, /href=\{`\/join\/groups\/\$\{encodeURIComponent\(group\.id\)\}`\}/);
  assert.doesNotMatch(publicList, /const leaveGroup|leave-group-|\/api\/groups\/\$\{group\.id\}\/join/);
  assert.doesNotMatch(profile, /const leaveGroup|leave-group-|\/api\/groups\/\$\{group\.id\}\/join/);
  assert.match(publicList, /Gestioná tu Membresía desde Mis grupos/);
  for (const source of [publicList, publicDetail, adminDetail]) {
    assert.doesNotMatch(source, /\/requests\/\$\{userId\}\/(approve|reject)|pendingRequests|pendingRequestIds/);
  }
  assert.match(publicDetail, /pendingAdminRequests/);
  assert.match(adminDetail, /pendingAdminRequests/);
  assert.match(adminDetail, /\/admin-requests\/\$\{userId\}\/\$\{action\}/);
});

test("alertas y backfill ignoran ingreso legacy y conservan remoción, administración y Torneos", () => {
  const service = read(functionsRoot, "src/services/pendingAlertsService.js");
  const trigger = read(functionsRoot, "src/triggers/onGroupPendingAlertsSync.js");
  const backfill = read(functionsRoot, "src/scripts/backfillPendingAlerts.js");
  const dashboard = read(frontendRoot, "src/app/(protected)/dashboard/page.tsx");
  const adminDetail = read(frontendRoot, "src/app/(admin)/admin/groups/[groupId]/page.tsx");
  const alertTypes = read(frontendRoot, "src/types/pendingAlerts.ts");

  assert.match(service, /createGroupRemovalAlert/);
  assert.match(service, /decision: "removed"/);
  assert.doesNotMatch(service, /decision === "accepted"|decision === "rejected"/);
  assert.doesNotMatch(trigger, /pendingRequestIds|group_join_requests_pending|syncJoinRequestsAlerts/);
  assert.match(trigger, /syncAdminRequestsAlerts/);
  assert.match(trigger, /syncAcceptedTournamentAlertsForGroup/);
  assert.match(trigger, /syncPendingRegistrationAlertsForGroup/);
  assert.doesNotMatch(backfill, /pendingRequestIds|group_join_requests_pending/);
  assert.match(backfill, /group_admin_requests_pending/);
  assert.match(backfill, /syncTournamentPendingAlerts/);
  assert.match(alertTypes, /isRetiredLegacyGroupJoinAlert/);
  assert.match(alertTypes, /decision === "accepted"/);
  assert.match(alertTypes, /decision === "rejected"/);
  assert.match(dashboard, /!isRetiredLegacyGroupJoinAlert\(alert\)/);
  assert.match(adminDetail, /!isRetiredLegacyGroupJoinAlert\(alert\)/);
});

test("contratos canónicos, solicitudes administrativas e infraestructura compartida permanecen", () => {
  const index = read(functionsRoot, "index.js");
  for (const name of [
    "getKnownGroupJoinPreview",
    "createMyGroupJoinRequest",
    "getMyCurrentGroupJoinRequest",
    "cancelMyGroupJoinRequest",
    "listPendingGroupJoinRequestsForOwnedGroup",
    "approveGroupJoinRequest",
    "rejectGroupJoinRequest",
    "getGroupJoinRequestDecisionResult",
    "onGroupPendingAlertsSync",
    "api",
  ]) assert.match(index, new RegExp(`exports\\.${name}`), name);

  const packageJson = JSON.parse(read(functionsRoot, "package.json"));
  assert.equal(packageJson.scripts["backfill:pending-alerts"], "node src/scripts/backfillPendingAlerts.js");
  assert.equal(packageJson.scripts["backfill:pending-alerts:write"], "node src/scripts/backfillPendingAlerts.js --write");
  const api = read(functionsRoot, "src/httpApi.js");
  for (const marker of [
    "handleGroupMemberAdd",
    "admin-request",
    "admin-requests",
    "pendingAdminRequestIds",
    "DEFAULT_ALLOWED_CORS_ORIGINS",
  ]) assert.equal(api.includes(marker), true, marker);
  for (const file of ["firestore.rules", "firestore.indexes.json", "firebase.json"]) {
    assert.equal(fs.existsSync(path.join(repoRoot, "volley-ranking-system", file)), true, file);
  }
  assert.equal(fs.existsSync(path.join(frontendRoot, "next.config.ts")), true);
});
