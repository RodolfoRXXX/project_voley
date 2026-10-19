"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

test("dominio y servicio de Grupo no importan Firebase/Admin SDK", () => {
  for (const file of [
    "volley-ranking-system/functions/src/groups/domain/group.js",
    "volley-ranking-system/functions/src/groups/application/groupService.js",
    "volley-ranking-system/functions/src/groups/application/groupDto.js",
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /firebase-admin|firebase\/functions|\.\.\/\.\.\/firebase/);
  }
});

test("flujo E2-01 no usa roles, Persona, Membresía, Temporada ni Comercial", () => {
  const directory = path.join(root, "volley-ranking-system/functions/src/groups");
  const files = fs.readdirSync(path.join(directory, "application"))
    .filter((name) => name.startsWith("group"))
    .map((name) => path.join(directory, "application", name));
  const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /users\.roles|personaId|memberIds|adminIds|temporada|subscription|plan/i);
});

test("rutas owner-scoped usan contratos y no importan Firestore", () => {
  const base = "volley-ranking-frontend/src/app/(protected)/dashboard/groups";
  for (const file of ["page.tsx", "new/page.tsx", "[groupId]/page.tsx"]) {
    const source = read(`${base}/${file}`);
    assert.doesNotMatch(source, /firebase\/firestore|collection\(|addDoc\(|getDocs\(/);
  }
  assert.match(read(`${base}/page.tsx`), /groupsService|GroupPageShell/);
  assert.match(read(`${base}/new/page.tsx`), /groupsService|GroupPageShell/);
  const detail = read(`${base}/[groupId]/page.tsx`);
  const frame = read("volley-ranking-frontend/src/components/groups/GroupFrame.tsx");
  assert.match(detail, /useGroupFrame/);
  assert.match(detail, /!owner \|\| !group/);
  assert.match(frame, /getOwnGroup/);
  assert.match(frame, /GroupPageShell/);
});

test("alta directa legada fue retirada y las superficies legadas excluyen schemas canónicos presentes y futuros", () => {
  assert.doesNotMatch(read("volley-ranking-frontend/src/app/(admin)/admin/groups/new/page.tsx"), /addDoc|firebase\/firestore|roles/);
  const { isCanonicalGroup } = require("../../src/services/groupAdminsService");
  assert.equal(isCanonicalGroup({}), false);
  assert.equal(isCanonicalGroup({ schemaVersion: 1 }), true);
  assert.equal(isCanonicalGroup({ schemaVersion: 2 }), true);
  assert.equal(isCanonicalGroup({ schemaVersion: 3 }), true);
  assert.match(read("volley-ranking-system/functions/src/httpApi.js"), /schemaVersion == null/);
  assert.match(read("volley-ranking-system/functions/src/triggers/onGroupPendingAlertsSync.js"), /schemaVersion != null/);
  assert.match(read("volley-ranking-system/firestore.rules"), /schemaVersion", null\) == null/);
});

test("frontend cubre vacío, loading, doble submit, errores, Owner y estado deportivo vacío", () => {
  const list = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx");
  const form = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/new/page.tsx");
  const detail = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx");
  const frame = read("volley-ranking-frontend/src/components/groups/GroupFrame.tsx");
  const navigation = read("volley-ranking-frontend/src/components/groups/GroupContextNavigation.tsx");
  assert.match(list, /Todavía no tenés un Grupo propio/);
  assert.match(list, /GroupLoading/);
  assert.match(form, /sendingRef\.current|randomUUID|aria-live|role="alert"/);
  for (const reason of ["VALIDATION_FAILED", "PROVISIONAL_LIMIT_REACHED", "CONFLICT", "DEPENDENCY_UNAVAILABLE", "NOT_AUTHORIZED"]) {
    assert.match(read("volley-ranking-frontend/src/services/groupsService.ts"), new RegExp(reason));
  }
  assert.match(frame, /GroupLoading/);
  assert.match(frame, /frame\.status === "error"/);
  assert.match(frame, /GroupActionsMenu/);
  assert.match(detail, /!owner \|\| !group/);
  assert.match(detail, /GroupSeasonSummaryCard/);
  assert.match(detail, /ActiveGroupMembersSection/);
  assert.match(navigation, /label: "Integrantes"/);
  assert.match(navigation, /label: "Temporadas"/);
  assert.match(navigation, /owner \?/);
  assert.match(detail, /sm:|lg:/);
});
