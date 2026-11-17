"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("IUX-09 organiza Mi perfil en una fuente compartida y preserva rutas", () => {
  const navigation = read("volley-ranking-frontend/src/lib/navigation/accountNavigation.ts");
  const profile = navigation.slice(navigation.indexOf('label: "Mi perfil"'));
  for (const href of ["/profile/info", "/profile/person", "/dashboard/obligations"]) assert.match(profile, new RegExp(href.replaceAll("/", "\\/")));
  assert.equal((navigation.match(/href: "\/dashboard\/obligations"/g) || []).length, 1);
  for (const file of ["AppSidebar.tsx", "Navbar.tsx"]) {
    const source = read(`volley-ranking-frontend/src/components/layout/${file}`);
    assert.match(source, /hasActiveChild/);
    assert.match(source, /visibleAccountNavigationItems/);
  }
});

test("IUX-09 serializa sólo users.createdAt y representa ausencia con null", () => {
  const dto = read("volley-ranking-system/functions/src/users/application/accountDto.js");
  const accountType = read("volley-ranking-frontend/src/types/MyAccount.ts");
  assert.match(dto, /accountCreatedAt: accountCreatedAt\(user\.createdAt\)/);
  assert.match(dto, /toISOString\(\) : null/);
  assert.doesNotMatch(dto, /metadata|creationTime|person/i);
  assert.match(accountType, /accountCreatedAt: string \| null/);
});

test("IUX-09 compone Persona y una sola página parcial de tres obligaciones", () => {
  const summary = read("volley-ranking-frontend/src/components/profile/ProfileSummary.tsx");
  assert.match(summary, /listMyObligations\(\{ status: "OPEN", pageSize: 3 \}\)/);
  assert.doesNotMatch(summary, /nextCursor|while\s*\(/);
  assert.match(summary, /Vista parcial de obligaciones pendientes/);
  assert.match(summary, /Ver todas mis obligaciones/);
  assert.match(summary, /No encontramos obligaciones pendientes en esta vista parcial/);
  assert.match(summary, /Crear mi ficha personal/);
  assert.match(summary, /personAccountId !== accountId/);
});

test("IUX-09 reconsulta Persona y descarta respuestas de otra Cuenta", () => {
  const provider = read("volley-ranking-frontend/src/components/providers/PersonProvider.tsx");
  const page = read("volley-ranking-frontend/src/app/(protected)/profile/person/page.tsx");
  assert.match(provider, /refreshMyPerson/);
  assert.match(provider, /activeAccountId\.current !== accountId/);
  assert.match(provider, /requestGeneration\.current !== generation/);
  assert.match(provider, /setPerson\(null\)/);
  assert.match(page, /Actualizar ficha personal/);
  assert.match(page, /refreshMyPerson\(\)/);
});

test("IUX-09 normaliza encabezados y conserva el retorno contextual", () => {
  const shell = read("volley-ranking-frontend/src/components/groups/GroupPageShell.tsx");
  const summary = read("volley-ranking-frontend/src/components/profile/ProfileSummary.tsx");
  const person = read("volley-ranking-frontend/src/app/(protected)/profile/person/page.tsx");
  const obligations = read("volley-ranking-frontend/src/app/(protected)/dashboard/obligations/page.tsx");
  const profileLayout = read("volley-ranking-frontend/src/app/(protected)/profile/layout.tsx");
  const dashboard = read("volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx");
  assert.match(shell, /max-w-5xl px-4 py-6 sm:px-6 sm:py-10/);
  assert.match(summary, /<GroupPageShell title="Resumen"/);
  assert.match(person, /backHref="\/profile\/info"/);
  assert.match(person, /<GroupPageShell/);
  assert.match(person, /max-w-2xl/);
  assert.match(obligations, /candidate\.startsWith\("\/dashboard\/groups\/"\)/);
  assert.match(obligations, /: "\/profile\/info"/);
  assert.match(profileLayout, /return children/);
  assert.doesNotMatch(profileLayout, /px-6 py-8/);
  assert.match(dashboard, /max-w-5xl px-4 py-6 sm:px-6 sm:py-10/);
});
