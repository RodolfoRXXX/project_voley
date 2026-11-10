"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const repoRoot = path.resolve(__dirname, "../../../..");
const frontendRoot = path.join(repoRoot, "volley-ranking-frontend");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("UAT-01 resuelve un único enlace activo por ruta normalizada y específica", async () => {
  const modulePath = path.join(frontendRoot, "src/lib/navigation/activeRoute.mjs");
  const { getActiveNavigationHref } = await import(pathToFileURL(modulePath));
  const hrefs = ["/dashboard", "/dashboard/groups", "/groups", "/tournaments"];

  assert.equal(getActiveNavigationHref("/dashboard", hrefs), "/dashboard");
  assert.equal(getActiveNavigationHref("/dashboard/groups", hrefs), "/dashboard/groups");
  assert.equal(getActiveNavigationHref("/dashboard/groups/group-1", hrefs), "/dashboard/groups");
  assert.equal(
    getActiveNavigationHref("/dashboard/groups?notice=legacy-group-capability-retired", hrefs),
    "/dashboard/groups"
  );
  assert.equal(getActiveNavigationHref("/dashboard/groups/group-1#roster", hrefs), "/dashboard/groups");
  assert.equal(getActiveNavigationHref("/unrelated", hrefs), null);
  assert.equal(getActiveNavigationHref("/groups/public", ["/groups", "/groups/public"]), "/groups/public");
});

test("UAT-01 muestra Mis grupos como enlace principal independiente y sin rol legacy", () => {
  const navbar = read("src/components/layout/Navbar.tsx");
  const sidebar = read("src/components/layout/AppSidebar.tsx");
  const navigation = read("src/lib/navigation/accountNavigation.ts");
  const mainLink = '{ label: "Mis grupos", href: "/dashboard/groups" }';

  assert.match(navigation, new RegExp(mainLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const profileChildren = navigation.slice(navigation.indexOf('label: "Mi perfil"'), navigation.indexOf('label: "Mi gestión"'));
  assert.doesNotMatch(profileChildren, /Mis grupos|\/dashboard\/groups/);
  assert.ok(navigation.indexOf(mainLink) < navigation.indexOf('label: "Mi perfil"'));

  for (const source of [navbar, sidebar]) {
    assert.doesNotMatch(source, /\/profile\/groups/);
    assert.match(source, /getActiveNavigationHref/);
    assert.match(source, /visibleAccountNavigationItems/);
    assert.doesNotMatch(source, /pathname\.startsWith\((item|sub)\.href\)/);
  }
});
