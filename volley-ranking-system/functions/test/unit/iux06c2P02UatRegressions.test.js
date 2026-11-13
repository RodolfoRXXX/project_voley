"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
const roster = fs.readFileSync(path.join(root, "volley-ranking-frontend/src/components/memberships/ActiveGroupMembersSection.tsx"), "utf8");
const requests = fs.readFileSync(path.join(root, "volley-ranking-frontend/src/components/groupJoinRequests/PendingGroupJoinRequestsSection.tsx"), "utf8");
const requestService = fs.readFileSync(path.join(root, "volley-ranking-frontend/src/services/groupJoinRequestsService.ts"), "utf8");

test("IUX-06C2 P02 conserva foco y descarta respuestas tardías mientras cambia el término", () => {
  assert.match(roster, /id="member-search"/);
  assert.match(roster, /Array\.from\(normalizedSearch\[0\]\)\.length >= 3/);
  assert.equal((roster.match(/search && currentSearch\.current !== search/g) || []).length, 2);
  assert.match(roster, /if \(!search\) focusRegion\(\)/);
  assert.match(roster, /if \(!activeSearch\) \{ setSearchItems\(\[\]\); setSearchCursor\(null\); setSearchStatus\("idle"\)/);
  assert.match(roster, /searchStatus === "ready" && searchItems\.length === 0[\s\S]*Sin resultados/);
});

test("IUX-06C2 UAT conserva la solicitud sin Temporada y ofrece la ruta canónica", () => {
  assert.match(requests, /errorReason === "OPEN_SEASON_REQUIRED"/);
  assert.match(requestService, /Abrí una Temporada antes de aprobar\./);
  assert.match(requests, /href=\{`\/dashboard\/groups\/\$\{groupId\}\/seasons`\}/);
  assert.match(requests, />Ir a Temporada<\/Link>/);
  assert.doesNotMatch(requests, /OPEN_SEASON_REQUIRED[\s\S]{0,300}setItems\(\(current\) => current\.filter/);
});
