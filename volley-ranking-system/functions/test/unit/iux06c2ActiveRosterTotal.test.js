"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("IUX-06C2 P01 separa membresia propia del total Owner y presenta cero acreditado", () => {
  const frame = read("volley-ranking-frontend/src/components/groups/GroupFrame.tsx");
  const card = read("volley-ranking-frontend/src/components/groups/GroupMembersSummaryCard.tsx");
  const service = read("volley-ranking-system/functions/src/memberships/application/membershipService.js");
  const counter = read("volley-ranking-system/functions/src/memberships/infrastructure/firestoreActiveRosterCounter.js");

  assert.match(frame, /getMyCurrentGroupMembershipContext\(groupId\)\.then\(\(context\) => context, \(\) => null\)/);
  assert.doesNotMatch(card, /getMyCurrentGroupMembershipContext|CURRENT_MEMBERSHIP_NOT_ACCESSIBLE/);
  assert.match(card, /getActiveGroupMemberTotalForOwnedGroup\(groupId\)/);
  assert.match(card, /result\.status === "READY" \|\| result\.status === "NO_OPEN_SEASON"/);
  assert.match(card, /total !== null/);
  assert.match(card, /total === 0 \? "integrantes"/);
  assert.match(card, /Total no disponible/);
  assert.match(card, />Reintentar<\/button>/);

  const totalMethod = service.slice(service.indexOf("async getActiveGroupMemberTotalForOwnedGroup"), service.indexOf("async reconcileActiveGroupMemberTotalForOwnedGroup"));
  assert.match(totalMethod, /requireAccount\(userId\)/);
  assert.match(totalMethod, /activeRosterCounter\.readOrBuild/);
  assert.doesNotMatch(totalMethod, /requirePerson|myCurrentGroupMembershipsReader/);
  assert.match(counter, /status: "BUILDING", activeMembershipCount: 0/);
  assert.match(counter, /status: "READY", total: ready\.activeMembershipCount/);
  assert.match(counter, /status: "NO_OPEN_SEASON", total: 0/);
});
