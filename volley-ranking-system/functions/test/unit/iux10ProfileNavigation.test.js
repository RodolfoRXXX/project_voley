"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("IUX-10 declara una sola entrada de Historial y conserva el orden aprobado", () => {
  const navigation = read("volley-ranking-frontend/src/lib/navigation/accountNavigation.ts");
  const profile = navigation.slice(navigation.indexOf('label: "Mi perfil"'));
  const labels = ["Resumen", "Ficha personal", "Historial de grupos", "Mis obligaciones"];
  assert.equal((profile.match(/label: "Historial de grupos"/g) || []).length, 1);
  assert.equal((profile.match(/href: "\/profile\/memberships\/history"/g) || []).length, 1);
  for (let index = 1; index < labels.length; index += 1) {
    assert.ok(profile.indexOf(`label: "${labels[index - 1]}"`) < profile.indexOf(`label: "${labels[index]}"`));
  }
});

test("sidebar y drawer renderizan la fuente compartida y comparan un único href activo", async () => {
  const sidebar = read("volley-ranking-frontend/src/components/layout/AppSidebar.tsx");
  const drawer = read("volley-ranking-frontend/src/components/layout/Navbar.tsx");
  for (const source of [sidebar, drawer]) {
    assert.match(source, /visibleAccountNavigationItems/);
    assert.match(source, /getActiveNavigationHref/);
    assert.match(source, /const isActive = activeHref === sub\.href/);
    assert.doesNotMatch(source, /Historial de grupos|profile\/memberships\/history/);
  }
  const { getActiveNavigationHref } = await import("../../../../volley-ranking-frontend/src/lib/navigation/activeRoute.mjs");
  const hrefs = ["/profile/info", "/profile/person", "/profile/memberships/history", "/dashboard/obligations"];
  assert.equal(getActiveNavigationHref("/profile/memberships/history", hrefs), "/profile/memberships/history");
  assert.equal(getActiveNavigationHref("/profile/memberships/history?source=profile", hrefs), "/profile/memberships/history");
  assert.equal(getActiveNavigationHref("/profile/person", hrefs), "/profile/person");
});
