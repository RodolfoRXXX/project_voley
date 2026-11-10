"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("IUX-06A comparte Explorar entre navegación móvil y sidebar con ruta activa específica", async () => {
  const definition = read("volley-ranking-frontend/src/lib/navigation/accountNavigation.ts");
  const navbar = read("volley-ranking-frontend/src/components/layout/Navbar.tsx");
  const sidebar = read("volley-ranking-frontend/src/components/layout/AppSidebar.tsx");
  assert.match(definition, /label: "Explorar grupos", href: "\/dashboard\/groups\/explore"/);
  for (const source of [navbar, sidebar]) {
    assert.match(source, /visibleAccountNavigationItems/);
    assert.match(source, /getActiveNavigationHref/);
  }
  const { getActiveNavigationHref } = await import("../../../../volley-ranking-frontend/src/lib/navigation/activeRoute.mjs");
  assert.equal(getActiveNavigationHref("/dashboard/groups/explore", ["/dashboard/groups", "/dashboard/groups/explore"]), "/dashboard/groups/explore");
});

test("IUX-06A presenta estado pendiente autónomo y enlaza al detalle canónico sin consulta por tarjeta", () => {
  const page = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/explore/page.tsx");
  const service = read("volley-ranking-frontend/src/services/groupsService.ts");
  assert.match(page, /group\.ownRequestStatus === "pending"/);
  assert.match(page, /Tu solicitud de ingreso está pendiente/);
  assert.match(page, />Ver solicitud</);
  assert.match(page, /\/join\/groups\/\$\{group\.id\}\?source=explore/);
  assert.match(service, /ownRequestStatus: "pending" \| "none" \| "unavailable"/);
  assert.doesNotMatch(page, /getMyCurrentGroupJoinRequest|groupJoinRequestsService/);
});

test("IUX-06A unifica pestañas de Grupo y acopla visualmente Economía sin adelantar IUX-06D", () => {
  const groupNavigation = read("volley-ranking-frontend/src/components/groups/GroupContextNavigation.tsx");
  const economy = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/economy/page.tsx");
  assert.match(groupNavigation, /flex-wrap/);
  assert.match(groupNavigation, /aria-current/);
  assert.doesNotMatch(groupNavigation, /overflow-x-auto|<select/);
  for (const marker of ["overflow-hidden", "gridTemplateColumns", "role=\"tablist\"", "role=\"tabpanel\"", "aria-selected", "focus-visible:outline-orange-500", "bg-[var(--background)]"]) assert.match(economy, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(economy, /overflow-x-auto/);
  assert.match(economy, /type Tab = "debts" \| "notices" \| "history"/);
  assert.doesNotMatch(economy, /id: "concepts"/);
});
